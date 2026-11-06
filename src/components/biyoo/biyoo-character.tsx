/**
 * Biyoo Mascot Orchestrator Component
 *
 * Implements /docs/07-BIYOO-PERSONALITY-AND-SOUND.md and /docs/20 Section 3.
 * Manages pure state machine transitions, speech queue coordination,
 * cursor proximity lerp, audio hooks, and accessible keyboard interactions.
 */

"use client";

import React, { useRef, useState, useEffect, useCallback, useReducer } from "react";
import { useMode } from "@/lib/flags";
import { useScene, gsap } from "@/lib/motion";
import type { PointerPosition } from "@/lib/reader/types";
import type { BiyooCostume, BiyooState } from "./biyoo-types";
import { createInitialBiyooContext, biyooReducer } from "./biyoo-machine";
import { getBiyooReaction } from "./reaction-map";
import { BiyooRenderer } from "./biyoo-renderer";
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
  const speechTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { mode, reducedMotion, signals } = useMode();
  const audio = useBiyooAudio();

  // Pure state machine reducer initialization
  const [machineContext, dispatch] = useReducer(biyooReducer, localHour, createInitialBiyooContext);
  const [overrideCostume, setOverrideCostume] = useState<BiyooCostume>(null);
  const activeCostume = overrideCostume ?? costume ?? machineContext.costume;

  const currentMeta = getBiyooReaction(machineContext.state);

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

  // Gentle sleeping bob animation (Full mode only)
  useScene(
    () => {
      if (reducedMotion || !containerRef.current) return;
      const target = containerRef.current.querySelector(".biyoo-bob-target");
      if (!target) return;

      if (machineContext.state === "sleeping") {
        gsap.to(target, {
          y: mode === "light" ? 0 : -6,
          scale: 1.03,
          duration: 2.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          transformOrigin: "bottom center",
        });
      } else {
        gsap.killTweensOf(target);
        gsap.to(target, { y: 0, scale: 1, duration: 0.4, ease: "power2.out" });
      }
    },
    { scope: containerRef, dependencies: [machineContext.state, reducedMotion, mode] }
  );

  const handlePoke = () => {
    dispatch({ type: "POKE" });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("constellation:trigger", { detail: { context: "hover" } }));
    }
  };

  const effectiveSize = Math.max(72, Math.min(size, signals.isTouch ? 84 : 108));

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
        <div className="biyoo-bob-target will-change-transform">
          <BiyooRenderer
            size={effectiveSize}
            eyeVariant={currentMeta.eyeVariant}
            mouthVariant={currentMeta.mouthVariant}
            costume={activeCostume}
            isReduced={reducedMotion}
          />
        </div>
      </div>

      {reducedMotion && (
        <span className="font-mono text-[10px] text-mist/70 mt-1 tracking-wider uppercase" aria-hidden="true">[BIYOO_{machineContext.state.replace("-", "_")}]</span>
      )}
    </aside>
  );
}

export default Biyoo;
