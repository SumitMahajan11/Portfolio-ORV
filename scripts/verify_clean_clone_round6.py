import asyncio
import json
import os
import shutil
import subprocess
import time
from playwright.async_api import async_playwright

TEMP_DIR = r"C:\Users\SUMIT\AppData\Local\Temp\clean_clone_round6"
SRC_REPO = r"d:\Projects\Portfolio-ORV-main"
PORT = 3006

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
    time.sleep(4)

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page(viewport={'width': 1440, 'height': 900})

            # Monitor network and console
            http_4xx_5xx = []
            console_errors = []

            page.on("response", lambda r: http_4xx_5xx.append((r.status, r.url)) if r.status >= 400 else None)
            page.on("console", lambda m: console_errors.append(f"[{m.type}] {m.text}") if m.type in ['error'] else None)

            # Navigate to /
            print(f"\nNavigating to http://localhost:{PORT}...")
            resp = await page.goto(f"http://localhost:{PORT}", wait_until="networkidle")
            assert resp.status == 200, f"Page load returned {resp.status}"

            # Check Biyoo mounted
            await page.wait_for_selector('[data-testid="biyoo-live-puppet"]', timeout=8000)
            biyoo_mounted = await page.locator('[data-testid="biyoo-live-puppet"]').is_visible()
            print(f"Biyoo Mounted: {biyoo_mounted}")
            assert biyoo_mounted, "Biyoo puppet element not mounted!"

            # Check Q&A: "Who is Sumit?"
            print("\nTesting Q&A: 'Who is Sumit?'...")
            hitbox = page.locator('[data-testid="biyoo-silhouette-hitbox"]')
            await hitbox.dispatch_event('click')
            await page.wait_for_selector('[data-testid="biyoo-qa-panel"]', timeout=5000)
            input_box = page.locator('#biyoo-question-input')
            await input_box.fill('Who is Sumit?')
            await page.keyboard.press('Enter')
            await page.wait_for_selector('[data-testid="biyoo-qa-answer"]', timeout=5000)
            ans = await page.locator('[data-testid="biyoo-qa-answer"]').inner_text()
            print(f"Answer: {ans.strip()}")
            assert len(ans.strip()) > 10, "Answer empty or invalid"

            # Check 4xx/5xx count and console errors
            print(f"\n4xx/5xx count: {len(http_4xx_5xx)}")
            if http_4xx_5xx:
                for status, url in http_4xx_5xx:
                    print(f"  {status}: {url}")

            print(f"Console error count: {len(console_errors)}")
            if console_errors:
                for err in console_errors:
                    print(f"  {err}")

            await browser.close()

            print("\n================ CLEAN CLONE VERIFICATION SUMMARY ================")
            print(f"Cloned HEAD Commit : {commit_info.strip()}")
            print(f"4xx/5xx Responses  : {len(http_4xx_5xx)}")
            print(f"Console Errors     : {len(console_errors)}")
            print(f"Biyoo Mounted      : {biyoo_mounted}")
            print(f"'Who is Sumit?' Ans: {ans.strip()}")
            print("==================================================================")

    finally:
        print("\nShutting down server process...")
        server_proc.terminate()
        try:
            server_proc.wait(timeout=5)
        except Exception:
            server_proc.kill()

if __name__ == "__main__":
    asyncio.run(main())
