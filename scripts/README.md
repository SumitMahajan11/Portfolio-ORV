# Automation & Verification Scripts

This directory contains standalone, zero-external-dependency Node.js and TypeScript verification tools used during development, performance benchmarking, accessibility audits, and security validation.

---

## Content & Integrity Verification

- **`check-content.ts`**: Validates content rules in `src/content/` against `/docs/03-CONTENT-BIBLE.md`.
  - Usage: `npm run check:content` (warn mode) or `npm run check:content -- --strict` (zero-tolerance mode).
  - Checks: No banned buzzwords, verified flagship claims, mandatory skill proof links, and no rating bars.

- **`truth-audit-extract.mjs`**: Launches a production server (`next start`) and captures every user-visible string, metadata tag, OpenGraph attribute, JSON-LD schema, and image alt text across `/`, `/skip`, `/wanted`, and `/true-ending` via Chrome DevTools Protocol (CDP).

- **`analyze-truth-audit.mjs`**: Analyzes the extracted production text against `/docs/03-CONTENT-BIBLE.md`. Verifies zero occurrences of banned terms (`throughput`, `latency`, `production-ready`, `lorem`, `[FILL]`) and confirms the presence of the mandatory Ratify limitation notice.

---

## Security, Hygiene & PII Scanners

- **`scan-git-history.mjs`**: Scans the entire git patch history (`git log -p`) and object database (`git rev-list`) for leaked personal email addresses, phone numbers, API keys (AWS, Resend, GitHub PATs), private keys, and binary files.

- **`audit-pii-secrets.mjs`**: Static scanner checking source code, public files, and build outputs for un-redacted contact information and leaked secrets.

- **`verify-bundle-privacy.mjs`**: Validates that production bundles do not leak private environment variables or server-only code.

---

## Accessibility & Cross-Browser Verification

- **`run-a11y-audit.mjs`**: Injects `axe-core` via CDP and executes official Lighthouse Accessibility CLI audits on production pages. Confirms 0 WCAG violations and generates accessibility scorecards.

- **`audit-safari.mjs`**: Scans the codebase for iOS/macOS Safari-specific risks (e.g. `svh`/`dvh` fallbacks, `backdrop-filter` prefixes, `playsInline` on video/audio, and modern API support).

- **`verify-p4-2.mjs`**: Automated cross-browser and responsive viewport matrix test across desktop and mobile viewports (360x740, 390x844, 768x1024, 1440x900, 1920x1080).

---

## Performance & Optimization Benchmarks

- **`run-lighthouse-audits.mjs`**: Executes automated mobile Lighthouse performance audits (3x median) and calculates LCP, CLS, and TBT.

- **`p4-1-measure.mjs` & `p4-1-measure-postfix.mjs`**: Captures CDP FPS scroll-scrub traces under 4x CPU throttle and evaluates frame duration over 20ms across hero stages and worlds.

- **`analyze-bundles.mjs`**: Inspects `.next/static/chunks` to compute transferred JS and disk gzipped weight against the 200KB initial load budget.

---

## Phase Verification Gates

- **`verify-p1-9.mjs`**: Phase 1 gate verification script (Scrub physics, reverse scrubbing, Biyoo interactions).
- **`verify-p2-8.mjs`**: Phase 2 gate verification script (Worlds, diagrams, disclaimers, proof panels).
- **`verify-p3-8.mjs`**: Phase 3 gate verification script (Finale, contact form, sound permission prompt).
- **`verify-p4-3.mjs`**: Phase 4 SEO, OpenGraph image, robots.txt, and sitemap.xml validator.
