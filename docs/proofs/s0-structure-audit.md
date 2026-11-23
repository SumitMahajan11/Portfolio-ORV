# Structure Audit Report (Task structure-S0)

**Date**: 2026-11-10  
**Repository**: Portfolio-ORV-main  
**Audit Scope**: Route hierarchy, DOM section architecture, fixed/sticky viewport geometry, Dokja removal verification, and commit 1c402f5 camera-reflection analysis.  
**Constraint**: Read-only audit; zero modifications under `src/`.

---

## 1. Section Map

### 1.1 Complete Section Inventory on `/` (DOM Order)

The table below catalogs every `<section>` on `/` in exact top-to-bottom DOM rendering order, along with its server/client component boundary, dynamic mounting behavior, living wall tint mapping, and inbound references.

| DOM Order | Section ID | Component File & Export | Server / Client | Mount Timing | Wall Tint (`walls.ts`) | Inbound References (Links / Triggers) | Status / Notes |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **1** | `hero-scene` | `src/components/home/archive-hero.tsx` (`ArchiveHero`) | Server | Immediate (SSR) | `hub` *(fallback)* | Header logo links to `/`. No anchor points to `#hero-scene`. | **Mismatch**: `walls.ts` monitors stale `hero-scene-container` instead of `hero-scene`. |
| **2** | `scenario-select` | `src/components/scenario-select/scenario-select.tsx` (`ScenarioSelect`) | Client (`"use client"`) | Immediate dynamic (`ssr: true`) | `hub` | `archive-hero.tsx:50` (`#scenario-select`), `edge-cloud-world.tsx:171, 294`, `raft-world.tsx:118, 291`, `z3-world.tsx:113, 258`, `side-quests-section.tsx:60`, `readers-record.tsx:83`. | Fully referenced hub navigation anchor. |
| **3** | `edge-cloud` | `src/components/worlds/edge-cloud/edge-cloud-world.tsx` (`EdgeCloudWorld`) | Client (`"use client"`) | Deferred dynamic (`ssr: false`) | `edge-cloud` | `scenario-select.tsx:111` (`#${project.id}`), `skill-system-window.tsx:202` (via proofProjectId `edge-cloud`). | Flagship scenario 1. Content visibility auto. |
| **4** | `ratify` | `src/components/worlds/raft/raft-world.tsx` (`RaftWorld`) | Client (`"use client"`) | Deferred dynamic (`ssr: false`) | `raft` | `scenario-select.tsx:111` (`#${project.id}`), `skill-system-window.tsx:202` (via proofProjectIds for `Rust`, `TLA+`, `Distributed Systems`). | Flagship scenario 2. Content visibility auto. |
| **5** | `iac-verifier` | `src/components/worlds/z3/z3-world.tsx` (`Z3World`) | Client (`"use client"`) | Deferred dynamic (`ssr: false`) | `z3` | `scenario-select.tsx:111` (`#${project.id}`), `skill-system-window.tsx:202` (via proofProjectIds for `Z3 / SMT`, `Terraform`, `IaC Security`). | Flagship scenario 3. Content visibility auto. |
| **6** | `side-quests` | `src/components/side-quests/side-quests-section.tsx` (`SideQuestsSection`) | Client (`"use client"`) | Deferred dynamic (`ssr: false`) | `hub` | **NONE**. No link or button on the entire site points to `#side-quests`. | **Orphan Section**: Exists in DOM but unreferenced by navigation. |
| **7** | `readers-record` | `src/components/readers-record/readers-record.tsx` (`ReadersRecord`) | Client (`"use client"`) | Deferred dynamic (`ssr: false`) | `hub` | `archive-hero.tsx:57` (`#readers-record`). | Skills ORV item boxes. |
| **8** | `contact` | `src/components/finale/FinaleSection.tsx` (`FinaleSection`) | Client (`"use client"`) | Deferred dynamic (`ssr: false`) | `hub` | `src/app/layout.tsx:173` (`/#contact`). | Act 6 finale stage and contact form. |
| **9** | *(none)* | `src/app/page.tsx:32-59` (Footer nav) | Server | Immediate (SSR) | `hub` *(inherits)* | **NONE**. Anonymous wrapper `<section>`. | Contains links to `/skip`, `/style-test`, `/dev/mode`. |

---

### 1.2 Missing, Dangling, or Broken Section References

1. **Critical Wall Controller Bug: `hero-scene-container` does not exist in DOM**
   - **Location**: `src/content/walls.ts:120, 131`:
     ```ts
     export const SECTION_TINT_MAP: Record<string, TintId> = {
       'hero-scene-container': 'hub',
       ...
     };
     export const MONITORED_SECTION_IDS: readonly string[] = [
       'hero-scene-container',
       ...
     ];
     ```
   - **Actual DOM Element**: In `src/components/home/archive-hero.tsx:26`, the hero element is `<section id="hero-scene" ...>`. The old container `hero-scene-container` was part of the superseded `HeroScene.tsx` and was removed in commit `1c402f5`.
   - **Runtime Consequence**: In `src/components/background/site-wall.tsx:342-359`, `site-wall` checks:
     ```ts
     const allMounted = MONITORED_SECTION_IDS.every(
       (id) => document.getElementById(id) !== null
     );
     if (!allMounted) {
       mutObserver = new MutationObserver(() => {
         const nowAllMounted = MONITORED_SECTION_IDS.every(
           (id) => document.getElementById(id) !== null
         );
         if (nowAllMounted) {
           mutObserver?.disconnect();
           mutObserver = null;
           debouncedRecompute();
         }
       });
       const container = document.getElementById('main-content') || document.body;
       mutObserver.observe(container, { childList: true, subtree: true });
     }
     ```
     Because `hero-scene-container` is **never in the DOM**, `nowAllMounted` evaluates to `false` on every DOM mutation. As a result, the `MutationObserver` on `document.body` **never disconnects**, executing an array check on every childList DOM change for the lifetime of the page.

2. **Side Quest Card ID Naming Inconsistency (`#sidequest-${project.id}`)**
   - In `src/components/side-quests/side-quest-card.tsx:121`, each side quest card renders `id={`sidequest-${project.id}`}` (e.g., `#sidequest-backtrace`, `#sidequest-echo`, `#sidequest-lumina-clinical`, `#sidequest-reelclaim`).
   - If any link or script attempts to jump using `#${project.id}` (as used by `FlagshipCard` in `scenario-select.tsx:111` and `skill-system-window.tsx:202`), it fails to anchor to the sidequest cards because of the missing `sidequest-` prefix.

3. **Defined but Unmapped Wall Tint: `backtrace`**
   - `src/content/walls.ts:100-106` defines a dedicated tint for `backtrace` (`#0F1B3D` + `#D4B15F`), and includes it in `ACTIVE_WALL_TINTS` (`walls.ts:144`).
   - However, `backtrace` is missing from `SECTION_TINT_MAP` and `MONITORED_SECTION_IDS`. Since Backtrace currently lives inside the `#side-quests` section (`tint: 'hub'`), the `backtrace` tint is currently unreachable in the wall controller.

---

### 1.3 Sections That Exist But Are Never Referenced

1. **`#hero-scene`**: Rendered at top of DOM (`archive-hero.tsx:26`). The persistent header logo (`layout.tsx:148`) links to `/` rather than `/#hero-scene`. No button or anchor targets `#hero-scene`.
2. **`#side-quests`**: Rendered by `DeferredWorlds` (`side-quests-section.tsx:27`). No link, header button, CTA, or footer item on `/` or `/skip` points to `#side-quests`.

---

## 2. Routes & Internal Links

### 2.1 Route Folder Inventory under `src/app/`

| Route Path | Files Present in Folder | `page.tsx` Present? | Production Status | Development Status |
| :--- | :--- | :---: | :---: | :---: |
| `/` | `page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`, `robots.ts`, `sitemap.ts`, `icon.svg`, `apple-icon.tsx`, `opengraph-image.tsx` | **Yes** | 200 OK | 200 OK |
| `/api/contact` | `api/contact/route.ts` | N/A (`route.ts`) | 200/400 (POST) | 200/400 (POST) |
| `/skip` | `skip/page.tsx`, `skip/.gitkeep` | **Yes** | 200 OK | 200 OK |
| `/dev/mode` | `dev/mode/page.tsx`, `dev/mode/dev-mode-client.tsx` | **Yes** | **404 Not Found** (`notFound()`) | 200 OK |
| `/style-test` | `style-test/page.tsx` | **Yes** | **404 Not Found** (`notFound()`) | 200 OK |
| `/wanted` | `wanted/.gitkeep` | **NO** | **404 Not Found** (Route missing) | **404 Not Found** (Route missing) |

---

### 2.2 Complete Internal `href` Audit

All internal links in the codebase were extracted and checked against physical routes:

| Source File : Line | `href` Target | Link Component / Tag | Route Exists? | Production Result |
| :--- | :--- | :--- | :---: | :--- |
| `src/app/layout.tsx:148` | `/` | `<Link prefetch={false}>` | Yes | 200 OK (Homepage) |
| `src/app/layout.tsx:173` | `/#contact` | `<Link prefetch={false}>` | Yes | 200 OK (Scrolls to `#contact`) |
| `src/app/layout.tsx:182` | `/skip` | `<Link prefetch={false}>` | Yes | 200 OK (Accessible plain version) |
| `src/app/page.tsx:35` | `/skip` | `<Link>` | Yes | 200 OK (Accessible plain version) |
| `src/components/finale/ContactForm.tsx:393` | `/skip` | `<Link>` | Yes | 200 OK (Accessible plain version) |
| `src/app/skip/page.tsx:46` | `/` | `<Link>` | Yes | 200 OK (Return to rich version) |
| `src/app/skip/page.tsx:462` | `/` | `<Link>` | Yes | 200 OK (Return to rich version) |
| `src/app/error.tsx:47` | `/` | `<Link>` | Yes | 200 OK (Return home) |
| `src/app/not-found.tsx:45` | `/` | `<Link>` | Yes | 200 OK (Return home) |
| `src/app/page.tsx:45` | `/style-test` | `<Link>` (dev guard) | Conditional | Dev: 200; Prod: hidden by `NODE_ENV` guard |
| `src/app/page.tsx:52` | `/dev/mode` | `<Link>` (dev guard) | Conditional | Dev: 200; Prod: hidden by `NODE_ENV` guard |
| `src/app/dev/mode/dev-mode-client.tsx:41` | `/` | `<Link>` | Yes | 200 OK |
| `src/app/dev/mode/dev-mode-client.tsx:295, 301, 307` | `/dev/mode*` | `<Link>` | Conditional | Dev: 200; Prod: 404 |
| `src/app/layout.tsx:164` | `/wanted` | `<Link prefetch={false}>` | **NO** | **404 Not Found on Click** |
| `src/components/biyoo/corner-bounty-button.tsx:75` | `/wanted` | `<Link>` | **NO** | **PREFETCH 404 & 404 ON CLICK** |

---

### 2.3 404 and Prefetch 404 Diagnosis

1. **`src/components/biyoo/corner-bounty-button.tsx:75`**:
   - Link syntax: `<Link href="/wanted" aria-label="Bounty board" ...>`
   - **Bug**: Omits `prefetch={false}`. In Next.js App Router, `<Link>` components in the viewport default to `prefetch={true}` in production.
   - **Consequence**: The browser automatically issues a background request for `/_next/data/.../wanted.json` or `/wanted?_rsc=...` upon initial page load/idle. Because `src/app/wanted/` has no `page.tsx`, this generates a background **HTTP 404 GET request** on every visit to the home page.
2. **`src/app/layout.tsx:164`**:
   - Link syntax: `<Link href="/wanted" prefetch={false} ...>Bounty board</Link>`
   - **Consequence**: Does not prefetch in background, but any user clicking "Bounty board" in the desktop header is routed directly to Next.js's 404 page.

---

## 3. Fixed / Sticky Elements & Viewport Overlap Geometry

### 3.1 Inventory of Fixed and Sticky Elements

The following elements declare `position: fixed` or `position: sticky`:

| Element | Component File : Line | Position Type | Viewport Corner / Bounds | CSS Offsets | z-index | Safe-Area Handling |
| :--- | :--- | :---: | :--- | :--- | :---: | :--- |
| **Persistent Header** | `src/app/layout.tsx:145` | `sticky` | Top edge | `top-0`, `w-full` | `z-50` | Horizontal padding handles side bounds; no `env()` on top |
| **Skip Navigation Link** | `src/app/layout.tsx:128` | `focus:fixed` | Top-left corner | `focus:top-3 focus:left-3` | `z-[100]` | None (hidden until keyboard Tab focus) |
| **Living Wall Base Layer** | `src/components/background/site-wall.tsx:479` | `fixed` | Fullscreen | `inset-0`, `h-[100dvh] w-full` | `z-0` | Covers entire viewport, `pointer-events-none` |
| **Living Wall Dual Lantern** | `src/components/background/site-wall.tsx:547` | `fixed` | Pointer-tracked | Follows pointer via GSAP quickTo | `z-0` | Desktop full mode only, `pointer-events-none` |
| **Living Wall Tint Layers** | `src/components/background/site-wall.tsx:606` | `fixed` | Fullscreen | `inset-0` inside compositor | `z-1` | Covers entire viewport, `pointer-events-none` |
| **Living Wall Particles** | `src/components/background/wall-particles.tsx:297` | `fixed` | Fullscreen | `inset-0`, canvas 2D | `z-2` | Covers entire viewport, `pointer-events-none` |
| **Living Wall Scrim / Vignette** | `src/components/background/site-wall.tsx:644` | `fixed` | Fullscreen | `inset-0` inside compositor | `z-3` | Covers entire viewport, `pointer-events-none` |
| **Corner Bounty Button** | `src/components/biyoo/corner-bounty-button.tsx:65-71` | `fixed` | Bottom-right corner | `bottom: calc(1rem + env(safe-area-inset-bottom, 0px))`, `right: calc(1rem + env(safe-area-inset-right, 0px))` | `z-40` | Explicit `env(safe-area-inset-bottom)` & `env(safe-area-inset-right)` |
| **Sound Permission Prompt** | `src/components/sound/sound-permission-prompt.tsx:45-48` | `fixed` | Bottom-right (desktop) / Bottom-wide (mobile) | `bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px))`, `right-4 sm:right-6`, `w-[calc(100vw-2rem)] sm:w-auto` | `z-50` | Explicit `env(safe-area-inset-bottom)` |
| **Constellation Overlay** | `src/lib/reader/constellation-overlay.tsx:36` | `fixed` | Top-right corner | `top-24 right-4 sm:top-28 sm:right-8` | `z-50` | Clears header; no explicit `env()` |
| **Skill System Window** | `src/components/readers-record/skill-system-window.tsx:105` | `fixed` | Fullscreen modal | `inset-0` | `z-50` | Fullscreen dialog backdrop when triggered |

---

### 3.2 Bounding Box Calculations for Fixed Bottom-Left Biyoo

The companion Biyoo is defined with:
- Position: `fixed` at bottom-left
- CSS coordinates:
  - `left: calc(16px + env(safe-area-inset-left, 0px))`
  - `bottom: calc(16px + env(safe-area-inset-bottom, 0px))`
- Art aspect ratio: `1000 / 891` (width:height = 1 : 0.891)
- Padding & touch bounds: `p-1` (4px), interactive button `min-w-[44px] min-h-[44px]`
- Speech bubble (`BiyooSpeech`): `absolute -top-14` (56px above Biyoo), height ~30px

#### Biyoo Dimensions by Viewport:
- **Desktop (1440 x 900)**:
  - `effectiveSize = Math.max(72, Math.min(110, 108))` = 108px width.
  - Art height = `Math.round(108 * 0.891)` = 96px.
  - Box dimensions: Width = 108px, Height = 104px (including 4px padding).
  - Box bounds (assuming `safe-area = 0`):
    - Horizontal: `x1 = 16px`, `x2 = 124px`
    - Vertical: `y1 = 900 - 16 - 104 = 780px`, `y2 = 884px` (`bottom: 16px` to `120px`)
  - Speech bubble bounds:
    - Offset: `sm:left-1/2 sm:-translate-x-1/2`, `-top-14` (-56px)
    - Bubble width: max-w-[200px] (~140px centered at x = 70px) -> `x1 = 0px`, `x2 = 140px`
    - Vertical: `y1 = 780 - 56 = 724px`, `y2 = 754px`
- **Mobile (390 x 844)**:
  - Container constraint: `max-w-[clamp(72px, 10vw, 110px)]`. At 390px, `10vw = 39px`, so clamp evaluates to 72px width.
  - Responsive image sizes: `sizes="(max-width: 639px) 72px, 108px"`. Width = 72px.
  - Art height = `Math.round(72 * 0.891)` = 64px.
  - Box dimensions: Width = 72px, Height = 72px (with touch padding).
  - Box bounds (assuming `safe-area = 0`):
    - Horizontal: `x1 = 16px`, `x2 = 88px`
    - Vertical: `y1 = 844 - 16 - 72 = 756px`, `y2 = 828px` (`bottom: 16px` to `88px`)
  - Speech bubble bounds:
    - Offset: `left-0`, `-top-14` (-56px)
    - Bubble width: `min-w-[70px] max-w-[130px]` (~110px) -> `x1 = 16px`, `x2 = 126px`
    - Vertical: `y1 = 756 - 56 = 700px`, `y2 = 728px` (`bottom: 116px` to `144px`)

---

### 3.3 Overlap Analysis at 1440 x 900 (Desktop)

1. **Header (`sticky top-0`, height ~56px)**:
   - Header box: `[x: 0 to 1440px, y: 0 to 56px]`
   - Biyoo box: `[x: 16 to 124px, y: 724 to 884px]` (including speech bubble)
   - Vertical clearance: `724 - 56` = **668px gap**.
   - **Verdict: NO OVERLAP**.
2. **Corner Bounty Button (`fixed bottom-4 right-4`)**:
   - Button dimensions: Head 40px + padding 16px + gap 8px + label 72px + pr 8px = 144px width, 56px height.
   - Button box: `[x: 1280 to 1424px, y: 828 to 884px]`
   - Biyoo box: `[x: 16 to 124px (bubble to 140px), y: 724 to 884px]`
   - Horizontal clearance: `1280 - 140` = **1,140px gap**.
   - **Verdict: NO OVERLAP**.
3. **Sound Permission Prompt (`fixed bottom: 88px, right: 24px`)**:
   - Prompt dimensions: Width ~320px, Height ~110px.
   - Prompt box: `[x: 1096 to 1416px, y: 702 to 812px]`
   - Horizontal clearance: `1096 - 140` = **956px gap**.
   - **Verdict: NO OVERLAP**.
4. **Constellation Overlay (`fixed top: 112px, right: 32px`)**:
   - Overlay box: `[x: 1128 to 1408px, y: 112 to 182px]`
   - Opposite corner (top-right vs bottom-left).
   - **Verdict: NO OVERLAP**.

---

### 3.4 Overlap Analysis at 390 x 844 (Mobile)

1. **Header (`sticky top-0`, height ~50px)**:
   - Header box: `[x: 0 to 390px, y: 0 to 50px]`
   - Biyoo box: `[x: 16 to 88px, y: 700 to 828px]`
   - Vertical clearance: `700 - 50` = **650px gap**.
   - **Verdict: NO OVERLAP**.
2. **Corner Bounty Button (`fixed bottom-4 right-4`)**:
   - Button dimensions on mobile: Head 36px + padding 12px + gap 8px + text 65px + pr 8px = 129px width, 48px height.
   - Button box: `[x: 245 to 374px, y: 780 to 828px]`
   - Biyoo character box: `[x: 16 to 88px, y: 756 to 828px]`
   - Biyoo speech bubble box: `[x: 16 to 126px, y: 700 to 728px]`
   - Horizontal clearance:
     - Between character (x = 88px) and button (x = 245px): `245 - 88` = **157px gap**.
     - Between speech bubble (x = 126px) and button (x = 245px): `245 - 126` = **119px gap**.
   - **Verdict: NO OVERLAP** with Corner Bounty Button.
3. **CRITICAL COLLISION: Sound Permission Prompt (`fixed bottom: 88px, right-4, w-[calc(100vw-2rem)]`)**:
   - **CSS Definition** (`src/components/sound/sound-permission-prompt.tsx:45-48`):
     ```tsx
     className={`fixed z-50 bottom-20 right-4 sm:right-6 max-w-sm w-[calc(100vw-2rem)] sm:w-auto ...`}
     style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))" }}
     ```
   - **Width computation at 390px**:
     `w-[calc(100vw-2rem)]` = `390px - 32px` = **358px**.
     With `right: 16px`, its left edge is: `390 - 16 - 358` = **16px**!
     The prompt spans **from x = 16px to x = 374px across the entire screen**!
   - **Vertical bounds computation**:
     `bottom: 5.5rem` = 88px.
     Height of prompt (with avatar, prompt copy, and 2 action buttons): **~120px**.
     Vertical span: `bottom: 88px to 208px` -> **`y = 636px to 756px`**.
   - **Biyoo Bounds**:
     - Biyoo character: `bottom: 16px to 88px` -> `y = 756px to 828px`.
     - Biyoo speech bubble: `bottom: 116px to 144px` -> `y = 700px to 728px`, `x = 16px to 126px`.
   - **Collision Details**:
     - The Sound Permission Prompt occupies `[x: 16 to 374px, y: 636 to 756px]`.
     - Biyoo's speech bubble occupies `[x: 16 to 126px, y: 700 to 728px]`.
     - **Exact intersection**: The speech bubble is completely inside the Sound Prompt's bounding box (`dx: [16, 126]`, `dy: [700, 728]`).
     - **Stacking order**: Sound Prompt is `z-50`; Biyoo container is `z-40`.
     - **Result**: Whenever the Sound Permission Prompt is displayed on mobile, it **directly occludes Biyoo's speech bubble** and abuts the top of Biyoo's head/horns at `bottom: 88px`.
4. **Constellation Overlay (`fixed top: 96px, right: 16px`)**:
   - Overlay box: `[x: 114 to 374px, y: 96 to 166px]`
   - Biyoo box: `[x: 16 to 88px, y: 700 to 828px]`
   - Vertical clearance: `700 - 166` = **534px gap**.
   - **Verdict: NO OVERLAP**.

---

## 4. Dokja Leftovers Audit

Every occurrence of `"dokja"`, `"wanted"`, `"bounty"`, and `"true-ending"` across `src/` (excluding `src/components/dokja/`) was inspected:

### 4.1 Dokja Matches

| File : Line | Exact Text / Code Matched | Role / Context | Puts Dokja Content on Site? |
| :--- | :--- | :--- | :---: |
| `src/app/style-test/page.tsx:80` | `sample: "THE INCARNATION KIM DOKJA"` | Font test specimen string in style test | **No** (Dev-only route; 404 in prod; not rendered on `/`) |
| `src/app/style-test/page.tsx:293` | `footer="[Equipped: Incarnation Kim Dokja]"` | Specimen label on test SystemWindow | **No** (Dev-only route; 404 in prod; not rendered on `/`) |
| `src/components/finale/FinaleSection.tsx:17` | `* - Dokja removed from the site and build entirely` | Docstring comment documenting removal | **No** (Code comment only) |
| `src/components/finale/camera-reflection.tsx:27` | `* 3. On success: faint mirrored reflection, opacity ~0.2, grayscale, behind Dokja's gaze layer.` | Docstring comment in unmounted file | **No** (Code comment in unmounted file) |
| `src/components/finale/camera-reflection.tsx:188` | `* Faint mirrored reflection inside the dark-glass area behind Dokja's gaze layer.` | Component comment in unmounted file | **No** (Code comment in unmounted file) |
| `src/components/finale/dokja-finale-figure.tsx:2, 4, 12, 13, 23, 24, 29, 42` | `import { DokjaFigure } from "@/components/dokja/dokja-figure"; ... <DokjaFigure ... />` | Dead component wrapping Dokja figure | **Currently No, but POTENTIAL RISK**: File exists on disk. If imported, it **WOULD** restore Dokja art to the site. |
| `src/content/art-alt.ts:12` | `category: "dokja" \| "biyoo" \| "wall" \| "wanted" \| "meta";` | TypeScript type union in metadata dictionary | **No** (Type definition only) |
| `src/content/art-alt.ts:21-161` | `"dokja_body_base"`, `"dokja_coat"`, `"dokja_horns"`, `"dokja_wings_*"`, `"dokja_phone"`, etc. | Alt text entries for 16 Dokja layered sprites | **No** (Inert metadata dictionary; unused on `/`) |

---

### 4.2 Wanted, Bounty, and True-Ending Matches

| File : Line | Exact Text / Code Matched | Role / Context | Puts Dokja Content on Site? |
| :--- | :--- | :--- | :---: |
| `src/app/robots.ts:11` | `disallow: ["/wanted", "/true-ending", ...]` | Search engine crawler disallow directive | **No** (Crawler directive) |
| `src/components/background/site-wall.tsx:98, 101` | `pathname === '/wanted'` | Route-based check to disable wall compositor | **No** (Route exclusion check) |
| `src/app/layout.tsx:8` | `import { CornerBountyButton } ...` | Import of corner bounty button | **No** (Button component) |
| `src/app/layout.tsx:162, 168` | `{/* Bounty board link */} ... Bounty board` | Header navigation link to `/wanted` | **No**, but clicking it triggers a 404 page |
| `src/app/layout.tsx:164` | `href="/wanted"` | Anchor link to `/wanted` | **No** (Links to non-existent route) |
| `src/app/layout.tsx:195, 196` | `<CornerBountyButton />` | Persistent button JSX | **No** (UI component) |
| `src/components/biyoo/corner-bounty-button.tsx:8, 13, 14, 18-22, 28, 35-36, 58, 64, 75-76, 78, 81, 122, 169, 179` | `CornerBountyButton`, `href="/wanted"`, `"Looking for the bounty board?"`, tiny sign | Floating corner button and mini Biyoo holding "WANTED" sign | **No**, but link prefetch triggers background 404 |
| `src/components/biyoo/index.ts:13` | `export * from "./corner-bounty-button";` | Module re-export | **No** |
| `src/content/art-alt.ts:321, 323-329` | `"wanted_poster_frame"` alt metadata | Alt metadata for parchment bounty frame | **No** (Inert metadata) |
| `src/styles/globals.css:189, 190, 208, 209` | `@keyframes bounty-wiggle`, `.animate-bounty-wiggle` | CSS keyframe animation for button wiggle | **No** (CSS animation rule) |

---

## 5. Camera-Reflection (Commit 1c402f5)

### 5.1 Exact Lines Removed from `src/components/finale/index.ts`

Inspecting git history via `git show 1c402f5 -- src/components/finale/index.ts`:

```diff
diff --git a/src/components/finale/index.ts b/src/components/finale/index.ts
index 64a99e2..350d7c2 100644
--- a/src/components/finale/index.ts
+++ b/src/components/finale/index.ts
@@ -1,4 +1,2 @@
 export * from "./FinaleSection";
 export * from "./ContactForm";
-export * from "./dokja-finale-figure";
-export * from "./camera-reflection";
```

**Removed Lines**:
- Line 3: `-export * from "./dokja-finale-figure";`
- Line 4: `-export * from "./camera-reflection";`

---

### 5.2 Accompanying Removals from `src/components/finale/FinaleSection.tsx`

In the same commit (`1c402f5`), the following lines were removed from `FinaleSection.tsx`:
1. **Component and Hook Imports**:
   ```diff
   -import { DokjaFinaleFigure } from "./dokja-finale-figure";
   -import {
   -  useCameraReflection,
   -  CameraReflectionOverlay,
   -  CameraReflectionControls,
   -} from "./camera-reflection";
   ```
2. **Hook Execution**:
   ```diff
   -  const {
   -    isActive: isCameraActive,
   -    isRequesting: isCameraRequesting,
   -    biyooLine: cameraBiyooLine,
   -    videoRefCallback,
   -    startCamera,
   -    stopCamera,
   -  } = useCameraReflection({ sectionRef });
   ```
3. **GSAP Animation Logic for Dokja & Camera**:
   - Removed animation sequences for `.finale-phone`, `.finale-phone-screen`, `.finale-phone-glow`, and `.finale-horns-red-rim`.
4. **JSX Elements**:
   ```diff
   -          {/* FAINT CAMERA REFLECTION (Behind Dokja's gaze layer) */}
   -          <CameraReflectionOverlay
   -            videoRefCallback={videoRefCallback}
   -            isActive={isCameraActive}
   -            isReduced={reducedMotion}
   -          />
   ```
   ```diff
   -              {/* Optional Camera Reflection Trigger */}
   -              <CameraReflectionControls
   -                isActive={isCameraActive}
   -                isRequesting={isCameraRequesting}
   -                biyooLine={cameraBiyooLine}
   -                onStart={startCamera}
   -                onStop={stopCamera}
   -              />
   ```

---

### 5.3 Did H-1's Prompt Ask for the Removal of `camera-reflection`?

**Verdict: NO.**

1. **Prompt Intent**:
   - Task `hero-H1` specified:
     > "Replace HeroScene with ArchiveHero, remove Dokja from the build entirely, and verify the archive living wall."
   - The prompt did **not** request the removal of `camera-reflection` or camera reflection controls.
2. **Why It Was Removed**:
   - In the original layout of `FinaleSection.tsx`, the camera reflection was not a standalone feature; it was visually and structurally mounted inside the Dokja figure stage (`<div className="lg:col-span-5 ...">`), with `CameraReflectionOverlay` placed directly behind Dokja's gaze layer, and `CameraReflectionControls` positioned under Dokja's feet.
   - When Dokja was removed to comply with the directive *"Dokja removed from the site and build entirely"*, the entire left column containing Dokja was deleted, and the contact form was centered. As a side effect of deleting Dokja's column, the author removed the camera reflection hook, overlay, and controls, un-exporting it from `index.ts`.
   - The file `src/components/finale/camera-reflection.tsx` remains in the codebase as dead code.

---

## 6. Audit Summary & Actionable Recommendations

1. **Fix `walls.ts` Stale Section ID**:
   - Change `'hero-scene-container'` to `'hero-scene'` in `src/content/walls.ts:120, 131`. This will allow `MutationObserver` in `site-wall.tsx` to detect all sections mounted and disconnect cleanly.
2. **Prevent `/wanted` 404 and Prefetch Spikes**:
   - Add `prefetch={false}` to `<Link href="/wanted">` in `src/components/biyoo/corner-bounty-button.tsx:75`.
   - Implement `src/app/wanted/page.tsx` or conditionally disable the button until the route is ready.
3. **Resolve Mobile Sound Permission Collision**:
   - Adjust `SoundPermissionPrompt` on mobile (`< 640px`) so it does not span `w-[calc(100vw-2rem)]` directly over the bottom-left Biyoo container and speech balloon, or anchor it above Biyoo's maximum top coordinate (`y < 680px`).
4. **Connect Unreferenced Sections**:
   - Add navigation jump anchors for `#side-quests`.
   - In `side-quest-card.tsx`, align card IDs or provide anchor aliasing so jumps like `#backtrace` find `#sidequest-backtrace`.

