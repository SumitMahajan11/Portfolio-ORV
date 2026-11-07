import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9235;
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000/';
const OUTPUT_DIR = path.resolve('docs/proofs/screens');

async function captureBiyooStates() {
  console.log('====================================================');
  console.log(' CAPTURING BIYOO STATES: CALM, EXCITED, BURST       ');
  console.log(' Viewports: Desktop 1440x900 and Mobile 390x844     ');
  console.log('====================================================\n');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const userDataDir = path.join(os.tmpdir(), `chrome-biyoo-screens-${Date.now()}`);
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
    await send('DOM.enable');

    const viewports = [
      { name: 'desktop', width: 1440, height: 900, mobile: false, deviceScaleFactor: 1 },
      { name: 'mobile', width: 390, height: 844, mobile: true, deviceScaleFactor: 3 },
    ];

    for (const vp of viewports) {
      console.log(`\n--- Capturing ${vp.name} (${vp.width}x${vp.height}) ---`);

      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.deviceScaleFactor,
        mobile: vp.mobile,
      });

      await send('Page.navigate', { url: TARGET_URL });
      await new Promise((r) => setTimeout(r, 2500));

      // 1. Calm state
      console.log(`Setting state to calm (sleeping)...`);
      await send('Runtime.evaluate', {
        expression: `
          window.dispatchEvent(new CustomEvent('biyoo:action', { detail: { state: 'sleeping' } }));
        `,
      });
      await new Promise((r) => setTimeout(r, 600));

      const calmShot = await send('Page.captureScreenshot', { format: 'png' });
      const calmPath = path.join(OUTPUT_DIR, `biyoo-${vp.name}-calm.png`);
      fs.writeFileSync(calmPath, Buffer.from(calmShot.data, 'base64'));
      console.log(`Saved calm screenshot: ${calmPath} (${fs.statSync(calmPath).size} bytes)`);

      // 2. Burst state: trigger startled and capture during burst pop-in
      console.log(`Setting state to excited (startled) and capturing burst...`);
      await send('Runtime.evaluate', {
        expression: `
          window.dispatchEvent(new CustomEvent('biyoo:action', { detail: { state: 'startled' } }));
        `,
      });
      // Burst scale 1.1 -> 1.0 is complete at ~0.25s, delay is 1.2s before fade
      await new Promise((r) => setTimeout(r, 300));

      const burstShot = await send('Page.captureScreenshot', { format: 'png' });
      const burstPath = path.join(OUTPUT_DIR, `biyoo-${vp.name}-burst.png`);
      fs.writeFileSync(burstPath, Buffer.from(burstShot.data, 'base64'));
      console.log(`Saved burst screenshot: ${burstPath} (${fs.statSync(burstPath).size} bytes)`);

      // 3. Excited state: wait for burst fade (1.2s + 0.3s = 1.5s)
      console.log(`Waiting for burst fadeout to capture excited pose...`);
      await new Promise((r) => setTimeout(r, 1600));

      const excitedShot = await send('Page.captureScreenshot', { format: 'png' });
      const excitedPath = path.join(OUTPUT_DIR, `biyoo-${vp.name}-excited.png`);
      fs.writeFileSync(excitedPath, Buffer.from(excitedPath).length ? Buffer.from(excitedShot.data, 'base64') : Buffer.from(excitedShot.data, 'base64'));
      fs.writeFileSync(excitedPath, Buffer.from(excitedShot.data, 'base64'));
      console.log(`Saved excited screenshot: ${excitedPath} (${fs.statSync(excitedPath).size} bytes)`);
    }

    ws.close();
    chromeProc.kill();
    console.log('\nAll Biyoo state screenshots successfully captured.');
  } catch (err) {
    console.error('Failed to capture Biyoo screenshots:', err);
    chromeProc.kill();
    process.exit(1);
  }
}

captureBiyooStates();
