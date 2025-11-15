import type { Pool } from "pg";

export function formatVisitorDisplayName(visitorId: string): string {
  const compact = visitorId.replace(/-/g, "").slice(0, 6);
  return `Visitor ${compact}`;
}

export async function ensureVisitorUser(db: Pool, visitorId: string): Promise<void> {
  const displayName = formatVisitorDisplayName(visitorId);

  await db.query(
    `insert into public.users (id, display_name, last_seen_at)
     values ($1, $2, timezone('utc', now()))
     on conflict (id) do update
       set display_name = excluded.display_name,
           last_seen_at = timezone('utc', now())`,
    [visitorId, displayName]
  );

  await db.query(
    `insert into public.user_profiles (user_id, display_name, updated_at)
     values ($1, $2, timezone('utc', now()))
     on conflict (user_id) do update
       set display_name = excluded.display_name,
           updated_at = timezone('utc', now())`,
    [visitorId, displayName]
  );
}
