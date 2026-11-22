import asyncio
from playwright.async_api import async_playwright

async def measure(viewport):
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        ctx = await b.new_context(viewport=viewport)
        page = await ctx.new_page()

        await page.goto("http://localhost:3000/", wait_until="networkidle")
        await page.evaluate("""() => {
            sessionStorage.setItem('biyoo_fake_hour', '3');
            sessionStorage.removeItem('biyoo_late_night_checked');
            localStorage.removeItem('sound_pref');
        }""")
        await page.reload(wait_until="networkidle")

        print(f"Waiting 5s for sound prompt and late-night bubble on {viewport['width']}x{viewport['height']}...")
        await page.wait_for_timeout(5000)

        boxes = await page.evaluate("""() => {
            const getBox = (el) => {
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return {
                    left: Math.round(r.left * 10) / 10,
                    top: Math.round(r.top * 10) / 10,
                    right: Math.round(r.right * 10) / 10,
                    bottom: Math.round(r.bottom * 10) / 10,
                    width: Math.round(r.width * 10) / 10,
                    height: Math.round(r.height * 10) / 10
                };
            };

            const soundPrompt = document.querySelector('#sound-permission-prompt');
            const constellationCard = Array.from(document.querySelectorAll('*')).find(el => el.textContent && el.textContent.includes('[CONSTELLATION BROADCAST]'))?.closest('.fixed');
            const biyooBox = document.querySelector('[data-testid="biyoo-live-puppet"]');
            const bubble = document.querySelector('[data-testid="biyoo-speech-bubble"]');
            const toggle = document.querySelector('[data-testid="biyoo-quiet-toggle"]');

            return {
                soundPrompt: getBox(soundPrompt),
                constellationCard: getBox(constellationCard),
                biyooBox: getBox(biyooBox),
                bubble: getBox(bubble),
                toggle: getBox(toggle)
            };
        }""")

        print(f"Bounding boxes for {viewport['width']}x{viewport['height']}:")
        for k, v in boxes.items():
            print(f"  {k}: {v}")

        # Check overlaps
        def overlaps(a, b):
            if not a or not b: return False
            return not (a['right'] <= b['left'] or a['left'] >= b['right'] or a['bottom'] <= b['top'] or a['top'] >= b['bottom'])

        items = list(boxes.items())
        any_overlap = False
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                k1, b1 = items[i]
                k2, b2 = items[j]
                if b1 and b2 and overlaps(b1, b2):
                    print(f"  WARNING: OVERLAP between {k1} and {k2}!")
                    any_overlap = True

        if not any_overlap:
            print("  SUCCESS: ZERO OVERLAPS between any elements!")

        await b.close()

async def main():
    print("--- TESTING 1440x900 ---")
    await measure({"width": 1440, "height": 900})
    print("\n--- TESTING 390x844 ---")
    await measure({"width": 390, "height": 844})

if __name__ == "__main__":
    asyncio.run(main())

