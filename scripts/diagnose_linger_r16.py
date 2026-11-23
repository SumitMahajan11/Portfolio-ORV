import asyncio
import time
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

async def run_single_linger_test(browser, vp, run_idx):
    context = await browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
    page = await context.new_page()
    await page.goto("http://localhost:3000")
    await page.wait_for_timeout(1000)

    # Inject page-side recorder for wheel, scroll, and bubble events
    await page.evaluate('''() => {
        window.__events = {
            wheel: [],
            scroll: [],
            bubble: null
        };

        window.addEventListener('wheel', (e) => {
            window.__events.wheel.push({
                t: performance.now(),
                scrollY: window.scrollY
            });
        }, { passive: true });

        window.addEventListener('scroll', () => {
            window.__events.scroll.push({
                t: performance.now(),
                scrollY: window.scrollY
            });
        }, { passive: true });

        const checkBubble = () => {
            const el = document.querySelector('[data-testid="biyoo-speech-bubble"]');
            if (el && !window.__events.bubble) {
                window.__events.bubble = {
                    t: performance.now(),
                    text: el.innerText.trim(),
                    scrollY: window.scrollY
                };
            }
        };

        const observer = new MutationObserver(checkBubble);
        observer.observe(document.body, { childList: true, subtree: true });
        setInterval(checkBubble, 50);
    }''')

    # Scroll into #ratify with real wheel steps
    for step in range(120):
        vis = await measure_visibility(page, "ratify")
        if vis > 0.50:
            break
        await page.mouse.wheel(0, 160)
        await page.wait_for_timeout(80)

    vis_final = await measure_visibility(page, "ratify")

    # Wait for linger bubble to appear (sample up to 16s)
    bubble_data = None
    start_wait = time.time()
    while time.time() - start_wait < 16.0:
        bubble_data = await page.evaluate('window.__events.bubble')
        if bubble_data:
            break
        await page.wait_for_timeout(100)

    records = await page.evaluate('window.__events')
    await context.close()

    wheel_events = records["wheel"]
    scroll_events = records["scroll"]
    bubble = records["bubble"]

    last_wheel = wheel_events[-1] if wheel_events else None
    first_wheel = wheel_events[0] if wheel_events else None
    last_scroll = scroll_events[-1] if scroll_events else None

    ms_diff = (bubble["t"] - last_wheel["t"]) if (bubble and last_wheel) else None
    ms_scroll_diff = (bubble["t"] - last_scroll["t"]) if (bubble and last_scroll) else None

    return {
        "run": run_idx,
        "viewport": vp["name"],
        "vis": vis_final,
        "wheel_count": len(wheel_events),
        "scroll_count": len(scroll_events),
        "first_wheel_t": round(first_wheel["t"], 1) if first_wheel else None,
        "last_wheel_t": round(last_wheel["t"], 1) if last_wheel else None,
        "last_wheel_scrollY": round(last_wheel["scrollY"], 1) if last_wheel else None,
        "last_scroll_t": round(last_scroll["t"], 1) if last_scroll else None,
        "bubble_t": round(bubble["t"], 1) if bubble else None,
        "bubble_text": bubble["text"] if bubble else None,
        "ms_since_last_wheel": round(ms_diff, 1) if ms_diff is not None else None,
        "ms_since_last_scroll": round(ms_scroll_diff, 1) if ms_scroll_diff is not None else None,
    }

async def main():
    viewports = [
        {"name": "desktop (1440x900)", "width": 1440, "height": 900},
        {"name": "mobile (390x844)", "width": 390, "height": 844}
    ]

    print("=" * 80)
    print("ITEM 1: LINGER DIAGNOSIS RUN (3 runs per viewport)")
    print("=" * 80)

    async with async_playwright() as p:
        browser = await p.chromium.launch()

        results = []
        for vp in viewports:
            print(f"\n--- Viewport: {vp['name']} ---")
            for r in range(1, 4):
                res = await run_single_linger_test(browser, vp, r)
                results.append(res)
                print(f"Run {r}: last_wheel_t={res['last_wheel_t']}ms, bubble_t={res['bubble_t']}ms, bubble='{res['bubble_text']}', ms_since_last_wheel={res['ms_since_last_wheel']}ms (expected >= 10000ms)")

        await browser.close()

    print("\n" + "=" * 80)
    print("SUMMARY OF ALL RUNS")
    print("=" * 80)
    print(f"{'Viewport':<20} | {'Run':<4} | {'Vis %':<7} | {'Wheel':<6} | {'Last Wheel (ms)':<16} | {'Bubble (ms)':<12} | {'Delta (ms)':<11} | {'Bubble Text'}")
    print("-" * 110)
    for res in results:
        delta_str = f"{res['ms_since_last_wheel']:.1f}" if res['ms_since_last_wheel'] is not None else "NO BUBBLE"
        print(f"{res['viewport']:<20} | {res['run']:<4} | {res['vis']*100:.1f}% | {res['wheel_count']:<6} | {res['last_wheel_t']:<16} | {res['bubble_t']:<12} | {delta_str:<11} | {res['bubble_text']}")

if __name__ == "__main__":
    asyncio.run(main())

