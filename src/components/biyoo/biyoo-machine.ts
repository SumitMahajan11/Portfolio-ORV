/**
 * Biyoo Pure State Machine
 *
 * Implements /docs/07-BIYOO-PERSONALITY-AND-SOUND.md and /docs/20 Section 3.
 * Pure deterministic state reducer decoupled from React rendering and DOM.
 */

import type {
  BiyooState,
  BiyooEvent,
  BiyooContext,
  BiyooTransitionResult,
} from "./biyoo-types";
import { BIYOO_REACTION_MAP } from "./reaction-map";

export { selfCheckBiyooMachine, type BiyooSelfCheckResult, type SelfCheckAssertion } from "./biyoo-self-check";

export function createInitialBiyooContext(localHour = 12): BiyooContext {
  const isNight = localHour >= 0 && localHour < 5;
  return {
    state: isNight ? "night" : "sleeping",
    speech: isNight ? BIYOO_REACTION_MAP.night.line : null,
    costume: null,
    constellationShowing: false,
    idleNudgeExecuted: false,
    nudgeActive: false,
    lastInteractionTime: 0,
  };
}

export function reduceBiyoo(
  context: BiyooContext,
  event: BiyooEvent
): { context: BiyooContext; result: BiyooTransitionResult | null } {
  switch (event.type) {
    case "CONSTELLATION_STATE":
      return { context: { ...context, constellationShowing: event.isShowing }, result: null };

    case "COSTUME_CHANGE":
      return { context: { ...context, costume: event.costume }, result: null };

    case "SPEECH_DISMISSED":
      return { context: { ...context, speech: null, nudgeActive: false }, result: null };

    case "FAST_SCROLL": {
      if (context.nudgeActive && event.speed > 20) {
        return {
          context: { ...context, state: "sleeping", speech: null, nudgeActive: false },
          result: {
            nextState: "sleeping",
            line: null,
            sound: "breath",
            preemptConstellation: false,
            speechDurationMs: 0,
          },
        };
      }
      return { context, result: null };
    }

    case "IDLE_TICK": {
      // Rule 5: No ambient state change while Constellation line is showing
      if (context.constellationShowing) return { context, result: null };

      // Rule 1: Sleep -> yawn-wake after 8s idle (executed once per session)
      if (event.idleSeconds >= 8 && !context.idleNudgeExecuted) {
        const meta = BIYOO_REACTION_MAP["yawn-wake"];
        return {
          context: {
            ...context,
            state: "yawn-wake",
            speech: meta.line,
            idleNudgeExecuted: true,
            nudgeActive: true,
          },
          result: {
            nextState: "yawn-wake",
            line: meta.line,
            sound: meta.sound,
            preemptConstellation: true,
            speechDurationMs: meta.autoHideMs,
          },
        };
      }

      // Rule 7: 60s inactive -> sleepy-again
      if (event.idleSeconds >= 60 && context.state !== "sleepy-again" && !context.nudgeActive) {
        const meta = BIYOO_REACTION_MAP["sleepy-again"];
        return {
          context: { ...context, state: "sleepy-again", speech: meta.line },
          result: {
            nextState: "sleepy-again",
            line: meta.line,
            sound: meta.sound,
            preemptConstellation: false,
            speechDurationMs: meta.autoHideMs,
          },
        };
      }
      return { context, result: null };
    }

    case "CARD_HOVER": {
      if (context.constellationShowing) return { context, result: null };
      if (context.state === "sleeping" || context.state === "sleepy-again") {
        const meta = BIYOO_REACTION_MAP.curious;
        return {
          context: { ...context, state: "curious", speech: meta.line },
          result: {
            nextState: "curious",
            line: meta.line,
            sound: meta.sound,
            preemptConstellation: false,
            speechDurationMs: meta.autoHideMs,
          },
        };
      }
      return { context, result: null };
    }

    case "POKE": {
      const nextState: BiyooState =
        context.state === "sleeping" || context.state === "sleepy-again" ? "happy" : "curious";
      const meta = BIYOO_REACTION_MAP[nextState];
      return {
        context: {
          ...context,
          state: nextState,
          speech: meta.line,
          nudgeActive: false,
          lastInteractionTime: Date.now(),
        },
        result: {
          nextState,
          line: meta.line,
          sound: meta.sound,
          preemptConstellation: true,
          speechDurationMs: meta.autoHideMs,
        },
      };
    }

    case "STAGE_CHANGE": {
      if (event.stage === 7 && context.state !== "startled") {
        const meta = BIYOO_REACTION_MAP.startled;
        return {
          context: { ...context, state: "startled", speech: meta.line, nudgeActive: false },
          result: {
            nextState: "startled",
            line: meta.line,
            sound: meta.sound,
            preemptConstellation: true,
            speechDurationMs: meta.autoHideMs,
          },
        };
      }
      return { context, result: null };
    }

    case "PROOF_OPENED": {
      const meta = BIYOO_REACTION_MAP.proud;
      return {
        context: { ...context, state: "proud", speech: meta.line, nudgeActive: false },
        result: {
          nextState: "proud",
          line: meta.line,
          sound: meta.sound,
          preemptConstellation: true,
          speechDurationMs: meta.autoHideMs,
        },
      };
    }

    case "SCENARIO_SELECTED": {
      const meta = BIYOO_REACTION_MAP.happy;
      return {
        context: { ...context, state: "happy", speech: meta.line, nudgeActive: false },
        result: {
          nextState: "happy",
          line: meta.line,
          sound: meta.sound,
          preemptConstellation: true,
          speechDurationMs: meta.autoHideMs,
        },
      };
    }

    case "SET_STATE": {
      const meta = BIYOO_REACTION_MAP[event.state];
      const customLine = event.line !== undefined ? event.line : meta.line;
      return {
        context: { ...context, state: event.state, speech: customLine },
        result: {
          nextState: event.state,
          line: customLine,
          sound: meta.sound,
          preemptConstellation: true,
          speechDurationMs: meta.autoHideMs,
        },
      };
    }

    default:
      return { context, result: null };
  }
}

export function biyooReducer(context: BiyooContext, event: BiyooEvent): BiyooContext {
  return reduceBiyoo(context, event).context;
}
