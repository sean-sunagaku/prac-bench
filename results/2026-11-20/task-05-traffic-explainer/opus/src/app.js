/* app.js — 図の描画と操作（engine.js の TrafficEngine を使う） */
(function () {
  'use strict';
  const { Sim, WaveXCorr, KMH } = window.TrafficEngine;
  const TAU = Math.PI * 2;
  const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $ = (id) => document.getElementById(id);
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const fmt = (x) => Math.round(x).toLocaleString('ja-JP');

  /* ================= 速さの色（白→琥珀→赤） ================= */
  const STOPS = [[0, 214, 38, 30], [20, 238, 88, 36], [40, 247, 146, 30], [52, 255, 204, 84], [63, 246, 243, 222], [100, 255, 255, 255]];
  const LUT = new Array(121);
  for (let k = 0; k <= 120; k++) {
    let j = 0;
    while (j < STOPS.length - 2 && k > STOPS[j + 1][0]) j++;
    const a = STOPS[j], b = STOPS[j + 1];
    const f = clamp((k - a[0]) / (b[0] - a[0]), 0, 1);
    LUT[k] = `rgb(${Math.round(a[1] + (b[1] - a[1]) * f)},${Math.round(a[2] + (b[2] - a[2]) * f)},${Math.round(a[3] + (b[3] - a[3]) * f)})`;
  }
  const speedColor = (kmh) => LUT[clamp(Math.round(kmh), 0, 120)];
  const BG = '#0e141b', ROAD = '#262f39', SHOULDER = '#18202a', YOU = '#4aa8ff', CALM = '#39c6d8', FLAG = '#ff5a4e', PIN = '#ffd35a';

  function buildLegends() {
    const grad = STOPS.map((s) => `rgb(${s[1]},${s[2]},${s[3]}) ${s[0]}%`).join(',');
    document.querySelectorAll('[data-legend]').forEach((el) => {
      el.innerHTML = `<div class="legend" aria-label="色は速さ。赤が時速0km、白が時速100km"><span>車の色＝速さ</span><div><div class="ramp" style="background:linear-gradient(90deg,${grad})"></div><div class="ticks">${[0, 40, 60, 80, 100].map((v) => `<span style="left:${v}%">${v}</span>`).join('')}<span style="left:20%;color:#ff8c80">渋滞</span></div></div><span>km/h</span></div>`;
    });
  }

  /* ================= Canvas と描画ループ ================= */
  function setupCanvas(canvas, heightFn) {
    const ctx = canvas.getContext('2d');
    const st = { canvas, ctx, w: 0, h: 0, dpr: 1, onResize: null };
    st.resize = function () {
      const w = Math.max(240, canvas.parentElement.clientWidth);
      const h = Math.round(heightFn(w));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (w === st.w && h === st.h && dpr === st.dpr) return;
      canvas.style.height = h + 'px';
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      st.w = w; st.h = h; st.dpr = dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (st.onResize) st.onResize();
    };
    return st;
  }

  const figs = [];
  const io = ('IntersectionObserver' in window) ? new IntersectionObserver((ents) => {
    for (const e of ents) { const f = figs.find((x) => x.el === e.target); if (f) f.visible = e.isIntersecting; }
  }, { rootMargin: '150px 0px' }) : null;
  function addFig(f) {
    figs.push(f);
    f.visible = !io;
    if (io) io.observe(f.el);
    f.draw(); // 画面に入る前でも、止まった絵は描いておく
  }
  let resizeQueued = false;
  function queueResize() {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => { resizeQueued = false; for (const f of figs) f.resize(); });
  }
  let lastT = performance.now();
  function frame(now) {
    const dt = clamp((now - lastT) / 1000, 0, 0.1);
    lastT = now;
    for (const f of figs) if (f.visible) { f.update(dt); f.draw(); }
    requestAnimationFrame(frame);
  }

  /** 決まった刻みでシミュレーションを進め、刻みの間を補間して描くための係 */
  class Runner {
    constructor(sim) { this.speed = 1; this.running = !reduceMotion; this.setSim(sim); }
    setSim(sim) {
      this.sim = sim;
      this.xCur = sim.positions(new Float64Array(sim.n));
      this.xPrev = Float64Array.from(this.xCur);
      this.acc = 0;
    }
    advance(dtReal, onStep) {
      if (!this.running) return;
      const sim = this.sim;
      this.acc += dtReal * this.speed;
      let k = 0;
      while (this.acc >= sim.dt && k < 240) {
        this.xPrev.set(this.xCur);
        sim.step();
        sim.positions(this.xCur);
        this.acc -= sim.dt;
        k++;
        if (onStep) onStep();
      }
      if (k >= 240) this.acc = 0;
    }
    /** 車 i の後端の位置（補間つき） */
    pos(i) {
      const a = Math.min(1, this.acc / this.sim.dt);
      let d = this.xCur[i] - this.xPrev[i];
      if (this.sim.ring) {
        const L = this.sim.length;
        if (d < -L / 2) d += L; else if (d > L / 2) d -= L;
        const x = this.xPrev[i] + d * a;
        return ((x % L) + L) % L;
      }
      return this.xPrev[i] + d * a;
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /** 上から見た車。brakeI は 0〜1（ブレーキの強さ） */
  function drawCar(ctx, x, y, ang, L, W, fill, brakeI, outline) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    if (brakeI > 0.02) {
      const r = 3 + 9 * brakeI;
      const g = ctx.createRadialGradient(-L / 2, 0, 0, -L / 2, 0, r + W * 0.6);
      g.addColorStop(0, `rgba(255,50,35,${0.55 + 0.4 * brakeI})`);
      g.addColorStop(1, 'rgba(255,50,35,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(-L / 2, 0, r + W * 0.6, 0, TAU);
      ctx.fill();
    }
    roundRect(ctx, -L / 2, -W / 2, L, W, Math.min(2.6, W / 3));
    ctx.fillStyle = fill;
    ctx.fill();
    if (outline) { ctx.lineWidth = 2; ctx.strokeStyle = outline; ctx.stroke(); }
    if (L > 7) {
      ctx.fillStyle = 'rgba(14,20,27,0.42)';
      ctx.fillRect(L * 0.06, -W / 2 + 1.1, Math.max(1.2, L * 0.17), W - 2.2);
    }
    ctx.fillStyle = brakeI > 0.02 ? '#ff3a2a' : 'rgba(150,20,20,0.95)';
    const tl = Math.max(1, Math.min(1.8, L * 0.12));
    ctx.fillRect(-L / 2, -W / 2 + 0.6, tl, Math.max(1.2, W * 0.26));
    ctx.fillRect(-L / 2, W / 2 - 0.6 - Math.max(1.2, W * 0.26), tl, Math.max(1.2, W * 0.26));
    ctx.restore();
  }
  const brakeOf = (a) => clamp((-a - 0.5) / 3, 0, 1);

  /* ================= 環状道路（陸上トラック型） ================= */
  class Track {
    constructor(w, h, padX, padY, top) {
      this.vertical = h > w * 1.08;
      const W = this.vertical ? h - 2 * padY : w - 2 * padX;
      const H = this.vertical ? w - 2 * padX : h - 2 * padY;
      this.R = Math.max(30, H / 2);
      this.Ls = Math.max(0, W - 2 * this.R);
      this.P = 2 * this.Ls + TAU * this.R;
      this.cx = w / 2;
      this.cy = (top || 0) + h / 2;
    }
    local(d) {
      const { Ls, R, P } = this;
      d = ((d % P) + P) % P;
      if (d < Ls) return [-Ls / 2 + d, R, 0];
      d -= Ls;
      if (d < Math.PI * R) { const ph = Math.PI / 2 - d / R; return [Ls / 2 + R * Math.cos(ph), R * Math.sin(ph), ph - Math.PI / 2]; }
      d -= Math.PI * R;
      if (d < Ls) return [Ls / 2 - d, -R, Math.PI];
      d -= Ls;
      const ph = -Math.PI / 2 - d / R;
      return [-Ls / 2 + R * Math.cos(ph), R * Math.sin(ph), ph - Math.PI / 2];
    }
    /** 道のり d の点：[x, y, 進行方向] */
    point(d, off) {
      const p = this.local(d);
      let lx = p[0], ly = p[1];
      if (off) { lx += Math.cos(p[2] + Math.PI / 2) * off; ly += Math.sin(p[2] + Math.PI / 2) * off; }
      if (this.vertical) return [this.cx + ly, this.cy - lx, p[2] - Math.PI / 2];
      return [this.cx + lx, this.cy + ly, p[2]];
    }
    path(ctx, off) {
      const { Ls } = this, R = this.R + off;
      ctx.save();
      ctx.translate(this.cx, this.cy);
      if (this.vertical) ctx.rotate(-Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(-Ls / 2, R);
      ctx.lineTo(Ls / 2, R);
      ctx.arc(Ls / 2, 0, R, Math.PI / 2, -Math.PI / 2, true);
      ctx.lineTo(-Ls / 2, -R);
      ctx.arc(-Ls / 2, 0, R, -Math.PI / 2, -Math.PI * 1.5, true);
      ctx.closePath();
      ctx.restore();
    }
    /** 道のり d1 から d2 まで（d2 > d1）の帯 */
    band(ctx, d1, d2, width, color) {
      ctx.beginPath();
      const n = Math.max(2, Math.ceil((d2 - d1) / 4));
      for (let k = 0; k <= n; k++) {
        const p = this.point(d1 + (d2 - d1) * (k / n));
        if (k === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;
      ctx.stroke();
    }
  }

  /** 環状道路の図（ヒーロー・密度・対策で共通） */
  class RingView {
    constructor(cs, runner, opt) {
      this.cs = cs;
      this.runner = runner;
      this.opt = opt || {};
      this.base = document.createElement('canvas');
    }
    layout() {
      const { w, h, dpr } = this.cs;
      const H = h - (this.opt.bottom || 0);
      const vertical = H > w * 1.08;
      const padX = vertical ? 40 : (this.opt.padX || 74);
      const padY = vertical ? 54 : (this.opt.padY || 46);
      this.track = new Track(w, H, padX, padY, 0);
      this.laneW = clamp(Math.min(w, H) / 24, 14, 22);
      this.carW = clamp(this.laneW * 0.5, 6.5, 10);
      // 下ごしらえ（背景と道路）をキャッシュ
      this.base.width = Math.round(w * dpr);
      this.base.height = Math.round(h * dpr);
      const b = this.base.getContext('2d');
      b.setTransform(dpr, 0, 0, dpr, 0, 0);
      b.fillStyle = BG;
      b.fillRect(0, 0, w, h);
      const t = this.track;
      // 内側の芝生（ほんのり）
      t.path(b, -this.laneW / 2 - 6);
      b.fillStyle = '#111a20';
      b.fill();
      t.path(b, 0);
      b.lineWidth = this.laneW + 10;
      b.strokeStyle = SHOULDER;
      b.stroke();
      b.lineWidth = this.laneW;
      b.strokeStyle = ROAD;
      b.stroke();
      b.setLineDash([]);
      b.lineWidth = 1.3;
      b.strokeStyle = 'rgba(255,255,255,0.5)';
      t.path(b, this.laneW / 2 - 1.6); b.stroke();
      t.path(b, -this.laneW / 2 + 1.6); b.stroke();
      // 進む向きの印（路面の矢羽根）
      const L = this.runner.sim.length;
      b.strokeStyle = 'rgba(255,255,255,0.16)';
      b.lineWidth = 1.6;
      for (let m = 50; m < L; m += 100) {
        const p = t.point(this.d(m));
        const ux = Math.cos(p[2]), uy = Math.sin(p[2]);
        const nx = -uy, ny = ux, k = this.laneW * 0.22;
        b.beginPath();
        b.moveTo(p[0] - ux * k + nx * k, p[1] - uy * k + ny * k);
        b.lineTo(p[0] + ux * k * 0.4, p[1] + uy * k * 0.4);
        b.lineTo(p[0] - ux * k - nx * k, p[1] - uy * k - ny * k);
        b.stroke();
      }
      // 100m ごとの目盛り
      b.fillStyle = 'rgba(255,255,255,0.32)';
      for (let m = 0; m < L; m += 100) {
        const p1 = t.point(this.d(m), this.laneW / 2 + 5);
        const p2 = t.point(this.d(m), this.laneW / 2 + 10);
        b.beginPath(); b.moveTo(p1[0], p1[1]); b.lineTo(p2[0], p2[1]);
        b.lineWidth = 1.2; b.strokeStyle = 'rgba(255,255,255,0.3)'; b.stroke();
      }
    }
    d(x) { return (x / this.runner.sim.length) * this.track.P; }
    get scale() { return this.track.P / this.runner.sim.length; }
    carLen() {
      const sim = this.runner.sim;
      const s = this.scale;
      return Math.min(Math.max(sim.p.len * s * 1.3, 5.5), (sim.p.len + sim.p.s0) * s - 2.5);
    }
    drawBase(ctx) { ctx.drawImage(this.base, 0, 0, this.cs.w, this.cs.h); }
    /** 渋滞（時速 th 未満）のかたまり：[{d1, d2, iTail, iHead}] */
    jams(th) {
      const sim = this.runner.sim, n = sim.n, v = sim.v;
      const thr = th / KMH;
      let start = -1;
      for (let i = 0; i < n; i++) if (v[i] >= thr) { start = i; break; }
      if (start < 0) return [{ all: true }];
      const out = [];
      let cur = null;
      for (let k = 1; k <= n; k++) {
        const i = (start + k) % n;
        if (v[i] < thr) {
          if (!cur) cur = { iTail: i, iHead: i, cnt: 0 };
          cur.iHead = i; cur.cnt++;
        } else if (cur) { out.push(cur); cur = null; }
      }
      if (cur) out.push(cur);
      const L = sim.length, len = sim.p.len;
      for (const j of out) {
        const x1 = this.runner.pos(j.iTail) - 3;
        let x2 = this.runner.pos(j.iHead) + len + 3;
        if (x2 < x1) x2 += L;
        j.d1 = this.d(x1); j.d2 = this.d(x2);
        j.x1 = x1; j.x2 = x2;
      }
      return out;
    }
    drawJams(ctx, list) {
      for (const j of list) {
        if (j.all) { this.track.path(ctx, 0); ctx.lineWidth = this.laneW + 12; ctx.strokeStyle = 'rgba(226,53,43,0.22)'; ctx.stroke(); continue; }
        if (j.cnt < 2) continue;
        this.track.band(ctx, j.d1, j.d2, this.laneW + 12, 'rgba(226,53,43,0.26)');
      }
    }
    drawCars(ctx, style) {
      const sim = this.runner.sim, t = this.track, n = sim.n;
      const L = this.carLen(), W = this.carW, half = sim.p.len / 2;
      for (let i = 0; i < n; i++) {
        const x = this.runner.pos(i) + half;
        const p = t.point(this.d(x));
        let fill = speedColor(sim.v[i] * KMH), outline = null;
        if (sim.type[i] === 1) {
          fill = CALM; outline = '#e9fbff';
          ctx.strokeStyle = 'rgba(57,198,216,0.55)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(p[0], p[1], L * 0.5 + 7, 0, TAU); ctx.stroke();
        }
        if (style && style(i)) { const s = style(i); if (s.fill) fill = s.fill; if (s.outline) outline = s.outline; }
        drawCar(ctx, p[0], p[1], p[2], L, W, fill, brakeOf(sim.acc[i]), outline);
      }
    }
    carScreen(i) {
      const sim = this.runner.sim;
      return this.track.point(this.d(this.runner.pos(i) + sim.p.len / 2));
    }
    hit(px, py) {
      const sim = this.runner.sim;
      let best = -1, bd = Infinity;
      for (let i = 0; i < sim.n; i++) {
        const p = this.carScreen(i);
        const d = Math.hypot(p[0] - px, p[1] - py);
        if (d < bd) { bd = d; best = i; }
      }
      const lim = Math.max(28, this.scale * (sim.length / sim.n) * 0.48);
      return bd <= lim ? best : -1;
    }
    label(ctx, d, off, text, color, opt) {
      const p = this.track.point(d, off);
      const o = opt || {};
      ctx.font = `${o.weight || 700} ${o.size || 13}px ${getComputedStyle(document.body).fontFamily}`;
      const tw = ctx.measureText(text).width;
      const x = clamp(p[0], tw / 2 + 6, this.cs.w - tw / 2 - 6);
      const y = clamp(p[1], 12, this.cs.h - (this.opt.bottom || 0) - 8);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (o.bg) {
        ctx.fillStyle = o.bg;
        roundRect(ctx, x - tw / 2 - 6, y - 10, tw + 12, 20, 6);
        ctx.fill();
      }
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
      return [x, y, tw];
    }
    /** 道路の外側に向けた矢印（進行方向と逆＝後ろ向き） */
    arrowBack(ctx, d, off, len, color) {
      const a = this.track.point(d, off), b = this.track.point(d - len, off);
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      ctx.beginPath();
      ctx.moveTo(b[0], b[1]);
      ctx.lineTo(b[0] - 8 * Math.cos(ang - 0.45), b[1] - 8 * Math.sin(ang - 0.45));
      ctx.lineTo(b[0] - 8 * Math.cos(ang + 0.45), b[1] - 8 * Math.sin(ang + 0.45));
      ctx.closePath(); ctx.fill();
    }
  }

  function bindSpeedSeg(name, runner, onChange) {
    const seg = document.querySelector(`[data-speed="${name}"]`);
    if (!seg) return;
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      seg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      runner.speed = parseFloat(b.dataset.v);
      runner.running = true;
      if (onChange) onChange();
    });
    const on = seg.querySelector('[aria-pressed="true"]');
    if (on) runner.speed = parseFloat(on.dataset.v);
  }
  function setRangeFill(inp) {
    const p = ((inp.value - inp.min) / (inp.max - inp.min)) * 100;
    inp.style.setProperty('--p', p + '%');
  }

  /* =========================================================
   * 図1（ヒーロー）：1台のブレーキで渋滞が生まれる
   * ========================================================= */
  function heroFigure() {
    const el = $('hero');
    const canvas = $('heroCanvas');
    const panel = $('heroPanel');
    const N = 30, LEN = 1000;
    let sim = new Sim({ ring: true, length: LEN, n: N });
    const runner = new Runner(sim);
    const cs = setupCanvas(canvas, (w) => (w < 860 ? clamp(w * 0.98, 320, 540) : clamp(w * 0.47, 380, 540)));
    const view = new RingView(cs, runner, { padX: 84, padY: 48 });
    let sel = 21;          // 黄色い印の車
    let rec = null;        // ブレーキの記録
    let holdStart = null;  // 長押しの開始（実時間）
    let meter = new WaveXCorr(sim);
    let waveKmh = null;
    let lastLive = '';
    let overlay = false;

    function reset() {
      sim = new Sim({ ring: true, length: LEN, n: N });
      runner.setSim(sim);
      rec = null; holdStart = null; meter = new WaveXCorr(sim); waveKmh = null;
      setLive();
      updStats();
    }
    function startBrake(i, how) {
      if (!runner.running) runner.running = true;
      sel = i;
      rec = {
        car: i, t0: sim.t, v0: sim.v[i], vmin: sim.v[i], x0: runner.pos(i) + sim.p.len / 2,
        stops0: sim.stopEvents, firstStop: null, min40: null, released: null, how
      };
      meter.reset(); waveKmh = null;
    }
    /** 波の速さ：止まる車がいるはっきりした渋滞のときだけ更新し、なめらかにする */
    function updWave() {
      meter.update();
      const s = meter.speed();
      if (s == null || sim.minSpeed() > 8 / KMH) return;
      const kmh = -s * KMH;
      if (kmh < 8 || kmh > 32) return;
      waveKmh = waveKmh == null ? kmh : waveKmh * 0.92 + kmh * 0.08;
    }
    function onStep() {
      if (!rec) return;
      const v = sim.v[rec.car];
      if (rec.released == null && !sim.hold[rec.car] && sim.brakeT[rec.car] <= 0) rec.released = sim.t;
      if (rec.released == null) rec.vmin = Math.min(rec.vmin, v);
      if (rec.released != null && sim.t - rec.released < 3) rec.vmin = Math.min(rec.vmin, v);
      const mn = sim.minSpeed();
      if (rec.min40 == null && mn < 40 / KMH) rec.min40 = sim.t;
      if (rec.firstStop == null && mn < 0.4) rec.firstStop = sim.t;
      updWave();
    }

    // ---- 長押しブレーキ ----
    const btn = $('heroBrake');
    const fill = btn.querySelector('.fill');
    function press(e) {
      if (e) e.preventDefault();
      if (holdStart != null) return;
      holdStart = performance.now();
      if (!rec || sim.t - rec.t0 > 2 || rec.car !== sel) startBrake(sel, 'button');
      sim.hold[sel] = 1;
      sim.brakeA[sel] = 3.0;
      btn.classList.add('on');
    }
    function release() {
      if (holdStart == null) return;
      const held = (performance.now() - holdStart) / 1000 * runner.speed;
      holdStart = null;
      sim.hold[sel] = 0;
      if (held < 1.2) sim.brake(sel, 3.0, 1.2 - held); // 短いタップでも、はっきり分かるブレーキに
      btn.classList.remove('on');
      fill.style.width = '0';
    }
    btn.addEventListener('pointerdown', (e) => {
      press(e);
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* 合成イベントなどで捕捉できなくても、ブレーキは効かせる */ }
    });
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
    btn.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) press(e); });
    btn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') release(); });
    btn.addEventListener('click', (e) => e.preventDefault());
    btn.addEventListener('contextmenu', (e) => e.preventDefault()); // スマホの長押しメニューを出さない

    // ---- 車をタップ ----
    canvas.addEventListener('pointerdown', (e) => {
      const r = canvas.getBoundingClientRect();
      const i = view.hit(e.clientX - r.left, e.clientY - r.top);
      if (i < 0) return;
      startBrake(i, 'tap');
      sim.brake(i, 3.0, 1.4);
    });
    canvas.style.cursor = 'pointer';
    $('heroReset').addEventListener('click', reset);
    bindSpeedSeg('hero', runner);

    function setLive() {
      const live = $('heroLive');
      let html;
      const v0 = sim.equilibriumSpeed(LEN / N - sim.p.len) * KMH;
      if (!rec) {
        html = `30台が時速<span class="em">${Math.round(v0)}km</span>で、等間隔に走っています。赤いボタンを押すと、黄色い印の車がブレーキを踏みます。長く押すほど強く減速します。`;
      } else {
        const t = sim.t - rec.t0;
        const drop = Math.max(0, (rec.v0 - rec.vmin) * KMH);
        const holding = sim.hold[rec.car] || sim.brakeT[rec.car] > 0;
        if (holding) {
          html = `ブレーキ中… 時速<span class="em">${Math.round(sim.v[rec.car] * KMH)}km</span>`;
        } else if (rec.firstStop != null && sim.t - rec.firstStop < 9) {
          html = `最初の車は時速${Math.round(drop)}km落としただけなのに、ブレーキから<span class="red">${Math.round(rec.firstStop - rec.t0)}秒後</span>、ついに<span class="red">止まる車</span>が出ました。最初にブレーキを踏んだ車は、もうはるか先を走っています。`;
        } else if (rec.firstStop != null) {
          const more = sim.t - rec.firstStop > 30 ? '<br>なぜこうなるのか、下へ読み進めて1つずつ確かめましょう。' : '';
          html = (waveKmh != null
            ? `渋滞のかたまりは、車とは逆向きに、時速<span class="em">${Math.round(waveKmh)}km</span>で後ろへ動いています。誰も悪くないのに、渋滞は消えません。`
            : `渋滞のかたまりは、車とは逆向きに、ゆっくり後ろへ動いています。誰も悪くないのに、渋滞は消えません。`) + more;
        } else if (rec.min40 != null) {
          html = `時速40km以下の車が出てきました。NEXCO（高速道路会社）が「渋滞」の目安にしている速さです。止まる車が出るまで、もう少しです。`;
        } else if (rec.released != null && sim.t - rec.released < 5) {
          html = `ブレーキはここまで。時速${Math.round(rec.v0 * KMH)}km → ${Math.round(rec.vmin * KMH)}kmと、<span class="em">${Math.round(drop)}km/h</span>落としただけです。この車はすぐ元の速さに戻ります。`;
        } else if (t > 75) {
          html = `減速の波は、後ろへ伝わりながら少しずつ大きくなっています。待ちきれなければ、もう一度ブレーキを踏んでみてください。`;
        } else {
          html = `後ろの車が、次々にブレーキを踏んでいます。<span class="em">後ろへいくほど、減速が大きく</span>なっていきます（ブレーキランプのリレー）。${runner.speed === 1 ? '<br>下の「×3」で早送りもできます。' : ''}`;
        }
      }
      if (html !== lastLive) { live.innerHTML = html; lastLive = html; }
    }
    function updStats() {
      $('hsT').innerHTML = rec ? `${Math.floor(sim.t - rec.t0)}<small>秒</small>` : '—';
      $('hsMin').innerHTML = `${Math.round(sim.minSpeed() * KMH)}<small>km/h</small>`;
      $('hsStop').innerHTML = `${rec ? sim.stopEvents - rec.stops0 : 0}<small>台</small>`;
      $('hsMean').innerHTML = `${Math.round(sim.meanSpeed() * KMH)}<small>km/h</small>`;
    }

    function placePanel() {
      overlay = cs.w >= 860;
      panel.classList.toggle('static', !overlay);
      if (!overlay) { panel.style.cssText = ''; return; }
      const t = view.track;
      const iw = t.Ls + t.R * 1.1, ih = t.R * 2 - view.laneW - 96;
      panel.style.left = `${t.cx - iw / 2}px`;
      panel.style.top = `${t.cy - ih / 2}px`;
      panel.style.width = `${iw}px`;
      panel.style.height = `${ih}px`;
    }
    cs.onResize = () => { view.layout(); placePanel(); };

    let statT = 0;
    const fig = {
      el,
      resize() { cs.resize(); },
      update(dt) {
        runner.advance(dt, onStep);
        if (holdStart != null) {
          const held = (performance.now() - holdStart) / 1000;
          fill.style.width = `${clamp(held / 4, 0, 1) * 100}%`;
          if (held > 6) release();
        }
        statT += dt;
        if (statT > 0.2) { statT = 0; setLive(); updStats(); }
      },
      draw() {
        const ctx = cs.ctx;
        view.drawBase(ctx);
        const jams = view.jams(40);
        view.drawJams(ctx, jams);
        // ブレーキ地点の旗
        if (rec) {
          const d = view.d(rec.x0);
          const pIn = view.track.point(d, view.laneW / 2 + 4), pOut = view.track.point(d, view.laneW / 2 + 22);
          ctx.strokeStyle = FLAG; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(pIn[0], pIn[1]); ctx.lineTo(pOut[0], pOut[1]); ctx.stroke();
          // 旗（進行方向にたなびく三角形）
          const ang = view.track.point(d)[2];
          const ux = Math.cos(ang), uy = Math.sin(ang);
          const nx = (pOut[0] - pIn[0]) / 18, ny = (pOut[1] - pIn[1]) / 18;
          ctx.fillStyle = FLAG;
          ctx.beginPath();
          ctx.moveTo(pOut[0], pOut[1]);
          ctx.lineTo(pOut[0] + ux * 12 - nx * 4, pOut[1] + uy * 12 - ny * 4);
          ctx.lineTo(pOut[0] - nx * 8, pOut[1] - ny * 8);
          ctx.closePath(); ctx.fill();
          view.label(ctx, d, -(view.laneW / 2 + (cs.w < 600 ? 32 : 27)), 'ブレーキ地点', '#ffb3ab', { size: cs.w < 600 ? 11 : 12, weight: 700, bg: 'rgba(14,20,27,0.78)' });
        }
        view.drawCars(ctx, (i) => (i === sel ? { outline: PIN } : null));
        // 黄色い印
        const p = view.carScreen(sel);
        ctx.strokeStyle = PIN; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p[0], p[1], view.carLen() * 0.5 + 9, 0, TAU); ctx.stroke();
        // 渋滞ラベル
        for (const j of jams) {
          if (j.all || j.cnt < 3) continue;
          const mid = (j.d1 + j.d2) / 2;
          const off = view.laneW / 2 + 17;
          const showV = waveKmh != null && rec && rec.firstStop != null;
          const narrow = cs.w < 600;
          view.label(ctx, mid, off, showV && !narrow ? `渋滞（後ろへ時速${Math.round(waveKmh)}km）` : '渋滞', '#ffd0ca', { size: narrow ? 12 : 13 });
          view.arrowBack(ctx, j.d1 + 6, view.laneW / 2 + 5, Math.min(60, 26 + (j.d2 - j.d1) * 0.2), '#ff8c80');
        }
        if (!runner.running) {
          ctx.fillStyle = 'rgba(14,20,27,0.55)';
          ctx.fillRect(0, 0, cs.w, cs.h);
        }
      }
    };
    cs.resize();
    reset();
    addFig(fig);
    return fig;
  }

  /* =========================================================
   * 図2：車は前へ、渋滞は後ろへ（まっすぐな道路＋走行記録）
   * ========================================================= */
  function waveFigure() {
    const el = $('wave');
    const canvas = $('waveCanvas');
    const N = 30, LEN = 1000, YOU_I = 0, BRAKE_I = 15;
    const ROW_DT = 0.25;      // 走行記録の1行の時間
    const PX_PER_S = 4;       // 走行記録の1秒あたりの高さ
    let sim, rec, meter, nextRow, prevRowX, lastLive = '', lost = null;
    const runner = new Runner(new Sim({ ring: true, length: LEN, n: N }));
    const cs = setupCanvas(canvas, (w) => (w < 700 ? 300 : 352));
    const hist = document.createElement('canvas');
    const hctx = hist.getContext('2d');
    let G = null;

    function geom() {
      const { w, h } = cs;
      const mL = w < 700 ? 50 : 56, mR = w < 700 ? 10 : 18;
      const stripY = 30, stripH = 26;
      const dTop = stripY + stripH + 14, dBot = h - 22;
      G = { mL, mR, x0: mL, x1: w - mR, stripY, stripH, dTop, dBot, dH: dBot - dTop };
      G.sx = (G.x1 - G.x0) / LEN;
    }
    function resetHist() {
      const { dpr } = cs;
      hist.width = Math.max(1, Math.round((G.x1 - G.x0) * dpr));
      hist.height = Math.max(1, Math.round(G.dH * dpr));
      hctx.setTransform(1, 0, 0, 1, 0, 0);
      hctx.fillStyle = '#121a22';
      hctx.fillRect(0, 0, hist.width, hist.height);
      prevRowX = null;
    }
    function reset() {
      sim = new Sim({ ring: true, length: LEN, n: N });
      // 走行記録がはじめから埋まっているように、先に少し走らせておく（その間は等間隔のまま）
      const pre = G ? Math.ceil(G.dH / PX_PER_S) + 1 : 0;
      sim.xRef = (((220 - sim.v[0] * pre) % LEN) + LEN) % LEN; // 走らせ終わったとき、あなたが左寄りにいるように
      runner.setSim(sim);
      rec = null; lost = null;
      meter = new WaveXCorr(sim);
      nextRow = 0;
      if (G) {
        resetHist();
        while (sim.t < pre) {
          runner.xPrev.set(runner.xCur);
          sim.step();
          sim.positions(runner.xCur);
          if (sim.t + 1e-9 >= nextRow) { row(); nextRow += ROW_DT; }
        }
        runner.xPrev.set(runner.xCur);
      }
      setLive(); updStats();
      $('waveGo').textContent = '15台前の車にブレーキを踏ませる';
    }
    function go() {
      if (rec) { reset(); }
      runner.running = true;
      rec = { t0: sim.t, v0: sim.v[YOU_I], youMin: sim.v[YOU_I], stopped: false, slowed: false, exited: null, dist: 0, waveKmh: null, vBrake0: sim.v[BRAKE_I], vBrakeMin: sim.v[BRAKE_I] };
      sim.brake(BRAKE_I, 3.0, 1.5);
      $('waveGo').textContent = 'もう一度（最初から）';
    }
    $('waveGo').addEventListener('click', go);
    bindSpeedSeg('wave', runner);

    function row() {
      const { dpr } = cs;
      const W = hist.width, H = hist.height;
      const dy = Math.max(1, Math.round(PX_PER_S * ROW_DT * dpr));
      hctx.drawImage(hist, 0, 0, W, H - dy, 0, dy, W, H - dy);
      hctx.fillStyle = '#121a22';
      hctx.fillRect(0, 0, W, dy);
      const sx = G.sx * dpr;
      const x = runner.xCur, half = sim.p.len / 2;
      // 渋滞の帯
      const thr = 40 / KMH;
      hctx.fillStyle = 'rgba(226,53,43,0.62)';
      for (let i = 0; i < N; i++) {
        const j = sim.lead(i);
        if (sim.v[i] < thr && sim.v[j] < thr) {
          let a = x[i] + half, b = x[j] + half;
          if (b < a) b += LEN;
          if (b - a < 60) {
            hctx.fillRect(a * sx, 0, (b - a) * sx, dy);
            if (b > LEN) hctx.fillRect((a - LEN) * sx, 0, (b - a) * sx, dy);
          }
        }
      }
      // 車の跡
      if (prevRowX) {
        for (let pass = 0; pass < 2; pass++) {
          for (let i = 0; i < N; i++) {
            const isYou = i === YOU_I;
            if ((pass === 1) !== isYou) continue;
            const xa = prevRowX[i] + half, xb = x[i] + half;
            if (Math.abs(xb - xa) > LEN / 2) continue;
            hctx.strokeStyle = isYou ? YOU : (i === BRAKE_I && rec ? '#ffd35a' : speedColor(sim.v[i] * KMH));
            hctx.globalAlpha = isYou || (i === BRAKE_I && rec) ? 1 : (cs.w < 560 ? 0.55 : 0.72);
            hctx.lineWidth = (isYou ? 2.6 : 1.25) * dpr;
            hctx.beginPath();
            hctx.moveTo(xa * sx, dy);
            hctx.lineTo(xb * sx, 0);
            hctx.stroke();
          }
        }
        hctx.globalAlpha = 1;
      }
      prevRowX = Float64Array.from(x);
    }
    function onStep() {
      if (sim.t + 1e-9 >= nextRow) { row(); nextRow += ROW_DT; }
      if (!rec) return;
      const v = sim.v[YOU_I];
      rec.vBrakeMin = Math.min(rec.vBrakeMin, sim.v[BRAKE_I]);
      rec.dist += v * sim.dt;
      rec.youMin = Math.min(rec.youMin, v);
      if (v < rec.v0 * 0.85) rec.slowed = true;
      if (v < 0.4) rec.stopped = true;
      if (rec.slowed && rec.exited == null && v > rec.v0 * 0.9 && sim.t - rec.t0 > 20) {
        rec.exited = sim.t;
        lost = (sim.t - rec.t0) - rec.dist / rec.v0;
      }
      if (rec.exited != null && !rec.again && sim.t - rec.exited > 5 && v < rec.v0 * 0.8) rec.again = true;
      meter.update();
      const s = meter.speed();
      if (s != null && sim.minSpeed() < 8 / KMH) {
        const kmh = -s * KMH;
        if (kmh >= 8 && kmh <= 32) rec.waveKmh = rec.waveKmh == null ? kmh : rec.waveKmh * 0.92 + kmh * 0.08;
      }
    }
    function setLive() {
      const live = $('waveLive');
      let html;
      const vY = sim.v[YOU_I] * KMH;
      if (!rec) {
        html = `あなた（<span style="color:${YOU};font-weight:700">青い車</span>）は時速${Math.round(vY)}kmで順調に走っています。右のほうにいる黄色い枠の車が、あなたの15台前の車です。ボタンを押して、この車にブレーキを踏ませましょう。`;
      } else if (rec.again) {
        html = `1周して、また同じ渋滞の最後尾に追いつきました（環状道路なので）。渋滞は消えずに、後ろへ動きながら回り続けています。「もう一度」で最初からやり直せます。`;
      } else if (rec.exited != null) {
        const minTxt = rec.stopped ? '一度は完全に止まりました' : `時速${Math.round(rec.youMin * KMH)}kmまで落ちました`;
        html = `渋滞を抜けました。前には……<span class="em">何もありません</span>。あなたは${minTxt}が、原因は見当たりません。渋滞は、あなたの後ろへ去っていきました。走行記録の青い線が、あなたの通った跡です。`;
      } else if (rec.stopped && vY > 1) {
        html = `ノロノロと動き出しました（時速${Math.round(vY)}km）。まだ前が詰まっています。`;
      } else if (rec.stopped) {
        html = `<span class="red">止まりました。</span>前の車も止まっています。でも、見える範囲に事故も工事もありません。`;
      } else if (rec.slowed) {
        html = `前の車のブレーキランプが点きました。あなたもブレーキを踏みます。いまは時速<span class="em">${Math.round(vY)}km</span>。`;
      } else if (sim.t - rec.t0 < 4) {
        html = `15台前の車がブレーキを踏みました。時速${Math.round(rec.vBrake0 * KMH)}km → ${Math.round(rec.vBrakeMin * KMH)}km、ほんの少しの減速です。`;
      } else {
        html = `ブレーキランプのリレーが、後ろへ、つまりあなたのほうへ伝わってきます。伝わるたびに、減速が少しずつ大きくなっています。`;
      }
      if (html !== lastLive) { live.innerHTML = html; lastLive = html; }
    }
    function updStats() {
      $('wsWave').innerHTML = rec && rec.waveKmh != null ? `後ろへ 時速${Math.round(rec.waveKmh)}<small>km</small>` : (rec ? '<small>測定中…</small>' : '—');
      $('wsLost').innerHTML = lost != null ? `約${Math.round(lost)}<small>秒${rec && rec.again ? '（1回目）' : ''}</small>` : (rec ? '<small>走行中…</small>' : '—');
    }
    cs.onResize = () => { geom(); if (!rec) reset(); else resetHist(); };

    let statT = 0;
    const fig = {
      el,
      resize() { cs.resize(); },
      update(dt) {
        runner.advance(dt, onStep);
        statT += dt;
        if (statT > 0.2) { statT = 0; setLive(); updStats(); }
      },
      draw() {
        const ctx = cs.ctx, { w, h } = cs;
        const font = getComputedStyle(document.body).fontFamily;
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, w, h);
        // 見出し
        ctx.font = `700 12.5px ${font}`;
        ctx.fillStyle = '#9fb0b6';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(w < 560 ? 'いまの道路' : 'いまの道路（1周1kmを切り開いたもの）', G.x0, 14);
        ctx.textAlign = 'right';
        ctx.fillText('進む向き →', G.x1, 14);
        // 道路
        const sy = G.stripY;
        ctx.fillStyle = SHOULDER;
        ctx.fillRect(G.x0 - 4, sy - 4, G.x1 - G.x0 + 8, G.stripH + 8);
        ctx.fillStyle = ROAD;
        ctx.fillRect(G.x0, sy, G.x1 - G.x0, G.stripH);
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(G.x0, sy + 2); ctx.lineTo(G.x1, sy + 2); ctx.moveTo(G.x0, sy + G.stripH - 2); ctx.lineTo(G.x1, sy + G.stripH - 2); ctx.stroke();
        // 渋滞の帯（いま）
        const thr = 40 / KMH, half = sim.p.len / 2;
        ctx.fillStyle = 'rgba(226,53,43,0.32)';
        for (let i = 0; i < N; i++) {
          const j = sim.lead(i);
          if (sim.v[i] < thr && sim.v[j] < thr) {
            let a = runner.pos(i) + half, b = runner.pos(j) + half;
            if (b < a) b += LEN;
            if (b - a < 60) {
              const xa = G.x0 + a * G.sx, xb = G.x0 + b * G.sx;
              ctx.fillRect(xa, sy - 4, Math.min(xb, G.x1) - xa, G.stripH + 8);
              if (xb > G.x1) ctx.fillRect(G.x0, sy - 4, xb - G.x1, G.stripH + 8);
            }
          }
        }
        // 車
        const L = Math.max(4, Math.min(sim.p.len * G.sx * 1.15, (sim.p.len + sim.p.s0) * G.sx - 1.5));
        const Wc = Math.min(11, L * 0.8 + 2.5);
        ctx.save();
        ctx.beginPath(); ctx.rect(G.x0, sy - 6, G.x1 - G.x0, G.stripH + 12); ctx.clip();
        for (let i = 0; i < N; i++) {
          const x = G.x0 + (runner.pos(i) + half) * G.sx;
          const isYou = i === YOU_I, isB = i === BRAKE_I;
          const fill = isYou ? YOU : speedColor(sim.v[i] * KMH);
          drawCar(ctx, x, sy + G.stripH / 2, 0, L, Wc, fill, brakeOf(sim.acc[i]), isB ? PIN : null);
          if (x > G.x1 - L) drawCar(ctx, x - (G.x1 - G.x0), sy + G.stripH / 2, 0, L, Wc, fill, brakeOf(sim.acc[i]), isB ? PIN : null);
        }
        ctx.restore();
        // 「あなた」ラベル
        const xy = G.x0 + (runner.pos(YOU_I) + half) * G.sx;
        ctx.font = `700 12px ${font}`; ctx.textAlign = 'center'; ctx.fillStyle = YOU;
        ctx.fillText('あなた', clamp(xy, G.x0 + 20, G.x1 - 20), sy + G.stripH + 8);
        const xb = G.x0 + (runner.pos(BRAKE_I) + half) * G.sx;
        ctx.fillStyle = PIN;
        ctx.fillText('15台前', clamp(xb, G.x0 + 22, G.x1 - 22), sy + G.stripH + 8);
        // 走行記録
        ctx.drawImage(hist, G.x0, G.dTop, G.x1 - G.x0, G.dH);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
        ctx.strokeRect(G.x0 + 0.5, G.dTop + 0.5, G.x1 - G.x0 - 1, G.dH - 1);
        ctx.font = `${w < 560 ? 11 : 12}px ${font}`; ctx.fillStyle = '#a3b3b9'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let s = 0; s * PX_PER_S <= G.dH - 6; s += 15) {
          const y = G.dTop + s * PX_PER_S;
          ctx.fillText(s === 0 ? 'いま' : `${s}秒前`, G.x0 - 6, y + (s === 0 ? 6 : 0));
          if (s > 0) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(G.x0, y, G.x1 - G.x0, 1); ctx.fillStyle = '#8fa1a8'; }
        }
        ctx.textAlign = 'left';
        ctx.fillText(w < 560 ? '線＝車の動き　赤い帯＝渋滞' : '走行記録：線＝1台の車の動き　赤い帯＝渋滞（時速40km以下）', G.x0, h - 9);
        if (!runner.running) { ctx.fillStyle = 'rgba(14,20,27,0.5)'; ctx.fillRect(0, 0, w, h); }
      }
    };
    cs.resize();
    reset();
    addFig(fig);
    return fig;
  }

  /* =========================================================
   * 図3：伝言ゲーム（12台の車列）
   * ========================================================= */
  function chainFigure() {
    const el = $('chain');
    const canvas = $('chainCanvas');
    const N = 12, V = 80 / KMH, DIP = 20;
    const tauIn = $('chTau'), gapIn = $('chGap');
    const runner = new Runner(new Sim({ ring: false, n: N, v: V }));
    const cs = setupCanvas(canvas, (w) => (w < 700 ? 330 : 360));
    let sim, run = null, prevMins = null, quizAns = null, scale = 1;
    const done = { 1: false, 2: false, 3: false };
    let hover = -1;

    function makeSim() {
      const tau = parseFloat(tauIn.value), gap = parseFloat(gapIn.value);
      const tmp = new Sim({ ring: false, n: 2, v: V });
      const r = Math.sqrt(1 - Math.pow(V / tmp.p.v0, tmp.p.delta));
      const T = (gap * r - tmp.p.s0) / V;
      const s = new Sim({ ring: false, n: N, v: V, params: { tau, T } });
      return s;
    }
    function reset(autoBrakeIn) {
      sim = makeSim();
      runner.setSim(sim);
      scale = targetScale();
      run = { tau: sim.p.tau, gap: parseFloat(gapIn.value), brakeAt: autoBrakeIn != null ? sim.t + autoBrakeIn : null, t0: null, finished: false, mins: null };
      $('chainVerdict').innerHTML = '';
    }
    function start() {
      runner.running = true;
      reset(0.8);
    }
    let deb = null;
    function onSlider() {
      $('chTauV').textContent = `${parseFloat(tauIn.value).toFixed(1)}秒`;
      $('chGapV').textContent = `${gapIn.value}m`;
      setRangeFill(tauIn); setRangeFill(gapIn);
      clearTimeout(deb);
      deb = setTimeout(start, 450);
    }
    tauIn.addEventListener('input', onSlider);
    gapIn.addEventListener('input', onSlider);
    $('chGo').addEventListener('click', start);
    bindSpeedSeg('chain', runner);
    document.querySelectorAll('#quiz [data-a]').forEach((b) => b.addEventListener('click', () => {
      quizAns = b.dataset.a;
      document.querySelectorAll('#quiz [data-a]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      start();
    }));

    function onStep() {
      if (!run) return;
      if (run.brakeAt != null && run.t0 == null && sim.t < run.brakeAt && $('chainVerdict').textContent === '') {
        $('chainVerdict').textContent = `まもなく先頭の車がブレーキを踏みます（反応の遅れ${run.tau.toFixed(1)}秒・車間${run.gap}m）`;
      }
      if (run.brakeAt != null && run.t0 == null && sim.t >= run.brakeAt) {
        run.t0 = sim.t;
        sim.minV.set(sim.v);
        sim.brake(N - 1, 2.0, DIP / KMH / 2.0);
      }
      if (run.t0 != null && !run.finished && sim.k % 6 === 0) {
        // 走っている間の手応え：ブレーキがいま何台目まで伝わったか
        let reached = 0;
        for (let k = 0; k < N; k++) if (sim.minV[N - 1 - k] < V - 1.5 / KMH) reached = k + 1;
        const txt = `先頭の車がブレーキを踏みました。ブレーキが後ろへ伝わっています……（いま${reached}台目まで）`;
        if ($('chainVerdict').textContent !== txt) $('chainVerdict').textContent = txt;
      }
      if (run.t0 != null && !run.finished) {
        const t = sim.t - run.t0;
        let rec = true;
        for (let i = 0; i < N; i++) if (sim.v[i] < Math.min(sim.minV[i] + 4 / KMH, 77 / KMH)) { rec = false; break; }
        if ((t > 12 && rec) || t > 80) finish();
      }
    }
    function finish() {
      run.finished = true;
      const mins = [];
      for (let k = 0; k < N; k++) mins.push(sim.minV[N - 1 - k] * KMH); // mins[0] = 先頭
      run.mins = mins;
      const stopAt = mins.findIndex((m) => m < 1);
      const lastDip = 80 - mins[N - 1];
      let html = '';
      let judge = '';
      if (quizAns) {
        const truth = stopAt >= 0 && stopAt <= N - 1 && mins[N - 1] < 1 ? 'stop' : (lastDip < DIP * 0.8 ? 'small' : (lastDip <= DIP * 1.3 ? 'same' : (mins[N - 1] < 1 ? 'stop' : 'big')));
        judge = quizAns === truth ? '<span class="ok">予想どおり！</span> ' : (truth === 'big' ? '' : '<span class="red">予想と違いました。</span> ');
        quizAns = null;
        document.querySelectorAll('#quiz [data-a]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      }
      if (stopAt >= 0) {
        html = `${judge}<span class="red">${stopAt + 1}台目で、ついに止まりました。</span>先頭は時速20km落としただけなのに、後ろへいくほど減速が大きくなりました。`;
        if (Math.abs(run.tau - 1.1) < 0.05 && run.gap === 25) markDone(1, `反応の遅れ1.1秒・車間25mで、${stopAt + 1}台目が止まりました`);
      } else {
        if (lastDip < DIP * 0.95) {
          html = `${judge}<span class="ok">波は小さくなって消えました。</span>12台目は時速${Math.round(mins[N - 1])}kmまでしか落ちていません。`;
        } else {
          html = `${judge}<span class="ok">止まる車は出ませんでした。</span>ただ、12台目は時速${Math.round(mins[N - 1])}kmまで落ちていて、減速はまだ少し大きくなっています。車列がもっと長ければ、どこかで止まる車が出るかもしれません。`;
        }
        if (Math.abs(run.tau - 1.1) < 0.05 && run.gap > 25) markDone(2, `車間${run.gap}mなら、止まる車はゼロ（12台目の最低 時速${Math.round(mins[N - 1])}km）`);
        if (run.gap <= 25 && run.tau < 1.05) markDone(3, `反応の遅れ${run.tau.toFixed(1)}秒なら、止まる車はゼロ（12台目の最低 時速${Math.round(mins[N - 1])}km）`);
      }
      $('chainVerdict').innerHTML = html;
      prevMins = mins;
    }
    function markDone(m, why, hint) {
      const li = document.querySelector(`#missions [data-m="${m}"]`);
      if (!li) return;
      if (why) { done[m] = true; li.classList.add('done'); li.querySelector('.why').textContent = why; }
      else if (!done[m] && hint) { li.querySelector('.why').textContent = hint; }
    }

    // ---- ホバーで数値 ----
    const tip = document.createElement('div');
    tip.className = 'tip';
    el.appendChild(tip);
    function barGeom() {
      const { w, h } = cs;
      const roadH = w < 700 ? 92 : 112;
      const top = roadH + 40, bot = h - 34;
      const left = w < 700 ? 34 : 46, right = w - 12;
      const slot = (right - left) / N;
      return { roadH, top, bot, left, right, slot };
    }
    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const B = barGeom();
      if (y < B.top - 10 || y > B.bot + 30 || x < B.left || x > B.right) { hover = -1; tip.classList.remove('on'); return; }
      const slot = Math.floor((x - B.left) / B.slot);
      hover = clamp(slot, 0, N - 1);
      const k = N - 1 - hover; // k: 0 = 先頭
      const nm = k === 0 ? '先頭の車' : `${k + 1}台目`;
      const cur = Math.round(sim.minV[N - 1 - k] * KMH);
      const prev = prevMins && run && run.finished ? null : prevMins;
      tip.innerHTML = `${nm}：いちばん遅いとき 時速${cur}km${prev ? `<br>前回：時速${Math.round(prev[k])}km` : ''}`;
      tip.style.left = `${canvas.offsetLeft + B.left + (hover + 0.5) * B.slot}px`;
      tip.style.top = `${canvas.offsetTop + B.top + 6}px`;
      tip.classList.add('on');
    });
    canvas.addEventListener('pointerleave', () => { hover = -1; tip.classList.remove('on'); });

    /** 車列ぜんぶが画面に収まる縮尺（車列が伸び縮みしたら、ゆっくり追従する） */
    function targetScale() {
      const ext = (runner.xCur[N - 1] + sim.p.len) - runner.xCur[0];
      return (cs.w - 84) / (Math.max(ext, 180) * 1.06);
    }
    cs.onResize = () => { if (sim) scale = targetScale(); };

    const fig = {
      el,
      resize() { cs.resize(); },
      update(dt) {
        runner.advance(dt, onStep);
      },
      draw() {
        const ctx = cs.ctx, { w, h } = cs;
        const font = getComputedStyle(document.body).fontFamily;
        const B = barGeom();
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, w, h);
        // ---- 道路（先頭の車を追いかけるカメラ） ----
        const roadY = 34, roadH = B.roadH - 50;
        ctx.fillStyle = SHOULDER; ctx.fillRect(0, roadY - 5, w, roadH + 10);
        ctx.fillStyle = ROAD; ctx.fillRect(0, roadY, w, roadH);
        const ts = targetScale();
        scale += (ts - scale) * (ts < scale ? 0.12 : 0.03);
        const leadX = runner.pos(N - 1) + sim.p.len / 2;
        const camX = w - 46; // 先頭の車の画面上の位置
        const toScr = (x) => camX + (x - leadX) * scale;
        // 破線（地面に固定）
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.4;
        const dashM = 20, gapM = 12;
        const start = Math.floor((leadX - (camX + 40) / scale) / (dashM + gapM)) * (dashM + gapM);
        ctx.beginPath();
        for (let m = start; toScr(m) < w + 40; m += dashM + gapM) {
          ctx.moveTo(toScr(m), roadY + 3); ctx.lineTo(toScr(m + dashM), roadY + 3);
          ctx.moveTo(toScr(m), roadY + roadH - 3); ctx.lineTo(toScr(m + dashM), roadY + roadH - 3);
        }
        ctx.stroke();
        const L = Math.max(5, Math.min(sim.p.len * scale * 1.1, (sim.p.len + sim.p.s0) * scale - 1.5));
        const Wc = clamp(Math.min(roadH * 0.5, L * 0.75 + 2), 5, 15);
        ctx.font = `700 11px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let i = 0; i < N; i++) {
          const x = toScr(runner.pos(i) + sim.p.len / 2);
          if (x < -20) continue;
          const k = N - 1 - i;
          drawCar(ctx, x, roadY + roadH / 2, 0, L, Wc, speedColor(sim.v[i] * KMH), brakeOf(sim.acc[i]), hover === i ? PIN : null);
          if (k === 0 || k === N - 1 || hover === i || (L > 9 && (k + 1) % 2 === 0) || L > 16) {
            ctx.fillStyle = hover === i ? PIN : '#8fa1a8';
            ctx.fillText(k === 0 ? '先頭' : String(k + 1), x, roadY + roadH + 14);
          }
        }
        ctx.textAlign = 'left'; ctx.fillStyle = '#9fb0b6'; ctx.font = `700 12.5px ${font}`;
        ctx.fillText(w < 560 ? '12台の車列' : '12台の車列（カメラは先頭の車を追いかけています）', 12, 14);
        ctx.textAlign = 'right';
        ctx.fillText('進む向き →', w - 12, 14);

        // ---- 棒グラフ：各車のいちばん遅い速さ ----
        const vmax = 90;
        const yOf = (kmh) => B.bot - (clamp(kmh, 0, vmax) / vmax) * (B.bot - B.top);
        ctx.font = `12px ${font}`; ctx.textBaseline = 'middle';
        for (const g of [0, 20, 40, 60, 80]) {
          const y = yOf(g);
          ctx.fillStyle = g === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)';
          ctx.fillRect(B.left, Math.round(y), B.right - B.left, 1);
          ctx.fillStyle = '#7f9198'; ctx.textAlign = 'right';
          ctx.fillText(String(g), B.left - 6, y);
        }
        ctx.textAlign = 'left'; ctx.fillStyle = '#9fb0b6'; ctx.font = `700 12.5px ${font}`;
        ctx.fillText(w < 560 ? '各車のいちばん遅いときの速さ（km/h）' : '各車が、いちばん遅くなったときの速さ（km/h）', B.left, B.top - 16);
        const bw = Math.min(30, B.slot * 0.62);
        const started = run && run.t0 != null;
        for (let k = 0; k < N; k++) {
          const i = N - 1 - k;            // k = 0 が先頭
          const slot = N - 1 - k;         // 右端が先頭
          const cx = B.left + (slot + 0.5) * B.slot;
          const mn = started ? sim.minV[i] * KMH : sim.v[i] * KMH;
          const y = yOf(mn);
          // 前回
          if (prevMins) {
            const py = yOf(prevMins[k]);
            ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
            ctx.strokeRect(cx - bw / 2 - 2.5, py, bw + 5, B.bot - py);
            ctx.setLineDash([]);
          }
          ctx.fillStyle = speedColor(mn);
          roundRect(ctx, cx - bw / 2, y, bw, Math.max(1, B.bot - y), Math.min(4, bw / 4));
          ctx.fill();
          if (hover === slot) { ctx.strokeStyle = PIN; ctx.lineWidth = 2; ctx.stroke(); }
          // 値
          if (started) {
            ctx.fillStyle = '#e9eef0'; ctx.textAlign = 'center'; ctx.font = `700 ${B.slot < 30 ? 10 : 12}px ${font}`;
            ctx.fillText(String(Math.round(mn)), cx, Math.min(y - 9, B.bot - 9));
          }
          ctx.fillStyle = '#a3b3b9'; ctx.font = `${B.slot < 30 ? 10.5 : 12}px ${font}`; ctx.textAlign = 'center';
          ctx.fillText(k === 0 ? '先頭' : String(k + 1), cx, B.bot + 13);
        }
        ctx.textAlign = 'left'; ctx.fillStyle = '#93a5ab'; ctx.font = `12px ${font}`;
        ctx.fillText('← 後ろの車', B.left, B.bot + 27);
        ctx.textAlign = 'right';
        ctx.fillText('数字は前から何台目か', B.right, B.bot + 27);
        if (!runner.running) { ctx.fillStyle = 'rgba(14,20,27,0.45)'; ctx.fillRect(0, 0, w, h); }
      }
    };
    cs.resize();
    onSlider();
    clearTimeout(deb);
    reset(null);
    addFig(fig);
    return fig;
  }

  /* =========================================================
   * 図4：混み具合（ゆらぎあり）と流れる台数
   * ========================================================= */
  function densityFigure() {
    const el = $('dens');
    const canvas = $('densCanvas');
    const nIn = $('dnN');
    const LEN = 1000, NOISE = 0.15;
    let sim, hist = [], lastLive = '';
    const runner = new Runner(new Sim({ ring: true, length: LEN, n: 20 }));
    const cs = setupCanvas(canvas, (w) => (w < 700 ? clamp(w * 1.0, 320, 440) : clamp(w * 0.36, 300, 400)));
    const view = new RingView(cs, runner, { padX: 60, padY: 40 });
    const data = window.FLOW_DATA || [];

    function reset() {
      const n = parseInt(nIn.value, 10);
      sim = new Sim({ ring: true, length: LEN, n, seed: 3, params: { noise: NOISE } });
      runner.setSim(sim);
      hist = [];
      view.layout();
      $('dnNV').textContent = `${n}台`;
      $('dnHint').textContent = `車間 およそ${Math.round(LEN / n - sim.p.len)}m`;
      setRangeFill(nIn);
    }
    nIn.addEventListener('input', () => { runner.running = true; reset(); });
    bindSpeedSeg('dens', runner);

    let acc = 0;
    function onStep() {
      acc += sim.dt;
      if (acc >= 0.5) {
        acc = 0;
        hist.push({ t: sim.t, mean: sim.meanSpeed(), min: sim.minSpeed(), stops: sim.stopEvents });
        while (hist.length && hist[0].t < sim.t - 60) hist.shift();
      }
    }
    function windowStats(sec) {
      const rows = hist.filter((r) => r.t >= sim.t - sec);
      if (!rows.length) return null;
      const mean = rows.reduce((a, r) => a + r.mean, 0) / rows.length;
      const min = Math.min(...rows.map((r) => r.min));
      const stops = rows[rows.length - 1].stops - rows[0].stops;
      return { mean, min, stops };
    }
    function setLive() {
      const n = sim.n;
      const w20 = windowStats(30);
      let html;
      if (!w20 || sim.t < 5) {
        html = `1kmあたり${n}台が、等間隔で走り出しました。全員の運転に小さなゆらぎがあります。`;
      } else if (w20.stops > 0 || sim.minSpeed() < 1) {
        html = `<span class="red">渋滞が発生しています。</span>わざとブレーキを踏んだ車は1台もないのに、止まる車が出ています。`;
      } else if (w20.min < 40 / KMH) {
        html = `ゆらぎが育って、速さが大きく落ちる場所が出てきました。`;
      } else {
        html = n <= 25
          ? `流れは順調です。ゆらぎで速さが少し変わっても、すぐに元に戻ります。${sim.t > 30 ? '台数を28〜30台にしてみましょう。' : ''}`
          : `いまのところ順調です。でも、この混み具合だと、ゆらぎがしだいに育っていきます。少し待ってみてください（×6で早送りできます）。`;
      }
      if (html !== lastLive) { $('densLive').innerHTML = html; lastLive = html; }
      const ws = windowStats(30);
      const mean = ws ? ws.mean : sim.meanSpeed();
      $('dsMean').innerHTML = `${Math.round(mean * KMH)}<small>km/h</small>`;
      $('dsFlow').innerHTML = `${fmt(n * mean * KMH)}<small>台</small>`;
      updChartDot(n, n * mean * KMH);
    }

    // ---- グラフ（SVG） ----
    const svg = $('flowSvg');
    const NS = 'http://www.w3.org/2000/svg';
    const tip = $('flowTip');
    let CW = 600, CH = 240, dot = null, xs = null, ys = null;
    const M = { l: 66, r: 16, t: 14, b: 40 };
    const X0 = 10, X1 = 50, Y1 = 2200;
    function mk(tag, attrs, parent) {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(e);
      return e;
    }
    function drawChart() {
      CW = Math.max(300, svg.parentElement.clientWidth - 28);
      CH = CW < 500 ? 230 : 250;
      svg.setAttribute('viewBox', `0 0 ${CW} ${CH}`);
      svg.setAttribute('width', CW);
      svg.setAttribute('height', CH);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      xs = (k) => M.l + ((k - X0) / (X1 - X0)) * (CW - M.l - M.r);
      ys = (q) => CH - M.b - (q / Y1) * (CH - M.t - M.b);
      const g = mk('g', {});
      for (let q = 0; q <= Y1; q += 500) {
        mk('line', { x1: M.l, x2: CW - M.r, y1: ys(q), y2: ys(q), stroke: q === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.09)', 'stroke-width': 1 }, g);
        const t = mk('text', { x: M.l - 8, y: ys(q) + 4, 'text-anchor': 'end', 'font-size': 11, fill: '#8fa1a8' }, g);
        t.textContent = q.toLocaleString('ja-JP');
      }
      for (let k = 10; k <= 50; k += 10) {
        const t = mk('text', { x: xs(k), y: CH - M.b + 17, 'text-anchor': 'middle', 'font-size': 11, fill: '#8fa1a8' }, g);
        t.textContent = String(k);
      }
      const xl = mk('text', { x: (M.l + CW - M.r) / 2, y: CH - 6, 'text-anchor': 'middle', 'font-size': 12, fill: '#b7c4c9' }, g);
      xl.textContent = '1kmあたりの台数 →（右ほど混んでいる）';
      const yl = mk('text', { x: 12, y: M.t + (CH - M.t - M.b) / 2, 'text-anchor': 'middle', 'font-size': 12, fill: '#b7c4c9', transform: `rotate(-90 12 ${M.t + (CH - M.t - M.b) / 2})` }, g);
      yl.textContent = '1時間に流れる台数';
      if (!data.length) return;
      // 等間隔のまま走れた場合（点線）
      const tmp = new Sim({ ring: true, length: LEN, n: 10 });
      let dd = '';
      for (let k = X0; k <= X1; k += 0.5) {
        const v = tmp.equilibriumSpeed(LEN / k - tmp.p.len) * KMH;
        dd += `${dd ? 'L' : 'M'}${xs(k).toFixed(1)},${ys(k * v).toFixed(1)}`;
      }
      mk('path', { d: dd, fill: 'none', stroke: 'rgba(255,255,255,0.55)', 'stroke-width': 1.6, 'stroke-dasharray': '4 4' });
      // 実測（ゆらぎあり）
      let dm = '';
      for (const p of data) dm += `${dm ? 'L' : 'M'}${xs(p.k).toFixed(1)},${ys(p.q).toFixed(1)}`;
      mk('path', { d: dm, fill: 'none', stroke: '#f7931e', 'stroke-width': 2.2 });
      const peak = data.reduce((a, b) => (b.q > a.q ? b : a), data[0]);
      for (const p of data) {
        const c = mk('circle', { cx: xs(p.k), cy: ys(p.q), r: 4, fill: '#f7931e', stroke: BG, 'stroke-width': 2 });
        const hit = mk('circle', { cx: xs(p.k), cy: ys(p.q), r: 11, fill: 'transparent', tabindex: 0, 'aria-label': `1kmあたり${p.k}台：1時間に${fmt(p.q)}台` });
        const show = () => {
          tip.innerHTML = `1kmあたり<b>${p.k}台</b>：1時間に<b>${fmt(p.q)}台</b><br>平均 時速${Math.round(p.v)}km${p.stops > 0 ? '・渋滞あり' : ''}`;
          const r = svg.getBoundingClientRect(), pr = svg.parentElement.getBoundingClientRect();
          tip.style.left = `${r.left - pr.left + 14 + xs(p.k) * (r.width / CW)}px`;
          tip.style.top = `${r.top - pr.top + 10 + ys(p.q) * (r.height / CH)}px`;
          tip.classList.add('on');
          c.setAttribute('r', 6);
        };
        const hide = () => { tip.classList.remove('on'); c.setAttribute('r', 4); };
        hit.addEventListener('pointerenter', show); hit.addEventListener('pointerleave', hide);
        hit.addEventListener('focus', show); hit.addEventListener('blur', hide);
      }
      // 分かれ目
      const px = xs(peak.k), py = ys(peak.q);
      mk('line', { x1: px, x2: px, y1: py - 8, y2: py - 34, stroke: '#ffd35a', 'stroke-width': 1.2 });
      const pt = mk('text', { x: px, y: py - 40, 'text-anchor': 'middle', 'font-size': 12, fill: '#ffd35a', 'font-weight': 700 });
      pt.textContent = `いちばん流れるのは${peak.k}台前後`;
      // ラベル（直接表示）
      const last = data[data.length - 1];
      const l1 = mk('text', { x: xs(last.k) - 4, y: ys(last.q) + 18, 'text-anchor': 'end', 'font-size': 11.5, fill: '#f7b25a' });
      l1.textContent = '実際（ゆらぎあり）';
      const k2 = 44, v2 = tmp.equilibriumSpeed(LEN / k2 - tmp.p.len) * KMH;
      const l2 = mk('text', { x: xs(k2), y: ys(k2 * v2) - 10, 'text-anchor': 'middle', 'font-size': 11.5, fill: 'rgba(255,255,255,0.7)' });
      l2.textContent = '等間隔のまま走れたら';
      dot = mk('g', {});
      mk('circle', { r: 9, fill: 'none', stroke: '#fff', 'stroke-width': 2 }, dot);
      mk('circle', { r: 4.5, fill: '#fff' }, dot);
      const dl = mk('text', { x: 13, y: -9, 'text-anchor': 'start', 'font-size': 12, fill: '#fff', 'font-weight': 700, stroke: BG, 'stroke-width': 3, 'paint-order': 'stroke' }, dot);
      dl.textContent = 'いま';
      // 表
      const tb = $('flowTable');
      tb.innerHTML = `<table><thead><tr><th>1kmあたりの台数</th><th>1時間に流れる台数</th><th>平均の速さ</th><th>渋滞</th></tr></thead><tbody>${data.map((p) => `<tr><td>${p.k}台</td><td>${fmt(p.q)}台</td><td>時速${Math.round(p.v)}km</td><td>${p.stops > 0 ? 'あり' : 'なし'}</td></tr>`).join('')}</tbody></table>`;
    }
    function updChartDot(n, q) {
      if (!dot || !xs) return;
      dot.setAttribute('transform', `translate(${xs(clamp(n, X0, X1)).toFixed(1)},${ys(clamp(q, 0, Y1)).toFixed(1)})`);
    }
    $('flowTableBtn').addEventListener('click', () => {
      const tb = $('flowTable');
      tb.hidden = !tb.hidden;
      $('flowTableBtn').setAttribute('aria-expanded', String(!tb.hidden));
      $('flowTableBtn').textContent = tb.hidden ? 'グラフの数値を表で見る' : '表を閉じる';
    });

    cs.onResize = () => { view.layout(); drawChart(); };
    let statT = 0;
    const fig = {
      el,
      resize() { cs.resize(); },
      update(dt) {
        runner.advance(dt, onStep);
        statT += dt;
        if (statT > 0.25) { statT = 0; setLive(); }
      },
      draw() {
        const ctx = cs.ctx;
        view.drawBase(ctx);
        view.drawJams(ctx, view.jams(40));
        view.drawCars(ctx);
        if (!runner.running) { ctx.fillStyle = 'rgba(14,20,27,0.5)'; ctx.fillRect(0, 0, cs.w, cs.h); }
      }
    };
    reset();
    cs.resize();
    drawChart();
    setLive();
    addFig(fig);
    return fig;
  }

  /* =========================================================
   * 図5：ゆとり運転で波を消す（＋自由に試す）
   * ========================================================= */
  function fixFigure() {
    const el = $('fix');
    const canvas = $('fixCanvas');
    const LEN = 1000;
    const NOISES = [0, 0.08, 0.15, 0.3];
    const NOISE_NAMES = ['なし', '小さい', 'ふつう', '大きい'];
    const nIn = $('fxN'), tauIn = $('fxTau'), noIn = $('fxNoise');
    const BOTTOM = 92;
    let sim, hist = [], marks = [], nAbs = 0, lastLive = '', mean0 = null;
    const runner = new Runner(new Sim({ ring: true, length: LEN, n: 26 }));
    const cs = setupCanvas(canvas, (w) => (w < 700 ? clamp(w * 1.05, 340, 480) + BOTTOM : clamp(w * 0.34, 290, 380) + BOTTOM));
    const view = new RingView(cs, runner, { padX: 60, padY: 40, bottom: BOTTOM });

    function build(prerun) {
      const n = parseInt(nIn.value, 10);
      sim = new Sim({ ring: true, length: LEN, n, seed: 5, params: { noise: NOISES[parseInt(noIn.value, 10)], tau: parseFloat(tauIn.value) } });
      hist = []; marks = [];
      if (prerun) {
        // 渋滞が育ちきるまで先に走らせておく（その間の記録もグラフに残す）。止まっている車がいる瞬間から始める
        sim.brake(0, 3.0, 2.0);
        let a = 0, lastStop = -1, se = sim.stopEvents;
        while (sim.t < 480 && (sim.t < 240 || lastStop < sim.t - 3 || sim.minSpeed() > 0.5)) {
          sim.step();
          if (sim.stopEvents > se) { se = sim.stopEvents; lastStop = sim.t; }
          a += sim.dt;
          if (a >= 0.5) { a = 0; hist.push({ t: sim.t, min: sim.minSpeed(), mean: sim.meanSpeed(), stops: sim.stopEvents }); }
        }
        while (hist.length && hist[0].t < sim.t - 240) hist.shift();
      }
      runner.setSim(sim);
      hist.push({ t: sim.t, min: sim.minSpeed(), mean: sim.meanSpeed(), stops: sim.stopEvents });
      mean0 = null;
      applyAbs(nAbs, true);
      view.layout();
    }
    function applyAbs(k, silent) {
      nAbs = k;
      const n = sim.n;
      for (let i = 0; i < n; i++) sim.setAbsorber(i, false);
      for (let j = 0; j < k; j++) sim.setAbsorber((Math.floor((j * n) / k) + 3) % n, true);
      if (!silent) marks.push({ t: sim.t, k });
      document.querySelectorAll('#absSeg button').forEach((b) => b.setAttribute('aria-pressed', String(parseInt(b.dataset.n, 10) === k)));
    }
    document.querySelectorAll('#absSeg button').forEach((b) => b.addEventListener('click', () => {
      runner.running = true;
      if (mean0 == null) { const w = windowStats(60); mean0 = w ? w.mean : sim.meanSpeed(); }
      applyAbs(parseInt(b.dataset.n, 10));
    }));
    $('fixReset').addEventListener('click', () => { runner.running = true; nAbs = 0; build(true); });
    bindSpeedSeg('fix', runner);
    function syncLabels() {
      $('fxNV').textContent = `${nIn.value}台`;
      $('fxTauV').textContent = `${parseFloat(tauIn.value).toFixed(1)}秒`;
      $('fxNoiseV').textContent = NOISE_NAMES[parseInt(noIn.value, 10)];
      [nIn, tauIn, noIn].forEach(setRangeFill);
    }
    nIn.addEventListener('input', () => { syncLabels(); runner.running = true; build(false); });
    tauIn.addEventListener('input', () => { syncLabels(); sim.p.tau = parseFloat(tauIn.value); });
    noIn.addEventListener('input', () => { syncLabels(); sim.p.noise = NOISES[parseInt(noIn.value, 10)]; });
    canvas.addEventListener('pointerdown', (e) => {
      const r = canvas.getBoundingClientRect();
      const i = view.hit(e.clientX - r.left, e.clientY - r.top);
      if (i < 0) return;
      runner.running = true;
      sim.brake(i, 3.0, 1.5);
    });
    canvas.style.cursor = 'pointer';

    let acc = 0;
    function onStep() {
      acc += sim.dt;
      if (acc >= 0.5) {
        acc = 0;
        hist.push({ t: sim.t, min: sim.minSpeed(), mean: sim.meanSpeed(), stops: sim.stopEvents });
        while (hist.length && hist[0].t < sim.t - 240) hist.shift();
      }
    }
    function windowStats(sec) {
      const rows = hist.filter((r) => r.t >= sim.t - sec);
      if (rows.length < 2) return null;
      return {
        mean: rows.reduce((a, r) => a + r.mean, 0) / rows.length,
        stops: rows[rows.length - 1].stops - rows[0].stops,
        span: rows[rows.length - 1].t - rows[0].t
      };
    }
    function setLive() {
      const w = windowStats(60);
      const stops = w ? w.stops : 0;
      const mean = w ? w.mean : sim.meanSpeed();
      const sinceMark = marks.length ? sim.t - marks[marks.length - 1].t : Infinity;
      let html;
      const slow20 = hist.filter((r) => r.t >= sim.t - 20).reduce((m, r) => Math.min(m, r.min), Infinity);
      if (nAbs === 0) {
        html = stops > 0 || sim.minSpeed() < 10 / KMH
          ? `渋滞の波が、道路を何周も回り続けています。下の「ゆとり運転の車」のボタンで、1〜3台入れてみましょう。`
          : (sim.minSpeed() < 40 / KMH ? `速さが落ちている場所があります。下のボタンで、ゆとり運転の車を入れてみましょう。` : `いまは渋滞がありません。車をタップしてブレーキを踏ませることもできます。`);
      } else if (stops > 0 || sinceMark < 25 || slow20 < 25 / KMH) {
        html = `ゆとり運転の車（水色）が、前との車間を広くあけて、一定のペースで走っています。波が少しずつ削られていきます……`;
      } else {
        const up = mean0 != null ? Math.round((mean - mean0) * KMH) : 0;
        html = `<span class="ok" style="color:#7fe0b0;font-weight:700">止まる車がいなくなりました。</span>平均の速さは時速${Math.round(mean * KMH)}km${up >= 4 ? `。渋滞していたときより${up}km/h速く流れています` : ''}。`;
      }
      if (html !== lastLive) { $('fixLive').innerHTML = html; lastLive = html; }
      $('fsStops').innerHTML = w && w.span > 20 ? `${stops}<small>台</small>` : '<small>測定中…</small>';
      $('fsMin').innerHTML = `${Math.round(sim.minSpeed() * KMH)}<small>km/h</small>`;
      $('fsMean').innerHTML = `${Math.round(mean * KMH)}<small>km/h</small>`;
    }

    function drawSpark(ctx) {
      const { w, h } = cs;
      const top = h - BOTTOM + 14, bot = h - 22, left = 50, right = w - 16;
      const font = getComputedStyle(document.body).fontFamily;
      ctx.fillStyle = '#121a22';
      ctx.fillRect(0, h - BOTTOM, w, BOTTOM);
      ctx.font = `700 12px ${font}`; ctx.fillStyle = '#9fb0b6'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('いちばん遅い車の速さ（直近4分）', left, h - BOTTOM + 8 + 2);
      const yOf = (kmh) => bot - (clamp(kmh, 0, 100) / 100) * (bot - top);
      ctx.font = `11.5px ${font}`; ctx.textAlign = 'right';
      for (const g of [0, 40, 80]) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(left, Math.round(yOf(g)), right - left, 1);
        ctx.fillStyle = '#7f9198'; ctx.fillText(String(g), left - 6, yOf(g));
      }
      const t1 = sim.t, t0 = t1 - 240;
      const xOf = (t) => left + ((t - t0) / 240) * (right - left);
      ctx.beginPath();
      let first = true;
      for (const r of hist) {
        if (r.t < t0) continue;
        const x = xOf(r.t), y = yOf(r.min * KMH);
        if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#f7931e'; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = `700 11px ${font}`; ctx.textAlign = 'left';
      for (const m of marks) {
        if (m.t < t0) continue;
        const x = xOf(m.t);
        ctx.fillStyle = CALM; ctx.fillRect(x, top - 2, 1.5, bot - top + 2);
        const txt = `ゆとり${m.k}台`, tw = ctx.measureText(txt).width;
        const lx = Math.min(x + 5, right - tw - 4), ly = top + (bot - top) * 0.42;
        ctx.fillStyle = 'rgba(18,26,34,0.85)'; ctx.fillRect(lx - 3, ly - 8, tw + 6, 16);
        ctx.fillStyle = CALM; ctx.fillText(txt, lx, ly);
      }
      ctx.textAlign = 'right'; ctx.fillStyle = '#7f9198'; ctx.font = `10.5px ${font}`;
      ctx.fillText('いま', right, bot + 11);
    }

    cs.onResize = () => { view.layout(); };
    let statT = 0;
    const fig = {
      el,
      resize() { cs.resize(); },
      update(dt) {
        runner.advance(dt, onStep);
        statT += dt;
        if (statT > 0.25) { statT = 0; setLive(); }
      },
      draw() {
        const ctx = cs.ctx;
        view.drawBase(ctx);
        view.drawJams(ctx, view.jams(40));
        view.drawCars(ctx);
        drawSpark(ctx);
        if (!runner.running) { ctx.fillStyle = 'rgba(14,20,27,0.5)'; ctx.fillRect(0, 0, cs.w, cs.h); }
      }
    };
    syncLabels();
    cs.resize();
    build(true);
    setLive();
    addFig(fig);
    return fig;
  }

  /* ================= 起動 ================= */
  function init() {
    buildLegends();
    heroFigure();
    waveFigure();
    chainFigure();
    densityFigure();
    fixFigure();
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(queueResize);
      figs.forEach((f) => ro.observe(f.el));
    } else {
      window.addEventListener('resize', queueResize);
    }
    if (reduceMotion) {
      document.querySelectorAll('.fig').forEach((f) => {
        const note = document.createElement('div');
        note.className = 'fig-bar';
        note.style.fontSize = '13px';
        note.textContent = '「動きを減らす」設定のため、自動では動きません。ボタンやスライダーを操作すると動き出します。';
        f.appendChild(note);
      });
    }
    window.__figs = figs; // 確認用
    requestAnimationFrame(frame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
