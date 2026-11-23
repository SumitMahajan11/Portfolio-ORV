import asyncio
import os
from playwright.async_api import async_playwright

VIEWPORTS = [
    {"width": 360, "height": 640},
    {"width": 360, "height": 740},
    {"width": 390, "height": 844}
]

def intersects(b1, b2):
    if not b1 or not b2:
        return False
    return not (b1['right'] <= b2['left'] or 
                b1['left'] >= b2['right'] or 
                b1['bottom'] <= b2['top'] or 
                b1['top'] >= b2['bottom'])

async def run_diagnostics():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        for vp in VIEWPORTS:
            w, h = vp["width"], vp["height"]
            print(f"\n==================================================================")
            print(f"=== VIEWPORT {w}x{h} ===")
            print(f"==================================================================")

            page = await browser.new_page(viewport={"width": w, "height": h})
            await page.goto("http://localhost:3000/?skipIntro=true")
            await page.wait_for_selector('[data-biyoo-puppet="global"]')

            # 1. Open panel and render longest KB answer
            # We'll test 'who-is-sumit' (208 chars) and also check 'iac-verifier-z3' (136 chars)
            puppet = await page.wait_for_selector('[data-biyoo-puppet="global"]')
            await puppet.click()
            input_el = await page.wait_for_selector('[data-testid="biyoo-qa-input"]')
            await input_el.fill("Who is Sumit?")
            await page.keyboard.press("Enter")
            await page.wait_for_selector('[data-testid="biyoo-qa-answer"]')

            # Measure panel and Biyoo
            measurements = await page.evaluate('''() => {
                const panel = document.querySelector('[data-testid="biyoo-qa-panel"]');
                const puppet = document.querySelector('[data-biyoo-puppet="global"]');
                const answer = document.querySelector('[data-testid="biyoo-qa-answer"]');
                if (!panel || !puppet) return null;

                const pr = panel.getBoundingClientRect();
                const br = puppet.getBoundingClientRect();
                const pcs = window.getComputedStyle(panel);

                return {
                    panelRect: {
                        left: Math.round(pr.left * 10) / 10,
                        top: Math.round(pr.top * 10) / 10,
                        right: Math.round(pr.right * 10) / 10,
                        bottom: Math.round(pr.bottom * 10) / 10,
                        width: Math.round(pr.width * 10) / 10,
                        height: Math.round(pr.height * 10) / 10
                    },
                    biyooRect: {
                        left: Math.round(br.left * 10) / 10,
                        top: Math.round(br.top * 10) / 10,
                        right: Math.round(br.right * 10) / 10,
                        bottom: Math.round(br.bottom * 10) / 10,
                        width: Math.round(br.width * 10) / 10,
                        height: Math.round(br.height * 10) / 10
                    },
                    panelClientHeight: panel.clientHeight,
                    panelScrollHeight: panel.scrollHeight,
                    panelOverflowY: pcs.overflowY,
                    answerScrollHeight: answer ? answer.scrollHeight : null,
                    answerClientHeight: answer ? answer.clientHeight : null
                };
            }''')

            p_rect = measurements['panelRect']
            b_rect = measurements['biyooRect']
            does_intersect = intersects(p_rect, b_rect)
            does_scroll = measurements['panelScrollHeight'] > measurements['panelClientHeight']

            print(f"Panel Rect:               {p_rect}")
            print(f"Biyoo Rect:               {b_rect}")
            print(f"Panel computed overflow-y:{measurements['panelOverflowY']}")
            print(f"Panel clientHeight:       {measurements['panelClientHeight']}px")
            print(f"Panel scrollHeight:       {measurements['panelScrollHeight']}px")
            print(f"Answer scrolls inside:    {does_scroll} (scrollHeight={measurements['panelScrollHeight']} > clientHeight={measurements['panelClientHeight']})")
            print(f"Intersects Biyoo rect:    {does_intersect}")

            # 2. Test Esc key
            print("\nTesting Esc key:")
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(300)
            esc_closed = await page.evaluate('''() => {
                const p = document.querySelector('[data-testid="biyoo-qa-panel"]');
                return p === null || window.getComputedStyle(p).display === 'none';
            }''')
            print(f"  Esc closes panel: {esc_closed}")

            # 3. Test Outside click
            print("\nTesting Outside click:")
            # Re-open panel
            await page.click('[data-biyoo-puppet="global"]')
            await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')
            # Click outside at (10, 10)
            await page.mouse.click(10, 10)
            await page.wait_for_timeout(300)
            outside_closed = await page.evaluate('''() => {
                const p = document.querySelector('[data-testid="biyoo-qa-panel"]');
                return p === null || window.getComputedStyle(p).display === 'none';
            }''')
            print(f"  Outside click closes panel: {outside_closed}")

            # 4. Test Close control (✕)
            print("\nTesting Close control (✕):")
            # Re-open panel
            await page.click('[data-biyoo-puppet="global"]')
            await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')
            # Click close button
            close_btn = page.locator('button[aria-label="Close question dialog"]')
            await close_btn.click()
            await page.wait_for_timeout(300)
            close_btn_closed = await page.evaluate('''() => {
                const p = document.querySelector('[data-testid="biyoo-qa-panel"]');
                return p === null || window.getComputedStyle(p).display === 'none';
            }''')
            print(f"  Close control (✕) closes panel: {close_btn_closed}")

            await page.close()

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_diagnostics())

