import fs from 'node:fs';
const src = fs.readFileSync('minibrot.mjs', 'utf8').split('const target')[0];
eval(src + `
const seen = new Map();
const centers = [
  C(-0.743643887037158704752191506114774, 0.131825904205311970493132056385139),
  C(-0.74364390138939729, 0.13182587743631075), // p936
  C(-0.7746806106269039, -0.1374168856037867),  // 別の有名な場所（象の谷の近く）
  C(-1.7499576837060935, 0.0000000000000000),
  C(-0.10109636384562, 0.95628651080914),
  C(0.2501, 0.0000016),
  C(-0.7453, 0.1127),
];
for (const c0 of centers) {
  for (let e = -6; e >= -12; e -= 0.25) {
    const r = Math.pow(10, e);
    const p = boxPeriod(c0, r, 60000);
    if (!p || p > 8000) continue;
    const n = nucleus(c0, p);
    const s = size(n, p);
    const key = p + ':' + n.re.toFixed(14);
    if (seen.has(key)) continue; seen.set(key, 1);
    const as = abs(s);
    if (as < 1e-12 || as > 1e-7) continue;
    console.log('p=' + p, 'nuc=(' + n.re.toPrecision(17) + ', ' + n.im.toPrecision(17) + ')', '|s|=' + as.toExponential(2), 'arg=' + (Math.atan2(s.im, s.re) * 180 / Math.PI).toFixed(1), 'from c0#' + centers.indexOf(c0), 'r=' + r.toExponential(1));
  }
}`);
