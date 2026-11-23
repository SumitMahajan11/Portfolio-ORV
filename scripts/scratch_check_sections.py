import asyncio
from playwright.async_api import async_playwright

async def check():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for vp in [{"width": 1440, "height": 900}, {"width": 390, "height": 844}]:
            page = await browser.new_page(viewport=vp)
            await page.goto("http://localhost:3000")
            await page.wait_for_timeout(1000)
            res = await page.evaluate('''() => {
                const ids = ["edge-cloud", "ratify", "iac-verifier"];
                return ids.map(id => {
                    const el = document.getElementById(id);
                    if (!el) return { id, found: false };
                    const r = el.getBoundingClientRect();
                    return { id, height: r.height, top: r.top };
                });
            }''')
            print(f"Viewport: {vp['width']}x{vp['height']}: {res}")
        await browser.close()

asyncio.run(check())

