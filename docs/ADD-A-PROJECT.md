# Playbook: How to Add a Project (Task P7-1)

This playbook establishes the exact steps, file locations, and verification rules required to safely and quickly add a new **Scenario World** (flagship project) or **Side Quest** (sub-scenario) to the portfolio.

---

## 1. The Evidence Rule

Every project added to this portfolio must adhere to the **Truth Protocol** established in [`docs/03-CONTENT-BIBLE.md`](file:///c:/Sumit%20Portfolio/docs/03-CONTENT-BIBLE.md):

1. **Verified Claims Only**:
   - Every claim in `claims` must have `evidence: 'verified'` and a concrete `source` pointing to a specific line in `docs/03-CONTENT-BIBLE.md` or a primary artifact (e.g. `README`, commit hash, test suite).
   - Any claim without a source or marked `unverified` will cause `npm run check:content` to **FAIL**.
2. **Flagship Repository Link**:
   - Flagship Scenario worlds must have a valid, non-null, publicly accessible repository URL.
   - Flagships with `repo: null` or `[FILL]` are rejected by automated content checks.
3. **Engineering Limits Line**:
   - Every project that presents technical claims must include at least one honest limitation line in its `limits` array (e.g. test environment constraints, single-node limits, known edge cases, or what the project does *not* claim to solve).
4. **No Inflated Language**:
   - Skills and project copy strictly forbid grading terms or buzzwords: `%`, `level`, `expert`, `master`, `advanced`, `beginner`, `ninja`, `guru`, `rockstar`, `world-class`, `passionate`, or `cutting-edge`.

---

## 2. What to Do When Evidence is Missing: HIDE IT

If a project is in progress, lacks a public repository, or has unverified performance claims:
> [!IMPORTANT]
> **Rule of Thumb: When in doubt, hide it.**
> - Set `published: false` in [`src/content/projects.ts`](file:///c:/Sumit%20Portfolio/src/content/projects.ts).
> - For concept side quests, mark `inDesign: true` and omit unverified numeric claims.
> - Never deploy unverified numbers, speculative benchmarks, or placeholder repos to production.

---

## 3. Step-by-Step: Adding a Side Quest

Adding a Side Quest (sub-scenario) takes ~5 minutes and does not require building custom interactive canvas scenes.

### Step 1: Update the Content Bible
Add the project facts and limits to [`docs/03-CONTENT-BIBLE.md`](file:///c:/Sumit%20Portfolio/docs/03-CONTENT-BIBLE.md) under `## Side Quests`.
```markdown
## Side Quests
- My-New-Tool (Distributed tracing agent for Go microservices) [VERIFIED]
  - Limits: Tested up to 10 nodes locally; does not support UDP telemetry yet.
  - Repo: https://github.com/SumitMahajan11/my-new-tool
```

### Step 2: Copy the Template
Open [`src/content/templates/project.template.ts`](file:///c:/Sumit%20Portfolio/src/content/templates/project.template.ts) and copy `sideQuestTemplate`.

### Step 3: Append to `src/content/projects.ts`
Add the populated object to `projects` in [`src/content/projects.ts`](file:///c:/Sumit%20Portfolio/src/content/projects.ts):
```ts
{
  id: "my-new-tool",
  title: "My New Tool",
  status: "sidequest",
  world: "sidequest",
  oneLiner: "Distributed tracing agent for Go microservices.",
  claims: [
    {
      text: "Distributed tracing agent for Go microservices.",
      evidence: "verified",
      source: "docs/03-CONTENT-BIBLE.md",
    },
  ],
  limits: [
    "Tested up to 10 nodes locally; does not support UDP telemetry yet.",
  ],
  links: {
    repo: "https://github.com/SumitMahajan11/my-new-tool",
    demo: null,
    benchmark: null,
  },
  costume: "leaf headband",
  bullets: {
    problem: "High overhead in stock tracing daemons.",
    built: "Zero-alloc eBPF event ring buffer.",
    learned: "Kernel-to-userspace buffer sizing tradeoffs under sustained load.",
  },
  published: true,
}
```

### Step 4: Link Skills in `src/content/skills.ts`
Link the project to the skills it proves by adding the project id to `proofProjectIds` in [`src/content/skills.ts`](file:///c:/Sumit%20Portfolio/src/content/skills.ts):
```ts
{
  name: "Go",
  story: "Built low-latency eBPF event ring buffers.",
  proofProjectIds: ["my-new-tool"],
}
```

### Step 5: Verify
Run the content validator:
```bash
npm run check:content
```

---

## 4. Step-by-Step: Adding a Flagship Scenario World

Flagship projects represent major interactive acts on the homepage and require an interactive world stage.

### Step 1: Update the Content Bible
Document verified claims, model-checking results, test counts, demo links, and limits in [`docs/03-CONTENT-BIBLE.md`](file:///c:/Sumit%20Portfolio/docs/03-CONTENT-BIBLE.md).

### Step 2: Add to `src/content/types.ts`
Add the new world key to the `World` union type:
```ts
export type World = 'edge-cloud' | 'raft' | 'z3' | 'backtrace' | 'my-world' | 'sidequest';
```

### Step 3: Register in `src/content/projects.ts`
Add the project entry with `status: "flagship"` and `world: "my-world"`.

### Step 4: Build World Component
Create the interactive world component directory:
`src/components/worlds/my-world/`
- Component: `MyWorld.tsx`
- Network diagram / interactive state visualizer
- Clean accessibility fallbacks and keyboard focus rings

### Step 5: Mount in Home Page & Scenario Select
1. Add dynamic import in [`src/components/home/deferred-worlds.tsx`](file:///c:/Sumit%20Portfolio/src/components/home/deferred-worlds.tsx).
2. Add scenario card in [`src/components/scenario-select/scenario-data.ts`](file:///c:/Sumit%20Portfolio/src/components/scenario-select/scenario-data.ts).
3. If Biyoo has a custom costume for this world, register it in [`src/components/biyoo/costume-registry.tsx`](file:///c:/Sumit%20Portfolio/src/components/biyoo/costume-registry.tsx).

### Step 6: Verify Content and Build
```bash
npm run check:content
npm run build
npm run smoke -- --skip-lighthouse
```

---

## 5. Verification Gate Summary

Before opening a pull request or pushing to `main`, ensure:
1. `npm run check:content` exits `0` with 0 fatal errors.
2. No `[FILL]` or `[VERIFY]` strings exist in published content files.
3. Every claim has a non-null `source` line.
4. Flagships have non-null, valid repository links.
5. All skills reference valid existing project IDs.

