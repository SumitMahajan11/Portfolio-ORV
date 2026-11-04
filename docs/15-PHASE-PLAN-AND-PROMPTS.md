# 15 Phase Plan and Prompts

## How every prompt starts (paste this header each time)
```
You are working on the ORV story-portfolio. Read /docs/01-MASTER-BLUEPRINT.md and /docs/02-DESIGN-SYSTEM.md first, plus the docs named below.
Do ONLY the task below. Do not add features from later phases. Copy facts only from /docs/03-CONTENT-BIBLE.md.
When finished: run `npm run build` and `npm run lint`, list files changed, and tell me exactly what proof to capture.
```

---
## PHASE 0: Foundation (no characters yet)

**P0-1 Project setup**
Docs: 04. Task: create Next.js (App Router, TypeScript, Tailwind) in the repo root, strict TS, ESLint, folder structure from 04, install gsap. Commit "phase0-1". Proof: `npm run dev` screenshot + build output.

**P0-2 Design tokens**
Docs: 02. Task: implement all tokens from 02 as CSS variables and Tailwind theme, load the four fonts via next/font, build /style-test page showing colors, type scale, and the system-window component. Proof: screenshot of /style-test.

**P0-3 Layout and content layer**
Docs: 03, 04. Task: typed content files in /src/content (projects, skills, lines placeholders) using only 03 data, with [FILL] items as `null`. Base layout, header with persistent "Skip to plain version" link. Proof: screenshot + type check.

**P0-4 Skip mode**
Docs: 01, 03. Task: /skip route rendering all content as semantic accessible HTML (About, projects, skills, links) with no heavy animation. Proof: Lighthouse mobile + keyboard-only video.

**P0-5 Motion foundation**
Docs: 02, 04. Task: /lib/motion/setup.ts (gsap + ScrollTrigger registration, context helpers), /lib/device (reduced-motion and low-end detection with CPU/memory heuristics and a manual `?light=1` override), feature flags. Proof: a test page logging detected mode in 3 situations.

**P0-6 Placeholders and deploy**
Docs: 07, 08. Task: code-drawn Biyoo blob (SVG, layers named per 08) with idle breathing, placeholder Dokja rectangle layers, deploy to Vercel. Proof: preview URL + Phase 0 gate checklist from 05.

---
## PHASE 1: Hero, Biyoo, Edge-Cloud, mobile

**P1-1 Hero scene shell** (06, 08): stage container, layered placeholder art, auto-play stages 1-3 timeline. Proof: recording.
**P1-2 Scroll-scrubbed stages 4-7** (06): one ScrollTrigger master timeline, reversible stages 4-6, glitch text, feather-to-grid transition. Proof: recording desktop + mobile.
**P1-3 Idle nudge and Biyoo behavior** (07): sleep, 8s wake, startled, hover states, local reader tracking only (no network). Proof: recording.
**P1-4 Scenario Select** (01, 03): four world cards as system windows, Biyoo reactions, costume hooks. Proof: screenshot + recording.
**P1-5 Edge-Cloud world** (09): star network, routing demo, proof panel from 03. Proof: recording + FPS.
**P1-6 Mobile pass** (01, 06): swipe-driven wings, bottom-corner Biyoo, particle caps. Proof: real phone recording.
**P1-7 Light mode and reduced motion** (02, 06): fallbacks per variant. Proof: throttle test + reduced-motion recording.
**P1-8 Phase 1 gate** (05): measure LCP, CLS, INP, FPS; write /docs/proofs/phase1.md; deploy. Share the link.

---
## PHASE 2: Remaining content
P2-1 Raft world (10). P2-2 Z3 world (11) + iac-verifier repo cleanup (manual task by you). P2-3 Backtrace world (12) or demote. P2-4 Side quests (13). P2-5 Reader's Record skill info boxes (03). P2-6 Chapter 0 About (03, your draft first). P2-7 Constellation lines system (14). P2-8 Gate.

## PHASE 3: Poster, finale, secrets, sound
P3-1 /wanted page (01, 08). P3-2 Finale + contact form (06; choose a form backend such as a free form service, verify privacy). P3-3 Corner Biyoo bounty button. P3-4 Hidden fragments x5 and True Ending (01, 07). P3-5 Sound system, off by default (07). P3-6 Optional camera button, denial-safe. P3-7 Gate.

## PHASE 4: Polish and launch
P4-1 Performance audit and fixes. P4-2 Cross-browser/device pass. P4-3 SEO, OG image, favicon, 404. P4-4 Accessibility audit. P4-5 Friend test. P4-6 Launch checklist and domain. P4-7 Gate.

## Rules for the loop
1. You paste a prompt. 2. Agent builds. 3. You paste the proof here. 4. I review against the gates and tell you pass or fix. 5. Next prompt.
