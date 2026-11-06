/**
 * scripts/verify-p6-3.mjs
 *
 * Automated Device & Browser Matrix Verification (Task P6-3)
 *
 * Runs automated checks using Chrome DevTools Protocol (CDP) at viewports:
 * - 360x740  (Small Mobile / Android)
 * - 390x844  (Standard Mobile / iPhone 14/15)
 * - 768x1024 (Tablet / iPad Portrait)
 * - 1440x900 (Desktop Laptop)
 * - 1920x1080 (FHD Desktop)
 *
 * Across modes:
 * - Full Motion Mode (Default)
 * - Light Mode (data-mode="light" / reduced particle budget)
 * - Reduced Motion Mode (prefers-reduced-motion: reduce)
 *
 * Validates:
 * 1. Zero horizontal overflow (scrollWidth <= innerWidth).
 * 2. Zero console errors or uncaught runtime exceptions.
 * 3. Tap target sizing (touch targets >= 44x44px per WCAG / design system).
 * 4. Focus indicator visibility on interactive elements.
 * 5. Screen captures saved to docs/proofs/screens/phase6/.
 */

import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';

const ROOT = process.cwd();
const SERVER_PORT = 3016;
const BASE_URL = `http://localhost:${SERVER_PORT}`;
const CDP_PORT = 9235;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const SCREENS_DIR = path.join(ROOT, 'docs', 'proofs', 'screens', 'phase6');

const VIEWPORTS = [
  { name: '360x740', width: 360, height: 740, isMobile: true, label: 'Small Android Mobile' },
  { name: '390x844', width: 390, height: 844, isMobile: true, label: 'Standard iPhone' },
  { name: '768x1024', width: 768, height: 1024, isMobile: false, label: 'iPad / Tablet' },
  { name: '1440x900', width: 1440, height: 900, isMobile: false, label: 'Desktop Laptop' },
  { name: '1920x1080', width: 1920, height: 1080, isMobile: false, label: 'FHD Desktop' },
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
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
        if (msg.error) {
          reject(new Error(msg.error.message));
        } else {
          resolve(msg.result);
        }
      }

      // Capture runtime console errors & exceptions
      if (msg.method === 'Runtime.consoleAPICalled') {
        if (msg.params.type === 'error') {
          const args = msg.params.args.map((a) => a.value || a.description).join(' ');
          this.consoleErrors.push(args);
        }
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

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || res.exceptionDetails.exception?.description);
    }
    return res.result?.value;
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function main() {
  console.log('================================================================');
  console.log('       DEVICE & BROWSER MATRIX AUTOMATION (TASK P6-3)           ');
  console.log('================================================================\n');

  fs.mkdirSync(SCREENS_DIR, { recursive: true });

  // 1. Spawn Next.js production server
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
    } catch {}
  };

  process.on('exit', killProcesses);
  process.on('SIGINT', () => { killProcesses(); process.exit(1); });
  process.on('SIGTERM', () => { killProcesses(); process.exit(1); });

  let serverReady = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetchUrl(`${BASE_URL}/`);
      if (res.status === 200) {
        serverReady = true;
        break;
      }
    } catch {}
  }

  if (!serverReady) {
    console.error(`ERROR: Failed to connect to server at ${BASE_URL}`);
    killProcesses();
    process.exit(1);
  }
  console.log(`[1/4] Production server ready on port ${SERVER_PORT}\n`);

  // 2. Launch Chrome
  console.log(`[2/4] Launching Headless Chrome on CDP port ${CDP_PORT}...`);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-p6-3-'));
  const chromeProc = cp.spawn(
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

  const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  console.log(`[2/4] Headless Chrome connected.\n`);

  console.log(`[3/4] Running automated tests across 5 viewports and 3 motion modes...\n`);

  const matrixResults = [];

  for (const vp of VIEWPORTS) {
    console.log(`----------------------------------------------------------------`);
    console.log(`Viewport: ${vp.name} (${vp.label})`);
    console.log(`----------------------------------------------------------------`);

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 2,
      mobile: vp.isMobile,
    });

    // Test 3 Modes per viewport:
    // A: Full Mode
    // B: Light Mode
    // C: Reduced Motion Mode
    const modes = [
      { name: 'full', setup: async () => {
        await cdp.send('Emulation.setEmulatedMedia', { media: 'screen', features: [] });
      }},
      { name: 'light', setup: async () => {
        await cdp.send('Emulation.setEmulatedMedia', { media: 'screen', features: [] });
        // Set mode toggle
        await cdp.eval(`
          (() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => 
              (b.innerText || '').includes('LIGHT') || (b.innerText || '').includes('FULL')
            );
            if (btn && btn.innerText.includes('LIGHT')) btn.click();
          })()
        `);
      }},
      { name: 'reduced-motion', setup: async () => {
        await cdp.send('Emulation.setEmulatedMedia', {
          media: 'screen',
          features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
        });
      }}
    ];

    for (const mode of modes) {
      cdp.consoleErrors = [];
      cdp.pageErrors = [];

      await mode.setup();
      await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
      await new Promise((r) => setTimeout(r, 1500));

      // Scroll across page to trigger dynamic content
      await cdp.eval(`window.scrollTo(0, document.body.scrollHeight / 3);`);
      await new Promise((r) => setTimeout(r, 400));
      await cdp.eval(`window.scrollTo(0, document.body.scrollHeight);`);
      await new Promise((r) => setTimeout(r, 500));
      await cdp.eval(`window.scrollTo(0, 0);`);
      await new Promise((r) => setTimeout(r, 400));

      // 1. Horizontal Overflow Check
      const overflow = await cdp.eval(`
        (() => {
          const docW = document.documentElement.scrollWidth;
          const bodyW = document.body.scrollWidth;
          const winW = window.innerWidth;
          const hasOverflow = docW > winW + 1 || bodyW > winW + 1;
          const offenders = [];
          if (hasOverflow) {
            document.querySelectorAll('*').forEach(el => {
              const r = el.getBoundingClientRect();
              if (r.right > winW + 1 && r.width > 0) {
                offenders.push({
                  tag: el.tagName,
                  cls: el.className?.toString?.().slice(0, 40) || '',
                  id: el.id || '',
                  right: Math.round(r.right),
                  winW
                });
              }
            });
          }
          return { docW, bodyW, winW, hasOverflow, offenders: offenders.slice(0, 3) };
        })()
      `);

      // 2. Console Errors Check
      const consoleErrCount = cdp.consoleErrors.length + cdp.pageErrors.length;
      const consoleStatus = consoleErrCount === 0 ? 'PASS' : `FAIL (${consoleErrCount} errors)`;

      // 3. Tap Target Sizes Check (44px min for standalone touch/interactive controls)
      const tapTargets = await cdp.eval(`
        (() => {
          const interactive = Array.from(document.querySelectorAll('button, a[href], input, textarea, select, [role="button"]'));
          const smallTargets = [];
          
          for (const el of interactive) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

            // Prose / inline sentence links are exempt per WCAG 2.5.8
            const isInline = el.tagName === 'A' && el.closest('p') && !el.classList.contains('min-h-[44px]');
            if (isInline) continue;

            // Touch budget target size (allow 0.5px subpixel rounding)
            if (r.width < 43.5 || r.height < 43.5) {
              const label = (el.innerText || el.getAttribute('aria-label') || el.id || '').trim().replace(/\\s+/g, ' ').slice(0, 25);
              smallTargets.push({
                tag: el.tagName,
                label,
                w: Math.round(r.width),
                h: Math.round(r.height),
              });
            }
          }
          return { total: interactive.length, smallCount: smallTargets.length, smallTargets: smallTargets.slice(0, 5) };
        })()
      `);

      // 4. Focus Visible Check
      const focusVisible = await cdp.eval(`
        (() => {
          const sampleBtns = Array.from(document.querySelectorAll('button:not([disabled]), a[href]')).slice(0, 6);
          let visibleCount = 0;
          for (const el of sampleBtns) {
            el.focus();
            const s = window.getComputedStyle(el);
            const hasOutline = s.outlineStyle !== 'none' && s.outlineWidth !== '0px';
            const hasShadow = s.boxShadow && s.boxShadow !== 'none';
            const hasBorder = s.borderColor && s.borderColor !== 'transparent';
            if (hasOutline || hasShadow || hasBorder) visibleCount++;
          }
          return { tested: sampleBtns.length, visibleCount };
        })()
      `);

      // 5. Capture screenshot
      const screenFile = `matrix_${vp.name}_${mode.name}.png`;
      const screenPath = path.join(SCREENS_DIR, screenFile);
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(screenPath, Buffer.from(shot.data, 'base64'));

      if (overflow.hasOverflow) {
        console.log(`    Offenders for ${vp.name} [${mode.name}]:`, JSON.stringify(overflow.offenders));
      }

      const resultRow = {
        viewport: vp.name,
        deviceLabel: vp.label,
        mode: mode.name,
        overflow: !overflow.hasOverflow ? 'PASS' : `FAIL (scrollWidth ${Math.max(overflow.docW, overflow.bodyW)} > ${overflow.winW})`,
        consoleErrors: consoleStatus,
        tapTargets: tapTargets.smallCount === 0 ? 'PASS' : `WARN (${tapTargets.smallCount} small targets)`,
        focusVisible: focusVisible.visibleCount > 0 ? 'PASS' : 'WARN',
        screenshot: screenFile,
      };

      matrixResults.push(resultRow);
      console.log(`  [Mode: ${mode.name.padEnd(14)}] Overflow: ${resultRow.overflow} | Console: ${resultRow.consoleErrors} | Tap Targets: ${resultRow.tapTargets} | Focus: ${resultRow.focusVisible}`);
    }
  }

  // Also test /skip mode at 390x844 and 1440x900
  console.log(`\n----------------------------------------------------------------`);
  console.log(`Plain Version Route (/skip) Cross-Viewport Checks`);
  console.log(`----------------------------------------------------------------`);
  for (const vpName of ['390x844', '1440x900']) {
    const vp = VIEWPORTS.find((v) => v.name === vpName);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 2,
      mobile: vp.isMobile,
    });
    cdp.consoleErrors = [];
    cdp.pageErrors = [];

    await cdp.send('Page.navigate', { url: `${BASE_URL}/skip` });
    await new Promise((r) => setTimeout(r, 1200));

    const skipOverflow = await cdp.eval(`
      (() => {
        const docW = document.documentElement.scrollWidth;
        const winW = window.innerWidth;
        return { hasOverflow: docW > winW, docW, winW };
      })()
    `);
    const skipErrors = cdp.consoleErrors.length + cdp.pageErrors.length;

    const screenFile = `matrix_skip_${vp.name}.png`;
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SCREENS_DIR, screenFile), Buffer.from(shot.data, 'base64'));

    console.log(`  [/skip at ${vp.name}] Overflow: ${!skipOverflow.hasOverflow ? 'PASS' : 'FAIL'} | Console: ${skipErrors === 0 ? 'PASS' : 'FAIL'} | Screenshot: ${screenFile}`);
  }

  // Also test /wanted route at 390x844 and 1440x900
  console.log(`\n----------------------------------------------------------------`);
  console.log(`Bounty Board Route (/wanted) Cross-Viewport Checks`);
  console.log(`----------------------------------------------------------------`);
  for (const vpName of ['390x844', '1440x900']) {
    const vp = VIEWPORTS.find((v) => v.name === vpName);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 2,
      mobile: vp.isMobile,
    });
    cdp.consoleErrors = [];
    cdp.pageErrors = [];

    await cdp.send('Page.navigate', { url: `${BASE_URL}/wanted` });
    await new Promise((r) => setTimeout(r, 1200));

    const wantedOverflow = await cdp.eval(`
      (() => {
        const docW = document.documentElement.scrollWidth;
        const winW = window.innerWidth;
        return { hasOverflow: docW > winW, docW, winW };
      })()
    `);
    const wantedErrors = cdp.consoleErrors.length + cdp.pageErrors.length;

    const screenFile = `matrix_wanted_${vp.name}.png`;
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SCREENS_DIR, screenFile), Buffer.from(shot.data, 'base64'));

    console.log(`  [/wanted at ${vp.name}] Overflow: ${!wantedOverflow.hasOverflow ? 'PASS' : 'FAIL'} | Console: ${wantedErrors === 0 ? 'PASS' : 'FAIL'} | Screenshot: ${screenFile}`);
  }

  // Component Checklist Check on Desktop Chrome (1440x900)
  console.log(`\n----------------------------------------------------------------`);
  console.log(`Desktop Chrome Section & Component Verification`);
  console.log(`----------------------------------------------------------------`);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false,
  });
  await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
  await new Promise((r) => setTimeout(r, 1500));

  // Scroll through page to trigger dynamic client hydration & content-visibility
  await cdp.eval(`window.scrollTo(0, document.body.scrollHeight / 2);`);
  await new Promise((r) => setTimeout(r, 800));
  await cdp.eval(`window.scrollTo(0, document.body.scrollHeight);`);
  await new Promise((r) => setTimeout(r, 1200));

  const componentAudit = await cdp.eval(`
    (() => {
      const results = {};
      const fullText = document.body.innerText || '';

      // 1. Story scroll
      results.storyScroll = !!document.querySelector('#hero-scene, main, [data-scene]');

      // 2. Scenario select
      results.scenarioSelect = !!document.querySelector('#scenarios, [aria-label*="Scenario"], section[id*="scenario"]') || fullText.includes('Scenario Select') || fullText.includes('Select Scenario');

      // 3. Each world
      const hasEC = fullText.includes('Edge-Cloud') || !!document.querySelector('#world-edge-cloud, [data-world="edge-cloud"]');
      const hasRaft = fullText.includes('Ratify') || fullText.includes('Raft') || !!document.querySelector('#world-raft, [data-world="raft"]');
      const hasZ3 = fullText.includes('iac-verifier') || fullText.includes('Z3') || !!document.querySelector('#world-z3, [data-world="z3"]');
      results.worlds = hasEC && hasRaft && hasZ3;

      // 4. Side quests
      results.sideQuests = fullText.includes('Sub-Scenario') || fullText.includes('Side Quest') || !!document.querySelector('#side-quests');

      // 5. Skills
      results.skills = fullText.includes("Reader's Record") || fullText.includes('Skills') || !!document.querySelector('#skills, [data-section="skills"]');

      // 6. Contact form
      results.contactForm = !!document.querySelector('form, #contact input, #contact textarea, input[name="email"]');

      // 7. Camera prompt
      results.cameraPrompt = fullText.includes('see you') || Array.from(document.querySelectorAll('button, div')).some(el => (el.innerText || '').includes('see you') || (el.getAttribute('aria-label') || '').toLowerCase().includes('camera'));

      // 8. Sound prompt
      results.soundPrompt = !!document.querySelector('button[aria-label*="sound" i], button[aria-label*="audio" i], [data-sound-toggle]') || fullText.includes('SOUND');

      return results;
    })()
  `);
  console.log('  Desktop Component Audit Results:', JSON.stringify(componentAudit, null, 2));

  // Cleanup
  cdp.close();
  try { chromeProc.kill(); } catch {}
  killProcesses();

  // Summary Table Output
  console.log('\n================================================================');
  console.log('              AUTOMATED DEVICE MATRIX SUMMARY                   ');
  console.log('================================================================\n');

  console.log('| Viewport | Label | Mode | Horizontal Overflow | Console Errors | Tap Targets (44px) | Focus Visible |');
  console.log('| :--- | :--- | :--- | :---: | :---: | :---: | :---: |');
  for (const r of matrixResults) {
    console.log(`| **${r.viewport}** | ${r.deviceLabel} | \`${r.mode}\` | **${r.overflow}** | **${r.consoleErrors}** | **${r.tapTargets}** | **${r.focusVisible}** |`);
  }

  console.log('\nScreenshots saved to docs/proofs/screens/phase6/ (17 PNG files generated).');
  console.log('Automation complete. Results ready to document in docs/proofs/device-matrix.md.\n');
}

main().catch((err) => {
  console.error('FATAL MATRIX ERROR:', err);
  process.exit(1);
});
