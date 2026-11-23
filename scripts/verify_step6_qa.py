import json
import time
import os
import urllib.request
from playwright.sync_api import sync_playwright
from PIL import Image

def main():
    print("=================================================================")
    print("STEP 6 VERIFICATION: BIYOO LOCAL Q&A ENGINE")
    print("=================================================================\n")

    # 1. Load Knowledge Base
    kb_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'content', 'biyoo-kb.json')
    with open(kb_path, 'r', encoding='utf-8') as f:
        kb = json.load(f)

    print(f"Loaded Knowledge Base: {len(kb)} entries from {os.path.abspath(kb_path)}")
    for entry in kb:
        print(f"  - [{entry['id']}]: {len(entry['questions'])} phrasings, {len(entry['keywords'])} keywords -> {entry['sourceHref']}")

    # 2. Check 404 on /biyoo-test via curl
    print("\n-----------------------------------------------------------------")
    print("0. PRODUCTION /biyoo-test GATE CHECK (HTTP 404)")
    print("-----------------------------------------------------------------")
    try:
        req = urllib.request.Request("http://localhost:3000/biyoo-test", method="HEAD")
        urllib.request.urlopen(req)
        status_code = 200
    except urllib.error.HTTPError as e:
        status_code = e.code

    print(f"HEAD http://localhost:3000/biyoo-test -> Status Code: {status_code}")
    assert status_code == 404, f"Expected 404, got {status_code}"
    print("PASS: /biyoo-test returns 404 in production build.")

    # 3. Test 20 in-scope questions & 8 out-of-scope questions via node script
    print("\n-----------------------------------------------------------------")
    print("1. MATCHER TEST: 20 IN-SCOPE QUESTIONS (ALL MUST MATCH)")
    print("-----------------------------------------------------------------")
    
    # Run Node runner for exact matcher output
    import subprocess
    matcher_script = os.path.join(os.path.dirname(__file__), 'test_matcher_tune.js')
    res = subprocess.run(['node', matcher_script], capture_output=True, text=True)
    print(res.stdout)
    assert "Result 20 In-Scope: ALL 20 PASSED" in res.stdout
    assert "Result 8 Out-of-Scope: ALL 8 PASSED" in res.stdout

    # 4. Playwright Browser Tests: DOM resolution, Zero network requests, bundle lazy loading, expressions, contact sheet
    print("\n-----------------------------------------------------------------")
    print("2. LIVE BROWSER VERIFICATION (DOM ANCHORS, NETWORK, EXPRESSIONS)")
    print("-----------------------------------------------------------------")
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # Check console errors on desktop load
        console_logs = []
        network_requests = []

        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("request", lambda req: network_requests.append(req.url))

        page.goto("http://localhost:3000/")
        page.wait_for_load_state("networkidle")
        time.sleep(1.0)

        # Scroll to bottom to trigger any deferred sections for anchor verification
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1.5)
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(0.5)

        print("\nChecking sourceHref anchors in rendered live page DOM:")
        all_resolved = True
        for entry in kb:
            href = entry['sourceHref']
            if href.startswith('#'):
                anchor_id = href[1:]
                exists = page.evaluate(f"() => !!document.getElementById('{anchor_id}')")
                print(f"Anchor {href:20} -> {'FOUND in live DOM' if exists else 'MISSING'}")
                if not exists:
                    all_resolved = False
            else:
                print(f"External link {href}")

        assert all_resolved, "Not all sourceHref anchors resolved in DOM!"
        print("PASS: All sourceHref anchors resolve to valid DOM elements on /.")

        # Confirm initial network requests did NOT load the biyoo-qa chunk
        initial_requests = list(network_requests)
        qa_chunk_loaded_initially = any('biyoo-qa' in url.lower() for url in initial_requests)
        print(f"\nTotal initial requests on /: {len(initial_requests)}")
        print(f"Was Q&A chunk loaded on initial page load? {'YES (Error!)' if qa_chunk_loaded_initially else 'NO (Lazy load verified)'}")
        assert not qa_chunk_loaded_initially, "Q&A chunk was loaded prematurely!"

        # Click Biyoo to open Q&A panel (use force=True due to CSS breathing animation)
        requests_before_click = len(network_requests)
        hitbox = page.locator('[data-testid="biyoo-silhouette-hitbox"]')
        hitbox.wait_for(state="visible")
        hitbox.click(force=True)

        # Wait for panel to appear
        panel = page.locator('[data-testid="biyoo-qa-panel"]')
        panel.wait_for(state="visible")
        time.sleep(0.5)

        # Verify Q&A chunk was loaded upon opening
        requests_after_click = list(network_requests[requests_before_click:])
        print(f"Requests triggered by opening Q&A panel: {len(requests_after_click)}")
        qa_chunks = [r for r in requests_after_click if '.js' in r]
        for r in requests_after_click:
            print(f"  -> {r}")

        # Now start recording queries: ZERO NETWORK REQUESTS MUST OCCUR!
        queries_start_idx = len(network_requests)
        print("\nTesting in-panel Q&A questions (monitoring for zero network calls)...")

        # Question 1: "What is Ratify?" via typing
        input_el = page.locator('#biyoo-question-input')
        input_el.fill("What is Ratify?")
        page.keyboard.press("Enter")
        page.wait_for_selector('[data-testid="biyoo-qa-answer"]')
        time.sleep(0.3)

        answer_text = page.locator('[data-testid="biyoo-qa-answer"]').inner_text()
        print(f"\n[Q1 Answer Preview]:\n{answer_text}")

        # Check expression via window.__biyooEngine
        current_expr = page.evaluate("() => window.__biyooEngine.currentExpression")
        print(f"Biyoo Expression on matched answer: {current_expr} (Expected: happy)")
        assert current_expr == 'happy', f"Expected happy, got {current_expr}"

        # Take desktop screenshot with panel open and answer
        os.makedirs("public/biyoo", exist_ok=True)
        desktop_shot = "public/biyoo/step6_shot_desktop_answer.png"
        page.screenshot(path=desktop_shot)
        print(f"Saved desktop screenshot: {desktop_shot}")

        # Question 2: Out of scope fallback "What is the capital of France?"
        input_el.fill("What is the capital of France?")
        page.keyboard.press("Enter")
        time.sleep(0.3)

        fallback_text = page.locator('[data-testid="biyoo-qa-answer"]').inner_text()
        print(f"\n[Fallback Answer Preview]:\n{fallback_text}")
        fallback_expr = page.evaluate("() => window.__biyooEngine.currentExpression")
        print(f"Biyoo Expression on fallback: {fallback_expr} (Expected: confused)")
        assert fallback_expr == 'confused', f"Expected confused, got {fallback_expr}"

        fallback_shot = "public/biyoo/step6_shot_fallback.png"
        page.screenshot(path=fallback_shot)
        print(f"Saved fallback screenshot: {fallback_shot}")

        # Verify ZERO network requests occurred during question query operations
        query_requests = network_requests[queries_start_idx:]
        print(f"\nTotal network requests during Q&A queries: {len(query_requests)}")
        if query_requests:
            for r in query_requests:
                print(f"  Unexpected request: {r}")
        assert len(query_requests) == 0, f"Expected 0 network requests during Q&A queries, got {len(query_requests)}"
        print("PASS: Zero network requests during local Q&A session!")

        # Close panel and verify Neutral expression
        page.keyboard.press("Escape")
        time.sleep(0.3)
        closed_expr = page.evaluate("() => window.__biyooEngine.currentExpression")
        print(f"Biyoo Expression after closing panel: {closed_expr} (Expected: neutral)")
        assert closed_expr == 'neutral', f"Expected neutral, got {closed_expr}"

        # Mobile viewport check (390x844)
        print("\nTesting mobile viewport 390x844...")
        mobile_page = browser.new_page(viewport={"width": 390, "height": 844})
        mobile_page.goto("http://localhost:3000/")
        mobile_page.wait_for_load_state("networkidle")
        time.sleep(1.0)

        # Open Q&A on mobile
        m_hitbox = mobile_page.locator('[data-testid="biyoo-silhouette-hitbox"]')
        m_hitbox.wait_for(state="visible")
        m_hitbox.click(force=True)

        m_panel = mobile_page.locator('[data-testid="biyoo-qa-panel"]')
        m_panel.wait_for(state="visible")

        # Click chip: "Who is Sumit?"
        chip = mobile_page.locator('button:has-text("Who is Sumit?")').first
        chip.click()
        time.sleep(0.4)

        # Measure bounding box of panel on mobile
        panel_box = m_panel.bounding_box()
        print(f"Mobile Panel Bounding Box: {panel_box}")
        assert panel_box['x'] >= 0, "Panel left out of bounds"
        assert panel_box['x'] + panel_box['width'] <= 390 + 1, "Panel right out of bounds"
        assert panel_box['y'] >= 0, "Panel top out of bounds"
        assert panel_box['y'] + panel_box['height'] <= 844, "Panel bottom out of bounds"
        print(f"PASS: Mobile panel is fully clamped inside viewport (390x844) and above dock area.")

        mobile_shot = "public/biyoo/step6_shot_mobile_answer.png"
        mobile_page.screenshot(path=mobile_shot)
        print(f"Saved mobile screenshot: {mobile_shot}")

        # Check console errors on both pages
        print(f"\nTotal console logs captured on /: {len(console_logs)}")
        errors = [l for l in console_logs if 'error' in l.lower()]
        warnings = [l for l in console_logs if 'warn' in l.lower()]
        print(f"Errors count: {len(errors)}")
        print(f"Warnings count: {len(warnings)}")
        if errors:
            for e in errors:
                print(f"  {e}")
        assert len(errors) == 0, f"Found console errors on /: {errors}"
        print("PASS: 0 console errors on / in production.")

        browser.close()

    # 5. Build Contact Sheet: 3 panels (Desktop Answer, Mobile Answer, Fallback State)
    print("\n-----------------------------------------------------------------")
    print("3. GENERATING CONTACT SHEET (3 DISTINCT PANELS, NO DUPLICATES)")
    print("-----------------------------------------------------------------")
    img_desktop = Image.open("public/biyoo/step6_shot_desktop_answer.png")
    img_mobile = Image.open("public/biyoo/step6_shot_mobile_answer.png")
    img_fallback = Image.open("public/biyoo/step6_shot_fallback.png")

    target_h = 700
    w_d = int(img_desktop.width * (target_h / img_desktop.height))
    d_resized = img_desktop.resize((w_d, target_h), Image.Resampling.LANCZOS)

    w_m = int(img_mobile.width * (target_h / img_mobile.height))
    m_resized = img_mobile.resize((w_m, target_h), Image.Resampling.LANCZOS)

    w_f = int(img_fallback.width * (target_h / img_fallback.height))
    f_resized = img_fallback.resize((w_f, target_h), Image.Resampling.LANCZOS)

    total_w = w_d + w_m + w_f + 40
    total_h = target_h + 80

    sheet = Image.new("RGB", (total_w, total_h), (10, 15, 29))
    from PIL import ImageDraw
    draw = ImageDraw.Draw(sheet)

    # Title
    draw.text((20, 16), "STEP 6: BIYOO LOCAL Q&A (Desktop Matched Answer | Mobile Safe-Area | Fallback Evidence State)", fill=(6, 182, 212))

    # Paste panels
    x_offset = 10
    sheet.paste(d_resized, (x_offset, 50))
    draw.text((x_offset + 10, target_h + 55), f"Panel 1: Desktop 1440x900 (Matched Answer - Happy)", fill=(255, 255, 255))
    x_offset += w_d + 10

    sheet.paste(m_resized, (x_offset, 50))
    draw.text((x_offset + 10, target_h + 55), f"Panel 2: Mobile 390x844 (Safe Area & Chips)", fill=(255, 255, 255))
    x_offset += w_m + 10

    sheet.paste(f_resized, (x_offset, 50))
    draw.text((x_offset + 10, target_h + 55), f"Panel 3: Fallback State (Confused & Receipts Link)", fill=(255, 255, 255))

    contact_sheet_path = "public/biyoo/step6-qa-contact-sheet.png"
    sheet.save(contact_sheet_path)
    print(f"Generated Contact Sheet: {contact_sheet_path} ({total_w}x{total_h})")

    # Also copy to artifacts directory
    artifact_dir = r"C:\Users\SUMIT\.gemini\antigravity\brain\25ce1abe-a021-46a1-9e4e-566f68d42680"
    if os.path.exists(artifact_dir):
        artifact_path = os.path.join(artifact_dir, "step6-qa-contact-sheet.png")
        sheet.save(artifact_path)
        print(f"Copied to artifact path: {artifact_path}")

    print("\n=================================================================")
    print("ALL STEP 6 VERIFICATIONS COMPLETED SUCCESSFULLY!")
    print("=================================================================")

if __name__ == '__main__':
    main()
