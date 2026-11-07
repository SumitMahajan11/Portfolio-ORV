import { gsap, ScrollTrigger, DEFAULT_SCRUB, registerMotionPlugins } from "@/lib/motion";
import type { DeviceMode } from "@/lib/device";
import type { HeroStage } from "./hero-context";
import { setupStage1 } from "./stages/stage-1-reading";
import { setupStage2 } from "./stages/stage-2-notices";
import { setupStage3 } from "./stages/stage-3-irritation";
import { setupStage4 } from "./stages/stage-4-horns";
import { setupStage5 } from "./stages/stage-5-wings-emerge";
import { setupStage6 } from "./stages/stage-6-wings-expand";
import { setupStage7 } from "./stages/stage-7-final-form";

export interface HeroMotionOptions {
  mode: DeviceMode;
  isTouch: boolean;
  reducedMotion: boolean;
  onStageChange: (stage: HeroStage) => void;
  onProgress: (progress: number, stage: HeroStage) => void;
  onIntroDone: () => void;
  onGlitch: (active: boolean) => void;
  onBiyooWake: (progress: number) => void;
}

export function initHeroMotion(
  container: HTMLElement,
  options: HeroMotionOptions
): {
  introTimeline: gsap.core.Timeline;
  masterTimeline: gsap.core.Timeline;
  destroy: () => void;
} {
  registerMotionPlugins();

  if (typeof window !== "undefined") {
    (window as unknown as { ScrollTrigger: typeof ScrollTrigger }).ScrollTrigger = ScrollTrigger;
  }

  const stageOptions = {
    mode: options.mode,
    isTouch: options.isTouch,
    reducedMotion: options.reducedMotion,
  };

  const stageHooks = {
    setStage: (stage: HeroStage) => {
      options.onStageChange(stage);
    },
  };

  // 1. Intro Animation Timeline (Stages 1-3)
  const introTl = gsap.timeline({
    onComplete: () => {
      options.onIntroDone();
    },
  });

  setupStage1(introTl, container, stageOptions, stageHooks);
  setupStage2(introTl, container, stageHooks);
  setupStage3(introTl, container, stageHooks);

  // 2. Master ScrollTrigger Timeline (Stages 4-7)
  let crossed85 = false;
  const pinDistance = options.isTouch ? "+=200%" : "+=300%";
  const masterTl = gsap.timeline({
    scrollTrigger: {
      trigger: container,
      start: "top top",
      end: pinDistance,
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      scrub: DEFAULT_SCRUB,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;
        const stage: HeroStage =
          p < 0.25 ? 4 : p < 0.55 ? 5 : p < 0.85 ? 6 : 7;

        options.onProgress(p, stage);

        if (p >= 0.85 && self.direction === 1) {
          if (!crossed85) {
            crossed85 = true;
            options.onGlitch(true);
            options.onBiyooWake(p);
          }
        } else if (p < 0.85) {
          crossed85 = false;
          if (self.direction === -1) {
            options.onGlitch(false);
          }
        }
      },
    },
  });

  setupStage4(masterTl, container);
  setupStage5(masterTl, container, stageOptions);
  setupStage6(masterTl, container, stageOptions);
  setupStage7(masterTl, container);

  ScrollTrigger.refresh();

  return {
    introTimeline: introTl,
    masterTimeline: masterTl,
    destroy: () => {
      introTl.kill();
      masterTl.kill();
      if (masterTl.scrollTrigger) {
        masterTl.scrollTrigger.kill(true);
      }
    },
  };
}

