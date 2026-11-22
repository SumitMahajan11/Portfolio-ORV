import os
import sys
import subprocess
import time
import shutil
import urllib.request
import asyncio
from playwright.async_api import async_playwright

TEMP_DIR = r"D:\Projects\portfolio-clean-test"
PORT = 3005

def main():
    print("=================================================================")
    print("STEP 6: CLEAN-CLONE PROOF VERIFICATION")
    print("=================================================================\n")

    if os.path.exists(TEMP_DIR):
        print(f"Cleaning existing directory {TEMP_DIR}...")
        subprocess.run(f'rmdir /s /q "{TEMP_DIR}"', shell=True)

    # 1. git clone branch to temp dir (no copied ignored files)
    print(f"1. Cloning branch 'biyoo-puppet' into {TEMP_DIR}...")
    res = subprocess.run(
        ["git", "clone", "-b", "biyoo-puppet", "D:\\Projects\\Portfolio-ORV-main", TEMP_DIR],
        capture_output=True,
        text=True
    )
    if res.returncode != 0:
        print("Git clone failed:", res.stderr)
        sys.exit(1)
    print("Cloned successfully.")

    # 2. npm ci
    print("\n2. Running npm ci in clean clone...")
    res = subprocess.run(["npm.cmd", "ci"], cwd=TEMP_DIR, capture_output=True, text=True)
    if res.returncode != 0:
        print("npm ci failed:", res.stderr)
        sys.exit(1)
    print("npm ci completed successfully.")

    # 3. npm run build
    print("\n3. Running npm run build in clean clone...")
    res = subprocess.run(["npm.cmd", "run", "build"], cwd=TEMP_DIR, capture_output=True, text=True)
    print(res.stdout)
    if res.returncode != 0:
        print("npm run build failed:", res.stderr)
        sys.exit(1)
    print("npm run build passed.")

    # 4. npm start on PORT 3005
    print(f"\n4. Starting production server on http://localhost:{PORT}...")
    proc = subprocess.Popen(
        ["npx.cmd", "next", "start", "-p", str(PORT)],
        cwd=TEMP_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    # Wait for server to start
    server_ready = False
    for i in range(30):
        try:
            req = urllib.request.Request(f"http://localhost:{PORT}")
            with urllib.request.urlopen(req, timeout=1) as response:
                if response.status == 200:
                    server_ready = True
                    break
        except Exception:
            time.sleep(1)

    if not server_ready:
        print("Server failed to start within 30 seconds.")
        proc.kill()
        sys.exit(1)
    print(f"Server is up and responding at http://localhost:{PORT}")

    # 5. Run Playwright test on /
    print("\n5. Running Playwright test suite against clean clone...")
    asyncio.run(run_playwright_test(PORT))

    # Stop server
    print("\nShutting down clean-clone server...")
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()

    # Cleanup temp dir
    print(f"Cleaning up {TEMP_DIR}...")
    subprocess.run(f'rmdir /s /q "{TEMP_DIR}"', shell=True)
    print("Clean-clone proof complete.")

async def run_playwright_test(port):
    failed_requests = []
    console_errors = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})

        # Intercept requests to detect 4xx / 5xx
        def handle_response(response):
            if response.status >= 400:
                failed_requests.append((response.url, response.status))
        page.on('response', handle_response)

        # Track console errors
        def handle_console(msg):
            if msg.type == 'error':
                console_errors.append(msg.text)
        page.on('console', handle_console)

        # Navigate to /
        await page.goto(f"http://localhost:{port}", wait_until='networkidle')
        await page.wait_for_timeout(1000)

        # Check Biyoo mounted
        biyoo_el = page.locator('[data-testid="biyoo-live-puppet"]')
        biyoo_count = await biyoo_el.count()
        biyoo_mounted = biyoo_count > 0

        # Open Q&A panel
        hitbox = page.locator('[data-testid="biyoo-silhouette-hitbox"]')
        await hitbox.dispatch_event('click')
        await page.wait_for_selector('[data-testid="biyoo-qa-panel"]', timeout=5000)

        # Ask "Who is Sumit?"
        input_el = page.locator('#biyoo-question-input')
        await input_el.fill('Who is Sumit?')
        await input_el.press('Enter')
        await page.wait_for_selector('[data-testid="biyoo-qa-answer"]', timeout=5000)

        answer_text = await page.locator('[data-testid="biyoo-qa-answer"] p').text_content()

        print("\n--- Playwright Verification Results ---")
        print(f"1. 4xx/5xx HTTP Requests Count: {len(failed_requests)}")
        if failed_requests:
            for url, status in failed_requests:
                print(f"   [FAIL] {status} - {url}")
        else:
            print("   PASS: Zero 4xx/5xx requests detected.")

        print(f"2. Biyoo Mounted: {'YES' if biyoo_mounted else 'NO'}")
        assert biyoo_mounted, "Biyoo failed to mount!"

        print(f"3. Console Errors Count: {len(console_errors)}")
        if console_errors:
            for err in console_errors:
                print(f"   [CONSOLE ERROR] {err}")
        else:
            print("   PASS: Zero console errors.")

        print(f"4. Q&A Interaction:")
        print(f"   Query: 'Who is Sumit?'")
        print(f"   Answer displayed: \"{answer_text.strip()}\"")
        assert "Sumit Mahajan" in answer_text, f"Unexpected answer: {answer_text}"
        print("   PASS: Q&A correctly opened and answered 'Who is Sumit?'.")

        await browser.close()

if __name__ == '__main__':
    main()
