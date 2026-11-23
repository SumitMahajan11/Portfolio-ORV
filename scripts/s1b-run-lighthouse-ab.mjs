import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const APP_A_URL = 'http://127.0.0.1:3010/';
const APP_B_URL = 'http://127.0.0.1:3011/';
const PROOF_FILE = path.resolve('docs/proofs/s1b-lighthouse-ab.txt');
const TEMP_DIR = path.resolve('D:/temp-s1b/lh-json');
fs.mkdirSync(TEMP_DIR, { recursive: true });

function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function min(arr) {
  return Math.min(...arr);
}

function max(arr) {
  return Math.max(...arr);
}

async function runLighthouse(url, label, runIdx) {
  const jsonPath = path.join(TEMP_DIR, `lh-${label}-${runIdx}-${Date.now()}.json`);
  const cmd = `npx.cmd lighthouse ${url} --chrome-flags="--headless --no-sandbox --disable-extensions --incognito" --output=json --output-path="${jsonPath}" --quiet`;
  console.log(`[${new Date().toISOString()}] Launching Mobile Lighthouse ${label} #${runIdx}...`);
  cp.execSync(cmd, { stdio: 'inherit' });

  const rawBuffer = fs.readFileSync(jsonPath);
  const sha256 = crypto.createHash('sha256').update(rawBuffer).digest('hex');
  const raw = JSON.parse(rawBuffer.toString('utf8'));

  const perf = Math.round((raw.categories?.performance?.score ?? 0) * 100);
  const tbt = Math.round(raw.audits?.['total-blocking-time']?.numericValue ?? 0);
  const lcp = Math.round(raw.audits?.['largest-contentful-paint']?.numericValue ?? 0);

  // Extract long tasks if any
  const longTasksAudit = raw.audits?.['long-tasks']?.details?.items || [];
  const topLongTasks = longTasksAudit
    .map((t) => ({
      duration: Math.round(t.duration || 0),
      startTime: Math.round((t.startTime || 0) * 10) / 10,
      url: t.url || 'Unattributable',
    }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5);

  // Delete temp JSON
  try {
    fs.unlinkSync(jsonPath);
  } catch {}

  console.log(`[Done ${label} #${runIdx}] Perf=${perf} | TBT=${tbt}ms | LCP=${(lcp / 1000).toFixed(2)}s | sha256=${sha256.slice(0, 12)}...`);

  return {
    group: label,
    runIdx,
    perf,
    tbt,
    lcp,
    sha256,
    topLongTasks,
  };
}

async function main() {
  const output = [];
  function log(msg = '') {
    console.log(msg);
    output.push(msg);
  }

  log('================================================================');
  log(' TASK structure-S1b: MOBILE LIGHTHOUSE CLEAN A/B (16 RUNS)');
  log('================================================================');
  log(`Group A: ${APP_A_URL} (HEAD as-is, with BiyooCompanion)`);
  log(`Group B: ${APP_B_URL} (without BiyooCompanion)`);
  log(`Design: Interleaved A, B, A, B... x 8 pairs (16 runs total)`);
  log(`Interval: 60s idle between runs`);
  log(`Timestamp: ${new Date().toISOString()}\n`);

  const resultsA = [];
  const resultsB = [];

  const totalPairs = 8;

  for (let pair = 1; pair <= totalPairs; pair++) {
    log(`\n>>> PAIR ${pair}/${totalPairs}: Running Group A (with BiyooCompanion)...`);
    const resA = await runLighthouse(APP_A_URL, 'GroupA', pair);
    resultsA.push(resA);

    log(`Waiting 60s idle before Group B...`);
    await new Promise((r) => setTimeout(r, 60000));

    log(`\n>>> PAIR ${pair}/${totalPairs}: Running Group B (without BiyooCompanion)...`);
    const resB = await runLighthouse(APP_B_URL, 'GroupB', pair);
    resultsB.push(resB);

    if (pair < totalPairs) {
      log(`Waiting 60s idle before Pair ${pair + 1}...`);
      await new Promise((r) => setTimeout(r, 60000));
    }
  }

  log('\n================================================================');
  log(' ALL 16 RUN RESULTS');
  log('================================================================');
  log('\n--- GROUP A (HEAD as-is, with BiyooCompanion) ---');
  for (const r of resultsA) {
    log(`  Run A${r.runIdx}: Perf=${r.perf} | TBT=${r.tbt}ms | LCP=${(r.lcp / 1000).toFixed(2)}s | sha256=${r.sha256}`);
    if (r.tbt > 200 && r.topLongTasks.length > 0) {
      log(`    Top Long Tasks (TBT > 200ms):`);
      for (const lt of r.topLongTasks) {
        log(`      - ${lt.duration}ms at ${lt.startTime}ms (${lt.url})`);
      }
    }
  }

  log('\n--- GROUP B (without BiyooCompanion) ---');
  for (const r of resultsB) {
    log(`  Run B${r.runIdx}: Perf=${r.perf} | TBT=${r.tbt}ms | LCP=${(r.lcp / 1000).toFixed(2)}s | sha256=${r.sha256}`);
    if (r.tbt > 200 && r.topLongTasks.length > 0) {
      log(`    Top Long Tasks (TBT > 200ms):`);
      for (const lt of r.topLongTasks) {
        log(`      - ${lt.duration}ms at ${lt.startTime}ms (${lt.url})`);
      }
    }
  }

  // Aggregate stats
  const perfA = resultsA.map((r) => r.perf);
  const tbtA = resultsA.map((r) => r.tbt);
  const lcpA = resultsA.map((r) => r.lcp);
  const tbtOver200CountA = tbtA.filter((v) => v > 200).length;

  const perfB = resultsB.map((r) => r.perf);
  const tbtB = resultsB.map((r) => r.tbt);
  const lcpB = resultsB.map((r) => r.lcp);
  const tbtOver200CountB = tbtB.filter((v) => v > 200).length;

  log('\n================================================================');
  log(' SUMMARY & STATISTICAL COMPARISON');
  log('================================================================');
  log(`Group A (with BiyooCompanion):`);
  log(`  Perf values:  [${perfA.join(', ')}]`);
  log(`  Perf Median:  ${median(perfA)} (Range: [${min(perfA)}, ${max(perfA)}])`);
  log(`  TBT values:   [${tbtA.join(', ')}] ms`);
  log(`  TBT Median:   ${median(tbtA)} ms (Range: [${min(tbtA)}, ${max(tbtA)}])`);
  log(`  LCP values:   [${lcpA.map((v) => (v / 1000).toFixed(2)).join(', ')}] s`);
  log(`  LCP Median:   ${(median(lcpA) / 1000).toFixed(2)} s (Range: [${(min(lcpA) / 1000).toFixed(2)}, ${(max(lcpA) / 1000).toFixed(2)}])`);
  log(`  Runs with TBT > 200ms: ${tbtOver200CountA} of 8`);

  log(`\nGroup B (without BiyooCompanion):`);
  log(`  Perf values:  [${perfB.join(', ')}]`);
  log(`  Perf Median:  ${median(perfB)} (Range: [${min(perfB)}, ${max(perfB)}])`);
  log(`  TBT values:   [${tbtB.join(', ')}] ms`);
  log(`  TBT Median:   ${median(tbtB)} ms (Range: [${min(tbtB)}, ${max(tbtB)}])`);
  log(`  LCP values:   [${lcpB.map((v) => (v / 1000).toFixed(2)).join(', ')}] s`);
  log(`  LCP Median:   ${(median(lcpB) / 1000).toFixed(2)} s (Range: [${(min(lcpB) / 1000).toFixed(2)}, ${(max(lcpB) / 1000).toFixed(2)}])`);
  log(`  Runs with TBT > 200ms: ${tbtOver200CountB} of 8`);

  // Range overlap checks
  const perfOverlap = !(max(perfA) < min(perfB) || min(perfA) > max(perfB));
  const tbtOverlap = !(max(tbtA) < min(tbtB) || min(tbtA) > max(tbtB));
  const lcpOverlap = !(max(lcpA) < min(lcpB) || min(lcpA) > max(lcpB));

  log('\n--- RANGE OVERLAP ANALYSIS ---');
  log(`Perf Range Overlap: ${perfOverlap ? 'YES (Ranges overlap)' : 'NO (No overlap)'}`);
  log(`TBT Range Overlap:  ${tbtOverlap ? 'YES (Ranges overlap)' : 'NO (No overlap)'}`);
  log(`LCP Range Overlap:  ${lcpOverlap ? 'YES (Ranges overlap)' : 'NO (No overlap)'}`);

  const hasSignificantDifference = (!perfOverlap || !tbtOverlap || !lcpOverlap);
  if (hasSignificantDifference) {
    log('\nClaimed Difference: Statistically separated ranges detected.');
  } else {
    log('\nVerdict: no detectable difference at n=8');
  }

  fs.writeFileSync(PROOF_FILE, output.join('\n'), 'utf8');
  console.log(`\nFull report written to: ${PROOF_FILE}`);
}

main().catch(console.error);

