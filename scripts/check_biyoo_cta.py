import asyncio
from playwright.async_api import async_playwright

async def check():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 360, 'height': 640})
        page = await ctx.new_page()
        await page.goto('http://localhost:3000', wait_until='networkidle')
        await page.wait_for_timeout(2000)
        res = await page.evaluate("""() => {
            const getBox = el => {
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
            };
            const biyoo = document.querySelector('[data-testid="biyoo-live-puppet"]');
            const cta = Array.from(document.querySelectorAll('a')).find(el => el.textContent.includes('Read the evidence'));
            return {
                biyoo: getBox(biyoo),
                cta: getBox(cta)
            };
        }""")
        print("360x640:", res)
        await b.close()

if __name__ == '__main__':
    asyncio.run(check())

