import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { withDb } from "@/lib/db";
import { getCommunityPotStatus } from "@/lib/communityPot";

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const status = await withDb((db) => getCommunityPotStatus(db, user?.id ?? null));

    return NextResponse.json(status, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("GET /api/community-pot/status", error);
    return NextResponse.json({ error: "Unable to load community pot data" }, { status: 500 });
  }
}
