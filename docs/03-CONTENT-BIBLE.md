# 03 Content Bible (single source of truth for facts and copy)

Rules: only [VERIFIED] items may appear as claims. [VERIFY] items must be checked against the longer resume or repo before use. Repeat each README's own limits.

## Identity
- Name: Sumit Mahajan. GitHub: SumitMahajan11.
- 3rd-year CSE undergrad, Pimpri Chinchwad University, Pune. Graduating March 2028. [VERIFIED]
- CGPA: [VERIFY against resume before showing]
- Targeting: GSoC 2027 (CNCF / Kubeflow / KubeVirt). [VERIFIED as goal]. Do not claim acceptance of anything.
- Public contact: contact form, GitHub, LinkedIn only. No phone, email, address.
- LinkedIn URL: [FILL]. Resume PDF: [FILL, from the longer resume].

## Flagship 1: Edge-Cloud Orchestrator
- One-line: carbon-aware workload routing across edge and cloud. [VERIFIED as concept]
- Repo: [FILL]. Metrics, tests, demo: [FILL]. Nothing numeric until filled.

## Flagship 2: Ratify (Raft)
- From-scratch Rust Raft implementation. [VERIFIED]
- TLA+ model checked with no invariant violations. [VERIFIED]
- Linearizability verified with Porcupine plus own Wing & Gong checker. [VERIFIED]
- Reproduces 4 historical bug classes. [VERIFIED]
- 68 passing tests. [VERIFIED]
- UCB1 fuzzer: +32.36% stress reward over random. [VERIFIED]
- Recorded demo exists. [VERIFIED]
- REQUIRED limit text: "3-node, correctness project, not a performance benchmark."
- Repo link: [FILL]. Demo link: [FILL].

## Flagship 3: iac-verifier (Z3)
- Z3-based reachability proofs on Terraform IAM and network graphs. [VERIFIED]
- Auto-repair engine and proof certificates. [VERIFIED]
- 103 passing tests. [VERIFIED]
- Benchmark: finds a privilege-escalation path that Checkov and TFSec miss. [VERIFIED]
- Pre-launch TODO: clean repo root (tfsec.exe, scratch/, loose checkov_*.json).
- Repo link: [FILL].

## Flagship 4: Backtrace (PROVISIONAL)
- Idea: reconstructing a repo from clues. Status: [VERIFY existence, repo, demo]. If no evidence, demote to Side Quest.

## Side Quests (candidates; each needs a verified one-liner and link)
Echo (voice assistant, wake-word, Gemini-backed for now, email/file/device control) [VERIFY claims per phase]
Lumina Clinical (maternal health risk-triage for ASHA workers, Smart India Hackathon) [VERIFY]
ReelClaim (claim verification for job/internship reels). Status: [VERIFY: is it built, or only a plan? If only a plan, label "in design"]
AutoCure, Soybean Leaf Disease Classifier, EcoVision, Sunflower Leaf Disease Detector [VERIFY each from the longer resume]
Note: Sunflower detector had a dataset leakage bug fixed by retraining with a proper holdout. This is a good honest "lesson" line if verified.

## Skills (Reader's Record)
Each skill = name + one-line story + links to Scenarios proving it. No levels, bars, or percentages.
Starter proof map (confirm): Rust, TLA+, distributed systems -> Ratify. Z3/SMT, Terraform, IaC security -> iac-verifier. Kubernetes/cloud orchestration -> Edge-Cloud. ML basics -> classifier projects [VERIFY]. Skills with no proof are not listed.

## Chapter 0: The Protagonist's Origin (About)
Three short paragraphs, honest, no inflated claims. Sumit writes the first draft; Claude edits for tone. Placeholder structure:
1. Where I started (Pune, CS, first project that hooked me).
2. What pulled me toward correctness and distributed systems (Raft, Z3).
3. What I'm aiming for (open source, GSoC 2027) and what I'm looking for.

## Banned phrases
"world-class", "expert", "passionate", "cutting-edge", any percentage skill rating, any number not in this doc.
