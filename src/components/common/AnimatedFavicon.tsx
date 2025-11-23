"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function ensureFaviconLink(): HTMLLinkElement | null {
  if (typeof document === "undefined") return null;
  const existing = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
  if (existing) {
    return existing;
  }
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/png";
  document.head.appendChild(link);
  return link;
}

export default function AnimatedFavicon() {
  const pathname = usePathname();
  const isCommunityPot = pathname === "/community-pot";
  const isLobby = pathname === "/lobby";

  useEffect(() => {
    // Update page title based on route
    if (typeof document !== "undefined") {
      if (isCommunityPot) {
        document.title = "Community Pot - Be The Candle";
      } else if (isLobby) {
        document.title = "Lobby - Be The Candle";
      } else {
        document.title = "Be The Candle";
      }
    }

    const link = ensureFaviconLink();
    if (!link) return () => undefined;

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return () => undefined;

    let rafId = 0;
    let lastFrameTime = 0;
    let lastHref = "";

    const drawFrame = (time: number) => {
      if (time - lastFrameTime < 80) {
        rafId = requestAnimationFrame(drawFrame);
        return;
      }
      lastFrameTime = time;

      // Clear with transparent background
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const floatOffset = Math.sin(time * 0.004) * 6;
      const glowPulse = 0.6 + Math.sin(time * 0.006) * 0.4;

      // Define colors based on route
      const orbColor = isCommunityPot ? "#7fb3ff" : "#f7931a";
      const glowColor1 = isCommunityPot 
        ? `rgba(127, 179, 255, ${0.8 + glowPulse * 0.2})`
        : `rgba(255, 225, 160, ${0.8 + glowPulse * 0.2})`;
      const glowColor2 = isCommunityPot
        ? `rgba(100, 150, 255, ${0.7 + glowPulse * 0.3})`
        : `rgba(255, 180, 70, ${0.7 + glowPulse * 0.3})`;
      const glowColor3 = isCommunityPot
        ? "rgba(70, 120, 255, 0.1)"
        : "rgba(255, 120, 30, 0.1)";

      ctx.save();
      ctx.translate(32, 32 + floatOffset * 0.2);

      // Glow effect around the orb
      const orbGradient = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
      orbGradient.addColorStop(0, glowColor1);
      orbGradient.addColorStop(0.35, glowColor2);
      orbGradient.addColorStop(1, glowColor3);
      ctx.fillStyle = orbGradient;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fill();

      // Draw floating orb (sphere)
      const sphereGradient = ctx.createRadialGradient(-7.5, -7.5, 2.5, 0, 0, 22.5);
      sphereGradient.addColorStop(0, isCommunityPot ? "#a8d4ff" : "#ffbd6f");
      sphereGradient.addColorStop(0.5, orbColor);
      sphereGradient.addColorStop(1, isCommunityPot ? "#5b9fff" : "#f7931a");
      
      ctx.fillStyle = sphereGradient;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      const href = canvas.toDataURL("image/png");
      if (href !== lastHref) {
        link.href = href;
        lastHref = href;
      }

      rafId = requestAnimationFrame(drawFrame);
    };

    rafId = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [pathname, isCommunityPot, isLobby]);

  return null;
}
