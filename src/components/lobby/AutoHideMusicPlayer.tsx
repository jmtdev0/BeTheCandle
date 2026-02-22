"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import MusicPlayer from "../common/MusicPlayer";

const CLICK_LOCK_MS = 3000;

export default function AutoHideMusicPlayer() {
  const [isVisible, setIsVisible] = useState(false);
  // When > 0, the panel is force-visible regardless of mouse position
  const lockUntilRef = useRef(0);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const distanceFromRight = window.innerWidth - e.clientX;
      const distanceFromBottom = window.innerHeight - e.clientY;

      if (distanceFromRight <= 150 && distanceFromBottom <= 150) {
        setIsVisible(true);
      } else if (distanceFromRight > 250 || distanceFromBottom > 250) {
        if (Date.now() < lockUntilRef.current) return;
        setIsVisible(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Any click inside the panel force-shows it for CLICK_LOCK_MS,
  // even if the cursor leaves the hover zone entirely.
  const handleInteraction = useCallback(() => {
    lockUntilRef.current = Date.now() + CLICK_LOCK_MS;
    setIsVisible(true);

    // Schedule a deferred hide check after the lock expires
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      lockTimerRef.current = null;
      // After the lock expires the mousemove handler takes over again.
      // No-op here: next mousemove outside the zone will hide the panel.
    }, CLICK_LOCK_MS);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, []);

  return (
    <motion.div
      className="pointer-events-none absolute bottom-6 right-6 z-[60]"
      initial={{ opacity: 0, scale: 1 }}
      animate={{
        opacity: isVisible ? 1 : 0,
        scale: isVisible ? 1 : 0.98,
      }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      style={{ pointerEvents: isVisible ? "auto" : "none" }}
      onPointerDown={handleInteraction}
    >
      <MusicPlayer />
    </motion.div>
  );
}
