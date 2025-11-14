import { DateTime } from "luxon";
import type { Pool } from "pg";

export const COMMUNITY_POT_TIMEZONE = "Europe/Berlin"; // CET/CEST
const DISTRIBUTION_WEEKDAY = 7; // Sunday
const DISTRIBUTION_HOUR = 16;
const DISTRIBUTION_MINUTE = 30;

export type CommunityPotWeekStatus = "open" | "closed" | "paid";

export interface CommunityPotWeekRow {
  id: string;
  week_label: string;
  week_start_at: Date;
  distribution_at: Date;
  amount_usdc: string;
  max_participants: number;
  status: CommunityPotWeekStatus;
  executed_at: Date | null;
  executed_tx_hash: string | null;
  execution_error: string | null;
}

export interface CommunityPotParticipantRow {
  id: string;
  week_id: string;
  user_id: string;
  polygon_address: string;
  joined_at: Date;
  display_name: string;
}

export interface CommunityPotStatusPayload {
  week: {
    id: string;
    label: string;
    status: CommunityPotWeekStatus;
    amountUsdc: string;
    weekStartAt: string;
    distributionAt: string;
    participantCount: number;
    maxParticipants: number;
    spotsRemaining: number;
    countdownSeconds: number;
  };
  participants: Array<{
    id: string;
    displayName: string;
    polygonAddress: string;
    joinedAt: string;
    isViewer: boolean;
  }>;
  viewer: {
    participantId: string | null;
    polygonAddress: string | null;
  };
  perParticipantAmountUsdc: string | null;
}

interface UpcomingWeekSchedule {
  weekLabel: string;
  weekStartAtUtc: DateTime;
  distributionAtUtc: DateTime;
}

function normalizeReference(now?: DateTime) {
  return (now ?? DateTime.now()).setZone(COMMUNITY_POT_TIMEZONE);
}

function buildSchedule(reference?: DateTime): UpcomingWeekSchedule {
  const zoned = normalizeReference(reference);

  const setDistribution = (base: DateTime) =>
    base.set({
      weekday: DISTRIBUTION_WEEKDAY,
      hour: DISTRIBUTION_HOUR,
      minute: DISTRIBUTION_MINUTE,
      second: 0,
      millisecond: 0,
    });

  let distribution = setDistribution(zoned);
  if (zoned > distribution) {
    distribution = setDistribution(zoned.plus({ weeks: 1 }));
  }

  const weekStart = distribution.minus({ days: 6 }).startOf("day");

  return {
    weekLabel: distribution.toFormat("yyyy-LL-dd"),
    weekStartAtUtc: weekStart.setZone("UTC"),
    distributionAtUtc: distribution.setZone("UTC"),
  };
}

export async function ensureUpcomingCommunityPotWeek(db: Pool): Promise<CommunityPotWeekRow> {
  const schedule = buildSchedule();

  const existing = await db.query<CommunityPotWeekRow>(
    `select id,
            week_label,
            week_start_at,
            distribution_at,
            amount_usdc,
            max_participants,
            status,
            executed_at,
            executed_tx_hash,
            execution_error
       from public.community_pot_weeks
      where week_label = $1
      limit 1`,
    [schedule.weekLabel]
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const inserted = await db.query<CommunityPotWeekRow>(
    `insert into public.community_pot_weeks (week_label, week_start_at, distribution_at)
     values ($1, $2, $3)
     returning id,
               week_label,
               week_start_at,
               distribution_at,
               amount_usdc,
               max_participants,
               status,
               executed_at,
               executed_tx_hash,
               execution_error`,
    [schedule.weekLabel, schedule.weekStartAtUtc.toJSDate(), schedule.distributionAtUtc.toJSDate()]
  );

  return inserted.rows[0];
}

export async function fetchCommunityPotParticipants(db: Pool, weekId: string): Promise<CommunityPotParticipantRow[]> {
  const result = await db.query<CommunityPotParticipantRow>(
    `select p.id,
            p.week_id,
            p.user_id,
            p.polygon_address,
            p.joined_at,
            coalesce(up.preferred_name, up.display_name, 'Orbit Friend') as display_name
       from public.community_pot_participants p
  left join public.user_profiles up on up.user_id = p.user_id
      where p.week_id = $1
      order by p.joined_at asc`,
    [weekId]
  );

  return result.rows;
}

export async function markWeekClosedIfFull(db: Pool, weekId: string): Promise<void> {
  await db.query(
    `update public.community_pot_weeks w
        set status = 'closed'
      where w.id = $1
        and w.status = 'open'
        and (select count(*) from public.community_pot_participants cpp where cpp.week_id = w.id) >= w.max_participants`,
    [weekId]
  );
}

export async function findPayableWeek(db: Pool): Promise<CommunityPotWeekRow | null> {
  const result = await db.query<CommunityPotWeekRow>(
    `select id,
            week_label,
            week_start_at,
            distribution_at,
            amount_usdc,
            max_participants,
            status,
            executed_at,
            executed_tx_hash,
            execution_error
       from public.community_pot_weeks
      where status <> 'paid'
        and distribution_at <= timezone('utc', now())
      order by distribution_at asc
      limit 1`
  );

  return result.rows[0] ?? null;
}

function calculateCountdownSeconds(distributionAt: Date): number {
  const now = Date.now();
  const target = distributionAt.getTime();
  return Math.max(0, Math.floor((target - now) / 1000));
}

export async function getCommunityPotStatus(db: Pool, userId?: string | null): Promise<CommunityPotStatusPayload> {
  const week = await ensureUpcomingCommunityPotWeek(db);
  const participants = await fetchCommunityPotParticipants(db, week.id);
  const participantCount = participants.length;
  const spotsRemaining = Math.max(week.max_participants - participantCount, 0);
  const countdownSeconds = calculateCountdownSeconds(week.distribution_at);

  const viewerParticipant = userId ? participants.find((p) => p.user_id === userId) ?? null : null;

  const amountUsdc = week.amount_usdc ?? "0";
  const amountAsNumber = Number(amountUsdc);
  const perParticipantAmount = participantCount > 0 && amountAsNumber > 0
    ? (amountAsNumber / participantCount).toFixed(2)
    : participantCount > 0
      ? "0.00"
      : null;

  return {
    week: {
      id: week.id,
      label: week.week_label,
      status: week.status,
      amountUsdc,
      weekStartAt: week.week_start_at.toISOString(),
      distributionAt: week.distribution_at.toISOString(),
      participantCount,
      maxParticipants: week.max_participants,
      spotsRemaining,
      countdownSeconds,
    },
    participants: participants.map((participant) => ({
      id: participant.id,
      displayName: participant.display_name,
      polygonAddress: participant.polygon_address,
      joinedAt: participant.joined_at.toISOString(),
      isViewer: participant.user_id === userId,
    })),
    viewer: {
      participantId: viewerParticipant?.id ?? null,
      polygonAddress: viewerParticipant?.polygon_address ?? null,
    },
    perParticipantAmountUsdc: perParticipantAmount,
  };
}

export function formatPolygonAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
