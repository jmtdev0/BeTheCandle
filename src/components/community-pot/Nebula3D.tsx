"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import type { RootState } from "@react-three/fiber";
import * as THREE from "three";

interface Nebula3DProps {
  participantCount: number;
  totalSats: number;
}

/**
 * Nebula3D - Community Pot visual representation
 * 
 * Muestra una nebulosa con partículas que representan a los usuarios conectados.
 * Usa InstancedMesh para renderizar miles de partículas de forma eficiente.
 * El color de la nebulosa cambia según el monto total del pot.
 */
export default function Nebula3D({ participantCount = 10, totalSats = 0 }: Nebula3DProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particleCount = Math.max(100, participantCount * 10); // Mínimo 100 partículas

  // Calcular color base según el total de satoshis
  // Azul (bajo) → Morado (medio) → Dorado (alto)
  const getNebulaColor = (sats: number): THREE.Color => {
    if (sats === 0) return new THREE.Color(0x3b82f6); // Azul
    if (sats < 100000) {
      // Azul → Morado
      const t = sats / 100000;
      return new THREE.Color().lerpColors(
        new THREE.Color(0x3b82f6), // Azul
        new THREE.Color(0x9333ea), // Morado
        t
      );
    } else if (sats < 500000) {
      // Morado → Dorado
      const t = (sats - 100000) / 400000;
      return new THREE.Color().lerpColors(
        new THREE.Color(0x9333ea), // Morado
        new THREE.Color(0xfbbf24), // Dorado
        t
      );
    }
    return new THREE.Color(0xfbbf24); // Dorado
  };

  const baseColor = useMemo(() => getNebulaColor(totalSats), [totalSats]);

  // Generar posiciones y colores para las partículas
  const { positions, colors, scales } = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    const colors: THREE.Color[] = [];
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

      // Variación de color alrededor del color base
      const colorVariation = new THREE.Color(baseColor);
      colorVariation.offsetHSL(
        (Math.random() - 0.5) * 0.1, // Hue variation
        (Math.random() - 0.5) * 0.2, // Saturation variation
        (Math.random() - 0.5) * 0.2  // Lightness variation
      );
      colors.push(colorVariation);

      // Escalas variables para las partículas
      scales.push(0.1 + Math.random() * 0.3);
    }

    return { positions, colors, scales };
  }, [particleCount, baseColor]);

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
  });

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          transparent
          opacity={0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        >
          {/* Color instances */}
          <instancedBufferAttribute
            attach="attributes-color"
            args={[new Float32Array(colors.flatMap((c) => [c.r, c.g, c.b])), 3]}
          />
        </meshBasicMaterial>
      </instancedMesh>

      {/* Luz ambiente para la nebulosa */}
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 0, 0]} intensity={2} color={baseColor} />
    </>
  );
}
