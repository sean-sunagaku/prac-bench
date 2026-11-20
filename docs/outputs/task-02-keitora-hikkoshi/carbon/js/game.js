(function (root) {
  'use strict';

  const STORAGE_KEY = 'keitora_genkai_hikkoshi_records_v1';

  const RANK_STAMP_SUB = {
    S: '引越王',
    A: '熟練職',
    B: '合格印',
    C: '見習印',
    D: '要反省'
  };

  function formatYen(amount, showPlus) {
    const rounded = Math.round(amount || 0);
    if (rounded < 0) {
      return '-¥' + Math.abs(rounded).toLocaleString('ja-JP');
    }
    return (showPlus && rounded > 0 ? '+¥' : '¥') + rounded.toLocaleString('ja-JP');
  }

  function pointInPolygon(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function loadRecords() {
    try {
      const raw = root.localStorage && root.localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveRecords(records) {
    try {
      if (root.localStorage) {
        root.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      }
    } catch (e) {}
  }

  const RANK_ORDER = { D: 1, C: 2, B: 3, A: 4, S: 5 };

  class KeitoraMovingGame {
    constructor() {
      this.canvas = document.getElementById('gameCanvas');
      this.renderer = new root.GameRenderer.WorldRenderer(this.canvas);
      this.records = loadRecords();

      this.phase = 'TITLE'; // TITLE | LOADING | DRIVING | GOAL | SETTLEMENT
      this.stageIndex = 0;
      this.stage = root.GameData.STAGES[0];
      this.manifest = [];
      this.sim = null;
      this.savedBlueprint = null;

      this.goalTimer = 0;
      this.lastFrameTime = performance.now();
      this.hudRefreshAccum = 0;
      this.allDroppedNotified = false;
      this.damageFeedbackCooldown = new Map();

      // Input state for driving
      this.keysDown = new Set();
      this.pedalPointers = {
        gas: false,
        brake: false,
        handbrake: false
      };

      // Loading & Canvas UI state passed to renderer
      this.uiState = {
        ropeMode: false,
        selectedHookId: null,
        pointerWorld: null,
        hoveredCargoId: null,
        selectedCargoId: null,
        dragGhost: null
      };

      this.activeDrag = null;

      this._cacheDom();
      this._bindEvents();
      this._renderStageSelectCards();
      this._setupTitleShowcaseScene();

      this._loop = this._loop.bind(this);
      requestAnimationFrame(this._loop);
    }

    _cacheDom() {
      const $ = (id) => document.getElementById(id);
      this.dom = {
        topBar: $('topBar'),
        btnBackToTitle: $('btnBackToTitle'),
        hudStageCode: $('hudStageCode'),
        hudStageName: $('hudStageName'),
        driveProgressWrap: $('driveProgressWrap'),
        hudDistanceText: $('hudDistanceText'),
        hudProgressFill: $('hudProgressFill'),
        hudProgressTruck: $('hudProgressTruck'),
        btnQuickRetryDrive: $('btnQuickRetryDrive'),
        btnBackToLoad: $('btnBackToLoad'),
        btnHelpToggle: $('btnHelpToggle'),
        btnAudioToggle: $('btnAudioToggle'),

        titleScreen: $('titleScreen'),
        stageCardsGrid: $('stageCardsGrid'),

        loadingUI: $('loadingUI'),
        loadCountBadge: $('loadCountBadge'),
        stabilityBarFill: $('stabilityBarFill'),
        stabilityScoreText: $('stabilityScoreText'),
        stabilityLabel: $('stabilityLabel'),
        totalMassText: $('totalMassText'),
        maxPayoutPreview: $('maxPayoutPreview'),
        btnRotateLeft: $('btnRotateLeft'),
        btnRotateFine: $('btnRotateFine'),
        btnRopeMode: $('btnRopeMode'),
        ropeCountBadge: $('ropeCountBadge'),
        btnAutoRope: $('btnAutoRope'),
        btnClearRopes: $('btnClearRopes'),
        btnResetLoad: $('btnResetLoad'),
        itemHintBox: $('itemHintBox'),
        cargoCardsList: $('cargoCardsList'),
        btnStartDrive: $('btnStartDrive'),
        departSubText: $('departSubText'),

        leftBehindModal: $('leftBehindModal'),
        leftBehindModalText: $('leftBehindModalText'),
        btnCancelDepart: $('btnCancelDepart'),
        btnConfirmDepart: $('btnConfirmDepart'),

        drivingUI: $('drivingUI'),
        hudSpeed: $('hudSpeed'),
        hudTimer: $('hudTimer'),
        hudTargetTime: $('hudTargetTime'),
        hudLivePayout: $('hudLivePayout'),
        drivingCargoStrip: $('drivingCargoStrip'),
        btnEmergencyRecover: $('btnEmergencyRecover'),
        pedalBrake: $('pedalBrake'),
        pedalHandbrake: $('pedalHandbrake'),
        pedalGas: $('pedalGas'),

        goalBanner: $('goalBanner'),

        settlementScreen: $('settlementScreen'),
        invoiceStamp: $('invoiceStamp'),
        stampRankChar: $('stampRankChar'),
        stampRankSub: $('stampRankSub'),
        invStageName: $('invStageName'),
        invClientName: $('invClientName'),
        invTimeText: $('invTimeText'),
        invTargetText: $('invTargetText'),
        invDeliveredCount: $('invDeliveredCount'),
        invItemsBody: $('invItemsBody'),
        invCommentsList: $('invCommentsList'),
        invBaseFee: $('invBaseFee'),
        invCargoFee: $('invCargoFee'),
        invAllBonusRow: $('invAllBonusRow'),
        invAllBonus: $('invAllBonus'),
        invPerfectBonusRow: $('invPerfectBonusRow'),
        invPerfectBonus: $('invPerfectBonus'),
        invTimeBonusLabel: $('invTimeBonusLabel'),
        invTimeBonus: $('invTimeBonus'),
        invDeductionRow: $('invDeductionRow'),
        invDeductions: $('invDeductions'),
        invRankTitle: $('invRankTitle'),
        invFinalPayout: $('invFinalPayout'),
        btnSettleToTitle: $('btnSettleToTitle'),
        btnSettleRepack: $('btnSettleRepack'),
        btnSettleRetryDrive: $('btnSettleRetryDrive'),
        btnSettleNextStage: $('btnSettleNextStage'),

        helpModal: $('helpModal'),
        btnCloseHelp: $('btnCloseHelp'),
        toastContainer: $('toastContainer')
      };
    }

    _bindEvents() {
      const unlockAudio = () => root.GameAudio.init();
      window.addEventListener('pointerdown', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });

      window.addEventListener('resize', () => this.renderer.resize());

      // Top bar buttons
      this.dom.btnBackToTitle.addEventListener('click', () => {
        this._cancelActiveDrag(true);
        this.goToTitle();
      });

      this.dom.btnQuickRetryDrive.addEventListener('click', () => {
        this.retryDriveWithSavedBlueprint();
      });

      this.dom.btnBackToLoad.addEventListener('click', () => {
        this.returnToLoadingFromBlueprint();
      });

      this.dom.btnHelpToggle.addEventListener('click', () => {
        this.dom.helpModal.classList.remove('hidden');
      });

      this.dom.btnCloseHelp.addEventListener('click', () => {
        this.dom.helpModal.classList.add('hidden');
      });

      this.dom.helpModal.addEventListener('click', (e) => {
        if (e.target === this.dom.helpModal) {
          this.dom.helpModal.classList.add('hidden');
        }
      });

      this.dom.btnAudioToggle.addEventListener('click', () => {
        const muted = root.GameAudio.toggleMute();
        this.dom.btnAudioToggle.textContent = muted ? '🔇 音OFF' : '🔊 音ON';
        if (!muted && this.phase === 'DRIVING') {
          root.GameAudio.startEngine();
        }
      });

      // Loading phase toolbar
      this.dom.btnRotateLeft.addEventListener('click', (e) => {
        e.stopPropagation();
        this.rotateCargo(Math.PI / 2);
      });

      this.dom.btnRotateFine.addEventListener('click', (e) => {
        e.stopPropagation();
        this.rotateCargo(-Math.PI / 12);
      });

      this.dom.btnRopeMode.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleRopeMode();
      });

      this.dom.btnAutoRope.addEventListener('click', (e) => {
        e.stopPropagation();
        this.applyAutoRope();
      });

      this.dom.btnClearRopes.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!this.sim) return;
        this.sim.clearRopes();
        this.uiState.selectedHookId = null;
        this._refreshRopeControls();
        this.showToast('🪢 ロープをすべて解除しました');
      });

      this.dom.btnResetLoad.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetAllCargoOnBed();
      });

      this.dom.btnStartDrive.addEventListener('click', () => {
        this.requestStartDriving();
      });

      // Left-behind confirmation modal
      this.dom.btnCancelDepart.addEventListener('click', () => {
        this.dom.leftBehindModal.classList.add('hidden');
      });

      this.dom.btnConfirmDepart.addEventListener('click', () => {
        this.dom.leftBehindModal.classList.add('hidden');
        this.beginDrivingPhase();
      });

      // Emergency truck upright recovery
      this.dom.btnEmergencyRecover.addEventListener('click', () => {
        if (!this.sim || this.phase !== 'DRIVING') return;
        this.sim.emergencyRecoverTruck();
        root.GameAudio.playPlace('metal');
        this.renderer.triggerShake(5, 0.2);
        this.dom.btnEmergencyRecover.classList.add('hidden');
        this.showToast('🔧 レッカーで車体を起こしました（精算時 -¥5,000）');
      });

      // Settlement buttons
      this.dom.btnSettleToTitle.addEventListener('click', () => {
        this.goToTitle();
      });

      this.dom.btnSettleRepack.addEventListener('click', () => {
        this.returnToLoadingFromBlueprint();
      });

      this.dom.btnSettleRetryDrive.addEventListener('click', () => {
        this.retryDriveWithSavedBlueprint();
      });

      this.dom.btnSettleNextStage.addEventListener('click', () => {
        const nextIdx = this.stageIndex + 1;
        if (nextIdx < root.GameData.STAGES.length) {
          this.startStage(nextIdx);
        } else {
          this.goToTitle();
        }
      });

      // Driving touch / mouse pedals
      this._bindPedalButton(this.dom.pedalGas, 'gas');
      this._bindPedalButton(this.dom.pedalBrake, 'brake');
      this._bindPedalButton(this.dom.pedalHandbrake, 'handbrake');

      // Global Pointer Events for Canvas Drag-and-Drop / Click-to-Place / Rope Tying
      this.canvas.addEventListener('pointerdown', (e) => this._onCanvasPointerDown(e));
      window.addEventListener('pointermove', (e) => this._onGlobalPointerMove(e));
      window.addEventListener('pointerup', (e) => this._onGlobalPointerUp(e));
      this.canvas.addEventListener('contextmenu', (e) => {
        if (this.phase === 'LOADING') {
          e.preventDefault();
          if (this.activeDrag) {
            this.rotateCargo(Math.PI / 2);
          } else if (this.uiState.ropeMode) {
            this.toggleRopeMode(false);
          }
        }
      });

      // Wheel rotation while dragging cargo in LOADING!
      this.canvas.addEventListener(
        'wheel',
        (e) => {
          if (this.phase === 'LOADING' && (this.activeDrag || this.uiState.selectedCargoId)) {
            e.preventDefault();
            const step = e.deltaY < 0 ? Math.PI / 12 : -Math.PI / 12;
            this.rotateCargo(step);
          }
        },
        { passive: false }
      );

      // Keyboard Controls
      window.addEventListener('keydown', (e) => this._onKeyDown(e));
      window.addEventListener('keyup', (e) => this._onKeyUp(e));
      window.addEventListener('blur', () => {
        this.keysDown.clear();
        this.pedalPointers.gas = false;
        this.pedalPointers.brake = false;
        this.pedalPointers.handbrake = false;
      });
    }

    _bindPedalButton(btnEl, key) {
      const release = () => {
        this.pedalPointers[key] = false;
      };
      btnEl.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        root.GameAudio.init();
        this.pedalPointers[key] = true;
      });
      btnEl.addEventListener('pointerup', release);
      btnEl.addEventListener('pointercancel', release);
      btnEl.addEventListener('pointerleave', release);
    }

    // ==================== PHASE TRANSITIONS ====================

    _setupTitleShowcaseScene() {
      const stage0 = root.GameData.STAGES[0];
      this.stage = stage0;
      this.sim = new root.GamePhysics.PhysicsSimulation(stage0, {});
      const ch = this.sim.truck.chassis;
      const pl = this.sim.pl;

      // Neat showcase stack on the Kei-truck parked outside the depot
      const demoItems = [
        ['demo_0', 'fridge', 0.22, 0.40, Math.PI / 2],
        ['demo_1', 'box_l', -0.80, 0.32, 0],
        ['demo_2', 'box_l', -0.80, 0.76, 0],
        ['demo_3', 'futon', 0.22, 0.88, 0],
        ['demo_4', 'box_fragile', 0.34, 1.25, 0],
        ['demo_5', 'plant', -0.18, 1.42, 0]
      ];
      for (const [id, tid, lx, ly, ang] of demoItems) {
        const wp = ch.getWorldPoint(pl.Vec2(lx, ly));
        this.sim.addCargoItem(id, tid, wp.x, wp.y, ang);
      }
      for (let i = 0; i < 45; i++) this.sim.step(1 / 60);
      this.sim.addRope(0, 3);
    }

    goToTitle() {
      root.GameAudio.stopEngine();
      this.dom.toastContainer.innerHTML = '';
      this.phase = 'TITLE';
      this._cancelActiveDrag(true);
      this.uiState.ropeMode = false;
      this.uiState.selectedHookId = null;

      this.dom.topBar.classList.add('hidden');
      this.dom.loadingUI.classList.add('hidden');
      this.dom.drivingUI.classList.add('hidden');
      this.dom.goalBanner.classList.add('hidden');
      this.dom.settlementScreen.classList.add('hidden');
      this.dom.leftBehindModal.classList.add('hidden');
      this.dom.titleScreen.classList.remove('hidden');

      this._renderStageSelectCards();
      this._setupTitleShowcaseScene();
    }

    _renderStageSelectCards() {
      const grid = this.dom.stageCardsGrid;
      grid.innerHTML = '';

      // Recommend the first uncleared stage (or stage 1 if all cleared)
      let recommendedId = 1;
      for (const st of root.GameData.STAGES) {
        if (!this.records[st.id]) {
          recommendedId = st.id;
          break;
        }
      }

      root.GameData.STAGES.forEach((st, idx) => {
        const rec = this.records[st.id];
        const card = document.createElement('div');
        card.className = 'stage-card' + (st.id === recommendedId ? ' recommended' : '');

        const bestHtml = rec
          ? `<span class="stage-best">最高: ${formatYen(rec.bestPayout)} [${rec.bestRank}]</span>`
          : `<span style="color:#64748b">未クリア</span>`;

        card.innerHTML = `
          <div>
            <div class="stage-card-top">
              <span class="stage-badge">${st.code}</span>
              <span class="stage-diff">${st.difficulty}</span>
            </div>
            <h3>${st.name}</h3>
            <div class="stage-client">ご依頼主：${st.client}</div>
            <p class="stage-desc">${st.description}</p>
          </div>
          <div>
            <div class="stage-stats-row">
              <span>📦 荷物 ${st.cargoManifest.length}個 / 🛣 ${st.goalX}m</span>
              ${bestHtml}
            </div>
            <button type="button" class="btn btn-stage-play">🚚 この依頼を受ける ▶</button>
          </div>
        `;

        card.querySelector('.btn-stage-play').addEventListener('click', () => {
          root.GameAudio.init();
          root.GameAudio.playPickup();
          this.startStage(idx);
        });

        grid.appendChild(card);
      });
    }

    startStage(stageIndex, blueprintToRestore) {
      root.GameAudio.stopEngine();
      this.dom.toastContainer.innerHTML = '';
      this._cancelActiveDrag(false);

      this.stageIndex = stageIndex;
      this.stage = root.GameData.STAGES[stageIndex];
      this.manifest = this.stage.cargoManifest.map((typeId, idx) => ({
        id: `cargo_${idx}`,
        typeId,
        spec: root.GameData.CARGO_TYPES[typeId],
        index: idx
      }));

      if (!blueprintToRestore) {
        this.savedBlueprint = null;
      }

      this.sim = new root.GamePhysics.PhysicsSimulation(this.stage, this._createSimCallbacks());
      this.phase = 'LOADING';
      this.allDroppedNotified = false;
      this.damageFeedbackCooldown.clear();

      this.uiState.ropeMode = false;
      this.uiState.selectedHookId = null;
      this.uiState.hoveredCargoId = null;
      this.uiState.selectedCargoId = null;
      this.uiState.dragGhost = null;
      this.renderer.setDriverMood('normal', 0);

      if (blueprintToRestore) {
        this._applyBlueprintToSim(blueprintToRestore);
      }

      // Snap camera smoothly near truck
      const tpos = this.sim.truck.chassis.getPosition();
      this.renderer.camX = tpos.x - 0.15;
      this.renderer.camY = tpos.y + 0.68;

      // Update Top Bar & Screens
      this.dom.hudStageCode.textContent = this.stage.code;
      this.dom.hudStageName.textContent = this.stage.name;
      this.dom.topBar.classList.remove('hidden');
      this.dom.driveProgressWrap.classList.add('hidden');
      this.dom.btnQuickRetryDrive.classList.add('hidden');
      this.dom.btnBackToLoad.classList.add('hidden');

      this.dom.titleScreen.classList.add('hidden');
      this.dom.drivingUI.classList.add('hidden');
      this.dom.goalBanner.classList.add('hidden');
      this.dom.settlementScreen.classList.add('hidden');
      this.dom.leftBehindModal.classList.add('hidden');
      this.dom.loadingUI.classList.remove('hidden');

      this._renderCargoDockCards();
      this._refreshRopeControls();
      this._updateLoadingMetricsUI();
      this._updateItemHintBox(null);
    }

    _createSimCallbacks() {
      return {
        onCargoDamage: (item, dmg, reason, worldPos) => {
          if (this.phase !== 'DRIVING') return;
          const now = this.sim.time;
          const lastT = this.damageFeedbackCooldown.get(item.id) || -10;

          if (item.broken) {
            this.damageFeedbackCooldown.set(item.id, now);
            root.GameAudio.playImpact(item.spec.soundType, 35);
            this.renderer.triggerShake(9, 0.32);
            this.renderer.setDriverMood('panic', 1.4);
            this.renderer.spawnBurst(worldPos.x, worldPos.y, '#ef4444', 16);
            this.renderer.addPopup(
              worldPos.x,
              worldPos.y + 0.35,
              `💥 ${item.spec.shortName} 大破! -¥${item.spec.liability.toLocaleString()}`,
              '#fca5a5',
              1.12
            );
            this.showToast(`💥 ${item.spec.name}が大破！弁償 -¥${item.spec.liability.toLocaleString()}`);
            this._refreshDrivingHUD();
            return;
          }

          if (dmg >= 2.2 && now - lastT > 0.34) {
            this.damageFeedbackCooldown.set(item.id, now);
            root.GameAudio.playImpact(item.spec.soundType, dmg);
            this.renderer.setDriverMood('panic', 0.9);
            if (dmg >= 5.0) {
              this.renderer.triggerShake(Math.min(6.5, 2.0 + dmg * 0.16), 0.16);
              this.renderer.spawnBurst(worldPos.x, worldPos.y, '#fde047', 6);
            }
            const tag = reason === 'crush' ? '重み潰れ!' : reason === 'tilt' ? '横倒し!' : '衝撃!';
            this.renderer.addPopup(
              worldPos.x,
              worldPos.y + 0.26,
              `${tag} -${Math.max(1, Math.round(dmg))}%`,
              '#fde047',
              0.92
            );
          }
        },

        onCargoDropped: (item, worldPos) => {
          if (this.phase !== 'DRIVING') return;
          root.GameAudio.playDrop();
          this.renderer.triggerShake(11, 0.36);
          this.renderer.setDriverMood('panic', 1.6);
          this.renderer.spawnBurst(worldPos.x, worldPos.y + 0.2, '#ef4444', 20);
          this.renderer.addPopup(
            worldPos.x,
            worldPos.y + 0.45,
            `😱 ${item.spec.shortName} 落下!! -¥${item.spec.liability.toLocaleString()}`,
            '#f87171',
            1.18
          );
          this.showToast(`😱 ${item.spec.name}が落下！弁償 -¥${item.spec.liability.toLocaleString()}`);
          this._refreshDrivingHUD();

          const remaining = this.sim.cargoItems.filter((c) => !c.dropped).length;
          if (remaining === 0 && !this.allDroppedNotified) {
            this.allDroppedNotified = true;
            this.showToast('⚠ 積荷が全て落下しました！上部の「🔄 再走行」「📦 積み直し」も使えます');
          }
        },

        onRopeSnap: (rope, worldPos) => {
          root.GameAudio.playRopeSnap();
          this.renderer.triggerShake(7, 0.24);
          this.renderer.setDriverMood('panic', 1.2);
          this.renderer.spawnBurst(worldPos.x, worldPos.y, '#facc15', 14);
          this.renderer.addPopup(worldPos.x, worldPos.y + 0.28, '🪢 ロープ破断!!', '#fb923c', 1.08);
          this.showToast('⚠ 強い衝撃で荷締めロープが切れた！段差では減速しよう！');
        },

        onLoadingItemFellOff: (item) => {
          if (this.phase !== 'LOADING') return;
          const wp = item.body ? item.body.getPosition() : { x: 2.0, y: 1.5 };
          const pos = { x: wp.x, y: wp.y };
          this.sim.removeCargoItem(item.id);
          this.sim.refitRopesForLoading();
          if (this.uiState.selectedCargoId === item.id) {
            this.uiState.selectedCargoId = null;
          }
          root.GameAudio.playPickup();
          this.renderer.addPopup(pos.x, pos.y + 0.4, `${item.spec.shortName} を一覧へ戻しました`, '#fde047', 0.92);
          this.showToast(`📦 ${item.spec.shortName}が荷台からこぼれたため一覧に戻しました`);
          this._renderCargoDockCards();
          this._updateLoadingMetricsUI();
        },

        onReachGoal: () => {
          this._onReachGoal();
        }
      };
    }

    _capturePackingBlueprint() {
      if (!this.sim) return null;
      const chassis = this.sim.truck.chassis;
      const items = [];
      for (const item of this.sim.cargoItems) {
        if (item.dropped || item.isDragging || !item.body) continue;
        const lp = chassis.getLocalPoint(item.body.getPosition());
        const la = root.GamePhysics.wrapAngle(item.body.getAngle() - chassis.getAngle());
        items.push({
          id: item.id,
          typeId: item.typeId,
          lx: lp.x,
          ly: lp.y,
          localAngle: la
        });
      }
      const ropes = this.sim.ropes
        .filter((r) => !r.snapped)
        .map((r) => ({ hookA: r.hookA, hookB: r.hookB }));

      return { items, ropes };
    }

    _applyBlueprintToSim(blueprint) {
      if (!blueprint || !this.sim) return;
      const chassis = this.sim.truck.chassis;
      const pl = this.sim.pl;

      // Sort bottom-to-top so lower items exist first
      const sorted = [...blueprint.items].sort((a, b) => a.ly - b.ly);
      for (const entry of sorted) {
        const wp = chassis.getWorldPoint(pl.Vec2(entry.lx, entry.ly));
        const ang = entry.localAngle + chassis.getAngle();
        this.sim.addCargoItem(entry.id, entry.typeId, wp.x, wp.y, ang);
      }

      // Gently settle a few frames with zero initial velocity
      for (let i = 0; i < 12; i++) {
        this.sim.step(1 / 60);
      }
      for (const item of this.sim.cargoItems) {
        if (item.body) {
          item.body.setLinearVelocity(pl.Vec2(0, 0));
          item.body.setAngularVelocity(0);
        }
      }

      this.sim.clearRopes();
      for (const r of blueprint.ropes) {
        this.sim.addRope(r.hookA, r.hookB);
      }
      this.sim.refitRopesForLoading();
    }

    returnToLoadingFromBlueprint() {
      this.startStage(this.stageIndex, this.savedBlueprint);
      this.showToast('📦 出発前の積み込み状態に戻しました。手直しできます！');
    }

    retryDriveWithSavedBlueprint() {
      if (!this.savedBlueprint || this.savedBlueprint.items.length === 0) {
        this.startStage(this.stageIndex, null);
        return;
      }
      this.startStage(this.stageIndex, this.savedBlueprint);
      this.beginDrivingPhase();
      this.showToast('🔄 同じ積み方でスタート地点から再出発！');
    }

    // ==================== PHASE 1: LOADING LOGIC ====================

    _renderCargoDockCards() {
      const list = this.dom.cargoCardsList;
      list.innerHTML = '';

      const loadedIds = new Set(
        this.sim.cargoItems.filter((c) => !c.isDragging).map((c) => c.id)
      );

      for (const entry of this.manifest) {
        const isLoaded = loadedIds.has(entry.id);
        const isHeld = this.activeDrag && this.activeDrag.instanceId === entry.id;
        const isSelected = isHeld || (!this.activeDrag && this.uiState.selectedCargoId === entry.id);

        const card = document.createElement('div');
        card.className =
          'cargo-card' +
          (isLoaded ? ' loaded-card' : '') +
          (isSelected ? ' selected-card' : '');
        card.dataset.instanceId = entry.id;

        let tagClass = '';
        let tagText = entry.spec.badges[0] || '';
        if (entry.spec.category === 'fragile' || entry.spec.category === 'delicate') {
          tagClass = 'tag-fragile';
        } else if (entry.spec.category === 'heavy') {
          tagClass = 'tag-heavy';
        } else if (entry.spec.category === 'cushion') {
          tagClass = 'tag-cushion';
        }

        const metaText = isLoaded
          ? '積載済 ✓ (移動)'
          : `${entry.spec.mass}kg / ¥${(entry.spec.fee / 1000).toFixed(1)}k`;

        card.innerHTML = `
          <span class="cargo-tag-pill ${tagClass}">${tagText}</span>
          <canvas width="104" height="92"></canvas>
          <div class="cargo-card-name" title="${entry.spec.name}">${entry.spec.shortName}</div>
          <div class="cargo-card-meta">${metaText}</div>
        `;

        const thumbCanvas = card.querySelector('canvas');
        root.GameRenderer.renderCargoThumbnail(thumbCanvas, entry.typeId);

        card.addEventListener('pointerenter', () => {
          if (!this.activeDrag) {
            this._updateItemHintBox(entry.spec);
            if (isLoaded) {
              this.uiState.hoveredCargoId = entry.id;
            }
          }
        });

        card.addEventListener('pointerleave', () => {
          if (this.uiState.hoveredCargoId === entry.id) {
            this.uiState.hoveredCargoId = null;
          }
        });

        card.addEventListener('pointerdown', (e) => {
          if (e.button !== undefined && e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          root.GameAudio.init();
          this._onManifestCardPointerDown(entry, isLoaded, e);
        });

        list.appendChild(card);
      }
    }

    _updateItemHintBox(spec) {
      if (!spec) {
        this.dom.itemHintBox.innerHTML =
          '💡 <strong>操作方法：</strong>下の荷物カードを荷台の枠内へ<strong>ドラッグ</strong>（またはクリックで掴んでクリック配置）。<kbd>R</kbd>キーやボタンで回転できます！';
        return;
      }

      const badges = (spec.badges || []).map((b) => `【${b}】`).join(' ');
      this.dom.itemHintBox.innerHTML = `
        <strong>${spec.name}</strong> <span style="color:#ffd12e">${badges}</span><br/>
        重量 <strong>${spec.mass}kg</strong> ／ 報酬 <strong>${formatYen(spec.fee)}</strong> ／ 破損弁償 <strong style="color:#fca5a5">${formatYen(spec.liability)}</strong><br/>
        <span>💡 ${spec.hint}</span>
      `;
    }

    _refreshRopeControls() {
      if (!this.sim) return;
      const activeCount = this.sim.ropes.filter((r) => !r.snapped).length;
      const maxRopes = this.stage.ropeAllowance || 2;
      this.dom.ropeCountBadge.textContent = `${activeCount}/${maxRopes}`;
      this.dom.btnRopeMode.classList.toggle('active-mode', this.uiState.ropeMode);
      this.dom.btnClearRopes.classList.toggle('hidden', activeCount === 0);
    }

    toggleRopeMode(forceState) {
      if (this.phase !== 'LOADING' || !this.sim) return;
      this._cancelActiveDrag(true);

      const next = typeof forceState === 'boolean' ? forceState : !this.uiState.ropeMode;
      const activeCount = this.sim.ropes.filter((r) => !r.snapped).length;
      if (next && activeCount >= (this.stage.ropeAllowance || 2)) {
        this.showToast(`🪢 ロープは最大 ${this.stage.ropeAllowance} 本までです（「ロープ解除」で張り直せます）`);
        this.uiState.ropeMode = false;
        this.uiState.selectedHookId = null;
        this._refreshRopeControls();
        return;
      }

      this.uiState.ropeMode = next;
      this.uiState.selectedHookId = null;
      this._refreshRopeControls();

      if (next) {
        this.showToast('🪢 荷台の黄色いフックを2箇所クリックしてロープを結ぼう！');
      }
    }

    applyAutoRope() {
      if (this.phase !== 'LOADING' || !this.sim) return;
      this._cancelActiveDrag(true);
      this.uiState.ropeMode = false;
      this.uiState.selectedHookId = null;

      const loadedItems = this.sim.cargoItems.filter((c) => !c.isDragging && !c.dropped);
      if (loadedItems.length === 0) {
        this.showToast('📦 先に荷物を荷台に積んでからロープを掛けよう！');
        this._refreshRopeControls();
        return;
      }

      const maxRopes = this.stage.ropeAllowance || 2;
      const activeRopes = this.sim.ropes.filter((r) => !r.snapped);
      if (activeRopes.length >= maxRopes) {
        this.sim.refitRopesForLoading();
        root.GameAudio.playRopeTie();
        this._refreshRopeControls();
        this.showToast('🪢 現在の荷山に合わせてロープを締め直しました！');
        return;
      }

      // Candidate pairs ordered by effectiveness
      const pairs = [
        [0, 3], // 鳥居・上 <-> 後部あおり (full pile wrap)
        [1, 3], // 鳥居・中 <-> 後部あおり (mid-height lock)
        [0, 2]  // 鳥居・上 <-> 荷台中央 (front heavy lock)
      ];

      let added = null;
      for (const [hA, hB] of pairs) {
        const dup = activeRopes.some(
          (r) => (r.hookA === hA && r.hookB === hB) || (r.hookA === hB && r.hookB === hA)
        );
        if (!dup) {
          added = this.sim.addRope(hA, hB);
          if (added) break;
        }
      }

      if (added) {
        root.GameAudio.playRopeTie();
        const wA = this.sim.getHookWorldPoint(added.hookA);
        const wB = this.sim.getHookWorldPoint(added.hookB);
        this.renderer.spawnBurst(wA.x, wA.y, '#facc15', 8);
        this.renderer.spawnBurst(wB.x, wB.y, '#facc15', 8);
        this._refreshRopeControls();
        this.showToast('⚡ 荷山全体に荷締めロープをガッチリ掛けました！');
      }
    }

    resetAllCargoOnBed() {
      if (this.phase !== 'LOADING' || !this.sim) return;
      this._cancelActiveDrag(false);
      this.uiState.ropeMode = false;
      this.uiState.selectedHookId = null;
      this.uiState.selectedCargoId = null;

      const ids = this.sim.cargoItems.map((c) => c.id);
      for (const id of ids) {
        this.sim.removeCargoItem(id);
      }
      this.sim.clearRopes();
      root.GameAudio.playPickup();
      this._renderCargoDockCards();
      this._refreshRopeControls();
      this._updateLoadingMetricsUI();
      this.showToast('🗑 荷台の荷物をすべて下ろしました');
    }

    _updateLoadingMetricsUI() {
      if (!this.sim || this.phase !== 'LOADING') return;

      const loadedItems = this.sim.cargoItems.filter((c) => !c.isDragging && !c.dropped);
      const loadedCount = loadedItems.length;
      const totalCount = this.manifest.length;

      this.dom.loadCountBadge.textContent = `${loadedCount} / ${totalCount} 個`;

      const metrics = this.sim.computePackingMetrics();
      this.dom.totalMassText.textContent = `${metrics.cargoMass} kg`;

      if (loadedCount === 0) {
        this.dom.stabilityBarFill.style.width = '0%';
        this.dom.stabilityScoreText.textContent = '--';
        this.dom.stabilityLabel.textContent = '下の荷物を選んで荷台へ積もう';
        this.dom.maxPayoutPreview.textContent = '¥0';
        this.dom.btnStartDrive.disabled = true;
        this.dom.departSubText.textContent = '荷物を1つ以上積もう';
        return;
      }

      this.dom.stabilityBarFill.style.width = `${metrics.stabilityScore}%`;
      this.dom.stabilityBarFill.style.background =
        metrics.status === 'good' ? '#16a34a' : metrics.status === 'warn' ? '#f59e0b' : '#dc2626';
      this.dom.stabilityScoreText.textContent = `${metrics.stabilityScore}点`;
      this.dom.stabilityLabel.textContent = metrics.label;

      // Estimate max payout with current loaded set (assuming intact arrival at target time)
      const est = this.sim.computeSettlement(this.manifest, { ignoreEarlyBonus: true });
      this.dom.maxPayoutPreview.textContent = formatYen(est.finalPayout);

      this.dom.btnStartDrive.disabled = false;
      if (loadedCount === totalCount) {
        this.dom.departSubText.textContent = '全荷物積載！一発ボーナス対象★';
      } else {
        this.dom.departSubText.textContent = `残り ${totalCount - loadedCount} 個（このまま出発も可）`;
      }
    }

    // ==================== SMART DRAG / CLICK-TO-PLACE / ROTATION ====================

    _getCanvasLogicalCoords(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        sx: clientX - rect.left,
        sy: clientY - rect.top
      };
    }

    _resolveSmartPlacement(spec, rawWX, rawWY, angleRad, ignoreInstanceId, maxLiftOverride) {
      const sim = this.sim;
      const pl = sim.pl;
      const chassis = sim.truck.chassis;
      const lp = chassis.getLocalPoint(pl.Vec2(rawWX, rawWY));

      // Outside broad region around truck bed -> out_of_zone
      if (lp.x < -1.68 || lp.x > 1.15 || lp.y < -0.18 || lp.y > 2.55) {
        return {
          wx: rawWX,
          wy: rawWY,
          angle: angleRad,
          spec,
          valid: false,
          reason: 'out_of_zone'
        };
      }

      // Softly clamp center into loading zone bounds
      const clampedLX = Math.max(-1.38, Math.min(0.82, lp.x));
      const clampedLY = Math.max(0.16, Math.min(2.30, lp.y));
      const clampedW = chassis.getWorldPoint(pl.Vec2(clampedLX, clampedLY));

      const direct = sim.checkPlacementOverlap(spec, clampedW.x, clampedW.y, angleRad, ignoreInstanceId);
      if (direct.valid) {
        return {
          wx: clampedW.x,
          wy: clampedW.y,
          angle: angleRad,
          spec,
          valid: true,
          reason: 'ok'
        };
      }

      // Surface & wall snap assist: search small local offsets upward & inward
      const maxLift = maxLiftOverride || 0.44;
      const dxOffsets = [0, -0.04, 0.04, -0.09, 0.09, -0.15, 0.15, -0.22, 0.22];
      let bestCandidate = null;
      let bestCost = Infinity;

      for (let dy = 0; dy <= maxLift + 1e-4; dy += 0.025) {
        const testLY = clampedLY + dy;
        if (testLY > 2.34) break;
        for (const dx of dxOffsets) {
          const testLX = clampedLX + dx;
          if (testLX < -1.40 || testLX > 0.84) continue;
          const cost = Math.hypot(dx * 1.25, dy);
          if (cost >= bestCost) continue;

          const tw = chassis.getWorldPoint(pl.Vec2(testLX, testLY));
          const chk = sim.checkPlacementOverlap(spec, tw.x, tw.y, angleRad, ignoreInstanceId);
          if (chk.valid) {
            bestCost = cost;
            bestCandidate = { wx: tw.x, wy: tw.y, angle: angleRad, spec, valid: true, reason: 'ok' };
          }
        }
        // Early exit once we found a very tight snap right at the surface
        if (bestCandidate && bestCost <= dy + 0.05) break;
      }

      if (bestCandidate) {
        return bestCandidate;
      }

      return {
        wx: clampedW.x,
        wy: clampedW.y,
        angle: angleRad,
        spec,
        valid: false,
        reason: direct.reason
      };
    }

    _findCargoAtWorldPoint(wx, wy) {
      if (!this.sim) return null;
      const pl = this.sim.pl;
      const queryVec = pl.Vec2(wx, wy);

      // Iterate reverse so most recently placed / foreground item wins
      for (let i = this.sim.cargoItems.length - 1; i >= 0; i--) {
        const item = this.sim.cargoItems[i];
        if (!item.body || item.isDragging || item.dropped) continue;
        const localPt = item.body.getLocalPoint(queryVec);
        for (const poly of item.localPolys) {
          if (pointInPolygon(localPt.x, localPt.y, poly)) {
            return item;
          }
        }
      }
      return null;
    }

    _findHookAtScreenPoint(sx, sy) {
      if (!this.sim) return null;
      const hooks = root.GamePhysics.TRUCK_SPEC.hooks;
      let bestHook = null;
      let bestDist = 26; // Forgiving 26px click radius
      for (const h of hooks) {
        const wp = this.sim.getHookWorldPoint(h.id);
        const sp = this.renderer.worldToScreen(wp.x, wp.y);
        const d = Math.hypot(sp.x - sx, sp.y - sy);
        if (d < bestDist) {
          bestDist = d;
          bestHook = h;
        }
      }
      return bestHook;
    }

    _onManifestCardPointerDown(entry, isLoaded, e) {
      if (this.phase !== 'LOADING' || !this.sim) return;

      if (this.uiState.ropeMode) {
        this.uiState.ropeMode = false;
        this.uiState.selectedHookId = null;
        this._refreshRopeControls();
      }

      // If already holding this exact item in sticky mode and clicking its card again -> put back in dock!
      if (this.activeDrag && this.activeDrag.instanceId === entry.id) {
        this._unloadActiveDragToDock();
        return;
      }

      // Cancel any other active drag cleanly first
      if (this.activeDrag) {
        this._cancelActiveDrag(true);
      }

      const { sx, sy } = this._getCanvasLogicalCoords(e.clientX, e.clientY);
      const wp = this.renderer.screenToWorld(sx, sy);

      let initialAngle = 0;
      let prevBedTransform = null;

      if (isLoaded) {
        const itemOnBed = this.sim.getCargoItem(entry.id);
        if (itemOnBed && itemOnBed.body) {
          const bPos = itemOnBed.body.getPosition();
          initialAngle = itemOnBed.body.getAngle();
          prevBedTransform = { wx: bPos.x, wy: bPos.y, angle: initialAngle };
          itemOnBed.isDragging = true;
          itemOnBed.body.setActive(false);
        }
      }

      this.activeDrag = {
        instanceId: entry.id,
        typeId: entry.typeId,
        spec: entry.spec,
        angle: initialAngle,
        fromBed: isLoaded,
        prevBedTransform,
        startSX: sx,
        startSY: sy,
        moved: false,
        sticky: false
      };

      this.uiState.selectedCargoId = entry.id;
      this.uiState.dragGhost = this._resolveSmartPlacement(entry.spec, wp.x, wp.y, initialAngle, entry.id);
      root.GameAudio.playPickup();
      this._updateItemHintBox(entry.spec);
      this._renderCargoDockCards();
      this._updateLoadingMetricsUI();
    }

    _onCanvasPointerDown(e) {
      if (this.phase !== 'LOADING' || !this.sim) return;
      if (e.button !== undefined && e.button !== 0) return;

      const { sx, sy } = this._getCanvasLogicalCoords(e.clientX, e.clientY);
      const wp = this.renderer.screenToWorld(sx, sy);
      this.uiState.pointerWorld = wp;

      // 1. Rope Mode Hook Selection
      if (this.uiState.ropeMode) {
        const hook = this._findHookAtScreenPoint(sx, sy);
        if (!hook) {
          // Clicking empty area deselects first hook
          this.uiState.selectedHookId = null;
          return;
        }

        if (this.uiState.selectedHookId === null) {
          this.uiState.selectedHookId = hook.id;
          root.GameAudio.playPickup();
          return;
        }

        if (this.uiState.selectedHookId === hook.id) {
          this.uiState.selectedHookId = null;
          return;
        }

        const rope = this.sim.addRope(this.uiState.selectedHookId, hook.id);
        this.uiState.selectedHookId = null;
        if (rope) {
          root.GameAudio.playRopeTie();
          const wA = this.sim.getHookWorldPoint(rope.hookA);
          const wB = this.sim.getHookWorldPoint(rope.hookB);
          this.renderer.spawnBurst(wA.x, wA.y, '#facc15', 8);
          this.renderer.spawnBurst(wB.x, wB.y, '#facc15', 8);

          const activeCount = this.sim.ropes.filter((r) => !r.snapped).length;
          if (activeCount >= (this.stage.ropeAllowance || 2)) {
            this.uiState.ropeMode = false;
            this.showToast('🪢 ロープをしっかり固定しました！');
          } else {
            this.showToast(`🪢 ロープを結びました！（あと ${(this.stage.ropeAllowance || 2) - activeCount} 本可）`);
          }
          this._refreshRopeControls();
        }
        return;
      }

      // 2. If currently holding an item in sticky (click-to-place) mode -> attempt placement!
      if (this.activeDrag && this.activeDrag.sticky) {
        const ghost = this._resolveSmartPlacement(
          this.activeDrag.spec,
          wp.x,
          wp.y,
          this.activeDrag.angle,
          this.activeDrag.instanceId
        );
        this.uiState.dragGhost = ghost;
        if (ghost.valid) {
          this._commitActiveDragPlacement(ghost);
        } else {
          this.showToast(
            ghost.reason === 'out_of_zone'
              ? '⚠ 点線の荷台エリア内に配置してください'
              : '⚠ 他の荷物や車体と重ならない位置へずらしてください'
          );
        }
        return;
      }

      // 3. Otherwise check if clicking an existing cargo item on the truck bed!
      const hitItem = this._findCargoAtWorldPoint(wp.x, wp.y);
      if (hitItem) {
        const bPos = hitItem.body.getPosition();
        const bAng = hitItem.body.getAngle();
        hitItem.isDragging = true;
        hitItem.body.setActive(false);

        this.activeDrag = {
          instanceId: hitItem.id,
          typeId: hitItem.typeId,
          spec: hitItem.spec,
          angle: bAng,
          fromBed: true,
          prevBedTransform: { wx: bPos.x, wy: bPos.y, angle: bAng },
          startSX: sx,
          startSY: sy,
          moved: false,
          sticky: false
        };
        this.uiState.selectedCargoId = hitItem.id;
        this.uiState.hoveredCargoId = null;
        this.uiState.dragGhost = this._resolveSmartPlacement(hitItem.spec, wp.x, wp.y, bAng, hitItem.id);
        root.GameAudio.playPickup();
        this._updateItemHintBox(hitItem.spec);
        this._renderCargoDockCards();
        this._updateLoadingMetricsUI();
      } else {
        this.uiState.selectedCargoId = null;
        this._renderCargoDockCards();
      }
    }

    _onGlobalPointerMove(e) {
      if (this.phase !== 'LOADING' || !this.sim) return;

      const { sx, sy } = this._getCanvasLogicalCoords(e.clientX, e.clientY);
      const wp = this.renderer.screenToWorld(sx, sy);
      this.uiState.pointerWorld = wp;

      if (this.activeDrag) {
        const distPx = Math.hypot(sx - this.activeDrag.startSX, sy - this.activeDrag.startSY);
        if (distPx > 9) {
          this.activeDrag.moved = true;
        }
        this.uiState.dragGhost = this._resolveSmartPlacement(
          this.activeDrag.spec,
          wp.x,
          wp.y,
          this.activeDrag.angle,
          this.activeDrag.instanceId
        );
        return;
      }

      // Hover highlight on bed cargo
      if (!this.uiState.ropeMode) {
        const hit = this._findCargoAtWorldPoint(wp.x, wp.y);
        this.uiState.hoveredCargoId = hit ? hit.id : null;
        this.canvas.style.cursor = hit ? 'grab' : 'default';
      } else {
        const hook = this._findHookAtScreenPoint(sx, sy);
        this.canvas.style.cursor = hook ? 'pointer' : 'crosshair';
      }
    }

    _onGlobalPointerUp(e) {
      if (this.phase !== 'LOADING' || !this.sim || !this.activeDrag) return;
      if (this.activeDrag.sticky) return; // Handled on next pointerdown

      const { sx, sy } = this._getCanvasLogicalCoords(e.clientX, e.clientY);
      const wp = this.renderer.screenToWorld(sx, sy);
      const dockTopY = this.renderer.logicalHeight - 146;

      // If user clicked (barely moved) -> switch into sticky click-to-place mode!
      if (!this.activeDrag.moved) {
        // Wait: if user clicked a small item on the bed without moving, did they want to select it (to press R) or sticky-move it?
        // Sticky mode allows BOTH pressing R AND clicking where to put it! And if they click right where it already is, it places right back!
        this.activeDrag.sticky = true;
        this.uiState.dragGhost = this._resolveSmartPlacement(
          this.activeDrag.spec,
          wp.x,
          wp.y,
          this.activeDrag.angle,
          this.activeDrag.instanceId
        );
        return;
      }

      // User dragged and released!
      // If released down over the bottom cargo dock bar -> unload back to dock!
      if (sy >= dockTopY) {
        this._unloadActiveDragToDock();
        return;
      }

      const ghost = this._resolveSmartPlacement(
        this.activeDrag.spec,
        wp.x,
        wp.y,
        this.activeDrag.angle,
        this.activeDrag.instanceId
      );

      if (ghost.valid) {
        this._commitActiveDragPlacement(ghost);
      } else if (this.activeDrag.fromBed && ghost.reason === 'out_of_zone') {
        // Dragged from truck bed clearly outside the loading zone -> unload back to dock!
        this._unloadActiveDragToDock();
      } else {
        // Released on an overlapping invalid spot -> restore previous bed position or return to dock
        this._cancelActiveDrag(true);
        this.showToast('⚠ 他の荷物や車体と重ならない場所へ置いてください');
      }
    }

    _commitActiveDragPlacement(ghost) {
      if (!this.activeDrag || !this.sim) return;
      const { instanceId, typeId, spec } = this.activeDrag;

      this.sim.addCargoItem(instanceId, typeId, ghost.wx, ghost.wy, ghost.angle);
      this.sim.refitRopesForLoading();

      this.activeDrag = null;
      this.uiState.dragGhost = null;
      this.uiState.selectedCargoId = instanceId;

      root.GameAudio.playPlace(spec.soundType);
      this.renderer.spawnBurst(ghost.wx, ghost.wy, '#f8fafc', 5);

      this._renderCargoDockCards();
      this._refreshRopeControls();
      this._updateLoadingMetricsUI();
    }

    _unloadActiveDragToDock() {
      if (!this.activeDrag || !this.sim) return;
      const { instanceId, spec } = this.activeDrag;
      this.sim.removeCargoItem(instanceId);
      this.sim.refitRopesForLoading();

      this.activeDrag = null;
      this.uiState.dragGhost = null;
      if (this.uiState.selectedCargoId === instanceId) {
        this.uiState.selectedCargoId = null;
      }

      root.GameAudio.playPickup();
      this._renderCargoDockCards();
      this._refreshRopeControls();
      this._updateLoadingMetricsUI();
      this.showToast(`📦 ${spec.shortName} を一覧へ戻しました`);
    }

    _cancelActiveDrag(restoreIfFromBed) {
      if (!this.activeDrag || !this.sim) {
        this.activeDrag = null;
        this.uiState.dragGhost = null;
        return;
      }

      const drag = this.activeDrag;
      this.activeDrag = null;
      this.uiState.dragGhost = null;

      if (restoreIfFromBed && drag.fromBed && drag.prevBedTransform) {
        this.sim.addCargoItem(
          drag.instanceId,
          drag.typeId,
          drag.prevBedTransform.wx,
          drag.prevBedTransform.wy,
          drag.prevBedTransform.angle
        );
        this.sim.refitRopesForLoading();
      } else {
        this.sim.removeCargoItem(drag.instanceId);
        this.sim.refitRopesForLoading();
      }

      this._renderCargoDockCards();
      this._updateLoadingMetricsUI();
    }

    rotateCargo(deltaRad) {
      if (this.phase !== 'LOADING' || !this.sim) return;

      // Case 1: Actively dragging or holding an item in sticky mode
      if (this.activeDrag) {
        this.activeDrag.angle = root.GamePhysics.wrapAngle(this.activeDrag.angle + deltaRad);
        const pw = this.uiState.pointerWorld || { x: 2.2, y: 1.4 };
        this.uiState.dragGhost = this._resolveSmartPlacement(
          this.activeDrag.spec,
          pw.x,
          pw.y,
          this.activeDrag.angle,
          this.activeDrag.instanceId
        );
        root.GameAudio.playRotate();
        return;
      }

      // Case 2: Rotate selected (or most recently placed) cargo item on the truck bed
      let targetItem = this.uiState.selectedCargoId
        ? this.sim.getCargoItem(this.uiState.selectedCargoId)
        : null;
      if (!targetItem && this.sim.cargoItems.length > 0) {
        targetItem = this.sim.cargoItems[this.sim.cargoItems.length - 1];
      }

      if (!targetItem || !targetItem.body) {
        this.showToast('💡 先に荷物を掴むか、荷台の荷物を選んでから回転してください');
        return;
      }

      const pos = targetItem.body.getPosition();
      const nextAngle = root.GamePhysics.wrapAngle(targetItem.body.getAngle() + deltaRad);
      const snap = this._resolveSmartPlacement(
        targetItem.spec,
        pos.x,
        pos.y + 0.05,
        nextAngle,
        targetItem.id,
        0.68
      );

      if (snap.valid) {
        this.sim.addCargoItem(targetItem.id, targetItem.typeId, snap.wx, snap.wy, nextAngle);
        this.sim.refitRopesForLoading();
        this.uiState.selectedCargoId = targetItem.id;
        root.GameAudio.playRotate();
        this._renderCargoDockCards();
        this._updateLoadingMetricsUI();
      } else {
        this.showToast('⚠ 周囲が狭くて回転できません。一度持ち上げて広い場所で回転しよう！');
      }
    }

    // ==================== DEPARTURE & PHASE 2: DRIVING ====================

    requestStartDriving() {
      if (this.phase !== 'LOADING' || !this.sim) return;
      this._cancelActiveDrag(true);

      const loadedCount = this.sim.cargoItems.filter((c) => !c.dropped && !c.isDragging).length;
      if (loadedCount === 0) {
        this.showToast('📦 荷物を1つ以上積んでから出発してください！');
        return;
      }

      const leftBehind = this.manifest.length - loadedCount;
      if (leftBehind > 0) {
        this.dom.leftBehindModalText.textContent = `まだ積んでいない荷物が ${leftBehind} 個あります。積み残した分には精算時に「別便手配料」がかかり、一発完遂ボーナスも対象外になります。このまま出発しますか？`;
        this.dom.leftBehindModal.classList.remove('hidden');
        return;
      }

      this.beginDrivingPhase();
    }

    beginDrivingPhase() {
      if (!this.sim) return;
      this._cancelActiveDrag(true);
      this.uiState.ropeMode = false;
      this.uiState.selectedHookId = null;
      this.uiState.hoveredCargoId = null;

      // Save packing blueprint for instant retry / repack!
      this.savedBlueprint = this._capturePackingBlueprint();

      this.phase = 'DRIVING';
      this.allDroppedNotified = false;
      this.damageFeedbackCooldown.clear();
      this.sim.startDriving();

      root.GameAudio.playHorn();
      root.GameAudio.startEngine();

      this.dom.loadingUI.classList.add('hidden');
      this.dom.settlementScreen.classList.add('hidden');
      this.dom.goalBanner.classList.add('hidden');
      this.dom.drivingUI.classList.remove('hidden');
      this.dom.btnEmergencyRecover.classList.add('hidden');

      this.dom.driveProgressWrap.classList.remove('hidden');
      this.dom.btnQuickRetryDrive.classList.remove('hidden');
      this.dom.btnBackToLoad.classList.remove('hidden');
      this.dom.hudTargetTime.textContent = `目標 ${this.stage.targetTimeSec}s`;

      this._refreshDrivingHUD();
    }

    _syncDrivingControlsToSim() {
      if (!this.sim || this.phase !== 'DRIVING') return;

      const gasKey =
        this.keysDown.has('ArrowRight') ||
        this.keysDown.has('KeyD') ||
        this.keysDown.has('ArrowUp') ||
        this.keysDown.has('KeyW');
      const brakeKey =
        this.keysDown.has('ArrowLeft') ||
        this.keysDown.has('KeyA') ||
        this.keysDown.has('ArrowDown') ||
        this.keysDown.has('KeyS');
      const handbrakeKey = this.keysDown.has('Space');

      const gas = gasKey || this.pedalPointers.gas ? 1 : 0;
      const brake = brakeKey || this.pedalPointers.brake ? 1 : 0;
      const handbrake = handbrakeKey || this.pedalPointers.handbrake;

      this.sim.controls.throttle = gas;
      this.sim.controls.brake = brake;
      this.sim.controls.handbrake = handbrake;

      this.dom.pedalGas.classList.toggle('pressed', gas > 0);
      this.dom.pedalBrake.classList.toggle('pressed', brake > 0);
      this.dom.pedalHandbrake.classList.toggle('pressed', handbrake);

      const velX = this.sim.truck.chassis.getLinearVelocity().x;
      const slope = Math.sin(this.sim.truck.chassis.getAngle());
      root.GameAudio.updateEngine(velX, gas, slope);
    }

    _refreshDrivingHUD() {
      if (!this.sim) return;
      const chassis = this.sim.truck.chassis;
      const truckX = chassis.getPosition().x;
      const speedKmh = Math.round(Math.abs(chassis.getLinearVelocity().x) * 3.6);

      this.dom.hudSpeed.innerHTML = `${speedKmh} <small>km/h</small>`;
      this.dom.hudTimer.innerHTML = `${this.sim.driveTime.toFixed(1)}<small>s</small>`;

      // Course progress bar (startX = 2.5 -> stage.goalX)
      const span = Math.max(1, this.stage.goalX - 2.5);
      const pct = Math.max(0, Math.min(100, ((truckX - 2.5) / span) * 100));
      const remMeters = Math.max(0, Math.ceil(this.stage.goalX - truckX));
      this.dom.hudDistanceText.textContent = remMeters > 0 ? `残り ${remMeters}m` : '到着！';
      this.dom.hudProgressFill.style.width = `${pct.toFixed(1)}%`;
      this.dom.hudProgressTruck.style.left = `${pct.toFixed(1)}%`;

      // Live estimated settlement
      const liveSettle = this.sim.computeSettlement(this.manifest, { ignoreEarlyBonus: true });
      this.dom.hudLivePayout.textContent = formatYen(liveSettle.finalPayout);
      this.dom.hudLivePayout.style.color = liveSettle.finalPayout < 0 ? '#f87171' : '#ffd12e';

      // Emergency recovery button visibility
      this.dom.btnEmergencyRecover.classList.toggle('hidden', !this.sim.isTruckFlippedOrStuck());

      // Cargo condition mini-pills
      const placedMap = new Map(this.sim.cargoItems.map((c) => [c.id, c]));
      let pillsHtml = '';
      for (const entry of this.manifest) {
        const item = placedMap.get(entry.id);
        if (!item) continue;
        const hpPct = Math.round(Math.max(0, Math.min(100, (item.hp / item.maxHp) * 100)));
        let cls = '';
        let statusTxt = `${hpPct}%`;
        if (item.dropped) {
          cls = 'pill-bad';
          statusTxt = '落下!';
        } else if (item.broken || hpPct === 0) {
          cls = 'pill-bad';
          statusTxt = '大破!';
        } else if (hpPct < 96) {
          cls = hpPct < 65 ? 'pill-bad' : 'pill-warn';
        }
        pillsHtml += `<div class="cargo-mini-pill ${cls}">${entry.spec.shortName} ${statusTxt}</div>`;
      }
      this.dom.drivingCargoStrip.innerHTML = pillsHtml;
    }

    // ==================== GOAL & PHASE 3: SETTLEMENT ====================

    _onReachGoal() {
      if (this.phase !== 'DRIVING') return;
      this.phase = 'GOAL';
      this.goalTimer = 1.65;

      this.sim.controls.throttle = 0;
      this.sim.controls.brake = 1;
      this.sim.controls.handbrake = true;

      root.GameAudio.stopEngine();
      root.GameAudio.playGoal();
      this.renderer.setDriverMood('happy', 6.0);

      const tpos = this.sim.truck.chassis.getPosition();
      this.renderer.spawnBurst(tpos.x + 1.0, tpos.y + 1.8, '#fde047', 22);
      this.renderer.spawnBurst(tpos.x - 0.5, tpos.y + 2.0, '#38bdf8', 18);

      this._refreshDrivingHUD();
      this.dom.drivingUI.classList.add('hidden');
      this.dom.goalBanner.classList.remove('hidden');
    }

    _showSettlementScreen() {
      this.phase = 'SETTLEMENT';
      this.dom.toastContainer.innerHTML = '';
      this.dom.goalBanner.classList.add('hidden');
      this.dom.btnQuickRetryDrive.classList.add('hidden');
      this.dom.btnBackToLoad.classList.add('hidden');

      const result = this.sim.computeSettlement(this.manifest);

      // Persist best record
      const prev = this.records[this.stage.id];
      if (
        !prev ||
        result.finalPayout > prev.bestPayout ||
        (result.finalPayout === prev.bestPayout &&
          (RANK_ORDER[result.rank] || 0) > (RANK_ORDER[prev.bestRank] || 0))
      ) {
        this.records[this.stage.id] = {
          bestPayout: result.finalPayout,
          bestRank: result.rank
        };
        saveRecords(this.records);
      }

      // Stamp
      this.dom.invoiceStamp.className = `hanko-stamp rank-${result.rank.toLowerCase()}`;
      this.dom.stampRankChar.textContent = result.rank;
      this.dom.stampRankSub.textContent = RANK_STAMP_SUB[result.rank] || '精算印';
      root.GameAudio.playStamp(result.rank === 'S' || result.rank === 'A' || result.rank === 'B');

      // Header metadata
      this.dom.invStageName.textContent = result.stageName;
      this.dom.invClientName.textContent = `ご依頼主：${result.client}`;
      this.dom.invTimeText.textContent = `${result.driveTimeSec.toFixed(1)}秒`;
      this.dom.invTargetText.textContent = `(目標 ${result.targetTimeSec}秒)`;
      this.dom.invDeliveredCount.textContent = `${result.deliveredOnTruckCount} / ${result.totalManifest} 個`;

      // Itemized table
      this.dom.invItemsBody.innerHTML = result.lineItems
        .map((li) => {
          const feeStr = li.feeEarned > 0 ? `<span class="val-plus">${formatYen(li.feeEarned, true)}</span>` : '¥0';
          const dedStr = li.deduction > 0 ? `<span class="val-minus">-${formatYen(li.deduction)}</span>` : '¥0';
          const netCls = li.net > 0 ? 'val-plus' : li.net < 0 ? 'val-minus' : '';
          return `
            <tr>
              <td>${li.name}</td>
              <td><span class="status-chip status-${li.status}">${li.statusLabel}</span></td>
              <td class="num-col">${feeStr}</td>
              <td class="num-col">${dedStr}</td>
              <td class="num-col ${netCls}">${formatYen(li.net, li.net > 0)}</td>
            </tr>
          `;
        })
        .join('');

      // Diagnosis comments
      const comments = result.comments.length > 0
        ? result.comments
        : ['堅実な運転で新居までお届け完了しました！さらに高評価ランクを目指してみましょう！'];
      this.dom.invCommentsList.innerHTML = comments.map((c) => `<li>${c}</li>`).join('');

      // Totals
      this.dom.invBaseFee.textContent = formatYen(result.baseContractFee);
      this.dom.invCargoFee.textContent = formatYen(result.deliveredCargoFeeTotal);

      this.dom.invAllBonusRow.classList.toggle('hidden', result.allLoadedBonus <= 0);
      this.dom.invAllBonus.textContent = formatYen(result.allLoadedBonus, true);

      this.dom.invPerfectBonusRow.classList.toggle('hidden', result.perfectBonus <= 0);
      this.dom.invPerfectBonus.textContent = formatYen(result.perfectBonus, true);

      if (result.timeAdjustment >= 0) {
        this.dom.invTimeBonusLabel.textContent = '早着タイムボーナス';
        this.dom.invTimeBonus.textContent = formatYen(result.timeAdjustment, true);
        this.dom.invTimeBonus.className = result.timeAdjustment > 0 ? 'val-plus' : '';
      } else {
        this.dom.invTimeBonusLabel.textContent = '延着ペナルティ';
        this.dom.invTimeBonus.textContent = formatYen(result.timeAdjustment);
        this.dom.invTimeBonus.className = 'val-minus';
      }

      const nonTimeDeduct = result.damageDeductionTotal + result.leftBehindPenaltyTotal + (result.towFeeTotal || 0);
      this.dom.invDeductionRow.classList.toggle('deduct-row', nonTimeDeduct > 0);
      this.dom.invDeductions.textContent = nonTimeDeduct > 0 ? `-${formatYen(nonTimeDeduct)}` : '¥0';

      this.dom.invRankTitle.textContent = result.rankTitle;
      this.dom.invFinalPayout.textContent = formatYen(result.finalPayout);
      this.dom.invFinalPayout.classList.toggle('negative', result.finalPayout < 0);

      // Next stage button text
      if (this.stageIndex + 1 < root.GameData.STAGES.length) {
        this.dom.btnSettleNextStage.textContent = '🚚 次の依頼へ進む ▶';
      } else {
        this.dom.btnSettleNextStage.textContent = '🏆 依頼一覧へ戻る';
      }

      this.dom.settlementScreen.classList.remove('hidden');
    }

    // ==================== KEYBOARD & TOASTS ====================

    _onKeyDown(e) {
      if (!this.dom.helpModal.classList.contains('hidden')) {
        if (e.code === 'Escape') {
          this.dom.helpModal.classList.add('hidden');
        }
        return;
      }

      if (this.phase === 'LOADING') {
        if (e.code === 'KeyR') {
          e.preventDefault();
          this.rotateCargo(e.shiftKey ? -Math.PI / 2 : Math.PI / 2);
        } else if (e.code === 'KeyE') {
          e.preventDefault();
          this.rotateCargo(-Math.PI / 12);
        } else if (e.code === 'KeyQ') {
          e.preventDefault();
          this.rotateCargo(Math.PI / 12);
        } else if (e.code === 'Escape') {
          if (this.activeDrag) {
            this._cancelActiveDrag(true);
          } else if (this.uiState.ropeMode) {
            this.toggleRopeMode(false);
          }
        } else if (e.code === 'Backspace' || e.code === 'Delete') {
          if (this.activeDrag) {
            e.preventDefault();
            this._unloadActiveDragToDock();
          } else if (this.uiState.selectedCargoId) {
            e.preventDefault();
            const item = this.sim.getCargoItem(this.uiState.selectedCargoId);
            if (item) {
              this.sim.removeCargoItem(item.id);
              this.sim.refitRopesForLoading();
              this.uiState.selectedCargoId = null;
              root.GameAudio.playPickup();
              this._renderCargoDockCards();
              this._updateLoadingMetricsUI();
            }
          }
        } else if (e.code === 'Enter' && this.dom.leftBehindModal.classList.contains('hidden')) {
          if (!this.dom.btnStartDrive.disabled && !this.activeDrag) {
            this.requestStartDriving();
          }
        }
        return;
      }

      if (this.phase === 'DRIVING') {
        if (
          e.code === 'ArrowRight' ||
          e.code === 'ArrowLeft' ||
          e.code === 'ArrowUp' ||
          e.code === 'ArrowDown' ||
          e.code === 'Space'
        ) {
          e.preventDefault();
        }
        this.keysDown.add(e.code);

        if (e.code === 'KeyH' && !e.repeat) {
          root.GameAudio.playHorn();
          this.renderer.setDriverMood('happy', 0.8);
        } else if (e.code === 'KeyR' && !e.repeat) {
          this.retryDriveWithSavedBlueprint();
        }
      }
    }

    _onKeyUp(e) {
      this.keysDown.delete(e.code);
    }

    showToast(message) {
      const container = this.dom.toastContainer;
      while (container.children.length >= 3) {
        container.removeChild(container.firstChild);
      }
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      container.appendChild(toast);

      setTimeout(() => {
        if (toast.parentNode === container) {
          toast.style.opacity = '0';
          toast.style.transition = 'opacity 0.25s ease';
          setTimeout(() => {
            if (toast.parentNode === container) container.removeChild(toast);
          }, 260);
        }
      }, 2500);
    }

    // ==================== MAIN LOOP ====================

    _loop(now) {
      const rawDt = Math.max(0.001, Math.min(0.05, (now - this.lastFrameTime) / 1000));
      this.lastFrameTime = now;

      if (this.sim) {
        if (this.phase === 'DRIVING') {
          this._syncDrivingControlsToSim();
        }

        // Fixed-step physics accumulator feel (1 or 2 substeps depending on frame rate)
        const steps = rawDt > 0.024 ? 2 : 1;
        const subDt = rawDt / steps;
        for (let s = 0; s < steps; s++) {
          this.sim.step(subDt);
        }

        if (this.phase === 'LOADING') {
          this.hudRefreshAccum += rawDt;
          if (this.hudRefreshAccum >= 0.15) {
            this.hudRefreshAccum = 0;
            this._updateLoadingMetricsUI();
          }
        } else if (this.phase === 'DRIVING') {
          this.hudRefreshAccum += rawDt;
          if (this.hudRefreshAccum >= 0.08) {
            this.hudRefreshAccum = 0;
            this._refreshDrivingHUD();
          }
        } else if (this.phase === 'GOAL') {
          this.goalTimer -= rawDt;
          if (this.goalTimer <= 0) {
            this._showSettlementScreen();
          }
        }

        const renderMode =
          this.phase === 'LOADING' || this.phase === 'TITLE'
            ? 'LOADING'
            : this.phase === 'GOAL'
              ? 'GOAL'
              : 'DRIVING';
        this.renderer.updateEffects(rawDt, this.sim, renderMode);
        this.renderer.render(this.sim, this.uiState);
      }

      requestAnimationFrame(this._loop);
    }
  }

  function boot() {
    root.keitoraGame = new KeitoraMovingGame();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
