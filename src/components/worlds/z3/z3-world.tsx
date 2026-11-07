"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { projects } from "@/content/projects";
import { renderField } from "@/components/ui/fill-badge";
import { SystemWindow } from "@/components/system-window";
import { useMode } from "@/lib/flags";
import { Z3StaticDiagram } from "./z3-static-diagram";

// Lazy-load the interactive Z3 visualizer canvas
const DynamicZ3VizCanvas = dynamic(
  () => import("./z3-viz-canvas").then((mod) => mod.Z3VizCanvas),
  {
    ssr: false,
    loading: () => <Z3StaticDiagram />,
  }
);

export interface Z3WorldProps {
  className?: string;
}

/**
 * Z3World Component:
 * Flagship World: iac-verifier (Z3) — Hunter x Hunter: Nen Vows theme.
 *
 * Rules:
 * - Scoped via data-world="z3"
 * - Server-rendered text content for SEO & accessibility
 * - Dynamic client-only visualization with static fallback (4 captioned frames)
 * - Label: "illustrative example, not real Z3 execution"
 * - Proof panel from verified content only (/docs/03-CONTENT-BIBLE.md)
 * - Biyoo costume hook: chain bracelet
 */
export function Z3World({ className = "" }: Z3WorldProps) {
  const { reducedMotion, mode } = useMode();
  const [scenarioCleared, setScenarioCleared] = useState(false);

  // Retrieve iac-verifier project data from content
  const project = projects.find((p) => p.id === "iac-verifier") || {
    id: "iac-verifier",
    title: "iac-verifier",
    status: "flagship",
    world: "z3",
    oneLiner: "Z3-based reachability proofs on Terraform IAM and network graphs.",
    claims: [],
    limits: ["Pre-launch TODO: clean repo root (tfsec.exe, scratch/, loose checkov_*.json)."],
    links: { repo: null, demo: null, benchmark: null },
    costume: "chain bracelet",
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
      id="iac-verifier"
      data-world="z3"
      className={`relative z-20 w-full min-h-screen py-24 sm:py-32 px-4 sm:px-6 bg-[radial-gradient(ellipse_at_top,_rgba(10,24,20,0.65)_0%,_rgba(7,8,11,0.55)_80%)] text-feather ${className}`}
      aria-labelledby="z3-world-title"
    >
      <div className="max-w-5xl mx-auto space-y-16 sm:space-y-24">
        {/* Navigation & Breadcrumb */}
        <div className="flex items-center justify-between border-b border-line/60 pb-4 font-mono text-xs">
          <div className="flex items-center gap-2 text-[#1FA37A]">
            <span className="w-2 h-2 rounded-full bg-[#1FA37A] animate-pulse" />
            <span className="uppercase tracking-widest">[ACT 3 &bull; WORLD: IAC-VERIFIER (Z3)]</span>
          </div>
          <a
            href="#scenario-select"
            className="text-mist hover:text-[#1FA37A] transition-colors underline underline-offset-4 decoration-mist/40 hover:decoration-[#1FA37A]"
          >
            &uarr; Back to Scenario Select
          </a>
        </div>

        {/* Beat 1: Scenario Card "Scenario: Break the Chain" */}
        <div className="max-w-2xl mx-auto">
          <SystemWindow title="SYSTEM PROMPT: SCENARIO ASSIGNMENT">
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <span className="font-mono text-xs text-[#1FA37A] uppercase tracking-widest font-semibold">
                  [SCENARIO 3: NEN VOWS & SMT REACHABILITY]
                </span>
                <h2
                  id="z3-world-title"
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

        {/* Beats 2-4: Interactive Graph & Vow Table */}
        <div className="space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h3 className="font-display text-lg sm:text-xl font-bold text-feather">
              Z3 Nen Vows &amp; Reachability Engine
            </h3>
            <p className="font-mono text-xs text-mist">
              Observe how SMT constraint solving traces transitive privilege escalation paths missed by local AST linters, followed by auto-repair and proof certification.
            </p>
          </div>

          {/* Conditional Progressive Enhancement: Static diagram for reduced-motion/light, dynamic for full interactive */}
          {isStaticMode ? (
            <Z3StaticDiagram />
          ) : (
            <DynamicZ3VizCanvas onClearScenario={handleScenarioClear} />
          )}
        </div>

        {/* Beat 5: Proof Panel (Verification strictly from /docs/03) */}
        <div data-proof-panel="true" className="max-w-2xl mx-auto w-full">
          <SystemWindow title="[READER'S RECORD &bull; VERIFICATION]">
            <div className="space-y-6 py-2">
              {/* Claims / Findings */}
              <div className="space-y-3">
                <span className="font-mono text-[11px] text-mist uppercase tracking-wider">
                  VERIFIED CLAIMS (/docs/03-CONTENT-BIBLE.md):
                </span>
                {project.claims && project.claims.length > 0 ? (
                  <ul className="space-y-2.5 font-mono text-xs text-feather">
                    {project.claims.map((claim, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                        <span className="text-[#1FA37A] font-bold">&bull;</span>
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
                      className="text-[#1FA37A] hover:text-feather underline transition-colors"
                    >
                      {url}
                    </a>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-mist">Benchmark:</span>
                  {renderField(project.links.benchmark, (url) => (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#1FA37A] hover:text-feather underline transition-colors"
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
            <div className="inline-flex items-center gap-3 border-2 border-[#1FA37A] bg-[#1FA37A]/10 px-6 py-3 rounded-sm font-mono text-sm sm:text-base uppercase tracking-widest text-[#1FA37A] font-bold shadow-[0_0_24px_rgba(31,163,122,0.25)]">
              <span className="text-lg sm:text-xl">&#10003;</span>
              <span>Scenario cleared</span>
            </div>
          </div>

          <div className="pt-6">
            <a
              href="#scenario-select"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded border border-[#1FA37A]/40 bg-ink-2/60 hover:bg-ink text-[#1FA37A] font-mono text-xs tracking-wider uppercase transition-colors"
            >
              &uarr; Return to Scenario Select
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Z3World;

