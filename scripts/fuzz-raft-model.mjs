/**
 * Seeded Fuzz Tester for Raft Model
 *
 * Requirements:
 * - Seeded PRNG (seeds 1..2000)
 * - Random action sequences of length <= 40 (crash, recover, isolate, heal, clientEntry, settle)
 * - Assert every invariant (1-11 + log-matching on committed prefix) after EVERY action
 * - Negative controls:
 *   (a) remove election restriction
 *   (b) let leader commit entry replicated on 1 node
 *   (c) let node vote twice in a term
 *   For each negative control, show fuzz fails with seed and minimal reproducing action list.
 * - Real model passes all 2000 seeds with 0 violations.
 */

import {
  RaftModel,
  isLogMoreUpToDate,
} from '../src/lib/worlds/raft-model.ts';

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function assertAllInvariants(model, context = '') {
  // -------------------------------------------------------------
  // Invariant 1: At most one leader per term
  // -------------------------------------------------------------
  const termLeaders = new Map();
  for (const election of model.electionHistory) {
    if (!termLeaders.has(election.term)) {
      termLeaders.set(election.term, new Set());
    }
    termLeaders.get(election.term).add(election.leaderId);
  }
  for (const [, node] of model.nodes) {
    if (node.role === 'leader' && node.alive) {
      if (!termLeaders.has(node.currentTerm)) {
        termLeaders.set(node.currentTerm, new Set());
      }
      termLeaders.get(node.currentTerm).add(node.id);
    }
  }
  for (const [term, leaders] of termLeaders.entries()) {
    if (leaders.size > 1) {
      throw new Error(
        `Invariant 1 Violation (Leader Uniqueness): Term ${term} has multiple leaders: [${Array.from(leaders).join(', ')}] ${context}`
      );
    }
  }

  // -------------------------------------------------------------
  // Invariant 2: At most one vote per node per term
  // -------------------------------------------------------------
  const votesSeen = new Map();
  for (const vote of model.votingHistory) {
    const key = `${vote.voterId}_t${vote.term}`;
    if (votesSeen.has(key)) {
      const prev = votesSeen.get(key);
      if (prev !== vote.candidateId) {
        throw new Error(
          `Invariant 2 Violation (Election Safety): Node ${vote.voterId} voted for multiple candidates in term ${vote.term}: Node ${prev} and Node ${vote.candidateId} ${context}`
        );
      }
    } else {
      votesSeen.set(key, vote.candidateId);
    }
  }

  // -------------------------------------------------------------
  // Invariant 3: Leader terms strictly increase per election
  // -------------------------------------------------------------
  for (let i = 1; i < model.electionHistory.length; i++) {
    const prev = model.electionHistory[i - 1];
    const curr = model.electionHistory[i];
    if (curr.term <= prev.term) {
      throw new Error(
        `Invariant 3 Violation (Term Monotonicity): Election ${i} (term ${curr.term}) <= Election ${i - 1} (term ${prev.term}) ${context}`
      );
    }
  }

  // -------------------------------------------------------------
  // Invariant 4: No candidate wins with < 2 votes
  // -------------------------------------------------------------
  for (const election of model.electionHistory) {
    if (election.votes.length < 2) {
      throw new Error(
        `Invariant 4 Violation (Quorum Majority): Candidate Node ${election.leaderId} won term ${election.term} with only ${election.votes.length} votes (< 2 required) ${context}`
      );
    }
  }

  // -------------------------------------------------------------
  // Invariant 5: Commit requires majority + current-term entry
  // -------------------------------------------------------------
  for (const [, node] of model.nodes) {
    if (node.commitIndex > 0) {
      for (let idx = 1; idx <= node.commitIndex; idx++) {
        const entry = node.log[idx - 1];
        if (!entry) {
          throw new Error(
            `Invariant 5 Violation: Node ${node.id} commitIndex=${node.commitIndex} exceeds log length=${node.log.length} ${context}`
          );
        }
        let replicas = 0;
        for (const [, peer] of model.nodes) {
          if (
            peer.log.length >= idx &&
            peer.log[idx - 1].term === entry.term &&
            peer.log[idx - 1].label === entry.label
          ) {
            replicas++;
          }
        }
        if (replicas < 2) {
          throw new Error(
            `Invariant 5 Violation (Commit Majority): Node ${node.id} has committed entry at index ${idx} with only ${replicas} replica (< 2 required) ${context}`
          );
        }
      }
    }
  }

  // -------------------------------------------------------------
  // Invariant 6: Minority partition never elects
  // -------------------------------------------------------------
  for (const election of model.electionHistory) {
    // If voters count is < 2, violation
    if (election.votes.length < 2) {
      throw new Error(
        `Invariant 6 Violation (Minority Election): Node ${election.leaderId} elected with minority votes: [${election.votes.join(', ')}] ${context}`
      );
    }
  }

  // -------------------------------------------------------------
  // Invariant 7: A down node never sends or receives
  // -------------------------------------------------------------
  const lastEvent = model.eventLog[model.eventLog.length - 1];
  if (lastEvent && lastEvent.success) {
    const toId = lastEvent.args.to || lastEvent.args.toId;
    const fromId = lastEvent.args.from || lastEvent.args.fromId || lastEvent.args.leaderId;
    if (toId && model.nodes.get(toId)?.role === 'down' && lastEvent.event !== 'recover') {
      throw new Error(
        `Invariant 7 Violation (Down Node Isolation): Down Node ${toId} received event ${lastEvent.event} ${context}`
      );
    }
    if (fromId && model.nodes.get(fromId)?.role === 'down' && lastEvent.event !== 'recover') {
      throw new Error(
        `Invariant 7 Violation (Down Node Isolation): Down Node ${fromId} sent event ${lastEvent.event} ${context}`
      );
    }
  }

  // -------------------------------------------------------------
  // Invariant 8: Recovered node log equals pre-crash log until it receives entries
  // -------------------------------------------------------------
  for (const [id, recLog] of model.recoveredInitialLogs) {
    const preLog = model.preCrashLogs.get(id);
    if (preLog) {
      if (preLog.length !== recLog.length) {
        throw new Error(
          `Invariant 8 Violation (Crash Persistence): Node ${id} log altered across crash: pre=${preLog.length}, rec=${recLog.length} ${context}`
        );
      }
      for (let i = 0; i < preLog.length; i++) {
        if (preLog[i].term !== recLog[i].term || preLog[i].label !== recLog[i].label) {
          throw new Error(
            `Invariant 8 Violation (Crash Persistence): Node ${id} entry ${i} corrupted across crash boundary ${context}`
          );
        }
      }
    }
  }

  // -------------------------------------------------------------
  // Invariant 9: Log matching on committed prefix
  // -------------------------------------------------------------
  const nodesArr = Array.from(model.nodes.values());
  for (let i = 0; i < nodesArr.length; i++) {
    for (let j = i + 1; j < nodesArr.length; j++) {
      const nodeA = nodesArr[i];
      const nodeB = nodesArr[j];
      const minCommit = Math.min(nodeA.commitIndex, nodeB.commitIndex);
      for (let k = 0; k < minCommit; k++) {
        const entryA = nodeA.log[k];
        const entryB = nodeB.log[k];
        if (entryA.term !== entryB.term || entryA.label !== entryB.label) {
          throw new Error(
            `Invariant 9 Violation (Log Matching): Node ${nodeA.id} and Node ${nodeB.id} differ on committed prefix at index ${k + 1}: Node ${nodeA.id}(term ${entryA.term}, "${entryA.label}") vs Node ${nodeB.id}(term ${entryB.term}, "${entryB.label}") ${context}`
          );
        }
      }
    }
  }

  // -------------------------------------------------------------
  // Invariant 10: No vote is granted to candidate with less up-to-date log
  // -------------------------------------------------------------
  for (const vote of model.votingHistory) {
    const upToDate =
      vote.candLastTerm > vote.voterLastTerm ||
      (vote.candLastTerm === vote.voterLastTerm && vote.candLogLength >= vote.voterLogLength);
    if (!upToDate) {
      throw new Error(
        `Invariant 10 Violation (Election Restriction §5.4.1): Node ${vote.voterId} granted vote to Node ${vote.candidateId} in term ${vote.term} with less up-to-date log: cand(term=${vote.candLastTerm}, len=${vote.candLogLength}) < voter(term=${vote.voterLastTerm}, len=${vote.voterLogLength}) ${context}`
      );
    }
  }

  // -------------------------------------------------------------
  // Invariant 11: No committed entry is ever lost or overwritten
  // -------------------------------------------------------------
  for (const [, node] of model.nodes) {
    for (let idx = 1; idx <= node.commitIndex; idx++) {
      const committed = model.committedRegistry.get(idx);
      if (committed) {
        const actual = node.log[idx - 1];
        if (!actual || actual.term !== committed.term || actual.label !== committed.label) {
          throw new Error(
            `Invariant 11 Violation (Leader Completeness §5.4.3): Node ${node.id} committed index ${idx} differs from registry ${context}`
          );
        }
      }
    }
  }
}

// -------------------------------------------------------------
// Action generator
// -------------------------------------------------------------
export function generateActionSequence(seed, maxLen = 40) {
  const rng = mulberry32(seed);
  const len = 15 + Math.floor(rng() * (maxLen - 14));
  const actions = [];
  const actionTypes = ['crash', 'recover', 'isolate', 'heal', 'clientEntry', 'settle'];
  let entryCount = 0;

  for (let i = 0; i < len; i++) {
    const type = actionTypes[Math.floor(rng() * actionTypes.length)];
    const targetNode = 1 + Math.floor(rng() * 3);
    if (type === 'clientEntry') {
      entryCount++;
      actions.push({ type, entryLabel: `Entry #${entryCount}` });
    } else if (type === 'crash' || type === 'recover' || type === 'isolate') {
      actions.push({ type, node: targetNode });
    } else {
      actions.push({ type });
    }
  }
  return actions;
}

export function executeAction(model, action) {
  switch (action.type) {
    case 'crash':
      model.crash(action.node);
      break;
    case 'recover':
      model.recover(action.node);
      break;
    case 'isolate':
      model.isolate(action.node);
      break;
    case 'heal':
      model.heal();
      break;
    case 'clientEntry': {
      // Find alive leader if any
      const leader = Array.from(model.nodes.values()).find(
        (n) => n.role === 'leader' && n.alive
      );
      if (leader) {
        model.clientEntry(leader.id, action.entryLabel);
      }
      break;
    }
    case 'settle':
      model.settle();
      break;
  }
}

// -------------------------------------------------------------
// Negative Control Mutant 1: Remove election restriction
// -------------------------------------------------------------
class RaftModelNoElectionRestriction extends RaftModel {
  settle() {
    let majorityGroup = null;
    for (const group of this.partitionGroups) {
      const aliveInGroup = group.filter((id) => this.nodes.get(id)?.alive);
      if (aliveInGroup.length >= 2) {
        majorityGroup = aliveInGroup.sort((a, b) => a - b);
        break;
      }
    }
    if (!majorityGroup) return super.settle();

    // When election restriction is removed, any node can time out and win,
    // including a node with a lagging log.
    let laggingId = majorityGroup[0];
    for (const id of majorityGroup) {
      if (isLogMoreUpToDate(this.nodes.get(laggingId).log, this.nodes.get(id).log)) {
        laggingId = id;
      }
    }

    this.timeout(laggingId);
    for (const peerId of majorityGroup) {
      if (peerId !== laggingId) {
        this.requestVote(laggingId, peerId);
      }
    }
    return super.settle();
  }

  requestVote(from, to) {
    if (!this.canCommunicate(from, to)) return false;
    const candidate = this.nodes.get(from);
    const voter = this.nodes.get(to);
    if (!candidate || !voter || !candidate.alive || !voter.alive) return false;

    if (candidate.currentTerm > voter.currentTerm) {
      voter.currentTerm = candidate.currentTerm;
      voter.role = 'follower';
      voter.votedFor = null;
      voter.votesReceived.clear();
    } else if (candidate.currentTerm < voter.currentTerm) {
      candidate.currentTerm = voter.currentTerm;
      candidate.role = 'follower';
      return false;
    }

    const canGrantVote = voter.votedFor === null || voter.votedFor === from;
    const candLastTerm = candidate.log.length > 0 ? candidate.log[candidate.log.length - 1].term : 0;
    const voterLastTerm = voter.log.length > 0 ? voter.log[voter.log.length - 1].term : 0;

    // MUTATION: remove election restriction (grant vote even if candidate log is less up-to-date)
    if (canGrantVote) {
      voter.votedFor = from;
      candidate.votesReceived.add(to);
      this.votingHistory.push({
        term: candidate.currentTerm,
        voterId: to,
        candidateId: from,
        candLastTerm,
        candLogLength: candidate.log.length,
        voterLastTerm,
        voterLogLength: voter.log.length,
      });

      const reachableVotes = Array.from(candidate.votesReceived).filter(
        (v) => v === from || this.canCommunicate(from, v)
      ).length;
      if (reachableVotes >= 2) {
        candidate.role = 'leader';
        this.electionHistory.push({
          term: candidate.currentTerm,
          leaderId: from,
          votes: Array.from(candidate.votesReceived),
        });
      }
      return true;
    }
    return false;
  }
}

// -------------------------------------------------------------
// Negative Control Mutant 2: Commit on 1 replica
// -------------------------------------------------------------
class RaftModelCommitOneReplica extends RaftModel {
  clientEntry(leaderId, label) {
    const success = super.clientEntry(leaderId, label);
    if (success) {
      const leader = this.nodes.get(leaderId);
      // MUTATION: leader immediately marks entry committed with only 1 replica (itself)
      leader.commitIndex = leader.log.length;
    }
    return success;
  }
}

// -------------------------------------------------------------
// Negative Control Mutant 3: Vote twice in a term
// -------------------------------------------------------------
class RaftModelVoteTwice extends RaftModel {
  settle() {
    let majorityGroup = null;
    for (const group of this.partitionGroups) {
      const aliveInGroup = group.filter((id) => this.nodes.get(id)?.alive);
      if (aliveInGroup.length >= 2) {
        majorityGroup = aliveInGroup.sort((a, b) => a - b);
        break;
      }
    }
    if (majorityGroup && majorityGroup.length >= 2) {
      // Both nodes run in the same term, voter votes for both
      const c1 = majorityGroup[0];
      const c2 = majorityGroup[1];
      this.timeout(c1);
      const node2 = this.nodes.get(c2);
      node2.role = 'candidate';
      node2.currentTerm = this.nodes.get(c1).currentTerm;
      node2.votedFor = c2;
      node2.votesReceived = new Set([c2]);

      for (const peer of majorityGroup) if (peer !== c1) this.requestVote(c1, peer);
      for (const peer of majorityGroup) if (peer !== c2) this.requestVote(c2, peer);
      return { settled: true, noQuorum: false, message: 'mutant split', leaderId: c1 };
    }
    return super.settle();
  }

  requestVote(from, to) {
    if (!this.canCommunicate(from, to)) return false;
    const candidate = this.nodes.get(from);
    const voter = this.nodes.get(to);
    if (!candidate || !voter || !candidate.alive || !voter.alive) return false;

    if (candidate.currentTerm > voter.currentTerm) {
      voter.currentTerm = candidate.currentTerm;
      voter.role = 'follower';
      voter.votedFor = null;
      voter.votesReceived.clear();
    } else if (candidate.currentTerm < voter.currentTerm) {
      candidate.currentTerm = voter.currentTerm;
      candidate.role = 'follower';
      return false;
    }

    // MUTATION: voter grants vote even if it already voted for someone else in this term
    voter.votedFor = from;
    candidate.votesReceived.add(to);

    const candLastTerm = candidate.log.length > 0 ? candidate.log[candidate.log.length - 1].term : 0;
    const voterLastTerm = voter.log.length > 0 ? voter.log[voter.log.length - 1].term : 0;
    this.votingHistory.push({
      term: candidate.currentTerm,
      voterId: to,
      candidateId: from,
      candLastTerm,
      candLogLength: candidate.log.length,
      voterLastTerm,
      voterLogLength: voter.log.length,
    });

    const reachableVotes = Array.from(candidate.votesReceived).filter(
      (v) => v === from || this.canCommunicate(from, v)
    ).length;
    if (reachableVotes >= 2) {
      candidate.role = 'leader';
      this.electionHistory.push({
        term: candidate.currentTerm,
        leaderId: from,
        votes: Array.from(candidate.votesReceived),
      });
    }
    return true;
  }
}

// -------------------------------------------------------------
// Action sequence minimizer
// -------------------------------------------------------------
function minimizeActionList(mutantClass, actions) {
  // Test if a sequence reproduces failure
  function fails(seq) {
    try {
      const m = new mutantClass([1, 2, 3]);
      for (const act of seq) {
        executeAction(m, act);
        assertAllInvariants(m, `during minimization`);
      }
      return false;
    } catch {
      return true;
    }
  }

  let current = [...actions];
  // Greedy 1-by-1 removal
  let i = 0;
  while (i < current.length) {
    const candidate = current.filter((_, idx) => idx !== i);
    if (fails(candidate)) {
      current = candidate;
    } else {
      i++;
    }
  }
  return current;
}

// -------------------------------------------------------------
// Main execution
// -------------------------------------------------------------
export function runFuzz() {
  console.log('================================================================');
  console.log(' RAFT MODEL FUZZ VERIFICATION SUITE');
  console.log(' 2000 Seeded Random Action Runs (length 15-40)');
  console.log(' Actions: crash, recover, isolate, heal, clientEntry, settle');
  console.log(' Auditing Invariants 1-11 + Log Matching after EVERY action');
  console.log('================================================================\n');

  // --- PART 1: NEGATIVE CONTROLS ---
  console.log('----------------------------------------------------------------');
  console.log(' PART 1: NEGATIVE CONTROLS (MUTATION AUDIT)');
  console.log(' Demonstrating that fuzzer catches rule violations & minimizes actions');
  console.log('----------------------------------------------------------------\n');

  const negativeControlReports = [];

  // Negative Control A: Remove Election Restriction
  {
    let caught = null;
    for (let seed = 1; seed <= 500; seed++) {
      const actions = generateActionSequence(seed, 30);
      try {
        const m = new RaftModelNoElectionRestriction([1, 2, 3]);
        for (let a = 0; a < actions.length; a++) {
          executeAction(m, actions[a]);
          assertAllInvariants(m, `[Seed ${seed}, Action ${a + 1}: ${actions[a].type}]`);
        }
      } catch (err) {
        caught = { seed, err: err.message, actions };
        break;
      }
    }
    if (caught) {
      const minList = minimizeActionList(RaftModelNoElectionRestriction, caught.actions);
      const rep = `NEGATIVE CONTROL (a) [Remove election restriction]:
  - Result: FAILED as expected on seed ${caught.seed}
  - Invariant Violated: ${caught.err}
  - Minimal Reproducing Action List (${minList.length} actions):
${minList.map((a, i) => `    ${i + 1}. ${a.type}${a.node ? `(Node ${a.node})` : ''}${a.entryLabel ? `("${a.entryLabel}")` : ''}`).join('\n')}`;
      console.log(rep + '\n');
      negativeControlReports.push(rep);
    } else {
      console.error('Negative control (a) unexpectedly passed!');
    }
  }

  // Negative Control B: Commit with 1 Replica
  {
    let caught = null;
    for (let seed = 1; seed <= 500; seed++) {
      const actions = generateActionSequence(seed, 30);
      try {
        const m = new RaftModelCommitOneReplica([1, 2, 3]);
        for (let a = 0; a < actions.length; a++) {
          executeAction(m, actions[a]);
          assertAllInvariants(m, `[Seed ${seed}, Action ${a + 1}: ${actions[a].type}]`);
        }
      } catch (err) {
        caught = { seed, err: err.message, actions };
        break;
      }
    }
    if (caught) {
      const minList = minimizeActionList(RaftModelCommitOneReplica, caught.actions);
      const rep = `NEGATIVE CONTROL (b) [Commit with 1 replica]:
  - Result: FAILED as expected on seed ${caught.seed}
  - Invariant Violated: ${caught.err}
  - Minimal Reproducing Action List (${minList.length} actions):
${minList.map((a, i) => `    ${i + 1}. ${a.type}${a.node ? `(Node ${a.node})` : ''}${a.entryLabel ? `("${a.entryLabel}")` : ''}`).join('\n')}`;
      console.log(rep + '\n');
      negativeControlReports.push(rep);
    } else {
      console.error('Negative control (b) unexpectedly passed!');
    }
  }

  // Negative Control C: Vote twice in a term
  {
    let caught = null;
    for (let seed = 1; seed <= 500; seed++) {
      const actions = generateActionSequence(seed, 30);
      try {
        const m = new RaftModelVoteTwice([1, 2, 3]);
        for (let a = 0; a < actions.length; a++) {
          executeAction(m, actions[a]);
          assertAllInvariants(m, `[Seed ${seed}, Action ${a + 1}: ${actions[a].type}]`);
        }
      } catch (err) {
        caught = { seed, err: err.message, actions };
        break;
      }
    }
    if (caught) {
      const minList = minimizeActionList(RaftModelVoteTwice, caught.actions);
      const rep = `NEGATIVE CONTROL (c) [Vote twice in a term]:
  - Result: FAILED as expected on seed ${caught.seed}
  - Invariant Violated: ${caught.err}
  - Minimal Reproducing Action List (${minList.length} actions):
${minList.map((a, i) => `    ${i + 1}. ${a.type}${a.node ? `(Node ${a.node})` : ''}${a.entryLabel ? `("${a.entryLabel}")` : ''}`).join('\n')}`;
      console.log(rep + '\n');
      negativeControlReports.push(rep);
    } else {
      console.error('Negative control (c) unexpectedly passed!');
    }
  }

  // --- PART 2: REAL MODEL FUZZ RUN ---
  console.log('----------------------------------------------------------------');
  console.log(' PART 2: REAL MODEL FUZZ RUN (SEEDS 1..2000)');
  console.log('----------------------------------------------------------------\n');

  const startMs = Date.now();
  let totalActions = 0;
  let violationsFound = 0;
  const violationDetails = [];

  for (let seed = 1; seed <= 2000; seed++) {
    const actions = generateActionSequence(seed, 40);
    const model = new RaftModel([1, 2, 3]);

    for (let a = 0; a < actions.length; a++) {
      totalActions++;
      const action = actions[a];
      try {
        executeAction(model, action);
        assertAllInvariants(model, `[Seed ${seed}, Step ${a + 1}: ${action.type}]`);
      } catch (err) {
        violationsFound++;
        violationDetails.push(`Seed ${seed} action ${a + 1} (${action.type}): ${err.message}`);
        break;
      }
    }

    if (seed % 500 === 0) {
      console.log(`  Completed ${seed}/2000 seeds (${totalActions} actions executed, ${violationsFound} violations)...`);
    }
  }

  const durationMs = Date.now() - startMs;
  console.log('\n================================================================');
  console.log(' FUZZ RUN RESULTS');
  console.log('================================================================');
  console.log(` Seeds evaluated:     1..2000 (2000 seeds)`);
  console.log(` Total actions run:   ${totalActions}`);
  console.log(` Invariant checks:    ${totalActions * 11} checks evaluated`);
  console.log(` Violations found:    ${violationsFound}`);
  console.log(` Execution duration:  ${(durationMs / 1000).toFixed(2)}s`);
  console.log('================================================================');

  if (violationsFound === 0) {
    console.log(' STATUS: ALL INVARIANTS HELD ACROSS ALL 2000 SEEDS. PASS.');
    console.log('================================================================\n');
    return { success: true, totalActions, violationsFound, negativeControlReports };
  } else {
    console.error(` STATUS: FAILED WITH ${violationsFound} VIOLATIONS:`);
    for (const v of violationDetails.slice(0, 10)) {
      console.error(`  - ${v}`);
    }
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith('fuzz-raft-model.mjs')) {
  runFuzz();
}
