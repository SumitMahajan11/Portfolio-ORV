"use client";

import React, { useRef, useEffect } from "react";
import { useMode } from "@/lib/flags";
import { useScene, gsap } from "@/lib/motion";

// Deterministic ambient star node coordinates (viewBox 0 0 600 320)
const AMBIENT_STAR_NODES = [
  { cx: 110, cy: 75, r: 2 },
  { cx: 155, cy: 45, r: 1.5 },
  { cx: 275, cy: 50, r: 2 },
  { cx: 330, cy: 35, r: 1.5 },
  { cx: 420, cy: 60, r: 2 },
  { cx: 480, cy: 40, r: 1.5 },
  { cx: 515, cy: 80, r: 2 },
  { cx: 90, cy: 240, r: 1.5 },
  { cx: 140, cy: 280, r: 2 },
  { cx: 230, cy: 290, r: 1.5 },
  { cx: 270, cy: 270, r: 2 },
  { cx: 375, cy: 290, r: 1.5 },
  { cx: 410, cy: 270, r: 2 },
  { cx: 495, cy: 275, r: 1.5 },
  { cx: 545, cy: 235, r: 2 },
  { cx: 200, cy: 160, r: 1.5 },
  { cx: 260, cy: 180, r: 1.5 },
  { cx: 350, cy: 140, r: 1.5 },
  { cx: 400, cy: 170, r: 1.5 },
  { cx: 470, cy: 130, r: 1.5 },
  // Extended nodes up to 54 ambient + 6 key = 60 total
  { cx: 40, cy: 60, r: 1.5 },
  { cx: 75, cy: 100, r: 1.5 },
  { cx: 130, cy: 115, r: 1.5 },
  { cx: 180, cy: 85, r: 2 },
  { cx: 240, cy: 30, r: 1.5 },
  { cx: 310, cy: 70, r: 1.5 },
  { cx: 360, cy: 55, r: 1.5 },
  { cx: 450, cy: 30, r: 1.5 },
  { cx: 560, cy: 60, r: 1.5 },
  { cx: 575, cy: 110, r: 2 },
  { cx: 35, cy: 215, r: 1.5 },
  { cx: 65, cy: 270, r: 1.5 },
  { cx: 115, cy: 295, r: 1.5 },
  { cx: 175, cy: 270, r: 1.5 },
  { cx: 215, cy: 250, r: 2 },
  { cx: 300, cy: 295, r: 1.5 },
  { cx: 345, cy: 270, r: 1.5 },
  { cx: 440, cy: 295, r: 1.5 },
  { cx: 470, cy: 250, r: 2 },
  { cx: 530, cy: 285, r: 1.5 },
  { cx: 565, cy: 210, r: 1.5 },
  { cx: 145, cy: 180, r: 1.5 },
  { cx: 235, cy: 130, r: 1.5 },
  { cx: 290, cy: 135, r: 1.5 },
  { cx: 315, cy: 195, r: 1.5 },
  { cx: 380, cy: 190, r: 1.5 },
  { cx: 430, cy: 165, r: 1.5 },
  { cx: 460, cy: 185, r: 1.5 },
  { cx: 490, cy: 160, r: 1.5 },
  { cx: 510, cy: 190, r: 1.5 },
  { cx: 160, cy: 140, r: 1.5 },
  { cx: 210, cy: 200, r: 1.5 },
  { cx: 370, cy: 230, r: 1.5 },
  { cx: 520, cy: 130, r: 1.5 },
];

export interface EdgeCloudNetworkProps {
  className?: string;
  onClearScenario?: () => void;
}

/**
 * EdgeCloudNetwork:
 * Interactive Star-Network SVG with scroll-scrubbed packet travel.
 *
 * Rules:
 * - Star network with node caps: desktop 60, mobile 30, light mode 20
 * - Shortest path: dim amber (#D4B15F)
 * - Greener path: teal-green (#6EE7A8), wins and labeled "carbon-aware"
 * - Packet travels via transforms along greener path
 * - Labeled "illustrative routing diagram"
 * - ZERO numeric metrics (no percentages, no latency ms)
 * - Only transform and opacity animated (strokeDashoffset allowed exception)
 */
export function EdgeCloudNetwork({
  className = "",
  onClearScenario,
}: EdgeCloudNetworkProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clearedRef = useRef(false);

  const { mode, reducedMotion, signals } = useMode();

  // Star network node caps per /docs/02, /docs/09 & P1-7:
  // Desktop full: 54 ambient + 6 key = 60 total
  // Mobile full: 24 ambient + 6 key = 30 total
  // Light mode: 14 ambient + 6 key = 20 total
  const ambientCap = mode === "light" ? 14 : signals.isTouch ? 24 : 54;
  const activeAmbientNodes = AMBIENT_STAR_NODES.slice(0, ambientCap);

  // Trigger star goggles costume on mount, reset on unmount
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

  // ScrollTrigger animation for path draw and packet travel
  useScene(
    () => {
      if (reducedMotion || !containerRef.current) return;

      const pathShortest = containerRef.current.querySelector("#path_shortest");
      const pathGreener = containerRef.current.querySelector("#path_greener");
      const packet = containerRef.current.querySelector("#routing_packet");
      const greenBadge = containerRef.current.querySelector("#badge_carbon_aware");
      const destPulse = containerRef.current.querySelector("#dest_pulse");

      if (!pathShortest || !pathGreener || !packet) return;

      const shortestLength = 520;
      const greenerLength = 620;

      // Set initial path offsets
      gsap.set(pathShortest, {
        strokeDasharray: shortestLength,
        strokeDashoffset: shortestLength,
      });
      gsap.set(pathGreener, {
        strokeDasharray: greenerLength,
        strokeDashoffset: greenerLength,
      });
      gsap.set(greenBadge, { opacity: 0, scale: 0.85 });
      gsap.set(packet, { opacity: 0, x: 60, y: 160 });
      gsap.set(destPulse, { scale: 1, opacity: 0.3 });

      // Master scroll-scrub timeline for routing visualization
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 65%",
          end: "bottom 35%",
          scrub: 0.6,
          onUpdate: (self) => {
            // Exit celebration trigger when scrub crosses 88%
            if (self.progress >= 0.88 && !clearedRef.current) {
              clearedRef.current = true;
              onClearScenario?.();
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("biyoo:action", {
                    detail: { state: "proud", line: "Evidence found." },
                  })
                );
              }
            } else if (self.progress < 0.88) {
              clearedRef.current = false;
            }
          },
        },
      });

      // 0 - 35%: Both paths begin evaluating
      tl.to(
        packet,
        {
          opacity: 1,
          duration: 10,
        },
        0
      );

      // Shortest path draws partially, then dims
      tl.to(
        pathShortest,
        {
          strokeDashoffset: shortestLength * 0.4,
          duration: 35,
          ease: "none",
        },
        0
      );

      // Greener path draws completely from ingress to destination
      tl.to(
        pathGreener,
        {
          strokeDashoffset: 0,
          duration: 75,
          ease: "none",
        },
        10
      );

      // Packet moves through greener waypoints (180,220) -> (320,250) -> (440,210) -> (540,160)
      tl.to(
        packet,
        {
          x: 180,
          y: 220,
          duration: 20,
          ease: "power1.inOut",
        },
        15
      );

      tl.to(
        packet,
        {
          x: 320,
          y: 250,
          duration: 25,
          ease: "power1.inOut",
        },
        35
      );

      tl.to(
        packet,
        {
          x: 440,
          y: 210,
          duration: 25,
          ease: "power1.inOut",
        },
        60
      );

      tl.to(
        packet,
        {
          x: 540,
          y: 160,
          duration: 15,
          ease: "power2.out",
        },
        85
      );

      // Greener wins: badge fades in
      tl.to(
        greenBadge,
        {
          opacity: 1,
          scale: 1,
          duration: 15,
          ease: "power2.out",
        },
        70
      );

      // Destination arrival pulse
      tl.to(
        destPulse,
        {
          scale: 1.8,
          opacity: 0.9,
          duration: 15,
          yoyo: true,
          repeat: 1,
          ease: "sine.inOut",
        },
        85
      );
    },
    { scope: containerRef, dependencies: [reducedMotion, mode, ambientCap] }
  );

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded border border-line/80 bg-ink/80 p-4 sm:p-6 backdrop-blur-md shadow-2xl overflow-hidden select-none ${className}`}
      aria-label="Edge-Cloud Constellation Star-Network Routing Diagram"
    >
      {/* Top Header Tag: explicitly labeled "illustrative routing diagram" */}
      <div className="flex items-center justify-between border-b border-line/60 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-star animate-pulse" />
          <span className="font-mono text-xs text-star tracking-widest uppercase font-semibold">
            [CONSTELLATION_STAR_NETWORK]
          </span>
        </div>
        <span className="font-mono text-[10px] sm:text-xs text-mist/80 uppercase px-2 py-0.5 border border-line bg-ink-2/60 rounded">
          illustrative routing diagram
        </span>
      </div>

      {/* Main SVG Star Network */}
      <div className="relative w-full aspect-[600/320] flex items-center justify-center">
        <svg
          viewBox="0 0 600 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full overflow-hidden"
        >
          <defs>
            {/* Greener path gradient (teal to soft green) */}
            <linearGradient id="ec_greener_grad" x1="60" y1="160" x2="540" y2="160" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#5EE1E6" />
              <stop offset="60%" stopColor="#6EE7A8" />
              <stop offset="100%" stopColor="#5EE1E6" />
            </linearGradient>

            {/* Amber shortest path gradient */}
            <linearGradient id="ec_shortest_grad" x1="60" y1="160" x2="540" y2="160" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#D4B15F" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#F28C28" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Ambient Constellation Network Lines */}
          <g id="ambient_constellation_lines" opacity="0.2">
            <line x1="110" y1="75" x2="155" y2="45" stroke="#9AA7BD" strokeWidth="0.8" />
            <line x1="155" y1="45" x2="275" y2="50" stroke="#9AA7BD" strokeWidth="0.8" />
            <line x1="275" y1="50" x2="330" y2="35" stroke="#9AA7BD" strokeWidth="0.8" />
            <line x1="330" y1="35" x2="420" y2="60" stroke="#9AA7BD" strokeWidth="0.8" />
            <line x1="420" y1="60" x2="515" y2="80" stroke="#9AA7BD" strokeWidth="0.8" />
            <line x1="90" y1="240" x2="140" y2="280" stroke="#9AA7BD" strokeWidth="0.8" />
            <line x1="140" y1="280" x2="230" y2="290" stroke="#9AA7BD" strokeWidth="0.8" />
            <line x1="270" y1="270" x2="375" y2="290" stroke="#9AA7BD" strokeWidth="0.8" />
            <line x1="375" y1="290" x2="495" y2="275" stroke="#9AA7BD" strokeWidth="0.8" />
            <line x1="495" y1="275" x2="545" y2="235" stroke="#9AA7BD" strokeWidth="0.8" />
          </g>

          {/* Ambient Star Nodes */}
          <g id="ambient_star_nodes">
            {activeAmbientNodes.map((star, idx) => (
              <circle
                key={`amb-node-${idx}`}
                cx={star.cx}
                cy={star.cy}
                r={star.r}
                fill="#9AA7BD"
                opacity={0.4}
              />
            ))}
          </g>

          {/* SHORTEST PATH: Dim Amber (M 60 160 L 220 100 L 380 100 L 540 160) */}
          <g id="shortest_path_group">
            <path
              id="path_shortest_guide"
              d="M 60 160 L 220 100 L 380 100 L 540 160"
              stroke="#243044"
              strokeWidth="1.5"
              strokeDasharray="3 4"
            />
            <path
              id="path_shortest"
              d="M 60 160 L 220 100 L 380 100 L 540 160"
              stroke="url(#ec_shortest_grad)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            {/* Waypoint nodes */}
            <circle cx="220" cy="100" r="4.5" fill="#0E1118" stroke="#D4B15F" strokeWidth="1.5" />
            <circle cx="380" cy="100" r="4.5" fill="#0E1118" stroke="#D4B15F" strokeWidth="1.5" />
            <text x="300" y="85" fill="#D4B15F" fontSize="10" fontFamily="monospace" textAnchor="middle" opacity="0.8">
              shortest path (higher carbon)
            </text>
          </g>

          {/* GREENER PATH: Teal-Green (M 60 160 L 180 220 L 320 250 L 440 210 L 540 160) */}
          <g id="greener_path_group">
            <path
              id="path_greener_guide"
              d="M 60 160 L 180 220 L 320 250 L 440 210 L 540 160"
              stroke="#243044"
              strokeWidth="1.5"
              strokeDasharray="2 3"
            />
            <path
              id="path_greener"
              d="M 60 160 L 180 220 L 320 250 L 440 210 L 540 160"
              stroke="url(#ec_greener_grad)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* Waypoint nodes */}
            <circle cx="180" cy="220" r="5" fill="#0E1118" stroke="#6EE7A8" strokeWidth="1.8" />
            <circle cx="320" cy="250" r="5" fill="#0E1118" stroke="#6EE7A8" strokeWidth="1.8" />
            <circle cx="440" cy="210" r="5" fill="#0E1118" stroke="#6EE7A8" strokeWidth="1.8" />
          </g>

          {/* INGRESS NODE: Workload Source (60, 160) */}
          <g id="ingress_node">
            <circle cx="60" cy="160" r="16" fill="#5EE1E6" opacity="0.15" />
            <circle cx="60" cy="160" r="9" fill="#0E1118" stroke="#5EE1E6" strokeWidth="2" />
            <circle cx="60" cy="160" r="3.5" fill="#5EE1E6" />
            <text x="60" y="195" fill="#5EE1E6" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              EDGE INGRESS
            </text>
          </g>

          {/* DESTINATION NODE: Target Region (540, 160) */}
          <g id="destination_node">
            <circle id="dest_pulse" cx="540" cy="160" r="18" fill="#6EE7A8" opacity="0.25" />
            <circle cx="540" cy="160" r="10" fill="#0E1118" stroke="#6EE7A8" strokeWidth="2" />
            <circle cx="540" cy="160" r="4" fill="#6EE7A8" />
            <text x="540" y="195" fill="#6EE7A8" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              CLEAN COMPUTE
            </text>
          </g>

          {/* TRAVELING PACKET: Animated along greener path */}
          <g id="routing_packet">
            <circle cx="0" cy="0" r="8" fill="#6EE7A8" opacity="0.35" />
            <circle cx="0" cy="0" r="4" fill="#FFFFFF" />
          </g>
        </svg>

        {/* CARBON-AWARE BADGE (Floats over winning greener route) */}
        <div
          id="badge_carbon_aware"
          className="absolute bottom-6 sm:bottom-8 inset-x-0 mx-auto w-fit px-3 py-1 bg-ink/95 border border-[#6EE7A8] rounded text-[#6EE7A8] font-mono text-xs tracking-wider uppercase shadow-xl flex items-center gap-1.5 pointer-events-none"
        >
          <span className="w-2 h-2 rounded-full bg-[#6EE7A8] animate-ping" />
          <span>carbon-aware (selected)</span>
        </div>
      </div>

      {/* Footer Navigation Notice */}
      <div className="mt-4 pt-3 border-t border-line/40 flex items-center justify-end text-[11px] font-mono text-mist">
        <span className="text-[#6EE7A8]">PATH: GREENER ROUTE SELECTED</span>
      </div>
    </div>
  );
}

export default EdgeCloudNetwork;

