"use client";

import { useMemo, useState } from "react";
import DonationBubble from "@/components/DonationBubble";
import DonationModal from "@/components/DonationModal";
import { BackgroundMusic } from "@/components/BackgroundMusic";
import { SatelliteUser } from "@/components/InteractiveSphere3D";
import SatelliteInfoCard from "@/components/SatelliteInfoCard";
import { useRealtimeDonations } from "@/hooks/useRealtimeDonations";

// Interface for individual donations
export default function SharingFuturePage() {
  // State to control modal visibility
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // State for selected satellite user
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteUser | null>(null);
  const [selectedScreenPos, setSelectedScreenPos] = useState<{ x: number; y: number } | null>(null);

  const { donations, totalBtc, addDonation, onlineMembers, status, error } = useRealtimeDonations();

  const formattedDonations = useMemo(
    () =>
      donations.map((donation) => ({
        id: donation.id,
        amount: donation.amountBtc,
        address: donation.btcAddress,
        displayName: donation.displayName,
        message: donation.message,
        timestamp: donation.createdAt,
      })),
    [donations]
  );

  const displayedTotal = totalBtc;

  // Handler to open the donation modal
  const handleAddDonation = () => {
    setSubmitError(null);
    setIsModalOpen(true);
  };

  // Handler when satellite is clicked
  const handleSatelliteClick = (user: SatelliteUser, screenPos?: { x: number; y: number }) => {
    setSelectedSatellite(user);
    // store screen pos if provided (InteractiveSphere3D will provide it)
    setSelectedScreenPos(screenPos ?? null);
  };

  // Handler to close satellite info
  const handleCloseSatelliteInfo = () => {
    setSelectedSatellite(null);
    setSelectedScreenPos(null);
  };

  // Handler for modal submission
  const handleDonationSubmit = async (input: {
    amount: number;
    address: string;
    displayName: string;
    message?: string;
  }) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await addDonation({
        amountBtc: input.amount,
        btcAddress: input.address,
        displayName: input.displayName,
        message: input.message,
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setSubmitError(err instanceof Error ? err.message : "Unable to save donation");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler to close the modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <main className="min-h-screen">
      <BackgroundMusic volume={0.45} />
      <div className="fixed top-6 left-6 z-[60] flex flex-col gap-2">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur transition-colors ${
            status === "ready"
              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
              : status === "connecting"
              ? "border-amber-400/40 bg-amber-500/10 text-amber-200"
              : status === "error"
              ? "border-red-400/40 bg-red-500/10 text-red-200"
              : "border-slate-500/40 bg-slate-800/50 text-slate-300"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-current" />
          {status === "ready" && "Supabase realtime listo"}
          {status === "connecting" && "Conectando con la órbita"}
          {status === "error" && "Sin conexión realtime"}
          {status === "idle" && "Preparando órbita"}
        </span>
        {status === "error" && error && (
          <span className="max-w-xs text-xs text-red-200/80">
            {error}
          </span>
        )}
      </div>
      <DonationBubble
        totalBTC={displayedTotal}
        maxBTC={1.0}
        onAddDonation={handleAddDonation}
        donations={formattedDonations}
        onSatelliteClick={handleSatelliteClick}
        selectedSatelliteId={selectedSatellite?.id}
        onlineMembers={onlineMembers.map((member) => ({ id: member.id, alias: member.alias }))}
      />
      
      <DonationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleDonationSubmit}
        isSubmitting={isSubmitting}
        errorMessage={submitError ?? (error && status === "error" ? error : undefined)}
      />

      <SatelliteInfoCard
        user={selectedSatellite}
        onClose={handleCloseSatelliteInfo}
        screenPosition={selectedScreenPos}
      />
    </main>
  );
}
