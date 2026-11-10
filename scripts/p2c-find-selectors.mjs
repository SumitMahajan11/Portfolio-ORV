import cp from 'node:child_process';
import fs from 'node:fs';

function getLcp(url, label) {
  const tempPath = `D:/temp-p2c/test-${label}.json`;
  cp.execSync(`npx.cmd lighthouse ${url} --chrome-flags="--headless --no-sandbox" --output=json --output-path="${tempPath}" --quiet`);
  const raw = JSON.parse(fs.readFileSync(tempPath, 'utf8'));
  try { fs.unlinkSync(tempPath); } catch {}
  const insight = raw.audits?.['lcp-breakdown-insight'];
  const node = insight?.details?.items?.find(it => it.type === 'node') || insight?.details?.items?.[0];
  return {
    label,
    node,
    score: raw.categories?.performance?.score,
    tbt: raw.audits?.['total-blocking-time']?.numericValue,
    lcp: raw.audits?.['largest-contentful-paint']?.numericValue,
  };
}

console.log('A:', getLcp('http://127.0.0.1:3010/', 'appA'));
console.log('B:', getLcp('http://127.0.0.1:3011/', 'appB'));

