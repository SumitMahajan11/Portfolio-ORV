import Link from "next/link";
import { DokjaPlaceholder } from "@/components/dokja";
import { BiyooPlaceholder } from "@/components/biyoo";

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-void text-feather flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background radial gradient to give cold starlit stage ambience */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(94,225,230,0.06)_0%,_rgba(7,8,11,1)_70%)] z-0"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center space-y-10">
        {/* Story Intro / Scenario Header */}
        <div className="space-y-3">
          <p className="font-mono text-xs tracking-widest text-star uppercase">
            [SCENARIO_0: PROLOGUE]
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-feather">
            Omniscient Reader&apos;s Viewpoint
          </h1>
          <p className="font-mono text-xs sm:text-sm text-mist max-w-lg mx-auto">
            The story-portfolio of Sumit Mahajan &mdash; Distributed Systems &amp; Correctness.
          </p>
        </div>

        {/* Character Placeholders Stage */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-12 sm:gap-16 my-4">
          {/* Dokja Placeholder (White wings & coat, phone, horns-dark) */}
          <div className="flex flex-col items-center">
            <DokjaPlaceholder width={260} height={340} />
          </div>

          {/* Biyoo Placeholder (Fluffy cotton blob, idle breathing bob) */}
          <div className="flex flex-col items-center">
            <BiyooPlaceholder size={200} />
          </div>
        </div>

        {/* Visible Skip Link & Route Navigation */}
        <div className="space-y-4 pt-4 border-t border-line/60 w-full max-w-md">
          <div>
            <Link
              href="/skip"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-star/40 bg-star/10 text-star hover:bg-star/20 font-mono text-sm tracking-wide transition-colors focus:ring-2 focus:ring-star focus:outline-none"
            >
              Skip to plain accessible version &rarr;
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs font-mono text-mist">
            <Link
              href="/style-test"
              className="hover:text-star underline underline-offset-4 decoration-mist/40 hover:decoration-star"
            >
              Style Test
            </Link>
            <span>&bull;</span>
            <Link
              href="/dev/mode"
              className="hover:text-star underline underline-offset-4 decoration-mist/40 hover:decoration-star"
            >
              Device Inspector
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
