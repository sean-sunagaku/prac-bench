// ─────────────────────────────────────────────────────────────
//  curve.js — 発光する曲線（オシロスコープの燐光）
//  曲線を細かな線分に分け、各線分を太さつきの四角形として GPU で描く
// ─────────────────────────────────────────────────────────────
import { program } from './gl.js';
import { HEADER, COMMON } from './glsl.js';

export const MANDEL_VIEW = { cx: -0.765, cy: 0.0, half: 1.25 }; // 第2章の最初の画角

const VS = HEADER + COMMON + `
layout(location=0) in float aI;      // 線分の番号
uniform float N, mode, phase, amp, morph, cardioid, width, head, trail, base, peak, grow, tcur, speedRef;
uniform vec2 res, center, ra, rb, jitter;
uniform vec3 view;                   // マンデルブロ集合の画角 (cx, cy, half)
out float vD; out float vI; out float vW;

vec2 liss(vec2 r, float s){ return vec2(sin(TAU*r.x*s), sin(TAU*r.y*s + phase)); }

// 主カージオイドと周期2の円板を、1本のつながった閉曲線としてたどる
vec2 cardioidPath(float s){
  vec2 c;
  if (s < 0.375){            // 上半分：カスプ(0.25,0) → 接点(-0.75,0)
    float th = s/0.375*PI;
    c = vec2(0.5*cos(th) - 0.25*cos(2.*th), 0.5*sin(th) - 0.25*sin(2.*th));
  } else if (s < 0.625){     // 周期2の円板を一周
    float th = (s-0.375)/0.25*TAU;
    c = vec2(-1.0 + 0.25*cos(th), 0.25*sin(th));
  } else {                   // 下半分：接点 → カスプ
    float th = PI + (s-0.625)/0.375*PI;
    c = vec2(0.5*cos(th) - 0.25*cos(2.*th), 0.5*sin(th) - 0.25*sin(2.*th));
  }
  float k = res.y/(2.0*view.z);
  return (c - view.xy)*k;    // 画面中心からのピクセル
}

vec2 P(float s){
  if (mode < 0.5){
    vec2 p = mix(liss(ra, s), liss(rb, s), morph)*amp;
    if (cardioid > 0.0) p = mix(p, cardioidPath(s), cardioid);
    return center + p;
  }
  // 波形表示（L / R チャンネル）
  float x = s*2.0-1.0;
  float y = sin(TAU*(mode < 1.5 ? ra.x : ra.y)*(x*1.5) - tcur*TAU*0.6 + (mode<1.5?0.:phase));
  return center + vec2(x*amp, y*amp*0.11);
}

void main(){
  int vid = gl_VertexID % 6;
  float s0 = aI/N, s1 = (aI+1.0)/N;
  float sg = grow;                          // 描き始め：曲線が伸びていく
  if (s0 > sg) { gl_Position = vec4(2,2,2,1); return; }
  vec2 p0 = P(s0), p1 = P(min(s1, max(sg, s0+1e-4)));
  vec2 d = p1 - p0; float L = length(d);
  vec2 t = L > 1e-5 ? d/L : vec2(1,0);
  vec2 n = vec2(-t.y, t.x);
  float hw = width*4.0;                      // 光のにじみを含めた半幅
  vec2 corner[6] = vec2[6](vec2(0,-1), vec2(1,-1), vec2(1,1), vec2(0,-1), vec2(1,1), vec2(0,1));
  vec2 cn = corner[vid];
  vec2 pos = mix(p0, p1, cn.x) + n*cn.y*hw;
  vD = cn.y*4.0;
  // ビームの頭からの距離で明るさが決まる（燐光の残像）
  float sm = mix(s0, s1, cn.x);
  float behind = fract(head - sm);
  vI = base + peak*exp(-behind/max(trail,1e-3));
  // 実際のオシロスコープ同様、ビームが遅い所ほど明るい
  if (speedRef > 0.0) vI *= clamp(sqrt(speedRef/max(L*N, 1.0)), 0.45, 2.2);
  vW = width;
  pos += jitter;
  gl_Position = vec4(pos/res*2.0-1.0, 0, 1);
}`;

const FS = HEADER + `
in float vD; in float vI; in float vW; out vec4 o;
uniform vec3 color;
void main(){
  float d = abs(vD);
  float core = exp(-d*d*2.2);
  float halo = exp(-d*1.3)*0.22;
  vec3 c = color*vI*(core + halo);
  c += vec3(1.0,0.92,0.8)*vI*core*core*0.35; // 芯は白く飛ぶ
  o = vec4(c, 1.);
}`;

export function createCurve(gl, N = 4096) {
  const prog = program(gl, FS, VS, 'curve');
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const ids = new Float32Array(N * 6);
  for (let i = 0; i < N; i++) for (let k = 0; k < 6; k++) ids[i * 6 + k] = i;
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, ids, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  return {
    draw(u, n = N) {
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      prog.use({ N: n, mode: 0, phase: 0, amp: 300, morph: 0, cardioid: 0, width: 1.6, head: 0, trail: 0.2, base: 0.6, peak: 4, grow: 1, tcur: 0, speedRef: 0,
        res: [1920, 1080], center: [960, 540], ra: [1, 1], rb: [1, 1], jitter: [0, 0], view: [-0.765, 0, 1.25], color: [1, 0.42, 0.16], ...u });
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, n * 6);
      gl.bindVertexArray(null);
      gl.disable(gl.BLEND);
    },
  };
}
