// Order placed: reads the order from the query and fb_last_order; with no
// matching record it shows the honest empty state and never invents an order.
import { rollTo } from '../drum.js';
import { money } from '../cart.js';
export function init({ env }) {
  const n = new URLSearchParams(location.search).get('order');
  let order = null;
  try { const raw = localStorage.getItem('fb_last_order'); if (raw) order = JSON.parse(raw); } catch (e) { /* none */ }
  const main = document.getElementById('oc-main');
  if (!order || String(order.orderNumber) !== String(n)) {
    document.getElementById('order-no').hidden = true; document.getElementById('oc-line').hidden = true; document.getElementById('oc-empty').hidden = false;
    return;
  }
  const drum = document.getElementById('order-drum');
  rollTo(drum, 'order 00000', { instant: true });
  setTimeout(() => rollTo(drum, 'order ' + order.orderNumber, { stagger: true, duration: 0.8 }), env.rm ? 0 : 300);
  document.getElementById('oc-email').textContent = order.email;
  const pilot = order.lines.some((l) => l.sku === 'pilot');
  document.getElementById(pilot ? 'next-pilot' : 'next-paid').hidden = false;
  if (order.lines.some((l) => l.sku === 'enterprise-block')) document.getElementById('next-ent').hidden = false;
  const t = document.getElementById('oc-table'); t.hidden = false;
  const tb = document.getElementById('oc-lines');
  order.lines.forEach((l) => { const tr = document.createElement('tr'); const files = l.sku === 'pilot' ? '50 funded files' : l.sku === 'enterprise-block' ? `${l.qty} ${l.qty === 1 ? 'block' : 'blocks'} | ${(l.qty * 2000).toLocaleString('en-US')} files` : String(l.files * l.qty); tr.innerHTML = `<td>${l.name}${l.qty > 1 && l.sku !== 'enterprise-block' ? ' × ' + l.qty : ''}</td><td class="m">${files}</td><td class="m r">${money(l.unitPrice * l.qty)}</td>`; tb.appendChild(tr); });
  document.getElementById('oc-tax').textContent = money(order.tax);
  document.getElementById('oc-total').textContent = money(order.total);
  document.getElementById('oc-method').textContent = order.method;
  document.getElementById('oc-valid').textContent = order.validTo;
  const last = document.getElementById('last-link'); setTimeout(() => (last.hidden = false), env.rm ? 0 : 1200);
  document.getElementById('pass-email').textContent = order.email;
  const sp = document.getElementById('set-pass'), pp = document.getElementById('pass-panel');
  sp.addEventListener('click', () => { const open = pp.hidden; pp.hidden = !open; sp.setAttribute('aria-expanded', String(open)); });
}
