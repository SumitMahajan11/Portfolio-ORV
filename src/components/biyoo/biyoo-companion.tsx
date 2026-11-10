"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Biyoo } from "./biyoo-character";

export interface BiyooCompanionProps {
  className?: string;
}

/**
 * BiyooCompanion:
 * Persistent fixed bottom-left companion mascot across the story portfolio.
 *
 * Requirements (Task structure-S1):
 * - Fixed bottom-left: left: calc(16px + env(safe-area-inset-left)), bottom: calc(16px + env(safe-area-inset-bottom))
 * - z-index below the header (z-50), above the wall (z-0..z-3) -> z-40
 * - States, speech bubbles, preload, and SSR calm pose identical
 * - Hidden on /skip (plain accessible mode)
 */
export function BiyooCompanion({ className = "" }: BiyooCompanionProps) {
  const pathname = usePathname();

  // Hidden on plain accessible skip mode
  if (pathname === "/skip") {
    return null;
  }

  return (
    <div
      id="fixed-biyoo-companion"
      className={`pointer-events-auto fixed z-40 transition-transform duration-300 ${className}`}
      style={{
        left: "calc(16px + env(safe-area-inset-left, 0px))",
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <Biyoo />
    </div>
  );
}

export default BiyooCompanion;

