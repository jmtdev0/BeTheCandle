// DEPRECATED: This file used the old community_pot_weeks schema which no longer exists.
// The payout logic has been migrated to Supabase Edge Functions and RPC calls.
// Keeping this file for reference only - do not use in production.

export interface ExecuteCommunityPotPayoutOptions {
  dryRun?: boolean;
}

export interface CommunityPotPayoutResult {
  status: "success" | "skipped";
  dryRun: boolean;
  message: string;
  processedWeekId?: string;
  processedWeekLabel?: string;
  participantCount?: number;
  perParticipantAmountUsdc?: string | null;
  totalAmountUsdc?: string;
  transactionHashes?: string[];
}

export async function executeCommunityPotPayout(
  { dryRun = false }: ExecuteCommunityPotPayoutOptions = {}
): Promise<CommunityPotPayoutResult> {
  throw new Error("executeCommunityPotPayout is deprecated. Use Supabase Edge Function instead.");
}
