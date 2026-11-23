import asyncio
from playwright.async_api import async_playwright

async def check():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for vp in [
            {'width': 360, 'height': 640},
            {'width': 390, 'height': 844},
            {'width': 768, 'height': 1024},
            {'width': 1440, 'height': 900}
        ]:
            ctx = await b.new_context(viewport=vp)
            page = await ctx.new_page()
            await page.goto('http://localhost:3000', wait_until='networkidle')
            await page.wait_for_timeout(4700)
            res = await page.evaluate("""() => {
                const getBox = el => {
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
                const ctas = Array.from(document.querySelectorAll('a, button')).filter(el => {
                    const r = el.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
                }).map(el => ({ text: el.textContent?.trim().slice(0, 30), box: getBox(el) }));
                const pAndH = Array.from(document.querySelectorAll('h1, h2, h3, p')).filter(el => {
                    const r = el.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
                }).map(el => ({ text: el.textContent?.trim().slice(0, 30), box: getBox(el) }));
                return {
                    vp: window.innerWidth + 'x' + window.innerHeight,
                    promptBox: prompt ? getBox(prompt) : null,
                    ctas,
                    pAndH
                };
            }""")
            print(f"=== {res['vp']} ===")
            print("Prompt:", res['promptBox'])
            for c in res['ctas']:
                if 'Turn sound' not in c['text'] and 'Not now' not in c['text'] and 'Biyoo' not in c['text']:
                    print("  CTA:", c['text'], c['box'])
            for p_el in res['pAndH']:
                if 'Turn sound' not in p_el['text'] and 'Biyoo wants' not in p_el['text']:
                    print("  Text:", p_el['text'], p_el['box'])
            await ctx.close()
        await b.close()

if __name__ == '__main__':
    asyncio.run(check())

