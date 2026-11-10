import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const APP_A_URL = 'http://127.0.0.1:3010/';
const APP_B_URL = 'http://127.0.0.1:3011/';
const PROOF_FILE = path.resolve('docs/proofs/s1b-preflight.txt');

async function inspectApp(url, label) {
  console.log(`\n========================================================`);
  console.log(` Inspecting ${label} (${url})`);
  console.log(`========================================================`);

  const tempJson = path.resolve(`D:/temp-s1b/preflight-${label}.json`);
  const cmd = `npx.cmd lighthouse ${url} --chrome-flags="--headless --no-sandbox --disable-extensions" --output=json --output-path="${tempJson}" --quiet`;
  console.log(`Running initial Lighthouse preflight audit for ${label}...`);
  cp.execSync(cmd, { stdio: 'inherit' });

  const raw = JSON.parse(fs.readFileSync(tempJson, 'utf8'));
  try { fs.unlinkSync(tempJson); } catch {}

  const lcpElem = raw.audits?.['largest-contentful-paint-element']?.details?.items?.[0]?.node?.selector ||
                  raw.audits?.['largest-contentful-paint-element']?.details?.items?.[0]?.node?.nodeLabel || 'unknown';

  const reqItems = raw.audits?.['network-requests']?.details?.items || [];
  const reqList = reqItems.map((r) => ({
    url: r.url.replace(url.slice(0, -1), ''),
    fullUrl: r.url,
    transferSize: r.transferSize,
    resourceSize: r.resourceSize,
    mimeType: r.mimeType,
    statusCode: r.statusCode,
  }));

  return { label, url, lcpElem, reqList };
}

async function main() {
  const appA = await inspectApp(APP_A_URL, 'App-A (HEAD as-is, with BiyooCompanion)');
  const appB = await inspectApp(APP_B_URL, 'App-B (without BiyooCompanion)');

  const output = [];
  function log(msg = '') {
    console.log(msg);
    output.push(msg);
  }

  log('================================================================');
  log(' PREFLIGHT AUDIT: LCP ELEMENT & REQUEST LISTS');
  log('================================================================');
  log(`Timestamp: ${new Date().toISOString()}\n`);

  log(`App A (HEAD with BiyooCompanion):`);
  log(`  URL: ${appA.url}`);
  log(`  LCP Element: ${appA.lcpElem}`);
  log(`  Request Count: ${appA.reqList.length}`);
  log(`  Requests:`);
  for (const r of appA.reqList) {
    log(`    [${r.statusCode}] ${r.mimeType || 'unknown'} (${r.transferSize}B) ${r.url}`);
  }

  log(`\nApp B (without BiyooCompanion):`);
  log(`  URL: ${appB.url}`);
  log(`  LCP Element: ${appB.lcpElem}`);
  log(`  Request Count: ${appB.reqList.length}`);
  log(`  Requests:`);
  for (const r of appB.reqList) {
    log(`    [${r.statusCode}] ${r.mimeType || 'unknown'} (${r.transferSize}B) ${r.url}`);
  }

  log('\n--- COMPARISON ---');
  log(`LCP Elements Match: ${appA.lcpElem === appB.lcpElem ? 'YES (Identical)' : 'NO'}`);
  log(`  App A LCP: ${appA.lcpElem}`);
  log(`  App B LCP: ${appB.lcpElem}`);

  const urlsA = new Set(appA.reqList.map((r) => r.url));
  const urlsB = new Set(appB.reqList.map((r) => r.url));
  const onlyA = [...urlsA].filter((u) => !urlsB.has(u));
  const onlyB = [...urlsB].filter((u) => !urlsA.has(u));

  log(`\nRequests unique to App A (${onlyA.length}):`);
  for (const u of onlyA) log(`  + ${u}`);

  log(`\nRequests unique to App B (${onlyB.length}):`);
  for (const u of onlyB) log(`  - ${u}`);

  fs.writeFileSync(PROOF_FILE, output.join('\n'), 'utf8');
  console.log(`\nPreflight results written to: ${PROOF_FILE}`);
}

main().catch(console.error);

