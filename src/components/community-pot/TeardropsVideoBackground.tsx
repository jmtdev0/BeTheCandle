"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMusicTrack } from "@/contexts/MusicTrackContext";
import VideoBackgroundManager from "./VideoBackgroundManager";

// Hook to detect mobile devices
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isTouchDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

interface TeardropsVideoBackgroundProps {
  isEnabled?: boolean;
}

export default function TeardropsVideoBackground({ isEnabled = true }: TeardropsVideoBackgroundProps) {
  const { currentTrackName } = useMusicTrack();
  const isMobile = useIsMobile();

  // Check if current track is "Another Day in Paradise"
  const isParadiseSong = currentTrackName?.includes("Another Day in Paradise") ?? false;

  // Should show: Paradise is playing AND not on mobile AND videos enabled
  const shouldShow = isParadiseSong && !isMobile && isEnabled;

  useEffect(() => {
    if (isParadiseSong) {
      console.log(`[TeardropsVideoBackground] State update:`, {
        currentTrackName,
        isParadiseSong,
        isMobile,
        isEnabled,
        shouldShow
      });
    }
  }, [currentTrackName, isParadiseSong, isMobile, isEnabled, shouldShow]);

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
