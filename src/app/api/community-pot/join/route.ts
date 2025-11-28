import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { joinCommunityPot } from "@/lib/communityPot";
import {
  COMMUNITY_POT_META_COOKIE,
  COMMUNITY_POT_VISITOR_COOKIE,
  parseMetaCookie,
  serializeMetaCookie,
} from "@/lib/communityPotCookies";
import { ensureVisitorUser } from "@/lib/communityPotVisitors";

// Rate limiting: simple in-memory store (resets on server restart)
// For production, consider using Redis/Upstash
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  return false;
}

/**
 * Verify reCAPTCHA token with Google
 */
async function verifyRecaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.error("[join] RECAPTCHA_SECRET_KEY not configured");
    return false;
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();
    return data.success === true;
  } catch (err) {
    console.error("[join] reCAPTCHA verification failed:", err);
    return false;
  }
}

const joinSchema = z.object({
  polygonAddress: z
    .string()
    .trim()
    .regex(/^0x[0-9a-fA-F]{40}$/, "Invalid Polygon address"),
  recaptchaToken: z.string().min(1, "reCAPTCHA token required"),
});

export async function POST(request: Request) {
  try {
    // Rate limiting check
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || request.headers.get("x-real-ip") 
      || "unknown";
    
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "rate_limited", message: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const cookieStore = await cookies();
    let visitorId = cookieStore.get(COMMUNITY_POT_VISITOR_COOKIE)?.value ?? null;
    const metaCookieRaw = cookieStore.get(COMMUNITY_POT_META_COOKIE)?.value ?? null;
    const meta = parseMetaCookie(metaCookieRaw);

    const body = await request.json();
    const parsed = joinSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      if (firstError?.path[0] === "recaptchaToken") {
        return NextResponse.json({ error: "recaptcha_required" }, { status: 400 });
      }
      return NextResponse.json({ error: "invalid_address" }, { status: 400 });
    }

    // Verify reCAPTCHA
    const recaptchaValid = await verifyRecaptcha(parsed.data.recaptchaToken);
    if (!recaptchaValid) {
      return NextResponse.json(
        { error: "recaptcha_failed", message: "reCAPTCHA verification failed. Please try again." },
        { status: 400 }
      );
    }

    const normalizedAddress = parsed.data.polygonAddress.toLowerCase();

    if (!visitorId) {
      visitorId = randomUUID();
    }

    await ensureVisitorUser(visitorId);

    const status = await joinCommunityPot({
      polygonAddress: normalizedAddress,
      previousAddress: meta?.polygonAddress?.toLowerCase() ?? null,
      previousPayoutId: meta?.weekId ?? null,
    });

    const response = NextResponse.json(status, { status: 201 });

    if (visitorId) {
      const secure = process.env.NODE_ENV === "production";
      response.cookies.set(COMMUNITY_POT_VISITOR_COOKIE, visitorId, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure,
        maxAge: 60 * 60 * 24 * 365,
      });

      const metaPayload = serializeMetaCookie({
        weekId: status.week.id,
        polygonAddress: normalizedAddress,
        updatedAt: new Date().toISOString(),
      });

      response.cookies.set(COMMUNITY_POT_META_COOKIE, metaPayload, {
        httpOnly: false,
        path: "/",
        sameSite: "lax",
        secure,
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (error) {
    const supabaseError = error as PostgrestError & { code?: string };
    if (supabaseError?.code === "23505") {
      return NextResponse.json({ error: "address_in_use" }, { status: 409 });
    }

    console.error("POST /api/community-pot/join", error);
    return NextResponse.json({ error: "Unable to join community pot" }, { status: 500 });
  }
}
