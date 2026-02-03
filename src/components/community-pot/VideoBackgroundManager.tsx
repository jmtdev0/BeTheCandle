"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Random duration between 10-15 seconds
function getRandomDuration() {
  const MIN_DURATION = 10000; // 10s
  const MAX_DURATION = 15000; // 15s
  return Math.random() * (MAX_DURATION - MIN_DURATION) + MIN_DURATION;
}

// Helper to log only in development
const isDev = process.env.NODE_ENV === 'development' || typeof window !== 'undefined' && window.location.hostname === 'localhost';
const devLog = (...args: any[]) => {
  if (isDev) console.log(...args);
};

export default function VideoBackgroundManager() {
  const [videoList, setVideoList] = useState<string[]>([]);
  const [playlist, setPlaylist] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  // Add state for dynamic transition duration
  const [transitionDuration, setTransitionDuration] = useState(3500);

  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const isTransitioningRef = useRef(false);

  // Fetch video list on mount
  useEffect(() => {
    let ignore = false;

    async function fetchVideos() {
      try {
        const response = await fetch('/api/videos');
        if (ignore) return;

        const data = await response.json();
        if (ignore) return;

        if (data.videos && Array.isArray(data.videos) && data.videos.length > 0) {
          const videos = data.videos as string[];
          setVideoList(videos);
          const shuffled = shuffleArray(videos);
          setPlaylist(shuffled);
          setCurrentIndex(0);
          setIsActive(true);
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
  }, []);

  // Bandwidth Tracker
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    const interval = setInterval(() => {
      // Get all network resource entries
      const entries = performance.getEntriesByType("resource");
      let totalBytes = 0;
      let count = 0;

      for (const entry of entries) {
        // Filter for video files (mp4, mov, or specifically in our folder)
        if (entry.name.match(/\.(mp4|mov)$/i)) {
          const rEntry = entry as PerformanceResourceTiming;
          // transferSize matches bytes transferred over network (0 if cached)
          // This exactly attempts to measure "bandwidth consumption"
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
    }, 4000); // Log every 4 seconds

    return () => clearInterval(interval);
  }, []);

  // Debug video events
  useEffect(() => {
    const events = ['playing', 'pause', 'ended', 'error', 'waiting', 'stalled'];
    
    const logEvent = (id: string, e: Event) => {
      const target = e.target as HTMLVideoElement;
      devLog(`[VideoBackgroundManager] ${id} event: ${e.type}`, {
        src: target.src.split('/').pop(),
        readyState: target.readyState,
        paused: target.paused,
        currentTime: target.currentTime,
        error: target.error
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
  }, []);

  // Transition to next video
  const transitionToNext = useCallback(() => {
    if (isTransitioningRef.current) {
      devLog('[VideoBackgroundManager] transitionToNext called but already transitioning');
      return;
    }

    // Note: We removed the mountedRef check to avoid race conditions. 
    // If component is unmounted, setState will just warn, which is better than stalling.

    devLog('[VideoBackgroundManager] Executing transitionToNext');
    isTransitioningRef.current = true;

    // Clear any existing timer from the ref (just in case)
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setCurrentIndex(prevIndex => {
      const nextIndex = (prevIndex + 1) % playlist.length;
      devLog(`[VideoBackgroundManager] Updating index: ${prevIndex} -> ${nextIndex}`);

      // Reshuffle if we've reached the end
      if (nextIndex === 0 && videoList.length > 0) {
        devLog('[VideoBackgroundManager] Reshuffling playlist');
        const newPlaylist = shuffleArray(videoList);
        setPlaylist(newPlaylist);
      }

      return nextIndex;
    });

    // Reset transitioning flag after a short delay
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 500);
  }, [playlist.length, videoList]);

  // Handle video ended event
  const handleVideoEnded = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const src = (e.target as HTMLVideoElement).src;
    const filename = src.split('/').pop();
    devLog(`[VideoBackgroundManager] Video ended: ${filename}. Transitioning...`);
    transitionToNext();
  }, [transitionToNext]);

  // Setup timer for transitions (backup in case video is longer than expected)
  useEffect(() => {
    if (!isActive || playlist.length === 0) return;

    // Use a local variable for the timer ID to ensure cleanups are correct
    let timerId: NodeJS.Timeout | null = null;
    let metadataHandler: (() => void) | null = null;

    const setupTimer = () => {
      let duration = getRandomDuration();
      
      // Check active video duration
      const activeRef = currentIndex % 2 === 0 ? videoARef : videoBRef;
      const video = activeRef.current;
      
      if (video && video.duration) {
        const videoDurationMs = video.duration * 1000;
        const fadeBuffer = 3500; // ms
        
        // If video is short (e.g. less than 5 seconds), do a hard cut (0ms transition)
        // This avoids awkward loops during fade or transitions starting immediately
        if (videoDurationMs < 5000) {
           devLog(`[VideoBackgroundManager] Short video detected (${(videoDurationMs/1000).toFixed(1)}s < 5s). Scheduling hard cut.`);
           
           // Set transition to instant for the upcoming switch
           setTransitionDuration(0);
           
           // Play full video then switch
           // We subtract a tiny amount (e.g. 50ms) to ensure we don't miss the end or loop unnecessarily
           // but technically if loop=true it doesn't matter.
           duration = videoDurationMs;
        } else {
           // Normal video: use slow fade
           setTransitionDuration(3500);

           // Ensure we transition before it ends using the fade buffer
           const safeRunTime = Math.max(0, videoDurationMs - fadeBuffer);
           
           if (duration > safeRunTime) {
             devLog(`[VideoBackgroundManager] Video shorter than random cycle. Adjusting timer to start transition at ${(safeRunTime/1000).toFixed(1)}s`);
             duration = safeRunTime;
           }
        }
      } else {
         // Fallback if no duration found (shouldn't happen with metadata wait)
         setTransitionDuration(3500);
      }

      devLog('[VideoBackgroundManager] Setting timer for', duration, 'ms');

      timerId = setTimeout(() => {
        devLog('[VideoBackgroundManager] Timer triggered, transitioning');
        transitionToNext();
      }, duration);

      timerRef.current = timerId;
    };

    // Attempt to setup timer immediately if metadata known, otherwise wait
    const activeRef = currentIndex % 2 === 0 ? videoARef : videoBRef;
    const video = activeRef.current;

    if (video && video.readyState >= 1) { // HAVE_METADATA
      setupTimer();
    } else if (video) {
        metadataHandler = () => {
          setupTimer();
          // Remove listener once handled
          if (video && metadataHandler) {
             video.removeEventListener('loadedmetadata', metadataHandler);
             metadataHandler = null;
          }
        };
        video.addEventListener('loadedmetadata', metadataHandler);
    } else {
        // Fallback
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
  }, [isActive, playlist.length, currentIndex, transitionToNext]);

  // Load videos based on current index (ping-pong between A and B)
  useEffect(() => {
    if (playlist.length === 0) return;

    const currentVideo = playlist[currentIndex];
    const nextIndex = (currentIndex + 1) % playlist.length;
    const nextVideo = playlist[nextIndex];

    devLog('[VideoBackgroundManager] Loading videos. Current:', currentIndex, currentVideo);

    // Even indices use videoA, odd indices use videoB
    const activeRef = currentIndex % 2 === 0 ? videoARef : videoBRef;
    const preloadRef = currentIndex % 2 === 0 ? videoBRef : videoARef;

    // Load and play the active video
    if (activeRef.current) {
      const video = activeRef.current;
      // If the src is not fully qualified in playlist, this check might be false negative, 
      // but setting src again is safe for ensuring playback starts from beginning.
      // To avoid reloading if already correct (from preload), we can check endsWith.
      const srcNeedsUpdate = video.src !== currentVideo && !video.src.endsWith(currentVideo);
      
      if (srcNeedsUpdate) {
        devLog(`[VideoBackgroundManager] Active video src update needed. setting to ${currentVideo}`);
        video.src = currentVideo;
        video.load();
      }
      
      video.play().catch((err) => {
        devLog('[VideoBackgroundManager] Autoplay failed:', err);
      });
    }

    // Preload the next video - DELAYED
    // We delay this operation to allow the 'outgoing' video (which is now in preloadRef)
    // to finish its fade-out transition before we cut its content.
    // The delay should match the current transition duration.
    const preloadDelay = transitionDuration;
    
    const preloadTimeout = setTimeout(() => {
      if (preloadRef.current) {
        const video = preloadRef.current;
        
        // Now that fade out is likely done, stop the old video
        video.pause();
        
        const srcNeedsUpdate = video.src !== nextVideo && !video.src.endsWith(nextVideo);
        
        if (srcNeedsUpdate) {
          devLog(`[VideoBackgroundManager] Preloading next video: ${nextVideo}`);
          video.src = nextVideo;
          video.load();
        }
      }
    }, preloadDelay); // Sync with dynamic transition duration

    return () => clearTimeout(preloadTimeout);
  }, [playlist, currentIndex, transitionDuration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);

      [videoARef, videoBRef].forEach(ref => {
        if (ref.current) {
          ref.current.pause();
          ref.current.src = '';
          ref.current.load();
        }
      });
    };
  }, []);

  if (!isActive || playlist.length === 0) {
    return null;
  }

  // Determine which video should be visible based on current index
  const videoAOpacity = currentIndex % 2 === 0 ? 1 : 0;
  const videoBOpacity = currentIndex % 2 === 1 ? 1 : 0;

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
    >
      <video
        ref={videoARef}
        className="absolute top-0 left-0 w-full h-full object-cover ease-in-out"
        style={{ 
          opacity: videoAOpacity,
          transitionDuration: `${transitionDuration}ms`,
          transitionProperty: 'opacity'
        }}
        muted
        playsInline
        autoPlay
        loop={true}
        onEnded={handleVideoEnded}
      />

      <video
        ref={videoBRef}
        className="absolute top-0 left-0 w-full h-full object-cover ease-in-out"
        style={{ 
          opacity: videoBOpacity,
          transitionDuration: `${transitionDuration}ms`,
          transitionProperty: 'opacity'
        }}
        muted
        playsInline
        preload="auto"
        loop={true}
        onEnded={handleVideoEnded}
      />
    </div>
  );
}
