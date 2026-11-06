/**
 * Biyoo Costume Registry
 *
 * Implements /docs/07-BIYOO-PERSONALITY-AND-SOUND.md and /docs/20 Section 3.4.
 * World accessory overlays positioned with precise vector anchors.
 */

import React from "react";
import type { BiyooCostume } from "./biyoo-types";

export interface BiyooCostumeProps {
  costume: BiyooCostume;
}

export function BiyooCostumeOverlay({ costume }: BiyooCostumeProps) {
  if (!costume) return null;

  switch (costume) {
    case "star goggles":
      return (
        <g id="costume_star_goggles" data-layer="costume star goggles" aria-label="Star goggles accessory">
          {/* Bridge connector */}
          <line x1="86" y1="80" x2="114" y2="80" stroke="#5EE1E6" strokeWidth="2" strokeLinecap="round" />
          {/* Goggle strap extending back */}
          <path d="M 66 82 C 60 84, 52 86, 44 88" stroke="#5EE1E6" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          <path d="M 134 82 C 140 84, 148 86, 156 88" stroke="#5EE1E6" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          
          {/* Left Star Lens */}
          <g transform="translate(86, 80)">
            <circle cx="0" cy="0" r="14" fill="#5EE1E6" fillOpacity="0.15" stroke="#5EE1E6" strokeWidth="1.8" />
            <polygon
              points="0,-10 3,-3 10,-3 4,2 6,9 0,5 -6,9 -4,2 -10,-3 -3,-3"
              fill="#5EE1E6"
              fillOpacity="0.4"
              stroke="#5EE1E6"
              strokeWidth="1.2"
            />
          </g>

          {/* Right Star Lens */}
          <g transform="translate(114, 80)">
            <circle cx="0" cy="0" r="14" fill="#5EE1E6" fillOpacity="0.15" stroke="#5EE1E6" strokeWidth="1.8" />
            <polygon
              points="0,-10 3,-3 10,-3 4,2 6,9 0,5 -6,9 -4,2 -10,-3 -3,-3"
              fill="#5EE1E6"
              fillOpacity="0.4"
              stroke="#5EE1E6"
              strokeWidth="1.2"
            />
          </g>
        </g>
      );

    case "headband":
    case "leaf headband":
      return (
        <g id="costume_headband" data-layer="costume headband" aria-label="Leaf village headband accessory">
          {/* Green cloth headband wrapped across forehead */}
          <path
            d="M 60 64 C 82 54, 118 54, 140 64"
            stroke="#2E7D32"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          {/* Metal plate in center */}
          <rect
            x="86"
            y="52"
            width="28"
            height="12"
            rx="3"
            fill="#E0E6ED"
            stroke="#1B5E20"
            strokeWidth="1.5"
          />
          {/* Stylized leaf spiral crest engraved on metal plate */}
          <path
            d="M 97 58 C 99 55, 103 55, 103 58 C 103 61, 99 61, 98 59"
            stroke="#1B5E20"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Rivets on plate */}
          <circle cx="89" cy="58" r="1" fill="#1B5E20" />
          <circle cx="111" cy="58" r="1" fill="#1B5E20" />
          {/* Headband cloth knot tails fluttering to left */}
          <path
            d="M 60 64 Q 52 70 54 80 M 60 64 Q 48 66 42 74"
            stroke="#2E7D32"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      );

    case "chain bracelet":
      return (
        <g id="costume_chain_bracelet" data-layer="costume chain bracelet" aria-label="Nen chain bracelet accessory">
          {/* Dark metallic chain looped around left arm nub */}
          <ellipse
            cx="48"
            cy="118"
            rx="12"
            ry="6"
            fill="none"
            stroke="#1F2937"
            strokeWidth="3"
            strokeDasharray="3 2"
          />
          <ellipse
            cx="48"
            cy="121"
            rx="10"
            ry="5"
            fill="none"
            stroke="#4B5563"
            strokeWidth="1.5"
          />
          {/* Dangling finger chain links */}
          <path
            d="M 44 124 L 40 134 L 38 142"
            stroke="#374151"
            strokeWidth="2"
            strokeDasharray="2 2"
            strokeLinecap="round"
            fill="none"
          />
          {/* Mini blade ring anchor */}
          <polygon points="38,142 36,146 40,146" fill="#9CA3AF" stroke="#1F2937" strokeWidth="1" />
        </g>
      );

    case "magnifier":
      return (
        <g id="costume_magnifier" data-layer="costume magnifier" aria-label="Detective magnifying glass accessory">
          {/* Brass handle held by right arm nub */}
          <line x1="162" y1="124" x2="176" y2="138" stroke="#B45309" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="161" y1="123" x2="164" y2="126" stroke="#D97706" strokeWidth="4.5" strokeLinecap="round" />
          {/* Brass outer rim */}
          <circle cx="156" cy="116" r="13" fill="#D97706" fillOpacity="0.2" stroke="#F59E0B" strokeWidth="2.5" />
          {/* Glass lens with light reflection */}
          <circle cx="156" cy="116" r="11" fill="#E0F2FE" fillOpacity="0.45" stroke="#BAE6FD" strokeWidth="1" />
          <path
            d="M 150 110 Q 155 107 160 110"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.8"
          />
        </g>
      );

    default:
      return null;
  }
}
