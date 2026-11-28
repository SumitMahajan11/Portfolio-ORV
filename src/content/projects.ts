import type { Project } from "./types";
import { Z3_TEST_SUITE } from "./z3-recorded";

export const projects: Project[] = [
  {
    id: "edge-cloud",
    title: "Edge-Cloud Orchestrator",
    status: "flagship",
    world: "edge-cloud",
    oneLiner: "Carbon-aware workload routing across edge and cloud.",
    claims: [
      {
        text: "Saga and Transactional Outbox patterns for distributed transactions.",
        evidence: "verified",
        source: "README",
      },
      {
        text: "Placement latency: End-to-end task scheduling achieved a 508 ms P99 latency (measured 2026-06-19) across 1,000 synthetic HTTP/database placements.",
        evidence: "verified",
        source: "docs/benchmarks/README.md",
      },
      {
        text: "Carbon reduction: Diurnal workload shifting deferred 416 tasks to clean energy windows, reducing total carbon emissions by 11.41%.",
        evidence: "verified",
        source: "docs/benchmarks/README.md",
      },
      {
        text: "Algorithmic throughput: In-memory multi-objective scheduler achieved 216k–366k placements/sec across runs (366,387.6 RPS original run, 216,225.6 RPS re-run 2026-11-28; P95 0.008–0.020 ms) in micro-benchmarks.",
        evidence: "verified",
        source: "docs/benchmarks/README.md",
      },
    ],
    limits: [
      "Simulated edge-cloud environment; latency figures come from simulated task placements, not a production deployment.",
      "Placement latency (508 ms P99, measured 2026-06-19), carbon reduction (11.41%), and micro-benchmark throughput (216k–366k placements/sec across runs: 366,387.6 RPS original run, 216,225.6 RPS re-run 2026-11-28) measure distinct dimensions and must not be compared.",
      "Full-stack run (1,000 tasks at 100 req/s, 100 nodes, PostgreSQL); not re-run on 2026-11-28.",
    ],
    links: {
      repo: "https://github.com/SumitMahajan11/Edge-Cloud-Orchestrator",
      demo: "https://edge-cloud-orchestrator-web-swart.vercel.app/",
      benchmark: "https://github.com/SumitMahajan11/edge-cloud-orchestrator/tree/main/docs/benchmarks",
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
      demo: null,
      benchmark: null,
      recording: "#ratify-recording",
    },
    proofAsset: {
      src: "/proofs/ratify-proof.webp",
      width: 2200,
      height: 1236,
      alt: "Ratify 3-node cluster test execution recording terminal frame",
      caption: "Terminal still frame showing cargo test output from the recording (artifacts/demo_recording.cast).",
      source: "local run",
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
        text: Z3_TEST_SUITE.claimText,
        evidence: "verified",
        source: "README",
      },
      {
        text: "In the included example, finds multi-hop IAM privilege escalation path that Checkov and TFSec miss.",
        evidence: "verified",
        source: "examples/checkov-tfsec-gap/README.md",
      },
    ],
    limits: [
      "Auto-repair covers AWS (Security Groups and IAM policies) and Azure NSG only; unsupported for GCP resources, ARM JSON templates, and Azure Governance Policies.",
      "On independent TerraGoat GCP baseline: 1 flagged, 1 modeled but missed before fix, and 9 resources not modeled by the SMT engine (Azure TerraGoat test cases passed; GCP baseline has gaps).",
      "All 5 resource-bearing TerraGoat GCP files are UNRESOLVABLE at graph level (reason undiagnosed).",
      "Public IAM exposure is a rule-based check tuned post-hoc, not a formal SMT proof.",
      "GCP corpus is a hand-authored regression dataset for specification conformance, not an independent benchmark.",
      "Solver timeout or incompleteness returns UNKNOWN, which fails closed and is never treated as safe.",
    ],
    links: {
      repo: "https://github.com/SumitMahajan11/iac-verifier",
      demo: null, // [FILL]
      benchmark: null,
      proof: "https://github.com/SumitMahajan11/iac-verifier/tree/main/examples/checkov-tfsec-gap",
    },
    proofAsset: {
      src: "/proofs/iac-verifier-proof.webp",
      width: 2200,
      height: 1012,
      alt: "iac-verifier Z3 SMT solver verification output finding multi-hop privilege escalation path missed by Checkov and TFSec in the included example",
      caption: "Real tool output from examples/checkov-tfsec-gap/: Z3 SMT finds 2-hop escalation path [SAT]; auto-repair removes the trust statement that lets the account assume jump_role; re-verified UNSAT.",
      source: "real tool output",
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
    oneLiner: "Reconstructs how a public Git repo was built, step by step.",
    claims: [
      {
        text: "11-layer deterministic and AI pipeline from repo ingestion to web dashboard.",
        evidence: "verified",
        source: "README",
      },
    ],
    limits: [
      "Structure-only checks (Tier 3) do not verify behavior; behavior is verified only where real tests exist.",
      "Live demo link comes from the resume and was not independently checked.",
    ],
    links: {
      repo: "https://github.com/SumitMahajan11/Backtrace",
      demo: "https://backtrace-pbsk.onrender.com",
      benchmark: null,
    },
    costume: "magnifier",
    bullets: {
      problem: "Code-exploration tools explain what a codebase is now, not how it was built.",
      built: "A FastAPI pipeline that parses ASTs, sorts the dependency graph, and rebuilds the build order as milestones.",
      learned: null, // [FILL]
    },
    inDesign: false,
    worldReady: false,
    published: true,
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
    oneLiner: "Audits promotional claims from YouTube Shorts and Instagram Reels against multi-source evidence.",
    claims: [],
    limits: [
      "Accuracy benchmark figures from the resume are not reproduced in the repo, so none are shown here.",
    ],
    links: {
      repo: "https://github.com/SumitMahajan11/ReelClaim",
      demo: "https://reelclaim-frontend.vercel.app",
      benchmark: null,
    },
    costume: "magnifier",
    bullets: {
      problem: "Promotional reels make claims that are hard to check against the promoter's own terms and independent sources.",
      built: "A FastAPI + Next.js ledger that crawls site terms, Wayback history, and WHOIS data, then assigns each claim a confidence tier.",
      learned: null, // [FILL]
    },
    inDesign: false,
    worldReady: false,
    published: true,
  },
];
