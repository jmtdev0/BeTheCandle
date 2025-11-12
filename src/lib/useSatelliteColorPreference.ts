"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_SATELLITE_COLOR,
  SATELLITE_COLOR_PRESETS,
  normalizeSatelliteColor,
} from "@/lib/satelliteColors";

const COOKIE_NAME = "satelliteColor";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year
const EVENT_NAME = "btc-satellite-color-change";

const readCookieValue = (name: string): string | undefined => {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
};

const writeCookieValue = (value: string) => {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}`;
};

const broadcastColor = (value: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: value }));
};

export function useSatelliteColorPreference(initialValue?: string) {
  const normalizedInitial = normalizeSatelliteColor(initialValue, DEFAULT_SATELLITE_COLOR);
  const [color, setColor] = useState<string>(normalizedInitial);

  useEffect(() => {
    const cookieValue = readCookieValue(COOKIE_NAME);
    if (!cookieValue) {
      writeCookieValue(normalizedInitial);
      return;
    }

    const normalizedCookie = normalizeSatelliteColor(cookieValue, normalizedInitial);
    setColor((prev) => (prev === normalizedCookie ? prev : normalizedCookie));
  }, [normalizedInitial]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleColorChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const next = normalizeSatelliteColor(customEvent.detail, color);
      if (next && next !== color) {
        setColor(next);
        writeCookieValue(next);
      }
    };

    window.addEventListener(EVENT_NAME, handleColorChange as EventListener);
    return () => window.removeEventListener(EVENT_NAME, handleColorChange as EventListener);
  }, [color]);

  useEffect(() => {
    if (!initialValue) return;
    const normalized = normalizeSatelliteColor(initialValue, DEFAULT_SATELLITE_COLOR);
    if (normalized === color) {
      writeCookieValue(normalized);
      return;
    }

    setColor(normalized);
    writeCookieValue(normalized);
    broadcastColor(normalized);
  }, [initialValue, color]);

  const updateColor = useCallback(
    (next: string) => {
      const normalized = normalizeSatelliteColor(next, DEFAULT_SATELLITE_COLOR);
      if (normalized === color) {
        writeCookieValue(normalized);
        return;
      }

      setColor(normalized);
      writeCookieValue(normalized);
      broadcastColor(normalized);
    },
    [color],
  );

  return {
    color,
    setColor: updateColor,
    presets: SATELLITE_COLOR_PRESETS,
  } as const;
}
