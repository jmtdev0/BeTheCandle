"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Volume2, VolumeX, Music, ChevronDown, ChevronUp, ExternalLink, Film, SkipForward } from "lucide-react";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { useMusicTrack } from "@/contexts/MusicTrackContext";

interface Track {
  name: string;
  path: string;
  displayName: string;
  link?: string | null;
  videoLink?: string | null;
  hasVideo?: boolean;
}

interface MusicPlayerProps {
  tracks?: Track[];
  theme?: "blue" | "orange"; // "blue" para Community Pot
}

// Helper functions para cookies
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

function isVideoDebugEnabled() {
  if (process.env.NODE_ENV === "development") return true;
  if (typeof window === "undefined") return false;
  try {
    const query = new URLSearchParams(window.location.search).get("debugVideo");
    if (query === "1" || query === "true") return true;
    const persisted = window.localStorage.getItem("btc_debug_video");
    return persisted === "1" || persisted === "true";
  } catch {
    return false;
  }
}

function mediaLog(...args: unknown[]) {
  if (isVideoDebugEnabled()) {
    console.log(...args);
  }
}

export default function MusicPlayer({ tracks: initialTracks = [], theme = "orange" }: MusicPlayerProps) {
  const { allowPreferences } = useCookieConsent();
  const {
    setMusicTrackState,
    videoVolume,
    setVideoVolume,
    setImmersiveMode,
    videoEnabled,
    forceSkipToSkyScene,
    currentVideoName,
    currentVideoLink,
    triggerSkipVideo,
    triggerVideoPlaybackUnlock,
  } = useMusicTrack();
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Cargar volumen y estado de mute desde cookies (valores por defecto para SSR)
  const [volume, setVolume] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"video" | "music">("video");
  const [isSkipCooldown, setIsSkipCooldown] = useState(false);
  const skipCooldownRef = useRef<NodeJS.Timeout | null>(null);
  const videoNameContainerRef = useRef<HTMLDivElement>(null);
  const videoNameTextRef = useRef<HTMLSpanElement>(null);
  const [videoNameOverflows, setVideoNameOverflows] = useState(false);

  // Auto-switch tab to show currently playing track when expanding
  useEffect(() => {
    if (isExpanded && tracks.length > 0) {
      const currentTrack = tracks[currentTrackIndex];
      if (currentTrack) {
        const shouldBeInVideoTab = currentTrack.hasVideo;
        setActiveTab(shouldBeInVideoTab ? "video" : "music");
      }
    }
  }, [isExpanded, currentTrackIndex, tracks]);

  // When videoEnabled becomes false, switch to music tab
  useEffect(() => {
    if (!videoEnabled && activeTab === "video") {
      mediaLog("[MusicPlayer][Debug] videoEnabled=false, switching tab to music");
      setActiveTab("music");
    }
  }, [videoEnabled, activeTab]);

  // When forceSkipToSkyScene fires, switch to a random Sky Scene track
  useEffect(() => {
    if (forceSkipToSkyScene === 0) return;

    const skySceneTracks = tracks
      .map((t, i) => ({ track: t, index: i }))
      .filter(({ track }) => !track.hasVideo);

    if (skySceneTracks.length > 0) {
      const random = skySceneTracks[Math.floor(Math.random() * skySceneTracks.length)];
      setCurrentTrackIndex(random.index);
    }
  }, [forceSkipToSkyScene, tracks]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousVolumeRef = useRef(0.3);
  const hasAutoPlayedRef = useRef(false);
  const lastPlayedTrackRef = useRef<number>(-1); // Track the last played track to avoid immediate repeats
  const currentTrackPathRef = useRef<string | null>(null);

  const handleTrackEnd = useCallback(() => {
    const audio = audioRef.current;
    const current = tracks[currentTrackIndex];

    // Video Gallery tracks and single-track playlists: loop the same track
    if (current?.hasVideo || tracks.length <= 1) {
      if (audio) {
        audio.currentTime = 0;
        audio
          .play()
          .then(() => {
            hasAutoPlayedRef.current = true;
            setIsPlaying(true);
          })
          .catch(() => {
            setIsPlaying(false);
          });
      }
      return;
    }

    // Sky Scene tracks: only pick from other Sky Scene tracks
    const skySceneTracks = tracks
      .map((t, i) => ({ track: t, index: i }))
      .filter(({ track }) => !track.hasVideo);

    if (skySceneTracks.length <= 1) {
      // Only one Sky Scene track: loop it
      if (audio) {
        audio.currentTime = 0;
        audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
      return;
    }

    let nextIndex = currentTrackIndex;
    let attempts = 0;
    const maxAttempts = 20;

    while ((nextIndex === currentTrackIndex || nextIndex === lastPlayedTrackRef.current) && attempts < maxAttempts) {
      const pick = skySceneTracks[Math.floor(Math.random() * skySceneTracks.length)];
      nextIndex = pick.index;
      attempts += 1;
    }

    if (nextIndex === currentTrackIndex) {
      const otherTracks = skySceneTracks.filter(({ index }) => index !== currentTrackIndex);
      nextIndex = otherTracks[0]?.index ?? (currentTrackIndex + 1) % tracks.length;
    }

    lastPlayedTrackRef.current = currentTrackIndex;
    setCurrentTrackIndex(nextIndex);
  }, [tracks, currentTrackIndex]);

  // Cargar configuración guardada solo después de la hidratación (y si se permite)
  useEffect(() => {
    if (allowPreferences) {
      const savedVolume = getCookie("music_volume");
      const savedMuted = getCookie("music_muted");
      const savedVideoVolume = getCookie("video_volume");

      if (savedVolume) {
        setVolume(parseFloat(savedVolume));
      }
      if (savedMuted) {
        setIsMuted(savedMuted === "true");
      }
      if (savedVideoVolume) {
        setVideoVolume(parseFloat(savedVideoVolume));
      }
    }

    setIsHydrated(true);
  }, [allowPreferences, setVideoVolume]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
      audioRef.current.loop = false;
    }

    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = false;

    const onEnded = () => handleTrackEnd();
    const onCanPlayThrough = () => {
      if (hasAutoPlayedRef.current || !audioRef.current) return;

      audioRef.current
        .play()
        .then(() => {
          hasAutoPlayedRef.current = true;
          setIsPlaying(true);
        })
        .catch((error) => {
          console.log("Auto-play bloqueado. Haz click en play para iniciar.", error);
          mediaLog("[MusicPlayer][Debug] initial audio autoplay blocked", {
            error,
            currentTrackName: tracks[currentTrackIndex]?.name ?? null,
            documentHidden: typeof document !== "undefined" ? document.hidden : null,
          });
          setIsPlaying(false);
        });
    };

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("canplaythrough", onCanPlayThrough);

    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("canplaythrough", onCanPlayThrough);
    };
  }, [handleTrackEnd]);

  // Guardar volumen en cookie cuando cambia (solo si se permite)
  useEffect(() => {
    if (allowPreferences) {
      setCookie("music_volume", volume.toString());
    }
  }, [volume, allowPreferences]);

  // Guardar estado de mute en cookie cuando cambia (solo si se permite)
  useEffect(() => {
    if (allowPreferences) {
      setCookie("music_muted", isMuted.toString());
    }
  }, [isMuted, allowPreferences]);

  // Guardar volumen de vídeo en cookie cuando cambia
  useEffect(() => {
    if (allowPreferences) {
      setCookie("video_volume", videoVolume.toString());
    }
  }, [videoVolume, allowPreferences]);

  // Cargar música automáticamente desde la API
  useEffect(() => {
    async function loadMusic() {
      try {
        const response = await fetch('/api/music');
        const data = await response.json();
        mediaLog("[MusicPlayer][Debug] /api/music response", {
          ok: response.ok,
          status: response.status,
          totalTracks: Array.isArray(data.tracks) ? data.tracks.length : 0,
          videoTracks: Array.isArray(data.tracks) ? data.tracks.filter((t: Track) => t.hasVideo).length : 0,
        });
        if (data.tracks && data.tracks.length > 0) {
          setTracks(data.tracks);
          // Always start with a Sky Scene track (non-video)
          const skySceneIndices = data.tracks
            .map((t: Track, i: number) => ({ t, i }))
            .filter(({ t }: { t: Track }) => !t.hasVideo)
            .map(({ i }: { i: number }) => i);
          const randomIndex = skySceneIndices.length > 0
            ? skySceneIndices[Math.floor(Math.random() * skySceneIndices.length)]
            : Math.floor(Math.random() * data.tracks.length);
          setCurrentTrackIndex(randomIndex);
        }
      } catch (error) {
        console.error('Error cargando música:', error);
      }
    }
    loadMusic();
  }, []);

  // Manejar reproducción y cambios de pistas
  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || tracks.length === 0) {
      currentTrackPathRef.current = null;
      return;
    }

    const nextTrack = tracks[currentTrackIndex];
    if (!nextTrack) return;

    if (currentTrackPathRef.current !== nextTrack.path) {
      currentTrackPathRef.current = nextTrack.path;
      audio.src = nextTrack.path;
      try {
        audio.load();
      } catch (error) {
        console.warn("No se pudo cargar el audio:", error);
      }
      audio.currentTime = 0;
    }

    audio.loop = false;
    audio.volume = isMuted ? 0 : volume;

    const shouldAutoPlay = isPlaying || !hasAutoPlayedRef.current;

    if (shouldAutoPlay) {
      if (audio.paused) {
        audio
          .play()
          .then(() => {
            setIsPlaying(true);
            hasAutoPlayedRef.current = true;
          })
          .catch((error) => {
            if (!hasAutoPlayedRef.current) {
              console.log("Auto-play bloqueado. Haz click en play para iniciar.", error);
              mediaLog("[MusicPlayer][Debug] autoplay blocked during track effect", {
                error,
                trackName: nextTrack.name,
                hasVideo: Boolean(nextTrack.hasVideo),
              });
            } else {
              console.error("Error al reproducir:", error);
              mediaLog("[MusicPlayer][Debug] play error during track effect", {
                error,
                trackName: nextTrack.name,
                hasVideo: Boolean(nextTrack.hasVideo),
              });
            }
            setIsPlaying(false);
          });
      }
    } else if (!audio.paused) {
      audio.pause();
    }
  }, [tracks, currentTrackIndex, isPlaying, isMuted, volume]);

  // Actualizar volumen cuando cambia
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (!audioRef.current || tracks.length === 0) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          hasAutoPlayedRef.current = true;
          setIsPlaying(true);
        })
        .catch((error) => {
          console.error("Error al reproducir:", error);
          mediaLog("[MusicPlayer][Debug] togglePlay failed", {
            error,
            currentTrackName: tracks[currentTrackIndex]?.name ?? null,
          });
          setIsPlaying(false);
        });
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(previousVolumeRef.current);
    } else {
      previousVolumeRef.current = volume;
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const selectTrack = (index: number) => {
    const track = tracks[index];
    mediaLog("[MusicPlayer][Debug] selectTrack()", {
      index,
      trackName: track?.name ?? null,
      hasVideo: Boolean(track?.hasVideo),
      activeTab,
      isPlaying,
    });
    if (track?.hasVideo) {
      mediaLog("[MusicPlayer][Debug] triggerVideoPlaybackUnlock() from selectTrack", {
        trackName: track.name,
      });
      triggerVideoPlaybackUnlock();
    }
    if (track && !track.hasVideo) {
      setImmersiveMode(false);
    }
    setCurrentTrackIndex(index);
  };

  const handleSkipVideo = useCallback(() => {
    if (isSkipCooldown) return;
    triggerSkipVideo();
    setIsSkipCooldown(true);
    skipCooldownRef.current = setTimeout(() => setIsSkipCooldown(false), 3000);
  }, [isSkipCooldown, triggerSkipVideo]);

  // Clear skip cooldown on unmount
  useEffect(() => {
    return () => {
      if (skipCooldownRef.current) clearTimeout(skipCooldownRef.current);
    };
  }, []);

  // Detect if video name overflows its container
  useEffect(() => {
    const text = videoNameTextRef.current;
    const container = videoNameContainerRef.current;
    if (text && container) {
      setVideoNameOverflows(text.scrollWidth > container.clientWidth);
    } else {
      setVideoNameOverflows(false);
    }
  }, [currentVideoName]);

  // Siempre mostrar el reproductor, incluso sin canciones (para que sea visible)
  const currentTrack = tracks.length > 0 ? tracks[currentTrackIndex] : null;

  // Update global music track context whenever these values change
  useEffect(() => {
    mediaLog("[MusicPlayer][Debug] setMusicTrackState", {
      currentTrackName: currentTrack?.name || null,
      hasVideo: currentTrack?.hasVideo ?? false,
      currentTrackIndex,
      isPlaying,
    });
    setMusicTrackState({
      currentTrackName: currentTrack?.name || null,
      currentTrackPath: currentTrack?.path || null,
      isPlaying,
      currentTrackIndex,
      currentTrackHasVideo: currentTrack?.hasVideo ?? false,
    });
  }, [currentTrack?.name, currentTrack?.path, currentTrack?.hasVideo, isPlaying, currentTrackIndex, setMusicTrackState]);

  // Colores según el tema
  const themeColors = theme === "blue" ? {
    icon: "text-blue-400",
    iconHover: "hover:text-blue-400",
    button: "bg-blue-500 hover:bg-blue-600",
    highlight: "text-blue-400",
    highlightBg: "bg-blue-500/20",
    slider: "#2276cb",
    sliderHover: "#2b7fdb",
  } : {
    icon: "text-orange-400",
    iconHover: "hover:text-orange-400",
    button: "bg-orange-500 hover:bg-orange-600",
    highlight: "text-orange-400",
    highlightBg: "bg-orange-500/20",
    slider: "#f7931a",
    sliderHover: "#ff9f2e",
  };

  return (
      <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700/50 overflow-hidden transition-all duration-300">
        {/* Barra superior colapsable */}
        <div className="flex items-center justify-between p-3 border-b border-gray-700/50 bg-gray-800/50">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Music size={16} className={`${themeColors.icon} flex-shrink-0`} />
            <div className="min-w-0 flex-1">
              <span className="text-xs text-gray-400 truncate block">
                {currentTrack ? currentTrack.displayName : "No music"}
              </span>
              {currentTrack?.hasVideo && currentVideoName && (
                <div ref={videoNameContainerRef} className="overflow-hidden max-w-[180px]">
                  {currentVideoLink ? (
                    <a
                      ref={videoNameTextRef as React.RefObject<HTMLAnchorElement>}
                      href={currentVideoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-[10px] text-gray-500 hover:text-gray-300 whitespace-nowrap inline-block${videoNameOverflows ? ' video-name-marquee' : ''}`}
                    >
                      {currentVideoName}
                    </a>
                  ) : (
                    <span
                      ref={videoNameTextRef}
                      className={`text-[10px] text-gray-500 whitespace-nowrap inline-block${videoNameOverflows ? ' video-name-marquee' : ''}`}
                    >
                      {currentVideoName}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Botón expandir lista (solo si hay múltiples canciones) */}
          {tracks.length > 1 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-700/50 rounded transition-colors"
              title={isExpanded ? "Ocultar lista" : "Mostrar lista"}
            >
              {isExpanded ? (
                <ChevronDown size={14} className="text-gray-400" />
              ) : (
                <ChevronUp size={14} className="text-gray-400" />
              )}
            </button>
          )}
        </div>

        {/* Panel expandible de selección de canciones con tabs */}
        {isExpanded && tracks.length > 0 && (
          <div className="border-b border-gray-700/50 w-[320px]">
            {/* Tabs: Video / Music */}
            <div className="flex border-b border-gray-700/50">
              {videoEnabled && (
                <button
                  onClick={() => setActiveTab("video")}
                  className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                    activeTab === "video"
                      ? `${themeColors.highlightBg} ${themeColors.highlight} border-b-2`
                      : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
                  }`}
                  style={activeTab === "video" ? { borderBottomColor: themeColors.slider } : undefined}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Film size={12} />
                    Video Gallery 🎦
                  </span>
                </button>
              )}
              <button
                onClick={() => setActiveTab("music")}
                className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === "music"
                    ? `${themeColors.highlightBg} ${themeColors.highlight} border-b-2`
                    : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
                }`}
                style={activeTab === "music" ? { borderBottomColor: themeColors.slider } : undefined}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Music size={12} />
                  Sky Scene ᯓ🔵
                </span>
              </button>
            </div>
            {/* Track list filtered by active tab */}
            <div className="max-h-[240px] overflow-y-auto music-list-scrollbar">
              {tracks
                .map((track, globalIndex) => ({ track, globalIndex }))
                .filter(({ track }) =>
                  activeTab === "video" ? track.hasVideo : !track.hasVideo
                )
                .map(({ track, globalIndex }) => (
                  <div
                    key={track.path}
                    className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                      globalIndex === currentTrackIndex
                        ? themeColors.highlightBg
                        : "hover:bg-gray-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onPointerDown={() => {
                          if (track.hasVideo) {
                            mediaLog("[MusicPlayer][Debug] triggerVideoPlaybackUnlock() from pointerdown", {
                              trackName: track.name,
                              activeTab,
                            });
                            triggerVideoPlaybackUnlock();
                          }
                        }}
                        onClick={() => selectTrack(globalIndex)}
                        className="flex items-center gap-2 flex-1 min-w-0"
                      >
                        <Music size={14} className={globalIndex === currentTrackIndex ? themeColors.highlight : "text-gray-400"} />
                        <span className={`truncate ${globalIndex === currentTrackIndex ? themeColors.highlight : "text-gray-300"}`}>
                          {track.displayName}
                        </span>
                        {globalIndex === currentTrackIndex && isPlaying && (
                          <span className={`ml-auto ${themeColors.highlight}`}>♪</span>
                        )}
                      </button>
                      {track.link && (
                        <a
                          href={track.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex-shrink-0 p-1 text-gray-400 ${themeColors.iconHover} transition-colors`}
                          title="Song source"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      {activeTab === "video" && track.videoLink && (
                        <a
                          href={track.videoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex-shrink-0 p-1 text-gray-400 ${themeColors.iconHover} transition-colors`}
                          title="Video source"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Film size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Panel principal */}
        <div className="p-4 w-[320px]">
          {/* Controles de reproducción y volumen */}
          <div className="flex items-center gap-3">
            {/* Botón Play/Pause - deshabilitado si no hay canciones */}
            <button
              onClick={togglePlay}
              disabled={tracks.length === 0}
              className={`flex-shrink-0 w-10 h-10 rounded-full transition-colors flex items-center justify-center text-white ${
                tracks.length === 0
                  ? "bg-gray-700 cursor-not-allowed opacity-50"
                  : themeColors.button
              }`}
              title={tracks.length === 0 ? "No music available" : (isPlaying ? "Pause" : "Play")}
            >
              {isPlaying ? (
                <div className="flex gap-1">
                  <div className="w-1 h-4 bg-white rounded" />
                  <div className="w-1 h-4 bg-white rounded" />
                </div>
              ) : (
                <div className="w-0 h-0 border-l-[6px] border-l-white border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent ml-0.5" />
              )}
            </button>

            {/* Control de volumen */}
            <div className="flex items-center gap-2 flex-1">
              <button
                onClick={toggleMute}
                className={`flex-shrink-0 text-gray-400 ${themeColors.iconHover} transition-colors`}
                title={isMuted ? "Activate sound" : "Mute"}
              >
                {isHydrated && (
                  <>
                    {isMuted || volume === 0 ? (
                      <VolumeX size={20} />
                    ) : (
                      <Volume2 size={20} />
                    )}
                  </>
                )}
              </button>

              {/* Slider de volumen */}
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                style={{
                  background: `linear-gradient(to right, ${themeColors.slider} ${
                    (isMuted ? 0 : volume) * 100
                  }%, #374151 ${(isMuted ? 0 : volume) * 100}%)`,
                }}
                data-theme={theme}
              />

              {/* Porcentaje de volumen */}
              <span className="flex-shrink-0 text-xs text-gray-400 w-8 text-right">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>
          </div>

          {/* Video volume control - only for Telepath videos */}
          {currentTrack?.hasVideo && currentTrack?.name?.toLowerCase().includes('telepath') && <div className="flex items-center gap-3 mt-3">
            <div className="flex-shrink-0 w-10 flex items-center justify-center">
              <Film size={18} className="text-gray-400" />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={videoVolume}
                onChange={(e) => setVideoVolume(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                style={{
                  background: `linear-gradient(to right, ${themeColors.slider} ${videoVolume * 100}%, #374151 ${videoVolume * 100}%)`,
                }}
                data-theme={theme}
              />
              <span className="flex-shrink-0 text-xs text-gray-400 w-8 text-right">
                {Math.round(videoVolume * 100)}%
              </span>
            </div>
          </div>}

          {/* Skip video button */}
          {currentTrack?.hasVideo && (
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-shrink-0 w-10 flex items-center justify-center">
                <SkipForward size={18} className="text-gray-400" />
              </div>
              <button
                onClick={handleSkipVideo}
                disabled={isSkipCooldown}
                className={`text-xs px-3 py-1.5 rounded transition-colors ${
                  isSkipCooldown
                    ? 'text-gray-600 bg-gray-800/30 cursor-not-allowed'
                    : 'text-gray-300 bg-gray-700/50 hover:bg-gray-600/50 hover:text-white'
                }`}
              >
                {isSkipCooldown ? 'Wait...' : 'Next video'}
              </button>
            </div>
          )}

          {/* Mensaje sin música */}
          {tracks.length === 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700/50">
              <p className="text-xs text-gray-500 text-center leading-relaxed">
                ☁️ Sube audios a R2 en<br />
                <code className={`${themeColors.highlight}/70 text-[10px]`}>
                  /music/
                </code>
                <br />
                <span className="text-green-400/70">Si R2 falla o está vacío, se usa /public/background_music/.</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Estilos para el slider */}
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${themeColors.slider};
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .slider-thumb::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${themeColors.slider};
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .slider-thumb::-webkit-slider-thumb:hover {
          background: ${themeColors.sliderHover};
        }

        .slider-thumb::-moz-range-thumb:hover {
          background: ${themeColors.sliderHover};
        }

        .music-list-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .music-list-scrollbar::-webkit-scrollbar-track {
          background: rgba(17, 24, 39, 0.6);
          border-radius: 3px;
        }
        .music-list-scrollbar::-webkit-scrollbar-thumb {
          background: ${themeColors.slider}55;
          border-radius: 3px;
        }
        .music-list-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${themeColors.slider}99;
        }
        .music-list-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: ${themeColors.slider}55 rgba(17, 24, 39, 0.6);
        }

        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .video-name-marquee {
          animation: marquee 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
