"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Environment, Lightformer, Text, Stars, Text3D, Center } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
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
  onSceneReady?: () => void;
  isVideoActive?: boolean;
}

// Component that notifies when the scene has been rendered
function SceneReadyNotifier({ onReady }: { onReady?: () => void }) {
  const hasNotifiedRef = useRef(false);
  const frameCountRef = useRef(0);
  
  useFrame(() => {
    // Wait for 3 frames to ensure all geometries are loaded and rendered
    frameCountRef.current += 1;
    if (!hasNotifiedRef.current && frameCountRef.current >= 3 && onReady) {
      hasNotifiedRef.current = true;
      console.log('[SceneReadyNotifier] Notifying scene ready after', frameCountRef.current, 'frames');
      onReady();
    }
  });
  
  return null;
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


function FadingCircles({ visible = true }: { visible?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const visibilityRef = useRef(1);
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

    const circleCount = 8; // More circles to cover 360°
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

      // Posición aleatoria en 360° usando coordenadas esféricas
      const angle = Math.random() * Math.PI * 2; // 0 to 360°
      const distanceFromCenter = 30 + Math.random() * 15;
      const y = -12 + Math.random() * 8;
      const x = Math.cos(angle) * distanceFromCenter;
      const z = Math.sin(angle) * distanceFromCenter;

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

    // Smooth visibility factor for video transition
    const targetVis = visible ? 1 : 0;
    visibilityRef.current += (targetVis - visibilityRef.current) * 0.03;
    const visFactor = visibilityRef.current;

    circlesRef.current.forEach((circle) => {
      const material = circle.mesh.material as THREE.MeshBasicMaterial;

      // Hide mesh entirely when faded out
      circle.mesh.visible = visFactor > 0.001;

      // Make circle always face the camera (billboard effect)
      circle.mesh.quaternion.copy(camera.quaternion);

      switch (circle.phase) {
        case "waiting":
          if (time >= circle.waitUntil) {
            circle.phase = "fadeIn";
            circle.fadeInStart = time;
            // Reposition randomly when starting new cycle in 360 degrees
            const angle = Math.random() * Math.PI * 2;
            const distanceFromCenter = 30 + Math.random() * 15;
            const y = -12 + Math.random() * 8;
            circle.mesh.position.set(
              Math.cos(angle) * distanceFromCenter,
              y,
              Math.sin(angle) * distanceFromCenter
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
            material.opacity = 0.35 * visFactor;
            circle.phase = "visible";
            circle.fadeInStart = time; // Reuse for visible phase timing
          } else {
            material.opacity = fadeInProgress * 0.35 * visFactor;
          }
          break;
        }

        case "visible": {
          material.opacity = 0.35 * visFactor;
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
            material.opacity = (1 - fadeOutProgress) * 0.35 * visFactor;
          }
          break;
        }
      }
    });
  });

  return <group ref={groupRef} />;
}

function HorizontalBars({ visible = true }: { visible?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const visibilityRef = useRef(1);
  const barsRef = useRef<
    Array<{
      mesh: THREE.Mesh;
      fadeInStart: number;
      fadeInDuration: number;
      visibleDuration: number;
      fadeOutDuration: number;
      phase: "fadeIn" | "visible" | "fadeOut" | "waiting";
      waitUntil: number;
      speed: number;
    }>
  >([]);

  useEffect(() => {
    if (!groupRef.current) return;

    const barCount = 10;
    const bars: typeof barsRef.current = [];

    for (let i = 0; i < barCount; i++) {
      // Long, thin horizontal bars
      const width = 3 + Math.random() * 5;
      const height = 0.08 + Math.random() * 0.04;
      const geometry = new THREE.PlaneGeometry(width, height);
      
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff, // White bars
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);

      // Random initial position
      const angle = Math.random() * Math.PI * 2;
      const distanceFromCenter = 30 + Math.random() * 20;
      const y = -10 + Math.random() * 10;
      const x = Math.cos(angle) * distanceFromCenter;
      const z = Math.sin(angle) * distanceFromCenter;
      
      mesh.position.set(x, y, z);
      groupRef.current.add(mesh);

      bars.push({
        mesh,
        fadeInStart: Math.random() * 20,
        fadeInDuration: 1.5 + Math.random() * 1,
        visibleDuration: 3 + Math.random() * 4,
        fadeOutDuration: 1.5 + Math.random() * 1,
        phase: "waiting",
        waitUntil: Math.random() * 20,
        speed: (0.5 + Math.random() * 2) * (Math.random() > 0.5 ? 1 : -1), // Random speed and direction
      });
    }

    barsRef.current = bars;

    return () => {
      bars.forEach((bar) => {
        bar.mesh.geometry.dispose();
        (bar.mesh.material as THREE.Material).dispose();
        groupRef.current?.remove(bar.mesh);
      });
    };
  }, []);

  useFrame((state: { clock: { getElapsedTime: () => number }; camera: THREE.Camera }, delta: number) => {
    const time = state.clock.getElapsedTime();
    const camera = state.camera;

    const targetVis = visible ? 1 : 0;
    visibilityRef.current += (targetVis - visibilityRef.current) * 0.03;
    const visFactor = visibilityRef.current;

    barsRef.current.forEach((bar) => {
      const material = bar.mesh.material as THREE.MeshBasicMaterial;

      // Make bar always face the camera (billboard effect)
      bar.mesh.quaternion.copy(camera.quaternion);

      // Move along its own local X axis (horizontal relative to screen)
      // Since we just set the quaternion/rotation to match camera, "local X" is "screen X"
      // But we need to update position in world space to achieve this "slide"
      // We can use translateX, which works in local space
      if (bar.phase !== "waiting") {
        bar.mesh.translateX(bar.speed * delta);
      }

      bar.mesh.visible = visFactor > 0.001;

      switch (bar.phase) {
        case "waiting":
          if (time >= bar.waitUntil) {
            bar.phase = "fadeIn";
            bar.fadeInStart = time;
            
            // Random respawn position
            const angle = Math.random() * Math.PI * 2;
            const distance = 30 + Math.random() * 20;
            bar.mesh.position.set(
              Math.cos(angle) * distance,
              -10 + Math.random() * 10,
              Math.sin(angle) * distance
            );
          }
          break;

        case "fadeIn": {
          const progress = (time - bar.fadeInStart) / bar.fadeInDuration;
          if (progress >= 1) {
            material.opacity = 0.35 * visFactor;
            bar.phase = "visible";
            bar.fadeInStart = time;
          } else {
            material.opacity = progress * 0.35 * visFactor;
          }
          break;
        }

        case "visible": {
          material.opacity = 0.35 * visFactor;
          const progress = time - bar.fadeInStart;
          if (progress >= bar.visibleDuration) {
            bar.phase = "fadeOut";
            bar.fadeInStart = time;
          }
          break;
        }

        case "fadeOut": {
          const progress = (time - bar.fadeInStart) / bar.fadeOutDuration;
          if (progress >= 1) {
            material.opacity = 0;
            bar.phase = "waiting";
            bar.waitUntil = time + 5 + Math.random() * 10;
          } else {
            material.opacity = (1 - progress) * 0.35 * visFactor;
          }
          break;
        }
      }
    });
  });

  return <group ref={groupRef} />;
}

// Bird flock component - elegant white pixel birds that appear during daytime
const BIRD_FLOCK_INTERVAL = 15 * 60; // 15 minutes in seconds

function BirdFlock({ isDay }: { isDay: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const birdsRef = useRef<THREE.Points | null>(null);
  const flockStateRef = useRef<{
    active: boolean;
    startTime: number;
    lastSpawnTime: number;
    positions: Float32Array;
    velocities: { x: number; y: number; z: number }[];
    direction: number; // 1 = left to right, -1 = right to left
  }>({
    active: false,
    startTime: 0,
    lastSpawnTime: -BIRD_FLOCK_INTERVAL, // Allow first flock to appear soon
    positions: new Float32Array(0),
    velocities: [],
    direction: 1,
  });

  useEffect(() => {
    if (!groupRef.current) return;

    // Create birds geometry
    const birdCount = 12 + Math.floor(Math.random() * 8); // 12-20 birds per flock
    const positions = new Float32Array(birdCount * 3);
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    points.visible = false;
    groupRef.current.add(points);
    birdsRef.current = points;

    flockStateRef.current.positions = positions;

    return () => {
      geometry.dispose();
      material.dispose();
      if (groupRef.current && points) {
        groupRef.current.remove(points);
      }
    };
  }, []);

  useFrame((state: { clock: { getElapsedTime: () => number } }) => {
    const time = state.clock.getElapsedTime();
    const flock = flockStateRef.current;
    const birds = birdsRef.current;
    
    if (!birds || !isDay) {
      if (birds) {
        birds.visible = false;
        (birds.material as THREE.PointsMaterial).opacity = 0;
      }
      flock.active = false;
      return;
    }

    // Check if it's time to spawn a new flock
    if (!flock.active && time - flock.lastSpawnTime >= BIRD_FLOCK_INTERVAL) {
      // Initialize a new flock
      flock.active = true;
      flock.startTime = time;
      flock.lastSpawnTime = time;
      flock.direction = Math.random() > 0.5 ? 1 : -1;
      
      const birdCount = flock.positions.length / 3;
      flock.velocities = [];
      
      // Starting position - top of screen, either left or right edge
      const startX = flock.direction === 1 ? -45 : 45;
      const baseY = 12 + Math.random() * 4; // High in the sky
      const baseZ = -15 - Math.random() * 10;
      
      // Create V-formation or scattered formation
      const isVFormation = Math.random() > 0.3;
      
      for (let i = 0; i < birdCount; i++) {
        let x, y, z;
        
        if (isVFormation) {
          // V-formation
          const side = i % 2 === 0 ? 1 : -1;
          const depth = Math.floor(i / 2);
          x = startX + depth * 0.8 * -flock.direction;
          y = baseY - depth * 0.3 + side * depth * 0.4;
          z = baseZ + depth * 0.5;
        } else {
          // Scattered flock
          x = startX + (Math.random() - 0.5) * 6;
          y = baseY + (Math.random() - 0.5) * 3;
          z = baseZ + (Math.random() - 0.5) * 4;
        }
        
        flock.positions[i * 3] = x;
        flock.positions[i * 3 + 1] = y;
        flock.positions[i * 3 + 2] = z;
        
        // Individual bird velocity variations
        flock.velocities.push({
          x: (0.08 + Math.random() * 0.02) * flock.direction,
          y: (Math.random() - 0.5) * 0.005, // Slight vertical movement
          z: (Math.random() - 0.5) * 0.002,
        });
      }
      
      birds.visible = true;
      (birds.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    if (flock.active) {
      const elapsed = time - flock.startTime;
      const birdCount = flock.positions.length / 3;
      
      // Fade in during first 2 seconds
      const fadeIn = Math.min(elapsed / 2, 1);
      // Fade out during last 2 seconds (total journey ~25 seconds)
      const fadeOut = elapsed > 23 ? Math.max(0, 1 - (elapsed - 23) / 2) : 1;
      (birds.material as THREE.PointsMaterial).opacity = 0.8 * fadeIn * fadeOut;
      
      // Update bird positions
      for (let i = 0; i < birdCount; i++) {
        const vel = flock.velocities[i];
        flock.positions[i * 3] += vel.x;
        flock.positions[i * 3 + 1] += vel.y + Math.sin(time * 2 + i) * 0.003; // Gentle bobbing
        flock.positions[i * 3 + 2] += vel.z;
      }
      
      (birds.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      
      // Check if flock has crossed the screen (finished)
      const leaderX = flock.positions[0];
      if ((flock.direction === 1 && leaderX > 50) || (flock.direction === -1 && leaderX < -50)) {
        flock.active = false;
        birds.visible = false;
      }
    }
  });

  return <group ref={groupRef} />;
}

// Soft clouds component - appears during daytime
function SoftClouds({ isDay }: { isDay: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<
    Array<{
      mesh: THREE.Mesh;
      baseX: number;
      speed: number;
      y: number;
      z: number;
      scale: number;
    }>
  >([]);

  useEffect(() => {
    if (!groupRef.current) return;

    const cloudCount = 6;
    const clouds: typeof cloudsRef.current = [];

    for (let i = 0; i < cloudCount; i++) {
      // Create cloud using multiple overlapping spheres for soft look
      const cloudGroup = new THREE.Group();
      
      // Main cloud shape - multiple soft spheres
      const sphereCount = 4 + Math.floor(Math.random() * 3);
      for (let j = 0; j < sphereCount; j++) {
        const geometry = new THREE.SphereGeometry(1.5 + Math.random() * 1, 16, 12);
        const material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0,
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(
          (j - sphereCount / 2) * 1.2 + (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.5
        );
        sphere.scale.set(
          1 + Math.random() * 0.3,
          0.5 + Math.random() * 0.2,
          0.6 + Math.random() * 0.2
        );
        cloudGroup.add(sphere);
      }

      // Distribute clouds in 360° using angle
      const angle = Math.random() * Math.PI * 2;
      const distanceFromCenter = 40 + Math.random() * 20;
      const x = Math.cos(angle) * distanceFromCenter;
      const y = 14 + Math.random() * 6;
      const z = Math.sin(angle) * distanceFromCenter;
      const scale = 0.8 + Math.random() * 0.6;
      const angularSpeed = (0.0001 + Math.random() * 0.00015) * (Math.random() > 0.5 ? 1 : -1);

      cloudGroup.position.set(x, y, z);
      cloudGroup.scale.setScalar(scale);
      groupRef.current.add(cloudGroup);

      clouds.push({
        mesh: cloudGroup as unknown as THREE.Mesh,
        baseX: angle, // Now stores angle instead of x
        speed: angularSpeed, // Now angular speed
        y,
        z: distanceFromCenter, // Now stores radius
        scale,
      });
    }

    cloudsRef.current = clouds;

    return () => {
      clouds.forEach((cloud) => {
        cloud.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
          }
        });
        groupRef.current?.remove(cloud.mesh);
      });
    };
  }, []);

  useFrame((state: { clock: { getElapsedTime: () => number } }) => {
    const time = state.clock.getElapsedTime();

    cloudsRef.current.forEach((cloud) => {
      // Move cloud in circular path (baseX is angle, z is radius)
      cloud.baseX += cloud.speed; // Update angle
      const radius = cloud.z;
      cloud.mesh.position.x = Math.cos(cloud.baseX) * radius;
      cloud.mesh.position.z = Math.sin(cloud.baseX) * radius;

      // Update opacity based on isDay
      const targetOpacity = isDay ? 0.25 : 0;
      cloud.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshBasicMaterial;
          material.opacity += (targetOpacity - material.opacity) * 0.02;
        }
      });
    });
  });

  return <group ref={groupRef} />;
}

// Shooting stars component - appears during nighttime
const SHOOTING_STAR_MIN_INTERVAL = 120; // 2 minutes
const SHOOTING_STAR_MAX_INTERVAL = 180; // 3 minutes

function ShootingStars({ isNight }: { isNight: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const starRef = useRef<{
    mesh: THREE.Mesh | null;
    trail: THREE.Line | null;
    active: boolean;
    startTime: number;
    nextSpawnTime: number;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    duration: number;
  }>({
    mesh: null,
    trail: null,
    active: false,
    startTime: 0,
    nextSpawnTime: 30, // First star after 30 seconds
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    duration: 1.5,
  });

  useEffect(() => {
    if (!groupRef.current) return;

    // Create shooting star mesh (small bright sphere)
    const starGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const starMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
    });
    const starMesh = new THREE.Mesh(starGeometry, starMaterial);
    starMesh.visible = false;
    groupRef.current.add(starMesh);
    starRef.current.mesh = starMesh;

    // Create trail
    const trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(30 * 3); // 30 points for trail
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
    });
    const trail = new THREE.Line(trailGeometry, trailMaterial);
    trail.visible = false;
    groupRef.current.add(trail);
    starRef.current.trail = trail;

    return () => {
      starGeometry.dispose();
      starMaterial.dispose();
      trailGeometry.dispose();
      trailMaterial.dispose();
      if (groupRef.current) {
        groupRef.current.remove(starMesh);
        groupRef.current.remove(trail);
      }
    };
  }, []);

  useFrame((state: { clock: { getElapsedTime: () => number } }) => {
    const time = state.clock.getElapsedTime();
    const star = starRef.current;

    if (!star.mesh || !star.trail || !isNight) {
      if (star.mesh) {
        star.mesh.visible = false;
        (star.mesh.material as THREE.MeshBasicMaterial).opacity = 0;
      }
      if (star.trail) {
        star.trail.visible = false;
      }
      star.active = false;
      return;
    }

    // Check if it's time to spawn a new shooting star
    if (!star.active && time >= star.nextSpawnTime) {
      star.active = true;
      star.startTime = time;
      star.duration = 1 + Math.random() * 0.8;
      
      // Random start position in upper part of sky - 360° distribution
      const horizontalAngle = Math.random() * Math.PI * 2; // 0 to 360°
      const skyRadius = 30 + Math.random() * 15;
      const startX = Math.cos(horizontalAngle) * skyRadius;
      const startY = 15 + Math.random() * 10;
      const startZ = Math.sin(horizontalAngle) * skyRadius;
      
      // Direction: diagonal downward toward center
      const fallAngle = (Math.PI / 6) + Math.random() * (Math.PI / 4); // 30-75 degrees
      const distance = 15 + Math.random() * 10;
      // Fall direction is toward the center with some randomness
      const fallDirection = horizontalAngle + Math.PI + (Math.random() - 0.5) * 0.5;
      
      star.startPos.set(startX, startY, startZ);
      star.endPos.set(
        startX + Math.cos(fallDirection) * Math.cos(fallAngle) * distance,
        startY - Math.sin(fallAngle) * distance,
        startZ + Math.sin(fallDirection) * Math.cos(fallAngle) * distance
      );
      
      star.mesh.visible = true;
      star.trail.visible = true;
      
      // Schedule next shooting star
      star.nextSpawnTime = time + SHOOTING_STAR_MIN_INTERVAL + 
        Math.random() * (SHOOTING_STAR_MAX_INTERVAL - SHOOTING_STAR_MIN_INTERVAL);
    }

    if (star.active) {
      const elapsed = time - star.startTime;
      const progress = Math.min(elapsed / star.duration, 1);
      
      // Easing for smooth movement
      const eased = 1 - Math.pow(1 - progress, 2);
      
      // Update star position
      star.mesh.position.lerpVectors(star.startPos, star.endPos, eased);
      
      // Fade in quickly, stay bright, fade out at end
      let opacity = 1;
      if (progress < 0.1) {
        opacity = progress / 0.1;
      } else if (progress > 0.7) {
        opacity = (1 - progress) / 0.3;
      }
      (star.mesh.material as THREE.MeshBasicMaterial).opacity = opacity * 0.9;
      (star.trail.material as THREE.LineBasicMaterial).opacity = opacity * 0.6;
      
      // Update trail
      const trailPositions = star.trail.geometry.attributes.position as THREE.BufferAttribute;
      const trailLength = 30;
      for (let i = 0; i < trailLength; i++) {
        const t = Math.max(0, eased - (i / trailLength) * 0.15);
        const pos = new THREE.Vector3().lerpVectors(star.startPos, star.endPos, t);
        trailPositions.setXYZ(i, pos.x, pos.y, pos.z);
      }
      trailPositions.needsUpdate = true;
      
      // End animation
      if (progress >= 1) {
        star.active = false;
        star.mesh.visible = false;
        star.trail.visible = false;
      }
    }
  });

  return <group ref={groupRef} />;
}

// Star dust particles - night only, wide orbit around the USDC sphere
function StarDust({ isNight }: { isNight: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const velocitiesRef = useRef<{ angular: number; radius: number }[]>([]);

  useEffect(() => {
    if (!groupRef.current) return;

    const particleCount = 350;
    const positions = new Float32Array(particleCount * 3);
    const velocities: { angular: number; radius: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 18 + Math.random() * 62;
      const y = -20 + Math.random() * 50;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      velocities.push({
        angular: (Math.random() - 0.5) * 0.002,
        radius,
      });
    }

    velocitiesRef.current = velocities;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    groupRef.current.add(particles);
    particlesRef.current = particles;

    return () => {
      geometry.dispose();
      material.dispose();
      if (groupRef.current && particles) {
        groupRef.current.remove(particles);
      }
    };
  }, []);

  useFrame((state: { clock: { getElapsedTime: () => number } }) => {
    const particles = particlesRef.current;
    if (!particles) return;

    const material = particles.material as THREE.PointsMaterial;
    const positions = particles.geometry.attributes.position as THREE.BufferAttribute;
    const velocities = velocitiesRef.current;
    const time = state.clock.getElapsedTime();

    const targetOpacity = isNight ? 0.55 : 0;
    material.opacity += (targetOpacity - material.opacity) * 0.03;

    for (let i = 0; i < velocities.length; i++) {
      const { angular, radius } = velocities[i];
      const baseIndex = i * 3;
      const currentX = positions.array[baseIndex];
      const currentZ = positions.array[baseIndex + 2];
      let angle = Math.atan2(currentZ, currentX);
      angle += angular + Math.sin(time * 0.4 + i) * 0.0006;
      positions.array[baseIndex] = Math.cos(angle) * radius;
      positions.array[baseIndex + 2] = Math.sin(angle) * radius;
      positions.array[baseIndex + 1] += Math.sin(time * 0.6 + i) * 0.002;
    }

    positions.needsUpdate = true;
  });

  return <group ref={groupRef} />;
}

// Golden dust particles - appears especially during sunset
function GoldenDust({ starOpacity }: { starOpacity: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const velocitiesRef = useRef<{ x: number; y: number; z: number }[]>([]);
  
  // Sunset is when starOpacity is between 0.1 and 0.5 (transitioning)
  const isSunset = starOpacity > 0 && starOpacity < 0.5;
  const targetOpacity = isSunset ? 0.6 : 0;

  useEffect(() => {
    if (!groupRef.current) return;

    const particleCount = 80;
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      // Spread particles across the scene in 360° using cylindrical coordinates
      const angle = Math.random() * Math.PI * 2;
      const radius = 10 + Math.random() * 35;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = -5 + Math.random() * 25;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      sizes[i] = 0.08 + Math.random() * 0.12;
      
      // Angular velocity for circular motion
      const angularVel = (Math.random() - 0.5) * 0.002;
      velocities.push({
        x: angularVel, // Now represents angular velocity
        y: 0.005 + Math.random() * 0.01, // Slowly rising
        z: radius, // Store initial radius
      });
    }

    velocitiesRef.current = velocities;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0xffd700, // Gold color
      size: 0.1,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    groupRef.current.add(particles);
    particlesRef.current = particles;

    return () => {
      geometry.dispose();
      material.dispose();
      if (groupRef.current && particles) {
        groupRef.current.remove(particles);
      }
    };
  }, []);

  useFrame((state: { clock: { getElapsedTime: () => number } }) => {
    const time = state.clock.getElapsedTime();
    const particles = particlesRef.current;

    if (!particles) return;

    const material = particles.material as THREE.PointsMaterial;
    const positions = particles.geometry.attributes.position as THREE.BufferAttribute;
    const velocities = velocitiesRef.current;

    // Smooth opacity transition
    material.opacity += (targetOpacity - material.opacity) * 0.02;

    // Update particle positions in circular motion
    for (let i = 0; i < velocities.length; i++) {
      const vel = velocities[i];
      const radius = vel.z; // Stored radius
      
      // Calculate current angle from position
      const currentX = positions.array[i * 3];
      const currentZ = positions.array[i * 3 + 2];
      let currentAngle = Math.atan2(currentZ, currentX);
      
      // Add angular velocity plus gentle floating motion
      currentAngle += vel.x + Math.sin(time * 0.5 + i) * 0.001;
      positions.array[i * 3] = Math.cos(currentAngle) * radius;
      positions.array[i * 3 + 2] = Math.sin(currentAngle) * radius;
      positions.array[i * 3 + 1] += vel.y + Math.sin(time * 0.3 + i * 0.5) * 0.003;

      // Wrap particles that go too high
      if (positions.array[i * 3 + 1] > 25) {
        positions.array[i * 3 + 1] = -5;
        // Reset to new random angle
        const newAngle = Math.random() * Math.PI * 2;
        positions.array[i * 3] = Math.cos(newAngle) * radius;
        positions.array[i * 3 + 2] = Math.sin(newAngle) * radius;
      }
    }

    positions.needsUpdate = true;
    
    // Shimmer effect - vary size slightly
    material.size = 0.1 + Math.sin(time * 2) * 0.02;
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
  isNight,
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
  isNight: boolean;
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

  const isHeart = participant.polygonAddress.toLowerCase() === SPECIAL_HEART_ADDRESS.toLowerCase();

  useFrame((state: { clock: { getElapsedTime: () => number } }) => {
    if (!groupRef.current || !meshRef.current) return;

    const time = state.clock.getElapsedTime();
    const elapsed = time - startTime.current;

    // Animación de flotación (en el grupo contenedor)
    const floatOffset = Math.sin(elapsed / duration * Math.PI * 2) * 0.5;
    groupRef.current.position.y = position[1] + floatOffset;

    // Animación de rotación (tumble) (solo en la malla)
    // Para el corazón, limitamos la rotación en X para que no se voltee completamente
    if (isHeart) {
      // El corazón tiene una rotación base de Math.PI en X para estar derecho
      // Añadimos balanceo suave encima de esa base
      meshRef.current.rotation.x = Math.PI + Math.sin(elapsed * 0.3) * 0.26; // Base + balanceo ~15°
      meshRef.current.rotation.y = elapsed * 0.15; // Giro sobre sí mismo
      meshRef.current.rotation.z = Math.sin(elapsed * 0.2) * 0.17; // ~10 grados balanceo lateral
    } else {
      meshRef.current.rotation.x = elapsed * 0.2;
      meshRef.current.rotation.y = elapsed * 0.15;
    }
  });

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
          emissive={color}
          emissiveIntensity={(isHovered ? 0.8 : 0.35) * (isNight ? 1 : 0.8)}
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

function CentralCoin({ isNight, isVideoActive, mouseNDCRef }: {
  isNight: boolean;
  isVideoActive?: boolean;
  mouseNDCRef?: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const spinRef = useRef<THREE.Group>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const worldTargetRef = useRef(new THREE.Vector3());
  const worldPosRef = useRef(new THREE.Vector3());
  const toTargetWorldRef = useRef(new THREE.Vector3());
  const toTargetLocalRef = useRef(new THREE.Vector3());
  const smoothedLocalDirRef = useRef(new THREE.Vector3(0, 0, 1));
  const parentWorldQuatRef = useRef(new THREE.Quaternion());
  const currentQuatRef = useRef(new THREE.Quaternion());
  const targetFrontQuatRef = useRef(new THREE.Quaternion());
  const targetBackQuatRef = useRef(new THREE.Quaternion());
  const tmpNdcRef = useRef(new THREE.Vector2());
  const smoothedNdcRef = useRef(new THREE.Vector2());
  const activeFaceRef = useRef<1 | -1>(1);
  const AXIS_FRONT = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const AXIS_BACK = useMemo(() => new THREE.Vector3(0, 0, -1), []);

  useFrame((state: { camera: THREE.Camera }, delta: number) => {
    if (spinRef.current) {
      if (isVideoActive && mouseNDCRef) {
        // Raycast from camera through cursor; rotate coin so either +Z or -Z logo faces that 3D ray.
        const ndcFollow = 1 - Math.exp(-18 * delta);
        smoothedNdcRef.current.x += (mouseNDCRef.current.x - smoothedNdcRef.current.x) * ndcFollow;
        smoothedNdcRef.current.y += (mouseNDCRef.current.y - smoothedNdcRef.current.y) * ndcFollow;
        tmpNdcRef.current.copy(smoothedNdcRef.current);
        raycasterRef.current.setFromCamera(tmpNdcRef.current, state.camera);

        // Use a point on the cursor ray far enough from the sphere center for stable direction.
        worldTargetRef.current
          .copy(raycasterRef.current.ray.origin)
          .addScaledVector(raycasterRef.current.ray.direction, 30);

        spinRef.current.getWorldPosition(worldPosRef.current);
        toTargetWorldRef.current
          .subVectors(worldTargetRef.current, worldPosRef.current)
          .normalize();

        const parent = spinRef.current.parent;
        if (parent) {
          parent.getWorldQuaternion(parentWorldQuatRef.current);
          parentWorldQuatRef.current.invert();
          toTargetLocalRef.current
            .copy(toTargetWorldRef.current)
            .applyQuaternion(parentWorldQuatRef.current)
            .normalize();
        } else {
          toTargetLocalRef.current.copy(toTargetWorldRef.current);
        }

        // Additional smoothing in 3D direction space to remove tiny orientation jitter.
        const dirFollow = 1 - Math.exp(-22 * delta);
        smoothedLocalDirRef.current
          .lerp(toTargetLocalRef.current, dirFollow)
          .normalize();

        targetFrontQuatRef.current.setFromUnitVectors(AXIS_FRONT, smoothedLocalDirRef.current);
        targetBackQuatRef.current.setFromUnitVectors(AXIS_BACK, smoothedLocalDirRef.current);

        const currentQuat = spinRef.current.quaternion;
        currentQuatRef.current.copy(currentQuat);
        const angleToFront = currentQuatRef.current.angleTo(targetFrontQuatRef.current);
        const angleToBack = currentQuatRef.current.angleTo(targetBackQuatRef.current);
        const switchHysteresis = 0.22;
        if (activeFaceRef.current === 1) {
          if (angleToBack + switchHysteresis < angleToFront) activeFaceRef.current = -1;
        } else if (angleToFront + switchHysteresis < angleToBack) {
          activeFaceRef.current = 1;
        }
        const selectedTarget = activeFaceRef.current === 1 ? targetFrontQuatRef.current : targetBackQuatRef.current;

        const angleToTarget = currentQuat.angleTo(selectedTarget);
        if (angleToTarget > 1e-4) {
          const maxAngularSpeed = 9; // rad/s
          currentQuat.rotateTowards(selectedTarget, maxAngularSpeed * delta);
        }
      } else {
        // Sky Scene: spin slowly and reset X tilt
        spinRef.current.rotation.y += delta * 0.2;
        spinRef.current.rotation.x *= 0.95;
        activeFaceRef.current = 1;
        smoothedLocalDirRef.current.set(0, 0, 1);
      }
    }
  });

  const arcLength = Math.PI - 0.6;
  const blueColor = "#5CA0F2"; // Even lighter blue
  const neonWhite = "#ffffff";
  const neonBase = "#f5f8ff";
  const neonScale = isNight ? 1 : 0.85;

  // Shared neon materials for the logo parts
  const logoMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: neonBase,
    roughness: 0.18,
    metalness: 0.2,
    emissive: neonWhite,
    emissiveIntensity: 1.8 * neonScale,
  }), [neonScale]);

  const ringMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: neonBase,
    roughness: 0.18,
    metalness: 0.2,
    emissive: neonWhite,
    emissiveIntensity: 1.8 * neonScale,
  }), [neonScale]);

  return (
    <group position={[0, 0, 0]} rotation={[0.2, 0, 0.1]}>
      {/* Blue light emanating from the USDC sphere */}
      <pointLight 
        position={[0, 0, 0]} 
        color="#5CA0F2" 
        intensity={1 * neonScale} 
        distance={40} 
        decay={2} 
      />
      
      <group ref={spinRef}>
        {/* Sphere Body */}
        <mesh>
          <sphereGeometry args={[4, 64, 64]} />
          <meshStandardMaterial 
            color={blueColor} 
            metalness={0.1} 
            roughness={0.5}
            emissive="#2671c4"
            emissiveIntensity={1.2 * neonScale}
          />
        </mesh>
        
        {/* Front Face Detail */}
        <group>
          {/* Broken Ring - Right Segment */}
          <mesh position={[0, 0, 3.5]} rotation={[0, 0, -arcLength / 2]} material={ringMaterial}>
            <torusGeometry args={[2.2, 0.15, 16, 64, arcLength]} />
          </mesh>
          {/* Broken Ring - Left Segment */}
          <mesh position={[0, 0, 3.5]} rotation={[0, 0, Math.PI - arcLength / 2]} material={ringMaterial}>
            <torusGeometry args={[2.2, 0.15, 16, 64, arcLength]} />
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
          <mesh position={[0, 0, 3.5]} rotation={[0, 0, -arcLength / 2]} material={ringMaterial}>
            <torusGeometry args={[2.2, 0.15, 16, 64, arcLength]} />
          </mesh>
          {/* Broken Ring - Left Segment */}
          <mesh position={[0, 0, 3.5]} rotation={[0, 0, Math.PI - arcLength / 2]} material={ringMaterial}>
            <torusGeometry args={[2.2, 0.15, 16, 64, arcLength]} />
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
  onSceneReady,
  lightColor,
  lightIntensity,
  ambientIntensity,
  isNight,
  isDay,
  starOpacity,
  isVideoActive
}: InteractiveOrbs3DProps & {
  lightColor: string;
  lightIntensity: number;
  ambientIntensity: number;
  isNight: boolean;
  isDay: boolean;
  starOpacity: number;
  isVideoActive?: boolean;
}) {
  const controlsRef = useRef<any>(null);
  const idleRef = useRef({ lastInteraction: Date.now(), isIdle: false });
  const IDLE_TIMEOUT_MS = 30_000; // 30 seconds
  const IDLE_ROTATION_SPEED = 0.02; // radians per second (very slow)
  const orbitGroupRef = useRef<THREE.Group>(null);
  const mainGroupRef = useRef<THREE.Group>(null);

  // WASD/Arrow keys movement state with velocity
  const movementRef = useRef({ x: 0, y: 0, z: 0 });
  const velocityRef = useRef({ x: 0, y: 0, z: 0 });
  const keysPressed = useRef<Set<string>>(new Set());
  const MOVE_SPEED = 0.15; // Target speed
  const ACCELERATION = 0.025; // How quickly we accelerate (increased for quicker response)
  const DECELERATION = 0.88; // Damping factor (0-1, lower = more friction, reduced for quicker stop)
  const MAX_OFFSET = 50; // Horizontal movement range for WASD
  const MAX_OFFSET_Y = 27; // Vertical movement range (tighter to keep figures on screen)

  // Smooth zoom state
  const zoomDistanceRef = useRef(35); // Current camera distance (matches initial camera position z=35)
  const zoomTargetRef = useRef(35);
  const ZOOM_MIN = 22;
  const ZOOM_MAX = 90;
  const ZOOM_LERP_SPEED = 0.08; // Smoothing factor
  const ZOOM_STEP = 2.5; // Distance change per scroll tick

  // Sphere rotation shared constants
  const mouseButtonsRef = useRef<Set<number>>(new Set());
  const SPHERE_ROT_ACCEL = 0.04; // Acceleration factor
  const SPHERE_ROT_DECEL = 0.92; // Damping when no button pressed

  // Mouse drag rotation (left-click + drag)
  const isDraggingRef = useRef(false);
  const mouseDragDeltaRef = useRef({ x: 0, y: 0 }); // Accumulated drag delta per frame
  const DRAG_ROT_SENSITIVITY = 0.01; // Radians per pixel of mouse movement

  // Sunflower effect: sphere looks at mouse in Video Gallery mode
  const mouseNDCRef = useRef({ x: 0, y: 0 }); // Normalized device coordinates (-1 to 1)
  const sunflowerRotRef = useRef({ x: 0, y: 0 }); // Current rotation offset
  const sunflowerVelRef = useRef({ x: 0, y: 0 }); // Velocity (same model as drag)
  const baseRotationXRef = useRef(0); // Accumulated X rotation from drag
  const baseRotationYRef = useRef(0); // Accumulated Y rotation from drag
  const SUNFLOWER_MAX_ANGLE = Math.PI / 2; // Max tilt in radians (~90 degrees)

  // Center camera on the USDC sphere (CentralCoin at 0,0,0) when on small screens
  useEffect(() => {
    if (!isMobile) return;

    try {
      // Set camera to look at the USDC sphere at origin
      const cam = (controlsRef.current as any)?._camera || null;
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0); // USDC sphere is at origin
        controlsRef.current.update();
      }
      if (cam) {
        // Position camera to frame the USDC sphere nicely
        cam.position.set(0, 2, 18);
        cam.updateProjectionMatrix?.();
      }
    } catch (e) {
      // ignore if controls not ready
    }
  }, [isMobile]);

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

  // WASD/Arrow keys controls for moving the USDC sphere and participants
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        keysPressed.current.add(key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current.delete(key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Smooth zoom: capture wheel events and update target distance
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const direction = e.deltaY > 0 ? 1 : -1; // positive = zoom out, negative = zoom in
      zoomTargetRef.current = Math.max(
        ZOOM_MIN,
        Math.min(ZOOM_MAX, zoomTargetRef.current + direction * ZOOM_STEP)
      );
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  // Mouse button tracking + drag detection + NDC position
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      mouseButtonsRef.current.add(e.button);
      if (e.button === 0) {
        // Avoid a jump when switching from sunflower tracking to drag mode.
        // Merge current sunflower offset into base rotation, then reset transient state.
        baseRotationXRef.current += sunflowerRotRef.current.x;
        baseRotationYRef.current += sunflowerRotRef.current.y;
        sunflowerRotRef.current.x = 0;
        sunflowerRotRef.current.y = 0;
        sunflowerVelRef.current.x = 0;
        sunflowerVelRef.current.y = 0;
        mouseDragDeltaRef.current.x = 0;
        mouseDragDeltaRef.current.y = 0;
        isDraggingRef.current = true;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      mouseButtonsRef.current.delete(e.button);
      if (e.button === 0) isDraggingRef.current = false;
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Always track NDC position for sunflower
      mouseNDCRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseNDCRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;

      // Accumulate drag delta when left button is held
      if (isDraggingRef.current) {
        mouseDragDeltaRef.current.x += e.movementX;
        mouseDragDeltaRef.current.y += e.movementY;
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Orbital rotation and WASD movement for the entire group
  useFrame((state: { camera: THREE.Camera }, delta: number) => {
    if (orbitGroupRef.current) {
      orbitGroupRef.current.rotation.y += delta * 0.05; // Slow rotation speed
    }

    const camera = state.camera;

    // WASD movement and mouse-click rotation only active in Video Gallery mode
    if (isVideoActive) {
      // Apply WASD/Arrow movement relative to CAMERA orientation with smooth acceleration
      const keys = keysPressed.current;

      // Calculate desired movement direction in SCREEN space (Right/Up)
      let moveRight = 0;
      let moveUp = 0;

      if (keys.has('w') || keys.has('arrowup')) moveUp += 1;
      if (keys.has('s') || keys.has('arrowdown')) moveUp -= 1;
      if (keys.has('a') || keys.has('arrowleft')) moveRight -= 1;
      if (keys.has('d') || keys.has('arrowright')) moveRight += 1;

      // Calculate target velocity based on input
      let targetVelX = 0;
      let targetVelY = 0;
      let targetVelZ = 0;

      if (moveRight !== 0 || moveUp !== 0) {
        // Get camera's local vectors in world space
        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

        // Calculate target velocity vector
        const targetVel = new THREE.Vector3()
          .addScaledVector(camRight, moveRight)
          .addScaledVector(camUp, moveUp)
          .normalize()
          .multiplyScalar(MOVE_SPEED);

        targetVelX = targetVel.x;
        targetVelY = targetVel.y;
        targetVelZ = targetVel.z;
      }

      // Smooth acceleration/deceleration using lerp
      const velocity = velocityRef.current;
      velocity.x += (targetVelX - velocity.x) * ACCELERATION;
      velocity.y += (targetVelY - velocity.y) * ACCELERATION;
      velocity.z += (targetVelZ - velocity.z) * ACCELERATION;

      // Apply damping when no input (deceleration)
      if (moveRight === 0 && moveUp === 0) {
        velocity.x *= DECELERATION;
        velocity.y *= DECELERATION;
        velocity.z *= DECELERATION;
      }

      // Update position based on velocity
      movementRef.current.x += velocity.x;
      movementRef.current.y += velocity.y;
      movementRef.current.z += velocity.z;

      // Clamp within a 3D box defined by MAX_OFFSET
      movementRef.current.x = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, movementRef.current.x));
      movementRef.current.y = Math.max(-MAX_OFFSET_Y, Math.min(MAX_OFFSET_Y, movementRef.current.y));
      movementRef.current.z = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, movementRef.current.z));

      // Stop velocity when hitting boundaries
      if (Math.abs(movementRef.current.x) >= MAX_OFFSET) velocity.x = 0;
      if (Math.abs(movementRef.current.y) >= MAX_OFFSET_Y) velocity.y = 0;
      if (Math.abs(movementRef.current.z) >= MAX_OFFSET) velocity.z = 0;

      // Mouse-button rotation disabled (rotation is now driven by sunflower effect)
    } else {
      // Sky Scene mode: decelerate any residual movement/rotation smoothly
      const velocity = velocityRef.current;
      velocity.x *= DECELERATION;
      velocity.y *= DECELERATION;
      velocity.z *= DECELERATION;
      // No sphere rotation to decelerate in Sky Scene mode
    }

    // Apply movement to main group (always, so deceleration works on mode switch)
    if (mainGroupRef.current) {
      mainGroupRef.current.position.set(movementRef.current.x, movementRef.current.y, movementRef.current.z);
    }

    // Smooth zoom: lerp camera distance toward target
    const cam = state.camera;
    const controls = controlsRef.current;
    if (controls) {
      const target = controls.target as THREE.Vector3;
      const dirFromTarget = cam.position.clone().sub(target);
      const currentDist = dirFromTarget.length();

      // Sync ref with actual distance on first frame
      if (Math.abs(zoomDistanceRef.current - currentDist) > 10) {
        zoomDistanceRef.current = currentDist;
        zoomTargetRef.current = currentDist;
      }

      // Lerp toward target distance
      zoomDistanceRef.current += (zoomTargetRef.current - zoomDistanceRef.current) * ZOOM_LERP_SPEED;

      // Only apply if there's a meaningful difference
      if (Math.abs(zoomDistanceRef.current - currentDist) > 0.01) {
        dirFromTarget.normalize().multiplyScalar(zoomDistanceRef.current);
        cam.position.copy(target.clone().add(dirFromTarget));
        controls.update();
      }
    }

    // Sphere rotation: drag (left-click + move) or sunflower (passive mouse tracking)
    if (mainGroupRef.current) {
      if (isVideoActive) {
        if (isDraggingRef.current) {
          // Drag mode: apply mouse movement delta to base rotation
          baseRotationYRef.current += mouseDragDeltaRef.current.x * DRAG_ROT_SENSITIVITY;
          baseRotationXRef.current -= mouseDragDeltaRef.current.y * DRAG_ROT_SENSITIVITY;
          mouseDragDeltaRef.current.x = 0;
          mouseDragDeltaRef.current.y = 0;

          // Decay sunflower offset toward zero so it doesn't add stale tilt
          sunflowerRotRef.current.x *= 0.9;
          sunflowerRotRef.current.y *= 0.9;
          sunflowerVelRef.current.x = 0;
          sunflowerVelRef.current.y = 0;
        } else {
          // Sunflower mode: sphere follows mouse position
          const targetRotX = -mouseNDCRef.current.y * SUNFLOWER_MAX_ANGLE;
          const targetRotY = mouseNDCRef.current.x * SUNFLOWER_MAX_ANGLE;

          const diffX = targetRotX - sunflowerRotRef.current.x;
          const diffY = targetRotY - sunflowerRotRef.current.y;

          sunflowerVelRef.current.x += diffX * SPHERE_ROT_ACCEL;
          sunflowerVelRef.current.y += diffY * SPHERE_ROT_ACCEL;
          sunflowerVelRef.current.x *= SPHERE_ROT_DECEL;
          sunflowerVelRef.current.y *= SPHERE_ROT_DECEL;

          // Clamp velocity to never overshoot the target (prevents spring/bounce)
          if (Math.abs(sunflowerVelRef.current.x) > Math.abs(diffX)) sunflowerVelRef.current.x = diffX;
          if (Math.abs(sunflowerVelRef.current.y) > Math.abs(diffY)) sunflowerVelRef.current.y = diffY;

          sunflowerRotRef.current.x += sunflowerVelRef.current.x;
          sunflowerRotRef.current.y += sunflowerVelRef.current.y;
        }

        mainGroupRef.current.rotation.x = baseRotationXRef.current + sunflowerRotRef.current.x;
        mainGroupRef.current.rotation.y = baseRotationYRef.current + sunflowerRotRef.current.y;
      } else {
        // Sky Scene: decelerate toward neutral
        sunflowerVelRef.current.x *= SPHERE_ROT_DECEL;
        sunflowerVelRef.current.y *= SPHERE_ROT_DECEL;
        sunflowerRotRef.current.x += sunflowerVelRef.current.x;
        sunflowerRotRef.current.y += sunflowerVelRef.current.y;
        sunflowerRotRef.current.x *= 0.95;
        sunflowerRotRef.current.y *= 0.95;

        mainGroupRef.current.rotation.x = baseRotationXRef.current + sunflowerRotRef.current.x;
        mainGroupRef.current.rotation.y = baseRotationYRef.current + sunflowerRotRef.current.y;
      }
    }
  });

  const neonAmbient = ambientIntensity * (isNight ? 0.4 : 0.6);
  const neonDirectional = lightIntensity * (isNight ? 0.6 : 0.85);

  return (
    <>
      {/* Notifies when the scene has rendered */}
      <SceneReadyNotifier onReady={onSceneReady} />

      {/* Main group that moves with WASD/Arrow keys */}
      <group ref={mainGroupRef}>
        <CentralCoin isNight={isNight} isVideoActive={isVideoActive} mouseNDCRef={mouseNDCRef} />
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
                isNight={isNight}
                onHover={() => onHoverParticipant(participant.polygonAddress)}
                onLeave={() => onHoverParticipant(null)}
                onSelect={isMobile ? () => onSelectParticipant?.(participant.polygonAddress) : undefined}
              />
            );
          })}
        </group>
      </group>

      {/* Iluminación */}
      <ambientLight intensity={neonAmbient} />
      <directionalLight position={[10, 10, 5]} intensity={neonDirectional} color={lightColor} />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#ffffff" />

      <EffectComposer>
        <Bloom intensity={1.5} luminanceThreshold={0.1} mipmapBlur />
      </EffectComposer>

      {isNight && !isVideoActive && (
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

      {/* Barritas horizontales que atraviesan la escena */}
      <HorizontalBars visible={!isNight && !isVideoActive} />

      {/* Circunferencias amarillas de fondo */}
      <FadingCircles visible={!isNight && !isVideoActive} />

      {/* Bandadas de pájaros (solo durante el día) */}
      <BirdFlock isDay={isDay && !isVideoActive} />

      {/* Nubes suaves durante el día */}
      <SoftClouds isDay={isDay && !isVideoActive} />

      {/* Estrellas fugaces durante la noche */}
      {!isVideoActive && <ShootingStars isNight={isNight} />}

      {/* Polvo estelar durante la noche */}
      <StarDust isNight={isNight && !isVideoActive} />

      {/* Polvo dorado flotante (especialmente durante el atardecer) */}
      <GoldenDust starOpacity={isVideoActive ? 0 : starOpacity} />

      {/* Controles de órbita - rotación con zoom limitado */}
      <OrbitControls
        ref={controlsRef}
        enableZoom={false}
        enablePan={false}
        enableRotate={!isVideoActive}
        rotateSpeed={0.5}
        minDistance={ZOOM_MIN}
        maxDistance={ZOOM_MAX}
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
  const { isNight, isDay, lightColor, lightIntensity, ambientIntensity, starOpacity } = useDayNightCycle();
  const shouldShowBackground = starOpacity >= 0.7 && !props.isVideoActive;

  return (
    <div className="absolute inset-0" style={{ zIndex: 0 }}>
      {/* Background color layer with smooth fade transition */}
      <div
        className="absolute inset-0 transition-opacity duration-[3500ms] ease-in-out"
        style={{
          backgroundColor: "#010102",
          opacity: shouldShowBackground ? 1 : 0,
          pointerEvents: "none"
        }}
      />

      {/* Three.js Canvas with transparent background */}
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
          isDay={isDay ?? false}
          starOpacity={starOpacity}
          isVideoActive={props.isVideoActive}
        />
      </Canvas>
    </div>
  );
}
