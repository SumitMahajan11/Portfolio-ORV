/**
 * Biyoo Reaction & Metadata Map
 *
 * Implements /docs/07-BIYOO-PERSONALITY-AND-SOUND.md:
 * Defines reactions, speech lines, sound effects, and facial expressions.
 */

import type { BiyooState, BiyooStateMeta } from "./biyoo-types";

export const BIYOO_REACTION_MAP: Record<BiyooState, BiyooStateMeta> = {
  sleeping: {
    state: "sleeping",
    line: null,
    sound: "breath",
    autoHideMs: 0,
    eyeVariant: "sleepy",
    mouthVariant: "smile",
  },
  "yawn-wake": {
    state: "yawn-wake",
    line: "Scroll, reader.",
    sound: "yawn",
    autoHideMs: 4000,
    eyeVariant: "sleepy",
    mouthVariant: "yawn",
  },
  startled: {
    state: "startled",
    line: "!!",
    sound: "squeak",
    autoHideMs: 4000,
    eyeVariant: "wide",
    mouthVariant: "surprise",
  },
  curious: {
    state: "curious",
    line: "Ooh?",
    sound: "pat",
    autoHideMs: 4000,
    eyeVariant: "curious",
    mouthVariant: "open",
  },
  happy: {
    state: "happy",
    line: "Good choice.",
    sound: "boing",
    autoHideMs: 4000,
    eyeVariant: "awake",
    mouthVariant: "smile",
  },
  proud: {
    state: "proud",
    line: "Evidence found.",
    sound: "chirp",
    autoHideMs: 4000,
    eyeVariant: "proud",
    mouthVariant: "smile",
  },
  "sleepy-again": {
    state: "sleepy-again",
    line: "...zzz",
    sound: "breath",
    autoHideMs: 4000,
    eyeVariant: "sleepy",
    mouthVariant: "droop",
  },
  night: {
    state: "night",
    line: "Why are you awake, reader?",
    sound: "yawn",
    autoHideMs: 4000,
    eyeVariant: "sleepy",
    mouthVariant: "smile",
  },
};

export function getBiyooReaction(state: BiyooState): BiyooStateMeta {
  return BIYOO_REACTION_MAP[state] ?? BIYOO_REACTION_MAP.sleeping;
}
