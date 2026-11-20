(function (global) {
  'use strict';

  const K = global.Keitora;
  const STORAGE_KEY = 'keitora_genkai_best_v1';

  function formatYen(n) {
    const sign = n < 0 ? '-' : '';
    return `${sign}¥${Math.abs(Math.round(n)).toLocaleString('ja-JP')}`;
  }

  function formatTime(sec) {
    const s = Math.max(0, Math.ceil(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }

  function distPointToSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq > 1e-6 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  class KeitoraGame {
    constructor() {
      this.canvas = document.getElementById('game-canvas');
      this.renderer = new K.WorldRenderer(this.canvas);
      this.audio = new K.SoundEngine();

      this.phase = 'title';
      this.stage = K.getStage(1);
      this.world = null;
      this.manifest = [];
      this.loadHistory = [];

      this.heldItem = null;
      this.ropeMode = false;
      this.ropeDrag = null;
      this.ropeHover = null;
      this.ropesMax = 2;
      this.hoveredDef = null;

      this.keys = { gas: false, brake: false };
      this.pedalInput = { gas: false, brake: false };
      this.remainingTime = 75;
      this.goalSettleTimer = 0;
      this.endReason = null;
      this.driverPanicTimer = 0;
      this.exhaustTimer = 0;
      this.cameraShake = 0;
      this.toastTimer = 0;
      this.loadingHudTick = 0;

      this.particles = [];
      this.popups = [];
      this.animTime = 0;
      this.lastFrameTime = 0;
      this.accumulator = 0;

      this.bestRecords = this._loadBestRecords();
      this._cacheDom();
      this._bindEvents();

      this.renderer.resize();
      window.addEventListener('resize', () => this.renderer.resize());

      this._initStageWorld(1, true);
      this._renderStageCards();
      this._showScreen('title');

      requestAnimationFrame((ts) => this._loop(ts));
    }

    _cacheDom() {
      this.dom = {
        screenTitle: document.getElementById('screen-title'),
        stageCards: document.getElementById('stage-cards'),
        hudLoading: document.getElementById('hud-loading'),
        hudDriving: document.getElementById('hud-driving'),
        screenSettlement: document.getElementById('screen-settlement'),
        driveToast: document.getElementById('drive-toast'),

        btnBackTitle: document.getElementById('btn-back-title'),
        loadStageCode: document.getElementById('load-stage-code'),
        loadStageTitle: document.getElementById('load-stage-title'),
        statCount: document.getElementById('stat-count'),
        statWeight: document.getElementById('stat-weight'),
        statValue: document.getElementById('stat-value'),
        statBalanceChip: document.getElementById('stat-balance-chip'),
        statBalance: document.getElementById('stat-balance'),
        btnRotate: document.getElementById('btn-rotate'),
        btnRopeMode: document.getElementById('btn-rope-mode'),
        ropeLeft: document.getElementById('rope-left'),
        btnUndo: document.getElementById('btn-undo'),
        btnClear: document.getElementById('btn-clear'),
        btnMuteLoad: document.getElementById('btn-mute-load'),
        btnDepart: document.getElementById('btn-depart'),
        loadTipBar: document.getElementById('load-tip-bar'),
        loadTipText: document.getElementById('load-tip-text'),
        cargoDockWrap: document.getElementById('cargo-dock-wrap'),
        dockUnloadHint: document.getElementById('dock-unload-hint'),
        cargoDock: document.getElementById('cargo-dock'),

        driveStageName: document.getElementById('drive-stage-name'),
        driveDistText: document.getElementById('drive-dist-text'),
        driveTimer: document.getElementById('drive-timer'),
        courseMinimap: document.getElementById('course-minimap'),
        driveProgressFill: document.getElementById('drive-progress-fill'),
        driveTruckMarker: document.getElementById('drive-truck-marker'),
        dcIntact: document.getElementById('dc-intact'),
        dcDamaged: document.getElementById('dc-damaged'),
        dcLost: document.getElementById('dc-lost'),
        driveEstVal: document.getElementById('drive-est-val'),
        btnRetryLoad: document.getElementById('btn-retry-load'),
        btnMuteDrive: document.getElementById('btn-mute-drive'),
        driveSpeed: document.getElementById('drive-speed'),
        speedoBox: document.querySelector('.speedo'),
        pedalBrake: document.getElementById('pedal-brake'),
        pedalGas: document.getElementById('pedal-gas'),
        pedalHorn: document.getElementById('pedal-horn'),

        settleStageLabel: document.getElementById('settle-stage-label'),
        settleRankTitle: document.getElementById('settle-rank-title'),
        settleRankStamp: document.getElementById('settle-rank-stamp'),
        settleRankLetter: document.getElementById('settle-rank-letter'),
        settleRankSub: document.getElementById('settle-rank-sub'),
        settleComment: document.getElementById('settle-comment'),
        settleItemList: document.getElementById('settle-item-list'),
        settleSummary: document.getElementById('settle-summary'),
        settleFinalTotal: document.getElementById('settle-final-total'),
        btnSettleRetry: document.getElementById('btn-settle-retry'),
        btnSettleNext: document.getElementById('btn-settle-next'),
        btnSettleTitle: document.getElementById('btn-settle-title'),
      };
    }

    _loadBestRecords() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      } catch (_) {
        return {};
      }
    }

    _saveBestRecord(stageId, finalTotal, rank) {
      const prev = this.bestRecords[stageId];
      if (!prev || finalTotal > prev.score) {
        this.bestRecords[stageId] = { score: finalTotal, rank };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bestRecords));
        } catch (_) {}
      }
    }

    _renderStageCards() {
      const container = this.dom.stageCards;
      container.innerHTML = '';
      for (const st of K.STAGES) {
        const totalItemsVal = st.items.reduce((s, id) => s + K.getItemDef(id).value, 0);
        const totalKg = st.items.reduce((s, id) => s + K.getItemDef(id).massKg, 0);
        const best = this.bestRecords[st.id];

        const card = document.createElement('div');
        card.className = 'stage-card';
        card.innerHTML = `
          <div class="sc-top">
            <span class="sc-code">${st.code}</span>
            <span class="sc-diff">${st.difficultyLabel}</span>
          </div>
          <h3 class="sc-title">${st.title}</h3>
          <div class="sc-sub">${st.subtitle}</div>
          <div class="sc-specs">
            <span>📏 距離 ${st.distance}m</span>
            <span>📦 荷物 ${st.items.length}点</span>
            <span>⚖️ 総重量 ${totalKg}kg</span>
            <span>🪢 ロープ ${st.ropes}本</span>
          </div>
          <div class="sc-hazards" title="${st.hazardSummary || ''}">⚠ ${st.hazardSummary || '段差あり'}</div>
          <div class="sc-best">${
            best
              ? `🏆 ベスト: ${best.rank}ランク (${formatYen(best.score)})`
              : `💰 荷物報酬計 ${formatYen(totalItemsVal)}`
          }</div>
          <button class="btn btn-go sc-btn" data-stage-id="${st.id}">この案件を受ける</button>
        `;
        card.querySelector('button').addEventListener('click', () => {
          this.audio.init();
          this.startStageLoading(st.id);
        });
        container.appendChild(card);
      }
    }

    _showScreen(mode) {
      this.dom.screenTitle.classList.toggle('hidden', mode !== 'title');
      this.dom.hudLoading.classList.toggle('hidden', mode !== 'loading');
      this.dom.hudDriving.classList.toggle('hidden', mode !== 'driving' && mode !== 'goal_settle');
      this.dom.screenSettlement.classList.toggle('hidden', mode !== 'settlement');
    }

    _initStageWorld(stageId, isTitleDemo) {
      this.stage = K.getStage(stageId);
      const terrain = K.createTerrain(this.stage);
      this.world = new K.PhysicsWorld(terrain);
      this.world.phase = 'loading';
      this.ropesMax = this.stage.ropes;
      this.manifest = this.stage.items.map((id, idx) => ({
        slotIndex: idx,
        def: K.getItemDef(id),
        body: null,
      }));
      this.loadHistory = [];
      this.heldItem = null;
      this.ropeMode = false;
      this.ropeDrag = null;
      this.particles = [];
      this.popups = [];
      this.remainingTime = this.stage.timeLimit;
      this.endReason = null;
      this.driverPanicTimer = 0;

      for (let i = 0; i < 45; i++) {
        this.world.step(1 / 60, {});
      }
      this.world.consumeEvents();

      if (isTitleDemo) {
        const wDef = K.getItemDef('washer');
        const bDef = K.getItemDef('box_books');
        const pDef = K.getItemDef('plant');
        const p1 = K.localToWorld(this.world.truck, 0.0, wDef.h * 0.5 + 0.02);
        const p2 = K.localToWorld(this.world.truck, -0.68, bDef.h * 0.5 + 0.02);
        const p3 = K.localToWorld(this.world.truck, -0.68, bDef.h + pDef.h * 0.5 + 0.03);
        this.world.addCargo(wDef, p1.x, p1.y, 0, -1);
        this.world.addCargo(bDef, p2.x, p2.y, 0, -2);
        this.world.addCargo(pDef, p3.x, p3.y, 0, -3);
        for (let i = 0; i < 60; i++) this.world.step(1 / 60, {});
        this.world.consumeEvents();
      }
    }

    startStageLoading(stageId) {
      this.audio.stopEngine();
      this._initStageWorld(stageId, false);
      this.phase = 'loading';
      this.canvas.style.cursor = 'default';
      this._showScreen('loading');

      this.dom.loadStageCode.textContent = this.stage.code;
      this.dom.loadStageTitle.textContent = this.stage.title;
      this._setRopeMode(false);
      this._rebuildCargoDock();
      this._updateLoadingHud();
      this._updateTipBar();
    }

    startDriving() {
      if (this.world.cargo.length === 0) return;
      this.heldItem = null;
      this.ropeDrag = null;
      this._setRopeMode(false);
      this.canvas.style.cursor = 'default';
      this.phase = 'driving';
      this.world.phase = 'driving';
      this.remainingTime = this.stage.timeLimit;
      this.endReason = null;
      this.keys.gas = false;
      this.keys.brake = false;
      this.pedalInput.gas = false;
      this.pedalInput.brake = false;

      this._showScreen('driving');
      this.dom.driveStageName.textContent = `${this.stage.code} ${this.stage.title}`;
      this.audio.playStartEngineRev();
      this.audio.startEngine();
      this._addPopup(this.world.truck.x + 0.6, this.world.truck.y + 1.4, '出発進行！', '#2c9652', 22);
      this._showToast('安全運転で新居を目指そう！段差と踏切は減速！', true, 2.4);
      this._updateDrivingHud();
    }

    _enterGoalSettle(reason) {
      if (this.phase === 'goal_settle' || this.phase === 'settlement') return;
      this.endReason = reason;
      this.phase = 'goal_settle';
      this.world.phase = 'goal_settle';
      this.keys.gas = false;
      this.keys.brake = false;
      this.pedalInput.gas = false;
      this.pedalInput.brake = false;

      if (reason === 'goal') {
        this.goalSettleTimer = 1.45;
        this.audio.playGoalFanfare();
        this._showToast('🏡 新居に到着！荷台の荷物を確認中…', true, 1.8);
        const tx = this.world.truck.x;
        const ty = this.world.truck.y + 2.2;
        const colors = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#ff924c'];
        for (let i = 0; i < 42; i++) {
          this.particles.push({
            x: tx + (Math.random() - 0.5) * 4,
            y: ty + Math.random() * 1.5,
            vx: (Math.random() - 0.5) * 5,
            vy: 2 + Math.random() * 4.5,
            size: 5 + Math.random() * 5,
            color: colors[i % colors.length],
            life: 1.3 + Math.random() * 0.8,
            maxLife: 2.1,
            gravity: 5.5,
            rot: Math.random() * 6,
            vrot: (Math.random() - 0.5) * 8,
            shape: 'rect',
          });
        }
      } else if (reason === 'flipped') {
        this.goalSettleTimer = 1.2;
        this.audio.playDropAlert();
        this._showToast('💥 軽トラが横転してしまいました！', false, 2.0);
      } else {
        this.goalSettleTimer = 1.0;
        this.audio.playDropAlert();
        this._showToast('⏱ 制限時間オーバー！引き渡しに間に合いませんでした…', false, 2.0);
      }
    }

    _openSettlement() {
      this.phase = 'settlement';
      this.audio.stopEngine();

      const report = this.manifest.map((slot) => {
        if (!slot.body) {
          return { def: slot.def, loaded: false, dropped: false, hp: 100, state: 'intact' };
        }
        return {
          def: slot.def,
          loaded: true,
          dropped: slot.body.dropped,
          hp: slot.body.hp,
          state: K.getDamageState(slot.body.hp),
        };
      });

      const ropesUsed = this.world.ropes.length;
      const ropesUnused = Math.max(0, this.ropesMax - ropesUsed);
      const ropesSnapped = this.world.ropes.filter((r) => r.snapped).length;

      const res = K.calculateSettlement(report, {
        stage: this.stage,
        reachedGoal: this.endReason === 'goal',
        flipped: this.endReason === 'flipped',
        timeUp: this.endReason === 'timeup',
        remainingTime: this.remainingTime,
        ropesUnused,
        ropesSnapped,
      });

      if (this.endReason === 'goal') {
        this._saveBestRecord(this.stage.id, res.finalTotal, res.rank);
      }

      this.dom.settleStageLabel.textContent = `${this.stage.code} ${this.stage.title}（${this.stage.subtitle}）`;
      if (this.dom.settleRankTitle) {
        this.dom.settleRankTitle.textContent = `評価：${res.rankTitle}`;
      }
      this.dom.settleRankLetter.textContent = res.rank;
      this.dom.settleRankSub.textContent = res.stampText || res.rankTitle;
      this.dom.settleRankStamp.className = `rank-stamp rank-${res.rank} animate-slam`;
      this.dom.settleComment.textContent = res.comment;

      const listEl = this.dom.settleItemList;
      listEl.innerHTML = '';
      for (const row of res.rows) {
        const div = document.createElement('div');
        div.className = 'receipt-row';

        const nameCell = document.createElement('div');
        nameCell.className = 'receipt-item-name';
        const mini = this._createMiniItemCanvas(
          row.def,
          28,
          24,
          row.status === 'broken' || row.status === 'dropped'
            ? 'broken'
            : row.status === 'damaged'
              ? 'damaged'
              : 'intact'
        );
        mini.className = 'receipt-item-icon';
        nameCell.appendChild(mini);
        const span = document.createElement('span');
        span.textContent = row.def.name;
        nameCell.appendChild(span);

        const stCell = document.createElement('div');
        const badge = document.createElement('span');
        badge.className = `status-badge ${row.status}`;
        badge.textContent = row.statusLabel;
        stCell.appendChild(badge);

        const amtCell = document.createElement('div');
        amtCell.className = `receipt-amt ${row.net > 0 ? 'pos' : row.net < 0 ? 'neg' : 'zero'}`;
        amtCell.textContent = row.net > 0 ? `+${formatYen(row.net)}` : row.net < 0 ? formatYen(row.net) : '¥0';

        div.appendChild(nameCell);
        div.appendChild(stCell);
        div.appendChild(amtCell);
        listEl.appendChild(div);
      }

      const sumEl = this.dom.settleSummary;
      sumEl.innerHTML = '';
      const addSumLine = (label, amt, cls) => {
        const line = document.createElement('div');
        line.className = `sum-line ${cls || ''}`;
        const sign = amt > 0 ? '+' : '';
        line.innerHTML = `<span>${label}</span><span>${sign}${formatYen(amt)}</span>`;
        sumEl.appendChild(line);
      };

      if (res.baseFee > 0) addSumLine('基本引っ越し作業料', res.baseFee, '');
      addSumLine('荷物お届け報酬', res.deliveryEarnings, res.deliveryEarnings > 0 ? 'bonus' : '');
      if (res.perfectBonus > 0) addSumLine('🎉 全品無傷・完納ボーナス', res.perfectBonus, 'bonus');
      if (res.speedBonus > 0) addSumLine(`⏱ 早着スピードボーナス (残${Math.ceil(this.remainingTime)}秒)`, res.speedBonus, 'bonus');
      if (res.ropeBonus > 0) addSumLine(`🪢 ロープ節約ボーナス (${ropesUnused}本)`, res.ropeBonus, 'bonus');
      if (res.penaltyTotal > 0) addSumLine('💥 破損・落下 弁償差引', -res.penaltyTotal, 'penalty');
      if (res.rescuePenalty > 0) addSumLine('🚨 横転レッカー救援費', -res.rescuePenalty, 'penalty');

      this.dom.settleFinalTotal.textContent = formatYen(res.finalTotal);
      this.dom.settleFinalTotal.classList.toggle('negative', res.finalTotal < 0);

      const hasNext = this.stage.id < K.STAGES.length;
      this.dom.btnSettleNext.classList.toggle('hidden', !hasNext);

      this._showScreen('settlement');
      this.audio.playStamp(res.rank === 'S' || res.rank === 'A' || res.rank === 'B');
    }

    _createMiniItemCanvas(def, w, h, state) {
      const c = document.createElement('canvas');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = w * dpr;
      c.height = h * dpr;
      const ctx = c.getContext('2d');
      ctx.scale(dpr, dpr);
      const scale = Math.min((w - 6) / def.w, (h - 6) / def.h);
      ctx.save();
      ctx.translate(w * 0.5, h * 0.5);
      K.drawItemGraphic(ctx, def, def.w * scale, def.h * scale, state || 'intact', 0);
      ctx.restore();
      return c;
    }

    _rebuildCargoDock() {
      const dock = this.dom.cargoDock;
      dock.innerHTML = '';

      const unloaded = this.manifest.filter((s) => !s.body);
      if (unloaded.length === 0) {
        const msg = document.createElement('div');
        msg.className = 'dock-empty-msg';
        msg.textContent = '✨ すべての荷物を荷台に積み込みました！バランスやロープを確認して出発しよう！';
        dock.appendChild(msg);
        return;
      }

      for (const slot of unloaded) {
        const def = slot.def;
        const card = document.createElement('div');
        card.className = 'cargo-card';
        if (this.heldItem && this.heldItem.slotIndex === slot.slotIndex) {
          card.classList.add('selected');
        }
        card.dataset.slotIndex = String(slot.slotIndex);

        const mini = this._createMiniItemCanvas(def, 56, 44, 'intact');
        card.appendChild(mini);

        const nameEl = document.createElement('div');
        nameEl.className = 'cargo-card-name';
        nameEl.textContent = def.name;
        card.appendChild(nameEl);

        const metaEl = document.createElement('div');
        metaEl.className = 'cargo-card-meta';
        metaEl.innerHTML = `<span>${def.massKg}kg</span><span class="yen">${formatYen(def.value)}</span>`;
        card.appendChild(metaEl);

        const mainTag = def.tags[0] || '';
        const tagEl = document.createElement('span');
        tagEl.className = 'cargo-tag';
        if (mainTag.includes('ワレモノ') || mainTag.includes('精密')) tagEl.classList.add('fragile');
        else if (mainTag.includes('重')) tagEl.classList.add('heavy');
        else if (mainTag.includes('クッション')) tagEl.classList.add('cushion');
        else if (mainTag.includes('転倒')) tagEl.classList.add('upright');
        tagEl.textContent = mainTag;
        card.appendChild(tagEl);

        card.addEventListener('pointerenter', () => {
          this.hoveredDef = def;
          this._updateTipBar();
        });
        card.addEventListener('pointerleave', () => {
          if (this.hoveredDef === def) {
            this.hoveredDef = null;
            this._updateTipBar();
          }
        });
        card.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          this.audio.init();
          if (this.ropeMode) this._setRopeMode(false);

          if (this.heldItem && this.heldItem.slotIndex === slot.slotIndex && !this.heldItem.dragging) {
            this.heldItem = null;
            this._rebuildCargoDock();
            this._updateTipBar();
            return;
          }

          this.audio.playPickup();
          const pt = this._eventToCanvasWorld(e);
          this.heldItem = {
            slotIndex: slot.slotIndex,
            def,
            rotStep: 0,
            angle: this.world.truck.angle,
            fromBed: false,
            dragging: true,
            downX: e.clientX,
            downY: e.clientY,
            wx: pt.wx,
            wy: pt.wy,
            landingY: undefined,
            valid: false,
            reason: '',
          };
          this._updateHeldPlacement(pt.wx, pt.wy);
          this._rebuildCargoDock();
          this._updateTipBar();
        });

        dock.appendChild(card);
      }
    }

    _updateLoadingHud() {
      const stats = this.world.getCargoStats();
      const loadedVal = this.world.cargo.reduce((s, b) => s + b.def.value, 0);
      this.dom.statCount.textContent = `${stats.count}/${this.manifest.length}`;
      this.dom.statWeight.textContent = `${stats.totalKg}kg`;
      this.dom.statValue.textContent = formatYen(loadedVal);

      const weightChip = this.dom.statWeight.parentElement;
      weightChip.classList.toggle('warn', stats.totalKg > 270 && stats.totalKg <= 340);
      weightChip.classList.toggle('danger', stats.totalKg > 340);

      const hasCrushRisk = this.world.cargo.some((b) => b.smoothedTopLoad > b.def.crushLimit);
      const hasTiltRisk = this.world.cargo.some((b) => {
        if (!b.def.uprightOnly) return false;
        const deg = (Math.abs(K.normalizeAngle(b.angle)) * 180) / Math.PI;
        return deg > b.def.uprightMaxDeg;
      });

      const balChip = this.dom.statBalanceChip;
      balChip.classList.remove('warn', 'danger');
      if (stats.count === 0) {
        this.dom.statBalance.textContent = '未積載';
      } else if (hasCrushRisk) {
        this.dom.statBalance.textContent = '潰れ危険!';
        balChip.classList.add('danger');
      } else if (hasTiltRisk) {
        this.dom.statBalance.textContent = '傾き危険!';
        balChip.classList.add('danger');
      } else if (stats.cgLocalX < -0.95) {
        this.dom.statBalance.textContent = '後傾危険!';
        balChip.classList.add('danger');
      } else if (stats.maxHeightM > 2.35) {
        this.dom.statBalance.textContent = '高積み注意';
        balChip.classList.add('warn');
      } else if (stats.cgLocalX < -0.78) {
        this.dom.statBalance.textContent = 'やや後寄り';
        balChip.classList.add('warn');
      } else {
        this.dom.statBalance.textContent = '安定良好';
      }

      const ropesLeft = Math.max(0, this.ropesMax - this.world.ropes.length);
      this.dom.ropeLeft.textContent = String(ropesLeft);
      this.dom.btnDepart.disabled = stats.count === 0;
      this.dom.btnUndo.disabled = this.loadHistory.length === 0;
      this.dom.btnClear.disabled = stats.count === 0 && this.world.ropes.length === 0;
    }

    _updateTipBar() {
      const bar = this.dom.loadTipBar;
      const txt = this.dom.loadTipText;
      bar.classList.toggle('rope-active', this.ropeMode);

      if (this.ropeMode) {
        const left = Math.max(0, this.ropesMax - this.world.ropes.length);
        txt.textContent =
          left > 0
            ? `🪢 ロープ縛りモード (残${left}本)：黄色の荷台フックと荷物をドラッグ（または順にクリック）で結ぼう！既存ロープをクリックで解除。`
            : '🪢 ロープを使い切りました。既存のロープをクリックすると外して結び直せます。';
        return;
      }

      const focusDef = (this.heldItem && this.heldItem.def) || this.hoveredDef;
      if (focusDef) {
        const tags = focusDef.tags.map((t) => `[${t}]`).join(' ');
        txt.textContent = `${focusDef.name}（${focusDef.massKg}kg / ${formatYen(focusDef.value)}） ${tags} — ${focusDef.desc}`;
      } else {
        txt.textContent = `💡 コツ：${this.stage.tip}`;
      }
    }

    _setRopeMode(on) {
      this.ropeMode = !!on;
      this.ropeDrag = null;
      this.ropeHover = null;
      if (this.ropeMode && this.heldItem) {
        this._cancelHeldItem();
      }
      this.dom.btnRopeMode.classList.toggle('active', this.ropeMode);
      this._updateTipBar();
    }

    _cancelHeldItem() {
      if (!this.heldItem) return;
      if (this.heldItem.fromBed) {
        const slot = this.manifest[this.heldItem.slotIndex];
        const b = this.world.addCargo(
          this.heldItem.def,
          this.heldItem.origX,
          this.heldItem.origY,
          this.heldItem.origAngle,
          this.heldItem.slotIndex
        );
        slot.body = b;
        this.loadHistory.push({ type: 'cargo', ref: b, slotIndex: this.heldItem.slotIndex });
      }
      this.heldItem = null;
      this.dom.cargoDockWrap.classList.remove('unload-target');
      this.dom.dockUnloadHint.classList.add('hidden');
      this._rebuildCargoDock();
      this._updateLoadingHud();
      this._updateTipBar();
    }

    _rotateHeld() {
      if (!this.heldItem) return;
      this.heldItem.rotStep = ((this.heldItem.rotStep || 0) + 1) % 4;
      this.heldItem.angle = this.world.truck.angle + this.heldItem.rotStep * (Math.PI * 0.5);
      this.audio.playRotate();
      this._updateHeldPlacement(this.heldItem.wx, this.heldItem.wy);
    }

    _eventToCanvasWorld(e) {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const w = this.renderer.screenToWorld(sx, sy);
      return { sx, sy, wx: w.x, wy: w.y };
    }

    _updateHeldPlacement(rawWx, rawWy) {
      const h = this.heldItem;
      if (!h) return;

      const truck = this.world.truck;
      h.angle = truck.angle + (h.rotStep || 0) * (Math.PI * 0.5);
      let wx = rawWx;
      let wy = rawWy;
      let valid = false;
      let reason = '';

      const lp = K.worldToLocal(truck, wx, wy);
      if (lp.x < -2.05 || lp.x > 0.95 || lp.y < -0.15 || lp.y > 4.2) {
        h.wx = wx;
        h.wy = wy;
        h.landingY = undefined;
        h.valid = false;
        h.reason = '荷台の上に積んでね';
        return;
      }

      const nudgeY = [0, 0.03, 0.06, 0.10, 0.15, 0.20, 0.27, 0.35, 0.43];
      const nudgeX = [0, -0.04, 0.04, -0.09, 0.09, -0.14, 0.14];
      outer: for (const dx of nudgeX) {
        for (const dy of nudgeY) {
          if (!this.world.checkPlacementOverlap(wx + dx, wy + dy, h.angle, h.def.w, h.def.h, null)) {
            wx = wx + dx;
            wy = wy + dy;
            valid = true;
            break outer;
          }
        }
      }

      if (!valid) {
        reason = '重なっています';
      }

      h.wx = wx;
      h.wy = wy;
      h.valid = valid;
      h.reason = reason;
      h.landingY = valid
        ? this.world.computeDropLandingY(wx, wy, h.angle, h.def.w, h.def.h, null)
        : undefined;
    }

    _commitHeldDrop(e) {
      const h = this.heldItem;
      if (!h) return;

      const dockRect = this.dom.cargoDockWrap.getBoundingClientRect();
      if (e.clientY >= dockRect.top - 8) {
        const slot = this.manifest[h.slotIndex];
        slot.body = null;
        this.heldItem = null;
        this.dom.cargoDockWrap.classList.remove('unload-target');
        this.dom.dockUnloadHint.classList.add('hidden');
        this.audio.playPickup();
        this._rebuildCargoDock();
        this._updateLoadingHud();
        this._updateTipBar();
        return;
      }

      this._updateHeldPlacement(h.wx, h.wy);
      if (h.valid) {
        const slot = this.manifest[h.slotIndex];
        const body = this.world.addCargo(h.def, h.wx, h.wy, h.angle, h.slotIndex);
        slot.body = body;
        this.loadHistory.push({ type: 'cargo', ref: body, slotIndex: h.slotIndex });
        this.audio.playPlace(h.def.massKg);
        this.heldItem = null;
        this.dom.cargoDockWrap.classList.remove('unload-target');
        this.dom.dockUnloadHint.classList.add('hidden');
        this._rebuildCargoDock();
        this._updateLoadingHud();
        this._updateTipBar();
      } else if (!h.dragging) {
        // In click-to-place mode, keep holding the item so player can adjust instead of losing selection
        this.audio.playInvalid();
      } else {
        this._cancelHeldItem();
      }
    }

    _findNearestRopeAnchor(wx, wy, mode) {
      const m = mode || 'any';
      const truck = this.world.truck;
      if (m !== 'cargoOnly') {
        let bestHook = null;
        let bestDist = 0.28;
        for (const hk of truck.hooks) {
          const hw = K.localToWorld(truck, hk.lx, hk.ly);
          const d = Math.hypot(hw.x - wx, hw.y - wy);
          if (d < bestDist) {
            bestDist = d;
            bestHook = {
              body: truck,
              local: { x: hk.lx, y: hk.ly },
              world: hw,
              isTruck: true,
              hookId: hk.id,
              label: hk.name,
            };
          }
        }
        if (bestHook) return bestHook;
      }

      if (m !== 'truckOnly') {
        const cargo = this.world.pickCargoAt(wx, wy);
        if (cargo) {
          const lp = K.worldToLocal(cargo, wx, wy);
          const sh = cargo.shapes[0];
          const clamped = {
            x: Math.max(-sh.hw * 0.85, Math.min(sh.hw * 0.85, lp.x)),
            y: Math.max(-sh.hh * 0.85, Math.min(sh.hh * 0.85, lp.y)),
          };
          return {
            body: cargo,
            local: clamped,
            world: K.localToWorld(cargo, clamped.x, clamped.y),
            isTruck: false,
            label: cargo.def.name,
          };
        }
      }
      return null;
    }

    _finishRopeTie(rd) {
      if (rd && rd.valid && rd.target && this.world.ropes.length < this.ropesMax) {
        const rope = this.world.addRope(rd.bodyA, rd.localA, rd.target.body, rd.target.local, 165);
        this.loadHistory.push({ type: 'rope', ref: rope });
        this.audio.playRopeTie();
        this._addPopup(
          (rd.startWorld.x + rd.target.world.x) * 0.5,
          (rd.startWorld.y + rd.target.world.y) * 0.5 + 0.15,
          'キュッ！',
          '#d48a00',
          17
        );
        this._updateLoadingHud();
        this._updateTipBar();
        return true;
      }
      return false;
    }

    _findRopeAtScreen(sx, sy) {
      for (let i = this.world.ropes.length - 1; i >= 0; i--) {
        const r = this.world.ropes[i];
        const pA = K.localToWorld(r.bodyA, r.localA.x, r.localA.y);
        const pB = K.localToWorld(r.bodyB, r.localB.x, r.localB.y);
        const sA = this.renderer.worldToScreen(pA.x, pA.y);
        const sB = this.renderer.worldToScreen(pB.x, pB.y);
        if (distPointToSeg(sx, sy, sA.x, sA.y, sB.x, sB.y) < 14) {
          return r;
        }
      }
      return null;
    }

    _bindEvents() {
      this.dom.btnBackTitle.addEventListener('click', () => {
        this.audio.stopEngine();
        this.phase = 'title';
        this.canvas.style.cursor = 'default';
        this._initStageWorld(this.stage.id, true);
        this._renderStageCards();
        this._showScreen('title');
      });

      this.dom.btnRotate.addEventListener('click', () => this._rotateHeld());
      this.dom.btnRopeMode.addEventListener('click', () => {
        this.audio.init();
        this._setRopeMode(!this.ropeMode);
      });

      this.dom.btnUndo.addEventListener('click', () => {
        while (this.loadHistory.length > 0) {
          const item = this.loadHistory.pop();
          if (item.type === 'rope') {
            if (this.world.ropes.includes(item.ref)) {
              this.world.removeRope(item.ref);
              this.audio.playPickup();
              break;
            }
          } else if (item.type === 'cargo') {
            if (this.world.cargo.includes(item.ref)) {
              this.world.removeCargo(item.ref);
              const slot = this.manifest[item.slotIndex];
              if (slot) slot.body = null;
              this.audio.playPickup();
              break;
            }
          }
        }
        this._rebuildCargoDock();
        this._updateLoadingHud();
        this._updateTipBar();
      });

      this.dom.btnClear.addEventListener('click', () => {
        this.heldItem = null;
        this.ropeDrag = null;
        this.world.cargo.length = 0;
        this.world.ropes.length = 0;
        this.loadHistory.length = 0;
        for (const s of this.manifest) s.body = null;
        this.audio.playPickup();
        this._rebuildCargoDock();
        this._updateLoadingHud();
        this._updateTipBar();
      });

      const toggleMute = () => {
        this.audio.init();
        const muted = this.audio.toggleMute();
        const icon = muted ? '🔇' : '🔊';
        this.dom.btnMuteLoad.textContent = icon;
        this.dom.btnMuteDrive.textContent = icon;
      };
      this.dom.btnMuteLoad.addEventListener('click', toggleMute);
      this.dom.btnMuteDrive.addEventListener('click', toggleMute);

      this.dom.btnDepart.addEventListener('click', () => {
        this.dom.btnDepart.blur();
        this.startDriving();
      });

      this.dom.btnRetryLoad.addEventListener('click', () => {
        this.dom.btnRetryLoad.blur();
        this.startStageLoading(this.stage.id);
      });

      const bindPedal = (el, prop) => {
        const down = (e) => {
          e.preventDefault();
          this.audio.init();
          this.pedalInput[prop] = true;
          el.classList.add('pressed');
        };
        const up = () => {
          this.pedalInput[prop] = false;
          el.classList.remove('pressed');
        };
        el.addEventListener('pointerdown', down);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointerleave', up);
        el.addEventListener('pointercancel', up);
      };
      bindPedal(this.dom.pedalGas, 'gas');
      bindPedal(this.dom.pedalBrake, 'brake');
      this.dom.pedalHorn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this._honkHorn();
      });

      this.dom.btnSettleRetry.addEventListener('click', () => {
        this.startStageLoading(this.stage.id);
      });
      this.dom.btnSettleNext.addEventListener('click', () => {
        const nextId = Math.min(K.STAGES.length, this.stage.id + 1);
        this.startStageLoading(nextId);
      });
      this.dom.btnSettleTitle.addEventListener('click', () => {
        this.phase = 'title';
        this._initStageWorld(this.stage.id, true);
        this._renderStageCards();
        this._showScreen('title');
      });

      this.canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (this.phase === 'loading') {
          if (this.heldItem) {
            this._rotateHeld();
          } else {
            const pt = this._eventToCanvasWorld(e);
            const rope = this._findRopeAtScreen(pt.sx, pt.sy);
            if (rope) {
              this.world.removeRope(rope);
              this.audio.playPickup();
              this._updateLoadingHud();
              this._updateTipBar();
            }
          }
        }
      });

      this.canvas.addEventListener('wheel', (e) => {
        if (this.phase === 'loading' && this.heldItem) {
          e.preventDefault();
          this._rotateHeld();
        }
      }, { passive: false });

      this.canvas.addEventListener('pointerdown', (e) => {
        if (this.phase !== 'loading' || e.button !== 0) return;
        this.audio.init();
        const pt = this._eventToCanvasWorld(e);

        if (this.ropeMode) {
          if (this.ropeDrag && this.ropeDrag.sticky) {
            const targetMode = this.ropeDrag.isTruckA ? 'cargoOnly' : 'any';
            const target = this._findNearestRopeAnchor(pt.wx, pt.wy, targetMode);
            if (target && target.body !== this.ropeDrag.bodyA && !(this.ropeDrag.isTruckA && target.isTruck)) {
              const d = Math.hypot(target.world.x - this.ropeDrag.startWorld.x, target.world.y - this.ropeDrag.startWorld.y);
              if (d >= 0.14 && d <= 3.5) {
                this.ropeDrag.valid = true;
                this.ropeDrag.target = target;
                this._finishRopeTie(this.ropeDrag);
              }
            }
            this.ropeDrag = null;
            return;
          }
          const hitRope = this._findRopeAtScreen(pt.sx, pt.sy);
          if (hitRope) {
            this.world.removeRope(hitRope);
            this.audio.playPickup();
            this._updateLoadingHud();
            this._updateTipBar();
            return;
          }
          if (this.world.ropes.length >= this.ropesMax) {
            this._showToast('ロープがありません！既存のロープをクリックすると外せます', false, 1.8);
            return;
          }
          const anchor = this._findNearestRopeAnchor(pt.wx, pt.wy, 'any');
          if (anchor) {
            this.ropeDrag = {
              bodyA: anchor.body,
              localA: anchor.local,
              startWorld: anchor.world,
              curWorld: { x: pt.wx, y: pt.wy },
              isTruckA: anchor.isTruck,
              downX: e.clientX,
              downY: e.clientY,
              sticky: false,
              valid: false,
            };
          }
          return;
        }

        if (this.heldItem && !this.heldItem.dragging) {
          this._updateHeldPlacement(pt.wx, pt.wy);
          this._commitHeldDrop(e);
          return;
        }

        const picked = this.world.pickCargoAt(pt.wx, pt.wy);
        if (picked) {
          this.audio.playPickup();
          const slot = this.manifest[picked.slotIndex];
          this.world.removeCargo(picked);
          if (slot) slot.body = null;
          const relStep = Math.round((picked.angle - this.world.truck.angle) / (Math.PI * 0.5));
          const rotStep = ((relStep % 4) + 4) % 4;
          this.heldItem = {
            slotIndex: picked.slotIndex,
            def: picked.def,
            rotStep,
            angle: this.world.truck.angle + rotStep * (Math.PI * 0.5),
            fromBed: true,
            origX: picked.x,
            origY: picked.y,
            origAngle: picked.angle,
            dragging: true,
            downX: e.clientX,
            downY: e.clientY,
            wx: pt.wx,
            wy: pt.wy,
            landingY: undefined,
            valid: true,
            reason: '',
          };
          this._updateHeldPlacement(pt.wx, pt.wy);
          this._updateLoadingHud();
          this._updateTipBar();
        }
      });

      window.addEventListener('pointermove', (e) => {
        if (this.phase !== 'loading') return;
        const pt = this._eventToCanvasWorld(e);

        if (this.heldItem) {
          this.canvas.style.cursor = 'grabbing';
          this._updateHeldPlacement(pt.wx, pt.wy);
          const dockRect = this.dom.cargoDockWrap.getBoundingClientRect();
          const overDock = e.clientY >= dockRect.top - 8;
          this.dom.cargoDockWrap.classList.toggle('unload-target', overDock && this.heldItem.fromBed);
          this.dom.dockUnloadHint.classList.toggle('hidden', !(overDock && this.heldItem.fromBed));
        } else if (this.ropeMode) {
          this.canvas.style.cursor = 'crosshair';
          const hoverMode = this.ropeDrag && this.ropeDrag.isTruckA ? 'cargoOnly' : 'any';
          this.ropeHover = this._findNearestRopeAnchor(pt.wx, pt.wy, hoverMode);
        } else {
          this.ropeHover = null;
          const hoveredCargo = this.world.pickCargoAt(pt.wx, pt.wy);
          this.canvas.style.cursor = hoveredCargo ? 'grab' : 'default';
          if (hoveredCargo && this.hoveredDef !== hoveredCargo.def) {
            this.hoveredDef = hoveredCargo.def;
            this._updateTipBar();
          } else if (!hoveredCargo && this.hoveredDef && e.target === this.canvas) {
            this.hoveredDef = null;
            this._updateTipBar();
          }
        }

        if (this.ropeDrag) {
          this.ropeDrag.curWorld = { x: pt.wx, y: pt.wy };
          const targetMode = this.ropeDrag.isTruckA ? 'cargoOnly' : 'any';
          const target = this._findNearestRopeAnchor(pt.wx, pt.wy, targetMode);
          if (target && target.body !== this.ropeDrag.bodyA && !(this.ropeDrag.isTruckA && target.isTruck)) {
            const d = Math.hypot(target.world.x - this.ropeDrag.startWorld.x, target.world.y - this.ropeDrag.startWorld.y);
            this.ropeDrag.valid = d >= 0.14 && d <= 3.5;
            this.ropeDrag.target = target;
            this.ropeDrag.curWorld = target.world;
          } else {
            this.ropeDrag.valid = false;
            this.ropeDrag.target = null;
          }
        }
      });

      window.addEventListener('pointerup', (e) => {
        if (this.phase !== 'loading' || e.button !== 0) return;

        if (this.ropeDrag && !this.ropeDrag.sticky) {
          const rd = this.ropeDrag;
          const movedDist = Math.hypot(e.clientX - rd.downX, e.clientY - rd.downY);
          if (movedDist < 12) {
            // Click-to-tie mode: keep first endpoint anchored until user clicks target!
            rd.sticky = true;
            return;
          }
          this._finishRopeTie(rd);
          this.ropeDrag = null;
          return;
        }

        if (this.heldItem && this.heldItem.dragging) {
          const movedDist = Math.hypot(e.clientX - this.heldItem.downX, e.clientY - this.heldItem.downY);
          const dockRect = this.dom.cargoDockWrap.getBoundingClientRect();
          if (!this.heldItem.fromBed && movedDist < 16 && e.clientY >= dockRect.top - 8) {
            this.heldItem.dragging = false;
            return;
          }
          const pt = this._eventToCanvasWorld(e);
          this._updateHeldPlacement(pt.wx, pt.wy);
          this._commitHeldDrop(e);
        }
      });

      window.addEventListener('keydown', (e) => {
        if (this.phase === 'loading') {
          if (e.code === 'KeyR' || e.code === 'Space') {
            if (this.heldItem) {
              e.preventDefault();
              this._rotateHeld();
            }
          } else if (e.code === 'Escape') {
            this._cancelHeldItem();
            this._setRopeMode(false);
          } else if (e.code === 'Enter') {
            if (this.world.cargo.length > 0 && !this.heldItem) {
              this.startDriving();
            }
          }
          return;
        }

        if (this.phase === 'driving') {
          if (e.code === 'ArrowRight' || e.code === 'KeyD') {
            e.preventDefault();
            this.keys.gas = true;
            this.dom.pedalGas.classList.add('pressed');
          } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
            e.preventDefault();
            this.keys.brake = true;
            this.dom.pedalBrake.classList.add('pressed');
          } else if (e.code === 'Space' || e.code === 'KeyH') {
            e.preventDefault();
            if (!e.repeat) this._honkHorn();
          }
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          this.keys.gas = false;
          this.dom.pedalGas.classList.remove('pressed');
        } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          this.keys.brake = false;
          this.dom.pedalBrake.classList.remove('pressed');
        }
      });
    }

    _honkHorn() {
      this.audio.playHorn();
      const t = this.world.truck;
      this._addPopup(t.x + 1.4, t.y + 1.25, 'プップー！', '#f0a800', 19);
    }

    _showToast(msg, isGood, durationSec) {
      const el = this.dom.driveToast;
      el.textContent = msg;
      el.classList.toggle('good', !!isGood);
      el.classList.remove('hidden');
      this.toastTimer = durationSec || 2.0;
    }

    _addPopup(x, y, text, color, size) {
      this.popups.push({
        x,
        y,
        text,
        color: color || '#e63e2e',
        size: size || 18,
        life: 1.05,
        maxLife: 1.05,
      });
    }

    _spawnDebris(x, y, count, colors, speed) {
      const spd = speed || 3.2;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = (0.35 + Math.random() * 0.85) * spd;
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v + 1.4,
          size: 3 + Math.random() * 4.5,
          color: colors[i % colors.length],
          life: 0.45 + Math.random() * 0.45,
          maxLife: 0.9,
          gravity: 11.0,
          rot: Math.random() * 6,
          vrot: (Math.random() - 0.5) * 10,
          shape: 'rect',
        });
      }
    }

    _handlePhysicsEvents() {
      const events = this.world.consumeEvents();
      for (const ev of events) {
        switch (ev.type) {
          case 'loading_fell': {
            const b = ev.body;
            const slot = this.manifest[b.slotIndex];
            this.world.removeCargo(b);
            if (slot) slot.body = null;
            this.audio.playPickup();
            this._addPopup(b.x, b.y + 0.5, 'おっと積み直し！', '#e67e22', 16);
            this._rebuildCargoDock();
            this._updateLoadingHud();
            break;
          }
          case 'impact': {
            this.audio.playImpact(ev.sound, ev.strength);
            this.cameraShake = Math.max(this.cameraShake, ev.strength * 5.5);
            if (ev.dmg >= 12) this.driverPanicTimer = 1.0;

            const isGlass = ev.sound === 'glass';
            const isWater = ev.sound === 'water';
            const cols = isGlass
              ? ['#d9f2ff', '#ffffff', '#88b9d6']
              : isWater
                ? ['#5dc8f2', '#a8e6ff', '#ffffff']
                : ['#c9a173', '#8c6943', '#e0d2ba'];
            this._spawnDebris(ev.x, ev.y, Math.round(4 + ev.strength * 6), cols, 2.8);

            if (ev.dmg >= 8) {
              const word = isGlass ? 'ピシッ！' : isWater ? 'バシャッ！' : 'ゴツン！';
              this._addPopup(ev.x, ev.y + 0.3, word, '#e67e22', 17);
            }
            break;
          }
          case 'crush': {
            this.audio.playImpact('thud', 0.45);
            this.driverPanicTimer = 0.8;
            this._addPopup(ev.x, ev.y + 0.2, 'ミシミシ…！', '#d94826', 16);
            this._spawnDebris(ev.x, ev.y, 4, ['#e6c59e', '#b58d5e'], 1.8);
            break;
          }
          case 'spill': {
            this.audio.playImpact(ev.sound, 0.55);
            this.driverPanicTimer = 0.9;
            const isWater = ev.sound === 'water';
            this._spawnDebris(
              ev.x,
              ev.y + 0.15,
              7,
              isWater ? ['#4ec4f5', '#a6e4ff', '#ffffff'] : ['#6e4d30', '#4a321d', '#589e4b'],
              2.4
            );
            this._addPopup(ev.x, ev.y + 0.35, isWater ? '水こぼれ！' : '土こぼれ！', '#2b86c5', 16);
            break;
          }
          case 'cushioned': {
            this.audio.playCushion();
            this._spawnDebris(ev.x, ev.y, 5, ['#dff5ff', '#ffffff', '#84c5e8'], 1.7);
            this._addPopup(ev.x, ev.y + 0.35, 'フカフカ吸収！', '#2b9652', 15);
            break;
          }
          case 'hard_landing': {
            this.audio.playSuspensionThump(ev.strength);
            this.cameraShake = Math.max(this.cameraShake, ev.strength * 3.8);
            for (let i = 0; i < 6; i++) {
              this.particles.push({
                x: ev.x + (Math.random() - 0.5) * 0.35,
                y: ev.y + 0.05,
                vx: this.world.truck.vx * 0.25 + (Math.random() - 0.5) * 2.2,
                vy: 0.4 + Math.random() * 1.1,
                size: 5 + Math.random() * 4,
                color: 'rgba(185, 175, 160, 0.72)',
                life: 0.42,
                maxLife: 0.42,
                gravity: 1.5,
                shape: 'circle',
                grow: true,
              });
            }
            break;
          }
          case 'state_damaged': {
            const lostYen = ev.body.def.value - Math.round((ev.body.def.value * 0.48) / 100) * 100;
            this._addPopup(ev.x, ev.y + 0.48, `${ev.body.def.name} キズ (-${formatYen(lostYen)})`, '#e07b10', 16);
            break;
          }
          case 'state_broken': {
            this.audio.playBreak(ev.sound);
            this.cameraShake = Math.max(this.cameraShake, 9.0);
            this.driverPanicTimer = 1.8;
            const penYen = Math.round((ev.body.def.value * 0.40) / 100) * 100;
            this._spawnDebris(
              ev.x,
              ev.y,
              14,
              ev.sound === 'glass' ? ['#e6f8ff', '#8fc8e8', '#333'] : ['#d9534f', '#f0ad4e', '#5c4033'],
              4.6
            );
            this._addPopup(ev.x, ev.y + 0.5, `大破！弁償 -${formatYen(penYen)}`, '#d9261c', 20);
            this._showToast(`💥 ${ev.body.def.name}が大破しました！（弁償 -${formatYen(penYen)}）`, false, 2.2);
            break;
          }
          case 'dropped': {
            this.audio.playDropAlert();
            this.cameraShake = Math.max(this.cameraShake, 7.0);
            this.driverPanicTimer = 2.0;
            const penYen = Math.round((ev.body.def.value * 0.45) / 100) * 100;
            this._addPopup(ev.x, ev.y + 0.55, `落下！弁償 -${formatYen(penYen)}`, '#d9261c', 20);
            this._showToast(`📦💨 ${ev.body.def.name}が荷台から落下しました！（弁償 -${formatYen(penYen)}）`, false, 2.4);
            break;
          }
          case 'rope_snap': {
            this.audio.playRopeSnap();
            this.cameraShake = Math.max(this.cameraShake, 6.0);
            this.driverPanicTimer = 1.4;
            this._spawnDebris(ev.x, ev.y, 10, ['#f5cf27', '#222', '#ff6b35'], 4.2);
            this._addPopup(ev.x, ev.y + 0.35, 'ブチッ！', '#e63e2e', 21);
            this._showToast('⚠ 負荷に耐えきれずロープが切れました！', false, 2.0);
            break;
          }
        }
      }
    }

    _updateDrivingHud() {
      const dist = Math.max(0, Math.min(this.stage.distance, this.world.truck.x));
      const pct = (dist / this.stage.distance) * 100;
      this.dom.driveDistText.textContent = `${Math.floor(dist)}m / ${this.stage.distance}m`;
      this.dom.driveProgressFill.style.width = `${pct.toFixed(1)}%`;
      this.dom.driveTruckMarker.style.left = `${pct.toFixed(1)}%`;

      this.dom.driveTimer.textContent = `⏱ ${formatTime(this.remainingTime)}`;
      this.dom.driveTimer.classList.toggle('urgent', this.remainingTime <= 15);

      let intact = 0;
      let damaged = 0;
      let lost = 0;
      let est = this.stage.baseFee;

      for (const b of this.world.cargo) {
        if (b.dropped) {
          lost++;
          est -= Math.round((b.def.value * 0.45) / 100) * 100;
        } else {
          const st = K.getDamageState(b.hp);
          if (st === 'intact') {
            intact++;
            est += b.def.value;
          } else if (st === 'damaged') {
            damaged++;
            est += Math.round((b.def.value * 0.48) / 100) * 100;
          } else {
            lost++;
            est -= Math.round((b.def.value * 0.40) / 100) * 100;
          }
        }
      }
      if (intact === this.manifest.length) {
        est += this.stage.perfectBonus;
      }

      this.dom.dcIntact.textContent = String(intact);
      this.dom.dcDamaged.textContent = String(damaged);
      this.dom.dcLost.textContent = String(lost);
      this.dom.driveEstVal.textContent = formatYen(est);
      this.dom.driveEstVal.parentElement.classList.toggle('negative', est < 0);

      const kmh = Math.max(0, Math.round(Math.abs(this.world.truck.speedKmh)));
      this.dom.driveSpeed.textContent = String(kmh);
      if (this.dom.speedoBox) {
        this.dom.speedoBox.classList.toggle('fast', kmh >= 30 && kmh < 42);
        this.dom.speedoBox.classList.toggle('danger', kmh >= 42);
      }
      if (this.dom.courseMinimap) {
        this.renderer.drawCourseMinimap(this.dom.courseMinimap, this.world.terrain, this.stage, this.world.truck.x);
      }
    }

    _stepSimulation(dt) {
      this.animTime += dt;

      if (this.toastTimer > 0) {
        this.toastTimer -= dt;
        if (this.toastTimer <= 0) {
          this.dom.driveToast.classList.add('hidden');
        }
      }

      if (this.cameraShake > 0) {
        this.cameraShake = Math.max(0, this.cameraShake - dt * 24);
      }

      if (this.driverPanicTimer > 0) {
        this.driverPanicTimer = Math.max(0, this.driverPanicTimer - dt);
      }

      const input = { throttle: 0, brake: 0 };
      if (this.phase === 'driving') {
        if (this.keys.gas || this.pedalInput.gas) input.throttle = 1;
        if (this.keys.brake || this.pedalInput.brake) input.brake = 1;
      }

      if (this.phase !== 'settlement') {
        this.world.step(dt, input);
        this._handlePhysicsEvents();
      }

      if (this.phase === 'driving') {
        this.remainingTime -= dt;
        this.audio.updateEngine(this.world.truck.vx, this.world.truck.throttle, true);

        this.exhaustTimer -= dt;
        if (this.exhaustTimer <= 0) {
          this.exhaustTimer = input.throttle > 0 ? 0.11 : 0.34;
          const tail = K.localToWorld(this.world.truck, -1.80, -0.20);
          this.particles.push({
            x: tail.x,
            y: tail.y,
            vx: this.world.truck.vx * 0.3 - 1.2 - Math.random() * 0.6,
            vy: 0.4 + Math.random() * 0.5,
            size: input.throttle > 0 ? 7 : 4.5,
            color: 'rgba(225, 228, 234, 0.72)',
            life: 0.55,
            maxLife: 0.55,
            gravity: -1.4,
            shape: 'circle',
            grow: true,
          });
        }

        for (const f of this.stage.features) {
          if (f.type === 'railroad' && Math.abs(this.world.truck.x - f.cx) < 22) {
            this.audio.playCrossingBell(this.animTime);
          }
        }

        if (this.world.truck.x >= this.stage.distance) {
          this._enterGoalSettle('goal');
        } else if (this.world.truck.isFlipped) {
          this._enterGoalSettle('flipped');
        } else if (this.remainingTime <= 0) {
          this.remainingTime = 0;
          this._enterGoalSettle('timeup');
        }

        this._updateDrivingHud();
      } else if (this.phase === 'goal_settle') {
        this.audio.updateEngine(this.world.truck.vx, 0, true);
        this.goalSettleTimer -= dt;
        this._updateDrivingHud();
        if (this.goalSettleTimer <= 0) {
          this._openSettlement();
        }
      } else if (this.phase === 'loading') {
        this.loadingHudTick++;
        if (this.loadingHudTick % 6 === 0) {
          this._updateLoadingHud();
        }
      }

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.life -= dt;
        if (pt.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        pt.vy -= (pt.gravity !== undefined ? pt.gravity : 9.8) * dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        if (pt.vrot) pt.rot += pt.vrot * dt;
      }

      for (let i = this.popups.length - 1; i >= 0; i--) {
        const pop = this.popups[i];
        pop.life -= dt;
        if (pop.life <= 0) this.popups.splice(i, 1);
      }

      const camPhase = this.phase === 'title' ? 'loading' : this.phase;
      this.renderer.updateCamera(this.world, camPhase, dt, this.cameraShake);
    }

    _loop(ts) {
      if (!this.lastFrameTime) this.lastFrameTime = ts;
      const elapsed = Math.min(0.05, (ts - this.lastFrameTime) / 1000);
      this.lastFrameTime = ts;

      const fixedDt = 1 / 60;
      this.accumulator += elapsed;
      while (this.accumulator >= fixedDt) {
        this._stepSimulation(fixedDt);
        this.accumulator -= fixedDt;
      }

      const driverMood =
        this.driverPanicTimer > 0 || Math.abs(this.world.truck.angle) > 0.38 ? 'panic' : 'ok';

      this.renderer.render({
        world: this.world,
        stage: this.stage,
        phase: this.phase === 'title' ? 'loading' : this.phase,
        time: this.animTime,
        particles: this.particles,
        popups: this.popups,
        dragPreview: this.heldItem,
        ropePreview: this.ropeDrag,
        ropeHover: this.ropeHover,
        ropeMode: this.ropeMode,
        driverMood,
      });

      requestAnimationFrame((t) => this._loop(t));
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    global.keitoraGame = new KeitoraGame();
  });
})(window);
