"use client";

import { useState } from "react";
import DonationBubble from "@/components/DonationBubble";
import DonationModal from "@/components/DonationModal";
import { BackgroundMusic } from "@/components/BackgroundMusic";
import { SatelliteUser } from "@/components/InteractiveSphere3D";
import SatelliteInfoCard from "@/components/SatelliteInfoCard";

// Interface for individual donations
interface Donation {
  id: number;
  amount: number;
  address: string;
  timestamp: Date;
}

export default function SharingFuturePage() {
  // State to track total BTC donations
  const [totalBTC, setTotalBTC] = useState(0.134);
  
  // State to track individual donations
  const [donations, setDonations] = useState<Donation[]>([
    {
      id: 1,
      amount: 0.05,
      address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: 2,
      amount: 0.034,
      address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      timestamp: new Date(Date.now() - 7200000),
    },
    {
      id: 3,
      amount: 0.05,
      address: "3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy",
      timestamp: new Date(Date.now() - 1800000),
    },
  ]);
  
  // State to control modal visibility
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State for selected satellite user
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteUser | null>(null);
  const [selectedScreenPos, setSelectedScreenPos] = useState<{ x: number; y: number } | null>(null);

  // Handler to open the donation modal
  const handleAddDonation = () => {
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
  const handleDonationSubmit = (amount: number, address: string) => {
    // Create new donation object
    const newDonation: Donation = {
      id: Date.now(),
      amount,
      address,
      timestamp: new Date(),
    };
    
    // Add the donation to the list
    setDonations((prev) => [...prev, newDonation]);
    
    // Add the donation amount to the total
    setTotalBTC((prev) => prev + amount);
    
    // Log the donation details (in a real app, this would be sent to a backend)
    console.log("New donation:", newDonation);
    
    // Close the modal
    setIsModalOpen(false);
  };

  // Handler to close the modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <main className="min-h-screen">
      <BackgroundMusic volume={0.45} />
      <DonationBubble
        totalBTC={totalBTC}
        maxBTC={1.0}
        onAddDonation={handleAddDonation}
        donations={donations}
        onSatelliteClick={handleSatelliteClick}
        selectedSatelliteId={selectedSatellite?.id}
      />
      
      <DonationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleDonationSubmit}
      />

      <SatelliteInfoCard
        user={selectedSatellite}
        onClose={handleCloseSatelliteInfo}
        screenPosition={selectedScreenPos}
      />
    </main>
  );
}
