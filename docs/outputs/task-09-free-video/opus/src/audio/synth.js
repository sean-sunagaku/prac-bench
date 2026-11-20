// ─────────────────────────────────────────────────────────────
//  synth.js — 音を「数式」で作る：発振器・フィルタ・エンベロープ・残響
//  サンプル素材は使わない。1秒あたり48,000個の数値をすべて計算で埋める。
// ─────────────────────────────────────────────────────────────
export const SR = 48000;

export function makeBus(n) { return { L: new Float32Array(n), R: new Float32Array(n) }; }
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// 'D4' 'F#3' 'Bb5' → MIDI 番号
export function n2m(s) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(s);
  if (!m) throw new Error('bad note ' + s);
  return NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3]) + 1) * 12;
}
export const hz = (s) => mtof(typeof s === 'number' ? s : n2m(s));

// 決定的な乱数（毎回まったく同じ音になる）
export function rng(seed = 1) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// 帯域制限のこぎり波（PolyBLEP：折り返しノイズを抑える）
function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}

// 状態変数フィルタ（TPT 型：カットオフを毎サンプル動かしても安定）
export class SVF {
  constructor() { this.ic1 = 0; this.ic2 = 0; }
  run(x, fc, q) {
    const g = Math.tan(Math.PI * Math.min(fc, SR * 0.45) / SR), k = 1 / q;
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x - this.ic2, v1 = a1 * this.ic1 + a2 * v3, v2 = this.ic2 + a2 * this.ic1 + a3 * v3;
    this.ic1 = 2 * v1 - this.ic1; this.ic2 = 2 * v2 - this.ic2;
    this.lp = v2; this.bp = v1; this.hp = x - k * v1 - v2;
    return v2;
  }
}
// 1次のハイパス（低域のこもりを取る）
export class HP1 { constructor(fc) { this.a = Math.exp(-2 * Math.PI * fc / SR); this.x1 = 0; this.y1 = 0; } run(x) { const y = this.a * (this.y1 + x - this.x1); this.x1 = x; this.y1 = y; return y; } }

// ADSR
export function adsr(t, dur, a, d, s, r) {
  if (t < 0) return 0;
  let v;
  if (t < a) v = t / a;
  else if (t < a + d) v = 1 - (1 - s) * ((t - a) / d);
  else v = s;
  if (t > dur) { const k = (t - dur) / r; v = (dur < a ? dur / a : dur < a + d ? 1 - (1 - s) * ((dur - a) / d) : s) * Math.max(0, 1 - k); v *= v > 0 ? 1 : 0; }
  return v;
}

const panL = (p) => Math.cos((p + 1) * Math.PI / 4), panR = (p) => Math.sin((p + 1) * Math.PI / 4);

// ── 楽器 ───────────────────────────────────────────────────────

// スーパーソウ：わずかにずらした7本ののこぎり波（パッド、リード）
export function supersaw(bus, t0, dur, f, o = {}) {
  const { gain = 0.1, voices = 7, detune = 0.16, a = 0.02, d = 0.3, s = 0.7, r = 0.4, cut = 3000, cutEnv = 0, cutDecay = 0.3, q = 0.8, spread = 0.85, vib = 0, seed = 1, cutLfo = 0 } = o;
  const R = rng(seed + Math.floor(f * 100));
  const n = Math.floor((dur + r) * SR), i0 = Math.floor(t0 * SR);
  const ph = [], df = [], pl = [], pr = [];
  for (let v = 0; v < voices; v++) {
    const x = voices > 1 ? v / (voices - 1) * 2 - 1 : 0;
    ph.push(R()); df.push(f * Math.pow(2, x * detune / 12) / SR);
    const p = x * spread; pl.push(panL(p)); pr.push(panR(p));
  }
  const fl = new SVF(), fr = new SVF();
  const L = bus.L, Rr = bus.R, N = L.length;
  for (let i = 0; i < n; i++) {
    const idx = i0 + i; if (idx >= N) break; if (idx < 0) continue;
    const t = i / SR;
    const env = adsr(t, dur, a, d, s, r);
    if (env <= 0 && t > dur) break;
    const vm = vib ? 1 + vib * Math.sin(2 * Math.PI * 5.2 * t) * Math.min(1, t / 0.4) : 1;
    let sl = 0, sr = 0;
    for (let v = 0; v < voices; v++) {
      const dt = df[v] * vm;
      let p = ph[v] + dt; if (p >= 1) p -= 1; ph[v] = p;
      const sm = 2 * p - 1 - blep(p, dt);
      sl += sm * pl[v]; sr += sm * pr[v];
    }
    const c = cut * (1 + cutEnv * Math.exp(-t / cutDecay)) * (1 + cutLfo * Math.sin(2 * Math.PI * 0.11 * (t0 + t)));
    const g = gain * env / Math.sqrt(voices);
    L[idx] += fl.run(sl, c, q) * g; Rr[idx] += fr.run(sr, c, q) * g;
  }
}

// 純音（第1章：左右に1つずつ）
export function sine(bus, t0, dur, f, o = {}) {
  const { gain = 0.2, a = 0.05, r = 0.3, pan = 0, ph0 = 0 } = o;
  const n = Math.floor((dur + r) * SR), i0 = Math.floor(t0 * SR);
  const gl = panL(pan), gr = panR(pan), w = 2 * Math.PI * f / SR;
  for (let i = 0; i < n; i++) {
    const idx = i0 + i; if (idx >= bus.L.length) break; if (idx < 0) continue;
    const t = i / SR;
    let env = Math.min(1, t / a); if (t > dur) env *= Math.max(0, 1 - (t - dur) / r);
    env = env * env * (3 - 2 * env);
    const v = Math.sin(w * i + ph0 + 2 * Math.PI * f * (i0 / SR)) * gain * env;
    bus.L[idx] += v * gl; bus.R[idx] += v * gr;
  }
}

// カープラス＝ストロング法の撥弦（アルペジオ）
export function pluck(bus, t0, f, o = {}) {
  const { gain = 0.2, decay = 0.996, bright = 0.5, pan = 0, len = 2.5, seed = 3 } = o;
  const R = rng(seed + Math.floor(f * 1000 + t0 * 777));
  const P = Math.max(2, Math.round(SR / f));
  const line = new Float32Array(P);
  let lp = 0;
  for (let i = 0; i < P; i++) { const x = R() * 2 - 1; lp += (x - lp) * (0.25 + bright * 0.7); line[i] = lp; }
  const n = Math.floor(len * SR), i0 = Math.floor(t0 * SR);
  const gl = panL(pan), gr = panR(pan);
  let k = 0, prev = 0;
  for (let i = 0; i < n; i++) {
    const idx = i0 + i; if (idx >= bus.L.length) break;
    const cur = line[k];
    const nxt = line[(k + 1) % P];
    line[k] = decay * (0.5 * (cur + nxt) * (0.6 + 0.4 * bright) + prev * (0.4 - 0.4 * bright));
    prev = cur;
    k = (k + 1) % P;
    const env = Math.min(1, i / 48) * (i > n - 2400 ? (n - i) / 2400 : 1);
    const v = cur * gain * env;
    if (idx >= 0) { bus.L[idx] += v * gl; bus.R[idx] += v * gr; }
  }
}

// FM 合成のベル／ガラス（第5章）とエレピ（終章）
export function fm(bus, t0, f, o = {}) {
  const { gain = 0.12, ratio = 3.5, index = 4, idxDecay = 0.25, decay = 1.2, a = 0.002, pan = 0, len = 3, ratio2 = 0, index2 = 0, idx2Decay = 0.05 } = o;
  const n = Math.floor(len * SR), i0 = Math.floor(t0 * SR);
  const gl = panL(pan), gr = panR(pan);
  const wc = 2 * Math.PI * f / SR, wm = wc * ratio, wm2 = wc * ratio2;
  for (let i = 0; i < n; i++) {
    const idx = i0 + i; if (idx >= bus.L.length) break; if (idx < 0) continue;
    const t = i / SR;
    const I = index * Math.exp(-t / idxDecay);
    const I2 = index2 * Math.exp(-t / idx2Decay);
    const env = Math.min(1, t / a) * Math.exp(-t / decay) * (i > n - 1200 ? (n - i) / 1200 : 1);
    const v = Math.sin(wc * i + I * Math.sin(wm * i) + I2 * Math.sin(wm2 * i)) * gain * env;
    bus.L[idx] += v * gl; bus.R[idx] += v * gr;
  }
}

// ベース：サイン波の土台＋フィルタを通したのこぎり波
export function bass(bus, t0, dur, f, o = {}) {
  const { gain = 0.25, cut = 420, cutEnv = 3, sub = 0.8, saw = 0.5, r = 0.06 } = o;
  const n = Math.floor((dur + r) * SR), i0 = Math.floor(t0 * SR);
  const flt = new SVF();
  let p = 0; const dt = f / SR;
  for (let i = 0; i < n; i++) {
    const idx = i0 + i; if (idx >= bus.L.length) break; if (idx < 0) continue;
    const t = i / SR;
    let env = Math.min(1, t / 0.004); if (t > dur) env *= Math.max(0, 1 - (t - dur) / r);
    p += dt; if (p >= 1) p -= 1;
    const sw = 2 * p - 1 - blep(p, dt);
    const c = cut * (1 + cutEnv * Math.exp(-t / 0.08));
    const v = (Math.sin(2 * Math.PI * p) * sub + flt.run(sw, c, 0.9) * saw) * gain * env;
    const y = Math.tanh(v * 1.3) / 1.3;
    bus.L[idx] += y; bus.R[idx] += y;
  }
}

// ── 打楽器 ─────────────────────────────────────────────────────
export function kick(bus, t0, o = {}) {
  const { gain = 0.8, decay = 0.38, pitch = 48 } = o;
  const n = Math.floor(0.7 * SR), i0 = Math.floor(t0 * SR);
  const R = rng(99 + i0);
  let ph = 0; const hp = new HP1(1500);
  for (let i = 0; i < n; i++) {
    const idx = i0 + i; if (idx >= bus.L.length) break; if (idx < 0) continue;
    const t = i / SR;
    const f = pitch + 135 * Math.exp(-t / 0.028) + 40 * Math.exp(-t / 0.2);
    ph += 2 * Math.PI * f / SR;
    const body = Math.sin(ph) * Math.exp(-t / decay) * Math.min(1, t / 0.0015);
    const click = hp.run(R() * 2 - 1) * Math.exp(-t / 0.003) * 0.5;
    const v = Math.tanh((body + click) * 1.6) * gain;
    bus.L[idx] += v; bus.R[idx] += v;
  }
}
export function snare(bus, t0, o = {}) {
  const { gain = 0.4, decay = 0.17, tone = 0.5, pan = 0 } = o;
  const n = Math.floor(0.5 * SR), i0 = Math.floor(t0 * SR);
  const R = rng(7 + i0); const bp = new SVF(); const hp = new HP1(400);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const idx = i0 + i; if (idx >= bus.L.length) break; if (idx < 0) continue;
    const t = i / SR;
    ph += 2 * Math.PI * (175 + 60 * Math.exp(-t / 0.02)) / SR;
    const body = Math.sin(ph) * Math.exp(-t / 0.07) * tone;
    bp.run(R() * 2 - 1, 2400, 0.6);
    const nz = hp.run(bp.bp) * Math.exp(-t / decay) * 1.6;
    const v = (body + nz) * gain * Math.min(1, t / 0.001);
    bus.L[idx] += v * panL(pan); bus.R[idx] += v * panR(pan);
  }
}
export function clap(bus, t0, o = {}) {
  const { gain = 0.35 } = o;
  const n = Math.floor(0.4 * SR), i0 = Math.floor(t0 * SR);
  const R = rng(13 + i0); const bp = new SVF();
  for (let i = 0; i < n; i++) {
    const idx = i0 + i; if (idx >= bus.L.length) break; if (idx < 0) continue;
    const t = i / SR;
    let env = 0;
    for (const o2 of [0, 0.011, 0.023]) if (t >= o2) env = Math.max(env, Math.exp(-(t - o2) / 0.006));
    if (t >= 0.034) env = Math.max(env, Math.exp(-(t - 0.034) / 0.13));
    bp.run(R() * 2 - 1, 1250, 0.9);
    const v = bp.bp * env * gain * 2.2;
    bus.L[idx] += v * 0.92; bus.R[idx] += v;
  }
}
// 808 風ハイハット：6つの矩形波を混ぜた金属音
const HAT_F = [205.3, 304.4, 369.6, 522.7, 540.0, 800.0].map((x) => x * 1.72);
export function hat(bus, t0, o = {}) {
  const { gain = 0.12, decay = 0.045, pan = 0.2 } = o;
  const n = Math.floor(Math.min(0.6, decay * 7) * SR), i0 = Math.floor(t0 * SR);
  const bp = new SVF(), hp = new SVF();
  const ph = HAT_F.map(() => 0);
  for (let i = 0; i < n; i++) {
    const idx = i0 + i; if (idx >= bus.L.length) break; if (idx < 0) continue;
    const t = i / SR;
    let x = 0;
    for (let k = 0; k < 6; k++) { ph[k] += HAT_F[k] / SR; if (ph[k] >= 1) ph[k] -= 1; x += ph[k] < 0.5 ? 1 : -1; }
    bp.run(x, 10000, 1.2); hp.run(bp.bp, 7500, 0.7);
    const v = hp.hp * Math.exp(-t / decay) * gain;
    bus.L[idx] += v * panL(pan); bus.R[idx] += v * panR(pan);
  }
}
export function noiseHit(bus, t0, o = {}) {
  const { gain = 0.1, decay = 0.03, fc = 6000, q = 0.7, pan = 0, len = 0.3, hpf = true } = o;
  const n = Math.floor(len * SR), i0 = Math.floor(t0 * SR);
  const R = rng(5 + i0); const f = new SVF();
  for (let i = 0; i < n; i++) {
    const idx = i0 + i; if (idx >= bus.L.length) break; if (idx < 0) continue;
    const t = i / SR;
    f.run(R() * 2 - 1, fc, q);
    const v = (hpf ? f.hp : f.bp) * Math.exp(-t / decay) * gain * Math.min(1, t / 0.0008);
    bus.L[idx] += v * panL(pan); bus.R[idx] += v * panR(pan);
  }
}
// 上昇するノイズ（盛り上げ）
export function riser(bus, t0, dur, o = {}) {
  const { gain = 0.12, f0 = 300, f1 = 9000, q = 1.2, curve = 2 } = o;
  const n = Math.floor(dur * SR), i0 = Math.floor(t0 * SR);
  const R = rng(21 + i0); const fl = new SVF(), fr = new SVF();
  for (let i = 0; i < n; i++) {
    const idx = i0 + i; if (idx >= bus.L.length) break; if (idx < 0) continue;
    const u = i / n;
    const fc = f0 * Math.pow(f1 / f0, Math.pow(u, 1.2));
    fl.run(R() * 2 - 1, fc, q); fr.run(R() * 2 - 1, fc * 1.03, q);
    const env = Math.pow(u, curve) * gain * (i > n - 240 ? (n - i) / 240 : 1);
    bus.L[idx] += fl.bp * env; bus.R[idx] += fr.bp * env;
  }
}
// 衝撃音：低いうなり＋ノイズの破裂
export function impact(bus, t0, o = {}) {
  const { gain = 0.6, len = 3.0 } = o;
  const n = Math.floor(len * SR), i0 = Math.floor(t0 * SR);
  const R = rng(31 + i0); const lp = new SVF();
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const idx = i0 + i; if (idx >= bus.L.length) break; if (idx < 0) continue;
    const t = i / SR;
    ph += 2 * Math.PI * (32 + 40 * Math.exp(-t / 0.25)) / SR;
    const boom = Math.sin(ph) * Math.exp(-t / 0.9);
    lp.run(R() * 2 - 1, 900 + 4000 * Math.exp(-t / 0.08), 0.7);
    const nz = lp.lp * Math.exp(-t / 0.35) * 0.8;
    const v = Math.tanh((boom + nz) * 1.4) * gain * Math.min(1, t / 0.001);
    bus.L[idx] += v; bus.R[idx] += v;
  }
}

// ── 空間系 ─────────────────────────────────────────────────────
// Freeverb（くし形フィルタ8本＋全域通過4本、左右で少しずらす）
export function reverb(inp, out, { room = 0.86, damp = 0.32, wet = 1.0, predelay = 0.02 } = {}) {
  const sc = SR / 44100;
  const CT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((x) => Math.round(x * sc));
  const AT = [556, 441, 341, 225].map((x) => Math.round(x * sc));
  const SP = Math.round(23 * sc);
  const N = inp.L.length;
  const pd = Math.round(predelay * SR);
  for (const [chIn, chOut, off] of [[inp.L, out.L, 0], [inp.R, out.R, SP]]) {
    const combs = CT.map((l) => ({ b: new Float32Array(l + off), i: 0, f: 0 }));
    const aps = AT.map((l) => ({ b: new Float32Array(l + off), i: 0 }));
    for (let n = 0; n < N; n++) {
      const x = (n >= pd ? chIn[n - pd] : 0) * 0.015;
      let y = 0;
      for (let c = 0; c < 8; c++) {
        const cb = combs[c]; const o = cb.b[cb.i];
        cb.f = o * (1 - damp) + cb.f * damp;
        cb.b[cb.i] = x + cb.f * room;
        if (++cb.i >= cb.b.length) cb.i = 0;
        y += o;
      }
      for (let a = 0; a < 4; a++) {
        const ap = aps[a]; const o = ap.b[ap.i];
        ap.b[ap.i] = y + o * 0.5;
        y = o - y;
        if (++ap.i >= ap.b.length) ap.i = 0;
      }
      chOut[n] += y * wet;
    }
  }
}
// ピンポン・ディレイ（付点8分）
export function delay(inp, out, { time = 0.375, fb = 0.38, wet = 0.5, lp = 4500 } = {}) {
  const D = Math.round(time * SR), N = inp.L.length;
  const bl = new Float32Array(D), br = new Float32Array(D);
  const fL = new SVF(), fR = new SVF();
  let k = 0;
  for (let n = 0; n < N; n++) {
    const yl = bl[k], yr = br[k];
    bl[k] = inp.L[n] * 0.7 + fR.run(yr, lp, 0.6) * fb;
    br[k] = inp.R[n] * 0.3 + fL.run(yl, lp, 0.6) * fb;
    out.L[n] += yl * wet; out.R[n] += yr * wet;
    if (++k >= D) k = 0;
  }
}
