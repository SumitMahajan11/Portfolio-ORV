import asyncio
import json
import time
from playwright.async_api import async_playwright

VIEWPORTS = [
    {"name": "Phone 360x740", "width": 360, "height": 740},
    {"name": "Phone 390x844", "width": 390, "height": 844},
    {"name": "Desktop 1280x800", "width": 1280, "height": 800}
]

async def run_diagnostics():
    with open("src/content/biyoo-kb.json", "r", encoding="utf-8") as f:
        kb_entries = json.load(f)

    async with async_playwright() as p:
        browser = await p.chromium.launch()

        for vp in VIEWPORTS:
            w, h = vp["width"], vp["height"]
            print(f"\n{'='*80}")
            print(f"=== VIEWPORT: {vp['name']} ({w}x{h}) ===")
            print(f"{'='*80}")

            for idx, entry in enumerate(kb_entries):
                print(f"\n--- [{idx+1}/10] ENTRY: {entry['id']} (sourceHref: {entry['sourceHref']}) ---")
                context = await browser.new_context(viewport={"width": w, "height": h})
                page = await context.new_page()

                # Fresh load, no scrolling
                await page.goto("http://localhost:3000/?skipIntro=true")
                await page.wait_for_selector('[data-biyoo-puppet="global"]')

                # Open panel
                await page.click('[data-biyoo-puppet="global"]')
                input_el = await page.wait_for_selector('[data-testid="biyoo-qa-input"]')
                await input_el.fill(entry["questions"][0])
                await page.keyboard.press("Enter")

                # Wait for answer
                await page.wait_for_selector('[data-testid="biyoo-qa-answer"]')

                # Select link ONLY inside the answer
                link_el = await page.wait_for_selector('[data-testid="biyoo-qa-answer"] a')
                link_html = await link_el.evaluate('el => el.outerHTML')
                print(f"Answer link outerHTML (first 200 chars):\n  {link_html[:200]}")

                # Print how many a[href="<sourceHref>"] elements exist in whole DOM + outerHTML (first 120 chars)
                all_links_info = await page.evaluate(f'''(href) => {{
                    const els = Array.from(document.querySelectorAll(`a[href="${{href}}"]`));
                    return {{
                        count: els.length,
                        htmls: els.map(e => e.outerHTML.substring(0, 120))
                    }};
                }}''', entry["sourceHref"])

                print(f"Total matching a[href=\"{entry['sourceHref']}\"] in DOM: {all_links_info['count']}")
                for i, h_text in enumerate(all_links_info['htmls']):
                    print(f"  [{i+1}] {h_text}")

                # Calculate link center
                # Ensure panel internal scrolling puts it into view if needed
                await link_el.scroll_into_view_if_needed()
                box = await link_el.bounding_box()
                if not box:
                    print("ERROR: link bounding box is None!")
                    await context.close()
                    continue

                cx = box['x'] + box['width'] / 2
                cy = box['y'] + box['height'] / 2

                # Check document.elementFromPoint at link's center
                efp_info = await page.evaluate(f'''({{cx, cy}}) => {{
                    const el = document.elementFromPoint(cx, cy);
                    if (!el) return {{ found: false, tag: null, isLinkOrChild: false, desc: 'null' }};
                    const answerLink = document.querySelector('[data-testid="biyoo-qa-answer"] a');
                    const isLinkOrChild = (el === answerLink) || answerLink.contains(el);
                    return {{
                        found: true,
                        tag: el.tagName.toLowerCase(),
                        isLinkOrChild: isLinkOrChild,
                        desc: el.outerHTML.substring(0, 150)
                    }};
                }}''', {"cx": cx, "cy": cy})

                print(f"elementFromPoint at center ({cx:.1f}, {cy:.1f}): tag=<{efp_info['tag']}>, isLinkOrChild={efp_info['isLinkOrChild']}")
                print(f"  efp outerHTML: {efp_info['desc']}")

                # Do real click with page.mouse.click
                target_sel = entry["sourceHref"]
                click_failed = False
                try:
                    await page.mouse.click(cx, cy)
                except Exception as e:
                    click_failed = True
                    print(f"Playwright Click ERROR: {e}")

                if not click_failed:
                    # Measure at 0.2s, 1s, and 3s after click
                    for delay, label in [(0.2, "0.2s"), (0.8, "1.0s"), (2.0, "3.0s")]:
                        await page.wait_for_timeout(int(delay * 1000))
                        meas = await page.evaluate(f'''(sel) => {{
                            const target = document.querySelector(sel);
                            return {{
                                hash: window.location.hash,
                                scrollY: window.scrollY,
                                targetTop: target ? Math.round(target.getBoundingClientRect().top) : null,
                                scrollHeight: document.scrollingElement ? document.scrollingElement.scrollHeight : null
                            }};
                        }}''', target_sel)

                        top_str = f"{meas['targetTop']}px" if meas['targetTop'] is not None else "N/A"
                        print(f"  At {label}: hash='{meas['hash']}', scrollY={meas['scrollY']}px, targetTop={top_str}, scrollHeight={meas['scrollHeight']}px")

                    # Wait until scrollHeight is unchanged for 500ms
                    # Check every 100ms
                    last_sh = await page.evaluate('() => document.scrollingElement.scrollHeight')
                    unchanged_start = time.time()
                    start_loop = time.time()

                    while time.time() - start_loop < 4.0:
                        await page.wait_for_timeout(100)
                        current_sh = await page.evaluate('() => document.scrollingElement.scrollHeight')
                        if current_sh == last_sh:
                            if time.time() - unchanged_start >= 0.5:
                                break
                        else:
                            last_sh = current_sh
                            unchanged_start = time.time()

                    # Re-measure target top after scrollHeight stabilizes
                    final_meas = await page.evaluate(f'''(sel) => {{
                        const target = document.querySelector(sel);
                        return {{
                            hash: window.location.hash,
                            scrollY: window.scrollY,
                            targetTop: target ? Math.round(target.getBoundingClientRect().top) : null,
                            scrollHeight: document.scrollingElement.scrollHeight
                        }};
                    }}''', target_sel)
                    final_top_str = f"{final_meas['targetTop']}px" if final_meas['targetTop'] is not None else "N/A"
                    print(f"  After scrollHeight stabilized (500ms unchanged):")
                    print(f"    hash='{final_meas['hash']}', scrollY={final_meas['scrollY']}px, targetTop={final_top_str}, scrollHeight={final_meas['scrollHeight']}px")

                await context.close()

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_diagnostics())

