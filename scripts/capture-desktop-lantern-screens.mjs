import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9232;
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000/';
const OUTPUT_DIR = path.resolve('docs/proofs/screens');

async function captureLanternScreens() {
  console.log('====================================================');
  console.log(' CAPTURING 1440x900 SCREENSHOTS WITH LANTERN VISIBLE ');
  console.log(' Targets: hero, edge-cloud, ratify');
  console.log('====================================================\n');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const userDataDir = path.join(os.tmpdir(), `chrome-screens-${Date.now()}`);
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
    await new Promise((r) => setTimeout(r, 4000));

    const targets = [
      { id: 'hero-scene-container', name: 'desktop-hero-lantern.png', label: 'Hero (Hub)', pointerX: 500, pointerY: 380 },
      { id: 'edge-cloud', name: 'desktop-edge-cloud-lantern.png', label: 'Edge-Cloud (Tinted)', pointerX: 620, pointerY: 420 },
      { id: 'ratify', name: 'desktop-ratify-lantern.png', label: 'Ratify (Raft Tinted)', pointerX: 580, pointerY: 400 },
    ];

    for (const t of targets) {
      console.log(`Scrolling to ${t.label} (#${t.id})...`);
      await send('Runtime.evaluate', {
        expression: `(() => {
          const el = document.getElementById('${t.id}');
          if (el) {
            el.scrollIntoView({ behavior: 'instant', block: 'center' });
          }
        })()`,
      });

      // Wait for scroll and tint crossfade
      await new Promise((r) => setTimeout(r, 1000));

      // Move pointer and trigger lantern
      await send('Runtime.evaluate', {
        expression: `(() => {
          window.dispatchEvent(new PointerEvent('pointermove', {
            clientX: ${t.pointerX},
            clientY: ${t.pointerY},
            bubbles: true,
          }));
        })()`,
      });

      // Wait 500ms for gsap quickTo and opacity animation
      await new Promise((r) => setTimeout(r, 600));

      const screenshot = await send('Page.captureScreenshot', { format: 'png' });
      const filePath = path.join(OUTPUT_DIR, t.name);
      fs.writeFileSync(filePath, Buffer.from(screenshot.data, 'base64'));
      console.log(`Saved screenshot: ${filePath}`);
    }

    ws.close();
    chromeProc.kill();
    console.log('\nAll screenshots captured successfully!');
  } catch (err) {
    chromeProc.kill();
    console.error('Screenshot capture failed:', err);
    process.exit(1);
  } finally {
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

captureLanternScreens();
