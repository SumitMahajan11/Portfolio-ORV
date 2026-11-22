import asyncio
import os
import shutil
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFont

ARTIFACT_DIR = r"C:\Users\SUMIT\.gemini\antigravity\brain\25ce1abe-a021-46a1-9e4e-566f68d42680"
PUBLIC_DIR = r"d:\Projects\Portfolio-ORV-main\public\biyoo"

async def capture_and_export():
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        
        # 1. Desktop with answered state ("Who is Sumit?") + Biyoo face visible
        page_desk = await browser.new_page(viewport={'width': 1440, 'height': 900})
        await page_desk.goto('http://localhost:3000', wait_until='networkidle')
        await page_desk.wait_for_selector('[data-testid="biyoo-live-puppet"]')
        hitbox = page_desk.locator('[data-testid="biyoo-silhouette-hitbox"]')
        await hitbox.dispatch_event('click')
        await page_desk.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        input_el = page_desk.locator('#biyoo-question-input')
        await input_el.fill('Who is Sumit?')
        await input_el.press('Enter')
        await page_desk.wait_for_selector('[data-testid="biyoo-qa-answer"]')
        await page_desk.wait_for_timeout(400)
        desk_path = os.path.join(PUBLIC_DIR, "step6-panel-desktop-answer.png")
        await page_desk.screenshot(path=desk_path)
        await page_desk.close()
        
        # 2. Mobile (360x640) with panel open
        page_360 = await browser.new_page(viewport={'width': 360, 'height': 640})
        await page_360.goto('http://localhost:3000', wait_until='networkidle')
        await page_360.wait_for_selector('[data-testid="biyoo-live-puppet"]')
        hitbox_360 = page_360.locator('[data-testid="biyoo-silhouette-hitbox"]')
        await hitbox_360.dispatch_event('click')
        await page_360.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        input_360 = page_360.locator('#biyoo-question-input')
        await input_360.fill('What is Ratify?')
        await input_360.press('Enter')
        await page_360.wait_for_selector('[data-testid="biyoo-qa-answer"]')
        await page_360.wait_for_timeout(400)
        path_360 = os.path.join(PUBLIC_DIR, "step6-panel-360x640.png")
        await page_360.screenshot(path=path_360)
        await page_360.close()

        # 3. Mobile (390x844) with panel open
        page_390 = await browser.new_page(viewport={'width': 390, 'height': 844})
        await page_390.goto('http://localhost:3000', wait_until='networkidle')
        await page_390.wait_for_selector('[data-testid="biyoo-live-puppet"]')
        hitbox_390 = page_390.locator('[data-testid="biyoo-silhouette-hitbox"]')
        await hitbox_390.dispatch_event('click')
        await page_390.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        input_390 = page_390.locator('#biyoo-question-input')
        await input_390.fill('What is Ratify?')
        await input_390.press('Enter')
        await page_390.wait_for_selector('[data-testid="biyoo-qa-answer"]')
        await page_390.wait_for_timeout(400)
        path_390 = os.path.join(PUBLIC_DIR, "step6-panel-390x844.png")
        await page_390.screenshot(path=path_390)
        await page_390.close()
        
        # 4. Fallback state ("No Direct Receipt")
        page_fb = await browser.new_page(viewport={'width': 1440, 'height': 900})
        await page_fb.goto('http://localhost:3000', wait_until='networkidle')
        await page_fb.wait_for_selector('[data-testid="biyoo-live-puppet"]')
        hitbox_fb = page_fb.locator('[data-testid="biyoo-silhouette-hitbox"]')
        await hitbox_fb.dispatch_event('click')
        await page_fb.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        input_fb = page_fb.locator('#biyoo-question-input')
        await input_fb.fill('what is his salary at Ratify?')
        await input_fb.press('Enter')
        await page_fb.wait_for_selector('[data-testid="biyoo-qa-answer"]')
        await page_fb.wait_for_timeout(400)
        fb_path = os.path.join(PUBLIC_DIR, "step6-panel-fallback.png")
        await page_fb.screenshot(path=fb_path)
        await page_fb.close()
        
        await browser.close()
        
    print("Generating 4-panel contact sheet...")
    img_desk = Image.open(desk_path)
    img_360 = Image.open(path_360)
    img_390 = Image.open(path_390)
    img_fb = Image.open(fb_path)
    
    # Scale to uniform heights for contact sheet
    target_h = 600
    w_desk = int(img_desk.width * (target_h / img_desk.height))
    desk_resized = img_desk.resize((w_desk, target_h), Image.Resampling.LANCZOS)
    
    w_360 = int(img_360.width * (target_h / img_360.height))
    resized_360 = img_360.resize((w_360, target_h), Image.Resampling.LANCZOS)

    w_390 = int(img_390.width * (target_h / img_390.height))
    resized_390 = img_390.resize((w_390, target_h), Image.Resampling.LANCZOS)
    
    w_fb = int(img_fb.width * (target_h / img_fb.height))
    fb_resized = img_fb.resize((w_fb, target_h), Image.Resampling.LANCZOS)
    
    pad = 16
    header_h = 50
    total_w = w_desk + w_360 + w_390 + w_fb + pad * 5
    total_h = target_h + header_h + pad * 2
    
    sheet = Image.new("RGBA", (total_w, total_h), (8, 12, 20, 255))
    draw = ImageDraw.Draw(sheet)
    
    # Title
    draw.text((pad, 14), "STEP 6 ROUND 3: BIYOO LOCAL Q&A (1. DESKTOP ANSWER | 2. 360x640 SHEET | 3. 390x844 SHEET | 4. FALLBACK RECEIPT)", fill=(94, 225, 230, 255))
    
    # Paste panels
    x_offset = pad
    
    # Panel 1: Desktop Answer
    sheet.paste(desk_resized, (x_offset, header_h))
    draw.rectangle([x_offset, header_h, x_offset + w_desk, header_h + target_h], outline=(94, 225, 230, 180), width=2)
    draw.text((x_offset + 10, header_h + 10), "1. Desktop (1440x900) - Answered ('Who is Sumit?')", fill=(255, 255, 255, 220))
    x_offset += w_desk + pad

    # Panel 2: 360x640 Panel Open
    sheet.paste(resized_360, (x_offset, header_h))
    draw.rectangle([x_offset, header_h, x_offset + w_360, header_h + target_h], outline=(94, 225, 230, 180), width=2)
    draw.text((x_offset + 10, header_h + 10), "2. Mobile (360x640) - Panel Open", fill=(255, 255, 255, 220))
    x_offset += w_360 + pad
    
    # Panel 3: 390x844 Panel Open
    sheet.paste(resized_390, (x_offset, header_h))
    draw.rectangle([x_offset, header_h, x_offset + w_390, header_h + target_h], outline=(94, 225, 230, 180), width=2)
    draw.text((x_offset + 10, header_h + 10), "3. Mobile (390x844) - Panel Open", fill=(255, 255, 255, 220))
    x_offset += w_390 + pad
    
    # Panel 4: Fallback State
    sheet.paste(fb_resized, (x_offset, header_h))
    draw.rectangle([x_offset, header_h, x_offset + w_fb, header_h + target_h], outline=(245, 158, 11, 180), width=2)
    draw.text((x_offset + 10, header_h + 10), "4. Fallback State ('No Direct Receipt')", fill=(245, 158, 11, 240))
    
    contact_path = os.path.join(PUBLIC_DIR, "step6-qa-contact-sheet.png")
    sheet.save(contact_path, "PNG")
    shutil.copy(contact_path, os.path.join(ARTIFACT_DIR, "step6-qa-contact-sheet.png"))
    print(f"Contact sheet saved to {contact_path} and copied to artifact directory.")

if __name__ == '__main__':
    asyncio.run(capture_and_export())
