#!/usr/bin/env python3
"""Capture the scene posters W-01 to W-15 (16:10 at 1600x1000 WebP) from each
built scene's end state with ?qa=poster, into public/assets/posters/."""
import sys, os, io
from PIL import Image
from playwright.sync_api import sync_playwright
BASE = next((a for a in sys.argv[1:] if a.startswith('http')), 'http://127.0.0.1:4321')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'assets', 'posters')
os.makedirs(OUT, exist_ok=True)
SCENES = [('W-01', '/', '#wall'), ('W-02', '/pricing', '#drums'), ('W-03', '/product', '#rail'), ('W-04', '/about', '#plan'), ('W-05', '/blog', '#tape'),
          ('W-06', '/blog/form-1084-add-backs', '#abacus'), ('W-07', '/blog/large-deposit-letter', '#threshold'), ('W-08', '/blog/prior-to-doc-prior-to-close', '#columns'), ('W-09', '/blog/ai-governance-file', '#spool'),
          ('W-10', '/drafter', '#tray'), ('W-11', '/contact', '#plate'), ('W-12', '/cart', '#cart-tray'), ('W-13', '/checkout', '#slabs'), ('W-14', '/order-confirmation', '#seal-scene'), ('W-15', '/terms-of-service', '#legal-field')]
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': 1600, 'height': 1000}, device_scale_factor=1)
    pg = ctx.new_page()
    for wid, route, sel in SCENES:
        if route == '/drafter':
            pg.goto(BASE + route + '?qa=poster', wait_until='networkidle'); pg.wait_for_timeout(800)
            pg.check('input[name="product"][value="Conv"]'); pg.check('input[name="income"][value="se"]'); pg.check('input[name="assets"][value="deposit"]'); pg.check('input[name="aus"][value="open"]')
        elif route == '/cart':
            pg.goto(BASE + '/pricing', wait_until='networkidle'); pg.evaluate("window.__fb.cart.add('pack-100'); window.__fb.cart.add('pack-500')")
            pg.goto(BASE + route + '?qa=poster', wait_until='networkidle')
        else:
            pg.goto(BASE + route + '?qa=poster', wait_until='networkidle')
        pg.wait_for_timeout(1500)
        try: pg.wait_for_selector('#loader', state='detached', timeout=6000)
        except Exception: pass
        el = pg.locator(sel).first
        el.scroll_into_view_if_needed(); pg.wait_for_timeout(2500)
        if wid == 'W-01': pg.evaluate("window.__wall && window.__wall.apply(0.7)")
        if wid == 'W-15': pg.evaluate("document.querySelector('#legal-field').style.opacity = 1")
        pg.wait_for_timeout(600)
        buf = el.locator('canvas').first.screenshot() if el.locator('canvas').count() else el.screenshot()
        im = Image.open(io.BytesIO(buf)).convert('RGB')
        # fit to 16:10 at 1600x1000 by cover crop on the graphite field
        w, h = im.size; target = 1.6
        if w / h > target: nw = int(h * target); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        else: nh = int(w / target); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
        im = im.resize((1600, 1000), Image.LANCZOS)
        im.save(os.path.join(OUT, wid + '.webp'), 'WEBP', quality=84)
        print('poster', wid, route)
    b.close()
