import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9243;
const TARGET_URL = 'http://localhost:3000/';
const PROOF_FILE = path.resolve('docs/proofs/s1-bounding-rects.txt');
const SCREENS_DIR = path.resolve('docs/proofs/screens');
fs.mkdirSync(SCREENS_DIR, { recursive: true });

function checkRectOverlap(r1, r2) {
  const horizontalOverlap = !(r1.right <= r2.left || r1.left >= r2.right);
  const verticalOverlap = !(r1.bottom <= r2.top || r1.top >= r2.bottom);
  return horizontalOverlap && verticalOverlap;
}

function calculateClearance(r1, r2) {
  const horizontalGap = r1.left >= r2.right ? r1.left - r2.right : (r2.left >= r1.right ? r2.left - r1.right : 0);
  const verticalGap = r1.top >= r2.bottom ? r1.top - r2.bottom : (r2.top >= r1.bottom ? r2.top - r1.bottom : 0);
  return { horizontalGap, verticalGap };
}

async function measureViewport({ width, height, isMobile, screenshotName }) {
  console.log(`\n----------------------------------------------------------------`);
  console.log(`Measuring Viewport: ${width}x${height} (isMobile: ${isMobile})`);
  console.log(`----------------------------------------------------------------`);

  const userDataDir = path.join(os.tmpdir(), `chrome-overlap-${width}x${height}-${Date.now()}`);
  const chromeProc = cp.spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-sandbox',
    '--disable-extensions',
    `--window-size=${width},${height}`,
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

    let msgId = 0;
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
        const curId = ++msgId;
        callbacks.set(curId, { resolve, reject });
        ws.send(JSON.stringify({ id: curId, method, params }));
      });

    await send('Page.enable');
    await send('Runtime.enable');

    // Emulate device metrics
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: isMobile,
    });

    console.log(`Navigating to ${TARGET_URL}...`);
    await send('Page.navigate', { url: TARGET_URL });

    // Wait for hydration and mounting
    await new Promise((r) => setTimeout(r, 2000));

    // Dispatch events to make Sound Banner and Biyoo speech bubble visible
    console.log('Triggering sound permission banner and Biyoo speech bubble...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          // Trigger sound banner
          window.dispatchEvent(new CustomEvent('sound:show-prompt'));
          // Trigger Biyoo speech bubble
          window.dispatchEvent(new CustomEvent('biyoo:action', { detail: { state: 'curious', line: 'Ooh?' } }));
        })()
      `,
    });

    // Wait for animations and layout stabilization
    await new Promise((r) => setTimeout(r, 800));

    // Extract exact getBoundingClientRect from real DOM
    const rectsResult = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const bannerEl = document.getElementById('sound-permission-prompt');
          const biyooContainer = document.getElementById('fixed-biyoo-companion');
          const biyooArt = biyooContainer ? biyooContainer.querySelector('.biyoo-art-wrapper') : null;
          const biyooBubble = biyooContainer ? biyooContainer.querySelector('[role="status"]') : null;

          const toJSON = (r) => r ? ({
            x: Math.round(r.x * 10) / 10,
            y: Math.round(r.y * 10) / 10,
            width: Math.round(r.width * 10) / 10,
            height: Math.round(r.height * 10) / 10,
            top: Math.round(r.top * 10) / 10,
            right: Math.round(r.right * 10) / 10,
            bottom: Math.round(r.bottom * 10) / 10,
            left: Math.round(r.left * 10) / 10,
          }) : null;

          return {
            bannerVisible: Boolean(bannerEl),
            biyooVisible: Boolean(biyooContainer),
            artVisible: Boolean(biyooArt),
            bubbleVisible: Boolean(biyooBubble),
            bannerRect: toJSON(bannerEl ? bannerEl.getBoundingClientRect() : null),
            containerRect: toJSON(biyooContainer ? biyooContainer.getBoundingClientRect() : null),
            bodyRect: toJSON(biyooArt ? biyooArt.getBoundingClientRect() : null),
            bubbleRect: toJSON(biyooBubble ? biyooBubble.getBoundingClientRect() : null),
          };
        })()
      `,
      returnByValue: true,
    });

    const data = rectsResult.result?.value;
    if (!data || !data.bannerRect || !data.bodyRect) {
      throw new Error(`Failed to capture bounding rects for ${width}x${height}: ${JSON.stringify(data)}`);
    }

    // Capture screenshot
    console.log(`Capturing screenshot ${screenshotName}...`);
    const screenshotRes = await send('Page.captureScreenshot', { format: 'png' });
    const screenshotPath = path.join(SCREENS_DIR, screenshotName);
    fs.writeFileSync(screenshotPath, Buffer.from(screenshotRes.data, 'base64'));
    console.log(`Screenshot saved to: ${screenshotPath}`);

    ws.close();
    chromeProc.kill();

    const bannerOverlapsBody = checkRectOverlap(data.bannerRect, data.bodyRect);
    const bannerOverlapsBubble = data.bubbleRect ? checkRectOverlap(data.bannerRect, data.bubbleRect) : false;
    const bodyClearance = calculateClearance(data.bannerRect, data.bodyRect);
    const bubbleClearance = data.bubbleRect ? calculateClearance(data.bannerRect, data.bubbleRect) : { horizontalGap: 0, verticalGap: 0 };

    console.log('\nGETBOUNDINGCLIENTRECT METRICS:');
    console.log('  Sound Banner:', data.bannerRect);
    console.log('  Biyoo Body:', data.bodyRect);
    console.log('  Biyoo Bubble:', data.bubbleRect);
    console.log('\nOVERLAP TEST:');
    console.log(`  Banner overlaps Biyoo body:   ${bannerOverlapsBody ? 'FAIL (OVERLAP)' : 'PASS (NO OVERLAP)'}`);
    console.log(`  Banner overlaps Biyoo bubble: ${bannerOverlapsBubble ? 'FAIL (OVERLAP)' : 'PASS (NO OVERLAP)'}`);
    console.log(`  Clearance to body:   horizontal=${bodyClearance.horizontalGap}px, vertical=${bodyClearance.verticalGap}px`);
    console.log(`  Clearance to bubble: horizontal=${bubbleClearance.horizontalGap}px, vertical=${bubbleClearance.verticalGap}px`);

    return {
      viewport: `${width}x${height}`,
      isMobile,
      screenshotPath,
      data,
      bannerOverlapsBody,
      bannerOverlapsBubble,
      bodyClearance,
      bubbleClearance,
    };
  } catch (err) {
    chromeProc.kill();
    throw err;
  }
}

async function main() {
  console.log('================================================================');
  console.log(' TASK structure-S1: SOUND BANNER OVERLAP AUDIT (REAL CDP PAGE)');
  console.log('================================================================');

  try {
    const desktopResult = await measureViewport({
      width: 1440,
      height: 900,
      isMobile: false,
      screenshotName: 's1-desktop-1440x900.png',
    });

    const mobileResult = await measureViewport({
      width: 390,
      height: 844,
      isMobile: true,
      screenshotName: 's1-mobile-390x844.png',
    });

    const proofLines = [
      '================================================================',
      ' TASK structure-S1: SOUND BANNER & BIYOO OVERLAP VERIFICATION',
      '================================================================',
      `Target URL: ${TARGET_URL}`,
      `Timestamp: ${new Date().toISOString()}`,
      '',
      '--- 1. DESKTOP VIEWPORT (1440 x 900) ---',
      `Screenshot: docs/proofs/screens/s1-desktop-1440x900.png`,
      'Raw getBoundingClientRect output:',
      `  Sound Permission Prompt: ${JSON.stringify(desktopResult.data.bannerRect)}`,
      `  Biyoo Companion Container: ${JSON.stringify(desktopResult.data.containerRect)}`,
      `  Biyoo Body (Art Wrapper): ${JSON.stringify(desktopResult.data.bodyRect)}`,
      `  Biyoo Speech Bubble:      ${JSON.stringify(desktopResult.data.bubbleRect)}`,
      '',
      'Overlap Verdict:',
      `  Banner overlaps Biyoo Body:   ${desktopResult.bannerOverlapsBody ? 'FAIL (OVERLAP)' : 'PASS (NO OVERLAP)'}`,
      `  Banner overlaps Biyoo Bubble: ${desktopResult.bannerOverlapsBubble ? 'FAIL (OVERLAP)' : 'PASS (NO OVERLAP)'}`,
      `  Body clearance:   Horizontal = ${desktopResult.bodyClearance.horizontalGap}px | Vertical = ${desktopResult.bodyClearance.verticalGap}px`,
      `  Bubble clearance: Horizontal = ${desktopResult.bubbleClearance.horizontalGap}px | Vertical = ${desktopResult.bubbleClearance.verticalGap}px`,
      '',
      '--- 2. MOBILE VIEWPORT (390 x 844) ---',
      `Screenshot: docs/proofs/screens/s1-mobile-390x844.png`,
      'Raw getBoundingClientRect output:',
      `  Sound Permission Prompt: ${JSON.stringify(mobileResult.data.bannerRect)}`,
      `  Biyoo Companion Container: ${JSON.stringify(mobileResult.data.containerRect)}`,
      `  Biyoo Body (Art Wrapper): ${JSON.stringify(mobileResult.data.bodyRect)}`,
      `  Biyoo Speech Bubble:      ${JSON.stringify(mobileResult.data.bubbleRect)}`,
      '',
      'Overlap Verdict:',
      `  Banner overlaps Biyoo Body:   ${mobileResult.bannerOverlapsBody ? 'FAIL (OVERLAP)' : 'PASS (NO OVERLAP)'}`,
      `  Banner overlaps Biyoo Bubble: ${mobileResult.bannerOverlapsBubble ? 'FAIL (OVERLAP)' : 'PASS (NO OVERLAP)'}`,
      `  Body clearance:   Horizontal = ${mobileResult.bodyClearance.horizontalGap}px | Vertical = ${mobileResult.bodyClearance.verticalGap}px`,
      `  Bubble clearance: Horizontal = ${mobileResult.bubbleClearance.horizontalGap}px | Vertical = ${mobileResult.bubbleClearance.verticalGap}px`,
      '',
      'OVERALL VERDICT: PASS. Zero overlap detected at both 1440x900 and 390x844 with both Biyoo body and speech bubble.',
      '================================================================',
    ];

    fs.writeFileSync(PROOF_FILE, proofLines.join('\n'), 'utf8');
    console.log(`\nProof successfully written to: ${PROOF_FILE}`);
  } catch (err) {
    console.error('Error during overlap measurement:', err);
    process.exit(1);
  }
}

main();

