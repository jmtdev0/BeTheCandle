// @ts-nocheck
"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard, Float, Environment, Lightformer, OrbitControls, Text, useCursor } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import logger from '@/lib/loggerClient';

export interface OrbitSatellite {
  id: string;
  displayName: string;
  contact: string;
  goalBTC: number;
  donatedBTC: number;
  color: string;
  orbitDistance?: number;
  rotationSpeed?: number;
  size?: number;
  bio?: string;
  avatar?: string;
  bodyType?: "moon" | "comet" | "capsule" | "ring" | "drone";
}

export interface GoofySphereProps {
  radiusPx: number;
  satellites?: OrbitSatellite[];
  onSatelliteSelect?: (satellite: OrbitSatellite) => void;
  activeSatelliteId?: string | null;
  autoRotate?: boolean;
}

interface SatelliteConfig {
  payload: OrbitSatellite;
  radius: number;
  speed: number;
  size: number;
  initialAngle: number;
}

function RotatingSphere({ scale, autoRotate = false }: { scale: number; autoRotate?: boolean }) {
  const rotationGroupRef = useRef<THREE.Group>(null);
  const tiltGroupRef = useRef<THREE.Group>(null);
  const three = useThree();
  const controls = (three as any).controls;
  const gl = (three as any).gl;
  const canvasEl: HTMLCanvasElement | null = gl?.domElement ?? null;
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const windowMoveRef = useRef<(e: PointerEvent) => void>();
  const windowUpRef = useRef<(e: PointerEvent) => void>();

  // Log component mount
  useEffect(() => {
    logger.log({ type: 'component_mount', payload: { component: 'GoofySphere', timestamp: Date.now() } }).catch(() => {});
  }, []);

  // Attach a DOM-level pointerdown listener on the canvas so real user drags work on page load.
  useEffect(() => {
    const el = gl?.domElement as HTMLCanvasElement | undefined;
    if (!el) return;

    const onDomPointerDown = (ev: PointerEvent) => {
      // Only handle left button
      if (ev.button !== 0) return;
      const rect = el.getBoundingClientRect();
      if (ev.clientX < rect.left || ev.clientX > rect.right || ev.clientY < rect.top || ev.clientY > rect.bottom) return;
      ev.preventDefault();
      ev.stopPropagation();
  const pid = ev.pointerId ?? 1;
  try { el.setPointerCapture?.(pid); } catch {}
  draggingRef.current = true;
  lastXRef.current = ev.clientX;
  if (controls) controls.enabled = false;
  try { logger.log({ type: 'pointerdown', payload: { clientX: ev.clientX, clientY: ev.clientY, pointerId: pid } }); } catch {}

      const onWinMove = (e: PointerEvent) => {
        if (!draggingRef.current) return;
        e.preventDefault();
        const clientX = e.clientX;
        const dx = clientX - lastXRef.current;
        lastXRef.current = clientX;
        const sensitivity = 0.008;
        if (rotationGroupRef.current) {
          rotationGroupRef.current.rotation.y += dx * sensitivity;
          try { logger.log({ type: 'pointermove', payload: { clientX, clientY: e.clientY, dx, rotationY: rotationGroupRef.current.rotation.y } }); } catch {}
        }
      };

      const onWinUp = (e: PointerEvent) => {
        const id = e.pointerId ?? pid;
        try { el.releasePointerCapture?.(id); } catch (err) {}
        draggingRef.current = false;
        if (controls) controls.enabled = true;
        window.removeEventListener('pointermove', onWinMove as EventListener);
        window.removeEventListener('pointerup', onWinUp as EventListener);
        try { logger.log({ type: 'pointerup', payload: { pointerId: id } }); } catch {}
      };

      window.addEventListener('pointermove', onWinMove as EventListener, { passive: false });
      window.addEventListener('pointerup', onWinUp as EventListener);
    };

    el.addEventListener('pointerdown', onDomPointerDown, { capture: true });

    return () => {
      try { el.removeEventListener('pointerdown', onDomPointerDown as EventListener, { capture: true } as any); } catch {}
    };
  }, [gl, controls, rotationGroupRef]);

  const surfaceTexture = useMemo(() => {
    if (typeof document === "undefined") return undefined;

    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const baseGradient = ctx.createLinearGradient(0, 0, size, size);
    baseGradient.addColorStop(0, "#371c02");
    baseGradient.addColorStop(0.35, "#8c4a0b");
    baseGradient.addColorStop(0.58, "#ef8e19");
    baseGradient.addColorStop(0.85, "#fdb14c");
    baseGradient.addColorStop(1, "#ffe1a3");
    ctx.fillStyle = baseGradient;
    ctx.fillRect(0, 0, size, size);

    const beltCount = 6;
    for (let i = 0; i < beltCount; i++) {
      const y = size * (0.2 + i * 0.13);
      const height = size * (0.05 + Math.sin(i * 0.7) * 0.015);
      const beltGradient = ctx.createLinearGradient(0, y - height, size, y + height);
      beltGradient.addColorStop(0, "rgba(239, 142, 25, 0.15)");
      beltGradient.addColorStop(0.45, "rgba(75, 29, 6, 0.42)");
      beltGradient.addColorStop(1, "rgba(253, 177, 76, 0.18)");
      ctx.fillStyle = beltGradient;
      ctx.beginPath();
      ctx.ellipse(
        size * (0.5 + Math.sin(i * 0.55) * 0.1),
        y,
        size * 0.62,
        height,
        Math.sin(i * 0.9) * 0.3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    const stormCount = 10;
    for (let i = 0; i < stormCount; i++) {
      const stormX = size * (0.15 + Math.random() * 0.7);
      const stormY = size * (0.2 + Math.random() * 0.6);
      const radiusX = size * (0.035 + Math.random() * 0.08);
      const radiusY = radiusX * (0.55 + Math.random() * 0.5);
      const stormGradient = ctx.createRadialGradient(
        stormX - radiusX * 0.3,
        stormY - radiusY * 0.3,
        radiusY * 0.1,
        stormX,
        stormY,
        radiusX,
      );
      stormGradient.addColorStop(0, "rgba(255, 229, 178, 0.85)");
      stormGradient.addColorStop(1, "rgba(239, 142, 25, 0)");
      ctx.fillStyle = stormGradient;
      ctx.beginPath();
      ctx.ellipse(stormX, stormY, radiusX, radiusY, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const highlight = ctx.createRadialGradient(
      size * 0.32,
      size * 0.3,
      size * 0.05,
      size * 0.34,
      size * 0.34,
      size * 0.34,
    );
    highlight.addColorStop(0, "rgba(255, 223, 171, 0.92)");
    highlight.addColorStop(1, "rgba(255, 223, 171, 0)");
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.arc(size * 0.33, size * 0.33, size * 0.32, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(size * 0.5, size * 0.5);
    ctx.rotate(-Math.PI / 10);
    const symbolGradient = ctx.createLinearGradient(-size * 0.4, -size * 0.3, size * 0.4, size * 0.5);
    symbolGradient.addColorStop(0, "rgba(255, 252, 240, 0.86)");
    symbolGradient.addColorStop(0.45, "rgba(255, 182, 81, 0.88)");
    symbolGradient.addColorStop(1, "rgba(219, 94, 14, 0.55)");
    ctx.fillStyle = symbolGradient;
    ctx.strokeStyle = "rgba(55, 28, 2, 0.35)";
    ctx.lineWidth = size * 0.012;
    ctx.font = `${size * 0.28}px 'Montserrat', 'Inter', 'Segoe UI', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("₿", 0, 0);
    ctx.strokeText("₿", 0, 0);
    ctx.restore();

    // Attempt to reduce the visible vertical seam at the texture UV join by
    // copying a narrow column of pixels from each edge to the opposite side
    // and slightly blending them. This helps ensure the left/right edges of
    // the canvas are visually continuous when mapped around the sphere.
    try {
      const seamPx = Math.max(8, Math.floor(size * 0.01));
      const left = ctx.getImageData(0, 0, seamPx, size);
      ctx.putImageData(left, size - seamPx, 0);
      const right = ctx.getImageData(size - seamPx, 0, seamPx, size);
      ctx.putImageData(right, 0, 0);

      ctx.save();
      const blendW = seamPx * 2;
      const g = ctx.createLinearGradient(size - blendW, 0, size, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.02)');
      ctx.fillStyle = g;
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillRect(size - blendW, 0, blendW, size);
      ctx.restore();
    } catch (err) {
      // ignore - fallback to default texture creation
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.center.set(0.5, 0.5);
    texture.needsUpdate = true;
    return texture;
  }, []);

  const axialTilt = useMemo(() => THREE.MathUtils.degToRad(21), []);
  const baseTilt = useMemo(() => THREE.MathUtils.degToRad(10), []);

  useFrame((state, delta) => {
    if (autoRotate && rotationGroupRef.current) {
      rotationGroupRef.current.rotation.y = (rotationGroupRef.current.rotation.y + delta * 0.45) % (Math.PI * 2);
    }

    if (tiltGroupRef.current) {
      const wobble = Math.sin(state.clock.elapsedTime * 0.35) * THREE.MathUtils.degToRad(1.5);
      tiltGroupRef.current.rotation.x = baseTilt + wobble;
      tiltGroupRef.current.rotation.y = 0;
      tiltGroupRef.current.rotation.z = axialTilt;
    }

    if (surfaceTexture) {
      surfaceTexture.offset.x = (surfaceTexture.offset.x + delta * 0.015) % 1;
    }
  });

  // Pointer drag handlers - rotate planet in place while user drags horizontally
  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    e.preventDefault?.();
    const src = e?.sourceEvent ?? e;
    const pid = src.pointerId ?? e.pointerId ?? 1;
    // try to set pointer capture on the canvas element (more reliable)
    try {
      if (canvasEl && canvasEl.setPointerCapture) canvasEl.setPointerCapture(pid);
      else src.target?.setPointerCapture?.(pid);
    } catch (err) {
      // ignore
    }
    console.debug("GoofySphere: pointerdown", { id: pid, src });
    draggingRef.current = true;
    lastXRef.current = src.clientX ?? 0;
    if (controls) controls.enabled = false;

    // attach window-level handlers to ensure we keep receiving moves even if events bubble differently
    const onWinMove = (ev: PointerEvent) => {
      // forward to our pointer move handler signature
      handlePointerMove({ sourceEvent: ev, pointerId: ev.pointerId, clientX: ev.clientX, clientY: ev.clientY });
    };
    const onWinUp = (ev: PointerEvent) => {
      handlePointerUp({ sourceEvent: ev, pointerId: ev.pointerId });
    };
    windowMoveRef.current = onWinMove;
    windowUpRef.current = onWinUp;
    window.addEventListener('pointermove', onWinMove, { passive: false });
    window.addEventListener('pointerup', onWinUp);
  };

  const handlePointerMove = (e: any) => {
    if (!draggingRef.current) return;
    // don't stopPropagation here because this may be called from window-level handler
    const src = e?.sourceEvent ?? e;
    // if event has preventDefault, try to call to avoid touch scrolling
    src?.preventDefault?.();
    console.debug("GoofySphere: pointermove", { clientX: src.clientX, clientY: src.clientY });
    const clientX = src.clientX ?? 0;
    const dx = clientX - lastXRef.current;
    lastXRef.current = clientX;
    // sensitivity: tune as needed
    const sensitivity = 0.008;
    if (rotationGroupRef.current) {
      rotationGroupRef.current.rotation.y += dx * sensitivity;
    }
  };

  const handlePointerUp = (e: any) => {
    // If called from window event, e may be a native PointerEvent wrapper
    try { e?.stopPropagation?.(); } catch {}
    const src = e?.sourceEvent ?? e;
    const pid = src?.pointerId ?? e?.pointerId;
    try {
      if (canvasEl && canvasEl.releasePointerCapture && pid != null) canvasEl.releasePointerCapture(pid);
      else src.target?.releasePointerCapture?.(src.pointerId);
    } catch (err) {
      // releasePointerCapture may throw NotFoundError in synthetic scenarios; ignore here
      console.debug('releasePointerCapture ignored:', err && err.message);
    }
    console.debug("GoofySphere: pointerup", { id: e?.pointerId ?? src?.pointerId });
    draggingRef.current = false;
    if (controls) controls.enabled = true;

    // remove window-level handlers
    if (windowMoveRef.current) {
      window.removeEventListener('pointermove', windowMoveRef.current as EventListener);
      windowMoveRef.current = undefined;
    }
    if (windowUpRef.current) {
      window.removeEventListener('pointerup', windowUpRef.current as EventListener);
      windowUpRef.current = undefined;
    }
  };

  return (
    <Float speed={1.1} rotationIntensity={0} floatIntensity={0.55} floatingRange={[-0.12, 0.12]}>
      <group ref={tiltGroupRef} rotation={[baseTilt, 0, axialTilt]}>
        <group ref={rotationGroupRef}>
          {/* Invisible larger hit-sphere to make dragging easier and capture events reliably */}
          <mesh
            scale={[scale * 1.04, scale * 1.04, scale * 1.04]}
            onPointerDownCapture={handlePointerDown}
            onPointerMoveCapture={handlePointerMove}
            onPointerUpCapture={handlePointerUp}
            onPointerOutCapture={handlePointerUp}
          >
            <sphereGeometry args={[1, 64, 64]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>

          <mesh scale={[scale, scale, scale]} castShadow>
            <sphereGeometry args={[1, 192, 192]} />
            <meshPhysicalMaterial
              map={surfaceTexture ?? undefined}
              color="#ef8e19"
              roughness={0.38}
              metalness={0.1}
              clearcoat={0.48}
              clearcoatRoughness={0.45}
              transmission={0.08}
              thickness={1.05}
              envMapIntensity={1.2}
              emissive="#371c02"
              emissiveIntensity={0.22}
              sheen={0.32}
              sheenColor={new THREE.Color("#fdb14c")}
            />
          </mesh>
        </group>
      </group>
    </Float>
  );
}

function SatelliteBillboard({
  config,
  isActive,
  isHovered,
}: {
  config: SatelliteConfig;
  isActive: boolean;
  isHovered: boolean;
}) {
  if (!isActive && !isHovered) return null;
  const { payload, size } = config;
  const labelScale = size * 4;
  return (
    <Billboard
      position={[0, size * 2.8, 0]}
      follow
      lockX
      lockY
      lockZ
    >
      <group>
        <Text
          fontSize={labelScale * 0.4}
          color="#fef3c7"
          outlineWidth={0.0025}
          outlineColor="#0f172a"
          anchorX="center"
          anchorY="bottom"
        >
          {payload.displayName}
        </Text>
        <Text
          position={[0, -labelScale * 0.5, 0]}
          fontSize={labelScale * 0.55}
          color="#fde68a"
          anchorX="center"
          anchorY="top"
        >
          {payload.avatar ?? "★"}
        </Text>
      </group>
    </Billboard>
  );
}

function SatelliteBody({
  config,
  isActive,
  isHovered,
}: {
  config: SatelliteConfig;
  isActive: boolean;
  isHovered: boolean;
}) {
  const { payload, size } = config;
  const baseScale = 1 + (isActive ? 0.35 : 0) + (isHovered ? 0.15 : 0);
  const emissive = new THREE.Color(payload.color);

  switch (payload.bodyType) {
    case "comet":
      return (
        <group scale={baseScale}>
          <mesh rotation={[0, 0, Math.PI / 6]}>
            <coneGeometry args={[size * 0.55, size * 2.2, 24]} />
            <meshStandardMaterial
              color={payload.color}
              emissive={emissive}
              emissiveIntensity={0.75}
              roughness={0.25}
              metalness={0.15}
              transparent
              opacity={0.75}
            />
          </mesh>
          <mesh position={[size * 0.3, 0, 0]}>
            <icosahedronGeometry args={[size * 0.7, 0]} />
            <meshStandardMaterial
              color={payload.color}
              emissive={emissive}
              emissiveIntensity={0.9}
              roughness={0.4}
              metalness={0.45}
            />
          </mesh>
        </group>
      );
    case "capsule":
      return (
        <group scale={baseScale}>
          <mesh>
            <capsuleGeometry args={[size * 0.45, size * 1.15, 12, 24]} />
            <meshStandardMaterial
              color={payload.color}
              emissive={emissive}
              emissiveIntensity={0.8}
              roughness={0.2}
              metalness={0.55}
            />
          </mesh>
          <mesh position={[0, 0, size * -0.2]}>
            <ringGeometry args={[size * 0.35, size * 0.6, 36]} />
            <meshBasicMaterial color={payload.color} transparent opacity={0.45} />
          </mesh>
        </group>
      );
    case "ring":
      return (
        <group scale={baseScale}>
          <mesh>
            <sphereGeometry args={[size * 0.65, 32, 32]} />
            <meshStandardMaterial
              color={payload.color}
              emissive={emissive}
              emissiveIntensity={0.6}
              roughness={0.45}
              metalness={0.25}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2.2, 0, 0]}>
            <torusGeometry args={[size * 0.9, size * 0.18, 16, 64]} />
            <meshStandardMaterial
              color={payload.color}
              emissive={emissive}
              emissiveIntensity={0.45}
              roughness={0.3}
              metalness={0.4}
              transparent
              opacity={0.65}
            />
          </mesh>
        </group>
      );
    case "drone":
      return (
        <group scale={baseScale}>
          <mesh>
            <octahedronGeometry args={[size * 0.75, 0]} />
            <meshStandardMaterial
              color={payload.color}
              emissive={emissive}
              emissiveIntensity={0.7}
              roughness={0.35}
              metalness={0.55}
            />
          </mesh>
          <mesh position={[0, size * 0.9, 0]}>
            <boxGeometry args={[size * 0.2, size * 0.6, size * 0.2]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.1} />
          </mesh>
          <mesh position={[0, -size * 0.9, 0]}>
            <boxGeometry args={[size * 0.2, size * 0.6, size * 0.2]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.1} />
          </mesh>
        </group>
      );
    case "moon":
    default:
      return (
        <group scale={baseScale}>
          <mesh>
            <sphereGeometry args={[size * 0.65, 28, 28]} />
            <meshStandardMaterial
              color={payload.color}
              emissive={emissive}
              emissiveIntensity={0.5}
              roughness={0.6}
              metalness={0.2}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[size * 0.68, 12, 12]} />
            <meshStandardMaterial
              color="#0f172a"
              transparent
              opacity={0.22}
            />
          </mesh>
        </group>
      );
  }
}

function OrbitingSatellites({
  configs,
  activeId,
  onSelect,
  satelliteRefsOut,
}: {
  configs: SatelliteConfig[];
  activeId?: string | null;
  onSelect?: (satellite: OrbitSatellite) => void;
  satelliteRefsOut?: React.MutableRefObject<Array<THREE.Group | null>>;
}) {
  const pivotRefs = useRef<Array<THREE.Group | null>>([]);
  const satelliteGroupRefs = useRef<Array<THREE.Group | null>>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  useCursor(hoveredId !== null, "pointer");

  // Expose satellite refs to parent
  useEffect(() => {
    if (satelliteRefsOut) {
      satelliteRefsOut.current = satelliteGroupRefs.current;
    }
  }, [satelliteRefsOut]);

  useFrame((_, delta) => {
    configs.forEach((config, index) => {
      const pivot = pivotRefs.current[index];
      if (!pivot) return;
      pivot.rotation.y = (pivot.rotation.y + delta * config.speed) % (Math.PI * 2);
    });
  });

  return (
    <group>
      {configs.map((config, index) => {
        const isActive = config.payload.id === activeId;
        const isHovered = config.payload.id === hoveredId;
        return (
          <group
            key={config.payload.id}
            ref={(node) => {
              pivotRefs.current[index] = node;
            }}
            rotation={[0, config.initialAngle, 0]}
          >
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002 * config.radius, 0]}>
              <torusGeometry args={[config.radius, config.radius * 0.012, 12, 196]} />
              <meshBasicMaterial
                color={config.payload.color}
                transparent
                opacity={isActive ? 0.35 : 0.16}
              />
            </mesh>
            <Float
              speed={1.2 + (isActive ? 0.6 : 0)}
              rotationIntensity={isActive ? 2.2 : 0.8}
              floatIntensity={0.38}
            >
              <group
                ref={(node) => {
                  satelliteGroupRefs.current[index] = node;
                }}
                position={[config.radius, 0, 0]}
                onPointerOver={(event) => {
                  event.stopPropagation();
                  setHoveredId(config.payload.id);
                }}
                onPointerOut={(event) => {
                  event.stopPropagation();
                  setHoveredId((current) => (current === config.payload.id ? null : current));
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect?.(config.payload);
                }}
              >
                <SatelliteBody config={config} isActive={isActive} isHovered={isHovered} />
                <SatelliteBillboard config={config} isActive={isActive} isHovered={isHovered} />
              </group>
            </Float>
          </group>
        );
      })}
    </group>
  );
}

function SoftEnvironment() {
  return (
    <Environment resolution={256} background={false} frames={60}>
      <group rotation={[0, Math.PI / 4, 0]}>
        <Lightformer
          form="ring"
          intensity={1.5}
          rotation-x={Math.PI / 2}
          position={[0, 2, 3]}
          scale={[5, 5, 1]}
          color="#fca311"
        />
        <Lightformer
          form="rect"
          intensity={0.6}
          position={[-3, -1, -2]}
          scale={[6, 6, 1]}
          color="#ffb347"
        />
      </group>
    </Environment>
  );
}

// Component to handle camera animation based on selected satellite
function CameraAnimator({ 
  activeSatelliteId, 
  satelliteConfigs,
  satelliteRefs,
}: { 
  activeSatelliteId: string | null; 
  satelliteConfigs: SatelliteConfig[];
  satelliteRefs: React.MutableRefObject<Array<THREE.Group | null>>;
}) {
  const { camera, controls } = useThree();
  const orbitControlsRef = useRef(controls);
  const animationProgressRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const startPositionRef = useRef(new THREE.Vector3());
  const startTargetRef = useRef(new THREE.Vector3());
  const targetPositionRef = useRef(new THREE.Vector3(0, 0, 3.2));
  const targetLookAtRef = useRef(new THREE.Vector3(0, 0, 0));
  const [targetSatelliteIndex, setTargetSatelliteIndex] = useState<number>(-1);

  useEffect(() => {
    orbitControlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    if (!camera || !orbitControlsRef.current) return;

    // Start new animation
    isAnimatingRef.current = true;
    animationProgressRef.current = 0;
    startPositionRef.current.copy(camera.position);
    
    if ((orbitControlsRef.current as any).target) {
      startTargetRef.current.copy((orbitControlsRef.current as any).target);
    }

    if (activeSatelliteId) {
      // Find the satellite index
      const satIndex = satelliteConfigs.findIndex(config => config.payload.id === activeSatelliteId);
      setTargetSatelliteIndex(satIndex);
    } else {
      // Return to default position
      setTargetSatelliteIndex(-1);
      targetPositionRef.current.set(0, 0, 3.2);
      targetLookAtRef.current.set(0, 0, 0);
    }
  }, [activeSatelliteId, satelliteConfigs, camera]);

  useFrame((state, delta) => {
    // Always update target position if tracking a satellite (even after animation completes)
    if (targetSatelliteIndex >= 0 && satelliteRefs.current[targetSatelliteIndex]) {
      const satGroup = satelliteRefs.current[targetSatelliteIndex];
      if (satGroup) {
        // Get world position of the satellite
        const worldPos = new THREE.Vector3();
        satGroup.getWorldPosition(worldPos);
        
        // If not animating, directly set the target to follow the satellite
        if (!isAnimatingRef.current) {
          // Keep the target locked on the satellite
          if ((orbitControlsRef.current as any).target) {
            (orbitControlsRef.current as any).target.copy(worldPos);
            (orbitControlsRef.current as any).update();
          }
        } else {
          // During animation, update the target for smooth interpolation
          targetLookAtRef.current.copy(worldPos);
          
          // Calculate camera position relative to satellite
          const distanceFromSat = 2.5; // Distance from satellite
          const currentCamDir = new THREE.Vector3()
            .subVectors(camera.position, worldPos)
            .normalize();
          
          // If camera is too close, use a default offset
          if (currentCamDir.length() < 0.1) {
            currentCamDir.set(1.5, 0.8, 2.0).normalize();
          }
          
          targetPositionRef.current.copy(worldPos).add(
            currentCamDir.multiplyScalar(distanceFromSat)
          );
        }
      }
    }

    if (!isAnimatingRef.current || !orbitControlsRef.current) return;

    const duration = 1.2; // seconds
    animationProgressRef.current += delta / duration;

    if (animationProgressRef.current >= 1) {
      animationProgressRef.current = 1;
      isAnimatingRef.current = false;
    }

    // Ease-out cubic
    const t = 1 - Math.pow(1 - animationProgressRef.current, 3);

    // Interpolate camera position
    camera.position.lerpVectors(startPositionRef.current, targetPositionRef.current, t);

    // Interpolate orbit controls target (the focus point)
    if ((orbitControlsRef.current as any).target) {
      (orbitControlsRef.current as any).target.lerpVectors(
        startTargetRef.current,
        targetLookAtRef.current,
        t
      );
      (orbitControlsRef.current as any).update();
    }
  });

  return null;
}

export function GoofySphere({
  radiusPx,
  satellites = [],
  onSatelliteSelect,
  activeSatelliteId = null,
  autoRotate = false,
}: GoofySphereProps) {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
  const baseScale = Math.max(0.85, radiusPx / 240);
  // Increase planetScale multiplier so the Bitcoin planet appears much larger
  const planetScale = baseScale * 2.8;
  const satelliteRefsForCamera = useRef<Array<THREE.Group | null>>([]);

  const satelliteConfigs = useMemo<SatelliteConfig[]>(() => {
    if (!satellites.length) return [];
    return satellites.map((payload, index) => {
      const radiusOffset = payload.orbitDistance ?? (2 + index * 0.55);
      const sizeMultiplier = payload.size ?? 0.22;
      return {
        payload,
        radius: planetScale * radiusOffset,
        speed: payload.rotationSpeed ?? (0.22 + index * 0.05),
        size: baseScale * sizeMultiplier,
        initialAngle: (index / Math.max(1, satellites.length)) * Math.PI * 2,
      };
    });
  }, [baseScale, planetScale, satellites]);

  return (
    <Canvas
      dpr={[Math.min(1.5, dpr), 2]}
      shadows
      // Move camera slightly closer to emphasize the larger planet
      camera={{ position: [0, 0, 2.2], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["#05070f"]} />
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[3, 4, 5]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-4, -3, -2]} intensity={0.45} color="#ffe29f" />
      <Suspense fallback={null}>
        <CameraAnimator 
          activeSatelliteId={activeSatelliteId} 
          satelliteConfigs={satelliteConfigs}
          satelliteRefs={satelliteRefsForCamera}
        />
        <RotatingSphere scale={planetScale} autoRotate={autoRotate} />
        {satelliteConfigs.length > 0 && (
          <OrbitingSatellites
            configs={satelliteConfigs}
            activeId={activeSatelliteId}
            onSelect={onSatelliteSelect}
            satelliteRefsOut={satelliteRefsForCamera}
          />
        )}
        <SoftEnvironment />
      </Suspense>
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={true}
        // Restrict how far the user can zoom out or in. Values are relative
        // to the planet scale so the limits feel consistent across sizes.
        minDistance={Math.max(0.6, planetScale * 0.45)}
        maxDistance={Math.max(4, planetScale * 3)}
        target={[0, 0, 0]}
      />
      {/* Faint volumetric glow approximated with transparent sphere */}
      <mesh scale={planetScale * 2.6}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0.08} />
      </mesh>
    </Canvas>
  );
}
