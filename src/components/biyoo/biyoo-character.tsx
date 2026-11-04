"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useMode } from "@/lib/flags";
import { useScene, gsap, EASINGS } from "@/lib/motion";
import type { BiyooState, BiyooCostume } from "./biyoo-state";
import { BIYOO_STATES_CONFIG } from "./biyoo-state";
import type { PointerPosition } from "@/lib/reader/types";

export interface BiyooProps {
  className?: string;
  size?: number;
  costume?: BiyooCostume;
  introDone?: boolean;
  idleSeconds?: number;
  scrollSpeed?: number;
  pointerPosition?: PointerPosition;
  localHour?: number;
  hoverTarget?: string | null;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

/**
 * Biyoo Component:
 * Autonomous companion implementing the state machine from /docs/07:
 * - States: sleeping, yawn-wake, startled, curious, happy, proud, sleepy-again, night.
 * - Swappable costume slot.
 * - GSAP timelines on Phase 0 layers using elastic easing (elastic.out(1, 0.5)).
 * - Cursor following on desktop (clamped lerped translate); pinned to corner on touch.
 * - Idle nudge at 8s inactivity after introDone, cancelled immediately on scroll.
 * - Stage 7 startled squeak reaction.
 * - Speech bubble in small SystemWindow style, auto-hides after 4s.
 */
export function Biyoo({
  className = "",
  size = 170,
  costume = null,
  introDone = true,
  idleSeconds = 0,
  scrollSpeed = 0,
  pointerPosition = { x: 500, y: 500 },
  localHour = 12,
  hoverTarget = null,
  onSpeakingChange,
}: BiyooProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const followRef = useRef<HTMLDivElement>(null);
  const activeTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const speechTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { mode, reducedMotion, signals } = useMode();

  // State management
  const [currentState, setCurrentState] = useState<BiyooState>(() => {
    // If night time (00:00 - 04:59) on arrival, start in night state
    if (localHour >= 0 && localHour < 5) return "night";
    return "sleeping";
  });

  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [overrideCostume, setOverrideCostume] = useState<BiyooCostume>(null);
  const activeCostume = overrideCostume ?? costume;
  const [activeEyeVariant, setActiveEyeVariant] = useState<"awake" | "sleepy" | "wide">("sleepy");
  const [activeMouthVariant, setActiveMouthVariant] = useState<"smile" | "yawn" | "droop">("smile");

  // Track if idle nudge has already executed this session
  const nudgeExecutedRef = useRef(false);
  const nudgeActiveRef = useRef(false);

  // Notify parent whether Biyoo is speaking
  const setSpeech = useCallback(
    (line: string | null, durationMs = 4000) => {
      if (speechTimerRef.current) {
        clearTimeout(speechTimerRef.current);
        speechTimerRef.current = null;
      }

      setSpeechBubble(line);
      onSpeakingChange?.(Boolean(line));

      if (line && durationMs > 0) {
        speechTimerRef.current = setTimeout(() => {
          setSpeechBubble(null);
          onSpeakingChange?.(false);
          speechTimerRef.current = null;
        }, durationMs);
      }
    },
    [onSpeakingChange]
  );

  // Switch state and trigger speech bubble
  const transitionToState = useCallback(
    (nextState: BiyooState) => {
      setCurrentState(nextState);
      const meta = BIYOO_STATES_CONFIG[nextState];
      if (meta.line) {
        setSpeech(meta.line, meta.autoHideMs);
      }
    },
    [setSpeech]
  );

  // =========================================================
  // CURSOR FOLLOWING (Desktop only, lerped within bounded box)
  // =========================================================
  useEffect(() => {
    // In light mode, touch mode, or reduced motion: disable cursor follow RAF loop
    if (
      signals.isTouch ||
      reducedMotion ||
      mode === "light" ||
      typeof window === "undefined"
    ) {
      return;
    }

    let rafId: number;
    let currentX = 0;
    let currentY = 0;

    const animateFollow = () => {
      if (containerRef.current && followRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = pointerPosition.x - centerX;
        const deltaY = pointerPosition.y - centerY;

        // Bounded target displacement (-24px to +24px)
        const targetX = Math.max(-24, Math.min(24, deltaX * 0.05));
        const targetY = Math.max(-20, Math.min(20, deltaY * 0.05));

        // Smooth lerp (factor 0.08)
        currentX += (targetX - currentX) * 0.08;
        currentY += (targetY - currentY) * 0.08;

        followRef.current.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
      }

      rafId = requestAnimationFrame(animateFollow);
    };

    rafId = requestAnimationFrame(animateFollow);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [pointerPosition, signals.isTouch, reducedMotion, mode]);

  // =========================================================
  // STATE ANIMATION RUNNER (GSAP Timelines on Phase 0 layers)
  // =========================================================
  useScene(
    () => {
      if (reducedMotion || !containerRef.current) return;

      const body = containerRef.current.querySelector("#biyoo_body");
      const head = containerRef.current.querySelector("#biyoo_head");
      const armsL = containerRef.current.querySelector("#biyoo_arms_l");
      const armsR = containerRef.current.querySelector("#biyoo_arms_r");
      const legsL = containerRef.current.querySelector("#biyoo_legs_l");
      const legsR = containerRef.current.querySelector("#biyoo_legs_r");
      const hornsL = containerRef.current.querySelector("#biyoo_horns_l");
      const hornsR = containerRef.current.querySelector("#biyoo_horns_r");
      const bobTarget = containerRef.current.querySelector(".biyoo-bob-target");

      // Kill previous state timeline
      if (activeTimelineRef.current) {
        activeTimelineRef.current.kill();
        activeTimelineRef.current = null;
      }

      // Reset base transforms
      gsap.set([body, head, armsL, armsR, legsL, legsR, hornsL, hornsR], {
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      });

      const tl = gsap.timeline();
      activeTimelineRef.current = tl;

      switch (currentState) {
        // ---------------------------------------------------------
        // 1. SLEEPING: Gentle breathing bob
        // ---------------------------------------------------------
        case "sleeping": {
          setActiveEyeVariant("sleepy");
          setActiveMouthVariant("smile");

          if (bobTarget) {
            if (mode === "light") {
              // Simplified breathing scale loop for light mode
              tl.to(bobTarget, {
                scale: 1.03,
                duration: 2.2,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
                transformOrigin: "bottom center",
              });
            } else {
              tl.to(bobTarget, {
                y: -8,
                scaleY: 1.04,
                scaleX: 0.97,
                duration: 2.2,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
                transformOrigin: "bottom center",
              });
            }
          }
          break;
        }

        // ---------------------------------------------------------
        // 2. YAWN-WAKE: Stretch, yawn, nudge screen
        // ---------------------------------------------------------
        case "yawn-wake": {
          setActiveEyeVariant("sleepy");
          setActiveMouthVariant("yawn");

          if (mode === "light") {
            if (bobTarget) {
              tl.to(bobTarget, {
                scale: 1.08,
                duration: 0.6,
                ease: "power2.out",
                transformOrigin: "bottom center",
              });
              tl.to(bobTarget, {
                scale: 1.0,
                duration: 0.6,
                ease: "power2.out",
              });
            }
            tl.add(() => {
              setActiveEyeVariant("awake");
              setActiveMouthVariant("smile");
            }, 0.7);
            break;
          }

          tl.to(
            [armsL, armsR],
            {
              y: -12,
              rotation: (i) => (i === 0 ? -30 : 30),
              duration: 0.8,
              ease: EASINGS.biyoo,
            },
            0
          );
          tl.to(
            body,
            {
              scaleY: 1.12,
              scaleX: 0.94,
              duration: 0.8,
              ease: "power2.inOut",
              transformOrigin: "bottom center",
            },
            0
          );
          tl.to(
            head,
            {
              y: -6,
              duration: 0.8,
              ease: "power2.out",
            },
            0
          );
          // Screen nudge motion with elastic return
          tl.to(
            bobTarget,
            {
              x: 14,
              duration: 0.45,
              ease: "power2.in",
            },
            1.0
          );
          tl.to(
            bobTarget,
            {
              x: 0,
              duration: 1.1,
              ease: EASINGS.biyoo,
            },
            1.45
          );
          tl.add(() => {
            setActiveEyeVariant("awake");
            setActiveMouthVariant("smile");
          }, 1.6);
          break;
        }

        // ---------------------------------------------------------
        // 3. STARTLED: High jump, squeak, wide eyes
        // ---------------------------------------------------------
        case "startled": {
          setActiveEyeVariant("wide");
          setActiveMouthVariant("yawn");

          if (mode === "light") {
            if (bobTarget) {
              tl.to(bobTarget, {
                scale: 1.15,
                duration: 0.25,
                ease: "power2.out",
              });
              tl.to(bobTarget, {
                scale: 1.0,
                duration: 0.5,
                ease: "power2.out",
              });
            }
            break;
          }

          tl.to(
            bobTarget,
            {
              y: -32,
              scaleY: 1.16,
              scaleX: 0.88,
              duration: 0.35,
              ease: "power3.out",
            },
            0
          );
          tl.to(
            [armsL, armsR],
            {
              y: -14,
              rotation: (i) => (i === 0 ? -45 : 45),
              duration: 0.3,
              ease: "power2.out",
            },
            0
          );
          tl.to(
            [hornsL, hornsR],
            {
              rotation: (i) => (i === 0 ? -12 : 12),
              duration: 0.25,
              repeat: 2,
              yoyo: true,
              ease: "sine.inOut",
            },
            0.1
          );
          // Elastic landing
          tl.to(
            bobTarget,
            {
              y: 0,
              scaleY: 1,
              scaleX: 1,
              duration: 0.9,
              ease: EASINGS.biyoo,
            },
            0.35
          );
          tl.to(
            [armsL, armsR],
            {
              y: 0,
              rotation: 0,
              duration: 0.6,
              ease: EASINGS.biyoo,
            },
            0.4
          );
          break;
        }

        // ---------------------------------------------------------
        // 4. CURIOUS: Head tilt, lean
        // ---------------------------------------------------------
        case "curious": {
          setActiveEyeVariant("awake");
          setActiveMouthVariant("smile");

          if (mode === "light") {
            if (bobTarget) {
              tl.to(bobTarget, {
                scale: 1.05,
                duration: 0.4,
                ease: "power2.out",
              });
            }
            break;
          }

          tl.to(
            head,
            {
              rotation: 16,
              x: 6,
              duration: 0.6,
              ease: EASINGS.biyoo,
              transformOrigin: "center bottom",
            },
            0
          );
          tl.to(
            body,
            {
              rotation: 6,
              duration: 0.6,
              ease: EASINGS.biyoo,
              transformOrigin: "bottom center",
            },
            0
          );
          break;
        }

        // ---------------------------------------------------------
        // 5. HAPPY: Cheerful bounce
        // ---------------------------------------------------------
        case "happy": {
          setActiveEyeVariant("awake");
          setActiveMouthVariant("smile");

          if (mode === "light") {
            if (bobTarget) {
              tl.to(bobTarget, {
                scale: 1.1,
                duration: 0.35,
                repeat: 1,
                yoyo: true,
                ease: "power2.out",
              });
            }
            break;
          }

          tl.to(
            bobTarget,
            {
              y: -20,
              scaleY: 1.1,
              scaleX: 0.95,
              duration: 0.4,
              repeat: 1,
              yoyo: true,
              ease: "power2.out",
            },
            0
          );
          tl.to(
            [armsL, armsR],
            {
              y: -8,
              rotation: (i) => (i === 0 ? -25 : 25),
              duration: 0.4,
              repeat: 1,
              yoyo: true,
              ease: EASINGS.biyoo,
            },
            0
          );
          break;
        }

        // ---------------------------------------------------------
        // 6. PROUD: Chest puff, head held high
        // ---------------------------------------------------------
        case "proud": {
          setActiveEyeVariant("awake");
          setActiveMouthVariant("smile");

          if (mode === "light") {
            if (bobTarget) {
              tl.to(bobTarget, {
                scale: 1.08,
                duration: 0.5,
                ease: "power2.out",
              });
            }
            break;
          }

          tl.to(
            body,
            {
              scaleX: 1.14,
              scaleY: 1.08,
              y: -6,
              duration: 0.7,
              ease: EASINGS.biyoo,
              transformOrigin: "bottom center",
            },
            0
          );
          tl.to(
            head,
            {
              rotation: -4,
              y: -5,
              duration: 0.7,
              ease: EASINGS.biyoo,
            },
            0
          );
          tl.to(
            [armsL, armsR],
            {
              rotation: (i) => (i === 0 ? 20 : -20),
              x: (i) => (i === 0 ? 4 : -4),
              duration: 0.7,
              ease: EASINGS.biyoo,
            },
            0
          );
          break;
        }

        // ---------------------------------------------------------
        // 7. SLEEPY-AGAIN: Slow droop
        // ---------------------------------------------------------
        case "sleepy-again": {
          setActiveEyeVariant("sleepy");
          setActiveMouthVariant("droop");

          if (mode === "light") {
            if (bobTarget) {
              tl.to(bobTarget, {
                scale: 0.94,
                opacity: 0.85,
                duration: 1.0,
                ease: "power2.out",
              });
            }
            break;
          }

          tl.to(
            body,
            {
              y: 8,
              scaleY: 0.92,
              scaleX: 1.06,
              duration: 1.4,
              ease: "power2.inOut",
              transformOrigin: "bottom center",
            },
            0
          );
          tl.to(
            head,
            {
              y: 6,
              duration: 1.4,
              ease: "power2.inOut",
            },
            0
          );
          tl.to(
            [armsL, armsR],
            {
              y: 4,
              duration: 1.2,
              ease: "power2.inOut",
            },
            0
          );
          break;
        }

        // ---------------------------------------------------------
        // 8. NIGHT: Rubbing eyes
        // ---------------------------------------------------------
        case "night": {
          setActiveEyeVariant("sleepy");
          setActiveMouthVariant("smile");

          // Arms move over eyes and rub side-to-side
          tl.to(
            [armsL, armsR],
            {
              y: -14,
              x: (i) => (i === 0 ? 8 : -8),
              duration: 0.6,
              ease: "power2.out",
            },
            0
          );
          tl.to(
            armsL,
            {
              x: 12,
              duration: 0.35,
              repeat: 3,
              yoyo: true,
              ease: "sine.inOut",
            },
            0.6
          );
          tl.to(
            armsR,
            {
              x: -12,
              duration: 0.35,
              repeat: 3,
              yoyo: true,
              ease: "sine.inOut",
            },
            0.6
          );
          tl.to(
            [armsL, armsR],
            {
              y: 0,
              x: 0,
              duration: 0.8,
              ease: EASINGS.biyoo,
            },
            2.1
          );
          break;
        }
      }
    },
    { scope: containerRef, dependencies: [currentState, reducedMotion] }
  );

  // =========================================================
  // IDLE NUDGE (8s inactivity AFTER introDone)
  // Cancel immediately if visitor scrolls during sequence
  // =========================================================
  useEffect(() => {
    if (!introDone) return;

    // Trigger idle nudge once per page load
    if (idleSeconds >= 8 && !nudgeExecutedRef.current) {
      nudgeExecutedRef.current = true;
      nudgeActiveRef.current = true;
      transitionToState("yawn-wake");
    }

    // Cancel immediately if visitor scrolls while idle nudge is running
    if (nudgeActiveRef.current && scrollSpeed > 20) {
      nudgeActiveRef.current = false;
      setSpeech(null, 0);
      transitionToState("sleeping");
    }

    // Trigger sleepy-again after 60s of inactivity
    if (idleSeconds >= 60 && currentState !== "sleepy-again" && !nudgeActiveRef.current) {
      transitionToState("sleepy-again");
    }
  }, [introDone, idleSeconds, scrollSpeed, currentState, transitionToState, setSpeech]);

  // =========================================================
  // STAGE 7 TRIGGER: Listen to "biyoo:wake" custom event
  // =========================================================
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleWake = () => {
      transitionToState("startled");
    };

    window.addEventListener("biyoo:wake", handleWake);
    return () => {
      window.removeEventListener("biyoo:wake", handleWake);
    };
  }, [transitionToState]);

  // =========================================================
  // SCENARIO & INTERACTIVE ACTIONS: Listen to "biyoo:action"
  // =========================================================
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleAction = (e: Event) => {
      const customEvent = e as CustomEvent<{ state: BiyooState; line?: string | null }>;
      if (customEvent.detail?.state) {
        transitionToState(customEvent.detail.state);
        if (customEvent.detail.line !== undefined) {
          setSpeech(customEvent.detail.line, 4000);
        }
      }
    };

    window.addEventListener("biyoo:action", handleAction);
    return () => {
      window.removeEventListener("biyoo:action", handleAction);
    };
  }, [transitionToState, setSpeech]);

  // =========================================================
  // COSTUME HOOK: Listen to dynamic "biyoo:costume" event
  // =========================================================
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleCostume = (e: Event) => {
      const customEvent = e as CustomEvent<{ costume: BiyooCostume }>;
      if (customEvent.detail && customEvent.detail.costume !== undefined) {
        setOverrideCostume(customEvent.detail.costume);
      }
    };

    window.addEventListener("biyoo:costume", handleCostume);
    return () => {
      window.removeEventListener("biyoo:costume", handleCostume);
    };
  }, []);

  // React to hover target changes
  useEffect(() => {
    if (hoverTarget && currentState === "sleeping") {
      const timer = setTimeout(() => {
        transitionToState("curious");
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [hoverTarget, currentState, transitionToState]);

  // Manual interactive poke on click
  const handlePoke = () => {
    if (currentState === "sleeping" || currentState === "sleepy-again") {
      transitionToState("happy");
    } else {
      transitionToState("curious");
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex flex-col items-center justify-center select-none ${className}`}
      role="img"
      aria-label="Biyoo: companion fluff creature"
    >
      {/* Mini SystemWindow Speech Bubble */}
      {speechBubble && (
        <div
          className="absolute -top-16 left-0 sm:left-1/2 sm:-translate-x-1/2 z-30 pointer-events-none transition-all duration-300"
          role="status"
          aria-live="polite"
        >
          <div className="relative border border-star/60 bg-[rgba(14,17,24,0.95)] backdrop-blur-md px-3.5 py-1.5 rounded-sm shadow-[0_4px_16px_rgba(94,225,230,0.25)] text-center whitespace-nowrap">
            {/* Corner HUD ticks */}
            <span
              className="absolute -top-[1px] -left-[1px] w-1.5 h-1.5 border-t border-l border-star"
              aria-hidden="true"
            />
            <span
              className="absolute -top-[1px] -right-[1px] w-1.5 h-1.5 border-t border-r border-star"
              aria-hidden="true"
            />
            <span
              className="absolute -bottom-[1px] -left-[1px] w-1.5 h-1.5 border-b border-l border-star"
              aria-hidden="true"
            />
            <span
              className="absolute -bottom-[1px] -right-[1px] w-1.5 h-1.5 border-b border-r border-star"
              aria-hidden="true"
            />

            {/* Bubble Tail */}
            <div
              className="absolute -bottom-1.5 left-6 sm:left-1/2 sm:-translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-star/70"
              aria-hidden="true"
            />

            <span className="font-mono text-xs sm:text-sm text-star font-medium tracking-wide">
              {speechBubble}
            </span>
          </div>
        </div>
      )}

      {/* Lerped Follow / Interactive Touch Wrapper (min-w-[44px] min-h-[44px]) */}
      <div
        ref={followRef}
        onClick={handlePoke}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handlePoke();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label="Biyoo companion: tap to interact"
        className="cursor-pointer will-change-transform min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-star p-1"
      >
        <div className="biyoo-bob-target will-change-transform">
          <svg
            width={size}
            height={size}
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-lg overflow-visible"
          >
            <defs>
              {/* Soft fluffy body gradient using --feather (#F4F6FA) and --mist (#9AA7BD) */}
              <linearGradient
                id="biyoo_body_grad"
                x1="100"
                y1="40"
                x2="100"
                y2="170"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#F4F6FA" />
                <stop offset="100%" stopColor="#CCD5E4" />
              </linearGradient>

              {/* Horn Gradient using --rim (#9FB4D6) and --line (#243044) - NO RED */}
              <linearGradient id="biyoo_horn_grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F4F6FA" />
                <stop offset="100%" stopColor="#9FB4D6" />
              </linearGradient>
            </defs>

            {/* LAYER: legs L/R */}
            <g id="biyoo_legs_l" data-layer="legs L">
              <ellipse cx="78" cy="162" rx="14" ry="10" fill="#9AA7BD" />
            </g>
            <g id="biyoo_legs_r" data-layer="legs R">
              <ellipse cx="122" cy="162" rx="14" ry="10" fill="#9AA7BD" />
            </g>

            {/* LAYER: body (fluffy cotton lower mass) */}
            <g id="biyoo_body" data-layer="body">
              <ellipse cx="100" cy="125" rx="55" ry="40" fill="url(#biyoo_body_grad)" />
              <circle cx="58" cy="120" r="22" fill="#F4F6FA" opacity="0.9" />
              <circle cx="142" cy="120" r="22" fill="#F4F6FA" opacity="0.9" />
              <circle cx="70" cy="142" r="20" fill="#CCD5E4" opacity="0.6" />
              <circle cx="130" cy="142" r="20" fill="#CCD5E4" opacity="0.6" />
            </g>

            {/* LAYER: arms L/R (tiny stubby cotton puffs) */}
            <g id="biyoo_arms_l" data-layer="arms L">
              <circle cx="50" cy="118" r="13" fill="#F4F6FA" stroke="#CCD5E4" strokeWidth="1.5" />
            </g>
            <g id="biyoo_arms_r" data-layer="arms R">
              <circle cx="150" cy="118" r="13" fill="#F4F6FA" stroke="#CCD5E4" strokeWidth="1.5" />
            </g>

            {/* LAYER: head (round fluffy upper mass) */}
            <g id="biyoo_head" data-layer="head">
              <circle cx="100" cy="85" r="44" fill="#F4F6FA" />
              <path
                d="M 68 110 C 85 120, 115 120, 132 110"
                stroke="#9AA7BD"
                strokeWidth="2"
                fill="none"
                opacity="0.3"
              />
            </g>

            {/* LAYER: horns L/R (strictly no red) */}
            <g id="biyoo_horns_l" data-layer="horns L">
              <path
                d="M 76 54 C 74 44, 71 34, 65 30 C 70 34, 76 43, 84 51 Z"
                fill="url(#biyoo_horn_grad)"
                stroke="#243044"
                strokeWidth="1.5"
              />
            </g>
            <g id="biyoo_horns_r" data-layer="horns R">
              <path
                d="M 124 54 C 126 44, 129 34, 135 30 C 130 34, 124 43, 116 51 Z"
                fill="url(#biyoo_horn_grad)"
                stroke="#243044"
                strokeWidth="1.5"
              />
            </g>

            {/* LAYER: eyes (awake, sleepy slits, wide startled) */}
            <g id="biyoo_eyes" data-layer="eyes">
              {activeEyeVariant === "awake" && (
                <>
                  <circle cx="86" cy="82" r="6" fill="#0E1118" />
                  <circle cx="84" cy="80" r="2" fill="#FFFFFF" />
                  <circle cx="114" cy="82" r="6" fill="#0E1118" />
                  <circle cx="112" cy="80" r="2" fill="#FFFFFF" />
                </>
              )}
              {activeEyeVariant === "sleepy" && (
                <>
                  <path
                    d="M 80 84 Q 86 89 92 84"
                    stroke="#0E1118"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M 108 84 Q 114 89 120 84"
                    stroke="#0E1118"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                  />
                </>
              )}
              {activeEyeVariant === "wide" && (
                <>
                  <circle cx="86" cy="80" r="8" fill="#0E1118" />
                  <circle cx="84" cy="78" r="3" fill="#5EE1E6" />
                  <circle cx="114" cy="80" r="8" fill="#0E1118" />
                  <circle cx="112" cy="78" r="3" fill="#5EE1E6" />
                </>
              )}
            </g>

            {/* LAYER: mouth (smile, yawn open, droop) */}
            <g id="biyoo_mouth" data-layer="mouth">
              {activeMouthVariant === "smile" && (
                <path
                  d="M 94 92 Q 97 95 100 92 Q 103 95 106 92"
                  stroke="#243044"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              )}
              {activeMouthVariant === "yawn" && (
                <ellipse cx="100" cy="94" rx="5" ry="8" fill="#0E1118" />
              )}
              {activeMouthVariant === "droop" && (
                <path
                  d="M 95 95 Q 100 92 105 95"
                  stroke="#243044"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
              )}
              {/* Soft cold rim blush */}
              <ellipse cx="76" cy="90" rx="6" ry="3" fill="#9FB4D6" opacity="0.4" />
              <ellipse cx="124" cy="90" rx="6" ry="3" fill="#9FB4D6" opacity="0.4" />
            </g>

            {/* LAYER: cotton texture overlay */}
            <g id="biyoo_overlay" data-layer="cotton texture overlay" opacity="0.5">
              <circle cx="82" cy="58" r="8" fill="#FFFFFF" opacity="0.6" />
              <circle cx="118" cy="58" r="8" fill="#FFFFFF" opacity="0.6" />
              <circle cx="100" cy="52" r="10" fill="#FFFFFF" opacity="0.7" />
            </g>

            {/* LAYER: costume slot (swappable prop group) */}
            <g id="biyoo_costume_slot" data-layer="costume">
              {activeCostume === "star goggles" && (
                <g id="costume_star_goggles">
                  {/* Wire frame across bridge */}
                  <line x1="86" y1="82" x2="114" y2="82" stroke="#5EE1E6" strokeWidth="1.5" />
                  {/* Two circular lens rims (placeholder prop group per /docs/09) */}
                  <circle cx="86" cy="82" r="10" fill="none" stroke="#5EE1E6" strokeWidth="1.5" />
                  <circle cx="114" cy="82" r="10" fill="none" stroke="#5EE1E6" strokeWidth="1.5" />
                  {/* Left star lens overlay */}
                  <polygon
                    points="86,74 88,79 93,80 89,84 90,89 86,86 82,89 83,84 79,80 84,79"
                    fill="none"
                    stroke="#5EE1E6"
                    strokeWidth="1.2"
                  />
                  {/* Right star lens overlay */}
                  <polygon
                    points="114,74 116,79 121,80 117,84 118,89 114,86 110,89 111,84 107,80 112,79"
                    fill="none"
                    stroke="#5EE1E6"
                    strokeWidth="1.2"
                  />
                </g>
              )}
              {activeCostume === "headband" && (
                <g id="costume_headband">
                  {/* Leaf green band */}
                  <path
                    d="M 64 64 C 84 56, 116 56, 136 64"
                    stroke="#3E8E41"
                    strokeWidth="5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Small leaf emblem */}
                  <circle cx="100" cy="58" r="4" fill="#F1E4C3" stroke="#3E8E41" strokeWidth="1" />
                </g>
              )}
              {activeCostume === "chain bracelet" && (
                <g id="costume_chain_bracelet">
                  {/* Dark chain loop on arm */}
                  <ellipse
                    cx="50"
                    cy="120"
                    rx="10"
                    ry="5"
                    fill="none"
                    stroke="#243044"
                    strokeWidth="2.5"
                    strokeDasharray="2 2"
                  />
                </g>
              )}
              {activeCostume === "magnifier" && (
                <g id="costume_magnifier">
                  {/* Brass rim magnifier held by right arm */}
                  <circle cx="158" cy="112" r="10" fill="none" stroke="#D4B15F" strokeWidth="2" />
                  <line x1="164" y1="118" x2="172" y2="128" stroke="#D4B15F" strokeWidth="2.5" />
                </g>
              )}
            </g>
          </svg>
        </div>
      </div>

      <span className="font-mono text-[10px] text-mist/60 mt-1 tracking-wider">
        [BIYOO_{currentState.toUpperCase().replace("-", "_")}]
      </span>
    </div>
  );
}

export default Biyoo;
