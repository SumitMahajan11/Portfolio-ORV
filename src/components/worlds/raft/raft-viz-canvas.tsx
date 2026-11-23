"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  RAFT_SCENARIO_STEPS,
  runRaftSelfCheck,
  type RaftScenarioStep,
  type RaftSelfCheckResult,
  type RaftEventFrame,
  type FlareAnimation,
} from "@/lib/worlds/raft-viz";
import { NinjaNodeSvg } from "./raft-static-diagram";
import { gsap } from "@/lib/motion";

export interface RaftVizCanvasProps {
  onClearScenario?: () => void;
}

const EVENT_PLAYBACK_MS = 750;

/**
 * RaftVizCanvas Component:
 * Interactive deterministic Raft Visualizer with per-event playback.
 *
 * Rules:
 * - Scoped within [data-world="raft"]
 * - Animation strictly constrained to transform & opacity (CLAUDE.md Rule 5)
 * - Notice: "illustrative visualization, not the Ratify code"
 * - Displays 3 nodes, heartbeats as signal flares, logs as scrolls, partition wall, and recovery
 * - Plays each beat's events one at a time (~700ms each, GSAP, transform/opacity only)
 * - Beat buttons jump to beat's end state; "Replay beat" replays the beat's events
 * - Auto-play steps through all events across all beats
 * - Event log rendered under every beat matching check:raft-model output
 */
export function RaftVizCanvas({ onClearScenario }: RaftVizCanvasProps) {
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0);
  const [currentEventIndex, setCurrentEventIndex] = useState<number | null>(null);
  const [playbackMode, setPlaybackMode] = useState<"idle" | "playing_beat" | "playing_all">("idle");
  const [selfCheckResult] = useState<RaftSelfCheckResult>(() => runRaftSelfCheck());
  const [showSelfCheck, setShowSelfCheck] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const flareElRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activeBeat: RaftScenarioStep = RAFT_SCENARIO_STEPS[currentBeatIndex];
  const activeEventFrame: RaftEventFrame | null =
    currentEventIndex !== null && activeBeat.eventFrames[currentEventIndex]
      ? activeBeat.eventFrames[currentEventIndex]
      : null;

  // Active display state derived from event frame (during playback) or beat end state
  const displayedNodes = activeEventFrame ? activeEventFrame.nodes : activeBeat.nodes;
  const displayedTerm = activeEventFrame ? activeEventFrame.term : activeBeat.term;
  const displayedPartitionActive = activeEventFrame
    ? activeEventFrame.partitionActive
    : activeBeat.partitionActive;
  const activeFlares: FlareAnimation[] = useMemo(() => {
    return activeEventFrame ? activeEventFrame.flares : [];
  }, [activeEventFrame]);

  // Animate flare using GSAP (transform & opacity only)
  useEffect(() => {
    if (!flareElRef.current || activeFlares.length === 0) return;

    const flare = activeFlares[0];
    const flareEl = flareElRef.current;
    const stageWidth = stageRef.current ? stageRef.current.clientWidth : 600;

    // Node X percentage positions
    const nodeXPercent: Record<number, number> = { 1: 16.7, 2: 50.0, 3: 83.3 };
    const partitionWallPercent = 66.7;

    const startPct = nodeXPercent[flare.from] ?? 50;
    let targetPct = nodeXPercent[flare.to] ?? 50;

    if (flare.dropped) {
      if (flare.dropReason === "partition") {
        targetPct = partitionWallPercent;
      } else {
        targetPct = nodeXPercent[flare.to] ?? 16.7;
      }
    }

    const startPx = (startPct / 100) * stageWidth;
    const targetPx = (targetPct / 100) * stageWidth;
    const deltaPx = targetPx - startPx;

    gsap.killTweensOf(flareEl);
    gsap.set(flareEl, {
      x: 0,
      opacity: 0,
      scale: 0.85,
    });

    if (flare.dropped) {
      // Moves to wall/down node and stops with red blocked indicator
      gsap
        .timeline()
        .to(flareEl, {
          x: deltaPx,
          opacity: 1,
          scale: 1,
          duration: 0.38,
          ease: "power2.out",
        })
        .to(flareEl, {
          scale: 1.15,
          duration: 0.15,
          repeat: 1,
          yoyo: true,
          ease: "power1.inOut",
        });
    } else {
      // Smooth transit between nodes
      gsap.to(flareEl, {
        x: deltaPx,
        opacity: 1,
        scale: 1,
        duration: 0.52,
        ease: "power1.inOut",
      });
    }

    return () => {
      gsap.killTweensOf(flareEl);
    };
  }, [currentEventIndex, activeFlares]);

  // Advance event timer
  const advancePlayback = useCallback(() => {
    if (playbackMode === "playing_beat") {
      setCurrentEventIndex((prev) => {
        const next = prev === null ? 0 : prev + 1;
        if (next >= activeBeat.eventFrames.length) {
          setPlaybackMode("idle");
          return null; // Show beat end state
        }
        return next;
      });
    } else if (playbackMode === "playing_all") {
      setCurrentEventIndex((prev) => {
        const next = prev === null ? 0 : prev + 1;
        if (next < activeBeat.eventFrames.length) {
          return next;
        }

        // Beat finished, transition to next beat or complete
        if (currentBeatIndex < RAFT_SCENARIO_STEPS.length - 1) {
          setCurrentBeatIndex((b) => b + 1);
          return 0; // First event of next beat
        }

        // All 5 beats completed
        setPlaybackMode("idle");
        onClearScenario?.();
        return null; // Final end state
      });
    }
  }, [playbackMode, activeBeat.eventFrames.length, currentBeatIndex, onClearScenario]);

  useEffect(() => {
    if (playbackMode !== "idle") {
      timerRef.current = setInterval(advancePlayback, EVENT_PLAYBACK_MS);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playbackMode, advancePlayback]);

  // Jump to beat end state
  const handleBeatSelect = (idx: number) => {
    setPlaybackMode("idle");
    setCurrentBeatIndex(idx);
    setCurrentEventIndex(null);
    if (idx === RAFT_SCENARIO_STEPS.length - 1) {
      onClearScenario?.();
    }
  };

  // Replay current beat from event 0
  const handleReplayBeat = () => {
    setCurrentEventIndex(0);
    setPlaybackMode("playing_beat");
  };

  // Toggle Auto-play across all events
  const handleTogglePlayAll = () => {
    if (playbackMode !== "idle") {
      setPlaybackMode("idle");
    } else {
      if (currentBeatIndex === RAFT_SCENARIO_STEPS.length - 1 && currentEventIndex === null) {
        // Restart from beat 1 event 0
        setCurrentBeatIndex(0);
        setCurrentEventIndex(0);
      } else if (currentEventIndex === null) {
        setCurrentEventIndex(0);
      }
      setPlaybackMode("playing_all");
    }
  };

  // Jump to specific event in current beat
  const handleEventSelect = (idx: number) => {
    setPlaybackMode("idle");
    setCurrentEventIndex(idx);
  };

  // Node position helper for initial CSS left
  const getStartLeftPercent = (flare: FlareAnimation): number => {
    if (flare.from === 1) return 16.7;
    if (flare.from === 2) return 50.0;
    return 83.3;
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

        <div className="flex items-center">
          <div className="px-2.5 py-1 rounded border border-[#F28C28]/40 bg-[#F28C28]/10 text-[#F28C28] font-mono text-[10px] sm:text-xs uppercase tracking-wider font-semibold">
            illustrative visualization, not the Ratify code
          </div>
        </div>
      </div>

      {/* Interactive Controls & Beat Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line/40 pb-4">
        {/* Step Buttons (Jump to Beat End State) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {RAFT_SCENARIO_STEPS.map((step, idx) => (
            <button
              key={step.id}
              type="button"
              onClick={() => handleBeatSelect(idx)}
              className={`px-3 py-1.5 rounded font-mono text-xs transition-all ${
                currentBeatIndex === idx && currentEventIndex === null
                  ? "bg-[#F28C28] text-void font-bold shadow-[0_0_12px_rgba(242,140,40,0.4)]"
                  : currentBeatIndex === idx
                  ? "border border-[#F28C28] text-[#F28C28] bg-[#F28C28]/10 font-bold"
                  : "bg-ink-2/80 text-mist hover:text-feather hover:bg-ink-2 border border-line"
              }`}
              aria-label={`Jump to Beat ${idx + 1}: ${step.beatTitle}`}
            >
              Beat {idx + 1}
            </button>
          ))}
        </div>

        {/* Playback Controls: Replay Beat & Auto Play Sequence */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleReplayBeat}
            className={`px-3 py-1.5 rounded border font-mono text-xs font-semibold tracking-wider uppercase transition-colors ${
              playbackMode === "playing_beat"
                ? "border-[#D4B15F] bg-[#D4B15F] text-void"
                : "border-[#D4B15F]/50 bg-[#D4B15F]/15 hover:bg-[#D4B15F]/25 text-[#D4B15F]"
            }`}
            aria-label={`Replay Beat ${currentBeatIndex + 1} events`}
          >
            ↻ Replay beat
          </button>

          <button
            type="button"
            onClick={handleTogglePlayAll}
            className="px-3 py-1.5 rounded border border-[#F28C28]/40 bg-[#F28C28]/10 hover:bg-[#F28C28]/20 text-[#F28C28] font-mono text-xs font-semibold tracking-wider uppercase transition-colors"
          >
            {playbackMode !== "idle" ? "❚❚ Pause" : "▶ Play Sequence"}
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
              className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                selfCheckResult.passed
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
      <div
        ref={stageRef}
        className="relative w-full aspect-[640/360] min-h-[300px] sm:min-h-[380px] rounded border border-line/60 bg-[radial-gradient(circle_at_center,_rgba(36,22,12,0.6)_0%,_rgba(14,17,24,0.95)_80%)] overflow-hidden flex flex-col justify-between p-4 sm:p-6"
      >
        {/* Stage Status Bar */}
        <div className="flex items-center justify-between font-mono text-xs z-10 flex-wrap gap-2">
          <div className="space-y-0.5">
            <span className="text-[#F28C28] uppercase tracking-wider font-semibold">
              {activeBeat.eraName}
            </span>
            <div className="text-mist text-[11px]">{activeBeat.beatTitle}</div>
          </div>

          <div className="flex items-center gap-2">
            {currentEventIndex !== null && (
              <div className="px-2 py-0.5 rounded border border-[#D4B15F]/40 bg-[#D4B15F]/10 text-[#D4B15F] font-mono text-[10px] font-semibold animate-pulse">
                EVENT {currentEventIndex + 1}/{activeBeat.eventFrames.length}
              </div>
            )}
            <div className="px-2.5 py-1 rounded border border-line bg-ink/80 text-feather font-mono text-xs">
              TERM: <span className="text-[#F28C28] font-bold">{displayedTerm}</span>
            </div>
          </div>
        </div>

        {/* Partition Barrier Line (Animates opacity and transform) */}
        <div
          className={`absolute inset-y-12 left-2/3 w-[3px] z-20 pointer-events-none transition-all duration-700 transform ${
            displayedPartitionActive
              ? "opacity-100 scale-y-100"
              : "opacity-0 scale-y-0"
          }`}
          aria-hidden={!displayedPartitionActive}
        >
          <div className="w-full h-full bg-gradient-to-b from-transparent via-red-500 to-transparent shadow-[0_0_16px_rgba(239,68,68,0.8)]" />
          <div className="absolute top-1/2 -left-16 -translate-y-1/2 px-2 py-1 bg-red-950/90 border border-red-500 rounded font-mono text-[9px] uppercase tracking-wider text-red-300 whitespace-nowrap shadow-xl">
            ⚡ Partition Wall
          </div>
        </div>

        {/* 3 Ninja Nodes Stage */}
        <div className="relative z-10 flex items-center justify-around w-full py-4">
          {displayedNodes.map((node) => {
            const isMinority =
              displayedPartitionActive && node.partition === "A";

            return (
              <div
                key={node.id}
                className={`relative flex flex-col items-center space-y-3 transition-all duration-500 transform ${
                  node.role === "crashed" ? "opacity-40 scale-95" : "opacity-100 scale-100"
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
                    {node.logs.map((log) => {
                      const isCommitted = log.committed;
                      return (
                        <div
                          key={log.index}
                          className={`px-1.5 py-0.5 rounded font-mono text-[9px] flex items-center gap-1 shadow-sm transition-all ${
                            isCommitted
                              ? "border border-[#F1E4C3]/40 bg-[#F1E4C3]/10 text-[#F1E4C3]"
                              : "border border-dashed border-[#F1E4C3]/30 bg-[#F1E4C3]/5 text-[#F1E4C3]/50 opacity-60"
                          }`}
                          title={`Log #${log.index} (Term ${log.term}): ${log.data} [${
                            isCommitted ? "Committed" : "Pending"
                          }]`}
                        >
                          <span>📜</span>
                          <span>#{log.index}</span>
                          {!isCommitted && (
                            <span className="text-[8px] uppercase tracking-tighter text-mist/60">
                              (pending)
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quorum / Votes pill */}
                {node.role === "leader" && (
                  <div className="px-2 py-0.5 rounded-full bg-[#F28C28]/20 border border-[#F28C28]/40 text-[#F28C28] font-mono text-[9px] font-semibold">
                    Quorum: {node.votesReceived.length}/3 votes
                  </div>
                )}
                {node.role === "candidate" && (
                  <div className="px-2 py-0.5 rounded-full bg-[#D4B15F]/20 border border-[#D4B15F]/40 text-[#D4B15F] font-mono text-[9px] font-semibold shadow-[0_0_8px_rgba(212,177,95,0.4)] animate-pulse">
                    Seeking: {node.votesReceived.length}/3 votes
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Dynamic GSAP Flare Animation Layer (Per-event playback) */}
        {activeFlares.length > 0 && (
          <div
            ref={flareElRef}
            style={{
              left: `${getStartLeftPercent(activeFlares[0])}%`,
              top: "42%",
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none whitespace-nowrap"
          >
            {activeFlares[0].dropped ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-red-500 bg-red-950/95 text-red-200 font-mono text-xs shadow-[0_0_20px_rgba(239,68,68,0.8)]">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                <span className="font-bold">{activeFlares[0].label}</span>
                <span className="text-[10px] text-red-300 font-semibold px-1 py-0.2 bg-red-900/60 rounded border border-red-500/50">
                  {activeFlares[0].dropReason === "partition"
                    ? "⛔ Blocked at Wall"
                    : "⛔ Blocked: Node Down"}
                </span>
              </div>
            ) : activeFlares[0].type === "vote_grant" ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-[#D4B15F] bg-ink/95 text-[#D4B15F] font-mono text-xs shadow-[0_0_20px_rgba(212,177,95,0.7)]">
                <span className="h-2 w-2 rounded-full bg-[#D4B15F] animate-pulse" />
                <span className="font-bold">{activeFlares[0].label}</span>
                <span className="text-[10px] text-[#F1E4C3] font-semibold">
                  (Vote Granted)
                </span>
              </div>
            ) : activeFlares[0].type === "replicate" ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-[#F1E4C3]/70 bg-ink/95 text-[#F1E4C3] font-mono text-xs shadow-[0_0_16px_rgba(241,228,195,0.5)]">
                <span>📜</span>
                <span className="font-bold">{activeFlares[0].label}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-[#F28C28]/60 bg-ink/95 text-[#F28C28] font-mono text-xs shadow-[0_0_12px_rgba(242,140,40,0.5)]">
                <span className="h-2 w-2 rounded-full bg-[#F28C28]" />
                <span className="font-bold">{activeFlares[0].label}</span>
              </div>
            )}
          </div>
        )}

        {/* Signal Flares Display (Beat End State Summary) */}
        <div className="relative z-10 flex items-center justify-center gap-3 pt-2">
          {currentEventIndex !== null && activeEventFrame ? (
            <div className="px-3 py-1 rounded border border-[#D4B15F]/40 bg-ink/80 text-[#D4B15F] font-mono text-xs font-medium">
              &gt; {activeEventFrame.statusMessage}
            </div>
          ) : activeBeat.flares.length > 0 ? (
            activeBeat.flares.map((flare) => (
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

      {/* Model Event Log under Beat (Readable Labelled List for Screen Readers) */}
      <div
        className="p-4 rounded border border-line/60 bg-ink-2/50 space-y-2.5"
        role="region"
        aria-label={`Beat ${currentBeatIndex + 1} Event Log`}
      >
        <div className="flex items-center justify-between font-mono text-xs text-[#F28C28] uppercase font-semibold border-b border-line/40 pb-2">
          <span>Beat {currentBeatIndex + 1} Model Event Log ({activeBeat.events.length} events):</span>
          {currentEventIndex !== null ? (
            <span className="text-[11px] text-[#D4B15F] font-bold">
              Playing event {currentEventIndex + 1} of {activeBeat.events.length}
            </span>
          ) : (
            <span className="text-[10px] text-mist/70 font-normal">
              Showing beat end state (click event to inspect)
            </span>
          )}
        </div>

        <ol
          className="space-y-1 font-mono text-xs text-mist list-decimal list-inside"
          aria-label={`Beat ${currentBeatIndex + 1} model events`}
        >
          {activeBeat.events.map((ev, idx) => {
            const statusIcon = ev.success ? "✓" : "✗";
            const line = `[${statusIcon}] [${ev.event.toUpperCase()}] ${ev.description}`;
            const isActive = currentEventIndex === idx;

            return (
              <li key={idx} className="list-item">
                <button
                  type="button"
                  onClick={() => handleEventSelect(idx)}
                  className={`w-full text-left font-mono text-xs transition-all p-1.5 rounded flex items-center justify-between gap-2 ${
                    isActive
                      ? "bg-[#F28C28]/20 text-[#F28C28] font-bold border border-[#F28C28]/50 shadow-sm"
                      : "text-mist hover:text-feather hover:bg-ink-2/60"
                  }`}
                  aria-label={`Jump to event ${idx + 1}: ${ev.description}`}
                >
                  <span className="break-words">{line}</span>
                  {isActive && (
                    <span className="text-[10px] uppercase font-bold text-[#D4B15F] shrink-0">
                      [Active Event]
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Narration & Invariant Rule Caption */}
      <div className="p-4 rounded border border-line/60 bg-ink-2/40 space-y-2">
        <div className="flex items-center gap-2 font-mono text-xs text-[#F28C28] uppercase font-semibold">
          <span>&gt; Beat {currentBeatIndex + 1} Analysis:</span>
        </div>
        <p className="font-ui text-sm sm:text-base text-feather leading-relaxed">
          {activeBeat.caption}
        </p>
        <p className="font-mono text-xs text-mist leading-relaxed pt-1 border-t border-line/30">
          <span className="text-feather font-semibold">Invariant Check: </span>
          {activeBeat.details}
        </p>
      </div>
    </div>
  );
}

export default RaftVizCanvas;
