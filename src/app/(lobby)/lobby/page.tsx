/* Lobby removed to avoid dual scenes.

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
import { usePageTransition } from "@/contexts/PageTransitionContext";

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
*/

import { redirect } from "next/navigation";

export default function LobbyPage() {
  redirect("/community-pot");
}

export default function GoofyModePage() {
  const controlsRef = useRef<any>(null);
  const [selectedUser, setSelectedUser] = useState<SatelliteUser | null>(null);
  const [selectedScreenPos, setSelectedScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const { color: satelliteColor, setColor: setSatelliteColor } = useSatelliteColorPreference();
  const { setDataReady } = usePageTransition();
  
  // Socket integration
  const { planets, myPlanetId, isConnected, updateColor, joinAsPlanet } = useSocket();

  // Track both socket connection and 3D scene readiness
  const [sceneReady, setSceneReady] = useState(false);

  
