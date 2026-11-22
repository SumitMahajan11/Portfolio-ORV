import asyncio
from playwright.async_api import async_playwright

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        await page.goto("http://localhost:3000/", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        # Clear cooldown & scroll to top
        await page.evaluate("""() => {
            window.scrollTo(0, 0);
            if (window.__biyooEngine) {
                window.__biyooEngine.resetBubbleCooldown();
                window.__biyooEngine.clearRawTriggerHistory();
                window.__biyooEngine.resetInactivity();
            }
        }""")
        await page.wait_for_timeout(300)

        print("Testing fast scroll wheeling...")
        # 14 wheel events of 360px every 30ms -> 360px / 0.030s = 12,000 px/s for 420ms
        for _ in range(14):
            await page.mouse.wheel(0, 360)
            await asyncio.sleep(0.035)

        await page.wait_for_timeout(500)
        res = await page.evaluate("""() => {
            const engine = window.__biyooEngine;
            return {
                bubble: engine ? engine.bubbleText : null,
                expression: engine ? engine.currentExpression : null,
                history: engine ? engine.getRawTriggerHistory() : [],
                scrollY: window.scrollY
            };
        }""")
        print("Fast scroll result:", res)

        # Now test linger on the first [data-biyoo-linger]
        print("\nTesting linger...")
        await page.evaluate("""() => {
            const el = document.querySelector('[data-biyoo-linger]');
            if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
        }""")
        await page.wait_for_timeout(500)
        await page.evaluate("""() => {
            window.__biyooEngine.resetBubbleCooldown();
            window.__biyooEngine.clearRawTriggerHistory();
            window.__biyooEngine.resetInactivity();
        }""")
        # Wait 10.5s for linger
        await page.wait_for_timeout(10600)
        linger_res = await page.evaluate("""() => {
            const engine = window.__biyooEngine;
            return {
                bubble: engine ? engine.bubbleText : null,
                expression: engine ? engine.currentExpression : null,
                history: engine ? engine.getRawTriggerHistory() : []
            };
        }""")
        print("Linger result:", linger_res)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test())
