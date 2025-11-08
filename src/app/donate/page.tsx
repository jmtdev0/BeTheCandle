"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bitcoin, Copy, Check, ExternalLink } from "lucide-react";

export default function DonatePage() {
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  const address = useMemo(() => searchParams.get("address")?.trim() ?? "", [searchParams]);
  const name = useMemo(() => searchParams.get("name")?.trim() ?? "", [searchParams]);
  const bitcoinUri = address ? `bitcoin:${address}` : "";

  const handleCopy = async () => {
    if (!address || !navigator?.clipboard) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy BTC address", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl rounded-3xl border border-amber-400/20 bg-slate-900/80 backdrop-blur-xl shadow-2xl p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-200/70 mb-2">Support This Orbit</p>
            <h1 className="text-3xl font-bold text-white">
              {name || "Donate Bitcoin"}
            </h1>
          </div>
          <Link
            href="/lobby"
            className="text-sm text-amber-200/80 hover:text-amber-100 transition"
          >
            ← Back to Lobby
          </Link>
        </div>

        {address ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-6">
              <p className="text-sm text-slate-400 mb-3">
                Send your BTC donation to the address below. You can copy the address or open it directly in a compatible wallet.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1 rounded-lg bg-slate-900/80 border border-slate-700 px-4 py-3 font-mono text-sm text-slate-100 break-all">
                  {address}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/15 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/30"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <a
                  href={bitcoinUri}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-400/20 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/30"
                >
                  <Bitcoin className="h-4 w-4" />
                  Open in Wallet
                </a>
                <a
                  href={`https://mempool.space/address/${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white transition"
                >
                  View address on mempool.space
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700/40 bg-slate-800/40 p-6 text-sm text-slate-400 space-y-3">
              <p>
                ⚠️ Always double-check the address before sending funds. Bitcoin transactions are irreversible.
              </p>
              <p>
                When your donation is confirmed on-chain, it will appear in the recipient’s activity feed and impact their orbit in the lobby view.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
            No donation address was provided for this user.
          </div>
        )}
      </div>
    </div>
  );
}
