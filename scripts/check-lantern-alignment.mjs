import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9235;
const TARGET_URL = 'http://localhost:3000/';
const OUTPUT_DIR = path.resolve('docs/proofs/screens');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function computeNCC(buf1, buf2) {
  if (buf1.length !== buf2.length) {
    throw new Error(`Buffer length mismatch: ${buf1.length} vs ${buf2.length}`);
  }

  const n = buf1.length;
  let sum1 = 0, sum2 = 0;
  for (let i = 0; i < n; i++) {
    sum1 += buf1[i];
    sum2 += buf2[i];
  }
  const mean1 = sum1 / n;
  const mean2 = sum2 / n;

  let num = 0, den1 = 0, den2 = 0;
  for (let i = 0; i < n; i++) {
    const d1 = buf1[i] - mean1;
    const d2 = buf2[i] - mean2;
    num += d1 * d2;
    den1 += d1 * d1;
    den2 += d2 * d2;
  }

  const denom = Math.sqrt(den1 * den2);
  return denom === 0 ? 0 : num / denom;
}

async function highPassFilter(imgBuffer) {
  // Convolve with 3x3 high-pass Laplacian kernel
  const kernel = {
    width: 3,
    height: 3,
    kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
  };

  const { data } = await sharp(imgBuffer)
    .grayscale()
    .convolve(kernel)
    .raw()
    .toBuffer({ resolveWithObject: true });

  return data;
}

async function runAlignmentCheck() {
  console.log('====================================================');
  console.log(' TASK 3 NUMERIC ALIGNMENT CHECK & SCREENSHOTS ');
  console.log(' 1440x900 Viewport, High-pass NCC at 0%, 50%, 100% scroll ');
  console.log('====================================================\n');

  const userDataDir = path.join(os.tmpdir(), `chrome-align-${Date.now()}`);
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
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log(`Navigating to ${TARGET_URL}...`);
    await send('Page.navigate', { url: TARGET_URL });
    await new Promise((r) => setTimeout(r, 3500));

    // Get total scrollable height
    const docHeight = await send('Runtime.evaluate', {
      expression: `Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight`,
      returnByValue: true,
    });
    const maxScroll = docHeight.result.value || 3000;
    console.log(`Total scroll range: 0 to ${maxScroll}px`);

    const cursorX = 720;
    const cursorY = 450;
    const cropSize = 240;
    const cropLeft = cursorX - cropSize / 2;
    const cropTop = cursorY - cropSize / 2;

    const scrollPercents = [0, 50, 100];
    const nccResults = [];

    for (const pct of scrollPercents) {
      const targetScroll = (maxScroll * pct) / 100;
      console.log(`\nEvaluating scroll at ${pct}% (${targetScroll}px)...`);

      // Scroll to target
      await send('Runtime.evaluate', {
        expression: `window.scrollTo({ top: ${targetScroll}, behavior: 'instant' });`,
      });
      await new Promise((r) => setTimeout(r, 600));

      // 1. Base-only screenshot (hide lantern by dispatching mouseleave)
      await send('Runtime.evaluate', {
        expression: `(() => {
          const l = document.querySelector('.living-wall-lantern');
          if (l) l.style.opacity = '0';
        })()`,
      });
      await new Promise((r) => setTimeout(r, 200));

      const baseScreen = await send('Page.captureScreenshot', { format: 'png' });
      const baseBuf = Buffer.from(baseScreen.data, 'base64');

      // 2. With-lantern screenshot at (cursorX, cursorY)
      await send('Runtime.evaluate', {
        expression: `(() => {
          const l = document.querySelector('.living-wall-lantern');
          if (l) l.style.opacity = '1';
          window.dispatchEvent(new PointerEvent('pointermove', {
            clientX: ${cursorX},
            clientY: ${cursorY},
            bubbles: true,
          }));
        })()`,
      });
      await new Promise((r) => setTimeout(r, 500));

      const lanternScreen = await send('Page.captureScreenshot', { format: 'png' });
      const lanternBuf = Buffer.from(lanternScreen.data, 'base64');

      // Crop both around lantern centre
      const baseCrop = await sharp(baseBuf)
        .extract({ left: cropLeft, top: cropTop, width: cropSize, height: cropSize })
        .png()
        .toBuffer();

      const lanternCrop = await sharp(lanternBuf)
        .extract({ left: cropLeft, top: cropTop, width: cropSize, height: cropSize })
        .png()
        .toBuffer();

      // High-pass filter
      const hpBase = await highPassFilter(baseCrop);
      const hpLantern = await highPassFilter(lanternCrop);

      const ncc = computeNCC(hpBase, hpLantern);
      const pass = ncc >= 0.9;
      console.log(`Scroll ${pct}% High-pass NCC: ${ncc.toFixed(4)} (${pass ? 'PASS >= 0.9' : 'FAIL < 0.9'})`);
      nccResults.push({ scrollPct: pct, ncc: Number(ncc.toFixed(4)), pass });
    }

    // Capture the two required proof screenshots at scroll 0
    console.log('\nCapturing 1440x900 proof screenshots at scroll 0...');
    await send('Runtime.evaluate', {
      expression: `window.scrollTo({ top: 0, behavior: 'instant' });`,
    });
    await new Promise((r) => setTimeout(r, 400));

    // A. Lantern at screen centre (720, 450)
    await send('Runtime.evaluate', {
      expression: `(() => {
        const l = document.querySelector('.living-wall-lantern');
        if (l) l.style.opacity = '1';
        window.dispatchEvent(new PointerEvent('pointermove', {
          clientX: 720,
          clientY: 450,
          bubbles: true,
        }));
      })()`,
    });
    await new Promise((r) => setTimeout(r, 500));
    const screenCenter = await send('Page.captureScreenshot', { format: 'png' });
    const screenCenterPath = path.join(OUTPUT_DIR, 'desktop-lantern-center-1440x900.png');
    fs.writeFileSync(screenCenterPath, Buffer.from(screenCenter.data, 'base64'));
    console.log(`Saved screenshot: ${screenCenterPath}`);

    // B. Lantern near top-right light (1250, 150)
    await send('Runtime.evaluate', {
      expression: `(() => {
        const l = document.querySelector('.living-wall-lantern');
        if (l) l.style.opacity = '1';
        window.dispatchEvent(new PointerEvent('pointermove', {
          clientX: 1250,
          clientY: 150,
          bubbles: true,
        }));
      })()`,
    });
    await new Promise((r) => setTimeout(r, 500));
    const screenTopRight = await send('Page.captureScreenshot', { format: 'png' });
    const screenTopRightPath = path.join(OUTPUT_DIR, 'desktop-lantern-topright-1440x900.png');
    fs.writeFileSync(screenTopRightPath, Buffer.from(screenTopRight.data, 'base64'));
    console.log(`Saved screenshot: ${screenTopRightPath}`);

    ws.close();
    chromeProc.kill();

    console.log('\n=== NCC ALIGNMENT SUMMARY ===');
    console.table(nccResults);

    const allPassed = nccResults.every((r) => r.pass);
    if (!allPassed) {
      console.error('ERROR: One or more NCC values fell below 0.9 threshold!');
      process.exit(1);
    } else {
      console.log('SUCCESS: All scroll positions demonstrated pixel-aligned NCC >= 0.9.');
    }
  } catch (err) {
    chromeProc.kill();
    console.error('Alignment check failed:', err);
    process.exit(1);
  } finally {
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

runAlignmentCheck();

