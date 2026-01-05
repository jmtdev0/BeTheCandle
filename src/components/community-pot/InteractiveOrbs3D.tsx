"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Environment, Lightformer, Text, Stars, Text3D, Center } from "@react-three/drei";
import * as THREE from "three";
import { useDayNightCycle } from "@/hooks/useDayNightCycle";

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

const SPECIAL_HEART_ADDRESS = "0xe7fa55dd51dd2a69a61d8edbe1f488c3dba6fda5";

const heartShape = new THREE.Shape();
const hx = 0, hy = 0;
heartShape.moveTo(hx + 0.5, hy + 0.5);
heartShape.bezierCurveTo(hx + 0.5, hy + 0.5, hx + 0.4, hy, hx, hy);
heartShape.bezierCurveTo(hx - 0.6, hy, hx - 0.6, hy + 0.7, hx - 0.6, hy + 0.7);
heartShape.bezierCurveTo(hx - 0.6, hy + 1.1, hx - 0.2, hy + 1.54, hx + 0.5, hy + 1.9);
heartShape.bezierCurveTo(hx + 1.2, hy + 1.54, hx + 1.6, hy + 1.1, hx + 1.6, hy + 0.7);
heartShape.bezierCurveTo(hx + 1.6, hy + 0.7, hx + 1.6, hy, hx + 1.0, hy);
heartShape.bezierCurveTo(hx + 0.7, hy, hx + 0.5, hy + 0.5, hx + 0.5, hy + 0.5);

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
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(Date.now() / 1000 + delay);
  const color = getRandomLightColor(participant.id);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine shape based on participant ID
  const shapeType = React.useMemo(() => {
    const shapes = [
      'sphere', 'box', 'torus', 'cone', 'cylinder', 
      'icosahedron', 'octahedron', 'torusKnot', 'dodecahedron'
    ] as const;
    const hash = participant.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return shapes[hash % shapes.length];
  }, [participant.id]);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.renderOrder = isHovered ? 2000 : -1;
    }
  }, [isHovered]);

  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
      }
    };
  }, []);

  useFrame((state: { clock: { getElapsedTime: () => number } }) => {
    if (!groupRef.current || !meshRef.current) return;

    const time = state.clock.getElapsedTime();
    const elapsed = time - startTime.current;

    // Animación de flotación (en el grupo contenedor)
    const floatOffset = Math.sin(elapsed / duration * Math.PI * 2) * 0.5;
    groupRef.current.position.y = position[1] + floatOffset;

    // Animación de rotación (tumble) (solo en la malla)
    meshRef.current.rotation.x = elapsed * 0.2;
    meshRef.current.rotation.y = elapsed * 0.15;
  });

  const isHeart = participant.polygonAddress.toLowerCase() === SPECIAL_HEART_ADDRESS.toLowerCase();

  const handleMeshLeave = () => {
    // Delay hiding tooltip to give user time to move cursor to it
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
    }
    leaveTimeoutRef.current = setTimeout(() => {
      onLeave();
    }, 150);
  };

  const handleTooltipEnter = () => {
    // Cancel the hide timeout if user enters tooltip
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    onHover();
  };

  const handleTooltipLeave = () => {
    onLeave();
  };

  return (
    <group
      ref={groupRef}
      position={position}
      scale={isHovered ? scale * 1.15 : scale}
    >
      <mesh
        ref={meshRef}
        onPointerDown={(e) => {
          // Stop propagation so container handlers don't also treat this as a background tap
          e.stopPropagation();
          // Treat pointer down on an orb as a hover/select
          if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
          }
          onHover();
          onSelect?.();
        }}
        onPointerEnter={() => {
          if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
          }
          onHover();
        }}
        onPointerLeave={handleMeshLeave}
        rotation={isHeart ? [Math.PI, 0, 0] : [0, 0, 0]}
      >
        {isHeart ? (
          <extrudeGeometry args={[heartShape, { depth: 0.4, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 0.1, bevelThickness: 0.1 }]} />
        ) : (
          <>
            {shapeType === 'sphere' && <sphereGeometry args={[1, 32, 32]} />}
            {shapeType === 'box' && <boxGeometry args={[1.3, 1.3, 1.3]} />}
            {shapeType === 'torus' && <torusGeometry args={[0.8, 0.3, 16, 32]} />}
            {shapeType === 'cone' && <coneGeometry args={[0.9, 1.6, 32]} />}
            {shapeType === 'cylinder' && <cylinderGeometry args={[0.8, 0.8, 1.6, 32]} />}
            {shapeType === 'icosahedron' && <icosahedronGeometry args={[1.1, 0]} />}
            {shapeType === 'octahedron' && <octahedronGeometry args={[1.2, 0]} />}
            {shapeType === 'torusKnot' && <torusKnotGeometry args={[0.7, 0.25, 64, 8]} />}
            {shapeType === 'dodecahedron' && <dodecahedronGeometry args={[1.1, 0]} />}
          </>
        )}

        <meshStandardMaterial
          color={isHeart ? "#ffffff" : color}
          transparent
          opacity={isHovered ? 1 : 0.85}
          emissive={isHeart ? "#ffffff" : color}
          emissiveIntensity={isHeart ? (isHovered ? 0.5 : 0.2) : (isHovered ? 0.8 : 0.4)}
          metalness={isHeart ? 0.5 : 0.85}
          roughness={isHeart ? 0.2 : 0.18}
          envMapIntensity={1.2}
          depthWrite={true}
        />
      </mesh>
      
      {isHovered && (
        <Html
          position={[0, 2.6, 0]}
          scale={1}
          renderOrder={1000}
          zIndexRange={[1000, 0]}
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className="absolute -translate-x-1/2 -translate-y-full bg-black/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-blue-300/60 shadow-2xl whitespace-nowrap"
            style={{ zIndex: 1000, userSelect: 'text' }}
            onPointerEnter={handleTooltipEnter}
            onPointerLeave={handleTooltipLeave}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-mono text-blue-100">{participant.polygonAddress}</p>
            {isHeart && (
              <div className="mt-1 text-[10px] text-amber-300 leading-tight max-w-[200px] whitespace-normal">
                Funds accumulated in this address are sent to <a href="https://www.juegaterapia.org/proyectos-solidarios-cancer-infantil/" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-200 pointer-events-auto">Juegaterapia</a>. Scroll down on their page to see several cool projects that need funding.
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

function CentralCoin() {
  const spinRef = useRef<THREE.Group>(null);

  useFrame((_state: unknown, delta: number) => {
    if (spinRef.current) {
      // Rotate the coin slowly on its Y axis
      spinRef.current.rotation.y += delta * 0.2;
    }
  });

  const arcLength = Math.PI - 0.6;
  const blueColor = "#5CA0F2"; // Even lighter blue
  const ringColor = "#d4d4d4"; // Slightly darker than white

  // Shared material for the logo parts to ensure they look like a single piece
  const logoMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "white",
    roughness: 0.4,
    metalness: 0.1,
  }), []);

  return (
    <group position={[0, 0, 0]} rotation={[0.2, 0, 0.1]}>
      <group ref={spinRef}>
        {/* Sphere Body */}
        <mesh>
          <sphereGeometry args={[4, 64, 64]} />
          <meshStandardMaterial 
            color={blueColor} 
            metalness={0.1} 
            roughness={0.5} 
          />
        </mesh>
        
        {/* Front Face Detail */}
        <group>
          {/* Broken Ring - Right Segment */}
          <mesh position={[0, 0, 3.5]} rotation={[0, 0, -arcLength / 2]}>
            <torusGeometry args={[2.2, 0.15, 16, 64, arcLength]} />
            <meshStandardMaterial color={ringColor} />
          </mesh>
          {/* Broken Ring - Left Segment */}
          <mesh position={[0, 0, 3.5]} rotation={[0, 0, Math.PI - arcLength / 2]}>
            <torusGeometry args={[2.2, 0.15, 16, 64, arcLength]} />
            <meshStandardMaterial color={ringColor} />
          </mesh>
          
          {/* The 'S' */}
          <Center position={[0, -0.15, 4.1]}>
            <Text3D
              font="https://raw.githubusercontent.com/mrdoob/three.js/master/examples/fonts/helvetiker_bold.typeface.json"
              size={2.3}
              height={0.05}
              curveSegments={12}
              material={logoMaterial}
            >
              S
            </Text3D>
          </Center>
          
          {/* Top vertical stroke */}
           <mesh position={[0, 1.2, 4.1]} material={logoMaterial}>
             <boxGeometry args={[0.28, 0.4, 0.05]} />
          </mesh>
          
          {/* Bottom vertical stroke */}
           <mesh position={[0, -1.45, 4.1]} material={logoMaterial}>
             <boxGeometry args={[0.28, 0.4, 0.05]} />
          </mesh>
        </group>

        {/* Back Face Detail */}
        <group rotation={[0, Math.PI, 0]}>
           {/* Broken Ring - Right Segment */}
          <mesh position={[0, 0, 3.5]} rotation={[0, 0, -arcLength / 2]}>
            <torusGeometry args={[2.2, 0.15, 16, 64, arcLength]} />
            <meshStandardMaterial color={ringColor} />
          </mesh>
          {/* Broken Ring - Left Segment */}
          <mesh position={[0, 0, 3.5]} rotation={[0, 0, Math.PI - arcLength / 2]}>
            <torusGeometry args={[2.2, 0.15, 16, 64, arcLength]} />
            <meshStandardMaterial color={ringColor} />
          </mesh>
          
          {/* The 'S' */}
          <Center position={[0, -0.15, 4.1]}>
            <Text3D
              font="https://raw.githubusercontent.com/mrdoob/three.js/master/examples/fonts/helvetiker_bold.typeface.json"
              size={2.3}
              height={0.05}
              curveSegments={12}
              material={logoMaterial}
            >
              S
            </Text3D>
          </Center>
          
          {/* Top vertical stroke */}
           <mesh position={[0, 1.2, 4.1]} material={logoMaterial}>
             <boxGeometry args={[0.28, 0.4, 0.05]} />
          </mesh>
          
          {/* Bottom vertical stroke */}
           <mesh position={[0, -1.45, 4.1]} material={logoMaterial}>
             <boxGeometry args={[0.28, 0.4, 0.05]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function OrbsScene({
  participants,
  hoveredParticipantId,
  onHoverParticipant,
  selectedParticipantId,
  onSelectParticipant,
  isMobile,
  lightColor,
  lightIntensity,
  ambientIntensity,
  isNight,
  starOpacity
}: InteractiveOrbs3DProps & {
  lightColor: string;
  lightIntensity: number;
  ambientIntensity: number;
  isNight: boolean;
  starOpacity: number;
}) {
  const controlsRef = useRef<any>(null);
  const idleRef = useRef({ lastInteraction: Date.now(), isIdle: false });
  const IDLE_TIMEOUT_MS = 30_000; // 30 seconds
  const IDLE_ROTATION_SPEED = 0.02; // radians per second (very slow)
  const orbitGroupRef = useRef<THREE.Group>(null);

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

  // Orbital rotation for the entire group of participants
  useFrame((_state: any, delta: number) => {
    if (orbitGroupRef.current) {
      orbitGroupRef.current.rotation.y += delta * 0.05; // Slow rotation speed
    }
  });

  return (
    <>
      <CentralCoin />
      <group ref={orbitGroupRef}>
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
      </group>

      {/* Iluminación */}
      <ambientLight intensity={ambientIntensity} />
      <directionalLight position={[10, 10, 5]} intensity={lightIntensity} color={lightColor} />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#ffffff" />

      {isNight && (
        <Stars 
          radius={100} 
          depth={50} 
          count={isMobile ? 1500 : 5000} 
          factor={4} 
          saturation={0} 
          fade 
          speed={1} 
        />
      )}

      {/**
       * Environment-based reflections (no remote HDR fetch).
       * Using Lightformer generates a local PMREM environment map.
       */}
      <Environment resolution={256} frames={1}>
        <Lightformer
          form="rect"
          intensity={2.2}
          position={[0, 6, -12]}
          rotation={[0, 0, 0]}
          scale={[14, 10, 1]}
          color="#ffffff"
        />
        <Lightformer
          form="circle"
          intensity={1.2}
          position={[-10, 2, 6]}
          rotation={[0, Math.PI / 2, 0]}
          scale={6}
          color="#4a90e2"
        />
        <Lightformer
          form="circle"
          intensity={1.0}
          position={[10, -2, 6]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={5}
          color="#f472b6"
        />
        <Lightformer
          form="rect"
          intensity={0.8}
          position={[0, -8, -4]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[10, 10, 1]}
          color="#fbbf24"
        />
      </Environment>

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
        minDistance={14}
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
  const { isNight, lightColor, lightIntensity, ambientIntensity, starOpacity } = useDayNightCycle();

  return (
    <div className="absolute inset-0" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 35], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
      >
        <OrbsScene 
          {...props} 
          lightColor={lightColor}
          lightIntensity={lightIntensity}
          ambientIntensity={ambientIntensity}
          isNight={isNight}
          starOpacity={starOpacity}
        />
      </Canvas>
    </div>
  );
}
