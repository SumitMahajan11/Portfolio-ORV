import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9226;
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000/';

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message));
        } else {
          resolve(msg.result);
        }
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

const SECTIONS = [
  { id: 'hero-scene-container', name: 'hero-scene-container_hub', expectedTint: 'hub' },
  { id: 'scenario-select', name: 'scenario-select_hub', expectedTint: 'hub' },
  { id: 'edge-cloud', name: 'edge-cloud_tinted', expectedTint: 'edge-cloud' },
  { id: 'ratify', name: 'ratify_raft_tinted', expectedTint: 'raft' },
  { id: 'iac-verifier', name: 'iac-verifier_z3_tinted', expectedTint: 'z3' },
  { id: 'side-quests', name: 'side-quests_hub', expectedTint: 'hub' },
  { id: 'readers-record', name: 'readers-record_hub', expectedTint: 'hub' },
  { id: 'contact', name: 'contact_hub', expectedTint: 'hub' },
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, mobile: false, dsf: 1 },
  { name: 'mobile', width: 390, height: 844, mobile: true, dsf: 2 },
];

const OUTPUT_DIR = path.resolve('docs/proofs/screens');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function capture() {
  console.log('====================================================');
  console.log(' CAPTURING SECTION TINT SCREENSHOTS ');
  console.log(' Viewports: 1440x900 (Desktop) and 390x844 (Mobile) ');
  console.log('====================================================\n');

  const userDataDir = path.join(os.tmpdir(), `chrome-screens-${Date.now()}`);
  const chromeProc = cp.spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-sandbox',
    '--disable-gpu',
    `--user-data-dir=${userDataDir}`,
  ]);

  await new Promise((r) => setTimeout(r, 1200));

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n--- Capturing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);

      // Create a fresh tab
      const targetRes = await fetch(`http://localhost:${CDP_PORT}/json/new?about:blank`, {
        method: 'PUT',
      });
      const target = await targetRes.json();
      const client = new CDPClient(target.webSocketDebuggerUrl);
      await client.connect();

      await client.send('Page.enable');
      await client.send('Runtime.enable');
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.dsf,
        mobile: vp.mobile,
      });

      console.log(`Navigating to ${TARGET_URL}...`);
      await client.send('Page.navigate', { url: TARGET_URL });
      await new Promise((r) => setTimeout(r, 2000));

      for (const section of SECTIONS) {
        console.log(`  Targeting section: ${section.id}...`);

        const navState = await client.send('Runtime.evaluate', {
          awaitPromise: true,
          returnByValue: true,
          expression: `(async () => {
            const el = document.getElementById('${section.id}');
            if (!el) return { error: 'Element ${section.id} not found' };

            el.scrollIntoView({ behavior: 'instant', block: 'center' });
            window.dispatchEvent(new Event('scroll'));
            
            // Wait for 0.8s GSAP crossfade
            await new Promise(r => setTimeout(r, 1000));

            const tints = ['edge-cloud', 'raft', 'z3', 'backtrace'];
            const opacities = {};
            tints.forEach(t => {
              const tintEl = document.querySelector('[data-tint="' + t + '"]');
              opacities[t] = tintEl ? parseFloat(window.getComputedStyle(tintEl).opacity) : null;
            });

            return {
              scrollY: window.scrollY,
              rect: {
                top: Math.round(el.getBoundingClientRect().top),
                height: Math.round(el.getBoundingClientRect().height),
              },
              opacities,
            };
          })()`,
        });

        console.log(`    State:`, JSON.stringify(navState.result.value));

        const screenshot = await client.send('Page.captureScreenshot', {
          format: 'png',
        });

        const filename = `${vp.name}_${section.name}.png`;
        const filePath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(filePath, Buffer.from(screenshot.data, 'base64'));
        console.log(`    Saved: ${filename} (${Math.round(screenshot.data.length * 0.75 / 1024)} KB)`);
      }

      client.close();
      await fetch(`http://localhost:${CDP_PORT}/json/close/${target.id}`);
    }

    console.log('\nAll section tint screenshots captured successfully.');
  } finally {
    chromeProc.kill();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
