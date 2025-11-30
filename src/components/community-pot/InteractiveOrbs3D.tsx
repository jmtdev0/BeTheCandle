"use client";

import React, { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

interface Participant {
  id: string;
  polygonAddress: string;
}

interface InteractiveOrbs3DProps {
  participants: Participant[];
  hoveredParticipantId: string | null;
  onHoverParticipant: (address: string | null) => void;
  selectedParticipantId?: string | null;
  onSelectParticipant?: (address: string | null) => void;
  isMobile?: boolean;
}

// Generate a random light color based on participant ID
function getRandomLightColor(id: string): string {
  const lightColors = [
    "#90EE90", // Light Green
    "#87CEEB", // Sky Blue
    "#FFD700", // Gold/Yellow
    "#DDA0DD", // Plum/Purple
    "#FFB6C1", // Light Pink
    "#98FB98", // Pale Green
    "#87CEFA", // Light Sky Blue
    "#F0E68C", // Khaki/Light Yellow
    "#E0BBE4", // Lavender
    "#FFDAB9", // Peach
    "#B0E0E6", // Powder Blue
    "#FFFACD", // Lemon Chiffon
  ];
  
  // Use participant ID to consistently select a color (Hola)
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return lightColors[hash % lightColors.length];
}

function DistantPlanes() {
  const groupRef = useRef<THREE.Group>(null);
  const planesRef = useRef<
    Array<{
      mesh: THREE.Mesh;
      startX: number;
      endX: number;
      speed: number;
      respawnTime: number;
    }>
  >([]);

  useEffect(() => {
    if (!groupRef.current) return;

    const planeCount = 3;
    const planes: typeof planesRef.current = [];

    for (let i = 0; i < planeCount; i++) {
      const geometry = new THREE.BoxGeometry(1.5, 0.08, 0.08);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4,
      });
      const mesh = new THREE.Mesh(geometry, material);

      const startX = -40;
      const endX = 40;
      const respawnTime = Math.random() * 10;

      // Posición inicial aleatoria detrás de las bolas
      const y = -8 + Math.random() * 4;
      const z = -20 - Math.random() * 15;
      const speed = 0.02 + Math.random() * 0.03;

      mesh.position.set(startX + Math.random() * (endX - startX), y, z);
      groupRef.current.add(mesh);

      planes.push({ mesh, startX, endX, speed, respawnTime });
    }

    planesRef.current = planes;

    return () => {
      planes.forEach((plane) => {
        plane.mesh.geometry.dispose();
        (plane.mesh.material as THREE.Material).dispose();
        groupRef.current?.remove(plane.mesh);
      });
    };
  }, []);

  useFrame((state: { clock: { getElapsedTime: () => number } }) => {
    const time = state.clock.getElapsedTime();

    planesRef.current.forEach((plane) => {
      if (time < plane.respawnTime) {
        plane.mesh.visible = false;
        return;
      }

      plane.mesh.visible = true;
      plane.mesh.position.x += plane.speed;

      if (plane.mesh.position.x > plane.endX) {
        // Respawnear en nueva posición aleatoria
        plane.mesh.position.x = plane.startX;
        plane.mesh.position.y = -8 + Math.random() * 4;
        plane.mesh.position.z = -20 - Math.random() * 15;
        plane.speed = 0.02 + Math.random() * 0.03;
        plane.respawnTime = time + Math.random() * 8;
      }
    });
  });

  return <group ref={groupRef} />;
}

function FadingCircles() {
  const groupRef = useRef<THREE.Group>(null);
  const circlesRef = useRef<
    Array<{
      mesh: THREE.Mesh;
      fadeInStart: number;
      fadeInDuration: number;
      visibleDuration: number;
      fadeOutDuration: number;
      phase: "fadeIn" | "visible" | "fadeOut" | "waiting";
      waitUntil: number;
      isPurple: boolean;
    }>
  >([]);

  useEffect(() => {
    if (!groupRef.current) return;

    const circleCount = 5;
    const circles: typeof circlesRef.current = [];

    for (let i = 0; i < circleCount; i++) {
      const radius = 1.5 + Math.random() * 2;
      const geometry = new THREE.RingGeometry(radius, radius + 0.08, 64);
      // 1% chance of purple
      const isPurple = Math.random() < 0.01;
      const color = isPurple ? 0x9b59b6 : 0xffd700;
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);

      // Posición aleatoria en el fondo
      const x = -25 + Math.random() * 50;
      const y = -12 + Math.random() * 8;
      const z = -25 - Math.random() * 15;

      mesh.position.set(x, y, z);
      groupRef.current.add(mesh);

      circles.push({
        mesh,
        fadeInStart: Math.random() * 20,
        fadeInDuration: 1.5 + Math.random() * 1,
        visibleDuration: 2 + Math.random() * 3,
        fadeOutDuration: 1.5 + Math.random() * 1,
        phase: "waiting",
        waitUntil: Math.random() * 20,
        isPurple,
      });
    }

    circlesRef.current = circles;

    return () => {
      circles.forEach((circle) => {
        circle.mesh.geometry.dispose();
        (circle.mesh.material as THREE.Material).dispose();
        groupRef.current?.remove(circle.mesh);
      });
    };
  }, []);

  useFrame((state: { clock: { getElapsedTime: () => number }; camera: THREE.Camera }) => {
    const time = state.clock.getElapsedTime();
    const camera = state.camera;

    circlesRef.current.forEach((circle) => {
      const material = circle.mesh.material as THREE.MeshBasicMaterial;

      // Make circle always face the camera (billboard effect)
      circle.mesh.quaternion.copy(camera.quaternion);

      switch (circle.phase) {
        case "waiting":
          if (time >= circle.waitUntil) {
            circle.phase = "fadeIn";
            circle.fadeInStart = time;
            // Reposition randomly when starting new cycle
            circle.mesh.position.set(
              -25 + Math.random() * 50,
              -12 + Math.random() * 8,
              -25 - Math.random() * 15
            );
            // 1% chance of purple on each new appearance
            circle.isPurple = Math.random() < 0.01;
            const newColor = circle.isPurple ? 0x9b59b6 : 0xffd700;
            (circle.mesh.material as THREE.MeshBasicMaterial).color.setHex(newColor);
          }
          break;

        case "fadeIn": {
          const fadeInProgress = (time - circle.fadeInStart) / circle.fadeInDuration;
          if (fadeInProgress >= 1) {
            material.opacity = 0.35;
            circle.phase = "visible";
            circle.fadeInStart = time; // Reuse for visible phase timing
          } else {
            material.opacity = fadeInProgress * 0.35;
          }
          break;
        }

        case "visible": {
          const visibleProgress = time - circle.fadeInStart;
          if (visibleProgress >= circle.visibleDuration) {
            circle.phase = "fadeOut";
            circle.fadeInStart = time; // Reuse for fadeOut timing
          }
          break;
        }

        case "fadeOut": {
          const fadeOutProgress = (time - circle.fadeInStart) / circle.fadeOutDuration;
          if (fadeOutProgress >= 1) {
            material.opacity = 0;
            circle.phase = "waiting";
            circle.waitUntil = time + 8 + Math.random() * 12;
          } else {
            material.opacity = (1 - fadeOutProgress) * 0.35;
          }
          break;
        }
      }
    });
  });

  return <group ref={groupRef} />;
}

function Orb({
  participant,
  position,
  scale,
  duration,
  delay,
  isHovered,
  onHover,
  onLeave,
  onSelect,
}: {
  participant: Participant;
  position: [number, number, number];
  scale: number;
  duration: number;
  delay: number;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onSelect?: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(Date.now() / 1000 + delay);
  const color = getRandomLightColor(participant.id);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.renderOrder = isHovered ? 2000 : -1;
    }
  }, [isHovered]);

  useFrame((state: { clock: { getElapsedTime: () => number } }) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();
    const elapsed = time - startTime.current;

    // Animación de flotación
    const floatOffset = Math.sin(elapsed / duration * Math.PI * 2) * 0.5;
    meshRef.current.position.y = position[1] + floatOffset;
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={isHovered ? scale * 1.15 : scale}
      onPointerDown={(e) => {
        // Stop propagation so container handlers don't also treat this as a background tap
        e.stopPropagation();
        // Treat pointer down on an orb as a hover/select
        onHover();
        onSelect?.();
      }}
      onPointerEnter={onHover}
      onPointerLeave={onLeave}
    >
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={isHovered ? 1 : 0.85}
        emissive={color}
        emissiveIntensity={isHovered ? 0.8 : 0.4}
        metalness={0.3}
        roughness={0.4}
        depthWrite={true}
      />
      {isHovered && (
        <Html
          position={[0, 2.6, 0]}
          scale={1}
          renderOrder={1000}
          zIndexRange={[1000, 0]}
        >
          <div
            className="absolute -translate-x-1/2 -translate-y-full bg-black/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-blue-300/60 shadow-2xl pointer-events-none whitespace-nowrap select-none"
            style={{ zIndex: 1000 }}
          >
            <p className="text-xs font-mono text-blue-100 select-none">{participant.polygonAddress}</p>
          </div>
        </Html>
      )}
    </mesh>
  );
}

function OrbsScene({
  participants,
  hoveredParticipantId,
  onHoverParticipant,
  selectedParticipantId,
  onSelectParticipant,
  isMobile,
}: InteractiveOrbs3DProps) {
  const controlsRef = useRef<any>(null);
  const idleRef = useRef({ lastInteraction: Date.now(), isIdle: false });
  const IDLE_TIMEOUT_MS = 30_000; // 30 seconds
  const IDLE_ROTATION_SPEED = 0.02; // radians per second (very slow)
  // Center camera on a participant when on small screens
  useEffect(() => {
    if (!isMobile) return;
    if (!participants || participants.length === 0) return;
    // pick the first participant to center on
    const participant = participants[0];
    const hash = participant.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = 0;
    const angle = (index / participants.length) * Math.PI * 2;
    const radius = 8 + (hash % 5);
    const x = Math.cos(angle) * radius;
    const y = -3 + ((hash % 7) - 3) * 1.5;

    try {
      // move camera slightly towards that orb and set controls target
      const cam = (controlsRef.current as any)?._camera || null;
      if (controlsRef.current) {
        controlsRef.current.target.set(x, y, 0);
        controlsRef.current.update();
      }
      if (cam) {
        cam.position.set(x * 0.2, y * 0.2, 22);
        cam.updateProjectionMatrix?.();
      }
    } catch (e) {
      // ignore if controls not ready
    }
  }, [isMobile, participants]);

  // Idle detection: rotate camera slowly when user hasn't interacted for IDLE_TIMEOUT_MS
  useEffect(() => {
    const resetIdle = () => {
      idleRef.current.lastInteraction = Date.now();
      if (idleRef.current.isIdle) {
        idleRef.current.isIdle = false;
      }
    };

    const events = ["pointerdown", "pointermove", "wheel", "touchstart", "keydown"];
    for (const ev of events) window.addEventListener(ev, resetIdle, { passive: true });

    const interval = setInterval(() => {
      const now = Date.now();
      if (!idleRef.current.isIdle && now - idleRef.current.lastInteraction >= IDLE_TIMEOUT_MS) {
        idleRef.current.isIdle = true;
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      for (const ev of events) window.removeEventListener(ev, resetIdle);
    };
  }, []);
  return (
    <>
      {participants.map((participant, index) => {
        const hash = participant.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        
        // Distribución en un espacio 3D
        const angle = (index / participants.length) * Math.PI * 2;
        const radius = 8 + (hash % 5);
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = -3 + ((hash % 7) - 3) * 1.5;

        const scale = 0.4 + ((hash % 5) * 0.08);
        const duration = 8 + (hash % 5);
        const delay = (hash % 10) * 0.3;
        const isHovered = hoveredParticipantId === participant.polygonAddress || (selectedParticipantId === participant.polygonAddress);

        return (
          <Orb
            key={participant.id}
            participant={participant}
            position={[x, y, z]}
            scale={scale}
            duration={duration}
            delay={delay}
            isHovered={isHovered}
            onHover={() => onHoverParticipant(participant.polygonAddress)}
            onLeave={() => onHoverParticipant(null)}
            onSelect={isMobile ? () => onSelectParticipant?.(participant.polygonAddress) : undefined}
          />
        );
      })}

      {/* Iluminación */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#ffffff" />

      {/* Aviones lejanos */}
      <DistantPlanes />

      {/* Circunferencias amarillas de fondo */}
      <FadingCircles />

      {/* Controles de órbita - rotación con zoom limitado */}
      <OrbitControls
        ref={controlsRef}
        enableZoom={true}
        enablePan={false}
        rotateSpeed={0.5}
        zoomSpeed={0.3}
        minDistance={12}
        maxDistance={35}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.5}
      />

      {/* Smooth idle rotation: apply tiny yaw around controls target when idle */}
      {/** We use useFrame to rotate the camera position around the controls target when idle. */}
      {useFrame((state: { camera: THREE.Camera }, delta: number) => {
        try {
          if (!controlsRef.current) return;
          if (!idleRef.current.isIdle) return;

          const cam = state.camera;
          const target = controlsRef.current.target ? controlsRef.current.target.clone() : new THREE.Vector3(0, 0, 0);

          // translate camera position relative to target
          const pos = cam.position.clone().sub(target);
          const angle = IDLE_ROTATION_SPEED * delta;
          const sin = Math.sin(angle);
          const cos = Math.cos(angle);
          const x = pos.x;
          const z = pos.z;
          const newX = x * cos - z * sin;
          const newZ = x * sin + z * cos;
          pos.x = newX;
          pos.z = newZ;

          // apply new position and look at target
          cam.position.copy(pos.add(target));
          cam.lookAt(target);

          // ensure controls know about the change
          controlsRef.current.update();
        } catch (e) {
          // ignore errors during idle rotation
        }
      })}
    </>
  );
}

export default function InteractiveOrbs3D(props: InteractiveOrbs3DProps) {
  return (
    <div className="absolute inset-0" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 35], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
      >
        <OrbsScene {...props} />
      </Canvas>
    </div>
  );
}
