/*
 * engine.js — 交通シミュレーション本体（描画から独立。ブラウザでも Node でも動く）
 *
 * モデル：Intelligent Driver Model（Treiber, Hennecke, Helbing 2000）に
 *         「反応の遅れ」を加えた追従モデル。
 *   - ドライバーは τ 秒前に見た「車間・自分の速さ・前の車の速さ」をもとにアクセルとブレーキを決める。
 *   - ただし、いま強いブレーキが必要な場面（reflex を超える減速が要る）では、遅れなしで反射的にブレーキを踏む。
 *   - 状態は「位置」ではなく「前の車との車間」と「速さ」で持つ。全員が同じ状態なら計算結果も
 *     ビット単位で同じになるので、きっかけを与えない限り等間隔の流れが数値誤差で崩れることはない。
 * 単位：メートル・秒（速さは m/s。表示のときに km/h へ直す）
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TrafficEngine = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const KMH = 3.6;
  const H = 72; // 反応の遅れ用の履歴の長さ（ステップ数）。dt=0.05 で 3.6 秒ぶん

  const DEFAULTS = {
    v0: 100 / KMH,  // 出したい速さ（制限速度 100km/h の高速道路）
    T: 1.3,         // 保ちたい車間（時間）[s]
    s0: 2.5,        // 止まったときの車間 [m]
    aMax: 1.3,      // 加速の強さ [m/s²]
    aLow: 0,        // 低速での加速の上乗せ [m/s²]（0 で無効）
    bComf: 4.0,     // ブレーキの踏み方（大きいほど、近づいてからまとめて踏む）[m/s²]
    delta: 4,
    len: 4.6,       // 車の長さ [m]
    tau: 1.1,       // 反応の遅れ [s]
    reflex: 3.0,    // これより強いブレーキが必要なら、遅れなしで反応 [m/s²]
    bMax: 8.0,      // 物理的な最大減速 [m/s²]
    noise: 0,       // 運転のゆらぎの強さ [m/s²]
    noiseTheta: 2.5 // ゆらぎの続く時間の目安 [s]
  };

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }

  class Sim {
    /**
     * @param {object} o
     *   ring   : true なら環状道路（周長 length）、false なら直線の車列（先頭は自由に走る）
     *   length : 環状道路の周長 [m]
     *   n      : 台数
     *   v      : 初速 [m/s]（直線の車列では先頭の巡航速度）
     *   gap    : 直線の車列の初期車間 [m]（省略時は釣り合いの車間）
     */
    constructor(o) {
      this.ring = o.ring !== false;
      this.length = o.length || 1000;
      this.dt = o.dt || 0.05;
      this.p = Object.assign({}, DEFAULTS, o.params || {});
      this.seed = o.seed || 7;
      this.reset(o.n || 20, o.v, o.gap);
    }

    reset(n, v, gap) {
      const p = this.p;
      this.n = n;
      this.t = 0;
      this.k = 0;
      this.rng = mulberry32(this.seed);
      this.s = new Float64Array(n);     // 前の車との車間（バンパー間）
      this.v = new Float64Array(n);     // 速さ
      this.acc = new Float64Array(n);   // 直近の加速度
      this.dx = new Float64Array(n);
      this.v0i = new Float64Array(n).fill(p.v0);
      this.xi = new Float64Array(n);    // ゆらぎ（OU 過程）
      this.brakeT = new Float64Array(n);  // 強制ブレーキの残り時間
      this.brakeA = new Float64Array(n);  // 強制ブレーキの強さ
      this.hold = new Uint8Array(n);      // 押している間ブレーキ（ボタン長押し用）
      this.type = new Uint8Array(n);      // 0: ふつう, 1: ゆとり運転
      this.uAbs = new Float64Array(n);    // ゆとり運転：自分の平均の速さ
      this.vcAbs = new Float64Array(n);   // ゆとり運転：いま目指している速さ
      this.minV = new Float64Array(n);    // これまでの最低速度
      this.stopped = new Uint8Array(n);   // 止まっているか（ヒステリシスつき）
      this.hs = new Float64Array(n * H);
      this.hv = new Float64Array(n * H);
      this.hl = new Float64Array(n * H);
      this.clampCount = 0;
      this.minGap = Infinity;
      this.stopEvents = 0;
      this.maxDecel = 0;

      if (this.ring) {
        const sp = this.length / n;
        const g = sp - p.len;
        const ve = v != null ? v : this.equilibriumSpeed(g);
        this.s.fill(g);
        this.v.fill(ve);
        this.xRef = 0;
      } else {
        const ve = v != null ? v : 80 / KMH;
        const g = gap != null ? gap : this.equilibriumGap(ve);
        this.s.fill(g);
        this.s[n - 1] = 1e6;
        this.v.fill(ve);
        this.v0i[n - 1] = ve; // 先頭は巡航速度で走る
        this.xRef = 0;
      }
      this.minV.set(this.v);
      for (let i = 0; i < n; i++) {
        const vl = this.v[this.lead(i)];
        for (let h = 0; h < H; h++) {
          this.hs[i * H + h] = this.s[i];
          this.hv[i * H + h] = this.v[i];
          this.hl[i * H + h] = vl;
        }
      }
    }

    lead(i) {
      if (this.ring) return i === this.n - 1 ? 0 : i + 1;
      return i === this.n - 1 ? i : i + 1;
    }
    follower(i) {
      if (this.ring) return i === 0 ? this.n - 1 : i - 1;
      return i === 0 ? -1 : i - 1;
    }

    /** IDM の加速度 */
    idm(s, v, dv, v0, T) {
      const p = this.p;
      const a = p.aMax + p.aLow * Math.max(0, 1 - v / (60 / KMH));
      const sStar = p.s0 + Math.max(0, v * T + (v * dv) / (2 * Math.sqrt(a * p.bComf)));
      const free = 1 - Math.pow(Math.max(v, 0) / v0, p.delta);
      const ss = Math.max(s, 0.05);
      return a * (free - (sStar / ss) * (sStar / ss));
    }

    /** 速さ v で釣り合う車間 */
    equilibriumGap(v) {
      const p = this.p;
      const r = 1 - Math.pow(v / p.v0, p.delta);
      return (p.s0 + v * p.T) / Math.sqrt(Math.max(r, 1e-6));
    }

    /** 車間 g で釣り合う速さ */
    equilibriumSpeed(g) {
      let lo = 0, hi = this.p.v0;
      for (let it = 0; it < 60; it++) {
        const mid = (lo + hi) / 2;
        if (this.equilibriumGap(mid) < g) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    }

    /** 強制ブレーキ（decel [m/s²] を duration 秒） */
    brake(i, decel, duration) {
      this.brakeA[i] = decel;
      this.brakeT[i] = duration;
    }

    setAbsorber(i, on) {
      this.type[i] = on ? 1 : 0;
      if (on) {
        this.uAbs[i] = this.meanSpeed(); // 道路全体の平均の速さから始める
        this.vcAbs[i] = this.v[i];
      }
    }

    gauss() {
      let u = 0, w = 0;
      while (u === 0) u = this.rng();
      while (w === 0) w = this.rng();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w);
    }

    step() {
      const p = this.p, dt = this.dt, n = this.n;
      const s = this.s, v = this.v;
      const kNow = this.k % H;
      const D = clamp(Math.round(p.tau / dt), 0, H - 2);
      const kDel = ((this.k - D) % H + H) % H;

      // 1) いま見えている状態を記録
      for (let i = 0; i < n; i++) {
        const o = i * H + kNow;
        this.hs[o] = s[i];
        this.hv[o] = v[i];
        this.hl[o] = v[this.lead(i)];
      }

      // 2) 加速度を決める
      const sq = Math.sqrt(2 * dt / p.noiseTheta);
      for (let i = 0; i < n; i++) {
        const li = this.lead(i);
        const isFreeLeader = !this.ring && i === n - 1;
        const vl = isFreeLeader ? v[i] : v[li];
        const sNow = isFreeLeader ? 1e6 : s[i];
        const v0 = this.v0i[i];

        let a;
        if (this.type[i] === 1) {
          a = this.absorberAcc(i, sNow, v[i], vl);
        } else {
          const o = i * H + kDel;
          const sD = isFreeLeader ? 1e6 : this.hs[o];
          const vD = this.hv[o];
          const vlD = isFreeLeader ? vD : this.hl[o];
          a = this.idm(sD, vD, vD - vlD, v0, p.T);
          if (p.noise > 0 && v[i] > 1) {
            this.xi[i] += -this.xi[i] / p.noiseTheta * dt + p.noise * sq * this.gauss();
            a += this.xi[i];
          }
          const aNow = this.idm(sNow, v[i], v[i] - vl, v0, p.T);
          if (aNow < -p.reflex) a = Math.min(a, aNow); // 危ないときは反射的に
        }

        if (this.brakeT[i] > 0 || this.hold[i]) {
          const aNow = this.idm(sNow, v[i], v[i] - vl, v0, p.T);
          a = Math.min(-this.brakeA[i], aNow);
          if (this.brakeT[i] > 0) this.brakeT[i] = Math.max(0, this.brakeT[i] - dt);
        }

        a = clamp(a, -p.bMax, 3);
        this.acc[i] = a;
      }

      // 3) 位置と速さを進める（止まるときは逆走しない）
      for (let i = 0; i < n; i++) {
        let a = this.acc[i];
        const vi = v[i];
        let vn = vi + a * dt;
        let d;
        if (vn < 0) {
          d = a < 0 ? Math.min(vi * dt, -vi * vi / (2 * a)) : 0;
          vn = 0;
        } else {
          d = vi * dt + 0.5 * a * dt * dt;
        }
        this.dx[i] = d;
        v[i] = vn;
        if (-a > this.maxDecel) this.maxDecel = -a;
      }
      for (let i = 0; i < n; i++) {
        if (!this.ring && i === n - 1) continue;
        s[i] += this.dx[this.lead(i)] - this.dx[i];
      }
      this.xRef += this.ring ? this.dx[0] : this.dx[n - 1];

      // 4) 安全装置（正しく動いていれば一度も働かない。働いた回数は clampCount に残す）
      const sHard = 0.5;
      for (let i = 0; i < n; i++) {
        if (!this.ring && i === n - 1) continue;
        if (s[i] < this.minGap) this.minGap = s[i];
        if (s[i] < sHard) {
          this.clampCount++;
          const li = this.lead(i);
          const fix = sHard - s[i];
          s[i] = sHard;
          // 後ろの車を下げたぶん、その後ろの車間を詰める
          const fi = this.follower(i);
          if (fi >= 0) s[fi] -= fix;
          if (this.ring && i === 0) this.xRef -= fix;
          v[i] = Math.min(v[i], v[li]);
        }
      }

      // 5) 記録
      for (let i = 0; i < n; i++) {
        if (v[i] < this.minV[i]) this.minV[i] = v[i];
        if (this.stopped[i]) {
          if (v[i] > 2.5) this.stopped[i] = 0;
        } else if (v[i] < 0.4) {
          this.stopped[i] = 1;
          this.stopEvents++;
        }
      }

      this.t += dt;
      this.k++;
    }

    /**
     * ゆとり運転：前の車にぴったりついていくのをやめ、
     * 「自分のこれまでの平均の速さ」を目安に一定のペースで走る（車間が空けば少しだけ詰める）。
     * 前の車に近づきすぎたときだけ、前の車の速さに合わせる。
     * Stern ら（2018）の円形コース実験で使われた制御（PI with saturation）を高速道路の速さに合わせて簡略化したもの。
     */
    absorberAcc(i, sNow, vi, vl) {
      const dt = this.dt;
      this.uAbs[i] += (vi - this.uAbs[i]) * dt / 38;                 // 約40秒の平均
      const vt = this.uAbs[i] + 1.0 * clamp((sNow - 12) / 48, 0, 1);  // 車間が空いていれば少しだけ速く
      const closing = vi - vl;
      const ss = Math.max(2 * closing, 6);
      const al = clamp((sNow - ss) / 8, 0, 1);  // 車間が十分なら 1（目安のペース）、近すぎれば 0（前に合わせる）
      const be = 1 - 0.5 * al;
      this.vcAbs[i] = be * (al * vt + (1 - al) * vl) + (1 - be) * this.vcAbs[i];
      const a = clamp(this.vcAbs[i] - vi, -3, 1.2);
      return Math.min(a, this.idm(sNow, vi, vi - vl, this.v0i[i], 0.9)); // 危ないときは普通にブレーキ
    }

    /** 各車の位置（環状なら 0〜length） */
    positions(out) {
      const n = this.n, p = this.p;
      const x = out || new Float64Array(n);
      if (this.ring) {
        let cur = this.xRef;
        for (let i = 0; i < n; i++) {
          let xm = cur % this.length;
          if (xm < 0) xm += this.length;
          x[i] = xm;
          cur += p.len + this.s[i];
        }
      } else {
        let cur = this.xRef;
        for (let i = n - 1; i >= 0; i--) {
          x[i] = cur;
          if (i > 0) cur -= p.len + this.s[i - 1];
        }
      }
      return x;
    }

    meanSpeed() {
      let sum = 0;
      for (let i = 0; i < this.n; i++) sum += this.v[i];
      return sum / this.n;
    }
    minSpeed() {
      let m = Infinity;
      for (let i = 0; i < this.n; i++) if (this.v[i] < m) m = this.v[i];
      return m;
    }
    speedStd() {
      const m = this.meanSpeed();
      let q = 0;
      for (let i = 0; i < this.n; i++) q += (this.v[i] - m) * (this.v[i] - m);
      return Math.sqrt(q / this.n);
    }
    countBelow(th) {
      let c = 0;
      for (let i = 0; i < this.n; i++) if (this.v[i] < th) c++;
      return c;
    }

    /**
     * 渋滞のかたまりの中心（環状道路のみ）。速さ th 未満の車の位置を、遅さで重みづけした円周平均。
     * 渋滞がなければ null。
     */
    jamCenter(th, xs) {
      if (!this.ring) return null;
      const x = xs || this.positions();
      let cx = 0, cy = 0, wsum = 0;
      for (let i = 0; i < this.n; i++) {
        const w = th - this.v[i];
        if (w <= 0) continue;
        const ang = (x[i] / this.length) * 2 * Math.PI;
        cx += w * Math.cos(ang);
        cy += w * Math.sin(ang);
        wsum += w;
      }
      if (wsum <= 0) return null;
      let ang = Math.atan2(cy, cx);
      if (ang < 0) ang += 2 * Math.PI;
      return (ang / (2 * Math.PI)) * this.length;
    }
  }

  /**
   * いちばん大きな渋滞のかたまりの「先頭」（車が抜けていく側）の位置。渋滞がなければ null。
   * 渋滞の先頭は、かたまりが育っていても縮んでいても一定の速さで後ろへ進むので、波の速さを測るのに向いている。
   */
  Sim.prototype.jamHead = function (th, xs) {
    if (!this.ring) return null;
    const n = this.n, v = this.v, thr = th;
    let start = -1;
    for (let i = 0; i < n; i++) if (v[i] >= thr) { start = i; break; }
    if (start < 0) return null;
    let best = null, cur = null;
    for (let k = 1; k <= n; k++) {
      const i = (start + k) % n;
      if (v[i] < thr) {
        if (!cur) cur = { head: i, cnt: 0 };
        cur.head = i; cur.cnt++;
      } else if (cur) { if (!best || cur.cnt > best.cnt) best = cur; cur = null; }
    }
    if (cur && (!best || cur.cnt > best.cnt)) best = cur;
    if (!best || best.cnt < 3) return null;
    const x = xs || this.positions();
    return (x[best.head] + this.p.len) % this.length;
  };

  /** 渋滞の中心の動きから、波の速さを測る（直近 win 秒の回帰） */
  class WaveMeter {
    constructor(length, win) {
      this.length = length;
      this.win = win || 12;
      this.reset();
    }
    reset() {
      this.ts = [];
      this.xs = [];
      this.last = null;
      this.offset = 0;
    }
    push(t, x) {
      if (x == null) { this.reset(); return; }
      if (this.last != null) {
        let d = x - this.last;
        if (d > this.length / 2) this.offset -= this.length;
        else if (d < -this.length / 2) this.offset += this.length;
      }
      this.last = x;
      this.ts.push(t);
      this.xs.push(x + this.offset);
      while (this.ts.length && this.ts[0] < t - this.win) { this.ts.shift(); this.xs.shift(); }
    }
    /** m/s（負なら後ろ向き）。データが足りなければ null */
    speed() {
      const n = this.ts.length;
      if (n < 10 || this.ts[n - 1] - this.ts[0] < this.win * 0.6) return null;
      let mt = 0, mx = 0;
      for (let i = 0; i < n; i++) { mt += this.ts[i]; mx += this.xs[i]; }
      mt /= n; mx /= n;
      let num = 0, den = 0, res = 0;
      for (let i = 0; i < n; i++) {
        num += (this.ts[i] - mt) * (this.xs[i] - mx);
        den += (this.ts[i] - mt) * (this.ts[i] - mt);
      }
      if (den <= 0) return null;
      const slope = num / den;
      for (let i = 0; i < n; i++) {
        const e = this.xs[i] - (mx + slope * (this.ts[i] - mt));
        res += e * e;
      }
      // ばらつきが大きすぎるときは信用しない
      if (Math.sqrt(res / n) > 25) return null;
      return slope;
    }
  }

  /**
   * 波の速さを「速さの分布のずれ」から測る。lag 秒前の速さの分布と、いまの分布を
   * 少しずつずらして重ね、いちばんよく重なるずらし幅を求める（相互相関）。
   * 渋滞が育ったり縮んだりしていても、波全体が動く速さを安定して測れる。
   */
  class WaveXCorr {
    constructor(sim, o) {
      o = o || {};
      this.sim = sim;
      this.bin = o.bin || 2.5;
      this.lag = o.lag || 8;
      this.every = o.every || 1;
      this.keep = o.keep || 9;
      this.nb = Math.round(sim.length / this.bin);
      this.reset();
    }
    reset() { this.hist = []; this.ests = []; this.nextT = -1; }
    profile() {
      const sim = this.sim, L = sim.length, nb = this.nb, bin = this.bin;
      const u = new Float64Array(nb), x = sim.positions(), n = sim.n, half = sim.p.len / 2;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const x0 = x[i] + half;
        let x1 = x[j] + half;
        if (x1 <= x0) x1 += L;
        const b0 = Math.ceil(x0 / bin), b1 = Math.floor(x1 / bin);
        for (let b = b0; b <= b1; b++) {
          const f = (b * bin - x0) / (x1 - x0);
          u[((b % nb) + nb) % nb] = sim.v[i] * (1 - f) + sim.v[j] * f;
        }
      }
      return u;
    }
    update() {
      const sim = this.sim, t = sim.t;
      if (t < this.nextT) return;
      this.nextT = t + this.every;
      if (sim.speedStd() < 1.5) { this.hist.length = 0; this.ests.length = 0; return; }
      const u = this.profile();
      this.hist.push({ t, u });
      while (this.hist.length > 1 && this.hist[1].t <= t - this.lag + 1e-6) this.hist.shift();
      const old = this.hist[0];
      const dt = t - old.t;
      if (dt < this.lag - 0.5) return;
      const nb = this.nb, a = old.u, b = u;
      let ma = 0, mb = 0;
      for (let i = 0; i < nb; i++) { ma += a[i]; mb += b[i]; }
      ma /= nb; mb /= nb;
      const maxS = Math.ceil((12 * dt) / this.bin); // ±時速43km まで
      const cs = new Float64Array(2 * maxS + 1);
      let best = -Infinity, bs = 0;
      for (let s = -maxS; s <= maxS; s++) {
        let c = 0;
        for (let i = 0; i < nb; i++) c += (a[i] - ma) * (b[(i + s + nb) % nb] - mb);
        cs[s + maxS] = c;
        if (c > best) { best = c; bs = s; }
      }
      let frac = 0;
      if (bs > -maxS && bs < maxS) {
        const c0 = cs[bs + maxS - 1], c1 = cs[bs + maxS], c2 = cs[bs + maxS + 1];
        const den = c0 - 2 * c1 + c2;
        if (den < 0) frac = 0.5 * (c0 - c2) / den;
      }
      this.ests.push(((bs + frac) * this.bin) / dt);
      if (this.ests.length > this.keep) this.ests.shift();
    }
    /** m/s（負なら後ろ向き）。測れていなければ null */
    speed() {
      if (this.ests.length < 4) return null;
      const s = this.ests.slice().sort((p, q) => p - q);
      return s[Math.floor(s.length / 2)];
    }
  }

  return { Sim, WaveMeter, WaveXCorr, DEFAULTS, KMH, mulberry32 };
});
