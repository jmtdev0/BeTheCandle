"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import InteractiveSphere3D, { SatelliteUser } from "@/components/InteractiveSphere3D";
import SatelliteInfoCard from "@/components/SatelliteInfoCard";
import SatelliteColorPicker from "@/components/SatelliteColorPicker";
import MusicPlayer from "@/components/MusicPlayer";
import { useSatelliteColorPreference } from "@/lib/useSatelliteColorPreference";
import { useSocket } from "@/hooks/useSocket";
import { Planet } from "@/types/socket";

// Convert Planet to SatelliteUser format
const planetToSatelliteUser = (planet: Planet, isCurrentUser: boolean): SatelliteUser => ({
  id: planet.userId,
  displayName: isCurrentUser ? "Tu planeta 🌟" : (planet.userName || `Visitante ${planet.userId.slice(0, 6)}`),
  currentBTC: "N/A",
  goalBTC: 0,
  purpose: isCurrentUser 
    ? "Este es tu planeta personal. Personaliza su color usando el selector de color." 
    : "Otro usuario explorando el universo Bitcoin.",
  avatar: isCurrentUser ? "👤" : "🪐",
  color: planet.color, // Pass the color to the satellite
});

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
      <div className="absolute top-6 right-6 z-[60]">
        <SatelliteColorPicker
          value={satelliteColor}
          onChange={setSatelliteColor}
          className="relative"
        />
      </div>
      
      {/* Connection Status Indicator */}
      <div className="absolute top-6 left-6 z-[60]">
        <div className={`px-4 py-2 rounded-lg backdrop-blur-md ${
          isConnected 
            ? 'bg-green-500/20 border border-green-500/50 text-green-300' 
            : 'bg-red-500/20 border border-red-500/50 text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-sm font-medium">
              {isConnected ? `Conectado · ${planets.length} planetas` : 'Conectando...'}
            </span>
          </div>
        </div>
      </div>

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
    <>
      <SatelliteInfoCard user={selectedUser} onClose={handleCloseCard} screenPosition={selectedScreenPos} />
      
      {/* Music Player - Carga automáticamente la música de /public/background_music/ */}
      <MusicPlayer />
    </>
  )}
    </div>
  );
}
