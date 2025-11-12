"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree, extend } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { DEFAULT_SATELLITE_COLOR, getPaletteForColor } from "@/lib/satelliteColors";

/**
 * GLSL Shader for Realistic Animated Star
 * Uses 3D Simplex noise to create turbulent plasma surface
 */
const starVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const starFragmentShader = `
  uniform float uTime;
  uniform vec3 uBaseColor;
  uniform vec3 uHotColor;
  uniform float uIntensity;
  uniform sampler2D uSymbolMap;
  uniform float uSymbolStrength;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  
  // 3D Simplex Noise function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  
  // Fractal Brownian Motion for multi-scale detail
  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for(int i = 0; i < 5; i++) {
      value += amplitude * snoise(p * frequency);
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    
    return value;
  }
  
  void main() {
    // Animate the noise in 3D space
    vec3 noiseCoord = vPosition * 1.5 + vec3(uTime * 0.15, uTime * 0.1, 0.0);
    
    // Multi-octave turbulence
    float noise1 = fbm(noiseCoord);
    float noise2 = fbm(noiseCoord * 2.0 + vec3(100.0, 50.0, 25.0));
    float noise3 = fbm(noiseCoord * 4.0 - vec3(50.0, 100.0, 75.0));
    
    // Combine noises for complex plasma effect
    float turbulence = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
    turbulence = (turbulence + 1.0) * 0.5; // Normalize to 0-1
    
    // Create hot spots and cooler regions
    float hotSpots = smoothstep(0.4, 0.8, turbulence);
    
    // Mix between base white-hot and hotter yellow-orange
    vec3 finalColor = mix(uBaseColor, uHotColor, hotSpots);
    
    // Add intensity variation
    float brightness = 1.0 + turbulence * 0.5;
    
    vec4 symbolSample = texture2D(uSymbolMap, vUv);
    float symbolAlpha = symbolSample.a * uSymbolStrength;
    vec3 symbolColor = symbolSample.rgb;
    vec3 combinedColor = mix(finalColor, symbolColor, clamp(symbolAlpha, 0.0, 1.0));
    gl_FragColor = vec4(combinedColor * brightness * uIntensity, 1.0);
  }
`;

// Create custom shader material class
class StarMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBaseColor: { value: new THREE.Color('#ffd27a') }, // Warm yellow-orange base
        uHotColor: { value: new THREE.Color('#f7931a') },  // Bitcoin orange for hot regions
        uIntensity: { value: 1.8 },
        uSymbolMap: { value: null },
        uSymbolStrength: { value: 1.0 },
      },
    });
  }
}

// Register the material for React Three Fiber
extend({ StarMaterial });

// Declare JSX intrinsic element for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      starMaterial: any;
    }
  }
}

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
  // Optional color for the satellite (will override default palette)
  color?: string;
  // Actual display name used for profile lookup
  profileDisplayName?: string | null;
  // User-configurable orbit speed multiplier (0.1 to 3.0, default 1.0)
  orbitSpeedMultiplier?: number;
}

/**
 * Bitcoin Color Palette for Distant Galaxies
 */
const BITCOIN_COLORS = {
  orange: '#f7931a',
  white: '#ffffff',
  gray: '#4d4d4d',
  blue: '#0d579b',
  green: '#329239',
};

interface OrbitSeed {
  sizeFactor: number;
  distanceFactor: number;
  speed: number;
  phase: number;
  eccentricity: number;
  verticalAmpFactor: number;
  verticalFreq: number;
  inclination: number;
  orbitRotation: number;
}

function hashString(value: string) {
  let hash = 1779033703 ^ value.length;
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
  hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
  return (hash ^ (hash >>> 16)) >>> 0;
}

function createSeededRandom(seed: string) {
  let state = hashString(seed) || 0x1a2b3c4d;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createOrbitSeed(seedKey: string, orderHint: number): OrbitSeed {
  const rng = createSeededRandom(`${seedKey}-${orderHint}`);
  const sizeFactor = 0.06 + rng() * 0.08;
  const distanceFactor = 1.8 + orderHint * 0.55 + rng() * 0.35;
  const speed = (0.3 + rng() * 1.5) * 0.4;
  const phase = rng() * Math.PI * 2;
  const inclination = (rng() - 0.5) * 0.7;
  const orbitRotation = rng() * Math.PI * 2;
  const eccentricity = 0.85 + rng() * 0.3;
  const verticalAmpFactor = (rng() - 0.5) * 0.25;
  const verticalFreq = 0.5 + rng() * 1.2;
  return {
    sizeFactor,
    distanceFactor,
    speed,
    phase,
    eccentricity,
    verticalAmpFactor,
    verticalFreq,
    inclination,
    orbitRotation,
  };
}

/**
 * Creates a galaxy texture with Bitcoin color palette
 * Used for distant galaxy sprites in the background
 */
function createGalaxyTexture(
  size = 512,
  colorPalette: string[] = [BITCOIN_COLORS.orange, BITCOIN_COLORS.blue, BITCOIN_COLORS.white]
) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  // Dark space background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);
  
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size / 2;
  
  // Choose a primary color from palette
  const primaryColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
  
  // Create spiral galaxy with Bitcoin colors
  // Core glow
  const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius * 0.15);
  coreGrad.addColorStop(0, primaryColor);
  coreGrad.addColorStop(0.5, primaryColor + '88');
  coreGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = coreGrad;
  ctx.fillRect(0, 0, size, size);
  
  // Spiral arms with multiple colors
  ctx.globalCompositeOperation = 'lighter';
  const spiralArms = 2 + Math.floor(Math.random() * 3);
  const particles = 2000 + Math.floor(Math.random() * 1000);
  
  for (let i = 0; i < particles; i++) {
    const angle = (i / particles) * Math.PI * 8 + Math.random() * 0.3;
    const armIndex = Math.floor(Math.random() * spiralArms);
    const armAngle = (armIndex / spiralArms) * Math.PI * 2;
    const distance = Math.pow(Math.random(), 0.6) * maxRadius * 0.9;
    
    const x = centerX + Math.cos(angle + armAngle) * distance;
    const y = centerY + Math.sin(angle + armAngle) * distance;
    
    // Pick color from palette with variation
    const colorIndex = Math.floor(Math.random() * colorPalette.length);
    const color = colorPalette[colorIndex];
    const alpha = (1 - (distance / maxRadius)) * (0.2 + Math.random() * 0.6);
    
    const particleSize = Math.random() * 2 + 0.5;
    ctx.fillStyle = color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
    ctx.beginPath();
    ctx.arc(x, y, particleSize, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Add some bright stars in Bitcoin colors
  const starCount = 50 + Math.floor(Math.random() * 50);
  for (let i = 0; i < starCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const starColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    const starSize = Math.random() * 1.5 + 0.5;
    
    ctx.fillStyle = starColor;
    ctx.beginPath();
    ctx.arc(x, y, starSize, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.globalCompositeOperation = 'source-over';
  
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

interface InteractiveSphere3DProps {
  initialPosition?: number[];
  radius?: number;
  controlsRef?: any;
  satelliteUsers?: SatelliteUser[];
  onSatelliteClick?: (user: SatelliteUser, screenPos?: { x: number; y: number }) => void;
  selectedSatelliteId?: string; // ID of selected satellite for camera focus
  satelliteColor?: string;
  currentUserId?: string | null;
}

export default function InteractiveSphere3D({ 
  initialPosition = [0, 0, 0], 
  radius = 1.4, 
  controlsRef,
  satelliteUsers = [],
  onSatelliteClick,
  selectedSatelliteId,
  satelliteColor = DEFAULT_SATELLITE_COLOR,
  currentUserId = null,
}: InteractiveSphere3DProps) {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const starMaterialRef = useRef<StarMaterial>(new StarMaterial());
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startRotRef = useRef(0);
  const rotateSensitivity = 0.003;
  // base Y for subtle bobbing motion
  const baseYRef = React.useRef<number>(initialPosition[1] ?? 0);
  const starCenterRef = useRef(new THREE.Vector3(initialPosition[0] ?? 0, initialPosition[1] ?? 0, initialPosition[2] ?? 0));
  const tempVecA = useRef(new THREE.Vector3());
  const tempVecB = useRef(new THREE.Vector3());
  const tempVecC = useRef(new THREE.Vector3());
  const tempVecD = useRef(new THREE.Vector3());
  const pointerWorldRef = useRef(new THREE.Vector3());
  const pointerLightRef = useRef<THREE.PointLight | null>(null);
  const pointerLightPositionRef = useRef(new THREE.Vector3());
  const pointerLightActiveRef = useRef(false);
  const pointerLightPulseRef = useRef(0);
  const pointerSlowStatesRef = useRef<boolean[]>([]);
  const pointerSlowCountRef = useRef(0);
  const preFocusCameraPositionRef = useRef(new THREE.Vector3());
  const preFocusCameraTargetRef = useRef(new THREE.Vector3());
  const hasPreFocusRef = useRef(false);
  const cameraApproachDirectionRef = useRef(new THREE.Vector3());
  const cameraApproachDistanceRef = useRef(2.5);
  const initialCameraPositionedRef = useRef(false);
  const lastSelectedIdRef = useRef<string | null>(null);
  const [userLabelVisibility, setUserLabelVisibility] = useState<Record<string, boolean>>({});
  const userLabelVisibilityRef = useRef<Record<string, boolean>>({});

  // NOTE: Bitcoin planet texture and mesh removed as requested. The nebula, stars and satellites
  // remain. If you want to re-enable the planet later, re-add the texture generation and the
  // planet mesh below.

  // Get camera and gl from useThree hook (only once)
  const { camera, gl } = useThree();
  
  // Allow rotating and zooming the scene from anywhere on the canvas
  useEffect(() => {
    if (!gl) return;

    if (controlsRef?.current) {
      controlsRef.current.enableRotate = true;
      controlsRef.current.enableZoom = true;
    }

    const activeTouchIds = new Set<number>();
    const element = gl.domElement as HTMLElement;

    const handlePointerDown = (ev: PointerEvent) => {
      if (controlsRef?.current) {
        controlsRef.current.enableRotate = true;
        controlsRef.current.enableZoom = true;
      }

      if (ev.pointerType === "touch") {
        activeTouchIds.add(ev.pointerId);
      }
    };

    const handlePointerUp = (ev: PointerEvent) => {
      if (ev.pointerType === "touch") {
        activeTouchIds.delete(ev.pointerId);
        if (controlsRef?.current && activeTouchIds.size === 0) {
          controlsRef.current.enableZoom = false;
        }
      }
    };

    const handlePointerCancel = (ev: PointerEvent) => {
      if (ev.pointerType === "touch") {
        activeTouchIds.delete(ev.pointerId);
        if (controlsRef?.current && activeTouchIds.size === 0) {
          controlsRef.current.enableZoom = false;
        }
      }
    };

    element.addEventListener("pointerdown", handlePointerDown, { passive: true });
    element.addEventListener("pointerup", handlePointerUp, { passive: true });
    element.addEventListener("pointercancel", handlePointerCancel, { passive: true });

    return () => {
      element.removeEventListener("pointerdown", handlePointerDown as any);
      element.removeEventListener("pointerup", handlePointerUp as any);
      element.removeEventListener("pointercancel", handlePointerCancel as any);
    };
  }, [gl, controlsRef]);

  useEffect(() => {
    starCenterRef.current.set(
      initialPosition[0] ?? 0,
      initialPosition[1] ?? 0,
      initialPosition[2] ?? 0,
    );
  }, [initialPosition]);

  // Custom pinch-to-zoom handling for touch devices
  useEffect(() => {
    if (!gl || !controlsRef?.current) return;

    const element = gl.domElement as HTMLElement;
    const targetControls = controlsRef.current;

    const pinchState = {
      active: false,
      startDistance: 0,
      startVector: new THREE.Vector3(),
      startLength: 0,
    };

    const getDistance = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        targetControls.enableZoom = true;
        pinchState.active = true;
        pinchState.startDistance = getDistance(event.touches);
        pinchState.startVector.copy(camera.position).sub(targetControls.target);
        pinchState.startLength = pinchState.startVector.length();
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!pinchState.active || event.touches.length < 2) return;

      event.preventDefault();
      const distance = getDistance(event.touches);
      if (distance <= 0 || pinchState.startDistance <= 0 || pinchState.startLength <= 0) return;

      const scale = pinchState.startDistance / distance;
      const minDistance = targetControls.minDistance ?? 0.01;
      const maxDistance = targetControls.maxDistance ?? Infinity;

      const nextLength = THREE.MathUtils.clamp(pinchState.startLength * scale, minDistance, maxDistance);
      const newVector = pinchState.startVector.clone().setLength(nextLength);

      camera.position.copy(targetControls.target).add(newVector);
      targetControls.update();
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) {
        pinchState.active = false;
      }
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });
    element.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart as any);
      element.removeEventListener("touchmove", handleTouchMove as any);
      element.removeEventListener("touchend", handleTouchEnd as any);
      element.removeEventListener("touchcancel", handleTouchEnd as any);
    };
  }, [gl, camera, controlsRef]);

  // Allow the browser's native zoom (Ctrl + + / -) to scale the canvas just like other DOM content.
  // No extra handlers here; the Goofy Mode canvas now mirrors the Lobby behavior.

  // Add a small warm key light near the top-right and a soft cool fill light
  // These will be added as scene-level lights via three objects inside the component
  // (works when this component is used inside a Canvas)
  const keyLightRef = useRef<THREE.PointLight | null>(null);
  const fillLightRef = useRef<THREE.PointLight | null>(null);
  
  // Cinematic camera animation time
  const cameraAnimTime = useRef(0);

  // Background texture removed - will rebuild from scratch

  // Procedural bump/normal map for surface irregularities (solar storms, surface activity)
  const planetBumpTexture = useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Base gray for neutral bump
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    
    // Add noise for micro-detail
    const imageData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 30;
      imageData.data[i] = Math.max(0, Math.min(255, 128 + noise));
      imageData.data[i + 1] = Math.max(0, Math.min(255, 128 + noise));
      imageData.data[i + 2] = Math.max(0, Math.min(255, 128 + noise));
    }
    ctx.putImageData(imageData, 0, 0);
    
    // Add crater-like darker spots
    const craterCount = 80 + Math.floor(Math.random() * 40);
    for (let i = 0; i < craterCount; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const craterRadius = 3 + Math.random() * 20;
      const darkness = 30 + Math.random() * 60;
      
      const grad = ctx.createRadialGradient(x, y, 0, x, y, craterRadius);
      grad.addColorStop(0, `rgba(0,0,0,${darkness / 255})`);
      grad.addColorStop(0.6, `rgba(0,0,0,${darkness / 400})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, craterRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);

  // Canvas texture for Bitcoin symbol - optimized for emissive material
  // White/bright areas will glow intensely, dark areas less so
  const btcSymbolTexture = useMemo(() => {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);

    const center = size / 2;
    const outerRadius = size * 0.48;
    const haloGradient = ctx.createRadialGradient(center, center, size * 0.05, center, center, outerRadius);
    haloGradient.addColorStop(0, 'rgba(255, 210, 120, 0.4)');
    haloGradient.addColorStop(0.4, 'rgba(255, 210, 120, 0.22)');
    haloGradient.addColorStop(1, 'rgba(255, 210, 120, 0.0)');
    ctx.fillStyle = haloGradient;
    ctx.beginPath();
    ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
    ctx.fill();

  // Draw bright Bitcoin symbol that will emit strongly
  const fontSize = Math.floor(size * 0.42);
  ctx.fillStyle = 'rgba(255, 155, 33, 0.78)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  ctx.font = `700 ${fontSize}px "Segoe UI", Arial, sans-serif`;
  ctx.lineWidth = Math.max(2, Math.floor(size * 0.004));
  ctx.strokeStyle = 'rgba(255, 196, 120, 0.85)';
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

  useEffect(() => {
    if (starMaterialRef.current && btcSymbolTexture) {
      starMaterialRef.current.uniforms.uSymbolMap.value = btcSymbolTexture;
  starMaterialRef.current.uniforms.uSymbolStrength.value = 0.65;
      btcSymbolTexture.needsUpdate = true;
    }
  }, [btcSymbolTexture]);

  // TwinklingStars logic moved to src/components/TwinklingStars.tsx

  // Atmospheric halo refs for pulsing animation
  const innerHaloRef = useRef<THREE.Mesh | null>(null);
  const outerHaloRef = useRef<THREE.Mesh | null>(null);
  
  // Create a procedural star field background (skybox sphere)
  const starFieldTexture = useMemo(() => {
    const size = 4096; // High resolution for quality
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Pure black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);
    
    // Add distant stars (small white dots)
    const starCount = 3000;
    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const starSize = Math.random() * 1.5 + 0.3;
      const brightness = Math.random() * 0.5 + 0.5;
      
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      ctx.beginPath();
      ctx.arc(x, y, starSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Some stars have a subtle glow
      if (Math.random() > 0.95) {
        const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, starSize * 3);
        glowGrad.addColorStop(0, `rgba(255, 255, 255, ${brightness * 0.3})`);
        glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(x, y, starSize * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Helper functions to draw different galaxy types
    const drawSpiralGalaxy = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, colors: string[]) => {
      // Core
      const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.2);
      coreGrad.addColorStop(0, colors[0] + 'dd');
      coreGrad.addColorStop(0.5, colors[0] + '66');
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
      
      // Spiral arms
      const rotation = Math.random() * Math.PI * 2;
      const armCount = 2 + Math.floor(Math.random() * 2); // 2-3 arms
      
      for (let arm = 0; arm < armCount; arm++) {
        const armOffset = (arm / armCount) * Math.PI * 2;
        for (let j = 0; j < 150; j++) {
          const t = j / 150;
          const angle = t * Math.PI * 3 + rotation + armOffset;
          const distance = t * size;
          const spread = (Math.random() - 0.5) * size * 0.2;
          
          const px = x + Math.cos(angle) * distance + Math.cos(angle + Math.PI / 2) * spread;
          const py = y + Math.sin(angle) * distance + Math.sin(angle + Math.PI / 2) * spread;
          
          const alpha = (1 - t) * (0.3 + Math.random() * 0.4);
          const particleSize = Math.random() * 1.5 + 0.5;
          
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)] + Math.floor(alpha * 255).toString(16).padStart(2, '0');
          ctx.beginPath();
          ctx.arc(px, py, particleSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    
    const drawBarredSpiralGalaxy = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, colors: string[]) => {
      // Central bar
      const barLength = size * 0.5;
      const barWidth = size * 0.15;
      const barAngle = Math.random() * Math.PI;
      
      for (let i = 0; i < 100; i++) {
        const t = (Math.random() - 0.5) * barLength;
        const spread = (Math.random() - 0.5) * barWidth;
        const px = x + Math.cos(barAngle) * t + Math.cos(barAngle + Math.PI / 2) * spread;
        const py = y + Math.sin(barAngle) * t + Math.sin(barAngle + Math.PI / 2) * spread;
        
        const alpha = 0.4 + Math.random() * 0.4;
        ctx.fillStyle = colors[0] + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(px, py, 1 + Math.random() * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Spiral arms starting from bar ends
      for (let side = 0; side < 2; side++) {
        const startX = x + Math.cos(barAngle + side * Math.PI) * barLength * 0.5;
        const startY = y + Math.sin(barAngle + side * Math.PI) * barLength * 0.5;
        
        for (let j = 0; j < 100; j++) {
          const t = j / 100;
          const angle = t * Math.PI * 2 + barAngle + side * Math.PI;
          const distance = t * size * 0.7;
          const spread = (Math.random() - 0.5) * size * 0.2;
          
          const px = startX + Math.cos(angle) * distance + Math.cos(angle + Math.PI / 2) * spread;
          const py = startY + Math.sin(angle) * distance + Math.sin(angle + Math.PI / 2) * spread;
          
          const alpha = (1 - t) * (0.3 + Math.random() * 0.3);
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)] + Math.floor(alpha * 255).toString(16).padStart(2, '0');
          ctx.beginPath();
          ctx.arc(px, py, Math.random() * 1.2 + 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Bright core
      const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.15);
      coreGrad.addColorStop(0, colors[0] + 'ff');
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.15, 0, Math.PI * 2);
      ctx.fill();
    };
    
    const drawEllipticalGalaxy = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, colors: string[]) => {
      const aspectRatio = 0.4 + Math.random() * 0.5; // Ellipticity
      const rotation = Math.random() * Math.PI;
      
      // Smooth elliptical distribution
      for (let i = 0; i < 200; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * size * 0.7;
        const ellipseX = r * Math.cos(angle);
        const ellipseY = r * Math.sin(angle) * aspectRatio;
        
        // Rotate
        const px = x + ellipseX * Math.cos(rotation) - ellipseY * Math.sin(rotation);
        const py = y + ellipseX * Math.sin(rotation) + ellipseY * Math.cos(rotation);
        
        const distFactor = r / (size * 0.7);
        const alpha = (1 - distFactor * 0.7) * (0.3 + Math.random() * 0.4);
        
        ctx.fillStyle = colors[0] + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(px, py, Math.random() * 1.5 + 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Bright core
      const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.25);
      coreGrad.addColorStop(0, colors[0] + 'ee');
      coreGrad.addColorStop(0.6, colors[0] + '44');
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.scale(1, aspectRatio);
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    
    const drawIrregularGalaxy = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, colors: string[]) => {
      // Chaotic, clumpy distribution
      const clumpCount = 3 + Math.floor(Math.random() * 4);
      
      for (let c = 0; c < clumpCount; c++) {
        const clumpAngle = Math.random() * Math.PI * 2;
        const clumpDist = Math.random() * size * 0.5;
        const clumpX = x + Math.cos(clumpAngle) * clumpDist;
        const clumpY = y + Math.sin(clumpAngle) * clumpDist;
        const clumpSize = size * (0.2 + Math.random() * 0.3);
        
        for (let i = 0; i < 50; i++) {
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * clumpSize;
          const px = clumpX + Math.cos(angle) * r;
          const py = clumpY + Math.sin(angle) * r;
          
          const alpha = (0.3 + Math.random() * 0.5) * (1 - r / clumpSize) * 0.8;
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)] + Math.floor(alpha * 255).toString(16).padStart(2, '0');
          ctx.beginPath();
          ctx.arc(px, py, Math.random() * 2 + 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    
    const drawLenticularGalaxy = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, colors: string[]) => {
      // Disk-like with prominent bulge, no spiral arms
      const rotation = Math.random() * Math.PI;
      const diskAspect = 0.25 + Math.random() * 0.15; // Very flat disk
      
      // Disk
      for (let i = 0; i < 150; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * size * 0.8;
        const diskX = r * Math.cos(angle);
        const diskY = r * Math.sin(angle) * diskAspect;
        
        const px = x + diskX * Math.cos(rotation) - diskY * Math.sin(rotation);
        const py = y + diskX * Math.sin(rotation) + diskY * Math.cos(rotation);
        
        const distFactor = r / (size * 0.8);
        const alpha = (1 - distFactor) * (0.2 + Math.random() * 0.3);
        
        ctx.fillStyle = colors[0] + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(px, py, Math.random() * 1 + 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Prominent central bulge
      const bulgeGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.3);
      bulgeGrad.addColorStop(0, colors[0] + 'ff');
      bulgeGrad.addColorStop(0.5, colors[0] + '88');
      bulgeGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = bulgeGrad;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    };
    
    const drawPeculiarGalaxy = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, colors: string[]) => {
      // Distorted/interacting galaxy with tidal tails
      const coreX = x;
      const coreY = y;
      
      // Main body (slightly elongated)
      for (let i = 0; i < 100; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * size * 0.5;
        const px = coreX + Math.cos(angle) * r * 1.3;
        const py = coreY + Math.sin(angle) * r * 0.7;
        
        const alpha = 0.3 + Math.random() * 0.4;
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)] + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(px, py, Math.random() * 1.5 + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Tidal tails (2 opposite directions)
      for (let tail = 0; tail < 2; tail++) {
        const tailAngle = Math.random() * Math.PI * 2;
        const direction = tail === 0 ? 1 : -1;
        
        for (let j = 0; j < 80; j++) {
          const t = j / 80;
          const distance = size * 0.3 + t * size * 1.2;
          const curve = Math.sin(t * Math.PI) * size * 0.3;
          
          const px = coreX + Math.cos(tailAngle) * distance * direction + Math.cos(tailAngle + Math.PI / 2) * curve;
          const py = coreY + Math.sin(tailAngle) * distance * direction + Math.sin(tailAngle + Math.PI / 2) * curve;
          
          const alpha = (1 - t) * (0.2 + Math.random() * 0.3);
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)] + Math.floor(alpha * 255).toString(16).padStart(2, '0');
          ctx.beginPath();
          ctx.arc(px, py, Math.random() * 1.2 + 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Bright disturbed core
      const coreGrad = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, size * 0.2);
      coreGrad.addColorStop(0, colors[0] + 'ff');
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(coreX, coreY, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    };
    
    // Add distant galaxies with Bitcoin colors and varied morphologies
    const galaxyCount = 30;
    const colorCombinations = [
      [BITCOIN_COLORS.orange, BITCOIN_COLORS.white],
      [BITCOIN_COLORS.blue, BITCOIN_COLORS.white],
      [BITCOIN_COLORS.green, BITCOIN_COLORS.orange],
      [BITCOIN_COLORS.orange, BITCOIN_COLORS.gray],
    ];
    
    const galaxyTypes = [
      drawSpiralGalaxy,
      drawBarredSpiralGalaxy,
      drawEllipticalGalaxy,
      drawIrregularGalaxy,
      drawLenticularGalaxy,
      drawPeculiarGalaxy,
    ];
    
    ctx.globalCompositeOperation = 'lighter';
    
    for (let i = 0; i < galaxyCount; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      
      // 15% chance of being a very large, prominent galaxy (closer to us)
      const isLargeGalaxy = Math.random() < 0.15;
      const galaxySize = isLargeGalaxy 
        ? 200 + Math.random() * 400  // Large galaxies: 200-600px
        : 50 + Math.random() * 150;   // Normal galaxies: 50-200px
      
      const colors = colorCombinations[Math.floor(Math.random() * colorCombinations.length)];
      const galaxyType = galaxyTypes[Math.floor(Math.random() * galaxyTypes.length)];
      
      galaxyType(ctx, x, y, galaxySize, colors);
    }
    
    ctx.globalCompositeOperation = 'source-over';
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
  
  // Floating particles system
  const particlesRef = useRef<THREE.Points | null>(null);
  const particlePositions = useMemo(() => {
    const particleCount = 1600; // denser field so zoomed-out view stays rich
    const positions = new Float32Array(particleCount * 3);
    const minRadius = radius * 3; // start a little away from the star glow
    const maxRadius = radius * 25; // extend far into space for wide zooms
    
    for (let i = 0; i < particleCount; i++) {
      // Random spherical distribution around the planet
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = minRadius + Math.random() * (maxRadius - minRadius);
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    
    return positions;
  }, [radius]);

  // Desired camera distance from the planet on initial load / when returning to planet.
  // Increased multiplier and minimum so the initial framing is noticeably further back.
  // If you'd like it even farther/closer, I can make this configurable or tweak these values.
  const desiredPlanetDistance = Math.max(20, (radius || 1.4) * 5.0);

  // On mount, ensure the camera isn't too close to the planet. If it is, move it back
  // along the current camera direction so the scene loads with a comfortable framing.
  useEffect(() => {
    if (!camera || initialCameraPositionedRef.current) return;
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
      initialCameraPositionedRef.current = true;
    } catch (err) {
      // ignore
    }
  }, [camera, desiredPlanetDistance, controlsRef, initialPosition]);

  // satellite
  // multiple satellites with randomized radius, distance and speed per page load
  const satRefs = useRef<Array<THREE.Group | null>>([]);
  const orbitLineRefs = useRef<Array<THREE.Line | null>>([]);
  const [hoveredSatId, setHoveredSatId] = useState<string | null>(null);
  const hoverClearTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userRingRefs = useRef<Array<THREE.Mesh | null>>([]);
  
  // Individual speed multipliers per satellite for hover slowdown effect
  const satelliteSpeedMultipliers = useRef<number[]>([]);
  // Per-satellite angle accumulators to avoid discontinuities when changing speed
  const satelliteAngles = useRef<number[]>([]);
  const pointerActiveRef = useRef(false);
  const orbitSeedCache = useRef<Map<string, OrbitSeed>>(new Map());
  const fallbackOrbitSeedsRef = useRef<OrbitSeed[]>([]);
  
    useEffect(() => {
      return () => {
        if (hoverClearTimeout.current) {
          clearTimeout(hoverClearTimeout.current);
          hoverClearTimeout.current = null;
        }
      };
    }, []);

  // create satellites based on provided users or generate random ones
  const satellites = useMemo(() => {
    const palette = getPaletteForColor(satelliteColor ?? DEFAULT_SATELLITE_COLOR);
    if (satelliteUsers && satelliteUsers.length > 0) {
      const activeIds = new Set<string>();
      const result = satelliteUsers.map((user, idx) => {
        const seedKey = user.id || `anon-${idx}`;
        activeIds.add(seedKey);

        let seed = orbitSeedCache.current.get(seedKey);
        if (!seed) {
          seed = createOrbitSeed(seedKey, idx);
          orbitSeedCache.current.set(seedKey, seed);
        }

        const orbitEuler = new THREE.Euler(seed.inclination, seed.orbitRotation, 0, "XYZ");

        return {
          size: radius * seed.sizeFactor,
          distance: radius * seed.distanceFactor,
          speed: seed.speed,
          phase: seed.phase,
          eccentricity: seed.eccentricity,
          verticalAmp: radius * seed.verticalAmpFactor,
          verticalFreq: seed.verticalFreq,
          orbitEuler,
          color: user.color || palette[idx % palette.length],
          user,
        };
      });

      orbitSeedCache.current.forEach((_, key) => {
        if (!activeIds.has(key)) {
          orbitSeedCache.current.delete(key);
        }
      });

      return result;
    } else {
      if (fallbackOrbitSeedsRef.current.length === 0) {
        const fallbackCount = 4;
        fallbackOrbitSeedsRef.current = Array.from({ length: fallbackCount }).map((_, idx) =>
          createOrbitSeed(`fallback-${idx}`, idx),
        );
      }

      return fallbackOrbitSeedsRef.current.map((seed, idx) => ({
        size: radius * seed.sizeFactor,
        distance: radius * seed.distanceFactor,
        speed: seed.speed,
        phase: seed.phase,
        eccentricity: seed.eccentricity,
        verticalAmp: radius * seed.verticalAmpFactor,
        verticalFreq: seed.verticalFreq,
        orbitEuler: new THREE.Euler(seed.inclination, seed.orbitRotation, 0, "XYZ"),
        color: palette[idx % palette.length],
        user: undefined,
      }));
    }
  }, [radius, satelliteUsers, satelliteColor]);

  useEffect(() => {
    pointerSlowStatesRef.current = satellites.map(() => false);
    pointerSlowCountRef.current = 0;
    const nextKeys = new Set<string>();
    satellites.forEach((sat, idx) => {
      const displayName = sat.user?.displayName?.toLowerCase() ?? "";
      const fallbackMatch = displayName.includes("your planet") || displayName.includes("tu planeta");
      const isUserPlanet = currentUserId ? sat.user?.id === currentUserId : fallbackMatch;
      if (isUserPlanet) {
        const key = sat.user?.id ?? `__user-${idx}`;
        nextKeys.add(key);
        if (userLabelVisibilityRef.current[key] === undefined) {
          userLabelVisibilityRef.current[key] = true;
        }
      }
    });
    setUserLabelVisibility((prev) => {
      const updated: Record<string, boolean> = { ...prev };
      Object.keys(updated).forEach((key) => {
        if (!nextKeys.has(key)) {
          delete updated[key];
          delete userLabelVisibilityRef.current[key];
        }
      });
      nextKeys.forEach((key) => {
        if (updated[key] === undefined) {
          updated[key] = true;
        }
      });
      return updated;
    });
  }, [satellites, currentUserId]);

  useEffect(() => {
    if (!gl || !camera) return;

    const element = gl.domElement as HTMLElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
  const hoverSphere = new THREE.Sphere(starCenterRef.current.clone(), Math.max(radius * 4.5, desiredPlanetDistance * 0.75));
  const interactionPlane = new THREE.Plane();
  const intersectionPoint = new THREE.Vector3();
  const satWorld = new THREE.Vector3();
  const planeNormal = new THREE.Vector3();

    const updateHoverSphere = () => {
      hoverSphere.center.copy(starCenterRef.current);
  hoverSphere.radius = Math.max(radius * 4.5, desiredPlanetDistance * 0.75);
    };

    const updatePointerSlowStates = (point: THREE.Vector3 | null) => {
      pointerSlowCountRef.current = 0;
      for (let i = 0; i < satellites.length; i += 1) {
        let inRange = false;
        const satGroup = satRefs.current[i];
        if (point && satGroup) {
          satGroup.getWorldPosition(satWorld);
          const slowRadius = Math.max(radius * 1.2, satellites[i]?.size ? satellites[i].size * 14 : radius * 1.2);
          if (satWorld.distanceTo(point) <= slowRadius) {
            inRange = true;
            pointerSlowCountRef.current += 1;
          }
        }
        pointerSlowStatesRef.current[i] = inRange;
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      updateHoverSphere();
      const rect = element.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      ndc.set(x, y);
      raycaster.setFromCamera(ndc, camera as THREE.Camera);

      let point: THREE.Vector3 | null = null;
      if (raycaster.ray.intersectSphere(hoverSphere, intersectionPoint)) {
        point = intersectionPoint;
      } else {
        planeNormal.copy(starCenterRef.current).sub(camera.position).normalize();
        if (planeNormal.lengthSq() > 0) {
          interactionPlane.setFromNormalAndCoplanarPoint(planeNormal, starCenterRef.current);
          if (raycaster.ray.intersectPlane(interactionPlane, intersectionPoint)) {
            point = intersectionPoint;
          }
        }
      }

      if (point) {
        pointerWorldRef.current.copy(point);
        pointerLightPositionRef.current.copy(point);
        pointerLightActiveRef.current = true;
      } else {
        pointerLightActiveRef.current = false;
      }
      updatePointerSlowStates(point ? pointerWorldRef.current : null);
    };

    const handlePointerLeave = () => {
      pointerLightActiveRef.current = false;
      updatePointerSlowStates(null);
    };

    element.addEventListener("pointermove", handlePointerMove, { passive: true });
    element.addEventListener("pointerleave", handlePointerLeave, { passive: true });

    return () => {
      element.removeEventListener("pointermove", handlePointerMove as any);
      element.removeEventListener("pointerleave", handlePointerLeave as any);
    };
  }, [gl, camera, radius, desiredPlanetDistance, satellites]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const baseUrl = "https://iqokybiidqksdrbqeitp.supabase.co/functions/v1/get-hello-table";

    const callEdgeFunction = async (queryParams?: Record<string, string>) => {
      const url = new URL(baseUrl);
      if (queryParams) {
        Object.entries(queryParams).forEach(([key, value]) => {
          if (typeof value === "string") {
            url.searchParams.set(key, value);
          }
        });
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (supabaseAnonKey) {
        headers.apikey = supabaseAnonKey;
        headers.Authorization = `Bearer ${supabaseAnonKey}`;
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers,
      });

      const raw = await response.text();
      let payload: unknown = raw;
      try {
        payload = raw ? JSON.parse(raw) : raw;
      } catch {
        payload = raw;
      }

      if (!response.ok) {
        const error: Error & { payload?: unknown } = new Error(
          `Edge function responded with ${response.status}`
        );
        error.payload = payload;
        console.error("[EdgeFunction] get-hello-table request failed", error);
        throw error;
      }

      console.info("[EdgeFunction] get-hello-table response", payload);
      return payload;
    };

    (window as any).callHelloEdgeFunction = callEdgeFunction;

    return () => {
      delete (window as any).callHelloEdgeFunction;
    };
  }, []);

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

    if (selectedSatelliteId === lastSelectedIdRef.current && selectedSatelliteId) {
      const index = satellites.findIndex((sat) => sat.user?.id === selectedSatelliteId);
      selectedSatelliteIndex.current = index;
      return;
    }

    if (!selectedSatelliteId) {
      if (lastSelectedIdRef.current) {
        lastSelectedIdRef.current = null;
        isAnimatingCamera.current = true;
        cameraAnimationProgress.current = 0;
        cameraStartPosition.current.copy(camera.position);
        cameraStartTarget.current.copy(controlsRef.current.target);
        selectedSatelliteIndex.current = -1;
        cameraOffsetRef.current.set(0, 0, 0);
        return;
      }
      selectedSatelliteIndex.current = -1;
      cameraOffsetRef.current.set(0, 0, 0);
      return;
    }

    lastSelectedIdRef.current = selectedSatelliteId;
    isAnimatingCamera.current = true;
    cameraAnimationProgress.current = 0;
    cameraStartPosition.current.copy(camera.position);
    cameraStartTarget.current.copy(controlsRef.current.target);

    const index = satellites.findIndex((sat) => sat.user?.id === selectedSatelliteId);
    selectedSatelliteIndex.current = index;

    if (index >= 0) {
      const satGroup = satRefs.current[index];
      const satData = satellites[index];

      hasPreFocusRef.current = true;
      preFocusCameraPositionRef.current.copy(camera.position);
      preFocusCameraTargetRef.current.copy(controlsRef.current.target);

      if (satGroup) {
        satGroup.getWorldPosition(tempVecA.current);
        cameraApproachDirectionRef.current.copy(camera.position).sub(tempVecA.current).normalize();
      } else {
        cameraApproachDirectionRef.current.copy(camera.position).sub(starCenterRef.current).normalize();
      }

      if (cameraApproachDirectionRef.current.lengthSq() < 1e-6) {
        cameraApproachDirectionRef.current.set(1.5, 0.8, 2.0).normalize();
      }

      const approachDistance = THREE.MathUtils.clamp(satData.size * 22, 2.5, 4.5);
      cameraApproachDistanceRef.current = approachDistance;
      cameraOffsetRef.current
        .copy(cameraApproachDirectionRef.current)
        .multiplyScalar(cameraApproachDistanceRef.current);
    }
  }, [selectedSatelliteId, camera, controlsRef, satellites]);

  // Clean up user ring refs when satellites change
  useEffect(() => {
    userRingRefs.current = [];
  }, [satellites]);

  // animate satellites
  const orbitTime = useRef(0);
  useFrame((state: any, delta: number) => {
    // Update star shader time uniform for animated turbulence
    if (starMaterialRef.current) {
      starMaterialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
    
    // regular orbit time for scene-level effects (glow, camera subtle motion)
  orbitTime.current += delta;
  pointerLightPulseRef.current += delta;

    // planet glow removed

    if (pointerLightRef.current) {
      const pulse = 1 + Math.sin(pointerLightPulseRef.current * 6) * 0.25;
      const targetIntensity = pointerLightActiveRef.current ? 1.1 * pulse : 0;
      pointerLightRef.current.intensity = THREE.MathUtils.lerp(
        pointerLightRef.current.intensity,
        targetIntensity,
        0.18,
      );
      pointerLightRef.current.position.lerp(pointerLightPositionRef.current, 0.24);
      const targetDistance = pointerLightActiveRef.current ? radius * 12 : radius * 4;
      pointerLightRef.current.distance = THREE.MathUtils.lerp(pointerLightRef.current.distance, targetDistance, 0.18);
    }

    // Subtle autonomous star rotation so the surface appears alive when idle
    if (meshRef.current && !pointerActiveRef.current) {
      meshRef.current.rotation.y += delta * 0.25;
      const tiltTarget = Math.sin(state.clock.elapsedTime * 0.12) * 0.12;
      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x,
        tiltTarget,
        0.04,
      );
    }

    // Keep the Bitcoin symbol gently facing the viewer on the star surface

    // Handle camera animation and tracking for selected satellite
    if (selectedSatelliteIndex.current >= 0 && controlsRef?.current) {
      const satGroup = satRefs.current[selectedSatelliteIndex.current];

      if (satGroup) {
        const satWorldPos = tempVecD.current;
        satGroup.getWorldPosition(satWorldPos);

        if (isAnimatingCamera.current) {
          const duration = 1.2;
          cameraAnimationProgress.current += delta / duration;
          if (cameraAnimationProgress.current >= 1) {
            cameraAnimationProgress.current = 1;
          }

          const t = 1 - Math.pow(1 - cameraAnimationProgress.current, 3);
          const targetCamPos = tempVecB.current
            .copy(satWorldPos)
            .add(tempVecC.current.copy(cameraOffsetRef.current));

          camera.position.lerpVectors(cameraStartPosition.current, targetCamPos, t);
          controlsRef.current.target.lerpVectors(cameraStartTarget.current, satWorldPos, t);
          controlsRef.current.update();

          if (cameraAnimationProgress.current >= 1) {
            isAnimatingCamera.current = false;
            cameraOffsetRef.current.copy(targetCamPos).sub(satWorldPos);
          }
        } else {
          const desiredCamPos = tempVecB.current
            .copy(satWorldPos)
            .add(tempVecC.current.copy(cameraOffsetRef.current));
          camera.position.lerp(desiredCamPos, 0.18);
          controlsRef.current.target.lerp(satWorldPos, 0.18);
          controlsRef.current.update();
        }
      }
    } else if (selectedSatelliteIndex.current === -1 && controlsRef?.current && isAnimatingCamera.current) {
      const duration = 1.2;
      cameraAnimationProgress.current += delta / duration;
      if (cameraAnimationProgress.current >= 1) {
        cameraAnimationProgress.current = 1;
      }

      const t = 1 - Math.pow(1 - cameraAnimationProgress.current, 3);
      const fallbackPosition = tempVecB.current
        .copy(starCenterRef.current)
        .add(tempVecC.current.set(0, 0, desiredPlanetDistance));
      const targetPosition = hasPreFocusRef.current ? preFocusCameraPositionRef.current : fallbackPosition;
      const targetLook = hasPreFocusRef.current ? preFocusCameraTargetRef.current : starCenterRef.current;

      camera.position.lerpVectors(cameraStartPosition.current, targetPosition, t);
      controlsRef.current.target.lerpVectors(cameraStartTarget.current, targetLook, t);
      controlsRef.current.update();

      if (cameraAnimationProgress.current >= 1) {
        isAnimatingCamera.current = false;
        if (hasPreFocusRef.current) {
          hasPreFocusRef.current = false;
        }
      }
    }

    // Animate floating particles - slow drift and rotation
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.02;
      particlesRef.current.rotation.x += delta * 0.01;
      
      // Subtle vertical wave motion
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        const originalY = positions[i + 1];
        positions[i + 1] = originalY + Math.sin(orbitTime.current * 0.3 + i * 0.1) * 0.002;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Ensure arrays are initialized and match satellite count
    if (satelliteSpeedMultipliers.current.length !== satellites.length) {
      satelliteSpeedMultipliers.current = satellites.map(() => 1.0);
    }
    if (satelliteAngles.current.length !== satellites.length) {
      satelliteAngles.current = satellites.map((s) => s.phase || 0);
    }

    const pointerSlowFlags = pointerSlowStatesRef.current;
    const pointerSlowCount = pointerSlowCountRef.current;

    // Update each satellite's angle incrementally to avoid discontinuities
    satellites.forEach((sat, i) => {
      const ref = satRefs.current[i];
      if (!ref) return;

      // Smooth speed transition for the hovered satellite only
      const hoverSpeedReduction = 0.25; // Reduce to 25% speed when hovering this satellite
      const isHovered = sat.user?.id === hoveredSatId;
      const isPointerClose = pointerSlowFlags[i] ?? false;
      let targetSpeed = 1.0;
      if (isPointerClose) {
        const pointerSlowFactor = pointerSlowCount > 1 ? 0.35 : 0.6;
        targetSpeed = Math.min(targetSpeed, pointerSlowFactor);
      }
      if (isHovered) {
        targetSpeed = Math.min(targetSpeed, hoverSpeedReduction);
      }
      satelliteSpeedMultipliers.current[i] = THREE.MathUtils.lerp(
        satelliteSpeedMultipliers.current[i],
        targetSpeed,
        0.12 // Smooth transition
      );

      // Apply user's custom orbit speed multiplier (from profile settings)
      const userSpeedMultiplier = sat.user?.orbitSpeedMultiplier ?? 1.0;

      // Increment the stored angle by delta * speed * multiplier * userSpeedMultiplier
      satelliteAngles.current[i] += delta * sat.speed * satelliteSpeedMultipliers.current[i] * userSpeedMultiplier;
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

      const displayName = sat.user?.displayName?.toLowerCase() ?? "";
      const fallbackMatch = displayName.includes("your planet") || displayName.includes("tu planeta");
      const isUserPlanet = currentUserId ? sat.user?.id === currentUserId : fallbackMatch;
      const userKey = sat.user?.id ?? `__user-${i}`;
      if (isUserPlanet) {
        const satWorldPos = tempVecD.current;
        ref.getWorldPosition(satWorldPos);

        const camPos = camera.position;
        const camToSat = tempVecA.current.copy(satWorldPos).sub(camPos);
        const camToSatLength = camToSat.length();
        let visible = true;

        if (camToSatLength > 1e-3) {
          const camToSatDir = tempVecB.current.copy(camToSat).divideScalar(camToSatLength);
          const camToStar = tempVecC.current.copy(starCenterRef.current).sub(camPos);
          const projectionLength = camToStar.dot(camToSatDir);

          if (projectionLength > 0 && projectionLength < camToSatLength) {
            const closestPoint = tempVecB.current
              .copy(camPos)
              .addScaledVector(camToSatDir, projectionLength);
            const distanceToStar = closestPoint.distanceTo(starCenterRef.current);
            const occlusionRadius = radius * 1.04;
            if (distanceToStar < occlusionRadius) {
              visible = false;
            }
          }
        }

        const prev = userLabelVisibilityRef.current[userKey];
        if (prev === undefined || prev !== visible) {
          userLabelVisibilityRef.current[userKey] = visible;
          setUserLabelVisibility((state) => {
            const next = { ...state, [userKey]: visible };
            return next;
          });
        }
      }
    });
    
    // Animate user planet indicator rings
    userRingRefs.current.forEach((ring) => {
      if (ring && ring.material) {
        const pulsate = 0.6 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
        (ring.material as THREE.MeshBasicMaterial).opacity = pulsate;
      }
    });
  });

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
      {/* Background Skybox - Sphere with star field and galaxies covering 360° */}
      <mesh>
        <sphereGeometry args={[radius * 200, 64, 64]} />
        <meshBasicMaterial 
          map={starFieldTexture} 
          side={THREE.BackSide}
          transparent={false}
          depthWrite={false}
        />
      </mesh>

      {/* Very low ambient light - creates strong contrast between lit and dark sides */}
      <ambientLight intensity={0.05} color="#0a0a1a" />
      <pointLight
        ref={pointerLightRef}
        color="#ffddaa"
        intensity={0}
        distance={radius * 4}
        decay={1.6}
      />
      
      {/* Remove external key/fill lights - the Bitcoin star is the primary light source */}
      
      {/* Bitcoin Star - Realistic animated star with shader-based turbulence */}
      <mesh
        ref={meshRef as any}
        position={initialPosition as any}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <sphereGeometry args={[radius, 256, 256]} />
        <primitive object={starMaterialRef.current} attach="material" />
      </mesh>

      {/* Real point light attached to the star - illuminates satellites with falloff */}
      <pointLight 
        position={initialPosition as any} 
        color="#f7931a"
        intensity={150}
        distance={0}
        decay={2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={100}
      />

      {/* Floating cosmic particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlePositions.length / 3}
            array={particlePositions}
            itemSize={3}
            args={[particlePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          color="#ffd699"
          transparent
          opacity={0.6}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Orbiting moons/satellites with orbit lines */}
      {satellites.map((sat, i) => {
        const displayName = sat.user?.displayName?.toLowerCase() ?? "";
        const fallbackMatch = displayName.includes("your planet") || displayName.includes("tu planeta");
        const isUserPlanet = currentUserId
          ? sat.user?.id === currentUserId
          : fallbackMatch;
        const userKey = sat.user?.id ?? `__user-${i}`;
        const labelVisible = userLabelVisibility[userKey] ?? true;
        return (
        <React.Fragment key={`sat-${i}`}>
          {/* Visible orbit line */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <ringGeometry args={[sat.distance - 0.01, sat.distance + 0.01, 128]} />
            <meshBasicMaterial
              color={sat.color}
              transparent
              opacity={hoveredSatId === sat.user?.id ? 0.5 : (isUserPlanet ? 0.4 : 0.2)}
              side={THREE.DoubleSide}
            />
          </mesh>
          
          {/* Moon/satellite */}
          <group
            ref={(el) => {
              satRefs.current[i] = el;
            }}
            onPointerEnter={(e) => {
              e.stopPropagation();
              if (hoverClearTimeout.current) {
                clearTimeout(hoverClearTimeout.current);
                hoverClearTimeout.current = null;
              }
              if (sat.user && hoveredSatId !== sat.user.id) {
                setHoveredSatId(sat.user.id);
                document.body.style.cursor = 'pointer';
              }
            }}
            onPointerLeave={(e) => {
              e.stopPropagation();
              if (sat.user?.id) {
                if (hoverClearTimeout.current) clearTimeout(hoverClearTimeout.current);
                hoverClearTimeout.current = setTimeout(() => {
                  setHoveredSatId((current) => {
                    if (current === sat.user?.id) {
                      document.body.style.cursor = 'auto';
                      return null;
                    }
                    return current;
                  });
                }, 120);
              }
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
            {/* Invisible collider to enlarge interaction area */}
            <mesh scale={[1.8, 1.8, 1.8]}>
              <sphereGeometry args={[sat.size, 32, 32]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
            </mesh>
            {/* Satellite sphere with realistic lighting - illuminated and dark sides */}
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[sat.size, 64, 64]} />
              <meshStandardMaterial 
                color={sat.color} 
                metalness={0.2} 
                roughness={0.7}
                // Reduced emissive for realistic lighting
                emissive={sat.color}
                emissiveIntensity={hoveredSatId === sat.user?.id ? 0.08 : 0.02}
              />
            </mesh>
            {/* Small subtle glow only when hovered */}
            {hoveredSatId === sat.user?.id && (
              <mesh scale={[1.15, 1.15, 1.15]}>
                <sphereGeometry args={[sat.size, 16, 16]} />
                <meshBasicMaterial
                  color={sat.color}
                  transparent
                  opacity={0.15}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
            )}
            
            {/* Indicator for user's own planet - pulsating ring */}
            {isUserPlanet && (
              <>
                <Html
                  position={[0, sat.size * 1.8, 0]}
                  center
                  sprite
                  distanceFactor={10}
                  zIndexRange={[5, 5]}
                  style={{
                    pointerEvents: "none",
                    visibility: labelVisible ? "visible" : "hidden",
                    opacity: labelVisible ? 1 : 0,
                    transition: "opacity 0.18s ease",
                    zIndex: 5,
                  }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="rounded-full bg-amber-400/90 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-900 shadow-lg">
                      You
                    </span>
                    <span className="h-4 w-0.5 rounded-full bg-amber-300/80" />
                  </div>
                </Html>
                <mesh 
                  rotation={[Math.PI / 2, 0, 0]}
                  ref={(el) => {
                    if (el && !userRingRefs.current.includes(el)) {
                      userRingRefs.current.push(el);
                    }
                  }}
                >
                  <ringGeometry args={[sat.size * 1.3, sat.size * 1.4, 32]} />
                  <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={0.6}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                  />
                </mesh>
                <mesh 
                  rotation={[0, 0, 0]}
                  ref={(el) => {
                    if (el && !userRingRefs.current.includes(el)) {
                      userRingRefs.current.push(el);
                    }
                  }}
                >
                  <ringGeometry args={[sat.size * 1.3, sat.size * 1.4, 32]} />
                  <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={0.6}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                  />
                </mesh>
              </>
            )}
          </group>
        </React.Fragment>
        );
      })}
    </>
  );
}
