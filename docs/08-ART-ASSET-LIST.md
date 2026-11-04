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

## Biyoo (master 1600x1600)
body, head, horns L/R, arms L/R, legs L/R, eyes (open, half, closed, startled, happy), mouth (neutral, yawn, smile, squeak), cotton texture overlay, costume props x4, sign (bounty board).

## Backgrounds and fx
void_stars (3 parallax layers), constellation_ring (SVG), glitch_noise, scanline overlay (CSS), per-world backgrounds (4 x 3 layers).

## Wanted page
wanted_poster_frame (original design, parchment), portrait of Sumit or Dokja-as-Sumit (your choice), "WANTED" lettering style (original).

## Open Graph
og_image 1200x630, favicon (Biyoo horn).

## Production note
Generated art must be edited/hand-finished for consistency. Keep one style reference sheet. Dokja and Biyoo must look the same across all stages.
