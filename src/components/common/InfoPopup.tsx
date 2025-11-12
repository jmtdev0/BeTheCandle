"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, X } from "lucide-react";

interface InfoPopupProps {
  title: string;
  content: string;
}

export default function InfoPopup({ title, content }: InfoPopupProps) {
  const [isIconVisible, setIsIconVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Show icon when mouse is near top-center (within 100px from top, centered horizontally ±200px)
      const distanceFromTop = e.clientY;
      const distanceFromCenter = Math.abs(e.clientX - window.innerWidth / 2);
      
      if (distanceFromTop <= 100 && distanceFromCenter <= 200) {
        setIsIconVisible(true);
      } else if (distanceFromTop > 150 || distanceFromCenter > 250) {
        setIsIconVisible(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <>
      {/* Info Icon */}
      <motion.div
        className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isIconVisible ? 1 : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{ pointerEvents: isIconVisible ? "auto" : "none" }}
      >
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/95 border border-amber-400/40 backdrop-blur-md shadow-lg hover:bg-slate-800/95 hover:border-amber-400/60 transition-all group"
        >
          <Info size={18} className="text-amber-400" />
          <span className="text-sm font-medium text-slate-200 group-hover:text-amber-100">
            What is this?
          </span>
        </button>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <div className="fixed inset-0 z-[101] flex items-center justify-center px-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="pointer-events-auto w-full max-w-lg rounded-2xl border border-amber-400/30 bg-slate-900/95 shadow-2xl backdrop-blur-xl overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-700/50">
                  <h2 className="text-2xl font-bold text-amber-100">{title}</h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
                    aria-label="Close"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-6">
                  <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                    {content}
                  </p>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="w-full rounded-lg border border-amber-400/30 bg-amber-400/20 px-4 py-2.5 font-medium text-amber-100 transition hover:bg-amber-400/30"
                  >
                    Got it!
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
