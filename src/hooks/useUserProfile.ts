import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface SocialLink {
  platform: string;
  url: string;
}

export interface UserProfile {
  display_name: string;
  preferred_name?: string;
  bio?: string;
  social_links: SocialLink[];
  btc_address?: string;
  avatar_seed?: string;
  orbit_speed_multiplier?: number;
}

type RegisterUserResult = {
  id: string;
  display_name: string;
  created_at: string;
  last_seen_at: string;
};

export function useUserProfile(displayName: string | null, userId?: string | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!displayName) {
      setProfile(null);
      return;
    }

    loadProfile(displayName);
  }, [displayName]);

  const loadProfile = async (name: string) => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error: fetchError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("display_name", name)
        .single();

      if (fetchError) {
        // Profile doesn't exist yet - create a default one
        if (fetchError.code === "PGRST116") {
          const newProfile: UserProfile = {
            display_name: name,
            social_links: [],
          };
          setProfile(newProfile);
        } else {
          throw fetchError;
        }
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (updatedProfile: UserProfile) => {
    if (!displayName) {
      throw new Error("Display name is required");
    }
    if (!userId) {
      throw new Error("User identifier is missing");
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error: rpcError } = await supabase.rpc("register_user_profile", {
        p_user_id: userId,
        p_display_name: displayName,
        p_preferred_name: updatedProfile.preferred_name ?? null,
        p_bio: updatedProfile.bio ?? null,
        p_social_links: updatedProfile.social_links ?? [],
        p_btc_address: updatedProfile.btc_address ?? null,
        p_orbit_speed_multiplier: updatedProfile.orbit_speed_multiplier ?? 1.0,
      });

      if (rpcError) {
        throw rpcError;
      }

      const userRecord: RegisterUserResult | null = Array.isArray(data)
        ? (data[0] ?? null)
        : (data as RegisterUserResult | null);

      setProfile({
        ...updatedProfile,
        display_name: displayName,
      });

      return userRecord;
    } catch (err) {
      console.error("Error saving profile:", err);
      setError(err instanceof Error ? err.message : "Failed to save profile");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    profile,
    loading,
    error,
    saveProfile,
    reloadProfile: () => displayName && loadProfile(displayName),
  };
}
