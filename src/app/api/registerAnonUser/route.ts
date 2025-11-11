import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const payloadSchema = z.object({
  userId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = payloadSchema.parse(body);

    const supabase = getSupabaseAdminClient();

    const { data: existing, error: fetchError } = await supabase
      .from("users")
      .select("id, display_name, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("registerAnonUser: failed to fetch existing user", fetchError);
      return NextResponse.json({ error: "Failed to check user" }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ user: existing, created: false });
    }

    const baseLabel = userId.replace(/-/g, "").slice(0, 6);
    const displayName = `Visitor ${baseLabel}`;

    const { data: inserted, error: insertError } = await supabase
      .from("users")
      .insert({
        id: userId,
        display_name: displayName,
      })
      .select("id, display_name, created_at")
      .single();

    if (insertError || !inserted) {
      console.error("registerAnonUser: failed to insert user", insertError);
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    const profileResult = await supabase
      .from("user_profiles")
      .insert({ display_name: displayName })
      .select("display_name")
      .single();

    if (profileResult.error && profileResult.error.code !== "23505") {
      console.error("registerAnonUser: profile insert error", profileResult.error);
    }

    return NextResponse.json({ user: inserted, created: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    console.error("registerAnonUser: unexpected error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
