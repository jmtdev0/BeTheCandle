"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import ReCAPTCHA from "react-google-recaptcha";
import { useCommunityPot } from "@/hooks/useCommunityPot";
import PayoutStats from "@/components/community-pot/PayoutStats";
import InteractiveOrbs3D from "@/components/community-pot/InteractiveOrbs3D";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

interface LastPayoutData {
  id: string;
  status: string;
  amountUsdc: string;
  scheduledAt: string;
  completedAt: string;
  isTestnet: boolean;
  participantCount: number;
  maxParticipants: number;
  totalDistributed: string;
  perParticipantUsdc: string;
}

export default function CommunityPotPage() {
  const communityPot = useCommunityPot();
  const {
    week,
    participants,
    perParticipantAmountUsdc,
    countdown,
    loading,
    refreshing,
    error,
    viewerAddress,
    viewerHasCurrentSlot,
    joinCommunityPot,
    distributionWindowActive,
    distributionResumeAt,
    refreshIfStale,
  } = communityPot;

  const [polygonAddress, setPolygonAddress] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [hoveredParticipantId, setHoveredParticipantId] = useState<string | null>(null);
  const [distributionPauseSeconds, setDistributionPauseSeconds] = useState(0);
  const [infoVisible, setInfoVisible] = useState(false);
  const [infoHovering, setInfoHovering] = useState(false);
  const [rankingsVisible, setRankingsVisible] = useState(false);
  const [rankingsHovering, setRankingsHovering] = useState(false);
  const [joinButtonVisible, setJoinButtonVisible] = useState(false);
  const [joinButtonHovering, setJoinButtonHovering] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<"current" | "last">("current");
  const [lastPayout, setLastPayout] = useState<LastPayoutData | null>(null);
  const [lastPayoutLoading, setLastPayoutLoading] = useState(false);
  const [lastPayoutAttempted, setLastPayoutAttempted] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [showRequirements, setShowRequirements] = useState(true);
  const [showPlease, setShowPlease] = useState(false);
  const [mobileUIVisible, setMobileUIVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // Detect mobile/touch device
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

  // Handle tap on background: if UI visible, hide; if not, show
  const handleBackgroundTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isMobile) return;
    const target = (e as any).target as HTMLElement;
    // If tapping on interactive UI, ignore
    if (target.closest('button, a, input, [role="dialog"], .ui-panel')) return;
    // If controls are visible, hide them. If not visible, show them.
    setMobileUIVisible(prev => !prev);
  }, [isMobile]);

  // Notify global listeners (e.g., GlobalMusicPlayer) when mobile UI visibility changes
  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent('mobile-ui-visible', { detail: mobileUIVisible }));
    } catch (e) {
      // ignore in SSR or unsupported environments
    }
  }, [mobileUIVisible]);

  useEffect(() => {
    if (viewerAddress) {
      setPolygonAddress(viewerAddress);
    }
  }, [viewerAddress]);

  const participantCount = participants.length;


  useEffect(() => {
    if (distributionWindowActive) {
      setShowJoinModal(false);
    }
  }, [distributionWindowActive]);

  // Hover reveal for info panel (top-left corner) - expanded area
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const distanceFromLeft = e.clientX;
      const distanceFromTop = e.clientY;
      
      if (distanceFromLeft <= 450 && distanceFromTop <= 320) {
        setInfoVisible(true);
      } else if (!infoHovering && (distanceFromLeft > 540 || distanceFromTop > 420)) {
        setInfoVisible(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [infoHovering]);

  // Hover reveal for rankings (top-right corner)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const distanceFromRight = window.innerWidth - e.clientX;
      const distanceFromTop = e.clientY;
      
      if (distanceFromRight <= 100 && distanceFromTop <= 100) {
        setRankingsVisible(true);
      } else if (!rankingsHovering && (distanceFromRight > 200 || distanceFromTop > 200)) {
        setRankingsVisible(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [rankingsHovering]);

  // Hover reveal for join button (top area, near right)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const distanceFromRight = window.innerWidth - e.clientX;
      const distanceFromTop = e.clientY;
      
      // Area around the button position (top: 1.5rem, right: 92px)
      if (distanceFromRight >= 60 && distanceFromRight <= 320 && distanceFromTop <= 100) {
        setJoinButtonVisible(true);
      } else if (!joinButtonHovering && (distanceFromRight < 40 || distanceFromRight > 350 || distanceFromTop > 150)) {
        setJoinButtonVisible(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [joinButtonHovering]);

  // Refresh data when info panel becomes visible (if stale)
  useEffect(() => {
    if (infoVisible || infoHovering) {
      refreshIfStale(60_000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infoVisible, infoHovering]);

  // Load last payout data when switching to that tab
  const loadLastPayout = useCallback(async () => {
    setLastPayoutLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      // Don't filter by network - show the most recent completed payout regardless
      const { data, error } = await supabase.rpc("community_pot_get_last_completed_payout", {
        p_is_testnet: null,
      });
      if (error) {
        console.error("Error loading last payout:", error);
        setLastPayoutLoading(false);
        return;
      }
      if (data?.found && data?.payout) {
        setLastPayout(data.payout as LastPayoutData);
      } else {
        // No payout found, set to a sentinel to prevent re-fetching
        setLastPayout(null);
      }
    } catch (err) {
      console.error("Error loading last payout:", err);
    } finally {
      setLastPayoutLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeInfoTab === "last" && !lastPayoutAttempted && !lastPayoutLoading) {
      setLastPayoutAttempted(true);
      loadLastPayout();
    }
  }, [activeInfoTab, lastPayoutAttempted, lastPayoutLoading, loadLastPayout]);

  useEffect(() => {
    if (!distributionWindowActive || !distributionResumeAt) {
      setDistributionPauseSeconds(0);
      return;
    }
    const updateCountdown = () => {
      const delta = Math.max(0, Math.ceil((distributionResumeAt - Date.now()) / 1000));
      setDistributionPauseSeconds(delta);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [distributionWindowActive, distributionResumeAt]);

  const statusLabel = useMemo(() => {
    switch (week?.status) {
      case "paid":
        return "Paid";
      case "closed":
        return "Full";
      default:
        return "Open";
    }
  }, [week?.status]);

  const statusColor = useMemo(() => {
    switch (week?.status) {
      case "paid":
        return "bg-green-500/20 text-green-200 border border-green-500/40";
      case "closed":
        return "bg-yellow-500/20 text-yellow-100 border border-yellow-500/40";
      default:
        return "bg-[#2276cb]/20 text-[#2276cb] border border-[#2276cb]/40";
    }
  }, [week?.status]);

  const distributionLabel = useMemo(() => {
    if (!week) return "";
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Europe/Madrid",
    }).format(new Date(week.distributionAt));
  }, [week]);

  const hasOpenSpots = (week?.spotsRemaining ?? 0) > 0;
  const isPotFull = week ? week.spotsRemaining === 0 : false;
  const viewerCanEdit = viewerHasCurrentSlot;
  const weekStatus = week?.status;
  const disableJoinButton =
    isSubmitting ||
    loading ||
    !week ||
    (((weekStatus === "paid" || weekStatus === "closed") || isPotFull) && !viewerCanEdit);
  const buttonLabel = viewerCanEdit ? "Update address" : "Join the pot";

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
  };

  const handleJoin = async () => {
    if (!week) {
      setJoinError("Loading the next payout window. Please try again in a moment.");
      return;
    }

    const normalized = polygonAddress.trim().toLowerCase();
    if (!/^0x[0-9a-fA-F]{40}$/.test(normalized)) {
      setJoinError("Enter a valid Polygon address.");
      return;
    }

    if (week.status === "paid" && !viewerCanEdit) {
      setJoinError("This payout already went out.");
      return;
    }

    if (week.status === "closed" && !viewerCanEdit) {
      setJoinError("This week's slots are closed. Please come back after the payout.");
      return;
    }

    if (week.spotsRemaining === 0 && !viewerCanEdit) {
      setJoinError("The pot is already full for this week.");
      return;
    }

    // Check if address is already registered (unless updating own address)
    const existingParticipant = participants.find(
      p => p.polygonAddress.toLowerCase() === normalized
    );
    if (existingParticipant && !existingParticipant.isViewer) {
      setJoinError("This wallet address is already registered for this week's payout.");
      return;
    }

    // Verify reCAPTCHA token is present
    if (!recaptchaToken) {
      setJoinError("Please complete the reCAPTCHA verification.");
      return;
    }

    setJoinError(null);
    setIsSubmitting(true);
    try {
      // Verify address with server (POL balance check)
      const verifyResponse = await fetch("/api/community-pot/verify-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: normalized,
          recaptchaToken,
          isTestnet: week.isTestnet,
        }),
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResponse.ok || verifyResult.error) {
        setJoinError(verifyResult.error || "Verification failed. Please try again.");
        // Reset reCAPTCHA for retry
        recaptchaRef.current?.reset();
        setRecaptchaToken(null);
        setIsSubmitting(false);
        return;
      }

      // All verifications passed, proceed with joining (pass reCAPTCHA token for server-side validation)
      await joinCommunityPot(normalized, recaptchaToken);
      
      // Reset reCAPTCHA after successful join
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
      
      // Close modal and show success toast
      setShowJoinModal(false);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown";
      const friendly = mapJoinError(reason);
      setJoinError(friendly);
      // Reset reCAPTCHA on error
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine if UI should be visible (desktop hover OR mobile toggle)
  const shouldShowInfo = isMobile ? mobileUIVisible : (infoVisible || infoHovering);
  const shouldShowRankings = isMobile ? mobileUIVisible : (rankingsVisible || rankingsHovering);
  const shouldShowJoinButton = isMobile ? mobileUIVisible : (participantCount === 0 || joinButtonVisible || joinButtonHovering);

  return (
    <div 
      className="relative w-full h-screen overflow-hidden bg-gradient-to-b from-[#4a7ba7] via-[#87c4e8] to-[#daf3fe]"
      onClick={handleBackgroundTap}
      onTouchEnd={handleBackgroundTap}
    >
      {/* Mobile: hint removed per UX request */}

      {/* 3D Interactive Orbs */}
      {participantCount > 0 && (
        <InteractiveOrbs3D
          participants={participants}
          hoveredParticipantId={hoveredParticipantId}
          onHoverParticipant={setHoveredParticipantId}
        />
      )}

      {/* Payout Stats */}
      <PayoutStats 
        isVisible={shouldShowRankings}
        onHoverChange={setRankingsHovering}
      />

      {/* UI Overlay with hover reveal */}
      <motion.div 
        className="ui-panel absolute top-6 left-4 md:top-8 md:left-8 z-10 bg-black/60 backdrop-blur-md rounded-xl border border-[#2276cb]/40 w-[calc(100vw-2rem)] max-w-[385px] overflow-visible"
        initial={{ opacity: 0 }}
        animate={{ opacity: shouldShowInfo ? 1 : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{ pointerEvents: shouldShowInfo ? "auto" : "none" }}
        onPointerEnter={() => {
          if (!isMobile) {
            setInfoHovering(true);
            setInfoVisible(true);
          }
        }}
        onPointerLeave={() => !isMobile && setInfoHovering(false)}
      >
        {/* Tab bookmark on the right side - always interactive */}
        <div className="absolute -right-8 top-4 flex flex-col gap-1" style={{ pointerEvents: "auto" }}>
          <button
            onClick={() => {
              setActiveInfoTab("current");
              refreshIfStale(0); // Force refresh current data
            }}
            className={`w-8 h-16 rounded-r-lg text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer ${
              activeInfoTab === "current"
                ? "bg-[#2276cb] text-white"
                : "bg-black/40 text-white/60 hover:bg-black/60 hover:text-white"
            }`}
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            Current
          </button>
          <button
            onClick={() => {
              setActiveInfoTab("last");
              // Force reload last payout data
              loadLastPayout();
            }}
            className={`w-8 h-16 rounded-r-lg text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer ${
              activeInfoTab === "last"
                ? "bg-[#2276cb] text-white"
                : "bg-black/40 text-white/60 hover:bg-black/60 hover:text-white"
            }`}
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            Last
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">🌌 Community Pot</h1>
          </div>
          
          {activeInfoTab === "current" ? (
            <>
              {error && <p className="text-sm text-red-300">{error}</p>}
              <div className="space-y-3 text-white text-sm">
                <InfoRow label="Pool" value={week ? `${Number(week.amountUsdc).toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC` : "—"} />
                <InfoRow label="Next payout" value={distributionLabel || "—"} />
                <InfoRow label="Countdown" value={countdown.label || "—"} highlight />
                <InfoRow label="Participants" value={`${participantCount}/${week?.maxParticipants ?? 10}`} />
                <InfoRow label="Open slots" value={week ? Math.max(week.spotsRemaining, 0) : "—"} />
                <InfoRow label="Estimated share" value={perParticipantAmountUsdc ? `${perParticipantAmountUsdc} USDC` : "Depends on headcount"} />
                <InfoRow 
                  label="Payout wallet" 
                  value="0x3d8b...2b81" 
                  mono 
                  href={week?.isTestnet 
                    ? "https://amoy.polygonscan.com/address/0x3d8be5e1f679df91d86538bbc3ffe61e5ee22b81"
                    : "https://polygonscan.com/address/0x3d8be5e1f679df91d86538bbc3ffe61e5ee22b81"
                  }
                />
                <InfoRow label="Network" value={week?.isTestnet ? "Polygon Testnet" : "Polygon Mainnet"} />
              </div>
              {refreshing && (
                <div className="flex items-center gap-2">
                  <div className="animate-spin inline-block w-4 h-4 border-2 border-purple-200 border-t-transparent rounded-full" />
                  <p className="text-xs text-purple-200">Refreshing…</p>
                </div>
              )}
            </>
          ) : (
            <>
              {lastPayoutLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin inline-block w-6 h-6 border-2 border-[#2276cb] border-t-transparent rounded-full" />
                  <p className="ml-2 text-sm text-white/70">Loading...</p>
                </div>
              ) : lastPayout ? (
                <div className="space-y-3 text-white text-sm">
                  <div className="text-xs text-green-400 font-semibold uppercase tracking-wider mb-2">
                    ✓ Completed
                  </div>
                  <InfoRow label="Pool" value={`${Number(lastPayout.amountUsdc).toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`} />
                  <InfoRow 
                    label="Date" 
                    value={new Intl.DateTimeFormat("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Europe/Madrid",
                    }).format(new Date(lastPayout.completedAt))} 
                  />
                  <InfoRow label="Participants" value={`${lastPayout.participantCount}/${lastPayout.maxParticipants}`} />
                  <InfoRow label="Total distributed" value={`${Number(lastPayout.totalDistributed).toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`} />
                  <InfoRow label="Per participant" value={`${Number(lastPayout.perParticipantUsdc).toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`} highlight />
                  <InfoRow label="Network" value={lastPayout.isTestnet ? "Polygon Testnet" : "Polygon Mainnet"} />
                </div>
              ) : (
                <div className="text-center py-8 text-white/60 text-sm">
                  No completed payouts yet
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Join experience - centered when no participants, hover reveal otherwise */}
      <motion.div 
        className={`ui-panel fixed group ${participantCount === 0 ? 'inset-0 flex items-center justify-center pointer-events-none' : 'z-30'}`}
        style={participantCount > 0 ? { 
          top: isMobile ? '0.75rem' : '1.5rem', 
          right: isMobile ? '0.75rem' : '92px',
          left: isMobile ? '50%' : 'auto',
          transform: isMobile ? 'translateX(-50%)' : 'none'
        } : undefined}
        initial={{ opacity: 0 }}
        animate={{ opacity: shouldShowJoinButton ? 1 : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onPointerEnter={() => {
          if (participantCount > 0 && !isMobile) {
            setJoinButtonHovering(true);
            setJoinButtonVisible(true);
          }
        }}
        onPointerLeave={() => !isMobile && setJoinButtonHovering(false)}
      >
        <button
          onClick={() => setShowJoinModal(true)}
          aria-label={viewerHasCurrentSlot ? "Change your reserved wallet address" : "Reserve your slot in the community pot"}
          className={`bg-[#2276cb] text-white rounded-xl font-semibold hover:bg-[#1a5ba8] transition-colors shadow-lg shadow-[#2276cb]/40 pointer-events-auto focus:outline-none focus:ring-2 focus:ring-white/50 ${participantCount === 0 ? 'px-10 py-5 text-xl' : 'px-4 py-2 md:px-6 md:py-3 text-sm md:text-base'}`}
          style={{ pointerEvents: shouldShowJoinButton ? "auto" : "none" }}
        >
          {viewerHasCurrentSlot ? "Change address" : "Reserve your slot"}
        </button>
        {viewerHasCurrentSlot && (
          <div className="absolute top-full left-0 mt-2 w-48 px-3 py-2 text-xs text-white bg-black/90 border border-[#2276cb]/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-normal">
            <p>You have an address reserved for this week. Update it here if needed.</p>
          </div>
        )}
        {!viewerHasCurrentSlot && (
          <div className="absolute top-full left-0 mt-2 w-48 px-3 py-2 text-xs text-white bg-black/90 border border-[#2276cb]/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-normal">
            <p>Click to reserve your slot and enter your Polygon address.</p>
          </div>
        )}
      </motion.div>
      {showJoinModal && isPotFull && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm pointer-events-none" />
      )}
      {showJoinModal && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 pointer-events-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-modal-title"
        >
        <div className="pointer-events-auto w-full max-w-xl rounded-2xl border border-[#2276cb]/40 bg-black/80 backdrop-blur-2xl p-6 shadow-2xl shadow-[#2276cb]/40 space-y-5 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 id="join-modal-title" className="text-2xl font-bold text-white">{viewerHasCurrentSlot ? "Change your address" : "Reserve your slot"}</h2>
            <button
              onClick={() => setShowJoinModal(false)}
              className="text-[#2276cb] hover:text-white transition-colors text-2xl leading-none"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
          
          {/* Address input */}
          <div>
            <label htmlFor="polygon-address-input" className="block text-sm text-[#2276cb]/70 mb-2">Polygon address (USDC)</label>
            <input
              id="polygon-address-input"
              type="text"
              value={polygonAddress}
              onChange={(event) => setPolygonAddress(event.target.value)}
              placeholder="0x..."
              aria-describedby="polygon-address-help"
              autoComplete="off"
              spellCheck="false"
              className="w-full px-4 py-3 bg-black/60 border border-[#2276cb]/40 rounded-lg text-white focus:outline-none focus:border-[#2276cb] focus:ring-2 focus:ring-[#2276cb]/30 font-mono text-sm"
            />
            <p id="polygon-address-help" className="sr-only">Enter your Polygon wallet address starting with 0x</p>
          </div>

          {/* Guide link */}
          <a
            href="/community-pot/guide"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs text-[#2276cb] hover:text-white transition-colors underline underline-offset-2"
          >
            Need help? Read the full guide →
          </a>

          {/* Requirements section - Collapsible */}
          <div className="space-y-3">
            <button
              onClick={() => setShowRequirements(!showRequirements)}
              className="w-full flex items-center justify-between px-4 py-3 bg-blue-500/10 border border-[#2276cb]/40 rounded-lg hover:bg-blue-500/15 transition-colors"
              aria-expanded={showRequirements}
              aria-controls="requirements-content"
            >
              <h3 className="text-sm font-semibold text-white/80">Requirements</h3>
              <span className="text-white/60 text-lg">
                {showRequirements ? "−" : "+"}
              </span>
            </button>
            
            {showRequirements && (
              <div id="requirements-content" className="grid gap-2">
                <div className="flex items-start gap-3 rounded-lg border border-amber-400/20 bg-amber-500/5 p-3">
                  <span className="text-amber-400 mt-0.5" aria-hidden="true">🔗</span>
                  <div>
                    <p className="text-xs font-semibold text-amber-200">Polygon Network</p>
                    <p className="text-xs text-amber-100/70">Your address must be on the Polygon network. Import the USDC token contract to see your balance.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-3">
                  <span className="text-cyan-400 mt-0.5" aria-hidden="true">⛽</span>
                  <div>
                    <p className="text-xs font-semibold text-cyan-200">POL for Gas</p>
                    <p className="text-xs text-cyan-100/70">Your wallet must have some POL (native token) for gas fees to transfer or swap USDC later.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 rounded-lg border border-purple-400/20 bg-purple-500/5 p-3">
                  <span className="text-purple-400 mt-0.5" aria-hidden="true">👁️</span>
                  <div>
                    <p className="text-xs font-semibold text-purple-200">Privacy Notice</p>
                    <p className="text-xs text-purple-100/70">Your wallet address will be visible to other participants. Don&apos;t use an address you wish to keep private.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Please section - Collapsible */}
          <div className="space-y-3">
            <button
              onClick={() => setShowPlease(!showPlease)}
              className="w-full flex items-center justify-between px-4 py-3 bg-emerald-500/10 border border-emerald-400/40 rounded-lg hover:bg-emerald-500/15 transition-colors"
              aria-expanded={showPlease}
              aria-controls="please-content"
            >
              <h3 className="text-sm font-semibold text-white/80">Please 🙏</h3>
              <span className="text-white/60 text-lg">
                {showPlease ? "−" : "+"}
              </span>
            </button>
            
            {showPlease && (
              <div id="please-content" className="space-y-3">
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-4">
                  <p className="text-xs text-emerald-100 leading-relaxed mb-3">
                    If you enjoy this, consider donating. It helps me run larger and more frequent distributions. I&apos;d love to do daily payouts or 100 USDC rounds, and increase the number of participants!
                  </p>
                  <p className="text-xs text-emerald-100/90 leading-relaxed mb-3">
                    I&apos;m a solo developer working on this project. I&apos;ll try to join and participate honestly in the distributions. If the pot grows, we all win together.
                  </p>
                  
                  {/* Donation address with copy button */}
                  <div className="bg-black/40 rounded-lg p-3 mb-3">
                    <p className="text-xs text-emerald-200/70 mb-2">Donation address (ETH/Polygon):</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-emerald-100 font-mono break-all flex-1">
                        0x3d8be5e1f679df91d86538bbc3ffe61e5ee22b81
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText("0x3d8be5e1f679df91d86538bbc3ffe61e5ee22b81");
                        }}
                        className="shrink-0 px-2 py-1 bg-emerald-500/20 border border-emerald-400/40 rounded text-xs text-emerald-100 hover:bg-emerald-500/30 transition-colors"
                        aria-label="Copy address to clipboard"
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-emerald-100/80 mb-3">
                    🔍 All activity is fully transparent:{" "}
                    <a
                      href="https://polygonscan.com/address/0x3d8be5e1f679df91d86538bbc3ffe61e5ee22b81#tokentxns"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-300 hover:text-white underline underline-offset-2 transition-colors"
                    >
                      View on Polygonscan →
                    </a>
                  </p>
                  
                  <p className="text-xs text-emerald-200/60 italic">
                    ⚖️ Donations don&apos;t guarantee anything. They&apos;re voluntary support to keep the project running. I participate as a regular member, investing my own money like you do.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* reCAPTCHA - only show when address is entered */}
          {polygonAddress.trim() && (
            <div className="flex justify-center py-2">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={handleRecaptchaChange}
                theme="dark"
              />
            </div>
          )}
          
          {/* Error and status messages */}
          <div aria-live="polite" aria-atomic="true">
            {joinError && <p className="text-sm text-red-300 text-center" role="alert">{joinError}</p>}
          </div>
          {viewerCanEdit && (
            <p className="text-xs text-emerald-200 text-center">
              This browser already has a slot reserved for the current week. Submit a new address if you need to update it.
            </p>
          )}
          {isPotFull && !viewerCanEdit && (
            <p className="text-xs text-yellow-200 text-center">
              All slots are taken. Cookies prevent duplicate entries this week—check back after the Sunday payout.
            </p>
          )}
          
          {/* Submit button */}
          <button
            onClick={handleJoin}
            disabled={disableJoinButton || !recaptchaToken}
            aria-busy={isSubmitting}
            aria-disabled={disableJoinButton || !recaptchaToken}
            className="w-full px-6 py-3 bg-[#2276cb] text-white rounded-lg font-semibold hover:bg-[#1a5ba8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#2276cb]/50 focus:ring-offset-2 focus:ring-offset-black"
          >
            {isSubmitting ? "Verifying..." : buttonLabel}
          </button>
        </div>
        </div>
      )}
      
      {/* Success Toast */}
      {showSuccessToast && (
        <motion.div
          className="fixed bottom-8 left-1/2 z-[100] -translate-x-1/2"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 rounded-xl border border-emerald-400/40 bg-emerald-500/20 backdrop-blur-xl px-6 py-4 shadow-2xl shadow-emerald-500/20">
            <span className="text-2xl" role="img" aria-hidden="true">✅</span>
            <div>
              <p className="font-semibold text-emerald-100">Successfully joined!</p>
              <p className="text-sm text-emerald-200/80">Your address is now registered for this week&apos;s payout.</p>
            </div>
          </div>
        </motion.div>
      )}
      
      {distributionWindowActive && (
        <div className="absolute inset-0 z-[80] flex flex-col items-center justify-center bg-black/70 backdrop-blur-md text-white">
          <div className="max-w-lg rounded-2xl border border-white/20 bg-white/10 px-10 py-12 text-center shadow-2xl">
            <h2 className="text-3xl font-semibold mb-4">Reparto en curso</h2>
            <p className="text-sm text-white/80">
              Estamos ejecutando el reparto semanal del Community Pot. Esta pantalla volverá a estar activa en cuanto terminemos.
            </p>
            {distributionPauseSeconds > 0 && (
              <p className="mt-6 text-lg font-mono text-yellow-200">
                {distributionPauseSeconds}s restantes
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight, mono, href }: { label: string; value: string | number; highlight?: boolean; mono?: boolean; href?: string }) {
  const content = (
    <span className={`font-semibold text-right ${highlight ? "text-yellow-300 font-mono" : mono ? "text-white font-mono text-xs" : "text-white"}`}>
      {value}
    </span>
  );

  return (
    <div className="flex justify-between gap-4">
      <span className="text-purple-200 text-sm">{label}</span>
      {href ? (
        <a 
          href={href} 
          target="_blank" 
          rel="noreferrer"
          className="hover:text-[#2276cb] transition-colors hover:underline"
        >
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}

function mapJoinError(code: string) {
  switch (code) {
    case "invalid_address":
      return "Polygon address is invalid.";
    case "address_in_use":
      return "That wallet address is already registered for this week's payout.";
    case "payout_full":
      return "The pot is already full. All slots have been taken.";
    case "rate_limited":
      return "Too many requests. Please wait a minute before trying again.";
    case "recaptcha_failed":
      return "reCAPTCHA verification failed. Please try again.";
    case "recaptcha_required":
      return "Please complete the reCAPTCHA verification.";
    case "missing_recaptcha":
      return "reCAPTCHA token is required.";
    default:
      // Check if error message contains useful info
      if (code.toLowerCase().includes("full") || code.toLowerCase().includes("limit")) {
        return "The pot is already full for this week.";
      }
      if (code.toLowerCase().includes("duplicate") || code.toLowerCase().includes("already")) {
        return "That wallet address is already registered.";
      }
      return "We could not save your slot. Please try again.";
  }
}
