"use client";

import { useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import UserProfileModal from "./UserProfileModal";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useSatelliteColorPreference } from "@/lib/useSatelliteColorPreference";

export default function SidebarWithLobbyStatus() {
  const pathname = usePathname();
  const isLobbyPage = pathname === "/lobby";
  
  // Only subscribe to socket updates when on lobby page
  const { planets, isConnected, myPlanetId } = useSocket();
  
  // Profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // Get current user's display name from socket
  const currentUser = planets.find(p => p.userId === myPlanetId);
  const displayName = currentUser?.userName || null;
  
  // Load user profile
  const { profile, saveProfile } = useUserProfile(displayName);
  
  // Satellite color preference
  const { color: satelliteColor, setColor: setSatelliteColor } = useSatelliteColorPreference();
  
  return (
    <>
      <Sidebar 
        lobbyUserCount={isLobbyPage ? planets.length : undefined}
        isLobbyConnected={isLobbyPage ? isConnected : undefined}
        onProfileClick={() => setIsProfileModalOpen(true)}
      />
      
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        onSave={saveProfile}
        satelliteColor={satelliteColor}
        onColorChange={setSatelliteColor}
      />
    </>
  );
}
