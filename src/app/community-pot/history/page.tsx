"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, ExternalLink, Calendar, Users, DollarSign, Clock } from "lucide-react";

interface Transaction {
  id: string;
  tx_hash: string;
  amount_units: string;
  gas_paid_wei: string | null;
  status: string;
  confirmed_at: string | null;
  explorer_url: string | null;
  polygon_address?: string | null;
}

interface Payout {
  id: string;
  scheduled_at: string;
  executed_at: string;
  total_amount_usdc: string;
  participant_count: number;
  status: string;
  is_testnet: boolean;
  chain_id: number;
  transactions: Transaction[];
}

export default function CommunityPotHistoryPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPayoutId, setExpandedPayoutId] = useState<string | null>(null);

  useEffect(() => {
    fetchPayoutHistory();
  }, []);

  const fetchPayoutHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/community-pot/history');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.details || errorData.error || `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.details || data.error);
      }
      
      setPayouts(data.payouts || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching payout history:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const togglePayout = (payoutId: string) => {
    setExpandedPayoutId(expandedPayoutId === payoutId ? null : payoutId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Berlin',
    });
  };

  const formatUSDC = (amount: string) => {
    return parseFloat(amount).toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-slate-400">Loading payout history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center p-8 bg-red-900/20 border border-red-500/30 rounded-lg">
          <p className="text-red-400 mb-2">Error loading payout history</p>
          <p className="text-slate-500 text-sm">{error}</p>
          <button
            onClick={fetchPayoutHistory}
            className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500 mb-4">
            Community Pot History
          </h1>
          <p className="text-slate-400 text-lg">
            Complete history of all distributions on Polygon Mainnet
          </p>
        </motion.div>

        {/* Stats Summary */}
        {payouts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
          >
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="text-orange-400" size={24} />
                <h3 className="text-slate-400 text-sm font-medium">Total Distributions</h3>
              </div>
              <p className="text-3xl font-bold text-white">{payouts.length}</p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="text-green-400" size={24} />
                <h3 className="text-slate-400 text-sm font-medium">Total Distributed</h3>
              </div>
              <p className="text-3xl font-bold text-white">
                ${payouts.reduce((sum, p) => sum + parseFloat(p.total_amount_usdc), 0).toFixed(2)}
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-2">
                <Users className="text-blue-400" size={24} />
                <h3 className="text-slate-400 text-sm font-medium">Unique Participants</h3>
              </div>
              <p className="text-3xl font-bold text-white">
                {(() => {
                  // Count unique addresses across all payouts
                  const uniqueAddresses = new Set<string>();
                  payouts.forEach(payout => {
                    payout.transactions.forEach(tx => {
                      if (tx.status === 'confirmed' && tx.polygon_address) {
                        uniqueAddresses.add(tx.polygon_address.toLowerCase());
                      }
                    });
                  });
                  return uniqueAddresses.size;
                })()}
              </p>
            </div>
          </motion.div>
        )}

        {/* Payouts List */}
        {payouts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-slate-800/30 border border-slate-700 rounded-lg"
          >
            <p className="text-slate-400 text-lg">No distributions found yet</p>
            <p className="text-slate-500 text-sm mt-2">Check back after the first distribution!</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {payouts.map((payout, index) => (
              <motion.div
                key={payout.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden backdrop-blur-sm hover:border-orange-500/30 transition-colors"
              >
                {/* Payout Header */}
                <button
                  onClick={() => togglePayout(payout.id)}
                  className="w-full p-6 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Clock size={18} />
                        <span className="font-medium">{formatDate(payout.executed_at || payout.scheduled_at)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign size={16} className="text-green-400" />
                        <span className="text-slate-400">Amount:</span>
                        <span className="text-white font-medium">${formatUSDC(payout.total_amount_usdc)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-blue-400" />
                        <span className="text-slate-400">Participants:</span>
                        <span className="text-white font-medium">{payout.participant_count}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ExternalLink size={16} className="text-orange-400" />
                        <span className="text-slate-400">Transactions:</span>
                        <span className="text-white font-medium">{payout.transactions.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4">
                    {expandedPayoutId === payout.id ? (
                      <ChevronUp className="text-orange-400" size={24} />
                    ) : (
                      <ChevronDown className="text-slate-400" size={24} />
                    )}
                  </div>
                </button>

                {/* Transactions List (Collapsible) */}
                <AnimatePresence>
                  {expandedPayoutId === payout.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-slate-700"
                    >
                      <div className="p-6 bg-slate-900/50">
                        <h4 className="text-slate-300 font-medium mb-4 flex items-center gap-2">
                          <ExternalLink size={18} className="text-orange-400" />
                          Transaction Hashes
                        </h4>
                        
                        {payout.transactions.length === 0 ? (
                          <p className="text-slate-500 text-sm">No transactions recorded</p>
                        ) : (
                          <div className="space-y-2">
                            {payout.transactions.map((tx, txIndex) => (
                              <a
                                key={tx.id}
                                href={`https://polygonscan.com/tx/${tx.tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-orange-500/50 hover:bg-slate-800 transition-all group"
                              >
                                <span className="text-slate-500 text-sm font-mono">#{txIndex + 1}</span>
                                <code className="flex-1 text-sm text-slate-300 font-mono truncate group-hover:text-orange-300 transition-colors">
                                  {tx.tx_hash}
                                </code>
                                <ExternalLink size={16} className="text-slate-500 group-hover:text-orange-400 transition-colors flex-shrink-0" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
