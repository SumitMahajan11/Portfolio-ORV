import asyncio
import os
import shutil
from playwright.async_api import async_playwright

def intersects(r1, r2):
    if not r1 or not r2:
        return False
    x_overlap = max(0, min(r1['right'], r2['right']) - max(r1['left'], r2['left']))
    y_overlap = max(0, min(r1['bottom'], r2['bottom']) - max(r1['top'], r2['top']))
    return x_overlap > 0.5 and y_overlap > 0.5

async def run_round4_complete():
    os.makedirs('public/biyoo', exist_ok=True)
    artifact_dir = r"C:\Users\SUMIT\.gemini\antigravity\brain\25ce1abe-a021-46a1-9e4e-566f68d42680"

    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # =====================================================================
        # PART 1: Z-INDEX & STACKING CONTEXT AUDIT
        # =====================================================================
        print("=================================================================")
        print("PART 1: COMPUTED Z-INDEX & STACKING CONTEXT REPORT")
        print("=================================================================")

        page = await browser.new_page(viewport={'width': 1440, 'height': 900})
        await page.goto('http://localhost:3000', wait_until='networkidle')
        await page.wait_for_selector('[data-testid="biyoo-live-puppet"]')

        # Trigger constellation card & late-night bubble
        await page.evaluate('''() => {
            window.dispatchEvent(new CustomEvent("constellation:trigger", { detail: { context: "time-night" } }));
            if (window.__biyooEngine) {
                window.__biyooEngine.resetBubbleCooldown();
                window.__biyooEngine.triggerLateNight();
            }
        }''')
        await page.wait_for_timeout(300)

        stacking_info = await page.evaluate('''() => {
            const checkStacking = (el, name) => {
                if (!el) return { name, found: false };
                const cs = window.getComputedStyle(el);
                
                // Stacking context criteria
                const isStackingContext = (
                    el === document.documentElement ||
                    cs.position === 'fixed' ||
                    cs.position === 'sticky' ||
                    (cs.position !== 'static' && cs.zIndex !== 'auto') ||
                    parseFloat(cs.opacity) < 1 ||
                    cs.transform !== 'none' ||
                    cs.filter !== 'none' ||
                    cs.willChange.includes('transform') ||
                    cs.willChange.includes('opacity') ||
                    cs.isolation === 'isolate'
                );

                return {
                    name,
                    found: true,
                    tagName: el.tagName,
                    id: el.id,
                    className: el.className,
                    position: cs.position,
                    zIndex: cs.zIndex,
                    opacity: cs.opacity,
                    transform: cs.transform,
                    createsStackingContext: isStackingContext
                };
            };

            const header = document.querySelector('header');
            const constellation = document.querySelector('[aria-label="Dismiss constellation comment"]')?.closest('.fixed') || document.querySelector('.border-star')?.closest('.fixed');
            const heroScene = document.querySelector('#hero-scene');
            const cta1 = document.querySelector('a[href="#scenario-select"]');
            const cta2 = document.querySelector('a[href="#readers-record"]');
            const biyooContainer = document.querySelector('[data-testid="global-biyoo-container"]');
            const bubble = document.querySelector('[data-testid="biyoo-speech-bubble"]');
            const toggle = document.querySelector('#biyoo-quiet-toggle');
            const prompt = document.querySelector('#sound-permission-prompt');

            return {
                header: checkStacking(header, 'header/nav'),
                constellation: checkStacking(constellation, 'Constellation card'),
                heroScene: checkStacking(heroScene, '#hero-scene'),
                cta1: checkStacking(cta1, 'CTA Link (Scenario Select)'),
                cta2: checkStacking(cta2, 'CTA Link (Reader Record)'),
                biyooContainer: checkStacking(biyooContainer, 'Biyoo container'),
                bubble: checkStacking(bubble, 'Biyoo Bubble'),
                toggle: checkStacking(toggle, 'Quiet Toggle'),
                prompt: checkStacking(prompt, 'Sound Prompt')
            };
        }''')

        for k, v in stacking_info.items():
            print(f"  {v['name']:<25}: zIndex={v.get('zIndex')}, pos={v.get('position')}, createsStackingContext={v.get('createsStackingContext')}")

        # Now check Q&A panel stacking context
        await page.locator('[data-testid="biyoo-silhouette-hitbox"]').dispatch_event('click')
        await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        qa_panel_stack = await page.evaluate('''() => {
            const panel = document.querySelector('[data-testid="biyoo-qa-panel"]');
            if (!panel) return null;
            const cs = window.getComputedStyle(panel);
            return {
                name: 'Q&A Panel',
                zIndex: cs.zIndex,
                pos: cs.position,
                createsStackingContext: cs.position === 'fixed' || cs.position === 'sticky' || (cs.position !== 'static' && cs.zIndex !== 'auto')
            };
        }''')
        print(f"  {qa_panel_stack['name']:<25}: zIndex={qa_panel_stack.get('zIndex')}, pos={qa_panel_stack.get('pos')}, createsStackingContext={qa_panel_stack.get('createsStackingContext')}")
        await page.close()

        # =====================================================================
        # PART 2: ELEMENTFROMPOINT AUDIT (360x640, 375x667, 390x844, 1440x900)
        # =====================================================================
        print("\n=================================================================")
        print("PART 2: ELEMENTFROMPOINT AUDIT ACROSS 4 VIEWPORTS")
        print("=================================================================")

        vps = [
            {'w': 360, 'h': 640},
            {'w': 375, 'h': 667},
            {'w': 390, 'h': 844},
            {'w': 1440, 'h': 900}
        ]

        for vp in vps:
            page = await browser.new_page(viewport={'width': vp['w'], 'height': vp['h']})
            await page.goto('http://localhost:3000', wait_until='networkidle')
            await page.wait_for_selector('[data-testid="biyoo-live-puppet"]')

            # Trigger late night bubble and sound prompt
            await page.evaluate('''() => {
                window.dispatchEvent(new CustomEvent("sound:show-prompt"));
                if (window.__biyooEngine) {
                    window.__biyooEngine.resetBubbleCooldown();
                    window.__biyooEngine.triggerLateNight();
                }
            }''')
            await page.wait_for_timeout(300)

            # Test silhouette center, toggle center, bubble X
            hits = await page.evaluate('''() => {
                const getHit = (el) => {
                    if (!el) return null;
                    const r = el.getBoundingClientRect();
                    const cx = r.left + r.width / 2;
                    const cy = r.top + r.height / 2;
                    const hit = document.elementFromPoint(cx, cy);
                    return {
                        point: { x: Math.round(cx), y: Math.round(cy) },
                        hitTag: hit ? hit.tagName : null,
                        hitTestId: hit ? hit.getAttribute('data-testid') : null,
                        hitId: hit ? hit.id : null,
                        hitClass: hit ? hit.className : null,
                        isTargetOrChild: hit ? (el === hit || el.contains(hit)) : false
                    };
                };

                const silhouette = document.querySelector('[data-testid="biyoo-silhouette-hitbox"]');
                const toggle = document.querySelector('#biyoo-quiet-toggle');
                const bubbleX = document.querySelector('[data-testid="biyoo-speech-bubble"] span:last-of-type') || document.querySelector('[data-testid="biyoo-speech-bubble"]');

                return {
                    silhouette: getHit(silhouette),
                    toggle: getHit(toggle),
                    bubbleX: getHit(bubbleX)
                };
            }''')

            print(f"\n--- Viewport {vp['w']}x{vp['h']} elementFromPoint ---")
            print(f"  Biyoo Silhouette Center : {hits['silhouette']['point']} -> hit={hits['silhouette']['hitTag']} (testId={hits['silhouette']['hitTestId']}) -> {'PASS' if hits['silhouette']['isTargetOrChild'] else 'FAIL'}")
            print(f"  Toggle Center           : {hits['toggle']['point']} -> hit={hits['toggle']['hitTag']} (id={hits['toggle']['hitId']}) -> {'PASS' if hits['toggle']['isTargetOrChild'] else 'FAIL'}")
            print(f"  Bubble X                : {hits['bubbleX']['point']} -> hit={hits['bubbleX']['hitTag']} (class={hits['bubbleX']['hitClass']}) -> {'PASS' if hits['bubbleX']['isTargetOrChild'] else 'FAIL'}")
            assert hits['silhouette']['isTargetOrChild']
            assert hits['toggle']['isTargetOrChild']
            assert hits['bubbleX']['isTargetOrChild']

            # Open Q&A panel and check panel X
            await page.locator('[data-testid="biyoo-silhouette-hitbox"]').dispatch_event('click')
            await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')

            panel_x_hit = await page.evaluate('''() => {
                const closeBtn = document.querySelector('[aria-label="Close question dialog"]');
                const r = closeBtn.getBoundingClientRect();
                const cx = r.left + r.width / 2;
                const cy = r.top + r.height / 2;
                const hit = document.elementFromPoint(cx, cy);
                return {
                    point: { x: Math.round(cx), y: Math.round(cy) },
                    hitTag: hit ? hit.tagName : null,
                    isCloseBtn: hit ? (closeBtn === hit || closeBtn.contains(hit)) : false
                };
            }''')
            print(f"  Panel Close Button (X)  : {panel_x_hit['point']} -> hit={panel_x_hit['hitTag']} -> {'PASS' if panel_x_hit['isCloseBtn'] else 'FAIL'}")
            assert panel_x_hit['isCloseBtn']

            # Close panel
            await page.locator('[aria-label="Close question dialog"]').click()
            await page.wait_for_selector('[data-testid="biyoo-qa-panel"]', state='detached')

            # Scrolled 300px nav link test
            await page.evaluate("() => window.scrollTo(0, 300)")
            await page.wait_for_timeout(200)

            scrolled_nav = await page.evaluate('''() => {
                const navLinks = Array.from(document.querySelectorAll('header a'));
                return navLinks.map(a => {
                    const r = a.getBoundingClientRect();
                    const cx = r.left + r.width / 2;
                    const cy = r.top + r.height / 2;
                    const hit = document.elementFromPoint(cx, cy);
                    const isHeader = hit ? (document.querySelector('header').contains(hit)) : false;
                    const isHero = hit ? (hit.closest('#hero-scene') !== null) : false;
                    return {
                        text: a.innerText.trim(),
                        point: { x: Math.round(cx), y: Math.round(cy) },
                        hitTag: hit ? hit.tagName : null,
                        isHeader,
                        isHero
                    };
                });
            }''')
            print(f"  Scrolled 300px Nav Link Hit Tests:")
            for nav in scrolled_nav:
                print(f"    Nav '{nav['text']}' at {nav['point']}: isHeader={nav['isHeader']}, isHero={nav['isHero']} -> {'PASS' if nav['isHeader'] and not nav['isHero'] else 'FAIL'}")
                assert nav['isHeader'] and not nav['isHero']

            await page.close()

        # =====================================================================
        # PART 3: SMALL PHONES AUDIT (<700px tall: 360x640, 375x667)
        # =====================================================================
        print("\n=================================================================")
        print("PART 3: SMALL PHONES AUDIT (<700px tall: 360x640, 375x667)")
        print("=================================================================")

        for vp in [{'w': 360, 'h': 640}, {'w': 375, 'h': 667}]:
            page = await browser.new_page(viewport={'width': vp['w'], 'height': vp['h']})
            await page.goto('http://localhost:3000', wait_until='networkidle')
            await page.wait_for_selector('[data-testid="biyoo-live-puppet"]')

            # Trigger late night bubble and sound prompt
            await page.evaluate('''() => {
                window.dispatchEvent(new CustomEvent("sound:show-prompt"));
                if (window.__biyooEngine) {
                    window.__biyooEngine.resetBubbleCooldown();
                    window.__biyooEngine.triggerLateNight();
                }
            }''')
            await page.wait_for_timeout(300)

            boxes = await page.evaluate('''() => {
                const roundBox = (r) => ({
                    left: Math.round(r.left * 10) / 10,
                    right: Math.round(r.right * 10) / 10,
                    top: Math.round(r.top * 10) / 10,
                    bottom: Math.round(r.bottom * 10) / 10,
                    width: Math.round(r.width * 10) / 10,
                    height: Math.round(r.height * 10) / 10
                });

                const biyoo = document.querySelector('[data-testid="biyoo-live-puppet"]');
                const bubble = document.querySelector('[data-testid="biyoo-speech-bubble"]');
                const toggle = document.querySelector('#biyoo-quiet-toggle');
                const prompt = document.querySelector('#sound-permission-prompt');
                const cta1 = document.querySelector('a[href="#scenario-select"]');
                const cta2 = document.querySelector('a[href="#readers-record"]');
                const navLinks = Array.from(document.querySelectorAll('header a'));

                return {
                    biyoo: biyoo ? roundBox(biyoo.getBoundingClientRect()) : null,
                    bubble: bubble ? roundBox(bubble.getBoundingClientRect()) : null,
                    toggle: toggle ? roundBox(toggle.getBoundingClientRect()) : null,
                    prompt: prompt ? roundBox(prompt.getBoundingClientRect()) : null,
                    cta1: cta1 ? roundBox(cta1.getBoundingClientRect()) : null,
                    cta2: cta2 ? roundBox(cta2.getBoundingClientRect()) : null,
                    navLinks: navLinks.map(a => ({ text: a.innerText.trim(), box: roundBox(a.getBoundingClientRect()) }))
                };
            }''')

            print(f"\n--- Small Phone {vp['w']}x{vp['h']} Boxes ---")
            print(f"  Biyoo Box    : {boxes['biyoo']}")
            print(f"  Bubble Box   : {boxes['bubble']}")
            print(f"  Toggle Box   : {boxes['toggle']}")
            print(f"  Prompt Box   : {boxes['prompt']}")
            print(f"  CTA 1 Box    : {boxes['cta1']}")
            print(f"  CTA 2 Box    : {boxes['cta2']}")

            # Assert Biyoo size is 64px on small phones
            assert boxes['biyoo']['width'] == 64.0 and boxes['biyoo']['height'] == 64.0, f"Expected 64px, got {boxes['biyoo']}"
            # Assert Toggle is 28x28
            assert boxes['toggle']['width'] == 28.0 and boxes['toggle']['height'] == 28.0, f"Expected 28px, got {boxes['toggle']}"

            biyoo_owned = [
                ('BiyooBox', boxes['biyoo']),
                ('Bubble', boxes['bubble']),
                ('Toggle', boxes['toggle']),
                ('Prompt', boxes['prompt'])
            ]
            
            page_content = [
                ('CTA1', boxes['cta1']),
                ('CTA2', boxes['cta2'])
            ]
            for idx, nav in enumerate(boxes['navLinks']):
                page_content.append((f"Nav-{nav['text'] or idx}", nav['box']))

            collisions = []
            for b_name, b_box in biyoo_owned:
                if not b_box: continue
                for p_name, p_box in page_content:
                    if not p_box: continue
                    if intersects(b_box, p_box):
                        collisions.append((b_name, p_name))

            for i in range(len(biyoo_owned)):
                for j in range(i + 1, len(biyoo_owned)):
                    n1, b1 = biyoo_owned[i]
                    n2, b2 = biyoo_owned[j]
                    if b1 and b2 and intersects(b1, b2):
                        collisions.append((n1, n2))

            print(f"  Collisions Detected: {len(collisions)}")
            assert len(collisions) == 0, f"Collisions found at {vp['w']}x{vp['h']}: {collisions}"
            print("  PASS: Zero collisions on small phone viewport!")
            await page.close()

        # =====================================================================
        # PART 4: PANEL (<1024px) ZERO INTERSECTION WITH NAV & BIYOO FACE
        # =====================================================================
        print("\n=================================================================")
        print("PART 4: PANEL (<1024px) AUDIT (360x640, 375x667, 390x844, 768x1024)")
        print("=================================================================")

        panel_vps = [
            {'w': 360, 'h': 640},
            {'w': 375, 'h': 667},
            {'w': 390, 'h': 844},
            {'w': 768, 'h': 1024}
        ]

        for vp in panel_vps:
            page = await browser.new_page(viewport={'width': vp['w'], 'height': vp['h']})
            await page.goto('http://localhost:3000', wait_until='networkidle')
            await page.wait_for_selector('[data-testid="biyoo-live-puppet"]')

            # Open panel and ask question
            await page.locator('[data-testid="biyoo-silhouette-hitbox"]').dispatch_event('click')
            await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')
            input_el = page.locator('#biyoo-question-input')
            await input_el.fill('What is Ratify?')
            await page.keyboard.press('Enter')
            await page.wait_for_selector('[data-testid="biyoo-qa-answer"]')
            await page.wait_for_timeout(300)

            res = await page.evaluate('''() => {
                const roundBox = (r) => ({
                    left: Math.round(r.left * 10) / 10,
                    right: Math.round(r.right * 10) / 10,
                    top: Math.round(r.top * 10) / 10,
                    bottom: Math.round(r.bottom * 10) / 10,
                    width: Math.round(r.width * 10) / 10,
                    height: Math.round(r.height * 10) / 10
                });

                const panel = document.querySelector('[data-testid="biyoo-qa-panel"]').getBoundingClientRect();
                const face = document.querySelector('[data-testid="biyoo-face-group"]').getBoundingClientRect();
                const navLinks = Array.from(document.querySelectorAll('header a')).map(a => ({
                    text: a.innerText.trim(),
                    box: roundBox(a.getBoundingClientRect())
                }));

                return {
                    panelBox: roundBox(panel),
                    faceBox: roundBox(face),
                    navLinks
                };
            }''')

            print(f"\n--- Viewport {vp['w']}x{vp['h']} Panel Audit ---")
            print(f"  Panel Box     : {res['panelBox']}")
            print(f"  Biyoo Face Box: {res['faceBox']}")

            collisions = []
            if intersects(res['panelBox'], res['faceBox']):
                collisions.append(('Panel', 'BiyooFace'))

            for nav in res['navLinks']:
                if intersects(res['panelBox'], nav['box']):
                    collisions.append(('Panel', f"Nav-{nav['text']}"))

            print(f"  Collisions Detected: {len(collisions)}")
            assert len(collisions) == 0, f"Collisions found at {vp['w']}x{vp['h']}: {collisions}"
            print("  PASS: Zero collisions between panel, nav links, and Biyoo face!")
            await page.close()

        # =====================================================================
        # PART 5: EXPORT FOUR SEPARATE 1:1 FULL-SIZE PNGs (TASK 9)
        # =====================================================================
        print("\n=================================================================")
        print("PART 5: EXPORT FOUR SEPARATE FULL-SIZE 1:1 PNGs (TASK 9)")
        print("=================================================================")

        # Shot 1: 360x640 with late-night bubble showing
        p1 = await browser.new_page(viewport={'width': 360, 'height': 640})
        await p1.goto('http://localhost:3000', wait_until='networkidle')
        await p1.wait_for_selector('[data-testid="biyoo-live-puppet"]')
        await p1.evaluate('''() => {
            if (window.__biyooEngine) {
                window.__biyooEngine.resetBubbleCooldown();
                window.__biyooEngine.triggerLateNight();
            }
        }''')
        await p1.wait_for_timeout(400)
        shot1_path = 'public/biyoo/round4-360x640-latenight.png'
        await p1.screenshot(path=shot1_path, full_page=False)
        print(f"  Exported Shot 1: {shot1_path}")
        await p1.close()

        # Shot 2: 360x640 with panel open and an answer
        p2 = await browser.new_page(viewport={'width': 360, 'height': 640})
        await p2.goto('http://localhost:3000', wait_until='networkidle')
        await p2.wait_for_selector('[data-testid="biyoo-live-puppet"]')
        await p2.locator('[data-testid="biyoo-silhouette-hitbox"]').dispatch_event('click')
        await p2.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        in2 = p2.locator('#biyoo-question-input')
        await in2.fill('Who is Sumit?')
        await p2.keyboard.press('Enter')
        await p2.wait_for_selector('[data-testid="biyoo-qa-answer"]')
        await p2.wait_for_timeout(400)
        shot2_path = 'public/biyoo/round4-360x640-qa-answered.png'
        await p2.screenshot(path=shot2_path, full_page=False)
        print(f"  Exported Shot 2: {shot2_path}")
        await p2.close()

        # Shot 3: 390x844 with panel open
        p3 = await browser.new_page(viewport={'width': 390, 'height': 844})
        await p3.goto('http://localhost:3000', wait_until='networkidle')
        await p3.wait_for_selector('[data-testid="biyoo-live-puppet"]')
        await p3.locator('[data-testid="biyoo-silhouette-hitbox"]').dispatch_event('click')
        await p3.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        await p3.wait_for_timeout(400)
        shot3_path = 'public/biyoo/round4-390x844-qa-panel.png'
        await p3.screenshot(path=shot3_path, full_page=False)
        print(f"  Exported Shot 3: {shot3_path}")
        await p3.close()

        # Shot 4: 1440x900 answered with Biyoo's face visible
        p4 = await browser.new_page(viewport={'width': 1440, 'height': 900})
        await p4.goto('http://localhost:3000', wait_until='networkidle')
        await p4.wait_for_selector('[data-testid="biyoo-live-puppet"]')
        await p4.locator('[data-testid="biyoo-silhouette-hitbox"]').dispatch_event('click')
        await p4.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        in4 = p4.locator('#biyoo-question-input')
        await in4.fill('What is Ratify?')
        await p4.keyboard.press('Enter')
        await p4.wait_for_selector('[data-testid="biyoo-qa-answer"]')
        await p4.wait_for_timeout(400)
        shot4_path = 'public/biyoo/round4-1440x900-qa-answered.png'
        await p4.screenshot(path=shot4_path, full_page=False)
        print(f"  Exported Shot 4: {shot4_path}")
        await p4.close()

        # Copy exported images to artifact directory
        for s in [shot1_path, shot2_path, shot3_path, shot4_path]:
            dest = os.path.join(artifact_dir, os.path.basename(s))
            shutil.copyfile(s, dest)
            print(f"  Copied to artifact directory: {dest}")

        await browser.close()
        print("\nALL ROUND 4 VERIFICATION AUDITS & SCREENSHOTS COMPLETED SUCCESSFULLY!")

if __name__ == '__main__':
    asyncio.run(run_round4_complete())
