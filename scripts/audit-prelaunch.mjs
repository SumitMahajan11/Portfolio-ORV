/**
 * scripts/audit-prelaunch.mjs
 *
 * Pre-launch blocker audit (Report Only)
 * Audits whether the production build is safe to launch according to P6-1 rules:
 *
 * 1. Broken internal links/buttons: Crawls all internal hrefs and interactive targets
 *    (including header, corner bounty button, /skip, etc.) and fails if any route returns 404 or fails.
 * 2. Unfilled placeholders: Fails if any rendered page contains [FILL], [VERIFY],
 *    "Pre-launch", "TODO" or "Phase" followed by a number.
 * 3. Flagship project links: Fails if any flagship project has a null repo or demo link.
 * 4. Resume & PII in PDF: Fails if resume link exists without the PDF file, or if the PDF contains
 *    email, phone number, or street address.
 * 5. Sound system readiness: Fails if sound permission prompt shows but public/audio has no audio files.
 * 6. Empty About section: Fails if the About section has no filled content (paragraphs are empty/null).
 * 7. Contact form env vars: Fails if contact form is enabled but CONTACT_TO_EMAIL, RESEND_API_KEY,
 *    or CONTACT_FROM_EMAIL is missing from .env.example.
 * 8. Hidden fragments & True Ending route security: Fails if /true-ending or hidden fragments
 *    are reachable without their trigger.
 * 9. Production bundle privacy: Fails if production bundles leak email, phone number, or secrets.
 *
 * Exits with code 1 if ANY rule fails; exits with code 0 only if ALL pass.
 */

import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import ts from 'typescript';

const ROOT = process.cwd();
const SERVER_PORT = 3012;
const BASE_URL = `http://localhost:${SERVER_PORT}`;
const CDP_PORT = 9231;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// Helper to transpile and load TS modules without external loaders
function loadTsModule(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const mod = { exports: {} };
  const customRequire = (reqPath) => {
    if (reqPath.startsWith('.')) {
      const resolved = path.resolve(
        path.dirname(filePath),
        reqPath.endsWith('.ts') ? reqPath : `${reqPath}.ts`
      );
      return loadTsModule(resolved);
    }
    return {};
  };

  const fn = new Function('require', 'exports', 'module', transpiled);
  fn(customRequire, mod.exports, mod);
  return mod.exports;
}

// Simple HTTP request helper
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

// Simple CDP WebSocket client
class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.callbacks = new Map();
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
        if (msg.error) {
          reject(new Error(msg.error.message));
        } else {
          resolve(msg.result);
        }
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

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Recursively walk directory
function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        walkDir(full, fileList);
      }
    } else {
      fileList.push(full);
    }
  }
  return fileList;
}

async function main() {
  console.log('================================================================');
  console.log('       PRE-LAUNCH BLOCKER AUDIT (TASK P6-1)                     ');
  console.log('================================================================\n');

  // Verify production build exists
  const nextDir = path.join(ROOT, '.next');
  if (!fs.existsSync(nextDir)) {
    console.error('ERROR: .next production build directory does not exist.');
    console.error('Please run "npm run build" first.');
    process.exit(1);
  }

  // Spawn Next.js production server
  console.log(`[1/4] Spawning production server on port ${SERVER_PORT}...`);
  const serverProc = cp.spawn(
    'cmd.exe',
    ['/c', `npx next start -p ${SERVER_PORT}`],
    {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    }
  );

  let isKilled = false;
  const killProcesses = () => {
    if (isKilled) return;
    isKilled = true;
    try {
      if (serverProc.pid) {
        cp.execSync(`taskkill /pid ${serverProc.pid} /f /t`, { stdio: 'ignore' });
      }
    } catch {
      // already dead
    }
  };

  process.on('exit', killProcesses);
  process.on('SIGINT', () => {
    killProcesses();
    process.exit(1);
  });
  process.on('SIGTERM', () => {
    killProcesses();
    process.exit(1);
  });

  // Wait for server to respond
  let serverReady = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetchUrl(`${BASE_URL}/`);
      if (res.status === 200) {
        serverReady = true;
        break;
      }
    } catch {
      // retry
    }
  }

  if (!serverReady) {
    console.error(`ERROR: Failed to connect to production server at ${BASE_URL}`);
    killProcesses();
    process.exit(1);
  }
  console.log(`[1/4] Production server ready at ${BASE_URL}\n`);

  // Launch Headless Chrome for complete DOM extraction
  console.log(`[2/4] Launching Headless Chrome on CDP port ${CDP_PORT}...`);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-p6-1-'));
  let chromeProc = null;
  let cdpClient = null;

  try {
    if (fs.existsSync(CHROME_PATH)) {
      chromeProc = cp.spawn(
        CHROME_PATH,
        [
          '--headless=new',
          `--remote-debugging-port=${CDP_PORT}`,
          `--user-data-dir=${userDataDir}`,
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-gpu',
          '--disable-extensions',
          'about:blank',
        ],
        { stdio: 'ignore' }
      );

      await new Promise((r) => setTimeout(r, 1500));
      const listRes = await fetch(`http://localhost:${CDP_PORT}/json/list`).then((r) => r.json());
      let pageTarget = listRes.find((t) => t.type === 'page');
      if (!pageTarget) {
        pageTarget = await fetch(`http://localhost:${CDP_PORT}/json/new`).then((r) => r.json());
      }
      cdpClient = new CDPClient(pageTarget.webSocketDebuggerUrl);
      await cdpClient.connect();
      await cdpClient.send('Page.enable');
      await cdpClient.send('Runtime.enable');
      console.log(`[2/4] Headless Chrome connected via CDP.\n`);
    } else {
      console.log(`[2/4] Chrome executable not found; relying on SSR HTTP crawl.\n`);
    }
  } catch (err) {
    console.warn(`[2/4] Warning: CDP connection failed (${err.message}). Proceeding with SSR HTTP crawl.\n`);
  }

  console.log(`[3/4] Executing 9 Pre-Launch Blocker Checks...\n`);

  const auditResults = [];

  // ============================================================================
  // RULE 1: Broken internal links & buttons crawl
  // ============================================================================
  console.log('--- Checking Rule 1: Internal Links & Interactive Buttons ---');
  const internalHrefsFound = new Set();
  const linkOrigins = new Map(); // href -> array of { page, element, label }

  const pagesToCrawl = ['/', '/skip'];
  const pageDomContents = {}; // path -> { ssrHtml, clientText, clientDomHtml }

  for (const pagePath of pagesToCrawl) {
    const pageUrl = `${BASE_URL}${pagePath}`;
    const ssr = await fetchUrl(pageUrl);
    pageDomContents[pagePath] = { ssrHtml: ssr.body, clientText: '', clientDomHtml: '' };

    // Inspect with CDP if available (finds all mounted buttons & links in live DOM)
    if (cdpClient) {
      await cdpClient.send('Page.navigate', { url: pageUrl });
      await new Promise((r) => setTimeout(r, 1200));

      // Scroll to trigger lazy worlds
      await cdpClient.eval(`window.scrollTo(0, document.body.scrollHeight / 2);`);
      await new Promise((r) => setTimeout(r, 800));
      await cdpClient.eval(`window.scrollTo(0, document.body.scrollHeight);`);
      await new Promise((r) => setTimeout(r, 800));

      const domLinks = await cdpClient.eval(`
        (() => {
          const links = Array.from(document.querySelectorAll('a[href]')).map(a => {
            let container = 'Main';
            if (a.closest('header')) container = 'Header';
            else if (a.closest('aside') || a.closest('[aria-label*="bounty"]')) container = 'Corner Bounty Button';
            else if (a.closest('nav')) container = 'Nav';

            return {
              href: a.getAttribute('href'),
              label: (a.innerText || a.getAttribute('aria-label') || a.getAttribute('title') || '').trim(),
              container
            };
          });

          const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
            dataHref: b.getAttribute('data-href'),
            label: (b.innerText || b.getAttribute('aria-label') || '').trim()
          }));

          return { links, buttons, innerText: document.body.innerText, html: document.body.innerHTML };
        })()
      `);

      if (domLinks) {
        pageDomContents[pagePath].clientText = domLinks.innerText;
        pageDomContents[pagePath].clientDomHtml = domLinks.html;

        for (const l of domLinks.links) {
          if (l.href && (l.href.startsWith('/') || l.href.startsWith('#'))) {
            internalHrefsFound.add(l.href);
            if (!linkOrigins.has(l.href)) linkOrigins.set(l.href, []);
            linkOrigins.get(l.href).push({
              page: pagePath,
              container: l.container,
              label: l.label || l.href,
            });
          }
        }
      }
    } else {
      // Fallback regex scan for SSR HTML
      const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
      let match;
      while ((match = linkRegex.exec(ssr.body)) !== null) {
        const href = match[1].trim();
        const rawText = match[2].replace(/<[^>]+>/g, '').trim();
        if (href.startsWith('/') || href.startsWith('#')) {
          internalHrefsFound.add(href);
          if (!linkOrigins.has(href)) linkOrigins.set(href, []);
          linkOrigins.get(href).push({ page: pagePath, container: 'SSR', label: rawText || href });
        }
      }
    }
  }

  // Check each discovered internal target route
  const brokenLinks = [];
  for (const href of internalHrefsFound) {
    if (href.startsWith('#')) continue; // purely in-page anchor

    // Normalize path (strip hash & query)
    const targetPath = href.split('#')[0].split('?')[0];
    if (!targetPath) continue;

    try {
      const res = await fetchUrl(`${BASE_URL}${targetPath}`);
      if (res.status >= 400) {
        const rawOrigins = linkOrigins.get(href) || [];
        // Deduplicate origins for clean reporting
        const uniqueOrigins = Array.from(
          new Set(
            rawOrigins.map((o) => `${o.page} [${o.container}: "${o.label.replace(/\s+/g, ' ')}"]`)
          )
        );
        brokenLinks.push({
          href,
          targetPath,
          status: res.status,
          origins: uniqueOrigins,
        });
      }
    } catch (err) {
      brokenLinks.push({
        href,
        targetPath,
        status: 'FETCH_ERROR',
        error: err.message,
        origins: linkOrigins.get(href) || [],
      });
    }
  }

  const rule1Passed = brokenLinks.length === 0;
  auditResults.push({
    rule: 'Rule 1: Internal Links & Interactive Buttons Crawl',
    status: rule1Passed ? 'PASS' : 'FAIL',
    failures: brokenLinks.map(
      (b) => `Broken internal route '${b.href}' returned HTTP ${b.status} (does not exist). Referenced on: ${b.origins.join(', ')}`
    ),
  });
  console.log(`  -> Result: ${rule1Passed ? 'PASS' : 'FAIL'} (${brokenLinks.length} broken targets)`);

  // ============================================================================
  // RULE 2: Rendered page forbidden strings
  // ============================================================================
  console.log('\n--- Checking Rule 2: Forbidden Placeholder Strings on Rendered Pages ---');
  // Prohibited: [FILL], [VERIFY], "Pre-launch", "TODO", "Phase" followed by a number
  const forbiddenPatterns = [
    { name: '[FILL]', regex: /\[FILL\]/g },
    { name: '[VERIFY]', regex: /\[VERIFY\]/g },
    { name: 'Pre-launch', regex: /pre-launch/gi },
    { name: 'TODO', regex: /\bTODO\b/gi },
    { name: 'Phase <num>', regex: /\bPhase\s*\d+\b/gi },
  ];

  const forbiddenHits = [];
  for (const [pagePath, domData] of Object.entries(pageDomContents)) {
    const combinedContent = `${domData.clientText}\n${domData.ssrHtml}`;

    for (const pat of forbiddenPatterns) {
      let m;
      while ((m = pat.regex.exec(combinedContent)) !== null) {
        const start = Math.max(0, m.index - 30);
        const end = Math.min(combinedContent.length, m.index + m[0].length + 30);
        const snippet = combinedContent
          .substring(start, end)
          .replace(/[\r\n]+/g, ' ')
          .trim();

        if (!forbiddenHits.some((h) => h.page === pagePath && h.match === m[0] && h.snippet === snippet)) {
          forbiddenHits.push({
            page: pagePath,
            ruleName: pat.name,
            match: m[0],
            snippet,
          });
        }
      }
    }
  }

  const rule2Passed = forbiddenHits.length === 0;
  auditResults.push({
    rule: 'Rule 2: Forbidden Placeholder Strings ([FILL], [VERIFY], Pre-launch, TODO, Phase <n>)',
    status: rule2Passed ? 'PASS' : 'FAIL',
    failures: forbiddenHits.map(
      (h) => `Found forbidden text "${h.match}" (${h.ruleName}) on rendered page '${h.page}': "...${h.snippet}..."`
    ),
  });
  console.log(`  -> Result: ${rule2Passed ? 'PASS' : 'FAIL'} (${forbiddenHits.length} forbidden occurrences)`);

  // ============================================================================
  // RULE 3: Flagship project repo or demo link
  // ============================================================================
  console.log('\n--- Checking Rule 3: Flagship Project Repo and Demo Links ---');
  const projectsData = loadTsModule(path.join(ROOT, 'src', 'content', 'projects.ts'));
  const projects = projectsData.projects || [];
  const flagshipProjects = projects.filter((p) => p.status === 'flagship');

  const flagshipMissingLinks = [];
  for (const proj of flagshipProjects) {
    const missing = [];
    if (!proj.links || !proj.links.repo) missing.push('repo');
    if (!proj.links || !proj.links.demo) missing.push('demo');

    if (missing.length > 0) {
      flagshipMissingLinks.push({
        id: proj.id,
        title: proj.title,
        missing,
      });
    }
  }

  const rule3Passed = flagshipMissingLinks.length === 0;
  auditResults.push({
    rule: 'Rule 3: Flagship Project Repo and Demo Links',
    status: rule3Passed ? 'PASS' : 'FAIL',
    failures: flagshipMissingLinks.map(
      (p) => `Flagship project '${p.title}' (${p.id}) has null/missing link(s): ${p.missing.join(', ')}`
    ),
  });
  console.log(`  -> Result: ${rule3Passed ? 'PASS' : 'FAIL'} (${flagshipMissingLinks.length} incomplete flagship projects)`);

  // ============================================================================
  // RULE 4: Resume link & PDF safety
  // ============================================================================
  console.log('\n--- Checking Rule 4: Resume Link & PDF Privacy ---');
  const identityData = loadTsModule(path.join(ROOT, 'src', 'content', 'identity.ts'));
  const resumeLink = identityData.identity?.contact?.resumePdf;
  const resumeFailures = [];

  // Check if any resume link is rendered on the site
  const renderedResumeLinks = [];
  for (const href of internalHrefsFound) {
    if (href.toLowerCase().includes('resume') || href.toLowerCase().endsWith('.pdf')) {
      renderedResumeLinks.push(href);
    }
  }

  // 1. If link exists, verify PDF exists on disk
  const effectiveResumeLink = resumeLink || (renderedResumeLinks.length > 0 ? renderedResumeLinks[0] : null);
  if (effectiveResumeLink) {
    const relativePdfPath = effectiveResumeLink.startsWith('/')
      ? effectiveResumeLink.slice(1)
      : effectiveResumeLink;
    const fullPdfPath = path.join(ROOT, 'public', relativePdfPath);

    if (!fs.existsSync(fullPdfPath)) {
      resumeFailures.push(
        `Resume link exists ('${effectiveResumeLink}'), but the PDF file does not exist at '${fullPdfPath}'.`
      );
    }
  }

  // 2. Check all PDF files in public/resume or public/ for PII
  const publicPdfs = walkDir(path.join(ROOT, 'public')).filter((f) => f.endsWith('.pdf'));
  for (const pdfFile of publicPdfs) {
    const pdfBuf = fs.readFileSync(pdfFile);
    const pdfRaw = pdfBuf.toString('binary');

    // Email scan
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    const emailsInPdf = (pdfRaw.match(emailRegex) || []).filter(
      (e) => !e.includes('example.com') && !e.includes('resend.dev')
    );
    if (emailsInPdf.length > 0) {
      resumeFailures.push(`PDF file '${path.relative(ROOT, pdfFile)}' contains email address(es): ${emailsInPdf.join(', ')}`);
    }

    // Phone scan (10-12 digits formatted)
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
    const phonesInPdf = pdfRaw.match(phoneRegex) || [];
    if (phonesInPdf.length > 0) {
      resumeFailures.push(`PDF file '${path.relative(ROOT, pdfFile)}' contains phone-like string(s): ${phonesInPdf.join(', ')}`);
    }

    // Street address keywords
    const addressRegex = /\b(?:street|road|lane|avenue|nagar|pune|apartment|flat\s*no|pin\s*code|sector)\b/gi;
    const addressInPdf = pdfRaw.match(addressRegex) || [];
    if (addressInPdf.length > 0) {
      resumeFailures.push(`PDF file '${path.relative(ROOT, pdfFile)}' contains street address keyword(s): ${addressInPdf.join(', ')}`);
    }
  }

  const rule4Passed = resumeFailures.length === 0;
  auditResults.push({
    rule: 'Rule 4: Resume Link & PDF Privacy',
    status: rule4Passed ? 'PASS' : 'FAIL',
    failures: resumeFailures,
  });
  console.log(`  -> Result: ${rule4Passed ? 'PASS' : 'FAIL'} (${resumeFailures.length} resume issues)`);

  // ============================================================================
  // RULE 5: Sound prompt vs public/audio files
  // ============================================================================
  console.log('\n--- Checking Rule 5: Sound Permission Prompt & Audio Files ---');
  const soundFailures = [];
  const layoutSource = fs.readFileSync(path.join(ROOT, 'src', 'app', 'layout.tsx'), 'utf8');
  const soundPromptMounted = layoutSource.includes('<SoundPermissionPrompt');

  // Check files in public/audio
  const audioDir = path.join(ROOT, 'public', 'audio');
  const audioFiles = fs.existsSync(audioDir)
    ? fs.readdirSync(audioDir).filter((f) => f !== '.gitkeep' && !f.startsWith('.'))
    : [];

  if (soundPromptMounted && audioFiles.length === 0) {
    soundFailures.push(
      `The sound permission prompt is mounted in src/app/layout.tsx and scheduled to display, but public/audio contains 0 audio files (only .gitkeep).`
    );
  }

  const rule5Passed = soundFailures.length === 0;
  auditResults.push({
    rule: 'Rule 5: Sound Permission Prompt & Audio Files',
    status: rule5Passed ? 'PASS' : 'FAIL',
    failures: soundFailures,
  });
  console.log(`  -> Result: ${rule5Passed ? 'PASS' : 'FAIL'} (${soundFailures.length} sound issues)`);

  // ============================================================================
  // RULE 6: About section empty check
  // ============================================================================
  console.log('\n--- Checking Rule 6: About Section Content ---');
  const aboutData = loadTsModule(path.join(ROOT, 'src', 'content', 'about.ts'));
  const aboutParagraphs = aboutData.about?.paragraphs || [];
  const filledParagraphs = aboutParagraphs.filter((p) => p !== null && p !== undefined && p.trim() !== '');

  const aboutFailures = [];
  if (filledParagraphs.length === 0) {
    aboutFailures.push(
      `The About section (Chapter 0: The Protagonist's Origin) in src/content/about.ts is empty (all ${aboutParagraphs.length} paragraphs are null or empty).`
    );
  }

  const rule6Passed = aboutFailures.length === 0;
  auditResults.push({
    rule: 'Rule 6: About Section Content',
    status: rule6Passed ? 'PASS' : 'FAIL',
    failures: aboutFailures,
  });
  console.log(`  -> Result: ${rule6Passed ? 'PASS' : 'FAIL'} (${aboutFailures.length} about issues)`);

  // ============================================================================
  // RULE 7: Contact form env vars in .env.example
  // ============================================================================
  console.log('\n--- Checking Rule 7: Contact Form Environment Variables ---');
  const contactFormEnabled = identityData.identity?.contact?.formAvailable;
  const envExamplePath = path.join(ROOT, '.env.example');
  const contactEnvFailures = [];

  if (contactFormEnabled) {
    if (!fs.existsSync(envExamplePath)) {
      contactEnvFailures.push('.env.example file is missing entirely.');
    } else {
      const envExample = fs.readFileSync(envExamplePath, 'utf8');
      const requiredVars = ['CONTACT_TO_EMAIL', 'RESEND_API_KEY', 'CONTACT_FROM_EMAIL'];
      for (const varName of requiredVars) {
        const regex = new RegExp(`^\\s*#?\\s*${varName}\\s*=`, 'm');
        if (!regex.test(envExample)) {
          contactEnvFailures.push(`Variable '${varName}' is missing from .env.example.`);
        }
      }
    }
  }

  const rule7Passed = contactEnvFailures.length === 0;
  auditResults.push({
    rule: 'Rule 7: Contact Form Configuration in .env.example',
    status: rule7Passed ? 'PASS' : 'FAIL',
    failures: contactEnvFailures,
  });
  console.log(`  -> Result: ${rule7Passed ? 'PASS' : 'FAIL'} (${contactEnvFailures.length} env var issues)`);

  // ============================================================================
  // RULE 8: Hidden fragment or True Ending route access
  // ============================================================================
  console.log('\n--- Checking Rule 8: Hidden Fragments & True Ending Route Security ---');
  const trueEndingFailures = [];

  // Check if /true-ending route exists or is reachable without trigger
  try {
    const res = await fetchUrl(`${BASE_URL}/true-ending`);
    if (res.status === 200) {
      trueEndingFailures.push(
        `Route /true-ending returned HTTP 200 without its unlock trigger (reachable directly by unauthorized visitors).`
      );
    }
  } catch {
    // Connection or fetch error is fine (means not 200 accessible)
  }

  // Check if any fragment secret routes exist or are publicly open
  const appRoutes = walkDir(path.join(ROOT, 'src', 'app')).map((f) =>
    path.relative(path.join(ROOT, 'src', 'app'), f).replace(/\\/g, '/')
  );
  const secretRoutes = appRoutes.filter(
    (r) => r.includes('true-ending') || r.includes('secret') || r.includes('fragments')
  );

  for (const sRoute of secretRoutes) {
    if (sRoute.endsWith('page.tsx') || sRoute.endsWith('page.jsx') || sRoute.endsWith('page.js')) {
      const cleanPath = '/' + path.dirname(sRoute).replace(/^\.$/, '');
      const testRes = await fetchUrl(`${BASE_URL}${cleanPath}`);
      if (testRes.status === 200) {
        trueEndingFailures.push(`Hidden route '${cleanPath}' is directly reachable with HTTP 200 without unlock trigger.`);
      }
    }
  }

  const rule8Passed = trueEndingFailures.length === 0;
  auditResults.push({
    rule: 'Rule 8: Hidden Fragments & True Ending Route Security',
    status: rule8Passed ? 'PASS' : 'FAIL',
    failures: trueEndingFailures,
  });
  console.log(`  -> Result: ${rule8Passed ? 'PASS' : 'FAIL'} (${trueEndingFailures.length} security leaks)`);

  // ============================================================================
  // RULE 9: Production bundle privacy & secrets
  // ============================================================================
  console.log('\n--- Checking Rule 9: Production Bundle PII & Secret Leakage ---');
  const bundleFailures = [];
  const scanDirs = [
    path.join(ROOT, '.next', 'static'),
    path.join(ROOT, '.next', 'server', 'app'),
  ];

  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const secretRegexes = [
    { name: 'Resend API Key', regex: /\bre_[a-zA-Z0-9]{20,}\b/g },
    { name: 'AWS Access Key', regex: /\bAKIA[0-9A-Z]{16}\b/g },
    { name: 'GitHub Token', regex: /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/g },
    { name: 'Private Key', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  ];

  for (const dir of scanDirs) {
    const files = walkDir(dir).filter((f) => f.match(/\.(js|html|json|txt|rsc)$/));
    for (const file of files) {
      let content = '';
      try {
        content = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      const relPath = path.relative(ROOT, file).replace(/\\/g, '/');

      // 1. Email check
      const emails = content.match(emailRegex) || [];
      for (const email of emails) {
        if (
          !email.match(/@\d+\.\d+/) &&
          !email.includes('example.com') &&
          !email.includes('domain.com') &&
          !email.includes('resend.dev') &&
          !email.includes('schema.org') &&
          !email.includes('w3.org') &&
          !email.includes('vercel.com') &&
          !email.endsWith('.js') &&
          !email.endsWith('.css') &&
          !email.endsWith('.map')
        ) {
          bundleFailures.push(`Personal email address '${email}' detected in bundle file '${relPath}'.`);
        }
      }

      // 2. Secret check
      for (const sec of secretRegexes) {
        const matches = content.match(sec.regex) || [];
        for (const match of matches) {
          if (!match.includes('your_api_key_here') && !match.includes('_interop_require_default')) {
            bundleFailures.push(`Secret pattern (${sec.name}) detected in bundle file '${relPath}': ${match}`);
          }
        }
      }
    }
  }

  const rule9Passed = bundleFailures.length === 0;
  auditResults.push({
    rule: 'Rule 9: Production Bundle PII & Secret Leakage',
    status: rule9Passed ? 'PASS' : 'FAIL',
    failures: bundleFailures,
  });
  console.log(`  -> Result: ${rule9Passed ? 'PASS' : 'FAIL'} (${bundleFailures.length} bundle leaks)`);

  // Clean up server & browser
  if (cdpClient) cdpClient.close();
  if (chromeProc) {
    try {
      chromeProc.kill();
    } catch {}
  }
  killProcesses();

  // ============================================================================
  // FINAL AUDIT REPORT & SUMMARY
  // ============================================================================
  console.log('\n================================================================');
  console.log('                   AUDIT SUMMARY TABLE                          ');
  console.log('================================================================\n');

  console.log('| Rule | Description | Status | Violations Count |');
  console.log('| :--- | :--- | :---: | :---: |');
  for (let i = 0; i < auditResults.length; i++) {
    const r = auditResults[i];
    console.log(`| Rule ${i + 1} | ${r.rule.replace(/^Rule \d+: /, '')} | **${r.status}** | ${r.failures.length} |`);
  }

  const totalFailures = auditResults.reduce((sum, r) => sum + r.failures.length, 0);
  const failedRulesCount = auditResults.filter((r) => r.status === 'FAIL').length;

  console.log('\n================================================================');
  console.log(` PRE-LAUNCH BLOCKERS FOUND: ${totalFailures} across ${failedRulesCount} failed rules`);
  console.log('================================================================\n');

  if (failedRulesCount > 0) {
    console.log('LIST OF PROBLEMS REQUIRING USER FIX BEFORE PRODUCTION LAUNCH:\n');
    let idx = 1;
    for (const r of auditResults) {
      if (r.status === 'FAIL') {
        console.log(`[${r.rule}]`);
        for (const f of r.failures) {
          console.log(`  ${idx++}. ${f}`);
        }
        console.log('');
      }
    }

    console.log('>>> AUDIT RESULT: FAIL (Blockers detected. Site is NOT safe to launch.)\n');
    process.exit(1);
  } else {
    console.log('>>> AUDIT RESULT: PASS (Zero blockers detected. Site is safe to launch.)\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('FATAL AUDIT ERROR:', err);
  process.exit(1);
});
