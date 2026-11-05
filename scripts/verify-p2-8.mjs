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

async function waitReady(url, maxWaitMs = 15000) {
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

async function main() {
  console.log('====================================================');
  console.log(' PHASE 2 GATE VERIFICATION SUITE');
  console.log('====================================================\n');

  const screensDir = path.resolve('docs/proofs/screens/phase2');
  fs.mkdirSync(screensDir, { recursive: true });

  await waitReady(BASE_URL);
  console.log('Production server verified ready at ' + BASE_URL);

  const userDataDir = path.join(os.tmpdir(), `chrome-p28-${Date.now()}`);
  const chromeProc = cp.spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--no-sandbox',
    '--disable-gpu',
    `--user-data-dir=${userDataDir}`,
  ]);

  try {
    await waitReady('http://localhost:9223/json/version');
    console.log('Chrome remote debugging ready on port 9223.');

    const targetsRes = await fetch('http://localhost:9223/json/list');
    const targets = await targetsRes.json();
    const pageTarget = targets.find((t) => t.type === 'page');

    if (!pageTarget) {
      throw new Error('No page target found');
    }

    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    console.log('Connected to CDP.');

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');

    const results = {
      worlds: {},
      modes: {},
      scrollTriggers: {},
    };

    // Helper: evaluate expression
    const evaluate = async (expr) => {
      const res = await cdp.send('Runtime.evaluate', {
        expression: expr,
        returnByValue: true,
        awaitPromise: true,
      });
      return res.result?.value;
    };

    // 1. DESKTOP FULL MODE AUDIT
    console.log('\n--- 1. Desktop Viewport Audit (1920x1080) ---');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await cdp.send('Page.navigate', { url: BASE_URL });
    await new Promise((r) => setTimeout(r, 2000));

    // Check all sections exist
    const desktopSections = await evaluate(`({
      hero: !!document.querySelector('#hero-scene'),
      scenarioSelect: !!document.querySelector('#scenario-select'),
      edgeCloud: !!document.querySelector('#edge-cloud'),
      raft: !!document.querySelector('#ratify'),
      z3: !!document.querySelector('#iac-verifier'),
      sideQuests: !!document.querySelector('#side-quests'),
      readersRecord: !!document.querySelector('#readers-record'),
      constellationOverlay: !!document.querySelector('[role="status"]'),
      raftLimitNotice: !!document.body.innerText.includes('3-node, correctness project, not a performance benchmark.'),
      z3Claim: !!document.body.innerText.includes('103 passing tests'),
      edgeCloudClaim: !!document.body.innerText.includes('carbon-aware workload routing across edge and cloud.'),
    })`);
    console.log('Desktop Sections Check:', desktopSections);
    results.worlds.desktop = desktopSections;

    // Check ScrollTrigger count
    const desktopSTCount = await evaluate(`window.ScrollTrigger ? window.ScrollTrigger.getAll().length : 0`);
    console.log('Desktop Active ScrollTriggers:', desktopSTCount);
    results.scrollTriggers.desktop = desktopSTCount;

    // Capture desktop screenshot
    const shot1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(screensDir, 'desktop-full.png'), Buffer.from(shot1.data, 'base64'));

    // 2. MOBILE VIEWPORT AUDIT (390x844)
    console.log('\n--- 2. Mobile Viewport Audit (390x844) ---');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    await cdp.send('Page.navigate', { url: BASE_URL });
    await new Promise((r) => setTimeout(r, 2000));

    const mobileSections = await evaluate(`({
      hero: !!document.querySelector('#hero-scene'),
      scenarioSelect: !!document.querySelector('#scenario-select'),
      edgeCloud: !!document.querySelector('#edge-cloud'),
      raft: !!document.querySelector('#ratify'),
      z3: !!document.querySelector('#iac-verifier'),
      sideQuests: !!document.querySelector('#side-quests'),
      readersRecord: !!document.querySelector('#readers-record'),
      raftLimitVisible: !!document.body.innerText.includes('3-node, correctness project, not a performance benchmark.'),
    })`);
    console.log('Mobile Sections Check:', mobileSections);
    results.worlds.mobile = mobileSections;

    const shot2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(screensDir, 'mobile-full.png'), Buffer.from(shot2.data, 'base64'));

    // Scroll to Raft World on mobile and capture
    await evaluate(`document.querySelector('#ratify')?.scrollIntoView()`);
    await new Promise((r) => setTimeout(r, 1000));
    const shotRaft = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(screensDir, 'mobile-raft.png'), Buffer.from(shotRaft.data, 'base64'));

    // Scroll to Z3 World on mobile and capture
    await evaluate(`document.querySelector('#iac-verifier')?.scrollIntoView()`);
    await new Promise((r) => setTimeout(r, 1000));
    const shotZ3 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(screensDir, 'mobile-z3.png'), Buffer.from(shotZ3.data, 'base64'));

    // Scroll to Reader's Record on mobile and capture
    await evaluate(`document.querySelector('#readers-record')?.scrollIntoView()`);
    await new Promise((r) => setTimeout(r, 1000));
    const shotSkills = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(screensDir, 'mobile-skills.png'), Buffer.from(shotSkills.data, 'base64'));

    // 3. REDUCED MOTION AUDIT
    console.log('\n--- 3. Reduced Motion Audit ---');
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });

    await cdp.send('Page.navigate', { url: BASE_URL });
    await new Promise((r) => setTimeout(r, 2000));

    const reducedChecks = await evaluate(`({
      edgeCloudStaticDiagram: !!document.querySelector('[aria-label*="Edge-Cloud Static Star-Network Routing Diagram"]'),
      raftStaticDiagram: !!document.querySelector('[aria-label*="Deterministic 5-Step Raft Visualizer"]'),
      z3StaticDiagram: !!document.querySelector('[aria-label*="Deterministic 4-Step Z3 Reachability"]'),
    })`);
    console.log('Reduced Motion Fallbacks Check:', reducedChecks);
    results.modes.reduced = reducedChecks;

    const shotReduced = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(screensDir, 'reduced-motion.png'), Buffer.from(shotReduced.data, 'base64'));

    // 4. LIGHT MODE AUDIT
    console.log('\n--- 4. Light Mode Audit ---');
    // Clear reduced motion
    await cdp.send('Emulation.setEmulatedMedia', { features: [] });
    // Set motion_mode to light in sessionStorage
    await cdp.send('Page.navigate', { url: BASE_URL });
    await evaluate(`sessionStorage.setItem("motion_mode", "light")`);
    await cdp.send('Page.navigate', { url: BASE_URL });
    await new Promise((r) => setTimeout(r, 2000));

    const lightChecks = await evaluate(`({
      edgeCloudStaticDiagram: !!document.querySelector('[aria-label*="Edge-Cloud Static Star-Network Routing Diagram"]'),
      raftStaticDiagram: !!document.querySelector('[aria-label*="Deterministic 5-Step Raft Visualizer"]'),
      z3StaticDiagram: !!document.querySelector('[aria-label*="Deterministic 4-Step Z3 Reachability"]'),
    })`);
    console.log('Light Mode Static Fallbacks Check:', lightChecks);
    results.modes.light = lightChecks;

    const shotLight = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(screensDir, 'light-mode.png'), Buffer.from(shotLight.data, 'base64'));

    // 5. SKIP PAGE AUDIT
    console.log('\n--- 5. Skip Page Audit (/skip) ---');
    await cdp.send('Page.navigate', { url: `${BASE_URL}/skip` });
    await new Promise((r) => setTimeout(r, 1500));

    const skipChecks = await evaluate(`({
      h1: document.querySelector('h1')?.innerText,
      hasEdgeCloud: !!document.body.innerText.includes('Edge-Cloud Orchestrator'),
      hasRaft: !!document.body.innerText.includes('Ratify'),
      hasRaftLimit: !!document.body.innerText.includes('3-node, correctness project, not a performance benchmark.'),
      hasZ3: !!document.body.innerText.includes('iac-verifier'),
      hasSkills: !!document.body.innerText.includes("Reader's Record"),
      hasPrivacyStatement: !!document.body.innerText.includes('no personal email address'),
    })`);
    console.log('Skip Page Check:', skipChecks);
    results.worlds.skip = skipChecks;

    const shotSkip = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(screensDir, 'skip-page.png'), Buffer.from(shotSkip.data, 'base64'));

    cdp.close();

    const reportPath = path.resolve('docs/proofs/phase2-verification-data.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log('\nVerification suite completed successfully. Data saved to ' + reportPath);
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});

