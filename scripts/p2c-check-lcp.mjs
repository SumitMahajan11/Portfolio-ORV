import fs from 'node:fs';
import cp from 'node:child_process';

const tempPath = 'D:/temp-p2c/test-lcp.json';
cp.execSync(`npx.cmd lighthouse http://127.0.0.1:3010/ --chrome-flags="--headless --no-sandbox" --output=json --output-path="${tempPath}" --quiet`);
const raw = JSON.parse(fs.readFileSync(tempPath, 'utf8'));
try { fs.unlinkSync(tempPath); } catch {}

const keys = Object.keys(raw.audits).filter(k => k.includes('paint') || k.includes('element') || k.includes('lcp'));
console.log('Matching audit keys:', keys);
for (const k of keys) {
  if (raw.audits[k]?.details?.items) {
    console.log(`Key ${k} items:`, JSON.stringify(raw.audits[k].details.items, null, 2).slice(0, 300));
  }
}


