# Phase 0 Proofs and Decisions

## Scroll Smoothing Architecture Decision

For the portfolio's story animation architecture, we implement native browser scrolling paired exclusively with GSAP ScrollTrigger's built-in scrub (`scrub: 0.6`). This decision preserves standard browser momentum scrolling across platforms, retains full accessibility for keyboard and assistive technologies (Page Up/Down, Spacebar, arrow keys, touch swipe), eliminates input lag, and strictly respects our initial JavaScript budget of under 200KB gzipped by avoiding external runtime weight. Third-party smooth-scrolling engines (specifically Lenis) are rejected for Phase 0 to avoid synthetic scroll hijacking, touch-event conflicts on mobile devices, and unnecessary performance overhead; Lenis will only be reconsidered if a future proof gate (such as Phase 1 or Phase 4 real-device mobile audits) conclusively demonstrates that native browser scrolling with ScrollTrigger scrub causes measurable visual stutter that Lenis eliminates.

---

## Phase 0 Gate Checklist

From `/docs/05-PROOF-GATES.md` and `/docs/16-PROMPTS-PHASE-0.md`:

- [ ] **Production Build**: `npm run build` passes with zero errors, producing static output.
- [ ] **TypeScript Check**: `npm run typecheck` passes with zero errors under strict mode.
- [ ] **Code Quality / Linting**: `npm run lint` passes clean with zero errors and zero warnings.
- [ ] **Content Integrity**: `npm run check:content` runs clean without banned phrases or unverified flagship claims.
- [ ] **Design Tokens & Style Test**: `/style-test` is verified (hub palette tokens, world palettes, typography scales, SystemWindow HUD).
- [ ] **Plain Version / Skip Mode**: `/skip` renders all story content as accessible semantic HTML without client animation overhead.
- [ ] **Keyboard Accessibility**: Keyboard navigation test passed on `/skip` (Tab path, skip-to-content banner, focus rings).
- [ ] **Device & Mode Inspector**: `/dev/mode` works (detects full, light, and reduced modes, raw signals, and particle caps).
- [ ] **Placeholder Art**: Home page `/` renders Dokja and Biyoo code-drawn SVG placeholders on `--void` with the skip link visible.
- [ ] **Zero Secrets / Privacy Rule**: No email address, telephone number, or physical street address in code, content, or git history (`git grep` clean).
- [ ] **Deployment**: Preview URL live on Vercel after manual dashboard import.
