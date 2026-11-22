import asyncio
import os
import shutil
from playwright.async_api import async_playwright

WORKSPACE = r"d:\Projects\Portfolio-ORV-main"
ARTIFACT_DIR = r"C:\Users\SUMIT\.gemini\antigravity\brain\0f91a232-b6bc-421c-bf43-b43a4359eb3e"
PUBLIC_DIR = os.path.join(WORKSPACE, "public", "biyoo")

async def run():
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    os.makedirs(ARTIFACT_DIR, exist_ok=True)

    shots = [
        ("round6-1440x900-prompt-visible.png", 1440, 900, "prompt_visible"),
        ("round6-1440x900-panel-open.png", 1440, 900, "panel_open"),
        ("round6-360x740-latenight.png", 360, 740, "latenight"),
        ("round6-393x851-latenight.png", 393, 851, "latenight"),
        ("round6-360x640-latenight.png", 360, 640, "latenight"),
    ]

    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch()

        for filename, width, height, mode in shots:
            context = await browser.new_context(
                viewport={"width": width, "height": height},
                device_scale_factor=1.0
            )
            page = await context.new_page()

            # Fresh localStorage and sessionStorage
            await page.goto("http://localhost:3000", wait_until="networkidle")
            await page.wait_for_selector('[data-testid="biyoo-live-puppet"]', timeout=8000)

            if mode == "prompt_visible":
                # Ensure sound prompt is visible and panel is closed
                await page.evaluate("""() => {
                    localStorage.removeItem('sound_consent');
                    localStorage.removeItem('biyoo_sound_dismissed');
                    window.dispatchEvent(new CustomEvent('sound:show-prompt'));
                }""")
                await page.wait_for_selector('#sound-permission-prompt', state='visible', timeout=5000)
                await page.wait_for_timeout(300)

            elif mode == "panel_open":
                # Open Q&A panel
                hitbox = page.locator('[data-testid="biyoo-silhouette-hitbox"]')
                await hitbox.dispatch_event('click')
                await page.wait_for_selector('[data-testid="biyoo-qa-panel"]', state='visible', timeout=5000)
                await page.wait_for_timeout(300)

            elif mode == "latenight":
                # Trigger late night bubble beside head, keep prompt visible
                await page.evaluate("""() => {
                    localStorage.removeItem('sound_consent');
                    localStorage.removeItem('biyoo_sound_dismissed');
                    window.dispatchEvent(new CustomEvent('sound:show-prompt'));
                    if (window.__biyooEngine) {
                        window.__biyooEngine.resetBubbleCooldown();
                        window.__biyooEngine.triggerLateNight();
                    }
                }""")
                await page.wait_for_selector('[data-testid="biyoo-speech-bubble"]', state='visible', timeout=5000)
                await page.wait_for_timeout(300)

            # Paths to save
            root_path = os.path.join(WORKSPACE, filename)
            pub_path = os.path.join(PUBLIC_DIR, filename)
            art_path = os.path.join(ARTIFACT_DIR, filename)

            await page.screenshot(path=root_path, full_page=False)
            shutil.copyfile(root_path, pub_path)
            shutil.copyfile(root_path, art_path)

            size_bytes = os.path.getsize(root_path)
            results.append((filename, root_path, size_bytes))
            await context.close()

        await browser.close()

    print("\n================ EXPORTED PNG IMAGES ================")
    for filename, path, size in results:
        print(f"File: {filename}")
        print(f"  Path: {path}")
        print(f"  Size: {size:,} bytes")
    print("=====================================================\n")

if __name__ == "__main__":
    asyncio.run(run())
