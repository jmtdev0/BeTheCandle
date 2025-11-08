import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface SocialLink {
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
}

export function useUserProfile(displayName: string | null) {
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
    if (!displayName) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Check if profile exists
      const { data: existing } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("display_name", displayName)
        .single();

      if (existing) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from("user_profiles")
          .update({
            preferred_name: updatedProfile.preferred_name,
            bio: updatedProfile.bio,
            social_links: updatedProfile.social_links,
            btc_address: updatedProfile.btc_address,
          })
          .eq("display_name", displayName);

        if (updateError) throw updateError;
      } else {
        // Insert new profile
        const { error: insertError } = await supabase
          .from("user_profiles")
          .insert({
            display_name: displayName,
            preferred_name: updatedProfile.preferred_name,
            bio: updatedProfile.bio,
            social_links: updatedProfile.social_links,
            btc_address: updatedProfile.btc_address,
            avatar_seed: displayName, // Use display_name as seed
          });

        if (insertError) throw insertError;
      }

      setProfile(updatedProfile);
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
