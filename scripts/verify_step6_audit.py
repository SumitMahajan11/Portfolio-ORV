import asyncio
import os
import shutil
from PIL import Image
from playwright.async_api import async_playwright

def intersects(b1, b2):
    if not b1 or not b2:
        return False
    # Check 2D bounding box overlap with 1px tolerance
    x_overlap = max(0, min(b1['x'] + b1['width'], b2['x'] + b2['width']) - max(b1['x'], b2['x']))
    y_overlap = max(0, min(b1['y'] + b1['height'], b2['y'] + b2['height']) - max(b1['y'], b2['y']))
    return x_overlap > 1.0 and y_overlap > 1.0

async def main():
    os.makedirs('public/biyoo', exist_ok=True)
    os.makedirs('artifacts', exist_ok=True)

    viewports = [
        {'name': '360x640', 'width': 360, 'height': 640},
        {'name': '390x844', 'width': 390, 'height': 844},
        {'name': '768x1024', 'width': 768, 'height': 1024},
        {'name': '1440x900', 'width': 1440, 'height': 900},
    ]

    requested_biyoo_assets = set()

    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # Phase 1: Network log on /
        net_page = await browser.new_page(viewport={'width': 1440, 'height': 900})
        def on_request(request):
            url = request.url
            if '/biyoo' in url or '/art/biyoo' in url:
                # extract path
                clean_path = url.split('http://localhost:3000')[-1].split('?')[0]
                requested_biyoo_assets.add(clean_path)
        net_page.on('request', on_request)
        await net_page.goto('http://localhost:3000', wait_until='networkidle')
        await net_page.wait_for_timeout(1000)
        await net_page.close()

        print("=== RUNTIME REQUESTED ASSETS ON / ===")
        for asset in sorted(requested_biyoo_assets):
            print(f"  {asset}")

        # Phase 2: Viewport collision audit
        print("\n=== VIEWPORT COLLISION AUDIT ===")
        all_collisions = {}

        for vp in viewports:
            page = await browser.new_page(viewport={'width': vp['width'], 'height': vp['height']})
            await page.goto('http://localhost:3000', wait_until='networkidle')
            await page.wait_for_timeout(1000)

            # Click Biyoo puppet hitbox
            hitbox = page.locator('[data-testid="biyoo-silhouette-hitbox"]')
            await hitbox.dispatch_event('click')
            await page.wait_for_timeout(500)

            panel = page.locator('[data-testid="biyoo-qa-panel"]')
            # Submit a question to expand answer
            input_el = page.locator('#biyoo-question-input')
            await input_el.fill('Who is Sumit?')
            await input_el.press('Enter')
            await page.wait_for_timeout(500)

            panel_box = await panel.bounding_box()
            biyoo_box = await page.locator('[data-testid="biyoo-live-puppet"]').bounding_box()
            face_locator = page.locator('[data-testid="biyoo-face-group"]')
            face_box = await face_locator.bounding_box() if await face_locator.count() > 0 else None

            # Gather all headings, paragraphs, nav links, CTAs in first viewport
            elements_to_check = []

            # Headings outside Q&A panel
            h_count = await page.locator('h1, h2, h3').count()
            for i in range(h_count):
                el = page.locator('h1, h2, h3').nth(i)
                is_inside_panel = await el.evaluate('e => !!e.closest("[data-testid=\\"biyoo-qa-panel\\"]")')
                if is_inside_panel:
                    continue
                box = await el.bounding_box()
                if box and box['y'] < vp['height'] and (box['y'] + box['height']) > 0:
                    text = (await el.text_content() or '').strip()[:20]
                    elements_to_check.append({'tag': f"Heading ({text})", 'box': box})

            # Paragraphs
            p_count = await page.locator('#hero-scene p').count()
            for i in range(p_count):
                el = page.locator('#hero-scene p').nth(i)
                box = await el.bounding_box()
                if box and box['y'] < vp['height'] and (box['y'] + box['height']) > 0:
                    text = (await el.text_content() or '').strip()[:20]
                    elements_to_check.append({'tag': f"Paragraph ({text})", 'box': box})

            # CTAs and links in hero
            cta_count = await page.locator('#hero-scene a').count()
            for i in range(cta_count):
                el = page.locator('#hero-scene a').nth(i)
                box = await el.bounding_box()
                if box and box['y'] < vp['height'] and (box['y'] + box['height']) > 0:
                    text = (await el.text_content() or '').strip()[:20]
                    elements_to_check.append({'tag': f"Hero CTA ({text})", 'box': box})

            # Header Nav links
            nav_count = await page.locator('header a').count()
            for i in range(nav_count):
                el = page.locator('header a').nth(i)
                box = await el.bounding_box()
                if box and box['y'] < vp['height'] and (box['y'] + box['height']) > 0:
                    text = (await el.text_content() or '').strip()[:20]
                    elements_to_check.append({'tag': f"Nav Link ({text})", 'box': box})

            # Pairwise checks against panel
            collisions = []
            # Check Biyoo puppet
            if intersects(panel_box, biyoo_box):
                collisions.append(('Panel', 'Biyoo Puppet Box'))
            if intersects(panel_box, face_box):
                collisions.append(('Panel', 'Biyoo Face'))

            # Check other elements
            for item in elements_to_check:
                if intersects(panel_box, item['box']):
                    collisions.append(('Panel', item['tag']))

            all_collisions[vp['name']] = {
                'panel_box': panel_box,
                'biyoo_box': biyoo_box,
                'face_box': face_box,
                'items_checked': len(elements_to_check) + 2,
                'collisions': collisions
            }

            print(f"\n--- Viewport {vp['name']} ---")
            print(f"Panel BoundingBox: {panel_box}")
            print(f"Biyoo BoundingBox: {biyoo_box}")
            print(f"Face BoundingBox: {face_box}")
            print(f"Items checked: {len(elements_to_check) + 2} | Collisions: {len(collisions)}")
            for c in collisions:
                print(f"  COLLISION: {c[0]} vs {c[1]}")

            await page.close()

        # Phase 3: Screenshots for Contact Sheet
        # Shot 1: Desktop 1440x900 with an answer showing Biyoo's face
        p_desktop = await browser.new_page(viewport={'width': 1440, 'height': 900})
        await p_desktop.goto('http://localhost:3000', wait_until='networkidle')
        await p_desktop.wait_for_timeout(1000)
        await p_desktop.locator('[data-testid="biyoo-silhouette-hitbox"]').dispatch_event('click')
        await p_desktop.wait_for_timeout(400)
        inp = p_desktop.locator('#biyoo-question-input')
        await inp.fill('Who is Sumit?')
        await inp.press('Enter')
        await p_desktop.wait_for_timeout(600)
        await p_desktop.screenshot(path='public/biyoo/shot_desktop_answer.png')
        await p_desktop.close()

        # Shot 2: Mobile 390x844 with bottom sheet
        p_mobile = await browser.new_page(viewport={'width': 390, 'height': 844})
        await p_mobile.goto('http://localhost:3000', wait_until='networkidle')
        await p_mobile.wait_for_timeout(1000)
        await p_mobile.locator('[data-testid="biyoo-silhouette-hitbox"]').dispatch_event('click')
        await p_mobile.wait_for_timeout(400)
        inp = p_mobile.locator('#biyoo-question-input')
        await inp.fill('What is Ratify?')
        await inp.press('Enter')
        await p_mobile.wait_for_timeout(600)
        await p_mobile.screenshot(path='public/biyoo/shot_mobile_sheet.png')
        await p_mobile.close()

        # Shot 3: Fallback state (desktop or mobile showing fallback)
        p_fallback = await browser.new_page(viewport={'width': 1440, 'height': 900})
        await p_fallback.goto('http://localhost:3000', wait_until='networkidle')
        await p_fallback.wait_for_timeout(1000)
        await p_fallback.locator('[data-testid="biyoo-silhouette-hitbox"]').dispatch_event('click')
        await p_fallback.wait_for_timeout(400)
        inp = p_fallback.locator('#biyoo-question-input')
        await inp.fill('what is your salary expectation?')
        await inp.press('Enter')
        await p_fallback.wait_for_timeout(600)
        await p_fallback.screenshot(path='public/biyoo/shot_fallback.png')
        await p_fallback.close()

        await browser.close()

    # Build Contact Sheet (3 columns or 1 row / grid)
    img_desk = Image.open('public/biyoo/shot_desktop_answer.png')
    img_mob = Image.open('public/biyoo/shot_mobile_sheet.png')
    img_fall = Image.open('public/biyoo/shot_fallback.png')

    # Resize desktop shots to width 720 for side-by-side layout
    d1 = img_desk.resize((720, 450), Image.Resampling.LANCZOS)
    d2 = img_fall.resize((720, 450), Image.Resampling.LANCZOS)
    # Mobile shot to height 450
    m_w = int(img_mob.width * (450 / img_mob.height))
    m1 = img_mob.resize((m_w, 450), Image.Resampling.LANCZOS)

    # Canvas width: 720 + m_w + 720 + padding
    total_w = 720 + m_w + 720 + 40
    total_h = 450 + 60

    sheet = Image.new('RGB', (total_w, total_h), (7, 14, 29))
    sheet.paste(d1, (10, 45))
    sheet.paste(m1, (740, 45))
    sheet.paste(d2, (740 + m_w + 10, 45))

    sheet.save('public/biyoo/step6-qa-contact-sheet.png')
    # Copy to artifacts directory
    art_path = 'C:/Users/SUMIT/.gemini/antigravity/brain/25ce1abe-a021-46a1-9e4e-566f68d42680/step6-qa-contact-sheet.png'
    shutil.copyfile('public/biyoo/step6-qa-contact-sheet.png', art_path)
    print("\nContact sheet created at public/biyoo/step6-qa-contact-sheet.png and copied to artifacts directory.")

if __name__ == '__main__':
    asyncio.run(main())

