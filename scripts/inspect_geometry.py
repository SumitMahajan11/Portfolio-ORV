import asyncio
from playwright.async_api import async_playwright

VIEWPORTS = [
    (320, 568),
    (360, 640),
    (360, 740),
    (360, 800),
    (375, 667),
    (390, 844),
    (412, 915),
    (1440, 900)
]

async def check():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for w, h in VIEWPORTS:
            page = await browser.new_page(viewport={"width": w, "height": h})
            await page.goto("http://localhost:3000/?skipIntro=true")
            await page.wait_for_selector('[data-biyoo-puppet="global"]')
            await page.wait_for_timeout(500)
            
            data = await page.evaluate('''() => {
                const sp = document.querySelector('#sound-permission-prompt');
                const puppet = document.querySelector('[data-biyoo-puppet="global"]');
                const toggle = document.querySelector('#biyoo-quiet-toggle');
                const cluster = document.querySelector('.biyoo-controls-cluster');
                
                function getRect(el) {
                    if (!el) return null;
                    const r = el.getBoundingClientRect();
                    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
                }
                
                return {
                    sp: getRect(sp),
                    puppet: getRect(puppet),
                    toggle: getRect(toggle),
                    cluster: getRect(cluster)
                };
            }''')
            print(f"Viewport {w}x{h}:")
            print("  SoundPrompt:", data["sp"])
            print("  Puppet:     ", data["puppet"])
            print("  Toggle:     ", data["toggle"])
            print("  Cluster:    ", data["cluster"])
            
            await page.close()
        await browser.close()

if __name__ == "__main__":
    asyncio.run(check())

