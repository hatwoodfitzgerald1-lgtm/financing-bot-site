#!/usr/bin/env python3
"""Measure the budgets (references/measure_budgets.md) in headless Chromium and
write qa/measurements.json: initial JS gzipped from the built files loaded on
first paint, LCP and CLS via PerformanceObserver on Home, /pricing and
/product, fps sampled across the signature scroll, the signature scroll length
from the ?qa=arc hook, INP approximations on the drafter and the checkout, and
the FULL PAGE RULE margins at 1440, 1920 and 2560.
Usage: python3 scripts/qa/measure.py [base_url]"""
import sys, os, json, gzip, glob, time
from playwright.sync_api import sync_playwright
BASE = next((a for a in sys.argv[1:] if a.startswith('http')), 'http://127.0.0.1:4321')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
res = {'measured_at': time.strftime('%Y-%m-%dT%H:%M:%S'), 'base': BASE, 'headless': 'Chromium via Playwright, swiftshader GL (software), sandbox CPU; treat timings as upper bounds'}

# 1. initial JS weight (built files)
dist = os.path.join(ROOT, 'dist', 'client', '_astro')
js = {}
for f in sorted(glob.glob(os.path.join(dist, '*.js'))):
    js[os.path.basename(f)] = len(gzip.compress(open(f, 'rb').read(), 9))
first_paint = {k: v for k, v in js.items() if k.startswith('Ledger.astro')}
lazy = {k: v for k, v in js.items() if not k.startswith('Ledger.astro')}
css = {os.path.basename(f): len(gzip.compress(open(f, 'rb').read(), 9)) for f in glob.glob(os.path.join(dist, '*.css'))}
three = os.path.join(ROOT, 'public', 'assets', 'vendor', 'three.min.js')
res['js'] = {'first_paint_gzip_bytes': sum(first_paint.values()), 'first_paint_files': first_paint, 'lazy_modules_gzip_bytes': lazy, 'css_gzip_bytes': css, 'three_r128_gzip_bytes_lazy_after_h1': len(gzip.compress(open(three, 'rb').read(), 9)) if os.path.exists(three) else None, 'budget_gzip_bytes': 350 * 1024, 'pass': sum(first_paint.values()) < 350 * 1024}

OBS = """(() => { window.__m = { lcp: 0, cls: 0 };
  new PerformanceObserver(l => l.getEntries().forEach(e => { window.__m.lcp = e.startTime; window.__m.lcpEl = e.element ? (e.element.tagName + (e.element.id ? '#' + e.element.id : '')) : ''; })).observe({type:'largest-contentful-paint', buffered:true});
  new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__m.cls += e.value; })).observe({type:'layout-shift', buffered:true}); })()"""

with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    pg.add_init_script(OBS)
    vitals = {}
    for route in ['/', '/pricing', '/product']:
        pg.goto(BASE + route, wait_until='load'); pg.wait_for_timeout(3500)
        try: pg.wait_for_selector('#loader', state='detached', timeout=6000)
        except Exception: pass
        pg.evaluate("window.scrollTo({top: 300, behavior: 'instant'})"); pg.wait_for_timeout(600)
        pg.evaluate("window.scrollTo({top: 0, behavior: 'instant'})"); pg.wait_for_timeout(400)
        m = pg.evaluate('window.__m')
        nav = pg.evaluate("() => { const n = performance.getEntriesByType('navigation')[0]; return { ttfb: n.responseStart, domContentLoaded: n.domContentLoadedEventEnd, load: n.loadEventEnd }; }")
        vitals[route] = {'lcp_ms': round(m['lcp']), 'lcp_element': m.get('lcpEl'), 'cls': round(m['cls'], 4), **{k: round(v) for k, v in nav.items()}, 'lcp_pass': m['lcp'] < 2500, 'cls_pass': m['cls'] < 0.1}
    res['vitals'] = vitals
    # 3 and 4: the signature scroll (fps and length)
    pg.goto(BASE + '/?qa=arc', wait_until='networkidle'); pg.wait_for_timeout(2500)
    try: pg.wait_for_selector('#loader', state='detached', timeout=6000)
    except Exception: pass
    arc = pg.evaluate('window.__fbArc || null')
    fps = pg.evaluate("""async () => { const end = window.__fbArc ? window.__fbArc.end : innerHeight * 1.5; let f = 0; const t0 = performance.now(); let run = true; (function loop(){ f++; if (run) requestAnimationFrame(loop); })();
      const steps = 60; for (let i = 0; i <= steps; i++) { window.scrollTo({top: end * i / steps, behavior: 'instant'}); await new Promise(r => setTimeout(r, 50)); }
      run = false; const dt = (performance.now() - t0) / 1000; return { avg_fps: Math.round(f / dt), seconds: dt }; }""")
    res['signature'] = {'arc': arc, 'scroll_length_vh': round(arc['length'], 3) if arc else None, 'length_pass': (1.25 <= arc['length'] <= 1.75) if arc else False, **fps, 'fps_pass_55': fps['avg_fps'] >= 55, 'note': 'fps sampled under software GL in the sandbox; the render loop is capped at DPR 1.5 with sixty basic material planes, re-measure on the live site with a GPU'}
    # three loads after the H1 paints (verify the loader code path)
    res['three_lazy'] = pg.evaluate("() => { const s = [...document.scripts].find(x => /three\\.min\\.js/.test(x.src)); const h1 = performance.getEntriesByType('largest-contentful-paint').pop(); const r = performance.getEntriesByName(s ? s.src : '')[0]; return { script: s ? s.src : null, three_start_ms: r ? Math.round(r.startTime) : null, lcp_ms: h1 ? Math.round(h1.startTime) : null }; }")
    # 5. INP approximations: event handler duration for a drafter change and a checkout blur
    pg.goto(BASE + '/drafter', wait_until='networkidle'); pg.wait_for_timeout(1000)
    inp_d = pg.evaluate("""async () => { const r = document.querySelector('input[name="product"][value="Conv"]'); const t0 = performance.now(); r.click(); r.dispatchEvent(new Event('change', {bubbles:true})); await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res))); const a = performance.now() - t0; const c = document.querySelector('input[name="income"][value="se"]'); const t1 = performance.now(); c.click(); await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res))); return Math.round(Math.max(a, performance.now() - t1)); }""")
    pg.evaluate("window.__fb.cart.add('pack-100')")
    pg.goto(BASE + '/checkout', wait_until='networkidle'); pg.wait_for_timeout(1000)
    inp_c = pg.evaluate("""async () => { const e = document.getElementById('f-email'); e.value = 'bad'; const t0 = performance.now(); e.focus(); e.blur(); await new Promise(res => setTimeout(res, 450)); await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res))); const a = performance.now() - t0 - 400; const b0 = performance.now(); document.getElementById('pay-btn').click(); await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res))); return Math.round(Math.max(a, performance.now() - b0)); }""")
    res['inp_ms'] = {'drafter_interaction': inp_d, 'checkout_interaction': inp_c, 'pass_200': inp_d < 200 and inp_c < 200}
    ctx.close()
    # 6. the FULL PAGE RULE margins
    fpr = {}
    for w in [1440, 1920, 2560]:
        c2 = b.new_context(viewport={'width': w, 'height': 900}); p2 = c2.new_page()
        for route in ['/', '/product', '/pricing']:
            p2.goto(BASE + route, wait_until='networkidle'); p2.wait_for_timeout(1500)
            try: p2.wait_for_selector('#loader', state='detached', timeout=6000)
            except Exception: pass
            m = p2.evaluate("""() => { const W = innerWidth; const g = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter'));
              const media = [...document.querySelectorAll('.band, .wall-col, .queue-media, .ledger-wrap, .checker, .ticker, .ws-wrap, .shot-band, .setpiece, .pq-field, .ch-media, .prh-scene, .ph-scene, .wall-type, .entity, .post-index, .footer')];
              const rows = media.map(e => { const r = e.getBoundingClientRect(); return { el: e.className.split(' ')[0], left: Math.round(r.left), right: Math.round(W - r.right), width: Math.round(r.width) }; }).filter(r => r.width > 0);
              const grid = document.querySelector('.grid-lines').getBoundingClientRect();
              // the empty margin beside a media element is the gap on the side that touches the viewport edge; a half width element has type beside it on the other side
              const widest = Math.max(...rows.map(r => Math.min(r.left, r.right)));
              return { gutter: g, widest_empty_margin_px: widest, grid_spans_viewport: grid.width === W, elements: rows }; }""")
            fpr[f'{w}{route}'] = {'gutter_px': m['gutter'], 'widest_empty_margin_px': m['widest_empty_margin_px'], 'grid_spans_viewport': m['grid_spans_viewport'], 'pass_48': m['widest_empty_margin_px'] <= 48, 'elements': m['elements']}
        c2.close()
    res['full_page_rule'] = fpr
    b.close()

os.makedirs(os.path.join(ROOT, 'qa'), exist_ok=True)
json.dump(res, open(os.path.join(ROOT, 'qa', 'measurements.json'), 'w'), indent=1)
print(json.dumps({k: v for k, v in res.items() if k != 'full_page_rule'}, indent=1))
for k, v in fpr.items(): print(k, 'gutter', v['gutter_px'], 'widest', v['widest_empty_margin_px'], 'pass', v['pass_48'])
