export const COMMUNITY_POT_VISITOR_COOKIE = "community_pot_visitor_id";
export const COMMUNITY_POT_META_COOKIE = "community_pot_join_meta";

export interface CommunityPotMetaCookiePayload {
  weekId: string;
  polygonAddress: string;
  updatedAt: string;
}

export function serializeMetaCookie(data: CommunityPotMetaCookiePayload): string {
  return JSON.stringify(data);
}

export function parseMetaCookie(rawValue: string | undefined | null): CommunityPotMetaCookiePayload | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as CommunityPotMetaCookiePayload;
    if (typeof parsed?.weekId !== "string" || typeof parsed?.polygonAddress !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
