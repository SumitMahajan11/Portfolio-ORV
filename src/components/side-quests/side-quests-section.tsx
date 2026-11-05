"use client";

import React from "react";
import { projects } from "@/content/projects";
import { SideQuestCard } from "./side-quest-card";

export interface SideQuestsSectionProps {
  className?: string;
}

/**
 * SideQuestsSection Component:
 * Container section rendering candidate side quest cards from project content.
 *
 * Rules:
 * - Scoped within [data-world="sidequest"]
 * - Driven strictly by projects in /src/content/projects.ts
 * - Renders only projects that exist in content (no newly invented projects)
 * - In production: hides projects with null repo/demo unless explicitly labeled "in design"
 * - In development: shows dev badge for all candidates
 */
export function SideQuestsSection({ className = "" }: SideQuestsSectionProps) {
  const sideQuests = projects.filter((p) => p.status === "sidequest");

  return (
    <section
      id="side-quests"
      data-world="sidequest"
      className={`relative z-20 w-full py-24 sm:py-32 px-4 sm:px-6 bg-[radial-gradient(ellipse_at_bottom,_rgba(14,17,24,0.9)_0%,_rgba(7,8,11,1)_85%)] text-feather ${className}`}
      aria-labelledby="side-quests-title"
    >
      <div className="max-w-5xl mx-auto space-y-12 sm:space-y-16">
        {/* Section Header */}
        <div className="space-y-3 border-b border-line/60 pb-6 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-star font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-star animate-pulse" />
            <span className="uppercase tracking-widest">[ACT 3 &bull; SIDE QUESTS]</span>
          </div>
          <h2
            id="side-quests-title"
            className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-feather"
          >
            Side Quests &amp; Field Expeditions
          </h2>
          <p className="font-ui text-sm sm:text-base text-mist max-w-2xl leading-relaxed">
            Secondary systems, applied machine learning prototypes, and hackathon challenges. Governed strictly by verified evidence; unverified designs remain explicitly marked.
          </p>
        </div>

        {/* Side Quest Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {sideQuests.map((quest) => (
            <SideQuestCard key={quest.id} project={quest} />
          ))}
        </div>

        {/* Return to Navigation Link */}
        <div className="flex items-center justify-center pt-6">
          <a
            href="#scenario-select"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded border border-star/40 bg-ink-2/60 hover:bg-ink text-star font-mono text-xs tracking-wider uppercase transition-colors"
          >
            &uarr; Return to Scenario Select
          </a>
        </div>
      </div>
    </section>
  );
}

export default SideQuestsSection;
