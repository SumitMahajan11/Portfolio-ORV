"use client";

import React from "react";
import { useSound } from "@/lib/sound";

export interface SoundPermissionPromptProps {
  className?: string;
}

/**
 * SoundPermissionPrompt:
 * Non-blocking prompt asking the visitor for permission to play sound.
 *
 * Rules:
 * - Exact text: "Biyoo wants to say hi. Turn sound on?"
 * - Buttons: "Turn sound on" (primary) and "Not now" (secondary)
 * - Shown once after intro, non-modal / never blocks content
 * - Remembers choice in localStorage 'sound_pref'
 * - Touch-friendly 44px+ targets
 */
export function SoundPermissionPrompt({ className = "" }: SoundPermissionPromptProps) {
  const { promptVisible, dismissPrompt } = useSound();

  if (!promptVisible) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Sound permission"
      className={`fixed z-50 bottom-20 right-4 sm:right-6 max-w-sm w-[calc(100vw-2rem)] sm:w-auto p-4 rounded-xl border border-star/40 bg-ink/95 shadow-2xl backdrop-blur-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${className}`}
      style={{
        bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="flex items-start gap-3">
        {/* Biyoo mini avatar */}
        <div className="w-9 h-9 rounded-full bg-star/15 border border-star/40 flex-shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 40 40" className="w-6 h-6 text-star" fill="none" aria-hidden="true">
            <circle cx="20" cy="20" r="13" fill="#E2EAF4" />
            <path d="M 13 12 C 10 7 7 4 5 2 C 8 5 11 9 14 12 Z" fill="#2A0A10" />
            <path d="M 27 12 C 30 7 33 4 35 2 C 32 5 29 9 26 12 Z" fill="#2A0A10" />
            <circle cx="16" cy="18" r="1.5" fill="#0E1118" />
            <circle cx="24" cy="18" r="1.5" fill="#0E1118" />
            <path d="M 18 22 Q 20 24 22 22" stroke="#0E1118" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>

        <div className="space-y-3 flex-1">
          <p className="font-ui text-xs sm:text-sm text-feather leading-snug">
            Biyoo wants to say hi. Turn sound on?
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => dismissPrompt(true)}
              className="min-h-[44px] px-3.5 py-2 rounded-lg border border-star bg-star/20 hover:bg-star/30 text-star font-mono text-xs font-semibold tracking-wide transition-colors focus:ring-2 focus:ring-star focus:outline-none"
            >
              Turn sound on
            </button>

            <button
              type="button"
              onClick={() => dismissPrompt(false)}
              className="min-h-[44px] px-3.5 py-2 rounded-lg border border-line bg-ink-2 hover:border-mist/40 text-mist hover:text-feather font-mono text-xs tracking-wide transition-colors focus:ring-2 focus:ring-star focus:outline-none"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
