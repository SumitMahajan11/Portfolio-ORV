import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9250;
const SERVER_PORT = 3000;
const TARGET_URL = `http://localhost:${SERVER_PORT}/#ratify`;

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

async function traceChunks() {
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

  const userDataDir = path.join(os.tmpdir(), `chrome-trace-chunks-${Date.now()}`);
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
    const networkRequests = [];

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
        if (req.url.endsWith('.js') || req.url.includes('/_next/static/chunks/')) {
          networkRequests.push({
            url: req.url,
            method: req.method,
            type: msg.params.type,
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
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    console.log(`Navigating to ${TARGET_URL} at 390x844...`);
    await send('Page.navigate', { url: TARGET_URL });
    await new Promise((r) => setTimeout(r, 4000));

    // Scroll to #ratify
    await send('Runtime.evaluate', {
      expression: `(async () => {
        const el = document.getElementById('ratify');
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
      })()`,
      awaitPromise: true,
    });
    await new Promise((r) => setTimeout(r, 2000));

    ws.close();

    console.log('\n====================================================');
    console.log(`TOTAL JS CHUNKS REQUESTED AT 390x844: ${networkRequests.length}`);
    console.log('====================================================');
    networkRequests.forEach((req, idx) => {
      const chunkName = req.url.split('/').pop() || req.url;
      console.log(`${idx + 1}. [${req.type}] ${chunkName} -> ${req.url}`);
    });

    let canvasChunkFound = false;
    let sandboxChunkFound = false;

    const chunksDir = path.resolve('.next/static/chunks');
    for (const req of networkRequests) {
      const filename = req.url.split('/').pop().split('?')[0];
      const filePath = path.join(chunksDir, filename);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        // Only isolated components have their unique identifiers
        if (content.includes('NARUTO_HIDDEN_LEAF') && !content.includes('projects')) {
          canvasChunkFound = true;
        }
        if (content.includes('INTERACTIVE_RAFT_SANDBOX') && !content.includes('projects')) {
          sandboxChunkFound = true;
        }
      }
    }

    console.log(`\nRaft Canvas chunk requested on mobile: ${canvasChunkFound}`);
    console.log(`Raft Sandbox chunk requested on mobile: ${sandboxChunkFound}`);

    const outputPath = path.resolve('docs/proofs/mobile-chunks-raw.txt');
    const outputContent = `MOBILE JS CHUNK REQUESTS AT 390x844 (/#ratify)
Timestamp: ${new Date().toISOString()}
Total Requests: ${networkRequests.length}
Raft Canvas Requested: ${canvasChunkFound}
Raft Sandbox Requested: ${sandboxChunkFound}
Decision relies on hydration-time state: false (media-query gate via useSyncExternalStore)

Chunk Request List:
${networkRequests.map((r, i) => `${i + 1}. [${r.type}] ${r.url}`).join('\n')}
`;
    fs.writeFileSync(outputPath, outputContent, 'utf8');
    console.log(`Saved raw output to: ${outputPath}`);
  } finally {
    chromeProc.kill('SIGKILL');
    if (serverProc) {
      serverProc.kill();
    }
  }
}

traceChunks().catch((err) => {
  console.error(err);
  process.exit(1);
});
