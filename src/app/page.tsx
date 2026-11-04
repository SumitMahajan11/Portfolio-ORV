import Link from "next/link";
import { HeroScene, HeroProvider } from "@/components/dokja";
import { ScenarioSelect } from "@/components/scenario-select";

export default function Home() {
  return (
    <HeroProvider>
      <main className="relative bg-void text-feather overflow-x-hidden">
        {/* Act 1 Hero Scene (100svh intro container) */}
        <HeroScene />

        {/* Act 2 Scenario Select Section */}
        <ScenarioSelect />

        {/* Story Intro / Scenario Header & Navigation */}
        <section className="relative z-10 w-full max-w-4xl mx-auto px-4 py-16 flex flex-col items-center text-center space-y-8">
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

          <div className="space-y-4 pt-4 border-t border-line/60 w-full max-w-md">
            <div>
              <Link
                href="/skip"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-star/40 bg-star/10 text-star hover:bg-star/20 font-mono text-sm tracking-wide transition-colors focus:ring-2 focus:ring-star focus:outline-none"
              >
                Skip to plain accessible version &rarr;
              </Link>
            </div>

            {process.env.NODE_ENV !== "production" && (
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
            )}
          </div>
        </section>
      </main>
    </HeroProvider>
  );
}
