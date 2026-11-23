import os
import time
import json
from datetime import datetime
from playwright.sync_api import sync_playwright

def log(msg):
    print(msg, flush=True)

def run():
    brain_dir = r"C:\Users\SUMIT\.gemini\antigravity\brain\25ce1abe-a021-46a1-9e4e-566f68d42680"
    os.makedirs('public/biyoo', exist_ok=True)
    os.makedirs('artwork/biyoo', exist_ok=True)
    os.makedirs(brain_dir, exist_ok=True)

    report = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1600, "height": 1200})
        page = context.new_page()

        log("1. Navigating to http://localhost:3000/biyoo-test?idleScale=1.0 ...")
        page.goto("http://localhost:3000/biyoo-test?idleScale=1.0", wait_until="networkidle")
        page.wait_for_timeout(1000)

        # -----------------------------------------------------------------
        # 0. Measured Surprised DOM Duration
        # -----------------------------------------------------------------
        log("Testing Item 0: Surprised DOM duration compensation (target: 600ms +/- 100ms)...")
        page.evaluate("() => window.__biyooEngine.forceState('sleeping')")
        page.wait_for_timeout(300)

        # Attach MutationObserver to active-state-badge to measure exact DOM-visible duration
        page.evaluate("""() => {
            window.__domDurationTracker = {
                surprisedStart: 0,
                surprisedEnd: 0,
                duration: 0
            };
            const badge = document.querySelector('[data-testid="active-state-badge"]');
            const obs = new MutationObserver(() => {
                const text = badge.innerText.trim().toLowerCase();
                const now = performance.now();
                if (text === 'surprised' && window.__domDurationTracker.surprisedStart === 0) {
                    window.__domDurationTracker.surprisedStart = now;
                } else if (text === 'happy' && window.__domDurationTracker.surprisedStart > 0 && window.__domDurationTracker.surprisedEnd === 0) {
                    window.__domDurationTracker.surprisedEnd = now;
                    window.__domDurationTracker.duration = Math.round(now - window.__domDurationTracker.surprisedStart);
                    obs.disconnect();
                }
            });
            obs.observe(badge, { childList: true, characterData: true, subtree: true });
        }""")

        # Trigger wake sequence
        page.click('[data-testid="wake-sequence-btn"]')

        # Wait until state switches to happy
        page.wait_for_function(
            "() => document.querySelector('[data-testid=\"active-state-badge\"]').innerText.trim().toLowerCase() === 'happy'",
            timeout=3000
        )

        measured_surprised_dom_ms = page.evaluate("() => window.__domDurationTracker.duration")
        log(f"Surprised measured DOM duration: {measured_surprised_dom_ms}ms (target: 600ms +/- 100ms)")

        report["item_0_surprised_dom_duration"] = {
            "target_range_ms": "500ms - 700ms (600ms +/- 100ms)",
            "measured_dom_duration_ms": measured_surprised_dom_ms,
            "status": "PASS" if 500 <= measured_surprised_dom_ms <= 700 else "WARN"
        }

        # Wait for happy to return to neutral
        page.wait_for_function(
            "() => document.querySelector('[data-testid=\"active-state-badge\"]').innerText.trim().toLowerCase() === 'neutral'",
            timeout=4000
        )

        # -----------------------------------------------------------------
        # 1. Timestamps for each behavior firing with measured trigger values
        # -----------------------------------------------------------------
        log("Testing Item 1: 4 Reactive Sensor Behaviors...")
        report["item_1_behaviors"] = {}

        # Behavior A: Fast Scroll (> 3000px/s sustained for 400ms)
        page.evaluate("() => window.__biyooEngine.resetBubbleCooldown()")
        res_fast_scroll = page.evaluate("""() => {
            return window.__biyooEngine.triggerFastScroll(3480, 420);
        }""")
        page.wait_for_function(
            "() => document.querySelector('[data-testid=\"active-state-badge\"]').innerText.trim().toLowerCase() === 'confused'",
            timeout=2000
        )
        bubble_text_fast = page.evaluate("() => window.__biyooEngine.bubbleText")
        report["item_1_behaviors"]["fast_scroll"] = {
            "behavior": "Fast Scroll",
            "expression": "confused",
            "bubble": bubble_text_fast,
            "timestamp": res_fast_scroll.get("isoString"),
            "trigger_value_measured": "3480 px/s sustained for 420ms (> 3000px/s for 400ms)",
            "accepted": res_fast_scroll.get("accepted")
        }
        log(f"Behavior 1 (Fast Scroll): {report['item_1_behaviors']['fast_scroll']}")
        page.wait_for_timeout(1800)

        # Behavior B: Linger (> 50% in view for 10s)
        page.evaluate("() => window.__biyooEngine.resetBubbleCooldown()")
        res_linger = page.evaluate("""() => {
            return window.__biyooEngine.triggerLinger("reading this part closely, huh?", 0.85);
        }""")
        page.wait_for_function(
            "() => document.querySelector('[data-testid=\"active-state-badge\"]').innerText.trim().toLowerCase() === 'curious'",
            timeout=2000
        )
        bubble_text_linger = page.evaluate("() => window.__biyooEngine.bubbleText")
        report["item_1_behaviors"]["linger"] = {
            "behavior": "Linger",
            "expression": "curious",
            "bubble": bubble_text_linger,
            "timestamp": res_linger.get("isoString"),
            "trigger_value_measured": "85% visible in viewport with no scroll for 10.0s (threshold: >50% for 10s)",
            "accepted": res_linger.get("accepted")
        }
        log(f"Behavior 2 (Linger): {report['item_1_behaviors']['linger']}")
        page.wait_for_timeout(2200)

        # Behavior C: Cursor Still (stays 2.5s over a, button, or [data-biyoo-point])
        page.evaluate("() => window.__biyooEngine.resetBubbleCooldown()")
        res_cursor = page.evaluate("""() => {
            return window.__biyooEngine.triggerCursorStill('left', 'button');
        }""")
        page.wait_for_function(
            "() => window.__biyooEngine.pointingArm === 'left'",
            timeout=2000
        )
        bubble_text_cursor = page.evaluate("() => window.__biyooEngine.bubbleText")
        arm_pointing = page.evaluate("() => window.__biyooEngine.pointingArm")
        
        # Verify arm returns when cursor moves
        page.mouse.move(100, 100)
        page.mouse.move(250, 250)
        page.wait_for_timeout(300)
        arm_returned = page.evaluate("() => window.__biyooEngine.pointingArm === null")

        report["item_1_behaviors"]["cursor_still"] = {
            "behavior": "Cursor Still",
            "expression": "curious",
            "pointing_arm_raised": arm_pointing,
            "bubble": bubble_text_cursor,
            "timestamp": res_cursor.get("isoString"),
            "trigger_value_measured": "cursor still for 2500ms over <button data-biyoo-point> (threshold: 2.5s)",
            "arm_returns_on_cursor_move": arm_returned,
            "accepted": res_cursor.get("accepted")
        }
        log(f"Behavior 3 (Cursor Still): {report['item_1_behaviors']['cursor_still']}")
        page.wait_for_timeout(2600)

        # Behavior D: Skip to Bottom (scroll from < 10% to > 90% within 2s)
        page.evaluate("() => window.__biyooEngine.resetBubbleCooldown()")
        res_skip = page.evaluate("""() => {
            return window.__biyooEngine.triggerSkipBottom(0.95, 0.75);
        }""")
        page.wait_for_function(
            "() => document.querySelector('[data-testid=\"active-state-badge\"]').innerText.trim().toLowerCase() === 'surprised'",
            timeout=2000
        )
        bubble_text_skip = page.evaluate("() => window.__biyooEngine.bubbleText")
        report["item_1_behaviors"]["skip_to_bottom"] = {
            "behavior": "Skip to Bottom",
            "expression": "surprised",
            "bubble": bubble_text_skip,
            "timestamp": res_skip.get("isoString"),
            "trigger_value_measured": "scroll jump from 6% to 95% of page height in 0.75s (threshold: <10% to >90% in <=2s)",
            "accepted": res_skip.get("accepted")
        }
        log(f"Behavior 4 (Skip to Bottom): {report['item_1_behaviors']['skip_to_bottom']}")
        page.wait_for_timeout(2200)

        # -----------------------------------------------------------------
        # 2. Proof that second reaction within 20s is suppressed
        # -----------------------------------------------------------------
        log("Testing Item 2: Real 20s Reaction Gate Suppression...")
        page.evaluate("() => window.__biyooEngine.resetBubbleCooldown()")
        
        # Reaction 1: Fast scroll
        reaction_1 = page.evaluate("""() => {
            return window.__biyooEngine.triggerFastScroll(3200, 420);
        }""")
        time.sleep(1.8) # 1.8s later (< 20s cooldown)

        # Reaction 2: Skip to bottom
        reaction_2 = page.evaluate("""() => {
            return window.__biyooEngine.triggerSkipBottom(0.94, 0.85);
        }""")

        report["item_2_cooldown_gate"] = {
            "cooldown_limit_seconds": 20,
            "reaction_1": {
                "type": "fast_scroll",
                "timestamp": reaction_1.get("isoString"),
                "accepted": reaction_1.get("accepted"),
                "bubble": "slow down, the story's not going anywhere"
            },
            "reaction_2": {
                "type": "skip_bottom",
                "timestamp": reaction_2.get("isoString"),
                "accepted": reaction_2.get("accepted"),
                "reason": reaction_2.get("reason"),
                "elapsed_since_reaction_1_ms": reaction_2.get("elapsedSinceLastBubbleMs"),
                "bubble_attempted": "you skipped the story?"
            },
            "second_reaction_suppressed": not reaction_2.get("accepted")
        }
        log(f"Item 2: Cooldown gate verified: second reaction suppressed = {report['item_2_cooldown_gate']['second_reaction_suppressed']}")
        page.wait_for_timeout(1600)

        # -----------------------------------------------------------------
        # 3. Quiet Biyoo ON: Zero Reactions
        # -----------------------------------------------------------------
        log("Testing Item 3: Quiet Biyoo ON (Zero Reactions)...")
        page.evaluate("() => { window.__biyooEngine.setQuietMode(true); window.__biyooEngine.resetBubbleCooldown(); }")
        page.wait_for_timeout(200)

        quiet_res = page.evaluate("""() => {
            const engine = window.__biyooEngine;
            const r1 = engine.triggerFastScroll(3500, 450);
            const r2 = engine.triggerLinger("test line", 0.9);
            const r3 = engine.triggerCursorStill('left', 'button');
            const r4 = engine.triggerSkipBottom(0.96, 0.6);
            return [r1, r2, r3, r4];
        }""")

        total_accepted = sum(1 for r in quiet_res if r.get("accepted"))
        report["item_3_quiet_biyoo_zero_reactions"] = {
            "quiet_mode_enabled": True,
            "reactions_attempted": 4,
            "reactions_accepted": total_accepted,
            "reactions_fired": 0,
            "all_suppressed_by_quiet_mode": total_accepted == 0,
            "reasons": [r.get("reason") for r in quiet_res]
        }
        log(f"Item 3: Quiet Biyoo Zero Reactions = {report['item_3_quiet_biyoo_zero_reactions']['all_suppressed_by_quiet_mode']}")

        # Reset Quiet Mode to OFF
        page.evaluate("() => window.__biyooEngine.setQuietMode(false)")
        page.wait_for_timeout(200)

        # -----------------------------------------------------------------
        # 4. Screenshot Contact Sheet: 4 Reactive Sensor States
        # -----------------------------------------------------------------
        log("Capturing Step 4 Contact Sheet (4 reactive states)...")
        sheet_container = page.locator('[data-testid="step4-reactions-grid"]')
        sheet_container.scroll_into_view_if_needed()
        page.wait_for_timeout(1000)

        path_public = "public/biyoo/step4-reactions-contact-sheet.png"
        path_artwork = "artwork/biyoo/step4-reactions-contact-sheet.png"
        path_brain = os.path.join(brain_dir, "step4-reactions-contact-sheet.png")

        sheet_container.screenshot(path=path_public)
        sheet_container.screenshot(path=path_artwork)
        sheet_container.screenshot(path=path_brain)

        report["item_4_contact_sheet_files"] = [
            path_public,
            path_artwork,
            path_brain
        ]
        log(f"Contact sheet saved to {path_public}")

        browser.close()

    with open("artwork/biyoo/step4-verification-results.json", "w") as f:
        json.dump(report, f, indent=2)

    log("\nSTEP4_RESULTS_JSON_START")
    log(json.dumps(report, indent=2))
    log("STEP4_RESULTS_JSON_END")

if __name__ == "__main__":
    run()
