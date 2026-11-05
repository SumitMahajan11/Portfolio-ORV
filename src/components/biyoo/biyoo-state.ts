/**
 * Biyoo State Machine Types & Metadata
 *
 * Implements the state machine from /docs/07-BIYOO-PERSONALITY-AND-SOUND.md:
 * States: sleeping, yawn-wake, startled, curious, happy, proud, sleepy-again, night.
 * Plus costume prop slots.
 */

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

export interface BiyooStateMeta {
  state: BiyooState;
  line: string | null;
  autoHideMs: number;
}

export const BIYOO_STATES_CONFIG: Record<BiyooState, BiyooStateMeta> = {
  sleeping: {
    state: "sleeping",
    line: null,
    autoHideMs: 0,
  },
  "yawn-wake": {
    state: "yawn-wake",
    line: "Scroll, reader.",
    autoHideMs: 4000,
  },
  startled: {
    state: "startled",
    line: "!!",
    autoHideMs: 4000,
  },
  curious: {
    state: "curious",
    line: "Ooh?",
    autoHideMs: 4000,
  },
  happy: {
    state: "happy",
    line: "Good choice.",
    autoHideMs: 4000,
  },
  proud: {
    state: "proud",
    line: "Evidence found.",
    autoHideMs: 4000,
  },
  "sleepy-again": {
    state: "sleepy-again",
    line: "...zzz",
    autoHideMs: 4000,
  },
  night: {
    state: "night",
    line: "Why are you awake, reader?",
    autoHideMs: 4000,
  },
};
