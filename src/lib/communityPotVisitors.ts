import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export function formatVisitorDisplayName(visitorId: string): string {
  const compact = visitorId.replace(/-/g, "").slice(0, 6);
  return `Visitor ${compact}`;
}

export async function ensureVisitorUser(visitorId: string): Promise<void> {
  const displayName = formatVisitorDisplayName(visitorId);
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.rpc("community_pot_ensure_visitor_profile", {
    p_user_id: visitorId,
    p_display_name: displayName,
  });

  if (error) {
    throw error;
  }
}
