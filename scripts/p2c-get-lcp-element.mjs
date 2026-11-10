import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9251;

async function getLcpElement(url) {
  const userDataDir = path.join(os.tmpdir(), `chrome-p2c-lcp-${Date.now()}`);
  const chromeArgs = [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-sandbox',
    '--disable-extensions',
    `--user-data-dir=${userDataDir}`,
  ];

  const chromeProc = cp.spawn(CHROME_PATH, chromeArgs);
  await new Promise((r) => setTimeout(r, 1500));

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
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
  });

  await send('Page.navigate', { url });
  await new Promise((r) => setTimeout(r, 4000));

  const result = await send('Runtime.evaluate', {
    expression: `(() => {
      const entries = performance.getEntriesByType('largest-contentful-paint');
      if (!entries || entries.length === 0) return { error: 'No LCP entry' };
      const last = entries[entries.length - 1];
      const el = last.element;
      if (!el) return { url: last.url, size: last.size, startTime: last.startTime, tagName: null };
      return {
        url: last.url,
        size: last.size,
        startTime: last.startTime,
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        src: el.src || el.currentSrc,
        selector: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.trim().split(/\\s+/).join('.') : '')
      };
    })()`,
    returnByValue: true,
  });

  ws.close();
  chromeProc.kill();
  try {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  } catch {}

  return result.result?.value;
}

async function main() {
  const lcpA = await getLcpElement('http://127.0.0.1:3010/');
  const lcpB = await getLcpElement('http://127.0.0.1:3011/');

  console.log('\nApp A LCP (Mobile 390x844):', lcpA);
  console.log('App B LCP (Mobile 390x844):', lcpB);
  console.log('Match:', JSON.stringify(lcpA) === JSON.stringify(lcpB));
}

main().catch(console.error);

