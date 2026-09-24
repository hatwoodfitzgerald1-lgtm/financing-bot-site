#!/usr/bin/env python3
"""Scan every rendered route's visible text for dashes (em dash, en dash, double
hyphen, spaced hyphen), the two banned adjectives, the six placeholders, the
verbatim disclaimer and SMS block, and the head hygiene. Usage: scan.py [base]"""
import sys, re, json, urllib.request
from html.parser import HTMLParser
BASE = next((a for a in sys.argv[1:] if a.startswith('http')), 'http://127.0.0.1:4321')
ROUTES = ['/', '/pricing', '/product', '/about', '/blog', '/blog/form-1084-add-backs', '/blog/large-deposit-letter', '/blog/prior-to-doc-prior-to-close', '/blog/ai-governance-file', '/drafter', '/contact', '/cart', '/checkout', '/order-confirmation', '/terms-of-service', '/privacy-policy', '/nope-404']

class Text(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts = []; self.skip = 0; self.attrs = []; self.title = ''; self.meta = {}; self.in_title = False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('script', 'style', 'noscript'): self.skip += 1
        if tag == 'title' and not self.title: self.in_title = True
        if tag == 'meta' and a.get('name') in ('description', 'robots'): self.meta[a['name']] = a.get('content', '')
        if tag == 'link' and a.get('rel') == 'canonical': self.meta['canonical'] = a.get('href')
        if tag == 'meta' and a.get('property') == 'og:image': self.meta['og:image'] = a.get('content')
        for k in ('alt', 'aria-label', 'placeholder', 'title'):
            if k in a and a[k]: self.attrs.append(a[k])
    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'noscript'): self.skip -= 1
        if tag == 'title': self.in_title = False; self.title = self.title or ' '
    def handle_data(self, d):
        if self.in_title: self.title += d
        if not self.skip: self.parts.append(d)

report = {}
banned = ['intelligent', 'effortless']
placeholders = ['[BUSINESS NAME]', '[PHONE NUMBER]', '[Physical Address]']
disclaimer = 'Financing Bot prepares, calculates and documents. It does not approve, decline or decide any loan.'
sms_end = 'Read our Terms and Privacy Policy.'
for r in ROUTES:
    try:
        with urllib.request.urlopen(BASE + r) as resp: html = resp.read().decode(); status = resp.status
    except urllib.error.HTTPError as e: html = e.read().decode(); status = e.code
    t = Text(); t.feed(html)
    text = ' '.join(t.parts + t.attrs)
    text = re.sub(r'\s+', ' ', text)
    joined = re.sub(r'\s+', ' ', ''.join(t.parts))
    finds = []
    for name, pat in [('em dash', '—'), ('en dash', '–'), ('double hyphen', '--'), ('spaced hyphen', r'\s-\s')]:
        for m in re.finditer(pat, text):
            finds.append({'kind': name, 'context': text[max(0, m.start() - 40): m.end() + 40]})
    low = text.lower()
    report[r] = {
        'status': status, 'title': t.title.strip(), 'description_len': len(t.meta.get('description', '')), 'canonical': t.meta.get('canonical'), 'og_image': t.meta.get('og:image'), 'robots': t.meta.get('robots'),
        'dashes': finds, 'banned_adjectives': [w for w in banned if re.search(r'\b' + w + r'\b', low)],
        'placeholders_present': {k: (k in html) for k in placeholders}, 'ein_address_present': '[EIN Address]' in html,
        'disclaimer_present': disclaimer in html, 'sms_block_present': ('Join Our SMS List' in html and sms_end in joined),
        'sms_checkboxes_checked_by_default': bool(re.search(r'name="(terms|consent)"[^>]*\bchecked\b', html)),
    }
ok = all(not v['dashes'] and not v['banned_adjectives'] for v in report.values())
print(json.dumps(report, indent=1))
print('DASH AND WORD SCAN:', 'PASS' if ok else 'FAIL')
