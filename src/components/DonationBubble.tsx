"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import type { GoofySphereProps, OrbitSatellite } from "@/components/GoofySphere";
import { SatelliteUser } from "@/components/InteractiveSphere3D";

const GoofySphere = dynamic<GoofySphereProps>(
  () => import("@/components/GoofySphere").then((mod) => mod.GoofySphere),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-400/20 via-transparent to-yellow-300/20" />
    ),
  },
);

// Props interface for the DonationBubble component
interface DonationBubbleProps {
  totalBTC: number; // total amount committed so far
  maxBTC?: number; // optional, defines max scale reference
  onAddDonation?: () => void; // callback triggered when user clicks the "Add donation" button
  donations?: Donation[]; // array of individual donations captured elsewhere
  onSatelliteClick?: (user: SatelliteUser) => void; // callback when satellite is clicked
  selectedSatelliteId?: string; // currently selected satellite
  onlineMembers?: Array<{ id: string; alias: string }>;
}

// Interface for mini bubbles that animate towards the main bubble
interface MiniBubble {
  id: number;
  x: number;
  y: number;
  delay: number;
}

// Interface for individual donations displayed inside the main bubble
interface Donation {
  id: string;
  amount: number;
  address: string;
  displayName: string;
  message?: string;
  timestamp: Date;
}

const LOBBY_SATELLITES: OrbitSatellite[] = [
  {
    id: "sat-luna",
    displayName: "Luna Sparks",
    contact: "luna@satsmail.xyz",
    goalBTC: 0.08,
    donatedBTC: 0.021,
    color: "#fde68a",
    orbitDistance: 2.1,
    rotationSpeed: 0.26,
    size: 0.22,
    bio: "Recauda para mini paneles solares en barrios remotos.",
    avatar: "🔆",
    bodyType: "moon",
  },
  {
    id: "sat-orion",
    displayName: "Orion Vega",
    contact: "@orionvega",
    goalBTC: 0.15,
    donatedBTC: 0.054,
    color: "#60a5fa",
    orbitDistance: 2.65,
    rotationSpeed: 0.18,
    size: 0.25,
    bio: "Geek sin fronteras: becas de programación para migrantes.",
    avatar: "🛰️",
    bodyType: "comet",
  },
  {
    id: "sat-maya",
    displayName: "Maya Orbit",
    contact: "maya@atlante.io",
    goalBTC: 0.05,
    donatedBTC: 0.032,
    color: "#f97316",
    orbitDistance: 3.2,
    rotationSpeed: 0.33,
    size: 0.19,
    bio: "Quiere financiar comedores comunitarios en Lima.",
    avatar: "🥣",
    bodyType: "capsule",
  },
  {
    id: "sat-kai",
    displayName: "Kai Node",
    contact: "keybase.io/kainode",
    goalBTC: 0.12,
    donatedBTC: 0.087,
    color: "#34d399",
    orbitDistance: 2.45,
    rotationSpeed: 0.29,
    size: 0.21,
    bio: "Veterano de la plataforma que mentoriza nuevos donantes.",
    avatar: "🛠️",
    bodyType: "drone",
  },
];

const ORBIT_COLORS = ["#f97316", "#60a5fa", "#facc15", "#34d399", "#818cf8", "#f472b6", "#22d3ee"] as const;
const ORBIT_TYPES: OrbitSatellite["bodyType"][] = ["moon", "comet", "drone", "capsule", "ring"];

export default function DonationBubble({
  totalBTC,
  maxBTC = 1,
  onAddDonation: _onAddDonation,
  donations = [],
  showOverlays = false,
  onSatelliteClick,
  selectedSatelliteId: externalSelectedSatelliteId,
  onlineMembers = [],
}: DonationBubbleProps & { showOverlays?: boolean }) {
  const [miniBubbles, setMiniBubbles] = useState<MiniBubble[]>([]);
  const [prevTotal, setPrevTotal] = useState(totalBTC);
  const [isHovering, setIsHovering] = useState(false);
  const [internalSelectedSatelliteId, setInternalSelectedSatelliteId] = useState<string | null>(
    LOBBY_SATELLITES[0]?.id ?? null,
  );

  // Use external selected satellite if provided, otherwise use internal state
  const selectedSatelliteIdValue = externalSelectedSatelliteId ?? internalSelectedSatelliteId;

  const satellites = useMemo(() => {
    if (!donations.length) {
      return LOBBY_SATELLITES;
    }

    return donations.map((donation, index) => {
      const color = ORBIT_COLORS[index % ORBIT_COLORS.length];
      const displayInitial = donation.displayName.charAt(0)?.toUpperCase() ?? "🛰️";
      return {
        id: donation.id,
        displayName: donation.displayName,
        contact: donation.address,
        goalBTC: Math.max(donation.amount * 3, 0.05),
        donatedBTC: donation.amount,
        color,
        orbitDistance: 2.1 + (index % 6) * 0.35,
        rotationSpeed: 0.24 + (index % 5) * 0.04,
        size: 0.2 + Math.min(donation.amount * 5, 0.45),
        bio: donation.message ?? "En órbita con los suyos",
        avatar: displayInitial,
        bodyType: ORBIT_TYPES[index % ORBIT_TYPES.length],
      } satisfies OrbitSatellite;
    });
  }, [donations]);
  const selectedSatellite = useMemo(
    () => satellites.find((sat) => sat.id === selectedSatelliteIdValue) ?? null,
    [satellites, selectedSatelliteIdValue],
  );
  const selectedProgress = useMemo(() => {
    if (!selectedSatellite || selectedSatellite.goalBTC <= 0) return 0;
    return Math.min(1, selectedSatellite.donatedBTC / selectedSatellite.goalBTC);
  }, [selectedSatellite]);

  // Calculate bubble radius based on totalBTC (scales between 100px and 400px)
  const minRadius = 320;
  const maxRadius = 760;
  const progress = Math.min(totalBTC / maxBTC, 1);
  const radius = minRadius + progress * (maxRadius - minRadius);
  const donationCount = donations.length;

  // Detect when totalBTC changes to trigger animation
  useEffect(() => {
    if (totalBTC > prevTotal) {
      // Create a new mini bubble at a random position
      const newBubble: MiniBubble = {
        id: Date.now(),
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        delay: 0,
      };
      
      setMiniBubbles((prev) => [...prev, newBubble]);

      // Remove the bubble after animation completes
      setTimeout(() => {
        setMiniBubbles((prev) => prev.filter((b) => b.id !== newBubble.id));
      }, 1500);
    }
    setPrevTotal(totalBTC);
  }, [totalBTC, prevTotal]);

  return (
  <div className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden bg-[#040814]">
      {/* Background gradient */}
  <div className="absolute inset-0 bg-gradient-to-b from-[#030712] via-[#050b1a] to-[#030712]" />

      {onlineMembers.length > 0 && (
        <div className="absolute top-10 right-10 z-30 rounded-2xl border border-amber-400/40 bg-slate-900/70 px-4 py-3 shadow-xl backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.3em] text-amber-200/80 mb-2">
            En órbita ahora mismo
          </p>
          <div className="flex flex-wrap gap-2 max-w-[220px]">
            {onlineMembers.slice(0, 6).map((member) => (
              <span
                key={member.id}
                className="px-2.5 py-1 rounded-full bg-slate-800/80 text-xs text-slate-100 border border-amber-400/20"
              >
                {member.alias}
              </span>
            ))}
            {onlineMembers.length > 6 && (
              <span className="px-2 py-1 text-xs text-amber-200/80">
                +{onlineMembers.length - 6} más
              </span>
            )}
          </div>
        </div>
      )}

      {/* Title */}
      {/* Title intentionally hidden for immersive view */}

      {/* Main bubble container */}
      <div className="relative z-10">
        {/* Tooltip removed per user request */}

        {/* Main donation bubble with 3D sphere */}
        <motion.div
          key={`bubble-${totalBTC}`}
          className="relative flex items-center justify-center rounded-full shadow-[0_25px_80px_rgba(251,146,60,0.45)] cursor-pointer"
          style={{
            width: `${radius * 2}px`,
            height: `${radius * 2}px`,
          }}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          initial={{ scale: 0.92 }}
          animate={{
            scale: [1, 1.05, 1],
            y: [0, -18, 0, -12, 0],
            filter: [
              "drop-shadow(0 25px 60px rgba(251,146,60,0.35))",
              "drop-shadow(0 35px 90px rgba(251,146,60,0.55))",
              "drop-shadow(0 25px 60px rgba(251,146,60,0.35))",
            ],
          }}
          transition={{
            scale: { duration: 0.6, ease: "easeOut" },
            y: {
              duration: 4.5,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "loop",
            },
            filter: { duration: 0.6, ease: "easeOut" },
          }}
          aria-label={`Donation total of ${totalBTC.toFixed(3)} BTC across ${donationCount} contributions`}
        >
          {/* 3D sphere canvas */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <GoofySphere
              radiusPx={radius}
              satellites={satellites}
              activeSatelliteId={selectedSatelliteIdValue}
              onSatelliteSelect={(satellite) => {
                if (onSatelliteClick) {
                  // Convert OrbitSatellite to SatelliteUser format
                  const user: SatelliteUser = {
                    id: satellite.id,
                    displayName: satellite.displayName,
                    currentBTC: `${satellite.donatedBTC.toFixed(3)} BTC`,
                    goalBTC: satellite.goalBTC,
                    purpose: satellite.bio || "Sin descripción",
                    avatar: satellite.avatar,
                    walletAddress: satellite.contact,
                  };
                  onSatelliteClick(user);
                } else {
                  setInternalSelectedSatelliteId(satellite.id);
                }
              }}
            />
          </div>

          {/* Halo glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#ef8e19]/55 via-transparent to-[#ef8e19]/35 blur-3xl" aria-hidden />

          {/* Inner radial haze */}
          <div className="absolute inset-[10%] rounded-full bg-gradient-to-br from-[#ef8e19]/20 via-transparent to-amber-200/12" aria-hidden />

          {/* Particle effects (optional ascending particles) */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-2 h-2 bg-yellow-300 rounded-full opacity-60"
              style={{
                left: `${50 + Math.cos((i / 8) * Math.PI * 2) * 45}%`,
                top: `${50 + Math.sin((i / 8) * Math.PI * 2) * 45}%`,
              }}
              animate={{
                y: [-10, -40],
                opacity: [0.6, 0],
                scale: [1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.25,
                ease: "easeOut",
              }}
            />
          ))}
        </motion.div>
        {showOverlays && (
          <AnimatePresence mode="wait">
            {selectedSatellite && (
              <motion.div
                key={selectedSatellite.id}
                className="absolute top-14 left-14 z-30 w-[320px] rounded-2xl border border-[#f0ad4e]/40 bg-slate-950/70 p-6 backdrop-blur-xl shadow-2xl"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              >
                <div className="flex items-start justify-between text-slate-100">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.32em] text-amber-200/75">
                      Habitante
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold">
                      {selectedSatellite.displayName}
                    </h2>
                  </div>
                  <div className="text-3xl drop-shadow-lg">
                    {selectedSatellite.avatar ?? "🛰️"}
                  </div>
                </div>
                {selectedSatellite.bio && (
                  <p className="mt-4 text-sm leading-relaxed text-slate-300">
                    {selectedSatellite.bio}
                  </p>
                )}
                <div className="mt-5 space-y-2 text-sm text-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Contacto</span>
                    <span className="font-medium text-amber-200">
                      {selectedSatellite.contact}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Meta</span>
                    <span className="font-medium">
                      {selectedSatellite.goalBTC.toFixed(3)} BTC
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Donado</span>
                    <span className="font-medium text-emerald-200">
                      {selectedSatellite.donatedBTC.toFixed(3)} BTC
                    </span>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="h-2 w-full rounded-full bg-slate-700/40">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-amber-300"
                      style={{
                        width: `${Math.max(0, Math.min(100, selectedProgress * 100))}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {Math.round(selectedProgress * 100)}% de la meta alcanzada
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        {showOverlays ? (
          <motion.div
            className="absolute bottom-14 right-14 z-30 rounded-full border border-amber-400/20 bg-slate-900/60 px-5 py-3 text-xs uppercase tracking-[0.32em] text-slate-300/90 backdrop-blur"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            Haz clic en un satélite en órbita
          </motion.div>
        ) : null}
      </div>

      {/* Mini bubbles that animate towards the center */}
      <AnimatePresence>
        {miniBubbles.map((bubble) => (
          <motion.div
            key={bubble.id}
            className="absolute w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 shadow-lg"
            style={{
              left: bubble.x,
              top: bubble.y,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 1, 0.8],
              opacity: [0, 1, 0],
              x: window.innerWidth / 2 - bubble.x,
              y: window.innerHeight / 2 - bubble.y,
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              duration: 1.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </AnimatePresence>

      {/* Add donation button */}
      {/* Donation CTA hidden for presentation mode */}
    </div>
  );
}
