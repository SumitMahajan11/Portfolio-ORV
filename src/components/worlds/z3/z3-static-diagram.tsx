"use client";

import React from "react";
import {
  Z3_VOW_RULES,
  Z3_SCENARIO_STEPS,
} from "@/lib/worlds/z3-viz";

/**
 * Helper to render node circles with distinct category styling
 */
function StaticGraphNode({
  label,
  sublabel,
  category,
  onPath,
  broken,
}: {
  label: string;
  sublabel: string;
  category: string;
  onPath: boolean;
  broken?: boolean;
}) {
  const isPrivileged = category === "privileged";
  const isAttacker = category === "attacker";

  let strokeColor = "#243044";
  let fillColor = "#0E1118";
  let textColor = "#9AA7BD";

  if (isAttacker) {
    strokeColor = "#EF4444";
    textColor = "#FCA5A5";
  } else if (isPrivileged) {
    strokeColor = "#6B4EFF";
    fillColor = "rgba(107, 78, 255, 0.15)";
    textColor = "#C4B5FD";
  } else if (onPath) {
    strokeColor = broken ? "#6B4EFF" : "#1FA37A";
    fillColor = broken ? "rgba(107, 78, 255, 0.1)" : "rgba(31, 163, 122, 0.15)";
    textColor = broken ? "#E9D5FF" : "#A7F3D0";
  }

  return (
    <div
      className="p-1.5 sm:p-2 rounded border flex flex-col items-center text-center transition-colors min-w-[70px] sm:min-w-[85px] max-w-[100px]"
      style={{
        borderColor: strokeColor,
        backgroundColor: fillColor,
      }}
    >
      <span className="font-mono text-[9px] sm:text-[10px] font-bold truncate w-full" style={{ color: textColor }}>
        {label}
      </span>
      <span className="font-mono text-[7px] sm:text-[8px] text-mist/60 truncate w-full">
        {sublabel}
      </span>
    </div>
  );
}

/**
 * Z3StaticDiagram Component:
 * Static annotated graph with 4 captioned frames.
 * Meets P2-2 Requirement 6 for reduced-motion and light mode fallbacks.
 */
export function Z3StaticDiagram() {
  return (
    <div
      className="relative w-full rounded border border-line/80 bg-ink/80 p-4 sm:p-6 backdrop-blur-md shadow-2xl space-y-8 select-none"
      role="region"
      aria-label="Deterministic 4-Step Z3 Reachability & Auto-Repair Diagram (Static View)"
    >
      {/* Top Banner with Required Illustrative Notice */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#1FA37A] animate-pulse" />
          <span className="font-mono text-xs text-[#1FA37A] tracking-widest uppercase font-semibold">
            [Z3_SMT_REACHABILITY &bull; STATIC_4_FRAMES]
          </span>
        </div>
        <div className="px-2.5 py-1 rounded border border-[#1FA37A]/40 bg-[#1FA37A]/10 text-[#1FA37A] font-mono text-[10px] sm:text-xs uppercase tracking-wider font-semibold">
          illustrative example, not real Z3 execution
        </div>
      </div>

      {/* Illustrative Vow Table (Beat A) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#1FA37A] uppercase font-bold tracking-wider">
            [ILLUSTRATIVE NEN VOWS &bull; TERRAFORM IAM CONSTRAINTS]
          </span>
          <span className="text-mist text-[11px]">(4 Encoded Rules)</span>
        </div>
        <div className="overflow-x-auto rounded border border-line/60 bg-ink-2/60">
          <table className="w-full text-left font-mono text-[11px]">
            <thead className="border-b border-line/60 bg-ink/80 text-mist">
              <tr>
                <th className="p-2 sm:p-2.5">Vow / Rule Name</th>
                <th className="p-2 sm:p-2.5">Terraform Resource</th>
                <th className="p-2 sm:p-2.5">Condition Formula</th>
                <th className="p-2 sm:p-2.5">Graph Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40 text-feather">
              {Z3_VOW_RULES.map((vow) => (
                <tr key={vow.id} className="hover:bg-ink/50 transition-colors">
                  <td className="p-2 sm:p-2.5 font-bold text-[#1FA37A]">{vow.name}</td>
                  <td className="p-2 sm:p-2.5 text-mist text-[10px]">{vow.terraformResource}</td>
                  <td className="p-2 sm:p-2.5 text-feather font-mono text-[10px]">{vow.condition}</td>
                  <td className="p-2 sm:p-2.5 text-mist text-[10px]">{vow.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4 Captioned Frames */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Z3_SCENARIO_STEPS.map((step, idx) => {
          const isSat = step.solverStatus === "SAT";
          return (
            <article
              key={step.id}
              className="flex flex-col justify-between rounded border border-line/60 bg-ink-2/50 p-4 space-y-4 hover:border-[#1FA37A]/50 transition-colors"
            >
              {/* Frame Header */}
              <div className="space-y-1.5 border-b border-line/40 pb-2">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#1FA37A] font-semibold">
                    FRAME {idx + 1}/4
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                      isSat
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {step.solverStatus}
                  </span>
                </div>
                <h4 className="font-display text-xs font-bold text-feather leading-tight">
                  {step.title}
                </h4>
              </div>

              {/* Mini Static Graph Representation */}
              <div className="py-2 flex flex-col items-center justify-center space-y-2 min-h-[140px] relative">
                {/* Visual Status Indicator */}
                {step.chainLit && (
                  <div className="w-full text-center px-2 py-1 bg-amber-500/10 border border-amber-500/40 rounded text-[10px] font-mono text-amber-300">
                    ⚡ Chain Traced: Attacker &rarr; Admin
                  </div>
                )}
                {step.chainBroken && !step.proofCertified && (
                  <div className="w-full text-center px-2 py-1 bg-red-500/10 border border-red-500/40 rounded text-[10px] font-mono text-red-300">
                    ✕ Chain Severed &bull; UNSATISFIABLE
                  </div>
                )}
                {step.proofCertified && (
                  <div className="w-full text-center px-2 py-1 bg-[#1FA37A]/15 border border-[#1FA37A] rounded text-[10px] font-mono text-[#1FA37A] font-bold shadow-[0_0_12px_rgba(31,163,122,0.3)]">
                    ✓ PROOF CERTIFICATE STAMPED
                  </div>
                )}

                {/* Node snapshot */}
                <div className="grid grid-cols-2 gap-1.5 w-full">
                  <StaticGraphNode
                    label="0.0.0.0/0"
                    sublabel="Ingress"
                    category="attacker"
                    onPath={step.chainLit}
                  />
                  <StaticGraphNode
                    label="EC2 Instance"
                    sublabel="Web Frontend"
                    category="compute"
                    onPath={step.chainLit}
                  />
                  <StaticGraphNode
                    label="AppDeployer"
                    sublabel="iam:PassRole"
                    category="iam"
                    onPath={step.chainLit}
                    broken={step.chainBroken}
                  />
                  <StaticGraphNode
                    label="AdminAccess"
                    sublabel="Privileged"
                    category="privileged"
                    onPath={step.chainLit}
                  />
                </div>
              </div>

              {/* Caption & Explanations */}
              <div className="pt-2 border-t border-line/40 space-y-1 font-mono text-[11px] leading-relaxed text-mist">
                <p className="text-feather/90">{step.caption}</p>
                <p className="text-[10px] text-mist/70 italic">{step.details}</p>
              </div>
            </article>
          );
        })}
      </div>

      {/* Footer Info & Benchmark Statement */}
      <div className="pt-3 border-t border-line/40 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-mist">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
            <span>Public Ingress</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#1FA37A]" />
            <span>IAM Transitive Chain</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#6B4EFF]" />
            <span>Privileged Admin</span>
          </span>
        </div>
        <div className="text-[#1FA37A] font-semibold">
          FINDINGS: PRIVILEGE ESCALATION DISCOVERED &bull; ZERO CHECKS MISSED
        </div>
      </div>
    </div>
  );
}

export default Z3StaticDiagram;
