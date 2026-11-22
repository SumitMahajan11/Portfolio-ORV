import asyncio
import os
from playwright.async_api import async_playwright

def intersects(r1, r2):
    if not r1 or not r2:
        return False
    x_overlap = max(0, min(r1['right'], r2['right']) - max(r1['left'], r2['left']))
    y_overlap = max(0, min(r1['bottom'], r2['bottom']) - max(r1['top'], r2['top']))
    return x_overlap > 0.5 and y_overlap > 0.5

async def test_layout():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # =====================================================================
        # REQUIREMENT 4: Short-Screen Desktop Audit (1366x625, 1280x600)
        # =====================================================================
        print("=================================================================")
        print("REQUIREMENT 4: SHORT-SCREEN DESKTOP AUDIT (1366x625, 1280x600)")
        print("=================================================================")

        desktop_vps = [
            {'w': 1366, 'h': 625},
            {'w': 1280, 'h': 600}
        ]

        for vp in desktop_vps:
            page = await browser.new_page(viewport={'width': vp['w'], 'height': vp['h']})
            await page.goto('http://localhost:3000', wait_until='networkidle')
            await page.wait_for_selector('[data-testid="biyoo-live-puppet"]')

            # Trigger late night bubble & sound prompt
            await page.evaluate('''() => {
                window.dispatchEvent(new CustomEvent("sound:show-prompt"));
                if (window.__biyooEngine) {
                    window.__biyooEngine.resetBubbleCooldown();
                    window.__biyooEngine.triggerLateNight();
                }
            }''')
            await page.wait_for_timeout(300)

            data = await page.evaluate('''() => {
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
                const toggleText = document.querySelector('.biyoo-toggle-text');
                const prompt = document.querySelector('#sound-permission-prompt');
                const cta1 = document.querySelector('a[href="#scenario-select"]');
                const cta2 = document.querySelector('a[href="#readers-record"]');
                const navLinks = Array.from(document.querySelectorAll('header a')).map(a => ({
                    text: a.innerText.trim(),
                    box: roundBox(a.getBoundingClientRect())
                }));

                // Get client rects for all hero text lines
                const textNodes = [];
                const heroScene = document.querySelector('#hero-scene');
                if (heroScene) {
                    const walker = document.createTreeWalker(heroScene, NodeFilter.SHOW_TEXT);
                    let node;
                    while ((node = walker.nextNode())) {
                        const parentTag = node.parentElement ? node.parentElement.tagName : '';
                        if (['H1', 'P', 'SPAN'].includes(parentTag) && node.textContent.trim().length > 0) {
                            const range = document.createRange();
                            range.selectNodeContents(node);
                            const rects = Array.from(range.getClientRects()).map(roundBox);
                            textNodes.push({
                                text: node.textContent.trim().slice(0, 30),
                                parentTag,
                                rects
                            });
                        }
                    }
                }

                return {
                    biyooBox: biyoo ? roundBox(biyoo.getBoundingClientRect()) : null,
                    bubbleBox: bubble ? roundBox(bubble.getBoundingClientRect()) : null,
                    toggleBox: toggle ? roundBox(toggle.getBoundingClientRect()) : null,
                    promptBox: prompt ? roundBox(prompt.getBoundingClientRect()) : null,
                    cta1Box: cta1 ? roundBox(cta1.getBoundingClientRect()) : null,
                    cta2Box: cta2 ? roundBox(cta2.getBoundingClientRect()) : null,
                    toggleTextVisible: toggleText ? window.getComputedStyle(toggleText).display !== 'none' : false,
                    navLinks,
                    textNodes
                };
            }''')

            print(f"\n--- Viewport {vp['w']}x{vp['h']} ---")
            print(f"  Biyoo Box         : {data['biyooBox']}")
            print(f"  Bubble Box        : {data['bubbleBox']}")
            print(f"  Toggle Box        : {data['toggleBox']}")
            print(f"  Toggle Text Shown : {data['toggleTextVisible']}")
            print(f"  Sound Prompt Box  : {data['promptBox']}")
            print(f"  CTA 1 Box         : {data['cta1Box']}")
            print(f"  CTA 2 Box         : {data['cta2Box']}")

            assert data['biyooBox']['width'] == 140.0 and data['biyooBox']['height'] == 140.0, f"Expected 140px Biyoo, got {data['biyooBox']}"
            assert data['toggleTextVisible'], "Expected toggle text 'Biyoo · on' to be visible"

            # Check collisions
            biyoo_owned = [
                ('BiyooBox', data['biyooBox']),
                ('Bubble', data['bubbleBox']),
                ('Toggle', data['toggleBox']),
                ('Prompt', data['promptBox'])
            ]

            page_content = [
                ('CTA1', data['cta1Box']),
                ('CTA2', data['cta2Box'])
            ]
            for nav in data['navLinks']:
                page_content.append((f"Nav-{nav['text']}", nav['box']))

            for tn in data['textNodes']:
                for idx, r in enumerate(tn['rects']):
                    page_content.append((f"Text-{tn['text']}-{idx}", r))

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
            if collisions:
                for c in collisions:
                    print(f"    [COLLISION] {c[0]} vs {c[1]}")
            assert len(collisions) == 0, f"Collisions found at {vp['w']}x{vp['h']}: {collisions}"
            print("  PASS: Zero collisions on short desktop viewport!")
            await page.close()

        # Re-verify 360x640 and 375x667
        print("\n--- Re-verifying 360x640 and 375x667 ---")
        for vp in [{'w': 360, 'h': 640}, {'w': 375, 'h': 667}]:
            page = await browser.new_page(viewport={'width': vp['w'], 'height': vp['h']})
            await page.goto('http://localhost:3000', wait_until='networkidle')
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
                const navLinks = Array.from(document.querySelectorAll('header a')).map(a => ({
                    text: a.innerText.trim(),
                    box: roundBox(a.getBoundingClientRect())
                }));

                return {
                    biyooBox: biyoo ? roundBox(biyoo.getBoundingClientRect()) : null,
                    bubbleBox: bubble ? roundBox(bubble.getBoundingClientRect()) : null,
                    toggleBox: toggle ? roundBox(toggle.getBoundingClientRect()) : null,
                    promptBox: prompt ? roundBox(prompt.getBoundingClientRect()) : null,
                    cta1Box: cta1 ? roundBox(cta1.getBoundingClientRect()) : null,
                    cta2Box: cta2 ? roundBox(cta2.getBoundingClientRect()) : null,
                    navLinks
                };
            }''')

            print(f"\n--- Viewport {vp['w']}x{vp['h']} ---")
            print(f"  Biyoo Box    : {boxes['biyooBox']}")
            print(f"  Bubble Box   : {boxes['bubbleBox']}")
            print(f"  Toggle Box   : {boxes['toggleBox']}")
            print(f"  Prompt Box   : {boxes['promptBox']}")
            assert boxes['biyooBox']['width'] == 64.0 and boxes['biyooBox']['height'] == 64.0
            assert boxes['toggleBox']['width'] == 28.0 and boxes['toggleBox']['height'] == 28.0

            biyoo_owned = [
                ('BiyooBox', boxes['biyooBox']),
                ('Bubble', boxes['bubbleBox']),
                ('Toggle', boxes['toggleBox']),
                ('Prompt', boxes['promptBox'])
            ]
            page_content = [
                ('CTA1', boxes['cta1Box']),
                ('CTA2', boxes['cta2Box'])
            ]
            for nav in boxes['navLinks']:
                page_content.append((f"Nav-{nav['text']}", nav['box']))

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
            print("  PASS: Zero collisions on mobile viewport!")
            await page.close()

        # =====================================================================
        # REQUIREMENT 5: Phone Sweep (320x568, 360x740, 360x800, 393x851)
        # =====================================================================
        print("\n=================================================================")
        print("REQUIREMENT 5: PHONE SWEEP (320x568, 360x740, 360x800, 393x851)")
        print("=================================================================")

        sweep_vps = [
            {'w': 320, 'h': 568},
            {'w': 360, 'h': 740},
            {'w': 360, 'h': 800},
            {'w': 393, 'h': 851}
        ]

        for vp in sweep_vps:
            page = await browser.new_page(viewport={'width': vp['w'], 'height': vp['h']})
            await page.goto('http://localhost:3000', wait_until='networkidle')
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
                const navLinks = Array.from(document.querySelectorAll('header a')).map(a => ({
                    text: a.innerText.trim(),
                    box: roundBox(a.getBoundingClientRect())
                }));

                return {
                    biyooBox: biyoo ? roundBox(biyoo.getBoundingClientRect()) : null,
                    bubbleBox: bubble ? roundBox(bubble.getBoundingClientRect()) : null,
                    toggleBox: toggle ? roundBox(toggle.getBoundingClientRect()) : null,
                    promptBox: prompt ? roundBox(prompt.getBoundingClientRect()) : null,
                    cta1Box: cta1 ? roundBox(cta1.getBoundingClientRect()) : null,
                    cta2Box: cta2 ? roundBox(cta2.getBoundingClientRect()) : null,
                    navLinks
                };
            }''')

            print(f"\n--- Viewport {vp['w']}x{vp['h']} ---")
            print(f"  Biyoo Box    : {boxes['biyooBox']}")
            print(f"  Bubble Box   : {boxes['bubbleBox']}")
            print(f"  Toggle Box   : {boxes['toggleBox']}")
            print(f"  Prompt Box   : {boxes['promptBox']}")
            print(f"  CTA 1 Box    : {boxes['cta1Box']}")
            print(f"  CTA 2 Box    : {boxes['cta2Box']}")

            biyoo_owned = [
                ('BiyooBox', boxes['biyooBox']),
                ('Bubble', boxes['bubbleBox']),
                ('Toggle', boxes['toggleBox']),
                ('Prompt', boxes['promptBox'])
            ]
            page_content = [
                ('CTA1', boxes['cta1Box']),
                ('CTA2', boxes['cta2Box'])
            ]
            for nav in boxes['navLinks']:
                page_content.append((f"Nav-{nav['text']}", nav['box']))

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
            if collisions:
                for c in collisions:
                    print(f"    [COLLISION] {c[0]} vs {c[1]}")
            assert len(collisions) == 0, f"Collisions found at {vp['w']}x{vp['h']}: {collisions}"
            print(f"  PASS: Zero collisions on {vp['w']}x{vp['h']}!")
            await page.close()

        await browser.close()
        print("\nALL LAYOUT & PHONE SWEEP AUDITS PASSED WITH ZERO COLLISIONS!")

if __name__ == '__main__':
    asyncio.run(test_layout())

