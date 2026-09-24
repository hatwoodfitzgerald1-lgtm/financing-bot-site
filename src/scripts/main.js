// Financing Bot: the site runtime. Nav, cart cell, reveals, drums, the two
// generative surfaces, forms, video gating, the loader on Home, then the page
// module and the scene module, lazily, gated by reduced motion, width and pointer.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { rollTo, initDrums, rollDrumsIn } from './drum.js';
import * as cart from './cart.js';
import { initSms, initContact } from './forms.js';

gsap.registerPlugin(ScrollTrigger);
const qs = new URLSearchParams(location.search);
export const env = {
  rm: matchMedia('(prefers-reduced-motion: reduce)').matches || qs.get('qa') === 'rm',
  fine: matchMedia('(pointer: fine)').matches && !matchMedia('(pointer: coarse)').matches,
  wide: innerWidth >= 900,
  qa: qs.get('qa'),
  page: document.body.dataset.page,
  scene: document.body.dataset.scene,
};
env.webgl = !env.rm && env.fine && env.wide;
if (env.rm) document.documentElement.classList.add('rm');
window.__fb = { env, gsap, ScrollTrigger, cart };

// Lenis rail (desktop, fine pointer, motion allowed)
let lenis = null;
if (!env.rm && env.fine && env.wide) {
  lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  window.__fb.lenis = lenis;
  // anchor links scroll on the rail
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const t = document.querySelector(a.getAttribute('href')); if (!t) return;
    e.preventDefault(); lenis.scrollTo(t, { offset: -72 }); history.pushState(null, '', a.getAttribute('href'));
  });
}
if (location.hash && lenis) setTimeout(() => { const t = document.querySelector(location.hash); if (t) lenis.scrollTo(t, { offset: -72, immediate: true }); }, 50);

// Nav: compress past 80px (past the pinned wall on Home), the mobile menu
const nav = document.getElementById('nav');
const compressAt = () => (window.__pinEnd || 80);
let compact = false;
function onScroll() {
  const y = scrollY;
  const c = y > compressAt();
  if (c !== compact) { compact = c; nav.classList.toggle('is-compact', c); }
}
addEventListener('scroll', onScroll, { passive: true }); onScroll();
const menuBtn = document.getElementById('menu-btn');
const menu = document.getElementById('menu-panel');
if (menuBtn && menu) {
  const links = [...menu.querySelectorAll('a')];
  const close = () => { menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); };
  menuBtn.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
    if (open) links[0].focus();
  });
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); menuBtn.focus(); }
    if (e.key === 'Tab') {
      const first = links[0], last = links[links.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); menuBtn.focus(); }
    }
  });
  links.forEach((a) => a.addEventListener('click', close));
}

// Cart cell
const cartCount = document.getElementById('cart-count');
function paintCart() {
  const n = cart.lineCount();
  rollTo(cartCount, String(n));
  const cell = document.getElementById('cart-cell'); if (cell) cell.setAttribute('aria-label', `Cart, ${n} ${n === 1 ? 'line' : 'lines'}`);
}
initDrums();
paintCart();
document.addEventListener('cart:change', paintCart);

// Add to cart buttons and the pilot link
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-add]');
  if (b) {
    e.preventDefault();
    let qty = 1;
    if (b.dataset.qtyfrom) { const q = document.getElementById(b.dataset.qtyfrom); if (q) qty = parseInt(q.value || q.textContent, 10) || 1; }
    cart.add(b.dataset.add, qty);
    document.dispatchEvent(new CustomEvent('cart:added', { detail: { sku: b.dataset.add, qty } }));
    b.classList.add('pressed');
    setTimeout(() => { location.href = '/cart'; }, 380);
    return;
  }
  const p = e.target.closest('[data-pilot]');
  if (p) {
    e.preventDefault();
    if (cart.hasPaid()) openPilotDialog(); else { cart.add('pilot'); location.href = '/cart'; }
  }
});
export function openPilotDialog(onReplace) {
  const d = document.getElementById('pilot-dialog'); if (!d) return;
  d.hidden = false; d.classList.add('open');
  const first = d.querySelector('button'); first.focus();
  const done = (act) => {
    d.classList.remove('open'); d.hidden = true;
    if (act === 'replace') { cart.add('pilot'); if (onReplace) onReplace(); else location.href = '/cart'; }
  };
  d.querySelectorAll('[data-act]').forEach((b) => { b.onclick = () => done(b.dataset.act); });
  d.onkeydown = (e) => { if (e.key === 'Escape') done('keep'); };
}
window.__fb.openPilotDialog = openPilotDialog;

// Reveals: distinct scroll ins, snapped to the end state under reduced motion
const io = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    const el = en.target;
    el.classList.add('in');
    // A photograph behind a wipe never triggers native lazy loading in Chromium while it is clipped, so start it here
    el.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
    if (el.dataset.reveal === 'count') rollDrumsIn(el);
    if (el.dataset.reveal === 'draw-table') el.querySelectorAll('tbody tr').forEach((tr, i) => { if (!tr.style.getPropertyValue('--i')) tr.style.setProperty('--i', i); });
    io.unobserve(el);
  }
}, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('[data-reveal], .seal-wrap, .tally, .scene, .kitfig').forEach((el) => { if (env.rm) { el.classList.add('in'); el.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; }); if (el.dataset.reveal === 'count') rollDrumsIn(el); } else io.observe(el); });
// Row level reveals: a ledger's rows and an index's rows land as each one enters the
// viewport (a short Carriage Return stagger within the batch that arrives together),
// so a tall table never sits empty while the visitor scrolls it.
const rowIo = new IntersectionObserver((entries) => {
  let k = 0;
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    const row = en.target;
    row.style.setProperty('--d', (Math.min(k, 7) * 0.05) + 's'); k++;
    row.classList.add('in');
    rowIo.unobserve(row);
  }
}, { threshold: 0.01, rootMargin: '0px 0px -4% 0px' });
document.querySelectorAll('[data-reveal="draw-table"] tbody tr, [data-reveal="slide-index"] .idx-row').forEach((row) => { if (env.rm) row.classList.add('in'); else rowIo.observe(row); });
// split the pull quotes into words for the word by word unmask
document.querySelectorAll('[data-reveal="words"] .pq, [data-split="words"]').forEach((el) => {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  words.forEach((w, i) => { const s = document.createElement('span'); s.className = 'w'; s.textContent = w; s.style.transitionDelay = (i * 0.04) + 's'; el.appendChild(s); el.appendChild(document.createTextNode(' ')); });
});
// checkerboard cell stagger
document.querySelectorAll('[data-reveal="checker"] .yes').forEach((c, i) => c.style.setProperty('--n', i));

// Tap equivalent for the hover treatments
if (!env.fine) document.addEventListener('touchstart', (e) => { const h = e.target.closest('.hv'); if (!h) return; h.classList.add('tap'); setTimeout(() => h.classList.remove('tap'), 600); }, { passive: true });

// Media bands whose photograph has not landed yet: print the alt line in mono on the ruled field, never a broken glyph
document.querySelectorAll('.band img').forEach((img) => {
  const mark = () => { const band = img.closest('.band'); if (!band || band.classList.contains('no-media')) return; band.classList.add('no-media'); const l = document.createElement('p'); l.className = 'alt-line'; l.textContent = img.alt; band.appendChild(l); };
  img.addEventListener('error', mark);
  if (img.complete && img.naturalWidth === 0 && img.currentSrc) mark();
});

// Videos: autoplay only when motion is allowed and in view
document.querySelectorAll('video[loop]').forEach((v) => {
  if (env.rm) { v.removeAttribute('autoplay'); return; }
  const vio = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) v.play().catch(() => {}); else v.pause(); }), { threshold: 0.2 });
  vio.observe(v);
});

// Generative surface b: the tally wall (footer and the pricing header)
function tallyWall(canvas, opts = {}) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = Math.min(1.5, devicePixelRatio || 1), running = false, raf = 0, t0 = performance.now();
  const cols = () => Math.floor(w / 44), rows = () => Math.floor(h / 40);
  function size() { const r = canvas.getBoundingClientRect(); w = r.width; h = r.height; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    const total = cols() * rows() * 5;
    let lit;
    if (opts.scrollDriven) { const r = canvas.parentElement.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (r.height + innerHeight))); lit = Math.floor(total * (0.2 + 0.8 * p)); }
    else lit = Math.floor(((now - t0) / 1000) * 9) % (total + 60);
    ctx.lineWidth = 1; ctx.lineCap = 'square';
    let k = 0;
    for (let y = 0; y < rows(); y++) for (let x = 0; x < cols(); x++) {
      const ox = x * 44 + 12, oy = y * 40 + 10;
      for (let s = 0; s < 5; s++) {
        const on = k < lit; k++;
        ctx.strokeStyle = on ? 'rgba(233,229,218,0.16)' : 'rgba(58,61,65,0.35)';
        ctx.beginPath();
        if (s < 4) { ctx.moveTo(ox + s * 6, oy); ctx.lineTo(ox + s * 6, oy + 18); }
        else { ctx.moveTo(ox - 3, oy + 16); ctx.lineTo(ox + 22, oy + 2); }
        ctx.stroke();
      }
    }
  }
  function loop(now) { if (!running) return; draw(now); raf = requestAnimationFrame(loop); }
  size(); draw(performance.now());
  if (env.rm) return;
  const vio = new IntersectionObserver((es) => es.forEach((x) => { running = x.isIntersecting && !document.hidden; if (running) { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); } }));
  vio.observe(canvas);
  document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else { running = true; raf = requestAnimationFrame(loop); } });
  addEventListener('resize', () => { size(); draw(performance.now()); });
}
document.querySelectorAll('.tally-wall').forEach((c) => tallyWall(c, { scrollDriven: c.id === 'tally-wall-head' }));

// Generative surface a: the page count ruler field
function rulerField(canvas) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = Math.min(1.5, devicePixelRatio || 1), running = false, raf = 0, t0 = performance.now();
  const lit = new Set([1, 9, 27, 31, 47, 52, 88, 91, 118]);
  function size() { const r = canvas.getBoundingClientRect(); w = r.width; h = r.height; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    const step = 6; const shift = env.rm ? 0 : ((now - t0) / 1000) * step;
    const rowsN = Math.max(1, Math.floor(h / 120));
    ctx.lineWidth = 1;
    for (let r = 0; r < rowsN; r++) {
      const base = h < 120 ? h - 6 : r * 120 + 96;
      for (let p = 1; p <= 1000; p++) {
        const x = ((p * step - shift) % (1000 * step) + 1000 * step) % (1000 * step);
        if (x > w) continue;
        const tall = p % 100 === 0 || p === 1;
        const isLit = lit.has(p);
        ctx.strokeStyle = isLit ? 'rgba(233,229,218,0.9)' : tall ? 'rgba(154,156,152,0.55)' : 'rgba(58,61,65,0.7)';
        ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - (tall ? 28 : isLit ? 18 : 10)); ctx.stroke();
        if (tall) { ctx.fillStyle = 'rgba(154,156,152,0.7)'; ctx.font = '10px "Fragment Mono", monospace'; ctx.fillText('p.' + p, x + 3, base - 30); }
      }
    }
  }
  function loop(now) { if (!running) return; draw(now); raf = requestAnimationFrame(loop); }
  size(); draw(performance.now());
  if (env.rm) return;
  const vio = new IntersectionObserver((es) => es.forEach((x) => { running = x.isIntersecting && !document.hidden; if (running) { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); } }));
  vio.observe(canvas);
  addEventListener('resize', () => { size(); });
}
document.querySelectorAll('.ruler-field, .ruler-rail').forEach(rulerField);

// Forms present on every page
initSms();
initContact();

// Scenes: mode per environment
document.querySelectorAll('.scene[data-scene]').forEach((s) => {
  if (env.rm && env.wide) s.classList.add('is-poster');
  else if (!env.webgl) s.classList.add('is-2d');
});

// Loader (Home), then the page module and the scene module
async function boot() {
  const loader = document.getElementById('loader');
  let loaderDone = Promise.resolve();
  if (loader) { const { runLoader } = await import('./loader.js'); loaderDone = runLoader(loader, env); loaderDone.then(() => document.body.classList.add('loaded')); } else document.body.classList.add('loaded');
  const page = env.page;
  const mods = {
    home: () => import('./pages/home.js'),
    pricing: () => import('./pages/pricing.js'),
    product: () => import('./pages/product.js'),
    about: () => import('./pages/about.js'),
    blog: () => import('./pages/blog.js'),
    drafter: () => import('./pages/drafter.js'),
    cart: () => import('./pages/cartPage.js'),
    checkout: () => import('./pages/checkout.js'),
    confirmation: () => import('./pages/confirmation.js'),
  };
  if (mods[page]) { const m = await mods[page](); if (m.init) m.init({ env, gsap, ScrollTrigger, lenis, loaderDone }); }
  if (env.webgl && env.scene && env.scene !== 'wall') {
    const { mountScenes } = await import('./scenes.js');
    mountScenes({ env, gsap, ScrollTrigger });
  }
  ScrollTrigger.refresh();
}
if (document.readyState === 'complete') boot(); else addEventListener('load', boot, { once: true });
