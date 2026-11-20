// ─────────────────────────────────────────────────────────────
//  第3章「生命」 — 反応拡散（Gray–Scott モデル）
//  2種類の物質 u, v が「反応して、広がる」だけ。チューリングが予言した仕組みで
//  サンゴのような迷路や、細胞のように分裂する斑点が、ひとりでに育つ。
//  種は前の章のミニブロの形。黒い穴だった場所が、生命の苗床になる。
// ─────────────────────────────────────────────────────────────
import { program, pingpong } from '../core/gl.js';
import { HEADER, COMMON } from '../core/glsl.js';
import { MANDEL_VIEW } from '../core/curve.js';
import { FONT, ACCENT } from '../core/text.js';
import { SECTIONS, FPS, clamp, smooth, lerp } from '../timeline.js';

const SW = 960, SH = 540;          // シミュレーションの格子（画面の半分の解像度）
const STEPS = 12;                  // 1フレームあたりの計算ステップ

const SEED = HEADER + COMMON + `
in vec2 vUv; out vec4 o;
uniform vec2 res; uniform vec3 view;
void main(){
  // 前章の最終画面と同じ画角で、マンデルブロ集合の内側を種にする
  vec2 px = (gl_FragCoord.xy/res)*vec2(1920.,1080.) - vec2(960.,540.);
  vec2 c = view.xy + px*(2.0*view.z/1080.);
  vec2 z = vec2(0); int n;
  for(n=0;n<60;n++){ z = vec2(z.x*z.x-z.y*z.y, 2.*z.x*z.y) + c; if(dot(z,z)>4.) break; }
  float inside = (n==60 && c.x > -1.32) ? 1.0 : 0.0;   // アンテナ上の小さな粒は除く
  float r = hash21(gl_FragCoord.xy);
  o = inside > 0.5 ? vec4(0.5, 0.25 + 0.06*r, 0., 1.) : vec4(1.0, 0.0, 0., 1.);
}`;

const STEP = HEADER + COMMON + `
in vec2 vUv; out vec4 o;
uniform sampler2D s; uniform vec2 res; uniform float now;
uniform vec2 fk;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  ivec2 R = ivec2(res) - 1;
  #define S(dx,dy) texelFetch(s, clamp(p+ivec2(dx,dy), ivec2(0), R), 0)
  vec4 c = S(0,0);
  // 3×3 のラプラシアン（中央 -1, 上下左右 0.2, 斜め 0.05）
  vec2 lap = -c.xy + 0.2*(S(1,0).xy+S(-1,0).xy+S(0,1).xy+S(0,-1).xy) + 0.05*(S(1,1).xy+S(-1,1).xy+S(1,-1).xy+S(-1,-1).xy);
  float u = c.x, v = c.y;
  float uvv = u*v*v;
  float du = 1.0*lap.x - uvv + fk.x*(1.0-u);
  float dv = 0.5*lap.y + uvv - (fk.x+fk.y)*v;
  float born = c.z;                                   // その場所に生命が生まれた時刻
  if (born <= 0.0 && v > 0.22) born = now;
  o = vec4(clamp(u+du, 0., 1.), clamp(v+dv, 0., 1.), born, 1.);
}`;

const SHOW = HEADER + COMMON + `
in vec2 vUv; out vec4 o;
uniform sampler2D s; uniform vec2 res, simRes, jitter; uniform float zoom, lt, pulse;
vec4 T(vec2 uv){ return texture(s, uv); }
void main(){
  vec2 frag = gl_FragCoord.xy + jitter;
  vec2 uv = ((frag - res*0.5)/zoom + res*0.5)/res;
  vec2 e = 1.0/simRes;
  vec4 c = T(uv);
  float v = c.y;
  float vx = T(uv+vec2(e.x,0)).y - T(uv-vec2(e.x,0)).y;
  float vy = T(uv+vec2(0,e.y)).y - T(uv-vec2(0,e.y)).y;
  vec3 n = normalize(vec3(-vx*7.0, -vy*7.0, 1.0));
  vec3 L = normalize(vec3(-0.45, 0.6, 0.8));
  float diff = max(dot(n,L), 0.0);
  float spec = pow(max(dot(reflect(-L,n), vec3(0,0,1)), 0.0), 60.0);
  float h = smoothstep(0.06, 0.34, v);
  // 生まれた順に色が変わる：古い細胞は深い藍、新しい細胞は明るい翠と金
  float age = c.z > 0.0 ? lt - c.z : 0.0;
  vec3 young = vec3(1.0, 0.78, 0.35);
  vec3 mid   = vec3(0.12, 0.95, 0.80);
  vec3 old   = vec3(0.10, 0.30, 0.95);
  vec3 body = mix(young, mid, smoothstep(0.0, 1.6, age));
  body = mix(body, old, smoothstep(2.5, 9.0, age));
  vec3 deep = vec3(0.003, 0.008, 0.022);
  // 背景：深い水中のような、かすかな揺らぎ
  vec2 q = frag/res;
  deep += vec3(0.0,0.02,0.035)*(0.6 + 0.4*noise(q*vec2(6.0,3.4) + lt*0.08));
  vec3 col = mix(deep, body*(0.30 + 0.85*diff), h);
  float edge = smoothstep(0.04, 0.16, v)*(1.0 - smoothstep(0.16, 0.3, v));
  col += body*edge*0.9;
  col += vec3(1.0,0.97,0.92)*spec*h*0.8;
  float glow = 0.0;
  for(int i=0;i<8;i++){ float a = float(i)*0.785398 + 0.3; glow += T(uv + vec2(cos(a),sin(a))*e*5.0).y; }
  col += body*glow/8.0*0.55;
  col *= 1.0 + pulse*0.35;
  o = vec4(col, 1);
}`;

export default function life(ctx) {
  const { gl, W, H } = ctx;
  const S = SECTIONS.life;
  let seed, step, show, sim, steps = -1;
  const CORAL = [0.0545, 0.062], MITOSIS = [0.0367, 0.0649];
  // 最初の2秒はサンゴ状に縁が芽吹き、そのあと細胞分裂の領域へ
  const params = (st) => { const m = smooth(1.2, 3.0, st); return [lerp(CORAL[0], MITOSIS[0], m), lerp(CORAL[1], MITOSIS[1], m)]; };

  function reseed() {
    sim.write.bind();
    seed.use({ res: [SW, SH], view: [MANDEL_VIEW.cx, MANDEL_VIEW.cy, MANDEL_VIEW.half] });
    gl.fullscreen();
    sim.swap();
    steps = 0;
  }
  function advance(target, lt) {
    gl.disable(gl.BLEND);
    while (steps < target) {
      sim.write.bind();
      const st = (steps / STEPS) / FPS;
      step.use({ s: sim.read.tex, res: [SW, SH], now: st + 0.001, fk: params(st) });
      gl.fullscreen();
      sim.swap();
      steps++;
    }
  }

  return {
    name: 'life', start: S.start, end: S.end, fadeIn: 1.2,
    grade: { exposure: 1.0, bloom: 0.08, contrast: 1.12, saturation: 1.1, vignette: 0.5, grain: 0.035, aberration: 0.8 },
    init() {
      seed = program(gl, SEED, undefined, 'rd-seed');
      step = program(gl, STEP, undefined, 'rd-step');
      show = program(gl, SHOW, undefined, 'rd-show');
      sim = pingpong(gl, SW, SH, { internal: gl.RGBA32F, filter: gl.LINEAR });
    },
    update(lt) {
      const target = Math.max(0, Math.round(lt * FPS)) * STEPS;
      if (steps < 0 || target < steps) reseed();
      advance(target, lt);
    },
    render(lt, t, sub) {
      const zoom = lerp(1.0, 1.32, smooth(0, 16, lt));
      const beat = (lt % 0.5) / 0.5;
      show.use({ s: sim.read.tex, res: [W, H], simRes: [SW, SH], jitter: sub.jitter, zoom, lt, pulse: 0 });
      sub.target.bind();
      gl.fullscreen();
    },
    text(T, lt) {
      T.chapter({ num: '03', kanji: '生命', en: 'LIFE', formula: '∂v/∂t = Dᵥ∇²v + uv² − (F+k)v', desc: '反応して、広がる。それだけのルールから、生き物のような模様が育つ。' }, lt - 0.6, 5.4);
      T.label('03', '生命', 'LIFE', lt - 0.6, 15.6);
      const a = smooth(2.6, 3.4, lt) * (1 - smooth(15.2, 15.8, lt));
      if (a > 0) {
        const [F, k] = params(lt);
        T.text('反応拡散シミュレーション', W - 128, H - 158, { font: FONT.gothic, size: 20, weight: 600, align: 'right', alpha: a * 0.7, spacing: 6, color: ACCENT });
        T.text(`F ${F.toFixed(4)}   k ${k.toFixed(4)}   step ${Math.max(0, steps).toLocaleString('en-US')}`, W - 128, H - 104, { font: FONT.mono, size: 26, align: 'right', alpha: a * 0.95, shadow: 12 });
      }
    },
  };
}
