/* 物理シミュレーション本体（DOM に依存しない。Node の検証スクリプトからも動かす）
 *
 * 破損の考え方
 *  - 衝撃: 1ステップで受けた法線力積 J を自分の質量で割った「速度変化 Δv」がしきい値(tough)を超えた分だけ HP が減る。
 *          下に重い物が載っていると、その分 Δv の土台が上がるので、段差でこわれやすくなる。
 *          クッション（布団）との接触は Δv を弱める。
 *  - 圧迫: 上に載った重さ（推定荷重）が crush を超え続けると、じわじわ HP が減る。
 *  - 落下: 走行中に地面へ触れたら落下扱い（弁償は全額）。
 */
(function (root) {
  'use strict';
  const KT = (root.KT = root.KT || {});
  const CONST = KT.CONST;

  const DMG_K = 36; // しきい値を 1m/s 超えるごとに失う HP
  const CUSHION = 0.42; // 布団に触れている時の衝撃の倍率
  const GRAV = 9.8;

  let ropeSeq = 1;

  class Sim {
    constructor(stage) {
      const pl = planck;
      const V = pl.Vec2;
      this.stage = stage;
      this.course = KT.buildCourse(stage);
      this.world = new pl.World({ gravity: V(0, -GRAV) });
      const ground = this.world.createBody({ type: 'static' });
      // 地面は「つながりを持たない線分」の集まりにする。
      // chain（ゴースト頂点つき）だと、段差の下の凹んだ角で大きな多角形（車体）が地面の裏側へ
      // 吸い込まれる Box2D 2.3 系の既知の挙動が出るため。線分単体なら素直な分離軸判定になる。
      const pts = this.course.points;
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
        if (Math.hypot(x2 - x1, y2 - y1) < 1e-4) continue;
        ground.createFixture(pl.Edge(V(x1, y1), V(x2, y2)), {
          friction: 0.9,
          restitution: 0,
          filterCategoryBits: KT.CAT.GROUND,
          filterMaskBits: 0xffff,
          userData: { kind: 'ground' },
        });
      }
      this.ground = ground;
      const tx = this.course.truckX;
      this.truck = new KT.Truck(this.world, tx, KT.groundY(this.course, tx));
      this.truck.setParked(true);

      this.items = stage.items.map((id, i) => this.makeInstance(id, i));
      this.ropes = [];
      this.ropesLeft = stage.ropes;
      this.phase = 'load'; // load → drive → arrive → done
      this.time = 0;
      this.simTime = 0;
      this.events = [];
      this.rescues = 0;
      this.flipTime = 0;
      this.stuckTime = 0;
      this.flipped = false;
      this.stuck = false;
      this.arriveTime = 0;
      this.loadMass = 0;
      this.maxSpeed = 0;
      this.input = { throttle: false, brake: false };

      this.world.on('post-solve', (c, imp) => this.onPostSolve(c, imp));
      this.world.on('begin-contact', (c) => this.onBeginContact(c));
    }

    // ------------------------------------------------------------------
    // 荷物
    // ------------------------------------------------------------------
    makeInstance(id, idx) {
      const pl = planck;
      const V = pl.Vec2;
      const def = KT.ITEMS[id];
      if (!def) throw new Error('unknown item ' + id);
      const inst = {
        uid: idx + 1,
        id,
        def,
        body: null,
        state: 'tray', // tray / held / placed / fallen / left
        hp: 100,
        broken: false,
        dmgImpact: 0,
        dmgCrush: 0,
        stepDv: 0,
        stepF: 0,
        load: 0,
        cushioned: 0,
        tiltTime: 0,
        upsideTime: 0,
        flash: 0,
        popYen: 0,
        popAge: 0,
        lastHit: -1,
        touchGround: false,
        warn: null,
      };
      const body = this.world.createBody({
        type: 'dynamic',
        position: V(-50 - idx, 5),
        linearDamping: 0.04,
        angularDamping: 0.1,
      });
      let total = 0;
      for (const s of def.shapes) total += KT.shapeArea(s);
      for (const s of def.shapes) {
        const area = KT.shapeArea(s);
        const share = s.share ?? area / total;
        let shape;
        if (s.type === 'box') shape = pl.Box(s.w / 2, s.h / 2, V(s.x, s.y), 0);
        else if (s.type === 'circle') shape = pl.Circle(V(s.x, s.y), s.r);
        else shape = pl.Polygon(s.pts.map(([x, y]) => V(x, y)));
        body.createFixture(shape, {
          density: (def.mass * share) / area,
          friction: def.friction,
          restitution: def.restitution,
          filterCategoryBits: KT.CAT.ITEM,
          filterMaskBits: 0xffff,
          userData: { kind: 'item', inst },
        });
      }
      body.setActive(false);
      inst.body = body;
      return inst;
    }

    /** inst を (x,y,angle) に置いたとき、ほかの物体と重なるか */
    overlaps(inst, x, y, angle) {
      const pl = planck;
      const xf = new pl.Transform(pl.Vec2(x, y), angle);
      const aabb = new pl.AABB();
      const tmp = new pl.AABB();
      let first = true;
      const mine = [];
      for (let f = inst.body.getFixtureList(); f; f = f.getNext()) {
        const sh = f.getShape();
        sh.computeAABB(tmp, xf, 0);
        if (first) { aabb.set(tmp); first = false; }
        else aabb.combine(aabb, tmp);
        mine.push(sh);
      }
      // 地面（積み込み場所は平ら）は高さで判定
      const gy = Math.max(KT.groundY(this.course, aabb.lowerBound.x), KT.groundY(this.course, aabb.upperBound.x));
      if (aabb.lowerBound.y < gy + 0.005) return true;
      let hit = false;
      this.world.queryAABB(aabb, (fx) => {
        const ud = fx.getUserData();
        if (fx.getBody() === inst.body || (ud && ud.kind === 'ground')) return true;
        const other = fx.getShape();
        const oxf = fx.getBody().getTransform();
        for (const sh of mine) {
          if (pl.testOverlap(sh, 0, other, 0, xf, oxf)) {
            hit = true;
            return false;
          }
        }
        return true;
      });
      return hit;
    }

    /** 重なっていたら上へずらして置ける場所を探す */
    findPlacement(inst, x, y, angle) {
      for (let k = 0; k <= 140; k++) {
        const yy = y + k * 0.02;
        if (!this.overlaps(inst, x, yy, angle)) return { x, y: yy, lifted: k > 0 };
      }
      return null;
    }

    placeItem(inst, x, y, angle) {
      const V = planck.Vec2;
      const b = inst.body;
      b.setTransform(V(x, y), angle);
      b.setLinearVelocity(V(0, 0));
      b.setAngularVelocity(0);
      b.setActive(true);
      b.setAwake(true);
      inst.state = 'placed';
      inst.touchGround = false;
      inst.leaving = false;
      inst.autoSpot = null;
      inst.load = 0;
      this.events.push({ type: 'place', inst });
    }

    /** 積み込み中に持ち上げる */
    pickItem(inst) {
      this.removeRopesOf(inst, true);
      inst.body.setActive(false);
      inst.state = 'held';
      inst.warn = null;
    }

    returnToTray(inst) {
      this.removeRopesOf(inst, true);
      inst.body.setActive(false);
      inst.state = 'tray';
      inst.warn = null;
    }

    placedItems() {
      return this.items.filter((it) => it.state === 'placed');
    }

    currentLoad() {
      let m = 0;
      for (const it of this.items) if (it.state === 'placed' || it.state === 'held') m += it.def.mass;
      return m;
    }

    // ------------------------------------------------------------------
    // ロープ
    // ------------------------------------------------------------------
    /**
     * ロープを掛ける。実際の荷締めと同じく、選んだフックから荷物の上を通って、
     * 反対側のフックにも掛ける（2本の「これ以上は伸びない」拘束で荷物を挟む）。
     * 片側だけだと、荷物が後ろへ滑ってぶら下がり、道に落ちてしまうため。
     */
    addRope(inst, localAnchor, hookIndex) {
      if (this.ropesLeft <= 0 || inst.state !== 'placed') return null;
      const pl = planck;
      const HOOKS = KT.TRUCK_HOOKS;
      const pb = inst.body.getWorldPoint(pl.Vec2(localAnchor.x, localAnchor.y));
      const lb = this.truck.toLocal(pb);
      const make = (hi) => {
        const h = HOOKS[hi];
        const pa = this.truck.hookWorld(hi);
        const len = Math.hypot(pa.x - pb.x, pa.y - pb.y);
        if (len < 0.05) return null;
        const joint = this.world.createJoint(
          new pl.RopeJoint({
            bodyA: this.truck.chassis,
            bodyB: inst.body,
            localAnchorA: pl.Vec2(h.x, h.y),
            localAnchorB: pl.Vec2(localAnchor.x, localAnchor.y),
            maxLength: len + 0.008,
            collideConnected: true,
          })
        );
        return { joint, hook: hi, maxLength: len + 0.008 };
      };
      // 反対側のフック：荷物をはさんで向こう側にあり、2本のなす角がいちばん開くもの
      const h0 = HOOKS[hookIndex];
      const side = Math.sign(h0.x - lb.x) || 1;
      const a0 = Math.atan2(h0.y - lb.y, h0.x - lb.x);
      let other = -1, bestAng = 0.7;
      HOOKS.forEach((o, i) => {
        if (i === hookIndex || Math.sign(o.x - lb.x) !== -side) return;
        const ang = Math.abs(KT.normAngle(Math.atan2(o.y - lb.y, o.x - lb.x) - a0)) - Math.hypot(o.x - lb.x, o.y - lb.y) * 0.04;
        if (ang > bestAng) { bestAng = ang; other = i; }
      });
      const first = make(hookIndex);
      if (!first) return null;
      const second = other >= 0 ? make(other) : null;
      const rope = {
        id: ropeSeq++,
        inst,
        local: { x: localAnchor.x, y: localAnchor.y },
        segs: second ? [first, second] : [first],
        hook: hookIndex,
        tension: 0,
        over: 0,
      };
      this.ropes.push(rope);
      this.ropesLeft--;
      this.events.push({ type: 'rope', rope });
      return rope;
    }

    removeRope(rope, refund) {
      const i = this.ropes.indexOf(rope);
      if (i < 0) return;
      for (const sg of rope.segs) this.world.destroyJoint(sg.joint);
      this.ropes.splice(i, 1);
      if (refund) this.ropesLeft++;
    }

    removeRopesOf(inst, refund) {
      for (const r of this.ropes.slice()) if (r.inst === inst) this.removeRope(r, refund);
    }

    /** ロープの折れ線（フック → 荷物 → 反対側のフック）。ワールド座標 */
    ropePath(rope) {
      const b = rope.inst.body.getWorldPoint(planck.Vec2(rope.local.x, rope.local.y));
      const pts = [this.truck.hookWorld(rope.segs[0].hook), b];
      if (rope.segs[1]) pts.push(this.truck.hookWorld(rope.segs[1].hook));
      return pts;
    }

    /** 互換用：最初の区間の両端 */
    ropeEnds(rope) {
      const p = this.ropePath(rope);
      return [p[0], p[1]];
    }

    usedHooks() {
      const set = new Set();
      for (const r of this.ropes) for (const sg of r.segs) set.add(sg.hook);
      return set;
    }

    // ------------------------------------------------------------------
    // 接触イベント
    // ------------------------------------------------------------------
    onPostSolve(contact, impulse) {
      const fA = contact.getFixtureA(), fB = contact.getFixtureB();
      const uA = fA.getUserData(), uB = fB.getUserData();
      const iA = uA && uA.kind === 'item' ? uA.inst : null;
      const iB = uB && uB.kind === 'item' ? uB.inst : null;
      if (!iA && !iB) return;
      const n = contact.getManifold().pointCount;
      const ni = impulse.normalImpulses;
      let J = 0;
      for (let k = 0; k < n; k++) J += ni[k];
      if (!(J > 0)) return;
      // 法線は A → B 向き。上から押している接触だけを「載っている重さ」として数える
      // （ロープで引き下げられた分や、横から押された分は数えない）
      const wm = contact.getWorldManifold(null);
      const ny = wm ? wm.normal.y : 0;
      if (iA) this.accum(iA, J, iB, ny > 0.5 ? J : 0);
      if (iB) this.accum(iB, J, iA, ny < -0.5 ? J : 0);
    }

    accum(inst, J, other, above = 0) {
      inst.stepAbove = (inst.stepAbove || 0) + above;
      let dv = J / inst.def.mass;
      if (other && other.def.tags.includes('cushion')) {
        const raw = dv;
        dv *= CUSHION;
        inst.cushioned = 0.3;
        if (raw > inst.def.tough && dv <= inst.def.tough && inst.def.tags.includes('fragile') && (this.phase === 'drive' || this.phase === 'arrive') && this.simTime - (inst.lastSoft || -9) > 1.5) {
          inst.lastSoft = this.simTime;
          const p = inst.body.getPosition();
          this.events.push({ type: 'soft', inst, x: p.x, y: p.y });
        }
      }
      if (dv > inst.stepDv) inst.stepDv = dv;
      inst.stepF += J / CONST.DT;
    }

    onBeginContact(contact) {
      const fA = contact.getFixtureA(), fB = contact.getFixtureB();
      const uA = fA.getUserData(), uB = fB.getUserData();
      if (!uA || !uB) return;
      if (uA.kind === 'item' && uB.kind === 'ground') uA.inst.touchGround = true;
      else if (uB.kind === 'item' && uA.kind === 'ground') uB.inst.touchGround = true;
    }

    // ------------------------------------------------------------------
    // 進行
    // ------------------------------------------------------------------
    startDrive() {
      for (const it of this.items) {
        if (it.state === 'tray' || it.state === 'held') {
          if (it.state === 'held') it.body.setActive(false);
          it.state = 'left';
        }
      }
      this.loadMass = 0;
      for (const it of this.items) if (it.state === 'placed') this.loadMass += it.def.mass;
      this.truck.setParked(false);
      this.phase = 'drive';
      this.time = 0;
      this.events.push({ type: 'depart' });
    }

    /** 1フレーム分（固定ステップを n 回） */
    step(dt) {
      const DT = CONST.DT;
      this.acc = (this.acc || 0) + Math.min(dt, 0.1);
      let n = 0;
      while (this.acc >= DT && n < 8) {
        this.fixedStep(DT);
        this.acc -= DT;
        n++;
      }
      if (n === 8) this.acc = 0;
    }

    fixedStep(DT) {
      const truck = this.truck;
      const driving = this.phase === 'drive';
      if (this.phase === 'load' || this.phase === 'done') {
        truck.setParked(true);
      } else if (driving) {
        truck.drive(this.input.throttle && !this.flipped, this.input.brake && !this.flipped, DT);
      } else if (this.phase === 'arrive') {
        truck.drive(false, true, DT, 0.55);
        if (truck.forwardSpeed() < 0.5) truck.setParked(true);
      }

      this.world.step(DT, CONST.VEL_ITERS, CONST.POS_ITERS);
      this.simTime += DT;
      if (driving) this.time += DT;

      if (this.grace > 0) this.grace -= DT;
      const active = this.phase === 'drive' || this.phase === 'arrive';
      const damaging = active && !(this.grace > 0);
      const chassis = truck.chassis;
      const cpos = chassis.getPosition();
      const tAngle = chassis.getAngle();

      for (const it of this.items) {
        if (it.state !== 'placed') continue;
        const b = it.body;
        const def = it.def;
        // --- 衝撃
        if (it.stepDv > 0.9 && this.simTime - it.lastHit > 0.12) {
          it.lastHit = this.simTime;
          const p = b.getPosition();
          this.events.push({ type: 'hit', inst: it, x: p.x, y: p.y, power: it.stepDv });
        }
        if (damaging && it.stepDv > def.tough) {
          this.damage(it, (it.stepDv - def.tough) * DMG_K, 'impact');
        }
        // --- 荷重（上から押されている力。段差の衝撃で一瞬ふくらむのをならす）
        const L = (it.stepAbove || 0) / DT;
        it.load += (L - it.load) * 0.06;
        if (damaging && it.load > def.crush) {
          const over = it.load / def.crush - 1;
          this.damage(it, Math.min(45, 6 + over * 30) * DT, 'crush');
        }
        it.warn = null;
        if (it.load > def.crush * 0.85 && def.crush < Infinity) it.warn = 'crush';
        it.stepDv = 0;
        it.stepF = 0;
        it.stepAbove = 0;
        if (it.cushioned > 0) it.cushioned -= DT;
        if (it.flash > 0) it.flash -= DT * 2.5;

        // --- 向きのルール
        const rel = Math.abs(KT.normAngle(b.getAngle() - tAngle));
        if (def.tags.includes('noTilt') && rel > 0.79) {
          if (active) it.tiltTime += DT;
          it.warn = it.warn || 'tilt';
        }
        if (def.tags.includes('tenchi') && rel > 2.1) {
          if (active) it.upsideTime += DT;
          it.warn = it.warn || 'upside';
        }

        // --- 荷台から落ちかけている（あおりの外で、荷台より低い）→ 演出用の合図
        if (active && !it.leaving) {
          const lp = chassis.getLocalPoint(b.getPosition());
          const S = KT.TRUCK_SPEC;
          const behind = lp.x < S.bedX0 - 0.05 && lp.y < S.gateTop + 0.1;
          const below = lp.y < S.bedTop - 0.02 && (lp.x < S.bedX0 + 0.05 || lp.x > S.bedX1 + 0.1);
          if (behind || below) {
            it.leaving = true;
            const p = b.getPosition();
            this.events.push({ type: 'leaving', inst: it, x: p.x, y: p.y });
          }
        }

        // --- 地面に触れた
        if (it.touchGround) {
          it.touchGround = false;
          if (this.phase === 'load') {
            if (it.autoSpot) (it.failedSpots = it.failedSpots || []).push(it.autoSpot);
            this.returnToTray(it);
            this.events.push({ type: 'returned', inst: it });
          } else if (active) {
            this.markFallen(it);
          }
        }
        // 遠くへ行ってしまった
        if (it.state === 'placed') {
          const p = b.getPosition();
          if (Math.abs(p.x - cpos.x) > 7 || p.y < cpos.y - 6) {
            if (this.phase === 'load') this.returnToTray(it);
            else this.markFallen(it);
          }
        }
        if (it.popYen !== 0) it.popAge += DT;
      }

      // --- ロープの張力（どちらかの区間が限界をこえ続けたら切れる）
      for (const r of this.ropes.slice()) {
        let F = 0;
        for (const sg of r.segs) F = Math.max(F, sg.joint.getReactionForce(1 / DT).length());
        r.tension = F;
        if (damaging && F > CONST.ROPE_STRENGTH) {
          r.over++;
          if (r.over >= 3) {
            const b = r.inst.body.getWorldPoint(planck.Vec2(r.local.x, r.local.y));
            this.removeRope(r, false);
            this.events.push({ type: 'snap', x: b.x, y: b.y + 0.1, inst: r.inst });
          }
        } else r.over = 0;
      }

      // --- 走行の状態
      if (driving || this.phase === 'arrive') {
        const v = truck.forwardSpeed();
        this.maxSpeed = Math.max(this.maxSpeed, v);
        const up = Math.abs(KT.normAngle(tAngle));
        if (up > 1.75) this.flipTime += DT;
        else this.flipTime = Math.max(0, this.flipTime - DT * 2);
        this.flipped = this.flipTime > 1.0;
        if (driving && this.input.throttle && Math.abs(v) < 0.3) this.stuckTime += DT;
        else this.stuckTime = Math.max(0, this.stuckTime - DT * 3);
        this.stuck = this.stuckTime > 4;
      }
      if (driving && cpos.x >= this.course.goalX) {
        this.phase = 'arrive';
        this.arriveTime = 0;
        this.events.push({ type: 'goal' });
      }
      if (this.phase === 'arrive') {
        this.arriveTime += DT;
        if (this.arriveTime > 1.6 && Math.abs(truck.forwardSpeed()) < 0.15) {
          this.phase = 'done';
          this.events.push({ type: 'done' });
        }
        if (this.arriveTime > 10) {
          this.phase = 'done';
          this.events.push({ type: 'done' });
        }
      }
    }

    markFallen(it) {
      if (it.state !== 'placed') return;
      const before = this.compensation(it);
      it.state = 'fallen';
      this.removeRopesOf(it, false);
      // 道に落ちた荷物は、軽トラ（車体・タイヤ）とは当たらないようにする（立ち往生を防ぐ）
      for (let f = it.body.getFixtureList(); f; f = f.getNext()) f.setFilterMaskBits(KT.CAT.GROUND | KT.CAT.ITEM);
      it.popYen -= it.def.value - before;
      it.popAge = 0;
      const p = it.body.getPosition();
      this.events.push({ type: 'fall', inst: it, x: p.x, y: p.y });
    }

    damage(it, amount, cause) {
      if (it.broken || amount <= 0 || it.def.tough === Infinity) return;
      const before = it.hp;
      const yenBefore = this.compensation(it);
      it.hp = Math.max(0, it.hp - amount);
      const lost = before - it.hp;
      if (cause === 'impact') it.dmgImpact += lost;
      else {
        it.dmgCrush += lost;
        if (this.simTime - (it.lastCreak || -9) > 0.9) {
          it.lastCreak = this.simTime;
          const p = it.body.getPosition();
          this.events.push({ type: 'creak', inst: it, x: p.x, y: p.y });
        }
      }
      if (lost > 0.8) it.flash = 1;
      if (it.hp <= 0) {
        it.broken = true;
        const p = it.body.getPosition();
        this.events.push({ type: 'break', inst: it, x: p.x, y: p.y });
      } else if (lost > 4) {
        const p = it.body.getPosition();
        this.events.push({ type: 'damage', inst: it, x: p.x, y: p.y, amount: lost });
      }
      const diff = this.compensation(it) - yenBefore;
      if (diff > 0) {
        if (it.popYen === 0) it.popAge = 0;
        it.popYen -= diff;
      }
    }

    /** その荷物が「無事」か（弁償なし・向きのルールも守れている） */
    isIntact(it) {
      if (it.state !== 'placed' || it.broken || this.compensation(it) > 0) return false;
      if (it.def.tags.includes('noTilt') && it.tiltTime > 1.0) return false;
      if (it.def.tags.includes('tenchi') && it.upsideTime > 1.0) return false;
      return true;
    }

    /** お客様の「お願い」の対象と、いまの状態。ok は全部無事のとき true */
    requestStatus() {
      const rq = this.stage.request;
      if (!rq) return null;
      const targets = this.items.filter((it) => rq.items.includes(it.id));
      const failed = targets.filter((it) => !this.isIntact(it));
      return { ok: failed.length === 0, targets, failed };
    }
    isRequested(it) {
      const rq = this.stage.request;
      return !!(rq && rq.items.includes(it.id));
    }

    /** (x, y, angle) に置いたとき、すぐ下で支えることになる荷物 */
    itemsBelow(inst, x, y, angle) {
      const pl = planck;
      const xf = new pl.Transform(pl.Vec2(x, y), angle);
      const aabb = new pl.AABB();
      const tmp = new pl.AABB();
      let first = true;
      for (let f = inst.body.getFixtureList(); f; f = f.getNext()) {
        f.getShape().computeAABB(tmp, xf, 0);
        if (first) { aabb.set(tmp); first = false; }
        else aabb.combine(aabb, tmp);
      }
      const probe = new pl.AABB(pl.Vec2(aabb.lowerBound.x + 0.03, aabb.lowerBound.y - 0.06), pl.Vec2(aabb.upperBound.x - 0.03, aabb.lowerBound.y + 0.03));
      const found = new Set();
      this.world.queryAABB(probe, (fx) => {
        const ud = fx.getUserData();
        if (ud && ud.kind === 'item' && ud.inst !== inst && ud.inst.state === 'placed') found.add(ud.inst);
        return true;
      });
      return [...found];
    }

    /** その荷物の、いまの弁償額（落下・積み残しは別計算） */
    compensation(it) {
      if (it.broken || it.hp <= 0) return it.def.value;
      if (it.hp >= 95) return 0;
      return KT.round100(it.def.value * (1 - it.hp / 100));
    }

    leftoverFee(it) {
      return KT.round100(CONST.LEFTOVER_BASE + it.def.value * CONST.LEFTOVER_RATE);
    }

    /** ロードサービス：車体を起こして、積んだままの荷物ごと持ち上げる */
    rescue() {
      const truck = this.truck;
      const ch = truck.chassis;
      const x = ch.getPosition().x;
      let gy = -Infinity;
      for (let dx = -2; dx <= 2; dx += 0.25) gy = Math.max(gy, KT.groundY(this.course, x + dx));
      const keep = [];
      for (const it of this.items) {
        if (it.state !== 'placed') continue;
        const lp = ch.getLocalPoint(it.body.getPosition());
        if (truck.isOverBed(lp) || lp.y > 0.3) keep.push({ it, lp, la: it.body.getAngle() - ch.getAngle() });
        else this.markFallen(it);
      }
      truck.resetTo(x, gy);
      const V = planck.Vec2;
      for (const k of keep) {
        const p = ch.getWorldPoint(V(k.lp.x, Math.max(k.lp.y, KT.TRUCK_SPEC.bedTop + 0.1)));
        k.it.body.setTransform(V(p.x, p.y + 0.02), k.la);
        k.it.body.setLinearVelocity(V(0, 0));
        k.it.body.setAngularVelocity(0);
      }
      this.rescues++;
      this.grace = 1.5;
      this.flipTime = 0;
      this.stuckTime = 0;
      this.flipped = false;
      this.stuck = false;
      this.events.push({ type: 'rescue' });
    }

    // ------------------------------------------------------------------
    // 精算
    // ------------------------------------------------------------------
    evaluate() {
      const st = this.stage;
      const C = CONST;
      const income = [{ label: '引越し基本料金', yen: st.fee }];
      const diff = st.targetTime - this.time;
      const bonus = KT.round100(Math.abs(diff) * st.timeRate);
      if (diff >= 1) income.push({ label: '早着ボーナス（目標より' + Math.floor(diff) + '秒早い）', yen: bonus });
      const costs = [];
      if (diff <= -1) costs.push({ label: '延着料（目標より' + Math.floor(-diff) + '秒おそい）', yen: bonus, kind: 'time' });

      const counts = { ok: 0, scratched: 0, damaged: 0, broken: 0, fallen: 0, left: 0, total: this.items.length };
      const itemLines = [];
      for (const it of this.items) {
        const d = it.def;
        if (it.state === 'left') {
          counts.left++;
          costs.push({ label: d.name + '　積み残し（別便の手配）', yen: this.leftoverFee(it), kind: 'left', inst: it });
          continue;
        }
        if (it.state === 'fallen') {
          counts.fallen++;
          itemLines.push({ label: d.name + '　落下・紛失', yen: d.value, kind: 'fall', inst: it });
          continue;
        }
        let yen = this.compensation(it);
        let label = null;
        const cause = it.dmgCrush > it.dmgImpact ? '圧迫' : '衝撃';
        if (it.broken) {
          counts.broken++;
          label = d.name + '　全損（' + cause + '）';
        } else if (yen > 0) {
          counts.damaged++;
          label = d.name + '　破損 ' + Math.round(100 - it.hp) + '%（' + cause + '）';
        } else if (it.hp < 100) {
          counts.scratched++;
        } else counts.ok++;
        if (yen > 0) itemLines.push({ label, yen, kind: it.broken ? 'broken' : 'damage', inst: it });
        // 向きのルール違反は、残りの価値の半分を減額
        const rest = d.value - yen;
        if (rest > 0 && d.tags.includes('noTilt') && it.tiltTime > 1.0) {
          const v = KT.round100(rest * 0.5);
          itemLines.push({ label: d.name + '　横倒しで運搬（故障の恐れ）', yen: v, kind: 'rule', inst: it });
          yen += v;
        }
        if (rest > 0 && d.tags.includes('tenchi') && it.upsideTime > 1.0) {
          const v = KT.round100((d.value - yen) * 0.5);
          if (v > 0) itemLines.push({ label: d.name + '　天地逆さまで運搬', yen: v, kind: 'rule', inst: it });
        }
      }
      costs.unshift(...itemLines);
      // お客様の「お願い」を守れたら心付け
      const req = this.requestStatus();
      if (req && req.ok) income.push({ label: '心付け（' + st.request.thanks + '）', yen: st.request.tip, kind: 'tip' });
      if (this.loadMass > C.MAX_LOAD) costs.push({ label: '過積載の反則金（' + this.loadMass + 'kg／最大' + C.MAX_LOAD + 'kg）', yen: C.OVERLOAD_FINE, kind: 'fine' });
      if (this.rescues > 0) costs.push({ label: 'ロードサービス ×' + this.rescues, yen: C.RESCUE_FEE * this.rescues, kind: 'rescue' });

      const totalIncome = income.reduce((s, l) => s + l.yen, 0);
      const totalCost = costs.reduce((s, l) => s + l.yen, 0);
      const profit = totalIncome - totalCost;
      const ratio = profit / st.fee;
      let rank;
      if (profit < 0) rank = 'X';
      else if (ratio >= 1.0 && counts.broken + counts.fallen + counts.left === 0) rank = 'S';
      else if (ratio >= 0.85) rank = 'A';
      else if (ratio >= 0.6) rank = 'B';
      else if (ratio >= 0.3) rank = 'C';
      else rank = 'D';
      return { income, costs, totalIncome, totalCost, profit, rank, counts, time: this.time, loadMass: this.loadMass, rescues: this.rescues, request: req };
    }

    /**
     * クリック配置の置き場所。
     * 低く収まる場所を基本に、下の荷物が潰れそうな場所・転がる物の上・鳥居より高くなる場所は避け、
     * ワレモノは布団の上を選びやすくする。最善ではないので、仕上げは手で直す前提。
     */
    bestPlacement(inst) {
      const spec = KT.TRUCK_SPEC;
      const d = inst.def;
      const fragile = d.tags.includes('fragile');
      const rule = d.tags.includes('noTilt') || d.tags.includes('tenchi');
      const rolls = d.tags.includes('rolls');
      const ta = this.truck.angle;
      let best = null;
      for (const ang of rule ? [0] : [0, Math.PI / 2]) {
        const w0 = ang ? d.h : d.w, h0 = ang ? d.w : d.h;
        for (let lx = spec.bedX0 + 0.06; lx <= spec.bedX1 - 0.04; lx += 0.04) {
          const w = this.truck.toWorld(lx, spec.bedTop + 0.05);
          const pos = this.findPlacement(inst, w.x, w.y, ang + ta);
          if (!pos) continue;
          const lp = this.truck.toLocal(planck.Vec2(pos.x, pos.y));
          if (lp.x - w0 / 2 < spec.bedX0 - 0.02 || lp.x + w0 / 2 > spec.bedX1 + 0.03) continue;
          const top = lp.y + h0 / 2;
          let score = top + lp.y * 0.6 - lp.x * 0.04 + (ang ? 0.03 : 0);
          const under = this.itemsBelow(inst, pos.x, pos.y, ang + ta);
          // 段差の揺れ（2.2倍）込みで、下の荷物（その下の下まで）の限界をこえそうなら避ける
          const added = d.mass * GRAV * 2.2;
          const seen = new Set();
          const check = (list, depth) => {
            for (const u of list) {
              if (seen.has(u)) continue;
              seen.add(u);
              if (u.def.crush < added + (u.load || 0)) score += 3;
              if (depth === 0 && u.def.tags.includes('rolls')) score += 1.5;
              if (depth < 4) {
                const up = u.body.getPosition();
                check(this.itemsBelow(u, up.x, up.y, u.body.getAngle()), depth + 1);
              }
            }
          };
          check(under, 0);
          if (fragile && under.some((u) => u.def.tags.includes('cushion'))) score -= 0.55;
          if (rolls) score += top * 0.8;
          if (top > spec.toriiTop) score += 2 + (top - spec.toriiTop) * 4;
          // さっき自動で置いて落ちた場所の近くは避ける
          if (inst.failedSpots) for (const f of inst.failedSpots) if (Math.abs(f.lx - lp.x) < 0.2 && Math.abs(f.ly - lp.y) < 0.25 && f.ang === ang) score += 6;
          // あおりより高いところで、後ろの端ぎりぎりは落ちやすい
          const bottom = lp.y - h0 / 2;
          if (bottom > spec.gateTop - 0.05 && lp.x - w0 / 2 < spec.bedX0 + 0.25) score += 0.8;
          // 下に支えがない（宙に浮いた）置き方や、重心が支えの外に出る置き方は崩れやすい
          if (bottom > spec.bedTop + 0.1) {
            if (under.length === 0) score += 1.5;
            else {
              let s0 = Infinity, s1 = -Infinity;
              const tmp = new planck.AABB();
              for (const u of under) {
                for (let f = u.body.getFixtureList(); f; f = f.getNext()) {
                  f.getShape().computeAABB(tmp, u.body.getTransform(), 0);
                  s0 = Math.min(s0, tmp.lowerBound.x);
                  s1 = Math.max(s1, tmp.upperBound.x);
                }
              }
              const margin = Math.min(0.08, w0 * 0.15);
              if (pos.x < s0 + margin || pos.x > s1 - margin) score += 4;
            }
          }
          if (!best || score < best.score) best = { score, x: pos.x, y: pos.y, ang: ang + ta, spot: { lx: lp.x, ly: lp.y, ang } };
        }
      }
      return best;
    }

    // ------------------------------------------------------------------
    // 検証・デバッグ用：重い順に、いちばん低く収まる場所へ落として積む
    // ------------------------------------------------------------------
    /**
     * 積む順番のおすすめ（荷物置き場の並び順）。
     * 重くて丈夫な物（重い順）→ 布団 → ワレモノ（高価な順。いい場所を先に取る）→ 転がる物。
     * 上から順に積めば、だいたい安定する。
     */
    static loadOrder(items) {
      const group = (it) => {
        const t = it.def.tags;
        if (t.includes('rolls')) return 3;
        if (t.includes('fragile')) return 2;
        if (t.includes('cushion')) return 1;
        return 0;
      };
      const key = (it) => (group(it) === 2 ? it.def.value / 1000 : it.def.mass);
      return items.slice().sort((a, b) => group(a) - group(b) || key(b) - key(a) || a.uid - b.uid);
    }

    /** 検証用：荷物置き場の上から順にクリックしたときの積み方 */
    clickLoad(order) {
      const list = order || Sim.loadOrder(this.items.filter((it) => it.state === 'tray'));
      for (const it of list) {
        if (it.state !== 'tray') continue;
        const best = this.bestPlacement(it);
        if (!best) continue;
        this.placeItem(it, best.x, best.y + 0.004, best.ang);
        it.autoSpot = best.spot;
        for (let i = 0; i < 60; i++) this.fixedStep(CONST.DT);
      }
    }

    autoLoad(opts = {}) {
      const S = KT.TRUCK_SPEC;
      const order = this.items.filter((it) => it.state === 'tray').sort((a, b) => b.def.mass - a.def.mass);
      for (const it of order) {
        let best = null;
        const angles = opts.angles || [0];
        for (const ang of angles) {
          for (let lx = S.bedX0 + 0.08; lx <= S.bedX1 - 0.05; lx += 0.04) {
            const w = this.truck.toWorld(lx, S.bedTop + 0.05);
            const pos = this.findPlacement(it, w.x, w.y, ang + this.truck.angle);
            if (!pos) continue;
            const lp = this.truck.toLocal(planck.Vec2(pos.x, pos.y));
            // 荷台からはみ出すものは避ける
            const half = it.def.w / 2;
            if (lp.x - half < S.bedX0 - 0.02 || lp.x + half > S.bedX1 + 0.02) continue;
            const score = lp.y - lp.x * 0.05;
            if (!best || score < best.score) best = { score, x: pos.x, y: pos.y + 0.01, ang };
          }
        }
        if (best) {
          this.placeItem(it, best.x, best.y, best.ang + this.truck.angle);
          for (let i = 0; i < 60; i++) this.fixedStep(CONST.DT);
        }
      }
    }
  }

  KT.Sim = Sim;
})(typeof window !== 'undefined' ? window : globalThis);
