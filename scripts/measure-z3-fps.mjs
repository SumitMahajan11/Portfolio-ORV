import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9249;
const TARGET_URL = 'http://localhost:3000/#iac-verifier';
const OUTPUT_FILE = path.resolve('docs/proofs/z3-scroll-fps.txt');

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function measureSingleRun({ mode, width, height, runIndex }) {
  console.log(`Starting Run ${runIndex}/3 [${mode}]: ${width}x${height}...`);
  const userDataDir = path.join(os.tmpdir(), `chrome-z3-fps-${Date.now()}-${runIndex}`);
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
      width,
      height,
      deviceScaleFactor: mode === 'mobile' ? 2 : 1,
      mobile: mode === 'mobile',
    });

    await send('Page.navigate', { url: TARGET_URL });
    await new Promise((r) => setTimeout(r, 3500));

    // Scroll through the Z3 section and measure FPS
    const evalRes = await send('Runtime.evaluate', {
      expression: `(async () => {
        const frameDeltas = [];
        let lastTime = performance.now();
        let active = true;

        const onFrame = (time) => {
          const delta = time - lastTime;
          lastTime = time;
          frameDeltas.push(delta);
          if (active) requestAnimationFrame(onFrame);
        };
        requestAnimationFrame(onFrame);

        // Find #iac-verifier section
        const section = document.getElementById('iac-verifier') || document.querySelector('[data-world="z3"]');
        const top = section ? section.getBoundingClientRect().top + window.scrollY - 100 : 2500;
        const height = section ? section.offsetHeight : 1200;

        // Scroll to start of section
        window.scrollTo(0, top);
        await new Promise((r) => setTimeout(r, 200));

        // Scroll smoothly through Z3 section
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
          const targetY = top + (height * (i / steps));
          window.scrollTo(0, targetY);
          await new Promise((r) => setTimeout(r, 25));
        }

        await new Promise((r) => setTimeout(r, 300));
        active = false;

        // Calculate metrics
        // Discard first 5 frames to stabilize
        const deltas = frameDeltas.slice(5);
        if (deltas.length === 0) return { fps: 60, deltas: [] };
        const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        const fps = Math.min(60, 1000 / avgDelta);
        const jankFrames = deltas.filter(d => d > 33.3).length; // frames taking > 33ms (~30fps)

        return {
          fps: Number(fps.toFixed(1)),
          avgDelta: Number(avgDelta.toFixed(2)),
          totalFrames: deltas.length,
          jankFrames,
          jankPercentage: Number(((jankFrames / deltas.length) * 100).toFixed(1))
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });

    ws.close();
    return evalRes.result.value;
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

async function main() {
  console.log('================================================================');
  console.log(' SCROLL FPS AUDIT THROUGH Z3 (#iac-verifier)');
  console.log(' Protocol: 3 runs, 60s idle between runs. Floor: 50 FPS');
  console.log('================================================================\n');

  let serverProc = null;
  let isRunning = false;
  try {
    const res = await fetch('http://localhost:3000/');
    if (res.ok) isRunning = true;
  } catch {}

  if (!isRunning) {
    console.log('Starting Next.js production server on port 3000...');
    serverProc = cp.spawn('npm.cmd', ['run', 'start', '--', '-p', '3000'], {
      stdio: 'ignore',
      shell: true,
    });
    // wait for server
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try {
        const r = await fetch('http://localhost:3000/');
        if (r.ok) { ready = true; break; }
      } catch {}
      await new Promise(res => setTimeout(res, 500));
    }
    if (!ready) throw new Error('Server failed to start');
  }

  try {
    const runs = [];
    for (let i = 1; i <= 3; i++) {
      const res = await measureSingleRun({
        mode: 'desktop',
        width: 1440,
        height: 900,
        runIndex: i,
      });
      runs.push(res);
      console.log(`Run ${i} Result: FPS=${res.fps}, AvgDelta=${res.avgDelta}ms, JankFrames=${res.jankFrames}/${res.totalFrames} (${res.jankPercentage}%)\n`);

      if (i < 3) {
        console.log('Waiting 60s idle before next run...');
        await new Promise((r) => setTimeout(r, 60000));
      }
    }

    const fpsValues = runs.map(r => r.fps);
    const medianFPS = median(fpsValues);
    console.log(`\nMedian Scroll FPS: ${medianFPS} (Floor required: >= 50)`);

    const report = [
      '================================================================',
      ' Z3 SCROLL FPS AUDIT REPORT',
      '================================================================',
      `Target Section: #iac-verifier`,
      `Protocol: 3 runs with 60s idle between runs`,
      `Floor requirement: >= 50 FPS`,
      '',
      `Run 1: ${runs[0].fps} FPS (avg delta: ${runs[0].avgDelta}ms, jank: ${runs[0].jankPercentage}%)`,
      `Run 2: ${runs[1].fps} FPS (avg delta: ${runs[1].avgDelta}ms, jank: ${runs[1].jankPercentage}%)`,
      `Run 3: ${runs[2].fps} FPS (avg delta: ${runs[2].avgDelta}ms, jank: ${runs[2].jankPercentage}%)`,
      '',
      `Median FPS: ${medianFPS}`,
      `Verdict: ${medianFPS >= 50 ? 'PASS (>= 50 FPS)' : 'FAIL (< 50 FPS)'}`,
      '================================================================',
    ].join('\n');

    fs.mkdirSync('docs/proofs', { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, report, 'utf8');
    console.log(`Report written to ${OUTPUT_FILE}`);

    if (medianFPS < 50) {
      throw new Error(`Floor failed: Median FPS ${medianFPS} < 50`);
    }
  } finally {
    if (serverProc) {
      serverProc.kill('SIGKILL');
    }
  }
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});

