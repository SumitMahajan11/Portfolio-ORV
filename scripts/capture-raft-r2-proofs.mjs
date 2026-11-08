import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9245;
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

async function captureProofs() {
  console.log('====================================================');
  console.log(' CAPTURING SCREENSHOTS FOR RAFT R2 PROOFS ');
  console.log('====================================================\n');

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
  }

  const userDataDir = path.join(os.tmpdir(), `chrome-raft-r2-${Date.now()}`);
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

    const evaluate = async (expr) => {
      const res = await send('Runtime.evaluate', {
        expression: expr,
        returnByValue: true,
        awaitPromise: true,
      });
      return res.result?.value;
    };

    // -------------------------------------------------------------
    // PART 1: Desktop 1440x900 Screenshots
    // -------------------------------------------------------------
    console.log('Setting viewport to 1440x900 (Desktop)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log(`Navigating to ${BASE_URL}...`);
    await send('Page.navigate', { url: BASE_URL });
    await new Promise((r) => setTimeout(r, 2500));

    // Scroll to Raft World container
    console.log('Scrolling to #ratify...');
    await evaluate(`(async () => {
      // First scroll down through the document to trigger contentVisibility
      window.scrollTo(0, document.body.scrollHeight / 2);
      await new Promise(r => setTimeout(r, 400));
      const el = document.getElementById('ratify');
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'start' });
        await new Promise(r => setTimeout(r, 400));
        const canvas = el.querySelector('[role="region"]');
        if (canvas) {
          canvas.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
      }
    })()`);
    await new Promise((r) => setTimeout(r, 1000));

    // Screenshot 1: Beat 3 mid-election (gold CANDIDATE badge and vote flares visible)
    console.log('Navigating to Beat 3 mid-election event...');
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b3 = btns.find(b => b.textContent.trim().startsWith('Beat 3'));
      if (b3) b3.click();
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    await evaluate(`(() => {
      const evBtns = Array.from(document.querySelectorAll('ol[aria-label="Beat 3 model events"] button'));
      // Event 2 (index 1): Node 2 granted vote to Node 3 for term 2
      if (evBtns[1]) evBtns[1].click();
    })()`);
    await new Promise((r) => setTimeout(r, 700));

    console.log('Capturing Beat 3 mid-election screenshot (1440x900)...');
    const shot1 = await send('Page.captureScreenshot', { format: 'png' });
    const shot1Path = path.join(OUTPUT_DIR, 'raft-desktop-beat3-mid-election.png');
    fs.writeFileSync(shot1Path, Buffer.from(shot1.data, 'base64'));
    console.log(`Saved: ${shot1Path}`);

    // Screenshot 2: Beat 4 dropped-message moment
    console.log('Navigating to Beat 4 dropped message event...');
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b4 = btns.find(b => b.textContent.trim().startsWith('Beat 4'));
      if (b4) b4.click();
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    await evaluate(`(() => {
      const evBtns = Array.from(document.querySelectorAll('ol[aria-label="Beat 4 model events"] button'));
      // Event 5 (index 4): appendEntries(3 -> 1) dropped: partition barrier or down node
      if (evBtns[4]) evBtns[4].click();
    })()`);
    await new Promise((r) => setTimeout(r, 700));

    console.log('Capturing Beat 4 dropped message screenshot (1440x900)...');
    const shot2 = await send('Page.captureScreenshot', { format: 'png' });
    const shot2Path = path.join(OUTPUT_DIR, 'raft-desktop-beat4-dropped-flare.png');
    fs.writeFileSync(shot2Path, Buffer.from(shot2.data, 'base64'));
    console.log(`Saved: ${shot2Path}\n`);

    // -------------------------------------------------------------
    // PART 2: Mobile 390x844 Screenshots (Static Diagram + Logs)
    // -------------------------------------------------------------
    console.log('Setting viewport to 390x844 (Mobile)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });

    console.log(`Reloading ${BASE_URL} on mobile...`);
    await send('Page.navigate', { url: BASE_URL });
    await new Promise((r) => setTimeout(r, 2500));

    // Scroll down to #ratify on mobile
    await evaluate(`(async () => {
      window.scrollTo(0, document.body.scrollHeight / 2);
      await new Promise(r => setTimeout(r, 400));
      const el = document.getElementById('ratify');
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    })()`);
    await new Promise((r) => setTimeout(r, 1000));

    // Verify static diagram is rendered on mobile
    const isStaticRendered = await evaluate(`(() => {
      return Boolean(document.querySelector('[aria-label*="Static Accessible View"]'));
    })()`);
    console.log(`Mobile Static Diagram active: ${isStaticRendered}`);

    // Screenshot 3: Mobile Beat 1 (Static + Logs)
    console.log('Capturing Mobile Beat 1...');
    await evaluate(`(() => {
      const articles = document.querySelectorAll('[aria-label*="Static Accessible View"] article');
      if (articles[0]) {
        articles[0].scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const shot3 = await send('Page.captureScreenshot', { format: 'png' });
    const shot3Path = path.join(OUTPUT_DIR, 'raft-mobile-beat1.png');
    fs.writeFileSync(shot3Path, Buffer.from(shot3.data, 'base64'));
    console.log(`Saved: ${shot3Path}`);

    // Screenshot 4: Mobile Beat 4 (Static + Logs)
    console.log('Capturing Mobile Beat 4...');
    await evaluate(`(() => {
      const articles = document.querySelectorAll('[aria-label*="Static Accessible View"] article');
      if (articles[3]) {
        articles[3].scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const shot4 = await send('Page.captureScreenshot', { format: 'png' });
    const shot4Path = path.join(OUTPUT_DIR, 'raft-mobile-beat4.png');
    fs.writeFileSync(shot4Path, Buffer.from(shot4.data, 'base64'));
    console.log(`Saved: ${shot4Path}`);

    // Screenshot 5: Mobile Beat 5 (Static + Logs)
    console.log('Capturing Mobile Beat 5...');
    await evaluate(`(() => {
      const articles = document.querySelectorAll('[aria-label*="Static Accessible View"] article');
      if (articles[4]) {
        articles[4].scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const shot5 = await send('Page.captureScreenshot', { format: 'png' });
    const shot5Path = path.join(OUTPUT_DIR, 'raft-mobile-beat5.png');
    fs.writeFileSync(shot5Path, Buffer.from(shot5.data, 'base64'));
    console.log(`Saved: ${shot5Path}`);

    ws.close();
  } finally {
    chromeProc.kill('SIGKILL');
    if (serverProc) {
      serverProc.kill();
    }
  }

  console.log('\n====================================================');
  console.log(' ALL 5 SCREENSHOTS CAPTURED SUCCESSFULLY!');
  console.log('====================================================');
}

captureProofs().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
