"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import type { Planet } from '@/types/socket';
import { getOrCreateUserId } from '@/lib/userId';

interface PlanetPresencePayload {
  userId: string;
  color: string;
  userName?: string;
  joinedAt: string;
  orbitRadius: number;
  orbitSpeed: number;
  size: number;
}

const MOCK_PLANETS: Planet[] = [
  {
    id: 'mock-1',
    userId: 'mock-1',
    color: '#FF6B6B',
    position: [0, 0, 0],
    orbitRadius: 8,
    orbitSpeed: 0.3,
    size: 0.8,
    isUser: false,
  },
  {
    id: 'mock-2',
    userId: 'mock-2',
    color: '#4ECDC4',
    position: [0, 0, 0],
    orbitRadius: 12,
    orbitSpeed: 0.2,
    size: 1,
    isUser: false,
  },
  {
    id: 'mock-3',
    userId: 'mock-3',
    color: '#95E1D3',
    position: [0, 0, 0],
    orbitRadius: 16,
    orbitSpeed: 0.15,
    size: 0.9,
    isUser: false,
  },
  {
    id: 'mock-4',
    userId: 'mock-4',
    color: '#F38181',
    position: [0, 0, 0],
    orbitRadius: 20,
    orbitSpeed: 0.12,
    size: 1.1,
    isUser: false,
  },
];

function createSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    console.warn('Supabase URL or anon key missing; realtime planet features disabled');
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

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

function mulberry32(a: number) {
  let t = a;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function derivePlanetAttributes(userId: string) {
  const random = mulberry32(hashString(userId));
  return {
    orbitRadius: 18 + random() * 14, // 18 - 32
    orbitSpeed: 0.08 + random() * 0.12, // 0.08 - 0.2
    size: 0.7 + random() * 0.5, // 0.7 - 1.2
  } satisfies Pick<PlanetPresencePayload, 'orbitRadius' | 'orbitSpeed' | 'size'>;
}

function presenceToPlanet(presence: PlanetPresencePayload, selfId: string): Planet {
  return {
    id: presence.userId,
    userId: presence.userId,
    color: presence.color,
    position: [0, 0, 0],
    orbitRadius: presence.orbitRadius,
    orbitSpeed: presence.orbitSpeed,
    size: presence.size,
    isUser: presence.userId === selfId,
    userName: presence.userName,
  };
}

export function useSocket() {
  const [planets, setPlanets] = useState<Planet[]>(MOCK_PLANETS);
  const [myPlanetId, setMyPlanetId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);

  const supabaseRef = useRef<SupabaseClient | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceKeyRef = useRef<string>('');
  const lastPresenceRef = useRef<PlanetPresencePayload | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      presenceKeyRef.current = getOrCreateUserId();
    } catch (err) {
      console.error('Failed to initialize user id for socket', err);
      presenceKeyRef.current = `temp-${Math.random().toString(36).slice(2, 10)}`;
    } finally {
      setIsClientReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isClientReady) {
      return;
    }

    const supabase = createSupabaseClient();
    supabaseRef.current = supabase;

    if (!supabase) {
      setIsConnected(false);
      setPlanets(MOCK_PLANETS);
      return;
    }

    const channel = supabase.channel('planets-realtime', {
      config: {
        presence: {
          key: presenceKeyRef.current,
        },
      },
    });

    channelRef.current = channel;

    const handleSync = () => {
      const state = channel.presenceState() as Record<string, PlanetPresencePayload[]>;
      const members = Object.values(state).flat();
      const dynamicPlanets = members.map((member) => presenceToPlanet(member, presenceKeyRef.current));
      setPlanets([...MOCK_PLANETS, ...dynamicPlanets]);
      const selfPresence = members.find((member) => member.userId === presenceKeyRef.current) || null;
      setMyPlanetId(selfPresence ? selfPresence.userId : null);
      setIsConnected(true);
    };

    channel
      .on('presence', { event: 'sync' }, handleSync)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          if (lastPresenceRef.current) {
            try {
              await channel.track(lastPresenceRef.current);
            } catch (trackErr) {
              console.error('Failed to restore planet presence', trackErr);
            }
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    return () => {
      channel.unsubscribe().catch(() => {});
      channelRef.current = null;
      setIsConnected(false);
      setPlanets(MOCK_PLANETS);
      setMyPlanetId(null);
    };
  }, [isClientReady]);

  const joinAsPlanet = useCallback(({
    color,
    userId,
    userName,
  }: {
    color: string;
    userId: string;
    userName?: string;
  }) => {
    const channel = channelRef.current;
    if (!channel) return;

    presenceKeyRef.current = userId;
    const attributes = derivePlanetAttributes(userId);
    const payload: PlanetPresencePayload = {
      userId,
      color,
      userName,
      joinedAt: new Date().toISOString(),
      ...attributes,
    };

    lastPresenceRef.current = payload;

    channel
      .track(payload)
      .then(() => {
        setMyPlanetId(payload.userId);
      })
      .catch((err: unknown) => {
        console.error('Failed to announce planet presence', err);
      });
  }, []);

  const updateColor = useCallback((color: string) => {
    const channel = channelRef.current;
    if (!channel || !lastPresenceRef.current) return;

    const updated: PlanetPresencePayload = {
      ...lastPresenceRef.current,
      color,
    };

    lastPresenceRef.current = updated;

    channel
      .track(updated)
      .catch((err: unknown) => {
        console.error('Failed to update planet color', err);
      });
  }, []);

  const leavePlanet = useCallback(() => {
    const channel = channelRef.current;
    if (!channel) return;

    channel.untrack().catch(() => {});
    lastPresenceRef.current = null;
    setMyPlanetId(null);
  }, []);

  return {
    planets,
    myPlanetId,
    isConnected,
    joinAsPlanet,
    updateColor,
    leavePlanet,
  };
}
