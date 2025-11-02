"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

// Props interface for the DonationModal component
interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: {
    amount: number;
    address: string;
    displayName: string;
    message?: string;
  }) => void;
  isSubmitting?: boolean;
  errorMessage?: string;
}

export default function DonationModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  errorMessage,
}: DonationModalProps) {
  const [btcAmount, setBtcAmount] = useState("");
  const [btcAddress, setBtcAddress] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({ amount: "", address: "", name: "" });

  // Validate BTC amount (must be positive number)
  const validateAmount = (value: string): boolean => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      setErrors((prev) => ({ ...prev, amount: "Please enter a valid amount" }));
      return false;
    }
    setErrors((prev) => ({ ...prev, amount: "" }));
    return true;
  };

  // Validate donor name (required, max length)
  const validateName = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) {
      setErrors((prev) => ({ ...prev, name: "Please share an alias" }));
      return false;
    }
    if (trimmed.length > 64) {
      setErrors((prev) => ({ ...prev, name: "Alias must be 64 characters or less" }));
      return false;
    }
    setErrors((prev) => ({ ...prev, name: "" }));
    return true;
  };

  // Validate BTC address (basic validation - starts with 1, 3, or bc1)
  const validateAddress = (value: string): boolean => {
    if (!value.trim()) {
      setErrors((prev) => ({ ...prev, address: "Address is required" }));
      return false;
    }
    // Basic Bitcoin address validation pattern
    const btcPattern = /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/;
    if (!btcPattern.test(value)) {
      setErrors((prev) => ({ ...prev, address: "Invalid Bitcoin address format" }));
      return false;
    }
    setErrors((prev) => ({ ...prev, address: "" }));
    return true;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isAmountValid = validateAmount(btcAmount);
    const isAddressValid = validateAddress(btcAddress);
    const isNameValid = validateName(displayName);

    if (isAmountValid && isAddressValid && isNameValid && !isSubmitting) {
      onSubmit({
        amount: parseFloat(btcAmount),
        address: btcAddress,
        displayName: displayName.trim(),
        message: message.trim() ? message.trim() : undefined,
      });
      // Reset form
      setBtcAmount("");
      setBtcAddress("");
      setDisplayName("");
      setMessage("");
      setErrors({ amount: "", address: "", name: "" });
    }
  };

  // Handle backdrop click to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
        >
          {/* Modal content */}
          <motion.div
            className="relative w-full max-w-md bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-orange-500/20 overflow-hidden"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative glow effect */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />

            {/* Header */}
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-3xl">₿</span>
                Add Your Donation
              </h2>
              <p className="text-slate-400 mt-2 text-sm">
                Enter your donation amount and wallet address for a chance to win the daily pot
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {errorMessage && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              )}

              {/* Display Name Input */}
              <div>
                <label htmlFor="btcDisplayName" className="block text-sm font-semibold text-slate-300 mb-2">
                  Your Alias (shareable across sessions)
                </label>
                <input
                  type="text"
                  id="btcDisplayName"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (errors.name) validateName(e.target.value);
                  }}
                  onBlur={(e) => validateName(e.target.value)}
                  placeholder="Primo Dani"
                  maxLength={64}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">{errors.name}</p>
                )}
              </div>

              {/* BTC Amount Input */}
              <div>
                <label htmlFor="btcAmount" className="block text-sm font-semibold text-slate-300 mb-2">
                  Donation Amount (BTC)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="btcAmount"
                    value={btcAmount}
                    onChange={(e) => {
                      setBtcAmount(e.target.value);
                      if (errors.amount) validateAmount(e.target.value);
                    }}
                    onBlur={(e) => validateAmount(e.target.value)}
                    placeholder="0.00100000"
                    className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">
                    BTC
                  </span>
                </div>
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-400">{errors.amount}</p>
                )}
              </div>

              {/* BTC Address Input */}
              <div>
                <label htmlFor="btcAddress" className="block text-sm font-semibold text-slate-300 mb-2">
                  Your Bitcoin Address
                </label>
                <input
                  type="text"
                  id="btcAddress"
                  value={btcAddress}
                  onChange={(e) => {
                    setBtcAddress(e.target.value);
                    if (errors.address) validateAddress(e.target.value);
                  }}
                  onBlur={(e) => validateAddress(e.target.value)}
                  placeholder="bc1q..."
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-mono text-sm"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-400">{errors.address}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  If you win, the pot will be sent to this address
                </p>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="btcMessage" className="block text-sm font-semibold text-slate-300 mb-2">
                  Message (optional)
                </label>
                <textarea
                  id="btcMessage"
                  value={message}
                  maxLength={280}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="To the moon with la tía Carmen 🚀"
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all min-h-[96px]"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Shared live with everyone orbiting this bubble
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-orange-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Sending..." : "Confirm Donation"}
                </button>
              </div>
            </form>

            {/* Close button (X) */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              aria-label="Close modal"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
