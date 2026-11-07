# Sumit Mahajan — Story Portfolio

An interactive, novel-inspired story portfolio based on *Omniscient Reader's Viewpoint* (ORV). The visitor assumes the role of "the reader", exploring distributed systems, formal verification, and cloud infrastructure scenarios.

---

## Technical Focus & Philosophy

- **Domain**: Distributed Systems, Consensus, Formal Verification (SMT), and Cloud Infrastructure.
- **Evidence-Only Rule**: Every project claim is backed strictly by verified code, test suites, or mathematical model checkers. No arbitrary skill percentage bars, levels, or buzzwords.
- **Honest Limits**:
  > **Ratify Note**: Ratify is a 3-node, correctness project, not a performance benchmark. No throughput, latency, or production-readiness claims are made for educational or experimental systems.

---

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS
- **Animation**: GSAP + ScrollTrigger (native browser momentum scroll; transform and opacity only)
- **Accessibility**: Semantic HTML, skip link, WCAG AA/AAA contrast, keyboard navigation, `prefers-reduced-motion` listening, 100/100 Lighthouse Accessibility
- **Security**: Strict security headers (`nosniff`, `DENY`, `strict-origin-when-cross-origin`, zero client tracking, zero telemetry)

---

## Getting Started

### Prerequisites

- Node.js 18.18+ (Node 22 LTS recommended)
- npm 10+

### Development Server

Run the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Key routes:
- `/` — Scenario Hub / Home (Hero transformation, interactive scenarios, reader's record)
- `/skip` — Plain, fast, accessible version containing all story and technical content
- `/wanted` — Bounty board
- `/style-test` — Design tokens, color swatches, and typography scale (dev only; 404 in production)
- `/dev/mode` — Device detection and telemetry inspector (dev only; 404 in production)

---

## Verification & Build Scripts

```bash
# Typecheck TypeScript (strict mode, noEmit)
npm run typecheck

# Lint codebase (ESLint)
npm run lint

# Validate content rules against /docs/03-CONTENT-BIBLE.md
npm run check:content

# Validate content in strict zero-tolerance mode
npm run check:content -- --strict

# Production build
npm run build

# Start production server
npm run start
```

For automated testing, benchmarking, and security scanning scripts, see [`scripts/README.md`](./scripts/README.md).

---

## Privacy Notice

In strict compliance with privacy guidelines, no personal telephone number, personal email address, or physical street address is stored in this repository or exposed on this site. Public contact is supported exclusively through the on-site contact form and verified public profiles (GitHub: [@SumitMahajan11](https://github.com/SumitMahajan11)).

---

## Documentation Index

All architectural specifications, design system tokens, and proof reports live in `/docs`:

- [`00-README-INDEX.md`](./docs/00-README-INDEX.md) — Documentation index and reading paths
- [`01-MASTER-BLUEPRINT.md`](./docs/01-MASTER-BLUEPRINT.md) — Vision, acts, hard rules, and phase summaries
- [`02-DESIGN-SYSTEM.md`](./docs/02-DESIGN-SYSTEM.md) — Hub tokens, world palettes, typography, performance budgets
- [`03-CONTENT-BIBLE.md`](./docs/03-CONTENT-BIBLE.md) — Single source of truth for facts and copy
- [`04-TECH-AND-FOLDER-SPEC.md`](./docs/04-TECH-AND-FOLDER-SPEC.md) — Project layout, naming conventions, flags
- [`05-PROOF-GATES.md`](./docs/05-PROOF-GATES.md) — Acceptance gates and proof requirements per phase
- [`06-DOKJA-TRANSFORMATION-SPEC.md`](./docs/06-DOKJA-TRANSFORMATION-SPEC.md) — Act 1 hero scroll beats and visual stages
- [`07-BIYOO-PERSONALITY-AND-SOUND.md`](./docs/07-BIYOO-PERSONALITY-AND-SOUND.md) — Companion behavior, lines, and audio rules
- [`08-ART-ASSET-LIST.md`](./docs/08-ART-ASSET-LIST.md) — Layer lists and specifications for art assets
- [`09-WORLD-EDGE-CLOUD.md`](./docs/09-WORLD-EDGE-CLOUD.md) — Scenario 1 (Edge-Cloud Orchestrator)
- [`10-WORLD-RAFT.md`](./docs/10-WORLD-RAFT.md) — Scenario 2 (Ratify / Naruto theme)
- [`11-WORLD-Z3.md`](./docs/11-WORLD-Z3.md) — Scenario 3 (iac-verifier / HxH Nen theme)
- [`12-WORLD-BACKTRACE.md`](./docs/12-WORLD-BACKTRACE.md) — Scenario 4 (Backtrace / Conan theme)
- [`13-SIDE-QUESTS.md`](./docs/13-SIDE-QUESTS.md) — Minor projects and experiments
- [`14-CONSTELLATION-LINES.md`](./docs/14-CONSTELLATION-LINES.md) — The 40 reaction lines and triggers
- [`15-PHASE-PLAN-AND-PROMPTS.md`](./docs/15-PHASE-PLAN-AND-PROMPTS.md) — End-to-end task roadmap

### Verification & Gate Proofs

- [`phase1.md`](./docs/proofs/phase1.md) — Phase 1 performance and mobile throttle benchmarks
- [`phase2.md`](./docs/proofs/phase2.md) — Phase 2 world implementation proofs & diagram accuracy
- [`phase3.md`](./docs/proofs/phase3.md) — Phase 3 finale, contact form, and audio verification
- [`phase4.md`](./docs/proofs/phase4.md) — Phase 4 performance post-fix benchmarks and FPS trace
- [`matrix.md`](./docs/proofs/matrix.md) — Cross-browser and responsive device test matrix
- [`truth-audit.md`](./docs/proofs/truth-audit.md) — Evidence-only truth audit cross-referencing all production claims
- [`launch-checklist.md`](./docs/launch-checklist.md) — Production deployment, custom domain DNS, and launch checklist
