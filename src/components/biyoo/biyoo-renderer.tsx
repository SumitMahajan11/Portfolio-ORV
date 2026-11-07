/**
 * Biyoo Character Visual Renderer
 *
 * Implements /docs/07-BIYOO-PERSONALITY-AND-SOUND.md and /docs/20 Section 3.3.
 * Sourced from approved reference art docs/reference/biyoo/biyoo-01.png:
 * - Fluffy spherical cotton body with warm rim glow and tufted edges
 * - Spiraling amber-gold cone horns with horizontal ridges (strictly NO red)
 * - Joyful anime expressions (eye & mouth variations per state)
 * - Pink cheek blush marks and cheerful tongue
 * - Stubby arm nubs and small feet
 */

import React from "react";
import type { BiyooCostume, BiyooEyeVariant, BiyooMouthVariant } from "./biyoo-types";
import { BiyooCostumeOverlay } from "./costume-registry";

export interface BiyooRendererProps {
  size?: number;
  eyeVariant: BiyooEyeVariant;
  mouthVariant: BiyooMouthVariant;
  costume?: BiyooCostume;
  className?: string;
  isReduced?: boolean;
}

export function BiyooRenderer(props: BiyooRendererProps) {
  const {
    size = 110,
    eyeVariant,
    mouthVariant,
    costume = null,
    className = "",
  } = props;
  const clampStyle = { maxWidth: "clamp(72px, 10vw, 110px)", maxHeight: "clamp(72px, 10vw, 110px)" };
  return (
    <div
      className={`biyoo-visual-frame relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size, ...clampStyle }}
    >
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="biyoo-svg drop-shadow-xl overflow-visible w-full h-full"
        style={clampStyle}
        aria-hidden="true"
      >
        <defs>
          {/* Fluffy body soft warm-white gradient */}
          <radialGradient id="biyoo_fluff_grad" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#F8FAFC" />
            <stop offset="88%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </radialGradient>

          {/* Amber-Gold Horn Gradient (Strictly NO RED) */}
          <linearGradient id="biyoo_amber_horn" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="45%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>

          {/* Rosy Cheek Blush */}
          <radialGradient id="biyoo_blush" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDA4AF" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#FB7185" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FB7185" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* LAYER: Stubby Feet */}
        <g id="biyoo_legs_l" data-layer="legs L">
          <ellipse cx="78" cy="164" rx="13" ry="9" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.2" />
        </g>
        <g id="biyoo_legs_r" data-layer="legs R">
          <ellipse cx="122" cy="164" rx="13" ry="9" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.2" />
        </g>

        {/* LAYER: Main Fluffy Spherical Body */}
        <g id="biyoo_body" data-layer="body">
          {/* Soft cloud tuft mounds forming the fluffy perimeter */}
          <circle cx="58" cy="120" r="24" fill="#F8FAFC" />
          <circle cx="142" cy="120" r="24" fill="#F8FAFC" />
          <circle cx="68" cy="144" r="22" fill="#E2E8F0" />
          <circle cx="132" cy="144" r="22" fill="#E2E8F0" />
          <circle cx="100" cy="150" r="22" fill="#E2E8F0" />
          {/* Central spherical body mass */}
          <ellipse cx="100" cy="122" rx="56" ry="42" fill="url(#biyoo_fluff_grad)" />
        </g>

        {/* LAYER: Arm Nubs */}
        <g id="biyoo_arms_l" data-layer="arms L">
          <ellipse cx="48" cy="116" rx="14" ry="12" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
        </g>
        <g id="biyoo_arms_r" data-layer="arms R">
          <ellipse cx="152" cy="116" rx="14" ry="12" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
        </g>

        {/* LAYER: Head & Upper Tuft */}
        <g id="biyoo_head" data-layer="head">
          <circle cx="100" cy="86" r="46" fill="url(#biyoo_fluff_grad)" />
          {/* Fluffy top head tuft puffs */}
          <circle cx="82" cy="52" r="10" fill="#FFFFFF" opacity="0.9" />
          <circle cx="118" cy="52" r="10" fill="#FFFFFF" opacity="0.9" />
          <circle cx="100" cy="46" r="13" fill="#FFFFFF" />
        </g>

        {/* LAYER: Amber-Gold Horns (Left & Right with Spiral Ridges - NO RED) */}
        <g id="biyoo_horns_l" data-layer="horns L">
          <path d="M 74 54 C 70 42, 64 30, 56 24 C 64 28, 74 38, 84 50 Z" fill="url(#biyoo_amber_horn)" stroke="#78350F" strokeWidth="1.4" />
          <path d="M 62 31 C 66 33, 72 38, 76 40" stroke="#78350F" strokeWidth="1.4" fill="none" />
          <path d="M 68 39 C 72 42, 78 46, 81 48" stroke="#78350F" strokeWidth="1.4" fill="none" />
        </g>
        <g id="biyoo_horns_r" data-layer="horns R">
          <path d="M 126 54 C 130 42, 136 30, 144 24 C 136 28, 126 38, 116 50 Z" fill="url(#biyoo_amber_horn)" stroke="#78350F" strokeWidth="1.4" />
          <path d="M 138 31 C 134 33, 128 38, 124 40" stroke="#78350F" strokeWidth="1.4" fill="none" />
          <path d="M 132 39 C 128 42, 122 46, 119 48" stroke="#78350F" strokeWidth="1.4" fill="none" />
        </g>

        {/* LAYER: Rosy Cheek Blush */}
        <ellipse cx="74" cy="94" rx="9" ry="5" fill="url(#biyoo_blush)" />
        <ellipse cx="126" cy="94" rx="9" ry="5" fill="url(#biyoo_blush)" />

        {/* LAYER: Eyes (Joyful Arcs, Awake Dots, Wide Alert, Curious, Proud) */}
        <g id="biyoo_eyes" data-layer="eyes">
          {eyeVariant === "awake" && (
            <>
              <circle cx="84" cy="84" r="5" fill="#0F172A" />
              <circle cx="82.5" cy="82" r="1.8" fill="#FFFFFF" />
              <circle cx="116" cy="84" r="5" fill="#0F172A" />
              <circle cx="114.5" cy="82" r="1.8" fill="#FFFFFF" />
            </>
          )}
          {eyeVariant === "sleepy" && (
            <>
              <path d="M 77 86 Q 84 91 91 86" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" fill="none" />
              <path d="M 109 86 Q 116 91 123 86" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            </>
          )}
          {eyeVariant === "proud" && (
            <>
              <path d="M 77 84 Q 84 78 91 84" stroke="#0F172A" strokeWidth="2.6" strokeLinecap="round" fill="none" />
              <path d="M 109 84 Q 116 78 123 84" stroke="#0F172A" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            </>
          )}
          {eyeVariant === "curious" && (
            <>
              <ellipse cx="84" cy="82" rx="5" ry="6" fill="#0F172A" />
              <circle cx="83" cy="80" r="2" fill="#5EE1E6" />
              <ellipse cx="116" cy="85" rx="5" ry="4.5" fill="#0F172A" />
              <circle cx="115" cy="83" r="1.6" fill="#5EE1E6" />
            </>
          )}
          {eyeVariant === "wide" && (
            <>
              <circle cx="83" cy="82" r="7.5" fill="#0F172A" />
              <circle cx="81.5" cy="80" r="3" fill="#5EE1E6" />
              <circle cx="117" cy="82" r="7.5" fill="#0F172A" />
              <circle cx="115.5" cy="80" r="3" fill="#5EE1E6" />
            </>
          )}
        </g>

        {/* LAYER: Mouth (Joyful Laughing Smile with Pink Tongue, Yawn, Surprise, Droop) */}
        <g id="biyoo_mouth" data-layer="mouth">
          {mouthVariant === "smile" && (
            <g>
              <path
                d="M 92 94 Q 100 106 108 94 Z"
                fill="#BE185D"
                stroke="#0F172A"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path d="M 96 99 Q 100 104 104 99" fill="#FB7185" />
            </g>
          )}
          {mouthVariant === "open" && (
            <g>
              <path
                d="M 94 94 Q 100 104 106 94 Z"
                fill="#BE185D"
                stroke="#0F172A"
                strokeWidth="1.6"
              />
              <circle cx="100" cy="99" r="2.5" fill="#FB7185" />
            </g>
          )}
          {mouthVariant === "yawn" && (
            <ellipse cx="100" cy="97" rx="6" ry="9" fill="#0F172A" stroke="#475569" strokeWidth="1.4" />
          )}
          {mouthVariant === "surprise" && (
            <ellipse cx="100" cy="96" rx="5" ry="7" fill="#0F172A" />
          )}
          {mouthVariant === "droop" && (
            <path d="M 95 98 Q 100 94 105 98" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" fill="none" />
          )}
        </g>

        {/* LAYER: World Costume Overlay */}
        <BiyooCostumeOverlay costume={costume} />
      </svg>
    </div>
  );
}
