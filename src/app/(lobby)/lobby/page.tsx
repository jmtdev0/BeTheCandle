"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import InteractiveSphere3D, { SatelliteUser } from "@/components/lobby/InteractiveSphere3D";
import SatelliteInfoCard from "@/components/lobby/SatelliteInfoCard";
import { useSatelliteColorPreference } from "@/lib/useSatelliteColorPreference";
import { useSocket } from "@/hooks/useSocket";
import { Planet } from "@/types/socket";

// Convert Planet to SatelliteUser format
const planetToSatelliteUser = (planet: Planet, isCurrentUser: boolean): SatelliteUser => {
  const actualDisplayName = planet.userName || `Visitor ${planet.userId.slice(0, 6)}`;

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
  };
};

export default function GoofyModePage() {
  const controlsRef = useRef<any>(null);
  const [selectedUser, setSelectedUser] = useState<SatelliteUser | null>(null);
  const [selectedScreenPos, setSelectedScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const { color: satelliteColor, setColor: setSatelliteColor } = useSatelliteColorPreference();
  
  // Socket integration
  const { planets, myPlanetId, isConnected, joinAsPlanet, updateColor } = useSocket();
  const hasJoined = useRef(false);

  // Join as planet when connected and color is available
  useEffect(() => {
    if (isConnected && satelliteColor && !hasJoined.current) {
      joinAsPlanet(satelliteColor);
      hasJoined.current = true;
    }
  }, [isConnected, satelliteColor, joinAsPlanet]);

  // Update color when user changes it
  useEffect(() => {
    if (isConnected && hasJoined.current && satelliteColor) {
      updateColor(satelliteColor);
    }
  }, [satelliteColor, isConnected, updateColor]);

  // Convert planets to satellite users
  const satelliteUsers: SatelliteUser[] = planets.map(planet => 
    planetToSatelliteUser(planet, planet.userId === myPlanetId)
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
