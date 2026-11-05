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

async function waitReady(url, maxWaitMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server at ${url} not ready within ${maxWaitMs}ms`);
}

async function killPort(port) {
  try {
    const cmd = `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`;
    cp.execSync(`powershell -Command "${cmd}"`, { stdio: 'ignore' });
  } catch {}
}

async function main() {
  console.log('Starting P1-11 Screenshot Capture Suite...');
  const screensDir = path.resolve('docs/proofs/screens');
  fs.mkdirSync(screensDir, { recursive: true });

  await killPort(PORT);
  await new Promise((r) => setTimeout(r, 1000));

  console.log('Launching Next.js production server on port ' + PORT + '...');
  const nextServer = cp.spawn('cmd.exe', ['/c', 'npx', 'next', 'start', '-p', String(PORT)], {
    stdio: 'ignore',
  });

  const userDataDir = path.join(os.tmpdir(), `chrome-p111-${Date.now()}`);
  const chromeProc = cp.spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-sandbox',
    '--disable-gpu',
    `--user-data-dir=${userDataDir}`,
  ]);

  try {
    await waitReady(BASE_URL);
    console.log('Next.js server is ready at ' + BASE_URL);

    await waitReady('http://localhost:9222/json/version');
    console.log('Chrome remote debugging is ready.');

    async function createClient(width, height, isMobile) {
      const targetRes = await fetch('http://localhost:9222/json/new?about:blank', {
        method: 'PUT',
      });
      const target = await targetRes.json();
      const client = new CDPClient(target.webSocketDebuggerUrl);
      await client.connect();
      await client.send('Page.enable');
      await client.send('Runtime.enable');
      await client.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: isMobile ? 2 : 1,
        mobile: isMobile,
      });
      return { client, targetId: target.id };
    }

    async function closeTarget(targetId) {
      try {
        await fetch(`http://localhost:9222/json/close/${targetId}`);
      } catch {}
    }

    async function saveScreenshot(client, filename) {
      const screenshot = await client.send('Page.captureScreenshot', { format: 'png' });
      const filePath = path.join(screensDir, filename);
      fs.writeFileSync(filePath, Buffer.from(screenshot.data, 'base64'));
      console.log(`Saved screenshot: ${filename}`);
    }

    const configs = [
      { name: 'desktop', width: 1440, height: 900, mobile: false },
      { name: 'mobile', width: 390, height: 844, mobile: true },
    ];

    const modes = ['full', 'light'];

    for (const dev of configs) {
      for (const mode of modes) {
        console.log(`\n========================================`);
        console.log(`Evaluating ${dev.name} (${dev.width}x${dev.height}) in ${mode.toUpperCase()} mode`);
        console.log(`========================================`);

        // 1. Hero at 0%
        {
          const { client, targetId } = await createClient(dev.width, dev.height, dev.mobile);
          await client.send('Page.navigate', { url: `${BASE_URL}/?${mode}=1` });
          // Wait briefly for initial paint at 0%
          await new Promise((r) => setTimeout(r, 800));
          await saveScreenshot(client, `p1-11_${dev.name}_${mode}_hero_0pct.png`);
          client.close();
          await closeTarget(targetId);
        }

        // 2. Scroll hint (fast-forward to stage 3 where scroll hint appears)
        {
          const { client, targetId } = await createClient(dev.width, dev.height, dev.mobile);
          await client.send('Page.navigate', { url: `${BASE_URL}/?${mode}=1` });
          await new Promise((r) => setTimeout(r, 400));

          // Trigger keyboard down to fast-forward intro timeline
          await client.send('Runtime.evaluate', {
            expression: `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))`,
          });
          // Wait for fast-forward to finish (~1.2s at 8x timescale)
          await new Promise((r) => setTimeout(r, 1400));
          await saveScreenshot(client, `p1-11_${dev.name}_${mode}_scroll_hint.png`);
          client.close();
          await closeTarget(targetId);
        }

        // 3. Scenario Select (scroll directly to #scenario-select, showing all 3 cards)
        {
          const { client, targetId } = await createClient(dev.width, dev.height, dev.mobile);
          await client.send('Page.navigate', { url: `${BASE_URL}/?${mode}=1` });
          await new Promise((r) => setTimeout(r, 600));

          await client.send('Runtime.evaluate', {
            awaitPromise: true,
            expression: `(async () => {
              const el = document.getElementById('scenario-select');
              el.scrollIntoView({ behavior: 'instant', block: 'start' });
              await new Promise(r => setTimeout(r, 800));
            })()`,
          });

          const cardsInfo = await client.send('Runtime.evaluate', {
            returnByValue: true,
            expression: `(() => {
              const cards = Array.from(document.querySelectorAll('.scenario-card-item')).map(c => ({
                title: c.querySelector('h3, h4')?.innerText,
                opacity: window.getComputedStyle(c).opacity,
                transform: window.getComputedStyle(c).transform,
              }));
              return cards;
            })()`,
          });
          console.log(`[${dev.name} ${mode}] Cards status:`, cardsInfo.result.value);

          await saveScreenshot(client, `p1-11_${dev.name}_${mode}_scenario_select.png`);
          client.close();
          await closeTarget(targetId);
        }

        // 4. /skip top and bottom
        {
          const { client, targetId } = await createClient(dev.width, dev.height, dev.mobile);
          await client.send('Page.navigate', { url: `${BASE_URL}/skip?${mode}=1` });
          await new Promise((r) => setTimeout(r, 800));

          // Top of /skip
          await saveScreenshot(client, `p1-11_${dev.name}_${mode}_skip_top.png`);

          // Scroll to bottom of /skip
          await client.send('Runtime.evaluate', {
            awaitPromise: true,
            expression: `(async () => {
              window.scrollTo(0, document.documentElement.scrollHeight);
              await new Promise(r => setTimeout(r, 600));
            })()`,
          });
          await saveScreenshot(client, `p1-11_${dev.name}_${mode}_skip_bottom.png`);

          client.close();
          await closeTarget(targetId);
        }
      }
    }

    console.log('\nAll P1-11 screenshots captured successfully!');
  } finally {
    console.log('Shutting down Chrome and Next.js server...');
    chromeProc.kill();
    nextServer.kill();
    await killPort(PORT);
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
