import fs from 'node:fs';

const content = fs.readFileSync('.next/static/chunks/0ty___o_-32x2.js', 'utf8');
const idx = content.indexOf('living-wall-particles');
console.log('Index:', idx);
console.log(content.slice(Math.max(0, idx - 400), idx + 200));

