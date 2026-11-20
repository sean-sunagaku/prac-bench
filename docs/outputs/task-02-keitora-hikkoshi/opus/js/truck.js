/* 軽トラ本体（物理と描画）。
 * ローカル座標は「接地時の地面が y=0、前後輪の中間が x=0」。右向きが前。
 * 寸法は実車（全長3.4m・荷台長1.94m・あおり高29cm 前後）に寄せている。
 */
(function (root) {
  'use strict';
  const KT = (root.KT = root.KT || {});
  const C = KT.C;
  const G = KT.G;

  const SPEC = {
    wheelR: 0.27,
    axleX: [-0.95, 0.95],
    axleY: 0.27,
    bedX0: -1.7,
    bedX1: 0.26,
    bedTop: 0.66,
    gateTop: 0.95,
    toriiTop: 1.8,
    cab: [[0.31, 0.48], [1.66, 0.48], [1.72, 0.6], [1.72, 1.0], [1.4, 1.7], [0.31, 1.74]],
    chassisMass: 640,
    com: [0.25, 0.62],
    inertia: 760,
    wheelMass: 24,
    suspHz: 9.0,
    suspDamp: 1.0,
    driveTorque: 300, // 1輪あたり (N·m)
    brakeTorque: 600,
    idleTorque: 45,
    maxSpeed: 14.5, // m/s（約52km/h）
    reverseSpeed: 3.2,
  };
  KT.TRUCK_SPEC = SPEC;

  /** ロープを掛けられるフック（荷台まわり、ローカル座標） */
  const HOOKS = [
    { x: -1.665, y: 0.95, name: '後ろあおり' },
    { x: -1.42, y: 0.63, name: 'フック' },
    { x: -0.86, y: 0.63, name: 'フック' },
    { x: -0.3, y: 0.63, name: 'フック' },
    { x: 0.285, y: 1.24, name: '鳥居（中）' },
    { x: 0.285, y: 1.78, name: '鳥居（上）' },
  ];
  KT.TRUCK_HOOKS = HOOKS;

  class Truck {
    constructor(world, x, groundY) {
      const pl = planck;
      const V = pl.Vec2;
      this.world = world;
      this.spec = SPEC;
      const filterChassis = { filterCategoryBits: KT.CAT.TRUCK, filterMaskBits: KT.CAT.GROUND | KT.CAT.ITEM };
      const chassis = world.createBody({ type: 'dynamic', position: V(x, groundY), angle: 0 });
      chassis.setSleepingAllowed(false);
      const fx = (shape, part, friction = 0.6) =>
        chassis.createFixture(shape, Object.assign({ density: 1, friction, restitution: 0.02, userData: { kind: 'truck', part } }, filterChassis));
      // 荷台の床
      fx(pl.Box((SPEC.bedX1 + 0.05 - SPEC.bedX0) / 2, 0.04, V((SPEC.bedX0 + SPEC.bedX1 + 0.05) / 2, SPEC.bedTop - 0.04), 0), 'bed', 0.62);
      // 後ろあおり
      fx(pl.Box(0.025, (SPEC.gateTop - SPEC.bedTop) / 2, V(SPEC.bedX0 + 0.025, (SPEC.gateTop + SPEC.bedTop) / 2), 0), 'gate', 0.5);
      // 鳥居
      fx(pl.Box(0.025, (SPEC.toriiTop - SPEC.bedTop) / 2, V(SPEC.bedX1 + 0.025, (SPEC.toriiTop + SPEC.bedTop) / 2), 0), 'torii', 0.5);
      // キャブ
      fx(pl.Polygon(SPEC.cab.map(([px, py]) => V(px, py))), 'cab', 0.4);
      // 下回り（フレーム）
      fx(pl.Box(1.57, 0.11, V(0.03, 0.47), 0), 'frame', 0.4);
      chassis.setMassData({ mass: SPEC.chassisMass, center: V(SPEC.com[0], SPEC.com[1]), I: SPEC.inertia + SPEC.chassisMass * (SPEC.com[0] ** 2 + SPEC.com[1] ** 2) });

      this.chassis = chassis;
      this.wheels = [];
      this.joints = [];
      for (const ax of SPEC.axleX) {
        const wheel = world.createBody({ type: 'dynamic', position: V(x + ax, groundY + SPEC.axleY) });
        wheel.setSleepingAllowed(false);
        wheel.createFixture(pl.Circle(SPEC.wheelR), {
          density: SPEC.wheelMass / (Math.PI * SPEC.wheelR * SPEC.wheelR),
          friction: 1.15,
          restitution: 0.0,
          filterCategoryBits: KT.CAT.WHEEL,
          filterMaskBits: KT.CAT.GROUND | KT.CAT.ITEM,
          userData: { kind: 'wheel' },
        });
        const j = world.createJoint(
          pl.WheelJoint(
            { motorSpeed: 0, maxMotorTorque: 4000, enableMotor: true, frequencyHz: SPEC.suspHz, dampingRatio: SPEC.suspDamp },
            chassis,
            wheel,
            wheel.getPosition(),
            V(0, 1)
          )
        );
        this.wheels.push(wheel);
        this.joints.push(j);
      }
      this.throttle = 0;
      this.brake = 0;
      this.parked = true;
      this.rpm = 0;
    }

    get pos() { return this.chassis.getPosition(); }
    get angle() { return this.chassis.getAngle(); }

    /** 車体の前方向の速度 (m/s) */
    forwardSpeed() {
      const v = this.chassis.getLinearVelocity();
      const a = this.chassis.getAngle();
      return v.x * Math.cos(a) + v.y * Math.sin(a);
    }

    /** ローカル→ワールド */
    toWorld(lx, ly) {
      return this.chassis.getWorldPoint(planck.Vec2(lx, ly));
    }
    toLocal(p) {
      return this.chassis.getLocalPoint(p);
    }

    hookWorld(i) {
      const h = HOOKS[i];
      return this.toWorld(h.x, h.y);
    }

    setParked(flag) {
      this.parked = flag;
      for (const j of this.joints) {
        j.enableMotor(true);
        j.setMotorSpeed(0);
        j.setMaxMotorTorque(flag ? 8000 : SPEC.idleTorque);
      }
    }

    /** throttleIn / brakeIn は 0 or 1 の入力。踏み込みは時間でなめらかに */
    drive(throttleIn, brakeIn, dt, brakeScale = 1) {
      const up = (cur, target, rateUp, rateDown) =>
        target > cur ? Math.min(target, cur + rateUp * dt) : Math.max(target, cur - rateDown * dt);
      this.throttle = up(this.throttle, throttleIn ? 1 : 0, 2.2, 6);
      this.brake = up(this.brake, brakeIn ? 1 : 0, 2.5, 8);
      const v = this.forwardSpeed();
      const maxW = SPEC.maxSpeed / SPEC.wheelR;
      // 止まっている時に押し直したブレーキだけがバックになる（坂で止まったまま下がらないように）
      if (brakeIn && !this.prevBrakeIn) this.reverseArmed = v < 0.6;
      if (!brakeIn) this.reverseArmed = false;
      this.prevBrakeIn = brakeIn;
      let speed = 0, torque = SPEC.idleTorque;
      if (this.throttle > 0.01 && throttleIn) {
        speed = -maxW;
        torque = SPEC.driveTorque * (0.25 + 0.75 * this.throttle);
      } else if (this.brake > 0.01 && brakeIn) {
        if (this.reverseArmed && v < 0.6) {
          speed = SPEC.reverseSpeed / SPEC.wheelR;
          torque = SPEC.driveTorque * 0.6 * this.brake;
        } else {
          speed = 0;
          torque = SPEC.brakeTorque * brakeScale * Math.max(this.brake, Math.abs(v) < 0.6 ? 1 : 0);
        }
      }
      for (const j of this.joints) {
        j.enableMotor(true);
        j.setMotorSpeed(speed);
        j.setMaxMotorTorque(torque);
      }
      // エンジン音用の回転数（0..1）
      const w = Math.abs(this.wheels[0].getAngularVelocity()) / maxW;
      const target = KT.clamp(0.12 + w * 0.75 + this.throttle * 0.25, 0, 1.2);
      this.rpm += (target - this.rpm) * Math.min(1, dt * 6);
    }

    /** 荷台の上かどうか（ローカル座標で判定） */
    isOverBed(lp) {
      return lp.x > SPEC.bedX0 - 0.15 && lp.x < SPEC.bedX1 + 0.2 && lp.y > SPEC.bedTop - 0.2;
    }

    /** 車体を指定位置に立て直す（ロードサービス） */
    resetTo(x, groundY) {
      const V = planck.Vec2;
      this.chassis.setTransform(V(x, groundY + 0.03), 0);
      this.chassis.setLinearVelocity(V(0, 0));
      this.chassis.setAngularVelocity(0);
      SPEC.axleX.forEach((ax, i) => {
        const w = this.wheels[i];
        w.setTransform(V(x + ax, groundY + 0.03 + SPEC.axleY), 0);
        w.setLinearVelocity(V(0, 0));
        w.setAngularVelocity(0);
      });
    }

    // ------------------------------------------------------------------
    // 描画（ctx は車体ローカル・y 下向き）
    // ------------------------------------------------------------------
    drawBack(ctx, P, opt = {}) {
      const S = SPEC;
      // 下回り
      ctx.fillStyle = '#2c3138';
      ctx.fillRect(-1.56, -0.58, 3.16, 0.2);
      // タイヤハウスの影
      ctx.fillStyle = '#1a1d22';
      for (const ax of S.axleX) {
        ctx.beginPath();
        ctx.arc(ax, -S.axleY, S.wheelR + 0.05, Math.PI, 0);
        ctx.lineTo(ax + S.wheelR + 0.05, -0.36);
        ctx.lineTo(ax - S.wheelR - 0.05, -0.36);
        ctx.fill();
      }
      // 燃料タンク・マフラー
      G.rr(ctx, -0.45, -0.46, 0.5, 0.14, 0.03);
      G.fs(ctx, '#3a4048', P, 1.4);
      G.rr(ctx, -1.6, -0.43, 0.35, 0.05, 0.02);
      G.fs(ctx, '#7c838c', P, 1.2);
      // 荷台の床（奥に見える面）
      ctx.fillStyle = '#8e979c';
      ctx.fillRect(S.bedX0, -S.bedTop, S.bedX1 - S.bedX0 + 0.05, 0.06);
      ctx.fillStyle = '#6c757a';
      ctx.fillRect(S.bedX0, -S.bedTop + 0.06, S.bedX1 - S.bedX0 + 0.05, 0.03);
      // 後ろあおり（断面）
      G.rr(ctx, S.bedX0, -S.gateTop, 0.05, S.gateTop - S.bedTop + 0.02, 0.01);
      G.fs(ctx, '#e9eeee', P, 1.6);
      // テールランプ（ブレーキ中は光る）
      if (opt.braking) {
        const g = ctx.createRadialGradient(S.bedX0 + 0.01, -0.51, 0.01, S.bedX0 + 0.01, -0.51, 0.35);
        g.addColorStop(0, 'rgba(255,60,40,0.55)');
        g.addColorStop(1, 'rgba(255,60,40,0)');
        ctx.fillStyle = g;
        ctx.fillRect(S.bedX0 - 0.4, -0.9, 0.8, 0.8);
      }
      G.rr(ctx, S.bedX0 - 0.02, -0.56, 0.06, 0.1, 0.015);
      G.fs(ctx, opt.braking ? '#ff5a3c' : '#c42e27', P, 1.4);
      // 鳥居の奥側（網）
      ctx.save();
      ctx.globalAlpha = 0.9;
      G.rr(ctx, S.bedX1 - 0.005, -S.toriiTop, 0.065, S.toriiTop - S.bedTop, 0.012);
      G.fs(ctx, '#3a4049', P, 1.6);
      ctx.restore();
      for (let yy = S.bedTop + 0.18; yy < S.toriiTop - 0.05; yy += 0.18) {
        G.line(ctx, S.bedX1, -yy, S.bedX1 + 0.055, -yy, P, 1, '#626a74');
      }

      this.drawCab(ctx, P, opt);
    }

    drawCab(ctx, P, opt) {
      // キャブ本体
      ctx.beginPath();
      ctx.moveTo(0.31, -0.48);
      ctx.lineTo(1.64, -0.48);
      ctx.quadraticCurveTo(1.74, -0.5, 1.73, -0.62);
      ctx.lineTo(1.73, -1.0);
      ctx.lineTo(1.43, -1.69);
      ctx.quadraticCurveTo(1.4, -1.745, 1.32, -1.745);
      ctx.lineTo(0.38, -1.745);
      ctx.quadraticCurveTo(0.31, -1.745, 0.31, -1.68);
      ctx.closePath();
      G.fs(ctx, '#f4f6f5', P, 2.2);
      // 陰
      ctx.fillStyle = 'rgba(120,140,150,0.14)';
      ctx.fillRect(0.33, -0.72, 1.38, 0.22);
      // フロントガラス
      ctx.beginPath();
      ctx.moveTo(1.66, -1.05);
      ctx.lineTo(1.4, -1.64);
      ctx.lineTo(1.3, -1.64);
      ctx.lineTo(1.46, -1.05);
      ctx.closePath();
      G.fs(ctx, '#9fc7dc', P, 1.6);
      // サイドウインドウ
      ctx.beginPath();
      ctx.moveTo(0.62, -1.08);
      ctx.lineTo(1.4, -1.08);
      ctx.lineTo(1.24, -1.62);
      ctx.lineTo(0.66, -1.62);
      ctx.quadraticCurveTo(0.62, -1.62, 0.62, -1.56);
      ctx.closePath();
      const g = ctx.createLinearGradient(0.6, -1.62, 1.3, -1.08);
      g.addColorStop(0, '#cfe6f1');
      g.addColorStop(1, '#8fbcd3');
      ctx.fillStyle = g;
      ctx.fill();
      // 運転手
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#26303d';
      G.rr(ctx, 0.86, -1.32, 0.28, 0.3, 0.08);
      ctx.fill();
      G.circle(ctx, 1.0, -1.42, 0.085);
      ctx.fillStyle = '#e9b98f';
      ctx.fill();
      // タオル鉢巻
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0.91, -1.5, 0.18, 0.035);
      ctx.fillStyle = '#26303d';
      ctx.beginPath();
      ctx.arc(1.0, -1.47, 0.088, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0.905, -1.485, 0.19, 0.03);
      ctx.restore();
      ctx.lineWidth = 1.6 * P;
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.moveTo(0.62, -1.08);
      ctx.lineTo(1.4, -1.08);
      ctx.lineTo(1.24, -1.62);
      ctx.lineTo(0.66, -1.62);
      ctx.quadraticCurveTo(0.62, -1.62, 0.62, -1.56);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(1.1, -1.6);
      ctx.lineTo(1.2, -1.6);
      ctx.lineTo(1.0, -1.1);
      ctx.lineTo(0.9, -1.1);
      ctx.fill();
      // ドア
      ctx.beginPath();
      ctx.moveTo(0.58, -1.65);
      ctx.lineTo(0.58, -0.62);
      ctx.quadraticCurveTo(0.6, -0.56, 0.66, -0.56);
      ctx.lineTo(0.62, -0.56);
      ctx.moveTo(0.58, -0.62);
      ctx.lineTo(0.62, -0.56);
      ctx.stroke();
      G.line(ctx, 1.44, -1.04, 1.44, -0.62, P, 1.6);
      G.rr(ctx, 0.66, -0.98, 0.1, 0.03, 0.012);
      G.fs(ctx, '#9aa4ab', P, 1.2);
      // ミラー
      G.line(ctx, 1.58, -1.12, 1.78, -1.22, P, 2.2);
      G.rr(ctx, 1.76, -1.36, 0.06, 0.18, 0.02);
      G.fs(ctx, '#2a3038', P, 1.4);
      // バンパー・ライト
      G.rr(ctx, 1.62, -0.66, 0.16, 0.14, 0.03);
      G.fs(ctx, '#8b949b', P, 1.6);
      G.rr(ctx, 1.66, -0.9, 0.08, 0.13, 0.02);
      G.fs(ctx, opt.lightsOn ? '#fff6c8' : '#e6eef2', P, 1.4);
      G.rr(ctx, 1.67, -0.75, 0.065, 0.05, 0.01);
      G.fs(ctx, '#f1a43a', P, 1.2);
      // ステップ
      ctx.fillStyle = '#3b424b';
      ctx.fillRect(0.6, -0.5, 0.3, 0.035);
      // キャブ後ろの黒いすき間
      ctx.fillStyle = '#2d333b';
      ctx.fillRect(0.29, -1.7, 0.03, 1.2);
    }

    drawFront(ctx, P, opt = {}) {
      const S = SPEC;
      const x0 = S.bedX0, x1 = S.bedX1 + 0.05;
      const alpha = opt.gateAlpha ?? 0.62;
      // 手前のあおり（中の荷物が見えるよう半透明）
      ctx.save();
      ctx.globalAlpha = alpha;
      G.rr(ctx, x0, -S.gateTop, x1 - x0, S.gateTop - 0.6, 0.012);
      ctx.fillStyle = '#eef2f1';
      ctx.fill();
      ctx.restore();
      G.rr(ctx, x0, -S.gateTop, x1 - x0, S.gateTop - 0.6, 0.012);
      ctx.lineWidth = 2.2 * P;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      // リブ
      for (const yy of [0.71, 0.8, 0.88]) G.line(ctx, x0 + 0.06, -yy, x1 - 0.06, -yy, P, 1.2, 'rgba(29,39,56,0.45)');
      // 上端のふち
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(x0 + 0.01, -S.gateTop + 0.005, x1 - x0 - 0.02, 0.015);
      // あおりの留め金
      for (const ex of [x0 + 0.02, x1 - 0.06]) {
        G.rr(ctx, ex, -0.88, 0.04, 0.12, 0.01);
        G.fs(ctx, '#47505a', P, 1.2);
      }
      // ヒンジ
      for (const hx of [-1.3, -0.6, 0.0]) {
        ctx.fillStyle = '#5a636c';
        ctx.fillRect(hx, -0.625, 0.1, 0.025);
      }
      // 鳥居の手前の柱
      G.rr(ctx, S.bedX1, -S.toriiTop - 0.02, 0.055, S.toriiTop - S.bedTop + 0.02, 0.014);
      G.fs(ctx, '#2f353d', P, 1.8);
      G.rr(ctx, S.bedX1 - 0.01, -S.toriiTop - 0.03, 0.28, 0.05, 0.014);
      G.fs(ctx, '#2f353d', P, 1.8);
      G.line(ctx, S.bedX1 + 0.018, -S.toriiTop + 0.02, S.bedX1 + 0.018, -S.bedTop - 0.04, P, 1, 'rgba(255,255,255,0.25)');
      // 泥よけ
      G.rr(ctx, -1.42, -0.42, 0.05, 0.24, 0.01);
      G.fs(ctx, '#1d2026', P, 1);
    }

    drawHooks(ctx, P, highlight, used) {
      HOOKS.forEach((h, i) => {
        const isHi = highlight === i;
        const isUsed = used && used.has(i);
        G.circle(ctx, h.x, -h.y, isHi ? 0.05 : 0.034);
        G.fs(ctx, isHi ? '#ffe14d' : isUsed ? '#c9a640' : C.plate, P, 2);
        G.circle(ctx, h.x, -h.y, 0.012);
        ctx.fillStyle = C.ink;
        ctx.fill();
      });
    }

    drawWheel(ctx, P, angle) {
      const r = SPEC.wheelR;
      G.circle(ctx, 0, 0, r);
      G.fs(ctx, '#23272d', P, 2);
      // トレッド
      ctx.save();
      ctx.rotate(-angle);
      ctx.strokeStyle = '#3b4048';
      ctx.lineWidth = 2 * P;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86);
        ctx.lineTo(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98);
        ctx.stroke();
      }
      G.circle(ctx, 0, 0, r * 0.6);
      G.fs(ctx, '#c3cacf', P, 1.6);
      G.circle(ctx, 0, 0, r * 0.42);
      G.fs(ctx, '#9aa3aa', P, 1.2);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        G.circle(ctx, Math.cos(a) * r * 0.27, Math.sin(a) * r * 0.27, r * 0.06);
        ctx.fillStyle = '#5e666e';
        ctx.fill();
      }
      G.circle(ctx, 0, 0, r * 0.13);
      G.fs(ctx, '#e8eced', P, 1.2);
      ctx.restore();
    }
  }

  KT.Truck = Truck;
})(typeof window !== 'undefined' ? window : globalThis);
