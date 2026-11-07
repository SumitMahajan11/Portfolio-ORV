import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9228;
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000/';

async function measureFps() {
  console.log('====================================================');
  console.log(' MEASURING SCROLL FPS ON THROTTLED MOBILE (4x CPU) ');
  console.log(' Target: 390x844 Viewport, 4x CPU Throttle, Plain Alpha Gradients');
  console.log('====================================================\n');

  const userDataDir = path.join(os.tmpdir(), `chrome-tint-fps-${Date.now()}`);
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
    // Allow 4x throttled CPU sufficient time to finish hydration & bundle evaluation
    await new Promise((r) => setTimeout(r, 5000));

    // Measure FPS during smooth document scroll traversing all section tints
    console.log('Starting scroll FPS probe through all section tints (down and up)...');
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

        // Exclude the first few frames of initialization
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
    console.log('FPS Measurement Summary:');
    console.table({
      'Device Viewport': '390x844 (Mobile)',
      'CPU Throttle Rate': '4x Slowdown',
      'Effective FPS': `${data.effectiveFps} fps`,
      'Avg Frame Time': `${data.avgFrameMs} ms`,
      'Min Frame Time': `${data.minFrameMs} ms`,
      'Max Frame Time': `${data.maxFrameMs} ms`,
      'Total Frames Recorded': data.totalFrames,
      'Frames > 20ms': data.slowOver20ms,
      'Frames > 33ms': data.slowOver33ms,
      'Blend Mode Tested': 'plain-alpha',
      'Threshold': '>= 55 fps',
      'Status': data.effectiveFps >= 55 ? 'PASS (plain-alpha approved)' : 'FAIL',
    });

    if (data.effectiveFps < 55) {
      console.warn(`\nWARNING: Effective FPS (${data.effectiveFps}) is below 55 threshold.`);
    } else {
      console.log(`\nSUCCESS: Effective FPS (${data.effectiveFps}) meets or exceeds 55 fps on 4x CPU throttled mobile.`);
    }

    return data;
  } catch (err) {
    chromeProc.kill();
    console.error('FPS Measurement failed:', err);
    process.exit(1);
  } finally {
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

measureFps();
