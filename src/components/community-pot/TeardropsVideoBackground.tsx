"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMusicTrack } from "@/contexts/MusicTrackContext";
import VideoBackgroundManager from "./VideoBackgroundManager";

interface TeardropsVideoBackgroundProps {
  isEnabled?: boolean;
}

export default function TeardropsVideoBackground({ isEnabled = true }: TeardropsVideoBackgroundProps) {
  const { currentTrackName, currentTrackHasVideo } = useMusicTrack();

  // Show videos when the current track has videos and videos are enabled (works on all devices including mobile)
  const shouldShow = currentTrackHasVideo && isEnabled;

  useEffect(() => {
    if (currentTrackHasVideo) {
      console.log(`[TeardropsVideoBackground] State update:`, {
        currentTrackName,
        currentTrackHasVideo,
        isEnabled,
        shouldShow
      });
    }
  }, [currentTrackName, currentTrackHasVideo, isEnabled, shouldShow]);

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          key={currentTrackName}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 3.5, ease: "easeInOut" }}
        >
          <VideoBackgroundManager trackName={currentTrackName ?? undefined} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
