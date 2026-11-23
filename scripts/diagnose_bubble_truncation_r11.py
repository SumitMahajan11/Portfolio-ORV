import asyncio
import os
import shutil
from playwright.async_api import async_playwright
from PIL import Image

ARTIFACT_DIR = r"C:\Users\SUMIT\.gemini\antigravity\brain\0f91a232-b6bc-421c-bf43-b43a4359eb3e"

BUBBLES = [
    {"label": "short", "text": "why are we both awake?"},
    {"label": "long", "text": "slow down, the story's not going anywhere"}
]

VIEWPORTS = [
    {"width": 360, "height": 740},
    {"width": 390, "height": 844}
]

async def run_diagnostics():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        for vp in VIEWPORTS:
            w, h = vp["width"], vp["height"]
            print(f"\n==================================================================")
            print(f"=== VIEWPORT {w}x{h} ===")
            print(f"==================================================================")

            for b in BUBBLES:
                label = b["label"]
                text = b["text"]
                print(f"\n--- Bubble: '{text}' ({label}) at {w}x{h} ---")

                page = await browser.new_page(viewport={"width": w, "height": h})
                await page.goto("http://localhost:3000/?skipIntro=true")
                await page.wait_for_selector('[data-biyoo-puppet="global"]')

                # Force speech bubble
                await page.evaluate(f'''(t) => {{
                    if (window.__biyooEngine && typeof window.__biyooEngine.showBubble === 'function') {{
                        window.__biyooEngine.showBubble(t, true);
                    }}
                }}''', text)
                await page.wait_for_timeout(400)

                bubble_locator = page.locator('[data-testid="biyoo-speech-bubble"]')
                span_locator = bubble_locator.locator('span').first

                # Extract container details
                container_data = await page.evaluate('''() => {
                    const el = document.querySelector('[data-testid="biyoo-speech-bubble"]');
                    if (!el) return null;
                    const r = el.getBoundingClientRect();
                    const cs = window.getComputedStyle(el);
                    return {
                        innerText: el.innerText,
                        clientHeight: el.clientHeight,
                        scrollHeight: el.scrollHeight,
                        overflow: cs.overflow,
                        overflowX: cs.overflowX,
                        overflowY: cs.overflowY,
                        rect: {
                            left: Math.round(r.left * 10) / 10,
                            top: Math.round(r.top * 10) / 10,
                            right: Math.round(r.right * 10) / 10,
                            bottom: Math.round(r.bottom * 10) / 10,
                            width: Math.round(r.width * 10) / 10,
                            height: Math.round(r.height * 10) / 10
                        }
                    };
                }''')

                # Extract text span details
                span_data = await page.evaluate('''() => {
                    const el = document.querySelector('[data-testid="biyoo-speech-bubble"] span');
                    if (!el) return null;
                    const r = el.getBoundingClientRect();
                    const cs = window.getComputedStyle(el);
                    return {
                        innerText: el.innerText,
                        clientHeight: el.clientHeight,
                        scrollHeight: el.scrollHeight,
                        overflow: cs.overflow,
                        lineClamp: cs.webkitLineClamp || cs.lineClamp,
                        boxOrient: cs.webkitBoxOrient,
                        rect: {
                            left: Math.round(r.left * 10) / 10,
                            top: Math.round(r.top * 10) / 10,
                            right: Math.round(r.right * 10) / 10,
                            bottom: Math.round(r.bottom * 10) / 10,
                            width: Math.round(r.width * 10) / 10,
                            height: Math.round(r.height * 10) / 10
                        }
                    };
                }''')

                print("Bubble Container:")
                print(f"  innerText:     {repr(container_data['innerText'])}")
                print(f"  clientHeight:  {container_data['clientHeight']}px")
                print(f"  scrollHeight:  {container_data['scrollHeight']}px")
                print(f"  overflow:      {container_data['overflow']} (x: {container_data['overflowX']}, y: {container_data['overflowY']})")
                print(f"  rect:          {container_data['rect']}")

                print("Text Span (inner):")
                print(f"  innerText:         {repr(span_data['innerText'])}")
                print(f"  clientHeight:      {span_data['clientHeight']}px")
                print(f"  scrollHeight:      {span_data['scrollHeight']}px")
                print(f"  computed overflow: {span_data['overflow']}")
                print(f"  -webkit-line-clamp:{span_data['lineClamp']}")
                print(f"  rect:              {span_data['rect']}")

                is_overflowing = span_data['scrollHeight'] > span_data['clientHeight']
                print(f"  scrollHeight > clientHeight: {is_overflowing}")
                print(f"  Clamped: {is_overflowing or (span_data['lineClamp'] != 'none')}")

                # If 360x740, export 1:1 crop of the bubble
                if (w, h) == (360, 740):
                    filename = f"round11-360x740-bubble-{label}.png"
                    local_path = os.path.join("scripts", filename)
                    await bubble_locator.screenshot(path=local_path)
                    
                    # Also copy to artifacts dir
                    artifact_path = os.path.join(ARTIFACT_DIR, filename)
                    shutil.copy2(local_path, artifact_path)

                    # Get image dimensions and file size
                    with Image.open(local_path) as img:
                        img_w, img_h = img.size
                    file_size = os.path.getsize(local_path)

                    print(f"  Exported 1:1 crop:")
                    print(f"    Path: {local_path} (and copied to {artifact_path})")
                    print(f"    Dimensions: {img_w}x{img_h} px")
                    print(f"    File size: {file_size} bytes")

                await page.close()

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_diagnostics())

