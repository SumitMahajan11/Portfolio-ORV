"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { projects } from "@/content/projects";
import { renderField } from "@/components/ui/fill-badge";
import { SystemWindow } from "@/components/system-window";
import { useMode } from "@/lib/flags";
import { Z3_TEST_SUITE } from "@/lib/worlds/z3-viz";
import { Z3StaticDiagram } from "./z3-static-diagram";
import { ProviderCoverageTable } from "./provider-coverage-table";

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
 * - Dynamic client-only visualization with static fallback (5 captioned frames)
 * - Label: "Recorded output of the real tool (iac-verifier, commit 6ed26e409270f296a2ecb7a1b3d01e0689ade954, 2026-11-08)"
 * - Proof panel from verified content only (/docs/03-CONTENT-BIBLE.md)
 * - Biyoo costume hook: chain bracelet
 */
export function Z3World({ className = "" }: Z3WorldProps) {
  const { reducedMotion } = useMode();
  const [scenarioCleared, setScenarioCleared] = useState(false);

  // Retrieve iac-verifier project data from content
  const project = projects.find((p) => p.id === "iac-verifier") || {
    id: "iac-verifier",
    title: "iac-verifier",
    status: "flagship",
    world: "z3",
    oneLiner: "Z3-based reachability proofs on Terraform IAM and network graphs.",
    claims: [
      {
        text: Z3_TEST_SUITE.claimText,
        evidence: "verified",
        source: "README",
      },
    ],
    limits: [
      "Auto-repair covers AWS (Security Groups and IAM policies) and Azure NSG only; unsupported for GCP resources, ARM JSON templates, and Azure Governance Policies.",
      "On independent TerraGoat GCP baseline: 1 flagged, 1 modeled but missed before fix, and 9 resources not modeled by the SMT engine (Azure TerraGoat test cases passed; GCP baseline has gaps).",
      "All 5 resource-bearing TerraGoat GCP files are UNRESOLVABLE at graph level (reason undiagnosed).",
      "Public IAM exposure is a rule-based check tuned post-hoc, not a formal SMT proof.",
      "GCP corpus is a hand-authored regression dataset for specification conformance, not an independent benchmark.",
      "Solver timeout or incompleteness returns UNKNOWN, which fails closed and is never treated as safe.",
    ],
    links: { repo: "https://github.com/SumitMahajan11/iac-verifier", demo: null, benchmark: null },
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

  const isStaticMode = reducedMotion;

  return (
    <section
      id="iac-verifier"
      data-world="z3"
      className={`relative z-20 w-full min-h-screen py-24 sm:py-32 px-4 sm:px-6 bg-[radial-gradient(ellipse_at_top,_rgba(14,42,51,0.45)_0%,_rgba(5,8,13,0.95)_80%)] text-feather ${className}`}
      aria-labelledby="z3-world-title"
    >
      <div className="max-w-5xl mx-auto space-y-16 sm:space-y-24">
        {/* Navigation & Breadcrumb */}
        <div className="flex items-center justify-between border-b border-line/60 pb-4 font-mono text-xs sm:text-[13px]">
          <div className="flex items-center gap-2 text-[#5EEAD4]">
            <span className="w-2 h-2 rounded-full bg-[#5EEAD4] animate-pulse" />
            <span className="uppercase tracking-widest font-semibold">[ACT 3 &bull; WORLD: IAC-VERIFIER (Z3)]</span>
          </div>
          <a
            href="#scenario-select"
            className="text-mist hover:text-[#5EEAD4] transition-colors underline underline-offset-4 decoration-mist/40 hover:decoration-[#5EEAD4]"
          >
            &uarr; Back to Scenario Select
          </a>
        </div>

        {/* Beat 1: Scenario Card "Scenario: Break the Chain" */}
        <div className="max-w-2xl mx-auto">
          <SystemWindow title="SYSTEM PROMPT: SCENARIO ASSIGNMENT">
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <span className="font-mono text-xs sm:text-[13px] text-[#5EEAD4] uppercase tracking-widest font-semibold">
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

        {/* Beats 2-4: Interactive Cut the chain model */}
        <div className="space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h3 className="font-display text-lg sm:text-xl font-bold text-feather">
              Every role passes the linter. The chain still reaches admin.
            </h3>
            <p className="font-mono text-xs text-mist">
              Seal admin_role from the outside. The verifier proves reachability across transitive IAM roles using SMT constraints.
            </p>
          </div>

          {/* Conditional Progressive Enhancement: Static diagram for reduced-motion, dynamic for full interactive */}
          {isStaticMode ? (
            <Z3StaticDiagram />
          ) : (
            <DynamicZ3VizCanvas onClearScenario={handleScenarioClear} />
          )}
        </div>

        {/* Real Visual Proof Asset: Terminal Capture */}
        <div className="max-w-4xl mx-auto w-full space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#5EEAD4] font-semibold">
              [VISUAL PROOF &bull; Z3 VERIFICATION VERDICT &amp; REPAIR STATUS]
            </span>
            <span className="font-mono text-[11px] text-[#5EEAD4] border border-[#5EEAD4]/40 bg-[#5EEAD4]/10 px-2 py-0.5 rounded">
              Source: real tool output
            </span>
          </div>

          <div className="relative overflow-hidden rounded-lg border border-line bg-black/70 shadow-2xl">
            <Image
              src="/proofs/iac-verifier-proof.webp"
              alt="iac-verifier Z3 SMT solver verification output finding multi-hop privilege escalation path missed by Checkov and TFSec in the included example"
              width={2200}
              height={1012}
              loading="lazy"
              decoding="async"
              className="w-full h-auto block"
            />
          </div>

          <p className="font-mono text-xs sm:text-[13px] text-mist leading-relaxed">
            Real tool output from <code className="text-[#5EEAD4]">examples/checkov-tfsec-gap/</code>: Z3 SMT finds 2-hop escalation path (<code className="text-red-400">[SAT]</code>); auto-repair removes the trust statement that lets the account assume jump_role; re-verified UNSAT.
          </p>
        </div>

        {/* Beat 5: Proof Panel (Verification strictly from /docs/03) */}
        <div data-proof-panel="true" className="max-w-2xl mx-auto w-full">
          <SystemWindow title="[READER'S RECORD &bull; VERIFICATION]">
            <div className="space-y-6 py-2">
              {/* Claims / Findings */}
              <div className="space-y-3">
                <span className="font-mono text-xs sm:text-[13px] text-mist uppercase tracking-wider font-semibold">
                  VERIFIED CLAIMS (/docs/03-CONTENT-BIBLE.md):
                </span>
                {project.claims && project.claims.length > 0 ? (
                  <ul className="space-y-2.5 font-mono text-xs sm:text-[13px] text-feather">
                    {project.claims.map((claim, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                        <span className="text-[#5EEAD4] font-bold">&bull;</span>
                        <div className="space-y-0.5">
                          <span>{claim.text}</span>
                          <span className="block text-xs sm:text-[13px] text-mist/70">
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

              {/* Provider Coverage Matrix (AWS / Azure / GCP x capability) */}
              <div className="space-y-3 pt-4 border-t border-line/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs sm:text-[13px] text-mist uppercase tracking-wider font-semibold">
                    PROVIDER COVERAGE MATRIX (docs/provider-coverage.json):
                  </span>
                  <span className="font-mono text-xs text-[#EF4444] font-medium">
                    GCP Auto-Repair: Not supported
                  </span>
                </div>
                <ProviderCoverageTable />
              </div>

              {/* Verified Limitations (FACTS.md) */}
              {project.limits && project.limits.length > 0 && (
                <div data-testid="z3-limitations-block" className="space-y-3 pt-4 border-t border-line/60">
                  <span className="font-mono text-xs sm:text-[13px] text-mist uppercase tracking-wider font-semibold">
                    VERIFIED LIMITATIONS (docs/sources/z3/FACTS.md):
                  </span>
                  <ul className="space-y-2 font-mono text-xs sm:text-[13px] text-feather/90">
                    {project.limits.map((limit, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                        <span className="text-[#EF4444] font-bold">&bull;</span>
                        <span>{limit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Links */}
              <div className="pt-4 border-t border-line/60 flex flex-wrap items-center justify-between gap-4 font-mono text-xs sm:text-[13px]">
                <div className="flex items-center gap-2">
                  <span className="text-mist">Source Code:</span>
                  {renderField(project.links.repo, (url) => (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#5EEAD4] hover:text-feather underline transition-colors"
                    >
                      {url}
                    </a>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-mist">Proof:</span>
                  <a
                    href="https://github.com/SumitMahajan11/iac-verifier/tree/main/examples/checkov-tfsec-gap"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#5EEAD4] hover:text-feather underline transition-colors"
                  >
                    examples/checkov-tfsec-gap ↗
                  </a>
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
            <div className="inline-flex items-center gap-3 border-2 border-[#5EEAD4] bg-[#5EEAD4]/10 px-6 py-3 rounded-sm font-mono text-sm sm:text-base uppercase tracking-widest text-[#5EEAD4] font-bold shadow-[0_0_24px_rgba(94,234,212,0.25)]">
              <span className="text-lg sm:text-xl">&#10003;</span>
              <span>Scenario cleared</span>
            </div>
          </div>

          <div className="pt-6">
            <a
              href="#scenario-select"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded border border-[#5EEAD4]/40 bg-ink-2/60 hover:bg-ink text-[#5EEAD4] font-mono text-xs tracking-wider uppercase transition-colors"
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

