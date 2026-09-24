// Product: the pinned queue chapter with V-02, The Recalculation set piece,
// the Form 1084 | Form 91 toggle, the condition list accordion.
import { rollTo } from '../drum.js';

export function init({ env, gsap, ScrollTrigger }) {
  queueChapter({ env, ScrollTrigger });
  setPiece({ env, gsap, ScrollTrigger });
  formToggle();
  accordion();
  rail2d(env);
}

function queueChapter({ env, ScrollTrigger }) {
  const ch = document.getElementById('ch-queue');
  const beats = [...ch.querySelectorAll('.beat')], dots = [...ch.querySelectorAll('.beat-dots i')];
  const v = document.getElementById('v02'), rm = ch.querySelector('.v02-rm'), replay = document.getElementById('v02-replay');
  const show = (i) => { beats.forEach((b, k) => b.classList.toggle('on', k === i)); dots.forEach((d, k) => d.classList.toggle('on', k === i)); };
  if (env.rm) { v.hidden = true; rm.hidden = false; beats.forEach((b) => b.classList.add('on')); return; }
  let played = false;
  const play = () => { v.currentTime = 0; v.play().catch(() => {}); replay.hidden = true; };
  v.addEventListener('ended', () => { replay.hidden = false; });
  replay.addEventListener('click', play);
  v.addEventListener('click', play);
  if (env.wide && env.fine) {
    ch.classList.add('pinned');
    ScrollTrigger.create({
      trigger: ch, start: 'top top+=64', end: '+=180%', pin: true, scrub: true, invalidateOnRefresh: true,
      onUpdate: (s) => { show(Math.min(2, Math.floor(s.progress * 3))); if (!played && s.progress > 0.02) { played = true; play(); } },
    });
  } else {
    new IntersectionObserver((es) => { if (es[0].isIntersecting && !played) { played = true; play(); } }, { threshold: 0.4 }).observe(v);
    beats.forEach((b) => b.classList.add('on'));
  }
}

function setPiece({ env, gsap, ScrollTrigger }) {
  const sp = document.getElementById('setpiece'), fig = document.getElementById('sp-fig'), drum = fig.querySelector('[data-drum]');
  const lines = [...document.querySelectorAll('#sp-lines li')], cite = document.getElementById('sp-cite');
  const table = document.getElementById('sp-table');
  if (env.rm) { table.hidden = false; sp.querySelector('.sp-pin').style.display = 'none'; return; }
  const totals = lines.map((l) => l.dataset.total);
  let last = -1;
  function at(p) {
    const i = Math.min(11, Math.floor(p * 12.999));
    if (i === last) return; last = i;
    lines.forEach((l, k) => l.classList.toggle('on', k <= i));
    if (i < 11) { rollTo(drum, totals[i], { stagger: true, duration: 0.5 }); fig.classList.remove('vd'); cite.classList.remove('on'); }
    else { rollTo(drum, '$8,412.50', { stagger: true, duration: 0.6 }); setTimeout(() => { fig.classList.add('vd'); cite.classList.add('on'); }, 500); }
  }
  rollTo(drum, '00,000.00', { instant: true });
  if (env.wide && env.fine) {
    ScrollTrigger.create({ trigger: sp.querySelector('.sp-pin'), start: 'top top+=64', end: '+=220%', pin: true, scrub: true, invalidateOnRefresh: true, onUpdate: (s) => at(s.progress) });
  } else {
    // stacked: advance line by line as the piece scrolls through the viewport
    ScrollTrigger.create({ trigger: sp, start: 'top 70%', end: 'bottom 40%', scrub: true, onUpdate: (s) => at(s.progress) });
  }
}

function formToggle() {
  const b84 = document.getElementById('f1084'), b91 = document.getElementById('f91');
  const labels = document.querySelectorAll('#sp-lines .lbl, #sp-table tbody td:first-child');
  const set = (is91) => {
    b84.setAttribute('aria-checked', String(!is91)); b91.setAttribute('aria-checked', String(is91));
    b84.classList.toggle('on', !is91); b91.classList.toggle('on', is91);
    document.querySelectorAll('#sp-lines .lbl').forEach((l) => (l.textContent = is91 ? l.dataset.f91 : l.dataset.f1084));
  };
  b84.addEventListener('click', () => set(false)); b91.addEventListener('click', () => set(true));
}

function accordion() {
  const items = [...document.querySelectorAll('#acc .acc-item')];
  const shots = document.querySelectorAll('#acc-shot img');
  items.forEach((it) => {
    const btn = it.querySelector('button'), body = it.querySelector('.acc-body');
    btn.addEventListener('click', () => {
      items.forEach((o) => { const ob = o.querySelector('button'), obody = o.querySelector('.acc-body'); const open = o === it; o.classList.toggle('open', open); ob.setAttribute('aria-expanded', String(open)); obody.hidden = !open; });
      shots.forEach((s) => { s.hidden = s.dataset.shot !== btn.dataset.shot; });
    });
  });
}

function rail2d(env) {
  if (env.webgl) return;
  const items = document.querySelectorAll('.rail-2d li');
  if (env.rm) { items.forEach((l) => l.classList.add('in')); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { items.forEach((l, i) => setTimeout(() => l.classList.add('in'), i * 120)); io.disconnect(); } }), { threshold: 0.3 });
  const r = document.getElementById('rail'); if (r) io.observe(r);
}
