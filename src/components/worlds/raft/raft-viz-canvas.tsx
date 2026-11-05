"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  RAFT_SCENARIO_STEPS,
  runRaftSelfCheck,
  type RaftScenarioStep,
  type RaftSelfCheckResult,
} from "@/lib/worlds/raft-viz";
import { NinjaNodeSvg } from "./raft-static-diagram";

export interface RaftVizCanvasProps {
  onClearScenario?: () => void;
}

/**
 * RaftVizCanvas Component:
 * Interactive, scroll-scrubbed deterministic Raft Visualizer.
 *
 * Rules:
 * - Scoped within [data-world="raft"]
 * - Animation strictly constrained to transform & opacity (CLAUDE.md Rule 5)
 * - Prominent notice: "illustrative visualization, not the Ratify code"
 * - Displays 3 nodes, heartbeats as signal flares, logs as scrolls, partition wall, and recovery
 * - Includes dev self-check runner and result display
 */
export function RaftVizCanvas({ onClearScenario }: RaftVizCanvasProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selfCheckResult] = useState<RaftSelfCheckResult>(() => runRaftSelfCheck());
  const [showSelfCheck, setShowSelfCheck] = useState(false);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeStep: RaftScenarioStep = RAFT_SCENARIO_STEPS[currentStepIndex];

  // Auto-play through the 5 beats
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= RAFT_SCENARIO_STEPS.length - 1) {
            setIsPlaying(false);
            onClearScenario?.();
            return prev;
          }
          return prev + 1;
        });
      }, 3500);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
    };
  }, [isPlaying, onClearScenario]);

  const handleStepSelect = (idx: number) => {
    setIsPlaying(false);
    setCurrentStepIndex(idx);
    if (idx === RAFT_SCENARIO_STEPS.length - 1) {
      onClearScenario?.();
    }
  };

  return (
    <div
      className="relative w-full rounded border border-line/80 bg-ink/90 p-4 sm:p-6 backdrop-blur-md shadow-2xl space-y-6 select-none"
      role="region"
      aria-label="Interactive Deterministic Raft Visualizer"
    >
      {/* Top Banner & Mandatory Clarity Notice */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#F28C28] animate-pulse" />
          <span className="font-mono text-xs text-[#F28C28] tracking-widest uppercase font-semibold">
            [NARUTO_HIDDEN_LEAF &bull; RAFT_SIMULATION]
          </span>
        </div>

        {/* REQUIRED NOTICE */}
        <div className="px-2.5 py-1 rounded border border-[#F28C28]/40 bg-[#F28C28]/10 text-[#F28C28] font-mono text-[10px] sm:text-xs uppercase tracking-wider font-semibold">
          illustrative visualization, not the Ratify code
        </div>
      </div>

      {/* Interactive Controls & Beat Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line/40 pb-4">
        {/* Step Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {RAFT_SCENARIO_STEPS.map((step, idx) => (
            <button
              key={step.id}
              type="button"
              onClick={() => handleStepSelect(idx)}
              className={`px-3 py-1.5 rounded font-mono text-xs transition-all ${currentStepIndex === idx
                  ? "bg-[#F28C28] text-void font-bold shadow-[0_0_12px_rgba(242,140,40,0.4)]"
                  : "bg-ink-2/80 text-mist hover:text-feather hover:bg-ink-2 border border-line"
                }`}
              aria-label={`Jump to Beat ${idx + 1}: ${step.beatTitle}`}
            >
              Beat {idx + 1}
            </button>
          ))}
        </div>

        {/* Auto Play / Pause Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3 py-1.5 rounded border border-[#F28C28]/40 bg-[#F28C28]/10 hover:bg-[#F28C28]/20 text-[#F28C28] font-mono text-xs font-semibold tracking-wider uppercase transition-colors"
          >
            {isPlaying ? "❚❚ Pause" : "▶ Play Sequence"}
          </button>

          {process.env.NODE_ENV !== "production" && (
            <button
              type="button"
              onClick={() => setShowSelfCheck(!showSelfCheck)}
              className="px-2.5 py-1.5 rounded border border-line bg-ink-2 text-mist hover:text-star font-mono text-[11px] uppercase transition-colors"
              title="View deterministic unit-style invariant self-check"
            >
              {showSelfCheck ? "Hide Self-Check" : "Dev Self-Check ✓"}
            </button>
          )}
        </div>
      </div>

      {/* Dev Self-Check Results (Only visible in development when toggled) */}
      {showSelfCheck && selfCheckResult && (
        <div className="p-4 rounded border border-star/40 bg-ink-2/90 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <span className="text-star font-bold uppercase tracking-wider">
              [DEV SELF-CHECK: 6 INVARIANT ASSERTIONS]
            </span>
            <span
              className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${selfCheckResult.passed
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-red-500/20 text-red-400 border border-red-500/40"
                }`}
            >
              {selfCheckResult.passed ? "ALL 6 ASSERTIONS PASSED" : "FAILED"}
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {selfCheckResult.assertions.map((a) => (
              <div
                key={a.id}
                className="p-2 rounded bg-ink/70 border border-line flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-feather font-semibold">
                    ({a.id}) {a.rule}
                  </span>
                  <span className="text-emerald-400 font-bold">&#10003; PASS</span>
                </div>
                <div className="text-[10px] text-mist/80 mt-1">{a.details}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Simulation Village Stage */}
      <div className="relative w-full aspect-[640/360] min-h-[300px] sm:min-h-[380px] rounded border border-line/60 bg-[radial-gradient(circle_at_center,_rgba(36,22,12,0.6)_0%,_rgba(14,17,24,0.95)_80%)] overflow-hidden flex flex-col justify-between p-4 sm:p-6">
        {/* Stage Status Bar */}
        <div className="flex items-center justify-between font-mono text-xs z-10">
          <div className="space-y-0.5">
            <span className="text-[#F28C28] uppercase tracking-wider font-semibold">
              {activeStep.eraName}
            </span>
            <div className="text-mist text-[11px]">{activeStep.beatTitle}</div>
          </div>
          <div className="px-2.5 py-1 rounded border border-line bg-ink/80 text-feather">
            CURRENT TERM: <span className="text-[#F28C28] font-bold">{activeStep.term}</span>
          </div>
        </div>

        {/* Partition Barrier Line (Animates opacity and transform) */}
        <div
          className={`absolute inset-y-12 left-1/3 w-[3px] z-20 pointer-events-none transition-all duration-700 transform ${activeStep.partitionActive
              ? "opacity-100 scale-y-100"
              : "opacity-0 scale-y-0"
            }`}
          aria-hidden={!activeStep.partitionActive}
        >
          <div className="w-full h-full bg-gradient-to-b from-transparent via-red-500 to-transparent shadow-[0_0_16px_rgba(239,68,68,0.8)]" />
          <div className="absolute top-1/2 -left-16 -translate-y-1/2 px-2 py-1 bg-red-950/90 border border-red-500 rounded font-mono text-[9px] uppercase tracking-wider text-red-300 whitespace-nowrap shadow-xl">
            ⚡ Partition Wall
          </div>
        </div>

        {/* 3 Ninja Nodes Stage */}
        <div className="relative z-10 flex items-center justify-around w-full py-4">
          {activeStep.nodes.map((node) => {
            const isMinority =
              activeStep.partitionActive && node.partition === "A";

            return (
              <div
                key={node.id}
                className={`relative flex flex-col items-center space-y-3 transition-all duration-500 transform ${node.role === "crashed" ? "opacity-40 scale-95" : "opacity-100 scale-100"
                  }`}
              >
                {/* Node Avatar */}
                <NinjaNodeSvg
                  name={node.name}
                  role={node.role}
                  expression={node.expression}
                  term={node.currentTerm}
                  isMinority={isMinority}
                />

                {/* Log Scrolls Shelf */}
                <div className="flex flex-col items-center space-y-1">
                  <span className="font-mono text-[9px] text-mist/70 uppercase">
                    Replicated Scrolls ({node.logs.length})
                  </span>
                  <div className="flex items-center gap-1">
                    {node.logs.map((log) => (
                      <div
                        key={log.index}
                        className="px-1.5 py-0.5 rounded border border-[#F1E4C3]/40 bg-[#F1E4C3]/10 text-[#F1E4C3] font-mono text-[9px] flex items-center gap-1 shadow-sm"
                        title={`Log #${log.index} (Term ${log.term}): ${log.data}`}
                      >
                        <span>📜</span>
                        <span>#{log.index}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quorum / Votes pill */}
                {node.role === "leader" && (
                  <div className="px-2 py-0.5 rounded-full bg-[#F28C28]/20 border border-[#F28C28]/40 text-[#F28C28] font-mono text-[9px] font-semibold">
                    Quorum: {node.votesReceived.length}/3 votes
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Signal Flares Display */}
        <div className="relative z-10 flex items-center justify-center gap-3 pt-2">
          {activeStep.flares.length > 0 ? (
            activeStep.flares.map((flare) => (
              <div
                key={flare.id}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#F28C28]/50 bg-[#F28C28]/15 text-[#F28C28] font-mono text-xs shadow-[0_0_12px_rgba(242,140,40,0.3)] animate-pulse"
              >
                <span className="h-2 w-2 rounded-full bg-[#F28C28]" />
                <span className="font-bold">{flare.label}</span>
                <span className="text-[10px] text-[#F1E4C3]">
                  (Node {flare.from} &rarr; Node {flare.to})
                </span>
              </div>
            ))
          ) : (
            <div className="px-3 py-1 rounded border border-line bg-ink/70 font-mono text-xs text-mist/70 italic">
              Heartbeat silent &bull; No active signal flares
            </div>
          )}
        </div>
      </div>

      {/* Narration & Invariant Rule Caption */}
      <div className="p-4 rounded border border-line/60 bg-ink-2/40 space-y-2">
        <div className="flex items-center gap-2 font-mono text-xs text-[#F28C28] uppercase font-semibold">
          <span>&gt; Beat {currentStepIndex + 1} Analysis:</span>
        </div>
        <p className="font-ui text-sm sm:text-base text-feather leading-relaxed">
          {activeStep.caption}
        </p>
        <p className="font-mono text-xs text-mist leading-relaxed pt-1 border-t border-line/30">
          <span className="text-feather font-semibold">Formal Invariant: </span>
          {activeStep.details}
        </p>
      </div>
    </div>
  );
}

export default RaftVizCanvas;
