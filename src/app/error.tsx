"use client";

import React, { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error locally without external network telemetry
    console.error("Scenario Error Boundary caught:", error);
  }, [error]);

  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="relative w-full max-w-md border border-line bg-ink/90 p-6 sm:p-8 rounded-lg shadow-2xl backdrop-blur-md space-y-6">
        {/* Status Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-horn/10 border border-horn/40 text-horn font-mono text-xs tracking-widest uppercase">
          <span className="h-2 w-2 rounded-full bg-horn" />
          <span>[SYSTEM: EXECUTION_ERROR]</span>
        </div>

        {/* Plain Error Message */}
        <div className="space-y-2">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-feather">
            Something went wrong
          </h1>
          <p className="font-mono text-xs sm:text-sm text-mist">
            An unexpected error interrupted this Scenario.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded border border-star/60 bg-ink-2 text-feather hover:border-star hover:text-star font-mono text-xs uppercase tracking-wider transition-colors focus:ring-2 focus:ring-star focus:outline-none cursor-pointer"
          >
            Try again
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded border border-line bg-ink text-mist hover:text-feather hover:border-mist font-mono text-xs uppercase tracking-wider transition-colors focus:ring-2 focus:ring-star focus:outline-none"
          >
            Return to home &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}
