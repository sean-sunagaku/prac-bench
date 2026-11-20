(function (global) {
  'use strict';

  const GRAVITY = 11.0;
  const SUBSTEPS = 4;
  const SOLVER_ITERS = 12;
  const SLOP = 0.004;
  const BAUMGARTE = 0.22;

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function localToWorld(body, lx, ly) {
    const c = Math.cos(body.angle);
    const s = Math.sin(body.angle);
    return {
      x: body.x + lx * c - ly * s,
      y: body.y + lx * s + ly * c,
    };
  }

  function worldToLocal(body, wx, wy) {
    const dx = wx - body.x;
    const dy = wy - body.y;
    const c = Math.cos(body.angle);
    const s = Math.sin(body.angle);
    return {
      x: dx * c + dy * s,
      y: -dx * s + dy * c,
    };
  }

  function getShapeWorldOBB(body, shape) {
    const c = Math.cos(body.angle);
    const s = Math.sin(body.angle);
    return {
      cx: body.x + shape.lx * c - shape.ly * s,
      cy: body.y + shape.lx * s + shape.ly * c,
      ux: c,
      uy: s,
      vx: -s,
      vy: c,
      hw: shape.hw,
      hh: shape.hh,
    };
  }

  function clipSegmentToLine(vIn, nx, ny, offset) {
    const out = [];
    if (vIn.length < 2) return out;
    const d0 = vIn[0].x * nx + vIn[0].y * ny - offset;
    const d1 = vIn[1].x * nx + vIn[1].y * ny - offset;

    if (d0 <= 0) out.push(vIn[0]);
    if (d1 <= 0) out.push(vIn[1]);

    if ((d0 < 0 && d1 > 0) || (d0 > 0 && d1 < 0)) {
      const t = d0 / (d0 - d1);
      out.push({
        x: vIn[0].x + t * (vIn[1].x - vIn[0].x),
        y: vIn[0].y + t * (vIn[1].y - vIn[0].y),
        fid: d0 > 0 ? vIn[0].fid : vIn[1].fid,
      });
    }
    return out;
  }

  function collideOBB(obbA, obbB) {
    const dx = obbB.cx - obbA.cx;
    const dy = obbB.cy - obbA.cy;

    const dA0 = dx * obbA.ux + dy * obbA.uy;
    const dA1 = dx * obbA.vx + dy * obbA.vy;
    const dB0 = dx * obbB.ux + dy * obbB.uy;
    const dB1 = dx * obbB.vx + dy * obbB.vy;

    const r00 = obbA.ux * obbB.ux + obbA.uy * obbB.uy;
    const r01 = obbA.ux * obbB.vx + obbA.uy * obbB.vy;
    const r10 = obbA.vx * obbB.ux + obbA.vy * obbB.uy;
    const r11 = obbA.vx * obbB.vx + obbA.vy * obbB.vy;

    const abs00 = Math.abs(r00) + 1e-6;
    const abs01 = Math.abs(r01) + 1e-6;
    const abs10 = Math.abs(r10) + 1e-6;
    const abs11 = Math.abs(r11) + 1e-6;

    const penA0 = obbA.hw + obbB.hw * abs00 + obbB.hh * abs01 - Math.abs(dA0);
    if (penA0 <= 0) return null;

    const penA1 = obbA.hh + obbB.hw * abs10 + obbB.hh * abs11 - Math.abs(dA1);
    if (penA1 <= 0) return null;

    const penB0 = obbB.hw + obbA.hw * abs00 + obbA.hh * abs10 - Math.abs(dB0);
    if (penB0 <= 0) return null;

    const penB1 = obbB.hh + obbA.hw * abs01 + obbA.hh * abs11 - Math.abs(dB1);
    if (penB1 <= 0) return null;

    let bestAxis = 0;
    let minPen = penA0;

    if (penA1 < minPen * 0.995) {
      minPen = penA1;
      bestAxis = 1;
    }
    if (penB0 < minPen * 0.95 - 0.002) {
      minPen = penB0;
      bestAxis = 2;
    }
    if (penB1 < minPen * 0.95 - 0.002) {
      minPen = penB1;
      bestAxis = 3;
    }

    let ref, inc, refNormalX, refNormalY, refSideX, refSideY, refExtentN, refExtentS;
    let flipNormal = false;

    if (bestAxis === 0) {
      ref = obbA; inc = obbB;
      const sign = dA0 >= 0 ? 1 : -1;
      refNormalX = obbA.ux * sign; refNormalY = obbA.uy * sign;
      refSideX = obbA.vx; refSideY = obbA.vy;
      refExtentN = obbA.hw; refExtentS = obbA.hh;
    } else if (bestAxis === 1) {
      ref = obbA; inc = obbB;
      const sign = dA1 >= 0 ? 1 : -1;
      refNormalX = obbA.vx * sign; refNormalY = obbA.vy * sign;
      refSideX = obbA.ux; refSideY = obbA.uy;
      refExtentN = obbA.hh; refExtentS = obbA.hw;
    } else if (bestAxis === 2) {
      ref = obbB; inc = obbA;
      const sign = dB0 >= 0 ? -1 : 1;
      refNormalX = obbB.ux * sign; refNormalY = obbB.uy * sign;
      refSideX = obbB.vx; refSideY = obbB.vy;
      refExtentN = obbB.hw; refExtentS = obbB.hh;
      flipNormal = true;
    } else {
      ref = obbB; inc = obbA;
      const sign = dB1 >= 0 ? -1 : 1;
      refNormalX = obbB.vx * sign; refNormalY = obbB.vy * sign;
      refSideX = obbB.ux; refSideY = obbB.uy;
      refExtentN = obbB.hh; refExtentS = obbB.hw;
      flipNormal = true;
    }

    const dotU = inc.ux * refNormalX + inc.uy * refNormalY;
    const dotV = inc.vx * refNormalX + inc.vy * refNormalY;

    let incFace;
    if (Math.abs(dotU) > Math.abs(dotV)) {
      const s = dotU > 0 ? -1 : 1;
      const fcx = inc.cx + inc.ux * (s * inc.hw);
      const fcy = inc.cy + inc.uy * (s * inc.hw);
      incFace = [
        { x: fcx - inc.vx * inc.hh, y: fcy - inc.vy * inc.hh, fid: s > 0 ? 1 : 3 },
        { x: fcx + inc.vx * inc.hh, y: fcy + inc.vy * inc.hh, fid: s > 0 ? 2 : 4 },
      ];
    } else {
      const s = dotV > 0 ? -1 : 1;
      const fcx = inc.cx + inc.vx * (s * inc.hh);
      const fcy = inc.cy + inc.vy * (s * inc.hh);
      incFace = [
        { x: fcx - inc.ux * inc.hw, y: fcy - inc.uy * inc.hw, fid: s > 0 ? 5 : 7 },
        { x: fcx + inc.ux * inc.hw, y: fcy + inc.uy * inc.hw, fid: s > 0 ? 6 : 8 },
      ];
    }

    const refCenterS = ref.cx * refSideX + ref.cy * refSideY;
    let clipped = clipSegmentToLine(incFace, refSideX, refSideY, refCenterS + refExtentS);
    if (clipped.length < 2) return null;
    clipped = clipSegmentToLine(clipped, -refSideX, -refSideY, -refCenterS + refExtentS);
    if (clipped.length < 2) return null;

    const refFaceOffset = ref.cx * refNormalX + ref.cy * refNormalY + refExtentN;
    const points = [];
    for (let i = 0; i < clipped.length; i++) {
      const pt = clipped[i];
      const sep = pt.x * refNormalX + pt.y * refNormalY - refFaceOffset;
      if (sep <= 0.002) {
        const depth = Math.max(0, -sep);
        points.push({
          x: pt.x - refNormalX * sep * 0.5,
          y: pt.y - refNormalY * sep * 0.5,
          depth,
          fid: bestAxis * 16 + pt.fid,
        });
      }
    }

    if (points.length === 0) return null;

    const nx = flipNormal ? -refNormalX : refNormalX;
    const ny = flipNormal ? -refNormalY : refNormalY;
    return { nx, ny, points };
  }

  function obbOverlaps(obbA, obbB, shrink) {
    const s = shrink || 0;
    const a = s ? { ...obbA, hw: Math.max(0.01, obbA.hw - s), hh: Math.max(0.01, obbA.hh - s) } : obbA;
    const b = s ? { ...obbB, hw: Math.max(0.01, obbB.hw - s), hh: Math.max(0.01, obbB.hh - s) } : obbB;
    return collideOBB(a, b) !== null;
  }

  const TERRAIN_BODY = {
    id: 0,
    isStatic: true,
    isTerrain: true,
    x: 0,
    y: 0,
    angle: 0,
    vx: 0,
    vy: 0,
    w: 0,
    mass: Infinity,
    invMass: 0,
    I: Infinity,
    invI: 0,
    friction: 0.78,
    restitution: 0.05,
    cushion: 1.0,
  };

  class PhysicsWorld {
    constructor(terrain) {
      this.terrain = terrain;
      this.nextId = 1;
      this.truck = this._createTruck();
      this.cargo = [];
      this.ropes = [];
      this.contactCache = new Map();
      this.phase = 'loading';
      this.parkX = 0;
      this.time = 0;
      this.events = [];
    }

    _createTruck() {
      const mass = 34.0;
      const I = 42.0;
      const truck = {
        id: this.nextId++,
        isTruck: true,
        isStatic: false,
        x: 0,
        y: 0.72,
        angle: 0,
        vx: 0,
        vy: 0,
        w: 0,
        mass,
        invMass: 1 / mass,
        I,
        invI: 1 / I,
        friction: 0.76,
        restitution: 0.03,
        cushion: 0.92,
        shapes: [
          { tag: 'bed', lx: -0.66, ly: -0.18, hw: 1.04, hh: 0.18, friction: 0.78 },
          { tag: 'tailgate', lx: -1.74, ly: 0.20, hw: 0.06, hh: 0.20, friction: 0.72 },
          { tag: 'torii', lx: 0.43, ly: 0.58, hw: 0.06, hh: 0.58, friction: 0.68 },
          { tag: 'cab', lx: 1.03, ly: 0.46, hw: 0.54, hh: 0.56, friction: 0.52 },
        ],
        hooks: [
          { id: 'torii_top', name: '鳥居・上', lx: 0.36, ly: 1.10 },
          { id: 'torii_mid', name: '鳥居・中', lx: 0.36, ly: 0.54 },
          { id: 'bed_front', name: '荷台・前', lx: 0.24, ly: 0.02 },
          { id: 'bed_mid', name: '荷台・中央', lx: -0.66, ly: 0.02 },
          { id: 'bed_rear', name: 'あおり後', lx: -1.66, ly: 0.36 },
        ],
        wheels: [
          {
            name: 'rear',
            lx: -0.96,
            ly: -0.22,
            radius: 0.28,
            restLen: 0.38,
            maxTravel: 0.32,
            k: 1380,
            c: 245,
            comp: 0.14,
            grounded: true,
            worldX: -0.96,
            worldY: 0.28,
            spin: 0,
            normalForce: 0,
          },
          {
            name: 'front',
            lx: 0.96,
            ly: -0.22,
            radius: 0.28,
            restLen: 0.38,
            maxTravel: 0.32,
            k: 1380,
            c: 245,
            comp: 0.14,
            grounded: true,
            worldX: 0.96,
            worldY: 0.28,
            spin: 0,
            normalForce: 0,
          },
        ],
        throttle: 0,
        brake: 0,
        speedKmh: 0,
        flippedTimer: 0,
        isFlipped: false,
      };
      this._updateWheelWorldPos(truck);
      return truck;
    }

    _updateWheelWorldPos(truck) {
      const c = Math.cos(truck.angle);
      const s = Math.sin(truck.angle);
      const downX = s;
      const downY = -c;
      for (const wh of truck.wheels) {
        const mx = truck.x + wh.lx * c - wh.ly * s;
        const my = truck.y + wh.lx * s + wh.ly * c;
        const ext = wh.restLen - clamp(wh.comp, 0, wh.maxTravel);
        wh.worldX = mx + downX * ext;
        wh.worldY = my + downY * ext;
      }
    }

    addCargo(def, wx, wy, angle, slotIndex) {
      const mass = def.physMass;
      const I = (mass * (def.w * def.w + def.h * def.h)) / 12;
      const body = {
        id: this.nextId++,
        isCargo: true,
        isStatic: false,
        def,
        slotIndex,
        x: wx,
        y: wy,
        angle: angle || 0,
        vx: 0,
        vy: 0,
        w: 0,
        mass,
        invMass: 1 / mass,
        I: I * 1.15,
        invI: 1 / (I * 1.15),
        friction: def.friction,
        restitution: def.restitution,
        cushion: def.cushion || 1.0,
        shapes: [{ tag: 'cargo', lx: 0, ly: 0, hw: def.w * 0.5, hh: def.h * 0.5 }],
        hp: 100,
        dropped: false,
        touchedGround: false,
        groundTimer: 0,
        damageCooldown: 0,
        crushAlertCooldown: 0,
        spillAlertCooldown: 0,
        cushionAlertCooldown: 0,
        tiltTimer: 0,
        topLoadForce: 0,
        smoothedTopLoad: 0,
        hitFlash: 0,
        wasBrokenNotified: false,
        wasDamagedNotified: false,
      };
      this.cargo.push(body);
      return body;
    }

    removeCargo(body) {
      const idx = this.cargo.indexOf(body);
      if (idx !== -1) this.cargo.splice(idx, 1);
      this.ropes = this.ropes.filter((r) => r.bodyA !== body && r.bodyB !== body);
    }

    addRope(bodyA, localA, bodyB, localB, maxForce) {
      const pA = localToWorld(bodyA, localA.x, localA.y);
      const pB = localToWorld(bodyB, localB.x, localB.y);
      const dist = Math.hypot(pB.x - pA.x, pB.y - pA.y);
      const rope = {
        id: this.nextId++,
        bodyA,
        localA: { x: localA.x, y: localA.y },
        bodyB,
        localB: { x: localB.x, y: localB.y },
        restLen: Math.max(0.12, dist * 0.97),
        maxForce: maxForce || 145,
        tension: 0,
        tensionRatio: 0,
        overloadTimer: 0,
        snapped: false,
        Pn: 0,
      };
      this.ropes.push(rope);
      return rope;
    }

    removeRope(rope) {
      const idx = this.ropes.indexOf(rope);
      if (idx !== -1) this.ropes.splice(idx, 1);
    }

    checkPlacementOverlap(wx, wy, angle, w, h, ignoreBody) {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const cand = { cx: wx, cy: wy, ux: c, uy: s, vx: -s, vy: c, hw: w * 0.5, hh: h * 0.5 };
      const shrink = 0.014;

      for (const sh of this.truck.shapes) {
        const obbT = getShapeWorldOBB(this.truck, sh);
        if (obbOverlaps(cand, obbT, shrink)) return true;
      }
      for (const b of this.cargo) {
        if (b === ignoreBody) continue;
        const obbB = getShapeWorldOBB(b, b.shapes[0]);
        if (obbOverlaps(cand, obbB, shrink)) return true;
      }
      const groundY = this.terrain.heightAt(wx);
      const halfSpanY = Math.abs(c) * (h * 0.5) + Math.abs(s) * (w * 0.5);
      if (wy - halfSpanY < groundY + 0.01) return true;
      return false;
    }

    computeDropLandingY(wx, wy, angle, w, h, ignoreBody) {
      if (this.checkPlacementOverlap(wx, wy, angle, w, h, ignoreBody)) return wy;
      const groundY = this.terrain.heightAt(wx);
      const minY = groundY + Math.min(w, h) * 0.4;
      let curY = wy;
      const step = 0.06;
      while (curY - step >= minY) {
        if (this.checkPlacementOverlap(wx, curY - step, angle, w, h, ignoreBody)) {
          // Refine slightly
          let lo = curY - step;
          let hi = curY;
          for (let k = 0; k < 4; k++) {
            const mid = (lo + hi) * 0.5;
            if (this.checkPlacementOverlap(wx, mid, angle, w, h, ignoreBody)) lo = mid;
            else hi = mid;
          }
          return hi;
        }
        curY -= step;
      }
      return Math.max(minY, curY);
    }

    getCargoStats() {
      let totalKg = 0;
      let totalPhysMass = 0;
      let sumX = 0;
      let sumY = 0;
      let maxTopY = 0;
      let activeCount = 0;

      for (const b of this.cargo) {
        if (b.dropped) continue;
        activeCount++;
        totalKg += b.def.massKg;
        totalPhysMass += b.mass;
        const lp = worldToLocal(this.truck, b.x, b.y);
        sumX += lp.x * b.mass;
        sumY += lp.y * b.mass;
        const halfH = Math.abs(Math.cos(b.angle - this.truck.angle)) * (b.def.h * 0.5) +
                      Math.abs(Math.sin(b.angle - this.truck.angle)) * (b.def.w * 0.5);
        if (lp.y + halfH > maxTopY) maxTopY = lp.y + halfH;
      }

      return {
        count: activeCount,
        totalKg,
        cgLocalX: totalPhysMass > 0 ? sumX / totalPhysMass : -0.66,
        cgLocalY: totalPhysMass > 0 ? sumY / totalPhysMass : 0.2,
        maxHeightM: maxTopY,
      };
    }

    pickCargoAt(wx, wy) {
      for (let i = this.cargo.length - 1; i >= 0; i--) {
        const b = this.cargo[i];
        const lp = worldToLocal(b, wx, wy);
        const sh = b.shapes[0];
        if (Math.abs(lp.x) <= sh.hw + 0.05 && Math.abs(lp.y) <= sh.hh + 0.05) {
          return b;
        }
      }
      return null;
    }

    consumeEvents() {
      const ev = this.events;
      this.events = [];
      return ev;
    }

    step(dt, input) {
      const clampedDt = Math.min(dt, 1 / 30);
      const subDt = clampedDt / SUBSTEPS;
      this.time += clampedDt;

      const targetThrottle = input && input.throttle ? clamp(input.throttle, 0, 1) : 0;
      const targetBrake = input && input.brake ? clamp(input.brake, 0, 1) : 0;
      this.truck.throttle += (targetThrottle - this.truck.throttle) * Math.min(1, clampedDt * 12);
      this.truck.brake += (targetBrake - this.truck.brake) * Math.min(1, clampedDt * 14);

      for (const b of this.cargo) {
        b.maxImpactThisFrame = 0;
        b.maxRawImpactThisFrame = 0;
        b.maxImpactOther = null;
        b.maxImpactPos = null;
        b.topLoadForce = 0;
        b.touchedGroundThisStep = false;
        if (b.damageCooldown > 0) b.damageCooldown = Math.max(0, b.damageCooldown - clampedDt);
        if (b.crushAlertCooldown > 0) b.crushAlertCooldown = Math.max(0, b.crushAlertCooldown - clampedDt);
        if (b.spillAlertCooldown > 0) b.spillAlertCooldown = Math.max(0, b.spillAlertCooldown - clampedDt);
        if (b.cushionAlertCooldown > 0) b.cushionAlertCooldown = Math.max(0, b.cushionAlertCooldown - clampedDt);
        if (b.hitFlash > 0) b.hitFlash = Math.max(0, b.hitFlash - clampedDt * 3.5);
      }

      const prevComps = this.truck.wheels.map((wh) => wh.comp);
      if (this.truck.hardLandCooldown > 0) {
        this.truck.hardLandCooldown = Math.max(0, this.truck.hardLandCooldown - clampedDt);
      }

      for (let s = 0; s < SUBSTEPS; s++) {
        this._substep(subDt);
      }

      if (this.phase === 'driving' && (!this.truck.hardLandCooldown || this.truck.hardLandCooldown <= 0)) {
        for (let i = 0; i < this.truck.wheels.length; i++) {
          const wh = this.truck.wheels[i];
          const compDelta = wh.comp - prevComps[i];
          if (wh.grounded && (compDelta > 0.055 || (wh.comp > 0.25 && compDelta > 0.025))) {
            this.truck.hardLandCooldown = 0.28;
            this.events.push({
              type: 'hard_landing',
              x: wh.worldX,
              y: wh.worldY - wh.radius * 0.85,
              strength: clamp((compDelta * 10 + Math.max(0, wh.comp - 0.18) * 3), 0.3, 1.0),
            });
            break;
          }
        }
      }

      for (const b of this.cargo) {
        b.smoothedTopLoad = b.smoothedTopLoad * 0.82 + b.topLoadForce * 0.18;
      }

      this._updateWheelWorldPos(this.truck);
      this.truck.speedKmh = this.truck.vx * 3.6;

      if (this.phase === 'driving') {
        const ang = Math.abs(normalizeAngle(this.truck.angle));
        if (ang > Math.PI * 0.62) {
          this.truck.flippedTimer += clampedDt;
          if (this.truck.flippedTimer > 1.7) {
            this.truck.isFlipped = true;
          }
        } else {
          this.truck.flippedTimer = Math.max(0, this.truck.flippedTimer - clampedDt * 2);
        }
      }

      this._evaluateCargoDamageAndDrops(clampedDt);
    }

    _substep(dt) {
      const truck = this.truck;
      const bodies = [truck, ...this.cargo];

      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        b.vy -= GRAVITY * dt;
        b.vx *= 1 - 0.04 * dt;
        b.vy *= 1 - 0.04 * dt;
        b.w *= 1 - 0.14 * dt;
      }

      this._solveTruckWheels(dt);

      const contacts = [];
      const newCache = new Map();

      for (let i = 0; i < this.cargo.length; i++) {
        const cb = this.cargo[i];
        const obbC = getShapeWorldOBB(cb, cb.shapes[0]);
        for (let sIdx = 0; sIdx < truck.shapes.length; sIdx++) {
          const tShape = truck.shapes[sIdx];
          const obbT = getShapeWorldOBB(truck, tShape);
          const col = collideOBB(obbT, obbC);
          if (col) {
            this._registerManifold(contacts, newCache, truck, cb, sIdx, 0, col, tShape.friction);
          }
        }
      }

      for (let i = 0; i < this.cargo.length; i++) {
        const a = this.cargo[i];
        const obbA = getShapeWorldOBB(a, a.shapes[0]);
        for (let j = i + 1; j < this.cargo.length; j++) {
          const b = this.cargo[j];
          const maxR = a.def.w + a.def.h + b.def.w + b.def.h;
          if (Math.abs(a.x - b.x) > maxR || Math.abs(a.y - b.y) > maxR) continue;
          const obbB = getShapeWorldOBB(b, b.shapes[0]);
          const col = collideOBB(obbA, obbB);
          if (col) {
            this._registerManifold(contacts, newCache, a, b, 0, 0, col, null);
          }
        }
      }

      for (let i = 0; i < this.cargo.length; i++) {
        this._collideBodyTerrain(contacts, newCache, this.cargo[i]);
      }
      this._collideBodyTerrain(contacts, newCache, truck);

      for (let i = 0; i < contacts.length; i++) {
        const m = contacts[i];
        const bA = m.bodyA;
        const bB = m.bodyB;
        for (let p = 0; p < m.points.length; p++) {
          const cp = m.points[p];
          const rAx = cp.x - bA.x;
          const rAy = cp.y - bA.y;
          const rBx = cp.x - bB.x;
          const rBy = cp.y - bB.y;
          const vAx = bA.vx - bA.w * rAy;
          const vAy = bA.vy + bA.w * rAx;
          const vBx = bB.vx - bB.w * rBy;
          const vBy = bB.vy + bB.w * rBx;
          const vn = (vBx - vAx) * m.nx + (vBy - vAy) * m.ny;
          cp.preVn = vn;

          const closing = -vn;
          if (closing > 0.3) {
            const cushionA = bA.cushion !== undefined ? bA.cushion : 1.0;
            const cushionB = bB.cushion !== undefined ? bB.cushion : 1.0;
            if (bA.isCargo) {
              const eff = closing * cushionB;
              if (closing > bA.maxRawImpactThisFrame && cushionB < 0.7) {
                bA.maxRawImpactThisFrame = closing;
                bA.cushionSavedPos = { x: cp.x, y: cp.y };
              }
              if (eff > bA.maxImpactThisFrame) {
                bA.maxImpactThisFrame = eff;
                bA.maxImpactOther = bB;
                bA.maxImpactPos = { x: cp.x, y: cp.y };
              }
            }
            if (bB.isCargo) {
              const eff = closing * cushionA;
              if (closing > bB.maxRawImpactThisFrame && cushionA < 0.7) {
                bB.maxRawImpactThisFrame = closing;
                bB.cushionSavedPos = { x: cp.x, y: cp.y };
              }
              if (eff > bB.maxImpactThisFrame) {
                bB.maxImpactThisFrame = eff;
                bB.maxImpactOther = bA;
                bB.maxImpactPos = { x: cp.x, y: cp.y };
              }
            }
          }
        }
      }

      for (let i = 0; i < contacts.length; i++) {
        const m = contacts[i];
        const bA = m.bodyA;
        const bB = m.bodyB;
        const nx = m.nx;
        const ny = m.ny;
        const tx = -ny;
        const ty = nx;

        for (let p = 0; p < m.points.length; p++) {
          const cp = m.points[p];
          cp.rAx = cp.x - bA.x;
          cp.rAy = cp.y - bA.y;
          cp.rBx = cp.x - bB.x;
          cp.rBy = cp.y - bB.y;

          const rnA = cp.rAx * ny - cp.rAy * nx;
          const rnB = cp.rBx * ny - cp.rBy * nx;
          const kN = bA.invMass + bB.invMass + rnA * rnA * bA.invI + rnB * rnB * bB.invI;
          cp.massN = kN > 0 ? 1 / kN : 0;

          const rtA = cp.rAx * ty - cp.rAy * tx;
          const rtB = cp.rBx * ty - cp.rBy * tx;
          const kT = bA.invMass + bB.invMass + rtA * rtA * bA.invI + rtB * rtB * bB.invI;
          cp.massT = kT > 0 ? 1 / kT : 0;

          const bounceBias = cp.preVn < -1.1 ? -m.restitution * cp.preVn : 0;
          const posBias = (BAUMGARTE / dt) * Math.max(0, cp.depth - SLOP);
          cp.bias = Math.max(posBias, bounceBias);

          const px = cp.Pn * nx + cp.Pt * tx;
          const py = cp.Pn * ny + cp.Pt * ty;
          bA.vx -= px * bA.invMass;
          bA.vy -= py * bA.invMass;
          bA.w -= (cp.rAx * py - cp.rAy * px) * bA.invI;
          bB.vx += px * bB.invMass;
          bB.vy += py * bB.invMass;
          bB.w += (cp.rBx * py - cp.rBy * px) * bB.invI;
        }
      }

      for (let i = 0; i < this.ropes.length; i++) {
        this.ropes[i].Pn = 0;
      }

      for (let iter = 0; iter < SOLVER_ITERS; iter++) {
        for (let i = 0; i < contacts.length; i++) {
          const m = contacts[i];
          const bA = m.bodyA;
          const bB = m.bodyB;
          const nx = m.nx;
          const ny = m.ny;
          const tx = -ny;
          const ty = nx;

          for (let p = 0; p < m.points.length; p++) {
            const cp = m.points[p];
            let rvx = (bB.vx - bB.w * cp.rBy) - (bA.vx - bA.w * cp.rAy);
            let rvy = (bB.vy + bB.w * cp.rBx) - (bA.vy + bA.w * cp.rAx);
            const vt = rvx * tx + rvy * ty;
            let dPt = -vt * cp.massT;
            const maxPt = m.friction * cp.Pn;
            const oldPt = cp.Pt;
            cp.Pt = clamp(oldPt + dPt, -maxPt, maxPt);
            dPt = cp.Pt - oldPt;

            const fpx = dPt * tx;
            const fpy = dPt * ty;
            bA.vx -= fpx * bA.invMass;
            bA.vy -= fpy * bA.invMass;
            bA.w -= (cp.rAx * fpy - cp.rAy * fpx) * bA.invI;
            bB.vx += fpx * bB.invMass;
            bB.vy += fpy * bB.invMass;
            bB.w += (cp.rBx * fpy - cp.rBy * fpx) * bB.invI;

            rvx = (bB.vx - bB.w * cp.rBy) - (bA.vx - bA.w * cp.rAy);
            rvy = (bB.vy + bB.w * cp.rBx) - (bA.vy + bA.w * cp.rAx);
            const vn = rvx * nx + rvy * ny;
            let dPn = (-vn + cp.bias) * cp.massN;
            const oldPn = cp.Pn;
            cp.Pn = Math.max(0, oldPn + dPn);
            dPn = cp.Pn - oldPn;

            const npx = dPn * nx;
            const npy = dPn * ny;
            bA.vx -= npx * bA.invMass;
            bA.vy -= npy * bA.invMass;
            bA.w -= (cp.rAx * npy - cp.rAy * npx) * bA.invI;
            bB.vx += npx * bB.invMass;
            bB.vy += npy * bB.invMass;
            bB.w += (cp.rBx * npy - cp.rBy * npx) * bB.invI;
          }
        }

        for (let i = 0; i < this.ropes.length; i++) {
          const rope = this.ropes[i];
          if (rope.snapped) continue;
          const bA = rope.bodyA;
          const bB = rope.bodyB;
          const pA = localToWorld(bA, rope.localA.x, rope.localA.y);
          const pB = localToWorld(bB, rope.localB.x, rope.localB.y);
          const dx = pB.x - pA.x;
          const dy = pB.y - pA.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= rope.restLen || dist < 1e-5) continue;

          const dirX = dx / dist;
          const dirY = dy / dist;
          const rAx = pA.x - bA.x;
          const rAy = pA.y - bA.y;
          const rBx = pB.x - bB.x;
          const rBy = pB.y - bB.y;

          const rnA = rAx * dirY - rAy * dirX;
          const rnB = rBx * dirY - rBy * dirX;
          const compliance = 0.0028;
          const k = bA.invMass + bB.invMass + rnA * rnA * bA.invI + rnB * rnB * bB.invI + compliance;
          const effMass = 1 / k;

          const rvx = (bB.vx - bB.w * rBy) - (bA.vx - bA.w * rAy);
          const rvy = (bB.vy + bB.w * rBx) - (bA.vy + bA.w * rAx);
          const relVel = rvx * dirX + rvy * dirY;
          const stretch = dist - rope.restLen;
          const bias = (0.30 / dt) * stretch;

          let dP = -(relVel + bias) * effMass;
          const oldP = rope.Pn;
          rope.Pn = Math.min(0, oldP + dP);
          dP = rope.Pn - oldP;

          const px = dP * dirX;
          const py = dP * dirY;
          bA.vx -= px * bA.invMass;
          bA.vy -= py * bA.invMass;
          bA.w -= (rAx * py - rAy * px) * bA.invI;
          bB.vx += px * bB.invMass;
          bB.vy += py * bB.invMass;
          bB.w += (rBx * py - rBy * px) * bB.invI;
        }
      }

      this.contactCache = newCache;
      for (let i = 0; i < contacts.length; i++) {
        const m = contacts[i];
        let totalPn = 0;
        for (let p = 0; p < m.points.length; p++) {
          const cp = m.points[p];
          newCache.set(cp.key, { Pn: cp.Pn * 0.86, Pt: cp.Pt * 0.86 });
          totalPn += cp.Pn;
        }
        if (m.bodyA.isCargo && m.bodyB.isCargo) {
          const force = totalPn / dt;
          if (m.ny > 0.55) {
            m.bodyA.topLoadForce += force / SUBSTEPS;
          } else if (m.ny < -0.55) {
            m.bodyB.topLoadForce += force / SUBSTEPS;
          }
        }
      }

      for (let i = 0; i < this.ropes.length; i++) {
        const rope = this.ropes[i];
        if (rope.snapped) continue;
        const tensionForce = Math.abs(rope.Pn) / dt;
        rope.tension = rope.tension * 0.75 + tensionForce * 0.25;
        rope.tensionRatio = clamp(rope.tension / rope.maxForce, 0, 1.5);
        if (this.phase === 'driving' && tensionForce > rope.maxForce) {
          rope.overloadTimer += dt;
          if (rope.overloadTimer > 0.075) {
            rope.snapped = true;
            const pA = localToWorld(rope.bodyA, rope.localA.x, rope.localA.y);
            const pB = localToWorld(rope.bodyB, rope.localB.x, rope.localB.y);
            this.events.push({
              type: 'rope_snap',
              x: (pA.x + pB.x) * 0.5,
              y: (pA.y + pB.y) * 0.5,
            });
          }
        } else {
          rope.overloadTimer = Math.max(0, rope.overloadTimer - dt * 2);
        }
      }

      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        if (this.phase === 'loading' && b.isCargo) {
          if (Math.hypot(b.vx - truck.vx, b.vy - truck.vy) < 0.025 && Math.abs(b.w - truck.w) < 0.04) {
            b.vx = b.vx * 0.92 + truck.vx * 0.08;
            b.vy = b.vy * 0.92 + truck.vy * 0.08;
            b.w = b.w * 0.88 + truck.w * 0.12;
          }
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.angle += b.w * dt;
      }
    }

    _registerManifold(contacts, newCache, bodyA, bodyB, sIdxA, sIdxB, col, frictionOverride) {
      const fricA = frictionOverride !== null && frictionOverride !== undefined ? frictionOverride : bodyA.friction;
      const friction = Math.sqrt(fricA * bodyB.friction);
      const restitution = Math.max(bodyA.restitution, bodyB.restitution);
      const pts = [];
      for (let k = 0; k < col.points.length; k++) {
        const p = col.points[k];
        const key = `${bodyA.id}:${sIdxA}:${bodyB.id}:${sIdxB}:${p.fid}`;
        const cached = this.contactCache.get(key);
        pts.push({
          x: p.x,
          y: p.y,
          depth: p.depth,
          key,
          Pn: cached ? cached.Pn : 0,
          Pt: cached ? cached.Pt : 0,
          preVn: 0,
        });
      }
      contacts.push({
        bodyA,
        bodyB,
        nx: col.nx,
        ny: col.ny,
        friction,
        restitution,
        points: pts,
      });
    }

    _collideBodyTerrain(contacts, newCache, body) {
      const c = Math.cos(body.angle);
      const s = Math.sin(body.angle);
      const pts = [];
      let sumNx = 0;
      let sumNy = 0;

      for (let si = 0; si < body.shapes.length; si++) {
        const sh = body.shapes[si];
        if (body.isTruck && sh.tag === 'bed' && Math.abs(normalizeAngle(body.angle)) < 0.9) {
          continue;
        }
        const cx = body.x + sh.lx * c - sh.ly * s;
        const cy = body.y + sh.lx * s + sh.ly * c;

        const localPts = [
          [-sh.hw, -sh.hh, 0],
          [sh.hw, -sh.hh, 1],
          [sh.hw, sh.hh, 2],
          [-sh.hw, sh.hh, 3],
          [0, -sh.hh, 4],
          [0, sh.hh, 5],
        ];

        for (let k = 0; k < localPts.length; k++) {
          const lx = localPts[k][0];
          const ly = localPts[k][1];
          const px = cx + lx * c - ly * s;
          const py = cy + lx * s + ly * c;
          const ty = this.terrain.heightAt(px);
          if (py < ty) {
            const n = this.terrain.normalAt(px);
            const depth = (ty - py) * n.y;
            const key = `0:0:${body.id}:${si}:${localPts[k][2]}`;
            const cached = this.contactCache.get(key);
            pts.push({
              x: px,
              y: ty,
              depth,
              key,
              Pn: cached ? cached.Pn : 0,
              Pt: cached ? cached.Pt : 0,
              preVn: 0,
            });
            sumNx += n.x;
            sumNy += n.y;
            if (body.isCargo) {
              body.touchedGroundThisStep = true;
            }
          }
        }
      }

      if (pts.length > 0) {
        const len = Math.hypot(sumNx, sumNy) || 1;
        contacts.push({
          bodyA: TERRAIN_BODY,
          bodyB: body,
          nx: sumNx / len,
          ny: sumNy / len,
          friction: Math.sqrt(TERRAIN_BODY.friction * body.friction),
          restitution: Math.max(TERRAIN_BODY.restitution, body.restitution),
          points: pts,
        });
      }
    }

    _solveTruckWheels(dt) {
      const truck = this.truck;
      const c = Math.cos(truck.angle);
      const s = Math.sin(truck.angle);
      const downX = s;
      const downY = -c;
      const probes = [-0.72, -0.45, -0.2, 0, 0.2, 0.45, 0.72];

      const uprightDot = c;
      if (uprightDot < 0.15) {
        for (const wh of truck.wheels) {
          wh.grounded = false;
          wh.comp = 0;
          wh.normalForce = 0;
        }
        return;
      }

      for (let i = 0; i < truck.wheels.length; i++) {
        const wh = truck.wheels[i];
        const mx = truck.x + wh.lx * c - wh.ly * s;
        const my = truck.y + wh.lx * s + wh.ly * c;
        const restCx = mx + downX * wh.restLen;
        const restCy = my + downY * wh.restLen;

        let maxPen = 0;
        let bestPx = restCx;
        let bestTy = 0;

        for (let p = 0; p < probes.length; p++) {
          const u = probes[p];
          const px = restCx + u * wh.radius;
          const circleBottomOff = wh.radius * Math.sqrt(Math.max(0, 1 - u * u));
          const wheelBottomY = restCy - circleBottomOff;
          const ty = this.terrain.heightAt(px);
          const pen = ty - wheelBottomY;
          if (pen > maxPen) {
            maxPen = pen;
            bestPx = px;
            bestTy = ty;
          }
        }

        if (maxPen <= 0) {
          wh.grounded = false;
          wh.comp = Math.max(0, wh.comp - 2.2 * dt);
          wh.normalForce = 0;
          continue;
        }

        wh.grounded = true;
        wh.comp = clamp(maxPen, 0, wh.maxTravel + 0.08);

        const nSurf = this.terrain.normalAt(bestPx);
        const nx = nSurf.x * 0.75 + (-downX) * 0.25;
        const ny = nSurf.y * 0.75 + (-downY) * 0.25;
        const nLen = Math.hypot(nx, ny) || 1;
        const unx = nx / nLen;
        const uny = ny / nLen;
        const utx = uny;
        const uty = -unx;

        const rx = bestPx - truck.x;
        const ry = bestTy - truck.y;
        const vx = truck.vx - truck.w * ry;
        const vy = truck.vy + truck.w * rx;
        const vn = vx * unx + vy * uny;
        const vt = vx * utx + vy * uty;

        let fSpring = wh.k * maxPen;
        if (maxPen > 0.22) {
          const over = maxPen - 0.22;
          fSpring += 5200 * over + 16000 * over * over;
        }
        const fDamp = -wh.c * vn;
        const Fn = Math.max(0, fSpring + fDamp);
        wh.normalForce = Fn;

        const jNx = unx * Fn * dt;
        const jNy = uny * Fn * dt;
        truck.vx += jNx * truck.invMass;
        truck.vy += jNy * truck.invMass;
        truck.w += (rx * jNy - ry * jNx) * truck.invI;

        if (maxPen > wh.maxTravel + 0.04) {
          const corr = (maxPen - (wh.maxTravel + 0.04)) * 0.45;
          truck.y += corr;
          if (truck.vy < 0) truck.vy *= 0.5;
        }

        let Ft = 0;
        const maxTraction = Fn * 1.45;

        if (this.phase === 'loading') {
          const posErr = truck.x - this.parkX;
          Ft = clamp(-vt * 380 - posErr * 520, -1400, 1400);
        } else if (this.phase === 'goal_settle') {
          Ft = clamp(-vt * 190, -280, 280);
        } else {
          const maxForwardSpeed = 14.5;
          const maxReverseSpeed = -4.5;

          if (truck.throttle > 0.02) {
            const speedFactor = clamp(1 - Math.max(0, vt) / maxForwardSpeed, 0, 1);
            const lowEndBoost = vt < 4.0 ? 1.25 : 1.0;
            const wheelBias = wh.name === 'rear' ? 1.12 : 0.88;
            Ft += truck.throttle * 295 * wheelBias * (0.28 + 0.72 * speedFactor) * lowEndBoost;
          }

          if (truck.brake > 0.02) {
            if (vt > 0.25) {
              const brakeBias = wh.name === 'front' ? 1.22 : 0.78;
              Ft -= truck.brake * 310 * brakeBias;
            } else {
              const revFactor = clamp(1 - Math.max(0, -vt) / Math.abs(maxReverseSpeed), 0, 1);
              Ft -= truck.brake * 185 * (0.25 + 0.75 * revFactor);
            }
          }

          if (truck.throttle < 0.02 && truck.brake < 0.02) {
            Ft -= vt * 16;
          } else {
            Ft -= vt * 3.5;
          }

          if (truck.x < -5.0 && vt < 0) {
            Ft = Math.max(Ft, -vt * 300);
          }

          Ft = clamp(Ft, -maxTraction, maxTraction);
        }

        const driveRy = ry * 0.58;
        const jTx = utx * Ft * dt;
        const jTy = uty * Ft * dt;
        truck.vx += jTx * truck.invMass;
        truck.vy += jTy * truck.invMass;
        truck.w += (rx * jTy - driveRy * jTx) * truck.invI;

        wh.spin -= (vt / wh.radius) * dt;
      }
    }

    _evaluateCargoDamageAndDrops(dt) {
      if (this.phase === 'loading') {
        for (const b of this.cargo) {
          if (b.touchedGroundThisStep) {
            const lp = worldToLocal(this.truck, b.x, b.y);
            if (lp.x < -1.85 || lp.x > 1.65 || lp.y < -0.25) {
              this.events.push({ type: 'loading_fell', body: b });
            }
          }
        }
        return;
      }

      const truck = this.truck;
      for (const b of this.cargo) {
        const def = b.def;
        const prevHp = b.hp;

        if (b.maxImpactThisFrame > def.impactThreshold && b.damageCooldown <= 0 && !b.dropped) {
          const excess = b.maxImpactThisFrame - def.impactThreshold;
          const dmg = clamp(excess * def.fragility * 0.82, 4, 65);
          b.hp = Math.max(0, b.hp - dmg);
          b.damageCooldown = 0.24;
          b.hitFlash = 1.0;

          this.events.push({
            type: 'impact',
            body: b,
            dmg,
            x: b.maxImpactPos ? b.maxImpactPos.x : b.x,
            y: b.maxImpactPos ? b.maxImpactPos.y : b.y,
            sound: def.fragileSound || 'thud',
            strength: clamp(excess / 3.0, 0.25, 1.0),
          });
        } else if (
          !b.dropped &&
          b.maxRawImpactThisFrame > def.impactThreshold * 1.05 &&
          b.maxImpactThisFrame <= def.impactThreshold &&
          b.cushionAlertCooldown <= 0
        ) {
          b.cushionAlertCooldown = 1.6;
          this.events.push({
            type: 'cushioned',
            body: b,
            x: b.cushionSavedPos ? b.cushionSavedPos.x : b.x,
            y: b.cushionSavedPos ? b.cushionSavedPos.y : b.y,
          });
        }

        if (!b.dropped && b.topLoadForce > def.crushLimit) {
          const excessForce = b.topLoadForce - def.crushLimit;
          const crushDmg = (5.0 + excessForce * 0.72) * dt;
          b.hp = Math.max(0, b.hp - crushDmg);
          b.hitFlash = Math.max(b.hitFlash, 0.45);
          if (b.crushAlertCooldown <= 0) {
            b.crushAlertCooldown = 1.1;
            this.events.push({
              type: 'crush',
              body: b,
              x: b.x,
              y: b.y + def.h * 0.4,
            });
          }
        }

        if (!b.dropped && def.uprightOnly) {
          const tiltDeg = (Math.abs(normalizeAngle(b.angle)) * 180) / Math.PI;
          if (tiltDeg > def.uprightMaxDeg) {
            b.tiltTimer += dt;
            if (b.tiltTimer > 0.30) {
              const tipDmg = (def.tiltDps || 25) * dt;
              b.hp = Math.max(0, b.hp - tipDmg);
              b.hitFlash = Math.max(b.hitFlash, 0.4);
              if (b.spillAlertCooldown <= 0) {
                b.spillAlertCooldown = 0.85;
                this.events.push({
                  type: 'spill',
                  body: b,
                  x: b.x,
                  y: b.y,
                  sound: def.fragileSound || 'water',
                });
              }
            }
          } else {
            b.tiltTimer = Math.max(0, b.tiltTimer - dt * 2);
          }
        }

        if (prevHp >= 72 && b.hp < 72 && !b.wasDamagedNotified) {
          b.wasDamagedNotified = true;
          this.events.push({ type: 'state_damaged', body: b, x: b.x, y: b.y });
        }
        if (prevHp >= 25 && b.hp < 25 && !b.wasBrokenNotified) {
          b.wasBrokenNotified = true;
          this.events.push({
            type: 'state_broken',
            body: b,
            x: b.x,
            y: b.y,
            sound: def.fragileSound || 'break',
          });
        }

        if (!b.dropped) {
          const lp = worldToLocal(truck, b.x, b.y);
          const outsideBed = lp.x < -1.95 || lp.x > 1.75 || lp.y < -0.35;
          if (b.touchedGroundThisStep || outsideBed) {
            b.groundTimer += dt;
            if ((b.touchedGroundThisStep && b.groundTimer > 0.16) || Math.abs(b.x - truck.x) > 4.2) {
              b.dropped = true;
              b.hp = Math.max(0, b.hp - 25);
              this.events.push({
                type: 'dropped',
                body: b,
                x: b.x,
                y: b.y,
              });
            }
          } else {
            b.groundTimer = Math.max(0, b.groundTimer - dt * 3);
          }
        }
      }
    }
  }

  const exportsObj = {
    GRAVITY,
    PhysicsWorld,
    localToWorld,
    worldToLocal,
    getShapeWorldOBB,
    collideOBB,
    obbOverlaps,
    normalizeAngle,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObj;
  } else {
    global.Keitora = Object.assign(global.Keitora || {}, exportsObj);
  }
})(typeof window !== 'undefined' ? window : globalThis);
