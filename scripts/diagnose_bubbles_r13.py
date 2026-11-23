import asyncio
import os
import shutil
from playwright.async_api import async_playwright
from PIL import Image

ARTIFACT_DIR = r"C:\Users\SUMIT\.gemini\antigravity\brain\0f91a232-b6bc-421c-bf43-b43a4359eb3e"

BUBBLE_STRINGS = [
    {"id": 1, "source": "src/components/home/deferred-worlds.tsx:43", "text": "edge orchestration at scale!"},
    {"id": 2, "source": "src/components/home/deferred-worlds.tsx:52", "text": "distributed consensus is tricky, huh?"},
    {"id": 3, "source": "src/components/home/deferred-worlds.tsx:61", "text": "formal verification active!"},
    {"id": 4, "source": "src/app/biyoo-test/page.tsx:754", "text": "reading this part closely, huh?"},
    {"id": 5, "source": "src/components/biyoo/puppet/use-biyoo-idle-engine.ts:1040", "text": "hey... still there?"},
    {"id": 6, "source": "src/components/biyoo/puppet/use-biyoo-idle-engine.ts:1024", "text": "...getting sleepy"},
    {"id": 7, "source": "src/components/biyoo/puppet/use-biyoo-idle-engine.ts:724", "text": "oh! you're back"},
    {"id": 8, "source": "src/components/biyoo/puppet/use-biyoo-idle-engine.ts:1239", "text": "why are we both awake?"},
    {"id": 9, "source": "src/components/biyoo/puppet/use-biyoo-idle-engine.ts:1249", "text": "you're back"},
    {"id": 10, "source": "src/components/biyoo/puppet/use-biyoo-idle-engine.ts:1249", "text": "third time? I'm flattered"},
    {"id": 11, "source": "src/components/biyoo/puppet/use-biyoo-idle-engine.ts:802", "text": "slow down, the story's not going anywhere"},
    {"id": 12, "source": "src/components/biyoo/puppet/use-biyoo-idle-engine.ts:955", "text": "that one's good"},
    {"id": 13, "source": "src/components/biyoo/puppet/use-biyoo-idle-engine.ts:837", "text": "you skipped the story?"}
]

VIEWPORTS = [
    {"name": "320x568", "width": 320, "height": 568},
    {"name": "360x640", "width": 360, "height": 640},
    {"name": "360x740", "width": 360, "height": 740},
    {"name": "375x667", "width": 375, "height": 667},
    {"name": "390x844", "width": 390, "height": 844},
    {"name": "412x915", "width": 412, "height": 915},
    {"name": "1440x900", "width": 1440, "height": 900}
]

EXTRA_GAP_VIEWPORTS = [
    {"name": "360x740", "width": 360, "height": 740},
    {"name": "360x800", "width": 360, "height": 800}
]

# Mapping of images to capture
SCREENSHOT_TARGETS = [
    {"vp": (360, 740), "string_id": 1, "filename": "round13-360x740-edge.png"},
    {"vp": (360, 740), "string_id": 3, "filename": "round13-360x740-formal.png"},
    {"vp": (360, 740), "string_id": 11, "filename": "round13-360x740-slow.png"},
    {"vp": (360, 640), "string_id": 11, "filename": "round13-360x640-slow.png"},
    {"vp": (320, 568), "string_id": 11, "filename": "round13-320x568-slow.png"}
]

async def run_audit():
    print("================================================================================")
    print("STEP 6 ROUND 13 BUBBLE AUDIT")
    print("================================================================================")
    print("13 AUDITED BUBBLE STRINGS:")
    for b in BUBBLE_STRINGS:
        print(f"[{b['id']:2d}] len={len(b['text']):2d} | {b['source']:<55} | \"{b['text']}\"")
    print("================================================================================\n")

    failing_rows = []
    generated_images = []

    async with async_playwright() as p:
        browser = await p.chromium.launch()

        for vp in VIEWPORTS:
            w, h = vp["width"], vp["height"]
            print(f"================================================================================")
            print(f"VIEWPORT: {vp['name']} ({w}x{h})")
            print(f"================================================================================")
            print(f"{'Id':<3} | {'String':<36} | {'Len':<4} | {'Lines':<5} | {'cH':<4} | {'sH':<4} | {'Trunc':<5} | {'Ints':<4} | {'InVP':<5} | {'Bubble Rect'}")
            print("-" * 125)

            page = await browser.new_page(viewport={"width": w, "height": h})
            await page.goto("http://localhost:3000/?skipIntro=true", wait_until="domcontentloaded")
            await page.wait_for_selector('[data-biyoo-puppet="global"]')
            
            # Ensure sound permission prompt is in DOM
            await page.evaluate('''() => {
                let prompt = document.querySelector('#sound-permission-prompt');
                if (!prompt) {
                    const el = document.createElement('div');
                    el.id = 'sound-permission-prompt';
                    el.className = 'fixed z-50 w-auto p-2 sm:p-2.5 lg:p-4 rounded-xl border border-star/40 bg-ink/95 shadow-2xl backdrop-blur-none transition-all duration-300 sound-permission-prompt-pos';
                    el.innerHTML = `
                        <div class="flex items-center gap-2 lg:items-start lg:gap-3">
                            <div class="flex items-center gap-2 lg:block lg:space-y-3 flex-1">
                                <p class="font-ui text-xs sm:text-sm text-feather leading-snug whitespace-nowrap lg:whitespace-normal">
                                    <span class="lg:hidden">Sound on?</span>
                                    <span class="hidden lg:inline">Biyoo wants to say hi. Turn sound on?</span>
                                </p>
                                <div class="flex items-center gap-1.5 sm:gap-2">
                                    <button class="px-2.5 sm:px-3.5 py-1 sm:py-2 rounded-lg border border-star bg-star/20 text-star font-mono text-xs font-semibold tracking-wide transition-colors focus:ring-2 focus:ring-star focus:outline-none whitespace-nowrap">
                                        <span class="lg:hidden">On</span>
                                        <span class="hidden lg:inline">Turn sound on</span>
                                    </button>
                                    <button class="px-2 sm:px-3.5 py-1 sm:py-2 rounded-lg border border-line bg-ink-2 text-mist font-mono text-xs tracking-wide transition-colors focus:ring-2 focus:ring-star focus:outline-none whitespace-nowrap">
                                        Not now
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(el);
                }
            }''')
            await page.wait_for_timeout(200)

            for item in BUBBLE_STRINGS:
                str_id = item["id"]
                text = item["text"]
                text_len = len(text)

                # Show bubble
                await page.evaluate('''(msg) => {
                    if (window.__biyooEngine && typeof window.__biyooEngine.showBubble === 'function') {
                        window.__biyooEngine.showBubble(msg, true);
                    }
                }''', text)
                await page.wait_for_timeout(200)

                meas = await page.evaluate('''([vw, vh]) => {
                    function getRect(el) {
                        if (!el) return null;
                        const r = el.getBoundingClientRect();
                        return {
                            left: Math.round(r.left * 10) / 10,
                            top: Math.round(r.top * 10) / 10,
                            right: Math.round(r.right * 10) / 10,
                            bottom: Math.round(r.bottom * 10) / 10,
                            width: Math.round(r.width * 10) / 10,
                            height: Math.round(r.height * 10) / 10
                        };
                    }
                    function intersects(r1, r2) {
                        if (!r1 || !r2) return false;
                        return !(r1.right <= r2.left || r1.left >= r2.right || r1.bottom <= r2.top || r1.top >= r2.bottom);
                    }

                    const bubble = document.querySelector('[data-testid="biyoo-speech-bubble"]') || document.querySelector('.biyoo-bubble-dock');
                    const span = bubble ? bubble.querySelector('span') : null;
                    const prompt = document.querySelector('#sound-permission-prompt');
                    const toggle = document.querySelector('#biyoo-quiet-toggle');
                    const biyoo = document.querySelector('[data-biyoo-puppet="global"]') || document.querySelector('[data-testid="biyoo-live-puppet"]');

                    const br = getRect(bubble);
                    const pr = getRect(prompt);
                    const tr = getRect(toggle);
                    const byr = getRect(biyoo);

                    // Elements to test intersections against:
                    // sound prompt, toggle, Biyoo, every hero CTA, nav link, heading, paragraph
                    const testedElements = [];
                    if (prompt) testedElements.push({ name: 'sound prompt', el: prompt });
                    if (toggle) testedElements.push({ name: 'toggle', el: toggle });
                    if (biyoo) testedElements.push({ name: 'Biyoo', el: biyoo });

                    // Hero CTAs
                    const hero = document.getElementById('hero-scene');
                    if (hero) {
                        const heroCtas = hero.querySelectorAll('a, button[data-biyoo-point]');
                        heroCtas.forEach((el, idx) => testedElements.push({ name: `hero CTA ${idx+1}`, el }));
                    }

                    // Nav links
                    document.querySelectorAll('nav a, header a').forEach((el, idx) => {
                        testedElements.push({ name: `nav link ${idx+1}`, el });
                    });

                    // Headings visible in viewport
                    document.querySelectorAll('h1, h2, h3, h4').forEach((el, idx) => {
                        testedElements.push({ name: `heading ${idx+1}`, el });
                    });

                    // Paragraphs visible in viewport
                    document.querySelectorAll('p').forEach((el, idx) => {
                        // ignore sound prompt internal p since sound prompt itself is tested
                        if (!el.closest('#sound-permission-prompt')) {
                            testedElements.push({ name: `p ${idx+1}`, el });
                        }
                    });

                    let intersectionCount = 0;
                    const collisionList = [];
                    if (br) {
                        for (const item of testedElements) {
                            const er = getRect(item.el);
                            if (er && er.width > 0 && er.height > 0) {
                                if (intersects(br, er)) {
                                    intersectionCount++;
                                    collisionList.push(item.name);
                                }
                            }
                        }
                    }

                    const inViewport = br ? (br.left >= 0 && br.top >= 0 && br.right <= vw && br.bottom <= vh) : false;
                    const cs = span ? window.getComputedStyle(span) : null;
                    const lh = cs ? parseFloat(cs.lineHeight) : 16;
                    const renderedLines = span ? Math.round(span.clientHeight / lh) : 0;
                    const isTrunc = span ? (span.scrollHeight > span.clientHeight + 1) : false;

                    let verticalGapPrompt = null;
                    if (br && pr) {
                        verticalGapPrompt = Math.round((pr.top - br.bottom) * 10) / 10;
                    }

                    return {
                        clientHeight: span ? span.clientHeight : 0,
                        scrollHeight: span ? span.scrollHeight : 0,
                        renderedLines,
                        isTrunc,
                        bubbleRect: br,
                        intersectionCount,
                        collisionList,
                        inViewport,
                        verticalGapPrompt
                    };
                }''', [w, h])

                trunc_str = "yes" if meas["isTrunc"] else "no"
                invp_str = "yes" if meas["inViewport"] else "no"
                rect_str = str(meas["bubbleRect"])

                print(f"[{str_id:2d}] | {text[:34]:<36} | {text_len:<4} | {meas['renderedLines']:<5} | {meas['clientHeight']:<4} | {meas['scrollHeight']:<4} | {trunc_str:<5} | {meas['intersectionCount']:<4} | {invp_str:<5} | {rect_str}")

                # Check gate
                if meas["isTrunc"] or meas["intersectionCount"] > 0 or not meas["inViewport"]:
                    failing_rows.append({
                        "vp": f"{w}x{h}",
                        "id": str_id,
                        "text": text,
                        "truncated": trunc_str,
                        "intersections": meas["intersectionCount"],
                        "collisions": meas["collisionList"],
                        "in_viewport": invp_str
                    })

                # Check screenshot targets
                for target in SCREENSHOT_TARGETS:
                    if target["vp"] == (w, h) and target["string_id"] == str_id:
                        bubble_loc = page.locator('[data-testid="biyoo-speech-bubble"]')
                        local_img = os.path.join("scripts", target["filename"])
                        await bubble_loc.screenshot(path=local_img)
                        art_img = os.path.join(ARTIFACT_DIR, target["filename"])
                        shutil.copy2(local_img, art_img)
                        fsize = os.path.getsize(local_img)
                        generated_images.append({
                            "filename": target["filename"],
                            "path": local_img,
                            "artifact_path": art_img,
                            "bytes": fsize
                        })

            await page.close()
            print()

        # Check vertical gap at 360x740 and 360x800
        print("================================================================================")
        print("VERTICAL GAP AUDIT: BUBBLE TO SOUND PROMPT AT 360x740 AND 360x800")
        print("================================================================================")
        print(f"{'VP':<8} | {'Id':<3} | {'String':<36} | {'Bubble Rect':<46} | {'Prompt Rect':<46} | {'vGap (>=17px)'}")
        print("-" * 155)

        for vp in EXTRA_GAP_VIEWPORTS:
            w, h = vp["width"], vp["height"]
            page = await browser.new_page(viewport={"width": w, "height": h})
            await page.goto("http://localhost:3000/?skipIntro=true", wait_until="domcontentloaded")
            await page.wait_for_selector('[data-biyoo-puppet="global"]')
            
            # Ensure sound permission prompt is in DOM
            await page.evaluate('''() => {
                let prompt = document.querySelector('#sound-permission-prompt');
                if (!prompt) {
                    const el = document.createElement('div');
                    el.id = 'sound-permission-prompt';
                    el.className = 'fixed z-50 w-auto p-2 sm:p-2.5 lg:p-4 rounded-xl border border-star/40 bg-ink/95 shadow-2xl backdrop-blur-none transition-all duration-300 sound-permission-prompt-pos';
                    el.innerHTML = `
                        <div class="flex items-center gap-2 lg:items-start lg:gap-3">
                            <div class="flex items-center gap-2 lg:block lg:space-y-3 flex-1">
                                <p class="font-ui text-xs sm:text-sm text-feather leading-snug whitespace-nowrap lg:whitespace-normal">
                                    <span class="lg:hidden">Sound on?</span>
                                    <span class="hidden lg:inline">Biyoo wants to say hi. Turn sound on?</span>
                                </p>
                                <div class="flex items-center gap-1.5 sm:gap-2">
                                    <button class="px-2.5 sm:px-3.5 py-1 sm:py-2 rounded-lg border border-star bg-star/20 text-star font-mono text-xs font-semibold tracking-wide transition-colors focus:ring-2 focus:ring-star focus:outline-none whitespace-nowrap">
                                        <span class="lg:hidden">On</span>
                                        <span class="hidden lg:inline">Turn sound on</span>
                                    </button>
                                    <button class="px-2 sm:px-3.5 py-1 sm:py-2 rounded-lg border border-line bg-ink-2 text-mist font-mono text-xs tracking-wide transition-colors focus:ring-2 focus:ring-star focus:outline-none whitespace-nowrap">
                                        Not now
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(el);
                }
            }''')
            await page.wait_for_timeout(200)

            for item in BUBBLE_STRINGS:
                str_id = item["id"]
                text = item["text"]
                await page.evaluate('''(msg) => {
                    if (window.__biyooEngine && typeof window.__biyooEngine.showBubble === 'function') {
                        window.__biyooEngine.showBubble(msg, true);
                    }
                }''', text)
                await page.wait_for_timeout(150)

                gaps = await page.evaluate('''() => {
                    function getRect(el) {
                        if (!el) return null;
                        const r = el.getBoundingClientRect();
                        return {
                            left: Math.round(r.left * 10) / 10,
                            top: Math.round(r.top * 10) / 10,
                            right: Math.round(r.right * 10) / 10,
                            bottom: Math.round(r.bottom * 10) / 10,
                            width: Math.round(r.width * 10) / 10,
                            height: Math.round(r.height * 10) / 10
                        };
                    }
                    const bubble = document.querySelector('.biyoo-bubble-dock');
                    const prompt = document.querySelector('#sound-permission-prompt');
                    const br = getRect(bubble);
                    const pr = getRect(prompt);
                    const vGap = (br && pr) ? Math.round((pr.top - br.bottom) * 10) / 10 : null;
                    return { br, pr, vGap };
                }''')

                print(f"{vp['name']:<8} | [{str_id:2d}] | {text[:34]:<36} | {str(gaps['br']):<46} | {str(gaps['pr']):<46} | {gaps['vGap']}px")
                if gaps['vGap'] is not None and gaps['vGap'] < 17:
                    failing_rows.append({
                        "vp": vp['name'],
                        "id": str_id,
                        "text": text,
                        "error": f"vGap {gaps['vGap']}px < 17px"
                    })

            await page.close()
            print()

        await browser.close()

    print("================================================================================")
    print("GATE EVALUATION")
    print("================================================================================")
    print(f"Total failing rows count: {len(failing_rows)}")
    if failing_rows:
        print("FAILING ROWS:")
        for r in failing_rows:
            print(" ", r)
    else:
        print("All rows satisfied: truncated=no, intersections=0, inside viewport=yes, vGap>=17px.")
    print("================================================================================\n")

    print("================================================================================")
    print("GENERATED SCREENSHOT IMAGES (1:1 CROPS)")
    print("================================================================================")
    for img in generated_images:
        print(f"File: {img['filename']:<30} | Path: {img['path']:<35} | Bytes: {img['bytes']:<8} bytes")
    print("================================================================================\n")

if __name__ == "__main__":
    asyncio.run(run_audit())

