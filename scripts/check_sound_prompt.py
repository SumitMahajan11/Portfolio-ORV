import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width": 1440, "height": 900})
        page = await ctx.new_page()
        await page.goto("http://localhost:3000/", wait_until="networkidle")

        pref = await page.evaluate("() => localStorage.getItem('sound_pref')")
        print("sound_pref on fresh context:", pref)

        print("Waiting 5s for promptTimer (4500ms)...")
        await page.wait_for_timeout(5000)

        prompt_el = await page.query_selector("#sound-permission-prompt")
        print("Prompt element found:", prompt_el is not None)
        if prompt_el:
            box = await prompt_el.bounding_box()
            print("Prompt bounding box:", box)

        await b.close()

if __name__ == "__main__":
    asyncio.run(main())
