import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SERVER_PORT = 3000;
const BASE_URL = `http://localhost:${SERVER_PORT}/#iac-verifier`;
const OUTPUT_DIR = path.resolve('docs/proofs/screens');

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

async function captureDesktopBeats() {
  const port = 9341;
  const userDataDir = path.join(os.tmpdir(), `chrome-z3-dt-${Date.now()}`);
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

    console.log('Navigating to Desktop view...');
    await send('Page.navigate', { url: BASE_URL });
    await new Promise((r) => setTimeout(r, 3500));

    // Scroll to interactive view
    await send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.querySelector('div[aria-label="Interactive Z3 SMT Verification Visualizer"]');
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
      })()`,
    });
    await new Promise((r) => setTimeout(r, 800));

    // For beats 1 to 5, click the beat tab and capture screenshot
    for (let beat = 1; beat <= 5; beat++) {
      console.log(`Activating Desktop Beat ${beat}...`);
      await send('Runtime.evaluate', {
        expression: `(() => {
          const buttons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('BEAT ${beat}'));
          if (buttons.length > 0) buttons[0].click();
        })()`,
      });
      await new Promise((r) => setTimeout(r, 600));

      const screenshot = await send('Page.captureScreenshot', { format: 'png' });
      const filePath = path.join(OUTPUT_DIR, `z3-desktop-beat${beat}.png`);
      fs.writeFileSync(filePath, Buffer.from(screenshot.data, 'base64'));
      console.log(`Saved: ${filePath}`);
    }

    ws.close();
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

async function captureMobileBeats() {
  const port = 9342;
  const userDataDir = path.join(os.tmpdir(), `chrome-z3-mb-${Date.now()}`);
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
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    console.log('Navigating to Mobile view...');
    await send('Page.navigate', { url: BASE_URL });
    await new Promise((r) => setTimeout(r, 3500));

    // Capture mobile beats 2, 3, 4
    for (const beat of [2, 3, 4]) {
      console.log(`Scrolling to Mobile Beat ${beat}...`);
      await send('Runtime.evaluate', {
        expression: `(() => {
          const el = document.getElementById('z3-beat-${beat}');
          if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
        })()`,
      });
      await new Promise((r) => setTimeout(r, 800));

      const screenshot = await send('Page.captureScreenshot', { format: 'png' });
      const filePath = path.join(OUTPUT_DIR, `z3-mobile-beat${beat}.png`);
      fs.writeFileSync(filePath, Buffer.from(screenshot.data, 'base64'));
      console.log(`Saved: ${filePath}`);
    }

    ws.close();
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let serverProc = null;
  let isRunning = false;
  try {
    const res = await fetch(`http://localhost:${SERVER_PORT}/`);
    if (res.ok) isRunning = true;
  } catch {}

  if (!isRunning) {
    console.log('Starting Next.js production server on port 3000...');
    serverProc = cp.spawn('npm.cmd', ['run', 'start', '--', '-p', String(SERVER_PORT)], {
      stdio: 'ignore',
      shell: true,
    });
    await waitForServer(`http://localhost:${SERVER_PORT}/`);
  }

  try {
    await captureDesktopBeats();
    await captureMobileBeats();
    console.log('All screenshots captured successfully!');
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

