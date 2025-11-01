"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import TwinklingStars from "./TwinklingStars";

// User/Satellite data interface
export interface SatelliteUser {
  id: string;
  displayName: string;
  currentBTC: string; // e.g., "0.01 - 0.05 BTC"
  goalBTC: number;
  purpose: string;
  avatar?: string;
  // Optional wallet address where this user would like to receive donations
  walletAddress?: string;
}

/**
 * VOLUMETRIC NEBULA BACKGROUND GENERATOR
 * Creates a rich, glowing cosmic nebula texture with orange/gold tones
 * inspired by the Pillars of Creation / Eagle Nebula aesthetic.
 * 
 * Tunable Parameters:
 * @param size - Canvas resolution (higher = more detail, default 2048)
 * @param config - Configuration object:
 *   - starCount: number of scattered stars (default 4000)
 *   - nebulaIntensity: overall brightness of nebula clouds (0-1, default 0.85)
 *   - cloudDensity: number of layered cloud regions (default 12)
 *   - darkRegions: number of darker dust pockets (default 8)
 *   - colors: nebula color palette (warm oranges/reds by default)
 */
function createNebulaTexture(
  size = 2048,
  config = {
    starCount: 4000,
    nebulaIntensity: 0.85,
    cloudDensity: 12,
    darkRegions: 8,
    colors: {
      deep: '#1a0d0d',      // Deep dark red-brown
      warm: '#4a1a0a',      // Dark burnt orange
      gold: '#ffcc66',      // Golden glow
      bright: '#ffd89b',    // Bright gold-orange
      crimson: '#8b2e0a',   // Dark crimson
    }
  }
) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // === STEP 1: Base deep space gradient ===
  // Start with a rich, dark cosmic base
  const baseGrad = ctx.createRadialGradient(
    size * 0.5, size * 0.4, 0,
    size * 0.5, size * 0.5, size * 0.7
  );
  baseGrad.addColorStop(0, config.colors.warm);
  baseGrad.addColorStop(0.4, config.colors.deep);
  baseGrad.addColorStop(1, '#000000');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  // === STEP 2: Simulate volumetric nebula clouds with layered noise ===
  // Multiple overlapping clouds create depth and complexity
  ctx.save();
  ctx.globalCompositeOperation = 'screen'; // Additive blending for glow
  
  for (let layer = 0; layer < config.cloudDensity; layer++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const cloudSize = size * (0.3 + Math.random() * 0.5);
    const intensity = config.nebulaIntensity * (0.15 + Math.random() * 0.25);
    
    // Create multi-stop gradient for volumetric feel
    const cloudGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cloudSize);
    
    // Randomly pick warm colors for variety
    const warmColors = [config.colors.gold, config.colors.bright, config.colors.crimson];
    const cloudColor = warmColors[Math.floor(Math.random() * warmColors.length)];
    
    cloudGrad.addColorStop(0, `${cloudColor}${Math.floor(intensity * 255).toString(16).padStart(2, '0')}`);
    cloudGrad.addColorStop(0.3, `${config.colors.warm}${Math.floor(intensity * 0.6 * 255).toString(16).padStart(2, '0')}`);
    cloudGrad.addColorStop(0.7, `${config.colors.deep}${Math.floor(intensity * 0.2 * 255).toString(16).padStart(2, '0')}`);
    cloudGrad.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = cloudGrad;
    ctx.fillRect(cx - cloudSize, cy - cloudSize, cloudSize * 2, cloudSize * 2);
  }
  ctx.restore();

  // === STEP 3: Add darker dust regions for contrast ===
  // These create the dramatic dark pillars/structures
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  
  for (let i = 0; i < config.darkRegions; i++) {
    const dx = Math.random() * size;
    const dy = Math.random() * size;
    const dustSize = size * (0.15 + Math.random() * 0.35);
    
    const dustGrad = ctx.createRadialGradient(dx, dy, 0, dx, dy, dustSize);
    dustGrad.addColorStop(0, 'rgba(10, 5, 5, 0.7)');
    dustGrad.addColorStop(0.5, 'rgba(20, 10, 8, 0.4)');
    dustGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = dustGrad;
    ctx.fillRect(dx - dustSize, dy - dustSize, dustSize * 2, dustSize * 2);
  }
  ctx.restore();

  // === STEP 4: Scattered bright stars with variable sizes ===
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  
  for (let i = 0; i < config.starCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const starSize = Math.random() * 2 + 0.3;
    const brightness = Math.random();
    
    // Most stars are small and dim
    if (brightness < 0.92) {
      ctx.fillStyle = `rgba(255, 245, 230, ${brightness * 0.7})`;
      ctx.beginPath();
      ctx.arc(x, y, starSize * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } 
    // Some stars are medium and warmer
    else if (brightness < 0.98) {
      const starGrad = ctx.createRadialGradient(x, y, 0, x, y, starSize * 2);
      starGrad.addColorStop(0, 'rgba(255, 235, 200, 1)');
      starGrad.addColorStop(0.4, 'rgba(255, 200, 150, 0.6)');
      starGrad.addColorStop(1, 'rgba(255, 180, 100, 0)');
      ctx.fillStyle = starGrad;
      ctx.beginPath();
      ctx.arc(x, y, starSize * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Rare bright stars with strong glow
    else {
      const brightGrad = ctx.createRadialGradient(x, y, 0, x, y, starSize * 4);
      brightGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      brightGrad.addColorStop(0.2, 'rgba(255, 240, 220, 0.9)');
      brightGrad.addColorStop(0.5, 'rgba(255, 200, 150, 0.4)');
      brightGrad.addColorStop(1, 'rgba(255, 160, 80, 0)');
      ctx.fillStyle = brightGrad;
      ctx.beginPath();
      ctx.arc(x, y, starSize * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // === STEP 5: Add glowing bright regions (star formation areas) ===
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  
  const brightRegions = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < brightRegions; i++) {
    const bx = Math.random() * size;
    const by = Math.random() * size;
    const bSize = size * (0.1 + Math.random() * 0.25);
    
    const brightGrad = ctx.createRadialGradient(bx, by, 0, bx, by, bSize);
    brightGrad.addColorStop(0, 'rgba(255, 220, 180, 0.25)');
    brightGrad.addColorStop(0.4, 'rgba(255, 180, 120, 0.15)');
    brightGrad.addColorStop(0.7, 'rgba(255, 140, 60, 0.08)');
    brightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = brightGrad;
    ctx.fillRect(bx - bSize, by - bSize, bSize * 2, bSize * 2);
  }
  ctx.restore();

  // === STEP 6: Overall warm color grading overlay ===
  // Subtle tint to unify the palette toward Bitcoin orange
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  const tintGrad = ctx.createRadialGradient(
    size * 0.5, size * 0.5, 0,
    size * 0.5, size * 0.5, size * 0.6
  );
  tintGrad.addColorStop(0, 'rgba(255, 200, 140, 0.08)');
  tintGrad.addColorStop(0.6, 'rgba(255, 160, 80, 0.06)');
  tintGrad.addColorStop(1, 'rgba(40, 20, 10, 0.3)');
  ctx.fillStyle = tintGrad;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  // Convert canvas to Three.js texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

interface InteractiveSphere3DProps {
  initialPosition?: number[];
  radius?: number;
  controlsRef?: any;
  satelliteUsers?: SatelliteUser[];
  onSatelliteClick?: (user: SatelliteUser, screenPos?: { x: number; y: number }) => void;
  selectedSatelliteId?: string; // ID of selected satellite for camera focus
}

export default function InteractiveSphere3D({ 
  initialPosition = [0, 0, 0], 
  radius = 1.4, 
  controlsRef,
  satelliteUsers = [],
  onSatelliteClick,
  selectedSatelliteId,
}: InteractiveSphere3DProps) {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startRotRef = useRef(0);
  const rotateSensitivity = 0.005; // radians per pixel
  // base Y for subtle bobbing motion
  const baseYRef = React.useRef<number>(initialPosition[1] ?? 0);

  // NOTE: Bitcoin planet texture and mesh removed as requested. The nebula, stars and satellites
  // remain. If you want to re-enable the planet later, re-add the texture generation and the
  // planet mesh below.

  // Get camera and gl from useThree hook (only once)
  const { camera, gl } = useThree();
  
  // Raycaster logic to toggle OrbitControls rotation only when clicking the sphere
  useEffect(() => {
    if (!gl || !camera) return;
    const raycaster = new THREE.Raycaster();

    const handlePointerDown = (ev: PointerEvent) => {
      try {
        const rect = gl.domElement.getBoundingClientRect();
        const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(new THREE.Vector2(x, y), camera as THREE.Camera);
        const hit = meshRef.current ? raycaster.intersectObject(meshRef.current, true) : [];
        const hitSphere = hit && hit.length > 0;
        if (controlsRef && controlsRef.current) {
          controlsRef.current.enableRotate = !!hitSphere;
          // also allow zooming the camera only when the sphere is clicked
          controlsRef.current.enableZoom = !!hitSphere;
        }
      } catch (err) {
        // ignore
      }
    };

    // initialize controls as disabled until a sphere click occurs
    if (controlsRef && controlsRef.current) {
      controlsRef.current.enableRotate = false;
      controlsRef.current.enableZoom = false;
    }
    gl.domElement.addEventListener("pointerdown", handlePointerDown, { passive: true });
    return () => gl.domElement.removeEventListener("pointerdown", handlePointerDown as any);
  }, [gl, camera, controlsRef]);

  // Programmatically perform a tiny synthetic drag (pointerdown -> few pointermoves -> pointerup)
  // so the scene behaves as if the user slightly dragged the planet on load.
  useEffect(() => {
    if (!gl || typeof window === "undefined") return;
    const el = gl.domElement as HTMLCanvasElement | undefined;
    if (!el) return;

    const triggerSyntheticDrag = () => {
      try {
        const rect = el.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;
        const steps = 4;
        const totalDx = Math.max(24, Math.min(120, rect.width * 0.06)); // small drag distance in px
        const dt = 30; // ms between moves

        // dispatch pointerdown on the canvas so handlers attach window listeners
        const down = new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          composed: true,
          pointerType: "mouse",
          clientX: startX,
          clientY: startY,
          button: 0,
        } as PointerEventInit);
        el.dispatchEvent(down);

        // schedule a few pointermove events on window to simulate a drag
        for (let i = 1; i <= steps; i++) {
          const moveX = startX + (totalDx * i) / steps;
          const move = new PointerEvent("pointermove", {
            bubbles: true,
            cancelable: true,
            composed: true,
            pointerType: "mouse",
            clientX: moveX,
            clientY: startY,
            button: 0,
          } as PointerEventInit);
          setTimeout(() => window.dispatchEvent(move), dt * i);
        }

        // final pointerup
        const up = new PointerEvent("pointerup", {
          bubbles: true,
          cancelable: true,
          composed: true,
          pointerType: "mouse",
          clientX: startX + totalDx,
          clientY: startY,
          button: 0,
        } as PointerEventInit);
        const upTime = dt * (steps + 1);
        setTimeout(() => window.dispatchEvent(up), upTime);

        // After the drag finishes, perform a small synthetic click at the final position
        const clickDelay = upTime + 80; // ms after initial down
        setTimeout(() => {
          try {
            const clickDown = new PointerEvent("pointerdown", {
              bubbles: true,
              cancelable: true,
              composed: true,
              pointerType: "mouse",
              clientX: startX + totalDx,
              clientY: startY,
              button: 0,
            } as PointerEventInit);
            window.dispatchEvent(clickDown);
            const clickUp = new PointerEvent("pointerup", {
              bubbles: true,
              cancelable: true,
              composed: true,
              pointerType: "mouse",
              clientX: startX + totalDx,
              clientY: startY,
              button: 0,
            } as PointerEventInit);
            setTimeout(() => window.dispatchEvent(clickUp), 40);
          } catch (err) {
            console.debug("InteractiveSphere3D: synthetic click after drag failed", err);
          }
        }, clickDelay);
      } catch (err) {
        console.debug("InteractiveSphere3D: synthetic drag failed", err);
      }
    };

    const t = window.setTimeout(triggerSyntheticDrag, 350);
    return () => window.clearTimeout(t);
  }, [gl]);

  // Allow the browser's native zoom (Ctrl + + / -) to scale the canvas just like other DOM content.
  // No extra handlers here; the Goofy Mode canvas now mirrors the Lobby behavior.

  useFrame((state: any, delta: number) => {
    if (meshRef.current && !dragging) {
      meshRef.current.rotation.y += delta * 0.4; // slower rotation
    }
    // gentle vertical bobbing when not dragging
    if (meshRef.current && !dragging) {
      const bobAmp = radius * 0.025; // amplitude relative to planet radius
      const bobFreq = 0.9; // speed of bobbing
      const t = state.clock.elapsedTime;
      const desiredY = (baseYRef.current ?? 0) + Math.sin(t * bobFreq) * bobAmp;
      // smooth the motion
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, desiredY, 0.08);
    }
    
    // Subtle cinematic camera animation (slow orbit around the scene)
    cameraAnimTime.current += delta * 0.08;
    if (controlsRef?.current && !dragging) {
      const offset = 0.15; // subtle movement
      const newX = Math.sin(cameraAnimTime.current) * offset;
      const newY = Math.cos(cameraAnimTime.current * 0.5) * offset * 0.5;
      
      // Apply subtle camera position offset (doesn't interfere with OrbitControls target)
      if (camera.position) {
        const baseDistance = Math.sqrt(
          camera.position.x * camera.position.x +
          camera.position.y * camera.position.y +
          camera.position.z * camera.position.z
        );
        const angle = cameraAnimTime.current * 0.05;
        camera.position.x += Math.sin(angle) * 0.002;
        camera.position.y += Math.cos(angle * 0.7) * 0.001;
      }
    }
  });

  // Add a small warm key light near the top-right and a soft cool fill light
  // These will be added as scene-level lights via three objects inside the component
  // (works when this component is used inside a Canvas)
  const keyLightRef = useRef<THREE.PointLight | null>(null);
  const fillLightRef = useRef<THREE.PointLight | null>(null);
  // (removed halo mesh — no persistent camera-facing halo to avoid large circle on zoom out)
  
  // Volumetric nebula background texture
  // Rich orange/gold cosmic clouds with scattered stars
  const nebulaTexture = useMemo(() => createNebulaTexture(2048), []);

  // Canvas texture for a centered white ₿ symbol to paint on the sphere surface.
  // We use it as an emissiveMap so the symbol appears white over the orange base color.
  const btcSymbolTexture = useMemo(() => {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Transparent background
    ctx.clearRect(0, 0, size, size);

  // Draw a slightly smaller, semi-translucent white ₿ centered
  const fontSize = Math.floor(size * 0.45);
  // Use the requested gold color (#d7b649) with translucency
  ctx.fillStyle = 'rgba(215,182,73,0.65)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Use a thick font weight; fall back to sans-serif if serif not available
    ctx.font = `700 ${fontSize}px serif, Arial, sans-serif`;
    // Slight stroke to make the glyph crisper against the sphere shading
  ctx.lineWidth = Math.max(3, Math.floor(size * 0.006));
  ctx.strokeStyle = 'rgba(215,182,73,0.9)';
  // Slight vertical offset to visually center on the sphere
  const yOffset = Math.floor(size * 0.02);
  ctx.strokeText('₿', size / 2, size / 2 + yOffset);
  ctx.fillText('₿', size / 2, size / 2 + yOffset);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    try { tex.colorSpace = THREE.SRGBColorSpace; } catch {}
    return tex;
  }, []);

  // TwinklingStars logic moved to src/components/TwinklingStars.tsx
  
  // Cinematic camera animation time
  const cameraAnimTime = useRef(0);

  // Desired camera distance from the planet on initial load / when returning to planet.
  // Increased multiplier and minimum so the initial framing is noticeably further back.
  // If you'd like it even farther/closer, I can make this configurable or tweak these values.
  const desiredPlanetDistance = Math.max(20, (radius || 1.4) * 5.0);

  // On mount, ensure the camera isn't too close to the planet. If it is, move it back
  // along the current camera direction so the scene loads with a comfortable framing.
  useEffect(() => {
    if (!camera) return;
    try {
      const planetPos = new THREE.Vector3(...(initialPosition as [number, number, number]));
      const curDist = camera.position.distanceTo(planetPos);
      if (curDist < desiredPlanetDistance) {
        const dir = camera.position.clone().sub(planetPos).normalize();
        if (dir.length() === 0) dir.set(0, 0, 1);
        const newPos = planetPos.clone().add(dir.multiplyScalar(desiredPlanetDistance));
        camera.position.copy(newPos);
        if (controlsRef?.current) {
          controlsRef.current.target.copy(planetPos);
          controlsRef.current.update();
        }
      }
    } catch (err) {
      // ignore
    }
  }, [camera, desiredPlanetDistance]);

  // satellite
  // multiple satellites with randomized radius, distance and speed per page load
  const satRefs = useRef<Array<THREE.Group | null>>([]);
  const orbitLineRefs = useRef<Array<THREE.Line | null>>([]);
  const [hoveredSatId, setHoveredSatId] = useState<string | null>(null);
  
  // Individual speed multipliers per satellite for hover slowdown effect
  const satelliteSpeedMultipliers = useRef<number[]>([]);
  // Per-satellite angle accumulators to avoid discontinuities when changing speed
  const satelliteAngles = useRef<number[]>([]);
  
  // create satellites based on provided users or generate random ones
  const satellites = useMemo(() => {
    if (satelliteUsers && satelliteUsers.length > 0) {
      // Use provided satellite users
      return satelliteUsers.map((user, idx) => {
        const size = radius * (0.06 + Math.random() * 0.08);
        const distance = radius * (1.8 + idx * 0.6 + Math.random() * 0.4);
        const speed = (0.3 + Math.random() * 1.5) * 0.4;
        const phase = Math.random() * Math.PI * 2;
        const inclination = (Math.random() - 0.5) * 0.7;
        const orbitRotation = Math.random() * Math.PI * 2;
        const eccentricity = 0.85 + Math.random() * 0.3;
        const verticalAmp = (Math.random() - 0.5) * radius * 0.25;
        const verticalFreq = 0.5 + Math.random() * 1.2;
        const orbitEuler = new THREE.Euler(inclination, orbitRotation, 0, "XYZ");
        
        const moonColors = ["#8b9dc3", "#c1440e", "#d4af37", "#a8d5e2", "#786d5f"];
        const color = moonColors[idx % moonColors.length];

        return {
          size,
          distance,
          speed,
          phase,
          eccentricity,
          verticalAmp,
          verticalFreq,
          orbitEuler,
          color,
          user, // Attach user data
        };
      });
    } else {
      // Generate random satellites as before
      const count = 3 + Math.floor(Math.random() * 2);
      return Array.from({ length: count }).map((_, idx) => {
        const size = radius * (0.06 + Math.random() * 0.08);
        const distance = radius * (1.8 + idx * 0.6 + Math.random() * 0.4);
        const speed = (0.3 + Math.random() * 1.5) * 0.4;
        const phase = Math.random() * Math.PI * 2;
        const inclination = (Math.random() - 0.5) * 0.7;
        const orbitRotation = Math.random() * Math.PI * 2;
        const eccentricity = 0.85 + Math.random() * 0.3;
        const verticalAmp = (Math.random() - 0.5) * radius * 0.25;
        const verticalFreq = 0.5 + Math.random() * 1.2;
        const orbitEuler = new THREE.Euler(inclination, orbitRotation, 0, "XYZ");
        
        const moonColors = ["#8b9dc3", "#c1440e", "#d4af37", "#a8d5e2", "#786d5f"];
        const color = moonColors[idx % moonColors.length];

        return {
          size,
          distance,
          speed,
          phase,
          eccentricity,
          verticalAmp,
          verticalFreq,
          orbitEuler,
          color,
          user: undefined,
        };
      });
    }
  }, [radius, satelliteUsers]);

  // Camera animation state for tracking selected satellite
  const cameraAnimationProgress = useRef(0);
  const isAnimatingCamera = useRef(false);
  const cameraStartPosition = useRef(new THREE.Vector3());
  const cameraStartTarget = useRef(new THREE.Vector3());
  // When we lock onto a satellite we want to keep the camera at a fixed offset
  // relative to the satellite so the satellite does not 'move away' from the camera
  // as it continues orbiting. We store that offset here after the fly-to animation.
  const cameraOffsetRef = useRef(new THREE.Vector3());
  const selectedSatelliteIndex = useRef(-1);

  // Effect to start camera animation when satellite selection changes
  useEffect(() => {
    if (!camera || !controlsRef?.current) return;

    // Reset animation
    isAnimatingCamera.current = true;
    cameraAnimationProgress.current = 0;
    cameraStartPosition.current.copy(camera.position);
    cameraStartTarget.current.copy(controlsRef.current.target);

    if (selectedSatelliteId) {
      // Find the selected satellite index
      const index = satellites.findIndex(sat => sat.user?.id === selectedSatelliteId);
      selectedSatelliteIndex.current = index;
    } else {
      selectedSatelliteIndex.current = -1;
      // clear any stored camera offset when returning to planet focus
      cameraOffsetRef.current.set(0, 0, 0);
    }
  }, [selectedSatelliteId, camera, controlsRef, satellites]);

  // animate satellites
  const orbitTime = useRef(0);
  useFrame((state: any, delta: number) => {
    // regular orbit time for scene-level effects (glow, camera subtle motion)
    orbitTime.current += delta;

    // planet glow removed

    // Handle camera animation and tracking for selected satellite
    if (selectedSatelliteIndex.current >= 0 && controlsRef?.current) {
      const satRef = satRefs.current[selectedSatelliteIndex.current];
      
      if (satRef) {
        const satPosition = satRef.position.clone();
        
        if (isAnimatingCamera.current) {
          // During animation: perform an ease-out interpolation of camera position
          const duration = 1.2;
          cameraAnimationProgress.current += delta / duration;

          const finished = cameraAnimationProgress.current >= 1;
          if (finished) cameraAnimationProgress.current = 1;

          // Ease-out cubic
          const t = 1 - Math.pow(1 - cameraAnimationProgress.current, 3);

          // Calculate target camera position (a point offset from the satellite)
          const distanceFromSat = 2.5;
          const currentCamDir = new THREE.Vector3().subVectors(camera.position, satPosition).normalize();

          if (currentCamDir.length() < 0.1) {
            currentCamDir.set(1.5, 0.8, 2.0).normalize();
          }

          const targetCamPos = satPosition.clone().add(currentCamDir.multiplyScalar(distanceFromSat));

          // Interpolate camera position and target
          camera.position.lerpVectors(cameraStartPosition.current, targetCamPos, t);
          controlsRef.current.target.lerpVectors(cameraStartTarget.current, satPosition, t);
          controlsRef.current.update();

          // If animation just finished, record the camera offset relative to the satellite
          if (finished) {
            isAnimatingCamera.current = false;
            // store offset so subsequent frames keep the camera at the same relative position
            cameraOffsetRef.current.copy(camera.position).sub(satPosition);
          }
        } else {
          // After animation: keep camera locked at satPosition + offset so the satellite
          // remains at a constant offset from the camera while it orbits.
          const desiredCamPos = satPosition.clone().add(cameraOffsetRef.current);
          // Smoothly follow to avoid jitter when satellite moves fast
          camera.position.lerp(desiredCamPos, 0.18);
          // Keep the controls target locked on the satellite (smooth as well)
          controlsRef.current.target.lerp(satPosition, 0.18);
          controlsRef.current.update();
        }
      }
    } else if (selectedSatelliteIndex.current === -1 && controlsRef?.current) {
      // Return to planet focus
        const planetPosition = new THREE.Vector3(...(initialPosition as [number, number, number]));
        // Use desiredPlanetDistance so the return-to-planet framing matches the initial load distance
        const defaultCameraPosition = planetPosition.clone().add(new THREE.Vector3(0, 0, desiredPlanetDistance));
      
      if (isAnimatingCamera.current) {
        const duration = 1.2;
        cameraAnimationProgress.current += delta / duration;
        
        if (cameraAnimationProgress.current >= 1) {
          cameraAnimationProgress.current = 1;
          isAnimatingCamera.current = false;
        }
        
        const t = 1 - Math.pow(1 - cameraAnimationProgress.current, 3);
        
        camera.position.lerpVectors(cameraStartPosition.current, defaultCameraPosition, t);
        controlsRef.current.target.lerpVectors(cameraStartTarget.current, planetPosition, t);
        controlsRef.current.update();
      } else {
        // Keep focused on planet
        controlsRef.current.target.copy(planetPosition);
        controlsRef.current.update();
      }
    }

    // Ensure arrays are initialized and match satellite count
    if (satelliteSpeedMultipliers.current.length !== satellites.length) {
      satelliteSpeedMultipliers.current = satellites.map(() => 1.0);
    }
    if (satelliteAngles.current.length !== satellites.length) {
      satelliteAngles.current = satellites.map((s) => s.phase || 0);
    }

    // Update each satellite's angle incrementally to avoid discontinuities
    satellites.forEach((sat, i) => {
      const ref = satRefs.current[i];
      if (!ref) return;

      // Smooth speed transition for the hovered satellite only
      const hoverSpeedReduction = 0.25; // Reduce to 25% speed when hovering this satellite
      const isHovered = sat.user?.id === hoveredSatId;
      const targetSpeed = isHovered ? hoverSpeedReduction : 1.0;
      satelliteSpeedMultipliers.current[i] = THREE.MathUtils.lerp(
        satelliteSpeedMultipliers.current[i],
        targetSpeed,
        0.12 // Smooth transition
      );

      // Increment the stored angle by delta * speed * multiplier
      satelliteAngles.current[i] += delta * sat.speed * satelliteSpeedMultipliers.current[i];
      const t = satelliteAngles.current[i];

      // parametric circular orbit then transform into the satellite's orbital plane
      const x = Math.cos(t) * sat.distance * (sat.eccentricity ?? 1);
      const z = Math.sin(t) * sat.distance;
      const pos = new THREE.Vector3(x, 0, z);
      pos.applyEuler(sat.orbitEuler);
      // add small vertical bobbing
      pos.y += Math.sin(t * (sat.verticalFreq ?? 1)) * (sat.verticalAmp ?? 0);

      ref.position.copy(pos);
      ref.lookAt(meshRef.current?.position || new THREE.Vector3(0, 0, 0));
    });
  });

  // Only start rotating if the initial pointerdown is on the sphere mesh itself.
  const pointerActiveRef = useRef(false);

  const onPointerDown = (e: any) => {
    // Ensure the event is targeting our mesh (robust against bubbling)
    const hitObject = e.object || (e.intersections && e.intersections[0] && e.intersections[0].object);
    if (hitObject !== meshRef.current) return; // ignore clicks that aren't on the sphere

    e.stopPropagation();
    pointerActiveRef.current = true;
    setDragging(true);
    // store initial pointer X and rotation
    startXRef.current = e.clientX ?? 0;
    startRotRef.current = meshRef.current ? meshRef.current.rotation.y : 0;
    try {
      e.target.setPointerCapture?.(e.pointerId);
    } catch {}
    document.body.style.cursor = "grabbing";
  };

  const onPointerMove = (e: any) => {
    if (!pointerActiveRef.current || !dragging || !meshRef.current) return;
    e.stopPropagation();
    const dx = (e.clientX ?? 0) - startXRef.current;
    const newRot = startRotRef.current + dx * rotateSensitivity;
    meshRef.current.rotation.y = newRot;
  };

  const onPointerUp = (e: any) => {
    if (!pointerActiveRef.current) return;
    pointerActiveRef.current = false;
    setDragging(false);
    try {
      e.target.releasePointerCapture?.(e.pointerId);
    } catch {}
    document.body.style.cursor = "auto";
  };

  return (
    <>
      {/* Volumetric nebula background - inverted sphere (sky dome) */}
      <mesh scale={[-1, 1, 1]} position={[0, 0, 0]}>
        <sphereGeometry args={[100, 64, 64]} />
        <meshBasicMaterial map={nebulaTexture} side={THREE.BackSide} />
      </mesh>
        {/* Twinkling background stars to add subtle motion */}
        <TwinklingStars count={700} radius={95} />

      {/* Ambient light for general scene illumination */}
      <ambientLight intensity={0.25} color="#4a5f8f" />
      
      {/* Warm key light (sun-like) */}
      <pointLight ref={keyLightRef} color="#ffb347" intensity={2.2} distance={25} decay={2} position={[8, 5, 3]} castShadow />
      
      {/* Subtle cool fill light */}
      <pointLight ref={fillLightRef} color="#7fb6ff" intensity={0.25} distance={35} decay={2} position={[-6, -3, -4]} />
      
      {/* Orange placeholder sphere inserted where the planet was. Keeps the same pointer handlers so
          dragging / clicking behavior remains functional. */}
      <mesh
        ref={meshRef as any}
        position={initialPosition as any}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[radius, 96, 96]} />
        <meshStandardMaterial
          color="#ff8a00"
          metalness={0.1}
          roughness={0.4}
          // Emissive map paints the white ₿ on top of the orange base. Emissive color is white
          // so the symbol appears bright regardless of lighting.
          emissive={'#ffffff'}
          emissiveIntensity={0.6}
          emissiveMap={btcSymbolTexture}
        />
      </mesh>

      {/* Orbiting moons/satellites with orbit lines */}
      {satellites.map((sat, i) => (
        <React.Fragment key={`sat-${i}`}>
          {/* Visible orbit line */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <ringGeometry args={[sat.distance - 0.01, sat.distance + 0.01, 128]} />
            <meshBasicMaterial
              color={sat.color}
              transparent
              opacity={hoveredSatId === sat.user?.id ? 0.5 : 0.2}
              side={THREE.DoubleSide}
            />
          </mesh>
          
          {/* Moon/satellite */}
          <group
            ref={(el) => {
              satRefs.current[i] = el;
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              if (sat.user) {
                setHoveredSatId(sat.user.id);
                document.body.style.cursor = 'pointer';
              }
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              setHoveredSatId(null);
              document.body.style.cursor = 'auto';
            }}
            onClick={(e) => {
              e.stopPropagation();
              // Notify parent if provided
              if (sat.user && onSatelliteClick) {
                try {
                  // compute screen coordinates of the satellite to position the info card
                  const satWorldPos = new THREE.Vector3();
                  const el = satRefs.current[i];
                  if (el) {
                    el.getWorldPosition(satWorldPos);
                  }
                  // project to NDC
                  const projected = satWorldPos.clone().project(camera as THREE.Camera);
                  const rect = (gl && gl.domElement && (gl.domElement as HTMLCanvasElement).getBoundingClientRect()) || { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
                  const sx = (projected.x + 1) / 2 * rect.width + rect.left;
                  const sy = (-projected.y + 1) / 2 * rect.height + rect.top;
                  onSatelliteClick(sat.user, { x: sx, y: sy });
                } catch (err) {
                  // fallback to just user
                  onSatelliteClick(sat.user);
                }
              }

              // Center the scene on this satellite: trigger the camera animation
              try {
                selectedSatelliteIndex.current = i;
                isAnimatingCamera.current = true;
                cameraAnimationProgress.current = 0;
                // store starting camera position and target for the animation
                cameraStartPosition.current.copy(camera.position);
                if (controlsRef?.current) {
                  cameraStartTarget.current.copy(controlsRef.current.target);
                } else {
                  cameraStartTarget.current.set(0, 0, 0);
                }
              } catch (err) {
                // ignore any runtime errors if controls/camera not ready
              }
            }}
          >
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[sat.size, 32, 32]} />
              <meshStandardMaterial 
                color={sat.color} 
                metalness={0.2} 
                roughness={0.6} 
                emissive={sat.color}
                emissiveIntensity={hoveredSatId === sat.user?.id ? 0.3 : 0.1}
              />
            </mesh>
            {/* Small glow around each moon */}
            <mesh scale={[1.3, 1.3, 1.3]}>
              <sphereGeometry args={[sat.size, 16, 16]} />
              <meshBasicMaterial
                color={sat.color}
                transparent
                opacity={hoveredSatId === sat.user?.id ? 0.25 : 0.15}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>
        </React.Fragment>
      ))}
    </>
  );
}
