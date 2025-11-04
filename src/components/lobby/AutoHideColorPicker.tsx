"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SatelliteColorPicker from "./SatelliteColorPicker";
import type { SatelliteColorOption } from "@/lib/satelliteColors";

interface AutoHideColorPickerProps {
  value: SatelliteColorOption;
  onChange: (color: SatelliteColorOption) => void;
}

export default function AutoHideColorPicker({ value, onChange }: AutoHideColorPickerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Show when mouse is near top-right corner (within 100px from right, 100px from top)
      const distanceFromRight = window.innerWidth - e.clientX;
      const distanceFromTop = e.clientY;
      
      if (distanceFromRight <= 100 && distanceFromTop <= 100) {
        setIsVisible(true);
      } else if (distanceFromRight > 200 || distanceFromTop > 200) {
        setIsVisible(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.8, x: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="absolute top-6 right-6 z-[60]"
        >
          <SatelliteColorPicker
            value={value}
            onChange={onChange}
            className="relative"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
