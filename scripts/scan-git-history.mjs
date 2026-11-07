import cp from 'node:child_process';

console.log('====================================================');
console.log('       GIT HISTORY SECURITY & PII SCAN              ');
console.log('====================================================\n');

// 1. Get full git log patch
const fullLog = cp.execSync('git log -p', { maxBuffer: 100 * 1024 * 1024, encoding: 'utf8' });

console.log(`Scanned full git patch history: ${Math.round(fullLog.length / 1024)} KB across all commits.`);

// 2. Check for real emails (excluding benign documentation placeholders)
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;
const BENIGN_DOMAINS = ['example.com', 'resend.dev', 'domain.com', 'schema.org'];

const emailMatches = [];
let m;
while ((m = EMAIL_REGEX.exec(fullLog)) !== null) {
  const email = m[0];
  const domain = m[1].toLowerCase();
  if (!BENIGN_DOMAINS.includes(domain)) {
    emailMatches.push(email);
  }
}

console.log(`\n--- 1. EMAIL SCAN ---`);
if (emailMatches.length === 0) {
  console.log('  [PASS] Zero personal or real email addresses found in git history.');
} else {
  console.log(`  [ALERT] Found ${emailMatches.length} non-placeholder email(s):`, [...new Set(emailMatches)]);
}

// 3. Check for API keys and secrets
console.log(`\n--- 2. SECRETS & API KEYS SCAN ---`);
const SECRET_PATTERNS = [
  { name: 'Resend API Key', regex: /re_[a-zA-Z0-9]{20,}/g },
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g },
  { name: 'GitHub Token', regex: /gh[pousr]_[A-Za-z0-9_]{36,}/g },
  { name: 'Private Key', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { name: 'Slack Webhook / Token', regex: /xox[baprs]-[0-9]{12}-[0-9]{12}-[a-zA-Z0-9]{24}/g },
  { name: 'Generic Password Assignment', regex: /password\s*[:=]\s*["'][^"'\s]{8,}["']/gi }
];

for (const p of SECRET_PATTERNS) {
  const hits = fullLog.match(p.regex) || [];
  // Filter out placeholders
  const realHits = hits.filter(h => !h.includes('your_api_key_here') && !h.includes('placeholder'));
  if (realHits.length > 0) {
    console.log(`  [ALERT] ${p.name}: ${realHits.length} potential hits found!`);
  } else {
    console.log(`  [PASS] ${p.name}: 0 matches`);
  }
}

// 4. Check for Phone numbers
console.log(`\n--- 3. PHONE NUMBER SCAN ---`);
// Phone regex looking for 10-digit Indian numbers (+91...) or standard 10-digit sequences with separators
const PHONE_REGEX = /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/g;
const phoneMatches = [];
while ((m = PHONE_REGEX.exec(fullLog)) !== null) {
  const val = m[0];
  // Filter out benign numeric strings like dates or timestamp numbers
  if (!val.includes('2024') && !val.includes('2026') && val.replace(/\D/g, '').length === 10) {
    phoneMatches.push(val);
  }
}

if (phoneMatches.length === 0) {
  console.log('  [PASS] Zero phone numbers found in git history.');
} else {
  console.log(`  [ALERT] Potential phone matches:`, [...new Set(phoneMatches)]);
}

// 5. Binary file scan in Git object database
console.log(`\n--- 4. BINARY OBJECT SCAN ---`);
const allObjects = cp.execSync('git rev-list --objects --all', { encoding: 'utf8' }).split('\n');
const binaryHits = [];
const BANNED_EXTS = ['.exe', '.dll', '.bin', '.so', '.zip', '.tar', '.gz', '.pdf', '.docx', '.xlsx'];

for (const line of allObjects) {
  const parts = line.trim().split(' ');
  if (parts.length > 1) {
    const filePath = parts[1];
    const lower = filePath.toLowerCase();
    for (const ext of BANNED_EXTS) {
      if (lower.endsWith(ext)) {
        binaryHits.push(filePath);
      }
    }
  }
}

if (binaryHits.length === 0) {
  console.log('  [PASS] Zero binary or executable files committed in git history.');
} else {
  console.log(`  [ALERT] Found ${binaryHits.length} binary files:`, binaryHits);
}

console.log('\n====================================================');
console.log('SECURITY SCAN COMPLETE.');
console.log('====================================================');
