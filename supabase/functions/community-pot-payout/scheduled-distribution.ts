import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import {
  erc20Abi,
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  type Address,
  type Hex,
  type TransactionReceipt,
  type Chain,
} from "npm:viem";
import { polygon, polygonAmoy } from "npm:viem/chains";
import { privateKeyToAccount } from "npm:viem/accounts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-community-pot-secret",
};

const USDC_DECIMALS = 6;
const USDC_FACTOR = BigInt(10 ** USDC_DECIMALS);
const DEFAULT_POLYGON_USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const DISTRIBUTION_TIMEZONE = "Europe/Berlin";
const DISTRIBUTION_TARGET_WEEKDAY = 0; // Sunday
const DISTRIBUTION_TARGET_HOUR = 16;
const DISTRIBUTION_TARGET_MINUTE = 30;

const WEEKDAY_LOOKUP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getDatePartsForTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const lookup: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      lookup[part.type] = Number(part.value);
    }
  }

  return {
    year: lookup.year,
    month: lookup.month,
    day: lookup.day,
    hour: lookup.hour,
    minute: lookup.minute,
    second: lookup.second,
  };
}

function getTimeZoneOffsetInMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const lookup: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      lookup[part.type] = Number(part.value);
    }
  }

  const interpretedAsUtc = Date.UTC(
    lookup.year,
    lookup.month - 1,
    lookup.day,
    lookup.hour,
    lookup.minute,
    lookup.second,
  );

  return Math.round((interpretedAsUtc - date.getTime()) / 60000);
}

function zonedLocalTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const provisionalUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const offsetMinutes = getTimeZoneOffsetInMinutes(provisionalUtc, timeZone);
  return new Date(provisionalUtc.getTime() - offsetMinutes * 60000);
}

function computeNextDistributionDate(reference: Date = new Date()): Date {
  const timeZone = DISTRIBUTION_TIMEZONE;
  const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  });
  const weekdayKey = weekdayFormatter.format(reference);
  const currentWeekday = WEEKDAY_LOOKUP[weekdayKey] ?? 0;

  const dateParts = getDatePartsForTimeZone(reference, timeZone);
  const currentMinutes = dateParts.hour * 60 + dateParts.minute;
  const targetMinutes = DISTRIBUTION_TARGET_HOUR * 60 + DISTRIBUTION_TARGET_MINUTE;

  let daysAhead = (7 - currentWeekday + DISTRIBUTION_TARGET_WEEKDAY) % 7;
  if (daysAhead === 0 && currentMinutes >= targetMinutes) {
    daysAhead = 7;
  }

  const scheduledUtc = zonedLocalTimeToUtc(
    dateParts.year,
    dateParts.month,
    dateParts.day + daysAhead,
    DISTRIBUTION_TARGET_HOUR,
    DISTRIBUTION_TARGET_MINUTE,
    timeZone,
  );

  return scheduledUtc;
}

type CommunityPotParticipant = {
  polygon_address: string;
  joined_at: string;
};

type CommunityPotPayoutConditionsRow = {
  payout_id: string;
  amount_usdc: string;
  scheduled_at: string;
  is_testnet: boolean;
  max_participants: number;
  execute_immediately: boolean;
};

interface PendingPayout {
  id: string;
  amount_usdc: string;
  scheduled_at: string;
  is_testnet: boolean;
  max_participants: number;
  execute_immediately: boolean;
}

type CommunityPotPayoutStatus = "Pending" | "In Progress" | "Completed" | "Failed";

interface PayoutPlan {
  participant: CommunityPotParticipant;
  amountUnits: bigint;
}

interface CommunityPotPayoutDefaultConfig {
  amount_usdc: string | null;
  max_participants: number | null;
  is_testnet: boolean | null;
  schedule_weekday: number | null;
  schedule_time: string | null;
  schedule_timezone: string | null;
}

interface SentTransaction {
  plan: PayoutPlan;
  hash: Hex;
  blockNumber: bigint | null;
  gasPaidWei: bigint | null;
}

interface RegisterTransactionPayload {
  payoutId: string;
  txHash: string;
  polygonAddress: string;
  amountUnits: string;
  status?: string;
  gasPaidWei?: string | number | bigint | null;
  chainId?: number;
  blockNumber?: string | number | bigint | null;
  explorerUrl?: string | null;
  confirmedAt?: string | null;
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

function decimalToUnits(amount?: string | null): bigint {
  if (!amount) return 0n;
  
  // Convertir a string si es necesario
  const amountStr = typeof amount === "string" ? amount : String(amount);
  const trimmed = amountStr.trim();
  
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

function normalizeNumericInput(value: string | number | bigint | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") return Number.isFinite(value) ? value.toString() : null;
  if (typeof value === "string") return value;
  return null;
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

function normalizePrivateKey(key: string): Hex {
  return (key.startsWith("0x") ? key : `0x${key}`) as Hex;
}

async function fetchDefaultPayoutConfig(client: SupabaseClient): Promise<CommunityPotPayoutDefaultConfig | null> {
  const { data, error } = await client
    .from("community_pot_payout_default_config")
    .select(
      "amount_usdc, max_participants, is_testnet, schedule_weekday, schedule_time, schedule_timezone"
    )
    .maybeSingle();

  if (error) {
    console.error("Failed to load community pot default config", error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  return data as CommunityPotPayoutDefaultConfig;
}

function parseScheduleTime(value: string | null | undefined): { hour: number; minute: number } | null {
  if (!value) return null;
  const parts = value.split(":").map((part) => part.trim());
  if (parts.length < 2) return null;
  const hour = Number.parseInt(parts[0], 10);
  const minute = Number.parseInt(parts[1], 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function normalizeWeekday(value: number | null | undefined): number {
  if (value === null || value === undefined) {
    return DISTRIBUTION_TARGET_WEEKDAY;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return DISTRIBUTION_TARGET_WEEKDAY;
  }
  const normalized = ((Math.trunc(numeric) % 7) + 7) % 7;
  return normalized;
}

function normalizeTimeZone(value: string | null | undefined): string {
  if (!value) {
    return DISTRIBUTION_TIMEZONE;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return DISTRIBUTION_TIMEZONE;
  }
  try {
    // Will throw for invalid IANA identifiers
    new Intl.DateTimeFormat("en-US", { timeZone: trimmed });
    return trimmed;
  } catch {
    return DISTRIBUTION_TIMEZONE;
  }
}

function computeNextDistributionFromConfig(
  config: CommunityPotPayoutDefaultConfig | null,
  reference: Date = new Date()
): Date {
  if (!config) {
    return computeNextDistributionDate(reference);
  }

  const timeZone = normalizeTimeZone(config.schedule_timezone);
  const timeParts =
    parseScheduleTime(config.schedule_time) ??
    { hour: DISTRIBUTION_TARGET_HOUR, minute: DISTRIBUTION_TARGET_MINUTE };
  const targetWeekday = normalizeWeekday(config.schedule_weekday);

  const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  });
  const weekdayKey = weekdayFormatter.format(reference);
  const currentWeekday = WEEKDAY_LOOKUP[weekdayKey] ?? 0;

  const dateParts = getDatePartsForTimeZone(reference, timeZone);
  const currentMinutes = dateParts.hour * 60 + dateParts.minute;
  const targetMinutes = timeParts.hour * 60 + timeParts.minute;

  let daysAhead = (7 - currentWeekday + targetWeekday) % 7;
  if (daysAhead === 0 && currentMinutes >= targetMinutes) {
    daysAhead = 7;
  }

  return zonedLocalTimeToUtc(
    dateParts.year,
    dateParts.month,
    dateParts.day + daysAhead,
    timeParts.hour,
    timeParts.minute,
    timeZone
  );
}

async function sendUsdcTransfers(
  plans: PayoutPlan[],
  options: { rpcUrl: string; privateKey: Hex; contractAddress: Address; chain: Chain }
): Promise<SentTransaction[]> {
  const account = privateKeyToAccount(options.privateKey);
  const walletClient = createWalletClient({ account, chain: options.chain, transport: http(options.rpcUrl) });
  const publicClient = createPublicClient({ chain: options.chain, transport: http(options.rpcUrl) });

  const sent: SentTransaction[] = [];
  for (const plan of plans) {
    const txHash = await walletClient.writeContract({
      abi: erc20Abi,
      address: options.contractAddress,
      functionName: "transfer",
      args: [plan.participant.polygon_address as Address, plan.amountUnits],
    });
    const receipt = (await publicClient.waitForTransactionReceipt({ hash: txHash })) as TransactionReceipt;
    const gasUsed = receipt.gasUsed ?? null;
    const effectiveGasPrice = (receipt as { effectiveGasPrice?: bigint }).effectiveGasPrice ?? null;
    const gasPaidWei = gasUsed !== null && effectiveGasPrice !== null ? gasUsed * effectiveGasPrice : null;
    sent.push({
      plan,
      hash: txHash,
      blockNumber: receipt.blockNumber ?? null,
      gasPaidWei,
    });
  }
  return sent;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function logEdgeFetch(client: SupabaseClient, dryRun: boolean) {
  const { error } = await client.rpc("community_pot_log_edge_fetch", {
    p_dry_run: dryRun,
  });
  if (error) {
    console.error("community_pot_log_edge_fetch failed", error.message);
  }
}

async function logEvent(client: SupabaseClient, message: string, payoutId?: string | null) {
  const { error } = await client.rpc("community_pot_log_event", {
    p_message: message,
    p_log_from: "edge_function",
    p_payout_id: payoutId ?? null,
  });
  if (error) {
    console.error("community_pot_log_event failed", error.message);
  }
}

async function logParticipantSnapshot(client: SupabaseClient, payoutId: string, amountUsdc: string) {
  const { data, error } = await client.rpc("community_pot_log_participant_snapshot", {
    p_payout_id: payoutId,
    p_amount_usdc: amountUsdc,
  });
  if (error) {
    console.error("community_pot_log_participant_snapshot failed", error.message);
    return null;
  }
  return typeof data === "number" ? data : null;
}

async function logPayoutCompletion(
  client: SupabaseClient,
  payload: {
    payoutId: string;
    status: string;
    transactionCount: number;
    nextScheduledAt?: string | null;
  }
) {
  const { error } = await client.rpc("community_pot_log_payout_completion", {
    p_payout_id: payload.payoutId,
    p_status: payload.status,
    p_transaction_count: payload.transactionCount,
    p_next_scheduled_at: payload.nextScheduledAt ?? null,
  });
  if (error) {
    console.error("community_pot_log_payout_completion failed", error.message);
  }
}

async function logFailure(
  client: SupabaseClient,
  payload: { payoutId?: string | null; stage: string; error: string }
) {
  const { error } = await client.rpc("community_pot_log_failure", {
    p_payout_id: payload.payoutId ?? null,
    p_stage: payload.stage,
    p_error: payload.error,
    p_context: null,
  });
  if (error) {
    console.error("community_pot_log_failure failed", error.message);
  }
}

async function registerTransaction(client: SupabaseClient, payload: RegisterTransactionPayload) {
  const gasPaidWei = normalizeNumericInput(payload.gasPaidWei ?? null);
  const blockNumber = normalizeNumericInput(payload.blockNumber ?? null);
  const { error } = await client.rpc("community_pot_register_transaction", {
    p_payout_id: payload.payoutId,
    p_tx_hash: payload.txHash,
    p_polygon_address: payload.polygonAddress,
    p_amount_units: payload.amountUnits,
    p_status: payload.status ?? "sent",
    p_gas_paid_wei: gasPaidWei,
    p_chain_id: payload.chainId ?? polygon.id,
    p_block_number: blockNumber,
    p_explorer_url: payload.explorerUrl ?? null,
    p_confirmed_at: payload.confirmedAt ?? null,
  });
  if (error) {
    throw new Error(`Failed to register transaction ${payload.txHash}: ${error.message}`);
  }
}

async function findPendingPayout(client: SupabaseClient, now: Date): Promise<PendingPayout | null> {
  const { data, error } = await client
    .from("community_pot_payout_conditions")
    .select(
      `payout_id,
       amount_usdc,
       scheduled_at,
       is_testnet,
       max_participants,
       execute_immediately,
       community_pot_payouts!inner (
         created_at,
         status
       )`
    )
    .eq("community_pot_payouts.status", "Pending")
    .order("created_at", { foreignTable: "community_pot_payouts", ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    const candidate = row as CommunityPotPayoutConditionsRow & {
      community_pot_payouts: { created_at: string; status: CommunityPotPayoutStatus } | null;
    };

    const executeImmediately = Boolean(candidate.execute_immediately);
    const scheduledAt = new Date(candidate.scheduled_at);
    if (!executeImmediately && scheduledAt.getTime() > now.getTime()) {
      continue;
    }

    return {
      id: candidate.payout_id,
      amount_usdc: candidate.amount_usdc,
      scheduled_at: candidate.scheduled_at,
      is_testnet: candidate.is_testnet,
      max_participants: candidate.max_participants,
      execute_immediately: executeImmediately,
    };
  }

  return null;
}

async function updatePayoutStatus(client: SupabaseClient, payoutId: string, status: CommunityPotPayoutStatus) {
  const { error } = await client
    .from("community_pot_payouts")
    .update({ status })
    .eq("id", payoutId);

  if (error) {
    throw new Error(`Failed to update payout ${payoutId} status to ${status}: ${error.message}`);
  }
}

async function scheduleNextPayout(
  client: SupabaseClient,
  template: Pick<PendingPayout, "amount_usdc" | "is_testnet" | "max_participants">
): Promise<Date> {
  const defaultConfig = await fetchDefaultPayoutConfig(client);
  const nextScheduledAt = computeNextDistributionFromConfig(defaultConfig);

  const rawAmount =
    defaultConfig?.amount_usdc ??
    template.amount_usdc ??
    DEFAULT_PAYOUT_AMOUNT_USDC;
  const resolvedAmount = typeof rawAmount === "string" ? rawAmount : String(rawAmount ?? DEFAULT_PAYOUT_AMOUNT_USDC);

  let resolvedMaxParticipants = Math.max(1, template.max_participants ?? DEFAULT_MAX_PARTICIPANTS);
  if (defaultConfig?.max_participants !== null && defaultConfig?.max_participants !== undefined) {
    const numericMax = Number(defaultConfig.max_participants);
    if (Number.isFinite(numericMax) && numericMax > 0) {
      resolvedMaxParticipants = Math.max(1, Math.trunc(numericMax));
    }
  }

  const resolvedIsTestnet =
    defaultConfig?.is_testnet !== null && defaultConfig?.is_testnet !== undefined
      ? Boolean(defaultConfig.is_testnet)
      : template.is_testnet;

  const { data, error } = await client
    .from("community_pot_payouts")
    .insert({ status: "Pending" })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create next payout shell: ${error.message}`);
  }

  const newPayoutId = data?.id;
  if (!newPayoutId) {
    throw new Error("Failed to retrieve id for newly created payout");
  }

  const { error: conditionError } = await client.from("community_pot_payout_conditions").insert({
    payout_id: newPayoutId,
    amount_usdc: resolvedAmount,
    scheduled_at: nextScheduledAt.toISOString(),
    is_testnet: resolvedIsTestnet,
    max_participants: resolvedMaxParticipants,
    execute_immediately: false,
  });

  if (conditionError) {
    throw new Error(`Failed to create next payout conditions: ${conditionError.message}`);
  }

  return nextScheduledAt;
}

async function fetchParticipants(client: SupabaseClient, payoutId: string): Promise<CommunityPotParticipant[]> {
  const { data, error } = await client
    .from("community_pot_payout_participants")
    .select("polygon_address, joined_at")
    .eq("payout_id", payoutId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as CommunityPotParticipant[];
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
  const now = new Date();

  await logEdgeFetch(supabase, dryRun);

  let currentStage = "discover_payout";
  let currentPayoutId: string | null = null;
  let currentPayoutStatus: CommunityPotPayoutStatus | null = null;

  try {
    await logEvent(supabase, "Iniciando búsqueda de payout pendiente...");

    const payout = await findPendingPayout(supabase, now);

    if (!payout) {
      await logEvent(supabase, "No se encontró ningún payout pendiente listo para ejecutar.");
      return jsonResponse({ status: "skipped", dryRun, message: "No payout ready for distribution" });
    }

    await logEvent(
      supabase,
      `Payout encontrado: ${payout.id.substring(0, 8)}. Importe configurado: ${payout.amount_usdc} USDC. Fecha programada: ${payout.scheduled_at}.`,
      payout.id
    );

    currentPayoutId = payout.id;

    if (!dryRun) {
      await logEvent(supabase, `Cambiando estado del payout a "In Progress"...`, payout.id);
      await updatePayoutStatus(supabase, payout.id, "In Progress");
      currentPayoutStatus = "In Progress";
    }

    currentStage = "fetch_participants";
    await logEvent(supabase, "Consultando lista de participantes...", payout.id);
    const participants = await fetchParticipants(supabase, payout.id);

    await logEvent(supabase, `Se encontraron ${participants.length} participante(s) registrado(s).`, payout.id);

    const totalAmountUsdc = payout.amount_usdc ?? "0";
    let participantCount: number;

    if (!dryRun) {
      const snapshotCount = await logParticipantSnapshot(supabase, payout.id, totalAmountUsdc);
      participantCount = snapshotCount ?? participants.length;
    } else {
      participantCount = participants.length;
    }
    const totalUnits = decimalToUnits(totalAmountUsdc);

    if (participantCount === 0 || totalUnits === 0n) {
      let nextScheduledAtIso: string | null = null;

      if (!dryRun) {
        await logEvent(
          supabase,
          "No hay participantes o el importe es 0. Cerrando payout sin transferencias y programando el siguiente...",
          payout.id
        );
        const nextScheduledAt = await scheduleNextPayout(supabase, payout);
        await updatePayoutStatus(supabase, payout.id, "Completed");
        currentPayoutStatus = "Completed";

        nextScheduledAtIso = nextScheduledAt.toISOString();

        await logPayoutCompletion(supabase, {
          payoutId: payout.id,
          status: "success",
          transactionCount: 0,
          nextScheduledAt: nextScheduledAtIso,
        });
      }

      return jsonResponse({
        status: dryRun ? "skipped" : "success",
        dryRun,
        message: "Payout closed without transfers",
        processedPayoutId: payout.id,
        scheduledAt: payout.scheduled_at,
        participantCount,
        totalAmountUsdc,
        perParticipantAmountUsdc: null,
        nextScheduledAt: nextScheduledAtIso,
      });
    }

    currentStage = "plan_ready";
    const payoutPlans = buildPayoutPlan(totalUnits, participants);
    const perParticipantAmountUsdc = unitsToDecimal(payoutPlans[0]?.amountUnits ?? 0n);

    await logEvent(supabase, `Plan de reparto calculado: ${perParticipantAmountUsdc} USDC por participante.`, payout.id);

    if (dryRun) {
      await logEvent(supabase, `Modo dry run: simulación completada. No se ejecutarán transferencias reales.`, payout.id);
      return jsonResponse({
        status: "skipped",
        dryRun,
        message: `Dry run: would distribute ${perParticipantAmountUsdc} USDC to ${participantCount} wallets`,
        processedPayoutId: payout.id,
        scheduledAt: payout.scheduled_at,
        participantCount,
        totalAmountUsdc,
        perParticipantAmountUsdc,
        nextScheduledAt: null,
      });
    }

    currentStage = "sending_transfers";
    
    // Select secrets based on network (testnet vs mainnet)
    const isTestnet = payout.is_testnet;
    const rpcUrl = isTestnet
      ? Deno.env.get("COMMUNITY_POT_RPC_URL_TEST")
      : Deno.env.get("COMMUNITY_POT_RPC_URL");
    const privateKey = isTestnet
      ? (Deno.env.get("COMMUNITY_POT_PAYOUT_PRIVATE_KEY_TEST") ?? Deno.env.get("COMMUNITY_POT_PAYOUT_PRIVATE_KEY"))
      : Deno.env.get("COMMUNITY_POT_PAYOUT_PRIVATE_KEY");
    const contractAddress = (isTestnet
      ? Deno.env.get("COMMUNITY_POT_USDC_CONTRACT_TEST")
      : (Deno.env.get("COMMUNITY_POT_USDC_CONTRACT") ?? DEFAULT_POLYGON_USDC)) as Address;
    const chain = isTestnet ? polygonAmoy : polygon;

    const networkLabel = isTestnet ? "Testnet (Amoy)" : "Mainnet";
    if (!rpcUrl) throw new Error(`COMMUNITY_POT_RPC_URL${isTestnet ? "_TEST" : ""} is not configured`);
    if (!privateKey) throw new Error("COMMUNITY_POT_PAYOUT_PRIVATE_KEY is not configured");
    if (!contractAddress) throw new Error(`COMMUNITY_POT_USDC_CONTRACT${isTestnet ? "_TEST" : ""} is not configured`);

    await logEvent(
      supabase,
      `Preparando envío de ${payoutPlans.length} transferencia(s) on-chain [${networkLabel}]. Contrato USDC: ${contractAddress}.`,
      payout.id
    );

    const sentTransactions = await sendUsdcTransfers(payoutPlans, {
      rpcUrl,
      privateKey: normalizePrivateKey(privateKey),
      contractAddress,
      chain,
    });

    await logEvent(supabase, `Todas las transferencias on-chain completadas exitosamente.`, payout.id);

    currentStage = "register_transactions";
    await logEvent(supabase, `Registrando ${sentTransactions.length} transacción(es) en la base de datos...`, payout.id);
    for (const sent of sentTransactions) {
      const gasPaidMatic =
        sent.gasPaidWei !== null && sent.gasPaidWei !== undefined
          ? formatUnits(sent.gasPaidWei, chain.nativeCurrency.decimals ?? 18)
          : null;

      const amountUnits = unitsToDecimal(sent.plan.amountUnits);
      const transactionPayload: RegisterTransactionPayload = {
        payoutId: payout.id,
        txHash: sent.hash,
        polygonAddress: sent.plan.participant.polygon_address,
        amountUnits,
        status: "confirmed",
        chainId: chain.id,
        blockNumber: sent.blockNumber ?? null,
        gasPaidWei: gasPaidMatic,
        explorerUrl: payout.is_testnet
          ? `https://amoy.polygonscan.com/tx/${sent.hash}`
          : `https://polygonscan.com/tx/${sent.hash}`,
        confirmedAt: new Date().toISOString(),
      };

      try {
        await registerTransaction(supabase, transactionPayload);
      } catch (registrationError) {
        const errorMessage = registrationError instanceof Error ? registrationError.message : String(registrationError);
        await logEvent(
          supabase,
          `Fallo al registrar transacción ${sent.hash}: ${errorMessage}. Reintentando con cantidades normalizadas...`,
          payout.id
        );

        const fallbackPayload: RegisterTransactionPayload = {
          ...transactionPayload,
          amountUnits: "0",
          gasPaidWei: gasPaidMatic ? "0" : null,
        };

        try {
          await registerTransaction(supabase, fallbackPayload);
        } catch (fallbackError) {
          const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          await logEvent(
            supabase,
            `Fallo al registrar transacción ${sent.hash} incluso con fallback: ${fallbackMessage}.`,
            payout.id
          );
          throw fallbackError;
        }
      }
    }

    let nextScheduledAtIso: string | null = null;

    if (!dryRun) {
      await logEvent(supabase, "Programando el siguiente payout...", payout.id);
      const nextScheduledAt = await scheduleNextPayout(supabase, payout);
      nextScheduledAtIso = nextScheduledAt.toISOString();

      await updatePayoutStatus(supabase, payout.id, "Completed");
      currentPayoutStatus = "Completed";

      await logPayoutCompletion(supabase, {
        payoutId: payout.id,
        status: "success",
        transactionCount: sentTransactions.length,
        nextScheduledAt: nextScheduledAtIso,
      });
    }

    return jsonResponse({
      status: "success",
      dryRun,
      message: `Distributed ${perParticipantAmountUsdc} USDC to ${participantCount} participants`,
      processedPayoutId: payout.id,
      scheduledAt: payout.scheduled_at,
      participantCount,
      totalAmountUsdc,
      perParticipantAmountUsdc,
      transactionHashes: sentTransactions.map((tx) => String(tx.hash)),
      nextScheduledAt: nextScheduledAtIso,
    });
  } catch (error) {
    let message = "Unknown error";
    let errorStack = "";
    
    if (error instanceof Error) {
      message = error.message;
      errorStack = error.stack || "";
    } else if (typeof error === "string") {
      message = error;
    } else if (error && typeof error === "object") {
      message = JSON.stringify(error);
    }
    
    console.error("community-pot-payout", message, errorStack);

    try {
      await logEvent(supabase, `ERROR en etapa "${currentStage}": ${message}`, currentPayoutId);
    } catch (logErr) {
      console.error("Failed to log error:", logErr);
    }

    await logFailure(supabase, {
      payoutId: currentPayoutId,
      stage: currentStage,
      error: message,
    });

    return jsonResponse({ error: message }, 500);
  }
});
