"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Volume2, VolumeX, Music, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface Track {
  name: string;
  path: string;
  displayName: string;
  link?: string | null;
}

interface MusicPlayerProps {
  tracks?: Track[];
  theme?: "blue" | "orange"; // "blue" para Community Pot, "orange" para Lobby
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

export default function MusicPlayer({ tracks: initialTracks = [], theme = "orange" }: MusicPlayerProps) {
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Cargar volumen y estado de mute desde cookies (valores por defecto para SSR)
  const [volume, setVolume] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);
  
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousVolumeRef = useRef(0.3);
  const hasAutoPlayedRef = useRef(false);
  const lastPlayedTrackRef = useRef<number>(-1); // Track the last played track to avoid immediate repeats
  const currentTrackPathRef = useRef<string | null>(null);

  const handleTrackEnd = useCallback(() => {
    const audio = audioRef.current;

    if (tracks.length <= 1) {
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

    let nextIndex = currentTrackIndex;
    let attempts = 0;
    const maxAttempts = 20;

    while ((nextIndex === currentTrackIndex || nextIndex === lastPlayedTrackRef.current) && attempts < maxAttempts) {
      nextIndex = Math.floor(Math.random() * tracks.length);
      attempts += 1;
    }

    if (nextIndex === currentTrackIndex) {
      nextIndex = (currentTrackIndex + 1) % tracks.length;
    }

    lastPlayedTrackRef.current = currentTrackIndex;
    setCurrentTrackIndex(nextIndex);
  }, [tracks, currentTrackIndex]);

  // Cargar configuración guardada solo después de la hidratación
  useEffect(() => {
    const savedVolume = getCookie("music_volume");
    const savedMuted = getCookie("music_muted");
    
    if (savedVolume) {
      setVolume(parseFloat(savedVolume));
    }
    if (savedMuted) {
      setIsMuted(savedMuted === "true");
    }
    
    setIsHydrated(true);
  }, []);

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

  // Guardar volumen en cookie cuando cambia
  useEffect(() => {
    setCookie("music_volume", volume.toString());
  }, [volume]);

  // Guardar estado de mute en cookie cuando cambia
  useEffect(() => {
    setCookie("music_muted", isMuted.toString());
  }, [isMuted]);

  // Cargar música automáticamente desde la API
  useEffect(() => {
    async function loadMusic() {
      try {
        const response = await fetch('/api/music');
        const data = await response.json();
        if (data.tracks && data.tracks.length > 0) {
          setTracks(data.tracks);
          // Seleccionar canción aleatoria
          const randomIndex = Math.floor(Math.random() * data.tracks.length);
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
            } else {
              console.error("Error al reproducir:", error);
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
    setCurrentTrackIndex(index);
  };

  // Siempre mostrar el reproductor, incluso sin canciones (para que sea visible)
  const currentTrack = tracks.length > 0 ? tracks[currentTrackIndex] : null;

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
            <span className="text-xs text-gray-400 truncate">
              {currentTrack ? currentTrack.displayName : "No music"}
            </span>
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

        {/* Panel expandible de selección de canciones */}
        {isExpanded && tracks.length > 0 && (
          <div className="max-h-[240px] overflow-y-auto border-b border-gray-700/50 w-[320px]">
            {tracks.map((track, index) => (
              <div
                key={track.path}
                className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                  index === currentTrackIndex
                    ? themeColors.highlightBg
                    : "hover:bg-gray-800/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => selectTrack(index)}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <Music size={14} className={index === currentTrackIndex ? themeColors.highlight : "text-gray-400"} />
                    <span className={`truncate ${index === currentTrackIndex ? themeColors.highlight : "text-gray-300"}`}>
                      {track.displayName}
                    </span>
                    {index === currentTrackIndex && isPlaying && (
                      <span className={`ml-auto ${themeColors.highlight}`}>♪</span>
                    )}
                  </button>
                  {track.link && (
                    <a
                      href={track.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex-shrink-0 p-1 text-gray-400 ${themeColors.iconHover} transition-colors`}
                      title="Ver en YouTube"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            ))}
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

          {/* Mensaje sin música */}
          {tracks.length === 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700/50">
              <p className="text-xs text-gray-500 text-center leading-relaxed">
                📁 Añade archivos MP3 a<br />
                <code className={`${themeColors.highlight}/70 text-[10px]`}>
                  /public/background_music/
                </code>
                <br />
                <span className="text-green-400/70">¡Se detectarán automáticamente!</span>
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
      `}</style>
    </div>
  );
}
