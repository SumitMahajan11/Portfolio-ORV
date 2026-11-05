import Link from "next/link";
import { HeroScene, HeroProvider } from "@/components/dokja";
import { ScenarioSelect } from "@/components/scenario-select";
import { EdgeCloudWorld, RaftWorld, Z3World } from "@/components/worlds";
import { SideQuestsSection } from "@/components/side-quests";
import { ReadersRecord } from "@/components/readers-record";
import { FinaleSection } from "@/components/finale";
import { ConstellationGlobalLayer } from "@/lib/reader";

export default function Home() {
  return (
    <HeroProvider>
      <main className="relative bg-void text-feather overflow-x-hidden">
        {/* Act 1 Hero Scene (100svh intro container) */}
        <HeroScene />

        {/* Act 2 Scenario Select Section */}
        <ScenarioSelect />

        {/* Act 3 Flagship World: Edge-Cloud Orchestrator */}
        <EdgeCloudWorld />

        {/* Act 3 Flagship World: Ratify (Raft) */}
        <RaftWorld />

        {/* Act 3 Flagship World: iac-verifier (Z3) */}
        <Z3World />

        {/* Act 3 Side Quests Section */}
        <SideQuestsSection />

        {/* Act 3 Reader's Record (Skills as ORV Item Info Boxes) */}
        <ReadersRecord />

        {/* Act 6 Finale & Contact Form Scene */}
        <FinaleSection />

        {/* Global Floating Constellation Overlay */}
        <ConstellationGlobalLayer />

        {/* Footer Navigation & Dev-Only Links */}
        <section className="relative z-10 w-full max-w-4xl mx-auto px-4 py-16 flex flex-col items-center text-center space-y-6">
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
        </section>
      </main>
    </HeroProvider>
  );
}
