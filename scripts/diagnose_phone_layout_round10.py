import asyncio
import os
import shutil
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\SUMIT\.gemini\antigravity\brain\0f91a232-b6bc-421c-bf43-b43a4359eb3e"
LONG_BUBBLE_TEXT = "slow down, the story's not going anywhere"

def intersects(b1, b2):
    if not b1 or not b2:
        return False
    return not (b1['right'] <= b2['left'] or 
                b1['left'] >= b2['right'] or 
                b1['bottom'] <= b2['top'] or 
                b1['top'] >= b2['bottom'])

def to_rect(el_rect):
    if not el_rect:
        return None
    return {
        'left': round(el_rect['left'], 1),
        'top': round(el_rect['top'], 1),
        'right': round(el_rect['right'], 1),
        'bottom': round(el_rect['bottom'], 1),
        'width': round(el_rect['width'], 1),
        'height': round(el_rect['height'], 1)
    }

async def run_phone_diagnostics():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # Part 1: Longest bubble check at 360x740, 360x800, 390x844
        print("=================== PART 1: LONGEST BUBBLE WITH PROMPT VISIBLE ===================")
        for w, h in [(360, 740), (360, 800), (390, 844)]:
            print(f"\n--- Viewport {w}x{h} ---")
            page = await browser.new_page(viewport={"width": w, "height": h})
            # Clear localStorage so sound prompt displays
            await page.add_init_script("() => { try { localStorage.clear(); sessionStorage.clear(); } catch(e){} }")
            await page.goto("http://localhost:3000/?skipIntro=true")
            
            # Wait for sound prompt (triggers at 4500ms)
            prompt_el = await page.wait_for_selector("#sound-permission-prompt", timeout=6000)
            
            # Force the longest bubble
            await page.evaluate(f'''(text) => {{
                if (window.__biyooEngine && typeof window.__biyooEngine.showBubble === 'function') {{
                    window.__biyooEngine.showBubble(text, true);
                }}
            }}''', LONG_BUBBLE_TEXT)
            await page.wait_for_timeout(400)

            # Query rects
            rects = await page.evaluate('''() => {
                function getR(sel) {
                    const el = document.querySelector(sel);
                    if (!el) return null;
                    const r = el.getBoundingClientRect();
                    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
                }
                return {
                    bubble: getR('.biyoo-bubble-dock, [data-testid="biyoo-speech-bubble"]'),
                    prompt: getR('#sound-permission-prompt'),
                    toggle: getR('.biyoo-control-btn, #biyoo-quiet-toggle'),
                    biyoo: getR('.biyoo-puppet-dock, [data-biyoo-puppet]')
                };
            }''')

            bubble_r = to_rect(rects['bubble'])
            prompt_r = to_rect(rects['prompt'])
            toggle_r = to_rect(rects['toggle'])
            biyoo_r = to_rect(rects['biyoo'])

            # Gap between bubble and prompt
            h_gap = round(bubble_r['left'] - prompt_r['right'], 1) if (bubble_r and prompt_r) else None
            v_gap = round(prompt_r['top'] - bubble_r['bottom'], 1) if (bubble_r and prompt_r) else None

            print(f"Biyoo rect:  {biyoo_r}")
            print(f"Bubble rect: {bubble_r}")
            print(f"Toggle rect: {toggle_r}")
            print(f"Prompt rect: {prompt_r}")
            print(f"Gap between bubble and prompt:")
            print(f"  Horizontal gap (bubble.left - prompt.right): {h_gap}px")
            print(f"  Vertical gap (prompt.top - bubble.bottom):     {v_gap}px")
            print(f"  Direct intersection: {intersects(bubble_r, prompt_r)}")

            if (w, h) == (360, 740):
                await page.screenshot(path="round10-360x740-long-bubble.png")
                print("Captured screenshot: round10-360x740-long-bubble.png")

            await page.close()

        # Part 2: Open Q&A panel at 360x640, 360x740, 390x844
        print("\n=================== PART 2: Q&A PANEL OPEN CHECKS ===================")
        for w, h in [(360, 640), (360, 740), (390, 844)]:
            print(f"\n--- Viewport {w}x{h} (Panel Open) ---")
            page = await browser.new_page(viewport={"width": w, "height": h})
            await page.goto("http://localhost:3000/?skipIntro=true")
            await page.wait_for_timeout(1000)

            puppet = await page.wait_for_selector('.biyoo-puppet-dock, [data-biyoo-puppet]')
            await puppet.click()
            await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')
            await page.wait_for_timeout(500)

            diag = await page.evaluate('''() => {
                function getR(el) {
                    if (!el) return null;
                    const r = el.getBoundingClientRect();
                    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
                }

                const panel = document.querySelector('[data-testid="biyoo-qa-panel"]');
                const biyoo = document.querySelector('.biyoo-puppet-dock, [data-biyoo-puppet]');
                const bubble = document.querySelector('.biyoo-bubble-dock, [data-testid="biyoo-speech-bubble"]');
                const toggle = document.querySelector('.biyoo-control-btn, #biyoo-quiet-toggle');
                const prompt = document.querySelector('#sound-permission-prompt');

                const hero = document.getElementById('hero-scene');
                const ctas = hero ? Array.from(hero.querySelectorAll('a, button')) : [];
                const navLinks = Array.from(document.querySelectorAll('nav a, header a'));
                const headings = hero ? Array.from(hero.querySelectorAll('h1, h2, h3')) : [];
                const paragraphs = hero ? Array.from(hero.querySelectorAll('p')) : [];

                return {
                    biyooOwned: {
                        panel: getR(panel),
                        biyoo: getR(biyoo),
                        bubble: getR(bubble),
                        toggle: getR(toggle),
                        prompt: getR(prompt)
                    },
                    heroElements: {
                        ctas: ctas.map(getR),
                        navLinks: navLinks.map(getR),
                        headings: headings.map(getR),
                        paragraphs: paragraphs.map(getR)
                    }
                };
            }''')

            bo = diag['biyooOwned']
            print("Biyoo-owned element rects:")
            print(f"  panel:  {to_rect(bo['panel'])}")
            print(f"  biyoo:  {to_rect(bo['biyoo'])}")
            print(f"  bubble: {to_rect(bo['bubble'])}")
            print(f"  toggle: {to_rect(bo['toggle'])}")
            print(f"  prompt: {to_rect(bo['prompt'])}")

            panel_r = bo['panel']
            biyoo_r = bo['biyoo']
            toggle_r = bo['toggle']

            intersections = 0
            intersecting_pairs = []

            for category, el_list in diag['heroElements'].items():
                for i, el_r in enumerate(el_list):
                    if not el_r:
                        continue
                    for box_name, b_box in [('panel', panel_r), ('biyoo', biyoo_r), ('toggle', toggle_r)]:
                        if b_box and intersects(el_r, b_box):
                            intersections += 1
                            intersecting_pairs.append((f"{category}[{i}]", box_name))

            print(f"Intersection count against hero CTAs, nav links, headings, paragraphs: {intersections}")
            if intersections > 0:
                print(f"Intersecting pairs: {intersecting_pairs}")

            if (w, h) == (360, 740):
                await page.screenshot(path="round10-360x740-panel-open.png")
                print("Captured screenshot: round10-360x740-panel-open.png")
            elif (w, h) == (390, 844):
                await page.screenshot(path="round10-390x844-panel-open.png")
                print("Captured screenshot: round10-390x844-panel-open.png")

            await page.close()

        await browser.close()

    # Copy files to artifact directory
    exported_files = [
        "round10-360x740-panel-open.png",
        "round10-390x844-panel-open.png",
        "round10-360x740-long-bubble.png"
    ]
    if os.path.exists(ARTIFACT_DIR):
        for f in exported_files:
            if os.path.exists(f):
                shutil.copy2(f, os.path.join(ARTIFACT_DIR, f))
                print(f"Copied to artifact dir: {f}")

if __name__ == "__main__":
    asyncio.run(run_phone_diagnostics())
