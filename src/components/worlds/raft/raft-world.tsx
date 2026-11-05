"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { projects } from "@/content/projects";
import { renderField } from "@/components/ui/fill-badge";
import { SystemWindow } from "@/components/system-window";
import { useMode } from "@/lib/flags";
import { RaftStaticDiagram } from "./raft-static-diagram";

// Lazy-load the interactive ninja visualizer (canvas/state machine)
const DynamicRaftVizCanvas = dynamic(
  () => import("./raft-viz-canvas").then((mod) => mod.RaftVizCanvas),
  {
    ssr: false,
    loading: () => <RaftStaticDiagram />,
  }
);

export interface RaftWorldProps {
  className?: string;
}

/**
 * RaftWorld Component:
 * Flagship World: Ratify (Raft implementation) — Naruto: Hidden Leaf theme.
 *
 * Rules:
 * - Scoped via data-world="raft"
 * - Server-rendered text content for SEO & accessibility
 * - Dynamic client-only visualization with static fallback (5 captioned frames)
 * - Label: "illustrative visualization, not the Ratify code"
 * - Prominent limitation: "3-node, correctness project, not a performance benchmark."
 * - Proof panel copied verbatim from /docs/03
 * - Biyoo costume hook: leaf headband
 */
export function RaftWorld({ className = "" }: RaftWorldProps) {
  const { reducedMotion, mode } = useMode();
  const [scenarioCleared, setScenarioCleared] = useState(false);

  // Retrieve Ratify project data from content
  const project = projects.find((p) => p.id === "ratify") || {
    id: "ratify",
    title: "Ratify",
    status: "flagship",
    world: "raft",
    oneLiner: "From-scratch Rust Raft implementation.",
    claims: [],
    limits: ["3-node, correctness project, not a performance benchmark."],
    links: { repo: null, demo: null, benchmark: null },
    costume: "leaf headband",
    worldReady: true,
  };

  const handleScenarioClear = () => {
    setScenarioCleared(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("biyoo:action", {
          detail: { state: "proud", line: "Biyoo!" },
        })
      );
    }
  };

  const isStaticMode = reducedMotion || mode === "light";

  return (
    <section
      id="ratify"
      data-world="raft"
      className={`relative z-20 w-full min-h-screen py-24 sm:py-32 px-4 sm:px-6 bg-[radial-gradient(ellipse_at_top,_rgba(26,18,11,0.95)_0%,_rgba(7,8,11,1)_80%)] text-feather ${className}`}
      aria-labelledby="raft-world-title"
    >
      <div className="max-w-5xl mx-auto space-y-16 sm:space-y-24">
        {/* Navigation & Breadcrumb */}
        <div className="flex items-center justify-between border-b border-line/60 pb-4 font-mono text-xs">
          <div className="flex items-center gap-2 text-[#F28C28]">
            <span className="w-2 h-2 rounded-full bg-[#F28C28] animate-pulse" />
            <span className="uppercase tracking-widest">[ACT 3 &bull; WORLD: RATIFY (RAFT)]</span>
          </div>
          <a
            href="#scenario-select"
            className="text-mist hover:text-[#F28C28] transition-colors underline underline-offset-4 decoration-mist/40 hover:decoration-[#F28C28]"
          >
            &uarr; Back to Scenario Select
          </a>
        </div>

        {/* Beat 1: Scenario Card "Scenario: Elect the Hokage" */}
        <div className="max-w-2xl mx-auto">
          <SystemWindow title="SYSTEM PROMPT: SCENARIO ASSIGNMENT">
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <span className="font-mono text-xs text-[#F28C28] uppercase tracking-widest font-semibold">
                  [SCENARIO 2: HIDDEN LEAF CONSENSUS]
                </span>
                <h2
                  id="raft-world-title"
                  className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-feather"
                >
                  {project.title}
                </h2>
              </div>

              <div className="font-ui text-sm sm:text-base text-mist leading-relaxed">
                {renderField(project.oneLiner)}
              </div>
            </div>
          </SystemWindow>
        </div>

        {/* Beats 2-4: Village of 3 Nodes Consensus Simulation */}
        <div className="space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h3 className="font-display text-lg sm:text-xl font-bold text-feather">
              Hidden Leaf Raft Visualizer
            </h3>
            <p className="font-mono text-xs text-mist">
              Observe leader failure, term increments, majority quorum elections, partition walls, and stale leader demotion.
            </p>
          </div>

          {/* Conditional Progressive Enhancement: Static diagram for reduced-motion/light, dynamic for full interactive */}
          {isStaticMode ? (
            <RaftStaticDiagram />
          ) : (
            <DynamicRaftVizCanvas onClearScenario={handleScenarioClear} />
          )}
        </div>

        {/* Beat 5: Proof Panel (Verification & Prominent Limit) */}
        <div data-proof-panel="true" className="max-w-2xl mx-auto w-full">
          <SystemWindow title="[READER'S RECORD &bull; VERIFICATION]">
            <div className="space-y-6 py-2">
              {/* REQUIRED PROMINENT LIMITATION CALLOUT (P2-1 Req 5) */}
              <div className="p-3.5 rounded border-2 border-[#F28C28] bg-[#F28C28]/10 text-[#F28C28] space-y-1">
                <div className="font-mono text-xs uppercase tracking-wider font-bold flex items-center gap-2">
                  <span>⚠</span>
                  <span>MANDATORY LIMITATION NOTICE</span>
                </div>
                <div className="font-mono text-xs sm:text-sm font-semibold text-feather">
                  &ldquo;3-node, correctness project, not a performance benchmark.&rdquo;
                </div>
              </div>

              {/* Claims / Findings */}
              <div className="space-y-3">
                <span className="font-mono text-[11px] text-mist uppercase tracking-wider">
                  VERIFIED CLAIMS (/docs/03-CONTENT-BIBLE.md):
                </span>
                {project.claims && project.claims.length > 0 ? (
                  <ul className="space-y-2.5 font-mono text-xs text-feather">
                    {project.claims.map((claim, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                        <span className="text-[#F28C28] font-bold">&bull;</span>
                        <div className="space-y-0.5">
                          <span>{claim.text}</span>
                          <span className="block text-[10px] text-mist/70">
                            [evidence: {claim.evidence} &bull; source: {claim.source ?? "README"}]
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="font-ui text-sm text-mist/90">
                    {renderField(project.oneLiner)}
                  </div>
                )}
              </div>

              {/* Links */}
              <div className="pt-4 border-t border-line/60 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-mist">Repository:</span>
                  {renderField(project.links.repo, (url) => (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#F28C28] hover:text-feather underline transition-colors"
                    >
                      {url}
                    </a>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-mist">Demo:</span>
                  {renderField(project.links.demo, (url) => (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#F28C28] hover:text-feather underline transition-colors"
                    >
                      {url}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </SystemWindow>
        </div>

        {/* Beat 6: Exit Stamp "Scenario cleared" */}
        <div className="flex flex-col items-center justify-center text-center space-y-4 pt-6">
          <div
            className={`transition-all duration-500 transform ${
              scenarioCleared ? "scale-100 opacity-100" : "scale-95 opacity-80"
            }`}
          >
            <div className="inline-flex items-center gap-3 border-2 border-[#F28C28] bg-[#F28C28]/10 px-6 py-3 rounded-sm font-mono text-sm sm:text-base uppercase tracking-widest text-[#F28C28] font-bold shadow-[0_0_24px_rgba(242,140,40,0.25)]">
              <span className="text-lg sm:text-xl">&#10003;</span>
              <span>Scenario cleared</span>
            </div>
          </div>

          <div className="pt-6">
            <a
              href="#scenario-select"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded border border-[#F28C28]/40 bg-ink-2/60 hover:bg-ink text-[#F28C28] font-mono text-xs tracking-wider uppercase transition-colors"
            >
              &uarr; Return to Scenario Select
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default RaftWorld;

