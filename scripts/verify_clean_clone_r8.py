import os
import sys
import subprocess
import time
import shutil
import asyncio
from playwright.async_api import async_playwright

TEMP_DIR = os.path.join(os.environ.get("TEMP", r"C:\Users\SUMIT\AppData\Local\Temp"), "clean_clone_r8")
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
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("response", lambda resp: bad_responses.append(f"{resp.status} {resp.url}") if resp.status >= 400 else None)
        
        # Navigate to homepage
        await page.goto(f"http://localhost:{PORT}/?skipIntro=true")
        await page.wait_for_timeout(1000)
        
        # 1. Biyoo mounted
        biyoo = await page.wait_for_selector('[data-testid="global-biyoo-container"]')
        puppet = await page.wait_for_selector('[data-biyoo-puppet]')
        print(f"Biyoo mounted: container={bool(biyoo)}, puppet={bool(puppet)}")
        
        # 2. Click puppet to open Q&A panel
        await puppet.click()
        panel = await page.wait_for_selector('[data-testid="biyoo-qa-panel"]')
        print(f"Q&A panel mounted: {bool(panel)}")
        
        # 3. 'Who is Sumit?' answered
        who_chip = await page.wait_for_selector('button:has-text("Who is Sumit?")')
        await who_chip.click()
        answer = await page.wait_for_selector('[data-testid="biyoo-qa-answer"]')
        answer_text = await answer.inner_text()
        print(f"'Who is Sumit?' answered: {('Sumit' in answer_text)}")
        
        # 4. Check 6/6 sourceHrefs in DOM
        # In the page DOM or through asking questions
        page_html = await page.content()
        source_hrefs = [
            "/projects/edge-cloud",
            "/projects/ratify",
            "/projects/iac-verifier",
            "/evidence",
            "/#about",
            "mailto:sumitnmahajann11@gmail.com"
        ]
        found_hrefs = []
        for href in source_hrefs:
            found = href in page_html
            if found:
                found_hrefs.append(href)
            print(f"sourceHref '{href}' present in DOM: {found}")
            
        print(f"sourceHrefs present in DOM: {len(found_hrefs)}/{len(source_hrefs)}")
        
        # 5. Fallback chips appear on out-of-scope question and chip click answers
        ask_another = await page.query_selector('button:has-text("ask another")')
        if ask_another:
            await ask_another.click()
            await page.wait_for_timeout(300)
            
        input_el = await page.wait_for_selector('[data-testid="biyoo-qa-input"]')
        await input_el.fill("how old is he?")
        await page.keyboard.press("Enter")
        await page.wait_for_timeout(400)
        
        fallback_answer = await page.wait_for_selector('[data-testid="biyoo-qa-answer"]')
        fallback_text = await fallback_answer.inner_text()
        print(f"Fallback answer rendered: {'No Direct Receipt' in fallback_text}")
        
        fallback_chips = await page.query_selector_all('[data-testid="biyoo-qa-chip"]')
        print(f"Fallback chips count: {len(fallback_chips)}")
        if fallback_chips:
            chip_label = await fallback_chips[0].inner_text()
            print(f"Clicking fallback chip '{chip_label}'...")
            await fallback_chips[0].click()
            await page.wait_for_timeout(400)
            chip_answer = await page.wait_for_selector('[data-testid="biyoo-qa-answer"]')
            chip_answer_text = await chip_answer.inner_text()
            print(f"Fallback chip click answered with direct receipt: {'Archivist Answer' in chip_answer_text}")
        
        await browser.close()
        
    print(f"4xx/5xx count: {len(bad_responses)}")
    if bad_responses:
        print("Bad responses:", bad_responses)
    print(f"console errors: {len(console_errors)}")
    if console_errors:
        print("Console errors:", console_errors)

def main():
    # If clean_clone_r8 already has node_modules, keep it or rebuild
    if not os.path.exists(TEMP_DIR):
        os.makedirs(TEMP_DIR, exist_ok=True)
        print("1. Cloning HEAD to temp directory...")
        run(f"git clone . {TEMP_DIR}")
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
