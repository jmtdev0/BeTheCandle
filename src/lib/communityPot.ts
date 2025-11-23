import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const DEFAULT_PAYOUT_AMOUNT_USDC = process.env.COMMUNITY_POT_DEFAULT_AMOUNT_USDC ?? "10.00";
const DEFAULT_MAX_PARTICIPANTS = Number.parseInt(process.env.COMMUNITY_POT_DEFAULT_MAX_PARTICIPANTS ?? "10", 10) || 10;
const DEFAULT_IS_TESTNET = (process.env.COMMUNITY_POT_DEFAULT_IS_TESTNET ?? "true").toLowerCase() === "true";

export type CommunityPotWeekStatus = "open" | "closed" | "paid";

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
    isTestnet: boolean;
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
interface DefaultPayoutConfig {
  amountUsdc: string;
  maxParticipants: number;
  isTestnet: boolean;
}

function readDefaultPayoutConfig(): DefaultPayoutConfig {
  return {
    amountUsdc: DEFAULT_PAYOUT_AMOUNT_USDC,
    maxParticipants: DEFAULT_MAX_PARTICIPANTS,
    isTestnet: DEFAULT_IS_TESTNET,
  };
}

export async function getCommunityPotStatus(viewerAddress?: string | null): Promise<CommunityPotStatusPayload> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("community_pot_get_status", {
    p_viewer_address: viewerAddress ?? null,
  });

  if (error) {
    throw new Error(`Failed to load community pot status: ${error.message}`);
  }

  return data as CommunityPotStatusPayload;
}

export async function joinCommunityPot(params: {
  polygonAddress: string;
  previousAddress?: string | null;
  previousPayoutId?: string | null;
  config?: Partial<DefaultPayoutConfig>;
}): Promise<CommunityPotStatusPayload> {
  const { polygonAddress, previousAddress = null, previousPayoutId = null, config } = params;
  const supabase = getSupabaseAdminClient();
  const defaults = readDefaultPayoutConfig();

  const amount = config?.amountUsdc ?? defaults.amountUsdc;
  const maxParticipants = config?.maxParticipants ?? defaults.maxParticipants;
  const isTestnet = config?.isTestnet ?? defaults.isTestnet;

  const { data, error } = await supabase.rpc("community_pot_join", {
    p_polygon_address: polygonAddress,
    p_previous_address: previousAddress,
    p_previous_payout_id: previousPayoutId,
    p_amount_usdc: Number.parseFloat(amount),
    p_max_participants: maxParticipants,
    p_is_testnet: isTestnet,
  });

  if (error) {
    throw error;
  }

  return data as CommunityPotStatusPayload;
}

export function formatPolygonAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
