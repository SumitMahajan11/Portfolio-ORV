import os
import sys
import subprocess
import time
import shutil
import json
import asyncio
from playwright.async_api import async_playwright

TEMP_DIR = os.path.join(os.environ.get("TEMP", r"C:\Users\SUMIT\AppData\Local\Temp"), "clean_clone_r12")
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

    kb_map = {e["id"]: e for e in kb_entries}

    # Extract FALLBACK_ANSWER from matcher in clone
    matcher_path = os.path.join(TEMP_DIR, "src", "components", "biyoo", "puppet", "biyoo-qa-matcher.ts")
    fallback_answer_str = "I don't know that one, but the evidence section has the receipts."
    if os.path.exists(matcher_path):
        with open(matcher_path, "r", encoding="utf-8") as f:
            for line in f:
                if "FALLBACK_ANSWER" in line and "=" in line:
                    parts = line.split("=", 1)[1].strip().strip('";')
                    if parts:
                        fallback_answer_str = parts

    print(f"Loaded {len(kb_entries)} KB entries dynamically from clean clone:")
    for i, e in enumerate(kb_entries):
        print(f"  [{i}] id={e['id']}, sourceHref={e['sourceHref']}, sourceLabel={e['sourceLabel']}")

    async with async_playwright() as p:
        browser = await p.chromium.launch()

        for vp in [{"name": "1280x800", "w": 1280, "h": 800}, {"name": "390x844", "w": 390, "h": 844}]:
            vp_name, w, h = vp["name"], vp["w"], vp["h"]
            print(f"\n==================================================================")
            print(f"=== TESTING VIEWPORT: {vp_name} ===")
            print(f"==================================================================")

            context = await browser.new_context(viewport={"width": w, "height": h})
            page = await context.new_page()

            page.on("console", lambda msg: console_errors.append(f"[{vp_name}] {msg.text}") if msg.type == "error" else None)
            page.on("response", lambda resp: bad_responses.append(f"[{vp_name}] {resp.status} {resp.url}") if resp.status >= 400 else None)

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

            # 3. Fallback check: ask out-of-scope query
            ask_another = await page.query_selector('button:has-text("ask another")')
            if ask_another:
                await ask_another.click()
                await page.wait_for_timeout(300)

            input_el = await page.wait_for_selector('[data-testid="biyoo-qa-input"]')
            await input_el.fill("how old is he?")
            await page.keyboard.press("Enter")
            await page.wait_for_timeout(400)

            fallback_el = await page.wait_for_selector('[data-testid="biyoo-qa-answer"] p')
            rendered_fallback_answer = await fallback_el.inner_text()

            has_exact_fallback = fallback_answer_str in rendered_fallback_answer
            print(f"\n3. Fallback string check:")
            print(f"   Expected FALLBACK_ANSWER: \"{fallback_answer_str}\"")
            print(f"   Rendered Answer String:  \"{rendered_fallback_answer}\"")
            print(f"   Contains exact fallback string: {has_exact_fallback}")

            # 4. Chip check: click a chip, then compare new answer text to KB answer
            fallback_chips = await page.query_selector_all('[data-testid="biyoo-qa-chip"]')
            print(f"\n4. Chip check (visible chips count: {len(fallback_chips)}):")
            if fallback_chips:
                chip_to_click = fallback_chips[0]
                chip_text = (await chip_to_click.inner_text()).strip()

                # Find which KB entry this chip belongs to
                matched_entry = None
                for entry in kb_entries:
                    for q in entry["questions"]:
                        if q.lower() in chip_text.lower() or chip_text.lower() in q.lower():
                            matched_entry = entry
                            break
                    if matched_entry:
                        break

                if not matched_entry:
                    matched_entry = kb_entries[0]

                print(f"   Clicking chip: \"{chip_text}\" (mapped to entry: {matched_entry['id']})...")
                await chip_to_click.click()
                await page.wait_for_timeout(400)

                chip_answer_el = await page.wait_for_selector('[data-testid="biyoo-qa-answer"] p')
                rendered_chip_answer = (await chip_answer_el.inner_text()).strip()
                expected_kb_answer = matched_entry["answer"].strip()

                print(f"   Expected KB Answer: \"{expected_kb_answer}\"")
                print(f"   Rendered Answer:    \"{rendered_chip_answer}\"")
                chip_match = rendered_chip_answer == expected_kb_answer
                print(f"   Exact Match: {chip_match}")

            await context.close()

        # 5. Link check: for each KB entry, a fresh page, link scoped inside answer, real click, target top within 80px of 0 after 3s
        print(f"\n==================================================================")
        print(f"=== 5. LINK CHECK: 10 KB ENTRIES (FRESH PAGE PER ENTRY) ===")
        print(f"==================================================================")
        print(f"{'Entry ID':<20} | {'Found':<6} | {'Hash':<18} | {'ScrollY':<10} | {'Target Top':<12} | {'Result'}")
        print("-" * 80)

        for idx, entry in enumerate(kb_entries):
            context = await browser.new_context(viewport={"width": 1280, "height": 800})
            page = await context.new_page()

            page.on("console", lambda msg: console_errors.append(f"[LinkCheck-{entry['id']}] {msg.text}") if msg.type == "error" else None)
            page.on("response", lambda resp: bad_responses.append(f"[LinkCheck-{entry['id']}] {resp.status} {resp.url}") if resp.status >= 400 else None)

            await page.goto(f"http://localhost:{PORT}/?skipIntro=true")
            await page.wait_for_selector('[data-biyoo-puppet="global"]')

            # Open panel and query questions[0]
            await page.click('[data-biyoo-puppet="global"]')
            input_box = await page.wait_for_selector('[data-testid="biyoo-qa-input"]')
            await input_box.fill(entry["questions"][0])
            await page.keyboard.press("Enter")
            await page.wait_for_selector('[data-testid="biyoo-qa-answer"]')

            # Scoped strictly inside the answer
            link_el = await page.wait_for_selector('[data-testid="biyoo-qa-answer"] a')
            link_found = link_el is not None

            # Real mouse click at center
            await link_el.scroll_into_view_if_needed()
            box = await link_el.bounding_box()
            cx = box['x'] + box['width'] / 2
            cy = box['y'] + box['height'] / 2
            await page.mouse.click(cx, cy)

            # Wait 3s
            await page.wait_for_timeout(3000)

            meas = await page.evaluate(f'''(sel) => {{
                const target = document.querySelector(sel);
                return {{
                    hash: window.location.hash,
                    scrollY: window.scrollY,
                    targetTop: target ? Math.round(target.getBoundingClientRect().top) : null
                }};
            }}''', entry["sourceHref"])

            target_top = meas["targetTop"]
            is_within_80 = target_top is not None and abs(target_top) <= 80
            res_str = "within 80px (PASS)" if is_within_80 else f"out of bounds ({target_top}px)"

            t_str = f"{target_top}px" if target_top is not None else "N/A"
            print(f"{entry['id']:<20} | {str(link_found):<6} | {meas['hash']:<18} | {meas['scrollY']}px{'':<4} | {t_str:<12} | {res_str}")

            await context.close()

        await browser.close()

    print(f"\n==================================================================")
    print(f"=== SUMMARY: ERRORS & RESPONSES ===")
    print(f"==================================================================")
    print(f"4xx/5xx count: {len(bad_responses)}")
    if bad_responses:
        print("Bad responses:")
        for r in bad_responses:
            print(f"  - {r}")

    print(f"console errors count: {len(console_errors)}")
    if console_errors:
        print("Console errors:")
        for err in console_errors:
            print(f"  - {err}")

def main():
    if not os.path.exists(TEMP_DIR):
        os.makedirs(TEMP_DIR, exist_ok=True)
        print("1. Cloning HEAD to temp directory...")
        run(f"git clone . {TEMP_DIR}")
        
        # Check if node_modules can be copied from existing clean clone to save time
        cached_nms = [
            os.path.join(os.environ.get("TEMP", r"C:\Users\SUMIT\AppData\Local\Temp"), "clean_clone_r11", "node_modules"),
            os.path.join(os.environ.get("TEMP", r"C:\Users\SUMIT\AppData\Local\Temp"), "clean_clone_round7", "node_modules")
        ]
        for cnm in cached_nms:
            if os.path.exists(cnm):
                print(f"   Reusing cached node_modules from {cnm}...")
                shutil.copytree(cnm, os.path.join(TEMP_DIR, "node_modules"))
                break

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

