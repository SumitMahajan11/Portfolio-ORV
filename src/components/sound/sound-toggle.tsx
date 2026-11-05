"use client";

import React from "react";
import { useSound } from "@/lib/sound";

export interface SoundToggleProps {
  className?: string;
}

/**
 * SoundToggle:
 * Header button allowing the user to toggle sound on/off at any time.
 * Persists preference to localStorage key 'sound_pref'.
 */
export function SoundToggle({ className = "" }: SoundToggleProps) {
  const { soundEnabled, toggleSound } = useSound();

  return (
    <button
      type="button"
      onClick={toggleSound}
      aria-label={soundEnabled ? "Mute sound" : "Turn sound on"}
      title={soundEnabled ? "Sound: On (Click to mute)" : "Sound: Off (Click to turn on)"}
      className={`inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg border border-line bg-ink/70 hover:border-star/50 text-feather hover:text-star font-mono text-xs transition-colors focus:ring-2 focus:ring-star focus:outline-none select-none ${className}`}
    >
      {soundEnabled ? (
        <>
          {/* Speaker with sound waves */}
          <svg
            className="w-4 h-4 text-star flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
          <span className="hidden sm:inline text-star">Sound On</span>
        </>
      ) : (
        <>
          {/* Speaker with mute slash */}
          <svg
            className="w-4 h-4 text-mist flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="none" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
          <span className="hidden sm:inline text-mist">Sound Off</span>
        </>
      )}
    </button>
  );
}
