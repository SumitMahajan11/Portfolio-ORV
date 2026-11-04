"use client";

import React from "react";
import { useMode } from "@/lib/flags";

export interface MotionToggleProps {
  className?: string;
}

/**
 * MotionToggle Component:
 * Unobtrusive header/footer toggle control for switching between Full and Light motion modes.
 *
 * Rules:
 * - Displays "Motion: Full / Light"
 * - If system prefers-reduced-motion is active, displays "Motion: Reduced (OS)" and cannot force Full.
 * - Persists choice to sessionStorage for the session only.
 * - Switching modes does not reload the page and leaves zero orphaned ScrollTriggers.
 */
export function MotionToggle({ className = "" }: MotionToggleProps) {
  const { mode, reducedMotion, forceMode, isHydrated } = useMode();

  // Safe placeholder before hydration to avoid mismatches
  if (!isHydrated) {
    return (
      <div
        className={`inline-flex items-center gap-1 font-mono text-xs border border-line/40 bg-ink/40 rounded px-2 py-1 select-none opacity-60 ${className}`}
        aria-hidden="true"
      >
        <span className="text-mist text-[11px] sm:text-xs">Motion:</span>
        <span className="text-mist text-[11px] sm:text-xs px-1">Full / Light</span>
      </div>
    );
  }

  // If system requests reduced-motion, user cannot force full/light
  if (reducedMotion) {
    return (
      <div
        className={`inline-flex items-center gap-1 font-mono text-xs border border-line/60 bg-ink/70 rounded px-2 py-1 select-none ${className}`}
        role="status"
        aria-label="Motion mode: Reduced (System preference)"
      >
        <span className="text-mist text-[11px] sm:text-xs">Motion:</span>
        <span
          className="text-star/90 font-medium text-[11px] sm:text-xs px-1 rounded bg-star/10"
          title="System preferences requested reduced motion. Cannot be overridden."
        >
          Reduced (OS)
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1 font-mono text-xs border border-line/70 bg-ink/80 rounded px-2 py-1 shadow-sm backdrop-blur-xs select-none ${className}`}
      role="group"
      aria-label="Motion Mode Selection"
    >
      <span className="text-mist text-[11px] sm:text-xs">Motion:</span>
      <button
        type="button"
        onClick={() => forceMode("full")}
        className={`px-1.5 py-0.5 rounded text-[11px] sm:text-xs font-mono transition-all duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-star ${
          mode === "full"
            ? "bg-star/15 text-star font-bold border border-star/40"
            : "text-mist hover:text-feather border border-transparent"
        }`}
        aria-pressed={mode === "full"}
        title="Enable full motion animations"
      >
        Full
      </button>
      <span className="text-mist/40 text-[11px] pointer-events-none">/</span>
      <button
        type="button"
        onClick={() => forceMode("light")}
        className={`px-1.5 py-0.5 rounded text-[11px] sm:text-xs font-mono transition-all duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-star ${
          mode === "light"
            ? "bg-star/15 text-star font-bold border border-star/40"
            : "text-mist hover:text-feather border border-transparent"
        }`}
        aria-pressed={mode === "light"}
        title="Enable light mode (simplified animations, reduced particles)"
      >
        Light
      </button>
    </div>
  );
}

export default MotionToggle;
