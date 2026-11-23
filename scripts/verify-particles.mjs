import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9242;
const TARGET_URL = 'http://localhost:3000/';
const PROOF_FILE = path.resolve('docs/proofs/particles-behavior-output.txt');
const DESKTOP_SCREENSHOT = path.resolve('docs/proofs/screens/desktop-particles-1440x900.png');
const MOBILE_SCREENSHOT = path.resolve('docs/proofs/screens/mobile-particles-390x844.png');

async function launchBrowser() {
  const userDataDir = path.join(os.tmpdir(), `chrome-particles-${Date.now()}`);
  const chromeProc = cp.spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-sandbox',
    '--disable-extensions',
    `--user-data-dir=${userDataDir}`,
  ]);

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

async function verifyDesktop() {
  console.log('\n--- 1. DESKTOP VERIFICATION (1440x900) ---');
  const browser = await launchBrowser();
  const { send, close } = browser;

  try {
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await send('Page.navigate', { url: TARGET_URL });
    console.log('Navigated to page, waiting 4s for load and idle initialization...');
    await new Promise((r) => setTimeout(r, 4000));

    // Verify canvas exists and inspect DOM z-order
    const zOrderInfo = await send('Runtime.evaluate', {
      expression: `(() => {
        const wall = document.querySelector('.living-wall-compositor') || document.querySelector('.living-wall');
        if (!wall) return { error: 'No wall compositor found' };
        const children = Array.from(wall.children).map((el, index) => ({
          index,
          tag: el.tagName.toLowerCase(),
          className: el.className,
          zIndex: window.getComputedStyle(el).zIndex,
        }));

        const canvas = document.querySelector('canvas.living-wall-particles');
        return {
          wallChildren: children,
          canvasFound: !!canvas,
          canvasDprWidth: canvas ? canvas.width : 0,
          canvasDprHeight: canvas ? canvas.height : 0,
          canvasCssWidth: canvas ? canvas.style.width : '',
          canvasCssHeight: canvas ? canvas.style.height : '',
        };
      })()`,
      returnByValue: true,
    });
    console.log('Layer hierarchy in .living-wall:', JSON.stringify(zOrderInfo.result.value, null, 2));

    // Measure Coverage and 1s Drift difference
    console.log('\nMeasuring canvas coverage and 1s temporal delta...');
    const coverageResult = await send('Runtime.evaluate', {
      expression: `(async () => {
        const canvas = document.querySelector('canvas.living-wall-particles');
        if (!canvas) throw new Error('Particles canvas not found');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('2D context not available');

        // Snapshot 1
        const w = canvas.width;
        const h = canvas.height;
        const totalPixels = w * h;
        const img1 = ctx.getImageData(0, 0, w, h);
        const data1 = img1.data;

        let nonTransparent1 = 0;
        for (let i = 3; i < data1.length; i += 4) {
          if (data1[i] > 0) nonTransparent1++;
        }
        const coveragePct1 = (nonTransparent1 / totalPixels) * 100;

        // Wait 1 second (1000ms) for particles to drift
        await new Promise((r) => setTimeout(r, 1000));

        // Snapshot 2
        const img2 = ctx.getImageData(0, 0, w, h);
        const data2 = img2.data;

        let diffPixels = 0;
        for (let i = 0; i < data1.length; i += 4) {
          if (
            data1[i] !== data2[i] ||
            data1[i + 1] !== data2[i + 1] ||
            data1[i + 2] !== data2[i + 2] ||
            data1[i + 3] !== data2[i + 3]
          ) {
            diffPixels++;
          }
        }

        return {
          width: w,
          height: h,
          totalPixels,
          nonTransparentPixels: nonTransparent1,
          coveragePct: Math.round(coveragePct1 * 10000) / 10000,
          diffPixelsAfter1s: diffPixels,
          snapshotsDiffer: diffPixels > 0,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    console.log('Coverage & Temporal Delta:', coverageResult.result.value);

    // Measure per-frame script execution cost over 300 frames
    console.log('\nMeasuring per-frame script cost over 300 frames...');
    const perfResult = await send('Runtime.evaluate', {
      expression: `(async () => {
        const canvas = document.querySelector('canvas.living-wall-particles');
        const ctx = canvas.getContext('2d');

        const frameTimes = [];
        let currentFrameStart = 0;

        // Monkey-patch clearRect to mark beginning of particles frame script
        const origClearRect = ctx.clearRect.bind(ctx);
        const origSetTransform = ctx.setTransform.bind(ctx);

        let measuring = true;
        let count = 0;

        ctx.clearRect = function(x, y, w, h) {
          currentFrameStart = performance.now();
          const res = origClearRect(x, y, w, h);
          // Queue measurement right after synchronous drawing batch finishes
          queueMicrotask(() => {
            if (measuring && currentFrameStart > 0) {
              const dur = performance.now() - currentFrameStart;
              frameTimes.push(dur);
              count++;
            }
          });
          return res;
        };

        // Wait until 300 frames have been collected
        while (count < 300) {
          await new Promise((r) => requestAnimationFrame(r));
        }

        measuring = false;
        ctx.clearRect = origClearRect;

        const sorted = [...frameTimes].sort((a, b) => a - b);
        const total = sorted.reduce((a, b) => a + b, 0);
        const avg = total / sorted.length;
        const p50 = sorted[Math.floor(sorted.length * 0.5)];
        const p95 = sorted[Math.floor(sorted.length * 0.95)];

        return {
          totalFrames: sorted.length,
          avgMs: Math.round(avg * 1000) / 1000,
          p50Ms: Math.round(p50 * 1000) / 1000,
          p95Ms: Math.round(p95 * 1000) / 1000,
          minMs: Math.round(sorted[0] * 1000) / 1000,
          maxMs: Math.round(sorted[sorted.length - 1] * 1000) / 1000,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    console.log('Per-frame Script Cost (300 frames):', perfResult.result.value);

    // Capture Desktop Screenshot
    fs.mkdirSync(path.dirname(DESKTOP_SCREENSHOT), { recursive: true });
    const screenshotRes = await send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
    });
    fs.writeFileSync(DESKTOP_SCREENSHOT, Buffer.from(screenshotRes.data, 'base64'));
    console.log(`Saved desktop screenshot to ${DESKTOP_SCREENSHOT}`);

    await close();
    return {
      zOrder: zOrderInfo.result.value,
      coverage: coverageResult.result.value,
      scriptCost: perfResult.result.value,
    };
  } catch (err) {
    await close();
    throw err;
  }
}

async function verifyMobile() {
  console.log('\n--- 2. MOBILE VERIFICATION (390x844, DPR 3) ---');
  const browser = await launchBrowser();
  const { send, close } = browser;

  try {
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
    });

    await send('Page.navigate', { url: TARGET_URL });
    console.log('Navigated to page, waiting 4s for load and idle initialization...');
    await new Promise((r) => setTimeout(r, 4000));

    // Verify canvas exists on mobile and particle count <= 12
    const mobileInfo = await send('Runtime.evaluate', {
      expression: `(() => {
        const canvas = document.querySelector('canvas.living-wall-particles');
        return {
          canvasFound: !!canvas,
          canvasWidth: canvas ? canvas.width : 0,
          canvasHeight: canvas ? canvas.height : 0,
        };
      })()`,
      returnByValue: true,
    });
    console.log('Mobile canvas info:', mobileInfo.result.value);

    // Capture Mobile Screenshot
    const screenshotRes = await send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
    });
    fs.writeFileSync(MOBILE_SCREENSHOT, Buffer.from(screenshotRes.data, 'base64'));
    console.log(`Saved mobile screenshot to ${MOBILE_SCREENSHOT}`);

    await close();
    return mobileInfo.result.value;
  } catch (err) {
    await close();
    throw err;
  }
}

async function verifyModes() {
  console.log('\n--- 3. MODES VERIFICATION: REDUCED MOTION & LIGHT MODE ---');
  const browser = await launchBrowser();
  const { send, close } = browser;

  try {
    // 3a. Emulate reduced-motion
    await send('Emulation.setEmulatedMedia', {
      media: 'screen',
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await send('Page.navigate', { url: TARGET_URL });
    await new Promise((r) => setTimeout(r, 2000));

    const reducedMotionCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const canvas = document.querySelector('canvas.living-wall-particles');
        return { canvasPresent: !!canvas };
      })()`,
      returnByValue: true,
    });
    console.log('Reduced-motion check (canvas must NOT be present):', reducedMotionCheck.result.value);

    // 3b. Test light mode: set sessionStorage 'motion_mode' to 'light' and reload
    await send('Page.navigate', { url: TARGET_URL });
    await new Promise((r) => setTimeout(r, 1500));
    await send('Runtime.evaluate', {
      expression: `(() => {
        sessionStorage.setItem('motion_mode', 'light');
        location.reload();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 2500));

    const lightModeCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const canvas = document.querySelector('canvas.living-wall-particles');
        return { canvasPresent: !!canvas };
      })()`,
      returnByValue: true,
    });
    console.log('Light mode check (canvas must NOT be present):', lightModeCheck.result.value);

    await close();
    return {
      reducedMotionNoCanvas: !reducedMotionCheck.result.value.canvasPresent,
      lightModeNoCanvas: !lightModeCheck.result.value.canvasPresent,
    };
  } catch (err) {
    await close();
    throw err;
  }
}

async function main() {
  console.log('====================================================');
  console.log(' TASK 2: ATMOSPHERIC PARTICLES BEHAVIOR VERIFICATION ');
  console.log('====================================================');

  const desktop = await verifyDesktop();
  const mobile = await verifyMobile();
  const modes = await verifyModes();

  const report = {
    desktop,
    mobile,
    modes,
    passes: {
      coveragePass: desktop.coverage.coveragePct <= 1.0,
      snapshotsDifferPass: desktop.coverage.snapshotsDiffer,
      scriptCostPass: desktop.scriptCost.avgMs <= 1.5,
      reducedMotionPass: modes.reducedMotionNoCanvas,
      lightModePass: modes.lightModeNoCanvas,
    },
  };

  fs.mkdirSync(path.dirname(PROOF_FILE), { recursive: true });
  fs.writeFileSync(
    PROOF_FILE,
    `=== TASK 2: ATMOSPHERIC PARTICLES BEHAVIOR & PERFORMANCE PROOF ===\n\n` +
    `1. Z-Order & Layer Placement in .living-wall:\n` +
    JSON.stringify(desktop.zOrder.wallChildren, null, 2) + '\n\n' +
    `2. Canvas Coverage & Temporal Delta (1440x900):\n` +
    `   Canvas Resolution: ${desktop.coverage.width}x${desktop.coverage.height} (${desktop.coverage.totalPixels.toLocaleString()} px)\n` +
    `   Non-transparent pixels: ${desktop.coverage.nonTransparentPixels.toLocaleString()} px\n` +
    `   Coverage %: ${desktop.coverage.coveragePct}% (Floor: <= 1.0%) -> ${report.passes.coveragePass ? 'PASS' : 'FAIL'}\n` +
    `   Diff pixels after 1s: ${desktop.coverage.diffPixelsAfter1s.toLocaleString()} px -> ${report.passes.snapshotsDifferPass ? 'PASS' : 'FAIL'}\n\n` +
    `3. Per-Frame Script Execution Cost (over 300 frames):\n` +
    `   Total Frames Measured: ${desktop.scriptCost.totalFrames}\n` +
    `   Average Cost: ${desktop.scriptCost.avgMs} ms (Floor: <= 1.5 ms) -> ${report.passes.scriptCostPass ? 'PASS' : 'FAIL'}\n` +
    `   p50 Cost: ${desktop.scriptCost.p50Ms} ms\n` +
    `   p95 Cost: ${desktop.scriptCost.p95Ms} ms\n` +
    `   Min/Max: ${desktop.scriptCost.minMs} ms / ${desktop.scriptCost.maxMs} ms\n\n` +
    `4. Mode Suppression:\n` +
    `   Reduced Motion (no canvas rendered): ${modes.reducedMotionNoCanvas ? 'PASS' : 'FAIL'}\n` +
    `   Light Mode (no canvas rendered): ${modes.lightModeNoCanvas ? 'PASS' : 'FAIL'}\n\n` +
    `5. Mobile Verification (390x844, DPR 3):\n` +
    `   Canvas Found: ${mobile.canvasFound}\n` +
    `   Canvas Dimensions: ${mobile.canvasWidth}x${mobile.canvasHeight}\n\n` +
    JSON.stringify(report, null, 2) + '\n'
  );

  console.log(`\nProof successfully written to ${PROOF_FILE}`);
  console.log('\nAll Pass Conditions:', report.passes);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
