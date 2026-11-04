# 10 World: Ratify (Raft) as Naruto: Hidden Leaf

Phase: 2. Palette: raft. Biyoo costume: leaf headband.

## Story mapping
Nodes = ninja with faces. Terms = Hokage eras. Leader = current Hokage. When the Hokage falls (leader crash), the council holds an election and a new Hokage rises. Log replication = scrolls passed village to village.

## Beats
1. Village of 3 nodes (matches the real 3-node scope).
2. Normal era: heartbeats as signal flares, log entries as scrolls.
3. Leader fails: era ends, election animation, new term number.
4. Network partition: village split by a wall, then healing.
5. Proof: TLA+ model checked, no invariant violations. Porcupine + Wing & Gong checks. 4 historical bug classes reproduced. 68 tests. UCB1 fuzzer +32.36% over random. Recorded demo embed/link.
6. Required honesty line: "3-node, correctness project, not a performance benchmark."

## Don'ts
No throughput or latency claims. No "production-ready".

## Done when
Election animation accurate to Raft rules (one leader per term, majority vote), static fallback exists, all claims match 03.
