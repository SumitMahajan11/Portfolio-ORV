import cp from 'node:child_process';
import fs from 'node:fs';

const patterns = ['SUMIT', 'AppData', 'C:\\Users', 'C:/Users'];
const hits = new Map();

for (const p of patterns) {
  try {
    const out = cp.execFileSync('git', ['grep', '-n', p], { encoding: 'utf8' });
    out.split('\n').filter(Boolean).forEach((line) => {
      const firstColon = line.indexOf(':');
      const secondColon = line.indexOf(':', firstColon + 1);
      const file = line.slice(0, firstColon);
      const lineNum = line.slice(firstColon + 1, secondColon);
      const text = line.slice(secondColon + 1);
      const key = `${file}:${lineNum}`;
      if (!hits.has(key)) {
        hits.set(key, text);
      }
    });
  } catch {
    // pattern might have 0 hits
  }
}

const sortedKeys = Array.from(hits.keys()).sort((a, b) => {
  const [fileA, lineA] = a.split(':');
  const [fileB, lineB] = b.split(':');
  if (fileA !== fileB) return fileA.localeCompare(fileB);
  return parseInt(lineA, 10) - parseInt(lineB, 10);
});

console.log(`Total unique matching file:line hits: ${sortedKeys.length}\n`);
const lines = [];
for (const k of sortedKeys) {
  const line = `${k}: ${hits.get(k)}`;
  console.log(line);
  lines.push(line);
}

fs.mkdirSync('docs/proofs', { recursive: true });
fs.writeFileSync('docs/proofs/personal-data-grep.txt', lines.join('\n'), 'utf8');
console.log(`\nWritten to docs/proofs/personal-data-grep.txt`);
