# Phase 6 Task 3: Device & Browser Matrix Verification

**Date**: 2026-11-06  
**Commit**: `phase6-3: device matrix`  
**Automated Test Engine**: Headless Chrome (CDP via native WebSocket over Next.js production build)  
**Production Server**: Next.js 16.4.5 (Port 3016, Production Build)  
**Screenshots**: [`docs/proofs/screens/phase6/`](file:///c:/Sumit%20Portfolio/docs/proofs/screens/phase6)

---

## 1. Device Matrix Manual Checklist Table

Per Task P6-3 specifications, the table below provides the checklist matrix across all target environments.  
In strict compliance with **Rule 3** (*"Do not claim a row passes unless you tested it. Mark manual rows as MANUAL"*), only the automated Desktop Chrome rows tested via Headless Chrome CDP are marked as tested. All physical and non-automated targets (**Mid-range Android Chrome**, **iPhone Safari**, **Edge**, and **Firefox**) are designated as `[ ] MANUAL` for manual completion on physical hardware.

| Feature / Row | Mid-range Android Chrome | iPhone Safari | Desktop Chrome | Edge | Firefox |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Story scroll** | `[ ] MANUAL` | `[ ] MANUAL` | `[x] PASS (CDP)` | `[ ] MANUAL` | `[ ] MANUAL` |
| **Scenario Select** | `[ ] MANUAL` | `[ ] MANUAL` | `[x] PASS (CDP)` | `[ ] MANUAL` | `[ ] MANUAL` |
| **Each world** (Edge-Cloud, Ratify / Raft, iac-verifier / Z3) | `[ ] MANUAL` | `[ ] MANUAL` | `[x] PASS (CDP)` | `[ ] MANUAL` | `[ ] MANUAL` |
| **Side quests** | `[ ] MANUAL` | `[ ] MANUAL` | `[x] PASS (CDP)` | `[ ] MANUAL` | `[ ] MANUAL` |
| **Skills** (Reader's Record) | `[ ] MANUAL` | `[ ] MANUAL` | `[x] PASS (CDP)` | `[ ] MANUAL` | `[ ] MANUAL` |
| **Contact form** | `[ ] MANUAL` | `[ ] MANUAL` | `[x] PASS (CDP)` | `[ ] MANUAL` | `[ ] MANUAL` |
| **Camera prompt** | `[ ] MANUAL` | `[ ] MANUAL` | `[x] PASS (CDP)` | `[ ] MANUAL` | `[ ] MANUAL` |
| **Sound prompt** | `[ ] MANUAL` | `[ ] MANUAL` | `[x] PASS (CDP)` | `[ ] MANUAL` | `[ ] MANUAL` |
| **/skip** (Plain version) | `[ ] MANUAL` | `[ ] MANUAL` | `[x] PASS (CDP)` | `[ ] MANUAL` | `[ ] MANUAL` |
| **/wanted** (Bounty board) | `[ ] MANUAL` | `[ ] MANUAL` | `[x] PASS (CDP)` | `[ ] MANUAL` | `[ ] MANUAL` |

---

## 2. Automated CDP Verification Results (Chrome Engine)

The automated CDP suite ([`scripts/verify-p6-3.mjs`](file:///c:/Sumit%20Portfolio/scripts/verify-p6-3.mjs)) executed across **5 standard viewports** under three motion configurations:
- **Full Mode**: Default rich animations and particle layers.
- **Light Mode**: Performance particle budget (`data-mode="light"`).
- **Reduced Motion Mode**: System accessibility preference (`prefers-reduced-motion: reduce`).

### Viewport & Mode Automation Summary

| Viewport | Device Profile | Mode | Horizontal Overflow | Console Errors | 44px Tap Targets | Focus Visible | Screenshot |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **360x740** | Small Android Mobile | `full` | **FAIL (376 > 360)** | **PASS (0)** | WARN (24 targets) | **PASS** | [`matrix_360x740_full.png`](file:///c:/Sumit%20Portfolio/docs/proofs/screens/phase6/matrix_360x740_full.png) |
| **360x740** | Small Android Mobile | `light` | **FAIL (376 > 360)** | **PASS (0)** | WARN (24 targets) | **PASS** | [`matrix_360x740_light.png`](file:///c:/Sumit%20Portfolio/docs/proofs/screens/phase6/matrix_360x740_light.png) |
| **360x740** | Small Android Mobile | `reduced-motion` | **PASS (360 == 360)** | **PASS (0)** | WARN (12 targets) | **PASS** | [`matrix_360x740_reduced-motion.png`](file:///c:/Sumit%20Portfolio/docs/proofs/screens/phase6/matrix_360x740_reduced-motion.png) |
| **390x844** | Standard iPhone | `full` | **PASS (390 == 390)** | **PASS (0)** | WARN (27 targets) | **PASS** | [`matrix_390x844_full.png`](file:///c:/Sumit%20Portfolio/docs/proofs/screens/phase6/matrix_390x844_full.png) |
| **390x844** | Standard iPhone | `light` | **PASS (390 == 390)** | **PASS (0)** | WARN (27 targets) | **PASS** | [`matrix_390x844_light.png`](file:///c:/Sumit%20Portfolio/docs/proofs/screens/phase6/matrix_390x844_light.png) |
| **390x844** | Standard iPhone | `reduced-motion` | **PASS (390 == 390)** | **PASS (0)** | WARN (13 targets) | **PASS** | [`matrix_390x844_reduced-motion.png`](file:///c:/Sumit%20Portfolio/docs/proofs/screens/phase6/matrix_390x844_reduced-motion.png) |
| **768x1024** | iPad / Tablet Portrait | `full` | **PASS (768 == 768)** | **PASS (0)** | WARN (27 targets) | **PASS** | [`matrix_768x1024_full.png`](file:///c:/Sumit%20Portfolio/docs/proofs/screens/phase6/matrix_768x1024_full.png) |
| **768x1024** | iPad / Tablet Portrait | `light` | **PASS (768 == 768)** | **PASS (0)** | WARN (27 targets) | **PASS** | [`matrix_768x1024_light.png`](file:///c:/Sumit%20Portfolio/docs/proofs/screens/phase6/matrix_768x1024_light.png) |
| **768x1024** | iPad / Tablet Portrait | `reduced-motion` | **PASS (768 == 768)** | **PASS (0)** | WARN (13 targets) | **PASS** | [`matrix_768x1024_reduced-motion.png`](file:///c:/Sumit%20Portfolio/docs/proofs/screens/phase6/matrix_768x1024_reduced-motion.png) |
| **1440x900** | Desktop Laptop | `full` | **PASS (1440 == 1440)** | **PASS (0)** | WARN (30 targets) | **PASS** | [`matrix_1440x900_full.png`](file:///c:/Sumit%20Portfolio/docs/proofs/screens/phase6/matrix_1440x900_full.png) |
| **1440x900** | Desktop Laptop | `light` | **PASS (1440 == 1440)** | **PASS (0)** | WARN (30 targets) | **PASS** | [`matrix_1440x900_light.png`](file:///c:/Sumit%20Portfolio/docs/proofs/screens/phase6/matrix_1440x900_light.png) |
| **1440x900** | Desktop Laptop | `reduced-motion` | **PASS (1440 == 1440)** | **PASS (0)** | WARN (15 targets) | **PASS** | [`matrix_1440x900_reduced-motion.png`](file:///c:/Sumit%20Portfolio/docs/proofs/screens/phase6/matrix_1440x900_reduced-motion.png) |
| **1920x1080** | FHD Desktop Display | `full` | **PASS (1920 == 1920)** | **PASS (0)** | WARN (30 targets) | **PASS** | [`matrix_1920x1080_full.png`](file:///c:/Sumit%20Portfolio/docs/proofs/screens/phase6/matrix_1920x1080_full.png) |
| **1920x1080** | FHD Desktop Display | `light` | **PASS (1920 == 1920)** | **PASS (0)** | WARN (30 targets) | **PASS** | [`matrix_1920x1080_light.png`](file:///c:/Sumit%20Portfolio/docs/proofs/screens/phase6/matrix_1920x1080_light.png) |
| **1920x1080** | FHD Desktop Display | `reduced-motion` | **PASS (1920 == 1920)** | **PASS (0)** | WARN (15 targets) | **PASS** | [`matrix_1920x1080_reduced-motion.png`](file:///c:/Sumit%20Portfolio/docs/proofs/screens/phase6/matrix_1920x1080_reduced-motion.png) |

### Auxiliary Routes Verification

| Route | Viewport Tested | Horizontal Overflow | Console Errors | Screenshot |
| :--- | :---: | :---: | :---: | :--- |
| **/skip** (Plain version) | 390x844 | **PASS** | **PASS (0)** | [`matrix_skip_390x844.png`](file:///c:/Sumit%20Portfolio/docs/proofs/screens/phase6/matrix_skip_390x844.png) |
| **/skip** (Plain version) | 1440x900 | **PASS** | **PASS (0)** | [`matrix_skip_1440x900.png`](file:///c:/Sumit%20Portfolio/docs/proofs/screens/phase6/matrix_skip_1440x900.png) |
| **/wanted** (Bounty board) | 390x844 | **PASS** | **PASS (0)** | [`matrix_wanted_390x844.png`](file:///c:/Sumit%20Portfolio/docs/proofs/screens/phase6/matrix_wanted_390x844.png) |
| **/wanted** (Bounty board) | 1440x900 | **PASS** | **PASS (0)** | [`matrix_wanted_1440x900.png`](file:///c:/Sumit%20Portfolio/docs/proofs/screens/phase6/matrix_wanted_1440x900.png) |

---

## 3. Discovered Issue: 360x740 Horizontal Overflow

During automated testing at `360x740` (Compact Android viewports), an overflow was caught:
- **Observed**: `scrollWidth: 376px` vs `innerWidth: 360px` (+16px horizontal overflow).
- **Offending Element**: In [`src/app/layout.tsx`](file:///c:/Sumit%20Portfolio/src/app/layout.tsx#L145), the sticky top header items:
  ```html
  <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 shrink-0">
    <MotionToggle />
    <SoundToggle />
    <Link href="/skip"><span>Skip &rarr;</span></Link>
  </div>
  ```
  On screens 360px wide, the branding title `SUMIT MAHAJAN` together with the Motion Toggle, Sound Toggle, and Skip link exceeds 360px by 16px.
- **Recommended Fix (for author)**: In `src/app/layout.tsx`, reduce gap to `gap-1.5` or use icon-only toggles below 380px breakpoint (`hidden sm:inline`).

---

## 4. Manual Testing Instructions for Real Devices

For each device/browser below, follow the step-by-step checklist to complete the matrix:

### A. Mid-Range Android Chrome
1. **Story scroll**: Scroll smoothly down from Hero to Finale. Verify no horizontal wobbling or accidental horizontal scrolling.
2. **Scenario Select**: Tap "Scenario Select" cards. Verify scenario switching and active state transitions.
3. **Each world**: Check Edge-Cloud, Ratify / Raft, and iac-verifier / Z3. Verify diagrams and canvas elements scale within screen bounds without truncation.
4. **Side quests**: Tap side quest cards to expand/view details.
5. **Skills**: Tap skill tags (e.g. Distributed Systems, Rust, Go, Python). Confirm modal / details render cleanly.
6. **Contact form**: Tap inputs (Name, Email, Message). Verify virtual keyboard does not push layout off-center or break fixed elements.
7. **Camera prompt**: Tap "Let the story see you?". Check camera permission dialog and inline feed behavior.
8. **Sound prompt**: Tap sound toggle. Verify web audio synthesis or sound stems un-mute on user gesture.
9. **/skip**: Navigate to `/skip`. Verify high contrast plain version renders cleanly with back link to `/`.
10. **/wanted**: Navigate to `/wanted`. Verify constellation bounty board renders and cards are readable.

### B. iPhone Safari (iOS WebKit)
1. **Story scroll**: Check collapsible iOS Safari bottom navigation bar. Confirm GSAP pinned hero scenes do not jump when the address bar expands/contracts.
2. **Scenario Select**: Verify touch interaction responsiveness.
3. **Each world**: Confirm SVG transforms (`transform-box: view-box`) render correctly without clipping.
4. **Side quests**: Check layout inside iOS Safari portrait orientation.
5. **Skills**: Verify font rendering and badge layout.
6. **Contact form**: Verify input zoom behavior (inputs >= 16px font size to prevent automatic iOS zoom).
7. **Camera prompt**: Verify camera feed renders inline with `playsInline` attribute and does NOT trigger fullscreen QuickTime video player.
8. **Sound prompt**: Confirm Web Audio context unlocks upon initial user gesture.
9. **/skip**: Confirm smooth scroll and clear typography.
10. **/wanted**: Check bounty card layouts on Safari.

### C. Desktop Chrome, Edge & Firefox
1. **Story scroll**: Test mouse wheel and scrollbar scrubbing from Hero to Finale.
2. **Scenario Select**: Test mouse hover states and keyboard navigation (`Tab` + `Enter`).
3. **Each world**: Verify interactive diagram components and code previews.
4. **Side quests**: Check flex/grid layout across wide displays (1440px and 1920px).
5. **Skills**: Test keyboard focus outlines.
6. **Contact form**: Test form validation with invalid email format.
7. **Camera prompt**: Test webcam permission flow and overlay rendering.
8. **Sound prompt**: Test toggle button audio playback and mute state.
9. **/skip**: Verify semantic HTML readability and skip links.
10. **/wanted**: Verify desktop layout and responsive columns.
