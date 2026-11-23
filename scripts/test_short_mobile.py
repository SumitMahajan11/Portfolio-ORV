import asyncio
from playwright.async_api import async_playwright

async def f():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w, h in [(360, 640), (375, 667)]:
            page = await b.new_page(viewport={'width': w, 'height': h})
            await page.goto('http://localhost:3000/?skipIntro=true')
            await page.wait_for_selector('[data-biyoo-puppet="global"]')
            await page.evaluate('''() => {
                const style = document.createElement('style');
                style.textContent = `
                    @media (max-width: 767px) and (max-height: 699px) {
                        .biyoo-bubble-dock {
                            position: absolute !important;
                            right: calc(100% + 36px) !important;
                            bottom: 4px !important;
                            top: auto !important;
                            left: auto !important;
                            max-width: 130px !important;
                            padding: 3px 6px !important;
                            border-radius: 10px !important;
                        }
                        .biyoo-bubble-dock span {
                            -webkit-line-clamp: 3 !important;
                        }
                    }
                `;
                document.head.appendChild(style);
                if (window.__biyooEngine) window.__biyooEngine.showBubble('edge orchestration at scale!', true);
            }''')
            await page.wait_for_timeout(200)
            res = await page.evaluate('''([vw, vh]) => {
                const bubble = document.querySelector('.biyoo-bubble-dock');
                const toggle = document.querySelector('#biyoo-quiet-toggle');
                const puppet = document.querySelector('[data-biyoo-puppet="global"]');
                const hero = document.getElementById('hero-scene');
                function getRect(el) { if (!el) return null; const r = el.getBoundingClientRect(); return { left: Math.round(r.left*10)/10, top: Math.round(r.top*10)/10, right: Math.round(r.right*10)/10, bottom: Math.round(r.bottom*10)/10, width: Math.round(r.width*10)/10, height: Math.round(r.height*10)/10 }; }
                function intersects(r1, r2) { if (!r1 || !r2) return false; return !(r1.right <= r2.left || r1.left >= r2.right || r1.bottom <= r2.top || r1.top >= r2.bottom); }
                const br = getRect(bubble);
                const tr = getRect(toggle);
                const pur = getRect(puppet);
                let heroInt = 0;
                if (hero && br) {
                    for (const el of hero.querySelectorAll('h1, p, a, button')) {
                        if (intersects(br, getRect(el))) heroInt++;
                    }
                }
                return { br, tr, hitT: intersects(br, tr), hitB: intersects(br, pur), heroInt, inVp: (br.left >= 0 && br.top >= 0 && br.right <= vw && br.bottom <= vh) };
            }''', [w, h])
            print(f"{w}x{h}:", res)
            await page.close()
        await b.close()

if __name__ == "__main__":
    asyncio.run(f())

