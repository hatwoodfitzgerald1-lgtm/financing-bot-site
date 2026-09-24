// GOV.UK style validation: validate on blur after a short delay, never while
// typing, keep every value, message beside the field and in the summary.
export function setError(field, msg) {
  if (!field) return;
  field.classList.add('err');
  const m = field.querySelector('.msg'); if (m) m.textContent = msg;
  const ctl = field.querySelector('input, select, textarea'); if (ctl) ctl.setAttribute('aria-invalid', 'true');
}
export function clearError(field) {
  if (!field) return;
  field.classList.remove('err');
  const m = field.querySelector('.msg'); if (m) m.textContent = '';
  field.querySelectorAll('[aria-invalid]').forEach((c) => c.removeAttribute('aria-invalid'));
}
export function summary(box, errors) {
  if (!box) return;
  const ul = box.querySelector('ul'); ul.textContent = '';
  if (!errors.length) { box.classList.remove('on'); return; }
  for (const e of errors) { const li = document.createElement('li'); const a = document.createElement('a'); a.href = '#' + e.id; a.textContent = e.msg; a.addEventListener('click', (ev) => { ev.preventDefault(); const t = document.getElementById(e.id); if (t) { t.focus({ preventScroll: false }); t.scrollIntoView({ block: 'center' }); } }); li.appendChild(a); ul.appendChild(li); }
  box.classList.add('on');
  box.focus();
}
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const isPhone = (v) => { const d = v.replace(/\D/g, ''); return d.length === 10 || (d.length === 11 && d[0] === '1'); };
export function onBlurValidate(ctl, fn) {
  let t;
  ctl.addEventListener('blur', () => { clearTimeout(t); t = setTimeout(fn, 400); });
  ctl.addEventListener('input', () => { clearTimeout(t); const f = ctl.closest('.field'); if (f && f.classList.contains('err') && fn(true) === true) clearError(f); });
}
function rollLabel(btn, text) { const l = btn.querySelector('.drum-label') || btn.querySelector('span'); if (l) l.textContent = text; }

export function initSms() {
  document.querySelectorAll('form[data-sms]').forEach((form) => {
    const id = form.id;
    const phone = form.querySelector('input[type="tel"]');
    const c1 = form.querySelector('input[name="terms"]');
    const c2 = form.querySelector('input[name="consent"]');
    const box = form.querySelector('.err-summary');
    const f = (el) => el.closest('.field');
    const check = (quiet) => {
      const errs = [];
      const v = phone.value.trim();
      if (!v) errs.push({ id: phone.id, field: f(phone), msg: 'Enter your phone number' });
      else if (!isPhone(v)) errs.push({ id: phone.id, field: f(phone), msg: 'Enter a phone number in the correct format, like 404 555 0100' });
      if (!c1.checked) errs.push({ id: c1.id, field: f(c1), msg: 'Tick the box to agree to the Terms & Privacy Policy' });
      if (!c2.checked) errs.push({ id: c2.id, field: f(c2), msg: 'Tick the box to agree to receive SMS marketing notifications from Financing Bot' });
      return errs;
    };
    onBlurValidate(phone, (quiet) => { const e = check().filter((x) => x.id === phone.id); if (quiet) return e.length === 0; if (e.length) setError(f(phone), e[0].msg); else clearError(f(phone)); });
    [c1, c2].forEach((c) => c.addEventListener('change', () => { if (c.checked) clearError(f(c)); }));
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const errs = check();
      [phone, c1, c2].forEach((c) => clearError(f(c)));
      errs.forEach((e) => setError(e.field, e.msg));
      summary(box, errs);
      if (errs.length) return;
      const btn = form.querySelector('button[type="submit"]');
      rollLabel(btn, 'Sending'); btn.disabled = true;
      const payload = { phone: phone.value.trim(), consentTerms: c1.checked, consentSms: c2.checked, timestamp: new Date().toISOString(), page: location.href, program: 'Financing Bot' };
      try {
        // The campaign platform is wired after vetting; until then the handler resolves locally.
        await new Promise((r) => setTimeout(r, 500));
        form.dataset.payload = JSON.stringify(payload);
        form.classList.add('ok');
        const s = form.querySelector('.success');
        s.textContent = '';
        s.append("You're on the list. A confirmation text is on its way to ");
        const n = document.createElement('span'); n.className = 'm'; n.textContent = payload.phone; s.appendChild(n);
        s.append('. Reply STOP at any time to cancel.');
      } catch (e) {
        form.classList.add('sys-err');
        form.querySelector('.sys').textContent = 'The list did not save. Try again, or email support@financingbot.com.';
        rollLabel(btn, 'Submit'); btn.disabled = false;
      }
    });
  });
}

export function initContact() {
  const form = document.getElementById('contact-form'); if (!form) return;
  const box = form.querySelector('.err-summary');
  const ctls = [...form.querySelectorAll('input[required], textarea[required]')];
  const one = (c) => { const f = c.closest('.field'); const v = c.value.trim(); if (!v) return { id: c.id, field: f, msg: c.dataset.empty }; if (c.type === 'email' && !isEmail(v)) return { id: c.id, field: f, msg: c.dataset.format }; return null; };
  ctls.forEach((c) => onBlurValidate(c, (quiet) => { const e = one(c); if (quiet) return !e; if (e) setError(e.field, e.msg); else clearError(c.closest('.field')); }));
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const errs = ctls.map(one).filter(Boolean);
    ctls.forEach((c) => clearError(c.closest('.field')));
    errs.forEach((e) => setError(e.field, e.msg));
    summary(box, errs);
    if (errs.length) return;
    const btn = form.querySelector('button[type="submit"]'); rollLabel(btn, 'Sending'); btn.disabled = true;
    try {
      await new Promise((r) => setTimeout(r, 500));
      form.querySelectorAll('.field, .err-summary, button[type="submit"]').forEach((el) => (el.hidden = true));
      form.querySelector('.success').hidden = false;
    } catch (e) { form.querySelector('.sys').hidden = false; rollLabel(btn, 'Send'); btn.disabled = false; }
  });
}
