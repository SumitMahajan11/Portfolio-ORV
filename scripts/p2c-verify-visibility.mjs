import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9257;

const URL_A = 'http://127.0.0.1:3010/'; // Particles ON
const URL_B = 'http://127.0.0.1:3011/'; // Particles OFF

async function launchChrome() {
  const userDataDir = path.join(os.tmpdir(), `chrome-p2c-vis-${Date.now()}`);
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

// Dilation helper: expands true pixels by radius r
function dilateMask(mask, width, height, radius = 2) {
  const dilated = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x] === 1) {
        for (let dy = -radius; dy <= radius; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= width) continue;
            dilated[ny * width + nx] = 1;
          }
        }
      }
    }
  }
  return dilated;
}

async function main() {
  console.log('=== STEP 5: CLEAN VISIBILITY VERIFICATION ===');

  // 1. Capture OFF1 and OFF2 from App B
  console.log('\n--- 1. Capturing OFF1 and OFF2 from App B (particles disabled) ---');
  let off1Buf, off2Buf;
  {
    const { send, close } = await launchChrome();
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send('Page.navigate', { url: URL_B });
    await new Promise((r) => setTimeout(r, 3000));

    // Freeze animations & fix pointer
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 720, y: 450 });
    await send('Runtime.evaluate', {
      expression: `(() => {
        const style = document.createElement('style');
        style.textContent = '*, *::before, *::after { animation-play-state: paused !important; transition: none !important; }';
        document.head.appendChild(style);
        document.getAnimations().forEach(a => a.pause());
        if (window.gsap && window.gsap.globalTimeline) window.gsap.globalTimeline.pause();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 500));

    const shot1 = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    off1Buf = Buffer.from(shot1.data, 'base64');
    console.log('Captured OFF1 screenshot (1440x900).');

    // Wait 1000ms
    await new Promise((r) => setTimeout(r, 1000));

    const shot2 = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    off2Buf = Buffer.from(shot2.data, 'base64');
    console.log('Captured OFF2 screenshot (1440x900).');

    await close();
  }

  // 2. Capture ON and Canvas Snapshot from App A
  console.log('\n--- 2. Capturing ON and Canvas Snapshot from App A (particles enabled) ---');
  let onBuf, canvasBuf;
  {
    const { send, close } = await launchChrome();
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send('Page.navigate', { url: URL_A });
    await new Promise((r) => setTimeout(r, 3000));

    // Freeze pointer and animations
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 720, y: 450 });
    await send('Runtime.evaluate', {
      expression: `(() => {
        const style = document.createElement('style');
        style.textContent = '*, *::before, *::after { animation-play-state: paused !important; transition: none !important; }';
        document.head.appendChild(style);
        document.getAnimations().forEach(a => a.pause());
        if (window.gsap && window.gsap.globalTimeline) window.gsap.globalTimeline.pause();
      })()`,
    });

    // Wait for particles to warm up and paint
    await new Promise((r) => setTimeout(r, 1000));

    // Freeze particles on canvas right after next frame paint so it stays static
    const canvasRes = await send('Runtime.evaluate', {
      expression: `(async () => {
        const canvas = document.querySelector('canvas.living-wall-particles');
        if (!canvas) return { error: 'canvas not found' };
        
        // Wait 1 frame
        await new Promise(r => requestAnimationFrame(r));
        
        // Grab canvas data URL
        const dataUrl = canvas.toDataURL('image/png');
        
        // Freeze rAF on canvas so it does not update between toDataURL and Page.captureScreenshot
        const ctx = canvas.getContext('2d');
        const origClear = ctx.clearRect.bind(ctx);
        ctx.clearRect = function() {}; // Prevent clearing
        
        return { dataUrl, width: canvas.width, height: canvas.height };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });

    const shotOn = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    onBuf = Buffer.from(shotOn.data, 'base64');
    console.log('Captured ON screenshot (1440x900).');

    const base64Data = canvasRes.result.value.dataUrl.replace(/^data:image\/png;base64,/, '');
    canvasBuf = Buffer.from(base64Data, 'base64');
    console.log('Captured synchronized Canvas snapshot (1440x900).');

    await close();
  }

  // 3. Pixel Analysis
  console.log('\n--- 3. Pixel Analysis & Noise Floor ---');
  const imgOff1 = sharp(off1Buf);
  const imgOff2 = sharp(off2Buf);
  const imgOn = sharp(onBuf);
  const imgCanvas = sharp(canvasBuf);

  const rawOff1 = await imgOff1.raw().toBuffer();
  const rawOff2 = await imgOff2.raw().toBuffer();
  const rawOn = await imgOn.raw().toBuffer();
  const rawCanvas = await imgCanvas.raw().toBuffer({ resolveWithObject: true });

  const { width, height, channels: canvasChannels } = rawCanvas.info;
  console.log(`Dimensions: ${width}x${height}, canvas channels: ${canvasChannels}`);

  // Create canvas mask: any pixel where alpha > 0 (or RGB > 0)
  const canvasMask = new Uint8Array(width * height);
  let canvasParticlePixels = 0;
  for (let i = 0; i < width * height; i++) {
    const alpha = canvasChannels === 4 ? rawCanvas.data[i * 4 + 3] : 255;
    const r = rawCanvas.data[i * canvasChannels];
    const g = rawCanvas.data[i * canvasChannels + 1];
    const b = rawCanvas.data[i * canvasChannels + 2];
    if (alpha > 0 && (r > 0 || g > 0 || b > 0)) {
      canvasMask[i] = 1;
      canvasParticlePixels++;
    }
  }
  console.log(`Canvas particle pixels (alpha > 0): ${canvasParticlePixels}`);

  // Dilate mask by 2px
  const dilatedMask = dilateMask(canvasMask, width, height, 2);
  let dilatedCount = 0;
  for (let i = 0; i < width * height; i++) {
    if (dilatedMask[i] === 1) dilatedCount++;
  }
  console.log(`Dilated mask pixels (2px dilation): ${dilatedCount}`);

  // Noise floor: OFF1 vs OFF2 (pixels changed > 8 levels in R, G, or B)
  let noiseFloorCount = 0;
  for (let i = 0; i < width * height; i++) {
    const dr = Math.abs(rawOff1[i * 3] - rawOff2[i * 3]);
    const dg = Math.abs(rawOff1[i * 3 + 1] - rawOff2[i * 3 + 1]);
    const db = Math.abs(rawOff1[i * 3 + 2] - rawOff2[i * 3 + 2]);
    if (dr > 8 || dg > 8 || db > 8) {
      noiseFloorCount++;
    }
  }
  console.log(`Noise floor (OFF1 vs OFF2, delta > 8): ${noiseFloorCount} px`);

  // ON vs OFF1
  let insideMaskChanged = 0;
  let outsideMaskChanged = 0;

  // Track changed pixels with coordinates and brightness for finding the 5 brightest particles
  const particleCandidates = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const dr = Math.abs(rawOn[idx * 3] - rawOff1[idx * 3]);
      const dg = Math.abs(rawOn[idx * 3 + 1] - rawOff1[idx * 3 + 1]);
      const db = Math.abs(rawOn[idx * 3 + 2] - rawOff1[idx * 3 + 2]);
      const maxDelta = Math.max(dr, dg, db);

      if (maxDelta > 8) {
        if (dilatedMask[idx] === 1) {
          insideMaskChanged++;
          particleCandidates.push({ x, y, delta: maxDelta, r: rawOn[idx * 3], g: rawOn[idx * 3 + 1], b: rawOn[idx * 3 + 2] });
        } else {
          outsideMaskChanged++;
        }
      }
    }
  }

  console.log(`ON vs OFF1 changed pixels INSIDE dilated mask: ${insideMaskChanged} px`);
  console.log(`ON vs OFF1 changed pixels OUTSIDE dilated mask: ${outsideMaskChanged} px`);
  console.log(`Outside count equals noise floor? ${outsideMaskChanged === noiseFloorCount} (Outside: ${outsideMaskChanged}, Noise: ${noiseFloorCount})`);

  if (outsideMaskChanged === noiseFloorCount) {
    console.log('[VERDICT] Contamination clean! Outside equals noise floor.');
  } else {
    console.log(`[VERDICT] Diff contamination detected: outside (${outsideMaskChanged}) != noise floor (${noiseFloorCount}).`);
  }

  // 4. Find the 5 brightest particles and crop around them at 6x nearest-neighbour
  console.log('\n--- 4. Cropping 5 Brightest Particles at 6x Nearest-Neighbour ---');
  // Sort candidates by delta / brightness descending
  particleCandidates.sort((a, b) => b.delta - a.delta);

  // Group candidate pixels into distinct particle clusters (distance > 30px)
  const particles = [];
  for (const c of particleCandidates) {
    const isDistinct = particles.every((p) => Math.hypot(p.x - c.x, p.y - c.y) > 30);
    if (isDistinct) {
      particles.push(c);
      if (particles.length >= 5) break;
    }
  }

  console.log(`Identified ${particles.length} distinct brightest particles:`);
  particles.forEach((p, i) => console.log(`  Particle #${i + 1}: x=${p.x}, y=${p.y}, delta=${p.delta}, rgb=(${p.r},${p.g},${p.b})`));

  // Determine bounding box surrounding the 5 particles, or create a composite crop of 5 patches
  // Let's create a 120x120 patch centered around the centroid or composite 5 40x40 patches
  // If particles are dispersed across the 1440x900 viewport, let's crop a 40x40 patch around each of the 5 particles,
  // arrange them horizontally into a 200x40 strip, and upscale 6x to 1200x240!
  // Or find the bounding box of the closest cluster of particles.
  const patchSize = 50;
  const patches = [];

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const left = Math.max(0, Math.min(width - patchSize, p.x - Math.floor(patchSize / 2)));
    const top = Math.max(0, Math.min(height - patchSize, p.y - Math.floor(patchSize / 2)));

    const patchBuf = await sharp(onBuf)
      .extract({ left, top, width: patchSize, height: patchSize })
      .toBuffer();
    patches.push({ buffer: patchBuf, left: i * patchSize, top: 0 });
  }

  // Composite 5 patches side-by-side into 250x50 image, then upscale 6x nearest-neighbour to 1500x300
  const compositeBase = await sharp({
    create: {
      width: patchSize * particles.length,
      height: patchSize,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite(patches.map((p) => ({ input: p.buffer, left: p.left, top: p.top })))
    .png()
    .toBuffer();

  const out6x = await sharp(compositeBase)
    .resize({
      width: patchSize * particles.length * 6,
      height: patchSize * 6,
      kernel: sharp.kernel.nearest,
    })
    .toBuffer();

  const outPath = path.resolve('docs/proofs/screens/p2c-particles-brightest-5-6x.png');
  fs.writeFileSync(outPath, out6x);
  console.log(`Saved 6x nearest-neighbour crop to: ${outPath} (${patchSize * particles.length * 6}x${patchSize * 6} px)`);
}

main().catch(console.error);
