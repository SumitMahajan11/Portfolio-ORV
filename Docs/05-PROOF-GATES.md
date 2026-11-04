# 05 Proof Gates (nothing is "done" without proof)

Every task ends with proof pasted to Claude. Every phase ends with the gate below.

## Gate template
- Screen recording (mobile + desktop)
- Lighthouse report (mobile)
- FPS capture (Chrome Performance panel or Rendering > FPS meter) on a mid-range phone or 4x CPU throttle
- `npm run build` passes, `npm run lint` clean, TypeScript no errors

## Phase 0 gate
- Build passes. Tokens visible on a style test page. Skip mode renders all placeholder content. Keyboard navigation works. Deployed preview URL.

## Phase 1 gate
- Hero plays stages 1-7 on desktop and mobile, reversible on scroll where specified.
- Biyoo placeholder idles, wakes after about 8s of no movement.
- Edge-Cloud world complete and fully scrollable.
- Reduced-motion: static equivalent works. Light mode triggers on 4x CPU throttle.
- Measured: LCP, CLS, INP, FPS numbers recorded in /docs/proofs/phase1.md.
- Shippable alone: share the link.

## Phase 2 gate
- 3 worlds, side quests, Reader's Record, About all live. Every number on the site traceable to 03. iac-verifier repo root cleaned.

## Phase 3 gate
- Wanted page, contact form tested end to end, 5 hidden fragments findable, True Ending unlocks, sound off by default and works when on, camera optional and denial-safe.

## Phase 4 gate
- Lighthouse mobile 90+ skip, 80+ full. Cross-browser (Chrome, Safari iOS, Firefox). 404 page, OG image, favicon, meta. A friend tests on their own phone with no instructions.

## Fail rule
A failed metric means simplify the effect, not lower the bar.
