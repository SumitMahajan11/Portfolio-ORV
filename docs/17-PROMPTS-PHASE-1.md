# 17 Prompts: Phase 1 (Hero, Biyoo, Edge-Cloud, mobile, fallbacks)

Prerequisite: Phase 0 gate passed. Art is still PLACEHOLDER (code-drawn). Final art will be swapped in later through the same layer names, so keep every layer in its own element.

Hero behavior is defined in /docs/06. Key decisions already locked:
- Stages 1-3 auto-play (about 6-8s). Stages 4-7 are scroll-scrubbed (swipe on mobile).
- If the visitor scrolls during stages 1-3, the intro fast-forwards to its end state; it never blocks scrolling and never jumps visibly.
- Stages 4-6 reverse when scrolling back. Stage 7 glitch text plays each time the threshold is crossed forward.

---
## P1-1 Hero shell and auto-play intro (stages 1-3)
Read: /docs/06, /docs/08 (Dokja layers), /docs/02 (Motion), /docs/14 (hero lines).
```text
Follow CLAUDE.md. Read /docs/06-DOKJA-TRANSFORMATION-SPEC.md, /docs/08-ART-ASSET-LIST.md, /docs/02-DESIGN-SYSTEM.md.

TASK: Build the hero scene container and stages 1-3.

1. Create src/components/dokja/HeroScene.tsx (client component). It renders the layer stack from /docs/06 in this order, each as its own element: background, stars (3 parallax layers), wings-back, body, coat, horns, wings-front, phone, glow, particles. Use the Phase 0 placeholder Dokja shapes; replace nothing in the Biyoo placeholder.
2. Hold the hero state in a single typed object: { stage: 1..7, scrollProgress: number, introDone: boolean }. Expose it through a small context so Biyoo and Constellation lines can read it later.
3. Stage 1 (Reading): Dokja front-facing holding the phone, phone glow lighting his face, micro-motion only (coat edge sway and hair shift using transform, 4-6s loops). Biyoo sleeps near bottom-left with the breathing bob.
4. Stage 2 (Notices you): eyes lift from the phone to the viewer (placeholder: swap eye layer state), phone lowers slightly, system text in a SystemWindow: "A Reader has been detected."
5. Stage 3 (Irritation): brow tightens (placeholder: head layer state), small sigh motion (body scale 1 to 1.01 and back), cold glow pulse. Then a bottom scroll hint pulses ("scroll"), shown only after stage 3 ends.
6. The whole intro is ONE gsap timeline created inside use-scene (so it is reverted on unmount). Total duration 6-8s. Set introDone=true at the end.
7. Fast-forward: on first wheel, touchmove, keydown (space, arrows, pageup/down), or pointer scroll attempt during the intro, call timeline.progress(1) smoothly (do not teleport more than one frame of visual change: use timeline.timeScale(8) until complete). Never call preventDefault on scroll input.
8. Static fallback: in 'reduced' mode render stage 1 as a still image-like composition with the system text, no timeline.
9. The skip link in the header must remain visible and focusable during the entire intro.
10. Hero occupies 100svh (use svh/dvh units, not vh, to avoid mobile browser bar bugs).

Commit: `phase1-1: hero shell and intro`.
```
Capture: screen recording of arrival (full intro), then a second recording where you scroll immediately during the intro.

---
## P1-2 Scroll-scrubbed stages 4-7
Read: /docs/06, /docs/02.
```text
Follow CLAUDE.md. Read /docs/06-DOKJA-TRANSFORMATION-SPEC.md and /docs/02-DESIGN-SYSTEM.md (Motion rules and Performance budgets).

TASK: Implement stages 4-7 driven by scroll.

1. Add ONE master ScrollTrigger timeline (pinned HeroScene, scrub: 0.6). Pin length: desktop end "+=300%", mobile "+=200%". Use pinSpacing so following content is not overlapped. Use `invalidateOnRefresh`, and `anticipatePin` only if it demonstrably helps.
2. Map progress ranges exactly: horns grow 0-25%, wings emerge 25-55%, wings expand 55-85%, final form 85-100%.
3. Stage 4 horns: scale/opacity grow with a thin red rim light. This is the ONLY place (besides the finale pulse in Phase 3) where --horn red appears. Implement the rim light as an opacity-animated layer, not an animated filter.
4. Stage 5 wings emerge: split wings into back/front layers, rotate from shoulder pivots (transform-origin), slow and heavy easing.
5. Stage 6 wings expand: wings reach and pass viewport edges; the star ring of tiny lights orbits (transform rotate on a single wrapper, not per-star animation). Particle count capped by mode (desktop 120, mobile 40, light 15). 
6. Stage 7 final form: show glitch text "A Scenario has arrived." (CSS-only glitch using transform/opacity, 600-900ms) each time progress crosses 85% going forward; Biyoo wake/startle hook (an event, handled in P1-3). Feathers drift and form the page grid: implement as white squares fading/translating into a 3-column grid that visually hands off to the Scenario Select section's background.
7. Stages 4-6 must reverse smoothly when scrolling up. Verify there is no state that gets stuck (jump to 50% via DevTools then to 0%).
8. Keep stage in the hero state object updated (stage 4..7 from progress ranges).
9. 'reduced' mode: no pin, no scrub. Show three static frames (stage 1, stage 5, stage 7 compositions) as stacked sections with crossfades on scroll using opacity only, or plain stacked if simpler.
10. Make sure ScrollTrigger.refresh happens after fonts load and after layout settles (no height jump).

Commit: `phase1-2: scroll-driven transformation`.
```
Capture: desktop screen recording scrolling down and back up; DevTools Performance panel screenshot (FPS meter visible) during the scroll; report any frame drops honestly.

---
## P1-3 Biyoo behavior and local reader tracking
Read: /docs/07, /docs/14, /docs/02.
```text
Follow CLAUDE.md. Read /docs/07-BIYOO-PERSONALITY-AND-SOUND.md and /docs/14-CONSTELLATION-LINES.md.

TASK: Make Biyoo alive using the placeholder blob.

1. Biyoo state machine in src/components/biyoo/ with the states in the /docs/07 table: sleeping, yawn-wake, startled, curious, happy, proud, sleepy-again, night, plus costume slot (no costume art yet; just a swappable prop group). Implement states as GSAP timelines on the Phase 0 layers (transform/opacity only). Elastic easing only for Biyoo.
2. src/lib/reader/: local-only tracker with: idle seconds (since last scroll/pointer/key/touch), scroll speed (px/s smoothed), pointer position, hover target, and visitor local hour. Zero network calls. Zero storage in this task.
3. Idle nudge: 8 seconds of NO input AFTER introDone => Biyoo wakes, yawns, nudges the screen, shows "Scroll, reader." once per page load. Cancel immediately if the visitor scrolls during the sequence.
4. Stage 7 trigger: when the hero crosses 85%, Biyoo wakes with a startled squeak animation (visual only; sound arrives in Phase 3).
5. Sleepy-again after 60s inactive. Night state when local hour is 0-4 (00:00-04:59): rubbing-eyes animation. Biyoo lines are text bubbles in a small SystemWindow style, auto-hide after 4s.
6. Constellation lines engine (basic): pick lines from src/content/lines.ts by context (hero, fast-scroll when speed above a threshold you define and document, idle, time-night 00:00-04:59, time-morning 05:00-09:59, mobile). Rules: max 1 line per 20s, never repeat the same line within a session until all in its context are used, never show during the intro, never overlap Biyoo's own bubble. Respect 'reduced' mode: lines appear without float animation.
7. Biyoo follows the cursor loosely on desktop (small lerped translate within a limited area); on touch devices stay in the bottom corner.
8. Verify in DevTools Network that the page makes no requests triggered by this code.

Commit: `phase1-3: biyoo behavior and reader tracking`.
```
Capture: recording showing idle wake at 8s, fast-scroll line, hover reaction; screenshot of DevTools Network tab with no tracking requests.

---
## P1-4 Scenario Select
Read: /docs/01, /docs/03, /docs/07, /docs/13.
```text
Follow CLAUDE.md. Read /docs/01-MASTER-BLUEPRINT.md, /docs/03-CONTENT-BIBLE.md, /docs/13-SIDE-QUEST-TEMPLATE.md.

TASK: Build the Scenario Select section after the hero.

1. Render one SystemWindow card per project whose status is 'flagship' in src/content/projects.ts, then a "Side Quests" row for every status 'sidequest' project. Do not hardcode which projects are flagships; read status from content. (Currently Edge-Cloud, Raft, Z3 are flagships; Backtrace is a side quest until the content file says otherwise.)
2. Each flagship card: title, oneLiner via renderField, world accent color via data-world, small status label "Scenario" and a "Begin" button. Edge-Cloud "Begin" scrolls to its world section (anchor). Raft and Z3 "Begin" are disabled with the label "Opens in Phase 2" ONLY in dev builds; in production, hide those cards until their world exists (use a `worldReady` flag in content, default false).
3. Side quest cards: smaller, themed accent, show title and oneLiner only.
4. Hover/focus: card lifts (translateY, 8px max), Biyoo reacts with "curious"; click triggers "happy" with the line "Good choice." Keyboard operable.
5. Entrance: staggered fade/translate with ScrollTrigger (once). 'reduced' mode: no entrance animation.
6. The section heading is a SystemWindow notification: "Choose your Scenario."
7. Mobile: cards stack in one column with 44px minimum touch targets.

Commit: `phase1-4: scenario select`.
```
Capture: screenshots desktop and mobile; recording of hover and click; note which cards render in production build (`npm run build && npm run start`).

---
## P1-5 Edge-Cloud world
Read: /docs/09, /docs/03, /docs/02.
```text
Follow CLAUDE.md. Read /docs/09-WORLD-EDGE-CLOUD.md, /docs/03-CONTENT-BIBLE.md, /docs/02-DESIGN-SYSTEM.md.

TASK: Build the Edge-Cloud Orchestrator world as the template for later worlds.

1. Section with data-world="edge-cloud", lazy loaded with next/dynamic (ssr: false only for the canvas/animated part; the text content must still be server-rendered for SEO and skip-friendly access).
2. Beats from /docs/09: Scenario card "Scenario: Route the Workload"; star-network (SVG, max 60 nodes desktop, 20 in light mode, 30 on mobile in full mode); scroll-scrubbed packet traveling two paths: shortest (dim amber) vs greener (teal-green); the greener path wins and is labeled "carbon-aware"; proof panel; exit stamp "Scenario cleared" and Biyoo "proud"/"happy".
3. The routing visualization is explicitly labeled "illustrative routing diagram" unless it is real output from the repo. Do not display any numeric result (CO2, latency, percent). Numbers stay null until /docs/03 contains verified values.
4. Proof panel renders repo/demo links via renderField (dev badge if null, hidden in production if null) and the claims from content. If claims are empty, the panel shows only the one-liner.
5. Static fallback: a labeled static SVG diagram plus the same text, used for 'reduced' mode and when JS fails (progressive enhancement: the text must be in the HTML).
6. Biyoo costume hook: star goggles (placeholder: two circles prop group).
7. Keep animated elements to transform/opacity. Do not animate SVG filters or path `d` attributes. Use stroke-dashoffset only for the path draw (allowed exception; verify it stays 60fps, otherwise use a masked/clip approach and tell me).
8. Add anchor id and back-to-Scenario-Select link.

Commit: `phase1-5: edge-cloud world`.
```
Capture: screen recording; FPS panel screenshot; confirm text visible with JS disabled.

---
## P1-6 Mobile pass
Read: /docs/01 (rule 3), /docs/06 (Variants), /docs/02.
```text
Follow CLAUDE.md. Read /docs/01-MASTER-BLUEPRINT.md, /docs/06-DOKJA-TRANSFORMATION-SPEC.md Variants, /docs/02-DESIGN-SYSTEM.md.

TASK: Make a real mobile version of the same story (not a shrunken desktop).

1. Viewport meta correct; use svh/dvh; test with a 390x844 and 360x740 viewport.
2. Hero on portrait: crop and scale Dokja so wings span the width in stage 6; horns remain visible; the phone and face are not cut off. Swipe/scroll drives stages 4-7 with the mobile pin length from P1-2. Handle iOS address-bar resize without ScrollTrigger jumps (`ScrollTrigger.config({ ignoreMobileResize: true })` or equivalent; explain your choice).
3. Biyoo fixed in the bottom corner, not overlapping scroll hint or buttons; touch hit area at least 44x44px.
4. Particle caps from /docs/02 (40 mobile). Parallax star layers reduced from 3 to 2.
5. No hover-only interactions: every hover reaction needs a tap/focus equivalent.
6. Prevent horizontal scroll (verify no element exceeds 100vw, wings use overflow clipping on the hero container, not on body, and do not break position: sticky/pin).
7. Edge-Cloud world and Scenario Select verified at both viewport sizes.
8. Add `touch-action` and passive listeners where needed; no scroll-jacking.

Commit: `phase1-6: mobile pass`.
```
Capture: recording on a REAL phone (not only emulator), plus the Chrome remote-debug FPS if possible.

---
## P1-7 Light mode and reduced motion
Read: /docs/02, /docs/06 (Variants).
```text
Follow CLAUDE.md. Read /docs/02-DESIGN-SYSTEM.md and /docs/06-DOKJA-TRANSFORMATION-SPEC.md Variants.

TASK: Complete the three modes and prove they work.

1. 'light' mode (auto on slow devices or ?light=1): wings as ONE layer using scale/opacity, 15 particles, 1 parallax star layer, no star-ring orbit (static ring), Edge-Cloud nodes capped at 20, Biyoo animations simplified to opacity/scale only. Story and Biyoo remain intact.
2. 'reduced' mode (prefers-reduced-motion): no pinning, no scrub, no autoplay timelines, no floating comments animation; static compositions that still tell the story in order; Biyoo static with changes of expression only.
3. A small unobtrusive toggle in the footer/header: "Motion: Full / Light" (cannot force Full when the OS says reduce motion). Persist the choice for the session only (sessionStorage is fine; it is not identifying).
4. Verify switching modes does not require reload and does not leave orphaned ScrollTriggers (log ScrollTrigger.getAll().length before/after).
5. Test with CPU 4x slowdown in DevTools: confirm auto light mode triggers. Report the numbers you observed from the frame probe.

Commit: `phase1-7: light and reduced-motion modes`.
```
Capture: recordings of all three modes; screenshot of /dev/mode in each; ScrollTrigger count log.

---
## P1-8 Phase 1 gate
Read: /docs/05, /docs/02.
```text
Follow CLAUDE.md. Read /docs/05-PROOF-GATES.md (Phase 1 gate) and /docs/02-DESIGN-SYSTEM.md (budgets).

TASK: Verify Phase 1 and write the proof file. Do not add features.

1. Run a production build and serve it. Run Lighthouse (mobile preset, Chrome, incognito) for "/" and "/skip" 3 times each; record median Performance, Accessibility, Best Practices, SEO, LCP, CLS, TBT.
2. Report initial JS size (gzipped) from the Next build output and compare to the 200KB budget; list the three largest chunks.
3. Fill /docs/proofs/phase1.md: each gate item from /docs/05 with PASS/FAIL, the measured numbers, and the exact commands used. Do not mark an item PASS if you did not measure it; mark it "NEEDS MANUAL" (e.g., real-phone FPS) and say what I must do.
4. List every budget miss with a proposed simplification (do not apply it unless it is a one-line change).
5. Run `npm run check:content` (warn mode) and paste the output summary.

Commit: `phase1-8: phase 1 gate report`.
```
Capture: the generated /docs/proofs/phase1.md; your own real-phone test; then deploy and share the link.
