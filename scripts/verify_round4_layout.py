import asyncio
import json
from playwright.async_api import async_playwright

def intersects(r1, r2):
    x_overlap = max(0, min(r1['right'], r2['right']) - max(r1['left'], r2['left']))
    y_overlap = max(0, min(r1['bottom'], r2['bottom']) - max(r1['top'], r2['top']))
    return x_overlap > 0.5 and y_overlap > 0.5

async def test_round4():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        
        # =====================================================================
        # TASK 4 & 5: Small Phones Audit (360x640, 375x667)
        # =====================================================================
        print("=================================================================")
        print("TASK 5: SMALL PHONES AUDIT (360x640, 375x667) - ZERO INTERSECTIONS")
        print("=================================================================")
        
        for vp in [{'w': 360, 'h': 640}, {'w': 375, 'h': 667}]:
            page = await browser.new_page(viewport={'width': vp['w'], 'height': vp['h']})
            await page.goto('http://localhost:3000', wait_until='networkidle')
            await page.wait_for_selector('[data-testid="biyoo-live-puppet"]')
            
            # Trigger late night bubble
            await page.evaluate('''() => {
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

            print(f"\n--- Viewport {vp['w']}x{vp['h']} Boxes ---")
            print(f"  Biyoo Box    : {boxes['biyoo']}")
            print(f"  Bubble Box   : {boxes['bubble']}")
            print(f"  Toggle Box   : {boxes['toggle']}")
            print(f"  Prompt Box   : {boxes['prompt']}")
            print(f"  CTA 1 Box    : {boxes['cta1']}")
            print(f"  CTA 2 Box    : {boxes['cta2']}")

            # Check pairwise collisions
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
            # Check biyoo-owned vs page content
            for b_name, b_box in biyoo_owned:
                if not b_box: continue
                for p_name, p_box in page_content:
                    if not p_box: continue
                    if intersects(b_box, p_box):
                        collisions.append((b_name, p_name))

            # Check biyoo-owned vs each other
            for i in range(len(biyoo_owned)):
                for j in range(i + 1, len(biyoo_owned)):
                    n1, b1 = biyoo_owned[i]
                    n2, b2 = biyoo_owned[j]
                    if b1 and b2 and intersects(b1, b2):
                        collisions.append((n1, n2))

            print(f"  Total Collisions Detected: {len(collisions)}")
            if collisions:
                for c in collisions:
                    print(f"    [COLLISION] {c[0]} intersects {c[1]}")
            else:
                print("    PASS: Zero intersections between Biyoo, bubble, toggle, sound prompt and CTAs/nav links/each other.")
            assert len(collisions) == 0, f"Collisions found at {vp['w']}x{vp['h']}"
            await page.close()

        # =====================================================================
        # TASK 4: Z-Order & ElementFromPoint Audit
        # =====================================================================
        print("\n=================================================================")
        print("TASK 4: Z-ORDER & ELEMENTFROMPOINT AUDIT")
        print("=================================================================")
        
        viewports = [
            {'w': 360, 'h': 640},
            {'w': 375, 'h': 667},
            {'w': 390, 'h': 844},
            {'w': 1440, 'h': 900}
        ]

        for vp in viewports:
            page = await browser.new_page(viewport={'width': vp['w'], 'height': vp['h']})
            await page.goto('http://localhost:3000', wait_until='networkidle')
            await page.wait_for_selector('[data-testid="biyoo-live-puppet"]')
            
            # Trigger late night bubble
            await page.evaluate('''() => {
                if (window.__biyooEngine) {
                    window.__biyooEngine.resetBubbleCooldown();
                    window.__biyooEngine.triggerLateNight();
                }
            }''')
            await page.wait_for_timeout(300)

            # Check elementFromPoint at silhouette center, toggle center, bubble center
            hits = await page.evaluate('''() => {
                const getHit = (el) => {
                    if (!el) return null;
                    const r = el.getBoundingClientRect();
                    const cx = r.left + r.width / 2;
                    const cy = r.top + r.height / 2;
                    const hit = document.elementFromPoint(cx, cy);
                    return {
                        targetPoint: { x: Math.round(cx), y: Math.round(cy) },
                        hitTag: hit ? hit.tagName : null,
                        hitTestId: hit ? hit.getAttribute('data-testid') : null,
                        hitId: hit ? hit.id : null,
                        isTargetOrChild: hit ? (el === hit || el.contains(hit)) : false
                    };
                };

                const silhouette = document.querySelector('[data-testid="biyoo-silhouette-hitbox"]');
                const toggle = document.querySelector('#biyoo-quiet-toggle');
                const bubble = document.querySelector('[data-testid="biyoo-speech-bubble"]');

                return {
                    silhouetteHit: getHit(silhouette),
                    toggleHit: getHit(toggle),
                    bubbleHit: getHit(bubble)
                };
            }''')

            print(f"\n--- Viewport {vp['w']}x{vp['h']} elementFromPoint (Unscrolled) ---")
            print(f"  Biyoo Silhouette Center: {hits['silhouetteHit']['targetPoint']} -> Tag={hits['silhouetteHit']['hitTag']}, testId={hits['silhouetteHit']['hitTestId']} -> {'PASS' if hits['silhouetteHit']['isTargetOrChild'] else 'FAIL'}")
            print(f"  Toggle Center          : {hits['toggleHit']['targetPoint']} -> Tag={hits['toggleHit']['hitTag']}, id={hits['toggleHit']['hitId']} -> {'PASS' if hits['toggleHit']['isTargetOrChild'] else 'FAIL'}")
            print(f"  Bubble Center          : {hits['bubbleHit']['targetPoint']} -> Tag={hits['bubbleHit']['hitTag']}, testId={hits['bubbleHit']['hitTestId']} -> {'PASS' if hits['bubbleHit']['isTargetOrChild'] else 'FAIL'}")
            assert hits['silhouetteHit']['isTargetOrChild']
            assert hits['toggleHit']['isTargetOrChild']
            assert hits['bubbleHit']['isTargetOrChild']

            # Now open panel and check Panel X hit
            hitbox = page.locator('[data-testid="biyoo-silhouette-hitbox"]')
            await hitbox.dispatch_event('click')
            await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')
            
            panel_hit = await page.evaluate('''() => {
                const closeBtn = document.querySelector('[aria-label="Close question dialog"]');
                const r = closeBtn.getBoundingClientRect();
                const cx = r.left + r.width / 2;
                const cy = r.top + r.height / 2;
                const hit = document.elementFromPoint(cx, cy);
                return {
                    targetPoint: { x: Math.round(cx), y: Math.round(cy) },
                    hitTag: hit ? hit.tagName : null,
                    isCloseBtn: hit ? (closeBtn === hit || closeBtn.contains(hit)) : false
                };
            }''')
            print(f"  Panel Close Button (X) : {panel_hit['targetPoint']} -> Tag={panel_hit['hitTag']} -> {'PASS' if panel_hit['isCloseBtn'] else 'FAIL'}")
            assert panel_hit['isCloseBtn']

            # Now close panel and test scrolled 300px: nav links must return nav, not hero
            close_btn = page.locator('[aria-label="Close question dialog"]')
            await close_btn.click()
            await page.wait_for_selector('[data-testid="biyoo-qa-panel"]', state='detached')

            await page.evaluate("() => window.scrollTo(0, 300)")
            await page.wait_for_timeout(200)

            scrolled_nav = await page.evaluate('''() => {
                const navLinks = Array.from(document.querySelectorAll('header a'));
                return navLinks.map(a => {
                    const r = a.getBoundingClientRect();
                    const cx = r.left + r.width / 2;
                    const cy = r.top + r.height / 2;
                    const hit = document.elementFromPoint(cx, cy);
                    return {
                        text: a.innerText.trim(),
                        point: { x: Math.round(cx), y: Math.round(cy) },
                        hitTag: hit ? hit.tagName : null,
                        isNav: hit ? (a === hit || a.contains(hit) || document.querySelector('header').contains(hit)) : false,
                        isHero: hit ? (hit.closest('#hero-scene') !== null) : false
                    };
                });
            }''')
            print(f"  Scrolled 300px Nav Link Hit Tests:")
            for nav in scrolled_nav:
                print(f"    Nav '{nav['text']}' at {nav['point']}: isNav={nav['isNav']}, isHero={nav['isHero']} -> {'PASS' if nav['isNav'] and not nav['isHero'] else 'FAIL'}")
                assert nav['isNav'] and not nav['isHero']

            await page.close()

        # =====================================================================
        # TASK 6: Panel (<1024px) Zero Intersection with Nav and Biyoo Face
        # =====================================================================
        print("\n=================================================================")
        print("TASK 6: PANEL (<1024px) ZERO INTERSECTION WITH NAV & BIYOO FACE")
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
            
            # Open panel
            await page.locator('[data-testid="biyoo-silhouette-hitbox"]').dispatch_event('click')
            await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')
            
            # Ask query to expand panel
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
            # Check panel vs Biyoo face
            if intersects(res['panelBox'], res['faceBox']):
                collisions.append(('Panel', 'BiyooFace'))
            
            # Check panel vs nav links
            for nav in res['navLinks']:
                if intersects(res['panelBox'], nav['box']):
                    collisions.append(('Panel', f"Nav-{nav['text']}"))

            print(f"  Collisions Detected: {len(collisions)}")
            if collisions:
                for c in collisions:
                    print(f"    [COLLISION] {c[0]} intersects {c[1]}")
            else:
                print("    PASS: Zero intersection between Panel and every Nav link and Biyoo Face.")
            assert len(collisions) == 0, f"Collisions found at {vp['w']}x{vp['h']}"
            await page.close()

        await browser.close()
        print("\nALL TASKS 4, 5, 6 AUDIT CHECKS PASSED WITH 100% SUCCESS!")

if __name__ == '__main__':
    asyncio.run(test_round4())

