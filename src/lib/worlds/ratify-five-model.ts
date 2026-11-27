/**
 * 5-Node Ratify Raft Consensus Cluster Model & Scripted Stages
 *
 * Source: Ratify: try to break consensus design prototype.
 * Full interactive 5-node cluster with cables, voting, heartbeats, logs,
 * partition walls, and safety invariant checks.
 */

export const NODE_COUNT = 5;

export interface ClusterNode {
  i: number; // 0..4 (corresponds to N1..N5)
  s: 'F' | 'C' | 'L'; // Follower | Candidate | Leader
  term: number;
  vote: number;
  votes: number;
  log: { v: number; term: number }[];
  ci: number; // commit index
  alive: boolean;
  hb: number; // heartbeat timer
  pulse: number; // leader pulse wave (0..1)
  flash: number; // write flash (0..1)
  ack: Record<number, number>; // peer acknowledgements
  tm: number; // timeout duration
  to: number; // current election timer remaining
}

export type PacketType = 'RV' | 'VOTE' | 'AE' | 'ACK';

export interface ClusterPacket {
  a: number; // sender id
  b: number; // receiver id
  type: PacketType;
  d: {
    term: number;
    li?: number;
    lt?: number;
    log?: { v: number; term: number }[];
    ci?: number;
    rej?: number;
    len?: number;
  };
  p: number; // transit progress (0..1)
  dur: number; // transit duration in seconds
  dead: boolean; // whether cable was cut
}

export interface ClusterSpark {
  x: number;
  y: number;
  l: number; // lifetime (1..0)
}

export interface SwipePoint {
  x: number;
  y: number;
  t: number;
}

export interface ClusterViolation {
  k: 'two' | 'diverge';
  term?: number;
  ids?: number[];
  slot?: number;
  a?: { v: number; t: number; id: number };
  b?: { v: number; id: number };
}

export interface RaftPosition {
  x: number;
  y: number;
  ux: number;
  uy: number;
}

export const CLUSTER_PALETTE = {
  bg: '#07080B',
  panel: '#0E1118',
  panel2: '#161B26',
  text: '#F4F6FA',
  muted: '#9AA7BD',
  cyan: '#5EE1E6',
  amber: '#FBBF24',
  red: '#F87171',
  green: '#4ADE80',
} as const;

// 46 precomputed background ambient stars [xRatio, yRatio, radius, speed]
export const PRECOMPUTED_STARS: ReadonlyArray<[number, number, number, number]> = [
  [0.12, 0.18, 1.2, 1.1],
  [0.85, 0.14, 0.9, 1.7],
  [0.23, 0.77, 1.4, 0.8],
  [0.72, 0.81, 0.8, 1.4],
  [0.45, 0.29, 1.1, 1.9],
  [0.58, 0.68, 1.3, 0.9],
  [0.34, 0.52, 0.7, 1.2],
  [0.91, 0.42, 1.5, 1.6],
  [0.08, 0.63, 1.0, 0.7],
  [0.67, 0.19, 0.8, 2.1],
  [0.19, 0.35, 1.2, 1.0],
  [0.82, 0.62, 1.1, 1.5],
  [0.51, 0.88, 0.9, 0.6],
  [0.38, 0.12, 1.4, 1.8],
  [0.76, 0.38, 0.8, 1.3],
  [0.27, 0.89, 1.2, 2.0],
  [0.62, 0.48, 1.0, 1.1],
  [0.94, 0.79, 1.3, 1.4],
  [0.04, 0.41, 0.9, 0.8],
  [0.48, 0.61, 1.1, 1.7],
  [0.15, 0.92, 0.8, 1.2],
  [0.88, 0.28, 1.4, 1.9],
  [0.31, 0.24, 1.0, 0.7],
  [0.71, 0.93, 1.2, 1.5],
  [0.55, 0.15, 0.7, 1.6],
  [0.42, 0.76, 1.3, 1.1],
  [0.65, 0.34, 0.9, 0.9],
  [0.21, 0.58, 1.1, 1.4],
  [0.83, 0.49, 1.2, 1.8],
  [0.09, 0.22, 0.8, 1.0],
  [0.96, 0.11, 1.3, 2.2],
  [0.52, 0.44, 0.7, 1.3],
  [0.37, 0.84, 1.4, 0.9],
  [0.79, 0.71, 1.0, 1.7],
  [0.16, 0.07, 1.1, 1.2],
  [0.63, 0.86, 0.8, 0.8],
  [0.29, 0.46, 1.2, 1.6],
  [0.86, 0.95, 0.9, 1.4],
  [0.47, 0.05, 1.3, 1.9],
  [0.74, 0.54, 1.1, 1.1],
  [0.02, 0.83, 0.8, 0.7],
  [0.59, 0.22, 1.0, 2.0],
  [0.92, 0.37, 1.4, 1.3],
  [0.26, 0.69, 0.7, 1.5],
  [0.69, 0.08, 1.2, 1.8],
  [0.41, 0.97, 1.0, 1.0],
];

export const cableKey = (a: number, b: number): string =>
  a < b ? `${a}-${b}` : `${b}-${a}`;

export const getQuorum = (safe: boolean): number => (safe ? 3 : 2);

// Calibrated election timeout: relaxed pace (3.5s - 7.0s)
export const getRandomElectionTimeout = (): number =>
  3.5 + Math.random() * 3.5;

// Packet transit duration: relaxed, majestic flight (0.85s)
export const PACKET_DURATION_SEC = 0.85;

// Heartbeat interval: calm pulse (1.3s)
export const HEARTBEAT_INTERVAL_SEC = 1.3;

// Auto-write interval: relaxed cadence (4.5s - 7.0s)
export const getRandomWriteInterval = (): number =>
  4.5 + Math.random() * 2.5;

export interface LiveClusterSimulationState {
  nodes: ClusterNode[];
  packets: ClusterPacket[];
  cutCables: Set<string>;
  sparks: ClusterSpark[];
  leadersByTerm: Record<number, Set<number>>;
  violation: ClusterViolation | null;
  totalChecks: number;
  autoWriteTimer: number;
  checkTimer: number;
  hintOpacity: number;
  hasInteracted: boolean;
  simTime: number;
  safeQuorum: boolean;
}

export function createInitialSimulationState(): LiveClusterSimulationState {
  return {
    nodes: createInitialCluster(),
    packets: [],
    cutCables: new Set<string>(),
    sparks: [],
    leadersByTerm: {},
    violation: null,
    totalChecks: 0,
    autoWriteTimer: 4.5,
    checkTimer: 0,
    hintOpacity: 1,
    hasInteracted: false,
    simTime: 0,
    safeQuorum: true,
  };
}

/**
 * Creates fresh initial cluster state with 5 nodes.
 */
export function createInitialCluster(): ClusterNode[] {
  return Array.from({ length: NODE_COUNT }, (_, i) => {
    const tm = getRandomElectionTimeout();
    return {
      i,
      s: 'F',
      term: 0,
      vote: -1,
      votes: 0,
      log: [],
      ci: 0,
      alive: true,
      hb: 0,
      pulse: 0,
      flash: 0,
      ack: {},
      tm,
      to: 1.0 + Math.random() * 2.0, // staggered start
    };
  });
}

/**
 * Calculates node coordinates in a circular arrangement.
 */
export function computeNodePositions(
  W: number,
  H: number,
  narrow: boolean
): RaftPosition[] {
  const R = narrow
    ? Math.min(W * 0.3, H * 0.3)
    : Math.min(W * 0.27, H * 0.3);

  return Array.from({ length: NODE_COUNT }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / NODE_COUNT;
    return {
      x: W / 2 + Math.cos(a) * R,
      y: H / 2 + Math.sin(a) * R + 4,
      ux: Math.cos(a),
      uy: Math.sin(a),
    };
  });
}

/**
 * Checks safety invariants across all committed logs in the cluster.
 */
export function auditSafetyInvariants(
  nodes: ClusterNode[]
): {
  viol: ClusterViolation | null;
  checksIncrement: number;
} {
  let checks = 0;
  const seen: Array<{ v: number; t: number; id: number } | undefined> = [];

  for (const n of nodes) {
    for (let i = 0; i < n.ci && i < n.log.length; i++) {
      checks++;
      const e = n.log[i];
      const s = seen[i];
      if (!s) {
        seen[i] = { v: e.v, t: e.term, id: n.i };
      } else if (s.v !== e.v || s.t !== e.term) {
        return {
          viol: {
            k: 'diverge',
            slot: i + 1,
            a: s,
            b: { v: e.v, id: n.i },
          },
          checksIncrement: checks,
        };
      }
    }
  }

  return { viol: null, checksIncrement: checks };
}

export function isClusterConnected(
  state: LiveClusterSimulationState,
  a: number,
  b: number
): boolean {
  return (
    Boolean(state.nodes[a]?.alive) &&
    Boolean(state.nodes[b]?.alive) &&
    !state.cutCables.has(cableKey(a, b))
  );
}

export function dispatchClusterPacket(
  state: LiveClusterSimulationState,
  a: number,
  b: number,
  type: PacketType,
  d: ClusterPacket['d']
): void {
  state.packets.push({
    a,
    b,
    type,
    d,
    p: 0,
    dur: PACKET_DURATION_SEC,
    dead: !isClusterConnected(state, a, b),
  });
}

export function becomeLeader(
  state: LiveClusterSimulationState,
  n: ClusterNode,
  onEvent?: (msg: string) => void,
  onViolation?: (v: ClusterViolation) => void
): void {
  n.s = 'L';
  n.hb = 0;
  n.ack = {};
  onEvent?.(`N${n.i + 1} became leader in term ${n.term}`);

  const s =
    state.leadersByTerm[n.term] ||
    (state.leadersByTerm[n.term] = new Set<number>());
  s.add(n.i);
  if (s.size > 1) {
    const v: ClusterViolation = { k: 'two', term: n.term, ids: Array.from(s) };
    state.violation = v;
    onViolation?.(v);
  }
}

export function startElection(
  state: LiveClusterSimulationState,
  n: ClusterNode,
  onEvent?: (msg: string) => void,
  onViolation?: (v: ClusterViolation) => void
): void {
  n.s = 'C';
  n.term++;
  n.vote = n.i;
  n.votes = 1;
  n.tm = getRandomElectionTimeout();
  n.to = n.tm;
  onEvent?.(`N${n.i + 1} timed out and called election for term ${n.term}`);

  const q = getQuorum(state.safeQuorum);
  if (n.votes >= q) {
    becomeLeader(state, n, onEvent, onViolation);
    return;
  }

  const lastTerm = n.log.length > 0 ? n.log[n.log.length - 1].term : 0;
  for (const m of state.nodes) {
    if (m.i !== n.i) {
      dispatchClusterPacket(state, n.i, m.i, 'RV', {
        term: n.term,
        li: n.log.length,
        lt: lastTerm,
      });
    }
  }
}

export function advanceCommitIndex(
  state: LiveClusterSimulationState,
  n: ClusterNode,
  onEvent?: (msg: string) => void
): void {
  const q = getQuorum(state.safeQuorum);
  for (let i = n.log.length; i > n.ci; i--) {
    let acks = 1;
    for (const k in n.ack) {
      if (n.ack[k] >= i) acks++;
    }
    if (acks >= q && n.log[i - 1].term === n.term) {
      n.ci = i;
      if (acks < 3) {
        onEvent?.(`Slot ${i} committed with only ${acks} of ${NODE_COUNT} nodes`);
      }
      break;
    }
  }
}

export function deliverClusterPacket(
  state: LiveClusterSimulationState,
  pkt: ClusterPacket,
  onEvent?: (msg: string) => void,
  onViolation?: (v: ClusterViolation) => void
): void {
  const n = state.nodes[pkt.b];
  const senderId = pkt.a;
  const d = pkt.d;
  if (!n || !n.alive) return;

  if (d.term > n.term) {
    n.term = d.term;
    n.vote = -1;
    n.s = 'F';
  }

  const q = getQuorum(state.safeQuorum);
  const myLastTerm = n.log.length > 0 ? n.log[n.log.length - 1].term : 0;

  if (pkt.type === 'RV') {
    const dLt = d.lt ?? 0;
    const dLi = d.li ?? 0;
    const isUpToDate =
      dLt > myLastTerm || (dLt === myLastTerm && dLi >= n.log.length);

    if (d.term === n.term && (n.vote < 0 || n.vote === senderId) && isUpToDate) {
      n.vote = senderId;
      n.to = n.tm;
      dispatchClusterPacket(state, n.i, senderId, 'VOTE', { term: n.term });
    }
  } else if (pkt.type === 'VOTE') {
    if (n.s === 'C' && d.term === n.term) {
      n.votes++;
      if (n.votes >= q) {
        becomeLeader(state, n, onEvent, onViolation);
      }
    }
  } else if (pkt.type === 'AE') {
    if (d.term < n.term) {
      dispatchClusterPacket(state, n.i, senderId, 'ACK', { term: n.term, rej: 1 });
      return;
    }
    n.s = 'F';
    n.to = n.tm;
    if (d.log) {
      n.log = d.log.map((e) => ({ ...e }));
    }
    if (d.ci !== undefined) {
      n.ci = Math.min(d.ci, n.log.length);
    }
    dispatchClusterPacket(state, n.i, senderId, 'ACK', { term: n.term, len: n.log.length });
  } else if (pkt.type === 'ACK') {
    if (n.s === 'L' && d.term === n.term && !d.rej && d.len !== undefined) {
      n.ack[senderId] = d.len;
      advanceCommitIndex(state, n, onEvent);
    }
  }
}

export function triggerWriteValue(
  state: LiveClusterSimulationState,
  isAuto = false,
  onEvent?: (msg: string) => void
): void {
  const leaders = state.nodes.filter((n) => n.alive && n.s === 'L');
  if (leaders.length === 0) {
    if (!isAuto) onEvent?.('No leader available; write dropped');
    return;
  }
  const leader = leaders[Math.floor(Math.random() * leaders.length)];
  const val = 100 + Math.floor(Math.random() * 900);
  leader.log.push({ v: val, term: leader.term });
  leader.flash = 1;
  advanceCommitIndex(state, leader, onEvent);
  if (!isAuto) onEvent?.(`Write ${val} sent to N${leader.i + 1}`);
}

export function triggerSplitPartition(
  state: LiveClusterSimulationState,
  onEvent?: (msg: string) => void
): void {
  state.hasInteracted = true;
  for (const i of [0, 1]) {
    for (const j of [2, 3, 4]) {
      state.cutCables.add(cableKey(i, j));
    }
  }
  onEvent?.('Network split: [N1, N2] vs [N3, N4, N5]');
}

export function triggerHealCables(
  state: LiveClusterSimulationState,
  onEvent?: (msg: string) => void
): void {
  state.hasInteracted = true;
  if (state.cutCables.size > 0) {
    state.cutCables.clear();
    onEvent?.('All network cables restored');
  }
}

export function stepClusterSimulation(
  state: LiveClusterSimulationState,
  dt: number,
  nodePositions: RaftPosition[],
  callbacks?: {
    onEvent?: (msg: string) => void;
    onVerdict?: (viol: ClusterViolation | null, count: number) => void;
  }
): void {
  state.simTime += dt;
  const nodes = state.nodes;

  // Update nodes: heartbeats & election timeouts
  for (const n of nodes) {
    n.pulse = Math.max(0, n.pulse - dt * 1.4);
    n.flash = Math.max(0, n.flash - dt * 2);
    if (!n.alive) continue;

    if (n.s === 'L') {
      n.hb -= dt;
      if (n.hb <= 0) {
        n.hb = HEARTBEAT_INTERVAL_SEC;
        n.pulse = 1;
        for (const m of nodes) {
          if (m.i !== n.i) {
            dispatchClusterPacket(state, n.i, m.i, 'AE', {
              term: n.term,
              log: n.log,
              ci: n.ci,
            });
          }
        }
      }
    } else {
      n.to -= dt;
      if (n.to <= 0) {
        startElection(state, n, callbacks?.onEvent, (v) =>
          callbacks?.onVerdict?.(v, state.totalChecks)
        );
      }
    }
  }

  // Update flying packets
  const curPkts = state.packets;
  state.packets = [];

  for (const pkt of curPkts) {
    const a = nodePositions[pkt.a];
    const b = nodePositions[pkt.b];
    pkt.p += dt / pkt.dur;

    if (pkt.dead) {
      if (pkt.p >= 0.5) {
        if (a && b) {
          state.sparks.push({
            x: a.x + (b.x - a.x) * 0.5,
            y: a.y + (b.y - a.y) * 0.5,
            l: 1,
          });
        }
        continue;
      }
    } else if (!isClusterConnected(state, pkt.a, pkt.b)) {
      if (a && b) {
        state.sparks.push({
          x: a.x + (b.x - a.x) * pkt.p,
          y: a.y + (b.y - a.y) * pkt.p,
          l: 1,
        });
      }
      continue;
    } else if (pkt.p >= 1) {
      deliverClusterPacket(state, pkt, callbacks?.onEvent, (v) =>
        callbacks?.onVerdict?.(v, state.totalChecks)
      );
      continue;
    }

    state.packets.push(pkt);
  }

  // Fade sparks
  for (const s of state.sparks) {
    s.l -= dt * 1.6;
  }
  state.sparks = state.sparks.filter((s) => s.l > 0);

  if (state.hasInteracted) {
    state.hintOpacity = Math.max(0, state.hintOpacity - dt * 0.8);
  }

  // Auto write timer
  state.autoWriteTimer -= dt;
  if (state.autoWriteTimer <= 0) {
    state.autoWriteTimer = getRandomWriteInterval();
    triggerWriteValue(state, true, callbacks?.onEvent);
  }

  // Safety checks
  state.checkTimer += dt;
  if (state.checkTimer > 0.35) {
    state.checkTimer = 0;
    const audit = auditSafetyInvariants(nodes);
    state.totalChecks += audit.checksIncrement;
    if (audit.viol && !state.violation) {
      state.violation = audit.viol;
    }
    callbacks?.onVerdict?.(state.violation, state.totalChecks);
  }
}

/**
 * Canonical 5-stage scripted snapshot generator for Scroll-Driven Mode.
 * Progress 0.0 -> 1.0 drives these states smoothly.
 */
export interface ScriptedClusterStage {
  stepIndex: number;
  title: string;
  verdict: {
    isBad: boolean;
    heading: string;
    detail: string;
  };
  eventMessage: string;
  nodes: ClusterNode[];
  cutCables: Set<string>;
  packets: ClusterPacket[];
}

export function getScriptedStages(): ScriptedClusterStage[] {
  // Stage 0: Initial village boot
  const s0Nodes = createInitialCluster();

  // Stage 1: N1 elected leader in Term 1, initial heartbeat
  const s1Nodes = createInitialCluster().map((n, i) => {
    if (i === 0) {
      return {
        ...n,
        s: 'L' as const,
        term: 1,
        votes: 5,
        pulse: 0.8,
      };
    }
    return {
      ...n,
      s: 'F' as const,
      term: 1,
      vote: 0,
    };
  });

  // Stage 2: Client writes values; replicated & committed in slot 1 and 2
  const s2Nodes = s1Nodes.map((n) => ({
    ...n,
    term: 1,
    log: [
      { v: 142, term: 1 },
      { v: 285, term: 1 },
    ],
    ci: 2,
    pulse: 0.4,
  }));

  // Stage 3: Split 2 | 3 partition establishes
  const splitCut = new Set<string>();
  for (const i of [0, 1]) {
    for (const j of [2, 3, 4]) {
      splitCut.add(cableKey(i, j));
    }
  }

  const s3Nodes = s2Nodes.map((n) => ({
    ...n,
  }));

  // Stage 4: Majority side elects N3 in Term 2; minority side N1 cannot reach quorum
  const s4Nodes = s3Nodes.map((n, i) => {
    if (i >= 2) {
      // Majority partition [N3, N4, N5]
      return {
        ...n,
        s: i === 2 ? ('L' as const) : ('F' as const),
        term: 2,
        votes: 3,
        log: [
          { v: 142, term: 1 },
          { v: 285, term: 1 },
          { v: 512, term: 2 },
        ],
        ci: 3,
        pulse: i === 2 ? 0.9 : 0,
      };
    }
    // Minority partition [N1, N2]: stale leader N1 has pending uncommitted write
    return {
      ...n,
      term: 1,
      log: [
        { v: 142, term: 1 },
        { v: 285, term: 1 },
        { v: 999, term: 1 }, // uncommitted write
      ],
      ci: 2, // commitIndex stays at 2 (cannot commit without quorum)
      s: i === 0 ? ('L' as const) : ('F' as const),
    };
  });

  // Stage 5: Cables healed! N1 sees Term 2 and steps down, logs reconcile to [142, 285, 512]
  const s5Nodes = createInitialCluster().map((n, i) => ({
    ...n,
    s: i === 2 ? ('L' as const) : ('F' as const),
    term: 2,
    ci: 3,
    log: [
      { v: 142, term: 1 },
      { v: 285, term: 1 },
      { v: 512, term: 2 },
    ],
    pulse: i === 2 ? 0.7 : 0,
  }));

  return [
    {
      stepIndex: 0,
      title: 'Cluster Boot',
      verdict: {
        isBad: false,
        heading: 'Consistent',
        detail: '0 committed entries compared, 0 conflicts',
      },
      eventMessage: 'Cluster initialized with 5 nodes in term 0',
      nodes: s0Nodes,
      cutCables: new Set<string>(),
      packets: [],
    },
    {
      stepIndex: 1,
      title: 'Leader Election',
      verdict: {
        isBad: false,
        heading: 'Consistent',
        detail: 'N1 elected Hokage (leader) in term 1 with quorum (5 of 5)',
      },
      eventMessage: 'N1 timed out and won election with majority quorum',
      nodes: s1Nodes,
      cutCables: new Set<string>(),
      packets: [
        { a: 0, b: 1, type: 'AE', d: { term: 1, ci: 0 }, p: 0.5, dur: 0.85, dead: false },
        { a: 0, b: 2, type: 'AE', d: { term: 1, ci: 0 }, p: 0.5, dur: 0.85, dead: false },
        { a: 0, b: 3, type: 'AE', d: { term: 1, ci: 0 }, p: 0.5, dur: 0.85, dead: false },
        { a: 0, b: 4, type: 'AE', d: { term: 1, ci: 0 }, p: 0.5, dur: 0.85, dead: false },
      ],
    },
    {
      stepIndex: 2,
      title: 'Log Replication',
      verdict: {
        isBad: false,
        heading: 'Consistent',
        detail: 'Slots 1 and 2 committed across all 5 nodes',
      },
      eventMessage: 'Client writes values 142 and 285; quorum commits slots',
      nodes: s2Nodes,
      cutCables: new Set<string>(),
      packets: [
        { a: 1, b: 0, type: 'ACK', d: { term: 1, len: 2 }, p: 0.8, dur: 0.85, dead: false },
        { a: 2, b: 0, type: 'ACK', d: { term: 1, len: 2 }, p: 0.8, dur: 0.85, dead: false },
      ],
    },
    {
      stepIndex: 3,
      title: 'Network Partition',
      verdict: {
        isBad: false,
        heading: 'Consistent (Safety Holds)',
        detail: 'Village split: [N1, N2] vs [N3, N4, N5]. Cables severed.',
      },
      eventMessage: 'Network partition 2 | 3 severed connecting cables',
      nodes: s3Nodes,
      cutCables: splitCut,
      packets: [
        { a: 0, b: 2, type: 'AE', d: { term: 1 }, p: 0.5, dur: 0.85, dead: true },
        { a: 0, b: 3, type: 'AE', d: { term: 1 }, p: 0.5, dur: 0.85, dead: true },
      ],
    },
    {
      stepIndex: 4,
      title: 'Quorum Rule in Action',
      verdict: {
        isBad: false,
        heading: 'Consistent (No Split-Brain)',
        detail: 'N3 elected in term 2 on majority side (3/5). N1 minority cannot commit.',
      },
      eventMessage: 'N3 elected leader in term 2; N1 isolated cannot commit',
      nodes: s4Nodes,
      cutCables: splitCut,
      packets: [
        { a: 2, b: 3, type: 'AE', d: { term: 2, ci: 3 }, p: 0.6, dur: 0.85, dead: false },
        { a: 2, b: 4, type: 'AE', d: { term: 2, ci: 3 }, p: 0.6, dur: 0.85, dead: false },
      ],
    },
    {
      stepIndex: 5,
      title: 'Heal & Harmony',
      verdict: {
        isBad: false,
        heading: 'Consistent',
        detail: 'Cables restored. N1 stepped down to term 2. All 5 logs unified.',
      },
      eventMessage: 'Partition healed; stale leader stepped down, cluster in full consensus',
      nodes: s5Nodes,
      cutCables: new Set<string>(),
      packets: [],
    },
  ];
}
