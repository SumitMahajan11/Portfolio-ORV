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
  const serverPort = 3009;
  console.log(`Starting production server on port ${serverPort}...`);
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

  console.log('Production server ready on port', serverPort);

  const chromePath = await findChromePath();
  const cdpPort = 9229;
  const userDataDir = path.join(process.env.TEMP || '.', `chrome-truth-audit-${Date.now()}`);

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

  const routes = [
    { path: '/', name: 'Home' },
    { path: '/skip', name: 'Skip Mode' },
    { path: '/wanted', name: 'Wanted (404)' },
    { path: '/true-ending', name: 'True Ending (404)' }
  ];

  const results = {};

  for (const r of routes) {
    const url = `http://localhost:${serverPort}${r.path}`;
    console.log(`\nNavigating to ${r.name} (${url})...`);
    await sendCdp('Page.navigate', { url });
    await sleep(2000);

    const extracted = await sendCdp('Runtime.evaluate', {
      expression: `(() => {
        const text = document.body.innerText;
        const html = document.documentElement.outerHTML;

        // Meta tags
        const metaTags = [];
        document.querySelectorAll('meta').forEach(m => {
          metaTags.push({
            name: m.getAttribute('name'),
            property: m.getAttribute('property'),
            content: m.getAttribute('content')
          });
        });

        // JSON-LD
        const jsonLd = [];
        document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
          try {
            jsonLd.push(JSON.parse(s.textContent));
          } catch (e) {
            jsonLd.push(s.textContent);
          }
        });

        // Images alt text
        const images = [];
        document.querySelectorAll('img').forEach(img => {
          images.push({
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt')
          });
        });

        // Title
        const title = document.title;

        return {
          title,
          text,
          htmlLength: html.length,
          metaTags,
          jsonLd,
          images
        };
      })()`,
      returnByValue: true
    });

    results[r.path] = extracted.result.value;
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

  fs.writeFileSync('scripts/truth-audit-data.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('\nData saved to scripts/truth-audit-data.json');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
