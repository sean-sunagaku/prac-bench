// ─────────────────────────────────────────────────────────────
//  text.js — 文字のレイヤー（Canvas2D → テクスチャ）
//  章タイトル、数式、字幕。タイポグラフィの動きもここで作る。
// ─────────────────────────────────────────────────────────────
import { clamp, smooth, easeOut } from '../timeline.js';

export const FONT = {
  mincho: '"Hiragino Mincho ProN", "YuMincho", serif',
  gothic: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif',
  latin: '"Avenir Next", "Helvetica Neue", sans-serif',
  mono: '"SF Mono", Menlo, monospace',
};
export const INK = '#f3efe8';
export const ACCENT = '#e8865f'; // 琥珀の燐光色

export function createText(gl, W, H) {
  const canvas = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H });
  const ctx = canvas.getContext('2d');
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  const T = {
    canvas, ctx, tex, W, H,
    begin() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); ctx.globalAlpha = 1; ctx.filter = 'none'; },
    upload() {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    },

    // 文字列を描く（字間・ぼかし・透明度つき）
    text(str, x, y, { font, size = 40, weight = 400, color = INK, alpha = 1, align = 'left', spacing = 0, blur = 0, base = 'alphabetic', shadow = 0 } = {}) {
      if (alpha <= 0.001 || !str) return 0;
      ctx.save();
      ctx.globalAlpha = clamp(alpha);
      ctx.font = `${weight} ${size}px ${font || FONT.gothic}`;
      ctx.letterSpacing = `${spacing}px`;
      ctx.textAlign = align;
      ctx.textBaseline = base;
      ctx.fillStyle = color;
      if (blur > 0.05) ctx.filter = `blur(${blur.toFixed(2)}px)`;
      if (shadow > 0) { ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = shadow; }
      ctx.fillText(str, x, y);
      const w = ctx.measureText(str).width;
      ctx.restore();
      return w;
    },
    measure(str, { font, size = 40, weight = 400, spacing = 0 } = {}) {
      ctx.save(); ctx.font = `${weight} ${size}px ${font || FONT.gothic}`; ctx.letterSpacing = `${spacing}px`;
      const w = ctx.measureText(str).width; ctx.restore(); return w;
    },

    // 1文字ずつ、ぼかしから立ち上がる
    reveal(str, x, y, p, opt = {}) {
      const chars = [...str];
      const n = chars.length;
      const spread = opt.spread ?? 0.55;
      let cx = x;
      if (opt.align === 'center') cx = x - T.measure(str, opt) / 2;
      if (opt.align === 'right') cx = x - T.measure(str, opt);
      for (let i = 0; i < n; i++) {
        const a = clamp((p * (1 + spread) - (i / n) * spread) / 1);
        const e = easeOut(a);
        const w = T.measure(chars[i], opt) ;
        T.text(chars[i], cx, y + (1 - e) * (opt.rise ?? 14), { ...opt, align: 'left', alpha: (opt.alpha ?? 1) * e, blur: (1 - e) * (opt.blurAmt ?? 10) });
        cx += w;
      }
    },

    // タイプライター（カーソルつき）
    type(str, x, y, n, opt = {}) {
      const chars = [...str];
      const shown = chars.slice(0, Math.floor(n)).join('');
      const w = T.text(shown, x, y, opt);
      return x + w;
    },
    cursor(x, y, size, alpha = 1, color = INK) {
      if (alpha <= 0) return;
      ctx.save(); ctx.globalAlpha = clamp(alpha); ctx.fillStyle = color;
      ctx.fillRect(x + size * 0.08, y - size * 0.86, Math.max(2, size * 0.075), size * 1.02);
      ctx.restore();
    },
    rect(x, y, w, h, color, alpha = 1) { ctx.save(); ctx.globalAlpha = clamp(alpha); ctx.fillStyle = color; ctx.fillRect(x, y, w, h); ctx.restore(); },
    line(x1, y1, x2, y2, color, alpha = 1, width = 1) { ctx.save(); ctx.globalAlpha = clamp(alpha); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); },
  };

  // 章タイトル：番号・漢字・英字・数式・一行の説明
  // lt は章の開始からの秒数。0.4s で立ち上がり、hold 秒後に消える。
  T.chapter = function ({ num, kanji, en, formula, desc }, lt, hold = 5.2) {
    const inP = clamp((lt - 0.25) / 1.2);
    const out = 1 - smooth(hold, hold + 0.9, lt);
    if (out <= 0 || inP <= 0) return;
    const x = 128, y = H - 250;
    const a = out;
    T.text(num, x + 4, y - 168, { font: FONT.latin, size: 22, weight: 600, color: ACCENT, spacing: 6, alpha: a * smooth(0, 0.4, inP) });
    T.line(x + 52, y - 176, x + 52 + 160 * easeOut(inP), y - 176, ACCENT, 0.7 * a, 1.5);
    T.reveal(kanji, x, y, inP, { font: FONT.mincho, size: 150, weight: 600, alpha: a, spacing: 8, blurAmt: 18, rise: 10, shadow: 18 });
    const enP = clamp((lt - 0.7) / 1.0);
    T.text(en, x + 6, y + 52, { font: FONT.latin, size: 22, weight: 500, spacing: 12 - 3 * easeOut(enP), alpha: a * easeOut(enP), color: 'rgba(243,239,232,0.82)', shadow: 8 });
    if (formula) {
      const fP = clamp((lt - 1.1) / 1.4);
      const chars = [...formula];
      const n = Math.floor(chars.length * fP);
      const fx = T.type(formula, x + 4, y + 112, n, { font: FONT.mono, size: 30, color: ACCENT, alpha: a, shadow: 10 });
      if (fP < 1 || (lt % 1) < 0.5) T.cursor(fx, y + 112, 30, a * (fP > 0 ? 1 : 0), ACCENT);
    }
    if (desc) {
      const dP = clamp((lt - 1.9) / 1.2);
      T.reveal(desc, x + 4, y + 168, dP, { font: FONT.gothic, size: 30, weight: 300, alpha: a * 0.92, spread: 0.8, blurAmt: 6, rise: 6, shadow: 10 });
    }
  };

  // 章が始まって以降、左上に小さく残るラベル
  T.label = function (num, kanji, en, lt, end) {
    const a = smooth(6.0, 6.8, lt) * (1 - smooth(end - 0.6, end, lt));
    if (a <= 0) return;
    T.text(num, 96, 92, { font: FONT.latin, size: 18, weight: 600, color: ACCENT, spacing: 4, alpha: a * 0.9 });
    T.text(kanji, 136, 93, { font: FONT.mincho, size: 26, weight: 600, alpha: a * 0.9, shadow: 8 });
    const kw = T.measure(kanji, { font: FONT.mincho, size: 26, weight: 600 });
    T.text(en, 136 + kw + 16, 91, { font: FONT.latin, size: 15, weight: 500, spacing: 5, alpha: a * 0.6 });
  };
  return T;
}
