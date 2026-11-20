/* 画面遷移・入力・UI。タイトル → 依頼一覧 → 積み込み → 走行 → 精算 */
(function () {
  'use strict';
  const KT = window.KT;
  const A = KT.Audio;
  const $ = (id) => document.getElementById(id);
  const DEG = Math.PI / 180;
  const DT = KT.CONST.DT;

  const RANK_TITLE = {
    S: '伝説の軽トラ職人',
    A: '頼れる運び屋',
    B: '一人前のドライバー',
    C: '見習いドライバー',
    D: 'ギリギリ黒字',
    X: '限界突破（悪い意味で）',
  };

  // 運転手のひとこと（ふきだし）
  const LINES = {
    depart: ['出発しまーす', '安全運転で行きます', 'よし、行きますか'],
    leaving: ['あっ！', 'ちょっ…！', 'ああっ！', 'まずい！'],
    fall: (it) => [it.def.short + 'が…', 'やっちゃった…', 'あー…落ちた…'],
    break: (it) => [it.def.short + 'が…！', 'いまの音…まさか', 'うわぁ…'],
    soft: ['布団ナイス', 'セーフ…', 'ふぅ…'],
    snap: ['ロープが切れた！'],
    creak: ['ミシミシいってる…', '上が重いかな…'],
    goal: ['到着でーす！', 'お待たせしました！'],
    bumpOk: ['おっと', 'っとと…', 'ガタッときた…'],
    fast: ['ちょっと飛ばしすぎかな…', '荷物、大丈夫かな…'],
    flip: ['ひっくり返った…', 'ロードサービス呼ぶか…'],
    stepAhead: ['段差だ。ゆっくり…', 'この先、段差か'],
    bigStep: ['でかい段差だ…そーっと', 'あの段差はヤバい'],
    railAhead: ['踏切だ。ガタガタするぞ'],
    plateAhead: ['工事中か…鉄板だ'],
    holeAhead: ['穴ぼこ注意…'],
    gravelAhead: ['砂利道か…揺れるぞ'],
    downAhead: ['下り坂。ブレーキ、ブレーキ…'],
    bridgeAhead: ['古い橋だな…'],
  };

  const S = {
    state: 'boot',
    sim: null,
    demo: null,
    stageIdx: 0,
    r: null,
    keys: Object.create(null),
    held: null,
    ropeMode: false,
    ropeDrag: null,
    hoverHook: null,
    hoverUid: null,
    hoverRope: null,
    lastSelected: null,
    pointer: { sx: 0, sy: 0, down: false },
    tagPress: null,
    pedals: { gas: false, brake: false },
    paused: false,
    doneTimer: 0,
    resultTimers: [],
    lookahead: 0,
    hudTimer: 0,
    wheelVy: [0, 0],
    lastTs: 0,
    driveHintTimer: 0,
    clock: 0, // 実時間（スローモーションの影響を受けない）
    slow: null, // スローモーション { t, dur, inst }
    slowCool: 0,
    bubble: null, // 運転手のふきだし
    said: null,
    lastHint: -99,
    lastBumpSay: -99,
    wheelPrevVy: [0, 0],
    wheelHitT: [-9, -9],
  };
  window.KTGame = S;

  // ------------------------------------------------------------------
  // 起動
  // ------------------------------------------------------------------
  function boot() {
    S.r = new KT.Renderer($('game'));
    window.addEventListener('resize', () => {
      S.r.resize();
      if (S.state === 'load') loadCamera(true);
    });
    setupInput();
    setupButtons();
    startDemo();
    showScreen('title');
    updateMuteButton();
    requestAnimationFrame(loop);
  }

  function showScreen(name) {
    for (const id of ['title', 'stages', 'load', 'drive', 'result']) $('scr-' + id).classList.toggle('hidden', id !== name);
    const demoScreens = ['title', 'stages'];
    if (demoScreens.includes(name) && !demoScreens.includes(S.state)) {
      // ステージから戻ってきたら、デモの世界に切り替える
      S.demoSnap = true;
      if (S.demo) S.r.setTheme(S.demo.stage.theme);
      S.r.particles.length = 0;
      S.r.floaters.length = 0;
    }
    S.state = name;
    $('app').dataset.state = name;
  }

  function say(key, prio = 1, it = null) {
    const b = S.bubble;
    if (b && S.clock - b.t0 < 1.1 && b.prio > prio) return;
    let arr = LINES[key];
    if (typeof arr === 'function') arr = arr(it);
    const text = arr[Math.floor(Math.random() * arr.length)];
    S.bubble = { text, t0: S.clock, life: 1.5 + text.length * 0.06, prio };
  }

  /** 荷物が落ちる・壊れる瞬間を少しだけゆっくり見せる */
  function triggerSlow(inst, strong) {
    if (S.slowCool > 0 || slowAmount() > 0) return false;
    S.slow = { t: 0, dur: strong ? 1.3 : 1.05, inst };
    S.slowCool = 2.6;
    A.slowmo();
    return true;
  }
  function slowAmount() {
    const s = S.slow;
    if (!s || s.t >= s.dur) return 0;
    return Math.min(KT.smoothstep(0, 0.12, s.t), 1 - KT.smoothstep(s.dur - 0.38, s.dur, s.t));
  }

  function toast(msg, ms = 2400) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(S.toastTimer);
    S.toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  function banner(text) {
    const b = $('banner');
    b.textContent = text;
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
  }

  function loadBest() {
    try {
      return JSON.parse(localStorage.getItem('kt-best') || '{}');
    } catch (e) {
      return {};
    }
  }
  function saveBest(stageId, res) {
    const best = loadBest();
    const cur = best[stageId];
    if (!cur || res.profit > cur.profit) {
      best[stageId] = { profit: res.profit, rank: res.rank };
      try { localStorage.setItem('kt-best', JSON.stringify(best)); } catch (e) { /* noop */ }
      return cur ? 'best' : 'first';
    }
    return null;
  }

  // ------------------------------------------------------------------
  // タイトル画面の背景（自動で走るデモ）
  // ------------------------------------------------------------------
  function startDemo() {
    const sim = new KT.Sim(KT.STAGES[0]);
    for (let i = 0; i < 60; i++) sim.fixedStep(DT);
    sim.autoLoad();
    sim.startDrive();
    sim.events.length = 0;
    S.demo = sim;
    S.demoSnap = true;
    if (S.r) S.r.setTheme(sim.stage.theme);
  }

  function updateDemo(dt) {
    const sim = S.demo;
    const v = sim.truck.forwardSpeed();
    sim.input.throttle = v < 2.4;
    sim.input.brake = false;
    sim.step(dt);
    sim.events.length = 0;
    for (const it of sim.items) it.popYen = 0;
    if (sim.phase === 'done' || sim.time > 85 || sim.flipped || sim.stuck) startDemo();
    const r = S.r;
    const narrow = r.W <= 760;
    const s = KT.clamp(Math.min(r.W / (narrow ? 6.2 : 11), r.H / 6.4), 40, 130);
    const tp = sim.truck.pos;
    r.camTarget = narrow ? { x: tp.x + 0.2, y: tp.y + 1.0 - (r.H * 0.04) / s, s } : { x: tp.x - (r.W * 0.17) / s, y: tp.y + 2.05, s };
    if (S.demoSnap) {
      r.snapCamera();
      S.demoSnap = false;
    }
  }

  // ------------------------------------------------------------------
  // 依頼一覧
  // ------------------------------------------------------------------
  function buildSlips() {
    const box = $('slips');
    box.innerHTML = '';
    const best = loadBest();
    KT.STAGES.forEach((st, i) => {
      const sum = KT.stageSummary(st);
      const b = best[st.id];
      const el = document.createElement('button');
      el.className = 'slip';
      el.innerHTML = `
        <div class="slip-top"><span class="slip-no">No.${String(st.id).padStart(3, '0')}</span><span class="slip-kind">引越し依頼票</span></div>
        <div class="slip-title">${st.title}</div>
        <div class="slip-memo">${st.memo}</div>
        <table class="slip-table">
          <tr><th>お客様</th><td>${st.client}</td></tr>
          <tr><th>区間</th><td>${st.from} → ${st.to}（${sum.distance}m）</td></tr>
          <tr><th>荷物</th><td><b>${sum.count}</b>点　合計 <b>${sum.mass}</b>kg</td></tr>
          <tr><th>道</th><td>${sum.roads.join('、')}</td></tr>
          <tr><th>ロープ</th><td>${st.ropes}本　目標タイム ${KT.fmtTime(st.targetTime)}</td></tr>
          ${st.request ? `<tr class="req-row"><th>お願い</th><td>★ ${st.request.what}を無事に（心付け ${KT.yen(st.request.tip)}）</td></tr>` : ''}
        </table>
        <div class="slip-foot"><span class="slip-fee">${KT.yen(st.fee)}</span><span class="slip-best">${b ? 'これまでの最高<br>' + KT.yen(b.profit) : 'まだ記録なし'}</span></div>
        ${b ? `<div class="slip-stamp">${b.rank === 'X' ? '赤' : b.rank}<small>${b.rank === 'X' ? '赤字' : '完了'}</small></div>` : ''}`;
      el.addEventListener('click', () => {
        A.init();
        A.resume();
        A.click();
        startLoad(i);
      });
      box.appendChild(el);
    });
  }

  // ------------------------------------------------------------------
  // 積み込み
  // ------------------------------------------------------------------
  function startLoad(idx) {
    clearResultTimers();
    A.stopEngine();
    S.stageIdx = idx;
    const stage = KT.STAGES[idx];
    const sim = new KT.Sim(stage);
    for (let i = 0; i < 90; i++) sim.fixedStep(DT);
    sim.events.length = 0;
    S.sim = sim;
    S.r.setTheme(stage.theme);
    S.r.particles.length = 0;
    S.r.floaters.length = 0;
    S.held = null;
    S.ropeDrag = null;
    S.lastSelected = null;
    S.paused = false;
    S.loadTop = 0;
    setRopeMode(false);
    buildTray();
    $('memo').innerHTML = `<b>依頼人メモ</b>${stage.client}：${stage.memo}` +
      (stage.request ? `<span class="memo-req">★ お願い：${stage.request.what}を無事に届けると、心付け ${KT.yen(stage.request.tip)}</span>` : '');
    showScreen('load');
    loadCamera(true);
    updateLoadUI();
    setHint();
    $('dlg-depart').classList.add('hidden');
    $('dlg-pause').classList.add('hidden');
  }

  function trayRect() {
    return $('tray').getBoundingClientRect();
  }

  function loadCamera(snap) {
    const r = S.r;
    const narrow = r.W <= 760;
    const trayW = narrow ? 0 : 292;
    const top = narrow ? 64 : 70;
    const bottom = narrow ? 176 : 54;
    const availW = r.W - trayW - 30;
    const availH = r.H - top - bottom;
    // 積み上がった高さに合わせて少しずつ引く
    let maxTop = 2.6;
    for (const it of S.sim.items) {
      if (it.state !== 'placed') continue;
      const lp = S.sim.truck.toLocal(it.body.getPosition());
      maxTop = Math.max(maxTop, lp.y + Math.max(it.def.w, it.def.h) * 0.55 + 0.5);
    }
    if (S.held) maxTop = Math.max(maxTop, S.sim.truck.toLocal(planck.Vec2(S.held.x, S.held.y)).y + 0.9);
    S.loadTop = Math.max(S.loadTop && !snap ? S.loadTop - 0.01 : 0, maxTop);
    const needH = Math.max(3.6, S.loadTop + 0.2);
    const s = Math.max(30, Math.min(availW / 5.0, availH / needH));
    const c = S.sim.truck.toWorld(-0.45, needH / 2 - 0.2);
    const fx = trayW + 15 + availW / 2;
    const fy = top + availH / 2;
    r.camTarget = { x: c.x - (fx - r.W / 2) / s, y: c.y + (fy - r.H / 2) / s, s };
    if (snap) r.snapCamera();
  }

  function itemIcon(def, w = 58, h = 52) {
    const c = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = w * dpr;
    c.height = h * dpr;
    const ctx = c.getContext('2d');
    const scale = Math.min((w * 0.9) / def.w, (h * 0.9) / def.h);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, (dpr * w) / 2, (dpr * h) / 2);
    def.draw.call(def, ctx, 1 / scale, { dmg: 0, broken: false, uid: 0, t: 0 });
    return c;
  }

  function buildTray() {
    const list = $('tray-list');
    list.innerHTML = '';
    const sim = S.sim;
    // 荷物置き場は「積むおすすめ順」（重くて丈夫な物 → 布団 → ワレモノ → 転がる物）に並べる
    for (const inst of KT.Sim.loadOrder(sim.items)) {
      const d = inst.def;
      const el = document.createElement('div');
      el.className = 'tag';
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', d.name + '（Enter で自動で積む）');
      el.appendChild(itemIcon(d));
      const info = document.createElement('div');
      info.innerHTML = `<div class="tag-name">${d.name}</div>
        <div class="tag-meta"><b>${d.mass}kg</b>　弁償 <b>${KT.yen(d.value)}</b><br>積み残すと ${KT.yen(-sim.leftoverFee(inst))}</div>`;
      el.appendChild(info);
      const req = sim.isRequested(inst);
      if (req) el.classList.add('is-req');
      if (d.tags.length || req) {
        const st = document.createElement('div');
        st.className = 'tag-stamps';
        st.innerHTML = (req ? '<i class="st req">★ お願い</i>' : '') + d.tags.map((t) => `<i class="st ${KT.TAGS[t].cls}">${KT.TAGS[t].label}</i>`).join('');
        el.appendChild(st);
      }
      el.addEventListener('pointerdown', (e) => onTagDown(e, inst));
      el.addEventListener('pointerenter', () => { if (!S.held) setHint(d.name + '：' + d.desc + tagHelp(d)); });
      el.addEventListener('pointerleave', () => { if (!S.held) setHint(); });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          autoPlace(inst);
        }
      });
      inst.tagEl = el;
      list.appendChild(el);
    }
    refreshTray();
  }

  /** 置いた荷物にマウスを乗せたときの説明（上に載っている重さと、耐えられる重さ） */
  function itemInfo(it) {
    const d = it.def;
    let t = `${d.name}（${d.mass}kg）`;
    if (d.crush < Infinity) {
      const on = Math.round(it.load / 9.8);
      const lim = Math.round(d.crush / 9.8);
      t += `　上に載っている重さ 約${on}kg／耐えられるのは 約${lim}kg まで`;
      if (it.load > d.crush * 0.85) t += '（潰れそう！）';
    } else t += '　上に何を載せても潰れない';
    if (d.tags.includes('fragile')) t += it.cushioned > 0 ? '　布団で保護中' : '　衝撃に弱い';
    if (S.sim.isRequested(it)) t += '　★お願いの荷物';
    return t;
  }

  function tagHelp(d) {
    const t = d.tags.filter((x) => x !== 'heavy').map((x) => KT.TAGS[x].help);
    return t.length ? '（' + t.join('。') + '）' : '';
  }

  function refreshTray() {
    const sim = S.sim;
    let n = 0;
    for (const inst of sim.items) {
      const inTray = inst.state === 'tray';
      if (inTray) n++;
      if (inst.tagEl) inst.tagEl.classList.toggle('is-gone', !inTray);
    }
    $('tray-count').textContent = n ? `のこり ${n} 点` : 'ぜんぶ積んだ';
    let empty = $('tray-empty');
    if (!empty) {
      empty = document.createElement('p');
      empty.id = 'tray-empty';
      empty.className = 'tray-empty';
      empty.textContent = 'ぜんぶ積みました。ロープで固定したら「出発する」へ。荷物をここへ戻せば積み残しにできます。';
      $('tray-list').appendChild(empty);
    }
    empty.classList.toggle('hidden', n > 0);
  }

  function updateLoadUI() {
    const sim = S.sim;
    const kg = sim.currentLoad();
    $('load-kg').textContent = kg;
    const over = kg > KT.CONST.MAX_LOAD;
    const g = $('gauge');
    if (over && !g.classList.contains('over')) A.warn();
    g.classList.toggle('over', over);
    $('gauge-fill').style.width = Math.min(100, (kg / KT.CONST.MAX_LOAD) * 100) + '%';
    $('rope-left').textContent = sim.ropesLeft;
    $('memo').classList.toggle('hidden', sim.items.some((i) => i.state === 'placed'));
    refreshTray();
  }

  function setHint(text) {
    let t = text;
    if (!t) {
      if (S.ropeMode) t = 'フックから荷物へドラッグ。ロープは荷物の上を通り、反対側のフックにも掛かります（クリックで外す）';
      else if (S.held) t = 'ホイール / Q・E で回転、右クリック / R で90°回転。荷物置き場の上で離すと取り消し。';
      else t = '荷札を荷台へドラッグ（クリックだけなら自動で置きます）。重い物は下へ、ワレモノは布団のそばへ。';
    }
    $('load-hint').innerHTML = '<span></span>';
    $('load-hint').firstChild.textContent = t;
  }

  function setRopeMode(on) {
    S.ropeMode = on;
    $('btn-rope').setAttribute('aria-pressed', on ? 'true' : 'false');
    S.ropeDrag = null;
    setHint();
  }

  function pointerWorld() {
    return S.r.toWorld(S.pointer.sx, S.pointer.sy);
  }

  function itemAt(w) {
    const sim = S.sim;
    const pl = planck;
    let found = null;
    const offs = [[0, 0], [0.05, 0], [-0.05, 0], [0, 0.05], [0, -0.05]];
    for (const [dx, dy] of offs) {
      const pt = pl.Vec2(w.x + dx, w.y + dy);
      const aabb = new pl.AABB(pl.Vec2(pt.x - 0.01, pt.y - 0.01), pl.Vec2(pt.x + 0.01, pt.y + 0.01));
      sim.world.queryAABB(aabb, (fx) => {
        const ud = fx.getUserData();
        if (ud && ud.kind === 'item' && ud.inst.state === 'placed' && fx.testPoint(pt)) {
          found = ud.inst;
          return false;
        }
        return true;
      });
      if (found) return found;
    }
    return null;
  }

  function hookAt(w) {
    const sim = S.sim;
    const rad = Math.max(0.13, 18 / S.r.cam.s);
    let best = null, bd = rad;
    KT.TRUCK_HOOKS.forEach((h, i) => {
      const p = sim.truck.hookWorld(i);
      const d = Math.hypot(p.x - w.x, p.y - w.y);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  function ropeAt(w) {
    const sim = S.sim;
    const tol = Math.max(0.06, 10 / S.r.cam.s);
    for (const r of sim.ropes) {
      const pts = sim.ropePath(r);
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1], b = pts[k];
        const vx = b.x - a.x, vy = b.y - a.y;
        const len2 = vx * vx + vy * vy || 1;
        const t = KT.clamp(((w.x - a.x) * vx + (w.y - a.y) * vy) / len2, 0, 1);
        const d = Math.hypot(a.x + vx * t - w.x, a.y + vy * t - w.y);
        if (d < tol) return r;
      }
    }
    return null;
  }

  function overTray() {
    const r = trayRect();
    const p = S.pointer;
    return p.sx >= r.left && p.sx <= r.right && p.sy >= r.top && p.sy <= r.bottom;
  }

  function beginHoldFromWorld(inst, w) {
    const b = inst.body;
    const lp = b.getLocalPoint(planck.Vec2(w.x, w.y));
    const pos = b.getPosition();
    const angle = b.getAngle();
    S.sim.pickItem(inst);
    S.held = { inst, x: pos.x, y: pos.y, angle, offX: lp.x, offY: lp.y, lifted: false, valid: true, overTray: false };
    A.pick();
    setHint();
    updateHeld();
  }

  function beginHoldFromTray(inst) {
    inst.state = 'held';
    S.held = { inst, x: 0, y: 0, angle: S.sim.truck.angle, offX: 0, offY: 0, lifted: false, valid: false, overTray: true };
    A.pick();
    refreshTray();
    setHint();
    updateHeld();
  }

  function updateHeld() {
    const h = S.held;
    if (!h) return;
    const w = pointerWorld();
    const c = Math.cos(h.angle), s = Math.sin(h.angle);
    let x = w.x - (c * h.offX - s * h.offY);
    let y = w.y - (s * h.offX + c * h.offY);
    const tp = S.sim.truck.pos;
    x = KT.clamp(x, tp.x - 4.5, tp.x + 3.2);
    y = KT.clamp(y, tp.y - 0.5, tp.y + 5.5);
    h.overTray = overTray();
    $('tray').classList.toggle('drop-target', h.overTray);
    const place = S.sim.findPlacement(h.inst, x, y, h.angle);
    if (place) {
      h.x = place.x;
      h.y = place.y;
      h.lifted = place.lifted;
      h.valid = true;
    } else {
      h.x = x;
      h.y = y;
      h.valid = false;
    }
  }

  function dropHeld() {
    const h = S.held;
    if (!h) return;
    S.held = null;
    $('tray').classList.remove('drop-target');
    if (h.overTray) {
      S.sim.returnToTray(h.inst);
      A.click();
    } else if (h.valid) {
      S.sim.placeItem(h.inst, h.x, h.y + 0.004, h.angle);
      S.lastSelected = h.inst;
    } else {
      S.sim.returnToTray(h.inst);
      toast('そこには置けません。荷物置き場に戻しました');
    }
    updateLoadUI();
    setHint();
  }

  function rotateHeld(da) {
    const h = S.held;
    if (!h) return;
    h.angle += da;
    A.tick();
    updateHeld();
  }

  /** 置いてある荷物をその場で回す */
  function quickRotate(inst, da) {
    const sim = S.sim;
    const b = inst.body;
    const p = b.getPosition();
    const a0 = b.getAngle();
    sim.pickItem(inst);
    const place = sim.findPlacement(inst, p.x, p.y, a0 + da);
    if (place) sim.placeItem(inst, place.x, place.y + 0.004, a0 + da);
    else sim.placeItem(inst, p.x, p.y, a0);
    S.lastSelected = inst;
    A.tick();
    updateLoadUI();
  }

  /** クリック・Enter で自動で置く（置き場所の選び方は sim.bestPlacement） */
  function autoPlace(inst) {
    const sim = S.sim;
    if (inst.state !== 'tray') return;
    const best = sim.bestPlacement(inst);
    if (!best) {
      toast('自動では置ける場所が見つかりません。ドラッグで置いてください');
      return;
    }
    inst.state = 'held';
    sim.placeItem(inst, best.x, best.y + 0.004, best.ang);
    inst.autoSpot = best.spot; // ここから落ちたら、次は別の場所を選ぶ
    S.lastSelected = inst;
    updateLoadUI();
  }

  function onTagDown(e, inst) {
    if (S.state !== 'load' || inst.state !== 'tray' || e.button === 2) return;
    e.preventDefault();
    A.init();
    A.resume();
    S.pointer.sx = e.clientX;
    S.pointer.sy = e.clientY;
    S.tagPress = { inst, x: e.clientX, y: e.clientY, id: e.pointerId };
    if (S.ropeMode) setRopeMode(false);
  }

  function addRope(inst, local, hook) {
    const sim = S.sim;
    if (sim.ropesLeft <= 0) {
      toast('ロープがもうありません。どれかを外すと戻ってきます');
      return;
    }
    const r = sim.addRope(inst, local, hook);
    if (!r) toast('そこには結べません');
    updateLoadUI();
  }

  function openDepart() {
    if (S.state !== 'load') return;
    if (S.held) dropHeld();
    S.ropeDrag = null;
    const sim = S.sim;
    const placed = sim.items.filter((i) => i.state === 'placed');
    const left = sim.items.filter((i) => i.state === 'tray');
    const kg = sim.currentLoad();
    const over = kg > KT.CONST.MAX_LOAD;
    const leftFee = left.reduce((s, i) => s + sim.leftoverFee(i), 0);
    const warns = [];
    const roped = new Set(sim.ropes.map((r) => r.inst));
    for (const it of placed) {
      if (it.warn === 'crush') warns.push(`${it.def.name}：上が重すぎて、走ると潰れそう`);
      if (it.warn === 'tilt') warns.push(`${it.def.name}：横に倒れている（横倒し厳禁）`);
      if (it.warn === 'upside') warns.push(`${it.def.name}：逆さまになっている（天地無用）`);
      const lp = sim.truck.toLocal(it.body.getPosition());
      if (lp.y > KT.TRUCK_SPEC.toriiTop && !roped.has(it)) warns.push(`${it.def.name}：鳥居より高い位置にあり、ロープなし`);
      if (lp.x < KT.TRUCK_SPEC.bedX0) warns.push(`${it.def.name}：荷台の後ろにはみ出している`);
    }
    const rows = [];
    rows.push(`<tr><th>積んだ荷物</th><td><b>${placed.length}</b> / ${sim.items.length} 点</td></tr>`);
    rows.push(`<tr><th>積載量</th><td class="${over ? 'bad' : ''}">${kg}kg / ${KT.CONST.MAX_LOAD}kg${over ? `　過積載で反則金 ${KT.yen(-KT.CONST.OVERLOAD_FINE)}` : ''}</td></tr>`);
    rows.push(`<tr><th>積み残し</th><td class="${left.length ? 'bad' : ''}">${left.length ? `${left.length}点（${left.map((i) => i.def.short).join('、')}）　手配料 ${KT.yen(-leftFee)}` : 'なし'}</td></tr>`);
    rows.push(`<tr><th>ロープ</th><td>${sim.ropes.length}本使用（のこり${sim.ropesLeft}本）</td></tr>`);
    rows.push(`<tr><th>目標タイム</th><td>${KT.fmtTime(sim.stage.targetTime)}（早いほどボーナス）</td></tr>`);
    const rq = sim.stage.request;
    if (rq) {
      const reqLeft = sim.items.filter((i) => sim.isRequested(i) && i.state === 'tray');
      rows.push(`<tr><th>お願い</th><td class="${reqLeft.length ? 'bad' : ''}">★ ${rq.what}を無事に → 心付け ${KT.yen(rq.tip)}${reqLeft.length ? '（積み残すともらえません）' : ''}</td></tr>`);
    }
    let html = `<table class="check-table">${rows.join('')}</table>`;
    if (warns.length) html += `<b class="bad">気になるところ</b><ul class="check-list">${warns.map((w) => `<li>${w}</li>`).join('')}</ul>`;
    else if (placed.length) html += `<p style="margin:6px 0 0;font-size:14px">気になるところはありません。安全運転でどうぞ。</p>`;
    $('depart-body').innerHTML = html;
    $('dlg-depart').classList.remove('hidden');
    $('btn-go').focus();
  }

  // ------------------------------------------------------------------
  // 走行
  // ------------------------------------------------------------------
  function startDrive() {
    const sim = S.sim;
    if (S.state !== 'load' || sim.phase !== 'load') return;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    $('dlg-depart').classList.add('hidden');
    setRopeMode(false);
    S.held = null;
    sim.startDrive();
    showScreen('drive');
    buildCargoList();
    $('clock-target').textContent = '目標 ' + KT.fmtTime(sim.stage.targetTime);
    $('btn-rescue').classList.remove('show');
    $('drive-hint').classList.remove('fade');
    S.driveHintTimer = 0;
    S.doneTimer = 0;
    S.paused = false;
    S.lookahead = 0;
    S.slow = null;
    S.slowCool = 0;
    S.timeScale = 1;
    S.said = {};
    S.bubble = null;
    S.lastHint = S.clock;
    S.lastDamageT = -99;
    S.wheelPrevVy = [0, 0];
    A.init();
    A.resume();
    A.startEngine();
    banner('出発！');
    setTimeout(() => { if (S.state === 'drive' && S.sim === sim && !S.bubble) say('depart', 1); }, 700);
  }

  function buildCargoList() {
    const ul = $('cargo-list');
    ul.innerHTML = '';
    for (const it of KT.Sim.loadOrder(S.sim.items)) {
      const li = document.createElement('li');
      li.innerHTML = `<span>${S.sim.isRequested(it) ? '<i class="req-star" title="お願いの荷物">★</i>' : ''}${it.def.short}</span><span class="st-cell"></span>`;
      it.cargoEl = li;
      ul.appendChild(li);
    }
    updateCargoList();
  }

  function updateCargoList() {
    const sim = S.sim;
    let loss = 0;
    for (const it of sim.items) {
      const li = it.cargoEl;
      if (!li) continue;
      const cell = li.lastChild;
      let cls = '', html;
      if (it.state === 'left') {
        cls = 'left';
        html = '<span class="tagword">積み残し</span>';
      } else if (it.state === 'fallen') {
        cls = 'fallen';
        html = '<span class="tagword">落下</span>';
        loss += it.def.value;
      } else if (it.broken) {
        cls = 'broken';
        html = '<span class="tagword">全損</span>';
        loss += it.def.value;
      } else {
        const c = sim.compensation(it);
        loss += c;
        cls = it.hp < 95 ? 'dmg' : '';
        html = `<span class="hp"><i style="width:${Math.max(0, it.hp)}%"></i></span>`;
      }
      if (li.dataset.cls !== cls || cls === 'dmg' || cls === '') {
        li.className = cls + (li.classList.contains('flash') ? ' flash' : '');
        li.dataset.cls = cls;
        if (cell.innerHTML !== html) cell.innerHTML = html;
      }
    }
    const lossHtml = loss ? '<span class="loss-label">損害 </span>' + KT.yen(-loss) : '';
    if ($('loss').innerHTML !== lossHtml) $('loss').innerHTML = lossHtml;
  }

  function flashCargo(it) {
    const li = it.cargoEl;
    if (!li) return;
    li.classList.remove('flash');
    void li.offsetWidth;
    li.classList.add('flash');
  }

  function updateDrive(dt) {
    const sim = S.sim;
    const k = S.keys;
    sim.input.throttle = !!(k.ArrowRight || k.KeyD || k.ArrowUp || k.KeyW || S.pedals.gas);
    sim.input.brake = !!(k.ArrowLeft || k.KeyA || k.ArrowDown || k.KeyS || k.Space || S.pedals.brake);
    // スローモーション中は物理の進みを遅くする
    const slow = slowAmount();
    const ts = 1 - 0.72 * slow;
    if (S.slow) S.slow.t += dt;
    if (slow === 0 && S.slowCool > 0) S.slowCool -= dt;
    S.timeScale = ts;
    sim.step(dt * ts);
    handleEvents(sim);

    const tr = sim.truck;
    A.setEngine(tr.rpm * (0.55 + 0.45 * ts), tr.throttle * ts);
    // 踏切の警報音
    let near = 0;
    for (const f of sim.course.features) {
      if (f.type !== 'rail') continue;
      const d = Math.abs(tr.pos.x - (f.x + f.x1) / 2);
      if (d < 22) near = Math.max(near, 1 - d / 22);
    }
    A.crossing(near);
    // 排気ガス
    S.exhaust = (S.exhaust || 0) + dt * (0.6 + tr.throttle * 7);
    while (S.exhaust > 1) {
      S.exhaust -= 1;
      const p = tr.toWorld(-1.62, 0.4);
      S.r.particles.push({ x: p.x, y: p.y, vx: -0.6 - Math.random() * 0.5, vy: 0.25 + Math.random() * 0.3, r: 0.05 + tr.throttle * 0.05, rot: 0, vr: 0, color: 'rgba(120,124,130,0.35)', t: 0, life: 0.9, kind: 'dust', g: -0.2 });
    }
    // 砂利道では土ぼこり
    const onGravel = sim.course.features.some((f) => f.type === 'gravel' && tr.pos.x > f.x && tr.pos.x < f.x + f.len);
    if (onGravel && Math.abs(tr.forwardSpeed()) > 2 && Math.random() < dt * 14) {
      const w = tr.wheels[Math.random() < 0.5 ? 0 : 1].getPosition();
      S.r.dust(w.x - 0.2, w.y - KT.TRUCK_SPEC.wheelR, 1);
    }
    // 段差を越えた衝撃：ガタン（音・揺れ・砂ぼこり）
    tr.wheels.forEach((w, i) => {
      const vy = w.getLinearVelocity().y;
      const dv = Math.abs(vy - S.wheelPrevVy[i]);
      S.wheelPrevVy[i] = vy;
      if (dv > 2.9 && S.clock - S.wheelHitT[i] > 0.15) {
        S.wheelHitT[i] = S.clock;
        const power = KT.clamp((dv - 2.6) / 3.6, 0, 1);
        A.bump(power);
        const p = w.getPosition();
        S.r.dust(p.x, p.y - KT.TRUCK_SPEC.wheelR, 3 + Math.round(power * 6));
        S.r.shake = Math.max(S.r.shake, 0.06 + power * 0.16);
        // 大きく揺れたのに何も壊れなかったら、ひとこと
        if (power > 0.55 && S.clock - S.lastBumpSay > 7 && S.clock - S.lastDamageT > 1.5 && Math.random() < 0.5) {
          S.lastBumpSay = S.clock;
          say('bumpOk', 1);
        }
      }
    });
    driverTalk(sim, tr);

    // カメラ
    const r = S.r;
    const v = tr.forwardSpeed();
    const portrait = r.H > r.W * 1.2;
    const s = KT.clamp(Math.min(r.W / (portrait ? 7.5 : 12), r.H / 6.8), 40, 120);
    S.lookahead += (KT.clamp(v * 0.32, -1.5, portrait ? 2.2 : 4.2) - S.lookahead) * Math.min(1, dt * 1.5);
    r.camTarget = { x: tr.pos.x + (portrait ? 0.6 : 1.2) + S.lookahead, y: tr.pos.y + (r.H * (portrait ? 0.1 : 0.2)) / s + 0.5, s };
    // スローモーション中は、落ちていく荷物に少し寄る
    if (slow > 0 && S.slow.inst && !r.calm) {
      const ip = S.slow.inst.body.getPosition();
      const ct = r.camTarget;
      ct.x += (ip.x - ct.x) * 0.45 * slow;
      ct.y += (ip.y + 0.6 - ct.y) * 0.22 * slow;
      ct.s *= 1 + 0.16 * slow;
    }

    // HUD
    const kmh = Math.round(Math.abs(v) * 3.6);
    $('speed').textContent = kmh;
    $('clock-now').textContent = KT.fmtTime(sim.time);
    $('clock-now').parentElement.classList.toggle('late', sim.time > sim.stage.targetTime);
    const prog = KT.clamp((tr.pos.x - sim.course.truckX) / (sim.course.goalX - sim.course.truckX), 0, 1);
    $('route-truck').style.left = prog * 100 + '%';
    $('route-truck').parentElement.style.setProperty('--p', prog * 100 + '%');
    $('route-left').textContent = prog >= 1 ? '到着' : 'あと' + Math.max(0, Math.round(sim.course.goalX - tr.pos.x)) + 'm';
    S.hudTimer += dt;
    if (S.hudTimer > 0.15) {
      S.hudTimer = 0;
      updateCargoList();
    }
    S.driveHintTimer += dt;
    if (S.driveHintTimer > 7) $('drive-hint').classList.add('fade');
    $('btn-rescue').classList.toggle('show', (sim.flipped || sim.stuck) && sim.phase === 'drive');

    if (sim.phase === 'done') {
      S.doneTimer += dt;
      if (S.doneTimer > 0.7) finishDrive();
    }
  }

  /** 道の先を見て、運転手がつぶやく（速いときだけ。しゃべりすぎないように間をあける） */
  function driverTalk(sim, tr) {
    const v = tr.forwardSpeed();
    const front = tr.pos.x + 1.8;
    if (!S.said) S.said = {};
    for (const f of sim.course.features) {
      const d = f.x - front;
      if (d < 3 || d > 15 || S.said[f.x]) continue;
      S.said[f.x] = true;
      if (v < 6.5 || S.clock - S.lastHint < 4.5) continue;
      let key = null;
      if ((f.type === 'stepDown' || f.type === 'stepUp') && Math.abs(f.h) >= 0.12) key = 'bigStep';
      else if (f.type === 'stepUp' || f.type === 'stepDown' || f.type === 'stairs') key = 'stepAhead';
      else if (f.type === 'rail') key = 'railAhead';
      else if (f.type === 'plate') key = 'plateAhead';
      else if (f.type === 'pothole') key = 'holeAhead';
      else if (f.type === 'gravel') key = 'gravelAhead';
      else if (f.type === 'bridge') key = 'bridgeAhead';
      else if (f.type === 'slopeDown' && -f.rise / f.len > 0.08) key = 'downAhead';
      if (key) {
        S.lastHint = S.clock;
        say(key, 1);
      }
    }
    if (!S.said.fast && v > 12.5 && sim.items.some((i) => i.state === 'placed' && i.def.tags.includes('fragile'))) {
      S.said.fast = true;
      say('fast', 1);
    }
    if (sim.flipped && !S.said.flip) {
      S.said.flip = true;
      say('flip', 3);
    }
  }

  const CRASH_WORDS = { glass: 'ガシャーン', ceramic: 'パリーン', metal: 'ガコン', wood: 'バキッ', fruit: 'グシャッ', box: 'グシャ', soft: 'ボフッ' };

  function handleEvents(sim) {
    const r = S.r;
    const driving = sim.phase === 'drive' || sim.phase === 'arrive';
    for (const e of sim.events) {
      const it = e.inst;
      switch (e.type) {
        case 'place':
          A.place(it.def.mass);
          break;
        case 'hit':
          if (driving || e.power > 1.1) A.thud(KT.clamp(e.power / 2.5, 0.15, 1.2), it.def.sound);
          // 擬音は出しすぎないように（全体で0.3秒、荷物ごとに1秒あける）
          if (driving && e.power > it.def.tough * 0.9 && e.power > 1.5 && r.time - (S.lastHitWord || -9) > 0.3 && r.time - (it.lastWord || -9) > 1) {
            S.lastHitWord = it.lastWord = r.time;
            r.addFloater(e.x, e.y + 0.25, e.power > 3 ? 'ガタン' : 'ゴトッ', { size: 0.15 });
          }
          break;
        case 'damage':
          r.shake = Math.max(r.shake, 0.12);
          S.lastDamageT = S.clock;
          flashCargo(it);
          break;
        case 'leaving':
          // 荷台からこぼれ落ちそう → スローモーションで見せる
          if (driving) {
            triggerSlow(it, it.def.value >= 20000);
            say('leaving', 3);
            r.addFloater(e.x, e.y + 0.45, 'あっ', { size: 0.2, color: '#ffe14d' });
          }
          break;
        case 'break':
          S.lastDamageT = S.clock;
          if (driving) {
            if (it.def.value >= 15000) triggerSlow(it, true);
            say('break', 3, it);
          }
          A.crash(it.def.sound);
          r.burst(e.x, e.y, it.def.debris, 20, { speed: 3.4, size: 0.045 });
          r.addFloater(e.x - 0.2, e.y + 0.8, CRASH_WORDS[it.def.sound] || 'バキッ', { size: 0.3, color: '#ffe14d' });
          r.shake = 0.5;
          flashCargo(it);
          break;
        case 'fall':
          S.lastDamageT = S.clock;
          if (driving && !(it.broken && S.bubble && S.clock - S.bubble.t0 < 0.5)) say('fall', 2, it);
          A.fall();
          r.addFloater(e.x + 0.35, e.y + 0.45, 'ポロッ', { size: 0.24, color: '#ffffff' });
          r.dust(e.x, e.y - 0.2, 5);
          flashCargo(it);
          break;
        case 'snap':
          A.snap();
          r.addFloater(e.x, e.y, 'ブチッ', { size: 0.26, color: '#ffe14d' });
          r.burst(e.x, e.y, ['#f4f1e8', '#2f6fd6'], 10, { speed: 2, size: 0.03 });
          toast('ロープが切れた！');
          say('snap', 3);
          break;
        case 'soft':
          r.addFloater(e.x, e.y + 0.3, 'ふわっ', { size: 0.15, color: '#bff0c9' });
          if (S.clock - (S.lastSoftSay || -99) > 8) {
            S.lastSoftSay = S.clock;
            say('soft', 2);
          }
          break;
        case 'creak':
          r.addFloater(e.x + (Math.random() - 0.5) * 0.2, e.y + 0.25, 'ミシッ', { size: 0.15, color: '#ffd0c8' });
          A.thud(0.4, 'wood');
          if (driving && S.clock - (S.lastCreakSay || -99) > 9) {
            S.lastCreakSay = S.clock;
            say('creak', 2);
          }
          break;
        case 'returned':
          if (it.failedSpots && it.failedSpots.length >= 2) toast(`${it.def.name}は自動ではうまく置けません。ドラッグで置き場所を選んでください`, 3600);
          else toast(`${it.def.name}が地面に落ちたので、荷物置き場に戻しました`);
          updateLoadUI();
          break;
        case 'rope':
          A.rope();
          break;
        case 'goal': {
          A.goal();
          banner('到着！');
          say('goal', 2);
          const p = sim.truck.pos;
          r.burst(p.x + 1.5, p.y + 2.5, ['#f2c200', '#c8323c', '#2f6fd6', '#3d9a58', '#ffffff'], 40, { speed: 4.5, size: 0.06, kind: 'star', up: 3.5, life: 1.6, g: 5 });
          break;
        }
        case 'rescue':
          toast('ロードサービスが車体を起こしました（' + KT.yen(-KT.CONST.RESCUE_FEE) + '）');
          break;
        default:
          break;
      }
    }
    sim.events.length = 0;
    // 損害の金額をその場に出す
    for (const it of sim.items) {
      if (it.popYen !== 0 && (it.popAge > 0.3 || it.state === 'fallen')) {
        const p = it.body.getPosition();
        r.addFloater(p.x, p.y + 0.15, KT.yen(it.popYen), { font: KT.FONT_UI, size: 0.2, color: '#ff4a3d', stroke: '#ffffff', rot: 0, vy: 1.0, life: 1.7 });
        it.popYen = 0;
        it.popAge = 0;
      }
    }
  }

  function setPaused(p) {
    if (S.state !== 'drive') return;
    S.paused = p;
    $('dlg-pause').classList.toggle('hidden', !p);
    if (p) {
      A.setEngine(0, 0);
      S.keys = Object.create(null);
      $('btn-resume').focus();
    } else if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
  }

  // ------------------------------------------------------------------
  // 精算
  // ------------------------------------------------------------------
  function clearResultTimers() {
    S.resultTimers.forEach(clearTimeout);
    S.resultTimers = [];
  }

  function finishDrive() {
    const sim = S.sim;
    A.stopEngine();
    const res = sim.evaluate();
    const isBest = saveBest(sim.stage.id, res);
    showScreen('result');
    renderReceipt(res, isBest);
  }

  function clientVoice(res, stage, sim) {
    const lines = {
      S: 'ぜんぶ無事、しかも早い！ プロの仕事ですね。またお願いします！',
      A: 'ほとんど無傷でした。さすがです、助かりました！',
      B: 'ちょっとキズはあるけど……まあ、新生活ってそういうものですよね。',
      C: 'うーん、けっこう傷んでますね……。次はもう少しゆっくりで。',
      D: '……ギリギリでしたね。お代は、まあ、お支払いします。',
      X: 'あの……これは……。弁償の件、あとで相談させてください。',
    };
    let text = lines[res.rank];
    const rq = stage.request;
    // いちばん高い荷物がやられていたら、ひとこと足す
    const lost = sim.items.filter((i) => i.state === 'fallen' || i.broken).sort((a, b) => b.def.value - a.def.value)[0];
    if (rq && res.request && !res.request.ok) text = rq.ngVoice + ' ' + text;
    else if (lost && lost.def.value >= 20000) text = `${lost.def.short}が……！ ` + text;
    else if (res.counts.left > 0 && res.rank !== 'X') text = '残りの荷物は別便ですね。' + text;
    if (rq && res.request && res.request.ok && res.rank !== 'X') text = rq.okVoice + ' ' + text;
    return `${text}<small>${stage.client}</small>`;
  }

  function resultTip(res, sim) {
    const items = sim.items;
    const fallen = items.filter((i) => i.state === 'fallen');
    const crushed = items.filter((i) => i.state === 'placed' && i.dmgCrush > 15);
    const hit = items.filter((i) => i.state === 'placed' && i.def.tags.includes('fragile') && i.dmgImpact > 15);
    const tilted = items.filter((i) => i.def.tags.includes('noTilt') && i.tiltTime > 1);
    const upside = items.filter((i) => i.def.tags.includes('tenchi') && i.upsideTime > 1);
    if (fallen.length) return `${fallen[0].def.short}が落ちました。鳥居より高い荷物や、後ろのあおり際の荷物はロープでフックに結ぶと落ちにくくなります。発進・加速・ブレーキはゆっくり。`;
    if (crushed.length) return `${crushed[0].def.short}が上の重さで潰れました。重い物は下へ、軽い物ほど上へ。積み込み中の「潰れそう」マークが目印です。`;
    if (hit.length) return `${hit[0].def.short}が段差の衝撃でこわれました。ワレモノは布団に触れるように置くと衝撃がやわらぎます。段差の手前では減速を。`;
    if (tilted.length) return `${tilted[0].def.short}を寝かせて運んだので減額されました。立てて鳥居ぎわに置き、ロープで支えると安定します。`;
    if (upside.length) return `${upside[0].def.short}が逆さまでした。天地無用の荷物は上下の向きを守って。`;
    if (res.loadMass > KT.CONST.MAX_LOAD) return '過積載の反則金がかかりました。安くて重い荷物を積み残したほうが得なこともあります。';
    if (res.counts.left > 0) return '積み残しには別便の手配料がかかります。安全に積めるなら、積んだほうが安くつくことが多いです。';
    if (res.time > sim.stage.targetTime) return '目標タイムより遅れると延着料がかかります。荷物が安定していれば、平らな道ではスピードを出してもだいじょうぶ。';
    return '文句なしの仕事です。この調子で次の依頼へ。';
  }

  function renderReceipt(res, isBest) {
    clearResultTimers();
    const sim = S.sim;
    const stage = sim.stage;
    const rc = $('receipt');
    rc.innerHTML = '';
    const stamp = $('stamp');
    stamp.className = 'stamp';
    $('voice').className = 'voice';
    $('voice').innerHTML = clientVoice(res, stage, sim);
    $('tip').innerHTML = '<b>次へのヒント</b>';
    $('tip').appendChild(document.createTextNode(resultTip(res, sim)));
    $('tip').classList.remove('show');
    $('rank-line').innerHTML = '';
    const actions = document.querySelector('.result-actions');
    actions.classList.remove('show');
    const isLast = S.stageIdx >= KT.STAGES.length - 1;
    $('btn-next').textContent = isLast ? '最初の依頼へ' : '次の依頼へ';

    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const c = res.counts;
    const L = [];
    L.push(['center r-company', '限界軽トラ便']);
    L.push(['center', 'ご利用明細書']);
    L.push(['small', `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}　依頼No.${String(stage.id).padStart(3, '0')}`]);
    L.push(['small', `お客様　${stage.client}`]);
    L.push(['small', `区間　${stage.from} → ${stage.to}`]);
    L.push(['small', `走行タイム　${KT.fmtTime(res.time)}（目標 ${KT.fmtTime(stage.targetTime)}）`]);
    L.push(['small', `積載　${res.loadMass}kg／ロープ ${stage.ropes - sim.ropesLeft}本`]);
    L.push(['sep']);
    L.push(['head', 'いただく料金']);
    for (const l of res.income) L.push(['line', l.label, KT.yen(l.yen)]);
    L.push(['sep']);
    L.push(['head', '差し引き（弁償・手配料など）']);
    if (!res.costs.length) L.push(['line', 'なし', KT.yen(0)]);
    for (const l of res.costs) L.push(['line minus', l.label, KT.yen(-l.yen)]);
    L.push(['sep']);
    L.push(['total', '差引 お受け取り額', KT.yen(res.profit)]);
    L.push(['sep']);
    L.push(['small', `無事 ${c.ok + c.scratched}点　破損 ${c.damaged}点　全損 ${c.broken}点　落下 ${c.fallen}点　積み残し ${c.left}点`]);
    L.push(['center r-small', 'またのご利用をお待ちしております']);

    const make = (l) => {
      const [kind, a, b] = l;
      const el = document.createElement('div');
      if (kind === 'sep') el.className = 'r-sep';
      else if (kind === 'head') { el.className = 'r-head'; el.textContent = a; }
      else if (kind === 'small') { el.className = 'r-small'; el.textContent = a; }
      else if (kind.startsWith('center')) { el.className = 'r-center ' + kind.replace('center', '').trim(); el.textContent = a; }
      else {
        el.className = 'r-line' + (kind === 'total' ? ' r-total' + (res.profit < 0 ? ' minus' : '') : '') + (kind.includes('minus') ? ' minus' : '');
        const l1 = document.createElement('span');
        l1.className = 'l';
        l1.textContent = a;
        const v = document.createElement('span');
        v.className = 'v';
        v.textContent = b;
        el.append(l1, v);
      }
      return el;
    };

    let i = 0;
    const finish = () => {
      while (i < L.length) rc.appendChild(make(L[i++]));
      showStamp(res, isBest);
    };
    rc.onclick = () => {
      if (i < L.length) {
        clearResultTimers();
        finish();
      }
    };
    const step = () => {
      if (S.state !== 'result') return;
      if (i >= L.length) {
        showStamp(res, isBest);
        return;
      }
      const l = L[i++];
      rc.appendChild(make(l));
      rc.scrollTop = rc.scrollHeight;
      if (l[0] === 'total') A.cash();
      else if (l[0] !== 'sep') A.tick();
      S.resultTimers.push(setTimeout(step, l[0] === 'sep' ? 70 : l[0] === 'total' ? 500 : 120));
    };
    S.resultTimers.push(setTimeout(step, 300));
  }

  function showStamp(res, isBest) {
    const st = $('stamp');
    if (st.classList.contains('show')) return;
    if (res.rank === 'X') st.innerHTML = '<span class="s-top">精算</span><span class="s-main word">赤字</span><span class="s-bottom">限界便</span>';
    else st.innerHTML = `<span class="s-top">黒字</span><span class="s-main">${res.rank}</span><span class="s-bottom">評価</span>`;
    S.resultTimers.push(setTimeout(() => {
      st.classList.add('show');
      A.stamp();
      const holder = document.querySelector('.receipt-holder');
      holder.classList.remove('thump');
      void holder.offsetWidth;
      holder.classList.add('thump');
      $('rank-line').innerHTML = `<b>${res.rank === 'X' ? '赤字' : res.rank}</b>${RANK_TITLE[res.rank]}${isBest === 'best' ? '　自己ベスト更新' : ''}`;
    }, 260));
    S.resultTimers.push(setTimeout(() => $('voice').classList.add('show'), 800));
    S.resultTimers.push(setTimeout(() => $('tip').classList.add('show'), 950));
    S.resultTimers.push(setTimeout(() => document.querySelector('.result-actions').classList.add('show'), 1100));
  }

  // ------------------------------------------------------------------
  // 入力
  // ------------------------------------------------------------------
  function setupInput() {
    const canvas = $('game');
    canvas.addEventListener('pointerdown', (e) => {
      S.pointer.sx = e.clientX;
      S.pointer.sy = e.clientY;
      S.pointer.down = true;
      A.init();
      A.resume();
      if (S.state !== 'load') return;
      e.preventDefault();
      const w = pointerWorld();
      const sim = S.sim;
      if (e.button === 2) {
        if (S.held) rotateHeld(90 * DEG);
        else {
          const it = itemAt(w);
          if (it) quickRotate(it, 90 * DEG);
        }
        return;
      }
      if (S.ropeMode) {
        const hk = hookAt(w);
        if (hk != null) {
          const p = sim.truck.hookWorld(hk);
          S.ropeDrag = { fromHook: hk, ax: p.x, ay: p.y, bx: w.x, by: w.y, ok: false };
          return;
        }
        const it = itemAt(w);
        if (it) {
          const lp = it.body.getLocalPoint(planck.Vec2(w.x, w.y));
          S.ropeDrag = { fromItem: it, local: { x: lp.x, y: lp.y }, ax: w.x, ay: w.y, bx: w.x, by: w.y, ok: false };
          return;
        }
        const rope = ropeAt(w);
        if (rope) {
          sim.removeRope(rope, true);
          A.click();
          toast('ロープを外しました');
          updateLoadUI();
        }
        return;
      }
      const it = itemAt(w);
      if (it) beginHoldFromWorld(it, w);
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => {
      if (S.state !== 'load') return;
      e.preventDefault();
      if (S.held) rotateHeld((e.deltaY > 0 ? 15 : -15) * DEG);
    }, { passive: false });

    window.addEventListener('pointermove', (e) => {
      S.pointer.sx = e.clientX;
      S.pointer.sy = e.clientY;
      if (S.state !== 'load') return;
      if (S.tagPress && !S.held) {
        const tp = S.tagPress;
        if (Math.hypot(e.clientX - tp.x, e.clientY - tp.y) > 7) {
          S.tagPress = null;
          beginHoldFromTray(tp.inst);
        }
      }
      if (S.held) {
        updateHeld();
        return;
      }
      const w = pointerWorld();
      if (S.ropeDrag) {
        const rd = S.ropeDrag;
        rd.bx = w.x;
        rd.by = w.y;
        rd.ok = rd.fromHook != null ? !!itemAt(w) : hookAt(w) != null;
        return;
      }
      // ホバー
      if (e.target === $('game')) {
        const it = itemAt(w);
        const prevHover = S.hoverUid;
        S.hoverUid = it ? it.uid : null;
        if (S.hoverUid !== prevHover && !S.ropeMode) setHint(it ? itemInfo(it) : null);
        S.hoverHook = S.ropeMode ? hookAt(w) : null;
        S.hoverRope = S.ropeMode && !it && S.hoverHook == null ? (ropeAt(w) || {}).id : null;
        $('game').style.cursor = S.ropeMode ? (S.hoverHook != null || it || S.hoverRope ? 'crosshair' : 'default') : it ? 'grab' : 'default';
      } else {
        S.hoverUid = null;
      }
    });
    const up = (e) => {
      S.pointer.down = false;
      if (S.state !== 'load') return;
      if (S.tagPress) {
        const tp = S.tagPress;
        S.tagPress = null;
        // スクロールなどで取り消された時（pointercancel）は置かない
        if (e.type === 'pointerup') autoPlace(tp.inst);
        return;
      }
      if (S.held) {
        dropHeld();
        return;
      }
      if (S.ropeDrag) {
        const rd = S.ropeDrag;
        S.ropeDrag = null;
        const w = pointerWorld();
        if (rd.fromHook != null) {
          const it = itemAt(w);
          if (it) {
            const lp = it.body.getLocalPoint(planck.Vec2(w.x, w.y));
            addRope(it, { x: lp.x, y: lp.y }, rd.fromHook);
          }
        } else {
          const hk = hookAt(w);
          if (hk != null && rd.fromItem.state === 'placed') addRope(rd.fromItem, rd.local, hk);
        }
      }
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);

    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const code = e.code;
      if (!$('dlg-howto').classList.contains('hidden')) {
        if (code === 'Escape') $('dlg-howto').classList.add('hidden');
        return;
      }
      if (S.state === 'drive') {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(code)) e.preventDefault();
        if (code === 'Escape' || code === 'KeyP') {
          setPaused(!S.paused);
          return;
        }
        if (S.paused) return;
        S.keys[code] = true;
        if (code === 'KeyH' && !e.repeat) A.horn();
        if (code === 'KeyR' && (S.sim.flipped || S.sim.stuck)) S.sim.rescue();
      } else if (S.state === 'load') {
        if (!$('dlg-depart').classList.contains('hidden')) {
          if (code === 'Escape') $('dlg-depart').classList.add('hidden');
          return;
        }
        if (code === 'KeyQ') rotateHeld(-15 * DEG);
        else if (code === 'KeyE') rotateHeld(15 * DEG);
        else if (code === 'KeyR') {
          if (S.held) rotateHeld(90 * DEG);
          else if (S.lastSelected && S.lastSelected.state === 'placed') quickRotate(S.lastSelected, 90 * DEG);
        } else if (code === 'KeyT') setRopeMode(!S.ropeMode);
        else if (code === 'Escape') {
          if (S.held) {
            S.held.overTray = true;
            dropHeld();
          } else if (S.ropeMode) setRopeMode(false);
        }
      }
      if (code === 'KeyM' && !e.repeat) toggleMute();
    });
    window.addEventListener('keyup', (e) => {
      S.keys[e.code] = false;
    });
    window.addEventListener('blur', () => {
      S.keys = Object.create(null);
      S.pedals.gas = S.pedals.brake = false;
    });

    // ペダル（タッチ）
    const pedal = (id, key) => {
      const el = $(id);
      const on = (e) => { e.preventDefault(); S.pedals[key] = true; el.classList.add('on'); A.init(); A.resume(); };
      const off = (e) => { e.preventDefault(); S.pedals[key] = false; el.classList.remove('on'); };
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointerleave', off);
      el.addEventListener('pointercancel', off);
    };
    pedal('pedal-gas', 'gas');
    pedal('pedal-brake', 'brake');
  }

  function toggleMute() {
    A.init();
    A.setMuted(!A.muted);
    if (!A.muted) {
      A.resume();
      if (!A.musicTimer) A.startMusic();
    }
    updateMuteButton();
  }
  function updateMuteButton() {
    const b = $('btn-mute');
    b.classList.toggle('off', !!A.muted);
    b.setAttribute('aria-label', A.muted ? '音を出す' : '音を切る');
  }

  function setupButtons() {
    $('btn-start').addEventListener('click', () => {
      A.init();
      A.resume();
      A.click();
      if (!A.musicTimer) A.startMusic();
      buildSlips();
      showScreen('stages');
    });
    $('btn-howto').addEventListener('click', () => {
      A.init();
      A.click();
      $('dlg-howto').classList.remove('hidden');
      $('btn-howto-close').focus();
    });
    $('btn-howto-close').addEventListener('click', () => $('dlg-howto').classList.add('hidden'));
    $('dlg-howto').addEventListener('click', (e) => {
      if (e.target === $('dlg-howto')) $('dlg-howto').classList.add('hidden');
    });
    $('btn-stages-back').addEventListener('click', () => {
      A.click();
      showScreen('title');
    });
    $('btn-rope').addEventListener('click', () => {
      A.click();
      if (S.held) dropHeld();
      setRopeMode(!S.ropeMode);
    });
    $('btn-unload').addEventListener('click', () => {
      const sim = S.sim;
      if (S.held) dropHeld();
      for (const it of sim.items) if (it.state === 'placed') sim.returnToTray(it);
      A.click();
      updateLoadUI();
      toast('荷物をすべておろしました');
    });
    $('btn-depart').addEventListener('click', () => {
      A.click();
      openDepart();
    });
    $('btn-go').addEventListener('click', () => {
      A.click();
      startDrive();
    });
    $('btn-back-load').addEventListener('click', () => {
      A.click();
      $('dlg-depart').classList.add('hidden');
    });
    $('btn-rot-l').addEventListener('click', () => rotateButton(-1));
    $('btn-rot-r').addEventListener('click', () => rotateButton(1));
    $('btn-rescue').addEventListener('click', () => {
      if (S.sim && (S.sim.flipped || S.sim.stuck)) S.sim.rescue();
    });
    $('btn-pause').addEventListener('click', () => setPaused(true));
    $('btn-resume').addEventListener('click', () => setPaused(false));
    $('btn-reload').addEventListener('click', () => startLoad(S.stageIdx));
    $('btn-quit').addEventListener('click', () => {
      A.stopEngine();
      $('dlg-pause').classList.add('hidden');
      S.paused = false;
      buildSlips();
      showScreen('stages');
    });
    $('btn-next').addEventListener('click', () => {
      A.click();
      const isLast = S.stageIdx >= KT.STAGES.length - 1;
      startLoad(isLast ? 0 : S.stageIdx + 1);
    });
    $('btn-retry').addEventListener('click', () => {
      A.click();
      startLoad(S.stageIdx);
    });
    $('btn-list').addEventListener('click', () => {
      A.click();
      clearResultTimers();
      buildSlips();
      showScreen('stages');
    });
    $('btn-mute').addEventListener('click', toggleMute);
  }

  function rotateButton(dir) {
    if (S.state !== 'load') return;
    if (S.held) rotateHeld(dir * 90 * DEG);
    else if (S.lastSelected && S.lastSelected.state === 'placed') quickRotate(S.lastSelected, dir * 90 * DEG);
    else toast('回したい荷物を一度つかむか、置いてから押してください');
  }

  // ------------------------------------------------------------------
  // メインループ
  // ------------------------------------------------------------------
  function loop(ts) {
    const dt = Math.min(0.05, (ts - S.lastTs) / 1000 || 0.016);
    S.lastTs = ts;
    if (!S.paused) S.clock += dt;
    const r = S.r;
    let sim;
    if (S.state === 'title' || S.state === 'stages') {
      updateDemo(dt);
      sim = S.demo;
    } else {
      sim = S.sim;
      if (S.state === 'load') {
        sim.step(dt);
        handleEvents(sim);
        if (S.held) updateHeld();
        loadCamera(false);
        // 警告の変化をすこしずつ反映
        S.hudTimer += dt;
        if (S.hudTimer > 0.3) {
          S.hudTimer = 0;
          updateLoadUI();
        }
      } else if (S.state === 'drive') {
        if (!S.paused) updateDrive(dt);
      } else if (S.state === 'result') {
        sim.step(dt);
        sim.events.length = 0;
      }
    }
    const fxScale = S.state === 'drive' ? S.timeScale || 1 : 1;
    if (!S.paused) r.updateFx(dt * fxScale);
    if (S.bubble && S.clock - S.bubble.t0 > S.bubble.life) S.bubble = null;
    if (S.state === 'load' && S.ropeDrag && !S.pointer.down) S.ropeDrag = null;
    r.render(sim, {
      mode: S.state === 'load' ? 'load' : 'drive',
      dt,
      held: S.state === 'load' && S.held && !S.held.overTray ? S.held : null,
      hoverHook: S.hoverHook,
      hoverUid: S.state === 'load' && !S.held ? S.hoverUid : null,
      hoverRope: S.hoverRope,
      ropeDrag: S.state === 'load' ? S.ropeDrag : null,
      bubble: S.state === 'drive' && S.bubble ? { text: S.bubble.text, age: S.clock - S.bubble.t0, life: S.bubble.life } : null,
      slow: S.state === 'drive' ? slowAmount() : 0,
      camRate: S.state === 'drive' && slowAmount() > 0 ? 9 : 5,
    });
    requestAnimationFrame(loop);
  }

  // 自動テスト・デバッグ用の窓口
  window.KTDebug = {
    state: () => S.state,
    sim: () => S.sim,
    start: (i = 0) => { A.init(); buildSlips(); startLoad(i); },
    autoLoad: () => { S.sim.autoLoad(); updateLoadUI(); },
    depart: () => startDrive(),
    finish: () => finishDrive(),
    /** 荷物を載せたまま軽トラを x へ移動（見た目の確認用） */
    warp: (x) => {
      const sim = S.sim;
      const ch = sim.truck.chassis;
      const keep = sim.items.filter((i) => i.state === 'placed').map((it) => ({ it, lp: ch.getLocalPoint(it.body.getPosition()), la: it.body.getAngle() - ch.getAngle() }));
      let gy = -Infinity;
      for (let dx = -2; dx <= 2; dx += 0.25) gy = Math.max(gy, KT.groundY(sim.course, x + dx));
      sim.truck.resetTo(x, gy);
      for (const k of keep) {
        const p = ch.getWorldPoint(k.lp);
        k.it.body.setTransform(planck.Vec2(p.x, p.y + 0.12), k.la);
        k.it.body.setLinearVelocity(planck.Vec2(0, 0));
        k.it.body.setAngularVelocity(0);
      }
      S.r.snapCamera();
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
