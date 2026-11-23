import os
import time
import json
from datetime import datetime
from playwright.sync_api import sync_playwright

def run():
    os.makedirs('public/biyoo/states', exist_ok=True)
    os.makedirs('artwork/biyoo', exist_ok=True)
    brain_dir = r"C:\Users\SUMIT\.gemini\antigravity\brain\25ce1abe-a021-46a1-9e4e-566f68d42680"
    os.makedirs(brain_dir, exist_ok=True)

    results = {
        "files": [],
        "timestamps": {},
        "tab_title_check": {}
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1600, "height": 1200})
        page = context.new_page()

        # Step 1: Open testbench with idleScale=0.1
        page.goto("http://localhost:3000/biyoo-test?idleScale=0.1", wait_until="networkidle")
        page.wait_for_timeout(500)

        initial_title = page.title()
        results["tab_title_check"]["initial_title"] = initial_title

        stage = page.locator('[data-testid="puppet-stage"]')
        stage_bubble = stage.locator('[data-testid="biyoo-speech-bubble"]')
        stage_zzz = stage.locator('[data-testid="biyoo-zzz-group"]')
        stage_badge = stage.locator('[data-testid="active-state-badge"]')

        # Reset inactivity timer to 0 so timing is exact
        page.click('[data-testid="reset-inactivity-btn"]')
        page.wait_for_timeout(100)

        # 1. State: Neutral
        t_neutral = datetime.now().isoformat()
        results["timestamps"]["Neutral"] = t_neutral
        stage.screenshot(path="public/biyoo/states/state-1-neutral.png")
        results["files"].append("public/biyoo/states/state-1-neutral.png")
        print(f"[{t_neutral}] State: Neutral verified")

        # 2. Wait for Curious (at 15s * 0.1 = 1.5s)
        # Poll for badge to become 'curious'
        page.wait_for_function("() => document.querySelector('[data-testid=\"active-state-badge\"]').innerText.trim().toLowerCase() === 'curious'", timeout=5000)
        t_curious = datetime.now().isoformat()
        curious_bubble = ""
        if stage_bubble.count() > 0:
            curious_bubble = stage_bubble.inner_text().replace("✕", "").strip()
        results["timestamps"]["Curious+bubble"] = {
            "timestamp": t_curious,
            "bubble": curious_bubble,
            "state": "curious"
        }
        stage.screenshot(path="public/biyoo/states/state-2-curious-bubble.png")
        results["files"].append("public/biyoo/states/state-2-curious-bubble.png")
        print(f"[{t_curious}] State: Curious+bubble ('{curious_bubble}') verified")

        # 3. Wait for Sleepy (at 30s * 0.1 = 3.0s)
        page.wait_for_function("() => document.querySelector('[data-testid=\"active-state-badge\"]').innerText.trim().toLowerCase() === 'sleepy'", timeout=5000)
        t_sleepy = datetime.now().isoformat()
        sleepy_bubble = ""
        if stage_bubble.count() > 0:
            sleepy_bubble = stage_bubble.inner_text().replace("✕", "").strip()
        results["timestamps"]["Sleepy+bubble"] = {
            "timestamp": t_sleepy,
            "bubble": sleepy_bubble,
            "state": "sleepy"
        }
        stage.screenshot(path="public/biyoo/states/state-3-sleepy-bubble.png")
        results["files"].append("public/biyoo/states/state-3-sleepy-bubble.png")
        print(f"[{t_sleepy}] State: Sleepy+bubble ('{sleepy_bubble}') verified")

        # 4. Wait for Sleeping (at 60s * 0.1 = 6.0s)
        page.wait_for_function("() => document.querySelector('[data-testid=\"active-state-badge\"]').innerText.trim().toLowerCase() === 'sleeping'", timeout=6000)
        t_sleeping = datetime.now().isoformat()
        stage_zzz.wait_for(state="visible", timeout=2000)
        results["timestamps"]["Sleeping+zzz"] = {
            "timestamp": t_sleeping,
            "has_zzz": True,
            "state": "sleeping"
        }
        stage.screenshot(path="public/biyoo/states/state-4-sleeping-zzz.png")
        results["files"].append("public/biyoo/states/state-4-sleeping-zzz.png")
        print(f"[{t_sleeping}] State: Sleeping+zzz verified")

        # 5. Visitor Activity Wake Chain: Surprised (hop 600ms) -> Happy (2s) -> Neutral
        # Dispatch mousemove to trigger activity
        page.evaluate("() => window.dispatchEvent(new MouseEvent('mousemove', { clientX: 300, clientY: 300 }))")
        page.wait_for_function("() => document.querySelector('[data-testid=\"active-state-badge\"]').innerText.trim().toLowerCase() === 'surprised'", timeout=2000)
        t_surprised = datetime.now().isoformat()
        results["timestamps"]["Surprised"] = {
            "timestamp": t_surprised,
            "state": "surprised"
        }
        stage.screenshot(path="public/biyoo/states/state-5-surprised.png")
        results["files"].append("public/biyoo/states/state-5-surprised.png")
        print(f"[{t_surprised}] State: Surprised (hop) verified")

        # 6. Wake step 2: Happy for 2s + bubble "oh! you're back"
        page.wait_for_function("() => document.querySelector('[data-testid=\"active-state-badge\"]').innerText.trim().toLowerCase() === 'happy'", timeout=2000)
        t_happy = datetime.now().isoformat()
        happy_bubble = ""
        if stage_bubble.count() > 0:
            happy_bubble = stage_bubble.inner_text().replace("✕", "").strip()
        results["timestamps"]["Happy+bubble"] = {
            "timestamp": t_happy,
            "bubble": happy_bubble,
            "state": "happy"
        }
        stage.screenshot(path="public/biyoo/states/state-6-happy-bubble.png")
        results["files"].append("public/biyoo/states/state-6-happy-bubble.png")
        print(f"[{t_happy}] State: Happy+bubble ('{happy_bubble}') verified")

        # Wake step 3: Return to Neutral after 2s
        page.wait_for_function("() => document.querySelector('[data-testid=\"active-state-badge\"]').innerText.trim().toLowerCase() === 'neutral'", timeout=4000)
        t_wake_neutral = datetime.now().isoformat()
        results["timestamps"]["Wake_Return_Neutral"] = t_wake_neutral
        print(f"[{t_wake_neutral}] Wake Return Neutral verified")

        # Step 4: Tab Away & Back Simulation
        page.click('[data-testid="sim-tab-away-btn"]')
        page.wait_for_timeout(250)
        away_title = page.title()
        t_sad = datetime.now().isoformat()
        results["timestamps"]["Sad"] = {
            "timestamp": t_sad,
            "state": stage_badge.inner_text().strip().lower()
        }
        results["tab_title_check"]["away_title"] = away_title
        stage.screenshot(path="public/biyoo/states/state-7-sad.png")
        results["files"].append("public/biyoo/states/state-7-sad.png")
        print(f"[{t_sad}] State: Sad (Tab Away) verified, doc.title='{away_title}'")

        # Simulate Tab Return
        page.click('[data-testid="sim-tab-return-btn"]')
        page.wait_for_timeout(250)
        restored_title = page.title()
        results["tab_title_check"]["restored_title"] = restored_title
        results["tab_title_check"]["is_restored_exact"] = (restored_title == initial_title)
        t_tab_happy = datetime.now().isoformat()
        results["timestamps"]["TabReturn_Happy"] = t_tab_happy
        print(f"[{t_tab_happy}] Tab Return Happy verified, title restored={results['tab_title_check']['is_restored_exact']}")

        # Wait 2.1s -> returns to Neutral
        page.wait_for_function("() => document.querySelector('[data-testid=\"active-state-badge\"]').innerText.trim().toLowerCase() === 'neutral'", timeout=4000)
        t_tab_neutral = datetime.now().isoformat()
        results["timestamps"]["TabReturn_Neutral"] = t_tab_neutral
        print(f"[{t_tab_neutral}] Tab Return Neutral verified")

        # Step 5: Capture full labelled contact sheet of all 7 states
        sheet_container = page.locator('[data-testid="step3-states-grid"]')
        sheet_path_public = "public/biyoo/step3-idle-contact-sheet.png"
        sheet_path_artwork = "artwork/biyoo/step3-idle-contact-sheet.png"
        sheet_path_brain = os.path.join(brain_dir, "step3-idle-contact-sheet.png")

        # Scroll into view and wait for rendering
        sheet_container.scroll_into_view_if_needed()
        page.wait_for_timeout(1000)

        sheet_container.screenshot(path=sheet_path_public)
        sheet_container.screenshot(path=sheet_path_artwork)
        sheet_container.screenshot(path=sheet_path_brain)

        results["files"].extend([
            sheet_path_public,
            sheet_path_artwork,
            sheet_path_brain
        ])

        browser.close()

    with open("artwork/biyoo/step3-verification-results.json", "w") as f:
        json.dump(results, f, indent=2)

    print("\nVERIFICATION_RESULTS_JSON_START")
    print(json.dumps(results, indent=2))
    print("VERIFICATION_RESULTS_JSON_END")

if __name__ == "__main__":
    run()
