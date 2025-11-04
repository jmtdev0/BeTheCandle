"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import MusicPlayer from "../common/MusicPlayer";

export default function AutoHideMusicPlayer() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Show when mouse is near bottom-right corner (within 150px from right, 150px from bottom)
      const distanceFromRight = window.innerWidth - e.clientX;
      const distanceFromBottom = window.innerHeight - e.clientY;
      
      if (distanceFromRight <= 150 && distanceFromBottom <= 150) {
        setIsVisible(true);
      } else if (distanceFromRight > 250 || distanceFromBottom > 250) {
        setIsVisible(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
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
    >
      <MusicPlayer />
    </motion.div>
  );
}
