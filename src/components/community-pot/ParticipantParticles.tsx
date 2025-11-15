"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ParticipantParticlesProps {
  participants: Array<{ id: string }>;
}

const SPHERE_RADIUS = 13;
const tempObject = new THREE.Object3D();

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pseudoRandom(hash: number, shift: number) {
  const segment = (hash >> shift) & 0xffff;
  return segment / 0xffff;
}

export default function ParticipantParticles({ participants }: ParticipantParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particleCount = participants.length;

  const particles = useMemo(() => {
    return participants.map((participant, index) => {
      const hash = hashString(`${participant.id}-${index}`);
      const nx = pseudoRandom(hash, 0) * 2 - 1;
      const ny = pseudoRandom(hash, 8) * 2 - 1;
      const nz = pseudoRandom(hash, 16) * 2 - 1;
      const phase = pseudoRandom(hash, 24) * Math.PI * 2;
      const scale = 0.25 + pseudoRandom(hash, 4) * 0.25;

      const base = new THREE.Vector3(
        nx * SPHERE_RADIUS,
        ny * (SPHERE_RADIUS * 0.6),
        nz * SPHERE_RADIUS
      );

      return { base, phase, scale };
    });
  }, [participants]);

  useFrame((state) => {
    if (!meshRef.current) return;

    const t = state.clock.getElapsedTime();

    particles.forEach((particle, index) => {
      const floatY = Math.sin(t * 0.8 + particle.phase) * 0.8;
      const swayX = Math.cos(t * 0.3 + particle.phase) * 0.4;
      const swayZ = Math.sin(t * 0.25 + particle.phase) * 0.4;

      tempObject.position.set(
        particle.base.x + swayX,
        particle.base.y + floatY,
        particle.base.z + swayZ
      );
      tempObject.scale.setScalar(particle.scale);
      tempObject.rotation.y = t * 0.1;
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(index, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (particleCount === 0) {
    return null;
  }

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.85}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      <ambientLight intensity={0.6} color="#cfdfff" />
      <pointLight position={[0, 0, 12]} intensity={1.4} color="#ffffff" />
    </>
  );
}
