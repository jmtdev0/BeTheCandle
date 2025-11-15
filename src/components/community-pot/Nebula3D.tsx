"use client";

import React, { useRef, useMemo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

interface Nebula3DProps {
  participants: Array<{ id: string; polygonAddress: string }>;
  totalSats: number;
}

/**
 * Nebula3D - Community Pot visual representation
 * 
 * Muestra una nebulosa con partículas que representan a los usuarios conectados.
 * Usa InstancedMesh para renderizar miles de partículas de forma eficiente.
 * El color de la nebulosa cambia según el monto total del pot.
 */
export default function Nebula3D({ participants = [], totalSats = 0 }: Nebula3DProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particleCount = participants.length;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { camera, raycaster, pointer } = useThree();

  const lightIntensity = useMemo(() => {
    const normalized = Math.min(totalSats / 100000, 1);
    return 1 + normalized * 1.5;
  }, [totalSats]);

  // Generar posiciones y colores para las partículas
  const { positions, scales } = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    const scales: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      // Distribución esférica con densidad variable
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      const radius = Math.pow(Math.random(), 0.3) * 15; // Concentración hacia el centro

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions.push(new THREE.Vector3(x, y, z));

      // Escalas variables para las partículas
      scales.push(0.1 + Math.random() * 0.3);
    }

    return { positions, scales };
  }, [particleCount]);

  // Animar las partículas
  useFrame((state: any) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();
    const tempMatrix = new THREE.Matrix4();
    const tempPosition = new THREE.Vector3();
    const tempQuaternion = new THREE.Quaternion();
    const tempScale = new THREE.Vector3();

    for (let i = 0; i < particleCount; i++) {
      const position = positions[i];
      const scale = scales[i];

      // Animación de flotación suave
      const floatOffset = Math.sin(time * 0.5 + i * 0.1) * 0.2;
      const rotationOffset = time * 0.1 + i * 0.01;

      tempPosition.set(
        position.x + Math.sin(rotationOffset) * 0.5,
        position.y + floatOffset,
        position.z + Math.cos(rotationOffset) * 0.5
      );

      tempQuaternion.identity();
      tempScale.set(scale, scale, scale);

      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      meshRef.current.setMatrixAt(i, tempMatrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;

    // Detectar hover usando raycaster
    if (meshRef.current) {
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(meshRef.current);
      
      if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
        setHoveredIndex(intersects[0].instanceId);
      } else {
        setHoveredIndex(null);
      }
    }
  });

  if (particleCount === 0) {
    return null;
  }

  const hoveredParticipant = hoveredIndex !== null ? participants[hoveredIndex] : null;
  const hoveredPosition = hoveredIndex !== null ? positions[hoveredIndex] : null;

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color="#ffffff"
          toneMapped={false}
        />
      </instancedMesh>

      {/* Tooltip on hover */}
      {hoveredParticipant && hoveredPosition && (
        <Html position={[hoveredPosition.x, hoveredPosition.y + 2, hoveredPosition.z]}>
          <div className="bg-black/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-purple-400/50 shadow-xl pointer-events-none whitespace-nowrap">
            <p className="text-xs text-purple-200 font-mono">
              {hoveredParticipant.polygonAddress}
            </p>
          </div>
        </Html>
      )}

      {/* Luz ambiente para la nebulosa */}
      <ambientLight intensity={0.6} color="#cbe7ff" />
      <pointLight position={[0, 0, 0]} intensity={lightIntensity} color="#ffffff" />
    </>
  );
}
