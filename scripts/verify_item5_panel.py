import asyncio
from playwright.async_api import async_playwright

async def verify_panel():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        
        # Test 1: Close pathways and focus return
        print("=== TEST 1: Panel Close Pathways & Focus Return ===")
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})
        await page.goto('http://localhost:3000', wait_until='networkidle')
        await page.wait_for_selector('[data-testid="biyoo-silhouette-hitbox"]')
        
        # 1. Close via X button
        hitbox = page.locator('[data-testid="biyoo-silhouette-hitbox"]')
        await hitbox.dispatch_event('click')
        await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        assert await page.locator('[data-testid="biyoo-qa-panel"]').is_visible()
        print("  [x] Panel opened successfully via Biyoo click")
        
        close_btn = page.locator('[aria-label="Close question dialog"]')
        await close_btn.click()
        await page.wait_for_selector('[data-testid="biyoo-qa-panel"]', state='detached')
        await page.wait_for_timeout(50)
        focused_el = await page.evaluate("() => document.activeElement ? document.activeElement.getAttribute('data-testid') : null")
        print(f"  [x] Close via X button: Panel closed. Active element: {focused_el}")
        assert focused_el == 'biyoo-silhouette-hitbox'
        
        # 2. Close via Esc key
        await hitbox.dispatch_event('click')
        await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        await page.keyboard.press('Escape')
        await page.wait_for_selector('[data-testid="biyoo-qa-panel"]', state='detached')
        await page.wait_for_timeout(50)
        focused_el = await page.evaluate("() => document.activeElement ? document.activeElement.getAttribute('data-testid') : null")
        print(f"  [x] Close via Escape key: Panel closed. Active element: {focused_el}")
        assert focused_el == 'biyoo-silhouette-hitbox'
        
        # 3. Close via Outside click
        await hitbox.dispatch_event('click')
        await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        await page.wait_for_timeout(200)
        # Click on body outside panel (e.g. at 200, 200)
        await page.mouse.click(200, 200)
        await page.wait_for_selector('[data-testid="biyoo-qa-panel"]', state='detached')
        await page.wait_for_timeout(50)
        focused_el = await page.evaluate("() => document.activeElement ? document.activeElement.getAttribute('data-testid') : null")
        print(f"  [x] Close via Outside click: Panel closed. Active element: {focused_el}")
        assert focused_el == 'biyoo-silhouette-hitbox'
        await page.close()

        # Test 2: max-height: 40vh on <1024px with internal scroll
        print("\n=== TEST 2: max-height <= 40vh on <1024px ===")
        for vp in [{'width': 360, 'height': 640}, {'width': 390, 'height': 844}, {'width': 768, 'height': 1024}]:
            page = await browser.new_page(viewport=vp)
            await page.goto('http://localhost:3000', wait_until='networkidle')
            await page.wait_for_selector('[data-testid="biyoo-silhouette-hitbox"]')
            await page.locator('[data-testid="biyoo-silhouette-hitbox"]').dispatch_event('click')
            await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')
            
            # Type a query to populate answers and check height & overflow
            input_el = page.locator('#biyoo-question-input')
            await input_el.fill('What is ratify?')
            await page.keyboard.press('Enter')
            await page.wait_for_timeout(300)
            
            box = await page.locator('[data-testid="biyoo-qa-panel"]').bounding_box()
            vh = vp['height']
            max_allowed = vh * 0.40 + 2 # Allow 2px subpixel rounding
            print(f"  Viewport {vp['width']}x{vp['height']}: panel height = {box['height']}px (max 40vh = {vh * 0.40}px) -> {'PASS' if box['height'] <= max_allowed else 'FAIL'}")
            assert box['height'] <= max_allowed
            await page.close()

        # Test 3: Zero text-line overlap at >=1024px (1440x900)
        print("\n=== TEST 3: Zero Text-Line Overlap at >= 1024px (Range.getClientRects()) ===")
        for vp in [{'width': 1440, 'height': 900}]:
            page = await browser.new_page(viewport=vp)
            await page.goto('http://localhost:3000', wait_until='networkidle')
            await page.wait_for_selector('[data-testid="biyoo-silhouette-hitbox"]')
            await page.locator('[data-testid="biyoo-silhouette-hitbox"]').dispatch_event('click')
            await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')
            
            input_el = page.locator('#biyoo-question-input')
            await input_el.fill('Who is Sumit?')
            await page.keyboard.press('Enter')
            await page.wait_for_timeout(300)
            
            res = await page.evaluate('''() => {
                const intersects = (r1, r2) => {
                    const x_overlap = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
                    const y_overlap = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
                    return x_overlap > 0.5 && y_overlap > 0.5;
                };

                const panel = document.querySelector('[data-testid="biyoo-qa-panel"]');
                const panelBox = panel.getBoundingClientRect();
                
                // Collect text-line boxes from H1 and paragraphs, plus CTA boxes
                const textNodes = [];
                const lines = [];
                
                const walker = document.createTreeWalker(
                    document.querySelector('#hero-scene'),
                    NodeFilter.SHOW_TEXT,
                    null
                );
                
                let node;
                while (node = walker.nextNode()) {
                    if (node.textContent.trim().length > 0) {
                        const range = document.createRange();
                        range.selectNodeContents(node);
                        const rects = range.getClientRects();
                        for (let i = 0; i < rects.length; i++) {
                            const r = rects[i];
                            if (r.width > 0 && r.height > 0) {
                                lines.push({
                                    text: node.textContent.trim().substring(0, 30),
                                    box: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
                                });
                            }
                        }
                    }
                }
                
                // Add CTAs
                const ctas = document.querySelectorAll('#hero-scene a');
                ctas.forEach(cta => {
                    const r = cta.getBoundingClientRect();
                    lines.push({
                        text: 'CTA: ' + cta.innerText.trim(),
                        box: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
                    });
                });
                
                const collisions = [];
                for (const item of lines) {
                    if (intersects(item.box, panelBox)) {
                        collisions.push({ item: item.text, box: item.box });
                    }
                }
                
                return {
                    totalLinesChecked: lines.length,
                    panelBox: { left: panelBox.left, right: panelBox.right, top: panelBox.top, bottom: panelBox.bottom, width: panelBox.width, height: panelBox.height },
                    collisions
                };
            }''')
            
            print(f"  Viewport {vp['width']}x{vp['height']}: Checked {res['totalLinesChecked']} text-lines/CTAs. Collisions: {len(res['collisions'])}")
            print(f"    Panel box: {res['panelBox']}")
            if res['collisions']:
                for c in res['collisions']:
                    print(f"    [COLLISION] {c['item']} at {c['box']}")
            assert len(res['collisions']) == 0
            await page.close()

        await browser.close()
        print("\nALL ITEM 5 CHECKS PASSED!")

if __name__ == '__main__':
    asyncio.run(verify_panel())
