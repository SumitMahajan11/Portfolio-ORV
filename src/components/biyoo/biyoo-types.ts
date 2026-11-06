/**
 * Biyoo Mascot Types & State Definitions
 *
 * Implements specifications from /docs/07-BIYOO-PERSONALITY-AND-SOUND.md
 * and /docs/20-HERO-BIYOO-STRUCTURE.md (Section 3).
 */

import type { SoundName } from "@/lib/sound/types";

export type BiyooState =
  | "sleeping"
  | "yawn-wake"
  | "startled"
  | "curious"
  | "happy"
  | "proud"
  | "sleepy-again"
  | "night";

export type BiyooCostume =
  | "star goggles"
  | "headband"
  | "leaf headband"
  | "chain bracelet"
  | "magnifier"
  | null;

export type BiyooEyeVariant = "awake" | "sleepy" | "wide" | "curious" | "proud";
export type BiyooMouthVariant = "smile" | "yawn" | "droop" | "open" | "surprise";

export interface BiyooStateMeta {
  state: BiyooState;
  line: string | null;
  sound: SoundName | null;
  autoHideMs: number;
  eyeVariant: BiyooEyeVariant;
  mouthVariant: BiyooMouthVariant;
}

export type BiyooEvent =
  | { type: "IDLE_TICK"; idleSeconds: number }
  | { type: "POKE" }
  | { type: "STAGE_CHANGE"; stage: number }
  | { type: "PROOF_OPENED" }
  | { type: "CARD_HOVER"; targetId: string }
  | { type: "SCENARIO_SELECTED"; scenarioId: string }
  | { type: "FAST_SCROLL"; speed: number }
  | { type: "CONSTELLATION_STATE"; isShowing: boolean }
  | { type: "SPEECH_DISMISSED" }
  | { type: "COSTUME_CHANGE"; costume: BiyooCostume }
  | { type: "SET_STATE"; state: BiyooState; line?: string | null };

export interface BiyooContext {
  state: BiyooState;
  speech: string | null;
  costume: BiyooCostume;
  constellationShowing: boolean;
  idleNudgeExecuted: boolean;
  nudgeActive: boolean;
  lastInteractionTime: number;
}

export interface BiyooTransitionResult {
  nextState: BiyooState;
  line: string | null;
  sound: SoundName | null;
  preemptConstellation: boolean;
  speechDurationMs: number;
}
