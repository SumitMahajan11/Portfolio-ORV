import { gsap } from "@/lib/motion";
import type { StageOptions, StageCallbackHooks } from "./types";

/**
 * Stage 1: Reading
 * Auto-play intro phase (0.0s – 2.5s):
 * - Gentle ambient loops on coat and hair
 * - Dokja reading webnovel on phone with eyes cast downward
 * - Phone cyan glow softly pulsing
 * - SCROLL hint visible at 0% scroll
 */
export function setupStage1(
  introTl: gsap.core.Timeline,
  container: HTMLElement,
  options: StageOptions,
  hooks: StageCallbackHooks
): void {
  const coat = container.querySelector(".dokja-layer-coat");
  const hair = container.querySelector(".dokja-layer-hair");
  const eyesReading = container.querySelector(".dokja-eyes-reading");
  const eyesNotice = container.querySelector(".dokja-eyes-notice");
  const browIrritated = container.querySelector(".dokja-brow-irritated");
  const glow = container.querySelector(".dokja-layer-glow");
  const horns = container.querySelector(".dokja-layer-horns");
  const hornsRedRim = container.querySelector(".dokja-horns-red-rim");
  const wingBackL = container.querySelector(".dokja-wing-back-l");
  const wingBackR = container.querySelector(".dokja-wing-back-r");
  const wingFrontL = container.querySelector(".dokja-wing-front-l");
  const wingFrontR = container.querySelector(".dokja-wing-front-r");
  const starRing = container.querySelector(".hero-star-ring");
  const systemWindow = container.querySelector(".hero-system-window");
  const scrollHint = container.querySelector(".hero-scroll-hint");

  // Transform origins for articulation
  if (wingBackL) gsap.set(wingBackL, { transformOrigin: "140px 160px" });
  if (wingBackR) gsap.set(wingBackR, { transformOrigin: "180px 160px" });
  if (wingFrontL) gsap.set(wingFrontL, { transformOrigin: "140px 160px" });
  if (wingFrontR) gsap.set(wingFrontR, { transformOrigin: "180px 160px" });
  if (horns) gsap.set(horns, { transformOrigin: "160px 94px" });
  if (starRing) gsap.set(starRing, { transformOrigin: "center center" });

  // Subtle continuous ambient micro-motion loops (transform only)
  if (coat) {
    gsap.to(coat, {
      rotation: 0.9,
      x: 1,
      duration: 4.6,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      transformOrigin: "top center",
    });
  }

  if (hair) {
    gsap.to(hair, {
      y: -1.2,
      rotation: 0.6,
      duration: 5.2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      transformOrigin: "top center",
    });
  }

  // Initial visual states
  gsap.set(eyesReading, { opacity: 1 });
  gsap.set(eyesNotice, { opacity: 0 });
  gsap.set(browIrritated, { opacity: 0 });
  gsap.set(systemWindow, { opacity: 0, y: -10 });
  // SCROLL hint is visible at 0% scroll
  gsap.set(scrollHint, { opacity: 1 });
  gsap.set(horns, { scale: 0.45 });
  gsap.set(hornsRedRim, { opacity: 0 });
  gsap.set(starRing, { opacity: 0, scale: 0.65, rotation: 0 });

  if (options.mode === "light") {
    gsap.set([wingFrontL, wingFrontR], { opacity: 0, scale: 0 });
    gsap.set([wingBackL, wingBackR], {
      scale: 0.2,
      opacity: 0,
      rotation: 0,
      x: 0,
      transformOrigin: "center center",
    });
  } else {
    gsap.set(wingBackL, { scale: 0.2, opacity: 0, rotation: 24 });
    gsap.set(wingBackR, { scale: 0.2, opacity: 0, rotation: -24 });
    gsap.set(wingFrontL, { scale: 0.2, opacity: 0, rotation: 28 });
    gsap.set(wingFrontR, { scale: 0.2, opacity: 0, rotation: -28 });
  }

  // Append Stage 1 keyframes to intro timeline (0.0s – 2.5s)
  introTl.call(() => {
    hooks.setStage(1);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("constellation:dismiss"));
    }
  }, [], 0);

  if (glow) {
    introTl.to(
      glow,
      {
        scale: 1.05,
        opacity: 0.6,
        duration: 1.25,
        yoyo: true,
        repeat: 1,
        ease: "sine.inOut",
        transformOrigin: "center",
      },
      0.2
    );
  }
}
