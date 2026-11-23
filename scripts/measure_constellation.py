import asyncio
import json
from playwright.async_api import async_playwright

async def measure_constellation():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1366, 'height': 625})
        await page.goto('http://localhost:3000/?skipIntro=true')
        await page.wait_for_timeout(1000)
        
        info = await page.evaluate('''() => {
            let overlay = document.querySelector('div.fixed.top-20');
            let forced = false;
            if (!overlay) {
                forced = true;
                overlay = document.createElement('div');
                overlay.className = 'fixed top-20 right-4 sm:top-20 sm:right-8 z-50 max-w-[300px] sm:max-w-sm pointer-events-auto transition-all duration-300';
                overlay.innerHTML = `
                  <div class="relative border border-star/50 bg-[rgba(14,17,24,0.92)] backdrop-blur-md shadow-[0_4px_24px_rgba(94,225,230,0.15)] p-3 sm:p-4 font-mono">
                    <div class="flex items-center justify-between gap-2 border-b border-line/60 pb-1.5 mb-2">
                      <span class="font-display text-[10px] sm:text-xs font-semibold tracking-wider uppercase">[CONSTELLATION BROADCAST]</span>
                    </div>
                    <p class="text-xs sm:text-sm text-foreground/90 font-mono leading-relaxed">System status nominal. All 3 nodes synchronized.</p>
                  </div>
                `;
                document.body.appendChild(overlay);
            }
            const rect = overlay.getBoundingClientRect();
            return {
                selector: 'div.fixed.top-20.right-4.sm\\\\:top-20.sm\\\\:right-8',
                forced: forced,
                text: overlay.innerText.trim(),
                rect: {
                    left: Math.round(rect.left * 10) / 10,
                    top: Math.round(rect.top * 10) / 10,
                    right: Math.round(rect.right * 10) / 10,
                    bottom: Math.round(rect.bottom * 10) / 10,
                    width: Math.round(rect.width * 10) / 10,
                    height: Math.round(rect.height * 10) / 10
                }
            };
        }''')
        print(json.dumps(info, indent=2))
        await browser.close()

asyncio.run(measure_constellation())

