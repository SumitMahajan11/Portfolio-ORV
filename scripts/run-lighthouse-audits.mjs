import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const runs = 3;
const targets = [
  { name: 'Full (/)', url: 'http://localhost:3000/' },
  { name: 'Skip (/skip)', url: 'http://localhost:3000/skip' }
];

const resultsDir = path.join('.lighthouse-results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

const summary = {};

for (const target of targets) {
  console.log(`\n==============================================`);
  console.log(`Running Lighthouse for ${target.name}: ${target.url}`);
  console.log(`==============================================`);

  const metrics = {
    performance: [],
    accessibility: [],
    bestPractices: [],
    seo: [],
    lcp: [],
    cls: [],
    tbt: []
  };

  const rawRuns = [];

  for (let i = 1; i <= runs; i++) {
    const outputPath = path.join(resultsDir, `${target.name.replace(/[^a-zA-Z0-9]/g, '_')}_run_${i}.json`);
    console.log(`Starting Run ${i}/${runs}...`);
    const cmd = `npx.cmd lighthouse ${target.url} --chrome-flags="--headless --no-sandbox --disable-extensions --incognito" --output=json --output-path="${outputPath}" --quiet`;
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

    rawRuns.push({ run: i, perf, a11y, bp, seo, lcp, cls, tbt });
    console.log(`Run ${i} completed: Perf=${perf}, A11y=${a11y}, BP=${bp}, SEO=${seo}, LCP=${(lcp / 1000).toFixed(2)}s, CLS=${cls.toFixed(3)}, TBT=${Math.round(tbt)}ms`);
  }

  summary[target.name] = {
    runs: rawRuns,
    median: {
      performance: Math.round(median(metrics.performance)),
      accessibility: Math.round(median(metrics.accessibility)),
      bestPractices: Math.round(median(metrics.bestPractices)),
      seo: Math.round(median(metrics.seo)),
      lcpMs: Math.round(median(metrics.lcp)),
      lcpSec: (median(metrics.lcp) / 1000).toFixed(2) + 's',
      cls: Number(median(metrics.cls).toFixed(3)),
      tbtMs: Math.round(median(metrics.tbt))
    }
  };
}

const summaryFile = path.join(resultsDir, 'lighthouse-summary.json');
fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

console.log('\n==============================================');
console.log('FINAL LIGHTHOUSE MEDIAN SUMMARY');
console.log('==============================================');
console.log(JSON.stringify(summary, null, 2));
