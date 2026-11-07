import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

/**
 * Easing tokens specified in /docs/02-DESIGN-SYSTEM.md:
 * - entrance: power3.out
 * - transition: power2.inOut
 * - biyoo: elastic.out(1,0.5) (Biyoo only)
 */
export const EASINGS = {
  entrance: "power3.out",
  transition: "power2.inOut",
  biyoo: "elastic.out(1, 0.5)",
} as const;

export type EasingToken = keyof typeof EASINGS;

/**
 * Duration tokens specified in /docs/02-DESIGN-SYSTEM.md:
 * - micro: 120-200ms (0.18s)
 * - ui: 300-450ms (0.35s)
 * - scene: 0.8-1.6s (1.2s)
 */
export const DURATIONS = {
  micro: 0.18,
  ui: 0.35,
  scene: 1.2,
} as const;

export type DurationToken = keyof typeof DURATIONS;

/**
 * Standard scroll scrub smoothing token per /docs/02-DESIGN-SYSTEM.md
 * (ScrollTrigger scrub 0.6)
 */
export const DEFAULT_SCRUB = 0.6;

let isRegistered = false;

/**
 * Register GSAP plugins exactly once, safe against double registration and SSR.
 */
export function registerMotionPlugins(): void {
  if (typeof window === "undefined" || isRegistered) {
    return;
  }

  gsap.registerPlugin(ScrollTrigger, useGSAP);
  // Prevent mobile address bar show/hide from triggering ScrollTrigger jumps
  ScrollTrigger.config({ ignoreMobileResize: true });
  isRegistered = true;
}

// Auto-register when imported in client environment
if (typeof window !== "undefined") {
  registerMotionPlugins();
}

export { gsap, ScrollTrigger, useGSAP };
