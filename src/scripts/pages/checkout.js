// The checkout: one page, four numbered sections, GOV.UK validation on blur
// after 400ms and on submit, card or ACH, the $0 pilot path, the order record.
import * as cart from '../cart.js';
import { rollTo } from '../drum.js';
import { setError, clearError, summary, isEmail, isPhone, onBlurValidate } from '../forms.js';

const $ = (id) => document.getElementById(id);
const f = (ctl) => ctl.closest('.field');

export function init({ env }) {
  const form = $('checkout-form');
  const c = cart.getCart();
  if (!c.lines.length) { form.querySelectorAll('.co-sec').forEach((s) => (s.hidden = true)); $('co-empty').hidden = false; document.querySelector('.co-side').hidden = true; $('mobile-total').hidden = true; return; }
  const isPilot = c.lines.some((l) => l.sku === 'pilot');
  let method = null, acctType = null, autoReorder = false;

  // draft values (never the payment fields)
  const DRAFT = 'fb_checkout_draft';
  const draftIds = ['f-lender', 'f-nmls', 'f-first', 'f-last', 'f-email', 'f-mobile', 'f-country', 'f-addr1', 'f-addr2', 'f-city', 'f-state', 'f-zip', 'f-po'];
  try { const d = JSON.parse(sessionStorage.getItem(DRAFT) || '{}'); draftIds.forEach((id) => { if (d[id] !== undefined) $(id).value = d[id]; }); } catch (e) { /* none */ }
  const saveDraft = () => { try { const d = {}; draftIds.forEach((id) => (d[id] = $(id).value)); sessionStorage.setItem(DRAFT, JSON.stringify(d)); } catch (e) { /* none */ } };
  draftIds.forEach((id) => $(id).addEventListener('change', saveDraft));

  // review rows and totals
  const sub = cart.subtotal(c);
  function tax() { return isPilot ? 0 : cart.taxFor($('f-state').value, sub); }
  function paintTotals() {
    const t = tax(), total = sub + t;
    $('tax-cell').textContent = cart.money(t); $('side-tax').textContent = cart.money(t);
    rollTo($('total-drum'), cart.money(total), { stagger: true });
    $('side-total').textContent = cart.money(total); $('mobile-total-fig').textContent = cart.money(total);
    if (isPilot) { $('pay-label').textContent = 'Place $0 order'; } else rollTo($('pay-drum'), cart.money(total), { stagger: true });
  }
  const tb = $('review-lines'), side = $('side-lines');
  c.lines.forEach((l) => {
    const isEnt = l.sku === 'enterprise-block', pilot = l.sku === 'pilot';
    const files = pilot ? '50 funded files' : isEnt ? `${l.qty} ${l.qty === 1 ? 'block' : 'blocks'} | ${(l.qty * 2000).toLocaleString('en-US')} files` : String(l.files * l.qty);
    const rate = pilot ? '$0.00' : cart.packs[l.sku].rateLabel;
    const tr = document.createElement('tr'); tr.innerHTML = `<td>${l.name}${!isEnt && !pilot && l.qty > 1 ? ' × ' + l.qty : ''}</td><td class="m">${files}</td><td class="m">${rate}</td><td class="m r">${cart.money(l.unitPrice * l.qty)}</td>`; tb.appendChild(tr);
    const d = document.createElement('div'); d.className = 'sum-row'; d.innerHTML = `<span>${l.name}${l.qty > 1 ? ' × ' + l.qty : ''}</span><span class="m">${cart.money(l.unitPrice * l.qty)}</span>`; side.appendChild(d);
  });
  const validTo = new Date(); validTo.setFullYear(validTo.getFullYear() + 1);
  const validStr = validTo.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  $('validity').textContent = `Files valid to ${validStr}. Deducted only when a package is delivered.`;
  $('f-state').addEventListener('change', paintTotals);
  paintTotals();
  if (isPilot) { $('zero-line').hidden = false; $('pay-wrap').hidden = true; $('reorder-wrap').hidden = true; }

  // sign in panel (optional, never gates a field)
  const si = $('signin-link'), sp = $('signin-panel');
  si.addEventListener('click', () => { const open = sp.hidden; sp.hidden = !open; si.setAttribute('aria-expanded', String(open)); });

  // payment method tabs
  const tabs = form.querySelectorAll('.pay-tabs [data-method]');
  tabs.forEach((t) => t.addEventListener('click', () => {
    method = t.dataset.method;
    tabs.forEach((o) => o.setAttribute('aria-checked', String(o === t)));
    $('panel-card').hidden = method !== 'card'; $('panel-ach').hidden = method !== 'ach';
    $('method-msg').classList.remove('on');
  }));
  form.querySelectorAll('#acct-type [data-type]').forEach((t) => t.addEventListener('click', () => { acctType = t.dataset.type; form.querySelectorAll('#acct-type [data-type]').forEach((o) => o.setAttribute('aria-checked', String(o === t))); $('acct-type-msg').textContent = ''; f($('acct-type')).classList.remove('err'); }));
  // auto reorder switch
  const sw = $('auto-reorder');
  sw.addEventListener('click', () => { autoReorder = !autoReorder; sw.setAttribute('aria-checked', String(autoReorder)); rollTo($('reorder-state'), autoReorder ? 'On.' : 'Off.', { instant: true }); $('reorder-state').textContent = autoReorder ? 'On.' : 'Off.'; });
  // card number formatting in groups of four
  const cnum = $('f-cnum');
  cnum.addEventListener('input', () => { const d = cnum.value.replace(/\D/g, '').slice(0, 19); cnum.value = d.replace(/(.{4})/g, '$1 ').trim(); });
  // slab index and mobile summary
  const idx = $('slab-index').querySelectorAll('span');
  const secs = ['s1', 's2', 's3', 's4'].map($);
  const sio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { const n = secs.indexOf(e.target); idx.forEach((s, i) => s.classList.toggle('on', i === n)); document.dispatchEvent(new CustomEvent('checkout:section', { detail: n })); } }), { rootMargin: '-40% 0px -50% 0px' });
  secs.forEach((s) => sio.observe(s));
  const mt = $('mobile-total'); mt.hidden = false;
  mt.querySelector('button').addEventListener('click', () => { const aside = document.querySelector('.co-side'); const open = aside.classList.toggle('open'); mt.querySelector('button').setAttribute('aria-expanded', String(open)); });

  // validation
  const luhn = (s) => { let sum = 0, alt = false; for (let i = s.length - 1; i >= 0; i--) { let d = +s[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } sum += d; alt = !alt; } return sum % 10 === 0; };
  const rules = {
    'f-lender': (v) => (!v ? "Enter the lender's legal name" : null),
    'f-nmls': (v) => (!v ? 'Enter the NMLS company ID' : !/^\d+$/.test(v) ? 'NMLS company ID must be numbers only' : pilotUsed(v) ? 'A pilot has already been ordered for this NMLS company ID. Buy a pack, or contact support@financingbot.com' : null),
    'f-email': (v) => (!v ? 'Enter your work email address' : !isEmail(v) ? 'Enter an email address in the correct format, like name@lender.com' : null),
    'f-mobile': (v) => (v && !isPhone(v) ? 'Enter a mobile number in the correct format, like 404 555 0100, or leave the field empty' : null),
    'f-country': (v) => (!v ? 'Select a country' : null),
    'f-addr1': (v) => (!v ? 'Enter the billing address' : null),
    'f-city': (v) => (!v ? 'Enter a city' : null),
    'f-state': (v) => (!v ? 'Select a state' : null),
    'f-zip': (v) => (!v ? 'Enter a ZIP code, like 30301' : !/^\d{5}(-\d{4})?$/.test(v) ? 'Enter a ZIP code, like 30301' : null),
    'f-cnum': (v) => { const d = v.replace(/\s/g, ''); return !d ? 'Enter the card number' : (d.length < 13 || d.length > 19 || !luhn(d)) ? 'Check the card number and try again' : null; },
    'f-cname': (v) => (!v ? 'Enter the name on the card' : null),
    'f-cvv': (v) => { const amex = /^3[47]/.test(cnum.value.replace(/\s/g, '')); return !v ? 'Enter the security code' : !(amex ? /^\d{4}$/ : /^\d{3}$/).test(v) ? 'Enter the security code' : null; },
    'f-aname': (v) => (!v ? "Enter the account holder's name" : null),
    'f-routing': (v) => (!v ? 'Enter the routing number' : !/^\d{9}$/.test(v) ? 'Routing number must be 9 digits' : null),
    'f-acct': (v) => (!v || !/^\d{4,17}$/.test(v) ? 'Enter the account number' : null),
  };
  function pilotUsed(id) { if (!isPilot) return false; try { return (JSON.parse(localStorage.getItem('fb_pilot_ids') || '[]')).includes(id); } catch (e) { return false; } }
  function checkOne(id, quiet) { const ctl = $(id); const msg = rules[id](ctl.value.trim()); if (quiet) return !msg; if (msg) setError(f(ctl), msg); else clearError(f(ctl)); return !msg; }
  Object.keys(rules).forEach((id) => onBlurValidate($(id), (q) => checkOne(id, q)));
  function checkOwner(quiet) { const ok = $('f-first').value.trim() && $('f-last').value.trim(); const fl = $('f-owner'); if (quiet) return !!ok; if (!ok) setError(fl, fl.querySelector('.msg').dataset.owner); else clearError(fl); return !!ok; }
  ['f-first', 'f-last'].forEach((id) => onBlurValidate($(id), (q) => checkOwner(q)));
  function checkExp(quiet) { const mm = $('f-mm').value, yy = $('f-yy').value; const fl = $('f-mm').closest('.field'); let msg = null; if (!mm || !yy) msg = 'Enter the expiry date in the format MM YY'; else { const now = new Date(); const exp = new Date(+yy, +mm, 0); if (exp < now) msg = 'The card has expired. Use a different card'; } if (quiet) return !msg; if (msg) setError(fl, msg); else clearError(fl); return !msg; }
  ['f-mm', 'f-yy'].forEach((id) => $(id).addEventListener('change', () => { if ($('f-mm').value && $('f-yy').value) checkExp(); }));

  function validateAll() {
    const errs = [];
    const push = (id, msg) => errs.push({ id, msg });
    const base = ['f-lender', 'f-nmls', 'f-email', 'f-mobile', 'f-country', 'f-addr1', 'f-city', 'f-state', 'f-zip'];
    base.forEach((id) => { if (!checkOne(id)) push(id, rules[id]($(id).value.trim())); });
    if (!checkOwner()) push('f-first', "Enter the account owner's name");
    if (!isPilot) {
      if (!method) { $('method-msg').textContent = 'Select a payment method'; $('method-msg').classList.add('on'); push('pay-wrap', 'Select a payment method'); }
      else if (method === 'card') {
        ['f-cnum', 'f-cname'].forEach((id) => { if (!checkOne(id)) push(id, rules[id]($(id).value.trim())); });
        if (!checkExp()) push('f-mm', $('exp-msg').textContent);
        if (!checkOne('f-cvv')) push('f-cvv', rules['f-cvv']($('f-cvv').value.trim()));
      } else {
        ['f-aname', 'f-routing', 'f-acct'].forEach((id) => { if (!checkOne(id)) push(id, rules[id]($(id).value.trim())); });
        if (!acctType) { const fl = f($('acct-type')); fl.classList.add('err'); $('acct-type-msg').textContent = 'Select checking or savings'; push('acct-type', 'Select checking or savings'); }
      }
    }
    if (!$('f-agree').checked) { const fl = f($('f-agree')); setError(fl, 'Agree to the Terms of Service and the Privacy Policy to place the order'); push('f-agree', 'Agree to the Terms of Service and the Privacy Policy to place the order'); } else clearError(f($('f-agree')));
    // order the summary by document position
    errs.sort((a, b) => { const A = $(a.id), B = $(b.id); return A && B ? (A.compareDocumentPosition(B) & 4 ? -1 : 1) : 0; });
    return errs;
  }
  $('f-agree').addEventListener('change', () => { if ($('f-agree').checked) clearError(f($('f-agree'))); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    $('decline-msg').classList.remove('on');
    const errs = validateAll();
    summary($('co-errors'), errs);
    if (errs.length) { const first = $(errs[0].id); if (first) first.scrollIntoView({ block: 'center' }); return; }
    const btn = $('pay-btn'); btn.disabled = true;
    const lbl = $('pay-label'); const old = lbl.innerHTML; lbl.textContent = isPilot ? 'Placing' : 'Authorizing';
    await new Promise((r) => setTimeout(r, 800));
    if (!isPilot && method === 'card' && cnum.value.replace(/\s/g, '') === '4000000000000002') {
      $('decline-msg').textContent = 'The card was declined. Try another card or choose ACH debit'; $('decline-msg').classList.add('on');
      lbl.innerHTML = old; btn.disabled = false; setError(f(cnum), 'The card was declined. Try another card or choose ACH debit'); return;
    }
    // the order record: never the card number, CVV, routing or account number
    let seq = 10482; try { seq = parseInt(localStorage.getItem('fb_order_seq') || '10482', 10); } catch (x) { /* none */ }
    const order = {
      orderNumber: seq, placedAt: new Date().toISOString(), lines: c.lines, subtotal: sub, tax: tax(), total: sub + tax(),
      method: isPilot ? 'none, $0 order' : method === 'card' ? 'card ending ' + cnum.value.replace(/\s/g, '').slice(-4) : 'ACH debit',
      email: $('f-email').value.trim(), lenderName: $('f-lender').value.trim(), nmlsId: $('f-nmls').value.trim(), poNumber: $('f-po').value.trim(), autoReorder, validTo: validStr,
    };
    try {
      localStorage.setItem('fb_last_order', JSON.stringify(order));
      localStorage.setItem('fb_order_seq', String(seq + 1));
      if (isPilot) { const ids = JSON.parse(localStorage.getItem('fb_pilot_ids') || '[]'); ids.push(order.nmlsId); localStorage.setItem('fb_pilot_ids', JSON.stringify(ids)); }
      sessionStorage.removeItem(DRAFT);
    } catch (x) { window.__fbLastOrder = order; }
    cart.clear();
    location.href = '/order-confirmation?order=' + seq;
  });
}
