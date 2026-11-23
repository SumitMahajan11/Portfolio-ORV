import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TARGET_URL = 'http://127.0.0.1:3001/';
const PROOF_FILE = path.resolve('docs/proofs/p2b-lighthouse.txt');
const PARTICLES_CHUNK_NAME = '0ty___o_-32x2.js';

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

async function runLighthouseSingle(runLabel, outputPath) {
  const cmd = `npx.cmd lighthouse ${TARGET_URL} --chrome-flags="--headless --no-sandbox --disable-extensions --incognito" --output=json --output-path="${outputPath}" --quiet`;
  execSync(cmd, { stdio: 'inherit' });

  const rawBuffer = fs.readFileSync(outputPath);
  const sha256 = crypto.createHash('sha256').update(rawBuffer).digest('hex');
  const data = JSON.parse(rawBuffer.toString('utf8'));

  const perf = Math.round((data.categories?.performance?.score ?? 0) * 100);
  const a11y = Math.round((data.categories?.accessibility?.score ?? 0) * 100);
  const bp = Math.round((data.categories?.['best-practices']?.score ?? 0) * 100);
  const seo = Math.round((data.categories?.seo?.score ?? 0) * 100);
  const lcp = Math.round(data.audits?.['largest-contentful-paint']?.numericValue ?? 0);
  const cls = Number((data.audits?.['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3));
  const tbt = Math.round(data.audits?.['total-blocking-time']?.numericValue ?? 0);

  // Extract long tasks
  const rawLongTasks = data.audits?.['long-tasks']?.details?.items || [];
  const sortedLongTasks = [...rawLongTasks].sort((a, b) => (b.duration || 0) - (a.duration || 0));
  const top5LongTasks = sortedLongTasks.slice(0, 5).map((t) => {
    const url = t.url || 'main-thread';
    const duration = Math.round((t.duration || 0) * 10) / 10;
    const startTime = Math.round((t.startTime || 0) * 10) / 10;
    const particlesChunkInvolved = url.includes(PARTICLES_CHUNK_NAME);
    return {
      startTime,
      duration,
      url,
      particlesChunkInvolved,
    };
  });

  const particlesInAnyTop5 = top5LongTasks.some((t) => t.particlesChunkInvolved);

  // Prompt requirement: "Do not commit raw JSON" -> unlink immediately
  try {
    fs.unlinkSync(outputPath);
  } catch {}

  return {
    runLabel,
    perf,
    tbt,
    lcp,
    cls,
    a11y,
    bp,
    seo,
    sha256,
    top5LongTasks,
    particlesInAnyTop5,
  };
}

async function main() {
  console.log('================================================================');
  console.log(' TASK 1: LIGHTHOUSE A/B (6 WITH PARTICLES, 6 WITHOUT PARTICLES)');
  console.log(' Target URL: ' + TARGET_URL);
  console.log(' Wait 60s idle between runs');
  console.log('================================================================\n');

  fs.mkdirSync(path.dirname(PROOF_FILE), { recursive: true });

  const withRuns = [];
  const withoutRuns = [];

  // 1. RUN 6x WITH PARTICLES
  console.log('>>> [PHASE 1] RUNNING 6 RUNS WITH PARTICLES <<<');
  await fetch('http://127.0.0.1:3001/__proxy_control?particles=1');

  for (let i = 1; i <= 6; i++) {
    const label = `Run ${i} (WITH particles)`;
    console.log(`\n--- Starting ${label}... ---`);
    const tempPath = path.resolve(`docs/proofs/p2b-temp-with-run${i}.json`);
    const res = await runLighthouseSingle(label, tempPath);
    withRuns.push(res);
    console.log(`Completed ${label}: Perf=${res.perf}, TBT=${res.tbt}ms, LCP=${(res.lcp/1000).toFixed(2)}s, CLS=${res.cls} | sha256=${res.sha256.slice(0, 16)}...`);

    if (res.tbt > 200) {
      console.log(`  [TBT > 200ms] Top 5 Long Tasks:`);
      res.top5LongTasks.forEach((lt, idx) => {
        console.log(`    #${idx + 1}: ${lt.duration}ms (start: ${lt.startTime}ms) -> ${lt.url}`);
      });
      console.log(`  Particles chunk (${PARTICLES_CHUNK_NAME}) appears: ${res.particlesInAnyTop5 ? 'YES' : 'NO'}`);
    }

    // Always wait 60s between runs (including transition between groups)
    console.log('Waiting 60s idle before next run...');
    await new Promise((r) => setTimeout(r, 60000));
  }

  // 2. RUN 6x WITHOUT PARTICLES
  console.log('\n>>> [PHASE 2] RUNNING 6 RUNS WITHOUT PARTICLES <<<');
  await fetch('http://127.0.0.1:3001/__proxy_control?particles=0');

  for (let i = 1; i <= 6; i++) {
    const label = `Run ${i} (WITHOUT particles)`;
    console.log(`\n--- Starting ${label}... ---`);
    const tempPath = path.resolve(`docs/proofs/p2b-temp-without-run${i}.json`);
    const res = await runLighthouseSingle(label, tempPath);
    withoutRuns.push(res);
    console.log(`Completed ${label}: Perf=${res.perf}, TBT=${res.tbt}ms, LCP=${(res.lcp/1000).toFixed(2)}s, CLS=${res.cls} | sha256=${res.sha256.slice(0, 16)}...`);

    if (res.tbt > 200) {
      console.log(`  [TBT > 200ms] Top 5 Long Tasks:`);
      res.top5LongTasks.forEach((lt, idx) => {
        console.log(`    #${idx + 1}: ${lt.duration}ms (start: ${lt.startTime}ms) -> ${lt.url}`);
      });
      console.log(`  Particles chunk (${PARTICLES_CHUNK_NAME}) appears: ${res.particlesInAnyTop5 ? 'YES' : 'NO'}`);
    }

    if (i < 6) {
      console.log('Waiting 60s idle before next run...');
      await new Promise((r) => setTimeout(r, 60000));
    }
  }

  // Reset proxy back to normal
  await fetch('http://127.0.0.1:3001/__proxy_control?particles=1');

  // Compute Medians
  const withPerfMed = median(withRuns.map((r) => r.perf));
  const withTbtMed = median(withRuns.map((r) => r.tbt));

  const withoutPerfMed = median(withoutRuns.map((r) => r.perf));
  const withoutTbtMed = median(withoutRuns.map((r) => r.tbt));

  // Build report text
  const reportLines = [
    '========================================================================================',
    ' TASK 1: MOBILE LIGHTHOUSE A/B VERIFICATION REPORT',
    ' Target: ' + TARGET_URL,
    ' Runs: 6 WITH particles vs 6 WITHOUT particles (60s idle between runs)',
    ' Date: ' + new Date().toISOString(),
    '========================================================================================',
    '',
    '----------------------------------------------------------------------------------------',
    ' 1. ALL 12 RUNS: PERF AND TBT VALUES & SHA-256 HASHES',
    '----------------------------------------------------------------------------------------',
    'GROUP A: WITH PARTICLES (6 RUNS)',
  ];

  withRuns.forEach((r, idx) => {
    reportLines.push(
      `  Run ${idx + 1} (WITH):    Perf=${r.perf} | TBT=${r.tbt}ms | LCP=${(r.lcp / 1000).toFixed(2)}s | CLS=${r.cls} | A11y=${r.a11y} | BP=${r.bp} | SEO=${r.seo} | sha256=${r.sha256}`
    );
  });
  reportLines.push(`  Median (WITH):      Perf=${withPerfMed} | TBT=${withTbtMed}ms`);
  reportLines.push('');
  reportLines.push('GROUP B: WITHOUT PARTICLES (6 RUNS)');
  withoutRuns.forEach((r, idx) => {
    reportLines.push(
      `  Run ${idx + 1} (WITHOUT): Perf=${r.perf} | TBT=${r.tbt}ms | LCP=${(r.lcp / 1000).toFixed(2)}s | CLS=${r.cls} | A11y=${r.a11y} | BP=${r.bp} | SEO=${r.seo} | sha256=${r.sha256}`
    );
  });
  reportLines.push(`  Median (WITHOUT):   Perf=${withoutPerfMed} | TBT=${withoutTbtMed}ms`);
  reportLines.push('');

  reportLines.push('----------------------------------------------------------------------------------------');
  reportLines.push(' 2. SUMMARY & MEDIANS COMPARISON');
  reportLines.push('----------------------------------------------------------------------------------------');
  reportLines.push(`WITH Particles:    Median Perf = ${withPerfMed} | Median TBT = ${withTbtMed}ms`);
  reportLines.push(`WITHOUT Particles: Median Perf = ${withoutPerfMed} | Median TBT = ${withoutTbtMed}ms`);
  reportLines.push(`Delta (With - Without): Perf Delta = ${withPerfMed - withoutPerfMed} | TBT Delta = ${withTbtMed - withoutTbtMed}ms`);
  reportLines.push('');

  reportLines.push('----------------------------------------------------------------------------------------');
  reportLines.push(' 3. LONG TASKS ANALYSIS FOR RUNS WITH TBT > 200ms');
  reportLines.push(` Particles Chunk Identifier: ${PARTICLES_CHUNK_NAME}`);
  reportLines.push('----------------------------------------------------------------------------------------');

  const allRuns = [...withRuns, ...withoutRuns];
  const runsWithHighTbt = allRuns.filter((r) => r.tbt > 200);

  if (runsWithHighTbt.length === 0) {
    reportLines.push('None! All 12 runs had TBT <= 200ms.');
  } else {
    runsWithHighTbt.forEach((r) => {
      reportLines.push(`[${r.runLabel}] TBT=${r.tbt}ms:`);
      if (r.top5LongTasks.length === 0) {
        reportLines.push('  No long tasks recorded in audit details.');
      } else {
        r.top5LongTasks.forEach((lt, idx) => {
          reportLines.push(
            `  Task #${idx + 1}: duration=${lt.duration}ms | startTime=${lt.startTime}ms | script=${lt.url}`
          );
        });
        reportLines.push(`  Did particles chunk (${PARTICLES_CHUNK_NAME}) appear in top 5? ${r.particlesInAnyTop5 ? 'YES' : 'NO'}`);
      }
      reportLines.push('');
    });
  }

  reportLines.push('========================================================================================');

  const reportText = reportLines.join('\n');
  fs.writeFileSync(PROOF_FILE, reportText, 'utf8');

  console.log('\n' + reportText);
  console.log(`\nProof successfully written to: ${PROOF_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

