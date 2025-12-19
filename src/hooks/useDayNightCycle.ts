import { useState, useEffect, useMemo } from "react";

export function useDayNightCycle() {
  const [hour, setHour] = useState(new Date().getHours());

  useEffect(() => {
    const updateTime = () => setHour(new Date().getHours());
    // Check every minute
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  return useMemo(() => {
    if (hour >= 6 && hour < 9) {
      // Sunrise / Dawn
      return {
        gradient: "linear-gradient(to bottom, #1a2a6c, #b21f1f, #fdbb2d)",
        isNight: false,
        lightColor: "#ffccaa",
        lightIntensity: 0.8,
        ambientIntensity: 0.5,
        starOpacity: 0
      };
    } else if (hour >= 9 && hour < 17) {
      // Day
      return {
        gradient: "linear-gradient(to bottom, #4a7ba7, #87c4e8, #daf3fe)",
        isNight: false,
        lightColor: "#ffffff",
        lightIntensity: 1.0,
        ambientIntensity: 0.7,
        starOpacity: 0
      };
    } else if (hour >= 17 && hour < 20) {
      // Sunset / Dusk
      return {
        gradient: "linear-gradient(to bottom, #2c3e50, #fd746c, #ff9068)",
        isNight: false,
        lightColor: "#ffaa88",
        lightIntensity: 0.8,
        ambientIntensity: 0.5,
        starOpacity: 0.3
      };
    } else {
      // Night
      return {
        gradient: "linear-gradient(to bottom, #0f2027, #203a43, #2c5364)",
        isNight: true,
        lightColor: "#aaccff",
        lightIntensity: 0.4,
        ambientIntensity: 0.3,
        starOpacity: 1
      };
    }
  }, [hour]);
}
