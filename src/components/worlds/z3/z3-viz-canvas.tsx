"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, useSyncExternalStore } from "react";
import { useMode } from "@/lib/flags";
import { useScene, ScrollTrigger } from "@/lib/motion";
import { Z3_TEST_SUITE } from "@/lib/worlds/z3-viz";
import {
  CHAIN_NODES,
  CHAIN_EDGES,
  NODE_RADIUS,
  DESKTOP_POSITIONS,
  MOBILE_POSITIONS,
  computeDistances,
  computeParAndSolution,
  buildEdgeLayouts,
  SCRIPTED_CHAIN_STAGES,
  type GeneratedEdgeLayout,
} from "@/lib/worlds/iac-chain-model";

export interface Z3VizCanvasProps {
  onClearScenario?: () => void;
}

function subscribeMobileQuery(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia("(max-width: 640px)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getMobileSnapshot() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(max-width: 640px)").matches;
}

function getServerSnapshot() {
  return false;
}

export function Z3VizCanvas({ onClearScenario }: Z3VizCanvasProps) {
  const { reducedMotion } = useMode();

  // Mode & playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressVal, setProgressVal] = useState(0);

  // Core model state
  const [edgeState, setEdgeState] = useState<number[]>([1, 1, 1, 1, 1]);
  const [bound, setBound] = useState<number>(4);
  const [hint, setHint] = useState<number[] | null>(null);
  const [isFirstInteraction, setIsFirstInteraction] = useState(true);
  const [message, setMessage] = useState<string>(
    "Start here: cut any red chain. The 🔒 chain is needed for CI login, so it can't be cut."
  );
  const [shakingEdge, setShakingEdge] = useState<number | null>(null);

  // Responsive mobile media query listener via useSyncExternalStore
  const isMobile = useSyncExternalStore(subscribeMobileQuery, getMobileSnapshot, getServerSnapshot);

  // DOM & layout refs
  const containerRef = useRef<HTMLDivElement>(null);
  const isPlayingRef = useRef(false);
  const progressRef = useRef(0);
  const clearedTriggeredRef = useRef(false);
  const curScriptedStepRef = useRef(-1);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Biyoo costume hook: chain bracelet
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("biyoo:costume", {
          detail: { costume: "chain bracelet" },
        })
      );
    }
    return () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("biyoo:costume", {
            detail: { costume: null },
          })
        );
      }
    };
  }, []);

  // Compute par and optimal solution
  const { par, solution } = useMemo(() => computeParAndSolution(), []);

  // Precomputed edge layouts with deterministic scatter vectors
  const edgeLayouts: GeneratedEdgeLayout[] = useMemo(() => {
    return buildEdgeLayouts(isMobile);
  }, [isMobile]);

  // Graph reachability analysis
  const graphStatus = useMemo(() => {
    const df = computeDistances(edgeState, 0, false);
    const dr = computeDistances(edgeState, 4, true);

    const sat = 4 in df && df[4] <= bound;
    const full = 4 in df;
    const sealed = !full && bound === 4;
    const hops = df[4] ?? 0;

    // Shortest path reconstruction
    const routeNodes: string[] = [];
    if (sat) {
      for (let d = 0; d <= hops; d++) {
        const nodeIdx = CHAIN_NODES.findIndex(
          (_, n) => df[n] === d && dr[n] === hops - d
        );
        if (nodeIdx !== -1) {
          routeNodes.push(CHAIN_NODES[nodeIdx].name);
        }
      }
    }

    const cutsCount = edgeState.filter((x) => x !== 1).length;
    let starCount = 0;
    if (sealed) {
      starCount = cutsCount <= par ? 3 : cutsCount === par + 1 ? 2 : 1;
    }

    return {
      df,
      dr,
      sat,
      sealed,
      hops,
      routeNodes,
      cutsCount,
      starCount,
    };
  }, [bound, edgeState, par]);

  // Trigger Biyoo celebration when sealed
  useEffect(() => {
    if (graphStatus.sealed && !clearedTriggeredRef.current) {
      clearedTriggeredRef.current = true;
      onClearScenario?.();
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("biyoo:action", {
            detail: { state: "proud", line: "Trust chain sealed!" },
          })
        );
      }
    }
  }, [graphStatus.sealed, onClearScenario]);

  // Apply scripted progress (for scroll-driven scrub mode)
  const applyScriptedProgress = useCallback(
    (progress: number) => {
      const stages = SCRIPTED_CHAIN_STAGES;
      const idx = Math.min(
        stages.length - 1,
        Math.floor(progress * stages.length)
      );

      if (idx !== curScriptedStepRef.current) {
        curScriptedStepRef.current = idx;
        const stage = stages[idx];

        setEdgeState([...stage.edgeState]);
        setBound(stage.bound);
        setMessage(stage.message);
        setHint(null);
        setIsFirstInteraction(false);

        if (stage.shakingEdge !== undefined) {
          setShakingEdge(stage.shakingEdge);
          setTimeout(() => setShakingEdge(null), 500);
        } else {
          setShakingEdge(null);
        }
      }
    },
    []
  );

  // ScrollTrigger integration for scroll-driven scrub in normal mode
  useScene(
    () => {
      if (reducedMotion || !containerRef.current) return;

      const trigger = ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top 75%",
        end: "bottom 15%",
        scrub: 0.6,
        onUpdate: (self) => {
          if (!isPlayingRef.current) {
            progressRef.current = self.progress;
            setProgressVal(self.progress);
            applyScriptedProgress(self.progress);
          }
        },
      });

      return () => {
        trigger.kill();
      };
    },
    { scope: containerRef, dependencies: [reducedMotion, applyScriptedProgress] }
  );

  // Auto-play interval loop
  useEffect(() => {
    if (!isPlaying) {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
      return;
    }

    const stages = SCRIPTED_CHAIN_STAGES;
    let step = 0;

    const timer = setInterval(() => {
      step = (step + 1) % stages.length;
      const p = step / (stages.length - 1);
      progressRef.current = p;
      setProgressVal(p);
      applyScriptedProgress(p);
    }, 3000); // 3.0s per step: relaxed, comfortable observing pace

    autoPlayTimerRef.current = timer;

    return () => {
      clearInterval(timer);
      autoPlayTimerRef.current = null;
    };
  }, [isPlaying, applyScriptedProgress]);

  // Edge interaction toggle
  const handleToggleEdge = (i: number) => {
    setIsFirstInteraction(false);
    setHint(null);

    // If edge is locked (CI login rule)
    if (CHAIN_EDGES[i].locked) {
      setShakingEdge(i);
      setTimeout(() => setShakingEdge(null), 400);
      setMessage(
        "That rule lets CI log in. Cutting it would break the pipeline, so look for another link."
      );
      return;
    }

    setEdgeState((prev) => {
      const next = [...prev];
      next[i] = next[i] ? 0 : 1;
      return next;
    });

    setMessage("");
  };

  // Button actions
  const handleTogglePlay = () => {
    setIsPlaying((prev) => {
      const next = !prev;
      isPlayingRef.current = next;
      return next;
    });
  };

  const handleSetBound = (newBound: number) => {
    setBound(newBound);
    setMessage("");
  };

  const handleHint = () => {
    setHint(solution);
    setIsFirstInteraction(false);
    setMessage("The pulsating buttons mark one minimal fix.");
  };

  const handleReset = () => {
    setEdgeState([1, 1, 1, 1, 1]);
    setBound(4);
    setHint(null);
    setIsFirstInteraction(true);
    setShakingEdge(null);
    setMessage(
      "Start here: cut any red chain. The 🔒 chain is needed for CI login, so it can't be cut."
    );
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickP = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    progressRef.current = clickP;
    setProgressVal(clickP);
    applyScriptedProgress(clickP);
  };

  // Status headline text & styling
  const statusHeading = graphStatus.sat
    ? `STATUS: BREACHED · admin in ${graphStatus.hops} hops`
    : graphStatus.sealed
    ? "STATUS: SEALED"
    : "STATUS: UNPROVEN";

  const statusColorClass = graphStatus.sat
    ? "text-[#F43F5E]"
    : graphStatus.sealed
    ? "text-[#5EEAD4]"
    : "text-[#D9A850]";

  return (
    <div
      ref={containerRef}
      className="w-full max-w-4xl mx-auto rounded-xl border border-[#1B2A36] bg-[#0A1119] p-3 sm:p-5 shadow-2xl space-y-3.5 select-none"
      role="region"
      aria-label="Interactive IaC Verifier: Cut the chain SMT model"
    >
      <style>{`
        .iac-rg {
          transition: transform 0.85s cubic-bezier(0.5, 0, 1, 0.6), opacity 0.85s;
        }
        .iac-rg rect {
          fill: none;
          stroke: var(--st, #2A4150);
          stroke-width: 2.2;
          transition: stroke 0.3s;
        }
        .iac-edge {
          --st: #2A4150;
          cursor: pointer;
          outline: none;
        }
        .iac-edge.hot {
          --st: #F43F5E;
        }
        .iac-edge.cut .iac-rg {
          transform: translate(var(--dx), var(--dy)) rotate(var(--r));
          opacity: 0;
        }
        .iac-gh {
          stroke: #1B2A36;
          stroke-width: 2;
          stroke-dasharray: 3 7;
          opacity: 0;
          transition: opacity 0.4s;
        }
        .iac-edge.cut .iac-gh {
          opacity: 0.7;
        }
        .iac-pl {
          stroke: #F43F5E;
          stroke-width: 3.2;
          stroke-dasharray: 5 35;
          stroke-linecap: round;
          opacity: 0;
          filter: drop-shadow(0 0 6px #F43F5E);
        }
        .iac-edge.hot .iac-pl {
          opacity: 1;
          animation: iac-fl 1.1s linear infinite;
        }
        @keyframes iac-fl {
          to { stroke-dashoffset: -40; }
        }
        .iac-bt circle {
          fill: #0D1A24;
          stroke: #1B2A36;
          stroke-width: 1.8;
          transition: stroke 0.2s, transform 0.2s;
          transform-box: fill-box;
          transform-origin: center;
        }
        .iac-bt text {
          font-size: 11px;
          text-anchor: middle;
          dominant-baseline: central;
          fill: #E8F1F5;
          pointer-events: none;
        }
        .iac-edge:hover .iac-bt circle,
        .iac-edge:focus-visible .iac-bt circle {
          stroke: #D9A850;
          transform: scale(1.2);
        }
        .iac-edge.hint .iac-bt circle {
          stroke: #D9A850;
          animation: iac-pu 1s ease-in-out infinite;
        }
        .iac-edge.nudge .iac-bt circle {
          stroke: #D9A850;
          animation: iac-pu 1.6s ease-in-out infinite;
        }
        @keyframes iac-pu {
          50% { transform: scale(1.25); }
        }
        .iac-edge.shake {
          animation: iac-sh 0.35s ease-in-out;
        }
        @keyframes iac-sh {
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .iac-nc {
          fill: #0A1119;
          stroke: #1B2A36;
          stroke-width: 2.2;
          transition: stroke 0.4s, filter 0.4s;
        }
        .iac-n {
          transition: opacity 0.4s, filter 0.4s;
        }
        .iac-n.fog {
          opacity: 0.3;
          filter: blur(2px);
        }
        .iac-n.ext .iac-nc {
          stroke: #D9A850;
        }
        .iac-adm.breach .iac-nc {
          stroke: #F43F5E;
          filter: drop-shadow(0 0 12px #F43F5E);
        }
        .iac-adm.sealed .iac-nc {
          stroke: #5EEAD4;
          filter: drop-shadow(0 0 12px #5EEAD4);
        }
        @media (prefers-reduced-motion: reduce) {
          .iac-edge.hot .iac-pl,
          .iac-edge.hint .iac-bt circle,
          .iac-edge.nudge .iac-bt circle {
            animation: none;
          }
          .iac-rg {
            transition: none;
          }
        }
      `}</style>

      {/* Control bar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Play / Pause Toggle Button */}
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label={isPlaying ? "Pause automated chain walkthrough" : "Play automated chain walkthrough"}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono font-semibold transition-all cursor-pointer ${
              isPlaying
                ? "border-[#5EEAD4] bg-[#5EEAD4]/15 text-[#5EEAD4] shadow-[0_0_12px_rgba(94,234,212,0.25)]"
                : "border-[#1B2A36] bg-[#0D1A24] text-[#E8F1F5] hover:border-[#5EEAD4]/60"
            }`}
          >
            <span className="text-[10px]">{isPlaying ? "⏸" : "▶"}</span>
            <span>{isPlaying ? "Pause" : "Play auto"}</span>
          </button>

          {/* Bound hop selector */}
          <span
            className="inline-flex border border-[#1B2A36] rounded-full overflow-hidden bg-[#0D1A24]/60"
            role="group"
            aria-label="Hops the verifier checks"
          >
            {[2, 3, 4].map((h) => {
              const isSelected = bound === h;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleSetBound(h)}
                  aria-pressed={isSelected}
                  className={`px-3 py-1.5 text-xs font-mono font-semibold border-0 transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#5EEAD4] text-[#05080D] font-bold"
                      : "text-[#8AA0AD] hover:text-[#E8F1F5] hover:bg-[#0D1A24]"
                  }`}
                >
                  {h} hops
                </button>
              );
            })}
          </span>

          <button
            type="button"
            onClick={handleHint}
            className="px-3 py-1.5 rounded-full border border-[#1B2A36] bg-[#0D1A24] hover:border-[#D9A850] text-[#E8F1F5] text-xs font-mono font-semibold transition-colors cursor-pointer"
          >
            Hint
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-full border border-[#1B2A36] bg-[#0D1A24] hover:border-[#8AA0AD] text-[#8AA0AD] hover:text-[#E8F1F5] text-xs font-mono font-semibold transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-[#8AA0AD] border border-[#1B2A36] bg-[#0D1A24] px-2.5 py-1 rounded">
            Par: {par} cuts
          </span>
          <span className="font-mono text-[11px] text-[#8AA0AD] border border-[#1B2A36] bg-[#0D1A24] px-2.5 py-1 rounded">
            {isPlaying ? "Auto playback" : "Scroll-driven"}
          </span>
        </div>
      </div>

      {/* Progress & Scrub Bar */}
      <div
        role="progressbar"
        aria-valuenow={Math.round(progressVal * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="IaC reachability walkthrough progress"
        onClick={handleProgressBarClick}
        title="Click to jump progress"
        className="w-full h-1 bg-[#1B2A36] relative overflow-hidden cursor-pointer rounded-full"
      >
        <div
          className="h-full bg-gradient-to-r from-[#F43F5E] via-[#D9A850] to-[#5EEAD4] transition-all duration-75"
          style={{ width: `${(progressVal * 100).toFixed(1)}%` }}
        />
      </div>

      {/* Scenario Objectives Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-[#8AA0AD]">
        <div className="border border-[#1B2A36] bg-[#0D1A24]/60 rounded-lg p-2">
          <b className="block text-[#E8F1F5] font-semibold text-[11px]">Objective</b>
          <span>Seal admin_role</span>
        </div>
        <div className="border border-[#1B2A36] bg-[#0D1A24]/60 rounded-lg p-2">
          <b className="block text-[#E8F1F5] font-semibold text-[11px]">Rule</b>
          <span>CI login must stay</span>
        </div>
        <div className="border border-[#1B2A36] bg-[#0D1A24]/60 rounded-lg p-2">
          <b className="block text-[#E8F1F5] font-semibold text-[11px]">Par</b>
          <span>{par} cuts</span>
        </div>
        <div className="border border-[#1B2A36] bg-[#0D1A24]/60 rounded-lg p-2">
          <b className="block text-[#E8F1F5] font-semibold text-[11px]">How</b>
          <span>Click chain to cut</span>
        </div>
      </div>

      {/* Verdict & Cuts Top Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
        <span className={`font-mono text-sm sm:text-base font-bold ${statusColorClass}`}>
          {statusHeading}
        </span>
        <span className="font-mono text-xs text-[#8AA0AD]">
          Cuts: <b className="text-[#E8F1F5]">{graphStatus.cutsCount}</b>{" "}
          {graphStatus.sealed && (
            <b className="text-[#D9A850] ml-1">
              {"★".repeat(graphStatus.starCount)}
              {"☆".repeat(3 - graphStatus.starCount)}
            </b>
          )}
        </span>
      </div>

      {/* Stage Canvas: Compact, Proportional & Dark Architect Palette */}
      <div
        className={`relative w-full rounded-xl overflow-hidden border transition-all duration-500 bg-[#05080D] ${
          graphStatus.sat
            ? "border-[#F43F5E]/60 shadow-[0_0_24px_rgba(244,63,94,0.12)]"
            : graphStatus.sealed
            ? "border-[#5EEAD4]/60 shadow-[0_0_24px_rgba(94,234,212,0.12)]"
            : "border-[#1B2A36]"
        }`}
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 50%, rgba(13, 26, 36, 0.6), #05080D 80%), linear-gradient(rgba(27, 42, 54, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(27, 42, 54, 0.4) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 32px 32px, 32px 32px",
        }}
      >
        <svg
          viewBox={isMobile ? "0 0 360 440" : "0 0 700 270"}
          className="w-full h-auto max-h-[290px] block select-none mx-auto"
          role="group"
          aria-label="Chains of trust from outside_acct to admin_role"
        >
          {/* Edges */}
          {edgeLayouts.map((layout) => {
            const i = layout.index;
            const edge = CHAIN_EDGES[i];
            const isCut = !edgeState[i];
            const isHot =
              Boolean(edgeState[i]) &&
              edge.u in graphStatus.df &&
              edge.v in graphStatus.dr &&
              graphStatus.df[edge.u] + 1 + graphStatus.dr[edge.v] <= bound;

            const isHintEdge = Boolean(hint && hint.includes(i) && edgeState[i]);
            const isNudge = isFirstInteraction && !edge.locked && !hint;
            const isShaking = shakingEdge === i;

            return (
              <g
                key={`edge-${i}`}
                data-i={i}
                role="button"
                tabIndex={0}
                onClick={() => handleToggleEdge(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleToggleEdge(i);
                  }
                }}
                className={`iac-edge ${isCut ? "cut" : ""} ${isHot ? "hot" : ""} ${
                  isHintEdge ? "hint" : ""
                } ${isNudge ? "nudge" : ""} ${isShaking ? "shake" : ""}`}
                aria-label={
                  isCut
                    ? `Restore ${CHAIN_NODES[edge.v].name} accepts ${CHAIN_NODES[edge.u].name}`
                    : edge.locked
                    ? `Locked rule needed for CI: ${CHAIN_NODES[edge.v].name} accepts ${CHAIN_NODES[edge.u].name}`
                    : `Cut chain: ${CHAIN_NODES[edge.v].name} accepts ${CHAIN_NODES[edge.u].name}`
                }
              >
                {/* Ghost line (visible when severed) */}
                <line
                  className="iac-gh"
                  x1={layout.lineX1}
                  y1={layout.lineY1}
                  x2={layout.lineX2}
                  y2={layout.lineY2}
                />

                {/* Chain links */}
                {layout.links.map((link, j) => (
                  <g
                    key={`link-${i}-${j}`}
                    transform={`translate(${link.x} ${link.y}) rotate(${layout.angle})`}
                  >
                    <g
                      className="iac-rg"
                      style={
                        {
                          "--dx": `${link.dx}px`,
                          "--dy": `${link.dy}px`,
                          "--r": `${link.r}deg`,
                          transitionDelay: `${link.delay}s`,
                        } as React.CSSProperties
                      }
                    >
                      <rect
                        x={-link.width / 2}
                        y={-link.height / 2}
                        width={link.width}
                        height={link.height}
                        rx={link.height / 2}
                      />
                    </g>
                  </g>
                ))}

                {/* Hot pulse active beam */}
                <line
                  className="iac-pl"
                  x1={layout.lineX1}
                  y1={layout.lineY1}
                  x2={layout.lineX2}
                  y2={layout.lineY2}
                />

                {/* Transparent fat hit target for comfortable touch / clicking */}
                <line
                  stroke="transparent"
                  strokeWidth="36"
                  x1={layout.a[0]}
                  y1={layout.a[1]}
                  x2={layout.b[0]}
                  y2={layout.b[1]}
                />

                {/* Cut / Restore button badge */}
                <g className="iac-bt">
                  <circle cx={layout.mx} cy={layout.my} r={12} />
                  <text x={layout.mx} y={layout.my + 1}>
                    {isCut ? "↺" : edge.locked ? "🔒" : "✂"}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Nodes */}
          {CHAIN_NODES.map((node, i) => {
            const p = isMobile ? MOBILE_POSITIONS[i] : DESKTOP_POSITIONS[i];
            const isFog = i in graphStatus.df && graphStatus.df[i] > bound;
            const isExt = i === 0;
            const isAdm = i === 4;

            return (
              <g
                key={`node-${i}`}
                className={`iac-n ${isExt ? "ext" : ""} ${isAdm ? "iac-adm" : ""} ${
                  isFog ? "fog" : ""
                } ${isAdm && graphStatus.sat ? "breach" : ""} ${
                  isAdm && graphStatus.sealed ? "sealed" : ""
                }`}
              >
                <circle className="iac-nc" cx={p[0]} cy={p[1]} r={NODE_RADIUS} />
                <text
                  x={p[0]}
                  y={p[1] + 1}
                  className="text-base select-none pointer-events-none"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {i === 4
                    ? graphStatus.sat
                      ? "🔓"
                      : "🔒"
                    : node.icon}
                </text>
                <text
                  x={p[0]}
                  y={p[1] + NODE_RADIUS + 15}
                  className="fill-[#E8F1F5] font-mono text-[11px] font-semibold"
                  textAnchor="middle"
                >
                  {node.name}
                </text>
                <text
                  x={p[0]}
                  y={p[1] + NODE_RADIUS + 27}
                  className="fill-[#8AA0AD] font-sans text-[9px] font-medium"
                  textAnchor="middle"
                >
                  {node.role}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Dynamic guidance message */}
      <p
        className="min-h-[2.2em] text-xs sm:text-sm font-sans text-[#E8F1F5] leading-relaxed px-1"
        aria-live="polite"
      >
        {message ||
          (graphStatus.sealed
            ? graphStatus.cutsCount <= par
              ? "Sealed with the smallest possible fix. The linter was green the whole time."
              : `Sealed, but the solver finds a fix with ${par} cuts. Reset and try fewer.`
            : !graphStatus.sat
            ? `Cuts made, but the verifier only looked ${bound} hops deep. Set it to 4 hops to prove it.`
            : "Click any red chain to cut it. You can toggle cuts back at any time.")}
      </p>

      {/* Comparison: Linter vs Verifier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0.5">
        {/* Linter Card (Blind spot demonstration) */}
        <div className="p-3.5 rounded-xl border border-[#1B2A36] bg-[#0A1119] space-y-1">
          <h4 className="font-mono text-xs uppercase tracking-wider text-[#8AA0AD]">
            Linter · checks each role alone
          </h4>
          <b className="block text-base font-bold text-[#5EEAD4]">0 findings</b>
          <p className="font-sans text-xs text-[#8AA0AD] leading-relaxed">
            jump_role, build_role, ops_role and admin_role each pass individually.
          </p>
        </div>

        {/* Verifier Card (Transitive reachability) */}
        <div
          className={`p-3.5 rounded-xl border space-y-1 transition-colors ${
            graphStatus.sat
              ? "border-[#F43F5E]/40 bg-[#F43F5E]/10"
              : graphStatus.sealed
              ? "border-[#5EEAD4]/40 bg-[#5EEAD4]/10"
              : "border-[#1B2A36] bg-[#0A1119]"
          }`}
        >
          <h4 className="font-mono text-xs uppercase tracking-wider text-[#8AA0AD]">
            Verifier · follows the chain
          </h4>
          <b
            className={`block text-base font-bold ${
              graphStatus.sat
                ? "text-[#F43F5E]"
                : graphStatus.sealed
                ? "text-[#5EEAD4]"
                : "text-[#D9A850]"
            }`}
          >
            {graphStatus.sat
              ? "SAT: escalation found"
              : graphStatus.sealed
              ? "UNSAT: no path to admin"
              : "UNSAT_BOUNDED"}
          </b>
          <p className="font-sans text-xs text-[#8AA0AD] leading-relaxed">
            {graphStatus.sat
              ? graphStatus.routeNodes.join(" → ")
              : graphStatus.sealed
              ? "Checked up to 4 hops, so every chain is covered."
              : `No chain within ${bound} hops, but longer chains weren't checked. This is not a proof.`}
          </p>
        </div>
      </div>

      {/* Model explanation note & Real Tool provenance */}
      <div className="space-y-1 pt-2 border-t border-[#1B2A36] font-sans text-xs text-[#8AA0AD]">
        <p>
          This is a model, not the tool. The real verifier encodes each hop as symbolic variables and asks Z3; here a graph search stands in so it runs in your browser. Recorded runs of the real tool are in the{" "}
          <a
            href="https://github.com/SumitMahajan11/iac-verifier"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#5EEAD4] underline hover:text-[#E8F1F5] transition-colors"
          >
            GitHub repository &rarr;
          </a>
        </p>
        <div className="text-[#8AA0AD] font-mono text-[11px] pt-0.5">
          {Z3_TEST_SUITE.line}
        </div>
      </div>
    </div>
  );
}

export default Z3VizCanvas;
