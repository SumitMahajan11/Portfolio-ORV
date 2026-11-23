import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9243;
const TARGET_URL = 'http://127.0.0.1:3001/';

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

async function launchChrome(extraFlags = []) {
  const userDataDir = path.join(os.tmpdir(), `chrome-p2b-fps-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const chromeArgs = [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-sandbox',
    '--disable-extensions',
    `--user-data-dir=${userDataDir}`,
    ...extraFlags,
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

  return {
    send,
    close: async () => {
      ws.close();
      chromeProc.kill();
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      } catch {}
    },
  };
}

async function measureBlankPage() {
  console.log('\n======================================================');
  console.log('PART A: BLANK PAGE (about:blank + empty rAF loop)');
  console.log('======================================================');

  const { send, close } = await launchChrome();

  try {
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
            if (count < 300) {
              requestAnimationFrame(onFrame);
            } else {
              resolve();
            }
          }
          requestAnimationFrame(onFrame);
        });

        const deltas = frameDeltas.slice(5); // drop warm-up
        return deltas;
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });

    await close();

    const deltas = result.result.value;
    const p50 = Math.round(percentile(deltas, 0.50) * 100) / 100;
    const p95 = Math.round(percentile(deltas, 0.95) * 100) / 100;
    const totalDuration = deltas.reduce((a, b) => a + b, 0);
    const avgDelta = totalDuration / (deltas.length || 1);
    const fps = Math.round((1000 / avgDelta) * 10) / 10;

    console.log(`Blank page (300 frames): Effective FPS = ${fps}, p50 = ${p50} ms, p95 = ${p95} ms`);

    const isCapped = Math.abs(p50 - 6.9) <= 0.4;
    if (isCapped) {
      console.log(`[VERDICT] Blank page p50 frame time (${p50} ms) matches the site's 6.9 ms baseline.`);
      console.log(`Plain statement: The measurement is capped at the display/timer refresh interval (~144 Hz / 6.94 ms) and cannot show sub-frame GPU cost.`);
    }

    return { fps, p50, p95, isCapped };
  } catch (err) {
    await close();
    throw err;
  }
}

async function measureSiteThrottled({ lantern, particles, runIndex }) {
  // Set proxy particles state
  await fetch(`http://127.0.0.1:3001/__proxy_control?particles=${particles ? 1 : 0}`);

  const { send, close } = await launchChrome();

  try {
    // Set 6x CPU throttle
    await send('Emulation.setCPUThrottlingRate', { rate: 6 });

    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await send('Page.navigate', { url: TARGET_URL });
    await new Promise((r) => setTimeout(r, 4000)); // wait for load and idle init

    // Verify particles presence aligns with setting
    await send('Runtime.evaluate', {
      expression: `(() => ({
        canvasFound: !!document.querySelector('canvas.living-wall-particles'),
        lanternFound: !!document.querySelector('.living-wall-lantern')
      }))()`,
      returnByValue: true,
    });

    if (!lantern) {
      await send('Runtime.evaluate', {
        expression: `(() => {
          const l = document.querySelector('.living-wall-lantern');
          if (l) l.style.display = 'none';
        })()`,
      });
    }

    // Run standard scroll loop over total page height
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

          // Pointer moving across screen
          const px = 720 + Math.sin(frameCount * 0.08) * 432;
          const py = 450 + Math.cos(frameCount * 0.06) * 270;
          window.dispatchEvent(new PointerEvent('pointermove', {
            clientX: px,
            clientY: py,
            bubbles: true,
          }));

          if (active) requestAnimationFrame(onFrame);
        };
        requestAnimationFrame(onFrame);

        const totalHeight = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        ) - window.innerHeight;

        const stepsDown = 90;
        for (let i = 0; i <= stepsDown; i++) {
          window.scrollTo(0, (totalHeight * i) / stepsDown);
          await new Promise((r) => setTimeout(r, 20));
        }

        await new Promise((r) => setTimeout(r, 150));

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

        return {
          deltas,
          totalFrames: deltas.length,
          totalDurationMs: Math.round(totalDuration),
          effectiveFps: Math.round(fps * 10) / 10,
          avgFrameMs: Math.round(avgDelta * 100) / 100,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });

    await close();

    const data = result.result.value;
    const p50 = Math.round(percentile(data.deltas, 0.50) * 100) / 100;
    const p95 = Math.round(percentile(data.deltas, 0.95) * 100) / 100;

    return {
      runIndex,
      effectiveFps: data.effectiveFps,
      avgFrameMs: data.avgFrameMs,
      p50Ms: p50,
      p95Ms: p95,
      totalFrames: data.totalFrames,
    };
  } catch (err) {
    await close();
    throw err;
  }
}

async function measureMode(modeName, { lantern, particles }) {
  console.log(`\nMeasuring Mode: ${modeName} (lantern=${lantern}, particles=${particles}) - 3 runs at 6x CPU throttle...`);
  const runs = [];
  for (let i = 1; i <= 3; i++) {
    const res = await measureSiteThrottled({ lantern, particles, runIndex: i });
    runs.push(res);
    console.log(`  Run ${i}: ${res.effectiveFps} FPS | p50: ${res.p50Ms} ms | p95: ${res.p95Ms} ms`);
  }

  const fpsList = runs.map((r) => r.effectiveFps);
  const p50List = runs.map((r) => r.p50Ms);
  const p95List = runs.map((r) => r.p95Ms);

  const medFps = median(fpsList);
  const medP50 = Math.round(median(p50List) * 100) / 100;
  const medP95 = Math.round(median(p95List) * 100) / 100;

  console.log(`-> ${modeName} Medians: Median FPS = ${medFps}, p50 = ${medP50} ms, p95 = ${medP95} ms`);

  return {
    modeName,
    lantern,
    particles,
    runs,
    medianFps: medFps,
    p50Ms: medP50,
    p95Ms: medP95,
  };
}

async function main() {
  console.log('================================================================');
  console.log(' TASK 2: FPS CAP CHECK & 6x CPU THROTTLE (4 MODES)');
  console.log('================================================================');

  await measureBlankPage();

  console.log('\n======================================================');
  console.log('PART B: 6x CPU THROTTLE MEASUREMENT ACROSS 4 MODES');
  console.log('======================================================');

  // Mode 1: lantern ON, particles ON
  const mode1 = await measureMode('Mode 1: Lantern ON / Particles ON', { lantern: true, particles: true });

  // Mode 2: lantern ON, particles OFF
  const mode2 = await measureMode('Mode 2: Lantern ON / Particles OFF', { lantern: true, particles: false });

  // Mode 3: lantern OFF, particles ON
  const mode3 = await measureMode('Mode 3: Lantern OFF / Particles ON', { lantern: false, particles: true });

  // Mode 4: lantern OFF, particles OFF
  const mode4 = await measureMode('Mode 4: Lantern OFF / Particles OFF', { lantern: false, particles: false });

  console.log('\n================================================================');
  console.log(' SUMMARY TABLE: 6x CPU THROTTLE ACROSS FOUR MODES');
  console.log('================================================================');
  console.table([
    {
      Mode: mode1.modeName,
      'Median FPS': mode1.medianFps,
      'p50 Frame (ms)': mode1.p50Ms,
      'p95 Frame (ms)': mode1.p95Ms,
    },
    {
      Mode: mode2.modeName,
      'Median FPS': mode2.medianFps,
      'p50 Frame (ms)': mode2.p50Ms,
      'p95 Frame (ms)': mode2.p95Ms,
    },
    {
      Mode: mode3.modeName,
      'Median FPS': mode3.medianFps,
      'p50 Frame (ms)': mode3.p50Ms,
      'p95 Frame (ms)': mode3.p95Ms,
    },
    {
      Mode: mode4.modeName,
      'Median FPS': mode4.medianFps,
      'p50 Frame (ms)': mode4.p50Ms,
      'p95 Frame (ms)': mode4.p95Ms,
    },
  ]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

