import asyncio
import os
from playwright.async_api import async_playwright
from PIL import Image

VIEWPORTS = [
    {'name': '360x640', 'width': 360, 'height': 640},
    {'name': '390x844', 'width': 390, 'height': 844},
    {'name': '768x1024', 'width': 768, 'height': 1024},
    {'name': '1440x900', 'width': 1440, 'height': 900}
]

ARTIFACT_DIR = r"C:\Users\SUMIT\.gemini\antigravity\brain\25ce1abe-a021-46a1-9e4e-566f68d42680"
PUBLIC_DIR = r"d:\Projects\Portfolio-ORV-main\public\biyoo"

async def capture():
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        
        for vp in VIEWPORTS:
            v_name = vp['name']
            w = vp['width']
            h = vp['height']
            
            # 1. Closed / baseline state ("before" panel opened)
            page_before = await browser.new_page(viewport={'width': w, 'height': h})
            await page_before.goto('http://localhost:3000', wait_until='networkidle')
            await page_before.wait_for_selector('[data-testid="biyoo-live-puppet"]')
            await page_before.wait_for_timeout(500)
            before_path = os.path.join(PUBLIC_DIR, f"hero-before-{v_name}.png")
            await page_before.screenshot(path=before_path)
            await page_before.close()
            
            # 2. Panel Open state ("after" panel opened with answered question)
            page_after = await browser.new_page(viewport={'width': w, 'height': h})
            await page_after.goto('http://localhost:3000', wait_until='networkidle')
            await page_after.wait_for_selector('[data-testid="biyoo-live-puppet"]')
            hitbox = page_after.locator('[data-testid="biyoo-silhouette-hitbox"]')
            await hitbox.dispatch_event('click')
            await page_after.wait_for_selector('[data-testid="biyoo-qa-panel"]')
            
            input_el = page_after.locator('#biyoo-question-input')
            await input_el.fill('Who is Sumit?')
            await input_el.press('Enter')
            await page_after.wait_for_timeout(400)
            
            after_path = os.path.join(PUBLIC_DIR, f"hero-after-qa-{v_name}.png")
            await page_after.screenshot(path=after_path)
            await page_after.close()
            
            print(f"Captured {v_name}: before={before_path}, after={after_path}")
            
        await browser.close()

if __name__ == '__main__':
    asyncio.run(capture())
