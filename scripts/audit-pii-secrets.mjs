import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

// Regexes
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
const API_KEY_PATTERNS = [
  { name: 'Resend API Key', regex: /re_[a-zA-Z0-9_]{16,}/g },
  { name: 'Generic Secret Assignment', regex: /(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"]{8,}['"]/gi },
  { name: 'Bearer Token', regex: /bearer\s+[a-zA-Z0-9_.\-]{16,}/gi }
];

const SCAN_DIRS = ['.next/static', '.next/server', 'src', 'public', 'docs', 'scripts'];
const IGNORE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.ogg', '.pdf', '.map']);

const hits = {
  emails: [],
  phones: [],
  apiKeys: []
};

function scanFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (IGNORE_EXTENSIONS.has(ext)) return;

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return;
  }

  const relPath = path.relative(ROOT, filePath).replace(/\\/g, '/');

  // Skip self
  if (relPath === 'scripts/audit-pii-secrets.mjs') return;

  // 1. Email Scan
  const emailMatches = content.match(EMAIL_REGEX) || [];
  for (const match of emailMatches) {
    // Classify
    let classification = 'UNKNOWN';
    if (match.includes('resend.dev') || match.includes('example.com') || match.includes('onboarding@resend.dev')) {
      classification = 'BENIGN_PLACEHOLDER';
    } else if (match.includes('w3.org') || match.includes('schema.org')) {
      classification = 'XML_NAMESPACE';
    } else if (relPath.includes('03-CONTENT-BIBLE.md') || relPath.includes('verify-bundle-privacy.mjs')) {
      classification = 'AUDIT_RULE_OR_SPEC';
    } else {
      classification = 'POTENTIAL_PII';
    }

    hits.emails.push({
      file: relPath,
      match,
      classification
    });
  }

  // 2. Phone Scan
  const phoneMatches = content.match(PHONE_REGEX) || [];
  for (const match of phoneMatches) {
    // Filter out common false positives: timestamps, commit hashes, version numbers, CSS pixel values, SVG coordinates
    const digitsOnly = match.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) continue;
    if (/^\d{4}-\d{2}-\d{2}/.test(match)) continue; // Date
    if (/^[0-9a-f]{7,40}$/i.test(match)) continue; // Hex/hash

    let classification = 'UNKNOWN';
    if (relPath.includes('.next/static') || relPath.includes('.next/server')) {
      // Typically webpack chunk ids, CSS color hexes, SVG coords, or font hashes
      classification = 'BUILD_ARTIFACT_OR_HASH';
    } else if (relPath.includes('scripts/') || relPath.includes('docs/')) {
      classification = 'DOC_OR_SCRIPT_REFERENCE';
    } else {
      classification = 'POTENTIAL_PHONE';
    }

    hits.phones.push({
      file: relPath,
      match,
      classification
    });
  }

  // 3. API Key Scan
  for (const { name, regex } of API_KEY_PATTERNS) {
    const keyMatches = content.match(regex) || [];
    for (const match of keyMatches) {
      hits.apiKeys.push({
        file: relPath,
        type: name,
        match: match.length > 40 ? match.substring(0, 30) + '...' : match,
        classification: 'SUSPECTED_SECRET'
      });
    }
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'cache') continue;
      walkDir(fullPath);
    } else {
      scanFile(fullPath);
    }
  }
}

for (const d of SCAN_DIRS) {
  walkDir(path.join(ROOT, d));
}

console.log('====================================================');
console.log(' PII & SECRETS AUDIT RESULTS');
console.log('====================================================\n');

console.log(`1. EMAILS FOUND: ${hits.emails.length}`);
hits.emails.forEach(h => console.log(`  [${h.classification}] ${h.file} -> ${h.match}`));

console.log(`\n2. API KEYS / SECRETS FOUND: ${hits.apiKeys.length}`);
hits.apiKeys.forEach(h => console.log(`  [${h.classification}] ${h.file} (${h.type}) -> ${h.match}`));

console.log(`\n3. PHONE-LIKE STRINGS FOUND: ${hits.phones.length}`);
// Show unique matches
const uniquePhones = new Map();
hits.phones.forEach(h => {
  if (!uniquePhones.has(h.match)) uniquePhones.set(h.match, h);
});
console.log(`  (Unique distinct patterns: ${uniquePhones.size})`);
for (const [m, h] of Array.from(uniquePhones.entries()).slice(0, 20)) {
  console.log(`  [${h.classification}] ${h.file} -> ${m}`);
}
if (uniquePhones.size > 20) {
  console.log(`  ... and ${uniquePhones.size - 20} more build artifact number sequences.`);
}

const summary = {
  totalEmails: hits.emails.length,
  personalEmailsFound: hits.emails.filter(e => e.classification === 'POTENTIAL_PII').length,
  totalApiKeys: hits.apiKeys.length,
  totalPhonesPotential: hits.phones.filter(p => p.classification === 'POTENTIAL_PHONE').length
};

fs.writeFileSync(path.join(ROOT, 'docs/proofs/pii-audit-results.json'), JSON.stringify({ summary, hits }, null, 2));
console.log('\nAudit complete. Summary written to docs/proofs/pii-audit-results.json');
