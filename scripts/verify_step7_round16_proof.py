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

async def setup_page_recorder(page):
    await page.evaluate('''() => {
        window.__proof = {
            wheelEvents: [],
            bubbles: [],
            expressionChanges: [],
            samples: [],
            lastBubbleText: null,
            lastExpression: null
        };

        window.addEventListener('wheel', (e) => {
            window.__proof.wheelEvents.push({
                t: performance.now(),
                scrollY: window.scrollY
            });
        }, { passive: true });

        const checkDom = () => {
            const puppet = document.querySelector('[data-testid="biyoo-live-puppet"]');
            if (puppet) {
                const expr = puppet.getAttribute('data-biyoo-expression');
                const mood = puppet.getAttribute('data-biyoo-mood');
                const lastWheel = window.__proof.wheelEvents.length > 0 
                    ? window.__proof.wheelEvents[window.__proof.wheelEvents.length - 1] 
                    : null;
                const lastWheelT = lastWheel ? lastWheel.t : 0;
                const msSinceLastWheel = lastWheel ? (performance.now() - lastWheelT) : null;

                if (expr !== window.__proof.lastExpression) {
                    window.__proof.lastExpression = expr;
                    window.__proof.expressionChanges.push({
                        t: performance.now(),
                        msSinceLastWheel: msSinceLastWheel,
                        expr: expr,
                        mood: mood
                    });
                }
            }

            const bubbleEl = document.querySelector('[data-testid="biyoo-speech-bubble"]');
            if (bubbleEl) {
                const txt = bubbleEl.innerText.replace(/\\n/g, ' ').trim();
                if (txt !== window.__proof.lastBubbleText) {
                    window.__proof.lastBubbleText = txt;
                    const lastWheel = window.__proof.wheelEvents.length > 0 
                        ? window.__proof.wheelEvents[window.__proof.wheelEvents.length - 1] 
                        : null;
                    const lastWheelT = lastWheel ? lastWheel.t : 0;
                    window.__proof.bubbles.push({
                        t: performance.now(),
                        msSinceLastWheel: lastWheel ? (performance.now() - lastWheelT) : null,
                        text: txt
                    });
                }
            } else {
                window.__proof.lastBubbleText = null;
            }
        };

        const obs = new MutationObserver(checkDom);
        obs.observe(document.body, { childList: true, subtree: true, attributes: true });
        setInterval(checkDom, 50);
    }''')

async def scroll_into_section(page, section_id):
    for _ in range(140):
        vis = await measure_visibility(page, section_id)
        if vis > 0.50:
            break
        await page.mouse.wheel(0, 160)
        await page.wait_for_timeout(80)
    final_vis = await measure_visibility(page, section_id)
    return final_vis

async def run_section_a(browser, vp):
    print("\n" + "=" * 80)
    print(f"3.A & 3.D & 3.E: #ratify Observation (62s idle + wake-up) [{vp['name']}]")
    print("=" * 80)

    context = await browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
    page = await context.new_page()
    await page.goto("http://localhost:3000")
    await page.wait_for_timeout(1000)
    await setup_page_recorder(page)

    vis = await scroll_into_section(page, "ratify")
    print(f"Entered #ratify (vis: {vis * 100:.1f}%). Dwell for 62s with NO input...")

    # Periodic sampling during 62s dwell
    start_dwell = time.time()
    timeline_snapshots = []
    while time.time() - start_dwell < 62.0:
        elapsed = time.time() - start_dwell
        snap = await page.evaluate('''() => {
            const puppet = document.querySelector('[data-testid="biyoo-live-puppet"]');
            const lastWheel = window.__proof.wheelEvents.length > 0 
                ? window.__proof.wheelEvents[window.__proof.wheelEvents.length - 1] 
                : null;
            const msSinceLastWheel = lastWheel ? (performance.now() - lastWheel.t) : null;
            return {
                expr: puppet ? puppet.getAttribute('data-biyoo-expression') : null,
                mood: puppet ? puppet.getAttribute('data-biyoo-mood') : null,
                msSinceLastWheel: msSinceLastWheel
            };
        }''')
        snap["elapsed_sec"] = round(elapsed, 1)
        timeline_snapshots.append(snap)
        await page.wait_for_timeout(200)

    # 3.D Wake from Sleeping
    print("\nTriggering wake from Sleeping with single mouse move...")
    await page.mouse.move(vp["width"] // 2, vp["height"] // 2)

    # Sample wake states rapidly for 3.5s
    wake_samples = []
    for _ in range(70):
        sample = await page.evaluate('''() => {
            const puppet = document.querySelector('[data-testid="biyoo-live-puppet"]');
            const bubbleEl = document.querySelector('[data-testid="biyoo-speech-bubble"]');
            return {
                t: performance.now(),
                expr: puppet ? puppet.getAttribute('data-biyoo-expression') : null,
                mood: puppet ? puppet.getAttribute('data-biyoo-mood') : null,
                bubble: bubbleEl ? bubbleEl.innerText.replace(/\\n/g, ' ').trim() : null
            };
        }''')
        wake_samples.append(sample)
        await page.wait_for_timeout(50)

    recorded = await page.evaluate('window.__proof')
    await context.close()

    # Calculate wake durations
    surprised_sample = next((s for s in wake_samples if s["expr"] == "surprised"), None)
    happy_sample = next((s for s in wake_samples if s["expr"] == "happy"), None)
    restored_sample = next((s for s in wake_samples if s["t"] > (happy_sample["t"] if happy_sample else 0) and s["expr"] in ["curious", "neutral"]), None)

    surprised_duration_ms = None
    happy_duration_ms = None
    if surprised_sample and happy_sample:
        surprised_duration_ms = round(happy_sample["t"] - surprised_sample["t"], 1)
    if happy_sample and restored_sample:
        happy_duration_ms = round(restored_sample["t"] - happy_sample["t"], 1)

    return {
        "viewport": vp["name"],
        "section": "ratify",
        "vis": vis,
        "bubbles": recorded["bubbles"],
        "expressionChanges": recorded["expressionChanges"],
        "timeline_snapshots": timeline_snapshots,
        "surprised_duration_ms": surprised_duration_ms,
        "happy_duration_ms": happy_duration_ms,
        "restored_state": restored_sample,
        "wake_samples": wake_samples
    }

async def run_section_b_single(browser, vp, section_id):
    print("\n" + "=" * 80)
    print(f"3.B: #{section_id} Observation (35s idle) [{vp['name']}]")
    print("=" * 80)

    context = await browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
    page = await context.new_page()
    await page.goto("http://localhost:3000")
    await page.wait_for_timeout(1000)
    await setup_page_recorder(page)

    vis = await scroll_into_section(page, section_id)
    print(f"Entered #{section_id} (vis: {vis * 100:.1f}%). Dwell for 35s with NO input...")

    start_dwell = time.time()
    while time.time() - start_dwell < 35.0:
        await page.wait_for_timeout(500)

    recorded = await page.evaluate('window.__proof')
    await context.close()

    return {
        "viewport": vp["name"],
        "section": section_id,
        "vis": vis,
        "bubbles": recorded["bubbles"],
        "expressionChanges": recorded["expressionChanges"]
    }

async def main():
    viewports = [
        {"name": "desktop (1440x900)", "width": 1440, "height": 900},
        {"name": "mobile (390x844)", "width": 390, "height": 844}
    ]

    print("=" * 80)
    print("STEP 7 FIX ROUND 16: VERIFICATION PROOF")
    print("=" * 80)

    all_a_results = []
    all_b_edge_results = []
    all_b_iac_results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch()

        for vp in viewports:
            # 3.A & 3.D & 3.E in #ratify
            res_a = await run_section_a(browser, vp)
            all_a_results.append(res_a)

            # 3.B in #edge-cloud
            res_edge = await run_section_b_single(browser, vp, "edge-cloud")
            all_b_edge_results.append(res_edge)

            # 3.B in #iac-verifier
            res_iac = await run_section_b_single(browser, vp, "iac-verifier")
            all_b_iac_results.append(res_iac)

        await browser.close()

    # -----------------------------------------------------------------
    # Print 3.A Results
    # -----------------------------------------------------------------
    print("\n" + "=" * 80)
    print("3.A BUBBLE TIMELINE IN #ratify (ms since last wheel event)")
    print("=" * 80)
    for res in all_a_results:
        print(f"\nViewport: {res['viewport']}")
        print(f"{'Bubble Text':<45} | {'ms since last wheel':<22} | {'Requirement Status'}")
        print("-" * 95)
        for b in res["bubbles"]:
            ms = b["msSinceLastWheel"]
            ms_str = f"{ms:.1f}ms" if ms is not None else "N/A"
            status = ""
            if "distributed consensus" in b["text"]:
                status = "Linger bubble (expected >= 10000ms)"
            elif "...getting sleepy" in b["text"]:
                status = "Sleepy bubble at ~30s (gated)"
            elif "oh! you're back" in b["text"]:
                status = "Wake-up bubble (forced bypass)"
            else:
                status = "Other bubble"
            print(f"{b['text']:<45} | {ms_str:<22} | {status}")
        has_curious = any("still there" in b["text"] for b in res["bubbles"])
        print(f"Curious bubble 'hey... still there?' suppressed at 15s: {not has_curious}")

    # -----------------------------------------------------------------
    # Print 3.B Results
    # -----------------------------------------------------------------
    print("\n" + "=" * 80)
    print("3.B BUBBLE TIMELINE IN #edge-cloud AND #iac-verifier (35s observation)")
    print("=" * 80)
    for res in all_b_edge_results + all_b_iac_results:
        print(f"\nSection: #{res['section']} [{res['viewport']}]")
        print(f"{'Bubble Text':<45} | {'ms since last wheel':<22} | {'Requirement Status'}")
        print("-" * 95)
        for b in res["bubbles"]:
            ms = b["msSinceLastWheel"]
            ms_str = f"{ms:.1f}ms" if ms is not None else "N/A"
            status = ""
            if "edge orchestration" in b["text"] or "formal verification" in b["text"]:
                status = "Linger bubble (expected >= 10000ms)"
            elif "...getting sleepy" in b["text"]:
                status = "Sleepy bubble at ~30s (gated)"
            else:
                status = "Other bubble"
            print(f"{b['text']:<45} | {ms_str:<22} | {status}")
        has_curious = any("still there" in b["text"] for b in res["bubbles"])
        print(f"Curious bubble 'hey... still there?' suppressed at 15s: {not has_curious}")

    # -----------------------------------------------------------------
    # Print 3.C Results (Consecutive Bubble Gaps)
    # -----------------------------------------------------------------
    print("\n" + "=" * 80)
    print("3.C CONSECUTIVE BUBBLE GAPS IN A AND B (Expected >= 20000ms)")
    print("=" * 80)
    all_runs = (
        [("3.A #ratify", r) for r in all_a_results] +
        [("3.B #edge-cloud", r) for r in all_b_edge_results] +
        [("3.B #iac-verifier", r) for r in all_b_iac_results]
    )
    print(f"{'Context':<24} | {'Viewport':<20} | {'Bubble 1 -> Bubble 2':<50} | {'Gap (ms)':<12} | {'Gap (sec)':<10} | {'Requirement'}")
    print("-" * 135)
    for label, r in all_runs:
        bubbles = r["bubbles"]
        for i in range(len(bubbles) - 1):
            b1 = bubbles[i]
            b2 = bubbles[i + 1]
            gap_ms = b2["t"] - b1["t"]
            gap_sec = gap_ms / 1000.0
            pair_name = f"'{b1['text'][:20]}...' -> '{b2['text'][:20]}...'"
            req = ">= 20s"
            if "oh! you're back" in b2["text"]:
                req = "Wake-up exception"
            print(f"{label:<24} | {r['viewport']:<20} | {pair_name:<50} | {gap_ms:<12.1f} | {gap_sec:<10.2f} | {req}")

    # -----------------------------------------------------------------
    # Print 3.D Results (Wake Durations)
    # -----------------------------------------------------------------
    print("\n" + "=" * 80)
    print("3.D WAKE SEQUENCE DURATIONS FROM SLEEPING")
    print("=" * 80)
    print(f"{'Viewport':<20} | {'Surprised Duration':<20} | {'Happy Hold Duration':<20} | {'Mood Restored State'}")
    print("-" * 85)
    for res in all_a_results:
        restored = res["restored_state"]
        restored_str = f"mood={restored['mood']}, expr={restored['expr']}" if restored else "None"
        print(f"{res['viewport']:<20} | {res['surprised_duration_ms']}ms (expected ~600ms) | {res['happy_duration_ms']}ms (expected ~2000ms) | {restored_str}")

    # -----------------------------------------------------------------
    # Print 3.E Results (Expression Timeline in #ratify)
    # -----------------------------------------------------------------
    print("\n" + "=" * 80)
    print("3.E EXPRESSION TIMELINE IN #ratify (Showing Curious, Sleepy, Sleeping)")
    print("=" * 80)
    for res in all_a_results:
        print(f"\nViewport: {res['viewport']}")
        print(f"{'Expression':<12} | {'Mood Attr':<12} | {'ms since last wheel':<22} | {'Time (sec)':<12} | {'Expected Stage'}")
        print("-" * 75)
        for change in res["expressionChanges"]:
            ms = change["msSinceLastWheel"]
            ms_str = f"{ms:.1f}ms" if ms is not None else "N/A"
            sec_str = f"{ms / 1000.0:.1f}s" if ms is not None else "N/A"
            expected = ""
            if change["expr"] == "curious" and ms is not None and ms < 20000:
                expected = "Mood start / Curious at 15s"
            elif change["expr"] == "sleepy":
                expected = "Sleepy at 30s"
            elif change["expr"] == "sleeping":
                expected = "Sleeping at 60s"
            elif change["expr"] == "surprised":
                expected = "Wake Surprised (~600ms)"
            elif change["expr"] == "happy":
                expected = "Wake Happy (~2000ms)"
            print(f"{change['expr']:<12} | {str(change['mood']):<12} | {ms_str:<22} | {sec_str:<12} | {expected}")

        # Also print sample states at ~15s, ~30s, ~60s
        print(f"\nSampled expressions at idle milestones [{res['viewport']}]:")
        for target_sec in [15.0, 30.0, 60.0]:
            closest = min(res["timeline_snapshots"], key=lambda s: abs(s["elapsed_sec"] - target_sec))
            ms = closest["msSinceLastWheel"]
            ms_str = f"{ms:.1f}ms" if ms is not None else "N/A"
            print(f"  At t ~ {closest['elapsed_sec']}s ({ms_str} since last wheel): expr='{closest['expr']}', mood='{closest['mood']}'")

if __name__ == "__main__":
    asyncio.run(main())
