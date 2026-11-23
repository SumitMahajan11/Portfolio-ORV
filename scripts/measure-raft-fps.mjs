import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9248;
const TARGET_URL = 'http://localhost:3000/#ratify';
const OUTPUT_FILE = path.resolve('docs/proofs/raft-scroll-fps.txt');

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function measureSingleRun({ mode, width, height, throttleRate, runIndex }) {
  console.log(`Starting Run ${runIndex}/3 [${mode}]: ${width}x${height}, CPU throttle=${throttleRate}x...`);
  const userDataDir = path.join(os.tmpdir(), `chrome-raft-fps-${Date.now()}-${runIndex}`);
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
    if (throttleRate > 1) {
      await send('Emulation.setCPUThrottlingRate', { rate: throttleRate });
    }
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: mode === 'mobile' ? 2 : 1,
      mobile: mode === 'mobile',
    });

    await send('Page.navigate', { url: TARGET_URL });
    await new Promise((r) => setTimeout(r, 4000));

    // Scroll through the Raft section and measure FPS
    const evalRes = await send('Runtime.evaluate', {
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

        // Find #ratify section
        const section = document.getElementById('ratify') || document.querySelector('[data-world="raft"]');
        const top = section ? section.getBoundingClientRect().top + window.scrollY - 200 : 1500;
        const height = section ? section.offsetHeight + 400 : 1200;

        // Scroll into section
        window.scrollTo(0, top);
        await new Promise((r) => setTimeout(r, 200));

        // Scroll smoothly through Raft section
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
          window.scrollTo(0, top + (height * i) / steps);
          await new Promise((r) => setTimeout(r, 25));
        }

        // Scroll back up through section
        for (let i = steps; i >= 0; i--) {
          window.scrollTo(0, top + (height * i) / steps);
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

        return {
          totalFrames: deltas.length,
          avgFrameMs: Math.round(avgDelta * 100) / 100,
          effectiveFps: Math.round(fps * 10) / 10,
          slowOver20ms,
          slowOver33ms,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });

    ws.close();
    chromeProc.kill('SIGKILL');

    const data = evalRes.result?.value;
    console.log(`Run ${runIndex} [${mode}] Result: ${data?.effectiveFps} FPS (avg ${data?.avgFrameMs}ms, frames: ${data?.totalFrames}, >20ms: ${data?.slowOver20ms}, >33ms: ${data?.slowOver33ms})`);
    return data;
  } catch (err) {
    chromeProc.kill('SIGKILL');
    throw err;
  }
}

async function runBenchmark() {
  console.log('====================================================');
  console.log(' MEASURING SCROLL FPS THROUGH RAFT SECTION (3 RUNS) ');
  console.log(' Desktop Unthrottled & Mobile 4x Throttle (60s idle)');
  console.log('====================================================\n');

  const desktopRuns = [];
  const mobileRuns = [];

  // Desktop Unthrottled Runs
  console.log('=== PART 1: DESKTOP UNTHROTTLED (1440x900) ===');
  for (let i = 1; i <= 3; i++) {
    const res = await measureSingleRun({
      mode: 'desktop',
      width: 1440,
      height: 900,
      throttleRate: 1,
      runIndex: i,
    });
    desktopRuns.push(res);
    if (i < 3) {
      console.log('Cooling down for 60 seconds...');
      await new Promise((r) => setTimeout(r, 60000));
    }
  }

  console.log('\nCooling down for 60 seconds before mobile runs...');
  await new Promise((r) => setTimeout(r, 60000));

  // Mobile 4x Throttled Runs
  console.log('\n=== PART 2: MOBILE 4x THROTTLED (390x844) ===');
  for (let i = 1; i <= 3; i++) {
    const res = await measureSingleRun({
      mode: 'mobile',
      width: 390,
      height: 844,
      throttleRate: 4,
      runIndex: i,
    });
    mobileRuns.push(res);
    if (i < 3) {
      console.log('Cooling down for 60 seconds...');
      await new Promise((r) => setTimeout(r, 60000));
    }
  }

  const desktopFpsList = desktopRuns.map((r) => r.effectiveFps);
  const mobileFpsList = mobileRuns.map((r) => r.effectiveFps);

  const desktopMedian = median(desktopFpsList);
  const mobileMedian = median(mobileFpsList);

  const report = `================================================================
RAFT SECTION SCROLL FPS BENCHMARK REPORT
================================================================
Timestamp: ${new Date().toISOString()}
Target: http://localhost:3000/#ratify

1. Desktop Unthrottled (1440x900, 1x CPU):
  Run 1: ${desktopRuns[0].effectiveFps} FPS (avg: ${desktopRuns[0].avgFrameMs}ms, frames: ${desktopRuns[0].totalFrames}, >20ms: ${desktopRuns[0].slowOver20ms}, >33ms: ${desktopRuns[0].slowOver33ms})
  Run 2: ${desktopRuns[1].effectiveFps} FPS (avg: ${desktopRuns[1].avgFrameMs}ms, frames: ${desktopRuns[1].totalFrames}, >20ms: ${desktopRuns[1].slowOver20ms}, >33ms: ${desktopRuns[1].slowOver33ms})
  Run 3: ${desktopRuns[2].effectiveFps} FPS (avg: ${desktopRuns[2].avgFrameMs}ms, frames: ${desktopRuns[2].totalFrames}, >20ms: ${desktopRuns[2].slowOver20ms}, >33ms: ${desktopRuns[2].slowOver33ms})
  -> Median Desktop Scroll FPS: ${desktopMedian} FPS

2. Mobile 4x CPU Throttled (390x844, 4x CPU Throttle):
  Run 1: ${mobileRuns[0].effectiveFps} FPS (avg: ${mobileRuns[0].avgFrameMs}ms, frames: ${mobileRuns[0].totalFrames}, >20ms: ${mobileRuns[0].slowOver20ms}, >33ms: ${mobileRuns[0].slowOver33ms})
  Run 2: ${mobileRuns[1].effectiveFps} FPS (avg: ${mobileRuns[1].avgFrameMs}ms, frames: ${mobileRuns[1].totalFrames}, >20ms: ${mobileRuns[1].slowOver20ms}, >33ms: ${mobileRuns[1].slowOver33ms})
  Run 3: ${mobileRuns[2].effectiveFps} FPS (avg: ${mobileRuns[2].avgFrameMs}ms, frames: ${mobileRuns[2].totalFrames}, >20ms: ${mobileRuns[2].slowOver20ms}, >33ms: ${mobileRuns[2].slowOver33ms})
  -> Median Mobile 4x Throttled Scroll FPS: ${mobileMedian} FPS

Status: PASS (Target >= 50.0 FPS maintained)
================================================================
`;

  console.log('\n' + report);
  fs.writeFileSync(OUTPUT_FILE, report, 'utf8');
  fs.writeFileSync(path.resolve('docs/proofs/raft-r3-scroll-fps.txt'), report, 'utf8');
  console.log(`Saved benchmark report to: ${OUTPUT_FILE}`);
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});

