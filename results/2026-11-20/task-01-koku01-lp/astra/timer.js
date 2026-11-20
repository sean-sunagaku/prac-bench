(() => {
  "use strict";

  // Keep the sound in the page. A short looping buffer supplies a continuous
  // texture, and the audio clock can stop it even when a tab's timers slow down.
  class AmbientPlayer {
    constructor(notice) {
      this.notice = notice;
      this.buffers = new Map();
      this.context = null;
      this.active = null;
      this.version = 0;
    }

    makeBuffer(mode) {
      const context = this.context;
      const buffer = context.createBuffer(1, context.sampleRate * 5, context.sampleRate);
      const samples = buffer.getChannelData(0);
      let low = 0;
      let mid = 0;
      let drop = 0;
      let phase = 0;
      let pitch = 0;
      for (let i = 0; i < samples.length; i++) {
        const noise = Math.random() * 2 - 1;
        if (mode === "white") {
          samples[i] = noise * .67;
          continue;
        }
        low = low * .984 + noise * .016;
        mid = mid * .82 + noise * .18;
        if (Math.random() < 22 / context.sampleRate) {
          drop = .06 + Math.random() * .13;
          pitch = 2 * Math.PI * (1150 + Math.random() * 1700) / context.sampleRate;
          phase = 0;
        }
        phase += pitch;
        drop *= .995;
        samples[i] = low * 1.4 + mid * .65 + noise * .12 + drop * Math.sin(phase);
      }
      this.buffers.set(mode, buffer);
      return buffer;
    }

    stop() {
      this.version++;
      if (!this.active) return;
      const {source, gain} = this.active;
      const now = this.context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, .015);
      source.stop(now + .07);
      this.active = null;
    }

    async play(mode, deadline) {
      this.stop();
      this.notice.hidden = true;
      if (mode === "silent") return;
      const version = this.version;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.context ??= new AudioContext();
        const context = this.context;
        if (context.state !== "running") await context.resume();
        if (version !== this.version) return;
        const buffer = this.buffers.get(mode) || this.makeBuffer(mode);
        const duration = (deadline - Date.now()) / 1000;
        if (duration <= 0) return;
        const source = context.createBufferSource();
        const gain = context.createGain();
        const now = context.currentTime;
        const end = now + duration;
        const fade = Math.min(.12, duration / 3);
        const volume = mode === "rain" ? .25 : .14;
        source.buffer = buffer;
        source.loop = true;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + fade);
        gain.gain.setValueAtTime(volume, end - fade);
        gain.gain.linearRampToValueAtTime(0, end);
        source.connect(gain);
        gain.connect(context.destination);
        source.onended = () => {
          source.disconnect();
          gain.disconnect();
          if (this.active?.source === source) this.active = null;
        };
        this.active = {source, gain};
        source.start();
        source.stop(end);
      } catch {
        if (version === this.version) this.notice.hidden = false;
      }
    }
  }

  const dial = document.getElementById("dial");
  const ring = document.getElementById("led-ring");
  const clock = document.getElementById("clock");
  const status = document.getElementById("timer-status");
  const controls = document.getElementById("timer-controls");
  const timeSettings = document.getElementById("time-settings");
  const range = document.getElementById("duration");
  const presets = [...document.querySelectorAll(".presets button")];
  const toggleButton = document.getElementById("timer-toggle");
  const resetButton = document.getElementById("timer-reset");
  const sound = new AmbientPlayer(document.getElementById("sound-notice"));
  const clampStep = value => Math.max(0, Math.min(Number(range.max), value));
  const selectedSound = () => document.querySelector('input[name="ambience"]:checked').value;

  const ledCount = 24;
  const leds = Array.from({length: ledCount}, (_, i) => {
    const angle = i * 2 * Math.PI / ledCount;
    const led = document.createElement("span");
    led.className = "led";
    // The center and radius follow the recessed track in the top-view photo.
    led.style.left = (49.25 + Math.sin(angle) * 40.65) + "%";
    led.style.top = (50.4 - Math.cos(angle) * 40.65) + "%";
    led.style.transform = "translate(-50%, -50%) rotate(" + (360 * i / ledCount) + "deg)";
    ring.append(led);
    return led;
  });

  const phaseLabels = {
    ready: ["待機中", "スタート"],
    running: ["集中中", "一時停止"],
    paused: ["一時停止中", "再開"],
    complete: ["集中時間が終わりました", "もう一度スタート"]
  };
  let phase = "ready";
  let step = Number(range.value);
  let durationMs = step * 60_000;
  let remainingMs = durationMs;
  let deadline = 0;
  let interval = null;
  let lastLit = -1;
  let lastSecond = -1;

  function drawTime() {
    const seconds = Math.ceil(remainingMs / 1000);
    if (seconds !== lastSecond) {
      const minutes = Math.floor(seconds / 60);
      const rest = seconds % 60;
      clock.textContent = String(minutes).padStart(2, "0") + ":" + String(rest).padStart(2, "0");
      clock.setAttribute("aria-label", "残り時間 " + minutes + "分" + rest + "秒");
      lastSecond = seconds;
    }
    const lit = Math.ceil(ledCount * remainingMs / durationMs);
    if (lit !== lastLit) {
      leds.forEach((led, i) => led.classList.toggle("is-lit", i < lit));
      lastLit = lit;
    }
  }

  function setPhase(next) {
    phase = next;
    controls.dataset.state = phase;
    const [stateText, action] = phaseLabels[phase];
    status.textContent = stateText;
    toggleButton.querySelector("span").textContent = action;
    toggleButton.querySelector("use").setAttribute("href", phase === "running" ? "#i-pause" : "#i-play");
    dial.setAttribute("aria-label", "ダイヤルの天面を押して" + action);
    timeSettings.disabled = phase === "running" || phase === "paused";
    resetButton.disabled = phase === "ready";
    drawTime();
  }

  function selectTime(value) {
    if (timeSettings.disabled) return;
    step = clampStep(value);
    durationMs = step === 0 ? 10_000 : step * 60_000;
    remainingMs = durationMs;
    range.value = String(step);
    range.setAttribute("aria-valuetext", step === 0 ? "10秒" : step + "分");
    range.style.setProperty("--progress", (100 * step / Number(range.max)) + "%");
    dial.style.setProperty("--turn", ((step - 25) * 10) + "deg");
    presets.forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.minutes) === step)));
    setPhase("ready");
  }

  function stopInterval() {
    clearInterval(interval);
    interval = null;
  }

  function tick() {
    if (phase !== "running") return;
    remainingMs = Math.max(0, deadline - Date.now());
    if (remainingMs === 0) {
      stopInterval();
      sound.stop();
      setPhase("complete");
      return;
    }
    drawTime();
  }

  function start() {
    if (phase === "complete") remainingMs = durationMs;
    deadline = Date.now() + remainingMs;
    setPhase("running");
    stopInterval();
    interval = setInterval(tick, 125);
    sound.play(selectedSound(), deadline);
  }

  function toggleTimer() {
    if (phase !== "running") {
      start();
      return;
    }
    tick();
    if (phase === "complete") return;
    stopInterval();
    sound.stop();
    setPhase("paused");
  }

  resetButton.addEventListener("click", () => {
    stopInterval();
    sound.stop();
    remainingMs = durationMs;
    setPhase("ready");
  });
  toggleButton.addEventListener("click", toggleTimer);
  range.addEventListener("input", () => selectTime(Number(range.value)));
  presets.forEach(button => button.addEventListener("click", () => selectTime(Number(button.dataset.minutes))));
  document.querySelectorAll('input[name="ambience"]').forEach(input => {
    input.addEventListener("change", () => {
      if (phase === "running") sound.play(selectedSound(), deadline);
    });
  });

  let gesture = null;
  let dragged = false;
  dial.addEventListener("pointerdown", event => {
    if (!event.isPrimary || event.button !== 0) return;
    const bounds = dial.getBoundingClientRect();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    gesture = {
      id: event.pointerId, centerX, centerY, startX: event.clientX, startY: event.clientY,
      startStep: step, lastAngle: Math.atan2(dy, dx), turns: 0,
      nearCenter: Math.hypot(dx, dy) < bounds.width * .16
    };
    dragged = false;
    dial.setPointerCapture(event.pointerId);
  });
  dial.addEventListener("pointermove", event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (Math.hypot(dx, dy) < 5 && !dragged) return;
    dragged = true;
    if (timeSettings.disabled) return;
    const angle = Math.atan2(event.clientY - gesture.centerY, event.clientX - gesture.centerX);
    const difference = angle - gesture.lastAngle;
    gesture.turns += Math.atan2(Math.sin(difference), Math.cos(difference));
    gesture.lastAngle = angle;
    // One revolution has 36 clicks. A drag starting at the center can slide instead.
    const clicks = gesture.nearCenter ? (dx - dy) / 9 : gesture.turns * 36 / (2 * Math.PI);
    const next = clampStep(gesture.startStep + Math.round(clicks));
    if (step !== next) selectTime(next);
  });
  dial.addEventListener("pointerup", event => {
    if (gesture?.id === event.pointerId) gesture = null;
  });
  dial.addEventListener("lostpointercapture", () => { gesture = null; });
  dial.addEventListener("pointercancel", () => { gesture = null; dragged = true; });
  dial.addEventListener("click", event => {
    if (!dragged || event.detail === 0) toggleTimer();
    dragged = false;
  });
  dial.addEventListener("keydown", event => {
    if (timeSettings.disabled) return;
    const direction = {ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1}[event.key];
    if (direction) {
      event.preventDefault();
      selectTime(step + direction);
    }
  });
  document.addEventListener("visibilitychange", tick);
  window.addEventListener("pagehide", () => { stopInterval(); sound.stop(); });
  window.addEventListener("pageshow", () => {
    tick();
    if (phase === "running" && interval === null) {
      interval = setInterval(tick, 125);
      sound.play(selectedSound(), deadline);
    }
  });
  selectTime(step);
})();
