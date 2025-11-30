"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

const CONSENT_COOKIE_NAME = "cookie_consent";
const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export type ConsentChoice = "all" | "essential" | null;

interface CookieConsentContextValue {
  /** Current consent choice: 'all' (accept all), 'essential' (reject non-essential), or null (not yet chosen) */
  consent: ConsentChoice;
  /** Whether non-essential (preferences) cookies are allowed */
  allowPreferences: boolean;
  /** Accept all cookies */
  acceptAll: () => void;
  /** Reject non-essential cookies (only essential remain) */
  rejectNonEssential: () => void;
  /** Reset consent (for testing/debugging) */
  resetConsent: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

function readConsentCookie(): ConsentChoice {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  const value = decodeURIComponent(match[1]);
  if (value === "all" || value === "essential") return value;
  return null;
}

function writeConsentCookie(value: ConsentChoice) {
  if (typeof document === "undefined" || !value) return;
  document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${CONSENT_COOKIE_MAX_AGE}; SameSite=Lax`;
}

function deleteConsentCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; max-age=0`;
}

// Delete non-essential cookies when user rejects them
function deletePreferenceCookies() {
  if (typeof document === "undefined") return;
  const preferenceCookies = ["music_volume", "music_muted", "satelliteColor"];
  preferenceCookies.forEach((name) => {
    document.cookie = `${name}=; path=/; max-age=0`;
  });
}

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentChoice>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = readConsentCookie();
    setConsent(stored);
  }, []);

  const acceptAll = useCallback(() => {
    writeConsentCookie("all");
    setConsent("all");
  }, []);

  const rejectNonEssential = useCallback(() => {
    writeConsentCookie("essential");
    deletePreferenceCookies();
    setConsent("essential");
  }, []);

  const resetConsent = useCallback(() => {
    deleteConsentCookie();
    setConsent(null);
  }, []);

  const allowPreferences = consent === "all";

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      allowPreferences,
      acceptAll,
      rejectNonEssential,
      resetConsent,
    }),
    [consent, allowPreferences, acceptAll, rejectNonEssential, resetConsent]
  );

  // Avoid hydration mismatch by not rendering context until mounted
  if (!mounted) {
    return (
      <CookieConsentContext.Provider value={{ consent: null, allowPreferences: false, acceptAll: () => {}, rejectNonEssential: () => {}, resetConsent: () => {} }}>
        {children}
      </CookieConsentContext.Provider>
    );
  }

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used within a CookieConsentProvider");
  }
  return ctx;
}
