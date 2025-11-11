import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface ProfileData {
  display_name: string;
  orbit_speed_multiplier?: number;
  preferred_name?: string;
  bio?: string;
  btc_address?: string;
}

/**
 * Hook to load orbit speed multipliers for all connected users
 * Returns a map of userId -> orbitSpeedMultiplier
 */
export function useLobbyProfiles(userNames: string[]) {
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileData>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userNames.length === 0) {
      setProfilesMap({});
      return;
    }

    const loadProfiles = async () => {
      setLoading(true);
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data, error } = await supabase
          .from("user_profiles")
          .select("display_name, orbit_speed_multiplier, preferred_name, bio, btc_address")
          .in("display_name", userNames);

        if (error) {
          console.error("Error loading lobby profiles:", error);
          return;
        }

        const map: Record<string, ProfileData> = {};
        if (data) {
          data.forEach((profile) => {
            map[profile.display_name] = profile;
          });
        }
        setProfilesMap(map);
      } catch (err) {
        console.error("Error loading lobby profiles:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();
  }, [userNames.join(",")]);

  return { profilesMap, loading };
}
