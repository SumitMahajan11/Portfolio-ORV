import { gsap } from "@/lib/motion";
import type { StageOptions } from "./types";

/**
 * Stage 5: Wings Emerge
 * Master scroll scrub phase (25% – 55% progress):
 * - Multi-layered white wings unfold from shoulder pivots
 * - In Light mode: single-layer scale and opacity transition
 * - In Full mode: separated back and front plumage fanning out with heavy cinematic easing
 */
export function setupStage5(
  masterTl: gsap.core.Timeline,
  container: HTMLElement,
  options: StageOptions
): void {
  const wingBackL = container.querySelector(".dokja-wing-back-l");
  const wingBackR = container.querySelector(".dokja-wing-back-r");
  const wingFrontL = container.querySelector(".dokja-wing-front-l");
  const wingFrontR = container.querySelector(".dokja-wing-front-r");

  if (options.mode === "light") {
    const wings = [wingBackL, wingBackR].filter(Boolean);
    if (wings.length > 0) {
      masterTl.to(
        wings,
        {
          scale: 1.0,
          opacity: 0.9,
          duration: 30,
          ease: "power2.inOut",
        },
        25
      );
    }
    return;
  }

  // Full mode: independent shoulder rotation and fanned plumage
  if (wingBackL) {
    masterTl.to(
      wingBackL,
      {
        scale: 1.0,
        opacity: 0.85,
        rotation: 0,
        duration: 30,
        ease: "power2.inOut",
      },
      25
    );
  }

  if (wingBackR) {
    masterTl.to(
      wingBackR,
      {
        scale: 1.0,
        opacity: 0.85,
        rotation: 0,
        duration: 30,
        ease: "power2.inOut",
      },
      25
    );
  }

  if (wingFrontL) {
    masterTl.to(
      wingFrontL,
      {
        scale: 1.0,
        opacity: 1.0,
        rotation: 0,
        duration: 30,
        ease: "power2.inOut",
      },
      25
    );
  }

  if (wingFrontR) {
    masterTl.to(
      wingFrontR,
      {
        scale: 1.0,
        opacity: 1.0,
        rotation: 0,
        duration: 30,
        ease: "power2.inOut",
      },
      25
    );
  }
}
