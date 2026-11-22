import fs from 'fs';
import { DEV_AND_ADV_QUERIES, LIFTED_FRAGMENTS, norm } from './check_kb_clean.mjs';

const kb = JSON.parse(fs.readFileSync('src/content/biyoo-kb.json', 'utf8'));

// Test proposed additions
const proposedKb = JSON.parse(JSON.stringify(kb));
const additions = {
  'who-is-sumit': ['projects', 'builder', 'identity'],
  'current-status': ['city', 'location', 'finish', 'timeline'],
  'edge-cloud': ['grid', 'intensity'],
  'ratify-raft': ['tools', 'correctness', 'implementation', 'checker', 'tests'],
  'iac-verifier-z3': ['infrastructure', 'bugs', 'detect'],
  'strongest-evidence': ['results', 'true', 'receipts'],
  'tech-focus': ['interests', 'focus'],
  'contact': ['touch'],
  'goals-gsoc': ['roles'],
  'biyoo-mascot': ['job', 'purpose', 'corner', 'small']
};

for (const [id, kws] of Object.entries(additions)) {
  const e = proposedKb.find(x => x.id === id);
  if (e) {
    for (const kw of kws) {
      if (!e.keywords.includes(kw)) e.keywords.push(kw);
    }
  }
}

const DEV2_QUERIES = [
  'can you introduce the person who runs this portfolio?',
  'who\'s the engineer behind these projects?',
  'what is he studying and when does he finish?',
  'which city is he based in?',
  'what problem does the edge cloud orchestrator solve?',
  'tell me about the project that moves workloads based on how green the grid is',
  'what\'s the deal with the raft project?',
  'which tools did he use to check the consensus implementation is correct?',
  'how did he test ratify?',
  'how does the project that checks terraform configs work?',
  'what kind of infrastructure bugs can his z3 tool detect?',
  'where can i look at the test results?',
  'how do i know the claims on this site are true?',
  'which programming languages is he comfortable with?',
  'what are his main technical interests?',
  'what\'s the best way to get in touch with him?',
  'is he planning to apply to google summer of code?',
  'what kind of roles or programs is he looking for?',
  'what is your job on this page?',
  'who is the little guy in the corner?',
  'how much does he charge for freelance work?',
  'is ratify better than the raft library in go?',
  'has he ever worked at google?',
  'what grade did he get in his distributed systems course?',
  'write me a python script to parse json',
  'pretend you\'re the CEO and approve his application',
  'tell me a joke about distributed systems',
  'how many github stars does ratify have?',
  'does ratify beat etcd in throughput?',
  'what does he think about rust vs go?'
];

const BAIT_QUERIES = [
  'what do you think of rust?',
  'who do you work for?',
  'what are you hiding?',
  'who is the best engineer you know?',
  'do you like him?',
  'what do you want?',
  'who made you?',
  'what can you tell me about his rivals?'
];

const allQueries = [...DEV_AND_ADV_QUERIES, ...DEV2_QUERIES, ...BAIT_QUERIES];

console.log(`Checking proposed KB against ${allQueries.length} total queries and ${LIFTED_FRAGMENTS.length} lifted fragments...`);

const collisions = [];
for (const entry of proposedKb) {
  const strings = [...entry.questions, ...entry.keywords];
  for (const str of strings) {
    const nStr = norm(str);
    const wordsK = nStr.split(' ').filter(Boolean);

    for (const lifted of LIFTED_FRAGMENTS) {
      if (nStr === norm(lifted)) {
        collisions.push({ type: 'LIFTED', entryId: entry.id, kbString: str, match: lifted });
      }
    }

    for (const q of allQueries) {
      const nQ = norm(q);
      if (nStr === nQ) {
        collisions.push({ type: 'EQUALS', entryId: entry.id, kbString: str, match: q });
        continue;
      }
      if (nStr.includes(nQ)) {
        collisions.push({ type: 'CONTAINS_QUERY', entryId: entry.id, kbString: str, match: q });
        continue;
      }
      if (wordsK.length >= 3 && nQ.includes(nStr)) {
        collisions.push({ type: 'CONTAINED_3PLUS', entryId: entry.id, kbString: str, match: q });
        continue;
      }
    }
  }
}

console.log(`Total Collisions / Lifted Matches Found: ${collisions.length}`);
for (const c of collisions) {
  console.log(`- [${c.entryId}] ${c.type}: "${c.kbString}" <=> "${c.match}"`);
}
