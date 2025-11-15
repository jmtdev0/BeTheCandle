import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { withDb } from "@/lib/db";
import { getCommunityPotStatus } from "@/lib/communityPot";
import { COMMUNITY_POT_VISITOR_COOKIE } from "@/lib/communityPotCookies";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const visitorId = cookieStore.get(COMMUNITY_POT_VISITOR_COOKIE)?.value ?? null;
    const status = await withDb((db) => getCommunityPotStatus(db, visitorId));

    return NextResponse.json(status, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("GET /api/community-pot/status", error);
    return NextResponse.json({ error: "Unable to load community pot data" }, { status: 500 });
  }
}
