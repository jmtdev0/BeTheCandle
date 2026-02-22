"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import MusicPlayer from "../common/MusicPlayer";

export default function AutoHideMusicPlayer() {
  const [isVisible, setIsVisible] = useState(false);
  // Timestamp until which the panel must stay visible (click lock)
  const lockUntilRef = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const distanceFromRight = window.innerWidth - e.clientX;
      const distanceFromBottom = window.innerHeight - e.clientY;

      if (distanceFromRight <= 150 && distanceFromBottom <= 150) {
        setIsVisible(true);
      } else if (distanceFromRight > 250 || distanceFromBottom > 250) {
        // Don't hide while the click lock is active
        if (Date.now() < lockUntilRef.current) return;
        setIsVisible(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Any click inside the panel keeps it visible for 2 seconds
  const handleInteraction = useCallback(() => {
    lockUntilRef.current = Date.now() + 2000;
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
