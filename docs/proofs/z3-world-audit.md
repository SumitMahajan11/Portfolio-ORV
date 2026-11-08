# Z3 World Read-Only Audit (`z3-Z0: world audit`)

**Audit Date:** 2026-11-08  
**Scope:** `src/components/worlds/z3/`, `src/lib/worlds/z3-viz.ts`, `src/content/projects.ts` (iac-verifier entry), `src/content/walls.ts`, `src/components/biyoo/biyoo-character.tsx`, `src/app/page.tsx`, `src/components/home/deferred-worlds.tsx`, `/docs/03-CONTENT-BIBLE.md`, `/docs/11-WORLD-Z3.md`.  
**Rules Checked:** Strict read-only audit. No source files modified. All comparisons against owner notes are marked **owner-stated, unverified**.

---

## Executive Summary & Provenance Verdict

The `iac-verifier` world (`#iac-verifier`, world: `z3`, theme: Hunter x Hunter: Nen Vows) implements a deterministic visual simulation of SMT reachability checking and auto-repair.

**Key Provenance Verdict:**
1. **Zero Real Solver Output**: Every SAT/UNSAT verdict, witness path, constraint rule, and proof certificate is **(2) hand-authored mock frames**. No real Z3 execution or committed trace artifact is loaded or evaluated.
2. **Misleading Accuracy Claims**: `src/components/worlds/z3/z3-static-diagram.tsx:226` proclaims `"FINDINGS: PRIVILEGE ESCALATION DISCOVERED • ZERO CHECKS MISSED"`. This directly contradicts the independent TerraGoat benchmark (*owner-stated, unverified: 1 TP / 2 FN, 9 of 11 resources unmodeled*).
3. **Auto-Repair Domain Mismatch**: The scenario depicts auto-repair rewriting AWS IAM policies (`aws_iam_policy.deployer_pass_role`), but the actual tool's auto-repair engine (*owner-stated, unverified*) supports **AWS and Azure NSG only**, NOT IAM policy generation/remediation.
4. **Missing SMT `UNKNOWN` State**: The solver status is modeled as binary (`SAT` vs `UNSATISFIABLE`). In SMT solving, Z3 can return `UNKNOWN`, and by core correctness principles (*owner-stated, unverified*), **UNKNOWN is never treated as safe**.
5. **Mobile Layout & Payload Failure**: `z3-world.tsx` lacks a mobile viewport gate (`isStaticMode = reducedMotion || mode === "light"`). Chrome CDP tracing proved that mobile 390x844 requests the full interactive canvas chunk (`1vhqw8x8s--64.js`), rendering severe node collisions and clipped text on mobile.

---

## A. BEATS
*Assessment against `/docs/11-WORLD-Z3.md` (5 beats: Vow table, graph & search, privilege-escalation path, auto-repair & proof certificate, proof panel & links).*

1. **Beat 1: Vow Table (Terraform IAM rules shown as vows)**  
   - **PARTIAL** | `src/components/worlds/z3/z3-viz-canvas.tsx:149-222`  
   - The interactive canvas hides the Vow table behind a secondary tab (`Vow Table (4)`), defaulting to the topology graph. A visitor on initial load does not see the vow table unless they click the tab. In `Z3StaticDiagram`, the table is rendered inline above the frames.

2. **Beat 2: Graph of IAM Roles & Network Edges; Z3 Chain Searches for a Path**  
   - **PARTIAL** | `src/components/worlds/z3/z3-viz-canvas.tsx:260-378` & `src/lib/worlds/z3-viz.ts:59-220`  
   - A 10-node graph connecting network, compute, and IAM roles is rendered. However, there is no actual path search animation or propagation trace; switching to Beat 2 instantaneously sets `chainLit: true`, popping the purple connector line into view without depicting an SMT search or solver progression.

3. **Beat 3: Privilege-Escalation Path Found (Checkov & TFSec Missed)**  
   - **PASS** | `src/components/worlds/z3/z3-viz-canvas.tsx:242-246, 284-287` & `src/lib/worlds/z3-viz.ts:286-299`  
   - The transitive path (`0.0.0.0/0 -> EC2 Web -> AppDeployer -> Lambda Exec -> AdministratorAccess`) lights up in purple (`#6B4EFF`), with explicit commentary explaining why static linters (Checkov/TFSec) evaluate rules in isolation and miss transitive chains.

4. **Beat 4: Auto-Repair, Chain Shatters, Proof Certificate Stamped**  
   - **PASS** | `src/components/worlds/z3/z3-viz-canvas.tsx:274-283, 381-404` & `src/lib/worlds/z3-viz.ts:304-335`  
   - Auto-repair amends Vow 3, severing the `iam:PassRole` link (rendered as a red dashed line with an animated ping indicator), collapsing the status to `UNSATISFIABLE`. Beat 4 renders an overlay card titled `[SMT_PROOF_CERTIFICATE • SHA256_VERIFIED]`.

5. **Beat 5: Proof Panel (103 Tests, Benchmark Link, Repo Link)**  
   - **PARTIAL** | `src/components/worlds/z3/z3-world.tsx:132-193` & `src/content/projects.ts:107-111`  
   - The proof panel lists verified claims citing 103 passing tests. However, `repo`, `demo`, and `benchmark` links in `projects.ts` are all `null`, rendering non-clickable `[FILL]` badges so the visitor cannot reach the repository or benchmark.

---

## B. LOGIC PROVENANCE (Most Important)
*Assessment of SAT/UNSAT results, witnesses, attack paths, constraints, and solver steps.*

1. **Classification of Visual Artifacts:**
   - **Verdict (`SAT` / `UNSATISFIABLE`)**: Classified as **(2) hand-authored frames** (`src/lib/worlds/z3-viz.ts:48, 273, 309, 327`). Hardcoded string literals in the scenario data structure.
   - **Attack Path / Witness**: Classified as **(2) hand-authored frames** (`src/lib/worlds/z3-viz.ts:59-220`). Hardcoded graph node positions and hardcoded flags (`onEscalationPath: true`, `isEscalationChain: true`).
   - **Constraints / Vows**: Classified as **(2) hand-authored frames** (`src/lib/worlds/z3-viz.ts:225-259`). 4 hand-authored illustrative rules (`vow-1` through `vow-4`).
   - **Solver Steps**: Classified as **(2) hand-authored frames** (`src/lib/worlds/z3-viz.ts:264-336`). Hardcoded `Z3_SCENARIO_STEPS` step array advanced by an integer index.
   - **Proof Certificate**: Classified as **(2) hand-authored frames** (`src/components/worlds/z3/z3-viz-canvas.tsx:381-404`). Hardcoded UI card titled `[SMT_PROOF_CERTIFICATE • SHA256_VERIFIED]` without any actual solver trace file or hash.

2. **Is Hand-Authored Content Presented as Real Solver Output?**  
   - **PARTIAL / FAIL** | `src/components/worlds/z3/z3-viz-canvas.tsx:86` vs `z3-viz-canvas.tsx:389` & `z3-static-diagram.tsx:226`  
   - The header displays `"illustrative example, not real Z3 execution"`. However, the proof certificate stamp inside Beat 4 displays `[SMT_PROOF_CERTIFICATE • SHA256_VERIFIED]` and asserts `"Proof certificate stamped with solver trace hash"`, and the static diagram footer claims `"FINDINGS: PRIVILEGE ESCALATION DISCOVERED • ZERO CHECKS MISSED"`. These present simulated mock frames as authentic cryptographic and mathematical proofs.

3. **Representation of "UNKNOWN is Never Safe":**  
   - **FAIL** | `src/lib/worlds/z3-viz.ts:48`  
   - `solverStatus` is strictly typed as `"SAT" | "UNSATISFIABLE"`. The third fundamental return state of SMT solvers — `UNKNOWN` (solver timeout, quantifier incompleteness, unsupported theory) — is completely absent. In real SMT verification (*owner-stated, unverified*), **UNKNOWN is never treated as safe**. Portraying Z3 as an infallible binary decider misrepresents formal methods in production.

4. **Factual Correctness of CIDR/IP and Rule Examples:**  
   - **FAIL / RULE LOGIC INACCURACIES** | `src/lib/worlds/z3-viz.ts:229-231, 245-248`  
     - **Vow 1 (Ingress)**: `aws_security_group_rule.ingress_all` with `cidr_blocks = ['0.0.0.0/0'], from_port = 80`. The UI models public ingress as an SMT reachability theorem. However, in the real tool (*owner-stated, unverified*), public exposure is an empirical heuristic rule, not an SMT proof.
     - **Vow 3 (Auto-Repair Domain Mismatch)**: Vow 3 repairs `aws_iam_policy.deployer_pass_role` by rewriting IAM conditions. In reality (*owner-stated, unverified*), the auto-repair engine **covers AWS and Azure NSG only**, NOT IAM policy generation/remediation.
     - **Vow 3 (Fictitious IAM Condition Syntax)**: Vow 3 defines `repairedCondition: "Action = 'iam:PassRole', Condition = { StrictBoundary: true, Target = 'arn:...:service/worker' }"`. AWS IAM does not have a condition key named `StrictBoundary`, and role restrictions on `iam:PassRole` are enforced via the `Resource` block (`Resource: "arn:aws:iam::...:role/worker"`), not a fictitious condition dictionary.

---

## C. CLAIMS
*Assessment against `/docs/03-CONTENT-BIBLE.md` and owner-stated facts (marked "owner-stated, unverified").*

1. **Claims Match `/docs/03`:**  
   - **PASS** | `src/content/projects.ts:82-103` & `src/components/worlds/z3/z3-world.tsx:140-153`  
   - The 4 claims in `projects.ts` match `/docs/03` verbatim (Z3-based reachability proofs, auto-repair engine and proof certificates, 103 passing tests, benchmark finding privilege-escalation path missed by Checkov/TFSec).

2. **Claims vs Owner-Stated Facts (*owner-stated, unverified*):**  
   - **Test Count**: Content states "103 passing tests" (matches `/docs/03`). Owner notes (*owner-stated, unverified*) report 276 tests as of 2026-10-19.
   - **"ZERO CHECKS MISSED" Claim**: `src/components/worlds/z3/z3-static-diagram.tsx:226` displays `"FINDINGS: PRIVILEGE ESCALATION DISCOVERED • ZERO CHECKS MISSED"`. **FAIL**. This claim is false: on the independent TerraGoat benchmark (*owner-stated, unverified*), the tool achieved **1 TP / 2 FN** (2 false negatives missed!).
   - **Missing Limitation Disclosures**:
     - No mention that the AWS+Azure 1.0/1.0 benchmark was evaluated on a hand-labeled corpus that the author tuned against (*owner-stated, unverified*).
     - No mention that 9 of 11 TerraGoat resources were unmodeled (*owner-stated, unverified*).
     - No mention that on TerraGoat GCP, 5 files were UNRESOLVABLE (*owner-stated, unverified*).
     - No mention that the GCP corpus is hand-authored and NOT a benchmark (*owner-stated, unverified*).
     - No mention that the public-exposure check is a rule, not an SMT proof (*owner-stated, unverified*).

3. **Throughput / Latency / "Production-Ready" Wording:**  
   - **PASS** | `src/components/worlds/z3/` & `src/lib/worlds/z3-viz.ts`  
   - Zero occurrences of "production-ready", "sub-millisecond", "unbounded throughput", or "proves all" exist in the Z3 world code.

4. **Honesty Notice:**  
   - **PASS** | `src/components/worlds/z3/z3-viz-canvas.tsx:86` & `src/components/worlds/z3/z3-static-diagram.tsx:84`  
   - `"illustrative example, not real Z3 execution"` is prominently rendered.

---

## D. STATIC FALLBACK
*Assessment of reduced-motion, light-mode, and mobile fallbacks.*

1. **Reduced Motion & Light Mode:**  
   - **PASS** | `src/components/worlds/z3/z3-world.tsx:65, 124-129` & `src/components/worlds/z3/z3-static-diagram.tsx:64-231`  
   - `const isStaticMode = reducedMotion || mode === "light";` correctly mounts `Z3StaticDiagram` in place of the dynamic canvas.

2. **Mobile (< 640px) Fallback Selection:**  
   - **FAIL** | `src/components/worlds/z3/z3-world.tsx:65`  
   - `isStaticMode` does not check viewport width (`window.innerWidth < 640` or media query). Mobile viewports (390x844) load the dynamic interactive canvas, resulting in severe layout clipping and overlapping node cards.

3. **Content Parity:**  
   - **PASS** | `src/components/worlds/z3/z3-static-diagram.tsx:88-207`  
   - All 4 scenario steps, all 4 vow rules, and all status badges are represented in the static diagram with full titles, captions, and details.

---

## E. INTERACTION
*Assessment of user interactivity and accessibility.*

1. **Visitor Capabilities:**  
   - **PARTIAL** | `src/components/worlds/z3/z3-viz-canvas.tsx:94-145`  
   - The visitor can jump across Beats 1 to 4 via buttons, toggle between "Topology Graph" and "Vow Table (4)" tabs, and toggle "▶ Play Sequence" / "❚❚ Pause" (4.0s auto-advance).
   - The visitor CANNOT edit constraints, add custom IAM policies, trigger solver executions, or test edge-case reachability queries interactively.

2. **Keyboard Path & ARIA Labels:**  
   - **PASS** | `src/components/worlds/z3/z3-viz-canvas.tsx:72, 95-108, 116-135`  
   - Canvas wrapper has `role="region"` and `aria-label="Interactive Z3 SMT Reachability & Nen Vows Visualizer"`. Step buttons have descriptive `aria-label="Jump to Beat X: ..."`.

---

## F. LOOK & FEEL (Screenshots & Visual Evidence)
*Captured via Chrome CDP at 1440x900 (Desktop) and 390x844 (Mobile) into `docs/proofs/screens/`. Every screenshot was opened and inspected directly.*

### Screenshot Observations:
1. `docs/proofs/screens/z3-desktop-beat1.png`:
   - I saw the initial 10-node IAM/network topology graph with 'SAT' status, red Attacker Entry on the left, purple AdministratorAccess on the right, dark emerald Z3 wall tint radiating behind the window, and uncostumed corner Biyoo with sound permission dialog.
2. `docs/proofs/screens/z3-desktop-beat2.png`:
   - I saw the transitive privilege-escalation path highlighted across the graph with a solid purple connector line linking the attacker entry, EC2, AppDeployer, and Lambda roles to AdministratorAccess under 'SAT' solver status, against the emerald wall tint.
3. `docs/proofs/screens/z3-desktop-beat3.png`:
   - I saw the auto-repair collapse state displaying an emerald 'UNSATISFIABLE' status badge with the critical iam:PassRole connector line severed into a red dashed broken link between AppDeployer and Lambda.
4. `docs/proofs/screens/z3-desktop-beat4.png`:
   - I saw the emerald modal dialog overlay displaying a simulated 'SMT_PROOF_CERTIFICATE • SHA256_VERIFIED' stamp certifying zero privilege escalation paths with '103 PASSING' tests over the blurred topology graph.
5. `docs/proofs/screens/z3-mobile-beat1.png`:
   - I saw the dynamic canvas erroneously rendered on a 390px mobile viewport with severe layout clipping: the Attacker Entry node clipped on the left screen edge and AdministratorAccess overlapping directly on top of Lambda Exec Role.
6. `docs/proofs/screens/z3-mobile-beat2.png`:
   - I saw Beat 2 on mobile with the purple escalation chain traversing collided and overlapping node cards, while the sound prompt partially obstructed the bottom narration.
7. `docs/proofs/screens/z3-mobile-beat3.png`:
   - I saw Beat 3 on mobile showing the severed red dashed line amidst squeezed, overlapping IAM node boxes and the 'UNSATISFIABLE' badge wrapped tightly.
8. `docs/proofs/screens/z3-mobile-beat4.png`:
   - I saw Beat 4 on mobile where the proof certificate card filled the 390px viewport, obscuring the graph and partially cut off at the bottom by the sound banner.

### Wall Tint & Biyoo Costume State:
- **Wall Tint:** **PASS** | `src/content/walls.ts:93-99, 124`  
  - `#iac-verifier` triggers `'z3'` living wall tint (`#1FA37A` emerald and `#6B4EFF` violet) via `SECTION_TINT_MAP['iac-verifier'] === 'z3'`.
- **Biyoo Costume:** **FAIL** | `src/components/worlds/z3/z3-world.tsx:50` & `src/components/biyoo/biyoo-character.tsx:68`  
  - While `costume: "chain bracelet"` is configured in `projects.ts`, `z3-world.tsx` never dispatches the `biyoo:costume` event, and `biyoo-character.tsx:68` explicitly voids costume props (`void (overrideCostume ?? costume ...)`), preventing costumes from rendering over real art.

---

## G. PERFORMANCE
*Measured on production server (`http://localhost:3000/`) with strict 60s idle waits between runs.*

### 1. Mobile Lighthouse (3 runs on `/`, 60s idle delay)
- Run 1: Perf=79, A11y=100, BP=96, SEO=100, LCP=4583 ms, CLS=0.000, TBT=260 ms
- Run 2: Perf=78, A11y=100, BP=96, SEO=100, LCP=4606 ms, CLS=0.000, TBT=286 ms
- Run 3: Perf=80, A11y=100, BP=96, SEO=100, LCP=4540 ms, CLS=0.000, TBT=220 ms
- **Medians:**
  - **Performance:** **79** (B-1c baseline 79 -> **PASS**)
  - **Accessibility:** **100**
  - **Best Practices:** **96**
  - **SEO:** **100**
  - **LCP:** **4583 ms (4.58s)**
  - **Total Blocking Time (TBT):** **260 ms**
  - **Cumulative Layout Shift (CLS):** **0.000**

### 2. Throttled Mobile Scroll FPS (4x CPU throttling, 390x844 viewport, 3 runs through `#iac-verifier`, 60s idle delay)
- Run 1: 58.9 FPS (avg frame: 16.99 ms, total frames: 258, >20ms: 3, >33ms: 2)
- Run 2: 58.7 FPS (avg frame: 17.05 ms, total frames: 261, >20ms: 5, >33ms: 5)
- Run 3: 59.1 FPS (avg frame: 16.92 ms, total frames: 258, >20ms: 3, >33ms: 3)
- **Median Mobile Scroll FPS:** **58.9 FPS** (Floor Target: >= 50.0 FPS -> **PASS**)

### 3. Desktop Unthrottled Scroll FPS (1440x900 viewport, 3 runs through `#iac-verifier`, 60s idle delay)
- Run 1: 59.7 FPS (avg frame: 16.75 ms, total frames: 202, >20ms: 1, >33ms: 1)
- Run 2: 59.4 FPS (avg frame: 16.83 ms, total frames: 202, >20ms: 2, >33ms: 1)
- Run 3: 58.8 FPS (avg frame: 17.00 ms, total frames: 198, >20ms: 3, >33ms: 3)
- **Median Desktop Scroll FPS:** **59.4 FPS**

### 4. JS Chunk Payload Audit (`docs/proofs/z3-chunk-trace.json`)
- **Mobile 390x844 Total JS Chunks**: 21
- **Mobile Canvas Chunk Requested**: `true` (`1vhqw8x8s--64.js` containing `Z3VizCanvas`) -> **FAIL** (Mobile must NOT load the canvas chunk)
- **Desktop 1440x900 Total JS Chunks**: 22
- **Desktop Canvas Chunk Requested**: `true` (`1vhqw8x8s--64.js`) -> positive control

---

## H. REAL ARTIFACTS & LINKS
*Assessment of project links in `src/content/projects.ts`.*

1. **Repository Link:**  
   - **FAIL** | `src/content/projects.ts:108`  
   - `repo: null`, rendering a visible `[FILL]` badge in the proof panel.  
   - *Owner-stated fact (unverified)*: `https://github.com/SumitMahajan11/iac-verifier`.

2. **Demo Link:**  
   - **FAIL** | `src/content/projects.ts:109`  
   - `demo: null`, rendering a visible `[FILL]` badge.

3. **Benchmark Link:**  
   - **FAIL** | `src/content/projects.ts:110`  
   - `benchmark: null`, rendering a visible `[FILL]` badge.

4. **Visitor Reachability:**  
   - A visitor viewing `#iac-verifier` has zero links to explore the Python/Z3 source code, test suite, or benchmark data.

---

## Ranked Fix List

### P0 (Accuracy, Soundness & Truthfulness)
1. **Remove False Claim "ZERO CHECKS MISSED" (`src/components/worlds/z3/z3-static-diagram.tsx:226`)**  
   The banner text `"FINDINGS: PRIVILEGE ESCALATION DISCOVERED • ZERO CHECKS MISSED"` is false. On the independent TerraGoat benchmark (*owner-stated, unverified*), the real tool achieved 1 TP / 2 FN (2 false negatives missed) and 9 of 11 TerraGoat resources were unmodeled.
2. **Correct Auto-Repair Scope Mismatch (`src/lib/worlds/z3-viz.ts:245-250`)**  
   The scenario depicts auto-repair rewriting AWS IAM policies (`aws_iam_policy.deployer_pass_role`). In reality (*owner-stated, unverified*), the auto-repair engine only supports AWS and Azure NSG (Network Security Groups), NOT IAM policies.
3. **Represent "UNKNOWN is Never Safe" (`src/lib/worlds/z3-viz.ts:48`)**  
   The solver is modeled as a binary oracle (`SAT` vs `UNSATISFIABLE`). In SMT solving, Z3 can return `UNKNOWN` (timeouts, quantifier incompleteness), and by core verification principles (*owner-stated, unverified*), UNKNOWN is never treated as safe.
4. **Clarify Public-Exposure Check as Rule, Not Proof (`src/lib/worlds/z3-viz.ts:228-232`)**  
   Vow 1 models public ingress as an SMT reachability theorem, whereas in the actual tool (*owner-stated, unverified*), public exposure is checked via an empirical rule rather than an SMT solver query.
5. **Correct Fictitious AWS IAM Condition Syntax (`src/lib/worlds/z3-viz.ts:247`)**  
   `StrictBoundary: true, Target = ...` are fictitious condition keys. IAM condition keys must use valid AWS syntax (e.g. `iam:PassedToService`), and role scoping is specified via `Resource`.
6. **Disclose Benchmark Limitations & Provenance**  
   Transparently state the limitations from owner notes (*owner-stated, unverified*): hand-labeled tuned corpus for the 1.0/1.0 score, TerraGoat 1 TP / 2 FN, 9 of 11 unmodeled resources, and GCP 5 unresolvable files.

### P1 (Mobile Responsiveness & Chunk Gating)
1. **Gate Dynamic Canvas on Mobile (`src/components/worlds/z3/z3-world.tsx:65`)**  
   Add a media-query / viewport width gate (`useSyncExternalStore` or CSS display gate) so mobile viewports (< 640px) render `Z3StaticDiagram` and never request the dynamic canvas chunk.
2. **Fix Mobile Node Collisions in Dynamic Canvas (`src/components/worlds/z3/z3-viz-canvas.tsx:350-377`)**  
   If canvas is rendered, percentage-based positioning causes severe node collisions on narrow screens (e.g. `AdministratorAccess` directly atop `Lambda Exec Role`).
3. **Wire Biyoo Costume Dispatch (`src/components/worlds/z3/z3-world.tsx:50`)**  
   Emit `biyoo:costume` with `"chain bracelet"` upon entering `#iac-verifier`.
4. **Enable Costume Rendering in Character Component (`src/components/biyoo/biyoo-character.tsx:68`)**  
   Remove the `void` expression suppressing costume layers in `biyoo-character.tsx`.

### P2 (Content & Link Placeholders)
1. **Populate Real Repository Link (`src/content/projects.ts:108`)**  
   Replace `null` with `https://github.com/SumitMahajan11/iac-verifier` (*owner-stated, unverified*).
2. **Harmonize Test Count Across Docs**  
   Note the discrepancy between 103 tests in `/docs/03` and 276 tests reported in owner notes (*owner-stated, unverified*).
