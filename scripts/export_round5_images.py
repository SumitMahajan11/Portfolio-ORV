import asyncio
import os
import shutil
from playwright.async_api import async_playwright

async def export_images():
    os.makedirs('public/biyoo', exist_ok=True)
    artifact_dir = r"C:\Users\SUMIT\.gemini\antigravity\brain\25ce1abe-a021-46a1-9e4e-566f68d42680"

    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # 1. 360x640 late-night bubble
        p1 = await browser.new_page(viewport={'width': 360, 'height': 640})
        await p1.goto('http://localhost:3000', wait_until='networkidle')
        await p1.evaluate('''() => {
            window.dispatchEvent(new CustomEvent("sound:show-prompt"));
            if (window.__biyooEngine) {
                window.__biyooEngine.resetBubbleCooldown();
                window.__biyooEngine.triggerLateNight();
            }
        }''')
        await p1.wait_for_timeout(400)
        s1 = 'public/biyoo/round5-360x640-latenight.png'
        await p1.screenshot(path=s1, full_page=False)
        print(f"Exported Shot 1: {s1}")
        await p1.close()

        # 2. 360x640 panel with an answer
        p2 = await browser.new_page(viewport={'width': 360, 'height': 640})
        await p2.goto('http://localhost:3000', wait_until='networkidle')
        await p2.locator('[data-testid="biyoo-silhouette-hitbox"]').dispatch_event('click')
        await p2.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        in2 = p2.locator('#biyoo-question-input')
        await in2.fill('Who is Sumit?')
        await p2.keyboard.press('Enter')
        await p2.wait_for_selector('[data-testid="biyoo-qa-answer"]')
        await p2.wait_for_timeout(400)
        s2 = 'public/biyoo/round5-360x640-qa-answered.png'
        await p2.screenshot(path=s2, full_page=False)
        print(f"Exported Shot 2: {s2}")
        await p2.close()

        # 3. 390x844 panel
        p3 = await browser.new_page(viewport={'width': 390, 'height': 844})
        await p3.goto('http://localhost:3000', wait_until='networkidle')
        await p3.locator('[data-testid="biyoo-silhouette-hitbox"]').dispatch_event('click')
        await p3.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        await p3.wait_for_timeout(400)
        s3 = 'public/biyoo/round5-390x844-qa-panel.png'
        await p3.screenshot(path=s3, full_page=False)
        print(f"Exported Shot 3: {s3}")
        await p3.close()

        # 4. 1366x625 desktop with the late-night bubble
        p4 = await browser.new_page(viewport={'width': 1366, 'height': 625})
        await p4.goto('http://localhost:3000', wait_until='networkidle')
        await p4.evaluate('''() => {
            window.dispatchEvent(new CustomEvent("sound:show-prompt"));
            if (window.__biyooEngine) {
                window.__biyooEngine.resetBubbleCooldown();
                window.__biyooEngine.triggerLateNight();
            }
        }''')
        await p4.wait_for_timeout(400)
        s4 = 'public/biyoo/round5-1366x625-desktop-latenight.png'
        await p4.screenshot(path=s4, full_page=False)
        print(f"Exported Shot 4: {s4}")
        await p4.close()

        # 5. 1440x900 answered with Biyoo's face visible
        p5 = await browser.new_page(viewport={'width': 1440, 'height': 900})
        await p5.goto('http://localhost:3000', wait_until='networkidle')
        await p5.locator('[data-testid="biyoo-silhouette-hitbox"]').dispatch_event('click')
        await p5.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        in5 = p5.locator('#biyoo-question-input')
        await in5.fill('What is Ratify?')
        await p5.keyboard.press('Enter')
        await p5.wait_for_selector('[data-testid="biyoo-qa-answer"]')
        await p5.wait_for_timeout(400)
        s5 = 'public/biyoo/round5-1440x900-qa-answered.png'
        await p5.screenshot(path=s5, full_page=False)
        print(f"Exported Shot 5: {s5}")
        await p5.close()

        for s in [s1, s2, s3, s4, s5]:
            dest = os.path.join(artifact_dir, os.path.basename(s))
            shutil.copyfile(s, dest)
            print(f"Copied to artifact dir: {dest}")

        await browser.close()
        print("All 5 screenshots exported successfully.")

if __name__ == '__main__':
    asyncio.run(export_images())
