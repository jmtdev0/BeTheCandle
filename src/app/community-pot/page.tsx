"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import Nebula3D from "@/components/community-pot/Nebula3D";
import MusicPlayer from "@/components/common/MusicPlayer";
import InfoPopup from "@/components/common/InfoPopup";
import { useCommunityPot } from "@/hooks/useCommunityPot";
import { useSupabaseAuth } from "@/components/common/AuthProvider";
import { formatPolygonAddress } from "@/lib/communityPot";

export default function CommunityPotPage() {
  const { user, openAuthPrompt } = useSupabaseAuth();
  const communityPot = useCommunityPot();
  const {
    week,
    participants,
    perParticipantAmountUsdc,
    countdown,
    loading,
    refreshing,
    error,
    viewerAddress,
    joinCommunityPot,
  } = communityPot;

  const [polygonAddress, setPolygonAddress] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (viewerAddress) {
      setPolygonAddress(viewerAddress);
    }
  }, [viewerAddress]);

  const participantCount = week?.participantCount ?? 0;
  const nebulaEnergy = useMemo(() => {
    const amount = Number(week?.amountUsdc ?? "0");
    return Number.isFinite(amount) ? Math.round(amount * 100000) : 0;
  }, [week?.amountUsdc]);

  const statusLabel = useMemo(() => {
    switch (week?.status) {
      case "paid":
        return "Pagado";
      case "closed":
        return "Cupo completo";
      default:
        return "Abierto";
    }
  }, [week?.status]);

  const statusColor = useMemo(() => {
    switch (week?.status) {
      case "paid":
        return "bg-green-500/20 text-green-200 border border-green-500/40";
      case "closed":
        return "bg-yellow-500/20 text-yellow-100 border border-yellow-500/40";
      default:
        return "bg-purple-500/20 text-purple-100 border border-purple-500/40";
    }
  }, [week?.status]);

  const distributionLabel = useMemo(() => {
    if (!week) return "";
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Europe/Madrid",
    }).format(new Date(week.distributionAt));
  }, [week]);

  const handleJoin = async () => {
    if (!week) return;
    if (!user) {
      openAuthPrompt("action");
      return;
    }

    const normalized = polygonAddress.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(normalized)) {
      setJoinError("Introduce una dirección Polygon válida");
      return;
    }

    if (week.status === "paid") {
      setJoinError("Esta semana ya fue distribuida");
      return;
    }

    if (week.spotsRemaining === 0 && !viewerAddress) {
      setJoinError("El cupo está completo");
      return;
    }

    setJoinError(null);
    setIsSubmitting(true);
    try {
      await joinCommunityPot(normalized);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown";
      const friendly = mapJoinError(reason);
      setJoinError(friendly);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-black via-purple-950 to-black overflow-hidden">
      {/* Info Popup */}
      <InfoPopup
        title="Community Pot"
        content={`Welcome to the Community Pot - a collective treasury where Bitcoin supporters come together.

Each semana activamos una "olla comunitaria" de USDC en Polygon. Hasta 10 participantes pueden reservar su plaza dejando su dirección Polygon. Todos reciben la misma porción el domingo a las 16:30 CET cuando ejecutamos el pago on-chain.

• Cupo máximo configurable de 10 personas
• Cuenta regresiva hacia el próximo pago
• Seguimiento en vivo de las plazas restantes
• Registro histórico en Supabase + PolygonScan

Atento: El pago semanal se realiza manualmente desde nuestra wallet verificada.`}
      />

      {/* Canvas 3D con la nebulosa */}
      <Canvas
        camera={{ position: [0, 0, 30], fov: 75 }}
        className="absolute inset-0"
        gl={{ preserveDrawingBuffer: true }}
        onPointerMissed={() => {
          // Prevent pointer capture errors
        }}
      >
        <color attach="background" args={["#000000"]} />
        
        {/* Nebulosa con partículas instanciadas */}
        <Nebula3D participantCount={participantCount} totalSats={nebulaEnergy} />

        {/* Post-processing para efectos visuales */}
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            intensity={1.5}
          />
        </EffectComposer>

        {/* Controles de cámara */}
        <OrbitControls
          enablePan={false}
          minDistance={15}
          maxDistance={50}
          enableDamping
          dampingFactor={0.05}
          makeDefault
        />
      </Canvas>

      {/* UI Overlay - pointer-events-none en el contenedor */}
      <div className="absolute top-8 left-8 z-10 pointer-events-auto bg-black/60 backdrop-blur-md p-6 rounded-xl border border-purple-500/30 space-y-4 w-[360px]">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">🌌 Community Pot</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <div className="space-y-3 text-white text-sm">
          <InfoRow label="Monto semanal" value={week ? `${Number(week.amountUsdc).toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC` : "—"} />
          <InfoRow label="Pago" value={distributionLabel || "—"} />
          <InfoRow label="Cuenta regresiva" value={countdown.label || "—"} highlight />
          <InfoRow label="Participantes" value={`${participantCount}/${week?.maxParticipants ?? 10}`} />
          <InfoRow label="Plazas disponibles" value={week ? Math.max(week.spotsRemaining, 0) : "—"} />
          <InfoRow label="Pago estimado" value={perParticipantAmountUsdc ? `${perParticipantAmountUsdc} USDC` : "Depende del cupo"} />
        </div>
        {refreshing && <p className="text-xs text-purple-200">Actualizando…</p>}
      </div>

      {/* Join form */}
      <div className="absolute bottom-8 right-8 z-10 pointer-events-auto bg-black/60 backdrop-blur-md p-6 rounded-xl border border-purple-500/30 w-[360px] space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white">Reserva tu plaza</h2>
          <p className="text-sm text-purple-200 mt-1">Necesitas una cuenta Supabase y una dirección Polygon válida.</p>
        </div>
        <div>
          <label className="block text-sm text-purple-300 mb-2">Dirección Polygon (USDC)</label>
          <input
            type="text"
            value={polygonAddress}
            onChange={(event) => setPolygonAddress(event.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 bg-black/50 border border-purple-500/40 rounded-lg text-white focus:outline-none focus:border-purple-300"
          />
        </div>
        {joinError && <p className="text-sm text-red-300">{joinError}</p>}
        {!user && <p className="text-xs text-yellow-200">Debes iniciar sesión para unirte.</p>}
        <button
          onClick={handleJoin}
          disabled={isSubmitting || loading || (week?.spotsRemaining === 0 && !viewerAddress)}
          className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-500 transition-colors disabled:opacity-40"
        >
          {viewerAddress ? "Actualizar dirección" : "Unirme"}
        </button>
        <p className="text-xs text-gray-400 text-center">
          El pago manual se ejecuta cada domingo 16:30 CET.
        </p>
      </div>

      {/* Participants list */}
      <div className="absolute bottom-8 left-8 z-10 pointer-events-auto bg-black/55 backdrop-blur-md p-6 rounded-xl border border-purple-500/30 w-[360px] max-h-[45vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Tripulación semanal</h3>
          <span className="text-xs text-purple-200">{participantCount} participantes</span>
        </div>
        <ul className="space-y-3">
          {participants.length === 0 && (
            <li className="text-sm text-purple-200">Aún no hay participantes para esta semana.</li>
          )}
          {participants.map((participant) => (
            <li
              key={participant.id}
              className="flex items-center justify-between text-sm text-white bg-white/5 rounded-lg px-3 py-2"
            >
              <div>
                <p className="font-semibold">
                  {participant.displayName}
                  {participant.isViewer && <span className="ml-2 text-xs text-emerald-300">(tú)</span>}
                </p>
                <p className="text-xs text-purple-200">
                  {formatPolygonAddress(participant.polygonAddress)}
                </p>
              </div>
              <span className="text-xs text-gray-300">
                {new Date(participant.joinedAt).toLocaleDateString("es-ES", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Reproductor de música */}
      <div className="absolute bottom-8 left-8 z-10 pointer-events-auto">
        <MusicPlayer />
      </div>

      {/* Link to go back to Lobby */}
      <div className="absolute top-8 right-8 z-10 pointer-events-auto">
        <a
          href="/lobby"
          className="px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-lg font-semibold hover:bg-white/20 transition-colors border border-white/20"
        >
          ← Back to Lobby
        </a>
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-purple-200 text-sm">{label}</span>
      <span className={`font-semibold text-right ${highlight ? "text-yellow-300 font-mono" : "text-white"}`}>
        {value}
      </span>
    </div>
  );
}

function mapJoinError(code: string) {
  switch (code) {
    case "auth_required":
      return "Inicia sesión para participar.";
    case "invalid_address":
      return "Dirección Polygon inválida.";
    case "address_in_use":
      return "Esa dirección ya está registrada esta semana.";
    case "unauthorized":
      return "No tienes permiso para esta acción.";
    default:
      return "No pudimos guardar tu plaza. Intenta de nuevo.";
  }
}
