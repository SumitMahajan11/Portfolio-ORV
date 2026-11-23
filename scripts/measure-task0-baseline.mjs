import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9240;
const TARGET_URL = 'http://localhost:3000/';
const PROOF_FILE = path.resolve('docs/proofs/task0-baseline-output.txt');

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

async function runSession({ disableLantern = false, runIndex = 1 }) {
  const userDataDir = path.join(os.tmpdir(), `chrome-task0-${Date.now()}-${runIndex}`);
  const chromeArgs = [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-sandbox',
    '--disable-extensions',
    `--user-data-dir=${userDataDir}`,
  ];

  const chromeProc = cp.spawn(CHROME_PATH, chromeArgs);
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
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await send('Page.navigate', { url: TARGET_URL });
    await new Promise((r) => setTimeout(r, 3500));

    // Get WebGL renderer info and browser details
    const webglInfo = await send('Runtime.evaluate', {
      expression: `(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return { error: 'No WebGL context' };
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        return {
          vendor: gl.getParameter(gl.VENDOR),
          renderer: gl.getParameter(gl.RENDERER),
          unmaskedVendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : 'N/A',
          unmaskedRenderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'N/A',
        };
      })()`,
      returnByValue: true,
    });

    if (disableLantern) {
      await send('Runtime.evaluate', {
        expression: `(() => {
          const lantern = document.querySelector('.living-wall-lantern');
          if (lantern) {
            lantern.style.display = 'none';
          }
        })()`,
      });
    }

    // Scroll measurement loop
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

    ws.close();
    chromeProc.kill();

    const data = result.result.value;
    const p50 = percentile(data.deltas, 0.50);
    const p95 = percentile(data.deltas, 0.95);

    return {
      chromeArgs,
      webgl: webglInfo.result.value,
      effectiveFps: data.effectiveFps,
      avgFrameMs: data.avgFrameMs,
      p50Ms: Math.round(p50 * 100) / 100,
      p95Ms: Math.round(p95 * 100) / 100,
      totalFrames: data.totalFrames,
    };
  } catch (err) {
    chromeProc.kill();
    throw err;
  } finally {
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

async function main() {
  console.log('--- TASK 0: BASELINE DESKTOP FPS WITHOUT --disable-gpu ---');

  // Baseline runs (lantern enabled)
  console.log('\nMeasuring 3 runs WITH dual-exposure lantern...');
  const baselineRuns = [];
  for (let i = 1; i <= 3; i++) {
    const res = await runSession({ disableLantern: false, runIndex: i });
    baselineRuns.push(res);
    console.log(`Run ${i}: ${res.effectiveFps} FPS | avg: ${res.avgFrameMs}ms | p50: ${res.p50Ms}ms | p95: ${res.p95Ms}ms`);
  }

  // Isolated cost runs (lantern disabled)
  console.log('\nMeasuring 3 runs WITHOUT lantern (isolated cost)...');
  const disabledRuns = [];
  for (let i = 1; i <= 3; i++) {
    const res = await runSession({ disableLantern: true, runIndex: i });
    disabledRuns.push(res);
    console.log(`Run (no lantern) ${i}: ${res.effectiveFps} FPS | avg: ${res.avgFrameMs}ms | p50: ${res.p50Ms}ms | p95: ${res.p95Ms}ms`);
  }

  const baseFpsList = baselineRuns.map((r) => r.effectiveFps);
  const baseMedianFps = median(baseFpsList);
  const baseAvgP50 = Math.round(median(baselineRuns.map((r) => r.p50Ms)) * 100) / 100;
  const baseAvgP95 = Math.round(median(baselineRuns.map((r) => r.p95Ms)) * 100) / 100;

  const disFpsList = disabledRuns.map((r) => r.effectiveFps);
  const disMedianFps = median(disFpsList);
  const disAvgP50 = Math.round(median(disabledRuns.map((r) => r.p50Ms)) * 100) / 100;
  const disAvgP95 = Math.round(median(disabledRuns.map((r) => r.p95Ms)) * 100) / 100;

  const unmaskedRenderer = baselineRuns[0].webgl.unmaskedRenderer;
  const unmaskedVendor = baselineRuns[0].webgl.unmaskedVendor;
  const chromeFlags = baselineRuns[0].chromeArgs.join(' ');

  const isSoftwareRenderer =
    unmaskedRenderer.toLowerCase().includes('swiftshader') ||
    unmaskedRenderer.toLowerCase().includes('software') ||
    unmaskedRenderer.toLowerCase().includes('llvmpipe') ||
    unmaskedRenderer.toLowerCase().includes('basic render');

  const isolatedCostFps = Math.round((disMedianFps - baseMedianFps) * 10) / 10;
  const isolatedCostMs = Math.round((baseAvgP50 - disAvgP50) * 100) / 100;

  console.log('\n=== TASK 0 BASELINE RESULTS ===');
  console.log(`Chrome Flags: ${chromeFlags}`);
  console.log(`WebGL UNMASKED_RENDERER: ${unmaskedRenderer}`);
  console.log(`WebGL UNMASKED_VENDOR: ${unmaskedVendor}`);
  console.log(`Renderer Category: ${isSoftwareRenderer ? 'SOFTWARE (CPU-emulated)' : 'HARDWARE (Real GPU)'}`);
  console.log(`With Lantern: Median FPS = ${baseMedianFps}, p50 = ${baseAvgP50}ms, p95 = ${baseAvgP95}ms`);
  console.log(`Without Lantern: Median FPS = ${disMedianFps}, p50 = ${disAvgP50}ms, p95 = ${disAvgP95}ms`);
  console.log(`Isolated Lantern Cost: ${isolatedCostFps} FPS delta (p50 delta: ${isolatedCostMs}ms)`);

  const output = {
    chromeFlags,
    unmaskedRenderer,
    unmaskedVendor,
    isSoftwareRenderer,
    baseline: {
      runs: baseFpsList,
      medianFps: baseMedianFps,
      p50Ms: baseAvgP50,
      p95Ms: baseAvgP95,
    },
    disabledLantern: {
      runs: disFpsList,
      medianFps: disMedianFps,
      p50Ms: disAvgP50,
      p95Ms: disAvgP95,
    },
    isolatedCost: {
      fpsDelta: isolatedCostFps,
      p50DeltaMs: isolatedCostMs,
    },
  };

  fs.mkdirSync(path.dirname(PROOF_FILE), { recursive: true });
  fs.writeFileSync(
    PROOF_FILE,
    `=== TASK 0: BASELINE DESKTOP FPS WITHOUT --disable-gpu ===\n\n` +
    `Chrome Flags:\n  ${chromeFlags}\n\n` +
    `WebGL Renderer:\n  UNMASKED_RENDERER: ${unmaskedRenderer}\n  UNMASKED_VENDOR: ${unmaskedVendor}\n  Classification: ${isSoftwareRenderer ? 'SOFTWARE (CPU emulation)' : 'HARDWARE GPU'}\n\n` +
    `Performance With Dual-Exposure Lantern (3 runs):\n  Runs: ${baseFpsList.join(', ')} FPS\n  Median: ${baseMedianFps} FPS\n  p50 frame time: ${baseAvgP50} ms\n  p95 frame time: ${baseAvgP95} ms\n\n` +
    `Performance Without Lantern (Isolated cost, 3 runs):\n  Runs: ${disFpsList.join(', ')} FPS\n  Median: ${disMedianFps} FPS\n  p50 frame time: ${disAvgP50} ms\n  p95 frame time: ${disAvgP95} ms\n\n` +
    `Isolated Lantern Cost:\n  FPS impact: ${isolatedCostFps} FPS\n  p50 frame time impact: ${isolatedCostMs} ms\n\n` +
    `Decision Rule Evaluation:\n` +
    `  Renderer is hardware GPU: ${!isSoftwareRenderer}\n` +
    `  Base Median FPS >= 58: ${baseMedianFps >= 58}\n` +
    `  Conclusion: ${
      isSoftwareRenderer
        ? 'Renderer is software/SwiftShader; measurements are not representative of client GPU hardware. Keep dual-exposure lantern.'
        : baseMedianFps >= 58
        ? 'Renderer is real GPU and median >= 58 FPS. Dual-exposure lantern passes performance requirement.'
        : 'Renderer is real GPU and median < 58 FPS. Dual-exposure lantern must fall back to gradient lantern.'
    }\n\n` +
    JSON.stringify(output, null, 2) + '\n'
  );

  console.log(`\nProof saved to ${PROOF_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
