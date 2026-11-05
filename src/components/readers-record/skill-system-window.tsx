"use client";

import React, { useEffect, useRef } from "react";
import type { Skill } from "@/content/types";
import { projects } from "@/content/projects";
import { renderField } from "@/components/ui/fill-badge";
import { useMode } from "@/lib/flags";

export interface SkillSystemWindowProps {
  skill: Skill;
  onClose: () => void;
}

/**
 * SkillSystemWindow Component:
 * Item-inspection popover in ORV SystemWindow style.
 *
 * Rules:
 * - NO levels, grades, bars, percentages, stars, or rarity labels
 * - Keyboard accessible with strict focus trap within the window
 * - Escape closes, Enter/Space supported
 * - Biyoo "proud" reaction triggered when an Evidence link is clicked
 * - Reduced motion disables open animation
 */
export function SkillSystemWindow({ skill, onClose }: SkillSystemWindowProps) {
  const { reducedMotion, mode } = useMode();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const isDev = process.env.NODE_ENV !== "production";

  // Proof projects
  const proofProjects = skill.proofProjectIds
    .map((id) => projects.find((p) => p.id === id))
    .filter(Boolean);

  // Trigger Biyoo proud reaction when proof link is clicked
  const handleProofClick = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("biyoo:action", {
          detail: { state: "proud", line: "Biyoo!" },
        })
      );
    }
    onClose();
  };

  // Keyboard navigation & strict focus trap within info box
  useEffect(() => {
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    const dialogEl = dialogRef.current;
    if (!dialogEl) return;

    // Focusable selectors
    const focusableElements = dialogEl.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (firstElement) {
      firstElement.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        if (e.shiftKey) {
          // Shift + Tab: if on first element, wrap to last
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab: if on last element, wrap to first
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [onClose]);

  const hasAnimation = !reducedMotion && mode !== "light";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-dialog-title"
      aria-describedby="skill-dialog-desc"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-lg rounded border border-star/80 bg-ink/95 p-6 backdrop-blur-md shadow-[0_0_32px_rgba(94,225,230,0.25)] space-y-6 select-none ${
          hasAnimation ? "animate-in fade-in zoom-in-95 duration-200" : ""
        }`}
      >
        {/* System Window Scanlines & Corner Ticks */}
        <span
          className="pointer-events-none absolute -top-[1px] -left-[1px] h-3 w-3 border-t-2 border-l-2 border-star"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -top-[1px] -right-[1px] h-3 w-3 border-t-2 border-r-2 border-star"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -bottom-[1px] -left-[1px] h-3 w-3 border-b-2 border-l-2 border-star"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -bottom-[1px] -right-[1px] h-3 w-3 border-b-2 border-r-2 border-star"
          aria-hidden="true"
        />

        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-line/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-star animate-pulse" />
            <span className="font-mono text-xs text-star font-bold tracking-widest uppercase">
              [SYSTEM &bull; ITEM INFORMATION]
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-ink-2 text-mist hover:text-feather font-mono text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-star"
            aria-label="Close item inspection dialog (Escape)"
          >
            &#x2715; [ESC]
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4">
          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-mist">
              Item Name:
            </span>
            <h2
              id="skill-dialog-title"
              className="font-display text-2xl font-bold tracking-tight text-feather"
            >
              {skill.name}
            </h2>
          </div>

          {/* Story / Description */}
          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-mist">
              One-Line Story:
            </span>
            <div
              id="skill-dialog-desc"
              className="font-ui text-sm sm:text-base text-feather/90 leading-relaxed bg-ink-2/50 p-3 rounded border border-line/40 min-h-[3rem]"
            >
              {skill.story ? (
                skill.story
              ) : isDev ? (
                renderField(skill.story)
              ) : (
                <span className="text-mist/70 italic">Story pending confirmation in content bible.</span>
              )}
            </div>
          </div>

          {/* Evidence / Proof Links */}
          <div className="space-y-2 pt-2 border-t border-line/40">
            <span className="font-mono text-xs uppercase tracking-wider text-star font-semibold block">
              Evidence &amp; Verification Proofs:
            </span>

            {proofProjects.length > 0 ? (
              <div className="space-y-2">
                {proofProjects.map((proj) => {
                  if (!proj) return null;
                  return (
                    <a
                      key={proj.id}
                      href={`#${proj.id}`}
                      onClick={handleProofClick}
                      className="group flex items-center justify-between p-3 rounded border border-star/40 bg-star/5 hover:bg-star/15 transition-all text-xs font-mono focus:outline-none focus:ring-2 focus:ring-star"
                    >
                      <div className="space-y-0.5">
                        <span className="text-feather font-bold group-hover:text-star transition-colors">
                          Scenario: {proj.title}
                        </span>
                        <span className="block text-[10px] text-mist/80">
                          World: {proj.world} &bull; {proj.claims.length} verified claims
                        </span>
                      </div>
                      <span className="text-star font-semibold group-hover:translate-x-1 transition-transform">
                        Jump to Proof &rarr;
                      </span>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs font-mono text-mist/60 italic">
                No verified proof project linked.
              </div>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-3 border-t border-line/40 flex items-center justify-between font-mono text-[10px] text-mist/60">
          <span>CLASSIFICATION: TECHNICAL CAPABILITY</span>
          <span>PRESS [ESC] TO CLOSE</span>
        </div>
      </div>
    </div>
  );
}

export default SkillSystemWindow;
