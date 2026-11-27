/**
 * IaC Verifier: "Cut the chain" SMT Reachability & Chain Model
 *
 * Source: iac-verifier prototype.
 * Evaluates transitive role trust chains from outside_acct to admin_role.
 * Simulates bounded model checking (2, 3, 4 hops), CI login constraints,
 * and minimal cut sets with Z3 parity.
 */

export interface ChainNode {
  name: string;
  role: string;
  icon: string;
}

export const CHAIN_NODES: ReadonlyArray<ChainNode> = [
  { name: "outside_acct", role: "external", icon: "🌐" },
  { name: "jump_role", role: "role", icon: "🔑" },
  { name: "build_role", role: "role", icon: "🔑" },
  { name: "ops_role", role: "role", icon: "🔑" },
  { name: "admin_role", role: "AdministratorAccess", icon: "🔒" },
];

export interface ChainEdge {
  u: number;
  v: number;
  locked?: boolean;
}

export const CHAIN_EDGES: ReadonlyArray<ChainEdge> = [
  { u: 0, v: 1, locked: true }, // CI login rule (cannot be cut)
  { u: 1, v: 2 },
  { u: 2, v: 4 },
  { u: 1, v: 3 },
  { u: 3, v: 4 },
];

export const INITIAL_EDGES_STATE: ReadonlyArray<number> = [1, 1, 1, 1, 1];
export const NODE_RADIUS = 36;

export const DESKTOP_POSITIONS: ReadonlyArray<[number, number]> = [
  [80, 230],
  [290, 230],
  [510, 100],
  [510, 360],
  [720, 230],
];

export const MOBILE_POSITIONS: ReadonlyArray<[number, number]> = [
  [200, 70],
  [200, 200],
  [85, 350],
  [315, 350],
  [200, 500],
];

export const CHAIN_PALETTE = {
  bg: "#07080B",
  panel: "#0E1118",
  panel2: "#161B26",
  line: "#222735",
  text: "#F4F6FA",
  muted: "#8A91A6",
  red: "#FF3D55",
  green: "#3DDC97",
  amber: "#FF7A29",
} as const;

/**
 * Pure BFS distance computation.
 */
export function computeDistances(
  edgeState: number[],
  startNode: number,
  reverse = false
): Record<number, number> {
  const d: Record<number, number> = { [startNode]: 0 };
  const queue = [startNode];
  while (queue.length > 0) {
    const u = queue.shift()!;
    CHAIN_EDGES.forEach((edge, i) => {
      const a = reverse ? edge.v : edge.u;
      const b = reverse ? edge.u : edge.v;
      if (edgeState[i] && a === u && !(b in d)) {
        d[b] = d[u] + 1;
        queue.push(b);
      }
    });
  }
  return d;
}

export function isSafeConfig(edgeState: number[]): boolean {
  const df = computeDistances(edgeState, 0, false);
  return !(4 in df);
}

/**
 * Par calculation: minimum cuts to eliminate reachability to admin_role
 * without breaking the locked CI rule (edge 0).
 */
export function computeParAndSolution(): { par: number; solution: number[] } {
  let par = 9;
  let sol: number[] = [];
  const cuttable = [1, 2, 3, 4];
  for (let m = 1; m < 1 << 4; m++) {
    const o = [1, 1, 1, 1, 1];
    const c: number[] = [];
    cuttable.forEach((edgeIdx, bitIdx) => {
      if ((m >> bitIdx) & 1) {
        o[edgeIdx] = 0;
        c.push(edgeIdx);
      }
    });
    if (c.length < par && isSafeConfig(o)) {
      par = c.length;
      sol = c;
    }
  }
  return { par, solution: sol };
}

export interface GeneratedLink {
  x: number;
  y: number;
  width: number;
  height: number;
  dx: number;
  dy: number;
  r: number;
  delay: number;
}

export interface GeneratedEdgeLayout {
  index: number;
  a: [number, number];
  b: [number, number];
  mx: number;
  my: number;
  angle: number;
  length: number;
  ux: number;
  uy: number;
  lineX1: number;
  lineY1: number;
  lineX2: number;
  lineY2: number;
  links: GeneratedLink[];
}

// Simple deterministic PRNG for link scattering offsets
function seededPseudoRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Precomputes chain link coordinates and scatter physics deterministically.
 */
export function buildEdgeLayouts(isMobile: boolean): GeneratedEdgeLayout[] {
  const positions = isMobile ? MOBILE_POSITIONS : DESKTOP_POSITIONS;
  const rand = seededPseudoRandom(isMobile ? 1337 : 42);

  return CHAIN_EDGES.map((e, i) => {
    const a = positions[e.u];
    const b = positions[e.v];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy);
    const ux = dx / L;
    const uy = dy / L;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const s = NODE_RADIUS + 8;
    const len = L - 2 * s;
    const count = Math.max(1, Math.floor(len / 17));
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;

    const links: GeneratedLink[] = [];
    for (let j = 0; j < count; j++) {
      const t = s + ((j + 0.5) * len) / count;
      const x = a[0] + ux * t;
      const y = a[1] + uy * t;
      const isAlt = j % 2 === 1;
      const w = isAlt ? 12 : 22;
      const h = isAlt ? 7 : 12;

      links.push({
        x: Number(x.toFixed(1)),
        y: Number(y.toFixed(1)),
        width: w,
        height: h,
        dx: Number((rand() * 50 - 25).toFixed(0)),
        dy: Number((60 + rand() * 90).toFixed(0)),
        r: Number((rand() * 260 - 130).toFixed(0)),
        delay: Number((j * 0.025).toFixed(3)),
      });
    }

    return {
      index: i,
      a,
      b,
      mx: Number(mx.toFixed(1)),
      my: Number(my.toFixed(1)),
      angle: Number(angle.toFixed(1)),
      length: L,
      ux,
      uy,
      lineX1: Number((a[0] + ux * s).toFixed(1)),
      lineY1: Number((a[1] + uy * s).toFixed(1)),
      lineX2: Number((b[0] - ux * s).toFixed(1)),
      lineY2: Number((b[1] - uy * s).toFixed(1)),
      links,
    };
  });
}

/**
 * Scripted snapshots for Scroll-Driven Mode & Auto-Play sequence.
 */
export interface ScriptedChainStage {
  progress: number;
  edgeState: number[];
  bound: number;
  message: string;
  statusText: string;
  verdictType: "s" | "u" | "b";
  shakingEdge?: number;
  hintEdges?: number[];
  label: string;
}

export const SCRIPTED_CHAIN_STAGES: ScriptedChainStage[] = [
  {
    progress: 0.0,
    edgeState: [1, 1, 1, 1, 1],
    bound: 4,
    label: "Initial Breach",
    message: "Start here: cut any red chain. The 🔒 chain is needed for CI login, so it can't be cut.",
    statusText: "STATUS: BREACHED · admin in 3 hops",
    verdictType: "s",
  },
  {
    progress: 0.2,
    edgeState: [1, 1, 1, 1, 1],
    bound: 2,
    label: "Shallow Bound (2 Hops)",
    message: "Verifier only checked 2 hops deep. Escalation is masked: this is not a proof.",
    statusText: "STATUS: UNPROVEN",
    verdictType: "b",
  },
  {
    progress: 0.4,
    edgeState: [1, 1, 1, 1, 1],
    bound: 4,
    shakingEdge: 0,
    label: "Constraint Check (CI Lock)",
    message: "That rule lets CI log in. Cutting it would break the pipeline, so look for another link.",
    statusText: "STATUS: BREACHED · admin in 3 hops",
    verdictType: "s",
  },
  {
    progress: 0.6,
    edgeState: [1, 0, 1, 1, 1],
    bound: 4,
    label: "First Remediation Cut",
    message: "Cut 1 made: jump_role → build_role severed. Reachability remains active through ops_role.",
    statusText: "STATUS: BREACHED · admin in 3 hops",
    verdictType: "s",
  },
  {
    progress: 0.8,
    edgeState: [1, 0, 1, 0, 1],
    bound: 4,
    label: "Minimal Par Cut (Sealed)",
    message: "Sealed with the smallest possible fix (2 cuts). The linter was green the whole time.",
    statusText: "STATUS: SEALED",
    verdictType: "u",
  },
  {
    progress: 1.0,
    edgeState: [1, 0, 1, 0, 1],
    bound: 4,
    label: "Verified Proof",
    message: "All paths to admin_role formally sealed across all 4 hops. SMT UNSAT certificate holds.",
    statusText: "STATUS: SEALED",
    verdictType: "u",
  },
];
