# CLAUDE.md (copy to the repo ROOT before running any prompt)

Project: ORV story-portfolio for Sumit Mahajan. Single source of truth lives in /docs. Read the docs named in each prompt before coding.

## Standing rules (apply to every task)
1. Do ONLY the task in the prompt. No features from later phases. No "while I'm here" refactors.
2. Facts and copy come ONLY from /docs/03-CONTENT-BIBLE.md. Never invent a number, metric, claim, link, name, or date. Missing facts stay `null` in /src/content and render as a visible dev-only "[FILL]" badge, never as made-up text.
3. Never expose a phone number, email address, or street address anywhere in code, content, git history, or comments. Secrets go in `.env.local` (gitignored) and `.env.example` (placeholders only).
4. Stack is locked: Next.js (App Router), TypeScript strict, Tailwind, GSAP + ScrollTrigger. Do not add other dependencies without asking first. When asking, give the package, why, and size.
5. Animate only `transform` and `opacity`. Every animated scene must have a static fallback that shows the same content (skip mode / reduced motion / light mode).
6. Respect budgets in /docs/02. If a change would break a budget, simplify the effect and tell me.
7. Reader-behavior features run locally in the browser only. No analytics, no network calls, no cookies for tracking.
8. All art in the repo is original or generated placeholder. Never use official ORV, One Piece, Naruto, Bleach, HxH, or Conan images, logos, or panels. Use names and ideas as themes only.
9. TypeScript: no `any`, no `@ts-ignore`. Components are small and single-purpose. Copy lives in /src/content, not in JSX.
10. Windows and PowerShell are the dev environment. Use cross-platform npm scripts; do not rely on bash-only syntax in package.json.
11. If the prompt is ambiguous or conflicts with a doc, STOP and ask ONE clear question instead of guessing. If a doc and a prompt conflict, the doc wins; tell me about the conflict.
12. Before finishing: run `npm run build`, `npm run lint`, and `npx tsc --noEmit`. Fix all errors. Do not claim anything works unless you ran it. If you could not test something, say so explicitly.
13. Final report format (always): (a) what you did, (b) files created/changed, (c) commands run with results, (d) deviations from the prompt and why, (e) known issues, (f) the exact proof I must capture.
14. Commit once at the end of the task: `phaseN-task: short description`. Do not push.
15. Do not edit /docs except /docs/proofs/*. If a doc needs a change, tell me.
16. Biyoo's look and the wall art are approved and frozen. Never redraw, recolor, restyle or replace them. Only crop, resize, compress and position them.
