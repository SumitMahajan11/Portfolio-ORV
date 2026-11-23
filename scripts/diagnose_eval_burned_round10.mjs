import fs from 'fs';
import { DEV_AND_ADV_QUERIES } from './check_kb_clean.mjs';
import {
  searchBiyooKb,
  ENTRY_PRIMARY_TERMS,
  STOP_WORDS,
  SYNONYM_MAP,
  lightStem
} from '../src/components/biyoo/puppet/biyoo-qa-matcher.ts';

// Expected mapping for indexes 35-55 (21 earlier dev queries)
// Defined at scripts/diagnose_eval_burned_round10.mjs:13-35
export const EXPECTED_35_55 = [
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

// Helper to compute token document frequency and tokens
const kb = JSON.parse(fs.readFileSync('src/content/biyoo-kb.json', 'utf8'));

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(w => SYNONYM_MAP[w] || lightStem(w))
    .filter(w => !STOP_WORDS.has(w));
}

const docFreq = new Map();
const entryTokenMap = new Map();

for (const entry of kb) {
  const tokens = new Set();
  const text = `${entry.id} ${entry.questions.join(' ')} ${entry.keywords.join(' ')}`;
  for (const t of tokenize(text)) {
    tokens.add(t);
  }
  entryTokenMap.set(entry.id, tokens);
  for (const t of tokens) {
    docFreq.set(t, (docFreq.get(t) || 0) + 1);
  }
}

function computeCandidateDetails(query) {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return { bestId: null, hasSpecificToken: false };

  let bestId = null;
  let bestScore = -1;
  let bestHasSpecific = false;

  for (const entry of kb) {
    const entryTokens = entryTokenMap.get(entry.id) || new Set();
    const primaryTerms = ENTRY_PRIMARY_TERMS[entry.id] || new Set();
    let score = 0;
    let hasSpecific = false;

    for (const qt of qTokens) {
      if (entryTokens.has(qt)) {
        let weight = (10 - (docFreq.get(qt) || 0)) / 10;
        if (primaryTerms.has(qt)) {
          weight *= 1.5;
          hasSpecific = true;
        } else if ((docFreq.get(qt) || 0) <= 2) {
          hasSpecific = true;
        }
        score += weight;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestId = entry.id;
      bestHasSpecific = hasSpecific;
    }
  }

  return { bestId, hasSpecificToken: bestHasSpecific };
}

console.log("=== BURNED SETS EVALUATION (INDEXES 20-55) ===");
console.log("| Idx | Query | Expected | Best Candidate | Best Score | 2nd Score | Cov | Specific? | Reason | Result |");
console.log("|---|---|---|---|---|---|---|---|---|---|");

let correctCount = 0;
let wrongCount = 0;
let fallbackCount = 0;
const misses = [];

for (let i = 20; i <= 55; i++) {
  const query = DEV_AND_ADV_QUERIES[i];
  const isAdversarial = i <= 34;
  const expected = isAdversarial ? '[FALLBACK]' : EXPECTED_35_55[i - 35];

  const res = searchBiyooKb(query);
  const cand = computeCandidateDetails(query);

  const matchedId = res.matched ? res.entry.id : null;
  const bestCandidateId = res.matched ? res.entry.id : (cand.bestId || (res.fallbackChips ? res.fallbackChips[0].id : 'none'));
  const scoreStr = res.score.toFixed(2);
  const secondScoreStr = res.secondScore.toFixed(2);
  const covStr = res.coverage.toFixed(2);
  const specificStr = cand.hasSpecificToken ? 'true' : 'false';
  const reason = res.reason;

  let status = '';
  if (isAdversarial) {
    if (!res.matched) {
      status = 'CORRECT (FALLBACK)';
      correctCount++;
    } else {
      status = 'WRONG (MATCHED ADVERSARIAL)';
      wrongCount++;
      misses.push({ index: i, query, expected, matched: matchedId, reason });
    }
  } else {
    if (res.matched && matchedId === expected) {
      status = 'CORRECT';
      correctCount++;
    } else if (res.matched && matchedId !== expected) {
      status = 'WRONG MATCH';
      wrongCount++;
      misses.push({ index: i, query, expected, matched: matchedId, reason });
    } else {
      status = 'FALLBACK (MISS)';
      fallbackCount++;
      misses.push({ index: i, query, expected, matched: 'null', reason });
    }
  }

  console.log(`| ${i} | "${query}" | ${expected} | ${bestCandidateId} | ${scoreStr} | ${secondScoreStr} | ${covStr} | ${specificStr} | ${reason} | ${status} |`);
}

console.log("\n--- SUMMARY COUNTS ---");
console.log(`Total rows evaluated: 36`);
console.log(`Correct: ${correctCount}`);
console.log(`Wrong-entry: ${wrongCount}`);
console.log(`Fallback (in-scope misses): ${fallbackCount}`);
console.log(`\n--- LIST OF MISSES (${misses.length} total) ---`);
for (const m of misses) {
  console.log(`- Index ${m.index}: "${m.query}" => Expected: ${m.expected}, Matched: ${m.matched}, Reason: ${m.reason}`);
}

