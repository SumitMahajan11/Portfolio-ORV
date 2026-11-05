"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { constellationLines } from "@/content/lines";
import type { ConstellationLine, ConstellationContext } from "@/content/types";
import {
  FAST_SCROLL_THRESHOLD_PX_PER_SEC,
  CONSTELLATION_COOLDOWN_SECONDS,
} from "./types";

export interface UseConstellationProps {
  introComplete?: boolean;
  introDone?: boolean;
  isBiyooSpeaking?: boolean;
  scrollSpeed: number;
  idleSeconds: number;
  localHour: number;
  isTouch?: boolean;
  observeSections?: boolean;
}

export interface UseConstellationReturn {
  activeLine: ConstellationLine | null;
  dismissLine: () => void;
  triggerLineByContext: (context: ConstellationContext) => void;
  triggerWorldLine: (worldKey: string) => void;
}

// SessionStorage keys for session persistence
const SESSION_SHOWN_LINES_KEY = "orv_constellation_shown_lines";
const SESSION_SHOWN_WORLDS_KEY = "orv_constellation_shown_worlds";

function getSessionShownLines(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SESSION_SHOWN_LINES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function saveSessionShownLines(set: Set<number>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      SESSION_SHOWN_LINES_KEY,
      JSON.stringify(Array.from(set))
    );
  } catch {
    // sessionStorage disabled or unavailable
  }
}

function getSessionShownWorlds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SESSION_SHOWN_WORLDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function saveSessionShownWorlds(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      SESSION_SHOWN_WORLDS_KEY,
      JSON.stringify(Array.from(set))
    );
  } catch {
    // sessionStorage disabled or unavailable
  }
}

// Skipped line IDs per P2-7 Requirement 3:
// - #18: Backtrace (no verified evidence / no flagship world built)
// - #36-#38: contact/end (feature not yet built)
// - #39-#40: hidden fragments (feature not yet built)
export const SKIPPED_LINE_IDS = new Set<number>([18, 36, 37, 38, 39, 40]);

// Section-aware world mappings
export const WORLD_CANDIDATE_LINE_IDS: Record<string, number[]> = {
  "edge-cloud": [12, 13],
  "raft": [14, 15],
  "z3": [16, 17],
  "proof-panel": [19, 20],
  "skills": [21, 22, 23],
};

// General context pools
export const CONTEXT_CANDIDATE_LINE_IDS: Record<string, number[]> = {
  "hero": [1, 2, 3, 4, 5],
  "fast-scroll": [6, 7, 8],
  "idle": [9, 10, 11],
  "hover": [24, 25, 26],
  "time-night": [27, 28],
  "time-morning": [29],
  "meta": [30, 31, 32, 33],
  "mobile": [34, 35],
};

/**
 * useConstellationEngine:
 * Manages Constellation comment lines appearing as floating teal system messages.
 *
 * Rules:
 * - Max 1 line per 20 seconds (CONSTELLATION_COOLDOWN_SECONDS)
 * - Never repeat the same line within a session until all lines in that context are used
 * - Never show while the intro is active (gated strictly on introComplete / introDone flag)
 * - Clear any queued line when the intro starts
 * - Never overlap Biyoo's own speech bubble
 * - Trigger world lines only once per world per session when at least 50% in view
 * - Skip lines marked for features that do not exist yet (#18, #36-#38, #39-#40)
 * - Local only: no storage beyond sessionStorage for "lines already shown"
 */
export function useConstellationEngine({
  introComplete,
  introDone,
  isBiyooSpeaking = false,
  scrollSpeed,
  idleSeconds,
  localHour,
  isTouch = false,
  observeSections = true,
}: UseConstellationProps): UseConstellationReturn {
  const isIntroComplete = Boolean(introComplete ?? introDone);
  const [activeLine, setActiveLine] = useState<ConstellationLine | null>(null);
  const [biyooSpeakingEventState, setBiyooSpeakingEventState] = useState(false);

  const effectiveBiyooSpeaking = isBiyooSpeaking || biyooSpeakingEventState;

  const lastShownTimeRef = useRef<number>(0);
  const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeVisibleWorldsRef = useRef<Set<string>>(new Set());

  const dismissLine = useCallback(() => {
    setActiveLine(null);
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
  }, []);

  // Listen to global biyoo:speaking events
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleBiyooSpeaking = (e: Event) => {
      const customEvent = e as CustomEvent<{ isSpeaking: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.isSpeaking === "boolean") {
        setBiyooSpeakingEventState(customEvent.detail.isSpeaking);
        if (customEvent.detail.isSpeaking) {
          dismissLine();
        }
      }
    };
    window.addEventListener("biyoo:speaking", handleBiyooSpeaking);
    return () => {
      window.removeEventListener("biyoo:speaking", handleBiyooSpeaking);
    };
  }, [dismissLine]);

  // Clear any queued timer when intro is active
  useEffect(() => {
    if (!isIntroComplete) {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
        dismissTimeoutRef.current = null;
      }
      lastShownTimeRef.current = Date.now();
    }
  }, [isIntroComplete]);

  // Core candidate selection and trigger function
  const triggerLineFromPool = useCallback(
    (candidateIds: number[], worldKey?: string): boolean => {
      if (!isIntroComplete || effectiveBiyooSpeaking) {
        return false;
      }

      const now = Date.now();
      const timeSinceLastLine = (now - lastShownTimeRef.current) / 1000;
      if (timeSinceLastLine < CONSTELLATION_COOLDOWN_SECONDS) {
        return false;
      }

      // Check if world line has already been shown this session
      if (worldKey) {
        const shownWorlds = getSessionShownWorlds();
        if (shownWorlds.has(worldKey)) {
          return false;
        }
      }

      // Filter valid candidates from content, skipping unbuilt features
      const validCandidates = constellationLines.filter(
        (l) => candidateIds.includes(l.id) && !SKIPPED_LINE_IDS.has(l.id)
      );
      if (validCandidates.length === 0) return false;

      // Check session shown lines
      const shownLines = getSessionShownLines();
      let available = validCandidates.filter((l) => !shownLines.has(l.id));

      // If all lines in this pool have been shown (context exhausted), recycle the pool
      if (available.length === 0) {
        validCandidates.forEach((l) => shownLines.delete(l.id));
        available = validCandidates;
      }

      const chosen = available[0] || validCandidates[0];
      if (!chosen) return false;

      // Update session storage
      shownLines.add(chosen.id);
      saveSessionShownLines(shownLines);

      if (worldKey) {
        const shownWorlds = getSessionShownWorlds();
        shownWorlds.add(worldKey);
        saveSessionShownWorlds(shownWorlds);
      }

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

      return true;
    },
    [isIntroComplete, effectiveBiyooSpeaking]
  );

  const triggerWorldLine = useCallback(
    (worldKey: string) => {
      const candidates = WORLD_CANDIDATE_LINE_IDS[worldKey];
      if (!candidates) return;
      triggerLineFromPool(candidates, worldKey);
    },
    [triggerLineFromPool]
  );

  const triggerLineByContext = useCallback(
    (context: ConstellationContext) => {
      const candidates = CONTEXT_CANDIDATE_LINE_IDS[context];
      if (!candidates) return;
      triggerLineFromPool(candidates);
    },
    [triggerLineFromPool]
  );

  // Listen for global custom triggers (e.g. from poke/hover/click)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleCustomTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<{
        context?: ConstellationContext;
        lineId?: number;
        worldKey?: string;
      }>;
      if (customEvent.detail) {
        if (customEvent.detail.worldKey) {
          triggerWorldLine(customEvent.detail.worldKey);
        } else if (customEvent.detail.context) {
          triggerLineByContext(customEvent.detail.context);
        } else if (customEvent.detail.lineId) {
          triggerLineFromPool([customEvent.detail.lineId]);
        }
      }
    };

    const handleCustomDismiss = () => {
      dismissLine();
    };

    window.addEventListener("constellation:trigger", handleCustomTrigger);
    window.addEventListener("constellation:dismiss", handleCustomDismiss);
    return () => {
      window.removeEventListener("constellation:trigger", handleCustomTrigger);
      window.removeEventListener("constellation:dismiss", handleCustomDismiss);
    };
  }, [triggerWorldLine, triggerLineByContext, triggerLineFromPool, dismissLine]);

  // Section Observer: Detect when worlds/proof panels are at least 50% in view
  useEffect(() => {
    if (!observeSections || typeof window === "undefined" || !isIntroComplete) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const isProofPanel = el.getAttribute("data-proof-panel") === "true";
          let key: string | null = null;

          if (el.id === "edge-cloud") {
            key = "edge-cloud";
          } else if (el.id === "ratify") {
            key = "raft";
          } else if (el.id === "iac-verifier") {
            key = "z3";
          } else if (isProofPanel) {
            key = "proof-panel";
          } else if (el.id === "readers-record") {
            key = "skills";
          }

          if (!key) continue;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            activeVisibleWorldsRef.current.add(key);
            triggerWorldLine(key);
          } else {
            activeVisibleWorldsRef.current.delete(key);
          }
        }
      },
      { threshold: [0, 0.5, 1.0] }
    );

    // Target sections and proof panels
    const targetSelectors = [
      "#edge-cloud",
      "#ratify",
      "#iac-verifier",
      "#readers-record",
      '[data-proof-panel="true"]',
    ];

    targetSelectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => observer.observe(el));
    });

    return () => {
      observer.disconnect();
    };
  }, [observeSections, isIntroComplete, triggerWorldLine]);

  // Periodic evaluator: retry visible worlds when cooldown expires & evaluate dynamic contexts
  useEffect(() => {
    if (!isIntroComplete || effectiveBiyooSpeaking) {
      return;
    }

    const now = Date.now();
    const timeSinceLast = (now - lastShownTimeRef.current) / 1000;
    const cooldownReady = timeSinceLast >= CONSTELLATION_COOLDOWN_SECONDS && !activeLine;

    // 1. Retry visible worlds if eligible
    if (cooldownReady && activeVisibleWorldsRef.current.size > 0) {
      for (const visibleKey of Array.from(activeVisibleWorldsRef.current)) {
        const shownWorlds = getSessionShownWorlds();
        if (!shownWorlds.has(visibleKey)) {
          triggerWorldLine(visibleKey);
          return;
        }
      }
    }

    // 2. Fast-scroll check: triggers when scroll speed exceeds threshold
    if (scrollSpeed >= FAST_SCROLL_THRESHOLD_PX_PER_SEC) {
      triggerLineByContext("fast-scroll");
      return;
    }

    // 3. Idle check: triggers when reader has been idle >= 20 seconds
    if (idleSeconds >= 20 && idleSeconds % 20 === 0) {
      // Rotate between idle and meta lines during long pauses
      if (Math.random() > 0.5) {
        triggerLineByContext("meta");
      } else {
        triggerLineByContext("idle");
      }
      return;
    }

    // 4. Time-of-day / Mobile checks
    if (cooldownReady) {
      if (localHour >= 0 && localHour < 5) {
        triggerLineByContext("time-night");
      } else if (localHour >= 5 && localHour < 10) {
        triggerLineByContext("time-morning");
      } else if (isTouch) {
        triggerLineByContext("mobile");
      } else {
        triggerLineByContext("meta");
      }
    }
  }, [
    isIntroComplete,
    effectiveBiyooSpeaking,
    scrollSpeed,
    idleSeconds,
    localHour,
    isTouch,
    activeLine,
    triggerWorldLine,
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
    activeLine: isIntroComplete && !effectiveBiyooSpeaking ? activeLine : null,
    dismissLine,
    triggerLineByContext,
    triggerWorldLine,
  };
}

export default useConstellationEngine;
