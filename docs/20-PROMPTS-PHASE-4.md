# 20 Prompts: Phase 4 (Polish and launch)

Prerequisite: Phase 3 gate passed. Real content in /docs/03 filled; every [FILL] either filled or removed. Rule: a failed metric means simplify the effect, not lower the bar.

Before starting Phase 4: ensure the Phase 3 gate report in `/docs/proofs/phase3.md` is complete, unverified claims in `/docs/03-CONTENT-BIBLE.md` have been updated or removed, and pending drafts (resume PDF, Wanted page copy, True Ending text) are in place.

---
## P4-1 Performance audit and fixes
Read: /docs/02-DESIGN-SYSTEM.md (Performance budgets), /docs/05-PROOF-GATES.md.
```text
Follow CLAUDE.md. Read /docs/02-DESIGN-SYSTEM.md (Performance budgets) and /docs/05-PROOF-GATES.md.

TASK: Audit performance and optimize to meet all Phase 4 budgets.

1. Measure initial JS bundle size and dynamic imports. Enforce budget: initial JS under 200KB gzipped. Ensure world modules, heavy visualizers (Raft, Z3 graph), camera reflection, and audio modules are lazy-loaded via `next/dynamic` or dynamic import.
2. Optimize the hero interactive experience (/):
   - Hero layer assets must be under 1.5MB total on mobile. Ensure WebP/AVIF formats with appropriate responsive sizing.
   - Particle caps: strictly enforce max 120 particles on desktop, 40 on mobile, 15 in light mode.
   - Animate only `transform` and `opacity`. Verify zero layout triggers or paint thrashing during scroll-scrubbing.
   - Add/verify `will-change: transform, opacity` during active animations, and clean it up when idle.
3. Optimize the accessible skip mode (/skip):
   - Ensure near-zero animation overhead, minimal JS execution, and clean semantic DOM.
   - Target: Lighthouse mobile Performance >= 90, TBT < 100ms, CLS < 0.02.
4. Optimize the Wanted page (/wanted):
   - Ensure poster assets, badge elements, and action lists render fast without blocking or shifting layout.
5. Lighthouse mobile benchmarks (run 3x on mobile emulation / throttled 4G):
   - Hub (/): Performance >= 80, LCP < 2.5s, CLS < 0.05, INP < 200ms.
   - Skip (/skip): Performance >= 90.
6. Enforce the hard rule: if any metric fails the budget, SIMPLIFY THE EFFECT (e.g. reduce particles, simplify SVG layers, throttle scroll ticks), NEVER lower the target.
7. Run `npm run build`, `npm run lint`, and `npx tsc --noEmit`.

Commit: `phase4-1: performance audit and fixes`.
```
Capture: 3x median Lighthouse mobile reports for `/` and `/skip`; bundle analysis output; list of simplified effects if any.

---
## P4-2 Cross-browser and device pass
Read: /docs/01-MASTER-BLUEPRINT.md, /docs/02-DESIGN-SYSTEM.md, /docs/06-DOKJA-TRANSFORMATION-SPEC.md.
```text
Follow CLAUDE.md. Read /docs/01-MASTER-BLUEPRINT.md (Hard rules), /docs/02-DESIGN-SYSTEM.md, and /docs/06-DOKJA-TRANSFORMATION-SPEC.md.

TASK: Validate and fix layout and interaction quirks across browsers and viewport sizes.

1. Browser compatibility pass:
   - WebKit / iOS Safari: verify `100dvh` vs `100vh` behavior for hero and full-screen scenes; handle iOS momentum scroll without jitter; respect safe-area insets (`env(safe-area-inset-bottom)`) for the bottom Biyoo button and contact form.
   - Firefox: verify SVG transform origins, CSS custom properties scoping in `data-world` sections, and backdrop-filter fallback.
   - Chrome / Edge: verify smooth GSAP ScrollTrigger scrubbing and Web Audio context resumption.
2. Viewport responsiveness pass across exact breakpoints:
   - 360x740 (compact Android phone): zero horizontal overflow, bottom-right Biyoo bounty button sits cleanly without obscuring text.
   - 390x844 (standard iPhone): clean spacing, safe-area padding respected.
   - 768x1024 (tablet portrait) & 1024x768 (tablet landscape): clean scenario grid, legible typography.
   - 1440x900 & 1920x1080 (desktop / laptop): wings scale gracefully, lit figure centered, crisp borders.
3. Touch target pass:
   - Every interactive control (Skip link, sound prompt buttons, sound toggle, scenario cards, fragment triggers, corner bounty button, contact form inputs/button, camera toggle) must meet the minimum 44x44px touch target.
   - Hover states must not stick on touch devices (use `@media (hover: hover)`).
4. Run `npm run build`, `npm run lint`, and `npx tsc --noEmit`.

Commit: `phase4-2: cross browser and device pass`.
```
Capture: Screenshots/recordings on 360px width, 768px width, and 1440px width; verification of touch target sizes; notes on browser-specific fixes applied.

---
## P4-3 SEO, Open Graph image, Favicon, and 404 page
Read: /docs/01-MASTER-BLUEPRINT.md, /docs/02-DESIGN-SYSTEM.md, /docs/03-CONTENT-BIBLE.md.
```text
Follow CLAUDE.md. Read /docs/01-MASTER-BLUEPRINT.md, /docs/02-DESIGN-SYSTEM.md, and /docs/03-CONTENT-BIBLE.md.

TASK: Implement metadata, Open Graph preview card, favicons, robots/sitemap, and custom 404 page.

1. Metadata & Open Graph in src/app/layout.tsx:
   - Title: "Sumit Mahajan | Omniscient Reader's Viewpoint Portfolio"
   - Description: concise summary of Sumit Mahajan's story-portfolio, distributed systems, and verified Scenarios.
   - Canonical URL, keywords, authors, theme-color (#07080B).
   - Open Graph tags (`og:title`, `og:description`, `og:url`, `og:type`, `og:image`, `og:image:width`, `og:image:height`).
   - Twitter card metadata (`summary_large_image`).
2. Open Graph image (`src/app/opengraph-image.tsx` or static asset in `public/`):
   - 1200x630px, styled with hub palette (`--void` #07080B background, teal `--star` constellation lines, Dokja silhouette, Cinzel display title).
   - Clean, original art design with zero copyrighted assets.
3. Favicon and app icons:
   - Provide `src/app/icon.svg` or `src/app/favicon.ico` and `apple-icon.png` using Biyoo's silhouette or the teal `--star` geometric token.
4. Custom 404 page (`src/app/not-found.tsx`):
   - Styled as an ORV System Window notification.
   - Header: "[SCENARIO FAILED: PROBABILITY EXHAUSTED]" in Cinzel font with `--line` border and `--ink` background.
   - Message: "The dokkaebi channel could not locate this timeline. Probability exhausted."
   - Subtle Biyoo reaction (code-drawn puzzled/startled face).
   - Navigation options: "Return to Main Scenario" (links to `/`) and "Read Plain Text" (links to `/skip`).
   - No broken layout, no missing assets, fully accessible.
5. Create `public/robots.txt` and `src/app/sitemap.ts` listing `/`, `/skip`, and `/wanted`.
6. Run `npm run build`, `npm run lint`, and `npx tsc --noEmit`.

Commit: `phase4-3: seo og favicon and 404`.
```
Capture: Screenshot of the custom 404 page; Open Graph preview card image; terminal output of build showing static sitemap/robots.

---
## P4-4 Accessibility (a11y) audit
Read: /docs/02-DESIGN-SYSTEM.md (Accessibility), /docs/05-PROOF-GATES.md.
```text
Follow CLAUDE.md. Read /docs/02-DESIGN-SYSTEM.md (Accessibility section) and /docs/05-PROOF-GATES.md.

TASK: Complete a comprehensive accessibility audit and remediate any violations.

1. Automated accessibility audit:
   - Run axe-core / Lighthouse Accessibility on `/`, `/skip`, and `/wanted`.
   - Score targets: 100/100 on `/skip`, >= 96 on `/`.
   - Resolve all contrast, ARIA, and role violations.
2. Keyboard navigation verification:
   - The "Skip to plain version" button must be the first focusable element on `/`.
   - Logical tab sequence through all interactive elements: skip link -> sound prompt / toggle -> scenario cards -> fragment hints -> finale contact form -> corner bounty button.
   - Every focusable element must display a distinct visible focus outline using `--star` (#5EE1E6).
   - Zero keyboard focus traps. Esc key dismisses sound permission prompt or any open overlay.
3. Screen reader & semantic tree:
   - Landmarks: verify `<header>`, `<main>`, `<nav>`, `<section>`, and `<footer>` semantics.
   - Heading hierarchy: single `<h1>` per page, sequential `<h2>` and `<h3>` tags with no skipped levels.
   - Accessible names (`aria-label`) on icon-only buttons (sound toggle, camera toggle, bounty button, external links).
   - Ensure all decorative SVGs have `aria-hidden="true"`.
4. Motion accessibility:
   - Under `prefers-reduced-motion: reduce`, all auto-advancing timelines, parallax transforms, and floating loops must immediately halt and render their static fallback.
   - The sound breath loop must remain silent when reduced motion is requested.
5. Run `npm run build`, `npm run lint`, and `npx tsc --noEmit`.

Commit: `phase4-4: accessibility audit`.
```
Capture: Lighthouse Accessibility scorecards (100% on `/skip`); keyboard tabbing recording; report on contrast checks.

---
## P4-5 Friend test protocol and UX pass
Read: /docs/01-MASTER-BLUEPRINT.md, /docs/05-PROOF-GATES.md.
```text
Follow CLAUDE.md. Read /docs/01-MASTER-BLUEPRINT.md and /docs/05-PROOF-GATES.md (Friend test requirement).

TASK: Set up the friend test observation protocol and remediate friction points.

1. Create `/docs/proofs/friend-test-protocol.md` containing:
   - Test premise: give a friend a mobile link on their own phone with NO instructions.
   - 5 Key observation targets:
     (a) Do they find the skip link if they want plain reading?
     (b) Do they understand that scrolling drives Dokja's transformation?
     (c) Do they discover Biyoo's reactions and the corner bounty button?
     (d) Do they inspect project proof panels in Scenario Select?
     (e) Do they reach the finale contact form without getting stuck?
   - Structured observation log table (Participant, Device, Browser, Time to First Interaction, Confusions, Feedback).
2. UX polish based on self-walkthrough and heuristic evaluation:
   - Check scroll-scrub indicator / nudge: ensure first-time readers realize they need to scroll.
   - Check Biyoo wake delay: ensure the 8s idle wake does not startle or block navigation.
   - Check contact form feedback: clear error state, sending indicator, and success confirmation.
3. Run `npm run build`, `npm run lint`, and `npx tsc --noEmit`.

Commit: `phase4-5: friend test protocol and ux polish`.
```
Capture: `/docs/proofs/friend-test-protocol.md` created; list of UX friction fixes applied.

---
## P4-6 Pre-launch checklist, repo sanitation, and deployment
Read: /docs/01-MASTER-BLUEPRINT.md, /docs/03-CONTENT-BIBLE.md, /docs/04-TECH-AND-FOLDER-SPEC.md.
```text
Follow CLAUDE.md. Read /docs/01-MASTER-BLUEPRINT.md, /docs/03-CONTENT-BIBLE.md, and /docs/04-TECH-AND-FOLDER-SPEC.md.

TASK: Execute the pre-launch sanitation and production deployment verification.

1. Repo & tree sanitation:
   - Clean the iac-verifier repository root (remove tfsec.exe, scratch/, loose checkov_*.json) per /docs/03.
   - Clean the portfolio repo: verify `.gitignore` excludes all `.env*.local`, `.next`, debug logs, and temporary test artifacts.
   - Ensure no extraneous files exist in `public/` or `src/`.
2. Strict PII & secrets verification:
   - Run `node scripts/audit-pii-secrets.mjs` against `src/`, `public/`, `docs/`, and `.next/`.
   - Confirm ZERO personal emails, ZERO phone numbers, and ZERO API secrets.
3. Content Bible strict validation:
   - Run `npm run check:content -- --strict`.
   - Every single claim, metric, link, and story line must be verified or gracefully removed.
   - Flagship project repos must have valid verified URLs or confirmed status.
4. Security headers and Vercel configuration:
   - Verify security headers in `next.config.ts`: CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy: camera=(self)`.
   - Verify production build succeeds cleanly: `npm run build`, `npm run lint`, `npx tsc --noEmit`.
5. Deploy to Vercel production and verify the live domain.

Commit: `phase4-6: prelaunch checklist and sanitation`.
```
Capture: Output of `audit-pii-secrets.mjs`; output of `npm run check:content -- --strict`; production build summary.

---
## P4-7 Phase 4 Gate: Final Launch Verification
Read: /docs/05-PROOF-GATES.md (Phase 4 gate).
```text
Follow CLAUDE.md. Read /docs/05-PROOF-GATES.md Phase 4 gate and Fail rule.

TASK: Verify all Phase 4 criteria and compile /docs/proofs/phase4.md.

1. Walk through every Phase 4 gate criterion with PASS/FAIL evidence:
   - Lighthouse Mobile: >= 90 on /skip, >= 80 on /, >= 90 on /wanted (3x median).
   - Cross-browser verification: Chrome, Safari iOS, Firefox.
   - Meta assets: 404 page, OG image preview, favicon, sitemap, robots.txt.
   - Accessibility: 100 on skip, keyboard navigation verified.
   - Friend test: completed observation log recorded.
   - Zero PII / secret leaks: verified with automated scanner.
   - Content Bible: 100% verified claims, zero unverified numbers.
2. Enforce the fail rule:
   - If any metric dropped below the budget, record what effect was simplified to recover it.
3. Compile the comprehensive launch report in `/docs/proofs/phase4.md`.
4. Run `npm run build`, `npm run lint`, and `npx tsc --noEmit`.

Commit: `phase4-7: phase 4 gate report`.
```
Capture: `/docs/proofs/phase4.md`; live site URL; final mobile Lighthouse scorecard screenshots.
