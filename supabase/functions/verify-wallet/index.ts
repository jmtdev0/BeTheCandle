// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestPayload {
  address: string;
}

async function getPolBalance(address: string, rpcUrl: string): Promise<bigint> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  const response = await fetch(rpcUrl, {
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { address }: RequestPayload = await req.json();

    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return new Response(
        JSON.stringify({ error: "Invalid Polygon address format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rpcUrl = Deno.env.get("COMMUNITY_POT_RPC_URL");
    if (!rpcUrl) {
      return new Response(
        JSON.stringify({ error: "COMMUNITY_POT_RPC_URL is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedAddress = address.trim().toLowerCase();
    const balanceWei = await getPolBalance(normalizedAddress, rpcUrl);
    const balancePol = formatPol(balanceWei);
    const hasGas = balanceWei > 0n;

    return new Response(
      JSON.stringify({ address: normalizedAddress, balancePol, hasGas }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
