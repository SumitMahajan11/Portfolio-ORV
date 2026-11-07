import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9233;
const BASE_URL = process.env.TARGET_URL || 'http://localhost:3000';

async function verifyTintEdgeCases() {
  console.log('====================================================');
  console.log(' VERIFY TINT CORRECTNESS: DIRECT HASH LOAD & RESIZE ');
  console.log(' (a) Direct load at /#ratify');
  console.log(' (b) Window resize');
  console.log('====================================================\n');

  const userDataDir = path.join(os.tmpdir(), `chrome-tint-edge-${Date.now()}`);
  const chromeProc = cp.spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-sandbox',
    '--disable-extensions',
    '--disable-gpu',
    `--user-data-dir=${userDataDir}`,
  ]);

  await new Promise((r) => setTimeout(r, 1200));

  try {
    const targetRes = await fetch(`http://localhost:${CDP_PORT}/json/new?about:blank`, { method: 'PUT' });
    const target = await targetRes.json();

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });

    let id = 0;
    const callbacks = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        const { resolve, reject } = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };

    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const curId = ++id;
        callbacks.set(curId, { resolve, reject });
        ws.send(JSON.stringify({ id: curId, method, params }));
      });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // Test (a): Direct load at /#ratify
    console.log(`(a) Navigating directly to ${BASE_URL}/#ratify...`);
    await send('Page.navigate', { url: `${BASE_URL}/#ratify` });

    // Wait 3.5s for page load + 2s deferred init controller
    await new Promise((r) => setTimeout(r, 3500));

    const checkTint = async () => {
      const res = await send('Runtime.evaluate', {
        expression: `(() => {
          const scrollY = window.scrollY || document.documentElement.scrollTop;
          const tints = Array.from(document.querySelectorAll('[data-tint]')).map(el => ({
            id: el.getAttribute('data-tint'),
            opacity: parseFloat(window.getComputedStyle(el).opacity || '0'),
          }));
          const ratifyEl = document.getElementById('ratify');
          const ratifyRect = ratifyEl ? ratifyEl.getBoundingClientRect() : null;
          return {
            scrollY,
            viewportHeight: window.innerHeight,
            ratifyTop: ratifyRect ? ratifyRect.top : null,
            ratifyBottom: ratifyRect ? ratifyRect.bottom : null,
            tints,
          };
        })()`,
        returnByValue: true,
      });
      return res.result.value;
    };

    const directLoadState = await checkTint();
    console.log('State after direct load at /#ratify:');
    console.log(`  scrollY: ${directLoadState.scrollY}`);
    console.log(`  ratifyTop: ${directLoadState.ratifyTop}, ratifyBottom: ${directLoadState.ratifyBottom}`);
    console.log('  Tints:', directLoadState.tints);

    // Test (b): Window resize
    console.log('\n(b) Triggering window resize to 1280x800...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // Wait for debounced resize (250ms) + idle callback + crossfade
    await new Promise((r) => setTimeout(r, 1200));

    const resizeState = await checkTint();
    console.log('State after window resize to 1280x800:');
    console.log(`  scrollY: ${resizeState.scrollY}`);
    console.log(`  ratifyTop: ${resizeState.ratifyTop}, ratifyBottom: ${resizeState.ratifyBottom}`);
    console.log('  Tints:', resizeState.tints);

    ws.close();
    chromeProc.kill();

    const output = {
      testA_directLoadRatify: directLoadState,
      testB_windowResize: resizeState,
    };

    const proofDir = path.resolve('docs/proofs');
    fs.mkdirSync(proofDir, { recursive: true });
    fs.writeFileSync(
      path.join(proofDir, 'tint-edgecase-verification.txt'),
      `=== TINT CORRECTNESS VERIFICATION: DIRECT LOAD AT /#ratify & RESIZE ===\n\n` +
      JSON.stringify(output, null, 2) + '\n'
    );

    console.log('\nVerification completed and saved to docs/proofs/tint-edgecase-verification.txt');
  } catch (err) {
    chromeProc.kill();
    console.error('Tint edgecase verification failed:', err);
    process.exit(1);
  } finally {
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

verifyTintEdgeCases();
