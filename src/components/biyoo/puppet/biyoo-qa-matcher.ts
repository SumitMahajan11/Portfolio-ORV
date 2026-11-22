import kbRaw from '../../../content/biyoo-kb.json' with { type: 'json' };

export interface BiyooKbEntry {
  id: string;
  questions: string[];
  keywords: string[];
  answer: string;
  sourceLabel: string;
  sourceHref: string;
}

export interface BiyooQaResult {
  matched: boolean;
  score: number;
  coverage?: number;
  entry?: BiyooKbEntry;
  answer: string;
  sourceLabel: string;
  sourceHref: string;
  matchedText?: string;
}

export const kbEntries: BiyooKbEntry[] = kbRaw as BiyooKbEntry[];

export const FALLBACK_ANSWER = "I don't know that one, but the evidence section has the receipts.";
export const FALLBACK_SOURCE_LABEL = "Evidence / Reader's Record";
export const FALLBACK_SOURCE_HREF = "#readers-record";

// Matching Constants
export const MIN_CONTENT_COVERAGE = 0.60;
export const MIN_ACCEPT_SCORE = 0.80;
export const MIN_SCORE_MARGIN = 0.10;
export const ABSOLUTE_MARGIN = 0.30;
export const PRIMARY_TERM_BOOST = 1.50;

// Denied intents that must always fallback even if they reuse in-scope words
export const DENY_PATTERNS = [
  /\b(salary|pay|compensation|wage|wages|stipend)\b/i,
  /\b(how many users|user count|customer count|customers|active users)\b/i,
  /\b(in production|production use|used in production)\b/i,
  /\b(benchmark speed|latency improvement|speed of raft|performance numbers|latency numbers)\b/i,
  /\b(cgpa|gpa|marks|percentage|grades?)\b/i,
  /\b(linkedin)\b/i,
  /\b(resume|cv)\b/i,
  /\b(ignore (your |all )?(rules|instructions)|reveal (your |the )?(system )?prompt|system prompt|pretend|bypass)\b/i,
];

// Stopwords and conversational fillers
export const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should',
  'can', 'could', 'may', 'might', 'must', 'about', 'above', 'after', 'again',
  'against', 'all', 'am', 'and', 'any', 'as', 'at', 'because', 'before', 'below',
  'between', 'both', 'but', 'by', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'he', 'her', 'here', 'him', 'his', 'how', 'i', 'if', 'in', 'into',
  'it', 'its', 'itself', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor',
  'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', 'she', 'so', 'some', 'such',
  'than', 'that', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
  'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until',
  'up', 'very', 'what', 'when', 'where', 'which', 'while', 'whom',
  'why', 'with', 's', 'd', 'm', 't', 're', 've', 'll',
  'thing', 'things', 'person', 'one', 'line', 'actually', 'use', 'using',
  'built', 'build', 'go', 'went', 'good', 'tell', 'give', 'show', 'see', 'many', 'much', 'work'
]);

// Synonym Canonicalization Map
export const SYNONYM_MAP: Record<string, string> = {
  // college / university / school
  college: 'college',
  university: 'college',
  school: 'college',
  undergrad: 'college',
  undergraduate: 'college',
  campus: 'college',

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

  // reach / contact / message / email
  reach: 'contact',
  contacting: 'contact',
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
  mentorship: 'mentorship',
  programs: 'programs',
  program: 'programs',
  gsoc: 'gsoc'
};

// Signature terms for domain specificity weighting
export const ENTRY_PRIMARY_TERMS: Record<string, Set<string>> = {
  'iac-verifier-z3': new Set(['z3', 'terraform', 'checker', 'smt', 'iam']),
  'ratify-raft': new Set(['raft', 'ratify', 'consensus']),
  'edge-cloud': new Set(['carbon', 'emissions', 'orchestrator', 'routing']),
  'current-status': new Set(['college', 'university', 'student', 'pune', 'graduating']),
  'strongest-evidence': new Set(['receipts', 'evidence', 'prove', 'verify', 'claims']),
  'tech-focus': new Set(['languages', 'skills', 'technical', 'stack']),
  'contact': new Set(['contact', 'email', 'message', 'phone']),
  'goals-gsoc': new Set(['gsoc', 'mentorship', 'programs', 'applying']),
  'who-is-sumit': new Set(['sumit', 'background', 'author', 'creator']),
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

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
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
      coverage: 0,
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
        coverage: 0,
        answer: FALLBACK_ANSWER,
        sourceLabel: FALLBACK_SOURCE_LABEL,
        sourceHref: FALLBACK_SOURCE_HREF,
      };
    }
  }

  // 2. Identity query detection
  const qTokensRaw = cleanAndTokenize(cleanQ);
  if (
    (qTokensRaw.includes('who') || qTokensRaw.includes('what')) &&
    (qTokensRaw.includes('you') || qTokensRaw.includes('biyoo'))
  ) {
    const entry = kbEntries.find(e => e.id === 'biyoo-mascot');
    if (entry) {
      return {
        matched: true,
        score: 5.0,
        coverage: 1.0,
        entry,
        answer: entry.answer,
        sourceLabel: entry.sourceLabel,
        sourceHref: entry.sourceHref,
      };
    }
  }

  // 3. Extract content tokens
  const qTokens = extractContentTokens(cleanQ);
  if (qTokens.length === 0) {
    return {
      matched: false,
      score: 0,
      coverage: 0,
      answer: FALLBACK_ANSWER,
      sourceLabel: FALLBACK_SOURCE_LABEL,
      sourceHref: FALLBACK_SOURCE_HREF,
    };
  }

  interface EntryScore {
    entry: BiyooKbEntry;
    score: number;
    coverage: number;
  }

  const scores: EntryScore[] = [];

  for (const entry of kbEntries) {
    const entryTokens = entryTokenSets.get(entry.id);
    if (!entryTokens) continue;

    const primaryTerms = ENTRY_PRIMARY_TERMS[entry.id] || new Set<string>();
    let matchedTokensCount = 0;
    let score = 0;

    for (const qt of qTokens) {
      let matched = false;
      if (entryTokens.has(qt)) {
        matched = true;
      } else if (qt.length >= 4) {
        // Typo tolerance: edit distance <= 1 for word length >= 4
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
          weight *= PRIMARY_TERM_BOOST;
        }
        score += weight;
      }
    }

    const coverage = matchedTokensCount / qTokens.length;
    scores.push({
      entry,
      score,
      coverage,
    });
  }

  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];
  const second = scores[1];

  if (best && best.coverage >= MIN_CONTENT_COVERAGE && best.score >= MIN_ACCEPT_SCORE) {
    if (!second || best.score >= second.score * (1 + MIN_SCORE_MARGIN) || best.score > second.score + ABSOLUTE_MARGIN) {
      return {
        matched: true,
        score: best.score,
        coverage: best.coverage,
        entry: best.entry,
        answer: best.entry.answer,
        sourceLabel: best.entry.sourceLabel,
        sourceHref: best.entry.sourceHref,
      };
    }
  }

  return {
    matched: false,
    score: best ? best.score : 0,
    coverage: best ? best.coverage : 0,
    answer: FALLBACK_ANSWER,
    sourceLabel: FALLBACK_SOURCE_LABEL,
    sourceHref: FALLBACK_SOURCE_HREF,
  };
}
