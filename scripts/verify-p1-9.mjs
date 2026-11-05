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
    this.eventListeners = new Map();
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
      } else if (msg.method) {
        const list = this.eventListeners.get(msg.method) || [];
        for (const fn of list) {
          fn(msg.params);
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

  on(event, fn) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(fn);
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function waitServerReady(url, maxWaitMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // wait
    }
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
  console.log('====================================================');
  console.log(' P1-9 VERIFICATION SUITE (CDP & LIGHTHOUSE AUDITS)');
  console.log('====================================================\n');

  // Ensure output directories exist
  const screensDir = path.resolve('docs/proofs/screens');
  fs.mkdirSync(screensDir, { recursive: true });

  const lhDir = path.resolve('.lighthouse-results');
  fs.mkdirSync(lhDir, { recursive: true });

  await killPort(PORT);
  await new Promise((r) => setTimeout(r, 1000));

  // 1. Start Next.js production server
  console.log('[1/5] Starting Next.js production server on port ' + PORT + '...');
  const nextServer = cp.spawn('npx.cmd', ['next', 'start', '-p', String(PORT)], {
    stdio: 'inherit',
    shell: true,
  });

  // 2. Start Headless Chrome
  console.log('[2/5] Starting Headless Chrome with remote debugging on port 9222...');
  const userDataDir = path.join(os.tmpdir(), `chrome-p19-${Date.now()}`);
  const chromeProc = cp.spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    `--user-data-dir=${userDataDir}`,
  ]);

  try {
    await waitServerReady(BASE_URL);
    console.log('Next.js server is ready at ' + BASE_URL);

    await waitServerReady('http://localhost:9222/json/version');
    console.log('Chrome remote debugging is ready.');

    async function createPageClient() {
      const targetRes = await fetch('http://localhost:9222/json/new?about:blank', {
        method: 'PUT',
      });
      const target = await targetRes.json();
      const client = new CDPClient(target.webSocketDebuggerUrl);
      await client.connect();
      await client.send('Page.enable');
      await client.send('Runtime.enable');
      return { client, targetId: target.id };
    }

    async function closeTarget(targetId) {
      try {
        await fetch(`http://localhost:9222/json/close/${targetId}`);
      } catch {}
    }

    // ---------------------------------------------------------------
    // AUDIT 1: PARTICLE CAPS & FPS MEASUREMENT (Desktop 120 particles)
    // ---------------------------------------------------------------
    console.log('\n--- 1. Testing Particle Caps & Measuring FPS (Desktop @ 4x CPU throttle) ---');
    {
      const { client, targetId } = await createPageClient();
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        mobile: false,
      });
      // 4x CPU throttling
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

      await client.send('Page.navigate', { url: `${BASE_URL}/?full=1` });
      await new Promise((r) => setTimeout(r, 2500));

      const particleEval = await client.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
          const particles = document.querySelectorAll('[data-layer="particles"] span');
          return particles.length;
        })()`,
      });
      const renderedParticles = particleEval.result.value;
      console.log(`Rendered particles count in DOM: ${renderedParticles}`);

      // Run FPS measurement probe for 180 frames (~3 seconds)
      const fpsEval = await client.send('Runtime.evaluate', {
        awaitPromise: true,
        returnByValue: true,
        expression: `new Promise((resolve) => {
          const frameTimes = [];
          let lastTime = performance.now();
          let count = 0;
          const targetFrames = 180;

          function tick(now) {
            const delta = now - lastTime;
            lastTime = now;
            frameTimes.push(delta);
            count++;
            if (count < targetFrames) {
              requestAnimationFrame(tick);
            } else {
              const samples = frameTimes.slice(5);
              const avgDelta = samples.reduce((a, b) => a + b, 0) / samples.length;
              const fps = 1000 / avgDelta;
              const maxDelta = Math.max(...samples);
              const drops = samples.filter(d => d > 20).length;
              resolve({
                avgDelta: Number(avgDelta.toFixed(2)),
                fps: Number(fps.toFixed(1)),
                maxDelta: Number(maxDelta.toFixed(2)),
                drops,
                totalSamples: samples.length
              });
            }
          }
          requestAnimationFrame(tick);
        })`,
      });

      console.log('FPS Measurement at 4x CPU Throttle:', fpsEval.result.value);
      client.close();
      await closeTarget(targetId);
    }

    // ---------------------------------------------------------------
    // AUDIT 2: TRANSFERRED JS BUNDLE SIZES ("/" vs "/skip")
    // ---------------------------------------------------------------
    console.log('\n--- 2. Transferred JS Bundle Measurement via Modern Chrome Network ---');
    for (const route of ['/', '/skip']) {
      const { client, targetId } = await createPageClient();
      await client.send('Network.enable');
      await client.send('Network.clearBrowserCache');

      const requests = new Map();
      client.on('Network.responseReceived', (params) => {
        const url = params.response.url;
        if (url.includes('/_next/static/') && url.endsWith('.js')) {
          requests.set(params.requestId, {
            url,
            file: path.basename(url),
            mimeType: params.response.mimeType,
            contentEncoding: params.response.headers['content-encoding'] || 'identity',
          });
        }
      });

      const finishedResponses = [];
      client.on('Network.loadingFinished', (params) => {
        if (requests.has(params.requestId)) {
          const req = requests.get(params.requestId);
          req.encodedDataLength = params.encodedDataLength;
          finishedResponses.push(req);
        }
      });

      await client.send('Page.navigate', { url: `${BASE_URL}${route}` });
      await new Promise((r) => setTimeout(r, 2500));

      console.log(`\nResults for route "${route}":`);
      let totalTransferred = 0;
      for (const item of finishedResponses) {
        totalTransferred += item.encodedDataLength;
      }
      finishedResponses.sort((a, b) => b.encodedDataLength - a.encodedDataLength);

      console.log(`Total JS Files Transferred: ${finishedResponses.length}`);
      console.log(`Total Transferred Size: ${(totalTransferred / 1024).toFixed(2)} KB`);
      console.log('Top 3 Largest Transferred Chunks:');
      finishedResponses.slice(0, 3).forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.file}: ${(item.encodedDataLength / 1024).toFixed(2)} KB transferred`);
      });

      const gsapChunks = finishedResponses.filter(
        (item) => item.file.includes('gsap') || item.url.includes('gsap') || item.file.startsWith('952-')
      );
      console.log(`GSAP/Animation Chunks transferred on ${route}: ${gsapChunks.length}`);

      console.log(`All JS chunks transferred for ${route}:`);
      finishedResponses.forEach((item) => {
        console.log(`  - ${item.file} (${(item.encodedDataLength / 1024).toFixed(2)} KB)`);
      });

      client.close();
      await closeTarget(targetId);
    }

    // ---------------------------------------------------------------
    // AUDIT 3: DEVICE CHECKS (390x844 and 360x740) & SCREENSHOTS
    // ---------------------------------------------------------------
    console.log('\n--- 3. Device Checks (390x844 & 360x740) & Proof Screenshots ---');
    const devices = [
      { name: '390x844', width: 390, height: 844 },
      { name: '360x740', width: 360, height: 740 },
    ];
    const scrollPercentages = [0, 25, 50, 75, 100];

    for (const dev of devices) {
      console.log(`\nEvaluating device ${dev.name}...`);
      const { client, targetId } = await createPageClient();
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: dev.width,
        height: dev.height,
        deviceScaleFactor: 2,
        mobile: true,
      });

      await client.send('Page.navigate', { url: `${BASE_URL}/` });
      await new Promise((r) => setTimeout(r, 2000));

      for (const pct of scrollPercentages) {
        const checkEval = await client.send('Runtime.evaluate', {
          awaitPromise: true,
          returnByValue: true,
          expression: `(async () => {
            const maxScroll = Math.max(
              document.documentElement.scrollHeight - window.innerHeight,
              1
            );
            const targetY = Math.round(maxScroll * (${pct} / 100));
            window.scrollTo(0, targetY);
            await new Promise(r => setTimeout(r, 400));
            return {
              scrollWidth: document.documentElement.scrollWidth,
              clientWidth: document.documentElement.clientWidth,
              scrollY: window.scrollY
            };
          })()`,
        });

        const { scrollWidth, clientWidth } = checkEval.result.value;
        const isEqual = scrollWidth === clientWidth;
        console.log(
          `  [${dev.name} @ ${pct}% scroll] scrollWidth: ${scrollWidth}px, clientWidth: ${clientWidth}px -> ${
            isEqual ? 'EQUAL (PASS)' : 'OVERFLOW MISMATCH (FAIL)'
          }`
        );

        const screenshot = await client.send('Page.captureScreenshot', { format: 'png' });
        const filePath = path.join(screensDir, `screen_${dev.name}_scroll_${pct}pct.png`);
        fs.writeFileSync(filePath, Buffer.from(screenshot.data, 'base64'));
      }

      client.close();
      await closeTarget(targetId);
    }
    console.log(`\nAll 10 device screenshots successfully saved to ${screensDir}`);

  } finally {
    console.log('\nShutting down Chrome and Next.js server...');
    chromeProc.kill();
    nextServer.kill();
    await killPort(PORT);
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
