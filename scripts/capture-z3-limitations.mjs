import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9242;
const SERVER_PORT = 3000;
const BASE_URL = `http://localhost:${SERVER_PORT}/#iac-verifier`;
const OUTPUT_DIR = path.resolve('docs/proofs/screens');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'z3-limitations-block-1440x900.png');

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 304) return true;
    } catch {
      // wait and retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function capture() {
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
    console.log('Server is ready!\n');
  } else {
    console.log('Server is already running on port 3000.\n');
  }

  const userDataDir = path.join(os.tmpdir(), `chrome-z3-limits-${Date.now()}`);
  const chromeProc = cp.spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-sandbox',
    '--disable-extensions',
    '--disable-gpu',
    `--user-data-dir=${userDataDir}`,
  ]);

  await new Promise((r) => setTimeout(r, 1500));

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

    console.log(`Navigating to ${BASE_URL}...`);
    await send('Page.navigate', { url: BASE_URL });
    await new Promise((r) => setTimeout(r, 4000));

    // Scroll to the limitations block or proof panel in #iac-verifier
    console.log('Scrolling to Z3 limitations block...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.querySelector('[data-testid="z3-limitations-block"]') || document.querySelector('[data-proof-panel="true"]');
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
      })()`,
    });
    await new Promise((r) => setTimeout(r, 1500));

    console.log('Capturing viewport screenshot at 1440x900...');
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(OUTPUT_FILE, Buffer.from(screenshot.data, 'base64'));
    console.log(`Saved screenshot to ${OUTPUT_FILE}`);

    ws.close();
  } finally {
    try {
      chromeProc.kill('SIGKILL');
    } catch {}
    if (serverProc) {
      try {
        serverProc.kill('SIGKILL');
      } catch {}
    }
  }
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
