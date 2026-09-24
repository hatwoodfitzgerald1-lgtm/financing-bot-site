// The sixty rows of the Overnight Queue wall, from the same row data as
// queue.html (queueRows.json), with each row's cleared income cell generated
// deterministically so the wall, the pocket queue and the poster agree.
import rows from './queueRows.json';

function seeded(n) {
  let s = (n * 9301 + 49297) % 233280;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
function money(v) { return '$' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function plain(v) { return v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

const fixed = {
  12: { income: '$8,412.50 p.47', arithmetic: '(97,270.00 + 104,630.00) ÷ 24 = 8,412.50, Schedule C p.47, p.52' },
  18: { income: 'see p.27, p.31', arithmetic: 'W2 p.31 and paystub p.27 name different employers. Both pages listed. Nothing decided.' },
  23: { income: '$6,140.00 p.33', arithmetic: '(73,680.00 + 73,680.00) ÷ 24 = 6,140.00, W2 p.33, p.36' },
};

export const wallRows = rows.map((r) => {
  const rnd = seeded(r.idx);
  let income, arithmetic;
  if (fixed[r.idx]) ({ income, arithmetic } = fixed[r.idx]);
  else if (r.status === 'referred up') {
    const a = 9 + Math.floor(rnd() * 40), b = a + 2 + Math.floor(rnd() * 30);
    income = `see p.${a}, p.${b}`;
    arithmetic = `Two pages disagree, p.${a} and p.${b}. Both listed. Nothing decided.`;
  } else {
    const y1 = Math.round((54000 + rnd() * 78000) / 10) * 10;
    const y2 = Math.round(y1 * (0.97 + rnd() * 0.12) / 10) * 10;
    const monthly = Math.round(((y1 + y2) / 24) * 100) / 100;
    const p = 20 + Math.floor(rnd() * 60);
    const src = rnd() < 0.3 ? 'Schedule C' : 'W2';
    income = `${money(monthly)} p.${p}`;
    arithmetic = `(${plain(y1)} + ${plain(y2)}) ÷ 24 = ${plain(monthly)}, ${src} p.${p}, p.${p + 5}`;
  }
  return { ...r, index: String(r.idx).padStart(4, '0'), income, arithmetic };
});

export const wallMix = { ready: 36, out: 21, up: 3 };
