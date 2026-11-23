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
console.log(`Running Mobile Lighthouse (3 runs) for Raft R2 on ${targetUrl}`);
console.log('Requirement: Median Perf must not fall more than 2 below B-1c median (79) -> Target >= 77');
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
  const outputPath = path.join(proofDir, `raft-r2-lighthouse-run${i}.json`);
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

  if (i < runs) {
    console.log(`Waiting 60s idle before run ${i + 1}...`);
    execSync('node -e "setTimeout(() => {}, 60000)"');
  }
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

const summaryPath = path.join(proofDir, 'raft-r2-lighthouse-summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

const reportText = `================================================================
RAFT R2 MOBILE LIGHTHOUSE AUDIT REPORT (3 RUNS, 60s IDLE)
================================================================
URL: ${targetUrl}
Timestamp: ${summary.timestamp}

Raw Runs:
${rawRuns.map((r) => `Run ${r.run}: Perf=${r.perf}, A11y=${r.a11y}, BP=${r.bp}, SEO=${r.seo}, LCP=${r.lcp}ms, CLS=${r.cls}, TBT=${r.tbt}ms`).join('\n')}

Medians:
- Performance: ${summary.medians.performance} (Floor Target: >= 77 -> ${summary.medians.performance >= 77 ? 'PASS' : 'FAIL'})
- Accessibility: ${summary.medians.accessibility}
- Best Practices: ${summary.medians.bestPractices}
- SEO: ${summary.medians.seo}
- Simulated LCP: ${summary.medians.lcp_ms} ms
- Total Blocking Time (TBT): ${summary.medians.tbt_ms} ms
- Cumulative Layout Shift (CLS): ${summary.medians.cls}
================================================================
`;

const textPath = path.join(proofDir, 'raft-r2-lighthouse-report.txt');
fs.writeFileSync(textPath, reportText, 'utf8');

console.log(reportText);

