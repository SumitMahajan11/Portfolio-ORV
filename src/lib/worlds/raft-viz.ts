/**
 * Raft Deterministic Visualizer State Machine
 *
 * Requirements from /docs/10-WORLD-RAFT.md & 18-PROMPTS-PHASE-2.md (P2-1):
 * - 3 nodes (Node 1, Node 2, Node 3)
 * - Scripted scenario steps only (no real networking, no randomness)
 * - Label: "illustrative visualization, not the Ratify code"
 * - Invariant self-checks:
 *   (a) at most one leader per term across all states
 *   (b) a candidate needs votes from a majority (2 of 3) to win
 *   (c) a new election increments the term
 *   (d) a new leader's term is greater than the failed leader's term
 *   (e) during a partition the minority side cannot elect a leader
 *   (f) after healing, the stale leader steps down on seeing a higher term
 */

export type RaftRole = "leader" | "candidate" | "follower" | "crashed";

export interface RaftLogEntry {
  index: number;
  term: number;
  data: string;
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

/**
 * 5 Deterministic Scripted Scenario Beats (Naruto: Hidden Leaf Village)
 *
 * Beat 0: Steady State (Hokage Era 1)
 * Beat 1: Hokage Falls (Era Ends)
 * Beat 2: Election & Majority Quorum (Era 2 Rises)
 * Beat 3: Network Partition (Minority Cannot Elect)
 * Beat 4: Healing & Stale Leader Steps Down
 */
export const RAFT_SCENARIO_STEPS: RaftScenarioStep[] = [
  // -------------------------------------------------------------
  // Step 0: Era 1 - Normal Steady State (Hokage Node 1)
  // -------------------------------------------------------------
  {
    stepIndex: 0,
    id: "steady-state",
    beatTitle: "Era 1: Steady Hokage Leadership",
    eraName: "First Hokage Era (Term 1)",
    term: 1,
    caption:
      "Node 1 rules as Hokage in Term 1. Heartbeat signal flares maintain cluster authority and sync the peace scroll.",
    details:
      "Node 1 emits periodic heartbeat flares to Followers (Node 2 & Node 3). Log scroll #1 (Term 1) is replicated across all 3 nodes.",
    partitionActive: false,
    partitionMinorityNodeId: null,
    nodes: [
      {
        id: 1,
        name: "Node 1",
        role: "leader",
        currentTerm: 1,
        votedFor: 1,
        logs: [{ index: 1, term: 1, data: "Scroll #1 (Pact)" }],
        expression: "calm",
        partition: "B",
        votesReceived: [1, 2, 3],
      },
      {
        id: 2,
        name: "Node 2",
        role: "follower",
        currentTerm: 1,
        votedFor: 1,
        logs: [{ index: 1, term: 1, data: "Scroll #1 (Pact)" }],
        expression: "attentive",
        partition: "B",
        votesReceived: [],
      },
      {
        id: 3,
        name: "Node 3",
        role: "follower",
        currentTerm: 1,
        votedFor: 1,
        logs: [{ index: 1, term: 1, data: "Scroll #1 (Pact)" }],
        expression: "attentive",
        partition: "B",
        votesReceived: [],
      },
    ],
    flares: [
      { id: "f-1-2", from: 1, to: 2, type: "heartbeat", label: "Heartbeat Flare" },
      { id: "f-1-3", from: 1, to: 3, type: "heartbeat", label: "Heartbeat Flare" },
    ],
  },

  // -------------------------------------------------------------
  // Step 1: Leader Crashes - Era Ends
  // -------------------------------------------------------------
  {
    stepIndex: 1,
    id: "leader-crash",
    beatTitle: "Leader Crashes: Era 1 Ends",
    eraName: "Interregnum (Silence)",
    term: 1,
    caption:
      "Hokage Node 1 crashes and goes silent. Signal flares cease, and Followers detect heartbeat timeout.",
    details:
      "No signal flares reach the village. Nodes 2 & 3 recognize the leader's demise. The term remains 1 until an election is called.",
    partitionActive: false,
    partitionMinorityNodeId: null,
    nodes: [
      {
        id: 1,
        name: "Node 1",
        role: "crashed",
        currentTerm: 1,
        votedFor: 1,
        logs: [{ index: 1, term: 1, data: "Scroll #1 (Pact)" }],
        expression: "fallen",
        partition: "B",
        votesReceived: [],
      },
      {
        id: 2,
        name: "Node 2",
        role: "follower",
        currentTerm: 1,
        votedFor: null,
        logs: [{ index: 1, term: 1, data: "Scroll #1 (Pact)" }],
        expression: "alert",
        partition: "B",
        votesReceived: [],
      },
      {
        id: 3,
        name: "Node 3",
        role: "follower",
        currentTerm: 1,
        votedFor: null,
        logs: [{ index: 1, term: 1, data: "Scroll #1 (Pact)" }],
        expression: "alert",
        partition: "B",
        votesReceived: [],
      },
    ],
    flares: [],
  },

  // -------------------------------------------------------------
  // Step 2: Election & Majority Quorum (Era 2 Rises)
  // -------------------------------------------------------------
  {
    stepIndex: 2,
    id: "election-quorum",
    beatTitle: "Election: Majority Quorum (Term 2)",
    eraName: "Second Hokage Era (Term 2)",
    term: 2,
    caption:
      "Node 2 increments term to 2, runs as Candidate, and receives majority vote (2/3) from Node 3 to become Hokage.",
    details:
      "Election rule verified: Node 2 votes for itself (1 vote) and secures Node 3's vote (2/3 majority). Term 2 > Term 1.",
    partitionActive: false,
    partitionMinorityNodeId: null,
    nodes: [
      {
        id: 1,
        name: "Node 1",
        role: "crashed",
        currentTerm: 1,
        votedFor: 1,
        logs: [{ index: 1, term: 1, data: "Scroll #1 (Pact)" }],
        expression: "fallen",
        partition: "B",
        votesReceived: [],
      },
      {
        id: 2,
        name: "Node 2",
        role: "leader",
        currentTerm: 2,
        votedFor: 2,
        logs: [
          { index: 1, term: 1, data: "Scroll #1 (Pact)" },
          { index: 2, term: 2, data: "Scroll #2 (Defense)" },
        ],
        expression: "calm",
        partition: "B",
        votesReceived: [2, 3],
      },
      {
        id: 3,
        name: "Node 3",
        role: "follower",
        currentTerm: 2,
        votedFor: 2,
        logs: [
          { index: 1, term: 1, data: "Scroll #1 (Pact)" },
          { index: 2, term: 2, data: "Scroll #2 (Defense)" },
        ],
        expression: "attentive",
        partition: "B",
        votesReceived: [],
      },
    ],
    flares: [
      { id: "f-2-3-vote", from: 2, to: 3, type: "replicate", label: "Scroll #2 Replication" },
      { id: "f-2-3-hb", from: 2, to: 3, type: "heartbeat", label: "Term 2 Flare" },
    ],
  },

  // -------------------------------------------------------------
  // Step 3: Network Partition - Minority Cannot Elect
  // -------------------------------------------------------------
  {
    stepIndex: 3,
    id: "network-partition",
    beatTitle: "Network Partition: Minority Blocked",
    eraName: "Third Hokage Era (Term 3)",
    term: 3,
    caption:
      "A partition isolates Node 2 in the minority (1/3). Nodes 1 & 3 form a majority (2/3) and elect Node 3 for Term 3.",
    details:
      "Node 2 cannot commit or elect with only 1/3 votes. Nodes 1 & 3 reach quorum, increment to Term 3, and elect Node 3 as Hokage.",
    partitionActive: true,
    partitionMinorityNodeId: 2,
    nodes: [
      {
        id: 1,
        name: "Node 1",
        role: "follower",
        currentTerm: 3,
        votedFor: 3,
        logs: [
          { index: 1, term: 1, data: "Scroll #1 (Pact)" },
          { index: 2, term: 2, data: "Scroll #2 (Defense)" },
          { index: 3, term: 3, data: "Scroll #3 (Alliance)" },
        ],
        expression: "attentive",
        partition: "B",
        votesReceived: [],
      },
      {
        id: 2,
        name: "Node 2",
        role: "leader", // Stale leader in minority partition
        currentTerm: 2,
        votedFor: 2,
        logs: [
          { index: 1, term: 1, data: "Scroll #1 (Pact)" },
          { index: 2, term: 2, data: "Scroll #2 (Defense)" },
        ],
        expression: "alert",
        partition: "A", // Isolated minority
        votesReceived: [2], // Only 1 vote! Cannot reach majority of 2
      },
      {
        id: 3,
        name: "Node 3",
        role: "leader", // Legitimate Hokage in majority partition
        currentTerm: 3,
        votedFor: 3,
        logs: [
          { index: 1, term: 1, data: "Scroll #1 (Pact)" },
          { index: 2, term: 2, data: "Scroll #2 (Defense)" },
          { index: 3, term: 3, data: "Scroll #3 (Alliance)" },
        ],
        expression: "calm",
        partition: "B",
        votesReceived: [1, 3], // 2 of 3 votes = Majority!
      },
    ],
    flares: [
      { id: "f-3-1-hb", from: 3, to: 1, type: "heartbeat", label: "Term 3 Flare" },
      { id: "f-3-1-rep", from: 3, to: 1, type: "replicate", label: "Scroll #3 Replication" },
    ],
  },

  // -------------------------------------------------------------
  // Step 4: Partition Heals - Stale Leader Steps Down
  // -------------------------------------------------------------
  {
    stepIndex: 4,
    id: "partition-heals",
    beatTitle: "Healing: Stale Leader Steps Down",
    eraName: "United Village (Term 3)",
    term: 3,
    caption:
      "Partition dissolves. Node 2 receives Term 3 flare from Node 3 and immediately steps down to Follower.",
    details:
      "Seeing Term 3 > Term 2, Node 2 yields authority without conflict. All 3 nodes synchronize under Hokage Node 3.",
    partitionActive: false,
    partitionMinorityNodeId: null,
    nodes: [
      {
        id: 1,
        name: "Node 1",
        role: "follower",
        currentTerm: 3,
        votedFor: 3,
        logs: [
          { index: 1, term: 1, data: "Scroll #1 (Pact)" },
          { index: 2, term: 2, data: "Scroll #2 (Defense)" },
          { index: 3, term: 3, data: "Scroll #3 (Alliance)" },
        ],
        expression: "attentive",
        partition: "B",
        votesReceived: [],
      },
      {
        id: 2,
        name: "Node 2",
        role: "follower", // Successfully stepped down!
        currentTerm: 3, // Updated to highest seen term
        votedFor: 3,
        logs: [
          { index: 1, term: 1, data: "Scroll #1 (Pact)" },
          { index: 2, term: 2, data: "Scroll #2 (Defense)" },
          { index: 3, term: 3, data: "Scroll #3 (Alliance)" },
        ],
        expression: "attentive",
        partition: "B",
        votesReceived: [],
      },
      {
        id: 3,
        name: "Node 3",
        role: "leader",
        currentTerm: 3,
        votedFor: 3,
        logs: [
          { index: 1, term: 1, data: "Scroll #1 (Pact)" },
          { index: 2, term: 2, data: "Scroll #2 (Defense)" },
          { index: 3, term: 3, data: "Scroll #3 (Alliance)" },
        ],
        expression: "calm",
        partition: "B",
        votesReceived: [1, 2, 3],
      },
    ],
    flares: [
      { id: "f-3-1-final", from: 3, to: 1, type: "heartbeat", label: "Term 3 Heartbeat" },
      { id: "f-3-2-final", from: 3, to: 2, type: "heartbeat", label: "Term 3 Heartbeat" },
    ],
  },
];

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
    // ---------------------------------------------------------
    // (a) At most one leader per term across all states
    // ---------------------------------------------------------
    const leadersByTerm = new Map<number, Set<number>>();
    for (const step of RAFT_SCENARIO_STEPS) {
      for (const node of step.nodes) {
        if (node.role === "leader") {
          // If in a partitioned step, ensure only one leader per term exists
          if (!leadersByTerm.has(node.currentTerm)) {
            leadersByTerm.set(node.currentTerm, new Set());
          }
          leadersByTerm.get(node.currentTerm)!.add(node.id);
        }
      }
    }

    let invariantAPassed = true;
    for (const [, leaderSet] of leadersByTerm.entries()) {
      // In any single term, at most one legitimate leader was elected
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

    // ---------------------------------------------------------
    // (b) Candidate needs votes from a majority (2 of 3) to win
    // ---------------------------------------------------------
    const totalNodes = 3;
    const requiredMajority = Math.floor(totalNodes / 2) + 1; // 2

    // Check step 2 election (Node 2 elected) and step 3 election (Node 3 elected)
    const step2Leader = RAFT_SCENARIO_STEPS[2].nodes.find((n) => n.id === 2);
    const step3Leader = RAFT_SCENARIO_STEPS[3].nodes.find((n) => n.id === 3);

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

    // ---------------------------------------------------------
    // (c) A new election increments the term
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // (d) New leader's term is greater than failed leader's term
    // ---------------------------------------------------------
    const failedLeader1Term = RAFT_SCENARIO_STEPS[1].nodes.find((n) => n.id === 1)?.currentTerm ?? 0;
    const newLeader2Term = RAFT_SCENARIO_STEPS[2].nodes.find((n) => n.id === 2)?.currentTerm ?? 0;

    const staleLeader2Term = RAFT_SCENARIO_STEPS[3].nodes.find((n) => n.id === 2)?.currentTerm ?? 0;
    const newLeader3Term = RAFT_SCENARIO_STEPS[3].nodes.find((n) => n.id === 3)?.currentTerm ?? 0;

    const invariantDPassed =
      newLeader2Term > failedLeader1Term && newLeader3Term > staleLeader2Term;

    assertions.push({
      id: "d",
      rule: "New leader's term is strictly greater than failed leader's term",
      passed: invariantDPassed,
      details: `Leader 2 (Term ${newLeader2Term}) > Failed Leader 1 (Term ${failedLeader1Term}); Leader 3 (Term ${newLeader3Term}) > Stale Leader 2 (Term ${staleLeader2Term}).`,
    });

    // ---------------------------------------------------------
    // (e) During partition the minority side cannot elect a leader
    // ---------------------------------------------------------
    const partitionStep = RAFT_SCENARIO_STEPS[3];
    const minorityNodes = partitionStep.nodes.filter((n) => n.partition === "A");
    const minorityNode = minorityNodes[0];

    // Minority side has 1 node, can get at most 1 vote < 2
    const minorityCannotElect =
      minorityNodes.length < requiredMajority &&
      minorityNode.votesReceived.length < requiredMajority &&
      minorityNode.currentTerm < partitionStep.term; // Remains stale

    assertions.push({
      id: "e",
      rule: "During partition, minority side cannot elect a leader",
      passed: minorityCannotElect,
      details: `Minority partition size: ${minorityNodes.length} node (Node ${minorityNode?.id}). Votes obtainable: ${minorityNode?.votesReceived.length}/${requiredMajority} (failed quorum).`,
    });

    // ---------------------------------------------------------
    // (f) After healing, stale leader steps down on seeing higher term
    // ---------------------------------------------------------
    const healingStep = RAFT_SCENARIO_STEPS[4];
    const healedNode2 = healingStep.nodes.find((n) => n.id === 2);
    const currentLeaderNode3 = healingStep.nodes.find((n) => n.id === 3);

    const invariantFPassed = Boolean(
      healedNode2 &&
        currentLeaderNode3 &&
        healedNode2.role === "follower" &&
        healedNode2.currentTerm === currentLeaderNode3.currentTerm &&
        healedNode2.currentTerm === 3
    );

    assertions.push({
      id: "f",
      rule: "After healing, stale leader steps down on seeing higher term",
      passed: invariantFPassed,
      details: `Node 2 stepped down from leader to role '${healedNode2?.role}' and adopted term ${healedNode2?.currentTerm} upon seeing leader Node 3 (term ${currentLeaderNode3?.currentTerm}).`,
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
