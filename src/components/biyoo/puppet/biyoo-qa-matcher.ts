import Fuse from 'fuse.js';
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
  entry?: BiyooKbEntry;
  answer: string;
  sourceLabel: string;
  sourceHref: string;
  matchedText?: string;
}

const kbEntries: BiyooKbEntry[] = kbRaw as BiyooKbEntry[];

interface SearchItem {
  id: string;
  text: string;
  weight: number;
  entry: BiyooKbEntry;
}

const searchItems: SearchItem[] = [];
for (const entry of kbEntries) {
  for (const q of entry.questions) {
    searchItems.push({ id: entry.id, text: q, weight: 1.0, entry });
  }
  for (const kw of entry.keywords) {
    searchItems.push({ id: entry.id, text: kw, weight: 0.8, entry });
  }
}

const fuse = new Fuse(searchItems, {
  includeScore: true,
  threshold: 0.38, // Threshold: <= 0.38 is confident match; higher or none goes to fallback
  ignoreLocation: true,
  minMatchCharLength: 2,
  keys: ['text'],
});

export const FALLBACK_ANSWER = "I don't know that one, but the evidence section has the receipts.";
export const FALLBACK_SOURCE_LABEL = "Evidence / Reader's Record";
export const FALLBACK_SOURCE_HREF = "#readers-record";

export function searchBiyooKb(rawQuery: string): BiyooQaResult {
  const query = (rawQuery || '').trim();
  if (!query) {
    return {
      matched: false,
      score: 1.0,
      answer: FALLBACK_ANSWER,
      sourceLabel: FALLBACK_SOURCE_LABEL,
      sourceHref: FALLBACK_SOURCE_HREF,
    };
  }

  const results = fuse.search(query);
  if (!results || results.length === 0) {
    return {
      matched: false,
      score: 1.0,
      answer: FALLBACK_ANSWER,
      sourceLabel: FALLBACK_SOURCE_LABEL,
      sourceHref: FALLBACK_SOURCE_HREF,
    };
  }

  const best = results[0];
  const score = best.score ?? 1.0;
  if (score <= 0.38) {
    return {
      matched: true,
      score: score,
      entry: best.item.entry,
      answer: best.item.entry.answer,
      sourceLabel: best.item.entry.sourceLabel,
      sourceHref: best.item.entry.sourceHref,
      matchedText: best.item.text,
    };
  }

  return {
    matched: false,
    score: score,
    answer: FALLBACK_ANSWER,
    sourceLabel: FALLBACK_SOURCE_LABEL,
    sourceHref: FALLBACK_SOURCE_HREF,
    matchedText: best.item.text,
  };
}

export { kbEntries };

