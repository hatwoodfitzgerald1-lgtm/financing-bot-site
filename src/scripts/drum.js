// Rolling drum digits. Each digit is a vertical strip of 0 to 9 that settles
// with Ratchet; non digits are printed as fixed cells. rollTo(el, text) builds
// the strips once and rolls to the new text.
const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function build(el, text) {
  el.classList.add('drum');
  el.textContent = '';
  for (const ch of text) el.appendChild(cell(ch));
  el.dataset.cur = text;
  el.setAttribute('aria-label', text); el.setAttribute('role', 'img');
}
function cell(ch) {
  const dg = document.createElement('span');
  dg.className = 'dg'; dg.setAttribute('aria-hidden', 'true');
  if (/\d/.test(ch)) {
    const strip = document.createElement('span');
    for (let i = 0; i <= 9; i++) { const d = document.createElement('i'); d.textContent = String(i); strip.appendChild(d); }
    strip.style.transform = `translateY(-${Number(ch)}em)`;
    dg.appendChild(strip);
    dg.dataset.d = ch;
  } else {
    const s = document.createElement('span'); const i = document.createElement('i'); i.textContent = ch; s.appendChild(i); dg.appendChild(s); dg.dataset.c = ch;
  }
  return dg;
}
export function rollTo(el, text, opts = {}) {
  if (!el) return;
  text = String(text);
  const cur = el.dataset.cur;
  if (cur === undefined || cur.length !== text.length || [...cur].some((c, i) => (/\d/.test(c)) !== (/\d/.test(text[i])) || (!/\d/.test(c) && c !== text[i]))) {
    build(el, RM() || opts.instant ? text : text.replace(/\d/g, '0'));
    if (RM() || opts.instant) { el.dataset.cur = text; return; }
  }
  const cells = el.querySelectorAll('.dg');
  [...text].forEach((ch, i) => {
    const dg = cells[i]; if (!dg) return;
    if (/\d/.test(ch)) {
      const strip = dg.firstChild;
      strip.style.transitionDelay = (opts.stagger ? i * 0.03 : 0) + 's';
      strip.style.transitionDuration = RM() ? '0s' : (opts.duration || 0.4) + 's';
      strip.style.transform = `translateY(-${Number(ch)}em)`;
      dg.dataset.d = ch;
    }
  });
  el.dataset.cur = text;
  el.setAttribute('aria-label', text);
}
export function initDrums(root = document) {
  root.querySelectorAll('[data-drum]').forEach((el) => {
    if (el.dataset.built) return;
    el.dataset.built = '1';
    const target = el.dataset.drum;
    if (el.closest('[data-reveal="count"]') || el.dataset.drumLazy !== undefined) {
      build(el, RM() ? target : target.replace(/\d/g, '0'));
      el.dataset.cur = RM() ? target : target.replace(/\d/g, '0');
    } else {
      build(el, target);
    }
  });
}
export function rollDrumsIn(container) {
  container.querySelectorAll('[data-drum]').forEach((el, i) => setTimeout(() => rollTo(el, el.dataset.drum, { stagger: true, duration: 0.6 }), i * 80));
}
