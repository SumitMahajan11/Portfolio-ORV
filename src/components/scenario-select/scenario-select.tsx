"use client";

import React, { useRef, useCallback } from "react";
import { projects } from "@/content/projects";
import type { Project } from "@/content/types";
import { renderField } from "@/components/ui/fill-badge";
import { SystemWindow } from "@/components/system-window";
import { useMode } from "@/lib/flags";
import { useScene, gsap } from "@/lib/motion";

export interface ScenarioSelectProps {
  className?: string;
}

/**
 * Helper to dispatch Biyoo reactions
 */
function triggerBiyooReaction(state: "curious" | "happy", line: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("biyoo:action", {
        detail: { state, line },
      })
    );
  }
}

/**
 * Flagship Scenario Card
 */
interface FlagshipCardProps {
  project: Project;
  onHover: () => void;
  onClick: () => void;
}

function FlagshipCard({ project, onHover, onClick }: FlagshipCardProps) {
  const isReady = Boolean(project.worldReady);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      onClick();
    }
  };

  return (
    <div
      data-world={project.world}
      tabIndex={0}
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="scenario-card-item group relative flex flex-col justify-between border border-line bg-ink/90 p-5 sm:p-6 backdrop-blur-sm shadow-xl transition-all duration-200 hover:-translate-y-2 focus-visible:-translate-y-2 hover:border-[var(--world-primary,var(--star))] focus-visible:border-[var(--world-primary,var(--star))] cursor-pointer select-none"
      role="article"
      aria-label={`Scenario: ${project.title}`}
    >
      {/* Corner ticks with world accent color */}
      <span
        className="pointer-events-none absolute -top-[1px] -left-[1px] h-2.5 w-2.5 border-t-2 border-l-2 border-[var(--world-primary,var(--star))]"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -top-[1px] -right-[1px] h-2.5 w-2.5 border-t-2 border-r-2 border-[var(--world-primary,var(--star))]"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -bottom-[1px] -left-[1px] h-2.5 w-2.5 border-b-2 border-l-2 border-[var(--world-primary,var(--star))]"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -bottom-[1px] -right-[1px] h-2.5 w-2.5 border-b-2 border-r-2 border-[var(--world-primary,var(--star))]"
        aria-hidden="true"
      />

      {/* Subtle scan-line overlay */}
      <div
        className="pointer-events-none absolute inset-0 system-window-scanlines opacity-40"
        aria-hidden="true"
      />

      {/* Card Content */}
      <div className="relative z-10 space-y-4">
        {/* Scenario Status Label */}
        <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
          <span className="font-mono text-xs tracking-wider uppercase text-[var(--world-primary,var(--star))] font-semibold">
            [SCENARIO &bull; {project.world.toUpperCase()}]
          </span>
          <span className="h-2 w-2 rounded-full bg-[var(--world-accent,var(--star))] animate-pulse" />
        </div>

        {/* Title */}
        <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-feather group-hover:text-[var(--world-primary,var(--star))] transition-colors">
          {project.title}
        </h3>

        {/* One-Liner */}
        <div className="font-ui text-sm text-mist leading-relaxed min-h-[3rem]">
          {renderField(project.oneLiner)}
        </div>
      </div>

      {/* Footer / Begin Action */}
      <div className="relative z-10 pt-5 mt-4 border-t border-line/60 flex items-center justify-between">
        <span className="font-mono text-[11px] text-mist/70 uppercase tracking-widest">
          {isReady ? "Branch: Active" : "Phase 2 Branch"}
        </span>

        {isReady ? (
          <a
            href={`#${project.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="min-h-[44px] min-w-[44px] px-4 py-2 rounded border border-[var(--world-primary,var(--star))] bg-[var(--world-primary,var(--star))]/10 text-[var(--world-primary,var(--star))] font-mono text-xs tracking-wider uppercase inline-flex items-center justify-center gap-1.5 transition-colors hover:bg-[var(--world-primary,var(--star))]/20 focus:outline-none focus:ring-2 focus:ring-[var(--world-primary,var(--star))]"
            aria-label={`Begin Scenario: ${project.title}`}
          >
            <span>Begin</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="min-h-[44px] min-w-[44px] px-4 py-2 rounded border border-line bg-ink-2/50 text-mist/50 font-mono text-xs tracking-wider uppercase inline-flex items-center justify-center cursor-not-allowed select-none"
          >
            Opens in Phase 2
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Side Quest Card
 */
interface SideQuestCardProps {
  project: Project;
  onHover: () => void;
  onClick: () => void;
}

function SideQuestCard({ project, onHover, onClick }: SideQuestCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      onClick();
    }
  };

  return (
    <div
      data-world={project.world}
      tabIndex={0}
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="scenario-card-item group relative flex flex-col justify-between border border-line/80 bg-ink/70 p-4 rounded-sm backdrop-blur-xs shadow-md transition-all duration-200 hover:-translate-y-2 focus-visible:-translate-y-2 hover:border-[var(--world-primary,var(--mist))] focus-visible:border-[var(--world-primary,var(--mist))] cursor-pointer min-h-[44px] select-none"
      role="article"
      aria-label={`Side Quest: ${project.title}`}
    >
      {/* Corner indicator */}
      <span
        className="pointer-events-none absolute -top-[1px] -left-[1px] h-2 w-2 border-t-2 border-l-2 border-[var(--world-primary,var(--mist))]"
        aria-hidden="true"
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--world-primary,var(--mist))]">
              [SIDE QUEST]
            </span>
            {!project.published && (
              <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 border border-amber-500/60 bg-amber-500/10 text-amber-400 rounded">
                DEV: UNPUBLISHED
              </span>
            )}
          </div>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--world-primary,var(--mist))]/60" />
        </div>

        <h4 className="font-display text-base font-semibold text-feather group-hover:text-[var(--world-primary,var(--star))] transition-colors">
          {project.title}
        </h4>

        <div className="font-ui text-xs text-mist leading-relaxed line-clamp-3">
          {renderField(project.oneLiner)}
        </div>
      </div>

      <div className="pt-3 mt-3 border-t border-line/40 flex items-center justify-between text-[10px] font-mono text-mist/60">
        <span>STATUS: LOGGED</span>
        <span className="group-hover:text-feather transition-colors">&rarr;</span>
      </div>
    </div>
  );
}

/**
 * ScenarioSelect Component:
 * Act 2 section rendering flagship Scenario cards and Side Quests row.
 *
 * Rules:
 * - Dynamic content resolution from src/content/projects.ts
 * - Render all 3 flagship cards (Edge-Cloud, Ratify, iac-verifier) in both Full and Light modes
 * - Light mode: no animation, final state shown immediately
 * - Full mode: staggered entrance via ScrollTrigger
 * - Card lifts on hover/focus (max 8px translateY)
 * - Biyoo reactions: "curious" on hover/focus, "happy" on click with "Good choice."
 * - Section heading in SystemWindow notification style
 * - Mobile responsive: 1 column on small screens, min 44px touch targets
 */
export function ScenarioSelect({ className = "" }: ScenarioSelectProps) {
  const containerRef = useRef<HTMLElement>(null);
  const { mode, reducedMotion } = useMode();

  const isProduction = process.env.NODE_ENV === "production";

  // Flagship projects: show all 3 flagship scenarios in both modes
  // Ready worlds show "Begin ->"; unready ones show disabled "Opens in Phase 2"
  const flagshipProjects = projects.filter((p) => p.status === "flagship");

  // Side quests: in production render only if published === true; in dev show all
  const sideQuestProjects = projects.filter((p) => {
    if (p.status !== "sidequest") return false;
    if (isProduction) {
      return Boolean(p.published);
    }
    return true;
  });

  // Hover and click callbacks
  const handleCardHover = useCallback(() => {
    triggerBiyooReaction("curious", "Ooh?");
  }, []);

  const handleCardClick = useCallback(() => {
    triggerBiyooReaction("happy", "Good choice.");
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("biyoo:sound", { detail: { sound: "chirp" } })
      );
    }
  }, []);

  // Entrance animation using useScene + ScrollTrigger
  useScene(
    () => {
      if (!containerRef.current) return;

      const cardElements = containerRef.current.querySelectorAll(".scenario-card-item");
      if (cardElements.length === 0) return;

      // In Light mode or Reduced Motion: strictly no animation, final state shown immediately
      if (mode === "light" || reducedMotion) {
        gsap.set(cardElements, { opacity: 1, y: 0, clearProps: "transform,opacity" });
        return;
      }

      // In Full mode: staggered entrance via ScrollTrigger
      gsap.from(cardElements, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          once: true,
        },
        y: 28,
        opacity: 0,
        stagger: 0.1,
        duration: 0.65,
        ease: "power3.out",
      });
    },
    { scope: containerRef, dependencies: [reducedMotion, mode, flagshipProjects.length] }
  );

  return (
    <section
      ref={containerRef}
      id="scenario-select"
      className={`relative z-20 w-full max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 bg-void ${className}`}
      aria-labelledby="scenario-select-heading"
    >
      {/* Section Heading: ORV SystemWindow notification */}
      <div className="max-w-md mx-auto mb-12 sm:mb-16">
        <SystemWindow title="SYSTEM NOTIFICATION">
          <div className="text-center space-y-1.5 py-1">
            <h2
              id="scenario-select-heading"
              className="font-display text-lg sm:text-xl font-bold tracking-wider text-star uppercase"
            >
              Choose your Scenario.
            </h2>
            <p className="font-mono text-xs text-mist">
              Select an active branch to begin reading the story-portfolio.
            </p>
          </div>
        </SystemWindow>
      </div>

      {/* Flagship Scenarios Grid */}
      <div className="space-y-6 mb-16 sm:mb-20">
        <div className="flex items-center gap-3 border-b border-line pb-3">
          <span className="font-mono text-xs text-star uppercase tracking-widest">
            [MAIN_SCENARIOS]
          </span>
          <span className="h-px flex-1 bg-line/60" />
          <span className="font-mono text-[11px] text-mist">
            {flagshipProjects.length} AVAILABLE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {flagshipProjects.map((project) => (
            <FlagshipCard
              key={project.id}
              project={project}
              onHover={handleCardHover}
              onClick={handleCardClick}
            />
          ))}
        </div>
      </div>

      {/* Side Quests Row */}
      {sideQuestProjects.length > 0 && (
        <div className="space-y-6 pt-6 border-t border-line/60">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-mist uppercase tracking-widest">
              [SIDE_QUESTS]
            </span>
            <span className="h-px flex-1 bg-line/40" />
            <span className="font-mono text-[11px] text-mist/70">
              {sideQuestProjects.length} DISCOVERIES
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {sideQuestProjects.map((project) => (
              <SideQuestCard
                key={project.id}
                project={project}
                onHover={handleCardHover}
                onClick={handleCardClick}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default ScenarioSelect;
