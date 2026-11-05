import cp from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function findChromePath() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Chrome executable not found');
}

async function run() {
  const serverPort = 3008;
  console.log('====================================================');
  console.log(`STARTING ACCESSIBILITY AUDIT ON PORT ${serverPort}`);
  console.log('====================================================\n');

  console.log(`Starting fresh production server on port ${serverPort}...`);
  const serverProc = cp.spawn('cmd.exe', ['/c', `npx next start -p ${serverPort}`], { stdio: 'pipe' });

  let serverReady = false;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try {
      const res = await get(`http://localhost:${serverPort}/`);
      if (res.status === 200) {
        serverReady = true;
        break;
      }
    } catch {
      // Retry
    }
  }

  if (!serverReady) {
    console.error(`Failed to start server on port ${serverPort}`);
    serverProc.kill();
    process.exit(1);
  }

  console.log('Production server ready.');

  const targets = [
    { name: 'Home (/)', url: `http://localhost:${serverPort}/` },
    { name: 'Skip (/skip)', url: `http://localhost:${serverPort}/skip` },
    { name: 'Wanted/404 (/wanted)', url: `http://localhost:${serverPort}/wanted` }
  ];

  const axeScriptPath = path.resolve('node_modules/axe-core/axe.min.js');
  const axeSource = fs.readFileSync(axeScriptPath, 'utf8');

  const chromePath = await findChromePath();
  const cdpPort = 9228;
  const userDataDir = path.join(process.env.TEMP || '.', `chrome-a11y-audit-${Date.now()}`);

  const chrome = cp.spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check'
  ]);

  await sleep(1500);

  const targetsRes = await fetch(`http://localhost:${cdpPort}/json/list`);
  const pages = await targetsRes.json();
  const pageTarget = pages.find(p => p.type === 'page');
  if (!pageTarget) throw new Error('No CDP page target found');

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let idCounter = 1;
  const pendingRequests = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, reject } = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  };

  function sendCdp(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await sendCdp('Page.enable');
  await sendCdp('DOM.enable');
  await sendCdp('Runtime.enable');

  const auditReport = {};

  for (const t of targets) {
    console.log(`\n========================================`);
    console.log(`Auditing ${t.name}: ${t.url}`);
    console.log(`========================================`);

    // 1. Navigate
    await sendCdp('Page.navigate', { url: t.url });
    await sleep(2500);

    // 2. Inject axe-core
    await sendCdp('Runtime.evaluate', { expression: axeSource });
    await sleep(500);

    // 3. Run axe.run()
    const axeResult = await sendCdp('Runtime.evaluate', {
      expression: `axe.run().then(results => JSON.stringify({
        violations: results.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          nodes: v.nodes.map(n => ({
            html: n.html,
            target: n.target,
            failureSummary: n.failureSummary
          }))
        })),
        passesCount: results.passes.length,
        incompleteCount: results.incomplete.length,
        inapplicableCount: results.inapplicable.length
      }))`,
      awaitPromise: true,
      returnByValue: true
    });

    const parsedAxe = JSON.parse(axeResult.result.value);
    console.log(`\n--- AXE SCAN RESULTS for ${t.name} ---`);
    console.log(`Violations: ${parsedAxe.violations.length}`);
    console.log(`Passes: ${parsedAxe.passesCount}`);
    console.log(`Incomplete: ${parsedAxe.incompleteCount}`);

    if (parsedAxe.violations.length > 0) {
      console.log('\nVIOLATIONS FOUND:');
      for (const v of parsedAxe.violations) {
        console.log(`\n  [${v.impact?.toUpperCase()}] ${v.id}: ${v.help}`);
        console.log(`   Description: ${v.description}`);
        for (const n of v.nodes.slice(0, 3)) {
          console.log(`   Target: ${n.target.join(' ')}`);
          console.log(`   HTML: ${n.html.slice(0, 100)}`);
          console.log(`   Fix: ${n.failureSummary?.slice(0, 150)}`);
        }
      }
    } else {
      console.log('>>> NO ACCESSIBILITY VIOLATIONS FOUND BY AXE-CORE! <<<');
    }

    // 4. Run Lighthouse Accessibility audit via CLI
    console.log(`\n--- LIGHTHOUSE ACCESSIBILITY CLI for ${t.name} ---`);
    const lhOutput = path.join(userDataDir, `lh-${t.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    const lhCmd = `npx.cmd lighthouse ${t.url} --only-categories=accessibility --chrome-flags="--headless=new --no-sandbox" --output=json --output-path="${lhOutput}" --quiet`;
    try {
      cp.execSync(lhCmd, { stdio: 'pipe' });
      const lhJson = JSON.parse(fs.readFileSync(lhOutput, 'utf8'));
      const score = Math.round(lhJson.categories.accessibility.score * 100);
      console.log(`Lighthouse Accessibility Score: ${score}/100`);

      const failedAudits = Object.values(lhJson.audits).filter(a => a.score !== null && a.score < 1 && a.details);
      if (failedAudits.length > 0) {
        console.log(`Failed Audits:`);
        for (const fa of failedAudits) {
          console.log(`  - ${fa.id}: ${fa.title} (score: ${fa.score})`);
          console.log(`    ${fa.description?.slice(0, 120)}`);
        }
      } else {
        console.log('>>> 100% OF LIGHTHOUSE ACCESSIBILITY AUDITS PASSED! <<<');
      }

      auditReport[t.name] = {
        axe: parsedAxe,
        lighthouseScore: score,
        lighthouseFailedAudits: failedAudits.map(a => ({ id: a.id, title: a.title, score: a.score }))
      };
    } catch (lhErr) {
      console.error('Lighthouse execution error:', lhErr.message);
      auditReport[t.name] = {
        axe: parsedAxe,
        lighthouseScore: null,
        error: lhErr.message
      };
    }
  }

  // Cleanup
  ws.close();
  chrome.kill();
  serverProc.kill();
  try {
    cp.execSync(`cmd.exe /c "taskkill /F /PID ${serverProc.pid} 2>nul"`);
  } catch {
    // Process already terminated
  }

  console.log('\n========================================');
  console.log('AUDIT COMPLETE. SUMMARY:');
  console.log(JSON.stringify(auditReport, null, 2));
  console.log('========================================\n');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
