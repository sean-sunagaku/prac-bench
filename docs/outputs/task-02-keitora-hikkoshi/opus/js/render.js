/* 描画。カメラ・背景・地形・軽トラ・荷物・ロープ・パーティクル・擬音。
 * ワールドは「メートル・y 下向き（-y）」で描く。
 */
(function (root) {
  'use strict';
  const KT = (root.KT = root.KT || {});
  const C = KT.C;
  const G = KT.G;

  const THEMES = {
    morning: {
      sky: ['#7cc6ee', '#bfe3f2', '#fbe6c4'], sun: '#fff1b8', sunY: 0.22, cloud: 'rgba(255,255,255,0.9)',
      far: '#9dbccd', farTop: '#b9d0db', mid: '#a9c5a6', house: ['#e4dccd', '#d7cbb7', '#efe8db'], roof: ['#5d6f8f', '#7a5f52', '#4f6b5a'],
      soil: '#a77d55', soilD: '#7d5a3a', grass: '#86b862', grassD: '#5f9443', window: '#bcd7e6', night: 0,
    },
    noon: {
      sky: ['#4aa8e6', '#9fd3f2', '#e2f2f8'], sun: '#fffbe0', sunY: 0.12, cloud: 'rgba(255,255,255,0.95)',
      far: '#87abc6', farTop: '#a7c4d6', mid: '#93bd8c', house: ['#ece6da', '#ddd3c1', '#f4efe6'], roof: ['#3f5f8a', '#8a4f3c', '#4a6d4f'],
      soil: '#a47a52', soilD: '#7a5636', grass: '#79b457', grassD: '#56903b', window: '#a9cfe3', night: 0,
    },
    evening: {
      sky: ['#47579b', '#e98c6a', '#ffd394'], sun: '#ffb35c', sunY: 0.62, cloud: 'rgba(255,214,190,0.85)',
      far: '#6c5b7d', farTop: '#8a6e8a', mid: '#7f6b70', house: ['#c9b3a3', '#b89f8f', '#d6c2b0'], roof: ['#3e3f5c', '#5a3b3b', '#3b4a45'],
      soil: '#7b5b45', soilD: '#5a3f2f', grass: '#6f8f4f', grassD: '#4e6b37', window: '#ffd27a', night: 0.35,
    },
  };
  KT.THEMES = THEMES;

  // 1次元のなめらかなノイズ（背景の山並み用）
  function noise1(x, seed) {
    const i = Math.floor(x), f = x - i;
    const h = (n) => {
      const s = Math.sin((n + seed * 131.7) * 127.1) * 43758.5453;
      return s - Math.floor(s);
    };
    const u = f * f * (3 - 2 * f);
    return h(i) * (1 - u) + h(i + 1) * u;
  }

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.cam = { x: 0, y: 1, s: 80 };
      this.camTarget = { x: 0, y: 1, s: 80 };
      this.particles = [];
      this.floaters = [];
      this.theme = THEMES.morning;
      this.time = 0;
      this.shake = 0;
      // 動きを減らす設定の人には画面の揺れを出さない
      this.calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      this.resize();
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = this.canvas.getBoundingClientRect();
      this.W = Math.max(320, r.width);
      this.H = Math.max(240, r.height);
      this.dpr = dpr;
      this.canvas.width = Math.round(this.W * dpr);
      this.canvas.height = Math.round(this.H * dpr);
    }

    setTheme(name) {
      this.theme = THEMES[name] || THEMES.morning;
    }

    snapCamera() {
      Object.assign(this.cam, this.camTarget);
    }

    toScreen(x, y) {
      const c = this.cam;
      return { x: this.W / 2 + (x - c.x) * c.s, y: this.H / 2 - (y - c.y) * c.s };
    }
    toWorld(sx, sy) {
      const c = this.cam;
      return { x: c.x + (sx - this.W / 2) / c.s, y: c.y - (sy - this.H / 2) / c.s };
    }

    worldTransform() {
      const c = this.cam, d = this.dpr;
      let ox = 0, oy = 0;
      if (this.shake > 0 && !this.calm) {
        ox = (Math.random() - 0.5) * this.shake * 10;
        oy = (Math.random() - 0.5) * this.shake * 10;
      }
      this.ctx.setTransform(d * c.s, 0, 0, d * c.s, d * (this.W / 2 - c.x * c.s + ox), d * (this.H / 2 + c.y * c.s + oy));
    }

    // ------------------------------------------------------------------
    // エフェクト
    // ------------------------------------------------------------------
    addFloater(x, y, text, opt = {}) {
      this.floaters.push({ x, y, text, t: 0, life: opt.life || 1.3, color: opt.color || '#fff', stroke: opt.stroke || C.ink, size: opt.size || 0.22, font: opt.font || KT.FONT_DISPLAY, rot: opt.rot ?? (Math.random() - 0.5) * 0.3, vy: opt.vy ?? 0.9, pop: opt.pop ?? true });
    }

    burst(x, y, colors, n, opt = {}) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (opt.speed || 3) * (0.4 + Math.random() * 0.8);
        this.particles.push({
          x, y,
          vx: Math.cos(a) * sp + (opt.vx || 0),
          vy: Math.sin(a) * sp * 0.8 + (opt.up ?? 1.5),
          r: (opt.size || 0.04) * (0.5 + Math.random()),
          rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14,
          color: colors[i % colors.length],
          t: 0, life: (opt.life || 1.0) * (0.6 + Math.random() * 0.6),
          kind: opt.kind || 'shard', g: opt.g ?? 9.8,
        });
      }
      if (this.particles.length > 420) this.particles.splice(0, this.particles.length - 420);
    }

    dust(x, y, n = 6) {
      for (let i = 0; i < n; i++) {
        this.particles.push({ x: x + (Math.random() - 0.5) * 0.4, y: y + 0.05, vx: (Math.random() - 0.7) * 1.2, vy: Math.random() * 0.6 + 0.2, r: 0.05 + Math.random() * 0.07, rot: 0, vr: 0, color: 'rgba(170,150,120,0.38)', t: 0, life: 0.6 + Math.random() * 0.4, kind: 'dust', g: -0.3 });
      }
    }

    updateFx(dt) {
      this.time += dt;
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.2);
      for (const p of this.particles) {
        p.t += dt;
        p.vy -= p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.kind === 'dust') p.r += dt * 0.25;
      }
      this.particles = this.particles.filter((p) => p.t < p.life);
      for (const f of this.floaters) {
        f.t += dt;
        f.y += f.vy * dt * (1 - f.t / f.life);
      }
      this.floaters = this.floaters.filter((f) => f.t < f.life);
    }

    // ------------------------------------------------------------------
    // 描画本体
    // ------------------------------------------------------------------
    render(sim, view) {
      const ctx = this.ctx;
      const c = this.cam, t = this.camTarget;
      const k = view.snap ? 1 : Math.min(1, (view.dt || 0.016) * (view.camRate || 5));
      c.x += (t.x - c.x) * k;
      c.y += (t.y - c.y) * k;
      c.s += (t.s - c.s) * k;

      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.drawSky(ctx);
      this.drawFar(ctx);
      this.drawMid(ctx, sim);

      this.worldTransform();
      const P = 1 / c.s;
      const x0 = c.x - this.W / 2 / c.s - 2, x1 = c.x + this.W / 2 / c.s + 2;
      this.drawDecorBack(ctx, sim, x0, x1, P, view);
      this.drawGround(ctx, sim, x0, x1, P);

      // 道に落ちた荷物（軽トラの奥）
      for (const it of sim.items) if (it.state === 'fallen') this.drawItem(ctx, it, P, view);

      const tr = sim.truck;
      const lights = this.theme.night > 0;
      const braking = (sim.input.brake && tr.forwardSpeed() > 0.3) || sim.phase === 'arrive';
      this.withBody(ctx, tr.chassis, () => tr.drawBack(ctx, P, { lightsOn: lights, braking }));
      for (const it of sim.items) if (it.state === 'placed') this.drawItem(ctx, it, P, view);
      if (view.held) this.drawHeld(ctx, view.held, P, sim);
      this.withBody(ctx, tr.chassis, () => {
        tr.drawFront(ctx, P, { gateAlpha: view.mode === 'load' ? 0.42 : 0.7 });
        if (view.mode === 'load') {
          const used = sim.usedHooks();
          tr.drawHooks(ctx, P, view.hoverHook, used);
        }
      });
      for (const w of tr.wheels) {
        const p = w.getPosition();
        ctx.save();
        ctx.translate(p.x, -p.y);
        tr.drawWheel(ctx, P, w.getAngle());
        ctx.restore();
      }
      if (lights) this.drawHeadlight(ctx, tr, P);
      this.drawRopes(ctx, sim, P, view);
      if (view.ropeDrag) this.drawRopeDrag(ctx, view.ropeDrag, P);
      if (view.mode === 'load') this.drawWarnings(ctx, sim, P);
      this.drawDecorFront(ctx, sim, x0, x1, P);
      this.drawParticles(ctx, P);
      this.drawFloaters(ctx, P);
      if (view.bubble) this.drawBubble(ctx, sim, view.bubble, P);
      if (view.slow > 0) this.drawSlowVignette(ctx, view.slow);
    }

    /** 運転手のふきだし（車体が傾いても水平に出す） */
    drawBubble(ctx, sim, b, P) {
      const head = sim.truck.toWorld(1.0, 1.45);
      const size = Math.max(0.17, 15 * P);
      ctx.save();
      ctx.font = '700 40px ' + KT.FONT_UI;
      const tw = ctx.measureText(b.text).width * (size / 40);
      ctx.restore();
      const bw = tw + size * 1.3, bh = size * 1.9;
      const lift = 0.62 + bh / 2;
      const cx = head.x + 0.4, cy = head.y + lift; // ワールド座標（y 上向き）
      const pop = b.age < 0.18 ? KT.easeOutBack(b.age / 0.18) : 1;
      const u = b.age / b.life;
      ctx.save();
      ctx.globalAlpha = u > 0.82 ? Math.max(0, (1 - u) / 0.18) : 1;
      ctx.translate(cx, -cy);
      ctx.scale(pop, pop);
      // しっぽ（頭のほうへ）
      const hx = head.x - cx, hy = lift; // ふきだし中心から見た頭の位置（y 下向き）
      const bx = -bw * 0.18, by = bh / 2 - 0.01;
      const tx = bx + (hx - bx) * 0.55, ty = by + (hy - by) * 0.55;
      const tail = (inset) => {
        ctx.beginPath();
        ctx.moveTo(bx - size * 0.38 + inset, by);
        ctx.lineTo(tx, ty - inset * 1.5);
        ctx.lineTo(bx + size * 0.18 - inset, by);
        ctx.closePath();
      };
      tail(0);
      G.fs(ctx, '#ffffff', P, 2.4);
      G.rr(ctx, -bw / 2, -bh / 2, bw, bh, bh * 0.45);
      G.fs(ctx, '#ffffff', P, 2.4);
      tail(2.6 * P);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      G.text(ctx, b.text, 0, 0.004, size, { color: C.ink });
      ctx.restore();
    }

    /** スローモーション中の周辺減光と黒帯 */
    drawSlowVignette(ctx, k) {
      const W = this.W, H = this.H;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.72);
      g.addColorStop(0, 'rgba(12,16,30,0)');
      g.addColorStop(1, 'rgba(12,16,30,' + (0.5 * k).toFixed(3) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const bar = Math.round(H * 0.055 * k);
      ctx.fillStyle = 'rgba(14,18,28,0.88)';
      ctx.fillRect(0, 0, W, bar);
      ctx.fillRect(0, H - bar, W, bar);
    }

    withBody(ctx, body, fn, skip) {
      if (skip) return;
      const p = body.getPosition();
      ctx.save();
      ctx.translate(p.x, -p.y);
      ctx.rotate(-body.getAngle());
      fn();
      ctx.restore();
    }

    drawItem(ctx, it, P, view) {
      const b = it.body;
      const p = b.getPosition();
      ctx.save();
      ctx.translate(p.x, -p.y);
      ctx.rotate(-b.getAngle());
      this.paintItem(ctx, it, P, view);
      ctx.restore();
    }

    /** ローカル座標に移ったあとで荷物を描く（荷札のアイコンでも使う） */
    paintItem(ctx, it, P, view = {}) {
      const def = it.def;
      const dmg = 1 - it.hp / 100;
      if (it.state === 'fallen') ctx.globalAlpha = 0.9;
      def.draw.call(def, ctx, P, { dmg, broken: it.broken, uid: it.uid, t: this.time });
      if (dmg > 0.04) {
        ctx.save();
        KT.itemShapePath(ctx, def);
        ctx.clip();
        if (it.broken) {
          ctx.fillStyle = 'rgba(40,30,30,0.32)';
          ctx.fillRect(-def.w, -def.h, def.w * 2, def.h * 2);
        }
        G.cracks(ctx, def.w, def.h, it.broken ? 1 : dmg, it.uid, P);
        ctx.restore();
      }
      if (it.flash > 0) {
        ctx.save();
        KT.itemShapePath(ctx, def, 0.01);
        ctx.fillStyle = 'rgba(255,70,50,' + (0.45 * it.flash).toFixed(3) + ')';
        ctx.fill();
        ctx.restore();
      }
      if (it.broken) this.brokenTag(ctx, def, P);
      if (view.hoverUid === it.uid) {
        KT.itemShapePath(ctx, def, 0.02);
        ctx.lineWidth = 3 * P;
        ctx.strokeStyle = '#ffe14d';
        ctx.stroke();
      }
      if (it.state === 'fallen') ctx.globalAlpha = 1;
    }

    brokenTag(ctx, def, P) {
      const s = Math.min(0.12, def.h * 0.35);
      ctx.save();
      ctx.rotate(-0.25);
      G.rr(ctx, -s * 1.1, -s * 0.45, s * 2.2, s * 0.9, s * 0.15);
      G.fs(ctx, 'rgba(255,255,255,0.92)', P, 2, C.shu);
      G.text(ctx, '破損', 0, 0.002, s * 0.62, { color: C.shu, font: KT.FONT_DISPLAY, weight: '400' });
      ctx.restore();
    }

    drawHeld(ctx, held, P, sim) {
      const def = held.inst.def;
      // 落下点のガイド
      const gy = KT.groundY(sim.course, held.x);
      ctx.save();
      ctx.setLineDash([6 * P, 6 * P]);
      G.line(ctx, held.x, -held.y, held.x, -gy, P, 1.5, 'rgba(29,39,56,0.45)');
      ctx.setLineDash([]);
      ctx.translate(held.x, -held.y);
      ctx.rotate(-held.angle);
      ctx.globalAlpha = 0.88;
      this.paintItem(ctx, held.inst, P);
      ctx.globalAlpha = 1;
      KT.itemShapePath(ctx, def, 0.015);
      ctx.lineWidth = 3 * P;
      ctx.setLineDash(held.lifted ? [8 * P, 5 * P] : []);
      ctx.strokeStyle = held.lifted ? '#e8a13a' : '#3fbf7a';
      ctx.stroke();
      ctx.restore();
    }

    drawWarnings(ctx, sim, P) {
      const t = this.time;
      for (const it of sim.items) {
        if (it.state !== 'placed') continue;
        if (!it.warn && it.cushioned > 0 && it.def.tags.includes('fragile')) {
          // 布団に触れていて守られているワレモノ（荷物の上に小さな札を出す）
          const p = it.body.getPosition();
          const a = it.body.getAngle();
          const hh = Math.abs((it.def.w / 2) * Math.sin(a)) + Math.abs((it.def.h / 2) * Math.cos(a));
          ctx.save();
          ctx.translate(p.x, -(p.y + hh + 0.06));
          G.rr(ctx, -0.14, -0.048, 0.28, 0.096, 0.048);
          G.fs(ctx, 'rgba(223,242,227,0.96)', P, 1.5, '#1d6b3c');
          G.text(ctx, '布団で保護', 0, 0.001, 0.052, { color: '#1d6b3c' });
          ctx.restore();
          continue;
        }
        if (!it.warn) continue;
        const p = it.body.getPosition();
        const top = p.y + Math.max(it.def.w, it.def.h) * 0.5 + 0.12;
        const label = it.warn === 'crush' ? '潰れそう' : it.warn === 'tilt' ? '横倒し厳禁' : '逆さま';
        const bob = Math.sin(t * 6) * 0.015;
        ctx.save();
        ctx.translate(p.x, -top + bob);
        const w = 0.09 * label.length + 0.1;
        G.rr(ctx, -w / 2, -0.075, w, 0.15, 0.04);
        G.fs(ctx, it.warn === 'crush' ? C.shu : C.plate, P, 2);
        G.text(ctx, label, 0, 0.002, 0.085, { color: it.warn === 'crush' ? '#fff' : C.ink });
        ctx.beginPath();
        ctx.moveTo(-0.03, 0.074);
        ctx.lineTo(0.03, 0.074);
        ctx.lineTo(0, 0.12);
        ctx.closePath();
        ctx.fillStyle = it.warn === 'crush' ? C.shu : C.plate;
        ctx.fill();
        ctx.restore();
        if (it.warn === 'crush') {
          ctx.save();
          const b = it.body;
          ctx.translate(p.x, -p.y);
          ctx.rotate(-b.getAngle());
          KT.itemShapePath(ctx, it.def, 0.012);
          ctx.lineWidth = 3 * P;
          ctx.strokeStyle = 'rgba(200,50,60,' + (0.55 + 0.45 * Math.sin(t * 8)).toFixed(2) + ')';
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    drawRopes(ctx, sim, P, view) {
      for (const r of sim.ropes) {
        const pts = sim.ropePath(r);
        const stress = KT.clamp(r.tension / KT.CONST.ROPE_STRENGTH, 0, 1);
        // 区間ごとに、ゆるんでいれば少したるませる
        const path = () => {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, -pts[0].y);
          for (let k = 1; k < pts.length; k++) {
            const a = pts[k - 1], b = pts[k];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            const slack = Math.max(0, r.segs[k - 1].maxLength - d);
            const sag = Math.min(0.25, slack * 0.8);
            ctx.quadraticCurveTo((a.x + b.x) / 2, -((a.y + b.y) / 2 - sag), b.x, -b.y);
          }
        };
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (view.hoverRope === r.id) {
          path();
          ctx.lineWidth = 10 * P;
          ctx.strokeStyle = 'rgba(255,225,77,0.6)';
          ctx.stroke();
        }
        path();
        ctx.lineWidth = 5 * P;
        ctx.strokeStyle = C.ink;
        ctx.stroke();
        ctx.lineWidth = 3.2 * P;
        ctx.strokeStyle = stress > 0.7 ? '#ff8a7a' : '#f4f1e8';
        ctx.stroke();
        ctx.setLineDash([5 * P, 5 * P]);
        ctx.strokeStyle = stress > 0.7 ? C.shu : '#2f6fd6';
        ctx.stroke();
        ctx.setLineDash([]);
        // 荷物に掛かっているところ（結び目）
        G.circle(ctx, pts[1].x, -pts[1].y, 0.03);
        G.fs(ctx, '#2f6fd6', P, 1.5);
        ctx.restore();
      }
    }

    drawRopeDrag(ctx, rd, P) {
      ctx.save();
      ctx.setLineDash([7 * P, 5 * P]);
      G.line(ctx, rd.ax, -rd.ay, rd.bx, -rd.by, P, 3, rd.ok ? '#2f6fd6' : 'rgba(29,39,56,0.5)');
      ctx.restore();
    }

    drawHeadlight(ctx, tr, P) {
      const p = tr.toWorld(1.74, 0.84);
      const a = tr.angle;
      ctx.save();
      ctx.translate(p.x, -p.y);
      ctx.rotate(-a);
      const g = ctx.createLinearGradient(0, 0, 6, 0);
      g.addColorStop(0, 'rgba(255,240,180,0.45)');
      g.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -0.05);
      ctx.lineTo(6, -0.6);
      ctx.lineTo(6, 0.9);
      ctx.lineTo(0, 0.08);
      ctx.fill();
      ctx.restore();
    }

    drawParticles(ctx, P) {
      for (const p of this.particles) {
        const a = 1 - p.t / p.life;
        ctx.save();
        ctx.globalAlpha = KT.clamp(a * 1.4, 0, 1);
        ctx.translate(p.x, -p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.kind === 'dust') {
          G.circle(ctx, 0, 0, p.r);
          ctx.fill();
        } else if (p.kind === 'star') {
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const rr = i % 2 ? p.r * 0.45 : p.r;
            const an = (i / 10) * Math.PI * 2;
            ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(-p.r, -p.r * 0.5);
          ctx.lineTo(p.r * 0.8, -p.r * 0.7);
          ctx.lineTo(p.r * 0.4, p.r * 0.8);
          ctx.closePath();
          ctx.fill();
          ctx.lineWidth = 1 * P;
          ctx.strokeStyle = 'rgba(29,39,56,0.6)';
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    drawFloaters(ctx, P) {
      for (const f of this.floaters) {
        const u = f.t / f.life;
        const pop = f.pop ? (u < 0.15 ? KT.easeOutBack(u / 0.15) : 1) : 1;
        const alpha = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(f.x, -f.y);
        ctx.rotate(f.rot);
        ctx.scale(pop, pop);
        // 画面上で小さくなりすぎないよう、ピクセル基準で下限を設ける
        const size = Math.max(f.size, 15 * P);
        G.text(ctx, f.text, 0, 0, size, { color: f.color, stroke: f.stroke, strokeW: 9, font: f.font, weight: f.font === KT.FONT_DISPLAY ? '400' : '700' });
        ctx.restore();
      }
    }

    // ------------------------------------------------------------------
    // 背景
    // ------------------------------------------------------------------
    drawSky(ctx) {
      const th = this.theme, W = this.W, H = this.H;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, th.sky[0]);
      g.addColorStop(0.55, th.sky[1]);
      g.addColorStop(1, th.sky[2]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // 太陽
      const sx = W * 0.78 - (this.cam.x * 0.02) % 60, sy = H * th.sunY;
      const rg = ctx.createRadialGradient(sx, sy, 4, sx, sy, Math.min(W, H) * 0.25);
      rg.addColorStop(0, th.sun);
      rg.addColorStop(0.2, th.sun);
      rg.addColorStop(0.21, 'rgba(255,240,200,0.35)');
      rg.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.min(W, H) * 0.25, 0, Math.PI * 2);
      ctx.fill();
      // 雲
      ctx.fillStyle = th.cloud;
      const off = this.cam.x * 6 + this.time * 4;
      for (let i = 0; i < 6; i++) {
        const span = W + 400;
        const cx = ((i * 337 - off * (0.5 + (i % 3) * 0.2)) % span + span) % span - 200;
        const cy = H * (0.1 + (i % 3) * 0.08);
        const s = 0.7 + (i % 2) * 0.5;
        for (const [ex, ey, rx, ry] of [[0, 0, 60, 18], [34, -10, 36, 20], [-30, -6, 30, 15]]) {
          ctx.beginPath();
          ctx.ellipse(cx + ex * s, cy + ey * s, rx * s, ry * s, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    drawFar(ctx) {
      const th = this.theme, W = this.W, H = this.H, c = this.cam;
      const par = 0.08;
      const base = H * 0.62 + (c.y * c.s) * 0.1;
      ctx.fillStyle = th.farTop;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let sx = 0; sx <= W + 8; sx += 8) {
        const wx = (sx + c.x * c.s * par) / 140;
        const h = noise1(wx, 3) * 0.6 + noise1(wx * 2.3, 9) * 0.3 + noise1(wx * 5, 4) * 0.1;
        ctx.lineTo(sx, base - h * H * 0.3 - 30);
      }
      ctx.lineTo(W, H);
      ctx.fill();
      ctx.fillStyle = th.far;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let sx = 0; sx <= W + 8; sx += 8) {
        const wx = (sx + c.x * c.s * par * 1.6) / 110;
        const h = noise1(wx, 17) * 0.6 + noise1(wx * 2.7, 2) * 0.3 + noise1(wx * 6, 5) * 0.1;
        ctx.lineTo(sx, base - h * H * 0.22 + 10);
      }
      ctx.lineTo(W, H);
      ctx.fill();
    }

    drawMid(ctx, sim) {
      // 町並みのシルエット（視差 0.35）
      const th = this.theme, W = this.W, H = this.H, c = this.cam;
      const par = 0.35;
      const s = Math.min(c.s * 0.55, 46);
      const camX = c.x * par;
      const baseY = H * 0.62 + (c.y * c.s) * 0.12;
      const seg = 7; // 1区画のワールド幅
      const first = Math.floor((camX - W / 2 / s) / seg) - 1;
      const last = Math.floor((camX + W / 2 / s) / seg) + 1;
      ctx.fillStyle = th.mid;
      ctx.fillRect(0, baseY, W, H - baseY);
      const stage = sim.stage.id;
      for (let i = first; i <= last; i++) {
        const rnd = KT.rng(i * 7349 + stage * 101);
        const sx = W / 2 + (i * seg - camX) * s;
        const kind = rnd();
        if (stage === 3 && kind < 0.55) {
          // 山あい：木立と田んぼ
          for (let k = 0; k < 3; k++) {
            const tx = sx + (k * 2.2 + rnd()) * s;
            const th2 = (1.6 + rnd() * 1.6) * s;
            ctx.fillStyle = k % 2 ? th.grassD : th.grass;
            ctx.beginPath();
            ctx.moveTo(tx - 0.8 * s, baseY);
            ctx.lineTo(tx, baseY - th2);
            ctx.lineTo(tx + 0.8 * s, baseY);
            ctx.fill();
          }
          continue;
        }
        if (kind < 0.18) continue;
        const w = (3 + rnd() * 2.5) * s;
        const h = (2 + rnd() * (kind > 0.85 ? 5 : 2)) * s;
        const col = th.house[Math.floor(rnd() * th.house.length)];
        const roofCol = th.roof[Math.floor(rnd() * th.roof.length)];
        ctx.fillStyle = col;
        ctx.fillRect(sx, baseY - h, w, h);
        if (kind > 0.85) {
          // 団地
          ctx.fillStyle = th.window;
          for (let fy = 0.5; fy < h / s - 0.5; fy += 1.1) for (let fx = 0.4; fx < w / s - 0.5; fx += 0.9) ctx.fillRect(sx + fx * s, baseY - h + fy * s, 0.45 * s, 0.4 * s);
        } else {
          ctx.fillStyle = roofCol;
          ctx.beginPath();
          ctx.moveTo(sx - 0.3 * s, baseY - h);
          ctx.lineTo(sx + w / 2, baseY - h - 1.1 * s);
          ctx.lineTo(sx + w + 0.3 * s, baseY - h);
          ctx.fill();
          ctx.fillStyle = th.window;
          ctx.fillRect(sx + w * 0.2, baseY - h * 0.65, w * 0.22, h * 0.25);
          ctx.fillRect(sx + w * 0.6, baseY - h * 0.65, w * 0.22, h * 0.25);
        }
      }
      if (th.night > 0) {
        ctx.fillStyle = 'rgba(40,30,70,' + th.night * 0.35 + ')';
        ctx.fillRect(0, 0, W, H);
      }
    }

    // ------------------------------------------------------------------
    // 地形
    // ------------------------------------------------------------------
    drawGround(ctx, sim, x0, x1, P) {
      const th = this.theme;
      const pts = sim.course.points;
      let i0 = 0;
      while (i0 < pts.length - 1 && pts[i0 + 1][0] < x0) i0++;
      let i1 = i0;
      while (i1 < pts.length - 1 && pts[i1][0] < x1) i1++;
      const bottom = -(this.cam.y - this.H / this.cam.s) - 0;
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(pts[i0][0], -pts[i0][1]);
        for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(pts[i][0], -pts[i][1]);
      };
      // 土
      path();
      ctx.lineTo(pts[i1][0], bottom + 20);
      ctx.lineTo(pts[i0][0], bottom + 20);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, -this.cam.y, 0, -this.cam.y + 6);
      g.addColorStop(0, th.soil);
      g.addColorStop(1, th.soilD);
      ctx.fillStyle = g;
      ctx.fill();
      // 地層の線
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(0,0,0,0.07)';
      ctx.lineWidth = 0.06;
      for (let d = 0.8; d < 6; d += 0.9) {
        ctx.beginPath();
        for (let i = i0; i <= i1; i++) {
          const yy = -pts[i][1] + d + Math.sin(pts[i][0] * 0.7 + d) * 0.08;
          if (i === i0) ctx.moveTo(pts[i][0], yy);
          else ctx.lineTo(pts[i][0], yy);
        }
        ctx.stroke();
      }
      // 舗装（地表から下に帯）
      path();
      ctx.lineWidth = 0.34;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#555b63';
      ctx.stroke();
      path();
      ctx.lineWidth = 0.1;
      ctx.strokeStyle = '#6b727b';
      ctx.stroke();
      // 砂利道・橋などの区間の色
      for (const f of sim.course.features) {
        if (f.type === 'gravel' && f.x < x1 && f.x + f.len > x0) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(f.x, -50, f.len, 100);
          ctx.clip();
          path();
          ctx.lineWidth = 0.4;
          ctx.strokeStyle = '#9a8a72';
          ctx.stroke();
          const rnd = KT.rng(Math.floor(f.x));
          for (let gx = f.x; gx < f.x + f.len; gx += 0.07) {
            const gy = KT.groundY(sim.course, gx);
            ctx.fillStyle = rnd() > 0.5 ? '#c9bba3' : '#7c6e5b';
            ctx.fillRect(gx, -gy + rnd() * 0.12, 0.035, 0.03);
          }
          ctx.restore();
        }
      }
      ctx.restore();
      // 路面のふち
      path();
      ctx.lineWidth = 2 * P;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      // 鉄板と踏切は上から描く
      for (const f of sim.course.features) {
        if (f.type === 'plate' && f.x < x1 && f.x + f.len > x0) {
          const gy = KT.groundY(sim.course, f.x - 0.1);
          G.rr(ctx, f.x, -(gy + f.h), f.len, f.h, 0.01);
          G.fs(ctx, '#7e858c', P, 1.6);
          for (let k = 0.3; k < f.len; k += 0.5) G.line(ctx, f.x + k, -(gy + f.h) + 0.012, f.x + k + 0.2, -(gy + f.h) + 0.012, P, 1, 'rgba(255,255,255,0.35)');
        }
        if (f.type === 'rail' && f.x < x1 && f.x1 > x0) {
          const gy = KT.groundY(sim.course, f.x - 0.1);
          ctx.fillStyle = '#6a5a4a';
          ctx.fillRect(f.x + 0.6, -(gy + 0.05), f.x1 - f.x - 1.2, 0.05);
        }
        if (f.type === 'bridge' && f.x < x1 && f.x + f.len > x0) this.drawBridge(ctx, sim, f, P);
      }
    }

    drawBridge(ctx, sim, f, P) {
      const gy = KT.groundY(sim.course, f.x + 1);
      // 川
      ctx.save();
      ctx.beginPath();
      ctx.rect(f.x + 1.2, -(gy - 0.22), f.len - 2.4, 4);
      ctx.clip();
      const g = ctx.createLinearGradient(0, -(gy - 0.2), 0, -(gy - 3));
      g.addColorStop(0, '#5d4a3a');
      g.addColorStop(0.35, '#5b8db0');
      g.addColorStop(1, '#3f6e93');
      ctx.fillStyle = g;
      ctx.fillRect(f.x, -(gy - 0.2), f.len, 4);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2 * P;
      for (let k = 0; k < f.len; k += 1.3) {
        const wy = -(gy - 1.4) + Math.sin(k + this.time * 2) * 0.05;
        G.line(ctx, f.x + k, wy, f.x + k + 0.5, wy, P, 2, 'rgba(255,255,255,0.45)');
      }
      ctx.restore();
      // 橋げた
      for (let k = 1.2; k < f.len - 1; k += 6) {
        ctx.fillStyle = '#6b4a31';
        ctx.fillRect(f.x + k, -(gy - 0.2), 0.2, 3);
      }
      // 板と欄干
      ctx.fillStyle = '#9b6b42';
      ctx.fillRect(f.x, -gy, f.len, 0.2);
      for (let k = 0; k < f.len; k += 1.6) G.line(ctx, f.x + k, -gy, f.x + k, -gy + 0.2, P, 1.2, '#5a3b22');
      G.line(ctx, f.x, -(gy + 0.9), f.x + f.len, -(gy + 0.9), P, 3, '#7a5233');
      for (let k = 0; k <= f.len; k += 2) G.line(ctx, f.x + k, -gy, f.x + k, -(gy + 0.95), P, 3, '#7a5233');
    }

    // ------------------------------------------------------------------
    // 沿道の飾り
    // ------------------------------------------------------------------
    drawDecorBack(ctx, sim, x0, x1, P, view) {
      const course = sim.course;
      const th = this.theme;
      // 電柱と電線（25m おき）
      const poleStep = 24;
      const firstPole = Math.floor(x0 / poleStep) - 1;
      const lastPole = Math.ceil(x1 / poleStep) + 1;
      let prev = null;
      for (let i = firstPole; i <= lastPole; i++) {
        const px = i * poleStep + 5;
        const gy = KT.groundY(course, px);
        const top = gy + 7.2;
        if (prev) {
          ctx.strokeStyle = 'rgba(30,35,45,0.75)';
          ctx.lineWidth = 1.2 * P;
          for (const dy of [0, 0.35, 0.7]) {
            ctx.beginPath();
            ctx.moveTo(prev.x, -(prev.top - dy - 0.4));
            ctx.quadraticCurveTo((prev.x + px) / 2, -((prev.top + top) / 2 - dy - 1.2), px, -(top - dy - 0.4));
            ctx.stroke();
          }
        }
        if (px > x0 - 1 && px < x1 + 1) {
          ctx.fillStyle = '#8f9499';
          ctx.fillRect(px - 0.1, -top, 0.2, top - gy + 0.1);
          ctx.fillStyle = '#6d7277';
          ctx.fillRect(px - 0.7, -(top - 0.35), 1.4, 0.1);
          G.rr(ctx, px + 0.12, -(top - 1.1), 0.36, 0.5, 0.06);
          G.fs(ctx, '#7b8187', P, 1);
          // 電柱の住所札
          ctx.fillStyle = '#1e5aa8';
          ctx.fillRect(px - 0.09, -(gy + 2.2), 0.18, 0.5);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px - 0.06, -(gy + 2.15), 0.12, 0.4);
        }
        prev = { x: px, top };
      }

      // 旧居（スタート）
      const sx = course.truckX - 11.6;
      if (sx + 6 > x0 && sx - 1 < x1) this.drawHouse(ctx, sx, KT.groundY(course, sx), P, { label: '旧居', name: sim.stage.from, color: th.house[1], roof: th.roof[0] });
      // 新居（ゴール）
      const gx = course.goalX;
      if (gx + 14 > x0 && gx - 4 < x1) this.drawGoal(ctx, sim, gx, P);

      // コースの特徴に合わせた看板など
      for (const f of course.features) {
        const fx = f.x;
        if (fx < x0 - 14 || fx > x1 + 14) continue;
        if (['stepUp', 'stepDown', 'stairs'].includes(f.type)) this.drawSign(ctx, course, fx - 9, Math.abs(f.h || 0) >= 0.12 ? '大きな段差' : '段差あり', 'step', P);
        else if (f.type === 'bump') this.drawSign(ctx, course, fx - 8, 'でこぼこ', 'bump', P);
        else if (f.type === 'pothole') this.drawSign(ctx, course, fx - 8, '穴あり', 'bump', P);
        else if (f.type === 'rail') this.drawCrossing(ctx, course, f, P);
        else if (f.type === 'plate') this.drawWorks(ctx, course, f, P);
        else if (f.type === 'slopeUp' && f.rise / f.len > 0.1) this.drawSign(ctx, course, fx - 6, '急な上り', 'up', P);
        else if (f.type === 'slopeDown' && -f.rise / f.len > 0.1) this.drawSign(ctx, course, fx - 6, '急な下り', 'down', P);
        else if (f.type === 'gravel') this.drawSign(ctx, course, fx - 6, '砂利道', 'bump', P);
      }

      // 生け垣・ブロック塀・自販機（決まった位置に）
      const step = 9;
      for (let i = Math.floor(x0 / step); i <= Math.ceil(x1 / step); i++) {
        const rnd = KT.rng(i * 911 + sim.stage.id * 37);
        const bx = i * step + rnd() * 3;
        if (bx < course.truckX + 4 || bx > course.goalX - 6) continue;
        if (this.nearFeature(course, bx, 4)) continue;
        const gy = KT.groundY(course, bx);
        const r = rnd();
        if (r < 0.32) {
          // 生け垣
          ctx.fillStyle = th.grassD;
          G.rr(ctx, bx, -(gy + 0.9), 3.2, 0.9, 0.35);
          ctx.fill();
          ctx.fillStyle = th.grass;
          for (let k = 0; k < 5; k++) {
            G.circle(ctx, bx + 0.3 + k * 0.65, -(gy + 0.82), 0.28);
            ctx.fill();
          }
        } else if (r < 0.55 && sim.stage.id !== 3) {
          // ブロック塀
          ctx.fillStyle = '#c9c6bd';
          ctx.fillRect(bx, -(gy + 1.1), 3.4, 1.1);
          ctx.strokeStyle = 'rgba(0,0,0,0.12)';
          ctx.lineWidth = 1 * P;
          for (let yy = 0.27; yy < 1.1; yy += 0.27) G.line(ctx, bx, -(gy + yy), bx + 3.4, -(gy + yy), P, 1, 'rgba(0,0,0,0.12)');
        } else if (r < 0.62) {
          this.drawVending(ctx, bx, gy, P);
        } else if (r < 0.75) {
          // 木
          ctx.fillStyle = '#6b4a31';
          ctx.fillRect(bx + 0.4, -(gy + 1.8), 0.18, 1.8);
          ctx.fillStyle = th.grassD;
          G.circle(ctx, bx + 0.5, -(gy + 2.3), 0.9);
          ctx.fill();
          ctx.fillStyle = th.grass;
          G.circle(ctx, bx + 0.2, -(gy + 2.5), 0.6);
          ctx.fill();
        }
      }
    }

    nearFeature(course, x, d) {
      for (const f of course.features) {
        if (['rail', 'plate', 'goal'].includes(f.type) && Math.abs(f.x - x) < d + 3) return true;
        if (['stepUp', 'stepDown', 'stairs', 'bump', 'pothole', 'gravel', 'slopeUp', 'slopeDown'].includes(f.type) && x > f.x - 11 && x < f.x - 4) return true;
      }
      return false;
    }

    drawHouse(ctx, x, gy, P, o) {
      const w = 6.4, h = 3.4;
      ctx.save();
      ctx.translate(x, -gy);
      G.rr(ctx, 0, -h, w, h, 0.05);
      G.fs(ctx, o.color, P, 2);
      // 瓦屋根
      ctx.beginPath();
      ctx.moveTo(-0.5, -h);
      ctx.lineTo(w / 2, -h - 1.7);
      ctx.lineTo(w + 0.5, -h);
      ctx.closePath();
      G.fs(ctx, o.roof, P, 2);
      ctx.save();
      ctx.clip();
      for (let k = 1; k < 6; k++) G.line(ctx, -0.5, -h - k * 0.27, w + 0.5, -h - k * 0.27, P, 1, 'rgba(0,0,0,0.2)');
      ctx.restore();
      // 玄関と窓
      G.rr(ctx, w * 0.62, -2.1, 1.1, 2.1, 0.03);
      G.fs(ctx, '#9b6b42', P, 1.6);
      G.rr(ctx, 0.6, -2.4, 1.6, 1.0, 0.03);
      G.fs(ctx, this.theme.window, P, 1.6);
      G.line(ctx, 1.4, -2.4, 1.4, -1.4, P, 1.4);
      // 表札
      G.rr(ctx, w * 0.62 - 0.75, -1.75, 0.55, 0.32, 0.03);
      G.fs(ctx, '#f6f1e3', P, 1.2);
      G.text(ctx, o.label, w * 0.62 - 0.475, -1.59, 0.14, { color: C.ink });
      ctx.restore();
    }

    drawGoal(ctx, sim, gx, P) {
      const course = sim.course;
      const gy = KT.groundY(course, gx);
      // 新居のアパート
      const ax = gx + 5;
      const ay = KT.groundY(course, ax);
      ctx.save();
      ctx.translate(ax, -ay);
      G.rr(ctx, 0, -6.6, 8, 6.6, 0.05);
      G.fs(ctx, '#efe7d6', P, 2);
      for (let fl = 0; fl < 2; fl++) {
        const yy = -3.3 * (fl + 1);
        ctx.fillStyle = '#9aa3ab';
        ctx.fillRect(-0.2, yy + 2.9, 8.4, 0.12);
        for (let d = 0; d < 3; d++) {
          G.rr(ctx, 0.7 + d * 2.5, yy + 0.8, 1.0, 2.0, 0.03);
          G.fs(ctx, d === 1 && fl === 0 ? '#e7b04a' : '#7d8a99', P, 1.4);
          G.rr(ctx, 1.85 + d * 2.5, yy + 0.9, 0.8, 0.7, 0.03);
          G.fs(ctx, this.theme.window, P, 1.2);
        }
      }
      G.rr(ctx, 1.2, -7.4, 5.6, 0.8, 0.05);
      G.fs(ctx, '#ffffff', P, 2);
      G.text(ctx, sim.stage.to, 4, -7.0, 0.38, { color: C.ink });
      // 依頼人
      const wave = Math.sin(this.time * 6) * 0.35;
      ctx.translate(3.25, 0);
      ctx.fillStyle = '#3d5a80';
      G.rr(ctx, -0.22, -1.25, 0.44, 0.75, 0.12);
      ctx.fill();
      ctx.fillRect(-0.18, -0.55, 0.14, 0.55);
      ctx.fillRect(0.04, -0.55, 0.14, 0.55);
      G.circle(ctx, 0, -1.48, 0.2);
      G.fs(ctx, '#f0c39b', P, 1.4);
      ctx.save();
      ctx.translate(0.2, -1.15);
      ctx.rotate(-2.2 + wave);
      ctx.fillStyle = '#3d5a80';
      ctx.fillRect(0, -0.06, 0.5, 0.12);
      ctx.restore();
      ctx.restore();
      // ゴールのテープとのぼり
      G.line(ctx, gx, -gy, gx, -(gy + 2.4), P, 3, '#ffffff');
      G.line(ctx, gx, -gy, gx, -(gy + 2.4), P, 1.2, C.ink);
      ctx.save();
      ctx.translate(gx + 0.05, -(gy + 2.4));
      const flap = Math.sin(this.time * 4) * 0.05;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(1.3, 0.15 + flap);
      ctx.lineTo(1.25, 0.75 + flap);
      ctx.lineTo(0, 0.7);
      ctx.closePath();
      G.fs(ctx, C.plate, P, 1.6);
      G.text(ctx, '到着', 0.62, 0.4 + flap * 0.5, 0.28, { font: KT.FONT_DISPLAY, weight: '400' });
      ctx.restore();
      // 地面のゴールライン
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = k % 2 ? '#ffffff' : C.ink;
        ctx.fillRect(gx - 0.12, -(gy + 0.02) + k * 0.06, 0.24, 0.06);
      }
    }

    drawSign(ctx, course, x, text, icon, P) {
      const gy = KT.groundY(course, x);
      ctx.save();
      ctx.translate(x, -gy);
      ctx.fillStyle = '#8f969c';
      ctx.fillRect(-0.04, -2.2, 0.08, 2.2);
      // 黄色いひし形
      ctx.save();
      ctx.translate(0, -2.25);
      ctx.rotate(Math.PI / 4);
      G.rr(ctx, -0.32, -0.32, 0.64, 0.64, 0.05);
      G.fs(ctx, '#f6c400', P, 2);
      ctx.restore();
      ctx.translate(0, -2.25);
      ctx.strokeStyle = C.ink;
      ctx.fillStyle = C.ink;
      ctx.lineWidth = 3 * P;
      if (icon === 'step') {
        ctx.beginPath();
        ctx.moveTo(-0.22, 0.12);
        ctx.lineTo(-0.02, 0.12);
        ctx.lineTo(-0.02, -0.06);
        ctx.lineTo(0.22, -0.06);
        ctx.stroke();
      } else if (icon === 'bump') {
        ctx.beginPath();
        ctx.moveTo(-0.24, 0.1);
        ctx.quadraticCurveTo(-0.12, -0.12, 0, 0.1);
        ctx.quadraticCurveTo(0.12, -0.12, 0.24, 0.1);
        ctx.stroke();
      } else if (icon === 'up' || icon === 'down') {
        ctx.beginPath();
        if (icon === 'up') {
          ctx.moveTo(-0.22, 0.14);
          ctx.lineTo(0.22, 0.14);
          ctx.lineTo(0.22, -0.12);
        } else {
          ctx.moveTo(-0.22, -0.12);
          ctx.lineTo(-0.22, 0.14);
          ctx.lineTo(0.22, 0.14);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      // 補助標識
      ctx.save();
      ctx.translate(x, -gy);
      const w = 0.16 * text.length + 0.14;
      G.rr(ctx, -w / 2, -1.62, w, 0.3, 0.03);
      G.fs(ctx, '#ffffff', P, 1.6);
      G.text(ctx, text, 0, -1.47, 0.17, { color: C.ink });
      ctx.restore();
    }

    drawCrossing(ctx, course, f, P) {
      const t = this.time;
      for (const x of [f.x - 0.8, f.x1 + 0.8]) {
        const gy = KT.groundY(course, x);
        ctx.save();
        ctx.translate(x, -gy);
        ctx.fillStyle = '#e9e9e9';
        ctx.fillRect(-0.06, -3.0, 0.12, 3.0);
        for (let k = 0; k < 6; k++) {
          ctx.fillStyle = k % 2 ? '#1d1d1d' : '#f6c400';
          ctx.fillRect(-0.07, -1.0 - k * 0.2, 0.14, 0.2);
        }
        // ×印
        ctx.save();
        ctx.translate(0, -2.75);
        for (const r of [0.6, -0.6]) {
          ctx.save();
          ctx.rotate(r);
          G.rr(ctx, -0.42, -0.07, 0.84, 0.14, 0.02);
          G.fs(ctx, '#f6c400', P, 1.4);
          ctx.restore();
        }
        ctx.restore();
        // 警報灯
        const on = Math.floor(t * 2.5) % 2;
        G.circle(ctx, -0.22, -2.25, 0.1);
        G.fs(ctx, on ? '#ff4636' : '#5a2020', P, 1.4);
        G.circle(ctx, 0.22, -2.25, 0.1);
        G.fs(ctx, on ? '#5a2020' : '#ff4636', P, 1.4);
        ctx.fillStyle = '#e9e9e9';
        ctx.fillRect(-0.3, -2.27, 0.6, 0.04);
        ctx.restore();
      }
      const gy = KT.groundY(course, f.x + 1);
      G.rr(ctx, f.x + 1.2, -(gy + 0.8), 1.2, 0.4, 0.03);
      G.fs(ctx, '#ffffff', P, 1.4);
      G.text(ctx, 'とまれみよ', f.x + 1.8, -(gy + 0.6), 0.15, { color: C.shu });
    }

    drawWorks(ctx, course, f, P) {
      const gy = KT.groundY(course, f.x - 1);
      // コーン
      for (const cx of [f.x - 1.4, f.x + f.len + 1.0]) {
        const cy = KT.groundY(course, cx);
        ctx.save();
        ctx.translate(cx, -cy);
        ctx.beginPath();
        ctx.moveTo(-0.16, 0);
        ctx.lineTo(-0.05, -0.62);
        ctx.lineTo(0.05, -0.62);
        ctx.lineTo(0.16, 0);
        ctx.closePath();
        G.fs(ctx, '#f0732e', P, 1.4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-0.11, -0.4, 0.22, 0.09);
        ctx.fillStyle = '#3b3b3b';
        ctx.fillRect(-0.22, -0.04, 0.44, 0.05);
        ctx.restore();
      }
      // 工事看板
      const bx = f.x - 3.2;
      const by = KT.groundY(course, bx);
      ctx.save();
      ctx.translate(bx, -by);
      ctx.fillStyle = '#8f969c';
      ctx.fillRect(-0.5, -1.4, 0.06, 1.4);
      ctx.fillRect(0.44, -1.4, 0.06, 1.4);
      G.rr(ctx, -0.6, -2.3, 1.2, 0.95, 0.04);
      G.fs(ctx, '#ffffff', P, 2);
      ctx.fillStyle = '#1e5aa8';
      ctx.fillRect(-0.6, -2.3, 1.2, 0.22);
      G.text(ctx, '工事中', 0, -2.19, 0.15, { color: '#fff' });
      G.text(ctx, 'ご迷惑を', 0, -1.92, 0.13, { color: C.ink });
      G.text(ctx, 'おかけします', 0, -1.72, 0.13, { color: C.ink });
      // バリケード
      ctx.restore();
      ctx.save();
      ctx.translate(f.x + f.len / 2, -gy);
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = k % 2 ? '#ffffff' : '#f0732e';
        ctx.fillRect(-1.0 + k * 0.5, -1.25, 0.5, 0.22);
      }
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1.2 * P;
      ctx.strokeRect(-1.0, -1.25, 2.0, 0.22);
      ctx.fillStyle = '#8f969c';
      ctx.fillRect(-0.95, -1.05, 0.06, 1.05);
      ctx.fillRect(0.89, -1.05, 0.06, 1.05);
      ctx.restore();
    }

    drawVending(ctx, x, gy, P) {
      ctx.save();
      ctx.translate(x, -gy);
      G.rr(ctx, 0, -1.85, 1.0, 1.85, 0.05);
      G.fs(ctx, '#d8342b', P, 2);
      G.rr(ctx, 0.1, -1.7, 0.8, 0.75, 0.03);
      G.fs(ctx, '#f4f6f8', P, 1.2);
      const cols = ['#3c7bd6', '#f2b233', '#5cb85c', '#e2574c'];
      for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) {
        G.rr(ctx, 0.15 + k * 0.19, -1.62 + r * 0.36, 0.11, 0.26, 0.03);
        ctx.fillStyle = cols[(k + r) % 4];
        ctx.fill();
      }
      ctx.fillStyle = '#2b2f36';
      ctx.fillRect(0.15, -0.5, 0.7, 0.18);
      ctx.restore();
    }

    drawDecorFront(ctx, sim, x0, x1, P) {
      // 手前の草（視差 1.0、路面の手前に少しだけ）
      const th = this.theme;
      const step = 1.7;
      for (let i = Math.floor(x0 / step); i <= Math.ceil(x1 / step); i++) {
        const rnd = KT.rng(i * 4721 + 5);
        if (rnd() > 0.42) continue;
        const x = i * step + rnd();
        const gy = KT.groundY(sim.course, x);
        ctx.fillStyle = rnd() > 0.5 ? th.grass : th.grassD;
        ctx.beginPath();
        ctx.moveTo(x - 0.18, -gy + 0.16);
        ctx.lineTo(x - 0.1, -gy - 0.12);
        ctx.lineTo(x - 0.02, -gy + 0.1);
        ctx.lineTo(x + 0.05, -gy - 0.18);
        ctx.lineTo(x + 0.1, -gy + 0.1);
        ctx.lineTo(x + 0.2, -gy - 0.08);
        ctx.lineTo(x + 0.22, -gy + 0.16);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  KT.Renderer = Renderer;
})(typeof window !== 'undefined' ? window : globalThis);
