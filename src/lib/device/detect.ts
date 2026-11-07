import type { DeviceMode, DeviceSignals, DeviceState } from "./types";

/**
 * Calculates particle cap per /docs/02-DESIGN-SYSTEM.md & Phase 5 performance budget:
 * - desktop: 60
 * - mobile / touch: 12 (capped for main-thread paint budget)
 * - light mode: 12
 * - reduced motion: 0 (static fallback)
 */
export function getParticleCap(
  mode: DeviceMode,
  isMobileOrTouch: boolean
): number {
  if (mode === "reduced") {
    return 0;
  }
  if (mode === "light") {
    return 12;
  }
  return isMobileOrTouch ? 12 : 60;
}

/**
 * Resolves the single operating mode per rules from task spec:
 * 1. reduced-motion preference => 'reduced' always (even ?full=1 cannot override)
 * 2. ?light=1 forces 'light'
 * 3. ?full=1 forces 'full'
 * 4. Default => 'full' (Full must be the default unless the OS asks for reduced motion)
 */
export function resolveDeviceMode(signals: DeviceSignals): DeviceMode {
  // Rule 1: Reduced motion always wins if requested by OS
  if (signals.reducedMotion) {
    return "reduced";
  }

  // Rule 2 & 3: Query parameter overrides
  if (signals.queryOverride === "light") {
    return "light";
  }
  if (signals.queryOverride === "full") {
    return "full";
  }

  // Rule 4: Full must be the default unless the OS asks for reduced motion.
  // Device/performance heuristics must not silently demote the default to light.
  return "full";
}

/**
 * Read current device signals from the client environment.
 */
export function readClientSignals(): DeviceSignals {
  if (typeof window === "undefined") {
    return {
      reducedMotion: false,
      hardwareConcurrency: undefined,
      deviceMemory: undefined,
      isCoarsePointer: false,
      isTouch: false,
      probe: {
        state: "idle",
        avgFrameTimeMs: 16.67,
        fps: 60,
        isSlow: false,
        frameCount: 0,
      },
      queryOverride: null,
    };
  }

  // Check prefers-reduced-motion
  const reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );
  const reducedMotion = reducedMotionQuery.matches;

  // Check cores & memory safely (Safari/Firefox do not expose deviceMemory)
  const hardwareConcurrency =
    typeof navigator.hardwareConcurrency === "number"
      ? navigator.hardwareConcurrency
      : undefined;

  const nav = navigator as Navigator & { deviceMemory?: number };
  const deviceMemory =
    typeof nav.deviceMemory === "number" ? nav.deviceMemory : undefined;

  // Check pointer and touch capabilities
  const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const isTouch =
    "ontouchstart" in window ||
    (typeof navigator.maxTouchPoints === "number" &&
      navigator.maxTouchPoints > 0);

  // Check query parameter override (?light=1 or ?full=1)
  let queryOverride: "light" | "full" | null = null;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("light") === "1") {
      queryOverride = "light";
    } else if (params.get("full") === "1") {
      queryOverride = "full";
    }
  } catch {
    // URL parsing fallback
  }

  return {
    reducedMotion,
    hardwareConcurrency,
    deviceMemory,
    isCoarsePointer,
    isTouch,
    probe: {
      state: "idle",
      avgFrameTimeMs: 16.67,
      fps: 60,
      isSlow: false,
      frameCount: 0,
    },
    queryOverride,
  };
}

/**
 * Safe initial state for SSR and pre-hydration.
 * Prevents hydration mismatch by providing consistent defaults.
 */
export function getInitialDeviceState(): DeviceState {
  const initialSignals: DeviceSignals = {
    reducedMotion: false,
    hardwareConcurrency: undefined,
    deviceMemory: undefined,
    isCoarsePointer: false,
    isTouch: false,
    probe: {
      state: "idle",
      avgFrameTimeMs: 16.67,
      fps: 60,
      isSlow: false,
      frameCount: 0,
    },
    queryOverride: null,
  };

  return {
    mode: "full",
    particleCap: 60,
    signals: initialSignals,
    isHydrated: false,
  };
}
