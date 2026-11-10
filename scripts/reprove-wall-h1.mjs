import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9265;
const TARGET_URL = 'http://localhost:3000/';
const SCREENS_DIR = path.resolve('docs/proofs/screens');
fs.mkdirSync(SCREENS_DIR, { recursive: true });

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

async function computeLuminanceRegions(imgBuf, cx, cy, discRadius, ringInnerRadius, ringOuterRadius) {
  const { data, info } = await sharp(imgBuf)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sumDisc = 0;
  let countDisc = 0;
  let sumRing = 0;
  let countRing = 0;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * info.channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= discRadius) {
        sumDisc += lum;
        countDisc++;
      } else if (dist > ringInnerRadius && dist <= ringOuterRadius) {
        sumRing += lum;
        countRing++;
      }
    }
  }

  return {
    discMean: countDisc > 0 ? sumDisc / countDisc : 0,
    discCount: countDisc,
    ringMean: countRing > 0 ? sumRing / countRing : 0,
    ringCount: countRing,
  };
}

async function main() {
  console.log('================================================================');
  console.log(' HERO-H1: REAL PAGE TASK 4 WALL & LANTERN VERIFICATION ');
  console.log('================================================================\n');

  const userDataDir = path.join(os.tmpdir(), `chrome-reprove-${Date.now()}`);
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

    // -------------------------------------------------------------------------
    // 1. VISIBILITY POSITIVE CONTROL AT SCROLL 0 (DESKTOP 1440x900)
    // -------------------------------------------------------------------------
    console.log('--- 1. TASK 4(a) LANTERN VISIBILITY POSITIVE CONTROL (Scroll 0, 1440x900) ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send('Page.navigate', { url: TARGET_URL });
    await new Promise((r) => setTimeout(r, 2000));

    // Ensure scroll is at 0
    await send('Runtime.evaluate', {
      expression: `window.scrollTo({ top: 0, behavior: 'instant' });`,
    });
    await new Promise((r) => setTimeout(r, 500));

    const discRadius = 208; // 40% of 520px diameter
    const lanternRadius = 260; // 50%
    const ringOuterRadius = 312; // 60%

    const testPoints = [
      { name: 'Centre', x: 720, y: 450 },
      { name: 'Top-Right Light', x: 1200, y: 200 },
    ];

    const visibilitySummary = [];

    for (const pt of testPoints) {
      console.log(`\nEvaluating Lantern at ${pt.name} (${pt.x}, ${pt.y}):`);

      // 1. With-lantern: set position and full reveal opacity
      await send('Runtime.evaluate', {
        expression: `(() => {
          const l = document.querySelector('.living-wall-lantern');
          const c = document.querySelector('.living-wall-lantern-counter');
          if (l) {
            l.style.display = 'block';
            l.style.opacity = '1';
            window.gsap.set(l, { x: ${pt.x}, y: ${pt.y} });
          }
          if (c) {
            window.gsap.set(c, { x: -${pt.x}, y: -${pt.y} });
          }
        })()`,
      });
      await new Promise((r) => setTimeout(r, 300));
      const withSnap = await send('Page.captureScreenshot', { format: 'png' });
      const withBuf = Buffer.from(withSnap.data, 'base64');
      const withLum = await computeLuminanceRegions(withBuf, pt.x, pt.y, discRadius, lanternRadius, ringOuterRadius);

      // Save screenshot
      const withPath = path.join(SCREENS_DIR, `h1-desktop-lantern-${pt.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-1440x900.png`);
      fs.writeFileSync(withPath, withBuf);

      // 2. Base-only: hide lantern
      await send('Runtime.evaluate', {
        expression: `(() => {
          const l = document.querySelector('.living-wall-lantern');
          if (l) l.style.display = 'none';
        })()`,
      });
      await new Promise((r) => setTimeout(r, 200));
      const baseSnap = await send('Page.captureScreenshot', { format: 'png' });
      const baseBuf = Buffer.from(baseSnap.data, 'base64');
      const baseLum = await computeLuminanceRegions(baseBuf, pt.x, pt.y, discRadius, lanternRadius, ringOuterRadius);

      const basePath = path.join(SCREENS_DIR, `h1-desktop-base-only-${pt.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-1440x900.png`);
      fs.writeFileSync(basePath, baseBuf);

      const insideGainPct = ((withLum.discMean - baseLum.discMean) / baseLum.discMean) * 100;
      const outsideChangePct = (Math.abs(withLum.ringMean - baseLum.ringMean) / baseLum.ringMean) * 100;

      console.log(`  Base inside disc mean luminance:     ${baseLum.discMean.toFixed(3)} (pixels: ${baseLum.discCount})`);
      console.log(`  With-lantern inside disc luminance:  ${withLum.discMean.toFixed(3)} (pixels: ${withLum.discCount})`);
      console.log(`  -> Inside Gain:                      ${insideGainPct >= 0 ? '+' : ''}${insideGainPct.toFixed(2)}% (Target: >= +8% -> ${insideGainPct >= 8.0 ? 'PASS' : 'FAIL'})`);
      console.log(`  Base outside ring mean luminance:    ${baseLum.ringMean.toFixed(3)} (pixels: ${baseLum.ringCount})`);
      console.log(`  With-lantern outside ring luminance: ${withLum.ringMean.toFixed(3)} (pixels: ${withLum.ringCount})`);
      console.log(`  -> Outside Change:                   ${outsideChangePct.toFixed(2)}% (Target: <= 1% -> ${outsideChangePct <= 1.0 ? 'PASS' : 'FAIL'})`);

      visibilitySummary.push({
        name: pt.name,
        coords: `(${pt.x}, ${pt.y})`,
        baseDiscMean: Number(baseLum.discMean.toFixed(3)),
        withLanternDiscMean: Number(withLum.discMean.toFixed(3)),
        gainPct: Number(insideGainPct.toFixed(2)),
        gainPass: insideGainPct >= 8.0,
        baseRingMean: Number(baseLum.ringMean.toFixed(3)),
        withLanternRingMean: Number(withLum.ringMean.toFixed(3)),
        outsideChangePct: Number(outsideChangePct.toFixed(2)),
        outsidePass: outsideChangePct <= 1.0,
      });
    }

    // -------------------------------------------------------------------------
    // 2. TASK 4(b) ALIGNMENT: REAL VS 6px OFFSET NEGATIVE CONTROL
    // -------------------------------------------------------------------------
    console.log('\n--- 2. TASK 4(b) ALIGNMENT NCC: REAL VS 6px OFFSET (Scroll 0) ---');
    // We evaluate at (1200, 200) where archival pages and light source provide rich edge detail
    const detailPt = { name: 'Top-Right Archival Page Detail', cursorX: 1200, cursorY: 200 };
    const cropSize = 240;
    const cropLeft = detailPt.cursorX - cropSize / 2;
    const cropTop = detailPt.cursorY - cropSize / 2;

    // 1. Base-only screenshot for NCC baseline
    await send('Runtime.evaluate', {
      expression: `(() => {
        const l = document.querySelector('.living-wall-lantern');
        if (l) l.style.display = 'none';
      })()`,
    });
    await new Promise((r) => setTimeout(r, 200));
    const baseSnap = await send('Page.captureScreenshot', { format: 'png' });
    const baseBuf = Buffer.from(baseSnap.data, 'base64');
    const baseCrop = await sharp(baseBuf).extract({ left: cropLeft, top: cropTop, width: cropSize, height: cropSize }).png().toBuffer();
    const hpBase = await highPassFilter(baseCrop);

    // 2. Real Code with lantern
    await send('Runtime.evaluate', {
      expression: `(() => {
        const l = document.querySelector('.living-wall-lantern');
        const c = document.querySelector('.living-wall-lantern-counter');
        if (l) {
          l.style.display = 'block';
          l.style.opacity = '1';
          window.gsap.set(l, { x: ${detailPt.cursorX}, y: ${detailPt.cursorY} });
        }
        if (c) {
          window.gsap.set(c, { x: -${detailPt.cursorX}, y: -${detailPt.cursorY} });
        }
      })()`,
    });
    await new Promise((r) => setTimeout(r, 300));
    const realSnap = await send('Page.captureScreenshot', { format: 'png' });
    const realBuf = Buffer.from(realSnap.data, 'base64');
    const realCrop = await sharp(realBuf).extract({ left: cropLeft, top: cropTop, width: cropSize, height: cropSize }).png().toBuffer();
    const hpReal = await highPassFilter(realCrop);
    const realNCC = computeNCC(hpBase, hpReal);

    // 3. Negative control with 6px counter-transform offset
    await send('Runtime.evaluate', {
      expression: `(() => {
        const c = document.querySelector('.living-wall-lantern-counter');
        if (c) {
          window.gsap.set(c, { x: -${detailPt.cursorX} + 6, y: -${detailPt.cursorY} + 6 });
        }
      })()`,
    });
    await new Promise((r) => setTimeout(r, 300));
    const offsetSnap = await send('Page.captureScreenshot', { format: 'png' });
    const offsetBuf = Buffer.from(offsetSnap.data, 'base64');
    const offsetCrop = await sharp(offsetBuf).extract({ left: cropLeft, top: cropTop, width: cropSize, height: cropSize }).png().toBuffer();
    const hpOffset = await highPassFilter(offsetCrop);
    const offsetNCC = computeNCC(hpBase, hpOffset);

    // Restore counter-transform
    await send('Runtime.evaluate', {
      expression: `(() => {
        const c = document.querySelector('.living-wall-lantern-counter');
        if (c) {
          window.gsap.set(c, { x: -${detailPt.cursorX}, y: -${detailPt.cursorY} });
        }
      })()`,
    });

    console.log(`  Region: ${detailPt.name} (${detailPt.cursorX}, ${detailPt.cursorY})`);
    console.log(`  -> Real High-Pass NCC:       ${realNCC.toFixed(4)} (Target: >= 0.90 -> ${realNCC >= 0.90 ? 'PASS' : 'FAIL'})`);
    console.log(`  -> 6px Offset High-Pass NCC: ${offsetNCC.toFixed(4)} (Target: < 0.90 -> ${offsetNCC < 0.90 ? 'PASS' : 'FAIL'})`);

    // Also check centre point (720, 450)
    const centrePt = { name: 'Screen Centre', cursorX: 720, cursorY: 450 };
    const cCropLeft = centrePt.cursorX - cropSize / 2;
    const cCropTop = centrePt.cursorY - cropSize / 2;

    await send('Runtime.evaluate', {
      expression: `(() => {
        const l = document.querySelector('.living-wall-lantern');
        if (l) l.style.display = 'none';
      })()`,
    });
    await new Promise((r) => setTimeout(r, 200));
    const cBaseSnap = await send('Page.captureScreenshot', { format: 'png' });
    const cBaseCrop = await sharp(Buffer.from(cBaseSnap.data, 'base64')).extract({ left: cCropLeft, top: cCropTop, width: cropSize, height: cropSize }).png().toBuffer();
    const cHpBase = await highPassFilter(cBaseCrop);

    await send('Runtime.evaluate', {
      expression: `(() => {
        const l = document.querySelector('.living-wall-lantern');
        const c = document.querySelector('.living-wall-lantern-counter');
        if (l) {
          l.style.display = 'block';
          l.style.opacity = '1';
          window.gsap.set(l, { x: ${centrePt.cursorX}, y: ${centrePt.cursorY} });
        }
        if (c) {
          window.gsap.set(c, { x: -${centrePt.cursorX}, y: -${centrePt.cursorY} });
        }
      })()`,
    });
    await new Promise((r) => setTimeout(r, 300));
    const cRealSnap = await send('Page.captureScreenshot', { format: 'png' });
    const cRealCrop = await sharp(Buffer.from(cRealSnap.data, 'base64')).extract({ left: cCropLeft, top: cCropTop, width: cropSize, height: cropSize }).png().toBuffer();
    const cHpReal = await highPassFilter(cRealCrop);
    const cRealNCC = computeNCC(cHpBase, cHpReal);

    await send('Runtime.evaluate', {
      expression: `(() => {
        const c = document.querySelector('.living-wall-lantern-counter');
        if (c) {
          window.gsap.set(c, { x: -${centrePt.cursorX} + 6, y: -${centrePt.cursorY} + 6 });
        }
      })()`,
    });
    await new Promise((r) => setTimeout(r, 300));
    const cOffsetSnap = await send('Page.captureScreenshot', { format: 'png' });
    const cOffsetCrop = await sharp(Buffer.from(cOffsetSnap.data, 'base64')).extract({ left: cCropLeft, top: cCropTop, width: cropSize, height: cropSize }).png().toBuffer();
    const cHpOffset = await highPassFilter(cOffsetCrop);
    const cOffsetNCC = computeNCC(cHpBase, cHpOffset);

    // Restore counter-transform
    await send('Runtime.evaluate', {
      expression: `(() => {
        const c = document.querySelector('.living-wall-lantern-counter');
        if (c) {
          window.gsap.set(c, { x: -${centrePt.cursorX}, y: -${centrePt.cursorY} });
        }
      })()`,
    });

    console.log(`\n  Region: ${centrePt.name} (${centrePt.cursorX}, ${centrePt.cursorY})`);
    console.log(`  -> Real High-Pass NCC:       ${cRealNCC.toFixed(4)} (Target: >= 0.90 -> ${cRealNCC >= 0.90 ? 'PASS' : 'FAIL'})`);
    console.log(`  -> 6px Offset High-Pass NCC: ${cOffsetNCC.toFixed(4)} (Target: < 0.90 -> ${cOffsetNCC < 0.90 ? 'PASS' : 'FAIL'})`);

    // -------------------------------------------------------------------------
    // 3. CAPTURE DESKTOP 1440x900 SCREENSHOT WITH LANTERN AT CENTRE
    // -------------------------------------------------------------------------
    console.log('\n--- 3. CAPTURING PROOF SCREENSHOTS ---');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const l = document.querySelector('.living-wall-lantern');
        const c = document.querySelector('.living-wall-lantern-counter');
        if (l) {
          l.style.display = 'block';
          l.style.opacity = '1';
          window.gsap.set(l, { x: 720, y: 450 });
        }
        if (c) {
          window.gsap.set(c, { x: -720, y: -450 });
        }
      })()`,
    });
    await new Promise((r) => setTimeout(r, 300));
    const dProofSnap = await send('Page.captureScreenshot', { format: 'png' });
    const dProofPath = path.join(SCREENS_DIR, 'desktop-scroll0-lantern-center-1440x900.png');
    fs.writeFileSync(dProofPath, Buffer.from(dProofSnap.data, 'base64'));
    console.log(`Saved desktop proof: ${dProofPath}`);

    // -------------------------------------------------------------------------
    // 4. CAPTURE MOBILE 390x844 SCREENSHOT (NO LANTERN, SCROLL 0)
    // -------------------------------------------------------------------------
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
    });
    await send('Page.navigate', { url: TARGET_URL });
    await new Promise((r) => setTimeout(r, 2000));

    const mProofSnap = await send('Page.captureScreenshot', { format: 'png' });
    const mProofPath = path.join(SCREENS_DIR, 'mobile-scroll0-390x844.png');
    fs.writeFileSync(mProofPath, Buffer.from(mProofSnap.data, 'base64'));
    console.log(`Saved mobile proof: ${mProofPath}`);

    // Write summary report
    const summaryData = {
      visibility: visibilitySummary,
      alignment: {
        pageDetail: {
          location: detailPt.name,
          coords: `(${detailPt.cursorX}, ${detailPt.cursorY})`,
          realNCC: Number(realNCC.toFixed(4)),
          offsetNCC: Number(offsetNCC.toFixed(4)),
          realPass: realNCC >= 0.90,
          offsetDropPass: offsetNCC < 0.90,
        },
        centre: {
          location: centrePt.name,
          coords: `(${centrePt.cursorX}, ${centrePt.cursorY})`,
          realNCC: Number(cRealNCC.toFixed(4)),
          offsetNCC: Number(cOffsetNCC.toFixed(4)),
          realPass: cRealNCC >= 0.90,
          offsetDropPass: cOffsetNCC < 0.90,
        },
      },
    };
    fs.writeFileSync(path.resolve('docs/proofs/h1-wall-reprove-summary.json'), JSON.stringify(summaryData, null, 2));

  } finally {
    try {
      chromeProc.kill();
    } catch {}
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

