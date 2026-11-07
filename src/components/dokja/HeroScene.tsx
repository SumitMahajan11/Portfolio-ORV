"use client";

import React, { useRef, useEffect, useState, useContext } from "react";
import { useMode } from "@/lib/flags";
import { Biyoo } from "@/components/biyoo";
import { useHeroContext, HeroProvider, HeroContext } from "./hero-context";
import { DokjaFigure } from "./dokja-figure";
import { HeroLayers } from "./hero-layers";
import { HeroHud } from "./hero-hud";
import { HeroReduced } from "./hero-reduced";

export interface HeroSceneProps {
  className?: string;
}

export function HeroSceneContent({ className = "" }: HeroSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const introTimelineRef = useRef<{ timeScale: (v: number) => void } | null>(null);
  const introDoneRef = useRef(false);

  const [glitchActive, setGlitchActive] = useState(false);
  const [glitchVisible, setGlitchVisible] = useState(false);

  const { mode, reducedMotion, particleCap, signals, isHydrated } = useMode();
  const { heroState, setHeroState } = useHeroContext();

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

  // Refresh ScrollTrigger after window loads and document fonts settle cleanly
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onReady = () => {
      const ST = (
        window as unknown as { ScrollTrigger?: { refresh: () => void } }
      ).ScrollTrigger;
      if (ST && typeof ST.refresh === "function") {
        ST.refresh();
      }
    };

    if (document.readyState === "complete") {
      if (document.fonts) {
        document.fonts.ready.then(onReady);
      }
    } else {
      window.addEventListener("load", onReady, { once: true });
      return () => window.removeEventListener("load", onReady);
    }
  }, []);

  // Main Motion Choreography: Defer GSAP & ScrollTrigger loading until after first paint
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isHydrated && reducedMotion) {
      setHeroState({ stage: 1, scrollProgress: 0, introDone: true });
      return;
    }

    let isMounted = true;
    let cleanupMotion: (() => void) | undefined;

    const initMotion = () => {
      requestAnimationFrame(() => {
        import("./hero-motion").then(({ initHeroMotion }) => {
          if (!isMounted || !containerRef.current) return;

          const motion = initHeroMotion(containerRef.current, {
            mode,
            isTouch: signals.isTouch,
            reducedMotion,
            onStageChange: (stage) => {
              setHeroState((prev) => ({ ...prev, stage }));
            },
            onProgress: (p, stage) => {
              setHeroState((prev) => ({ ...prev, stage, scrollProgress: p }));
            },
            onIntroDone: () => {
              setHeroState((prev) => ({ ...prev, stage: 3, introDone: true }));
            },
            onGlitch: (active) => {
              if (active) {
                setGlitchVisible(true);
                setGlitchActive(true);
                setTimeout(() => setGlitchActive(false), 750);
              } else {
                setGlitchVisible(false);
                setGlitchActive(false);
              }
            },
            onBiyooWake: (progress) => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("biyoo:wake", { detail: { stage: 7, progress } })
                );
              }
            },
          });

          introTimelineRef.current = motion.introTimeline;
          cleanupMotion = motion.destroy;
        });
      });
    };

    initMotion();

    return () => {
      isMounted = false;
      cleanupMotion?.();
    };
  }, [mode, reducedMotion, signals.isTouch, isHydrated, setHeroState]);

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
          glitchActive={glitchActive}
          glitchVisible={glitchVisible}
        />

        {/* Floating Companion Biyoo in Bottom-Left Safe Area */}
        <div
          id="hero-biyoo-companion"
          className="pointer-events-auto absolute z-40 transition-transform duration-300"
          style={{
            left: "calc(16px + env(safe-area-inset-left))",
            bottom: "calc(16px + env(safe-area-inset-bottom))",
          }}
        >
          <Biyoo />
        </div>
      </section>
    </div>
  );
}

export function HeroScene(props: HeroSceneProps) {
  const context = useContext(HeroContext);
  if (!context) {
    return (
      <HeroProvider>
        <HeroSceneContent {...props} />
      </HeroProvider>
    );
  }
  return <HeroSceneContent {...props} />;
}
