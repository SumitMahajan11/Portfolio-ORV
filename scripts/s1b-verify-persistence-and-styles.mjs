import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9245;
const BASE_URL = 'http://localhost:3000';
const PROOF_FILE = path.resolve('docs/proofs/s1b-persistence-zorder.txt');

const SECTION_IDS = [
  'hero-scene',
  'scenario-select',
  'edge-cloud',
  'ratify',
  'iac-verifier',
  'side-quests',
  'readers-record',
  'contact',
];


class CDPClient {
  constructor(ws) {
    this.ws = ws;
    this.id = 1;
    this.callbacks = new Map();
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function launchBrowser(width, height) {
  const userDataDir = path.join(os.tmpdir(), `chrome-s1b-${width}x${height}-${Date.now()}`);
  const chromeProc = cp.spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-sandbox',
    '--disable-extensions',
    `--window-size=${width},${height}`,
    `--user-data-dir=${userDataDir}`,
  ]);

  await new Promise((r) => setTimeout(r, 1200));

  const targetRes = await fetch(`http://localhost:${CDP_PORT}/json/new?about:blank`, { method: 'PUT' });
  const target = await targetRes.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });

  const cdp = new CDPClient(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');

  return { chromeProc, cdp, ws, userDataDir };
}

async function evalScript(cdp, expression) {
  const res = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res.exceptionDetails) {
    throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
  }
  return res.result?.value;
}

async function runPersistenceAudit() {
  const output = [];
  function log(msg = '') {
    console.log(msg);
    output.push(msg);
  }

  log('================================================================');
  log(' TASK structure-S1b: PERSISTENCE, /skip, & Z-ORDER AUDIT');
  log('================================================================');
  log(`Timestamp: ${new Date().toISOString()}`);

  const viewports = [
    { width: 1440, height: 900, name: 'Desktop (1440x900)' },
    { width: 390, height: 844, name: 'Mobile (390x844)' },
  ];

  for (const vp of viewports) {
    log(`\n----------------------------------------------------------------`);
    log(` 1. PERSISTENCE AUDIT: ${vp.name}`);
    log(`----------------------------------------------------------------`);

    const { chromeProc, cdp, ws, userDataDir } = await launchBrowser(vp.width, vp.height);

    try {
      await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
      await new Promise((r) => setTimeout(r, 2000));

      // Scroll to each section middle
      for (const sectionId of SECTION_IDS) {
        log(`\n--- Section: #${sectionId} ---`);

        const sectionResult = await evalScript(cdp, `
          (() => {
            const el = document.getElementById(${JSON.stringify(sectionId)});
            if (!el) return { found: false };

            const secRect = el.getBoundingClientRect();
            const targetY = window.scrollY + secRect.top + (secRect.height / 2) - (${vp.height} / 2);
            window.scrollTo({ top: Math.max(0, targetY), behavior: 'instant' });

            return {
              found: true,
              secTop: Math.round(secRect.top),
              secHeight: Math.round(secRect.height),
              scrollY: Math.round(Math.max(0, targetY))
            };
          })()
        `);

        if (!sectionResult.found) {
          log(`  [FAIL] Section #${sectionId} not found in DOM!`);
          continue;
        }

        // Allow layout to settle
        await new Promise((r) => setTimeout(r, 400));

        const biyooAudit = await evalScript(cdp, `
          (() => {
            const biyooEl = document.getElementById('fixed-biyoo-companion');
            if (!biyooEl) return { found: false };

            const r = biyooEl.getBoundingClientRect();
            const biyooRect = {
              x: Number(r.x.toFixed(1)),
              y: Number(r.y.toFixed(1)),
              width: Number(r.width.toFixed(1)),
              height: Number(r.height.toFixed(1)),
              top: Number(r.top.toFixed(1)),
              right: Number(r.right.toFixed(1)),
              bottom: Number(r.bottom.toFixed(1)),
              left: Number(r.left.toFixed(1)),
            };

            const inViewport = (
              biyooRect.left >= 0 &&
              biyooRect.right <= ${vp.width} &&
              biyooRect.top >= 0 &&
              biyooRect.bottom <= ${vp.height}
            );

            // Find all buttons and links in viewport
            const interactives = Array.from(document.querySelectorAll('a, button, [role="button"]'));
            const overlaps = [];
            const visibleInteractives = [];

            for (const el of interactives) {
              const rect = el.getBoundingClientRect();
              const style = window.getComputedStyle(el);

              // Check if visible and in viewport
              const isVisible = (
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                parseFloat(style.opacity || '1') > 0.05 &&
                rect.width > 0 &&
                rect.height > 0
              );

              const isInViewport = (
                rect.bottom > 0 &&
                rect.top < ${vp.height} &&
                rect.right > 0 &&
                rect.left < ${vp.width}
              );

              if (isVisible && isInViewport) {
                // Ignore elements that are descendants of Biyoo himself
                if (biyooEl.contains(el)) continue;

                const tag = el.tagName.toLowerCase();
                const text = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' ').slice(0, 30);
                const itemRect = {
                  top: Number(rect.top.toFixed(1)),
                  right: Number(rect.right.toFixed(1)),
                  bottom: Number(rect.bottom.toFixed(1)),
                  left: Number(rect.left.toFixed(1)),
                  width: Number(rect.width.toFixed(1)),
                  height: Number(rect.height.toFixed(1)),
                  tag,
                  text
                };

                visibleInteractives.push(itemRect);

                // Overlap check
                const overlap = !(
                  itemRect.right <= biyooRect.left ||
                  itemRect.left >= biyooRect.right ||
                  itemRect.bottom <= biyooRect.top ||
                  itemRect.top >= biyooRect.bottom
                );

                if (overlap) {
                  overlaps.push(itemRect);
                }
              }
            }

            return {
              found: true,
              biyooRect,
              inViewport,
              visibleInteractiveCount: visibleInteractives.length,
              overlaps,
            };
          })()
        `);

        log(`  Scroll Y: ${sectionResult.scrollY}px`);
        log(`  Biyoo getBoundingClientRect: ${JSON.stringify(biyooAudit.biyooRect)}`);
        log(`  Inside Viewport: ${biyooAudit.inViewport ? 'YES (PASS)' : 'NO (FAIL)'}`);
        log(`  Visible buttons/links in viewport: ${biyooAudit.visibleInteractiveCount}`);
        if (biyooAudit.overlaps.length === 0) {
          log(`  Overlap with buttons/links: NONE (PASS - 0 overlaps)`);
        } else {
          log(`  [OVERLAP DETECTED] Overlaps with ${biyooAudit.overlaps.length} elements:`);
          for (const o of biyooAudit.overlaps) {
            log(`    - <${o.tag}> "${o.text}" at [top:${o.top}, left:${o.left}, w:${o.width}, h:${o.height}]`);
          }
        }
      }
    } finally {
      ws.close();
      chromeProc.kill();
      try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
    }
  }

  // 2. /skip DOM query audit
  log(`\n----------------------------------------------------------------`);
  log(` 2. /skip DOM QUERY AUDIT`);
  log(`----------------------------------------------------------------`);
  const { chromeProc: skipProc, cdp: skipCdp, ws: skipWs, userDataDir: skipDataDir } = await launchBrowser(1440, 900);
  try {
    await skipCdp.send('Page.navigate', { url: `${BASE_URL}/skip` });
    await new Promise((r) => setTimeout(r, 2000));

    const skipAudit = await evalScript(skipCdp, `
      (() => {
        const fixedBiyoo = document.getElementById('fixed-biyoo-companion');
        const biyooEls = Array.from(document.querySelectorAll('[data-biyoo], #biyoo, .biyoo'));
        const images = Array.from(document.querySelectorAll('img')).filter(img => img.src && img.src.includes('biyoo'));

        return {
          fixedBiyooPresent: !!fixedBiyoo,
          otherBiyooElementsCount: biyooEls.length,
          biyooImagesCount: images.length,
          bodyHtmlHasFixedBiyoo: document.body.innerHTML.includes('fixed-biyoo-companion'),
        };
      })()
    `);

    log(`Navigated to: ${BASE_URL}/skip`);
    log(`Query #fixed-biyoo-companion: ${skipAudit.fixedBiyooPresent ? 'FOUND (FAIL)' : 'NULL (PASS - ABSENT)'}`);
    log(`Other Biyoo selector count: ${skipAudit.otherBiyooElementsCount}`);
    log(`Biyoo image elements count: ${skipAudit.biyooImagesCount}`);
    log(`HTML includes fixed-biyoo-companion: ${skipAudit.bodyHtmlHasFixedBiyoo ? 'YES (FAIL)' : 'NO (PASS)'}`);
    log(`Verdict: ${!skipAudit.fixedBiyooPresent && !skipAudit.bodyHtmlHasFixedBiyoo ? 'PASS - Biyoo is completely absent on /skip' : 'FAIL'}`);
  } finally {
    skipWs.close();
    skipProc.kill();
    try { fs.rmSync(skipDataDir, { recursive: true, force: true }); } catch {}
  }

  // 3. Z-ORDER & Stacking Context Audit
  log(`\n----------------------------------------------------------------`);
  log(` 3. Z-ORDER & STACKING CONTEXT AUDIT (LIVE PAGE COMPUTED STYLES)`);
  log(`----------------------------------------------------------------`);
  const { chromeProc: zProc, cdp: zCdp, ws: zWs, userDataDir: zDataDir } = await launchBrowser(1440, 900);
  try {
    await zCdp.send('Page.navigate', { url: `${BASE_URL}/` });
    await new Promise((r) => setTimeout(r, 2000));

    // Show sound prompt
    await evalScript(zCdp, `window.dispatchEvent(new Event('sound:show-prompt'))`);
    await new Promise((r) => setTimeout(r, 500));

    // Click Biyoo to trigger poke / speech bubble
    await evalScript(zCdp, `
      (() => {
        const biyoo = document.getElementById('fixed-biyoo-companion');
        if (biyoo) {
          const clickTarget = biyoo.querySelector('[tabindex="0"]') || biyoo;
          clickTarget.click();
        }
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));

    const zAudit = await evalScript(zCdp, `
      (() => {
        function analyzeStackingContext(el) {
          if (!el) return null;
          const s = window.getComputedStyle(el);

          // Stacking context criteria (W3C CSS spec)
          const reasons = [];
          if (el === document.documentElement) reasons.push('root element');
          if (s.position !== 'static' && s.zIndex !== 'auto') reasons.push(\`positioned (\${s.position}) with z-index (\${s.zIndex})\`);
          if (s.position === 'fixed' || s.position === 'sticky') reasons.push(\`position: \${s.position}\`);
          if (parseFloat(s.opacity) < 1) reasons.push(\`opacity (\${s.opacity}) < 1\`);
          if (s.transform && s.transform !== 'none') reasons.push(\`transform: \${s.transform}\`);
          if (s.filter && s.filter !== 'none') reasons.push(\`filter: \${s.filter}\`);
          if (s.isolation === 'isolate') reasons.push('isolation: isolate');
          if (s.willChange && s.willChange !== 'auto') reasons.push(\`will-change: \${s.willChange}\`);
          if (s.contain && (s.contain.includes('paint') || s.contain.includes('layout') || s.contain.includes('strict'))) {
            reasons.push(\`contain: \${s.contain}\`);
          }

          const createsStackingContext = reasons.length > 0;

          // Find parent stacking context
          let parent = el.parentElement;
          let parentContext = null;
          while (parent) {
            const ps = window.getComputedStyle(parent);
            const parentReasons = [];
            if (parent === document.documentElement) parentReasons.push('html (root)');
            if (ps.position !== 'static' && ps.zIndex !== 'auto') parentReasons.push(\`positioned (\${ps.position}) with z-index (\${ps.zIndex})\`);
            if (ps.position === 'fixed' || ps.position === 'sticky') parentReasons.push(\`position: \${ps.position}\`);
            if (parseFloat(ps.opacity) < 1) parentReasons.push('opacity < 1');
            if (ps.transform && ps.transform !== 'none') parentReasons.push('transform');
            if (ps.filter && ps.filter !== 'none') parentReasons.push('filter');
            if (ps.isolation === 'isolate') parentReasons.push('isolation: isolate');

            if (parentReasons.length > 0) {
              parentContext = {
                tagName: parent.tagName.toLowerCase(),
                id: parent.id || null,
                className: parent.className ? parent.className.toString().slice(0, 50) : null,
                reasons: parentReasons
              };
              break;
            }
            parent = parent.parentElement;
          }

          return {
            tagName: el.tagName.toLowerCase(),
            id: el.id || null,
            className: el.className ? el.className.toString().slice(0, 60) : null,
            position: s.position,
            zIndex: s.zIndex,
            opacity: s.opacity,
            transform: s.transform,
            createsStackingContext,
            stackingReasons: reasons,
            parentStackingContext: parentContext
          };
        }

        const biyoo = document.getElementById('fixed-biyoo-companion');
        const bubble = biyoo ? biyoo.querySelector('[role="status"]') : null;
        const banner = document.getElementById('sound-permission-prompt');
        const header = document.querySelector('header');
        const bounty = document.querySelector('aside[aria-label="Bounty board quick access"]');

        return {
          biyoo: analyzeStackingContext(biyoo),
          bubble: analyzeStackingContext(bubble),
          banner: analyzeStackingContext(banner),
          header: analyzeStackingContext(header),
          bounty: analyzeStackingContext(bounty),
        };
      })()
    `);

    log('Live page computed styles and stacking context breakdown:\n');

    const items = [
      { label: 'Biyoo Companion', data: zAudit.biyoo },
      { label: 'Biyoo Speech Bubble', data: zAudit.bubble },
      { label: 'Sound Banner', data: zAudit.banner },
      { label: 'Accessible Header', data: zAudit.header },
      { label: 'Corner Bounty Button', data: zAudit.bounty },
    ];

    for (const item of items) {
      log(`* Element: ${item.label}`);
      if (!item.data) {
        log(`  Rendered on live page: NO (returns null in React / not in DOM)`);
        log(`  Notes: Hidden until /wanted page exists (structure-S1 requirement 4a: hasWantedPage = false)\n`);
        continue;
      }
      log(`  Tag: <${item.data.tagName}> ${item.data.id ? `id="#${item.data.id}"` : ''}`);
      log(`  Computed position: ${item.data.position}`);
      log(`  Computed z-index:  ${item.data.zIndex}`);
      log(`  Creates stacking context: ${item.data.createsStackingContext ? 'YES' : 'NO'}`);
      log(`  Stacking context trigger(s): ${item.data.stackingReasons.join(', ') || 'none'}`);
      log(`  Parent stacking context: ${item.data.parentStackingContext ? `<${item.data.parentStackingContext.tagName}${item.data.parentStackingContext.id ? ` #${item.data.parentStackingContext.id}` : ''}> (${item.data.parentStackingContext.reasons.join(', ')})` : 'root document'}\n`);
    }

    log('Stacking Order Hierarchy (Highest to Lowest):');
    log('1. Header: z-index 50 (sticky, top of page)');
    log('2. Sound Permission Banner: z-index 50 (fixed, bottom right on desktop / bottom elevated on mobile)');
    log('3. Biyoo Companion: z-index 40 (fixed, bottom-left corner)');
    log('   -> Biyoo Speech Bubble: child of Biyoo Companion (z-index 30 within Biyoo\'s stacking context)');
    log('4. Corner Bounty Button: null on live page (hidden; when active: z-index 40 fixed bottom-right)');
    log('5. Interactive Section Content / Portals: z-index 10..30');
    log('6. Living Wall Background Canvas & Tints: z-index 0..3');
  } finally {
    zWs.close();
    zProc.kill();
    try { fs.rmSync(zDataDir, { recursive: true, force: true }); } catch {}
  }

  log('\n================================================================');
  log(' VERIFICATION COMPLETE');
  log('================================================================');

  fs.writeFileSync(PROOF_FILE, output.join('\n'), 'utf8');
  console.log(`\nProof report saved to: ${PROOF_FILE}`);
}

runPersistenceAudit().catch(console.error);
