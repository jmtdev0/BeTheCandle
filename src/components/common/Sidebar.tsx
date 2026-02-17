"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { User } from "lucide-react";
import { usePageTransition } from "@/contexts/PageTransitionContext";

interface MenuItem {
  label: string;
  href: string;
  icon: string;
  badge?: ReactNode;
}

const menuItems: MenuItem[] = [
  { label: "Community Pot", href: "/", icon: "🌌" },
  // { label: "Even Goofier Mode", href: "/even-goofier-mode", icon: "🎪" },
];

interface SidebarProps {
  onProfileClick?: () => void;
  onActivateClick?: () => void;
  onSignOutClick?: () => void;
  hasSatellite?: boolean;
  isActivatingSatellite?: boolean;
  canActivateSatellite?: boolean;
  activationError?: string | null;
  showSatelliteButton?: boolean;
}

export default function Sidebar({
  onProfileClick,
  onActivateClick,
  onSignOutClick,
  hasSatellite,
  isActivatingSatellite,
  canActivateSatellite,
  activationError,
  showSatelliteButton = false,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchHasMoved = useRef(false);
  const pathname = usePathname();
  const { navigate } = usePageTransition();

  // Sidebar disabled - no longer opens on hover or mobile
  // useEffect(() => {
  //   const handleMouseMove = (e: MouseEvent) => {
  //     // Show sidebar when mouse is near left edge (within 50px)
  //     if (e.clientX <= 50) {
  //       setIsOpen(true);
  //     } else if (e.clientX > 300) {
  //       // Hide when mouse moves away (beyond sidebar width + buffer)
  //       setIsOpen(false);
  //     }
  //   };

  //   window.addEventListener("mousemove", handleMouseMove);
  //   return () => window.removeEventListener("mousemove", handleMouseMove);
  // }, []);

  // Notify others when sidebar opens/closes so UI can adapt (hide info panels, etc.)
  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent('sidebar-open', { detail: isOpen }));
    } catch (e) {
      // ignore
    }
  }, [isOpen]);

  // Close the sidebar when clicking/tapping outside of it (use pointerdown to catch touch)
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      try {
        const target = e.target as Node | null;
        if (containerRef.current && target && !containerRef.current.contains(target)) {
          setIsOpen(false);
        }
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  // Touch handlers for swipe-to-close on mobile: swipe left to close
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isOpen) return;
    if (!e.touches || e.touches.length === 0) return;
    touchStartX.current = e.touches[0].clientX;
    touchHasMoved.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isOpen) return;
    if (touchStartX.current == null) return;
    const x = e.touches[0].clientX;
    const dx = x - (touchStartX.current ?? 0);
    // If user swipes left more than threshold, close sidebar
    const SWIPE_THRESHOLD = -60; // negative => left swipe
    if (dx <= SWIPE_THRESHOLD && !touchHasMoved.current) {
      setIsOpen(false);
      touchHasMoved.current = true;
    }
  };

  const handleTouchEnd = () => {
    touchStartX.current = null;
    touchHasMoved.current = false;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          className="fixed left-0 top-0 h-[72vh] md:h-[50vh] w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl z-50 border-r border-b border-orange-500/30 rounded-br-2xl"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          initial={{ x: -256 }}
          animate={{ x: 0 }}
          exit={{ x: -256 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="p-6 h-full flex flex-col">
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
                      <button
                        onClick={() => navigate(item.href)}
                        className={`relative group w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/50 text-orange-300"
                          : "hover:bg-slate-700/50 text-slate-300 hover:text-orange-200"
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <div className="flex-1 text-left">
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </nav>

            {/* Profile button */}
            {hasSatellite && (
              <div className="mt-auto pt-4 border-t border-slate-700">
                <div className="space-y-2">
                  <button
                    onClick={onProfileClick}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-slate-700/50 text-slate-300 hover:text-orange-200 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-slate-900">
                      <User size={18} />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="text-sm font-medium block">My Profile</span>
                      <span className="text-xs text-slate-500 group-hover:text-slate-400">
                        Edit settings
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={onSignOutClick}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}

            {/* Footer - GitHub link */}
            <div className="mt-auto pt-4 border-t border-slate-700">
              <a
                href="https://github.com/jmtdev0/BeTheCandle"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all text-slate-400 hover:text-white hover:bg-slate-700/50 text-xs font-medium group"
              >
                <span className="text-sm">📱</span>
                <span>GitHub Repository</span>
                <span className="text-slate-500 group-hover:text-slate-400 ml-auto">→</span>
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
