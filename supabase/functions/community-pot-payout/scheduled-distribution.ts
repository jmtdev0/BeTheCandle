import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import {
  erc20Abi,
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
} from "npm:viem";
import { polygon } from "npm:viem/chains";
import { privateKeyToAccount } from "npm:viem/accounts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-community-pot-secret",
};

const USDC_DECIMALS = 6;
const USDC_FACTOR = BigInt(10 ** USDC_DECIMALS);
const DEFAULT_POLYGON_USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

type CommunityPotWeek = {
  id: string;
  week_label: string;
  distribution_at: string;
  amount_usdc: string;
  max_participants: number;
  status: "open" | "closed" | "paid";
};

type CommunityPotParticipant = {
  id: string;
  polygon_address: string;
};

interface PayoutPlan {
  participant: CommunityPotParticipant;
  amountUnits: bigint;
}

function extractSecret(headers: Headers) {
  const headerSecret = headers.get("x-community-pot-secret");
  if (headerSecret) return headerSecret;
  const authHeader = headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }
  return null;
}

function decimalToUnits(amount: string | null): bigint {
  if (!amount) return 0n;
  const trimmed = amount.trim();
  if (!trimmed) return 0n;
  const [wholeRaw, fractionalRaw = ""] = trimmed.split(".");
  const whole = wholeRaw.replace(/[^0-9]/g, "") || "0";
  const fractionalDigits = fractionalRaw.replace(/[^0-9]/g, "");
  const fractional = fractionalDigits.padEnd(USDC_DECIMALS, "0").slice(0, USDC_DECIMALS);
  return BigInt(`${whole}${fractional}`);
}

function unitsToDecimal(units: bigint): string {
  const whole = units / USDC_FACTOR;
  const fractional = units % USDC_FACTOR;
  const fractionalStr = fractional.toString().padStart(USDC_DECIMALS, "0");
  return `${whole}.${fractionalStr}`.replace(/\.0+$/, "");
}

function buildPayoutPlan(totalUnits: bigint, participants: CommunityPotParticipant[]): PayoutPlan[] {
  const count = BigInt(participants.length);
  if (count === 0n) return [];

  const baseAmount = totalUnits / count;
  const remainder = totalUnits % count;

  if (baseAmount === 0n) {
    throw new Error("Configured weekly amount is too small for participant count");
  }

  return participants.map((participant, index) => ({
    participant,
    amountUnits: baseAmount + (BigInt(index) < remainder ? 1n : 0n),
  }));
}

async function sendUsdcTransfers(
  plans: PayoutPlan[],
  options: { rpcUrl: string; privateKey: Hex; contractAddress: Address }
) {
  const account = privateKeyToAccount(options.privateKey);
  const walletClient = createWalletClient({ account, chain: polygon, transport: http(options.rpcUrl) });
  const publicClient = createPublicClient({ chain: polygon, transport: http(options.rpcUrl) });

  const hashes: string[] = [];
  for (const plan of plans) {
    const txHash = await walletClient.writeContract({
      abi: erc20Abi,
      address: options.contractAddress,
      functionName: "transfer",
      args: [plan.participant.polygon_address as Address, plan.amountUnits],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    hashes.push(txHash);
  }
  return hashes;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const secret = Deno.env.get("COMMUNITY_POT_PAYOUT_SECRET");
  if (!secret) {
    return jsonResponse({ error: "missing_secret_env" }, 500);
  }

  if (extractSecret(req.headers) !== secret) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const dryRun = new URL(req.url).searchParams.get("dryRun") === "true";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "missing_supabase_env" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const weekResult = await supabase
      .from("community_pot_weeks")
      .select("id, week_label, distribution_at, amount_usdc, max_participants, status")
      .lte("distribution_at", new Date().toISOString())
      .neq("status", "paid")
      .order("distribution_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (weekResult.error) throw weekResult.error;
    const week = weekResult.data as CommunityPotWeek | null;

    if (!week) {
      return jsonResponse({ status: "skipped", dryRun, message: "No pending week ready for payout" });
    }

    const participantsResult = await supabase
      .from("community_pot_participants")
      .select("id, polygon_address")
      .eq("week_id", week.id)
      .order("joined_at", { ascending: true });

    if (participantsResult.error) throw participantsResult.error;

    const participants = participantsResult.data as CommunityPotParticipant[];
    const totalUnits = decimalToUnits(week.amount_usdc ?? "0");

    if (participants.length === 0 || totalUnits === 0n) {
      if (!dryRun) {
        await supabase
          .from("community_pot_weeks")
          .update({
            status: "paid",
            executed_at: new Date().toISOString(),
            executed_tx_hash: null,
            execution_error: null,
          })
          .eq("id", week.id);

        await supabase.from("community_pot_payout_logs").insert({
          week_id: week.id,
          total_amount_usdc: week.amount_usdc ?? "0",
          participant_count: participants.length,
          per_participant_amount_usdc: "0",
          transaction_hash: null,
          transaction_url: null,
          payload: { reason: "no participants or funds" },
        });
      }

      return jsonResponse({
        status: dryRun ? "skipped" : "success",
        dryRun,
        message: "Week closed without transfers",
        processedWeekId: week.id,
        processedWeekLabel: week.week_label,
        participantCount: participants.length,
        totalAmountUsdc: week.amount_usdc ?? "0",
        perParticipantAmountUsdc: null,
      });
    }

    const payoutPlans = buildPayoutPlan(totalUnits, participants);
    const perParticipantAmountUsdc = unitsToDecimal(payoutPlans[0]?.amountUnits ?? 0n);

    if (dryRun) {
      return jsonResponse({
        status: "skipped",
        dryRun,
        message: `Dry run: would distribute ${perParticipantAmountUsdc} USDC to ${participants.length} wallets`,
        processedWeekId: week.id,
        processedWeekLabel: week.week_label,
        participantCount: participants.length,
        totalAmountUsdc: week.amount_usdc ?? "0",
        perParticipantAmountUsdc,
      });
    }

    const rpcUrl = Deno.env.get("COMMUNITY_POT_RPC_URL");
    const privateKey = Deno.env.get("COMMUNITY_POT_PAYOUT_PRIVATE_KEY");
    const contractAddress = (Deno.env.get("COMMUNITY_POT_USDC_CONTRACT") ?? DEFAULT_POLYGON_USDC) as Address;

    if (!rpcUrl) throw new Error("COMMUNITY_POT_RPC_URL is not configured");
    if (!privateKey) throw new Error("COMMUNITY_POT_PAYOUT_PRIVATE_KEY is not configured");

    const privateKeyHex = (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as Hex;

    const transactionHashes = await sendUsdcTransfers(payoutPlans, {
      rpcUrl,
      privateKey: privateKeyHex,
      contractAddress,
    });

    await supabase
      .from("community_pot_weeks")
      .update({
        status: "paid",
        executed_at: new Date().toISOString(),
        executed_tx_hash: transactionHashes.at(-1) ?? null,
        execution_error: null,
      })
      .eq("id", week.id);

    await supabase.from("community_pot_payout_logs").insert({
      week_id: week.id,
      total_amount_usdc: week.amount_usdc ?? "0",
      participant_count: participants.length,
      per_participant_amount_usdc: perParticipantAmountUsdc,
      transaction_hash: transactionHashes.at(-1) ?? null,
      transaction_url: transactionHashes.at(-1)
        ? `https://polygonscan.com/tx/${transactionHashes.at(-1)}`
        : null,
      payload: {
        payouts: payoutPlans.map((plan, index) => ({
          participantId: plan.participant.id,
          polygonAddress: plan.participant.polygon_address,
          amountUnits: plan.amountUnits.toString(),
          transactionHash: transactionHashes[index] ?? null,
        })),
      },
    });

    return jsonResponse({
      status: "success",
      dryRun: false,
      message: `Distributed ${perParticipantAmountUsdc} USDC to ${participants.length} participants`,
      processedWeekId: week.id,
      processedWeekLabel: week.week_label,
      participantCount: participants.length,
      totalAmountUsdc: week.amount_usdc ?? "0",
      perParticipantAmountUsdc,
      transactionHashes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("community-pot-payout", message);

    try {
      const lastWeekResult = await supabase
        .from("community_pot_weeks")
        .select("id")
        .neq("status", "paid")
        .lte("distribution_at", new Date().toISOString())
        .order("distribution_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (lastWeekResult?.data?.id) {
        await supabase
          .from("community_pot_weeks")
          .update({ execution_error: message.slice(0, 500) })
          .eq("id", lastWeekResult.data.id);
      }
    } catch (updateError) {
      console.error("community-pot-payout error logging failed", updateError);
    }

    return jsonResponse({ error: message }, 500);
  }
});
