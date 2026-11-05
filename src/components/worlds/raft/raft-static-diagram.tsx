"use client";

import React from "react";
import { RAFT_SCENARIO_STEPS } from "@/lib/worlds/raft-viz";

/**
 * NodeIcon Component:
 * Renders an accessible SVG circle representation of a ninja node with simple expressions
 * and leaf headband / role aura.
 * (Placeholder art complying strictly with CLAUDE.md Rule 8 - original shapes only).
 */
export function NinjaNodeSvg({
  name,
  role,
  expression,
  term,
  isMinority = false,
}: {
  name: string;
  role: "leader" | "candidate" | "follower" | "crashed";
  expression: "calm" | "determined" | "alert" | "fallen" | "attentive";
  term: number;
  isMinority?: boolean;
}) {
  const isLeader = role === "leader";
  const isCrashed = role === "crashed";
  const isCandidate = role === "candidate";

  // Palette: #F28C28 (Hokage orange), #3E8E41 (Leaf green), #F1E4C3 (parchment), #9AA7BD (mist)
  const borderColor = isCrashed
    ? "#4A5568"
    : isLeader
    ? "#F28C28"
    : isCandidate
    ? "#D4B15F"
    : "#3E8E41";

  const glowBg = isLeader
    ? "rgba(242, 140, 40, 0.15)"
    : isCandidate
    ? "rgba(212, 177, 95, 0.12)"
    : "rgba(14, 17, 24, 0.85)";

  return (
    <div className="flex flex-col items-center text-center space-y-1.5">
      <div
        className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center border-2 transition-all"
        style={{
          borderColor,
          backgroundColor: glowBg,
          boxShadow: isLeader ? "0 0 16px rgba(242, 140, 40, 0.3)" : "none",
          opacity: isCrashed ? 0.45 : 1,
        }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-14 h-14 sm:w-16 sm:h-16 overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ninja Headband Strip */}
          <path
            d="M 18 36 C 38 28, 62 28, 82 36"
            stroke="#3E8E41"
            strokeWidth="9"
            strokeLinecap="round"
          />
          {/* Metal plate */}
          <rect
            x="36"
            y="26"
            width="28"
            height="14"
            rx="3"
            fill="#CCD5E4"
            stroke="#243044"
            strokeWidth="1.2"
          />
          {/* Tiny leaf spiral placeholder emblem */}
          <circle cx="50" cy="33" r="3.5" fill="none" stroke="#243044" strokeWidth="1.2" />
          <path d="M 50 33 Q 53 30 54 33" stroke="#243044" strokeWidth="1" fill="none" />

          {/* Simple Facial Expressions */}
          {expression === "fallen" ? (
            // Knocked out X_X eyes
            <g stroke="#9AA7BD" strokeWidth="2.5" strokeLinecap="round">
              <line x1="32" y1="56" x2="42" y2="66" />
              <line x1="42" y1="56" x2="32" y2="66" />
              <line x1="58" y1="56" x2="68" y2="66" />
              <line x1="68" y1="56" x2="58" y2="66" />
              {/* Drooped mouth */}
              <path d="M 45 78 Q 50 74 55 78" fill="none" />
            </g>
          ) : expression === "calm" ? (
            // Leader calm confident eyes (closed smile)
            <g stroke="#F4F6FA" strokeWidth="2" strokeLinecap="round" fill="none">
              <path d="M 32 60 Q 37 54 42 60" />
              <path d="M 58 60 Q 63 54 68 60" />
              {/* Confident smile */}
              <path d="M 44 74 Q 50 80 56 74" />
            </g>
          ) : expression === "alert" ? (
            // Alert wide eyes
            <g fill="#F4F6FA">
              <circle cx="37" cy="58" r="4" />
              <circle cx="63" cy="58" r="4" />
              <ellipse cx="50" cy="74" rx="3" ry="4" fill="#F4F6FA" />
            </g>
          ) : (
            // Attentive follower eyes
            <g fill="#F4F6FA">
              <circle cx="37" cy="60" r="3" />
              <circle cx="63" cy="60" r="3" />
              <line
                x1="45"
                y1="75"
                x2="55"
                y2="75"
                stroke="#F4F6FA"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </g>
          )}
        </svg>

        {/* Hokage Crown Badge for Leader */}
        {isLeader && (
          <span
            className="absolute -top-3 px-1.5 py-0.2 bg-[#F28C28] text-void font-mono text-[9px] font-bold rounded-sm tracking-wider uppercase shadow-md"
            title="Hokage (Leader)"
          >
            HOKAGE
          </span>
        )}

        {/* Minority tag */}
        {isMinority && (
          <span className="absolute -bottom-2.5 px-1 py-0.2 bg-void/90 border border-line text-mist font-mono text-[8px] uppercase">
            Minority
          </span>
        )}
      </div>

      <div className="space-y-0.5">
        <div className="font-mono text-xs font-semibold text-feather">{name}</div>
        <div className="font-mono text-[10px] text-mist/90 uppercase">
          {role} &bull; T{term}
        </div>
      </div>
    </div>
  );
}

/**
 * RaftStaticDiagram:
 * 5-frame static step-by-step diagram with captions.
 * Fulfills P2-1 Requirement 7 for reduced-motion and light mode fallbacks.
 */
export function RaftStaticDiagram() {
  return (
    <div
      className="relative w-full rounded border border-line/80 bg-ink/80 p-4 sm:p-6 backdrop-blur-md shadow-2xl space-y-6 select-none"
      role="region"
      aria-label="Deterministic 5-Step Raft Visualizer (Static Accessible View)"
    >
      {/* Header with Mandatory Clarity Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#F28C28] animate-pulse" />
          <span className="font-mono text-xs text-[#F28C28] tracking-widest uppercase font-semibold">
            [VILLAGE_OF_3_NODES &bull; STATIC_SEQUENCE]
          </span>
        </div>
        <div className="px-2.5 py-1 rounded border border-[#F28C28]/40 bg-[#F28C28]/10 text-[#F28C28] font-mono text-[10px] sm:text-xs uppercase tracking-wider font-semibold">
          illustrative visualization, not the Ratify code
        </div>
      </div>

      {/* 5 Captioned Frames */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {RAFT_SCENARIO_STEPS.map((step, idx) => {
          return (
            <article
              key={step.id}
              className="flex flex-col justify-between rounded border border-line/60 bg-ink-2/60 p-3.5 space-y-4 hover:border-[#F28C28]/50 transition-colors"
            >
              {/* Frame Title & Term */}
              <div className="space-y-1 border-b border-line/40 pb-2">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#F28C28] font-semibold">
                    FRAME {idx + 1}/5
                  </span>
                  <span className="text-mist uppercase">Term {step.term}</span>
                </div>
                <h4 className="font-display text-xs font-bold text-feather leading-tight">
                  {step.beatTitle}
                </h4>
              </div>

              {/* Node Village Representation */}
              <div className="relative py-2 flex flex-col items-center justify-center space-y-2 min-h-[140px]">
                {/* Partition Wall visual for Frame 4 (stepIndex: 3) */}
                {step.partitionActive && (
                  <div className="absolute inset-y-0 left-1/3 w-[2px] bg-red-500/70 border-l border-dashed border-red-400 z-10">
                    <span className="absolute top-1 -left-12 font-mono text-[8px] text-red-400 bg-ink px-1 rounded border border-red-500/40 uppercase whitespace-nowrap">
                      Partition Wall
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-around w-full">
                  {step.nodes.map((node) => (
                    <NinjaNodeSvg
                      key={node.id}
                      name={node.name}
                      role={node.role}
                      expression={node.expression}
                      term={node.currentTerm}
                      isMinority={step.partitionActive && node.partition === "A"}
                    />
                  ))}
                </div>

                {/* Flares / Scrolls Summary */}
                <div className="w-full pt-2 flex items-center justify-center gap-1.5 flex-wrap">
                  {step.flares.length > 0 ? (
                    step.flares.map((flare) => (
                      <span
                        key={flare.id}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#F28C28]/40 bg-[#F28C28]/10 text-[#F28C28] font-mono text-[9px]"
                      >
                        <span className="text-[10px]">&bull;</span>
                        <span>{flare.label}</span>
                      </span>
                    ))
                  ) : (
                    <span className="font-mono text-[9px] text-mist italic">
                      [Silence / Heartbeat Timed Out]
                    </span>
                  )}
                </div>
              </div>

              {/* Caption & Rule Details */}
              <div className="pt-2 border-t border-line/40 space-y-1.5 font-mono text-[11px] leading-relaxed text-mist">
                <p className="text-feather/90">{step.caption}</p>
                <p className="text-[10px] text-mist italic">{step.details}</p>
              </div>
            </article>
          );
        })}
      </div>

      {/* Footer Legend */}
      <div className="pt-3 border-t border-line/40 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-mist">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#F28C28]" />
            <span>Leader (Hokage)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#3E8E41]" />
            <span>Follower</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <span>Partition Barrier</span>
          </span>
        </div>
        <div className="text-[#F28C28]">
          INVARIANTS (A-F) DETERMINISTICALLY ASSERTED
        </div>
      </div>
    </div>
  );
}

export default RaftStaticDiagram;

