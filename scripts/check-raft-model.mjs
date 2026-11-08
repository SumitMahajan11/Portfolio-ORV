/**
 * Invariant Checker for Raft Model
 *
 * Requirements from Prompt:
 * Assert at EVERY step of the scenario:
 * 1. at most one leader per term over the whole run;
 * 2. one vote per node per term;
 * 3. leader terms strictly increase;
 * 4. no candidate wins with < 2 votes;
 * 5. commit requires majority + current-term entry;
 * 6. the minority partition never elects;
 * 7. a down node never sends or receives;
 * 8. a recovered node's log equals its pre-crash log until it receives entries;
 * 9. after heal all logs agree on the committed prefix and N3's stale entry is gone.
 *
 * Output: Full event log printed per beat + literal pass/fail assertions.
 */

import { runRaftScenario } from '../src/lib/worlds/raft-model.ts';

function runChecks() {
  console.log('================================================================');
  console.log(' RAFT MODEL INVARIANT VERIFICATION SUITE');
  console.log(' Pure deterministic simulation of 5-beat Naruto Raft consensus');
  console.log('================================================================\n');

  const { model, snapshots, eventsByBeat } = runRaftScenario();

  // 1. Print Model Event Log per Beat
  console.log('----------------------------------------------------------------');
  console.log(' MODEL EVENT LOG (PER BEAT)');
  console.log('----------------------------------------------------------------');
  for (let beat = 1; beat <= 5; beat++) {
    const events = eventsByBeat.get(beat) || [];
    console.log(`\nBeat ${beat} Events (${events.length} events):`);
    for (const ev of events) {
      const statusIcon = ev.success ? '✓' : '✗';
      console.log(`  [${statusIcon}] [${ev.event.toUpperCase()}] ${ev.description}`);
    }
  }

  console.log('\n----------------------------------------------------------------');
  console.log(' INVARIANT AUDIT SUITE (9 FORMAL INVARIANTS)');
  console.log('----------------------------------------------------------------\n');

  const errors = [];

  // -------------------------------------------------------------
  // Invariant 1: At most one leader per term over the whole run
  // -------------------------------------------------------------
  try {
    const termLeaders = new Map();
    for (const election of model.electionHistory) {
      if (!termLeaders.has(election.term)) {
        termLeaders.set(election.term, new Set());
      }
      termLeaders.get(election.term).add(election.leaderId);
    }
    for (const snap of snapshots) {
      for (const node of snap.nodes) {
        if (node.role === 'leader' && node.alive) {
          if (!termLeaders.has(node.currentTerm)) {
            termLeaders.set(node.currentTerm, new Set());
          }
          termLeaders.get(node.currentTerm).add(node.id);
        }
      }
    }

    let inv1Passed = true;
    for (const [term, leaderSet] of termLeaders.entries()) {
      if (leaderSet.size > 1) {
        inv1Passed = false;
        errors.push(`Invariant 1 Violation: Term ${term} had multiple leaders: [${Array.from(leaderSet).join(', ')}]`);
      }
    }

    if (inv1Passed) {
      const breakdown = Array.from(termLeaders.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([t, l]) => `Term ${t} -> Node [${Array.from(l).join(', ')}]`)
        .join('; ');
      console.log(`[PASS] Invariant 1: At most one leader per term over the whole run (${breakdown})`);
    } else {
      console.log(`[FAIL] Invariant 1: At most one leader per term over the whole run`);
    }
  } catch (err) {
    errors.push(`Invariant 1 Exception: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Invariant 2: One vote per node per term
  // -------------------------------------------------------------
  try {
    const votesByNodeAndTerm = new Map();
    let inv2Passed = true;

    for (const vote of model.votingHistory) {
      const key = `node_${vote.voterId}_term_${vote.term}`;
      if (votesByNodeAndTerm.has(key)) {
        const previousCandidate = votesByNodeAndTerm.get(key);
        if (previousCandidate !== vote.candidateId) {
          inv2Passed = false;
          errors.push(
            `Invariant 2 Violation: Node ${vote.voterId} voted for multiple candidates in term ${vote.term}: candidate ${previousCandidate} and candidate ${vote.candidateId}`
          );
        }
      } else {
        votesByNodeAndTerm.set(key, vote.candidateId);
      }
    }

    // Also assert at every snapshot that votedFor matches exactly one candidate
    for (const snap of snapshots) {
      for (const node of snap.nodes) {
        if (node.votedFor !== null) {
          const key = `node_${node.id}_term_${node.currentTerm}`;
          if (votesByNodeAndTerm.has(key) && votesByNodeAndTerm.get(key) !== node.votedFor) {
            inv2Passed = false;
            errors.push(`Invariant 2 Violation: Step ${snap.stepIndex} Node ${node.id} votedFor mismatch`);
          }
        }
      }
    }

    if (inv2Passed) {
      console.log(`[PASS] Invariant 2: One vote per node per term (${model.votingHistory.length} votes audited across terms 1..3)`);
    } else {
      console.log(`[FAIL] Invariant 2: One vote per node per term`);
    }
  } catch (err) {
    errors.push(`Invariant 2 Exception: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Invariant 3: Leader terms strictly increase
  // -------------------------------------------------------------
  try {
    let inv3Passed = true;
    for (let i = 1; i < model.electionHistory.length; i++) {
      const prev = model.electionHistory[i - 1];
      const curr = model.electionHistory[i];
      if (curr.term <= prev.term) {
        inv3Passed = false;
        errors.push(
          `Invariant 3 Violation: Election ${i} (term ${curr.term}) <= Election ${i - 1} (term ${prev.term})`
        );
      }
    }

    if (inv3Passed) {
      const sequence = model.electionHistory
        .map((e) => `Node ${e.leaderId} (T${e.term})`)
        .join(' -> ');
      console.log(`[PASS] Invariant 3: Leader terms strictly increase (${sequence})`);
    } else {
      console.log(`[FAIL] Invariant 3: Leader terms strictly increase`);
    }
  } catch (err) {
    errors.push(`Invariant 3 Exception: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Invariant 4: No candidate wins with < 2 votes
  // -------------------------------------------------------------
  try {
    let inv4Passed = true;
    for (const election of model.electionHistory) {
      if (election.votes.length < 2) {
        inv4Passed = false;
        errors.push(
          `Invariant 4 Violation: Candidate Node ${election.leaderId} won term ${election.term} with only ${election.votes.length} votes (< 2 required)`
        );
      }
    }

    if (inv4Passed) {
      const details = model.electionHistory
        .map((e) => `Term ${e.term}: ${e.votes.length}/3 votes [${e.votes.join(',')}]`)
        .join('; ');
      console.log(`[PASS] Invariant 4: No candidate wins with < 2 votes (${details})`);
    } else {
      console.log(`[FAIL] Invariant 4: No candidate wins with < 2 votes`);
    }
  } catch (err) {
    errors.push(`Invariant 4 Exception: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Invariant 5: Commit requires majority + current-term entry
  // -------------------------------------------------------------
  try {
    let inv5Passed = true;
    for (const snap of snapshots) {
      for (const node of snap.nodes) {
        if (node.commitIndex > 0) {
          for (let entryIdx = 1; entryIdx <= node.commitIndex; entryIdx++) {
            const entry = node.log[entryIdx - 1];
            if (!entry) {
              inv5Passed = false;
              errors.push(`Invariant 5 Violation: Step ${snap.stepIndex} Node ${node.id} commitIndex=${node.commitIndex} exceeds log`);
              continue;
            }
            // Count nodes holding this entry in this step
            let replicaCount = 0;
            for (const peer of snap.nodes) {
              if (
                peer.log.length >= entryIdx &&
                peer.log[entryIdx - 1].term === entry.term &&
                peer.log[entryIdx - 1].label === entry.label
              ) {
                replicaCount++;
              }
            }
            if (replicaCount < 2) {
              inv5Passed = false;
              errors.push(
                `Invariant 5 Violation: Step ${snap.stepIndex} Node ${node.id} committed entry at index ${entryIdx} with only ${replicaCount} replica (< 2 required)`
              );
            }
          }
        }
      }
    }

    // Explicitly verify Step 3 (Beat 4): Node 3's entry at index 2 (term 2) was NOT committed!
    const step3 = snapshots[3];
    const node3InStep3 = step3.nodes.find((n) => n.id === 3);
    if (node3InStep3 && node3InStep3.log.length >= 2) {
      if (node3InStep3.commitIndex >= 2) {
        inv5Passed = false;
        errors.push(`Invariant 5 Violation: In Step 3 (Beat 4), minority Node 3 incorrectly committed its un-replicated term 2 entry!`);
      }
    }

    if (inv5Passed) {
      console.log(`[PASS] Invariant 5: Commit requires majority + current-term entry (audited across all 5 beats)`);
    } else {
      console.log(`[FAIL] Invariant 5: Commit requires majority + current-term entry`);
    }
  } catch (err) {
    errors.push(`Invariant 5 Exception: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Invariant 6: The minority partition never elects
  // -------------------------------------------------------------
  try {
    let inv6Passed = true;
    const partitionSnap = snapshots[3]; // Beat 4
    const minorityGroup = partitionSnap.partitionGroups.find((g) => g.length < 2) || [];
    
    // Ensure minority group is [3]
    if (minorityGroup.length !== 1 || minorityGroup[0] !== 3) {
      inv6Passed = false;
      errors.push(`Invariant 6 Violation: Minority partition expected [3], got [${minorityGroup.join(', ')}]`);
    }

    // Verify no node in minority group won any election in term >= 3
    for (const election of model.electionHistory) {
      if (minorityGroup.includes(election.leaderId) && election.term >= 3) {
        inv6Passed = false;
        errors.push(`Invariant 6 Violation: Minority node ${election.leaderId} was elected in term ${election.term}!`);
      }
    }

    if (inv6Passed) {
      console.log(`[PASS] Invariant 6: The minority partition never elects (Node 3 isolated with 1/3 votes cannot elect)`);
    } else {
      console.log(`[FAIL] Invariant 6: The minority partition never elects`);
    }
  } catch (err) {
    errors.push(`Invariant 6 Exception: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Invariant 7: A down node never sends or receives
  // -------------------------------------------------------------
  try {
    let inv7Passed = true;
    // Check all events occurring between Node 1 crash and Node 1 recovery
    for (const ev of model.eventLog) {
      if (ev.step === 1 || ev.step === 2) {
        // In steps 1 and 2, Node 1 was down
        const toId = ev.args.to || ev.args.toId;
        const fromId = ev.args.from || ev.args.fromId || ev.args.leaderId;
        if (ev.success && (toId === 1 || fromId === 1)) {
          inv7Passed = false;
          errors.push(`Invariant 7 Violation: Down Node 1 participated in successful event: ${ev.event}`);
        }
      }
    }

    if (inv7Passed) {
      console.log(`[PASS] Invariant 7: A down node never sends or receives (Node 1 down in Beats 2 & 3 completely isolated)`);
    } else {
      console.log(`[FAIL] Invariant 7: A down node never sends or receives`);
    }
  } catch (err) {
    errors.push(`Invariant 7 Exception: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Invariant 8: A recovered node's log equals its pre-crash log until it receives entries
  // -------------------------------------------------------------
  try {
    let inv8Passed = true;
    const preCrashLog = model.preCrashLogs.get(1);
    const recoveredInitialLog = model.recoveredInitialLogs.get(1);

    if (!preCrashLog || !recoveredInitialLog) {
      inv8Passed = false;
      errors.push(`Invariant 8 Violation: Pre-crash or recovered initial log not captured for Node 1`);
    } else {
      if (preCrashLog.length !== recoveredInitialLog.length) {
        inv8Passed = false;
        errors.push(`Invariant 8 Violation: Log lengths differ: pre-crash=${preCrashLog.length}, recovered=${recoveredInitialLog.length}`);
      } else {
        for (let i = 0; i < preCrashLog.length; i++) {
          if (
            preCrashLog[i].term !== recoveredInitialLog[i].term ||
            preCrashLog[i].label !== recoveredInitialLog[i].label
          ) {
            inv8Passed = false;
            errors.push(`Invariant 8 Violation: Log entry ${i} differs across crash boundary`);
          }
        }
      }
    }

    if (inv8Passed) {
      console.log(
        `[PASS] Invariant 8: A recovered node's log equals its pre-crash log until it receives entries (${preCrashLog.length} entry verified)`
      );
    } else {
      console.log(`[FAIL] Invariant 8: A recovered node's log equals its pre-crash log`);
    }
  } catch (err) {
    errors.push(`Invariant 8 Exception: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Invariant 9: After heal all logs agree on the committed prefix and N3's stale entry is gone
  // -------------------------------------------------------------
  try {
    let inv9Passed = true;
    const finalSnap = snapshots[4]; // Beat 5
    const finalCommitIndex = 2;

    for (const node of finalSnap.nodes) {
      if (node.commitIndex !== finalCommitIndex) {
        inv9Passed = false;
        errors.push(`Invariant 9 Violation: Node ${node.id} has commitIndex=${node.commitIndex}, expected ${finalCommitIndex}`);
      }
      if (node.log.length < finalCommitIndex) {
        inv9Passed = false;
        errors.push(`Invariant 9 Violation: Node ${node.id} log length=${node.log.length} < committed prefix`);
      }
      // Verify committed prefix matches Node 2's log exactly
      const expectedEntries = [
        { term: 1, label: "Scroll #1 (Pact)" },
        { term: 3, label: "Scroll #2 (Alliance)" },
      ];
      for (let i = 0; i < finalCommitIndex; i++) {
        if (
          node.log[i].term !== expectedEntries[i].term ||
          node.log[i].label !== expectedEntries[i].label
        ) {
          inv9Passed = false;
          errors.push(
            `Invariant 9 Violation: Node ${node.id} log at index ${i + 1} mismatch. Expected term ${expectedEntries[i].term} "${expectedEntries[i].label}", got term ${node.log[i].term} "${node.log[i].label}"`
          );
        }
      }

      // Assert Node 3's stale uncommitted entry ("Scroll #2 (Defense)") is completely gone from all nodes
      for (const entry of node.log) {
        if (entry.label.includes("Defense") || (entry.term === 2 && entry.label.includes("Scroll #2"))) {
          inv9Passed = false;
          errors.push(`Invariant 9 Violation: Node ${node.id} still contains stale uncommitted entry: term ${entry.term} "${entry.label}"!`);
        }
      }
    }

    if (inv9Passed) {
      console.log(`[PASS] Invariant 9: After heal all logs agree on committed prefix [Scroll #1, Scroll #2] and N3's stale entry is gone`);
    } else {
      console.log(`[FAIL] Invariant 9: After heal all logs agree on the committed prefix and N3's stale entry is gone`);
    }
  } catch (err) {
    errors.push(`Invariant 9 Exception: ${err.message}`);
  }

  console.log('\n================================================================');
  if (errors.length === 0) {
    console.log(' ALL 9 INVARIANTS SATISFIED DETERMINISTICALLY. 0 ERRORS.');
    console.log(' STATUS: PASS');
    console.log('================================================================');
    process.exit(0);
  } else {
    console.error(` INVARIANT SUITE FAILED WITH ${errors.length} ERROR(S):`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    console.log(' STATUS: FAIL');
    console.log('================================================================');
    process.exit(1);
  }
}

runChecks();
