import asyncio
import os
import shutil
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\SUMIT\.gemini\antigravity\brain\0f91a232-b6bc-421c-bf43-b43a4359eb3e"

async def export_screenshots():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        
        # 1. round8-1280x600-panel-open.png
        p1 = await browser.new_page(viewport={'width': 1280, 'height': 600}, device_scale_factor=1)
        await p1.goto('http://localhost:3000/?skipIntro=true')
        await p1.wait_for_timeout(1000)
        puppet1 = await p1.wait_for_selector('.biyoo-puppet-dock, [data-biyoo-puppet]')
        await puppet1.click()
        await p1.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        chip1 = await p1.wait_for_selector('button:has-text("Who is Sumit?")')
        await chip1.click()
        await p1.wait_for_selector('[data-testid="biyoo-qa-answer"]')
        await p1.wait_for_timeout(500)
        await p1.screenshot(path='round8-1280x600-panel-open.png')
        await p1.close()
        
        # 2. round8-360x740-panel-open.png
        p2 = await browser.new_page(viewport={'width': 360, 'height': 740}, device_scale_factor=1)
        await p2.goto('http://localhost:3000/?skipIntro=true')
        await p2.wait_for_timeout(1000)
        puppet2 = await p2.wait_for_selector('.biyoo-puppet-dock, [data-biyoo-puppet]')
        await puppet2.click()
        await p2.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        chip2 = await p2.wait_for_selector('button:has-text("Who is Sumit?")')
        await chip2.click()
        await p2.wait_for_selector('[data-testid="biyoo-qa-answer"]')
        await p2.wait_for_timeout(500)
        await p2.screenshot(path='round8-360x740-panel-open.png')
        await p2.close()
        
        # 3. round8-360x740-late-night.png (late night costume / idle)
        p3 = await browser.new_page(viewport={'width': 360, 'height': 740}, device_scale_factor=1)
        # Mock date/time to late night (e.g. 23:30 / 11:30 PM)
        await p3.add_init_script('''() => {
            const LateNightDate = class extends Date {
                constructor(...args) {
                    if (args.length === 0) {
                        super('2026-11-22T23:30:00');
                    } else {
                        super(...args);
                    }
                }
                static now() {
                    return new Date('2026-11-22T23:30:00').getTime();
                }
            };
            window.Date = LateNightDate;
        }''')
        await p3.goto('http://localhost:3000/?skipIntro=true')
        await p3.wait_for_timeout(1500)
        await p3.screenshot(path='round8-360x740-late-night.png')
        await p3.close()
        
        # 4. round8-1440x900-panel-open.png
        p4 = await browser.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
        await p4.goto('http://localhost:3000/?skipIntro=true')
        await p4.wait_for_timeout(1000)
        puppet4 = await p4.wait_for_selector('.biyoo-puppet-dock, [data-biyoo-puppet]')
        await puppet4.click()
        await p4.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        chip4 = await p4.wait_for_selector('button:has-text("Who is Sumit?")')
        await chip4.click()
        await p4.wait_for_selector('[data-testid="biyoo-qa-answer"]')
        await p4.wait_for_timeout(500)
        await p4.screenshot(path='round8-1440x900-panel-open.png')
        await p4.close()
        
        await browser.close()

    # Copy to artifact dir
    files = [
        'round8-1280x600-panel-open.png',
        'round8-360x740-panel-open.png',
        'round8-360x740-late-night.png',
        'round8-1440x900-panel-open.png'
    ]
    for f in files:
        if os.path.exists(f):
            dest = os.path.join(ARTIFACT_DIR, f)
            shutil.copy2(f, dest)
            print(f"Copied {f} to {dest} ({os.path.getsize(f)} bytes)")

asyncio.run(export_screenshots())

