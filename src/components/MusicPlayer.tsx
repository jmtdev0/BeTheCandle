"use client";

import React, { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Music, ChevronDown, ChevronUp, Minimize2, Maximize2 } from "lucide-react";

interface Track {
  name: string;
  path: string;
  displayName: string;
}

interface MusicPlayerProps {
  tracks?: Track[];
}

export default function MusicPlayer({ tracks: initialTracks = [] }: MusicPlayerProps) {
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3); // 30% volumen inicial
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousVolumeRef = useRef(0.3);
  const hasAutoPlayedRef = useRef(false);

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

  // Inicializar y manejar cambios de audio
  useEffect(() => {
    if (tracks.length === 0) return;

    // Crear audio si no existe
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
      audioRef.current.loop = true;
      
      // Event listeners
      audioRef.current.addEventListener("ended", handleTrackEnd);
      
      // Listener para cuando el audio está listo para reproducirse
      audioRef.current.addEventListener("canplaythrough", () => {
        if (!hasAutoPlayedRef.current && audioRef.current) {
          hasAutoPlayedRef.current = true;
          // Intentar auto-play
          audioRef.current.play()
            .then(() => {
              setIsPlaying(true);
            })
            .catch((error) => {
              // Auto-play bloqueado, esperar interacción del usuario
              console.log("Auto-play bloqueado. Haz click en play para iniciar.", error);
              setIsPlaying(false);
            });
        }
      });
    }

    // Actualizar la fuente de audio
    if (audioRef.current.src !== tracks[currentTrackIndex].path) {
      const wasPlaying = isPlaying;
      audioRef.current.src = tracks[currentTrackIndex].path;
      audioRef.current.volume = isMuted ? 0 : volume;
      
      if (wasPlaying) {
        // Esperar a que se cargue antes de reproducir
        audioRef.current.load();
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((error) => {
            console.error("Error al reproducir:", error);
            setIsPlaying(false);
          });
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener("ended", handleTrackEnd);
      }
    };
  }, [tracks, currentTrackIndex]);

  // Actualizar volumen cuando cambia
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleTrackEnd = () => {
    // Pasar a la siguiente canción automáticamente
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    setCurrentTrackIndex(nextIndex);
  };

  const togglePlay = () => {
    if (!audioRef.current || tracks.length === 0) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
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
    setIsExpanded(false);
  };

  // Siempre mostrar el reproductor, incluso sin canciones (para que sea visible)
  const currentTrack = tracks.length > 0 ? tracks[currentTrackIndex] : null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700/50 overflow-hidden transition-all duration-300">
        {/* Barra superior colapsable */}
        <div className="flex items-center justify-between p-3 border-b border-gray-700/50 bg-gray-800/50">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Music size={16} className="text-orange-400 flex-shrink-0" />
            <span className="text-xs text-gray-400 truncate">
              {isCollapsed ? "Reproductor" : (currentTrack ? currentTrack.displayName : "Sin música")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Botón expandir lista (solo si hay múltiples canciones y no está colapsado) */}
            {!isCollapsed && tracks.length > 1 && (
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
            {/* Botón colapsar/expandir */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 hover:bg-gray-700/50 rounded transition-colors"
              title={isCollapsed ? "Expandir reproductor" : "Colapsar reproductor"}
            >
              {isCollapsed ? (
                <Maximize2 size={14} className="text-gray-400" />
              ) : (
                <Minimize2 size={14} className="text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Panel expandible de selección de canciones */}
        {!isCollapsed && isExpanded && tracks.length > 0 && (
          <div className="max-h-64 overflow-y-auto border-b border-gray-700/50">
            {tracks.map((track, index) => (
              <button
                key={track.path}
                onClick={() => selectTrack(index)}
                className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-800/50 transition-colors ${
                  index === currentTrackIndex
                    ? "bg-orange-500/20 text-orange-400"
                    : "text-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Music size={14} />
                  <span className="truncate">{track.displayName}</span>
                  {index === currentTrackIndex && isPlaying && (
                    <span className="ml-auto text-orange-400">♪</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Panel principal - solo visible si no está colapsado */}
        {!isCollapsed && (
        <div className="p-4 min-w-[280px]">
          {/* Controles de reproducción y volumen */}
          <div className="flex items-center gap-3">
            {/* Botón Play/Pause - deshabilitado si no hay canciones */}
            <button
              onClick={togglePlay}
              disabled={tracks.length === 0}
              className={`flex-shrink-0 w-10 h-10 rounded-full transition-colors flex items-center justify-center text-white ${
                tracks.length === 0 
                  ? "bg-gray-700 cursor-not-allowed opacity-50" 
                  : "bg-orange-500 hover:bg-orange-600"
              }`}
              title={tracks.length === 0 ? "Sin música disponible" : (isPlaying ? "Pausar" : "Reproducir")}
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
                className="flex-shrink-0 text-gray-400 hover:text-orange-400 transition-colors"
                title={isMuted ? "Activar sonido" : "Silenciar"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={20} />
                ) : (
                  <Volume2 size={20} />
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
                  background: `linear-gradient(to right, #f7931a ${
                    (isMuted ? 0 : volume) * 100
                  }%, #374151 ${(isMuted ? 0 : volume) * 100}%)`,
                }}
              />

              {/* Porcentaje de volumen */}
              <span className="flex-shrink-0 text-xs text-gray-400 w-8 text-right">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>
          </div>

          {/* Indicador de cantidad de canciones o mensaje sin música */}
          {tracks.length > 1 ? (
            <div className="mt-2 text-xs text-gray-500 text-center">
              {currentTrackIndex + 1} / {tracks.length}
            </div>
          ) : tracks.length === 0 ? (
            <div className="mt-3 pt-3 border-t border-gray-700/50">
              <p className="text-xs text-gray-500 text-center leading-relaxed">
                📁 Añade archivos MP3 a<br />
                <code className="text-orange-400/70 text-[10px]">
                  /public/background_music/
                </code>
                <br />
                <span className="text-green-400/70">¡Se detectarán automáticamente!</span>
              </p>
            </div>
          ) : null}
        </div>
        )}
      </div>

      {/* Estilos para el slider */}
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #f7931a;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .slider-thumb::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #f7931a;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .slider-thumb::-webkit-slider-thumb:hover {
          background: #ff9f2e;
        }

        .slider-thumb::-moz-range-thumb:hover {
          background: #ff9f2e;
        }
      `}</style>
    </div>
  );
}
