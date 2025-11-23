import { useCallback, useEffect, useMemo, useState } from "react";
import {
  COMMUNITY_POT_META_COOKIE,
  type CommunityPotMetaCookiePayload,
  parseMetaCookie,
} from "@/lib/communityPotCookies";

interface CommunityPotParticipantView {
  id: string;
  displayName: string;
  polygonAddress: string;
  joinedAt: string;
  isViewer: boolean;
}

interface CommunityPotWeekView {
  id: string;
  label: string;
  status: string;
  amountUsdc: string;
  weekStartAt: string;
  distributionAt: string;
  participantCount: number;
  maxParticipants: number;
  spotsRemaining: number;
  countdownSeconds: number;
  isTestnet: boolean;
}

interface CommunityPotState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  week: CommunityPotWeekView | null;
  participants: CommunityPotParticipantView[];
  perParticipantAmountUsdc: string | null;
  viewerAddress: string | null;
  viewerJoinedWeekId: string | null;
}

const INITIAL_STATE: CommunityPotState = {
  loading: true,
  refreshing: false,
  error: null,
  week: null,
  participants: [],
  perParticipantAmountUsdc: null,
  viewerAddress: null,
  viewerJoinedWeekId: null,
};

function readMetaCookie(): CommunityPotMetaCookiePayload | null {
  if (typeof document === "undefined") {
    return null;
  }

  const prefix = `${COMMUNITY_POT_META_COOKIE}=`;
  const rawPair = document.cookie
    .split("; ")
    .find((chunk) => chunk.startsWith(prefix));

  if (!rawPair) {
    return null;
  }

  try {
    const value = decodeURIComponent(rawPair.slice(prefix.length));
    return parseMetaCookie(value);
  } catch {
    return null;
  }
}

function formatCountdown(seconds: number) {
  const clamped = Math.max(0, seconds);
  const days = Math.floor(clamped / 86400);
  const hours = Math.floor((clamped % 86400) / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const secs = clamped % 60;
  return {
    days,
    hours,
    minutes,
    seconds: secs,
    label: [
      days > 0 ? `${days}d` : null,
      `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

async function fetchStatus(): Promise<CommunityPotState> {
  const response = await fetch("/api/community-pot/status", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("No se pudo cargar el estado del Community Pot");
  }
  const payload = await response.json();
  const meta = readMetaCookie();
  const viewerFromServer = payload.viewer?.polygonAddress ?? null;
  const weekId = payload.week?.id ?? null;
  const viewerAddress =
    viewerFromServer ?? (meta && weekId && meta.weekId === weekId ? meta.polygonAddress : null);
  const viewerJoinedWeekId =
    viewerFromServer && weekId
      ? weekId
      : meta && weekId && meta.weekId === weekId
        ? weekId
        : null;
  return {
    loading: false,
    refreshing: false,
    error: null,
    week: payload.week,
    participants: payload.participants,
    perParticipantAmountUsdc: payload.perParticipantAmountUsdc,
    viewerAddress,
    viewerJoinedWeekId,
  };
}

export function useCommunityPot() {
  const [state, setState] = useState<CommunityPotState>(INITIAL_STATE);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [distributionWindowActive, setDistributionWindowActive] = useState(false);
  const [distributionResumeAt, setDistributionResumeAt] = useState<number | null>(null);

  const loadStatus = useCallback(async () => {
    setState((prev) => ({ ...prev, refreshing: true }));
    try {
      const nextState = await fetchStatus();
      setState(nextState);
      setCountdownSeconds(nextState.week?.countdownSeconds ?? 0);
    } catch (error) {
      console.error(error);
      setState((prev) => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: error instanceof Error ? error.message : "Error inesperado",
      }));
    }
  }, []);

  const startDistributionWindow = useCallback((week: CommunityPotWeekView | null) => {
    if (!week) {
      return;
    }
    const distributionTime = new Date(week.distributionAt).getTime();
    if (!Number.isFinite(distributionTime)) {
      return;
    }
    const windowEnd = distributionTime + 60_000;
    const now = Date.now();
    if (now >= windowEnd) {
      return;
    }
    setDistributionWindowActive(true);
    setDistributionResumeAt(windowEnd);
    setCountdownSeconds(0);
  }, []);

  const joinCommunityPot = useCallback(async (polygonAddress: string) => {
    const response = await fetch("/api/community-pot/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ polygonAddress }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const reason = payload?.error ?? "Unable to join";
      throw new Error(reason);
    }

    const payload = await response.json();
    setState({
      loading: false,
      refreshing: false,
      error: null,
      week: payload.week,
      participants: payload.participants,
      perParticipantAmountUsdc: payload.perParticipantAmountUsdc,
      viewerAddress: payload.viewer?.polygonAddress ?? polygonAddress,
      viewerJoinedWeekId: payload.week?.id ?? null,
    });
    setCountdownSeconds(payload.week?.countdownSeconds ?? 0);
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (distributionWindowActive) {
      return;
    }
    const refreshInterval = setInterval(() => {
      loadStatus();
    }, 60_000);
    return () => clearInterval(refreshInterval);
  }, [loadStatus, distributionWindowActive]);

  useEffect(() => {
    setCountdownSeconds(state.week?.countdownSeconds ?? 0);
  }, [state.week?.countdownSeconds]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!state.week) {
      return;
    }
    if (distributionWindowActive) {
      return;
    }
    const distributionTime = new Date(state.week.distributionAt).getTime();
    if (!Number.isFinite(distributionTime)) {
      return;
    }
    const now = Date.now();
    if (now >= distributionTime && now < distributionTime + 60_000) {
      startDistributionWindow(state.week);
    }
  }, [state.week, distributionWindowActive, startDistributionWindow]);

  useEffect(() => {
    if (!state.week) {
      return;
    }
    if (distributionWindowActive) {
      return;
    }
    if (countdownSeconds > 0) {
      return;
    }
    startDistributionWindow(state.week);
  }, [countdownSeconds, distributionWindowActive, state.week, startDistributionWindow]);

  useEffect(() => {
    if (!distributionWindowActive || distributionResumeAt == null) {
      return;
    }
    const now = Date.now();
    const delay = Math.max(0, distributionResumeAt - now);
    const timeout = window.setTimeout(() => {
      setDistributionWindowActive(false);
      setDistributionResumeAt(null);
      loadStatus().catch((error) => {
        console.error("Failed to refresh community pot after distribution", error);
      });
    }, delay);
    return () => clearTimeout(timeout);
  }, [distributionWindowActive, distributionResumeAt, loadStatus]);

  const countdown = useMemo(() => formatCountdown(countdownSeconds), [countdownSeconds]);

  return {
    ...state,
    countdown,
    joinCommunityPot,
    refresh: () => {
      if (distributionWindowActive) {
        return Promise.resolve();
      }
      return loadStatus();
    },
    viewerHasCurrentSlot: Boolean(state.week?.id && state.viewerJoinedWeekId === state.week.id),
    distributionWindowActive,
    distributionResumeAt,
  };
}
