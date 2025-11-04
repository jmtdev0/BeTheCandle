"use client";

import React, { useEffect, useRef, useState } from "react";
import { SatelliteUser } from "./InteractiveSphere3D";

interface SatelliteInfoCardProps {
  user: SatelliteUser | null;
  onClose: () => void;
  // screenPosition is accepted for backwards compatibility but will be ignored;
  // the card will appear at a fixed location (center vertically, slightly right)
  // and be draggable by the user.
  screenPosition?: { x: number; y: number } | null;
}

export default function SatelliteInfoCard({ user, onClose }: SatelliteInfoCardProps) {
  // Move all hooks BEFORE the early return
  const cardWidth = 360;
  const cardHeight = 240;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const pointerOffsetRef = useRef({ x: 0, y: 0 });

  const [pos, setPos] = useState(() => ({ left: 0, top: 0 }));

  // initialize position on mount to center vertically and slightly right of center
  useEffect(() => {
    const calc = () => {
      if (typeof window === "undefined") return;
      // Shift a bit more to the right by default (user requested slightly further right)
      const left = Math.round(window.innerWidth * 0.62 - cardWidth / 2);
      const top = Math.round(window.innerHeight / 2 - cardHeight / 2);
      setPos({ left, top });
    };
    calc();
    // update on resize so card stays sensible
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  // Pointer handlers to make the card draggable
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      const newLeft = Math.round(e.clientX - pointerOffsetRef.current.x);
      const newTop = Math.round(e.clientY - pointerOffsetRef.current.y);
      // clamp to viewport with small margin
      const clampedLeft = Math.max(8, Math.min(newLeft, window.innerWidth - cardWidth - 8));
      const clampedTop = Math.max(8, Math.min(newTop, window.innerHeight - cardHeight - 8));
      setPos({ left: clampedLeft, top: clampedTop });
    };

    const onPointerUp = () => {
      draggingRef.current = false;
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    // attach listeners on mount; they'll be removed when pointerup fires
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const offsetX = e.clientX - (rect?.left ?? 0);
    const offsetY = e.clientY - (rect?.top ?? 0);
    pointerOffsetRef.current = { x: offsetX, y: offsetY };
    draggingRef.current = true;
    // attach global listeners
    const onPointerMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      ev.preventDefault();
      const newLeft = Math.round(ev.clientX - pointerOffsetRef.current.x);
      const newTop = Math.round(ev.clientY - pointerOffsetRef.current.y);
      const clampedLeft = Math.max(8, Math.min(newLeft, window.innerWidth - cardWidth - 8));
      const clampedTop = Math.max(8, Math.min(newTop, window.innerHeight - cardHeight - 8));
      setPos({ left: clampedLeft, top: clampedTop });
    };

    const onPointerUp = () => {
      draggingRef.current = false;
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // NOW check if user is null after all hooks
  if (!user) return null;

  // NOTE: The card can be rendered as a small positioned overlay next to the satellite
  // if screenPosition is provided. Otherwise fall back to centered modal behavior.
  const card = (
    <div className="relative max-w-md w-full pointer-events-auto">
      {/* Card container with glassmorphism effect */}
      <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
        {/* Header with close button */}
        <div className="relative bg-gradient-to-r from-orange-500/20 to-amber-500/20 p-4 border-b border-slate-700/50">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>

          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
              {user.avatar || user.displayName.charAt(0).toUpperCase()}
            </div>

            {/* User name */}
            <div>
              <h3 className="text-lg font-bold text-white">
                {user.displayName}
              </h3>
                      <p className="text-xs text-orange-300 mt-0.5">
                        Platform User
                      </p>
                      {/* Wallet / donation address (optional) */}
                      {user.walletAddress ? (
                        <div className="mt-1 text-xs text-slate-300 flex items-center gap-2">
                          <code className="font-mono text-xs truncate max-w-[220px]">{user.walletAddress}</code>
                        </div>
                      ) : null}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Current BTC holdings */}
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Estimated Holdings
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 mt-2">
              <p className="text-lg font-bold text-orange-400">
                {user.currentBTC}
              </p>
            </div>
          </div>

          {/* Goal */}
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Goal
            </div>
            <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-lg p-3 border border-orange-500/30 mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-orange-300">
                  {user.goalBTC}
                </span>
                <span className="text-xs text-slate-400">BTC</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>Active satellite in orbit</span>
          </div>
        </div>
      </div>
    </div>
  );

  // No fullscreen backdrop per request; keep close button on the card.
  return (
    <div>
      {/* Draggable card container */}
      <div
        ref={containerRef}
        style={{ position: "fixed", left: pos.left, top: pos.top, width: cardWidth, zIndex: 50 }}
        className="pointer-events-auto"
      >
        {/* Make header draggable */}
        <div onPointerDown={onHeaderPointerDown} style={{ touchAction: 'none' }}>
          {card}
        </div>
      </div>
    </div>
  );
}
