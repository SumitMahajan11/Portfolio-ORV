import React from "react";
import Link from "next/link";

export interface ArchiveHeroProps {
  className?: string;
}

/**
 * ArchiveHero Component
 *
 * Implements hero-H1 specification:
 * - Server-rendered, un-pinned, un-scrubbed hero occupying full viewport (100dvh)
 * - Transparent background allowing LivingWall compositor to show through
 * - No intro sweep or entrance animation; visible in server HTML at full opacity
 * - Heading: <h1>SUMIT MAHAJAN</h1> (primary page heading & LCP target)
 * - Tagline: "I build systems and show the proof."
 * - Facts line backed strictly by identity.ts and docs/03
 * - Two CTA buttons linking to existing sections (#scenario-select, #readers-record)
 * - CSS-only, reduced-motion safe scroll cue
 * - Companion Biyoo mounted as persistent global companion in layout
 */
export function ArchiveHero({ className = "" }: ArchiveHeroProps) {
  return (
    <section
      id="hero-scene"
      aria-label="Sumit Mahajan Portfolio Archive"
      className={`relative w-full min-h-[100dvh] flex flex-col justify-between items-center text-center px-4 py-10 sm:py-16 bg-transparent select-none z-10 ${className}`}
    >
      {/* Top spacer for vertical balance below header */}
      <div className="w-full h-8 sm:h-12 pointer-events-none" aria-hidden="true" />

      {/* Main Hero Header & Narrative Proof Block */}
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center my-auto px-2">
        <h1 className="font-display font-bold text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-wider text-feather uppercase select-text">
          SUMIT MAHAJAN
        </h1>

        <p className="font-ui text-lg sm:text-2xl md:text-3xl text-feather/90 mt-4 sm:mt-6 max-w-2xl mx-auto leading-relaxed font-normal select-text">
          I build systems and show the proof.
        </p>

        <p className="font-mono text-xs sm:text-sm text-mist mt-3 sm:mt-4 max-w-2xl mx-auto tracking-wide leading-relaxed select-text">
          Third-year CSE student &middot; Pune &middot; distributed systems, formal verification, ML infrastructure
        </p>

        {/* Action CTAs: >= 44px touch targets, visible focus rings, logical tab order */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 sm:mt-10 w-full max-w-md mx-auto">
          <Link
            href="#scenario-select"
            data-biyoo-point
            className="w-full sm:w-auto min-h-[44px] h-[44px] inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-star text-ink font-mono font-medium text-sm tracking-wide transition-colors hover:bg-star/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-star focus-visible:ring-offset-2 focus-visible:ring-offset-void shadow-lg"
          >
            See the projects
          </Link>

          <Link
            href="#readers-record"
            data-biyoo-point
            className="w-full sm:w-auto min-h-[44px] h-[44px] inline-flex items-center justify-center px-6 py-2.5 rounded-lg border border-line bg-ink/80 text-feather font-mono font-medium text-sm tracking-wide transition-colors hover:border-star hover:text-star focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-star focus-visible:ring-offset-2 focus-visible:ring-offset-void shadow-lg"
          >
            Read the evidence
          </Link>
        </div>
      </div>

      {/* CSS-only Scroll Cue: Reduced-Motion Safe */}
      <div
        className="pb-2 sm:pb-4 flex flex-col items-center justify-center gap-2 select-none pointer-events-none"
        aria-hidden="true"
      >
        <span className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-mist">
          SCROLL
        </span>
        <svg
          className="w-4 h-4 text-mist animate-bounce motion-reduce:animate-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}

export default ArchiveHero;

