// The loader: a rolling drum counter of real load (fonts, poster, grid, wall)
// into the rule split. Under 2s target, 4s hard cap, Skip from the first frame,
// a single 0.2s fade under reduced motion.
import { rollTo } from './drum.js';

export function runLoader(loader, env) {
  const drum = document.getElementById('loader-drum');
  const stages = { fonts: false, poster: false, grid: false, wall: false };
  const rows = {};
  loader.querySelectorAll('[data-stage]').forEach((r) => (rows[r.dataset.stage] = r));
  const t0 = performance.now();
  let resolved = false, resolveFn;
  const done = new Promise((r) => (resolveFn = r));
  document.documentElement.style.overflow = 'hidden';

  function paint() {
    const n = Object.values(stages).filter(Boolean).length;
    const pct = Math.round((n / 4) * 100);
    rollTo(drum, String(pct));
    for (const k in stages) if (stages[k]) rows[k].classList.add('done');
  }
  function mark(k) { if (stages[k]) return; stages[k] = true; paint(); if (Object.values(stages).every(Boolean)) finish(); }
  function finish() {
    if (resolved) return; resolved = true;
    for (const k in stages) { stages[k] = true; rows[k].classList.add('done'); }
    rollTo(drum, '100');
    const split = () => {
      rollTo(drum, '0');
      loader.querySelector('.cap').textContent = 'in queue';
      setTimeout(() => {
        loader.classList.add('split');
        document.body.classList.add('loaded'); // the H1 lines start rising from behind their rules as the plate splits, not after it has gone
        document.documentElement.style.overflow = '';
        setTimeout(() => { loader.classList.add('gone'); loader.remove(); resolveFn(performance.now() - t0); }, env.rm ? 220 : 340);
      }, env.rm ? 0 : 260);
    };
    setTimeout(split, env.rm ? 0 : 200);
  }
  paint();
  document.fonts.ready.then(() => mark('fonts'));
  requestAnimationFrame(() => requestAnimationFrame(() => mark('grid')));
  const poster = document.querySelector('#wall .poster');
  if (poster && env.webgl === false && env.wide && env.rm) { if (poster.complete) mark('poster'); else { poster.addEventListener('load', () => mark('poster')); poster.addEventListener('error', () => mark('poster')); } }
  else if (poster && env.webgl) { const im = new Image(); im.onload = im.onerror = () => mark('poster'); im.src = '/assets/product/P-01-queue.webp'; }
  else mark('poster');
  if (env.webgl) document.addEventListener('wall:ready', () => mark('wall'), { once: true }); else mark('wall');
  document.getElementById('loader-skip').addEventListener('click', finish);
  setTimeout(finish, 4000);
  return done;
}
