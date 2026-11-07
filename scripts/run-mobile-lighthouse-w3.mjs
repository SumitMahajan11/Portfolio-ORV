import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const runs = 3;
const targetUrl = 'http://localhost:3000/';
const proofDir = path.resolve('docs/proofs');
fs.mkdirSync(proofDir, { recursive: true });

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

console.log('==============================================');
console.log(`Running Mobile Lighthouse (3 runs) on ${targetUrl}`);
console.log('==============================================\n');

const metrics = {
  performance: [],
  accessibility: [],
  bestPractices: [],
  seo: [],
  lcp: [],
  cls: [],
  tbt: [],
};

const rawRuns = [];

for (let i = 1; i <= runs; i++) {
  const outputPath = path.join(proofDir, `lighthouse-w3-run${i}.json`);
  console.log(`Starting Run ${i}/${runs}...`);
  const cmd = `npx.cmd lighthouse ${targetUrl} --chrome-flags="--headless --no-sandbox --disable-extensions --incognito" --output=json --output-path="${outputPath}" --quiet`;
  execSync(cmd, { stdio: 'inherit' });

  const data = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  const perf = Math.round((data.categories.performance?.score ?? 0) * 100);
  const a11y = Math.round((data.categories.accessibility?.score ?? 0) * 100);
  const bp = Math.round((data.categories['best-practices']?.score ?? 0) * 100);
  const seo = Math.round((data.categories.seo?.score ?? 0) * 100);
  const lcp = data.audits['largest-contentful-paint']?.numericValue ?? 0;
  const cls = data.audits['cumulative-layout-shift']?.numericValue ?? 0;
  const tbt = data.audits['total-blocking-time']?.numericValue ?? 0;

  metrics.performance.push(perf);
  metrics.accessibility.push(a11y);
  metrics.bestPractices.push(bp);
  metrics.seo.push(seo);
  metrics.lcp.push(lcp);
  metrics.cls.push(cls);
  metrics.tbt.push(tbt);

  rawRuns.push({ run: i, perf, a11y, bp, seo, lcp: Math.round(lcp), cls: Number(cls.toFixed(3)), tbt: Math.round(tbt), outputPath });
  console.log(`Run ${i} completed: Perf=${perf}, A11y=${a11y}, BP=${bp}, SEO=${seo}, LCP=${(lcp / 1000).toFixed(2)}s, CLS=${cls.toFixed(3)}, TBT=${Math.round(tbt)}ms\n`);
}

const medianResults = {
  performance: Math.round(median(metrics.performance)),
  accessibility: Math.round(median(metrics.accessibility)),
  bestPractices: Math.round(median(metrics.bestPractices)),
  seo: Math.round(median(metrics.seo)),
  lcpMs: Math.round(median(metrics.lcp)),
  lcpSec: (median(metrics.lcp) / 1000).toFixed(2) + 's',
  cls: Number(median(metrics.cls).toFixed(3)),
  tbtMs: Math.round(median(metrics.tbt)),
};

console.log('==============================================');
console.log('MOBILE LIGHTHOUSE 3-RUN SUMMARY:');
console.table(rawRuns.map(r => ({
  Run: `Run ${r.run}`,
  Performance: r.perf,
  Accessibility: r.a11y,
  'Best Practices': r.bp,
  SEO: r.seo,
  'LCP (s)': (r.lcp / 1000).toFixed(2) + 's',
  CLS: r.cls,
  'TBT (ms)': `${r.tbt}ms`,
})));

console.log('MEDIANS:');
console.table([medianResults]);

// Find the run closest to median performance and TBT to copy to lighthouse-mobile-this-commit.json
rawRuns.sort((a, b) => Math.abs(a.perf - medianResults.performance) - Math.abs(b.perf - medianResults.performance));
const medianRun = rawRuns[0];
fs.copyFileSync(medianRun.outputPath, path.join(proofDir, 'lighthouse-mobile-this-commit.json'));
console.log(`Copied Run ${medianRun.run} (closest to median) to docs/proofs/lighthouse-mobile-this-commit.json`);

const passPerf = medianResults.performance >= 95;
const passTbt = medianResults.tbtMs <= 200;
console.log(`\nTARGET CHECK:`);
console.log(`Median Perf >= 95: ${medianResults.performance} (${passPerf ? 'PASS' : 'FAIL'})`);
console.log(`Median TBT <= 200ms: ${medianResults.tbtMs}ms (${passTbt ? 'PASS' : 'FAIL'})`);

if (!passPerf || !passTbt) {
  console.warn('One or more targets missed.');
  process.exit(1);
} else {
  console.log('ALL MOBILE LIGHTHOUSE TARGETS SATISFIED!');
}
