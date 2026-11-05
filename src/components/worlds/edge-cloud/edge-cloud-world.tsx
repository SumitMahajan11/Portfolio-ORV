"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { projects } from "@/content/projects";
import { renderField } from "@/components/ui/fill-badge";
import { SystemWindow } from "@/components/system-window";
import { useMode } from "@/lib/flags";

// Static SVG Diagram for SSR, SEO, noscript, and reduced motion
export function EdgeCloudStaticDiagram() {
  return (
    <div
      className="relative w-full rounded border border-line/80 bg-ink/80 p-4 sm:p-6 backdrop-blur-md shadow-2xl overflow-hidden select-none"
      role="img"
      aria-label="Edge-Cloud Static Star-Network Routing Diagram"
    >
      <div className="flex items-center justify-between border-b border-line/60 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-star" />
          <span className="font-mono text-xs text-star tracking-widest uppercase font-semibold">
            [CONSTELLATION_STAR_NETWORK]
          </span>
        </div>
        <span className="font-mono text-[10px] sm:text-xs text-mist/80 uppercase px-2 py-0.5 border border-line bg-ink-2/60 rounded">
          illustrative routing diagram
        </span>
      </div>

      <div className="relative w-full aspect-[600/320] flex items-center justify-center">
        <svg
          viewBox="0 0 600 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full overflow-hidden"
        >
          {/* Ambient constellation stars */}
          <g opacity="0.3">
            <circle cx="110" cy="75" r="2" fill="#9AA7BD" />
            <circle cx="275" cy="50" r="2" fill="#9AA7BD" />
            <circle cx="420" cy="60" r="2" fill="#9AA7BD" />
            <circle cx="140" cy="280" r="2" fill="#9AA7BD" />
            <circle cx="270" cy="270" r="2" fill="#9AA7BD" />
            <circle cx="410" cy="270" r="2" fill="#9AA7BD" />
            <line x1="110" y1="75" x2="275" y2="50" stroke="#9AA7BD" strokeWidth="0.8" />
            <line x1="275" y1="50" x2="420" y2="60" stroke="#9AA7BD" strokeWidth="0.8" />
            <line x1="140" y1="280" x2="270" y2="270" stroke="#9AA7BD" strokeWidth="0.8" />
            <line x1="270" y1="270" x2="410" y2="270" stroke="#9AA7BD" strokeWidth="0.8" />
          </g>

          {/* Shortest Path (Dim Amber) */}
          <g>
            <path
              d="M 60 160 L 220 100 L 380 100 L 540 160"
              stroke="#D4B15F"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.65"
            />
            <circle cx="220" cy="100" r="4.5" fill="#0E1118" stroke="#D4B15F" strokeWidth="1.5" />
            <circle cx="380" cy="100" r="4.5" fill="#0E1118" stroke="#D4B15F" strokeWidth="1.5" />
            <text x="300" y="85" fill="#D4B15F" fontSize="10" fontFamily="monospace" textAnchor="middle" opacity="0.8">
              shortest path (higher carbon)
            </text>
          </g>

          {/* Greener Path (Teal-Green, selected) */}
          <g>
            <path
              d="M 60 160 L 180 220 L 320 250 L 440 210 L 540 160"
              stroke="#6EE7A8"
              strokeWidth="3"
            />
            <circle cx="180" cy="220" r="5" fill="#0E1118" stroke="#6EE7A8" strokeWidth="1.8" />
            <circle cx="320" cy="250" r="5" fill="#0E1118" stroke="#6EE7A8" strokeWidth="1.8" />
            <circle cx="440" cy="210" r="5" fill="#0E1118" stroke="#6EE7A8" strokeWidth="1.8" />
          </g>

          {/* Edge Ingress */}
          <circle cx="60" cy="160" r="9" fill="#0E1118" stroke="#5EE1E6" strokeWidth="2" />
          <circle cx="60" cy="160" r="3.5" fill="#5EE1E6" />
          <text x="60" y="195" fill="#5EE1E6" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            EDGE INGRESS
          </text>

          {/* Clean Compute Destination */}
          <circle cx="540" cy="160" r="10" fill="#0E1118" stroke="#6EE7A8" strokeWidth="2" />
          <circle cx="540" cy="160" r="4" fill="#6EE7A8" />
          <text x="540" y="195" fill="#6EE7A8" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            CLEAN COMPUTE
          </text>
        </svg>

        <div className="absolute bottom-6 inset-x-0 mx-auto w-fit px-3 py-1 bg-ink/95 border border-[#6EE7A8] rounded text-[#6EE7A8] font-mono text-xs tracking-wider uppercase">
          carbon-aware (selected)
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-line/40 flex items-center justify-between text-[11px] font-mono text-mist">
        <span>STAR NETWORK (STATIC ACCESSIBLE VIEW)</span>
        <span className="text-[#6EE7A8]">CARBON-AWARE PATH SELECTED</span>
      </div>
    </div>
  );
}

// Lazy-loaded interactive star network (ssr: false only for the canvas/animation)
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

/**
 * EdgeCloudWorld Component:
 * Phase 1 Flagship World Template: Edge-Cloud Orchestrator.
 *
 * Rules:
 * - Scoped via data-world="edge-cloud"
 * - Server-rendered text content for SEO & accessibility
 * - Dynamic client-only routing diagram with static fallback
 * - Star network with packet animation labeled "illustrative routing diagram"
 * - Zero numeric claims (qualitative only per /docs/03)
 * - Proof panel with repo/demo links and claims
 * - "Scenario cleared" stamp with Biyoo celebration hook
 * - Anchor id="edge-cloud" and return link
 */
export function EdgeCloudWorld({ className = "" }: EdgeCloudWorldProps) {
  const { reducedMotion } = useMode();
  const [scenarioCleared, setScenarioCleared] = useState(false);

  // Retrieve Edge-Cloud project data from content
  const project = projects.find((p) => p.id === "edge-cloud") || {
    id: "edge-cloud",
    title: "Edge-Cloud Orchestrator",
    status: "flagship",
    world: "edge-cloud",
    oneLiner: "carbon-aware workload routing across edge and cloud.",
    claims: [],
    limits: [],
    links: { repo: null, demo: null, benchmark: null },
    costume: "star goggles",
    worldReady: true,
  };

  const handleScenarioClear = () => {
    setScenarioCleared(true);
  };

  return (
    <section
      id="edge-cloud"
      data-world="edge-cloud"
      className={`relative z-20 w-full min-h-screen py-24 sm:py-32 px-4 sm:px-6 bg-[radial-gradient(ellipse_at_top,_rgba(10,17,40,0.85)_0%,_rgba(7,8,11,1)_75%)] text-feather ${className}`}
      aria-labelledby="edge-cloud-title"
    >
      <div className="max-w-5xl mx-auto space-y-16 sm:space-y-24">
        {/* Navigation & Breadcrumb */}
        <div className="flex items-center justify-between border-b border-line/60 pb-4 font-mono text-xs">
          <div className="flex items-center gap-2 text-star">
            <span className="w-2 h-2 rounded-full bg-star animate-pulse" />
            <span className="uppercase tracking-widest">[ACT 3 &bull; WORLD: EDGE-CLOUD]</span>
          </div>
          <a
            href="#scenario-select"
            className="text-mist hover:text-star transition-colors underline underline-offset-4 decoration-mist/40 hover:decoration-star"
          >
            &uarr; Back to Scenario Select
          </a>
        </div>

        {/* Beat 1: Scenario Card "Scenario: Route the Workload" */}
        <div className="max-w-2xl mx-auto">
          <SystemWindow title="SYSTEM PROMPT: SCENARIO ASSIGNMENT">
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <span className="font-mono text-xs text-[#6EE7A8] uppercase tracking-widest font-semibold">
                  [SCENARIO 1: ROUTE THE WORKLOAD]
                </span>
                <h2
                  id="edge-cloud-title"
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

        {/* Beats 2 & 3: Star Network Routing Visualization */}
        <div className="space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h3 className="font-display text-lg sm:text-xl font-bold text-feather">
              Star-Network Routing Engine
            </h3>
            <p className="font-mono text-xs text-mist">
              Observe packet evaluation between the shortest distance route and the cleaner, carbon-aware star path.
            </p>
          </div>

          {/* Conditional Progressive Enhancement: Static on reduced motion or initial SSR */}
          {reducedMotion ? (
            <EdgeCloudStaticDiagram />
          ) : (
            <DynamicEdgeCloudNetwork onClearScenario={handleScenarioClear} />
          )}
        </div>

        {/* Beat 4: Proof Panel (Verification) */}
        <div className="max-w-2xl mx-auto w-full">
          <SystemWindow title="[READER'S RECORD &bull; VERIFICATION]">
            <div className="space-y-5 py-2">
              {/* Claims / Findings */}
              <div className="space-y-2">
                <span className="font-mono text-[11px] text-mist uppercase tracking-wider">
                  VERIFIED CLAIMS:
                </span>
                {project.claims && project.claims.length > 0 ? (
                  <ul className="space-y-2 font-mono text-xs text-feather">
                    {project.claims.map((claim, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-star">&bull;</span>
                        <span>{claim.text}</span>
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
                      className="text-star hover:text-feather underline transition-colors"
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
                      className="text-star hover:text-feather underline transition-colors"
                    >
                      {url}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </SystemWindow>
        </div>

        {/* Beat 5: Exit Stamp "Scenario cleared" */}
        <div className="flex flex-col items-center justify-center text-center space-y-4 pt-6">
          <div
            className={`transition-all duration-500 transform ${
              scenarioCleared ? "scale-100 opacity-100" : "scale-95 opacity-80"
            }`}
          >
            <div className="inline-flex items-center gap-3 border-2 border-[#6EE7A8] bg-[#6EE7A8]/10 px-6 py-3 rounded-sm font-mono text-sm sm:text-base uppercase tracking-widest text-[#6EE7A8] font-bold shadow-[0_0_24px_rgba(110,231,168,0.2)]">
              <span className="text-lg sm:text-xl">&#10003;</span>
              <span>Scenario cleared</span>
            </div>
          </div>

          <div className="pt-6">
            <a
              href="#scenario-select"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded border border-star/40 bg-ink-2/60 hover:bg-ink text-star font-mono text-xs tracking-wider uppercase transition-colors"
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
