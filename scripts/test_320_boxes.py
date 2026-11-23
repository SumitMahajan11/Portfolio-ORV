import asyncio
from playwright.async_api import async_playwright

BUBBLE_STRINGS = [
    "edge orchestration at scale!",
    "distributed consensus is tricky, huh?",
    "formal verification keeps things airtight",
    "reading this part closely, huh?",
    "hey... still there?",
    "...getting sleepy",
    "oh! you're back",
    "why are we both awake?",
    "you're back",
    "third time? I'm flattered",
    "slow down, the story's not going anywhere",
    "that one's good",
    "you skipped the story?"
]

async def check():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 320, "height": 568})
        await page.goto("http://localhost:3000/?skipIntro=true")
        await page.wait_for_selector('[data-biyoo-puppet="global"]')
        
        # Ensure sound prompt is rendered
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
                                <button class="px-2.5 sm:px-3.5 py-1 sm:py-2 rounded-lg border border-star bg-star/20 text-star font-mono text-xs">On</button>
                                <button class="px-2 sm:px-3.5 py-1 sm:py-2 rounded-lg border border-line bg-ink-2 text-mist font-mono text-xs">Not now</button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(el);
            }
        }''')
        
        # Test each string with 130px max-width and line-clamp 3
        for text in BUBBLE_STRINGS:
            res = await page.evaluate('''(t) => {
                const existing = document.getElementById('test-bubble-override');
                if (!existing) {
                    const style = document.createElement('style');
                    style.id = 'test-bubble-override';
                    style.textContent = `
                        @media (max-width: 359px) {
                            .biyoo-bubble-dock {
                                max-width: 130px !important;
                                top: auto !important;
                                bottom: 2px !important;
                                right: calc(100% + 28px) !important;
                                padding: 3px 6px !important;
                                border-radius: 10px !important;
                            }
                            .biyoo-bubble-dock span {
                                -webkit-line-clamp: 3 !important;
                                max-width: 105px !important;
                            }
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                if (window.__biyooEngine && typeof window.__biyooEngine.showBubble === 'function') {
                    window.__biyooEngine.showBubble(t, true);
                }
                
                const bubble = document.querySelector('.biyoo-bubble-dock');
                const span = document.querySelector('.biyoo-bubble-dock span');
                const prompt = document.querySelector('#sound-permission-prompt');
                const toggle = document.querySelector('#biyoo-quiet-toggle');
                const puppet = document.querySelector('[data-biyoo-puppet="global"]');
                
                function intersects(r1, r2) {
                    if (!r1 || !r2) return false;
                    return !(r1.right <= r2.left || r1.left >= r2.right || r1.bottom <= r2.top || r1.top >= r2.bottom);
                }
                
                function getRect(el) {
                    if (!el) return null;
                    const r = el.getBoundingClientRect();
                    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
                }
                
                const br = getRect(bubble);
                const pr = getRect(prompt);
                const tr = getRect(toggle);
                const pur = getRect(puppet);
                
                return {
                    text: t,
                    truncated: span ? span.scrollHeight > span.clientHeight : false,
                    scrollHeight: span ? span.scrollHeight : 0,
                    clientHeight: span ? span.clientHeight : 0,
                    bubbleRect: br,
                    hitPrompt: intersects(br, pr),
                    hitToggle: intersects(br, tr),
                    hitPuppet: intersects(br, pur),
                    inViewport: br ? (br.left >= 0 && br.top >= 0 && br.right <= 320 && br.bottom <= 568) : false
                };
            }''', text)
            print(f"[{len(text):2d}] {text[:35]:<35} | trunc: {res['truncated']} ({res['clientHeight']}/{res['scrollHeight']}) | hitP: {res['hitPrompt']} | hitT: {res['hitToggle']} | inVP: {res['inViewport']} | left: {res['bubbleRect']['left'] if res['bubbleRect'] else None}")
            
        await page.close()
        await browser.close()

if __name__ == "__main__":
    asyncio.run(check())
