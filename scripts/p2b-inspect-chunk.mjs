import fs from 'node:fs';
import zlib from 'node:zlib';

const chunkPath = '.next/static/chunks/0ty___o_-32x2.js';
if (fs.existsSync(chunkPath)) {
  const content = fs.readFileSync(chunkPath);
  const gz = zlib.gzipSync(content);
  console.log(`Chunk: ${chunkPath}`);
  console.log(`Raw bytes: ${content.length}`);
  console.log(`Gzip bytes: ${gz.length}`);

  const str = content.toString('utf8');
  const projectModules = str.match(/"\[project\]\/[^"]+"/g) || [];
  console.log('Project modules inside chunk:', [...new Set(projectModules)]);
} else {
  console.log(`Chunk ${chunkPath} does not exist`);
}

