import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for vp in [
            {'width': 360, 'height': 640},
            {'width': 390, 'height': 844},
            {'width': 768, 'height': 1024},
            {'width': 1440, 'height': 900}
        ]:
            page = await browser.new_page(viewport=vp)
            await page.goto('http://localhost:3000')
            await page.wait_for_timeout(1000)
            hitbox = page.locator('[data-testid="biyoo-silhouette-hitbox"]')
            if await hitbox.count() > 0:
                await hitbox.dispatch_event('click')
                await page.wait_for_timeout(500)
            panel = page.locator('[data-testid="biyoo-qa-panel"]')
            panel_box = await panel.bounding_box() if await panel.count() > 0 else None
            biyoo = page.locator('[data-testid="biyoo-live-puppet"]')
            biyoo_box = await biyoo.bounding_box() if await biyoo.count() > 0 else None
            h1 = page.locator('h1')
            h1_box = await h1.bounding_box() if await h1.count() > 0 else None
            ctas = page.locator('a[data-biyoo-point]')
            cta_count = await ctas.count()
            cta_boxes = [await ctas.nth(i).bounding_box() for i in range(cta_count)]
            
            print(f"=== Viewport {vp['width']}x{vp['height']} ===")
            print(f"Panel: {panel_box}")
            print(f"Biyoo: {biyoo_box}")
            print(f"H1: {h1_box}")
            for i, cb in enumerate(cta_boxes):
                print(f"CTA {i}: {cb}")
            await page.close()
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())

