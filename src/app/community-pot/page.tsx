"use client";

import React, { useState, useEffect, useMemo } from "react";
import InfoPopup from "@/components/common/InfoPopup";
import { useCommunityPot } from "@/hooks/useCommunityPot";
import PayoutStats from "@/components/community-pot/PayoutStats";
import InteractiveOrbs3D from "@/components/community-pot/InteractiveOrbs3D";

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
  } = communityPot;

  const [polygonAddress, setPolygonAddress] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [hoveredParticipantId, setHoveredParticipantId] = useState<string | null>(null);
  const [distributionPauseSeconds, setDistributionPauseSeconds] = useState(0);

  useEffect(() => {
    if (viewerAddress) {
      setPolygonAddress(viewerAddress);
    }
  }, [viewerAddress]);

  const participantCount = participants.length;

  useEffect(() => {
    if (distributionWindowActive) {
      setShowJoinModal(false);
      return;
    }
    if (participantCount === 0) {
      setShowJoinModal(true);
    } else {
      setShowJoinModal(false);
    }
  }, [participantCount, distributionWindowActive]);

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
  const walletGuideUrl =
    "https://support.metamask.io/start/creating-a-new-wallet";

  const handleJoin = async () => {
    if (!week) {
      setJoinError("Loading the next payout window. Please try again in a moment.");
      return;
    }

    const normalized = polygonAddress.trim();
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

    setJoinError(null);
    setIsSubmitting(true);
    try {
      await joinCommunityPot(normalized);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown";
      const friendly = mapJoinError(reason);
      setJoinError(friendly);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-b from-[#4a7ba7] via-[#87c4e8] to-[#daf3fe]">

      {/* 3D Interactive Orbs */}
      {participantCount > 0 && (
        <InteractiveOrbs3D
          participants={participants}
          hoveredParticipantId={hoveredParticipantId}
          onHoverParticipant={setHoveredParticipantId}
        />
      )}

      {/* Info Popup */}
      <InfoPopup
        title="Community Pot"
        content={`Welcome to the Community Pot: a USDC pool on Polygon for our weekly supporters.

    Each week, we open up to 10 slots. Drop a valid Polygon address to reserve one and every active wallet receives the same share when we execute the payout Sunday at 4:30 PM CET.`}
      />

      {/* Payout Stats */}
      <PayoutStats />

      {/* UI Overlay - pointer-events-none en el contenedor */}
      <div className="absolute top-8 left-8 z-10 pointer-events-auto bg-black/60 backdrop-blur-md p-6 rounded-xl border border-[#2276cb]/40 space-y-4 w-[385px]">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">🌌 Community Pot</h1>
        </div>
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
      </div>

      {/* Join experience */}
      {participantCount > 0 && (
        <div className="fixed z-30 group" style={{ top: '1.5rem', right: '92px' }}>
          <button
            onClick={() => setShowJoinModal(true)}
            className="px-6 py-3 bg-[#2276cb] text-white rounded-xl font-semibold hover:bg-[#1a5ba8] transition-colors shadow-lg shadow-[#2276cb]/40"
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
        </div>
      )}
      {showJoinModal && isPotFull && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm pointer-events-none" />
      )}
      {showJoinModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-[#2276cb]/40 bg-black/90 backdrop-blur-2xl p-6 shadow-2xl shadow-[#2276cb]/40 space-y-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-white">{viewerHasCurrentSlot ? "Change your address" : "Reserve your slot"}</h2>
            {participantCount > 0 && (
              <button
                onClick={() => setShowJoinModal(false)}
                className="text-[#2276cb] hover:text-white transition-colors text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            )}
          </div>
          <div>
            <p className="text-sm text-[#2276cb]/80 text-center">
              Enter your Polygon address below.
            </p>
          </div>
          <div>
            <label className="block text-sm text-[#2276cb]/70 mb-2">Polygon address (USDC)</label>
            <input
              type="text"
              value={polygonAddress}
              onChange={(event) => setPolygonAddress(event.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-3 bg-black/60 border border-[#2276cb]/40 rounded-lg text-white focus:outline-none focus:border-[#2276cb]"
            />
          </div>
          <p className="text-xs text-[#2276cb]/70">
            Need a wallet?{" "}
            <a
              href={walletGuideUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 text-[#2276cb] hover:text-white"
            >
              Follow this quick MetaMask guide
            </a>
            .
          </p>
          <div className="flex gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100">
            <span className="font-semibold text-sm">Polygon network</span>
            <p>
              Make sure the Polygon network is enabled in your wallet before pasting the address. Also, you will need to import USDC contract address to see your balance.
            </p>
          </div>
          {joinError && <p className="text-sm text-red-300">{joinError}</p>}
          {viewerCanEdit && (
            <p className="text-xs text-emerald-200">
              This browser already has a slot reserved for the current week. Submit a new address if you need to update it.
            </p>
          )}
          {isPotFull && !viewerCanEdit && (
            <p className="text-xs text-yellow-200">
              All slots are taken. Cookies prevent duplicate entries this week—check back after the Sunday payout.
            </p>
          )}
          <button
            onClick={handleJoin}
            disabled={disableJoinButton}
            className="w-full px-6 py-3 bg-[#2276cb] text-white rounded-lg font-semibold hover:bg-[#1a5ba8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : buttonLabel}
          </button>
        </div>
        </div>
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
      return "That address is already registered this week.";
    default:
      return "We could not save your slot. Please try again.";
  }
}
