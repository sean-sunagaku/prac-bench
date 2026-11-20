/**
 * SOU DESIGN LAB — KOKU-01
 * Interactive Focus Timer Experience & Live Purchase Simulator
 */

(function () {
  "use strict";

  /* ========================================================================
     1. Web Audio Engine (Tactile Ratchet Clicks, Ambient Rain & White Noise)
     ======================================================================== */
  class KokuAudioEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.ambientGain = null;
      this.activeNodes = [];
      this.rainTimer = null;
      this.currentAmbientMode = "rain"; // 'silent' | 'rain' | 'whitenoise'
      this.isAmbientPlaying = false;
      this.volume = 0.65;
      this.sfxEnabled = true;
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.volume;
        this.masterGain.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    setVolume(val0to1) {
      this.volume = Math.max(0, Math.min(1, val0to1));
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.04);
      }
    }

    setSfxEnabled(enabled) {
      this.sfxEnabled = Boolean(enabled);
    }

    /** Crisp 36-step magnetic ratchet click */
    playRatchetClick(pitchFactor = 1) {
      if (!this.sfxEnabled) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const snapOsc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(195 * pitchFactor, now);
      osc.frequency.exponentialRampToValueAtTime(68, now + 0.018);

      snapOsc.type = "sine";
      snapOsc.frequency.setValueAtTime(1520 * pitchFactor, now);
      snapOsc.frequency.exponentialRampToValueAtTime(420, now + 0.009);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      osc.connect(gain);
      snapOsc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      snapOsc.start(now);
      osc.stop(now + 0.022);
      snapOsc.stop(now + 0.022);
    }

    /** Top-plate mechanical push switch sound */
    playPlatePress(isStart = true) {
      if (!this.sfxEnabled) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(isStart ? 150 : 120, now);
      osc.frequency.exponentialRampToValueAtTime(isStart ? 240 : 80, now + 0.045);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.055);
    }

    /** Warm resonant completion chime */
    playCompletionChime() {
      if (!this.sfxEnabled) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const partials = [
        { freq: 528, amp: 0.22, decay: 2.4 },
        { freq: 792, amp: 0.12, decay: 1.9 },
        { freq: 1056, amp: 0.08, decay: 1.5 },
      ];

      partials.forEach((p, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startAt = now + idx * 0.045;

        osc.type = "sine";
        osc.frequency.setValueAtTime(p.freq, startAt);

        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.linearRampToValueAtTime(p.amp, startAt + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + p.decay);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(startAt);
        osc.stop(startAt + p.decay + 0.05);
      });
    }

    createNoiseBuffer(seconds = 3, pink = false) {
      const ctx = this.ctx;
      const length = Math.floor(ctx.sampleRate * seconds);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        if (pink) {
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
          b6 = white * 0.115926;
        } else {
          data[i] = white * 0.16;
        }
      }
      return buffer;
    }

    startAmbient(mode) {
      this.currentAmbientMode = mode;
      this.stopAmbientImmediate();

      if (mode === "silent") {
        this.isAmbientPlaying = false;
        return;
      }

      const ctx = this.ensureContext();
      if (!ctx) return;

      this.isAmbientPlaying = true;
      const now = ctx.currentTime;

      const envGain = ctx.createGain();
      envGain.gain.setValueAtTime(0.0001, now);
      envGain.gain.linearRampToValueAtTime(mode === "rain" ? 0.58 : 0.36, now + 0.65);
      envGain.connect(this.masterGain);
      this.ambientGain = envGain;

      if (mode === "whitenoise") {
        const src = ctx.createBufferSource();
        src.buffer = this.createNoiseBuffer(3, false);
        src.loop = true;

        // Acoustic desktop speaker warm filtering
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 1850;
        lp.Q.value = 0.55;

        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 130;

        src.connect(lp);
        lp.connect(hp);
        hp.connect(envGain);
        src.start(now);
        this.activeNodes.push(src, lp, hp, envGain);
      } else if (mode === "rain") {
        const src = ctx.createBufferSource();
        src.buffer = this.createNoiseBuffer(3.5, true);
        src.loop = true;

        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 1150;

        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 160;

        src.connect(lp);
        lp.connect(hp);
        hp.connect(envGain);
        src.start(now);
        this.activeNodes.push(src, lp, hp, envGain);

        // Subtle gentle rain droplets on windowpane
        this.rainTimer = window.setInterval(() => {
          if (!this.isAmbientPlaying || !this.ctx || !this.ambientGain) return;
          if (Math.random() > 0.62) {
            const t = this.ctx.currentTime;
            const dropOsc = this.ctx.createOscillator();
            const dropGain = this.ctx.createGain();
            const baseFreq = 1100 + Math.random() * 1500;
            dropOsc.type = "sine";
            dropOsc.frequency.setValueAtTime(baseFreq, t);
            dropOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.65, t + 0.025);

            dropGain.gain.setValueAtTime(0.015 + Math.random() * 0.02, t);
            dropGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);

            dropOsc.connect(dropGain);
            dropGain.connect(this.ambientGain);
            dropOsc.start(t);
            dropOsc.stop(t + 0.035);
          }
        }, 110);
      }
    }

    stopAmbientSmooth() {
      this.isAmbientPlaying = false;
      if (this.rainTimer) {
        clearInterval(this.rainTimer);
        this.rainTimer = null;
      }
      if (this.ambientGain && this.ctx) {
        const now = this.ctx.currentTime;
        const g = this.ambientGain;
        const nodesToClean = [...this.activeNodes];
        this.ambientGain = null;
        this.activeNodes = [];

        try {
          g.gain.cancelScheduledValues(now);
          g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), now);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        } catch (_) {}

        window.setTimeout(() => {
          nodesToClean.forEach((n) => {
            try {
              if (typeof n.stop === "function") n.stop();
              n.disconnect();
            } catch (_) {}
          });
        }, 520);
      } else {
        this.stopAmbientImmediate();
      }
    }

    stopAmbientImmediate() {
      if (this.rainTimer) {
        clearInterval(this.rainTimer);
        this.rainTimer = null;
      }
      this.activeNodes.forEach((n) => {
        try {
          if (typeof n.stop === "function") n.stop();
          n.disconnect();
        } catch (_) {}
      });
      this.activeNodes = [];
      this.ambientGain = null;
      this.isAmbientPlaying = false;
    }
  }

  const audio = new KokuAudioEngine();

  /* ========================================================================
     2. Interactive Focus Timer Demo (#demo)
     ======================================================================== */
  // 36 magnetic ratchet clicks -> whole minutes curve (0..60m)
  const STEP_MINUTES = [
    0,
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    22, 24, 25, 28, 30, 32, 35, 38,
    40, 42, 45, 48, 50, 52, 55, 60
  ]; // length = 37 (index 0..36)

  const kokuDevice = document.getElementById("kokuDevice");
  const kokuDialRing = document.getElementById("kokuDialRing");
  const knurlTicksGroup = document.getElementById("knurlTicksGroup");
  const kokuLedBezel = document.getElementById("kokuLedBezel");
  const kokuTopPlate = document.getElementById("kokuTopPlate");
  const kokuPlateHint = document.getElementById("kokuPlateHint");

  const demoStatusBadge = document.getElementById("demoStatusBadge");
  const demoTimeReadout = document.getElementById("demoTimeReadout");
  const demoLedCountReadout = document.getElementById("demoLedCountReadout");
  const demoProgressBar = document.getElementById("demoProgressBar");
  const demoFeedbackBanner = document.getElementById("demoFeedbackBanner");
  const demoStepInfo = document.getElementById("demoStepInfo");

  const stepMinusBtn = document.getElementById("stepMinusBtn");
  const stepPlusBtn = document.getElementById("stepPlusBtn");
  const presetBtns = Array.from(document.querySelectorAll("[data-preset-sec]"));
  const soundBtns = Array.from(document.querySelectorAll("[data-sound]"));
  const soundActiveLabel = document.getElementById("soundActiveLabel");
  const demoVolumeSlider = document.getElementById("demoVolumeSlider");
  const demoClickSoundToggle = document.getElementById("demoClickSoundToggle");
  const speedBtns = Array.from(document.querySelectorAll("[data-speed]"));
  const demoStartPauseBtn = document.getElementById("demoStartPauseBtn");
  const demoSkipEndBtn = document.getElementById("demoSkipEndBtn");
  const demoResetBtn = document.getElementById("demoResetBtn");
  const demoFinishBtns = Array.from(document.querySelectorAll("[data-demo-finish]"));

  const timerState = {
    status: "standby", // 'standby' | 'running' | 'paused' | 'completed'
    stepIndex: 15, // 15/36 = 25 min default
    isQuickTenSecMode: false,
    totalSeconds: 1500,
    remainingSeconds: 1500,
    speedMultiplier: 1, // 1 or 60
    ambientMode: "rain",
    dialVisualDeg: 15 * 10, // 10 deg per step
    rafId: null,
    lastFrameTs: 0,
    celebrationTimer: null,
  };

  // Build 72 knurled radial grooves on the SVG dial
  if (knurlTicksGroup) {
    const svgNS = "http://www.w3.org/2000/svg";
    for (let i = 0; i < 72; i++) {
      const deg = i * 5;
      const rad = ((deg - 90) * Math.PI) / 180;
      const isMajor = i % 2 === 0; // 36 magnetic steps
      const rOuter = 166;
      const rInner = isMajor ? 149 : 154;
      const x1 = 170 + Math.cos(rad) * rInner;
      const y1 = 170 + Math.sin(rad) * rInner;
      const x2 = 170 + Math.cos(rad) * rOuter;
      const y2 = 170 + Math.sin(rad) * rOuter;

      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", x1.toFixed(2));
      line.setAttribute("y1", y1.toFixed(2));
      line.setAttribute("x2", x2.toFixed(2));
      line.setAttribute("y2", y2.toFixed(2));
      line.setAttribute("stroke-width", isMajor ? "1.6" : "1");
      line.setAttribute("opacity", isMajor ? "0.85" : "0.45");
      knurlTicksGroup.appendChild(line);
    }
  }

  // Build 24 Micro-LED elements around the bezel
  const ledElements = [];
  if (kokuLedBezel) {
    for (let i = 0; i < 24; i++) {
      const led = document.createElement("span");
      led.className = "koku-led";
      led.style.setProperty("--led-pos", `rotate(${i * 15}deg) translateY(calc(-1 * var(--led-r)))`);
      kokuLedBezel.appendChild(led);
      ledElements.push(led);
    }
  }

  function formatTimeMMSS(secondsFloat) {
    const clamped = Math.max(0, Math.ceil(secondsFloat));
    const mins = Math.floor(clamped / 60);
    const secs = clamped % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function computeLitLedCount() {
    if (timerState.remainingSeconds <= 0) return 0;
    if (timerState.isQuickTenSecMode) {
      // Sweep all 24 LEDs dramatically across the 10-second experience!
      return Math.max(1, Math.ceil((timerState.remainingSeconds / timerState.totalSeconds) * 24));
    }
    // Standard 60-minute full ring (1 LED = 2.5 min = 150 sec)
    return Math.min(24, Math.max(1, Math.ceil(timerState.remainingSeconds / 150)));
  }

  function clearCelebration() {
    if (timerState.celebrationTimer) {
      clearInterval(timerState.celebrationTimer);
      timerState.celebrationTimer = null;
    }
    ledElements.forEach((el) => el.classList.remove("is-celebrating"));
  }

  function runCompletionRipple() {
    clearCelebration();
    let tick = 0;
    timerState.celebrationTimer = window.setInterval(() => {
      ledElements.forEach((el, idx) => {
        const wavePos = tick % 24;
        const dist = Math.min(Math.abs(idx - wavePos), 24 - Math.abs(idx - wavePos));
        el.classList.toggle("is-celebrating", dist <= 2);
      });
      tick++;
      if (tick > 52) {
        clearCelebration();
      }
    }, 55);
  }

  function renderTimerUI() {
    kokuDevice.dataset.state = timerState.status;
    kokuDialRing.style.transform = `rotate(${timerState.dialVisualDeg}deg)`;

    const litCount = computeLitLedCount();
    if (timerState.status !== "completed") {
      ledElements.forEach((el, idx) => {
        const isLit = idx < litCount;
        const isHead = timerState.status === "running" && idx === litCount - 1;
        el.classList.toggle("is-lit", isLit);
        el.classList.toggle("is-active-head", isHead);
      });
    } else {
      ledElements.forEach((el) => {
        el.classList.remove("is-lit", "is-active-head");
      });
    }

    // Readouts
    demoTimeReadout.textContent = formatTimeMMSS(timerState.remainingSeconds);
    demoLedCountReadout.textContent = `点灯LED: ${timerState.status === "completed" ? 0 : litCount} / 24灯`;

    const progressPct =
      timerState.totalSeconds > 0
        ? ((timerState.totalSeconds - timerState.remainingSeconds) / timerState.totalSeconds) * 100
        : 0;
    demoProgressBar.style.width = `${Math.max(0, Math.min(100, progressPct)).toFixed(1)}%`;

    if (timerState.isQuickTenSecMode) {
      demoStepInfo.textContent = "クイック体験（10秒 / 24灯フルスイープ）";
      kokuDialRing.setAttribute("aria-valuenow", "1");
      kokuDialRing.setAttribute("aria-valuetext", "体験デモ10秒");
    } else {
      const mins = Math.round(timerState.totalSeconds / 60);
      demoStepInfo.textContent = `${timerState.stepIndex} / 36 ステップ`;
      kokuDialRing.setAttribute("aria-valuenow", String(mins));
      kokuDialRing.setAttribute("aria-valuetext", `${mins}分`);
    }

    // Highlight matching preset chip if in standby
    presetBtns.forEach((btn) => {
      const sec = Number(btn.dataset.presetSec);
      btn.classList.toggle("is-active", timerState.totalSeconds === sec);
    });

    // Status labels & buttons
    demoStatusBadge.dataset.state = timerState.status;
    if (timerState.status === "standby") {
      demoStatusBadge.textContent = "STANDBY — 時間設定中";
      kokuPlateHint.textContent = timerState.remainingSeconds > 0 ? "PRESS TOP TO START" : "TURN DIAL FIRST";
      demoStartPauseBtn.textContent = "天面を押してスタート";
      demoSkipEndBtn.disabled = true;
    } else if (timerState.status === "running") {
      demoStatusBadge.textContent = "FOCUSING — 集中モード稼働中";
      kokuPlateHint.textContent = "PRESS TO PAUSE";
      demoStartPauseBtn.textContent = "一時停止する（天面プッシュ）";
      demoSkipEndBtn.disabled = timerState.remainingSeconds <= 3.2;
    } else if (timerState.status === "paused") {
      demoStatusBadge.textContent = "PAUSED — 一時停止中";
      kokuPlateHint.textContent = "PRESS TO RESUME";
      demoStartPauseBtn.textContent = "集中を再開する";
      demoSkipEndBtn.disabled = timerState.remainingSeconds <= 3.2;
    } else if (timerState.status === "completed") {
      demoStatusBadge.textContent = "COMPLETED — 集中セッション完了";
      kokuPlateHint.textContent = "PRESS TO RESET";
      demoStartPauseBtn.textContent = "もう一度体験する";
      demoSkipEndBtn.disabled = true;
    }
  }

  function setStepIndex(newStep, playSound = true) {
    const clamped = Math.max(0, Math.min(36, newStep));
    if (clamped === timerState.stepIndex && !timerState.isQuickTenSecMode) return;

    clearCelebration();
    if (timerState.status === "running") {
      pauseTimer(false);
    } else if (timerState.status === "completed") {
      timerState.status = "standby";
    }

    timerState.isQuickTenSecMode = false;
    timerState.stepIndex = clamped;
    const mins = STEP_MINUTES[clamped];
    timerState.totalSeconds = mins * 60;
    timerState.remainingSeconds = timerState.totalSeconds;
    timerState.dialVisualDeg = clamped * 10;

    if (playSound) {
      audio.playRatchetClick(0.92 + (clamped / 36) * 0.28);
    }

    demoFeedbackBanner.textContent =
      mins > 0
        ? `設定時間：${mins}分。中央の天面を押すと集中タイマーがスタートします。`
        : "ダイヤルを右に回して、集中したい時間を設定してください。";

    renderTimerUI();
  }

  function setPresetSeconds(sec) {
    clearCelebration();
    if (timerState.rafId) {
      cancelAnimationFrame(timerState.rafId);
      timerState.rafId = null;
    }
    audio.stopAmbientSmooth();
    timerState.status = "standby";

    if (sec === 10) {
      timerState.isQuickTenSecMode = true;
      timerState.stepIndex = 36;
      timerState.totalSeconds = 10;
      timerState.remainingSeconds = 10;
      timerState.dialVisualDeg = 360;
      audio.playRatchetClick(1.15);
      demoFeedbackBanner.textContent =
        "10秒クイック体験モードに設定しました。天面を押すと10秒間で24灯の減衰から完了演出まで体験できます。";
    } else {
      timerState.isQuickTenSecMode = false;
      const mins = Math.round(sec / 60);
      const idx = STEP_MINUTES.indexOf(mins);
      timerState.stepIndex = idx >= 0 ? idx : 15;
      timerState.totalSeconds = sec;
      timerState.remainingSeconds = sec;
      timerState.dialVisualDeg = timerState.stepIndex * 10;
      audio.playRatchetClick(1.0);
      demoFeedbackBanner.textContent = `${mins}分に設定しました。天面を押してスタートしてください（早送り60×も利用可能です）。`;
    }
    renderTimerUI();
  }

  function tickLoop(nowTs) {
    if (timerState.status !== "running") return;
    if (!timerState.lastFrameTs) timerState.lastFrameTs = nowTs;
    const deltaSec = ((nowTs - timerState.lastFrameTs) / 1000) * timerState.speedMultiplier;
    timerState.lastFrameTs = nowTs;

    timerState.remainingSeconds = Math.max(0, timerState.remainingSeconds - deltaSec);

    if (timerState.remainingSeconds <= 0) {
      completeTimer();
      return;
    }

    renderTimerUI();
    timerState.rafId = requestAnimationFrame(tickLoop);
  }

  function startTimer() {
    if (timerState.remainingSeconds <= 0) {
      // Friendly fallback: if at 00:00, set to 10s quick experience or previous total
      if (timerState.totalSeconds <= 0) {
        setStepIndex(15, false);
      } else {
        timerState.remainingSeconds = timerState.totalSeconds;
      }
    }

    clearCelebration();
    audio.playPlatePress(true);
    audio.startAmbient(timerState.ambientMode);

    timerState.status = "running";
    timerState.lastFrameTs = performance.now();

    const modeLabels = { silent: "無音モード", rain: "雨音モード", whitenoise: "ホワイトノイズモード" };
    demoFeedbackBanner.textContent = `${modeLabels[timerState.ambientMode]}で集中セッション中。24灯の光が静かに残り時間を刻んでいます。`;

    renderTimerUI();
    if (timerState.rafId) cancelAnimationFrame(timerState.rafId);
    timerState.rafId = requestAnimationFrame(tickLoop);
  }

  function pauseTimer(playClick = true) {
    if (timerState.rafId) {
      cancelAnimationFrame(timerState.rafId);
      timerState.rafId = null;
    }
    if (playClick) audio.playPlatePress(false);
    audio.stopAmbientSmooth();
    timerState.status = "paused";
    demoFeedbackBanner.textContent = "一時停止中です。天面をもう一度押すと再開します。";
    renderTimerUI();
  }

  function completeTimer() {
    if (timerState.rafId) {
      cancelAnimationFrame(timerState.rafId);
      timerState.rafId = null;
    }
    timerState.remainingSeconds = 0;
    timerState.status = "completed";
    audio.stopAmbientSmooth();
    audio.playCompletionChime();
    runCompletionRipple();

    demoFeedbackBanner.textContent =
      "集中セッションが完了しました。環境音が静かに溶け、24灯の光の波紋が区切りを告げます。";
    renderTimerUI();
  }

  function resetTimer() {
    clearCelebration();
    if (timerState.rafId) {
      cancelAnimationFrame(timerState.rafId);
      timerState.rafId = null;
    }
    audio.stopAmbientSmooth();
    audio.playPlatePress(false);
    timerState.status = "standby";
    if (timerState.totalSeconds <= 0) {
      timerState.stepIndex = 15;
      timerState.totalSeconds = 1500;
    }
    timerState.remainingSeconds = timerState.totalSeconds;
    demoFeedbackBanner.textContent = "待機状態にリセットしました。ダイヤルで時間を調整できます。";
    renderTimerUI();
  }

  function handlePrimaryToggle() {
    // Visual press feedback on hardware top plate
    kokuTopPlate.classList.add("is-pressed");
    window.setTimeout(() => kokuTopPlate.classList.remove("is-pressed"), 140);

    if (timerState.status === "standby" || timerState.status === "paused") {
      startTimer();
    } else if (timerState.status === "running") {
      pauseTimer(true);
    } else if (timerState.status === "completed") {
      timerState.remainingSeconds = timerState.totalSeconds > 0 ? timerState.totalSeconds : 1500;
      timerState.status = "standby";
      clearCelebration();
      audio.playPlatePress(true);
      demoFeedbackBanner.textContent = "再スタートの準備ができました。天面を押すと開始します。";
      renderTimerUI();
    }
  }

  // Pointer drag rotation on outer knurled dial ring
  let isDraggingDial = false;
  let lastPointerAngle = 0;
  let angleAccumulator = 0;

  function getAngleFromCenter(clientX, clientY) {
    const rect = kokuDevice.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  }

  kokuDialRing.addEventListener("pointerdown", (e) => {
    if (e.target === kokuTopPlate || kokuTopPlate.contains(e.target)) return;
    isDraggingDial = true;
    lastPointerAngle = getAngleFromCenter(e.clientX, e.clientY);
    angleAccumulator = 0;
    kokuDialRing.setPointerCapture(e.pointerId);
  });

  kokuDialRing.addEventListener("pointermove", (e) => {
    if (!isDraggingDial) return;
    const currentAngle = getAngleFromCenter(e.clientX, e.clientY);
    let delta = currentAngle - lastPointerAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    lastPointerAngle = currentAngle;
    angleAccumulator += delta;

    const STEP_DEG = 9.5;
    if (Math.abs(angleAccumulator) >= STEP_DEG) {
      const stepsDelta = Math.trunc(angleAccumulator / STEP_DEG);
      angleAccumulator -= stepsDelta * STEP_DEG;
      const baseStep = timerState.isQuickTenSecMode ? 10 : timerState.stepIndex;
      setStepIndex(baseStep + stepsDelta, true);
    }
  });

  const endDialDrag = (e) => {
    if (!isDraggingDial) return;
    isDraggingDial = false;
    try {
      kokuDialRing.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };
  kokuDialRing.addEventListener("pointerup", endDialDrag);
  kokuDialRing.addEventListener("pointercancel", endDialDrag);

  // Keyboard support on dial ring
  kokuDialRing.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setStepIndex((timerState.isQuickTenSecMode ? 0 : timerState.stepIndex) + 1, true);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setStepIndex((timerState.isQuickTenSecMode ? 1 : timerState.stepIndex) - 1, true);
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handlePrimaryToggle();
    }
  });

  // Top plate & console button listeners
  kokuTopPlate.addEventListener("click", handlePrimaryToggle);
  demoStartPauseBtn.addEventListener("click", handlePrimaryToggle);
  demoResetBtn.addEventListener("click", resetTimer);

  demoSkipEndBtn.addEventListener("click", () => {
    if (timerState.status === "running" || timerState.status === "paused") {
      // Jump to 3 real seconds left regardless of 60x speed so user can savor the ending
      timerState.speedMultiplier = 1;
      speedBtns.forEach((b) => b.classList.toggle("is-active", Number(b.dataset.speed) === 1));
      timerState.remainingSeconds = Math.min(timerState.remainingSeconds, 3);
      if (timerState.status === "paused") {
        startTimer();
      } else {
        demoFeedbackBanner.textContent = "終了3秒前へスキップしました。まもなく完了演出が始まります…";
        renderTimerUI();
      }
    }
  });

  stepMinusBtn.addEventListener("click", () => {
    const base = timerState.isQuickTenSecMode ? 5 : timerState.stepIndex;
    setStepIndex(base - 1, true);
  });

  stepPlusBtn.addEventListener("click", () => {
    const base = timerState.isQuickTenSecMode ? 0 : timerState.stepIndex;
    setStepIndex(base + 1, true);
  });

  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      setPresetSeconds(Number(btn.dataset.presetSec));
    });
  });

  soundBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.sound;
      timerState.ambientMode = mode;
      soundBtns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-checked", String(active));
      });
      const names = { silent: "無音", rain: "雨音", whitenoise: "ホワイトノイズ" };
      soundActiveLabel.textContent = `現在：${names[mode]}`;

      audio.playRatchetClick(1.05);
      if (timerState.status === "running") {
        audio.startAmbient(mode);
      }
    });
  });

  demoVolumeSlider.addEventListener("input", (e) => {
    audio.setVolume(Number(e.target.value) / 100);
  });

  demoClickSoundToggle.addEventListener("change", (e) => {
    audio.setSfxEnabled(e.target.checked);
  });

  speedBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      timerState.speedMultiplier = Number(btn.dataset.speed);
      speedBtns.forEach((b) => b.classList.toggle("is-active", b === btn));
      audio.playRatchetClick(1.1);
    });
  });

  demoFinishBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const finish = btn.dataset.demoFinish;
      kokuDevice.dataset.finish = finish;
      demoFinishBtns.forEach((b) => b.classList.toggle("is-active", b === btn));
      audio.playRatchetClick(1.0);
    });
  });

  // Initial render of timer demo
  renderTimerUI();

  /* ========================================================================
     3. Interactive Purchase Simulator (#preorder)
     ======================================================================== */
  const PLANS = {
    super_early: {
      name: "超早割 25%OFF プラン（初回限定50台）",
      price: 13875,
      regularPrice: 18500,
      units: 1,
      soldOut: true,
    },
    early_bird: {
      name: "先行予約早割 20%OFF プラン（1台）",
      shortName: "先行予約早割 20%OFF",
      price: 14800,
      regularPrice: 18500,
      units: 1,
      soldOut: false,
    },
    standard_pre: {
      name: "先行予約 セカンドロット枠（1台・10%OFF）",
      shortName: "セカンドロット予約 10%OFF",
      price: 16650,
      regularPrice: 18500,
      units: 1,
      soldOut: false,
    },
    pair_set: {
      name: "ワークスペース 2台セット割（24%OFF）",
      shortName: "2台セット割 24%OFF",
      price: 28120,
      regularPrice: 37000,
      units: 2,
      soldOut: false,
    },
  };

  const COLORS = {
    silver: { name: "アルマイトシルバー", upchargePerUnit: 0, soldOut: false },
    black: { name: "マットブラック", upchargePerUnit: 0, soldOut: false },
    brass: { name: "真鍮リミテッド", upchargePerUnit: 3000, soldOut: false },
  };

  const OPTIONS = {
    felt_mat: { name: "専用フェルトデスクマット", price: 2400, soldOut: false },
    braided_cable: { name: "L字アルミ端子 USB-C 編み込みケーブル（1.5m）", price: 1800, soldOut: false },
    travel_case: { name: "専用セミハード携帯ケース（初回生産分）", price: 3200, soldOut: true },
  };

  const planRadios = Array.from(document.querySelectorAll('input[name="sim_plan"]'));
  const colorRadios = Array.from(document.querySelectorAll('input[name="sim_color"]'));
  const optionChecks = Array.from(document.querySelectorAll('input[name="sim_option"]'));

  const simFeltMatVisual = document.getElementById("simFeltMatVisual");
  const simUnitsWrap = document.getElementById("simUnitsWrap");
  const simUnitPrimary = document.getElementById("simUnitPrimary");
  const simUnitSecondary = document.getElementById("simUnitSecondary");
  const simPreviewTitle = document.getElementById("simPreviewTitle");
  const simPreviewSub = document.getElementById("simPreviewSub");
  const brassPriceBadge = document.getElementById("brassPriceBadge");

  const summaryLinesList = document.getElementById("summaryLinesList");
  const summaryTotalAmount = document.getElementById("summaryTotalAmount");
  const summarySavingsText = document.getElementById("summarySavingsText");
  const openPreorderModalBtn = document.getElementById("openPreorderModalBtn");

  function formatYen(amount) {
    return `¥${amount.toLocaleString("ja-JP")}`;
  }

  // Strictly block any interaction on disabled / out-of-stock cards
  document.querySelectorAll(".choice-card.is-disabled").forEach((card) => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  function getSelectedSimConfig() {
    const selectedPlanInput = planRadios.find((r) => r.checked && !r.disabled) || planRadios[1];
    const selectedColorInput = colorRadios.find((r) => r.checked && !r.disabled) || colorRadios[0];
    const selectedOptInputs = optionChecks.filter((c) => c.checked && !c.disabled);

    const planKey = selectedPlanInput.value;
    const colorKey = selectedColorInput.value;
    const plan = PLANS[planKey];
    const color = COLORS[colorKey];
    const chosenOptions = selectedOptInputs.map((i) => ({ key: i.value, ...OPTIONS[i.value] }));

    const colorExtra = color.upchargePerUnit * plan.units;
    const optionsTotal = chosenOptions.reduce((sum, o) => sum + o.price, 0);
    const grandTotal = plan.price + colorExtra + optionsTotal;
    const regularEquivalent = plan.regularPrice + colorExtra + optionsTotal;
    const savings = Math.max(0, regularEquivalent - grandTotal);

    return {
      planKey,
      colorKey,
      plan,
      color,
      chosenOptions,
      colorExtra,
      optionsTotal,
      grandTotal,
      regularEquivalent,
      savings,
    };
  }

  function updateSimulatorUI() {
    // Sync card highlight classes
    [...planRadios, ...colorRadios, ...optionChecks].forEach((input) => {
      const card = input.closest(".choice-card");
      if (!card) return;
      if (input.disabled) {
        input.checked = false;
        card.classList.remove("is-selected");
        card.classList.add("is-disabled");
      } else {
        card.classList.toggle("is-selected", input.checked);
      }
    });

    const cfg = getSelectedSimConfig();

    // Update Brass price label dynamically when 2-unit plan is selected
    if (brassPriceBadge) {
      brassPriceBadge.textContent =
        cfg.plan.units > 1
          ? `+¥${(3000 * cfg.plan.units).toLocaleString("ja-JP")}（2台分）`
          : "+¥3,000";
    }

    // Update live visual stage
    simUnitPrimary.dataset.finish = cfg.colorKey;
    simUnitSecondary.dataset.finish = cfg.colorKey;
    simUnitsWrap.classList.toggle("is-pair", cfg.plan.units === 2);

    const hasFeltMat = cfg.chosenOptions.some((o) => o.key === "felt_mat");
    simFeltMatVisual.classList.toggle("is-visible", hasFeltMat);

    simPreviewTitle.textContent = `KOKU-01 ${cfg.color.name}（${cfg.plan.units}台）`;
    const optSummaryText =
      cfg.chosenOptions.length > 0
        ? cfg.chosenOptions.map((o) => o.name).join(" ＋ ")
        : "オプションなし";
    simPreviewSub.textContent = `${cfg.plan.shortName} ／ ${optSummaryText}`;

    // Build receipt breakdown lines
    summaryLinesList.innerHTML = "";
    const lines = [
      { label: cfg.plan.name, value: formatYen(cfg.plan.price) },
      {
        label: `カラー：${cfg.color.name}${cfg.plan.units > 1 && cfg.colorExtra > 0 ? `（×${cfg.plan.units}台）` : ""}`,
        value: cfg.colorExtra > 0 ? `+${formatYen(cfg.colorExtra)}` : "±¥0",
      },
    ];

    cfg.chosenOptions.forEach((opt) => {
      lines.push({ label: `オプション：${opt.name}`, value: `+${formatYen(opt.price)}` });
    });

    lines.push({ label: "配送料（先行予約特典）", value: "¥0" });

    lines.forEach((item) => {
      const li = document.createElement("li");
      const s1 = document.createElement("span");
      const s2 = document.createElement("span");
      s1.textContent = item.label;
      s2.textContent = item.value;
      li.appendChild(s1);
      li.appendChild(s2);
      summaryLinesList.appendChild(li);
    });

    summaryTotalAmount.textContent = formatYen(cfg.grandTotal);
    summarySavingsText.textContent = `一般予定価格合計（${formatYen(cfg.regularEquivalent)}）より ${formatYen(cfg.savings)} お得`;
    openPreorderModalBtn.textContent = `この内容で先行予約する（${formatYen(cfg.grandTotal)}）`;
  }

  [...planRadios, ...colorRadios, ...optionChecks].forEach((input) => {
    input.addEventListener("change", () => {
      if (input.disabled) return;
      updateSimulatorUI();
    });
  });

  updateSimulatorUI();

  /* ========================================================================
     4. Pre-order Reservation Modal Flow
     ======================================================================== */
  const preorderModal = document.getElementById("preorderModal");
  const closePreorderModalBtn = document.getElementById("closePreorderModalBtn");
  const modalDoneCloseBtn = document.getElementById("modalDoneCloseBtn");
  const modalFormView = document.getElementById("modalFormView");
  const modalCompleteView = document.getElementById("modalCompleteView");
  const modalConfigSummary = document.getElementById("modalConfigSummary");
  const preorderForm = document.getElementById("preorderForm");
  const modalReceiptCode = document.getElementById("modalReceiptCode");

  function openModal() {
    const cfg = getSelectedSimConfig();
    const optNames =
      cfg.chosenOptions.length > 0 ? cfg.chosenOptions.map((o) => o.name).join("、") : "なし";

    modalConfigSummary.innerHTML = `
      <div><strong>プラン：</strong>${cfg.plan.name}</div>
      <div><strong>カラー：</strong>${cfg.color.name}</div>
      <div><strong>オプション：</strong>${optNames}</div>
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(24,23,21,0.12);font-size:15px;">
        <strong>お支払い合計：${formatYen(cfg.grandTotal)}（税込・送料無料）</strong>
      </div>
    `;

    modalFormView.hidden = false;
    modalCompleteView.hidden = true;
    preorderModal.hidden = false;
    document.body.style.overflow = "hidden";
    document.getElementById("customerName").focus();
  }

  function closeModal() {
    preorderModal.hidden = true;
    document.body.style.overflow = "";
    openPreorderModalBtn.focus();
  }

  openPreorderModalBtn.addEventListener("click", openModal);
  closePreorderModalBtn.addEventListener("click", closeModal);
  modalDoneCloseBtn.addEventListener("click", closeModal);

  preorderModal.addEventListener("click", (e) => {
    if (e.target === preorderModal) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !preorderModal.hidden) {
      closeModal();
    }
  });

  preorderForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const randNum = Math.floor(1000 + Math.random() * 9000);
    modalReceiptCode.textContent = `予約番号：KOKU-2611-${randNum}`;
    modalFormView.hidden = true;
    modalCompleteView.hidden = false;
    audio.playCompletionChime();
  });
})();
