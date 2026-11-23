import cp from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9268;

async function debugNoise() {
  const userDataDir = path.join(os.tmpdir(), `chrome-debug-noise-${Date.now()}`);
  const proc = cp.spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-sandbox',
    '--disable-extensions',
    `--user-data-dir=${userDataDir}`,
  ]);
  await new Promise((r) => setTimeout(r, 1500));
  const t = await (await fetch(`http://localhost:${CDP_PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const send = (m, p = {}) =>
    new Promise((res) => {
      const cur = ++id;
      const h = (e) => {
        const d = JSON.parse(e.data);
        if (d.id === cur) {
          ws.removeEventListener('message', h);
          res(d.result);
        }
      };
      ws.addEventListener('message', h);
      ws.send(JSON.stringify({ id: cur, method: m, params: p }));
    });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:3011/' });
  await new Promise((r) => setTimeout(r, 4000));

  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 720, y: 450 });
  await new Promise((r) => setTimeout(r, 1000));

  // Let's check animations present
  const anims = await send('Runtime.evaluate', {
    expression: `(() => {
      const anims = document.getAnimations();
      return anims.map(a => ({
        id: a.id,
        playState: a.playState,
        currentTime: a.currentTime,
        target: a.effect?.target?.className || a.effect?.target?.tagName
      }));
    })()`,
    returnByValue: true,
  });
  console.log('Animations in document:', anims.result.value);

  // Pause all animations
  await send('Runtime.evaluate', {
    expression: `(() => {
      document.getAnimations().forEach(a => {
        try { a.pause(); } catch {}
      });
      const s = document.createElement('style');
      s.textContent = '*, *::before, *::after { animation-play-state: paused !important; }';
      document.head.appendChild(s);
    })()`
  });
  await new Promise(r => setTimeout(r, 200));

  const shot1 = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await new Promise((r) => setTimeout(r, 1000));
  const shot2 = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });

  ws.close();
  proc.kill();

  const b1 = Buffer.from(shot1.data, 'base64');
  const b2 = Buffer.from(shot2.data, 'base64');
  const r1 = await sharp(b1).raw().toBuffer();
  const r2 = await sharp(b2).raw().toBuffer();

  const diffMask = new Uint8Array(1440 * 900 * 3);
  let changed = 0;
  for (let i = 0; i < 1440 * 900; i++) {
    const dr = Math.abs(r1[i * 3] - r2[i * 3]);
    const dg = Math.abs(r1[i * 3 + 1] - r2[i * 3 + 1]);
    const db = Math.abs(r1[i * 3 + 2] - r2[i * 3 + 2]);
    if (dr > 8 || dg > 8 || db > 8) {
      changed++;
      diffMask[i * 3] = 255;
      diffMask[i * 3 + 1] = 0;
      diffMask[i * 3 + 2] = 0;
    }
  }
  console.log(`Changed between shot1 and shot2: ${changed} px`);
}

debugNoise().catch(console.error);
