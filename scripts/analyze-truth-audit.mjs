import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('scripts/truth-audit-data.json', 'utf8'));

console.log('====================================================');
console.log('              TRUTH AUDIT ANALYSIS                  ');
console.log('====================================================\n');

const BANNED_DISALLOWED = [
  '[FILL]',
  'lorem',
  'TODO',
  'dev badge',
  'throughput',
  'latency',
  'production-ready',
  'production ready'
];

for (const [route, pageData] of Object.entries(data)) {
  console.log(`\n========================================`);
  console.log(`Route: ${route}`);
  console.log(`Title: ${pageData.title}`);
  console.log(`========================================`);

  const lowerText = pageData.text.toLowerCase();

  // 1. Check Banned Disallowed
  for (const term of BANNED_DISALLOWED) {
    const hasTerm = pageData.text.includes(term) || lowerText.includes(term.toLowerCase());
    if (hasTerm) {
      console.log(`  [ALERT] Found disallowed term "${term}" in ${route}!`);
    } else {
      console.log(`  [CLEAN] No "${term}" in ${route}`);
    }
  }

  // 2. Ratify Limit check on / and /skip
  if (route === '/' || route === '/skip') {
    const ratifyLimit = '3-node, correctness project, not a performance benchmark.';
    const hasLimit = pageData.text.includes(ratifyLimit);
    console.log(`  [RATIFY LIMIT CHECK]: ${hasLimit ? 'PASS (Visible)' : 'FAIL (Missing!)'}`);
  }

  // 3. Metadata check
  console.log(`\n  -- Meta Tags --`);
  for (const m of pageData.metaTags) {
    if (m.name === 'description' || m.property?.startsWith('og:') || m.name?.startsWith('twitter:')) {
      console.log(`    ${m.name || m.property}: "${m.content}"`);
    }
  }

  // 4. JSON-LD check
  if (pageData.jsonLd.length > 0) {
    console.log(`\n  -- JSON-LD --`);
    console.log(`    ${JSON.stringify(pageData.jsonLd, null, 2)}`);
  }

  // 5. Images alt text
  if (pageData.images.length > 0) {
    console.log(`\n  -- Images Alt --`);
    for (const img of pageData.images) {
      console.log(`    src: ${img.src} -> alt: "${img.alt}"`);
    }
  }
}

// Print full text of each route to inspect all strings
fs.writeFileSync('scripts/extracted-strings-home.txt', data['/']?.text || '', 'utf8');
fs.writeFileSync('scripts/extracted-strings-skip.txt', data['/skip']?.text || '', 'utf8');
fs.writeFileSync('scripts/extracted-strings-wanted.txt', data['/wanted']?.text || '', 'utf8');
fs.writeFileSync('scripts/extracted-strings-true-ending.txt', data['/true-ending']?.text || '', 'utf8');

console.log('\nExtracted strings written to scripts/extracted-strings-*.txt');
