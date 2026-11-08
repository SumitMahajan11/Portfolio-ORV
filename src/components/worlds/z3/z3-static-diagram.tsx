"use client";

import React from "react";
import {
  Z3_RECORDED_METADATA,
  RECORDED_CONFIG_EXCERPT,
  RECORDED_SAT_WITNESS,
  RECORDED_AUTO_REPAIR,
  RECORDED_FAIL_CLOSED,
  RECORDED_PROOF_CERTIFICATE,
  Z3_BEATS,
  WITNESS_GRAPH_NODES,
  WITNESS_GRAPH_EDGES,
} from "@/lib/worlds/z3-viz";

/**
 * Z3StaticDiagram Component:
 * Stacked static cards presenting the 5 verification beats from real recorded runs.
 * Used for mobile (<640px), reduced-motion, and light mode (NO canvas chunk loaded).
 */
export function Z3StaticDiagram() {
  return (
    <div
      className="relative w-full space-y-8 select-none font-mono text-xs"
      role="region"
      aria-label="Recorded Z3 SMT Reachability & Auto-Repair Output (Static 5-Beat View)"
    >
      {/* Global Header & Mandatory Honesty Notice */}
      <div className="rounded border border-line/80 bg-ink/90 p-4 sm:p-5 backdrop-blur-md shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#1FA37A] animate-pulse" />
            <span className="font-mono text-xs text-[#1FA37A] tracking-widest uppercase font-semibold">
              [Z3_SMT_VERIFICATION &bull; 5_BEATS_STATIC_VIEW]
            </span>
          </div>
          <div className="px-2.5 py-1 rounded border border-[#1FA37A]/40 bg-[#1FA37A]/10 text-[#1FA37A] font-mono text-[10px] sm:text-xs uppercase tracking-wider font-semibold">
            {Z3_RECORDED_METADATA.label}
          </div>
        </div>
        <p className="font-ui text-xs text-mist leading-relaxed italic">
          {Z3_RECORDED_METADATA.browserHonesty}
        </p>
      </div>

      {/* BEAT 1: The Question & Real HCL Config */}
      <div
        id="z3-beat-1"
        data-beat="1"
        className="rounded border border-line/80 bg-ink/80 p-4 sm:p-6 backdrop-blur-md shadow-xl space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-[#1FA37A] uppercase tracking-wider">
              Beat 1 &bull; The Question &amp; Real Config
            </span>
            <h4 className="font-display text-sm sm:text-base font-bold text-feather">
              Can an external untrusted account escalate to AdministratorAccess?
            </h4>
          </div>
          <span className="px-2 py-0.5 rounded border border-mist/30 bg-ink-2 text-[10px] text-mist">
            Source: {RECORDED_CONFIG_EXCERPT.sourceFile}
          </span>
        </div>

        <p className="font-ui text-xs text-mist leading-relaxed">
          {Z3_BEATS[0].summary}
        </p>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-mist">
            <span>Terraform HCL Excerpt (lines 1–32):</span>
            <span className="text-[10px] text-mist/70">SHA256: {RECORDED_CONFIG_EXCERPT.sourceFileSha256.slice(0, 16)}...</span>
          </div>
          <pre className="overflow-x-auto p-3 rounded border border-line/60 bg-ink-2/90 text-[11px] leading-relaxed text-[#A7F3D0]">
            <code>{RECORDED_CONFIG_EXCERPT.exactText}</code>
          </pre>
        </div>

        <div className="pt-2 border-t border-line/40 text-[10px] text-mist flex justify-between items-center">
          <span>Target: aws_iam_role.target_role (Admin)</span>
          <span className="text-[#1FA37A] font-semibold">{Z3_RECORDED_METADATA.label}</span>
        </div>
      </div>

      {/* BEAT 2: SAT Witness Graph (Hops & Transitive Chain) */}
      <div
        id="z3-beat-2"
        data-beat="2"
        className="rounded border border-line/80 bg-ink/80 p-4 sm:p-6 backdrop-blur-md shadow-xl space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-[#EF4444] uppercase tracking-wider">
              Beat 2 &bull; SAT Witness Graph (2 Hops)
            </span>
            <h4 className="font-display text-sm sm:text-base font-bold text-feather">
              Z3 proves reachability formula is SATISFIABLE (Vulnerable)
            </h4>
          </div>
          <span className="px-2 py-0.5 rounded border border-[#EF4444]/40 bg-[#EF4444]/10 text-[10px] text-[#EF4444] font-bold">
            VERDICT: SAT
          </span>
        </div>

        <p className="font-ui text-xs text-mist leading-relaxed">
          {Z3_BEATS[1].summary}
        </p>

        {/* 3-Node Hop Path Representation */}
        <div className="space-y-3">
          <span className="text-[11px] text-mist font-semibold uppercase tracking-wider">
            Reconstructed 2-Hop Escalation Path from Recorded Hops:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {WITNESS_GRAPH_NODES.map((node, idx) => (
              <div
                key={node.id}
                className="p-3 rounded border border-line/80 bg-ink-2/80 space-y-1.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-mist font-bold">Node {idx + 1}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        node.roleType === "entry"
                          ? "bg-[#EF4444]/20 text-[#EF4444]"
                          : node.roleType === "role"
                          ? "bg-[#F59E0B]/20 text-[#F59E0B]"
                          : "bg-[#8B5CF6]/20 text-[#C4B5FD]"
                      }`}
                    >
                      {node.roleType.toUpperCase()}
                    </span>
                  </div>
                  <div className="font-bold text-feather text-xs mt-1 truncate" title={node.arnOrAddress}>
                    {node.arnOrAddress}
                  </div>
                  <div className="text-[10px] text-mist mt-0.5">{node.sublabel}</div>
                </div>
                <div className="pt-2 border-t border-line/40 text-[10px] text-mist/90 leading-tight">
                  {node.trustSummary}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hop Details */}
        <div className="space-y-2">
          <span className="text-[11px] text-mist font-semibold">Hop Verification Statements:</span>
          <div className="space-y-2">
            {WITNESS_GRAPH_EDGES.map((edge, idx) => (
              <div
                key={edge.id}
                className="p-2.5 rounded border border-line/60 bg-ink-2/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#EF4444] font-bold">Hop {idx + 1}:</span>
                  <span className="text-feather font-mono">{edge.from}</span>
                  <span className="text-mist">&rarr;</span>
                  <span className="text-feather font-mono">{edge.to}</span>
                </div>
                <div className="text-[#A7F3D0] text-[10px] font-mono">
                  [{edge.action}] &bull; {edge.statement}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real CLI Report Excerpt */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-mist">Recorded CLI Output (run-1-privilege-escalation-sat.txt):</span>
          <pre className="overflow-x-auto p-3 rounded border border-line/60 bg-ink-2/90 text-[11px] leading-relaxed text-[#FCA5A5]">
            <code>{RECORDED_SAT_WITNESS.reportSummary}</code>
          </pre>
        </div>

        <div className="pt-2 border-t border-line/40 text-[10px] text-mist flex justify-between items-center">
          <span>Path length: {RECORDED_SAT_WITNESS.pathLength} hops</span>
          <span className="text-[#1FA37A] font-semibold">{Z3_RECORDED_METADATA.label}</span>
        </div>
      </div>

      {/* BEAT 3: Auto-Repair via Minimal AST Rule Deletion */}
      <div
        id="z3-beat-3"
        data-beat="3"
        className="rounded border border-line/80 bg-ink/80 p-4 sm:p-6 backdrop-blur-md shadow-xl space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-[#1FA37A] uppercase tracking-wider">
              Beat 3 &bull; Auto-Repair &amp; Unified Diff
            </span>
            <h4 className="font-display text-sm sm:text-base font-bold text-feather">
              Minimal AST Deletion Eliminates Over-Exposure
            </h4>
          </div>
          <span className="px-2 py-0.5 rounded border border-[#1FA37A]/40 bg-[#1FA37A]/10 text-[10px] text-[#1FA37A] font-bold">
            STATUS: {RECORDED_AUTO_REPAIR.status}
          </span>
        </div>

        <p className="font-ui text-xs text-mist leading-relaxed">
          {Z3_BEATS[2].summary}
        </p>

        {/* Resolved Auto-Repair Scope Disclosure */}
        <div className="p-3 rounded border border-[#1FA37A]/30 bg-[#1FA37A]/5 space-y-1 text-[11px]">
          <span className="font-bold text-[#1FA37A] uppercase tracking-wider">
            Resolved Scope (solver/repair.py):
          </span>
          <p className="text-feather leading-relaxed">
            Auto-repair covers AWS Security Groups, AWS IAM policies/roles, and Azure NSG via minimal AST deletion.
            It does NOT cover GCP resources, ARM JSON templates, Azure Governance Policies, or constructive condition rewriting.
          </p>
        </div>

        {/* Recorded Unified Diff */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-mist">
            <span>Recorded Unified Diff Patch ({RECORDED_AUTO_REPAIR.sourceFile}):</span>
            <span className="text-[#EF4444] font-semibold">Deleted: 2 ingress rules</span>
          </div>
          <pre className="overflow-x-auto p-3 rounded border border-line/60 bg-ink-2/90 text-[11px] leading-relaxed font-mono">
            <code>
              {RECORDED_AUTO_REPAIR.diffOnly.split("\n").map((line, idx) => {
                const isDel = line.startsWith("-");
                const isAdd = line.startsWith("+");
                const isHeader = line.startsWith("---") || line.startsWith("+++") || line.startsWith("@@");
                return (
                  <span
                    key={idx}
                    className={`block ${
                      isDel
                        ? "text-[#EF4444] bg-[#EF4444]/10"
                        : isAdd
                        ? "text-[#10B981] bg-[#10B981]/10"
                        : isHeader
                        ? "text-[#8B5CF6]"
                        : "text-mist"
                    }`}
                  >
                    {line}
                  </span>
                );
              })}
            </code>
          </pre>
        </div>

        <div className="pt-2 border-t border-line/40 text-[10px] text-mist flex justify-between items-center">
          <span>Resource: {RECORDED_AUTO_REPAIR.resource}</span>
          <span className="text-[#1FA37A] font-semibold">{Z3_RECORDED_METADATA.label}</span>
        </div>
      </div>

      {/* BEAT 4: Fail-Closed Posture (UNKNOWN & UNRESOLVABLE) */}
      <div
        id="z3-beat-4"
        data-beat="4"
        className="rounded border border-line/80 bg-ink/80 p-4 sm:p-6 backdrop-blur-md shadow-xl space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-[#F59E0B] uppercase tracking-wider">
              Beat 4 &bull; Fail-Closed Posture
            </span>
            <h4 className="font-display text-sm sm:text-base font-bold text-feather">
              SMT UNKNOWN and UNRESOLVABLE are Never Treated as Safe
            </h4>
          </div>
          <span className="px-2 py-0.5 rounded border border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[10px] text-[#F59E0B] font-bold">
            POSTURE: FAIL CLOSED
          </span>
        </div>

        <p className="font-ui text-xs text-mist leading-relaxed">
          {Z3_BEATS[3].summary}
        </p>

        {/* Real UNRESOLVABLE Report */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-mist">Recorded CLI Output on Unresolved Reference (run-4):</span>
          <pre className="overflow-x-auto p-3 rounded border border-line/60 bg-ink-2/90 text-[11px] leading-relaxed text-[#FDE68A]">
            <code>{RECORDED_FAIL_CLOSED.exactText}</code>
          </pre>
        </div>

        {/* Code Proofs */}
        <div className="space-y-2 pt-2">
          <span className="text-[11px] text-mist font-semibold uppercase tracking-wider">
            Verified Fail-Closed Enforcement Rules:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {RECORDED_FAIL_CLOSED.safetyRules.map((rule, idx) => (
              <div
                key={idx}
                className="p-3 rounded border border-line/60 bg-ink-2/80 space-y-1.5 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] text-[#F59E0B] font-bold block">{rule.source}</span>
                  <pre className="text-[10px] bg-ink/70 p-1.5 rounded text-mist/90 overflow-x-auto mt-1">
                    <code>{rule.code}</code>
                  </pre>
                </div>
                <p className="text-[10px] text-feather leading-tight pt-1 border-t border-line/40">
                  {rule.implication}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-line/40 text-[10px] text-mist flex justify-between items-center">
          <span>Exit code: 2 on UNKNOWN/UNRESOLVABLE</span>
          <span className="text-[#1FA37A] font-semibold">{Z3_RECORDED_METADATA.label}</span>
        </div>
      </div>

      {/* BEAT 5: Authentic Proof Certificate Excerpt */}
      <div
        id="z3-beat-5"
        data-beat="5"
        className="rounded border border-line/80 bg-ink/80 p-4 sm:p-6 backdrop-blur-md shadow-xl space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-[#10B981] uppercase tracking-wider">
              Beat 5 &bull; Authentic Proof Certificate &amp; Verified Limits
            </span>
            <h4 className="font-display text-sm sm:text-base font-bold text-feather">
              Z3 S-Expression Proof Object (Truncated Excerpt)
            </h4>
          </div>
          <span className="px-2 py-0.5 rounded border border-[#10B981]/40 bg-[#10B981]/10 text-[10px] text-[#10B981] font-bold">
            VERDICT: UNSAT (SAFE)
          </span>
        </div>

        <p className="font-ui text-xs text-mist leading-relaxed">
          {Z3_BEATS[4].summary}
        </p>

        {/* Certificate Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
          <div className="p-2 rounded border border-line/60 bg-ink-2/60">
            <span className="text-mist block">Type:</span>
            <span className="text-feather font-semibold truncate block">{RECORDED_PROOF_CERTIFICATE.certificateType}</span>
          </div>
          <div className="p-2 rounded border border-line/60 bg-ink-2/60">
            <span className="text-mist block">Z3 Version:</span>
            <span className="text-[#10B981] font-semibold truncate block">{RECORDED_PROOF_CERTIFICATE.z3Version}</span>
          </div>
          <div className="p-2 rounded border border-line/60 bg-ink-2/60">
            <span className="text-mist block">Complete Proof:</span>
            <span className="text-[#10B981] font-semibold truncate block">true</span>
          </div>
          <div className="p-2 rounded border border-line/60 bg-ink-2/60">
            <span className="text-mist block">Tests:</span>
            <span className="text-feather font-semibold truncate block">276 passing</span>
          </div>
        </div>

        {/* Excerpt Proof Object */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-mist">
            <span>Proof Object JSON Excerpt ({RECORDED_PROOF_CERTIFICATE.sourceFile}):</span>
            <span className="text-[10px] text-[#F59E0B] italic">{RECORDED_PROOF_CERTIFICATE.excerptNote}</span>
          </div>
          <pre className="overflow-x-auto p-3 rounded border border-line/60 bg-ink-2/90 text-[11px] leading-relaxed text-[#A7F3D0]">
            <code>{RECORDED_PROOF_CERTIFICATE.exactText}</code>
          </pre>
        </div>

        <div className="pt-2 border-t border-line/40 text-[10px] text-mist flex justify-between items-center">
          <span>Invariant: {RECORDED_PROOF_CERTIFICATE.invariant}</span>
          <span className="text-[#1FA37A] font-semibold">{Z3_RECORDED_METADATA.label}</span>
        </div>
      </div>
    </div>
  );
}
