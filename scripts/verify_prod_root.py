import sys
from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        
        failed_responses = []
        page.on("response", lambda resp: failed_responses.append(f"{resp.status} {resp.url}") if resp.status >= 400 else None)
        
        page.goto("http://localhost:3000/", wait_until="networkidle")
        page.wait_for_timeout(2000)
        
        engine_type = page.evaluate("() => typeof window.__biyooEngine")
        
        print(f"typeof window.__biyooEngine: {engine_type}")
        print(f"Console error count: {len(console_errors)}")
        if console_errors:
            for err in console_errors:
                print(f"  Console error: {err}")
        print(f"4xx/5xx response count: {len(failed_responses)}")
        if failed_responses:
            for resp in failed_responses:
                print(f"  Failed response: {resp}")
                
        browser.close()

if __name__ == "__main__":
    main()

