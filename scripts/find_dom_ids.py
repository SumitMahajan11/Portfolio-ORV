import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await b.new_page()
        await page.goto('http://localhost:3000', wait_until='networkidle')
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(2000)
        ids = await page.evaluate("Array.from(document.querySelectorAll('[id]')).map(el => el.id)")
        print("DOM IDs:", sorted(set(ids)))
        await b.close()

if __name__ == '__main__':
    asyncio.run(run())

