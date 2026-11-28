import React from "react";
import Link from "next/link";
import { heroProof } from "@/content/hero-proof";
import { WorldGlyph } from "@/components/scenario-select/world-glyph";
import { HeroBeam } from "./hero-beam";

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
      <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center my-auto px-2">
        {/* Soft vignette behind the text keeps the name legible over the wall */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[70%] w-[min(90vw,64rem)] -translate-x-1/2 -translate-y-1/2"
          style={{ background: "radial-gradient(ellipse at center, rgba(7,8,11,0.6) 0%, rgba(7,8,11,0) 70%)" }}
          aria-hidden="true"
        />

        <h1 className="hero-name-glow font-display font-bold text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-[0.12em] text-feather uppercase select-text">
          SUMIT MAHAJAN
        </h1>

        {/* Static rule under the name; HeroBeam adds travelling light in Full mode */}
        <div className="relative mt-5 h-px w-48 sm:w-80 overflow-hidden bg-gradient-to-r from-transparent via-star/50 to-transparent" aria-hidden="true">
          <HeroBeam />
        </div>

        <p className="font-ui text-lg sm:text-2xl md:text-3xl text-feather/90 mt-4 sm:mt-6 max-w-2xl mx-auto leading-relaxed font-normal select-text">
          I build systems and show the proof.
        </p>

        <p className="font-mono text-xs sm:text-sm text-mist mt-3 sm:mt-4 max-w-2xl mx-auto tracking-wide leading-relaxed select-text">
          Third-year CSE student &middot; Pune &middot; distributed systems, formal verification, ML infrastructure
        </p>

        {/* Proof strip: three verified figures, each pointing at its project */}
        <ul className="mt-6 grid w-full max-w-3xl grid-cols-1 gap-2 md:mt-8 md:gap-3 md:grid-cols-3 select-none" aria-label="Verified proof">
          {heroProof.map((card) => (
            <li key={card.world} data-world={card.world} className="contents">
              <Link
                href="#scenario-select"
                data-biyoo-point
                className="group relative block overflow-hidden border border-line bg-ink/75 px-4 py-3 md:p-4 text-left backdrop-blur-sm transition-transform duration-200 hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--world-primary)]"
              >
                <span className="absolute inset-x-0 top-0 h-px bg-[var(--world-primary)]" aria-hidden="true" />
                <span
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
                  style={{ background: "radial-gradient(ellipse at 20% 0%, color-mix(in srgb, var(--world-primary) 22%, transparent), transparent 65%)" }}
                  aria-hidden="true"
                />
                <WorldGlyph
                  world={card.world}
                  className="pointer-events-none absolute -bottom-4 -right-4 hidden h-20 w-20 text-[var(--world-primary)] opacity-15 md:block transition-opacity duration-300 group-hover:opacity-35"
                />
                <span className="relative flex items-baseline justify-between gap-3 md:block">
                  <span className="block font-mono text-xs sm:text-[13px] uppercase tracking-widest text-[var(--world-primary)]">
                    {card.label}
                  </span>
                  <span className="block font-display text-lg font-bold text-feather md:mt-2 md:text-2xl">
                    {card.metric}
                  </span>
                </span>
                <span className="relative mt-1 hidden max-w-[13rem] font-ui text-xs sm:text-[13px] leading-snug text-mist md:block">
                  {card.detail}
                </span>
                {card.link && card.linkLabel && (
                  <span className="relative mt-2 inline-flex items-center gap-1 font-mono text-xs sm:text-[13px] text-star group-hover:text-feather underline underline-offset-4 transition-colors">
                    {card.linkLabel}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>

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
        <span className="font-mono text-xs sm:text-[13px] uppercase tracking-widest text-mist">
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

