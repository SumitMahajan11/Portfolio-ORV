import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9237;
const TARGET_URL = 'http://localhost:3000/';
const PROOF_FILE = path.resolve('docs/proofs/network-lists.txt');

async function recordNetwork({ width, height, mobile, hasTouch, movePointer = false }) {
  const userDataDir = path.join(os.tmpdir(), `chrome-net-${Date.now()}-${mobile ? 'mob' : 'desk'}`);
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
    const requests = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Network.requestWillBeSent') {
        requests.push({
          url: msg.params.request.url,
          method: msg.params.request.method,
          type: msg.params.type,
        });
      }
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
    await send('Network.enable');
    await send('Network.clearBrowserCache');

    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: mobile ? 3 : 1,
      mobile,
    });

    if (hasTouch) {
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    }

    console.log(`Navigating (${mobile ? 'Mobile 390x844' : 'Desktop 1440x900'})...`);
    await send('Page.navigate', { url: TARGET_URL });
    await new Promise((r) => setTimeout(r, 3500));

    if (movePointer) {
      await send('Runtime.evaluate', {
        expression: `(() => {
          window.dispatchEvent(new PointerEvent('pointermove', { clientX: 720, clientY: 450, bubbles: true }));
        })()`,
      });
      await new Promise((r) => setTimeout(r, 1000));
    }

    ws.close();
    chromeProc.kill();
    return requests;
  } catch (err) {
    chromeProc.kill();
    throw err;
  } finally {
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

async function run() {
  console.log('====================================================');
  console.log(' TASK 5: NETWORK ASSET AUDIT (MOBILE vs DESKTOP) ');
  console.log(' Assets identified by URL pathname: /art/wall/* ');
  console.log('====================================================\n');

  // 1. Mobile Run (390x844)
  const mobileRequests = await recordNetwork({
    width: 390,
    height: 844,
    mobile: true,
    hasTouch: true,
    movePointer: false,
  });

  // 2. Desktop Run (1440x900)
  const desktopRequests = await recordNetwork({
    width: 1440,
    height: 900,
    mobile: false,
    hasTouch: false,
    movePointer: true,
  });

  const filterWallAssets = (reqs) =>
    reqs
      .filter((r) => r.url.includes('/art/wall/'))
      .map((r) => ({
        filename: path.basename(new URL(r.url).pathname),
        type: r.type,
        url: r.url,
      }));

  const mobileWallAssets = filterWallAssets(mobileRequests);
  const desktopWallAssets = filterWallAssets(desktopRequests);

  console.log('\n--- 1. MOBILE 390x844 NETWORK REQUESTS (/art/wall/*) ---');
  console.table(mobileWallAssets);

  console.log('\n--- 2. DESKTOP 1440x900 NETWORK REQUESTS (/art/wall/* - POSITIVE CONTROL) ---');
  console.table(desktopWallAssets);

  // Verification checks:
  const mobileLoadedBright = mobileWallAssets.some((a) => a.filename.includes('bright'));
  const desktopLoadedBright = desktopWallAssets.some((a) => a.filename.includes('bright'));

  console.log(`\nMobile Loaded Bright Asset: ${mobileLoadedBright} (Expected: FALSE)`);
  console.log(`Desktop Loaded Bright Asset: ${desktopLoadedBright} (Expected: TRUE)`);

  const reportText = [
    '=== TASK 5: NETWORK ASSET AUDIT SUMMARY ===',
    `Date: ${new Date().toISOString()}`,
    'Asset Identification Method: URL path matching /art/wall/* filter.',
    '',
    '1. MOBILE 390x844 NETWORK LIST (/art/wall/*):',
    ...mobileWallAssets.map((a) => ` - [${a.type}] ${a.filename} (${a.url})`),
    `Bright Asset Loaded on Mobile: ${mobileLoadedBright ? 'FAIL (Loaded)' : 'PASS (Not Loaded)'}`,
    '',
    '2. DESKTOP 1440x900 NETWORK LIST (/art/wall/* - Positive Control):',
    ...desktopWallAssets.map((a) => ` - [${a.type}] ${a.filename} (${a.url})`),
    `Bright Asset Loaded on Desktop: ${desktopLoadedBright ? 'PASS (Loaded)' : 'FAIL (Not Loaded)'}`,
    '',
    'Full Mobile 390x844 Request URLs:',
    ...mobileRequests.map((r) => `  ${r.method} ${r.type} ${r.url}`),
    '',
    'Full Desktop 1440x900 Request URLs:',
    ...desktopRequests.map((r) => `  ${r.method} ${r.type} ${r.url}`),
  ].join('\n');

  fs.mkdirSync(path.dirname(PROOF_FILE), { recursive: true });
  fs.writeFileSync(PROOF_FILE, reportText, 'utf8');
  console.log(`\nSaved network audit to ${PROOF_FILE}`);

  if (mobileLoadedBright || !desktopLoadedBright) {
    console.error('ERROR: Network asset verification failed!');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

