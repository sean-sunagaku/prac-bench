// ─────────────────────────────────────────────────────────────
//  第4章「大地」 — 山も、霧も、夕日も、その場で計算する
//  地形は「フラクタルノイズ」の足し算。細かい起伏ほど小さく重ね、
//  傾きが急な所では細部を抑えると、浸食されたような尾根が生まれる。
//  1ピクセルごとに視線を飛ばして地面との交点を探す（レイマーチング）。
// ─────────────────────────────────────────────────────────────
import { program } from '../core/gl.js';
import { HEADER, COMMON } from '../core/glsl.js';
import { FONT, ACCENT } from '../core/text.js';
import { SECTIONS, clamp, smooth } from '../timeline.js';

const FS = HEADER + COMMON + `
in vec2 vUv; out vec4 o;
uniform vec2 res, jitter; uniform float lt;

const mat2 m2 = mat2(0.8,-0.6,0.6,0.8);
const vec3 SUN = normalize(vec3(-0.42, 0.10, 1.0));
const float WATER = -95.0;

// 高さ（m）。傾き（微分）が大きい所ほど細部の寄与を減らす＝浸食の近似
float terrain(vec2 x, int oct){
  vec2 p = x*0.0011;
  float a = 0.0, b = 1.0;
  vec2 d = vec2(0.0);
  for (int i=0; i<16; i++){
    if (i >= oct) break;
    vec3 n = noised(p);
    d += n.yz;
    a += b*n.x/(1.0 + dot(d,d));
    b *= 0.5;
    p = m2*p*2.0;
  }
  return 470.0*a + 60.0;
}

// カメラの通り道（谷をたどる曲線）
vec3 path(float s){ return vec3(520.0*sin(s*0.0012) + 260.0*sin(s*0.0029 + 1.3), 0.0, s); }
float clearance(float t){ return mix(55.0, 520.0, smoothstep(7.0, 12.5, t)); }
vec3 camAt(float t){
  float s = t*165.0 + 1800.0;
  vec3 p = path(s);
  float h = -1e9;
  for (int i=0;i<6;i++){ float k = float(i)*55.0; h = max(h, terrain(path(s+k).xz, 7)); }
  p.y = max(h, WATER) + clearance(t);
  return p;
}

vec3 sky(vec3 rd){
  float sd = max(dot(rd, SUN), 0.0);
  float y = max(rd.y, 0.0);
  vec3 col = mix(vec3(1.05,0.72,0.48), vec3(0.20,0.36,0.70), pow(y, 0.42));
  col = mix(col, vec3(0.08,0.14,0.32), smoothstep(0.35, 1.0, y));
  col += vec3(1.0,0.55,0.25)*0.55*pow(sd, 5.0);
  col += vec3(1.0,0.72,0.42)*1.1*pow(sd, 42.0);
  col += vec3(1.0,0.92,0.75)*60.0*smoothstep(0.99955, 0.9998, sd);
  // 高い空のすじ雲：夕日に下から照らされる
  if (rd.y > 0.0){
    vec2 cp = rd.xz/(rd.y + 0.06)*1.1 + vec2(lt*0.02, 0.0);
    float c = 0.0, a = 0.5; vec2 q = cp*1.2;
    for (int i=0;i<5;i++){ c += a*noise(q); q = m2*q*2.1; a *= 0.5; }
    c = smoothstep(0.05, 0.75, c*0.9 + 0.12) * smoothstep(0.0, 0.18, rd.y);
    vec3 cc = mix(vec3(1.0,0.62,0.42), vec3(1.4,0.9,0.6), pow(sd,3.0)) * (0.55 + 0.9*pow(sd, 2.0));
    col = mix(col, cc, c*0.85);
  }
  return col;
}

float raymarch(vec3 ro, vec3 rd, float tmin, float tmax){
  float t = tmin;
  for (int i=0; i<360; i++){
    vec3 p = ro + t*rd;
    float h = p.y - terrain(p.xz, 9);
    if (abs(h) < 0.0012*t || t > tmax) break;
    t += 0.45*h;
  }
  return t;
}
vec3 normalAt(vec3 p, float t){
  vec2 e = vec2(0.0015*t, 0.0);
  return normalize(vec3(terrain(p.xz-e.xy,16) - terrain(p.xz+e.xy,16), 2.0*e.x, terrain(p.xz-e.yx,16) - terrain(p.xz+e.yx,16)));
}
float shadow(vec3 ro, vec3 rd){
  float r = 1.0, t = 2.0;
  for (int i=0; i<80; i++){
    vec3 p = ro + t*rd;
    float h = p.y - terrain(p.xz, 8);
    r = min(r, 14.0*h/t);
    t += clamp(h, 3.0 + t*0.015, 160.0);
    if (r < 0.001 || p.y > 1400.0) break;
  }
  return smoothstep(0.0, 1.0, r);
}

vec3 shade(vec3 ro, vec3 rd, float t){
  vec3 p = ro + t*rd;
  vec3 n = normalAt(p, t);
  float h = p.y;
  // 材質：岩・草・雪
  float r = noise(p.xz*0.02);
  vec3 rock = mix(vec3(0.09,0.075,0.065), vec3(0.16,0.12,0.09), 0.5+0.5*r);
  vec3 grass = mix(vec3(0.045,0.07,0.02), vec3(0.11,0.10,0.03), 0.5+0.5*noise(p.xz*0.007));
  float g = smoothstep(0.62, 0.85, n.y)*smoothstep(330.0, 120.0, h + r*60.0);
  vec3 col = mix(rock, grass, g);
  float snow = smoothstep(260.0, 340.0, h + 70.0*noise(p.xz*0.01))*smoothstep(0.45, 0.8, n.y + 0.2*r);
  col = mix(col, vec3(0.62,0.66,0.72), snow);
  // 光：太陽（影つき）＋空の光＋照り返し
  float dif = max(dot(n, SUN), 0.0);
  float sh = dif > 0.001 ? shadow(p + n*1.5, SUN) : 0.0;
  float amb = clamp(0.5 + 0.5*n.y, 0.0, 1.0);
  float bac = clamp(0.2 + 0.8*dot(normalize(vec3(-SUN.x,0.0,-SUN.z)), n), 0.0, 1.0);
  vec3 lin = dif*sh*vec3(9.0,5.4,2.9)
           + amb*vec3(0.20,0.32,0.62)*1.0
           + bac*vec3(0.30,0.22,0.16)*0.4;
  col *= lin;
  // 雪の鏡面
  vec3 hal = normalize(SUN - rd);
  col += snow*sh*vec3(1.0,0.8,0.6)*pow(max(dot(n,hal),0.0), 24.0)*0.6;
  return col;
}

vec3 fog(vec3 col, vec3 ro, vec3 rd, float t){
  float sd = max(dot(rd, SUN), 0.0);
  vec3 fc = mix(vec3(0.30,0.42,0.68), vec3(1.15,0.70,0.40), pow(sd, 4.0));
  fc += vec3(1.0,0.55,0.25)*0.6*pow(sd, 16.0);
  // 距離の霞（空気遠近法）＋谷に溜まる霧（高さで指数的に濃くなる）
  float d = 1.0 - exp(-t*0.000052);
  float b = 0.006;
  float hf = 0.9*exp(-(ro.y + 40.0)*b)*(1.0 - exp(-t*rd.y*b))/max(abs(rd.y), 2e-3)*0.0016;
  hf = clamp(hf, 0.0, 0.85);
  float f = clamp(d + hf*(1.0-d), 0.0, 1.0);
  return mix(col, fc, f);
}

void main(){
  vec2 frag = gl_FragCoord.xy + jitter;
  vec2 q = (2.0*frag - res)/res.y;
  float T = lt;
  vec3 ro = camAt(T);
  vec3 ahead = camAt(T + 0.5);
  vec3 dir = normalize(vec3(ahead.x - ro.x, 0.0, ahead.z - ro.z));
  // 前半はやや右を向き、夕日を斜めから受ける山肌を見せる
  float yaw = 0.42*(1.0 - smoothstep(4.0, 10.0, T));
  dir = normalize(vec3(dir.x*cos(yaw) + dir.z*sin(yaw), 0.0, -dir.x*sin(yaw) + dir.z*cos(yaw)));
  // 前半は谷を見下ろし、上昇とともに地平線へ
  float pitch = mix(-0.13, -0.035, smoothstep(5.5, 11.5, T));
  vec3 fwd0 = normalize(dir + vec3(0.0, pitch, 0.0));
  vec3 toSun = normalize(vec3(SUN.x, 0.05, SUN.z));
  vec3 fwd = normalize(mix(fwd0, toSun, smoothstep(11.0, 15.5, T)*0.9));
  float roll = 0.16*sin(T*0.55 + 0.6) * (1.0 - smoothstep(9.0, 13.0, T));
  vec3 up0 = vec3(sin(roll), cos(roll), 0.0);
  vec3 rgt = normalize(cross(fwd, up0));
  vec3 up = cross(rgt, fwd);
  vec3 rd = normalize(q.x*rgt + q.y*up + 1.75*fwd);

  vec3 col;
  float tmax = 9000.0;
  // 水面との交点
  float tw = rd.y < 0.0 ? (WATER - ro.y)/rd.y : 1e9;
  float t = raymarch(ro, rd, 1.0, min(tmax, tw));
  bool hitT = t < min(tmax, tw);
  if (hitT){
    col = shade(ro, rd, t);
    col = fog(col, ro, rd, t);
  } else if (tw < tmax){
    // 湖：空と夕日を映す
    vec3 p = ro + tw*rd;
    vec2 w = vec2(noise(p.xz*0.05 + lt*0.6), noise(p.xz*0.05 - lt*0.5 + 7.1));
    float wf = 0.05*exp(-tw*0.0012);
    vec3 n = normalize(vec3(w.x*wf, 1.0, w.y*wf));
    vec3 rr = reflect(rd, n);
    float fr = 0.02 + 0.98*pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
    vec3 refl = sky(rr);
    float tr = raymarch(p + n*0.5, rr, 2.0, 2500.0);
    if (tr < 2500.0) refl = fog(shade(p, rr, tr), p, rr, tr);
    col = mix(vec3(0.004,0.012,0.016), refl, fr);
    col = fog(col, ro, rd, tw);
  } else {
    col = sky(rd);
  }
  // 太陽のレンズの光
  float sd = max(dot(rd, SUN), 0.0);
  col += vec3(1.0,0.6,0.32)*0.18*pow(sd, 3.0);
  o = vec4(col, 1);
}`;

export default function earth(ctx) {
  const { gl, W, H } = ctx;
  const S = SECTIONS.earth;
  let prog;
  return {
    name: 'earth', start: S.start, end: S.end,
    grade: (lt) => ({
      exposure: 0.85, bloom: 0.07, contrast: 1.22, saturation: 1.12, vignette: 0.42, grain: 0.03, aberration: 0.8,
      // サビ頭の閃光と、最後に太陽へ飛び込む白
      flash: 3.0 * Math.exp(-lt * 7.0) + 12.0 * smooth(14.8, 16.0, lt),
    }),
    init() { prog = program(gl, FS, undefined, 'terrain'); },
    render(lt, t, sub) {
      prog.use({ res: [W, H], jitter: sub.jitter, lt });
      gl.enable(gl.SCISSOR_TEST);
      for (let b = 0; b < 4; b++) { gl.scissor(0, (H * b) / 4, W, H / 4); gl.fullscreen(); gl.flush(); }
      gl.disable(gl.SCISSOR_TEST);
    },
    text(T, lt) {
      T.chapter({ num: '04', kanji: '大地', en: 'EARTH', formula: 'h(p) = Σ 2⁻ⁱ · noise(2ⁱ p)', desc: '山も、霧も、夕日も。進むたびに、地形をその場で計算している。' }, lt - 0.7, 5.6);
      T.label('04', '大地', 'EARTH', lt - 0.7, 14.4);
    },
  };
}
