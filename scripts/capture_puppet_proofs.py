import os
import time
from playwright.sync_api import sync_playwright

os.makedirs('public/biyoo/proofs', exist_ok=True)

PRESETS = [
    'neutral',
    'happy',
    'excited',
    'surprised',
    'sad',
    'confused',
    'sleepy',
    'sleeping',
    'curious',
    'blink',
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1600, 'height': 1200}, device_scale_factor=2)

    print('Loading http://localhost:3000/biyoo-test...')
    page.goto('http://localhost:3000/biyoo-test', wait_until='networkidle')
    time.sleep(1.5)

    # 1. Full-page overview screenshot
    page.screenshot(path='public/biyoo/proofs/01-testbench-overview.png', full_page=True)
    print('Captured 01-testbench-overview.png')

    # 2. Capture the comparison gallery grid
    gallery_section = page.locator('section')
    gallery_section.scroll_into_view_if_needed()
    time.sleep(0.5)
    gallery_section.screenshot(path='public/biyoo/proofs/02-gallery-10-presets.png')
    print('Captured 02-gallery-10-presets.png')

    # 3. Capture each individual comparison card (side-by-side with reference cell)
    for i, preset in enumerate(PRESETS, start=1):
        card = page.locator(f'[data-testid="compare-card-{preset}"]')
        card.scroll_into_view_if_needed()
        time.sleep(0.2)
        card_path = f'public/biyoo/proofs/compare-{i:02d}-{preset}.png'
        card.screenshot(path=card_path)
        print(f'Captured {card_path}')

    # 4. Scroll back to puppet stage for interactive testing & preset stage captures
    stage = page.locator('[data-testid="puppet-stage"]')
    stage.scroll_into_view_if_needed()
    time.sleep(0.3)

    for i, preset in enumerate(PRESETS, start=1):
        btn = page.locator(f'[data-testid="preset-btn-{preset}"]')
        btn.click()
        time.sleep(0.4)  # wait for 320ms transition to finish
        stage_path = f'public/biyoo/proofs/stage-{i:02d}-{preset}.png'
        stage.screenshot(path=stage_path)
        print(f'Captured {stage_path}')

    # 5. Test pupil look-at tracking (switch to neutral so open eyes track)
    page.locator('[data-testid="preset-btn-neutral"]').click()
    time.sleep(0.4)

    box = stage.bounding_box()
    if box:
        # Drag to top-right
        page.mouse.move(box['x'] + box['width'] * 0.85, box['y'] + box['height'] * 0.15)
        page.mouse.down()
        time.sleep(0.3)
        stage.screenshot(path='public/biyoo/proofs/look-top-right.png')
        print('Captured look-top-right.png')

        # Drag to bottom-left
        page.mouse.move(box['x'] + box['width'] * 0.15, box['y'] + box['height'] * 0.85)
        time.sleep(0.3)
        page.mouse.up()
        stage.screenshot(path='public/biyoo/proofs/look-bottom-left.png')
        print('Captured look-bottom-left.png')

    # Reset look center
    page.locator('[data-testid="reset-look-btn"]').click()
    time.sleep(0.3)

    # 6. Test blink trigger
    blink_btn = page.locator('[data-testid="blink-btn"]')
    blink_btn.click()
    time.sleep(0.08)  # capture while eyes are mid-blink slit
    stage.screenshot(path='public/biyoo/proofs/blink-in-action.png')
    print('Captured blink-in-action.png')

    browser.close()

print('All proofs captured successfully!')
