// ─────────────────────────────────────────────────────────────
//  第6章「宇宙」 — 密度波理論
//  星は渦巻きの「腕」に縛られているわけではない。どの星も楕円軌道を回るだけ。
//  ただし軌道の向きが、半径に比例して少しずつずれている：θ(r) = k·r
//  すると楕円どうしが混み合う場所が渦巻き状に並び、そこが明るい腕に見える。
//  40万個の星、ガス、塵、すべてこの式で動いている。
// ─────────────────────────────────────────────────────────────
import { program } from '../core/gl.js';
import { HEADER, COMMON } from '../core/glsl.js';
import { FONT, ACCENT } from '../core/text.js';
import { SECTIONS, clamp, smooth, lerp, easeInOut } from '../timeline.js';

const NSTAR = 420000, NGAS = 14000, NDUST = 26000, NBG = 14000, NELL = 26, SEG = 256;

// ── 行列
function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
}
function lookAt(e, c, u) {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const norm = (a) => { const l = Math.hypot(...a); return a.map((x) => x / l); };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const z = norm(sub(e, c)), x = norm(cross(u, z)), y = cross(z, x);
  return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1];
}
function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) o[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k];
  return o;
}

const ORBIT = `
uniform float time, twist;
float ARM;   // 軌道上の混み合う場所（短軸の両端）＝渦巻きの腕にいるかどうか
// 楕円軌道：長半径 a、向き θ(a) = twist·k·a、角速度は平坦な回転曲線（v 一定 → ω ∝ 1/a）
vec3 orbit(float a, float ph0, float sc, float zo, float lag){
  float e = 0.40;
  float th = twist*4.6*a + time*0.035;
  float ph = ph0 + time*0.22/(a + 0.06);
  ARM = pow(abs(sin(ph + lag)), 10.0);
  vec2 p = vec2(a*cos(ph), a*(1.0-e)*sin(ph));
  p = rot(th)*p;
  vec2 j = vec2(fract(sin(sc*91.7)*4375.5), fract(sin(sc*37.3)*1753.1)) - 0.5;
  p += j*a*0.06;
  return vec3(p.x, zo, p.y);
}
`;

const VS_STAR = HEADER + COMMON + ORBIT + `
layout(location=0) in vec4 aA;   // a, 初期位相, 種, 縦方向
layout(location=1) in vec4 aB;   // 温度, 明るさ, 種類(0:円盤 1:バルジ 2:ガス 3:塵 4:背景), 大きさ
uniform mat4 VP; uniform vec3 cam; uniform vec2 res, jitter; uniform float alpha, sizeK, kind;
out vec3 vCol; out float vSoft;
void main(){
  if (abs(aB.z - kind) > 0.5 && !(kind < 0.5 && aB.z > 0.5 && aB.z < 1.5)) { gl_Position = vec4(2,2,2,1); return; }
  vec3 P;
  float arm = 0.0;
  if (aB.z > 3.5){                       // 遠くの星空
    P = normalize(aA.xyz - 0.5)*60.0;
  } else if (aB.z > 0.5 && aB.z < 1.5){  // バルジ：中心の古い星の集まり
    vec3 d = normalize(vec3(sin(aA.y*7.1)*cos(aA.z*13.3), sin(aA.z*13.3)*0.55, cos(aA.y*7.1)*cos(aA.z*13.3)));
    float r = aA.x;
    P = d*r;
    P.xz *= rot(time*0.25/(r+0.08));
  } else {
    float a = aA.x;
    float th = 1.0 - smoothstep(0.0, 1.0, a);
    P = orbit(a, aA.y, aA.z, aA.w*(0.010 + 0.045*th*th), aB.z > 2.5 ? -0.22 : 0.0);
    arm = ARM;
  }
  vec4 c = VP*vec4(P, 1.0);
  c.xy += jitter*2.0/res*c.w;
  gl_Position = c;
  float dist = length(P - cam);
  bool soft = aB.z > 1.5 && aB.z < 3.5;
  vSoft = soft ? 1.0 : 0.0;
  float bright = aB.y;
  bool hot = aB.x > 9000.0 && aB.z < 0.5;
  if (hot) bright *= 0.2 + 4.2*arm;      // 若い青い星は腕の中で生まれ、すぐに消える
  if (aB.z > 1.5 && aB.z < 2.5) bright *= arm*3.2;
  if (aB.z > 2.5 && aB.z < 3.5) bright *= 0.25 + arm*1.4;
  if (soft){
    gl_PointSize = clamp(aB.w*res.y/(dist*900.0), 1.0, 300.0);
  } else {
    gl_PointSize = aB.z > 3.5 ? 1.3 : clamp(1.1 + 0.9*aB.w*clamp(0.9/dist, 0.6, 2.2), 1.0, 3.6);
    bright *= aB.z > 3.5 ? 1.0 : clamp(1.4/dist, 0.55, 2.6);
  }
  vec3 col = aB.z < 1.5 || aB.z > 3.5 ? blackbody(aB.x) : (aB.z < 2.5 ? mix(vec3(1.0,0.28,0.42), vec3(0.4,0.55,1.0), step(0.7, fract(aA.z*7.3))) : vec3(0.55,0.75,1.0));
  vCol = col*bright*alpha;
}`;

const FS_STAR = HEADER + `
in vec3 vCol; in float vSoft; out vec4 o;
void main(){
  vec2 q = gl_PointCoord*2.0-1.0;
  float r2 = dot(q,q);
  float a = vSoft > 0.5 ? exp(-r2*4.0)*smoothstep(1.0, 0.6, r2) : exp(-r2*3.2);
  o = vec4(vCol*a, 1.0);
}`;

// 軌道の楕円（説明用の線）
const VS_ELL = HEADER + COMMON + ORBIT + `
layout(location=0) in float aI;
uniform mat4 VP; uniform vec2 res, jitter; uniform float nEll, seg, grow, width;
out float vD;
vec2 proj(vec3 P){ vec4 c = VP*vec4(P,1.0); return (c.xy/c.w*0.5+0.5)*res; }
vec3 ell(float a, float u){
  float e = 0.40;
  float th = twist*4.6*a + time*0.035;
  vec2 p = vec2(a*cos(u*TAU), a*(1.0-e)*sin(u*TAU));
  p = rot(th)*p;
  return vec3(p.x, 0.0, p.y);
}
void main(){
  int vid = gl_VertexID % 6;
  float ei = floor(aI/seg), si = mod(aI, seg);
  float a = 0.12 + 0.88*(ei+0.5)/nEll;
  float u0 = si/seg, u1 = (si+1.0)/seg;
  if (u0 > grow) { gl_Position = vec4(2,2,2,1); return; }
  vec2 p0 = proj(ell(a,u0)), p1 = proj(ell(a,u1));
  vec2 d = p1-p0; float L = max(length(d), 1e-4); vec2 t = d/L, n = vec2(-t.y, t.x);
  vec2 cn[6] = vec2[6](vec2(0,-1), vec2(1,-1), vec2(1,1), vec2(0,-1), vec2(1,1), vec2(0,1));
  vec2 c = cn[vid];
  vec2 pos = mix(p0, p1, c.x) + n*c.y*width*3.0 + jitter;
  vD = c.y*3.0;
  gl_Position = vec4(pos/res*2.0-1.0, 0, 1);
}`;
const FS_ELL = HEADER + `
in float vD; out vec4 o; uniform float alpha;
void main(){ float d = abs(vD); o = vec4(vec3(0.55,0.75,1.0)*alpha*(exp(-d*d*2.0) + 0.15*exp(-d)), 1.0); }`;

const CORE = HEADER + COMMON + `
in vec2 vUv; out vec4 o;
uniform vec2 res, center, jitter; uniform float size, amt;
void main(){
  vec2 p = (gl_FragCoord.xy + jitter - center)/size;
  float r = length(p);
  vec3 col = vec3(1.0,0.78,0.5)*(exp(-r*r*6.0)*3.0 + exp(-r*2.2)*0.5) + vec3(1.0,0.9,0.8)*exp(-r*r*120.0)*6.0;
  o = vec4(col*amt, 1.0);
}`;

export default function cosmos(ctx) {
  const { gl, W, H } = ctx;
  const S = SECTIONS.cosmos;
  let star, ell, core, vao, ellVao, total = 0;

  function camera(lt) {
    // 真上 → 斜め → 腕の中へ急降下 → 雄大な全景
    const tilt = lerp(Math.PI / 2 - 0.02, 0.62, easeInOut(smooth(4.0, 9.0, lt))) + 0.38 * smooth(11.0, 14.5, lt) * 0;
    const az = 0.4 + lt * 0.11 + 1.3 * easeInOut(smooth(7.5, 12.5, lt));
    let dist = lerp(2.55, 1.6, smooth(4.0, 8.0, lt));
    dist = lerp(dist, 0.55, Math.sin(Math.PI * smooth(8.0, 12.6, lt)) * 0.9);
    dist = lerp(dist, 2.6, smooth(12.6, 16.0, lt));
    dist = dist * Math.exp(Math.log(30) * easeInOut(smooth(15.6, 19.6, lt)));   // 終章へ：遠ざかって1つの光点に
    const e = [Math.cos(az) * Math.cos(tilt) * dist, Math.sin(tilt) * dist, Math.sin(az) * Math.cos(tilt) * dist];
    const target = [0, 0, 0];
    const dive = Math.sin(Math.PI * smooth(8.0, 12.6, lt));
    target[0] = Math.cos(az + 2.2) * 0.35 * dive; target[2] = Math.sin(az + 2.2) * 0.35 * dive;
    const up = Math.abs(Math.sin(tilt)) > 0.98 ? [-Math.cos(az), 0, -Math.sin(az)] : [0, 1, 0];
    const fov = 0.9;
    const VP = mul(perspective(fov, W / H, 0.01, 200), lookAt(e, target, up));
    return { VP, cam: e };
  }

  return {
    name: 'cosmos', start: S.start, end: S.end,
    grade: (lt) => ({ exposure: 1.0, bloom: 0.10, contrast: 1.12, saturation: 1.15, vignette: 0.45, grain: 0.03, aberration: 0.8, fade: smooth(0.0, 0.5, lt) }),
    init() {
      star = program(gl, FS_STAR, VS_STAR, 'stars');
      ell = program(gl, FS_ELL, VS_ELL, 'ellipses');
      core = program(gl, CORE, undefined, 'galaxy-core');
      let s = 12345;
      const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
      const N = NSTAR + NGAS + NDUST + NBG;
      const A = new Float32Array(N * 4), B = new Float32Array(N * 4);
      let i = 0;
      const push = (a, b) => { A.set(a, i * 4); B.set(b, i * 4); i++; };
      for (let k = 0; k < NSTAR; k++) {
        if (rnd() < 0.16) {     // バルジ
          const r = Math.abs(gauss()) * 0.09;
          push([r, rnd() * 10, rnd() * 10, 0], [3200 + rnd() * 1800, 0.12 + rnd() * 0.25, 1, 0.3 + rnd() * 0.6]);
        } else {
          const a = 0.06 + Math.pow(rnd(), 0.85) * 0.95;
          const hot = rnd() < 0.22;
          push([a, rnd() * Math.PI * 2, rnd() * 100, gauss()], [hot ? 11000 + rnd() * 18000 : 3400 + rnd() * 2800, (hot ? 0.5 : 0.10) + rnd() * (hot ? 0.6 : 0.25), 0, 0.3 + rnd() * 0.8]);
        }
      }
      // ガスは「塊」：星が生まれる雲（HII 領域）として、数百の結び目に分ける
      const clusters = [];
      for (let k = 0; k < 700; k++) clusters.push([0.14 + Math.pow(rnd(), 0.8) * 0.82, rnd() * Math.PI * 2]);
      for (let k = 0; k < NGAS; k++) { const cl = clusters[k % clusters.length]; push([cl[0] + gauss() * 0.008, cl[1] + gauss() * 0.035, rnd() * 100, gauss() * 0.3], [0, 0.03 + rnd() * 0.05, 2, 5 + rnd() * 10]); }
      for (let k = 0; k < NDUST; k++) { const a = 0.1 + Math.pow(rnd(), 0.9) * 0.8; push([a, rnd() * Math.PI * 2, rnd() * 100, gauss() * 0.25], [0, 0.05 + rnd() * 0.05, 3, 10 + rnd() * 20]); }
      for (let k = 0; k < NBG; k++) push([rnd(), rnd(), rnd(), 0], [3000 + rnd() * 9000, 0.25 + rnd() * 0.6, 4, 1.0]);
      total = i;
      vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      for (const [loc, data] of [[0, A], [1, B]]) {
        const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 0, 0);
      }
      ellVao = gl.createVertexArray();
      gl.bindVertexArray(ellVao);
      const ids = new Float32Array(NELL * SEG * 6);
      for (let k = 0; k < NELL * SEG; k++) for (let v = 0; v < 6; v++) ids[k * 6 + v] = k;
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, ids, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
    },
    render(lt, t, sub) {
      const { VP, cam } = camera(lt);
      const twist = easeInOut(smooth(0.6, 3.2, lt));
      const time = lt + 0.0;
      const common = { VP, cam, res: [W, H], jitter: sub.jitter, time, twist };
      gl.enable(gl.BLEND);
      // 背景の星空
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(vao);
      star.use({ ...common, alpha: 0.5 * smooth(0.0, 2.0, lt), sizeK: 1.0, kind: 4 });
      gl.drawArrays(gl.POINTS, 0, total);
      // 星（円盤＋バルジ）
      const starA = smooth(2.6, 5.0, lt);
      if (starA > 0) { star.use({ ...common, alpha: 1.25 * starA, sizeK: 1.0, kind: 0 }); gl.drawArrays(gl.POINTS, 0, total); }
      // 塵：背後の光を吸収する（乗算）
      const dustA = smooth(4.0, 6.5, lt);
      if (dustA > 0) {
        gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_COLOR);
        star.use({ ...common, alpha: dustA * 0.9, sizeK: 1.0, kind: 3 });
        gl.drawArrays(gl.POINTS, 0, total);
        gl.blendFunc(gl.ONE, gl.ONE);
      }
      // 星形成領域のガス（淡く光る）
      const gasA = smooth(4.0, 6.5, lt);
      if (gasA > 0) { star.use({ ...common, alpha: gasA * 1.0, sizeK: 1.0, kind: 2 }); gl.drawArrays(gl.POINTS, 0, total); }
      gl.bindVertexArray(null);
      // 中心核の輝き
      const c = VP; const w = c[15];
      const cx = (c[12] / w * 0.5 + 0.5) * W, cy = (c[13] / w * 0.5 + 0.5) * H;
      const dist = Math.hypot(...cam);
      core.use({ res: [W, H], center: [cx, cy], jitter: sub.jitter, size: 190 / dist, amt: smooth(2.8, 5.0, lt) * 0.45 });
      gl.fullscreen();
      // 説明用の楕円
      const ea = smooth(0.1, 0.6, lt) * (1 - smooth(3.6, 5.2, lt));
      if (ea > 0) {
        gl.bindVertexArray(ellVao);
        ell.use({ ...common, nEll: NELL, seg: SEG, grow: smooth(0.05, 0.9, lt), width: 1.1, alpha: ea * 1.4 });
        gl.drawArrays(gl.TRIANGLES, 0, NELL * SEG * 6);
        gl.bindVertexArray(null);
      }
      gl.disable(gl.BLEND);
    },
    text(T, lt) {
      T.chapter({ num: '06', kanji: '宇宙', en: 'COSMOS', formula: 'θ(r) = k · r', desc: '楕円の軌道を、半径に比例して少しずつ傾ける。それだけで、渦巻銀河が生まれる。' }, lt - 0.2, 5.6);
      T.label('06', '宇宙', 'COSMOS', lt - 0.2, 15.4);
      const a = smooth(5.5, 6.3, lt) * (1 - smooth(14.6, 15.4, lt));
      if (a > 0) {
        T.text('星の数', W - 128, H - 158, { font: FONT.gothic, size: 20, weight: 600, align: 'right', alpha: a * 0.7, spacing: 8, color: ACCENT });
        T.text(NSTAR.toLocaleString('en-US'), W - 128, H - 96, { font: FONT.mono, size: 44, align: 'right', alpha: a, shadow: 14 });
      }
    },
  };
}
