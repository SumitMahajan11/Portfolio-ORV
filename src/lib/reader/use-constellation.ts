"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { constellationLines } from "@/content/lines";
import type { ConstellationLine, ConstellationContext } from "@/content/types";
import {
  FAST_SCROLL_THRESHOLD_PX_PER_SEC,
  CONSTELLATION_COOLDOWN_SECONDS,
} from "./types";

export interface UseConstellationProps {
  introDone: boolean;
  isBiyooSpeaking: boolean;
  scrollSpeed: number;
  idleSeconds: number;
  localHour: number;
  isTouch?: boolean;
}

export interface UseConstellationReturn {
  activeLine: ConstellationLine | null;
  dismissLine: () => void;
  triggerLineByContext: (context: ConstellationContext) => void;
}

/**
 * useConstellationEngine:
 * Manages Constellation comment lines appearing as floating teal system messages.
 *
 * Rules:
 * - Max 1 line per 20 seconds (CONSTELLATION_COOLDOWN_SECONDS)
 * - Never repeat the same line within a session until all lines in that context are used
 * - Never show during the intro (introDone must be true)
 * - Never overlap Biyoo's own speech bubble
 * - Zero network calls, zero persistent storage
 */
export function useConstellationEngine({
  introDone,
  isBiyooSpeaking,
  scrollSpeed,
  idleSeconds,
  localHour,
  isTouch = false,
}: UseConstellationProps): UseConstellationReturn {
  const [activeLine, setActiveLine] = useState<ConstellationLine | null>(null);

  // In-memory set of used line IDs per context
  const usedIdsByContextRef = useRef<Map<ConstellationContext, Set<number>>>(
    new Map()
  );

  const lastShownTimeRef = useRef<number>(0);
  const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dismissLine = useCallback(() => {
    setActiveLine(null);
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
  }, []);

  // Pick an unused line for the given context
  const triggerLineByContext = useCallback(
    (context: ConstellationContext) => {
      // Must not show during intro or while Biyoo is speaking
      if (!introDone || isBiyooSpeaking) {
        return;
      }

      const now = Date.now();
      const timeSinceLastLine = (now - lastShownTimeRef.current) / 1000;
      if (timeSinceLastLine < CONSTELLATION_COOLDOWN_SECONDS) {
        return;
      }

      // Filter lines matching the requested context
      const candidates = constellationLines.filter((l) => l.context === context);
      if (candidates.length === 0) return;

      // Get or create used set for this context
      let usedSet = usedIdsByContextRef.current.get(context);
      if (!usedSet) {
        usedSet = new Set<number>();
        usedIdsByContextRef.current.set(context, usedSet);
      }

      // If all lines in this context have been used, reset the set
      if (usedSet.size >= candidates.length) {
        usedSet.clear();
      }

      // Pick the first unused candidate
      const available = candidates.filter((c) => !usedSet!.has(c.id));
      const chosen = available[0] || candidates[0];

      if (chosen) {
        usedSet.add(chosen.id);
        lastShownTimeRef.current = now;
        setActiveLine(chosen);

        if (dismissTimeoutRef.current) {
          clearTimeout(dismissTimeoutRef.current);
        }

        // Auto-hide line after 4.5 seconds
        dismissTimeoutRef.current = setTimeout(() => {
          setActiveLine(null);
          dismissTimeoutRef.current = null;
        }, 4500);
      }
    },
    [introDone, isBiyooSpeaking]
  );

  // Periodic evaluator for dynamic contexts (fast-scroll, idle, time-of-day)
  useEffect(() => {
    if (!introDone || isBiyooSpeaking) {
      return;
    }

    // 1. Fast-scroll check: triggers when scroll speed exceeds threshold
    if (scrollSpeed >= FAST_SCROLL_THRESHOLD_PX_PER_SEC) {
      triggerLineByContext("fast-scroll");
      return;
    }

    // 2. Idle check: triggers when reader has been idle >= 20 seconds
    if (idleSeconds >= 20 && idleSeconds % 20 === 0) {
      triggerLineByContext("idle");
      return;
    }

    // 3. Time-of-day checks on page arrival after intro
    const now = Date.now();
    const timeSinceLast = (now - lastShownTimeRef.current) / 1000;
    if (timeSinceLast >= CONSTELLATION_COOLDOWN_SECONDS && !activeLine) {
      if (localHour >= 0 && localHour < 5) {
        triggerLineByContext("time-night");
      } else if (localHour >= 5 && localHour < 10) {
        triggerLineByContext("time-morning");
      } else if (isTouch) {
        triggerLineByContext("mobile");
      } else {
        triggerLineByContext("hero");
      }
    }
  }, [
    introDone,
    isBiyooSpeaking,
    scrollSpeed,
    idleSeconds,
    localHour,
    isTouch,
    activeLine,
    triggerLineByContext,
  ]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, []);

  return {
    activeLine,
    dismissLine,
    triggerLineByContext,
  };
}

export default useConstellationEngine;
