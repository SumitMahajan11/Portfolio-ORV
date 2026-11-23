import asyncio
import time
from playwright.async_api import async_playwright

EXPECTED_LINES = {
    "edge-cloud": "edge orchestration at scale!",
    "ratify": "distributed consensus is tricky, huh?",
    "iac-verifier": "formal verification active!"
}

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
            timelineSnapshots: [],
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
                const moodSec = puppet.getAttribute('data-biyoo-mood-section');
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
                        mood: mood,
                        moodSection: moodSec
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
    for _ in range(160):
        vis = await measure_visibility(page, section_id)
        if vis > 0.50:
            break
        await page.mouse.wheel(0, 160)
        await page.wait_for_timeout(80)
    final_vis = await measure_visibility(page, section_id)
    return final_vis

async def run_dwell_test(browser, vp, section_id, dwell_sec, wake_after=False):
    context = await browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
    page = await context.new_page()
    await page.goto("http://localhost:3000")
    await page.wait_for_timeout(1000)
    await setup_page_recorder(page)

    vis = await scroll_into_section(page, section_id)

    start_dwell = time.time()
    snapshots = []
    while time.time() - start_dwell < dwell_sec:
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
                moodSection: puppet ? puppet.getAttribute('data-biyoo-mood-section') : null,
                msSinceLastWheel: msSinceLastWheel
            };
        }''')
        snap["elapsed_sec"] = round(elapsed, 1)
        snapshots.append(snap)
        await page.wait_for_timeout(200)

    wake_samples = []
    if wake_after:
        await page.mouse.move(vp["width"] // 2, vp["height"] // 2)
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
        "section": section_id,
        "vis_at_stop": vis,
        "bubbles": recorded["bubbles"],
        "expressionChanges": recorded["expressionChanges"],
        "snapshots": snapshots,
        "surprised_duration_ms": surprised_duration_ms,
        "happy_duration_ms": happy_duration_ms,
        "restored_state": restored_sample
    }

async def run_linger_only_test(browser, vp, section_id):
    context = await browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
    page = await context.new_page()
    await page.goto("http://localhost:3000")
    await page.wait_for_timeout(1000)
    await setup_page_recorder(page)

    vis = await scroll_into_section(page, section_id)
    await page.wait_for_timeout(11000)

    recorded = await page.evaluate('window.__proof')
    await context.close()

    linger_bubble = recorded["bubbles"][0] if recorded["bubbles"] else None
    return {
        "viewport": vp["name"],
        "section": section_id,
        "vis": vis,
        "linger_bubble": linger_bubble
    }

async def main():
    viewports = [
        {"name": "desktop (1440x900)", "width": 1440, "height": 900},
        {"name": "mobile (390x844)", "width": 390, "height": 844}
    ]
    sections = ["edge-cloud", "ratify", "iac-verifier"]

    print("=" * 80)
    print("STEP 7 ROUND 17: VERIFICATION PROOF")
    print("=" * 80)

    # 1. 5 runs each for linger line accuracy across sections
    linger_matrix_results = {vp["name"]: {s: [] for s in sections} for vp in viewports}
    
    # Detailed timeline runs
    detailed_edge = {}
    detailed_iac = {}

    async with async_playwright() as p:
        browser = await p.chromium.launch()

        for vp in viewports:
            print(f"\n========================================================")
            print(f"VIEWPORT: {vp['name']}")
            print(f"========================================================")

            # Detailed 35s run for #edge-cloud
            print(f"Executing detailed 35s observation for #edge-cloud [{vp['name']}]...")
            res_edge_35 = await run_dwell_test(browser, vp, "edge-cloud", 35.0, wake_after=False)
            detailed_edge[vp["name"]] = res_edge_35
            linger_matrix_results[vp["name"]]["edge-cloud"].append(res_edge_35["bubbles"][0] if res_edge_35["bubbles"] else None)

            # Detailed 62s run for #iac-verifier
            print(f"Executing detailed 62s observation + wake for #iac-verifier [{vp['name']}]...")
            res_iac_62 = await run_dwell_test(browser, vp, "iac-verifier", 62.0, wake_after=True)
            detailed_iac[vp["name"]] = res_iac_62
            linger_matrix_results[vp["name"]]["iac-verifier"].append(res_iac_62["bubbles"][0] if res_iac_62["bubbles"] else None)

            # 1st run for #ratify
            print(f"Executing run 1 for #ratify [{vp['name']}]...")
            res_rat_1 = await run_linger_only_test(browser, vp, "ratify")
            linger_matrix_results[vp["name"]]["ratify"].append(res_rat_1["linger_bubble"])

            # Runs 2 to 5 for all 3 sections
            for r in range(2, 6):
                print(f"Executing run {r} for all 3 sections [{vp['name']}]...")
                for sec in sections:
                    res = await run_linger_only_test(browser, vp, sec)
                    linger_matrix_results[vp["name"]][sec].append(res["linger_bubble"])

        await browser.close()

    # -----------------------------------------------------------------
    # Print Section 1: Linger Line Shown vs Expected (5 runs each)
    # -----------------------------------------------------------------
    print("\n" + "=" * 80)
    print("1. LINGER LINE ACCURACY MATRIX (5 runs each, 1440x900 and 390x844)")
    print("=" * 80)
    print(f"{'Viewport':<20} | {'Section':<14} | {'Run':<4} | {'Expected Line':<40} | {'Actual Linger Line':<40} | {'Match'}")
    print("-" * 130)

    total_checked = 0
    total_matched = 0
    for vp_name, sec_dict in linger_matrix_results.items():
        for sec, runs in sec_dict.items():
            expected = EXPECTED_LINES[sec]
            for idx, b in enumerate(runs, 1):
                actual = b["text"] if b else "NO BUBBLE"
                matches = expected in actual
                total_checked += 1
                if matches:
                    total_matched += 1
                print(f"{vp_name:<20} | #{sec:<13} | {idx:<4} | {expected:<40} | {actual[:38]:<40} | {matches}")

    print(f"\nTotal linger line checks: {total_checked}, Matches: {total_matched}, Mismatches: {total_checked - total_matched}")

    # -----------------------------------------------------------------
    # Print Section 2: Full Expression Timelines for #edge-cloud and #iac-verifier
    # -----------------------------------------------------------------
    print("\n" + "=" * 80)
    print("2. EXPRESSION TIMELINE (Curious at 15s, Sleepy at 30s, Sleeping at 60s)")
    print("=" * 80)

    for vp_name in [v["name"] for v in viewports]:
        res_e = detailed_edge[vp_name]
        print(f"\n--- #edge-cloud Timeline (35s observation) [{vp_name}] ---")
        print(f"{'Expression':<12} | {'Mood Attr':<12} | {'ms since last wheel':<22} | {'Time (sec)':<12} | {'Expected Milestone'}")
        print("-" * 75)
        for ch in res_e["expressionChanges"]:
            ms = ch["msSinceLastWheel"]
            ms_str = f"{ms:.1f}ms" if ms is not None else "N/A"
            sec_str = f"{ms / 1000.0:.1f}s" if ms is not None else "N/A"
            expected = ""
            if ch["expr"] == "curious":
                expected = "Curious at 15s"
            elif ch["expr"] == "sleepy":
                expected = "Sleepy at 30s"
            elif ch["expr"] == "happy":
                expected = "Mood Happy"
            print(f"{ch['expr']:<12} | {str(ch['mood']):<12} | {ms_str:<22} | {sec_str:<12} | {expected}")

        for target_s in [15.0, 30.0]:
            closest = min(res_e["snapshots"], key=lambda s: abs(s["elapsed_sec"] - target_s))
            ms_str = f"{closest['msSinceLastWheel']:.1f}ms" if closest['msSinceLastWheel'] is not None else "N/A"
            print(f"  Milestone t ~ {closest['elapsed_sec']}s ({ms_str} since last wheel): expr='{closest['expr']}', mood='{closest['mood']}'")

        res_i = detailed_iac[vp_name]
        print(f"\n--- #iac-verifier Timeline (62s observation + wake) [{vp_name}] ---")
        print(f"{'Expression':<12} | {'Mood Attr':<12} | {'ms since last wheel':<22} | {'Time (sec)':<12} | {'Expected Milestone'}")
        print("-" * 75)
        for ch in res_i["expressionChanges"]:
            ms = ch["msSinceLastWheel"]
            ms_str = f"{ms:.1f}ms" if ms is not None else "N/A"
            sec_str = f"{ms / 1000.0:.1f}s" if ms is not None else "N/A"
            expected = ""
            if ch["expr"] == "curious":
                expected = "Curious at 15s"
            elif ch["expr"] == "sleepy":
                expected = "Sleepy at 30s"
            elif ch["expr"] == "sleeping":
                expected = "Sleeping at 60s"
            elif ch["expr"] == "surprised":
                expected = "Wake Surprised (~600ms)"
            elif ch["expr"] == "happy":
                expected = "Wake Happy (~2000ms)"
            print(f"{ch['expr']:<12} | {str(ch['mood']):<12} | {ms_str:<22} | {sec_str:<12} | {expected}")

        for target_s in [15.0, 30.0, 60.0]:
            closest = min(res_i["snapshots"], key=lambda s: abs(s["elapsed_sec"] - target_s))
            ms_str = f"{closest['msSinceLastWheel']:.1f}ms" if closest['msSinceLastWheel'] is not None else "N/A"
            print(f"  Milestone t ~ {closest['elapsed_sec']}s ({ms_str} since last wheel): expr='{closest['expr']}', mood='{closest['mood']}'")

    # -----------------------------------------------------------------
    # Print Section 3: Bubbles & Consecutive Gaps (Threshold: >= 19950ms)
    # -----------------------------------------------------------------
    print("\n" + "=" * 80)
    print("3. BUBBLE TIMELINE & CONSECUTIVE GAPS (Expected >= 19950ms, wake-up exception)")
    print("=" * 80)
    
    detailed_runs = []
    for vp_name in [v["name"] for v in viewports]:
        detailed_runs.append((f"#edge-cloud [{vp_name}]", detailed_edge[vp_name]))
        detailed_runs.append((f"#iac-verifier [{vp_name}]", detailed_iac[vp_name]))

    print(f"\nAll bubbles in detailed runs:")
    print(f"{'Context':<28} | {'Bubble Text':<45} | {'ms since last wheel':<22}")
    print("-" * 100)
    for label, r in detailed_runs:
        for b in r["bubbles"]:
            ms_str = f"{b['msSinceLastWheel']:.1f}ms" if b['msSinceLastWheel'] is not None else "N/A"
            print(f"{label:<28} | {b['text']:<45} | {ms_str:<22}")

    print(f"\nConsecutive Bubble Gaps:")
    print(f"{'Context':<28} | {'Bubble 1 -> Bubble 2':<50} | {'Gap (ms)':<12} | {'Gap (sec)':<10} | {'Meets >= 19950ms'}")
    print("-" * 125)
    for label, r in detailed_runs:
        bubbles = r["bubbles"]
        for i in range(len(bubbles) - 1):
            b1 = bubbles[i]
            b2 = bubbles[i + 1]
            gap_ms = b2["t"] - b1["t"]
            gap_sec = gap_ms / 1000.0
            pair_name = f"'{b1['text'][:20]}...' -> '{b2['text'][:20]}...'"
            meets = gap_ms >= 19950.0
            meets_str = str(meets) if "oh! you're back" not in b2["text"] else "Wake-up exception"
            print(f"{label:<28} | {pair_name:<50} | {gap_ms:<12.1f} | {gap_sec:<10.2f} | {meets_str}")

if __name__ == "__main__":
    asyncio.run(main())

