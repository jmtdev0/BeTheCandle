"use client";

import { useEffect, useMemo, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import UserProfileModal from "./UserProfileModal";
import { useUserProfile, type UserProfile as UserProfileData } from "@/hooks/useUserProfile";
import { useSatelliteColorPreference } from "@/lib/useSatelliteColorPreference";
import { getOrCreateUserId, persistUserId } from "@/lib/userId";
import { useSupabaseAuth } from "@/components/common/AuthProvider";

export default function SidebarWithLobbyStatus() {
  const pathname = usePathname();
  const isLobbyPage = pathname === "/lobby";
  
  // Only subscribe to socket updates when on lobby page
  const { planets, isConnected, myPlanetId, joinAsPlanet } = useSocket();
  
  // Profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [pendingJoin, setPendingJoin] = useState<{ userId: string; userName?: string } | null>(null);
  const { session, requireAuthForSatellite, openAuthPrompt, signOut, closeAuthPrompt } = useSupabaseAuth();
  
  // Get current user's display name from socket
  const currentUser = planets.find(p => p.userId === myPlanetId);
  const activeDisplayName = currentUser?.userName || null;
  
  // Load user profile
  const deriveVisitorName = (id: string) => `Visitor ${id.replace(/-/g, "").slice(0, 6)}`;

  const effectiveDisplayName = useMemo(() => {
    if (activeDisplayName) return activeDisplayName;
    if (userId) return deriveVisitorName(userId);
    return null;
  }, [activeDisplayName, userId]);

  const { profile, saveProfile } = useUserProfile(effectiveDisplayName, userId);

  const modalProfile = useMemo<UserProfileData | null>(() => {
    if (profile) {
      return profile;
    }

    if (!effectiveDisplayName && !session) {
      return null;
    }

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
  
  // Satellite color preference
  const { color: satelliteColor, setColor: setSatelliteColor } = useSatelliteColorPreference();

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
    } catch (error) {
      // Let modal surface validation error
      throw error;
    } finally {
      setIsActivating(false);
    }
  };

  useEffect(() => {
    if (!session || !userId || !isConnected || pendingJoin || myPlanetId) return;
    const autoDisplayName = profile?.display_name ?? effectiveDisplayName ?? session.user.user_metadata?.display_name ?? session.user.user_metadata?.full_name ?? session.user.email ?? undefined;
    if (!autoDisplayName) return;
    setPendingJoin({ userId, userName: autoDisplayName });
  }, [session, userId, isConnected, profile, effectiveDisplayName, pendingJoin, myPlanetId]);
  
  return (
    <>
      <Sidebar 
        lobbyUserCount={planets.length}
        isLobbyConnected={isConnected}
        onProfileClick={() => {
          if (!session) {
            openAuthPrompt("action");
            return;
          }
          setIsProfileModalOpen(true);
        }}
        onSignOutClick={() => {
          signOut().catch(() => {
            // Error already logged; keep UI responsive
          });
        }}
        onActivateClick={handleActivateSatellite}
        hasSatellite={Boolean(session)}
        isActivatingSatellite={isActivating}
        canActivateSatellite={Boolean(userId)}
        showSatelliteButton={isLobbyPage}
      />
      
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={modalProfile}
        onSave={handleProfileSave}
        satelliteColor={satelliteColor}
        onColorChange={setSatelliteColor}
      />
    </>
  );
}
