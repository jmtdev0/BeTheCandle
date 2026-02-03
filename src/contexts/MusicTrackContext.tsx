"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface MusicTrackContextValue {
  currentTrackName: string | null;
  currentTrackPath: string | null;
  isPlaying: boolean;
  currentTrackIndex: number;
  // Setter function for MusicPlayer to update the state
  setMusicTrackState: (state: Omit<MusicTrackContextValue, 'setMusicTrackState'>) => void;
}

const MusicTrackContext = createContext<MusicTrackContextValue | undefined>(undefined);

export function MusicTrackProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState({
    currentTrackName: null as string | null,
    currentTrackPath: null as string | null,
    isPlaying: false,
    currentTrackIndex: 0,
  });

  const setMusicTrackState = useCallback((newState: Omit<MusicTrackContextValue, 'setMusicTrackState'>) => {
    setState(newState);
  }, []);

  const value: MusicTrackContextValue = {
    ...state,
    setMusicTrackState,
  };

  return (
    <MusicTrackContext.Provider value={value}>
      {children}
    </MusicTrackContext.Provider>
  );
}

export function useMusicTrack() {
  const context = useContext(MusicTrackContext);
  // Return null values if context is not available (e.g., during SSR or outside provider)
  if (context === undefined) {
    return {
      currentTrackName: null,
      currentTrackPath: null,
      isPlaying: false,
      currentTrackIndex: 0,
      setMusicTrackState: () => {}, // no-op if outside provider
    };
  }
  return context;
}

export { MusicTrackContext };
