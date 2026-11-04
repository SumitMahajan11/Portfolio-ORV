# 01 Master Blueprint

## 1. Concept
A portfolio that is a story. The visitor is "the reader". Sumit's projects are "Scenarios". Dokja (original-art character inspired by ORV, not a copy of official art) starts by reading a novel on his phone: the novel is this site. The visitor's scrolling provokes him. He transforms, the wings spread, and the page becomes the story. Biyoo, a fluffy cotton companion, guides the reader.

Inspirations: Omniscient Reader's Viewpoint (core), One Piece, Naruto, Bleach, Hunter x Hunter, Detective Conan.
Legal note: all art is original or generated and heavily transformed. No official panels, logos, or screenshots.

## 2. Acts
- Act 0: Landing (Dokja reading phone). Skip button visible from first frame.
- Act 1: Transformation hero (see 06).
- Act 2: Scenario Select. Four flagship worlds plus Side Quests.
- Act 3: The worlds (09 to 12).
- Act 4: Reader's Record (skills as ORV item info boxes).
- Act 5: Chapter 0: The Protagonist's Origin (About, 3 short honest paragraphs).
- Act 6: Finale: next-chapter contact form.
- Persistent: Biyoo corner button "Looking for the bounty board?" opens /wanted (One Piece style Wanted: Sumit page: resume, GitHub, LinkedIn).
- Hidden: 5 fragments unlock the True Ending (private message + "talk to me" contact).

## 3. Hard rules
1. **Smoothness is the claim.** 60fps target on a mid-range Android phone. Anything that drops below 50fps gets simplified, not shipped.
2. **Skip mode**: a plain, fast, accessible version (all content, no heavy animation) reachable in one click from the first frame.
3. **Mobile is a separate design of the same story**, not a shrunk desktop: swipe-driven wings, Biyoo bottom corner, simplified effects.
4. **Reduced motion and low-end**: respect `prefers-reduced-motion`; auto "light mode" on slow devices (fewer particles, simpler wings). Story and Biyoo stay intact.
5. **Privacy**: no public phone, email, or address. Contact form + GitHub + LinkedIn only. Reader-behavior features run locally in the browser; nothing sent anywhere. 3am line uses the visitor's own clock.
6. **Camera is optional** ("Let the story see you?"). Denied means nothing breaks. Never required.
7. **Sound off by default**, one prompt: "Biyoo wants to say hi. Turn sound on?"
8. **Red is rare**: only Dokja's horns (and one finale pulse) use red on the hub site. Worlds have their own palettes.
9. **Evidence-only**: copy comes from 03 only. Unverified items are labeled "(unverified)" in docs and never shipped.
10. **No scope creep**: nothing from a later phase enters an earlier phase.

## 4. Scope by phase (summary; detail in 15)
- Phase 0: foundation, tokens, layout, skip mode, placeholders (code-drawn Biyoo blob, placeholder Dokja).
- Phase 1: hero (phone, transformation), Biyoo placeholder, Edge-Cloud world, mobile, reduced-motion.
- Phase 2: Raft, Z3, Backtrace worlds, side quests, Reader's Record, About.
- Phase 3: Wanted page, contact form/finale, hidden fragments, sound.
- Phase 4: polish, speed tests, launch. Also clean the iac-verifier repo root before launch.

## 5. Stack (locked)
Next.js (App Router), TypeScript, Tailwind, GSAP + ScrollTrigger, Vercel free tier. 2D layered art animated to look 3D (parallax, depth, lighting). No heavy 3D engine.

## 6. Change Log (newest wins)
- v3: Handoff changes applied: phone-reading opening, front-facing only, no back view or upward gaze, foundation-first build order, Biyoo as cotton illustrated art with two horns, contact form only.
- v3: Wings and coat WHITE. Horns red-black with thin red rim light.
- v3: Longer resume is the source of truth for project claims.
- v3: Raft (Ratify) and Z3 (iac-verifier) verified from READMEs: flagship. Backtrace pending.
