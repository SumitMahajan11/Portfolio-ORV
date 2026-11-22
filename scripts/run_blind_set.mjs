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

// Pre-build index of KB tokens and document frequency exactly as in matcher
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
  if (!cleanQ) {
    return {
      matched: false,
      matchedId: 'FALLBACK',
      score: 0,
      secondScore: 0,
      coverage: 0,
      fallbackReason: 'min score'
    };
  }

  // 1. Deny filters
  for (const pattern of DENY_PATTERNS) {
    if (pattern.test(cleanQ)) {
      return {
        matched: false,
        matchedId: 'FALLBACK',
        score: 0,
        secondScore: 0,
        coverage: 0,
        fallbackReason: 'deny'
      };
    }
  }

  // 2. Identity query detection
  const qTokensRaw = cleanAndTokenize(cleanQ);
  if (
    (qTokensRaw.includes('who') || qTokensRaw.includes('what')) &&
    (qTokensRaw.includes('you') || qTokensRaw.includes('biyoo'))
  ) {
    return {
      matched: true,
      matchedId: 'biyoo-mascot',
      score: 5.0,
      secondScore: 0,
      coverage: 1.0,
      fallbackReason: null
    };
  }

  // 3. Extract content tokens
  const qTokens = extractContentTokens(cleanQ);
  if (qTokens.length === 0) {
    return {
      matched: false,
      matchedId: 'FALLBACK',
      score: 0,
      secondScore: 0,
      coverage: 0,
      fallbackReason: 'min score'
    };
  }

  const scores = [];

  for (const entry of kbEntries) {
    const entryTokens = entryTokenSets.get(entry.id);
    if (!entryTokens) continue;

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
        if (primaryTerms.has(qt)) {
          weight *= 1.50;
        }
        score += weight;
      }
    }

    const coverage = matchedTokensCount / qTokens.length;
    scores.push({
      entry,
      score,
      coverage
    });
  }

  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];
  const second = scores[1];
  const secondScore = second ? second.score : 0;

  let fallbackReason = null;
  let isMatched = false;

  if (best && best.coverage >= MIN_CONTENT_COVERAGE && best.score >= MIN_ACCEPT_SCORE) {
    if (!second || best.score >= second.score * (1 + MIN_SCORE_MARGIN) || best.score > second.score + ABSOLUTE_MARGIN) {
      isMatched = true;
    } else {
      fallbackReason = 'margin';
    }
  } else if (best) {
    if (best.coverage < MIN_CONTENT_COVERAGE) {
      fallbackReason = 'coverage';
    } else if (best.score < MIN_ACCEPT_SCORE) {
      fallbackReason = 'min score';
    }
  } else {
    fallbackReason = 'min score';
  }

  return {
    matched: isMatched,
    matchedId: isMatched ? best.entry.id : 'FALLBACK',
    bestEntryId: best ? best.entry.id : 'none',
    score: best ? best.score : 0,
    secondScore: secondScore,
    coverage: best ? best.coverage : 0,
    fallbackReason: isMatched ? null : fallbackReason
  };
}

const blindSet = JSON.parse(fs.readFileSync('scripts/blind_set.json', 'utf8'));

console.log('=== BLIND RUN RESULTS ===\n');

const results = [];
let inScopePass = 0;
let inScopeFallback = 0;
let inScopeWrongEntry = 0;

const inScopeMisses = [];

for (const item of blindSet.in_scope) {
  const actualMatcherRes = searchBiyooKb(item.query);
  const detail = analyzeQuery(item.query);

  const matchedId = actualMatcherRes.matched ? actualMatcherRes.entry.id : 'FALLBACK';
  let status = 'PASS';

  if (matchedId === item.expected) {
    inScopePass++;
  } else if (!actualMatcherRes.matched) {
    inScopeFallback++;
    status = 'FALLBACK_MISS';
    inScopeMisses.push({
      query: item.query,
      expected: item.expected,
      matched: 'FALLBACK',
      type: 'fallback',
      score: detail.score,
      secondScore: detail.secondScore,
      coverage: detail.coverage,
      reason: detail.fallbackReason
    });
  } else {
    inScopeWrongEntry++;
    status = 'WRONG_ENTRY_MISS';
    inScopeMisses.push({
      query: item.query,
      expected: item.expected,
      matched: matchedId,
      type: 'wrong_entry',
      score: detail.score,
      secondScore: detail.secondScore,
      coverage: detail.coverage,
      reason: `matched wrong id '${matchedId}' instead of '${item.expected}'`
    });
  }

  results.push({
    category: 'in-scope',
    query: item.query,
    expected: item.expected,
    matchedId,
    score: detail.score,
    secondScore: detail.secondScore,
    coverage: detail.coverage,
    reason: detail.fallbackReason || 'N/A',
    status
  });
}

let advPass = 0;
let advFail = 0;
const advMisses = [];

for (const query of blindSet.adversarial) {
  const actualMatcherRes = searchBiyooKb(query);
  const detail = analyzeQuery(query);

  const matchedId = actualMatcherRes.matched ? actualMatcherRes.entry.id : 'FALLBACK';
  let status = 'PASS';

  if (!actualMatcherRes.matched) {
    advPass++;
  } else {
    advFail++;
    status = 'UNWANTED_MATCH';
    advMisses.push({
      query,
      expected: 'FALLBACK',
      matched: matchedId,
      type: 'unwanted_match',
      score: detail.score,
      secondScore: detail.secondScore,
      coverage: detail.coverage,
      reason: `matched id '${matchedId}' (should have fallen back)`
    });
  }

  results.push({
    category: 'adversarial',
    query,
    expected: 'FALLBACK',
    matchedId,
    score: detail.score,
    secondScore: detail.secondScore,
    coverage: detail.coverage,
    reason: detail.fallbackReason || 'N/A',
    status
  });
}

console.log('| Category | Query | Expected | Matched ID | Score | Second Score | Coverage | Fallback Reason |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of results) {
  const covPct = Math.round(r.coverage * 100) + '%';
  console.log(`| ${r.category} | "${r.query}" | ${r.expected} | ${r.matchedId} | ${r.score.toFixed(3)} | ${r.secondScore.toFixed(3)} | ${covPct} | ${r.reason} |`);
}

console.log('\n=== SUMMARY ===');
console.log(`In-Scope Total: ${blindSet.in_scope.length}`);
console.log(`In-Scope Pass: ${inScopePass}`);
console.log(`In-Scope Fallbacks: ${inScopeFallback}`);
console.log(`In-Scope Wrong-Entry Matches: ${inScopeWrongEntry}`);
console.log(`Adversarial Total: ${blindSet.adversarial.length}`);
console.log(`Adversarial Pass (Fell Back): ${advPass}`);
console.log(`Adversarial Unwanted Matches: ${advFail}`);

console.log('\n=== IN-SCOPE MISSES LIST ===');
if (inScopeMisses.length === 0) {
  console.log('None.');
} else {
  for (const m of inScopeMisses) {
    console.log(`- Query: "${m.query}"`);
    console.log(`  Expected: ${m.expected} | Matched: ${m.matched} (${m.type})`);
    console.log(`  Score: ${m.score.toFixed(3)} | Second Score: ${m.secondScore.toFixed(3)} | Coverage: ${Math.round(m.coverage * 100)}% | Reason: ${m.reason}`);
  }
}

console.log('\n=== ADVERSARIAL MISSES LIST ===');
if (advMisses.length === 0) {
  console.log('None.');
} else {
  for (const m of advMisses) {
    console.log(`- Query: "${m.query}"`);
    console.log(`  Expected: ${m.expected} | Matched: ${m.matched}`);
    console.log(`  Score: ${m.score.toFixed(3)} | Second Score: ${m.secondScore.toFixed(3)} | Coverage: ${Math.round(m.coverage * 100)}% | Reason: ${m.reason}`);
  }
}
