import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9245;
const TARGET_URL = 'http://localhost:3000/';
const PROOF_FILE = path.resolve('docs/proofs/s1-fps-report.txt');

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

async function measureSingleRun(runIndex) {
  console.log(`Starting Mobile 4x Scroll Run ${runIndex}/3...`);
  const userDataDir = path.join(os.tmpdir(), `chrome-fps-s1-${Date.now()}-${runIndex}`);
  const chromeProc = cp.spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-sandbox',
    '--disable-extensions',
    '--window-size=390,844',
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

    // Emulate mobile 390x844
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });

    // 4x CPU Throttling Rate
    await send('Emulation.setCPUThrottlingRate', { rate: 4 });

    await send('Page.navigate', { url: TARGET_URL });
    await new Promise((r) => setTimeout(r, 2500));

    // Scroll measurement script
    const result = await send('Runtime.evaluate', {
      expression: `
        new Promise((resolve) => {
          const frameDeltas = [];
          let lastTime = performance.now();
          let rafId = null;

          function onFrame(now) {
            const delta = now - lastTime;
            lastTime = now;
            if (delta > 0 && delta < 1000) {
              frameDeltas.push(delta);
            }
            rafId = requestAnimationFrame(onFrame);
          }

          rafId = requestAnimationFrame(onFrame);

          // Programmatic smooth scroll through the entire page
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          const duration = 3000;
          const startTime = performance.now();

          function step(time) {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease in out quadratic
            const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
            window.scrollTo(0, ease * maxScroll);

            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              setTimeout(() => {
                cancelAnimationFrame(rafId);
                const totalTime = frameDeltas.reduce((a, b) => a + b, 0);
                const avgFps = totalTime > 0 ? (frameDeltas.length / (totalTime / 1000)) : 0;
                resolve({
                  framesCount: frameDeltas.length,
                  deltas: frameDeltas,
                  avgFps,
                });
              }, 200);
            }
          }

          requestAnimationFrame(step);
        })
      `,
      awaitPromise: true,
      returnByValue: true,
    });

    ws.close();
    chromeProc.kill();

    const data = result.result?.value;
    if (!data || !data.deltas || data.deltas.length === 0) {
      throw new Error(`Run ${runIndex}: measurement failed`);
    }

    const deltas = data.deltas;
    const p50 = percentile(deltas, 50);
    const p95 = percentile(deltas, 95);
    const fps = data.avgFps;

    console.log(`Run ${runIndex} finished: FPS=${fps.toFixed(1)}, p50=${p50.toFixed(2)}ms, p95=${p95.toFixed(2)}ms, frames=${deltas.length}`);
    return { run: runIndex, fps, p50, p95, frames: deltas.length };
  } catch (err) {
    chromeProc.kill();
    throw err;
  }
}

async function main() {
  console.log('================================================================');
  console.log(' TASK structure-S1: SCROLL FPS AUDIT (MOBILE 390x844, 4X THROTTLE)');
  console.log(' Requirement: Floor FPS >= 50 (Median of 3 runs)');
  console.log('================================================================\n');

  const runs = [];
  for (let i = 1; i <= 3; i++) {
    const res = await measureSingleRun(i);
    runs.push(res);
    if (i < 3) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  const fpsList = runs.map((r) => r.fps);
  const p50List = runs.map((r) => r.p50);
  const p95List = runs.map((r) => r.p95);

  const medianFps = median(fpsList);
  const medianP50 = median(p50List);
  const medianP95 = median(p95List);

  console.log('\n================================================================');
  console.log(' SCROLL FPS SUMMARY:');
  console.log(` Median FPS: ${medianFps.toFixed(1)} (Floor requirement: >= 50)`);
  console.log(` Median p50: ${medianP50.toFixed(2)}ms`);
  console.log(` Median p95: ${medianP95.toFixed(2)}ms`);
  console.log(` Verdict:    ${medianFps >= 50 ? 'PASS (>= 50 FPS)' : 'FAIL (< 50 FPS)'}`);
  console.log('================================================================\n');

  const proofLines = [
    '================================================================',
    ' TASK structure-S1: SCROLL FPS AUDIT (MOBILE 390x844, 4X THROTTLE)',
    '================================================================',
    `Target URL: ${TARGET_URL}`,
    `Timestamp: ${new Date().toISOString()}`,
    `CPU Throttle: 4x | Viewport: 390x844 (Mobile)`,
    '',
    ...runs.map(
      (r) =>
        `Run ${r.run}: FPS = ${r.fps.toFixed(1)} | p50 = ${r.p50.toFixed(2)}ms | p95 = ${r.p95.toFixed(2)}ms | frames = ${r.frames}`
    ),
    '',
    `Median FPS: ${medianFps.toFixed(1)}`,
    `Median p50: ${medianP50.toFixed(2)}ms`,
    `Median p95: ${medianP95.toFixed(2)}ms`,
    `Floor Requirement: >= 50 FPS`,
    `Verdict: ${medianFps >= 50 ? 'PASS (>= 50 FPS)' : 'FAIL (< 50 FPS)'}`,
    '================================================================',
  ];

  fs.writeFileSync(PROOF_FILE, proofLines.join('\n'), 'utf8');
  console.log(`Proof saved to: ${PROOF_FILE}`);
}

main();

