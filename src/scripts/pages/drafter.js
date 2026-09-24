// The Condition Drafter: six real inputs, a computed condition list from the
// rules table, the count line, the three states, the pack that fits.
import rules from '../../data/drafterRules.json';
import { rollTo } from '../drum.js';

export function init({ env }) {
  const form = document.getElementById('drafter-form');
  const desigRow = document.getElementById('row-designation');
  const empty = document.getElementById('empty'), blocks = document.getElementById('blocks'), routing = document.getElementById('routing');
  const count = document.getElementById('count'), countDrum = document.getElementById('count-drum'), countRest = document.getElementById('count-rest');
  const ptd = document.getElementById('ptd'), ptc = document.getElementById('ptc'), foot = document.getElementById('res-foot');
  const volOut = document.getElementById('vol-out'), volRange = document.getElementById('vol-range');
  const fitsS = document.getElementById('fits-sentence'), fitsE = document.getElementById('fits-empty'), fitsB = document.getElementById('fits-btn'), fitsL = document.getElementById('fits-label'), fitsP = document.getElementById('fits-price');
  const tray2d = document.getElementById('tray-2d');
  let prevKeys = [];

  function read() {
    const fd = new FormData(form);
    return { product: fd.get('product'), income: fd.getAll('income'), assets: fd.get('assets'), aus: fd.get('aus'), designation: fd.get('designation'), volume: parseInt(volRange.value, 10) };
  }
  function draft(s) {
    const out = [];
    const add = (trigger) => rules.rules.filter((r) => r.trigger === trigger).forEach((r) => out.push(r));
    if (!s.product) return { rows: [], note: null };
    if (s.income.includes('w2')) add('w2');
    if (s.income.includes('se')) add('se');
    if (s.income.includes('rental')) { add('rental'); if (s.product === 'FHA') add('rental-fha'); }
    if (s.income.includes('obc')) add('obc');
    if (s.assets === 'deposit') add('deposit');
    if (s.aus === 'open') add('finding');
    if (s.product === 'FHA') add('fha');
    if (s.product === 'VA') add('va');
    const note = (s.product === 'FHA' || s.product === 'VA') && s.designation === 'none' ? rules.rules.find((r) => r.trigger === 'routing') : null;
    return { rows: out, note };
  }
  function row(r, idx) {
    const li = document.createElement('li'); li.dataset.key = r.side + r.text;
    li.innerHTML = `<span class="ci">${r.side} ${String(idx).padStart(2, '0')}</span><span class="ct">${r.text}</span><span class="cc">${r.cite}</span><span class="chip">${r.chip}</span>`;
    return li;
  }
  function render() {
    const s = read();
    const isGov = s.product === 'FHA' || s.product === 'VA';
    desigRow.hidden = !isGov;
    const { rows, note } = draft(s);
    if (!s.product) { empty.hidden = false; blocks.hidden = true; routing.hidden = true; count.hidden = true; foot.hidden = true; fitsS.hidden = true; fitsB.hidden = true; fitsE.hidden = false; tray2d.textContent = ''; prevKeys = []; return; }
    empty.hidden = true; blocks.hidden = false; foot.hidden = false; count.hidden = false;
    const P = rows.filter((r) => r.side === 'PTD'), C = rows.filter((r) => r.side === 'PTC');
    const n = P.length + C.length;
    rollTo(countDrum, String(n));
    countRest.textContent = ` drafted: ${P.length} PTD, ${C.length} PTC`;
    const keys = rows.map((r) => r.side + r.text);
    const paintList = (ol, list) => {
      // removed rows slide out, new rows land one by one
      [...ol.children].forEach((li) => { if (!keys.includes(li.dataset.key)) { li.classList.add('out'); setTimeout(() => li.remove(), env.rm ? 0 : 400); } });
      ol.querySelectorAll('.none').forEach((x) => x.remove());
      list.forEach((r, i) => {
        const key = r.side + r.text;
        let li = [...ol.children].find((x) => x.dataset.key === key && !x.classList.contains('out'));
        if (!li) { li = row(r, i + 1); li.style.animationDelay = env.rm ? '0s' : (i * 0.14) + 's'; ol.appendChild(li); }
        else { li.querySelector('.ci').textContent = `${r.side} ${String(i + 1).padStart(2, '0')}`; ol.appendChild(li); }
      });
      if (!list.length) { const d = document.createElement('li'); d.className = 'none'; d.textContent = 'none drafted'; ol.appendChild(d); }
    };
    paintList(ptd, P); paintList(ptc, C);
    if (note) { routing.hidden = false; routing.innerHTML = `<span class="m ash">note</span><span>${note.text}</span><span class="chip">${note.chip}</span>`; } else routing.hidden = true;
    prevKeys = keys;
    // the tray mirror (2D fallback list; the 3D tray listens for the event)
    tray2d.textContent = ''; rows.forEach((r, i) => { const d = document.createElement('div'); d.textContent = `${r.side} ${r.text}`; d.style.animationDelay = (i * 0.1) + 's'; tray2d.appendChild(d); });
    document.dispatchEvent(new CustomEvent('drafter:rows', { detail: rows.map((r) => `${r.side}  ${r.text}`) }));
    // the pack that fits
    const v = s.volume; const band = v < 500 ? 'under500' : v <= 2000 ? '500to2000' : 'above2000';
    const pk = rules.packs[band];
    fitsS.textContent = pk.sentence.replace('{volume}', v.toLocaleString('en-US'));
    fitsS.hidden = false; fitsE.hidden = true; fitsB.hidden = false; fitsB.href = pk.href; fitsL.textContent = pk.button; fitsP.textContent = pk.price;
    fitsB.setAttribute('aria-label', `${pk.button}, ${pk.price}`);
  }
  form.addEventListener('change', () => { form.querySelectorAll('.tabs label').forEach((l) => l.classList.toggle('on', l.querySelector('input').checked)); render(); });
  form.addEventListener('input', (e) => { if (e.target === volRange) { volOut.textContent = volRange.value; render(); } });
  document.getElementById('vol-minus').addEventListener('click', () => { volRange.value = Math.max(200, parseInt(volRange.value, 10) - 50); volOut.textContent = volRange.value; render(); });
  document.getElementById('vol-plus').addEventListener('click', () => { volRange.value = Math.min(5000, parseInt(volRange.value, 10) + 50); volOut.textContent = volRange.value; render(); });
  render();
  window.__drafter = { read, draft };
}
