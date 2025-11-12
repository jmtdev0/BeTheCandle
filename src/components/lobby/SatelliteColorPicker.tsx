"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SATELLITE_COLOR_PRESETS,
  findPresetByHex,
  isValidHexColor,
  normalizeSatelliteColor,
} from "@/lib/satelliteColors";

type SatelliteColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  className?: string;
};

export default function SatelliteColorPicker({ value, onChange, className }: SatelliteColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const normalizedValue = normalizeSatelliteColor(value);
  const [hexInput, setHexInput] = useState(() => normalizedValue);
  const matchingPreset = findPresetByHex(normalizedValue);

  useEffect(() => {
    setHexInput(normalizedValue);
  }, [normalizedValue, isOpen]);

  const handleColorChange = (next: string) => {
    const normalized = normalizeSatelliteColor(next);
    setHexInput(normalized);
    onChange(normalized);
  };

  const handleHexInputChange = (next: string) => {
    setHexInput(next);
    if (isValidHexColor(next)) {
      handleColorChange(next);
    }
  };

  const handleHexInputBlur = () => {
    if (!isValidHexColor(hexInput)) {
      setHexInput(normalizedValue);
      return;
    }
    const normalized = normalizeSatelliteColor(hexInput);
    setHexInput(normalized);
    handleColorChange(normalized);
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative h-12 w-12 rounded-full border border-white/30 bg-slate-900/80 shadow-lg transition duration-200 hover:border-white/60 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        style={{ background: normalizedValue }}
        aria-label="Open satellite color picker"
        aria-pressed={isOpen}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute top-full right-0 z-50 mt-3 w-64 rounded-xl border border-slate-700/70 bg-slate-900/95 p-4 shadow-2xl backdrop-blur"
          >
            <p className="mb-3 text-xs uppercase tracking-[0.28em] text-slate-400">Satellite Color</p>
            <div className="flex flex-col gap-3">
              <input
                type="color"
                value={normalizedValue}
                onChange={(event) => handleColorChange(event.target.value)}
                className="h-10 w-10 self-start rounded-full border border-white/40 bg-transparent p-0 shadow-inner"
                aria-label="Select custom color"
              />
              <div>
                <label className="text-[0.7rem] uppercase tracking-[0.3em] text-slate-500">
                  Hex Value
                </label>
                <input
                  type="text"
                  value={hexInput}
                  onChange={(event) => handleHexInputChange(event.target.value)}
                  onBlur={handleHexInputBlur}
                  placeholder="#F97316"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 font-mono text-xs text-slate-100 focus:border-amber-400/40 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                />
                {!isValidHexColor(hexInput) && hexInput.trim().length > 0 ? (
                  <p className="mt-1 text-xs text-red-300">
                    Hex colors should use the #RRGGBB format.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">Tap a preset or paste any hex color.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SATELLITE_COLOR_PRESETS.map((preset) => {
                  const isActive = matchingPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        handleColorChange(preset.hex);
                        setIsOpen(false);
                      }}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs text-slate-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                        isActive
                          ? "border-amber-400/60 bg-slate-800/80"
                          : "border-slate-700 hover:border-amber-400/40 hover:bg-slate-800/50"
                      }`}
                    >
                      <span
                        className="inline-block h-4 w-4 rounded-full border border-white/40"
                        style={{
                          background: `linear-gradient(135deg, ${preset.palette[0]}, ${preset.palette[2]})`,
                        }}
                        aria-hidden="true"
                      />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
