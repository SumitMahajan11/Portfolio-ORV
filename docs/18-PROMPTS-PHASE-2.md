# 18 Prompts: Phase 2 (Remaining worlds, side quests, skills, About, lines)

Prerequisite: Phase 1 gate passed and shared. Fill /docs/03 with every verified fact BEFORE the related prompt (repo links, Edge-Cloud metrics if any, Backtrace status). Tell Claude (chat) so the docs are updated first.

Manual tasks for you (not for the agent):
- Clean the iac-verifier repo root (tfsec.exe, scratch/, loose checkov_*.json) before P2-2 goes live.
- Write the first draft of Chapter 0 (About) before P2-6.

---
## P2-1 Raft world (Naruto: Hidden Leaf)
Read: /docs/10, /docs/03, /docs/09 (as pattern).
```text
Follow CLAUDE.md. Read /docs/10-WORLD-RAFT.md, /docs/03-CONTENT-BIBLE.md, and reuse the structure and conventions of the Edge-Cloud world from /docs/09 and its implementation.

TASK: Build the Ratify (Raft) world.

1. Section with data-world="raft", lazy loaded like the Edge-Cloud world, server-rendered text, static fallback.
2. Build a tiny deterministic Raft VISUALIZER state machine in TypeScript (src/lib/worlds/raft-viz.ts), 3 nodes, scripted scenario steps only (no real networking, no randomness). It must obey these rules and have unit-style assertions run in a dev-only self-check: (a) at most one leader per term, (b) a candidate needs votes from a majority (2 of 3) to win, (c) a new election increments the term, (d) a new leader's term is greater than the failed leader's term, (e) during a partition the minority side cannot elect a leader, (f) after healing, the stale leader steps down on seeing a higher term.
3. Label the visualization clearly: "illustrative visualization, not the Ratify code". Never imply it runs the real implementation.
4. Beats: village of 3 ninja nodes with faces (placeholder circles with simple expressions); heartbeats as signal flares; log entries as scrolls; leader (Hokage) falls, era ends, election, new Hokage with higher term number; partition wall then healing.
5. Proof panel: ONLY the verified Ratify claims from content (TLA+ no invariant violations; Porcupine and own Wing & Gong checker; 4 historical bug classes reproduced; 68 passing tests; UCB1 fuzzer +32.36% stress reward over random; recorded demo), copied word-for-word from /docs/03 content. Include the required limit text "3-node, correctness project, not a performance benchmark." prominently, not hidden in small print. No throughput/latency/production claims anywhere.
6. Biyoo costume hook: leaf headband (placeholder prop). Set worldReady=true for raft in content.
7. Scroll-scrubbed, transform/opacity only; fallbacks for reduced and light (static step-by-step diagram with 5 captioned frames).

Commit: `phase2-1: raft world`.
```
Capture: recording; a screenshot of the proof panel with the limit line visible; output of the self-check; manual check of each claim against the repo README.

---
## P2-2 Z3 world (Hunter x Hunter: Nen Vows)
Read: /docs/11, /docs/03.
```text
Follow CLAUDE.md. Read /docs/11-WORLD-Z3.md and /docs/03-CONTENT-BIBLE.md; follow the Edge-Cloud/Raft world conventions.

TASK: Build the iac-verifier (Z3) world.

1. Section with data-world="z3", lazy loaded, server-rendered text, static fallback.
2. Beats: (a) a "vow table" showing a small illustrative Terraform IAM rule set as vows; (b) an IAM role/network graph (max 14 nodes); (c) a chain animates along a path from an attacker entry to a privileged resource; (d) "UNSATISFIABLE" collapse moment when a vow is amended (auto-repair) and the chain breaks; (e) proof-certificate stamp.
3. Everything in the demo graph is labeled "illustrative example" unless I explicitly provide real output from the repo. Do not execute Z3 in the browser.
4. Proof panel from verified content only: Z3-based reachability proofs on Terraform IAM and network graphs, auto-repair engine and proof certificates, 103 passing tests, and the benchmark statement that it finds a privilege-escalation path that Checkov and TFSec miss, linking to the benchmark/README location if the URL is present in content. Do not add details beyond what /docs/03 states.
5. Biyoo costume hook: chain bracelet (placeholder). Set worldReady=true for z3.
6. Reduced/light fallback: static annotated graph with 4 captioned frames.
7. Run `npm run check:content -- --strict` and report which items still block launch (expected: other incomplete fields).

Commit: `phase2-2: z3 world`.
```
Capture: recording; manual check that the iac-verifier root is clean before this goes public.

---
## P2-3 Backtrace (only if evidence exists) or demote
Read: /docs/12, /docs/03.
```text
Follow CLAUDE.md. Read /docs/12-WORLD-BACKTRACE.md and /docs/03-CONTENT-BIBLE.md.

TASK: First check /docs/03 and src/content/projects.ts. If Backtrace status is still 'sidequest' or has null repo/claims, STOP and report "Backtrace has no verified evidence; no world built". Do nothing else in that case.

If (and only if) Backtrace is 'flagship' with a repo link and at least one verified claim:
1. Build the Case Board world (data-world="backtrace"): pinned clue cards (commits, files, logs) with strings drawn between them (SVG lines, transform/opacity reveal), a deduction highlight, and the closing line "The truth is always one." as narration text.
2. Clues are labeled "illustrative" unless they are real outputs from the repo that I provided in content.
3. Proof panel from verified claims only. Biyoo magnifier prop placeholder. Static fallback required. Set worldReady=true.

Commit: `phase2-3: backtrace world` (or no commit if stopped).
```
Capture: either the world recording, or the agent's stop report.

---
## P2-4 Side quests
Read: /docs/13, /docs/03, /docs/02.
```text
Follow CLAUDE.md. Read /docs/13-SIDE-QUEST-TEMPLATE.md, /docs/03-CONTENT-BIBLE.md, /docs/02-DESIGN-SYSTEM.md.

TASK: Build the Side Quest component and section.

1. Create a reusable SideQuest component driven entirely by project content: theme world (data-world accent), Biyoo costume slot, title as "Quest name", oneLiner, 3 bullets (problem, what I built, what I learned) from content, proof links, and status label.
2. For any project whose repo/demo is null, show the label "in design" in production ONLY if /docs/03 says so explicitly; otherwise hide the card in production and show a dev badge. Never imply a project is built when it is not verified.
3. Add a 6-10s optional micro-animation per quest that plays once on entering the viewport (transform/opacity only). Reduced mode: none.
4. Theme assignments from /docs/13 (Echo: Bleach inner-world / sword spirit idea, Lumina Clinical: One Piece island idea, ReelClaim: Death Note verdict-stamp idea). These are visual themes with original art only. No official logos, characters, or panels.
5. Render only projects that exist in content. Do not create content for projects not in /docs/03.

Commit: `phase2-4: side quests`.
```

---
## P2-5 Reader's Record (skills as ORV item info boxes)
Read: /docs/03 (Skills), /docs/02.
```text
Follow CLAUDE.md. Read /docs/03-CONTENT-BIBLE.md Skills section and /docs/02-DESIGN-SYSTEM.md.

TASK: Build the Reader's Record.

1. A grid of "items" (one per skill in src/content/skills.ts). Hover/focus/tap opens an item-inspection SystemWindow: name, one-line story (from content, null => dev badge/hidden in production), and "Evidence" links to the project worlds that prove it.
2. NO levels, grades, percentages, bars, stars, or rarity labels. Add a lint-style test in scripts/check-content.ts that fails strict mode if any skill text includes %, "level", "expert", "advanced", "beginner", or "master".
3. Skills with no proofProjectIds are not rendered and fail strict check.
4. Keyboard accessible (Enter/Space opens, Escape closes), tap-to-open on mobile, focus trap only within the open info box, aria-labelledby/aria-describedby set.
5. Biyoo "proud" reaction when a proof link is opened. Reduced mode: no animated open.

Commit: `phase2-5: readers record`.
```

---
## P2-6 Chapter 0: The Protagonist's Origin (About)
Read: /docs/03 (About), /docs/02.
```text
Follow CLAUDE.md. Read /docs/03-CONTENT-BIBLE.md About section. My approved draft text is provided below between the markers. Use it verbatim; do NOT rewrite or embellish it, do NOT add facts.

<<<ABOUT_DRAFT
[Sumit pastes the final 3 paragraphs here after Claude chat has edited them]
ABOUT_DRAFT>>>

TASK: Build the Chapter 0 section.

1. Title "Chapter 0: The Protagonist's Origin", narration font (Cormorant Garamond italic) for paragraphs, subtle page-turn reveal (opacity/translate, once).
2. Content lives in src/content/about.ts. If the draft block above is empty or contains the placeholder text, STOP and report that the draft is missing.
3. Also render the same text in /skip.
4. Add one hidden-fragment hook: reserve a data attribute (data-fragment="tail") at the bottom-right edge of this section for Phase 3. Do not implement the fragment yet.

Commit: `phase2-6: chapter 0 about`.
```

---
## P2-7 Constellation lines integration across worlds
Read: /docs/14, /docs/07.
```text
Follow CLAUDE.md. Read /docs/14-CONSTELLATION-LINES.md and /docs/07-BIYOO-PERSONALITY-AND-SOUND.md.

TASK: Extend the lines engine from Phase 1 to the new sections.

1. Add section-aware contexts: world (per-world lines: Edge-Cloud #12,#13; Raft #14,#15; Z3 #16,#17; Backtrace #18; proof panels #19,#20), skills (#21,#22,#23), hover/click (#24-#26), meta (#30-#33), mobile (#34,#35).
2. Trigger world lines only once per world per session when it is at least 50% in view. Keep global rules: max 1 line per 20s, no repeats until the context is exhausted, never during the intro or while Biyoo's own bubble is visible.
3. Skip lines marked for features that do not exist yet (end/contact #36-#38, hidden #39-#40).
4. Local only. No storage beyond sessionStorage for "lines already shown".

Commit: `phase2-7: constellation lines`.
```

---
## P2-8 Phase 2 gate
Read: /docs/05.
```text
Follow CLAUDE.md. Read /docs/05-PROOF-GATES.md (Phase 2 gate).

TASK: Verify Phase 2 and write /docs/proofs/phase2.md. Do not add features.

1. For every number, percentage, test count, and claim rendered on the site, list its location in the code and the exact line in /docs/03 it came from. Flag any that does not match word-for-word.
2. Run Lighthouse mobile 3x median for "/" and "/skip"; run `npm run check:content -- --strict` and paste output.
3. Check each world on mobile viewport and in 'reduced' and 'light' modes. Mark PASS/FAIL/NEEDS MANUAL honestly.
4. Confirm no email, phone, or address string exists in the repo (git grep) and list any hits.
5. Report ScrollTrigger count leaks when navigating between sections.

Commit: `phase2-8: phase 2 gate report`.
```
