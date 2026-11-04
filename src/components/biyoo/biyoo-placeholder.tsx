"use client";

import React, { useRef } from "react";
import { useMode } from "@/lib/flags";
import { useScene, gsap } from "@/lib/motion";

export interface BiyooPlaceholderProps {
  className?: string;
  size?: number;
}

/**
 * Biyoo placeholder:
 * Code-drawn inline SVG blob matching the layer names in /docs/08-ART-ASSET-LIST.md:
 * - body, head, horns L/R, arms L/R, legs L/R, eyes, mouth, plus cotton texture overlay.
 *
 * Rules:
 * - Colors from tokens: soft --mist and --feather fluff, NO RED.
 * - Idle breathing bob using GSAP via useScene (scale and translate only).
 * - In 'reduced' mode: zero animation.
 */
export function BiyooPlaceholder({
  className = "",
  size = 220,
}: BiyooPlaceholderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useMode();

  // Idle breathing bob using GSAP via useScene
  useScene(
    () => {
      // In reduced mode: strictly no animation
      if (reducedMotion || !containerRef.current) {
        return;
      }

      const bobTarget = containerRef.current.querySelector(".biyoo-bob-target");
      if (!bobTarget) return;

      gsap.to(bobTarget, {
        y: -10,
        scaleY: 1.04,
        scaleX: 0.97,
        duration: 2.2,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut",
        transformOrigin: "bottom center",
      });
    },
    { scope: containerRef, dependencies: [reducedMotion] }
  );

  return (
    <div
      ref={containerRef}
      className={`inline-flex flex-col items-center justify-center select-none ${className}`}
      role="img"
      aria-label="Biyoo placeholder: small fluffy cotton creature with two small horns"
    >
      <div className="biyoo-bob-target will-change-transform">
        <svg
          width={size}
          height={size}
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-lg"
        >
          <defs>
            {/* Soft fluffy body gradient using --feather (#F4F6FA) and --mist (#9AA7BD) */}
            <linearGradient id="biyoo_body_grad" x1="100" y1="40" x2="100" y2="170" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F4F6FA" />
              <stop offset="100%" stopColor="#CCD5E4" />
            </linearGradient>

            {/* Subtle Horn Gradient using --rim (#9FB4D6) and --line (#243044) - NO RED */}
            <linearGradient id="biyoo_horn_grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F4F6FA" />
              <stop offset="100%" stopColor="#9FB4D6" />
            </linearGradient>
          </defs>

          {/* LAYER: legs L/R */}
          <g id="biyoo_legs_l" data-layer="legs L">
            <ellipse cx="78" cy="162" rx="14" ry="10" fill="#9AA7BD" />
          </g>
          <g id="biyoo_legs_r" data-layer="legs R">
            <ellipse cx="122" cy="162" rx="14" ry="10" fill="#9AA7BD" />
          </g>

          {/* LAYER: body (fluffy cotton lower mass) */}
          <g id="biyoo_body" data-layer="body">
            <ellipse cx="100" cy="125" rx="55" ry="40" fill="url(#biyoo_body_grad)" />
            {/* Cotton cloud tufts around body */}
            <circle cx="58" cy="120" r="22" fill="#F4F6FA" opacity="0.9" />
            <circle cx="142" cy="120" r="22" fill="#F4F6FA" opacity="0.9" />
            <circle cx="70" cy="142" r="20" fill="#CCD5E4" opacity="0.6" />
            <circle cx="130" cy="142" r="20" fill="#CCD5E4" opacity="0.6" />
          </g>

          {/* LAYER: arms L/R (tiny stubby cotton puffs) */}
          <g id="biyoo_arms_l" data-layer="arms L">
            <circle cx="50" cy="118" r="13" fill="#F4F6FA" stroke="#CCD5E4" strokeWidth="1.5" />
          </g>
          <g id="biyoo_arms_r" data-layer="arms R">
            <circle cx="150" cy="118" r="13" fill="#F4F6FA" stroke="#CCD5E4" strokeWidth="1.5" />
          </g>

          {/* LAYER: head (round fluffy upper mass) */}
          <g id="biyoo_head" data-layer="head">
            <circle cx="100" cy="85" r="44" fill="#F4F6FA" />
            {/* Soft shadow contour between head and body */}
            <path
              d="M 68 110 C 85 120, 115 120, 132 110"
              stroke="#9AA7BD"
              strokeWidth="2"
              fill="none"
              opacity="0.3"
            />
          </g>

          {/* LAYER: horns L/R (two small horns per /docs/07 - strictly no red) */}
          <g id="biyoo_horns_l" data-layer="horns L">
            <path
              d="M 76 54 C 74 44, 71 34, 65 30 C 70 34, 76 43, 84 51 Z"
              fill="url(#biyoo_horn_grad)"
              stroke="#243044"
              strokeWidth="1.5"
            />
          </g>
          <g id="biyoo_horns_r" data-layer="horns R">
            <path
              d="M 124 54 C 126 44, 129 34, 135 30 C 130 34, 124 43, 116 51 Z"
              fill="url(#biyoo_horn_grad)"
              stroke="#243044"
              strokeWidth="1.5"
            />
          </g>

          {/* LAYER: eyes (expressive dot eyes with tiny highlights) */}
          <g id="biyoo_eyes" data-layer="eyes">
            {/* Left eye */}
            <circle cx="86" cy="82" r="6" fill="#0E1118" />
            <circle cx="84" cy="80" r="2" fill="#FFFFFF" />
            {/* Right eye */}
            <circle cx="114" cy="82" r="6" fill="#0E1118" />
            <circle cx="112" cy="80" r="2" fill="#FFFFFF" />
          </g>

          {/* LAYER: mouth (gentle smiling cat-like curve) */}
          <g id="biyoo_mouth" data-layer="mouth">
            <path
              d="M 94 92 Q 97 95 100 92 Q 103 95 106 92"
              stroke="#243044"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            {/* Soft pinkish blush dots using cold rim light hue */}
            <ellipse cx="76" cy="90" rx="6" ry="3" fill="#9FB4D6" opacity="0.4" />
            <ellipse cx="124" cy="90" rx="6" ry="3" fill="#9FB4D6" opacity="0.4" />
          </g>

          {/* LAYER: cotton texture overlay (cloud puff rim highlights) */}
          <g id="biyoo_overlay" data-layer="cotton texture overlay" opacity="0.5">
            <circle cx="82" cy="58" r="8" fill="#FFFFFF" opacity="0.6" />
            <circle cx="118" cy="58" r="8" fill="#FFFFFF" opacity="0.6" />
            <circle cx="100" cy="52" r="10" fill="#FFFFFF" opacity="0.7" />
          </g>
        </svg>
      </div>

      <span className="font-mono text-xs text-mist mt-3 tracking-wider">
        [BIYOO_PLACEHOLDER]
      </span>
    </div>
  );
}

export default BiyooPlaceholder;
