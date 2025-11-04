import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface CommunityPotParticipant {
  userId: string;
  displayName: string;
  joinedAt: number;
}

interface CommunityPotStats {
  totalSats: number;
  participants: CommunityPotParticipant[];
  participantCount: number;
}

/**
 * Hook para manejar la presencia en tiempo real en Community Pot
 * Similar a useSocket pero específico para la nebulosa del Community Pot
 */
export function useCommunityPot(userId: string, displayName: string) {
  const [stats, setStats] = useState<CommunityPotStats>({
    totalSats: 0,
    participants: [],
    participantCount: 0,
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const channelName = `community-pot`;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // Sincronizar presencia
    channel
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState();
        const participants: CommunityPotParticipant[] = [];

        Object.entries(presenceState).forEach(([key, presences]) => {
          const presence = presences[0] as any;
          participants.push({
            userId: key,
            displayName: presence.displayName || "Anonymous",
            joinedAt: presence.joinedAt || Date.now(),
          });
        });

        setStats((prev) => ({
          ...prev,
          participants,
          participantCount: participants.length,
        }));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Trackear presencia del usuario actual
          await channel.track({
            userId,
            displayName,
            joinedAt: Date.now(),
          });
          setIsConnected(true);
        }
      });

    // Cargar el total actual del Community Pot desde la base de datos
    const fetchTotalSats = async () => {
      const { data, error } = await supabase
        .from("community_contributions")
        .select("amount_sats, status")
        .eq("status", "confirmed");

      if (!error && data) {
        const total = data.reduce((sum, contrib) => sum + contrib.amount_sats, 0);
        setStats((prev) => ({ ...prev, totalSats: total }));
      }
    };

    fetchTotalSats();

    // Suscribirse a cambios en community_contributions en tiempo real
    const contributionsChannel = supabase
      .channel("community_contributions_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_contributions",
        },
        (payload) => {
          const newContribution = payload.new as any;
          if (newContribution.status === "confirmed") {
            setStats((prev) => ({
              ...prev,
              totalSats: prev.totalSats + newContribution.amount_sats,
            }));
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      channel.unsubscribe();
      contributionsChannel.unsubscribe();
      setIsConnected(false);
    };
  }, [userId, displayName]);

  return {
    ...stats,
    isConnected,
  };
}
