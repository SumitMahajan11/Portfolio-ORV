import React from "react";
import type { DeviceMode } from "@/lib/device/types";
import { PARTICLES_DATA } from "./particles-data";

const STARS_LAYER_1 = [
  { top: "10%", left: "12%", size: 1, opacity: 0.35 },
  { top: "18%", left: "82%", size: 1.5, opacity: 0.4 },
  { top: "25%", left: "28%", size: 1, opacity: 0.3 },
  { top: "35%", left: "68%", size: 1, opacity: 0.35 },
  { top: "48%", left: "88%", size: 1.5, opacity: 0.45 },
  { top: "62%", left: "14%", size: 1, opacity: 0.3 },
  { top: "75%", left: "78%", size: 1.5, opacity: 0.4 },
  { top: "82%", left: "32%", size: 1, opacity: 0.35 },
  { top: "90%", left: "62%", size: 1, opacity: 0.3 },
];

const STARS_LAYER_2 = [
  { top: "14%", left: "45%", size: 1.5, opacity: 0.5 },
  { top: "22%", left: "92%", size: 2, opacity: 0.6 },
  { top: "38%", left: "18%", size: 1.5, opacity: 0.55 },
  { top: "54%", left: "75%", size: 2, opacity: 0.65 },
  { top: "68%", left: "40%", size: 1.5, opacity: 0.5 },
  { top: "86%", left: "85%", size: 2, opacity: 0.6 },
  { top: "94%", left: "18%", size: 1.5, opacity: 0.5 },
];

const STARS_LAYER_3 = [
  { top: "8%", left: "70%", size: 2.5, opacity: 0.8 },
  { top: "30%", left: "8%", size: 2, opacity: 0.75 },
  { top: "45%", left: "52%", size: 2.5, opacity: 0.85 },
  { top: "72%", left: "25%", size: 2, opacity: 0.75 },
  { top: "88%", left: "72%", size: 2.5, opacity: 0.8 },
];

const STAR_RING_NODES = [
  { deg: 0, cx: 400, cy: 220 },
  { deg: 30, cx: 375.9, cy: 310 },
  { deg: 60, cx: 310, cy: 375.9 },
  { deg: 90, cx: 220, cy: 400 },
  { deg: 120, cx: 130, cy: 375.9 },
  { deg: 150, cx: 64.1, cy: 310 },
  { deg: 180, cx: 40, cy: 220 },
  { deg: 210, cx: 64.1, cy: 130 },
  { deg: 240, cx: 130, cy: 64.1 },
  { deg: 270, cx: 220, cy: 40 },
  { deg: 300, cx: 310, cy: 64.1 },
  { deg: 330, cx: 375.9, cy: 130 },
];

const FEATHER_DRIFT_MOTES = [
  { left: "20%", top: "60%", rot: -15, scale: 0.8 },
  { left: "35%", top: "55%", rot: 20, scale: 1.0 },
  { left: "50%", top: "65%", rot: -8, scale: 1.1 },
  { left: "65%", top: "58%", rot: 25, scale: 0.9 },
  { left: "80%", top: "62%", rot: -20, scale: 1.0 },
  { left: "28%", top: "72%", rot: 14, scale: 0.85 },
  { left: "72%", top: "70%", rot: -18, scale: 0.95 },
];

export interface HeroLayersProps {
  mode: DeviceMode;
  particleCap: number;
  isTouch: boolean;
}

export function HeroLayers({ mode, particleCap, isTouch }: HeroLayersProps) {
  const activeParticles = PARTICLES_DATA.slice(
    0,
    Math.min(particleCap, PARTICLES_DATA.length)
  );

  return (
    <>
      {/* LAYER 1: Deep void ambient radial gradient */}
      <div
        data-layer="background"
        className="hero-layer hero-layer-background pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_rgba(94,225,230,0.06)_0%,_rgba(7,8,11,1)_72%)]"
        aria-hidden="true"
      />

      {/* LAYER 2: Stars (3 parallax layers) */}
      <div
        data-layer="stars"
        className="hero-layer hero-layer-stars pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
      >
        <div data-layer="stars-1" className="absolute inset-0">
          {STARS_LAYER_1.map((star, idx) => (
            <span
              key={`star1-${idx}`}
              className="absolute rounded-full bg-feather"
              style={{
                top: star.top,
                left: star.left,
                width: `${star.size}px`,
                height: `${star.size}px`,
                opacity: star.opacity,
              }}
            />
          ))}
        </div>

        {mode !== "light" && (
          <div data-layer="stars-2" className="absolute inset-0">
            {STARS_LAYER_2.map((star, idx) => (
              <span
                key={`star2-${idx}`}
                className="absolute rounded-full bg-rim"
                style={{
                  top: star.top,
                  left: star.left,
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                  opacity: star.opacity,
                }}
              />
            ))}
          </div>
        )}

        {mode === "full" && !isTouch && (
          <div data-layer="stars-3" className="absolute inset-0">
            {STARS_LAYER_3.map((star, idx) => (
              <span
                key={`star3-${idx}`}
                className="absolute rounded-full bg-star shadow-[0_0_4px_rgba(94,225,230,0.8)]"
                style={{
                  top: star.top,
                  left: star.left,
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                  opacity: star.opacity,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* LAYER 3: Constellation Star Ring */}
      <div
        data-layer="star-ring"
        className="hero-star-ring pointer-events-none absolute inset-0 flex items-center justify-center z-15"
        style={{ opacity: 0 }}
      >
        <svg
          viewBox="0 0 440 440"
          className="w-[300px] h-[300px] xs:w-[340px] xs:h-[340px] sm:w-[460px] sm:h-[460px] max-w-full overflow-hidden"
        >
          <circle
            cx="220"
            cy="220"
            r="180"
            fill="none"
            stroke="#5EE1E6"
            strokeWidth="1"
            strokeDasharray="4 8"
            opacity="0.35"
          />
          {STAR_RING_NODES.map(({ deg, cx, cy }) => (
            <g key={`star-node-${deg}`}>
              <circle cx={cx} cy={cy} r="2.5" fill="#5EE1E6" />
              <circle cx={cx} cy={cy} r="6" fill="#5EE1E6" opacity="0.25" />
            </g>
          ))}
        </svg>
      </div>

      {/* LAYER 11: Particles */}
      <div
        data-layer="particles"
        className="hero-layer hero-layer-particles pointer-events-none absolute inset-0 z-10"
        aria-hidden="true"
      >
        {activeParticles.map((pt, idx) => (
          <span
            key={`pt-${idx}`}
            className="absolute rounded-full bg-star/70 animate-pulse"
            style={{
              top: pt.top,
              left: pt.left,
              width: `${pt.size}px`,
              height: `${pt.size}px`,
              animationDelay: `${pt.delay}s`,
            }}
          />
        ))}
      </div>

      {/* LAYER 12: Stage 7 Feather Drift Motes (Narrative bridge to Scenario Select) */}
      <div
        data-layer="feather-drift"
        className="hero-feather-drift pointer-events-none absolute inset-0 z-20"
        style={{ opacity: 0 }}
        aria-hidden="true"
      >
        {FEATHER_DRIFT_MOTES.map((f, idx) => (
          <div
            key={`feather-${idx}`}
            className="absolute w-4 h-6 rounded-full bg-gradient-to-b from-white to-[#9FB4D6] shadow-[0_0_8px_rgba(255,255,255,0.4)]"
            style={{
              left: f.left,
              top: f.top,
              transform: `rotate(${f.rot}deg) scale(${f.scale})`,
            }}
          />
        ))}
      </div>
    </>
  );
}
