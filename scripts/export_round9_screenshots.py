import asyncio
import os
import shutil
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\SUMIT\.gemini\antigravity\brain\0f91a232-b6bc-421c-bf43-b43a4359eb3e"

LATE_NIGHT_SCRIPT = '''() => {
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
}'''

async def export_screenshots():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        
        # 1. round9-360x740-late-night.png
        p1 = await browser.new_page(viewport={'width': 360, 'height': 740}, device_scale_factor=1)
        await p1.add_init_script(LATE_NIGHT_SCRIPT)
        await p1.goto('http://localhost:3000/?skipIntro=true')
        await p1.wait_for_timeout(1500)
        await p1.screenshot(path='round9-360x740-late-night.png')
        await p1.close()
        
        # 2. round9-390x844-late-night.png
        p2 = await browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
        await p2.add_init_script(LATE_NIGHT_SCRIPT)
        await p2.goto('http://localhost:3000/?skipIntro=true')
        await p2.wait_for_timeout(1500)
        await p2.screenshot(path='round9-390x844-late-night.png')
        await p2.close()

        # 3. round9-360x640-late-night.png
        p3 = await browser.new_page(viewport={'width': 360, 'height': 640}, device_scale_factor=1)
        await p3.add_init_script(LATE_NIGHT_SCRIPT)
        await p3.goto('http://localhost:3000/?skipIntro=true')
        await p3.wait_for_timeout(1500)
        await p3.screenshot(path='round9-360x640-late-night.png')
        await p3.close()
        
        # 4. round9-1280x600-panel-open.png
        p4 = await browser.new_page(viewport={'width': 1280, 'height': 600}, device_scale_factor=1)
        await p4.goto('http://localhost:3000/?skipIntro=true')
        await p4.wait_for_timeout(1000)
        puppet = await p4.wait_for_selector('.biyoo-puppet-dock, [data-biyoo-puppet]')
        await puppet.click()
        await p4.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        chip = await p4.wait_for_selector('button:has-text("Who is Sumit?")')
        await chip.click()
        await p4.wait_for_selector('[data-testid="biyoo-qa-answer"]')
        await p4.wait_for_timeout(500)
        await p4.screenshot(path='round9-1280x600-panel-open.png')
        await p4.close()
        
        await browser.close()

    # Copy to artifact dir
    files = [
        'round9-360x740-late-night.png',
        'round9-390x844-late-night.png',
        'round9-360x640-late-night.png',
        'round9-1280x600-panel-open.png'
    ]
    if os.path.exists(ARTIFACT_DIR):
        for f in files:
            shutil.copy2(f, os.path.join(ARTIFACT_DIR, f))
    print("Export complete!")

if __name__ == '__main__':
    asyncio.run(export_screenshots())

