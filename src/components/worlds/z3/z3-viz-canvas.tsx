"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Z3_GRAPH_NODES,
  Z3_GRAPH_EDGES,
  Z3_VOW_RULES,
  Z3_SCENARIO_STEPS,
  type Z3ScenarioStep,
} from "@/lib/worlds/z3-viz";

export interface Z3VizCanvasProps {
  onClearScenario?: () => void;
}

/**
 * Z3VizCanvas Component:
 * Interactive Nen Vows & SMT Reachability Visualizer.
 *
 * Rules:
 * - Scoped within [data-world="z3"]
 * - Animation strictly constrained to transform & opacity (CLAUDE.md Rule 5)
 * - Prominently labeled: "illustrative example, not real Z3 execution"
 * - Does not execute Z3 in browser (deterministic visualization)
 * - Displays: Vow Table, <= 14 node IAM/network graph, animated escalation chain,
 *   "UNSATISFIABLE" collapse moment, and proof certificate stamp.
 */
export function Z3VizCanvas({ onClearScenario }: Z3VizCanvasProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<"graph" | "vows">("graph");
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeStep: Z3ScenarioStep = Z3_SCENARIO_STEPS[currentStepIndex];

  // Auto-play through the 4 beats
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= Z3_SCENARIO_STEPS.length - 1) {
            setIsPlaying(false);
            onClearScenario?.();
            return prev;
          }
          return prev + 1;
        });
      }, 4000);
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
    if (idx === Z3_SCENARIO_STEPS.length - 1) {
      onClearScenario?.();
    }
  };

  return (
    <div
      className="relative w-full rounded border border-line/80 bg-ink/90 p-4 sm:p-6 backdrop-blur-md shadow-2xl space-y-6 select-none"
      role="region"
      aria-label="Interactive Z3 SMT Reachability & Nen Vows Visualizer"
    >
      {/* Top Banner & Mandatory Illustrative Notice */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#1FA37A] animate-pulse" />
          <span className="font-mono text-xs text-[#1FA37A] tracking-widest uppercase font-semibold">
            [HUNTER_X_HUNTER &bull; NEN_VOWS_Z3_ENGINE]
          </span>
        </div>

        {/* MANDATORY NOTICE */}
        <div className="px-2.5 py-1 rounded border border-[#1FA37A]/40 bg-[#1FA37A]/10 text-[#1FA37A] font-mono text-[10px] sm:text-xs uppercase tracking-wider font-semibold">
          illustrative example, not real Z3 execution
        </div>
      </div>

      {/* Interactive Controls & Beat Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line/40 pb-4">
        {/* Step Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {Z3_SCENARIO_STEPS.map((step, idx) => (
            <button
              key={step.id}
              type="button"
              onClick={() => handleStepSelect(idx)}
              className={`px-3 py-1.5 rounded font-mono text-xs transition-all ${
                currentStepIndex === idx
                  ? "bg-[#1FA37A] text-void font-bold shadow-[0_0_12px_rgba(31,163,122,0.4)]"
                  : "bg-ink-2/80 text-mist hover:text-feather hover:bg-ink-2 border border-line"
              }`}
              aria-label={`Jump to Beat ${idx + 1}: ${step.title}`}
            >
              Beat {idx + 1}
            </button>
          ))}
        </div>

        {/* View Switcher & Play / Pause */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded border border-line bg-ink-2 p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab("graph")}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === "graph"
                  ? "bg-[#1FA37A]/20 text-[#34D399] font-bold"
                  : "text-mist hover:text-feather"
              }`}
            >
              Topology Graph
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("vows")}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === "vows"
                  ? "bg-[#1FA37A]/20 text-[#34D399] font-bold"
                  : "text-mist hover:text-feather"
              }`}
            >
              Vow Table ({Z3_VOW_RULES.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3 py-1.5 rounded border border-[#1FA37A]/40 bg-[#1FA37A]/10 hover:bg-[#1FA37A]/20 text-[#34D399] font-mono text-xs font-semibold tracking-wider uppercase transition-colors"
          >
            {isPlaying ? "❚❚ Pause" : "▶ Play Sequence"}
          </button>
        </div>
      </div>

      {/* View 1: Nen Vow Rule Table (Beat A) */}
      {activeTab === "vows" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#1FA37A] uppercase font-bold tracking-wider">
              [TERRAFORM IAM RULES AS NEN VOWS]
            </span>
            <span className="text-mist text-[11px]">
              {currentStepIndex >= 2 ? "✓ Auto-Repair Applied" : "Evaluating Global Satisfiability"}
            </span>
          </div>

          <div className="overflow-x-auto rounded border border-line/60 bg-ink-2/70">
            <table className="w-full text-left font-mono text-xs">
              <thead className="border-b border-line/60 bg-ink/90 text-mist">
                <tr>
                  <th className="p-3">Vow Name</th>
                  <th className="p-3">Terraform Resource</th>
                  <th className="p-3">Condition Formula</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40 text-feather">
                {Z3_VOW_RULES.map((vow) => {
                  const isAmended = currentStepIndex >= 2 && vow.id === "vow-3";
                  return (
                    <tr
                      key={vow.id}
                      className={`transition-colors ${
                        isAmended
                          ? "bg-emerald-950/20"
                          : "hover:bg-ink/50"
                      }`}
                    >
                      <td className="p-3 font-bold text-[#1FA37A]">
                        {vow.name}
                        {isAmended && (
                          <span className="ml-2 text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/40">
                            Amended by Auto-Repair
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-mist text-[11px]">{vow.terraformResource}</td>
                      <td className="p-3 font-mono text-[11px]">
                        {isAmended && vow.repairedCondition ? (
                          <span className="text-emerald-300 font-bold">
                            {vow.repairedCondition}
                          </span>
                        ) : (
                          <span className={vow.id === "vow-3" && currentStepIndex === 1 ? "text-amber-400 font-bold" : "text-feather"}>
                            {vow.condition}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isAmended
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : vow.id === "vow-3" && currentStepIndex === 1
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-ink text-mist border border-line"
                          }`}
                        >
                          {isAmended ? "AMENDED" : "ACTIVE VOW"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 2: Topology Graph (Beats B, C, D, E) */}
      <div className={`space-y-4 ${activeTab === "vows" ? "hidden" : "block"}`}>
        {/* Solver Status Header */}
        <div className="flex items-center justify-between font-mono text-xs px-2">
          <div className="flex items-center gap-2">
            <span className="text-mist">SOLVER STATUS:</span>
            <span
              className={`px-2.5 py-0.5 rounded font-bold uppercase tracking-wider text-xs transition-all duration-300 ${
                activeStep.solverStatus === "SAT"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              }`}
            >
              {activeStep.solverStatus}
            </span>
          </div>

          <div className="text-mist text-[11px]">
            {activeStep.chainLit && (
              <span className="text-amber-300 font-semibold animate-pulse">
                ⚡ Escalation Chain Found (Missed by Checkov & TFSec)
              </span>
            )}
            {activeStep.chainBroken && !activeStep.proofCertified && (
              <span className="text-emerald-400 font-semibold">
                ✕ Chain Severed by Auto-Repair &bull; Collapse Triggered
              </span>
            )}
            {activeStep.proofCertified && (
              <span className="text-emerald-300 font-semibold">
                ✓ Cryptographic Certificate Verified
              </span>
            )}
          </div>
        </div>

        {/* Graph Stage Canvas (max 14 nodes, 10 rendered) */}
        <div className="relative w-full aspect-[680/380] min-h-[320px] sm:min-h-[400px] rounded border border-line/60 bg-[radial-gradient(circle_at_center,_rgba(16,36,28,0.7)_0%,_rgba(9,19,16,0.95)_80%)] overflow-hidden p-4 sm:p-6 flex items-center justify-center">
          {/* SVG Connector Lines */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {Z3_GRAPH_EDGES.map((edge) => {
              const source = Z3_GRAPH_NODES.find((n) => n.id === edge.from);
              const target = Z3_GRAPH_NODES.find((n) => n.id === edge.to);
              if (!source || !target) return null;

              const isChainEdge = edge.isEscalationChain && activeStep.chainLit;
              const isBrokenEdge = edge.isSeveredByRepair && activeStep.chainBroken;

              let strokeColor = "#243044";
              let strokeWidth = "0.6";
              let strokeDash = "none";

              if (isBrokenEdge) {
                strokeColor = "#EF4444";
                strokeWidth = "1.2";
                strokeDash = "2 2";
              } else if (isChainEdge) {
                strokeColor = "#6B4EFF";
                strokeWidth = "1.5";
              }

              return (
                <g key={edge.id}>
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDash}
                    className="transition-all duration-500"
                  />
                  {/* Broken link indicator */}
                  {isBrokenEdge && (
                    <circle
                      cx={(source.x + target.x) / 2}
                      cy={(source.y + target.y) / 2}
                      r="1.8"
                      fill="#EF4444"
                      className="animate-ping"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Graph Nodes (Absolute Percentage Placement) */}
          {Z3_GRAPH_NODES.map((node) => {
            const isAttacker = node.category === "attacker";
            const isPrivileged = node.category === "privileged";
            const onPath = node.onEscalationPath && activeStep.chainLit;
            const isBroken = node.id === "role_deployer" && activeStep.chainBroken;

            let borderColor = "#243044";
            let bgColor = "#0E1118";
            let labelColor = "#9AA7BD";

            if (isAttacker) {
              borderColor = "#EF4444";
              bgColor = "rgba(239, 68, 68, 0.15)";
              labelColor = "#FCA5A5";
            } else if (isPrivileged) {
              borderColor = "#6B4EFF";
              bgColor = activeStep.proofCertified
                ? "rgba(31, 163, 122, 0.25)"
                : "rgba(107, 78, 255, 0.2)";
              labelColor = activeStep.proofCertified ? "#A7F3D0" : "#C4B5FD";
            } else if (onPath) {
              borderColor = "#1FA37A";
              bgColor = "rgba(31, 163, 122, 0.2)";
              labelColor = "#A7F3D0";
            } else if (isBroken) {
              borderColor = "#EF4444";
              bgColor = "rgba(239, 68, 68, 0.1)";
              labelColor = "#FCA5A5";
            }

            return (
              <div
                key={node.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded border flex flex-col items-center text-center transition-all duration-500 z-10 shadow-lg min-w-[65px] sm:min-w-[85px] max-w-[110px]"
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  borderColor,
                  backgroundColor: bgColor,
                  boxShadow: onPath ? "0 0 16px rgba(31, 163, 122, 0.3)" : "none",
                }}
              >
                <span className="font-mono text-[9px] sm:text-[10px] font-bold truncate w-full" style={{ color: labelColor }}>
                  {node.label}
                </span>
                <span className="font-mono text-[7px] sm:text-[8px] text-mist truncate w-full">
                  {node.sublabel}
                </span>

                {isAttacker && (
                  <span className="absolute -top-2.5 px-1 bg-red-950 border border-red-500 text-red-300 font-mono text-[7px] uppercase rounded">
                    Entry
                  </span>
                )}
                {isPrivileged && (
                  <span className="absolute -top-2.5 px-1 bg-[#6B4EFF]/20 border border-[#6B4EFF] text-violet-300 font-mono text-[7px] uppercase rounded">
                    Admin
                  </span>
                )}
              </div>
            );
          })}

          {/* Beat 4: Proof Certificate Stamp Overlay (Beat E) */}
          {activeStep.proofCertified && (
            <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-void/60 backdrop-blur-xs animate-in fade-in duration-500">
              <div className="p-5 sm:p-6 rounded-lg border-2 border-[#34D399] bg-ink/95 text-center space-y-3 shadow-[0_0_32px_rgba(52,211,153,0.4)] max-w-md w-full">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-[#34D399] bg-[#1FA37A]/20 text-[#34D399] text-2xl font-bold">
                  ✓
                </div>
                <div className="space-y-1">
                  <div className="font-mono text-[10px] tracking-widest text-[#34D399] uppercase font-bold">
                    [SMT_PROOF_CERTIFICATE &bull; SHA256_VERIFIED]
                  </div>
                  <h4 className="font-display text-base sm:text-lg font-bold text-feather">
                    Zero Privilege Escalation Paths
                  </h4>
                  <p className="font-mono text-xs text-mist leading-relaxed">
                    SMT reachability query returned <span className="text-emerald-400 font-bold">UNSATISFIABLE</span> under amended IAM boundary. Mathematical guarantee certified.
                  </p>
                </div>
                <div className="pt-2 border-t border-line/60 flex items-center justify-between text-[10px] font-mono text-mist">
                  <span>TEST SUITE: 103 PASSING</span>
                  <span className="text-emerald-400">STATUS: PROVED</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Narration & Invariant Analysis */}
      <div className="p-4 rounded border border-line/60 bg-ink-2/40 space-y-2">
        <div className="flex items-center gap-2 font-mono text-xs text-[#1FA37A] uppercase font-semibold">
          <span>&gt; Beat {currentStepIndex + 1} Analysis: {activeStep.title}</span>
        </div>
        <p className="font-ui text-sm sm:text-base text-feather leading-relaxed">
          {activeStep.caption}
        </p>
        <p className="font-mono text-xs text-mist leading-relaxed pt-1 border-t border-line/30">
          <span className="text-feather font-semibold">Benchmark Truth: </span>
          {activeStep.details}
        </p>
      </div>
    </div>
  );
}

export default Z3VizCanvas;

