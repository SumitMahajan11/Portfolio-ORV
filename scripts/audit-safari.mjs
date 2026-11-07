import fs from 'node:fs';
import path from 'node:path';

function findFiles(dir, exts, allowNext = false) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && (allowNext || file !== '.next')) {
        results = results.concat(findFiles(fullPath, exts, allowNext));
      }
    } else {
      if (exts.some(ext => file.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

console.log('=== AUDITING SAFARI & CROSS-BROWSER RISKS ===\n');

// 1. svh / dvh usage
const tsxFiles = findFiles('src', ['.ts', '.tsx', '.css']);
console.log('[1] Checking svh / dvh units:');
for (const file of tsxFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('svh') || line.includes('dvh')) {
      console.log(`  ${file}:${idx + 1} -> ${line.trim()}`);
    }
  });
}

// 2. backdrop-filter in built CSS
console.log('\n[2] Checking backdrop-filter and -webkit-backdrop-filter in .next:');
const builtCssFiles = findFiles('.next', ['.css'], true);
for (const f of builtCssFiles) {
  const fullCss = fs.readFileSync(f, 'utf8');
  const hasBackdrop = fullCss.includes('backdrop-filter');
  const hasWebkitBackdrop = fullCss.includes('-webkit-backdrop-filter');
  console.log(`  ${f}: backdrop-filter=${hasBackdrop}, -webkit-backdrop-filter=${hasWebkitBackdrop}`);
}


// 3. ScrollTrigger pinning and address bar
console.log('\n[3] Checking ScrollTrigger pin configs:');
for (const file of tsxFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('pin: true')) {
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('pin: true')) {
        console.log(`  ${file}:${idx + 1} -> ${line.trim()}`);
        const hasAnticipate = content.includes('anticipatePin');
        console.log(`    has anticipatePin: ${hasAnticipate}`);
      }
    });
  }
}

// 4. Audio unlock
console.log('\n[4] Checking audio unlock mechanism:');
const soundFiles = findFiles('src/lib/sound', ['.ts', '.tsx']).concat(findFiles('src/components/sound', ['.ts', '.tsx']));
for (const file of soundFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('AudioContext') || content.includes('resume') || content.includes('state')) {
    console.log(`  ${file}: touches AudioContext / resume`);
  }
}

// 5. getUserMedia and <video> on iOS
console.log('\n[5] Checking getUserMedia and <video playsInline>:');
for (const file of tsxFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('<video') || content.includes('getUserMedia')) {
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('<video') || line.includes('getUserMedia')) {
        console.log(`  ${file}:${idx + 1} -> ${line.trim()}`);
      }
    });
  }
}

// 6. SVG transform-origin and transform-box
console.log('\n[6] Checking SVG transformOrigin:');
for (const file of tsxFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('transformOrigin') && (content.includes('<svg') || content.includes('<path') || content.includes('<g'))) {
    console.log(`  ${file}: sets transformOrigin on SVG elements`);
  }
}

// 7. modern APIs without fallback
console.log('\n[7] Checking modern APIs:');
const modernApis = ['structuredClone', 'randomUUID', '.at(', 'hasOwn', 'requestIdleCallback', 'clipboard.writeText'];
for (const api of modernApis) {
  let count = 0;
  for (const file of tsxFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes(api)) {
      count++;
      console.log(`  ${file} contains '${api}'`);
    }
  }
  if (count === 0) {
    console.log(`  '${api}': 0 occurrences found.`);
  }
}

