export type SatelliteColorPresetKey = keyof typeof PRESET_DEFINITIONS;

export interface SatelliteColorPreset {
  id: SatelliteColorPresetKey;
  label: string;
  hex: string;
  palette: string[];
}

const PRESET_DEFINITIONS = {
  blue: {
    label: "Aurora Blue",
    hex: "#3B82F6",
  },
  red: {
    label: "Solar Flare",
    hex: "#EF4444",
  },
  orange: {
    label: "Bitcoin Orange",
    hex: "#F97316",
  },
  brown: {
    label: "Copper Orbit",
    hex: "#B45309",
  },
} as const;

const DEFAULT_PRESET_KEY: SatelliteColorPresetKey = "orange";

const HEX3_PATTERN = /^[0-9a-fA-F]{3}$/;
const HEX6_PATTERN = /^[0-9a-fA-F]{6}$/;

export const DEFAULT_SATELLITE_COLOR = PRESET_DEFINITIONS[DEFAULT_PRESET_KEY].hex;

const PRESET_NAME_LOOKUP: Record<string, string> = Object.fromEntries(
  (Object.entries(PRESET_DEFINITIONS) as Array<[
    SatelliteColorPresetKey,
    (typeof PRESET_DEFINITIONS)[SatelliteColorPresetKey],
  ]>).map(([id, def]) => [id, def.hex]),
);

const PRESET_HEX_LOOKUP = new Map<string, SatelliteColorPresetKey>(
  (Object.entries(PRESET_DEFINITIONS) as Array<[
    SatelliteColorPresetKey,
    (typeof PRESET_DEFINITIONS)[SatelliteColorPresetKey],
  ]>).map(([id, def]) => [def.hex, id]),
);

export const SATELLITE_COLOR_PRESETS: SatelliteColorPreset[] = (Object.entries(PRESET_DEFINITIONS) as Array<[
  SatelliteColorPresetKey,
  (typeof PRESET_DEFINITIONS)[SatelliteColorPresetKey],
]>).map(([id, def]) => ({
  id,
  label: def.label,
  hex: def.hex,
  palette: generatePalette(def.hex),
}));

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function expandHex(hex: string) {
  return hex
    .split("")
    .map((char) => char + char)
    .join("");
}

function rgbToHex(r: number, g: number, b: number) {
  const toChannel = (channel: number) => channel.toString(16).padStart(2, "0");
  return `#${toChannel(r)}${toChannel(g)}${toChannel(b)}`.toUpperCase();
}

function hexToRgb(hex: string) {
  const normalized = normalizeSatelliteColor(hex);
  const numeric = normalized.slice(1);
  const value = parseInt(numeric, 16);
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
  };
}

function mixHex(colorHex: string, targetHex: string, weight: number) {
  const mix = clamp(weight, 0, 1);
  const baseRgb = hexToRgb(colorHex);
  const targetRgb = hexToRgb(targetHex);

  const r = Math.round(baseRgb.r * (1 - mix) + targetRgb.r * mix);
  const g = Math.round(baseRgb.g * (1 - mix) + targetRgb.g * mix);
  const b = Math.round(baseRgb.b * (1 - mix) + targetRgb.b * mix);

  return rgbToHex(r, g, b);
}

function generatePalette(baseColor: string) {
  const normalized = normalizeSatelliteColor(baseColor);
  return [mixHex(normalized, "#FFFFFF", 0.35), normalized, mixHex(normalized, "#000000", 0.25)];
}

export function getPaletteForColor(color: string) {
  return generatePalette(color);
}

export function isValidHexColor(value: string) {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const raw = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  return HEX6_PATTERN.test(raw) || HEX3_PATTERN.test(raw);
}

export function normalizeSatelliteColor(value?: string, fallback: string = DEFAULT_SATELLITE_COLOR) {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  const presetMatch = PRESET_NAME_LOOKUP[trimmed.toLowerCase()];
  if (presetMatch) {
    return presetMatch;
  }

  const raw = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (HEX6_PATTERN.test(raw)) {
    return `#${raw.toUpperCase()}`;
  }

  if (HEX3_PATTERN.test(raw)) {
    return `#${expandHex(raw).toUpperCase()}`;
  }

  return fallback;
}

export function findPresetByHex(value: string) {
  const normalized = normalizeSatelliteColor(value);
  return PRESET_HEX_LOOKUP.get(normalized) ?? null;
}

export function getPresetHex(key: SatelliteColorPresetKey) {
  return PRESET_DEFINITIONS[key].hex;
}
