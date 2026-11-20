(function (global) {
  'use strict';

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.engineOsc = null;
      this.engineOsc2 = null;
      this.engineGain = null;
      this.engineFilter = null;
      this.engineRunning = false;
      this.lastCrossingBell = 0;
    }

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        return;
      }
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
      } catch (_) {
        this.ctx = null;
      }
    }

    setMuted(m) {
      this.muted = !!m;
      if (this.engineGain && this.ctx) {
        this.engineGain.gain.setTargetAtTime(this.muted ? 0 : 0.04, this.ctx.currentTime, 0.05);
      }
    }

    toggleMute() {
      this.setMuted(!this.muted);
      return this.muted;
    }

    startEngine() {
      this.init();
      if (!this.ctx || this.engineRunning) return;
      try {
        const t = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(52, t);
        osc2.frequency.setValueAtTime(104, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(220, t);
        filter.Q.setValueAtTime(2.5, t);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(this.muted ? 0 : 0.045, t + 0.25);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(t);
        osc2.start(t);

        this.engineOsc = osc1;
        this.engineOsc2 = osc2;
        this.engineFilter = filter;
        this.engineGain = gain;
        this.engineRunning = true;
      } catch (_) {}
    }

    updateEngine(speedMs, throttle, isDriving) {
      if (!this.ctx || !this.engineRunning) return;
      const t = this.ctx.currentTime;
      if (this.muted || !isDriving) {
        this.engineGain.gain.setTargetAtTime(0.0001, t, 0.08);
        return;
      }
      const absSpd = Math.abs(speedMs);
      const baseHz = 48 + absSpd * 7.2 + throttle * 28;
      this.engineOsc.frequency.setTargetAtTime(baseHz, t, 0.06);
      this.engineOsc2.frequency.setTargetAtTime(baseHz * 1.5, t, 0.06);
      this.engineFilter.frequency.setTargetAtTime(190 + absSpd * 30 + throttle * 210, t, 0.07);
      const vol = 0.032 + throttle * 0.032 + Math.min(0.025, absSpd * 0.002);
      this.engineGain.gain.setTargetAtTime(vol, t, 0.06);
    }

    stopEngine() {
      if (!this.engineRunning) return;
      try {
        if (this.engineOsc) this.engineOsc.stop();
        if (this.engineOsc2) this.engineOsc2.stop();
      } catch (_) {}
      this.engineOsc = null;
      this.engineOsc2 = null;
      this.engineGain = null;
      this.engineFilter = null;
      this.engineRunning = false;
    }

    _noiseBurst(duration, filterFreq, filterType, volume) {
      if (this.muted || !this.ctx) return;
      const sr = this.ctx.sampleRate;
      const len = Math.max(1, Math.floor(sr * duration));
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.35));
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;

      const filter = this.ctx.createBiquadFilter();
      filter.type = filterType || 'bandpass';
      filter.frequency.value = filterFreq || 900;

      const gain = this.ctx.createGain();
      gain.gain.value = volume || 0.12;

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start();
    }

    _tone(freqStart, freqEnd, duration, type, volume, delay) {
      if (this.muted || !this.ctx) return;
      const t = this.ctx.currentTime + (delay || 0);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freqStart, t);
      if (freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + duration);
      }
      gain.gain.setValueAtTime(volume || 0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.02);
    }

    playPickup() {
      this.init();
      this._tone(320, 480, 0.08, 'triangle', 0.09);
    }

    playRotate() {
      this.init();
      this._tone(520, 660, 0.055, 'sine', 0.07);
    }

    playPlace(massKg) {
      this.init();
      const heavy = Math.min(1, (massKg || 20) / 60);
      const f = 150 - heavy * 65;
      this._tone(f, 48, 0.13 + heavy * 0.06, 'sine', 0.15 + heavy * 0.08);
      this._noiseBurst(0.07, 450 - heavy * 200, 'lowpass', 0.08 + heavy * 0.06);
    }

    playRopeTie() {
      this.init();
      this._tone(240, 560, 0.12, 'triangle', 0.08);
      this._tone(420, 310, 0.08, 'sine', 0.06, 0.09);
    }

    playRopeSnap() {
      this.init();
      this._noiseBurst(0.16, 2400, 'highpass', 0.22);
      this._tone(900, 140, 0.16, 'sawtooth', 0.12);
    }

    playImpact(soundKind, strength) {
      this.init();
      const s = Math.max(0.25, Math.min(1.0, strength || 0.6));
      if (soundKind === 'glass') {
        this._noiseBurst(0.14, 3400, 'highpass', 0.14 * s);
        this._tone(2100, 1400, 0.09, 'triangle', 0.08 * s);
        this._tone(2850, 1900, 0.08, 'sine', 0.06 * s, 0.03);
      } else if (soundKind === 'water') {
        this._noiseBurst(0.22, 1200, 'bandpass', 0.16 * s);
        this._tone(420, 680, 0.11, 'sine', 0.07 * s);
      } else if (soundKind === 'ceramic') {
        this._noiseBurst(0.12, 2200, 'bandpass', 0.15 * s);
        this._tone(1100, 540, 0.10, 'triangle', 0.09 * s);
      } else {
        this._tone(135, 42, 0.13, 'sine', 0.16 * s);
        this._noiseBurst(0.09, 520, 'lowpass', 0.12 * s);
      }
    }

    playBreak(soundKind) {
      this.init();
      if (soundKind === 'glass' || soundKind === 'ceramic') {
        this._noiseBurst(0.32, 3000, 'highpass', 0.24);
        this._tone(2600, 950, 0.14, 'triangle', 0.10);
        this._tone(3200, 1400, 0.16, 'sine', 0.08, 0.04);
        this._tone(1850, 720, 0.18, 'triangle', 0.07, 0.08);
      } else if (soundKind === 'water') {
        this._noiseBurst(0.38, 1000, 'bandpass', 0.24);
        this._tone(360, 720, 0.15, 'sine', 0.10);
      } else {
        this._noiseBurst(0.22, 850, 'bandpass', 0.22);
        this._tone(180, 50, 0.22, 'sawtooth', 0.12);
      }
    }

    playDropAlert() {
      this.init();
      this._tone(440, 290, 0.14, 'sawtooth', 0.10);
      this._tone(290, 175, 0.22, 'sawtooth', 0.11, 0.13);
    }

    playHorn() {
      this.init();
      this._tone(392, 392, 0.14, 'sawtooth', 0.07);
      this._tone(494, 494, 0.14, 'sawtooth', 0.06);
      this._tone(392, 392, 0.18, 'sawtooth', 0.07, 0.18);
      this._tone(494, 494, 0.18, 'sawtooth', 0.06, 0.18);
    }

    playCrossingBell(nowSec) {
      if (nowSec - this.lastCrossingBell < 0.45) return;
      this.lastCrossingBell = nowSec;
      this.init();
      this._tone(1180, 1170, 0.26, 'sine', 0.055);
      this._tone(2370, 2350, 0.18, 'sine', 0.025);
    }

    playStartEngineRev() {
      this.init();
      this._tone(65, 165, 0.28, 'sawtooth', 0.09);
      this._tone(165, 115, 0.22, 'sawtooth', 0.07, 0.26);
    }

    playInvalid() {
      this.init();
      this._tone(190, 130, 0.08, 'triangle', 0.08);
    }

    playCushion() {
      this.init();
      this._tone(210, 120, 0.10, 'sine', 0.07);
      this._noiseBurst(0.06, 360, 'lowpass', 0.05);
    }

    playSuspensionThump(strength) {
      this.init();
      const s = Math.max(0.25, Math.min(1.0, strength || 0.5));
      this._tone(92, 38, 0.14, 'sine', 0.14 * s);
      this._noiseBurst(0.08, 280, 'lowpass', 0.09 * s);
    }

    playGoalFanfare() {
      this.init();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, idx) => {
        this._tone(f, f, idx === 3 ? 0.45 : 0.14, 'triangle', 0.11, idx * 0.11);
      });
    }

    playStamp(isGood) {
      this.init();
      this._tone(isGood ? 140 : 100, 40, 0.20, 'sine', 0.22);
      this._noiseBurst(0.10, 600, 'lowpass', 0.16);
      if (isGood) {
        this._tone(784, 1046, 0.22, 'triangle', 0.09, 0.06);
      }
    }
  }

  const exportsObj = { SoundEngine };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObj;
  } else {
    global.Keitora = Object.assign(global.Keitora || {}, exportsObj);
  }
})(typeof window !== 'undefined' ? window : globalThis);
