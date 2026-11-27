import React from "react";
import type { World } from "@/content/types";

interface WorldGlyphProps {
  world: World;
  className?: string;
}

/**
 * Original line-art glyph per project world. Uses currentColor so the card's
 * world accent colors it. Decorative only (aria-hidden).
 */
export function WorldGlyph({ world, className = "" }: WorldGlyphProps) {
  const common = {
    viewBox: "0 0 120 120",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
    focusable: false,
  };

  if (world === "edge-cloud") {
    return (
      <svg {...common}>
        <path d="M14 84 L42 52 L70 62 L104 28" strokeWidth={3} />
        <path d="M42 52 L52 96 L88 90 L70 62" opacity={0.55} />
        <path d="M14 84 L52 96" opacity={0.35} />
        <circle cx="14" cy="84" r="6" />
        <circle cx="42" cy="52" r="5" />
        <circle cx="70" cy="62" r="5" />
        <circle cx="104" cy="28" r="7" />
        <circle cx="52" cy="96" r="4" opacity={0.6} />
        <circle cx="88" cy="90" r="4" opacity={0.6} />
      </svg>
    );
  }

  if (world === "raft") {
    return (
      <svg {...common}>
        <path d="M60 22 L24 90 L96 90 Z" opacity={0.55} />
        <circle cx="60" cy="22" r="11" strokeWidth={3} />
        <circle cx="60" cy="22" r="18" opacity={0.4} />
        <circle cx="24" cy="90" r="9" />
        <circle cx="96" cy="90" r="9" />
        <path d="M51 6 L55 -0.5 L60 4 L65 -0.5 L69 6" transform="translate(0 6)" opacity={0.8} />
      </svg>
    );
  }

  // z3
  return (
    <svg {...common}>
      <path d="M60 10 L100 26 V58 C100 82 82 100 60 110 C38 100 20 82 20 58 V26 Z" strokeWidth={3} />
      <path d="M40 60 L55 76 L84 42" strokeWidth={4} />
      <path d="M32 34 H46 M74 34 H88" opacity={0.4} />
    </svg>
  );
}

export default WorldGlyph;
