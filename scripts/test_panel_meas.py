import asyncio
import sys
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1280, 'height': 600})
        print("Navigating...")
        await page.goto('http://localhost:3000', wait_until='networkidle')
        print("Waiting for puppet...")
        await page.wait_for_selector('[data-testid="biyoo-live-puppet"]', timeout=5000)
        print("Clicking puppet...")
        await page.click('[data-testid="biyoo-silhouette-hitbox"]')
        print("Waiting for QA panel...")
        await page.wait_for_selector('[data-testid="biyoo-qa-panel"]', timeout=5000)
        print("QA panel opened successfully!")

        res = await page.evaluate('''() => {
            const panel = document.querySelector('[data-testid="biyoo-qa-panel"]');
            return panel ? panel.getBoundingClientRect() : null;
        }''')
        print("Panel rect:", res)
        await browser.close()

asyncio.run(main())
