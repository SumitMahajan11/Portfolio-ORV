import fs from 'fs';
import {
  searchBiyooKb,
  kbEntries,
  DENY_PATTERNS,
  MIN_CONTENT_COVERAGE,
  MIN_ACCEPT_SCORE,
  MIN_SCORE_MARGIN,
  ABSOLUTE_MARGIN,
  cleanAndTokenize,
  extractContentTokens,
  levenshtein,
  ENTRY_PRIMARY_TERMS,
  STOP_WORDS,
  normalizeToken
} from '../src/components/biyoo/puppet/biyoo-qa-matcher.ts';

const EARLIER_21 = [
  { expected: 'who-is-sumit', q: 'tell me about the author' },
  { expected: 'current-status', q: 'what year of study is he currently in' },
  { expected: 'current-status', q: 'what university does sumit attend' },
  { expected: 'current-status', q: 'where did he go to college' },
  { expected: 'ratify-raft', q: 'did he build a raft implementation' },
  { expected: 'ratify-raft', q: 'does ratify handle network partitions' },
  { expected: 'iac-verifier-z3', q: 'how does iac verifier use z3' },
  { expected: 'iac-verifier-z3', q: 'what security flaws can the terraform tool find' },
  { expected: 'ratify-raft', q: 'what is ratify' },
  { expected: 'strongest-evidence', q: 'how do you prove these projects work' },
  { expected: 'strongest-evidence', q: 'show me the recorded test artifacts' },
  { expected: 'tech-focus', q: 'what is his primary technical stack' },
  { expected: 'tech-focus', q: 'what languages does he code in' },
  { expected: 'contact', q: 'how can i contact sumit' },
  { expected: 'contact', q: 'is there an email address' },
  { expected: 'biyoo-mascot', q: 'what is this little creature' },
  { expected: 'biyoo-mascot', q: 'why is there a mascot on this site' },
  { expected: 'iac-verifier-z3', q: 'has he done any formal verification' },
  { expected: 'ratify-raft', q: 'does he have distributed systems experience' },
  { expected: 'strongest-evidence', q: 'can i see evidence of raft passing tests' },
  { expected: 'contact', q: 'send an email to the creator' }
];

const entryTokenSets = new Map();
const docFreq = new Map();

for (const entry of kbEntries) {
  const allTexts = [...entry.questions, ...entry.keywords];
  const tokens = new Set();
  for (const text of allTexts) {
    for (const t of cleanAndTokenize(text)) {
      if (!STOP_WORDS.has(t)) {
        tokens.add(normalizeToken(t));
      }
    }
  }
  entryTokenSets.set(entry.id, tokens);
  for (const t of tokens) {
    docFreq.set(t, (docFreq.get(t) || 0) + 1);
  }
}

const N = kbEntries.length;
function getWeight(token) {
  const df = docFreq.get(token) || 1;
  return Math.log(1 + (N + 1) / df);
}

function analyzeQuery(rawQuery) {
  const cleanQ = (rawQuery || '').trim();
  for (const pattern of DENY_PATTERNS) {
    if (pattern.test(cleanQ)) {
      return { score: 0, secondScore: 0, coverage: 0, reason: 'deny', matchedId: 'FALLBACK' };
    }
  }
  const qTokensRaw = cleanAndTokenize(cleanQ);
  if ((qTokensRaw.includes('who') || qTokensRaw.includes('what')) && (qTokensRaw.includes('you') || qTokensRaw.includes('biyoo'))) {
    return { score: 5.0, secondScore: 0, coverage: 1.0, reason: null, matchedId: 'biyoo-mascot' };
  }
  const qTokens = extractContentTokens(cleanQ);
  const scores = [];
  for (const entry of kbEntries) {
    const entryTokens = entryTokenSets.get(entry.id);
    const primaryTerms = ENTRY_PRIMARY_TERMS[entry.id] || new Set();
    let matchedTokensCount = 0;
    let score = 0;
    for (const qt of qTokens) {
      let matched = false;
      if (entryTokens.has(qt)) {
        matched = true;
      } else if (qt.length >= 4) {
        for (const et of entryTokens) {
          if (Math.abs(et.length - qt.length) <= 1 && levenshtein(qt, et) <= 1) {
            matched = true;
            break;
          }
        }
      }
      if (matched) {
        matchedTokensCount++;
        let weight = getWeight(qt);
        if (primaryTerms.has(qt)) weight *= 1.5;
        score += weight;
      }
    }
    scores.push({ entry, score, coverage: matchedTokensCount / qTokens.length });
  }
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  const second = scores[1];
  const secondScore = second ? second.score : 0;
  let reason = null;
  let matched = false;
  if (best && best.coverage >= MIN_CONTENT_COVERAGE && best.score >= MIN_ACCEPT_SCORE) {
    if (!second || best.score >= second.score * (1 + MIN_SCORE_MARGIN) || best.score > second.score + ABSOLUTE_MARGIN) {
      matched = true;
    } else {
      reason = 'margin';
    }
  } else if (best) {
    if (best.coverage < MIN_CONTENT_COVERAGE) reason = 'coverage';
    else if (best.score < MIN_ACCEPT_SCORE) reason = 'min score';
  }
  return {
    matchedId: matched ? best.entry.id : 'FALLBACK',
    score: best ? best.score : 0,
    secondScore,
    coverage: best ? best.coverage : 0,
    reason: matched ? 'N/A' : reason
  };
}

console.log('| Query | Expected | Matched or Fallback | Score | Second Score | Coverage | Reason |');
console.log('|---|---|---|---|---|---|---|');
for (const item of EARLIER_21) {
  const actual = searchBiyooKb(item.q);
  const detail = analyzeQuery(item.q);
  const matchedId = actual.matched ? actual.entry.id : 'FALLBACK';
  if (matchedId !== item.expected) {
    console.log(`| "${item.q}" | ${item.expected} | ${matchedId} | ${detail.score.toFixed(3)} | ${detail.secondScore.toFixed(3)} | ${Math.round(detail.coverage * 100)}% | ${detail.reason} |`);
  }
}
