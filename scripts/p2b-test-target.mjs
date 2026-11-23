import fs from 'node:fs';

const chunk = fs.readFileSync('.next/static/chunks/0ty___o_-32x2.js', 'utf8');
const target = 'function i(){let{mode:e,lightMode:n,reducedMotion:i}=(0,o.useMode)(),a=n||i||"light"===e||"reduced"===e,l=(0,r.useRef)(null);return((0,r.useEffect)(()=>{if(a)return;let e=l';
console.log('Target found in chunk:', chunk.includes(target));

