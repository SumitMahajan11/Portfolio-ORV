import asyncio
import json
from playwright.async_api import async_playwright

BUBBLE_STRINGS = [
    {"source": "src/components/home/deferred-worlds.tsx:43", "category": "data-biyoo-line", "text": "edge orchestration at scale!"},
    {"source": "src/components/home/deferred-worlds.tsx:52", "category": "data-biyoo-line", "text": "distributed consensus is tricky, huh?"},
    {"source": "src/components/home/deferred-worlds.tsx:61", "category": "data-biyoo-line", "text": "formal verification keeps things airtight"},
    {"source": "src/app/biyoo-test/page.tsx:754", "category": "data-biyoo-line", "text": "reading this part closely, huh?"},
    {"source": "src/components/biyoo/puppet/use-biyoo-idle-engine.ts:1040", "category": "idle-engine (15s curious)", "text": "hey... still there?"},
    {"source": "src/components/biyoo/puppet/use-biyoo-idle-engine.ts:1024", "category": "idle-engine (30s sleepy)", "text": "...getting sleepy"},
    {"source": "src/components/biyoo/puppet/use-biyoo-idle-engine.ts:724", "category": "idle-engine (wake)", "text": "oh! you're back"},
    {"source": "src/components/biyoo/puppet/use-biyoo-idle-engine.ts:1239", "category": "late-night", "text": "why are we both awake?"},
    {"source": "src/components/biyoo/puppet/use-biyoo-idle-engine.ts:1249", "category": "return-visitor (<3 visits)", "text": "you're back"},
    {"source": "src/components/biyoo/puppet/use-biyoo-idle-engine.ts:1249", "category": "return-visitor (>=3 visits)", "text": "third time? I'm flattered"},
    {"source": "src/components/biyoo/puppet/use-biyoo-idle-engine.ts:802", "category": "fast-scroll", "text": "slow down, the story's not going anywhere"},
    {"source": "src/components/biyoo/puppet/use-biyoo-idle-engine.ts:955", "category": "point", "text": "that one's good"},
    {"source": "src/components/biyoo/puppet/use-biyoo-idle-engine.ts:837", "category": "skip", "text": "you skipped the story?"}
]

VIEWPORTS = [
    {"name": "Phone 360x740", "width": 360, "height": 740},
    {"name": "Phone 390x844", "width": 390, "height": 844},
    {"name": "Desktop 1440x900", "width": 1440, "height": 900}
]

async def run_diagnostics():
    print("================================================================================")
    print("COLLECTED BUBBLE STRINGS IN CODEBASE:")
    print("================================================================================")
    for i, b in enumerate(BUBBLE_STRINGS):
        print(f"[{i+1:2d}] {b['source']:<55} | category: {b['category']:<28} | text: \"{b['text']}\"")

    async with async_playwright() as p:
        browser = await p.chromium.launch()

        for vp in VIEWPORTS:
            w, h = vp["width"], vp["height"]
            print(f"\n================================================================================")
            print(f"=== VIEWPORT: {vp['name']} ({w}x{h}) ===")
            print(f"================================================================================")
            print(f"{'Idx':<4} | {'String':<42} | {'Len':<4} | {'Lines':<5} | {'clientH':<8} | {'scrollH':<8} | {'Truncated?':<11} | {'Container Rect'}")
            print("-" * 135)

            page = await browser.new_page(viewport={"width": w, "height": h})
            await page.goto("http://localhost:3000/?skipIntro=true")
            await page.wait_for_selector('[data-biyoo-puppet="global"]')

            for i, b in enumerate(BUBBLE_STRINGS):
                # Force the bubble text
                await page.evaluate(f'''(t) => {{
                    if (window.__biyooEngine && typeof window.__biyooEngine.showBubble === 'function') {{
                        window.__biyooEngine.showBubble(t, true);
                    }}
                }}''', b["text"])
                await page.wait_for_timeout(250)

                meas = await page.evaluate('''() => {
                    const bubble = document.querySelector('[data-testid="biyoo-speech-bubble"]');
                    const span = document.querySelector('[data-testid="biyoo-speech-bubble"] span');
                    if (!bubble || !span) return null;

                    const br = bubble.getBoundingClientRect();
                    const cs = window.getComputedStyle(span);
                    const lh = parseFloat(cs.lineHeight) || 16.5;
                    const renderedLines = Math.round(span.clientHeight / lh);
                    const totalLines = Math.round(span.scrollHeight / lh);

                    return {
                        clientHeight: span.clientHeight,
                        scrollHeight: span.scrollHeight,
                        lineHeight: lh,
                        renderedLines: renderedLines,
                        totalLines: totalLines,
                        isTruncated: span.scrollHeight > span.clientHeight,
                        bubbleRect: {
                            left: Math.round(br.left * 10) / 10,
                            top: Math.round(br.top * 10) / 10,
                            right: Math.round(br.right * 10) / 10,
                            bottom: Math.round(br.bottom * 10) / 10,
                            width: Math.round(br.width * 10) / 10,
                            height: Math.round(br.height * 10) / 10
                        }
                    };
                }''')

                t_len = len(b["text"])
                trunc_str = "YES" if meas["isTruncated"] else "no"
                print(f"[{i+1:2d}] | {b['text'][:40]:<42} | {t_len:<4} | {meas['renderedLines']:<5} | {meas['clientHeight']:<6}px | {meas['scrollHeight']:<6}px | {trunc_str:<11} | {meas['bubbleRect']}")

            await page.close()

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_diagnostics())

