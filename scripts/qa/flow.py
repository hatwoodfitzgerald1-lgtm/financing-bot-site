#!/usr/bin/env python3
"""Drive the purchase path end to end (pricing -> cart -> checkout -> confirmation),
the pilot path, the drafter worked check and the SMS block, with screenshots.
Usage: python3 scripts/qa/flow.py [base_url] [--width 1440|375]"""
import sys, os
from playwright.sync_api import sync_playwright
BASE = next((a for a in sys.argv[1:] if a.startswith('http')), 'http://127.0.0.1:4321')
W = 375 if '--width' in sys.argv and sys.argv[sys.argv.index('--width') + 1] == '375' else 1440
H = 812 if W == 375 else 900
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'qa', 'screens')
tag = str(W)
report = {}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=(W < 900), has_touch=(W < 900))
    pg = ctx.new_page()
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    # 1. pricing: buy the 100 File Pack
    pg.goto(BASE + '/pricing#ledger', wait_until='networkidle'); pg.wait_for_timeout(1200)
    pg.click('button[data-add="pack-100"]'); pg.wait_for_url('**/cart', timeout=8000); pg.wait_for_timeout(900)
    report['cart_after_add'] = pg.locator('#cart-lines .crow').count()
    report['cart_cell'] = pg.locator('#cart-count').get_attribute('aria-label') or pg.locator('#cart-count').inner_text()
    pg.screenshot(path=os.path.join(OUT, f'flow-cart-{tag}.png'), full_page=False)
    # persistence: two pages away and back
    pg.goto(BASE + '/about', wait_until='networkidle'); pg.goto(BASE + '/blog', wait_until='networkidle'); pg.goto(BASE + '/cart', wait_until='networkidle'); pg.wait_for_timeout(600)
    report['cart_persisted'] = pg.locator('#cart-lines .crow').count()
    # quantity up and down
    pg.click('#cart-lines [data-q="1"]'); pg.wait_for_timeout(300); report['qty2_total'] = pg.locator('#cart-lines .crow .r').first.inner_text()
    pg.click('#cart-lines [data-q="-1"]'); pg.wait_for_timeout(300)
    # 2. checkout
    pg.click('#to-checkout'); pg.wait_for_url('**/checkout'); pg.wait_for_timeout(900)
    # trigger the error standard deliberately
    pg.fill('#f-email', 'not-an-email'); pg.locator('#f-email').blur(); pg.wait_for_timeout(700)
    report['email_error'] = pg.locator('#f-email').locator('xpath=ancestor::div[contains(@class,"field")]').locator('.msg').inner_text()
    pg.click('#pay-btn'); pg.wait_for_timeout(500)
    report['summary_errors'] = pg.locator('#co-errors li').count()
    report['summary_first'] = pg.locator('#co-errors li').first.inner_text()
    pg.screenshot(path=os.path.join(OUT, f'flow-checkout-errors-{tag}.png'), full_page=False)
    # fill everything
    pg.fill('#f-lender', 'Sample Mortgage Co.'); pg.fill('#f-nmls', '123456'); pg.fill('#f-first', 'Jordan'); pg.fill('#f-last', 'Ortiz'); pg.fill('#f-email', 'jordan@samplemortgage.example'); pg.fill('#f-mobile', '404 555 0100')
    pg.fill('#f-addr1', '100 Sample Street'); pg.fill('#f-city', 'Atlanta'); pg.select_option('#f-state', 'GA'); pg.fill('#f-zip', '30301'); pg.fill('#f-po', 'PO 7781')
    pg.click('[data-method="card"]'); pg.fill('#f-cnum', '4242 4242 4242 4242'); pg.fill('#f-cname', 'Jordan Ortiz'); pg.select_option('#f-mm', '12'); pg.select_option('#f-yy', '2030'); pg.fill('#f-cvv', '123')
    report['pay_label_before'] = pg.locator('#pay-label').inner_text()
    pg.select_option('#f-state', 'TX'); pg.wait_for_timeout(500); report['tax_TX'] = pg.locator('#tax-cell').inner_text(); report['total_TX'] = pg.locator('#side-total').inner_text()
    pg.select_option('#f-state', 'GA'); pg.wait_for_timeout(500)
    # decline test card first
    pg.fill('#f-cnum', '4000 0000 0000 0002'); pg.check('#f-agree'); pg.click('#pay-btn'); pg.wait_for_timeout(1500)
    report['decline'] = pg.locator('#decline-msg').inner_text()
    pg.fill('#f-cnum', '4242 4242 4242 4242')
    report['reorder_default'] = pg.locator('#auto-reorder').get_attribute('aria-checked')
    pg.locator('#pay-btn').scroll_into_view_if_needed(); pg.screenshot(path=os.path.join(OUT, f'flow-checkout-filled-{tag}.png'), full_page=False)
    pg.click('#pay-btn'); pg.wait_for_url('**/order-confirmation*', timeout=10000); pg.wait_for_timeout(2500)
    report['confirmation_url'] = pg.url
    report['order_no'] = pg.evaluate("document.getElementById('order-drum').dataset.cur")
    report['cart_cell_after'] = pg.evaluate("document.getElementById('cart-count').dataset.cur")
    report['method'] = pg.locator('#oc-method').inner_text()
    pg.screenshot(path=os.path.join(OUT, f'flow-confirmation-{tag}.png'), full_page=False)
    # 3. the pilot path
    pg.goto(BASE + '/pricing', wait_until='networkidle'); pg.wait_for_timeout(800)
    pg.click('#pilot a[data-pilot]'); pg.wait_for_url('**/cart', timeout=8000); pg.wait_for_timeout(800)
    report['pilot_row'] = pg.locator('#cart-lines .crow').first.inner_text()[:40]
    pg.click('#to-checkout'); pg.wait_for_url('**/checkout'); pg.wait_for_timeout(800)
    report['pilot_zero_line'] = pg.locator('#zero-line').inner_text()
    report['pilot_pay_label'] = pg.locator('#pay-label').inner_text()
    pg.fill('#f-lender', 'Sample Mortgage Co.'); pg.fill('#f-nmls', '654321'); pg.fill('#f-first', 'Jordan'); pg.fill('#f-last', 'Ortiz'); pg.fill('#f-email', 'jordan@samplemortgage.example')
    pg.fill('#f-addr1', '100 Sample Street'); pg.fill('#f-city', 'Atlanta'); pg.select_option('#f-state', 'GA'); pg.fill('#f-zip', '30301'); pg.check('#f-agree')
    pg.click('#pay-btn'); pg.wait_for_url('**/order-confirmation*', timeout=10000); pg.wait_for_timeout(1500)
    report['pilot_rows_shown'] = pg.locator('#next-pilot:not([hidden]) li').count()
    # 4. the drafter worked check
    pg.goto(BASE + '/drafter', wait_until='networkidle'); pg.wait_for_timeout(800)
    report['drafter_empty'] = pg.locator('#empty').inner_text()
    pg.check('input[name="product"][value="Conv"]'); pg.check('input[name="income"][value="se"]'); pg.check('input[name="assets"][value="deposit"]'); pg.check('input[name="aus"][value="open"]'); pg.wait_for_timeout(1200)
    report['drafter_count'] = pg.locator('#count').inner_text()
    report['drafter_ptd'] = pg.locator('#ptd li').count(); report['drafter_ptc'] = pg.locator('#ptc li').count()
    report['drafter_fits'] = pg.locator('#fits-btn').inner_text()
    pg.fill('#vol-range', '2500') if False else None
    pg.evaluate("const r = document.getElementById('vol-range'); r.value = 2500; r.dispatchEvent(new Event('input', {bubbles:true}));"); pg.wait_for_timeout(300)
    report['drafter_fits_2500'] = pg.locator('#fits-btn').inner_text() + ' -> ' + pg.locator('#fits-btn').get_attribute('href')
    pg.evaluate("const r = document.getElementById('vol-range'); r.value = 1200; r.dispatchEvent(new Event('input', {bubbles:true}));"); pg.wait_for_timeout(300)
    report['drafter_fits_1200'] = pg.locator('#fits-btn').inner_text()
    pg.check('input[name="product"][value="FHA"]'); pg.check('input[name="designation"][value="none"]'); pg.wait_for_timeout(600)
    report['drafter_routing'] = pg.locator('#routing').inner_text()[:60]
    pg.screenshot(path=os.path.join(OUT, f'flow-drafter-{tag}.png'), full_page=False)
    # 5. the SMS block
    pg.goto(BASE + '/', wait_until='networkidle'); pg.wait_for_timeout(1500)
    try: pg.wait_for_selector('#loader', state='detached', timeout=6000)
    except Exception: pass
    report['sms_unchecked'] = [pg.is_checked('#sms-home-c1'), pg.is_checked('#sms-home-c2'), pg.is_checked('#sms-footer-c1'), pg.is_checked('#sms-footer-c2')]
    pg.locator('#sms-home button[type="submit"]').scroll_into_view_if_needed(); pg.click('#sms-home button[type="submit"]'); pg.wait_for_timeout(300)
    report['sms_errors'] = pg.locator('#sms-home .err-summary li').all_inner_texts()
    pg.fill('#sms-home-phone', '404 555 0100'); pg.check('#sms-home-c1'); pg.check('#sms-home-c2'); pg.click('#sms-home button[type="submit"]'); pg.wait_for_timeout(1000)
    report['sms_success'] = pg.locator('#sms-home .success').inner_text()
    report['errors'] = errors
    b.close()
for k, v in report.items(): print(f'{k}: {v}')
