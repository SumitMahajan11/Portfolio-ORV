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
  link?: string;
  linkLabel?: string;
}

export const heroProof: readonly HeroProofCard[] = [
  {
    world: "raft",
    label: "From-scratch Rust Raft",
    metric: "68 tests",
    detail: "TLA+ model checked, no invariant violations", // projects.ts: ratify (README)
    link: "#ratify-recording",
    linkLabel: "Recording ↓",
  },
  {
    world: "z3",
    label: "Z3 Reachability Proofs",
    metric: "277 tests",
    detail: "In the included example, finds privilege escalation Checkov and TFSec miss", // projects.ts: iac-verifier (examples/checkov-tfsec-gap)
    link: "https://github.com/SumitMahajan11/iac-verifier/tree/main/examples/checkov-tfsec-gap",
    linkLabel: "Proof ↗",
  },
  {
    world: "edge-cloud",
    label: "Carbon-Aware Routing",
    metric: "508 ms P99 (measured 2026-06-19)",
    detail: "1,000 simulated task placements", // projects.ts: edge-cloud (docs/benchmarks)
    link: "https://github.com/SumitMahajan11/edge-cloud-orchestrator/tree/main/docs/benchmarks",
    linkLabel: "Benchmark ↗",
  },
];
