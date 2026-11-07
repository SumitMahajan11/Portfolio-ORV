/**
 * Biyoo SystemWindow Speech Bubble
 *
 * Implements /docs/07-BIYOO-PERSONALITY-AND-SOUND.md and /docs/20 Section 3.5.
 * Mini SystemWindow style speech balloon with safe bounds and corner HUD ticks.
 */

import React from "react";

export interface BiyooSpeechProps {
  speech: string | null;
  className?: string;
}

export function BiyooSpeech({ speech, className = "" }: BiyooSpeechProps) {
  if (!speech) return null;

  return (
    <div
      className={`absolute -top-14 left-0 sm:left-1/2 sm:-translate-x-1/2 z-30 pointer-events-none transition-all duration-300 animate-in fade-in zoom-in-95 ${className}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="relative border border-star/70 bg-[#0E1118]/95 backdrop-blur-md px-3 py-1 rounded shadow-[0_4px_20px_rgba(94,225,230,0.3)] text-center min-w-[70px] max-w-[130px] sm:max-w-[200px]">
        {/* 4 Corner HUD ticks */}
        <span
          className="absolute -top-[1px] -left-[1px] w-1.5 h-1.5 border-t-2 border-l-2 border-star pointer-events-none"
          aria-hidden="true"
        />
        <span
          className="absolute -top-[1px] -right-[1px] w-1.5 h-1.5 border-t-2 border-r-2 border-star pointer-events-none"
          aria-hidden="true"
        />
        <span
          className="absolute -bottom-[1px] -left-[1px] w-1.5 h-1.5 border-b-2 border-l-2 border-star pointer-events-none"
          aria-hidden="true"
        />
        <span
          className="absolute -bottom-[1px] -right-[1px] w-1.5 h-1.5 border-b-2 border-r-2 border-star pointer-events-none"
          aria-hidden="true"
        />

        {/* Downward speech bubble tail pointing towards Biyoo */}
        <div
          className="absolute -bottom-1.5 left-6 sm:left-1/2 sm:-translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-star/80"
          aria-hidden="true"
        />

        {/* Speech text */}
        <p className="font-mono text-xs sm:text-sm text-star font-medium tracking-wide whitespace-nowrap overflow-hidden text-ellipsis">
          {speech}
        </p>
      </div>
    </div>
  );
}
