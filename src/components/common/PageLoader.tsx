"use client";

import React from "react";
import { motion } from "framer-motion";

interface PageLoaderProps {
  message?: string;
}

export default function PageLoader({ message = "Loading..." }: PageLoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Spinning orbit loader */}
        <div className="relative w-24 h-24">
          {/* Center dot - pulsing */}
          <motion.div
            className="absolute top-1/2 left-1/2 w-4 h-4 -mt-2 -ml-2 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 shadow-lg shadow-orange-500/50"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* Orbiting dots */}
          {[0, 120, 240].map((rotation, index) => (
            <motion.div
              key={index}
              className="absolute top-1/2 left-1/2"
              animate={{
                rotate: [rotation, rotation + 360],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <div
                className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-cyan-600 shadow-lg shadow-blue-500/50"
                style={{
                  transform: "translate(35px, -6px)",
                }}
              />
            </motion.div>
          ))}
          
          {/* Outer ring - subtle pulse */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-slate-600/30"
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        {/* Loading text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-2"
        >
          <p className="text-lg font-semibold text-white">{message}</p>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-orange-400"
                animate={{
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
