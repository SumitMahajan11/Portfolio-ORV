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

async function captureSectionScreenshots() {
  console.log('\n==============================================');
  console.log('STEP 1: CAPTURING SECTION TINT SCREENSHOTS');
  console.log('==============================================');

  const screensDir = path.resolve('docs/proofs/screens');
  fs.mkdirSync(screensDir, { recursive: true });

  const userDataDir = path.join(os.tmpdir(), `chrome-tint-screen-${Date.now()}`);
  const chromeProc = cp.spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--no-sandbox',
    '--disable-gpu',
    `--user-data-dir=${userDataDir}`,
  ]);

  await new Promise((r) => setTimeout(r, 1500));

  const sections = [
    { id: 'hero-scene-container', name: 'hero_hub' },
    { id: 'scenario-select', name: 'scenario_select_hub' },
    { id: 'edge-cloud', name: 'edge_cloud_tint' },
    { id: 'ratify', name: 'raft_tint' },
    { id: 'iac-verifier', name: 'z3_tint' },
    { id: 'side-quests', name: 'side_quests_hub' },
    { id: 'readers-record', name: 'readers_record_hub' },
    { id: 'contact', name: 'contact_hub' },
  ];

  const devices = [
    { name: 'desktop', width: 1440, height: 900, mobile: false },
    { name: 'mobile', width: 390, height: 844, mobile: true },
  ];

  try {
    const targetsRes = await fetch('http://localhost:9224/json/list');
    const targets = await targetsRes.json();
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    if (!pageTarget) throw new Error('No page target found');

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');

    for (const dev of devices) {
      console.log(`\nCapturing on ${dev.name} (${dev.width}x${dev.height})...`);
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: dev.width,
        height: dev.height,
        deviceScaleFactor: dev.mobile ? 2 : 1,
        mobile: dev.mobile,
      });

      await client.send('Page.navigate', { url: `${BASE_URL}/` });
      // Allow dynamic imports and hydration to settle
      await new Promise((r) => setTimeout(r, 2500));

      for (const sec of sections) {
        await client.send('Runtime.evaluate', {
          expression: `(() => {
            const el = document.getElementById("${sec.id}");
            if (el) {
              el.scrollIntoView({ behavior: 'instant', block: 'center' });
            }
          })()`,
        });

        // Wait 900ms for 0.8s crossfade to settle completely
        await new Promise((r) => setTimeout(r, 900));

        const shot = await client.send('Page.captureScreenshot', { format: 'png' });
        const filename = `${dev.name}_section_${sec.name}.png`;
        const filePath = path.join(screensDir, filename);
        fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
        console.log(`  ✓ Saved: ${filename}`);
      }
    }

    client.close();
    chromeProc.kill();
  } catch (err) {
    console.error('Screenshot error:', err);
    chromeProc.kill();
    throw err;
  }
}

async function measureScrollFps(throttleCpu = 4) {
  console.log('\n==============================================');
  console.log(`STEP 2: MEASURING SCROLL FPS (${throttleCpu}x CPU THROTTLE MOBILE)`);
  console.log('==============================================');

  const userDataDir = path.join(os.tmpdir(), `chrome-tint-fps-${Date.now()}`);
  const chromeProc = cp.spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--no-sandbox',
    '--disable-gpu',
    `--user-data-dir=${userDataDir}`,
  ]);

  await new Promise((r) => setTimeout(r, 1500));

  try {
    const targetsRes = await fetch('http://localhost:9225/json/list');
    const targets = await targetsRes.json();
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    if (!pageTarget) throw new Error('No page target found');

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setCPUThrottlingRate', { rate: throttleCpu });
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    await client.send('Page.navigate', { url: `${BASE_URL}/` });
    await new Promise((r) => setTimeout(r, 2500));

    console.log('Scrubbing document scroll through all sections and measuring frame times...');
    const fpsProbe = await client.send('Runtime.evaluate', {
      expression: `(async () => {
        const frameTimes = [];
        let lastTime = performance.now();
        let running = true;

        const loop = (t) => {
          const delta = t - lastTime;
          lastTime = t;
          frameTimes.push(delta);
          if (running) requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);

        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const steps = 90;
        for (let i = 0; i <= steps; i++) {
          window.scrollTo(0, (maxScroll * i) / steps);
          await new Promise(r => setTimeout(r, 25)); // Continuous scroll scrub
        }

        running = false;
        await new Promise(r => setTimeout(r, 100));

        const avgFrame = frameTimes.reduce((a, b) => a + b, 0) / (frameTimes.length || 1);
        const slowFrames = frameTimes.filter(t => t > 20); // > 50fps threshold
        const fps = Math.round(1000 / avgFrame);

        return {
          totalFrames: frameTimes.length,
          avgFrameMs: Math.round(avgFrame * 10) / 10,
          slowFramesCount: slowFrames.length,
          effectiveFps: fps
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });

    const result = fpsProbe.result.value;
    console.log('Mobile Throttled Scroll FPS Result:', result);

    client.close();
    chromeProc.kill();
    return result;
  } catch (err) {
    console.error('FPS error:', err);
    chromeProc.kill();
    throw err;
  }
}

async function runLighthouseMobile() {
  console.log('\n==============================================');
  console.log('STEP 3: RUNNING LIGHTHOUSE MOBILE (COMMIT CURRENT)');
  console.log('==============================================');

  const proofsDir = path.resolve('docs/proofs');
  fs.mkdirSync(proofsDir, { recursive: true });
  const outputPath = path.join(proofsDir, 'lighthouse-wall-w2-mobile.json');

  const cmd = `npx.cmd --yes lighthouse ${BASE_URL}/ --chrome-flags="--headless=new --no-sandbox --disable-extensions --incognito" --preset=experimental --form-factor=mobile --screenEmulation.mobile=true --throttling-method=simulate --output=json --output-path="${outputPath}" --quiet`;

  cp.execSync(cmd, { stdio: 'inherit' });
  const data = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  const perf = Math.round((data.categories.performance?.score ?? 0) * 100);
  const lcp = data.audits['largest-contentful-paint']?.numericValue ?? 0;
  const cls = data.audits['cumulative-layout-shift']?.numericValue ?? 0;
  const tbt = data.audits['total-blocking-time']?.numericValue ?? 0;

  const result = {
    perf,
    lcpMs: Math.round(lcp),
    lcpSec: (lcp / 1000).toFixed(2) + 's',
    cls: Number(cls.toFixed(3)),
    tbtMs: Math.round(tbt),
  };
  console.log('Lighthouse Mobile Result (Current Commit):', result);
  return result;
}

async function main() {
  await captureSectionScreenshots();
  const fpsResult = await measureScrollFps(4);
  const lhResult = await runLighthouseMobile();

  console.log('\n==============================================');
  console.log('MEASUREMENT COMPLETE SUMMARY');
  console.log('==============================================');
  console.log('Scroll FPS (4x CPU Throttled Mobile):', fpsResult);
  console.log('Lighthouse Mobile:', lhResult);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
