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

const joinSchema = z.object({
  polygonAddress: z
    .string()
    .trim()
    .regex(/^0x[0-9a-fA-F]{40}$/, "Invalid Polygon address"),
});

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    let visitorId = cookieStore.get(COMMUNITY_POT_VISITOR_COOKIE)?.value ?? null;
    const metaCookieRaw = cookieStore.get(COMMUNITY_POT_META_COOKIE)?.value ?? null;
    const meta = parseMetaCookie(metaCookieRaw);

    const parsed = joinSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_address" }, { status: 400 });
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
