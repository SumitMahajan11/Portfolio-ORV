import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9244;
const TARGET_URL = 'http://127.0.0.1:3001/';

const DESKTOP_ORIGINAL = path.resolve('docs/proofs/screens/desktop-particles-1440x900.png');
const MOBILE_ORIGINAL = path.resolve('docs/proofs/screens/mobile-particles-390x844.png');

const DESKTOP_DISABLED = path.resolve('docs/proofs/screens/p2b-desktop-particles-disabled-1440x900.png');
const MOBILE_DISABLED = path.resolve('docs/proofs/screens/p2b-mobile-particles-disabled-390x844.png');

const DESKTOP_DIFF_CROP_3X = path.resolve('docs/proofs/screens/p2b-desktop-diff-crop-400x300-3x.png');
const DESKTOP_DIFF_FULL = path.resolve('docs/proofs/screens/p2b-desktop-diff-full.png');

async function launchChrome() {
  const userDataDir = path.join(os.tmpdir(), `chrome-p2b-vis-${Date.now()}`);
  const chromeArgs = [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-sandbox',
    '--disable-extensions',
    `--user-data-dir=${userDataDir}`,
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

async function captureDisabledScreenshots() {
  console.log('\n--- 1. CAPTURING PARTICLES-DISABLED SCREENSHOTS VIA PROXY ---');
  await fetch('http://127.0.0.1:3001/__proxy_control?particles=0');

  // 1. Desktop
  {
    console.log('Capturing Desktop (1440x900, DPR 1)...');
    const { send, close } = await launchChrome();
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send('Page.navigate', { url: TARGET_URL });
    await new Promise((r) => setTimeout(r, 4000));

    // Confirm canvas is absent
    const state = await send('Runtime.evaluate', {
      expression: `(() => ({ canvasPresent: !!document.querySelector('canvas.living-wall-particles') }))()`,
      returnByValue: true,
    });
    console.log('Desktop particles-disabled check:', state.result.value);

    const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(DESKTOP_DISABLED, Buffer.from(shot.data, 'base64'));
    console.log(`Saved: ${DESKTOP_DISABLED}`);
    await close();
  }

  // 2. Mobile
  {
    console.log('Capturing Mobile (390x844, DPR 3)...');
    const { send, close } = await launchChrome();
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
    });
    await send('Page.navigate', { url: TARGET_URL });
    await new Promise((r) => setTimeout(r, 4000));

    // Confirm canvas is absent
    const state = await send('Runtime.evaluate', {
      expression: `(() => ({ canvasPresent: !!document.querySelector('canvas.living-wall-particles') }))()`,
      returnByValue: true,
    });
    console.log('Mobile particles-disabled check:', state.result.value);

    const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(MOBILE_DISABLED, Buffer.from(shot.data, 'base64'));
    console.log(`Saved: ${MOBILE_DISABLED}`);
    await close();
  }
}

async function computeDiff(imgPathWith, imgPathWithout, label) {
  console.log(`\n--- 2. COMPUTING PIXEL DIFF: ${label} ---`);
  const imgWith = sharp(imgPathWith);
  const imgWithout = sharp(imgPathWithout);

  const { data: bufWith, info: infoWith } = await imgWith.raw().toBuffer({ resolveWithObject: true });
  const { data: bufWithout, info: infoWithout } = await imgWithout.raw().toBuffer({ resolveWithObject: true });

  const width = infoWith.width;
  const height = infoWith.height;
  const channels = infoWith.channels;

  if (width !== infoWithout.width || height !== infoWithout.height) {
    throw new Error(`Dimension mismatch: ${width}x${height} vs ${infoWithout.width}x${infoWithout.height}`);
  }

  const THRESHOLD = 8;
  let changedPixels = 0;
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;

  // Create a diff buffer (RGBA)
  const diffBuf = Buffer.alloc(width * height * 4);

  const changedPixelCoords = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idxIn = (y * width + x) * channels;
      const idxOut = (y * width + x) * 4;

      const r1 = bufWith[idxIn];
      const g1 = bufWith[idxIn + 1];
      const b1 = bufWith[idxIn + 2];

      const r2 = bufWithout[idxIn];
      const g2 = bufWithout[idxIn + 1];
      const b2 = bufWithout[idxIn + 2];

      const dr = Math.abs(r1 - r2);
      const dg = Math.abs(g1 - g2);
      const db = Math.abs(b1 - b2);

      const isChanged = dr > THRESHOLD || dg > THRESHOLD || db > THRESHOLD;

      if (isChanged) {
        changedPixels++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        changedPixelCoords.push({ x, y, dr, dg, db, r1, g1, b1, r2, g2, b2 });

        // Highlight changed pixels in cyan/amplified on the diff buffer
        diffBuf[idxOut] = Math.min(255, dr * 8);
        diffBuf[idxOut + 1] = Math.min(255, dg * 8 + 120);
        diffBuf[idxOut + 2] = Math.min(255, db * 8 + 160);
        diffBuf[idxOut + 3] = 255;
      } else {
        // Darkened background for context
        diffBuf[idxOut] = Math.floor(r2 * 0.25);
        diffBuf[idxOut + 1] = Math.floor(g2 * 0.25);
        diffBuf[idxOut + 2] = Math.floor(b2 * 0.25);
        diffBuf[idxOut + 3] = 255;
      }
    }
  }

  const regionWidth = maxX >= minX ? maxX - minX + 1 : 0;
  const regionHeight = maxY >= minY ? maxY - minY + 1 : 0;

  console.log(`${label} Results:`);
  console.log(`  Total image pixels: ${width}x${height} = ${(width * height).toLocaleString()} px`);
  console.log(`  Pixels changed by > 8 levels: ${changedPixels.toLocaleString()} px (${((changedPixels / (width * height)) * 100).toFixed(4)}%)`);
  console.log(`  Largest changed region bounding box:`);
  console.log(`    minX: ${minX}, minY: ${minY}, maxX: ${maxX}, maxY: ${maxY}`);
  console.log(`    Region dimensions: ${regionWidth}x${regionHeight} px`);

  return {
    label,
    width,
    height,
    changedPixels,
    pct: (changedPixels / (width * height)) * 100,
    minX,
    minY,
    maxX,
    maxY,
    regionWidth,
    regionHeight,
    diffBuf,
    changedPixelCoords,
  };
}

async function processDesktopCrop(desktopDiff) {
  console.log('\n--- 3. CROPPING 400x300 AREA & UPSCALING 3X ---');
  const { width, height, diffBuf, changedPixelCoords } = desktopDiff;

  // Save full diff image
  await sharp(diffBuf, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(DESKTOP_DIFF_FULL);
  console.log(`Saved full desktop diff: ${DESKTOP_DIFF_FULL}`);

  // Find a 400x300 window containing a good density of changed pixels
  // Center near the median of changed pixels
  let cropX = 520;
  let cropY = 300;

  if (changedPixelCoords.length > 0) {
    const xs = changedPixelCoords.map((p) => p.x).sort((a, b) => a - b);
    const ys = changedPixelCoords.map((p) => p.y).sort((a, b) => a - b);
    const midX = xs[Math.floor(xs.length / 2)];
    const midY = ys[Math.floor(ys.length / 2)];
    cropX = Math.max(0, Math.min(width - 400, Math.round(midX - 200)));
    cropY = Math.max(0, Math.min(height - 300, Math.round(midY - 150)));
  }

  console.log(`Selected 400x300 crop window at (${cropX}, ${cropY}) to (${cropX + 400}, ${cropY + 300})`);

  // Count changed pixels inside crop window
  const inCrop = changedPixelCoords.filter(
    (p) => p.x >= cropX && p.x < cropX + 400 && p.y >= cropY && p.y < cropY + 300
  );
  console.log(`Changed pixels within crop window: ${inCrop.length}`);

  // Crop from diff buffer and upscale 3x to 1200x900
  await sharp(diffBuf, { raw: { width, height, channels: 4 } })
    .extract({ left: cropX, top: cropY, width: 400, height: 300 })
    .resize(1200, 900, { kernel: 'nearest' })
    .png()
    .toFile(DESKTOP_DIFF_CROP_3X);

  console.log(`Saved 3x upscaled 400x300 crop to: ${DESKTOP_DIFF_CROP_3X}`);

  return { cropX, cropY, inCropCount: inCrop.length };
}

async function main() {
  await captureDisabledScreenshots();

  const desktopDiff = await computeDiff(DESKTOP_ORIGINAL, DESKTOP_DISABLED, 'Desktop (1440x900)');
  const mobileDiff = await computeDiff(MOBILE_ORIGINAL, MOBILE_DISABLED, 'Mobile (390x844, DPR 3 [1170x2532])');

  const cropInfo = await processDesktopCrop(desktopDiff);

  console.log('\n================================================================');
  console.log(' VISIBILITY AUDIT SUMMARY:');
  console.log('================================================================');
  console.log(`Desktop Changed Pixels (>8 levels): ${desktopDiff.changedPixels.toLocaleString()} px`);
  console.log(`Desktop Largest Changed Region:     ${desktopDiff.regionWidth}x${desktopDiff.regionHeight} px (X: ${desktopDiff.minX}..${desktopDiff.maxX}, Y: ${desktopDiff.minY}..${desktopDiff.maxY})`);
  console.log(`Mobile Changed Pixels (>8 levels):  ${mobileDiff.changedPixels.toLocaleString()} px`);
  console.log(`Mobile Largest Changed Region:      ${mobileDiff.regionWidth}x${mobileDiff.regionHeight} px (X: ${mobileDiff.minX}..${mobileDiff.maxX}, Y: ${mobileDiff.minY}..${mobileDiff.maxY})`);
  console.log(`Crop window: (X: ${cropInfo.cropX}, Y: ${cropInfo.cropY}, 400x300), containing ${cropInfo.inCropCount} changed pixels; upscaled 3x saved to ${DESKTOP_DIFF_CROP_3X}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

