"use client";

import React, { useRef, useEffect } from "react";
import { useMode } from "@/lib/flags";
import { useScene, gsap } from "@/lib/motion";
import { BiyooPlaceholder } from "@/components/biyoo";
import { SystemWindow } from "@/components/system-window";
import { useHeroContext, HeroProvider, HeroContext } from "./hero-context";

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

// Deterministic particle set capped per mode: desktop <= 120, mobile <= 40, light <= 15
const PARTICLES_DATA = [
  { top: "20%", left: "25%", size: 2, delay: 0 },
  { top: "32%", left: "72%", size: 2.5, delay: 0.8 },
  { top: "45%", left: "35%", size: 1.5, delay: 1.6 },
  { top: "58%", left: "68%", size: 2, delay: 0.4 },
  { top: "65%", left: "22%", size: 2.5, delay: 1.2 },
  { top: "78%", left: "78%", size: 1.5, delay: 2.0 },
  { top: "28%", left: "82%", size: 2, delay: 0.6 },
  { top: "50%", left: "15%", size: 2.5, delay: 1.4 },
  { top: "82%", left: "42%", size: 1.5, delay: 2.2 },
  { top: "15%", left: "60%", size: 2, delay: 1.0 },
  { top: "40%", left: "85%", size: 2.5, delay: 0.2 },
  { top: "70%", left: "55%", size: 1.5, delay: 1.8 },
  { top: "85%", left: "20%", size: 2, delay: 0.5 },
  { top: "25%", left: "40%", size: 2.5, delay: 1.5 },
  { top: "60%", left: "80%", size: 1.5, delay: 2.5 },
  // Extended for desktop
  { top: "18%", left: "18%", size: 2, delay: 0.3 },
  { top: "35%", left: "48%", size: 1.5, delay: 1.1 },
  { top: "52%", left: "28%", size: 2.5, delay: 1.9 },
  { top: "68%", left: "88%", size: 2, delay: 0.7 },
  { top: "75%", left: "38%", size: 1.5, delay: 2.3 },
  { top: "88%", left: "65%", size: 2.5, delay: 1.3 },
  { top: "22%", left: "88%", size: 2, delay: 0.9 },
  { top: "48%", left: "62%", size: 1.5, delay: 1.7 },
  { top: "62%", left: "32%", size: 2, delay: 2.1 },
  { top: "80%", left: "12%", size: 2.5, delay: 0.1 },
];

export interface HeroSceneProps {
  className?: string;
}

export function HeroSceneContent({ className = "" }: HeroSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const introTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const introDoneRef = useRef(false);

  const { reducedMotion, particleCap, signals } = useMode();
  const { heroState, setHeroState } = useHeroContext();

  // Active particle set capped per mode according to /docs/02 performance budget
  const activeParticles = PARTICLES_DATA.slice(
    0,
    Math.min(particleCap, PARTICLES_DATA.length)
  );

  // Sync ref with context state
  useEffect(() => {
    introDoneRef.current = heroState.introDone;
  }, [heroState.introDone]);

  // Fast-forward listener: accelerates the timeline cleanly on first scroll / navigation input
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

  // Main Intro Animation Timeline and Micro-motions using useScene
  useScene(
    () => {
      // Static Fallback for reduced motion: stage 1 still composition, zero timeline
      if (reducedMotion) {
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

      // Initial visual states for intro
      gsap.set(eyesReading, { opacity: 1 });
      gsap.set(eyesNotice, { opacity: 0 });
      gsap.set(browIrritated, { opacity: 0 });
      gsap.set(systemWindow, { opacity: 0, y: -10 });
      gsap.set(scrollHint, { opacity: 0 });

      // ONE Master GSAP timeline for stages 1-3 (total duration: ~7.2s)
      const tl = gsap.timeline({
        onComplete: () => {
          setHeroState((prev) => ({
            ...prev,
            stage: 3,
            introDone: true,
          }));
        },
      });

      introTimelineRef.current = tl;

      // STAGE 1: Reading (0.0s - 2.5s)
      tl.call(() => {
        setHeroState((prev) => ({ ...prev, stage: 1 }));
      }, [], 0);

      // Slight breathing in phone glow during Stage 1
      tl.to(
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

      // STAGE 2: Notices You (starts at 2.5s)
      // Eyes lift from phone to viewer, phone lowers slightly, system text appears
      tl.call(() => {
        setHeroState((prev) => ({ ...prev, stage: 2 }));
      }, [], 2.5);

      tl.to(
        eyesReading,
        {
          opacity: 0,
          duration: 0.2,
          ease: "power2.out",
        },
        2.5
      );

      tl.to(
        eyesNotice,
        {
          opacity: 1,
          duration: 0.25,
          ease: "power2.out",
        },
        2.55
      );

      tl.to(
        [phone, glow],
        {
          y: 12,
          duration: 0.6,
          ease: "power2.out",
        },
        2.55
      );

      tl.to(
        systemWindow,
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          ease: "power3.out",
        },
        2.75
      );

      // STAGE 3: Irritation (starts at 5.0s)
      // Brow tightens, small sigh motion, cold glow pulse
      tl.call(() => {
        setHeroState((prev) => ({ ...prev, stage: 3 }));
      }, [], 5.0);

      tl.to(
        browIrritated,
        {
          opacity: 1,
          duration: 0.3,
          ease: "power2.out",
        },
        5.0
      );

      // Small sigh motion: body scale 1 to 1.01 and back
      tl.to(
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

      // Cold glow pulse
      tl.to(
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

      // Scroll hint pulses in only after Stage 3 ends (around 6.6s - 7.2s)
      tl.to(
        scrollHint,
        {
          opacity: 1,
          duration: 0.5,
          ease: "power2.out",
        },
        6.6
      );
    },
    {
      scope: containerRef,
      dependencies: [reducedMotion],
    }
  );

  return (
    <section
      ref={containerRef}
      id="hero-scene"
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
        {/* Parallax Star Layer 1 (Distant) */}
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

        {/* Parallax Star Layer 2 (Midfield) */}
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

        {/* Parallax Star Layer 3 (Foreground twinkling) */}
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
      </div>

      {/* ========================================================= */}
      {/* DOKJA STAGE FIGURE: Layers 3 to 9 in exact /docs/06 order */}
      {/* ========================================================= */}
      <div className="relative z-10 w-[300px] h-[380px] sm:w-[340px] sm:h-[420px] flex items-center justify-center">
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
            {/* Left back wing */}
            <g id="dokja_wings_back_l" data-layer="wings_back_l">
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
            {/* Right back wing */}
            <g id="dokja_wings_back_r" data-layer="wings_back_r">
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
              <g
                className="dokja-eyes-notice"
                style={{ opacity: reducedMotion ? 0 : undefined }}
              >
                <circle cx="155" cy="116" r="2.2" fill="#0E1118" />
                <circle cx="155.6" cy="115.4" r="0.8" fill="#5EE1E6" />
                <circle cx="165" cy="116" r="2.2" fill="#0E1118" />
                <circle cx="165.6" cy="115.4" r="0.8" fill="#5EE1E6" />
              </g>

              {/* Eye State 3: Irritated brow */}
              <g
                className="dokja-brow-irritated"
                style={{ opacity: reducedMotion ? 0 : undefined }}
              >
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
            {/* Coat body */}
            <path
              d="M 130 150 L 115 220 L 110 330 L 145 335 L 160 270 L 175 335 L 210 330 L 205 220 L 190 150 Z"
              fill="url(#hero_white_coat_grad)"
              stroke="#9FB4D6"
              strokeWidth="1.5"
            />
            {/* Lapels */}
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
            {/* Collar */}
            <path
              d="M 135 140 L 145 155 L 175 155 L 185 140 Z"
              fill="#FFFFFF"
              stroke="#9FB4D6"
              strokeWidth="1.5"
            />
          </g>

          {/* ===================================================== */}
          {/* LAYER 6: horns (initial horns in --horn-dark #2A0A10) */}
          {/* ===================================================== */}
          <g id="dokja_horns" data-layer="horns" className="dokja-layer-horns">
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
          </g>

          {/* ===================================================== */}
          {/* LAYER 7: wings-front (forward primary wings)          */}
          {/* ===================================================== */}
          <g
            id="dokja_wings_front"
            data-layer="wings-front"
            className="dokja-layer-wings-front"
          >
            <path
              d="M 130 165 C 90 140, 55 145, 40 180 C 35 195, 55 220, 85 225 C 110 230, 130 200, 132 175 Z"
              fill="url(#hero_wing_grad)"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
            <path
              d="M 190 165 C 230 140, 265 145, 280 180 C 285 195, 265 220, 235 225 C 210 230, 190 200, 188 175 Z"
              fill="url(#hero_wing_grad)"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          </g>

          {/* ===================================================== */}
          {/* LAYER 8: phone (hands and illuminated device)         */}
          {/* ===================================================== */}
          <g id="dokja_phone" data-layer="phone" className="dokja-layer-phone">
            {/* Hands */}
            <ellipse cx="148" cy="246" rx="6" ry="5" fill="#E2D6CB" />
            <ellipse cx="172" cy="246" rx="6" ry="5" fill="#E2D6CB" />
            {/* Phone body */}
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
            {/* Glowing screen */}
            <rect
              x="153"
              y="233"
              width="14"
              height="24"
              rx="1.5"
              fill="#5EE1E6"
            />
            {/* Reading lines */}
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
      {/* BIYOO LAYER: sleeps near bottom-left with breathing bob   */}
      {/* ========================================================= */}
      <div
        data-layer="biyoo"
        className="absolute bottom-6 left-4 sm:bottom-10 sm:left-10 z-20 pointer-events-auto"
      >
        <BiyooPlaceholder size={signals.isTouch ? 130 : 170} />
      </div>

      {/* ========================================================= */}
      {/* SYSTEM NOTIFICATION: Stage 2 "A Reader has been detected."*/}
      {/* ========================================================= */}
      <div
        data-layer="system-window"
        className="hero-system-window absolute top-20 sm:top-24 right-4 sm:right-10 z-30 max-w-[280px] sm:max-w-sm pointer-events-auto transition-opacity"
        style={{
          opacity: reducedMotion ? 1 : 0,
        }}
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
        className="hero-scroll-hint absolute bottom-6 inset-x-0 mx-auto w-fit z-20 flex flex-col items-center gap-1 pointer-events-none"
        style={{
          opacity: reducedMotion ? 1 : 0,
        }}
      >
        <span className="font-mono text-[11px] sm:text-xs uppercase tracking-widest text-star">
          scroll
        </span>
        <span className="text-star font-mono text-sm sm:text-base animate-bounce">
          &darr;
        </span>
      </div>
    </section>
  );
}

/**
 * HeroScene:
 * Master hero container. Ensures HeroProvider is available for all layers
 * and sibling components.
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
