import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

function getPageScripts(htmlPath) {
  if (!fs.existsSync(htmlPath)) return [];
  const html = fs.readFileSync(htmlPath, 'utf8');
  const regex = /src=["'](\/_next\/[^"']+\.js)["']/g;
  const matches = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    matches.push(m[1]);
  }
  return Array.from(new Set(matches));
}

const targets = [
  { name: 'Home (/)', path: '.next/server/app/index.html' },
  { name: 'Skip (/skip)', path: '.next/server/app/skip.html' },
];

for (const target of targets) {
  console.log(`\n========================================`);
  console.log(`Scripts for ${target.name} (${target.path})`);
  console.log(`========================================`);
  const scripts = getPageScripts(target.path);
  let totalRaw = 0;
  let totalGzip = 0;
  const chunkDetails = [];
  for (const s of scripts) {
    const localPath = path.join('.next', s.replace('/_next/', ''));
    if (fs.existsSync(localPath)) {
      const buf = fs.readFileSync(localPath);
      const gzip = zlib.gzipSync(buf);
      totalRaw += buf.length;
      totalGzip += gzip.length;
      chunkDetails.push({ path: s, raw: buf.length, gzip: gzip.length, file: path.basename(s) });
    }
  }
  chunkDetails.sort((a, b) => b.gzip - a.gzip);
  console.log(`Initial Script Count: ${chunkDetails.length}`);
  console.log(`Total Raw Size: ${(totalRaw / 1024).toFixed(2)} KB`);
  console.log(`Total Gzip Size: ${(totalGzip / 1024).toFixed(2)} KB (Budget: 200.00 KB)`);
  console.log(`Budget Status: ${totalGzip / 1024 <= 200 ? 'PASS' : 'FAIL'}`);
  console.log(`\nThree Largest Chunks:`);
  chunkDetails.slice(0, 3).forEach((c, idx) => {
    console.log(`  ${idx + 1}. ${c.file}: ${(c.gzip / 1024).toFixed(2)} KB gzipped (${(c.raw / 1024).toFixed(2)} KB raw)`);
  });
  console.log(`\nAll Chunks:`);
  chunkDetails.forEach((c, idx) => {
    console.log(`  ${idx + 1}. ${c.file}: ${(c.gzip / 1024).toFixed(2)} KB gzipped (${(c.raw / 1024).toFixed(2)} KB raw)`);
  });
}
