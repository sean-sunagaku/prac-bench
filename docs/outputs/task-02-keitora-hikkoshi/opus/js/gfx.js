/* 描画まわりの小さなヘルパーと配色。
 * ワールド描画は「メートル単位・y 下向き」のローカル座標で行う（物理は y 上向きなので反転して渡す）。
 */
(function (root) {
  'use strict';
  const KT = (root.KT = root.KT || {});

  const C = {
    ink: '#1d2738', // 線画の墨（作業着の紺に寄せた黒）
    kraft: '#c99a5b',
    kraftD: '#a7763d',
    kraftL: '#e0b97f',
    tape: 'rgba(226,208,164,0.95)',
    white: '#f3f5f4',
    whiteD: '#d3dadc',
    whiteDD: '#aeb8bc',
    metal: '#aab5bb',
    black: '#262c35',
    screen: '#1b2430',
    wood: '#b27a45',
    woodD: '#7a4f2c',
    woodL: '#dcb47e',
    red: '#d13a2f',
    shu: '#c8323c', // 朱肉
    green: '#4f8a3a',
    leaf: '#3e8c47',
    leafD: '#2b6a35',
    leafL: '#67b05a',
    terracotta: '#c76a3f',
    gold: '#d7a83a',
    plate: '#f2c200', // 軽自動車の黄色ナンバー
    sky: '#9fd3ea',
    asphalt: '#4a4f57',
  };
  KT.C = C;

  KT.FONT_UI = '"BIZ UDPGothic", "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif';
  KT.FONT_DISPLAY = '"Dela Gothic One", "Hiragino Kaku Gothic StdN", "Hiragino Sans", "Yu Gothic", sans-serif';

  const G = (KT.G = {});

  G.rr = (ctx, x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  };

  G.poly = (ctx, pts) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  };

  /** 塗り＋墨線。lw はピクセル単位、P は 1px が何メートルか */
  G.fs = (ctx, fill, P, lw = 2, stroke = C.ink) => {
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (lw > 0) {
      ctx.lineWidth = lw * P;
      ctx.strokeStyle = stroke;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  };

  G.line = (ctx, x1, y1, x2, y2, P, lw = 2, color = C.ink) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = lw * P;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  G.circle = (ctx, x, y, r) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
  };

  /**
   * メートル単位の座標系でも小さなフォントが潰れないよう、内部的に 40px で描いて縮小する。
   */
  G.text = (ctx, str, x, y, sizeM, opt = {}) => {
    const k = sizeM / 40;
    ctx.save();
    ctx.translate(x, y);
    if (opt.rot) ctx.rotate(opt.rot);
    ctx.scale(k, k);
    ctx.font = (opt.weight || '700') + ' 40px ' + (opt.font || KT.FONT_UI);
    ctx.textAlign = opt.align || 'center';
    ctx.textBaseline = opt.baseline || 'middle';
    if (opt.stroke) {
      ctx.lineWidth = opt.strokeW || 8;
      ctx.strokeStyle = opt.stroke;
      ctx.lineJoin = 'round';
      ctx.strokeText(str, 0, 0);
    }
    ctx.fillStyle = opt.color || C.ink;
    ctx.fillText(str, 0, 0);
    ctx.restore();
  };

  /** 縦書き（1文字ずつ） */
  G.vtext = (ctx, str, x, y, sizeM, opt = {}) => {
    const chars = Array.from(str);
    const step = sizeM * (opt.leading || 1.05);
    const y0 = y - ((chars.length - 1) * step) / 2;
    chars.forEach((ch, i) => G.text(ctx, ch, x, y0 + i * step, sizeM, opt));
  };

  /** 色を明るく/暗く（#rrggbb 前提） */
  G.shade = (hex, amt) => {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (amt >= 0) {
      r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt;
    } else {
      r *= 1 + amt; g *= 1 + amt; b *= 1 + amt;
    }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  };

  /**
   * ひび割れ。seed ごとに決まった形で、ratio(0..1) に応じて本数が増える。
   * w,h はアイテムの外形（中心原点）。
   */
  G.cracks = (ctx, w, h, ratio, seed, P, color = 'rgba(25,30,40,0.85)') => {
    if (ratio <= 0.04) return;
    const rnd = KT.rng(seed * 7919 + 13);
    const n = Math.min(7, 1 + Math.floor(ratio * 7));
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < n; i++) {
      // 起点は外周のどこか
      const side = Math.floor(rnd() * 4);
      let x, y;
      if (side === 0) { x = (rnd() - 0.5) * w; y = -h / 2; }
      else if (side === 1) { x = w / 2; y = (rnd() - 0.5) * h; }
      else if (side === 2) { x = (rnd() - 0.5) * w; y = h / 2; }
      else { x = -w / 2; y = (rnd() - 0.5) * h; }
      let ang = Math.atan2(-y, -x) + (rnd() - 0.5) * 1.2;
      const segs = 3 + Math.floor(rnd() * 3);
      const len = Math.min(w, h) * (0.18 + ratio * 0.35);
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < segs; s++) {
        ang += (rnd() - 0.5) * 1.3;
        x += Math.cos(ang) * len / segs * 1.6;
        y += Math.sin(ang) * len / segs * 1.6;
        ctx.lineTo(KT.clamp(x, -w / 2, w / 2), KT.clamp(y, -h / 2, h / 2));
      }
      ctx.lineWidth = (1.2 + ratio * 1.6) * P;
      ctx.stroke();
    }
    ctx.restore();
  };
})(typeof window !== 'undefined' ? window : globalThis);
