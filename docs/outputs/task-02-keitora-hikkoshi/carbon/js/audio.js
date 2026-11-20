(function (root) {
  'use strict';

  class SoundManager {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.engineNodes = null;
      this.engineRunning = false;
    }

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        return;
      }
      try {
        const AudioCtx = root.AudioContext || root.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
      } catch (e) {
        this.ctx = null;
      }
    }

    setMuted(muted) {
      this.muted = !!muted;
      if (this.muted) {
        this.stopEngine();
      }
    }

    toggleMute() {
      this.setMuted(!this.muted);
      return this.muted;
    }

    startEngine() {
      if (this.muted) return;
      this.init();
      if (!this.ctx || this.engineRunning) return;

      try {
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(52, now);
        osc2.frequency.setValueAtTime(104, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(190, now);
        filter.Q.setValueAtTime(2.5, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.045, now + 0.25);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);

        this.engineNodes = { osc1, osc2, filter, gain };
        this.engineRunning = true;
      } catch (e) {
        this.engineRunning = false;
      }
    }

    updateEngine(speedMs, throttle, uphillLoad) {
      if (!this.engineRunning || !this.engineNodes || !this.ctx || this.muted) return;
      const now = this.ctx.currentTime;
      const absSpeed = Math.abs(speedMs || 0);
      const rpmNorm = Math.min(1.4, absSpeed / 9.5 + (throttle || 0) * 0.35 + Math.max(0, uphillLoad || 0) * 0.2);
      const baseFreq = 46 + rpmNorm * 68;
      this.engineNodes.osc1.frequency.setTargetAtTime(baseFreq, now, 0.06);
      this.engineNodes.osc2.frequency.setTargetAtTime(baseFreq * 1.98, now, 0.06);
      this.engineNodes.filter.frequency.setTargetAtTime(160 + rpmNorm * 260, now, 0.08);
      const targetVol = 0.032 + Math.min(0.045, (throttle || 0) * 0.032 + absSpeed * 0.002);
      this.engineNodes.gain.gain.setTargetAtTime(targetVol, now, 0.08);
    }

    stopEngine() {
      if (!this.engineRunning || !this.engineNodes || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const { osc1, osc2, gain } = this.engineNodes;
        gain.gain.setTargetAtTime(0.0001, now, 0.06);
        osc1.stop(now + 0.2);
        osc2.stop(now + 0.2);
      } catch (e) {}
      this.engineNodes = null;
      this.engineRunning = false;
    }

    _tone(freqStart, freqEnd, duration, type, vol, delay) {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      try {
        const t0 = this.ctx.currentTime + (delay || 0);
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freqStart, t0);
        if (freqEnd && freqEnd !== freqStart) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + duration);
        }
        g.gain.setValueAtTime(Math.max(0.001, vol || 0.1), t0);
        g.gain.exponentialRampToValueAtTime(0.0008, t0 + duration);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(t0);
        osc.stop(t0 + duration + 0.02);
      } catch (e) {}
    }

    _noiseBurst(duration, filterFreq, vol, delay) {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      try {
        const t0 = this.ctx.currentTime + (delay || 0);
        const sampleCount = Math.max(256, Math.floor(this.ctx.sampleRate * duration));
        const buf = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < sampleCount; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / sampleCount, 1.6);
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buf;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(filterFreq || 800, t0);
        filter.Q.setValueAtTime(1.2, t0);

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol || 0.12, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

        src.connect(filter);
        filter.connect(g);
        g.connect(this.ctx.destination);
        src.start(t0);
      } catch (e) {}
    }

    playPickup() {
      this._tone(320, 520, 0.08, 'triangle', 0.09, 0);
    }

    playRotate() {
      this._tone(480, 620, 0.055, 'sine', 0.07, 0);
    }

    playPlace(soundType) {
      if (soundType === 'soft') {
        this._noiseBurst(0.11, 260, 0.10, 0);
        this._tone(110, 68, 0.10, 'sine', 0.09, 0);
      } else if (soundType === 'metal') {
        this._tone(190, 95, 0.13, 'triangle', 0.12, 0);
        this._noiseBurst(0.07, 1100, 0.07, 0);
      } else if (soundType === 'ceramic' || soundType === 'glass') {
        this._tone(780, 520, 0.09, 'sine', 0.08, 0);
        this._tone(190, 110, 0.09, 'triangle', 0.08, 0);
      } else {
        this._tone(155, 82, 0.11, 'triangle', 0.12, 0);
        this._noiseBurst(0.08, 450, 0.08, 0);
      }
    }

    playRopeTie() {
      this._tone(260, 590, 0.13, 'sawtooth', 0.06, 0);
      this._tone(680, 740, 0.06, 'triangle', 0.08, 0.12);
    }

    playRopeSnap() {
      this._noiseBurst(0.18, 1600, 0.22, 0);
      this._tone(540, 110, 0.22, 'sawtooth', 0.15, 0);
    }

    playHorn() {
      // Adorable Kei-Truck "Puppuh!" double horn
      this._tone(440, 440, 0.11, 'square', 0.065, 0);
      this._tone(554, 554, 0.11, 'triangle', 0.065, 0);
      this._tone(440, 440, 0.18, 'square', 0.07, 0.15);
      this._tone(554, 554, 0.18, 'triangle', 0.07, 0.15);
    }

    playImpact(soundType, dmgAmount) {
      const sev = Math.min(1, Math.max(0.2, (dmgAmount || 8) / 35));
      if (soundType === 'ceramic' || soundType === 'glass') {
        this._noiseBurst(0.16, 2800, 0.16 * sev, 0);
        this._tone(1320, 680, 0.14, 'sine', 0.11 * sev, 0);
        this._tone(1780, 920, 0.11, 'triangle', 0.09 * sev, 0.03);
      } else if (soundType === 'metal') {
        this._noiseBurst(0.15, 1300, 0.16 * sev, 0);
        this._tone(260, 92, 0.18, 'sawtooth', 0.12 * sev, 0);
      } else {
        this._noiseBurst(0.13, 520, 0.15 * sev, 0);
        this._tone(140, 60, 0.14, 'triangle', 0.13 * sev, 0);
      }
    }

    playDrop() {
      this._tone(520, 150, 0.34, 'triangle', 0.13, 0);
      this._noiseBurst(0.26, 900, 0.20, 0.18);
    }

    playGoal() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => {
        this._tone(f, f, 0.22, 'triangle', 0.11, i * 0.09);
      });
    }

    playStamp(isGood) {
      // Heavy hanko "DON!"
      this._tone(125, 42, 0.22, 'triangle', 0.22, 0);
      this._noiseBurst(0.14, 380, 0.18, 0);
      if (isGood) {
        this._tone(880, 1174, 0.22, 'sine', 0.09, 0.12);
      } else {
        this._tone(220, 145, 0.30, 'sawtooth', 0.08, 0.12);
      }
    }
  }

  root.GameAudio = new SoundManager();
})(typeof window !== 'undefined' ? window : globalThis);
