// ─────────────────────────────────────────────────────────────
//  song.js — 作曲と編曲。映像と同じ時間設計図（timeline.js）で鳴らす
//  ニ短調 120BPM。第6章でホ短調へ転調し、終章はニ長調で終わる。
// ─────────────────────────────────────────────────────────────
import { SR, makeBus, hz, n2m, mtof, supersaw, sine, pluck, fm, bass, kick, snare, clap, hat, noiseHit, riser, impact, reverb, delay, SVF, HP1 } from './synth.js';
import { BAR, BEAT, DURATION, ROOT_HZ, INTERVALS, LISSAJOUS_DETUNE, PROMPT_TIMES, REPLY_TIMES, DISSOLVE_START } from '../timeline.js';

const b = (bar, beat = 0) => bar * BAR + beat * BEAT;
const tr = (note, semi) => mtof(n2m(note) + semi);
const F = (x) => (typeof x === 'number' ? x : hz(x));   // 音名でも周波数でも

// コード（和音）の構成音
const CH = {
  Dm: ['D3', 'F3', 'A3', 'D4'], Bb: ['Bb2', 'D3', 'F3', 'Bb3'], F: ['F2', 'A2', 'C3', 'F3'], C: ['C3', 'E3', 'G3', 'C4'],
  Gm: ['G2', 'Bb2', 'D3', 'G3'], A: ['A2', 'C#3', 'E3', 'A3'], Em: ['E3', 'G3', 'B3', 'E4'], G: ['G2', 'B2', 'D3', 'G3'],
  D: ['D3', 'F#3', 'A3', 'D4'], Bm: ['B2', 'D3', 'F#3', 'B3'], Em7: ['E3', 'G3', 'B3', 'D4'], AC: ['C#3', 'E3', 'A3', 'C#4'], DF: ['F#2', 'A2', 'D3', 'F#3'],
};
// 上の声部（明るい和音の配置）
const HI = {
  Bb: ['D4', 'F4', 'Bb4', 'D5'], F: ['C4', 'F4', 'A4', 'C5'], C: ['C4', 'E4', 'G4', 'C5'], Dm: ['D4', 'F4', 'A4', 'D5'], A: ['C#4', 'E4', 'A4', 'C#5'],
  Gm: ['D4', 'G4', 'Bb4', 'D5'], G: ['D4', 'G4', 'B4', 'D5'], D: ['D4', 'F#4', 'A4', 'D5'], Em: ['E4', 'G4', 'B4', 'E5'],
};
const ROOT = { Dm: 'D2', Bb: 'Bb1', F: 'F2', C: 'C2', Gm: 'G1', A: 'A1', Em: 'E2', G: 'G1', D: 'D2', Bm: 'B1', Em7: 'E2', AC: 'A1', DF: 'D2' };

// 主旋律（サビ）：[拍, 音, 長さ(拍)]
const THEME_A = [
  [[0, 'D5', 1.5], [1.5, 'C5', 0.5], [2, 'D5', 1], [3, 'F5', 1]],
  [[0, 'A5', 2], [2, 'G5', 1], [3, 'F5', 1]],
  [[0, 'E5', 1.5], [1.5, 'F5', 0.5], [2, 'G5', 1], [3, 'E5', 1]],
  [[0, 'D5', 3], [3, 'A4', 1]],
  [[0, 'D5', 1.5], [1.5, 'C5', 0.5], [2, 'D5', 1], [3, 'F5', 1]],
  [[0, 'A5', 1], [1, 'C6', 1], [2, 'A5', 0.5], [2.5, 'G5', 0.5], [3, 'F5', 1]],
  [[0, 'G5', 2], [2, 'E5', 1], [3, 'C5', 1]],
  [[0, 'C#5', 2], [2, 'E5', 1], [3, 'A5', 1]],
];
const THEME_B = [
  [[0, 'Bb4', 1], [1, 'D5', 1], [2, 'G5', 1], [3, 'F5', 1]],
  [[0, 'F5', 2], [2, 'D5', 1], [3, 'C5', 1]],
  [[0, 'A4', 1], [1, 'C5', 1], [2, 'F5', 1], [3, 'E5', 1]],
  [[0, 'E5', 2], [2, 'G5', 1], [3, 'E5', 1]],
  [[0, 'D5', 1], [1, 'G5', 1], [2, 'Bb5', 1], [3, 'A5', 1]],
  [[0, 'A5', 2], [2, 'F5', 1], [3, 'D5', 1]],
  [[0, 'F5', 1], [1, 'E5', 1], [2, 'D5', 1], [3, 'A5', 1]],
  [[0, 'G5', 2], [2, 'E5', 1], [3, 'C5', 1]],
];
const THEME_END = [
  [[0, 'A5', 3], [3, 'F#5', 1]], [[0, 'D5', 4]], [[0, 'E5', 1.5], [1.5, 'F#5', 0.5], [2, 'G5', 1], [3, 'E5', 1]], [[0, 'D5', 2], [2, 'F#5', 2]],
  [[0, 'B5', 2], [2, 'A5', 1], [3, 'G5', 1]], [[0, 'F#5', 2], [2, 'A5', 2]], [[0, 'G5', 2], [2, 'E5', 2]], [[0, 'E5', 2], [2, 'C#5', 1], [3, 'E5', 1]], [[0, 'D5', 4]],
];

export function renderSong(onProgress = () => {}) {
  const N = Math.ceil(DURATION * SR);
  const dry = makeBus(N), duck = makeBus(N), verb = makeBus(N), dly = makeBus(N);
  const kicks = [];

  // 1音ずつ一時バッファに描いて、行き先（素・ダッキング・残響・ディレイ）へ配る
  function play(len, t0, sends, fn) {
    const n = Math.ceil(len * SR);
    const tmp = makeBus(n);
    fn(tmp);
    const i0 = Math.round(t0 * SR);
    for (const [bus, g] of sends) {
      if (!g) continue;
      const L = bus.L, R = bus.R;
      for (let i = 0; i < n; i++) { const j = i0 + i; if (j < 0 || j >= N) continue; L[j] += tmp.L[i] * g; R[j] += tmp.R[i] * g; }
    }
  }
  const K = (t, o = {}) => { kicks.push(t); play(0.7, t, [[dry, 1]], (x) => kick(x, 0, o)); };
  const SN = (t, o = {}, v = 0.12) => play(0.5, t, [[dry, 1], [verb, v]], (x) => snare(x, 0, o));
  const CL = (t, o = {}) => play(0.4, t, [[dry, 1], [verb, 0.18]], (x) => clap(x, 0, o));
  const HH = (t, o = {}) => play(0.7, t, [[dry, 1], [verb, 0.03]], (x) => hat(x, 0, o));
  const CRASH = (t, g = 0.09) => play(2.6, t, [[dry, 1], [verb, 0.35]], (x) => noiseHit(x, 0, { gain: g, decay: 0.9, fc: 5200, q: 0.5, len: 2.6 }));
  const PAD = (t, dur, notes, o = {}, s = [0.8, 0.55]) => { for (const nt of notes) play(dur + (o.r ?? 0.8) + 0.05, t, [[o.duck ? duck : dry, s[0]], [verb, s[1]]], (x) => supersaw(x, 0, dur, F(nt), { r: 0.8, ...o })); };
  const LEAD = (bar, phrase, semi = 0, o = {}, s = [0.9, 0.28, 0.3]) => phrase.forEach(([bt, nt, d]) => {
    const t = b(bar, bt), dur = d * BEAT - 0.03;
    play(dur + 0.35, t, [[dry, s[0]], [verb, s[1]], [dly, s[2]]], (x) => supersaw(x, 0, dur, tr(nt, semi), { gain: 0.15, voices: 5, detune: 0.11, a: 0.006, d: 0.15, s: 0.8, r: 0.25, cut: 4200, cutEnv: 0.8, cutDecay: 0.15, q: 0.9, spread: 0.4, vib: 0.0035, ...o }));
  });
  const BASSN = (t, dur, nt, o = {}) => play(dur + (o.r ?? 0.06) + 0.05, t, [[duck, 1]], (x) => bass(x, 0, dur, F(nt), o));

  // ── 序章（0〜8秒）：打鍵音、返答の粒、そして溶けていく音 ─────────────
  PAD(0.3, 7.6, ['D3', 'A3', 'E4', 'F4', 'A4'], { gain: 0.05, a: 2.5, d: 1, s: 1, cut: 650, cutLfo: 0.25, detune: 0.12 }, [0.7, 0.7]);
  play(9, 0.5, [[dry, 1]], (x) => sine(x, 0, 7.5, hz('D2'), { gain: 0.05, a: 2.0, r: 1.0 }));
  const R = (() => { let s = 77; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  for (const t of PROMPT_TIMES) {
    play(0.1, t, [[dry, 1], [verb, 0.12]], (x) => { noiseHit(x, 0, { gain: 0.09, decay: 0.0045, fc: 2600 + R() * 1200, q: 0.8, len: 0.06, pan: (R() - 0.5) * 0.4 }); fm(x, 0, 420 + R() * 80, { gain: 0.05, ratio: 1.5, index: 2, idxDecay: 0.004, decay: 0.012, len: 0.06 }); });
  }
  const PENTA = ['D6', 'E6', 'F#6', 'A6', 'B6', 'D7', 'B6', 'A6'];
  REPLY_TIMES.forEach((t, i) => play(0.5, t, [[dry, 0.8], [verb, 0.3], [dly, 0.25]], (x) => fm(x, 0, hz(PENTA[i % PENTA.length]), { gain: 0.035, ratio: 2, index: 1.2, idxDecay: 0.05, decay: 0.09, len: 0.5, pan: Math.sin(i) * 0.5 })));
  play(2.0, DISSOLVE_START, [[dry, 1], [verb, 0.5]], (x) => riser(x, 0, 8.0 - DISSOLVE_START, { gain: 0.09, f0: 300, f1: 7000, curve: 2.2 }));

  // ── 第1章 音（8〜24秒）：左右の純音。右は D3 のまま、左が音程を変えていく ─────
  play(17, b(4), [[dry, 1], [verb, 0.18]], (x) => sine(x, 0, b(12) - b(4) - 0.6, ROOT_HZ + LISSAJOUS_DETUNE, { gain: 0.12, a: 0.9, r: 1.2, pan: 1, ph0: 0 }));
  INTERVALS.forEach((iv, i) => {
    const t = b(4 + i) - (i ? 0.18 : 0), dur = BAR + (i ? 0.18 : 0) + (i === 7 ? -0.6 : 0);
    const f = ROOT_HZ * iv.a / iv.b;
    play(dur + 0.5, t, [[dry, 1], [verb, 0.18]], (x) => sine(x, 0, dur, f, { gain: 0.12, a: i ? 0.36 : 0.9, r: i === 7 ? 1.2 : 0.36, pan: -1, ph0: 2 * Math.PI * f * t }));
  });
  PAD(b(4), 16 - 0.5, ['D3', 'A3', 'D4'], { gain: 0.03, a: 3, s: 1, cut: 900, detune: 0.1 }, [0.6, 0.6]);
  for (let br = 6; br < 12; br++) K(b(br), { gain: 0.22, decay: 0.3 });
  play(2.4, b(11), [[dry, 1], [verb, 0.4]], (x) => riser(x, 0, 2.0, { gain: 0.05, f0: 500, f1: 6000 }));

  // ── 第2章 無限（24〜40秒）：撥弦のアルペジオが、拡大とともに明るくなる ─────
  const P2 = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A'];
  const ARP = { Dm: ['D4', 'F4', 'A4', 'D5', 'F5', 'A5'], Bb: ['Bb3', 'D4', 'F4', 'Bb4', 'D5', 'F5'], F: ['F4', 'A4', 'C5', 'F5', 'A5', 'C6'], C: ['C4', 'E4', 'G4', 'C5', 'E5', 'G5'], Gm: ['G3', 'Bb3', 'D4', 'G4', 'Bb4', 'D5'], A: ['A3', 'C#4', 'E4', 'A4', 'C#5', 'E5'], Em: ['E4', 'G4', 'B4', 'E5', 'G5', 'B5'], G: ['G3', 'B3', 'D4', 'G4', 'B4', 'D5'], D: ['D4', 'F#4', 'A4', 'D5', 'F#5', 'A5'] };
  const UPDOWN = [0, 1, 2, 3, 4, 5, 4, 3, 1, 2, 3, 4, 5, 4, 3, 2];
  const arp = (bar, chord, o = {}, s = [0.75, 0.3, 0.35], step = 0.25) => {
    for (let k = 0; k < 4 / step; k++) {
      const nt = ARP[chord][UPDOWN[k % 16]];
      play(o.len ?? 2.2, b(bar, k * step), [[dry, s[0]], [verb, s[1]], [dly, s[2]]], (x) => pluck(x, 0, hz(nt), { gain: 0.1, bright: 0.45, decay: 0.994, pan: (k % 2 ? 0.35 : -0.35), len: 2.0, ...o }));
    }
  };
  P2.forEach((c, i) => {
    const bar = 12 + i;
    arp(bar, c, { bright: 0.25 + 0.07 * i, gain: 0.085 + 0.004 * i });
    PAD(b(bar), BAR - 0.05, CH[c], { gain: 0.04, a: 0.4, s: 0.9, cut: 700 + 260 * i, detune: 0.14 }, [0.7, 0.5]);
    BASSN(b(bar), BAR - 0.08, ROOT[c], { gain: 0.15, saw: 0.18, cut: 300 });
    if (bar >= 16) { K(b(bar), { gain: 0.6 }); K(b(bar, 2), { gain: 0.6 }); for (let s8 = 0; s8 < 8; s8++) HH(b(bar, s8 * 0.5 + 0.5), { gain: 0.04, decay: 0.035 }); }
    if (bar >= 14 && bar < 16) for (let s8 = 0; s8 < 4; s8++) HH(b(bar, s8 + 0.5), { gain: 0.03, decay: 0.03 });
  });
  play(2.4, b(19), [[dry, 1], [verb, 0.4]], (x) => riser(x, 0, 2.0, { gain: 0.07, f0: 400, f1: 8000 }));
  CRASH(b(20), 0.06);

  // ── 第3章 生命（40〜56秒）：有機的なリズム → 盛り上げ → 一瞬の無音 ─────
  const P3 = ['Gm', 'Bb', 'F', 'C', 'Gm', 'Bb', 'Dm', 'A'];
  const MAL = [0, 1.5, 3, 4.5, 6, 7];   // 3+3+2 のシンコペーション（8分）
  P3.forEach((c, i) => {
    const bar = 20 + i;
    const build = bar >= 26;
    PAD(b(bar), BAR - 0.05, CH[c], { gain: build ? 0.05 : 0.042, a: 0.2, s: 0.9, cut: build ? 1600 + (bar - 26) * 2400 : 1500, detune: 0.15 }, [0.7, 0.5]);
    MAL.forEach((e, k) => {
      const nt = ARP[c][[0, 2, 4, 3, 5, 1][k]];
      play(1.4, b(bar, e * 0.5), [[dry, 0.8], [verb, 0.25], [dly, 0.25]], (x) => fm(x, 0, hz(nt), { gain: 0.07, ratio: 4.0, index: 2.4, idxDecay: 0.04, decay: 0.35, len: 1.4, pan: (k % 2 ? 0.4 : -0.4) }));
    });
    if (!build) {
      K(b(bar), { gain: 0.62 }); K(b(bar, 2.5), { gain: 0.55 });
      SN(b(bar, 2), { gain: 0.22, decay: 0.09, tone: 0.3 }, 0.15);
      for (let s16 = 0; s16 < 16; s16++) play(0.1, b(bar, s16 * 0.25 + (s16 % 2 ? 0.03 : 0)), [[dry, 1]], (x) => noiseHit(x, 0, { gain: s16 % 4 === 2 ? 0.05 : 0.028, decay: 0.018, fc: 6500, q: 0.7, len: 0.09, pan: 0.3 }));
      [[0, 0], [1.5, 0], [2.5, 7], [3.5, 12]].forEach(([bt, semi]) => BASSN(b(bar, bt), 0.42, mtof(n2m(ROOT[c]) + 12 + semi), { gain: 0.17, saw: 0.5, cut: 380 }));
    } else {
      BASSN(b(bar), BAR - 0.1, ROOT[c], { gain: 0.15, saw: 0.35, cut: 300 + (bar - 26) * 400 });
    }
  });
  // スネアロール：8分 → 16分 → 32分。最後の半拍は無音
  for (let k = 0; k < 8; k++) SN(b(26, k * 0.5), { gain: 0.14 + k * 0.012, decay: 0.08 }, 0.1);
  for (let k = 0; k < 8; k++) SN(b(27, k * 0.25), { gain: 0.22 + k * 0.01, decay: 0.07 }, 0.1);
  for (let k = 0; k < 6; k++) SN(b(27, 2 + k * 0.125), { gain: 0.3 + k * 0.012, decay: 0.06 }, 0.1);
  play(4.2, b(26), [[dry, 1], [verb, 0.3]], (x) => riser(x, 0, b(27, 3) - b(26), { gain: 0.13, f0: 350, f1: 11000, curve: 2.5 }));

  // ── 第4章 大地（56〜72秒）：サビ。四つ打ち、うねるベース、主旋律 ─────
  const drop = (bar0, prog, theme, semi, o = {}) => {
    prog.forEach((c, i) => {
      const bar = bar0 + i;
      const last = i === prog.length - 1;
      for (let q = 0; q < 4; q++) K(b(bar, q), { gain: 0.82 });
      CL(b(bar, 1)); CL(b(bar, 3));
      for (let s16 = 0; s16 < 16; s16++) HH(b(bar, s16 * 0.25), { gain: s16 % 2 ? 0.05 : 0.03, decay: 0.03, pan: 0.25 });
      for (let q = 0; q < 4; q++) HH(b(bar, q + 0.5), { gain: 0.055, decay: 0.16, pan: -0.2 });
      PAD(b(bar), BAR - 0.06, HI[c].map((nn) => mtof(n2m(nn) + semi)), { gain: 0.08, a: 0.01, d: 0.4, s: 0.75, r: 0.3, cut: 2600, cutEnv: 0.6, cutDecay: 0.25, detune: 0.2, duck: true }, [1.0, 0.25]);
      // うねるベース（拍頭以外の16分）
      for (let s16 = 0; s16 < 16; s16++) if (s16 % 4) BASSN(b(bar, s16 * 0.25), 0.11, mtof(n2m(ROOT[c]) + 12 + semi), { gain: 0.14, saw: 0.7, cut: 520, cutEnv: 4 });
      BASSN(b(bar), BAR - 0.05, mtof(n2m(ROOT[c]) + semi), { gain: 0.07, saw: 0.0, sub: 1.0 });
      arp(bar, c, { gain: 0.04, bright: 0.7 }, [0.6, 0.25, 0.3]);
      if (last && o.fill !== false) for (let k = 0; k < 8; k++) SN(b(bar, 2 + k * 0.25), { gain: 0.16 + k * 0.02, decay: 0.07 }, 0.12);
    });
    theme.forEach((ph, i) => LEAD(bar0 + i, ph, semi));
  };
  play(3.2, b(28), [[dry, 1], [verb, 0.35]], (x) => impact(x, 0, { gain: 0.55 }));
  CRASH(b(28), 0.1);
  drop(28, ['Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'A'], THEME_A, 0);
  THEME_A.slice(4).forEach((ph, i) => LEAD(32 + i, ph, 12, { gain: 0.05 }, [0.8, 0.3, 0.25]));
  play(2.4, b(35), [[dry, 1], [verb, 0.4]], (x) => riser(x, 0, 2.0, { gain: 0.08, f0: 600, f1: 9000 }));

  // ── 第5章 光（72〜88秒）：ガラスの鐘のアルペジオ、後半の旋律 ─────
  play(3.2, b(36), [[dry, 1], [verb, 0.4]], (x) => impact(x, 0, { gain: 0.5 }));
  CRASH(b(36), 0.1);
  const P5 = ['Gm', 'Bb', 'F', 'C', 'Gm', 'Bb', 'Dm', 'C'];
  P5.forEach((c, i) => {
    const bar = 36 + i;
    K(b(bar)); K(b(bar, 1.5)); K(b(bar, 2.5));
    SN(b(bar, 1), { gain: 0.3, decay: 0.15 }, 0.16); SN(b(bar, 3), { gain: 0.3, decay: 0.15 }, 0.16);
    SN(b(bar, 3.75), { gain: 0.07, decay: 0.05 }, 0.05);
    for (let s16 = 0; s16 < 16; s16++) HH(b(bar, s16 * 0.25), { gain: s16 % 2 ? 0.045 : 0.025, decay: 0.028, pan: 0.3 });
    PAD(b(bar), BAR - 0.06, HI[c], { gain: 0.05, a: 0.05, s: 0.85, r: 0.5, cut: 2000, detune: 0.18, duck: true }, [1.0, 0.35]);
    for (let e = 0; e < 8; e++) BASSN(b(bar, e * 0.5), 0.2, mtof(n2m(ROOT[c]) + (e % 2 ? 12 : 0)), { gain: 0.15, saw: 0.55, cut: 450 });
    // ガラスの鐘：3オクターブを駆け上がる16分
    for (let s16 = 0; s16 < 16; s16++) {
      const tones = ARP[c]; const oct = Math.floor(s16 / 6) * 12 - 12;
      const fb = mtof(n2m(tones[s16 % 6]) + oct);
      play(1.8, b(bar, s16 * 0.25), [[dry, 0.7], [verb, 0.4], [dly, 0.35]], (x) => fm(x, 0, fb, { gain: 0.055, ratio: 3.5, index: 3.2 * Math.min(1, 700 / fb), idxDecay: 0.12, decay: 0.45, len: 1.8, pan: Math.sin(s16 * 1.3) * 0.6 }));
    }
  });
  THEME_B.forEach((ph, i) => LEAD(36 + i, ph, 0, { gain: 0.12, cut: 3200 }, [0.85, 0.32, 0.32]));
  THEME_B.forEach((ph, i) => ph.forEach(([bt, nt, d]) => play(2.5, b(36 + i, bt), [[dry, 0.6], [verb, 0.4]], (x) => fm(x, 0, hz(nt) * 2, { gain: 0.04, ratio: 2, index: 1.5, idxDecay: 0.3, decay: 0.9, len: 2.5 }))));
  for (let k = 0; k < 8; k++) SN(b(43, 2 + k * 0.25), { gain: 0.14 + k * 0.02, decay: 0.07 }, 0.12);

  // ── 第6章 宇宙（88〜104秒）：ホ短調へ。軌道の説明の静けさ → 銀河の誕生で頂点へ ─────
  play(3.2, b(44), [[dry, 1], [verb, 0.5]], (x) => impact(x, 0, { gain: 0.4 }));
  PAD(b(44), BAR * 2 - 0.1, ['C3', 'G3', 'C4', 'E4', 'G4'], { gain: 0.06, a: 1.2, s: 1, cut: 900, cutLfo: 0.3, vib: 0.003, detune: 0.2 }, [0.7, 0.7]);
  PAD(b(45), BAR - 0.05, ['D3', 'A3', 'D4', 'F#4', 'A4'], { gain: 0.05, a: 0.8, s: 1, cut: 1400, vib: 0.003, detune: 0.2 }, [0.7, 0.6]);
  arp(44, 'C', { gain: 0.06, bright: 0.4 }); arp(45, 'D', { gain: 0.07, bright: 0.55 });
  for (let k = 0; k < 8; k++) SN(b(45, k * 0.5), { gain: 0.1 + k * 0.012, decay: 0.08 }, 0.12);
  for (let k = 0; k < 8; k++) SN(b(45, 2 + k * 0.25), { gain: 0.18 + k * 0.015, decay: 0.07 }, 0.12);
  play(4.2, b(44), [[dry, 1], [verb, 0.3]], (x) => riser(x, 0, BAR * 2 - 0.1, { gain: 0.12, f0: 300, f1: 12000, curve: 2.6 }));
  // 92秒：銀河が生まれる瞬間に頂点
  play(3.2, b(46), [[dry, 1], [verb, 0.45]], (x) => impact(x, 0, { gain: 0.6 }));
  CRASH(b(46), 0.11);
  const P6 = ['C', 'G', 'D', 'Em', 'C', 'G'];
  const toE = { C: 'Bb', G: 'F', D: 'C', Em: 'Dm' };   // ニ短調の進行を全音上げたもの
  P6.forEach((c, i) => {
    const bar = 46 + i;
    const last = bar === 51;
    if (!last) {
      for (let q = 0; q < 4; q++) K(b(bar, q), { gain: 0.84 });
      CL(b(bar, 1)); CL(b(bar, 3));
      for (let s16 = 0; s16 < 16; s16++) HH(b(bar, s16 * 0.25), { gain: s16 % 2 ? 0.05 : 0.03, decay: 0.03, pan: 0.25 });
      for (let q = 0; q < 4; q++) HH(b(bar, q + 0.5), { gain: 0.06, decay: 0.16, pan: -0.2 });
      for (let s16 = 0; s16 < 16; s16++) if (s16 % 4) BASSN(b(bar, s16 * 0.25), 0.11, mtof(n2m(ROOT[toE[c]]) + 14), { gain: 0.14, saw: 0.7, cut: 540, cutEnv: 4 });
      BASSN(b(bar), BAR - 0.05, mtof(n2m(ROOT[toE[c]]) + 2), { gain: 0.07, saw: 0.0, sub: 1.0 });
    } else {
      CRASH(b(bar), 0.08);
      BASSN(b(bar), BAR * 1.5, mtof(n2m(ROOT[toE[c]]) + 2), { gain: 0.13, saw: 0.1, sub: 1.0, r: 1.0 });
    }
    PAD(b(bar), (last ? 2.5 : 1) * BAR - 0.06, HI[toE[c]].map((nn) => mtof(n2m(nn) + 2)), { gain: 0.085, a: 0.01, d: 0.4, s: 0.78, r: last ? 1.5 : 0.3, cut: 2900, cutEnv: 0.6, cutDecay: 0.25, detune: 0.22, duck: !last }, [1.0, 0.3]);
    PAD(b(bar), (last ? 2.5 : 1) * BAR - 0.06, CH[toE[c]].map((nn) => mtof(n2m(nn) + 14)), { gain: 0.035, a: 0.3, s: 1, r: 1.0, cut: 3500, vib: 0.004, detune: 0.1 }, [0.6, 0.6]);
    arp(bar, c, { gain: 0.045, bright: 0.75 }, [0.6, 0.25, 0.3]);
  });
  THEME_A.slice(0, 6).forEach((ph, i) => { LEAD(46 + i, ph, 2, { gain: 0.15 }); LEAD(46 + i, ph, 14, { gain: 0.06 }, [0.7, 0.35, 0.3]); });

  // ── 終章（104〜124秒）：ニ長調。第1章の純音（3:2）が戻り、静かに終わる ─────
  play(3.2, b(52), [[dry, 0.8], [verb, 0.5]], (x) => impact(x, 0, { gain: 0.25 }));
  play(9.5, b(52), [[dry, 1], [verb, 0.25]], (x) => sine(x, 0, 8.0, ROOT_HZ * 1.5, { gain: 0.11, a: 1.5, r: 1.5, pan: -1 }));
  play(9.5, b(52), [[dry, 1], [verb, 0.25]], (x) => sine(x, 0, 8.0, ROOT_HZ + LISSAJOUS_DETUNE, { gain: 0.11, a: 1.5, r: 1.5, pan: 1 }));
  const PF = ['D', 'D', 'AC', 'Bm', 'G', 'DF', 'Em7', 'A', 'D', 'D'];
  PF.forEach((c, i) => {
    const bar = 52 + i;
    const end = bar >= 60;
    PAD(b(bar), (end ? 2 : 1) * BAR - 0.05, CH[c], { gain: 0.04, a: 0.6, s: 1, r: end ? 2.5 : 0.8, cut: 1100, detune: 0.12 }, [0.7, 0.6]);
    if (bar === 61) return;
    // エレピ（FM）：和音をそっと分散
    const notes = CH[c];
    [0, 1, 2, 3, 2, 1, 3, 2].forEach((k, e) => {
      if (end && e > 0) return;
      play(3.2, b(bar, e * 0.5), [[dry, 0.8], [verb, 0.45]], (x) => fm(x, 0, hz(notes[k]) * 2, { gain: 0.045, ratio: 1, index: 1.6, idxDecay: 0.4, decay: 1.4, len: 3.2, ratio2: 14, index2: 0.4, idx2Decay: 0.02, pan: (e % 2 ? 0.25 : -0.25) }));
    });
    if (THEME_END[i]) THEME_END[i].forEach(([bt, nt, d]) => play(4, b(bar, bt), [[dry, 0.85], [verb, 0.5], [dly, 0.15]], (x) => fm(x, 0, hz(nt), { gain: 0.075, ratio: 1, index: 1.8, idxDecay: 0.5, decay: 1.8, len: 4, ratio2: 14, index2: 0.6, idx2Decay: 0.02 })));
    BASSN(b(bar), BAR - 0.1, ROOT[c], { gain: 0.1, saw: 0.05, sub: 1.0 });
    if (bar >= 54 && bar < 58) { for (let q = 0; q < 4; q++) K(b(bar, q), { gain: 0.32, decay: 0.3 }); for (let q = 0; q < 4; q++) HH(b(bar, q + 0.5), { gain: 0.025, decay: 0.03 }); }
  });
  // 「Claude Opus 5.5」が現れる瞬間の鐘
  ['D5', 'F#5', 'A5', 'D6'].forEach((nt, k) => play(5, b(60, 0.4) + k * 0.06, [[dry, 0.7], [verb, 0.6], [dly, 0.2]], (x) => fm(x, 0, hz(nt), { gain: 0.04, ratio: 3.5, index: 2.0, idxDecay: 0.4, decay: 2.2, len: 5, pan: (k - 1.5) * 0.3 })));
  // 「次は、何をつくりましょうか。」の打鍵
  for (let k = 1; k <= 14; k++) play(0.5, b(52) + 17.3 + k / 14, [[dry, 0.7], [verb, 0.3], [dly, 0.2]], (x) => fm(x, 0, hz(PENTA[k % PENTA.length]), { gain: 0.022, ratio: 2, index: 1.0, idxDecay: 0.05, decay: 0.08, len: 0.5 }));
  onProgress(0.6);

  // ── ミックス ───────────────────────────────────────────────
  // サイドチェイン：キックのたびにパッドとベースを一瞬引っ込める（うねりの正体）
  kicks.sort((a, c) => a - c);
  const duckEnv = new Float32Array(N).fill(1);
  for (const kt of kicks) {
    const i0 = Math.round(kt * SR), n = Math.round(0.45 * SR);
    for (let i = 0; i < n; i++) {
      const j = i0 + i; if (j >= N) break;
      const t = i / SR;
      const g = 1 - 0.62 * Math.min(1, t / 0.004) * Math.exp(-t / 0.13);
      if (g < duckEnv[j]) duckEnv[j] = g;
    }
  }
  const out = makeBus(N);
  for (let i = 0; i < N; i++) { out.L[i] = dry.L[i] + duck.L[i] * duckEnv[i]; out.R[i] = dry.R[i] + duck.R[i] * duckEnv[i]; }
  onProgress(0.7);
  delay(dly, out, { time: BEAT * 0.75, fb: 0.36, wet: 0.5, lp: 4200 });
  delay(dly, verb, { time: BEAT * 0.75, fb: 0.2, wet: 0.2, lp: 3000 });
  onProgress(0.78);
  reverb(verb, out, { room: 0.87, damp: 0.35, wet: 1.0, predelay: 0.025 });
  onProgress(0.9);
  master(out);
  onProgress(1);
  return { L: out.L, R: out.R, sr: SR };
}

// マスター：低域の掃除 → コンプレッサー → 音量合わせ → リミッター
function master(bus) {
  const N = bus.L.length;
  const hl = new HP1(28), hr = new HP1(28);
  for (let i = 0; i < N; i++) { bus.L[i] = hl.run(bus.L[i]); bus.R[i] = hr.run(bus.R[i]); }
  // なめらかなコンプレッサー（RMS 検出、2:1）
  let env = 0; const att = Math.exp(-1 / (0.01 * SR)), rel = Math.exp(-1 / (0.2 * SR));
  const thr = Math.pow(10, -16 / 20);
  for (let i = 0; i < N; i++) {
    const x = Math.max(Math.abs(bus.L[i]), Math.abs(bus.R[i]));
    const e2 = x * x;
    env = e2 > env ? att * env + (1 - att) * e2 : rel * env + (1 - rel) * e2;
    const lvl = Math.sqrt(env);
    const g = lvl > thr ? Math.pow(lvl / thr, 1 / 2 - 1) : 1;
    bus.L[i] *= g; bus.R[i] *= g;
  }
  // 音量合わせ：大きい部分の平均（簡易ラウドネス）を基準値へ
  const blk = SR * 0.4; const pw = [];
  for (let s = 0; s + blk < N; s += blk) { let a = 0; for (let i = s; i < s + blk; i++) a += bus.L[i] * bus.L[i] + bus.R[i] * bus.R[i]; pw.push(a / (2 * blk)); }
  const gated = pw.filter((p) => p > 1e-5);
  const mean = gated.reduce((a, c) => a + c, 0) / Math.max(1, gated.length);
  const target = Math.pow(10, -15.5 / 10);
  const gain = Math.sqrt(target / mean);
  // 先読みリミッター（-1 dBFS）
  const ceil = Math.pow(10, -1.2 / 20), look = Math.round(0.002 * SR);
  let gr = 1; const relL = Math.exp(-1 / (0.08 * SR));
  const peak = new Float32Array(N);
  for (let i = 0; i < N; i++) peak[i] = Math.max(Math.abs(bus.L[i]), Math.abs(bus.R[i])) * gain;
  const L = new Float32Array(bus.L), R = new Float32Array(bus.R);
  for (let i = 0; i < N; i++) {
    let p = 0; for (let k = 0; k <= look; k += 8) { const j = i + k; if (j < N && peak[j] > p) p = peak[j]; }
    const want = p > ceil ? ceil / p : 1;
    gr = want < gr ? want : relL * gr + (1 - relL) * want;
    const j = i;
    bus.L[j] = Math.tanh(L[j] * gain * gr / ceil * 0.98) * ceil;
    bus.R[j] = Math.tanh(R[j] * gain * gr / ceil * 0.98) * ceil;
  }
}
