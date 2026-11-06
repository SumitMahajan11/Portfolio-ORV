import { gsap } from "@/lib/motion";
import type { StageOptions } from "./types";

/**
 * Stage 6: Wings Expand
 * Master scroll scrub phase (55% – 85% progress):
 * - Wings expand past canvas boundaries in full glory
 * - Constellation star ring fades in and orbits
 * - In Light mode: static star ring (0° rotation) and single-layer expansion
 */
export function setupStage6(
  masterTl: gsap.core.Timeline,
  container: HTMLElement,
  options: StageOptions
): void {
  const wingBackL = container.querySelector(".dokja-wing-back-l");
  const wingBackR = container.querySelector(".dokja-wing-back-r");
  const wingFrontL = container.querySelector(".dokja-wing-front-l");
  const wingFrontR = container.querySelector(".dokja-wing-front-r");
  const starRing = container.querySelector(".hero-star-ring");

  if (options.mode === "light") {
    const wings = [wingBackL, wingBackR].filter(Boolean);
    if (wings.length > 0) {
      masterTl.to(
        wings,
        {
          scale: 1.45,
          opacity: 1.0,
          duration: 30,
          ease: "power2.out",
        },
        55
      );
    }

    if (starRing) {
      masterTl.to(
        starRing,
        {
          opacity: 0.85,
          scale: 1.0,
          rotation: 0,
          duration: 30,
          ease: "power1.inOut",
        },
        55
      );
    }
    return;
  }

  // Full mode: majestic wide expansion and orbiting star nodes
  const scale = options.isTouch ? 1.45 : 1.65;
  const shiftX = options.isTouch ? 45 : 55;

  if (wingBackL) {
    masterTl.to(
      wingBackL,
      {
        scale,
        x: -shiftX,
        rotation: -12,
        duration: 30,
        ease: "power2.out",
      },
      55
    );
  }

  if (wingBackR) {
    masterTl.to(
      wingBackR,
      {
        scale,
        x: shiftX,
        rotation: 12,
        duration: 30,
        ease: "power2.out",
      },
      55
    );
  }

  if (wingFrontL) {
    masterTl.to(
      wingFrontL,
      {
        scale,
        x: -shiftX,
        rotation: -12,
        duration: 30,
        ease: "power2.out",
      },
      55
    );
  }

  if (wingFrontR) {
    masterTl.to(
      wingFrontR,
      {
        scale,
        x: shiftX,
        rotation: 12,
        duration: 30,
        ease: "power2.out",
      },
      55
    );
  }

  if (starRing) {
    masterTl.to(
      starRing,
      {
        opacity: 0.85,
        scale: 1.0,
        rotation: 180,
        duration: 30,
        ease: "power1.inOut",
      },
      55
    );
  }
}
