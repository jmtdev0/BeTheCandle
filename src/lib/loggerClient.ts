type LogEvent = { type: string; ts?: string; payload?: any };

const API = '/api/logs';

class LoggerClient {
  runId: string | null = null;
  buffer: LogEvent[] = [];
  timer: any = null;
  initPromise: Promise<string | null> | null = null;

  async startRun() {
    if (this.runId) return this.runId;
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = (async () => {
      try {
        const res = await fetch(API, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'start' }) 
        });
        const json = await res.json();
        if (json?.runId) {
          this.runId = json.runId;
          try { if (this.runId) localStorage.setItem('logRunId', this.runId); } catch {}
          console.log('[Logger] Run started:', this.runId);
          return this.runId;
        }
      } catch (err) {
        console.error('[Logger] Failed to start run:', err);
      }
      // fallback
      this.runId = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
      try { if (this.runId) localStorage.setItem('logRunId', this.runId); } catch {}
      console.log('[Logger] Run started (fallback):', this.runId);
      return this.runId;
    })();
    
    return this.initPromise;
  }

  async append(message: string) {
    const runId = this.runId ?? (typeof window !== 'undefined' && localStorage.getItem('logRunId')) ?? null;
    if (!runId) await this.startRun();
    try {
      await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'append', runId: this.runId, message }) });
    } catch (err) {
      // ignore network errors
    }
  }

  async log(event: LogEvent) {
    // Ensure run is started before logging
    if (!this.runId) await this.startRun();
    
    event.ts = new Date().toISOString();
    this.buffer.push(event);
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), 900);
    }
  }

  async flush() {
    if (!this.buffer.length) {
      clearTimeout(this.timer);
      this.timer = null;
      return;
    }
    const batch = this.buffer.splice(0, this.buffer.length);
    clearTimeout(this.timer);
    this.timer = null;
    try {
      const payload = JSON.stringify(batch);
      await this.append(payload);
    } catch (err) {
      // ignore
    }
  }

  // Initialize and set up cleanup
  async init() {
    await this.startRun();
    
    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.buffer.length > 0) {
          // Use sendBeacon for reliable delivery on page unload
          const payload = JSON.stringify({ type: 'append', runId: this.runId, message: JSON.stringify(this.buffer) });
          navigator.sendBeacon?.(API, payload) || this.flush();
        }
      });
    }
  }
}

const logger = new LoggerClient();

// Auto-initialize when module loads (client-side only)
if (typeof window !== 'undefined') {
  logger.init().catch(() => {
    // Silent fail on init errors
  });
}

export default logger;
