"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Ribbon {
  mesh: THREE.Mesh | null;
  baseY: number;
  speed: number;
  frequency: number;
  amplitude: number;
  offset: number;
}

/**
 * WavyBackground - PS4-style animated background with floating ribbons
 * 
 * Crea un fondo estilo PS4 con cintas flotantes que se mueven suavemente
 * en tonos morados con opacidad baja y movimiento orgánico.
 */
export default function WavyBackground() {
  const ribbonsRef = useRef<Ribbon[]>([]);

  // Crear configuración de cintas
  const ribbonConfigs = useMemo(() => {
    const configs: Array<{
      position: [number, number, number];
      rotation: number;
      width: number;
      height: number;
      color: string;
      opacity: number;
      speed: number;
      frequency: number;
      amplitude: number;
      offset: number;
    }> = [];

    const ribbonCount = 8;
    const colors = ["#4c1d95", "#5b21b6", "#6d28d9", "#7c3aed", "#8b5cf6"];

    for (let i = 0; i < ribbonCount; i++) {
      const zPosition = -60 - i * 8; // Distribuir en profundidad
      const yPosition = -10 + Math.random() * 20; // Variar altura
      const rotation = (Math.random() - 0.5) * 0.17; // -10 a +10 grados aprox

      configs.push({
        position: [0, yPosition, zPosition],
        rotation,
        width: 150 + Math.random() * 50,
        height: 30 + Math.random() * 20,
        color: colors[i % colors.length],
        opacity: 0.15 + Math.random() * 0.1, // 0.15 - 0.25
        speed: 0.1 + Math.random() * 0.15, // Movimiento lento
        frequency: 0.02 + Math.random() * 0.03,
        amplitude: 2 + Math.random() * 3,
        offset: Math.random() * Math.PI * 2,
      });
    }

    return configs;
  }, []);

  // Animar las cintas
  useFrame((state: any) => {
    const time = state.clock.getElapsedTime();

    ribbonsRef.current.forEach((ribbon, index) => {
      if (!ribbon.mesh) return;

      const config = ribbonConfigs[index];
      
      // Movimiento horizontal lento
      ribbon.mesh.position.x = Math.sin(time * ribbon.speed + ribbon.offset) * 15;

      // Ondulación vertical suave (múltiples sinusoides superpuestas)
      const wave1 = Math.sin(time * 0.3 + ribbon.offset) * ribbon.amplitude;
      const wave2 = Math.sin(time * 0.2 + ribbon.offset * 1.5) * (ribbon.amplitude * 0.5);
      const wave3 = Math.cos(time * 0.15 + ribbon.offset * 0.7) * (ribbon.amplitude * 0.3);
      
      ribbon.mesh.position.y = ribbon.baseY + wave1 + wave2 + wave3;

      // Rotación sutil
      ribbon.mesh.rotation.z = config.rotation + Math.sin(time * 0.1 + ribbon.offset) * 0.05;
    });
  });

  return (
    <>
      {ribbonConfigs.map((config, index) => (
        <mesh
          key={index}
          ref={(el) => {
            if (el && !ribbonsRef.current[index]) {
              ribbonsRef.current[index] = {
                mesh: el,
                baseY: config.position[1],
                speed: config.speed,
                frequency: config.frequency,
                amplitude: config.amplitude,
                offset: config.offset,
              };
            }
          }}
          position={config.position}
          rotation={[0, 0, config.rotation]}
        >
          <planeGeometry args={[config.width, config.height, 1, 1]} />
          <meshBasicMaterial
            color={config.color}
            transparent
            opacity={config.opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      
      {/* Luz ambiental suave */}
      <ambientLight intensity={0.5} />
    </>
  );
}
