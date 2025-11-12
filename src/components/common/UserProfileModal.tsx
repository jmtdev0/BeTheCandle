"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Link as LinkIcon, Bitcoin, FileText, Palette, Check } from "lucide-react";
import {
  SATELLITE_COLOR_PRESETS,
  findPresetByHex,
  isValidHexColor,
  normalizeSatelliteColor,
} from "@/lib/satelliteColors";

interface SocialLink {
  platform: string;
  url: string;
}

interface UserProfile {
  display_name: string;
  preferred_name?: string;
  bio?: string;
  social_links: SocialLink[];
  btc_address?: string;
  avatar_seed?: string;
  orbit_speed_multiplier?: number; // 0.1 to 3.0
  satellite_color?: string;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onSave: (profile: UserProfile) => Promise<void>;
  satelliteColor?: string;
  onColorChange?: (color: string) => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  profile,
  onSave,
  satelliteColor,
  onColorChange,
}: UserProfileModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [bio, setBio] = useState("");
  const [btcAddress, setBtcAddress] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [orbitSpeed, setOrbitSpeed] = useState(1.0); // Default 1.0x
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [draftColor, setDraftColor] = useState(() => normalizeSatelliteColor(satelliteColor));
  const [hexInput, setHexInput] = useState(() => normalizeSatelliteColor(satelliteColor));

  useEffect(() => {
    if (!isOpen) return;
    const normalized = normalizeSatelliteColor(satelliteColor);
    setDraftColor(normalized);
    setHexInput(normalized);
  }, [isOpen, satelliteColor]);

  const applyColor = (nextColor: string) => {
    const normalized = normalizeSatelliteColor(nextColor);
    setHexInput(normalized);
    if (normalized === draftColor) return;
    setDraftColor(normalized);
    onColorChange?.(normalized);
  };

  const handleHexInputChange = (value: string) => {
    setHexInput(value);
    if (isValidHexColor(value)) {
      applyColor(value);
    }
  };

  const handleHexInputBlur = () => {
    if (!isValidHexColor(hexInput)) {
      setHexInput(draftColor);
      return;
    }
    const normalized = normalizeSatelliteColor(hexInput);
    setHexInput(normalized);
    applyColor(normalized);
  };

  const matchingPreset = findPresetByHex(draftColor);
  const hexIsValid = isValidHexColor(hexInput);
  const showHexWarning = hexInput.trim().length > 0 && !hexIsValid;

  // Load profile data when modal opens
  useEffect(() => {
    if (isOpen && profile) {
      setDisplayName(profile.display_name || "");
      setPreferredName(profile.preferred_name || "");
      setBio(profile.bio || "");
      setBtcAddress(profile.btc_address || "");
      setSocialLinks(profile.social_links || []);
      setOrbitSpeed(profile.orbit_speed_multiplier || 1.0);
      if (profile.satellite_color) {
        applyColor(profile.satellite_color);
      }
    }
  }, [isOpen, profile]);

  const handleAddSocialLink = () => {
    if (socialLinks.length < 5) {
      setSocialLinks([...socialLinks, { platform: "", url: "" }]);
    }
  };

  const handleRemoveSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const handleSocialLinkChange = (
    index: number,
    field: "platform" | "url",
    value: string
  ) => {
    const updated = [...socialLinks];
    updated[index][field] = value;
    setSocialLinks(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      // Validate
      if (preferredName && preferredName.length > 32) {
        throw new Error("Preferred name must be 32 characters or less");
      }
      if (bio && bio.length > 500) {
        throw new Error("Bio must be 500 characters or less");
      }

      // Filter out empty social links
      const validSocialLinks = socialLinks.filter(
        (link) => link.platform && link.url
      );

      await onSave({
        display_name: displayName,
        preferred_name: preferredName,
        bio,
        social_links: validSocialLinks,
        btc_address: btcAddress,
        orbit_speed_multiplier: orbitSpeed,
        satellite_color: draftColor,
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center px-4 py-8 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="pointer-events-auto w-full max-w-2xl max-h-[78vh] rounded-2xl border border-amber-400/30 bg-slate-900/95 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col"
            >
            {/* Header */}
            <div className="flex-shrink-0 px-6 pt-6 pb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-100">
                  Edit Profile
                </h2>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
                  aria-label="Close modal"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {/* Error message */}
              {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6 pb-6">
                {/* Display Name (read-only) */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
                    <User size={16} />
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    disabled
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-slate-400 opacity-60"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    This is your unique identifier and cannot be changed
                  </p>
                </div>

              {/* Preferred Name */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
                  <User size={16} />
                  Preferred Name (Nickname)
                </label>
                <input
                  type="text"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  maxLength={32}
                  placeholder="How you want to be called"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-slate-100 transition focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {preferredName.length}/32 characters
                </p>
              </div>

              {/* Bio */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
                  <FileText size={16} />
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                  rows={4}
                  placeholder="Tell us about yourself, your projects, or what you're raising funds for..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-slate-100 transition focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {bio.length}/500 characters
                </p>
              </div>

              {/* Satellite Color */}
              {onColorChange && (
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
                    <Palette size={16} />
                    Satellite Color
                  </label>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                      <input
                        type="color"
                        value={draftColor}
                        onChange={(event) => applyColor(event.target.value)}
                        className="h-12 w-12 rounded-full border border-white/40 bg-transparent p-0 shadow-inner"
                        aria-label="Select satellite color"
                      />
                      <div className="flex-1">
                        <label className="text-xs uppercase tracking-widest text-slate-400">
                          Hex Value
                        </label>
                        <input
                          type="text"
                          value={hexInput}
                          onChange={(event) => handleHexInputChange(event.target.value)}
                          onBlur={handleHexInputBlur}
                          placeholder="#F97316"
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 font-mono text-sm text-slate-100 transition focus:border-amber-400/40 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                        />
                        {showHexWarning ? (
                          <p className="mt-1 text-xs text-red-300">
                            Use the format #RRGGBB to save your custom color.
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-slate-500">
                            Pick any hex color or start with a preset below.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {SATELLITE_COLOR_PRESETS.map((preset) => {
                        const isActive = matchingPreset === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => applyColor(preset.hex)}
                            className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                              isActive
                                ? "border-amber-400/70 bg-slate-700/80 shadow-lg"
                                : "border-slate-700 hover:border-amber-400/40 hover:bg-slate-800/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="h-6 w-6 rounded-full border border-white/40"
                                style={{
                                  background: `linear-gradient(135deg, ${preset.palette[0]}, ${preset.palette[2]})`,
                                }}
                              />
                              <span className="text-sm text-slate-100 font-medium">
                                {preset.label}
                              </span>
                            </div>
                            {isActive && <Check size={18} className="text-amber-300" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Save changes to sync this color to your lobby satellite.
                  </p>
                </div>
              )}

              {/* Orbit Speed */}
              <div>
                <label className="mb-2 flex items-center justify-between text-sm font-medium text-slate-300">
                  <span className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    Orbit Speed
                  </span>
                  <span className="text-amber-400 font-mono text-xs">
                    {orbitSpeed.toFixed(1)}x
                  </span>
                </label>
                <div className="px-2">
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={orbitSpeed}
                    onChange={(e) => setOrbitSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                    style={{
                      background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${((orbitSpeed - 0.1) / 2.9) * 100}%, #334155 ${((orbitSpeed - 0.1) / 2.9) * 100}%, #334155 100%)`
                    }}
                  />
                  <div className="flex justify-between mt-1 text-xs text-slate-500">
                    <span>0.1x (Very slow)</span>
                    <span>1.0x (Normal)</span>
                    <span>3.0x (Very fast)</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Control how fast your satellite orbits around the Bitcoin star
                </p>
              </div>

              {/* Bitcoin Address */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Bitcoin size={16} />
                  Bitcoin Address
                </label>
                <input
                  type="text"
                  value={btcAddress}
                  onChange={(e) => setBtcAddress(e.target.value)}
                  placeholder="bc1q... or 1... or 3..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 font-mono text-sm text-slate-100 transition focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Where you want to receive Bitcoin donations
                </p>
              </div>

              {/* Social Links */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <LinkIcon size={16} />
                    Social Links
                  </label>
                  {socialLinks.length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddSocialLink}
                      className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200 transition hover:bg-amber-400/20"
                    >
                      + Add Link
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {socialLinks.map((link, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={link.platform}
                        onChange={(e) =>
                          handleSocialLinkChange(index, "platform", e.target.value)
                        }
                        placeholder="Platform (e.g., Twitter)"
                        className="w-1/3 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 transition focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                      />
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) =>
                          handleSocialLinkChange(index, "url", e.target.value)
                        }
                        placeholder="https://..."
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 transition focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSocialLink(index)}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 text-red-300 transition hover:bg-red-500/20"
                        aria-label="Remove link"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {socialLinks.length === 0 && (
                    <p className="text-sm text-slate-500">
                      No social links added yet
                    </p>
                  )}
                </div>
              </div>

              {/* Submit buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2.5 font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 rounded-lg border border-amber-400/30 bg-amber-400/20 px-4 py-2.5 font-medium text-amber-100 transition hover:bg-amber-400/30 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
        </>
      )}
    </AnimatePresence>
  );
}
