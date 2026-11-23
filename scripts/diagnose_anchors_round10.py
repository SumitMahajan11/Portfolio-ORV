import asyncio
import json
from playwright.async_api import async_playwright

SELECTORS_TO_CHECK = [
    "#hero-scene",
    "#scenario-select",
    "#edge-cloud",
    "#ratify",
    "#iac-verifier",
    "#readers-record",
    "#contact"
]

VIEWPORTS = [
    {"width": 1280, "height": 800},
    {"width": 390, "height": 844}
]

async def check_anchors_for_viewport(p, vp):
    print(f"\n=================== VIEWPORT {vp['width']}x{vp['height']} ===================")
    browser = await p.chromium.launch()
    page = await browser.new_page(viewport=vp)
    
    await page.goto("http://localhost:3000/?skipIntro=true")
    await page.wait_for_timeout(1000)
    
    # Scroll down in 800px steps, wait 500ms per step, then network idle
    max_scroll = await page.evaluate("() => document.body.scrollHeight")
    curr_scroll = 0
    while curr_scroll < max_scroll:
        curr_scroll += 800
        await page.evaluate(f"window.scrollTo(0, {curr_scroll})")
        await page.wait_for_timeout(500)
        max_scroll = await page.evaluate("() => document.body.scrollHeight")
        
    try:
        await page.wait_for_load_state("networkidle", timeout=5000)
    except Exception:
        pass
    
    # Check selectors
    print("--- Target Selector Check ---")
    for sel in SELECTORS_TO_CHECK:
        info = await page.evaluate(f'''(selector) => {{
            const el = document.querySelector(selector);
            if (!el) return {{ selector, found: false, tag: null, id: null, rect: null }};
            const r = el.getBoundingClientRect();
            return {{
                selector,
                found: true,
                tag: el.tagName,
                id: el.id,
                rect: {{
                    x: Math.round(r.x),
                    y: Math.round(r.y),
                    width: Math.round(r.width),
                    height: Math.round(r.height)
                }}
            }};
        }}''', sel)
        print(f"Selector: {info['selector']}")
        print(f"  found: {info['found']}")
        print(f"  tag: {info['tag']}")
        print(f"  id: {info['id']}")
        print(f"  rect: {info['rect']}")

    # Print every element id in the DOM, one per line
    all_ids = await page.evaluate('''() => {
        const els = Array.from(document.querySelectorAll('[id]'));
        return els.map(el => el.id).filter(Boolean);
    }''')
    print(f"\n--- All DOM Element IDs ({len(all_ids)} total) ---")
    for elem_id in all_ids:
        print(elem_id)

    # Scroll back to top for KB questions testing
    await page.evaluate("window.scrollTo(0, 0)")
    await page.wait_for_timeout(500)

    # Load KB
    with open("src/content/biyoo-kb.json", "r", encoding="utf-8") as f:
        kb_entries = json.load(f)

    print("\n--- KB Entry Questions[0] & Source Link Navigation ---")
    for entry in kb_entries:
        q = entry["questions"][0]
        
        # Ensure panel is open
        panel = await page.query_selector('[data-testid="biyoo-qa-panel"]')
        if not panel:
            puppet = await page.wait_for_selector('.biyoo-puppet-dock, [data-biyoo-puppet]')
            await puppet.click()
            await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        else:
            ask_another = await page.query_selector('button:has-text("ask another")')
            if ask_another:
                try:
                    await ask_another.click()
                    await page.wait_for_timeout(200)
                except Exception:
                    pass

        input_el = await page.wait_for_selector('[data-testid="biyoo-qa-input"]')
        await input_el.fill("")
        await input_el.fill(q)
        await page.keyboard.press("Enter")
        await page.wait_for_timeout(500)

        # Find answer and source link
        source_link = await page.query_selector('[data-testid="biyoo-qa-answer"] a')
        if not source_link:
            print(f"[{entry['id']}] Q: \"{q}\" -> No source link found in answer")
            continue

        href = await source_link.get_attribute("href")
        await source_link.click()
        await page.wait_for_timeout(600)

        nav_info = await page.evaluate(f'''(targetHref) => {{
            const hash = window.location.hash;
            const targetEl = hash ? document.querySelector(hash) : null;
            let topOffset = null;
            if (targetEl) {{
                const r = targetEl.getBoundingClientRect();
                topOffset = Math.round(r.top + window.scrollY);
            }}
            return {{
                hash,
                targetExists: Boolean(targetEl),
                topOffset,
                scrollY: Math.round(window.scrollY)
            }};
        }}''', href)
        print(f"[{entry['id']}] Q: \"{q}\"")
        print(f"  sourceHref: {entry['sourceHref']}")
        print(f"  location.hash: {nav_info['hash']}")
        print(f"  targetExists: {nav_info['targetExists']}")
        print(f"  target topOffset: {nav_info['topOffset']} (window.scrollY: {nav_info['scrollY']})")

    await browser.close()

async def main():
    async with async_playwright() as p:
        for vp in VIEWPORTS:
            await check_anchors_for_viewport(p, vp)

if __name__ == "__main__":
    asyncio.run(main())
