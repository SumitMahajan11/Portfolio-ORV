import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9239;
const SERVER_PORT = 3000;
const BASE_URL = `http://localhost:${SERVER_PORT}/#ratify`;
const OUTPUT_DIR = path.resolve('docs/proofs/screens');

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

async function captureRaftBeats() {
  console.log('====================================================');
  console.log(' CAPTURING 1440x900 SCREENSHOTS OF ALL 5 RAFT BEATS ');
  console.log('====================================================\n');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let serverProc = null;
  // Check if server is already running
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

  const userDataDir = path.join(os.tmpdir(), `chrome-raft-beats-${Date.now()}`);
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

    console.log(`Navigating to ${BASE_URL}...`);
    await send('Page.navigate', { url: BASE_URL });
    await new Promise((r) => setTimeout(r, 3500));

    // Scroll smoothly to Raft (#ratify)
    console.log('Scrolling to #ratify (Hidden Leaf Raft Visualizer)...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.getElementById('ratify');
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
      })()`,
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Capture Beats 1 to 5
    for (let beat = 1; beat <= 5; beat++) {
      console.log(`\nSwitching to Beat ${beat}...`);
      await send('Runtime.evaluate', {
        expression: `(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent && b.textContent.trim() === 'Beat ${beat}');
          if (btn) btn.click();
        })()`,
      });

      // Wait 800ms for state update and CSS transitions
      await new Promise((r) => setTimeout(r, 800));

      const screenshot = await send('Page.captureScreenshot', { format: 'png' });
      const filename = `raft-desktop-beat${beat}.png`;
      const filePath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(filePath, Buffer.from(screenshot.data, 'base64'));
      console.log(`Saved screenshot: ${filePath} (${Buffer.from(screenshot.data, 'base64').length} bytes)`);
    }

    ws.close();
    chromeProc.kill();
    console.log('\nAll 5 beat screenshots captured successfully!');
  } catch (err) {
    chromeProc.kill();
    console.error('Screenshot capture failed:', err);
    throw err;
  } finally {
    if (serverProc) {
      console.log('Stopping temporary Next.js server...');
      cp.spawn('taskkill', ['/pid', String(serverProc.pid), '/f', '/t']);
    }
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

captureRaftBeats().catch((err) => {
  console.error(err);
  process.exit(1);
});
