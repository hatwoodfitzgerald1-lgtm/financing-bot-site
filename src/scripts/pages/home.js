// Home: the Overnight Queue wall (Three.js r128, scroll scrubbed on the Lenis
// rail), the poster under reduced motion, the pocket queue under 900px, the
// live chips of section 0002 and the half scale Recalculation quote.
import { wallRows } from '../../data/wallRows.js';
import { loadThree } from '../three-loader.js';
import { rollTo } from '../drum.js';

const PAPER = '#E9E5DA', ASH = '#9A9C98', RULE = '#3A3D41', GRAPHITE = '#1A1B1D', SLATE = '#232527', VERD = '#4FB89A';
const CAPTION = 'Sixty in the queue. Sixty returned to the underwriter of record, every figure beside its page.';

export async function init(ctx) {
  const { env } = ctx;
  liveChips();
  recalcQuote(ctx);
  if (env.webgl) {
    try { await buildWall(ctx); } catch (e) { console.warn('wall fell back to the poster', e); posterMode(); }
  } else if (env.rm && env.wide) posterMode();
  else pocketQueue(ctx);
}

function liveChips() {
  const lines = document.querySelectorAll('#chip-lines li');
  const light = (k) => lines.forEach((l) => l.classList.toggle('lit', !!k && l.dataset.chip === k));
  document.querySelectorAll('.live-chips .chip').forEach((c) => {
    c.addEventListener('mouseenter', () => light(c.dataset.chip));
    c.addEventListener('focus', () => light(c.dataset.chip));
    c.addEventListener('mouseleave', () => light(null));
    c.addEventListener('blur', () => light(null));
    c.addEventListener('click', () => { const on = c.classList.toggle('lit'); document.querySelectorAll('.live-chips .chip').forEach((o) => { if (o !== c) o.classList.remove('lit'); }); light(on ? c.dataset.chip : null); });
  });
}

function recalcQuote({ env }) {
  const q = document.querySelector('.recalc-quote'); if (!q) return;
  const d = q.querySelector('[data-drum]');
  if (env.rm) { rollTo(d, d.dataset.drum, { instant: true }); return; }
  rollTo(d, '$0,000.00', { instant: true });
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { rollTo(d, d.dataset.drum, { stagger: true, duration: 0.8 }); o.disconnect(); } }, { threshold: 0.5 }).observe(q);
}

function posterMode() {
  const wall = document.getElementById('wall');
  wall.classList.add('is-poster');
  document.getElementById('wall-rm-cap').hidden = false;
  const t = document.getElementById('wall-rm-table'); if (t) t.hidden = false;
  document.getElementById('queue-count').textContent = '0';
  const cap = document.getElementById('clear-cap'); if (cap) cap.style.display = 'none';
}

// ---------------------------------------------------------------- the pocket queue
function pocketQueue({ env }) {
  const rows = [...document.querySelectorAll('#pocket .pk-row')];
  const count = document.getElementById('pk-count');
  const cap = document.getElementById('pk-cap');
  let cleared = 0, scrolled = false, typed = false;
  function clearRow(i) {
    const r = rows[i]; if (!r || r.classList.contains('clear')) return;
    r.classList.add('clear');
    r.querySelector('.pk-chip').textContent = r.dataset.status;
    r.querySelector('.pk-inc').textContent = r.dataset.income;
    cleared = rows.filter((x) => x.classList.contains('clear')).length;
    count.textContent = String(12 - cleared);
    if (cleared === 12 && !typed) { typed = true; typeIn(cap, cap.dataset.text, env.rm); }
  }
  if (env.rm) { rows.forEach((_, i) => clearRow(i)); }
  else {
    const idle = setInterval(() => { if (scrolled) return clearInterval(idle); const next = rows.findIndex((r) => !r.classList.contains('clear')); if (next < 0) clearInterval(idle); else clearRow(next); }, 4000);
    const onScroll = () => {
      if (scrollY > 40) scrolled = true;
      const line = innerHeight * 0.72;
      rows.forEach((r, i) => { if (r.getBoundingClientRect().top < line && scrolled) clearRow(i); });
    };
    addEventListener('scroll', onScroll, { passive: true });
  }
  rows.forEach((r) => {
    const b = r.querySelector('.pk-btn'), a = r.querySelector('.pk-arith');
    b.addEventListener('click', () => { if (!r.classList.contains('clear')) return; const open = a.hidden; a.hidden = !open; b.setAttribute('aria-expanded', String(open)); });
  });
}
function typeIn(el, text, instant) {
  if (instant) { el.textContent = text; return; }
  el.textContent = ''; el.classList.add('typing');
  let i = 0; const t = setInterval(() => { i++; el.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(t); el.classList.remove('typing'); } }, 22);
}

// ---------------------------------------------------------------- the wall
async function buildWall({ env, gsap, ScrollTrigger }) {
  const mount = document.getElementById('wall');
  // Three.js loads only after the H1 has painted in its real face: wait for the fonts, then two frames
  await document.fonts.ready;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const THREE = await loadThree();
  const W = 6.0, H = 0.34, GAP = 0.38, N = 60, TOP = N * GAP; // 22.8
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(1.5, devicePixelRatio || 1));
  renderer.setClearColor(new THREE.Color(GRAPHITE));
  mount.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(GRAPHITE);
  const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 100);
  const light = new THREE.DirectionalLight(0xe9e5da, 0.6); light.position.set(0, TOP + 4, 6); scene.add(light);
  const group = new THREE.Group(); scene.add(group);

  // Row textures drawn in Fragment Mono from the same row data as queue.html
  const TW = 1792, TH = 100;
  const cols = [[16, 'index'], [110, 'ln'], [340, 'borrower'], [440, 'product'], [540, 'pages'], [700, 'contradictions'], [980, 'underwriter'], [1240, 'status'], [1500, 'income']];
  function drawRow(cv, r, cleared) {
    const c = cv.getContext('2d');
    c.fillStyle = cleared ? '#26282B' : '#1E2022'; c.fillRect(0, 0, TW, TH);
    // hairlines and the baked rim strip along the top edge
    c.fillStyle = cleared ? 'rgba(233,229,218,0.55)' : 'rgba(233,229,218,0.18)'; c.fillRect(0, 0, TW, 2);
    c.fillStyle = RULE; c.fillRect(0, TH - 1, TW, 1);
    for (const [x] of cols.slice(1)) c.fillRect(x - 14, 0, 1, TH);
    c.font = '24px "Fragment Mono", monospace'; c.textBaseline = 'middle';
    const dim = cleared ? PAPER : 'rgba(233,229,218,0.42)';
    const put = (x, s, col) => { c.fillStyle = col; c.fillText(s, x, TH / 2); };
    put(cols[0][0], r.index, cleared ? ASH : 'rgba(154,156,152,0.6)');
    put(cols[1][0], r.ln, dim);
    put(cols[2][0], r.borrower, dim);
    put(cols[3][0], r.product, dim);
    put(cols[4][0], r.pages + ' pages', dim);
    put(cols[5][0], r.contradictions + (r.contradictions === 1 ? ' contradiction' : ' contradictions'), dim);
    put(cols[6][0], r.underwriter, dim);
    // status chip
    const st = cleared ? r.status : 'reading';
    c.font = '20px "Fragment Mono", monospace';
    const tw = c.measureText(st).width;
    if (!cleared) { const g = c.createRadialGradient(cols[7][0] + tw / 2, TH / 2, 4, cols[7][0] + tw / 2, TH / 2, 120); g.addColorStop(0, 'rgba(79,184,154,0.22)'); g.addColorStop(1, 'rgba(79,184,154,0)'); c.fillStyle = g; c.fillRect(cols[7][0] - 60, 0, tw + 120, TH); }
    c.strokeStyle = cleared ? PAPER : 'rgba(154,156,152,0.7)'; c.lineWidth = 1.5; c.strokeRect(cols[7][0] - 8, TH / 2 - 17, tw + 16, 34);
    c.fillStyle = cleared ? PAPER : 'rgba(233,229,218,0.6)'; c.fillText(st, cols[7][0], TH / 2);
    c.font = '24px "Fragment Mono", monospace';
    if (cleared) put(cols[8][0], r.income, r.status === 'referred up' ? ASH : VERD);
    else put(cols[8][0], 'reading', 'rgba(233,229,218,0.42)');
  }
  const geo = new THREE.PlaneGeometry(W, H);
  // the sixty block cursors on the unread income cells share one geometry and one material (one draw call, not sixty)
  const curPos = new Float32Array(N * 6 * 3);
  const curGeo = new THREE.BufferGeometry(); curGeo.setAttribute('position', new THREE.BufferAttribute(curPos, 3));
  const curMat = new THREE.MeshBasicMaterial({ color: 0xe9e5da, transparent: true, opacity: 0.6 });
  const cursors = new THREE.Mesh(curGeo, curMat); cursors.frustumCulled = false; group.add(cursors);
  const curX = -W / 2 + (cols[8][0] + 108) / TW * W;
  function setCursor(i, on) {
    const y = TOP - (i + 0.5) * GAP - 0.01, hw = 0.03, hh = 0.06;
    const v = on ? [[curX - hw, y - hh], [curX + hw, y - hh], [curX + hw, y + hh], [curX - hw, y - hh], [curX + hw, y + hh], [curX - hw, y + hh]] : [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
    for (let k = 0; k < 6; k++) { const o = (i * 6 + k) * 3; curPos[o] = v[k][0]; curPos[o + 1] = v[k][1]; curPos[o + 2] = on ? 0.01 : 0; }
    curGeo.attributes.position.needsUpdate = true;
  }
  const rows = wallRows.map((r, i) => {
    const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
    drawRow(cv, r, false);
    const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter; tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, TOP - (i + 0.5) * GAP, 0);
    group.add(mesh);
    setCursor(i, true);
    return { r, cv, tex, mesh, i, cleared: false };
  });
  // the fluorescent band along the top edge of the canvas (DOM, driven by progress)
  const band = document.createElement('div'); band.className = 'fluor'; mount.appendChild(band);

  // camera curve: the foot, the two thirds mark, the square frame
  const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0.8, 1.2, 1.6), new THREE.Vector3(0.6, 14.5, 2.2), new THREE.Vector3(0, 11.4, 22)]);
  const look = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 8, 0), new THREE.Vector3(0, 15, 0), new THREE.Vector3(0, 11.4, 0)]);
  const tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3();
  function curveT(p) { if (p <= 0.62) return (p / 0.62) * 0.5; if (p <= 0.78) return 0.5; return 0.5 + ((p - 0.78) / 0.22) * 0.5; }

  let progress = 0, idleCleared = 0, running = true, raf = 0, pointerX = 0, tiltX = 0, disposed = false;
  const plate = document.getElementById('queue-count');
  const capText = document.getElementById('clear-text'), capWrap = document.getElementById('clear-cap');
  const dock = document.getElementById('dock-shot');
  const settle = (row) => gsap.fromTo(row.mesh.scale, { x: 1.02, y: 1.02 }, { x: 1, y: 1, duration: 0.4, ease: 'cubic-bezier(0.8, 0.02, 0.18, 1)' });
  function setCleared(count) {
    for (let k = 0; k < N; k++) {
      const row = rows[N - 1 - k]; const want = k < count;
      if (row.cleared !== want) { row.cleared = want; drawRow(row.cv, row.r, want); row.tex.needsUpdate = true; setCursor(row.i, !want); if (want) settle(row); }
    }
    plate.textContent = String(N - count);
  }
  function scrollCleared(p) { if (p <= 0.62) return Math.floor((p / 0.62) * 48); if (p <= 0.78) return 48 + Math.min(12, Math.floor(((p - 0.62) / 0.16) * 12.999)); return 60; }
  function apply(p) {
    progress = p;
    const t = curveT(p);
    path.getPointAt(Math.min(1, t), tmpP); look.getPointAt(Math.min(1, t), tmpL);
    camera.position.copy(tmpP); camera.lookAt(tmpL);
    setCleared(Math.max(idleCleared, scrollCleared(p)));
    scene.background.set(p > 0.5 ? SLATE : GRAPHITE);
    renderer.setClearColor(scene.background);
    band.style.opacity = Math.min(0.55, Math.max(0, (p - 0.3) * 1.2));
    const frac = p <= 0.62 ? 0 : Math.min(1, (p - 0.62) / 0.16);
    const n = Math.floor(frac * CAPTION.length);
    capText.textContent = CAPTION.slice(0, n);
    capText.classList.toggle('typing', frac > 0 && frac < 1);
    capWrap.classList.toggle('done', frac >= 1);
    const d = Math.max(0, (p - 0.94) / 0.06);
    dock.style.opacity = d; dock.style.visibility = d > 0 ? 'visible' : 'hidden'; dock.style.transform = `translate(-50%, -50%) scale(${1.02 - 0.02 * d})`;
    camera.zoom = 1.02 - 0.02 * d; camera.updateProjectionMatrix();
  }
  function size() { const r = mount.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); }
  size(); addEventListener('resize', size);
  mount.addEventListener('pointermove', (e) => { const r = mount.getBoundingClientRect(); pointerX = ((e.clientX - r.left) / r.width - 0.5) * 2; });
  mount.addEventListener('pointerleave', () => (pointerX = 0));
  const t0 = performance.now();
  function frame(now) {
    if (!running || disposed) return;
    const s = (now - t0) / 1000;
    tiltX += (pointerX - tiltX) * 0.06;
    group.rotation.y = THREE.MathUtils.degToRad(1) * tiltX;
    camera.rotation.z += 0; // camera looks at its target; idle drift below
    const drift = THREE.MathUtils.degToRad(0.4) * Math.sin((s / 7) * Math.PI * 2);
    group.rotation.x = drift * 0.5; group.rotation.z = drift * 0.3;
    curMat.opacity = Math.floor(s / 0.6) % 2 === 0 ? 0.6 : 0.05;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  const idle = setInterval(() => { if (progress > 0.01 || idleCleared >= 24) return; idleCleared++; setCleared(Math.max(idleCleared, scrollCleared(progress))); }, 4000);
  const vio = new IntersectionObserver((es) => es.forEach((x) => { running = x.isIntersecting && !document.hidden; if (running) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } }));
  vio.observe(renderer.domElement);
  document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else { running = true; raf = requestAnimationFrame(frame); } });
  addEventListener('pagehide', () => { disposed = true; clearInterval(idle); rows.forEach((r) => { r.tex.dispose(); r.mesh.material.dispose(); }); geo.dispose(); curGeo.dispose(); curMat.dispose(); renderer.dispose(); }, { once: true });

  apply(0);
  renderer.render(scene, camera);
  mount.classList.add('is-live');
  mount.querySelector('.poster').style.display = 'none';
  document.dispatchEvent(new CustomEvent('wall:ready'));

  // the pin and the scrub
  const endPct = innerWidth < 1200 ? 120 : 150;
  const st = ScrollTrigger.create({
    trigger: '#hero', start: 'top top', end: '+=' + endPct + '%', pin: true, pinSpacing: true, scrub: true, invalidateOnRefresh: true, anticipatePin: 1,
    onUpdate: (self) => apply(self.progress),
  });
  window.__pinEnd = st.end;
  ScrollTrigger.addEventListener('refresh', () => { window.__pinEnd = st.end; });
  if (env.qa === 'arc') { console.log('[qa arc] signature timeline start', st.start, 'end', st.end, 'length/vh', (st.end - st.start) / innerHeight); window.__fbArc = { start: st.start, end: st.end, vh: innerHeight, length: (st.end - st.start) / innerHeight }; }
  if (env.qa === 'poster') { apply(0.7); renderer.render(scene, camera); }
  window.__wall = { apply, st, renderer, camera, scene };
  raf = requestAnimationFrame(frame);
}
