import asyncio
import os
import shutil
from playwright.async_api import async_playwright

WORKSPACE = r"d:\Projects\Portfolio-ORV-main"
ARTIFACT_DIR = r"C:\Users\SUMIT\.gemini\antigravity\brain\0f91a232-b6bc-421c-bf43-b43a4359eb3e"
PUBLIC_DIR = os.path.join(WORKSPACE, "public", "biyoo")

def to_rect(b):
    if not b:
        return None
    x = b.get('x', b.get('left', 0))
    y = b.get('y', b.get('top', 0))
    w = b.get('width', 0)
    h = b.get('height', 0)
    return {
        'left': round(x, 1),
        'right': round(x + w, 1),
        'top': round(y, 1),
        'bottom': round(y + h, 1),
        'width': round(w, 1),
        'height': round(h, 1)
    }

def rect_intersects(b1, b2):
    r1 = to_rect(b1)
    r2 = to_rect(b2)
    if not r1 or not r2:
        return False
    return not (
        r1['right'] <= r2['left'] or
        r1['left'] >= r2['right'] or
        r1['bottom'] <= r2['top'] or
        r1['top'] >= r2['bottom']
    )

async def measure_viewport(page, width, height):
    print(f"\n=======================================================")
    print(f"MEASURING VIEWPORT: {width}x{height}")
    print(f"=======================================================")

    await page.set_viewport_size({"width": width, "height": height})
    await page.goto("http://localhost:3000", wait_until="networkidle")
    await page.wait_for_selector('[data-testid="biyoo-live-puppet"]', timeout=8000)

    # Force constellation card visible
    await page.evaluate("""() => {
        let card = document.getElementById('constellation-card');
        if (!card) {
            card = document.createElement('div');
            card.id = 'constellation-card';
            card.setAttribute('data-testid', 'constellation-card');
            card.className = 'fixed top-20 right-4 sm:top-20 sm:right-8 z-50 max-w-[300px] sm:max-w-sm pointer-events-auto bg-space-deep/90 p-4 border border-cyan-400 rounded-lg shadow-xl text-white text-xs';
            card.innerHTML = '<strong>Constellation Card (Forced)</strong><p>Verification reader card</p>';
            document.body.appendChild(card);
        }
        card.style.display = 'block';
        card.style.visibility = 'visible';
    }""")
    await page.wait_for_selector('[data-testid="constellation-card"]', timeout=5000)

    # Open panel and ask "Who is Sumit?"
    hitbox = page.locator('[data-testid="biyoo-silhouette-hitbox"]')
    await hitbox.dispatch_event('click')
    await page.wait_for_selector('[data-testid="biyoo-qa-panel"]', timeout=5000)

    input_box = page.locator('#biyoo-question-input')
    await input_box.fill('Who is Sumit?')
    await page.keyboard.press('Enter')
    await page.wait_for_selector('[data-testid="biyoo-qa-answer"]', timeout=5000)
    await page.wait_for_timeout(300)

    # Get boxes
    panel_box = await page.locator('[data-testid="biyoo-qa-panel"]').bounding_box()
    input_box_rect = await input_box.bounding_box()
    chips_locator = page.locator('[data-testid="biyoo-qa-chips"]')
    chips_visible = await chips_locator.is_visible()
    chips_box = await chips_locator.bounding_box() if chips_visible else None

    answer_locator = page.locator('[data-testid="biyoo-qa-answer"]')
    answer_box = await answer_locator.bounding_box()

    biyoo_box = await page.locator('[data-testid="biyoo-live-puppet"]').bounding_box()
    card_box = await page.locator('[data-testid="constellation-card"]').bounding_box()

    # Check if first 3 lines of answer are visible without scrolling
    scroll_info = await answer_locator.evaluate("""el => {
        return {
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
            scrollTop: el.scrollTop,
            hasOverflow: el.scrollHeight > el.clientHeight
        };
    }""")

    # Check text line rects for hero text and CTAs
    hero_rects = await page.evaluate("""() => {
        const rects = [];
        const hero = document.getElementById('hero-scene');
        if (!hero) return rects;

        // CTAs
        const ctas = hero.querySelectorAll('a[href^="#"]');
        for (const cta of ctas) {
            const r = cta.getBoundingClientRect();
            rects.push({ type: 'cta', left: r.left, right: r.right, top: r.top, bottom: r.bottom, text: cta.textContent.trim() });
        }

        // Text lines via Range
        const walker = document.createTreeWalker(hero, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            if (!node.textContent.trim()) continue;
            if (node.parentElement && node.parentElement.closest('a[href^="#"]')) continue; // already tracked as cta
            const range = document.createRange();
            range.selectNodeContents(node);
            const clientRects = range.getClientRects();
            for (let i = 0; i < clientRects.length; i++) {
                const r = clientRects[i];
                if (r.width > 0 && r.height > 0) {
                    rects.push({ type: 'text', left: r.left, right: r.right, top: r.top, bottom: r.bottom, text: node.textContent.slice(0, 20) });
                }
            }
        }
        return rects;
    }""")

    # Count intersections with panel
    intersections = []
    if rect_intersects(panel_box, biyoo_box):
        intersections.append("Biyoo puppet")
    if rect_intersects(panel_box, card_box):
        intersections.append("Constellation card")

    for hr in hero_rects:
        if rect_intersects(panel_box, hr):
            intersections.append(f"Hero {hr['type']}: '{hr['text']}'")

    print(f"Panel Box             : {to_rect(panel_box)}")
    print(f"Input Box             : {to_rect(input_box_rect)}")
    print(f"Chips Box             : {to_rect(chips_box)} (collapsed while answer showing: {not chips_visible})")
    print(f"Answer Box            : {to_rect(answer_box)}")
    print(f"Biyoo Puppet Box      : {to_rect(biyoo_box)}")
    print(f"Constellation Card Box: {to_rect(card_box)}")
    print(f"Answer Scroll Info    : clientHeight={scroll_info['clientHeight']}, scrollHeight={scroll_info['scrollHeight']}, hasOverflow={scroll_info['hasOverflow']}")
    print(f"Intersections ({len(intersections)}): {intersections}")

    assert len(intersections) == 0, f"Prohibited intersections found on {width}x{height}: {intersections}"
    print(f"PASS: Zero prohibited intersections on {width}x{height}!")

async def export_images():
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    os.makedirs(ARTIFACT_DIR, exist_ok=True)

    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # Shot 1: round7-360x740-panel-open.png (with an answer)
        ctx1 = await browser.new_context(viewport={"width": 360, "height": 740}, device_scale_factor=1.0)
        p1 = await ctx1.new_page()
        await p1.goto("http://localhost:3000", wait_until="networkidle")
        await p1.wait_for_selector('[data-testid="biyoo-live-puppet"]', timeout=8000)
        await p1.locator('[data-testid="biyoo-silhouette-hitbox"]').dispatch_event('click')
        await p1.wait_for_selector('[data-testid="biyoo-qa-panel"]', timeout=5000)
        in1 = p1.locator('#biyoo-question-input')
        await in1.fill('Who is Sumit?')
        await p1.keyboard.press('Enter')
        await p1.wait_for_selector('[data-testid="biyoo-qa-answer"]', timeout=5000)
        await p1.wait_for_timeout(300)
        path1 = os.path.join(WORKSPACE, "round7-360x740-panel-open.png")
        await p1.screenshot(path=path1)
        results.append(("round7-360x740-panel-open.png", path1, os.path.getsize(path1)))
        await ctx1.close()

        # Shot 2: round7-1280x600-panel-open.png (with an answer on short desktop)
        ctx2 = await browser.new_context(viewport={"width": 1280, "height": 600}, device_scale_factor=1.0)
        p2 = await ctx2.new_page()
        await p2.goto("http://localhost:3000", wait_until="networkidle")
        await p2.wait_for_selector('[data-testid="biyoo-live-puppet"]', timeout=8000)
        await p2.locator('[data-testid="biyoo-silhouette-hitbox"]').dispatch_event('click')
        await p2.wait_for_selector('[data-testid="biyoo-qa-panel"]', timeout=5000)
        in2 = p2.locator('#biyoo-question-input')
        await in2.fill('What is Ratify?')
        await p2.keyboard.press('Enter')
        await p2.wait_for_selector('[data-testid="biyoo-qa-answer"]', timeout=5000)
        await p2.wait_for_timeout(300)
        path2 = os.path.join(WORKSPACE, "round7-1280x600-panel-open.png")
        await p2.screenshot(path=path2)
        results.append(("round7-1280x600-panel-open.png", path2, os.path.getsize(path2)))
        await ctx2.close()

        # Shot 3: round7-360x740-fallback-chips.png (fallback query showing fallback sentence and fallback chips)
        ctx3 = await browser.new_context(viewport={"width": 360, "height": 740}, device_scale_factor=1.0)
        p3 = await ctx3.new_page()
        await p3.goto("http://localhost:3000", wait_until="networkidle")
        await p3.wait_for_selector('[data-testid="biyoo-live-puppet"]', timeout=8000)
        await p3.locator('[data-testid="biyoo-silhouette-hitbox"]').dispatch_event('click')
        await p3.wait_for_selector('[data-testid="biyoo-qa-panel"]', timeout=5000)
        in3 = p3.locator('#biyoo-question-input')
        await in3.fill('how many github stars does ratify have?')
        await p3.keyboard.press('Enter')
        await p3.wait_for_selector('[data-testid="biyoo-qa-answer"]', timeout=5000)
        await p3.wait_for_selector('[data-testid="biyoo-qa-chips"]', timeout=5000)
        await p3.wait_for_timeout(300)
        path3 = os.path.join(WORKSPACE, "round7-360x740-fallback-chips.png")
        await p3.screenshot(path=path3)
        results.append(("round7-360x740-fallback-chips.png", path3, os.path.getsize(path3)))
        await ctx3.close()

        # Shot 4: round7-1440x900-fallback-chips.png (fallback query showing fallback sentence and fallback chips)
        ctx4 = await browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1.0)
        p4 = await ctx4.new_page()
        await p4.goto("http://localhost:3000", wait_until="networkidle")
        await p4.wait_for_selector('[data-testid="biyoo-live-puppet"]', timeout=8000)
        await p4.locator('[data-testid="biyoo-silhouette-hitbox"]').dispatch_event('click')
        await p4.wait_for_selector('[data-testid="biyoo-qa-panel"]', timeout=5000)
        in4 = p4.locator('#biyoo-question-input')
        await in4.fill('is ratify better than etcd?')
        await p4.keyboard.press('Enter')
        await p4.wait_for_selector('[data-testid="biyoo-qa-answer"]', timeout=5000)
        await p4.wait_for_selector('[data-testid="biyoo-qa-chips"]', timeout=5000)
        await p4.wait_for_timeout(300)
        path4 = os.path.join(WORKSPACE, "round7-1440x900-fallback-chips.png")
        await p4.screenshot(path=path4)
        results.append(("round7-1440x900-fallback-chips.png", path4, os.path.getsize(path4)))
        await ctx4.close()

        # Verification of 1366x625 and 1280x600
        meas_ctx = await browser.new_context(device_scale_factor=1.0)
        meas_page = await meas_ctx.new_page()
        await measure_viewport(meas_page, 1366, 625)
        await measure_viewport(meas_page, 1280, 600)
        await meas_ctx.close()

        await browser.close()

    # Copy to public and artifact dirs
    for filename, path, size in results:
        shutil.copyfile(path, os.path.join(PUBLIC_DIR, filename))
        shutil.copyfile(path, os.path.join(ARTIFACT_DIR, filename))

    print("\n================ EXPORTED ROUND 7 PNG IMAGES ================")
    for filename, path, size in results:
        print(f"File: {filename}")
        print(f"  Path: {path}")
        print(f"  Artifact Path: {os.path.join(ARTIFACT_DIR, filename)}")
        print(f"  Size: {size:,} bytes")
    print("=============================================================\n")

if __name__ == "__main__":
    asyncio.run(export_images())
