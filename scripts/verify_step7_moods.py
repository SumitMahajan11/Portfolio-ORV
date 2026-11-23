import asyncio
import time
from datetime import datetime, timezone
from playwright.async_api import async_playwright

async def measure_visibility(page, section_id):
    return await page.evaluate('''id => {
        const el = document.getElementById(id);
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const visibleHeight = Math.max(0, Math.min(vh, rect.bottom) - Math.max(0, rect.top));
        if (visibleHeight <= 0) return 0;
        const elemRatio = rect.height > 0 ? visibleHeight / rect.height : 0;
        const vpRatio = vh > 0 ? visibleHeight / vh : 0;
        return Math.max(elemRatio, vpRatio);
    }''', section_id)

async def get_live_expression(page):
    return await page.locator('[data-testid="biyoo-live-puppet"]').get_attribute('data-biyoo-expression')

async def run_proof():
    print("=" * 80)
    print("STEP 7: PROJECT-WORLD MOODS VERIFICATION")
    print("=" * 80)
    
    # 1. Exact selectors used to read live expression
    print("\n1. EXACT DOM SELECTORS")
    puppet_selector = '[data-testid="biyoo-live-puppet"]'
    attr_name = 'data-biyoo-expression'
    text_selector = '[data-testid="biyoo-current-expression"]'
    print(f"Puppet container selector: {puppet_selector}")
    print(f"Live expression attribute: {puppet_selector}[{attr_name}]")
    print(f"Live expression text element selector: {text_selector}")
    print("All live expressions are read strictly from DOM attributes / DOM content without window hooks.")

    viewports = [
        {"name": "desktop (1440x900)", "width": 1440, "height": 900},
        {"name": "mobile (390x844)", "width": 390, "height": 844}
    ]

    async with async_playwright() as p:
        browser = await p.chromium.launch()

        for vp in viewports:
            print("\n" + "-" * 80)
            print(f"VIEWPORT: {vp['name']}")
            print("-" * 80)

            context = await browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
            page = await context.new_page()
            await page.goto("http://localhost:3000")
            await page.wait_for_timeout(1000)

            # Verification A: Slow scroll through all 3 sections
            print(f"\n--- Slow scroll through all 3 sections ({vp['name']}) ---")
            sections = [
                {"id": "edge-cloud", "expected_expr": "happy"},
                {"id": "ratify", "expected_expr": "curious"},
                {"id": "iac-verifier", "expected_expr": "neutral"}
            ]

            results_table = []

            for sec in sections:
                sec_id = sec["id"]
                # Scroll slowly down until section is > 50% visible
                for _ in range(120):
                    vis = await measure_visibility(page, sec_id)
                    if vis > 0.50:
                        break
                    await page.mouse.wheel(0, 160)
                    await page.wait_for_timeout(80)

                # Wait 1.6s for mood trigger (requires 1.5s continuous visibility)
                await page.wait_for_timeout(1600)
                
                vis_at_start = await measure_visibility(page, sec_id)
                start_expr = await get_live_expression(page)
                start_ts = datetime.now(timezone.utc).isoformat()

                # Scroll slowly until section drops below 30% visible
                for _ in range(120):
                    vis = await measure_visibility(page, sec_id)
                    if vis < 0.30:
                        break
                    await page.mouse.wheel(0, 160)
                    await page.wait_for_timeout(80)

                await page.wait_for_timeout(200)
                end_ts = datetime.now(timezone.utc).isoformat()
                after_expr = await get_live_expression(page)

                results_table.append({
                    "section": f"#{sec_id}",
                    "visible_pct": f"{vis_at_start * 100:.1f}%",
                    "expression": start_expr,
                    "start_ts": start_ts,
                    "end_ts": end_ts,
                    "after_expr": after_expr
                })

            # Print Table
            print(f"{'section':<16} | {'visible %':<10} | {'expression':<12} | {'start timestamp':<26} | {'end timestamp':<26} | {'after leaving':<14}")
            print("-" * 115)
            for row in results_table:
                print(f"{row['section']:<16} | {row['visible_pct']:<10} | {row['expression']:<12} | {row['start_ts']:<26} | {row['end_ts']:<26} | {row['after_expr']:<14}")

            # Verification B: Fast scroll top to bottom (count expression changes)
            print(f"\n--- Fast scroll top to bottom ({vp['name']}) ---")
            await page.goto("http://localhost:3000")
            await page.wait_for_timeout(1000)

            # Observe expression changes during rapid scroll from top to bottom
            initial_expr = await get_live_expression(page)
            expr_history = [initial_expr]

            for _ in range(8):
                await page.mouse.wheel(0, 1500)
                curr = await get_live_expression(page)
                if curr != expr_history[-1]:
                    expr_history.append(curr)
                is_bottom = await page.evaluate("window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 60")
                if is_bottom:
                    break
                await page.wait_for_timeout(30)

            # Expression changes count (transitions between different expressions during fast scroll top to bottom)
            changes_count = len(expr_history) - 1
            print(f"Observed expressions sequence during fast scroll: {expr_history}")
            print(f"Expression changes count during fast scroll: {changes_count} (must be 0 or 1)")

            # Verification C: Idle 15s inside #ratify
            print(f"\n--- Idle 15s inside #ratify ({vp['name']}) ---")
            await page.goto("http://localhost:3000")
            await page.wait_for_timeout(1000)

            # Scroll into #ratify
            for _ in range(120):
                vis = await measure_visibility(page, "ratify")
                if vis > 0.50:
                    break
                await page.mouse.wheel(0, 160)
                await page.wait_for_timeout(80)

            # Wait 1.6s for curious mood to establish
            await page.wait_for_timeout(1600)
            initial_ratify_expr = await get_live_expression(page)
            print(f"Mood before idle: {initial_ratify_expr}")

            # Idle for 14.0s (total > 15.2s since last scroll activity)
            print("Idling for 14.0s (total > 15.2s since last scroll activity)...")
            await page.wait_for_timeout(14000)

            idle_expr = await get_live_expression(page)
            bubble_el = page.locator('[data-testid="biyoo-speech-bubble"]')
            bubble_visible = await bubble_el.is_visible()
            bubble_text = await bubble_el.inner_text() if bubble_visible else None
            print(f"Expression at 15s idle: {idle_expr}")
            print(f"Speech bubble visible: {bubble_visible}")
            print(f"Speech bubble text: '{bubble_text}'")

            # Wake up / move mouse to dismiss idle and restore mood
            print("Triggering user activity (mouse move) to wake Biyoo...")
            await page.mouse.move(vp["width"] // 2, vp["height"] // 2)
            await page.wait_for_timeout(400)

            post_wake_expr = await get_live_expression(page)
            post_wake_bubble_visible = await bubble_el.is_visible()
            print(f"Expression after wake-up (mood restored): {post_wake_expr}")
            print(f"Speech bubble dismissed: {not post_wake_bubble_visible}")

            # Verification D: Quiet ON (zero mood changes)
            print(f"\n--- Quiet ON: zero mood changes ({vp['name']}) ---")
            await page.goto("http://localhost:3000")
            await page.wait_for_timeout(1000)

            # Click quiet toggle with real mouse click
            quiet_btn = page.locator("#biyoo-quiet-toggle")
            await quiet_btn.click()
            await page.wait_for_timeout(300)
            quiet_label = await quiet_btn.get_attribute("aria-label")
            print(f"Quiet toggle clicked. aria-label: {quiet_label}")

            quiet_expr_changes = []
            current_q_expr = await get_live_expression(page)

            # Scroll through all sections and linger 1.6s in each
            for sec in sections:
                sec_id = sec["id"]
                for _ in range(120):
                    vis = await measure_visibility(page, sec_id)
                    if vis > 0.50:
                        break
                    await page.mouse.wheel(0, 160)
                    await page.wait_for_timeout(60)

                await page.wait_for_timeout(1600)
                expr = await get_live_expression(page)
                if expr != current_q_expr:
                    quiet_expr_changes.append((sec_id, expr))
                    current_q_expr = expr

            print(f"Expression changes observed with Quiet ON: {len(quiet_expr_changes)}")
            print(f"Expression state throughout: {current_q_expr}")

            await context.close()

        # Verification E: Reduced-motion: expression swap only, no bounce
        print("\n" + "-" * 80)
        print("VERIFICATION: prefers-reduced-motion (no bounce)")
        print("-" * 80)
        rm_context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            reduced_motion="reduce"
        )
        rm_page = await rm_context.new_page()
        await rm_page.goto("http://localhost:3000")
        await rm_page.wait_for_timeout(1000)

        # Scroll into #edge-cloud
        for _ in range(120):
            vis = await measure_visibility(rm_page, "edge-cloud")
            if vis > 0.50:
                break
            await rm_page.mouse.wheel(0, 160)
            await rm_page.wait_for_timeout(80)

        # Sample during mood start
        sample_ys = []
        hop_group = rm_page.locator('[data-testid="biyoo-hop-group"]')
        for _ in range(25):
            box = await hop_group.bounding_box()
            if box:
                sample_ys.append(box["y"])
            await rm_page.wait_for_timeout(80)

        rm_expr = await get_live_expression(rm_page)
        print(f"Expression in #edge-cloud with reduced-motion: {rm_expr}")

        min_y = min(sample_ys) if sample_ys else 0
        max_y = max(sample_ys) if sample_ys else 0
        measured_range = round(max_y - min_y, 2)
        print(f"Measured bounce transform range: {measured_range}px (0px confirms no bounce)")

        await rm_context.close()
        await browser.close()

    print("\n" + "=" * 80)
    print("VERIFICATION COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(run_proof())
