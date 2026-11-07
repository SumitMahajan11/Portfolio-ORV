import { gsap } from "@/lib/motion";
import type { StageCallbackHooks } from "./types";

/**
 * Stage 2: Notices You
 * Auto-play intro phase (2.5s – 5.0s):
 * - Dokja lifts gaze directly to reader (cyan irises appear)
 * - Phone lowers by 12px
 * - System notification toast emerges smoothly
 */
export function setupStage2(
  introTl: gsap.core.Timeline,
  container: HTMLElement,
  hooks: StageCallbackHooks
): void {
  const eyesReading = container.querySelector(".dokja-eyes-reading");
  const eyesNotice = container.querySelector(".dokja-eyes-notice");
  const phone = container.querySelector(".dokja-layer-phone");
  const glow = container.querySelector(".dokja-layer-glow");
  const systemWindow = container.querySelector(".hero-system-window");

  introTl.call(() => {
    hooks.setStage(2);
  }, [], 2.5);

  if (eyesReading) {
    introTl.to(
      eyesReading,
      {
        opacity: 0,
        duration: 0.2,
        ease: "power2.out",
      },
      2.5
    );
  }

  if (eyesNotice) {
    introTl.to(
      eyesNotice,
      {
        opacity: 1,
        duration: 0.25,
        ease: "power2.out",
      },
      2.55
    );
  }

  if (phone || glow) {
    introTl.to(
      [phone, glow].filter(Boolean),
      {
        y: 12,
        duration: 0.6,
        ease: "power2.out",
      },
      2.55
    );
  }

  if (systemWindow) {
    introTl.to(
      systemWindow,
      {
        opacity: 1,
        y: 0,
        duration: 0.45,
        ease: "power3.out",
      },
      2.75
    );
  }
}
