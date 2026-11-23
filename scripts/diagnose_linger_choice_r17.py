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

async def run_single_diagnosis(browser, run_idx):
    context = await browser.new_context(viewport={"width": 1440, "height": 900})
    page = await context.new_page()
    await page.goto("http://localhost:3000")
    await page.wait_for_timeout(1000)

    # Setup page-side observer to capture state at the exact moment the speech bubble appears
    await page.evaluate('''() => {
        window.__diagLinger = {
            bubbleCaptured: false,
            bubbleText: null,
            moodSection: null,
            elements: []
        };

        const captureState = () => {
            const bubbleEl = document.querySelector('[data-testid="biyoo-speech-bubble"]');
            if (bubbleEl && !window.__diagLinger.bubbleCaptured) {
                window.__diagLinger.bubbleCaptured = true;
                window.__diagLinger.bubbleText = bubbleEl.innerText.replace(/\\n/g, ' ').trim();
                
                const puppet = document.querySelector('[data-testid="biyoo-live-puppet"]');
                window.__diagLinger.moodSection = puppet ? puppet.getAttribute('data-biyoo-mood-section') : 'none';

                const lingerEls = document.querySelectorAll('[data-biyoo-linger]');
                const elData = [];
                for (let i = 0; i < lingerEls.length; i++) {
                    const el = lingerEls[i];
                    const rect = el.getBoundingClientRect();
                    const vh = window.innerHeight;
                    const visibleHeight = Math.max(0, Math.min(vh, rect.bottom) - Math.max(0, rect.top));
                    const elemRatio = rect.height > 0 ? visibleHeight / rect.height : 0;
                    const viewportRatio = vh > 0 ? visibleHeight / vh : 0;
                    const ratio = Math.max(elemRatio, viewportRatio);

                    elData.push({
                        index: i,
                        line: el.getAttribute('data-biyoo-line') || '',
                        rect: {
                            top: Math.round(rect.top * 10) / 10,
                            bottom: Math.round(rect.bottom * 10) / 10,
                            left: Math.round(rect.left * 10) / 10,
                            right: Math.round(rect.right * 10) / 10,
                            width: Math.round(rect.width * 10) / 10,
                            height: Math.round(rect.height * 10) / 10
                        },
                        visibleHeight: Math.round(visibleHeight * 10) / 10,
                        elemRatio: Math.round(elemRatio * 1000) / 1000,
                        viewportRatio: Math.round(viewportRatio * 1000) / 1000,
                        computedRatio: Math.round(ratio * 1000) / 1000
                    });
                }
                window.__diagLinger.elements = elData;
            }
        };

        const obs = new MutationObserver(captureState);
        obs.observe(document.body, { childList: true, subtree: true });
        setInterval(captureState, 50);
    }''')

    # Scroll into #iac-verifier with real wheel steps until > 50% visible, then stop
    for _ in range(160):
        vis = await measure_visibility(page, "iac-verifier")
        if vis > 0.50:
            break
        await page.mouse.wheel(0, 160)
        await page.wait_for_timeout(80)

    vis_at_stop = await measure_visibility(page, "iac-verifier")

    # Wait 11s
    await page.wait_for_timeout(11000)

    diag_data = await page.evaluate('window.__diagLinger')
    await context.close()

    # Determine if line matches current mood section
    expected_lines = {
        "edge-cloud": "edge orchestration at scale!",
        "ratify": "distributed consensus is tricky, huh?",
        "iac-verifier": "formal verification active!"
    }
    mood_sec = diag_data.get("moodSection", "none")
    expected_line = expected_lines.get(mood_sec, "")
    actual_bubble = diag_data.get("bubbleText", "")
    matches_mood = (expected_line in actual_bubble) if expected_line else False

    return {
        "run": run_idx,
        "vis_at_stop": vis_at_stop,
        "bubble_text": actual_bubble,
        "mood_section": mood_sec,
        "expected_line": expected_line,
        "matches_mood": matches_mood,
        "elements": diag_data.get("elements", [])
    }

async def main():
    print("=" * 80)
    print("STEP 7 ROUND 17: ITEM 1 LINGER CHOICE DIAGNOSIS (1440x900, 5 runs)")
    print("=" * 80)

    results = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for r in range(1, 6):
            res = await run_single_diagnosis(browser, r)
            results.append(res)
            print(f"\n--- RUN {r} ---")
            print(f"Visibility of #iac-verifier at stop: {res['vis_at_stop']*100:.1f}%")
            print(f"Current data-biyoo-mood-section: {res['mood_section']}")
            print(f"Bubble text captured: '{res['bubble_text']}'")
            print(f"Expected line for #{res['mood_section']}: '{res['expected_line']}'")
            print(f"Matches mood section: {res['matches_mood']}")
            print("Linger elements state at bubble moment:")
            for el in res["elements"]:
                print(f"  [{el['index']}] line='{el['line']}' | rect={el['rect']} | visibleHeight={el['visibleHeight']}px | elemRatio={el['elemRatio']} | vpRatio={el['viewportRatio']} | computedRatio={el['computedRatio']}")

        await browser.close()

    # Summary
    mismatch_count = sum(1 for r in results if not r["matches_mood"])
    print("\n" + "=" * 80)
    print("DIAGNOSIS SUMMARY")
    print("=" * 80)
    print(f"Total runs: 5")
    print(f"Runs showing line that DOES NOT match current mood section: {mismatch_count} of 5")
    for r in results:
        status_str = "MATCH" if r["matches_mood"] else "MISMATCH"
        print(f"Run {r['run']}: section='{r['mood_section']}' | bubble='{r['bubble_text'][:35]}...' | status={status_str}")

if __name__ == "__main__":
    asyncio.run(main())

