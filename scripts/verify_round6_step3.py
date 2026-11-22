import asyncio
from playwright.async_api import async_playwright

VIEWPORTS = [
    {"name": "1440x900", "w": 1440, "h": 900, "is_desktop": True},
    {"name": "1366x625", "w": 1366, "h": 625, "is_desktop": True},
    {"name": "1280x600", "w": 1280, "h": 600, "is_desktop": True},
    {"name": "768x1024", "w": 768, "h": 1024, "is_desktop": False},
    {"name": "390x844", "w": 390, "h": 844, "is_desktop": False},
    {"name": "360x740", "w": 360, "h": 740, "is_desktop": False},
    {"name": "360x640", "w": 360, "h": 640, "is_desktop": False},
]

def intersects(r1, r2):
    if not r1 or not r2:
        return False
    x_overlap = max(0.0, min(r1['right'], r2['right']) - max(r1['left'], r2['left']))
    y_overlap = max(0.0, min(r1['bottom'], r2['bottom']) - max(r1['top'], r2['top']))
    return x_overlap > 0.5 and y_overlap > 0.5

async def test_step3():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        print("=================================================================")
        print("STEP 6 ROUND 6 - ITEM 3: SOUND PROMPT VS Q&A PANEL VERIFICATION")
        print("=================================================================\n")

        for vp in VIEWPORTS:
            # Fresh context ensures clean localStorage
            context = await browser.new_context(viewport={"width": vp["w"], "height": vp["h"]})
            page = await context.new_page()

            await page.goto("http://localhost:3000", wait_until="domcontentloaded")
            await page.wait_for_selector('[data-testid="biyoo-live-puppet"]')

            # Trigger sound prompt to be visible before opening panel
            await page.evaluate('''() => {
                window.dispatchEvent(new CustomEvent("sound:show-prompt"));
            }''')
            await page.wait_for_timeout(200)

            # Check prompt is visible before panel open
            prompt_before = await page.evaluate('''() => {
                const el = document.querySelector('#sound-permission-prompt');
                if (!el) return false;
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            }''')

            # Force constellation card visible
            await page.evaluate('''() => {
                window.dispatchEvent(new CustomEvent("constellation:trigger", { detail: { context: "hero" } }));
            }''')
            await page.wait_for_timeout(200)

            # Open Q&A panel
            hitbox = page.locator('[data-testid="biyoo-silhouette-hitbox"]')
            await hitbox.click(force=True)
            await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')
            await page.wait_for_timeout(300)

            data = await page.evaluate('''() => {
                const roundBox = (r) => r ? ({
                    left: Math.round(r.left * 10) / 10,
                    right: Math.round(r.right * 10) / 10,
                    top: Math.round(r.top * 10) / 10,
                    bottom: Math.round(r.bottom * 10) / 10,
                    width: Math.round(r.width * 10) / 10,
                    height: Math.round(r.height * 10) / 10
                }) : null;

                const panel = document.querySelector('[data-testid="biyoo-qa-panel"]');
                const prompt = document.querySelector('#sound-permission-prompt');
                const promptVisible = prompt ? (window.getComputedStyle(prompt).display !== 'none' && window.getComputedStyle(prompt).visibility !== 'hidden' && window.getComputedStyle(prompt).opacity !== '0') : false;
                
                const bubble = document.querySelector('[data-testid="biyoo-speech-bubble"]');
                const toggle = document.querySelector('#biyoo-quiet-toggle');
                const biyoo = document.querySelector('[data-testid="biyoo-live-puppet"]');
                const card = document.querySelector('button[aria-label="Dismiss constellation comment"]')?.closest('.fixed');
                
                // Biyoo face (specifically the head / face ellipse inside SVG)
                const faceHitbox = document.querySelector('[data-testid="biyoo-silhouette-hitbox"]');
                
                const cta1 = document.querySelector('a[href="#scenario-select"]');
                const cta2 = document.querySelector('a[href="#readers-record"]');
                const navLinks = Array.from(document.querySelectorAll('header a')).map(a => ({
                    text: a.innerText.trim(),
                    box: roundBox(a.getBoundingClientRect())
                }));

                const heroTextRects = [];
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
                            for (const r of rects) {
                                if (r.width > 0 && r.height > 0) heroTextRects.push(r);
                            }
                        }
                    }
                }

                return {
                    panelBox: roundBox(panel?.getBoundingClientRect()),
                    promptVisible,
                    promptBox: promptVisible ? roundBox(prompt?.getBoundingClientRect()) : null,
                    bubbleBox: roundBox(bubble?.getBoundingClientRect()),
                    toggleBox: roundBox(toggle?.getBoundingClientRect()),
                    biyooBox: roundBox(biyoo?.getBoundingClientRect()),
                    faceBox: roundBox(faceHitbox?.getBoundingClientRect()),
                    cardBox: roundBox(card?.getBoundingClientRect()),
                    cta1Box: roundBox(cta1?.getBoundingClientRect()),
                    cta2Box: roundBox(cta2?.getBoundingClientRect()),
                    navLinks,
                    heroTextRects
                };
            }''')

            # Test close panel restores prompt
            close_btn = page.locator('button[aria-label="Close question dialog"]')
            await close_btn.click()
            await page.wait_for_timeout(200)

            prompt_after_close = await page.evaluate('''() => {
                const el = document.querySelector('#sound-permission-prompt');
                if (!el) return false;
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            }''')

            print(f"--- VIEWPORT: {vp['name']} (is_desktop: {vp['is_desktop']}) ---")
            print(f"  Sound prompt before panel open: {'VISIBLE' if prompt_before else 'NOT VISIBLE'}")
            print(f"  Sound prompt while panel open : {'VISIBLE (ERROR!)' if data['promptVisible'] else 'HIDDEN (PASS)'}")
            print(f"  Sound prompt after panel close: {'RESTORED (PASS)' if prompt_after_close else 'NOT RESTORED (ERROR!)'}")
            print(f"  Panel Box             : {data['panelBox']}")
            print(f"  Prompt Box            : {data['promptBox'] if data['promptVisible'] else 'null (hidden)'}")
            print(f"  Bubble Box            : {data['bubbleBox']}")
            print(f"  Toggle Box            : {data['toggleBox']}")
            print(f"  Biyoo Box             : {data['biyooBox']}")
            print(f"  Constellation Card Box: {data['cardBox']}")

            # Calculate intersections with panel
            p_box = data['panelBox']
            collisions = []

            # Check prompt
            if data['promptVisible'] and intersects(p_box, data['promptBox']):
                collisions.append(("Sound Prompt", data['promptBox']))

            if vp['is_desktop']:
                # At >= 1024px: zero intersection with prompt, card, biyoo, hero text lines, CTAs
                if intersects(p_box, data['cardBox']):
                    collisions.append(("Constellation Card", data['cardBox']))
                if intersects(p_box, data['biyooBox']):
                    collisions.append(("Biyoo Box", data['biyooBox']))
                if intersects(p_box, data['cta1Box']):
                    collisions.append(("CTA 1", data['cta1Box']))
                if intersects(p_box, data['cta2Box']):
                    collisions.append(("CTA 2", data['cta2Box']))
                for idx, hr in enumerate(data['heroTextRects']):
                    if intersects(p_box, hr):
                        collisions.append((f"Hero text line {idx}", hr))
            else:
                # Under 1024px: may overlap hero content, but NOT nav links, Biyoo face, prompt, or toggle
                if intersects(p_box, data['faceBox']):
                    collisions.append(("Biyoo Face", data['faceBox']))
                if intersects(p_box, data['toggleBox']):
                    collisions.append(("Toggle", data['toggleBox']))
                for nl in data['navLinks']:
                    if intersects(p_box, nl['box']):
                        collisions.append((f"Nav link '{nl['text']}'", nl['box']))

            print(f"  Intersection Count    : {len(collisions)}")
            if len(collisions) > 0:
                print(f"  COLLISIONS DETECTED:")
                for name, box in collisions:
                    print(f"    - Overlaps {name}: {box}")
            else:
                print(f"  PASS: Zero prohibited intersections on {vp['name']}!")
            print()

            await context.close()

        await browser.close()

asyncio.run(test_step3())
