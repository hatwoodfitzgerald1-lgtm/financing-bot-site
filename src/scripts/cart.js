// The cart: localStorage fb_cart_v1 with an in memory fallback. One line per
// pack, quantity 1 to 10, Enterprise in blocks of 2,000, the pilot alone.
import offering from '../data/offering.json';
const KEY = 'fb_cart_v1';
let mem = null;
const catalog = {};
for (const p of offering.packs) catalog[p.sku] = p;
catalog[offering.pilot.sku] = offering.pilot;

function read() {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) { /* storage unavailable */ }
  return mem || { lines: [], updated: 0 };
}
function write(cart) {
  cart.updated = Date.now();
  mem = cart;
  try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) { /* in memory only */ }
  document.dispatchEvent(new CustomEvent('cart:change', { detail: cart }));
  return cart;
}
export function getCart() { return read(); }
export function lineCount() { return read().lines.reduce((n, l) => n + l.qty, 0); }
export function hasPilot() { return read().lines.some((l) => l.sku === 'pilot'); }
export function hasPaid() { return read().lines.some((l) => l.sku !== 'pilot'); }
export function add(sku, qty = 1) {
  const p = catalog[sku]; if (!p) return read();
  const cart = read();
  if (sku === 'pilot') { cart.lines = [{ sku, name: p.name, files: p.files, unitPrice: 0, qty: 1 }]; return write(cart); }
  cart.lines = cart.lines.filter((l) => l.sku !== 'pilot');
  const ex = cart.lines.find((l) => l.sku === sku);
  if (ex) ex.qty = Math.min(10, ex.qty + qty);
  else cart.lines.push({ sku, name: p.name, files: p.files, unitPrice: p.price, qty: Math.max(1, Math.min(10, qty)) });
  return write(cart);
}
export function setQty(sku, qty) {
  const cart = read();
  const l = cart.lines.find((x) => x.sku === sku); if (!l) return cart;
  if (qty <= 0) cart.lines = cart.lines.filter((x) => x.sku !== sku);
  else l.qty = Math.min(10, qty);
  return write(cart);
}
export function remove(sku) { const cart = read(); cart.lines = cart.lines.filter((x) => x.sku !== sku); return write(cart); }
export function clear() { return write({ lines: [] }); }
export function subtotal(cart = read()) { return cart.lines.reduce((s, l) => s + l.unitPrice * l.qty, 0); }
export function money(v) { return '$' + Number(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
export function taxFor(state, sub) {
  const r = offering.taxRates[state]; if (!r) return 0;
  return Math.round(sub * r) / 100;
}
export const packs = catalog;
