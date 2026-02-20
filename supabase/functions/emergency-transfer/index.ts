// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import {
  createPublicClient,
  createWalletClient,
  erc20Abi,
  formatUnits,
  http,
  type Address,
  type Hex,
} from "npm:viem";
import { polygon } from "npm:viem/chains";
import { privateKeyToAccount } from "npm:viem/accounts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USDC_DECIMALS = 6;
const USDC_FACTOR = BigInt(10 ** USDC_DECIMALS);
const DEFAULT_USDC_CONTRACT = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 12_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-community-pot-secret",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequestPayload {
  payoutId: string;
  amount: string;
  address: string;
}

interface TransferResult {
  txHash: Hex;
  explorerUrl: string;
  blockNumber: number | null;
  gasPaidMatic: string | null;
  amountUnits: bigint;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function decimalToUnits(amount: string): bigint {
  const [wholeRaw, fractionalRaw = ""] = amount.split(".");
  const whole = wholeRaw.replace(/[^0-9]/g, "") || "0";
  const fractional = fractionalRaw
    .replace(/[^0-9]/g, "")
    .padEnd(USDC_DECIMALS, "0")
    .slice(0, USDC_DECIMALS);
  return BigInt(`${whole}${fractional}`);
}

function unitsToDecimal(units: bigint): string {
  const whole = units / USDC_FACTOR;
  const fractional = (units % USDC_FACTOR).toString().padStart(USDC_DECIMALS, "0");
  return `${whole}.${fractional}`.replace(/\.?0+$/, "");
}

function normalizePrivateKey(key: string): Hex {
  return (key.startsWith("0x") ? key : `0x${key}`) as Hex;
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isValidAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Transfer logic
// ---------------------------------------------------------------------------

async function sendUsdcTransfer(
  rpcUrl: string,
  privateKey: Hex,
  usdcContract: Address,
  recipient: Address,
  amountUnits: bigint
): Promise<TransferResult> {
  const account = privateKeyToAccount(privateKey);

  const walletClient = createWalletClient({
    account,
    chain: polygon,
    transport: http(rpcUrl),
  });

  const publicClient = createPublicClient({
    chain: polygon,
    transport: http(rpcUrl),
  });

  // Send with retries
  let txHash: Hex | null = null;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      txHash = await walletClient.writeContract({
        abi: erc20Abi,
        address: usdcContract,
        functionName: "transfer",
        args: [recipient, amountUnits],
      });
      break;
    } catch (error) {
      lastError = error as Error;
      const msg = (error as Error).message ?? "";
      if (
        (msg.includes("rate limit") || msg.includes("Too many requests")) &&
        attempt < MAX_RETRIES
      ) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw error;
    }
  }

  if (!txHash) {
    throw lastError ?? new Error("Failed to send transaction after retries");
  }

  // Wait for receipt with retries
  let receipt = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      break;
    } catch (error) {
      lastError = error as Error;
      const msg = (error as Error).message ?? "";
      if (
        (msg.includes("rate limit") || msg.includes("Too many requests")) &&
        attempt < MAX_RETRIES
      ) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw error;
    }
  }

  if (!receipt) {
    throw lastError ?? new Error("Failed to get transaction receipt after retries");
  }

  const gasUsed = receipt.gasUsed ?? null;
  const effectiveGasPrice = (receipt as { effectiveGasPrice?: bigint }).effectiveGasPrice ?? null;
  const gasPaidWei =
    gasUsed !== null && effectiveGasPrice !== null ? gasUsed * effectiveGasPrice : null;
  const gasPaidMatic =
    gasPaidWei !== null
      ? formatUnits(gasPaidWei, polygon.nativeCurrency.decimals ?? 18)
      : null;

  return {
    txHash,
    explorerUrl: `https://polygonscan.com/tx/${txHash}`,
    blockNumber: receipt.blockNumber ? Number(receipt.blockNumber) : null,
    gasPaidMatic,
    amountUnits,
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // -- Auth --
  const secret = Deno.env.get("COMMUNITY_POT_SECRET");
  if (secret) {
    const provided = req.headers.get("x-community-pot-secret");
    if (provided !== secret) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
  }

  // -- Parse body --
  let payload: RequestPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { payoutId, amount, address } = payload;

  if (!payoutId || !isValidUuid(payoutId)) {
    return jsonResponse({ error: "Invalid or missing payoutId (must be a UUID)" }, 400);
  }
  if (!address || !isValidAddress(address)) {
    return jsonResponse({ error: "Invalid or missing address (must be a Polygon address)" }, 400);
  }
  const numericAmount = Number(amount);
  if (!amount || !Number.isFinite(numericAmount) || numericAmount <= 0) {
    return jsonResponse({ error: "Invalid or missing amount (must be a positive number)" }, 400);
  }

  // -- Env vars --
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const rpcUrl = Deno.env.get("COMMUNITY_POT_RPC_URL");
  const privateKeyRaw = Deno.env.get("COMMUNITY_POT_PAYOUT_PRIVATE_KEY");
  const usdcContract = (
    Deno.env.get("COMMUNITY_POT_USDC_CONTRACT") ?? DEFAULT_USDC_CONTRACT
  ) as Address;

  const missing: string[] = [];
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!supabaseServiceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!rpcUrl) missing.push("COMMUNITY_POT_RPC_URL");
  if (!privateKeyRaw) missing.push("COMMUNITY_POT_PAYOUT_PRIVATE_KEY");

  if (missing.length > 0) {
    return jsonResponse({ error: `Missing env vars: ${missing.join(", ")}` }, 500);
  }

  const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

  // -- Verify payout exists --
  const { data: payout, error: payoutError } = await supabase
    .from("community_pot_payout_conditions")
    .select(
      `payout_id,
       amount_usdc,
       scheduled_at,
       is_testnet,
       community_pot_payouts!inner ( status, executed_at )`
    )
    .eq("payout_id", payoutId)
    .single();

  if (payoutError || !payout) {
    return jsonResponse(
      { error: `Payout not found: ${payoutId}`, detail: payoutError?.message },
      404
    );
  }

  if (payout.is_testnet) {
    return jsonResponse({ error: "This function is for mainnet only. The payout is testnet." }, 400);
  }

  // -- Send transfer --
  const privateKey = normalizePrivateKey(privateKeyRaw!);
  const amountUnits = decimalToUnits(amount);
  const normalizedAddress = address.toLowerCase() as Address;

  let result: TransferResult;
  try {
    result = await sendUsdcTransfer(rpcUrl!, privateKey, usdcContract, normalizedAddress, amountUnits);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error during transfer";
    return jsonResponse({ error: message }, 500);
  }

  // -- Register in database --
  const { error: rpcError } = await supabase.rpc("community_pot_register_transaction", {
    p_payout_id: payoutId,
    p_tx_hash: result.txHash,
    p_polygon_address: normalizedAddress,
    p_amount_units: unitsToDecimal(result.amountUnits),
    p_status: "confirmed",
    p_gas_paid_wei: result.gasPaidMatic ? Number(result.gasPaidMatic) : null,
    p_chain_id: polygon.id,
    p_block_number: result.blockNumber,
    p_explorer_url: result.explorerUrl,
    p_confirmed_at: new Date().toISOString(),
  });

  if (rpcError) {
    // Transfer was successful on-chain but DB registration failed
    return jsonResponse(
      {
        warning: "Transfer confirmed on-chain but database registration failed. Register manually.",
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
        dbError: rpcError.message,
      },
      207
    );
  }

  // -- Done --
  return jsonResponse({
    success: true,
    txHash: result.txHash,
    explorerUrl: result.explorerUrl,
    blockNumber: result.blockNumber,
    gasPaidMatic: result.gasPaidMatic,
    amount,
    address: normalizedAddress,
    payoutId,
  });
});
