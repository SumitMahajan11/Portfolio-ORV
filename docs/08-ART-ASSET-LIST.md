# 08 Art Asset List

Naming: `<subject>_<layer>_<state>.<ext>`. Export AVIF + WebP + PNG fallback. Transparent backgrounds. Keep source files outside the repo.

## Dokja (front-facing, canvas 2400x3200 master, export 1200x1600 desktop, 800x1067 mobile)
- dokja_body_base, dokja_body_reading (phone raised), dokja_body_irritated
- dokja_head_reading, head_notice, head_irritated, head_final
- dokja_coat (white, rim-lit)
- dokja_horns (red-black, rim) with grow states: small / medium / full (or one layer scaled)
- dokja_wings_back_L/R, dokja_wings_front_L/R (white, layered feathers, pivot at shoulders)
- dokja_phone, phone_glow
- dokja_hand_phone_closed (finale)
- feathers_particles (3 feather sprites), white_squares (shatter tiles)
Minimum viable set for Phase 1: body_reading, head x3, coat, horns, wings x4, phone.

## Wall Backgrounds (Approved Art Frozen)
Approved wall files and their section roles:
- `wall-01` (`docs/reference/walls/wall-01.png`): Story Wall (hero through Scenario Select).
  - Landscape: 1920x1080 cover crop (AVIF <= 120 KB, WebP <= 180 KB) [Status: Source Present]
  - Portrait: 1080x1920 cover crop for mobile (AVIF <= 100 KB, WebP <= 150 KB) [Status: Crop Needed]
- `wall-02` (`docs/reference/walls/wall-02.png`): Worlds Wall (worlds, side quests, skills).
  - Landscape: 1920x1080 cover crop (AVIF <= 120 KB, WebP <= 180 KB) [Status: Source Present]
  - Portrait: 1080x1920 cover crop for mobile (AVIF <= 100 KB, WebP <= 150 KB) [Status: Crop Needed]
- `wall-03` (`docs/reference/walls/wall-03.png`): Finale Wall (finale and contact section).
  - Landscape: 1920x1080 cover crop (AVIF <= 120 KB, WebP <= 180 KB) [Status: Source Present]
  - Portrait: 1080x1920 cover crop for mobile (AVIF <= 100 KB, WebP <= 150 KB) [Status: Crop Needed]
- Background FX: void_stars (3 parallax layers), constellation_ring (SVG), glitch_noise, scanline overlay (CSS), per-world backgrounds (4 x 3 layers).

## Biyoo Layers & States (Approved Art Frozen)
Source reference: `docs/reference/biyoo/biyoo-01.png` (happy) and `biyoo-02.png` (joyful).
- **Body & Base**:
  - Transparent body / base pose: [Status: Missing - references have baked dark blue background; requires background extraction or transparent generation]
- **Expressions (docs/07 states)**:
  - Base / Happy: [Status: Present in reference art `biyoo-01.png`]
  - Joyful / Cheerful: [Status: Present in reference art `biyoo-02.png`]
  - Sleepy: [Status: Missing - fallback to base + CSS squash/dim]
  - Startled: [Status: Missing - fallback to base + CSS jump/scale]
  - Curious: [Status: Missing - fallback to base + CSS head-tilt]
  - Proud: [Status: Missing - fallback to base + CSS chest-puff]
  - Waving: [Status: Missing - fallback to base + CSS wobble]
  - Poked: [Status: Missing - fallback to base + CSS squash]
  - Thinking: [Status: Missing - fallback to base + CSS tilt]
- **Costume Overlays (world accessories)**:
  - Edge-Cloud (star goggles): [Status: Missing - code hook exists]
  - Raft (leaf-village style headband): [Status: Missing - code hook exists]
  - Z3 (chain bracelet): [Status: Missing - code hook exists]
  - Backtrace (magnifier): [Status: Missing - code hook exists]

## Wanted page
wanted_poster_frame (original design, parchment), portrait of Sumit or Dokja-as-Sumit (your choice), "WANTED" lettering style (original).

## Open Graph
og_image 1200x630, favicon (Biyoo horn).

## Production note
Generated art must be edited/hand-finished for consistency. Keep one style reference sheet. Dokja and Biyoo must look the same across all stages.
