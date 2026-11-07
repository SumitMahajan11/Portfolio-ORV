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
console.log(`Running Mobile Lighthouse (3 runs) for B1 on ${targetUrl}`);
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
  const outputPath = path.join(proofDir, `lighthouse-b1-run${i}.json`);
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

const summary = {
  timestamp: new Date().toISOString(),
  targetUrl,
  rawRuns,
  medians: {
    performance: median(metrics.performance),
    accessibility: median(metrics.accessibility),
    bestPractices: median(metrics.bestPractices),
    seo: median(metrics.seo),
    lcp_ms: Math.round(median(metrics.lcp)),
    cls: Number(median(metrics.cls).toFixed(3)),
    tbt_ms: Math.round(median(metrics.tbt)),
  },
};

const summaryText = `==============================================
MOBILE LIGHTHOUSE 3-RUN SUMMARY (B-1 Real Art)
==============================================
Target URL: ${targetUrl}
Timestamp: ${summary.timestamp}

RAW RUNS:
Run 1: Perf=${rawRuns[0].perf}, A11y=${rawRuns[0].a11y}, BP=${rawRuns[0].bp}, SEO=${rawRuns[0].seo}, LCP=${rawRuns[0].lcp}ms, CLS=${rawRuns[0].cls}, TBT=${rawRuns[0].tbt}ms
Run 2: Perf=${rawRuns[1].perf}, A11y=${rawRuns[1].a11y}, BP=${rawRuns[1].bp}, SEO=${rawRuns[1].seo}, LCP=${rawRuns[1].lcp}ms, CLS=${rawRuns[1].cls}, TBT=${rawRuns[1].tbt}ms
Run 3: Perf=${rawRuns[2].perf}, A11y=${rawRuns[2].a11y}, BP=${rawRuns[2].bp}, SEO=${rawRuns[2].seo}, LCP=${rawRuns[2].lcp}ms, CLS=${rawRuns[2].cls}, TBT=${rawRuns[2].tbt}ms

MEDIANS:
- Performance:    ${summary.medians.performance} (target: >= 95)
- Total Blocking: ${summary.medians.tbt_ms} ms (target: <= 200 ms)
- LCP:            ${summary.medians.lcp_ms} ms
- CLS:            ${summary.medians.cls}
- Accessibility:  ${summary.medians.accessibility}
- Best Practices: ${summary.medians.bestPractices}
- SEO:            ${summary.medians.seo}

VERDICT: ${summary.medians.performance >= 95 ? 'PASS (Perf >= 95)' : 'MISS (Perf < 95)'}
`;

console.log(summaryText);
fs.writeFileSync(path.join(proofDir, 'lighthouse-b1-summary.txt'), summaryText, 'utf8');
