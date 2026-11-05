"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMode } from "@/lib/flags";
import { useOptionalHeroContext } from "@/components/dokja/hero-context";

export interface CornerBountyButtonProps {
  className?: string;
}

/**
 * CornerBountyButton:
 * Persistent entry to /wanted (One Piece-style Wanted poster).
 *
 * Rules:
 * - Fixed at bottom-right (respects env(safe-area-inset-*))
 * - Real anchor link to /wanted with accessible name "Looking for the bounty board?"
 * - Mini Biyoo head holding a tiny "WANTED" sign
 * - Tooltip "Looking for the bounty board?" shown on hover/focus (desktop)
 * - Touch devices: always visible as a short label "Bounty board" (no hover needed)
 * - Hidden on /wanted route
 * - Hidden while hero is pinned in stages 4 to 7 to preserve transformation visuals
 * - Normal mode: gentle one-time wiggle after 10s of arrival (never repeating)
 * - Reduced mode: no wiggle animation
 * - Never overlaps companion Biyoo (bottom-left) or scroll hint (center)
 */
export function CornerBountyButton({ className = "" }: CornerBountyButtonProps) {
  const pathname = usePathname();
  const { reducedMotion } = useMode();
  const heroContext = useOptionalHeroContext();

  const [wiggling, setWiggling] = useState(false);
  const hasWiggledRef = useRef(false);

  // Hidden on /wanted route
  const isWantedPage = pathname === "/wanted";

  // Hide while hero is pinned in stages 4 to 7 to preserve cinematic wing transformation
  const isHeroTransforming = Boolean(
    heroContext &&
      heroContext.heroState.stage >= 4 &&
      heroContext.heroState.scrollProgress < 0.95
  );

  // Gentle one-time wiggle after 10 seconds of arrival (never repeats)
  useEffect(() => {
    if (reducedMotion || hasWiggledRef.current) return;

    const timer = setTimeout(() => {
      if (!hasWiggledRef.current) {
        hasWiggledRef.current = true;
        setWiggling(true);
        setTimeout(() => {
          setWiggling(false);
        }, 800);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [reducedMotion]);

  if (isWantedPage) {
    return null;
  }

  return (
    <aside
      aria-label="Bounty board quick access"
      className={`fixed z-40 transition-opacity duration-300 pointer-events-auto ${
        isHeroTransforming ? "opacity-0 pointer-events-none" : "opacity-100"
      } ${className}`}
      style={{
        bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
        right: "calc(1rem + env(safe-area-inset-right, 0px))",
      }}
    >
      <Link
        href="/wanted"
        aria-label="Looking for the bounty board?"
        className={`group relative flex items-center gap-2 p-1.5 sm:p-2 rounded-full border border-line/80 bg-ink/95 text-feather hover:border-star hover:text-star shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-star select-none ${
          wiggling ? "animate-bounty-wiggle" : ""
        }`}
      >
        {/* Mini Biyoo head holding a tiny WANTED sign */}
        <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 flex items-center justify-center">
          <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-md overflow-visible"
            aria-hidden="true"
          >
            {/* Fluffy cotton head */}
            <circle
              cx="24"
              cy="22"
              r="15"
              fill="#F4F6FA"
              stroke="#9FB4D6"
              strokeWidth="1.2"
            />

            {/* Horns in #2A0A10 */}
            <path
              d="M 16 11 C 12 5 9 1 7 -1 C 11 3 15 8 18 11 Z"
              fill="#2A0A10"
            />
            <path
              d="M 32 11 C 36 5 39 1 41 -1 C 37 3 33 8 30 11 Z"
              fill="#2A0A10"
            />

            {/* Eyes */}
            <circle cx="19.5" cy="19.5" r="1.6" fill="#0E1118" />
            <circle cx="28.5" cy="19.5" r="1.6" fill="#0E1118" />

            {/* Cheerful smile */}
            <path
              d="M 21.5 24 Q 24 26.5 26.5 24"
              stroke="#0E1118"
              strokeWidth="1.2"
              strokeLinecap="round"
            />

            {/* Tiny parchment sign: WANTED */}
            <g id="biyoo_tiny_sign">
              {/* Sign background */}
              <rect
                x="8"
                y="26"
                width="32"
                height="15"
                rx="2"
                fill="#E8D5B5"
                stroke="#8C6D46"
                strokeWidth="1"
              />
              {/* Sign text */}
              <text
                x="24"
                y="37"
                textAnchor="middle"
                fill="#2A0A10"
                fontSize="6.8"
                fontWeight="bold"
                letterSpacing="0.8"
                fontFamily="var(--font-cinzel), serif"
              >
                WANTED
              </text>

              {/* Two fluffy white paws holding the sign */}
              <ellipse
                cx="11"
                cy="27"
                rx="2.6"
                ry="2.2"
                fill="#FFFFFF"
                stroke="#9FB4D6"
                strokeWidth="0.8"
              />
              <ellipse
                cx="37"
                cy="27"
                rx="2.6"
                ry="2.2"
                fill="#FFFFFF"
                stroke="#9FB4D6"
                strokeWidth="0.8"
              />
            </g>
          </svg>
        </div>

        {/* Short label always visible on touch / mobile */}
        <span className="sm:hidden font-mono text-[11px] font-semibold text-star tracking-wide pr-2 whitespace-nowrap">
          Bounty board
        </span>

        {/* Hover/focus tooltip on desktop (pointer devices) */}
        <span
          role="tooltip"
          className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap px-3 py-1.5 rounded-lg border border-star/40 bg-ink/95 text-star font-mono text-xs shadow-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 hidden sm:block"
        >
          Looking for the bounty board? &rarr;
        </span>
      </Link>
    </aside>
  );
}
