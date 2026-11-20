/* 体験デモ①：集中タイマー
 * 回す（1クリック=5分=灯りひとつ、最大24灯=120分）→ 天面を押して開始 →
 * 灯りが端から消えていく → 終了の合図。動作中の押下で一時停止、長押しで中止。
 */
(function () {
  'use strict';
  var KOKU = window.KOKU || {};
  var Sound = KOKU.Sound;
  var Puck = KOKU.Puck;
  var section = document.getElementById('demo');
  var puckEl = document.getElementById('demo-puck');
  if (!section || !puckEl || !Puck || !Sound) return;

  var STEP_MIN = 5;
  var MAX_STEPS = 24;
  var MIN_MS = 60000;
  var STEP_MS = STEP_MIN * MIN_MS;
  var HOLD_MS = 1100;
  var FINISH_ANIM_MS = 7400;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var puck = new Puck(puckEl);
  var wrap = document.getElementById('device-wrap');
  var labelEl = document.getElementById('readout-label');
  var valueEl = document.getElementById('readout-value');
  var mainEl = document.getElementById('readout-main');
  var doneEl = document.getElementById('readout-done');
  var doneText = document.getElementById('done-text');
  var doneAgain = document.getElementById('done-again');
  var statusEl = document.getElementById('demo-status');
  var pressLabel = document.getElementById('press-label');
  var cancelBtn = section.querySelector('[data-action="cancel"]');
  var pressBtn = section.querySelector('[data-action="press"]');
  var stepEls = section.querySelectorAll('.step');
  var soundSwitch = document.getElementById('sound-switch');
  var numbersSwitch = document.getElementById('numbers-switch');

  var st = {
    phase: 'idle',      // idle | running | paused | finished
    steps: 0,           // いま設定している灯りの数（0〜24）
    setSteps: 0,        // スタート時に確定した灯りの数
    rot: 0,             // リングの見た目の回転（クリック数）
    speed: 60,          // 1 = 実際の時間、60 = 60倍速
    remAnchor: 0,       // 基準時点での残り（デモ内の ms）
    tAnchor: 0,         // 基準時点（performance.now）
    sweepFrom: -1,
    nudgeUntil: 0,
    finishAt: 0,
    flash: null,
    showNumbers: true,
    raf: 0,
    watchdog: 0,
    holdTimer: 0,
    holdFired: false
  };

  function now() { return performance.now(); }
  function remainingAt(t) {
    if (st.phase === 'running') return Math.max(0, st.remAnchor - (t - st.tAnchor) * st.speed);
    return st.remAnchor;
  }
  function reanchor(t) { st.remAnchor = remainingAt(t); st.tAnchor = t; }
  function minutesOf(steps) { return steps * STEP_MIN; }
  function vibrate(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* noop */ } }

  /* ---------- 読み上げ ---------- */
  var announceT = 0;
  function announce(msg) {
    clearTimeout(announceT);
    statusEl.textContent = '';
    announceT = setTimeout(function () { statusEl.textContent = msg; }, 60);
  }
  var setAnnounceT = 0;
  function announceSet() {
    clearTimeout(setAnnounceT);
    setAnnounceT = setTimeout(function () {
      announce(st.steps
        ? minutesOf(st.steps) + '分に設定しました（' + st.steps + '灯）。'
        : '0分です。リングを右に回して時間を決めてください。');
    }, 650);
  }

  /* ---------- 操作 ---------- */
  function touched() { section.classList.add('is-touched'); }

  /* 一時的な案内。状態や設定が変わったら、その時点で消す */
  function flashLabel(text) {
    st.flash = { text: text, until: now() + 2400, phase: st.phase, steps: st.steps };
    labelEl.textContent = text;
    clearTimeout(flashLabel._t);
    flashLabel._t = setTimeout(function () { st.flash = null; renderLabel(); }, 2450);
  }
  function clearFlash() {
    st.flash = null;
    clearTimeout(flashLabel._t);
  }
  function lockedMessage(source) {
    var how = source === 'key' ? 'Escキーで中止できます'
      : source === 'button' ? '「中止」ボタンで止められます'
      : '天面を長押しすると中止できます';
    return (st.phase === 'paused' ? '一時停止中' : '動作中') + 'は時間を変えられません。' + how;
  }

  function rotate(dir, source) {
    touched();
    st.rot += dir;
    puck.setRotation(st.rot);
    Sound.click(dir);
    vibrate(5);
    if (st.phase === 'running' || st.phase === 'paused') {
      flashLabel(lockedMessage(source));
      return;
    }
    if (st.phase === 'finished') toIdle(true);
    var next = Math.max(0, Math.min(MAX_STEPS, st.steps + dir));
    if (next === st.steps) {
      puck.bump();
      Sound.bump();
      flashLabel(next === 0 ? 'これ以上は減らせません。右に回すと灯りが増えます' : '24灯（120分）がいちばん長い設定です');
      return;
    }
    st.steps = next;
    draw(now());
    render();
    if (source !== 'key') announceSet();
  }

  /* Home / End：0分・120分まで一気に回す */
  function jumpTo(target, source) {
    touched();
    if (st.phase === 'running' || st.phase === 'paused') { flashLabel(lockedMessage(source)); return; }
    if (st.phase === 'finished') toIdle(true);
    var diff = target - st.steps;
    if (!diff) { puck.bump(); Sound.bump(); return; }
    st.rot += diff;
    puck.setRotation(st.rot);
    Sound.click(diff > 0 ? 1 : -1);
    st.steps = target;
    clearFlash();
    draw(now());
    render();
  }

  function press(source) {
    touched();
    Sound.press();
    if (source !== 'pointer') {
      puck.press(true);
      setTimeout(function () { puck.press(false); }, 140);
    }
    switch (st.phase) {
      case 'idle':
        if (st.steps === 0) {
          st.nudgeUntil = now() + 900;
          flashLabel('先にリングを右に回して、時間を決めてください');
          announce('まだ時間が決まっていません。リングを右に回して時間を決めてください。');
          ensureLoop();
          return;
        }
        start();
        break;
      case 'running': pause(); break;
      case 'paused': resume(); break;
      case 'finished':
        toIdle(true);
        announce('設定に戻りました。天面を押すと、同じ' + minutesOf(st.steps) + '分ではじまります。');
        break;
    }
  }

  function start() {
    var t = now();
    st.setSteps = st.steps;
    st.remAnchor = st.steps * STEP_MS;
    st.tAnchor = t;
    st.phase = 'running';
    st.sweepFrom = reduceMotion ? -1 : t;
    clearFlash();
    Sound.startChime();
    Sound.startAmbient(ambientMode());
    startWatchdog();
    announce(minutesOf(st.setSteps) + '分の集中をはじめました。' + (st.speed === 60 ? '60倍速で進みます。' : ''));
    render();
    ensureLoop();
  }

  function pause() {
    var t = now();
    reanchor(t);
    st.phase = 'paused';
    clearFlash();
    Sound.stopAmbient(0.6);
    stopWatchdog();
    announce('一時停止しました。天面を押すと再開します。');
    render();
    draw(t);
  }

  function resume() {
    st.tAnchor = now();
    st.phase = 'running';
    clearFlash();
    Sound.startAmbient(ambientMode());
    startWatchdog();
    announce('再開しました。');
    render();
    ensureLoop();
  }

  function cancel() {
    if (st.phase !== 'running' && st.phase !== 'paused') return;
    st.phase = 'idle';
    st.steps = st.setSteps;
    st.remAnchor = 0;
    st.sweepFrom = -1;
    clearFlash();
    Sound.stopAmbient(0.4);
    Sound.cancelTone();
    stopWatchdog();
    announce('中止しました。設定は' + minutesOf(st.steps) + '分のままです。');
    render();
    draw(now());
  }

  function finish() {
    if (st.phase !== 'running') return;
    st.phase = 'finished';
    st.remAnchor = 0;
    st.finishAt = now();
    st.sweepFrom = -1;
    clearFlash();
    stopWatchdog();
    Sound.stopAmbient(1.8);
    Sound.endChime();
    vibrate([60, 90, 60]);
    announce('終了しました。' + minutesOf(st.setSteps) + '分の集中、おつかれさまでした。');
    render();
    ensureLoop();
  }

  function toIdle(restore) {
    st.phase = 'idle';
    st.remAnchor = 0;
    clearFlash();
    if (restore) st.steps = st.setSteps;
    render();
    draw(now());
  }

  function startWatchdog() {
    stopWatchdog();
    // タブが裏にあって描画が止まっていても、終了は検知する
    st.watchdog = setInterval(function () {
      if (st.phase === 'running' && remainingAt(now()) <= 0) { finish(); draw(now()); }
    }, 500);
  }
  function stopWatchdog() { if (st.watchdog) { clearInterval(st.watchdog); st.watchdog = 0; } }

  /* ---------- 描画 ---------- */
  function finishLevels(t) {
    var s = (t - st.finishAt) / 1000, out = [], i, b;
    if (reduceMotion) {
      b = s < 6 ? 0.55 : 0;
      for (i = 0; i < 24; i++) out.push(b);
      return out;
    }
    if (s < 1.3) {
      // 光がひと回りして知らせる
      var head = (s / 1.3) * 26;
      for (i = 0; i < 24; i++) {
        var d = head - i;
        out.push(d >= 0 && d < 5 ? 1 - d / 5 : 0);
      }
    } else if (s < 7.3) {
      // 3回、ゆっくり呼吸する
      b = 0.1 + 0.72 * (0.5 - 0.5 * Math.cos(((s - 1.3) / 2) * Math.PI * 2));
      for (i = 0; i < 24; i++) out.push(b);
    } else {
      for (i = 0; i < 24; i++) out.push(0);
    }
    return out;
  }

  function draw(t) {
    var levels, i;
    if (st.phase === 'idle') {
      levels = Puck.levelsFor(st.steps, 0);
    } else if (st.phase === 'running' || st.phase === 'paused') {
      var f = remainingAt(t) / STEP_MS;
      var n = Math.floor(f + 1e-9);
      levels = Puck.levelsFor(n, f - n);
    } else {
      levels = finishLevels(t);
    }
    if (st.sweepFrom >= 0) {
      var p = (t - st.sweepFrom) / 700;
      if (p >= 1) {
        st.sweepFrom = -1;
      } else {
        var head = p * 27;
        for (i = 0; i < 24; i++) {
          var dist = head - i;
          if (dist >= 0 && dist < 4) levels[i] = Math.max(levels[i], 1 - dist / 4);
        }
      }
    }
    if (st.nudgeUntil > t) {
      var q = 1 - (st.nudgeUntil - t) / 900;
      levels[0] = Math.max(levels[0], Math.abs(Math.sin(q * Math.PI * 2)));
    }
    puck.setLevels(levels);
    updateValue(t);
  }

  function needsLoop(t) {
    return st.phase === 'running' || st.sweepFrom >= 0 || st.nudgeUntil > t ||
      (st.phase === 'finished' && t - st.finishAt < FINISH_ANIM_MS);
  }
  function frame(t) {
    st.raf = 0;
    if (st.phase === 'running' && remainingAt(t) <= 0) finish();
    draw(t);
    if (needsLoop(t)) st.raf = requestAnimationFrame(frame);
  }
  function ensureLoop() { if (!st.raf) st.raf = requestAnimationFrame(frame); }

  /* ---------- 表示 ---------- */
  function digits(str) {
    var out = '';
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      out += ch === ':' ? '<span class="sep">:</span>' : '<span class="dg">' + ch + '</span>';
    }
    return out;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function clock(sec) {
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + ':' + pad(m) : String(m)) + ':' + pad(s);
  }

  var lastValueKey = '';
  function updateValue(t) {
    var key, html;
    if (st.phase === 'idle') {
      if (!st.steps) { key = 'empty'; html = ''; }
      else { key = 'set' + st.steps; html = digits(String(minutesOf(st.steps))) + '<span class="u">分</span>'; }
    } else if (st.phase === 'running' || st.phase === 'paused') {
      var rem = remainingAt(t);
      if (st.speed === 1) {
        var sec = Math.ceil(rem / 1000 - 1e-6);
        key = 's' + sec; html = digits(clock(sec));
      } else {
        var m = Math.ceil(rem / MIN_MS - 1e-6);
        key = 'm' + m; html = digits(String(m)) + '<span class="u">分</span>';
      }
    } else {
      key = 'done'; html = '';
    }
    if (key !== lastValueKey) {
      lastValueKey = key;
      valueEl.innerHTML = html;
    }
  }

  function labelText() {
    switch (st.phase) {
      case 'idle':
        return st.steps
          ? st.steps + '灯。天面を押すとはじまります'
          : 'リングを右に回して、時間を決めてください';
      case 'running':
        if (!st.showNumbers) return '集中しています。灯りが消えるまで';
        return st.speed === 60 ? '残り時間（60倍速で進行中）' : '残り時間';
      case 'paused':
        return '一時停止中。天面を押すと再開します';
      default:
        return '';
    }
  }
  function renderLabel() {
    var f = st.flash;
    var useFlash = f && f.until > now() && f.phase === st.phase && f.steps === st.steps;
    if (f && !useFlash) clearFlash();
    labelEl.textContent = useFlash ? f.text : labelText();
  }

  function setStep(i, state) {
    var el = stepEls[i]; if (!el) return;
    el.classList.toggle('is-active', state === 'active');
    el.classList.toggle('is-done', state === 'done');
    if (state === 'active') el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
  }

  var PRESS_LABEL = { idle: '天面を押す', running: '一時停止', paused: '再開', finished: '設定に戻る' };

  function render() {
    var ph = st.phase;
    var active = ph === 'running' || ph === 'paused';
    section.setAttribute('data-phase', ph);
    puckEl.classList.toggle('is-paused', ph === 'paused');

    setStep(0, st.steps > 0 || ph !== 'idle' ? 'done' : 'active');
    setStep(1, ph === 'idle' ? (st.steps > 0 ? 'active' : '') : 'done');
    setStep(2, active ? 'active' : (ph === 'finished' ? 'done' : ''));

    var finished = ph === 'finished';
    // 消えるボタンにフォーカスがあったら、残るボタンへ移す
    var focusEl = document.activeElement;
    if ((!active && focusEl === cancelBtn) || (!finished && doneEl.contains(focusEl))) pressBtn.focus();
    mainEl.hidden = finished;
    doneEl.hidden = !finished;
    if (finished) doneText.textContent = minutesOf(st.setSteps) + '分の集中が終わりました。';

    renderLabel();
    pressLabel.textContent = PRESS_LABEL[ph];
    cancelBtn.hidden = !active;

    if (ph === 'idle') {
      puckEl.setAttribute('aria-valuenow', String(minutesOf(st.steps)));
      puckEl.setAttribute('aria-valuetext', st.steps ? minutesOf(st.steps) + '分（' + st.steps + '灯）' : '0分');
    } else {
      puckEl.setAttribute('aria-valuenow', String(minutesOf(st.setSteps)));
      puckEl.setAttribute('aria-valuetext',
        ph === 'finished' ? '終了しました' : (ph === 'paused' ? '一時停止中。' : '動作中。') + '設定は' + minutesOf(st.setSteps) + '分');
    }
    lastValueKey = '';
    updateValue(now());
  }

  /* ---------- ポインター（ドラッグで回す／タップで押す／長押しで中止） ---------- */
  var drag = null;

  function startHold() {
    cancelHold();
    st.holdFired = false;
    wrap.classList.add('is-holding');
    st.holdTimer = setTimeout(function () {
      st.holdTimer = 0;
      st.holdFired = true;
      wrap.classList.remove('is-holding');
      puck.press(false);
      vibrate(25);
      cancel();
    }, HOLD_MS);
  }
  function cancelHold() {
    if (st.holdTimer) { clearTimeout(st.holdTimer); st.holdTimer = 0; }
    wrap.classList.remove('is-holding');
  }

  puckEl.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    Sound.ensure();
    var rect = puckEl.getBoundingClientRect();
    var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    var dx = e.clientX - cx, dy = e.clientY - cy;
    var r = Math.sqrt(dx * dx + dy * dy) / (rect.width / 2);
    if (r > 1.04) return;
    try { puckEl.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    drag = {
      id: e.pointerId, cx: cx, cy: cy, w: rect.width,
      sx: e.clientX, sy: e.clientY,
      last: Math.atan2(dy, dx), acc: 0, moved: false,
      onFace: r < 0.86
    };
    st.holdFired = false;
    try { puckEl.focus({ preventScroll: true }); } catch (err) { puckEl.focus(); }
    puckEl.classList.add('is-dragging');
    if (drag.onFace) {
      puck.press(true);
      if (st.phase === 'running' || st.phase === 'paused') startHold();
    }
    e.preventDefault();
  });

  puckEl.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.cx, dy = e.clientY - drag.cy;
    if (!drag.moved && Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 7) {
      drag.moved = true;
      puck.press(false);
      cancelHold();
    }
    var a = Math.atan2(dy, dx);
    if (Math.sqrt(dx * dx + dy * dy) < drag.w * 0.1) { drag.last = a; return; }
    var delta = a - drag.last;
    if (delta > Math.PI) delta -= Math.PI * 2;
    else if (delta < -Math.PI) delta += Math.PI * 2;
    drag.last = a;
    if (!drag.moved) return;
    drag.acc += delta * 180 / Math.PI;
    while (drag.acc >= 10) { drag.acc -= 10; rotate(1, 'pointer'); }
    while (drag.acc <= -10) { drag.acc += 10; rotate(-1, 'pointer'); }
  });

  function endDrag(e, canceled) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var wasTap = !drag.moved && drag.onFace && !st.holdFired && !canceled;
    cancelHold();
    puck.press(false);
    puckEl.classList.remove('is-dragging');
    drag = null;
    if (wasTap) press('pointer');
  }
  puckEl.addEventListener('pointerup', function (e) { endDrag(e, false); });
  puckEl.addEventListener('pointercancel', function (e) { endDrag(e, true); });
  puckEl.addEventListener('lostpointercapture', function (e) { if (drag && e.pointerId === drag.id) endDrag(e, true); });
  puckEl.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* ---------- キーボード ---------- */
  puckEl.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowUp') rotate(1, 'key');
    else if (k === 'ArrowLeft' || k === 'ArrowDown') rotate(-1, 'key');
    else if (k === 'PageUp') { rotate(1, 'key'); rotate(1, 'key'); }
    else if (k === 'PageDown') { rotate(-1, 'key'); rotate(-1, 'key'); }
    else if (k === 'Home') jumpTo(0, 'key');
    else if (k === 'End') jumpTo(MAX_STEPS, 'key');
    else if (k === 'Enter' || k === ' ' || k === 'Spacebar') { if (!e.repeat) { Sound.ensure(); press('key'); } }
    else if (k === 'Escape') cancel();
    else return;
    e.preventDefault();
  });

  /* ---------- ボタン ---------- */
  section.querySelectorAll('.dbtn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      Sound.ensure();
      var a = btn.getAttribute('data-action');
      if (a === 'cw') rotate(1, 'button');
      else if (a === 'ccw') rotate(-1, 'button');
      else if (a === 'press') press('button');
      else if (a === 'cancel') { cancel(); pressBtn.focus(); }
    });
  });
  doneAgain.addEventListener('click', function () {
    Sound.ensure();
    toIdle(true);
    start();
    pressBtn.focus();
  });

  /* 本体以外にフォーカスがあっても、デモの中なら Esc で中止できる */
  section.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || e.target === puckEl) return;
    if (st.phase === 'running' || st.phase === 'paused') { cancel(); e.preventDefault(); }
  });

  /* マウスホイール：本体を選んでいるときだけ回す（ページのスクロールを奪わない） */
  var wheelAcc = 0;
  puckEl.addEventListener('wheel', function (e) {
    if (document.activeElement !== puckEl) return;
    e.preventDefault();
    wheelAcc += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    while (wheelAcc >= 60) { wheelAcc -= 60; rotate(-1, 'wheel'); }
    while (wheelAcc <= -60) { wheelAcc += 60; rotate(1, 'wheel'); }
  }, { passive: false });

  /* ---------- 設定 ---------- */
  function ambientMode() {
    var r = section.querySelector('input[name="ambient"]:checked');
    return r ? r.value : 'off';
  }
  section.querySelectorAll('input[name="ambient"]').forEach(function (r) {
    r.addEventListener('change', function () {
      if (!r.checked) return;
      Sound.ensure();
      var m = ambientMode();
      if (st.phase === 'running') Sound.changeAmbient(m);
      else if (m === 'off') Sound.stopPreview();
      else Sound.preview(m, 3.5);
    });
  });
  section.querySelectorAll('input[name="speed"]').forEach(function (r) {
    r.addEventListener('change', function () {
      if (!r.checked) return;
      if (st.phase === 'running') reanchor(now());
      st.speed = parseInt(r.value, 10) === 1 ? 1 : 60;
      render();
      announce(st.speed === 60 ? '60倍速に切り替えました。' : '実際の時間に切り替えました。');
    });
  });
  function bindSwitch(el, fn) {
    el.addEventListener('click', function () {
      var on = el.getAttribute('aria-checked') !== 'true';
      el.setAttribute('aria-checked', on ? 'true' : 'false');
      fn(on);
    });
  }
  bindSwitch(soundSwitch, function (on) { Sound.setEnabled(on); });
  bindSwitch(numbersSwitch, function (on) {
    st.showNumbers = on;
    section.classList.toggle('hide-numbers', !on);
    renderLabel();
  });

  /* ---------- 灯りの照り返し位置 ---------- */
  function placeGlow() {
    var sr = section.getBoundingClientRect(), dr = puckEl.getBoundingClientRect();
    if (!sr.width || !sr.height) return;
    section.style.setProperty('--gx', ((dr.left + dr.width / 2 - sr.left) / sr.width * 100).toFixed(1) + '%');
    section.style.setProperty('--gy', ((dr.top + dr.height / 2 - sr.top) / sr.height * 100).toFixed(1) + '%');
  }
  window.addEventListener('resize', placeGlow);
  window.addEventListener('load', placeGlow);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeGlow);
  placeGlow();

  render();
  draw(now());

  // 動作確認用の窓口
  KOKU.demo = {
    state: st,
    rotate: function (d) { rotate(d, 'api'); },
    press: function () { press('api'); },
    cancel: cancel,
    remaining: function () { return remainingAt(now()); }
  };
})();
