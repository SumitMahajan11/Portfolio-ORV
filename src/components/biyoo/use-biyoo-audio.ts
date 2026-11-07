/**
 * Biyoo Audio Integration Hook
 *
 * Implements /docs/20-HERO-BIYOO-STRUCTURE.md Section 3.6.
 * Connects Biyoo triggers directly to the existing SoundProvider context.
 * Audio is off by default, fails silently if files are missing or tab is hidden.
 */

import { useCallback } from "react";
import { useSound } from "@/lib/sound/sound-context";

export function useBiyooAudio() {
  const { soundEnabled, playSound, stopSound } = useSound();

  const playPat = useCallback(() => {
    playSound("pat");
  }, [playSound]);

  const playSqueak = useCallback(() => {
    playSound("squeak");
  }, [playSound]);

  const playYawn = useCallback(() => {
    playSound("yawn");
  }, [playSound]);

  const playChirp = useCallback(() => {
    playSound("chirp");
  }, [playSound]);

  const playBoing = useCallback(() => {
    playSound("boing");
  }, [playSound]);

  const startBreathing = useCallback(() => {
    playSound("breath");
  }, [playSound]);

  const stopBreathing = useCallback(() => {
    stopSound("breath");
  }, [stopSound]);

  return {
    soundEnabled,
    playPat,
    playSqueak,
    playYawn,
    playChirp,
    playBoing,
    startBreathing,
    stopBreathing,
  };
}
