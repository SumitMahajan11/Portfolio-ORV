import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9251;
const SERVER_PORT = 3000;
const TARGET_URL = `http://localhost:${SERVER_PORT}/#ratify`;

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 304) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function captureScreens() {
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
  }

  const screensDir = path.resolve('docs/proofs/screens');
  if (!fs.existsSync(screensDir)) {
    fs.mkdirSync(screensDir, { recursive: true });
  }

  const userDataDir = path.join(os.tmpdir(), `chrome-screens-${Date.now()}`);
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
    await send('DOM.enable');

    // 1440x900 desktop viewport
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log(`Navigating to ${TARGET_URL} at 1440x900...`);
    await send('Page.navigate', { url: TARGET_URL });
    await new Promise((r) => setTimeout(r, 3500));

    // Scroll to sandbox section and click "Open sandbox"
    console.log('Opening sandbox...');
    await send('Runtime.evaluate', {
      expression: `(async () => {
        const btn = document.querySelector('button[aria-label="Open interactive consensus sandbox"]');
        if (btn) {
          btn.scrollIntoView({ behavior: 'instant', block: 'center' });
          btn.click();
        }
      })()`,
      awaitPromise: true,
    });

    await new Promise((r) => setTimeout(r, 2000));

    // Scroll sandbox into view with margin below fixed navbar
    await send('Runtime.evaluate', {
      expression: `(() => {
        const sb = document.querySelector('div[aria-label="Interactive Raft Consensus Sandbox"]');
        if (sb) {
          const top = sb.getBoundingClientRect().top + window.scrollY - 85;
          window.scrollTo({ top, behavior: 'instant' });
        }
      })()`,
    });
    await new Promise((r) => setTimeout(r, 800));

    // Screenshot (a): Normal state
    console.log('Capturing Screenshot (a): Normal state...');
    const shotA = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(screensDir, 'raft-sandbox-normal.png'), Buffer.from(shotA.data, 'base64'));

    // Settle first to elect Node 1 as leader (Term 1)
    console.log('Triggering Settle to elect leader Node 1 (Term 1)...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const settleBtn = document.querySelector('button[aria-label="Trigger deterministic settle reaction"]');
        if (settleBtn) settleBtn.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 2800));

    // Crash leader (Node 1)
    console.log('Crashing leader Node 1...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const crashBtn = document.querySelector('button[aria-label="Crash Node 1"]');
        if (crashBtn) crashBtn.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 800));

    // Now trigger election in Term 2 where Node 2 times out
    console.log('Triggering Settle: Node 2 times out into Term 2 as CANDIDATE...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const settleBtn = document.querySelector('button[aria-label="Trigger deterministic settle reaction"]');
        if (settleBtn) settleBtn.click();
      })()`,
    });
    // Wait 150ms into the 600ms timeout event animation
    await new Promise((r) => setTimeout(r, 150));

    // Screenshot (b): Leader crashed, mid-election with gold CANDIDATE badge visible
    console.log('Capturing Screenshot (b): Leader crashed, Node 2 gold candidate mid-election...');
    const shotB = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(screensDir, 'raft-sandbox-crash-leader.png'), Buffer.from(shotB.data, 'base64'));
    fs.writeFileSync(path.join(screensDir, 'raft-sandbox-candidate-mid-election.png'), Buffer.from(shotB.data, 'base64'));

    // Wait for election to complete before proceeding to no-quorum test
    await new Promise((r) => setTimeout(r, 2500));

    // Trigger No-Quorum state: Crash Node 2 as well, then attempt Settle
    console.log('Crashing Node 2 and attempting Settle (No-Quorum state)...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const crashN2 = document.querySelector('button[aria-label="Crash Node 2"]');
        if (crashN2) crashN2.click();
        const settleBtn = document.querySelector('button[aria-label="Trigger deterministic settle reaction"]');
        if (settleBtn) settleBtn.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Screenshot (c): No-quorum state
    console.log('Capturing Screenshot (c): No-quorum state...');
    const shotC = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(screensDir, 'raft-sandbox-no-quorum.png'), Buffer.from(shotC.data, 'base64'));

    console.log('All 3 desktop screenshots captured successfully in docs/proofs/screens/ !');
    ws.close();
  } finally {
    chromeProc.kill('SIGKILL');
    if (serverProc) {
      serverProc.kill();
    }
  }
}

captureScreens().catch((err) => {
  console.error(err);
  process.exit(1);
});
