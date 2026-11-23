import asyncio
from playwright.async_api import async_playwright

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for vp in [{'w': 360, 'h': 640}, {'w': 390, 'h': 844}, {'w': 768, 'h': 1024}, {'w': 1440, 'h': 900}]:
            page = await browser.new_page(viewport={'width': vp['w'], 'height': vp['h']})
            await page.goto('http://localhost:3000')
            await page.wait_for_timeout(500)
            h1 = await page.locator('h1').bounding_box()
            p_boxes = [await page.locator('#hero-scene p').nth(i).bounding_box() for i in range(await page.locator('#hero-scene p').count())]
            cta_boxes = [await page.locator('#hero-scene a').nth(i).bounding_box() for i in range(await page.locator('#hero-scene a').count())]
            print(f"=== Viewport {vp['w']}x{vp['h']} ===")
            print('H1:', h1)
            print('P:', p_boxes)
            print('CTAs:', cta_boxes)
            await page.close()
        await browser.close()

if __name__ == '__main__':
    asyncio.run(test())

