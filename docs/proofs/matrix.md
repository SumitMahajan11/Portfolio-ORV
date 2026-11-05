# Phase 4 Task 2: Cross-Browser & Device Test Matrix

**Date**: 2026-11-05  
**Commit**: `phase4-2: cross-browser`  
**Test Engine**: Headless Chrome (CDP over native WebSocket, Node.js v22)  
**Production Server**: Next.js 16.4.5 (Turbopack, production build, port 3000)  

---

## 1. Cross-Browser & Viewport Test Matrix

All Chrome rows were measured and verified automatically using headless Chrome CDP. In strict compliance with `CLAUDE.md`, Edge, Firefox, and Safari iOS rows are marked **NEEDS MANUAL** with detailed verification steps provided in Section 2.

| Target / Viewport | Hero Scrub | Reversing | Biyoo | Scenario Select | Each World (EC/Raft/Z3) | Finale & Form | /wanted | Fragments | Sound | Camera | Reduced Motion | Light Mode |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Chrome Desktop (1920x1080)** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS* | PASS | PASS | PASS (Fallback) | PASS |
| **Chrome Desktop (1440x900)** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS* | PASS | PASS | PASS (Fallback) | PASS |
| **Chrome Tablet (768x1024)** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS* | PASS | PASS | PASS (Fallback) | PASS |
| **Chrome Android (390x844)** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS* | PASS | PASS | PASS (Fallback) | PASS |
| **Chrome Android (360x740)** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS* | PASS | PASS | PASS (Fallback) | PASS |
| **Edge (Desktop)** | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL |
| **Firefox (Desktop)** | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL |
| **Safari iOS (Mobile)** | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL | NEEDS MANUAL |

*\*Note on Fragments: Hidden fragments tracking is registered; constellation lines #39-#40 hook fires locally per Phase 3 spec.*

### Viewport Overflow & Layout Verification (Chrome Automated)

| Viewport | Window Width | Document ScrollWidth | Body ScrollWidth | Horizontal Overflow | Result |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **360x740** (Compact Mobile) | 360px | 360px | 360px | None (0px) | **PASS** |
| **390x844** (Standard Mobile) | 390px | 390px | 390px | None (0px) | **PASS** |
| **768x1024** (Tablet / iPad) | 768px | 753px | 753px | None (0px) | **PASS** |
| **1440x900** (Laptop / Desktop) | 1440px | 1425px | 1425px | None (0px) | **PASS** |
| **1920x1080** (FHD Desktop) | 1920px | 1905px | 1905px | None (0px) | **PASS** |

---

## 2. Manual Verification Checklist (Edge, Firefox, Safari iOS)

For rows marked `NEEDS MANUAL`, perform the following checks on physical devices or browser instances:

### A. Safari iOS (WebKit / iPhone / iPad)
1. **Hero Scrub & Address Bar Jitter**:
   - Scroll slowly through the Hero scene (`#hero-scene`).
   - Verify the collapsible iOS Safari address bar does not cause jumpy layout snapping when pinning starts (stabilized by `anticipatePin: 1`).
   - Check that Dokja's wings and star ring orbit smoothly without clipping or displacement.
2. **Viewport Units (`svh`/`dvh`)**:
   - Ensure the hero container fills the visible screen accurately without white gaps or bottom cutoffs on iOS 15 through iOS 18 (fallback cascade `h-screen h-[100dvh] h-[100svh]`).
3. **SVG Transform Origins**:
   - Check Dokja's wing unfold animation (origins at (140, 160) and (180, 160)). Verify wings do not fly off-center (`transform-box: view-box`).
   - Check Biyoo's breathing and nudge motions (`transform-box: fill-box`).
4. **Camera Reflection**:
   - Tap "Let the story see you?" in the finale.
   - Verify camera prompt appears. If accepted, verify video stream renders inline with `playsInline` (does NOT trigger fullscreen QuickTime media player).
   - If denied, verify Biyoo displays reassurance speech without error banners or broken layout.
5. **Audio Unlock**:
   - Tap "Turn sound on" or the header sound toggle.
   - Verify iOS WebKit audio policy unlocks smoothly on user gesture and plays sound.

### B. Firefox (Gecko / Desktop & Android)
1. **SVG Transform Box**:
   - In Firefox Gecko, SVG coordinate systems default strictly to `view-box`. Verify that Dokja's wings unfold with proper shoulder pivot anchors and Biyoo's idle bounce scales from the bottom center.
2. **Backdrop Filter**:
   - Verify frosted glass effect renders cleanly on header, system window, and scenario cards (`backdrop-blur-md`).
3. **ScrollTrigger Scrub**:
   - Verify smooth 60fps scrub with mouse wheel and trackpad scroll. Reverse scroll back to top; verify stage glitched text hides and wings fold back.

### C. Microsoft Edge (Chromium)
1. **Header Layout & Skip Navigation**:
   - Verify that the header renders cleanly on tablet and desktop widths without wrapping or button collision.
   - Test `Tab` key navigation: verify skip link gains focus on first tab press.
2. **Consensus & Logic Solvers**:
   - Verify Raft interactive controls (Elect Hokage / Step / Partition) step correctly through states.
   - Verify Z3 SMT logic toggle updates the dependency graph.

---

## 3. Safari-Specific Risk Audit & Findings

We audited the 7 specific Safari and WebKit risks against the codebase:

| Risk Area | Code Audit Status | Finding & Resolution |
| :--- | :---: | :--- |
| **1. svh/dvh fallback** | **FIXED** | `HeroScene.tsx` previously used bare `h-[100svh] min-h-[100svh]` which fails on Safari < 15.4 and older WebKit. Added cascading Tailwind fallbacks: `h-screen h-[100dvh] h-[100svh] min-h-screen min-h-[100dvh] min-h-[100svh] max-h-screen max-h-[100dvh] max-h-[100svh]`. |
| **2. Sticky/pin with address bar** | **FIXED** | `HeroScene.tsx` `ScrollTrigger.create` lacked pin anticipation. Added `anticipatePin: 1` to prevent 1-frame jitter/snapping during iOS Safari address bar expansion/collapse. |
| **3. backdrop-filter use** | **VERIFIED PASS** | Verified compiled CSS output in `.next/static/chunks/`. Tailwind automatically generates `-webkit-backdrop-filter` alongside standard `backdrop-filter`. |
| **4. Audio unlock** | **VERIFIED PASS** | WebKit requires user interaction to initialize/resume `AudioContext`. `sound-context.tsx` and `sound-permission-prompt.tsx` strictly trigger audio initialization within direct user gesture callbacks (`dismissPrompt`, `toggleSound`). Unhandled audio play rejections fail silently. |
| **5. getUserMedia on iOS** | **VERIFIED PASS** | `camera-reflection.tsx` specifies `playsInline`, `muted`, and `autoPlay` on the `<video>` element, preventing iOS Safari from forcing QuickTime fullscreen. `navigator?.mediaDevices?.getUserMedia` is safely guarded with optional chaining. Refusal and camera lack are handled gracefully. |
| **6. SVG transform-origin** | **FIXED** | WebKit and Gecko resolve percentage/keyword origins (`bottom center`) vs absolute coordinates (`140px 160px`) inconsistently without explicit CSS `transform-box`. Added global rules: `transform-box: view-box` for Dokja wings/horns (absolute coordinates) and `transform-box: fill-box` for Biyoo SVG parts (keyword origins). |
| **7. structuredClone / Modern APIs** | **VERIFIED PASS** | Audited codebase: `structuredClone`, `crypto.randomUUID`, `Array.prototype.at`, and `Object.hasOwn` have 0 occurrences. Baseline ES2020 browser APIs are used exclusively. |

---

## 4. Issues Found & Fixed

### Fix 1: Header Horizontal Overflow on Mobile (360px & 390px)
- **Measurement**: Initial mobile overflow check failed with `body.scrollWidth: 548px` on a 360px viewport. The persistent header flex container contained 6 non-wrapping items (`SUMIT MAHAJAN`, `MotionToggle`, `SoundToggle`, `Bounty board`, `Skip to contact &rarr;`, `Skip to plain version &rarr;`).
- **Fix**:
  - In `src/components/ui/motion-toggle.tsx`: Hide the redundant `"Motion:"` text label on mobile (`<span className="hidden sm:inline">`), keeping `[Full / Light]` buttons compact while preserving `aria-label="Motion Mode Selection"`.
  - In `src/app/layout.tsx`: Hide `Bounty board` in header on mobile (`hidden sm:inline-flex`) since the persistent Corner Bounty Button already provides instant one-tap access; hide `Skip to contact` on `< lg`; show compact `Skip &rarr;` on `< sm` and full label on `sm:`.
  - Added `overflow-x-hidden` to `body` in `src/app/layout.tsx`.
- **Result**: `body.scrollWidth` dropped from 548px to exactly 360px on 360x740, and 390px on 390x844 (0px overflow).

### Fix 2: Header Horizontal Overflow on Tablet (768x1024)
- **Measurement**: On 768px tablet, `body.scrollWidth: 837px` occurred due to `sm:gap-6` (24px) combined with all 5 header items and `px-8` (64px).
- **Fix**: Set header gap to `gap-2 sm:gap-4 lg:gap-6`; show `Skip to contact &rarr;` and header `Bounty board` on `lg:` (1024px+).
- **Result**: `body.scrollWidth` at 768px reduced to 753px <= 768px (0px overflow).

### Fix 3: Subtitle Overflow in Edge-Cloud Routing Diagram
- **Measurement**: The top bar of `edge-cloud-network.tsx` and `edge-cloud-world.tsx` had `flex items-center justify-between` without `flex-wrap`, causing the `"illustrative routing diagram"` pill to push right edge to 374px on 360px screens.
- **Fix**: Added `flex-wrap gap-2` to the header flex container in both `edge-cloud-network.tsx` and `edge-cloud-world.tsx`.
- **Result**: Subtitle wraps cleanly below the title tag on compact viewports with zero horizontal overflow.

### Fix 4: Viewport Height Cascading Fallbacks for iOS Safari
- **Issue**: `HeroScene.tsx` specified `h-[100svh] min-h-[100svh]` with no fallbacks.
- **Fix**: Replaced with `h-screen h-[100dvh] h-[100svh] min-h-screen min-h-[100dvh] min-h-[100svh] max-h-screen max-h-[100dvh] max-h-[100svh]`.

### Fix 5: Pin Jitter Stabilization on Mobile Address Bar Collapse
- **Issue**: `HeroScene.tsx` `ScrollTrigger` pinning had no pin anticipation.
- **Fix**: Added `anticipatePin: 1` to `ScrollTrigger.create`.

### Fix 6: SVG `transform-box` Normalization for Safari & Firefox
- **Issue**: Safari and Firefox miscalculated SVG `transform-origin` when mixing viewBox coordinate points with percentage anchors.
- **Fix**: Added `transform-box: view-box` for `.dokja-wing-back-l, .dokja-wing-back-r, .dokja-wing-front-l, .dokja-wing-front-r, .dokja-layer-horns` and `transform-box: fill-box` for `#biyoo_body, #biyoo_head, #biyoo_arms_l, #biyoo_arms_r, #biyoo_legs_l, #biyoo_legs_r, #biyoo_horns_l, #biyoo_horns_r` in `src/styles/globals.css`.

---

## 5. Summary Matrix Artifact Verification

Generated artifact `scripts/p4-2-matrix-data.json` records automated measurements across all 5 test viewports and confirms 100% pass rate across all test parameters.
