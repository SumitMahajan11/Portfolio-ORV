from playwright.sync_api import sync_playwright

viewports = [
    (360, 640),
    (390, 844),
    (768, 1024),
    (1440, 900),
]

with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in viewports:
        page = b.new_page(viewport={"width": w, "height": h})
        page.goto("http://localhost:3000/")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(500)

        boxes = page.evaluate("""() => {
            const getBox = el => {
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) };
            };
            const biyoo = document.querySelector('[data-testid="biyoo-live-puppet"]');
            const toggle = document.querySelector('[data-testid="biyoo-quiet-toggle"]');
            const h1 = document.querySelector('h1');
            const heroP = document.querySelector('#hero-scene p');
            const ctas = Array.from(document.querySelectorAll('#hero-scene a, #hero-scene button')).filter(el => !el.closest('[data-testid="global-biyoo-container"]'));
            const navs = Array.from(document.querySelectorAll('header a, nav a'));
            return {
                biyoo: getBox(biyoo),
                toggle: getBox(toggle),
                h1: getBox(h1),
                heroP: getBox(heroP),
                ctas: ctas.map(c => ({ text: c.textContent.trim().slice(0, 20), box: getBox(c) })),
                navs: navs.map(n => ({ text: n.textContent.trim().slice(0, 20), box: getBox(n) })),
            };
        }""")
        print(f"\n=== Viewport {w}x{h} ===")
        print("Biyoo:", boxes['biyoo'])
        print("Toggle:", boxes['toggle'])
        print("H1:", boxes['h1'])
        print("Hero P:", boxes['heroP'])
        for c in boxes['ctas']:
            print("CTA:", c['text'], c['box'])
        for n in boxes['navs']:
            print("Nav:", n['text'], n['box'])
    b.close()

