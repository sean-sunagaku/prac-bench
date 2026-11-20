// ─────────────────────────────────────────────────────────────
//  序章：プロンプト
//  人間の入力 → AI の返答 → 文字が粒子にほどけ、1つの光点に集まる
// ─────────────────────────────────────────────────────────────
import { program } from '../core/gl.js';
import { HEADER, COMMON } from '../core/glsl.js';
import { FONT, INK, ACCENT } from '../core/text.js';
import { SECTIONS, PROMPT, REPLY, REPLY_CHUNKS, PROMPT_TIMES, REPLY_TIMES, DISSOLVE_START, clamp, smooth } from '../timeline.js';

const PROMPT_SIZE = 54, REPLY_SIZE = 40;

const VS = HEADER + COMMON + `
layout(location=0) in vec4 aP;   // xy: 文字のピクセル位置, z: 種, w: 色(0=白,1=琥珀)
uniform vec2 res; uniform float tau; uniform vec2 jitter;
out vec3 vCol; out float vA;
void main(){
  vec2 c = res*0.5;
  vec2 p0 = aP.xy;
  float seed = aP.z;
  // 左から右へ、ほどけ始める
  float d = 0.42*(p0.x/res.x) + 0.08*seed;
  float s = clamp((tau - d)/(1.0 - 0.5), 0., 1.);
  float e = s*s*s*(s*(s*6.-15.)+10.);
  vec2 rel = p0 - c;
  float ang = pow(e, 1.4)*(4.5 + 2.0*seed);
  vec2 drift = vec2(noise(p0*0.006 + vec2(s*2.0, 0.)), noise(p0*0.006 + vec2(13.1, s*2.0)))*170.0;
  vec2 pos = c + rot(ang)*rel*(1.0-e) + drift*sin(PI*s)*(1.0-e*0.6);
  pos += jitter;
  gl_Position = vec4(pos/res*2.0-1.0, 0, 1);
  gl_Position.y = -gl_Position.y;
  gl_PointSize = mix(2.2, 2.6, seed);
  vec3 ink = vec3(1.0,0.96,0.9)*0.9;
  vec3 amb = vec3(1.0,0.42,0.18)*1.3;
  vCol = mix(ink, amb, aP.w) * (1.0 + 2.5*e*e) ;
  vA = smoothstep(0.0, 0.02, tau) ;
}`;

const FS = HEADER + `
in vec3 vCol; in float vA; out vec4 o;
void main(){
  vec2 q = gl_PointCoord*2.-1.;
  float r = dot(q,q);
  float a = exp(-r*3.0);
  o = vec4(vCol*a*vA, 1.);
}`;

// 光点：集まった粒子の行き先。次の章の「オシロスコープのビーム」になる
const SPARK = HEADER + COMMON + `
in vec2 vUv; out vec4 o;
uniform vec2 res; uniform float amt; uniform vec2 jitter;
void main(){
  vec2 p = gl_FragCoord.xy + jitter - res*0.5;
  float r = length(p);
  vec3 col = vec3(1.0,0.55,0.25)*(amt*6.0*exp(-r*r/18.0) + amt*0.6*exp(-r/22.0));
  o = vec4(col,1);
}`;

export default function intro(ctx) {
  const { gl, W, H, text } = ctx;
  const S = SECTIONS.intro;
  let prog, spark, vao, count = 0;
  const lineX = () => {
    const w1 = text.measure(PROMPT, { font: FONT.gothic, size: PROMPT_SIZE, weight: 300 }) + 64;
    const w2 = text.measure(REPLY, { font: FONT.gothic, size: REPLY_SIZE, weight: 300 }) + 64;
    return (W - Math.max(w1, w2)) / 2 + 64;
  };
  const Y1 = H / 2 - 22, Y2 = H / 2 + 62;

  function drawLines(T, nPrompt, nReply, alpha, cursorOn, t) {
    const x = lineX();
    T.text('›', x - 56, Y1 - 2, { font: FONT.latin, size: 60, weight: 400, color: ACCENT, alpha: alpha });
    const chars = [...PROMPT];
    const px = T.type(PROMPT, x, Y1, nPrompt, { font: FONT.gothic, size: PROMPT_SIZE, weight: 300, color: INK, alpha });
    const reply = REPLY_CHUNKS.slice(0, nReply).join('');
    const rx = T.text(reply, x, Y2, { font: FONT.gothic, size: REPLY_SIZE, weight: 300, color: ACCENT, alpha }) + x;
    if (cursorOn === 1) T.cursor(px, Y1, PROMPT_SIZE, alpha * ((t % 0.9) < 0.5 || nPrompt < chars.length && nPrompt > 0 ? 1 : 0));
    if (cursorOn === 2) T.cursor(rx, Y2, REPLY_SIZE, alpha * ((t % 0.9) < 0.5 || nReply < REPLY_CHUNKS.length ? 1 : 0), ACCENT);
  }

  return {
    name: 'intro', start: S.start, end: S.end,
    grade: { exposure: 1.0, bloom: 0.09, vignette: 0.3, grain: 0.03, aberration: 0.6 },
    async init() {
      prog = program(gl, FS, VS, 'intro-particles');
      spark = program(gl, SPARK, undefined, 'intro-spark');
      // 文字を一度描いて、インクの乗ったピクセルを粒子にする
      if (typeof document !== 'undefined' && document.fonts) {
        await Promise.all([`300 ${PROMPT_SIZE}px ${FONT.gothic}`, `600 150px ${FONT.mincho}`, `400 30px ${FONT.mono}`, `500 22px ${FONT.latin}`].map((f) => document.fonts.load(f, 'あ漢A')));
      }
      text.begin();
      drawLines(text, 999, 999, 1, 0, 0);
      const img = text.ctx.getImageData(0, 0, W, H).data;
      const pts = [];
      let seed = 1;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
        const i = (y * W + x) * 4;
        const a = img[i + 3];
        if (a > 90 && rnd() < 0.55) {
          const isAccent = img[i] > 150 && img[i + 2] < 150 ? 1 : 0;
          pts.push(x + 0.5, y + 0.5, rnd(), isAccent);
        }
      }
      count = pts.length / 4;
      vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
      text.begin();
    },
    render(lt, t, sub) {
      const tau = (lt - DISSOLVE_START) / (S.end - DISSOLVE_START);
      if (tau > 0) {
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
        prog.use({ res: [W, H], tau: clamp(tau), jitter: sub.jitter });
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.POINTS, 0, count);
        gl.bindVertexArray(null);
        const amt = smooth(0.55, 1.0, tau);
        if (amt > 0) { spark.use({ res: [W, H], amt, jitter: sub.jitter }); gl.fullscreen(); }
        gl.disable(gl.BLEND);
      }
    },
    text(T, lt) {
      let nP = 0; for (const pt of PROMPT_TIMES) if (lt >= pt) nP++;
      let nR = 0; for (const rt of REPLY_TIMES) if (lt >= rt) nR++;
      const a = 1 - smooth(DISSOLVE_START, DISSOLVE_START + 0.12, lt);
      const cursorMode = lt < REPLY_TIMES[0] - 0.25 ? 1 : 2;
      drawLines(T, nP, nR, a, cursorMode, lt);
    },
  };
}
