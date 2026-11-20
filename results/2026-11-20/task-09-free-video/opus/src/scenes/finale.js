// ─────────────────────────────────────────────────────────────
//  終章：種明かし
//  銀河が遠ざかって1つの光点になり、光点はカーソルに戻る。
//  そして、この映像を生み出したコードそのものが流れ出す。
// ─────────────────────────────────────────────────────────────
import { program } from '../core/gl.js';
import { HEADER, COMMON } from '../core/glsl.js';
import { FONT, INK, ACCENT } from '../core/text.js';
import { SECTIONS, PROMPT, clamp, smooth, easeOut, easeInOut, lerp } from '../timeline.js';

const SPARK = HEADER + COMMON + `
in vec2 vUv; out vec4 o;
uniform vec2 res, pos, jitter; uniform float amt;
void main(){
  vec2 p = gl_FragCoord.xy + jitter - pos;
  float r = length(p);
  vec3 col = vec3(1.0,0.55,0.25)*(amt*7.0*exp(-r*r/14.0) + amt*0.5*exp(-r/20.0));
  o = vec4(col,1);
}`;

export default function finale(ctx) {
  const { gl, W, H } = ctx;
  const S = SECTIONS.finale;
  let spark, lines = [], stats = { lines: 0, chars: 0, bytes: 0 };

  return {
    name: 'finale', start: S.start, end: S.end + 2.0, fadeIn: 4.0,
    grade: (lt) => ({ exposure: 1.0, bloom: 0.09, contrast: 1.1, saturation: 1.05, vignette: 0.4, grain: 0.035, aberration: 0.5, fade: 1 - smooth(18.6, 20.0, lt) }),
    init() {
      spark = program(gl, SPARK, undefined, 'finale-spark');
      const src = ctx.source || '';
      lines = src.split('\n').map((l) => l.replace(/\t/g, '  ').replace(/\s+$/, ''));
      stats = { lines: src.endsWith('\n') ? lines.length - 1 : lines.length, chars: [...src].length, bytes: new TextEncoder().encode(src).length };
    },
    render(lt, t, sub) {
      // 光点：中央で輝き、カーソルへと形を変える
      const amt = smooth(1.5, 3.6, lt) * (1 - smooth(4.0, 4.6, lt));
      if (amt > 0) {
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
        spark.use({ res: [W, H], pos: [W / 2, H / 2], jitter: sub.jitter, amt });
        gl.fullscreen();
        gl.disable(gl.BLEND);
      }
    },
    text(T, lt) {
      const c = T.ctx;
      // ── コードの滝（4.2 〜 11.4 秒）
      const wf = smooth(4.2, 4.9, lt) * (1 - smooth(10.6, 11.4, lt));
      if (wf > 0 && lines.length) {
        const cols = 4, colW = (W - 160) / cols, lh = 15, size = 12.5;
        const rows = Math.ceil(H / lh) + 2;
        c.save();
        c.font = `400 ${size}px ${FONT.mono}`;
        c.textBaseline = 'alphabetic';
        const speed = 18 + 160 * easeInOut(smooth(4.4, 10.4, lt));   // 行/秒、だんだん速く
        const scrolled = (lt - 4.2) * (18 + 60 * smooth(4.4, 10.4, lt)) + Math.pow(Math.max(0, lt - 6.5), 2.2) * 40;
        for (let k = 0; k < cols; k++) {
          const offset = Math.floor(lines.length * k / cols);
          const pos = scrolled * (1 + k * 0.18) + offset;
          const base = Math.floor(pos);
          const frac = pos - base;
          for (let r = 0; r < rows; r++) {
            const li = (base + r) % lines.length;
            const y = r * lh - frac * lh + 24;
            const line = lines[li];
            if (!line) continue;
            // 上から下へ読める順で、上へ流れていく／中央の帯ほど明るい
            const yy = y / H;
            const band = Math.exp(-Math.pow((yy - 0.5) / 0.32, 2));
            const reveal = clamp((lt - 4.2) * 3.0 - yy * 1.2);
            const a = wf * reveal * (0.18 + 0.62 * band);
            if (a <= 0.01) continue;
            c.globalAlpha = a;
            c.fillStyle = /^\s*(\/\/|#|\*)/.test(line) ? ACCENT : (k % 2 ? '#d9d2c7' : '#efe9df');
            c.fillText(line.slice(0, 88), 80 + k * colW, y);
          }
        }
        c.restore();
        // 統計（カウントアップ）
        const sa = smooth(6.0, 6.8, lt) * (1 - smooth(10.6, 11.4, lt));
        if (sa > 0) {
          const p = easeOut(clamp((lt - 6.0) / 3.2));
          T.rect(0, H / 2 - 120, W, 240, 'rgba(0,0,0,0.72)', sa);
          T.text('この動画のすべて', W / 2, H / 2 - 52, { font: FONT.gothic, size: 26, weight: 600, align: 'center', color: ACCENT, alpha: sa, spacing: 10 });
          const s = `1 ファイル　${Math.round(stats.lines * p).toLocaleString('en-US')} 行　${(stats.bytes * p / 1024).toFixed(1)} KB`;
          T.text(s, W / 2, H / 2 + 22, { font: FONT.gothic, size: 52, weight: 300, align: 'center', alpha: sa, shadow: 12 });
          T.text('画像・映像・音声素材　0　｜　外部ライブラリ　0', W / 2, H / 2 + 84, { font: FONT.gothic, size: 24, weight: 300, align: 'center', alpha: sa * smooth(7.6, 8.4, lt) * 0.85, spacing: 3 });
        }
      }
      // ── 光点がカーソルに
      if (lt > 3.9 && lt < 4.9) {
        const k = smooth(3.9, 4.5, lt);
        T.cursor(W / 2 - 3, H / 2 + 20, 40 * k + 4, (1 - smooth(4.6, 4.9, lt)), ACCENT);
      }
      // ── メッセージ（11.6 〜 15.8 秒）
      const ma = smooth(11.6, 12.0, lt) * (1 - smooth(15.4, 15.9, lt));
      if (ma > 0) {
        T.reveal('この動画の映像と音は、', W / 2, H / 2 - 30, clamp((lt - 11.6) / 1.0), { font: FONT.gothic, size: 50, weight: 300, align: 'center', alpha: ma, spread: 0.6, shadow: 10 });
        T.reveal('すべて、このコードが計算しました。', W / 2, H / 2 + 52, clamp((lt - 12.6) / 1.2), { font: FONT.gothic, size: 50, weight: 300, align: 'center', alpha: ma, spread: 0.6, shadow: 10 });
      }
      // ── 終幕カード（16.0 〜 20 秒）
      const ea = smooth(16.0, 16.6, lt);
      if (ea > 0) {
        T.text('PROMPT', W / 2, H / 2 - 150, { font: FONT.latin, size: 16, weight: 600, align: 'center', color: ACCENT, alpha: ea * 0.85, spacing: 8 });
        T.text(`「${PROMPT}」`, W / 2, H / 2 - 112, { font: FONT.gothic, size: 24, weight: 300, align: 'center', alpha: ea * 0.7 });
        T.reveal('Claude Opus 5.5', W / 2, H / 2 + 10, clamp((lt - 16.2) / 1.0), { font: FONT.latin, size: 92, weight: 500, align: 'center', spacing: 6, alpha: ea, blurAmt: 16, rise: 8, shadow: 20 });
        const msg = '次は、何をつくりましょうか。';
        const n = Math.floor(clamp((lt - 17.3) / 1.0) * [...msg].length);
        const mw = T.measure(msg, { font: FONT.gothic, size: 34, weight: 300 });
        const x0 = W / 2 - mw / 2;
        const xe = T.type(msg, x0, H / 2 + 110, n, { font: FONT.gothic, size: 34, weight: 300, color: ACCENT, alpha: ea });
        if (lt > 17.1) T.cursor(xe, H / 2 + 110, 34, ea * ((lt % 0.9) < 0.5 || n < [...msg].length ? 1 : 0), ACCENT);
      }
    },
  };
}
