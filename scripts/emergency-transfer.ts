#!/usr/bin/env tsx
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { resolve } from "path";
import { createInterface } from "readline";
import {
  createPublicClient,
  createWalletClient,
  erc20Abi,
  formatUnits,
  http,
  type Address,
  type Hex,
} from "viem";
import { polygon } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

dotenv.config({ path: resolve(process.cwd(), ".env") });

const USDC_DECIMALS = 6;
const DEFAULT_USDC_CONTRACT = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 12_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  const factor = BigInt(10 ** USDC_DECIMALS);
  const whole = units / factor;
  const fractional = (units % factor).toString().padStart(USDC_DECIMALS, "0");
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

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): { payoutId: string; amount: string; address: string } {
  const args = process.argv.slice(2);
  let payoutId = "";
  let amount = "";
  let address = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--payout-id" && args[i + 1]) {
      payoutId = args[++i];
    } else if (args[i] === "--amount" && args[i + 1]) {
      amount = args[++i];
    } else if (args[i] === "--address" && args[i + 1]) {
      address = args[++i];
    }
  }

  if (!payoutId || !amount || !address) {
    console.error(
      "Usage: npx tsx scripts/emergency-transfer.ts \\\n" +
        "  --payout-id <uuid> \\\n" +
        "  --amount <usdc-amount> \\\n" +
        "  --address <polygon-address>"
    );
    process.exit(1);
  }

  if (!isValidUuid(payoutId)) {
    console.error(`Invalid payout ID (not a UUID): ${payoutId}`);
    process.exit(1);
  }

  if (!isValidAddress(address)) {
    console.error(`Invalid Polygon address: ${address}`);
    process.exit(1);
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    console.error(`Invalid amount (must be a positive number): ${amount}`);
    process.exit(1);
  }

  return { payoutId, amount, address };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { payoutId, amount, address } = parseArgs();

  // -- Env vars --
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const rpcUrl = process.env.COMMUNITY_POT_RPC_URL;
  const privateKeyRaw = process.env.COMMUNITY_POT_PAYOUT_PRIVATE_KEY;
  const usdcContract = (process.env.COMMUNITY_POT_USDC_CONTRACT ?? DEFAULT_USDC_CONTRACT) as Address;

  const missing: string[] = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseServiceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!rpcUrl) missing.push("COMMUNITY_POT_RPC_URL");
  if (!privateKeyRaw) missing.push("COMMUNITY_POT_PAYOUT_PRIVATE_KEY");

  if (missing.length > 0) {
    console.error(`Missing env vars in .env: ${missing.join(", ")}`);
    process.exit(1);
  }

  const privateKey = normalizePrivateKey(privateKeyRaw!);
  const account = privateKeyToAccount(privateKey);
  const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

  // -- Verify payout exists --
  const { data: payout, error: payoutError } = await supabase
    .from("community_pot_payout_conditions")
    .select(
      `payout_id,
       amount_usdc,
       scheduled_at,
       is_testnet,
       max_participants,
       community_pot_payouts!inner ( status, executed_at )`
    )
    .eq("payout_id", payoutId)
    .single();

  if (payoutError || !payout) {
    console.error(`Payout not found: ${payoutId}`);
    if (payoutError) console.error(payoutError.message);
    process.exit(1);
  }

  const payoutStatus = (payout.community_pot_payouts as any)?.status ?? "Unknown";
  const amountUnits = decimalToUnits(amount);

  // -- Summary --
  console.log("\n========================================");
  console.log("  EMERGENCY USDC TRANSFER");
  console.log("========================================\n");
  console.log(`  Payout ID:      ${payoutId}`);
  console.log(`  Payout status:  ${payoutStatus}`);
  console.log(`  Payout amount:  ${payout.amount_usdc} USDC`);
  console.log(`  Scheduled at:   ${payout.scheduled_at}`);
  console.log(`  Network:        ${payout.is_testnet ? "Testnet (Amoy)" : "Mainnet"}`);
  console.log("");
  console.log(`  Recipient:      ${address}`);
  console.log(`  Amount:         ${amount} USDC (${amountUnits} units)`);
  console.log(`  Sender:         ${account.address}`);
  console.log(`  USDC contract:  ${usdcContract}`);
  console.log("\n========================================\n");

  if (payout.is_testnet) {
    console.error("This script is for mainnet only. The selected payout is testnet.");
    process.exit(1);
  }

  const answer = await ask("Proceed with the transfer? (y/N): ");
  if (answer.toLowerCase() !== "y") {
    console.log("Aborted.");
    process.exit(0);
  }

  // -- Send transfer --
  const walletClient = createWalletClient({
    account,
    chain: polygon,
    transport: http(rpcUrl),
  });
  const publicClient = createPublicClient({
    chain: polygon,
    transport: http(rpcUrl),
  });

  let txHash: Hex | null = null;
  let lastError: Error | null = null;

  console.log("\nSending transfer...");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      txHash = await walletClient.writeContract({
        abi: erc20Abi,
        address: usdcContract,
        functionName: "transfer",
        args: [address as Address, amountUnits],
      });
      console.log(`  Tx submitted: ${txHash}`);
      break;
    } catch (error) {
      lastError = error as Error;
      const msg = (error as Error).message ?? "";
      if (msg.includes("rate limit") || msg.includes("Too many requests")) {
        console.log(`  Rate limited (attempt ${attempt}/${MAX_RETRIES}), waiting ${RETRY_DELAY_MS / 1000}s...`);
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
      }
      throw error;
    }
  }

  if (!txHash) {
    throw lastError ?? new Error("Failed to send transaction after retries");
  }

  // -- Wait for receipt --
  console.log("Waiting for confirmation...");

  let receipt = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      break;
    } catch (error) {
      lastError = error as Error;
      const msg = (error as Error).message ?? "";
      if (msg.includes("rate limit") || msg.includes("Too many requests")) {
        console.log(`  Rate limited waiting for receipt (attempt ${attempt}/${MAX_RETRIES}), waiting ${RETRY_DELAY_MS / 1000}s...`);
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
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

  const explorerUrl = `https://polygonscan.com/tx/${txHash}`;

  console.log(`  Confirmed in block ${receipt.blockNumber}`);
  console.log(`  Gas paid: ${gasPaidMatic ?? "unknown"} MATIC`);
  console.log(`  Explorer: ${explorerUrl}`);

  // -- Register in database --
  console.log("\nRegistering transaction in database...");

  const { error: rpcError } = await supabase.rpc("community_pot_register_transaction", {
    p_payout_id: payoutId,
    p_tx_hash: txHash,
    p_polygon_address: address.toLowerCase(),
    p_amount_units: unitsToDecimal(amountUnits),
    p_status: "confirmed",
    p_gas_paid_wei: gasPaidMatic ? Number(gasPaidMatic) : null,
    p_chain_id: polygon.id,
    p_block_number: receipt.blockNumber ? Number(receipt.blockNumber) : null,
    p_explorer_url: explorerUrl,
    p_confirmed_at: new Date().toISOString(),
  });

  if (rpcError) {
    console.error("Failed to register transaction in database:", rpcError.message);
    console.error("The on-chain transfer was successful. Register it manually if needed.");
    console.error(`  Tx hash: ${txHash}`);
    process.exit(1);
  }

  console.log("  Transaction registered successfully.");

  // -- Done --
  console.log("\n========================================");
  console.log("  DONE");
  console.log("========================================");
  console.log(`  Tx hash:   ${txHash}`);
  console.log(`  Explorer:  ${explorerUrl}`);
  console.log(`  Amount:    ${amount} USDC -> ${address}`);
  console.log(`  Payout:    ${payoutId}`);
  console.log("========================================\n");
}

main().catch((error) => {
  console.error("\nEmergency transfer failed:", error.message ?? error);
  process.exit(1);
});
