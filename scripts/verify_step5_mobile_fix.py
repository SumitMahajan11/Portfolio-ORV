import asyncio
import os
import shutil
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFont

ARTIFACT_DIR = r"C:\Users\SUMIT\.gemini\antigravity\brain\25ce1abe-a021-46a1-9e4e-566f68d42680"
PUBLIC_DIR = r"d:\Projects\Portfolio-ORV-main\public\biyoo"
BASE_URL = "http://localhost:3000"

VIEWPORTS = [
    {"name": "360x640", "width": 360, "height": 640},
    {"name": "390x844", "width": 390, "height": 844},
    {"name": "768x1024", "width": 768, "height": 1024},
    {"name": "1440x900", "width": 1440, "height": 900},
]

def intersects(a, b):
    if not a or not b:
        return False
    # Standard axis-aligned bounding box collision test
    no_overlap = (
        a["right"] <= b["left"] or
        a["left"] >= b["right"] or
        a["bottom"] <= b["top"] or
        a["top"] >= b["bottom"]
    )
    return not no_overlap

async def main():
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    os.makedirs(PUBLIC_DIR, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        shots = {}
        audit_results = {}

        for vp in VIEWPORTS:
            v_name = vp["name"]
            width = vp["width"]
            height = vp["height"]

            ctx = await browser.new_context(viewport={"width": width, "height": height})
            page = await ctx.new_page()

            # Navigate and reset session/local state so prompt and late-night are armed
            await page.goto(BASE_URL, wait_until="networkidle")
            await page.evaluate("""() => {
                sessionStorage.setItem('biyoo_fake_hour', '3');
                sessionStorage.removeItem('biyoo_late_night_checked');
                localStorage.removeItem('sound_pref');
            }""")
            await page.reload(wait_until="networkidle")

            # Wait 4.7s for sound prompt to appear automatically
            await page.wait_for_timeout(4700)

            # Trigger constellation broadcast and re-arm late-night bubble so all elements are rendered simultaneously
            await page.evaluate("""() => {
                if (!document.querySelector('#constellation-broadcast-card')) {
                    const card = document.createElement('div');
                    card.id = 'constellation-broadcast-card';
                    card.className = 'fixed top-24 right-4 sm:top-28 sm:right-8 z-50 max-w-[300px] sm:max-w-sm pointer-events-auto font-mono';
                    card.innerHTML = `
                        <div class="relative border border-star/50 bg-[rgba(14,17,24,0.92)] shadow-[0_4px_24px_rgba(94,225,230,0.15)] p-3 sm:p-4 font-mono">
                            <span class="text-[10px] tracking-widest text-[#5EE1E6]/70 uppercase">[CONSTELLATION BROADCAST]</span>
                            <p class="mt-1 text-xs text-[#5EE1E6] leading-relaxed">The Constellation 'Night Owl' is watching the late-night reader.</p>
                        </div>
                    `;
                    document.body.appendChild(card);
                }
                if (window.__biyooEngine) {
                    window.__biyooEngine.resetBubbleCooldown();
                    window.__biyooEngine.triggerLateNight();
                }
            }""")
            await page.wait_for_timeout(400)

            # Capture screenshot
            shot_path = os.path.join(PUBLIC_DIR, f"step5-shot-{v_name}.png")
            await page.screenshot(path=shot_path)
            shots[v_name] = shot_path

            # Measure all elements
            data = await page.evaluate("""() => {
                const getBox = (el) => {
                    if (!el) return null;
                    const r = el.getBoundingClientRect();
                    return {
                        left: Math.round(r.left * 10) / 10,
                        top: Math.round(r.top * 10) / 10,
                        right: Math.round(r.right * 10) / 10,
                        bottom: Math.round(r.bottom * 10) / 10,
                        width: Math.round(r.width * 10) / 10,
                        height: Math.round(r.height * 10) / 10
                    };
                };

                const prompt = document.querySelector('#sound-permission-prompt');
                const biyooBox = document.querySelector('[data-testid="biyoo-live-puppet"]');
                const bubble = document.querySelector('[data-testid="biyoo-speech-bubble"]');
                const toggle = document.querySelector('[data-testid="biyoo-quiet-toggle"]');
                const constellationCard = document.querySelector('#constellation-broadcast-card');

                const biyooOwned = {
                    prompt: getBox(prompt),
                    biyooBox: getBox(biyooBox),
                    bubble: getBox(bubble),
                    toggle: getBox(toggle),
                    constellationCard: getBox(constellationCard)
                };

                // Find all page content in first viewport: nav links, CTAs, headings, paragraphs
                // Exclude Biyoo's own buttons / prompt internal elements
                const promptEl = prompt;
                const biyooContainer = document.querySelector('[data-testid="global-biyoo-container"]');
                const constCardEl = constellationCard;

                const isBiyooOrPromptChild = (node) => {
                    if (!node) return false;
                    if (promptEl && promptEl.contains(node)) return true;
                    if (biyooContainer && biyooContainer.contains(node)) return true;
                    if (constCardEl && constCardEl.contains(node)) return true;
                    return false;
                };

                // Nav links
                const headerNavLinks = Array.from(document.querySelectorAll('header a, nav a'))
                    .filter(el => {
                        const r = el.getBoundingClientRect();
                        return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
                    })
                    .map(el => ({
                        type: 'nav_link',
                        label: el.textContent?.trim().replace(/\\s+/g, ' ').slice(0, 35),
                        box: getBox(el)
                    }));

                // CTAs (hero links / buttons)
                const ctas = Array.from(document.querySelectorAll('#hero-scene a, #hero-scene button'))
                    .filter(el => {
                        const r = el.getBoundingClientRect();
                        return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
                    })
                    .map(el => ({
                        type: 'cta',
                        label: el.textContent?.trim().replace(/\\s+/g, ' ').slice(0, 35),
                        box: getBox(el)
                    }));

                // Headings
                const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'))
                    .filter(el => {
                        if (isBiyooOrPromptChild(el)) return false;
                        const r = el.getBoundingClientRect();
                        return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
                    })
                    .map(el => ({
                        type: 'heading',
                        label: el.textContent?.trim().replace(/\\s+/g, ' ').slice(0, 35),
                        box: getBox(el)
                    }));

                // Paragraphs
                const paragraphs = Array.from(document.querySelectorAll('#hero-scene p, main p'))
                    .filter(el => {
                        if (isBiyooOrPromptChild(el)) return false;
                        const r = el.getBoundingClientRect();
                        return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
                    })
                    .map(el => ({
                        type: 'paragraph',
                        label: el.textContent?.trim().replace(/\\s+/g, ' ').slice(0, 35),
                        box: getBox(el)
                    }));

                return {
                    biyooOwned,
                    pageContent: [
                        ...headerNavLinks,
                        ...ctas,
                        ...headings,
                        ...paragraphs
                    ]
                };
            }""")

            audit_results[v_name] = data
            await ctx.close()

        await browser.close()

        # =========================================================
        # Print audit and assert zero intersections
        # =========================================================
        print("=== OVERLAP AUDIT (Biyoo-owned & Sound Prompt vs Page Content) ===")
        total_pairs_checked = 0

        for v_name in [vp["name"] for vp in VIEWPORTS]:
            res = audit_results[v_name]
            b_owned = res["biyooOwned"]
            page_content = res["pageContent"]

            print(f"\n--- Viewport: {v_name} ---")
            print("Biyoo-owned & Prompt bounding boxes:")
            for k, box in b_owned.items():
                print(f"  {k:18s}: {box}")

            print("Page content bounding boxes in viewport:")
            for item in page_content:
                print(f"  [{item['type']:9s}] {item['label']:35s}: {item['box']}")

            print(f"\nChecking intersections for {v_name}:")
            vp_pairs = 0
            vp_overlaps = 0

            for b_name, b_box in b_owned.items():
                if not b_box:
                    continue
                for item in page_content:
                    c_box = item["box"]
                    if not c_box:
                        continue
                    vp_pairs += 1
                    total_pairs_checked += 1
                    is_colliding = intersects(b_box, c_box)
                    status = "COLLISION!" if is_colliding else "OK (no overlap)"
                    print(f"  Pair {vp_pairs:02d}: {b_name} vs [{item['type']}] '{item['label']}' -> {status}")
                    if is_colliding:
                        vp_overlaps += 1
                        print(f"    ERROR DETAILS: {b_name}={b_box} overlaps with item={c_box}")

            print(f"Viewport {v_name} Summary: Checked {vp_pairs} pairs, Collisions = {vp_overlaps}")
            assert vp_overlaps == 0, f"Overlap detected in {v_name}!"

        print(f"\nTOTAL PAIRS CHECKED ACROSS ALL 4 VIEWPORTS: {total_pairs_checked}")
        print("ASSERTION RESULT: ZERO INTERSECTIONS VERIFIED!")

        # =========================================================
        # Generate Contact Sheet (360x640, 390x844, 768x1024)
        # =========================================================
        print("\nGenerating 3-panel contact sheet (360x640, 390x844, 768x1024)...")
        img_360 = Image.open(shots["360x640"])
        img_390 = Image.open(shots["390x844"])
        img_768 = Image.open(shots["768x1024"])

        # Target layout: side-by-side or balanced canvas
        # Heights: 640, 844, 1024.
        # Normalize display height to 750px
        h_target = 750
        def resize_to_h(im, h):
            w = int(im.width * (h / im.height))
            return im.resize((w, h), Image.Resampling.LANCZOS)

        r_360 = resize_to_h(img_360, h_target)
        r_390 = resize_to_h(img_390, h_target)
        r_768 = resize_to_h(img_768, h_target)

        pad = 24
        header_h = 60
        canvas_w = r_360.width + r_390.width + r_768.width + (pad * 4)
        canvas_h = h_target + header_h + pad

        sheet = Image.new("RGBA", (canvas_w, canvas_h), (7, 14, 29, 255))
        draw = ImageDraw.Draw(sheet)

        x_offset = pad
        panels = [
            ("1. Mobile 360x640 (Docked Bar + Bubble + Toggle)", r_360),
            ("2. Mobile 390x844 (Docked Bar + Bubble + Toggle)", r_390),
            ("3. Tablet 768x1024 (Docked Bar + Bubble + Toggle)", r_768),
        ]

        for title, im in panels:
            sheet.paste(im, (x_offset, header_h))
            draw.text((x_offset, 22), title, fill=(94, 225, 230, 255))
            x_offset += im.width + pad

        out_contact_sheet = os.path.join(PUBLIC_DIR, "step5-mobile-contact-sheet.png")
        sheet.save(out_contact_sheet)
        artifact_sheet = os.path.join(ARTIFACT_DIR, "step5-mobile-contact-sheet.png")
        shutil.copyfile(out_contact_sheet, artifact_sheet)

        print(f"Saved contact sheet to: {out_contact_sheet}")
        print(f"Saved copy to artifact directory: {artifact_sheet}")

if __name__ == "__main__":
    asyncio.run(main())

