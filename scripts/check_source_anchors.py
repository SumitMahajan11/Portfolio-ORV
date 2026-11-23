import asyncio
import json
from playwright.async_api import async_playwright

async def check():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        await page.goto('http://localhost:3000/?skipIntro=true')
        await page.wait_for_timeout(1000)
        
        anchors = ['#hero-scene', '#edge-cloud', '#ratify', '#iac-verifier', '#readers-record', '#contact']
        for sel in anchors:
            info = await page.evaluate('''(sel) => {
                const el = document.querySelector(sel);
                if (!el) return { selector: sel, found: false, tagName: null, rect: null };
                const r = el.getBoundingClientRect();
                return {
                    selector: sel,
                    found: true,
                    tagName: el.tagName.toLowerCase(),
                    rect: {
                        left: Math.round(r.left * 10) / 10,
                        top: Math.round(r.top * 10) / 10,
                        right: Math.round(r.right * 10) / 10,
                        bottom: Math.round(r.bottom * 10) / 10,
                        width: Math.round(r.width * 10) / 10,
                        height: Math.round(r.height * 10) / 10
                    }
                };
            }''', sel)
            print(f"selector: {info['selector']}, found: {info['found']}, tag: {info['tagName']}, rect: {info['rect']}")
            
        # Click a Q&A source link
        puppet = await page.wait_for_selector('.biyoo-puppet-dock, [data-biyoo-puppet]')
        await puppet.click()
        await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        chip = await page.wait_for_selector('button:has-text("Who is Sumit?")')
        await chip.click()
        await page.wait_for_selector('[data-testid="biyoo-qa-answer"]')
        link = await page.wait_for_selector('[data-testid="biyoo-qa-answer"] a')
        print("Clicking Q&A source link:", await link.get_attribute("href"), await link.inner_text())
        await link.click()
        await page.wait_for_timeout(500)
        
        click_info = await page.evaluate('''() => {
            return {
                hash: window.location.hash,
                scrollY: window.scrollY
            };
        }''')
        print(f"window.location.hash: {click_info['hash']}, window.scrollY: {click_info['scrollY']}")
        await browser.close()

asyncio.run(check())
