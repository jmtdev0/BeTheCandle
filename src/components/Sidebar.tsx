"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { label: "Goofy Mode", href: "/goofy-mode" },
  { label: "Even Goofier Mode", href: "/even-goofier-mode" },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Show sidebar when mouse is near left edge (within 50px)
      if (e.clientX <= 50) {
        setIsOpen(true);
      } else if (e.clientX > 300) {
        // Hide when mouse moves away (beyond sidebar width + buffer)
        setIsOpen(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl z-50 border-r border-orange-500/30"
          initial={{ x: -256 }}
          animate={{ x: 0 }}
          exit={{ x: -256 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="p-6 h-full flex flex-col">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
                ₿TC Menu
              </h2>
              <p className="text-xs text-slate-400 mt-1">Navigate your journey</p>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 space-y-4">
              {menuItems.map((item, index) => {
                const isActive = pathname === item.href;
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      href={item.href}
                      className={`block px-4 py-3 rounded-lg transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/50 text-orange-300"
                          : "hover:bg-slate-700/50 text-slate-300 hover:text-orange-200"
                      }`}
                    >
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            {/* Footer hint */}
            <div className="mt-auto pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-500 text-center">
                Move mouse away to hide
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
