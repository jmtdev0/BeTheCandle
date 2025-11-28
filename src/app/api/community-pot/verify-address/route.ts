import { NextRequest, NextResponse } from "next/server";

// Polygon RPC endpoints
const POLYGON_RPC_MAINNET = "https://polygon-rpc.com";
const POLYGON_RPC_AMOY = "https://rpc-amoy.polygon.technology";

// Rate limiting (in-memory, per instance)
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Allow more for verify since it precedes join
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface VerifyAddressRequest {
  address: string;
  recaptchaToken: string;
  isTestnet?: boolean;
}

interface VerifyAddressResponse {
  valid: boolean;
  hasGas: boolean;
  balancePol: string;
  recaptchaValid: boolean;
  error?: string;
}

/**
 * Check if an IP is rate limited
 */
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  return false;
}

/**
 * Verify reCAPTCHA token with Google
 */
async function verifyRecaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.error("[verify-address] RECAPTCHA_SECRET_KEY not configured");
    return false;
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();
    return data.success === true;
  } catch (err) {
    console.error("[verify-address] reCAPTCHA verification failed:", err);
    return false;
  }
}

/**
 * Get POL (native token) balance for an address using JSON-RPC
 */
async function getPolBalance(address: string, isTestnet: boolean): Promise<bigint> {
  const rpcUrl = isTestnet ? POLYGON_RPC_AMOY : POLYGON_RPC_MAINNET;

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getBalance",
      params: [address, "latest"],
      id: 1,
    }),
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message || "RPC error");
  }

  // Result is hex string like "0x1234..."
  return BigInt(data.result || "0x0");
}

/**
 * Format wei to POL with reasonable precision
 */
function formatPolBalance(balanceWei: bigint): string {
  // POL has 18 decimals like ETH
  const divisor = BigInt(10 ** 18);
  const whole = balanceWei / divisor;
  const remainder = balanceWei % divisor;
  
  // Show up to 6 decimal places
  const decimalStr = remainder.toString().padStart(18, "0").slice(0, 6);
  return `${whole}.${decimalStr}`;
}

export async function POST(request: NextRequest): Promise<NextResponse<VerifyAddressResponse>> {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || request.headers.get("x-real-ip") 
      || "unknown";
    
    if (isRateLimited(ip)) {
      return NextResponse.json({
        valid: false,
        hasGas: false,
        balancePol: "0",
        recaptchaValid: false,
        error: "Too many requests. Please wait a minute before trying again.",
      }, { status: 429 });
    }

    const body: VerifyAddressRequest = await request.json();
    const { address, recaptchaToken, isTestnet = false } = body;

    // Validate address format
    const normalizedAddress = address?.trim().toLowerCase();
    if (!normalizedAddress || !/^0x[0-9a-fA-F]{40}$/.test(normalizedAddress)) {
      return NextResponse.json({
        valid: false,
        hasGas: false,
        balancePol: "0",
        recaptchaValid: false,
        error: "Invalid Polygon address format",
      }, { status: 400 });
    }

    // Verify reCAPTCHA
    const recaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!recaptchaValid) {
      return NextResponse.json({
        valid: true,
        hasGas: false,
        balancePol: "0",
        recaptchaValid: false,
        error: "reCAPTCHA verification failed. Please try again.",
      }, { status: 400 });
    }

    // Check POL balance
    let balanceWei: bigint;
    try {
      balanceWei = await getPolBalance(normalizedAddress, isTestnet);
    } catch (err) {
      console.error("[verify-address] Failed to fetch balance:", err);
      return NextResponse.json({
        valid: true,
        hasGas: false,
        balancePol: "0",
        recaptchaValid: true,
        error: "Could not verify wallet balance. Please try again.",
      }, { status: 500 });
    }

    const hasGas = balanceWei > 0n;
    const balancePol = formatPolBalance(balanceWei);

    if (!hasGas) {
      return NextResponse.json({
        valid: true,
        hasGas: false,
        balancePol,
        recaptchaValid: true,
        error: "Your wallet needs some POL for gas fees to operate with USDC. Please add POL to your address first.",
      }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      hasGas: true,
      balancePol,
      recaptchaValid: true,
    });

  } catch (err) {
    console.error("[verify-address] Unexpected error:", err);
    return NextResponse.json({
      valid: false,
      hasGas: false,
      balancePol: "0",
      recaptchaValid: false,
      error: "An unexpected error occurred. Please try again.",
    }, { status: 500 });
  }
}
