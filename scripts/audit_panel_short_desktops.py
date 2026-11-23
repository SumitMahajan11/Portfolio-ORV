import asyncio
import json
from playwright.async_api import async_playwright

async def check_short_desktops():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for w, h in [(1366, 625), (1280, 600), (1280, 720)]:
            page = await browser.new_page(viewport={'width': w, 'height': h})
            await page.goto('http://localhost:3000/?skipIntro=true')
            await page.wait_for_timeout(1000)
            
            # Click biyoo puppet dock to open panel
            puppet = await page.wait_for_selector('.biyoo-puppet-dock, [data-biyoo-puppet]')
            await puppet.click()
            
            # Wait for panel to load dynamically
            await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')
            
            # Click prompt chip
            chip = await page.wait_for_selector('button:has-text("Who is Sumit?")')
            await chip.click()
            
            # Wait for answer to render
            await page.wait_for_selector('[data-testid="biyoo-qa-answer"]')
            await page.wait_for_timeout(400)
            
            panel_info = await page.evaluate('''() => {
                const panel = document.querySelector('[data-testid="biyoo-qa-panel"]') || document.querySelector('[role="dialog"]');
                const answer = document.querySelector('[data-testid="biyoo-qa-answer"]');
                const biyoo = document.querySelector('.biyoo-puppet-dock') || document.querySelector('[data-biyoo-puppet]');
                
                if (!panel || !answer) return { error: 'panel or answer not found' };
                const pStyle = window.getComputedStyle(panel);
                const aStyle = window.getComputedStyle(answer);
                const pRect = panel.getBoundingClientRect();
                const aRect = answer.getBoundingClientRect();
                const bRect = biyoo ? biyoo.getBoundingClientRect() : null;
                
                const top = Math.max(aRect.top, pRect.top);
                const bottom = Math.min(aRect.bottom, pRect.bottom);
                const left = Math.max(aRect.left, pRect.left);
                const right = Math.min(aRect.right, pRect.right);
                
                let visibleAnswer = null;
                let intersectsBiyoo = false;
                
                if (bottom > top && right > left) {
                    visibleAnswer = { 
                        left: Math.round(left * 10) / 10, 
                        top: Math.round(top * 10) / 10, 
                        right: Math.round(right * 10) / 10, 
                        bottom: Math.round(bottom * 10) / 10, 
                        width: Math.round((right - left) * 10) / 10, 
                        height: Math.round((bottom - top) * 10) / 10 
                    };
                    if (bRect) {
                        intersectsBiyoo = !(right <= bRect.left || left >= bRect.right || bottom <= bRect.top || top >= bRect.bottom);
                    }
                }
                
                const lineHeight = parseFloat(aStyle.lineHeight) || 16;
                const linesVisible = visibleAnswer ? (visibleAnswer.height / lineHeight) : 0;
                
                return {
                    overflowY: pStyle.overflowY,
                    panelRect: { left: Math.round(pRect.left * 10)/10, top: Math.round(pRect.top*10)/10, right: Math.round(pRect.right*10)/10, bottom: Math.round(pRect.bottom*10)/10, width: Math.round(pRect.width*10)/10, height: Math.round(pRect.height*10)/10 },
                    answerRect: { left: Math.round(aRect.left*10)/10, top: Math.round(aRect.top*10)/10, right: Math.round(aRect.right*10)/10, bottom: Math.round(aRect.bottom*10)/10, width: Math.round(aRect.width*10)/10, height: Math.round(aRect.height*10)/10 },
                    visibleAnswerRect: visibleAnswer,
                    biyooRect: bRect ? { left: Math.round(bRect.left*10)/10, top: Math.round(bRect.top*10)/10, right: Math.round(bRect.right*10)/10, bottom: Math.round(bRect.bottom*10)/10 } : null,
                    intersectsBiyoo: intersectsBiyoo,
                    first3LinesVisible: linesVisible >= 2.8,
                    approxLinesVisible: Math.round(linesVisible * 10) / 10
                };
            }''')
            print(f"=== {w}x{h} ===")
            print(json.dumps(panel_info, indent=2))
            await page.close()
        await browser.close()

asyncio.run(check_short_desktops())
