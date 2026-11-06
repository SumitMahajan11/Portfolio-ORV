/**
 * Biyoo Deterministic Self-Check Suite
 *
 * Implements /docs/07-BIYOO-PERSONALITY-AND-SOUND.md and /docs/20 Section 3.
 * Same style as the Raft self-check (asserts all 5 required invariants).
 */

import type { BiyooState } from "./biyoo-types";
import { createInitialBiyooContext, reduceBiyoo } from "./biyoo-machine";

export interface SelfCheckAssertion {
  id: string;
  rule: string;
  passed: boolean;
  details: string;
}

export interface BiyooSelfCheckResult {
  passed: boolean;
  assertions: SelfCheckAssertion[];
  error?: string;
}

export function selfCheckBiyooMachine(): BiyooSelfCheckResult {
  const assertions: SelfCheckAssertion[] = [];

  try {
    // 1. Sleep after 8s idle -> yawn-wake with "Scroll, reader."
    const ctx0 = createInitialBiyooContext(14);
    const r1 = reduceBiyoo(ctx0, { type: "IDLE_TICK", idleSeconds: 8 });
    const passed1 =
      r1.context.state === "yawn-wake" &&
      r1.result?.line === "Scroll, reader." &&
      r1.result?.sound === "yawn" &&
      r1.context.idleNudgeExecuted === true;
    assertions.push({
      id: "idle-8s-wake",
      rule: "Sleep transitions to yawn-wake after 8s idle with 'Scroll, reader.'",
      passed: passed1,
      details: `State: ${r1.context.state}, Line: "${r1.result?.line}", Sound: ${r1.result?.sound}`,
    });

    // 2. Wake on poke: sleeping -> happy, awake -> curious
    const ctxSleeping = createInitialBiyooContext(14);
    const rPokeSleep = reduceBiyoo(ctxSleeping, { type: "POKE" });
    const rPokeAwake = reduceBiyoo(rPokeSleep.context, { type: "POKE" });
    const passed2 =
      rPokeSleep.context.state === "happy" &&
      rPokeSleep.result?.line === "Good choice." &&
      rPokeAwake.context.state === "curious" &&
      rPokeAwake.result?.line === "Ooh?";
    assertions.push({
      id: "wake-on-poke",
      rule: "Poke wakes sleeping Biyoo to happy, and curious when poked while awake",
      passed: passed2,
      details: `Sleeping: ${rPokeSleep.context.state} ("${rPokeSleep.result?.line}"), Awake: ${rPokeAwake.context.state} ("${rPokeAwake.result?.line}")`,
    });

    // 3. Startled on stage 7 with "!!"
    const ctxStage = createInitialBiyooContext(14);
    const rStage7 = reduceBiyoo(ctxStage, { type: "STAGE_CHANGE", stage: 7 });
    const passed3 =
      rStage7.context.state === "startled" &&
      rStage7.result?.line === "!!" &&
      rStage7.result?.sound === "squeak" &&
      rStage7.result?.preemptConstellation === true;
    assertions.push({
      id: "startled-stage-7",
      rule: "Stage 7 glitch triggers startled state with '!!' and squeak sound",
      passed: passed3,
      details: `State: ${rStage7.context.state}, Line: "${rStage7.result?.line}", Sound: ${rStage7.result?.sound}`,
    });

    // 4. Proud on proof link with "Evidence found."
    const ctxProof = createInitialBiyooContext(14);
    const rProof = reduceBiyoo(ctxProof, { type: "PROOF_OPENED" });
    const passed4 =
      rProof.context.state === "proud" &&
      rProof.result?.line === "Evidence found." &&
      rProof.result?.sound === "chirp" &&
      rProof.result?.preemptConstellation === true;
    assertions.push({
      id: "proud-on-proof",
      rule: "Opening proof link triggers proud state with 'Evidence found.'",
      passed: passed4,
      details: `State: ${rProof.context.state}, Line: "${rProof.result?.line}", Sound: ${rProof.result?.sound}`,
    });

    // 5. No state change while Constellation line is showing unless spec says so
    const ctxConstellation = { ...createInitialBiyooContext(14), constellationShowing: true };
    const rBlockedIdle = reduceBiyoo(ctxConstellation, { type: "IDLE_TICK", idleSeconds: 10 });
    const rBlockedHover = reduceBiyoo(ctxConstellation, { type: "CARD_HOVER", targetId: "card-1" });
    const rPreemptPoke = reduceBiyoo(ctxConstellation, { type: "POKE" });
    const passed5 =
      rBlockedIdle.result === null &&
      rBlockedIdle.context.state === "sleeping" &&
      rBlockedHover.result === null &&
      rBlockedHover.context.state === "sleeping" &&
      rPreemptPoke.result?.preemptConstellation === true &&
      rPreemptPoke.context.state === "happy";
    assertions.push({
      id: "constellation-lock-and-preemption",
      rule: "No ambient state change while Constellation line is showing; interactive poke preempts",
      passed: passed5,
      details: `Idle blocked: ${rBlockedIdle.result === null}, Hover blocked: ${rBlockedHover.result === null}, Poke preempts: ${rPreemptPoke.result?.preemptConstellation}`,
    });

    // 6. Sleepy-again after 60s idle
    const ctxActive = { ...createInitialBiyooContext(14), state: "curious" as BiyooState, idleNudgeExecuted: true };
    const r60s = reduceBiyoo(ctxActive, { type: "IDLE_TICK", idleSeconds: 60 });
    const passed6 = r60s.context.state === "sleepy-again" && r60s.result?.line === "...zzz";
    assertions.push({
      id: "sleepy-again-60s",
      rule: "60s idle inactivity transitions to sleepy-again with '...zzz'",
      passed: passed6,
      details: `State: ${r60s.context.state}, Line: "${r60s.result?.line}"`,
    });

    // 7. Fast scroll during idle nudge cancels nudge
    const ctxNudge = {
      ...createInitialBiyooContext(14),
      state: "yawn-wake" as BiyooState,
      speech: "Scroll, reader.",
      nudgeActive: true,
      idleNudgeExecuted: true,
    };
    const rFastScroll = reduceBiyoo(ctxNudge, { type: "FAST_SCROLL", speed: 45 });
    const passed7 =
      rFastScroll.context.state === "sleeping" &&
      rFastScroll.context.speech === null &&
      rFastScroll.context.nudgeActive === false;
    assertions.push({
      id: "fast-scroll-cancel-nudge",
      rule: "Fast scroll cancels active idle nudge immediately",
      passed: passed7,
      details: `State: ${rFastScroll.context.state}, Speech: ${rFastScroll.context.speech}, NudgeActive: ${rFastScroll.context.nudgeActive}`,
    });

    // 8. Night hours (00:00 - 04:59)
    const ctxNight = createInitialBiyooContext(3);
    const passed8 = ctxNight.state === "night" && ctxNight.speech === "Why are you awake, reader?";
    assertions.push({
      id: "night-arrival-hours",
      rule: "Visitor arriving between 00:00 and 04:59 begins in night state",
      passed: passed8,
      details: `Initial state at 03:00: ${ctxNight.state}, Speech: "${ctxNight.speech}"`,
    });

    const allPassed = assertions.every((a) => a.passed);
    return { passed: allPassed, assertions };
  } catch (err) {
    return {
      passed: false,
      assertions,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
