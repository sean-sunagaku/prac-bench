// ─────────────────────────────────────────────────────────────
//  第1章「音」 — 周波数の比が、図形になる
//  左右のスピーカーに純音を1つずつ。左を横軸、右を縦軸にとると
//  協和する音程ほど、単純で美しいリサジュー図形を描く。
// ─────────────────────────────────────────────────────────────
import { program } from '../core/gl.js';
import { HEADER, COMMON } from '../core/glsl.js';
import { createCurve, MANDEL_VIEW } from '../core/curve.js';
import { FONT, INK, ACCENT } from '../core/text.js';
import { SECTIONS, INTERVALS, ROOT_HZ, LISSAJOUS_DETUNE, BAR, clamp, smooth, easeInOut, easeOut } from '../timeline.js';

const R = 318;              // 図形の半径（px）
const AMBER = [1.0, 0.40, 0.14];

const GRAT = HEADER + COMMON + `
in vec2 vUv; out vec4 o;
uniform vec2 res, jitter; uniform float alpha, glow;
void main(){
  vec2 p = gl_FragCoord.xy + jitter - res*0.5;
  float div = 66.0;
  vec2 g = abs(fract(p/div + 0.5) - 0.5)*div;          // 目盛り線までの距離
  float line = exp(-min(g.x,g.y)*min(g.x,g.y)*0.9);
  vec2 sub = abs(fract(p/(div/5.) + 0.5) - 0.5)*(div/5.);
  float ticks = exp(-min(sub.x,sub.y)*min(sub.x,sub.y)*1.5) * (step(abs(p.x),5.0)+step(abs(p.y),5.0));
  float mask = smoothstep(470., 300., length(p*vec2(0.92,1.0)));
  vec3 col = vec3(1.0,0.5,0.22)*(line*0.045 + ticks*0.06)*mask*alpha;
  col += vec3(1.0,0.45,0.2)*0.018*exp(-dot(p,p)/(2.*380.*380.))*glow; // 管面のほのかな光
  o = vec4(col,1);
}`;

export default function sound(ctx) {
  const { gl, W, H } = ctx;
  const S = SECTIONS.sound;
  let curve, grat;

  function state(lt) {
    const i = Math.min(INTERVALS.length - 1, Math.max(0, Math.floor(lt / BAR)));
    const barT = lt - i * BAR;
    const cur = INTERVALS[i], prev = INTERVALS[Math.max(0, i - 1)];
    const morph = i === 0 ? 1 : easeInOut(clamp(barT / 0.5));
    return { i, barT, cur, prev, morph };
  }

  return {
    name: 'sound', start: S.start, end: S.end,
    grade: { exposure: 1.0, bloom: 0.11, contrast: 1.12, saturation: 1.05, vignette: 0.4, grain: 0.03, aberration: 0.7 },
    init() { curve = createCurve(gl, 4096); grat = program(gl, GRAT, undefined, 'graticule'); },
    render(lt, t, sub) {
      const { cur, prev, morph } = state(lt);
      const card = easeInOut(clamp((lt - 13.6) / 1.9));
      grat.use({ res: [W, H], jitter: sub.jitter, alpha: smooth(0.6, 2.2, lt) * (1 - card), glow: 1 - card * 0.7 });
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.fullscreen(); gl.disable(gl.BLEND);

      const phase = Math.PI / 2 + 2 * Math.PI * LISSAJOUS_DETUNE * lt;
      const ampE = clamp(lt / 0.95);
      const amp = R * (1 - Math.pow(1 - ampE, 3) * Math.cos(ampE * 5.0)) ; // 少し弾んで広がる
      const head = lt * 0.5 + 0.25;
      const ra = [prev.a, prev.b], rb = [cur.a, cur.b];
      const sp = amp * Math.PI * 2 * Math.hypot(cur.a, cur.b) * 0.72;
      curve.draw({
        res: [W, H], center: [W / 2, H / 2], jitter: sub.jitter, ra, rb, morph, phase, amp: Math.max(amp, 0.01),
        cardioid: card, view: [MANDEL_VIEW.cx, MANDEL_VIEW.cy, MANDEL_VIEW.half],
        grow: clamp(lt / 1.15), head, trail: 0.30 + card * 2.0, base: 0.55 + card * 0.9, peak: 5.0 * (1 - card * 0.75),
        width: 1.7, color: AMBER, speedRef: sp * (1 - card),
      });
      // 下部の小さな2本の波形（左右のチャンネル）
      const wa = smooth(1.2, 2.4, lt) * (1 - smooth(13.2, 14.4, lt));
      if (wa > 0) {
        for (const [m, y] of [[1, 186], [2, 112]]) {
          curve.draw({
            mode: m, res: [W, H], center: [1590, y], amp: 230, ra: [cur.a, cur.b], phase: phase - Math.PI / 2, tcur: lt,
            jitter: sub.jitter, base: 0.9 * wa, peak: 0, width: 1.2, color: AMBER, head: 0, trail: 1,
          }, 1024);
        }
      }
    },
    text(T, lt) {
      T.chapter({ num: '01', kanji: '音', en: 'SOUND', formula: 'x = sin(a·t),  y = sin(b·t)', desc: '美しく響く和音は、周波数が単純な整数の比になっている。' }, lt, 5.6);
      T.label('01', '音', 'SOUND', lt, 15.6);
      const { i, barT, cur } = state(lt);
      const fadeOut = 1 - smooth(13.4, 14.2, lt);
      // 右側：いま鳴っている音程の比と名前
      const inA = easeOut(clamp((barT - 0.05) / 0.5));
      const outA = 1 - smooth(BAR - 0.28, BAR - 0.02, barT);
      const a = clamp(lt / 1.2) * inA * (i === INTERVALS.length - 1 ? 1 : outA) * fadeOut;
      if (a > 0) {
        const x = 1585, y = 470;
        T.text(`${cur.a} : ${cur.b}`, x, y + (1 - inA) * 18, { font: FONT.latin, size: 96, weight: 200, align: 'center', alpha: a, spacing: 4, shadow: 16 });
        T.text(cur.name, x, y + 62 + (1 - inA) * 12, { font: FONT.mincho, size: 34, weight: 600, align: 'center', alpha: a * 0.95, spacing: 6, shadow: 12 });
        T.text(cur.en, x, y + 100 + (1 - inA) * 10, { font: FONT.latin, size: 15, weight: 600, align: 'center', alpha: a * 0.6, spacing: 6 });
      }
      // 波形ラベル：実際に鳴っている周波数
      const wa = smooth(1.2, 2.4, lt) * fadeOut;
      if (wa > 0) {
        const fL = ROOT_HZ * cur.a / cur.b, fR = ROOT_HZ + LISSAJOUS_DETUNE;
        T.text('L', 1338, H - 186 + 7, { font: FONT.latin, size: 16, weight: 700, color: ACCENT, alpha: wa * 0.9, spacing: 2 });
        T.text(`${fL.toFixed(1)} Hz`, 1842, H - 186 - 34, { font: FONT.mono, size: 15, align: 'right', alpha: wa * 0.75 });
        T.text('R', 1338, H - 112 + 7, { font: FONT.latin, size: 16, weight: 700, color: ACCENT, alpha: wa * 0.9, spacing: 2 });
        T.text(`${fR.toFixed(1)} Hz`, 1842, H - 112 - 34, { font: FONT.mono, size: 15, align: 'right', alpha: wa * 0.75 });
      }
    },
  };
}
