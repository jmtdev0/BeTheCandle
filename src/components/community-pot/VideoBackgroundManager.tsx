"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useMusicTrack } from "@/contexts/MusicTrackContext";

// Per-clip descriptor returned by the API
interface VideoClip {
  url: string;
  transition: "fade" | "cut";
  speed: number;
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

// Helper to log only in development
const isDev = process.env.NODE_ENV === 'development' || typeof window !== 'undefined' && window.location.hostname === 'localhost';
const devLog = (...args: unknown[]) => {
  if (isDev) console.log(...args);
};

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
    };
  });
}

export default function VideoBackgroundManager({ trackName }: VideoBackgroundManagerProps) {
  const { videoVolume, setCurrentVideoName, forceSkipVideo } = useMusicTrack();

  const [videoList, setVideoList] = useState<VideoClip[]>([]);
  const [playlist, setPlaylist] = useState<VideoClip[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [fullLength, setFullLength] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const isTransitioningRef = useRef(false);
  const earlyTransitionFiredRef = useRef(false);

  // Transition duration as a ref — never triggers re-renders or effect re-runs
  const transitionDurationRef = useRef(DEFAULT_FADE_MS);

  // Keep a ref mirror of playlist so callbacks always see the latest value
  const playlistRef = useRef<VideoClip[]>([]);
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);

  const videoListRef = useRef<VideoClip[]>([]);
  useEffect(() => { videoListRef.current = videoList; }, [videoList]);

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

        const response = await fetch(apiUrl);
        if (ignore) return;

        const data = await response.json();
        if (ignore) return;

        const videos = normalizeVideos(data);
        if (videos.length > 0) {
          setVideoList(videos);
          const shuffled = shuffleArray(videos);
          setPlaylist(shuffled);
          setCurrentIndex(0);
          setFullLength(data.fullLength ?? false);
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

  // Attempt to play a video with fallback detection for browsers (e.g. Brave) that silently
  // block autoplay without rejecting the play() promise with NotAllowedError.
  const attemptPlay = useCallback((video: HTMLVideoElement) => {
    let playingFired = false;

    const onPlaying = () => { playingFired = true; };
    video.addEventListener('playing', onPlaying, { once: true });

    // Once the browser has buffered enough data, check whether playback actually started.
    // A 200 ms grace period accounts for the short delay between canplay and the first frame.
    const onCanPlay = () => {
      setTimeout(() => {
        if (!playingFired && video.paused && mountedRef.current) {
          devLog('[VideoBackgroundManager] Autoplay silently blocked (canplay fired but video still paused)');
          setAutoplayBlocked(true);
        }
      }, 200);
    };
    video.addEventListener('canplay', onCanPlay, { once: true });

    video.play().catch((err) => {
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('canplay', onCanPlay);
      devLog('[VideoBackgroundManager] play() rejected:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setAutoplayBlocked(true);
      }
    });
  }, []);

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

    // Update current video name in context
    const filename = decodeURIComponent(currentClip.url.split('/').pop() || '');
    const displayName = filename.replace(/\.\w+$/, '').replace(/[-_]/g, ' ');
    setCurrentVideoName(displayName);

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
  }, [playlist, currentIndex, applyClipProperties, fullLength, setCurrentVideoName, attemptPlay]);

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

  // Handle user clicking "Enable Video" in the autoplay-blocked modal
  const handleEnableVideo = useCallback(() => {
    const activeRef = currentIndex % 2 === 0 ? videoARef : videoBRef;
    if (activeRef.current) {
      activeRef.current.play().catch(() => {});
    }
    setAutoplayBlocked(false);
  }, [currentIndex]);

  // Recover playback when the page becomes visible again
  useEffect(() => {
    const handleVisibilityRecover = () => {
      if (document.hidden) return;
      const activeRef = currentIndex % 2 === 0 ? videoARef : videoBRef;
      const video = activeRef.current;
      if (video && video.paused && mountedRef.current && !autoplayBlocked) {
        attemptPlay(video);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityRecover);
    return () => document.removeEventListener('visibilitychange', handleVisibilityRecover);
  }, [currentIndex, autoplayBlocked, attemptPlay]);

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

      {autoplayBlocked && (
        <div
          className="fixed inset-0 flex items-center justify-center pointer-events-auto"
          style={{ zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        >
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl">
            <h2 className="text-white text-xl font-semibold mb-3">
              Video Playback Blocked
            </h2>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
              Your browser is blocking automatic video playback to save resources.
              Click the button below to enable it.
            </p>
            <button
              onClick={handleEnableVideo}
              className="bg-white text-gray-900 font-medium px-6 py-2.5 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              Enable Video
            </button>
          </div>
        </div>
      )}
    </>
  );
}
