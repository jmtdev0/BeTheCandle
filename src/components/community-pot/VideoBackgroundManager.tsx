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
  const { videoVolume } = useMusicTrack();

  const [videoList, setVideoList] = useState<VideoClip[]>([]);
  const [playlist, setPlaylist] = useState<VideoClip[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [fullLength, setFullLength] = useState(false);
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
  useEffect(() => {
    [videoARef, videoBRef].forEach(ref => {
      if (ref.current) {
        ref.current.muted = videoVolume === 0;
        ref.current.volume = videoVolume;
      }
    });
  }, [videoVolume]);

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

    setCurrentIndex(prevIndex => {
      const nextIndex = (prevIndex + 1) % playlist.length;
      devLog(`[VideoBackgroundManager] Updating index: ${prevIndex} -> ${nextIndex}`);

      // Reshuffle when wrapping around, avoiding repeat of last clip
      if (nextIndex === 0 && videoList.length > 0) {
        devLog('[VideoBackgroundManager] Reshuffling playlist');
        const lastClip = playlist[playlist.length - 1] ?? null;
        const newPlaylist = shuffleAvoidingFirst(videoList, lastClip);
        setPlaylist(newPlaylist);
      }

      return nextIndex;
    });

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 500);
  }, [playlist, videoList]);

  // Handle video ended event
  const handleVideoEnded = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const src = (e.target as HTMLVideoElement).src;
    const filename = src.split('/').pop();
    devLog(`[VideoBackgroundManager] Video ended: ${filename}. Transitioning...`);
    transitionToNext();
  }, [transitionToNext]);

  // Apply per-clip properties to a video element
  const applyClipProperties = useCallback((video: HTMLVideoElement, clip: VideoClip) => {
    video.playbackRate = clip.speed;
    video.muted = videoVolume === 0;
    video.volume = videoVolume;

    if (clip.transition === 'cut') {
      setTransitionDuration(0);
    } else {
      setTransitionDuration(2500);
    }

    devLog('[VideoBackgroundManager] Applied clip properties:', {
      file: clip.url.split('/').pop(),
      speed: clip.speed,
      transition: clip.transition,
      videoVolume,
    });
  }, [videoVolume]);

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
        const fadeBuffer = currentClip?.transition === 'cut' ? 0 : 2500;

        if (effectiveDurationMs < 5000) {
           devLog(`[VideoBackgroundManager] Short video detected (${(effectiveDurationMs/1000).toFixed(1)}s < 5s). Scheduling hard cut.`);
           setTransitionDuration(0);
           duration = effectiveDurationMs;
        } else {
           if (currentClip?.transition !== 'cut') {
             setTransitionDuration(2500);
           }
           const safeRunTime = Math.max(0, effectiveDurationMs - fadeBuffer);

           if (duration > safeRunTime) {
             devLog(`[VideoBackgroundManager] Video shorter than random cycle. Adjusting timer to start transition at ${(safeRunTime/1000).toFixed(1)}s`);
             duration = safeRunTime;
           }
        }
      } else {
         setTransitionDuration(2500);
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

      video.play().catch((err) => {
        devLog('[VideoBackgroundManager] Autoplay failed:', err);
      });
    }

    // Preload the next video - DELAYED
    // The preloaded video must stay paused at its start until it becomes the active video
    const preloadDelay = transitionDuration;

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
  }, [playlist, currentIndex, transitionDuration, applyClipProperties]);

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
        preload="auto"
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
        onEnded={handleVideoEnded}
      />
    </div>
  );
}
