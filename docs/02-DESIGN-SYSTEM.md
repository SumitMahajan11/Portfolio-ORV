# 02 Design System

## Mood
Cold, vast, starlit, quiet, with sudden electric moments. Lit figure on a near-black stage.

## Hub palette (CSS variables in globals.css)
| Token | Hex | Use |
|---|---|---|
| --void | #07080B | page background |
| --ink | #0E1118 | panels, cards |
| --ink-2 | #161B26 | raised surfaces |
| --line | #243044 | hairlines, borders |
| --feather | #F4F6FA | wings, coat, primary text |
| --mist | #9AA7BD | secondary text |
| --rim | #9FB4D6 | cold rim light on white forms |
| --star | #5EE1E6 | Constellation / system-window accent (teal) |
| --horn | #B3122B | RED. Horns only (+ one finale pulse). Never UI buttons |
| --horn-dark | #2A0A10 | horn body |

## Layer Hierarchy (Z-Index Tokens)
| Layer | Token / Variable | Value | Components & Roles |
|---|---|---|---|
| Wall Background | `--z-wall` | `0` | `<SiteWall />` fixed global background layer (`z-0`) |
| Page Content | `--z-content` | `10` | Story sections (hero, scenarios, worlds, side quests, skills, finale), static fallbacks (`z-10` to `z-20`) |
| Global Companion | `--z-biyoo` | `35` | Global floating Biyoo companion (`z-35`), corner bounty button (`z-40`) |
| Overlays & Chrome | `--z-overlay` | `50` | Sticky header (`z-50`), Constellation overlay (`z-50`), Sound permission prompt (`z-50`), modal dialogues (`z-50`), Skip link (`z-[100]`) |

*Audit & Conflict Notes*:
- `corner-bounty-button.tsx` uses `z-40`, safely positioned between content and overlays.
- `layout.tsx` skip link uses `z-[100]` to ensure keyboard focus visibility above all chrome.
- All story content panels sit at `--z-content` (`z-10` to `z-20`) above `--z-wall` (`0`).

## World palettes (scoped via `data-world` attribute)
- edge-cloud: deep navy, --star teal, soft green "greener path" #6EE7A8
- raft (Naruto): warm orange #F28C28, leaf green #3E8E41, parchment #F1E4C3
- z3 (HxH Nen): emerald #1FA37A, violet #6B4EFF, black chain lines
- backtrace (Conan): midnight blue #0F1B3D, case-board corkboard #B88A55, brass #D4B15F
- side quests: pick one accent from the nearest world above

## Typography (next/font, no external CSS)
- Display: "Cinzel" (system-window titles, chapter names)
- UI/body: "Space Grotesk"
- System window / code / proofs: "JetBrains Mono"
- Narration: "Cormorant Garamond" italic
- Scale: 12 / 14 / 16 / 20 / 28 / 40 / 64 / 96. Body 16, line-height 1.6.

## ORV "system window" component
Thin --line border, --ink background at 85% opacity, small corner ticks, mono text, teal header bar, slight scan-line. Used for: Scenario cards, item info boxes, notifications.

## Motion rules
- Easings: `power3.out` (entrances), `power2.inOut` (transitions), `elastic.out(1,0.5)` (Biyoo only).
- Durations: micro 120-200ms, UI 300-450ms, scenes 0.8-1.6s, transformation scroll-scrubbed.
- Animate only `transform` and `opacity`. Never animate layout properties. Use `will-change` sparingly and remove after.
- One ScrollTrigger master timeline per scene. Kill triggers on unmount.
- Scroll smoothing: GSAP ScrollTrigger scrub 0.6 (or Lenis if a gate proves it smoother; decide in Phase 0).
- Particle caps: desktop 120, mobile 40, light mode 15.
- Every animated scene has a static fallback (skip mode / reduced motion).

## Performance budgets (measured, see 05)
- LCP under 2.5s on throttled 4G mobile. CLS under 0.05. INP under 200ms.
- Initial JS under 200KB gzipped; world code lazy-loaded per route/section.
- Images AVIF/WebP, hero layers sized per breakpoint. Total hero assets under 1.5MB mobile.
- Lighthouse mobile Performance 90+ in skip mode, 80+ in full mode.

## Accessibility
Contrast AA minimum. Visible focus rings (--star). Full keyboard path. All story content present in skip mode as real text.
