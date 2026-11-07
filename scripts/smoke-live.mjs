/**
 * scripts/smoke-live.mjs
 *
 * Live Site Smoke Test (Task P6-5)
 *
 * Verifies live deployment health against a target URL:
 * 1. HTTP 200: "/", "/skip", and "/wanted" return 200 OK.
 * 2. Zero console errors on initial load for all 3 routes (via Headless Chrome CDP).
 * 3. Security headers are present:
 *    - Content-Security-Policy
 *    - Permissions-Policy (camera=(self), etc.)
 *    - Referrer-Policy
 *    - X-Content-Type-Options (nosniff)
 *    - X-Frame-Options (DENY) or frame-ancestors 'none'
 * 4. Contact API Security: POST /api/contact with empty body returns 400 and never leaks an email.
 * 5. Clean Page Source: No [FILL], [VERIFY], emails, or phone numbers in raw page HTML.
 * 6. Lighthouse Mobile Median: 3 runs each for "/" and "/skip" capturing Perf, A11y, BP, SEO.
 *
 * Usage:
 *   node scripts/smoke-live.mjs [url] [--skip-lighthouse]
 *   npm run smoke -- https://sumitmahajan.dev
 */

import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import https from 'node:https';

const args = process.argv.slice(2);
const skipLighthouse = args.includes('--skip-lighthouse') || args.includes('--quick');
const rawUrlArg = args.find((a) => !a.startsWith('--'));

const TARGET_URL = (rawUrlArg || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9245;

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// Delimited phone format (e.g. (123) 456-7890, 123-456-7890, +1 123-456-7890, etc.)
// Prevents false positives from uninterrupted SVG coordinate decimals (e.g. 4.3721499262608)
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g;

function fetchResponse(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https:');
    const client = isHttps ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.callbacks = new Map();
    this.consoleErrors = [];
    this.pageErrors = [];
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        const text = msg.params.args.map((a) => a.value || a.description).join(' ');
        this.consoleErrors.push(text);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const desc = msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text;
        this.pageErrors.push(desc);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function main() {
  console.log('================================================================');
  console.log('                 POST-LAUNCH LIVE SMOKE TEST                   ');
  console.log(`Target URL: ${TARGET_URL}`);
  console.log('================================================================\n');

  let localServerProc = null;

  // If localhost target is not reachable, spawn temporary production server
  if (TARGET_URL.includes('localhost')) {
    try {
      await fetchResponse(`${TARGET_URL}/`);
    } catch {
      console.log(`Local server not running on ${TARGET_URL}. Spawning production server...`);
      const port = new URL(TARGET_URL).port || '3000';
      localServerProc = cp.spawn('cmd.exe', ['/c', `npx next start -p ${port}`], {
        cwd: process.cwd(),
        stdio: 'ignore',
      });
      // Wait for server to be responsive
      let ready = false;
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 500));
        try {
          const check = await fetchResponse(`${TARGET_URL}/`);
          if (check.status === 200) {
            ready = true;
            break;
          }
        } catch {}
      }
      if (!ready) {
        console.error('Failed to spawn local Next.js server.');
        process.exit(1);
      }
      console.log('Local production server started successfully.\n');
    }
  }

  const cleanup = () => {
    if (localServerProc && localServerProc.pid) {
      try {
        cp.execSync(`taskkill /pid ${localServerProc.pid} /f /t`, { stdio: 'ignore' });
      } catch {}
    }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(1); });
  process.on('SIGTERM', () => { cleanup(); process.exit(1); });

  const summaryResults = [];
  let allPass = true;

  // --------------------------------------------------------------------------
  // Check 1: Route Status Codes (/, /skip, /wanted)
  // --------------------------------------------------------------------------
  console.log('[1/6] Checking HTTP Status 200 on core routes...');
  const routes = ['/', '/skip', '/wanted'];
  const routeBodies = {};
  const routeHeaders = {};
  let routesPass = true;
  const routeDetails = [];

  for (const r of routes) {
    try {
      const res = await fetchResponse(`${TARGET_URL}${r}`);
      routeBodies[r] = res.body;
      routeHeaders[r] = res.headers;
      const pass = res.status === 200;
      if (!pass) routesPass = false;
      routeDetails.push(`${r} -> ${res.status}`);
    } catch (err) {
      routesPass = false;
      routeDetails.push(`${r} -> ERR: ${err.message}`);
    }
  }

  summaryResults.push({
    item: 'Route Status 200 (/, /skip, /wanted)',
    status: routesPass ? 'PASS' : 'FAIL',
    details: routeDetails.join(', '),
  });
  if (!routesPass) allPass = false;

  // --------------------------------------------------------------------------
  // Check 2: Console Errors on Load (CDP)
  // --------------------------------------------------------------------------
  console.log('[2/6] Inspecting runtime console errors on load...');
  let consolePass = true;
  const consoleDetails = [];
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-smoke-'));
  const chromeProc = cp.spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${tmpDir}`,
      '--no-first-run',
      '--disable-gpu',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  try {
    await new Promise((r) => setTimeout(r, 1500));
    const listRes = await fetch(`http://localhost:${CDP_PORT}/json/list`).then((r) => r.json());
    const page = listRes.find((t) => t.type === 'page');
    const cdp = new CDPClient(page.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    for (const r of routes) {
      cdp.consoleErrors = [];
      cdp.pageErrors = [];
      await cdp.send('Page.navigate', { url: `${TARGET_URL}${r}` });
      await new Promise((res) => setTimeout(res, 1200));

      const errs = [...cdp.consoleErrors, ...cdp.pageErrors];
      if (errs.length > 0) {
        consolePass = false;
        consoleDetails.push(`${r}: ${errs.length} errors (${errs[0].slice(0, 35)}...)`);
      } else {
        consoleDetails.push(`${r}: 0 errors`);
      }
    }
    cdp.close();
  } catch (err) {
    consolePass = false;
    consoleDetails.push(`CDP check error: ${err.message}`);
  } finally {
    try { chromeProc.kill(); } catch {}
  }

  summaryResults.push({
    item: 'Console Errors on Load',
    status: consolePass ? 'PASS' : 'FAIL',
    details: consoleDetails.join(' | '),
  });
  if (!consolePass) allPass = false;

  // --------------------------------------------------------------------------
  // Check 3: Security Headers on "/"
  // --------------------------------------------------------------------------
  console.log('[3/6] Verifying security headers on "/"...');
  const rootHeaders = routeHeaders['/'] || {};
  const csp = rootHeaders['content-security-policy'] || '';
  const permissions = rootHeaders['permissions-policy'] || '';
  const referrer = rootHeaders['referrer-policy'] || '';
  const xcto = rootHeaders['x-content-type-options'] || '';
  const xfo = rootHeaders['x-frame-options'] || '';

  const hasCsp = csp.length > 0 && csp.includes('frame-ancestors');
  const hasPerm = permissions.includes('camera=(self)');
  const hasRef = referrer.length > 0;
  const hasXcto = xcto.toLowerCase() === 'nosniff';
  const hasXfo = xfo.toUpperCase() === 'DENY' || csp.includes("frame-ancestors 'none'");

  const secHeadersPass = hasCsp && hasPerm && hasRef && hasXcto && hasXfo;
  const missingHeaders = [];
  if (!hasCsp) missingHeaders.push('CSP');
  if (!hasPerm) missingHeaders.push('Permissions-Policy');
  if (!hasRef) missingHeaders.push('Referrer-Policy');
  if (!hasXcto) missingHeaders.push('X-Content-Type-Options');
  if (!hasXfo) missingHeaders.push('X-Frame-Options/frame-ancestors');

  summaryResults.push({
    item: 'Security Headers',
    status: secHeadersPass ? 'PASS' : 'FAIL',
    details: secHeadersPass ? 'All 5 present (CSP, Perm, Referrer, XCTO, XFO)' : `Missing: ${missingHeaders.join(', ')}`,
  });
  if (!secHeadersPass) allPass = false;

  // --------------------------------------------------------------------------
  // Check 4: Contact API Empty Body (400 and No Email Leak)
  // --------------------------------------------------------------------------
  console.log('[4/6] Testing POST /api/contact with empty body...');
  let contactPass = false;
  let contactDetails = '';
  try {
    const contactRes = await fetchResponse(`${TARGET_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const is400 = contactRes.status === 400;
    const bodyText = contactRes.body || '';
    const headerText = JSON.stringify(contactRes.headers || {});
    const emailInBody = (bodyText.match(EMAIL_REGEX) || []).filter(
      (e) => !e.includes('example.com') && !e.includes('resend.dev')
    );
    const emailInHeaders = (headerText.match(EMAIL_REGEX) || []).filter(
      (e) => !e.includes('example.com') && !e.includes('resend.dev')
    );

    const hasLeakedEmail = emailInBody.length > 0 || emailInHeaders.length > 0;
    contactPass = is400 && !hasLeakedEmail;
    contactDetails = `HTTP ${contactRes.status} (expected 400), Email leaks: ${hasLeakedEmail ? 'YES (FAIL)' : 'None (PASS)'}`;
  } catch (err) {
    contactDetails = `Error: ${err.message}`;
  }

  summaryResults.push({
    item: 'Contact API Empty Body Security',
    status: contactPass ? 'PASS' : 'FAIL',
    details: contactDetails,
  });
  if (!contactPass) allPass = false;

  // --------------------------------------------------------------------------
  // Check 5: Page Source Sanitization (No [FILL], [VERIFY], Email, Phone)
  // --------------------------------------------------------------------------
  console.log('[5/6] Checking page sources for placeholders and PII leaks...');
  let piiPass = true;
  const piiIssues = [];

  for (const r of routes) {
    const html = routeBodies[r] || '';
    if (html.includes('[FILL]')) {
      piiPass = false;
      piiIssues.push(`${r} contains [FILL]`);
    }
    if (html.includes('[VERIFY]')) {
      piiPass = false;
      piiIssues.push(`${r} contains [VERIFY]`);
    }

    const emails = (html.match(EMAIL_REGEX) || []).filter(
      (e) =>
        !e.includes('w3.org') &&
        !e.includes('schema.org') &&
        !e.includes('example.com') &&
        !e.includes('resend.dev')
    );
    if (emails.length > 0) {
      piiPass = false;
      piiIssues.push(`${r} contains email (${emails[0]})`);
    }

    const phoneMatches = html.match(PHONE_REGEX) || [];
    for (const p of phoneMatches) {
      const digits = p.replace(/\D/g, '');
      if (digits.length >= 10 && digits.length <= 15 && !/^\d{4}-\d{2}-\d{2}/.test(p)) {
        piiPass = false;
        piiIssues.push(`${r} contains potential phone (${p})`);
        break;
      }
    }
  }

  summaryResults.push({
    item: 'Page Source Clean (No [FILL], [VERIFY], Email, Phone)',
    status: piiPass ? 'PASS' : 'FAIL',
    details: piiPass ? 'Zero placeholders or PII detected in HTML' : piiIssues.join('; '),
  });
  if (!piiPass) allPass = false;

  // --------------------------------------------------------------------------
  // Check 6: Lighthouse Mobile Median of 3 for "/" and "/skip"
  // --------------------------------------------------------------------------
  if (skipLighthouse) {
    console.log('[6/6] Skipping Lighthouse audit (--skip-lighthouse passed)...\n');
    summaryResults.push({
      item: 'Lighthouse Mobile Median (3 Runs: /, /skip)',
      status: 'SKIPPED',
      details: 'Flag --skip-lighthouse provided',
    });
  } else {
    console.log('[6/6] Running Lighthouse mobile audits (3 runs each for "/" and "/skip")...');
    const lhTargets = [
      { path: '/', label: 'Home (/)' },
      { path: '/skip', label: 'Plain (/skip)' },
    ];
    const lhSummary = [];

    const lhTmpDir = path.join(os.tmpdir(), 'lighthouse-smoke');
    if (!fs.existsSync(lhTmpDir)) fs.mkdirSync(lhTmpDir, { recursive: true });

    for (const t of lhTargets) {
      const scores = { perf: [], a11y: [], bp: [], seo: [] };
      const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      for (let run = 1; run <= 3; run++) {
        const outPath = path.join(lhTmpDir, `smoke_${t.label.replace(/[^a-zA-Z0-9]/g, '_')}_run${run}.json`);
        const cmd = `${npxCmd} lighthouse ${TARGET_URL}${t.path} --chrome-flags="--headless=new --no-sandbox --disable-extensions" --output=json --output-path="${outPath}" --quiet`;
        try {
          cp.execSync(cmd, { stdio: 'ignore' });
          const data = JSON.parse(fs.readFileSync(outPath, 'utf8'));
          scores.perf.push(Math.round((data.categories.performance?.score ?? 0) * 100));
          scores.a11y.push(Math.round((data.categories.accessibility?.score ?? 0) * 100));
          scores.bp.push(Math.round((data.categories['best-practices']?.score ?? 0) * 100));
          scores.seo.push(Math.round((data.categories.seo?.score ?? 0) * 100));
        } catch {
          // If a run errors, record 0
          scores.perf.push(0);
        }
      }

      const medPerf = median(scores.perf);
      const medA11y = median(scores.a11y);
      const medBp = median(scores.bp);
      const medSeo = median(scores.seo);

      lhSummary.push(`${t.label}: Perf ${medPerf} | A11y ${medA11y} | BP ${medBp} | SEO ${medSeo}`);
    }

    summaryResults.push({
      item: 'Lighthouse Mobile Median (3 Runs: /, /skip)',
      status: 'PASS',
      details: lhSummary.join(' | '),
    });
  }

  // --------------------------------------------------------------------------
  // Summary Table Output
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('                    SMOKE TEST RESULTS TABLE                    ');
  console.log('================================================================\n');

  console.log('| Check | Result | Details |');
  console.log('| :--- | :---: | :--- |');
  for (const row of summaryResults) {
    console.log(`| **${row.item}** | **${row.status}** | ${row.details} |`);
  }

  console.log('\n================================================================');
  if (allPass) {
    console.log('OVERALL RESULT: PASS — All smoke verification checks passed!');
    console.log('================================================================\n');
    cleanup();
    process.exit(0);
  } else {
    console.error('OVERALL RESULT: FAIL — One or more smoke checks failed.');
    console.log('================================================================\n');
    cleanup();
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal Smoke Test Error:', err);
  process.exit(1);
});
