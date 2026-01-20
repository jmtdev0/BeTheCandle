import { useState, useEffect, useMemo } from "react";

// Helper functions for color interpolation
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

const rgbToHex = (r: number, g: number, b: number) => {
  return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
}

const lerp = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
}

const lerpColor = (start: string, end: string, t: number) => {
  const startRgb = hexToRgb(start);
  const endRgb = hexToRgb(end);
  const r = lerp(startRgb.r, endRgb.r, t);
  const g = lerp(startRgb.g, endRgb.g, t);
  const b = lerp(startRgb.b, endRgb.b, t);
  return rgbToHex(r, g, b);
}

const TRANSITION_DURATION = 15; // minutes

const PHASES = {
  NIGHT: {
    colors: ["#010102", "#05070c", "#0a0f16"],
    isNight: true,
    lightColor: "#aaccff",
    lightIntensity: 0.4,
    ambientIntensity: 0.3,
    starOpacity: 1
  },
  DAWN: {
    colors: ["#141E30", "#5f4c68", "#f4d797"], // Dark Blue -> Muted Purple -> Dawn Gold
    isNight: false,
    lightColor: "#ffccaa",
    lightIntensity: 0.8,
    ambientIntensity: 0.5,
    starOpacity: 0
  },
  DAY: {
    colors: ["#246fa8", "#679dc5", "#cce0f4"], // Deep Sky Blue -> User's Blue -> Light Horizon
    isNight: false,
    lightColor: "#ffffff",
    lightIntensity: 1.0,
    ambientIntensity: 0.7,
    starOpacity: 0
  },
  SUNSET: {
    colors: ["#2c3e50", "#d66d75", "#ebb58a"], // Dark Blue -> Sunset Red -> User's Sunset Orange
    isNight: false,
    lightColor: "#ffaa88",
    lightIntensity: 0.8,
    ambientIntensity: 0.5,
    starOpacity: 0.3
  }
};

export function useDayNightCycle() {
  // Initialize with null to avoid hydration mismatch
  const [time, setTime] = useState<number | null>(null);

  useEffect(() => {
    const updateTime = () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const phaseParam = params.get("phase");
        const timeParam = params.get("time");
        const hourParam = params.get("hour");

        if (phaseParam) {
          const dawnStart = 5 * 60;
          const dayStart = 7 * 60;
          const sunsetStart = 18 * 60;
          const nightStart = 20 * 60;
          const phaseMap: Record<string, number> = {
            dawn: dawnStart + 5,
            day: dayStart + TRANSITION_DURATION + 5,
            sunset: sunsetStart + 5,
            night: nightStart + TRANSITION_DURATION + 5,
          };

          if (phaseParam in phaseMap) {
            setTime(phaseMap[phaseParam]);
            return;
          }
        }

        if (timeParam) {
          const [h, m] = timeParam.split(":").map(Number);
          if (!isNaN(h) && !isNaN(m)) {
            setTime(h * 60 + m);
            return;
          }
        }
        if (hourParam) {
          const h = Number(hourParam);
          if (!isNaN(h)) {
            setTime(h * 60);
            return;
          }
        }
      }
      
      const now = new Date();
      setTime(now.getHours() * 60 + now.getMinutes());
    };

    // Initial update
    updateTime();

    // If we have a manual override in the URL, don't set up the interval
    const params = new URLSearchParams(window.location.search);
    if (params.has("time") || params.has("hour") || params.has("phase")) return;
    
    // Update every minute
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  return useMemo(() => {
    // Default to Night if time is not yet determined (SSR or initial client render)
    if (time === null) {
      const phase = PHASES.NIGHT;
      return {
        gradient: `linear-gradient(to bottom, ${phase.colors[0]}, ${phase.colors[1]}, ${phase.colors[2]})`,
        isNight: phase.isNight,
        lightColor: phase.lightColor,
        lightIntensity: phase.lightIntensity,
        ambientIntensity: phase.ambientIntensity,
        starOpacity: phase.starOpacity
      };
    }

    // Define transition start times (in minutes)
    const dawnStart = 5 * 60;      // 05:00 -> 300
    const dayStart = 7 * 60;       // 07:00 -> 420
    const sunsetStart = 18 * 60;   // 18:00 -> 1080
    const nightStart = 20 * 60;    // 20:00 -> 1200

    let currentPhase = PHASES.NIGHT;
    let nextPhase = PHASES.NIGHT;
    let progress = 0;

    if (time >= dawnStart && time < dawnStart + TRANSITION_DURATION) {
      // Transition Night -> Dawn
      currentPhase = PHASES.NIGHT;
      nextPhase = PHASES.DAWN;
      progress = (time - dawnStart) / TRANSITION_DURATION;
    } else if (time >= dawnStart + TRANSITION_DURATION && time < dayStart) {
      // Dawn
      currentPhase = PHASES.DAWN;
      nextPhase = PHASES.DAWN;
      progress = 0;
    } else if (time >= dayStart && time < dayStart + TRANSITION_DURATION) {
      // Transition Dawn -> Day
      currentPhase = PHASES.DAWN;
      nextPhase = PHASES.DAY;
      progress = (time - dayStart) / TRANSITION_DURATION;
    } else if (time >= dayStart + TRANSITION_DURATION && time < sunsetStart) {
      // Day
      currentPhase = PHASES.DAY;
      nextPhase = PHASES.DAY;
      progress = 0;
    } else if (time >= sunsetStart && time < sunsetStart + TRANSITION_DURATION) {
      // Transition Day -> Sunset
      currentPhase = PHASES.DAY;
      nextPhase = PHASES.SUNSET;
      progress = (time - sunsetStart) / TRANSITION_DURATION;
    } else if (time >= sunsetStart + TRANSITION_DURATION && time < nightStart) {
      // Sunset
      currentPhase = PHASES.SUNSET;
      nextPhase = PHASES.SUNSET;
      progress = 0;
    } else if (time >= nightStart && time < nightStart + TRANSITION_DURATION) {
      // Transition Sunset -> Night
      currentPhase = PHASES.SUNSET;
      nextPhase = PHASES.NIGHT;
      progress = (time - nightStart) / TRANSITION_DURATION;
    } else {
      // Night
      currentPhase = PHASES.NIGHT;
      nextPhase = PHASES.NIGHT;
      progress = 0;
    }

    // Interpolate values
    const colors = currentPhase.colors.map((color, index) => 
      lerpColor(color, nextPhase.colors[index], progress)
    );
    
    const gradient = `linear-gradient(to bottom, ${colors[0]}, ${colors[1]}, ${colors[2]})`;
    
    const lightColor = lerpColor(currentPhase.lightColor, nextPhase.lightColor, progress);
    const lightIntensity = lerp(currentPhase.lightIntensity, nextPhase.lightIntensity, progress);
    const ambientIntensity = lerp(currentPhase.ambientIntensity, nextPhase.ambientIntensity, progress);
    const starOpacity = lerp(currentPhase.starOpacity, nextPhase.starOpacity, progress);
    
    // Determine isNight boolean
    // We consider it night if we are in Night phase or transitioning to/from it with significant darkness
    // Or simply if starOpacity > 0.1
    const isNight = starOpacity > 0.1;
    
    // Determine isDay boolean - strictly daytime (after dawn, before sunset)
    // Day phase is from dayStart + TRANSITION_DURATION (07:15) to sunsetStart (18:00)
    const isDay = time >= dayStart + TRANSITION_DURATION && time < sunsetStart;

    return {
      gradient,
      isNight,
      isDay,
      lightColor,
      lightIntensity,
      ambientIntensity,
      starOpacity
    };
  }, [time]);
}
