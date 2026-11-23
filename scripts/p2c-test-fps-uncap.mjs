import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9255;

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)));
  return sorted[idx];
}

async function measureBlankPage() {
  const userDataDir = path.join(os.tmpdir(), `chrome-p2c-fps-${Date.now()}`);
  const chromeArgs = [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-sandbox',
    '--disable-extensions',
    '--disable-frame-rate-limit',
    '--disable-gpu-vsync',
    `--user-data-dir=${userDataDir}`,
  ];

  console.log('Launching Chrome with flags: --disable-frame-rate-limit --disable-gpu-vsync');
  const chromeProc = cp.spawn(CHROME_PATH, chromeArgs);
  await new Promise((r) => setTimeout(r, 1500));

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

  const result = await send('Runtime.evaluate', {
    expression: `(async () => {
      const frameDeltas = [];
      let lastTime = performance.now();
      let count = 0;

      await new Promise((resolve) => {
        function onFrame(time) {
          frameDeltas.push(time - lastTime);
          lastTime = time;
          count++;
          if (count < 500) {
            requestAnimationFrame(onFrame);
          } else {
            resolve();
          }
        }
        requestAnimationFrame(onFrame);
      });

      // Discard first 20 warmup frames
      const clean = frameDeltas.slice(20);
      return clean;
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  ws.close();
  chromeProc.kill();
  try {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  } catch {}

  const deltas = result.result?.value || [];
  const p50 = median(deltas);
  const p95 = percentile(deltas, 0.95);
  const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const fps = 1000 / p50;

  console.log(`Samples collected: ${deltas.length}`);
  console.log(`p50 frame time: ${p50.toFixed(3)} ms (effective FPS: ${fps.toFixed(1)})`);
  console.log(`p95 frame time: ${p95.toFixed(3)} ms`);
  console.log(`mean frame time: ${avg.toFixed(3)} ms`);

  if (p50 < 6.9) {
    console.log('[SUCCESS] p50 is clearly below 6.9 ms! Uncapping succeeded.');
  } else {
    console.log('[FAILURE] p50 is NOT clearly below 6.9 ms. Uncapping failed.');
  }
}

measureBlankPage().catch(console.error);

