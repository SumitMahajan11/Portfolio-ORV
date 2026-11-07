# Portfolio Docs: Index and How To Use

Project: Sumit Mahajan's Omniscient Reader's Viewpoint (ORV) story-portfolio.
Rule zero: **evidence-only**. No claim on the site without a repo, test output, or recording behind it.

## Read order (for you and for the coding agent)
1. 01-MASTER-BLUEPRINT.md (concept, acts, rules, scope)
2. 02-DESIGN-SYSTEM.md (colors, fonts, motion, performance budgets)
3. 03-CONTENT-BIBLE.md (the ONLY source of project facts and copy)
4. 04-TECH-AND-FOLDER-SPEC.md (stack, folders, naming, conventions)
5. 05-PROOF-GATES.md (what "done" means per phase)
6. 06-DOKJA-TRANSFORMATION-SPEC.md
7. 07-BIYOO-PERSONALITY-AND-SOUND.md
8. 08-ART-ASSET-LIST.md
9. 09 to 12: World specs (Edge-Cloud, Raft, Z3, Backtrace)
10. 13-SIDE-QUEST-TEMPLATE.md
11. 14-CONSTELLATION-LINES.md
12. 15-PHASE-PLAN-AND-PROMPTS.md (the prompts you paste into the agent)

## How to use with the agent
- Copy this `docs/` folder into the repo root (`/docs`).
- Every prompt in 15 starts with: "Read /docs/01, /docs/02 and the docs named in this prompt. Do only this task."
- One prompt = one task = one proof (screenshot, recording, or command output). Paste the proof back to Claude here before the next prompt.
- If a doc and a prompt conflict, the doc wins. If two docs conflict, the higher-numbered change log entry wins (see Change Log in 01).

## Defaults I assumed (change any by telling me)
- Coding agent: Claude Code, one prompt per task.
- Finale: front-facing final form closes the phone, looks at the reader, contact form appears.
- Transformation: stages 1-3 auto-play, stages 4-7 follow scroll.
- Deadline: none fixed; Phase 1 must be shippable alone.
- Backtrace: flagship world is PROVISIONAL until a repo and proof exist (see 12).
