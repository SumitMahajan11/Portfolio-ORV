import asyncio
from playwright.async_api import async_playwright

async def f():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await b.new_page(viewport={'width': 320, 'height': 568})
        await page.goto('http://localhost:3000/?skipIntro=true')
        await page.wait_for_selector('[data-biyoo-puppet="global"]')
        await page.evaluate('''() => {
            const style = document.createElement('style');
            style.textContent = `
                @media (max-width: 359px) {
                    .biyoo-bubble-dock {
                        max-width: 130px !important;
                        top: auto !important;
                        bottom: 0px !important;
                        right: calc(100% + 28px) !important;
                        padding: 2px 4px !important;
                        border-radius: 10px !important;
                    }
                    .biyoo-bubble-dock span {
                        font-size: 10px !important;
                        line-height: 1.15 !important;
                        -webkit-line-clamp: 3 !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }''')
        
        strings = [
            'edge orchestration at scale!',
            'distributed consensus is tricky, huh?',
            'formal verification active!',
            "slow down, the story's not going anywhere"
        ]
        
        for s in strings:
            await page.evaluate('(msg) => window.__biyooEngine.showBubble(msg, true)', s)
            await page.wait_for_timeout(100)
            res = await page.evaluate('''() => {
                const bubble = document.querySelector('.biyoo-bubble-dock');
                const span = bubble.querySelector('span');
                const hero = document.getElementById('hero-scene');
                const cta2 = hero ? hero.querySelectorAll('a')[1] : null;
                function getRect(el) { if (!el) return null; const r = el.getBoundingClientRect(); return { left: Math.round(r.left*10)/10, top: Math.round(r.top*10)/10, right: Math.round(r.right*10)/10, bottom: Math.round(r.bottom*10)/10, width: Math.round(r.width*10)/10, height: Math.round(r.height*10)/10 }; }
                function intersects(r1, r2) { if (!r1 || !r2) return false; return !(r1.right <= r2.left || r1.left >= r2.right || r1.bottom <= r2.top || r1.top >= r2.bottom); }
                const br = getRect(bubble);
                const cr = getRect(cta2);
                return { br, cr, hit: intersects(br, cr), spanH: span.clientHeight, spanSH: span.scrollHeight };
            }''')
            print(f"{s[:28]:<30} | {res}")
        await b.close()

if __name__ == "__main__":
    asyncio.run(f())

