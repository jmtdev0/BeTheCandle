"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMusicTrack } from "@/contexts/MusicTrackContext";
import VideoBackgroundManager from "./VideoBackgroundManager";

interface TeardropsVideoBackgroundProps {
  isEnabled?: boolean;
}

export default function TeardropsVideoBackground({ isEnabled = true }: TeardropsVideoBackgroundProps) {
  const { currentTrackName } = useMusicTrack();

  // Check if current track is "Another Day in Paradise" (only song with video files currently)
  const isParadiseSong = currentTrackName?.includes("Another Day in Paradise") ?? false;

  // Show videos when Paradise is playing and videos are enabled (works on all devices including mobile)
  const shouldShow = isParadiseSong && isEnabled;

  useEffect(() => {
    if (isParadiseSong) {
      console.log(`[TeardropsVideoBackground] State update:`, {
        currentTrackName,
        isParadiseSong,
        isEnabled,
        shouldShow
      });
    }
  }, [currentTrackName, isParadiseSong, isEnabled, shouldShow]);

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 3.5, ease: "easeInOut" }}
        >
          <VideoBackgroundManager />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
