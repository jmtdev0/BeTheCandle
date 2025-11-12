"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import InteractiveSphere3D, { SatelliteUser } from "@/components/lobby/InteractiveSphere3D";
import SatelliteInfoCard from "@/components/lobby/SatelliteInfoCard";
import InfoPopup from "@/components/common/InfoPopup";
import { useSatelliteColorPreference } from "@/lib/useSatelliteColorPreference";
import { useSocket } from "@/hooks/useSocket";
import { useLobbyProfiles } from "@/hooks/useLobbyProfiles";

export default function GoofyModePage() {
  const controlsRef = useRef<any>(null);
  const [selectedUser, setSelectedUser] = useState<SatelliteUser | null>(null);
  const [selectedScreenPos, setSelectedScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const { color: satelliteColor } = useSatelliteColorPreference();
  
  // Socket integration
  const { planets, myPlanetId, isConnected, updateColor } = useSocket();

  // Load profiles for all connected users
  const userNames = useMemo(() => 
    planets.map(p => p.userName).filter(Boolean) as string[], 
    [planets]
  );
  const { profilesMap } = useLobbyProfiles(userNames);

  useEffect(() => {
    if (!isConnected || !myPlanetId || !satelliteColor) return;
    updateColor(satelliteColor);
  }, [satelliteColor, isConnected, myPlanetId, updateColor]);

  // Convert planets to satellite users
  const satelliteUsers: SatelliteUser[] = useMemo(() => 
    planets.map(planet => {
      const isCurrentUser = planet.userId === myPlanetId;
      const actualDisplayName = planet.userName || `Visitor ${planet.userId.slice(0, 6)}`;
      const profile = planet.userName ? profilesMap[planet.userName] : null;

      return {
        id: planet.userId,
        displayName: isCurrentUser ? "Your Planet 🌟" : actualDisplayName,
        currentBTC: "N/A",
        goalBTC: 0,
        purpose: isCurrentUser 
          ? "This is your personal planet. Customize its color from your profile settings." 
          : "Another user exploring the Bitcoin universe.",
        avatar: isCurrentUser ? "👤" : "🪐",
        color: planet.color,
        profileDisplayName: planet.userName ?? null,
        orbitSpeedMultiplier: profile?.orbit_speed_multiplier ?? 1.0,
      };
    }), 
    [planets, myPlanetId, profilesMap]
  );

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
      {/* Info Popup */}
      <InfoPopup
        title="Welcome to the Lobby"
        content={`This is the Lobby - a real-time social space where Bitcoin supporters gather around a digital star.

Each orbiting satellite represents a connected user. When you sign in with Google and create your satellite, you'll join the orbit with your own customizable presence.

• Click on any satellite to view profile details
• Customize your satellite color from your profile
• See who else is exploring the Bitcoin universe

The central star symbolizes Bitcoin itself - the gravitational center bringing us all together.`}
      />

      {/* Removed connection indicator - now shown in Sidebar */}

      <Canvas 
        shadows 
        camera={{ position: [0, 0, 6], fov: 50 }} 
        style={{ width: "100%", height: "100%" }}
        gl={{ 
          toneMapping: THREE.ACESFilmicToneMapping, 
          toneMappingExposure: 1.5,
          antialias: true 
        }}
      >
        {/* Remove duplicate lights - InteractiveSphere3D provides its own lighting */}
        {/* Larger planet: increase radius to make the Bitcoin sphere much bigger */}
        <InteractiveSphere3D 
          initialPosition={[0, 0, 0]} 
          radius={3.5} 
          controlsRef={controlsRef}
          satelliteUsers={satelliteUsers}
          onSatelliteClick={handleSatelliteClick}
          selectedSatelliteId={selectedUser?.id}
          satelliteColor={satelliteColor}
          currentUserId={myPlanetId}
        />
        {/* Allow zoom but restrict min/max so user cannot zoom out indefinitely */}
        <OrbitControls ref={controlsRef} enablePan={false} enableZoom={true} minDistance={4} maxDistance={60} />
        
        {/* Bloom Postprocessing for Realistic Star Glow */}
        <EffectComposer>
          <Bloom
            intensity={1.8}
            luminanceThreshold={0.8}
            luminanceSmoothing={0.9}
            mipmapBlur={true}
            radius={0.85}
          />
        </EffectComposer>
      </Canvas>

  {/* Satellite info card overlay (render only after client mount to avoid SSR/client mismatch) */}
  {mounted && (
    <SatelliteInfoCard user={selectedUser} onClose={handleCloseCard} screenPosition={selectedScreenPos} />
  )}
    </div>
  );
}
