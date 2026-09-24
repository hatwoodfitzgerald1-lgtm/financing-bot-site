// Pricing: the Enterprise stepper, the column highlight from ?pack=, the
// recommended chip pulse when arriving at #ledger, the totals rolling on drums.
import { rollTo } from '../drum.js';
import { money } from '../cart.js';

export function init({ env }) {
  const qty = document.getElementById('ent-qty');
  const minus = document.getElementById('ent-minus'), plus = document.getElementById('ent-plus');
  const readout = document.getElementById('ent-readout');
  const drums = readout.querySelectorAll('[data-drum]');
  function paint(n) {
    qty.value = String(n); qty.textContent = String(n);
    rollTo(drums[0], String(n));
    rollTo(drums[1], (n * 2000).toLocaleString('en-US'));
    rollTo(drums[2], money(n * 36000));
    readout.childNodes[1].textContent = n === 1 ? ' block | ' : ' blocks | ';
  }
  minus.addEventListener('click', () => paint(Math.max(1, parseInt(qty.value || '1', 10) - 1)));
  plus.addEventListener('click', () => paint(Math.min(10, parseInt(qty.value || '1', 10) + 1)));
  paint(1);

  // totals roll when the ledger enters
  const table = document.getElementById('pl');
  const tot = table.querySelectorAll('.pl-total [data-drum]');
  if (!env.rm) {
    tot.forEach((d) => rollTo(d, d.dataset.drum.replace(/\d/g, '0'), { instant: true }));
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { tot.forEach((d, i) => setTimeout(() => rollTo(d, d.dataset.drum, { stagger: true, duration: 0.8 }), i * 120)); o.disconnect(); } }, { threshold: 0.2 }).observe(table);
  }
  // ?pack= column highlight
  const pack = new URLSearchParams(location.search).get('pack');
  const col = { '100': 0, '500': 1, 'enterprise': 2 }[pack];
  if (col !== undefined) {
    table.querySelectorAll(`[data-col="${col}"]`).forEach((c) => c.classList.add('hi'));
    const head = table.querySelector(`thead [data-col="${col}"] .pl-nm`);
    if (head) { const ri = document.createElement('span'); ri.className = 'm small paper'; ri.textContent = '0002'; head.prepend(ri); }
    const chip = table.querySelector(`thead [data-col="${col}"] .chip`); if (chip) chip.classList.add('pulse');
  }
  if (location.hash === '#ledger' && col === undefined) { const rec = document.getElementById('rec-chip'); if (rec) setTimeout(() => rec.classList.add('pulse'), 600); }
  // inclusion rows light across all three columns
  table.querySelectorAll('.pl-inc').forEach((tr) => { tr.addEventListener('mouseenter', () => tr.classList.add('lit')); tr.addEventListener('mouseleave', () => tr.classList.remove('lit')); });
}
