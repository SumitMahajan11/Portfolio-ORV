import { gsap } from "@/lib/motion";
import type { StageCallbackHooks } from "./types";

/**
 * Stage 3: Irritation
 * Auto-play intro phase (5.0s – 7.2s):
 * - Eyebrow furrows slightly with subtle impatience
 * - Deep breath / slight sigh scale
 * - Phone cyan screen glow flares
 * - Scroll prompt confirms readiness
 */
export function setupStage3(
  introTl: gsap.core.Timeline,
  container: HTMLElement,
  hooks: StageCallbackHooks
): void {
  const browIrritated = container.querySelector(".dokja-brow-irritated");
  const body = container.querySelector(".dokja-layer-body");
  const glow = container.querySelector(".dokja-layer-glow");
  const scrollHint = container.querySelector(".hero-scroll-hint");

  introTl.call(() => {
    hooks.setStage(3);
  }, [], 5.0);

  if (browIrritated) {
    introTl.to(
      browIrritated,
      {
        opacity: 1,
        duration: 0.3,
        ease: "power2.out",
      },
      5.0
    );
  }

  if (body) {
    introTl.to(
      body,
      {
        scaleY: 1.012,
        scaleX: 0.995,
        duration: 0.45,
        repeat: 1,
        yoyo: true,
        ease: "power2.inOut",
        transformOrigin: "bottom center",
      },
      5.15
    );
  }

  if (glow) {
    introTl.to(
      glow,
      {
        scale: 1.25,
        opacity: 0.85,
        duration: 0.35,
        repeat: 1,
        yoyo: true,
        ease: "sine.inOut",
        transformOrigin: "center",
      },
      5.3
    );
  }

  if (scrollHint) {
    introTl.to(
      scrollHint,
      {
        opacity: 1,
        duration: 0.5,
        ease: "power2.out",
      },
      6.6
    );
  }
}
