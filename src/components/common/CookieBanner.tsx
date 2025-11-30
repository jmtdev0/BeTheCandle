"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCookieConsent } from "@/contexts/CookieConsentContext";

export default function CookieBanner() {
  const { consent, acceptAll, rejectNonEssential } = useCookieConsent();
  const [showDetails, setShowDetails] = useState(false);

  // Don't show banner if user has already made a choice
  if (consent !== null) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[200] p-4 md:p-6"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/20 bg-black/90 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="p-5 md:p-6">
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl" aria-hidden="true">🍪</span>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white mb-1">Cookies y Privacidad</h2>
                <p className="text-sm text-white/70">
                  Utilizamos cookies para mejorar tu experiencia. Algunas son esenciales para el funcionamiento del sistema, otras guardan tus preferencias.
                </p>
              </div>
            </div>

            {/* Details toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-[#2276cb] hover:text-white transition-colors underline underline-offset-2 mb-4"
              aria-expanded={showDetails}
            >
              {showDetails ? "Ocultar detalles" : "Ver detalles de las cookies"}
            </button>

            {/* Cookie details */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 mb-5 pb-4 border-b border-white/10">
                    {/* Essential cookies */}
                    <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-emerald-200">🔒 Estrictamente Necesarias</h3>
                        <span className="text-xs text-emerald-300/70 bg-emerald-500/20 px-2 py-0.5 rounded">Siempre activas</span>
                      </div>
                      <p className="text-xs text-emerald-100/70 mb-2">
                        Estas cookies son imprescindibles para que el sistema funcione. Sin ellas no puedes participar en el reparto del Community Pot.
                      </p>
                      <ul className="text-xs text-emerald-100/60 space-y-1 ml-4 list-disc">
                        <li><code className="bg-black/30 px-1 rounded">community_pot_visitor_id</code> — Identificador único de visitante (UUID)</li>
                        <li><code className="bg-black/30 px-1 rounded">community_pot_join_meta</code> — Información de tu participación (wallet, semana)</li>
                        <li><code className="bg-black/30 px-1 rounded">cookie_consent</code> — Tu elección de consentimiento</li>
                      </ul>
                    </div>

                    {/* Preference cookies */}
                    <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-amber-200">⚙️ Preferencias</h3>
                        <span className="text-xs text-amber-300/70 bg-amber-500/20 px-2 py-0.5 rounded">Opcionales</span>
                      </div>
                      <p className="text-xs text-amber-100/70 mb-2">
                        Estas cookies guardan tus preferencias visuales y de audio para mejorar tu experiencia. Puedes rechazarlas sin afectar la funcionalidad principal.
                      </p>
                      <ul className="text-xs text-amber-100/60 space-y-1 ml-4 list-disc">
                        <li><code className="bg-black/30 px-1 rounded">music_volume</code> — Nivel de volumen de la música</li>
                        <li><code className="bg-black/30 px-1 rounded">music_muted</code> — Estado de silencio del reproductor</li>
                        <li><code className="bg-black/30 px-1 rounded">satelliteColor</code> — Color de tu satélite en el Lobby</li>
                      </ul>
                    </div>

                    {/* No tracking notice */}
                    <div className="rounded-lg border border-purple-400/30 bg-purple-500/10 p-3">
                      <p className="text-xs text-purple-100/80">
                        <span className="font-semibold">🚫 Sin rastreo:</span> No utilizamos cookies de analítica, publicidad ni rastreo de terceros. Tu privacidad es importante para nosotros.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={acceptAll}
                className="flex-1 px-6 py-3 bg-[#2276cb] text-white rounded-xl font-semibold hover:bg-[#1a5ba8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2276cb]/50"
              >
                Aceptar todo
              </button>
              <button
                onClick={rejectNonEssential}
                className="flex-1 px-6 py-3 bg-white/10 text-white border border-white/20 rounded-xl font-semibold hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                Solo esenciales
              </button>
            </div>

            {/* Legal link */}
            <p className="mt-4 text-xs text-white/50 text-center">
              Al usar este sitio, aceptas nuestra{" "}
              <a href="/privacy" className="text-[#2276cb] hover:text-white underline underline-offset-2 transition-colors">
                Política de Privacidad
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
