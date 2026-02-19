#!/usr/bin/env tsx
import "dotenv/config";

const RPC_URL = process.env.COMMUNITY_POT_RPC_URL || "https://polygon-rpc.com";

async function getPolBalance(address: string): Promise<bigint> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getBalance",
      params: [address, "latest"],
      id: 1,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeout);
  const data = await response.json();

  if (data.error) throw new Error(data.error.message || "RPC error");
  return BigInt(data.result || "0x0");
}

function formatPol(wei: bigint): string {
  const divisor = BigInt(10 ** 18);
  const whole = wei / divisor;
  const remainder = wei % divisor;
  const decimals = remainder.toString().padStart(18, "0").slice(0, 6);
  return `${whole}.${decimals}`;
}

async function main() {
  const address = process.argv[2];

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    console.error("Usage: npm run community-pot:verify-wallet -- <0x_address>");
    process.exit(1);
  }

  console.log(`RPC : ${RPC_URL}`);
  console.log(`Address: ${address}`);
  console.log("Fetching balance...\n");

  const wei = await getPolBalance(address);
  const pol = formatPol(wei);
  const hasGas = wei > 0n;

  console.log(`Balance : ${pol} POL`);
  console.log(`Has gas : ${hasGas ? "YES" : "NO"}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
