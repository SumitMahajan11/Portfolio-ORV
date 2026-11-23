import asyncio
import json
from playwright.async_api import async_playwright

async def check_hook():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        await page.goto("http://localhost:3000")
        await page.wait_for_timeout(1000)

        # 1. typeof window.__biyooEngine
        typeof_engine = await page.evaluate("() => typeof window.__biyooEngine")
        print(f"typeof window.__biyooEngine on /: {typeof_engine}")

        # 2. [data-testid="biyoo-current-expression"] DOM node properties
        node_info = await page.evaluate('''() => {
            const el = document.querySelector('[data-testid="biyoo-current-expression"]');
            if (!el) return { found: false };
            const cs = window.getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return {
                found: true,
                outerHTML: el.outerHTML,
                display: cs.display,
                visibility: cs.visibility,
                opacity: cs.opacity,
                rect: {
                    x: r.x,
                    y: r.y,
                    width: r.width,
                    height: r.height,
                    top: r.top,
                    right: r.right,
                    bottom: r.bottom,
                    left: r.left
                },
                clip: cs.clip,
                clipPath: cs.clipPath,
                position: cs.position,
                overflow: cs.overflow,
                whiteSpace: cs.whiteSpace
            };
        }''')

        print("\n[data-testid=\"biyoo-current-expression\"] properties:")
        print(f"outerHTML: {node_info.get('outerHTML')}")
        print(f"computed display: {node_info.get('display')}")
        print(f"computed visibility: {node_info.get('visibility')}")
        print(f"computed opacity: {node_info.get('opacity')}")
        print(f"computed rect: {json.dumps(node_info.get('rect'))}")
        print(f"computed clip: {node_info.get('clip')}")
        print(f"computed clipPath: {node_info.get('clipPath')}")
        print(f"computed position: {node_info.get('position')}")
        print(f"computed overflow: {node_info.get('overflow')}")

        is_pw_visible = await page.locator('[data-testid="biyoo-current-expression"]').is_visible()
        print(f"\nPlaywright is_visible(): {is_pw_visible}")
        
        # Visibility determination:
        # A node with width=1, height=1, clip=rect(0px, 0px, 0px, 0px), overflow=hidden is an sr-only element.
        # It is clipped to zero visible pixels on screen.
        rect = node_info.get('rect', {})
        clip = node_info.get('clip', '')
        if is_pw_visible and rect.get('width', 0) > 0 and rect.get('height', 0) > 0 and 'rect(0' not in clip and 'rect(0px, 0px, 0px, 0px)' not in clip:
            print("Visible on screen: YES")
        else:
            print("Visible on screen: NO (visually hidden off-screen / clipped to zero area via Tailwind .sr-only [clip: rect(0, 0, 0, 0)])")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(check_hook())

