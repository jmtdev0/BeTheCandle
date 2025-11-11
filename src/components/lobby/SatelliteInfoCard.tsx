"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ExternalLink, Link as LinkIcon, Loader2, Bitcoin } from "lucide-react";
import { SatelliteUser } from "./InteractiveSphere3D";

interface SatelliteInfoCardProps {
  user: SatelliteUser | null;
  onClose: () => void;
  // screenPosition is accepted for backwards compatibility but will be ignored;
  // the card will appear at a fixed location (center vertically, slightly right)
  // and be draggable by the user.
  screenPosition?: { x: number; y: number } | null;
}

type PublicProfile = {
  display_name: string;
  preferred_name?: string | null;
  bio?: string | null;
  social_links?: { platform: string; url: string }[] | null;
  btc_address?: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function SatelliteInfoCard({ user, onClose }: SatelliteInfoCardProps) {
  // Move all hooks BEFORE the early return
  const DEFAULT_CARD_WIDTH = 380;
  const DEFAULT_CARD_HEIGHT = 360;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const pointerOffsetRef = useRef({ x: 0, y: 0 });

  const supabaseClient = useMemo<SupabaseClient | null>(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn("SatelliteInfoCard: Supabase credentials missing");
      return null;
    }
    return createClient(supabaseUrl, supabaseAnonKey);
  }, []);

  const getDimensions = () => {
    const width = containerRef.current?.offsetWidth ?? DEFAULT_CARD_WIDTH;
    const height = containerRef.current?.offsetHeight ?? DEFAULT_CARD_HEIGHT;
    return { width, height };
  };

  const [pos, setPos] = useState(() => ({ left: 0, top: 0 }));
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const profileLookupName = useMemo(() => {
    if (!user) return null;
    const candidate = user.profileDisplayName ?? user.displayName;
    if (!candidate) return null;
    const normalized = candidate.trim();
    if (!normalized) return null;
    return normalized;
  }, [user]);

  useEffect(() => {
    if (!profileLookupName || !supabaseClient) {
      setProfile(null);
      setProfileError(null);
      setLoadingProfile(false);
      return;
    }

    let isCancelled = false;
    const fetchProfile = async () => {
      setLoadingProfile(true);
      setProfileError(null);
      try {
        const { data, error } = await supabaseClient
          .from("user_profiles")
          .select("display_name, preferred_name, bio, social_links, btc_address")
          .eq("display_name", profileLookupName)
          .maybeSingle();

        if (isCancelled) return;

        if (error) {
          throw error;
        }

        setProfile(data ?? null);
      } catch (err) {
        if (isCancelled) return;
        console.error("SatelliteInfoCard: failed to fetch profile", err);
        setProfile(null);
        setProfileError("Profile details unavailable");
      } finally {
        if (!isCancelled) {
          setLoadingProfile(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isCancelled = true;
    };
  }, [profileLookupName, supabaseClient]);

  // initialize position on mount to center vertically and slightly right of center
  useEffect(() => {
    const calc = () => {
      if (typeof window === "undefined") return;
      // Position card to the right of center (approximately 60% from left)
      // This ensures the satellite remains visible on the left side
      const { width, height } = getDimensions();
      const left = Math.round(window.innerWidth * 0.60 - width / 2);
      const top = Math.round(window.innerHeight / 2 - height / 2);
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
  const { width, height } = getDimensions();
  // clamp to viewport with small margin
  const clampedLeft = Math.max(8, Math.min(newLeft, window.innerWidth - width - 8));
  const clampedTop = Math.max(8, Math.min(newTop, window.innerHeight - height - 8));
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
  const { width, height } = getDimensions();
  const clampedLeft = Math.max(8, Math.min(newLeft, window.innerWidth - width - 8));
  const clampedTop = Math.max(8, Math.min(newTop, window.innerHeight - height - 8));
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

  const preferredName = profile?.preferred_name?.trim() || null;
  const sanitizedBio = profile?.bio?.trim() || null;
  const socialLinks = Array.isArray(profile?.social_links)
    ? profile.social_links.filter((link) => link && link.platform && link.url)
    : [];
  const donationAddress = profile?.btc_address?.trim() || user.walletAddress || null;
  const headingName = preferredName || profile?.display_name || profileLookupName || user.displayName;
  const subtitleName = profile?.display_name || profileLookupName || user.profileDisplayName || user.displayName;
  const donateHref = donationAddress
    ? `/donate?address=${encodeURIComponent(donationAddress)}&name=${encodeURIComponent(headingName)}`
    : null;

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
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-white truncate">
                {headingName}
              </h3>
              <p className="text-xs text-orange-300 mt-0.5 truncate" title={subtitleName ?? undefined}>
                {subtitleName || "Platform user"}
              </p>
              {donationAddress && (
                <div className="mt-2 text-[11px] text-slate-200/80 font-mono truncate max-w-[220px]" title={donationAddress}>
                  {donationAddress}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {(loadingProfile || profileError) && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-400 flex items-center gap-2">
              {loadingProfile ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Fetching latest profile details…</span>
                </>
              ) : (
                <span>{profileError}</span>
              )}
            </div>
          )}

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

          {/* Bio */}
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Bio
            </div>
            <div className="bg-slate-800/45 rounded-lg border border-slate-700/50 mt-2 p-3">
              {sanitizedBio ? (
                <p className="text-sm leading-relaxed text-slate-200">
                  {sanitizedBio}
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  This user hasn’t shared a bio yet.
                </p>
              )}
            </div>
          </div>

          {/* Social Links */}
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Links
            </div>
            {socialLinks.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {socialLinks.map((link, index) => (
                  <li key={`${link.platform}-${index}`}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2 text-sm text-slate-100 hover:border-amber-400/40 hover:text-amber-100 transition"
                    >
                      <LinkIcon className="h-4 w-4 text-amber-300" />
                      <span className="font-medium truncate">{link.platform}</span>
                      <span className="text-xs text-slate-400 truncate">{link.url}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-500 ml-auto" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                No public links yet.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex flex-col gap-3">
          {donateHref ? (
            <a
              href={donateHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/15 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/30"
            >
              <Bitcoin className="h-4 w-4" />
              Donate BTC
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm font-semibold text-slate-400 opacity-70 cursor-not-allowed"
            >
              Donate BTC
            </button>
          )}
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
  style={{ position: "fixed", left: pos.left, top: pos.top, width: getDimensions().width, zIndex: 50 }}
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
