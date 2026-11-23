import asyncio
from playwright.async_api import async_playwright

BUBBLE_STRINGS = [
    {"id": 1, "text": "edge orchestration at scale!"},
    {"id": 2, "text": "distributed consensus is tricky, huh?"},
    {"id": 3, "text": "formal verification active!"},  # <= 28 chars candidate
    {"id": 4, "text": "reading this part closely, huh?"},
    {"id": 5, "text": "hey... still there?"},
    {"id": 6, "text": "...getting sleepy"},
    {"id": 7, "text": "oh! you're back"},
    {"id": 8, "text": "why are we both awake?"},
    {"id": 9, "text": "you're back"},
    {"id": 10, "text": "third time? I'm flattered"},
    {"id": 11, "text": "slow down, the story's not going anywhere"},
    {"id": 12, "text": "that one's good"},
    {"id": 13, "text": "you skipped the story?"}
]

VIEWPORTS = [
    (320, 568),
    (360, 640),
    (360, 740),
    (375, 667),
    (390, 844),
    (412, 915),
    (1440, 900)
]

async def check():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for w, h in VIEWPORTS:
            page = await browser.new_page(viewport={"width": w, "height": h})
            await page.goto("http://localhost:3000/?skipIntro=true")
            await page.wait_for_selector('[data-biyoo-puppet="global"]')
            
            # Inject candidate CSS
            await page.evaluate('''([vw, vh]) => {
                const style = document.createElement('style');
                style.id = 'candidate-bubble-css';
                style.textContent = `
                    /* Clamped to 3 lines */
                    .biyoo-bubble-dock span {
                        -webkit-line-clamp: 3 !important;
                    }
                    
                    /* Phone >=360 and >=700: shift up to top: -6px to keep >=17px gap from sound prompt */
                    @media (min-width: 360px) and (max-width: 767px) and (min-height: 700px) {
                        .biyoo-bubble-dock {
                            top: -6px !important;
                            max-width: 140px !important;
                        }
                    }
                    
                    /* Short phones <700: bottom 34px to clear toggle */
                    @media (max-width: 767px) and (max-height: 699px) {
                        .biyoo-bubble-dock {
                            bottom: 34px !important;
                            max-width: 130px !important;
                        }
                    }
                    
                    /* Narrow phones <=359: max-width 130px, bottom 2px, right calc(100% + 28px) */
                    @media (max-width: 359px) {
                        .biyoo-bubble-dock {
                            max-width: 130px !important;
                            top: auto !important;
                            bottom: 2px !important;
                            right: calc(100% + 28px) !important;
                            padding: 2px 4px !important;
                            font-size: 10px !important;
                            line-height: 1.15 !important;
                        }
                        .biyoo-bubble-dock span {
                            font-size: 10px !important;
                            line-height: 1.15 !important;
                        }
                    }
                `;
                document.head.appendChild(style);
                
                // Sound prompt
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
            }''', [w, h])
            await page.wait_for_timeout(300)
            
            print(f"\n=================== Viewport {w}x{h} ===================")
            for item in BUBBLE_STRINGS:
                t = item["text"]
                # Show bubble
                await page.evaluate('''(msg) => {
                    if (window.__biyooEngine && typeof window.__biyooEngine.showBubble === 'function') {
                        window.__biyooEngine.showBubble(msg, true);
                    }
                }''', t)
                await page.wait_for_timeout(150)
                
                res = await page.evaluate('''([vw, vh]) => {
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
                        return { left: Math.round(r.left*10)/10, top: Math.round(r.top*10)/10, right: Math.round(r.right*10)/10, bottom: Math.round(r.bottom*10)/10, width: Math.round(r.width*10)/10, height: Math.round(r.height*10)/10 };
                    }
                    
                    const br = getRect(bubble);
                    const pr = getRect(prompt);
                    const tr = getRect(toggle);
                    const pur = getRect(puppet);
                    
                    // Count intersections with hero elements
                    let heroIntersections = 0;
                    const hero = document.getElementById('hero-scene');
                    if (hero && br) {
                        const heroElements = hero.querySelectorAll('h1, p, a, button');
                        for (const el of heroElements) {
                            const er = getRect(el);
                            if (intersects(br, er)) heroIntersections++;
                        }
                    }
                    
                    const hitPrompt = intersects(br, pr);
                    const hitToggle = intersects(br, tr);
                    const hitPuppet = intersects(br, pur);
                    const inVp = br ? (br.left >= 0 && br.top >= 0 && br.right <= vw && br.bottom <= vh) : false;
                    
                    // Vertical gap from sound prompt
                    let vGap = null;
                    if (br && pr) {
                        vGap = Math.round((pr.top - br.bottom) * 10) / 10;
                    }
                    
                    const cs = span ? window.getComputedStyle(span) : null;
                    const lh = cs ? parseFloat(cs.lineHeight) : 16;
                    const renderedLines = span ? Math.round(span.clientHeight / lh) : 0;
                    const totalLines = span ? Math.round(span.scrollHeight / lh) : 0;
                    const isTrunc = span ? (span.scrollHeight > span.clientHeight + 1) : false;
                    
                    return {
                        isTrunc,
                        renderedLines,
                        totalLines,
                        clientHeight: span ? span.clientHeight : 0,
                        scrollHeight: span ? span.scrollHeight : 0,
                        br,
                        hitPrompt,
                        hitToggle,
                        hitPuppet,
                        heroIntersections,
                        inVp,
                        vGap
                    };
                }''', [w, h])
                
                print(f"[{item['id']:2d}] len={len(t):2d} '{t[:30]:<30}' | lines={res['renderedLines']}/{res['totalLines']} (cH={res['clientHeight']},sH={res['scrollHeight']}) trunc={res['isTrunc']} | hitP={res['hitPrompt']} hitT={res['hitToggle']} hitB={res['hitPuppet']} heroInt={res['heroIntersections']} inVp={res['inVp']} vGap={res['vGap']} | rect={res['br']}")
                
            await page.close()
        await browser.close()

if __name__ == "__main__":
    asyncio.run(check())

