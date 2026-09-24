// The per page scenes: one WebGL canvas per page, lazy init after first paint,
// pixel ratio capped at 1.5, paused offscreen and on hidden tabs, disposed on
// navigation, each scrubbed to scroll on the same rail. Desktop and fine
// pointer only; the poster and the 2D fallback ship otherwise (see main.js).
import { loadThree } from './three-loader.js';

const PAPER = 0xe9e5da, ASH = 0x9a9c98, RULE = 0x3a3d41, GRAPHITE = 0x1a1b1d, SLATE = 0x232527, VERD = 0x4fb89a;
const CR = (t) => { const c1 = 0.8, c2 = 0.18; return t * t * (3 - 2 * t) * (1 - 0.15 * Math.sin(t * Math.PI)) + 0 * (c1 + c2); }; // Carriage Return feel, hard stop
const clamp01 = (v) => Math.min(1, Math.max(0, v));
let THREE;

function textTexture(text, opts = {}) {
  const w = opts.w || 512, h = opts.h || 96, size = opts.size || 28, color = opts.color || '#E9E5DA', bg = opts.bg || null, align = opts.align || 'left';
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  if (bg) { c.fillStyle = bg; c.fillRect(0, 0, w, h); }
  if (opts.rule) { c.fillStyle = '#3A3D41'; c.fillRect(0, h - 2, w, 2); }
  if (opts.box) { c.strokeStyle = opts.box; c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2); }
  c.font = `${size}px "Fragment Mono", monospace`; c.fillStyle = color; c.textBaseline = 'middle'; c.textAlign = align;
  const lines = Array.isArray(text) ? text : [text];
  lines.forEach((ln, i) => c.fillText(ln, align === 'center' ? w / 2 : 16, h / 2 + (i - (lines.length - 1) / 2) * (size * 1.3)));
  const t = new THREE.CanvasTexture(cv); t.minFilter = THREE.LinearFilter; return t;
}
function textPlane(text, W, H, opts = {}) {
  const tex = textTexture(text, { w: Math.round(W * 160), h: Math.round(H * 160), ...opts });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: opts.opacity === undefined ? 1 : opts.opacity }));
  return m;
}
function lineBox(w, h, d, color = PAPER, opacity = 0.9) {
  const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}
function lineRect(w, h, color = PAPER, opacity = 0.9) {
  const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-w / 2, -h / 2, 0), new THREE.Vector3(w / 2, -h / 2, 0), new THREE.Vector3(w / 2, h / 2, 0), new THREE.Vector3(-w / 2, h / 2, 0), new THREE.Vector3(-w / 2, -h / 2, 0)]);
  return new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}

function makeScene(mount, { gsap, ScrollTrigger, env }, build) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(1.5, devicePixelRatio || 1));
  renderer.setClearColor(GRAPHITE);
  mount.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(GRAPHITE);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  const state = { p: 0, t: 0, pointer: { x: 0, y: 0 }, running: true, raf: 0, disposed: false };
  const api = { renderer, scene, camera, state, mount, gsap, update: null, dispose: null };
  function size() { const r = mount.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; camera.aspect = r.width / Math.max(1, r.height); camera.fov = camera.aspect < 1 ? Math.min(85, 45 / camera.aspect) : 45; camera.updateProjectionMatrix(); }
  size(); addEventListener('resize', size);
  mount.addEventListener('pointermove', (e) => { const r = mount.getBoundingClientRect(); state.pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2; state.pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2; });
  mount.addEventListener('pointerleave', () => { state.pointer.x = 0; state.pointer.y = 0; });
  build(api);
  const t0 = performance.now();
  function frame(now) { if (!state.running || state.disposed) return; state.t = (now - t0) / 1000; if (api.update) api.update(state); renderer.render(scene, camera); state.raf = requestAnimationFrame(frame); }
  const vio = new IntersectionObserver((es) => es.forEach((x) => { state.running = x.isIntersecting && !document.hidden; if (state.running) { cancelAnimationFrame(state.raf); state.raf = requestAnimationFrame(frame); } }));
  vio.observe(renderer.domElement);
  document.addEventListener('visibilitychange', () => { if (document.hidden) state.running = false; else { state.running = true; state.raf = requestAnimationFrame(frame); } });
  addEventListener('pagehide', () => { state.disposed = true; scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); renderer.dispose(); }, { once: true });
  const trig = api.trigger || mount.closest('section') || mount;
  ScrollTrigger.create({ trigger: trig, start: api.start || 'top bottom', end: api.end || 'bottom top', scrub: true, onUpdate: (s) => { state.p = s.progress; } });
  if (env.qa === 'poster') { state.p = api.posterAt === undefined ? 0.7 : api.posterAt; }
  mount.classList.add('is-live'); const poster = mount.querySelector('.poster'); if (poster) poster.style.display = 'none';
  if (api.update) api.update(state); renderer.render(scene, camera);
  state.raf = requestAnimationFrame(frame);
  return api;
}

// ---------------------------------------------------------------- the scenes
const scenes = {
  // /pricing: the balance drums, three mechanical counters in a row
  drums(api) {
    const { scene, camera, state } = api;
    api.trigger = document.getElementById('ledger'); api.start = 'top 90%'; api.end = 'bottom 30%';
    const counters = [[100, 3], [500, 3], [2000, 4]].map(([files, digits], k) => {
      const g = new THREE.Group(); g.position.x = (k - 1) * 3.4;
      const drums = [];
      for (let d = 0; d < digits; d++) {
        const cv = document.createElement('canvas'); cv.width = 128; cv.height = 1280; const c = cv.getContext('2d');
        c.fillStyle = '#232527'; c.fillRect(0, 0, 128, 1280); c.font = '80px "Fragment Mono", monospace'; c.fillStyle = '#E9E5DA'; c.textAlign = 'center'; c.textBaseline = 'middle';
        for (let i = 0; i < 10; i++) { c.fillText(String(i), 64, i * 128 + 64); c.fillStyle = '#3A3D41'; c.fillRect(0, i * 128, 128, 2); c.fillStyle = '#E9E5DA'; }
        const tex = new THREE.CanvasTexture(cv); tex.wrapS = THREE.RepeatWrapping;
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.56, 48, 1, true), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
        cyl.rotation.z = Math.PI / 2; cyl.position.x = (d - (digits - 1) / 2) * 0.62;
        g.add(cyl); drums.push(cyl);
        const frame = lineRect(0.6, 0.9, PAPER, 0.5); frame.position.set(cyl.position.x, 0, 0.66); g.add(frame);
      }
      const base = lineBox(digits * 0.62 + 0.6, 1.4, 1.4, RULE, 1); g.add(base);
      const lab = textPlane(files.toLocaleString('en-US') + ' files', 2.2, 0.36, { size: 26, color: '#9A9C98' }); lab.position.set(0, -1.05, 0.72); g.add(lab);
      scene.add(g);
      return { g, drums, files, digits, boost: 0 };
    });
    document.addEventListener('cart:added', () => counters.forEach((c) => (c.boost = 1)));
    scene.add(new THREE.DirectionalLight(PAPER, 0.5));
    api.update = (s) => {
      counters.forEach((c, k) => {
        c.boost *= 0.97;
        const local = clamp01((s.p - k * 0.12) * 1.8);
        const value = Math.round(c.files * (1 - local * (1 - c.boost)));
        const str = String(value).padStart(c.digits, '0');
        c.drums.forEach((d, i) => { const target = -Number(str[i]) * (Math.PI * 2 / 10) + Math.PI; d.rotation.x += (target - d.rotation.x) * 0.12; });
        c.g.rotation.y = s.pointer.x * 0.04;
      });
      const cx = (s.p - 0.5) * 4.2;
      camera.position.set(cx * 0.9, 0.2 + s.pointer.y * 0.1, 7.2 - 1.6 * Math.sin(s.p * Math.PI));
      camera.lookAt(cx * 0.6, 0, 0);
    };
    window.__drums = counters;
  },

  // /product: the index rail
  rail(api) {
    const { scene, camera } = api;
    api.trigger = document.getElementById('product-head'); api.start = 'top top'; api.end = 'bottom 10%';
    const labels = ['URLA p.1', 'credit p.9', 'paystub YTD, co borrower p.27', 'W2 2024, co borrower p.31', 'Schedule C 2024 p.47', 'Schedule C 2025 p.52', 'bank statement 1 p.88', 'bank statement 2 p.91', 'package p.118'];
    const railLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -labels.length * 0.9, 0)]), new THREE.LineBasicMaterial({ color: PAPER, transparent: true, opacity: 0.6 }));
    scene.add(railLine);
    const tabs = labels.map((l, i) => {
      const t = textPlane(l, 3.4, 0.44, { size: 26, box: '#9A9C98', bg: '#1E2022' }); t.position.set(-1.7, -i * 0.9, 0); t.userData.out = 0; scene.add(t); return t;
    });
    const hold = document.getElementById('rail-hold'), end = document.getElementById('rail-end');
    api.update = (s) => {
      const y = -s.p * (labels.length * 0.9 + 1) + 1;
      tabs.forEach((t, i) => {
        const pair = i === 2 || i === 3;
        const want = (t.position.y > y - 1.6) || pair && s.p > 0.3 ? 1 : 0;
        t.userData.out += (want - t.userData.out) * 0.14;
        t.position.x = -1.7 + t.userData.out * 2.1 + (pair && s.p > 0.3 ? 0.4 : 0);
        t.material.opacity = 0.5 + 0.5 * t.userData.out;
      });
      const pull = clamp01((s.p - 0.85) / 0.15);
      camera.position.set(0.6 + s.pointer.x * 0.2, y + 0.4 - pull * 2, 5 + pull * 6);
      camera.lookAt(0.4, y - 0.6 - pull * 2.5, 0);
      hold.classList.toggle('on', s.p > 0.3 && s.p < 0.85); end.classList.toggle('on', s.p >= 0.85);
    };
  },

  // /about: the floor plan
  plan(api) {
    const { scene, camera } = api;
    api.trigger = document.getElementById('about-head'); api.start = 'top top'; api.end = 'bottom 20%';
    const stations = {
      upload: { box: [1.4, 0.4, 0.8], at: [-4, 0, 3] }, wall: { box: [5, 2.2, 0.2], at: [0, 1.1, -3.5] }, worksheet: { box: [1.6, 0.4, 0.9], at: [-2, 0, 0] }, printer: { box: [0.9, 0.7, 0.9], at: [3.6, 0.35, -1.5] }, shelf: { box: [4.5, 1.8, 0.4], at: [-1.5, 0.9, 4.6] }, lit: { box: [1.8, 0.4, 1], at: [3.4, 0, 2.6] },
    };
    const desks = [[-2, 0, 0], [0.2, 0, 0], [2.4, 0, 0], [-2, 0, 1.6], [0.2, 0, 1.6]];
    desks.forEach((d) => { const b = lineBox(1.6, 0.4, 0.9, RULE, 1); b.position.set(...d); scene.add(b); });
    const floor = lineRect(12, 10, RULE, 1); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.21; scene.add(floor);
    const lights = {};
    Object.entries(stations).forEach(([k, st]) => {
      const b = lineBox(...st.box, PAPER, 0.5); b.position.set(...st.at); scene.add(b);
      const l = new THREE.Mesh(new THREE.PlaneGeometry(st.box[0] * 0.9, st.box[2] * 0.9), new THREE.MeshBasicMaterial({ color: PAPER, transparent: true, opacity: 0 })); l.rotation.x = -Math.PI / 2; l.position.set(st.at[0], st.at[1] + st.box[1] / 2 + 0.02, st.at[2]); scene.add(l);
      lights[k] = { l, box: b, boost: 0 };
    });
    document.addEventListener('plan:station', (e) => { for (const k in lights) lights[k].boost = k === e.detail ? 1 : 0; });
    const order = ['upload', 'wall', 'worksheet', 'printer', 'shelf', 'lit'];
    api.update = (s) => {
      order.forEach((k, i) => { const on = clamp01((s.p - i * 0.12) * 4); const L = lights[k]; L.l.material.opacity = 0.15 * on + 0.5 * L.boost + (k === 'lit' ? 0.35 * on : 0); L.box.material.opacity = 0.45 + 0.55 * Math.max(on, L.boost); });
      const rise = s.p;
      camera.position.set(-3 + rise * 3 + s.pointer.x * 0.3, 0.6 + rise * 13, 6 - rise * 5.9);
      camera.lookAt(0.5, 0, 0.5 + (1 - rise) * 1.5);
    };
  },

  // /blog: the ledger tape
  tape(api) {
    const { scene, camera } = api;
    api.trigger = document.getElementById('blog-head'); api.start = 'top top'; api.end = 'bottom 30%';
    const titles = ['01  How the Form 1084 add backs actually work', '02  What the large deposit rule asks for, and what a drafted letter should say', '03  Prior to doc or prior to close: writing conditions an LOS can carry', '04  The governance file a lender now keeps on every AI tool'];
    const tapeG = new THREE.Group(); tapeG.rotation.z = -0.28; tapeG.rotation.y = 0.35; scene.add(tapeG);
    const rails = [0.5, -0.5].map((y) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-40, y, 0), new THREE.Vector3(40, y, 0)]), new THREE.LineBasicMaterial({ color: RULE })); tapeG.add(l); return l; });
    const rows = titles.map((t, i) => { const p = textPlane(t, 9, 0.9, { size: 34, w: 1440, h: 144, color: '#E9E5DA', rule: true }); p.position.set(i * 9.6, 0, 0.01); tapeG.add(p); return p; });
    for (let i = -6; i < 40; i++) { const m = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(i * 1.2, 0.5, 0), new THREE.Vector3(i * 1.2, -0.5, 0)]), new THREE.LineBasicMaterial({ color: RULE, transparent: true, opacity: 0.6 })); tapeG.add(m); }
    api.update = (s) => {
      const x = -2 + s.p * 32;
      rows.forEach((r, i) => { const d = Math.abs(r.position.x - x); const lit = clamp01(1 - d / 6); r.material.opacity = 0.5 + 0.5 * lit; });
      const v = new THREE.Vector3(x, 0, 0).applyEuler(tapeG.rotation);
      camera.position.set(v.x + 1.5 + s.pointer.x * 0.3, v.y + 0.6, v.z + 5.6);
      camera.lookAt(v.x + 1.5, v.y, v.z);
    };
  },

  // post 1: the add back abacus
  abacus(api) {
    const { scene, camera } = api;
    api.trigger = api.mount.closest('section'); api.start = 'top 80%'; api.end = 'bottom 20%';
    const lines = [['line 31 net profit', 84600], ['plus line 13 depreciation', 9850], ['plus line 12 depletion', 0], ['plus line 30 business use of home', 4200], ['minus line 24b meals', -1380]];
    const bars = lines.map(([lab, v], i) => {
      const w = Math.max(0.12, Math.abs(v) / 100000 * 6);
      const g = new THREE.Group(); g.position.y = 1.6 - i * 0.7;
      const rail = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-3.6, 0, 0), new THREE.Vector3(3.6, 0, 0)]), new THREE.LineBasicMaterial({ color: RULE })); g.add(rail);
      const bar = lineBox(w, 0.28, 0.28, v < 0 ? ASH : PAPER, 0.95); bar.position.x = -3.6 + w / 2; g.add(bar);
      const t = textPlane(lab + '  ' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2 }), 4.6, 0.32, { size: 22, color: '#9A9C98' }); t.position.set(1.3, 0.3, 0); g.add(t);
      scene.add(g); return { g, bar, w };
    });
    const sumG = new THREE.Group(); sumG.position.y = -2.2; scene.add(sumG);
    const sum = lineBox(97270 / 100000 * 6, 0.34, 0.34, VERD, 0.95); sum.position.x = -3.6 + 97270 / 100000 * 3; sumG.add(sum);
    const st = textPlane('2024 total  97,270.00', 4.6, 0.32, { size: 22, color: '#4FB89A' }); st.position.set(1.3, 0.4, 0); sumG.add(st);
    api.update = (s) => {
      bars.forEach((b, i) => { const k = clamp01((s.p - i * 0.12) * 3); b.bar.position.x = -3.6 + b.w / 2 + k * (7.2 - b.w) * 0.5; b.g.position.y = 1.6 - i * 0.7 - k * (3.8 - i * 0.7) * 0.15; });
      sum.material.opacity = 0.2 + 0.8 * clamp01((s.p - 0.6) * 3);
      camera.position.set(s.pointer.x * 0.3, -0.3 + s.pointer.y * 0.2, 8.5 - s.p); camera.lookAt(0, -0.3, 0);
    };
  },

  // post 2: the threshold plane
  threshold(api) {
    const { scene, camera } = api;
    api.trigger = api.mount.closest('section'); api.start = 'top 80%'; api.end = 'bottom 20%';
    const conv = [6500, 2250, 1180, 640, 410], fha = [6500, 3900, 2100, 980, 250];
    const mk = (arr, x, label) => { const h = textPlane(label, 2.6, 0.3, { size: 22, color: '#9A9C98' }); h.position.set(x, 2.4, 0); scene.add(h); return arr.map((v, i) => { const t = textPlane(v.toLocaleString('en-US', { minimumFractionDigits: 2 }), 2.4, 0.36, { size: 30, align: 'center', rule: true }); t.position.set(x, 1.8 - i * 0.8, 0); scene.add(t); return { t, v }; }); };
    const a = mk(conv, -1.6, 'conventional  50% of income'), b = mk(fha, 1.6, 'FHA  1% of adjusted value');
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(7, 0.06), new THREE.MeshBasicMaterial({ color: PAPER, transparent: true, opacity: 0.85 })); scene.add(plane);
    const lab1 = textPlane('4,206.25', 1.4, 0.3, { size: 24 }); lab1.position.set(-3.6, 0.25, 0.02); scene.add(lab1);
    const lab2 = textPlane('4,120.00', 1.4, 0.3, { size: 24 }); lab2.position.set(2.6, 0.25, 0.02); scene.add(lab2);
    api.update = (s) => {
      const y = 2.4 - s.p * 3.4; plane.position.y = y; lab1.position.y = y + 0.25; lab2.position.y = y + 0.25;
      const lit = (row, thr) => row.forEach((r) => { r.t.material.opacity = r.t.position.y > y && r.v > thr ? 1 : 0.35; });
      lit(a, 4206.25); lit(b, 4120);
      camera.position.set(s.pointer.x * 0.3, 0.2 + s.pointer.y * 0.2, 8); camera.lookAt(0, 0.2, 0);
    };
  },

  // post 3: the reconciling columns
  columns(api) {
    const { scene, camera } = api;
    api.trigger = api.mount.closest('section'); api.start = 'top 80%'; api.end = 'bottom 20%';
    const pairs = [['income', '$7,568.75', '$8,412.50'], ['assets', '$41,200.00', '$41,200.00'], ['contradictions', '0', '0'], ['pages', '118', '118'], ['deposit 14th', '$6,500.00', '$6,500.00']];
    const rows = pairs.map(([lab, l, r], i) => {
      const y = 1.6 - i * 0.8; const same = l === r;
      const L = textPlane(l, 2.4, 0.4, { size: 30, align: 'center', box: '#3A3D41' }); L.position.set(-3, y, 0);
      const R = textPlane(r, 2.4, 0.4, { size: 30, align: 'center', box: same ? '#3A3D41' : '#4FB89A', color: same ? '#E9E5DA' : '#4FB89A' }); R.position.set(3, y, 0);
      const T = textPlane(lab, 2, 0.28, { size: 20, color: '#9A9C98', align: 'center' }); T.position.set(0, y + 0.36, 0);
      scene.add(L, R, T); return { L, R, same, y };
    });
    const h1 = textPlane('AUS entered', 2.4, 0.3, { size: 22, color: '#9A9C98', align: 'center' }); h1.position.set(-1.6, 2.4, 0); scene.add(h1);
    const h2 = textPlane('recalculated', 2.4, 0.3, { size: 22, color: '#9A9C98', align: 'center' }); h2.position.set(1.6, 2.4, 0); scene.add(h2);
    api.update = (s) => {
      rows.forEach((r, i) => { const k = clamp01((s.p - i * 0.08) * 2.2); const gap = r.same ? 1.25 : 1.9; r.L.position.x = -3 + k * (3 - gap); r.R.position.x = 3 - k * (3 - gap); r.L.material.opacity = r.same && k > 0.95 ? 0.4 : 1; r.R.material.opacity = r.same && k > 0.95 ? 0.4 : 1; });
      camera.position.set(s.pointer.x * 0.3, 0.3, 8.2); camera.lookAt(0, 0.3, 0);
    };
  },

  // post 4: the audit spool
  spool(api) {
    const { scene, camera } = api;
    api.trigger = api.mount.closest('section'); api.start = 'top 80%'; api.end = 'bottom 20%';
    const events = ['02:14:07  read  LN 2026090412 p.1 to p.118', '02:14:31  calculation  Form 1084 line 13 add back p.47', '02:14:52  calculation  24 month average 8,412.50', '02:15:02  routing  package to J. Ortiz, DE', '09:12:40  edit  line 24b kept at 1,380.00 by J. Ortiz', '09:14:05  signature  J. Ortiz, DE', '09:14:06  audit  event logged, before and after values'];
    const planes = events.map((e, i) => { const t = textPlane(e, 7, 0.5, { size: 22, w: 1120, h: 80, rule: true }); t.position.set(0, -0.2 + i * 0.05, -i * 2.4); t.rotation.x = -0.25; scene.add(t); return t; });
    const spoolL = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-3.6, -0.6, 1), new THREE.Vector3(-3.6, -1.2, -18)]), new THREE.LineBasicMaterial({ color: RULE })); scene.add(spoolL);
    const spoolR = spoolL.clone(); spoolR.position.x = 7.2; scene.add(spoolR);
    api.update = (s) => {
      planes.forEach((p, i) => { const k = clamp01((s.p - i * 0.1) * 3); p.material.opacity = 0.15 + 0.85 * k; p.position.z = -i * 2.4 + (1 - k) * 0.8; });
      camera.position.set(s.pointer.x * 0.4, 1.6 + s.p * 2, 4 + s.p * 9); camera.lookAt(0, -0.4, -6 - s.p * 3);
    };
  },

  // /drafter: the output tray
  tray(api) {
    const { scene, camera } = api;
    api.trigger = document.getElementById('inputs'); api.start = 'top 70%'; api.end = 'bottom 30%';
    const printer = lineBox(4.2, 0.9, 1.6, PAPER, 0.7); printer.position.set(0, 2.2, -0.5); scene.add(printer);
    const slot = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.9, 1.75, 0.3), new THREE.Vector3(1.9, 1.75, 0.3)]), new THREE.LineBasicMaterial({ color: PAPER })); scene.add(slot);
    const tray = lineBox(4.4, 0.16, 2.4, ASH, 0.8); tray.position.set(0, -1.2, 0.6); scene.add(tray);
    const trayBack = lineRect(4.4, 0.7, ASH, 0.5); trayBack.position.set(0, -0.85, -0.6); scene.add(trayBack);
    let lines = [], push = 0;
    function setRows(rows) {
      lines.forEach((l) => { scene.remove(l); l.material.map.dispose(); l.material.dispose(); l.geometry.dispose(); });
      lines = rows.map((r, i) => { const t = textPlane(r.length > 62 ? r.slice(0, 60) + '…' : r, 3.8, 0.34, { size: 20, w: 1216, h: 108, bg: '#26282B', rule: true }); t.userData.k = 0; t.userData.i = i; t.position.set(0, 1.7, 0.3); scene.add(t); return t; });
      push = 1;
    }
    document.addEventListener('drafter:rows', (e) => setRows(e.detail));
    api.update = (s) => {
      push *= 0.96;
      lines.forEach((l, i) => { l.userData.k = Math.min(1, l.userData.k + 0.04 * (i === 0 || lines[i - 1].userData.k > 0.6 ? 1 : 0)); const k = l.userData.k; const restY = -0.95 + (lines.length - 1 - i) * 0.16; l.position.y = 1.7 - k * (1.7 - restY); l.position.z = 0.3 + k * 0.5; l.rotation.x = -k * 0.72; });
      camera.position.set(s.pointer.x * 0.3, 2.6 + s.pointer.y * 0.2 - s.p * 0.8, 6.2 - push * 0.6 - s.p * 0.8); camera.lookAt(0, -0.1, 0);
    };
    if (window.__drafter) { const d = window.__drafter.draft(window.__drafter.read()); setRows(d.rows.map((r) => `${r.side}  ${r.text}`)); }
  },

  // /contact: the address plate
  plate(api) {
    const { scene, camera } = api;
    api.trigger = document.getElementById('plate-row'); api.start = 'top 90%'; api.end = 'bottom 10%';
    const g = new THREE.Group(); scene.add(g);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(6.4, 4, 0.2), new THREE.MeshBasicMaterial({ color: SLATE })); g.add(plate);
    const edge = lineBox(6.4, 4, 0.2, PAPER, 0.7); g.add(edge);
    const cells = [['address', '[Physical Address]'], ['phone', '[PHONE NUMBER]'], ['support email', 'support@financingbot.com'], ['hours', 'Monday to Friday, 8:00 to 18:00 Eastern']];
    cells.forEach(([k, v], i) => { const kk = textPlane(k, 1.6, 0.34, { size: 22, color: '#9A9C98', opacity: 0.35 }); kk.position.set(-2.3, 1.3 - i * 0.85, 0.12); g.add(kk); const vv = textPlane(v, 4.2, 0.34, { size: 22, opacity: 0.35 }); vv.position.set(0.7, 1.3 - i * 0.85, 0.12); g.add(vv); const r = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-3, 1.05 - i * 0.85, 0.12), new THREE.Vector3(3, 1.05 - i * 0.85, 0.12)]), new THREE.LineBasicMaterial({ color: RULE })); g.add(r); });
    const routePts = []; for (let i = 0; i <= 60; i++) routePts.push(new THREE.Vector3(-3 + i * 0.1, -1.7 + Math.sin(i * 0.25) * 0.12, 0.13));
    const route = new THREE.Line(new THREE.BufferGeometry().setFromPoints(routePts), new THREE.LineBasicMaterial({ color: PAPER })); route.geometry.setDrawRange(0, 0); g.add(route);
    api.update = (s) => { g.rotation.y += (s.pointer.x * 0.16 - g.rotation.y) * 0.08; g.rotation.x += (-s.pointer.y * 0.1 - g.rotation.x) * 0.08; route.geometry.setDrawRange(0, Math.floor(s.p * 61)); camera.position.set(0, 0, 7.2); camera.lookAt(0, 0, 0); };
  },

  // /cart: the tray
  cart(api) {
    const { scene, camera } = api;
    api.trigger = document.getElementById('cart-head'); api.start = 'top 80%'; api.end = 'bottom top';
    const tray = lineBox(6, 0.2, 3, ASH, 0.8); tray.position.y = -1.2; scene.add(tray);
    let slabs = [];
    function paint() {
      slabs.forEach((s) => scene.remove(s)); slabs = [];
      const c = window.__fb.cart.getCart();
      c.lines.forEach((l, i) => { const t = textPlane(`${l.name}   ×${l.qty}   ${window.__fb.cart.money(l.unitPrice * l.qty)}`, 5, 0.5, { size: 24, bg: '#26282B', box: '#9A9C98' }); t.position.set(-6, -0.9 + i * 0.6, 0.6 - i * 0.5); t.userData.i = i; scene.add(t); slabs.push(t); });
      if (!c.lines.length) { const t = textPlane('0 files in the cart', 5, 0.5, { size: 24, color: '#9A9C98', align: 'center' }); t.position.set(0, -0.6, 0); scene.add(t); slabs.push(t); }
    }
    document.addEventListener('cart:change', paint); paint();
    api.update = (s) => { slabs.forEach((sl, i) => { if (sl.userData.i === undefined) return; const k = clamp01((s.t - i * 0.25) * 1.6); sl.position.x = -6 + 6 * (1 - Math.pow(1 - k, 3)); }); camera.position.set(s.pointer.x * 0.3, 1.2 + s.p * 1.5, 7.5); camera.lookAt(0, -0.6 - s.p * 0.4, 0); };
  },

  // /checkout: the four section slabs
  slabs(api) {
    const { scene, camera } = api;
    api.trigger = document.getElementById('checkout-form'); api.start = 'top 60%'; api.end = 'bottom 60%';
    const names = ['01  Account', '02  Billing', '03  Payment', '04  Review'];
    const slabs = names.map((n, i) => { const g = new THREE.Group(); const box = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2, 0.14), new THREE.MeshBasicMaterial({ color: SLATE })); const e = lineBox(3.2, 2, 0.14, PAPER, 0.5); const t = textPlane(n, 2.8, 0.4, { size: 30 }); t.position.set(0, 0.6, 0.08); g.add(box, e, t); g.position.set(i * 0.9 - 1.3, 0, -i * 1.6); g.userData = { e, t, lit: 0 }; scene.add(g); return g; });
    let active = 0;
    document.addEventListener('checkout:section', (e) => (active = e.detail));
    api.update = (s) => { slabs.forEach((g, i) => { const want = i === active ? 1 : 0; g.userData.lit += (want - g.userData.lit) * 0.1; const L = g.userData.lit; g.position.z = -i * 1.6 + L * 1.2; g.userData.e.material.opacity = 0.35 + 0.65 * L; g.userData.t.material.opacity = 0.5 + 0.5 * L; }); camera.position.set(1.5 + s.pointer.x * 0.2, 0.8, 6.5); camera.lookAt(-0.4, 0, -2); };
  },

  // /order-confirmation: the seal settles
  seal(api) {
    const { scene, camera } = api;
    api.trigger = document.getElementById('placed'); api.start = 'top 90%'; api.end = 'bottom top';
    const slab = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, 3.4), new THREE.MeshBasicMaterial({ color: SLATE })); scene.add(slab); scene.add(lineBox(5, 0.3, 3.4, ASH, 0.7));
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512; const c = cv.getContext('2d');
    c.strokeStyle = '#E9E5DA'; c.lineWidth = 6; c.strokeRect(12, 12, 488, 488); c.lineWidth = 4; c.strokeRect(32, 32, 448, 448);
    c.fillStyle = '#E9E5DA'; c.font = '28px "Fragment Mono", monospace'; c.textAlign = 'center'; c.fillText('PREPARED', 256, 84); c.font = '20px "Fragment Mono", monospace'; c.fillText('DECIDED BY THE UNDERWRITER OF RECORD', 256, 462);
    c.save(); c.translate(80, 256); c.rotate(-Math.PI / 2); c.font = '28px "Fragment Mono", monospace'; c.fillText('CALCULATED', 0, 0); c.restore(); c.save(); c.translate(432, 256); c.rotate(Math.PI / 2); c.fillText('DOCUMENTED', 0, 0); c.restore();
    c.lineWidth = 7; c.lineCap = 'square'; [170, 210, 250, 290].forEach((x) => { c.beginPath(); c.moveTo(x, 190); c.lineTo(x, 300); c.stroke(); }); c.beginPath(); c.moveTo(150, 296); c.lineTo(316, 196); c.stroke();
    c.lineWidth = 4; c.strokeRect(190, 330, 132, 44); c.font = '24px "Fragment Mono", monospace'; c.fillText('LN 2026', 256, 362);
    const tex = new THREE.CanvasTexture(cv);
    const sealM = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); sealM.rotation.x = -Math.PI / 2; sealM.position.y = 3; scene.add(sealM);
    api.update = (s) => { const k = clamp01(s.t / 1.2); const e = 1 - Math.pow(1 - k, 4); sealM.position.y = 3 - e * 2.83; const press = k > 0.99 ? 0.01 : 0; sealM.position.y -= press; camera.position.set(s.pointer.x * 0.4, 3.2 - s.p * 0.6 - e * 0.4, 4.6 - e * 0.6); camera.lookAt(0, 0.2, 0); };
  },

  // legal pages: the dim ruled field
  field(api) {
    const { scene, camera } = api;
    api.trigger = document.body; api.start = 'top top'; api.end = 'bottom bottom';
    for (let i = 0; i < 60; i++) { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-30, 0, -i * 1.2), new THREE.Vector3(30, 0, -i * 1.2)]), new THREE.LineBasicMaterial({ color: PAPER, transparent: true, opacity: 0.12 })); l.position.y = -2; scene.add(l); }
    api.update = (s) => { camera.position.set(0, 0.6, 6 - s.p * 24); camera.lookAt(0, -2.4, -30); };
  },
};

export async function mountScenes({ env, gsap, ScrollTrigger }) {
  THREE = await loadThree();
  document.querySelectorAll('.scene[data-scene]').forEach((mount) => {
    const key = mount.dataset.scene; if (!scenes[key] || key === 'wall') return;
    try { makeScene(mount, { gsap, ScrollTrigger, env }, scenes[key]); } catch (e) { console.warn('scene', key, 'fell back to the poster', e); mount.classList.add('is-poster'); }
  });
}
