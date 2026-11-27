import type { World } from "./types";

/**
 * Hero proof cards. Every figure below is already a verified claim in
 * projects.ts (source noted per line). Nothing here is new data.
 */
export interface HeroProofCard {
  world: World;
  label: string;
  metric: string;
  detail: string;
}

export const heroProof: readonly HeroProofCard[] = [
  {
    world: "raft",
    label: "From-scratch Rust Raft",
    metric: "68 tests",
    detail: "TLA+ model checked, no invariant violations", // projects.ts: ratify (README)
  },
  {
    world: "z3",
    label: "Z3 Reachability Proofs",
    metric: "276 tests",
    detail: "Finds a privilege-escalation path Checkov and TFSec miss", // projects.ts: iac-verifier (README)
  },
  {
    world: "edge-cloud",
    label: "Carbon-Aware Routing",
    metric: "508 ms P99",
    detail: "1,000 simulated task placements", // projects.ts: edge-cloud (scheduling-latency.json)
  },
];
