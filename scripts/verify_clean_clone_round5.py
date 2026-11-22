import asyncio
import json
import os
import shutil
import subprocess
import time
from playwright.async_api import async_playwright

TEMP_DIR = r"C:\Users\SUMIT\AppData\Local\Temp\clean_clone_round5"
SRC_REPO = r"d:\Projects\Portfolio-ORV-main"
PORT = 3005

def run_cmd(cmd, cwd=None):
    print(f"\n[RUN] {cmd} (cwd={cwd or '.'})")
    start = time.time()
    res = subprocess.run(cmd, shell=True, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    dur = round(time.time() - start, 2)
    print(f"[EXIT {res.returncode}] in {dur}s:\n{res.stdout[-1500:]}")
    if res.returncode != 0:
        raise RuntimeError(f"Command failed: {cmd}\nOutput:\n{res.stdout}")
    return res.stdout

async def main():
    # 1. Clean clone
    if os.path.exists(TEMP_DIR):
        print(f"Removing existing temp dir: {TEMP_DIR}")
        shutil.rmtree(TEMP_DIR, ignore_errors=True)

    print(f"Cloning {SRC_REPO} into {TEMP_DIR}...")
    run_cmd(f'git clone "{SRC_REPO}" "{TEMP_DIR}"')

    # Verify cloned commit
    commit_info = run_cmd('git log -1 --oneline', cwd=TEMP_DIR)
    print(f"Cloned HEAD commit: {commit_info.strip()}")

    # 2. npm ci
    print("\nRunning npm ci in clean clone...")
    run_cmd('npm ci', cwd=TEMP_DIR)

    # 3. npm run build
    print("\nRunning npm run build in clean clone...")
    run_cmd('npm run build', cwd=TEMP_DIR)

    # 4. Start production server on PORT
    print(f"\nStarting Next.js production server on port {PORT}...")
    server_proc = subprocess.Popen(
        f'npx next start -p {PORT}',
        shell=True,
        cwd=TEMP_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    # Wait for server ready
    time.sleep(3)

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page(viewport={'width': 1440, 'height': 900})

            # Monitor network and console
            http_errors = []
            console_errors = []

            page.on("response", lambda r: http_errors.append((r.status, r.url)) if r.status >= 400 else None)
            page.on("console", lambda m: console_errors.append(f"[{m.type}] {m.text}") if m.type in ['error', 'warning'] else None)

            # Navigate
            print(f"\nNavigating to http://localhost:{PORT}...")
            resp = await page.goto(f"http://localhost:{PORT}", wait_until="networkidle")
            assert resp.status == 200, f"Page load returned {resp.status}"

            # Check Biyoo mounted
            await page.wait_for_selector('[data-testid="biyoo-live-puppet"]', timeout=5000)
            biyoo_mounted = await page.locator('[data-testid="biyoo-live-puppet"]').is_visible()
            print(f"Biyoo Mounted: {biyoo_mounted}")
            assert biyoo_mounted, "Biyoo puppet element not mounted!"

            # Check Q&A: "Who is Sumit?"
            print("\nTesting Q&A: 'Who is Sumit?'...")
            await page.locator('[data-testid="biyoo-silhouette-hitbox"]').click()
            await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')
            input_box = page.locator('#biyoo-question-input')
            await input_box.fill('Who is Sumit?')
            await page.keyboard.press('Enter')
            await page.wait_for_selector('[data-testid="biyoo-qa-answer"]')
            ans1 = await page.locator('[data-testid="biyoo-qa-answer"]').inner_text()
            print(f"Answer 1: {ans1.strip()}")
            assert len(ans1.strip()) > 10, "Answer 1 empty or invalid"

            # Check Q&A: "which college is this person at"
            print("\nTesting Q&A: 'which college is this person at'...")
            await input_box.fill('which college is this person at')
            await page.keyboard.press('Enter')
            await page.wait_for_timeout(400)
            ans2 = await page.locator('[data-testid="biyoo-qa-answer"]').inner_text()
            print(f"Answer 2: {ans2.strip()}")
            assert len(ans2.strip()) > 10, "Answer 2 empty or invalid"

            # Close QA modal (click close button or outside)
            close_btn = page.locator('[data-testid="biyoo-qa-close"]')
            if await close_btn.is_visible():
                await close_btn.click()
            await page.wait_for_timeout(300)

            # Check all KB sourceHrefs in DOM
            print("\nVerifying every KB sourceHref exists in the DOM:")
            kb_path = os.path.join(TEMP_DIR, "src", "content", "biyoo-kb.json")
            with open(kb_path, "r", encoding="utf-8") as f:
                kb_data = json.load(f)

            source_hrefs = sorted(list(set(entry["sourceHref"] for entry in kb_data if "sourceHref" in entry)))
            for href in source_hrefs:
                target_sel = href
                el = page.locator(target_sel)
                count = await el.count()
                tag_name = await el.first.evaluate("el => el.tagName.toLowerCase()") if count > 0 else "NONE"
                print(f"  - sourceHref: '{href}' -> Found {count} element(s) (<{tag_name} id='{href.replace('#', '')}'>)")
                assert count > 0, f"sourceHref '{href}' not found in DOM!"

            # Hover test: CTA 1 (a[href="#scenario-select"])
            print("\nTesting real 2.5s hover on Hero CTA 1: a[href='#scenario-select']...")
            cta1 = page.locator('a[href="#scenario-select"]')
            cta1_box = await cta1.bounding_box()
            cta1_center_x = cta1_box['x'] + cta1_box['width'] / 2
            cta1_center_y = cta1_box['y'] + cta1_box['height'] / 2

            t_hover1_start = time.time()
            iso_start1 = time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(t_hover1_start)) + f".{int((t_hover1_start % 1)*1000):03d}Z"
            print(f"  [TIMESTAMP START] Moving cursor to CTA 1 ({round(cta1_center_x)}, {round(cta1_center_y)}) at {iso_start1}")
            await page.mouse.move(cta1_center_x, cta1_center_y)

            # Wait for 2.6s (trigger is 2.5s)
            await page.wait_for_timeout(2650)
            t_hover1_end = time.time()
            iso_end1 = time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(t_hover1_end)) + f".{int((t_hover1_end % 1)*1000):03d}Z"

            arm_l_group = page.locator('[data-testid="biyoo-arm-l-group"]')
            transform1 = await arm_l_group.evaluate("el => el.style.transform")
            engine_arm1 = await page.evaluate("() => window.__biyooEngine ? window.__biyooEngine.pointingArm : null")
            print(f"  [TIMESTAMP RAISED] CTA 1 arm evaluated at {iso_end1}:")
            print(f"    pointingArm: '{engine_arm1}' | Left arm transform: '{transform1}'")
            assert engine_arm1 == 'left' or 'rotate(68deg)' in transform1, f"Expected pointing arm left, got {engine_arm1}, transform: {transform1}"

            # Reset arm by moving mouse away
            await page.mouse.move(100, 100)
            await page.wait_for_timeout(600)

            # Hover test: CTA 2 (a[href="#readers-record"])
            print("\nTesting real 2.5s hover on Hero CTA 2: a[href='#readers-record']...")
            cta2 = page.locator('a[href="#readers-record"]')
            cta2_box = await cta2.bounding_box()
            cta2_center_x = cta2_box['x'] + cta2_box['width'] / 2
            cta2_center_y = cta2_box['y'] + cta2_box['height'] / 2

            t_hover2_start = time.time()
            iso_start2 = time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(t_hover2_start)) + f".{int((t_hover2_start % 1)*1000):03d}Z"
            print(f"  [TIMESTAMP START] Moving cursor to CTA 2 ({round(cta2_center_x)}, {round(cta2_center_y)}) at {iso_start2}")
            await page.mouse.move(cta2_center_x, cta2_center_y)

            # Wait for 2.6s
            await page.wait_for_timeout(2650)
            t_hover2_end = time.time()
            iso_end2 = time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(t_hover2_end)) + f".{int((t_hover2_end % 1)*1000):03d}Z"

            transform2 = await arm_l_group.evaluate("el => el.style.transform")
            engine_arm2 = await page.evaluate("() => window.__biyooEngine ? window.__biyooEngine.pointingArm : null")
            print(f"  [TIMESTAMP RAISED] CTA 2 arm evaluated at {iso_end2}:")
            print(f"    pointingArm: '{engine_arm2}' | Left arm transform: '{transform2}'")
            assert engine_arm2 == 'left' or 'rotate(68deg)' in transform2, f"Expected pointing arm left, got {engine_arm2}, transform: {transform2}"

            # Summary report
            print("\n================ CLEAN CLONE VERIFICATION REPORT ================")
            print(f"HTTP 4xx/5xx Errors: {len(http_errors)}")
            for err in http_errors:
                print(f"  HTTP {err[0]}: {err[1]}")
            print(f"Console Errors: {len(console_errors)}")
            for cerr in console_errors:
                print(f"  {cerr}")
            print(f"Biyoo Mounted: {biyoo_mounted}")
            print("Hero CTA 1 Pointing Arm: RAISED (left)")
            print("Hero CTA 2 Pointing Arm: RAISED (left)")
            print("All KB sourceHrefs exist in DOM: TRUE")
            print("ALL CLEAN CLONE VERIFICATIONS PASSED!")

            await browser.close()
    finally:
        print("\nTerminating clean clone server process...")
        server_proc.terminate()
        server_proc.kill()

if __name__ == "__main__":
    asyncio.run(main())
