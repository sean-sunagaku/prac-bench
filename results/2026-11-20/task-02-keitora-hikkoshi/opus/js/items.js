/* 荷物カタログ。
 * shapes は物理用（メートル・y 上向き・外形の中心が原点）。
 * draw は描画用（メートル・y 下向き・同じ原点）。
 *
 * tough  : これを超える速度変化 (m/s) の衝撃でダメージ
 * crush  : これを超える荷重 (N) が乗り続けるとじわじわ潰れる
 * value  : 全損・落下時の弁償額
 */
(function (root) {
  'use strict';
  const KT = (root.KT = root.KT || {});
  const C = KT.C;
  const G = KT.G;

  // ---- 形状ヘルパー（y 上向き） ----
  const box = (w, h, x = 0, y = 0, share) => ({ type: 'box', w, h, x, y, share });
  const poly = (pts, share) => ({ type: 'poly', pts, share });
  const circ = (r, x = 0, y = 0, share) => ({ type: 'circle', r, x, y, share });
  /** 角を落とした長方形（布団・米袋向け） */
  const capsule = (w, h, bevel, share) => {
    const a = w / 2, b = h / 2, c = Math.min(bevel, b * 0.95);
    return poly(
      [
        [-a + c, -b], [a - c, -b], [a, -b + c], [a, b - c],
        [a - c, b], [-a + c, b], [-a, b - c], [-a, -b + c],
      ],
      share
    );
  };

  // ---- 共通の描き方 ----
  const INF = Infinity;

  function fragileSticker(ctx, x, y, s, P) {
    // 赤地に白抜き「ワレモノ」＋グラス
    G.rr(ctx, x - s * 0.9, y - s * 0.32, s * 1.8, s * 0.64, s * 0.08);
    G.fs(ctx, C.red, P, 1);
    ctx.save();
    ctx.translate(x - s * 0.62, y);
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, -s * 0.2);
    ctx.lineTo(s * 0.12, -s * 0.2);
    ctx.quadraticCurveTo(s * 0.12, s * 0.02, 0, s * 0.04);
    ctx.quadraticCurveTo(-s * 0.12, s * 0.02, -s * 0.12, -s * 0.2);
    ctx.moveTo(0, s * 0.04);
    ctx.lineTo(0, s * 0.18);
    ctx.moveTo(-s * 0.08, s * 0.2);
    ctx.lineTo(s * 0.08, s * 0.2);
    ctx.lineWidth = 1.4 * P;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.restore();
    G.text(ctx, 'ワレモノ', x + s * 0.2, y + s * 0.01, s * 0.34, { color: '#fff', weight: '700' });
  }

  function thisWayUp(ctx, x, y, s, P, color = C.red) {
    // 天地無用の「↑↑」マーク
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.6 * P;
    for (const dx of [-s * 0.22, s * 0.22]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, y + s * 0.32);
      ctx.lineTo(x + dx, y - s * 0.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + dx - s * 0.14, y - s * 0.08);
      ctx.lineTo(x + dx, y - s * 0.32);
      ctx.lineTo(x + dx + s * 0.14, y - s * 0.08);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(x - s * 0.45, y + s * 0.4);
    ctx.lineTo(x + s * 0.45, y + s * 0.4);
    ctx.stroke();
    ctx.restore();
  }

  function cardboard(ctx, w, h, P, opt) {
    const x = -w / 2, y = -h / 2;
    G.rr(ctx, x, y, w, h, 0.012);
    G.fs(ctx, opt.color || C.kraft, P);
    // 下側の影と上フタの折り目
    ctx.fillStyle = 'rgba(110,70,25,0.16)';
    ctx.fillRect(x + P * 2, y + h * 0.8, w - P * 4, h * 0.2 - P * 2);
    G.line(ctx, x + 0.012, y + h * 0.15, x + w - 0.012, y + h * 0.15, P, 1.2, 'rgba(95,60,25,0.5)');
    // ガムテープ
    ctx.fillStyle = C.tape;
    ctx.fillRect(-0.034, y + P, 0.068, h * 0.34);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-0.034, y + P, 0.014, h * 0.34);
    // マジックの手書き
    const fs = Math.min(h * 0.3, w * 0.24);
    G.text(ctx, opt.label, opt.fragile ? -w * 0.18 : 0, y + h * 0.6, fs, { color: '#2a1d12', weight: '700' });
    if (opt.fragile) fragileSticker(ctx, w * 0.22, y + h * 0.62, Math.min(0.11, w * 0.2), P);
    if (opt.tenchi) thisWayUp(ctx, x + 0.07, y + h * 0.3, 0.07, P);
    if (opt.heavyMark) {
      G.text(ctx, '重', x + w - 0.06, y + h * 0.3, 0.06, { color: C.red, weight: '700' });
      G.circle(ctx, x + w - 0.06, y + h * 0.3, 0.042);
      ctx.lineWidth = 1.4 * P;
      ctx.strokeStyle = C.red;
      ctx.stroke();
    }
  }

  function upSticker(ctx, x, y, P) {
    // 黄色い注意シール（横倒し厳禁）
    G.rr(ctx, x - 0.04, y - 0.055, 0.08, 0.11, 0.01);
    G.fs(ctx, C.plate, P, 1.2);
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.moveTo(x, y - 0.04);
    ctx.lineTo(x + 0.025, y - 0.01);
    ctx.lineTo(x + 0.009, y - 0.01);
    ctx.lineTo(x + 0.009, y + 0.04);
    ctx.lineTo(x - 0.009, y + 0.04);
    ctx.lineTo(x - 0.009, y - 0.01);
    ctx.lineTo(x - 0.025, y - 0.01);
    ctx.closePath();
    ctx.fill();
  }

  // ---- カタログ ----
  const ITEMS = {};
  function def(id, d) {
    d.id = id;
    d.tags = d.tags || [];
    if (d.mass >= 25 && !d.tags.includes('heavy')) d.tags.push('heavy');
    d.friction = d.friction ?? 0.55;
    d.restitution = d.restitution ?? 0.05;
    d.crush = d.crush ?? INF;
    ITEMS[id] = d;
  }

  def('danbo_s', {
    name: '段ボール（本）', short: '本の箱', desc: '小さいのにずっしり重い。',
    mass: 15, value: 5000, tough: 3.0, crush: 1700,
    w: 0.38, h: 0.28, shapes: [box(0.38, 0.28)], sound: 'box', debris: [C.kraft, '#f2efe6'],
    draw(ctx, P) { cardboard(ctx, this.w, this.h, P, { label: '本', heavyMark: true }); },
  });
  def('danbo_m', {
    name: '段ボール（衣類）', short: '衣類の箱', desc: '軽いが、重い物を載せるとつぶれる。',
    mass: 8, value: 3000, tough: 3.2, crush: 700,
    w: 0.5, h: 0.38, shapes: [box(0.5, 0.38)], sound: 'box', debris: [C.kraft, '#9fb8d8'],
    draw(ctx, P) { cardboard(ctx, this.w, this.h, P, { label: '衣類' }); },
  });
  def('danbo_l', {
    name: '段ボール（雑貨）', short: '雑貨の箱', desc: '大きい。中身はいろいろ。',
    mass: 10, value: 4000, tough: 2.6, crush: 600,
    w: 0.62, h: 0.46, shapes: [box(0.62, 0.46)], sound: 'box', debris: [C.kraft, '#e3d5b8'],
    draw(ctx, P) { cardboard(ctx, this.w, this.h, P, { label: '雑貨', color: '#c39257' }); },
  });
  def('danbo_ware', {
    name: '段ボール（食器）', short: '食器の箱', desc: '中身はお皿とグラス。上下さかさま厳禁。',
    mass: 12, value: 12000, tough: 1.35, crush: 380, tags: ['fragile', 'tenchi'],
    w: 0.48, h: 0.36, shapes: [box(0.48, 0.36)], sound: 'glass', debris: [C.kraft, '#ffffff', '#cfe8f2'],
    draw(ctx, P) { cardboard(ctx, this.w, this.h, P, { label: '食器', fragile: true, tenchi: true }); },
  });

  def('futon', {
    name: '布団', short: '布団', desc: 'くるくる巻いた布団。触れた荷物を衝撃から守る。',
    mass: 7, value: 8000, tough: INF, tags: ['cushion'], friction: 0.95, restitution: 0,
    w: 0.86, h: 0.34, shapes: [capsule(0.86, 0.34, 0.11)], sound: 'soft', debris: ['#f1b5b0'],
    draw(ctx, P) {
      const w = this.w, h = this.h;
      G.rr(ctx, -w / 2, -h / 2, w, h, h * 0.42);
      G.fs(ctx, '#ef9f98', P);
      // 水玉
      ctx.save();
      G.rr(ctx, -w / 2, -h / 2, w, h, h * 0.42);
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 3; j++) {
          const px = -w / 2 + 0.05 + i * 0.1 + (j % 2) * 0.05;
          const py = -h / 2 + 0.06 + j * 0.11;
          G.circle(ctx, px, py, 0.018);
          ctx.fill();
        }
      }
      ctx.fillStyle = 'rgba(160,60,60,0.18)';
      ctx.fillRect(-w / 2, h * 0.18, w, h * 0.4);
      ctx.restore();
      // 巻きの端
      ctx.beginPath();
      ctx.arc(w / 2 - h * 0.42, 0, h * 0.3, -Math.PI / 2, Math.PI / 2);
      ctx.lineWidth = 1.4 * P;
      ctx.strokeStyle = 'rgba(120,40,40,0.55)';
      ctx.stroke();
      // ひも
      for (const fx of [-0.24, 0.2]) {
        ctx.fillStyle = '#f7f1df';
        ctx.fillRect(w * fx - 0.012, -h / 2, 0.024, h);
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 1 * P;
        ctx.strokeRect(w * fx - 0.012, -h / 2 + P, 0.024, h - 2 * P);
      }
    },
  });

  def('fridge_s', {
    name: '冷蔵庫（小）', short: '冷蔵庫', desc: '1ドアの小型。倒して運ぶと故障のもと。',
    mass: 25, value: 25000, tough: 2.3, crush: 2500, tags: ['noTilt'], friction: 0.4, restitution: 0.08,
    w: 0.48, h: 0.84, shapes: [box(0.48, 0.84)], sound: 'metal', debris: [C.white, C.metal],
    draw(ctx, P) {
      const w = this.w, h = this.h, x = -w / 2, y = -h / 2;
      G.rr(ctx, x, y, w, h, 0.03);
      G.fs(ctx, '#eef2f2', P);
      ctx.fillStyle = 'rgba(110,135,150,0.16)';
      ctx.fillRect(x + w * 0.8, y + 0.03, w * 0.17, h - 0.06);
      G.line(ctx, x + 0.012, y + h * 0.3, x + w - 0.012, y + h * 0.3, P, 1.6);
      G.rr(ctx, x + w * 0.1, y + h * 0.12, 0.03, h * 0.12, 0.012);
      G.fs(ctx, C.metal, P, 1.4);
      G.rr(ctx, x + w * 0.1, y + h * 0.36, 0.03, h * 0.16, 0.012);
      G.fs(ctx, C.metal, P, 1.4);
      ctx.fillStyle = '#90a4ae';
      ctx.fillRect(x + w * 0.5, y + h * 0.06, w * 0.28, 0.016);
      upSticker(ctx, x + w * 0.66, y + h * 0.6, P);
      ctx.fillStyle = C.black;
      ctx.fillRect(x + 0.04, y + h - P, 0.06, 0.012);
      ctx.fillRect(x + w - 0.1, y + h - P, 0.06, 0.012);
    },
  });
  def('fridge_l', {
    name: '冷蔵庫（2ドア）', short: '冷蔵庫', desc: '背が高くて重い。横に倒すと故障のもと。',
    mass: 55, value: 60000, tough: 2.3, crush: 3000, tags: ['noTilt'], friction: 0.4, restitution: 0.08,
    w: 0.58, h: 1.24, shapes: [box(0.58, 1.24)], sound: 'metal', debris: [C.white, C.metal],
    draw(ctx, P) {
      const w = this.w, h = this.h, x = -w / 2, y = -h / 2;
      G.rr(ctx, x, y, w, h, 0.035);
      G.fs(ctx, '#e9eef0', P);
      ctx.fillStyle = 'rgba(110,135,150,0.16)';
      ctx.fillRect(x + w * 0.82, y + 0.03, w * 0.15, h - 0.06);
      G.line(ctx, x + 0.012, y + h * 0.34, x + w - 0.012, y + h * 0.34, P, 1.6);
      G.line(ctx, x + 0.012, y + h * 0.72, x + w - 0.012, y + h * 0.72, P, 1.2, 'rgba(29,39,56,0.6)');
      G.rr(ctx, x + w * 0.08, y + h * 0.18, 0.03, h * 0.12, 0.012);
      G.fs(ctx, C.metal, P, 1.4);
      G.rr(ctx, x + w * 0.08, y + h * 0.38, 0.03, h * 0.2, 0.012);
      G.fs(ctx, C.metal, P, 1.4);
      ctx.fillStyle = '#90a4ae';
      ctx.fillRect(x + w * 0.5, y + h * 0.05, w * 0.3, 0.018);
      upSticker(ctx, x + w * 0.68, y + h * 0.5, P);
      ctx.fillStyle = C.black;
      ctx.fillRect(x + 0.05, y + h - P, 0.07, 0.014);
      ctx.fillRect(x + w - 0.12, y + h - P, 0.07, 0.014);
    },
  });

  def('washer', {
    name: '洗濯機', short: '洗濯機', desc: '重くて頑丈。下に置くと安定する。',
    mass: 32, value: 45000, tough: 2.5, crush: 2200, friction: 0.42, restitution: 0.08,
    w: 0.55, h: 0.86, shapes: [box(0.55, 0.86)], sound: 'metal', debris: [C.white, '#7fb3d5'],
    draw(ctx, P) {
      const w = this.w, h = this.h, x = -w / 2, y = -h / 2;
      G.rr(ctx, x, y + 0.04, w, h - 0.04, 0.04);
      G.fs(ctx, '#f1f4f4', P);
      // 操作パネル（背面側の盛り上がり）
      G.rr(ctx, x + w * 0.52, y, w * 0.46, 0.09, 0.025);
      G.fs(ctx, '#d9e3e8', P, 1.6);
      ['#e45b4f', '#4f9de4', '#5fc07a'].forEach((c, i) => {
        G.circle(ctx, x + w * 0.62 + i * 0.05, y + 0.045, 0.012);
        ctx.fillStyle = c;
        ctx.fill();
      });
      G.line(ctx, x + 0.02, y + 0.13, x + w * 0.5, y + 0.13, P, 1.2, 'rgba(29,39,56,0.6)');
      ctx.fillStyle = 'rgba(110,135,150,0.14)';
      ctx.fillRect(x + w * 0.84, y + 0.1, w * 0.13, h - 0.16);
      G.text(ctx, '全自動', x + w * 0.42, y + h * 0.5, 0.07, { color: '#3d7fc4' });
      G.line(ctx, x + w * 0.2, y + h * 0.58, x + w * 0.64, y + h * 0.58, P, 1.2, '#3d7fc4');
      ctx.fillStyle = C.black;
      ctx.fillRect(x + 0.04, y + h - P, 0.07, 0.014);
      ctx.fillRect(x + w - 0.11, y + h - P, 0.07, 0.014);
    },
  });

  function tvDraw(ctx, P, w, h, sh, baseW) {
    const x = -w / 2, y = -h / 2;
    // スタンド
    G.rr(ctx, -0.03, y + sh - 0.01, 0.06, h - sh - 0.03, 0.01);
    G.fs(ctx, '#3a414c', P, 1.4);
    G.rr(ctx, -baseW / 2, y + h - 0.035, baseW, 0.035, 0.012);
    G.fs(ctx, '#3a414c', P, 1.6);
    // 画面
    G.rr(ctx, x, y, w, sh, 0.02);
    G.fs(ctx, '#20262f', P);
    const g = ctx.createLinearGradient(x, y, x + w, y + sh);
    g.addColorStop(0, '#324a63');
    g.addColorStop(1, '#141c26');
    G.rr(ctx, x + 0.022, y + 0.022, w - 0.044, sh - 0.05, 0.008);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.15, y);
    ctx.lineTo(x + w * 0.35, y);
    ctx.lineTo(x + w * 0.05, y + sh);
    ctx.lineTo(x - w * 0.15, y + sh);
    ctx.fill();
    ctx.restore();
    G.circle(ctx, x + w - 0.04, y + sh - 0.014, 0.006);
    ctx.fillStyle = '#ff5a4a';
    ctx.fill();
  }
  def('tv_s', {
    name: 'テレビ（24型）', short: 'テレビ', desc: '画面が割れやすい。重い物を載せないこと。',
    mass: 6, value: 20000, tough: 1.25, crush: 160, tags: ['fragile'], restitution: 0.04,
    w: 0.56, h: 0.4, sound: 'glass', debris: ['#20262f', '#9fc3dd', '#ffffff'],
    shapes: [box(0.56, 0.34, 0, 0.03, 0.85), box(0.24, 0.06, 0, -0.17, 0.15)],
    draw(ctx, P) { tvDraw(ctx, P, this.w, this.h, 0.34, 0.24); },
  });
  def('tv_l', {
    name: 'テレビ（43型）', short: '大型テレビ', desc: '大きくて高価。とにかく衝撃に弱い。',
    mass: 12, value: 50000, tough: 1.15, crush: 180, tags: ['fragile'], restitution: 0.04,
    w: 0.86, h: 0.56, sound: 'glass', debris: ['#20262f', '#9fc3dd', '#ffffff'],
    shapes: [box(0.86, 0.5, 0, 0.03, 0.88), box(0.34, 0.06, 0, -0.25, 0.12)],
    draw(ctx, P) { tvDraw(ctx, P, this.w, this.h, 0.5, 0.34); },
  });

  def('microwave', {
    name: '電子レンジ', short: 'レンジ', desc: 'ガラス窓つき。ほどほどに衝撃に弱い。',
    mass: 12, value: 12000, tough: 1.8, crush: 500, tags: ['fragile'], friction: 0.45,
    w: 0.46, h: 0.3, shapes: [box(0.46, 0.3)], sound: 'metal', debris: [C.white, '#2d3640'],
    draw(ctx, P) {
      const w = this.w, h = this.h, x = -w / 2, y = -h / 2;
      G.rr(ctx, x, y, w, h, 0.02);
      G.fs(ctx, '#e8ecec', P);
      G.rr(ctx, x + 0.03, y + 0.035, w * 0.6, h - 0.07, 0.012);
      G.fs(ctx, '#2c3540', P, 1.4);
      ctx.fillStyle = 'rgba(255,220,140,0.18)';
      ctx.fillRect(x + 0.05, y + 0.06, w * 0.25, 0.02);
      G.circle(ctx, x + w * 0.83, y + h * 0.36, 0.035);
      G.fs(ctx, '#cfd8dc', P, 1.4);
      G.line(ctx, x + w * 0.83, y + h * 0.36, x + w * 0.83 + 0.02, y + h * 0.36 - 0.02, P, 1.4);
      ctx.fillStyle = '#7c8b93';
      ctx.fillRect(x + w * 0.74, y + h * 0.62, w * 0.18, 0.02);
      ctx.fillRect(x + w * 0.74, y + h * 0.72, w * 0.18, 0.02);
    },
  });

  def('kotatsu', {
    name: 'こたつ', short: 'こたつ', desc: '脚のあいだにすき間がある。',
    mass: 12, value: 12000, tough: 2.4, crush: 650, friction: 0.5,
    w: 0.76, h: 0.36, sound: 'wood', debris: [C.woodL, C.woodD],
    shapes: [
      box(0.76, 0.05, 0, 0.155, 0.55),
      box(0.06, 0.31, -0.33, -0.025, 0.2),
      box(0.06, 0.31, 0.33, -0.025, 0.2),
      box(0.6, 0.06, 0, 0.1, 0.05),
    ],
    draw(ctx, P) {
      const w = this.w, h = this.h, x = -w / 2, y = -h / 2;
      // ヒーター
      G.rr(ctx, -0.13, y + 0.1, 0.26, 0.07, 0.01);
      G.fs(ctx, '#4b4f57', P, 1.4);
      for (let i = 0; i < 4; i++) G.line(ctx, -0.1 + i * 0.065, y + 0.12, -0.1 + i * 0.065, y + 0.15, P, 1.2, '#e3874a');
      // 脚
      for (const sx of [-1, 1]) {
        G.rr(ctx, sx * 0.33 - 0.03, y + 0.05, 0.06, h - 0.05, 0.008);
        G.fs(ctx, C.wood, P);
      }
      // 幕板
      G.rr(ctx, -0.3, y + 0.04, 0.6, 0.06, 0.006);
      G.fs(ctx, C.woodD, P, 1.4);
      // 天板
      G.rr(ctx, x, y, w, 0.05, 0.012);
      G.fs(ctx, '#c08a52', P);
      G.line(ctx, x + 0.02, y + 0.015, x + w - 0.02, y + 0.015, P, 1, 'rgba(255,255,255,0.4)');
    },
  });

  def('guitar', {
    name: 'ギター', short: 'ギター', desc: 'ハードケース入り。多少の重さには耐えるが、衝撃でネックが折れやすい。',
    mass: 4, value: 30000, tough: 1.4, crush: 300, tags: ['fragile'], friction: 0.75, restitution: 0.02,
    w: 1.0, h: 0.36, sound: 'wood', debris: ['#1f232b', '#d9a35b'],
    shapes: [
      poly([[-0.5, -0.09], [-0.45, -0.18], [-0.25, -0.18], [-0.06, -0.11], [-0.06, 0.11], [-0.25, 0.18], [-0.45, 0.18], [-0.5, 0.09]], 0.7),
      box(0.46, 0.11, 0.17, 0, 0.2),
      box(0.1, 0.15, 0.45, 0, 0.1),
    ],
    draw(ctx, P) {
      ctx.beginPath();
      ctx.moveTo(-0.5, 0);
      ctx.bezierCurveTo(-0.5, -0.2, -0.3, -0.2, -0.24, -0.15);
      ctx.bezierCurveTo(-0.17, -0.11, -0.14, -0.13, -0.06, -0.055);
      ctx.lineTo(0.4, -0.055);
      ctx.lineTo(0.4, -0.075);
      ctx.lineTo(0.5, -0.075);
      ctx.lineTo(0.5, 0.075);
      ctx.lineTo(0.4, 0.075);
      ctx.lineTo(0.4, 0.055);
      ctx.lineTo(-0.06, 0.055);
      ctx.bezierCurveTo(-0.14, 0.13, -0.17, 0.11, -0.24, 0.15);
      ctx.bezierCurveTo(-0.3, 0.2, -0.5, 0.2, -0.5, 0);
      ctx.closePath();
      G.fs(ctx, '#232830', P);
      G.line(ctx, -0.44, 0, 0.46, 0, P, 1, 'rgba(255,255,255,0.12)');
      // 留め具とハンドル
      ctx.fillStyle = '#c9ced4';
      [-0.4, -0.15, 0.2].forEach((fx) => ctx.fillRect(fx, -0.012 + (fx < -0.1 ? 0.13 : 0.045), 0.03, 0.016));
      G.rr(ctx, -0.22, -0.2, 0.1, 0.03, 0.012);
      G.fs(ctx, '#3a414c', P, 1.2);
      // ステッカー
      G.circle(ctx, -0.36, -0.03, 0.05);
      G.fs(ctx, C.plate, P, 1.2);
      G.text(ctx, '★', -0.36, -0.028, 0.06, { color: C.red });
    },
  });

  def('mirror', {
    name: '姿見', short: '姿見', desc: '背が高く倒れやすい。鏡はとても割れやすい。',
    mass: 6, value: 10000, tough: 1.0, crush: 100, tags: ['fragile'], friction: 0.5,
    w: 0.32, h: 1.2, shapes: [box(0.32, 1.2)], sound: 'glass', debris: ['#dfeef5', '#ffffff', C.woodL],
    draw(ctx, P) {
      const w = this.w, h = this.h, x = -w / 2, y = -h / 2;
      G.rr(ctx, x, y, w, h, 0.03);
      G.fs(ctx, C.woodL, P);
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, '#f3fbff');
      g.addColorStop(0.5, '#b9d5e3');
      g.addColorStop(1, '#e7f3f9');
      G.rr(ctx, x + 0.035, y + 0.035, w - 0.07, h - 0.07, 0.015);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 1.2 * P;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 3 * P;
      for (const o of [0.25, 0.42]) {
        ctx.beginPath();
        ctx.moveTo(x, y + h * o);
        ctx.lineTo(x + w, y + h * o - w * 0.9);
        ctx.stroke();
      }
      ctx.restore();
    },
  });

  def('plant', {
    name: '観葉植物', short: '観葉植物', desc: '頭が重くて倒れやすい。逆さにすると土がこぼれる。',
    mass: 8, value: 8000, tough: 1.5, crush: 150, tags: ['fragile', 'tenchi'], friction: 0.55,
    w: 0.56, h: 0.86, sound: 'ceramic', debris: [C.terracotta, C.leaf, '#6b4a2f'],
    shapes: [
      poly([[-0.12, -0.43], [0.12, -0.43], [0.16, -0.13], [-0.16, -0.13]], 0.85),
      poly([[-0.08, -0.13], [0.08, -0.13], [0.24, 0.0], [0.28, 0.2], [0.14, 0.4], [-0.14, 0.4], [-0.28, 0.2], [-0.24, 0.0]], 0.15),
    ],
    draw(ctx, P) {
      // 茎
      ctx.strokeStyle = '#4c7a35';
      ctx.lineWidth = 3 * P;
      ctx.lineCap = 'round';
      [[-0.02, -0.3], [0.1, -0.25], [-0.12, -0.18], [0.16, -0.05], [-0.18, -0.02]].forEach(([tx, ty]) => {
        ctx.beginPath();
        ctx.moveTo(0, 0.14);
        ctx.quadraticCurveTo(tx * 0.3, 0, tx, ty);
        ctx.stroke();
      });
      // 葉
      const leaves = [
        [-0.17, -0.06, 0.12, 0.07, -0.5], [0.17, -0.08, 0.12, 0.07, 0.5],
        [-0.12, -0.24, 0.12, 0.07, -0.9], [0.12, -0.26, 0.12, 0.07, 0.9],
        [0.0, -0.33, 0.07, 0.11, 0], [-0.2, 0.06, 0.1, 0.06, -0.2], [0.2, 0.05, 0.1, 0.06, 0.2],
      ];
      leaves.forEach(([lx, ly, rx, ry, rot], i) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        G.fs(ctx, i % 2 ? C.leaf : C.leafL, P, 1.6);
        G.line(ctx, -rx * 0.85, 0, rx * 0.85, 0, P, 1, C.leafD);
        ctx.restore();
      });
      // 鉢
      G.poly(ctx, [[-0.12, 0.43], [0.12, 0.43], [0.155, 0.17], [-0.155, 0.17]]);
      G.fs(ctx, C.terracotta, P);
      G.rr(ctx, -0.17, 0.13, 0.34, 0.06, 0.012);
      G.fs(ctx, '#d98457', P);
      ctx.fillStyle = 'rgba(80,30,10,0.15)';
      ctx.fillRect(-0.12, 0.34, 0.24, 0.08);
    },
  });

  def('watermelon', {
    name: 'スイカ', short: 'スイカ', desc: '畑でとれたおみやげ。ころころ転がる。',
    mass: 6, value: 2000, tough: 1.7, crush: 320, tags: ['rolls', 'fragile'], friction: 0.45, restitution: 0.12,
    w: 0.32, h: 0.32, shapes: [circ(0.16)], sound: 'fruit', debris: ['#e24b4b', '#2f7d3a', '#1d1d1d'],
    draw(ctx, P, st) {
      const r = 0.16;
      G.circle(ctx, 0, 0, r);
      G.fs(ctx, '#3d9a45', P);
      ctx.save();
      G.circle(ctx, 0, 0, r);
      ctx.clip();
      ctx.strokeStyle = '#174f22';
      ctx.lineWidth = 4 * P;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        const x0 = i * 0.07;
        ctx.moveTo(x0, -r);
        for (let k = 1; k <= 8; k++) {
          const yy = -r + (k * 2 * r) / 8;
          ctx.lineTo(x0 + Math.sin(k * 1.9 + i) * 0.014 + x0 * 0.25 * Math.cos((yy / r) * 1.4), yy);
        }
        ctx.stroke();
      }
      if (st && st.broken) {
        ctx.fillStyle = '#e8473f';
        ctx.beginPath();
        ctx.moveTo(-r, 0.02);
        ctx.lineTo(r, -0.03);
        ctx.lineTo(r, r);
        ctx.lineTo(-r, r);
        ctx.fill();
        ctx.fillStyle = '#1d1d1d';
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.ellipse(-0.1 + i * 0.04, 0.06 + (i % 2) * 0.03, 0.006, 0.011, 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.ellipse(-0.06, -0.07, 0.05, 0.03, -0.6, 0, Math.PI * 2);
      ctx.fill();
      G.line(ctx, 0, -r, 0.02, -r - 0.03, P, 2, '#5a4a20');
    },
  });

  def('tansu', {
    name: 'タンス', short: 'タンス', desc: '大きくて重い桐だんす。土台向き。',
    mass: 60, value: 40000, tough: 2.6, crush: 3500, friction: 0.5,
    w: 0.75, h: 0.95, shapes: [box(0.75, 0.95)], sound: 'wood', debris: [C.woodL, C.woodD],
    draw(ctx, P) {
      const w = this.w, h = this.h, x = -w / 2, y = -h / 2;
      G.rr(ctx, x, y, w, h, 0.012);
      G.fs(ctx, '#d6b282', P);
      const rows = [0.0, 0.2, 0.4, 0.6, 0.8];
      rows.forEach((r, i) => {
        const yy = y + 0.03 + r * (h - 0.06);
        const hh = (h - 0.06) * 0.2 - 0.012;
        if (i === 0) {
          for (const half of [0, 1]) {
            G.rr(ctx, x + 0.03 + half * (w - 0.06) / 2, yy, (w - 0.06) / 2 - 0.008, hh, 0.006);
            G.fs(ctx, '#e3c394', P, 1.4);
            ctx.beginPath();
            ctx.arc(x + 0.03 + half * (w - 0.06) / 2 + (w - 0.06) / 4, yy + hh * 0.45, 0.022, 0, Math.PI);
            ctx.lineWidth = 2.2 * P;
            ctx.strokeStyle = '#2b2b2b';
            ctx.stroke();
          }
        } else {
          G.rr(ctx, x + 0.03, yy, w - 0.06, hh, 0.006);
          G.fs(ctx, '#e3c394', P, 1.4);
          for (const fx of [0.28, 0.72]) {
            ctx.beginPath();
            ctx.arc(x + w * fx, yy + hh * 0.42, 0.024, 0, Math.PI);
            ctx.lineWidth = 2.2 * P;
            ctx.strokeStyle = '#2b2b2b';
            ctx.stroke();
          }
        }
      });
      // 角金具
      ctx.fillStyle = '#3a3a3a';
      [[x, y], [x + w - 0.05, y], [x, y + h - 0.05], [x + w - 0.05, y + h - 0.05]].forEach(([cx, cy]) => ctx.fillRect(cx, cy, 0.05, 0.05));
    },
  });

  def('butsudan', {
    name: '仏壇', short: '仏壇', desc: 'ご先祖さまの仏壇。高価で、とても繊細。',
    mass: 40, value: 120000, tough: 1.5, crush: 650, tags: ['fragile', 'tenchi'], friction: 0.5,
    w: 0.58, h: 0.8, sound: 'wood', debris: ['#1a1a1a', C.gold],
    shapes: [box(0.52, 0.74, 0, -0.03, 0.9), box(0.58, 0.06, 0, 0.37, 0.1)],
    draw(ctx, P) {
      const y = -0.4;
      // 屋根
      ctx.beginPath();
      ctx.moveTo(-0.29, y + 0.06);
      ctx.lineTo(-0.25, y);
      ctx.lineTo(0.25, y);
      ctx.lineTo(0.29, y + 0.06);
      ctx.closePath();
      G.fs(ctx, '#1f1b19', P);
      G.line(ctx, -0.27, y + 0.055, 0.27, y + 0.055, P, 2, C.gold);
      // 本体
      G.rr(ctx, -0.26, y + 0.06, 0.52, 0.74, 0.01);
      G.fs(ctx, '#24201e', P);
      // 扉
      for (const sx of [-1, 1]) {
        G.rr(ctx, sx > 0 ? 0.008 : -0.226, y + 0.1, 0.218, 0.56, 0.006);
        G.fs(ctx, '#2e2926', P, 1.4, C.gold);
        G.rr(ctx, sx > 0 ? 0.035 : -0.2, y + 0.14, 0.165, 0.2, 0.004);
        G.fs(ctx, null, P, 1, C.gold);
        G.rr(ctx, sx > 0 ? 0.035 : -0.2, y + 0.38, 0.165, 0.24, 0.004);
        G.fs(ctx, null, P, 1, C.gold);
      }
      G.circle(ctx, 0, y + 0.4, 0.018);
      G.fs(ctx, C.gold, P, 1);
      // 台
      G.rr(ctx, -0.26, y + 0.7, 0.52, 0.1, 0.006);
      G.fs(ctx, '#1a1716', P, 1.4);
      G.line(ctx, -0.22, y + 0.75, 0.22, y + 0.75, P, 1.6, C.gold);
    },
  });

  def('bonsai', {
    name: '盆栽', short: '盆栽', desc: 'おじいちゃんが育てた松。値打ちもの。',
    mass: 6, value: 50000, tough: 1.3, crush: 150, tags: ['fragile', 'tenchi'], friction: 0.5,
    w: 0.46, h: 0.42, sound: 'ceramic', debris: ['#3c5f8a', C.leafD, '#6b4a2f'],
    shapes: [box(0.4, 0.1, 0, -0.16, 0.75), poly([[-0.1, -0.11], [0.1, -0.11], [0.21, -0.02], [0.23, 0.08], [0.14, 0.2], [-0.12, 0.21], [-0.22, 0.1], [-0.21, -0.02]], 0.25)],
    draw(ctx, P) {
      // 幹
      ctx.beginPath();
      ctx.moveTo(-0.03, 0.12);
      ctx.bezierCurveTo(-0.1, 0.02, 0.08, -0.02, 0.0, -0.1);
      ctx.bezierCurveTo(-0.04, -0.14, -0.1, -0.12, -0.12, -0.16);
      ctx.lineWidth = 7 * P;
      ctx.strokeStyle = '#6a4a31';
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineWidth = 3 * P;
      ctx.beginPath();
      ctx.moveTo(0.0, -0.02);
      ctx.quadraticCurveTo(0.1, -0.06, 0.15, -0.04);
      ctx.stroke();
      // 葉の雲
      [[-0.13, -0.15, 0.09, 0.045], [0.14, -0.06, 0.08, 0.04], [0.02, -0.18, 0.08, 0.04], [-0.06, -0.04, 0.07, 0.035]].forEach(([cx, cy, rx, ry]) => {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        G.fs(ctx, '#3f7a3e', P, 1.6);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath();
        ctx.ellipse(cx - rx * 0.2, cy - ry * 0.3, rx * 0.5, ry * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      // 鉢
      G.rr(ctx, -0.2, 0.11, 0.4, 0.08, 0.01);
      G.fs(ctx, '#3c5f8a', P);
      ctx.fillStyle = '#2b4566';
      ctx.fillRect(-0.17, 0.19, 0.05, 0.02);
      ctx.fillRect(0.12, 0.19, 0.05, 0.02);
      G.line(ctx, -0.18, 0.13, 0.18, 0.13, P, 1, 'rgba(255,255,255,0.35)');
    },
  });

  def('tsubo', {
    name: '壺', short: '壺', desc: '古伊万里（たぶん）。鑑定に出す予定。',
    mass: 9, value: 30000, tough: 1.1, crush: 260, tags: ['fragile'], friction: 0.42,
    w: 0.36, h: 0.46, sound: 'ceramic', debris: ['#ffffff', '#2f4f8f'],
    shapes: [
      poly([[-0.11, -0.23], [0.11, -0.23], [0.17, -0.1], [0.18, 0.02], [0.14, 0.13], [0.07, 0.17], [-0.07, 0.17], [-0.14, 0.13], [-0.18, 0.02], [-0.17, -0.1]], 0.92),
      box(0.12, 0.06, 0, 0.2, 0.08),
    ],
    draw(ctx, P) {
      ctx.beginPath();
      ctx.moveTo(-0.06, -0.23);
      ctx.lineTo(0.06, -0.23);
      ctx.lineTo(0.06, -0.17);
      ctx.bezierCurveTo(0.2, -0.13, 0.2, 0.1, 0.11, 0.23);
      ctx.lineTo(-0.11, 0.23);
      ctx.bezierCurveTo(-0.2, 0.1, -0.2, -0.13, -0.06, -0.17);
      ctx.closePath();
      G.fs(ctx, '#f7f6f1', P);
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = '#2f4f8f';
      ctx.lineWidth = 2.2 * P;
      ctx.beginPath();
      ctx.moveTo(-0.2, -0.1);
      ctx.lineTo(0.2, -0.1);
      ctx.moveTo(-0.2, 0.16);
      ctx.lineTo(0.2, 0.16);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-0.09 + i * 0.09, 0.03, 0.035, 0.2, Math.PI * 1.7);
        ctx.stroke();
      }
      ctx.fillStyle = '#c8323c';
      G.circle(ctx, 0, 0.03, 0.014);
      ctx.fill();
      ctx.restore();
    },
  });

  def('manekineko', {
    name: '招き猫', short: '招き猫', desc: '小さくて割れやすい。商売繁盛。',
    mass: 2, value: 6000, tough: 1.1, crush: 100, tags: ['fragile'], friction: 0.5,
    w: 0.22, h: 0.3, sound: 'ceramic', debris: ['#ffffff', '#d13a2f', C.gold],
    shapes: [poly([[-0.1, -0.15], [0.1, -0.15], [0.11, 0.02], [0.08, 0.13], [0.0, 0.15], [-0.08, 0.13], [-0.11, 0.02]])],
    draw(ctx, P) {
      G.rr(ctx, -0.1, -0.02, 0.2, 0.17, 0.05);
      G.fs(ctx, '#fbfbf8', P);
      // 頭
      ctx.beginPath();
      ctx.moveTo(-0.075, -0.1);
      ctx.lineTo(-0.065, -0.15);
      ctx.lineTo(-0.035, -0.12);
      ctx.lineTo(0.035, -0.12);
      ctx.lineTo(0.065, -0.15);
      ctx.lineTo(0.075, -0.1);
      ctx.closePath();
      G.fs(ctx, '#fbfbf8', P, 1.4);
      ctx.beginPath();
      ctx.ellipse(0, -0.06, 0.085, 0.065, 0, 0, Math.PI * 2);
      G.fs(ctx, '#fbfbf8', P);
      G.line(ctx, -0.045, -0.065, -0.02, -0.065, P, 1.6);
      G.line(ctx, 0.02, -0.065, 0.045, -0.065, P, 1.6);
      // 上げた手
      G.rr(ctx, -0.13, -0.11, 0.045, 0.09, 0.02);
      G.fs(ctx, '#fbfbf8', P, 1.4);
      // 首輪と鈴
      G.rr(ctx, -0.07, -0.005, 0.14, 0.022, 0.01);
      G.fs(ctx, C.red, P, 1);
      G.circle(ctx, 0, 0.022, 0.016);
      G.fs(ctx, C.gold, P, 1);
      // 小判
      ctx.beginPath();
      ctx.ellipse(0.04, 0.08, 0.035, 0.05, 0.1, 0, Math.PI * 2);
      G.fs(ctx, C.gold, P, 1.2);
    },
  });

  def('komebukuro', {
    name: '米袋（30kg）', short: '米袋', desc: '新米30kg。重いけど丈夫で滑りにくい。',
    mass: 30, value: 10000, tough: 4.5, friction: 1.0, restitution: 0,
    w: 0.56, h: 0.2, shapes: [capsule(0.56, 0.2, 0.05)], sound: 'soft', debris: ['#f4efe2', '#ffffff'],
    draw(ctx, P) {
      const w = this.w, h = this.h;
      G.rr(ctx, -w / 2, -h / 2, w, h, 0.05);
      G.fs(ctx, '#f3eedf', P);
      ctx.fillStyle = '#4f8a3a';
      ctx.fillRect(-w / 2 + 0.02, -0.025, w - 0.04, 0.05);
      G.text(ctx, '新米', -0.12, -0.002, 0.045, { color: '#fff' });
      G.text(ctx, '30kg', 0.12, 0.0, 0.042, { color: '#fff', font: KT.FONT_UI });
      G.line(ctx, -w / 2 + 0.04, -h / 2 + 0.02, w / 2 - 0.04, -h / 2 + 0.02, P, 1, 'rgba(0,0,0,0.25)');
    },
  });

  def('chabudai', {
    name: 'ちゃぶ台', short: 'ちゃぶ台', desc: '脚の下にすき間ができる。',
    mass: 7, value: 8000, tough: 2.2, crush: 520, friction: 0.5,
    w: 0.72, h: 0.3, sound: 'wood', debris: ['#6b3f22', '#a8693d'],
    shapes: [box(0.72, 0.04, 0, 0.13, 0.6), box(0.045, 0.26, -0.26, -0.02, 0.2), box(0.045, 0.26, 0.26, -0.02, 0.2)],
    draw(ctx, P) {
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * 0.26 - 0.025, -0.11);
        ctx.lineTo(sx * 0.26 + 0.025, -0.11);
        ctx.lineTo(sx * 0.26 + 0.018, 0.15);
        ctx.lineTo(sx * 0.26 - 0.018, 0.15);
        ctx.closePath();
        G.fs(ctx, '#7a4527', P);
      }
      G.rr(ctx, -0.2, -0.11, 0.4, 0.03, 0.005);
      G.fs(ctx, '#5c331d', P, 1.2);
      G.rr(ctx, -0.36, -0.15, 0.72, 0.045, 0.015);
      G.fs(ctx, '#8b4f2b', P);
      G.line(ctx, -0.33, -0.137, 0.33, -0.137, P, 1, 'rgba(255,255,255,0.35)');
    },
  });

  def('tsukemono', {
    name: '漬物樽', short: '漬物樽', desc: '重石つきのぬか漬け。とにかく重い。',
    mass: 28, value: 5000, tough: 3.2, crush: 3000, friction: 0.6,
    w: 0.38, h: 0.46, sound: 'wood', debris: ['#b98a52', '#7f7f7f'],
    shapes: [poly([[-0.16, -0.23], [0.16, -0.23], [0.19, -0.03], [0.17, 0.17], [-0.17, 0.17], [-0.19, -0.03]], 0.85), box(0.2, 0.06, 0, 0.2, 0.15)],
    draw(ctx, P) {
      // 重石
      ctx.beginPath();
      ctx.ellipse(0, -0.19, 0.1, 0.045, 0, 0, Math.PI * 2);
      G.fs(ctx, '#8d8f93', P);
      // 樽
      ctx.beginPath();
      ctx.moveTo(-0.17, -0.17);
      ctx.lineTo(0.17, -0.17);
      ctx.quadraticCurveTo(0.21, 0.03, 0.16, 0.23);
      ctx.lineTo(-0.16, 0.23);
      ctx.quadraticCurveTo(-0.21, 0.03, -0.17, -0.17);
      ctx.closePath();
      G.fs(ctx, '#c49359', P);
      for (let i = -2; i <= 2; i++) G.line(ctx, i * 0.07, -0.16, i * 0.065, 0.22, P, 1, 'rgba(90,55,20,0.45)');
      for (const yy of [-0.1, 0.15]) {
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(-0.19, yy - 0.012, 0.38, 0.024);
      }
      G.text(ctx, 'ぬか', 0, 0.03, 0.06, { color: '#4a2d12' });
    },
  });

  def('clock', {
    name: '柱時計', short: '柱時計', desc: '振り子つきの古い時計。逆さ厳禁。',
    mass: 9, value: 20000, tough: 1.25, crush: 200, tags: ['fragile', 'tenchi'], friction: 0.5,
    w: 0.3, h: 0.72, shapes: [box(0.3, 0.72)], sound: 'glass', debris: ['#5b3720', '#ffffff', C.gold],
    draw(ctx, P) {
      const w = this.w, h = this.h, x = -w / 2, y = -h / 2;
      G.rr(ctx, x, y, w, h, 0.03);
      G.fs(ctx, '#6a4026', P);
      G.circle(ctx, 0, y + 0.15, 0.1);
      G.fs(ctx, '#faf6ea', P, 1.6);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        G.line(ctx, Math.cos(a) * 0.08, y + 0.15 + Math.sin(a) * 0.08, Math.cos(a) * 0.09, y + 0.15 + Math.sin(a) * 0.09, P, 1.2);
      }
      G.line(ctx, 0, y + 0.15, 0, y + 0.09, P, 1.8);
      G.line(ctx, 0, y + 0.15, 0.05, y + 0.15, P, 1.4);
      G.rr(ctx, x + 0.06, y + 0.3, w - 0.12, 0.34, 0.01);
      G.fs(ctx, 'rgba(210,230,240,0.45)', P, 1.4);
      G.line(ctx, 0, y + 0.31, 0, y + 0.55, P, 1.4, '#9a7a2a');
      G.circle(ctx, 0, y + 0.57, 0.035);
      G.fs(ctx, C.gold, P, 1.2);
    },
  });

  def('kinko', {
    name: '金庫', short: '金庫', desc: 'おばあちゃんの金庫。中身はヒミツ。小さいのにとても重い。',
    mass: 100, value: 30000, tough: 5.0, crush: INF, friction: 0.5, restitution: 0.03,
    w: 0.42, h: 0.48, shapes: [box(0.42, 0.48)], sound: 'metal', debris: ['#3b4a45', '#bfbfbf'],
    draw(ctx, P) {
      const w = this.w, h = this.h, x = -w / 2, y = -h / 2;
      G.rr(ctx, x, y, w, h, 0.03);
      G.fs(ctx, '#3c4c47', P);
      G.rr(ctx, x + 0.03, y + 0.03, w - 0.06, h - 0.07, 0.015);
      G.fs(ctx, '#465a54', P, 1.4);
      G.circle(ctx, x + w * 0.42, y + h * 0.42, 0.065);
      G.fs(ctx, '#c9c9c4', P, 1.6);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        G.line(ctx, x + w * 0.42 + Math.cos(a) * 0.05, y + h * 0.42 + Math.sin(a) * 0.05, x + w * 0.42 + Math.cos(a) * 0.06, y + h * 0.42 + Math.sin(a) * 0.06, P, 1);
      }
      G.circle(ctx, x + w * 0.42, y + h * 0.42, 0.018);
      G.fs(ctx, '#7d7d78', P, 1);
      G.rr(ctx, x + w * 0.7, y + h * 0.36, 0.035, 0.12, 0.012);
      G.fs(ctx, '#c9c9c4', P, 1.4);
      ctx.fillStyle = C.gold;
      ctx.fillRect(x + w * 0.36, y + h * 0.75, w * 0.18, 0.02);
      ctx.fillStyle = '#222';
      ctx.fillRect(x + 0.04, y + h - P, 0.06, 0.014);
      ctx.fillRect(x + w - 0.1, y + h - P, 0.06, 0.014);
    },
  });

  KT.ITEMS = ITEMS;

  /** 形状の面積（重さを密度に換算するため） */
  KT.shapeArea = (s) => {
    if (s.type === 'box') return s.w * s.h;
    if (s.type === 'circle') return Math.PI * s.r * s.r;
    let a = 0;
    const p = s.pts;
    for (let i = 0; i < p.length; i++) {
      const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length];
      a += x1 * y2 - x2 * y1;
    }
    return Math.abs(a) / 2;
  };

  /** 物理形状を（描画座標 y 下向きで）パスにする。ハイライトやクリップ用 */
  KT.itemShapePath = (ctx, def, inflate = 0) => {
    ctx.beginPath();
    for (const s of def.shapes) {
      if (s.type === 'box') {
        const hw = s.w / 2 + inflate, hh = s.h / 2 + inflate;
        ctx.rect(s.x - hw, -s.y - hh, hw * 2, hh * 2);
      } else if (s.type === 'circle') {
        ctx.moveTo(s.x + s.r + inflate, -s.y);
        ctx.arc(s.x, -s.y, s.r + inflate, 0, Math.PI * 2);
      } else {
        // 多角形は重心方向に膨らませる
        let cx = 0, cy = 0;
        s.pts.forEach(([x, y]) => { cx += x; cy += y; });
        cx /= s.pts.length; cy /= s.pts.length;
        s.pts.forEach(([x, y], i) => {
          const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1;
          const px = x + (dx / d) * inflate, py = -(y + (dy / d) * inflate);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
      }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
