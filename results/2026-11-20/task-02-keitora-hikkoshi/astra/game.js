(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const paths = {
    sound: '<path d="M3 9h4l5-4v14l-5-4H3z"/><path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    mute: '<path d="M3 9h4l5-4v14l-5-4H3z"/><path d="m16 9 5 6m0-6-5 6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 3.5 2.2c-1.1.6-1.4 1.2-1.4 2.3m0 3h.05"/>',
    arrow: '<path d="M3 12h17m-6-6 6 6-6 6"/>',
    pin: '<path d="M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 1 1 16 0Z" fill="currentColor" stroke="none"/><circle cx="12" cy="10" r="3" fill="#fff7e8" stroke="none"/>',
    yard: '<path d="m2 8 10-5 10 5v13H2z"/><path d="M6 21V11h12v10m-12-7h12M6 17h12"/>',
    package: '<path d="m12 2 9 5v10l-9 5-9-5V7z"/><path d="m3 7 9 5 9-5M12 12v10M7.6 4.5l9 5"/>',
    weight: '<path d="m6 9-3 12h18L18 9z"/><circle cx="12" cy="6" r="3"/>',
    balance:
      '<path d="M12 3v17m-5 1h10M3 6h18M5 7l-3 7h6zm14 0-3 7h6z"/><path d="M2 14a3 3 0 0 0 6 0m8 0a3 3 0 0 0 6 0"/>',
    pointer: '<path d="m4 3 15 11-7 .6-3.6 6z" fill="#fff8e6"/><path d="m12 15 3.6 6"/>',
    reset: '<path d="M3.3 10A8.5 8.5 0 1 1 4 17m-.7-7V4m0 6h6"/>',
    repeat: '<path d="M4 8h15l-3-3m4 11H5l3 3M20 8v3M4 16v-3"/>',
    down: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    pause: '<path fill="currentColor" stroke="none" d="M5 3h5v18H5zm9 0h5v18h-5z"/>',
    play: '<path fill="currentColor" stroke="none" d="m6 3 15 9-15 9z"/>',
    gauge:
      '<path d="M3 18a10 10 0 1 1 18 0z"/><path d="m12 15 5-6M4 13h1m2-6 1 1m4-3v2m8 6h-1"/><circle cx="12" cy="15" r="1"/>',
    close: '<path d="m5 5 14 14M19 5 5 19"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    truck:
      '<path d="M2 7h12v9H2zm12 3h4l4 4v2h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    receipt: '<path d="M5 3h14v18l-3-2-4 2-4-2-3 2z"/><path d="M8 8h8m-8 4h8m-8 4h4"/>',
    flag: '<path d="M4 22V3m0 1c5-4 10 4 16 0v10c-6 4-11-4-16 0"/>',
  };
  function icon(node, name) {
    node.dataset.icon = name;
    node.innerHTML =
      '<svg aria-hidden="true" focusable="false" class="icon" viewBox="0 0 24 24">' +
      paths[name] +
      "</svg>";
  }
  document.querySelectorAll("[data-icon]").forEach((node) => icon(node, node.dataset.icon));
  const money = (n) => "¥" + n.toLocaleString("ja-JP");

  class Effects {
    constructor() {
      try {
        this.on = localStorage.getItem("keitora-sound") !== "off";
      } catch {
        this.on = true;
      }
      this.ctx = null;
      this.motor = null;
      this.level = null;
    }
    unlock() {
      if (!this.on) return;
      try {
        const Type = window.AudioContext || window.webkitAudioContext;
        if (!Type) return;
        if (!this.ctx) this.ctx = new Type();
        if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      } catch {
        /* The game can also run without an audio device. */
      }
    }
    tone(frequency, duration, delay = 0, wave = "triangle", volume = 0.052) {
      if (!this.on || !this.ctx || this.ctx.state !== "running") return;
      const c = this.ctx,
        at = c.currentTime + delay;
      const osc = c.createOscillator(),
        gain = c.createGain();
      osc.type = wave;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(volume, at + 0.009);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      osc.connect(gain).connect(c.destination);
      osc.start(at);
      osc.stop(at + duration + 0.01);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    }
    effect(kind) {
      if (kind === "pack") {
        this.tone(420, 0.075);
        this.tone(620, 0.09, 0.055);
      } else if (kind === "lost" || kind === "broken") {
        this.tone(206, 0.11, 0, "sawtooth", 0.024);
        this.tone(126, 0.17, 0.1);
      } else if (kind === "goal") [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.15, i * 0.095));
      else if (kind === "bump") this.tone(100, 0.085, 0, "triangle", 0.035);
      else this.tone(480, 0.07, 0, "triangle", 0.035);
    }
    engine(speed) {
      if (!this.on || speed <= 0.1 || !this.ctx || this.ctx.state !== "running") {
        if (this.motor) {
          this.motor.stop();
          this.motor.disconnect();
          this.level.disconnect();
          this.motor = null;
        }
        return;
      }
      const c = this.ctx;
      if (!this.motor) {
        this.motor = c.createOscillator();
        this.level = c.createGain();
        this.motor.type = "triangle";
        this.level.gain.value = 0.014;
        this.motor.connect(this.level).connect(c.destination);
        this.motor.start();
      }
      this.motor.frequency.setTargetAtTime(37 + speed * 4.5, c.currentTime, 0.08);
    }
    toggle() {
      this.on = !this.on;
      try {
        localStorage.setItem("keitora-sound", this.on ? "on" : "off");
      } catch {}
      if (this.on) {
        this.unlock();
        this.effect("click");
      } else this.engine(0);
    }
  }

  const sound = new Effects();
  const scene = new KeitoraScene($("scene"), $("bed-controls"));
  const ui = {
    phase: "load",
    load: [],
    selected: "box",
    hover: null,
    placed: null,
    run: null,
    paused: false,
    lastFrame: null,
    accumulator: 0,
    hudAt: 0,
    eventsSeen: 0,
    drawPending: false,
    ready: false,
  };
  const gasInputs = new Set(),
    brakeInputs = new Set();
  const tiles = new Map(),
    rows = new Map();
  let drag = null,
    skipClick = false,
    noticeTimer = null;
  const guide = $("guide");
  const stockHint = "荷物を選んで、荷台に置こう。";

  function updateSoundButton() {
    const text = sound.on ? "音を消す" : "音を出す";
    $("sound").setAttribute("aria-label", text);
    $("sound").title = text;
    $("sound").setAttribute("aria-pressed", String(sound.on));
    icon($("sound").firstElementChild, sound.on ? "sound" : "mute");
  }
  function announce(message) {
    $("announcement").textContent = message;
  }
  function hideNotice() {
    clearTimeout(noticeTimer);
    $("scene-notice").className = "scene-notice";
  }
  function notice(message, bad = false, length = 1900) {
    clearTimeout(noticeTimer);
    const el = $("scene-notice");
    el.textContent = message;
    el.className = "scene-notice visible" + (bad ? " bad" : "");
    noticeTimer = setTimeout(hideNotice, length);
    announce(message);
  }
  function count(n, of, label) {
    const el = $("item-count");
    el.innerHTML = "<b>" + n + "</b><span>/</span>" + of;
    el.setAttribute("aria-label", label);
    el.title = label;
  }
  function setLamp(label, rolling) {
    $("phase-light").lastElementChild.textContent = label;
    $("phase-light").classList.toggle("rolling", rolling);
  }
  function clearControls() {
    gasInputs.clear();
    brakeInputs.clear();
    $("gas").classList.remove("held");
    $("brake").classList.remove("held");
  }
  function phase(name) {
    ui.phase = name;
    document.body.dataset.phase = name;
    hideNotice();
    clearControls();
    const index = ["load", "drive", "result"].indexOf(name);
    document.querySelectorAll(".step").forEach((el, i) => {
      el.className = "step" + (i === index ? " current" : i < index ? " complete" : "");
      if (i === index) el.setAttribute("aria-current", "step");
      else el.removeAttribute("aria-current");
    });
    $("stage").hidden = name === "result";
    $("receipt").hidden = name !== "result";
    $("load-meters").hidden = name !== "load";
    $("drive-meters").hidden = name !== "drive";
    $("inventory").hidden = name !== "load";
    $("condition-list").hidden = name === "load";
    $("bed-controls").hidden = name !== "load";
    $("pause").hidden = name !== "drive";
    $("pause-shade").hidden = true;
    $("load-actions").hidden = name !== "load";
    $("drive-actions").hidden = name !== "drive";
    $("result-actions").hidden = name !== "result";
    $("arena-title").textContent = ["積み込みヤード", "配送コース", "配送伝票"][index];
    icon($("arena-icon"), ["yard", "truck", "receipt"][index]);
    $("manifest-title").textContent = ["荷物リスト", "荷物の状態", "荷物別の明細"][index];
    $("hint").textContent = [
      stockHint,
      "アクセル・ブレーキを長押しで操作。",
      "積み方や速度を変えて、もう一度。",
    ][index];
    icon($("hint-icon"), ["pointer", "gauge", "flag"][index]);
    setLamp(["待機中", "発進待ち", "到着済み"][index], name === "drive");
  }
  function requestFrame() {
    if (ui.drawPending) return;
    ui.drawPending = true;
    requestAnimationFrame(frame);
  }

  for (const c of Keitora.cargo) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "cargo-tile";
    tile.dataset.item = c.id;
    tile.innerHTML =
      '<span class="tile-art"><img alt="" draggable="false" src="assets/' +
      c.id +
      '.png"></span>' +
      '<span class="cargo-name">' +
      c.name +
      '</span><span class="cargo-weight">' +
      c.mass +
      ' kg</span><span class="packed-mark" hidden></span>';
    icon(tile.lastElementChild, "check");
    tile.title = c.name + "　" + c.w + "列×" + c.h + "段　運送料 " + money(c.fee);
    tile.addEventListener("click", () => {
      if (!skipClick) choose(c.id);
    });
    tile.addEventListener("pointerdown", (e) => beginDrag(e, "list", c.id));
    $("inventory").append(tile);
    tiles.set(c.id, tile);

    const row = document.createElement("div");
    row.className = "condition-row";
    row.dataset.item = c.id;
    row.innerHTML =
      '<img src="assets/' +
      c.id +
      '.png" alt=""><div><strong>' +
      c.name +
      '</strong><small class="item-net"></small></div><span class="status-chip"></span>';
    $("condition-list").append(row);
    rows.set(c.id, row);
  }
  for (let i = 0; i < Keitora.COLS; i++) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.col = i;
    button.setAttribute("aria-label", "荷台の" + (i + 1) + "列目に置く");
    button.addEventListener("click", () => {
      if (!skipClick) put(ui.selected, i);
    });
    button.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "touch") {
        ui.hover = i;
        requestFrame();
      }
    });
    button.addEventListener("focus", () => {
      if (button.matches(":focus-visible")) {
        ui.hover = i;
        requestFrame();
      }
    });
    button.addEventListener("blur", () => {
      ui.hover = null;
      requestFrame();
    });
    button.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const next = Keitora.clamp(i + (e.key === "ArrowLeft" ? -1 : 1), 0, Keitora.COLS - 1);
      $("bed-controls").children[next].focus();
    });
    button.addEventListener("pointerdown", (e) => {
      const rect = $("bed-controls").getBoundingClientRect();
      const y = ((rect.bottom - e.clientY) / rect.height) * Keitora.ROWS;
      const p = ui.load.find(
        (p) =>
          i >= p.col &&
          i < p.col + Keitora.byId[p.id].w &&
          y >= p.row &&
          y < p.row + Keitora.byId[p.id].h,
      );
      if (p) beginDrag(e, "bed", p.id);
    });
    $("bed-controls").append(button);
  }
  $("bed-controls").addEventListener("pointerleave", () => {
    ui.hover = null;
    requestFrame();
  });
  function refreshLoad() {
    const profile = Keitora.loadProfile(ui.load);
    $("weight").textContent = String(profile.mass);
    $("weight-track").firstElementChild.style.width = (profile.mass / Keitora.LIMIT) * 100 + "%";
    const stability = $("stability");
    stability.textContent = profile.label;
    stability.className =
      "stability-value " +
      (!ui.load.length ? "" : profile.score >= 73 ? "safe" : profile.score >= 48 ? "caution" : "risky");
    count(ui.load.length, Keitora.cargo.length, "積み込み済み " + ui.load.length + "個、全6個");
    for (const c of Keitora.cargo) {
      const tile = tiles.get(c.id),
        packed = ui.load.some((p) => p.id === c.id),
        selected = ui.selected === c.id;
      tile.classList.toggle("selected", selected);
      tile.classList.toggle("packed", packed);
      tile.setAttribute("aria-pressed", String(selected));
      tile.setAttribute("aria-label", c.name + " " + c.mass + " kg" + (packed ? " 積載済み" : ""));
      tile.lastElementChild.hidden = !packed;
    }
    $("remove").hidden = !ui.load.some((p) => p.id === ui.selected);
    requestFrame();
  }
  function choose(id) {
    if (ui.phase !== "load") return;
    sound.unlock();
    sound.effect("click");
    ui.selected = id;
    ui.hover = null;
    const c = Keitora.byId[id],
      packed = ui.load.some((p) => p.id === id);
    $("hint").textContent = packed
      ? c.name + "を移す列を選ぶか、荷台から降ろせます。"
      : c.name + "を置く列を選ぼう。";
    announce(c.name + "を選択。 " + c.w + "列・" + c.h + "段、運送料 " + money(c.fee));
    refreshLoad();
  }
  function nextItem() {
    return Keitora.cargo.find((c) => !ui.load.some((p) => p.id === c.id))?.id || null;
  }
  function put(id, col) {
    if (ui.phase !== "load") return;
    sound.unlock();
    const pos = Keitora.placement(ui.load, id, col);
    if (pos.error) {
      notice(pos.error, true);
      return;
    }
    const previous = ui.load.find((p) => p.id === id);
    ui.load = [...ui.load.filter((p) => p.id !== id), pos];
    ui.placed = { id, at: performance.now() };
    const c = Keitora.byId[id];
    ui.selected = nextItem();
    ui.hover = null;
    sound.effect("pack");
    notice(c.name + (previous ? "を移動しました" : "を積みました"), false, 1100);
    $("hint").textContent = ui.selected
      ? Keitora.byId[ui.selected].name + "を置く列を選ぼう。"
      : "全6個を積み込みました。出発しよう！";
    refreshLoad();
  }
  function unload(id) {
    if (ui.phase !== "load" || !ui.load.some((p) => p.id === id)) return;
    if (Keitora.covered(ui.load, id)) {
      notice("上に載っている荷物を先に降ろしてください。", true);
      return;
    }
    ui.load = ui.load.filter((p) => p.id !== id);
    ui.selected = id;
    ui.hover = null;
    notice(Keitora.byId[id].name + "を降ろしました");
    $("hint").textContent = stockHint;
    refreshLoad();
  }
  function resetLoading() {
    ui.load = [];
    ui.selected = "box";
    ui.hover = null;
    ui.placed = null;
    ui.run = null;
    ui.paused = false;
    phase("load");
    refreshLoad();
    $("scene").setAttribute("aria-label", "桜町の引っ越しヤードに停車した軽トラック");
  }
  function beginDrag(e, origin, id) {
    if (!e.isPrimary || e.button !== 0 || ui.phase !== "load") return;
    drag = {
      origin,
      id,
      x: e.clientX,
      y: e.clientY,
      pointer: e.pointerId,
      source: e.currentTarget,
      active: false,
      ghost: null,
    };
  }
  function columnAt(x, y) {
    const r = $("bed-controls").getBoundingClientRect();
    if (x < r.left || x >= r.right || y < r.top || y > r.bottom) return null;
    return Math.min(Keitora.COLS - 1, Math.floor(((x - r.left) / r.width) * Keitora.COLS));
  }
  function abandonDrag() {
    if (drag?.ghost) drag.ghost.remove();
    if (drag?.source.hasPointerCapture?.(drag.pointer)) drag.source.releasePointerCapture(drag.pointer);
    drag = null;
  }
  document.addEventListener(
    "pointermove",
    (e) => {
      if (!drag || e.pointerId !== drag.pointer || ui.phase !== "load") return;
      if (!drag.active && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 7) return;
      if (!drag.active) {
        drag.active = true;
        choose(drag.id);
        drag.ghost = document.createElement("div");
        drag.ghost.className = "drag-ghost";
        drag.ghost.innerHTML = '<img src="assets/' + drag.id + '.png" alt="">';
        document.body.append(drag.ghost);
        try {
          drag.source.setPointerCapture(e.pointerId);
        } catch {}
      }
      drag.ghost.style.left = e.clientX + "px";
      drag.ghost.style.top = e.clientY + "px";
      ui.hover = columnAt(e.clientX, e.clientY);
      requestFrame();
      if (e.cancelable) e.preventDefault();
    },
    { passive: false },
  );
  document.addEventListener("pointerup", (e) => {
    if (!drag || e.pointerId !== drag.pointer) return;
    if (drag.active) {
      skipClick = true;
      setTimeout(() => {
        skipClick = false;
      }, 0);
      const col = columnAt(e.clientX, e.clientY),
        r = $("inventory").getBoundingClientRect();
      if (col !== null) put(drag.id, col);
      else if (
        drag.origin === "bed" &&
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom
      )
        unload(drag.id);
      ui.hover = null;
      requestFrame();
    }
    abandonDrag();
  });
  document.addEventListener("pointercancel", () => {
    abandonDrag();
    ui.hover = null;
    requestFrame();
  });
  document.addEventListener("dragstart", (e) => {
    if (e.target.closest(".cargo-tile, .bed-controls")) e.preventDefault();
  });
  $("remove").addEventListener("click", () => unload(ui.selected));
  $("reset").addEventListener("click", () => {
    resetLoading();
    notice("荷台を空にしました");
  });

  function refreshConditions(final) {
    const entries = Keitora.settle(ui.run).lines;
    const labels = {
      onboard: "積載中",
      intact: "無傷",
      broken: "破損",
      lost: "落下",
      unloaded: "未積載",
    };
    for (const { item, status, net } of entries) {
      const row = rows.get(item.id),
        key = !final && status === "intact" ? "onboard" : status;
      row.className = "condition-row " + key;
      row.lastElementChild.className = "status-chip " + key;
      row.lastElementChild.textContent = labels[key];
      row.querySelector(".item-net").textContent = final ? money(net) : item.mass + " kg";
    }
    const left = ui.run.bodies.filter((b) => !b.lost).length;
    count(
      left,
      ui.load.length,
      (final ? "到着した荷物 " : "荷台に残っている荷物 ") + left + "個、出発時 " + ui.load.length + "個",
    );
  }
  function hud() {
    const r = ui.run,
      distance = Math.floor(r.distance),
      next = r.nextObstacle;
    $("speed").textContent = Math.round(r.speed * 3.6);
    $("distance").textContent = distance;
    $("progress-fill").style.width = (r.distance / Keitora.GOAL) * 100 + "%";
    const remaining = next
      ? Math.ceil(next.start - Keitora.AXLE_METRES / 2 - r.distance)
      : Keitora.GOAL - distance;
    let message = next ? next.name + "まで " + remaining + " m" : "ゴールまで " + remaining + " m";
    if (next && remaining <= 0) message = next.name + "を通過中";
    else if (next && remaining < 28) message += "　減速しよう";
    if (!distance && r.speed < 1) message = "アクセルを長押しして発進";
    if (r.finishTime !== null) message = "ひなた団地に到着";
    $("obstacle").textContent = message;
    $("obstacle").classList.toggle("near", Boolean(next && remaining < 28));
    setLamp(
      ui.paused
        ? "一時停止"
        : r.finishTime !== null
          ? "到着"
          : r.speed > 0.1
            ? "走行中"
            : r.distance >= 1
              ? "停車中"
              : "発進待ち",
      !ui.paused,
    );
  }
  function startDrive() {
    if (!ui.load.length) {
      notice("まずは荷物を1個、荷台に置いてください。", true);
      return;
    }
    if (!ui.ready) {
      notice("ヤードの画像を読み込み中です。");
      return;
    }
    abandonDrag();
    sound.unlock();
    sound.effect("pack");
    ui.run = new Keitora.Drive(ui.load);
    ui.paused = false;
    ui.lastFrame = null;
    ui.accumulator = 0;
    ui.hudAt = 0;
    ui.eventsSeen = 0;
    phase("drive");
    refreshConditions(false);
    hud();
    requestFrame();
    $("scene").setAttribute("aria-label", "桜町からひなた団地までの配送コース");
    announce("走行開始。右矢印またはアクセルを長押しして発進してください。");
    if (window.innerWidth <= 700) window.scrollTo(0, 0);
  }
  function setPause(value) {
    if (ui.phase !== "drive" || ui.run.finishTime !== null) return;
    ui.paused = value;
    clearControls();
    ui.lastFrame = null;
    ui.accumulator = 0;
    sound.engine(0);
    $("pause-shade").hidden = !value;
    $("pause").hidden = value;
    hud();
    requestFrame();
    if (value) $("resume").focus({ preventScroll: true });
    else $("pause").focus({ preventScroll: true });
  }
  function finish() {
    sound.engine(0);
    phase("result");
    refreshConditions(true);
    const s = Keitora.settle(ui.run);
    $("receipt-count").textContent =
      "走行距離 320 m　·　" + ui.load.length + "個中 " + s.arrived + "個が到着";
    $("gross").textContent = money(s.gross);
    for (const [el, amount] of [
      [$("broken-fee"), s.broken],
      [$("lost-fee"), s.lost],
    ]) {
      el.textContent = (amount ? "−" : "") + money(amount);
      el.classList.toggle("deduction", amount > 0);
    }
    $("payout").textContent = money(s.total);
    announce("配送完了。受取金額 " + money(s.total));
    if (window.innerWidth <= 700) window.scrollTo(0, 0);
  }
  function frame(now) {
    ui.drawPending = false;
    if (!ui.ready) return;
    if (ui.phase === "load") {
      scene.drawLoading(ui.load, ui.selected, ui.hover, ui.placed, now);
      if (
        ui.placed &&
        now - ui.placed.at < 270 &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        requestFrame();
      return;
    }
    if (ui.phase !== "drive") return;
    const r = ui.run,
      stopped = ui.paused || guide.open;
    const elapsed = ui.lastFrame === null ? 0 : Math.min(0.1, (now - ui.lastFrame) / 1000);
    ui.lastFrame = stopped ? null : now;
    if (!stopped) {
      ui.accumulator += elapsed;
      const step = 1 / 90;
      while (ui.accumulator >= step && !r.done) {
        r.step(step, { gas: gasInputs.size > 0, brake: brakeInputs.size > 0 });
        ui.accumulator -= step;
      }
      let event = null;
      const priority = { bump: 0, broken: 1, lost: 2, goal: 3 };
      while (ui.eventsSeen < r.events.length) {
        const candidate = r.events[ui.eventsSeen++];
        if (!event || priority[candidate.type] >= priority[event.type]) event = candidate;
      }
      if (event) {
        sound.effect(event.type);
        if (event.type !== "bump") {
          refreshConditions(false);
          notice(event.label, event.type !== "goal", 1450);
        }
      }
      if (now - ui.hudAt > 80) {
        hud();
        sound.engine(r.speed);
        ui.hudAt = now;
      }
    }
    scene.drawRun(r);
    if (r.done) {
      finish();
      return;
    }
    if (!stopped) requestFrame();
  }
  function pedal(which, source, down) {
    if (ui.phase !== "drive" || ui.paused || guide.open || ui.run.finishTime !== null) return;
    const set = which === "gas" ? gasInputs : brakeInputs;
    if (down) {
      sound.unlock();
      set.add(source);
    } else set.delete(source);
    $(which).classList.toggle("held", set.size > 0);
    requestFrame();
  }
  for (const which of ["gas", "brake"]) {
    const el = $(which);
    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      pedal(which, "pointer" + e.pointerId, true);
    });
    for (const kind of ["pointerup", "pointercancel", "lostpointercapture"])
      el.addEventListener(kind, (e) => pedal(which, "pointer" + e.pointerId, false));
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    el.addEventListener("click", (e) => {
      if (e.detail === 0) {
        pedal(which, "assist", true);
        setTimeout(() => pedal(which, "assist", false), 240);
      }
    });
  }
  const keys = {
    ArrowRight: "gas",
    ArrowUp: "gas",
    KeyD: "gas",
    KeyW: "gas",
    ArrowLeft: "brake",
    ArrowDown: "brake",
    KeyA: "brake",
    KeyS: "brake",
  };
  document.addEventListener("keydown", (e) => {
    if (ui.phase !== "drive" || guide.open || e.metaKey || e.ctrlKey || e.altKey) return;
    if (keys[e.code]) {
      e.preventDefault();
      pedal(keys[e.code], e.code, true);
      return;
    }
    if ((e.code === "Space" || e.code === "Enter") && ["gas", "brake"].includes(e.target.id)) {
      e.preventDefault();
      pedal(e.target.id, e.code, true);
      return;
    }
    if (e.code === "Space" && !e.repeat) {
      e.preventDefault();
      setPause(!ui.paused);
    }
  });
  document.addEventListener("keyup", (e) => {
    if (keys[e.code]) pedal(keys[e.code], e.code, false);
    if (e.code === "Space" || e.code === "Enter") {
      pedal("gas", e.code, false);
      pedal("brake", e.code, false);
    }
  });
  window.addEventListener("blur", () => {
    clearControls();
    abandonDrag();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && ui.phase === "drive") setPause(true);
  });
  $("depart").addEventListener("click", startDrive);
  $("rerun").addEventListener("click", startDrive);
  $("again").addEventListener("click", () => {
    resetLoading();
    announce("新しい積み込みを開始しました。");
    if (window.innerWidth <= 700) window.scrollTo(0, 0);
  });
  $("pause").addEventListener("click", () => setPause(true));
  $("resume").addEventListener("click", () => setPause(false));
  $("sound").addEventListener("click", () => {
    sound.toggle();
    updateSoundButton();
  });
  $("help").addEventListener("click", () => {
    clearControls();
    sound.engine(0);
    ui.lastFrame = null;
    ui.accumulator = 0;
    guide.showModal();
    guide.querySelector(".guide-ok").focus({ preventScroll: true });
    requestFrame();
  });
  guide.querySelector(".guide-ok").addEventListener("click", () => guide.close());
  guide.querySelector(".close-button").addEventListener("click", () => guide.close());
  guide.addEventListener("click", (e) => {
    if (e.target !== guide) return;
    const r = guide.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
      guide.close();
  });
  guide.addEventListener("close", () => {
    ui.lastFrame = null;
    ui.accumulator = 0;
    requestFrame();
  });
  resetLoading();
  updateSoundButton();
  scene
    .preload()
    .then(() => {
      ui.ready = true;
      requestFrame();
    })
    .catch((err) => {
      $("hint").textContent = err.message + "。ページを再読み込みしてください。";
      announce($("hint").textContent);
    });
})();
