import { gsap } from "@/lib/motion";

/**
 * Stage 4: Horns Grow
 * Master scroll scrub phase (0% – 25% progress):
 * - SCROLL hint disappears immediately on initial scroll
 * - System notification toast fades out cleanly
 * - Dark red-black horns scale up from 0.45 to 1.15
 * - Dedicated red rim stroke fades in (zero heavy animated filters)
 */
export function setupStage4(
  masterTl: gsap.core.Timeline,
  container: HTMLElement
): void {
  const scrollHint = container.querySelector(".hero-scroll-hint");
  const systemWindow = container.querySelector(".hero-system-window");
  const horns = container.querySelector(".dokja-layer-horns");
  const hornsRedRim = container.querySelector(".dokja-horns-red-rim");
  const glow = container.querySelector(".dokja-layer-glow");

  if (scrollHint) {
    masterTl.to(
      scrollHint,
      {
        opacity: 0,
        duration: 1,
        ease: "power2.out",
      },
      0
    );
  }

  if (systemWindow) {
    masterTl.to(
      systemWindow,
      {
        opacity: 0,
        duration: 3,
        ease: "power2.out",
      },
      0
    );
  }

  if (horns) {
    masterTl.to(
      horns,
      {
        scale: 1.15,
        duration: 25,
        ease: "power2.out",
      },
      0
    );
  }

  if (hornsRedRim) {
    masterTl.to(
      hornsRedRim,
      {
        opacity: 1,
        duration: 25,
        ease: "power2.out",
      },
      0
    );
  }

  if (glow) {
    masterTl.to(
      glow,
      {
        scale: 1.35,
        opacity: 0.75,
        duration: 25,
        ease: "power2.out",
      },
      0
    );
  }
}
