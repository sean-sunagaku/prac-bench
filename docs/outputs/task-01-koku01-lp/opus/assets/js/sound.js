/* KOKU-01 sound engine (Web Audio API, no audio files)
 * - ratchet click / press / bump / start / end chime
 * - ambient: rain, white noise
 */
(function () {
  'use strict';
  var KOKU = (window.KOKU = window.KOKU || {});

  var AMBIENT_LEVEL = 0.55;

  var Sound = {
    ctx: null,
    master: null,
    sfx: null,
    amb: null,
    enabled: true,
    _buffers: {},
    _ambient: { mode: 'off', out: null, nodes: [], dropTimer: 0 },
    _active: false,        // ambient is driven by a running timer
    _preview: { timer: 0, onEnd: null, mode: null },

    /* AudioContext is created lazily inside a user gesture */
    ensure: function () {
      if (!this.ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { this.ctx = new AC(); } catch (e) { return null; }
        var c = this.ctx;
        this.master = c.createGain();
        this.master.gain.value = 0.9;
        var comp = c.createDynamicsCompressor();
        comp.threshold.value = -12; comp.knee.value = 12; comp.ratio.value = 4;
        comp.attack.value = 0.003; comp.release.value = 0.25;
        this.master.connect(comp);
        comp.connect(c.destination);
        this.sfx = c.createGain(); this.sfx.gain.value = 1; this.sfx.connect(this.master);
        this.amb = c.createGain(); this.amb.gain.value = 0; this.amb.connect(this.master);
      }
      if (this.ctx.state === 'suspended') {
        try { var pr = this.ctx.resume(); if (pr && pr.catch) pr.catch(function () { /* noop */ }); } catch (e) { /* noop */ }
      }
      return this.ctx;
    },

    setEnabled: function (on) { this.enabled = !!on; },

    buffer: function (type, seconds, channels) {
      var key = type + seconds + ':' + channels;
      if (this._buffers[key]) return this._buffers[key];
      var c = this.ctx, len = Math.floor(c.sampleRate * seconds);
      var buf = c.createBuffer(channels, len, c.sampleRate);
      for (var ch = 0; ch < channels; ch++) {
        var d = buf.getChannelData(ch), i, w;
        if (type === 'white') {
          for (i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        } else if (type === 'pink') {
          var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
          for (i = 0; i < len; i++) {
            w = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
            b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856;
            b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
            d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
            b6 = w * 0.115926;
          }
        } else if (type === 'brown') {
          var last = 0;
          for (i = 0; i < len; i++) {
            w = Math.random() * 2 - 1;
            last = (last + 0.02 * w) / 1.02;
            d[i] = last * 3.2;
          }
        }
        // short crossfade at the loop point to avoid a click
        var fade = Math.min(2048, Math.floor(len / 8));
        for (i = 0; i < fade; i++) {
          var g = i / fade;
          d[len - fade + i] = d[len - fade + i] * (1 - g) + d[i] * g;
        }
      }
      this._buffers[key] = buf;
      return buf;
    },

    _env: function (g, t, peak, attack, decay) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    },

    /* 磁気ラチェットのクリック */
    click: function (dir) {
      if (!this.enabled) return;
      var c = this.ensure(); if (!c) return;
      var t = c.currentTime + 0.002;
      var src = c.createBufferSource(); src.buffer = this.buffer('white', 1, 1);
      var bp = c.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.value = (dir > 0 ? 3700 : 3300) + Math.random() * 300; bp.Q.value = 3.2;
      var g = c.createGain(); this._env(g, t, 0.75, 0.0012, 0.02);
      src.connect(bp); bp.connect(g); g.connect(this.sfx);
      src.start(t, Math.random() * 0.8); src.stop(t + 0.05);

      var o = c.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(2100, t); o.frequency.exponentialRampToValueAtTime(1000, t + 0.016);
      var og = c.createGain(); this._env(og, t, 0.07, 0.001, 0.026);
      o.connect(og); og.connect(this.sfx);
      o.start(t); o.stop(t + 0.05);
    },

    /* 限界まで回したときの鈍い当たり */
    bump: function () {
      if (!this.enabled) return;
      var c = this.ensure(); if (!c) return;
      var t = c.currentTime + 0.002;
      var o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(340, t); o.frequency.exponentialRampToValueAtTime(180, t + 0.06);
      var g = c.createGain(); this._env(g, t, 0.16, 0.002, 0.08);
      o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + 0.12);
    },

    /* 天面を押した手応え */
    press: function () {
      if (!this.enabled) return;
      var c = this.ensure(); if (!c) return;
      var t = c.currentTime + 0.002;
      var o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(105, t + 0.07);
      var g = c.createGain(); this._env(g, t, 0.32, 0.002, 0.11);
      o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + 0.16);

      var src = c.createBufferSource(); src.buffer = this.buffer('white', 1, 1);
      var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
      var ng = c.createGain(); this._env(ng, t, 0.22, 0.001, 0.03);
      src.connect(lp); lp.connect(ng); ng.connect(this.sfx);
      src.start(t, Math.random() * 0.8); src.stop(t + 0.06);
    },

    _tone: function (t, f, peak, decay, type) {
      var c = this.ctx;
      var o = c.createOscillator(); o.type = type || 'sine'; o.frequency.value = f;
      var g = c.createGain(); this._env(g, t, peak, 0.006, decay);
      o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + decay + 0.05);
    },

    /* スタートの合図：やわらかい2音 */
    startChime: function () {
      if (!this.enabled) return;
      var c = this.ensure(); if (!c) return;
      var t = c.currentTime + 0.03;
      this._tone(t, 784, 0.11, 0.5);
      this._tone(t + 0.13, 1175, 0.09, 0.8);
    },

    /* 中止の合図 */
    cancelTone: function () {
      if (!this.enabled) return;
      var c = this.ensure(); if (!c) return;
      var t = c.currentTime + 0.02;
      this._tone(t, 988, 0.05, 0.3);
      this._tone(t + 0.1, 659, 0.05, 0.45);
    },

    /* 終了の合図：りんのような余韻 */
    _rin: function (t, f, amp) {
      var c = this.ctx;
      var partials = [[1, 1, 5.2], [2.74, 0.42, 3.3], [5.36, 0.2, 1.9], [8.93, 0.08, 1.1]];
      for (var p = 0; p < partials.length; p++) {
        var ratio = partials[p][0], a = partials[p][1], dec = partials[p][2];
        for (var k = 0; k < 2; k++) {
          var o = c.createOscillator(); o.type = 'sine';
          o.frequency.value = f * ratio + (k ? 0.9 + p * 0.4 : 0);
          var g = c.createGain(); this._env(g, t, amp * a * 0.5, 0.004, dec);
          o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + dec + 0.1);
        }
      }
    },
    endChime: function () {
      if (!this.enabled) return;
      var c = this.ensure(); if (!c) return;
      var t = c.currentTime + 0.05;
      this._rin(t, 640, 0.2);
      this._rin(t + 1.9, 640, 0.16);
    },

    /* ---------- ambient ---------- */
    _stopSources: function () {
      var a = this._ambient;
      if (a.dropTimer) { clearInterval(a.dropTimer); a.dropTimer = 0; }
      a.nodes.forEach(function (n) { try { n.stop(); } catch (e) { /* noop */ } });
      a.nodes = [];
      if (a.out) { try { a.out.disconnect(); } catch (e) { /* noop */ } a.out = null; }
      a.mode = 'off';
    },
    _startSources: function (mode) {
      var c = this.ctx;
      this._stopSources();
      if (mode !== 'rain' && mode !== 'white') return;
      var a = this._ambient;
      var out = c.createGain(); out.gain.value = 1; out.connect(this.amb);
      a.out = out; a.mode = mode;
      var src, lp, hp, g;
      if (mode === 'white') {
        src = c.createBufferSource(); src.buffer = this.buffer('white', 4, 2); src.loop = true;
        lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 8500;
        g = c.createGain(); g.gain.value = 0.15;
        src.connect(lp); lp.connect(g); g.connect(out); src.start();
        a.nodes.push(src);
      } else {
        src = c.createBufferSource(); src.buffer = this.buffer('pink', 6, 2); src.loop = true;
        hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 380;
        lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5600;
        g = c.createGain(); g.gain.value = 0.5;
        src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out); src.start();
        var br = c.createBufferSource(); br.buffer = this.buffer('brown', 5, 2); br.loop = true;
        var blp = c.createBiquadFilter(); blp.type = 'lowpass'; blp.frequency.value = 420;
        var bg = c.createGain(); bg.gain.value = 0.3;
        br.connect(blp); blp.connect(bg); bg.connect(out); br.start();
        a.nodes.push(src, br);
        var self = this;
        a.dropTimer = setInterval(function () { self._drops(out); }, 55);
      }
    },
    _drops: function (out) {
      var c = this.ctx; if (!c || c.state !== 'running') return;
      var n = Math.random() < 0.82 ? 1 + Math.floor(Math.random() * 3) : 0;
      for (var i = 0; i < n; i++) {
        var t = c.currentTime + 0.02 + Math.random() * 0.05;
        var src = c.createBufferSource(); src.buffer = this.buffer('white', 1, 1);
        var bp = c.createBiquadFilter(); bp.type = 'bandpass';
        bp.frequency.value = 1700 + Math.random() * 4600; bp.Q.value = 1.2 + Math.random() * 4;
        var g = c.createGain();
        this._env(g, t, 0.015 + Math.random() * 0.06, 0.0015, 0.01 + Math.random() * 0.03);
        src.connect(bp); bp.connect(g);
        if (c.createStereoPanner) {
          var p = c.createStereoPanner(); p.pan.value = Math.random() * 1.6 - 0.8;
          g.connect(p); p.connect(out);
        } else {
          g.connect(out);
        }
        src.start(t, Math.random() * 0.9); src.stop(t + 0.06);
      }
    },
    _fadeTo: function (level, seconds) {
      var c = this.ctx, g = this.amb.gain, now = c.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(level, now + Math.max(0.02, seconds));
    },
    _endPreview: function (silent) {
      var p = this._preview;
      if (p.timer) { clearTimeout(p.timer); p.timer = 0; }
      var cb = p.onEnd; p.onEnd = null; p.mode = null;
      if (cb && !silent) cb();
    },

    /* タイマー動作中の環境音 */
    startAmbient: function (mode) {
      var c = this.ensure(); if (!c) return;
      this._endPreview();
      this._active = true;
      if (mode === 'off') { this._fadeTo(0, 0.3); return; }
      if (this._ambient.mode !== mode) { this.amb.gain.value = 0; this._startSources(mode); }
      this._fadeTo(AMBIENT_LEVEL, 1.2);
    },
    changeAmbient: function (mode) {
      if (!this._active) return;
      var c = this.ensure(); if (!c) return;
      var self = this;
      this._fadeTo(0, 0.25);
      clearTimeout(this._switchTimer);
      this._switchTimer = setTimeout(function () {
        if (!self._active) return;
        if (mode === 'off') { self._stopSources(); return; }
        self._startSources(mode);
        self._fadeTo(AMBIENT_LEVEL, 0.8);
      }, 280);
    },
    stopAmbient: function (fade) {
      if (!this.ctx) { this._active = false; return; }
      this._active = false;
      var self = this, f = fade == null ? 0.6 : fade;
      this._fadeTo(0, f);
      clearTimeout(this._switchTimer);
      this._switchTimer = setTimeout(function () {
        if (!self._active && !self._preview.mode) self._stopSources();
      }, f * 1000 + 80);
    },

    /* 試聴：seconds 秒だけ流して自動で止める */
    preview: function (mode, seconds, onEnd) {
      var c = this.ensure(); if (!c) return false;
      if (this._active) return false;
      this._endPreview();
      clearTimeout(this._switchTimer);
      if (mode !== 'rain' && mode !== 'white') { this._fadeTo(0, 0.3); return false; }
      if (this._ambient.mode !== mode) { this.amb.gain.value = 0; this._startSources(mode); }
      this._fadeTo(AMBIENT_LEVEL, 0.5);
      var self = this, p = this._preview;
      p.mode = mode; p.onEnd = onEnd || null;
      var g = this.amb.gain, now = c.currentTime;
      g.setValueAtTime(AMBIENT_LEVEL, now + 0.5 + seconds);
      g.linearRampToValueAtTime(0, now + 0.5 + seconds + 1.2);
      p.timer = setTimeout(function () {
        p.timer = 0;
        if (!self._active) self._stopSources();
        self._endPreview();
      }, (seconds + 1.8) * 1000);
      return true;
    },
    stopPreview: function () {
      if (!this.ctx || !this._preview.mode) return;
      var self = this;
      this._endPreview(true);
      if (this._active) return;
      this._fadeTo(0, 0.35);
      clearTimeout(this._switchTimer);
      this._switchTimer = setTimeout(function () {
        if (!self._active && !self._preview.mode) self._stopSources();
      }, 420);
    },
    isPreviewing: function (mode) { return this._preview.mode === mode; }
  };

  KOKU.Sound = Sound;
})();
