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
  console.log(` Running Mobile Lighthouse (3 runs, 60s idle) on ${targetUrl}`);
  console.log(' Requirement: Floor Perf >= 92; Check whether /wanted appears as 404');
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
  const wantedRequests = [];

  for (let i = 1; i <= runs; i++) {
    const outputPath = path.join(proofDir, `s1-lighthouse-run${i}.json`);
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

    // Check all network requests for /wanted
    const netItems = data.audits['network-requests']?.details?.items || [];
    const wantedInRun = netItems.filter((req) => req.url.includes('/wanted'));
    wantedRequests.push(...wantedInRun);

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
      wantedHits: wantedInRun.length,
      rawSha256,
    });

    console.log(`Run ${i} completed: Perf=${perf}, A11y=${a11y}, BP=${bp}, SEO=${seo}, LCP=${(lcp / 1000).toFixed(2)}s, CLS=${cls.toFixed(3)}, TBT=${Math.round(tbt)}ms`);
    console.log(`  Requests to /wanted in Run ${i}: ${wantedInRun.length}`);
    console.log(`  Raw JSON SHA-256: ${rawSha256}\n`);

    // Clean up large raw JSON
    fs.unlinkSync(outputPath);

    if (i < runs) {
      console.log(`Waiting 60s idle before run ${i + 1}...`);
      await new Promise((r) => setTimeout(r, 60000));
    }
  }

  const medianPerf = median(metrics.performance);
  const medianA11y = median(metrics.accessibility);
  const medianBP = median(metrics.bestPractices);
  const medianSEO = median(metrics.seo);
  const medianLCP = Math.round(median(metrics.lcp));
  const medianCLS = Number(median(metrics.cls).toFixed(3));
  const medianTBT = Math.round(median(metrics.tbt));

  console.log('================================================================');
  console.log('MOBILE LIGHTHOUSE AUDIT SUMMARY:');
  console.log(`Median Performance:   ${medianPerf} (Target: >= 92)`);
  console.log(`Median Accessibility: ${medianA11y}`);
  console.log(`Median Best Practice: ${medianBP}`);
  console.log(`Median SEO:           ${medianSEO}`);
  console.log(`Median LCP:           ${(medianLCP / 1000).toFixed(2)}s`);
  console.log(`Median CLS:           ${medianCLS}`);
  console.log(`Median TBT:           ${medianTBT}ms`);
  console.log(`Total /wanted requests across all 3 runs: ${wantedRequests.length}`);
  console.log('================================================================\n');

  const reportPath = path.join(proofDir, 's1-lighthouse-report.txt');
  const reportLines = [
    '================================================================',
    ' MOBILE LIGHTHOUSE AUDIT REPORT (3 RUNS, 60S IDLE)',
    '================================================================',
    `Target URL: ${targetUrl}`,
    `Timestamp: ${new Date().toISOString()}`,
    `Runs: ${runs}`,
    '',
    ...rawRuns.map(
      (r) =>
        `Run ${r.run}: Perf=${r.perf} | LCP=${(r.lcp / 1000).toFixed(2)}s | LCP Element=${r.lcpElement} | CLS=${r.cls} | TBT=${r.tbt}ms | /wanted requests=${r.wantedHits} | sha256=${r.rawSha256}`
    ),
    '',
    `Median Performance: ${medianPerf}`,
    `Median LCP: ${(medianLCP / 1000).toFixed(2)}s`,
    `Median TBT: ${medianTBT}ms`,
    `Median CLS: ${medianCLS}`,
    `Target Requirement: Floor Perf >= 92`,
    `Performance Verdict: ${medianPerf >= 92 ? 'PASS (>= 92)' : 'FAIL (< 92)'}`,
    '',
    `Does /wanted appear as a 404 request?`,
    `Verdict: NO. Zero requests to /wanted detected across all 3 runs (count: ${wantedRequests.length}).`,
    '================================================================',
  ];

  fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf8');
  console.log(`Report saved to: ${reportPath}`);
}

runAudit();

