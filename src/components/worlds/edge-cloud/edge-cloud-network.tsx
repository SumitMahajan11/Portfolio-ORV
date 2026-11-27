"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useMode } from "@/lib/flags";
import {
  ALL_EDGE_CLOUD_NODES,
  CONSTELLATION_BG,
  PATH_A_D,
  PATH_C_D,
  PIPELINE_STEPS,
  TIMING_THRESHOLDS,
  TOTAL_CYCLE_MS,
  TRAVEL_WINDOW,
  BASE_STEP_LOGS,
  type EdgeCloudNode,
  type LogLine,
} from "@/lib/worlds/edge-cloud-data";

export interface EdgeCloudNetworkProps {
  className?: string;
  onClearScenario?: () => void;
}

function easeInOutQuad(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

export function EdgeCloudNetwork({
  className = "",
  onClearScenario,
}: EdgeCloudNetworkProps) {
  const { reducedMotion } = useMode();

  // Route mode: true = carbon-aware (Route C wins), false = shortest path (Route A wins)
  const [carbonAware, setCarbonAware] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState<LogLine[]>([
    { text: BASE_STEP_LOGS[0] },
  ]);

  // Interactive tooltip state
  const [activeTooltip, setActiveTooltip] = useState<{
    node: EdgeCloudNode;
    lx: number;
    ly: number;
  } | null>(null);

  // SVG & DOM refs
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathARef = useRef<SVGPathElement>(null);
  const pathCRef = useRef<SVGPathElement>(null);
  const cometRef = useRef<SVGCircleElement>(null);
  const trailRefs = useRef<(SVGCircleElement | null)[]>([]);

  // Animation timeline refs
  const t0Ref = useRef<number>(0);
  const curStepRef = useRef<number>(-1);
  const carbonAwareRef = useRef(carbonAware);
  const clearedTriggeredRef = useRef(false);

  useEffect(() => {
    carbonAwareRef.current = carbonAware;
  }, [carbonAware]);

  // Biyoo costume hook: star goggles
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("biyoo:costume", {
          detail: { costume: "star goggles" },
        })
      );
    }
    return () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("biyoo:costume", {
            detail: { costume: null },
          })
        );
      }
    };
  }, []);

  // Update step and execution logs
  const advanceStep = useCallback((step: number, isGreen: boolean) => {
    if (step === curStepRef.current) return;

    curStepRef.current = step;
    setCurrentStep(step);

    if (step === 0 || step < curStepRef.current) {
      setLogs([{ text: BASE_STEP_LOGS[0] }]);
    } else {
      const nextLogs: LogLine[] = [];
      for (let i = 0; i <= step; i++) {
        if (i === 2) {
          nextLogs.push({
            text: isGreen
              ? `Carbon-aware ON: ${BASE_STEP_LOGS[2]}`
              : `Carbon-aware OFF: ${BASE_STEP_LOGS[2]}`,
          });
          nextLogs.push({
            text: isGreen
              ? "Selected: greener route, slightly longer."
              : "Selected: shortest route, carbon ignored.",
            isAmber: !isGreen,
          });
        } else {
          nextLogs.push({ text: BASE_STEP_LOGS[i] });
        }
      }
      setLogs(nextLogs);
    }

    if (step === 5 && !clearedTriggeredRef.current) {
      clearedTriggeredRef.current = true;
      onClearScenario?.();
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("biyoo:action", {
            detail: { state: "proud", line: "Evidence found." },
          })
        );
      }
    }
  }, [onClearScenario]);

  // Main animation frame handler
  useEffect(() => {
    if (reducedMotion) {
      advanceStep(5, carbonAware);
      return;
    }

    t0Ref.current = performance.now();
    curStepRef.current = -1;
    let animId: number;

    const tick = (now: number) => {
      const isGreen = carbonAwareRef.current;
      const elapsed = (now - t0Ref.current) % TOTAL_CYCLE_MS;

      // Determine current pipeline step
      let s = 0;
      for (let i = 0; i < 6; i++) {
        if (elapsed >= TIMING_THRESHOLDS[i]) s = i;
      }
      if (s === 3 && elapsed > (TRAVEL_WINDOW[0] + TRAVEL_WINDOW[1]) / 2) {
        s = 4;
      }
      advanceStep(s, isGreen);

      // Path opacity & packet travel along active curve
      const activePath = isGreen ? pathCRef.current : pathARef.current;
      const otherPath = isGreen ? pathARef.current : pathCRef.current;
      const comet = cometRef.current;

      if (activePath && otherPath && comet) {
        const totalLen = activePath.getTotalLength();
        let p = 0;

        if (elapsed < TIMING_THRESHOLDS[2]) {
          p = 0;
          activePath.style.opacity = "0.55";
          otherPath.style.opacity = "0.55";
        } else if (elapsed < TIMING_THRESHOLDS[3]) {
          const phase = Math.floor((elapsed - TIMING_THRESHOLDS[2]) / 300) % 2;
          if (phase === 1) {
            activePath.style.opacity = "1";
            otherPath.style.opacity = "0.25";
          } else {
            activePath.style.opacity = "0.25";
            otherPath.style.opacity = "1";
          }
          p = 0;
        } else {
          activePath.style.opacity = "1";
          otherPath.style.opacity = "0.2";

          if (elapsed < TRAVEL_WINDOW[1]) {
            const travelProgress =
              (elapsed - TRAVEL_WINDOW[0]) / (TRAVEL_WINDOW[1] - TRAVEL_WINDOW[0]);
            p = easeInOutQuad(travelProgress);
          } else if (elapsed >= TIMING_THRESHOLDS[5]) {
            p = 1 - (elapsed - TIMING_THRESHOLDS[5]) / (TOTAL_CYCLE_MS - TIMING_THRESHOLDS[5]);
          } else {
            p = 1;
          }
        }

        const clampedP = Math.max(0, Math.min(1, p));
        const pt = activePath.getPointAtLength(clampedP * totalLen);
        comet.setAttribute("cx", pt.x.toFixed(2));
        comet.setAttribute("cy", pt.y.toFixed(2));

        // Update trail particles
        trailRefs.current.forEach((trailEl, idx) => {
          if (!trailEl) return;
          const trailLag =
            p - (idx + 1) * 0.014 * (elapsed >= TIMING_THRESHOLDS[5] ? -1 : 1);
          const clampedLag = Math.max(0, Math.min(1, trailLag));
          const tPt = activePath.getPointAtLength(clampedLag * totalLen);
          trailEl.setAttribute("cx", tPt.x.toFixed(2));
          trailEl.setAttribute("cy", tPt.y.toFixed(2));
          trailEl.style.opacity =
            p <= 0 || elapsed >= TIMING_THRESHOLDS[5] ? "0" : "";
        });
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [carbonAware, reducedMotion, advanceStep]);

  // Handle route toggle
  const handleToggleCarbonAware = () => {
    setCarbonAware((prev) => !prev);
    t0Ref.current = performance.now();
    curStepRef.current = -1;
    clearedTriggeredRef.current = false;
  };

  // Node tooltip trigger
  const handleNodeInspect = (node: EdgeCloudNode) => {
    if (!svgRef.current || !stageRef.current) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const stageWidth = stageRef.current.getBoundingClientRect().width;
    const scale = svgRect.width / 1000;

    let lx = node.x * scale + 14;
    let ly = node.y * scale - 110;
    if (lx + 240 > stageWidth) {
      lx = node.x * scale - 250;
    }
    if (ly < 4) {
      ly = node.y * scale + 26;
    }

    setActiveTooltip({ node, lx, ly });
  };

  const handleNodeLeave = () => {
    setActiveTooltip(null);
  };

  return (
    <section
      className={`w-full rounded-md border border-[#1b2a36] bg-gradient-to-b from-[#0b141d] to-[#0a1119] text-[#e8f1f5] shadow-2xl overflow-hidden select-none ${className}`}
      aria-label="Edge-Cloud Orchestrator mission view"
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[#1b2a36]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#5eead4] animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-wider text-[#5eead4] font-medium">
            [Constellation_Star_Network]
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            role="switch"
            aria-checked={carbonAware}
            onClick={handleToggleCarbonAware}
            className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-[#1b2a36] bg-[#0d1a24] text-xs font-mono text-[#e8f1f5] hover:border-[#5eead4] focus-visible:border-[#5eead4] focus-visible:outline-none transition-colors cursor-pointer"
          >
            <span>Carbon-aware</span>
            <span
              className={`relative inline-block w-8 h-4 rounded-full transition-colors duration-300 ${
                carbonAware ? "bg-[#5eead4]" : "bg-[#2a2f36]"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-300 ${
                  carbonAware ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </span>
          </button>

          <span className="font-mono text-[11px] text-[#8aa0ad] border border-[#1b2a36] px-2.5 py-1 rounded">
            Illustrative diagram
          </span>
        </div>
      </div>

      {/* Main 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)_270px] gap-4 p-4">
        {/* Column 1: Pipeline Steps */}
        <ol
          className="flex flex-row lg:flex-col gap-2 m-0 p-0 overflow-x-auto list-none"
          aria-label="Task pipeline"
        >
          {PIPELINE_STEPS.map((stepName, idx) => {
            const isCurrent = currentStep === idx;
            const isDone = currentStep > idx;

            return (
              <li
                key={stepName}
                className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-all whitespace-nowrap border ${
                  isCurrent
                    ? "text-[#e8f1f5] bg-[#0d1a24] border-[#5eead4] shadow-[0_0_18px_rgba(94,234,212,0.18)]"
                    : isDone
                    ? "text-[#cfe0e8] bg-transparent border-transparent"
                    : "text-[#8aa0ad] bg-transparent border-transparent"
                }`}
              >
                <b
                  className={`w-5 h-5 rounded-full border text-[11px] font-mono grid place-items-center transition-colors ${
                    isCurrent
                      ? "bg-[#5eead4] text-[#05080d] border-[#5eead4]"
                      : isDone
                      ? "border-[#5eead4] text-[#5eead4]"
                      : "border-[#1b2a36] text-[#8aa0ad]"
                  }`}
                >
                  {idx + 1}
                </b>
                <span className="font-sans font-medium">{stepName}</span>
              </li>
            );
          })}
        </ol>

        {/* Column 2: Interactive SVG Stage */}
        <div className="overflow-x-auto">
          <div ref={stageRef} className="relative min-w-[600px] w-full">
            <svg
              ref={svgRef}
              viewBox="0 0 1000 560"
              role="img"
              aria-label="Routing diagram: a short higher-carbon route through a coal-grid hub and gas relay, and a longer low-carbon route through solar, wind and hydro nodes, both from Edge Ingress to Clean Compute."
              className="w-full h-auto block select-none"
            >
              <defs>
                <filter id="ec-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="ec-hA">
                  <stop offset="0%" stopColor="#d9a850" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#d9a850" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="ec-hC">
                  <stop offset="0%" stopColor="#5eead4" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#5eead4" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Background Constellation Stars & Lines */}
              <g id="ec-stars">
                {CONSTELLATION_BG.stars.map((star, i) => (
                  <circle
                    key={`star-${i}`}
                    cx={star.cx}
                    cy={star.cy}
                    r={star.r}
                    fill="#7fa3b5"
                    opacity={star.opacity}
                  />
                ))}
                {CONSTELLATION_BG.lines.map((ln, i) => (
                  <line
                    key={`line-${i}`}
                    x1={ln.x1}
                    y1={ln.y1}
                    x2={ln.x2}
                    y2={ln.y2}
                    stroke="#2a4150"
                    opacity={0.5}
                  />
                ))}
              </g>

              {/* Ambient Regional Energy Glows */}
              <ellipse
                cx="450"
                cy="165"
                rx="270"
                ry="110"
                fill="url(#ec-hA)"
                opacity={carbonAware ? 0.35 : 0.8}
              />
              <ellipse
                cx="540"
                cy="430"
                rx="300"
                ry="120"
                fill="url(#ec-hC)"
                opacity={carbonAware ? 0.8 : 0.35}
              />

              {/* Path A: Shortest / High-Carbon (Amber) */}
              <path
                ref={pathARef}
                d={PATH_A_D}
                fill="none"
                stroke="#d9a850"
                strokeWidth={4}
                strokeLinecap="round"
                opacity={carbonAware ? 0.2 : 1}
                className="transition-opacity duration-300"
              />

              {/* Path C: Greener / Low-Carbon (Cyan) */}
              <path
                ref={pathCRef}
                d={PATH_C_D}
                fill="none"
                stroke="#5eead4"
                strokeWidth={4}
                strokeLinecap="round"
                filter="url(#ec-glow)"
                opacity={carbonAware ? 1 : 0.2}
                className="transition-opacity duration-300"
              />

              {/* Trail particles behind the comet */}
              <g id="ec-trail">
                {[...Array(9)].map((_, i) => (
                  <circle
                    key={`trail-${i}`}
                    ref={(el) => {
                      trailRefs.current[i] = el;
                    }}
                    r={7 - i * 0.7}
                    fill={carbonAware ? "#5eead4" : "#d9a850"}
                    opacity={0.5 - i * 0.05}
                  />
                ))}
              </g>

              {/* Traveling Comet Packet */}
              <circle
                ref={cometRef}
                id="ec-comet"
                r={8}
                fill={carbonAware ? "#d9fff7" : "#ffe9bd"}
                filter="url(#ec-glow)"
              />

              {/* Star-Network Nodes */}
              <g id="ec-nodes">
                {ALL_EDGE_CLOUD_NODES.map((node) => {
                  const isBig = node.id === "ingress" || node.id === "compute";
                  const isAmber = node.category === "a";
                  const col = isAmber ? "#d9a850" : "#5eead4";
                  const isNodeActive = isAmber ? !carbonAware : carbonAware;

                  const isUpper = isAmber;
                  const ty = isBig
                    ? node.y + 52
                    : isUpper
                    ? node.y - 32
                    : node.y + 36;

                  return (
                    <g
                      key={node.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`${node.name}: ${node.description}`}
                      onMouseEnter={() => handleNodeInspect(node)}
                      onMouseLeave={handleNodeLeave}
                      onFocus={() => handleNodeInspect(node)}
                      onBlur={handleNodeLeave}
                      onClick={() => handleNodeInspect(node)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleNodeInspect(node);
                        }
                      }}
                      className="cursor-pointer outline-none group"
                    >
                      {/* Big ambient ring for terminal nodes */}
                      {isBig && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={34}
                          fill={col}
                          opacity={0.14}
                        />
                      )}

                      {/* Main node ring */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isBig ? 20 : 13}
                        fill="#05080d"
                        stroke={col}
                        strokeWidth={2.5}
                        className="transition-all duration-200 group-hover:stroke-[3.5px] group-focus-visible:stroke-[3.5px]"
                      />

                      {/* Center core */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isBig ? 8 : 4.5}
                        fill={col}
                      />

                      {/* Node name label */}
                      <text
                        x={node.x}
                        y={ty}
                        textAnchor="middle"
                        className={`font-sans text-[15px] font-medium transition-colors ${
                          isNodeActive
                            ? "fill-[#cfe0e8]"
                            : "fill-[#5d7280] opacity-75"
                        }`}
                      >
                        {node.name}
                      </text>

                      {/* Secondary node badge (e.g. HIGH CARBON, LOW CARBON) */}
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
              </g>
            </svg>

            {/* Interactive Tooltip Popover */}
            {activeTooltip && (
              <div
                role="tooltip"
                style={{
                  left: `${activeTooltip.lx}px`,
                  top: `${activeTooltip.ly}px`,
                }}
                className={`absolute z-10 pointer-events-none w-[230px] p-3 rounded bg-[#0d1822] border border-[#1b2a36] shadow-xl text-xs leading-relaxed transition-opacity duration-150 ${
                  activeTooltip.node.category === "a"
                    ? "border-l-4 border-l-[#d9a850]"
                    : "border-l-4 border-l-[#5eead4]"
                }`}
              >
                <div
                  className="font-mono text-[11px] uppercase tracking-wider font-semibold"
                  style={{
                    color:
                      activeTooltip.node.category === "a"
                        ? "#d9a850"
                        : "#5eead4",
                  }}
                >
                  [{activeTooltip.node.kind}]
                </div>
                <div className="font-semibold text-sm text-[#e8f1f5] mt-0.5">
                  {activeTooltip.node.name}
                </div>
                <div className="text-[#8aa0ad] text-xs mt-1">
                  {activeTooltip.node.description}
                </div>

                {/* Meters for speed, cost, green */}
                <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5 mt-2.5 font-mono text-[11px] text-[#8aa0ad]">
                  <span className="text-[10px] uppercase">speed</span>
                  <div className="h-1.5 w-full bg-[#1b2a36] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        activeTooltip.node.category === "a"
                          ? "bg-[#d9a850]"
                          : "bg-[#5eead4]"
                      }`}
                      style={{
                        width: `${activeTooltip.node.meters[0] * 100}%`,
                      }}
                    />
                  </div>

                  <span className="text-[10px] uppercase">cost</span>
                  <div className="h-1.5 w-full bg-[#1b2a36] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        activeTooltip.node.category === "a"
                          ? "bg-[#d9a850]"
                          : "bg-[#5eead4]"
                      }`}
                      style={{
                        width: `${activeTooltip.node.meters[1] * 100}%`,
                      }}
                    />
                  </div>

                  <span className="text-[10px] uppercase">green</span>
                  <div className="h-1.5 w-full bg-[#1b2a36] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        activeTooltip.node.category === "a"
                          ? "bg-[#d9a850]"
                          : "bg-[#5eead4]"
                      }`}
                      style={{
                        width: `${activeTooltip.node.meters[2] * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="italic text-[10px] text-[#8aa0ad]/80 mt-2 font-mono">
                  Illustrative scores
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Decision Log */}
        <div
          className="p-3 flex flex-col gap-2.5 font-mono text-xs text-[#8aa0ad] min-h-[300px] border-l border-[#1b2a36]/50"
          aria-live="polite"
        >
          {logs.map((entry, idx) => {
            const isLast = idx === logs.length - 1;
            return (
              <div
                key={`log-${idx}-${entry.text.slice(0, 15)}`}
                className={`pl-2.5 border-l-2 transition-all duration-300 ${
                  isLast
                    ? entry.isAmber
                      ? "text-[#e8f1f5] border-[#d9a850] font-medium"
                      : "text-[#e8f1f5] border-[#5eead4] font-medium"
                    : "border-[#1b2a36] text-[#8aa0ad]"
                }`}
              >
                {entry.text}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#1b2a36] font-mono text-xs text-[#8aa0ad]">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d9a850] inline-block" />
            <span>Shortest path, higher carbon</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5eead4] inline-block" />
            <span>Greener route</span>
          </span>
        </div>

        <span
          className={`font-semibold tracking-wider ${
            carbonAware ? "text-[#5eead4]" : "text-[#d9a850]"
          }`}
        >
          {carbonAware
            ? "PATH: GREENER ROUTE SELECTED"
            : "PATH: SHORTEST ROUTE (CARBON IGNORED)"}
        </span>
      </div>
    </section>
  );
}

export default EdgeCloudNetwork;
