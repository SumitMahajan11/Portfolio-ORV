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
  } else {
    console.log('Server is already running on port 3000.\n');
  }

  try {
    console.log('================================================================');
    console.log(`Running Mobile Lighthouse (3 runs) on ${targetUrl}`);
    console.log('Requirement: Median Perf >= 77; 60s idle between runs');
    console.log('================================================================\n');

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
      const outputPath = path.join(proofDir, `z3-lighthouse-run${i}.json`);
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
      medianPerf: median(metrics.performance),
      medianA11y: median(metrics.accessibility),
      medianBP: median(metrics.bestPractices),
      medianSEO: median(metrics.seo),
      medianLCP: Math.round(median(metrics.lcp)),
      medianCLS: Number(median(metrics.cls).toFixed(3)),
      medianTBT: Math.round(median(metrics.tbt)),
      runs: rawRuns,
    };

    console.log('================================================================');
    console.log('LIGHTHOUSE AUDIT SUMMARY:');
    console.log(`Median Performance:   ${summary.medianPerf} (Target: >= 77)`);
    console.log(`Median Accessibility: ${summary.medianA11y}`);
    console.log(`Median Best Practice: ${summary.medianBP}`);
    console.log(`Median SEO:           ${summary.medianSEO}`);
    console.log(`Median LCP:           ${(summary.medianLCP / 1000).toFixed(2)}s`);
    console.log(`Median CLS:           ${summary.medianCLS}`);
    console.log(`Median TBT:           ${summary.medianTBT}ms`);
    console.log('================================================================\n');

    const reportPath = path.join(proofDir, 'z3-lighthouse-report.txt');
    const reportText = [
      '================================================================',
      ' MOBILE LIGHTHOUSE AUDIT REPORT (3 RUNS, 60S IDLE)',
      '================================================================',
      `Target URL: ${targetUrl}`,
      `Runs: ${runs}`,
      '',
      `Run 1: Perf=${metrics.performance[0]} | LCP=${(metrics.lcp[0]/1000).toFixed(2)}s | CLS=${metrics.cls[0].toFixed(3)} | TBT=${Math.round(metrics.tbt[0])}ms`,
      `Run 2: Perf=${metrics.performance[1]} | LCP=${(metrics.lcp[1]/1000).toFixed(2)}s | CLS=${metrics.cls[1].toFixed(3)} | TBT=${Math.round(metrics.tbt[1])}ms`,
      `Run 3: Perf=${metrics.performance[2]} | LCP=${(metrics.lcp[2]/1000).toFixed(2)}s | CLS=${metrics.cls[2].toFixed(3)} | TBT=${Math.round(metrics.tbt[2])}ms`,
      '',
      `Median Performance: ${summary.medianPerf}`,
      `Target Requirement: >= 77`,
      `Verdict: ${summary.medianPerf >= 77 ? 'PASS (>= 77)' : 'FAIL (< 77)'}`,
      '================================================================',
    ].join('\n');

    fs.writeFileSync(reportPath, reportText, 'utf8');
    fs.writeFileSync(path.join(proofDir, 'z3-lighthouse-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
    console.log(`Report written to ${reportPath}`);

    if (summary.medianPerf < 77) {
      throw new Error(`Performance regression: Median Perf ${summary.medianPerf} < 77`);
    }
  } finally {
    if (serverProc) {
      serverProc.kill('SIGKILL');
    }
  }
}

runAudit().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});

