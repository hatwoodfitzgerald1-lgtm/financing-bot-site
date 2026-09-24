// Blog index: the sort toggle (by date | by form) with the numerals re-rolling.
import { rollTo } from '../drum.js';
export function init() {
  const tabs = document.querySelectorAll('[data-sort]');
  const list = document.getElementById('post-index');
  const rows = [...list.querySelectorAll('.idx-row')];
  const order = { date: ['01', '02', '03', '04'], form: ['1084', 'conditions', 'deposits', 'governance'] };
  tabs.forEach((t) => t.addEventListener('click', () => {
    tabs.forEach((o) => o.setAttribute('aria-selected', String(o === t)));
    const by = t.dataset.sort;
    const sorted = by === 'date' ? rows.slice().sort((a, b) => a.dataset.n.localeCompare(b.dataset.n)) : rows.slice().sort((a, b) => order.form.indexOf(a.dataset.tag) - order.form.indexOf(b.dataset.tag));
    sorted.forEach((r, i) => { list.appendChild(r); rollTo(r.querySelector('[data-drum]'), String(i + 1).padStart(2, '0'), { stagger: true }); });
  }));
}
