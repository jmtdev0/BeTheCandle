"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useMusicTrack } from "@/contexts/MusicTrackContext";
import { useVideoPan } from "@/hooks/useVideoPan";

// Per-clip descriptor returned by the API
interface VideoClip {
  url: string;
  transition: "fade" | "cut";
  speed: number;
  name?: string;
  link?: string;
}

interface VideoBackgroundManagerProps {
  trackName?: string;
}

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Shuffle ensuring the first element differs from `avoidFirst`
function shuffleAvoidingFirst<T>(array: T[], avoidFirst: T | null): T[] {
  const shuffled = shuffleArray(array);
  if (avoidFirst !== null && shuffled.length > 1 && shuffled[0] === avoidFirst) {
    const swapIdx = 1 + Math.floor(Math.random() * (shuffled.length - 1));
    [shuffled[0], shuffled[swapIdx]] = [shuffled[swapIdx], shuffled[0]];
  }
  return shuffled;
}

// Random duration between 10-15 seconds
function getRandomDuration() {
  const MIN_DURATION = 10000;
  const MAX_DURATION = 15000;
  return Math.random() * (MAX_DURATION - MIN_DURATION) + MIN_DURATION;
}

const DEFAULT_FADE_MS = 2500;

// Helper to log in development and in production when debugVideo=1 is present in URL
// or localStorage contains btc_debug_video=1.
const isDev = process.env.NODE_ENV === 'development' || typeof window !== 'undefined' && window.location.hostname === 'localhost';
function isVideoDebugEnabled() {
  if (isDev) return true;
  if (typeof window === 'undefined') return false;

  try {
    const query = new URLSearchParams(window.location.search).get('debugVideo');
    if (query === '1' || query === 'true') return true;
    const persisted = window.localStorage.getItem('btc_debug_video');
    return persisted === '1' || persisted === 'true';
  } catch {
    return false;
  }
}

const devLog = (...args: unknown[]) => {
  if (isVideoDebugEnabled()) console.log(...args);
};

function getReadyStateLabel(value: number) {
  switch (value) {
    case 0: return 'HAVE_NOTHING';
    case 1: return 'HAVE_METADATA';
    case 2: return 'HAVE_CURRENT_DATA';
    case 3: return 'HAVE_FUTURE_DATA';
    case 4: return 'HAVE_ENOUGH_DATA';
    default: return `UNKNOWN(${value})`;
  }
}

function getNetworkStateLabel(value: number) {
  switch (value) {
    case 0: return 'NETWORK_EMPTY';
    case 1: return 'NETWORK_IDLE';
    case 2: return 'NETWORK_LOADING';
    case 3: return 'NETWORK_NO_SOURCE';
    default: return `UNKNOWN(${value})`;
  }
}

function getMediaErrorInfo(video: HTMLVideoElement) {
  const error = video.error;
  if (!error) return null;
  return {
    code: error.code,
    message:
      error.code === 1 ? 'MEDIA_ERR_ABORTED' :
      error.code === 2 ? 'MEDIA_ERR_NETWORK' :
      error.code === 3 ? 'MEDIA_ERR_DECODE' :
      error.code === 4 ? 'MEDIA_ERR_SRC_NOT_SUPPORTED' :
      'MEDIA_ERR_UNKNOWN',
  };
}

function getVideoSnapshot(video: HTMLVideoElement) {
  const src = video.currentSrc || video.src || '';
  return {
    src: src ? decodeURIComponent(src.split('/').pop() || src) : '(no-src)',
    paused: video.paused,
    ended: video.ended,
    muted: video.muted,
    volume: Number(video.volume.toFixed(3)),
    playbackRate: Number(video.playbackRate.toFixed(3)),
    currentTime: Number(video.currentTime.toFixed(3)),
    duration: Number.isFinite(video.duration) ? Number(video.duration.toFixed(3)) : null,
    readyState: `${video.readyState} (${getReadyStateLabel(video.readyState)})`,
    networkState: `${video.networkState} (${getNetworkStateLabel(video.networkState)})`,
    error: getMediaErrorInfo(video),
  };
}

// Normalize API response
function normalizeVideos(data: Record<string, unknown>): VideoClip[] {
  const videos = data.videos;
  if (!Array.isArray(videos) || videos.length === 0) {
    return [];
  }
  return videos.map((v: unknown) => {
    if (typeof v === 'string') {
      return { url: v, transition: 'fade' as const, speed: 1 };
    }
    const clip = v as Record<string, unknown>;
    return {
      url: clip.url as string,
      transition: (clip.transition as 'fade' | 'cut') ?? 'fade',
      speed: (clip.speed as number) ?? 1,
      ...(clip.name ? { name: clip.name as string } : {}),
      ...(clip.link ? { link: clip.link as string } : {}),
    };
  });
}

export default function VideoBackgroundManager({ trackName }: VideoBackgroundManagerProps) {
  const { videoVolume, setCurrentVideoName, setCurrentVideoLink, forceSkipVideo, videoPlaybackUnlockRequest } = useMusicTrack();

  const [videoList, setVideoList] = useState<VideoClip[]>([]);
  const [playlist, setPlaylist] = useState<VideoClip[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [fullLength, setFullLength] = useState(false);

  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const isTransitioningRef = useRef(false);
  const earlyTransitionFiredRef = useRef(false);
  const interactionLogCountRef = useRef(0);

  // Transition duration as a ref — never triggers re-renders or effect re-runs
  const transitionDurationRef = useRef(DEFAULT_FADE_MS);

  // Mobile portrait detection for video pan
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  useEffect(() => {
    const check = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsMobilePortrait(isTouch && isPortrait);
    };
    check();
    window.addEventListener('resize', check);
    const mq = window.matchMedia('(orientation: portrait)');
    mq.addEventListener?.('change', check);
    return () => {
      window.removeEventListener('resize', check);
      mq.removeEventListener?.('change', check);
    };
  }, []);

  useVideoPan({
    videoRefs: [videoARef, videoBRef],
    enabled: isMobilePortrait,
  });

  // Keep a ref mirror of playlist so callbacks always see the latest value
  const playlistRef = useRef<VideoClip[]>([]);
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);

  const videoListRef = useRef<VideoClip[]>([]);
  useEffect(() => { videoListRef.current = videoList; }, [videoList]);

  // Persist debugVideo query flag to localStorage so production logs survive reloads.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const query = new URLSearchParams(window.location.search).get('debugVideo');
      if (query === '1' || query === 'true') {
        window.localStorage.setItem('btc_debug_video', '1');
      } else if (query === '0' || query === 'false') {
        window.localStorage.removeItem('btc_debug_video');
      }
    } catch {
      // ignore localStorage read/write errors
    }
  }, []);

  // Session bootstrap diagnostics (only in debug mode)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isVideoDebugEnabled()) return;

    const nav = navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        downlink?: number;
        saveData?: boolean;
      };
      deviceMemory?: number;
    };

    devLog('[VideoBackgroundManager][Debug] Session start', {
      href: window.location.href,
      ua: navigator.userAgent,
      visibilityState: document.visibilityState,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: nav.deviceMemory ?? null,
      connection: nav.connection
        ? {
            effectiveType: nav.connection.effectiveType ?? null,
            downlink: nav.connection.downlink ?? null,
            saveData: nav.connection.saveData ?? null,
          }
        : null,
      trackName,
    });
  }, [trackName]);

  // Log first user interactions so we can confirm a gesture happened before playback attempts.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isVideoDebugEnabled()) return;

    const logInteraction = (event: Event) => {
      if (interactionLogCountRef.current >= 8) return;
      interactionLogCountRef.current += 1;
      devLog('[VideoBackgroundManager][Debug] User interaction', {
        type: event.type,
        isTrusted: event.isTrusted,
        visibilityState: document.visibilityState,
      });
    };

    const options: AddEventListenerOptions = { capture: true };
    window.addEventListener('pointerdown', logInteraction, options);
    window.addEventListener('click', logInteraction, options);
    window.addEventListener('keydown', logInteraction, options);

    return () => {
      window.removeEventListener('pointerdown', logInteraction, options);
      window.removeEventListener('click', logInteraction, options);
      window.removeEventListener('keydown', logInteraction, options);
    };
  }, []);

  // Apply transition duration directly to both video elements (no state, no re-render)
  const setTransitionDuration = useCallback((ms: number) => {
    transitionDurationRef.current = ms;
    [videoARef, videoBRef].forEach(ref => {
      if (ref.current) {
        ref.current.style.transitionDuration = `${ms}ms`;
      }
    });
  }, []);

  // Fetch video list on mount
  useEffect(() => {
    let ignore = false;

    async function fetchVideos() {
      try {
        const apiUrl = trackName
          ? `/api/videos?track=${encodeURIComponent(trackName)}`
          : '/api/videos';

        devLog('[VideoBackgroundManager] Fetching videos', { apiUrl, trackName });

        const response = await fetch(apiUrl);
        if (ignore) return;

        devLog('[VideoBackgroundManager] Video API response', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          url: response.url,
        });

        const data = await response.json();
        if (ignore) return;

        const videos = normalizeVideos(data);
        devLog('[VideoBackgroundManager] Video API payload summary', {
          fullLength: Boolean(data.fullLength),
          totalVideos: videos.length,
          firstVideo: videos[0]?.url ? decodeURIComponent(videos[0].url.split('/').pop() || videos[0].url) : null,
        });
        if (videos.length > 0) {
          setVideoList(videos);
          const shuffled = shuffleArray(videos);
          setPlaylist(shuffled);
          setCurrentIndex(0);
          setFullLength(data.fullLength ?? false);
          setIsActive(true);
        } else {
          devLog('[VideoBackgroundManager] No videos returned from API', { apiUrl, trackName });
        }
      } catch (error) {
        if (!ignore) {
          devLog('[VideoBackgroundManager] Error loading videos:', error);
        }
      }
    }
    fetchVideos();

    return () => {
      ignore = true;
    };
  }, [trackName]);

  // Apply video volume from context to both video elements
  // Only Telepath videos have audible volume; others are always muted
  const isTelepath = trackName?.toLowerCase().includes('telepath') ?? false;

  useEffect(() => {
    [videoARef, videoBRef].forEach(ref => {
      if (ref.current) {
        if (isTelepath) {
          ref.current.muted = videoVolume === 0;
          ref.current.volume = videoVolume;
        } else {
          ref.current.muted = true;
          ref.current.volume = 0;
        }
      }
    });

    devLog('[VideoBackgroundManager] Volume policy applied', {
      isTelepath,
      contextVideoVolume: videoVolume,
      videoA: videoARef.current ? getVideoSnapshot(videoARef.current) : null,
      videoB: videoBRef.current ? getVideoSnapshot(videoBRef.current) : null,
    });
  }, [videoVolume, isTelepath]);

  // Bandwidth Tracker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const interval = setInterval(() => {
      const entries = performance.getEntriesByType("resource");
      let totalBytes = 0;
      let count = 0;

      for (const entry of entries) {
        if (entry.name.match(/\.(mp4|mov)$/i)) {
          const rEntry = entry as PerformanceResourceTiming;
          if (rEntry.transferSize) {
            totalBytes += rEntry.transferSize;
            count++;
          }
        }
      }

      const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
      if (count > 0) {
        devLog(`[Bandwidth Tracker] Session usage: ${totalMB} MB (${count} requests)`);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Debug video events
  useEffect(() => {
    if (!isActive) return;

    const events = ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'playing', 'pause', 'ended', 'error', 'waiting', 'stalled', 'suspend', 'emptied', 'abort', 'seeking', 'seeked'];

    const logEvent = (id: string, e: Event) => {
      const target = e.target as HTMLVideoElement;
      devLog(`[VideoBackgroundManager] ${id} event: ${e.type}`, {
        ...getVideoSnapshot(target),
        bufferedRanges: target.buffered.length,
      });
    };

    const attach = (ref: React.RefObject<HTMLVideoElement | null>, id: string) => {
      const el = ref.current;
      if (!el) return () => {};

      const handlers = events.map(evt => {
        const handler = (e: Event) => logEvent(id, e);
        el.addEventListener(evt, handler);
        return { evt, handler };
      });

      return () => {
        handlers.forEach(({ evt, handler }) => el.removeEventListener(evt, handler));
      };
    };

    const cleanupA = attach(videoARef, 'VideoA');
    const cleanupB = attach(videoBRef, 'VideoB');

    return () => {
      cleanupA();
      cleanupB();
    };
  }, [isActive]);

  // Attempt to play a video with layered fallback detection for browsers (e.g. Brave) that
  // can block autoplay without rejecting the play() promise or without firing canplay again.
  const attemptPlay = useCallback((video: HTMLVideoElement) => {
    let playingFired = false;
    let playPromiseResolved = false;
    let timeAdvanced = false;
    const startTime = video.currentTime;
    const srcName = video.src.split('/').pop() || '(no-src)';

    devLog('[VideoBackgroundManager] attemptPlay() called', {
      src: decodeURIComponent(srcName),
      hidden: typeof document !== 'undefined' ? document.hidden : null,
      snapshot: getVideoSnapshot(video),
    });

    const onPlaying = () => { playingFired = true; };
    video.addEventListener('playing', onPlaying, { once: true });

    const onTimeUpdate = () => {
      if (video.currentTime > startTime + 0.01) {
        timeAdvanced = true;
      }
    };
    video.addEventListener('timeupdate', onTimeUpdate, { once: true });

    // Once the browser has buffered enough data, check whether playback actually started.
    // A 200 ms grace period accounts for the short delay between canplay and the first frame.
    const onCanPlay = () => {
      setTimeout(() => {
        if (!playingFired && video.paused && mountedRef.current) {
          devLog('[VideoBackgroundManager] Autoplay silently blocked (canplay fired but video still paused):', {
            src: decodeURIComponent(srcName),
            snapshot: getVideoSnapshot(video),
            playPromiseResolved,
          });
        }
      }, 200);
    };
    video.addEventListener('canplay', onCanPlay, { once: true });

    try {
      const maybePromise = video.play();
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise
          .then(() => {
            playPromiseResolved = true;
            devLog('[VideoBackgroundManager] play() resolved:', {
              src: decodeURIComponent(srcName),
              snapshot: getVideoSnapshot(video),
            });
          })
          .catch((err) => {
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('timeupdate', onTimeUpdate);
            devLog('[VideoBackgroundManager] play() rejected:', {
              src: decodeURIComponent(srcName),
              err,
              snapshot: getVideoSnapshot(video),
            });
          });
      } else {
        devLog('[VideoBackgroundManager] play() returned non-promise value', {
          src: decodeURIComponent(srcName),
          snapshot: getVideoSnapshot(video),
        });
      }
    } catch (err) {
      devLog('[VideoBackgroundManager] play() threw synchronously:', {
        src: decodeURIComponent(srcName),
        err,
        snapshot: getVideoSnapshot(video),
      });
    }

    // Final fallback: if play() resolved but there is no real playback progression, assume block.
    setTimeout(() => {
      if (!mountedRef.current) return;
      if (playingFired || timeAdvanced) return;
      if (video.paused || video.currentTime <= startTime + 0.01) {
        devLog('[VideoBackgroundManager] Autoplay likely blocked (no playback progression):', {
          src: decodeURIComponent(srcName),
          snapshot: getVideoSnapshot(video),
          startTime,
          playPromiseResolved,
        });
      }
    }, 1200);
  }, []);

  // Resource-level diagnostics for video files (available in production when debugVideo=1).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isVideoDebugEnabled()) return;
    if (typeof PerformanceObserver === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.name.match(/\.(mp4|mov)(\?|$)/i)) continue;
        const resource = entry as PerformanceResourceTiming;
        devLog('[VideoBackgroundManager][Debug] Video resource timing', {
          file: decodeURIComponent(entry.name.split('/').pop() || entry.name),
          initiatorType: resource.initiatorType ?? null,
          durationMs: Number(entry.duration.toFixed(1)),
          transferSize: resource.transferSize ?? null,
          encodedBodySize: resource.encodedBodySize ?? null,
          decodedBodySize: resource.decodedBodySize ?? null,
          nextHopProtocol: resource.nextHopProtocol ?? null,
        });
      }
    });

    try {
      observer.observe({ type: 'resource', buffered: true });
    } catch {
      observer.observe({ entryTypes: ['resource'] });
    }

    return () => observer.disconnect();
  }, []);

  // Continuous snapshot while active in debug mode.
  useEffect(() => {
    if (!isActive || playlist.length === 0) return;
    if (!isVideoDebugEnabled()) return;

    const interval = setInterval(() => {
      const activeRef = currentIndex % 2 === 0 ? videoARef : videoBRef;
      const preloadRef = currentIndex % 2 === 0 ? videoBRef : videoARef;
      devLog('[VideoBackgroundManager][Debug] Playback heartbeat', {
        currentIndex,
        active: activeRef.current ? getVideoSnapshot(activeRef.current) : null,
        preload: preloadRef.current ? getVideoSnapshot(preloadRef.current) : null,
        documentHidden: typeof document !== 'undefined' ? document.hidden : null,
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isActive, playlist.length, currentIndex]);

  // Transition to next video
  const transitionToNext = useCallback(() => {
    if (isTransitioningRef.current) {
      devLog('[VideoBackgroundManager] transitionToNext called but already transitioning');
      return;
    }

    devLog('[VideoBackgroundManager] Executing transitionToNext');
    isTransitioningRef.current = true;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Determine the next clip's transition BEFORE flipping the index,
    // so the CSS transition-duration is already applied when opacity changes.
    setCurrentIndex(prevIndex => {
      const pl = playlistRef.current;
      const nextIndex = (prevIndex + 1) % pl.length;
      const nextClip = pl[nextIndex];

      devLog(`[VideoBackgroundManager] Updating index: ${prevIndex} -> ${nextIndex}`);

      // Apply the incoming clip's transition duration to both elements
      const duration = nextClip?.transition === 'cut' ? 0 : DEFAULT_FADE_MS;
      setTransitionDuration(duration);

      // Start the incoming video right away
      const incomingRef = nextIndex % 2 === 0 ? videoARef : videoBRef;
      if (incomingRef.current && incomingRef.current.paused && incomingRef.current.readyState >= 2) {
        attemptPlay(incomingRef.current);
      }

      // Reshuffle when wrapping around, avoiding repeat of last clip
      if (nextIndex === 0 && videoListRef.current.length > 0) {
        devLog('[VideoBackgroundManager] Reshuffling playlist');
        const lastClip = pl[pl.length - 1] ?? null;
        const newPlaylist = shuffleAvoidingFirst(videoListRef.current, lastClip);
        setPlaylist(newPlaylist);
      }

      return nextIndex;
    });

    // Release the transition lock after the fade completes (not before)
    const guardDuration = transitionDurationRef.current + 100;
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, guardDuration);
  }, [setTransitionDuration, attemptPlay]);

  // Handle video ended event (fallback — early transition via timeupdate is preferred)
  const handleVideoEnded = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const src = (e.target as HTMLVideoElement).src;
    const filename = src.split('/').pop();
    if (earlyTransitionFiredRef.current) {
      devLog(`[VideoBackgroundManager] Video ended: ${filename}. Early transition already fired, skipping.`);
      return;
    }
    devLog(`[VideoBackgroundManager] Video ended: ${filename}. Transitioning (fallback)...`);
    transitionToNext();
  }, [transitionToNext]);

  // Apply per-clip properties to a video element (speed + volume only, no transition state)
  const applyClipProperties = useCallback((video: HTMLVideoElement, clip: VideoClip) => {
    video.playbackRate = clip.speed;
    if (isTelepath) {
      video.muted = videoVolume === 0;
      video.volume = videoVolume;
    } else {
      video.muted = true;
      video.volume = 0;
    }

    devLog('[VideoBackgroundManager] Applied clip properties:', {
      file: clip.url.split('/').pop(),
      speed: clip.speed,
      transition: clip.transition,
      videoVolume,
    });
  }, [videoVolume, isTelepath]);

  // Setup timer for transitions (only when NOT fullLength)
  useEffect(() => {
    if (!isActive || playlist.length === 0 || fullLength) return;

    let timerId: NodeJS.Timeout | null = null;
    let metadataHandler: (() => void) | null = null;

    const setupTimer = () => {
      let duration = getRandomDuration();

      const activeRef = currentIndex % 2 === 0 ? videoARef : videoBRef;
      const video = activeRef.current;

      if (video && video.duration) {
        const videoDurationMs = video.duration * 1000;
        const currentClip = playlist[currentIndex];
        const effectiveDurationMs = videoDurationMs / (currentClip?.speed || 1);
        const fadeBuffer = currentClip?.transition === 'cut' ? 0 : DEFAULT_FADE_MS;

        if (effectiveDurationMs < 5000) {
           devLog(`[VideoBackgroundManager] Short video detected (${(effectiveDurationMs/1000).toFixed(1)}s < 5s). Scheduling hard cut.`);
           // Short videos will get a cut transition applied in transitionToNext
           duration = effectiveDurationMs;
        } else {
           const safeRunTime = Math.max(0, effectiveDurationMs - fadeBuffer);

           if (duration > safeRunTime) {
             devLog(`[VideoBackgroundManager] Video shorter than random cycle. Adjusting timer to start transition at ${(safeRunTime/1000).toFixed(1)}s`);
             duration = safeRunTime;
           }
        }
      }

      devLog('[VideoBackgroundManager] Setting timer for', duration, 'ms');

      timerId = setTimeout(() => {
        devLog('[VideoBackgroundManager] Timer triggered, transitioning');
        transitionToNext();
      }, duration);

      timerRef.current = timerId;
    };

    const activeRef = currentIndex % 2 === 0 ? videoARef : videoBRef;
    const video = activeRef.current;

    if (video && video.readyState >= 1) {
      setupTimer();
    } else if (video) {
        metadataHandler = () => {
          setupTimer();
          if (video && metadataHandler) {
             video.removeEventListener('loadedmetadata', metadataHandler);
             metadataHandler = null;
          }
        };
        video.addEventListener('loadedmetadata', metadataHandler);
    } else {
        setupTimer();
    }

    return () => {
      if (timerId) {
        devLog('[VideoBackgroundManager] Clearing timer', timerId);
        clearTimeout(timerId);
      }
      if (timerRef.current === timerId) {
        timerRef.current = null;
      }
      if (video && metadataHandler) {
        video.removeEventListener('loadedmetadata', metadataHandler);
      }
    };
  }, [isActive, playlist.length, currentIndex, transitionToNext, playlist, fullLength]);

  // Load videos based on current index (ping-pong between A and B)
  useEffect(() => {
    if (playlist.length === 0) return;

    const currentClip = playlist[currentIndex];
    const nextIndex = (currentIndex + 1) % playlist.length;
    const nextClip = playlist[nextIndex];

    devLog('[VideoBackgroundManager] Loading videos. Current:', currentIndex, currentClip.url);

    // Reset early transition flag for new clip
    earlyTransitionFiredRef.current = false;

    // Update current video name and link in context
    if (currentClip.name) {
      setCurrentVideoName(currentClip.name);
    } else {
      const filename = decodeURIComponent(currentClip.url.split('/').pop() || '');
      const displayName = filename.replace(/\.\w+$/, '').replace(/[-_]/g, ' ');
      setCurrentVideoName(displayName);
    }
    setCurrentVideoLink(currentClip.link ?? null);

    const activeRef = currentIndex % 2 === 0 ? videoARef : videoBRef;
    const preloadRef = currentIndex % 2 === 0 ? videoBRef : videoARef;

    // Load and play the active video
    if (activeRef.current) {
      const video = activeRef.current;
      const srcNeedsUpdate = video.src !== currentClip.url && !video.src.endsWith(currentClip.url);

      if (srcNeedsUpdate) {
        devLog(`[VideoBackgroundManager] Active video src update needed. setting to ${currentClip.url}`);
        video.src = currentClip.url;
        video.load();
      }

      applyClipProperties(video, currentClip);

      attemptPlay(video);
    }

    // Preload the next video after the current transition completes.
    // This avoids destroying the fading-out element's visual content mid-crossfade.
    const preloadDelay = transitionDurationRef.current;

    const preloadTimeout = setTimeout(() => {
      if (preloadRef.current) {
        const video = preloadRef.current;
        video.pause();

        const srcNeedsUpdate = video.src !== nextClip.url && !video.src.endsWith(nextClip.url);

        if (srcNeedsUpdate) {
          devLog(`[VideoBackgroundManager] Preloading next video: ${nextClip.url}`);
          video.src = nextClip.url;
          video.load();
        }

        video.currentTime = 0;
      }
    }, preloadDelay);

    return () => clearTimeout(preloadTimeout);
  }, [playlist, currentIndex, applyClipProperties, fullLength, setCurrentVideoName, setCurrentVideoLink, attemptPlay]);

  // Early crossfade for fullLength mode: start transition before the video ends
  useEffect(() => {
    if (!isActive || playlist.length === 0 || !fullLength) return;

    const activeRef = currentIndex % 2 === 0 ? videoARef : videoBRef;
    const video = activeRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (!video.duration || earlyTransitionFiredRef.current) return;
      const timeRemainingSec = video.duration - video.currentTime;
      const thresholdSec = transitionDurationRef.current / 1000;

      if (thresholdSec > 0 && timeRemainingSec <= thresholdSec && timeRemainingSec > 0) {
        devLog(`[VideoBackgroundManager] Early crossfade triggered. ${timeRemainingSec.toFixed(1)}s remaining.`);
        earlyTransitionFiredRef.current = true;

        // Start the preloaded video so it has frames ready during the crossfade
        const preloadRef = currentIndex % 2 === 0 ? videoBRef : videoARef;
        if (preloadRef.current && preloadRef.current.paused && preloadRef.current.readyState >= 2) {
          attemptPlay(preloadRef.current);
        }

        transitionToNext();
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [isActive, playlist.length, currentIndex, fullLength, transitionToNext, attemptPlay]);

  // Initialize transition duration on both video elements once they are active
  useEffect(() => {
    if (isActive) {
      setTransitionDuration(DEFAULT_FADE_MS);
    }
  }, [isActive, setTransitionDuration]);

  useEffect(() => {
    if (!isActive || playlist.length === 0) return;
    const clip = playlist[currentIndex];
    devLog('[VideoBackgroundManager] Active clip changed', {
      currentIndex,
      totalClips: playlist.length,
      fullLength,
      clip: clip
        ? {
            file: decodeURIComponent(clip.url.split('/').pop() || clip.url),
            transition: clip.transition,
            speed: clip.speed,
          }
        : null,
    });
  }, [isActive, playlist, currentIndex, fullLength]);

  // User-gesture hint from MusicPlayer: when a Video Gallery track button is pressed,
  // aggressively retry playback for active/preloaded elements.
  useEffect(() => {
    if (videoPlaybackUnlockRequest === 0) return;
    if (!isActive || playlist.length === 0) return;

    const activeRef = currentIndex % 2 === 0 ? videoARef : videoBRef;
    const preloadRef = currentIndex % 2 === 0 ? videoBRef : videoARef;
    devLog('[VideoBackgroundManager] Received user playback unlock request', {
      request: videoPlaybackUnlockRequest,
      currentIndex,
      activeSnapshot: activeRef.current ? getVideoSnapshot(activeRef.current) : null,
      preloadSnapshot: preloadRef.current ? getVideoSnapshot(preloadRef.current) : null,
    });

    if (activeRef.current) {
      attemptPlay(activeRef.current);
    }

    if (preloadRef.current && preloadRef.current.paused && preloadRef.current.readyState >= 2) {
      attemptPlay(preloadRef.current);
    }
  }, [videoPlaybackUnlockRequest, isActive, playlist.length, currentIndex, attemptPlay]);

  // Recover playback when the page becomes visible again
  useEffect(() => {
    const handleVisibilityRecover = () => {
      const activeRef = currentIndex % 2 === 0 ? videoARef : videoBRef;
      const video = activeRef.current;
      devLog('[VideoBackgroundManager] visibilitychange', {
        hidden: document.hidden,
        visibilityState: document.visibilityState,
        activeSnapshot: video ? getVideoSnapshot(video) : null,
      });
      if (document.hidden) return;
      if (video && video.paused && mountedRef.current) {
        attemptPlay(video);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityRecover);
    return () => document.removeEventListener('visibilitychange', handleVisibilityRecover);
  }, [currentIndex, attemptPlay]);

  // Listen for skip video trigger from context
  useEffect(() => {
    if (forceSkipVideo === 0) return;
    transitionToNext();
  }, [forceSkipVideo, transitionToNext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      setCurrentVideoName(null);
      setCurrentVideoLink(null);

      [videoARef, videoBRef].forEach(ref => {
        if (ref.current) {
          ref.current.pause();
          ref.current.src = '';
          ref.current.load();
        }
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isActive || playlist.length === 0) {
    return null;
  }

  const videoAOpacity = currentIndex % 2 === 0 ? 1 : 0;
  const videoBOpacity = currentIndex % 2 === 1 ? 1 : 0;

  return (
    <>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: -1 }}
      >
        <video
          ref={videoARef}
          className="absolute top-0 left-0 w-full h-full object-cover ease-in-out"
          style={{
            opacity: videoAOpacity,
            transitionProperty: 'opacity'
          }}
          muted
          playsInline
          preload="auto"
          onEnded={handleVideoEnded}
        />

        <video
          ref={videoBRef}
          className="absolute top-0 left-0 w-full h-full object-cover ease-in-out"
          style={{
            opacity: videoBOpacity,
            transitionProperty: 'opacity'
          }}
          muted
          playsInline
          preload="auto"
          onEnded={handleVideoEnded}
        />
      </div>

    </>
  );
}
