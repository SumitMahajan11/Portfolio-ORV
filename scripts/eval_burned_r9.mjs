import { DEV_AND_ADV_QUERIES } from './check_kb_clean.mjs';
import { searchBiyooKb } from '../src/components/biyoo/puppet/biyoo-qa-matcher.ts';

const EXPECTED_35_55 = [
  'who-is-sumit',        // 35: tell me about the author
  'current-status',      // 36: what year of study is he currently in
  'current-status',      // 37: what university does sumit attend
  'current-status',      // 38: where did he go to college
  'ratify-raft',         // 39: did he build a raft implementation
  'ratify-raft',         // 40: does ratify handle network partitions
  'iac-verifier-z3',     // 41: how does iac verifier use z3
  'iac-verifier-z3',     // 42: what security flaws can the terraform tool find
  'ratify-raft',         // 43: what is ratify
  'strongest-evidence',  // 44: how do you prove these projects work
  'strongest-evidence',  // 45: show me the recorded test artifacts
  'tech-focus',          // 46: what is his primary technical stack
  'tech-focus',          // 47: what languages does he code in
  'contact',             // 48: how can i contact sumit
  'contact',             // 49: is there an email address
  'biyoo-mascot',        // 50: what is this little creature
  'biyoo-mascot',        // 51: why is there a mascot on this site
  'iac-verifier-z3',     // 52: has he done any formal verification
  'ratify-raft',         // 53: does he have distributed systems experience
  'strongest-evidence',  // 54: can i see evidence of raft passing tests
  'contact'              // 55: send an email to the creator
];

console.log("=== BURNED SET EVALUATION (INDEXES 20-55) ===");
console.log("| Index | Query | Expected | Matched | Score | Second Score | Coverage | Reason | Status |");
console.log("|---|---|---|---|---|---|---|---|---|");

let correct = 0;
let wrong = 0;
let fallback = 0;
const misses = [];

// Indexes 20-34: Adversarial (must fall back)
for (let i = 20; i <= 34; i++) {
  const q = DEV_AND_ADV_QUERIES[i];
  const res = searchBiyooKb(q);
  const matchedId = res.matched ? res.entry?.id : "FALLBACK";
  const pass = !res.matched;
  let status = "";
  if (pass) {
    correct++;
    status = "CORRECT";
  } else {
    wrong++;
    status = "WRONG-ENTRY";
    misses.push({ index: i, query: q, expected: "FALLBACK", matched: matchedId, reason: res.reason });
  }
  console.log(`| ${i} | ${q} | FALLBACK | ${matchedId} | ${res.score.toFixed(2)} | ${res.secondScore.toFixed(2)} | ${(res.coverage||0).toFixed(2)} | ${res.reason} | ${status} |`);
}

// Indexes 35-55: Earlier 21 Dev queries
for (let i = 35; i <= 55; i++) {
  const q = DEV_AND_ADV_QUERIES[i];
  const expected = EXPECTED_35_55[i - 35];
  const res = searchBiyooKb(q);
  const matchedId = res.matched ? res.entry?.id : "FALLBACK";
  
  let status = "";
  if (matchedId === expected) {
    correct++;
    status = "CORRECT";
  } else if (!res.matched) {
    fallback++;
    status = "FALLBACK";
    misses.push({ index: i, query: q, expected, matched: matchedId, reason: res.reason });
  } else {
    wrong++;
    status = "WRONG-ENTRY";
    misses.push({ index: i, query: q, expected, matched: matchedId, reason: res.reason });
  }
  console.log(`| ${i} | ${q} | ${expected} | ${matchedId} | ${res.score.toFixed(2)} | ${res.secondScore.toFixed(2)} | ${(res.coverage||0).toFixed(2)} | ${res.reason} | ${status} |`);
}

console.log("\nSummary:");
console.log(`Total queries: ${36}`);
console.log(`Correct: ${correct}`);
console.log(`Wrong-entry: ${wrong}`);
console.log(`Fallback: ${fallback}`);

console.log("\nMisses list:");
if (misses.length === 0) {
  console.log("None.");
} else {
  misses.forEach(m => {
    console.log(`- Index ${m.index}: "${m.query}" | expected: ${m.expected} | got: ${m.matched} | reason: ${m.reason}`);
  });
}

