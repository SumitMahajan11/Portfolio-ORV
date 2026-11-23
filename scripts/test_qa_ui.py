import asyncio
from playwright.async_api import async_playwright

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        page.on("console", lambda msg: print(f"CONSOLE [{msg.type}]: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))
        
        await page.goto('http://localhost:3000/?skipIntro=true')
        await page.wait_for_timeout(1000)
        puppet = await page.wait_for_selector('.biyoo-puppet-dock, [data-biyoo-puppet]')
        await puppet.click()
        await page.wait_for_timeout(500)
        
        # Check if modal is open
        modal = await page.query_selector('[data-testid="biyoo-qa-panel"]')
        print('Modal present:', bool(modal))
        
        # Click suggested question chip:
        chips = await page.query_selector_all('[data-testid="biyoo-qa-chip"]')
        print(f"Initial suggested chips: {len(chips)}")
        for c in chips:
            print("  Chip:", await c.inner_text())
            
        if chips:
            await chips[0].click()
            await page.wait_for_timeout(500)
            
        ans = await page.query_selector('[data-testid="biyoo-qa-answer"]')
        print("Answer after chip click:\n", await ans.inner_text() if ans else "NONE")
        
        # Now try ask another button
        ask_another = await page.query_selector('button:has-text("ask another")')
        if ask_another:
            print("Clicking 'ask another'...")
            await ask_another.click()
            await page.wait_for_timeout(300)
            
        # Now fill input
        input_el = await page.wait_for_selector('[data-testid="biyoo-qa-input"]')
        print("Filling input with 'What is Ratify?'...")
        await input_el.fill('What is Ratify?')
        await page.keyboard.press("Enter")
        await page.wait_for_timeout(500)
        
        ans2 = await page.query_selector('[data-testid="biyoo-qa-answer"]')
        print("Answer after Enter:\n", await ans2.inner_text() if ans2 else "NONE")
        
        # Try out of scope
        print("Filling input with out of scope question...")
        await input_el.fill('how old is he?')
        await page.keyboard.press("Enter")
        await page.wait_for_timeout(500)
        
        ans3 = await page.query_selector('[data-testid="biyoo-qa-answer"]')
        print("Answer for out of scope:\n", await ans3.inner_text() if ans3 else "NONE")
        
        fb_chips = await page.query_selector_all('[data-testid="biyoo-qa-chip"]')
        print(f"Fallback chips: {len(fb_chips)}")
        for fc in fb_chips:
            print("  Fallback chip:", await fc.inner_text())
            
        if fb_chips:
            await fb_chips[0].click()
            await page.wait_for_timeout(500)
            ans4 = await page.query_selector('[data-testid="biyoo-qa-answer"]')
            print("Answer after fallback chip click:\n", await ans4.inner_text() if ans4 else "NONE")

        await browser.close()

asyncio.run(test())
