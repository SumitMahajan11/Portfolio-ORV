# Raft World Read-Only Audit (`raft-R0: world audit`)

**Audit Date:** 2026-11-08  
**Scope:** `src/components/worlds/raft/`, `src/lib/worlds/raft-viz.ts`, `src/content/projects.ts` (ratify entry), `src/app/page.tsx`, `src/components/home/deferred-worlds.tsx`, `/docs/03-CONTENT-BIBLE.md`, `/docs/10-WORLD-RAFT.md`.  
**Rules Checked:** Strict read-only audit. No source files modified.

---

## A. BEATS
*Assessment against `/docs/10-WORLD-RAFT.md` (5 beats in order: 3-node village, normal era with heartbeats and scrolls, leader failure + election, partition + heal, proof panel).*

1. **Beat 1: Village of 3 Nodes (Initial Setup)**  
   - **PASS** | `src/components/worlds/raft/raft-world.tsx:90-111` & `src/lib/worlds/raft-viz.ts:72-123`  
   - 3-node village (Nodes 1, 2, 3) is established in Step 0 within the System Window scenario container.

2. **Beat 2: Normal Era (Heartbeats & Log Scrolls)**  
   - **PASS** | `src/lib/worlds/raft-viz.ts:73-123`  
   - Heartbeat signal flares (`Node 1 -> Node 2`, `Node 1 -> Node 3`) and Scroll #1 replication are present in Step 0.

3. **Beat 3: Leader Failure + Election**  
   - **PARTIAL** | `src/lib/worlds/raft-viz.ts:128-238`  
   - Present as Step 1 (crash) and Step 2 (election), but skips the candidate state and jumps directly from follower to leader without candidate election animation.

4. **Beat 4: Network Partition + Healing**  
   - **PARTIAL** | `src/lib/worlds/raft-viz.ts:243-373`  
   - Partition and healing are present (Steps 3 & 4), but the partition wall is visually rendered between Node 1 and Node 2 despite Node 2 being the isolated minority, and Node 1 magically revives possessing term 2 logs.

5. **Beat 5: Proof Panel & Mandatory Limitation Line**  
   - **PARTIAL** | `src/components/worlds/raft/raft-world.tsx:133-205`  
   - Proof panel is present with TLA+, Porcupine, 4 bug classes, 68 tests, UCB1 fuzzer +32.36%, and mandatory limit line, but recorded demo link is `null` rendering a `[FILL]` badge rather than an embed/link.

---

## B. RAFT ACCURACY (State Logic, Not Visuals)
*Assessment of consensus logic in `src/lib/worlds/raft-viz.ts` and `src/components/worlds/raft/raft-viz-canvas.tsx`.*

1. **One leader per term**  
   - **PASS** | `src/lib/worlds/raft-viz.ts:409-439`  
   - Verified across all steps: Term 1 has Leader Node 1, Term 2 has Leader Node 2, Term 3 has Leader Node 3.

2. **Election needs a majority (2 of 3)**  
   - **PASS** | `src/lib/worlds/raft-viz.ts:188, 217, 298`  
   - Step 2 (`votesReceived: [2, 3]`) and Step 3 (`votesReceived: [1, 3]`) require and verify 2 of 3 votes.

3. **Candidate increments term**  
   - **FAIL** | `src/lib/worlds/raft-viz.ts:182-238`  
   - Code never sets or transitions to `role: "candidate"`; followers jump directly to `role: "leader"`.

4. **A node votes at most once per term**  
   - **FAIL** | `src/lib/worlds/raft-viz.ts:156-157`  
   - In Step 1, Node 2's `votedFor` is reset to `null` while remaining in Term 1, violating Raft Figure 2 persistent state rules.

5. **The new leader's term is strictly higher**  
   - **PASS** | `src/lib/worlds/raft-viz.ts:490-506`  
   - Leader terms advance strictly: Term 1 -> Term 2 -> Term 3.

6. **In a partition, 1-node minority cannot elect and 2-node majority can**  
   - **PASS** | `src/lib/worlds/raft-viz.ts:253-300`  
   - Minority Node 2 has 1 vote (< 2 majority required), while majority partition (Nodes 1 & 3) holds 2 votes and elects Node 3.

7. **On heal, a stale lower-term leader steps down**  
   - **PARTIAL** | `src/lib/worlds/raft-viz.ts:341-343`  
   - Stale Leader Node 2 steps down to follower adopting Term 3, but state incorrectly sets `votedFor: 3` without an election having occurred in that partition.

8. **Commit requires majority replication**  
   - **FAIL** | `src/lib/worlds/raft-viz.ts:19-23, 27-35`  
   - The code ignores commit indices entirely; `RaftNodeState` lacks `commitIndex` / `lastApplied`, and entries lack uncommitted vs committed state.

9. **Log Matching & Crash Recovery**  
   - **FAIL** | `src/lib/worlds/raft-viz.ts:262-266`  
   - Dead Node 1 from Step 2 magically resurrects in Step 3 already possessing Scroll #2 (replicated in Term 2 by Node 2 while Node 1 was dead and while Node 2 is partitioned).

---

## C. CLAIMS
*Assessment against `/docs/03-CONTENT-BIBLE.md` and live repo `https://github.com/SumitMahajan11/Ratify`.*

1. **Claims Match `/docs/03`**  
   - **PASS** | `src/content/projects.ts:27-66` & `src/components/worlds/raft/raft-world.tsx:142-165`  
   - All 7 claims (from-scratch Rust, TLA+ model checked, Porcupine + Wing & Gong, 4 bug classes, 68 tests, UCB1 fuzzer +32.36%, recorded demo) match `/docs/03` verbatim.

2. **No Throughput / Latency / "Production-Ready" Wording**  
   - **PASS** | `src/components/worlds/raft/raft-world.tsx:1-235` & `src/lib/worlds/raft-viz.ts:1-562`  
   - Zero occurrences of "throughput", "latency", or "production-ready" exist in the Raft codebase.

3. **Mandatory Limit Callout**  
   - **PASS** | `src/components/worlds/raft/raft-world.tsx:142-144`  
   - Prominently rendered in a callout box under `⚠ MANDATORY LIMITATION NOTICE`: `"3-node, correctness project, not a performance benchmark."`

4. **Live Repo & Artifact Access**  
   - **PARTIAL** | `src/content/projects.ts:68-69`  
   - Cannot access `https://github.com/SumitMahajan11/Ratify` directly via local environment network/fetch (fetch failed), and web search returned no publicly accessible repository by that exact name (consistent with `/docs/03` line 26: `Repo link: [FILL]`).

---

## D. STATIC FALLBACK
*Assessment of reduced-motion, light-mode, and mobile fallbacks.*

1. **Static Fallback Exists for Reduced Motion & Light Mode**  
   - **PASS** | `src/components/worlds/raft/raft-world.tsx:66, 125-129` & `src/components/worlds/raft/raft-static-diagram.tsx:160-277`  
   - `isStaticMode = reducedMotion || mode === "light"` cleanly mounts `RaftStaticDiagram` instead of the dynamic canvas.

2. **Static Fallback on Mobile**  
   - **PARTIAL** | `src/components/worlds/raft/raft-world.tsx:66`  
   - Standard mobile loads `DynamicRaftVizCanvas` (which has severe layout clipping) rather than `RaftStaticDiagram`.

3. **Content Parity**  
   - **PASS** | `src/components/worlds/raft/raft-static-diagram.tsx:182-252`  
   - `RaftStaticDiagram` maps all 5 frames from `RAFT_SCENARIO_STEPS` with identical titles, terms, captions, details, node roles, and flares.

---

## E. INTERACTION
*Assessment of user interactivity, failure injection, and keyboard navigation.*

1. **Visitor Capabilities**  
   - **PARTIAL** | `src/components/worlds/raft/raft-viz-canvas.tsx:94-118`  
   - Visitor can step through Beats 1 to 5 using tab buttons and toggle "▶ Play Sequence" / "❚❚ Pause" (3.5s auto-advance). Visitor CANNOT crash nodes, trigger partitions, or heal the network interactively.

2. **Keyboard Path & ARIA Labels**  
   - **PASS** | `src/components/worlds/raft/raft-viz-canvas.tsx:72, 95-107, 112-118`  
   - Region has `role="region" aria-label="Interactive Deterministic Raft Visualizer"`, and step buttons are standard focusable `<button>` elements with `aria-label="Jump to Beat X: ..."`.

---

## F. LOOK & FEEL (Screenshots & Visual Evidence)
*Captured via Chrome CDP at 1440x900 (Desktop) and 390x844 (Mobile) into `docs/proofs/screens/`.*

### Screenshot Observations:
1. `docs/proofs/screens/raft-desktop-beat1.png`:
   - I saw the 3-node village with Node 1 as Hokage, warm amber `#F28C28` wall tint radiating behind the cards, two heartbeat signal flares, and the fixed corner Biyoo button without any headband costume.
2. `docs/proofs/screens/raft-desktop-beat2.png`:
   - I saw Node 1 dimmed with an X_X fallen expression and gray crashed status, Nodes 2 and 3 showing alert expressions, the flare container reporting heartbeat silence, and warm amber wall tint with no Biyoo costume.
3. `docs/proofs/screens/raft-desktop-beat3.png`:
   - I saw Node 2 wearing the orange Hokage crown with a 2/3 quorum pill, Scroll #2 replication flare travelling to Node 3, and amber wall tint with no Biyoo headband costume.
4. `docs/proofs/screens/raft-desktop-beat4.png`:
   - I saw a red vertical partition laser wall drawn between Node 1 and Node 2, while Node 2 held a minority badge and signal flares erroneously crossed the laser wall to Node 1, against the amber wall tint.
5. `docs/proofs/screens/raft-desktop-beat5.png`:
   - I saw the partition laser wall removed, Node 3 reigning as Hokage with 3/3 votes, Node 2 stepped down to follower with all 3 scrolls synchronized, and the amber wall tint with uncostumed corner Biyoo.
6. `docs/proofs/screens/raft-mobile-beat1.png`:
   - I saw the 3 nodes horizontally compressed on the 390px viewport with Node 1's quorum pill cut off at the bottom, bottom flares clipped outside the stage box, and the sound permission prompt obscuring the proof panel.
7. `docs/proofs/screens/raft-mobile-beat2.png`:
   - I saw the crashed Node 1 and alert followers on mobile with the heartbeat silence message sliced horizontally in half by the bottom boundary.
8. `docs/proofs/screens/raft-mobile-beat3.png`:
   - I saw Node 2 crowned Hokage with its quorum pill partially clipped at the bottom and all signal flares pushed entirely outside the visible container on mobile.
9. `docs/proofs/screens/raft-mobile-beat4.png`:
   - I saw the red partition wall badge overlapping directly on top of Node 1, scrolls overlapping horizontally, and Node 3's quorum pill clipped on the right.
10. `docs/proofs/screens/raft-mobile-beat5.png`:
    - I saw Node 3 pushed almost completely outside the right edge of the mobile screen with only an orange sliver visible, rendering the layout broken on mobile.

### Wall Tint & Biyoo Costume State:
- **Wall Tint:** **PASS** | `src/content/walls.ts:86-92, 123`  
  - `#ratify` correctly triggers the `'raft'` living wall tint (`#F28C28` and `#F1E4C3`) via `SECTION_TINT_MAP['ratify'] === 'raft'`.
- **Biyoo Costume:** **FAIL** | `src/components/worlds/raft/raft-world.tsx:51` & `src/components/biyoo/biyoo-character.tsx:68`  
  - `raft-world.tsx` never dispatches `biyoo:costume`, companion Biyoo is not in the viewport, and `biyoo-character.tsx:68` explicitly voids costume props (`void (overrideCostume ?? costume ...)`), preventing costumes from rendering over real art.

---

## G. PERFORMANCE
*Measured on production build (`http://localhost:3000/#ratify`) with 60s idle waits between runs.*

### 1. Mobile Lighthouse (3 runs on `#ratify`, 60s idle delay)
- Run 1: Perf=79, A11y=100, BP=96, SEO=100, LCP=4581 ms, TBT=263 ms, CLS=0.000
- Run 2: Perf=78, A11y=100, BP=96, SEO=100, LCP=4639 ms, TBT=277 ms, CLS=0.000
- Run 3: Perf=73, A11y=100, BP=96, SEO=100, LCP=4793 ms, TBT=368 ms, CLS=0.000
- **Medians:**
  - **Performance:** **78**
  - **Accessibility:** **100**
  - **Best Practices:** **96**
  - **SEO:** **100**
  - **Simulated LCP:** **4639 ms**
  - **Total Blocking Time (TBT):** **277 ms**
  - **Cumulative Layout Shift (CLS):** **0.000**

### 2. Throttled Mobile Scroll FPS (4x CPU throttling, 390x844 viewport, 3 runs through `#ratify`, 60s idle delay)
- Run 1: 59.0 FPS (avg frame: 16.95 ms, total frames: 233, >20ms: 3, >33ms: 3)
- Run 2: 58.3 FPS (avg frame: 17.16 ms, total frames: 237, >20ms: 5, >33ms: 4)
- Run 3: 59.0 FPS (avg frame: 16.95 ms, total frames: 234, >20ms: 3, >33ms: 2)
- **Median Scroll FPS:** **59.0 FPS** (Floor Target: >= 50.0 FPS -> **PASS**)

---

## Ranked Fix List

### P0 (Wrong Raft Behavior or Broken Core Invariants)
1. **Partition Wall Placement & Geometry Bug (`src/components/worlds/raft/raft-viz-canvas.tsx:186`)**  
   The partition wall is placed at `left-1/3` (between Node 1 and Node 2) while Node 2 is labeled as the isolated minority. This visually strands Node 1 alone on the left and causes signal flares from Node 3 to Node 1 to fly straight through the red laser wall. The layout must isolate Node 2 on the minority side.
2. **Magical Log Resurrect Bug (`src/lib/worlds/raft-viz.ts:256-270`)**  
   Node 1 was crashed in Step 2 but wakes up in Step 3 already possessing Scroll #2 (which was replicated in Term 2 by Node 2 while Node 1 was dead and while Node 2 was partitioned away).
3. **Persistent `votedFor` Invalidation Bug (`src/lib/worlds/raft-viz.ts:156-157`)**  
   Node 2's `votedFor` is reset to `null` while remaining in Term 1, violating Raft persistent state invariants (`votedFor` must not be cleared within the same term).
4. **Missing Candidate State (`src/lib/worlds/raft-viz.ts:182-238`)**  
   The code defines `RaftRole = "candidate"` but never uses it. Followers transition directly to Leader without ever entering the Candidate role.
5. **Absence of Log Commitment Tracking (`src/lib/worlds/raft-viz.ts:19-23`)**  
   The model does not track `commitIndex` or distinguish uncommitted entries from committed entries; entries are treated as committed immediately upon receipt.

### P1 (Broken Mobile Layout & Missing Costume)
1. **Mobile Canvas Layout & Overflow Clipping (`src/components/worlds/raft/raft-viz-canvas.tsx:170, 199-247`)**  
   The fixed aspect ratio (`aspect-[640/360]`) with `overflow-hidden` causes severe clipping on 390px screens: Node 3 is clipped off the right screen edge in Beat 5, quorum badges are cut off at the bottom, and signal flares are pushed completely outside the box.
2. **Missing Biyoo Costume Dispatch (`src/components/worlds/raft/raft-world.tsx:51`)**  
   `costume: "leaf headband"` is declared on the project object but never dispatched via `biyoo:costume` when entering or mounting `#ratify`.
3. **Costume Rendering Disabled on Real Art (`src/components/biyoo/biyoo-character.tsx:68`)**  
   Costume props are voided in `biyoo-character.tsx` (`void (overrideCostume ?? costume ...)`), preventing Biyoo from wearing any costume overlay on the real art stack.
4. **Lack of Failure Injection Interactivity (`src/components/worlds/raft/raft-viz-canvas.tsx:94-118`)**  
   The visitor can only click numbered "Beat" buttons; there are no action buttons to directly crash the leader, induce a partition, or trigger healing.

### P2 (Content & Asset Placeholders)
1. **Missing Repository and Demo Links (`src/content/projects.ts:68-69`)**  
   `repo` and `demo` links remain `null`, rendering visible `[FILL]` badges in the proof panel.
2. **Mobile Viewport Fallback Selection (`src/components/worlds/raft/raft-world.tsx:66`)**  
   Mobile viewports (< 640px) should default to `RaftStaticDiagram` instead of the cramped dynamic canvas to avoid responsive clipping.
