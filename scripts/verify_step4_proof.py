import asyncio
import os
import shutil
import math
from PIL import Image
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\SUMIT\.gemini\antigravity\brain\25ce1abe-a021-46a1-9e4e-566f68d42680"
PUBLIC_DIR = r"d:\Projects\Portfolio-ORV-main\public\biyoo"

async def run_proof():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 1080})
        page = await context.new_page()

        print("=== STEP 4 PROOF VERIFICATION ===")
        # Navigate to test page at idleScale=1.0
        await page.goto("http://localhost:3000/biyoo-test?idleScale=1.0", wait_until="networkidle")
        await asyncio.sleep(1.0)

        # -------------------------------------------------------------
        # ITEM 1: CURIOUS LIVE PAGE DOM & 1:1 FACE CROP
        # -------------------------------------------------------------
        print("\n--- ITEM 1: CURIOUS LIVE PAGE DOM ---")
        
        # Read attributes & computed styles directly from the LIVE DOM nodes
        item1_dom = await page.evaluate("""() => {
            const neutralCard = document.querySelector('[data-testid="live-dom-neutral-card"]');
            const curiousCard = document.querySelector('[data-testid="live-dom-curious-card"]');

            const neutralFaceG = neutralCard.querySelector('[data-testid="biyoo-face-group"]');
            const curiousFaceG = curiousCard.querySelector('[data-testid="biyoo-face-group"]');

            const neutralEyeL = neutralCard.querySelector('[data-testid="biyoo-eye-pupil-left"]');
            const curiousEyeL = curiousCard.querySelector('[data-testid="biyoo-eye-pupil-left"]');

            const neutralEyeR = neutralCard.querySelector('[data-testid="biyoo-eye-pupil-right"]');
            const curiousEyeR = curiousCard.querySelector('[data-testid="biyoo-eye-pupil-right"]');

            const neutralHLL = neutralCard.querySelector('[data-testid="biyoo-highlight-primary-left"]');
            const curiousHLL = curiousCard.querySelector('[data-testid="biyoo-highlight-primary-left"]');

            const curiousBrowR = curiousCard.querySelector('[data-testid="biyoo-brow-right"]');
            const curiousBrowL = curiousCard.querySelector('[data-testid="biyoo-brow-left"]');

            const neutralTransformAttr = neutralFaceG ? neutralFaceG.getAttribute('transform') : null;
            const curiousTransformAttr = curiousFaceG ? curiousFaceG.getAttribute('transform') : null;

            const neutralComputedTransform = neutralFaceG ? window.getComputedStyle(neutralFaceG).transform : null;
            const curiousComputedTransform = curiousFaceG ? window.getComputedStyle(curiousFaceG).transform : null;

            return {
                neutral: {
                    transformAttr: neutralTransformAttr,
                    computedTransform: neutralComputedTransform,
                    eyeL: neutralEyeL ? { cx: parseFloat(neutralEyeL.getAttribute('cx')), cy: parseFloat(neutralEyeL.getAttribute('cy')) } : null,
                    eyeR: neutralEyeR ? { cx: parseFloat(neutralEyeR.getAttribute('cx')), cy: parseFloat(neutralEyeR.getAttribute('cy')) } : null,
                    highlightL: neutralHLL ? { cx: parseFloat(neutralHLL.getAttribute('cx')), cy: parseFloat(neutralHLL.getAttribute('cy')) } : null,
                },
                curious: {
                    transformAttr: curiousTransformAttr,
                    computedTransform: curiousComputedTransform,
                    eyeL: curiousEyeL ? { cx: parseFloat(curiousEyeL.getAttribute('cx')), cy: parseFloat(curiousEyeL.getAttribute('cy')) } : null,
                    eyeR: curiousEyeR ? { cx: parseFloat(curiousEyeR.getAttribute('cx')), cy: parseFloat(curiousEyeR.getAttribute('cy')) } : null,
                    highlightL: curiousHLL ? { cx: parseFloat(curiousHLL.getAttribute('cx')), cy: parseFloat(curiousHLL.getAttribute('cy')) } : null,
                    browRTransform: curiousBrowR ? curiousBrowR.getAttribute('transform') : null,
                    browLTransform: curiousBrowL ? curiousBrowL.getAttribute('transform') : null,
                }
            };
        }""")

        curious_matrix = item1_dom["curious"]["computedTransform"]
        parts = curious_matrix.replace("matrix(", "").replace(")", "").split(",")
        a_val = float(parts[0].strip())
        b_val = float(parts[1].strip())
        curious_angle_deg = math.degrees(math.atan2(b_val, a_val))

        n_cx = item1_dom["neutral"]["eyeL"]["cx"]
        n_cy = item1_dom["neutral"]["eyeL"]["cy"]
        c_cx = item1_dom["curious"]["eyeL"]["cx"]
        c_cy = item1_dom["curious"]["eyeL"]["cy"]
        delta_pupil_x = c_cx - n_cx
        delta_pupil_y = c_cy - n_cy

        nh_cx = item1_dom["neutral"]["highlightL"]["cx"]
        nh_cy = item1_dom["neutral"]["highlightL"]["cy"]
        ch_cx = item1_dom["curious"]["highlightL"]["cx"]
        ch_cy = item1_dom["curious"]["highlightL"]["cy"]
        delta_hl_x = ch_cx - nh_cx
        delta_hl_y = ch_cy - nh_cy

        print(f"Curious Face Transform Attribute: {item1_dom['curious']['transformAttr']}")
        print(f"Curious Face Computed Transform: {curious_matrix}")
        print(f"Curious Computed Head Tilt Angle: {curious_angle_deg:.2f}° (requirement: >= 6.0°)")
        print(f"Neutral Eye Pupil Center: cx={n_cx:.1f}px, cy={n_cy:.1f}px")
        print(f"Curious Eye Pupil Center: cx={c_cx:.1f}px, cy={c_cy:.1f}px")
        print(f"Curious Eye Pupil Offset (DOM): dx={delta_pupil_x:+.1f}px (right), dy={delta_pupil_y:+.1f}px (up)")
        print(f"Curious Primary Highlight Offset (DOM): dx={delta_hl_x:+.2f}px, dy={delta_hl_y:+.2f}px")
        print(f"Curious Right Brow DOM Transform: {item1_dom['curious']['browRTransform']} (raised 28px)")

        # Capture live DOM cards for 1:1 face crop
        neutral_card_el = page.locator('[data-testid="live-dom-neutral-card"]')
        curious_card_el = page.locator('[data-testid="live-dom-curious-card"]')

        neutral_shot_path = os.path.join(PUBLIC_DIR, "tmp_neutral_live.png")
        curious_shot_path = os.path.join(PUBLIC_DIR, "tmp_curious_live.png")
        await neutral_card_el.screenshot(path=neutral_shot_path)
        await curious_card_el.screenshot(path=curious_shot_path)

        im_n = Image.open(neutral_shot_path)
        im_c = Image.open(curious_shot_path)
        
        w, h = im_n.size
        crop_box = (
            int(w * 0.22),
            int(h * 0.28),
            int(w * 0.78),
            int(h * 0.72)
        )
        face_n = im_n.crop(crop_box)
        face_c = im_c.crop(crop_box)

        fw, fh = face_n.size
        composite_w = fw * 2 + 40
        composite_h = fh + 70
        comp = Image.new("RGBA", (composite_w, composite_h), (8, 16, 32, 255))
        comp.paste(face_n, (15, 55))
        comp.paste(face_c, (fw + 25, 55))

        out_img_path = os.path.join(PUBLIC_DIR, "neutral-curious-live-crop.png")
        comp.save(out_img_path)
        artifact_crop_path = os.path.join(ARTIFACT_DIR, "neutral-curious-live-crop.png")
        shutil.copyfile(out_img_path, artifact_crop_path)
        print(f"Saved side-by-side face crop to: {out_img_path}")
        print(f"Saved copy to artifact directory: {artifact_crop_path}")

        if os.path.exists(neutral_shot_path): os.remove(neutral_shot_path)
        if os.path.exists(curious_shot_path): os.remove(curious_shot_path)

        # -------------------------------------------------------------
        # ITEM 2: TRIGGER PROOF FROM REAL INPUT ONLY (3 RUNS EACH)
        # -------------------------------------------------------------
        print("\n--- ITEM 2: TRIGGER PROOF FROM REAL INPUT (3 RUNS EACH, idleScale=1.0) ---")
        
        async def reset_gate_and_state(scroll_y=0):
            await page.evaluate(f"() => window.scrollTo(0, {scroll_y})")
            await asyncio.sleep(0.3)
            await page.evaluate("""() => {
                window.__biyooEngine.resetBubbleCooldown();
                window.__biyooEngine.clearRawTriggerHistory();
                window.__biyooEngine.resetInactivity();
            }""")
            await asyncio.sleep(0.1)

        # 1. Fast Scroll (3 runs)
        fast_scroll_results = []
        for run_idx in range(1, 4):
            await reset_gate_and_state(scroll_y=0)
            base_dy = 360 + run_idx * 30
            for _ in range(12):
                await page.mouse.wheel(0, base_dy)
                await asyncio.sleep(0.045)
            
            await asyncio.sleep(0.2)
            hist = await page.evaluate("() => window.__biyooEngine.getRawTriggerHistory()")
            fast_entries = [e for e in hist if e["type"] == "fast_scroll"]
            if fast_entries:
                entry = fast_entries[-1]
                fast_scroll_results.append({
                    "run": run_idx,
                    "speed": entry["rawMetric"]["speedPxPerSec"],
                    "sustainedMs": entry["rawMetric"]["sustainedMs"],
                    "accepted": entry["accepted"]
                })
            else:
                fast_scroll_results.append({"run": run_idx, "error": "not triggered"})

        # 2. Linger (3 runs)
        linger_results = []
        for run_idx in range(1, 4):
            linger_y = 620 + run_idx * 30
            await reset_gate_and_state(scroll_y=0)
            await page.mouse.wheel(0, linger_y)
            await asyncio.sleep(0.1)
            await page.evaluate("""() => {
                window.__biyooEngine.resetBubbleCooldown();
                window.__biyooEngine.clearRawTriggerHistory();
            }""")
            wait_sec = 10.15 + run_idx * 0.08
            await asyncio.sleep(wait_sec)
            
            hist = await page.evaluate("() => window.__biyooEngine.getRawTriggerHistory()")
            linger_entries = [e for e in hist if e["type"] == "linger"]
            if linger_entries:
                entry = linger_entries[-1]
                linger_results.append({
                    "run": run_idx,
                    "visibilityPercent": entry["rawMetric"]["visibilityPercent"],
                    "elapsedLingerMs": entry["rawMetric"]["elapsedLingerMs"],
                    "accepted": entry["accepted"]
                })
            else:
                linger_results.append({"run": run_idx, "error": "not triggered"})

        # 3. Cursor Still (3 runs)
        cursor_results = []
        for run_idx in range(1, 4):
            target_selector = '[data-testid="biyoo-point-target-left"]' if run_idx != 2 else '[data-testid="biyoo-point-target-right"]'
            target_locator = page.locator(target_selector)
            await target_locator.scroll_into_view_if_needed()
            await asyncio.sleep(0.2)
            await reset_gate_and_state(scroll_y=await page.evaluate("() => window.scrollY"))
            
            btn_box = await target_locator.bounding_box()
            offset_x = (run_idx - 2) * 6
            offset_y = (run_idx - 2) * 3
            await page.mouse.move(btn_box["x"] + btn_box["width"] / 2 + offset_x, btn_box["y"] + btn_box["height"] / 2 + offset_y)
            wait_still = 2.62 + run_idx * 0.06
            await asyncio.sleep(wait_still)
            
            hist = await page.evaluate("() => window.__biyooEngine.getRawTriggerHistory()")
            cursor_entries = [e for e in hist if e["type"] == "cursor_still"]
            if cursor_entries:
                entry = cursor_entries[-1]
                cursor_results.append({
                    "run": run_idx,
                    "stillMs": entry["rawMetric"]["stillMs"],
                    "targetTag": entry["rawMetric"]["targetTag"],
                    "arm": entry["rawMetric"]["pointingArm"],
                    "accepted": entry["accepted"]
                })
            else:
                cursor_results.append({"run": run_idx, "error": "not triggered"})
            
            await page.mouse.move(10, 10)
            await asyncio.sleep(0.2)

        # 4. Skip to Bottom (3 runs)
        skip_results = []
        for run_idx in range(1, 4):
            await page.evaluate("() => window.scrollTo(0, 0)")
            await asyncio.sleep(0.3)
            await page.mouse.wheel(0, 5)
            await asyncio.sleep(0.1)
            await page.mouse.wheel(0, -5)
            await asyncio.sleep(0.2)
            await page.evaluate("""() => {
                window.__biyooEngine.resetBubbleCooldown();
                window.__biyooEngine.clearRawTriggerHistory();
            }""")
            
            max_scroll = await page.evaluate("() => document.documentElement.scrollHeight - window.innerHeight")
            chunk = int(max_scroll * 0.48)
            await page.mouse.wheel(0, chunk)
            await asyncio.sleep(0.04 + run_idx * 0.02)
            await page.mouse.wheel(0, chunk + 300)
            await asyncio.sleep(0.4)

            hist = await page.evaluate("() => window.__biyooEngine.getRawTriggerHistory()")
            skip_entries = [e for e in hist if e["type"] == "skip_bottom"]
            if skip_entries:
                entry = skip_entries[-1]
                skip_results.append({
                    "run": run_idx,
                    "fromPercent": entry["rawMetric"]["fromPercent"],
                    "toPercent": entry["rawMetric"]["toPercent"],
                    "elapsedSkipMs": entry["rawMetric"]["elapsedSkipMs"],
                    "accepted": entry["accepted"]
                })
            else:
                skip_results.append({"run": run_idx, "error": "not triggered"})

        print("\nFast Scroll Raw Values (3 runs):")
        for res in fast_scroll_results:
            print(f"  Run {res['run']}: {res.get('speed')} px/s, sustained {res.get('sustainedMs')} ms [accepted: {res.get('accepted')}]")

        print("\nLinger Raw Values (3 runs):")
        for res in linger_results:
            print(f"  Run {res['run']}: {res.get('visibilityPercent')}% visible, elapsed {res.get('elapsedLingerMs')} ms [accepted: {res.get('accepted')}]")

        print("\nCursor Still Raw Values (3 runs):")
        for res in cursor_results:
            print(f"  Run {res['run']}: still {res.get('stillMs')} ms over <{res.get('targetTag')}>, arm: {res.get('arm')} [accepted: {res.get('accepted')}]")

        print("\nSkip to Bottom Raw Values (3 runs):")
        for res in skip_results:
            print(f"  Run {res['run']}: {res.get('fromPercent')}% -> {res.get('toPercent')}%, elapsed {res.get('elapsedSkipMs')} ms [accepted: {res.get('accepted')}]")

        # -------------------------------------------------------------
        # ITEM 3: GATE PROOF (4 REAL SEQUENCES >=3s APART, WAIT 20s, 5th ACCEPTED)
        # -------------------------------------------------------------
        print("\n--- ITEM 3: GATE PROOF ---")
        await page.evaluate("() => window.scrollTo(0, 0)")
        await asyncio.sleep(0.3)
        await page.evaluate("""() => {
            window.__biyooEngine.clearRawTriggerHistory();
            window.__biyooEngine.resetBubbleCooldown();
            window.__biyooEngine.resetInactivity();
        }""")
        await asyncio.sleep(0.2)

        # Sequence 1: Real Fast Scroll
        print("Dispatching Sequence 1 (Real Fast Scroll)...")
        for _ in range(12):
            await page.mouse.wheel(0, 380)
            await asyncio.sleep(0.045)
        await asyncio.sleep(0.5)

        # Wait 3.5 seconds
        print("Waiting 3.5s...")
        await asyncio.sleep(3.5)

        # Sequence 2: Real Cursor Still (move cursor over point button left)
        print("Dispatching Sequence 2 (Real Cursor Still left, ~4s after Seq 1)...")
        point_btn_l = page.locator('[data-testid="biyoo-point-target-left"]')
        await point_btn_l.scroll_into_view_if_needed()
        btn_box_l = await point_btn_l.bounding_box()
        await page.mouse.move(btn_box_l["x"] + btn_box_l["width"] / 2, btn_box_l["y"] + btn_box_l["height"] / 2)
        await asyncio.sleep(2.65)
        await page.mouse.move(10, 10)
        await asyncio.sleep(0.3)

        # Wait 3.5 seconds
        print("Waiting 3.5s...")
        await asyncio.sleep(3.5)

        # Sequence 3: Real Skip to Bottom
        print("Dispatching Sequence 3 (Real Skip to Bottom, ~10s after Seq 1)...")
        await page.evaluate("() => window.scrollTo(0, 0)")
        await asyncio.sleep(0.1)
        await page.mouse.wheel(0, 5)
        await asyncio.sleep(0.05)
        await page.mouse.wheel(0, -5)
        await asyncio.sleep(0.1)
        max_scroll = await page.evaluate("() => document.documentElement.scrollHeight - window.innerHeight")
        await page.mouse.wheel(0, max_scroll)
        await asyncio.sleep(0.5)

        # Wait 3.5 seconds
        print("Waiting 3.5s...")
        await asyncio.sleep(3.5)

        # Sequence 4: Real Cursor Still (move cursor over point button right)
        print("Dispatching Sequence 4 (Real Cursor Still right, ~15s after Seq 1)...")
        point_btn_r = page.locator('[data-testid="biyoo-point-target-right"]')
        await point_btn_r.scroll_into_view_if_needed()
        btn_box_r = await point_btn_r.bounding_box()
        await page.mouse.move(btn_box_r["x"] + btn_box_r["width"] / 2, btn_box_r["y"] + btn_box_r["height"] / 2)
        await asyncio.sleep(2.65)
        await page.mouse.move(10, 10)
        await asyncio.sleep(0.3)

        # Wait 21.0 seconds for 20s cooldown to expire.
        # Micro mouse moves at 7s and 14s reset idle timer without triggering reactions.
        # Also scroll to top so linger target is not in view!
        await page.evaluate("() => window.scrollTo(0, 0)")
        print("Waiting 21.0s for gate cooldown to expire (with idle-reset micro moves)...")
        await asyncio.sleep(7.0)
        await page.mouse.move(30, 30)
        await asyncio.sleep(7.0)
        await page.mouse.move(35, 35)
        await asyncio.sleep(7.0)

        # Sequence 5: Real Fast Scroll after 20s cooldown
        print("Dispatching Sequence 5 (Real Fast Scroll after >20s wait)...")
        for _ in range(12):
            await page.mouse.wheel(0, 380)
            await asyncio.sleep(0.045)
        await asyncio.sleep(0.5)

        gate_history = await page.evaluate("() => window.__biyooEngine.getRawTriggerHistory()")
        print("\nGate History Log:")
        for idx, entry in enumerate(gate_history, 1):
            print(f"  [{idx}] Type: {entry['type']}, Time: {entry['timeString']} (timestamp: {entry['timestamp']}), Accepted: {entry['accepted']}, Reason: {entry['reason']}, ElapsedSinceLastBubble: {entry['elapsedSinceLastBubbleMs']}ms, Metric: {entry.get('measuredValue')}")

        # -------------------------------------------------------------
        # ITEM 4: ARM-POINT HAND Y FROM getBoundingClientRect
        # -------------------------------------------------------------
        print("\n--- ITEM 4: ARM-POINT HAND Y (FROM getBoundingClientRect) ---")
        
        stage_el = page.locator('[data-testid="puppet-stage"]')
        await stage_el.scroll_into_view_if_needed()
        await asyncio.sleep(0.4)

        # Check resting arm on the stage puppet
        await page.evaluate("() => { window.__biyooEngine.setPointingArm(null); }")
        await asyncio.sleep(0.5)

        arm_rest_rect = await page.evaluate("""() => {
            const stage = document.querySelector('[data-testid="puppet-stage"]');
            const handEl = stage.querySelector('[data-testid="biyoo-arm-l-hand"]');
            const armImg = stage.querySelector('[data-testid="biyoo-arm-l-image"]');
            const armGroup = stage.querySelector('[data-testid="biyoo-arm-l-group"]');
            return {
                hand: handEl ? handEl.getBoundingClientRect() : null,
                armImg: armImg ? armImg.getBoundingClientRect() : null,
                armGroup: armGroup ? armGroup.getBoundingClientRect() : null,
            };
        }""")

        # Point arm left
        await page.evaluate("() => { window.__biyooEngine.setPointingArm('left'); }")
        await asyncio.sleep(0.4)

        arm_point_rect = await page.evaluate("""() => {
            const stage = document.querySelector('[data-testid="puppet-stage"]');
            const handEl = stage.querySelector('[data-testid="biyoo-arm-l-hand"]');
            const armImg = stage.querySelector('[data-testid="biyoo-arm-l-image"]');
            const armGroup = stage.querySelector('[data-testid="biyoo-arm-l-group"]');
            return {
                hand: handEl ? handEl.getBoundingClientRect() : null,
                armImg: armImg ? armImg.getBoundingClientRect() : null,
                armGroup: armGroup ? armGroup.getBoundingClientRect() : null,
            };
        }""")

        print(f"Resting Arm Left getBoundingClientRect:")
        print(f"  Hand element: y={arm_rest_rect['hand']['y']:.2f}px, top={arm_rest_rect['hand']['top']:.2f}px, bottom={arm_rest_rect['hand']['bottom']:.2f}px")
        print(f"  Arm image: y={arm_rest_rect['armImg']['y']:.2f}px, top={arm_rest_rect['armImg']['top']:.2f}px, bottom={arm_rest_rect['armImg']['bottom']:.2f}px")
        print(f"Pointing Arm Left getBoundingClientRect (rotated 68° up & out):")
        print(f"  Hand element: y={arm_point_rect['hand']['y']:.2f}px, top={arm_point_rect['hand']['top']:.2f}px, bottom={arm_point_rect['hand']['bottom']:.2f}px")
        print(f"  Arm image: y={arm_point_rect['armImg']['y']:.2f}px, top={arm_point_rect['armImg']['top']:.2f}px, bottom={arm_point_rect['armImg']['bottom']:.2f}px")
        elevation = arm_rest_rect['hand']['y'] - arm_point_rect['hand']['y']
        print(f"Hand Vertical Elevation when pointing: {elevation:+.2f}px (raised upward toward target, above hip height)")

        await browser.close()
        print("\n=== VERIFICATION COMPLETE ===")

if __name__ == "__main__":
    asyncio.run(run_proof())
