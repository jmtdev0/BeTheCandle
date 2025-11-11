"use client";

const USER_ID_COOKIE = "btc_user_id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const encoded = encodeURIComponent(value);
  const attributes = [
    `${name}=${encoded}`,
    "path=/",
    `max-age=${COOKIE_MAX_AGE_SECONDS}`,
    "samesite=lax",
  ];
  document.cookie = attributes.join("; ");
}

export function getOrCreateUserId(): string {
  if (typeof window === "undefined") {
    throw new Error("getOrCreateUserId must be called in a browser environment");
  }

  const existing = readCookie(USER_ID_COOKIE);
  if (existing && UUID_REGEX.test(existing)) {
    return existing;
  }

  const newId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

  writeCookie(USER_ID_COOKIE, newId);
  return newId;
}

export function readUserIdCookie(): string | undefined {
  const existing = readCookie(USER_ID_COOKIE);
  return existing && UUID_REGEX.test(existing) ? existing : undefined;
}
