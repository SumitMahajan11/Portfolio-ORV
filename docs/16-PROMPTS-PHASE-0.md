# 16 Prompts: Phase 0 (Foundation, no characters)

Before P0-1: copy `CLAUDE.md` to the repo root and keep the `/docs` folder there. Open the repo folder in Claude Code. Each prompt below is pasted as-is. After each one, capture the proof, paste it to Claude (chat), get "pass", then continue.

---
## P0-1 Project setup
Read first: CLAUDE.md, /docs/04-TECH-AND-FOLDER-SPEC.md.
```text
Follow CLAUDE.md. Read /docs/04-TECH-AND-FOLDER-SPEC.md.

TASK: Scaffold the project.

1. Inspect the repo root. It already contains /docs and CLAUDE.md. Do not delete or overwrite them.
2. Create a Next.js app (latest stable, App Router, TypeScript, Tailwind, ESLint, `src/` directory, import alias `@/*`, no Turbopack requirement) in the repo root. If create-next-app refuses because the folder is not empty, scaffold into a temporary subfolder and move everything into the root, preserving /docs and CLAUDE.md. Remove the temporary folder after.
3. Turn on TypeScript strict mode (verify tsconfig).
4. Install `gsap` and `@gsap/react`. Nothing else.
5. Create the folder structure from /docs/04 exactly (empty folders get a `.gitkeep`): public/art/dokja, public/art/biyoo, public/art/worlds, public/audio, public/resume, src/components/{system-window,biyoo,dokja,ui}, src/lib/{motion,reader,device}, src/content, src/styles, src/app/{skip,wanted}.
6. Add npm scripts: keep dev/build/start/lint, add `typecheck` (`tsc --noEmit`).
7. Replace the default home page with a minimal page that says "Portfolio under construction" (no default Next.js boilerplate, no default logos).
8. Make sure .gitignore covers node_modules, .next, .env*.local, and Windows junk. Create `.env.example` with no real values (empty file with a comment is fine).
9. `git init` if needed, make sure the default branch is `main`, commit: `phase0-1: scaffold project`.

Do NOT add any design, tokens, fonts, or animation yet.
Run build, lint, typecheck. Give the final report in the CLAUDE.md format.
```
Capture: `npm run dev` screenshot of the home page; terminal output of build/lint/typecheck; `git log --oneline`.

---
## P0-2 Design tokens and style test page
Read first: /docs/02-DESIGN-SYSTEM.md.
```text
Follow CLAUDE.md. Read /docs/02-DESIGN-SYSTEM.md fully.

TASK: Implement the design system.

1. Check which Tailwind major version was installed. If v4, define tokens via CSS variables in src/styles/globals.css and expose them with `@theme`. If v3, use tailwind.config. Do not mix approaches.
2. Implement every hub color token from /docs/02 as CSS variables with the EXACT hex values given (--void, --ink, --ink-2, --line, --feather, --mist, --rim, --star, --horn, --horn-dark) and make them available as Tailwind colors (e.g. bg-void, text-feather).
3. Implement the five world palettes as scoped CSS variables under `[data-world="edge-cloud" | "raft" | "z3" | "backtrace" | "sidequest"]` with the values listed in /docs/02. Do not leak world colors to the hub.
4. Load fonts with next/font/google: Cinzel, Space_Grotesk, JetBrains_Mono, Cormorant_Garamond (italic). Expose as CSS variables and Tailwind font families (display, ui, mono, narration). Use `display: swap`.
5. Set body defaults: background var(--void), text var(--feather), font ui, 16px, line-height 1.6. Add visible focus ring using --star for all focusable elements.
6. Create the SystemWindow component in src/components/system-window/ per the "ORV system window" spec in /docs/02 (border --line, --ink at 85% opacity, corner ticks, mono text, teal header bar, subtle scan-line done in CSS only). Props: title, children, optional footer. Pure CSS, no GSAP.
7. Rule check: --horn (red) must NOT be used anywhere except a clearly labeled demo swatch on the style test page.
8. Create /style-test route (not linked from navigation) showing: all color swatches with hex and token name, all world palettes, type scale (12/14/16/20/28/40/64/96) in each font, and two SystemWindow examples.
9. Add `prefers-reduced-motion` base CSS: disable CSS animations/transitions globally under reduce.

Commit: `phase0-2: design tokens and style test`.
```
Capture: screenshot of /style-test (full page, desktop and phone width); build/lint/typecheck output.

---
## P0-3 Typed content layer and content checker
Read first: /docs/03-CONTENT-BIBLE.md, /docs/04.
```text
Follow CLAUDE.md. Read /docs/03-CONTENT-BIBLE.md and /docs/04-TECH-AND-FOLDER-SPEC.md.

TASK: Build the content layer. This is the most important rule enforcer in the project.

1. In src/content create typed files: identity.ts, projects.ts, skills.ts, lines.ts (Constellation lines from /docs/14), about.ts.
2. Define types in src/content/types.ts. A Project has: id, title, status ('flagship' | 'sidequest'), world ('edge-cloud'|'raft'|'z3'|'backtrace'|'sidequest'), oneLiner (string | null), claims: array of { text: string; evidence: 'verified' | 'unverified'; source: string | null }, limits: string[], links: { repo: string|null; demo: string|null; benchmark: string|null }, costume: string.
3. Populate ONLY what /docs/03 marks [VERIFIED]. Use `null` for anything marked [FILL] or [VERIFY]. Copy the verified Ratify and iac-verifier claims word-for-word from /docs/03 including the required Ratify limit line ("3-node, correctness project, not a performance benchmark."). Backtrace status stays 'sidequest' until /docs/03 says otherwise. Edge-Cloud has NO numeric claims.
4. Skills: structure only (name, story: string|null, proofProjectIds: string[]). A skill with zero proofProjectIds must be rejected by the checker. Use only the starter proof map in /docs/03 and mark each as needing confirmation by leaving story null.
5. lines.ts: all 40 lines from /docs/14 with fields {id, text, context: 'hero'|'fast-scroll'|'idle'|'world'|'skills'|'hover'|'time-night'|'time-morning'|'meta'|'mobile'|'end'|'hidden'}.
6. Create scripts/check-content.ts (run with `npx tsx` only if tsx is already installed; otherwise write it as a plain Node script using a Node-compatible approach and tell me what you chose; do NOT add dependencies without asking). Add `npm run check:content`. Behavior: lists every null field and every 'unverified' claim; exits 0 by default (warn mode); exits 1 with `--strict` if any published project (status flagship) has a null repo link, any unverified claim, any skill without proof, or any banned phrase from /docs/03 appears in src/content.
7. Create a dev-only `<FillBadge />` component (renders a small "[FILL]" tag only when NODE_ENV !== 'production') and a helper `renderField(value)` that shows the value or the badge. In production, nulls render nothing.
8. Root layout: create a persistent header with a "Skip to plain version" link to /skip, visible on first paint, keyboard focusable.

Commit: `phase0-3: content layer, checker, layout`.
```
Capture: output of `npm run check:content` and `npm run check:content -- --strict` (strict is expected to fail now, that is correct); screenshot of header.

---
## P0-4 Skip mode
Read first: /docs/01, /docs/03.
```text
Follow CLAUDE.md. Read /docs/01-MASTER-BLUEPRINT.md section 3 and /docs/03-CONTENT-BIBLE.md.

TASK: Build /skip, the plain, fast, accessible version containing ALL story content.

1. Server-rendered, no GSAP, no client JS beyond Next defaults. Semantic HTML: <main>, <h1> (Sumit Mahajan), sections with <h2>: About (Chapter 0 placeholder from about.ts), Scenarios (each project: title, oneLiner, claims, limits, links), Reader's Record (skills with proof links), Links (GitHub, LinkedIn placeholders). There must be no email, phone, or address; the contact section says the contact form arrives later.
2. Style with the design tokens. Readable single column, max-width ~72ch, strong contrast, visible focus.
3. Each project must show its status honestly: unverified/null items render via renderField (dev badge only).
4. Add a "Back to the story" link to "/".
5. Include a skip-to-content link, proper landmarks, alt text where images exist (none yet).
6. Add page metadata (title, description) for /skip.

Commit: `phase0-4: skip mode`.
```
Capture: Lighthouse mobile report for /skip (Performance, Accessibility, Best Practices, SEO scores); a short video of keyboard-only navigation (Tab through everything).

---
## P0-5 Motion foundation and device detection
Read first: /docs/02, /docs/04.
```text
Follow CLAUDE.md. Read /docs/02-DESIGN-SYSTEM.md (Motion rules, Performance budgets) and /docs/04.

TASK: Build the motion and device foundation. No visible scenes yet.

1. src/lib/motion/setup.ts: register gsap ScrollTrigger exactly once (guard against double registration and SSR), export `gsap`, `ScrollTrigger`, easing tokens from /docs/02 (entrance power3.out, transition power2.inOut, biyoo elastic.out(1,0.5)), and duration tokens (micro, ui, scene).
2. src/lib/motion/use-scene.ts: a hook wrapping `useGSAP`/gsap.context that automatically reverts and kills ScrollTriggers on unmount.
3. src/lib/device/: detect `prefers-reduced-motion` (live, listens for changes), `navigator.hardwareConcurrency`, `navigator.deviceMemory` (may be undefined, notably Safari/Firefox: handle gracefully), coarse pointer / touch, and a short frame-time probe using requestAnimationFrame (about 500ms after load, only if the tab is visible) to detect janky devices. Produce a single mode: 'full' | 'light' | 'reduced'. Rules: reduced-motion preference => 'reduced' always; low memory/cores or slow probe => 'light'; `?light=1` forces light; `?full=1` forces full (not allowed to override reduced-motion).
4. src/lib/flags.ts: typed feature flags: lightMode, reducedMotion, soundOn (default false), cameraOn (default false). Provide a React context + hook `useMode()`. Server render must default to a safe mode with no hydration mismatch (decide mode after mount).
5. A hidden /dev/mode page (only available when NODE_ENV !== 'production') that shows the detected mode, each signal's raw value, and the particle cap for the mode (desktop 120, mobile 40, light 15 per /docs/02).
6. Decide scroll smoothing: implement ScrollTrigger scrub only (no extra smooth-scroll library). Write one paragraph in /docs/proofs/phase0.md justifying that and noting that Lenis is rejected unless a later gate proves it is smoother.

Commit: `phase0-5: motion and device foundation`.
```
Capture: screenshots of /dev/mode in three situations: normal, with `?light=1`, and with OS "reduce motion" on (or the DevTools rendering emulation).

---
## P0-6 Placeholders and first deploy
Read first: /docs/07, /docs/08, /docs/05.
```text
Follow CLAUDE.md. Read /docs/07-BIYOO-PERSONALITY-AND-SOUND.md (Look), /docs/08-ART-ASSET-LIST.md, /docs/05-PROOF-GATES.md (Phase 0 gate).

TASK: Placeholder art and deploy readiness.

1. Biyoo placeholder: an inline SVG blob component in src/components/biyoo/ with separate named groups matching the layer names in /docs/08 (body, head, horns L/R, arms L/R, legs L/R, eyes, mouth, plus an overlay group). Two small horns. Colors from tokens (soft --mist/--feather fluff, no red). Idle breathing bob using GSAP via use-scene (scale/translate only); in 'reduced' mode no animation.
2. Dokja placeholder: a component in src/components/dokja/ made of simple SVG/CSS shapes grouped with the layer names from /docs/08 (body, head, coat, horns, wings back L/R, wings front L/R, phone, glow). White wings and coat, horns in --horn-dark only (no bright red yet). Static, front-facing.
3. Home page "/" shows both placeholders on --void with the skip link visible. No other scenes.
4. Do not generate or download any images.
5. Deploy readiness: confirm `npm run build` succeeds in production mode; confirm no env vars are required to build; add a short README.md with run/build instructions and the doc index. I will deploy manually to Vercel through the dashboard (import GitHub repo, default Next.js settings). Do NOT run `vercel login`, do not add vercel.json unless required, tell me if something is required.
6. Create /docs/proofs/phase0.md with the Phase 0 gate checklist from /docs/05, each item marked [ ] (I will tick them after verifying).

Commit: `phase0-6: placeholders and deploy readiness`.
```
Capture: preview URL after you deploy to Vercel (push repo to GitHub, import in Vercel); screenshot of "/"; Lighthouse mobile for "/".

### Phase 0 gate (done when all true)
Build/lint/typecheck pass; /style-test OK; /skip passes keyboard test; `check:content` runs; /dev/mode works; preview URL live; no email/phone anywhere (`git grep -nEi "[A-Za-z0-9._-]+@[A-Za-z0-9-]+\.[a-z]{2,}|[0-9]{10}" -- . ":!package-lock.json"` returns no real email or phone (review each hit by eye)).
