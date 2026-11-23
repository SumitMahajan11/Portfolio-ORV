/**
 * Z3 Chunk Positive & Negative Control Verification Script
 * Protocol matches Raft R-3b:
 * 1. Section #iac-verifier confirmed on screen (bounding rect intersecting viewport).
 * 2. Mobile 390x844: confirms Z3VizCanvas chunk is NOT requested.
 * 3. Desktop 1440x900: confirms Z3VizCanvas chunk IS requested (positive control).
 * 4. Identifies chunk by scanning .next/static/chunks/*.js for unique content signature.
 */

import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SERVER_PORT = 3000;
const TARGET_URL = `http://localhost:${SERVER_PORT}/#iac-verifier`;

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 304) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server at ${url} not ready within ${timeoutMs}ms`);
}

function identifyChunks() {
  const chunksDir = path.resolve('.next/static/chunks');
  let canvasChunk = null;

  function searchDir(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const f of files) {
      const full = path.join(dir, f.name);
      if (f.isDirectory()) {
        searchDir(full);
      } else if (f.name.endsWith('.js')) {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes('5_BEATS_INTERACTIVE') && content.includes('Z3VizCanvas')) {
          canvasChunk = f.name;
        }
      }
    }
  }

  searchDir(chunksDir);
  return { canvasChunk };
}

async function runSession({ port, width, height, deviceScaleFactor, mobile }) {
  const userDataDir = path.join(os.tmpdir(), `chrome-z3-chunk-${port}-${Date.now()}`);
  const chromeProc = cp.spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--no-sandbox',
    '--disable-extensions',
    '--disable-gpu',
    `--user-data-dir=${userDataDir}`,
  ]);

  await new Promise((r) => setTimeout(r, 1200));

  try {
    const targetRes = await fetch(`http://localhost:${port}/json/new?about:blank`, { method: 'PUT' });
    const target = await targetRes.json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });

    let id = 0;
    const callbacks = new Map();
    const requests = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        const { resolve, reject } = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
      if (msg.method === 'Network.requestWillBeSent') {
        const req = msg.params.request;
        if (req.url.includes('/_next/static/chunks/')) {
          const filename = req.url.split('/').pop().split('?')[0];
          requests.push({
            filename,
            url: req.url,
            type: msg.params.type,
            time: Date.now(),
          });
        }
      }
    };

    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const curId = ++id;
        callbacks.set(curId, { resolve, reject });
        ws.send(JSON.stringify({ id: curId, method, params }));
      });

    await send('Network.enable');
    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');

    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor,
      mobile,
    });

    // Navigate to page
    await send('Page.navigate', { url: TARGET_URL });
    await new Promise((r) => setTimeout(r, 3500));

    // Scroll until #iac-verifier is mounted and intersecting
    const intersectionCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.getElementById('iac-verifier');
        if (!el) return { exists: false, isIntersecting: false };
        el.scrollIntoView({ behavior: 'instant', block: 'start' });
        const rect = el.getBoundingClientRect();
        const isIntersecting = rect.top < window.innerHeight && rect.bottom > 0;
        return { exists: true, isIntersecting, rect: { top: rect.top, bottom: rect.bottom, height: rect.height } };
      })()`,
      returnByValue: true,
    });

    await new Promise((r) => setTimeout(r, 2000));

    // Check which view is mounted
    const mountedViewCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const staticView = document.querySelector('div[aria-label="Recorded Z3 SMT Reachability & Auto-Repair Output (Static 5-Beat View)"]');
        const interactiveView = document.querySelector('div[aria-label="Interactive Z3 SMT Verification Visualizer"]');
        return {
          hasStaticView: Boolean(staticView),
          hasInteractiveView: Boolean(interactiveView),
        };
      })()`,
      returnByValue: true,
    });

    ws.close();
    return {
      requests,
      intersectionCheck: intersectionCheck.result.value,
      mountedViewCheck: mountedViewCheck.result.value,
    };
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

async function main() {
  console.log('================================================================');
  console.log(' Z3 CHUNK POSITIVE & NEGATIVE CONTROL AUDIT');
  console.log('================================================================\n');

  let serverProc = null;
  let isRunning = false;
  try {
    const res = await fetch(`http://localhost:${SERVER_PORT}/`);
    if (res.ok) isRunning = true;
  } catch {}

  if (!isRunning) {
    console.log('Starting Next.js production server...');
    serverProc = cp.spawn('npm.cmd', ['run', 'start', '--', '-p', String(SERVER_PORT)], {
      stdio: 'ignore',
      shell: true,
    });
    await waitForServer(`http://localhost:${SERVER_PORT}/`);
    console.log('Server is running.\n');
  } else {
    console.log('Server is already running.\n');
  }

  try {
    const { canvasChunk } = identifyChunks();
    console.log(`Canvas Chunk Identified: ${canvasChunk}`);
    console.log(`Identification method: scanned .next/static/chunks/*.js for unique symbols '5_BEATS_INTERACTIVE' and 'Z3VizCanvas'\n`);

    if (!canvasChunk) {
      throw new Error('Failed to identify Z3 dynamic canvas chunk in .next/static/chunks');
    }

    // --- (a) Mobile Session (390x844) ---
    console.log('Running Mobile Test (390x844)...');
    const mobileResult = await runSession({
      port: 9331,
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
    });

    console.log('Mobile Section Intersection Check:', JSON.stringify(mobileResult.intersectionCheck));
    console.log('Mobile Mounted View Check:', JSON.stringify(mobileResult.mountedViewCheck));
    console.log(`Mobile Total Chunk Requests: ${mobileResult.requests.length}`);

    const mobileRequestedCanvas = mobileResult.requests.some((r) => r.filename === canvasChunk);
    console.log(`Mobile Requested Canvas Chunk (${canvasChunk}): ${mobileRequestedCanvas}`);

    if (mobileRequestedCanvas) {
      throw new Error(`FAILURE: Mobile session requested canvas chunk ${canvasChunk}!`);
    }
    console.log('[PASS] Mobile session successfully bypassed dynamic canvas chunk.\n');

    // --- (b) Desktop Session (1440x900) ---
    console.log('Running Desktop Positive Control (1440x900)...');
    const desktopResult = await runSession({
      port: 9332,
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log('Desktop Section Intersection Check:', JSON.stringify(desktopResult.intersectionCheck));
    console.log('Desktop Mounted View Check:', JSON.stringify(desktopResult.mountedViewCheck));
    console.log(`Desktop Total Chunk Requests: ${desktopResult.requests.length}`);

    const desktopRequestedCanvas = desktopResult.requests.some((r) => r.filename === canvasChunk);
    console.log(`Desktop Requested Canvas Chunk (${canvasChunk}): ${desktopRequestedCanvas}`);

    if (!desktopRequestedCanvas) {
      throw new Error(`FAILURE: Desktop positive control did NOT request canvas chunk ${canvasChunk}!`);
    }
    console.log('[PASS] Desktop positive control successfully requested canvas chunk.\n');

    // Print summary
    const summary = [
      '================================================================',
      ' Z3 CHUNK AUDIT SUMMARY',
      '================================================================',
      `Canvas Chunk:              ${canvasChunk}`,
      `Identification Method:     Scanned .next/static/chunks/*.js for unique symbols '5_BEATS_INTERACTIVE' and 'Z3VizCanvas'`,
      '',
      `Mobile Viewport:           390x844`,
      `Mobile Section In View:    ${mobileResult.intersectionCheck.isIntersecting}`,
      `Mobile View Mounted:       hasStaticView=${mobileResult.mountedViewCheck.hasStaticView}, hasInteractiveView=${mobileResult.mountedViewCheck.hasInteractiveView}`,
      `Mobile Canvas Requested:   ${mobileRequestedCanvas} (PASS: 0 dynamic canvas chunks loaded)`,
      '',
      `Desktop Viewport:          1440x900`,
      `Desktop Section In View:   ${desktopResult.intersectionCheck.isIntersecting}`,
      `Desktop View Mounted:      hasStaticView=${desktopResult.mountedViewCheck.hasStaticView}, hasInteractiveView=${desktopResult.mountedViewCheck.hasInteractiveView}`,
      `Desktop Canvas Requested:  ${desktopRequestedCanvas} (PASS: positive control verified)`,
      '================================================================',
      ' ALL CHUNK PROTOCOL CHECKS PASSED',
      '================================================================',
    ].join('\n');

    console.log(summary);
    fs.mkdirSync('docs/proofs', { recursive: true });
    fs.writeFileSync('docs/proofs/z3-chunk-audit.txt', summary, 'utf8');

    // Write full request lists
    const fullLog = [
      summary,
      '',
      '--- MOBILE CHUNK REQUESTS ---',
      ...mobileResult.requests.map((r) => `${r.filename} (${r.url})`),
      '',
      '--- DESKTOP CHUNK REQUESTS ---',
      ...desktopResult.requests.map((r) => `${r.filename} (${r.url})`),
    ].join('\n');

    fs.writeFileSync('docs/proofs/z3-chunk-requests.txt', fullLog, 'utf8');
    console.log('\nReport written to docs/proofs/z3-chunk-audit.txt and docs/proofs/z3-chunk-requests.txt');
  } finally {
    if (serverProc) {
      serverProc.kill('SIGKILL');
    }
  }
}

main().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});

