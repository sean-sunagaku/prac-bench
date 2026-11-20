"use strict";

const LED_COUNT = 24;
const MIN_MINUTES = 1;
const MAX_MINUTES = 60;
const QUICK_DURATION = 10_000;
const DETENT_ANGLE = (Math.PI * 2) / 36;

function createAmbientPlayer(reportFailure) {
  let context;
  let noise;
  let active;

  function stop() {
    if (!active) return;
    const now = context.currentTime;
    active.gain.gain.setTargetAtTime(0, now, 0.035);
    active.source.stop(now + 0.15);
    active = null;
  }

  function play(mode) {
    stop();
    if (mode === "silent") return;

    try {
      const AudioEngine = window.AudioContext || window.webkitAudioContext;
      context ??= new AudioEngine();
      if (!noise) {
        noise = context.createBuffer(1, context.sampleRate * 6, context.sampleRate);
        const samples = noise.getChannelData(0);
        for (let index = 0; index < samples.length; index += 1) {
          samples[index] = Math.random() * 2 - 1;
        }
      }

      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      const isRain = mode === "rain";
      source.buffer = noise;
      source.loop = true;
      filter.type = isRain ? "lowpass" : "allpass";
      filter.frequency.value = isRain ? 1550 : 2400;
      filter.Q.value = 0.45;
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.setTargetAtTime(isRain ? 0.21 : 0.068, context.currentTime, 0.12);
      source.connect(filter).connect(gain).connect(context.destination);
      source.addEventListener("ended", () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      }, { once: true });

      const playback = { source, gain };
      source.start();
      active = playback;
      context.resume().catch(() => {
        if (active !== playback) return;
        stop();
        reportFailure();
      });
    } catch {
      reportFailure();
    }
  }

  return { play, stop };
}

function mountTimer() {
  const panel = document.querySelector(".timer-panel");
  const readout = document.querySelector("#time-readout");
  const stateLabel = document.querySelector("#timer-state");
  const minutesInput = document.querySelector("#minutes");
  const minuteDown = document.querySelector("#minute-down");
  const minuteUp = document.querySelector("#minute-up");
  const quickButton = document.querySelector("#quick-mode");
  const toggleButton = document.querySelector("#timer-toggle");
  const toggleLabel = document.querySelector("#timer-toggle-label");
  const resetButton = document.querySelector("#timer-reset");
  const dial = document.querySelector("#dial");
  const ring = document.querySelector("#dial-ring");
  const audioFeedback = document.querySelector("#audio-feedback");
  const soundSettings = document.querySelector(".sound-settings");

  const labels = {
    ready: { status: "設定中", action: "スタート" },
    running: { status: "集中中", action: "一時停止" },
    paused: { status: "一時停止中", action: "再開" },
    done: { status: "集中時間が終了しました", action: "もう一度" },
  };

  const leds = Array.from({ length: LED_COUNT }, (_, index) => {
    const led = document.createElement("span");
    led.className = "dial-tick";
    led.style.setProperty("--angle", `${(360 * index) / LED_COUNT}deg`);
    return led;
  });
  ring.replaceChildren(...leds);

  let minutes = 25;
  let isQuick = false;
  let sound = "silent";
  let phase = "ready";
  let remaining = minutes * 60_000;
  let deadline = 0;
  let ticker;
  let lastLit = -1;
  let rotation = 0;

  const audio = createAmbientPlayer(() => {
    audioFeedback.textContent = "このブラウザーでは環境音を再生できませんでした。";
    audioFeedback.hidden = false;
  });

  const duration = () => isQuick ? QUICK_DURATION : minutes * 60_000;
  const isTiming = () => phase === "running" || phase === "paused";

  function renderProgress() {
    const seconds = Math.ceil(remaining / 1000);
    const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    const display = `${mm}:${ss}`;
    if (readout.textContent !== display) readout.textContent = display;

    const lit = Math.ceil((remaining / duration()) * LED_COUNT);
    if (lit === lastLit) return;
    leds.forEach((led, index) => led.classList.toggle("is-lit", index < lit));
    lastLit = lit;
  }

  function renderControls() {
    const locked = isTiming();
    const { action, status } = labels[phase];
    const message = phase === "ready" && isQuick ? "10秒モード" : status;
    panel.dataset.phase = phase;
    if (stateLabel.textContent !== message) stateLabel.textContent = message;
    toggleLabel.textContent = action;
    dial.setAttribute("aria-label", `天面を押す（${action}）`);
    if (document.activeElement !== minutesInput) minutesInput.value = String(minutes);
    minutesInput.disabled = locked;
    minuteDown.disabled = locked || minutes === MIN_MINUTES;
    minuteUp.disabled = locked || minutes === MAX_MINUTES;
    quickButton.disabled = locked;
    quickButton.setAttribute("aria-pressed", String(isQuick));
    dial.style.setProperty("--rotation", `${rotation}deg`);
  }

  function configure(value, quick = false) {
    if (isTiming()) return;
    const adjusted = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(value)));
    rotation += (adjusted - minutes) * 10;
    minutes = adjusted;
    isQuick = quick;
    phase = "ready";
    remaining = duration();
    renderProgress();
    renderControls();
  }

  function stopTimer() {
    window.clearInterval(ticker);
    audio.stop();
    audioFeedback.hidden = true;
  }

  function tick() {
    if (phase !== "running") return;
    remaining = Math.max(0, deadline - Date.now());
    renderProgress();
    if (remaining > 0) return;

    stopTimer();
    phase = "done";
    renderControls();
  }

  function toggleTimer() {
    if (phase === "running") {
      tick();
      if (phase === "done") return;
      stopTimer();
      phase = "paused";
    } else {
      if (phase !== "paused") remaining = duration();
      deadline = Date.now() + remaining;
      phase = "running";
      audio.play(sound);
      ticker = window.setInterval(tick, 80);
    }
    renderProgress();
    renderControls();
  }

  resetButton.addEventListener("click", () => {
    stopTimer();
    phase = "ready";
    remaining = duration();
    renderProgress();
    renderControls();
  });
  toggleButton.addEventListener("click", toggleTimer);
  minuteDown.addEventListener("click", () => configure(minutes - 1));
  minuteUp.addEventListener("click", () => configure(minutes + 1));
  quickButton.addEventListener("click", () => configure(minutes, !isQuick));
  minutesInput.addEventListener("input", () => {
    const value = minutesInput.valueAsNumber;
    if (Number.isInteger(value) && value >= MIN_MINUTES && value <= MAX_MINUTES) configure(value);
  });
  minutesInput.addEventListener("change", () => {
    const value = minutesInput.valueAsNumber;
    if (Number.isFinite(value)) configure(value);
    minutesInput.value = String(minutes);
  });
  soundSettings.addEventListener("change", (event) => {
    sound = event.target.value;
    audioFeedback.hidden = true;
    if (phase === "running") audio.play(sound);
  });
  document.addEventListener("visibilitychange", tick);

  let drag;
  let dragWasUsed = false;

  dial.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    dragWasUsed = false;
    if (isTiming()) return;

    const bounds = dial.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      centerX,
      centerY,
      horizontal: Math.hypot(dx, dy) < bounds.width * 0.19,
      angle: Math.atan2(dy, dx),
      offset: 0,
    };
    dial.setPointerCapture(event.pointerId);
  });

  dial.addEventListener("pointermove", (event) => {
    if (!drag || drag.id !== event.pointerId || isTiming()) return;
    const moveX = event.clientX - drag.x;
    const moveY = event.clientY - drag.y;
    if (!dragWasUsed && Math.hypot(moveX, moveY) < 6) return;
    dragWasUsed = true;

    const nextAngle = Math.atan2(event.clientY - drag.centerY, event.clientX - drag.centerX);
    const delta = nextAngle - drag.angle;
    drag.offset += drag.horizontal ? moveX * DETENT_ANGLE / 13 : Math.atan2(Math.sin(delta), Math.cos(delta));
    drag.angle = nextAngle;
    drag.x = event.clientX;
    drag.y = event.clientY;
    const steps = Math.trunc(drag.offset / DETENT_ANGLE);
    if (steps === 0) return;
    drag.offset -= steps * DETENT_ANGLE;
    configure(minutes + steps);
  });

  function endDrag(event) {
    if (drag?.id === event.pointerId) drag = null;
  }

  dial.addEventListener("pointerup", endDrag);
  dial.addEventListener("pointercancel", endDrag);
  dial.addEventListener("lostpointercapture", endDrag);
  dial.addEventListener("click", (event) => {
    if (event.detail > 0 && dragWasUsed) return;
    toggleTimer();
  });
  dial.addEventListener("keydown", (event) => {
    if (isTiming()) return;
    const steps = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    configure(minutes + step);
  });

  renderProgress();
  renderControls();
}

const FINISHES = {
  silver: { label: "アルマイトシルバー", surcharge: 0, inStock: true },
  black: { label: "マットブラック", surcharge: 0, inStock: false },
  brass: { label: "真鍮リミテッド", surcharge: 3000, inStock: true },
};
const PLANS = {
  early: { label: "先行予約早割", price: 14_800 },
  standard: { label: "一般販売（参考）", price: 18_500 },
};
const DESK_MAT_PRICE = 2400;
const jpNumber = new Intl.NumberFormat("ja-JP");
const yen = (amount) => `¥${jpNumber.format(amount)}`;

function mountConfigurator() {
  const form = document.querySelector("#configurator");
  const finishPreview = document.querySelector(".finish-preview");
  const finishName = document.querySelector("#finish-name");
  const previewImages = finishPreview.querySelectorAll(".finish-image");
  const totalOutput = document.querySelector("#total");
  const reviewButtonLabel = document.querySelector("#review-label");
  const dialog = document.querySelector("#review-dialog");
  const dialogTitle = document.querySelector("#review-title");
  const dialogDescription = document.querySelector("#review-description");
  const dialogFinish = document.querySelector("#review-finish");
  const dialogPlan = document.querySelector("#review-plan");
  const dialogOption = document.querySelector("#review-option");
  const dialogTotal = document.querySelector("#review-total");
  const completeButton = document.querySelector("#complete-demo");
  const backButton = document.querySelector("#review-back");

  for (const radio of form.querySelectorAll('[name="finish"]')) {
    radio.disabled = !FINISHES[radio.value].inStock;
  }

  function currentSelection() {
    const chosen = new FormData(form);
    const finish = chosen.get("finish") || "silver";
    const plan = chosen.get("plan") || "early";
    const mat = chosen.has("mat");
    return { finish, plan, mat, total: PLANS[plan].price + FINISHES[finish].surcharge + (mat ? DESK_MAT_PRICE : 0) };
  }

  function renderSelection() {
    const selection = currentSelection();
    finishName.textContent = FINISHES[selection.finish].label;
    previewImages.forEach((image) => { image.hidden = image.dataset.preview !== selection.finish; });
    totalOutput.value = yen(selection.total);
    reviewButtonLabel.textContent = selection.plan === "early" ? "予約内容を確認" : "購入内容を確認";
  }

  form.addEventListener("change", renderSelection);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const selection = currentSelection();
    dialog.dataset.completed = "false";
    dialogTitle.textContent = reviewButtonLabel.textContent;
    dialogDescription.hidden = false;
    dialogFinish.textContent = FINISHES[selection.finish].label;
    dialogPlan.textContent = PLANS[selection.plan].label;
    dialogOption.textContent = selection.mat ? "専用フェルトデスクマット" : "なし";
    dialogTotal.textContent = yen(selection.total);
    completeButton.hidden = false;
    backButton.textContent = "選択に戻る";
    dialog.showModal();
    dialogTitle.focus();
  });

  completeButton.addEventListener("click", () => {
    dialog.dataset.completed = "true";
    dialogTitle.textContent = "シミュレーション完了";
    dialogDescription.hidden = true;
    completeButton.hidden = true;
    backButton.textContent = "閉じる";
    dialogTitle.focus();
  });

  window.addEventListener("pageshow", renderSelection);
  renderSelection();
}

mountTimer();
mountConfigurator();
