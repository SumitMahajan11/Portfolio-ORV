import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9256;
const TARGET_URL = 'http://127.0.0.1:3010/';

async function measureScriptCost6x() {
  const userDataDir = path.join(os.tmpdir(), `chrome-p2c-cost-${Date.now()}`);
  const chromeArgs = [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-sandbox',
    '--disable-extensions',
    `--user-data-dir=${userDataDir}`,
  ];

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
  await send('Emulation.setCPUThrottlingRate', { rate: 6 });

  await send('Page.navigate', { url: TARGET_URL });
  await new Promise((r) => setTimeout(r, 3000));

  const result = await send('Runtime.evaluate', {
    expression: `(async () => {
      const canvas = document.querySelector('canvas.living-wall-particles');
      if (!canvas) return { error: 'Canvas not found' };
      const ctx = canvas.getContext('2d');
      if (!ctx) return { error: 'Context not found' };

      const frameTimes = [];
      let currentFrameStart = 0;
      const origClearRect = ctx.clearRect.bind(ctx);

      let measuring = true;
      let count = 0;

      ctx.clearRect = function(x, y, w, h) {
        currentFrameStart = performance.now();
        const res = origClearRect(x, y, w, h);
        queueMicrotask(() => {
          if (!measuring) return;
          const duration = performance.now() - currentFrameStart;
          frameTimes.push(duration);
        });
        return res;
      };

      // Collect 300 frames
      while (frameTimes.length < 300 && count < 500) {
        await new Promise((r) => requestAnimationFrame(r));
        count++;
      }

      measuring = false;
      ctx.clearRect = origClearRect;

      const clean = frameTimes.slice(10); // drop first 10 warmup frames
      const sorted = [...clean].sort((a, b) => a - b);
      const total = clean.reduce((sum, v) => sum + v, 0);
      const avg = total / clean.length;
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const min = sorted[0];
      const max = sorted[sorted.length - 1];

      return {
        totalFrames: clean.length,
        avgMs: Math.round(avg * 1000) / 1000,
        p50Ms: Math.round(p50 * 1000) / 1000,
        p95Ms: Math.round(p95 * 1000) / 1000,
        minMs: Math.round(min * 1000) / 1000,
        maxMs: Math.round(max * 1000) / 1000,
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  ws.close();
  chromeProc.kill();
  try {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  } catch {}

  console.log('\n=== IN-PAGE SCRIPT TIME PER FRAME (PARTICLES ON, 6X CPU THROTTLE) ===');
  console.log(result.result?.value);
}

measureScriptCost6x().catch(console.error);

