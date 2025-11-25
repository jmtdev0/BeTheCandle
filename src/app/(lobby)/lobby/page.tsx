"use client";

import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import InteractiveSphere3D, { SatelliteUser } from "@/components/lobby/InteractiveSphere3D";
import SatelliteInfoCard from "@/components/lobby/SatelliteInfoCard";
import InfoPopup from "@/components/common/InfoPopup";
import UserProfileModal from "@/components/common/UserProfileModal";
import { useSatelliteColorPreference } from "@/lib/useSatelliteColorPreference";
import { useSocket } from "@/hooks/useSocket";
import { useLobbyProfiles } from "@/hooks/useLobbyProfiles";
import { useUserProfile, type UserProfile as UserProfileData } from "@/hooks/useUserProfile";
import { useSupabaseAuth } from "@/components/common/AuthProvider";
import { getOrCreateUserId, persistUserId } from "@/lib/userId";

// Component to set initial camera position to max zoom out
function CameraController({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const { camera } = useThree();
  const initialized = useRef(false);
  
  useEffect(() => {
    if (!initialized.current) {
      // Set camera to max zoom out distance (60 is maxDistance)
      camera.position.set(0, 0, 60);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      initialized.current = true;
    }
  }, [camera, controlsRef]);
  
  return null;
}

export default function GoofyModePage() {
  const controlsRef = useRef<any>(null);
  const [selectedUser, setSelectedUser] = useState<SatelliteUser | null>(null);
  const [selectedScreenPos, setSelectedScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const { color: satelliteColor, setColor: setSatelliteColor } = useSatelliteColorPreference();
  
  // Socket integration
  const { planets, myPlanetId, isConnected, updateColor, joinAsPlanet } = useSocket();

  // Auth & profile state for satellite creation button
  const { session, requireAuthForSatellite, openAuthPrompt, closeAuthPrompt } = useSupabaseAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [pendingJoin, setPendingJoin] = useState<{ userId: string; userName?: string } | null>(null);

  // Get current user's display name from socket
  const currentUser = planets.find(p => p.userId === myPlanetId);
  const activeDisplayName = currentUser?.userName || null;

  const deriveVisitorName = (id: string) => `Visitor ${id.replace(/-/g, "").slice(0, 6)}`;

  const effectiveDisplayName = useMemo(() => {
    if (activeDisplayName) return activeDisplayName;
    if (userId) return deriveVisitorName(userId);
    return null;
  }, [activeDisplayName, userId]);

  const { profile, saveProfile } = useUserProfile(effectiveDisplayName, userId);

  const modalProfile = useMemo<UserProfileData | null>(() => {
    if (profile) return profile;
    if (!effectiveDisplayName && !session) return null;
    const defaultDisplay =
      effectiveDisplayName ??
      session?.user.user_metadata?.display_name ??
      session?.user.user_metadata?.full_name ??
      session?.user.email ??
      "Explorer";
    return {
      display_name: defaultDisplay,
      social_links: [],
      preferred_name: "",
      bio: "",
      btc_address: "",
      orbit_speed_multiplier: 1.0,
    };
  }, [profile, effectiveDisplayName, session]);

  // Hover reveal for Create Satellite button
  const [satelliteButtonVisible, setSatelliteButtonVisible] = useState(false);
  const [satelliteButtonHovering, setSatelliteButtonHovering] = useState(false);

  // Load profiles for all connected users
  const userNames = useMemo(() => 
    planets.map(p => p.userName).filter(Boolean) as string[], 
    [planets]
  );
  const { profilesMap } = useLobbyProfiles(userNames);

  useEffect(() => {
    if (session?.user?.id) {
      setUserId(session.user.id);
      persistUserId(session.user.id);
      return;
    }
    try {
      setUserId(getOrCreateUserId());
    } catch (err) {
      console.error("Failed to read user id", err);
    }
  }, [session]);

  useEffect(() => {
    if (!isConnected || !myPlanetId || !satelliteColor) return;
    updateColor(satelliteColor);
  }, [satelliteColor, isConnected, myPlanetId, updateColor]);

  useEffect(() => {
    if (!pendingJoin || !isConnected) return;
    if (myPlanetId === pendingJoin.userId) {
      setPendingJoin(null);
      return;
    }
    const presenceColor = satelliteColor ?? "#f97316";
    joinAsPlanet({
      color: presenceColor,
      userId: pendingJoin.userId,
      userName: pendingJoin.userName,
    });
    setPendingJoin(null);
  }, [pendingJoin, isConnected, joinAsPlanet, satelliteColor, myPlanetId]);

  useEffect(() => {
    if (session) {
      const nextAction = sessionStorage.getItem("postAuthAction");
      if (nextAction === "open-profile") {
        sessionStorage.removeItem("postAuthAction");
        setIsProfileModalOpen(true);
      }
      closeAuthPrompt();
    }
  }, [session, closeAuthPrompt]);

  // Auto-join when session is ready
  useEffect(() => {
    if (!session || !userId || !isConnected || pendingJoin || myPlanetId) return;
    const autoDisplayName = profile?.display_name ?? effectiveDisplayName ?? session.user.user_metadata?.display_name ?? session.user.user_metadata?.full_name ?? session.user.email ?? undefined;
    if (!autoDisplayName) return;
    setPendingJoin({ userId, userName: autoDisplayName });
  }, [session, userId, isConnected, profile, effectiveDisplayName, pendingJoin, myPlanetId]);

  // Convert planets to satellite users
  const satelliteUsers: SatelliteUser[] = useMemo(() => 
    planets.map(planet => {
      const isCurrentUser = planet.userId === myPlanetId;
      const actualDisplayName = planet.userName || `Visitor ${planet.userId.slice(0, 6)}`;
      const profileData = planet.userName ? profilesMap[planet.userName] : null;

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
        orbitSpeedMultiplier: profileData?.orbit_speed_multiplier ?? 1.0,
      };
    }), 
    [planets, myPlanetId, profilesMap]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hover reveal for Create Satellite button (bottom center area)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const distanceFromBottom = window.innerHeight - e.clientY;
      const centerX = window.innerWidth / 2;
      const distanceFromCenter = Math.abs(e.clientX - centerX);
      
      // Show when mouse is near bottom center
      if (distanceFromBottom <= 120 && distanceFromCenter <= 200) {
        setSatelliteButtonVisible(true);
      } else if (!satelliteButtonHovering && (distanceFromBottom > 180 || distanceFromCenter > 280)) {
        setSatelliteButtonVisible(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [satelliteButtonHovering]);

  const handleSatelliteClick = (user: SatelliteUser, screenPos?: { x: number; y: number }) => {
    setSelectedUser(user);
    setSelectedScreenPos(screenPos ?? null);
  };

  const handleCloseCard = () => {
    setSelectedUser(null);
    setSelectedScreenPos(null);
  };

  const handleActivateSatellite = async () => {
    if (!userId || isActivating) return;
    if (!session) {
      await requireAuthForSatellite();
      return;
    }
    setIsProfileModalOpen(true);
  };

  const handleProfileSave = async (updatedProfile: UserProfileData) => {
    if (!userId || !effectiveDisplayName) {
      throw new Error("Missing user identity");
    }
    if (!session) {
      throw new Error("Please sign in with Google before saving your profile");
    }
    setIsActivating(true);
    try {
      const userRecord = await saveProfile(updatedProfile);
      const resolvedDisplayName = userRecord?.display_name ?? effectiveDisplayName;
      setPendingJoin({ userId, userName: resolvedDisplayName });
    } finally {
      setIsActivating(false);
    }
  };

  const hasSatellite = Boolean(session);

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
        camera={{ position: [0, 0, 60], fov: 50 }} 
        style={{ width: "100%", height: "100%" }}
        gl={{ 
          toneMapping: THREE.ACESFilmicToneMapping, 
          toneMappingExposure: 1.5,
          antialias: true 
        }}
      >
        {/* Set initial camera to max zoom out */}
        <CameraController controlsRef={controlsRef} />
        
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

      {/* Create Satellite button - centered at bottom with hover reveal */}
      {!hasSatellite && mounted && (
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: satelliteButtonVisible || satelliteButtonHovering ? 1 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{ pointerEvents: satelliteButtonVisible || satelliteButtonHovering ? "auto" : "none" }}
          onPointerEnter={() => {
            setSatelliteButtonHovering(true);
            setSatelliteButtonVisible(true);
          }}
          onPointerLeave={() => setSatelliteButtonHovering(false)}
        >
          <button
            onClick={handleActivateSatellite}
            disabled={isActivating || !userId}
            className="px-8 py-4 rounded-xl transition-all bg-gradient-to-r from-orange-500 to-amber-400 text-slate-900 font-semibold shadow-lg shadow-orange-500/40 hover:shadow-xl hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100 disabled:shadow-none text-lg"
          >
            {isActivating ? "Preparing your orbit..." : "Create your satellite"}
          </button>
        </motion.div>
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={modalProfile}
        onSave={handleProfileSave}
        satelliteColor={satelliteColor}
        onColorChange={setSatelliteColor}
      />
    </div>
  );
}
