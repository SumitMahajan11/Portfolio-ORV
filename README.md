# Sumit Mahajan — Story Portfolio

An interactive, novel-inspired story portfolio based on *Omniscient Reader's Viewpoint* (ORV). The visitor assumes the role of "the reader", exploring distributed systems, formal verification, and cloud infrastructure scenarios.

---

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS
- **Animation**: GSAP + ScrollTrigger (transform and opacity only; native scroll scrub)
- **Accessibility**: Skip mode (`/skip`), WCAG AA contrast, keyboard navigation, `prefers-reduced-motion` listening

---

## Getting Started

### Prerequisites

- Node.js 18.18+ (Node 22 LTS recommended)
- npm 10+

### Development Server

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Key routes during Phase 0:
- `/` — Scenario Hub / Home (Dokja & Biyoo placeholders on `--void`)
- `/skip` — Plain, fast, accessible version containing all story content
- `/style-test` — Design tokens, color swatches, world palettes, and typography scale
- `/dev/mode` — Device detection inspector (live mode, raw signals, particle caps)

---

## Verification & Build Scripts

```bash
# Typecheck TypeScript (strict, noEmit)
npm run typecheck

# Lint codebase (ESLint)
npm run lint

# Validate content rules against /docs/03-CONTENT-BIBLE.md
npm run check:content

# Production build
npm run build

# Start production server
npm run start
```

---

## Deployment to Vercel

This repository is ready for zero-config manual deployment to Vercel:
1. Import repository via the Vercel Dashboard.
2. Framework Preset: **Next.js**.
3. Root Directory: `./`.
4. **Environment Variables**: None required for Phase 0 build.
5. Deploy.

---

## Documentation Index

All architectural specifications and rules live in `/docs`:

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
- [`16-PROMPTS-PHASE-0.md`](./docs/16-PROMPTS-PHASE-0.md) — Phase 0 execution prompts
- [`17-PROMPTS-PHASE-1.md`](./docs/17-PROMPTS-PHASE-1.md) — Phase 1 execution prompts
- [`18-PROMPTS-PHASE-2.md`](./docs/18-PROMPTS-PHASE-2.md) — Phase 2 execution prompts
