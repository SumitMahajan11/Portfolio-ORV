import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9240;
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000/';
const OUTPUT_FILE = path.resolve('docs/proofs/biyoo-fps-measure-output.txt');

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function runSingleFpsRun(runIndex) {
  console.log(`\n--- Starting Run ${runIndex}/3 on Throttled Mobile (4x CPU) ---`);
  const userDataDir = path.join(os.tmpdir(), `chrome-biyoo-fps-${Date.now()}-${runIndex}`);
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
    await send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    console.log(`Navigating to ${TARGET_URL}...`);
    await send('Page.navigate', { url: TARGET_URL });
    await new Promise((r) => setTimeout(r, 5000));

    console.log('Running scroll FPS probe through all section tints (down and up)...');
    const result = await send('Runtime.evaluate', {
      expression: `(async () => {
        const frameDeltas = [];
        let lastTime = performance.now();
        let active = true;

        const onFrame = (time) => {
          const delta = time - lastTime;
          lastTime = time;
          frameDeltas.push(delta);
          if (active) requestAnimationFrame(onFrame);
        };
        requestAnimationFrame(onFrame);

        const totalHeight = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        ) - window.innerHeight;

        // Scroll down smoothly through all sections
        const stepsDown = 80;
        for (let i = 0; i <= stepsDown; i++) {
          window.scrollTo(0, (totalHeight * i) / stepsDown);
          await new Promise((r) => setTimeout(r, 25));
        }

        // Brief pause at bottom
        await new Promise((r) => setTimeout(r, 150));

        // Scroll back up smoothly through all sections
        const stepsUp = 60;
        for (let i = stepsUp; i >= 0; i--) {
          window.scrollTo(0, (totalHeight * i) / stepsUp);
          await new Promise((r) => setTimeout(r, 25));
        }

        active = false;
        await new Promise((r) => setTimeout(r, 100));

        const deltas = frameDeltas.slice(3);
        const totalDuration = deltas.reduce((a, b) => a + b, 0);
        const avgDelta = totalDuration / (deltas.length || 1);
        const fps = 1000 / avgDelta;
        const slowOver20ms = deltas.filter((d) => d > 20).length;
        const slowOver33ms = deltas.filter((d) => d > 33.3).length;
        const maxDelta = Math.max(...deltas);
        const minDelta = Math.min(...deltas);

        return {
          totalFrames: deltas.length,
          totalDurationMs: Math.round(totalDuration),
          effectiveFps: Math.round(fps * 10) / 10,
          avgFrameMs: Math.round(avgDelta * 100) / 100,
          minFrameMs: Math.round(minDelta * 10) / 10,
          maxFrameMs: Math.round(maxDelta * 10) / 10,
          slowOver20ms,
          slowOver33ms,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });

    ws.close();
    chromeProc.kill();

    const data = result.result.value;
    console.log(`Run ${runIndex} FPS: ${data.effectiveFps} (avg frame: ${data.avgFrameMs}ms, frames: ${data.totalFrames})`);
    return data;
  } catch (err) {
    chromeProc.kill();
    throw err;
  }
}

async function measureBiyooFps() {
  console.log('====================================================');
  console.log(' MEASURING SCROLL FPS ON THROTTLED MOBILE (3 RUNS)  ');
  console.log(' Target: 390x844 Viewport, 4x CPU Throttle, Floor 50');
  console.log('====================================================');

  const runs = [];
  for (let i = 1; i <= 3; i++) {
    const data = await runSingleFpsRun(i);
    runs.push(data);
    await new Promise((r) => setTimeout(r, 1500));
  }

  const fpsValues = runs.map((r) => r.effectiveFps);
  const medianFps = median(fpsValues);
  const pass = medianFps >= 50.0;

  const reportText = `====================================================
THROTTLED MOBILE SCROLL FPS REPORT (B-1 Real Art)
====================================================
Timestamp: ${new Date().toISOString()}
Target: 390x844 Viewport, 4x CPU Throttle
Floor Target: >= 50.0 FPS

RUN RESULTS:
Run 1: ${runs[0].effectiveFps} FPS (avg: ${runs[0].avgFrameMs}ms, frames: ${runs[0].totalFrames}, >20ms: ${runs[0].slowOver20ms}, >33ms: ${runs[0].slowOver33ms})
Run 2: ${runs[1].effectiveFps} FPS (avg: ${runs[1].avgFrameMs}ms, frames: ${runs[1].totalFrames}, >20ms: ${runs[1].slowOver20ms}, >33ms: ${runs[1].slowOver33ms})
Run 3: ${runs[2].effectiveFps} FPS (avg: ${runs[2].avgFrameMs}ms, frames: ${runs[2].totalFrames}, >20ms: ${runs[2].slowOver20ms}, >33ms: ${runs[2].slowOver33ms})

MEDIAN FPS: ${medianFps.toFixed(1)} FPS
VERDICT: ${pass ? 'PASS (>= 50.0 FPS)' : 'FAIL (< 50.0 FPS)'}
`;

  console.log('\n' + reportText);
  fs.writeFileSync(OUTPUT_FILE, reportText, 'utf8');
  console.log(`Report written directly to: ${OUTPUT_FILE}`);
}

measureBiyooFps().catch((err) => {
  console.error('FPS benchmark error:', err);
  process.exit(1);
});
