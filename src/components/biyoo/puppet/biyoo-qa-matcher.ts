import kbRaw from '../../../content/biyoo-kb.json' with { type: 'json' };

export interface BiyooKbEntry {
  id: string;
  questions: string[];
  keywords: string[];
  answer: string;
  sourceLabel: string;
  sourceHref: string;
}

export interface BiyooFallbackChip {
  id: string;
  label: string;
  entry: BiyooKbEntry;
}

export interface BiyooQaResult {
  matched: boolean;
  score: number;
  secondScore?: number;
  coverage?: number;
  reason?: 'matched' | 'deny' | 'coverage' | 'margin' | 'min_score';
  entry?: BiyooKbEntry;
  answer: string;
  sourceLabel: string;
  sourceHref: string;
  matchedText?: string;
  fallbackChips?: BiyooFallbackChip[];
}

export const kbEntries: BiyooKbEntry[] = kbRaw as BiyooKbEntry[];

export const FALLBACK_ANSWER = "I don't know that one, but the evidence section has the receipts.";
export const FALLBACK_SOURCE_LABEL = "Evidence / Reader's Record";
export const FALLBACK_SOURCE_HREF = "#readers-record";

// Matching Constants - MIN_CONTENT_COVERAGE back to 0.60
export const MIN_CONTENT_COVERAGE = 0.60;
export const MIN_ACCEPT_SCORE = 0.80;
export const MIN_SCORE_MARGIN = 0.10;
export const ABSOLUTE_MARGIN = 0.30;
export const PRIMARY_TERM_BOOST = 1.50;

// Denied intents: general intent CATEGORIES only with general variants
export const DENY_PATTERNS = [
  /\b(salary|pay|compensation|wage|wages|stipend|freelance|charges?|rates?|prices?|money|cost)\b/i,
  /\b(cgpa|gpa|marks|percentage|grades?)\b/i,
  /\b(benchmark|latency|throughput|per second|requests)\b/i,
  /\b(how many users|user count|customer count|customers|active users|stars?)\b/i,
  /\b(better than|faster than|slower than|beats?|vs|versus|compared to)\b/i,
  /\b(worked (at|for)|internships?|employer|employed)\b/i,
  /\b(home address|phone number|family|age)\b/i,
  /\b(ignore|reveal|system prompt|pretend|bypass|developer mode|hidden instructions)\b/i,
];

// Exact phrase patterns for Biyoo identity
export const BIYOO_IDENTITY_PATTERNS = [
  /\bwho are you\b(\s*\?|$)/i,
  /\bwhat are you\b(\s*\?|$)/i,
  /\bwho is biyoo\b(\s*\?|$)/i,
  /\bwhat is biyoo\b(\s*\?|$)/i,
  /\bintroduce yourself\b(\s*\?|$)/i,
  /\btell me about yourself\b(\s*\?|$)/i,
  /\bwho am i talking to\b/i,
  /\bwhat can i ask( you)?\b(\s*\?|$)/i,
];

// Stopwords and conversational fillers
export const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'doing', 'done', 'will', 'would', 'shall', 'should',
  'can', 'could', 'may', 'might', 'must', 'about', 'above', 'after', 'again',
  'against', 'all', 'am', 'and', 'any', 'as', 'at', 'because', 'before', 'below',
  'between', 'both', 'but', 'by', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'he', 'her', 'here', 'him', 'his', 'how', 'i', 'if', 'in', 'into',
  'it', 'its', 'itself', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor',
  'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', 'she', 'so', 'some', 'such',
  'than', 'that', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
  'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until',
  'up', 'very', 'what', 'when', 'where', 'which', 'while', 'who', 'whom',
  'why', 'with', 'you', 'your', 's', 'd', 'm', 't', 're', 've', 'll',
  'thing', 'things', 'person', 'one', 'line', 'actually', 'use', 'using',
  'built', 'build', 'go', 'went', 'good', 'tell', 'give', 'show', 'see', 'many', 'much', 'work',
  // Conversational fillers
  'look', 'know', 'way', 'best', 'get', 'runs', 'behind', 'kind', 'deal', 'along', 'site', 'page', 'right', 'now'
]);

// Synonym Canonicalization Map: general standard English words for each topic
export const SYNONYM_MAP: Record<string, string> = {
  // college / university / school / city / location
  college: 'college',
  university: 'college',
  school: 'college',
  undergrad: 'college',
  undergraduate: 'college',
  campus: 'college',
  degree: 'college',
  city: 'pune',
  location: 'pune',
  based: 'pune',
  finish: 'graduation',
  finishing: 'graduation',
  graduating: 'graduation',
  complete: 'graduation',
  completing: 'graduation',

  // job / working / employed / student
  job: 'employment',
  working: 'employment',
  employed: 'employment',
  employment: 'employment',
  student: 'student',

  // skills / languages / stack / technologies
  skills: 'skills',
  skill: 'skills',
  languages: 'languages',
  language: 'languages',
  stack: 'stack',
  technologies: 'tech',
  technology: 'tech',
  tech: 'tech',
  technical: 'technical',
  technically: 'technical',
  coding: 'code',
  interests: 'focus',
  interest: 'focus',
  focus: 'focus',
  focuses: 'focus',

  // reach / contact / message / email
  reach: 'contact',
  contacting: 'contact',
  touch: 'contact',
  message: 'contact',
  messaging: 'contact',
  email: 'contact',
  mail: 'contact',
  phone: 'contact',

  // mascot / creature / biyoo
  mascot: 'mascot',
  creature: 'mascot',
  fluffy: 'mascot',
  biyoo: 'mascot',
  dokbi: 'mascot',
  character: 'mascot',

  // prove / verify / evidence / receipts / tests
  prove: 'prove',
  proves: 'prove',
  proof: 'prove',
  proofs: 'prove',
  verify: 'verify',
  verifying: 'verify',
  verification: 'verify',
  evidence: 'evidence',
  receipts: 'receipts',
  receipt: 'receipts',
  tests: 'tests',
  tested: 'tests',
  testing: 'tests',
  test: 'tests',
  results: 'results',
  true: 'true',
  real: 'true',
  legit: 'true',

  // domain concepts
  consensus: 'consensus',
  raft: 'raft',
  ratify: 'raft',
  terraform: 'terraform',
  checker: 'checker',
  z3: 'z3',
  smt: 'z3',
  carbon: 'carbon',
  emissions: 'emissions',
  scheduling: 'scheduling',
  orchestrator: 'orchestrator',
  routing: 'routing',
  grid: 'grid',
  intensity: 'intensity',
  infrastructure: 'infrastructure',
  tools: 'tools',
  detect: 'detect',
  detects: 'detect',
  correct: 'correctness',
  correctness: 'correctness',
  mentorship: 'mentorship',
  programs: 'programs',
  program: 'programs',
  gsoc: 'gsoc',
  google: 'gsoc',
  summer: 'gsoc',
  foundations: 'programs',
  foundation: 'programs',
  aiming: 'applying',
  apply: 'applying',
  applying: 'applying',
  roles: 'roles',
  role: 'roles',
  introduce: 'profile',
  projects: 'projects',
  project: 'projects',
  summary: 'profile',
  developer: 'creator',
  author: 'creator',
  builder: 'creator',
  distributed: 'consensus'
};

// Signature terms for domain specificity weighting
export const ENTRY_PRIMARY_TERMS: Record<string, Set<string>> = {
  'iac-verifier-z3': new Set(['z3', 'terraform', 'checker', 'smt', 'iam', 'infrastructure']),
  'ratify-raft': new Set(['raft', 'ratify', 'consensus', 'tools', 'correctness', 'tests']),
  'edge-cloud': new Set(['carbon', 'emissions', 'orchestrator', 'routing', 'grid', 'intensity']),
  'current-status': new Set(['college', 'university', 'student', 'pune', 'graduating', 'graduation', 'city']),
  'strongest-evidence': new Set(['receipts', 'evidence', 'prove', 'verify', 'claims', 'results', 'true']),
  'tech-focus': new Set(['languages', 'skills', 'technical', 'stack', 'focus']),
  'contact': new Set(['contact', 'email', 'message', 'phone', 'touch']),
  'goals-gsoc': new Set(['gsoc', 'mentorship', 'programs', 'applying', 'roles']),
  'who-is-sumit': new Set(['sumit', 'background', 'creator', 'projects', 'profile']),
  'biyoo-mascot': new Set(['biyoo', 'mascot', 'creature', 'fluffy'])
};

export function lightStem(word: string): string {
  let w = word.toLowerCase();
  if (w.endsWith("'s")) w = w.slice(0, -2);
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
  if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
  return w;
}

export function normalizeToken(token: string): string {
  const stem = lightStem(token);
  return SYNONYM_MAP[stem] || SYNONYM_MAP[token] || stem;
}

export function cleanAndTokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/'s\b/g, '')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function extractContentTokens(text: string): string[] {
  const tokens = cleanAndTokenize(text);
  const content = tokens.filter(t => !STOP_WORDS.has(t));
  if (content.length === 0) {
    return tokens.map(normalizeToken);
  }
  return content.map(normalizeToken);
}

// Pre-build index of KB tokens and document frequency
const entryTokenSets = new Map<string, Set<string>>();
const docFreq = new Map<string, number>();

for (const entry of kbEntries) {
  const allTexts = [...entry.questions, ...entry.keywords];
  const tokens = new Set<string>();
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
function getWeight(token: string): number {
  const df = docFreq.get(token) || 1;
  return Math.log(1 + (N + 1) / df);
}

export function searchBiyooKb(rawQuery: string): BiyooQaResult {
  const cleanQ = (rawQuery || '').trim();
  if (!cleanQ) {
    return {
      matched: false,
      score: 0,
      secondScore: 0,
      coverage: 0,
      reason: 'min_score',
      answer: FALLBACK_ANSWER,
      sourceLabel: FALLBACK_SOURCE_LABEL,
      sourceHref: FALLBACK_SOURCE_HREF,
    };
  }

  // 1. Deny filters
  for (const pattern of DENY_PATTERNS) {
    if (pattern.test(cleanQ)) {
      return {
        matched: false,
        score: 0,
        secondScore: 0,
        coverage: 0,
        reason: 'deny',
        answer: FALLBACK_ANSWER,
        sourceLabel: FALLBACK_SOURCE_LABEL,
        sourceHref: FALLBACK_SOURCE_HREF,
      };
    }
  }

  // 2. Identity query detection using exact phrase patterns only
  for (const pattern of BIYOO_IDENTITY_PATTERNS) {
    if (pattern.test(cleanQ)) {
      const entry = kbEntries.find(e => e.id === 'biyoo-mascot');
      if (entry) {
        return {
          matched: true,
          score: 5.0,
          secondScore: 0.0,
          coverage: 1.0,
          reason: 'matched',
          entry,
          answer: entry.answer,
          sourceLabel: entry.sourceLabel,
          sourceHref: entry.sourceHref,
        };
      }
    }
  }

  // 3. Extract content tokens
  const qTokens = extractContentTokens(cleanQ);
  if (qTokens.length === 0) {
    return {
      matched: false,
      score: 0,
      secondScore: 0,
      coverage: 0,
      reason: 'min_score',
      answer: FALLBACK_ANSWER,
      sourceLabel: FALLBACK_SOURCE_LABEL,
      sourceHref: FALLBACK_SOURCE_HREF,
    };
  }

  interface EntryScore {
    entry: BiyooKbEntry;
    score: number;
    coverage: number;
    hasSpecificToken: boolean;
  }

  const scores: EntryScore[] = [];

  for (const entry of kbEntries) {
    const entryTokens = entryTokenSets.get(entry.id);
    if (!entryTokens) continue;

    const primaryTerms = ENTRY_PRIMARY_TERMS[entry.id] || new Set<string>();
    let matchedTokensCount = 0;
    let score = 0;
    let hasSpecificToken = false;

    for (const qt of qTokens) {
      if (entryTokens.has(qt)) {
        matchedTokensCount++;
        let weight = getWeight(qt);
        if (primaryTerms.has(qt)) {
          weight *= PRIMARY_TERM_BOOST;
          hasSpecificToken = true;
        } else if ((docFreq.get(qt) || 0) <= 2) {
          hasSpecificToken = true;
        }
        score += weight;
      }
    }

    const coverage = matchedTokensCount / qTokens.length;
    scores.push({
      entry,
      score,
      coverage,
      hasSpecificToken,
    });
  }

  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];
  const second = scores[1];

  // Prepare fallback chips: up to 3 distinct closest entries with score > 0
  const fallbackChips: BiyooFallbackChip[] = scores
    .filter(s => s.score > 0)
    .slice(0, 3)
    .map(s => ({
      id: s.entry.id,
      label: s.entry.questions[0],
      entry: s.entry
    }));

  if (!best || best.score < MIN_ACCEPT_SCORE || !best.hasSpecificToken) {
    return {
      matched: false,
      score: best ? best.score : 0,
      secondScore: second ? second.score : 0,
      coverage: best ? best.coverage : 0,
      reason: 'min_score',
      answer: FALLBACK_ANSWER,
      sourceLabel: FALLBACK_SOURCE_LABEL,
      sourceHref: FALLBACK_SOURCE_HREF,
      fallbackChips: fallbackChips.length > 0 ? fallbackChips : undefined,
    };
  }

  if (best.coverage < MIN_CONTENT_COVERAGE) {
    return {
      matched: false,
      score: best.score,
      secondScore: second ? second.score : 0,
      coverage: best.coverage,
      reason: 'coverage',
      answer: FALLBACK_ANSWER,
      sourceLabel: FALLBACK_SOURCE_LABEL,
      sourceHref: FALLBACK_SOURCE_HREF,
      fallbackChips: fallbackChips.length > 0 ? fallbackChips : undefined,
    };
  }

  if (second && best.score < second.score * (1 + MIN_SCORE_MARGIN) && best.score <= second.score + ABSOLUTE_MARGIN) {
    return {
      matched: false,
      score: best.score,
      secondScore: second.score,
      coverage: best.coverage,
      reason: 'margin',
      answer: FALLBACK_ANSWER,
      sourceLabel: FALLBACK_SOURCE_LABEL,
      sourceHref: FALLBACK_SOURCE_HREF,
      fallbackChips: fallbackChips.length > 0 ? fallbackChips : undefined,
    };
  }

  return {
    matched: true,
    score: best.score,
    secondScore: second ? second.score : 0,
    coverage: best.coverage,
    reason: 'matched',
    entry: best.entry,
    answer: best.entry.answer,
    sourceLabel: best.entry.sourceLabel,
    sourceHref: best.entry.sourceHref,
  };
}
