import { execSync } from 'node:child_process';
import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const runs = 3;
const targetUrl = 'http://localhost:3000/';
const proofDir = path.resolve('docs/proofs');
fs.mkdirSync(proofDir, { recursive: true });

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 304) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
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

async function runAudit() {
  let serverProc = null;
  let isRunning = false;
  try {
    const res = await fetch(targetUrl);
    if (res.ok) isRunning = true;
  } catch {}

  if (!isRunning) {
    console.log('Starting Next.js production server on port 3000...');
    serverProc = cp.spawn('npm.cmd', ['run', 'start', '--', '-p', '3000'], {
      stdio: 'ignore',
      shell: true,
    });
    await waitForServer(targetUrl);
    console.log('Server is ready!\n');
  }

  try {
    console.log('==============================================');
    console.log(`Running Mobile Lighthouse (3 runs) for Raft R3 on ${targetUrl}`);
    console.log('Requirement: Median Perf >= 77 (B-1c baseline 79)');
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
      const outputPath = path.join(proofDir, `raft-r3-lighthouse-run${i}.json`);
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
        await new Promise((r) => setTimeout(r, 60000));
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

    const summaryPath = path.join(proofDir, 'raft-r3-lighthouse-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

    const reportText = `================================================================
RAFT R3 MOBILE LIGHTHOUSE AUDIT REPORT (3 RUNS, 60s IDLE)
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
- LCP: ${(summary.medians.lcp_ms / 1000).toFixed(2)}s
- CLS: ${summary.medians.cls}
- TBT: ${summary.medians.tbt_ms}ms

Status: ${summary.medians.performance >= 77 ? 'PASS' : 'FAIL'}
================================================================
`;

    fs.writeFileSync(path.join(proofDir, 'raft-r3-lighthouse-report.txt'), reportText, 'utf8');
    console.log(reportText);
  } finally {
    if (serverProc) {
      serverProc.kill();
    }
  }
}

runAudit().catch((err) => {
  console.error(err);
  process.exit(1);
});

