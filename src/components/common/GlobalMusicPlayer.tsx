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
  const shouldAutoHide = pathname === "/lobby" || pathname === "/community-pot";
  const musicTheme = pathname === "/community-pot" ? "blue" : "orange";

  useEffect(() => {
    if (!shouldShowPlayer) {
      setIsVisible(false);
      return;
    }

    if (!shouldAutoHide) {
      setIsVisible(true);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
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
  }, [shouldShowPlayer, shouldAutoHide, isHovering]);

  // Listen for mobile UI visibility events so the player can appear when
  // mobile controls are toggled visible by the community-pot page.
  useEffect(() => {
    const handleMobileUI = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail as boolean | undefined;
        const isSmall = typeof window !== "undefined" && window.innerWidth <= 768;
        if (!isSmall) return;
        if (detail) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener("mobile-ui-visible", handleMobileUI as EventListener);
    return () => window.removeEventListener("mobile-ui-visible", handleMobileUI as EventListener);
  }, []);

  if (!shouldShowPlayer) {
    return null;
  }

  const pointerActive = !shouldAutoHide || isVisible || isHovering;
  const opacity = shouldAutoHide ? (isVisible || isHovering ? 1 : 0) : 1;

  return (
    <motion.div
      ref={playerRef}
      className="fixed bottom-6 right-6 z-[60]"
      initial={{ opacity: 0 }}
      animate={{ opacity }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{ pointerEvents: pointerActive ? "auto" : "none" }}
      onPointerEnter={shouldAutoHide ? () => {
        setIsHovering(true);
        setIsVisible(true);
      } : undefined}
      onPointerLeave={shouldAutoHide ? () => {
        setIsHovering(false);
      } : undefined}
    >
      <MusicPlayer theme={musicTheme} />
    </motion.div>
  );
}
