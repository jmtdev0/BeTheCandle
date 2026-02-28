"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface MusicTrackState {
  currentTrackName: string | null;
  currentTrackPath: string | null;
  isPlaying: boolean;
  currentTrackIndex: number;
  currentTrackHasVideo: boolean;
  currentTrackVideoHasAudio: boolean;
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
  currentVideoName: string | null;
  setCurrentVideoName: (name: string | null) => void;
  currentVideoLink: string | null;
  setCurrentVideoLink: (link: string | null) => void;
  forceSkipVideo: number;
  triggerSkipVideo: () => void;
  videoPlaybackUnlockRequest: number;
  triggerVideoPlaybackUnlock: () => void;
  requestedTrackSlug: string | null;
  setRequestedTrackSlug: (slug: string | null) => void;
}

const MusicTrackContext = createContext<MusicTrackContextValue | undefined>(undefined);

export function MusicTrackProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MusicTrackState>({
    currentTrackName: null,
    currentTrackPath: null,
    isPlaying: false,
    currentTrackIndex: 0,
    currentTrackHasVideo: false,
    currentTrackVideoHasAudio: false,
  });

  const [videoVolume, setVideoVolumeState] = useState(0.05);
  const [immersiveMode, setImmersiveModeState] = useState(false);
  const [videoEnabled, setVideoEnabledState] = useState(true);
  const [forceSkipToSkyScene, setForceSkipToSkyScene] = useState(0);
  const [currentVideoName, setCurrentVideoNameState] = useState<string | null>(null);
  const [currentVideoLink, setCurrentVideoLinkState] = useState<string | null>(null);
  const [forceSkipVideo, setForceSkipVideo] = useState(0);
  const [videoPlaybackUnlockRequest, setVideoPlaybackUnlockRequest] = useState(0);
  const [requestedTrackSlug, setRequestedTrackSlugState] = useState<string | null>(null);

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

  const setCurrentVideoName = useCallback((name: string | null) => {
    setCurrentVideoNameState(name);
  }, []);

  const setCurrentVideoLink = useCallback((link: string | null) => {
    setCurrentVideoLinkState(link);
  }, []);

  const triggerSkipVideo = useCallback(() => {
    setForceSkipVideo(prev => prev + 1);
  }, []);

  const triggerVideoPlaybackUnlock = useCallback(() => {
    setVideoPlaybackUnlockRequest(prev => prev + 1);
  }, []);

  const setRequestedTrackSlug = useCallback((slug: string | null) => {
    setRequestedTrackSlugState(slug);
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
    currentVideoName,
    setCurrentVideoName,
    currentVideoLink,
    setCurrentVideoLink,
    forceSkipVideo,
    triggerSkipVideo,
    videoPlaybackUnlockRequest,
    triggerVideoPlaybackUnlock,
    requestedTrackSlug,
    setRequestedTrackSlug,
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
      currentTrackVideoHasAudio: false,
      setMusicTrackState: () => {},
      videoVolume: 0.02,
      setVideoVolume: () => {},
      immersiveMode: false,
      setImmersiveMode: () => {},
      videoEnabled: true,
      setVideoEnabled: () => {},
      forceSkipToSkyScene: 0,
      triggerSkipToSkyScene: () => {},
      currentVideoName: null,
      setCurrentVideoName: () => {},
      currentVideoLink: null,
      setCurrentVideoLink: () => {},
      forceSkipVideo: 0,
      triggerSkipVideo: () => {},
      videoPlaybackUnlockRequest: 0,
      triggerVideoPlaybackUnlock: () => {},
      requestedTrackSlug: null,
      setRequestedTrackSlug: () => {},
    };
  }
  return context;
}

export { MusicTrackContext };
