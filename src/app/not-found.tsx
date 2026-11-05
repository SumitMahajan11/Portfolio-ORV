import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="relative w-full max-w-md border border-line bg-ink/90 p-6 sm:p-8 rounded-lg shadow-2xl backdrop-blur-md space-y-6">
        {/* Corner HUD ticks */}
        <span
          className="absolute -top-[1px] -left-[1px] w-2 h-2 border-t-2 border-l-2 border-star"
          aria-hidden="true"
        />
        <span
          className="absolute -top-[1px] -right-[1px] w-2 h-2 border-t-2 border-r-2 border-star"
          aria-hidden="true"
        />
        <span
          className="absolute -bottom-[1px] -left-[1px] w-2 h-2 border-b-2 border-l-2 border-star"
          aria-hidden="true"
        />
        <span
          className="absolute -bottom-[1px] -right-[1px] w-2 h-2 border-b-2 border-r-2 border-star"
          aria-hidden="true"
        />

        {/* Biyoo / Scenario Status */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-star/10 border border-star/30 text-star font-mono text-xs tracking-widest uppercase">
          <span className="h-2 w-2 rounded-full bg-star animate-pulse" />
          <span>[SYSTEM: SCENARIO_404]</span>
        </div>

        {/* Biyoo 404 One Line */}
        <div className="space-y-3">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-feather">
            404 — Page Not Found
          </h1>
          <p className="font-mono text-sm sm:text-base text-star">
            &ldquo;This page does not exist in any Scenario.&rdquo;
          </p>
        </div>

        {/* Return Button */}
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded border border-star/60 bg-ink-2 text-feather hover:border-star hover:text-star font-mono text-xs uppercase tracking-wider transition-colors focus:ring-2 focus:ring-star focus:outline-none"
          >
            Return to the Story &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}
