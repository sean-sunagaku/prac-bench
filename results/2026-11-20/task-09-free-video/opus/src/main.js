// ─────────────────────────────────────────────────────────────
//  main.js — すべての章を時間軸に並べ、1フレームずつ合成する
// ─────────────────────────────────────────────────────────────
import { createGL, program, fbo } from './core/gl.js';
import { HEADER } from './core/glsl.js';
import { createPost } from './core/post.js';
import { createText } from './core/text.js';
import { W, H, FPS, DURATION, SECTIONS, smooth, clamp, lerp } from './timeline.js';
import intro from './scenes/intro.js';
import sound from './scenes/sound.js';
import infinity from './scenes/infinity.js';
import life from './scenes/life.js';
import earth from './scenes/earth.js';
import light from './scenes/light.js';
import cosmos from './scenes/cosmos.js';
import finale from './scenes/finale.js';

const ACCUM = HEADER + `
in vec2 vUv; out vec4 o;
uniform sampler2D a, b; uniform float wa, wb;
void main(){ o = vec4(texture(a,vUv).rgb*wa + texture(b,vUv).rgb*wb, 1.); }`;

// 低食い違い列（サブピクセルのずらし量）
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };

export async function boot(canvas, opts = {}) {
  const gl = createGL(canvas);
  const post = createPost(gl, W, H);
  const text = createText(gl, W, H);
  const ctx = { gl, W, H, text, opts, source: opts.source || '' };

  const scenes = [intro, sound, infinity, life, earth, light, cosmos, finale].map((f) => f(ctx));
  for (const s of scenes) { await s.init?.(); }

  const sceneBuf = [fbo(gl, W, H), fbo(gl, W, H)];
  const accum = fbo(gl, W, H, { internal: gl.RGBA32F });
  const accumProg = program(gl, ACCUM, undefined, 'accum');

  // 各シーンの可視区間：次のシーンの fadeIn ぶんだけ残る
  scenes.forEach((s, i) => { const n = scenes[i + 1]; s.visEnd = s.end + (n?.fadeIn || 0); });

  function activeAt(t) {
    const act = [];
    for (const s of scenes) if (t >= s.start && t < s.visEnd) act.push(s);
    return act.slice(-2);
  }
  function weightOf(s, t) { return s.fadeIn ? smooth(s.start, s.start + s.fadeIn, t) : 1; }

  function gradeAt(t, act) {
    const gs = act.map((s) => (typeof s.grade === 'function' ? s.grade(t - s.start) : s.grade) || {});
    if (gs.length === 1) return { ...gs[0] };
    const w = weightOf(act[1], t), A = gs[0], B = gs[1], g = {};
    const keys = new Set([...Object.keys(A), ...Object.keys(B)]);
    const def = { exposure: 1, bloom: 0.06, contrast: 1.15, saturation: 1.1, vignette: 0.35, grain: 0.035, aberration: 1, flash: 0, fade: 1 };
    for (const k of keys) {
      const a = A[k] ?? def[k], b = B[k] ?? def[k];
      g[k] = Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], w)) : lerp(a, b, w);
    }
    return g;
  }

  let lastFrame = -1;
  function renderFrame(frame, K = 1, shutter = 0.5) {
    const t = frame / FPS;
    const act = activeAt(t);
    // 状態を持つシミュレーションは、1フレームに1回だけ時間を進める
    for (const s of act) s.update?.(t - s.start, t);

    gl.disable(gl.BLEND);
    accum.clear(0, 0, 0, 1);
    for (let k = 0; k < K; k++) {
      const tk = K > 1 ? t + ((k + 0.5) / K - 0.5) * shutter / FPS : t;
      const jitter = K > 1 ? [halton(k + 1, 2) - 0.5, halton(k + 1, 3) - 0.5] : [0, 0];
      act.forEach((s, i) => {
        sceneBuf[i].bind();
        gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
        s.render(tk - s.start, tk, { jitter, k, K, target: sceneBuf[i] });
      });
      accum.bind();
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      const wB = act.length > 1 ? weightOf(act[1], t) : 0;
      accumProg.use({ a: sceneBuf[0].tex, b: sceneBuf[act.length > 1 ? 1 : 0].tex, wa: (1 - wB) / K, wb: wB / K });
      gl.fullscreen();
      gl.disable(gl.BLEND);
    }

    text.begin();
    for (const s of act) s.text?.(text, t - s.start, t);
    text.upload();

    const g = gradeAt(t, act);
    post.composite(accum.tex, text.tex, g, frame, canvas.width, canvas.height);
    lastFrame = frame;
  }

  return { gl, renderFrame, scenes, DURATION, FPS, W, H };
}
