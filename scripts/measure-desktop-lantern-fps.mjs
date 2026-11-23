import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9231;
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000/';

async function measureDesktopFps() {
  console.log('====================================================');
  console.log(' MEASURING DESKTOP SCROLL FPS WITH POINTER MOVING ');
  console.log(' Target: 1440x900 Viewport, No Throttle, Lantern + Floating Papers Active');
  console.log('====================================================\n');

  const userDataDir = path.join(os.tmpdir(), `chrome-desktop-fps-${Date.now()}`);
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
    await send('Emulation.setCPUThrottlingRate', { rate: 1 }); // No throttle
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log(`Navigating to ${TARGET_URL}...`);
    await send('Page.navigate', { url: TARGET_URL });
    await new Promise((r) => setTimeout(r, 3500));

    console.log('Starting scroll FPS probe with continuous pointer motion...');
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

          // Move pointer smoothly across the 1440x900 viewport each frame
          const px = 720 + Math.sin(frameCount * 0.08) * 450;
          const py = 450 + Math.cos(frameCount * 0.06) * 300;
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

        // Scroll down smoothly through all sections
        const stepsDown = 90;
        for (let i = 0; i <= stepsDown; i++) {
          window.scrollTo(0, (totalHeight * i) / stepsDown);
          await new Promise((r) => setTimeout(r, 20));
        }

        // Brief pause at bottom
        await new Promise((r) => setTimeout(r, 150));

        // Scroll back up smoothly through all sections
        const stepsUp = 70;
        for (let i = stepsUp; i >= 0; i--) {
          window.scrollTo(0, (totalHeight * i) / stepsUp);
          await new Promise((r) => setTimeout(r, 20));
        }

        active = false;
        await new Promise((r) => setTimeout(r, 100));

        // Exclude the first few frames of initialization
        const deltas = frameDeltas.slice(5);
        const totalDuration = deltas.reduce((a, b) => a + b, 0);
        const avgDelta = totalDuration / (deltas.length || 1);
        const fps = 1000 / avgDelta;
        const slowOver18ms = deltas.filter((d) => d > 18).length;
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
          slowOver18ms,
          slowOver33ms,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });

    ws.close();
    chromeProc.kill();

    const data = result.result.value;
    const isPass = data.effectiveFps >= 58;

    const summary = {
      'Device Viewport': '1440x900 (Desktop Unthrottled)',
      'CPU Throttle Rate': '1x (None)',
      'Effective FPS': `${data.effectiveFps} fps`,
      'Avg Frame Time': `${data.avgFrameMs} ms`,
      'Min Frame Time': `${data.minFrameMs} ms`,
      'Max Frame Time': `${data.maxFrameMs} ms`,
      'Total Frames Recorded': data.totalFrames,
      'Frames > 18ms': data.slowOver18ms,
      'Frames > 33.3ms': data.slowOver33ms,
      'Lantern & Papers Active': 'YES',
      'Threshold': '>= 58 fps',
      'Status': isPass ? 'PASS' : 'FAIL',
    };

    console.log('Desktop FPS Measurement Summary:');
    console.table(summary);

    const proofDir = path.resolve('docs/proofs');
    fs.mkdirSync(proofDir, { recursive: true });
    fs.writeFileSync(
      path.join(proofDir, 'desktop-fps-measure-output.txt'),
      `=== DESKTOP 1440x900 SCROLL FPS WITH POINTER MOVING ===\n\n` +
      `Date: ${new Date().toISOString()}\n` +
      `Effective FPS: ${data.effectiveFps} fps\n` +
      `Avg Frame Time: ${data.avgFrameMs} ms\n` +
      `Min Frame Time: ${data.minFrameMs} ms\n` +
      `Max Frame Time: ${data.maxFrameMs} ms\n` +
      `Total Frames: ${data.totalFrames}\n` +
      `Frames > 18ms: ${data.slowOver18ms}\n` +
      `Frames > 33.3ms: ${data.slowOver33ms}\n` +
      `Threshold: >= 58 fps\n` +
      `Status: ${isPass ? 'PASS' : 'FAIL'}\n\n` +
      JSON.stringify(summary, null, 2) + '\n'
    );

    if (!isPass) {
      console.warn(`\nWARNING: Effective FPS (${data.effectiveFps}) is below 58 threshold.`);
    } else {
      console.log(`\nSUCCESS: Desktop effective FPS (${data.effectiveFps}) meets or exceeds 58 fps target.`);
    }

    return data;
  } catch (err) {
    chromeProc.kill();
    console.error('Desktop FPS Measurement failed:', err);
    process.exit(1);
  } finally {
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

measureDesktopFps();
