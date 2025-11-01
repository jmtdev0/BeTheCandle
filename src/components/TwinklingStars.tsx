"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface TwinklingStarsProps {
  count?: number;
  radius?: number;
}

export default function TwinklingStars({ count = 600, radius = 60 }: TwinklingStarsProps) {
  const pointsRef = useRef<THREE.Points | null>(null);
  const phasesRef = useRef<Float32Array | null>(null);
  const speedsRef = useRef<Float32Array | null>(null);
  const baseRef = useRef<Float32Array | null>(null);

  const pulsesRef = useRef<Float32Array | null>(null);
  const visRef = useRef<Float32Array | null>(null);
  const visTargetRef = useRef<Float32Array | null>(null);
  const visSpeedRef = useRef<Float32Array | null>(null);

  const geom = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);
    const vis = new Float32Array(count);
    const visTarget = new Float32Array(count);
    const visSpeeds = new Float32Array(count);
    const pulses = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = Math.acos(2 * u - 1);
      const phi = 2 * Math.PI * v;
      const r = radius * (0.9 + Math.random() * 0.2);
      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(theta);
      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const b = 0.6 + Math.random() * 0.4;
      colors[i * 3 + 0] = b * 1.0;
      colors[i * 3 + 1] = b * 0.95;
      colors[i * 3 + 2] = b * 0.85;

  phases[i] = Math.random() * Math.PI * 2;
  // Reduce baseline twinkle speed so stars blink a bit slower and feel calmer
  speeds[i] = 0.25 + Math.random() * 1.0; // ~0.25 - 1.25 (was 0.5 - 2.0)
    }

  phasesRef.current = phases;
  speedsRef.current = speeds;
  baseRef.current = colors.slice();
  pulsesRef.current = pulses;
  visRef.current = vis;
  visTargetRef.current = visTarget;
  visSpeedRef.current = visSpeeds;

    for (let i = 0; i < count; i++) {
      vis[i] = 1.0;
      visTarget[i] = 1.0;
      visSpeeds[i] = 0.01 + Math.random() * 0.06;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    // extra attributes for GPU-driven twinkle
    geometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute("speed", new THREE.BufferAttribute(speeds, 1));
    geometry.setAttribute("vis", new THREE.BufferAttribute(vis, 1));
    geometry.setAttribute("pulse", new THREE.BufferAttribute(pulses, 1));
    return geometry;
  }, [count, radius]);

  // Shader material that uses per-vertex attributes plus a time uniform to
  // smoothly animate brightness on the GPU. We keep AdditiveBlending for glow.
  const material = useMemo(() => {
    const uniforms = {
      uTime: { value: 0 },
      uGlobalPulse: { value: 0 },
    } as { [k: string]: any };

    const vertexShader = `
      attribute vec3 color;
      attribute float phase;
      attribute float speed;
      attribute float vis;
      attribute float pulse;
      uniform float uTime;
      uniform float uGlobalPulse;
      varying vec3 vColor;
      varying float vVis;
      void main() {
  // Slightly lower amplitude for subtler brightness variation
  float amp = 0.45;
  float flick = (sin(uTime * speed + phase) * 0.5 + 0.5) * amp + pulse + uGlobalPulse;
        // boost base color by flick; ensure a visible dynamic range
        vColor = color * (0.6 + flick);
        vVis = vis;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        // scale point size with perspective (adjust factor as needed)
  // Increase the base multiplier so points render noticeably larger on-screen
  // (tweak these numbers if you want even bigger/smaller stars)
  float size =  (240.0 / -mvPosition.z);
  // Larger min and max point size to give stars more presence
  gl_PointSize = clamp(size, 3.0, 72.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      varying vec3 vColor;
      varying float vVis;
      void main() {
        // soft circular point
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        float mask = smoothstep(0.5, 0.0, dist);
        vec3 col = vColor * mask;
        float alpha = clamp(vVis * mask, 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
      }
    `;

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return mat;
  }, [count]);

  // Periodic painter: trigger visibility toggles every few seconds.
  useEffect(() => {
    let mounted = true;
    const baseDelay = 3000;
    const jitter = 1200;

    const tick = () => {
      if (!mounted) return;
      try {
        const numToToggle = Math.max(1, Math.floor(count * 0.02));
        for (let n = 0; n < numToToggle; n++) {
          const idx = Math.floor(Math.random() * count);
          const visT = visTargetRef.current!;
          visT[idx] = Math.random() < 0.35 ? 0 : 1;
          if (visSpeedRef.current) visSpeedRef.current[idx] = 0.01 + Math.random() * 0.06;
        }
      } catch (err) {
        // ignore if refs not ready
      }
    };

    const initial = window.setTimeout(() => tick(), 800 + Math.random() * 600);
    const interval = window.setInterval(() => tick(), baseDelay + Math.random() * jitter);

    return () => {
      mounted = false;
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [count]);

  useFrame((state: any) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const geom = pts.geometry as THREE.BufferGeometry;
    const colorAttr = geom.getAttribute("color") as THREE.BufferAttribute;
    const phases = phasesRef.current!;
    const speeds = speedsRef.current!;
    const base = baseRef.current!;
    const t = state.clock.elapsedTime;
    const amp = 0.35;
    const pulses = pulsesRef.current!;

    const spikesPerFrame = Math.max(1, Math.floor(count * 0.001));
    for (let s = 0; s < spikesPerFrame; s++) {
      // Reduce spike probability so very bright single-frame spikes are rarer
      if (Math.random() < 0.06) {
        const idx = Math.floor(Math.random() * count);
        pulses[idx] += 0.4 + Math.random() * 0.8; // slightly smaller spike magnitude
      }
    }

    const vis = visRef.current!;
    const visSpeeds = visSpeedRef.current!;
    const visAttr = (geom.getAttribute("vis") as THREE.BufferAttribute).array as Float32Array;
    const pulseAttr = (geom.getAttribute("pulse") as THREE.BufferAttribute).array as Float32Array;

    for (let i = 0; i < count; i++) {
      // decay pulses
      pulses[i] *= 0.92;

      // smooth visibility interpolation toward target
      const targetV = visTargetRef.current![i];
      const speedV = visSpeeds[i];
      vis[i] += (targetV - vis[i]) * speedV;

      // write back to GPU attributes
      visAttr[i] = vis[i];
      pulseAttr[i] = pulses[i];
    }

    (geom.getAttribute("vis") as THREE.BufferAttribute).needsUpdate = true;
    (geom.getAttribute("pulse") as THREE.BufferAttribute).needsUpdate = true;

    // update global uniforms (time + slow pulse)
    try {
      (material as any).uniforms.uTime.value = t;
      (material as any).uniforms.uGlobalPulse.value = Math.sin(t * 0.12) * 0.12; // slow global pulse
    } catch (err) {}
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <primitive object={geom} attach="geometry" />
      <primitive object={material} attach="material" />
    </points>
  );
}
