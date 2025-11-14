import { erc20Abi, createPublicClient, createWalletClient, http, type Address, type Hex } from "viem";
import { polygon } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { withDb } from "@/lib/db";
import {
  fetchCommunityPotParticipants,
  findPayableWeek,
  type CommunityPotParticipantRow,
  type CommunityPotWeekRow,
} from "@/lib/communityPot";

const USDC_DECIMALS = 6;
const USDC_FACTOR = BigInt(10 ** USDC_DECIMALS);
const DEFAULT_POLYGON_USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

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

interface ParticipantPayoutPlan {
  participant: CommunityPotParticipantRow;
  amountUnits: bigint;
}

function normalizePrivateKey(key: string): Hex {
  return (key.startsWith("0x") ? key : `0x${key}`) as Hex;
}

function decimalToUnits(amount: string): bigint {
  const trimmed = amount.trim();
  if (!trimmed) return 0n;

  const negative = trimmed.startsWith("-");
  if (negative) {
    throw new Error("Community pot amount cannot be negative");
  }

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

function buildPayoutPlan(totalUnits: bigint, participants: CommunityPotParticipantRow[]): ParticipantPayoutPlan[] {
  const count = BigInt(participants.length);
  if (count === 0n) return [];

  const baseAmount = totalUnits / count;
  const remainder = totalUnits % count;
  if (baseAmount === 0n) {
    throw new Error("Configured weekly amount is too small for the current participant count");
  }

  return participants.map((participant, index) => ({
    participant,
    amountUnits: baseAmount + (BigInt(index) < remainder ? 1n : 0n),
  }));
}

async function sendUsdcTransfers(
  plans: ParticipantPayoutPlan[],
  options: { rpcUrl: string; privateKey: Hex; contractAddress: Address }
) {
  const account = privateKeyToAccount(options.privateKey);
  const walletClient = createWalletClient({
    account,
    chain: polygon,
    transport: http(options.rpcUrl),
  });
  const publicClient = createPublicClient({
    chain: polygon,
    transport: http(options.rpcUrl),
  });

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

export async function executeCommunityPotPayout(
  { dryRun = false }: ExecuteCommunityPotPayoutOptions = {}
): Promise<CommunityPotPayoutResult> {
  let lastWeekProcessed: CommunityPotWeekRow | null = null;

  try {
    return await withDb(async (db) => {
      const week = await findPayableWeek(db);
      if (!week) {
        return {
          status: "skipped",
          dryRun,
          message: "No pending community pot week is ready for payout",
        };
      }

      lastWeekProcessed = week;
      const participants = await fetchCommunityPotParticipants(db, week.id);

      const totalUnits = decimalToUnits(week.amount_usdc ?? "0");
      const totalAmountUsdc = week.amount_usdc ?? "0";

      if (participants.length === 0 || totalUnits === 0n) {
        if (dryRun) {
          return {
            status: "skipped",
            dryRun,
            message: `Week ${week.week_label} has no funds or participants`,
            processedWeekId: week.id,
            processedWeekLabel: week.week_label,
            participantCount: 0,
            totalAmountUsdc,
            perParticipantAmountUsdc: null,
          };
        }

        await db.query(
          `update public.community_pot_weeks
              set status = 'paid',
                  executed_at = timezone('utc', now()),
                  execution_error = null,
                  executed_tx_hash = null
            where id = $1`,
          [week.id]
        );

        await db.query(
          `insert into public.community_pot_payout_logs
              (week_id, total_amount_usdc, participant_count, per_participant_amount_usdc, transaction_hash, transaction_url, payload)
           values ($1, $2, 0, '0', null, null, $3)`,
          [week.id, totalAmountUsdc, JSON.stringify({ reason: "no participants or funds" })]
        );

        return {
          status: "success",
          dryRun,
          message: `Week ${week.week_label} closed with no transfers required`,
          processedWeekId: week.id,
          processedWeekLabel: week.week_label,
          participantCount: 0,
          totalAmountUsdc,
          perParticipantAmountUsdc: null,
          transactionHashes: [],
        };
      }

      const payoutPlans = buildPayoutPlan(totalUnits, participants);
      const perParticipantAmountUsdc = unitsToDecimal(payoutPlans[0]?.amountUnits ?? 0n);

      if (dryRun) {
        return {
          status: "skipped",
          dryRun,
          message: `Dry run: would distribute ${perParticipantAmountUsdc} USDC to ${participants.length} participants`,
          processedWeekId: week.id,
          processedWeekLabel: week.week_label,
          participantCount: participants.length,
          totalAmountUsdc,
          perParticipantAmountUsdc,
        };
      }

      const rpcUrl = process.env.COMMUNITY_POT_RPC_URL;
      const privateKey = process.env.COMMUNITY_POT_PAYOUT_PRIVATE_KEY;
      const contractAddress = (process.env.COMMUNITY_POT_USDC_CONTRACT ?? DEFAULT_POLYGON_USDC) as Address;

      if (!rpcUrl) {
        throw new Error("COMMUNITY_POT_RPC_URL is not configured");
      }

      if (!privateKey) {
        throw new Error("COMMUNITY_POT_PAYOUT_PRIVATE_KEY is not configured");
      }

      const transactionHashes = await sendUsdcTransfers(payoutPlans, {
        rpcUrl,
        privateKey: normalizePrivateKey(privateKey),
        contractAddress,
      });

      await db.query(
        `update public.community_pot_weeks
            set status = 'paid',
                executed_at = timezone('utc', now()),
                executed_tx_hash = $2,
                execution_error = null
          where id = $1`,
        [week.id, transactionHashes.at(-1) ?? null]
      );

      await db.query(
        `insert into public.community_pot_payout_logs
            (week_id, total_amount_usdc, participant_count, per_participant_amount_usdc, transaction_hash, transaction_url, payload)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          week.id,
          totalAmountUsdc,
          participants.length,
          perParticipantAmountUsdc,
          transactionHashes.at(-1) ?? null,
          transactionHashes.at(-1) ? `https://polygonscan.com/tx/${transactionHashes.at(-1)}` : null,
          JSON.stringify({
            payouts: payoutPlans.map((plan, index) => ({
              participantId: plan.participant.id,
              polygonAddress: plan.participant.polygon_address,
              amountUnits: plan.amountUnits.toString(),
              transactionHash: transactionHashes[index] ?? null,
            })),
          }),
        ]
      );

      return {
        status: "success",
        dryRun,
        message: `Distributed ${perParticipantAmountUsdc} USDC to ${participants.length} participants`,
        processedWeekId: week.id,
        processedWeekLabel: week.week_label,
        participantCount: participants.length,
        totalAmountUsdc,
        perParticipantAmountUsdc,
        transactionHashes,
      };
    });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Unknown payout error";
    if (lastWeekProcessed) {
      await withDb((db) =>
        db.query(
          `update public.community_pot_weeks
              set execution_error = $2
            where id = $1`,
          [lastWeekProcessed!.id, errMessage.slice(0, 500)]
        )
      );
    }
    throw error;
  }
}
