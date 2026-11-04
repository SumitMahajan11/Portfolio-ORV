"use client";

import React from "react";
import type { ConstellationLine } from "@/content/types";
import { useMode } from "@/lib/flags";

export interface ConstellationOverlayProps {
  line: ConstellationLine | null;
  onDismiss?: () => void;
  className?: string;
}

/**
 * ConstellationOverlay:
 * Floating system comment HUD presenting Constellation messages.
 *
 * Rules:
 * - Floating teal system comment style
 * - In reduced motion mode: appears statically without float animation or ping effects
 * - Auto-hidden by engine or dismissible
 */
export function ConstellationOverlay({
  line,
  onDismiss,
  className = "",
}: ConstellationOverlayProps) {
  const { reducedMotion } = useMode();

  if (!line) return null;

  return (
    <div
      className={`fixed top-24 right-4 sm:top-28 sm:right-8 z-40 max-w-[300px] sm:max-w-sm pointer-events-auto transition-all duration-300 ${
        reducedMotion ? "" : "animate-pulse"
      } ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="relative border border-star/50 bg-[rgba(14,17,24,0.92)] backdrop-blur-md shadow-[0_4px_24px_rgba(94,225,230,0.15)] p-3 sm:p-4 font-mono">
        {/* Decorative corner brackets in --star teal */}
        <span
          className="pointer-events-none absolute -top-[1px] -left-[1px] h-2 w-2 border-t-2 border-l-2 border-star"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -top-[1px] -right-[1px] h-2 w-2 border-t-2 border-r-2 border-star"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -bottom-[1px] -left-[1px] h-2 w-2 border-b-2 border-l-2 border-star"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -bottom-[1px] -right-[1px] h-2 w-2 border-b-2 border-r-2 border-star"
          aria-hidden="true"
        />

        {/* Header tag */}
        <div className="flex items-center justify-between gap-2 border-b border-line/60 pb-1.5 mb-2">
          <div className="flex items-center gap-1.5 text-star">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full bg-star ${
                reducedMotion ? "" : "animate-ping"
              }`}
            />
            <span className="font-display text-[10px] sm:text-xs font-semibold tracking-wider uppercase">
              [CONSTELLATION BROADCAST]
            </span>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-mist hover:text-feather text-xs font-mono px-1 transition-colors"
              aria-label="Dismiss constellation comment"
            >
              &times;
            </button>
          )}
        </div>

        {/* Message body */}
        <p className="text-xs sm:text-sm text-feather font-mono leading-relaxed">
          &ldquo;{line.text}&rdquo;
        </p>

        {/* Footer info */}
        <div className="mt-2 pt-1 border-t border-line/40 flex items-center justify-between text-[10px] text-mist/70 font-mono">
          <span>CHANNEL #8612</span>
          <span className="uppercase">{line.context}</span>
        </div>
      </div>
    </div>
  );
}

export default ConstellationOverlay;
