import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const runs = 3;
const targets = [
  { name: 'Home (/)', url: 'http://localhost:3000/' },
  { name: 'Skip (/skip)', url: 'http://localhost:3000/skip' },
  { name: 'Wanted (/wanted)', url: 'http://localhost:3000/wanted' },
  { name: 'True Ending (/true-ending)', url: 'http://localhost:3000/true-ending' }
];

const resultsDir = path.join('.lighthouse-results', 'p4-1-baseline');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

async function runLighthouseSuite() {
  console.log('====================================================');
  console.log(' STEP 1: LIGHTHOUSE MOBILE 3X AUDIT');
  console.log('====================================================');

  const summary = {};

  for (const target of targets) {
    console.log(`\nAuditing ${target.name} (${target.url})...`);
    const metrics = {
      perf: [],
      a11y: [],
      bp: [],
      seo: [],
      lcp: [],
      cls: [],
      tbt: [],
      inp: [],
      jsBytes: [],
      imageBytes: [],
      totalBytes: [],
      lcpBreakdowns: [],
      lcpElements: []
    };

    for (let i = 1; i <= runs; i++) {
      const outputPath = path.join(resultsDir, `${target.name.replace(/[^a-zA-Z0-9]/g, '_')}_run_${i}.json`);
      console.log(`  Run ${i}/${runs}...`);
      const cmd = `npx.cmd lighthouse ${target.url} --chrome-flags="--headless=new --no-sandbox --disable-extensions --incognito" --preset=experimental --form-factor=mobile --screenEmulation.mobile=true --throttling-method=simulate --output=json --output-path="${outputPath}" --quiet`;
      try {
        cp.execSync(cmd, { stdio: 'pipe' });
      } catch (err) {
        console.error(`  Error running lighthouse run ${i}:`, err.message);
      }

      if (fs.existsSync(outputPath)) {
        const data = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        const perf = Math.round((data.categories.performance?.score ?? 0) * 100);
        const a11y = Math.round((data.categories.accessibility?.score ?? 0) * 100);
        const bp = Math.round((data.categories['best-practices']?.score ?? 0) * 100);
        const seo = Math.round((data.categories.seo?.score ?? 0) * 100);
        const lcp = data.audits['largest-contentful-paint']?.numericValue ?? 0;
        const cls = data.audits['cumulative-layout-shift']?.numericValue ?? 0;
        const tbt = data.audits['total-blocking-time']?.numericValue ?? 0;
        const inp = data.audits['interactive']?.numericValue ?? 0;

        // Resource breakdown from network-requests
        const networkItems = data.audits['network-requests']?.details?.items ?? [];
        let jsBytes = 0;
        let imageBytes = 0;
        let totalBytes = 0;

        for (const item of networkItems) {
          totalBytes += item.transferSize || 0;
          if (item.resourceType === 'Script') {
            jsBytes += item.transferSize || 0;
          } else if (item.resourceType === 'Image') {
            imageBytes += item.transferSize || 0;
          }
        }

        // LCP Element & Breakdown
        const lcpElementItem = data.audits['largest-contentful-paint-element']?.details?.items?.[0]?.node;
        const lcpBreakdown = data.audits['largest-contentful-paint-breakdown']?.details?.items?.[0] || {};

        metrics.perf.push(perf);
        metrics.a11y.push(a11y);
        metrics.bp.push(bp);
        metrics.seo.push(seo);
        metrics.lcp.push(lcp);
        metrics.cls.push(cls);
        metrics.tbt.push(tbt);
        metrics.inp.push(inp);
        metrics.jsBytes.push(jsBytes);
        metrics.imageBytes.push(imageBytes);
        metrics.totalBytes.push(totalBytes);
        metrics.lcpBreakdowns.push(lcpBreakdown);
        if (lcpElementItem) metrics.lcpElements.push(lcpElementItem);

        console.log(`    Run ${i}: Perf=${perf}, LCP=${(lcp / 1000).toFixed(2)}s, CLS=${cls.toFixed(3)}, TBT=${Math.round(tbt)}ms, JS=${(jsBytes / 1024).toFixed(1)}KB, Img=${(imageBytes / 1024).toFixed(1)}KB`);
      }
    }

    summary[target.name] = {
      median: {
        performance: Math.round(median(metrics.perf)),
        accessibility: Math.round(median(metrics.a11y)),
        bestPractices: Math.round(median(metrics.bp)),
        seo: Math.round(median(metrics.seo)),
        lcpMs: Math.round(median(metrics.lcp)),
        lcpSec: (median(metrics.lcp) / 1000).toFixed(2) + 's',
        cls: Number(median(metrics.cls).toFixed(3)),
        tbtMs: Math.round(median(metrics.tbt)),
        jsBytes: Math.round(median(metrics.jsBytes)),
        jsKB: (median(metrics.jsBytes) / 1024).toFixed(1) + ' KB',
        imageBytes: Math.round(median(metrics.imageBytes)),
        imageKB: (median(metrics.imageBytes) / 1024).toFixed(1) + ' KB',
        totalKB: (median(metrics.totalBytes) / 1024).toFixed(1) + ' KB'
      },
      lcpElement: metrics.lcpElements[0] || null,
      lcpBreakdown: metrics.lcpBreakdowns[0] || null
    };
  }

  const summaryFile = path.join(resultsDir, 'baseline-summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log('\nAudit complete. Summary saved to:', summaryFile);
  return summary;
}

async function runCdpDiagnostics() {
  console.log('\n====================================================');
  console.log(' STEP 2 & 2b: CDP TRACE & FPS PROBE (4x CPU THROTTLE)');
  console.log('====================================================');

  const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = path.join(os.tmpdir(), `chrome-p41-diag-${Date.now()}`);
  const chromeProc = cp.spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--no-sandbox',
    '--disable-gpu',
    `--user-data-dir=${userDataDir}`,
  ]);

  await new Promise(r => setTimeout(r, 1200));

  try {
    const targetsRes = await fetch('http://localhost:9225/json/list');
    const targets = await targetsRes.json();
    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) throw new Error('No CDP page target');

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

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

    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const curId = ++id;
      callbacks.set(curId, { resolve, reject });
      ws.send(JSON.stringify({ id: curId, method, params }));
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Network.enable');
    await send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true
    });

    // Capture network requests
    const networkRequests = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.method === 'Network.responseReceived') {
        networkRequests.push({
          url: msg.params.response.url,
          mimeType: msg.params.response.mimeType,
          status: msg.params.response.status,
          headers: msg.params.response.headers
        });
      }
    });

    // Navigate to /
    console.log('Navigating to http://localhost:3000/ with 4x CPU throttle...');
    await send('Page.navigate', { url: 'http://localhost:3000/' });
    await new Promise(r => setTimeout(r, 2500));

    // Evaluate diagnostic data
    const diagData = await send('Runtime.evaluate', {
      expression: `(() => {
        const perf = window.performance;
        const nav = perf.getEntriesByType('navigation')[0] || {};
        const paints = perf.getEntriesByType('paint');
        const fcp = paints.find(p => p.name === 'first-contentful-paint')?.startTime || 0;
        const resources = perf.getEntriesByType('resource').map(r => ({
          name: r.name,
          type: r.initiatorType,
          duration: Math.round(r.duration),
          startTime: Math.round(r.startTime),
          size: r.transferSize || 0
        }));
        const fonts = resources.filter(r => r.name.includes('.woff2') || r.type === 'font');
        const scripts = resources.filter(r => r.name.includes('.js') || r.type === 'script');
        const styles = resources.filter(r => r.name.includes('.css') || r.type === 'css');
        return {
          fcp: Math.round(fcp),
          domInteractive: Math.round(nav.domInteractive || 0),
          domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
          fonts,
          scripts,
          styles
        };
      })()`,
      returnByValue: true
    });

    console.log('\n--- 2b DIAGNOSTIC: FCP & Font/Resource Timings on Mobile ---');
    console.log(`FCP: ${diagData.result.value.fcp}ms`);
    console.log(`domInteractive: ${diagData.result.value.domInteractive}ms`);
    console.log(`domContentLoaded: ${diagData.result.value.domContentLoaded}ms`);
    console.log(`Loaded Fonts (${diagData.result.value.fonts.length}):`);
    diagData.result.value.fonts.forEach((f, i) => {
      console.log(`  ${i+1}. ${f.name.split('/').pop()} (start: ${f.startTime}ms, duration: ${f.duration}ms, size: ${f.size}B)`);
    });
    console.log(`Loaded CSS files (${diagData.result.value.styles.length}):`);
    diagData.result.value.styles.forEach((s, i) => {
      console.log(`  ${i+1}. ${s.name.split('/').pop()} (start: ${s.startTime}ms, duration: ${s.duration}ms, size: ${s.size}B)`);
    });

    // FPS Probe through hero scrub and worlds
    console.log('\n--- 2. FPS PROBE DURING SCROLL (4x CPU THROTTLE) ---');
    const scrollFpsProbe = await send('Runtime.evaluate', {
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

        // Scroll down smoothly through stages 1 to 7 and worlds
        const maxScroll = document.body.scrollHeight - window.innerHeight;
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
          window.scrollTo(0, (maxScroll * i) / steps);
          await new Promise(r => setTimeout(r, 30));
        }

        running = false;
        await new Promise(r => setTimeout(r, 100));

        const slowFrames = frameTimes.filter(t => t > 20);
        const avgFrame = frameTimes.reduce((a, b) => a + b, 0) / (frameTimes.length || 1);
        const maxFrame = Math.max(...frameTimes);

        return {
          totalFrames: frameTimes.length,
          slowFramesCount: slowFrames.length,
          slowFramesSample: slowFrames.slice(0, 10).map(Math.round),
          avgFrameMs: Math.round(avgFrame * 10) / 10,
          maxFrameMs: Math.round(maxFrame),
          effectiveFps: Math.round(1000 / avgFrame)
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('Scroll FPS Probe Result:', scrollFpsProbe.result.value);

    ws.close();
    chromeProc.kill();

    return {
      diag: diagData.result.value,
      fps: scrollFpsProbe.result.value
    };
  } catch (err) {
    console.error('CDP Diag Error:', err);
    chromeProc.kill();
    return null;
  }
}

async function main() {
  const lighthouseSummary = await runLighthouseSuite();
  const cdpSummary = await runCdpDiagnostics();

  const finalOutput = {
    lighthouse: lighthouseSummary,
    cdp: cdpSummary
  };

  fs.writeFileSync(path.join(resultsDir, 'full-baseline.json'), JSON.stringify(finalOutput, null, 2));
  console.log('\nBaseline collection finished. JSON written to:', path.join(resultsDir, 'full-baseline.json'));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
