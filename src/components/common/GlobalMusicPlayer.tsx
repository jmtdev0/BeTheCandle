"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import MusicPlayer from "./MusicPlayer";

export default function GlobalMusicPlayer() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const pathname = usePathname();
  const playerRef = useRef<HTMLDivElement | null>(null);

  // Only show music player on lobby and community-pot pages
  const shouldShowPlayer = pathname === "/lobby" || pathname === "/community-pot";

  useEffect(() => {
    if (!shouldShowPlayer) {
      setIsVisible(false);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Show when mouse is near bottom-right corner (within 150px from right, 150px from bottom)
      const distanceFromRight = window.innerWidth - e.clientX;
      const distanceFromBottom = window.innerHeight - e.clientY;
      
      if (distanceFromRight <= 150 && distanceFromBottom <= 150) {
        setIsVisible(true);
      } else if (!isHovering && (distanceFromRight > 250 || distanceFromBottom > 250)) {
        setIsVisible(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [shouldShowPlayer, isHovering]);

  if (!shouldShowPlayer) {
    return null;
  }

  return (
    <motion.div
      ref={playerRef}
      className="pointer-events-none fixed bottom-6 right-6 z-[60]"
      initial={{ opacity: 0 }}
      animate={{
        opacity: isVisible || isHovering ? 1 : 0,
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{
        pointerEvents: isVisible || isHovering ? "auto" : "none",
      }}
      onPointerEnter={() => {
        setIsHovering(true);
        setIsVisible(true);
      }}
      onPointerLeave={() => {
        setIsHovering(false);
      }}
    >
      <MusicPlayer />
    </motion.div>
  );
}
