"use client";

import React, { useEffect } from "react";
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
 * - Escape key closes/dismisses prompt
 * - Remembers choice in localStorage 'sound_pref'
 * - Touch-friendly 44px+ targets
 */
export function SoundPermissionPrompt({ className = "" }: SoundPermissionPromptProps) {
  const { promptVisible, dismissPrompt } = useSound();

  // Escape closes prompt
  useEffect(() => {
    if (!promptVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismissPrompt(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [promptVisible, dismissPrompt]);

  if (!promptVisible) {
    return null;
  }

  return (
    <div
      id="sound-permission-prompt"
      role="region"
      aria-label="Sound permission"
      className={`fixed z-50 w-auto p-2 sm:p-2.5 lg:p-4 rounded-xl border border-star/40 bg-ink/95 shadow-2xl backdrop-blur-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 sound-permission-prompt-pos ${className}`}
    >
      <div className="flex items-center gap-2 lg:items-start lg:gap-3">
        {/* Biyoo mini avatar - hidden on mobile/tablet for compact docked bar, visible on desktop */}
        <div className="hidden lg:flex w-9 h-9 rounded-full bg-star/15 border border-star/40 flex-shrink-0 items-center justify-center">
          <svg viewBox="0 0 40 40" className="w-6 h-6 text-star" fill="none" aria-hidden="true">
            <circle cx="20" cy="20" r="13" fill="#E2EAF4" />
            <path d="M 13 12 C 10 7 7 4 5 2 C 8 5 11 9 14 12 Z" fill="#2A0A10" />
            <path d="M 27 12 C 30 7 33 4 35 2 C 32 5 29 9 26 12 Z" fill="#2A0A10" />
            <circle cx="16" cy="18" r="1.5" fill="#0E1118" />
            <circle cx="24" cy="18" r="1.5" fill="#0E1118" />
            <path d="M 18 22 Q 20 24 22 22" stroke="#0E1118" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>

        <div className="flex items-center gap-2 lg:block lg:space-y-3 flex-1">
          <p className="font-ui text-xs sm:text-sm text-feather leading-snug whitespace-nowrap lg:whitespace-normal">
            <span className="lg:hidden">Sound on?</span>
            <span className="hidden lg:inline">Biyoo wants to say hi. Turn sound on?</span>
          </p>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => dismissPrompt(true)}
              className="px-2.5 sm:px-3.5 py-1 sm:py-2 rounded-lg border border-star bg-star/20 hover:bg-star/30 text-star font-mono text-xs font-semibold tracking-wide transition-colors focus:ring-2 focus:ring-star focus:outline-none whitespace-nowrap"
            >
              <span className="lg:hidden">On</span>
              <span className="hidden lg:inline">Turn sound on</span>
            </button>

            <button
              type="button"
              onClick={() => dismissPrompt(false)}
              className="px-2 sm:px-3.5 py-1 sm:py-2 rounded-lg border border-line bg-ink-2 hover:border-mist/40 text-mist hover:text-feather font-mono text-xs tracking-wide transition-colors focus:ring-2 focus:ring-star focus:outline-none whitespace-nowrap"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
