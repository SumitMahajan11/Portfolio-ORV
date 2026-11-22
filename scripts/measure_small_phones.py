import asyncio
from playwright.async_api import async_playwright

async def measure():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for vp in [{'w': 360, 'h': 640}, {'w': 375, 'h': 667}]:
            page = await b.new_page(viewport={'width': vp['w'], 'height': vp['h']})
            await page.goto('http://localhost:3000', wait_until='networkidle')
            await page.wait_for_timeout(500)
            
            res = await page.evaluate('''() => {
                const cta1 = document.querySelector('a[href="#scenario-select"]').getBoundingClientRect();
                const cta2 = document.querySelector('a[href="#readers-record"]').getBoundingClientRect();
                const navLinks = Array.from(document.querySelectorAll('header a')).map(a => a.getBoundingClientRect());
                const header = document.querySelector('header').getBoundingClientRect();
                return {
                    header: { top: header.top, bottom: header.bottom, height: header.height },
                    cta1: { top: cta1.top, bottom: cta1.bottom, left: cta1.left, right: cta1.right, height: cta1.height },
                    cta2: { top: cta2.top, bottom: cta2.bottom, left: cta2.left, right: cta2.right, height: cta2.height },
                    navMaxBottom: Math.max(...navLinks.map(n => n.bottom))
                };
            }''')
            print(f"Viewport {vp['w']}x{vp['h']}:")
            print("  Header:", res['header'])
            print("  Nav max bottom:", res['navMaxBottom'])
            print("  CTA 1:", res['cta1'])
            print("  CTA 2:", res['cta2'])
            await page.close()
        await b.close()

if __name__ == '__main__':
    asyncio.run(measure())
