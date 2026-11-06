"use client";

import React, { useRef, useEffect, useState, useContext } from "react";
import { useMode } from "@/lib/flags";
import { useScene, gsap, ScrollTrigger, DEFAULT_SCRUB } from "@/lib/motion";
import { Biyoo } from "@/components/biyoo";
import { useReaderTracker } from "@/lib/reader";
import { useHeroContext, HeroProvider, HeroContext, HeroStage } from "./hero-context";
import { DokjaFigure } from "./dokja-figure";
import { HeroLayers } from "./hero-layers";
import { HeroHud } from "./hero-hud";
import { HeroReduced } from "./hero-reduced";
import { setupStage1 } from "./stages/stage-1-reading";
import { setupStage2 } from "./stages/stage-2-notices";
import { setupStage3 } from "./stages/stage-3-irritation";
import { setupStage4 } from "./stages/stage-4-horns";
import { setupStage5 } from "./stages/stage-5-wings-emerge";
import { setupStage6 } from "./stages/stage-6-wings-expand";
import { setupStage7 } from "./stages/stage-7-final-form";

export interface HeroSceneProps {
  className?: string;
}

export function HeroSceneContent({ className = "" }: HeroSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const introTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const introDoneRef = useRef(false);
  const crossed85Ref = useRef(false);

  const [glitchActive, setGlitchActive] = useState(false);
  const [glitchVisible, setGlitchVisible] = useState(false);

  const { mode, reducedMotion, particleCap, signals, isHydrated } = useMode();
  const { heroState, setHeroState } = useHeroContext();
  const readerSignals = useReaderTracker();

  useEffect(() => {
    introDoneRef.current = heroState.introDone;
  }, [heroState.introDone]);

  // Fast-forward listener: accelerates the intro timeline cleanly on user scroll/touch
  useEffect(() => {
    if (reducedMotion || heroState.introDone) return;

    const triggerFastForward = () => {
      if (introTimelineRef.current && !introDoneRef.current) {
        introTimelineRef.current.timeScale(8);
      }
    };

    window.addEventListener("wheel", triggerFastForward, { passive: true });
    window.addEventListener("touchmove", triggerFastForward, { passive: true });
    window.addEventListener("pointerdown", triggerFastForward, { passive: true });

    return () => {
      window.removeEventListener("wheel", triggerFastForward);
      window.removeEventListener("touchmove", triggerFastForward);
      window.removeEventListener("pointerdown", triggerFastForward);
    };
  }, [reducedMotion, heroState.introDone]);

  // Expose ScrollTrigger for test runners and verification harnesses
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { ScrollTrigger: typeof ScrollTrigger }).ScrollTrigger =
        ScrollTrigger;
    }
  }, []);

  // Refresh ScrollTrigger after fonts settle
  useEffect(() => {
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
    const timer = setTimeout(() => ScrollTrigger.refresh(), 300);
    return () => clearTimeout(timer);
  }, []);

  // Main Motion Choreography: Intro Timeline + Master Pinned ScrollTrigger
  useScene(
    () => {
      if (isHydrated && reducedMotion) {
        setHeroState({ stage: 1, scrollProgress: 0, introDone: true });
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      const stageOptions = {
        mode,
        isTouch: signals.isTouch,
        reducedMotion,
      };

      const stageHooks = {
        setStage: (stage: HeroStage) => {
          setHeroState((prev) => ({ ...prev, stage }));
        },
      };

      // 1. Intro Animation Timeline (Stages 1-3)
      const introTl = gsap.timeline({
        onComplete: () => {
          setHeroState((prev) => ({ ...prev, stage: 3, introDone: true }));
        },
      });
      introTimelineRef.current = introTl;

      setupStage1(introTl, container, stageOptions, stageHooks);
      setupStage2(introTl, container, stageHooks);
      setupStage3(introTl, container, stageHooks);

      // 2. Master ScrollTrigger Timeline (Stages 4-7)
      const pinDistance = signals.isTouch ? "+=200%" : "+=300%";
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

            setHeroState((prev) => ({ ...prev, stage, scrollProgress: p }));

            if (p >= 0.85 && self.direction === 1) {
              if (!crossed85Ref.current) {
                crossed85Ref.current = true;
                setGlitchVisible(true);
                setGlitchActive(true);
                setTimeout(() => setGlitchActive(false), 750);
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("biyoo:wake", { detail: { stage: 7, progress: p } })
                  );
                }
              }
            } else if (p < 0.85) {
              crossed85Ref.current = false;
              if (self.direction === -1) {
                setGlitchVisible(false);
                setGlitchActive(false);
              }
            }
          },
        },
      });

      setupStage4(masterTl, container);
      setupStage5(masterTl, container, stageOptions);
      setupStage6(masterTl, container, stageOptions);
      setupStage7(masterTl, container);
    },
    {
      scope: containerRef,
      dependencies: [mode, reducedMotion, signals.isTouch],
    }
  );

  return (
    <div id="hero-scene-container" className="w-full relative z-10 overflow-x-clip">
      {/* Reduced Motion 3-Frame Storyboard */}
      <div style={{ display: reducedMotion ? "block" : "none" }}>
        <HeroReduced className={className} />
      </div>

      {/* Pinned 100dvh Master Hero Container */}
      <section
        ref={containerRef}
        id="hero-scene"
        style={{ display: reducedMotion ? "none" : undefined }}
        className={`relative w-full h-[100dvh] min-h-[100dvh] max-h-[100dvh] overflow-hidden bg-void select-none flex items-center justify-center ${className}`}
        aria-label="Omniscient Reader's Viewpoint Hero Prologue"
      >
        <HeroLayers
          mode={mode}
          particleCap={particleCap}
          isTouch={signals.isTouch}
        />

        <div className="relative z-10">
          <DokjaFigure />
        </div>

        <HeroHud
          glitchVisible={glitchVisible}
          glitchActive={glitchActive}
        />

        <div
          data-layer="biyoo"
          className="absolute z-35 pointer-events-auto"
          style={{
            bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
            left: "calc(12px + env(safe-area-inset-left, 0px))",
          }}
        >
          <Biyoo
            size={signals.isTouch ? 100 : 150}
            introDone={heroState.introDone}
            idleSeconds={readerSignals.idleSeconds}
            scrollSpeed={readerSignals.scrollSpeed}
            pointerPosition={readerSignals.pointerPosition}
            localHour={readerSignals.localHour}
            hoverTarget={readerSignals.hoverTarget}
          />
        </div>
      </section>
    </div>
  );
}

export function HeroScene({ className = "" }: HeroSceneProps) {
  const context = useContext(HeroContext);
  if (!context) {
    return (
      <HeroProvider>
        <HeroSceneContent className={className} />
      </HeroProvider>
    );
  }
  return <HeroSceneContent className={className} />;
}

export default HeroScene;
