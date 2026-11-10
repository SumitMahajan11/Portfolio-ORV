import fs from 'node:fs';

const content = fs.readFileSync('.next/static/chunks/0ty___o_-32x2.js', 'utf8');
const idx = content.indexOf('rgba(94, 225, 230, 0.85)');
console.log('Dust sprite idx:', idx);
console.log(content.slice(Math.max(0, idx - 100), idx + 200));

