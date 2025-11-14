import { NextResponse } from "next/server";
import { executeCommunityPotPayout } from "@/lib/communityPotPayout";

function extractSecret(request: Request) {
  const headerSecret = request.headers.get("x-community-pot-secret");
  if (headerSecret) return headerSecret;
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }
  return null;
}

export async function POST(request: Request) {
  const configuredSecret = process.env.COMMUNITY_POT_PAYOUT_SECRET;
  if (!configuredSecret) {
    console.error("COMMUNITY_POT_PAYOUT_SECRET is not configured");
    return NextResponse.json({ error: "missing_secret" }, { status: 500 });
  }

  const providedSecret = extractSecret(request);
  if (providedSecret !== configuredSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "true";

  try {
    const result = await executeCommunityPotPayout({ dryRun });
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/community-pot/payout", error);
    return NextResponse.json({ error: "payout_failed" }, { status: 500 });
  }
}
