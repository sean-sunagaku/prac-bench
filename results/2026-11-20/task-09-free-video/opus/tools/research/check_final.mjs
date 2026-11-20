const nuc = [-0.7436439788719176, 0.13182594102973597];
const P = 858;
const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]], cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
function size(c, p) { let z = [0, 0], l = [1, 0], b = [1, 0]; for (let i = 1; i < p; i++) { z = cadd(cmul(z, z), c); l = cmul([2, 0], cmul(z, l)); b = cadd(b, cdiv([1, 0], l)); } return cdiv([1, 0], cmul(b, cmul(l, l))); }
const s = size(nuc, P);
console.log('size', s, Math.hypot(...s));
function esc(c, max) { let x = 0, y = 0; for (let n = 0; n < max; n++) { const xx = x * x - y * y + c[0]; y = 2 * x * y + c[1]; x = xx; if (x * x + y * y > 1e8) return n; } return -1; }
// 局所座標 c' での脱出回数（c = nuc + s·c'）
const line = [];
for (let i = 0; i <= 60; i++) {
  const lx = -2.2 + i * 0.05;
  const c = cadd(nuc, cmul(s, [lx, 0]));
  line.push(`${lx.toFixed(2)}:${esc(c, 60000)}`);
}
console.log(line.join(' '));
// 全体集合の同じ位置との比較
console.log([-2.2, -2.0, -1.9, -1.5, -1.25, -1.0, -0.75, -0.5, 0, 0.25, 0.3, 0.5, 1.0].map((x) => `${x}:${esc([x, 0], 60000)}`).join(' '));
// 最終画面の四隅と辺
for (const [lx, ly] of [[-2.99, 1.25], [1.46, 1.25], [-2.99, -1.25], [1.46, -1.25], [-0.765, 1.25], [1.46, 0], [-2.99, 0]]) {
  const c = cadd(nuc, cmul(s, [lx, ly])); console.log(lx, ly, esc(c, 60000));
}
