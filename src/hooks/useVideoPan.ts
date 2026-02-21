import { useEffect, useRef, useCallback } from 'react';

interface UseVideoPanOptions {
  videoRefs: React.RefObject<HTMLVideoElement | null>[];
  enabled: boolean;
}

const PAN_THRESHOLD = 15; // px before pan activates
const MOMENTUM_DECAY = 0.95;
const MOMENTUM_MIN_VELOCITY = 0.1;
const VELOCITY_SAMPLES = 3;

export function useVideoPan({ videoRefs, enabled }: UseVideoPanOptions) {
  const objectPositionXRef = useRef(50);
  const touchStartXRef = useRef(0);
  const startPositionXRef = useRef(50);
  const isPanActiveRef = useRef(false);
  const isPanningRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  // Velocity tracking for momentum
  const velocitySamplesRef = useRef<{ x: number; time: number }[]>([]);

  const applyObjectPosition = useCallback(
    (xPercent: number) => {
      const clamped = Math.max(0, Math.min(100, xPercent));
      objectPositionXRef.current = clamped;
      for (const ref of videoRefs) {
        if (ref.current) {
          ref.current.style.objectPosition = `${clamped}% 50%`;
        }
      }
    },
    [videoRefs]
  );

  const dispatchPanEvent = useCallback((active: boolean) => {
    window.dispatchEvent(
      new CustomEvent('video-pan-active', { detail: active })
    );
  }, []);

  const stopMomentum = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const startMomentum = useCallback(() => {
    const samples = velocitySamplesRef.current;
    if (samples.length < 2) return;

    const last = samples[samples.length - 1];
    const prev = samples[samples.length - 2];
    const dt = last.time - prev.time;
    if (dt === 0) return;

    // Velocity in px/ms, convert to %/frame
    const sensitivity = 100 / window.innerWidth;
    let velocity = ((prev.x - last.x) * sensitivity) / dt * 16; // ~16ms per frame

    const animate = () => {
      velocity *= MOMENTUM_DECAY;
      if (Math.abs(velocity) < MOMENTUM_MIN_VELOCITY) {
        animationFrameRef.current = null;
        return;
      }
      applyObjectPosition(objectPositionXRef.current + velocity);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [applyObjectPosition]);

  useEffect(() => {
    if (!enabled) {
      // Reset position when disabled (e.g., landscape rotation)
      applyObjectPosition(50);
      stopMomentum();
      isPanActiveRef.current = false;
      isPanningRef.current = false;
      return;
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      stopMomentum();

      const touch = e.touches[0];
      touchStartXRef.current = touch.clientX;
      startPositionXRef.current = objectPositionXRef.current;
      isPanActiveRef.current = false;
      velocitySamplesRef.current = [
        { x: touch.clientX, time: performance.now() },
      ];
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartXRef.current;

      // Track velocity samples
      const now = performance.now();
      velocitySamplesRef.current.push({ x: touch.clientX, time: now });
      if (velocitySamplesRef.current.length > VELOCITY_SAMPLES) {
        velocitySamplesRef.current.shift();
      }

      if (!isPanActiveRef.current) {
        if (Math.abs(deltaX) > PAN_THRESHOLD) {
          isPanActiveRef.current = true;
          isPanningRef.current = true;
          dispatchPanEvent(true);
        } else {
          return;
        }
      }

      // Dragging right (positive deltaX) → show left side (lower %)
      // Dragging left (negative deltaX) → show right side (higher %)
      const sensitivity = 100 / window.innerWidth;
      const newX = startPositionXRef.current - deltaX * sensitivity;
      applyObjectPosition(newX);
    };

    const handleTouchEnd = () => {
      if (isPanActiveRef.current) {
        startMomentum();
        // Delay clearing panning flag so the tap handler in page.tsx ignores this gesture
        setTimeout(() => {
          isPanningRef.current = false;
          dispatchPanEvent(false);
        }, 50);
      }
      isPanActiveRef.current = false;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      stopMomentum();
    };
  }, [enabled, applyObjectPosition, dispatchPanEvent, startMomentum, stopMomentum]);

  return { isPanning: isPanningRef };
}
