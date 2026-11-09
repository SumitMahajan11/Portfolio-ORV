"use client";

import React, { useState } from "react";
import {
  Z3_RECORDED_METADATA,
  Z3_TEST_SUITE,
  RECORDED_CONFIG_EXCERPT,
  RECORDED_SAT_WITNESS,
  RECORDED_AUTO_REPAIR,
  RECORDED_FAIL_CLOSED,
  RECORDED_PROOF_CERTIFICATE,
  Z3_BEATS,
  WITNESS_GRAPH_NODES,
  WITNESS_GRAPH_EDGES,
} from "@/lib/worlds/z3-viz";

export interface Z3VizCanvasProps {
  onClearScenario?: () => void;
}

export function Z3VizCanvas({ onClearScenario }: Z3VizCanvasProps) {
  const [activeBeat, setActiveBeat] = useState(1);
  const [activeHop, setActiveHop] = useState<number>(0); // 0 = all hops, 1 = hop 1, 2 = hop 2
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleBeatChange = (beatNumber: number) => {
    setActiveBeat(beatNumber);
    if (beatNumber === 5) {
      onClearScenario?.();
    }
  };

  const nextBeat = () => {
    if (activeBeat < 5) {
      handleBeatChange(activeBeat + 1);
    }
  };

  const prevBeat = () => {
    if (activeBeat > 1) {
      handleBeatChange(activeBeat - 1);
    }
  };

  const currentBeatInfo = Z3_BEATS[activeBeat - 1];

  return (
    <div
      className="relative w-full rounded border border-line/80 bg-ink/90 p-4 sm:p-6 backdrop-blur-md shadow-2xl space-y-6 select-none font-mono text-xs"
      role="region"
      aria-label="Interactive Z3 SMT Verification Visualizer"
    >
      {/* Top Banner & Mandatory Real Run Provenance Label */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#1FA37A] animate-pulse" />
          <span className="font-mono text-xs text-[#1FA37A] tracking-widest uppercase font-semibold">
            [Z3_SMT_ENGINE &bull; 5_BEATS_INTERACTIVE]
          </span>
        </div>

        <div className="px-2.5 py-1 rounded border border-[#1FA37A]/40 bg-[#1FA37A]/10 text-[#1FA37A] font-mono text-[10px] sm:text-xs uppercase tracking-wider font-semibold">
          {Z3_RECORDED_METADATA.label}
        </div>
      </div>

      {/* Honest Browser Framing */}
      <div className="p-2.5 rounded bg-ink-2/60 border border-line/40 text-[11px] text-mist">
        <span className="italic">{Z3_RECORDED_METADATA.browserHonesty}</span>
      </div>

      {/* Stepper / Beat Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-b border-line/60 pb-4">
        {Z3_BEATS.map((beat) => {
          const isActive = activeBeat === beat.beat;
          return (
            <button
              key={beat.beat}
              type="button"
              onClick={() => handleBeatChange(beat.beat)}
              className={`p-2.5 rounded text-left transition-all cursor-pointer border ${
                isActive
                  ? "border-[#1FA37A] bg-[#1FA37A]/15 text-feather shadow-[0_0_12px_rgba(31,163,122,0.2)]"
                  : "border-line/40 bg-ink-2/40 text-mist hover:text-feather hover:border-line"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span>BEAT {beat.beat}</span>
                <span
                  className="px-1.5 py-0.2 rounded text-[9px]"
                  style={{
                    backgroundColor: `${beat.verdictColor}22`,
                    color: beat.verdictColor,
                  }}
                >
                  {beat.verdictLabel.split(" ")[0]}
                </span>
              </div>
              <div className="text-[11px] font-semibold mt-1 truncate">{beat.title.replace(/^\d+\.\s*/, "")}</div>
            </button>
          );
        })}
      </div>

      {/* Active Beat Content */}
      <div className="space-y-4 min-h-[360px]">
        {/* Beat Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
              style={{
                borderColor: `${currentBeatInfo.verdictColor}66`,
                backgroundColor: `${currentBeatInfo.verdictColor}15`,
                color: currentBeatInfo.verdictColor,
              }}
            >
              {currentBeatInfo.verdictLabel}
            </span>
            <h4 className="font-display text-base sm:text-lg font-bold text-feather mt-1">
              {currentBeatInfo.title}
            </h4>
            <p className="text-mist text-xs font-ui mt-0.5">{currentBeatInfo.subtitle}</p>
          </div>
          <span className="text-[10px] text-mist/70 border border-line/40 px-2 py-1 rounded bg-ink-2/40">
            Source: {currentBeatInfo.sourceRef}
          </span>
        </div>

        {/* BEAT 1 VIEW: Real Config Excerpt */}
        {activeBeat === 1 && (
          <div className="space-y-4">
            <p className="font-ui text-xs text-mist leading-relaxed">
              {Z3_BEATS[0].summary}
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-mist">
                <span>Terraform HCL Excerpt (chained_escalation.tf:1-32):</span>
                <span className="text-[10px] text-[#1FA37A]">SHA256: {RECORDED_CONFIG_EXCERPT.sourceFileSha256.slice(0, 16)}...</span>
              </div>
              <pre className="overflow-x-auto p-3.5 rounded border border-line/60 bg-ink-2/90 text-[11px] leading-relaxed text-[#A7F3D0] max-h-72">
                <code>{RECORDED_CONFIG_EXCERPT.exactText}</code>
              </pre>
            </div>
            <div className="p-3 rounded border border-line/60 bg-ink-2/40 text-mist text-[11px]">
              <strong className="text-feather">Target Invariant:</strong> Verify whether external untrusted AWS root accounts can transitively assume <code className="text-[#A7F3D0]">aws_iam_role.target_role</code>, which attaches full <code className="text-[#EF4444]">Action: &quot;*&quot;</code> permissions.
            </div>
          </div>
        )}

        {/* BEAT 2 VIEW: SAT Witness Graph with Hop-by-Hop Highlight */}
        {activeBeat === 2 && (
          <div className="space-y-4">
            <p className="font-ui text-xs text-mist leading-relaxed">
              {Z3_BEATS[1].summary}
            </p>

            {/* Interactive Hop Selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-mist font-semibold">Path Highlight:</span>
              <button
                type="button"
                onClick={() => {
                  setActiveHop(0);
                  setSelectedNodeId(null);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer border transition-colors ${
                  activeHop === 0
                    ? "bg-[#1FA37A]/20 border-[#1FA37A] text-[#1FA37A]"
                    : "bg-ink-2/60 border-line/60 text-mist hover:text-feather"
                }`}
              >
                Complete Path (2 Hops)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveHop(1);
                  setSelectedNodeId(null);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer border transition-colors ${
                  activeHop === 1
                    ? "bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444]"
                    : "bg-ink-2/60 border-line/60 text-mist hover:text-feather"
                }`}
              >
                Hop 1 (External &rarr; Jump)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveHop(2);
                  setSelectedNodeId(null);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer border transition-colors ${
                  activeHop === 2
                    ? "bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]"
                    : "bg-ink-2/60 border-line/60 text-mist hover:text-feather"
                }`}
              >
                Hop 2 (Jump &rarr; Target)
              </button>
            </div>

            {/* Visual Graph Canvas / Representation */}
            <div className="p-4 sm:p-6 rounded border border-line/80 bg-ink-2/50 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                {WITNESS_GRAPH_NODES.map((node, idx) => {
                  const isNodeActive =
                    activeHop === 0 ||
                    (activeHop === 1 && (idx === 0 || idx === 1)) ||
                    (activeHop === 2 && (idx === 1 || idx === 2)) ||
                    selectedNodeId === node.id;

                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`p-3.5 rounded border transition-all cursor-pointer space-y-2 ${
                        isNodeActive
                          ? "border-[#EF4444] bg-[#EF4444]/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                          : "border-line/60 bg-ink/70 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-mist">Node {idx + 1}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded font-bold ${
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
                      <div className="font-bold text-feather text-xs truncate" title={node.arnOrAddress}>
                        {node.arnOrAddress}
                      </div>
                      <div className="text-[10px] text-mist">{node.sublabel}</div>
                      <div className="pt-2 border-t border-line/40 text-[10px] text-mist/90 leading-tight">
                        {node.trustSummary}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recorded Hop Statements */}
              <div className="space-y-2 pt-2 border-t border-line/40">
                {WITNESS_GRAPH_EDGES.map((edge, idx) => {
                  const isEdgeActive = activeHop === 0 || activeHop === idx + 1;
                  return (
                    <div
                      key={edge.id}
                      className={`p-3 rounded border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] ${
                        isEdgeActive
                          ? "border-[#EF4444]/60 bg-[#EF4444]/10 text-feather"
                          : "border-line/40 bg-ink-2/30 text-mist opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[#EF4444] font-bold">Hop {idx + 1}:</span>
                        <span className="font-mono text-feather">{edge.from}</span>
                        <span className="text-mist">&rarr;</span>
                        <span className="font-mono text-feather">{edge.to}</span>
                      </div>
                      <div className="text-[#A7F3D0] text-[10px] font-mono">
                        [{edge.action}] &bull; {edge.statement}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Real CLI Verification Report Output */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-mist font-semibold">
                Recorded SAT Output ({RECORDED_SAT_WITNESS.sourceFile}):
              </span>
              <pre className="overflow-x-auto p-3 rounded border border-line/60 bg-ink-2/90 text-[11px] leading-relaxed text-[#FCA5A5]">
                <code>{RECORDED_SAT_WITNESS.reportSummary}</code>
              </pre>
            </div>
          </div>
        )}

        {/* BEAT 3 VIEW: Auto-Repair via Minimal AST Deletion */}
        {activeBeat === 3 && (
          <div className="space-y-4">
            <p className="font-ui text-xs text-mist leading-relaxed">
              {Z3_BEATS[2].summary}
            </p>

            <div className="p-3 rounded border border-[#1FA37A]/30 bg-[#1FA37A]/5 space-y-1 text-[11px]">
              <span className="font-bold text-[#1FA37A] uppercase tracking-wider">
                Resolved Scope (solver/repair.py):
              </span>
              <p className="text-feather leading-relaxed">
                Auto-repair covers AWS Security Groups, AWS IAM policies/roles, and Azure NSG via minimal AST deletion.
                It does NOT cover GCP resources, ARM JSON templates, Azure Governance Policies, or constructive condition rewriting.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-mist">
                <span>Recorded Unified Diff Patch ({RECORDED_AUTO_REPAIR.sourceFile}):</span>
                <span className="text-[#EF4444] font-semibold">Deleted: 2 ingress rules simultaneously</span>
              </div>
              <pre className="overflow-x-auto p-3.5 rounded border border-line/60 bg-ink-2/90 text-[11px] leading-relaxed font-mono">
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

            <div className="p-3 rounded border border-line/60 bg-ink-2/40 text-[11px] text-mist">
              <strong className="text-feather">Minimal Subset Property:</strong> Deleting either index 0 or index 1 alone leaves port 22 open to <code className="text-[#A7F3D0]">0.0.0.0/0</code>. Z3 calculates that the minimal cardinality subset required to reach UNSAT is the simultaneous deletion of both AST blocks.
            </div>
          </div>
        )}

        {/* BEAT 4 VIEW: Fail-Closed Posture */}
        {activeBeat === 4 && (
          <div className="space-y-4">
            <p className="font-ui text-xs text-mist leading-relaxed">
              {Z3_BEATS[3].summary}
            </p>

            <div className="space-y-1.5">
              <span className="text-[11px] text-mist font-semibold">
                Recorded UNRESOLVABLE Output on Dynamic Reference ({RECORDED_FAIL_CLOSED.sourceFile}):
              </span>
              <pre className="overflow-x-auto p-3.5 rounded border border-line/60 bg-ink-2/90 text-[11px] leading-relaxed text-[#FDE68A]">
                <code>{RECORDED_FAIL_CLOSED.exactText}</code>
              </pre>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {RECORDED_FAIL_CLOSED.safetyRules.map((rule, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded border border-line/60 bg-ink-2/80 space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] text-[#F59E0B] font-bold block">{rule.source}</span>
                    <pre className="text-[10px] bg-ink/80 p-2 rounded text-mist/90 overflow-x-auto mt-1 font-mono">
                      <code>{rule.code}</code>
                    </pre>
                  </div>
                  <p className="text-[11px] text-feather leading-tight pt-2 border-t border-line/40">
                    {rule.implication}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BEAT 5 VIEW: Authentic Proof Certificate Excerpt */}
        {activeBeat === 5 && (
          <div className="space-y-4">
            <p className="font-ui text-xs text-mist leading-relaxed">
              {Z3_BEATS[4].summary}
            </p>

            {/* Certificate Metadata */}
            <div data-testid="z3-certificate-card" className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono">
              <div className="p-2.5 rounded border border-line/60 bg-ink-2/60">
                <span className="text-mist block">Type:</span>
                <span className="text-feather font-semibold truncate block">{RECORDED_PROOF_CERTIFICATE.certificateType}</span>
              </div>
              <div className="p-2.5 rounded border border-line/60 bg-ink-2/60">
                <span className="text-mist block">Z3 Version:</span>
                <span className="text-[#10B981] font-semibold truncate block">{RECORDED_PROOF_CERTIFICATE.z3Version}</span>
              </div>
              <div className="p-2.5 rounded border border-line/60 bg-ink-2/60">
                <span className="text-mist block">Complete Proof:</span>
                <span className="text-[#10B981] font-semibold truncate block">true</span>
              </div>
            </div>

            {/* Test Suite Line outside Certificate Card */}
            <div className="text-[11px] font-mono text-mist">
              {Z3_TEST_SUITE.line}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-mist">
                <span>Proof Object JSON Excerpt ({RECORDED_PROOF_CERTIFICATE.sourceFile}):</span>
                <span className="text-[10px] text-[#F59E0B] italic">{RECORDED_PROOF_CERTIFICATE.excerptNote}</span>
              </div>
              <pre className="overflow-x-auto p-3.5 rounded border border-line/60 bg-ink-2/90 text-[11px] leading-relaxed text-[#A7F3D0] max-h-72">
                <code>{RECORDED_PROOF_CERTIFICATE.exactText}</code>
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Stepper Footer Controls */}
      <div className="flex items-center justify-between border-t border-line/60 pt-4">
        <button
          type="button"
          onClick={prevBeat}
          disabled={activeBeat === 1}
          className={`px-3 py-1.5 rounded border font-mono text-xs cursor-pointer transition-colors ${
            activeBeat === 1
              ? "border-line/30 text-mist/40 cursor-not-allowed"
              : "border-line/60 text-mist hover:text-feather hover:border-line"
          }`}
        >
          &larr; Previous Beat
        </button>

        <span className="text-mist text-[11px] font-mono">
          Beat {activeBeat} of 5
        </span>

        <button
          type="button"
          onClick={nextBeat}
          disabled={activeBeat === 5}
          className={`px-3 py-1.5 rounded border font-mono text-xs cursor-pointer transition-colors ${
            activeBeat === 5
              ? "border-line/30 text-mist/40 cursor-not-allowed"
              : "border-[#1FA37A] bg-[#1FA37A]/15 text-[#1FA37A] hover:bg-[#1FA37A]/25"
          }`}
        >
          Next Beat &rarr;
        </button>
      </div>

      {/* Persistent Scene Label */}
      <div className="pt-2 border-t border-line/40 text-[10px] text-mist flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <span>Commit: {Z3_RECORDED_METADATA.commit}</span>
        <span className="text-[#1FA37A] font-semibold">{Z3_RECORDED_METADATA.label}</span>
      </div>
    </div>
  );
}
