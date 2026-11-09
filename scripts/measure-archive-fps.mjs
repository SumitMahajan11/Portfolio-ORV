import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9238;
const TARGET_URL = 'http://localhost:3000/';
const PROOF_FILE = path.resolve('docs/proofs/fps-measure-output.txt');

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function measureSingleRun({ mode, width, height, throttleRate, pointerMoving, runIndex }) {
  console.log(`Starting Run ${runIndex}/3 [${mode}]: ${width}x${height}, throttle=${throttleRate}x, pointerMoving=${pointerMoving}...`);
  const userDataDir = path.join(os.tmpdir(), `chrome-fps-${Date.now()}-${mode}-${runIndex}`);
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
    await send('Emulation.setCPUThrottlingRate', { rate: throttleRate });
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: mode === 'mobile' ? 3 : 1,
      mobile: mode === 'mobile',
    });

    await send('Page.navigate', { url: TARGET_URL });
    await new Promise((r) => setTimeout(r, 3500));

    const result = await send('Runtime.evaluate', {
      expression: `(async () => {
        const frameDeltas = [];
        let lastTime = performance.now();
        let active = true;
        let frameCount = 0;

        const onFrame = (time) => {
          const delta = time - lastTime;
          lastTime = time;
          frameDeltas.push(delta);
          frameCount++;

          if (${pointerMoving}) {
            const px = ${width / 2} + Math.sin(frameCount * 0.08) * ${width * 0.3};
            const py = ${height / 2} + Math.cos(frameCount * 0.06) * ${height * 0.3};
            window.dispatchEvent(new PointerEvent('pointermove', {
              clientX: px,
              clientY: py,
              bubbles: true,
            }));
          }

          if (active) requestAnimationFrame(onFrame);
        };
        requestAnimationFrame(onFrame);

        const totalHeight = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        ) - window.innerHeight;

        // Scroll down smoothly
        const stepsDown = 90;
        for (let i = 0; i <= stepsDown; i++) {
          window.scrollTo(0, (totalHeight * i) / stepsDown);
          await new Promise((r) => setTimeout(r, 20));
        }

        await new Promise((r) => setTimeout(r, 150));

        // Scroll back up smoothly
        const stepsUp = 70;
        for (let i = stepsUp; i >= 0; i--) {
          window.scrollTo(0, (totalHeight * i) / stepsUp);
          await new Promise((r) => setTimeout(r, 20));
        }

        active = false;
        await new Promise((r) => setTimeout(r, 100));

        const deltas = frameDeltas.slice(5);
        const totalDuration = deltas.reduce((a, b) => a + b, 0);
        const avgDelta = totalDuration / (deltas.length || 1);
        const fps = 1000 / avgDelta;
        const slowOver18ms = deltas.filter((d) => d > 18).length;
        const slowOver33ms = deltas.filter((d) => d > 33.3).length;

        return {
          totalFrames: deltas.length,
          totalDurationMs: Math.round(totalDuration),
          effectiveFps: Math.round(fps * 10) / 10,
          avgFrameMs: Math.round(avgDelta * 100) / 100,
          slowOver18ms,
          slowOver33ms,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });

    ws.close();
    chromeProc.kill();
    return result.result.value;
  } catch (err) {
    chromeProc.kill();
    throw err;
  } finally {
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

async function run() {
  console.log('====================================================');
  console.log(' SCROLL FPS VERIFICATION: DESKTOP & MOBILE 4x ');
  console.log('====================================================\n');

  // 1. Desktop Runs (3 runs, unthrottled, pointer moving, 1440x900)
  console.log('--- 1. DESKTOP RUNS (1440x900, 1x CPU, Pointer Moving, Target: >= 58 fps) ---');
  const desktopRuns = [];
  for (let i = 1; i <= 3; i++) {
    const res = await measureSingleRun({
      mode: 'desktop',
      width: 1440,
      height: 900,
      throttleRate: 1,
      pointerMoving: true,
      runIndex: i,
    });
    desktopRuns.push(res);
    console.log(`Desktop Run ${i}: ${res.effectiveFps} fps (${res.avgFrameMs}ms avg)`);
  }
  const desktopFpsList = desktopRuns.map((r) => r.effectiveFps);
  const desktopMedian = median(desktopFpsList);
  console.log(`\nDesktop Median FPS: ${desktopMedian} fps (Target: >= 58 fps) -> ${desktopMedian >= 58 ? 'PASS' : 'FAIL'}`);

  // 2. Mobile Runs (3 runs, 4x CPU throttle, 390x844, Target: >= 50 fps)
  console.log('\n--- 2. MOBILE 4x RUNS (390x844, 4x CPU Throttle, Target: >= 50 fps) ---');
  const mobileRuns = [];
  for (let i = 1; i <= 3; i++) {
    const res = await measureSingleRun({
      mode: 'mobile',
      width: 390,
      height: 844,
      throttleRate: 4,
      pointerMoving: false,
      runIndex: i,
    });
    mobileRuns.push(res);
    console.log(`Mobile Run ${i}: ${res.effectiveFps} fps (${res.avgFrameMs}ms avg)`);
  }
  const mobileFpsList = mobileRuns.map((r) => r.effectiveFps);
  const mobileMedian = median(mobileFpsList);
  console.log(`\nMobile 4x Median FPS: ${mobileMedian} fps (Target: >= 50 fps) -> ${mobileMedian >= 50 ? 'PASS' : 'FAIL'}`);

  const summary = {
    desktop: {
      runs: desktopRuns,
      medianFps: desktopMedian,
      pass: desktopMedian >= 58,
    },
    mobile4x: {
      runs: mobileRuns,
      medianFps: mobileMedian,
      pass: mobileMedian >= 50,
    },
  };

  fs.mkdirSync(path.dirname(PROOF_FILE), { recursive: true });
  fs.writeFileSync(
    PROOF_FILE,
    `=== SCROLL FPS PERFORMANCE SUMMARY ===\n\n` +
    `Desktop 1440x900 (Unthrottled, Pointer Moving):\n` +
    `  Runs: ${desktopFpsList.join(', ')} fps\n` +
    `  Median: ${desktopMedian} fps (Floor: 58 fps) -> ${desktopMedian >= 58 ? 'PASS' : 'FAIL'}\n\n` +
    `Mobile 390x844 (4x CPU Throttled):\n` +
    `  Runs: ${mobileFpsList.join(', ')} fps\n` +
    `  Median: ${mobileMedian} fps (Floor: 50 fps) -> ${mobileMedian >= 50 ? 'PASS' : 'FAIL'}\n\n` +
    JSON.stringify(summary, null, 2) + '\n'
  );
  console.log(`\nSaved FPS proof to ${PROOF_FILE}`);

  if (desktopMedian < 58 || mobileMedian < 50) {
    console.error('ERROR: One or more FPS measurements fell below floor!');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

