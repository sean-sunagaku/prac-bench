// ─────────────────────────────────────────────────────────────
//  第5章「光」 — 反射と屈折（スネルの法則）
//  ガラスの中に入った光は、色（波長）ごとにわずかに違う角度で曲がる。
//  赤・緑・青で別々に屈折を追うと、輪郭に虹がにじむ（分散）。
//  床の映り込み、クロームの球、ガラスの奥で脈打つ光の核——すべて光線追跡。
// ─────────────────────────────────────────────────────────────
import { program } from '../core/gl.js';
import { HEADER, COMMON } from '../core/glsl.js';
import { SECTIONS, BEAT, BAR, clamp, smooth } from '../timeline.js';

const FS = HEADER + COMMON + `
in vec2 vUv; out vec4 o;
uniform vec2 res, jitter; uniform float lt, morphA, morphB, pulse, spin;

#define FLOOR -1.55
float sdRoundBox(vec3 p, vec3 b, float r){ vec3 q = abs(p) - b + r; return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0) - r; }
float sdTorus(vec3 p, vec2 t){ vec2 q = vec2(length(p.xz)-t.x, p.y); return length(q)-t.y; }
float sdOcta(vec3 p, float s){ p = abs(p); return (p.x+p.y+p.z-s)*0.57735027; }
float smin(float a, float b, float k){ float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0); return mix(b, a, h) - k*h*(1.0-h); }

// ガラスの彫刻：立方体 → ねじれた輪 → 波打つ球 → 八面体 を小節ごとに変形
float glass(vec3 p){
  p.xz *= rot(spin); p.xy *= rot(spin*0.6);
  float a = sdRoundBox(p, vec3(0.82), 0.22);
  vec3 q = p; q.xz *= rot(q.y*1.2);
  float b = sdTorus(q.xzy, vec2(0.86, 0.36));
  float g = dot(sin(p*5.2), cos(p.yzx*5.2));
  float c = length(p) - 1.0 + 0.05*g;
  float d = sdOcta(p, 1.35) - 0.08;
  float sh[4] = float[4](a, b, c, d);
  int i0 = int(morphA) & 3, i1 = (int(morphA)+1) & 3;
  return mix(sh[i0], sh[i1], morphB);
}
float core(vec3 p){ return length(p) - 0.19 - 0.035*pulse; }
vec3 orbPos(int i){
  float fi = float(i);
  float a = lt*0.55 + fi*TAU/4.0;
  return vec3(cos(a)*2.25, 0.25*sin(lt*1.1 + fi*1.7) - 0.15, sin(a)*2.25);
}
float orbs(vec3 p){ float d = 1e9; for(int i=0;i<4;i++) d = min(d, length(p - orbPos(i)) - 0.36); return d; }

// 0: 床, 1: ガラス, 2: クローム
vec2 scene(vec3 p){
  vec2 r = vec2(p.y - FLOOR, 0.0);
  float g = glass(p); if (g < r.x) r = vec2(g, 1.0);
  float c = orbs(p);  if (c < r.x) r = vec2(c, 2.0);
  return r;
}
vec2 march(vec3 ro, vec3 rd, float tmax){
  float t = 0.0;
  for (int i=0;i<160;i++){
    vec2 h = scene(ro + rd*t);
    if (h.x < 0.0004*t + 0.0002) return vec2(t, h.y);
    t += h.x*0.9;
    if (t > tmax) break;
  }
  return vec2(-1.0, -1.0);
}
vec3 nrm(vec3 p){
  vec2 e = vec2(0.0007, -0.0007);
  return normalize(e.xyy*scene(p+e.xyy).x + e.yyx*scene(p+e.yyx).x + e.yxy*scene(p+e.yxy).x + e.xxx*scene(p+e.xxx).x);
}
vec3 nrmGlass(vec3 p){
  vec2 e = vec2(0.0007, -0.0007);
  return normalize(e.xyy*glass(p+e.xyy) + e.yyx*glass(p+e.yyx) + e.yxy*glass(p+e.yxy) + e.xxx*glass(p+e.xxx));
}

// 撮影スタジオの光：長い面光源が3本
float rectLight(vec3 ro, vec3 rd, vec3 c, vec3 n, vec3 u, vec2 size){
  float dn = dot(rd, n);
  if (dn > -1e-4) return 0.0;
  float t = dot(c - ro, n)/dn;
  if (t < 0.0) return 0.0;
  vec3 p = ro + rd*t - c;
  vec3 v = cross(n, u);
  vec2 q = vec2(dot(p,u), dot(p,v))/size;
  vec2 e = smoothstep(1.0, 0.86, abs(q));
  return e.x*e.y;
}
vec3 env(vec3 ro, vec3 rd){
  vec3 col = mix(vec3(0.0), vec3(0.010,0.014,0.03), smoothstep(-0.2, 0.8, rd.y));
  // ホリゾントの帯光：ガラスとクロームに長いハイライトを描かせる
  col += vec3(0.30,0.36,0.50)*exp(-rd.y*rd.y*60.0)*0.55*smoothstep(-0.3, 0.05, rd.y);
  col += vec3(1.0,0.66,0.42)*exp(-(rd.y-0.22)*(rd.y-0.22)*1400.0)*0.5*(0.5+0.5*sin(atan(rd.z,rd.x)*3.0));
  col += vec3(1.0,0.97,0.92)*7.0*rectLight(ro, rd, vec3(0.0,6.0,0.0), vec3(0,-1,0), vec3(1,0,0), vec2(4.2,0.55));
  col += vec3(1.0,0.55,0.28)*6.0*rectLight(ro, rd, vec3(-6.5,1.6,1.5), normalize(vec3(1,0,-0.2)), vec3(0,1,0), vec2(2.6,0.35));
  col += vec3(0.35,0.62,1.0)*6.0*rectLight(ro, rd, vec3(5.5,2.2,-4.0), normalize(vec3(-0.8,0,0.6)), vec3(0,1,0), vec2(3.0,0.35));
  // 遠くの光の粒（ボケ）
  vec2 sp = vec2(atan(rd.z, rd.x), rd.y)*vec2(10.0, 14.0);
  vec2 id = floor(sp); vec2 f = fract(sp) - 0.5;
  float h = hash21(id);
  col += vec3(1.0,0.75,0.5)*step(0.93, h)*smoothstep(0.12, 0.0, length(f))*0.6*smoothstep(-0.1,0.3,rd.y);
  return col;
}

float softShadow(vec3 ro, vec3 rd){
  float r = 1.0, t = 0.02;
  for (int i=0;i<40;i++){
    float h = min(glass(ro + rd*t)*1.6 + 0.04, orbs(ro + rd*t));
    r = min(r, 5.0*h/t);
    t += clamp(h, 0.02, 0.4);
    if (r < 0.002 || t > 8.0) break;
  }
  return clamp(r, 0.0, 1.0);
}

// 二次反射：床・球・空間（ガラスは近似）
vec3 secondary(vec3 ro, vec3 rd){
  vec2 h = march(ro, rd, 30.0);
  if (h.x < 0.0) return env(ro, rd);
  vec3 p = ro + rd*h.x;
  if (h.y < 0.5){
    float sh = softShadow(p + vec3(0,0.01,0), normalize(vec3(0.0,6.0,0.0) - p));
    return vec3(0.012)*sh*2.0 + env(p, reflect(rd, vec3(0,1,0)))*0.06;
  }
  vec3 n = nrm(p);
  if (h.y < 1.5){   // ガラス（二次反射では簡略化：反射＋素通しの屈折）
    float fr = 0.04 + 0.96*pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
    vec3 tr = vec3(0.012,0.016,0.022) + vec3(1.0,0.5,0.2)*0.03*(0.5+pulse);
    return mix(tr, env(p, reflect(rd, n)), 0.15 + 0.85*fr);
  }
  return env(p, reflect(rd, n))*vec3(0.95,0.92,0.88);
}

// ガラスの中を通る光：屈折して入り、内側を進み、屈折して出る（色ごとに屈折率が違う）
vec3 throughGlass(vec3 p, vec3 rd, vec3 n, float ior){
  vec3 rdIn = refract(rd, n, 1.0/ior);
  vec3 q = p - n*0.003;
  float t = 0.0;
  vec3 glow = vec3(0.0);
  for (int i=0;i<64;i++){
    vec3 x = q + rdIn*t;
    float d = -glass(x);
    float c = core(x);
    glow += vec3(1.0,0.48,0.18)*exp(-c*c*60.0)*0.035*(0.5 + 1.5*pulse);
    if (c < 0.001) return vec3(1.0,0.55,0.25)*(5.0 + 7.0*pulse);
    if (d < 0.0006) break;
    t += max(min(d, c)*0.9, 0.004);
  }
  vec3 x = q + rdIn*t;
  vec3 n2 = -nrmGlass(x);
  vec3 rdOut = refract(rdIn, n2, ior);
  vec3 absorb = exp(-t*vec3(0.32,0.12,0.05));
  if (dot(rdOut, rdOut) < 0.01) {   // 全反射
    rdOut = reflect(rdIn, n2);
    return env(x, rdOut)*absorb*0.8 + glow;
  }
  return secondary(x + rdOut*0.004, rdOut)*absorb + glow;
}

void main(){
  vec2 frag = gl_FragCoord.xy + jitter;
  vec2 q = (2.0*frag - res)/res.y;
  float ang = 0.55 + lt*0.18;
  float dist = mix(6.2, 4.7, smoothstep(0.0, 16.0, lt));
  vec3 ro = vec3(cos(ang)*dist, 0.25 + 0.3*sin(lt*0.3), sin(ang)*dist);
  vec3 ta = vec3(0.0, -0.05, 0.0);
  vec3 fw = normalize(ta - ro), rt = normalize(cross(fw, vec3(0,1,0))), up = cross(rt, fw);
  vec3 rd = normalize(q.x*rt + q.y*up + 2.1*fw);

  vec3 col;
  vec2 h = march(ro, rd, 40.0);
  if (h.x < 0.0){
    col = env(ro, rd);
  } else {
    vec3 p = ro + rd*h.x;
    if (h.y < 0.5){
      // 床：黒く磨かれた石。映り込みと柔らかい影
      vec3 n = vec3(0,1,0);
      n.xz += 0.012*vec2(noise(p.xz*3.0), noise(p.xz*3.0 + 9.1));
      n = normalize(n);
      float fr = 0.04 + 0.96*pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
      vec3 rr = reflect(rd, n);
      vec3 refl = secondary(p + n*0.002, rr);
      float sh = softShadow(p + n*0.01, normalize(vec3(0.0,6.0,0.0) - p));
      float spot = exp(-dot(p.xz, p.xz)*0.04);
      vec3 base = vec3(0.006,0.0058,0.0055)*spot*(0.35 + 0.65*sh)*3.0;
      // 光の核が床をほのかに照らす
      base += vec3(1.0,0.45,0.15)*0.012*(0.5 + 1.5*pulse)/(1.0 + dot(p,p)*0.8);
      col = base + refl*mix(0.35, 1.0, fr);
    } else if (h.y < 1.5){
      vec3 n = nrmGlass(p);
      float fr = 0.04 + 0.96*pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
      vec3 refl = env(p, reflect(rd, n));
      vec3 tr;
      tr.r = throughGlass(p, rd, n, 1.47).r;
      tr.g = throughGlass(p, rd, n, 1.505).g;
      tr.b = throughGlass(p, rd, n, 1.545).b;
      col = mix(tr, refl, fr) + refl*0.08;
    } else {
      vec3 n = nrm(p);
      vec3 rr = reflect(rd, n);
      col = secondary(p + n*0.002, rr)*vec3(0.96,0.93,0.9);
    }
    // 遠景は闇に沈める
    col *= exp(-max(h.x - 9.0, 0.0)*0.15);
  }
  o = vec4(col, 1);
}`;

export default function light(ctx) {
  const { gl, W, H } = ctx;
  const S = SECTIONS.light;
  let prog;
  return {
    name: 'light', start: S.start, end: S.end,
    grade: (lt) => ({
      exposure: 1.0, bloom: 0.085, contrast: 1.16, saturation: 1.12, vignette: 0.5, grain: 0.03, aberration: 1.0,
      flash: 12.0 * Math.exp(-lt * 3.6),
    }),
    init() { prog = program(gl, FS, undefined, 'light'); },
    render(lt, t, sub) {
      const bar = lt / BAR;
      const k = Math.floor(bar);
      const f = bar - k;
      const morphB = smooth(0.0, 0.42, f);  // 小節頭で次の形へ
      const beat = (lt % BEAT) / BEAT;
      const pulse = Math.exp(-beat * 5.0);
      prog.use({ res: [W, H], jitter: sub.jitter, lt, morphA: k % 4, morphB, pulse, spin: lt * 0.35 + 0.6 * smooth(0, 0.4, f) + k * 0.6 });
      gl.enable(gl.SCISSOR_TEST);
      for (let b = 0; b < 4; b++) { gl.scissor(0, (H * b) / 4, W, H / 4); gl.fullscreen(); gl.flush(); }
      gl.disable(gl.SCISSOR_TEST);
    },
    text(T, lt) {
      T.chapter({ num: '05', kanji: '光', en: 'LIGHT', formula: 'n₁ sin θ₁ = n₂ sin θ₂', desc: '1ピクセルごとに、光が跳ね返り、曲がる道すじを追いかける。' }, lt - 0.9, 5.6);
      T.label('05', '光', 'LIGHT', lt - 0.9, 15.6);
    },
  };
}
