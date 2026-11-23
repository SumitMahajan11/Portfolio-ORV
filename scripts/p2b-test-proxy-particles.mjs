import cp from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9245;

async function check(particlesOn) {
  await fetch(`http://127.0.0.1:3001/__proxy_control?particles=${particlesOn ? 1 : 0}`);

  const userDataDir = path.join(os.tmpdir(), `chrome-test-proxy-${Date.now()}`);
  const proc = cp.spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-sandbox',
    '--disable-extensions',
    `--user-data-dir=${userDataDir}`,
  ]);

  await new Promise((r) => setTimeout(r, 1500));

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
    await send('Page.navigate', { url: 'http://127.0.0.1:3001/' });
    await new Promise((r) => setTimeout(r, 3000));

    const result = await send('Runtime.evaluate', {
      expression: `(() => {
        const canvas = document.querySelector('canvas.living-wall-particles');
        return { canvasFound: !!canvas };
      })()`,
      returnByValue: true,
    });

    ws.close();
    proc.kill();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}

    return result.result.value;
  } catch (err) {
    proc.kill();
    throw err;
  }
}

async function main() {
  console.log('Testing particles ON...');
  const resOn = await check(true);
  console.log('Particles ON result:', resOn);

  console.log('Testing particles OFF...');
  const resOff = await check(false);
  console.log('Particles OFF result:', resOff);
}

main().catch(console.error);

