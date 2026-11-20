/* 効果音と BGM。音源ファイルは使わず WebAudio で合成する。 */
(function (root) {
  'use strict';
  const KT = (root.KT = root.KT || {});

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  const A = {
    ctx: null,
    muted: false,
    musicOn: true,
    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.muted = localStorage.getItem('kt-muted') === '1';
      } catch (e) { /* 使えない環境では無視 */ }
      const ctx = (this.ctx = new AC());
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(ctx.destination);
      this.sfx = ctx.createGain();
      this.sfx.gain.value = 0.8;
      this.sfx.connect(this.master);
      this.music = ctx.createGain();
      this.music.gain.value = 0.2;
      this.music.connect(this.master);
      const len = ctx.sampleRate;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    },
    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    setMuted(m) {
      this.muted = m;
      try { localStorage.setItem('kt-muted', m ? '1' : '0'); } catch (e) { /* noop */ }
      if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
    },

    // ---- 基本の音 ----
    noise(t, dur, o = {}) {
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = o.type || 'lowpass';
      f.frequency.setValueAtTime(o.freq || 800, t);
      if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t + dur);
      f.Q.value = o.q || 0.8;
      const g = ctx.createGain();
      const peak = o.gain ?? 0.4;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + (o.attack || 0.005));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(o.out || this.sfx);
      src.start(t, Math.random() * 0.5);
      src.stop(t + dur + 0.05);
    },
    tone(t, freq, dur, o = {}) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t + dur);
      const g = ctx.createGain();
      const peak = o.gain ?? 0.2;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + (o.attack || 0.006));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(o.out || this.sfx);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    },
    ok() {
      return this.ctx && !this.muted;
    },

    // ---- 効果音 ----
    click() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      this.tone(t, 880, 0.06, { type: 'triangle', gain: 0.12 });
    },
    pick() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      this.tone(t, 420, 0.08, { type: 'triangle', gain: 0.12, slideTo: 620 });
    },
    place(mass = 10) {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      const f = KT.clamp(500 - mass * 6, 120, 500);
      this.noise(t, 0.12, { freq: f, gain: 0.35 });
      this.tone(t, f * 0.4, 0.12, { type: 'sine', gain: 0.25, slideTo: f * 0.25 });
    },
    thud(power, sound) {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      const g = KT.clamp(power * 0.12, 0.04, 0.5);
      const base = { box: 380, soft: 220, metal: 900, glass: 1200, wood: 520, ceramic: 1000, fruit: 300 }[sound] || 400;
      this.noise(t, 0.09 + power * 0.03, { freq: base, gain: g, q: 1.2 });
      if (sound === 'metal') this.tone(t, 310 + Math.random() * 80, 0.18, { type: 'triangle', gain: g * 0.4 });
      if (sound === 'wood') this.tone(t, 180 + Math.random() * 40, 0.1, { type: 'sine', gain: g * 0.5 });
    },
    crash(sound) {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      if (sound === 'glass' || sound === 'ceramic') {
        this.noise(t, 0.5, { type: 'highpass', freq: 2500, gain: 0.45 });
        for (let i = 0; i < 7; i++) this.tone(t + i * 0.03 + Math.random() * 0.03, 2200 + Math.random() * 3000, 0.2, { type: 'sine', gain: 0.07 });
      } else if (sound === 'fruit') {
        this.noise(t, 0.25, { freq: 500, gain: 0.5, q: 2 });
        this.tone(t, 160, 0.2, { gain: 0.3, slideTo: 60 });
      } else if (sound === 'metal') {
        this.noise(t, 0.35, { freq: 1600, gain: 0.4, type: 'bandpass', q: 2 });
        [523, 739, 1100].forEach((f) => this.tone(t, f, 0.5, { type: 'triangle', gain: 0.07 }));
      } else {
        this.noise(t, 0.3, { freq: 900, gain: 0.5, q: 1.5 });
        this.noise(t + 0.05, 0.2, { freq: 300, gain: 0.35 });
      }
    },
    /** 車体が段差を越えたときの「ガタン」（power 0..1） */
    bump(power) {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      const g = KT.clamp(0.12 + power * 0.5, 0.1, 0.62);
      this.noise(t, 0.12 + power * 0.08, { freq: 170 + power * 120, gain: g, q: 0.9 });
      this.tone(t, 78 + Math.random() * 10, 0.16, { type: 'sine', gain: g * 0.7, slideTo: 42 });
      // 荷台のあおりが鳴る
      if (power > 0.45) this.noise(t + 0.02, 0.07, { type: 'bandpass', freq: 1300 + Math.random() * 300, gain: g * 0.35, q: 4 });
    },
    /** スローモーションに入るときの「ヒュッ」 */
    slowmo() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      this.noise(t, 0.35, { type: 'bandpass', freq: 1800, freqTo: 380, gain: 0.16, q: 2.5 });
      this.tone(t, 520, 0.3, { type: 'sine', gain: 0.05, slideTo: 260 });
    },
    fall() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      this.tone(t, 1200, 0.45, { type: 'sine', gain: 0.08, slideTo: 300 });
      this.noise(t + 0.4, 0.2, { freq: 260, gain: 0.45 });
    },
    snap() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      this.noise(t, 0.12, { type: 'highpass', freq: 1800, gain: 0.5 });
      this.tone(t, 900, 0.15, { type: 'square', gain: 0.08, slideTo: 120 });
    },
    rope() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      this.noise(t, 0.18, { type: 'bandpass', freq: 1400, freqTo: 600, gain: 0.25, q: 3 });
      this.tone(t + 0.12, 660, 0.08, { type: 'triangle', gain: 0.1 });
    },
    horn() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      [[0, 0.16], [0.22, 0.32]].forEach(([d, l]) => {
        this.tone(t + d, 392, l, { type: 'square', gain: 0.07, attack: 0.01 });
        this.tone(t + d, 494, l, { type: 'square', gain: 0.06, attack: 0.01 });
      });
    },
    start() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      [523, 659, 784].forEach((f, i) => this.tone(t + i * 0.08, f, 0.2, { type: 'triangle', gain: 0.14 }));
    },
    goal() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      [523, 659, 784, 1046].forEach((f, i) => this.tone(t + i * 0.1, f, 0.35, { type: 'square', gain: 0.07 }));
    },
    tick() {
      if (!this.ok()) return;
      this.tone(this.ctx.currentTime, 1500 + Math.random() * 200, 0.03, { type: 'square', gain: 0.04 });
    },
    cash() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      this.noise(t, 0.08, { type: 'highpass', freq: 3000, gain: 0.2 });
      this.tone(t + 0.05, 2093, 0.8, { gain: 0.14 });
      this.tone(t + 0.05, 2637, 0.8, { gain: 0.1 });
    },
    stamp() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      this.noise(t, 0.15, { freq: 200, gain: 0.7 });
      this.tone(t, 90, 0.2, { gain: 0.5, slideTo: 50 });
    },
    warn() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      this.tone(t, 330, 0.12, { type: 'square', gain: 0.06 });
      this.tone(t + 0.14, 262, 0.16, { type: 'square', gain: 0.06 });
    },

    // ---- エンジン音 ----
    startEngine() {
      if (!this.ctx || this.eng) return;
      const ctx = this.ctx;
      const o1 = ctx.createOscillator();
      o1.type = 'sawtooth';
      const o2 = ctx.createOscillator();
      o2.type = 'square';
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 400;
      f.Q.value = 2;
      const g = ctx.createGain();
      g.gain.value = 0;
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 18;
      lfoG.gain.value = 0.02;
      lfo.connect(lfoG).connect(g.gain);
      o1.connect(f);
      o2.connect(f);
      f.connect(g).connect(this.sfx);
      o1.start();
      o2.start();
      lfo.start();
      this.eng = { o1, o2, f, g, lfo };
    },
    setEngine(rpm, throttle) {
      if (!this.eng) return;
      const t = this.ctx.currentTime;
      const base = 34 + rpm * 95;
      this.eng.o1.frequency.setTargetAtTime(base, t, 0.06);
      this.eng.o2.frequency.setTargetAtTime(base * 0.5, t, 0.06);
      this.eng.lfo.frequency.setTargetAtTime(base * 0.25, t, 0.06);
      this.eng.f.frequency.setTargetAtTime(260 + rpm * 900 + throttle * 300, t, 0.08);
      this.eng.g.gain.setTargetAtTime(0.045 + throttle * 0.035 + rpm * 0.02, t, 0.08);
    },
    stopEngine() {
      if (!this.eng) return;
      const e = this.eng;
      const t = this.ctx.currentTime;
      e.g.gain.setTargetAtTime(0, t, 0.1);
      setTimeout(() => { try { e.o1.stop(); e.o2.stop(); e.lfo.stop(); } catch (err) { /* noop */ } }, 600);
      this.eng = null;
    },

    // ---- 踏切の音 ----
    crossing(near) {
      if (!this.ok()) return;
      const now = this.ctx.currentTime;
      if (near > 0 && (!this.lastBell || now - this.lastBell > 0.42)) {
        this.lastBell = now;
        const g = 0.09 * near;
        this.tone(now, 1180, 0.25, { type: 'square', gain: g });
        this.tone(now, 1520, 0.2, { type: 'sine', gain: g * 0.6 });
      }
    },

    // ---- BGM（王道進行のゆるいループ） ----
    startMusic(tempo = 104) {
      if (!this.ctx) return;
      this.stopMusic();
      const ctx = this.ctx;
      const spb = 60 / tempo / 4; // 16分音符
      const chords = [[53, 57, 60], [55, 59, 62], [52, 55, 59], [57, 60, 64]];
      const bass = [41, 43, 40, 45];
      const mel = [
        69, 0, 72, 0, 74, 0, 72, 69, 67, 0, 69, 0, 72, 0, 0, 0,
        71, 0, 74, 0, 76, 0, 74, 71, 69, 0, 67, 0, 74, 0, 0, 0,
        67, 0, 71, 0, 76, 0, 74, 71, 67, 0, 64, 0, 67, 0, 69, 0,
        72, 0, 71, 0, 69, 0, 64, 0, 69, 0, 0, 0, 0, 0, 0, 0,
      ];
      let step = 0;
      let next = ctx.currentTime + 0.1;
      const out = this.music;
      this.musicTimer = setInterval(() => {
        if (!this.musicOn) return;
        while (next < ctx.currentTime + 0.2) {
          const bar = Math.floor(step / 16) % 4;
          const s = step % 16;
          if (s % 4 === 0) this.tone(next, midi(bass[bar]), spb * 3, { type: 'triangle', gain: 0.35, out });
          if (s % 4 === 2) this.tone(next, midi(bass[bar] + 12), spb * 1.5, { type: 'triangle', gain: 0.2, out });
          if (s === 4 || s === 12) chords[bar].forEach((n) => this.tone(next, midi(n + 12), spb * 1.4, { type: 'square', gain: 0.035, out }));
          if (s % 2 === 1) this.noise(next, 0.03, { type: 'highpass', freq: 7000, gain: 0.05, out });
          const m = mel[(step % 64)];
          if (m && (Math.floor(step / 64) % 2 === 0 || s % 8 < 6)) this.tone(next, midi(m), spb * 1.8, { type: 'triangle', gain: 0.16, out });
          step++;
          next += spb;
        }
      }, 50);
    },
    stopMusic() {
      if (this.musicTimer) clearInterval(this.musicTimer);
      this.musicTimer = null;
    },
  };

  KT.Audio = A;
})(typeof window !== 'undefined' ? window : globalThis);
