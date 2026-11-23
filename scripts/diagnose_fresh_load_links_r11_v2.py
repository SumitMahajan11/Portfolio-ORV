import asyncio
import json
from playwright.async_api import async_playwright

async def run_diagnostics():
    with open("src/content/biyoo-kb.json", "r", encoding="utf-8") as f:
        kb = json.load(f)

    viewports = [
        {"name": "Desktop (1280x800)", "width": 1280, "height": 800},
        {"name": "Mobile (390x844)", "width": 390, "height": 844}
    ]

    async with async_playwright() as p:
        browser = await p.chromium.launch()

        for vp in viewports:
            print(f"\n==================================================================")
            print(f"=== VIEWPORT: {vp['name']} ({vp['width']}x{vp['height']}) ===")
            print(f"==================================================================")

            # Test 1: Each of the 10 KB entries
            print("\n--- 10 KB ENTRIES (FRESH LOAD) ---")
            print(f"{'Entry ID':<20} | {'sourceHref':<18} | {'Target Existed?':<15} | {'Hash':<18} | {'ScrollY (0s)':<12} | {'ScrollY (1s)':<12} | {'Top (1s)':<12} | {'ScrollY (3s)':<12} | {'Top (3s)':<12}")
            print("-" * 145)

            for entry in kb:
                context = await browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
                page = await context.new_page()
                await page.goto("http://localhost:3000/?skipIntro=true")
                await page.wait_for_selector('[data-biyoo-puppet="global"]')

                # Open Q&A panel
                await page.click('[data-biyoo-puppet="global"]')
                input_el = await page.wait_for_selector('[data-testid="biyoo-qa-input"]')
                await input_el.fill(entry["questions"][0])
                await page.keyboard.press("Enter")

                # Wait for answer
                await page.wait_for_selector('[data-testid="biyoo-qa-answer"]')
                source_link = await page.wait_for_selector(f'a[href="{entry["sourceHref"]}"]')

                # Check if target element exists at click time
                target_sel = entry["sourceHref"]
                target_existed = await page.evaluate(f'''(sel) => {{
                    try {{
                        return document.querySelector(sel) !== null;
                    }} catch(e) {{
                        return false;
                    }}
                }}''', target_sel)

                scroll_y_0 = await page.evaluate('() => window.scrollY')

                # Scroll into view inside the panel and click immediately
                try:
                    await source_link.scroll_into_view_if_needed()
                    await source_link.click(force=True)
                except Exception:
                    await page.evaluate('(sel) => { const el = document.querySelector(sel); if(el) el.click(); }', f'a[href="{entry["sourceHref"]}"]')

                # Measure at 1s
                await page.wait_for_timeout(1000)
                measure_1s = await page.evaluate(f'''(sel) => {{
                    const el = document.querySelector(sel);
                    return {{
                        hash: window.location.hash,
                        scrollY: window.scrollY,
                        targetTop: el ? Math.round(el.getBoundingClientRect().top) : null
                    }};
                }}''', target_sel)

                # Measure at 3s (wait 2s more)
                await page.wait_for_timeout(2000)
                measure_3s = await page.evaluate(f'''(sel) => {{
                    const el = document.querySelector(sel);
                    return {{
                        hash: window.location.hash,
                        scrollY: window.scrollY,
                        targetTop: el ? Math.round(el.getBoundingClientRect().top) : null
                    }};
                }}''', target_sel)

                target_existed_str = "YES" if target_existed else "NO (NOT FOUND)"
                hash_str = measure_1s["hash"]
                s0_str = f"{scroll_y_0}px"
                s1_str = f"{measure_1s['scrollY']}px"
                t1_str = f"{measure_1s['targetTop']}px" if measure_1s['targetTop'] is not None else "N/A"
                s3_str = f"{measure_3s['scrollY']}px"
                t3_str = f"{measure_3s['targetTop']}px" if measure_3s['targetTop'] is not None else "N/A"

                print(f"{entry['id']:<20} | {entry['sourceHref']:<18} | {target_existed_str:<15} | {hash_str:<18} | {s0_str:<12} | {s1_str:<12} | {t1_str:<12} | {s3_str:<12} | {t3_str:<12}")

                await context.close()

            # Test 2: Fallback answer link (#readers-record)
            print("\n--- FALLBACK ANSWER LINK (FRESH LOAD) ---")
            print(f"{'Target Link':<20} | {'sourceHref':<18} | {'Target Existed?':<15} | {'Hash':<18} | {'ScrollY (0s)':<12} | {'ScrollY (1s)':<12} | {'Top (1s)':<12} | {'ScrollY (3s)':<12} | {'Top (3s)':<12}")
            print("-" * 145)

            context = await browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
            page = await context.new_page()
            await page.goto("http://localhost:3000/?skipIntro=true")
            await page.wait_for_selector('[data-biyoo-puppet="global"]')
            await page.click('[data-biyoo-puppet="global"]')
            input_el = await page.wait_for_selector('[data-testid="biyoo-qa-input"]')
            await input_el.fill("how old is he?")
            await page.keyboard.press("Enter")
            await page.wait_for_selector('[data-testid="biyoo-qa-answer"]')
            source_link = await page.wait_for_selector('a[href="#readers-record"]')

            target_existed = await page.evaluate('() => document.querySelector("#readers-record") !== null')
            scroll_y_0 = await page.evaluate('() => window.scrollY')
            
            try:
                await source_link.scroll_into_view_if_needed()
                await source_link.click(force=True)
            except Exception:
                await page.evaluate('() => { const el = document.querySelector(\'a[href="#readers-record"]\'); if(el) el.click(); }')

            await page.wait_for_timeout(1000)
            measure_1s = await page.evaluate('''() => {
                const el = document.querySelector("#readers-record");
                return {
                    hash: window.location.hash,
                    scrollY: window.scrollY,
                    targetTop: el ? Math.round(el.getBoundingClientRect().top) : null
                };
            }''')

            await page.wait_for_timeout(2000)
            measure_3s = await page.evaluate('''() => {
                const el = document.querySelector("#readers-record");
                return {
                    hash: window.location.hash,
                    scrollY: window.scrollY,
                    targetTop: el ? Math.round(el.getBoundingClientRect().top) : null
                };
            }''')

            target_existed_str = "YES" if target_existed else "NO (NOT FOUND)"
            print(f"{'Fallback (#readers)':<20} | {'#readers-record':<18} | {target_existed_str:<15} | {measure_1s['hash']:<18} | {scroll_y_0}px{'':<7} | {measure_1s['scrollY']}px{'':<7} | {str(measure_1s['targetTop']) + 'px' if measure_1s['targetTop'] is not None else 'N/A':<12} | {measure_3s['scrollY']}px{'':<7} | {str(measure_3s['targetTop']) + 'px' if measure_3s['targetTop'] is not None else 'N/A':<12}")
            await context.close()

            # Test 3: Hero CTAs ("See the projects" and "Read the evidence")
            print("\n--- HERO CTAs (FRESH LOAD) ---")
            print(f"{'CTA Name':<20} | {'Target Href':<18} | {'Target Existed?':<15} | {'Hash':<18} | {'ScrollY (0s)':<12} | {'ScrollY (1s)':<12} | {'Top (1s)':<12} | {'ScrollY (3s)':<12} | {'Top (3s)':<12}")
            print("-" * 145)

            ctas = [
                {"name": "See the projects", "selector": 'a:has-text("See the projects")', "target": "#scenario-select"},
                {"name": "Read the evidence", "selector": 'a:has-text("Read the evidence")', "target": "#readers-record"}
            ]

            for cta in ctas:
                context = await browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
                page = await context.new_page()
                await page.goto("http://localhost:3000/?skipIntro=true")
                await page.wait_for_selector(cta["selector"])

                target_existed = await page.evaluate(f'''(sel) => {{
                    return document.querySelector(sel) !== null;
                }}''', cta["target"])

                scroll_y_0 = await page.evaluate('() => window.scrollY')
                await page.click(cta["selector"])

                await page.wait_for_timeout(1000)
                measure_1s = await page.evaluate(f'''(sel) => {{
                    const el = document.querySelector(sel);
                    return {{
                        hash: window.location.hash,
                        scrollY: window.scrollY,
                        targetTop: el ? Math.round(el.getBoundingClientRect().top) : null
                    }};
                }}''', cta["target"])

                await page.wait_for_timeout(2000)
                measure_3s = await page.evaluate(f'''(sel) => {{
                    const el = document.querySelector(sel);
                    return {{
                        hash: window.location.hash,
                        scrollY: window.scrollY,
                        targetTop: el ? Math.round(el.getBoundingClientRect().top) : null
                    }};
                }}''', cta["target"])

                target_existed_str = "YES" if target_existed else "NO (NOT FOUND)"
                t1_val = str(measure_1s['targetTop']) + 'px' if measure_1s['targetTop'] is not None else 'N/A'
                t3_val = str(measure_3s['targetTop']) + 'px' if measure_3s['targetTop'] is not None else 'N/A'
                print(f"{cta['name']:<20} | {cta['target']:<18} | {target_existed_str:<15} | {measure_1s['hash']:<18} | {scroll_y_0}px{'':<7} | {measure_1s['scrollY']}px{'':<7} | {t1_val:<12} | {measure_3s['scrollY']}px{'':<7} | {t3_val:<12}")
                await context.close()

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_diagnostics())

