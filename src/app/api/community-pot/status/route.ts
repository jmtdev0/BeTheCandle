import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCommunityPotStatus } from "@/lib/communityPot";
import { COMMUNITY_POT_META_COOKIE, parseMetaCookie } from "@/lib/communityPotCookies";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const metaCookie = cookieStore.get(COMMUNITY_POT_META_COOKIE)?.value ?? null;
    const meta = parseMetaCookie(metaCookie);
    const viewerAddress = meta?.polygonAddress ?? null;
    
    const status = await getCommunityPotStatus(viewerAddress);

    return NextResponse.json(status, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("GET /api/community-pot/status", error);
    return NextResponse.json({ error: "Unable to load community pot data" }, { status: 500 });
  }
}
