/**
 * Deterministic 3-Node Raft Consensus State Machine
 *
 * Requirements:
 * - Pure, deterministic module (no DOM, no randomness, no wall clock).
 * - 3 nodes (Node 1, Node 2, Node 3).
 * - Per node: role (follower | candidate | leader | down), currentTerm, votedFor,
 *   log [{term, label}], commitIndex, alive.
 * - Network: a set of partition groups.
 * - Events: crash(n), recover(n), timeout(n) (-> candidate, term+1, votes for self),
 *   requestVote(from,to), appendEntries(leader,to), clientEntry(leader,label),
 *   partition(groups), heal().
 *
 * Raft rules enforced INSIDE the model:
 * - A node grants at most one vote per term.
 * - A candidate wins only with votes from >= 2 of 3 alive-and-reachable nodes.
 * - A higher term seen -> step down to follower and adopt the term.
 * - A recovered node keeps its persisted term, votedFor and log (never gains entries while down).
 * - Followers accept entries only from leaders with term >= their own and overwrite conflicting entries.
 * - commitIndex advances only when an entry is on >= 2 nodes AND is from the leader's current term.
 * - Messages never cross a partition and never reach down nodes.
 */

export type RaftRole = "follower" | "candidate" | "leader" | "down";

export interface RaftLogEntry {
  term: number;
  label: string;
}

export interface RaftNodeState {
  id: number;
  role: RaftRole;
  currentTerm: number;
  votedFor: number | null;
  log: RaftLogEntry[];
  commitIndex: number; // 0 = none committed, 1-based index
  alive: boolean;
  votesReceived: number[];
}

export interface RaftEventRecord {
  step: number;
  event: string;
  args: Record<string, unknown>;
  description: string;
  success: boolean;
}

export interface RaftSnapshot {
  stepIndex: number;
  nodes: RaftNodeState[];
  partitionGroups: number[][];
  activeLeaderId: number | null;
  highestTerm: number;
}

export class RaftModel {
  readonly nodes: Map<
    number,
    {
      id: number;
      role: RaftRole;
      currentTerm: number;
      votedFor: number | null;
      log: RaftLogEntry[];
      commitIndex: number;
      alive: boolean;
      votesReceived: Set<number>;
    }
  >;
  partitionGroups: number[][];
  eventLog: RaftEventRecord[];
  currentStep: number;

  // Historical tracking for auditing invariants
  preCrashLogs: Map<number, RaftLogEntry[]>;
  recoveredInitialLogs: Map<number, RaftLogEntry[]>;
  electionHistory: Array<{ term: number; leaderId: number; votes: number[] }>;
  votingHistory: Array<{ term: number; voterId: number; candidateId: number }>;

  constructor(nodeIds: number[] = [1, 2, 3]) {
    this.nodes = new Map();
    for (const id of nodeIds) {
      this.nodes.set(id, {
        id,
        role: "follower",
        currentTerm: 0,
        votedFor: null,
        log: [],
        commitIndex: 0,
        alive: true,
        votesReceived: new Set(),
      });
    }
    this.partitionGroups = [nodeIds.slice()];
    this.eventLog = [];
    this.currentStep = 0;
    this.preCrashLogs = new Map();
    this.recoveredInitialLogs = new Map();
    this.electionHistory = [];
    this.votingHistory = [];
  }

  private recordEvent(
    event: string,
    args: Record<string, unknown>,
    description: string,
    success: boolean
  ): void {
    this.eventLog.push({
      step: this.currentStep,
      event,
      args,
      description,
      success,
    });
  }

  /**
   * Network reachability rule:
   * Messages never cross a partition and never reach down nodes.
   */
  canCommunicate(from: number, to: number): boolean {
    const fromNode = this.nodes.get(from);
    const toNode = this.nodes.get(to);
    if (!fromNode || !toNode) return false;
    if (!fromNode.alive || fromNode.role === "down") return false;
    if (!toNode.alive || toNode.role === "down") return false;

    return this.partitionGroups.some(
      (group) => group.includes(from) && group.includes(to)
    );
  }

  /**
   * crash(n):
   * Sets node.alive = false, role = "down".
   * Persisted state (term, votedFor, log, commitIndex) is kept intact.
   */
  crash(n: number): boolean {
    const node = this.nodes.get(n);
    if (!node || !node.alive) {
      this.recordEvent("crash", { n }, `crash(${n}) ignored: node already down`, false);
      return false;
    }

    // Persist pre-crash log for invariant verification
    this.preCrashLogs.set(
      n,
      node.log.map((e) => ({ ...e }))
    );

    node.alive = false;
    node.role = "down";
    node.votesReceived.clear();

    this.recordEvent(
      "crash",
      { n },
      `Node ${n} crashed (down). Persisted: term=${node.currentTerm}, votedFor=${node.votedFor}, ${node.log.length} logs`,
      true
    );
    return true;
  }

  /**
   * recover(n):
   * Recovers node as follower.
   * A recovered node keeps its persisted term, votedFor and log (never gains entries while down).
   */
  recover(n: number): boolean {
    const node = this.nodes.get(n);
    if (!node || node.alive) {
      this.recordEvent("recover", { n }, `recover(${n}) ignored: node already alive`, false);
      return false;
    }

    node.alive = true;
    node.role = "follower";
    node.votesReceived.clear();

    // Record recovered initial log before any new entries
    this.recoveredInitialLogs.set(
      n,
      node.log.map((e) => ({ ...e }))
    );

    this.recordEvent(
      "recover",
      { n },
      `Node ${n} recovered as follower (term=${node.currentTerm}, votedFor=${node.votedFor}, ${node.log.length} logs intact)`,
      true
    );
    return true;
  }

  /**
   * timeout(n):
   * Election timeout -> candidate, term+1, votes for self.
   */
  timeout(n: number): boolean {
    const node = this.nodes.get(n);
    if (!node || !node.alive || node.role === "down") {
      this.recordEvent("timeout", { n }, `timeout(${n}) ignored: node is down`, false);
      return false;
    }

    node.role = "candidate";
    node.currentTerm += 1;
    node.votedFor = n;
    node.votesReceived = new Set([n]);

    this.votingHistory.push({ term: node.currentTerm, voterId: n, candidateId: n });

    this.recordEvent(
      "timeout",
      { n, term: node.currentTerm },
      `Node ${n} timed out -> candidate for term ${node.currentTerm}, voted for self`,
      true
    );

    // In a 3-node cluster, 1 vote < majority (2), so candidate does not win immediately
    this.checkCandidateElection(n);
    return true;
  }

  /**
   * Check if candidate has won election:
   * A candidate wins only with votes from >= 2 of 3 alive-and-reachable nodes.
   */
  private checkCandidateElection(candidateId: number): boolean {
    const candidate = this.nodes.get(candidateId);
    if (!candidate || candidate.role !== "candidate") return false;

    let reachableVotes = 0;
    const votingNodes: number[] = [];

    for (const voterId of candidate.votesReceived) {
      if (voterId === candidateId || this.canCommunicate(candidateId, voterId)) {
        reachableVotes++;
        votingNodes.push(voterId);
      }
    }

    if (reachableVotes >= 2) {
      candidate.role = "leader";
      this.electionHistory.push({
        term: candidate.currentTerm,
        leaderId: candidateId,
        votes: [...votingNodes],
      });

      this.recordEvent(
        "elected",
        { candidateId, term: candidate.currentTerm, votes: votingNodes },
        `Node ${candidateId} elected leader for term ${candidate.currentTerm} with ${reachableVotes}/3 majority votes [${votingNodes.join(", ")}]`,
        true
      );
      return true;
    }
    return false;
  }

  /**
   * requestVote(from, to):
   * Enforces:
   * - Messages never cross a partition and never reach down nodes.
   * - Higher term seen -> step down to follower and adopt the term.
   * - A node grants at most one vote per term.
   * - A candidate wins only with votes from >= 2 of 3 alive-and-reachable nodes.
   */
  requestVote(from: number, to: number): boolean {
    if (!this.canCommunicate(from, to)) {
      this.recordEvent(
        "requestVote",
        { from, to },
        `requestVote(${from} -> ${to}) dropped: unreachable across partition or down node`,
        false
      );
      return false;
    }

    const candidate = this.nodes.get(from);
    const voter = this.nodes.get(to);
    if (!candidate || !voter || candidate.role !== "candidate") {
      return false;
    }

    // Step down rule: a higher term seen -> step down to follower and adopt the term
    if (candidate.currentTerm > voter.currentTerm) {
      voter.currentTerm = candidate.currentTerm;
      voter.role = "follower";
      voter.votedFor = null;
      voter.votesReceived.clear();
    } else if (candidate.currentTerm < voter.currentTerm) {
      candidate.currentTerm = voter.currentTerm;
      candidate.role = "follower";
      candidate.votedFor = null;
      candidate.votesReceived.clear();
      this.recordEvent(
        "requestVote",
        { from, to },
        `requestVote(${from} -> ${to}) rejected: candidate term ${candidate.currentTerm} < voter term ${voter.currentTerm}. Candidate stepped down.`,
        false
      );
      return false;
    }

    // A node grants at most one vote per term
    const canGrantVote = voter.votedFor === null || voter.votedFor === from;

    // Raft log completeness check (Section 5.4.1):
    const candLastTerm =
      candidate.log.length > 0 ? candidate.log[candidate.log.length - 1].term : 0;
    const voterLastTerm =
      voter.log.length > 0 ? voter.log[voter.log.length - 1].term : 0;
    const logUpToDate =
      candLastTerm > voterLastTerm ||
      (candLastTerm === voterLastTerm && candidate.log.length >= voter.log.length);

    if (canGrantVote && logUpToDate) {
      voter.votedFor = from;
      candidate.votesReceived.add(to);
      this.votingHistory.push({
        term: candidate.currentTerm,
        voterId: to,
        candidateId: from,
      });

      this.recordEvent(
        "requestVote",
        { from, to, term: candidate.currentTerm },
        `Node ${to} granted vote to Node ${from} for term ${candidate.currentTerm}`,
        true
      );

      this.checkCandidateElection(from);
      return true;
    }

    this.recordEvent(
      "requestVote",
      { from, to, term: candidate.currentTerm },
      `Node ${to} denied vote to Node ${from} in term ${candidate.currentTerm} (votedFor=${voter.votedFor}, logUpToDate=${logUpToDate})`,
      false
    );
    return false;
  }

  /**
   * clientEntry(leaderId, label):
   * Appends an entry to leader's log. Only accepted by a live leader.
   */
  clientEntry(leaderId: number, label: string): boolean {
    const leader = this.nodes.get(leaderId);
    if (!leader || !leader.alive || leader.role !== "leader") {
      this.recordEvent(
        "clientEntry",
        { leaderId, label },
        `clientEntry rejected: Node ${leaderId} is not an active leader`,
        false
      );
      return false;
    }

    const entry: RaftLogEntry = { term: leader.currentTerm, label };
    leader.log.push(entry);

    this.recordEvent(
      "clientEntry",
      { leaderId, label, term: leader.currentTerm, index: leader.log.length },
      `Leader Node ${leaderId} accepted client entry "${label}" at index ${leader.log.length} (term ${leader.currentTerm})`,
      true
    );
    return true;
  }

  /**
   * appendEntries(leaderId, toId):
   * Enforces:
   * - Messages never cross a partition and never reach down nodes.
   * - Higher term seen -> step down to follower and adopt the term.
   * - Followers accept entries only from leaders with term >= their own and overwrite conflicting entries.
   * - commitIndex advances only when an entry is on >= 2 nodes AND is from the leader's current term.
   */
  appendEntries(leaderId: number, toId: number): boolean {
    if (!this.canCommunicate(leaderId, toId)) {
      this.recordEvent(
        "appendEntries",
        { leaderId, toId },
        `appendEntries(${leaderId} -> ${toId}) dropped: partition barrier or down node`,
        false
      );
      return false;
    }

    const leader = this.nodes.get(leaderId);
    const follower = this.nodes.get(toId);
    if (!leader || !follower || leader.role !== "leader") {
      return false;
    }

    // If follower has higher term, leader must step down
    if (follower.currentTerm > leader.currentTerm) {
      leader.currentTerm = follower.currentTerm;
      leader.role = "follower";
      leader.votedFor = null;
      leader.votesReceived.clear();
      this.recordEvent(
        "appendEntries",
        { leaderId, toId },
        `Leader Node ${leaderId} saw higher term ${follower.currentTerm} on Node ${toId} -> stepped down to follower`,
        false
      );
      return false;
    }

    // Follower sees leader term
    if (leader.currentTerm > follower.currentTerm) {
      follower.currentTerm = leader.currentTerm;
      follower.role = "follower";
      follower.votedFor = null;
      follower.votesReceived.clear();
    } else if (follower.role !== "follower") {
      follower.role = "follower";
    }

    // Followers accept entries only from leaders with term >= their own and overwrite conflicting entries
    let conflictFound = false;
    for (let i = 0; i < leader.log.length; i++) {
      const leaderEntry = leader.log[i];
      if (i < follower.log.length) {
        if (
          follower.log[i].term !== leaderEntry.term ||
          follower.log[i].label !== leaderEntry.label
        ) {
          // Overwrite conflicting entry and truncate follower log
          follower.log = follower.log.slice(0, i);
          follower.log.push({ ...leaderEntry });
          conflictFound = true;
        }
      } else {
        follower.log.push({ ...leaderEntry });
      }
    }

    // If follower had extra entries beyond leader, truncate them
    if (follower.log.length > leader.log.length) {
      follower.log = follower.log.slice(0, leader.log.length);
      conflictFound = true;
    }

    // commitIndex advances only when an entry is on >= 2 nodes AND is from the leader's current term
    for (let entryIdx = leader.commitIndex + 1; entryIdx <= leader.log.length; entryIdx++) {
      const entry = leader.log[entryIdx - 1];
      if (entry.term === leader.currentTerm) {
        let replicas = 0;
        for (const [id, node] of this.nodes) {
          if (node.alive && (this.canCommunicate(leaderId, id) || id === leaderId)) {
            if (
              node.log.length >= entryIdx &&
              node.log[entryIdx - 1].term === entry.term &&
              node.log[entryIdx - 1].label === entry.label
            ) {
              replicas++;
            }
          }
        }
        if (replicas >= 2) {
          leader.commitIndex = entryIdx;
        }
      }
    }

    // Follower adopts leader's commitIndex up to its log length
    follower.commitIndex = Math.min(leader.commitIndex, follower.log.length);

    this.recordEvent(
      "appendEntries",
      {
        leaderId,
        toId,
        logLength: leader.log.length,
        commitIndex: follower.commitIndex,
        conflictFound,
      },
      `appendEntries(${leaderId} -> ${toId}): synced log (${leader.log.length} entries, commitIndex=${follower.commitIndex})${
        conflictFound ? " [conflicting entry overwritten]" : ""
      }`,
      true
    );
    return true;
  }

  /**
   * partition(groups):
   * Partitions nodes into isolated groups. Messages cannot cross between groups.
   */
  partition(groups: number[][]): void {
    this.partitionGroups = groups.map((g) => [...g]);
    this.recordEvent(
      "partition",
      { groups },
      `Partition established: ${groups.map((g) => `[${g.join(", ")}]`).join(" vs ")}`,
      true
    );
  }

  /**
   * heal():
   * Restores unified network where all alive nodes can communicate.
   */
  heal(): void {
    const allIds = Array.from(this.nodes.keys());
    this.partitionGroups = [allIds];
    this.recordEvent(
      "heal",
      { groups: [allIds] },
      `Partition healed: village network unified [${allIds.join(", ")}]`,
      true
    );
  }

  /**
   * Produces an immutable snapshot of current cluster state.
   */
  snapshot(stepIndex: number): RaftSnapshot {
    const nodes: RaftNodeState[] = Array.from(this.nodes.values()).map((n) => ({
      id: n.id,
      role: n.role,
      currentTerm: n.currentTerm,
      votedFor: n.votedFor,
      log: n.log.map((e) => ({ ...e })),
      commitIndex: n.commitIndex,
      alive: n.alive,
      votesReceived: Array.from(n.votesReceived),
    }));

    let activeLeaderId: number | null = null;
    let highestTerm = 0;
    for (const n of nodes) {
      if (n.role === "leader" && n.alive) {
        if (n.currentTerm > highestTerm) {
          highestTerm = n.currentTerm;
          activeLeaderId = n.id;
        }
      }
      if (n.currentTerm > highestTerm) {
        highestTerm = n.currentTerm;
      }
    }

    return {
      stepIndex,
      nodes,
      partitionGroups: this.partitionGroups.map((g) => [...g]),
      activeLeaderId,
      highestTerm,
    };
  }
}

export interface ScenarioResult {
  model: RaftModel;
  snapshots: RaftSnapshot[];
  eventsByBeat: Map<number, RaftEventRecord[]>;
}

/**
 * Executes the exact 5-beat scripted scenario:
 *
 * Beat 1 (Step 0): N1 leader term 1, scroll #1 replicates and commits.
 * Beat 2 (Step 1): N1 crashes.
 * Beat 3 (Step 2): N3 times out -> candidate term 2, N2 votes -> N3 leader term 2.
 * Beat 4 (Step 3): N1 recovers (term 1, log [#1]) and catches up.
 *   Partition: N3 alone vs {N1,N2}.
 *   N3 accepts a client entry but cannot commit it.
 *   N2 times out -> candidate term 3, N1 votes -> N2 leader term 3, commits an entry at the same index.
 * Beat 5 (Step 4): Heal: N3 sees term 3, steps down, its uncommitted conflicting entry is overwritten.
 *   The partition wall sits between N2 and N3 only.
 */
export function runRaftScenario(): ScenarioResult {
  const model = new RaftModel([1, 2, 3]);
  const snapshots: RaftSnapshot[] = [];
  const eventsByBeat = new Map<number, RaftEventRecord[]>();

  let lastEventIdx = 0;
  const captureBeatEvents = (beatNum: number) => {
    const beatEvents = model.eventLog.slice(lastEventIdx);
    lastEventIdx = model.eventLog.length;
    eventsByBeat.set(beatNum, beatEvents);
  };

  // -------------------------------------------------------------
  // Beat 1 (Step 0): N1 leader term 1, scroll #1 replicates and commits.
  // -------------------------------------------------------------
  model.currentStep = 0;
  model.timeout(1); // N1 candidate term 1
  model.requestVote(1, 2); // N2 grants vote
  model.requestVote(1, 3); // N3 grants vote -> N1 elected leader term 1
  model.clientEntry(1, "Scroll #1 (Pact)");
  model.appendEntries(1, 2);
  model.appendEntries(1, 3);
  snapshots.push(model.snapshot(0));
  captureBeatEvents(1);

  // -------------------------------------------------------------
  // Beat 2 (Step 1): N1 crashes.
  // -------------------------------------------------------------
  model.currentStep = 1;
  model.crash(1);
  snapshots.push(model.snapshot(1));
  captureBeatEvents(2);

  // -------------------------------------------------------------
  // Beat 3 (Step 2): N3 times out -> candidate term 2, N2 votes -> N3 leader term 2.
  // -------------------------------------------------------------
  model.currentStep = 2;
  model.timeout(3); // N3 candidate term 2, votes for self
  model.requestVote(3, 2); // N2 grants vote -> N3 leader term 2 (2/3 majority)
  model.appendEntries(3, 2); // N3 heartbeat / replicate to N2
  snapshots.push(model.snapshot(2));
  captureBeatEvents(3);

  // -------------------------------------------------------------
  // Beat 4 (Step 3): N1 recovers (term 1, log [#1]) and catches up.
  // Partition: N3 alone vs {N1,N2}.
  // N3 accepts a client entry but cannot commit it.
  // N2 times out -> candidate term 3, N1 votes -> N2 leader term 3, commits an entry at the same index.
  // The partition wall must sit between N2 and N3 only.
  // -------------------------------------------------------------
  model.currentStep = 3;
  model.recover(1); // N1 recovers keeping term 1, log [#1]
  model.appendEntries(3, 1); // N3 catches up N1 to term 2

  // Partition wall sits between N2 and N3 only: {N1, N2} vs {N3}
  model.partition([[3], [1, 2]]);

  // N3 accepts a client entry but cannot commit it (alone in minority)
  model.clientEntry(3, "Scroll #2 (Defense)");
  model.appendEntries(3, 1); // fails - partition
  model.appendEntries(3, 2); // fails - partition

  // N2 times out -> candidate term 3, N1 votes -> N2 leader term 3
  model.timeout(2);
  model.requestVote(2, 1); // N1 grants vote -> N2 elected leader term 3 (2/3 majority)

  // N2 commits an entry at the same index (index 2)
  model.clientEntry(2, "Scroll #2 (Alliance)");
  model.appendEntries(2, 1); // Replicated to N1 in current term 3 -> committed!

  snapshots.push(model.snapshot(3));
  captureBeatEvents(4);

  // -------------------------------------------------------------
  // Beat 5 (Step 4): Heal: N3 sees term 3, steps down, its uncommitted conflicting entry is overwritten.
  // -------------------------------------------------------------
  model.currentStep = 4;
  model.heal();
  model.appendEntries(2, 3); // N2 syncs N3: N3 steps down, overwrites uncommitted Scroll #2 (Defense), commits!
  model.appendEntries(2, 1); // N2 heartbeat to N1
  snapshots.push(model.snapshot(4));
  captureBeatEvents(5);

  return { model, snapshots, eventsByBeat };
}
