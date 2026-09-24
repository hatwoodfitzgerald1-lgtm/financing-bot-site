#!/usr/bin/env python3
"""Screenshot every route at 1440x900 and 375x812 into qa/screens/ as stitched
viewport tiles (what a visitor sees, pinned scrubs included), plus the first
viewport shots the human gate needs (home-1440.png, home-375.png).
Usage: python3 scripts/qa/screens.py [base_url] [route ...] [--widths 1440,375]
"""
import sys, os, io
from PIL import Image
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:4321'
ROUTES = ['/', '/pricing', '/product', '/about', '/blog', '/blog/form-1084-add-backs', '/blog/large-deposit-letter', '/blog/prior-to-doc-prior-to-close', '/blog/ai-governance-file', '/drafter', '/contact', '/cart', '/checkout', '/order-confirmation', '/terms-of-service', '/privacy-policy', '/404']
WIDTHS = [(1440, 900), (375, 812)]
args = sys.argv[1:]
if '--widths' in args:
    i = args.index('--widths'); WIDTHS = [(int(w), 900 if int(w) >= 900 else 812) for w in args[i + 1].split(',')]; del args[i:i + 2]
for a in args:
    if a.startswith('http'): BASE = a
routes = [a for a in args if a.startswith('/')] or ROUTES
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'qa', 'screens')
os.makedirs(OUT, exist_ok=True)

def slug(r):
    return 'home' if r == '/' else r.strip('/').replace('/', '-')

def stitched(page, w, h):
    page.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
    page.wait_for_timeout(400)
    total = page.evaluate('document.documentElement.scrollHeight')
    tiles = []
    y = 0
    while y < total:
        page.evaluate(f"window.scrollTo({{top: {y}, behavior: 'instant'}})")
        page.wait_for_timeout(650)
        if y > 0: page.evaluate("document.getElementById('nav').style.visibility='hidden'")
        buf = page.screenshot(full_page=False)
        page.evaluate("document.getElementById('nav').style.visibility=''")
        im = Image.open(io.BytesIO(buf))
        actual = page.evaluate('window.scrollY')
        tiles.append((actual, im))
        if actual < y - 60: break
        y = actual + h
        total = page.evaluate('document.documentElement.scrollHeight')
    height = max(t[0] + t[1].height for t in tiles)
    out = Image.new('RGB', (w, height), (26, 27, 29))
    for top, im in tiles: out.paste(im, (0, top))
    return out

with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
    for (w, h) in WIDTHS:
        ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, is_mobile=(w < 900), has_touch=(w < 900))
        page = ctx.new_page()
        for r in routes:
            page.goto(BASE + r, wait_until='networkidle')
            page.wait_for_timeout(1600)
            try: page.wait_for_selector('#loader', state='detached', timeout=6000)
            except Exception: pass
            tag = str(w)
            if r == '/':
                page.screenshot(path=os.path.join(OUT, f'home-{tag}.png'))
            img = stitched(page, w, h)
            img.save(os.path.join(OUT, f'{slug(r)}-{tag}-full.png'))
            print('shot', slug(r), tag, img.size)
        ctx.close()
    b.close()
