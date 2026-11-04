"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ReaderSignals, PointerPosition } from "./types";

/**
 * useReaderTracker:
 * Local-only tracker that observes user activity to compute:
 * - idle seconds (since last scroll, pointer, key, or touch event)
 * - smoothed scroll speed (px/s)
 * - pointer position (x, y)
 * - hover target element description
 * - visitor local hour (0-23)
 *
 * Privacy Guarantees:
 * - ZERO network calls (no fetch, no beacons, no analytics)
 * - ZERO persistent storage (no cookies, no localStorage)
 * - All state is in-memory and ephemeral
 */
export function useReaderTracker(): ReaderSignals {
  const [signals, setSignals] = useState<ReaderSignals>(() => ({
    idleSeconds: 0,
    scrollSpeed: 0,
    pointerPosition: {
      x: 500,
      y: 500,
    },
    hoverTarget: null,
    localHour: 12,
  }));

  const lastInteractionTimeRef = useRef<number>(0);
  const lastScrollYRef = useRef<number>(0);
  const lastScrollTimeRef = useRef<number>(0);
  const smoothedSpeedRef = useRef<number>(0);
  const pointerPosRef = useRef<PointerPosition>({ x: 500, y: 500 });
  const hoverTargetRef = useRef<string | null>(null);

  // Mark user interaction
  const registerInteraction = useCallback(() => {
    lastInteractionTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    lastInteractionTimeRef.current = Date.now();
    lastScrollYRef.current = window.scrollY || window.pageYOffset || 0;
    lastScrollTimeRef.current = performance.now();

    // Track scroll velocity with exponential smoothing
    const handleScroll = () => {
      registerInteraction();
      const now = performance.now();
      const currentY = window.scrollY || window.pageYOffset || 0;
      const dt = (now - lastScrollTimeRef.current) / 1000;

      if (dt > 0.008) {
        const dy = Math.abs(currentY - lastScrollYRef.current);
        const instantSpeed = dy / dt; // px/s
        // Smooth velocity: 40% instant + 60% historical
        smoothedSpeedRef.current = smoothedSpeedRef.current * 0.6 + instantSpeed * 0.4;
        lastScrollYRef.current = currentY;
        lastScrollTimeRef.current = now;
      }
    };

    // Track cursor coordinates and hover target
    const handlePointerMove = (e: MouseEvent | PointerEvent) => {
      registerInteraction();
      pointerPosRef.current = { x: e.clientX, y: e.clientY };

      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = target.closest(
          "[data-hover], button, a, [role='button'], input, .card, .proof-item, .scenario-select"
        );
        if (interactive) {
          hoverTargetRef.current =
            interactive.getAttribute("data-hover") ||
            interactive.getAttribute("aria-label") ||
            interactive.tagName.toLowerCase();
        } else {
          hoverTargetRef.current = null;
        }
      }
    };

    // Track touch interactions
    const handleTouchMove = (e: TouchEvent) => {
      registerInteraction();
      if (e.touches && e.touches[0]) {
        pointerPosRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      registerInteraction();
      if (e.touches && e.touches[0]) {
        pointerPosRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };

    const handleKeyDown = () => {
      registerInteraction();
    };

    // Passive listeners: never block browser operations
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("keydown", handleKeyDown, { passive: true });

    // Periodic state updater (every 250ms) to update idle seconds and velocity decay
    const interval = setInterval(() => {
      const nowMs = Date.now();
      const idle = Math.max(
        0,
        Math.floor((nowMs - lastInteractionTimeRef.current) / 1000)
      );

      // Decay scroll speed if scrolling has stopped
      const timeSinceScroll = performance.now() - lastScrollTimeRef.current;
      if (timeSinceScroll > 150) {
        smoothedSpeedRef.current *= 0.65;
        if (smoothedSpeedRef.current < 15) {
          smoothedSpeedRef.current = 0;
        }
      }

      setSignals({
        idleSeconds: idle,
        scrollSpeed: Math.round(smoothedSpeedRef.current),
        pointerPosition: { ...pointerPosRef.current },
        hoverTarget: hoverTargetRef.current,
        localHour: new Date().getHours(),
      });
    }, 250);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("keydown", handleKeyDown);
      clearInterval(interval);
    };
  }, [registerInteraction]);

  return signals;
}

export default useReaderTracker;
