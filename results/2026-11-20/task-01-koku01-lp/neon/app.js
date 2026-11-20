/**
 * KOKU-01 — SOU DESIGN LAB
 * Interactive Landing Page Controller
 *  1) Web Audio API Tactile Ratchet Click + Switch Thock + Ambient Rain / White Noise + Chime
 *  2) Interactive Screenless Focus Timer Demo (36-step magnetic ratchet dial + 24-LED perimeter ring)
 *  3) Purchase Simulator (Color / Plan / Options with strict Out-of-Stock prevention + Pre-Order Modal)
 */

(() => {
  'use strict';

  /* =========================================================================
     1. PROCEDURAL WEB AUDIO ENGINE
     ========================================================================= */
  class KokuAudioEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.muted = false;
      this.volume = 0.65;

      // Ambient sound nodes
      this.ambientMode = 'rain'; // 'silent' | 'rain' | 'white'
      this.ambientPlaying = false;
      this.ambientGain = null;
      this.ambientSource = null;
      this.rainDropletTimer = null;
      this.rainBuffer = null;
      this.whiteBuffer = null;
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : this.volume;
        this.masterGain.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    setMuted(muted) {
      this.muted = Boolean(muted);
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(
          this.muted ? 0 : this.volume,
          this.ctx.currentTime,
          0.03
        );
      }
    }

    setVolume(value01) {
      this.volume = Math.max(0, Math.min(1, value01));
      if (this.masterGain && this.ctx && !this.muted) {
        this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.03);
      }
    }

    /**
     * Synthesizes a refined magnetic ratchet detent click (36-step CNC dial)
     */
    playRatchetClick(direction = 1) {
      if (this.muted) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Short crisp metallic impulse
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      const baseFreq = direction >= 0 ? 1850 : 1620;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.016);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400, now);
      filter.Q.setValueAtTime(2.4, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.19, now + 0.0018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.026);
    }

    /**
     * Synthesizes weighted mechanical top-face press ("thock")
     */
    playTopPress(kind = 'start') {
      if (this.muted) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Low tactile switch body
      const bodyOsc = ctx.createOscillator();
      const bodyGain = ctx.createGain();
      bodyOsc.type = 'sine';
      bodyOsc.frequency.setValueAtTime(kind === 'start' ? 210 : 165, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(58, now + 0.065);

      bodyGain.gain.setValueAtTime(0.001, now);
      bodyGain.gain.linearRampToValueAtTime(0.32, now + 0.005);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

      bodyOsc.connect(bodyGain);
      bodyGain.connect(this.masterGain);
      bodyOsc.start(now);
      bodyOsc.stop(now + 0.085);

      // Subtle crisp confirmation ping on start
      if (kind === 'start') {
        const ping = ctx.createOscillator();
        const pingGain = ctx.createGain();
        ping.type = 'sine';
        ping.frequency.setValueAtTime(587.33, now + 0.03); // D5 warm tone
        pingGain.gain.setValueAtTime(0.0001, now + 0.03);
        pingGain.gain.linearRampToValueAtTime(0.09, now + 0.045);
        pingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

        ping.connect(pingGain);
        pingGain.connect(this.masterGain);
        ping.start(now + 0.03);
        ping.stop(now + 0.36);
      }
    }

    /**
     * Warm acoustic Japanese bell / harmonic bowl chord upon timer completion
     */
    playCompletionChime() {
      if (this.muted) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, delay: 0, peak: 0.16, decay: 2.1 },     // C5
        { freq: 659.25, delay: 0.16, peak: 0.13, decay: 2.3 },  // E5
        { freq: 783.99, delay: 0.32, peak: 0.14, decay: 2.7 },  // G5
        { freq: 1046.5, delay: 0.5, peak: 0.09, decay: 3.0 }    // C6 subtle harmonic
      ];

      notes.forEach(({ freq, delay, peak, decay }) => {
        const osc = ctx.createOscillator();
        const overtone = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);

        overtone.type = 'sine';
        overtone.frequency.setValueAtTime(freq * 2.002, now + delay);

        const overtoneGain = ctx.createGain();
        overtoneGain.gain.value = 0.18;

        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.linearRampToValueAtTime(peak, now + delay + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + decay);

        osc.connect(gain);
        overtone.connect(overtoneGain);
        overtoneGain.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + delay);
        overtone.start(now + delay);
        osc.stop(now + delay + decay + 0.05);
        overtone.stop(now + delay + decay + 0.05);
      });
    }

    createNoiseBuffers(ctx) {
      if (this.rainBuffer && this.whiteBuffer) return;

      const durationSec = 4;
      const length = ctx.sampleRate * durationSec;

      // Soft pink-weighted rain bed buffer (stereo)
      const rainBuf = ctx.createBuffer(2, length, ctx.sampleRate);
      // Warm studio white noise buffer (stereo)
      const whiteBuf = ctx.createBuffer(2, length, ctx.sampleRate);

      for (let ch = 0; ch < 2; ch++) {
        const rainData = rainBuf.getChannelData(ch);
        const whiteData = whiteBuf.getChannelData(ch);

        // Paul Kellet's refined pink noise filter for organic rain texture
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        let lastWhite = 0;

        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
          b6 = white * 0.115926;

          // Slight natural envelope ripple
          const swell = 0.88 + 0.12 * Math.sin((i / ctx.sampleRate) * Math.PI * 0.5 + ch);
          rainData[i] = pink * swell;

          // Gently smoothed non-harsh white noise
          lastWhite = lastWhite * 0.35 + white * 0.65;
          whiteData[i] = lastWhite * 0.16;
        }
      }

      this.rainBuffer = rainBuf;
      this.whiteBuffer = whiteBuf;
    }

    scheduleRainDroplets() {
      this.clearRainDroplets();
      const triggerDrop = () => {
        if (!this.ambientPlaying || this.ambientMode !== 'rain' || !this.ctx || !this.ambientGain) {
          return;
        }
        if (!this.muted) {
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const dropGain = this.ctx.createGain();
          const freq = 900 + Math.random() * 1900;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.55, now + 0.035);

          const amp = 0.014 + Math.random() * 0.022;
          dropGain.gain.setValueAtTime(0.0001, now);
          dropGain.gain.linearRampToValueAtTime(amp, now + 0.004);
          dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

          osc.connect(dropGain);
          dropGain.connect(this.ambientGain);
          osc.start(now);
          osc.stop(now + 0.055);
        }
        const nextMs = 110 + Math.random() * 340;
        this.rainDropletTimer = window.setTimeout(triggerDrop, nextMs);
      };
      this.rainDropletTimer = window.setTimeout(triggerDrop, 180);
    }

    clearRainDroplets() {
      if (this.rainDropletTimer) {
        window.clearTimeout(this.rainDropletTimer);
        this.rainDropletTimer = null;
      }
    }

    setAmbientMode(mode) {
      this.ambientMode = mode;
      if (this.ambientPlaying) {
        this.stopAmbient(0.18);
        if (mode !== 'silent') {
          window.setTimeout(() => {
            if (this.ambientPlaying) {
              this._startAmbientNodes();
            }
          }, 190);
        }
      }
    }

    startAmbient() {
      this.ambientPlaying = true;
      if (this.ambientMode === 'silent') return;
      this._startAmbientNodes();
    }

    _startAmbientNodes() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      this.createNoiseBuffers(ctx);
      this._teardownAmbientNodes();

      const source = ctx.createBufferSource();
      source.buffer = this.ambientMode === 'rain' ? this.rainBuffer : this.whiteBuffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      if (this.ambientMode === 'rain') {
        filter.type = 'lowpass';
        filter.frequency.value = 1850;
        filter.Q.value = 0.7;
      } else {
        filter.type = 'bandpass';
        filter.frequency.value = 1100;
        filter.Q.value = 0.45;
      }

      const gain = ctx.createGain();
      const targetLevel = this.ambientMode === 'rain' ? 0.52 : 0.36;
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(targetLevel, now + 0.65);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start(now);

      this.ambientSource = source;
      this.ambientGain = gain;

      if (this.ambientMode === 'rain') {
        this.scheduleRainDroplets();
      }
    }

    stopAmbient(fadeSec = 0.55) {
      this.clearRainDroplets();
      if (!this.ctx || !this.ambientGain || !this.ambientSource) {
        this.ambientPlaying = false;
        return;
      }
      const now = this.ctx.currentTime;
      const oldGain = this.ambientGain;
      const oldSource = this.ambientSource;
      this.ambientGain = null;
      this.ambientSource = null;

      try {
        oldGain.gain.cancelScheduledValues(now);
        oldGain.gain.setValueAtTime(Math.max(oldGain.gain.value, 0.0001), now);
        oldGain.gain.exponentialRampToValueAtTime(0.0001, now + fadeSec);
        oldSource.stop(now + fadeSec + 0.05);
      } catch (_) {
        // Ignore already-stopped audio source
      }
    }

    stopAmbientCompletely(fadeSec = 0.65) {
      this.ambientPlaying = false;
      this.stopAmbient(fadeSec);
    }

    _teardownAmbientNodes() {
      this.clearRainDroplets();
      if (this.ambientSource) {
        try {
          this.ambientSource.stop();
        } catch (_) {}
        this.ambientSource = null;
      }
      this.ambientGain = null;
    }
  }

  /* =========================================================================
     2. INTERACTIVE DEMO 1: KOKU-01 FOCUS TIMER EXPERIENCE
     ========================================================================= */
  const TOTAL_LEDS = 24;
  const MAGNETIC_STEPS = 36;
  const MAX_MINUTES = 60;
  const MIN_MINUTES = 1;

  const AMBIENT_LABELS = {
    silent: '無音モード',
    rain: '雨音モード',
    white: 'ホワイトノイズ'
  };

  class KokuTimerDemo {
    constructor(audioEngine, onSelectFinishForSim) {
      this.audio = audioEngine;
      this.onSelectFinishForSim = onSelectFinishForSim;

      // Core Timer State
      this.status = 'idle'; // 'idle' | 'running' | 'paused' | 'completed'
      this.selectedMinutes = 15;
      this.remainingSeconds = 15 * 60;
      this.speedMultiplier = 60; // Default ×60 (1 min = 1 sec) so visitor experiences full start->end smoothly
      this.ambientMode = 'rain';
      this.finish = 'silver';
      this.dialAngleDeg = this.selectedMinutes * (360 / MAGNETIC_STEPS);
      this.hasChangedSound = false;

      // RAF timing
      this.rafId = null;
      this.lastFrameTime = null;
      this.waveTimer = null;

      // Pointer drag state
      this.isDragging = false;
      this.dragStartX = 0;
      this.dragStartY = 0;
      this.dragMoved = false;
      this.dragResetTimer = null;
      this.prevPointerAngle = 0;
      this.accumulatedDeg = 0;

      // Cache DOM
      this.el = {
        stage: document.getElementById('hardwareStage'),
        unit: document.getElementById('kokuUnit'),
        knurlRing: document.getElementById('kokuKnurlRing'),
        topFace: document.getElementById('kokuTopFace'),
        topIndexDot: document.getElementById('topIndexDot'),
        topPressHint: document.getElementById('topPressHint'),
        ledRing: document.getElementById('ledRing'),
        referenceTicks: document.getElementById('referenceTicks'),
        deskHalo: document.getElementById('deskHalo'),
        readoutCard: document.getElementById('readoutCard'),
        stateBadge: document.getElementById('timerStateBadge'),
        ledCounter: document.getElementById('ledCounter'),
        timerReadout: document.getElementById('timerReadout'),
        readoutHint: document.getElementById('readoutHint'),
        demoRealDurationHint: document.getElementById('demoRealDurationHint'),
        progressFill: document.getElementById('timerProgressFill'),
        completionPanel: document.getElementById('completionPanel'),
        completionMessage: document.getElementById('completionMessage'),
        startPauseBtn: document.getElementById('demoStartPauseBtn'),
        startPauseText: document.getElementById('demoStartPauseText'),
        resetBtn: document.getElementById('demoResetBtn'),
        restartBtn: document.getElementById('restartDemoBtn'),
        demoToSimBtn: document.getElementById('demoToSimBtn'),
        stepMinusBtn: document.getElementById('stepMinusBtn'),
        stepPlusBtn: document.getElementById('stepPlusBtn'),
        audioMuteBtn: document.getElementById('audioMuteBtn'),
        audioMuteLabel: document.getElementById('audioMuteLabel'),
        volumeSlider: document.getElementById('volumeSlider'),
        acousticBar: document.getElementById('acousticBar'),
        acousticStatusLabel: document.getElementById('acousticStatusLabel'),
        acousticModeBadge: document.getElementById('acousticModeBadge'),
        waveBars: document.getElementById('waveBars'),
        journeySteps: document.querySelectorAll('#journeySteps .journey-step'),
        presetBtns: document.querySelectorAll('.preset-btn'),
        ambientBtns: document.querySelectorAll('[data-ambient]'),
        speedBtns: document.querySelectorAll('[data-speed]'),
        finishChips: document.querySelectorAll('[data-demo-finish]')
      };

      this.ledElements = [];
      this.initHardwareGeometry();
      this.bindEvents();
      this.render();
    }

    initHardwareGeometry() {
      // Build 36 precision outer reference ticks in SVG
      if (this.el.referenceTicks) {
        const frag = document.createDocumentFragment();
        for (let i = 0; i < MAGNETIC_STEPS; i++) {
          const angle = (i * 360) / MAGNETIC_STEPS - 90;
          const rad = (angle * Math.PI) / 180;
          const isMajor = i % 9 === 0;
          const r1 = isMajor ? 168 : 171;
          const r2 = 176;
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', (180 + Math.cos(rad) * r1).toFixed(2));
          line.setAttribute('y1', (180 + Math.sin(rad) * r1).toFixed(2));
          line.setAttribute('x2', (180 + Math.cos(rad) * r2).toFixed(2));
          line.setAttribute('y2', (180 + Math.sin(rad) * r2).toFixed(2));
          line.setAttribute('stroke', isMajor ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.14)');
          line.setAttribute('stroke-width', isMajor ? '1.6' : '1');
          line.setAttribute('stroke-linecap', 'round');
          frag.appendChild(line);
        }
        this.el.referenceTicks.appendChild(frag);
      }

      // Build exact 24 perimeter LEDs positioned radially in the chamfer ring
      if (this.el.ledRing) {
        const frag = document.createDocumentFragment();
        for (let i = 0; i < TOTAL_LEDS; i++) {
          const dot = document.createElement('span');
          dot.className = 'led-dot';
          const angleDeg = (i * 360) / TOTAL_LEDS - 90;
          // Use responsive CSS radius via transform rotate + translate
          dot.style.transform = `rotate(${angleDeg}deg) translate(var(--led-radius, 132px))`;
          dot.style.animationDelay = `${(i * 0.055).toFixed(2)}s`;
          frag.appendChild(dot);
          this.ledElements.push(dot);
        }
        this.el.ledRing.appendChild(frag);
        this.updateLedRadius();
        window.addEventListener('resize', () => this.updateLedRadius(), { passive: true });
      }
    }

    updateLedRadius() {
      if (!this.el.ledRing) return;
      const bezelWidth = this.el.ledRing.clientWidth || 292;
      const radius = Math.round(bezelWidth * 0.452);
      this.el.ledRing.style.setProperty('--led-radius', `${radius}px`);
    }

    bindEvents() {
      // Pointer drag rotation on outer ring & unit
      this.el.unit.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
      window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
      window.addEventListener('pointerup', (e) => this.handlePointerUp(e));
      window.addEventListener('pointercancel', (e) => this.handlePointerUp(e));

      // Top face explicit click (keyboard Enter/Space or direct click without drag)
      this.el.topFace.addEventListener('click', (e) => {
        if (this.dragMoved) {
          this.dragMoved = false;
          return;
        }
        e.stopPropagation();
        this.handleTopFacePress();
      });

      // Keyboard accessibility on hardware unit
      this.el.unit.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          this.adjustMinutes(1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          this.adjustMinutes(-1);
        } else if (e.key === ' ' || e.key === 'Enter') {
          if (e.target === this.el.unit) {
            e.preventDefault();
            this.handleTopFacePress();
          }
        }
      });

      // Stepper +/- buttons
      this.el.stepMinusBtn.addEventListener('click', () => this.adjustMinutes(-1));
      this.el.stepPlusBtn.addEventListener('click', () => this.adjustMinutes(1));

      // Quick time presets
      this.el.presetBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const mins = Number(btn.dataset.minutes);
          this.setMinutes(mins, true);
        });
      });

      // Ambient sound mode buttons
      this.el.ambientBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const mode = btn.dataset.ambient;
          this.setAmbientMode(mode);
        });
      });

      // Demo speed buttons
      this.el.speedBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const speed = Number(btn.dataset.speed);
          this.setSpeed(speed);
        });
      });

      // Hardware finish preview switcher
      this.el.finishChips.forEach((chip) => {
        chip.addEventListener('click', () => {
          const finish = chip.dataset.demoFinish;
          this.setFinish(finish);
        });
      });

      // Transport buttons
      this.el.startPauseBtn.addEventListener('click', () => this.handleTopFacePress());
      this.el.resetBtn.addEventListener('click', () => this.resetTimer());
      this.el.restartBtn.addEventListener('click', () => {
        this.resetTimer();
        this.handleTopFacePress();
      });

      this.el.demoToSimBtn.addEventListener('click', () => {
        if (typeof this.onSelectFinishForSim === 'function') {
          this.onSelectFinishForSim(this.finish);
        }
      });

      // Audio controls
      this.el.audioMuteBtn.addEventListener('click', () => {
        const nextMuted = !this.audio.muted;
        this.audio.setMuted(nextMuted);
        this.el.audioMuteBtn.setAttribute('aria-pressed', String(nextMuted));
        this.el.audioMuteLabel.textContent = nextMuted ? '消音中' : '音あり';
      });

      this.el.volumeSlider.addEventListener('input', (e) => {
        const val = Number(e.target.value) / 100;
        this.audio.setVolume(val);
        if (val > 0 && this.audio.muted) {
          this.audio.setMuted(false);
          this.el.audioMuteBtn.setAttribute('aria-pressed', 'false');
          this.el.audioMuteLabel.textContent = '音あり';
        }
      });
    }

    getPointerAngleDeg(clientX, clientY) {
      const rect = this.el.unit.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
    }

    handlePointerDown(e) {
      // Allow both dragging the outer ring and clicking the top face seamlessly
      if (this.dragResetTimer) {
        window.clearTimeout(this.dragResetTimer);
        this.dragResetTimer = null;
      }
      this.isDragging = true;
      this.dragMoved = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.prevPointerAngle = this.getPointerAngleDeg(e.clientX, e.clientY);
      this.accumulatedDeg = 0;
      this.el.unit.classList.add('is-dragging');
    }

    handlePointerMove(e) {
      if (!this.isDragging) return;

      const dist = Math.hypot(e.clientX - this.dragStartX, e.clientY - this.dragStartY);
      if (dist > 7) {
        this.dragMoved = true;
      }
      if (!this.dragMoved) return;

      const currentAngle = this.getPointerAngleDeg(e.clientX, e.clientY);
      let delta = currentAngle - this.prevPointerAngle;
      // Handle -180/180 wraparound cleanly
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      this.prevPointerAngle = currentAngle;
      this.accumulatedDeg += delta;

      const stepDeg = 360 / MAGNETIC_STEPS; // 10 degrees per magnetic ratchet click
      while (Math.abs(this.accumulatedDeg) >= stepDeg) {
        const dir = this.accumulatedDeg > 0 ? 1 : -1;
        this.accumulatedDeg -= dir * stepDeg;
        this.adjustMinutes(dir);
      }
    }

    handlePointerUp() {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.el.unit.classList.remove('is-dragging');
      if (this.dragMoved) {
        // Clear dragMoved right after any same-gesture click event finishes
        this.dragResetTimer = window.setTimeout(() => {
          this.dragMoved = false;
          this.dragResetTimer = null;
        }, 0);
      }
    }

    adjustMinutes(delta) {
      const next = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, this.selectedMinutes + delta));
      if (next === this.selectedMinutes && this.status === 'idle') return;

      // Rotating the dial while running/paused/completed smoothly transitions back to setting mode
      if (this.status === 'running' || this.status === 'paused' || this.status === 'completed') {
        this.stopLoop();
        this.audio.stopAmbientCompletely(0.25);
        this.status = 'idle';
      }

      this.selectedMinutes = next;
      this.remainingSeconds = next * 60;
      this.dialAngleDeg += delta * (360 / MAGNETIC_STEPS);
      this.audio.playRatchetClick(delta);
      this.render();
    }

    setMinutes(mins, withClick = false) {
      const clamped = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, mins));
      if (this.status !== 'idle') {
        this.stopLoop();
        this.audio.stopAmbientCompletely(0.25);
        this.status = 'idle';
      }
      const dir = clamped >= this.selectedMinutes ? 1 : -1;
      this.selectedMinutes = clamped;
      this.remainingSeconds = clamped * 60;
      this.dialAngleDeg = clamped * (360 / MAGNETIC_STEPS);
      if (withClick) {
        this.audio.playRatchetClick(dir);
      }
      this.render();
    }

    setAmbientMode(mode) {
      this.ambientMode = mode;
      this.hasChangedSound = true;
      this.audio.setAmbientMode(mode);
      this.audio.playRatchetClick(1);
      this.render();
    }

    setSpeed(speed) {
      this.speedMultiplier = speed;
      this.render();
    }

    setFinish(finish) {
      this.finish = finish;
      this.el.stage.setAttribute('data-finish', finish);
      this.el.finishChips.forEach((chip) => {
        const selected = chip.dataset.demoFinish === finish;
        chip.classList.toggle('is-selected', selected);
        chip.setAttribute('aria-checked', String(selected));
      });
    }

    animateTopPress() {
      this.el.topFace.classList.add('is-pressed');
      window.setTimeout(() => {
        this.el.topFace.classList.remove('is-pressed');
      }, 150);
    }

    handleTopFacePress() {
      this.animateTopPress();

      if (this.status === 'idle' || this.status === 'completed') {
        this.startTimer();
      } else if (this.status === 'running') {
        this.pauseTimer();
      } else if (this.status === 'paused') {
        this.resumeTimer();
      }
    }

    startTimer() {
      this.remainingSeconds = this.selectedMinutes * 60;
      this.status = 'running';
      this.audio.playTopPress('start');
      this.audio.startAmbient();
      this.startLoop();
      this.startWaveAnimation();
      this.render();
    }

    pauseTimer() {
      this.status = 'paused';
      this.stopLoop();
      this.stopWaveAnimation();
      this.audio.playTopPress('pause');
      this.audio.stopAmbientCompletely(0.35);
      this.render();
    }

    resumeTimer() {
      this.status = 'running';
      this.audio.playTopPress('start');
      this.audio.startAmbient();
      this.startLoop();
      this.startWaveAnimation();
      this.render();
    }

    resetTimer() {
      this.stopLoop();
      this.stopWaveAnimation();
      this.audio.stopAmbientCompletely(0.3);
      this.status = 'idle';
      this.remainingSeconds = this.selectedMinutes * 60;
      this.audio.playTopPress('pause');
      this.render();
    }

    completeTimer() {
      this.stopLoop();
      this.stopWaveAnimation();
      this.remainingSeconds = 0;
      this.status = 'completed';
      this.audio.stopAmbientCompletely(1.1);
      this.audio.playCompletionChime();
      this.render();
    }

    startLoop() {
      this.stopLoop();
      this.lastFrameTime = performance.now();
      const tick = (now) => {
        if (this.status !== 'running') return;
        const dtSec = Math.min(0.2, (now - this.lastFrameTime) / 1000);
        this.lastFrameTime = now;

        this.remainingSeconds -= dtSec * this.speedMultiplier;
        if (this.remainingSeconds <= 0) {
          this.completeTimer();
          return;
        }
        this.renderDynamicFrame();
        this.rafId = window.requestAnimationFrame(tick);
      };
      this.rafId = window.requestAnimationFrame(tick);
    }

    stopLoop() {
      if (this.rafId) {
        window.cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }

    startWaveAnimation() {
      this.stopWaveAnimation();
      const bars = this.el.waveBars ? Array.from(this.el.waveBars.children) : [];
      if (!bars.length) return;

      const animateBars = () => {
        if (this.status !== 'running' || this.ambientMode === 'silent') {
          bars.forEach((b) => { b.style.height = '3px'; });
          return;
        }
        bars.forEach((bar, i) => {
          const base = this.ambientMode === 'rain'
            ? 4 + Math.random() * 16
            : 8 + Math.sin(performance.now() / 190 + i * 0.7) * 5 + Math.random() * 6;
          bar.style.height = `${Math.round(Math.max(3, Math.min(22, base)))}px`;
        });
      };

      animateBars();
      this.waveTimer = window.setInterval(animateBars, 130);
    }

    stopWaveAnimation() {
      if (this.waveTimer) {
        window.clearInterval(this.waveTimer);
        this.waveTimer = null;
      }
      if (this.el.waveBars) {
        Array.from(this.el.waveBars.children).forEach((b) => {
          b.style.height = '3px';
        });
      }
    }

    formatMMSS(totalSeconds) {
      const clamped = Math.max(0, Math.ceil(totalSeconds));
      const m = Math.floor(clamped / 60);
      const s = clamped % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    computeLitLeds() {
      if (this.status === 'idle') {
        // Setting gauge: 0..60 min maps cleanly across the 24 perimeter LEDs
        return Math.max(1, Math.min(TOTAL_LEDS, Math.round((this.selectedMinutes / MAX_MINUTES) * TOTAL_LEDS)));
      }
      if (this.status === 'completed') {
        return TOTAL_LEDS; // Completion breathing bloom across all 24 LEDs
      }
      // Running or paused: full 24-LED perimeter ring tracks 100% -> 0% of active session
      const totalSec = this.selectedMinutes * 60;
      const ratio = Math.max(0, Math.min(1, this.remainingSeconds / totalSec));
      return Math.ceil(ratio * TOTAL_LEDS);
    }

    renderDynamicFrame() {
      const litCount = this.computeLitLeds();
      const totalSec = this.selectedMinutes * 60;
      const ratio = this.status === 'idle'
        ? this.selectedMinutes / MAX_MINUTES
        : this.status === 'completed'
          ? 0
          : Math.max(0, Math.min(1, this.remainingSeconds / totalSec));

      // Update 24 perimeter LEDs
      this.ledElements.forEach((dot, idx) => {
        dot.classList.remove('is-lit', 'is-leading', 'is-complete');
        if (this.status === 'completed') {
          dot.classList.add('is-complete');
        } else if (idx < litCount) {
          dot.classList.add('is-lit');
          if (this.status === 'running' && idx === litCount - 1) {
            dot.classList.add('is-leading');
          }
        }
      });

      // Readout & progress hairline
      this.el.timerReadout.textContent = this.formatMMSS(
        this.status === 'idle' ? this.selectedMinutes * 60 : this.remainingSeconds
      );

      if (this.status === 'completed') {
        this.el.ledCounter.textContent = '0 / 24 LEDs · 完了';
      } else {
        this.el.ledCounter.textContent = `${litCount} / ${TOTAL_LEDS} LEDs`;
      }

      this.el.progressFill.style.width = `${(ratio * 100).toFixed(2)}%`;
    }

    render() {
      // Dial physical rotation transform
      this.el.knurlRing.style.transform = `rotate(${this.dialAngleDeg}deg)`;
      this.el.topIndexDot.style.transform = `rotate(${this.dialAngleDeg}deg)`;

      // Halo lighting mood
      this.el.deskHalo.classList.toggle('is-running', this.status === 'running');
      this.el.deskHalo.classList.toggle('is-completed', this.status === 'completed');

      // Readout card state & labels
      this.el.readoutCard.setAttribute('data-state', this.status);

      const demoRealSec = Math.max(1, Math.round((this.selectedMinutes * 60) / this.speedMultiplier));
      const speedSummary =
        this.speedMultiplier === 1
          ? `実時間モード（×1）：${this.selectedMinutes}分間`
          : `デモ速度（×${this.speedMultiplier}）：約${demoRealSec}秒で完了`;

      this.el.demoRealDurationHint.textContent = speedSummary;

      if (this.status === 'idle') {
        this.el.stateBadge.textContent = '待機中 — ダイヤルで時間設定';
        this.el.readoutHint.textContent = `60分スケール中の ${this.selectedMinutes}分 を設定中`;
        this.el.topPressHint.querySelector('.hint-label').textContent = '天面を押して開始';
        this.el.startPauseText.textContent = `天面を押してスタート（${this.selectedMinutes}分）`;
        this.el.completionPanel.hidden = true;
      } else if (this.status === 'running') {
        this.el.stateBadge.textContent = '集中セッション中 — 24灯リング作動';
        this.el.readoutHint.textContent = `${this.selectedMinutes}分セッション進行中（${AMBIENT_LABELS[this.ambientMode]}）`;
        this.el.topPressHint.querySelector('.hint-label').textContent = '天面を押して一時停止';
        this.el.startPauseText.textContent = '天面を押して一時停止';
        this.el.completionPanel.hidden = true;
      } else if (this.status === 'paused') {
        this.el.stateBadge.textContent = '一時停止中';
        this.el.readoutHint.textContent = '天面をもう一度押すと再開します';
        this.el.topPressHint.querySelector('.hint-label').textContent = '天面を押して再開';
        this.el.startPauseText.textContent = '天面を押して再開';
        this.el.completionPanel.hidden = true;
      } else if (this.status === 'completed') {
        this.el.stateBadge.textContent = 'セッション完了';
        this.el.readoutHint.textContent = `${this.selectedMinutes}分の集中が完了しました`;
        this.el.topPressHint.querySelector('.hint-label').textContent = 'もう一度開始する';
        this.el.startPauseText.textContent = `もう一度スタート（${this.selectedMinutes}分）`;
        this.el.completionMessage.textContent =
          `${this.selectedMinutes}分の静かな集中を終えました。穏やかなチャイムと24灯の呼吸で終了をお知らせしています。`;
        this.el.completionPanel.hidden = false;
      }

      // Acoustic bar status
      const acousticActive = this.status === 'running' && this.ambientMode !== 'silent';
      this.el.acousticBar.setAttribute('data-active', String(acousticActive));
      this.el.acousticModeBadge.textContent = AMBIENT_LABELS[this.ambientMode];
      this.el.acousticStatusLabel.textContent = acousticActive
        ? 'AMBIENT SPEAKER · 再生中'
        : this.status === 'running'
          ? 'AMBIENT SPEAKER · 無音稼働'
          : 'AMBIENT SPEAKER · 待機中';

      // Sync preset chips
      this.el.presetBtns.forEach((btn) => {
        const mins = Number(btn.dataset.minutes);
        btn.classList.toggle('is-active', mins === this.selectedMinutes);
        // Dynamically update the small helper text for 5/15 min depending on speed
        const small = btn.querySelector('small');
        if (small && (mins === 5 || mins === 15)) {
          if (this.speedMultiplier === 1) {
            small.textContent = mins === 5 ? 'ショート' : '集中入門';
          } else {
            const sec = Math.max(1, Math.round((mins * 60) / this.speedMultiplier));
            small.textContent = `${sec}秒体験`;
          }
        }
      });

      // Sync ambient radios
      this.el.ambientBtns.forEach((btn) => {
        const active = btn.dataset.ambient === this.ambientMode;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-checked', String(active));
      });

      // Sync speed radios
      this.el.speedBtns.forEach((btn) => {
        const active = Number(btn.dataset.speed) === this.speedMultiplier;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-checked', String(active));
      });

      // Sync step journey indicator
      this.updateJourneySteps();

      // Update LEDs and digits
      this.renderDynamicFrame();
    }

    updateJourneySteps() {
      const steps = this.el.journeySteps;
      if (!steps || !steps.length) return;

      steps.forEach((el) => {
        el.classList.remove('is-active', 'is-done');
        const key = el.dataset.step;
        if (this.status === 'completed') {
          if (key === 'done') el.classList.add('is-active');
          else el.classList.add('is-done');
        } else if (this.status === 'running' || this.status === 'paused') {
          if (key === 'set' || key === 'sound') el.classList.add('is-done');
          if (key === 'run') el.classList.add('is-active');
        } else {
          if (key === 'set') el.classList.add(this.hasChangedSound ? 'is-done' : 'is-active');
          if (key === 'sound' && this.hasChangedSound) el.classList.add('is-active');
        }
      });
    }
  }

  /* =========================================================================
     3. INTERACTIVE DEMO 2: PURCHASE SIMULATOR (STRICT OUT-OF-STOCK GUARD)
     ========================================================================= */
  const CATALOG = {
    colors: [
      {
        id: 'silver',
        name: 'アルマイトシルバー',
        priceDelta: 0,
        inStock: true,
        badge: '受付中',
        badgeType: 'instock',
        swatchClass: 'swatch-silver',
        desc: '澄んだ金属光沢の定番アルマイト仕上げ',
        image: './assets/finish-silver.jpg'
      },
      {
        id: 'black',
        name: 'マットブラック',
        priceDelta: 0,
        inStock: true,
        badge: '受付中',
        badgeType: 'instock',
        swatchClass: 'swatch-black',
        desc: '光を吸い込む深みのある黒アルマイト',
        image: './assets/finish-black.jpg'
      },
      {
        id: 'brass',
        name: '真鍮リミテッド',
        priceDelta: 3000,
        inStock: true,
        badge: '数量限定',
        badgeType: 'limited',
        swatchClass: 'swatch-brass',
        desc: '経年変化を愉しむ無塗装真鍮削り出し',
        image: './assets/finish-brass.jpg'
      }
    ],
    plans: [
      {
        id: 'super-early',
        name: '超早割プラン（限定50台・30%OFF）',
        price: 12950,
        retailPrice: 18500,
        units: 1,
        discountLabel: '30% OFF',
        inStock: false,
        stockLabel: '在庫切れ',
        desc: '初回発表記念の限定50台枠は予定数に達したため受付を終了しました。'
      },
      {
        id: 'early-bird',
        name: '先行予約早割プラン（20%OFF）',
        price: 14800,
        retailPrice: 18500,
        units: 1,
        discountLabel: '20% OFF',
        inStock: true,
        recommended: true,
        stockLabel: 'おすすめ',
        desc: 'KOKU-01本体 1台（一般予定価格 ¥18,500 から ¥3,700 OFF・2027年3月順次発送）。'
      },
      {
        id: 'duo-pack',
        name: 'デュオセット割（2台組・25%OFF）',
        price: 27750,
        retailPrice: 37000,
        units: 2,
        discountLabel: '25% OFF',
        inStock: true,
        stockLabel: '2台セット',
        desc: 'KOKU-01本体 2台組（1台あたり ¥13,875 / 自宅とオフィス、大切な方へのギフトに）。'
      }
    ],
    options: [
      {
        id: 'felt-mat',
        name: '専用フェルトデスクマット',
        price: 2400,
        inStock: true,
        stockLabel: '在庫あり',
        desc: 'メリノウール混チャコールグレー。デスク保護と底面スピーカーの柔らかな音響拡散に最適。'
      },
      {
        id: 'braided-cable',
        name: 'USB-C 編組ファブリックケーブル（1.5m）',
        price: 1600,
        inStock: true,
        stockLabel: '在庫あり',
        desc: '机上になじむマットブラック仕上げ。充電中も美しいL字アルミコネクタ仕様。'
      },
      {
        id: 'extended-warranty',
        name: '延長保証パック（+2年／計3年保証）',
        price: 2000,
        inStock: true,
        stockLabel: '在庫あり',
        desc: '標準の1年保証に2年間を追加。バッテリー交換・磁気機構点検も対象です。'
      },
      {
        id: 'leather-case',
        name: '専用レザーキャリングケース（初回生産分）',
        price: 3800,
        inStock: false,
        stockLabel: '在庫切れ',
        desc: '植物タンニン鞣しヌメ革の携帯ハードケース。初回生産分は完売いたしました。'
      }
    ]
  };

  function formatYen(amount) {
    return `¥${Number(amount).toLocaleString('ja-JP')}`;
  }

  class KokuPurchaseSimulator {
    constructor() {
      this.selectedColorId = 'silver';
      this.selectedPlanId = 'early-bird';
      this.selectedOptionIds = new Set(['felt-mat']);

      this.el = {
        colorList: document.getElementById('simColorList'),
        planList: document.getElementById('simPlanList'),
        optionList: document.getElementById('simOptionList'),
        previewImage: document.getElementById('simPreviewImage'),
        colorBadge: document.getElementById('simColorBadge'),
        discountBadge: document.getElementById('simDiscountBadge'),
        matIndicator: document.getElementById('simMatIndicator'),
        receiptLines: document.getElementById('receiptLines'),
        savingsRow: document.getElementById('receiptSavingsRow'),
        savingsVal: document.getElementById('receiptSavingsVal'),
        retailTotal: document.getElementById('receiptRetailTotal'),
        totalAmount: document.getElementById('receiptTotalAmount'),
        warranty: document.getElementById('receiptWarranty'),
        openModalBtn: document.getElementById('openReserveModalBtn'),
        modal: document.getElementById('reserveModal'),
        closeModalBtn: document.getElementById('closeModalBtn'),
        closeSuccessBtn: document.getElementById('closeSuccessBtn'),
        modalFormView: document.getElementById('modalFormView'),
        modalSuccessView: document.getElementById('modalSuccessView'),
        modalSummaryBox: document.getElementById('modalSummaryBox'),
        modalConfirmedSummary: document.getElementById('modalConfirmedSummary'),
        reserveForm: document.getElementById('reserveForm'),
        buyerName: document.getElementById('buyerName'),
        buyerEmail: document.getElementById('buyerEmail'),
        formError: document.getElementById('reserveFormError'),
        confirmedName: document.getElementById('confirmedName'),
        confirmedOrderId: document.getElementById('confirmedOrderId')
      };

      this.renderChoices();
      this.bindEvents();
      this.updateSummary();
    }

    getColor() {
      return CATALOG.colors.find((c) => c.id === this.selectedColorId) || CATALOG.colors[0];
    }

    getPlan() {
      return CATALOG.plans.find((p) => p.id === this.selectedPlanId) || CATALOG.plans[1];
    }

    getSelectedOptions() {
      return CATALOG.options.filter((o) => o.inStock && this.selectedOptionIds.has(o.id));
    }

    selectColor(colorId) {
      const target = CATALOG.colors.find((c) => c.id === colorId);
      if (!target || !target.inStock) return; // Strict out-of-stock guard
      this.selectedColorId = colorId;
      this.renderChoices();
      this.updateSummary();
    }

    selectPlan(planId) {
      const target = CATALOG.plans.find((p) => p.id === planId);
      if (!target || !target.inStock) return; // Strict out-of-stock guard
      this.selectedPlanId = planId;
      this.renderChoices();
      this.updateSummary();
    }

    toggleOption(optionId) {
      const target = CATALOG.options.find((o) => o.id === optionId);
      if (!target || !target.inStock) return; // Strict out-of-stock guard
      if (this.selectedOptionIds.has(optionId)) {
        this.selectedOptionIds.delete(optionId);
      } else {
        this.selectedOptionIds.add(optionId);
      }
      this.renderChoices();
      this.updateSummary();
    }

    renderCheckSvg(checked) {
      if (!checked) return '';
      return `<svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2.2 6.2L4.8 8.8L9.8 3.2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    }

    renderChoices() {
      const activePlan = this.getPlan();

      // 1. Render Colors
      this.el.colorList.innerHTML = CATALOG.colors.map((color) => {
        const selected = color.id === this.selectedColorId && color.inStock;
        const soldOut = !color.inStock;
        const deltaLabel =
          color.priceDelta === 0
            ? '基本価格'
            : activePlan.units > 1
              ? `+${formatYen(color.priceDelta)} / 1台`
              : `+${formatYen(color.priceDelta)}`;

        const badgeClass = soldOut
          ? 'pill-soldout'
          : color.badgeType === 'limited'
            ? 'pill-limited'
            : 'pill-instock';

        return `
          <button
            type="button"
            class="choice-card choice-card-color ${selected ? 'is-selected' : ''} ${soldOut ? 'is-soldout' : ''}"
            data-sim-color="${color.id}"
            role="radio"
            aria-checked="${selected}"
            aria-disabled="${soldOut}"
            ${soldOut ? 'disabled tabindex="-1"' : ''}
          >
            <div class="choice-top-row">
              <span class="color-swatch-lg ${color.swatchClass}" aria-hidden="true"></span>
              <span class="pill-tag ${badgeClass}">${soldOut ? '在庫切れ' : color.badge}</span>
            </div>
            <span class="choice-name">${color.name}</span>
            <span class="choice-price">${deltaLabel}</span>
            <p class="choice-desc">${color.desc}</p>
          </button>
        `;
      }).join('');

      // 2. Render Plans
      this.el.planList.innerHTML = CATALOG.plans.map((plan) => {
        const selected = plan.id === this.selectedPlanId && plan.inStock;
        const soldOut = !plan.inStock;
        const badgeClass = soldOut
          ? 'pill-soldout'
          : plan.recommended
            ? 'pill-recommend'
            : 'pill-instock';

        return `
          <button
            type="button"
            class="choice-card ${selected ? 'is-selected' : ''} ${soldOut ? 'is-soldout' : ''}"
            data-sim-plan="${plan.id}"
            data-kind="radio"
            role="radio"
            aria-checked="${selected}"
            aria-disabled="${soldOut}"
            ${soldOut ? 'disabled tabindex="-1"' : ''}
          >
            <div class="choice-top-row">
              <div class="choice-title-group">
                <span class="choice-indicator" aria-hidden="true">${this.renderCheckSvg(selected)}</span>
                <span class="choice-name">${plan.name}</span>
                <span class="pill-tag ${badgeClass}">${plan.stockLabel}</span>
              </div>
              <div class="choice-price-col">
                <span class="choice-price">${formatYen(plan.price)}</span>
                <span class="choice-retail">${formatYen(plan.retailPrice)}</span>
              </div>
            </div>
            <p class="choice-desc">${plan.desc}</p>
          </button>
        `;
      }).join('');

      // 3. Render Options
      this.el.optionList.innerHTML = CATALOG.options.map((opt) => {
        const selected = opt.inStock && this.selectedOptionIds.has(opt.id);
        const soldOut = !opt.inStock;
        const badgeClass = soldOut ? 'pill-soldout' : 'pill-instock';

        return `
          <button
            type="button"
            class="choice-card ${selected ? 'is-selected' : ''} ${soldOut ? 'is-soldout' : ''}"
            data-sim-option="${opt.id}"
            data-kind="checkbox"
            role="checkbox"
            aria-checked="${selected}"
            aria-disabled="${soldOut}"
            ${soldOut ? 'disabled tabindex="-1"' : ''}
          >
            <div class="choice-top-row">
              <div class="choice-title-group">
                <span class="choice-indicator" aria-hidden="true">${this.renderCheckSvg(selected)}</span>
                <span class="choice-name">${opt.name}</span>
                <span class="pill-tag ${badgeClass}">${opt.stockLabel}</span>
              </div>
              <div class="choice-price-col">
                <span class="choice-price">+${formatYen(opt.price)}</span>
              </div>
            </div>
            <p class="choice-desc">${opt.desc}</p>
          </button>
        `;
      }).join('');
    }

    calculateTotals() {
      const color = this.getColor();
      const plan = this.getPlan();
      const options = this.getSelectedOptions();

      const colorExtra = color.priceDelta * plan.units;
      const optionsSum = options.reduce((acc, o) => acc + o.price, 0);

      const finalTotal = plan.price + colorExtra + optionsSum;
      const retailTotal = plan.retailPrice + colorExtra + optionsSum;
      const savings = retailTotal - finalTotal;

      return { color, plan, options, colorExtra, optionsSum, finalTotal, retailTotal, savings };
    }

    updateSummary() {
      const { color, plan, options, colorExtra, finalTotal, retailTotal, savings } = this.calculateTotals();

      // Visual preview update
      if (this.el.previewImage.getAttribute('src') !== color.image) {
        this.el.previewImage.src = color.image;
      }
      this.el.previewImage.alt = `選択中のKOKU-01：${color.name}`;
      this.el.colorBadge.textContent = plan.units > 1 ? `${color.name} × ${plan.units}台` : color.name;
      this.el.discountBadge.textContent = plan.discountLabel;

      // Felt mat badge visibility
      this.el.matIndicator.hidden = !this.selectedOptionIds.has('felt-mat');

      // Itemized receipt rows
      const lines = [
        {
          name: plan.name,
          sub: `一般予定価格 ${formatYen(plan.retailPrice)}`,
          price: formatYen(plan.price)
        },
        {
          name: `カラー：${color.name}${plan.units > 1 ? `（×${plan.units}台）` : ''}`,
          sub: color.priceDelta === 0 ? '基本価格に含まれます' : `リミテッド仕上げ加算（${formatYen(color.priceDelta)} × ${plan.units}）`,
          price: colorExtra === 0 ? '¥0' : `+${formatYen(colorExtra)}`
        }
      ];

      options.forEach((opt) => {
        lines.push({
          name: opt.name,
          sub: '追加オプション',
          price: `+${formatYen(opt.price)}`
        });
      });

      this.el.receiptLines.innerHTML = lines.map((line) => `
        <li class="receipt-line">
          <span class="line-name">
            ${line.name}
            <span class="line-sub">${line.sub}</span>
          </span>
          <span class="line-price">${line.price}</span>
        </li>
      `).join('');

      this.el.savingsVal.textContent = `−${formatYen(savings)}`;
      this.el.retailTotal.textContent = formatYen(retailTotal);
      this.el.totalAmount.textContent = formatYen(finalTotal);

      const hasExtWarranty = this.selectedOptionIds.has('extended-warranty');
      this.el.warranty.textContent = hasExtWarranty ? '計3年保証（延長パック込）' : 'メーカー保証 1年';
    }

    renderModalSummaryHtml() {
      const { color, plan, options, colorExtra, finalTotal, savings } = this.calculateTotals();
      const rows = [
        `<div class="modal-summary-row"><span>${plan.name}</span><span class="mono">${formatYen(plan.price)}</span></div>`,
        `<div class="modal-summary-row"><span>カラー：${color.name}${plan.units > 1 ? ` × ${plan.units}` : ''}</span><span class="mono">${colorExtra ? '+' + formatYen(colorExtra) : '¥0'}</span></div>`
      ];
      options.forEach((o) => {
        rows.push(`<div class="modal-summary-row"><span>${o.name}</span><span class="mono">+${formatYen(o.price)}</span></div>`);
      });
      rows.push(`<div class="modal-summary-row" style="color:#c95f1e;"><span>先行予約割引</span><span class="mono">−${formatYen(savings)}</span></div>`);
      rows.push(`<div class="modal-summary-row modal-summary-total"><span>合計金額（税込・送料無料）</span><span class="mono">${formatYen(finalTotal)}</span></div>`);
      return rows.join('');
    }

    openModal() {
      this.el.modalSummaryBox.innerHTML = this.renderModalSummaryHtml();
      this.el.modalFormView.hidden = false;
      this.el.modalSuccessView.hidden = true;
      this.el.formError.hidden = true;
      this.el.modal.hidden = false;
      document.body.style.overflow = 'hidden';
      window.setTimeout(() => this.el.buyerName.focus(), 40);
    }

    closeModal() {
      this.el.modal.hidden = true;
      document.body.style.overflow = '';
    }

    bindEvents() {
      // Delegated clicks with strict in-stock validation
      this.el.colorList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-sim-color]');
        if (!btn || btn.disabled) return;
        this.selectColor(btn.dataset.simColor);
      });

      this.el.planList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-sim-plan]');
        if (!btn || btn.disabled) return;
        this.selectPlan(btn.dataset.simPlan);
      });

      this.el.optionList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-sim-option]');
        if (!btn || btn.disabled) return;
        this.toggleOption(btn.dataset.simOption);
      });

      // Jump from Finish Gallery cards straight to Simulator with color pre-selected
      document.querySelectorAll('[data-jump-color]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const colorId = btn.dataset.jumpColor;
          this.selectColor(colorId);
          const simEl = document.getElementById('simulator');
          if (simEl) simEl.scrollIntoView({ behavior: 'smooth' });
        });
      });

      // Modal open / close / submit
      this.el.openModalBtn.addEventListener('click', () => this.openModal());
      this.el.closeModalBtn.addEventListener('click', () => this.closeModal());
      this.el.closeSuccessBtn.addEventListener('click', () => this.closeModal());

      this.el.modal.addEventListener('click', (e) => {
        if (e.target === this.el.modal) this.closeModal();
      });

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !this.el.modal.hidden) {
          this.closeModal();
        }
      });

      this.el.reserveForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = this.el.buyerName.value.trim();
        const email = this.el.buyerEmail.value.trim();

        if (!name) {
          this.el.formError.textContent = 'お名前を入力してください。';
          this.el.formError.hidden = false;
          this.el.buyerName.focus();
          return;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          this.el.formError.textContent = '有効なメールアドレスを入力してください。';
          this.el.formError.hidden = false;
          this.el.buyerEmail.focus();
          return;
        }

        this.el.formError.hidden = true;
        const codeNum = String(Math.floor(1000 + Math.random() * 9000));
        this.el.confirmedName.textContent = name;
        this.el.confirmedOrderId.textContent = `KOKU-2026-${codeNum}`;
        this.el.modalConfirmedSummary.innerHTML = this.renderModalSummaryHtml();
        this.el.modalFormView.hidden = true;
        this.el.modalSuccessView.hidden = false;
      });
    }
  }

  /* =========================================================================
     4. NAVIGATION & INITIALIZATION
     ========================================================================= */
  function initMobileNav() {
    const toggle = document.getElementById('navToggle');
    const mobileNav = document.getElementById('mobileNav');
    if (!toggle || !mobileNav) return;

    toggle.addEventListener('click', () => {
      const nextOpen = mobileNav.hidden;
      mobileNav.hidden = !nextOpen;
      toggle.setAttribute('aria-expanded', String(nextOpen));
    });

    mobileNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mobileNav.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    const audioEngine = new KokuAudioEngine();
    const simulator = new KokuPurchaseSimulator();
    new KokuTimerDemo(audioEngine, (finishId) => {
      simulator.selectColor(finishId);
    });
  });
})();
