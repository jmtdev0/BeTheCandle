"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface MusicTrackState {
  currentTrackName: string | null;
  currentTrackPath: string | null;
  isPlaying: boolean;
  currentTrackIndex: number;
  currentTrackHasVideo: boolean;
}

interface MusicTrackContextValue extends MusicTrackState {
  setMusicTrackState: (state: MusicTrackState) => void;
  videoVolume: number;
  setVideoVolume: (volume: number) => void;
  immersiveMode: boolean;
  setImmersiveMode: (mode: boolean) => void;
  videoEnabled: boolean;
  setVideoEnabled: (enabled: boolean) => void;
  forceSkipToSkyScene: number;
  triggerSkipToSkyScene: () => void;
}

const MusicTrackContext = createContext<MusicTrackContextValue | undefined>(undefined);

export function MusicTrackProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MusicTrackState>({
    currentTrackName: null,
    currentTrackPath: null,
    isPlaying: false,
    currentTrackIndex: 0,
    currentTrackHasVideo: false,
  });

  const [videoVolume, setVideoVolumeState] = useState(0);
  const [immersiveMode, setImmersiveModeState] = useState(false);
  const [videoEnabled, setVideoEnabledState] = useState(true);
  const [forceSkipToSkyScene, setForceSkipToSkyScene] = useState(0);

  const setMusicTrackState = useCallback((newState: MusicTrackState) => {
    setState(newState);
  }, []);

  const setVideoVolume = useCallback((volume: number) => {
    setVideoVolumeState(Math.max(0, Math.min(1, volume)));
  }, []);

  const setImmersiveMode = useCallback((mode: boolean) => {
    setImmersiveModeState(mode);
  }, []);

  const setVideoEnabled = useCallback((enabled: boolean) => {
    setVideoEnabledState(enabled);
  }, []);

  const triggerSkipToSkyScene = useCallback(() => {
    setForceSkipToSkyScene(prev => prev + 1);
  }, []);

  const value: MusicTrackContextValue = {
    ...state,
    setMusicTrackState,
    videoVolume,
    setVideoVolume,
    immersiveMode,
    setImmersiveMode,
    videoEnabled,
    setVideoEnabled,
    forceSkipToSkyScene,
    triggerSkipToSkyScene,
  };

  return (
    <MusicTrackContext.Provider value={value}>
      {children}
    </MusicTrackContext.Provider>
  );
}

export function useMusicTrack() {
  const context = useContext(MusicTrackContext);
  if (context === undefined) {
    return {
      currentTrackName: null,
      currentTrackPath: null,
      isPlaying: false,
      currentTrackIndex: 0,
      currentTrackHasVideo: false,
      setMusicTrackState: () => {},
      videoVolume: 0,
      setVideoVolume: () => {},
      immersiveMode: false,
      setImmersiveMode: () => {},
      videoEnabled: true,
      setVideoEnabled: () => {},
      forceSkipToSkyScene: 0,
      triggerSkipToSkyScene: () => {},
    };
  }
  return context;
}

export { MusicTrackContext };
