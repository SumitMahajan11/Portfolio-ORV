import asyncio
from playwright.async_api import async_playwright

async def check_console():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        for route in ["/", "/biyoo-test"]:
            page = await browser.new_page(viewport={"width": 1440, "height": 900})
            messages = []
            page_errors = []

            page.on("console", lambda msg: messages.append({"type": msg.type, "text": msg.text}) if msg.type in ["error", "warning"] else None)
            page.on("pageerror", lambda err: page_errors.append(str(err)))

            print(f"=== CHECKING ROUTE {route} ===")
            response = await page.goto(f"http://localhost:3000{route}", wait_until="networkidle")
            await page.wait_for_timeout(2000)

            errors = [m for m in messages if m["type"] == "error"]
            warnings = [m for m in messages if m["type"] == "warning"]

            print(f"Status: {response.status}")
            print(f"Page errors ({len(page_errors)}): {page_errors}")
            print(f"Console errors ({len(errors)}): {[e['text'] for e in errors]}")
            print(f"Console warnings ({len(warnings)}): {[w['text'] for w in warnings]}")
            await page.close()

        await browser.close()

if __name__ == "__main__":
    asyncio.run(check_console())

