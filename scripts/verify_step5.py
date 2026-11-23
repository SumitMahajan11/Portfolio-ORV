import asyncio
import os
import shutil
import re
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\SUMIT\.gemini\antigravity\brain\25ce1abe-a021-46a1-9e4e-566f68d42680"
PUBLIC_DIR = r"d:\Projects\Portfolio-ORV-main\public\biyoo"
BASE_URL = "http://localhost:3000"

async def run_step5_verification():
    console_errors = []
    
    def on_console_msg(msg):
        if msg.type == "error":
            console_errors.append(f"Console error: {msg.text}")
    
    def on_page_error(err):
        console_errors.append(f"Page error: {str(err)}")

    print("=== STEP 5 VERIFICATION ===")

    # -------------------------------------------------------------
    # ITEM 0: THRESHOLD CHECK (LITERAL GREP OUTPUT)
    # -------------------------------------------------------------
    print("\n--- ITEM 0: THRESHOLD CONSTANTS CHECK ---")
    engine_file = r"d:\Projects\Portfolio-ORV-main\src\components\biyoo\puppet\use-biyoo-idle-engine.ts"
    with open(engine_file, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    threshold_lines = []
    pattern = re.compile(r"export const (FAST_SCROLL|LINGER|CURSOR_STILL|SKIP_BOTTOM|BUBBLE_COOLDOWN|IDLE_CHAIN)")
    for idx, line in enumerate(lines, 1):
        if pattern.search(line):
            threshold_lines.append(f"line {idx}: {line.strip()}")
            print(f"line {idx}: {line.strip()}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        # -------------------------------------------------------------
        # ITEM 6.1: SCREENSHOTS & NON-OVERLAPPING CHECK
        # -------------------------------------------------------------
        print("\n--- ITEM 6.1: HOME PAGE SCREENSHOTS (DESKTOP & MOBILE) ---")
        
        # Desktop 1440x900
        desktop_ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        desktop_page = await desktop_ctx.new_page()
        desktop_page.on("console", on_console_msg)
        desktop_page.on("pageerror", on_page_error)
        
        await desktop_page.goto(BASE_URL, wait_until="networkidle")
        await desktop_page.wait_for_selector('[data-testid="biyoo-live-puppet"]', timeout=8000)
        await asyncio.sleep(1.0)
        
        desktop_png_public = os.path.join(PUBLIC_DIR, "home-biyoo-desktop-1440x900.png")
        desktop_png_artifact = os.path.join(ARTIFACT_DIR, "home-biyoo-desktop-1440x900.png")
        await desktop_page.screenshot(path=desktop_png_public, full_page=False)
        shutil.copyfile(desktop_png_public, desktop_png_artifact)
        print(f"Desktop screenshot saved to: {desktop_png_public}")
        print(f"Desktop artifact copy saved to: {desktop_png_artifact}")

        # Non-overlapping check on Desktop
        desktop_overlap = await desktop_page.evaluate("""() => {
            const biyoo = document.querySelector('[data-testid="biyoo-live-puppet"]');
            const biyooRect = biyoo.getBoundingClientRect();
            
            // Check CTAs, nav links, and text
            const targets = [
                ...document.querySelectorAll('header a'),
                ...document.querySelectorAll('#hero-scene h1, #hero-scene p, #hero-scene a')
            ];
            
            const overlaps = [];
            for (const el of targets) {
                const r = el.getBoundingClientRect();
                const isOverlapping = !(
                    biyooRect.right < r.left ||
                    biyooRect.left > r.right ||
                    biyooRect.bottom < r.top ||
                    biyooRect.top > r.bottom
                );
                if (isOverlapping) {
                    overlaps.push({ tag: el.tagName, text: el.textContent?.slice(0, 30) });
                }
            }
            return {
                biyooRect: { x: Math.round(biyooRect.x), y: Math.round(biyooRect.y), w: Math.round(biyooRect.width), h: Math.round(biyooRect.height) },
                overlapsCount: overlaps.length,
                overlaps
            };
        }""")
        print(f"Desktop Biyoo Rect: {desktop_overlap['biyooRect']}")
        print(f"Desktop Overlapping Elements Count: {desktop_overlap['overlapsCount']} (Target: 0)")

        # Mobile 390x844
        mobile_ctx = await browser.new_context(viewport={"width": 390, "height": 844})
        mobile_page = await mobile_ctx.new_page()
        mobile_page.on("console", on_console_msg)
        mobile_page.on("pageerror", on_page_error)
        
        await mobile_page.goto(BASE_URL, wait_until="networkidle")
        await mobile_page.wait_for_selector('[data-testid="biyoo-live-puppet"]', timeout=8000)
        await asyncio.sleep(1.0)
        
        mobile_png_public = os.path.join(PUBLIC_DIR, "home-biyoo-mobile-390x844.png")
        mobile_png_artifact = os.path.join(ARTIFACT_DIR, "home-biyoo-mobile-390x844.png")
        await mobile_page.screenshot(path=mobile_png_public, full_page=False)
        shutil.copyfile(mobile_png_public, mobile_png_artifact)
        print(f"Mobile screenshot saved to: {mobile_png_public}")
        print(f"Mobile artifact copy saved to: {mobile_png_artifact}")

        mobile_overlap = await mobile_page.evaluate("""() => {
            const biyoo = document.querySelector('[data-testid="biyoo-live-puppet"]');
            const biyooRect = biyoo.getBoundingClientRect();
            
            const targets = [
                ...document.querySelectorAll('header a'),
                ...document.querySelectorAll('#hero-scene h1, #hero-scene p, #hero-scene a')
            ];
            
            const overlaps = [];
            for (const el of targets) {
                const r = el.getBoundingClientRect();
                const isOverlapping = !(
                    biyooRect.right < r.left ||
                    biyooRect.left > r.right ||
                    biyooRect.bottom < r.top ||
                    biyooRect.top > r.bottom
                );
                if (isOverlapping) {
                    overlaps.push({ tag: el.tagName, text: el.textContent?.slice(0, 30) });
                }
            }
            return {
                biyooRect: { x: Math.round(biyooRect.x), y: Math.round(biyooRect.y), w: Math.round(biyooRect.width), h: Math.round(biyooRect.height) },
                overlapsCount: overlaps.length,
                overlaps
            };
        }""")
        print(f"Mobile Biyoo Rect: {mobile_overlap['biyooRect']}")
        print(f"Mobile Overlapping Elements Count: {mobile_overlap['overlapsCount']} (Target: 0)")

        # -------------------------------------------------------------
        # ITEM 6.2: elementFromPoint RESULTS
        # -------------------------------------------------------------
        print("\n--- ITEM 6.2: elementFromPoint CHECK ---")
        efp_results = await desktop_page.evaluate("""() => {
            const container = document.querySelector('[data-testid="global-biyoo-container"]');
            const puppet = document.querySelector('[data-testid="biyoo-live-puppet"]');
            const cRect = container.getBoundingClientRect();
            const pRect = puppet.getBoundingClientRect();
            
            // Point 1: 15px to the left of Biyoo container
            const ptLeft = { x: Math.round(cRect.left - 15), y: Math.round(cRect.top + cRect.height / 2) };
            const elLeft = document.elementFromPoint(ptLeft.x, ptLeft.y);
            
            // Point 2: 15px above Biyoo container
            const ptTop = { x: Math.round(cRect.left + cRect.width / 2), y: Math.round(cRect.top - 15) };
            const elTop = document.elementFromPoint(ptTop.x, ptTop.y);
            
            // Point 3: Inside Biyoo container box padding area (where pointer-events:none applies)
            // Top-left corner of the container box
            const ptInsidePadding = { x: Math.round(cRect.left + 5), y: Math.round(cRect.top + 5) };
            const elInsidePadding = document.elementFromPoint(ptInsidePadding.x, ptInsidePadding.y);

            // Point 4: Directly inside the puppet (pointer-events-auto)
            const ptPuppet = { x: Math.round(pRect.left + pRect.width / 2), y: Math.round(pRect.top + pRect.height / 2) };
            const elPuppet = document.elementFromPoint(ptPuppet.x, ptPuppet.y);

            const getDesc = (el) => {
                if (!el) return null;
                const cls = typeof el.className === 'string' ? el.className : (el.className?.baseVal || '');
                return `<${el.tagName.toLowerCase()} id="${el.id || ''}" class="${cls.slice(0, 30)}">`;
            };

            return {
                ptLeft: { ...ptLeft, element: getDesc(elLeft), isBiyoo: elLeft ? elLeft.closest('[data-testid="global-biyoo-container"]') !== null : false },
                ptTop: { ...ptTop, element: getDesc(elTop), isBiyoo: elTop ? elTop.closest('[data-testid="global-biyoo-container"]') !== null : false },
                ptInsidePadding: { ...ptInsidePadding, element: getDesc(elInsidePadding), isBiyoo: elInsidePadding ? elInsidePadding.closest('[data-testid="biyoo-live-puppet"]') !== null : false },
                ptPuppet: { ...ptPuppet, element: getDesc(elPuppet), isBiyoo: elPuppet ? elPuppet.closest('[data-testid="biyoo-live-puppet"]') !== null : false }
            };
        }""")
        print(f"Point 1 (15px left of Biyoo container: {efp_results['ptLeft']['x']}, {efp_results['ptLeft']['y']}): lands on {efp_results['ptLeft']['element']} [captured by Biyoo: {efp_results['ptLeft']['isBiyoo']}]")
        print(f"Point 2 (15px above Biyoo container: {efp_results['ptTop']['x']}, {efp_results['ptTop']['y']}): lands on {efp_results['ptTop']['element']} [captured by Biyoo: {efp_results['ptTop']['isBiyoo']}]")
        print(f"Point 3 (Inside container empty box: {efp_results['ptInsidePadding']['x']}, {efp_results['ptInsidePadding']['y']}): lands on {efp_results['ptInsidePadding']['element']} [captured by Biyoo: {efp_results['ptInsidePadding']['isBiyoo']}]")
        print(f"Point 4 (Directly on puppet body: {efp_results['ptPuppet']['x']}, {efp_results['ptPuppet']['y']}): lands on {efp_results['ptPuppet']['element']} [captured by Biyoo: {efp_results['ptPuppet']['isBiyoo']}]")

        # -------------------------------------------------------------
        # ITEM 6.3: PERFORMANCE TRACE DELTAS (WITH AND WITHOUT BIYOO)
        # -------------------------------------------------------------
        print("\n--- ITEM 6.3: PERFORMANCE TRACE DELTAS (CLS & LONG TASKS) ---")
        
        # Test performance WITH Biyoo
        perf_page_with = await browser.new_page(viewport={"width": 1440, "height": 900})
        await perf_page_with.add_init_script("""
            window.__perfMetrics = { cls: 0, longTasks: 0 };
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (!entry.hadRecentInput) window.__perfMetrics.cls += entry.value;
                }
            }).observe({ type: 'layout-shift', buffered: true });
            new PerformanceObserver((entryList) => {
                window.__perfMetrics.longTasks += entryList.getEntries().length;
            }).observe({ type: 'longtask', buffered: true });
        """)
        await perf_page_with.goto(BASE_URL, wait_until="networkidle")
        await asyncio.sleep(2.5)
        metrics_with = await perf_page_with.evaluate("window.__perfMetrics")
        await perf_page_with.close()

        # Test performance WITHOUT Biyoo (suppressed via CSS display: none / removal)
        perf_page_without = await browser.new_page(viewport={"width": 1440, "height": 900})
        await perf_page_without.add_init_script("""
            window.__perfMetrics = { cls: 0, longTasks: 0 };
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (!entry.hadRecentInput) window.__perfMetrics.cls += entry.value;
                }
            }).observe({ type: 'layout-shift', buffered: true });
            new PerformanceObserver((entryList) => {
                window.__perfMetrics.longTasks += entryList.getEntries().length;
            }).observe({ type: 'longtask', buffered: true });
            
            // Suppress Biyoo mounting
            const style = document.createElement('style');
            style.textContent = '[data-testid="global-biyoo-container"] { display: none !important; }';
            document.documentElement.appendChild(style);
        """)
        await perf_page_without.goto(BASE_URL, wait_until="networkidle")
        await asyncio.sleep(2.5)
        metrics_without = await perf_page_without.evaluate("window.__perfMetrics")
        await perf_page_without.close()

        cls_with = round(metrics_with['cls'], 4)
        cls_without = round(metrics_without['cls'], 4)
        lt_with = metrics_with['longTasks']
        lt_without = metrics_without['longTasks']
        delta_cls = round(cls_with - cls_without, 4)
        delta_lt = lt_with - lt_without

        print(f"Without Biyoo -> CLS: {cls_without}, Long Tasks: {lt_without}")
        print(f"With Biyoo    -> CLS: {cls_with}, Long Tasks: {lt_with}")
        print(f"Delta (With - Without) -> CLS: {delta_cls:+.4f}, Long Tasks: {delta_lt:+d}")

        # -------------------------------------------------------------
        # ITEM 6.4: LATE NIGHT & RETURN VISITOR GREETINGS
        # -------------------------------------------------------------
        print("\n--- ITEM 6.4: LATE NIGHT & RETURN VISITOR GREETINGS ---")
        
        # Test 1: Late night with ?fakeHour=3
        ln_ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        ln_page = await ln_ctx.new_page()
        ln_page.on("console", on_console_msg)
        ln_page.on("pageerror", on_page_error)
        
        await ln_page.goto(f"{BASE_URL}/?fakeHour=3", wait_until="networkidle")
        await ln_page.wait_for_selector('[data-testid="biyoo-speech-bubble"]', timeout=8000)
        
        ln_result = await ln_page.evaluate("""() => {
            const hist = window.__biyooEngine.getRawTriggerHistory();
            const ln = hist.find(h => h.type === 'late_night');
            const bubbleEl = document.querySelector('[data-testid="biyoo-speech-bubble"] span');
            return {
                timestamp: ln ? ln.timeString : null,
                isoString: ln ? ln.isoString : null,
                expression: ln ? ln.expression : null,
                bubbleText: bubbleEl ? bubbleEl.textContent.trim() : (ln ? ln.bubbleText : null),
                accepted: ln ? ln.accepted : null
            };
        }""")
        print(f"Late Night (?fakeHour=3):")
        print(f"  Timestamp:   {ln_result['timestamp']} ({ln_result['isoString']})")
        print(f"  Expression:  {ln_result['expression']}")
        print(f"  Bubble Text: \"{ln_result['bubbleText']}\"")
        print(f"  Accepted:    {ln_result['accepted']}")
        await ln_ctx.close()

        # Test 2: Return visitor with seeded visit count = 1 (current visit = 2)
        v2_ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        v2_page = await v2_ctx.new_page()
        v2_page.on("console", on_console_msg)
        v2_page.on("pageerror", on_page_error)
        
        # Seed localStorage before navigating
        await v2_page.add_init_script("""
            localStorage.setItem('biyoo_visit_count', '1');
            sessionStorage.clear();
        """)
        await v2_page.goto(f"{BASE_URL}/?fakeHour=12", wait_until="networkidle")
        await v2_page.wait_for_selector('[data-testid="biyoo-speech-bubble"]', timeout=8000)
        
        v2_result = await v2_page.evaluate("""() => {
            const hist = window.__biyooEngine.getRawTriggerHistory();
            const rv = hist.find(h => h.type === 'return_visitor');
            const bubbleEl = document.querySelector('[data-testid="biyoo-speech-bubble"] span');
            const visitCount = localStorage.getItem('biyoo_visit_count');
            return {
                timestamp: rv ? rv.timeString : null,
                isoString: rv ? rv.isoString : null,
                expression: rv ? rv.expression : null,
                bubbleText: bubbleEl ? bubbleEl.textContent.trim() : (rv ? rv.bubbleText : null),
                accepted: rv ? rv.accepted : null,
                visitCount
            };
        }""")
        print(f"Return Visitor (Seeded visitCount=1, Current visit=2):")
        print(f"  Timestamp:   {v2_result['timestamp']} ({v2_result['isoString']})")
        print(f"  Expression:  {v2_result['expression']}")
        print(f"  Bubble Text: \"{v2_result['bubbleText']}\"")
        print(f"  Accepted:    {v2_result['accepted']}")
        print(f"  Stored Count:{v2_result['visitCount']}")
        await v2_ctx.close()

        # Test 3: Return visitor with seeded visit count = 2 (current visit = 3)
        v3_ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        v3_page = await v3_ctx.new_page()
        v3_page.on("console", on_console_msg)
        v3_page.on("pageerror", on_page_error)
        
        await v3_page.add_init_script("""
            localStorage.setItem('biyoo_visit_count', '2');
            sessionStorage.clear();
        """)
        await v3_page.goto(f"{BASE_URL}/?fakeHour=12", wait_until="networkidle")
        await v3_page.wait_for_selector('[data-testid="biyoo-speech-bubble"]', timeout=8000)
        
        v3_result = await v3_page.evaluate("""() => {
            const hist = window.__biyooEngine.getRawTriggerHistory();
            const rv = hist.find(h => h.type === 'return_visitor');
            const bubbleEl = document.querySelector('[data-testid="biyoo-speech-bubble"] span');
            const visitCount = localStorage.getItem('biyoo_visit_count');
            return {
                timestamp: rv ? rv.timeString : null,
                isoString: rv ? rv.isoString : null,
                expression: rv ? rv.expression : null,
                bubbleText: bubbleEl ? bubbleEl.textContent.trim() : (rv ? rv.bubbleText : null),
                accepted: rv ? rv.accepted : null,
                visitCount
            };
        }""")
        print(f"Return Visitor (Seeded visitCount=2, Current visit=3):")
        print(f"  Timestamp:   {v3_result['timestamp']} ({v3_result['isoString']})")
        print(f"  Expression:  {v3_result['expression']}")
        print(f"  Bubble Text: \"{v3_result['bubbleText']}\"")
        print(f"  Accepted:    {v3_result['accepted']}")
        print(f"  Stored Count:{v3_result['visitCount']}")
        await v3_ctx.close()

        # -------------------------------------------------------------
        # ITEM 6.5: QUIET TOGGLE PERSISTS ACROSS RELOAD
        # -------------------------------------------------------------
        print("\n--- ITEM 6.5: QUIET TOGGLE PERSISTENCE ---")
        quiet_ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        quiet_page = await quiet_ctx.new_page()
        quiet_page.on("console", on_console_msg)
        quiet_page.on("pageerror", on_page_error)
        
        await quiet_page.goto(BASE_URL, wait_until="networkidle")
        await quiet_page.wait_for_selector('#biyoo-quiet-toggle', timeout=8000)
        
        initial_state = await quiet_page.evaluate("""() => {
            return {
                quietMode: window.__biyooEngine.quietMode,
                stored: localStorage.getItem('biyoo_quiet_mode')
            };
        }""")
        print(f"Initial State: quietMode={initial_state['quietMode']}, localStorage={initial_state['stored']}")

        # Click the toggle button
        await quiet_page.click('#biyoo-quiet-toggle')
        await asyncio.sleep(0.3)
        
        toggled_state = await quiet_page.evaluate("""() => {
            return {
                quietMode: window.__biyooEngine.quietMode,
                stored: localStorage.getItem('biyoo_quiet_mode')
            };
        }""")
        print(f"After Click:   quietMode={toggled_state['quietMode']}, localStorage={toggled_state['stored']}")

        # Reload the page
        await quiet_page.reload(wait_until="networkidle")
        await quiet_page.wait_for_selector('#biyoo-quiet-toggle', timeout=8000)
        await asyncio.sleep(0.5)

        reloaded_state = await quiet_page.evaluate("""() => {
            return {
                quietMode: window.__biyooEngine.quietMode,
                stored: localStorage.getItem('biyoo_quiet_mode')
            };
        }""")
        print(f"After Reload:  quietMode={reloaded_state['quietMode']}, localStorage={reloaded_state['stored']}")
        print(f"Persistence across reload: {'PASSED' if reloaded_state['quietMode'] is True and reloaded_state['stored'] == 'true' else 'FAILED'}")
        
        # Reset back to false for cleanliness
        await quiet_page.evaluate("localStorage.removeItem('biyoo_quiet_mode')")
        await quiet_ctx.close()

        # -------------------------------------------------------------
        # ITEM 6.6: ARM POINT DIRECTION CHECK (TARGET LEFT VS RIGHT)
        # -------------------------------------------------------------
        print("\n--- ITEM 6.6: ARM POINT DIRECTION CHECK ---")
        arm_ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        arm_page = await arm_ctx.new_page()
        arm_page.on("console", on_console_msg)
        arm_page.on("pageerror", on_page_error)
        
        await arm_page.goto(BASE_URL, wait_until="networkidle")
        await arm_page.wait_for_selector('[data-testid="biyoo-live-puppet"]', timeout=8000)

        # 1. Target LEFT of Biyoo (Hero CTA)
        cta_el = await arm_page.query_selector('#hero-scene a[data-biyoo-point]')
        cta_box = await cta_el.bounding_box()
        await arm_page.evaluate("window.__biyooEngine.resetBubbleCooldown()")
        await arm_page.mouse.move(cta_box['x'] + cta_box['width'] / 2, cta_box['y'] + cta_box['height'] / 2)
        await asyncio.sleep(2.8)

        left_test_result = await arm_page.evaluate("""() => {
            const hist = window.__biyooEngine.getRawTriggerHistory();
            const last = hist.filter(h => h.type === 'cursor_still').pop();
            const armL = document.querySelector('[data-testid="biyoo-arm-l-group"]');
            const armR = document.querySelector('[data-testid="biyoo-arm-r-group"]');
            return {
                pointingArm: window.__biyooEngine.pointingArm,
                triggerArm: last ? last.pointingArm : null,
                armLTransform: armL ? armL.style.transform : null,
                armRTransform: armR ? armR.style.transform : null
            };
        }""")

        # 2. Target RIGHT of Biyoo: create a small button right of Biyoo's center
        await arm_page.evaluate("""() => {
            const biyoo = document.querySelector('[data-testid="biyoo-live-puppet"]');
            const bRect = biyoo.getBoundingClientRect();
            const btn = document.createElement('button');
            btn.id = 'test-target-right';
            btn.setAttribute('data-biyoo-point', 'true');
            btn.textContent = 'Right Target';
            btn.style.position = 'fixed';
            btn.style.left = (bRect.right - 10) + 'px';
            btn.style.top = bRect.top + 'px';
            btn.style.zIndex = '9999';
            btn.style.width = '30px';
            btn.style.height = '30px';
            document.body.appendChild(btn);
            window.__biyooEngine.resetBubbleCooldown();
        }""")
        right_btn = await arm_page.query_selector('#test-target-right')
        r_box = await right_btn.bounding_box()
        await arm_page.mouse.move(r_box['x'] + r_box['width'] / 2, r_box['y'] + r_box['height'] / 2)
        await asyncio.sleep(2.8)

        right_test_result = await arm_page.evaluate("""() => {
            const hist = window.__biyooEngine.getRawTriggerHistory();
            const last = hist.filter(h => h.type === 'cursor_still').pop();
            const armL = document.querySelector('[data-testid="biyoo-arm-l-group"]');
            const armR = document.querySelector('[data-testid="biyoo-arm-r-group"]');
            return {
                pointingArm: window.__biyooEngine.pointingArm,
                triggerArm: last ? last.pointingArm : null,
                armLTransform: armL ? armL.style.transform : null,
                armRTransform: armR ? armR.style.transform : null
            };
        }""")

        print(f"Target LEFT of Biyoo (Hero CTA):")
        print(f"  Raised Arm: '{left_test_result['triggerArm']}' (arm group transform: {left_test_result['armLTransform']})")
        print(f"Target RIGHT of Biyoo (Target to right of center):")
        print(f"  Raised Arm: '{right_test_result['triggerArm']}' (arm group transform: {right_test_result['armRTransform']})")
        await arm_ctx.close()

        # -------------------------------------------------------------
        # ITEM 6.7: CONSOLE ERRORS CHECK
        # -------------------------------------------------------------
        print("\n--- ITEM 6.7: CONSOLE ERRORS CHECK ---")
        print(f"Total Console Errors Encountered: {len(console_errors)}")
        if console_errors:
            for err in console_errors:
                print(f"  - {err}")
        else:
            print("Zero console errors confirmed across all runs.")

        await browser.close()
        print("\n=== VERIFICATION COMPLETE ===")

if __name__ == "__main__":
    asyncio.run(run_step5_verification())

