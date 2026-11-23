import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9235;
const BASE_URL = process.env.TARGET_URL || 'http://localhost:3000';

async function testRaftResize() {
  console.log('====================================================');
  console.log(' MID-PAGE RESIZE TEST: SCROLL TO RAFT & RESIZE ');
  console.log(' Test that tint remains Raft (orange) after resize ');
  console.log('====================================================\n');

  const userDataDir = path.join(os.tmpdir(), `chrome-raft-resize-${Date.now()}`);
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
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log(`Navigating to ${BASE_URL}...`);
    await send('Page.navigate', { url: BASE_URL });

    // Wait 3.5s for initial load, hydration, and deferred worlds
    await new Promise((r) => setTimeout(r, 3500));

    // Scroll smoothly to Raft (#ratify)
    console.log('Scrolling into view of #ratify (Raft world)...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.getElementById('ratify');
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
      })()`,
    });

    // Wait 1.2s for scroll trigger and tint crossfade
    await new Promise((r) => setTimeout(r, 1200));

    const getTintState = async () => {
      const res = await send('Runtime.evaluate', {
        expression: `(() => {
          const scrollY = window.scrollY || document.documentElement.scrollTop;
          const tints = Array.from(document.querySelectorAll('[data-tint]')).map(el => ({
            id: el.getAttribute('data-tint'),
            opacity: parseFloat(window.getComputedStyle(el).opacity || '0'),
          }));
          const ratifyEl = document.getElementById('ratify');
          const rect = ratifyEl ? ratifyEl.getBoundingClientRect() : null;
          return {
            scrollY,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            ratifyRect: rect ? { top: Math.round(rect.top), bottom: Math.round(rect.bottom), height: Math.round(rect.height) } : null,
            tints,
          };
        })()`,
        returnByValue: true,
      });
      return res.result.value;
    };

    const beforeResize = await getTintState();
    console.log('\n--- State BEFORE resize (at 1440x900) ---');
    console.log(`Scroll Y: ${beforeResize.scrollY}px`);
    console.log(`Ratify section rect:`, beforeResize.ratifyRect);
    console.log('Tints:');
    console.table(beforeResize.tints);

    const raftTintBefore = beforeResize.tints.find(t => t.id === 'raft');
    const isRaftActiveBefore = raftTintBefore && raftTintBefore.opacity > 0.25;
    console.log(`Raft (orange) active before resize: ${isRaftActiveBefore ? 'YES (opacity ' + raftTintBefore.opacity + ')' : 'NO'}`);

    // Trigger window resize to 1280x800
    console.log('\nTriggering window resize to 1280x800 while scrolled at Raft...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // Wait 1.5s for debounced resize (250ms), idle callback, offset recomputation, and crossfade
    await new Promise((r) => setTimeout(r, 1500));

    const afterResize = await getTintState();
    console.log('\n--- State AFTER resize (at 1280x800) ---');
    console.log(`Scroll Y: ${afterResize.scrollY}px`);
    console.log(`Ratify section rect:`, afterResize.ratifyRect);
    console.log('Tints:');
    console.table(afterResize.tints);

    const raftTintAfter = afterResize.tints.find(t => t.id === 'raft');
    const isRaftActiveAfter = raftTintAfter && raftTintAfter.opacity > 0.25;
    console.log(`Raft (orange) active after resize: ${isRaftActiveAfter ? 'YES (opacity ' + raftTintAfter.opacity + ')' : 'NO'}`);

    // Also take a screenshot to visually prove Raft is orange after resize
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    const proofDir = path.resolve('docs/proofs');
    fs.mkdirSync(proofDir, { recursive: true });
    fs.writeFileSync(path.join(proofDir, 'screens/desktop-raft-after-resize.png'), Buffer.from(screenshot.data, 'base64'));
    console.log('\nSaved post-resize screenshot to docs/proofs/screens/desktop-raft-after-resize.png');

    fs.writeFileSync(
      path.join(proofDir, 'raft-resize-verification.txt'),
      `=== MID-PAGE RESIZE TEST: SCROLL TO RAFT & RESIZE ===\n\n` +
      `Date: ${new Date().toISOString()}\n\n` +
      `BEFORE RESIZE (1440x900):\n` +
      JSON.stringify(beforeResize, null, 2) + '\n\n' +
      `AFTER RESIZE (1280x800):\n` +
      JSON.stringify(afterResize, null, 2) + '\n\n' +
      `VERDICT: Tint is Raft (orange) both before and after resize -> ${isRaftActiveAfter ? 'PASS' : 'FAIL'}\n`
    );

    ws.close();
    chromeProc.kill();

    if (!isRaftActiveAfter) {
      console.error('\nFAIL: Tint did not remain Raft after resize!');
      process.exit(1);
    } else {
      console.log('\nPASS: Tint remained Raft (orange, opacity 0.35) after mid-page resize!');
    }
  } catch (err) {
    chromeProc.kill();
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

testRaftResize();

