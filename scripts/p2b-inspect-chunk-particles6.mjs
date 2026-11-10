import fs from 'node:fs';

const content = fs.readFileSync('.next/static/chunks/0ty___o_-32x2.js', 'utf8');
const idx = 8430;
console.log(content.slice(idx - 600, idx - 300));

