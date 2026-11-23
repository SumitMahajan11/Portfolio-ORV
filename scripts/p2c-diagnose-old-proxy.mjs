import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

async function diffHtml() {
  console.log('=== HTML & HTTP HEADERS DIFF ===');
  const directRes = await fetch('http://127.0.0.1:3000/');
  const directHtml = await directRes.text();

  await fetch('http://127.0.0.1:3001/__proxy_control?particles=1');
  const proxyWithRes = await fetch('http://127.0.0.1:3001/');
  const proxyWithHtml = await proxyWithRes.text();

  await fetch('http://127.0.0.1:3001/__proxy_control?particles=0');
  const proxyWithoutRes = await fetch('http://127.0.0.1:3001/');
  const proxyWithoutHtml = await proxyWithoutRes.text();

  console.log(`Direct (port 3000) HTML length: ${directHtml.length}`);
  console.log(`Proxy WITH (port 3001) HTML length: ${proxyWithHtml.length}`);
  console.log(`Proxy WITHOUT (port 3001) HTML length: ${proxyWithoutHtml.length}`);

  const htmlEqualDirectVsWith = directHtml === proxyWithHtml;
  const htmlEqualWithVsWithout = proxyWithHtml === proxyWithoutHtml;
  console.log(`HTML direct === proxyWith: ${htmlEqualDirectVsWith}`);
  console.log(`HTML proxyWith === proxyWithout: ${htmlEqualWithVsWithout}`);

  // Test chunk headers and compression
  await fetch('http://127.0.0.1:3001/__proxy_control?particles=1');
  const chunkWithRes = await fetch('http://127.0.0.1:3001/_next/static/chunks/0ty___o_-32x2.js');
  const chunkWithHeaders = Object.fromEntries(chunkWithRes.headers.entries());
  const chunkWithBuf = await chunkWithRes.arrayBuffer();

  await fetch('http://127.0.0.1:3001/__proxy_control?particles=0');
  const chunkWithoutRes = await fetch('http://127.0.0.1:3001/_next/static/chunks/0ty___o_-32x2.js');
  const chunkWithoutHeaders = Object.fromEntries(chunkWithoutRes.headers.entries());
  const chunkWithoutBuf = await chunkWithoutRes.arrayBuffer();

  console.log('\n--- Chunk Response Differences ---');
  console.log('Chunk WITH particles:');
  console.log(`  Status: ${chunkWithRes.status}`);
  console.log(`  Content-Encoding: ${chunkWithHeaders['content-encoding']}`);
  console.log(`  Content-Length: ${chunkWithHeaders['content-length']}`);
  console.log(`  Cache-Control: ${chunkWithHeaders['cache-control']}`);
  console.log(`  Transfer bytes: ${chunkWithBuf.byteLength}`);

  console.log('Chunk WITHOUT particles:');
  console.log(`  Status: ${chunkWithoutRes.status}`);
  console.log(`  Content-Encoding: ${chunkWithoutHeaders['content-encoding']}`);
  console.log(`  Content-Length: ${chunkWithoutHeaders['content-length']}`);
  console.log(`  Cache-Control: ${chunkWithoutHeaders['cache-control']}`);
  console.log(`  Transfer bytes: ${chunkWithoutBuf.byteLength}`);
}

async function runSingleLighthouse(label, particlesState, runNum) {
  await fetch(`http://127.0.0.1:3001/__proxy_control?particles=${particlesState ? 1 : 0}`);
  const tempPath = path.resolve(`scripts/p2c-temp-diag-${label}-${runNum}.json`);
  const cmd = `npx.cmd lighthouse http://127.0.0.1:3001/ --chrome-flags="--headless --no-sandbox --disable-extensions --incognito" --output=json --output-path="${tempPath}" --quiet`;
  console.log(`\nRunning Lighthouse ${label} #${runNum}...`);
  execSync(cmd, { stdio: 'inherit' });

  const raw = JSON.parse(fs.readFileSync(tempPath, 'utf8'));
  try { fs.unlinkSync(tempPath); } catch {}

  const perf = Math.round((raw.categories?.performance?.score ?? 0) * 100);
  const tbt = Math.round(raw.audits?.['total-blocking-time']?.numericValue ?? 0);
  const lcp = Math.round(raw.audits?.['largest-contentful-paint']?.numericValue ?? 0);

  const lcpItem = raw.audits?.['largest-contentful-paint-element']?.details?.items?.[0];
  const lcpSelector = lcpItem?.node?.selector || lcpItem?.node?.nodeLabel || 'unknown';

  // LCP subparts
  const lcpSubparts = {
    ttfb: lcpItem?.ttfb,
    loadDelay: lcpItem?.loadDelay,
    loadTime: lcpItem?.loadDuration,
    renderDelay: lcpItem?.renderDelay,
  };

  const requests = raw.audits?.['network-requests']?.details?.items || [];
  const reqCount = requests.length;
  const totalTransferBytes = requests.reduce((sum, r) => sum + (r.transferSize || 0), 0);
  const totalResourceBytes = requests.reduce((sum, r) => sum + (r.resourceSize || 0), 0);

  const reqSummary = requests.map((r) => ({
    url: r.url.replace('http://127.0.0.1:3001', ''),
    transferSize: r.transferSize,
    resourceSize: r.resourceSize,
    mimeType: r.mimeType,
    statusCode: r.statusCode,
  }));

  return {
    label,
    runNum,
    perf,
    tbt,
    lcp,
    lcpSelector,
    lcpSubparts,
    reqCount,
    totalTransferBytes,
    totalResourceBytes,
    requests: reqSummary,
  };
}

async function main() {
  await diffHtml();

  console.log('\n========================================================');
  console.log('RUNNING 2 WITH AND 2 WITHOUT LIGHTHOUSE RUNS VIA PROXY');
  console.log('========================================================');

  const with1 = await runSingleLighthouse('WITH', true, 1);
  const with2 = await runSingleLighthouse('WITH', true, 2);

  const without1 = await runSingleLighthouse('WITHOUT', false, 1);
  const without2 = await runSingleLighthouse('WITHOUT', false, 2);

  const runs = [with1, with2, without1, without2];

  console.log('\n========================================================');
  console.log(' DIAGNOSTIC COMPARISON TABLE');
  console.log('========================================================');
  for (const r of runs) {
    console.log(`\n[${r.label} Run #${r.runNum}]`);
    console.log(`  Perf: ${r.perf} | TBT: ${r.tbt}ms | LCP: ${(r.lcp / 1000).toFixed(2)}s`);
    console.log(`  LCP Element Selector: ${r.lcpSelector}`);
    console.log(`  LCP Subparts: TTFB=${r.lcpSubparts.ttfb}ms, LoadDelay=${r.lcpSubparts.loadDelay}ms, LoadTime=${r.lcpSubparts.loadTime}ms, RenderDelay=${r.lcpSubparts.renderDelay}ms`);
    console.log(`  Request Count: ${r.reqCount}`);
    console.log(`  Total Transfer Bytes: ${r.totalTransferBytes.toLocaleString()} B`);
    console.log(`  Total Resource Bytes: ${r.totalResourceBytes.toLocaleString()} B`);
  }

  // Compare requests between WITH and WITHOUT
  const urlsWith = new Set(with1.requests.map((r) => r.url));
  const urlsWithout = new Set(without1.requests.map((r) => r.url));
  const onlyWith = [...urlsWith].filter((u) => !urlsWithout.has(u));
  const onlyWithout = [...urlsWithout].filter((u) => !urlsWith.has(u));

  console.log('\n--- Request List Diff ---');
  console.log(`Requests only in WITH: ${onlyWith.length > 0 ? onlyWith.join(', ') : 'none'}`);
  console.log(`Requests only in WITHOUT: ${onlyWithout.length > 0 ? onlyWithout.join(', ') : 'none'}`);

  console.log('\nAll requests in WITH (Run 1):');
  with1.requests.forEach((r, idx) => {
    console.log(`  #${idx + 1}: ${r.url} (${r.mimeType}, transfer: ${r.transferSize}B, status: ${r.statusCode})`);
  });

  console.log('\nAll requests in WITHOUT (Run 1):');
  without1.requests.forEach((r, idx) => {
    console.log(`  #${idx + 1}: ${r.url} (${r.mimeType}, transfer: ${r.transferSize}B, status: ${r.statusCode})`);
  });
}

main().catch(console.error);

