import asyncio
from playwright.async_api import async_playwright

PHONE_VIEWPORTS = [
    {"name": "360x740", "w": 360, "h": 740},
    {"name": "390x844", "w": 390, "h": 844},
    {"name": "393x851", "w": 393, "h": 851},
    {"name": "412x915", "w": 412, "h": 915},
]

def intersects(r1, r2):
    if not r1 or not r2:
        return False
    x_overlap = max(0.0, min(r1['right'], r2['right']) - max(r1['left'], r2['left']))
    y_overlap = max(0.0, min(r1['bottom'], r2['bottom']) - max(r1['top'], r2['top']))
    return x_overlap > 0.5 and y_overlap > 0.5

async def test_step4():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        print("=================================================================")
        print("STEP 6 ROUND 6 - ITEM 4: BUBBLE BESIDE HEAD & COLLISION AUDIT")
        print("=================================================================\n")

        for vp in PHONE_VIEWPORTS:
            context = await browser.new_context(viewport={"width": vp["w"], "height": vp["h"]})
            page = await context.new_page()

            await page.goto("http://localhost:3000", wait_until="domcontentloaded")
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
                const roundBox = (r) => r ? ({
                    left: Math.round(r.left * 10) / 10,
                    right: Math.round(r.right * 10) / 10,
                    top: Math.round(r.top * 10) / 10,
                    bottom: Math.round(r.bottom * 10) / 10,
                    width: Math.round(r.width * 10) / 10,
                    height: Math.round(r.height * 10) / 10
                }) : null;

                const bubble = document.querySelector('[data-testid="biyoo-speech-bubble"]');
                const biyoo = document.querySelector('[data-testid="biyoo-live-puppet"]');
                const toggle = document.querySelector('#biyoo-quiet-toggle');
                const prompt = document.querySelector('#sound-permission-prompt');

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
                    bubbleBox: roundBox(bubble?.getBoundingClientRect()),
                    biyooBox: roundBox(biyoo?.getBoundingClientRect()),
                    toggleBox: roundBox(toggle?.getBoundingClientRect()),
                    promptBox: roundBox(prompt?.getBoundingClientRect()),
                    cta1Box: roundBox(cta1?.getBoundingClientRect()),
                    cta2Box: roundBox(cta2?.getBoundingClientRect()),
                    navLinks,
                    heroTextRects
                };
            }''')

            print(f"--- VIEWPORT: {vp['name']} ---")
            print(f"  Bubble Box  : {data['bubbleBox']}")
            print(f"  Biyoo Box   : {data['biyooBox']}")
            print(f"  Toggle Box  : {data['toggleBox']}")
            print(f"  Prompt Box  : {data['promptBox']}")
            print(f"  CTA 1 Box   : {data['cta1Box']}")
            print(f"  CTA 2 Box   : {data['cta2Box']}")

            elements = [
                ("Bubble", data['bubbleBox']),
                ("Biyoo", data['biyooBox']),
                ("Toggle", data['toggleBox']),
                ("Prompt", data['promptBox'])
            ]

            collisions = []
            for name, box in elements:
                if not box:
                    continue
                if intersects(box, data['cta1Box']):
                    collisions.append((f"{name} vs CTA1", box, data['cta1Box']))
                if intersects(box, data['cta2Box']):
                    collisions.append((f"{name} vs CTA2", box, data['cta2Box']))
                for nl in data['navLinks']:
                    if intersects(box, nl['box']):
                        collisions.append((f"{name} vs Nav '{nl['text']}'", box, nl['box']))
                for idx, hr in enumerate(data['heroTextRects']):
                    if intersects(box, hr):
                        collisions.append((f"{name} vs Hero text line {idx}", box, hr))

            print(f"  Intersection Count against CTAs, nav links, hero text lines: {len(collisions)}")
            if len(collisions) > 0:
                print("  COLLISIONS:")
                for cname, b1, b2 in collisions:
                    print(f"    - {cname}: {b1} vs {b2}")
            else:
                print(f"  PASS: Zero intersections on {vp['name']}!")
            print()

            await context.close()

        await browser.close()

asyncio.run(test_step4())

