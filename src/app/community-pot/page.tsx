"use client";

import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import Nebula3D from "@/components/community-pot/Nebula3D";
import MusicPlayer from "@/components/common/MusicPlayer";
import InfoPopup from "@/components/common/InfoPopup";
import { useCommunityPot } from "@/hooks/useCommunityPot";

export default function CommunityPotPage() {
  // Generar userId único para este usuario
  const [userId] = useState(() => {
    if (typeof window !== "undefined") {
      let id = localStorage.getItem("community-pot-user-id");
      if (!id) {
        id = `user-${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem("community-pot-user-id", id);
      }
      return id;
    }
    return `user-${Math.random().toString(36).substring(2, 15)}`;
  });

  const [displayName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("user-display-name") || "Visitor";
    }
    return "Visitor";
  });

  const { totalSats, participantCount, isConnected } = useCommunityPot(userId, displayName);

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-black via-purple-950 to-black overflow-hidden">
      {/* Info Popup */}
      <InfoPopup
        title="Community Pot"
        content={`Welcome to the Community Pot - a collective treasury where Bitcoin supporters come together.

This experimental feature allows users to contribute sats (Bitcoin's smallest unit) to a shared pool that grows with each contribution.

• View real-time total accumulated sats
• See how many participants are involved
• Track the countdown to the next distribution
• The nebula visualization represents the growing energy of collective support

This space celebrates the collaborative spirit of the Bitcoin community. Contribution features are currently in development.`}
      />

      {/* Canvas 3D con la nebulosa */}
      <Canvas
        camera={{ position: [0, 0, 30], fov: 75 }}
        className="absolute inset-0"
        gl={{ preserveDrawingBuffer: true }}
        onPointerMissed={() => {
          // Prevent pointer capture errors
        }}
      >
        <color attach="background" args={["#000000"]} />
        
        {/* Nebulosa con partículas instanciadas */}
        <Nebula3D participantCount={participantCount} totalSats={totalSats} />

        {/* Post-processing para efectos visuales */}
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            intensity={1.5}
          />
        </EffectComposer>

        {/* Controles de cámara */}
        <OrbitControls
          enablePan={false}
          minDistance={15}
          maxDistance={50}
          enableDamping
          dampingFactor={0.05}
          makeDefault
        />
      </Canvas>

      {/* UI Overlay - pointer-events-none en el contenedor */}
      <div className="absolute top-8 left-8 z-10 pointer-events-auto bg-black/50 backdrop-blur-md p-6 rounded-xl border border-purple-500/30">
        <h1 className="text-3xl font-bold text-white mb-4">
          🌌 Community Pot
        </h1>
        <div className="space-y-2 text-white">
          <div className="flex justify-between gap-8">
            <span className="text-purple-300">Total accumulated:</span>
            <span className="font-mono font-bold">{totalSats.toLocaleString()} sats</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-purple-300">Participants:</span>
            <span className="font-mono font-bold">{participantCount}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-purple-300">Distribution in:</span>
            <span className="font-mono font-bold text-yellow-400">12:34:56</span>
          </div>
        </div>
      </div>

      {/* Contribution form (mock) */}
      <div className="absolute bottom-8 right-8 z-10 pointer-events-auto bg-black/50 backdrop-blur-md p-6 rounded-xl border border-purple-500/30 w-80">
        <h2 className="text-xl font-bold text-white mb-4">Contribute</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-purple-300 mb-2">
              Amount (sats)
            </label>
            <input
              type="number"
              placeholder="10000"
              className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <button
            disabled
            className="w-full px-6 py-3 bg-purple-600/50 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Coming Soon 🚀
          </button>
          <p className="text-xs text-gray-400 text-center">
            Payment system in development
          </p>
        </div>
      </div>

      {/* Reproductor de música */}
      <div className="absolute bottom-8 left-8 z-10 pointer-events-auto">
        <MusicPlayer />
      </div>

      {/* Link to go back to Lobby */}
      <div className="absolute top-8 right-8 z-10 pointer-events-auto">
        <a
          href="/lobby"
          className="px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-lg font-semibold hover:bg-white/20 transition-colors border border-white/20"
        >
          ← Back to Lobby
        </a>
      </div>
    </div>
  );
}
