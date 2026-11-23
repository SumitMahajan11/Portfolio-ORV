import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function walk(dir, list = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, list);
    else if (entry.name.endsWith('.js')) list.push(full);
  }
  return list;
}

const chunks = walk('.next/static/chunks');
console.log(`Total chunks found: ${chunks.length}`);

for (const chunk of chunks) {
  const content = fs.readFileSync(chunk);
  const text = content.toString('utf8');
  if (
    text.includes('living-wall-particles') ||
    text.includes('wall-particles') ||
    text.includes('AtmosphericParticles') ||
    text.includes('createDustSprite')
  ) {
    const gz = zlib.gzipSync(content);
    console.log(`\nFound in chunk: ${chunk}`);
    console.log(`Raw bytes: ${content.length}`);
    console.log(`Gzip bytes: ${gz.length}`);

    // Check if particles is isolated or bundled with other code
    const hasWall = text.includes('living-wall-compositor') || text.includes('site-wall');
    const hasFlags = text.includes('prefers-reduced-motion');
    console.log(`Contains living-wall/site-wall: ${hasWall}`);
    console.log(`Contains flags: ${hasFlags}`);
  }
}

