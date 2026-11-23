import asyncio
import json
from playwright.async_api import async_playwright

VIEWPORTS = [
    {'name': '360x640', 'width': 360, 'height': 640},
    {'name': '390x844', 'width': 390, 'height': 844},
    {'name': '768x1024', 'width': 768, 'height': 1024},
    {'name': '1440x900', 'width': 1440, 'height': 900}
]

def intersects(r1, r2):
    if not r1 or not r2:
        return False
    # 2D axis-aligned overlap with 0.5px tolerance
    x_overlap = max(0, min(r1['x'] + r1['width'], r2['x'] + r2['width']) - max(r1['x'], r2['x']))
    y_overlap = max(0, min(r1['y'] + r1['height'], r2['y'] + r2['height']) - max(r1['y'], r2['y']))
    return x_overlap > 0.5 and y_overlap > 0.5

async def run_audit():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        
        for vp in VIEWPORTS:
            page = await browser.new_page(viewport={'width': vp['width'], 'height': vp['height']})
            await page.goto('http://localhost:3000', wait_until='networkidle')
            await page.wait_for_selector('[data-testid="biyoo-live-puppet"]')
            
            # Click puppet to open QA modal
            hitbox = page.locator('[data-testid="biyoo-silhouette-hitbox"]')
            await hitbox.dispatch_event('click')
            await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')
            
            # Ask a question to show answer
            input_el = page.locator('#biyoo-question-input')
            await input_el.fill('Who is Sumit?')
            await input_el.press('Enter')
            await page.wait_for_timeout(300)

            # Trigger late night to display speech bubble as well
            await page.evaluate('''() => {
                if (window.__biyooEngine) {
                    window.__biyooEngine.resetBubbleCooldown();
                    window.__biyooEngine.triggerLateNight();
                }
            }''')
            await page.wait_for_timeout(300)

            dom_data = await page.evaluate('''() => {
                const roundBox = (r) => ({
                    x: Math.round(r.x * 10) / 10,
                    y: Math.round(r.y * 10) / 10,
                    width: Math.round(r.width * 10) / 10,
                    height: Math.round(r.height * 10) / 10
                });

                const panel = document.querySelector('[data-testid="biyoo-qa-panel"]');
                const puppet = document.querySelector('[data-testid="biyoo-live-puppet"]');
                const bubble = document.querySelector('[data-testid="biyoo-speech-bubble"]') || document.querySelector('[data-testid="biyoo-bubble"]');

                // Hero and page content elements in first viewport
                const navLinks = Array.from(document.querySelectorAll('header a, nav a')).filter(el => {
                    const r = el.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 && r.top < window.innerHeight;
                }).map((el, i) => ({
                    tag: `nav_link_${i+1}`,
                    text: el.innerText.trim().replace(/\\s+/g, ' ').slice(0, 30),
                    box: roundBox(el.getBoundingClientRect()),
                    lineBoxes: []
                }));

                const ctas = Array.from(document.querySelectorAll('#hero-scene a, #hero-scene button')).filter(el => {
                    const r = el.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 && r.top < window.innerHeight;
                }).map((el, i) => ({
                    tag: `cta_${i+1}`,
                    text: el.innerText.trim().replace(/\\s+/g, ' ').slice(0, 30),
                    box: roundBox(el.getBoundingClientRect()),
                    lineBoxes: []
                }));

                const headings = Array.from(document.querySelectorAll('h1, h2, h3')).filter(el => {
                    if (el.closest('[data-testid="biyoo-qa-panel"]')) return false;
                    const r = el.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 && r.top < window.innerHeight;
                }).map((el, i) => {
                    const r = el.getBoundingClientRect();
                    const range = document.createRange();
                    range.selectNodeContents(el);
                    const lineBoxes = Array.from(range.getClientRects()).map(roundBox);
                    return {
                        tag: `heading_${el.tagName.toLowerCase()}_${i+1}`,
                        text: el.innerText.trim().replace(/\\s+/g, ' ').slice(0, 30),
                        box: roundBox(r),
                        lineBoxes
                    };
                });

                const paragraphs = Array.from(document.querySelectorAll('#hero-scene p, main p')).filter(el => {
                    if (el.closest('[data-testid="biyoo-qa-panel"]')) return false;
                    const r = el.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 && r.top < window.innerHeight;
                }).map((el, i) => {
                    const r = el.getBoundingClientRect();
                    const range = document.createRange();
                    range.selectNodeContents(el);
                    const lineBoxes = Array.from(range.getClientRects()).map(roundBox);
                    return {
                        tag: `paragraph_${i+1}`,
                        text: el.innerText.trim().replace(/\\s+/g, ' ').slice(0, 30),
                        box: roundBox(r),
                        lineBoxes
                    };
                });

                return {
                    panel: panel ? roundBox(panel.getBoundingClientRect()) : null,
                    puppet: puppet ? roundBox(puppet.getBoundingClientRect()) : null,
                    bubble: bubble ? roundBox(bubble.getBoundingClientRect()) : null,
                    pageElements: [
                        ...navLinks,
                        ...ctas,
                        ...headings,
                        ...paragraphs
                    ]
                };
            }''')

            panel_box = dom_data['panel']
            puppet_box = dom_data['puppet']
            bubble_box = dom_data['bubble']
            page_elements = dom_data['pageElements']

            print(f"\n==================================================================================")
            print(f"VIEWPORT {vp['name']} (Width: {vp['width']}, Height: {vp['height']})")
            print(f"==================================================================================")
            print(f"Biyoo Q&A Panel Box : {panel_box}")
            print(f"Biyoo Puppet Box    : {puppet_box}")
            print(f"Biyoo Bubble Box    : {bubble_box}")
            print(f"Page Elements Count : {len(page_elements)}")

            biyoo_targets = [
                ('Panel', panel_box),
                ('BiyooBox', puppet_box),
                ('Bubble', bubble_box)
            ]

            total_pairs = 0
            collisions = []

            print(f"\n{'Target':10s} | {'Page Element':24s} | {'Text / Excerpt':25s} | {'Element Box':38s} | {'Intersect'}")
            print("-" * 115)

            for b_name, b_box in biyoo_targets:
                if not b_box:
                    continue
                for elem in page_elements:
                    total_pairs += 1
                    e_box = elem['box']
                    e_lines = elem['lineBoxes']
                    e_tag = elem['tag']
                    e_text = elem['text']

                    # Check element box intersection
                    el_hit = intersects(b_box, e_box)
                    # Also check real text line rects if present
                    text_line_hit = False
                    if el_hit and e_lines:
                        for l_box in e_lines:
                            if intersects(b_box, l_box):
                                text_line_hit = True
                                break
                    elif el_hit:
                        text_line_hit = True

                    hit_status = "NO"
                    if text_line_hit:
                        hit_status = "COLLISION (Text+Box)"
                        collisions.append((b_name, b_box, e_tag, e_text, e_box, "Text+Box"))
                    elif el_hit:
                        hit_status = "BOX_ONLY (Text Clear)"
                        collisions.append((b_name, b_box, e_tag, e_text, e_box, "Box_Only"))

                    e_box_str = f"x:{e_box['x']}, y:{e_box['y']}, w:{e_box['width']}, h:{e_box['height']}"
                    print(f"{b_name:10s} | {e_tag:24s} | {e_text:25s} | {e_box_str:38s} | {hit_status}")

            print("-" * 115)
            print(f"Summary for {vp['name']}: Total Pairs Checked: {total_pairs} | Collisions: {len(collisions)}")
            if collisions:
                for b_name, b_box, e_tag, e_text, e_box, kind in collisions:
                    print(f"  [!] {b_name} collides with {e_tag} ('{e_text}') [{kind}]")

            await page.close()
        await browser.close()

if __name__ == '__main__':
    asyncio.run(run_audit())
