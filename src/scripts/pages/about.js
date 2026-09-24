// About: the floor plan station captions (hover or tap), the 2D plan lighting on scroll.
export function init({ env }) {
  const cap = document.getElementById('station-cap');
  const btns = document.querySelectorAll('.station-btns .chip');
  const name = (k, c) => { cap.textContent = c; btns.forEach((b) => b.classList.toggle('on', b.dataset.st === k)); document.querySelectorAll('.plan-2d .st').forEach((s) => s.classList.toggle('in', s.dataset.st === k || s.classList.contains('lit') || env.rm)); document.dispatchEvent(new CustomEvent('plan:station', { detail: k })); };
  btns.forEach((b) => { b.addEventListener('mouseenter', () => name(b.dataset.st, b.dataset.cap)); b.addEventListener('focus', () => name(b.dataset.st, b.dataset.cap)); b.addEventListener('click', () => name(b.dataset.st, b.dataset.cap)); });
  if (!env.webgl) {
    const sts = [...document.querySelectorAll('.plan-2d .st')];
    if (env.rm) sts.forEach((s) => s.classList.add('in'));
    else new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { sts.forEach((s, i) => setTimeout(() => s.classList.add('in'), i * 260)); o.disconnect(); } }, { threshold: 0.3 }).observe(document.getElementById('plan'));
  }
}
