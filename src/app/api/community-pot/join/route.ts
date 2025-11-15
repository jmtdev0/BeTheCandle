import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { z } from "zod";
import type { DatabaseError } from "pg";
import { withDb } from "@/lib/db";
import {
  ensureUpcomingCommunityPotWeek,
  getCommunityPotStatus,
  markWeekClosedIfFull,
} from "@/lib/communityPot";
import {
  COMMUNITY_POT_META_COOKIE,
  COMMUNITY_POT_VISITOR_COOKIE,
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

    const parsed = joinSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_address" }, { status: 400 });
    }

    const normalizedAddress = parsed.data.polygonAddress.toLowerCase();

    const status = await withDb(async (db) => {
      if (!visitorId) {
        visitorId = randomUUID();
      }

      await ensureVisitorUser(db, visitorId);
      const week = await ensureUpcomingCommunityPotWeek(db);

      await db.query(
        `insert into public.community_pot_participants (week_id, user_id, polygon_address)
         values ($1, $2, $3)
         on conflict (week_id, user_id)
         do update set polygon_address = excluded.polygon_address`,
        [week.id, visitorId, normalizedAddress]
      );

      await markWeekClosedIfFull(db, week.id);
      return getCommunityPotStatus(db, visitorId);
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
    const pgError = error as DatabaseError & { code?: string };
    if (pgError?.code === "23505") {
      return NextResponse.json({ error: "address_in_use" }, { status: 409 });
    }

    console.error("POST /api/community-pot/join", error);
    return NextResponse.json({ error: "Unable to join community pot" }, { status: 500 });
  }
}
