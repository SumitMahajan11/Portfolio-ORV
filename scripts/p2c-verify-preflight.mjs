import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

async function inspectApp(url, label) {
  console.log(`\n--- Inspecting ${label} (${url}) ---`);

  const tempJson = path.resolve(`D:/temp-p2c/preflight-${label}.json`);
  const cmd = `npx.cmd lighthouse ${url} --chrome-flags="--headless --no-sandbox --disable-extensions" --output=json --output-path="${tempJson}" --quiet`;
  console.log(`Running single Lighthouse for ${label}...`);
  cp.execSync(cmd, { stdio: 'inherit' });

  const raw = JSON.parse(fs.readFileSync(tempJson, 'utf8'));
  try { fs.unlinkSync(tempJson); } catch {}

  const lcpElem = raw.audits?.['largest-contentful-paint-element']?.details?.items?.[0]?.node?.selector ||
                  raw.audits?.['lcp-discovery-insight']?.details?.items?.find((i) => i.type === 'node')?.selector || 'unknown';

  const reqItems = raw.audits?.['network-requests']?.details?.items || [];
  const reqList = reqItems.map(r => ({
    url: r.url.replace(url.slice(0, -1), ''),
    transferSize: r.transferSize,
    resourceSize: r.resourceSize,
    mimeType: r.mimeType,
    statusCode: r.statusCode
  }));

  return { label, lcpElem, reqList };
}

async function main() {
  const appA = await inspectApp('http://127.0.0.1:3010/', 'App-A');
  const appB = await inspectApp('http://127.0.0.1:3011/', 'App-B');

  console.log('\n======================================================');
  console.log(' PRE-FLIGHT VERIFICATION RESULTS');
  console.log('======================================================');
  console.log('App A LCP Element:', appA.lcpElem);
  console.log('App B LCP Element:', appB.lcpElem);
  console.log('LCP Elements Match:', appA.lcpElem === appB.lcpElem);

  console.log(`\nApp A Request Count: ${appA.reqList.length}`);
  console.log(`App B Request Count: ${appB.reqList.length}`);

  console.log('\nApp A Requests:');
  for (const r of appA.reqList) {
    console.log(`  ${r.statusCode} ${r.mimeType} [${r.transferSize}B] ${r.url}`);
  }

  console.log('\nApp B Requests:');
  for (const r of appB.reqList) {
    console.log(`  ${r.statusCode} ${r.mimeType} [${r.transferSize}B] ${r.url}`);
  }

  const urlsA = new Set(appA.reqList.map(r => r.url));
  const urlsB = new Set(appB.reqList.map(r => r.url));
  const onlyA = [...urlsA].filter(u => !urlsB.has(u));
  const onlyB = [...urlsB].filter(u => !urlsA.has(u));

  console.log('\nRequests only in App A (normal):', onlyA);
  console.log('Requests only in App B (without particles):', onlyB);
}

main().catch(console.error);

