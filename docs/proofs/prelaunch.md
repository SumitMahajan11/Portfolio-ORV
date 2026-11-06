# Pre-Launch Blocker Audit Report (Task P6-1)

**Date**: 2026-11-06  
**Auditor**: Antigravity Automated Verification Harness  
**Script**: [`scripts/audit-prelaunch.mjs`](file:///c:/Sumit%20Portfolio/scripts/audit-prelaunch.mjs)  
**Target Build**: Next.js Production Build (`next build` / `next start -p 3012`)  
**Audit Status**: **FAIL (Site is NOT safe to launch — 7 blockers detected across 5 failed rules)**

---

## 1. Executive Summary

A comprehensive pre-launch safety audit was executed against a standalone Next.js production server using automated HTTP route crawling and Google Chrome DevTools Protocol (CDP) DOM inspection. In accordance with task instructions, **no source code was modified**. 

The audit checked all 9 safety rules specified for Phase 6-1. The audit exited with non-zero status code (`1`) after detecting **7 launch blockers across 5 failed rules**. Four rules passed cleanly.

```
================================================================
                   AUDIT SUMMARY TABLE                          
================================================================
| Rule | Description | Status | Violations Count |
| :--- | :--- | :---: | :---: |
| Rule 1 | Internal Links & Interactive Buttons Crawl | **FAIL** | 1 |
| Rule 2 | Forbidden Placeholder Strings ([FILL], [VERIFY], Pre-launch, TODO, Phase <n>) | **FAIL** | 1 |
| Rule 3 | Flagship Project Repo and Demo Links | **FAIL** | 3 |
| Rule 4 | Resume Link & PDF Privacy | **PASS** | 0 |
| Rule 5 | Sound Permission Prompt & Audio Files | **FAIL** | 1 |
| Rule 6 | About Section Content | **FAIL** | 1 |
| Rule 7 | Contact Form Configuration in .env.example | **PASS** | 0 |
| Rule 8 | Hidden Fragments & True Ending Route Security | **PASS** | 0 |
| Rule 9 | Production Bundle PII & Secret Leakage | **PASS** | 0 |
================================================================
 PRE-LAUNCH BLOCKERS FOUND: 7 across 5 failed rules
================================================================
```

---

## 2. Rule-by-Rule Audit Breakdown

### Rule 1: Internal Links & Interactive Buttons Crawl
* **Specification**: An internal link or button points to a route that does not exist (crawl all internal hrefs, including the header, corner bounty button and `/skip`).
* **Methodology**: Crawled all anchor `href` and interactive `button` elements across `/` and `/skip` via CDP and SSR HTML. Sent HTTP GET requests to each target path on the production server (`http://localhost:3012`).
* **Status**: **FAIL**
* **Finding**: Route `/wanted` is referenced in the persistent Desktop Header and the Corner Bounty Button on both `/` and `/skip`, but returns HTTP 404 (route does not exist in `src/app/wanted`).
* **Violations**:
  1. `Broken internal route '/wanted' returned HTTP 404 (does not exist). Referenced on: / [Header: "Bounty board"], / [Corner Bounty Button: "Bounty board"], /skip [Header: "Bounty board"], /skip [Corner Bounty Button: "Bounty board"]`

---

### Rule 2: Forbidden Placeholder Strings on Rendered Pages
* **Specification**: Any rendered page contains `[FILL]`, `[VERIFY]`, `"Pre-launch"`, `"TODO"`, or `"Phase"` followed by a number.
* **Methodology**: Evaluated `document.body.innerText`, rendered DOM HTML, and server-rendered HTML across rendered pages (`/` and `/skip`) using regex patterns for each prohibited string.
* **Status**: **FAIL**
* **Finding**: Rendered plain version page `/skip` contains development copy referencing `"Phase 3"`.
* **Violations**:
  1. `Found forbidden text "Phase 3" (Phase <num>) on rendered page '/skip': "...irect contact form arrives in Phase 3. In strict compliance with pr..."`

---

### Rule 3: Flagship Project Repo and Demo Links
* **Specification**: A flagship project has a null repo or demo link.
* **Methodology**: Loaded `src/content/projects.ts` and inspected all projects with `status: "flagship"`. Checked whether `links.repo` or `links.demo` is null or empty.
* **Status**: **FAIL**
* **Finding**: All three flagship projects (`edge-cloud`, `ratify`, `iac-verifier`) currently have `links.repo: null` and `links.demo: null`.
* **Violations**:
  1. `Flagship project 'Edge-Cloud Orchestrator' (edge-cloud) has null/missing link(s): repo, demo`
  2. `Flagship project 'Ratify' (ratify) has null/missing link(s): repo, demo`
  3. `Flagship project 'iac-verifier' (iac-verifier) has null/missing link(s): repo, demo`

---

### Rule 4: Resume Link & PDF Privacy
* **Specification**: The resume link exists but the PDF file does not, or the PDF contains an email, phone number or street address.
* **Methodology**: Checked `identity.contact.resumePdf` and rendered DOM anchors for resume links. Verified whether the referenced file exists in `public/`. Scanned all PDF binaries in `public/` for email addresses, formatted phone patterns (10–12 digits), and physical street address indicators.
* **Status**: **PASS**
* **Finding**: `identity.contact.resumePdf` is `null` (not published), no resume link is rendered on production pages, and no PDF exists in `public/resume/` (only `.gitkeep`). No missing file reference or PII leak detected.

---

### Rule 5: Sound Permission Prompt & Audio Files
* **Specification**: The sound prompt shows but `public/audio` has no files.
* **Methodology**: Inspected `src/app/layout.tsx` for `<SoundPermissionPrompt />` mounting and checked `src/lib/sound/sound-context.tsx` for prompt activation. Read the contents of `public/audio` excluding `.gitkeep`.
* **Status**: **FAIL**
* **Finding**: `<SoundPermissionPrompt />` is mounted in `src/app/layout.tsx` and scheduled to prompt visitors for sound permission, but `public/audio` contains 0 audio files (only `.gitkeep`).
* **Violations**:
  1. `The sound permission prompt is mounted in src/app/layout.tsx and scheduled to display, but public/audio contains 0 audio files (only .gitkeep).`

---

### Rule 6: About Section Content
* **Specification**: The About section is empty.
* **Methodology**: Inspected `src/content/about.ts` for non-null, non-empty paragraph strings. Checked `#about` rendered DOM on `/skip` and `/`.
* **Status**: **FAIL**
* **Finding**: All 3 paragraphs in `src/content/about.ts` are `null` (`[null, null, null]`). The About section ("Chapter 0: The Protagonist's Origin") has zero filled content.
* **Violations**:
  1. `The About section (Chapter 0: The Protagonist's Origin) in src/content/about.ts is empty (all 3 paragraphs are null or empty).`

---

### Rule 7: Contact Form Configuration in .env.example
* **Specification**: The contact form is enabled but the `CONTACT_TO_EMAIL`, `RESEND_API_KEY` or `CONTACT_FROM_EMAIL` variable name is missing from `.env.example`.
* **Methodology**: Checked `identity.contact.formAvailable` in `src/content/identity.ts`. Verified that `.env.example` exists and contains declarations for `CONTACT_TO_EMAIL`, `RESEND_API_KEY`, and `CONTACT_FROM_EMAIL`.
* **Status**: **PASS**
* **Finding**: Contact form is enabled (`formAvailable: true`) and all 3 required environment variable placeholders are documented in `.env.example`:
  - `RESEND_API_KEY=re_your_api_key_here` (line 13)
  - `CONTACT_TO_EMAIL=your_inbox@example.com` (line 16)
  - `CONTACT_FROM_EMAIL=onboarding@resend.dev` (line 24)

---

### Rule 8: Hidden Fragments & True Ending Route Security
* **Specification**: Any hidden fragment or True Ending route is reachable without its trigger.
* **Methodology**: Sent unauthenticated HTTP requests to `http://localhost:3012/true-ending`. Inspected `src/app/` route tree for unearned fragment or secret ending endpoints. Verified rendered pages to ensure no secret fragments are visible without trigger.
* **Status**: **PASS**
* **Finding**: Route `/true-ending` does not exist as an unauthenticated open page (returns HTTP 404). No secret fragments or True Ending triggers are exposed or reachable by unauthorized visitors.

---

### Rule 9: Production Bundle PII & Secret Leakage
* **Specification**: The production bundle contains my email, phone number or any secret.
* **Methodology**: Scanned all client bundles in `.next/static/` and server app outputs in `.next/server/app/` for real email addresses, phone numbers, and secrets (Resend API keys, AWS keys, GitHub tokens, private keys). Benign build hashes and documentation examples (`example.com`, `resend.dev`, `schema.org`) were filtered.
* **Status**: **PASS**
* **Finding**: 0 real personal emails, 0 phone numbers, and 0 production secrets leaked in any production bundle or server output.

---

## 3. List of Blockers Requiring Fix Before Launch

The following **7 blockers** must be resolved before the site is safe to launch publicly:

1. **Create the `/wanted` page (`src/app/wanted/page.tsx`)**:
   - The desktop Header (`<Link href="/wanted">`) and `<CornerBountyButton />` link to `/wanted`.
   - Implement the One Piece-inspired bounty poster page or temporarily redirect/hide the links until built.
2. **Remove the development string from `/skip`**:
   - In `src/app/skip/page.tsx`, remove `"The direct contact form arrives in Phase 3."` and replace it with production copy.
3. **Provide Repository and Demo URLs for Flagship Projects (`src/content/projects.ts`)**:
   - `Edge-Cloud Orchestrator`: Set `links.repo` and `links.demo` (currently `null`).
   - `Ratify`: Set `links.repo` and `links.demo` (currently `null`).
   - `iac-verifier`: Set `links.repo` and `links.demo` (currently `null`).
4. **Place audio files in `public/audio` or suppress prompt**:
   - Add the audio files referenced by the sound system (`biyoo_chirp`, `ambient_breath`, etc.) to `public/audio/`, or disable `<SoundPermissionPrompt />` in `src/app/layout.tsx` until assets are provided.
5. **Fill the 3 paragraphs in Chapter 0: About (`src/content/about.ts`)**:
   - Paragraph 1: Where you started (Pune, CSE, initial interest).
   - Paragraph 2: What pulled you toward correctness and distributed systems (Raft, Z3).
   - Paragraph 3: What you are aiming for (open source, GSoC 2027) and what opportunities you are seeking.

---

## 4. Raw Audit Terminal Output

```text
================================================================
       PRE-LAUNCH BLOCKER AUDIT (TASK P6-1)                     
================================================================

[1/4] Spawning production server on port 3012...
[1/4] Production server ready at http://localhost:3012

[2/4] Launching Headless Chrome on CDP port 9231...
[2/4] Headless Chrome connected via CDP.

[3/4] Executing 9 Pre-Launch Blocker Checks...

--- Checking Rule 1: Internal Links & Interactive Buttons ---
  -> Result: FAIL (1 broken targets)

--- Checking Rule 2: Forbidden Placeholder Strings on Rendered Pages ---
  -> Result: FAIL (1 forbidden occurrences)

--- Checking Rule 3: Flagship Project Repo and Demo Links ---
  -> Result: FAIL (3 incomplete flagship projects)

--- Checking Rule 4: Resume Link & PDF Privacy ---
  -> Result: PASS (0 resume issues)

--- Checking Rule 5: Sound Permission Prompt & Audio Files ---
  -> Result: FAIL (1 sound issues)

--- Checking Rule 6: About Section Content ---
  -> Result: FAIL (1 about issues)

--- Checking Rule 7: Contact Form Environment Variables ---
  -> Result: PASS (0 env var issues)

--- Checking Rule 8: Hidden Fragments & True Ending Route Security ---
  -> Result: PASS (0 security leaks)

--- Checking Rule 9: Production Bundle PII & Secret Leakage ---
  -> Result: PASS (0 bundle leaks)

================================================================
                   AUDIT SUMMARY TABLE                          
================================================================

| Rule | Description | Status | Violations Count |
| :--- | :--- | :---: | :---: |
| Rule 1 | Internal Links & Interactive Buttons Crawl | **FAIL** | 1 |
| Rule 2 | Forbidden Placeholder Strings ([FILL], [VERIFY], Pre-launch, TODO, Phase <n>) | **FAIL** | 1 |
| Rule 3 | Flagship Project Repo and Demo Links | **FAIL** | 3 |
| Rule 4 | Resume Link & PDF Privacy | **PASS** | 0 |
| Rule 5 | Sound Permission Prompt & Audio Files | **FAIL** | 1 |
| Rule 6 | About Section Content | **FAIL** | 1 |
| Rule 7 | Contact Form Configuration in .env.example | **PASS** | 0 |
| Rule 8 | Hidden Fragments & True Ending Route Security | **PASS** | 0 |
| Rule 9 | Production Bundle PII & Secret Leakage | **PASS** | 0 |

================================================================
 PRE-LAUNCH BLOCKERS FOUND: 7 across 5 failed rules
================================================================

LIST OF PROBLEMS REQUIRING USER FIX BEFORE PRODUCTION LAUNCH:

[Rule 1: Internal Links & Interactive Buttons Crawl]
  1. Broken internal route '/wanted' returned HTTP 404 (does not exist). Referenced on: / [Header: "Bounty board"], / [Corner Bounty Button: "Bounty board"], /skip [Header: "Bounty board"], /skip [Corner Bounty Button: "Bounty board"]

[Rule 2: Forbidden Placeholder Strings ([FILL], [VERIFY], Pre-launch, TODO, Phase <n>)]
  2. Found forbidden text "Phase 3" (Phase <num>) on rendered page '/skip': "...irect contact form arrives in Phase 3. In strict compliance with pr..."

[Rule 3: Flagship Project Repo and Demo Links]
  3. Flagship project 'Edge-Cloud Orchestrator' (edge-cloud) has null/missing link(s): repo, demo
  4. Flagship project 'Ratify' (ratify) has null/missing link(s): repo, demo
  5. Flagship project 'iac-verifier' (iac-verifier) has null/missing link(s): repo, demo

[Rule 5: Sound Permission Prompt & Audio Files]
  6. The sound permission prompt is mounted in src/app/layout.tsx and scheduled to display, but public/audio contains 0 audio files (only .gitkeep).

[Rule 6: About Section Content]
  7. The About section (Chapter 0: The Protagonist's Origin) in src/content/about.ts is empty (all 3 paragraphs are null or empty).

>>> AUDIT RESULT: FAIL (Blockers detected. Site is NOT safe to launch.)
```
