"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useMode } from "@/lib/flags";
import {
  ALL_EDGE_CLOUD_NODES,
  CONSTELLATION_BG,
  PATH_A_D,
  PATH_C_D,
  LEDGER_DATA,
  PROJECT_LINKS,
} from "@/lib/worlds/edge-cloud-data";

// Static SVG Diagram for SSR, SEO, noscript, and reduced motion
export function EdgeCloudStaticDiagram() {
  return (
    <div
      className="relative w-full rounded-md border border-[#1b2a36] bg-gradient-to-b from-[#0b141d] to-[#0a1119] p-4 text-[#e8f1f5] shadow-2xl overflow-hidden select-none"
      role="img"
      aria-label="Edge-Cloud Static Star-Network Routing Diagram: shortest path in amber and carbon-aware path in teal"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2a36] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#5eead4]" />
          <span className="font-mono text-xs text-[#5eead4] tracking-wider uppercase font-semibold">
            [Constellation_Star_Network]
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#8aa0ad] border border-[#1b2a36] px-2.5 py-1 rounded">
          Illustrative diagram (Static accessible view)
        </span>
      </div>

      <div className="relative w-full overflow-x-auto">
        <div className="min-w-[600px] w-full">
          <svg
            viewBox="0 0 1000 560"
            role="img"
            aria-label="Routing diagram: high-carbon shortest path through coal-grid hub and gas relay, and greener path through solar, wind, and hydro nodes."
            className="w-full h-auto block"
          >
            <defs>
              <radialGradient id="static-hA">
                <stop offset="0%" stopColor="#d9a850" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#d9a850" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="static-hC">
                <stop offset="0%" stopColor="#5eead4" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#5eead4" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Constellation Stars and Lines */}
            <g opacity="0.4">
              {CONSTELLATION_BG.stars.map((star, i) => (
                <circle
                  key={`static-star-${i}`}
                  cx={star.cx}
                  cy={star.cy}
                  r={star.r}
                  fill="#7fa3b5"
                  opacity={star.opacity}
                />
              ))}
              {CONSTELLATION_BG.lines.map((ln, i) => (
                <line
                  key={`static-line-${i}`}
                  x1={ln.x1}
                  y1={ln.y1}
                  x2={ln.x2}
                  y2={ln.y2}
                  stroke="#2a4150"
                  opacity={0.5}
                />
              ))}
            </g>

            {/* Regional Glows */}
            <ellipse cx="450" cy="165" rx="270" ry="110" fill="url(#static-hA)" />
            <ellipse cx="540" cy="430" rx="300" ry="120" fill="url(#static-hC)" />

            {/* Shortest Path (Dim Amber, dashed) */}
            <path
              d={PATH_A_D}
              fill="none"
              stroke="#d9a850"
              strokeWidth={3}
              strokeDasharray="6 6"
              opacity="0.45"
            />

            {/* Greener Route (Cyan, solid) */}
            <path
              d={PATH_C_D}
              fill="none"
              stroke="#5eead4"
              strokeWidth={4}
              strokeLinecap="round"
            />

            {/* Nodes */}
            {ALL_EDGE_CLOUD_NODES.map((node) => {
              const isBig = node.id === "ingress" || node.id === "compute";
              const isAmber = node.category === "a";
              const col = isAmber ? "#d9a850" : "#5eead4";
              const isUpper = isAmber;
              const ty = isBig
                ? node.y + 52
                : isUpper
                ? node.y - 32
                : node.y + 36;

              return (
                <g key={`static-node-${node.id}`}>
                  {isBig && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={34}
                      fill={col}
                      opacity={0.14}
                    />
                  )}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isBig ? 20 : 13}
                    fill="#05080d"
                    stroke={col}
                    strokeWidth={2.5}
                  />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isBig ? 8 : 4.5}
                    fill={col}
                  />
                  <text
                    x={node.x}
                    y={ty}
                    textAnchor="middle"
                    className="font-sans text-[15px] font-medium fill-[#cfe0e8]"
                  >
                    {node.name}
                  </text>
                  {!isBig && (
                    <text
                      x={node.x}
                      y={ty + (isUpper ? -17 : 17)}
                      textAnchor="middle"
                      className="font-mono text-[11px] fill-[#8aa0ad]"
                    >
                      {node.kind}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#1b2a36] flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[#8aa0ad]">
        <span>Shortest path (amber) vs Greener path (cyan)</span>
        <span className="text-[#5eead4] font-semibold">
          PATH: GREENER ROUTE SELECTED (CARBON-AWARE)
        </span>
      </div>
    </div>
  );
}

// Lazy-loaded interactive star network mission view
const DynamicEdgeCloudNetwork = dynamic(
  () => import("./edge-cloud-network").then((mod) => mod.EdgeCloudNetwork),
  {
    ssr: false,
    loading: () => <EdgeCloudStaticDiagram />,
  }
);

export interface EdgeCloudWorldProps {
  className?: string;
}

export function EdgeCloudWorld({ className = "" }: EdgeCloudWorldProps) {
  const { reducedMotion } = useMode();
  const [scenarioCleared, setScenarioCleared] = useState(false);

  const handleScenarioClear = () => {
    setScenarioCleared(true);
  };

  return (
    <section
      id="edge-cloud"
      data-world="edge-cloud"
      className={`relative z-20 w-full min-h-screen py-20 sm:py-28 px-4 sm:px-6 bg-[radial-gradient(900px_400px_at_50%_0,#0e2a33,transparent_70%)] text-[#e8f1f5] ${className}`}
      aria-labelledby="edge-cloud-heading"
    >
      <div className="max-w-[1180px] mx-auto space-y-12 sm:space-y-16">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between border-b border-[#1b2a36] pb-4 font-mono text-xs">
          <div className="flex items-center gap-2 text-[#5eead4]">
            <span className="w-2 h-2 rounded-full bg-[#5eead4] animate-pulse" />
            <span className="uppercase tracking-widest">[ACT 3 &bull; WORLD: EDGE-CLOUD]</span>
          </div>
          <a
            href="#scenario-select"
            className="text-[#8aa0ad] hover:text-[#5eead4] transition-colors underline underline-offset-4 decoration-[#8aa0ad]/40 hover:decoration-[#5eead4]"
          >
            &uarr; Back to Scenario Select
          </a>
        </div>

        {/* Header & Scenario Introduction */}
        <div className="space-y-3">
          <div className="font-mono text-xs uppercase tracking-widest text-[#5eead4] font-medium">
            [Scenario 1: route the workload]
          </div>
          <h2
            id="edge-cloud-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-wide text-[#e8f1f5] drop-shadow-[0_0_28px_rgba(94,234,212,0.35)]"
          >
            Edge-Cloud Orchestrator
          </h2>
          <p className="font-sans text-base sm:text-lg text-[#8aa0ad] leading-relaxed max-w-2xl">
            One task, two possible routes. Watch the scheduler weigh them, then
            send the work where the energy is cleanest.
          </p>
        </div>

        {/* Interactive Mission View */}
        <div>
          {reducedMotion ? (
            <EdgeCloudStaticDiagram />
          ) : (
            <DynamicEdgeCloudNetwork onClearScenario={handleScenarioClear} />
          )}
        </div>

        {/* Ledger: What is Real */}
        <section className="space-y-4" aria-label="What is real">
          <div className="font-mono text-xs uppercase tracking-widest text-[#8aa0ad]">
            [SYSTEM LEDGER &bull; VERIFICATION]
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {LEDGER_DATA.map((cat) => {
              const headingCol =
                cat.badgeColor === "cyan"
                  ? "text-[#5eead4]"
                  : cat.badgeColor === "amber"
                  ? "text-[#d9a850]"
                  : "text-[#a78bfa]";

              const bulletBg =
                cat.badgeColor === "cyan"
                  ? "bg-[#5eead4]"
                  : cat.badgeColor === "amber"
                  ? "bg-[#d9a850]"
                  : "bg-[#a78bfa]";

              return (
                <div
                  key={cat.title}
                  className="rounded-md border border-[#1b2a36] bg-gradient-to-b from-[#0b141d] to-[#0a1119] p-5 shadow-lg"
                >
                  <h3
                    className={`font-mono text-xs font-semibold tracking-widest mb-3 ${headingCol}`}
                  >
                    {cat.title}
                  </h3>
                  <ul className="space-y-2.5 m-0 p-0 list-none text-sm leading-snug">
                    {cat.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-[#e8f1f5]">
                        <span
                          className={`w-2 h-2 rounded-[2px] mt-1.5 shrink-0 ${bulletBg}`}
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Project Links */}
        <nav
          className="flex flex-wrap items-center gap-3 pt-2"
          aria-label="Project links"
        >
          <a
            href={PROJECT_LINKS.repo}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded border border-[#1b2a36] text-xs sm:text-[13px] font-mono text-[#e8f1f5] hover:border-[#5eead4] hover:text-[#5eead4] transition-colors"
          >
            <span>SOURCE CODE</span>
            <span aria-hidden="true">&nearr;</span>
          </a>
          <a
            href={PROJECT_LINKS.architecture}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded border border-[#1b2a36] text-xs sm:text-[13px] font-mono text-[#e8f1f5] hover:border-[#5eead4] hover:text-[#5eead4] transition-colors"
          >
            <span>ARCHITECTURE</span>
            <span aria-hidden="true">&nearr;</span>
          </a>
          {PROJECT_LINKS.demo && (
            <a
              href={PROJECT_LINKS.demo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded border border-[#1b2a36] text-xs sm:text-[13px] font-mono text-[#e8f1f5] hover:border-[#5eead4] hover:text-[#5eead4] transition-colors"
            >
              <span>LIVE DEMO</span>
              <span aria-hidden="true">&nearr;</span>
            </a>
          )}
          {PROJECT_LINKS.benchmark && (
            <a
              href={PROJECT_LINKS.benchmark}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded border border-[#5eead4]/40 bg-[#5eead4]/10 text-xs sm:text-[13px] font-mono text-[#5eead4] hover:bg-[#5eead4]/20 transition-colors"
            >
              <span>BENCHMARK</span>
              <span aria-hidden="true">&nearr;</span>
            </a>
          )}
        </nav>

        {/* Exit Stamp: Scenario Cleared */}
        <div className="flex flex-col items-center justify-center text-center space-y-4 pt-6 border-t border-[#1b2a36]/60">
          <div
            className={`transition-all duration-500 transform ${
              scenarioCleared ? "scale-100 opacity-100" : "scale-95 opacity-80"
            }`}
          >
            <div className="inline-flex items-center gap-3 border-2 border-[#5eead4] bg-[#5eead4]/10 px-6 py-3 rounded-sm font-mono text-sm sm:text-base uppercase tracking-widest text-[#5eead4] font-bold shadow-[0_0_24px_rgba(94,234,212,0.2)]">
              <span className="text-lg sm:text-xl">&#10003;</span>
              <span>Scenario cleared</span>
            </div>
          </div>

          <div className="pt-2">
            <a
              href="#scenario-select"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded border border-[#5eead4]/40 bg-[#0d1a24] hover:bg-[#0b141d] text-[#5eead4] font-mono text-xs tracking-wider uppercase transition-colors"
            >
              &uarr; Return to Scenario Select
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default EdgeCloudWorld;
