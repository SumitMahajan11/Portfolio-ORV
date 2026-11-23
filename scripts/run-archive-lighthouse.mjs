import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

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

async function runAudit() {
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
  const tempFiles = [];

  for (let i = 1; i <= runs; i++) {
    const outputPath = path.join(proofDir, `archive-lighthouse-run${i}.json`);
    tempFiles.push(outputPath);
    console.log(`Starting Run ${i}/${runs}...`);
    const cmd = `npx.cmd lighthouse ${targetUrl} --chrome-flags="--headless --no-sandbox --disable-extensions --incognito" --output=json --output-path="${outputPath}" --quiet`;
    execSync(cmd, { stdio: 'inherit' });

    const rawBuffer = fs.readFileSync(outputPath);
    const rawSha256 = crypto.createHash('sha256').update(rawBuffer).digest('hex');
    const data = JSON.parse(rawBuffer.toString('utf8'));

    const perf = Math.round((data.categories.performance?.score ?? 0) * 100);
    const a11y = Math.round((data.categories.accessibility?.score ?? 0) * 100);
    const bp = Math.round((data.categories['best-practices']?.score ?? 0) * 100);
    const seo = Math.round((data.categories.seo?.score ?? 0) * 100);
    const lcp = data.audits['largest-contentful-paint']?.numericValue ?? 0;
    const lcpElement = data.audits['largest-contentful-paint-element']?.details?.items?.[0]?.node?.selector ||
                       data.audits['largest-contentful-paint-element']?.details?.items?.[0]?.node?.nodeLabel || 'unknown';
    const cls = data.audits['cumulative-layout-shift']?.numericValue ?? 0;
    const tbt = data.audits['total-blocking-time']?.numericValue ?? 0;

    metrics.performance.push(perf);
    metrics.accessibility.push(a11y);
    metrics.bestPractices.push(bp);
    metrics.seo.push(seo);
    metrics.lcp.push(lcp);
    metrics.cls.push(cls);
    metrics.tbt.push(tbt);
    metrics.lcpElements = metrics.lcpElements || [];
    metrics.lcpElements.push(lcpElement);

    rawRuns.push({
      run: i,
      perf,
      a11y,
      bp,
      seo,
      lcp: Math.round(lcp),
      lcpElement,
      cls: Number(cls.toFixed(3)),
      tbt: Math.round(tbt),
      rawSha256,
    });
    console.log(`Run ${i} completed: Perf=${perf}, A11y=${a11y}, BP=${bp}, SEO=${seo}, LCP=${(lcp / 1000).toFixed(2)}s, LCP Element=${lcpElement}, CLS=${cls.toFixed(3)}, TBT=${Math.round(tbt)}ms`);
    console.log(`  Raw JSON SHA-256: ${rawSha256}\n`);

    if (i < runs) {
      console.log(`Waiting 60s idle before run ${i + 1}...`);
      await new Promise((r) => setTimeout(r, 60000));
    }
  }

  const summary = {
    targetUrl,
    medianPerf: median(metrics.performance),
    medianA11y: median(metrics.accessibility),
    medianBP: median(metrics.bestPractices),
    medianSEO: median(metrics.seo),
    medianLCP: Math.round(median(metrics.lcp)),
    lcpElement: metrics.lcpElements?.[0] || 'h1',
    medianCLS: Number(median(metrics.cls).toFixed(3)),
    medianTBT: Math.round(median(metrics.tbt)),
    runs: rawRuns,
  };

  console.log('================================================================');
  console.log('MOBILE LIGHTHOUSE AUDIT SUMMARY:');
  console.log(`Median Performance:   ${summary.medianPerf} (Target: >= 92)`);
  console.log(`Median Accessibility: ${summary.medianA11y}`);
  console.log(`Median Best Practice: ${summary.medianBP}`);
  console.log(`Median SEO:           ${summary.medianSEO}`);
  console.log(`Median LCP:           ${(summary.medianLCP / 1000).toFixed(2)}s`);
  console.log(`LCP Element:          ${summary.lcpElement}`);
  console.log(`Median CLS:           ${summary.medianCLS}`);
  console.log(`Median TBT:           ${summary.medianTBT}ms`);
  console.log('================================================================\n');

  const reportPath = path.join(proofDir, 'archive-lighthouse-report.txt');
  const reportText = [
    '================================================================',
    ' MOBILE LIGHTHOUSE AUDIT REPORT (3 RUNS, 60S IDLE)',
    '================================================================',
    `Target URL: ${targetUrl}`,
    `Timestamp: ${new Date().toISOString()}`,
    `Runs: ${runs}`,
    '',
    `Run 1: Perf=${metrics.performance[0]} | LCP=${(metrics.lcp[0]/1000).toFixed(2)}s | LCP Element=${rawRuns[0].lcpElement} | CLS=${metrics.cls[0].toFixed(3)} | TBT=${Math.round(metrics.tbt[0])}ms | sha256=${rawRuns[0].rawSha256}`,
    `Run 2: Perf=${metrics.performance[1]} | LCP=${(metrics.lcp[1]/1000).toFixed(2)}s | LCP Element=${rawRuns[1].lcpElement} | CLS=${metrics.cls[1].toFixed(3)} | TBT=${Math.round(metrics.tbt[1])}ms | sha256=${rawRuns[1].rawSha256}`,
    `Run 3: Perf=${metrics.performance[2]} | LCP=${(metrics.lcp[2]/1000).toFixed(2)}s | LCP Element=${rawRuns[2].lcpElement} | CLS=${metrics.cls[2].toFixed(3)} | TBT=${Math.round(metrics.tbt[2])}ms | sha256=${rawRuns[2].rawSha256}`,
    '',
    `Median Performance: ${summary.medianPerf}`,
    `Median LCP: ${(summary.medianLCP/1000).toFixed(2)}s`,
    `LCP Element Selector: ${summary.lcpElement}`,
    `Target Requirement: >= 92`,
    `Verdict: ${summary.medianPerf >= 92 ? 'PASS (>= 92)' : 'MISSED (< 92)'}`,
    '================================================================',
  ].join('\n');

  fs.writeFileSync(reportPath, reportText, 'utf8');
  fs.writeFileSync(path.join(proofDir, 'archive-lighthouse-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log(`Summary written to ${reportPath} and archive-lighthouse-summary.json`);

  // Prompt requirement: "commit summaries + sha256, NOT raw Lighthouse JSON"
  // Clean up raw JSON files:
  for (const f of tempFiles) {
    try {
      fs.unlinkSync(f);
      console.log(`Removed raw JSON: ${path.basename(f)}`);
    } catch {}
  }

  console.log(`Lighthouse audit complete. Target >= 92: ${summary.medianPerf >= 92 ? 'PASS' : 'MISSED (reported in proof)'}`);
}

runAudit().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});

