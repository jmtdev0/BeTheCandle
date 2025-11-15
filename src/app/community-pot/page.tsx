"use client";

import React, { useState, useEffect, useMemo } from "react";
import InfoPopup from "@/components/common/InfoPopup";
import { useCommunityPot } from "@/hooks/useCommunityPot";

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
  } = communityPot;

  const [polygonAddress, setPolygonAddress] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [hoveredParticipantId, setHoveredParticipantId] = useState<string | null>(null);

  useEffect(() => {
    if (viewerAddress) {
      setPolygonAddress(viewerAddress);
    }
  }, [viewerAddress]);

  const participantCount = participants.length;

  useEffect(() => {
    if (participantCount === 0) {
      setShowJoinModal(true);
    } else {
      setShowJoinModal(false);
    }
  }, [participantCount]);

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

      {/* CSS Floating Orbs */}
      {participantCount > 0 && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          {participants.map((participant) => {
            const hash = participant.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const left = 25 + ((hash * 7) % 50);
            const top = 25 + ((hash * 13) % 50);
            const delay = (hash % 10) * 0.3;
            const duration = 8 + (hash % 5);
            const scale = 1.0 + ((hash % 5) * 0.2);
            const isHovered = hoveredParticipantId === participant.polygonAddress;

            return (
              <div
                key={participant.id}
                className="absolute rounded-full bg-white/80 shadow-lg shadow-white/40 cursor-pointer pointer-events-auto transition-all duration-200"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${36 * scale}px`,
                  height: `${36 * scale}px`,
                  animation: `floatOrb ${duration}s ease-in-out ${delay}s infinite`,
                  opacity: isHovered ? 1 : 0.8,
                  boxShadow: isHovered ? `0 0 20px rgba(255, 255, 255, 0.6), 0 0 40px rgba(255, 255, 255, 0.3)` : `0 10px 25px rgba(255, 255, 255, 0.4)`,
                  transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                }}
                onMouseEnter={() => setHoveredParticipantId(participant.polygonAddress)}
                onMouseLeave={() => setHoveredParticipantId(null)}
              >
                {isHovered && (
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/30 shadow-xl pointer-events-none">
                    <p className="text-xs text-white font-mono">{participant.polygonAddress}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info Popup */}
      <InfoPopup
        title="Community Pot"
        content={`Welcome to the Community Pot: a non-custodial USDC pool on Polygon for our weekly supporters.

    Each week we open up to 10 slots. Drop a valid Polygon address to reserve one and every active wallet receives the same share when we execute the payout Sunday at 4:30 PM CET.

    • Configurable weekly amount (currently 10 USDC)
    • Live countdown and slot tracker
    • Participant list powered by Supabase
    • On-chain payout history via PolygonScan

    Heads-up: payouts are triggered manually from our verified wallet.`}
      />

      {/* UI Overlay - pointer-events-none en el contenedor */}
      <div className="absolute top-8 left-8 z-10 pointer-events-auto bg-black/60 backdrop-blur-md p-6 rounded-xl border border-[#2276cb]/40 space-y-4 w-[385px]">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">🌌 Community Pot</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <div className="space-y-3 text-white text-sm">
          <InfoRow label="Weekly pool" value={week ? `${Number(week.amountUsdc).toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC` : "—"} />
          <InfoRow label="Scheduled payout" value={distributionLabel || "—"} />
          <InfoRow label="Countdown" value={countdown.label || "—"} highlight />
          <InfoRow label="Participants" value={`${participantCount}/${week?.maxParticipants ?? 10}`} />
          <InfoRow label="Open slots" value={week ? Math.max(week.spotsRemaining, 0) : "—"} />
          <InfoRow label="Estimated share" value={perParticipantAmountUsdc ? `${perParticipantAmountUsdc} USDC` : "Depends on headcount"} />
        </div>
        {refreshing && <p className="text-xs text-purple-200">Refreshing…</p>}
      </div>

      {/* Join experience */}
      {participantCount > 0 && (
        <button
          onClick={() => setShowJoinModal(true)}
          className="fixed top-8 right-8 z-40 px-6 py-3 bg-[#2276cb] text-white rounded-xl font-semibold hover:bg-[#1a5ba8] transition-colors shadow-lg shadow-[#2276cb]/40"
        >
          Reserve your slot
        </button>
      )}
      {showJoinModal && isPotFull && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm pointer-events-none" />
      )}
      {showJoinModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-[#2276cb]/40 bg-black/90 backdrop-blur-2xl p-6 shadow-2xl shadow-[#2276cb]/40 space-y-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-white">Reserve your slot</h2>
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
            <p className="text-xs text-[#2276cb]/60 mt-2 text-center">
              {week ? (hasOpenSpots ? `${Math.max(week.spotsRemaining, 0)} slots open remaining this week` : "All slots claimed this week") : "Loading weekly window..."}
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
              Make sure the Polygon network is enabled in your wallet before pasting the address. Payouts go out on Polygon USDC every Sunday.
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
          <p className="text-xs text-gray-300 text-center">
            Payouts run every Sunday at 4:30 PM CET.
          </p>
        </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-purple-200 text-sm">{label}</span>
      <span className={`font-semibold text-right ${highlight ? "text-yellow-300 font-mono" : "text-white"}`}>
        {value}
      </span>
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
