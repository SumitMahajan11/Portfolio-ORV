"use client";

import React from "react";
import type { Skill } from "@/content/types";
import { projects } from "@/content/projects";

export interface SkillItemCardProps {
  skill: Skill;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * SkillItemCard Component:
 * ORV-styled inventory/skill slot item.
 * Strictly no levels, grades, bars, percentages, or rarity stars.
 */
export function SkillItemCard({
  skill,
  isSelected,
  onSelect,
}: SkillItemCardProps) {
  // Map proof project titles
  const proofProjects = skill.proofProjectIds
    .map((id) => projects.find((p) => p.id === id))
    .filter(Boolean);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      aria-haspopup="dialog"
      aria-expanded={isSelected}
      className={`group relative flex flex-col justify-between p-4 sm:p-5 rounded border bg-ink/80 backdrop-blur-sm transition-all duration-200 cursor-pointer select-none min-h-[110px] focus:outline-none focus-visible:ring-2 focus-visible:ring-star ${
        isSelected
          ? "border-star bg-ink-2 shadow-[0_0_16px_rgba(94,225,230,0.25)]"
          : "border-line/70 hover:border-star/60 hover:bg-ink-2/60"
      }`}
    >
      {/* Corner Ticks */}
      <span
        className={`pointer-events-none absolute -top-[1px] -left-[1px] h-2 w-2 border-t border-l transition-colors ${
          isSelected ? "border-star" : "border-line/80 group-hover:border-star/60"
        }`}
        aria-hidden="true"
      />
      <span
        className={`pointer-events-none absolute -top-[1px] -right-[1px] h-2 w-2 border-t border-r transition-colors ${
          isSelected ? "border-star" : "border-line/80 group-hover:border-star/60"
        }`}
        aria-hidden="true"
      />
      <span
        className={`pointer-events-none absolute -bottom-[1px] -left-[1px] h-2 w-2 border-b border-l transition-colors ${
          isSelected ? "border-star" : "border-line/80 group-hover:border-star/60"
        }`}
        aria-hidden="true"
      />
      <span
        className={`pointer-events-none absolute -bottom-[1px] -right-[1px] h-2 w-2 border-b border-r transition-colors ${
          isSelected ? "border-star" : "border-line/80 group-hover:border-star/60"
        }`}
        aria-hidden="true"
      />

      {/* Item Slot Header */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between font-mono text-[10px] text-mist/70 uppercase tracking-widest">
          <span>[ITEM_RECORD]</span>
          <span className="text-star/80 group-hover:text-star">Inspect &rarr;</span>
        </div>

        <h3 className="font-mono text-sm sm:text-base font-bold text-feather group-hover:text-star transition-colors">
          {skill.name}
        </h3>
      </div>

      {/* Proof Scenarios Summary */}
      <div className="pt-2 border-t border-line/40 flex items-center justify-between text-[11px] font-mono text-mist">
        <span className="text-[10px] uppercase tracking-wider text-mist/60">
          Proof:
        </span>
        <span className="text-star truncate max-w-[140px] text-right font-medium">
          {proofProjects.map((p) => p?.title).join(", ") || "Scenario"}
        </span>
      </div>
    </div>
  );
}

export default SkillItemCard;

