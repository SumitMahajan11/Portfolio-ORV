import json
import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1600, "height": 1200})
    page.goto('http://localhost:3000/biyoo-test?idleScale=1.0', wait_until='networkidle')
    page.wait_for_timeout(1000)
    
    # 1. Inspect live stage in Neutral
    page.evaluate("() => window.__biyooEngine.forceState('neutral', null, null, true)")
    page.wait_for_timeout(400)

    neutral_dom = page.evaluate("""() => {
        const stage = document.querySelector('[data-testid="puppet-stage"]');
        const faceG = stage.querySelector('svg > g > g'); // find the face group with transform
        // Let's find all g tags with transform inside stage
        const gList = Array.from(stage.querySelectorAll('g')).filter(g => g.getAttribute('transform'));
        const faceElem = gList.find(g => g.getAttribute('transform').includes('rotate'));
        
        // Eyeballs, pupils and highlights
        const ellipses = Array.from(stage.querySelectorAll('ellipse'));
        const circles = Array.from(stage.querySelectorAll('circle'));
        const paths = Array.from(stage.querySelectorAll('path'));
        
        return {
            faceTransformAttr: faceElem ? faceElem.getAttribute('transform') : null,
            faceComputedTransform: faceElem ? window.getComputedStyle(faceElem).transform : null,
            ellipses: ellipses.map(e => ({
                cx: e.getAttribute('cx'),
                cy: e.getAttribute('cy'),
                rx: e.getAttribute('rx'),
                ry: e.getAttribute('ry'),
                fill: e.getAttribute('fill')
            })),
            circles: circles.map(c => ({
                cx: c.getAttribute('cx'),
                cy: c.getAttribute('cy'),
                r: c.getAttribute('r'),
                fill: c.getAttribute('fill')
            })),
            faceParams: window.__biyooEngine.faceParams
        };
    }""")
    print("--- NEUTRAL LIVE STAGE DOM ---")
    print(json.dumps(neutral_dom, indent=2))

    # 2. Inspect live stage in Curious
    page.evaluate("() => window.__biyooEngine.forceState('curious', 'hey... still there?', null, true)")
    page.wait_for_timeout(500)

    curious_dom = page.evaluate("""() => {
        const stage = document.querySelector('[data-testid="puppet-stage"]');
        const gList = Array.from(stage.querySelectorAll('g')).filter(g => g.getAttribute('transform'));
        const faceElem = gList.find(g => g.getAttribute('transform').includes('rotate'));
        
        const ellipses = Array.from(stage.querySelectorAll('ellipse'));
        const circles = Array.from(stage.querySelectorAll('circle'));
        
        return {
            faceTransformAttr: faceElem ? faceElem.getAttribute('transform') : null,
            faceComputedTransform: faceElem ? window.getComputedStyle(faceElem).transform : null,
            ellipses: ellipses.map(e => ({
                cx: e.getAttribute('cx'),
                cy: e.getAttribute('cy'),
                rx: e.getAttribute('rx'),
                ry: e.getAttribute('ry'),
                fill: e.getAttribute('fill')
            })),
            circles: circles.map(c => ({
                cx: c.getAttribute('cx'),
                cy: c.getAttribute('cy'),
                r: c.getAttribute('r'),
                fill: c.getAttribute('fill')
            })),
            faceParams: window.__biyooEngine.faceParams
        };
    }""")
    print("\n--- CURIOUS LIVE STAGE DOM ---")
    print(json.dumps(curious_dom, indent=2))
    browser.close()
