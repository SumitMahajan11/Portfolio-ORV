"use client";

import React from "react";
import { useMode } from "@/lib/flags";

/**
 * Ambient light that travels along the rule under the name.
 * Transform-only. Not rendered in Light mode or with reduced motion;
 * the static rule underneath still shows in every mode.
 */
export function HeroBeam() {
  const { mode, reducedMotion } = useMode();
  if (mode === "light" || reducedMotion) return null;
  return <span className="hero-beam absolute inset-y-0 left-0 w-1/3" aria-hidden="true" />;
}

export default HeroBeam;
