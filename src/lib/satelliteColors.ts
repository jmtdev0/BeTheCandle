export const SATELLITE_COLOR_OPTIONS = ["blue", "red", "orange", "brown"] as const;

export type SatelliteColorOption = (typeof SATELLITE_COLOR_OPTIONS)[number];

export const DEFAULT_SATELLITE_COLOR: SatelliteColorOption = "orange";

export const SATELLITE_COLOR_PALETTES: Record<SatelliteColorOption, string[]> = {
  blue: ["#60a5fa", "#3b82f6", "#93c5fd"],
  red: ["#fda4af", "#f87171", "#ef4444"],
  orange: ["#fb923c", "#f97316", "#fdba74"],
  brown: ["#d97706", "#b45309", "#92400e"],
};

export const SATELLITE_COLOR_LABELS: Record<SatelliteColorOption, string> = {
  blue: "Blue",
  red: "Red",
  orange: "Orange",
  brown: "Brown",
};
