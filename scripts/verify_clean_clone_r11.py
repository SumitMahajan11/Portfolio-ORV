import os
import sys
import subprocess
import time
import shutil
import json
import asyncio
from playwright.async_api import async_playwright

TEMP_DIR = os.path.join(os.environ.get("TEMP", r"C:\Users\SUMIT\AppData\Local\Temp"), "clean_clone_r11")
PORT = 3005

def run(cmd, cwd=None):
    print(f">> Running: {cmd} in {cwd or '.'}")
    res = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error ({res.returncode}):\nSTDOUT: {res.stdout}\nSTDERR: {res.stderr}")
        raise RuntimeError(f"Command failed: {cmd}")
    return res.stdout

async def test_server():
    console_errors = []
    bad_responses = []

    # Read the clone's KB dynamically
    kb_path = os.path.join(TEMP_DIR, "src", "content", "biyoo-kb.json")
    with open(kb_path, "r", encoding="utf-8") as f:
        kb_entries = json.load(f)

    print(f"Loaded {len(kb_entries)} KB entries dynamically from clean clone:")
    for i, e in enumerate(kb_entries):
        print(f"  [{i}] id={e['id']}, sourceHref={e['sourceHref']}, sourceLabel={e['sourceLabel']}")

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1280, "height": 800})

        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("response", lambda resp: bad_responses.append(f"{resp.status} {resp.url}") if resp.status >= 400 else None)

        print("\n--- TEST EXECUTION ---")
        # Navigate to homepage
        await page.goto(f"http://localhost:{PORT}/?skipIntro=true")
        await page.wait_for_timeout(1000)

        # 1. Biyoo mounted
        biyoo_container = await page.wait_for_selector('[data-testid="global-biyoo-container"]')
        puppet = await page.wait_for_selector('[data-biyoo-puppet="global"]')
        print(f"1. Biyoo mounted: container={bool(biyoo_container)}, puppet={bool(puppet)}")

        # 2. 'Who is Sumit?' answered
        await puppet.click()
        panel = await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        print(f"   Q&A panel mounted: {bool(panel)}")

        input_el = await page.wait_for_selector('[data-testid="biyoo-qa-input"]')
        await input_el.fill("Who is Sumit?")
        await page.keyboard.press("Enter")
        answer_el = await page.wait_for_selector('[data-testid="biyoo-qa-answer"]')
        answer_text = (await answer_el.inner_text()).lower()
        who_answered = "sumit" in answer_text
        print(f"2. 'Who is Sumit?' answered: {who_answered}")

        # 3. 'how old is he?' shows fallback text
        # Click ask another if available
        ask_another = await page.query_selector('button:has-text("ask another")')
        if ask_another:
            await ask_another.click()
            await page.wait_for_timeout(300)

        input_el = await page.wait_for_selector('[data-testid="biyoo-qa-input"]')
        await input_el.fill("how old is he?")
        await page.keyboard.press("Enter")
        await page.wait_for_timeout(400)

        fallback_el = await page.wait_for_selector('[data-testid="biyoo-qa-answer"]')
        fallback_text = (await fallback_el.inner_text()).lower()
        fallback_ok = "no direct receipt" in fallback_text or "receipt" in fallback_text or "archivist" in fallback_text
        print(f"3. 'how old is he?' shows fallback text: {fallback_ok}")

        # 4. 4 chips are visible
        fallback_chips = await page.query_selector_all('[data-testid="biyoo-qa-chip"]')
        chip_count = len(fallback_chips)
        print(f"4. 4 chips visible: count={chip_count} (is 4: {chip_count == 4})")

        # 5. Chip click renders a new answer
        if chip_count > 0:
            chip_label = await fallback_chips[0].inner_text()
            print(f"   Clicking fallback chip '{chip_label}'...")
            await fallback_chips[0].click()
            await page.wait_for_timeout(400)
            chip_answer_el = await page.wait_for_selector('[data-testid="biyoo-qa-answer"]')
            chip_answer_text = (await chip_answer_el.inner_text()).lower()
            chip_answered = "direct receipt" in chip_answer_text or len(chip_answer_text) > 20
            print(f"5. Chip click renders a new answer: {chip_answered}")

        # 6. 10 KB links behave (check navigation / scroll)
        print("6. Checking 10 KB links behavior:")
        for idx, entry in enumerate(kb_entries):
            # Check if panel is open; if closed, reopen it
            panel_open = await page.query_selector('[data-testid="biyoo-qa-panel"]')
            if not panel_open:
                puppet_el = await page.wait_for_selector('[data-biyoo-puppet="global"]')
                await puppet_el.click()
                await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')

            ask_another_btn = await page.query_selector('button:has-text("ask another")')
            if ask_another_btn:
                try:
                    await ask_another_btn.click()
                    await page.wait_for_timeout(200)
                except Exception:
                    pass

            input_box = await page.wait_for_selector('[data-testid="biyoo-qa-input"]')
            await input_box.fill(entry["questions"][0])
            await page.keyboard.press("Enter")
            await page.wait_for_selector('[data-testid="biyoo-qa-answer"]')

            # Find source link
            link_sel = f'a[href="{entry["sourceHref"]}"]'
            source_link = await page.query_selector(link_sel)
            link_found = source_link is not None
            link_text = (await source_link.inner_text()).lower() if link_found else ""
            label_match = entry["sourceLabel"].lower() in link_text

            # Click link and check hash
            hash_after = ""
            if link_found:
                await source_link.click()
                await page.wait_for_timeout(300)
                hash_after = await page.evaluate('() => window.location.hash')

            behaves = link_found and (hash_after == entry["sourceHref"])
            print(f"   [{idx+1}/10] {entry['id']:<18} | sourceHref={entry['sourceHref']:<15} | found={link_found} | labelMatch={label_match} | hashAfter={hash_after:<15} | behaves={behaves}")

        await browser.close()

    print(f"\n7. 4xx/5xx count: {len(bad_responses)}")
    if bad_responses:
        print("   Bad responses:", bad_responses)
    print(f"8. console errors count: {len(console_errors)}")
    if console_errors:
        print("   Console errors:")
        for err in console_errors:
            print(f"   - {err}")

def main():
    if not os.path.exists(TEMP_DIR):
        os.makedirs(TEMP_DIR, exist_ok=True)
        print("1. Cloning HEAD to temp directory...")
        run(f"git clone . {TEMP_DIR}")
        
        # Check if node_modules can be copied from existing clean clone to save time
        r7_nm = os.path.join(os.environ.get("TEMP", r"C:\Users\SUMIT\AppData\Local\Temp"), "clean_clone_round7", "node_modules")
        if os.path.exists(r7_nm):
            print("   Reusing cached node_modules from clean_clone_round7...")
            shutil.copytree(r7_nm, os.path.join(TEMP_DIR, "node_modules"))
        print("2. Running npm ci in clean clone...")
        run("npm ci", cwd=TEMP_DIR)
    else:
        print("1. Updating clean clone from local repo...")
        run("git pull . HEAD", cwd=TEMP_DIR)

    print("3. Building project in clean clone...")
    run("npm run build", cwd=TEMP_DIR)

    print(f"4. Starting Next.js production server on port {PORT}...")
    proc = subprocess.Popen(f"npx next start -p {PORT}", shell=True, cwd=TEMP_DIR)
    time.sleep(4)

    try:
        print("5. Running Playwright end-to-end tests...")
        asyncio.run(test_server())
    finally:
        print("6. Killing production server...")
        subprocess.run(f"taskkill /F /T /PID {proc.pid}", shell=True, capture_output=True)
        subprocess.run('powershell -Command "Get-NetTCPConnection -LocalPort 3005 -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -gt 0 } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"', shell=True, capture_output=True)
        print("7. Cleaning up temp directory...")
        shutil.rmtree(TEMP_DIR, ignore_errors=True)
        print("Done! Clean clone test complete.")

if __name__ == "__main__":
    main()

