import asyncio
from playwright.async_api import async_playwright

VIEWPORTS = [
    (320, 568),
    (360, 640),
    (360, 740),
    (375, 667),
    (390, 844),
    (393, 851),
    (412, 915),
]

def intersects(r1, r2):
    if not r1 or not r2:
        return False
    no_overlap = (
        r1['right'] <= r2['left'] or
        r1['left'] >= r2['right'] or
        r1['bottom'] <= r2['top'] or
        r1['top'] >= r2['bottom']
    )
    return not no_overlap

async def check():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for w, h in VIEWPORTS:
            page = await browser.new_page(viewport={'width': w, 'height': h})
            await page.goto('http://localhost:3000', wait_until='domcontentloaded')
            await page.evaluate("() => localStorage.clear()")
            await page.reload(wait_until='domcontentloaded')
            await page.wait_for_selector('[data-testid="biyoo-live-puppet"]')

            # Force sound prompt and speech bubble visible so we measure their real boxes
            await page.evaluate('''() => {
                // Ensure sound prompt is rendered
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
                                    <button class="px-2.5 sm:px-3.5 py-1 sm:py-2 rounded-lg border border-star bg-star/20 text-star font-mono text-xs">On</button>
                                    <button class="px-2 sm:px-3.5 py-1 sm:py-2 rounded-lg border border-line bg-ink-2 text-mist font-mono text-xs">Not now</button>
                                </div>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(el);
                }

                // Ensure speech bubble is rendered
                let bubble = document.querySelector('.biyoo-bubble-dock');
                if (!bubble) {
                    const bContainer = document.querySelector('[data-testid="global-biyoo-container"]');
                    if (bContainer) {
                        const b = document.createElement('div');
                        b.className = 'biyoo-bubble-dock bg-ink/95 text-feather font-mono text-xs border border-star/50';
                        b.textContent = 'Biyoo! (System Scenario)';
                        bContainer.appendChild(b);
                    }
                }
            }''')
            await page.wait_for_timeout(300)

            data = await page.evaluate('''() => {
                const toRect = (el) => {
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
                };

                const h1 = document.querySelector('#hero-scene h1');
                const heroPs = Array.from(document.querySelectorAll('#hero-scene p'));
                const ctas = Array.from(document.querySelectorAll('#hero-scene a'));
                const scrollCue = document.querySelector('#hero-scene > div:last-child');

                const biyoo = document.querySelector('[data-testid="biyoo-live-puppet"]');
                const bubble = document.querySelector('.biyoo-bubble-dock');
                const toggle = document.querySelector('#biyoo-quiet-toggle');
                const prompt = document.querySelector('#sound-permission-prompt');

                return {
                    hero: {
                        h1: toRect(h1),
                        p1: toRect(heroPs[0]),
                        p2: toRect(heroPs[1]),
                        cta1: toRect(ctas[0]),
                        cta2: toRect(ctas[1]),
                        scrollCue: toRect(scrollCue),
                    },
                    biyooOwned: {
                        biyoo: toRect(biyoo),
                        bubble: toRect(bubble),
                        toggle: toRect(toggle),
                        prompt: toRect(prompt),
                    }
                };
            }''')

            print(f"\n=================== VIEWPORT {w}x{h} ===================")
            hero = data['hero']
            biyoo = data['biyooOwned']
            print("Hero elements:")
            for k, v in hero.items():
                print(f"  {k}: {v}")
            print("Biyoo-owned elements:")
            for k, v in biyoo.items():
                print(f"  {k}: {v}")

            collisions = []
            for bk, bv in biyoo.items():
                if not bv:
                    continue
                for hk, hv in hero.items():
                    if not hv:
                        continue
                    if intersects(bv, hv):
                        collisions.append((bk, hk, bv, hv))

            if collisions:
                print(f"COLLISIONS FOUND ({len(collisions)}):")
                for c in collisions:
                    print(f"  {c[0]} intersects {c[1]}: biyooRect={c[2]}, heroRect={c[3]}")
            else:
                print("ZERO COLLISIONS: ALL CLEAR!")

            await page.close()
        await browser.close()

if __name__ == '__main__':
    asyncio.run(check())
