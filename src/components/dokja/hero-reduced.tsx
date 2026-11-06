import React from "react";
import { DokjaFigure } from "./dokja-figure";
import { SystemWindow } from "@/components/system-window";
import { Biyoo } from "@/components/biyoo";

export interface HeroReducedProps {
  className?: string;
}

export function HeroReduced({ className = "" }: HeroReducedProps) {
  return (
    <div
      id="hero-scene-reduced"
      className={`w-full bg-void text-feather flex flex-col items-center py-12 px-4 space-y-24 ${className}`}
      aria-label="Dokja Transformation - Reduced Motion Accessible Overview"
    >
      {/* Frame 1: Stage 1 (Reading) */}
      <section
        aria-labelledby="reduced-frame-1-title"
        className="w-full max-w-3xl flex flex-col items-center text-center space-y-6 border-b border-line pb-16"
      >
        <span className="font-mono text-xs uppercase tracking-widest text-star">
          [STAGE 1: READING]
        </span>
        <h2
          id="reduced-frame-1-title"
          className="font-display text-2xl sm:text-3xl font-bold text-feather"
        >
          A Reader in the Starlit Void
        </h2>
        <div className="relative w-[280px] h-[360px] flex items-center justify-center">
          <DokjaFigure stage={1} isReduced={true} />
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <div className="max-w-sm">
            <SystemWindow title="SYSTEM NOTIFICATION">
              <p className="text-xs text-star">A Reader has been detected.</p>
            </SystemWindow>
          </div>
          <Biyoo size={110} />
        </div>
      </section>

      {/* Frame 2: Stage 5 (Wings Emerge) */}
      <section
        aria-labelledby="reduced-frame-2-title"
        className="w-full max-w-3xl flex flex-col items-center text-center space-y-6 border-b border-line pb-16"
      >
        <span className="font-mono text-xs uppercase tracking-widest text-star">
          [STAGE 5: WINGS EMERGE]
        </span>
        <h2
          id="reduced-frame-2-title"
          className="font-display text-2xl sm:text-3xl font-bold text-feather"
        >
          The Horns Awaken, Wings Unfold
        </h2>
        <p className="font-ui text-sm text-mist max-w-md">
          Horns emerge with a cold red rim light as white wings unfold from behind the coat.
        </p>
        <div className="relative w-[340px] h-[380px] flex items-center justify-center">
          <DokjaFigure stage={5} isReduced={true} />
        </div>
      </section>

      {/* Frame 3: Stage 7 (Final Form) */}
      <section
        aria-labelledby="reduced-frame-3-title"
        className="w-full max-w-3xl flex flex-col items-center text-center space-y-6"
      >
        <span className="font-mono text-xs uppercase tracking-widest text-star">
          [STAGE 7: FINAL FORM]
        </span>
        <h2
          id="reduced-frame-3-title"
          className="font-display text-2xl sm:text-3xl font-bold text-feather"
        >
          A Scenario Has Arrived
        </h2>
        <div className="px-5 py-2.5 bg-ink border border-star text-star font-mono text-sm tracking-wider uppercase">
          A Scenario has arrived.
        </div>
        <div className="relative w-[360px] h-[400px] flex items-center justify-center pt-4">
          <DokjaFigure stage={7} isReduced={true} />
        </div>
      </section>
    </div>
  );
}
