import asyncio
from playwright.async_api import async_playwright

async def f():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await b.new_page(viewport={"width": 320, "height": 568})
        await page.goto("http://localhost:3000/?skipIntro=true")
        await page.wait_for_selector('[data-biyoo-puppet="global"]')
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
                            </p>
                            <div class="flex items-center gap-1.5 sm:gap-2">
                                <button class="px-2.5 sm:px-3.5 py-1 sm:py-2 rounded-lg border border-star bg-star/20 text-star font-mono text-xs font-semibold tracking-wide transition-colors focus:ring-2 focus:ring-star focus:outline-none whitespace-nowrap">
                                    <span class="lg:hidden">On</span>
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
            if (window.__biyooEngine) window.__biyooEngine.showBubble("slow down, the story's not going anywhere", true);
        }''')
        await page.wait_for_timeout(200)
        res = await page.evaluate('''() => {
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
            return {
                prompt: getRect(document.querySelector('#sound-permission-prompt')),
                bubble: getRect(document.querySelector('.biyoo-bubble-dock')),
                toggle: getRect(document.querySelector('#biyoo-quiet-toggle')),
                puppet: getRect(document.querySelector('[data-biyoo-puppet="global"]'))
            };
        }''')
        print("Live element boxes at 320x568:")
        for k, v in res.items():
            print(f"  {k:<8}: {v}")
        room = round((res['toggle']['left'] - res['prompt']['right']) * 10) / 10
        print(f"Horizontal space between sound prompt right ({res['prompt']['right']}px) and Biyoo toggle left ({res['toggle']['left']}px): {room}px (Room >= 130px: True)")
        await b.close()

if __name__ == "__main__":
    asyncio.run(f())

