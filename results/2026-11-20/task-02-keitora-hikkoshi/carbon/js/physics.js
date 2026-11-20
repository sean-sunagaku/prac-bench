(function (root) {
  'use strict';

  const getPlanck = () => {
    if (root.planck) return root.planck;
    if (typeof require === 'function') return require('planck');
    throw new Error('Planck.js physics library not found');
  };

  const getGameData = () => {
    if (root.GameData) return root.GameData;
    if (typeof require === 'function') return require('./data.js');
    throw new Error('GameData not found');
  };

  const CAT = {
    GROUND: 0x0001,
    TRUCK: 0x0002,
    WHEEL: 0x0004,
    CARGO: 0x0008,
    DROPPED: 0x0010
  };

  const TRUCK_SPEC = {
    bedCenterX: -0.26,
    bedCenterY: 0.0,
    bedHalfW: 1.16,
    bedHalfH: 0.08,       // Top surface at y = +0.08
    bedInnerMinX: -1.32,  // Inside rear tailgate
    bedInnerMaxX: 0.80,   // Inside front cab guard (鳥居)
    bedTopY: 0.08,
    tailgateX: -1.37,
    tailgateHalfW: 0.05,
    tailgateHalfH: 0.24,  // Rises from y=0.08 to y=0.56 (0.48m height)
    toriiX: 0.85,
    toriiHalfW: 0.05,
    toriiHalfH: 0.70,     // Rises from y=0.08 to y=1.48
    rearWheelX: -0.86,
    frontWheelX: 1.28,
    wheelY: -0.36,
    wheelRadius: 0.34,
    hooks: [
      { id: 0, name: '鳥居・上', x: 0.80, y: 1.42 },
      { id: 1, name: '鳥居・中', x: 0.80, y: 0.74 },
      { id: 2, name: '荷台中央', x: -0.26, y: 0.10 },
      { id: 3, name: '後部あおり', x: -1.35, y: 0.54 }
    ]
  };

  function wrapAngle(rad) {
    while (rad > Math.PI) rad -= Math.PI * 2;
    while (rad < -Math.PI) rad += Math.PI * 2;
    return rad;
  }

  function createChamferedBoxVertices(pl, hx, hy, cx, cy, bevel) {
    const b = Math.min(bevel || 0.014, hx * 0.25, hy * 0.25);
    return [
      pl.Vec2(cx - hx + b, cy - hy),
      pl.Vec2(cx + hx - b, cy - hy),
      pl.Vec2(cx + hx, cy - hy + b),
      pl.Vec2(cx + hx, cy + hy - b),
      pl.Vec2(cx + hx - b, cy + hy),
      pl.Vec2(cx - hx + b, cy + hy),
      pl.Vec2(cx - hx, cy + hy - b),
      pl.Vec2(cx - hx, cy - hy + b)
    ];
  }

  function getCargoLocalPolygons(typeSpec) {
    const w = typeSpec.width;
    const h = typeSpec.height;
    const hx = w / 2;
    const hy = h / 2;

    if (typeSpec.shape === 'l_sofa') {
      const sh = typeSpec.seatHeight || 0.32;
      const bw = typeSpec.backWidth || 0.24;
      return [
        [
          { x: -hx + 0.01, y: -hy },
          { x: hx - 0.01, y: -hy },
          { x: hx, y: -hy + 0.01 },
          { x: hx, y: -hy + sh },
          { x: -hx, y: -hy + sh },
          { x: -hx, y: -hy + 0.01 }
        ],
        [
          { x: -hx, y: -hy + sh - 0.01 },
          { x: -hx + bw, y: -hy + sh - 0.01 },
          { x: -hx + bw, y: hy - 0.02 },
          { x: -hx + bw - 0.02, y: hy },
          { x: -hx + 0.02, y: hy },
          { x: -hx, y: hy - 0.02 }
        ]
      ];
    }

    if (typeSpec.shape === 'plant') {
      const potBottomW = w * 0.56;
      const potTopW = w * 0.74;
      const potH = h * 0.42;
      return [
        [
          { x: -potBottomW / 2, y: -hy },
          { x: potBottomW / 2, y: -hy },
          { x: potTopW / 2, y: -hy + potH },
          { x: -potTopW / 2, y: -hy + potH }
        ],
        [
          { x: -hx * 0.72, y: -hy + potH - 0.02 },
          { x: hx * 0.72, y: -hy + potH - 0.02 },
          { x: hx, y: 0.06 },
          { x: hx * 0.65, y: hy },
          { x: -hx * 0.65, y: hy },
          { x: -hx, y: 0.06 }
        ]
      ];
    }

    if (typeSpec.shape === 'vase') {
      return [
        [
          { x: -hx * 0.58, y: -hy },
          { x: hx * 0.58, y: -hy },
          { x: hx, y: -hy * 0.25 },
          { x: hx * 0.92, y: hy * 0.38 },
          { x: hx * 0.52, y: hy },
          { x: -hx * 0.52, y: hy },
          { x: -hx * 0.92, y: hy * 0.38 },
          { x: -hx, y: -hy * 0.25 }
        ]
      ];
    }

    const b = Math.min(0.015, hx * 0.22, hy * 0.22);
    return [
      [
        { x: -hx + b, y: -hy },
        { x: hx - b, y: -hy },
        { x: hx, y: -hy + b },
        { x: hx, y: hy - b },
        { x: hx - b, y: hy },
        { x: -hx + b, y: hy },
        { x: -hx, y: hy - b },
        { x: -hx, y: -hy + b }
      ]
    ];
  }

  function polygonArea(pts) {
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    return Math.abs(area) * 0.5;
  }

  class PhysicsSimulation {
    constructor(stageSpec, callbacks) {
      const pl = getPlanck();
      this.pl = pl;
      this.stage = stageSpec;
      this.callbacks = callbacks || {};
      this.phase = 'LOADING';
      this.time = 0;
      this.driveTime = 0;
      this._smoothThrottle = 0;

      this.world = new pl.World({
        gravity: pl.Vec2(0, -9.8)
      });

      this.cargoItems = [];
      this.ropes = [];
      this.controls = { throttle: 0, brake: 0, handbrake: false };
      this.towRecoverCount = 0;
      this._flippedTimer = 0;

      this._buildTerrain();
      this._buildTruck();
      this._setupContactListeners();
    }

    _buildTerrain() {
      const pl = this.pl;
      const ground = this.world.createBody({ type: 'static', position: pl.Vec2(0, 0) });
      const vecs = this.stage.terrain.map((p) => pl.Vec2(p.x, p.y));
      ground.createFixture(pl.Chain(vecs, false), {
        friction: 1.15,
        restitution: 0.02,
        filterCategoryBits: CAT.GROUND,
        filterMaskBits: CAT.TRUCK | CAT.WHEEL | CAT.CARGO | CAT.DROPPED
      });
      ground.setUserData({ kind: 'ground' });
      this.groundBody = ground;
    }

    getTerrainYAt(x) {
      const pts = this.stage.terrain;
      if (x <= pts[0].x) return pts[0].y;
      if (x >= pts[pts.length - 1].x) return pts[pts.length - 1].y;
      let lo = 0;
      let hi = pts.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (pts[mid].x <= x) lo = mid;
        else hi = mid;
      }
      const p0 = pts[lo];
      const p1 = pts[hi];
      const span = p1.x - p0.x;
      if (span <= 1e-6) return p0.y;
      const t = (x - p0.x) / span;
      return p0.y + (p1.y - p0.y) * t;
    }

    _buildTruck() {
      const pl = this.pl;
      const startX = 2.5;
      const groundY = this.getTerrainYAt(startX);
      const spawnY = groundY + 0.74;

      const chassis = this.world.createBody({
        type: 'dynamic',
        position: pl.Vec2(startX, spawnY),
        angularDamping: 1.4,
        linearDamping: 0.06,
        bullet: true
      });
      chassis.setUserData({ kind: 'truck_chassis' });

      chassis.createFixture(
        pl.Polygon(createChamferedBoxVertices(pl, TRUCK_SPEC.bedHalfW, TRUCK_SPEC.bedHalfH, TRUCK_SPEC.bedCenterX, TRUCK_SPEC.bedCenterY, 0.02)),
        {
          density: 85,
          friction: 0.84,
          restitution: 0.03,
          filterCategoryBits: CAT.TRUCK,
          filterMaskBits: CAT.GROUND | CAT.CARGO,
          userData: { part: 'bed', cushion: 0.0 }
        }
      );

      chassis.createFixture(
        pl.Polygon(createChamferedBoxVertices(pl, TRUCK_SPEC.tailgateHalfW, TRUCK_SPEC.tailgateHalfH, TRUCK_SPEC.tailgateX, 0.32, 0.015)),
        {
          density: 45,
          friction: 0.58,
          restitution: 0.05,
          filterCategoryBits: CAT.TRUCK,
          filterMaskBits: CAT.GROUND | CAT.CARGO,
          userData: { part: 'tailgate', cushion: 0.0 }
        }
      );

      chassis.createFixture(
        pl.Polygon(createChamferedBoxVertices(pl, TRUCK_SPEC.toriiHalfW, TRUCK_SPEC.toriiHalfH, TRUCK_SPEC.toriiX, 0.78, 0.015)),
        {
          density: 45,
          friction: 0.62,
          restitution: 0.04,
          filterCategoryBits: CAT.TRUCK,
          filterMaskBits: CAT.GROUND | CAT.CARGO,
          userData: { part: 'torii', cushion: 0.0 }
        }
      );

      const cabVerts = [
        pl.Vec2(0.88, -0.08),
        pl.Vec2(1.80, -0.06),
        pl.Vec2(1.84, 0.66),
        pl.Vec2(1.54, 1.40),
        pl.Vec2(0.88, 1.42)
      ];
      chassis.createFixture(pl.Polygon(cabVerts), {
        density: 145,
        friction: 0.5,
        restitution: 0.05,
        filterCategoryBits: CAT.TRUCK,
        filterMaskBits: CAT.GROUND | CAT.CARGO,
        userData: { part: 'cab', cushion: 0.0 }
      });

      const makeWheel = (lx, ly, freqHz) => {
        const wheel = this.world.createBody({
          type: 'dynamic',
          position: pl.Vec2(startX + lx, spawnY + ly),
          angularDamping: 0.35,
          bullet: true
        });
        wheel.setUserData({ kind: 'truck_wheel' });
        wheel.createFixture(pl.Circle(TRUCK_SPEC.wheelRadius), {
          density: 76,
          friction: 1.45,
          restitution: 0.05,
          filterCategoryBits: CAT.WHEEL,
          filterMaskBits: CAT.GROUND
        });

        const joint = this.world.createJoint(
          pl.WheelJoint(
            {
              enableMotor: true,
              maxMotorTorque: 600,
              motorSpeed: 0,
              frequencyHz: freqHz,
              dampingRatio: 0.72
            },
            chassis,
            wheel,
            wheel.getPosition(),
            pl.Vec2(0, 1)
          )
        );
        return { wheel, joint };
      };

      const rear = makeWheel(TRUCK_SPEC.rearWheelX, TRUCK_SPEC.wheelY, 5.2);
      const front = makeWheel(TRUCK_SPEC.frontWheelX, TRUCK_SPEC.wheelY, 5.5);

      this.truck = {
        chassis,
        rearWheel: rear.wheel,
        frontWheel: front.wheel,
        rearJoint: rear.joint,
        frontJoint: front.joint
      };

      for (let i = 0; i < 45; i++) {
        rear.joint.setMotorSpeed(0);
        rear.joint.setMaxMotorTorque(600);
        front.joint.setMotorSpeed(0);
        front.joint.setMaxMotorTorque(600);
        this.world.step(1 / 60, 10, 8);
      }
      chassis.setLinearVelocity(pl.Vec2(0, 0));
      chassis.setAngularVelocity(0);
      rear.wheel.setLinearVelocity(pl.Vec2(0, 0));
      rear.wheel.setAngularVelocity(0);
      front.wheel.setLinearVelocity(pl.Vec2(0, 0));
      front.wheel.setAngularVelocity(0);
    }

    addCargoItem(instanceId, typeId, worldX, worldY, angleRad) {
      const pl = this.pl;
      const GameData = getGameData();
      const spec = GameData.CARGO_TYPES[typeId];
      if (!spec) throw new Error('Unknown cargo type: ' + typeId);

      this.removeCargoItem(instanceId);

      const polys = getCargoLocalPolygons(spec);
      let totalArea = 0;
      const areas = polys.map((pts) => {
        const a = polygonArea(pts);
        totalArea += a;
        return a;
      });

      const body = this.world.createBody({
        type: 'dynamic',
        position: pl.Vec2(worldX, worldY),
        angle: angleRad || 0,
        linearDamping: 0.08,
        angularDamping: 0.35,
        bullet: true
      });

      polys.forEach((pts, idx) => {
        let densityScale = 1.0;
        if (spec.shape === 'plant') {
          const potFrac = 0.72;
          densityScale = idx === 0
            ? (potFrac * totalArea) / Math.max(0.001, areas[0])
            : ((1 - potFrac) * totalArea) / Math.max(0.001, areas[1]);
        }
        const baseDensity = spec.mass / Math.max(0.01, totalArea);
        const vecs = pts.map((p) => pl.Vec2(p.x, p.y));
        body.createFixture(pl.Polygon(vecs), {
          density: baseDensity * densityScale,
          friction: spec.friction,
          restitution: spec.restitution,
          filterCategoryBits: CAT.CARGO,
          filterMaskBits: CAT.GROUND | CAT.TRUCK | CAT.CARGO,
          userData: {
            kind: 'cargo_fixture',
            instanceId,
            cushion: spec.cushion || 0
          }
        });
      });

      const item = {
        id: instanceId,
        typeId,
        spec,
        body,
        hp: spec.maxHp,
        maxHp: spec.maxHp,
        dropped: false,
        broken: false,
        overloaded: false,
        loadAboveKg: 0,
        tiltedBadly: false,
        tiltTimer: 0,
        lastImpactTime: -1,
        damageLog: { impact: 0, crush: 0, tilt: 0 },
        localPolys: polys
      };

      body.setUserData({ kind: 'cargo', item });
      this.cargoItems.push(item);
      return item;
    }

    removeCargoItem(instanceId) {
      const idx = this.cargoItems.findIndex((c) => c.id === instanceId);
      if (idx >= 0) {
        const item = this.cargoItems[idx];
        if (item.body) {
          this.world.destroyBody(item.body);
        }
        this.cargoItems.splice(idx, 1);
      }
    }

    getCargoItem(instanceId) {
      return this.cargoItems.find((c) => c.id === instanceId) || null;
    }

    addRope(hookIdA, hookIdB) {
      if (hookIdA === hookIdB) return null;
      const exists = this.ropes.find(
        (r) => !r.snapped && ((r.hookA === hookIdA && r.hookB === hookIdB) || (r.hookA === hookIdB && r.hookB === hookIdA))
      );
      if (exists) return exists;

      const rope = {
        id: 'rope_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        hookA: hookIdA,
        hookB: hookIdB,
        restLength: 0,
        currentLength: 0,
        tension: 0,
        maxTension: 3100,
        snapped: false,
        points: []
      };
      this.ropes.push(rope);
      this._updateSingleRopeGeometry(rope, false);
      rope.restLength = Math.max(0.25, rope.currentLength * 0.995);
      return rope;
    }

    clearRopes() {
      this.ropes = [];
    }

    removeRope(ropeId) {
      this.ropes = this.ropes.filter((r) => r.id !== ropeId);
    }

    refitRopesForLoading() {
      for (const rope of this.ropes) {
        if (rope.snapped) continue;
        this._updateSingleRopeGeometry(rope, false);
        rope.restLength = Math.max(0.25, rope.currentLength * 0.995);
        rope.tension = 0;
      }
    }

    getHookWorldPoint(hookId) {
      const h = TRUCK_SPEC.hooks[hookId];
      return this.truck.chassis.getWorldPoint(this.pl.Vec2(h.x, h.y));
    }

    _updateSingleRopeGeometry(rope, applyForces) {
      const pl = this.pl;
      const chassis = this.truck.chassis;
      const hA = TRUCK_SPEC.hooks[rope.hookA];
      const hB = TRUCK_SPEC.hooks[rope.hookB];

      let leftHook = hA;
      let rightHook = hB;
      if (hA.x > hB.x) {
        leftHook = hB;
        rightHook = hA;
      }

      const candidates = [];
      const minX = leftHook.x - 0.14;
      const maxX = rightHook.x + 0.14;
      const dxChord = rightHook.x - leftHook.x;

      for (const item of this.cargoItems) {
        if (item.dropped || !item.body || !item.body.isActive()) continue;
        if (item.isDragging) continue;

        for (const poly of item.localPolys) {
          for (const v of poly) {
            const wp = item.body.getWorldPoint(pl.Vec2(v.x, v.y));
            const lp = chassis.getLocalPoint(wp);
            if (lp.x < minX || lp.x > maxX) continue;
            const t = Math.abs(dxChord) > 1e-4 ? Math.max(0, Math.min(1, (lp.x - leftHook.x) / dxChord)) : 0.5;
            const chordY = leftHook.y + (rightHook.y - leftHook.y) * t;
            if (lp.y > chordY - 0.01) {
              candidates.push({
                x: lp.x,
                y: lp.y,
                worldPoint: wp,
                item
              });
            }
          }
        }
      }

      const startNode = { x: leftHook.x, y: leftHook.y, worldPoint: chassis.getWorldPoint(pl.Vec2(leftHook.x, leftHook.y)), item: null };
      const endNode = { x: rightHook.x, y: rightHook.y, worldPoint: chassis.getWorldPoint(pl.Vec2(rightHook.x, rightHook.y)), item: null };

      candidates.sort((a, b) => (a.x !== b.x ? a.x - b.x : b.y - a.y));
      const allPts = [startNode, ...candidates, endNode];

      const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
      const upper = [];
      for (const p of allPts) {
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) >= 0) {
          if (upper.length - 1 === 0) break;
          upper.pop();
        }
        upper.push(p);
      }

      if (upper[0] !== startNode) upper.unshift(startNode);
      if (upper[upper.length - 1] !== endNode) upper.push(endNode);

      let totalLen = 0;
      for (let i = 0; i < upper.length - 1; i++) {
        const dx = upper[i + 1].worldPoint.x - upper[i].worldPoint.x;
        const dy = upper[i + 1].worldPoint.y - upper[i].worldPoint.y;
        totalLen += Math.hypot(dx, dy);
      }

      rope.currentLength = totalLen;
      rope.points = upper.map((n) => ({ x: n.worldPoint.x, y: n.worldPoint.y, item: n.item }));

      if (!applyForces || rope.snapped || rope.restLength <= 0) {
        if (!applyForces) rope.tension = 0;
        return;
      }

      const stretch = totalLen - rope.restLength;
      if (stretch <= 0) {
        rope.tension = 0;
        return;
      }

      const stiffness = 2350;
      const tension = stretch * stiffness;
      rope.tension = tension;

      if (tension > rope.maxTension && this.phase === 'DRIVING') {
        rope.snapped = true;
        rope.tension = 0;
        if (this.callbacks.onRopeSnap) {
          const midPt = upper[Math.floor(upper.length / 2)].worldPoint;
          this.callbacks.onRopeSnap(rope, { x: midPt.x, y: midPt.y });
        }
        return;
      }

      for (let i = 1; i < upper.length - 1; i++) {
        const node = upper[i];
        if (!node.item || !node.item.body) continue;
        const pPrev = upper[i - 1].worldPoint;
        const pCurr = node.worldPoint;
        const pNext = upper[i + 1].worldPoint;

        const d1x = pPrev.x - pCurr.x;
        const d1y = pPrev.y - pCurr.y;
        const len1 = Math.hypot(d1x, d1y) || 1e-4;

        const d2x = pNext.x - pCurr.x;
        const d2y = pNext.y - pCurr.y;
        const len2 = Math.hypot(d2x, d2y) || 1e-4;

        const fx = tension * (d1x / len1 + d2x / len2);
        const fy = tension * (d1y / len1 + d2y / len2);

        const vCargo = node.item.body.getLinearVelocityFromWorldPoint(pCurr);
        const vTruck = chassis.getLinearVelocityFromWorldPoint(pCurr);
        const dampX = -(vCargo.x - vTruck.x) * 32;
        const dampY = -(vCargo.y - vTruck.y) * 32;

        const forceVec = pl.Vec2(fx + dampX, fy + dampY);
        const reactVec = pl.Vec2(-(fx + dampX), -(fy + dampY));
        node.item.body.applyForce(forceVec, pCurr, true);
        chassis.applyForce(reactVec, pCurr, true);
      }
    }

    _setupContactListeners() {
      this.world.on('post-solve', (contact, impulse) => {
        if (!impulse || !impulse.normalImpulses || impulse.normalImpulses.length === 0) return;

        let maxNormal = 0;
        for (let i = 0; i < impulse.normalImpulses.length; i++) {
          if (impulse.normalImpulses[i] > maxNormal) maxNormal = impulse.normalImpulses[i];
        }
        if (maxNormal <= 0.1) return;

        const fA = contact.getFixtureA();
        const fB = contact.getFixtureB();
        const bA = fA.getBody();
        const bB = fB.getBody();
        const udA = bA.getUserData() || {};
        const udB = bB.getUserData() || {};
        const fudA = fA.getUserData() || {};
        const fudB = fB.getUserData() || {};

        if (this.phase === 'DRIVING') {
          if (udA.kind === 'cargo' && udB.kind === 'ground') {
            this._markCargoDropped(udA.item, bA.getPosition());
            return;
          }
          if (udB.kind === 'cargo' && udA.kind === 'ground') {
            this._markCargoDropped(udB.item, bB.getPosition());
            return;
          }
        }

        const worldManifold = contact.getWorldManifold(null);
        const normal = worldManifold ? worldManifold.normal : null;

        if (normal) {
          if (normal.y > 0.45 && udA.kind === 'cargo' && udB.kind === 'cargo') {
            udA.item._frameSupportImpulse = (udA.item._frameSupportImpulse || 0) + maxNormal * normal.y;
          } else if (normal.y < -0.45 && udB.kind === 'cargo' && udA.kind === 'cargo') {
            udB.item._frameSupportImpulse = (udB.item._frameSupportImpulse || 0) + maxNormal * (-normal.y);
          }
        }

        if (this.phase !== 'DRIVING') return;

        const worldPt = worldManifold && worldManifold.points && worldManifold.points[0]
          ? worldManifold.points[0]
          : null;

        if (udA.kind === 'cargo') {
          const otherCushion = fudB.cushion || 0;
          this._processCargoImpact(udA.item, maxNormal, otherCushion, worldPt);
        }
        if (udB.kind === 'cargo') {
          const otherCushion = fudA.cushion || 0;
          this._processCargoImpact(udB.item, maxNormal, otherCushion, worldPt);
        }
      });
    }

    _processCargoImpact(item, normalImpulse, neighborCushion, worldPt) {
      if (!item || item.dropped || item.broken) return;
      if (this.time - item.lastImpactTime < 0.18) return;

      const shock = normalImpulse / item.spec.mass;
      const bestCushion = Math.max(neighborCushion || 0, item._activeCushionBonus || 0);
      const effectiveShock = shock * (1 - bestCushion * 0.85);

      if (effectiveShock <= item.spec.safeShock) return;

      const rawDmg = (effectiveShock - item.spec.safeShock) * item.spec.damageScale;
      if (rawDmg < 1.2) return;

      item.lastImpactTime = this.time;
      this._applyDamageToItem(item, rawDmg, 'impact', worldPt || item.body.getPosition());
    }

    _applyDamageToItem(item, amount, reason, worldPos) {
      if (item.dropped || item.broken || amount <= 0) return;
      const prevHp = item.hp;
      item.hp = Math.max(0, item.hp - amount);
      const actualDmg = prevHp - item.hp;
      item.damageLog[reason] = (item.damageLog[reason] || 0) + actualDmg;

      if (item.hp <= 0.01) {
        item.hp = 0;
        item.broken = true;
      }

      if (this.callbacks.onCargoDamage) {
        this.callbacks.onCargoDamage(item, actualDmg, reason, worldPos || item.body.getPosition());
      }
    }

    _markCargoDropped(item, worldPos) {
      if (!item || item.dropped) return;
      item.dropped = true;
      item.hp = 0;
      item.broken = true;

      for (let f = item.body.getFixtureList(); f; f = f.getNext()) {
        f.setFilterData({
          categoryBits: CAT.DROPPED,
          maskBits: CAT.GROUND | CAT.DROPPED,
          groupIndex: 0
        });
      }

      if (this.callbacks.onCargoDropped) {
        this.callbacks.onCargoDropped(item, worldPos || item.body.getPosition());
      }
    }

    computePackingMetrics() {
      const chassis = this.truck.chassis;
      const pl = this.pl;
      let cargoMass = 0;
      let sumLX = 0;
      let sumLY = 0;

      for (const item of this.cargoItems) {
        if (item.dropped || item.isDragging || !item.body) continue;
        const wc = item.body.getWorldCenter();
        const lc = chassis.getLocalPoint(wc);
        if (lc.x < -2.2 || lc.x > 2.2 || lc.y < -0.5) continue;
        cargoMass += item.spec.mass;
        sumLX += lc.x * item.spec.mass;
        sumLY += lc.y * item.spec.mass;
      }

      if (cargoMass <= 0) {
        return {
          cargoMass: 0,
          cogLocal: { x: -0.2, y: 0.25 },
          cogWorld: chassis.getWorldPoint(pl.Vec2(-0.2, 0.25)),
          heightNorm: 0,
          rearBiasNorm: 0,
          stabilityScore: 100,
          status: 'empty',
          label: '荷物を積んでください'
        };
      }

      const cogLX = sumLX / cargoMass;
      const cogLY = sumLY / cargoMass;
      const cogWorld = chassis.getWorldPoint(pl.Vec2(cogLX, cogLY));

      const heightNorm = Math.max(0, Math.min(1, (cogLY - 0.42) / 0.78));
      const rearBiasNorm = Math.max(0, Math.min(1, (-0.35 - cogLX) / 0.72));
      const penalty = heightNorm * 58 + rearBiasNorm * 42;
      const stabilityScore = Math.round(Math.max(5, Math.min(100, 100 - penalty)));

      let status = 'good';
      let label = '重心：低くて安定◎';
      if (stabilityScore < 48) {
        status = 'danger';
        label = heightNorm >= rearBiasNorm ? '危険：重心が高すぎ！' : '危険：後ろ荷重すぎ！';
      } else if (stabilityScore < 74) {
        status = 'warn';
        label = heightNorm >= rearBiasNorm ? '注意：やや高重心' : '注意：やや後ろ寄り';
      }

      return {
        cargoMass,
        cogLocal: { x: cogLX, y: cogLY },
        cogWorld: { x: cogWorld.x, y: cogWorld.y },
        heightNorm,
        rearBiasNorm,
        stabilityScore,
        status,
        label
      };
    }

    startDriving() {
      this.phase = 'DRIVING';
      this.driveTime = 0;
      this._smoothThrottle = 0;
      this.towRecoverCount = 0;
      this._flippedTimer = 0;
      this.refitRopesForLoading();
      this.initialPackingMetrics = this.computePackingMetrics();
      this.initialCushionedCount = this._countCushionedFragiles();
    }

    isTruckFlippedOrStuck() {
      if (this.phase !== 'DRIVING') return false;
      return this._flippedTimer > 0.95;
    }

    emergencyRecoverTruck() {
      const pl = this.pl;
      const chassis = this.truck.chassis;
      const curPos = chassis.getPosition();

      // Record cargo local positions relative to chassis before uprighting
      const savedCargo = [];
      for (const item of this.cargoItems) {
        if (item.dropped || !item.body) continue;
        const lp = chassis.getLocalPoint(item.body.getPosition());
        const la = wrapAngle(item.body.getAngle() - chassis.getAngle());
        if (lp.x >= -1.8 && lp.x <= 1.3 && lp.y >= -0.2 && lp.y <= 2.6) {
          savedCargo.push({
            item,
            lx: Math.max(-1.18, Math.min(0.65, lp.x)),
            ly: Math.max(0.32, Math.min(1.95, lp.y)),
            la
          });
        }
      }

      const safeX = Math.max(2.5, Math.min(this.stage.goalX - 3.0, curPos.x - 0.6));
      const safeY = this.getTerrainYAt(safeX) + 0.80;

      chassis.setTransform(pl.Vec2(safeX, safeY), 0);
      chassis.setLinearVelocity(pl.Vec2(0, 0));
      chassis.setAngularVelocity(0);

      this.truck.rearWheel.setTransform(pl.Vec2(safeX + TRUCK_SPEC.rearWheelX, safeY + TRUCK_SPEC.wheelY), 0);
      this.truck.rearWheel.setLinearVelocity(pl.Vec2(0, 0));
      this.truck.rearWheel.setAngularVelocity(0);

      this.truck.frontWheel.setTransform(pl.Vec2(safeX + TRUCK_SPEC.frontWheelX, safeY + TRUCK_SPEC.wheelY), 0);
      this.truck.frontWheel.setLinearVelocity(pl.Vec2(0, 0));
      this.truck.frontWheel.setAngularVelocity(0);

      for (const sc of savedCargo) {
        const wp = chassis.getWorldPoint(pl.Vec2(sc.lx, sc.ly));
        sc.item.body.setTransform(wp, sc.la);
        sc.item.body.setLinearVelocity(pl.Vec2(0, 0));
        sc.item.body.setAngularVelocity(0);
      }

      this._flippedTimer = 0;
      this._smoothThrottle = 0;
      this.towRecoverCount = (this.towRecoverCount || 0) + 1;
    }

    _countCushionedFragiles() {
      let count = 0;
      for (const item of this.cargoItems) {
        if (item.spec.category === 'fragile' && (item._activeCushionBonus || 0) >= 0.2) {
          count++;
        }
      }
      return count;
    }

    step(dt) {
      const fixedDt = Math.min(dt, 1 / 50);
      this.time += fixedDt;

      for (const item of this.cargoItems) {
        item._frameSupportImpulse = 0;
        item._activeCushionBonus = 0;
      }

      if (this.phase === 'LOADING') {
        this.truck.rearJoint.setMotorSpeed(0);
        this.truck.rearJoint.setMaxMotorTorque(850);
        this.truck.frontJoint.setMotorSpeed(0);
        this.truck.frontJoint.setMaxMotorTorque(850);
        const pos = this.truck.chassis.getPosition();
        const vx = this.truck.chassis.getLinearVelocity().x;
        this.truck.chassis.applyForceToCenter(this.pl.Vec2((2.5 - pos.x) * 900 - vx * 350, 0), true);
      } else if (this.phase === 'DRIVING') {
        this.driveTime += fixedDt;
        this._applyDrivingControls();
      } else if (this.phase === 'GOAL') {
        this.truck.rearJoint.setMotorSpeed(0);
        this.truck.rearJoint.setMaxMotorTorque(950);
        this.truck.frontJoint.setMotorSpeed(0);
        this.truck.frontJoint.setMaxMotorTorque(950);
      }

      for (const rope of this.ropes) {
        if (!rope.snapped) {
          this._updateSingleRopeGeometry(rope, this.phase === 'DRIVING');
        }
      }

      this.world.step(fixedDt, 10, 8);

      this._postStepCargoInspection(fixedDt);

      if (this.phase === 'DRIVING') {
        const chassisAng = Math.abs(wrapAngle(this.truck.chassis.getAngle()));
        if (chassisAng > 1.12) {
          this._flippedTimer += fixedDt;
        } else {
          this._flippedTimer = Math.max(0, this._flippedTimer - fixedDt * 2.0);
        }

        const truckX = this.truck.chassis.getPosition().x;
        if (truckX >= this.stage.goalX) {
          this.phase = 'GOAL';
          if (this.callbacks.onReachGoal) {
            this.callbacks.onReachGoal();
          }
        }
      }
    }

    _applyDrivingControls() {
      const { throttle, brake, handbrake } = this.controls;
      const chassis = this.truck.chassis;
      const vel = chassis.getLinearVelocity();
      const speed = vel.x;
      const ang = wrapAngle(chassis.getAngle());

      const dt = 1 / 60;
      const targetThr = handbrake || brake > 0 ? 0 : throttle;
      if (targetThr > this._smoothThrottle) {
        this._smoothThrottle = Math.min(targetThr, this._smoothThrottle + dt * 2.4);
      } else {
        this._smoothThrottle = Math.max(targetThr, this._smoothThrottle - dt * 5.0);
      }

      const maxOmega = 31.0;
      let targetMotorSpeed = 0;
      let totalMotorTorque = 55;

      if (handbrake) {
        targetMotorSpeed = 0;
        totalMotorTorque = 760;
      } else if (this._smoothThrottle > 0.01 && brake <= 0) {
        const currentWheelOmega = Math.max(0, -this.truck.rearWheel.getAngularVelocity());
        const progressiveOmega = Math.min(maxOmega * this._smoothThrottle, currentWheelOmega + 9.5);
        targetMotorSpeed = -progressiveOmega;

        const uphillBoost = Math.max(0, Math.sin(ang)) * 420;
        totalMotorTorque = (540 + uphillBoost) * this._smoothThrottle;
      } else if (brake > 0) {
        if (speed > 0.45) {
          targetMotorSpeed = 0;
          totalMotorTorque = 680 * brake;
        } else {
          targetMotorSpeed = 8.5 * brake;
          totalMotorTorque = 460 * brake;
        }
      } else {
        targetMotorSpeed = 0;
        totalMotorTorque = 50;
      }

      this.truck.rearJoint.setMotorSpeed(targetMotorSpeed);
      this.truck.rearJoint.setMaxMotorTorque(totalMotorTorque * 0.58);
      this.truck.frontJoint.setMotorSpeed(targetMotorSpeed);
      this.truck.frontJoint.setMaxMotorTorque(totalMotorTorque * 0.42);

      if (Math.abs(ang) > 0.62) {
        chassis.applyTorque(-ang * 1400 - chassis.getAngularVelocity() * 450, true);
      }
    }

    _postStepCargoInspection(dt) {
      const chassis = this.truck.chassis;
      const truckPos = chassis.getPosition();

      for (const item of this.cargoItems) {
        if (item.dropped || item.isDragging || !item.body) continue;

        let bestCushionUnder = 0;
        for (let ce = item.body.getContactList(); ce; ce = ce.next) {
          const contact = ce.contact;
          if (!contact.isTouching()) continue;
          const otherBody = ce.other;
          const otherUd = otherBody.getUserData() || {};
          if (otherUd.kind === 'cargo' && otherUd.item) {
            const otherC = otherUd.item.spec.cushion || 0;
            if (otherC > bestCushionUnder) bestCushionUnder = otherC;
          }
        }
        item._activeCushionBonus = bestCushionUnder;

        const rawSupportedKg = (item._frameSupportImpulse || 0) / (9.8 * Math.max(dt, 1 / 120));
        item.loadAboveKg = item.loadAboveKg * 0.78 + rawSupportedKg * 0.22;
        item.overloaded = item.loadAboveKg > item.spec.crushLimitKg;

        const itemAng = Math.abs(wrapAngle(item.body.getAngle()));
        item.tiltedBadly = item.spec.thisSideUp && itemAng > 0.95;

        if (this.phase === 'LOADING') {
          const wp = item.body.getPosition();
          const lp = chassis.getLocalPoint(wp);
          const gy = this.getTerrainYAt(wp.x);
          if (wp.y < gy + 0.28 || lp.x < -1.95 || lp.x > 1.95) {
            if (this.callbacks.onLoadingItemFellOff) {
              this.callbacks.onLoadingItemFellOff(item);
            }
          }
          continue;
        }

        if (this.phase === 'DRIVING') {
          if (item.loadAboveKg > item.spec.crushLimitKg * 1.08 && !item.broken) {
            const excessRatio = (item.loadAboveKg - item.spec.crushLimitKg) / item.spec.crushLimitKg;
            const crushRate = Math.min(26, 5.5 + excessRatio * 14);
            this._applyDamageToItem(item, crushRate * dt, 'crush', item.body.getPosition());
          }

          if (item.spec.thisSideUp && itemAng > 1.05 && !item.broken) {
            item.tiltTimer += dt;
            if (item.tiltTimer > 0.45) {
              this._applyDamageToItem(item, 13 * dt, 'tilt', item.body.getPosition());
            }
          } else {
            item.tiltTimer = Math.max(0, item.tiltTimer - dt * 2);
          }

          const wp = item.body.getPosition();
          const gy = this.getTerrainYAt(wp.x);
          if (wp.y < gy - 0.5 || Math.abs(wp.x - truckPos.x) > 5.5) {
            this._markCargoDropped(item, wp);
          }
        }
      }

      for (const rope of this.ropes) {
        if (!rope.snapped && this.phase !== 'DRIVING') {
          this._updateSingleRopeGeometry(rope, false);
        }
      }
    }

    checkPlacementOverlap(typeSpec, worldX, worldY, angleRad, ignoreInstanceId) {
      const pl = this.pl;
      const polys = getCargoLocalPolygons(typeSpec);
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);

      const toWorld = (p) => ({
        x: worldX + p.x * cos - p.y * sin,
        y: worldY + p.x * sin + p.y * cos
      });

      const candidatePolys = polys.map((pts) =>
        pts.map((p) => toWorld({ x: p.x * 0.96, y: p.y * 0.96 }))
      );

      const chassis = this.truck.chassis;
      const centerLocal = chassis.getLocalPoint(pl.Vec2(worldX, worldY));
      const inLoadingZone =
        centerLocal.x >= -1.42 &&
        centerLocal.x <= 0.85 &&
        centerLocal.y >= 0.14 &&
        centerLocal.y <= 2.35;

      if (!inLoadingZone) {
        return { valid: false, reason: 'out_of_zone' };
      }

      const obstacles = [];
      const addTruckRect = (cx, cy, hw, hh) => {
        const corners = [
          { x: cx - hw, y: cy - hh },
          { x: cx + hw, y: cy - hh },
          { x: cx + hw, y: cy + hh },
          { x: cx - hw, y: cy + hh }
        ].map((c) => {
          const wp = chassis.getWorldPoint(pl.Vec2(c.x, c.y));
          return { x: wp.x, y: wp.y };
        });
        obstacles.push(corners);
      };

      addTruckRect(TRUCK_SPEC.bedCenterX, TRUCK_SPEC.bedCenterY, TRUCK_SPEC.bedHalfW, TRUCK_SPEC.bedHalfH);
      addTruckRect(TRUCK_SPEC.tailgateX, 0.32, TRUCK_SPEC.tailgateHalfW, TRUCK_SPEC.tailgateHalfH);
      addTruckRect(TRUCK_SPEC.toriiX, 0.78, TRUCK_SPEC.toriiHalfW, TRUCK_SPEC.toriiHalfH);
      addTruckRect(1.35, 0.68, 0.48, 0.74);

      for (const other of this.cargoItems) {
        if (other.id === ignoreInstanceId || other.dropped || other.isDragging || !other.body) continue;
        for (const opoly of other.localPolys) {
          obstacles.push(
            opoly.map((p) => {
              const wp = other.body.getWorldPoint(pl.Vec2(p.x * 0.98, p.y * 0.98));
              return { x: wp.x, y: wp.y };
            })
          );
        }
      }

      for (const cPoly of candidatePolys) {
        for (const oPoly of obstacles) {
          if (polygonsIntersectSAT(cPoly, oPoly)) {
            return { valid: false, reason: 'overlap' };
          }
        }
      }

      return { valid: true, reason: 'ok' };
    }

    computeSettlement(manifestTypeIds, options) {
      const opts = options || {};
      const GameData = getGameData();
      const stage = this.stage;

      const placedById = new Map();
      for (const item of this.cargoItems) {
        placedById.set(item.id, item);
      }

      const lineItems = [];
      let deliveredCargoFeeTotal = 0;
      let damageDeductionTotal = 0;
      let leftBehindPenaltyTotal = 0;
      let intactCount = 0;
      let deliveredOnTruckCount = 0;
      let droppedCount = 0;
      let brokenCount = 0;
      let leftBehindCount = 0;

      manifestTypeIds.forEach((entry, idx) => {
        const instanceId = typeof entry === 'string' ? `cargo_${idx}` : entry.id;
        const typeId = typeof entry === 'string' ? entry : entry.typeId;
        const spec = GameData.CARGO_TYPES[typeId];
        const placed = placedById.get(instanceId);

        if (!placed) {
          leftBehindCount++;
          const separateCourierFee = Math.round((spec.fee * 0.45) / 100) * 100;
          leftBehindPenaltyTotal += separateCourierFee;
          lineItems.push({
            id: instanceId,
            typeId,
            name: spec.name,
            shortName: spec.shortName,
            status: 'left_behind',
            statusLabel: '積み残し（別便手配）',
            hpPercent: 100,
            feeEarned: 0,
            deduction: separateCourierFee,
            net: -separateCourierFee
          });
          return;
        }

        const hpPct = Math.round(Math.max(0, Math.min(100, (placed.hp / placed.maxHp) * 100)));

        if (placed.dropped) {
          droppedCount++;
          damageDeductionTotal += spec.liability;
          lineItems.push({
            id: instanceId,
            typeId,
            name: spec.name,
            shortName: spec.shortName,
            status: 'dropped',
            statusLabel: '走行中に落下・紛失！',
            hpPercent: 0,
            feeEarned: 0,
            deduction: spec.liability,
            net: -spec.liability
          });
          return;
        }

        if (placed.broken || hpPct === 0) {
          brokenCount++;
          damageDeductionTotal += spec.liability;
          lineItems.push({
            id: instanceId,
            typeId,
            name: spec.name,
            shortName: spec.shortName,
            status: 'broken',
            statusLabel: '荷台で大破（全損弁償）',
            hpPercent: 0,
            feeEarned: 0,
            deduction: spec.liability,
            net: -spec.liability
          });
          return;
        }

        deliveredOnTruckCount++;
        if (hpPct >= 96) {
          intactCount++;
          deliveredCargoFeeTotal += spec.fee;
          lineItems.push({
            id: instanceId,
            typeId,
            name: spec.name,
            shortName: spec.shortName,
            status: 'perfect',
            statusLabel: '無傷でお届け◎',
            hpPercent: hpPct,
            feeEarned: spec.fee,
            deduction: 0,
            net: spec.fee
          });
        } else if (hpPct >= 70) {
          const feeEarned = Math.round((spec.fee * (hpPct / 100)) / 100) * 100;
          const repair = Math.round((spec.liability * (1 - hpPct / 100) * 0.35) / 100) * 100;
          deliveredCargoFeeTotal += feeEarned;
          damageDeductionTotal += repair;
          lineItems.push({
            id: instanceId,
            typeId,
            name: spec.name,
            shortName: spec.shortName,
            status: 'scratched',
            statusLabel: `小キズあり (${hpPct}%)`,
            hpPercent: hpPct,
            feeEarned,
            deduction: repair,
            net: feeEarned - repair
          });
        } else {
          const feeEarned = Math.round((spec.fee * (hpPct / 100) * 0.6) / 100) * 100;
          const repair = Math.round((spec.liability * (1 - hpPct / 100) * 0.65) / 100) * 100;
          deliveredCargoFeeTotal += feeEarned;
          damageDeductionTotal += repair;
          lineItems.push({
            id: instanceId,
            typeId,
            name: spec.name,
            shortName: spec.shortName,
            status: 'damaged',
            statusLabel: `破損あり (${hpPct}%)`,
            hpPercent: hpPct,
            feeEarned,
            deduction: repair,
            net: feeEarned - repair
          });
        }
      });

      const totalManifest = manifestTypeIds.length;
      const allDelivered = deliveredOnTruckCount === totalManifest;
      const allPerfect = allDelivered && intactCount === totalManifest;

      const baseContractFee = deliveredOnTruckCount > 0 ? stage.baseFee : 0;
      const allLoadedBonus = allDelivered ? stage.allLoadedBonus : 0;
      const perfectBonus = allPerfect ? stage.perfectBonus : 0;

      const timeDiff = stage.targetTimeSec - this.driveTime;
      let timeAdjustment = 0;
      if (deliveredOnTruckCount > 0) {
        if (timeDiff >= 0) {
          timeAdjustment = opts.ignoreEarlyBonus
            ? 0
            : Math.min(5000, Math.round((timeDiff * 200) / 100) * 100);
        } else {
          timeAdjustment = -Math.min(3000, Math.round((Math.abs(timeDiff) * 120) / 100) * 100);
        }
      }

      const towFeeTotal = (this.towRecoverCount || 0) * 5000;

      const grossTotal =
        baseContractFee +
        deliveredCargoFeeTotal +
        allLoadedBonus +
        perfectBonus +
        Math.max(0, timeAdjustment);

      const totalDeductions =
        damageDeductionTotal +
        leftBehindPenaltyTotal +
        towFeeTotal +
        Math.max(0, -timeAdjustment);

      const finalPayout = grossTotal - totalDeductions;

      const maxTheoretical =
        stage.baseFee +
        manifestTypeIds.reduce((acc, entry) => {
          const tid = typeof entry === 'string' ? entry : entry.typeId;
          return acc + GameData.CARGO_TYPES[tid].fee;
        }, 0) +
        stage.allLoadedBonus;

      let rank = 'B';
      let rankTitle = '一人前ドライバー';
      if (finalPayout < 0) {
        rank = 'D';
        rankTitle = '大赤字・弁償地獄…';
      } else if (allPerfect && finalPayout >= maxTheoretical * 0.98) {
        rank = 'S';
        rankTitle = '伝説の軽トラ引越王';
      } else if (allDelivered && finalPayout >= maxTheoretical * 0.82) {
        rank = 'A';
        rankTitle = '熟練プロ引越職人';
      } else if (finalPayout >= maxTheoretical * 0.48) {
        rank = 'B';
        rankTitle = '堅実ドライバー';
      } else {
        rank = 'C';
        rankTitle = 'ギリギリ黒字見習い';
      }

      const comments = [];
      const initM = this.initialPackingMetrics || this.computePackingMetrics();
      if (initM.stabilityScore >= 78) {
        comments.push('◎ 重心が低く前寄りで、段差や坂道でも車体が抜群に安定していました！');
      } else if (initM.heightNorm > 0.52) {
        comments.push('△ 重心が高めでした。冷蔵庫や洗濯機など重い家電を荷台の床に置くと揺れが激減します！');
      } else if (initM.rearBiasNorm > 0.48) {
        comments.push('△ 後ろ寄りの積載だったため、上り坂や段差で後部が跳ねやすくなっていました。');
      }

      if ((this.initialCushionedCount || 0) > 0) {
        comments.push('◎ ふとん袋やソファを緩衝材にしてワレモノを守るプロの積み方が光りました！');
      }

      const hadCrush = this.cargoItems.some((c) => c.damageLog.crush > 5);
      if (hadCrush) {
        comments.push('⚠ 下の荷物が上の重みで潰れてしまいました。「上積み厳禁」の箱は上段へ！');
      }

      const hadTilt = this.cargoItems.some((c) => c.damageLog.tilt > 5);
      if (hadTilt) {
        comments.push('⚠ 「天地無用」の荷物が傾いてダメージを受けました。家具の隙間に真っ直ぐ固定しましょう！');
      }

      if (droppedCount > 0) {
        comments.push(`✖ 走行中に${droppedCount}個の荷物が落下し、高額な弁償が発生！あおりの内側に寄せて荷締めロープを活用しましょう。`);
      } else if (allPerfect) {
        comments.push('★ 全荷物を一発で無傷配送達成！依頼主も大感激のパーフェクト引っ越しです！');
      } else if (leftBehindCount > 0) {
        comments.push(`ℹ ${leftBehindCount}個の積み残しに別便手配料がかかりました。回転やL字の隙間を活かすと全積みできます！`);
      }

      if (towFeeTotal > 0) {
        comments.push(`🔧 レッカー車体起こしを${this.towRecoverCount}回手配したため、出張費 ¥${towFeeTotal.toLocaleString()} が差し引かれました。`);
      }

      return {
        stageId: stage.id,
        stageName: stage.name,
        client: stage.client,
        driveTimeSec: this.driveTime,
        targetTimeSec: stage.targetTimeSec,
        lineItems,
        baseContractFee,
        deliveredCargoFeeTotal,
        allLoadedBonus,
        perfectBonus,
        timeAdjustment,
        damageDeductionTotal,
        leftBehindPenaltyTotal,
        towFeeTotal,
        grossTotal,
        totalDeductions,
        finalPayout,
        rank,
        rankTitle,
        deliveredOnTruckCount,
        totalManifest,
        intactCount,
        droppedCount,
        brokenCount,
        leftBehindCount,
        comments
      };
    }
  }

  function polygonsIntersectSAT(polyA, polyB) {
    const polys = [polyA, polyB];
    for (let p = 0; p < 2; p++) {
      const poly = polys[p];
      for (let i = 0; i < poly.length; i++) {
        const j = (i + 1) % poly.length;
        const nx = -(poly[j].y - poly[i].y);
        const ny = poly[j].x - poly[i].x;

        let minA = Infinity, maxA = -Infinity;
        for (const v of polyA) {
          const proj = v.x * nx + v.y * ny;
          if (proj < minA) minA = proj;
          if (proj > maxA) maxA = proj;
        }

        let minB = Infinity, maxB = -Infinity;
        for (const v of polyB) {
          const proj = v.x * nx + v.y * ny;
          if (proj < minB) minB = proj;
          if (proj > maxB) maxB = proj;
        }

        if (maxA <= minB || maxB <= minA) return false;
      }
    }
    return true;
  }

  const API = {
    CAT,
    TRUCK_SPEC,
    PhysicsSimulation,
    getCargoLocalPolygons,
    wrapAngle
  };

  root.GamePhysics = API;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }
})(typeof window !== 'undefined' ? window : globalThis);
