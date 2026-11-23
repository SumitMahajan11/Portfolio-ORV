import os
import time
import shutil
from playwright.sync_api import sync_playwright
from PIL import Image

BRAIN_DIR = r'C:\Users\SUMIT\.gemini\antigravity\brain\25ce1abe-a021-46a1-9e4e-566f68d42680'

SHEET_OUT_PATHS = [
    'public/biyoo/contact-sheet.png',
    'public/biyoo/biyoo-expressions-contact-sheet.png',
    'artwork/biyoo/contact-sheet.png',
    os.path.join(BRAIN_DIR, 'contact-sheet.png'),
]

CROP_OUT_PATHS = [
    'public/biyoo/neutral-surprised-curious-sad.png',
    'public/biyoo/patch-proof-side-by-side.png',
    'artwork/biyoo/neutral-surprised-curious-sad.png',
    'artwork/biyoo/patch-proof-side-by-side.png',
    os.path.join(BRAIN_DIR, 'neutral-surprised-curious-sad.png'),
]

for p in SHEET_OUT_PATHS + CROP_OUT_PATHS:
    os.makedirs(os.path.dirname(p), exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1600, 'height': 3800}, device_scale_factor=2)
    
    print('Loading http://localhost:3000/biyoo-test...')
    page.goto('http://localhost:3000/biyoo-test', wait_until='networkidle')
    time.sleep(2.0)
    
    # 1. Full labelled 3x3 contact sheet
    sheet = page.locator('[data-testid="biyoo-contact-sheet-3x3"]')
    sheet.scroll_into_view_if_needed()
    time.sleep(1.0)
    sheet_primary = SHEET_OUT_PATHS[0]
    sheet.screenshot(path=sheet_primary)
    print(f'Captured full 3x3 contact sheet to {sheet_primary}')
    
    # 2. Crop containing Neutral, Surprised, Curious, Sad side-by-side
    crop = page.locator('[data-testid="four-expressions-side-by-side"]')
    crop.scroll_into_view_if_needed()
    time.sleep(1.0)
    crop_primary = CROP_OUT_PATHS[0]
    crop.screenshot(path=crop_primary)
    print(f'Captured 4-expression side-by-side crop to {crop_primary}')
    
    browser.close()

# Copy to all destination paths
for dest in SHEET_OUT_PATHS[1:]:
    shutil.copyfile(sheet_primary, dest)
    print(f'Copied contact sheet to {dest}')

for dest in CROP_OUT_PATHS[1:]:
    shutil.copyfile(crop_primary, dest)
    print(f'Copied crop to {dest}')

im_sheet = Image.open(sheet_primary)
im_crop = Image.open(crop_primary)
print(f'Contact Sheet size: {im_sheet.size}')
print(f'Side-by-side Crop size: {im_crop.size}')
