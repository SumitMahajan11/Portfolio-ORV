import fs from 'node:fs';

const raw = JSON.parse(fs.readFileSync('docs/proofs/z3-lighthouse-run1.json', 'utf8'));
const longTasks = raw.audits['long-tasks'];
console.log('long-tasks title:', longTasks?.title);
console.log('long-tasks items:', JSON.stringify(longTasks?.details?.items?.slice(0, 5), null, 2));

const bootup = raw.audits['bootup-time'];
console.log('bootup items:', JSON.stringify(bootup?.details?.items?.slice(0, 3), null, 2));

