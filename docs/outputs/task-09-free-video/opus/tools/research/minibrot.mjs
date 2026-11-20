// ミニブロ（小さなマンデルブロ集合のコピー）を探す：箱の周期法 → ニュートン法 → 大きさと向きの推定
const C = (re, im) => ({ re, im });
const add = (a, b) => C(a.re + b.re, a.im + b.im), sub = (a, b) => C(a.re - b.re, a.im - b.im);
const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const div = (a, b) => { const d = b.re * b.re + b.im * b.im; return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
const abs = (a) => Math.hypot(a.re, a.im);

function boxPeriod(c, r, maxIter) {
  let cs = [C(c.re - r, c.im - r), C(c.re + r, c.im - r), C(c.re + r, c.im + r), C(c.re - r, c.im + r)];
  let zs = cs.map(() => C(0, 0));
  for (let n = 1; n <= maxIter; n++) {
    zs = zs.map((z, k) => add(mul(z, z), cs[k]));
    // 原点が四角形の内側にあるか（交差数）
    let inside = false;
    for (let i = 0, j = 3; i < 4; j = i++) {
      const a = zs[i], b = zs[j];
      if ((a.im > 0) !== (b.im > 0) && 0 < (b.re - a.re) * (0 - a.im) / (b.im - a.im) + a.re) inside = !inside;
    }
    if (inside) return n;
    if (zs.some((z) => abs(z) > 1e12)) return 0;
  }
  return 0;
}
function nucleus(c0, p) {
  let c = c0;
  for (let k = 0; k < 80; k++) {
    let z = C(0, 0), dz = C(0, 0);
    for (let i = 0; i < p; i++) { dz = add(mul(C(2, 0), mul(z, dz)), C(1, 0)); z = add(mul(z, z), c); }
    const step = div(z, dz);
    c = sub(c, step);
    if (abs(step) < 1e-17) break;
  }
  return c;
}
function size(c, p) {
  let z = C(0, 0), l = C(1, 0), b = C(1, 0);
  for (let i = 1; i < p; i++) { z = add(mul(z, z), c); l = mul(C(2, 0), mul(z, l)); b = add(b, div(C(1, 0), l)); }
  return div(C(1, 0), mul(b, mul(l, l)));
}
const target = C(-0.743643887037158704752191506114774, 0.131825904205311970493132056385139);
for (const r of [1e-3, 1e-4, 1e-5, 1e-6, 1e-7, 1e-8, 1e-9]) {
  const p = boxPeriod(target, r, 100000);
  if (!p) { console.log(r, 'no period'); continue; }
  const n = nucleus(target, p);
  const s = size(n, p);
  console.log(`r=${r.toExponential(0)}  period=${p}  nucleus=(${n.re.toPrecision(17)}, ${n.im.toPrecision(17)})  |size|=${abs(s).toExponential(3)}  arg=${(Math.atan2(s.im, s.re) * 180 / Math.PI).toFixed(2)}°  dist=${abs(sub(n, target)).toExponential(2)}`);
}
