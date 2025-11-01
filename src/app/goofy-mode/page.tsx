"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import InteractiveSphere3D, { SatelliteUser } from "@/components/InteractiveSphere3D";
import SatelliteInfoCard from "@/components/SatelliteInfoCard";

// Sample satellite users data
const sampleUsers: SatelliteUser[] = [
  {
    id: "user-1",
    displayName: "Carlos M.",
    currentBTC: "0.001 - 0.01 BTC",
    goalBTC: 0.1,
    purpose: "I want to save for my first house in 5 years. Bitcoin is my way to protect my money from inflation.",
    avatar: "🏠"
  },
  {
    id: "user-2",
    displayName: "Ana R.",
    currentBTC: "0.05 - 0.15 BTC",
    goalBTC: 1.0,
    purpose: "I'm saving for my children's university education. I believe in Bitcoin as a long-term store of value.",
    avatar: "🎓"
  },
  {
    id: "user-3",
    displayName: "Luis P.",
    currentBTC: "0.0001 - 0.001 BTC",
    goalBTC: 0.05,
    purpose: "I just started with Bitcoin. My goal is to learn and build a digital emergency fund.",
    avatar: "🌱"
  },
  {
    id: "user-4",
    displayName: "María G.",
    currentBTC: "0.01 - 0.05 BTC",
    goalBTC: 0.5,
    purpose: "I want financial freedom to travel the world. Bitcoin gives me independence from traditional banks.",
    avatar: "✈️"
  }
];

export default function GoofyModePage() {
  const controlsRef = useRef<any>(null);
  const [selectedUser, setSelectedUser] = useState<SatelliteUser | null>(null);
  const [selectedScreenPos, setSelectedScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSatelliteClick = (user: SatelliteUser, screenPos?: { x: number; y: number }) => {
    setSelectedUser(user);
    setSelectedScreenPos(screenPos ?? null);
  };

  const handleCloseCard = () => {
    setSelectedUser(null);
    setSelectedScreenPos(null);
  };

  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-gradient-to-b from-[#030712] via-[#050b1a] to-[#030712] overflow-hidden">
      <Canvas shadows camera={{ position: [0, 0, 6], fov: 50 }} style={{ width: "100%", height: "100%" }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
        {/* Larger planet: increase radius to make the Bitcoin sphere much bigger */}
        <InteractiveSphere3D 
          initialPosition={[0, 0, 0]} 
          radius={3.5} 
          controlsRef={controlsRef}
          satelliteUsers={sampleUsers}
          onSatelliteClick={handleSatelliteClick}
          selectedSatelliteId={selectedUser?.id}
        />
        {/* Allow zoom but restrict min/max so user cannot zoom out indefinitely */}
        <OrbitControls ref={controlsRef} enablePan={false} enableZoom={true} minDistance={4} maxDistance={60} />
      </Canvas>

  {/* Satellite info card overlay (render only after client mount to avoid SSR/client mismatch) */}
  {mounted && (
    <SatelliteInfoCard user={selectedUser} onClose={handleCloseCard} screenPosition={selectedScreenPos} />
  )}
    </div>
  );
}
