"use client";

import React, { useState, useEffect, useRef } from "react";
import type { Project } from "@/content/types";
import { renderField } from "@/components/ui/fill-badge";
import { useMode } from "@/lib/flags";

export interface SideQuestCardProps {
  project: Project;
  className?: string;
}

/**
 * SideQuestCard Component:
 * Reusable card driven entirely by project content.
 *
 * Rules:
 * - Scoped styling per world/theme
 * - Biyoo costume slot hook
 * - Title as "Quest: <Name>"
 * - One-liner and 3 bullets (problem, what I built, what I learned)
 * - Proof links (repo, demo)
 * - If repo/demo is null:
 *     - If inDesign === true (explicitly stated in /docs/03): show "IN DESIGN" label in production.
 *     - If not verified: hide in production, show [DEV ONLY &bull; UNVERIFIED] in dev.
 * - 6-10s optional micro-animation playing once on entering viewport (transform/opacity only)
 * - Reduced mode: no animation
 */
export function SideQuestCard({ project, className = "" }: SideQuestCardProps) {
  const { reducedMotion, mode } = useMode();
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const isDev = process.env.NODE_ENV !== "production";
  const hasLinks = Boolean(project.links.repo || project.links.demo);
  const isExplicitlyInDesign = Boolean(project.inDesign);
  const shouldRender = isDev || hasLinks || isExplicitlyInDesign;

  // Viewport intersection observer for 6-10s one-shot micro-animation
  useEffect(() => {
    if (!shouldRender || reducedMotion || mode === "light") return;

    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setHasEnteredViewport(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldRender, reducedMotion, mode]);

  // Dispatch Biyoo interaction on hover
  const handleMouseEnter = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("biyoo:action", {
          detail: { state: "curious", line: "Side quest?" },
        })
      );
    }
  };

  // In production, if neither verified links exist nor explicitly labeled "in design", hide
  if (!shouldRender) {
    return null;
  }

  // Theme styling based on /docs/13 assignments
  const getThemeMeta = (id: string) => {
    switch (id) {
      case "echo":
        return {
          badge: "Bleach: Inner World / Sword Spirit",
          accentColor: "#4A90E2",
          borderColor: "rgba(74, 144, 226, 0.4)",
          bgGlow: "rgba(74, 144, 226, 0.08)",
          icon: "⚔",
        };
      case "lumina-clinical":
        return {
          badge: "One Piece: Winter Drum Island / Offline Care",
          accentColor: "#F472B6",
          borderColor: "rgba(244, 114, 182, 0.4)",
          bgGlow: "rgba(244, 114, 182, 0.08)",
          icon: "🌸",
        };
      case "reelclaim":
        return {
          badge: "Death Note: Verdict Stamp",
          accentColor: "#E11D48",
          borderColor: "rgba(225, 29, 72, 0.4)",
          bgGlow: "rgba(225, 29, 72, 0.08)",
          icon: "⚖",
        };
      case "backtrace":
      default:
        return {
          badge: "Detective Conan: Case Board",
          accentColor: "#D4B15F",
          borderColor: "rgba(212, 177, 95, 0.4)",
          bgGlow: "rgba(212, 177, 95, 0.08)",
          icon: "🔍",
        };
    }
  };

  const theme = getThemeMeta(project.id);
  const bullets = project.bullets || { problem: null, built: null, learned: null };

  return (
    <article
      ref={cardRef}
      id={`sidequest-${project.id}`}
      data-world="sidequest"
      onMouseEnter={handleMouseEnter}
      className={`relative flex flex-col justify-between rounded-lg border border-line bg-ink/80 p-6 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-[var(--card-accent,#5EE1E6)] focus-within:border-[var(--card-accent,#5EE1E6)] select-none ${className}`}
      style={
        {
          "--card-accent": theme.accentColor,
          backgroundColor: theme.bgGlow,
        } as React.CSSProperties
      }
    >
      {/* Corner Brackets */}
      <span
        className="pointer-events-none absolute -top-[1px] -left-[1px] h-3 w-3 border-t-2 border-l-2"
        style={{ borderColor: theme.accentColor }}
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -top-[1px] -right-[1px] h-3 w-3 border-t-2 border-r-2"
        style={{ borderColor: theme.accentColor }}
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -bottom-[1px] -left-[1px] h-3 w-3 border-b-2 border-l-2"
        style={{ borderColor: theme.accentColor }}
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -bottom-[1px] -right-[1px] h-3 w-3 border-b-2 border-r-2"
        style={{ borderColor: theme.accentColor }}
        aria-hidden="true"
      />

      {/* 6-10s Micro-Animation Element (Transform & Opacity Only) */}
      {!reducedMotion && mode !== "light" && hasEnteredViewport && (
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg z-0 opacity-25"
          aria-hidden="true"
        >
          {project.id === "echo" && (
            // Echo: Expanding spiritual audio-wave ripple pulse
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full border-2 border-[#4A90E2] animate-[ping_8s_cubic-bezier(0,0,0.2,1)_1]" />
            </div>
          )}

          {project.id === "lumina-clinical" && (
            // Lumina: Drifting sakura petal / care shimmer
            <div className="absolute bottom-2 right-4 flex items-center gap-2 animate-[pulse_7s_ease-in-out_1]">
              <span className="text-xl opacity-60">🌸</span>
            </div>
          )}

          {project.id === "reelclaim" && (
            // ReelClaim: Verdict stamp seal
            <div className="absolute top-4 right-4 animate-[bounce_6s_ease-in-out_1]">
              <span className="text-2xl text-red-500 opacity-40">⚖</span>
            </div>
          )}

          {project.id === "backtrace" && (
            // Backtrace: Red string pin
            <div className="absolute top-3 left-4 animate-[pulse_7s_ease-in-out_1]">
              <span className="text-lg opacity-40">📌</span>
            </div>
          )}
        </div>
      )}

      {/* Card Header */}
      <div className="relative z-10 space-y-4">
        {/* Status & Theme Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm" aria-hidden="true">
              {theme.icon}
            </span>
            <span
              className="font-mono text-xs tracking-wider uppercase font-semibold"
              style={{ color: theme.accentColor }}
            >
              [SIDE QUEST &bull; {project.title.toUpperCase()}]
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Label */}
            {isExplicitlyInDesign ? (
              <span className="px-2 py-0.5 rounded border border-amber-500/50 bg-amber-500/10 text-amber-300 font-mono text-[10px] uppercase font-bold tracking-wider">
                IN DESIGN
              </span>
            ) : hasLinks ? (
              <span className="px-2 py-0.5 rounded border border-emerald-500/50 bg-emerald-500/10 text-emerald-300 font-mono text-[10px] uppercase font-bold tracking-wider">
                ACTIVE
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded border border-red-500/40 bg-red-950/40 text-red-300 font-mono text-[10px] uppercase font-bold tracking-wider">
                DEV ONLY &bull; UNVERIFIED
              </span>
            )}

            {/* Biyoo Costume Hook Badge */}
            {project.costume && (
              <span
                className="font-mono text-[10px] text-mist/70 border border-line bg-ink-2 px-1.5 py-0.5 rounded"
                title={`Biyoo prop: ${project.costume}`}
              >
                prop: {project.costume}
              </span>
            )}
          </div>
        </div>

        {/* Quest Title & Theme Note */}
        <div>
          <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-feather">
            Quest: {project.title}
          </h3>
          <p className="font-mono text-[11px] text-mist/70 mt-0.5 italic">
            Theme: {theme.badge}
          </p>
        </div>

        {/* One-Liner Claim */}
        <div className="font-ui text-sm sm:text-base text-feather/90 leading-relaxed">
          {renderField(project.oneLiner)}
        </div>

        {/* 3 Bullets: Problem, Built, Learned */}
        <div className="pt-2 space-y-2 border-t border-line/40 font-mono text-xs">
          <div className="space-y-1">
            <span className="text-mist uppercase text-[10px] tracking-wider block font-semibold">
              1. The Problem:
            </span>
            <div className="text-feather pl-2 border-l border-line/60">
              {renderField(bullets.problem)}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-mist uppercase text-[10px] tracking-wider block font-semibold">
              2. What I Built:
            </span>
            <div className="text-feather pl-2 border-l border-line/60">
              {renderField(bullets.built)}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-mist uppercase text-[10px] tracking-wider block font-semibold">
              3. What I Learned:
            </span>
            <div className="text-feather pl-2 border-l border-line/60">
              {renderField(bullets.learned)}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Proof Links & Honesty Label */}
      <div className="relative z-10 pt-4 mt-6 border-t border-line/60 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="text-mist">Proof:</span>
          {project.links.repo ? (
            <a
              href={project.links.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="text-star hover:underline underline-offset-4 font-semibold"
            >
              Repository &rarr;
            </a>
          ) : (
            <span className="text-mist/60 italic">[No Public Repo]</span>
          )}

          {project.links.demo && (
            <a
              href={project.links.demo}
              target="_blank"
              rel="noopener noreferrer"
              className="text-star hover:underline underline-offset-4 font-semibold"
            >
              Demo &rarr;
            </a>
          )}
        </div>

        {/* Honesty limit */}
        <span className="text-[10px] text-mist/60 italic">
          {isExplicitlyInDesign
            ? "Concept in design &bull; not yet implemented"
            : hasLinks
              ? "Verified proof attached"
              : "Awaiting source proof"}
        </span>
      </div>
    </article>
  );
}

export default SideQuestCard;
