"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const TRACKS: string[] = [
  "/background_music/i must rest here a moment [IXsWr2CK4SI].mp3",
];

type BackgroundMusicProps = {
  volume?: number;
};

export function BackgroundMusic({ volume = 0.5 }: BackgroundMusicProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);

  const selectedTrack = useMemo(() => {
    if (TRACKS.length === 0) return null;
    const index = Math.floor(Math.random() * TRACKS.length);
    return TRACKS[index];
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !selectedTrack) return;

    audio.volume = volume;
    audio.loop = true;

    const tryPlay = async () => {
      try {
        setNeedsUserInteraction(false);
        await audio.play();
      } catch (error) {
        setNeedsUserInteraction(true);
      }
    };

    if (audio.readyState >= 2) {
      void tryPlay();
    } else {
      const canPlayHandler = () => {
        audio.removeEventListener("canplay", canPlayHandler);
        void tryPlay();
      };
      audio.addEventListener("canplay", canPlayHandler);
      return () => {
        audio.removeEventListener("canplay", canPlayHandler);
      };
    }
  }, [selectedTrack, volume]);

  const handleEnableAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      await audio.play();
      setNeedsUserInteraction(false);
    } catch (error) {
      setNeedsUserInteraction(true);
    }
  };

  if (!selectedTrack) {
    return null;
  }

  return (
    <>
      <audio ref={audioRef} src={selectedTrack} preload="auto" />
      {needsUserInteraction && (
        <button
          type="button"
          className="fixed bottom-6 right-6 z-[60] rounded-full bg-[#ef8e19] px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:scale-105"
          onClick={handleEnableAudio}
        >
          Activar música
        </button>
      )}
    </>
  );
}
