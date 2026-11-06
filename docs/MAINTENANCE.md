# Portfolio Maintenance and Regression Guide

This document defines the recurring maintenance lifecycle, verification protocols, claim refresh workflows, and dependency management policies for Sumit Mahajan's Portfolio.

---

## 1. Unified Regression Command (`npm run regress`)

The portfolio maintains a unified regression harness executed via:

```bash
npm run regress
```

This command executes the full verification and audit pipeline in strict sequential order:

| Step | Check Name | Command | Purpose |
| :---: | :--- | :--- | :--- |
| **1** | **Typecheck** | `npx tsc --noEmit` | Strict TypeScript verification across all application source code, components, and scripts. |
| **2** | **Lint** | `npx eslint` | Next.js and React ESLint rules enforcement, checking code style, accessibility, and best practices. |
| **3** | **Production Build** | `npx next build` | Turbopack production compilation, static page generation, and bundle asset compilation. |
| **4** | **Content Check (Strict)** | `node --experimental-strip-types scripts/check-content.ts --strict` | Content Bible compliance: verifies that all claims have verified citations, no banned hype words exist, and flagships have valid repository links. |
| **5** | **Bundle Privacy** | `node scripts/verify-bundle-privacy.mjs` | Scans all compiled static JavaScript, server chunks, and HTML bundles for leaked personal emails or secrets. |
| **6** | **PII & Secrets Audit** | `node scripts/audit-pii-secrets.mjs` | Recursive repository scan ensuring no API keys, private credentials, or raw personal contact details are committed. |
| **7** | **Pre-launch Audit** | `node scripts/audit-prelaunch.mjs` | Chrome CDP and HTTP crawler checking for broken routes, empty sections, missing assets, and unrendered placeholders. |

### Exit Contract
- **Code 0 (PASS)**: All 7 steps succeeded without warnings or fatal errors. Site is completely healthy and safe to release.
- **Code 1 (FAIL)**: One or more steps encountered errors or blockers. The runner outputs a summary table detailing passing vs. failing checks.

---

## 2. Regression Cadence: How Often to Run `regress`

To maintain continuous reliability and safety, `npm run regress` must be executed:

1. **Before Every Git Commit and Pull Request**:
   - Ensure local changes do not introduce type errors, lint regressions, or forbidden copy.
2. **After Updating Any Dependency**:
   - Whenever `npm update` or `npm install` is executed, run `npm run regress` immediately to catch breaking changes or bundle regressions.
3. **Before Triggering Production Deployments**:
   - Run the suite locally before pushing to `main` or promoting a Vercel preview deployment to production.
4. **Before Sharing Portfolio Links with Recruiters or Companies**:
   - Execute the pre-recruiter claim refresh procedure (Section 3) followed by a clean regression pass.

---

## 3. Refreshing Claims Before Sharing with Recruiters

The portfolio is built on a **Strict Evidence Rule**: every claim, number, and benchmark displayed on the site must reflect real, verifiable repository evidence.

### Pre-Recruiter Claim Refresh Checklist

Before sending your portfolio link to a recruiter or hiring manager:

1. **Re-verify Live Repository Metrics**:
   - Pull the latest commits on your flagship and side-quest repositories (`edge-cloud`, `ratify`, `iac-verifier`, `echo`, `lumina-clinical`).
   - Run test suites on each repository and record exact numbers:
     - Total passing tests (unit, integration, model-checking).
     - Performance benchmarks (p99 latency under load, throughput in ops/sec, failover recovery times).
     - Formal verification results (state spaces explored, verification solver runtimes, invariant checks).
2. **Update the Content Bible First (`docs/03-CONTENT-BIBLE.md`)**:
   - The Content Bible is the **single source of truth**.
   - If test counts increased (e.g., from 42 to 50 tests), update the exact line in `docs/03-CONTENT-BIBLE.md` with the citation reference and commit hash.
   - **Never invent or inflate claims.** If a benchmark hasn't been re-run, keep the existing verified metric or state the exact conditions under which it was measured.
3. **Synchronize Codebase Content (`src/content/projects.ts`)**:
   - Copy the verified claims and numbers into `src/content/projects.ts` word-for-word.
   - Ensure every claim object contains:
     - `text`: Verbatim claim text.
     - `evidence`: `"verified"`.
     - `source`: Direct citation (e.g. `"docs/03-CONTENT-BIBLE.md:38"` or specific repository test file).
   - Verify that each project has an explicit `limits` array detailing known trade-offs or unverified boundaries.
4. **Run Regression Verification**:
   ```bash
   npm run regress
   ```
   Confirm that `Content Check (Strict)` and `Pre-launch Audit` evaluate your refreshed claims cleanly.

---

## 4. Handling Broken Dependencies

Dependencies must be kept secure and up to date, but updates can occasionally introduce regressions.

### Dependency Update Policy
- **Minor and Patch Updates Only**: Bumping `~` or `^` within the current major version is allowed (e.g. `tailwindcss` 4.3.4 → 4.3.5, `react` 19.3.0 → 19.3.1).
- **No Major Version Upgrades Without Architectural Review**: Never upgrade major versions (e.g. Next.js 16 → 17, React 19 → 20, TypeScript 5 → 6) without reviewing breaking change migration guides and scheduling dedicated testing.
- **Grouped Updates**: Update packages one group at a time (e.g. Tailwind ecosystem, then React core, then utilities). Run `npm run regress` after each group.

### Rollback Procedure for Broken Dependencies

If `npm run regress` fails after updating a package:

1. **Identify the Culprit**:
   - Inspect the failed step in the regression summary table:
     - Step 1 (Typecheck) failure: TypeScript types mismatch in `@types/*` or library types.
     - Step 2 (Lint) failure: ESLint or plugin rule conflicts.
     - Step 3 (Build) failure: Turbopack compilation error, bundler incompatibility, or server component export issue.
     - Step 5 (Bundle Privacy) failure: New package bundling extraneous strings or debug metadata.
2. **Isolate and Revert**:
   - Check `git diff package.json` and `git diff package-lock.json` to identify which package changed.
   - Revert the package to its known working version:
     ```bash
     npm install <package-name>@<previous-working-version>
     ```
3. **Verify Restored Health**:
   - Execute `npm run regress` to ensure all checks return to their baseline passing state.
4. **Report / Document Upstream**:
   - Note the pinned version and failure reason in commit notes or this maintenance file so future updates do not blindly re-introduce the broken version until an upstream patch is released.
