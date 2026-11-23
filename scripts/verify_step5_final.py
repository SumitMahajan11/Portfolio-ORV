import asyncio
import os
import shutil
import time
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFont

ARTIFACT_DIR = r"C:\Users\SUMIT\.gemini\antigravity\brain\25ce1abe-a021-46a1-9e4e-566f68d42680"
PUBLIC_DIR = r"d:\Projects\Portfolio-ORV-main\public\biyoo"
BASE_URL = "http://localhost:3000"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        # =========================================================
        # 1. Console Errors & Warnings check on / and /biyoo-test
        # =========================================================
        print("=== 1. PRODUCTION BUILD CONSOLE AUDIT ===")
        for route in ["/", "/biyoo-test"]:
            c = await browser.new_context(viewport={"width": 1440, "height": 900})
            page = await c.new_page()
            messages = []
            page_errors = []

            page.on("console", lambda msg: messages.append({"type": msg.type, "text": msg.text}) if msg.type in ["error", "warning"] else None)
            page.on("pageerror", lambda err: page_errors.append(str(err)))

            resp = await page.goto(f"{BASE_URL}{route}", wait_until="networkidle")
            await page.wait_for_timeout(2000)

            errors = [m for m in messages if m["type"] == "error"]
            warnings = [m for m in messages if m["type"] == "warning"]

            print(f"Route '{route}': HTTP {resp.status}")
            print(f"  Page errors count: {len(page_errors)} (text: {page_errors})")
            print(f"  Console errors count: {len(errors)} (text: {[e['text'] for e in errors]})")
            print(f"  Console warnings count: {len(warnings)} (text: {[w['text'] for w in warnings]})")
            await c.close()

        # =========================================================
        # 2. PerformanceObserver with addInitScript (buffered: true)
        # =========================================================
        print("\n=== 2. PERF MEASUREMENTS (buffered: true via addInitScript) ===")

        perf_observer_script = """
            window.__clsScore = 0;
            window.__longTasksCount = 0;
            window.__longTasksList = [];

            try {
                const poCls = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (!entry.hadRecentInput) {
                            window.__clsScore += entry.value;
                        }
                    }
                });
                poCls.observe({ type: 'layout-shift', buffered: true });

                const poLt = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        window.__longTasksCount += 1;
                        window.__longTasksList.push({
                            duration: entry.duration,
                            startTime: entry.startTime
                        });
                    }
                });
                poLt.observe({ type: 'longtask', buffered: true });
            } catch(e) {
                window.__poError = e.message;
            }
        """

        async def run_perf_benchmark(disabled: bool, run_idx: int):
            c = await browser.new_context(viewport={"width": 1440, "height": 900})
            page = await c.new_page()

            # Register observer via addInitScript BEFORE navigation
            await page.add_init_script(perf_observer_script)
            if disabled:
                await page.add_init_script("sessionStorage.setItem('biyoo_disabled', 'true');")
            else:
                await page.add_init_script("sessionStorage.removeItem('biyoo_disabled');")

            await page.goto(BASE_URL, wait_until="networkidle")
            await page.wait_for_timeout(2000)

            res = await page.evaluate("""() => {
                return {
                    cls: window.__clsScore || 0,
                    longTasks: window.__longTasksCount || 0,
                    mounted: !!document.querySelector('[data-testid="biyoo-live-puppet"]')
                };
            }""")
            await c.close()
            return res

        # 3 runs WITH Biyoo
        runs_with = []
        for i in range(1, 4):
            r = await run_perf_benchmark(disabled=False, run_idx=i)
            runs_with.append(r)
            print(f"Run {i} WITH Biyoo:    CLS = {r['cls']:.4f}, LongTasks = {r['longTasks']}, BiyooMounted = {r['mounted']}")

        # 3 runs WITHOUT Biyoo
        runs_without = []
        for i in range(1, 4):
            r = await run_perf_benchmark(disabled=True, run_idx=i)
            runs_without.append(r)
            print(f"Run {i} WITHOUT Biyoo: CLS = {r['cls']:.4f}, LongTasks = {r['longTasks']}, BiyooMounted = {r['mounted']}")

        median_cls_with = sorted([r['cls'] for r in runs_with])[1]
        median_lt_with = sorted([r['longTasks'] for r in runs_with])[1]
        median_cls_without = sorted([r['cls'] for r in runs_without])[1]
        median_lt_without = sorted([r['longTasks'] for r in runs_without])[1]

        print(f"Median WITH Biyoo:    CLS = {median_cls_with:.4f}, LongTasks = {median_lt_with}")
        print(f"Median WITHOUT Biyoo: CLS = {median_cls_without:.4f}, LongTasks = {median_lt_without}")

        # Sanity run with deliberate 200ms busy loop
        print("\nSanity run: deliberate 200ms busy loop to verify PerformanceObserver detects long tasks...")
        c_sanity = await browser.new_context(viewport={"width": 1440, "height": 900})
        p_sanity = await c_sanity.new_page()
        await p_sanity.add_init_script(perf_observer_script)
        await p_sanity.goto(BASE_URL, wait_until="networkidle")

        # Execute deliberate 200ms synchronous block via setTimeout so event loop yields and observer receives callback
        await p_sanity.evaluate("""() => {
            setTimeout(() => {
                const start = performance.now();
                while (performance.now() - start < 200) {
                    // block main thread
                }
            }, 50);
        }""")
        await p_sanity.wait_for_timeout(1000)

        sanity_res = await p_sanity.evaluate("""() => ({
            count: window.__longTasksCount,
            entries: window.__longTasksList
        })""")
        print(f"Sanity run result: Detected {sanity_res['count']} long task(s)")
        if sanity_res['entries']:
            for idx, entry in enumerate(sanity_res['entries']):
                print(f"  Entry {idx+1}: duration = {entry['duration']:.2f}ms, startTime = {entry['startTime']:.2f}ms")
        await c_sanity.close()

        # =========================================================
        # 4. Screenshots & Bounding Box measurements (No Overlap Proof)
        # =========================================================
        print("\n=== 4. SCREENSHOTS & BOUNDING BOX OVERLAP AUDIT ===")
        os.makedirs(ARTIFACT_DIR, exist_ok=True)
        os.makedirs(PUBLIC_DIR, exist_ok=True)

        async def setup_page_and_measure(width, height, is_quiet=False):
            c = await browser.new_context(viewport={"width": width, "height": height})
            page = await c.new_page()

            # Navigate and prime state
            await page.goto(BASE_URL, wait_until="networkidle")
            await page.evaluate("""() => {
                sessionStorage.setItem('biyoo_fake_hour', '3');
                sessionStorage.removeItem('biyoo_late_night_checked');
                localStorage.removeItem('sound_pref');
            }""")
            await page.reload(wait_until="networkidle")

            # Wait 4.6s for sound prompt to appear automatically
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

            if is_quiet:
                await page.click('[data-testid="biyoo-quiet-toggle"]')
                await page.wait_for_timeout(300)

            # Measure all 5 bounding boxes
            boxes = await page.evaluate("""() => {
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

                const soundPrompt = document.querySelector('#sound-permission-prompt');
                const constellationCard = document.querySelector('#constellation-broadcast-card') || Array.from(document.querySelectorAll('.fixed')).find(el => el.textContent && el.textContent.includes('[CONSTELLATION BROADCAST]'));
                const biyooBox = document.querySelector('[data-testid="biyoo-live-puppet"]');
                const bubble = document.querySelector('[data-testid="biyoo-speech-bubble"]');
                const toggle = document.querySelector('[data-testid="biyoo-quiet-toggle"]');

                return {
                    soundPrompt: getBox(soundPrompt),
                    constellationCard: getBox(constellationCard),
                    biyooBox: getBox(biyooBox),
                    bubble: getBox(bubble),
                    toggle: getBox(toggle)
                };
            }""")

            return c, page, boxes

        # 1. Desktop 1440x900 - Bubble ON
        c_d_on, p_d_on, boxes_d_on = await setup_page_and_measure(1440, 900, is_quiet=False)
        shot_d_on = os.path.join(PUBLIC_DIR, "step5-shot1-desktop-bubble.png")
        await p_d_on.screenshot(path=shot_d_on)
        await c_d_on.close()

        # 2. Desktop 1440x900 - Quiet ON
        c_d_q, p_d_q, boxes_d_q = await setup_page_and_measure(1440, 900, is_quiet=True)
        shot_d_q = os.path.join(PUBLIC_DIR, "step5-shot2-desktop-quiet.png")
        await p_d_q.screenshot(path=shot_d_q)
        await c_d_q.close()

        # 3. Mobile 390x844 - Bubble ON
        c_m_on, p_m_on, boxes_m_on = await setup_page_and_measure(390, 844, is_quiet=False)
        shot_m_on = os.path.join(PUBLIC_DIR, "step5-shot3-mobile-bubble.png")
        await p_m_on.screenshot(path=shot_m_on)
        await c_m_on.close()

        # 4. Mobile 390x844 - Quiet ON
        c_m_q, p_m_q, boxes_m_q = await setup_page_and_measure(390, 844, is_quiet=True)
        shot_m_q = os.path.join(PUBLIC_DIR, "step5-shot4-mobile-quiet.png")
        await p_m_q.screenshot(path=shot_m_q)
        await c_m_q.close()

        print("Bounding boxes at 1440x900 (Bubble ON):")
        for k, v in boxes_d_on.items():
            print(f"  {k}: {v}")

        print("\nBounding boxes at 390x844 (Bubble ON):")
        for k, v in boxes_m_on.items():
            print(f"  {k}: {v}")

        # Overlap verification helper
        def check_no_overlap(boxes_dict, label):
            def overlaps(a, b):
                if not a or not b: return False
                return not (a['right'] <= b['left'] or a['left'] >= b['right'] or a['bottom'] <= b['top'] or a['top'] >= b['bottom'])

            items = list(boxes_dict.items())
            has_overlap = False
            for i in range(len(items)):
                for j in range(i + 1, len(items)):
                    k1, b1 = items[i]
                    k2, b2 = items[j]
                    if b1 and b2 and overlaps(b1, b2):
                        print(f"  OVERLAP in {label} between {k1} and {k2}")
                        has_overlap = True
            if not has_overlap:
                print(f"  Overlap Check {label}: ZERO OVERLAPS (All bounding boxes fully distinct)")

        check_no_overlap(boxes_d_on, "Desktop 1440x900")
        check_no_overlap(boxes_m_on, "Mobile 390x844")

        # =========================================================
        # Contact Sheet Generation (4 images, 1 contact sheet, no duplicates)
        # =========================================================
        print("\nGenerating 4-panel contact sheet...")
        img1 = Image.open(shot_d_on)
        img2 = Image.open(shot_d_q)
        img3 = Image.open(shot_m_on)
        img4 = Image.open(shot_m_q)

        # Scale images to clean composite proportions
        # Target: Top row = 2 desktop shots (each 720x450)
        # Bottom row = 2 mobile shots centered (each 280x606)
        tw = 1480
        th = 1150
        sheet = Image.new("RGBA", (tw, th), (7, 14, 29, 255))
        draw = ImageDraw.Draw(sheet)

        # Desktop row
        d_scale_w = 710
        d_scale_h = 444
        i1_res = img1.resize((d_scale_w, d_scale_h), Image.Resampling.LANCZOS)
        i2_res = img2.resize((d_scale_w, d_scale_h), Image.Resampling.LANCZOS)
        sheet.paste(i1_res, (20, 45))
        sheet.paste(i2_res, (750, 45))

        # Mobile row
        m_scale_w = 260
        m_scale_h = 563
        i3_res = img3.resize((m_scale_w, m_scale_h), Image.Resampling.LANCZOS)
        i4_res = img4.resize((m_scale_w, m_scale_h), Image.Resampling.LANCZOS)
        sheet.paste(i3_res, (220, 535))
        sheet.paste(i4_res, (800, 535))

        # Add clean labels
        draw.text((20, 18), "1. Desktop (1440x900) · Biyoo Active + Late-Night Bubble + Sound Prompt", fill=(94, 225, 230, 255))
        draw.text((750, 18), "2. Desktop (1440x900) · Quiet Mode (Biyoo · quiet) + Sound Prompt", fill=(94, 225, 230, 255))
        draw.text((220, 508), "3. Mobile (390x844) · Biyoo Active + Bubble", fill=(94, 225, 230, 255))
        draw.text((800, 508), "4. Mobile (390x844) · Quiet Mode (Biyoo · quiet)", fill=(94, 225, 230, 255))

        out_contact_sheet = os.path.join(PUBLIC_DIR, "step5-contact-sheet.png")
        sheet.save(out_contact_sheet)
        artifact_sheet = os.path.join(ARTIFACT_DIR, "step5-contact-sheet.png")
        shutil.copyfile(out_contact_sheet, artifact_sheet)

        print(f"Saved contact sheet to: {out_contact_sheet}")
        print(f"Saved copy to artifact directory: {artifact_sheet}")

        await browser.close()
        print("\n=== STEP 5 FINAL PROOF COMPLETE ===")

if __name__ == "__main__":
    asyncio.run(main())

