import asyncio
from playwright.async_api import async_playwright

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Fresh context so storage is totally clean
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        await page.goto("http://localhost:3000/", wait_until="networkidle")
        await page.evaluate("""() => {
            sessionStorage.setItem('biyoo_fake_hour', '3');
            sessionStorage.removeItem('biyoo_late_night_checked');
            sessionStorage.removeItem('biyoo_return_session_checked');
            localStorage.setItem('biyoo_visit_count', '1');
        }""")
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(1000)

        logs = await page.evaluate("""() => {
            const engine = window.__biyooEngine;
            return {
                bubble: engine ? engine.bubbleText : null,
                expression: engine ? engine.currentExpression : null,
                quiet: engine ? engine.quietMode : null,
                history: engine ? engine.getRawTriggerHistory() : [],
                logs: engine ? engine.logEntries : [],
                visitCount: localStorage.getItem('biyoo_visit_count'),
                sessionFh: sessionStorage.getItem('biyoo_fake_hour')
            };
        }""")
        print("RESULT:", logs)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test())
