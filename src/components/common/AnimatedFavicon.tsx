"use client";

import { useEffect } from "react";

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
  useEffect(() => {
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

      // Clear with transparent background instead of black
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const floatOffset = Math.sin(time * 0.004) * 6;
      const glowPulse = 0.6 + Math.sin(time * 0.006) * 0.4;

      // Remove solid background - keep canvas transparent
      // The glow will be the only "background" effect

      ctx.save();
      ctx.translate(32, 32 + floatOffset * 0.2);

      // Glow effect around the star (increased to match larger star)
      const starGradient = ctx.createRadialGradient(0, 0, 4, 0, 0, 26);
      starGradient.addColorStop(0, `rgba(255, 225, 160, ${0.55 + glowPulse * 0.2})`);
      starGradient.addColorStop(0.35, `rgba(255, 180, 70, ${0.5 + glowPulse * 0.3})`);
      starGradient.addColorStop(1, "rgba(255, 120, 30, 0)");
      ctx.fillStyle = starGradient;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();

      ctx.rotate((Math.sin(time * 0.0025) * Math.PI) / 16);

      // Draw star shape (larger size)
      ctx.fillStyle = "#f7931a";
      ctx.strokeStyle = "#ffbd6f";
      ctx.lineWidth = 2.5;
      const radius = 16;
      ctx.beginPath();
      for (let i = 0; i < 5; i += 1) {
        const angle = (i * Math.PI * 2) / 5;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        ctx.lineTo(x, y);
        const innerAngle = angle + Math.PI / 5;
        const innerRadius = radius * 0.42;
        ctx.lineTo(Math.cos(innerAngle) * innerRadius, Math.sin(innerAngle) * innerRadius);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      // Draw Bitcoin symbol (larger size to match star)
      ctx.fillStyle = "#ffe6bb";
      ctx.font = "bold 32px 'Segoe UI', Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("₿", 32, 30 + floatOffset * 0.1);

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
  }, []);

  return null;
}
