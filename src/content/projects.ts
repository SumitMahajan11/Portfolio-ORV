import type { Project } from "./types";

export const projects: Project[] = [
  {
    id: "edge-cloud",
    title: "Edge-Cloud Orchestrator",
    status: "flagship",
    world: "edge-cloud",
    oneLiner: "carbon-aware workload routing across edge and cloud.",
    claims: [], // Edge-Cloud has NO numeric claims until verified
    limits: [],
    links: {
      repo: null, // [FILL]
      demo: null, // [FILL]
      benchmark: null,
    },
    costume: "star goggles",
    worldReady: true,
    published: true,
  },
  {
    id: "ratify",
    title: "Ratify",
    status: "flagship",
    world: "raft",
    oneLiner: "From-scratch Rust Raft implementation.",
    claims: [
      {
        text: "From-scratch Rust Raft implementation.",
        evidence: "verified",
        source: "README",
      },
      {
        text: "TLA+ model checked with no invariant violations.",
        evidence: "verified",
        source: "README",
      },
      {
        text: "Linearizability verified with Porcupine plus own Wing & Gong checker.",
        evidence: "verified",
        source: "README",
      },
      {
        text: "Reproduces 4 historical bug classes.",
        evidence: "verified",
        source: "README",
      },
      {
        text: "68 passing tests.",
        evidence: "verified",
        source: "README",
      },
      {
        text: "UCB1 fuzzer: +32.36% stress reward over random.",
        evidence: "verified",
        source: "README",
      },
      {
        text: "Recorded demo exists.",
        evidence: "verified",
        source: "README",
      },
    ],
    limits: [
      "3-node, correctness project, not a performance benchmark.",
    ],
    links: {
      repo: "https://github.com/SumitMahajan11/Ratify",
      demo: "https://github.com/SumitMahajan11/Ratify/blob/main/artifacts/demo_recording.cast",
      benchmark: null,
    },
    costume: "leaf headband",
    worldReady: true,
    published: true,
  },
  {
    id: "iac-verifier",
    title: "iac-verifier",
    status: "flagship",
    world: "z3",
    oneLiner: "Z3-based reachability proofs on Terraform IAM and network graphs.",
    claims: [
      {
        text: "Z3-based reachability proofs on Terraform IAM and network graphs.",
        evidence: "verified",
        source: "README",
      },
      {
        text: "Auto-repair engine and proof certificates.",
        evidence: "verified",
        source: "README",
      },
      {
        text: "276 passing tests.",
        evidence: "verified",
        source: "README",
      },
      {
        text: "Benchmark: finds a privilege-escalation path that Checkov and TFSec miss.",
        evidence: "verified",
        source: "README",
      },
    ],
    limits: [
      "Auto-repair covers AWS (Security Groups and IAM policies) and Azure NSG only; unsupported for GCP resources, ARM JSON templates, and Azure Governance Policies.",
      "On independent TerraGoat GCP baseline: 1 flagged, 1 modeled but missed before fix, and 9 resources not modeled by the SMT engine.",
      "All 5 resource-bearing TerraGoat GCP files are UNRESOLVABLE at graph level (reason undiagnosed).",
      "Public IAM exposure is a rule-based check tuned post-hoc, not a formal SMT proof.",
      "GCP corpus is a hand-authored regression dataset for specification conformance, not an independent benchmark.",
      "Solver timeout or incompleteness returns UNKNOWN, which fails closed and is never treated as safe.",
    ],
    links: {
      repo: "https://github.com/SumitMahajan11/iac-verifier",
      demo: null, // [FILL]
      benchmark: null,
    },
    costume: "chain bracelet",
    worldReady: true,
    published: true,
  },
  {
    id: "backtrace",
    title: "Backtrace",
    status: "sidequest", // Stays sidequest until /docs/03 says otherwise
    world: "backtrace",
    oneLiner: "reconstructing a repo from clues.",
    claims: [],
    limits: [
      "Provisional candidate awaiting verification of existence, repo, and demo.",
    ],
    links: {
      repo: null,
      demo: null,
      benchmark: null,
    },
    costume: "magnifier",
    bullets: {
      problem: null, // [FILL]
      built: null, // [FILL]
      learned: null, // [FILL]
    },
    inDesign: false,
    worldReady: false,
    published: false,
  },
  {
    id: "echo",
    title: "Echo",
    status: "sidequest",
    world: "sidequest",
    oneLiner: "voice assistant, wake-word, Gemini-backed for now, email/file/device control",
    claims: [],
    limits: [
      "Claims pending verification per phase.",
    ],
    links: {
      repo: null,
      demo: null,
      benchmark: null,
    },
    costume: "headset",
    bullets: {
      problem: null, // [FILL]
      built: null, // [FILL]
      learned: null, // [FILL]
    },
    inDesign: false,
    worldReady: false,
    published: false,
  },
  {
    id: "lumina-clinical",
    title: "Lumina Clinical",
    status: "sidequest",
    world: "sidequest",
    oneLiner: "maternal health risk-triage for ASHA workers, Smart India Hackathon",
    claims: [],
    limits: [
      "Pending verification from project source.",
    ],
    links: {
      repo: null,
      demo: null,
      benchmark: null,
    },
    costume: "medical kit",
    bullets: {
      problem: null, // [FILL]
      built: null, // [FILL]
      learned: null, // [FILL]
    },
    inDesign: false,
    worldReady: false,
    published: false,
  },
  {
    id: "reelclaim",
    title: "ReelClaim",
    status: "sidequest",
    world: "sidequest",
    oneLiner: "claim verification for job/internship reels. Status: in design",
    claims: [],
    limits: [
      "Status: in design.",
    ],
    links: {
      repo: null,
      demo: null,
      benchmark: null,
    },
    costume: "magnifier",
    bullets: {
      problem: null, // [FILL]
      built: null, // [FILL]
      learned: null, // [FILL]
    },
    inDesign: true, // docs/03 explicitly states: 'Status: in design'
    worldReady: false,
    published: false,
  },
];
