"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface DonationRecord {
  id: string;
  displayName: string;
  btcAddress: string;
  amountBtc: number;
  message?: string;
  orbitStyle?: string;
  createdAt: Date;
}

interface PresenceMember {
  id: string;
  alias: string;
  joinedAt: string;
}

interface UseRealtimeDonationsOptions {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

interface UseRealtimeDonationsResult {
  donations: DonationRecord[];
  totalBtc: number;
  onlineMembers: PresenceMember[];
  status: "idle" | "connecting" | "ready" | "error";
  error?: string;
  addDonation: (input: {
    displayName: string;
    btcAddress: string;
    amountBtc: number;
    message?: string;
    orbitStyle?: string;
  }) => Promise<void>;
}

const fallbackNames = [
  "Amanecer",
  "Estrella",
  "Galaxia",
  "Orbit",
  "Photon",
  "Nova",
  "Aurora",
  "Quasar",
];

function loadOrCreateAlias() {
  if (typeof window === "undefined") {
    return "Explorador";
  }

  const storageKey = "btc-donation-alias";
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;

  const name = fallbackNames[Math.floor(Math.random() * fallbackNames.length)];
  const suffix = Math.floor(100 + Math.random() * 900);
  const alias = `${name}-${suffix}`;
  window.localStorage.setItem(storageKey, alias);
  return alias;
}

function loadOrCreateViewerId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
}

function createSupabaseClient(options?: UseRealtimeDonationsOptions): SupabaseClient | null {
  const url = options?.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = options?.supabaseAnonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    console.warn("Supabase URL or anon key missing; realtime features disabled");
    return null;
  }

  return createClient(url, anon, {
    realtime: {
      params: {
        eventsPerSecond: 5,
      },
    },
  });
}

export function useRealtimeDonations(options?: UseRealtimeDonationsOptions): UseRealtimeDonationsResult {
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [totalBtc, setTotalBtc] = useState(0);
  const [onlineMembers, setOnlineMembers] = useState<PresenceMember[]>([]);
  const [status, setStatus] = useState<"idle" | "connecting" | "ready" | "error">("idle");
  const [error, setError] = useState<string>();
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const presenceKeyRef = useRef(loadOrCreateViewerId());
  const aliasRef = useRef(loadOrCreateAlias());

  // Fetch initial snapshot from Next.js API
  const loadInitial = useCallback(async () => {
    try {
      setStatus("connecting");
      const response = await fetch("/api/donations", {
        method: "GET",
        credentials: "same-origin",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch donations: ${response.status}`);
      }
      const data = await response.json();
      const parsed: DonationRecord[] = (data.donations as any[]).map((entry) => ({
        id: entry.id,
        displayName: entry.displayName,
        btcAddress: entry.btcAddress,
        amountBtc: Number(entry.amountBtc),
        message: entry.message || undefined,
        orbitStyle: entry.orbitStyle || undefined,
        createdAt: new Date(entry.createdAt),
      }));
      setDonations(parsed);
      setTotalBtc(Number(data.totalBtc ?? 0));
      setStatus("ready");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // Setup Supabase realtime subscriptions
  useEffect(() => {
    const supabase = createSupabaseClient(options);
    supabaseRef.current = supabase;

    if (!supabase) {
      return;
    }

    const donationChannel = supabase
      .channel("donations-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "donations",
        },
        (payload) => {
          setDonations((current) => {
            const exists = current.some((entry) => entry.id === payload.new.id);
            if (exists) return current;
            const record: DonationRecord = {
              id: payload.new.id as string,
              displayName: payload.new.display_name as string,
              btcAddress: payload.new.btc_address as string,
              amountBtc: Number(payload.new.amount_btc),
              message: (payload.new.message as string | null) ?? undefined,
              orbitStyle: (payload.new.orbit_style as string | null) ?? undefined,
              createdAt: new Date(payload.new.created_at as string),
            };
            return [...current, record];
          });
          setTotalBtc((value) => value + Number(payload.new.amount_btc));
        }
      )
      .subscribe();

    const presenceChannel = supabase
      .channel("presence:donation-lobby", {
        config: {
          presence: {
            key: presenceKeyRef.current,
          },
        },
      })
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState() as Record<string, PresenceMember[]>;
        const members: PresenceMember[] = Object.values(state).flat();
        setOnlineMembers(members);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            id: presenceKeyRef.current,
            alias: aliasRef.current,
            joinedAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      donationChannel.unsubscribe().catch(() => {});
      presenceChannel.unsubscribe().catch(() => {});
    };
  }, [options]);

  const addDonation = useCallback<UseRealtimeDonationsResult["addDonation"]>(
    async (input) => {
      const response = await fetch("/api/donations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const message = errorPayload?.error ?? "Failed to add donation";
        throw new Error(message);
      }

      // Optimistic updates handled via realtime; no local change here.
    },
    []
  );

  const sortedDonations = useMemo(
    () => [...donations].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    [donations]
  );

  return {
    donations: sortedDonations,
    totalBtc,
    onlineMembers,
    status,
    error,
    addDonation,
  };
}
