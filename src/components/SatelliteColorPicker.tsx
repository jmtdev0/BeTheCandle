"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SATELLITE_COLOR_LABELS,
  SATELLITE_COLOR_OPTIONS,
  SATELLITE_COLOR_PALETTES,
  type SatelliteColorOption,
} from "@/lib/satelliteColors";

type SatelliteColorPickerProps = {
  value: SatelliteColorOption;
  onChange: (color: SatelliteColorOption) => void;
  className?: string;
};

export default function SatelliteColorPicker({ value, onChange, className }: SatelliteColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const palette = SATELLITE_COLOR_PALETTES[value];
  const swatchColor = palette[0];

  return (
    <div className={className}>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-12 h-12 rounded-full border border-white/30 hover:border-white/60 bg-slate-900/80 backdrop-blur-md shadow-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 hover:scale-105"
        style={{ background: swatchColor }}
        aria-label="Open satellite color picker"
        aria-pressed={isOpen}
      />

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full right-0 mt-3 rounded-xl bg-slate-900/95 border border-slate-700/60 backdrop-blur-md p-4 shadow-2xl z-50"
          >
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400 mb-3">
              Satellite Color
            </p>
            <div className="flex flex-col gap-2">
              {SATELLITE_COLOR_OPTIONS.map((option) => {
                const palette = SATELLITE_COLOR_PALETTES[option];
                const swatchColor = palette[0];
                const isActive = value === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange(option);
                      setIsOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                      isActive
                        ? "bg-slate-700/80 border border-white/50"
                        : "border border-slate-600/30 hover:bg-slate-700/40 hover:border-white/30"
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full border border-white/40"
                      style={{ background: swatchColor }}
                    />
                    <span className="text-sm text-slate-200">
                      {SATELLITE_COLOR_LABELS[option]}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop to close dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
