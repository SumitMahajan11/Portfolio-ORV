"use client";

import React, { useState } from "react";
import { skills } from "@/content/skills";
import type { Skill } from "@/content/types";
import { SkillItemCard } from "./skill-item-card";
import { SkillSystemWindow } from "./skill-system-window";

export interface ReadersRecordProps {
  className?: string;
}

/**
 * ReadersRecord Component:
 * ORV-styled skills inventory: Reader's Record.
 *
 * Rules:
 * - Displays a grid of items (one per skill in src/content/skills.ts)
 * - Skills with no proofProjectIds are strictly filtered out and never rendered
 * - In production: skills with null stories are hidden (or story is null-safe)
 * - NO levels, grades, percentages, bars, stars, or rarity labels
 * - Hover / focus / tap opens an item-inspection SystemWindow
 * - Focus trap, keyboard accessible (Enter/Space opens, Escape closes)
 * - Evidence links trigger Biyoo "proud" reaction
 */
export function ReadersRecord({ className = "" }: ReadersRecordProps) {
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  // Requirement 3: Skills with no proofProjectIds are NOT rendered
  const validSkills = skills.filter(
    (s) => s.proofProjectIds && s.proofProjectIds.length > 0
  );

  return (
    <section
      id="readers-record"
      className={`relative z-20 w-full py-24 sm:py-32 px-4 sm:px-6 bg-[radial-gradient(ellipse_at_top,_rgba(14,23,38,0.7)_0%,_rgba(7,8,11,1)_85%)] text-feather ${className}`}
      aria-labelledby="readers-record-title"
    >
      <div className="max-w-5xl mx-auto space-y-12 sm:space-y-16">
        {/* Section Header */}
        <div className="space-y-3 border-b border-line/60 pb-6 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-star font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-star animate-pulse" />
            <span className="uppercase tracking-widest">[ACT 3 &bull; READER&apos;S RECORD]</span>
          </div>

          <h2
            id="readers-record-title"
            className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-feather"
          >
            The Reader&apos;s Record (Skills)
          </h2>

          <p className="font-ui text-sm sm:text-base text-mist max-w-2xl leading-relaxed">
            Technical capabilities documented as ORV item records. Governed strictly by mathematical proofs and system scenario verification — no arbitrary levels, bars, or percentages.
          </p>
        </div>

        {/* Grid of Skill Items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {validSkills.map((skill) => (
            <SkillItemCard
              key={skill.name}
              skill={skill}
              isSelected={selectedSkill?.name === skill.name}
              onSelect={() => setSelectedSkill(skill)}
            />
          ))}
        </div>

        {/* Modal Item-Inspection SystemWindow */}
        {selectedSkill && (
          <SkillSystemWindow
            skill={selectedSkill}
            onClose={() => setSelectedSkill(null)}
          />
        )}

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

export default ReadersRecord;
