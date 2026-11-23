import asyncio
import json
from playwright.async_api import async_playwright

VIEWPORTS = [
    {'name': '360x640', 'width': 360, 'height': 640},
    {'name': '375x667', 'width': 375, 'height': 667},
    {'name': '390x844', 'width': 390, 'height': 844},
    {'name': '412x915', 'width': 412, 'height': 915}
]

def intersects(r1, r2):
    if not r1 or not r2:
        return False
    x_overlap = max(0, min(r1['x'] + r1['width'], r2['x'] + r2['width']) - max(r1['x'], r2['x']))
    y_overlap = max(0, min(r1['y'] + r1['height'], r2['y'] + r2['height']) - max(r1['y'], r2['y']))
    return x_overlap > 0.5 and y_overlap > 0.5

async def run_audit():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        
        for vp in VIEWPORTS:
            page = await browser.new_page(viewport={'width': vp['width'], 'height': vp['height']})
            await page.goto('http://localhost:3000', wait_until='networkidle')
            await page.wait_for_selector('[data-testid="biyoo-live-puppet"]')
            await page.wait_for_timeout(500)

            # Trigger late night to display speech bubble
            await page.evaluate('''() => {
                if (window.__biyooEngine) {
                    window.__biyooEngine.resetBubbleCooldown();
                    window.__biyooEngine.triggerLateNight();
                }
            }''')
            await page.wait_for_timeout(300)

            data = await page.evaluate('''() => {
                const roundBox = (r) => ({
                    x: Math.round(r.x * 10) / 10,
                    y: Math.round(r.y * 10) / 10,
                    width: Math.round(r.width * 10) / 10,
                    height: Math.round(r.height * 10) / 10
                });

                const puppet = document.querySelector('[data-testid="biyoo-live-puppet"]');
                const bubble = document.querySelector('[data-testid="biyoo-speech-bubble"]') || document.querySelector('[data-testid="biyoo-bubble"]');
                const toggle = document.querySelector('#biyoo-quiet-toggle');

                const cta1 = document.querySelector('a[href="#scenario-select"]');
                const cta2 = document.querySelector('a[href="#readers-record"]');

                const getHitTest = (el) => {
                    const r = el.getBoundingClientRect();
                    const centerX = r.x + r.width / 2;
                    const centerY = r.y + r.height / 2;
                    const rightX = r.x + r.width - 10;
                    const rightY = r.y + r.height / 2;

                    const centerEl = document.elementFromPoint(centerX, centerY);
                    const rightEl = document.elementFromPoint(rightX, rightY);

                    return {
                        centerPoint: { x: Math.round(centerX), y: Math.round(centerY) },
                        rightPoint: { x: Math.round(rightX), y: Math.round(rightY) },
                        centerHitTag: centerEl ? centerEl.tagName : null,
                        centerHitHref: centerEl ? (centerEl.getAttribute('href') || centerEl.closest('a')?.getAttribute('href')) : null,
                        centerHitText: centerEl ? centerEl.innerText.trim() : null,
                        rightHitTag: rightEl ? rightEl.tagName : null,
                        rightHitHref: rightEl ? (rightEl.getAttribute('href') || rightEl.closest('a')?.getAttribute('href')) : null,
                        rightHitText: rightEl ? rightEl.innerText.trim() : null
                    };
                };

                return {
                    puppet: puppet ? roundBox(puppet.getBoundingClientRect()) : null,
                    bubble: bubble ? roundBox(bubble.getBoundingClientRect()) : null,
                    toggle: toggle ? roundBox(toggle.getBoundingClientRect()) : null,
                    cta1: cta1 ? roundBox(cta1.getBoundingClientRect()) : null,
                    cta2: cta2 ? roundBox(cta2.getBoundingClientRect()) : null,
                    cta1Hit: cta1 ? getHitTest(cta1) : null,
                    cta2Hit: cta2 ? getHitTest(cta2) : null
                };
            }''')

            print(f"\n=========================================================================")
            print(f"VIEWPORT: {vp['name']} (Width: {vp['width']}, Height: {vp['height']})")
            print(f"=========================================================================")
            print(f"Biyoo Box   : {data['puppet']}")
            print(f"Bubble Box  : {data['bubble']}")
            print(f"Toggle Box  : {data['toggle']}")
            print(f"CTA 1 Box   : {data['cta1']} (See the projects)")
            print(f"CTA 2 Box   : {data['cta2']} (Read the evidence)")

            # Check overlaps
            targets = [('BiyooBox', data['puppet']), ('Bubble', data['bubble']), ('Toggle', data['toggle'])]
            ctas = [('CTA1', data['cta1']), ('CTA2', data['cta2'])]

            overlaps = []
            for t_name, t_box in targets:
                if not t_box: continue
                for c_name, c_box in ctas:
                    if not c_box: continue
                    if intersects(t_box, c_box):
                        overlaps.append((t_name, c_name))

            print(f"\nPhysical Overlaps Detected: {len(overlaps)}")
            if overlaps:
                for t_name, c_name in overlaps:
                    print(f"  [!] {t_name} overlaps {c_name}")
            else:
                print("  Zero overlaps detected.")

            # ElementFromPoint proof
            print(f"\nelementFromPoint Click-Winning Proof:")
            c1 = data['cta1Hit']
            c2 = data['cta2Hit']
            print(f"  CTA 1 Center ({c1['centerPoint']['x']}, {c1['centerPoint']['y']}): Tag={c1['centerHitTag']}, Href={c1['centerHitHref']} -> {'PASS' if c1['centerHitHref']=='#scenario-select' else 'FAIL'}")
            print(f"  CTA 1 Right  ({c1['rightPoint']['x']}, {c1['rightPoint']['y']}): Tag={c1['rightHitTag']}, Href={c1['rightHitHref']} -> {'PASS' if c1['rightHitHref']=='#scenario-select' else 'FAIL'}")
            print(f"  CTA 2 Center ({c2['centerPoint']['x']}, {c2['centerPoint']['y']}): Tag={c2['centerHitTag']}, Href={c2['centerHitHref']} -> {'PASS' if c2['centerHitHref']=='#readers-record' else 'FAIL'}")
            print(f"  CTA 2 Right  ({c2['rightPoint']['x']}, {c2['rightPoint']['y']}): Tag={c2['rightHitTag']}, Href={c2['rightHitHref']} -> {'PASS' if c2['rightHitHref']=='#readers-record' else 'FAIL'}")

            assert c1['centerHitHref'] == '#scenario-select'
            assert c1['rightHitHref'] == '#scenario-select'
            assert c2['centerHitHref'] == '#readers-record'
            assert c2['rightHitHref'] == '#readers-record'

            await page.close()
        await browser.close()

if __name__ == '__main__':
    asyncio.run(run_audit())

