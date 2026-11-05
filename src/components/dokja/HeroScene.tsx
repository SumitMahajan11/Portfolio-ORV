"use client";

import React, { useRef, useEffect, useState } from "react";
import { useMode } from "@/lib/flags";
import { useScene, gsap, ScrollTrigger, DEFAULT_SCRUB } from "@/lib/motion";
import { Biyoo } from "@/components/biyoo";
import { useReaderTracker } from "@/lib/reader";
import { SystemWindow } from "@/components/system-window";
import { useHeroContext, HeroProvider, HeroContext, HeroStage } from "./hero-context";
import { PARTICLES_DATA } from "./particles-data";

// Deterministic star sets for 3 parallax layers (prevents hydration mismatches)
const STARS_LAYER_1 = [
  { top: "10%", left: "12%", size: 1, opacity: 0.35 },
  { top: "18%", left: "82%", size: 1.5, opacity: 0.4 },
  { top: "25%", left: "28%", size: 1, opacity: 0.3 },
  { top: "35%", left: "68%", size: 1, opacity: 0.35 },
  { top: "48%", left: "88%", size: 1.5, opacity: 0.45 },
  { top: "62%", left: "14%", size: 1, opacity: 0.3 },
  { top: "75%", left: "78%", size: 1.5, opacity: 0.4 },
  { top: "82%", left: "32%", size: 1, opacity: 0.35 },
  { top: "90%", left: "62%", size: 1, opacity: 0.3 },
];

const STARS_LAYER_2 = [
  { top: "14%", left: "45%", size: 1.5, opacity: 0.5 },
  { top: "22%", left: "92%", size: 2, opacity: 0.6 },
  { top: "38%", left: "18%", size: 1.5, opacity: 0.55 },
  { top: "54%", left: "75%", size: 2, opacity: 0.65 },
  { top: "68%", left: "40%", size: 1.5, opacity: 0.5 },
  { top: "86%", left: "85%", size: 2, opacity: 0.6 },
  { top: "94%", left: "18%", size: 1.5, opacity: 0.5 },
];

const STARS_LAYER_3 = [
  { top: "8%", left: "70%", size: 2.5, opacity: 0.8 },
  { top: "30%", left: "8%", size: 2, opacity: 0.75 },
  { top: "45%", left: "52%", size: 2.5, opacity: 0.85 },
  { top: "72%", left: "25%", size: 2, opacity: 0.75 },
  { top: "88%", left: "72%", size: 2.5, opacity: 0.8 },
];

const STAR_RING_NODES = [
  { deg: 0, cx: 400, cy: 220 },
  { deg: 30, cx: 375.9, cy: 310 },
  { deg: 60, cx: 310, cy: 375.9 },
  { deg: 90, cx: 220, cy: 400 },
  { deg: 120, cx: 130, cy: 375.9 },
  { deg: 150, cx: 64.1, cy: 310 },
  { deg: 180, cx: 40, cy: 220 },
  { deg: 210, cx: 64.1, cy: 130 },
  { deg: 240, cx: 130, cy: 64.1 },
  { deg: 270, cx: 220, cy: 40 },
  { deg: 300, cx: 310, cy: 64.1 },
  { deg: 330, cx: 375.9, cy: 130 },
];

// Deterministic particle set capped per mode: desktop <= 120, mobile <= 40, light <= 15, reduced = 0
// Sourced from ./particles-data (120 deterministic particles)

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

  // Local-only reader tracker: idle seconds, scroll speed, pointer pos, hover, local hour
  const readerSignals = useReaderTracker();

  // Active particle set capped per mode according to /docs/02 performance budget
  const activeParticles = PARTICLES_DATA.slice(
    0,
    Math.min(particleCap, PARTICLES_DATA.length)
  );

  // Sync ref with context state
  useEffect(() => {
    introDoneRef.current = heroState.introDone;
  }, [heroState.introDone]);

  // Fast-forward listener: accelerates the intro timeline cleanly on first scroll input
  useEffect(() => {
    if (reducedMotion || heroState.introDone) {
      return;
    }

    const triggerFastForward = () => {
      if (introTimelineRef.current && !introDoneRef.current) {
        introTimelineRef.current.timeScale(8);
      }
    };

    const handleWheel = () => triggerFastForward();
    const handleTouchMove = () => triggerFastForward();
    const handlePointerDown = () => triggerFastForward();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === " " ||
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "PageDown" ||
        e.key === "PageUp"
      ) {
        triggerFastForward();
      }
    };

    // Passive listeners: NEVER call preventDefault on scroll input
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [reducedMotion, heroState.introDone]);

  // ScrollTrigger refresh after document fonts load and layout settles
  useEffect(() => {
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(() => {
        ScrollTrigger.refresh();
      });
    }

    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Main Intro Animation Timeline + Master ScrollTrigger Timeline using useScene
  useScene(
    () => {
      // In reduced motion mode: strictly no ScrollTrigger pinning or scrubbing
      if (isHydrated && reducedMotion) {
        setHeroState({
          stage: 1,
          scrollProgress: 0,
          introDone: true,
        });
        return;
      }

      if (!containerRef.current) return;

      const coat = containerRef.current.querySelector(".dokja-layer-coat");
      const hair = containerRef.current.querySelector(".dokja-layer-hair");
      const eyesReading = containerRef.current.querySelector(".dokja-eyes-reading");
      const eyesNotice = containerRef.current.querySelector(".dokja-eyes-notice");
      const browIrritated = containerRef.current.querySelector(".dokja-brow-irritated");
      const phone = containerRef.current.querySelector(".dokja-layer-phone");
      const glow = containerRef.current.querySelector(".dokja-layer-glow");
      const body = containerRef.current.querySelector(".dokja-layer-body");
      const systemWindow = containerRef.current.querySelector(".hero-system-window");
      const scrollHint = containerRef.current.querySelector(".hero-scroll-hint");

      // Transformation elements (stages 4-7)
      const horns = containerRef.current.querySelector(".dokja-layer-horns");
      const hornsRedRim = containerRef.current.querySelector(".dokja-horns-red-rim");
      const wingBackL = containerRef.current.querySelector(".dokja-wing-back-l");
      const wingBackR = containerRef.current.querySelector(".dokja-wing-back-r");
      const wingFrontL = containerRef.current.querySelector(".dokja-wing-front-l");
      const wingFrontR = containerRef.current.querySelector(".dokja-wing-front-r");
      const starRing = containerRef.current.querySelector(".hero-star-ring");
      const shatterTiles = containerRef.current.querySelectorAll(".shatter-tile");
      const dokjaFigure = containerRef.current.querySelector(".hero-dokja-figure");

      // Set shoulder pivot origins for wings
      if (wingBackL) gsap.set(wingBackL, { transformOrigin: "140px 160px" });
      if (wingBackR) gsap.set(wingBackR, { transformOrigin: "180px 160px" });
      if (wingFrontL) gsap.set(wingFrontL, { transformOrigin: "140px 160px" });
      if (wingFrontR) gsap.set(wingFrontR, { transformOrigin: "180px 160px" });
      if (horns) gsap.set(horns, { transformOrigin: "160px 94px" });
      if (starRing) gsap.set(starRing, { transformOrigin: "center center" });

      // Stage 1 Micro-motions: 4-6s smooth continuous loops (transforms only)
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

      // Initial visual states for auto-play intro
      gsap.set(eyesReading, { opacity: 1 });
      gsap.set(eyesNotice, { opacity: 0 });
      gsap.set(browIrritated, { opacity: 0 });
      gsap.set(systemWindow, { opacity: 0, y: -10 });
      gsap.set(scrollHint, { opacity: 0 });

      // Initial visual states for stages 4-7 elements
      gsap.set(horns, { scale: 0.45 });
      gsap.set(hornsRedRim, { opacity: 0 });

      // In light mode: wings as ONE layer using scale/opacity (no rotation)
      if (mode === "light") {
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

      gsap.set(starRing, { opacity: 0, scale: 0.65, rotation: 0 });
      gsap.set(shatterTiles, {
        opacity: 0,
        y: -30,
        scale: 0.7,
        rotation: (idx: number) => (idx % 2 === 0 ? -5 : 5),
      });

      // =========================================================
      // TIMELINE 1: Auto-Play Intro (Stages 1-3, duration: ~7.2s)
      // =========================================================
      const introTl = gsap.timeline({
        onComplete: () => {
          setHeroState((prev) => ({
            ...prev,
            stage: 3,
            introDone: true,
          }));
        },
      });

      introTimelineRef.current = introTl;

      // STAGE 1: Reading (0.0s - 2.5s)
      introTl.call(() => {
        setHeroState((prev) => ({ ...prev, stage: 1, introDone: false }));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("constellation:dismiss"));
        }
      }, [], 0);

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

      // STAGE 2: Notices You (2.5s)
      introTl.call(() => {
        setHeroState((prev) => ({ ...prev, stage: 2 }));
      }, [], 2.5);

      introTl.to(
        eyesReading,
        {
          opacity: 0,
          duration: 0.2,
          ease: "power2.out",
        },
        2.5
      );

      introTl.to(
        eyesNotice,
        {
          opacity: 1,
          duration: 0.25,
          ease: "power2.out",
        },
        2.55
      );

      introTl.to(
        [phone, glow],
        {
          y: 12,
          duration: 0.6,
          ease: "power2.out",
        },
        2.55
      );

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

      // STAGE 3: Irritation (5.0s)
      introTl.call(() => {
        setHeroState((prev) => ({ ...prev, stage: 3 }));
      }, [], 5.0);

      introTl.to(
        browIrritated,
        {
          opacity: 1,
          duration: 0.3,
          ease: "power2.out",
        },
        5.0
      );

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

      introTl.to(
        scrollHint,
        {
          opacity: 1,
          duration: 0.5,
          ease: "power2.out",
        },
        6.6
      );

      // =========================================================
      // TIMELINE 2: Master ScrollTrigger Timeline (Stages 4-7)
      // Pinned HeroScene, scrub: 0.6, pinSpacing: true
      // Progress mapping:
      //   0 - 25%: Stage 4 (horns grow, red rim light)
      //  25 - 55%: Stage 5 (wings emerge, rotate from shoulder pivots)
      //  55 - 85%: Stage 6 (wings expand past edges, star ring orbits)
      //  85 - 100%: Stage 7 (final form, glitch text, shatter grid)
      // =========================================================
      const pinDistance = signals.isTouch ? "+=200%" : "+=300%";

      const masterTl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: pinDistance,
          pin: true,
          pinSpacing: true,
          scrub: DEFAULT_SCRUB, // 0.6 per /docs/02
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const p = self.progress;

            // Map progress ranges exactly
            let stage: HeroStage = 4;
            if (p < 0.25) {
              stage = 4;
            } else if (p < 0.55) {
              stage = 5;
            } else if (p < 0.85) {
              stage = 6;
            } else {
              stage = 7;
            }

            setHeroState((prev) => ({
              ...prev,
              stage,
              scrollProgress: p,
            }));

            // Immediately hide scroll hint once scrolling begins
            if (p > 0.005 && scrollHint) {
              (scrollHint as HTMLElement).style.opacity = "0";
              (scrollHint as HTMLElement).style.pointerEvents = "none";
            }

            // Glitch text trigger: plays each time progress crosses 85% going forward
            if (p >= 0.85 && self.direction === 1) {
              if (!crossed85Ref.current) {
                crossed85Ref.current = true;
                setGlitchVisible(true);
                setGlitchActive(true);

                // CSS-only glitch duration: 750ms (within 600-900ms)
                setTimeout(() => {
                  setGlitchActive(false);
                }, 750);

                // Biyoo wake/startle hook event for P1-3
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("biyoo:wake", {
                      detail: { stage: 7, progress: p },
                    })
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

      // Clear scroll hint instantly on initial scroll input, fade system window quickly
      masterTl.to(
        scrollHint,
        {
          opacity: 0,
          duration: 1,
          ease: "power2.out",
        },
        0
      );

      masterTl.to(
        systemWindow,
        {
          opacity: 0,
          duration: 3,
          ease: "power2.out",
        },
        0
      );

      // ---------------------------------------------------------
      // STAGE 4: Horns Grow (0% to 25% progress)
      // Scale/opacity grow with thin red rim light (NO animated filter)
      // ---------------------------------------------------------
      masterTl.to(
        horns,
        {
          scale: 1.15,
          duration: 25,
          ease: "power2.out",
        },
        0
      );

      masterTl.to(
        hornsRedRim,
        {
          opacity: 1,
          duration: 25,
          ease: "power2.out",
        },
        0
      );

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

      // ---------------------------------------------------------
      // STAGE 5: Wings Emerge (25% to 55% progress)
      // Light mode: wings as ONE layer using scale/opacity
      // Full mode: split back/front layers, rotate from shoulder pivots, slow/heavy easing
      // ---------------------------------------------------------
      if (mode === "light") {
        masterTl.to(
          [wingBackL, wingBackR],
          {
            scale: 1.0,
            opacity: 0.9,
            duration: 30,
            ease: "power2.inOut",
          },
          25
        );
      } else {
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

      // ---------------------------------------------------------
      // STAGE 6: Wings Expand (55% to 85% progress)
      // Light mode: scale/opacity expand only; static star ring (no orbit)
      // Full mode: wings pass viewport edges; star ring orbits
      // ---------------------------------------------------------
      if (mode === "light") {
        masterTl.to(
          [wingBackL, wingBackR],
          {
            scale: 1.45,
            opacity: 1.0,
            duration: 30,
            ease: "power2.out",
          },
          55
        );

        // Static star ring without orbit per P1-7
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
      } else {
        const wingExpansionScale = signals.isTouch ? 1.45 : 1.65;
        const wingShiftX = signals.isTouch ? 45 : 55;

        masterTl.to(
          wingBackL,
          {
            scale: wingExpansionScale,
            x: -wingShiftX,
            rotation: -12,
            duration: 30,
            ease: "power2.out",
          },
          55
        );

        masterTl.to(
          wingBackR,
          {
            scale: wingExpansionScale,
            x: wingShiftX,
            rotation: 12,
            duration: 30,
            ease: "power2.out",
          },
          55
        );

        masterTl.to(
          wingFrontL,
          {
            scale: wingExpansionScale,
            x: -wingShiftX,
            rotation: -12,
            duration: 30,
            ease: "power2.out",
          },
          55
        );

        masterTl.to(
          wingFrontR,
          {
            scale: wingExpansionScale,
            x: wingShiftX,
            rotation: 12,
            duration: 30,
            ease: "power2.out",
          },
          55
        );

        // Constellation star ring fades in and orbits (rotation on single wrapper)
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

      // ---------------------------------------------------------
      // STAGE 7: Final Form (85% to 100% progress)
      // Feathers drift and form the 3-column page grid
      // ---------------------------------------------------------
      masterTl.to(
        dokjaFigure,
        {
          scale: 1.06,
          duration: 15,
          ease: "power2.out",
        },
        85
      );

      masterTl.to(
        shatterTiles,
        {
          opacity: 1,
          y: 0,
          scale: 1.0,
          rotation: 0,
          stagger: 0.02,
          duration: 10,
          ease: "power2.out",
        },
        85
      );

      // Fade out Dokja figure and star-ring fully before Scenario Select grid enters
      masterTl.to(
        [dokjaFigure, starRing],
        {
          opacity: 0,
          duration: 7,
          ease: "power2.inOut",
        },
        93
      );

      // Fade out the entire hero pinned layer by 100% so no ghost layers overlap the grid
      masterTl.to(
        containerRef.current,
        {
          opacity: 0,
          duration: 4,
          ease: "power2.out",
        },
        96
      );
    },
    {
      scope: containerRef,
      dependencies: [mode, reducedMotion, signals.isTouch],
    }
  );

  return (
    <div id="hero-scene-container" className="w-full relative z-10 overflow-x-clip">
      {/* STATIC FALLBACK FOR REDUCED MOTION (Requirement 2) */}
      {/* Both containers always in DOM to prevent GSAP pin-spacer reconciliation mismatch */}
      <div
        id="hero-scene-reduced"
        style={{ display: reducedMotion ? "flex" : "none" }}
        className={`w-full bg-void text-feather flex-col items-center py-12 px-4 space-y-24 ${className}`}
        aria-label="Dokja Transformation - Reduced Motion Accessible Overview"
      >
        {/* Frame 1: Stage 1 (Reading) */}
        <section
          aria-labelledby="reduced-frame-1-title"
          className="w-full max-w-3xl flex flex-col items-center text-center space-y-6 border-b border-line pb-16"
        >
          <span className="font-mono text-xs uppercase tracking-widest text-star">
            [STAGE 1: READING]
          </span>
          <h2
            id="reduced-frame-1-title"
            className="font-display text-2xl sm:text-3xl font-bold text-feather"
          >
            A Reader in the Starlit Void
          </h2>
          <div className="relative w-[280px] h-[360px] flex items-center justify-center">
            <svg
              viewBox="0 0 320 400"
              fill="none"
              className="w-full h-full drop-shadow-xl"
            >
              <defs>
                <radialGradient id="rm_glow_1" cx="160" cy="245" r="70">
                  <stop offset="0%" stopColor="#5EE1E6" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#5EE1E6" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="160" cy="245" r="65" fill="url(#rm_glow_1)" />
              {/* Simplified static Dokja body */}
              <rect x="135" y="280" width="50" height="85" fill="#0E1118" stroke="#243044" />
              <path d="M 130 150 L 115 220 L 110 330 L 210 330 L 205 220 L 190 150 Z" fill="#F4F6FA" stroke="#9FB4D6" />
              <rect x="153" y="132" width="14" height="15" fill="#E2D6CB" />
              <circle cx="160" cy="118" r="18" fill="#F0E3D7" />
              <path d="M 144 110 C 142 90, 150 82, 160 82 C 170 82, 178 90, 176 110 Z" fill="#0E1118" />
              {/* Phone */}
              <rect x="151" y="230" width="18" height="30" rx="2.5" fill="#0E1118" stroke="#243044" />
              <rect x="153" y="233" width="14" height="24" rx="1.5" fill="#5EE1E6" />
            </svg>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="max-w-sm">
              <SystemWindow title="SYSTEM NOTIFICATION">
                <p className="text-xs text-star">A Reader has been detected.</p>
              </SystemWindow>
            </div>
            <Biyoo size={110} />
          </div>
        </section>

        {/* Frame 2: Stage 5 (Wings Emerge) */}
        <section
          aria-labelledby="reduced-frame-2-title"
          className="w-full max-w-3xl flex flex-col items-center text-center space-y-6 border-b border-line pb-16"
        >
          <span className="font-mono text-xs uppercase tracking-widest text-star">
            [STAGE 5: WINGS EMERGE]
          </span>
          <h2
            id="reduced-frame-2-title"
            className="font-display text-2xl sm:text-3xl font-bold text-feather"
          >
            The Horns Awaken, Wings Unfold
          </h2>
          <p className="font-ui text-sm text-mist max-w-md">
            Horns emerge with a cold red rim light as white wings unfold from behind the coat.
          </p>
          <div className="relative w-[340px] h-[380px] flex items-center justify-center">
            <svg
              viewBox="0 0 320 400"
              fill="none"
              className="w-full h-full drop-shadow-2xl"
            >
              {/* Back wings */}
              <path d="M 140 160 C 100 110, 40 80, 20 120 C 15 145, 35 175, 60 200 Z" fill="#E2EAF4" stroke="#9FB4D6" />
              <path d="M 180 160 C 220 110, 280 80, 300 120 C 305 145, 285 175, 260 200 Z" fill="#E2EAF4" stroke="#9FB4D6" />
              {/* Body and coat */}
              <rect x="135" y="280" width="50" height="85" fill="#0E1118" stroke="#243044" />
              <path d="M 130 150 L 115 220 L 110 330 L 210 330 L 205 220 L 190 150 Z" fill="#F4F6FA" stroke="#9FB4D6" />
              {/* Head and horns */}
              <circle cx="160" cy="118" r="18" fill="#F0E3D7" />
              <path d="M 148 94 C 140 82, 134 68, 128 58 Z" fill="#2A0A10" stroke="#B3122B" strokeWidth="1.5" />
              <path d="M 172 94 C 180 82, 186 68, 192 58 Z" fill="#2A0A10" stroke="#B3122B" strokeWidth="1.5" />
              {/* Front wings */}
              <path d="M 130 165 C 90 140, 55 145, 40 180 Z" fill="#FFFFFF" stroke="#9FB4D6" />
              <path d="M 190 165 C 230 140, 265 145, 280 180 Z" fill="#FFFFFF" stroke="#9FB4D6" />
            </svg>
          </div>
        </section>

        {/* Frame 3: Stage 7 (Final Form) */}
        <section
          aria-labelledby="reduced-frame-3-title"
          className="w-full max-w-3xl flex flex-col items-center text-center space-y-6"
        >
          <span className="font-mono text-xs uppercase tracking-widest text-star">
            [STAGE 7: FINAL FORM]
          </span>
          <h2
            id="reduced-frame-3-title"
            className="font-display text-2xl sm:text-3xl font-bold text-feather"
          >
            A Scenario Has Arrived
          </h2>
          <div className="px-5 py-2.5 bg-ink border border-star text-star font-mono text-sm tracking-wider uppercase">
            A Scenario has arrived.
          </div>
          {/* Shatter grid handoff */}
          <div className="w-full max-w-xl grid grid-cols-3 gap-3 pt-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={`rm-grid-${i}`}
                className="aspect-[4/3] rounded border border-line bg-ink/50 flex items-center justify-center font-mono text-xs text-mist"
              >
                SCENARIO_0{i}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* FULL / LIGHT MOTION MODE: 100svh pinned container */}
      <section
        ref={containerRef}
        id="hero-scene"
        style={{ display: reducedMotion ? "none" : undefined }}
        className={`relative w-full h-[100svh] min-h-[100svh] max-h-[100svh] overflow-hidden bg-void select-none flex items-center justify-center ${className}`}
        aria-label="Omniscient Reader's Viewpoint Hero Prologue"
      >
        {/* ========================================================= */}
        {/* LAYER 1: background (deep void radial gradient)           */}
        {/* ========================================================= */}
        <div
          data-layer="background"
          className="hero-layer hero-layer-background pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_rgba(94,225,230,0.06)_0%,_rgba(7,8,11,1)_72%)]"
          aria-hidden="true"
        />

        {/* ========================================================= */}
        {/* LAYER 2: stars (3 parallax layers)                        */}
        {/* ========================================================= */}
        <div
          data-layer="stars"
          className="hero-layer hero-layer-stars pointer-events-none absolute inset-0 z-0"
          aria-hidden="true"
        >
          <div data-layer="stars-1" className="absolute inset-0">
            {STARS_LAYER_1.map((star, idx) => (
              <span
                key={`star1-${idx}`}
                className="absolute rounded-full bg-feather"
                style={{
                  top: star.top,
                  left: star.left,
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                  opacity: star.opacity,
                }}
              />
            ))}
          </div>

          {/* Parallax star layer 2: suppressed in light mode per P1-7 */}
          {mode !== "light" && (
            <div data-layer="stars-2" className="absolute inset-0">
              {STARS_LAYER_2.map((star, idx) => (
                <span
                  key={`star2-${idx}`}
                  className="absolute rounded-full bg-rim"
                  style={{
                    top: star.top,
                    left: star.left,
                    width: `${star.size}px`,
                    height: `${star.size}px`,
                    opacity: star.opacity,
                  }}
                />
              ))}
            </div>
          )}

          {/* Parallax star layer 3: desktop full mode only */}
          {mode === "full" && !signals.isTouch && (
            <div data-layer="stars-3" className="absolute inset-0">
              {STARS_LAYER_3.map((star, idx) => (
                <span
                  key={`star3-${idx}`}
                  className="absolute rounded-full bg-star shadow-[0_0_4px_rgba(94,225,230,0.8)]"
                  style={{
                    top: star.top,
                    left: star.left,
                    width: `${star.size}px`,
                    height: `${star.size}px`,
                    opacity: star.opacity,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* CONSTELLATION STAR RING: Orbits in Stage 6 (single wrapper) */}
        {/* ========================================================= */}
        <div
          data-layer="star-ring"
          className="hero-star-ring pointer-events-none absolute inset-0 flex items-center justify-center z-15"
          style={{ opacity: 0 }}
        >
          <svg
            viewBox="0 0 440 440"
            className="w-[300px] h-[300px] xs:w-[340px] xs:h-[340px] sm:w-[460px] sm:h-[460px] max-w-full overflow-hidden"
          >
            <circle
              cx="220"
              cy="220"
              r="180"
              fill="none"
              stroke="#5EE1E6"
              strokeWidth="1"
              strokeDasharray="4 8"
              opacity="0.35"
            />
            {STAR_RING_NODES.map(({ deg, cx, cy }) => (
              <g key={`star-node-${deg}`}>
                <circle cx={cx} cy={cy} r="2.5" fill="#5EE1E6" />
                <circle cx={cx} cy={cy} r="6" fill="#5EE1E6" opacity="0.25" />
              </g>
            ))}
          </svg>
        </div>

        {/* ========================================================= */}
        {/* DOKJA STAGE FIGURE: Layers 3 to 9 in exact /docs/06 order */}
        {/* ========================================================= */}
        <div className="hero-dokja-figure relative z-10 w-[270px] h-[350px] xs:w-[300px] xs:h-[380px] sm:w-[360px] sm:h-[440px] flex items-center justify-center">
          <svg
            viewBox="0 0 320 400"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-2xl overflow-visible"
          >
            <defs>
              {/* Phone screen glow: cold teal cyan (--star: #5EE1E6) */}
              <radialGradient
                id="hero_phone_screen_glow"
                cx="160"
                cy="245"
                r="75"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#5EE1E6" stopOpacity="0.5" />
                <stop offset="60%" stopColor="#5EE1E6" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#5EE1E6" stopOpacity="0" />
              </radialGradient>

              {/* White coat gradient with cold rim lighting (--feather #F4F6FA to --rim #9FB4D6) */}
              <linearGradient
                id="hero_white_coat_grad"
                x1="160"
                y1="130"
                x2="160"
                y2="340"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="60%" stopColor="#F4F6FA" />
                <stop offset="100%" stopColor="#D5DEEB" />
              </linearGradient>

              {/* White wing gradient */}
              <linearGradient id="hero_wing_grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="80%" stopColor="#E2EAF4" />
                <stop offset="100%" stopColor="#9FB4D6" />
              </linearGradient>

              {/* Horns strictly in --horn-dark (#2A0A10) with dark shading */}
              <linearGradient id="hero_horn_dark_grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3D0F17" />
                <stop offset="100%" stopColor="#2A0A10" />
              </linearGradient>
            </defs>

            {/* ===================================================== */}
            {/* LAYER 3: wings-back (rear wings unfolding)           */}
            {/* ===================================================== */}
            <g
              id="dokja_wings_back"
              data-layer="wings-back"
              className="dokja-layer-wings-back"
            >
              {/* Left back wing with shoulder pivot */}
              <g
                id="dokja_wings_back_l"
                data-layer="wings_back_l"
                className="dokja-wing-back-l"
              >
                <path
                  d="M 140 160 C 100 110, 40 80, 20 120 C 15 145, 35 175, 60 200 C 85 225, 120 230, 140 210 Z"
                  fill="url(#hero_wing_grad)"
                  stroke="#9FB4D6"
                  strokeWidth="1.5"
                  opacity="0.85"
                />
                <path
                  d="M 60 140 C 35 140, 20 160, 30 185 C 45 195, 80 200, 105 185 Z"
                  fill="#D5DEEB"
                  opacity="0.6"
                />
              </g>
              {/* Right back wing with shoulder pivot */}
              <g
                id="dokja_wings_back_r"
                data-layer="wings_back_r"
                className="dokja-wing-back-r"
              >
                <path
                  d="M 180 160 C 220 110, 280 80, 300 120 C 305 145, 285 175, 260 200 C 235 225, 200 230, 180 210 Z"
                  fill="url(#hero_wing_grad)"
                  stroke="#9FB4D6"
                  strokeWidth="1.5"
                  opacity="0.85"
                />
                <path
                  d="M 260 140 C 285 140, 300 160, 290 185 C 275 195, 240 200, 215 185 Z"
                  fill="#D5DEEB"
                  opacity="0.6"
                />
              </g>
            </g>

            {/* ===================================================== */}
            {/* LAYER 4: body (undersuit, legs, boots, neck, head)   */}
            {/* ===================================================== */}
            <g id="dokja_body" data-layer="body" className="dokja-layer-body">
              {/* Trousers and undersuit */}
              <path
                d="M 135 280 L 130 365 L 148 365 L 155 300 L 165 300 L 172 365 L 190 365 L 185 280 Z"
                fill="#0E1118"
                stroke="#243044"
                strokeWidth="1"
              />
              {/* Shoes */}
              <rect x="126" y="362" width="24" height="8" rx="2" fill="#07080B" />
              <rect x="170" y="362" width="24" height="8" rx="2" fill="#07080B" />

              {/* Neck */}
              <rect x="153" y="132" width="14" height="15" fill="#E2D6CB" />

              {/* Head container */}
              <g id="dokja_head" data-layer="head" className="dokja-layer-head">
                {/* Face contour */}
                <polygon
                  points="148,110 172,110 168,135 160,142 152,135"
                  fill="#F0E3D7"
                />

                {/* Hair silhouette with micro-motion hook */}
                <g className="dokja-layer-hair">
                  <path
                    d="M 144 110 C 142 90, 150 82, 160 82 C 170 82, 178 90, 176 110 C 172 104, 166 102, 160 106 C 154 102, 148 104, 144 110 Z"
                    fill="#0E1118"
                  />
                  <path d="M 145 106 L 149 122 L 152 110 Z" fill="#0E1118" />
                  <path d="M 175 106 L 171 122 L 168 110 Z" fill="#0E1118" />
                </g>

                {/* Eye State 1: Reading (downcast toward the phone) */}
                <g className="dokja-eyes-reading">
                  <path
                    d="M 152 118 Q 155 120 158 118"
                    stroke="#0E1118"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M 162 118 Q 165 120 168 118"
                    stroke="#0E1118"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </g>

                {/* Eye State 2: Notices You (looking straight at viewer) */}
                <g className="dokja-eyes-notice">
                  <circle cx="155" cy="116" r="2.2" fill="#0E1118" />
                  <circle cx="155.6" cy="115.4" r="0.8" fill="#5EE1E6" />
                  <circle cx="165" cy="116" r="2.2" fill="#0E1118" />
                  <circle cx="165.6" cy="115.4" r="0.8" fill="#5EE1E6" />
                </g>

                {/* Eye State 3: Irritated brow */}
                <g className="dokja-brow-irritated">
                  <line
                    x1="151"
                    y1="112"
                    x2="158"
                    y2="114"
                    stroke="#243044"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="169"
                    y1="112"
                    x2="162"
                    y2="114"
                    stroke="#243044"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </g>
              </g>
            </g>

            {/* ===================================================== */}
            {/* LAYER 5: coat (white trench coat with sway loop)      */}
            {/* ===================================================== */}
            <g id="dokja_coat" data-layer="coat" className="dokja-layer-coat">
              <path
                d="M 130 150 L 115 220 L 110 330 L 145 335 L 160 270 L 175 335 L 210 330 L 205 220 L 190 150 Z"
                fill="url(#hero_white_coat_grad)"
                stroke="#9FB4D6"
                strokeWidth="1.5"
              />
              <path
                d="M 140 150 L 160 200 L 152 235 L 138 180 Z"
                fill="#CCD5E4"
                stroke="#9FB4D6"
                strokeWidth="1"
              />
              <path
                d="M 180 150 L 160 200 L 168 235 L 182 180 Z"
                fill="#CCD5E4"
                stroke="#9FB4D6"
                strokeWidth="1"
              />
              <path
                d="M 135 140 L 145 155 L 175 155 L 185 140 Z"
                fill="#FFFFFF"
                stroke="#9FB4D6"
                strokeWidth="1.5"
              />
            </g>

            {/* ===================================================== */}
            {/* LAYER 6: horns (Horns in #2A0A10 + red rim light)     */}
            {/* ===================================================== */}
            <g id="dokja_horns" data-layer="horns" className="dokja-layer-horns">
              {/* Horn base bodies */}
              <path
                d="M 148 94 C 140 82, 134 68, 128 58 C 135 68, 146 78, 152 86 Z"
                fill="url(#hero_horn_dark_grad)"
                stroke="#243044"
                strokeWidth="1.2"
              />
              <path
                d="M 172 94 C 180 82, 186 68, 192 58 C 185 68, 174 78, 168 86 Z"
                fill="url(#hero_horn_dark_grad)"
                stroke="#243044"
                strokeWidth="1.2"
              />

              {/* Stage 4 Red Rim Light: dedicated opacity-animated layer, NO filter */}
              <g
                data-layer="horns-rim"
                className="dokja-horns-red-rim"
                style={{ opacity: 0 }}
              >
                <path
                  d="M 148 94 C 140 82, 134 68, 128 58"
                  stroke="#B3122B"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 172 94 C 180 82, 186 68, 192 58"
                  stroke="#B3122B"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>
            </g>

            {/* ===================================================== */}
            {/* LAYER 7: wings-front (forward primary wings)          */}
            {/* In light mode: suppressed so wings act as ONE layer  */}
            {/* ===================================================== */}
            <g
              id="dokja_wings_front"
              data-layer="wings-front"
              className="dokja-layer-wings-front"
              style={{ display: mode === "light" ? "none" : undefined }}
            >
              <g
                id="dokja_wings_front_l"
                data-layer="wings_front_l"
                className="dokja-wing-front-l"
              >
                <path
                  d="M 130 165 C 90 140, 55 145, 40 180 C 35 195, 55 220, 85 225 C 110 230, 130 200, 132 175 Z"
                  fill="url(#hero_wing_grad)"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              </g>
              <g
                id="dokja_wings_front_r"
                data-layer="wings_front_r"
                className="dokja-wing-front-r"
              >
                <path
                  d="M 190 165 C 230 140, 265 145, 280 180 C 285 195, 265 220, 235 225 C 210 230, 190 200, 188 175 Z"
                  fill="url(#hero_wing_grad)"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              </g>
            </g>

            {/* ===================================================== */}
            {/* LAYER 8: phone (hands and illuminated device)         */}
            {/* ===================================================== */}
            <g id="dokja_phone" data-layer="phone" className="dokja-layer-phone">
              <ellipse cx="148" cy="246" rx="6" ry="5" fill="#E2D6CB" />
              <ellipse cx="172" cy="246" rx="6" ry="5" fill="#E2D6CB" />
              <rect
                x="151"
                y="230"
                width="18"
                height="30"
                rx="2.5"
                fill="#0E1118"
                stroke="#243044"
                strokeWidth="1.5"
              />
              <rect
                x="153"
                y="233"
                width="14"
                height="24"
                rx="1.5"
                fill="#5EE1E6"
              />
              <line x1="155" y1="237" x2="165" y2="237" stroke="#07080B" strokeWidth="1" />
              <line x1="155" y1="240" x2="163" y2="240" stroke="#07080B" strokeWidth="1" />
              <line x1="155" y1="243" x2="165" y2="243" stroke="#07080B" strokeWidth="1" />
              <line x1="155" y1="246" x2="161" y2="246" stroke="#07080B" strokeWidth="1" />
              <line x1="155" y1="249" x2="164" y2="249" stroke="#07080B" strokeWidth="1" />
            </g>

            {/* ===================================================== */}
            {/* LAYER 9: glow (cold cyan ambient phone glow)          */}
            {/* ===================================================== */}
            <g id="dokja_glow" data-layer="glow" className="dokja-layer-glow">
              <circle cx="160" cy="245" r="75" fill="url(#hero_phone_screen_glow)" />
            </g>
          </svg>
        </div>

        {/* ========================================================= */}
        {/* LAYER 10: particles (floating stardust motes)             */}
        {/* ========================================================= */}
        <div
          data-layer="particles"
          className="hero-layer hero-layer-particles pointer-events-none absolute inset-0 z-10"
          aria-hidden="true"
        >
          {activeParticles.map((pt, idx) => (
            <span
              key={`pt-${idx}`}
              className="absolute rounded-full bg-star/70 animate-pulse"
              style={{
                top: pt.top,
                left: pt.left,
                width: `${pt.size}px`,
                height: `${pt.size}px`,
                animationDelay: `${pt.delay}s`,
              }}
            />
          ))}
        </div>

        {/* ========================================================= */}
        {/* STAGE 7 FEATHER DRIFT / SHATTER GRID (3-column handoff)   */}
        {/* ========================================================= */}
        <div
          data-layer="shatter-grid"
          className="hero-shatter-grid pointer-events-none absolute bottom-6 sm:bottom-10 inset-x-0 mx-auto w-full max-w-xl px-4 z-20"
        >
          <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div
                key={`shatter-${num}`}
                className="shatter-tile aspect-[4/3] rounded border border-line/60 bg-ink/40 backdrop-blur-xs flex items-center justify-center font-mono text-[10px] text-mist/60 tracking-wider shadow-sm"
                style={{ opacity: 0 }}
              >
                <span>SCENARIO_{num}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* STAGE 7 GLITCH NOTIFICATION: "A Scenario has arrived."    */}
        {/* ========================================================= */}
        <div
          data-layer="glitch-notification"
          className={`hero-glitch-container pointer-events-none absolute top-24 sm:top-28 inset-x-0 mx-auto w-fit z-30 transition-opacity duration-300 ${glitchVisible ? "opacity-100" : "opacity-0"
            }`}
        >
          <div className="px-4 py-2 sm:px-6 sm:py-2.5 bg-ink/90 border border-star/60 text-star font-mono text-xs sm:text-sm tracking-widest uppercase shadow-2xl backdrop-blur-md">
            <span
              className={`inline-block font-bold ${glitchActive ? "glitch-text-active" : ""
                }`}
            >
              A Scenario has arrived.
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BIYOO LAYER: autonomous companion with state machine      */}
        {/* ========================================================= */}
        <div
          data-layer="biyoo"
          className="absolute bottom-4 left-3 sm:bottom-10 sm:left-10 z-25 pointer-events-auto"
        >
          <Biyoo
            size={signals.isTouch ? 115 : 170}
            introDone={heroState.introDone}
            idleSeconds={readerSignals.idleSeconds}
            scrollSpeed={readerSignals.scrollSpeed}
            pointerPosition={readerSignals.pointerPosition}
            localHour={readerSignals.localHour}
            hoverTarget={readerSignals.hoverTarget}
          />
        </div>

        {/* ========================================================= */}
        {/* SYSTEM NOTIFICATION: Stage 2 "A Reader has been detected."*/}
        {/* ========================================================= */}
        <div
          data-layer="system-window"
          className="hero-system-window absolute top-20 sm:top-24 right-4 sm:right-10 z-30 max-w-[280px] sm:max-w-sm pointer-events-auto transition-opacity"
          style={{ opacity: 0 }}
        >
          <SystemWindow title="SYSTEM NOTIFICATION">
            <p className="text-xs sm:text-sm text-star font-mono">
              A Reader has been detected.
            </p>
          </SystemWindow>
        </div>

        {/* ========================================================= */}
        {/* SCROLL HINT: Pulses at bottom only after Stage 3 finishes */}
        {/* ========================================================= */}
        <div
          data-layer="scroll-hint"
          className="hero-scroll-hint absolute bottom-4 sm:bottom-6 inset-x-0 mx-auto w-fit z-20 flex flex-col items-center gap-1 pointer-events-none transition-opacity duration-150"
          style={{ opacity: 0 }}
        >
          <span className="font-mono text-[11px] sm:text-xs uppercase tracking-widest text-star">
            scroll
          </span>
          <span className="text-star font-mono text-sm sm:text-base animate-bounce">
            &darr;
          </span>
        </div>
      </section>
    </div>
  );
}

/**
 * HeroScene:
 * Master hero container with context fallback.
 */
export function HeroScene({ className = "" }: HeroSceneProps) {
  const context = React.useContext(HeroContext);
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
