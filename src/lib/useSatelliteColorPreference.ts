"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_SATELLITE_COLOR,
  SATELLITE_COLOR_OPTIONS,
  type SatelliteColorOption,
} from "@/lib/satelliteColors";

const COOKIE_NAME = "satelliteColor";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year
const EVENT_NAME = "btc-satellite-color-change";

const isValidOption = (value: string): value is SatelliteColorOption => {
  return SATELLITE_COLOR_OPTIONS.includes(value as SatelliteColorOption);
};

const readCookieValue = (name: string): string | undefined => {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
};

export function useSatelliteColorPreference(initialValue: SatelliteColorOption = DEFAULT_SATELLITE_COLOR) {
  const [color, setColor] = useState<SatelliteColorOption>(initialValue);

  useEffect(() => {
    const cookieValue = readCookieValue(COOKIE_NAME);
    if (cookieValue && isValidOption(cookieValue)) {
      setColor(cookieValue);
    } else if (!cookieValue) {
      document.cookie = `${COOKIE_NAME}=${initialValue}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}`;
    }
  }, [initialValue]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleColorChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const next = customEvent.detail;
      if (next && isValidOption(next) && next !== color) {
        setColor(next);
      }
    };

    window.addEventListener(EVENT_NAME, handleColorChange as EventListener);
    return () => window.removeEventListener(EVENT_NAME, handleColorChange as EventListener);
  }, [color]);

  const updateColor = useCallback((next: SatelliteColorOption) => {
    setColor(next);
    document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}`;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
    }
  }, []);

  return {
    color,
    setColor: updateColor,
    options: SATELLITE_COLOR_OPTIONS,
  } as const;
}
