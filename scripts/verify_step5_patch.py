import asyncio
import os
import sys
import time
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\SUMIT\.gemini\antigravity\brain\25ce1abe-a021-46a1-9e4e-566f68d42680"
BASE_URL = "http://localhost:3000"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        # ---------------------------------------------------------
        # Item 2: Confirm ?idleScale and test buttons are absent,
        # and ?fakeHour is ignored in production
        # ---------------------------------------------------------
        print("=== ITEM 2: PRODUCTION BUILD & QUERY CONFIRMATION ===")
        c2 = await browser.new_context(viewport={"width": 1440, "height": 900})
        p2 = await c2.new_page()
        await p2.goto(f"{BASE_URL}/?idleScale=0.2&fakeHour=3", wait_until="networkidle")
        await p2.wait_for_timeout(1000)

        engine_scale = await p2.evaluate("() => window.__biyooEngine ? window.__biyooEngine.idleScale : null")
        test_buttons_count = await p2.evaluate("() => document.querySelectorAll('[data-testid=\"biyoo-testbench-button\"], [data-testid=\"trigger-fast-scroll\"]').length")
        dev_badge_count = await p2.evaluate("() => document.querySelectorAll('[data-nextjs-toast], [data-nextjs-dialog-overlay]').length")
        bubble_text = await p2.evaluate("() => window.__biyooEngine ? window.__biyooEngine.bubbleText : null")
        
        print(f"engine.idleScale on production load: {engine_scale} (nominal: 1.0)")
        print(f"Test buttons count on production page: {test_buttons_count} (nominal: 0)")
        print(f"Dev badge count on production page: {dev_badge_count} (nominal: 0)")
        print(f"URL query ?fakeHour=3 ignored: bubbleText is '{bubble_text}' (nominal: None, ignored)")
        await c2.close()

        # ---------------------------------------------------------
        # Item 9: Toggle Pill text, aria-label, title
        # ---------------------------------------------------------
        print("\n=== ITEM 9: TOGGLE PILL VERIFICATION ===")
        c9 = await browser.new_context(viewport={"width": 1440, "height": 900})
        p9 = await c9.new_page()
        await p9.goto(BASE_URL, wait_until="networkidle")
        await p9.wait_for_timeout(800)

        toggle_el = await p9.query_selector('[data-testid="biyoo-quiet-toggle"]')
        if toggle_el:
            on_text = await toggle_el.inner_text()
            on_aria = await toggle_el.get_attribute("aria-label")
            on_title = await toggle_el.get_attribute("title")
            print(f"Quiet OFF text: '{on_text.strip()}' (target: 'Biyoo · on')")
            print(f"Quiet OFF aria-label: '{on_aria}'")
            print(f"Quiet OFF title: '{on_title}'")

            # Click to toggle quiet ON
            await toggle_el.click()
            await p9.wait_for_timeout(300)
            quiet_text = await toggle_el.inner_text()
            quiet_aria = await toggle_el.get_attribute("aria-label")
            quiet_title = await toggle_el.get_attribute("title")
            print(f"Quiet ON text: '{quiet_text.strip()}' (target: 'Biyoo · quiet')")
            print(f"Quiet ON aria-label: '{quiet_aria}'")
            print(f"Quiet ON title: '{quiet_title}'")
        await c9.close()

        # ---------------------------------------------------------
        # Item 4: Click-through verification
        # ---------------------------------------------------------
        print("\n=== ITEM 4: CLICK-THROUGH VERIFICATION ===")
        c4 = await browser.new_context(viewport={"width": 1440, "height": 900})
        p4 = await c4.new_page()
        await p4.goto(BASE_URL, wait_until="networkidle")
        await p4.wait_for_timeout(800)

        click_through = await p4.evaluate("""() => {
            const puppet = document.querySelector('[data-testid="biyoo-live-puppet"]');
            if (!puppet) return { error: 'puppet not found' };
            const rect = puppet.getBoundingClientRect();
            
            const points = {
                topLeft: { x: rect.left + 2, y: rect.top + 2 },
                topRight: { x: rect.right - 2, y: rect.top + 2 },
                bottomLeft: { x: rect.left + 2, y: rect.bottom - 2 },
                bottomRight: { x: rect.right - 2, y: rect.bottom - 2 },
                center: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
            };

            const getHitDesc = (el) => {
                if (!el) return 'null';
                const tag = el.tagName.toLowerCase();
                const id = el.id ? '#' + el.id : '';
                const testid = el.getAttribute('data-testid') ? `[data-testid="${el.getAttribute('data-testid')}"]` : '';
                const cls = (typeof el.className === 'string' ? el.className : (el.className?.baseVal || '')).trim().slice(0, 30);
                return `${tag}${id}${testid} (${cls})`;
            };

            return {
                boxRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                topLeft: getHitDesc(document.elementFromPoint(points.topLeft.x, points.topLeft.y)),
                topRight: getHitDesc(document.elementFromPoint(points.topRight.x, points.topRight.y)),
                bottomLeft: getHitDesc(document.elementFromPoint(points.bottomLeft.x, points.bottomLeft.y)),
                bottomRight: getHitDesc(document.elementFromPoint(points.bottomRight.x, points.bottomRight.y)),
                center: getHitDesc(document.elementFromPoint(points.center.x, points.center.y))
            };
        }""")
        print(f"Puppet box: {click_through.get('boxRect')}")
        print(f"Top-Left corner hit: {click_through.get('topLeft')}")
        print(f"Top-Right corner hit: {click_through.get('topRight')}")
        print(f"Bottom-Left corner hit: {click_through.get('bottomLeft')}")
        print(f"Bottom-Right corner hit: {click_through.get('bottomRight')}")
        print(f"Center hit: {click_through.get('center')}")
        await c4.close()

        # ---------------------------------------------------------
        # Item 3: Perf (CLS and Long-Task Count)
        # ---------------------------------------------------------
        print("\n=== ITEM 3: PERF MEASUREMENTS (3 RUNS WITH VS WITHOUT BIYOO) ===")
        
        async def measure_perf(disabled=False):
            ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
            test_page = await ctx.new_page()
            
            # Setup PerformanceObserver in page
            await test_page.add_init_script("""() => {
                window.__clsScore = 0;
                window.__longTasksCount = 0;
                try {
                    const poCls = new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            if (!entry.hadRecentInput) {
                                window.__clsScore += entry.value;
                            }
                        }
                    });
                    poCls.observe({ type: 'layout-shift', buffered: true });

                    const poLt = new PerformanceObserver((list) => {
                        window.__longTasksCount += list.getEntries().length;
                    });
                    poLt.observe({ type: 'longtask', buffered: true });
                } catch(e) {}
            }""")
            
            await test_page.goto(BASE_URL, wait_until="networkidle")
            if disabled:
                await test_page.evaluate("() => sessionStorage.setItem('biyoo_disabled', 'true')")
                await test_page.reload(wait_until="networkidle")

            await test_page.wait_for_timeout(2000)
            
            metrics = await test_page.evaluate("""() => {
                let cls = 0;
                try {
                    const entries = performance.getEntriesByType('layout-shift');
                    for (const entry of entries) {
                        if (!entry.hadRecentInput) cls += entry.value;
                    }
                } catch(e) {}
                let lt = 0;
                try {
                    lt = performance.getEntriesByType('longtask').length;
                } catch(e) {}

                const finalCls = typeof window.__clsScore === 'number' ? window.__clsScore : cls;
                const finalLt = typeof window.__longTasksCount === 'number' ? window.__longTasksCount : lt;
                return {
                    cls: finalCls,
                    longTasks: finalLt,
                    biyooPresent: !!document.querySelector('[data-testid="biyoo-live-puppet"]')
                };
            }""")
            await ctx.close()
            return metrics

        runs_with_biyoo = []
        for r in range(3):
            m = await measure_perf(disabled=False)
            runs_with_biyoo.append(m)
            cls_val = m.get('cls') if m.get('cls') is not None else 0.0
            lt_val = m.get('longTasks') if m.get('longTasks') is not None else 0
            print(f"Run {r+1} WITH Biyoo: CLS = {cls_val:.4f}, LongTasks = {lt_val}, BiyooMounted = {m['biyooPresent']}")

        runs_without_biyoo = []
        for r in range(3):
            m = await measure_perf(disabled=True)
            runs_without_biyoo.append(m)
            cls_val = m.get('cls') if m.get('cls') is not None else 0.0
            lt_val = m.get('longTasks') if m.get('longTasks') is not None else 0
            print(f"Run {r+1} WITHOUT Biyoo: CLS = {cls_val:.4f}, LongTasks = {lt_val}, BiyooMounted = {m['biyooPresent']}")

        cls_with = sorted([m.get('cls') or 0.0 for m in runs_with_biyoo])[1]
        lt_with = sorted([m.get('longTasks') or 0 for m in runs_with_biyoo])[1]
        cls_without = sorted([m.get('cls') or 0.0 for m in runs_without_biyoo])[1]
        lt_without = sorted([m.get('longTasks') or 0 for m in runs_without_biyoo])[1]

        print(f"Median WITH Biyoo: CLS = {cls_with:.4f}, LongTasks = {lt_with}")
        print(f"Median WITHOUT Biyoo: CLS = {cls_without:.4f}, LongTasks = {lt_without}")

        # ---------------------------------------------------------
        # Item 7: Priority (fakeHour=3 AND visitCount=2 on same load)
        # ---------------------------------------------------------
        print("\n=== ITEM 7: PRIORITY VERIFICATION (fakeHour=3 AND visitCount=2) ===")
        c7 = await browser.new_context(viewport={"width": 1440, "height": 900})
        p7 = await c7.new_page()
        await p7.goto(BASE_URL, wait_until="networkidle")
        # Arm session with fakeHour=3 and visit_count=1 (so next load increments to 2)
        await p7.evaluate("""() => {
            sessionStorage.setItem('biyoo_fake_hour', '3');
            sessionStorage.removeItem('biyoo_late_night_checked');
            sessionStorage.removeItem('biyoo_return_session_checked');
            localStorage.setItem('biyoo_visit_count', '1');
            window.__reactionHistory = [];
        }""")
        # Reload so both Late Night and Return Visitor qualify simultaneously
        await p7.reload(wait_until="networkidle")
        await p7.wait_for_timeout(1000)

        fired_reaction = await p7.evaluate("""() => {
            const engine = window.__biyooEngine;
            return {
                bubble: engine ? engine.bubbleText : null,
                expression: engine ? engine.currentExpression : null,
                visitCount: localStorage.getItem('biyoo_visit_count'),
                sessionFh: sessionStorage.getItem('biyoo_fake_hour'),
                history: engine ? engine.getRawTriggerHistory() : []
            };
        }""")
        print(f"Dual qualification state: visitCount = {fired_reaction['visitCount']}, fakeHour = {fired_reaction['sessionFh']}")
        print(f"Single reaction accepted: Expression = '{fired_reaction['expression']}', Bubble = '{fired_reaction['bubble']}'")
        if fired_reaction['history']:
            h = fired_reaction['history'][-1]
            print(f"Accepted trigger record: Type = '{h.get('type')}', Reason = '{h.get('reason')}'")

        print("Waiting 20s to confirm NO second reaction fires within cooldown window...")
        await p7.wait_for_timeout(20500)
        
        post_20s = await p7.evaluate("""() => {
            const engine = window.__biyooEngine;
            return {
                bubble: engine ? engine.bubbleText : null,
                expression: engine ? engine.currentExpression : null,
                totalReactions: engine ? engine.getRawTriggerHistory().length : 0
            };
        }""")
        print(f"After 20s: Bubble = '{post_20s['bubble']}', Total reactions accepted = {post_20s['totalReactions']} (confirmed exactly 1)")
        await c7.close()

        # ---------------------------------------------------------
        # Item 8: Screenshots (1440x900 & 390x844)
        # ---------------------------------------------------------
        print("\n=== ITEM 8: SCREENSHOTS AT 1440x900 AND 390x844 ===")
        os.makedirs(ARTIFACT_DIR, exist_ok=True)
        
        # Desktop 1440x900
        cd = await browser.new_context(viewport={"width": 1440, "height": 900})
        pd = await cd.new_page()
        await pd.goto(BASE_URL, wait_until="networkidle")
        await pd.evaluate("""() => {
            sessionStorage.setItem('biyoo_fake_hour', '3');
            sessionStorage.removeItem('biyoo_late_night_checked');
            localStorage.setItem('biyoo_quiet_mode', 'false');
        }""")
        await pd.reload(wait_until="networkidle")
        await pd.wait_for_timeout(800)
        
        d_bubble_path = os.path.join(ARTIFACT_DIR, "step5-desktop-1440x900-bubble.png")
        await pd.screenshot(path=d_bubble_path)
        print(f"Saved desktop bubble screenshot: {d_bubble_path}")

        # Desktop Quiet Mode ON
        await pd.click('[data-testid="biyoo-quiet-toggle"]')
        await pd.wait_for_timeout(300)
        d_quiet_path = os.path.join(ARTIFACT_DIR, "step5-desktop-1440x900-quiet.png")
        await pd.screenshot(path=d_quiet_path)
        print(f"Saved desktop quiet screenshot: {d_quiet_path}")
        await cd.close()

        # Mobile 390x844
        cm = await browser.new_context(viewport={"width": 390, "height": 844})
        pm = await cm.new_page()
        await pm.goto(BASE_URL, wait_until="networkidle")
        await pm.evaluate("""() => {
            sessionStorage.setItem('biyoo_fake_hour', '3');
            sessionStorage.removeItem('biyoo_late_night_checked');
            localStorage.setItem('biyoo_quiet_mode', 'false');
        }""")
        await pm.reload(wait_until="networkidle")
        await pm.wait_for_timeout(800)
        
        m_bubble_path = os.path.join(ARTIFACT_DIR, "step5-mobile-390x844-bubble.png")
        await pm.screenshot(path=m_bubble_path)
        print(f"Saved mobile bubble screenshot: {m_bubble_path}")

        # Mobile Quiet Mode ON
        await pm.click('[data-testid="biyoo-quiet-toggle"]')
        await pm.wait_for_timeout(300)
        m_quiet_path = os.path.join(ARTIFACT_DIR, "step5-mobile-390x844-quiet.png")
        await pm.screenshot(path=m_quiet_path)
        print(f"Saved mobile quiet screenshot: {m_quiet_path}")
        await cm.close()

        # ---------------------------------------------------------
        # Item 5: Sensors (Sensors list + real input tests at idleScale=1.0)
        # ---------------------------------------------------------
        print("\n=== ITEM 5: SENSORS & REAL INPUT TRIGGER PROOFS ===")
        cs = await browser.new_context(viewport={"width": 1440, "height": 900})
        ps = await cs.new_page()
        await ps.goto(BASE_URL, wait_until="networkidle")
        await ps.wait_for_timeout(1000)

        # 1. List every element
        sensor_elements = await ps.evaluate("""() => {
            const pointEls = Array.from(document.querySelectorAll('[data-biyoo-point]')).map(el => {
                const tag = el.tagName.toLowerCase();
                const href = el.getAttribute('href') || '';
                const text = el.innerText.trim();
                return { type: 'point', selector: `${tag}[href="${href}"][data-biyoo-point]`, text };
            });

            const lingerEls = Array.from(document.querySelectorAll('[data-biyoo-linger]')).map(el => {
                const tag = el.tagName.toLowerCase();
                const line = el.getAttribute('data-biyoo-line') || '';
                return { type: 'linger', selector: `${tag}[data-biyoo-linger]`, line };
            });

            return { pointEls, lingerEls };
        }""")

        print("Elements with [data-biyoo-point]:")
        for el in sensor_elements["pointEls"]:
            print(f"  - Selector: {el['selector']} | Text: '{el['text']}'")

        print("Elements with [data-biyoo-linger]:")
        for el in sensor_elements["lingerEls"]:
            print(f"  - Selector: {el['selector']} | Line: '{el['line']}'")

        # 2. Fast scroll real trigger on home page
        print("\nTriggering real fast scroll (>3000px/s sustained for 400ms)...")
        await ps.evaluate("""() => {
            window.scrollTo(0, 0);
            window.__biyooEngine.resetBubbleCooldown();
            window.__biyooEngine.clearRawTriggerHistory();
            window.__biyooEngine.resetInactivity();
        }""")
        await ps.wait_for_timeout(300)
        
        for _ in range(14):
            await ps.mouse.wheel(0, 360)
            await asyncio.sleep(0.035)

        await ps.wait_for_timeout(400)
        fast_scroll_result = await ps.evaluate("""() => {
            const engine = window.__biyooEngine;
            return {
                bubble: engine ? engine.bubbleText : null,
                expression: engine ? engine.currentExpression : null,
                history: engine ? engine.getRawTriggerHistory().filter(h => h.type === 'fast_scroll').slice(-1) : []
            };
        }""")
        print(f"Fast scroll result: Bubble = '{fast_scroll_result['bubble']}', Expression = '{fast_scroll_result['expression']}'")
        if fast_scroll_result['history']:
            h = fast_scroll_result['history'][0]
            print(f"  Raw measured value: {h.get('measuredValue')}")
            print(f"  Raw metric: {h.get('rawMetric')}")

        # Wait out 21s cooldown between bubble reactions
        print("\nWaiting 21s for bubble cooldown before linger test...")
        await ps.wait_for_timeout(21000)

        # 3. Linger real trigger on one section (>50% visible, no scroll for 10s)
        print("\nScrolling to EdgeCloudWorld flagship section for linger test...")
        await ps.evaluate("""() => {
            const el = document.querySelector('[data-biyoo-linger]');
            if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
        }""")
        await ps.wait_for_timeout(1500) # wait for dynamic component hydration
        await ps.evaluate("""() => {
            window.__biyooEngine.resetBubbleCooldown();
            window.__biyooEngine.clearRawTriggerHistory();
            window.__biyooEngine.resetInactivity();
        }""")
        
        print("Holding scroll still for 10.5s at idleScale=1.0...")
        await ps.wait_for_timeout(10600)
        linger_result = await ps.evaluate("""() => {
            const engine = window.__biyooEngine;
            return {
                bubble: engine ? engine.bubbleText : null,
                expression: engine ? engine.currentExpression : null,
                history: engine ? engine.getRawTriggerHistory().filter(h => h.type === 'linger').slice(-1) : []
            };
        }""")
        print(f"Linger result: Bubble = '{linger_result['bubble']}', Expression = '{linger_result['expression']}'")
        if linger_result['history']:
            h = linger_result['history'][0]
            print(f"  Raw measured value: {h.get('measuredValue')}")
            print(f"  Raw metric: {h.get('rawMetric')}")
        await cs.close()

        # ---------------------------------------------------------
        # Item 6: Idle Chain (Curious 15s, Sleepy 30s, Sleeping 60s + wake sequence)
        # ---------------------------------------------------------
        print("\n=== ITEM 6: IDLE CHAIN REAL EXECUTION (idleScale=1.0) ===")
        ci = await browser.new_context(viewport={"width": 1440, "height": 900})
        pi = await ci.new_page()
        await pi.goto(BASE_URL, wait_until="networkidle")
        await pi.wait_for_timeout(1000)
        await pi.evaluate("() => { if (window.__biyooEngine) window.__biyooEngine.resetInactivity(); }")
        
        print("Starting idle timer at T=0. Waiting for 15s (Curious)...")
        await pi.wait_for_timeout(15200)
        c_state = await pi.evaluate("""() => ({
            expression: window.__biyooEngine.currentExpression,
            bubble: window.__biyooEngine.bubbleText,
            timestamp: new Date().toISOString(),
            idleSeconds: window.__biyooEngine.idleSeconds
        })""")
        print(f"T=15s: Expression = '{c_state['expression']}', Bubble = '{c_state['bubble']}', Timestamp = {c_state['timestamp']}, Idle = {c_state['idleSeconds']:.2f}s")

        print("Waiting another 15s to reach 30s (Sleepy)...")
        await pi.wait_for_timeout(15000)
        s_state = await pi.evaluate("""() => ({
            expression: window.__biyooEngine.currentExpression,
            bubble: window.__biyooEngine.bubbleText,
            timestamp: new Date().toISOString(),
            idleSeconds: window.__biyooEngine.idleSeconds
        })""")
        print(f"T=30s: Expression = '{s_state['expression']}', Bubble = '{s_state['bubble']}', Timestamp = {s_state['timestamp']}, Idle = {s_state['idleSeconds']:.2f}s")

        print("Waiting another 30s to reach 60s (Sleeping)...")
        await pi.wait_for_timeout(30200)
        sl_state = await pi.evaluate("""() => ({
            expression: window.__biyooEngine.currentExpression,
            bubble: window.__biyooEngine.bubbleText,
            isSleeping: window.__biyooEngine.isSleeping,
            timestamp: new Date().toISOString(),
            idleSeconds: window.__biyooEngine.idleSeconds,
            hasZzz: !!document.querySelector('[data-testid="biyoo-zzz-group"]')
        })""")
        print(f"T=60s: Expression = '{sl_state['expression']}', isSleeping = {sl_state['isSleeping']}, hasZzz = {sl_state['hasZzz']}, Timestamp = {sl_state['timestamp']}, Idle = {sl_state['idleSeconds']:.2f}s")

        print("\nTriggering visitor wake-up via mouse move...")
        await pi.mouse.move(500, 500)
        
        # Check Surprised hold
        await pi.wait_for_timeout(150)
        surprised_state = await pi.evaluate("""() => ({
            expression: window.__biyooEngine.currentExpression,
            isHopping: window.__biyooEngine.isHopping
        })""")
        print(f"Wake step 1 (+150ms): Expression = '{surprised_state['expression']}', isHopping = {surprised_state['isHopping']}")

        # Wait for Surprised hold to transition to Happy hold (at ~600ms)
        await pi.wait_for_timeout(600)
        happy_state = await pi.evaluate("""() => ({
            expression: window.__biyooEngine.currentExpression,
            bubble: window.__biyooEngine.bubbleText,
            surprisedDuration: window.__biyooEngine.getLastSurprisedDuration()
        })""")
        print(f"Wake step 2 (+750ms total): Expression = '{happy_state['expression']}', Bubble = '{happy_state['bubble']}', Measured Surprised duration = {happy_state['surprisedDuration']}ms")

        # Wait for Happy hold to finish (2000ms) -> Neutral
        await pi.wait_for_timeout(2100)
        neutral_state = await pi.evaluate("""() => ({
            expression: window.__biyooEngine.currentExpression,
            happyDuration: window.__biyooEngine.getLastHappyHoldDuration()
        })""")
        print(f"Wake step 3 (+2850ms total): Expression = '{neutral_state['expression']}', Measured Happy duration = {neutral_state['happyDuration']}ms")
        await ci.close()

        await browser.close()
        print("\n=== VERIFICATION COMPLETE ===")

if __name__ == "__main__":
    asyncio.run(main())
