/**
 * Biyoo Mascot Orchestrator Component
 *
 * Implements /docs/07-BIYOO-PERSONALITY-AND-SOUND.md and /docs/20 Section 3.
 * Powered by owner's real art:
 * - Stacked calm & excited poses (/art/biyoo/biyoo-calm-* and /art/biyoo/biyoo-excited-*)
 * - Golden exclamation burst sprite (/art/biyoo/biyoo-burst-*)
 * - GSAP idle bob (+-4px, 3.2s sine yoyo) with squash (scaleY 1 -> 0.985, scaleX 1 -> 1.01)
 * - 0.18s crossfade between calm and excited + squash/stretch bounce
 * - Burst pops in (scale 0.6 -> 1.1 -> 1, opacity 0 -> 1, 0.25s) and fades after 1.2s
 * - Pure state machine transitions, speech queue coordination, cursor proximity lerp
 */

"use client";

import React, { useRef, useState, useEffect, useCallback, useReducer } from "react";
import { useMode } from "@/lib/flags";
import { gsap } from "@/lib/motion";
import type { PointerPosition } from "@/lib/reader/types";
import { ART_ALT_REGISTRY } from "@/content/art-alt";
import type { BiyooCostume, BiyooState } from "./biyoo-types";
import { createInitialBiyooContext, biyooReducer } from "./biyoo-machine";
import { getBiyooReaction } from "./reaction-map";
import { BiyooSpeech } from "./biyoo-speech";
import { useBiyooAudio } from "./use-biyoo-audio";

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

export function Biyoo({
  className = "",
  size = 110,
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
  const bobRef = useRef<HTMLDivElement>(null);
  const bounceRef = useRef<HTMLDivElement>(null);
  const calmImgRef = useRef<HTMLImageElement>(null);
  const excitedImgRef = useRef<HTMLImageElement>(null);
  const burstImgRef = useRef<HTMLImageElement>(null);
  const speechTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  const { mode, reducedMotion, signals } = useMode();
  const audio = useBiyooAudio();

  // Pure state machine reducer initialization
  const [machineContext, dispatch] = useReducer(biyooReducer, localHour, createInitialBiyooContext);
  const [overrideCostume, setOverrideCostume] = useState<BiyooCostume>(null);
  void (overrideCostume ?? costume ?? machineContext.costume); // Preserved API

  const currentMeta = getBiyooReaction(machineContext.state);

  // Map existing states: alert, surprise, success, or reaction -> excited + burst; others -> calm
  const isExcited =
    machineContext.state === "startled" ||
    machineContext.state === "happy" ||
    machineContext.state === "proud" ||
    machineContext.state === "curious";

  // Broadcast speech state to window and parent callback
  const notifySpeaking = useCallback(
    (speaking: boolean) => {
      onSpeakingChange?.(speaking);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("biyoo:speaking", { detail: { isSpeaking: speaking } }));
      }
    },
    [onSpeakingChange]
  );

  // Synchronize audio and speech timers on state transitions
  useEffect(() => {
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }

    if (machineContext.speech) {
      notifySpeaking(true);
      const hideMs = currentMeta.autoHideMs > 0 ? currentMeta.autoHideMs : 4000;
      speechTimerRef.current = setTimeout(() => {
        dispatch({ type: "SPEECH_DISMISSED" });
        notifySpeaking(false);
        speechTimerRef.current = null;
      }, hideMs);
    } else {
      notifySpeaking(false);
    }

    // Sound triggering
    if (!reducedMotion) {
      if (machineContext.state === "sleeping" || machineContext.state === "sleepy-again") {
        audio.startBreathing();
      } else {
        audio.stopBreathing();
        if (currentMeta.sound === "squeak") audio.playSqueak();
        else if (currentMeta.sound === "yawn") audio.playYawn();
        else if (currentMeta.sound === "boing") audio.playBoing();
        else if (currentMeta.sound === "pat") audio.playPat();
        else if (currentMeta.sound === "chirp") audio.playChirp();
      }
    }
  }, [machineContext.state, machineContext.speech, currentMeta, notifySpeaking, audio, reducedMotion]);

  // Handle external signals: idle seconds, fast scroll, hover
  useEffect(() => {
    if (introDone) dispatch({ type: "IDLE_TICK", idleSeconds });
  }, [introDone, idleSeconds]);
  useEffect(() => {
    if (scrollSpeed > 20) dispatch({ type: "FAST_SCROLL", speed: scrollSpeed });
  }, [scrollSpeed]);
  useEffect(() => {
    if (hoverTarget) dispatch({ type: "CARD_HOVER", targetId: hoverTarget });
  }, [hoverTarget]);

  // Window event listeners: stage glitch, proofs, manual actions
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onWake = () => dispatch({ type: "STAGE_CHANGE", stage: 7 });
    const onProof = () => dispatch({ type: "PROOF_OPENED" });
    const onAction = (e: Event) => {
      const d = (e as CustomEvent<{ state: BiyooState; line?: string | null }>).detail;
      if (d?.state) dispatch({ type: "SET_STATE", state: d.state, line: d.line });
    };
    const onCostume = (e: Event) => {
      const d = (e as CustomEvent<{ costume: BiyooCostume }>).detail;
      if (d?.costume !== undefined) setOverrideCostume(d.costume);
    };
    const onConstellation = (e: Event) => {
      const d = (e as CustomEvent<{ isShowing: boolean }>).detail;
      if (d && typeof d.isShowing === "boolean") dispatch({ type: "CONSTELLATION_STATE", isShowing: d.isShowing });
    };

    window.addEventListener("biyoo:wake", onWake);
    window.addEventListener("biyoo:proof", onProof);
    window.addEventListener("biyoo:action", onAction);
    window.addEventListener("biyoo:costume", onCostume);
    window.addEventListener("constellation:status", onConstellation);

    return () => {
      window.removeEventListener("biyoo:wake", onWake);
      window.removeEventListener("biyoo:proof", onProof);
      window.removeEventListener("biyoo:action", onAction);
      window.removeEventListener("biyoo:costume", onCostume);
      window.removeEventListener("constellation:status", onConstellation);
    };
  }, []);

  // Desktop cursor proximity follow (clamped translate, disabled in light/reduced/touch)
  useEffect(() => {
    if (signals.isTouch || reducedMotion || mode === "light" || typeof window === "undefined") return;

    let rafId: number;
    let currentX = 0;
    let currentY = 0;

    const animateFollow = () => {
      if (containerRef.current && followRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const deltaX = pointerPosition.x - (rect.left + rect.width / 2);
        const deltaY = pointerPosition.y - (rect.top + rect.height / 2);
        const targetX = Math.max(-20, Math.min(20, deltaX * 0.04));
        const targetY = Math.max(-16, Math.min(16, deltaY * 0.04));
        currentX += (targetX - currentX) * 0.08;
        currentY += (targetY - currentY) * 0.08;
        followRef.current.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
      }
      rafId = requestAnimationFrame(animateFollow);
    };

    rafId = requestAnimationFrame(animateFollow);
    return () => cancelAnimationFrame(rafId);
  }, [pointerPosition, signals.isTouch, reducedMotion, mode]);

  // 1. Idle Bob & Squash Motion (Full mode only)
  useEffect(() => {
    const el = bobRef.current;
    if (!el || typeof window === "undefined") return;

    if (reducedMotion || mode === "light") {
      gsap.set(el, { y: 0, scaleX: 1, scaleY: 1, clearProps: "transform" });
      return;
    }

    // idle bob (+-4px, 3.2s sine yoyo) with tiny squash (scaleY 1 -> 0.985, scaleX 1 -> 1.01 in sync)
    const tween = gsap.fromTo(
      el,
      { y: 4, scaleY: 0.985, scaleX: 1.01 },
      {
        y: -4,
        scaleY: 1.0,
        scaleX: 1.0,
        duration: 1.6,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        transformOrigin: "bottom center",
      }
    );

    return () => {
      tween.kill();
    };
  }, [reducedMotion, mode]);

  // 2. Calm to Excited Crossfade, Squash/Stretch Bounce, and Burst Sprite Animation
  useEffect(() => {
    const calmEl = calmImgRef.current;
    const excitedEl = excitedImgRef.current;
    const burstEl = burstImgRef.current;
    const bounceEl = bounceRef.current;
    if (!calmEl || !excitedEl || !burstEl || !bounceEl) return;

    // Skip redundant animation on initial mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Reduced motion or light mode: swap instantly without animation
    if (reducedMotion || mode === "light") {
      if (isExcited) {
        gsap.set(calmEl, { opacity: 0 });
        gsap.set(excitedEl, { opacity: 1 });
        gsap.set(burstEl, { opacity: 1, scale: 1 });
      } else {
        gsap.set(calmEl, { opacity: 1 });
        gsap.set(excitedEl, { opacity: 0 });
        gsap.set(burstEl, { opacity: 0, scale: 0.6 });
      }
      gsap.set(bounceEl, { y: 0, scaleX: 1, scaleY: 1, clearProps: "transform" });
      return;
    }

    if (isExcited) {
      // 0.18s crossfade of the two poses
      gsap.to(calmEl, { opacity: 0, duration: 0.18, ease: "power1.inOut", overwrite: "auto" });
      gsap.to(excitedEl, { opacity: 1, duration: 0.18, ease: "power1.inOut", overwrite: "auto" });

      // Squash/stretch bounce
      gsap.timeline({ overwrite: "auto" })
        .to(bounceEl, { scaleX: 1.12, scaleY: 0.88, duration: 0.08, ease: "power2.out", transformOrigin: "bottom center" })
        .to(bounceEl, { scaleX: 0.94, scaleY: 1.08, y: -10, duration: 0.18, ease: "power2.out", transformOrigin: "bottom center" })
        .to(bounceEl, { scaleX: 1.02, scaleY: 0.98, y: 0, duration: 0.16, ease: "bounce.out", transformOrigin: "bottom center" })
        .to(bounceEl, { scaleX: 1, scaleY: 1, duration: 0.1, ease: "power1.out", transformOrigin: "bottom center" });

      // Burst pops in (scale 0.6 -> 1.1 -> 1, opacity 0 -> 1, 0.25s) and fades after 1.2s
      gsap.timeline({ overwrite: "auto" })
        .fromTo(
          burstEl,
          { scale: 0.6, opacity: 0 },
          { scale: 1.1, opacity: 1, duration: 0.15, ease: "power2.out", transformOrigin: "bottom right" }
        )
        .to(burstEl, { scale: 1.0, duration: 0.1, ease: "power1.out", transformOrigin: "bottom right" })
        .to(burstEl, { opacity: 0, duration: 0.3, ease: "power2.in", delay: 1.2 });
    } else {
      // Crossfade back to calm
      gsap.to(calmEl, { opacity: 1, duration: 0.18, ease: "power1.inOut", overwrite: "auto" });
      gsap.to(excitedEl, { opacity: 0, duration: 0.18, ease: "power1.inOut", overwrite: "auto" });
      gsap.to(burstEl, { opacity: 0, scale: 0.6, duration: 0.18, ease: "power2.in", overwrite: "auto" });
      gsap.to(bounceEl, { scaleX: 1, scaleY: 1, y: 0, duration: 0.2, ease: "power1.out", overwrite: "auto" });
    }
  }, [isExcited, reducedMotion, mode]);

  const handlePoke = () => {
    dispatch({ type: "POKE" });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("constellation:trigger", { detail: { context: "hover" } }));
    }
  };

  const effectiveSize = Math.max(72, Math.min(size, 108));

  return (
    <aside
      ref={containerRef}
      aria-label="Biyoo companion mascot"
      className={`relative inline-flex flex-col items-center justify-center select-none max-w-[clamp(72px,10vw,110px)] ${className}`}
    >
      <BiyooSpeech speech={machineContext.speech} />

      <div
        ref={followRef}
        onClick={handlePoke}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handlePoke();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label="Biyoo companion: tap to interact"
        className="biyoo-interactive-target cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-star p-1 focus:outline-none"
      >
        <div ref={bobRef} className="biyoo-bob-target flex items-center justify-center">
          <div ref={bounceRef} className="biyoo-bounce-target relative flex items-center justify-center">
            {/* Real Art Stacked Wrapper: calm pose, excited pose, and burst sprite */}
            <div
              className="biyoo-art-wrapper relative select-none"
              style={{
                width: effectiveSize,
                height: Math.round(effectiveSize * (891 / 1000)),
                maxWidth: "clamp(72px, 10vw, 110px)",
                aspectRatio: "1000 / 891",
              }}
            >
              {/* Calm pose image */}
              <picture className="absolute inset-0 w-full h-full pointer-events-none">
                <source
                  type="image/avif"
                  media="(max-width: 639px)"
                  srcSet="/art/biyoo/biyoo-calm-360.avif"
                />
                <source
                  type="image/avif"
                  media="(min-width: 640px)"
                  srcSet="/art/biyoo/biyoo-calm-360.avif 1x, /art/biyoo/biyoo-calm-720.avif 2x"
                />
                <source
                  type="image/webp"
                  media="(max-width: 639px)"
                  srcSet="/art/biyoo/biyoo-calm-360.webp"
                />
                <source
                  type="image/webp"
                  media="(min-width: 640px)"
                  srcSet="/art/biyoo/biyoo-calm-360.webp 1x, /art/biyoo/biyoo-calm-720.webp 2x"
                />
                <img
                  ref={calmImgRef}
                  src="/art/biyoo/biyoo-calm-360.webp"
                  alt={ART_ALT_REGISTRY.biyoo_calm.alt}
                  width={100}
                  height={89}
                  decoding="sync"
                  loading="eager"
                  fetchPriority="high"
                  className="biyoo-pose-calm absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                  style={{ opacity: 1 }}
                />
              </picture>

              {/* Excited pose image (stacked on top, opacity 0) */}
              <picture className="absolute inset-0 w-full h-full pointer-events-none">
                <source
                  type="image/avif"
                  srcSet="/art/biyoo/biyoo-excited-360.avif 1x, /art/biyoo/biyoo-excited-720.avif 2x"
                />
                <source
                  type="image/webp"
                  srcSet="/art/biyoo/biyoo-excited-360.webp 1x, /art/biyoo/biyoo-excited-720.webp 2x"
                />
                <img
                  ref={excitedImgRef}
                  src="/art/biyoo/biyoo-excited-360.webp"
                  alt={ART_ALT_REGISTRY.biyoo_excited.alt}
                  width={100}
                  height={89}
                  decoding="async"
                  loading="lazy"
                  className="biyoo-pose-excited absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                  style={{ opacity: 0 }}
                />
              </picture>

              {/* Golden '!!' burst sprite positioned next to left horn at about -12% x, -8% y */}
              <div
                className="absolute pointer-events-none"
                style={{
                  top: "-8%",
                  left: "-12%",
                  width: "32%",
                  aspectRatio: "1 / 1",
                  zIndex: 2,
                }}
              >
                <picture className="w-full h-full block">
                  <source
                    type="image/avif"
                    srcSet="/art/biyoo/biyoo-burst-96.avif 1x, /art/biyoo/biyoo-burst-192.avif 2x"
                  />
                  <source
                    type="image/webp"
                    srcSet="/art/biyoo/biyoo-burst-96.webp 1x, /art/biyoo/biyoo-burst-192.webp 2x"
                  />
                  <img
                    ref={burstImgRef}
                    src="/art/biyoo/biyoo-burst-96.webp"
                    alt={ART_ALT_REGISTRY.biyoo_burst.alt}
                    aria-hidden="true"
                    width={36}
                    height={36}
                    decoding="async"
                    loading="lazy"
                    className="biyoo-burst-sprite w-full h-full object-contain pointer-events-none select-none"
                    style={{
                      opacity: 0,
                      transform: "scale(0.6)",
                      transformOrigin: "bottom right",
                    }}
                  />
                </picture>
              </div>
            </div>
          </div>
        </div>
      </div>

      {reducedMotion && (
        <span className="font-mono text-[10px] text-mist/70 mt-1 tracking-wider uppercase" aria-hidden="true">
          [BIYOO_{machineContext.state.replace("-", "_")}]
        </span>
      )}
    </aside>
  );
}

export default Biyoo;
