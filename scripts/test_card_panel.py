import asyncio
from playwright.async_api import async_playwright

async def measure():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1280, 'height': 600})
        await page.goto('http://localhost:3000', wait_until='domcontentloaded')
        await page.wait_for_selector('[data-testid="biyoo-live-puppet"]')

        # Click puppet with force to open QA
        hitbox = page.locator('[data-testid="biyoo-silhouette-hitbox"]')
        await hitbox.click(force=True)
        await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')

        # Force constellation card visible via DOM injection or event
        # Let's see if event works
        await page.evaluate('''() => {
            window.dispatchEvent(new CustomEvent("constellation:trigger", { detail: { context: "hero" } }));
        }''')
        await page.wait_for_timeout(300)

        card_visible = await page.evaluate('''() => {
            const btn = document.querySelector('button[aria-label="Dismiss constellation comment"]');
            return !!btn;
        }''')
        print("Card visible via event:", card_visible)

        if not card_visible:
            # Force it visible by rendering or unhiding
            await page.evaluate('''() => {
                const el = document.createElement('div');
                el.className = "fixed top-24 right-4 sm:top-28 sm:right-8 z-50 max-w-[300px] sm:max-w-sm pointer-events-auto transition-all duration-300";
                el.setAttribute('data-testid', 'constellation-card-forced');
                el.innerHTML = `
                    <div class="relative border border-star/50 bg-[rgba(14,17,24,0.92)] backdrop-blur-md shadow-[0_4px_24px_rgba(94,225,230,0.15)] p-3 sm:p-4 font-mono">
                        <div class="flex items-center justify-between gap-2 border-b border-line/60 pb-1.5 mb-2">
                            <span class="font-display text-[10px] sm:text-xs font-semibold tracking-wider uppercase text-star">[CONSTELLATION BROADCAST]</span>
                            <button aria-label="Dismiss constellation comment">&times;</button>
                        </div>
                        <p class="text-xs sm:text-sm text-feather font-mono leading-relaxed">"The constellation Demon-like Judge of Fire is watching."</p>
                    </div>
                `;
                document.body.appendChild(el);
            }''')

        boxes = await page.evaluate('''() => {
            const round = (r) => r ? ({
                left: Math.round(r.left * 10) / 10,
                right: Math.round(r.right * 10) / 10,
                top: Math.round(r.top * 10) / 10,
                bottom: Math.round(r.bottom * 10) / 10,
                width: Math.round(r.width * 10) / 10,
                height: Math.round(r.height * 10) / 10
            }) : null;

            const panel = document.querySelector('[data-testid="biyoo-qa-panel"]');
            const card = document.querySelector('[data-testid="constellation-card-forced"]') || document.querySelector('button[aria-label="Dismiss constellation comment"]')?.closest('.fixed');
            const biyoo = document.querySelector('[data-testid="biyoo-live-puppet"]');
            const prompt = document.querySelector('#sound-permission-prompt');
            const toggle = document.querySelector('#biyoo-quiet-toggle');

            return {
                panel: round(panel?.getBoundingClientRect()),
                card: round(card?.getBoundingClientRect()),
                biyoo: round(biyoo?.getBoundingClientRect()),
                prompt: round(prompt?.getBoundingClientRect()),
                toggle: round(toggle?.getBoundingClientRect())
            };
        }''')
        print("Boxes:", boxes)
        await browser.close()

asyncio.run(measure())

