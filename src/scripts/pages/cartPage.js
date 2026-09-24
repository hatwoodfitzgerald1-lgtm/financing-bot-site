// The cart page: rows on their rules, quantity 1 to 10, the subtotal drum,
// the empty state, the pilot alone in its cart.
import * as cart from '../cart.js';
import { rollTo } from '../drum.js';

export function init({ env }) {
  const qs = new URLSearchParams(location.search);
  if (qs.get('pilot') === '1') {
    if (cart.hasPaid()) { window.__fb.openPilotDialog(() => { history.replaceState(null, '', '/cart'); render(); }); }
    else cart.add('pilot');
    history.replaceState(null, '', '/cart');
  }
  const table = document.getElementById('cart-table'), lines = document.getElementById('cart-lines'), empty = document.getElementById('cart-empty');
  const sub = document.getElementById('subtotal'), toCheckout = document.getElementById('to-checkout'), emptyLine = document.getElementById('empty-line');
  function lineRow(l, i) {
    const d = document.createElement('div'); d.className = 'crow line'; d.dataset.sku = l.sku; d.style.animationDelay = env.rm ? '0s' : (i * 0.1) + 's';
    const isPilot = l.sku === 'pilot', isEnt = l.sku === 'enterprise-block';
    const files = isPilot ? '50 funded files' : isEnt ? `2,000 × ${l.qty}` : String(l.files);
    const valid = isPilot ? '60 days to upload' : '12 months from purchase';
    d.innerHTML = `<span>${l.name}</span><span class="m">${files}</span><span class="small">${valid}</span>` +
      (isPilot ? `<span class="m">1</span>` : `<span><div class="stepper" role="group" aria-label="Quantity of ${l.name}"><button type="button" data-q="-1" aria-label="One fewer">−</button><span class="val m">${l.qty}</span><button type="button" data-q="1" aria-label="One more">+</button></div></span>`) +
      `<span class="r m">${cart.money(l.unitPrice * l.qty)}</span><span><button type="button" class="rm" data-rm>Remove</button></span>` +
      (isPilot ? `<span class="note">one per lender, checked against the NMLS company ID at checkout</span>` : '');
    return d;
  }
  function render() {
    const c = cart.getCart();
    if (!c.lines.length) { table.hidden = true; empty.hidden = false; return; }
    table.hidden = false; empty.hidden = true;
    lines.textContent = '';
    c.lines.forEach((l, i) => lines.appendChild(lineRow(l, i)));
    rollTo(sub, cart.money(cart.subtotal(c)), { stagger: true });
    toCheckout.removeAttribute('aria-disabled'); emptyLine.hidden = true;
  }
  lines.addEventListener('click', (e) => {
    const row = e.target.closest('.crow'); if (!row) return;
    const sku = row.dataset.sku;
    const q = e.target.closest('[data-q]');
    if (q) {
      const l = cart.getCart().lines.find((x) => x.sku === sku); const n = l.qty + parseInt(q.dataset.q, 10);
      if (n <= 0) { row.classList.add('out'); setTimeout(() => { cart.setQty(sku, 0); render(); }, env.rm ? 0 : 400); }
      else { cart.setQty(sku, n); render(); }
    }
    if (e.target.closest('[data-rm]')) { row.classList.add('out'); setTimeout(() => { cart.remove(sku); render(); }, env.rm ? 0 : 400); }
  });
  toCheckout.addEventListener('click', (e) => { if (!cart.getCart().lines.length) { e.preventDefault(); emptyLine.hidden = false; toCheckout.setAttribute('aria-disabled', 'true'); } });
  render();
}
