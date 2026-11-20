// ─────────────────────────────────────────────────────────────
//  第2章「無限」 — z ← z² + c
//  マンデルブロ集合を約60億倍まで拡大する。GPU の単精度では本来 10⁵ 倍あたりで
//  画面が崩れるため、「摂動法＋リベース」で計算する：
//   ・基準点の軌道 Zₙ だけを倍精度（JS）で求め、
//   ・各ピクセルは基準からのずれ δ だけを単精度で追う：δ ← 2Zδ + δ² + δc
//  ズーム先のミニブロ（小さな集合のコピー）も、箱の周期法とニュートン法でこの場で探す。
// ─────────────────────────────────────────────────────────────
import { program, dataTexture } from '../core/gl.js';
import { HEADER, COMMON } from '../core/glsl.js';
import { createCurve, MANDEL_VIEW } from '../core/curve.js';
import { FONT, INK, ACCENT } from '../core/text.js';
import { SECTIONS, clamp, smooth, easeInOut, lerp } from '../timeline.js';

// ── 複素数（倍精度）
const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
const csub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
const cabs = (a) => Math.hypot(a[0], a[1]);

// 箱の周期法：小さな正方形の像が原点を囲んだ反復回数＝そこにあるミニブロの周期
function boxPeriod(c, r, maxIter) {
  const cs = [[c[0] - r, c[1] - r], [c[0] + r, c[1] - r], [c[0] + r, c[1] + r], [c[0] - r, c[1] + r]];
  let zs = cs.map(() => [0, 0]);
  for (let n = 1; n <= maxIter; n++) {
    zs = zs.map((z, k) => cadd(cmul(z, z), cs[k]));
    let inside = false;
    for (let i = 0, j = 3; i < 4; j = i++) {
      const a = zs[i], b = zs[j];
      if ((a[1] > 0) !== (b[1] > 0) && 0 < (b[0] - a[0]) * (0 - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    if (inside) return n;
  }
  return 0;
}
// ニュートン法：周期 p の中心（核）  f(c) = z_p(c) = 0
function nucleus(c, p) {
  for (let k = 0; k < 80; k++) {
    let z = [0, 0], dz = [0, 0];
    for (let i = 0; i < p; i++) { dz = cadd(cmul([2, 0], cmul(z, dz)), [1, 0]); z = cadd(cmul(z, z), c); }
    const step = cdiv(z, dz);
    c = csub(c, step);
    if (cabs(step) < 1e-18) break;
  }
  return c;
}
// ミニブロの大きさと向き（複素数）：c = 核 + size·c' で全体集合と対応する
function minibrotSize(c, p) {
  let z = [0, 0], l = [1, 0], b = [1, 0];
  for (let i = 1; i < p; i++) { z = cadd(cmul(z, z), c); l = cmul([2, 0], cmul(z, l)); b = cadd(b, cdiv([1, 0], l)); }
  return cdiv([1, 0], cmul(b, cmul(l, l)));
}

const FS = HEADER + COMMON + `
in vec2 vUv; out vec4 o;
uniform sampler2D orbit; uniform int period, maxIter;
uniform vec2 res, jitter, dc0, ax;     // ax: 1ピクセルぶんの複素数（回転と縮尺を含む）
uniform float reveal, pxSize, hue, glowAmt, fadeOut, zoomT, pEff, nuOff;
vec2 cm(vec2 a, vec2 b){ return vec2(a.x*b.x-a.y*b.y, a.x*b.y+a.y*b.x); }
vec2 Z(int m){ return texelFetch(orbit, ivec2(m & 4095, m >> 12), 0).xy; }

vec3 palette(float x){
  // 漆黒 → 藍 → 瑠璃 → 水色 → 白金 → 橙 → 深紅 → 葡萄 の循環
  vec3 cs[8] = vec3[8](vec3(0.0,0.004,0.02), vec3(0.06,0.02,0.22), vec3(0.02,0.18,0.65), vec3(0.10,0.62,0.90),
                       vec3(1.0,0.88,0.66), vec3(0.95,0.42,0.06), vec3(0.42,0.04,0.03), vec3(0.10,0.0,0.07));
  x = fract(x)*8.0;
  int i = int(floor(x)); float f = fract(x);
  f = f*f*(3.-2.*f);
  return mix(cs[i], cs[(i+1)%8], f);
}

void main(){
  vec2 px = gl_FragCoord.xy + jitter - res*0.5;
  vec2 dc = dc0 + px.x*ax + px.y*vec2(-ax.y, ax.x);
  vec2 d = vec2(0);           // 基準軌道からのずれ δ
  vec2 D = vec2(0);           // dz/dc × ピクセル幅（距離推定用）
  vec2 z = vec2(0);
  int m = 0, n = 0;
  float r2 = 0.0;
  bool escaped = false;
  vec2 dRec = vec2(1e9);
  for (n = 0; n < maxIter; n++){
    if (m == 0 && n > 0){
      // 周期性の判定：1周期ごとのずれが収束していれば、集合の内部（もう脱出しない）
      vec2 dd = d - dRec;
      if (dot(dd,dd) < 1e-10*dot(d,d) + 1e-36) break;
      dRec = d;
    }
    vec2 Zm = Z(m);
    D = 2.0*cm(Zm + d, D) + vec2(pxSize, 0.0);
    d = cm(2.0*Zm + d, d) + dc;
    m++;
    if (m >= period) m = 0;  // 周期軌道なので、一周したら先頭へ
    z = Z(m) + d;
    r2 = dot(z,z);
    if (r2 > 1e8){ escaped = true; break; }
    if (r2 < dot(d,d)){ d = z; m = 0; }   // リベース：基準より原点に近づいたら乗り換える
  }
  vec3 col = vec3(0);
  if (escaped){
    float lz = 0.5*log(r2);
    float nu = float(n) + 1.0 - log2(lz);
    float de = lz*sqrt(r2)/max(length(D), 1e-30);   // 境界までの距離（ピクセル単位）
    // 疑似的な起伏：ポテンシャルの法線で光を当てる
    vec2 u = normalize(vec2(z.x*D.x + z.y*D.y, z.y*D.x - z.x*D.y));
    vec2 L = normalize(vec2(-0.6, 0.8));
    float sh = max(0.0, (dot(u, L) + 1.1)/(1.0 + 1.1));
    float nuL = max(nu - nuOff, 1.0)/pEff;  // 最後はミニブロの周期で割る＝「局所的な」反復回数
    float x = pow(nuL, 0.45)*0.13 + hue;
    col = palette(x);
    col *= smoothstep(0.8, 7.0, nuL);    // 遠い外側は暗い（最初と最後の画面がそろう）
    col *= 0.30 + 0.85*sh;
    float edge = exp(-de*2.2);           // 境界のごく近くだけ、ほのかに光らせる
    col += vec3(1.0,0.85,0.65)*edge*edge*glowAmt*smoothstep(0.5, 3.0, nuL);
    // 計算の進行を見せる：reveal より多くの反復が必要な点はまだ黒い
    col *= smoothstep(reveal, reveal*0.8, nu);
  }
  o = vec4(col*fadeOut, 1);
}`;

export default function infinity(ctx) {
  const { gl, W, H } = ctx;
  const S = SECTIONS.infinity;
  let prog, curve, orbitTex, P = 0, nuc, size, finalCenter, finalHalf, finalAngle, nuOff = 0;
  const h0 = MANDEL_VIEW.half, c0 = [MANDEL_VIEW.cx, MANDEL_VIEW.cy];
  const ZOOM_START = 1.7, ZOOM_END = 15.0;

  function view(lt) {
    const u = clamp((lt - ZOOM_START) / (ZOOM_END - ZOOM_START));
    // 対数スケールで等速のズーム。最初と最後だけ加速・減速（台形の速度曲線）
    const A = 0.13, vmax = 1 / (1 - A);
    const z = u < A ? vmax * u * u / (2 * A) : u > 1 - A ? 1 - vmax * (1 - u) * (1 - u) / (2 * A) : vmax * (u - A / 2);
    const half = Math.exp(lerp(Math.log(h0), Math.log(finalHalf), z));
    const k = Math.pow(half / h0, 1.12);
    const center = cadd(finalCenter, cmul(csub(c0, finalCenter), [k, 0]));
    const angle = lerp(0, finalAngle, easeInOut(z));
    return { half, center, angle, z, drift: 0 };
  }

  return {
    name: 'infinity', start: S.start, end: S.end,
    grade: { exposure: 1.0, bloom: 0.07, contrast: 1.12, saturation: 1.12, vignette: 0.42, grain: 0.03, aberration: 0.5 },
    init() {
      prog = program(gl, FS, undefined, 'mandelbrot');
      curve = createCurve(gl, 4096);
      // タツノオトシゴの谷の奥で、ミニブロを探す
      const seed = [-0.743643887037158704752191506114774, 0.131825904205311970493132056385139];
      P = boxPeriod(seed, 1.8e-8, 20000);
      nuc = nucleus(seed, P);
      size = minibrotSize(nuc, P);
      finalHalf = cabs(size) * h0;
      finalAngle = Math.atan2(size[1], size[0]);
      finalCenter = cadd(nuc, cmul(size, c0));
      console.log(`minibrot period=${P} nucleus=(${nuc[0]}, ${nuc[1]}) |size|=${cabs(size).toExponential(3)} arg=${(finalAngle * 180 / Math.PI).toFixed(1)}°  zoom=${(h0 / finalHalf).toExponential(3)}`);
      // 基準軌道（1周期ぶん）
      const data = new Float32Array(4096 * Math.ceil((P + 1) / 4096) * 4);
      let z = [0, 0];
      for (let i = 0; i <= P; i++) { data[i * 4] = z[0]; data[i * 4 + 1] = z[1]; z = cadd(cmul(z, z), nuc); }
      orbitTex = dataTexture(gl, 4096, Math.ceil((P + 1) / 4096), data);
      // 最終画面の配色合わせ：ミニブロでの脱出回数 ≈ 周期 × (全体集合での脱出回数) + 一定のずれ
      const esc = (c, max) => { let x = 0, y = 0; for (let n = 0; n < max; n++) { const xx = x * x - y * y + c[0]; y = 2 * x * y + c[1]; x = xx; const r = x * x + y * y; if (r > 1e8) return n + 1 - Math.log2(0.5 * Math.log(r)); } return -1; };
      const offs = [];
      for (let i = 0; i < 9; i++) for (let j = 0; j < 5; j++) {
        const cl = [-2.95 + i * 0.55, -1.2 + j * 0.6];
        const nm = esc(cl, 1000);
        if (nm < 0 || nm > 6) continue;
        const nb = esc(cadd(nuc, cmul(size, cl)), 60000);
        if (nb > 0) offs.push(nb - P * nm);
      }
      offs.sort((a, b) => a - b);
      nuOff = offs.length ? offs[offs.length >> 1] : 0;
      console.log('nuOff', nuOff.toFixed(1), 'samples', offs.length);
    },
    magnification(lt) { return h0 / view(lt).half; },
    render(lt, t, sub) {
      const v = view(lt);
      const px = (2 * v.half) / H;                           // 1ピクセルの幅
      const ax = [px * Math.cos(v.angle), px * Math.sin(v.angle)];
      const dc0 = csub(v.center, nuc);
      const decades = Math.log10(h0 / v.half);
      // 反復回数の上限：最初と最後で「局所的な上限」がそろうようにする（最後はミニブロの周期 × 約46）
      const KNOTS = [[0, 70], [1, 500], [3, 2600], [6, 6000], [8, 15000], [9.0, 26000], [9.8, 40000]];
      let maxIter = 40000;
      for (let k = 0; k < KNOTS.length - 1; k++) {
        const [d0, i0] = KNOTS[k], [d1, i1] = KNOTS[k + 1];
        if (decades <= d1) { maxIter = Math.round(Math.exp(lerp(Math.log(i0), Math.log(i1), clamp((decades - d0) / (d1 - d0))))); break; }
      }
      const reveal = lt > 1.75 ? 1e9 : Math.exp(lerp(Math.log(1.5), Math.log(4000), smooth(0.15, 1.75, lt)));
      // 描画は横帯に分けて GPU を長時間ふさがないようにする
      prog.use({ orbit: orbitTex, period: P, maxIter, res: [W, H], jitter: sub.jitter, dc0, ax, reveal, pxSize: px,
        hue: 0.0, glowAmt: 0.35, fadeOut: 1.0, zoomT: v.z, pEff: Math.exp(Math.log(P) * smooth(0.8, 1.0, v.z)), nuOff: nuOff * smooth(0.8, 1.0, v.z) });
      const bands = maxIter > 20000 ? 24 : maxIter > 4000 ? 8 : 2;
      gl.enable(gl.SCISSOR_TEST);
      for (let b = 0; b < bands; b++) {
        const y0 = Math.floor((H * b) / bands), y1 = Math.floor((H * (b + 1)) / bands);
        gl.scissor(0, y0, W, y1 - y0);
        gl.fullscreen();
        gl.flush();
      }
      gl.disable(gl.SCISSOR_TEST);
      // 第1章から受け継いだ輪郭線（カージオイド）が、集合の計算とともに消えていく
      const ca = 1 - smooth(0.3, 2.0, lt);
      if (ca > 0) curve.draw({ res: [W, H], center: [W / 2, H / 2], jitter: sub.jitter, cardioid: 1, amp: 0.01,
        view: [MANDEL_VIEW.cx, MANDEL_VIEW.cy, MANDEL_VIEW.half], base: 1.45 * ca, peak: 1.25 * ca, trail: 2.3, head: lt * 0.5 + 8 * 0.5 + 0.25, width: 1.7, color: [1, 0.4, 0.14] });
    },
    text(T, lt) {
      T.chapter({ num: '02', kanji: '無限', en: 'INFINITY', formula: 'z ← z² + c', desc: 'たった一行の式に、果てしない複雑さが眠っている。' }, lt, 5.6);
      T.label('02', '無限', 'INFINITY', lt, 15.6);
      // 倍率カウンター
      const v = view(lt);
      const mag = h0 / v.half;
      const a = smooth(2.0, 2.8, lt) * (1 - smooth(15.2, 15.8, lt));
      if (a > 0) {
        const s = Math.round(mag).toLocaleString('en-US');
        T.text('倍率', W - 128, H - 158, { font: FONT.gothic, size: 20, weight: 600, align: 'right', alpha: a * 0.7, spacing: 8, color: ACCENT });
        T.text('×' + s, W - 128, H - 96, { font: FONT.mono, size: 44, weight: 400, align: 'right', alpha: a, shadow: 14 });
      }
      const ea = smooth(13.6, 14.4, lt) * (1 - smooth(15.4, 16.0, lt));
      if (ea > 0) T.reveal('拡大した先に、また「全体」が現れる。', W / 2, H - 118, clamp((lt - 13.6) / 1.2), { font: FONT.gothic, size: 34, weight: 300, align: 'center', alpha: ea, spread: 0.7, shadow: 14 });
    },
  };
}
