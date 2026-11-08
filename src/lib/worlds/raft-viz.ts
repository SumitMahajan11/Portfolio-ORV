/**
 * Raft Deterministic Visualizer State Machine
 *
 * Requirements from /docs/10-WORLD-RAFT.md & Task:
 * - Real mini Raft state machine (src/lib/worlds/raft-model.ts) GENERATES the frames.
 * - 3 nodes (Node 1, Node 2, Node 3).
 * - Label: "illustrative visualization, not the Ratify code"
 * - Invariant self-checks:
 *   (a) at most one leader per term across all states
 *   (b) a candidate needs votes from a majority (2 of 3) to win
 *   (c) a new election increments the term
 *   (d) a new leader's term is greater than the failed leader's term
 *   (e) during a partition the minority side cannot elect a leader
 *   (f) after healing, the stale leader steps down on seeing a higher term
 */

import {
  runRaftScenario,
  type RaftSnapshot,
  type RaftRole as ModelRole,
} from "./raft-model";

export type RaftRole = "leader" | "candidate" | "follower" | "crashed";

export interface RaftLogEntry {
  index: number;
  term: number;
  data: string;
  committed: boolean;
}

export interface RaftNodeState {
  id: number;
  name: string;
  role: RaftRole;
  currentTerm: number;
  votedFor: number | null;
  logs: RaftLogEntry[];
  expression: "calm" | "determined" | "alert" | "fallen" | "attentive";
  partition: "A" | "B"; // "A" = isolated minority, "B" = quorum majority
  votesReceived: number[];
  commitIndex: number;
}

export interface SignalFlare {
  id: string;
  from: number;
  to: number;
  type: "heartbeat" | "vote_request" | "vote_grant" | "replicate";
  label: string;
}

export interface RaftScenarioStep {
  stepIndex: number;
  id: string;
  beatTitle: string;
  eraName: string;
  term: number;
  caption: string;
  details: string;
  partitionActive: boolean;
  partitionMinorityNodeId: number | null;
  nodes: RaftNodeState[];
  flares: SignalFlare[];
}

interface BeatMetadata {
  id: string;
  beatTitle: string;
  eraName: string;
  caption: string;
  details: string;
  flares: SignalFlare[];
}

const BEAT_METADATA: BeatMetadata[] = [
  // Beat 1 (Step 0)
  {
    id: "steady-state",
    beatTitle: "Era 1: Steady Hokage Leadership",
    eraName: "First Hokage Era (Term 1)",
    caption:
      "Node 1 rules as Hokage in Term 1. Heartbeat signal flares maintain cluster authority and sync the peace scroll.",
    details:
      "Node 1 emits periodic heartbeat flares to Followers (Node 2 & Node 3). Log scroll #1 (Term 1) is replicated across all 3 nodes.",
    flares: [
      { id: "f-1-2", from: 1, to: 2, type: "heartbeat", label: "Heartbeat Flare" },
      { id: "f-1-3", from: 1, to: 3, type: "heartbeat", label: "Heartbeat Flare" },
    ],
  },
  // Beat 2 (Step 1)
  {
    id: "leader-crash",
    beatTitle: "Leader Crashes: Era 1 Ends",
    eraName: "Interregnum (Silence)",
    caption:
      "Hokage Node 1 crashes and goes silent. Signal flares cease, and Followers detect heartbeat timeout.",
    details:
      "No signal flares reach the village. Nodes 2 & 3 recognize the leader's demise. The term remains 1 until an election is called.",
    flares: [],
  },
  // Beat 3 (Step 2)
  {
    id: "election-quorum",
    beatTitle: "Election: Majority Quorum (Term 2)",
    eraName: "Second Hokage Era (Term 2)",
    caption:
      "Node 3 increments term to 2, runs as Candidate, and receives majority vote (2/3) from Node 2 to become Hokage.",
    details:
      "Election rule verified: Node 3 votes for itself (1 vote) and secures Node 2's vote (2/3 majority). Term 2 > Term 1.",
    flares: [
      { id: "f-3-2-vote", from: 3, to: 2, type: "heartbeat", label: "Term 2 Flare" },
    ],
  },
  // Beat 4 (Step 3)
  {
    id: "network-partition",
    beatTitle: "Network Partition: Minority Blocked",
    eraName: "Third Hokage Era (Term 3)",
    caption:
      "A partition isolates Node 3 in the minority (1/3). Nodes 1 & 2 form a majority (2/3) and elect Node 2 for Term 3.",
    details:
      "Node 3 accepts an uncommitted client entry but cannot commit with only 1/3 votes. Nodes 1 & 2 reach quorum, increment to Term 3, and elect Node 2 as Hokage.",
    flares: [
      { id: "f-2-1-hb", from: 2, to: 1, type: "heartbeat", label: "Term 3 Flare" },
      { id: "f-2-1-rep", from: 2, to: 1, type: "replicate", label: "Scroll #2 Replication" },
    ],
  },
  // Beat 5 (Step 4)
  {
    id: "partition-heals",
    beatTitle: "Healing: Stale Leader Steps Down",
    eraName: "United Village (Term 3)",
    caption:
      "Partition dissolves. Node 3 receives Term 3 flare from Node 2 and immediately steps down to Follower.",
    details:
      "Seeing Term 3 > Term 2, Node 3 steps down to Follower. Its uncommitted term 2 entry is overwritten by Node 2's committed entry.",
    flares: [
      { id: "f-2-1-final", from: 2, to: 1, type: "heartbeat", label: "Term 3 Heartbeat" },
      { id: "f-2-3-final", from: 2, to: 3, type: "heartbeat", label: "Term 3 Heartbeat" },
    ],
  },
];

function determineExpression(
  role: ModelRole,
  stepIndex: number,
  isMinority: boolean
): "calm" | "determined" | "alert" | "fallen" | "attentive" {
  if (role === "down") return "fallen";
  if (role === "leader") return isMinority ? "alert" : "calm";
  if (role === "candidate") return "determined";
  if (stepIndex === 1 || isMinority) return "alert";
  return "attentive";
}

function mapSnapshotToScenarioStep(
  snapshot: RaftSnapshot,
  meta: BeatMetadata
): RaftScenarioStep {
  const isPartitionActive = snapshot.partitionGroups.length > 1;
  const minorityGroup = isPartitionActive
    ? snapshot.partitionGroups.find((g) => g.length < 2) ?? null
    : null;
  const minorityNodeId = minorityGroup ? minorityGroup[0] : null;

  const nodes: RaftNodeState[] = snapshot.nodes.map((node) => {
    const isMinority = isPartitionActive && minorityGroup?.includes(node.id) === true;
    const mappedRole: RaftRole = node.role === "down" ? "crashed" : node.role;

    const logs: RaftLogEntry[] = node.log.map((entry, idx) => ({
      index: idx + 1,
      term: entry.term,
      data: entry.label,
      committed: idx + 1 <= node.commitIndex,
    }));

    return {
      id: node.id,
      name: `Node ${node.id}`,
      role: mappedRole,
      currentTerm: node.currentTerm,
      votedFor: node.votedFor,
      logs,
      expression: determineExpression(node.role, snapshot.stepIndex, isMinority),
      partition: isMinority ? "A" : "B",
      votesReceived: [...node.votesReceived],
      commitIndex: node.commitIndex,
    };
  });

  return {
    stepIndex: snapshot.stepIndex,
    id: meta.id,
    beatTitle: meta.beatTitle,
    eraName: meta.eraName,
    term: snapshot.highestTerm,
    caption: meta.caption,
    details: meta.details,
    partitionActive: isPartitionActive,
    partitionMinorityNodeId: minorityNodeId,
    nodes,
    flares: meta.flares,
  };
}

/**
 * Real mini Raft state machine generates the scenario frames dynamically.
 */
export function buildRaftScenarioSteps(): RaftScenarioStep[] {
  const { snapshots } = runRaftScenario();
  return snapshots.map((snapshot, idx) =>
    mapSnapshotToScenarioStep(snapshot, BEAT_METADATA[idx])
  );
}

/**
 * 5 Deterministic Scenario Steps derived directly from Raft state machine snapshots.
 */
export const RAFT_SCENARIO_STEPS: RaftScenarioStep[] = buildRaftScenarioSteps();

// -------------------------------------------------------------
// Invariant Self-Check Assertions (P2-1 Requirements)
// -------------------------------------------------------------

export interface RaftSelfCheckAssertion {
  id: "a" | "b" | "c" | "d" | "e" | "f";
  rule: string;
  passed: boolean;
  details: string;
}

export interface RaftSelfCheckResult {
  passed: boolean;
  assertions: RaftSelfCheckAssertion[];
  error?: string;
}

/**
 * Executes a deterministic unit-style verification suite against the scenario steps.
 * Validates the 6 fundamental Raft invariants specified in Prompt P2-1:
 *
 * (a) at most one leader per term
 * (b) a candidate needs votes from a majority (2 of 3) to win
 * (c) a new election increments the term
 * (d) a new leader's term is greater than the failed leader's term
 * (e) during a partition the minority side cannot elect a leader
 * (f) after healing, the stale leader steps down on seeing a higher term
 */
export function runRaftSelfCheck(): RaftSelfCheckResult {
  const assertions: RaftSelfCheckAssertion[] = [];

  try {
    // (a) At most one leader per term across all states
    const leadersByTerm = new Map<number, Set<number>>();
    for (const step of RAFT_SCENARIO_STEPS) {
      for (const node of step.nodes) {
        if (node.role === "leader") {
          if (!leadersByTerm.has(node.currentTerm)) {
            leadersByTerm.set(node.currentTerm, new Set());
          }
          leadersByTerm.get(node.currentTerm)!.add(node.id);
        }
      }
    }

    let invariantAPassed = true;
    for (const [, leaderSet] of leadersByTerm.entries()) {
      if (leaderSet.size > 1) {
        invariantAPassed = false;
      }
    }

    assertions.push({
      id: "a",
      rule: "At most one leader per term",
      passed: invariantAPassed,
      details: Array.from(leadersByTerm.entries())
        .map(([t, l]) => `Term ${t} -> Leader Node [${Array.from(l).join(", ")}]`)
        .join("; "),
    });

    // (b) Candidate needs votes from a majority (2 of 3) to win
    const totalNodes = 3;
    const requiredMajority = Math.floor(totalNodes / 2) + 1; // 2

    const step2Leader = RAFT_SCENARIO_STEPS[2].nodes.find((n) => n.id === 3);
    const step3Leader = RAFT_SCENARIO_STEPS[3].nodes.find((n) => n.id === 2);

    const step2Quorum = Boolean(
      step2Leader &&
        step2Leader.role === "leader" &&
        step2Leader.votesReceived.length >= requiredMajority
    );

    const step3Quorum = Boolean(
      step3Leader &&
        step3Leader.role === "leader" &&
        step3Leader.votesReceived.length >= requiredMajority
    );

    const invariantBPassed = step2Quorum && step3Quorum;
    assertions.push({
      id: "b",
      rule: "Candidate requires majority votes (2 of 3) to win",
      passed: invariantBPassed,
      details: `Required majority: ${requiredMajority}/3. Step 2 votes: ${step2Leader?.votesReceived.length}/3. Step 3 votes: ${step3Leader?.votesReceived.length}/3.`,
    });

    // (c) A new election increments the term
    const term0 = RAFT_SCENARIO_STEPS[0].term; // 1
    const term2 = RAFT_SCENARIO_STEPS[2].term; // 2
    const term3 = RAFT_SCENARIO_STEPS[3].term; // 3

    const election1Increments = term2 === term0 + 1;
    const election2Increments = term3 === term2 + 1;
    const invariantCPassed = election1Increments && election2Increments;

    assertions.push({
      id: "c",
      rule: "A new election increments the term",
      passed: invariantCPassed,
      details: `Term progression: ${term0} -> ${term2} (election 1) -> ${term3} (election 2).`,
    });

    // (d) New leader's term is greater than failed leader's term
    const failedLeader1Term =
      RAFT_SCENARIO_STEPS[1].nodes.find((n) => n.id === 1)?.currentTerm ?? 0;
    const newLeader3Term =
      RAFT_SCENARIO_STEPS[2].nodes.find((n) => n.id === 3)?.currentTerm ?? 0;

    const staleLeader3Term =
      RAFT_SCENARIO_STEPS[3].nodes.find((n) => n.id === 3)?.currentTerm ?? 0;
    const newLeader2Term =
      RAFT_SCENARIO_STEPS[3].nodes.find((n) => n.id === 2)?.currentTerm ?? 0;

    const invariantDPassed =
      newLeader3Term > failedLeader1Term && newLeader2Term > staleLeader3Term;

    assertions.push({
      id: "d",
      rule: "New leader's term is strictly greater than failed leader's term",
      passed: invariantDPassed,
      details: `Leader 3 (Term ${newLeader3Term}) > Failed Leader 1 (Term ${failedLeader1Term}); Leader 2 (Term ${newLeader2Term}) > Stale Leader 3 (Term ${staleLeader3Term}).`,
    });

    // (e) During partition the minority side cannot elect a leader
    const partitionStep = RAFT_SCENARIO_STEPS[3];
    const minorityNodes = partitionStep.nodes.filter((n) => n.partition === "A");
    const minorityNode = minorityNodes[0];

    const minorityCannotElect =
      minorityNodes.length < requiredMajority &&
      minorityNode.currentTerm < partitionStep.term;

    assertions.push({
      id: "e",
      rule: "During partition, minority side cannot elect a leader",
      passed: minorityCannotElect,
      details: `Minority partition size: ${minorityNodes.length} node (Node ${minorityNode?.id}). Votes obtainable: ${minorityNode?.votesReceived.length}/${requiredMajority} (cannot reach quorum).`,
    });

    // (f) After healing, stale leader steps down on seeing higher term
    const healingStep = RAFT_SCENARIO_STEPS[4];
    const healedNode3 = healingStep.nodes.find((n) => n.id === 3);
    const currentLeaderNode2 = healingStep.nodes.find((n) => n.id === 2);

    const invariantFPassed = Boolean(
      healedNode3 &&
        currentLeaderNode2 &&
        healedNode3.role === "follower" &&
        healedNode3.currentTerm === currentLeaderNode2.currentTerm &&
        healedNode3.currentTerm === 3
    );

    assertions.push({
      id: "f",
      rule: "After healing, stale leader steps down on seeing higher term",
      passed: invariantFPassed,
      details: `Node 3 stepped down from leader to role '${healedNode3?.role}' and adopted term ${healedNode3?.currentTerm} upon seeing leader Node 2 (term ${currentLeaderNode2?.currentTerm}).`,
    });

    const allPassed = assertions.every((a) => a.passed);
    return {
      passed: allPassed,
      assertions,
    };
  } catch (err) {
    return {
      passed: false,
      assertions,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
