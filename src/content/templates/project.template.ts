/**
 * src/content/templates/project.template.ts
 *
 * Project Content Template
 *
 * Use this template when adding a new Scenario World (flagship) or Side Quest.
 *
 * EVIDENCE RULE:
 * 1. Every claim must have evidence: 'verified' and a specific source reference from
 *    docs/03-CONTENT-BIBLE.md or the repository README.
 * 2. Every flagship project must have a valid repository URL (cannot be null or [FILL]).
 * 3. Every project must have at least one honest 'limits' line documenting technical boundaries.
 * 4. If evidence is missing, DO NOT publish it. Set published: false or leave it out.
 *
 * NOTE: [FILL] placeholders in this template are for scaffolding and must be replaced
 * before setting published: true.
 */

import type { Project } from "../types";

/**
 * Template A: New Side Quest Project
 */
export const sideQuestTemplate: Project = {
  id: "[FILL: lowercase-kebab-slug]", // e.g. "echo-assistant"
  title: "[FILL: Human Readable Title]", // e.g. "Echo Voice Controller"
  status: "sidequest",
  world: "sidequest",
  oneLiner: "[FILL: One concise verified sentence describing what it does]",
  claims: [
    {
      text: "[FILL: Specific factual claim about what the project does or achieves]",
      evidence: "verified",
      source: "docs/03-CONTENT-BIBLE.md line [FILL]", // e.g. "README or Bible Section 5"
    },
  ],
  limits: [
    "[FILL: Honest engineering boundary - e.g. Local single-node deployment, not tested for HA]",
  ],
  links: {
    repo: "https://github.com/SumitMahajan11/[FILL: repo-slug]",
    demo: null, // Optional: HTTPS URL or null
    benchmark: null, // Optional: benchmark report URL or null
  },
  costume: "[FILL: costume descriptor]", // e.g. "leaf headband"
  bullets: {
    problem: "[FILL: What problem was addressed?]",
    built: "[FILL: What core architecture/component was built?]",
    learned: "[FILL: What was learned, or what failure was resolved?]",
  },
  published: false, // Keep false until all [FILL] placeholders are resolved
};

/**
 * Template B: New Flagship Scenario World Project
 */
export const flagshipWorldTemplate: Project = {
  id: "[FILL: lowercase-kebab-slug]", // e.g. "distributed-log"
  title: "[FILL: Flagship Scenario Title]", // e.g. "Chronicle Log"
  status: "flagship",
  world: "edge-cloud", // Add new world slug to World type in src/content/types.ts when creating a new world
  oneLiner: "[FILL: Core thesis sentence from docs/03-CONTENT-BIBLE.md]",
  claims: [
    {
      text: "[FILL: Primary correctness or architecture claim]",
      evidence: "verified",
      source: "docs/03-CONTENT-BIBLE.md line [FILL]",
    },
    {
      text: "[FILL: Test count, model check, or verified benchmark metric]",
      evidence: "verified",
      source: "README",
    },
  ],
  limits: [
    "[FILL: Required limitation text - e.g. Correctness model, not a distributed throughput benchmark]",
  ],
  links: {
    repo: "https://github.com/SumitMahajan11/[FILL: repo-slug]", // Required for flagships
    demo: null,
    benchmark: null,
  },
  costume: "[FILL: Biyoo costume identifier]", // Must be registered in costume-registry.tsx
  worldReady: false, // Set true once interactive 3D/canvas component is built
  published: false, // Set true only after verification passes
};

