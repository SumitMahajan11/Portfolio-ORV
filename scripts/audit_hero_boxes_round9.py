import asyncio
import json
from playwright.async_api import async_playwright

VIEWPORTS = [
    (320, 568),
    (360, 640),
    (360, 740),
    (360, 800),
    (375, 667),
    (390, 844),
    (393, 851),
    (412, 915)
]

def intersects(b1, b2):
    return not (b1['right'] <= b2['left'] or 
                b1['left'] >= b2['right'] or 
                b1['bottom'] <= b2['top'] or 
                b1['top'] >= b2['bottom'])

async def audit_boxes():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for w, h in VIEWPORTS:
            page = await browser.new_page(viewport={'width': w, 'height': h})
            # Clear localStorage so sound prompt is shown
            await page.add_init_script('''() => {
                try {
                    localStorage.clear();
                    sessionStorage.clear();
                } catch(e) {}
            }''')
            await page.goto('http://localhost:3000/?skipIntro=true')
            # Wait for sound prompt (triggers at 4500ms)
            await page.wait_for_selector('#sound-permission-prompt', timeout=6000)
            
            # Show bubble using showBubble
            await page.evaluate('''() => {
                if (window.__biyooEngine && typeof window.__biyooEngine.showBubble === 'function') {
                    window.__biyooEngine.showBubble('Testing bubble alignment across viewports.', true);
                }
            }''')
            await page.wait_for_timeout(400)
            
            data = await page.evaluate('''([vw, vh]) => {
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
                
                const hero = document.getElementById('hero-scene');
                const h1 = hero ? hero.querySelector('h1') : null;
                const ps = hero ? Array.from(hero.querySelectorAll('p')) : [];
                const ctas = hero ? Array.from(hero.querySelectorAll('a[data-biyoo-point]')) : [];
                const scrollCue = hero ? hero.querySelector('.animate-bounce') || hero.querySelector('svg.animate-bounce')?.parentElement?.parentElement : null;
                
                const biyoo = document.querySelector('[data-biyoo-puppet="global"]') || document.querySelector('.biyoo-puppet-dock');
                const bubble = document.querySelector('.biyoo-bubble-dock');
                const toggle = document.getElementById('biyoo-quiet-toggle');
                const prompt = document.getElementById('sound-permission-prompt');
                
                return {
                    vw, vh,
                    hero: {
                        h1: getRect(h1),
                        p1: ps[0] ? getRect(ps[0]) : null,
                        p2: ps[1] ? getRect(ps[1]) : null,
                        cta1: ctas[0] ? getRect(ctas[0]) : null,
                        cta2: ctas[1] ? getRect(ctas[1]) : null,
                        scrollCue: getRect(scrollCue)
                    },
                    biyooOwned: {
                        biyoo: getRect(biyoo),
                        bubble: getRect(bubble),
                        toggle: getRect(toggle),
                        prompt: getRect(prompt)
                    }
                };
            }''', [w, h])
            
            print(f"=================== VIEWPORT {w}x{h} ===================")
            print("Hero elements:")
            for name, box in data['hero'].items():
                print(f"  {name}: {box}")
                
            print("Biyoo-owned elements:")
            for name, box in data['biyooOwned'].items():
                print(f"  {name}: {box}")
                
            all_boxes = {}
            for k, v in data['hero'].items():
                if v: all_boxes[f"hero.{k}"] = v
            for k, v in data['biyooOwned'].items():
                if v: all_boxes[f"biyoo.{k}"] = v
                
            print("Overflow checks:")
            overflow_count = 0
            for name, box in all_boxes.items():
                if box['bottom'] > h:
                    overflow_count += 1
                    diff = round(box['bottom'] - h, 1)
                    print(f"  {name} extends past viewport bottom by {diff}px (bottom={box['bottom']}, vh={h})")
            if overflow_count == 0:
                print("  No elements extend past viewport bottom.")
                
            print("Intersection audit (Hero vs Biyoo-owned, unclipped boxes):")
            collisions = []
            for b_name, b_box in data['biyooOwned'].items():
                if not b_box: continue
                for h_name, h_box in data['hero'].items():
                    if not h_box: continue
                    if intersects(b_box, h_box):
                        collisions.append((f"biyoo.{b_name}", f"hero.{h_name}", b_box, h_box))
                        
            b_items = list(data['biyooOwned'].items())
            for i in range(len(b_items)):
                name_a, box_a = b_items[i]
                if not box_a: continue
                for j in range(i + 1, len(b_items)):
                    name_b, box_b = b_items[j]
                    if not box_b: continue
                    if intersects(box_a, box_b):
                        collisions.append((f"biyoo.{name_a}", f"biyoo.{name_b}", box_a, box_b))
                        
            print(f"Total intersection count: {len(collisions)}")
            for c in collisions:
                print(f"  COLLISION: {c[0]} intersects {c[1]}")
                print(f"    box1: {c[2]}")
                print(f"    box2: {c[3]}")
                
            await page.close()
        await browser.close()

asyncio.run(audit_boxes())
