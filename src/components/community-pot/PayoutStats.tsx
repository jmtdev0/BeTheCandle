"use client";

import { useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

type TopRecipient = {
  polygon_address: string;
  total_usdc: string;
  transaction_count: number;
  first_received_at: string;
  last_received_at: string;
};

type NetworkType = "testnet" | "mainnet";

export default function PayoutStats() {
  const [activeTab, setActiveTab] = useState<NetworkType>("mainnet");
  const [payoutCount, setPayoutCount] = useState<number>(0);
  const [topRecipients, setTopRecipients] = useState<TopRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadStats();
  }, [activeTab]);

  async function loadStats() {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const isTestnet = activeTab === "testnet";

    try {
      // Get payout count
      const { data: countData, error: countError } = await supabase.rpc(
        "community_pot_get_payout_count",
        { p_is_testnet: isTestnet }
      );

      if (countError) {
        console.error("Error loading payout count:", countError);
      } else {
        setPayoutCount(countData || 0);
      }

      // Get top recipients
      const { data: recipientsData, error: recipientsError } = await supabase.rpc(
        "community_pot_get_top_recipients",
        { p_is_testnet: isTestnet, p_limit: 10 }
      );

      if (recipientsError) {
        console.error("Error loading top recipients:", {
          message: recipientsError.message,
          code: recipientsError.code,
          details: recipientsError.details,
          hint: recipientsError.hint,
        });
      } else {
        setTopRecipients(recipientsData || []);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  function formatUsdc(amount: string) {
    const num = parseFloat(amount);
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return (
    <div
      className="fixed top-6 right-6 z-40 transition-all duration-300 ease-out"
    >
      {/* Collapsed Button */}
      {!isExpanded && (
        <button 
          onClick={() => setIsExpanded(true)}
          className="w-12 h-12 rounded-full bg-[#2276cb] backdrop-blur-md border border-[#2276cb]/70 shadow-lg flex items-center justify-center text-white hover:bg-[#1a5ba8] transition-colors group relative"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          {/* Tooltip */}
          <div className="absolute top-full right-0 mt-2 w-48 px-3 py-2 text-xs text-white bg-black/90 border border-[#2276cb]/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-normal">
            <p>Shows which participants have received the most funds across all completed payouts.</p>
          </div>
        </button>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="w-96 bg-slate-900/95 backdrop-blur-md rounded-lg border border-slate-700/50 shadow-2xl animate-in fade-in slide-in-from-right-2 duration-200">
          {/* Close button */}
          <div className="absolute top-4 right-4 z-50">
            <button
              onClick={() => setIsExpanded(false)}
              className="w-8 h-4 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          {/* Tabs */}
          <div className="flex border-b border-slate-700/50">
            <button
              onClick={() => setActiveTab("mainnet")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "mainnet"
                  ? "bg-blue-500/20 text-blue-400 border-b-2 border-blue-500"
                  : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              Mainnet
            </button>
            <button
              onClick={() => setActiveTab("testnet")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "testnet"
                  ? "bg-blue-500/20 text-blue-400 border-b-2 border-blue-500"
                  : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              Testnet
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="text-center py-8 text-slate-400">
                <div className="animate-spin inline-block w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full" />
                <p className="mt-2 text-sm">Loading stats...</p>
              </div>
            ) : (
              <>
                {/* Payout Count */}
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                    Completed Payouts
                  </div>
                  <div className="text-3xl font-bold text-blue-400">
                    {payoutCount}
                  </div>
                </div>

                {/* Top Recipients */}
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">
                    Top Recipients
                  </div>
                  {topRecipients.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-sm">
                      No payouts yet
                    </div>
                  ) : (
                    <div className="space-y-2 h-[280px] overflow-y-auto custom-scrollbar pr-2">
                      {topRecipients.map((recipient, index) => (
                        <div
                          key={recipient.polygon_address}
                          className="bg-slate-800/50 rounded-lg p-3 hover:bg-slate-800/70 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold">
                                {index + 1}
                              </div>
                              <a
                                href={
                                  activeTab === "testnet"
                                    ? `https://amoy.polygonscan.com/address/${recipient.polygon_address}`
                                    : `https://polygonscan.com/address/${recipient.polygon_address}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-mono text-slate-300 hover:text-blue-400 transition-colors"
                              >
                                {formatAddress(recipient.polygon_address)}
                              </a>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">
                              {recipient.transaction_count} payout{recipient.transaction_count !== 1 ? "s" : ""}
                            </span>
                            <span className="font-semibold text-blue-400">
                              ${formatUsdc(recipient.total_usdc)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <style jsx>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: rgba(15, 23, 42, 0.5);
              border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(34, 118, 203, 0.3);
              border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(34, 118, 203, 0.5);
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
