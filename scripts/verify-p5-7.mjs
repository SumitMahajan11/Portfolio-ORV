import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

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

async function run() {
  console.log('====================================================');
  console.log(' P5-7 VERIFICATION: WALL CROSSFADE & SCROLLTRIGGERS');
  console.log('====================================================');

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-p5-7-'));
  const chromeProcess = cp.spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9222',
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--disable-extensions',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  await new Promise((r) => setTimeout(r, 1500));

  try {
    const listRes = await fetch('http://localhost:9222/json/list');
    const targets = await listRes.json();
    let pageTarget = targets.find((t) => t.type === 'page');

    if (!pageTarget) {
      const newRes = await fetch('http://localhost:9222/json/new');
      pageTarget = await newRes.json();
    }

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log(`\nNavigating to ${BASE_URL}/...`);
    await client.send('Page.navigate', { url: `${BASE_URL}/` });
    await new Promise((r) => setTimeout(r, 2500));

    // 1. Initial State & ScrollTrigger Count at 0%
    console.log('\n--- 1. Checking 0% Scroll State ---');
    const initialWall = await client.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const activeLayer = document.querySelector('.site-wall-compositor [data-wall-id].opacity-100') ||
                            document.querySelector('.site-wall-compositor [data-wall-id]');
        return activeLayer ? activeLayer.getAttribute('data-wall-id') : 'unknown';
      })()`,
    });
    console.log(`  Initial Active Wall: ${initialWall.result.value}`);

    const count0 = await client.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const ST = window.ScrollTrigger;
        if (!ST) return -1;
        const triggers = ST.getAll();
        return {
          count: triggers.length,
          triggers: triggers.map(t => ({
            id: t.vars.id || 'unnamed',
            trigger: t.trigger ? (t.trigger.id || t.trigger.className || t.trigger.tagName) : 'none',
            pin: Boolean(t.pin)
          }))
        };
      })()`,
    });
    console.log(`  ScrollTrigger count at 0%: ${count0.result.value.count}`);
    console.log('  Registered triggers at 0%:', JSON.stringify(count0.result.value.triggers, null, 2));

    // 2. Scroll into Scenario Select
    console.log('\n--- 2. Scrolling to Scenario Select (#scenario-select) ---');
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.getElementById('scenario-select');
        if (el) el.scrollIntoView({ behavior: 'instant' });
      })()`,
    });
    await new Promise((r) => setTimeout(r, 1200));

    const wallAtScenario = await client.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const layers = Array.from(document.querySelectorAll('.site-wall-compositor [data-wall-id]'));
        return layers.map(l => ({ id: l.getAttribute('data-wall-id'), className: l.className }));
      })()`,
    });
    console.log('  Wall layers at #scenario-select:', JSON.stringify(wallAtScenario.result.value));

    // 3. Scroll into Edge-Cloud Orchestrator (#edge-cloud)
    console.log('\n--- 3. Scrolling to Edge Cloud (#edge-cloud) ---');
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.getElementById('edge-cloud');
        if (el) el.scrollIntoView({ behavior: 'instant' });
      })()`,
    });
    await new Promise((r) => setTimeout(r, 1500));

    const wallAtEdgeCloud = await client.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const layers = Array.from(document.querySelectorAll('.site-wall-compositor [data-wall-id]'));
        return layers.map(l => ({ id: l.getAttribute('data-wall-id'), className: l.className }));
      })()`,
    });
    console.log('  Wall layers at #edge-cloud:', JSON.stringify(wallAtEdgeCloud.result.value));

    // 4. Scroll into Finale Section (#finale-scene / #contact)
    console.log('\n--- 4. Scrolling to Finale / Contact (#contact) ---');
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.getElementById('contact') || document.getElementById('finale-scene');
        if (el) el.scrollIntoView({ behavior: 'instant' });
      })()`,
    });
    await new Promise((r) => setTimeout(r, 1500));

    const wallAtFinale = await client.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const layers = Array.from(document.querySelectorAll('.site-wall-compositor [data-wall-id]'));
        return layers.map(l => ({ id: l.getAttribute('data-wall-id'), className: l.className }));
      })()`,
    });
    console.log('  Wall layers at Finale (#contact):', JSON.stringify(wallAtFinale.result.value));

    // 5. Scroll to 100% (Bottom) and Check ScrollTrigger Count
    console.log('\n--- 5. Scrolling to 100% Scroll (Bottom) ---');
    await client.send('Runtime.evaluate', {
      expression: `window.scrollTo(0, document.body.scrollHeight);`,
    });
    await new Promise((r) => setTimeout(r, 1500));

    const count100 = await client.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const ST = window.ScrollTrigger;
        if (!ST) return -1;
        const triggers = ST.getAll();
        return {
          count: triggers.length,
          triggers: triggers.map(t => ({
            id: t.vars.id || 'unnamed',
            trigger: t.trigger ? (t.trigger.id || t.trigger.className || t.trigger.tagName) : 'none',
            pin: Boolean(t.pin)
          }))
        };
      })()`,
    });
    console.log(`  ScrollTrigger count at 100%: ${count100.result.value.count}`);
    console.log('  Registered triggers at 100%:', JSON.stringify(count100.result.value.triggers, null, 2));

    await client.close();
  } finally {
    try {
      chromeProcess.kill();
    } catch {}
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});

