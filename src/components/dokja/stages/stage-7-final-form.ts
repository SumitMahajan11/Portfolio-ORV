import { gsap } from "@/lib/motion";

/**
 * Stage 7: Final Form & Clean Handoff
 * Master scroll scrub phase (85% – 100% progress):
 * - Dokja figure reaches apex awakening (scale 1.06)
 * - Drifting feather motes float downward toward screen bottom
 * - Dokja figure and star ring fade out completely at 93%–97%
 * - Hero pinned container fades out to opacity 0 at 96%–100%
 * - NO mock shatter cards or ghost tiles; completely unpinned before Scenario Select enters
 */
export function setupStage7(
  masterTl: gsap.core.Timeline,
  container: HTMLElement
): void {
  const dokjaFigure = container.querySelector(".hero-dokja-figure");
  const starRing = container.querySelector(".hero-star-ring");
  const featherDrift = container.querySelector(".hero-feather-drift");

  if (dokjaFigure) {
    masterTl.to(
      dokjaFigure,
      {
        scale: 1.06,
        duration: 15,
        ease: "power2.out",
      },
      85
    );
  }

  // Drifting feather motes bridging to Scenario Select
  if (featherDrift) {
    masterTl.to(
      featherDrift,
      {
        opacity: 0.9,
        y: 40,
        duration: 12,
        ease: "power1.out",
      },
      85
    );
    masterTl.to(
      featherDrift,
      {
        opacity: 0,
        y: 80,
        duration: 5,
        ease: "power2.in",
      },
      95
    );
  }

  // Fade out Dokja figure and star ring cleanly before Scenario Select appears
  const activeHeroElements = [dokjaFigure, starRing].filter(Boolean);
  if (activeHeroElements.length > 0) {
    masterTl.to(
      activeHeroElements,
      {
        opacity: 0,
        duration: 7,
        ease: "power2.inOut",
      },
      93
    );
  }

  // Fade out the entire pinned container by 100% so zero ghost elements overlap the real cards
  masterTl.to(
    container,
    {
      opacity: 0,
      duration: 4,
      ease: "power2.out",
    },
    96
  );
}
