import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const APP_A_URL = 'http://127.0.0.1:3010/';
const APP_B_URL = 'http://127.0.0.1:3011/';

const TEMP_DIR = path.resolve('D:/temp-p2c/json');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function median(arr) {
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
  const jsonPath = path.join(TEMP_DIR, `lh-${label}-${runIdx}.json`);
  const cmd = `npx.cmd lighthouse ${url} --chrome-flags="--headless --no-sandbox --disable-extensions --incognito" --output=json --output-path="${jsonPath}" --quiet`;
  console.log(`\n[${new Date().toISOString()}] Launching Mobile Lighthouse ${label} #${runIdx}...`);
  cp.execSync(cmd, { stdio: 'inherit' });

  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const perf = Math.round((raw.categories?.performance?.score ?? 0) * 100);
  const tbt = Math.round(raw.audits?.['total-blocking-time']?.numericValue ?? 0);
  const lcp = Math.round(raw.audits?.['largest-contentful-paint']?.numericValue ?? 0);

  // Extract long tasks
  const longTasksAudit = raw.audits?.['long-tasks']?.details?.items || [];
  const topLongTasks = longTasksAudit
    .map((t) => ({
      duration: Math.round(t.duration || 0),
      startTime: Math.round((t.startTime || 0) * 10) / 10,
      url: t.url || 'Unattributable',
    }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5);

  // Extract bootup time evaluation
  const bootupItems = raw.audits?.['bootup-time']?.details?.items || [];
  const bootupSummary = bootupItems.map((b) => ({
    url: b.url ? path.basename(b.url.split('?')[0]) : 'unknown',
    scripting: Math.round(b.scripting || 0),
    scriptParseCompile: Math.round(b.scriptParseCompile || 0),
    total: Math.round(b.total || 0),
  })).filter((b) => b.total > 20);

  // Delete temp JSON
  try {
    fs.unlinkSync(jsonPath);
  } catch {}

  console.log(`[Result ${label} #${runIdx}] Perf=${perf} | TBT=${tbt}ms | LCP=${(lcp / 1000).toFixed(2)}s`);

  return {
    group: label,
    runIdx,
    perf,
    tbt,
    lcp,
    topLongTasks,
    bootupSummary,
  };
}

async function main() {
  console.log('================================================================');
  console.log(' STARTING CLEAN INTERLEAVED MOBILE LIGHTHOUSE A/B (16 RUNS)');
  console.log(' Group A: http://127.0.0.1:3010/ (normal with particles)');
  console.log(' Group B: http://127.0.0.1:3011/ (clean build, particles removed)');
  console.log(' Order: A1, B1, A2, B2 ... A8, B8 (60s idle between runs)');
  console.log('================================================================');

  const runsA = [];
  const runsB = [];

  for (let round = 1; round <= 8; round++) {
    // Run A
    const resA = await runLighthouse(APP_A_URL, 'A', round);
    runsA.push(resA);

    console.log('Waiting 60s idle before next run...');
    await new Promise((r) => setTimeout(r, 60000));

    // Run B
    const resB = await runLighthouse(APP_B_URL, 'B', round);
    runsB.push(resB);

    if (round < 8) {
      console.log('Waiting 60s idle before next run...');
      await new Promise((r) => setTimeout(r, 60000));
    }
  }

  // Calculate stats
  const perfsA = runsA.map((r) => r.perf);
  const tbtsA = runsA.map((r) => r.tbt);
  const lcpsA = runsA.map((r) => r.lcp);

  const perfsB = runsB.map((r) => r.perf);
  const tbtsB = runsB.map((r) => r.tbt);
  const lcpsB = runsB.map((r) => r.lcp);

  const medPerfA = median(perfsA);
  const medTbtA = median(tbtsA);
  const medLcpA = median(lcpsA);

  const medPerfB = median(perfsB);
  const medTbtB = median(tbtsB);
  const medLcpB = median(lcpsB);

  const tbtOver200A = runsA.filter((r) => r.tbt > 200).length;
  const tbtOver200B = runsB.filter((r) => r.tbt > 200).length;

  // Check overlap for Perf, TBT, LCP
  const perfOverlap = !(max(perfsA) < min(perfsB) || max(perfsB) < min(perfsA));
  const tbtOverlap = !(max(tbtsA) < min(tbtsB) || max(tbtsB) < min(tbtsA));
  const lcpOverlap = !(max(lcpsA) < min(lcpsB) || max(lcpsB) < min(lcpsA));

  let output = '';
  output += '========================================================================================\n';
  output += ' CLEAN INTERLEAVED MOBILE LIGHTHOUSE A/B VERIFICATION REPORT\n';
  output += ` Date: ${new Date().toISOString()}\n`;
  output += ' Target A: http://127.0.0.1:3010/ (normal build with particles)\n';
  output += ' Target B: http://127.0.0.1:3011/ (clean build, particles removed)\n';
  output += ' Runs: 8 A vs 8 B interleaved, 60s idle between runs\n';
  output += '========================================================================================\n\n';

  output += '----------------------------------------------------------------------------------------\n';
  output += ' 1. ALL 16 RUNS: PERF, TBT, LCP VALUES\n';
  output += '----------------------------------------------------------------------------------------\n';
  output += 'GROUP A (WITH PARTICLES):\n';
  runsA.forEach((r) => {
    output += `  Run ${r.runIdx} (A): Perf=${r.perf} | TBT=${r.tbt}ms | LCP=${(r.lcp / 1000).toFixed(2)}s\n`;
  });
  output += `  Range: Perf [${min(perfsA)}, ${max(perfsA)}] | TBT [${min(tbtsA)}ms, ${max(tbtsA)}ms] | LCP [${(min(lcpsA) / 1000).toFixed(2)}s, ${(max(lcpsA) / 1000).toFixed(2)}s]\n`;
  output += `  Median: Perf=${medPerfA} | TBT=${medTbtA}ms | LCP=${(medLcpA / 1000).toFixed(2)}s\n`;
  output += `  Runs with TBT > 200ms: ${tbtOver200A} of 8\n\n`;

  output += 'GROUP B (WITHOUT PARTICLES):\n';
  runsB.forEach((r) => {
    output += `  Run ${r.runIdx} (B): Perf=${r.perf} | TBT=${r.tbt}ms | LCP=${(r.lcp / 1000).toFixed(2)}s\n`;
  });
  output += `  Range: Perf [${min(perfsB)}, ${max(perfsB)}] | TBT [${min(tbtsB)}ms, ${max(tbtsB)}ms] | LCP [${(min(lcpsB) / 1000).toFixed(2)}s, ${(max(lcpsB) / 1000).toFixed(2)}s]\n`;
  output += `  Median: Perf=${medPerfB} | TBT=${medTbtB}ms | LCP=${(medLcpB / 1000).toFixed(2)}s\n`;
  output += `  Runs with TBT > 200ms: ${tbtOver200B} of 8\n\n`;

  output += '----------------------------------------------------------------------------------------\n';
  output += ' 2. STATISTICAL DIFFERENCE & OVERLAP EVALUATION\n';
  output += '----------------------------------------------------------------------------------------\n';
  output += `Perf Ranges Overlap: ${perfOverlap ? 'YES' : 'NO'} (A: [${min(perfsA)}, ${max(perfsA)}] vs B: [${min(perfsB)}, ${max(perfsB)}])\n`;
  output += `TBT Ranges Overlap:  ${tbtOverlap ? 'YES' : 'NO'} (A: [${min(tbtsA)}ms, ${max(tbtsA)}ms] vs B: [${min(tbtsB)}ms, ${max(tbtsB)}ms])\n`;
  output += `LCP Ranges Overlap:  ${lcpOverlap ? 'YES' : 'NO'} (A: [${(min(lcpsA) / 1000).toFixed(2)}s, ${(max(lcpsA) / 1000).toFixed(2)}s] vs B: [${(min(lcpsB) / 1000).toFixed(2)}s, ${(max(lcpsB) / 1000).toFixed(2)}s])\n\n`;

  if (perfOverlap && tbtOverlap && lcpOverlap) {
    output += 'VERDICT: no detectable difference at n=8\n\n';
  } else {
    output += 'VERDICT: ranges do not overlap on at least one metric.\n\n';
  }

  output += '----------------------------------------------------------------------------------------\n';
  output += ' 3. LONG TASKS FOR RUNS WITH TBT > 200ms\n';
  output += '----------------------------------------------------------------------------------------\n';

  const allOver200 = [...runsA.map((r) => ({ ...r, grp: 'A' })), ...runsB.map((r) => ({ ...r, grp: 'B' }))].filter((r) => r.tbt > 200);

  if (allOver200.length === 0) {
    output += 'None of the 16 runs had TBT > 200ms.\n';
  } else {
    for (const r of allOver200) {
      output += `[Run ${r.runIdx} (${r.grp})] TBT=${r.tbt}ms:\n`;
      r.topLongTasks.forEach((t, i) => {
        output += `  Task #${i + 1}: duration=${t.duration}ms | startTime=${t.startTime}ms | script=${t.url}\n`;
      });
      output += '  Bootup top contributors:\n';
      r.bootupSummary.slice(0, 5).forEach((b) => {
        output += `    ${b.url}: total=${b.total}ms (scripting=${b.scripting}ms, parse=${b.scriptParseCompile}ms)\n`;
      });
      output += '\n';
    }
  }

  console.log('\n' + output);

  const proofPath = path.resolve('docs/proofs/p2c-lighthouse-ab.txt');
  fs.writeFileSync(proofPath, output);
  console.log(`Saved report to ${proofPath}`);
}

main().catch(console.error);

