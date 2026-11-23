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

async def get_live_state(page):
    return await page.evaluate('''() => {
        const el = document.querySelector('[data-testid="biyoo-live-puppet"]');
        if (!el) return { expression: null, mood: null };
        return {
            expression: el.getAttribute('data-biyoo-expression'),
            mood: el.getAttribute('data-biyoo-mood')
        };
    }''')

async def run_round15_proof():
    print("=" * 80)
    print("STEP 7 ROUND 15: MOOD PROOF")
    print("=" * 80)

    viewports = [
        {"name": "desktop (1440x900)", "width": 1440, "height": 900},
        {"name": "mobile (390x844)", "width": 390, "height": 844}
    ]

    async with async_playwright() as p:
        browser = await p.chromium.launch()

        for vp in viewports:
            print("\n" + "=" * 80)
            print(f"VIEWPORT: {vp['name']}")
            print("=" * 80)

            context = await browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
            page = await context.new_page()
            await page.goto("http://localhost:3000")
            await page.wait_for_timeout(1000)

            # -----------------------------------------------------------------
            # 3.A Slow scroll. Dwell 4s in each section.
            # -----------------------------------------------------------------
            print(f"\n--- 3.A Slow Scroll (Dwell 4s in each section) [{vp['name']}] ---")
            sections = [
                {"id": "edge-cloud", "name": "#edge-cloud", "expected_mood": "happy", "expected_expr": "happy"},
                {"id": "ratify", "name": "#ratify", "expected_mood": "alert", "expected_expr": "curious"},
                {"id": "iac-verifier", "name": "#iac-verifier", "expected_mood": "serious", "expected_expr": "neutral"}
            ]

            a_table = []
            for sec in sections:
                sec_id = sec["id"]
                # Scroll slowly until > 50% visible
                for _ in range(120):
                    vis = await measure_visibility(page, sec_id)
                    if vis > 0.50:
                        break
                    await page.mouse.wheel(0, 160)
                    await page.wait_for_timeout(80)

                # Wait for 1.5s threshold
                await page.wait_for_timeout(1600)
                start_ts = datetime.now(timezone.utc).isoformat()
                vis_start = await measure_visibility(page, sec_id)
                st_start = await get_live_state(page)

                # Dwell 4s, sampling every 100ms
                sampled_states = []
                for _ in range(40):
                    curr = await get_live_state(page)
                    sampled_states.append(curr)
                    await page.wait_for_timeout(100)

                # Scroll down until < 30% visible
                for _ in range(120):
                    vis = await measure_visibility(page, sec_id)
                    if vis < 0.30:
                        break
                    await page.mouse.wheel(0, 160)
                    await page.wait_for_timeout(80)

                await page.wait_for_timeout(200)
                end_ts = datetime.now(timezone.utc).isoformat()
                st_end = await get_live_state(page)

                a_table.append({
                    "section": sec["name"],
                    "visible_pct": f"{vis_start * 100:.1f}%",
                    "mood_attr": st_start["mood"],
                    "expression": st_start["expression"],
                    "start_ts": start_ts,
                    "end_ts": end_ts,
                    "after_mood": st_end["mood"],
                    "after_expr": st_end["expression"]
                })

            print(f"{'section':<15} | {'visible %':<10} | {'mood attr':<11} | {'expression':<11} | {'start timestamp':<27} | {'end timestamp':<27} | {'after mood':<11} | {'after expr':<11}")
            print("-" * 135)
            for r in a_table:
                print(f"{r['section']:<15} | {r['visible_pct']:<10} | {r['mood_attr']:<11} | {r['expression']:<11} | {r['start_ts']:<27} | {r['end_ts']:<27} | {r['after_mood']:<11} | {r['after_expr']:<11}")

            # -----------------------------------------------------------------
            # 3.B In #ratify with no input: 15s Curious, 30s Sleepy, 60s Sleeping.
            # Then mouse move: Surprised, Happy, Neutral/Curious (mood restored).
            # Same 30s check in #iac-verifier.
            # -----------------------------------------------------------------
            print(f"\n--- 3.B In #ratify with no input (15s, 30s, 60s) & wake-up [{vp['name']}] ---")
            await page.goto("http://localhost:3000")
            await page.wait_for_timeout(1000)

            # Scroll into #ratify
            for _ in range(120):
                vis = await measure_visibility(page, "ratify")
                if vis > 0.50:
                    break
                await page.mouse.wheel(0, 160)
                await page.wait_for_timeout(80)

            # Wait 1.6s for mood alert/curious to start
            await page.wait_for_timeout(1600)
            initial_ratify = await get_live_state(page)
            print(f"[{datetime.now(timezone.utc).isoformat()}] Entered #ratify: mood={initial_ratify['mood']}, expr={initial_ratify['expression']}")

            # Sample every 100ms for 62 seconds with NO input
            timeline_b = []
            last_state = initial_ratify
            start_idle_time = time.time()
            curious_15_ts = None
            sleepy_30_ts = None
            sleeping_60_ts = None

            print("Beginning 62s idle observation in #ratify...")
            while time.time() - start_idle_time < 62:
                elapsed = time.time() - start_idle_time
                st = await get_live_state(page)
                bubble_el = page.locator('[data-testid="biyoo-speech-bubble"]')
                has_bubble = await bubble_el.is_visible()
                bubble_txt = (await bubble_el.inner_text()).replace('\n', ' ') if has_bubble else None

                if st != last_state or (has_bubble and "bubble" not in str(timeline_b[-1:])):
                    ts = datetime.now(timezone.utc).isoformat()
                    timeline_b.append({"elapsed": round(elapsed, 1), "ts": ts, "state": st, "bubble": bubble_txt})
                    last_state = st

                    if st["expression"] == "curious" and has_bubble and not curious_15_ts:
                        curious_15_ts = ts
                        print(f"[{ts}] (t={elapsed:.1f}s) Idle Curious fired: bubble='{bubble_txt}'")
                    elif st["expression"] == "sleepy" and not sleepy_30_ts:
                        sleepy_30_ts = ts
                        print(f"[{ts}] (t={elapsed:.1f}s) Idle Sleepy fired: bubble='{bubble_txt}'")
                    elif st["expression"] == "sleeping" and not sleeping_60_ts:
                        sleeping_60_ts = ts
                        print(f"[{ts}] (t={elapsed:.1f}s) Idle Sleeping fired: expr='sleeping'")

                await page.wait_for_timeout(100)

            print(f"Curious at 15s timestamp: {curious_15_ts}")
            print(f"Sleepy at 30s timestamp: {sleepy_30_ts}")
            print(f"Sleeping at 60s timestamp: {sleeping_60_ts}")

            # Wake up with one mouse move
            print("\nTriggering single mouse move to wake Biyoo...")
            wake_timeline = []
            wake_start = time.time()
            await page.mouse.move(vp["width"] // 2, vp["height"] // 2)

            for _ in range(35): # Sample for 3.5s
                elapsed = time.time() - wake_start
                ts = datetime.now(timezone.utc).isoformat()
                st = await get_live_state(page)
                bubble_el = page.locator('[data-testid="biyoo-speech-bubble"]')
                has_bubble = await bubble_el.is_visible()
                bubble_txt = (await bubble_el.inner_text()).replace('\n', ' ') if has_bubble else None

                if not wake_timeline or st != wake_timeline[-1]["state"]:
                    wake_timeline.append({"elapsed": round(elapsed, 2), "ts": ts, "state": st, "bubble": bubble_txt})
                    print(f"[{ts}] (t={elapsed:.2f}s) Wake state: mood={st['mood']}, expr={st['expression']}, bubble='{bubble_txt}'")
                await page.wait_for_timeout(100)

            # Same 30s check in #iac-verifier
            print(f"\n--- 3.B Same 30s check in #iac-verifier [{vp['name']}] ---")
            await page.goto("http://localhost:3000")
            await page.wait_for_timeout(1000)

            for _ in range(120):
                vis = await measure_visibility(page, "iac-verifier")
                if vis > 0.50:
                    break
                await page.mouse.wheel(0, 160)
                await page.wait_for_timeout(80)

            await page.wait_for_timeout(1600)
            initial_iac = await get_live_state(page)
            print(f"[{datetime.now(timezone.utc).isoformat()}] Entered #iac-verifier: mood={initial_iac['mood']}, expr={initial_iac['expression']}")

            iac_15_ts = None
            iac_30_ts = None
            start_iac_idle = time.time()
            last_iac_st = initial_iac

            print("Beginning 32s idle observation in #iac-verifier...")
            while time.time() - start_iac_idle < 32:
                elapsed = time.time() - start_iac_idle
                st = await get_live_state(page)
                bubble_el = page.locator('[data-testid="biyoo-speech-bubble"]')
                has_bubble = await bubble_el.is_visible()
                bubble_txt = (await bubble_el.inner_text()).replace('\n', ' ') if has_bubble else None

                if st != last_iac_st or (has_bubble and "bubble" not in str(last_iac_st)):
                    ts = datetime.now(timezone.utc).isoformat()
                    last_iac_st = st
                    if st["expression"] == "curious" and has_bubble and not iac_15_ts:
                        iac_15_ts = ts
                        print(f"[{ts}] (t={elapsed:.1f}s) Idle Curious in #iac-verifier: bubble='{bubble_txt}'")
                    elif st["expression"] == "sleepy" and not iac_30_ts:
                        iac_30_ts = ts
                        print(f"[{ts}] (t={elapsed:.1f}s) Idle Sleepy in #iac-verifier: bubble='{bubble_txt}'")
                await page.wait_for_timeout(100)

            print(f"#iac-verifier Curious at 15s timestamp: {iac_15_ts}")
            print(f"#iac-verifier Sleepy at 30s timestamp: {iac_30_ts}")

            print("Triggering single mouse move in #iac-verifier...")
            await page.mouse.move(vp["width"] // 2, vp["height"] // 2)
            await page.wait_for_timeout(300)
            st_iac_restored = await get_live_state(page)
            print(f"[{datetime.now(timezone.utc).isoformat()}] #iac-verifier mood restored: mood={st_iac_restored['mood']}, expr={st_iac_restored['expression']}")

            # -----------------------------------------------------------------
            # 3.C In #edge-cloud, stay still 10s: linger bubble & mood restoration
            # -----------------------------------------------------------------
            print(f"\n--- 3.C In #edge-cloud, stay still 10s (Linger & Mood restoration) [{vp['name']}] ---")
            await page.goto("http://localhost:3000")
            await page.wait_for_timeout(1000)

            # Scroll into #edge-cloud
            for _ in range(120):
                vis = await measure_visibility(page, "edge-cloud")
                if vis > 0.50:
                    break
                await page.mouse.wheel(0, 160)
                await page.wait_for_timeout(80)

            await page.wait_for_timeout(1600)
            initial_ec = await get_live_state(page)
            print(f"[{datetime.now(timezone.utc).isoformat()}] #edge-cloud mood started: mood={initial_ec['mood']}, expr={initial_ec['expression']}")

            # Stay still for 14s (linger fires at 10s, holds 2s, restores mood)
            c_timeline = []
            linger_start = time.time()
            last_c_st = initial_ec

            while time.time() - linger_start < 14:
                elapsed = time.time() - linger_start
                st = await get_live_state(page)
                bubble_el = page.locator('[data-testid="biyoo-speech-bubble"]')
                has_bubble = await bubble_el.is_visible()
                bubble_txt = (await bubble_el.inner_text()).replace('\n', ' ') if has_bubble else None

                if st != last_c_st or (has_bubble and not any(e.get("has_bubble") for e in c_timeline[-1:])):
                    ts = datetime.now(timezone.utc).isoformat()
                    c_timeline.append({"elapsed": round(elapsed, 1), "ts": ts, "st": st, "bubble": bubble_txt, "has_bubble": has_bubble})
                    last_c_st = st
                    print(f"[{ts}] (t={elapsed:.1f}s) mood={st['mood']}, expr={st['expression']}, bubble='{bubble_txt}'")
                await page.wait_for_timeout(100)

            # -----------------------------------------------------------------
            # 3.D Fast scroll from #edge-cloud into #ratify with real wheel (> 3000px/s)
            # -----------------------------------------------------------------
            print(f"\n--- 3.D Fast scroll from #edge-cloud into #ratify (> 3000px/s) [{vp['name']}] ---")
            await page.goto("http://localhost:3000")
            await page.wait_for_timeout(1000)

            # Scroll into #edge-cloud first
            for _ in range(120):
                vis = await measure_visibility(page, "edge-cloud")
                if vis > 0.50:
                    break
                await page.mouse.wheel(0, 160)
                await page.wait_for_timeout(80)

            await page.wait_for_timeout(1600)
            st_before_fast = await get_live_state(page)
            print(f"[{datetime.now(timezone.utc).isoformat()}] Established in #edge-cloud: mood={st_before_fast['mood']}, expr={st_before_fast['expression']}")

            # Rapid wheel scroll (> 3000px/s) from #edge-cloud into #ratify
            fast_start = time.time()
            # 3 rapid wheels of 800px within 150ms -> 2400px in 0.15s = ~16,000px/s
            await page.mouse.wheel(0, 1000)
            await page.wait_for_timeout(20)
            await page.mouse.wheel(0, 1000)
            await page.wait_for_timeout(20)
            await page.mouse.wheel(0, 800)

            fast_scroll_stop_time = time.time()
            print(f"[{datetime.now(timezone.utc).isoformat()}] Fast scroll completed in {(fast_scroll_stop_time - fast_start)*1000:.1f}ms")

            # Sample every 100ms for 2.0s after scrolling stops
            d_samples = []
            while time.time() - fast_scroll_stop_time < 2.0:
                elapsed_since_stop = time.time() - fast_scroll_stop_time
                st = await get_live_state(page)
                d_samples.append({"elapsed_ms": round(elapsed_since_stop * 1000), "st": st})
                await page.wait_for_timeout(100)

            # Check first 1.5s (0 - 1500ms):
            samples_first_1500 = [s for s in d_samples if s["elapsed_ms"] <= 1500]
            first_1500_moods = set(s["st"]["mood"] for s in samples_first_1500)
            print(f"Sampled states in first 1.5s after stop: {samples_first_1500[:6]}")
            print(f"Mood attribute values in first 1.5s after stop: {first_1500_moods} (must NOT be 'alert' until 1.5s)")
            
            # Check after 1.5s:
            samples_after_1500 = [s for s in d_samples if s["elapsed_ms"] > 1600]
            after_moods = [s["st"]["mood"] for s in samples_after_1500]
            print(f"Mood attribute after 1.5s dwell in #ratify: {after_moods[-1] if after_moods else None}")

            # -----------------------------------------------------------------
            # 3.E Tab away 4s and back while in #ratify
            # -----------------------------------------------------------------
            print(f"\n--- 3.E Tab away 4s and back while in #ratify [{vp['name']}] ---")
            await page.goto("http://localhost:3000")
            await page.wait_for_timeout(1000)

            for _ in range(120):
                vis = await measure_visibility(page, "ratify")
                if vis > 0.50:
                    break
                await page.mouse.wheel(0, 160)
                await page.wait_for_timeout(80)

            await page.wait_for_timeout(1600)
            title_before = await page.title()
            st_before_tab = await get_live_state(page)
            print(f"Document title before tab away: '{title_before}'")
            print(f"State before tab away: mood={st_before_tab['mood']}, expr={st_before_tab['expression']}")

            # Trigger visibilitychange -> hidden
            print(f"[{datetime.now(timezone.utc).isoformat()}] Simulating tab away (hidden = true)...")
            await page.evaluate('''() => {
                Object.defineProperty(document, 'hidden', { value: true, configurable: true });
                document.dispatchEvent(new Event('visibilitychange'));
            }''')

            # Wait 4s: after 3s tab away timer fires Sad + title "Biyoo misses you"
            await page.wait_for_timeout(3500)
            title_away = await page.title()
            st_away = await get_live_state(page)
            print(f"Document title while away: '{title_away}'")
            print(f"State while away: mood={st_away['mood']}, expr={st_away['expression']}")

            # Trigger visibilitychange -> visible
            print(f"[{datetime.now(timezone.utc).isoformat()}] Simulating tab return (hidden = false)...")
            await page.evaluate('''() => {
                Object.defineProperty(document, 'hidden', { value: false, configurable: true });
                document.dispatchEvent(new Event('visibilitychange'));
            }''')

            # Sample tab return sequence: Happy holds for 2s, then mood restored
            tab_return_timeline = []
            ret_start = time.time()
            while time.time() - ret_start < 3.0:
                elapsed = time.time() - ret_start
                st = await get_live_state(page)
                ts = datetime.now(timezone.utc).isoformat()
                if not tab_return_timeline or st != tab_return_timeline[-1]["st"]:
                    tab_return_timeline.append({"elapsed": round(elapsed, 2), "ts": ts, "st": st})
                    print(f"[{ts}] (t={elapsed:.2f}s) mood={st['mood']}, expr={st['expression']}")
                await page.wait_for_timeout(100)

            title_after = await page.title()
            print(f"Document title after return: '{title_after}'")

            # -----------------------------------------------------------------
            # 3.F No bubble for moods: assert no [data-testid="biyoo-speech-bubble"] for 4s
            # -----------------------------------------------------------------
            print(f"\n--- 3.F No bubble for moods (scroll every 5s, assert no speech bubble for 4s) [{vp['name']}] ---")
            await page.goto("http://localhost:3000")
            await page.wait_for_timeout(1000)

            for sec in sections:
                sec_id = sec["id"]
                for _ in range(120):
                    vis = await measure_visibility(page, sec_id)
                    if vis > 0.50:
                        break
                    await page.mouse.wheel(0, 160)
                    await page.wait_for_timeout(80)

                # Wait 1.6s for mood start
                await page.wait_for_timeout(1600)
                st = await get_live_state(page)

                # Sample for 4s: assert no speech bubble appears
                bubble_found = False
                for _ in range(40):
                    bubble_el = page.locator('[data-testid="biyoo-speech-bubble"]')
                    if await bubble_el.is_visible():
                        bubble_found = True
                        break
                    await page.wait_for_timeout(100)

                print(f"Section {sec['name']}: mood={st['mood']}, expr={st['expression']} -> speech bubble visible in 4s: {bubble_found}")

            # -----------------------------------------------------------------
            # 3.G Quiet ON: slow scroll through all three sections, 4s dwell each
            # -----------------------------------------------------------------
            print(f"\n--- 3.G Quiet ON: slow scroll through all 3 sections (4s dwell each) [{vp['name']}] ---")
            await page.goto("http://localhost:3000")
            await page.wait_for_timeout(1000)

            quiet_btn = page.locator("#biyoo-quiet-toggle")
            await quiet_btn.click()
            await page.wait_for_timeout(300)
            quiet_aria = await quiet_btn.get_attribute("aria-label")
            print(f"Quiet toggle clicked. aria-label: '{quiet_aria}'")

            quiet_changes = []
            last_q_st = await get_live_state(page)

            for sec in sections:
                sec_id = sec["id"]
                for _ in range(120):
                    vis = await measure_visibility(page, sec_id)
                    if vis > 0.50:
                        break
                    await page.mouse.wheel(0, 160)
                    await page.wait_for_timeout(60)

                for _ in range(40): # Dwell 4s
                    st = await get_live_state(page)
                    if st != last_q_st:
                        quiet_changes.append({"sec": sec_id, "state": st})
                        last_q_st = st
                    await page.wait_for_timeout(100)

            print(f"Sampled expression & mood changes with Quiet ON: {len(quiet_changes)}")
            print(f"Final state: mood={last_q_st['mood']}, expr={last_q_st['expression']}")

            await context.close()

        # -----------------------------------------------------------------
        # 3.H Reduced motion: sample bounce transform every 50ms for 5s
        # -----------------------------------------------------------------
        print("\n" + "=" * 80)
        print("3.H REDUCED MOTION BOUNCE & BREATHING SAMPLING")
        print("=" * 80)

        # 1. Normal motion
        norm_context = await browser.new_context(viewport={"width": 1440, "height": 900})
        norm_page = await norm_context.new_page()
        await norm_page.goto("http://localhost:3000")
        await norm_page.wait_for_timeout(1000)

        for _ in range(120):
            vis = await measure_visibility(norm_page, "edge-cloud")
            if vis > 0.50:
                break
            await norm_page.mouse.wheel(0, 160)
            await norm_page.wait_for_timeout(80)

        norm_hop_ys = []
        norm_hop_el = norm_page.locator('[data-testid="biyoo-hop-group"]')
        norm_breath_el = norm_page.locator('[data-testid="biyoo-breathing-group"]')

        # Sample every 50ms for 5.0s (100 samples)
        for _ in range(100):
            box = await norm_hop_el.bounding_box()
            if box:
                norm_hop_ys.append(box["y"])
            await norm_page.wait_for_timeout(50)

        norm_min_y = min(norm_hop_ys) if norm_hop_ys else 0
        norm_max_y = max(norm_hop_ys) if norm_hop_ys else 0
        norm_range = round(norm_max_y - norm_min_y, 2)
        norm_breath_anim = await norm_breath_el.evaluate('el => window.getComputedStyle(el).animation')

        print(f"NORMAL MOTION in #edge-cloud:")
        print(f"  Selector [data-testid=\"biyoo-hop-group\"]: min_y={norm_min_y}, max_y={norm_max_y}, range={norm_range}px")
        print(f"  Selector [data-testid=\"biyoo-breathing-group\"]: animation='{norm_breath_anim}'")
        await norm_context.close()

        # 2. Reduced motion
        rm_context = await browser.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
        rm_page = await rm_context.new_page()
        await rm_page.goto("http://localhost:3000")
        await rm_page.wait_for_timeout(1000)

        for _ in range(120):
            vis = await measure_visibility(rm_page, "edge-cloud")
            if vis > 0.50:
                break
            await rm_page.mouse.wheel(0, 160)
            await rm_page.wait_for_timeout(80)

        rm_hop_ys = []
        rm_hop_el = rm_page.locator('[data-testid="biyoo-hop-group"]')
        rm_breath_el = rm_page.locator('[data-testid="biyoo-breathing-group"]')

        for _ in range(100):
            box = await rm_hop_el.bounding_box()
            if box:
                rm_hop_ys.append(box["y"])
            await rm_page.wait_for_timeout(50)

        rm_min_y = min(rm_hop_ys) if rm_hop_ys else 0
        rm_max_y = max(rm_hop_ys) if rm_hop_ys else 0
        rm_range = round(rm_max_y - rm_min_y, 2)
        rm_breath_anim = await rm_breath_el.evaluate('el => window.getComputedStyle(el).animation')
        rm_expr = await get_live_state(rm_page)

        print(f"REDUCED MOTION in #edge-cloud:")
        print(f"  Expression in #edge-cloud: mood={rm_expr['mood']}, expr={rm_expr['expression']}")
        print(f"  Selector [data-testid=\"biyoo-hop-group\"]: min_y={rm_min_y}, max_y={rm_max_y}, range={rm_range}px")
        print(f"  Selector [data-testid=\"biyoo-breathing-group\"]: animation='{rm_breath_anim}'")

        await rm_context.close()
        await browser.close()

    print("\n" + "=" * 80)
    print("PROOF RUN COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(run_round15_proof())

