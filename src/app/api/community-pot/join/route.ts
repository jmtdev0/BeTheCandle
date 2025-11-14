import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { z } from "zod";
import type { DatabaseError } from "pg";
import { withDb } from "@/lib/db";
import {
  ensureUpcomingCommunityPotWeek,
  getCommunityPotStatus,
  markWeekClosedIfFull,
} from "@/lib/communityPot";

const joinSchema = z.object({
  polygonAddress: z
    .string()
    .trim()
    .regex(/^0x[0-9a-fA-F]{40}$/, "Invalid Polygon address"),
});

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    const parsed = joinSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_address" }, { status: 400 });
    }

    const normalizedAddress = parsed.data.polygonAddress.toLowerCase();

    const status = await withDb(async (db) => {
      const week = await ensureUpcomingCommunityPotWeek(db);

      await db.query(
        `insert into public.community_pot_participants (week_id, user_id, polygon_address)
         values ($1, $2, $3)
         on conflict (week_id, user_id)
         do update set polygon_address = excluded.polygon_address`,
        [week.id, user.id, normalizedAddress]
      );

      await markWeekClosedIfFull(db, week.id);
      return getCommunityPotStatus(db, user.id);
    });

    return NextResponse.json(status, { status: 201 });
  } catch (error) {
    const pgError = error as DatabaseError & { code?: string };
    if (pgError?.code === "23505") {
      return NextResponse.json({ error: "address_in_use" }, { status: 409 });
    }

    console.error("POST /api/community-pot/join", error);
    return NextResponse.json({ error: "Unable to join community pot" }, { status: 500 });
  }
}
