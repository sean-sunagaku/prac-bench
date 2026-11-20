/* ==========================================================================
   simulation.js — Physically calibrated traffic-flow simulation engines
   Model: Jiang (2001) Full Velocity Difference (FVD) + human reaction delay
          + Stern et al. (2018) FollowerStopper / Jam-Absorption controller.
   ========================================================================== */
(function (global) {
  'use strict';

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  /**
   * Bando Optimal Velocity function V(s): smooth S-curve mapping bumper-to-bumper gap s (m)
   * to desired speed (m/s). Steepest slope near sCrit creates the real-world critical density.
   */
  function optimalVelocity(s, vMax, sMin, sCrit, width) {
    if (s <= sMin) return 0;
    const x = (s - sCrit) / width;
    const x0 = (sMin - sCrit) / width;
    const t0 = Math.tanh(x0);
    const raw = (Math.tanh(x) - t0) / (1 - t0);
    return vMax * clamp(raw, 0, 1);
  }

  /* ========================================================================
     1. StraightHighwaySim — Open highway for Hero Stage & Chapter 3 (Sag)
     ======================================================================== */
  class StraightHighwaySim {
    constructor(opts = {}) {
      this.roadLength = opts.roadLength ?? 920; // meters
      this.carLen = 4.6;
      this.vMax = opts.vMax ?? 25.0; // 90 km/h free-flow expressway speed
      this.sMin = 2.4;
      this.sCrit = opts.sCrit ?? 15.2;
      this.width = opts.width ?? 9.2;
      this.delay = opts.delay ?? 0.86;
      this.inflowDensity = opts.inflowDensity ?? 0.85; // 0.35 (light) .. 1.0 (heavy)
      this.sagEnabled = opts.sagEnabled ?? false;
      this.pacemakerEnabled = opts.pacemakerEnabled ?? false;
      this.sagStart = opts.sagStart ?? 490;
      this.sagPeak = opts.sagPeak ?? 620;
      this.sagEnd = opts.sagEnd ?? 760;
      this.noise = opts.noise ?? 0.02;
      this.prewarmHistory = opts.prewarmHistory ?? false;
      this.dt = 0.05;

      this.time = 0;
      this.nextId = 1;
      this.cars = [];
      this.triggerCarId = null;
      this.triggerVirtualX = null;
      this.triggerLastV = this.vMax;
      this.lastBrakeTime = -999;
      this.jamWaveX = null;
      this.history = []; // [{ t, pts: [{ x, v, id, isTrigger, braking }] }]
      this.historyTimer = 0;
      this.maxHistorySec = 32;

      this.reset();
    }

    _targetSpawnSpacing() {
      return 48 - clamp(this.inflowDensity, 0.25, 1.05) * 26.2;
    }

    reset() {
      this.time = 0;
      this.cars = [];
      this.history = [];
      this.historyTimer = 0;
      this.triggerCarId = null;
      this.triggerVirtualX = null;
      this.triggerLastV = this.vMax;
      this.lastBrakeTime = -999;
      this.jamWaveX = null;

      const spacing = this._targetSpawnSpacing();
      const gap = spacing - this.carLen;
      const vInit = clamp(
        optimalVelocity(gap, this.vMax, this.sMin, this.sCrit, this.width),
        14,
        this.vMax
      );
      for (let x = this.roadLength - 18; x >= 8; x -= spacing) {
        this.cars.push(this._makeCar(x, vInit, gap));
      }

      if (this.prewarmHistory) {
        const savedNoise = this.noise;
        this.noise = 0;
        for (let k = 0; k < 400; k++) {
          this.step(this.dt);
        }
        this.noise = savedNoise;
      }
    }

    _makeCar(x, v, initGap) {
      const hist = [];
      for (let i = 0; i < 36; i++) {
        hist.push({ s: initGap, dv: 0 });
      }
      return {
        id: this.nextId++,
        x,
        v,
        a: 0,
        hist,
        histIdx: 0,
        brakeTimer: 0,
        isTrigger: false,
        noiseVal: 0,
        sagAwareness: 0,
        sagEntryV: v,
        inSag: false,
      };
    }

    getElevation(x) {
      if (!this.sagEnabled) return 0;
      const dipCenter = this.sagStart - 10;
      if (x < dipCenter - 150) return 3.2;
      if (x < dipCenter) {
        const u = (x - (dipCenter - 150)) / 150;
        return 3.2 * 0.5 * (1 + Math.cos(Math.PI * u));
      }
      if (x <= this.sagEnd) {
        const u = (x - dipCenter) / (this.sagEnd - dipCenter);
        return 7.8 * 0.5 * (1 - Math.cos(Math.PI * u));
      }
      return 7.8;
    }

    getUphillIntensity(x) {
      if (!this.sagEnabled) return 0;
      const uStart = this.sagStart;
      const uEnd = this.sagEnd - 15;
      if (x < uStart || x > uEnd) return 0;
      const u = (x - uStart) / (uEnd - uStart);
      return Math.sin(Math.PI * u);
    }

    triggerBrake(carIndex = null, duration = 1.6) {
      if (this.cars.length === 0) return null;
      let target = null;
      if (carIndex !== null && this.cars[carIndex]) {
        target = this.cars[carIndex];
      } else {
        const idealX = this.roadLength * 0.72;
        let bestDist = Infinity;
        for (const c of this.cars) {
          const d = Math.abs(c.x - idealX);
          if (d < bestDist) {
            bestDist = d;
            target = c;
          }
        }
      }
      if (!target) return null;
      for (const c of this.cars) c.isTrigger = false;
      target.brakeTimer = duration;
      target.isTrigger = true;
      this.triggerCarId = target.id;
      this.triggerVirtualX = target.x;
      this.triggerLastV = target.v;
      this.lastBrakeTime = this.time;
      return target;
    }

    step(dt = this.dt) {
      const n = this.cars.length;
      const humanAlpha = Math.max(0.45, 1.88 - this.delay * 1.48);
      const humanLambda = Math.max(0.12, 1.32 - this.delay * 1.32);
      const humanLag = Math.max(0, (this.delay - 0.22) * 0.48);
      const lagSteps = Math.min(34, Math.round(humanLag / dt));

      const newA = new Float64Array(n);

      for (let i = 0; i < n; i++) {
        const c = this.cars[i];
        const lead = i > 0 ? this.cars[i - 1] : null;
        const gap = lead ? Math.max(0.1, lead.x - c.x - this.carLen) : 160;
        const dv = lead ? c.v - lead.v : 0;

        c.hist[c.histIdx] = { s: gap, dv };
        const p = c.hist[(c.histIdx - lagSteps + c.hist.length) % c.hist.length];
        c.histIdx = (c.histIdx + 1) % c.hist.length;

        if (c.brakeTimer > 0) {
          c.brakeTimer -= dt;
          newA[i] = -5.4;
          continue;
        }

        const vOpt = optimalVelocity(Math.max(0.5, p.s), this.vMax, this.sMin, this.sCrit, this.width);
        let acc = humanAlpha * (vOpt - c.v) - humanLambda * p.dv;
        if (acc < 0) acc *= 1.24;

        const uphill = this.getUphillIntensity(c.x);
        const inPacemakerZone = this.pacemakerEnabled && c.x >= this.sagStart - 480 && c.x <= this.sagEnd + 120;
        if (uphill > 0.04) {
          if (!c.inSag) {
            c.inSag = true;
            c.sagEntryV = c.v;
            c.sagAwareness = 0;
          }
          if (this.pacemakerEnabled) {
            const vTarget = this.vMax * 0.96;
            acc += (1.35 * uphill + 0.65) * clamp((vTarget - c.v) / 4.2, 0, 1);
          } else {
            const speedLost = Math.max(0, c.sagEntryV - c.v);
            if (speedLost > 5.8) {
              c.sagAwareness = Math.min(1, c.sagAwareness + dt * 0.45);
            }
            const unconsciousDrag = 2.25 * uphill * (1 - 0.7 * c.sagAwareness);
            acc -= unconsciousDrag;
          }
        } else {
          c.inSag = false;
          c.sagAwareness = 0;
        }

        if (inPacemakerZone) {
          // Visual pace guidance eliminates human hesitation lag & smoothly drains queues through the sag
          const vOptGuide = optimalVelocity(Math.max(0.5, gap), this.vMax, this.sMin, this.sCrit - 4.2, this.width * 1.15);
          acc = 0.15 * acc + 0.85 * (2.0 * (vOptGuide - c.v) - 1.65 * dv);
        }

        if (lead && gap < this.sMin + 1.8 + Math.max(0, dv) * 0.5) {
          const emerg = -1.8 * Math.max(0, dv) - 2.8 * Math.max(0, this.sMin + 2.3 - gap);
          acc = Math.min(acc, emerg);
        }

        if (this.noise > 0) {
          c.noiseVal = c.noiseVal * 0.9 + (Math.random() - 0.5) * 2 * this.noise * 0.65;
          acc += c.noiseVal;
        }
        if (c.v > this.vMax && acc > 0) acc = 0;

        newA[i] = clamp(acc, -6.8, inPacemakerZone ? 3.4 : 2.5);
      }

      for (let i = 0; i < n; i++) {
        const c = this.cars[i];
        c.a = newA[i];
        const vNext = Math.max(0, c.v + c.a * dt);
        c.x += 0.5 * (c.v + vNext) * dt;
        c.v = vNext;
      }

      for (let i = 1; i < n; i++) {
        const lead = this.cars[i - 1];
        const c = this.cars[i];
        const minDist = this.carLen + 0.9;
        if (lead.x - c.x < minDist) {
          c.x = lead.x - minDist;
          c.v = Math.min(c.v, lead.v);
        }
      }

      // Track trigger car position even after it leaves the visible road!
      let foundTrigger = false;
      if (this.triggerCarId !== null) {
        for (const c of this.cars) {
          if (c.id === this.triggerCarId) {
            this.triggerVirtualX = c.x;
            this.triggerLastV = Math.max(c.v, 18);
            foundTrigger = true;
            break;
          }
        }
        if (!foundTrigger && this.triggerVirtualX !== null) {
          this.triggerVirtualX += this.triggerLastV * dt;
        }
      }

      while (this.cars.length > 0 && this.cars[0].x > this.roadLength + 25) {
        this.cars.shift();
      }

      const spawnSpacing = this._targetSpawnSpacing();
      const tail = this.cars.length > 0 ? this.cars[this.cars.length - 1] : null;
      if (!tail || tail.x >= spawnSpacing) {
        const spawnX = tail ? tail.x - spawnSpacing : 0;
        const gap = tail ? Math.max(4, tail.x - spawnX - this.carLen) : spawnSpacing - this.carLen;
        const vEq = optimalVelocity(gap, this.vMax, this.sMin, this.sCrit, this.width);
        const vSpawn = tail ? Math.min(vEq, tail.v) : vEq;
        if (!tail || tail.x - spawnX > this.carLen + 3.0) {
          this.cars.push(this._makeCar(spawnX, vSpawn, gap));
        }
      }

      this.time += dt;

      let jamXSum = 0;
      let jamWeight = 0;
      for (const c of this.cars) {
        if (c.x >= 0 && c.x <= this.roadLength && c.v < 11.5) {
          const w = (11.5 - c.v) * (11.5 - c.v);
          jamXSum += c.x * w;
          jamWeight += w;
        }
      }
      this.jamWaveX = jamWeight > 28 ? jamXSum / jamWeight : null;

      this.historyTimer += dt;
      if (this.historyTimer >= 0.15) {
        this.historyTimer = 0;
        const pts = [];
        for (const c of this.cars) {
          if (c.x >= 0 && c.x <= this.roadLength) {
            pts.push({
              x: c.x,
              v: c.v,
              id: c.id,
              isTrigger: c.isTrigger,
              braking: c.a < -0.7 || c.brakeTimer > 0,
            });
          }
        }
        this.history.push({ t: this.time, pts });
        const cutoff = this.time - this.maxHistorySec;
        while (this.history.length > 0 && this.history[0].t < cutoff) {
          this.history.shift();
        }
      }
    }

    getStats() {
      let sumV = 0;
      let count = 0;
      let minV = Infinity;
      let jammed = 0;
      let braking = 0;
      let minJamX = Infinity;
      let maxJamX = -Infinity;
      for (const c of this.cars) {
        if (c.x < 0 || c.x > this.roadLength) continue;
        count++;
        sumV += c.v;
        if (c.v < minV) minV = c.v;
        if (c.v < 9.72) {
          jammed++;
          if (c.x < minJamX) minJamX = c.x;
          if (c.x > maxJamX) maxJamX = c.x;
        }
        if (c.a < -0.65 || c.brakeTimer > 0) braking++;
      }
      const avgV = count > 0 ? sumV / count : this.vMax;
      const densityPerKm = count / (this.roadLength / 1000);
      const flowPerHour = densityPerKm * (avgV * 3.6);
      const jamSpanM = jammed >= 2 ? Math.max(0, maxJamX - minJamX) : 0;
      return {
        avgKmh: avgV * 3.6,
        minKmh: count > 0 ? minV * 3.6 : this.vMax * 3.6,
        jammed,
        braking,
        count,
        flowPerHour,
        jamSpanM,
        jamWaveX: this.jamWaveX,
      };
    }
  }

  /* ========================================================================
     2. DominoChainSim — Chapter 1 (8-Car Reaction-Delay Chain Experiment)
     ======================================================================== */
  class DominoChainSim {
    constructor(opts = {}) {
      this.numCars = opts.numCars ?? 8;
      this.carLen = 4.6;
      this.vCruise = 22.22; // 80 km/h
      this.initSpacing = 24.0;
      this.delay = opts.delay ?? 0.85;
      this.dt = 0.05;
      this.duration = 16.0;
      this.reset();
    }

    reset() {
      this.time = 0;
      this.running = false;
      this.completed = false;
      this.cars = [];
      for (let i = 0; i < this.numCars; i++) {
        const hist = [];
        for (let h = 0; h < 48; h++) {
          hist.push({ s: this.initSpacing - this.carLen, dv: 0 });
        }
        this.cars.push({
          idx: i,
          x: (this.numCars - 1 - i) * this.initSpacing,
          v: this.vCruise,
          a: 0,
          minV: this.vCruise,
          maxDecel: 0,
          braking: false,
          reactProgress: 0,
          leadBrakedAt: null,
          hist,
          histIdx: 0,
          speedLog: [],
        });
      }
      this.logTimer = 0;
    }

    startTest() {
      this.reset();
      this.running = true;
    }

    step(dt = this.dt) {
      if (!this.running) return;
      const n = this.numCars;
      const sMin = 2.4;
      const humanAlpha = Math.max(0.45, 1.85 - this.delay * 1.48);
      const humanLambda = Math.max(0.14, 1.35 - this.delay * 1.35);
      const lagSteps = Math.min(44, Math.round((this.delay * 0.85) / dt));

      const c0 = this.cars[0];
      let a0 = 0;
      if (this.time >= 0.45 && this.time < 1.95) {
        a0 = -4.2;
        c0.braking = true;
      } else {
        c0.braking = false;
        if (this.time >= 1.95) {
          a0 = Math.min(1.6, (this.vCruise - c0.v) * 0.9);
        }
      }
      c0.a = a0;
      c0.maxDecel = Math.max(c0.maxDecel, -a0);
      const v0Next = clamp(c0.v + a0 * dt, 16.1, this.vCruise);
      c0.x += 0.5 * (c0.v + v0Next) * dt;
      c0.v = v0Next;
      c0.minV = Math.min(c0.minV, c0.v);

      for (let i = 1; i < n; i++) {
        const c = this.cars[i];
        const lead = this.cars[i - 1];
        const gap = Math.max(0.2, lead.x - c.x - this.carLen);
        const dv = c.v - lead.v;

        if (lead.braking && c.leadBrakedAt === null) {
          c.leadBrakedAt = this.time;
        }
        if (c.leadBrakedAt !== null && this.delay > 0.05) {
          c.reactProgress = clamp((this.time - c.leadBrakedAt) / this.delay, 0, 1);
        }

        c.hist[c.histIdx] = { s: gap, dv };
        const p = c.hist[(c.histIdx - lagSteps + c.hist.length) % c.hist.length];
        c.histIdx = (c.histIdx + 1) % c.hist.length;

        const vOpt = Math.min(
          this.vCruise,
          optimalVelocity(Math.max(0.5, p.s), this.vCruise * 1.12, sMin, 11.5, 6.2)
        );
        let acc = humanAlpha * (vOpt - c.v) - humanLambda * p.dv;
        if (acc < 0 && this.delay > 0.3) acc *= 1.35;
        if (gap < sMin + 1.8 + Math.max(0, dv) * 0.5) {
          acc = Math.min(acc, -1.8 * Math.max(0, dv) - 3.0 * Math.max(0, sMin + 2.5 - gap));
        }
        acc = clamp(acc, -6.5, 1.6);
        c.a = acc;
        c.maxDecel = Math.max(c.maxDecel, -acc);
        c.braking = acc < -0.65;

        const vNext = clamp(c.v + acc * dt, 0, this.vCruise);
        c.x += 0.5 * (c.v + vNext) * dt;
        c.v = vNext;

        if (lead.x - c.x < this.carLen + 1.0) {
          c.x = lead.x - this.carLen - 1.0;
          c.v = Math.min(c.v, lead.v);
        }
        c.minV = Math.min(c.minV, c.v);
      }

      this.time += dt;
      this.logTimer += dt;
      if (this.logTimer >= 0.1) {
        this.logTimer = 0;
        for (const c of this.cars) {
          c.speedLog.push({ t: this.time, kmh: c.v * 3.6 });
        }
      }

      if (this.time >= this.duration) {
        this.completed = true;
        this.running = false;
      }
    }
  }

  /* ========================================================================
     3. RingRoadSim — Chapter 2 (Critical Density) & Chapter 4 (Solutions Lab)
     ======================================================================== */
  class RingRoadSim {
    constructor(opts = {}) {
      this.roadLength = opts.roadLength ?? 520;
      this.numCars = opts.numCars ?? 22;
      this.carLen = 4.6;
      this.vMax = opts.vMax ?? 25.0; // 90 km/h free flow -> N=22 eq ~58 km/h (bright emerald)
      this.sMin = 2.4;
      this.sCrit = 15.2;
      this.width = 10.4;
      this.delay = opts.delay ?? 0.69;
      this.cushion = opts.cushion ?? 1.0;
      this.noise = opts.noise ?? 0.03;
      this.jamBusterCount = opts.jamBusterCount ?? 0;
      this.autonomousRatio = opts.autonomousRatio ?? 0;
      this.dt = 0.05;

      this.time = 0;
      this.cars = [];
      this.trackedId = 0;
      this.history = [];
      this.speedSeries = [];
      this.historyTimer = 0;
      this.sparkTimer = 0;
      this.maxHistorySec = 42;

      this._bins = 128;
      this._prevProfile = null;
      this._waveSampleTimer = 0;
      this.jamAngle = null;
      this.jamWaveKmh = 0;

      this.reset();
    }

    getEquilibriumSpeed() {
      const spacing = this.roadLength / this.numCars;
      return optimalVelocity(spacing - this.carLen, this.vMax, this.sMin, this.sCrit, this.width);
    }

    getEquilibriumFlow() {
      const densityPerKm = this.numCars / (this.roadLength / 1000);
      return densityPerKm * (this.getEquilibriumSpeed() * 3.6);
    }

    reset() {
      this.time = 0;
      this.history = [];
      this.speedSeries = [];
      this.historyTimer = 0;
      this.sparkTimer = 0;
      this._prevProfile = null;
      this._waveSampleTimer = 0;
      this.jamAngle = null;
      this.jamWaveKmh = 0;

      const N = this.numCars;
      const spacing = this.roadLength / N;
      const gapEq = spacing - this.carLen;
      const vEq = this.getEquilibriumSpeed();

      this.cars = [];
      for (let i = 0; i < N; i++) {
        const hist = [];
        for (let h = 0; h < 32; h++) {
          hist.push({ s: gapEq, dv: 0 });
        }
        this.cars.push({
          id: i,
          x: (i * spacing) % this.roadLength,
          v: vEq,
          a: 0,
          hist,
          histIdx: 0,
          brakeTimer: 0,
          isJamBuster: false,
          isAutonomous: false,
          noiseVal: 0,
          jbSpeed: vEq * 0.78,
        });
      }
      this.trackedId = 0;
      this.applyRoles();
    }

    setNumCars(newN, preserveJam = false) {
      const clamped = clamp(Math.round(newN), 10, 34);
      if (clamped === this.numCars && this.cars.length === clamped) return;
      this.numCars = clamped;
      this.reset();
      if (preserveJam && clamped >= 20) {
        this.seedActiveJam();
      }
    }

    applyRoles() {
      const N = this.cars.length;
      const vEq = this.getEquilibriumSpeed();
      for (const c of this.cars) {
        c.isJamBuster = false;
        c.isAutonomous = false;
      }
      const jbCount = clamp(Math.round(this.jamBusterCount), 0, Math.min(3, N));
      for (let k = 0; k < jbCount; k++) {
        const idx = Math.floor(((k + 0.25) * N) / jbCount) % N;
        this.cars[idx].isJamBuster = true;
        this.cars[idx].jbSpeed = clamp(this.cars[idx].v, vEq * 0.70, vEq * 0.85);
      }
      const targetAuto = Math.round(N * clamp(this.autonomousRatio, 0, 1));
      if (targetAuto > 0) {
        let assigned = 0;
        const step = N / targetAuto;
        for (let k = 0; k < targetAuto && assigned < targetAuto; k++) {
          const idx = Math.floor(k * step) % N;
          for (let tries = 0; tries < N; tries++) {
            const candidate = this.cars[(idx + tries) % N];
            if (!candidate.isJamBuster && !candidate.isAutonomous) {
              candidate.isAutonomous = true;
              assigned++;
              break;
            }
          }
        }
      }
    }

    triggerBrake(carIndex = 0, duration = 1.55) {
      if (this.cars.length === 0) return null;
      const idx = clamp(carIndex, 0, this.cars.length - 1);
      this.cars[idx].brakeTimer = duration;
      this.trackedId = this.cars[idx].id;
      return this.cars[idx];
    }

    seedActiveJam(historySec = 10) {
      const savedJB = this.jamBusterCount;
      const savedAuto = this.autonomousRatio;
      const savedCushion = this.cushion;
      this.jamBusterCount = 0;
      this.autonomousRatio = 0;
      this.cushion = 1.0;
      this.reset();
      this.cars[0].brakeTimer = 1.7;
      for (let k = 0; k < 1500; k++) {
        this.step(this.dt, false);
      }
      this.time = 0;
      this.history = [];
      this.speedSeries = [];
      const recordSteps = Math.round(historySec / this.dt);
      for (let k = 0; k < recordSteps; k++) {
        this.step(this.dt, true);
      }
      this.jamBusterCount = savedJB;
      this.autonomousRatio = savedAuto;
      this.cushion = savedCushion;
      this.applyRoles();
    }

    prewarmSmooth(historySec = 10) {
      const savedNoise = this.noise;
      this.noise = 0;
      const steps = Math.round(historySec / this.dt);
      for (let k = 0; k < steps; k++) {
        this.step(this.dt, true);
      }
      this.noise = savedNoise;
    }

    _updateWaveTracker(dt) {
      const L = this.roadLength;
      const B = this._bins;
      const raw = new Float64Array(B);
      let totalWeight = 0;
      for (const c of this.cars) {
        if (c.v < 11.5) {
          const w = (11.5 - c.v) * (11.5 - c.v);
          const bf = (c.x / L) * B;
          const b0 = Math.floor(bf) % B;
          const b1 = (b0 + 1) % B;
          const frac = bf - Math.floor(bf);
          raw[b0] += w * (1 - frac);
          raw[b1] += w * frac;
          totalWeight += w;
        }
      }

      if (totalWeight < 30) {
        this.jamAngle = null;
        this._prevProfile = null;
        this.jamWaveKmh *= 0.85;
        return;
      }

      const prof = new Float64Array(B);
      const kernel = [0.06, 0.12, 0.2, 0.24, 0.2, 0.12, 0.06];
      let peakVal = -1;
      let peakBin = 0;
      for (let i = 0; i < B; i++) {
        let s = 0;
        for (let k = -3; k <= 3; k++) {
          s += raw[(i + k + B) % B] * kernel[k + 3];
        }
        prof[i] = s;
        if (s > peakVal) {
          peakVal = s;
          peakBin = i;
        }
      }

      const yL = prof[(peakBin - 1 + B) % B];
      const yC = prof[peakBin];
      const yR = prof[(peakBin + 1) % B];
      const denom = yL - 2 * yC + yR;
      const subShift = Math.abs(denom) > 1e-6 ? clamp(0.5 * (yL - yR) / denom, -0.5, 0.5) : 0;
      const smoothBin = (peakBin + subShift + B) % B;
      this.jamAngle = (smoothBin / B) * Math.PI * 2;

      this._waveSampleTimer += dt;
      if (this._waveSampleTimer >= 0.85) {
        const sampleDt = this._waveSampleTimer;
        this._waveSampleTimer = 0;
        if (this._prevProfile) {
          const maxLag = 5;
          let bestLag = 0;
          let bestCorr = -1;
          const corrs = new Float64Array(maxLag + 2);
          for (let lag = -1; lag <= maxLag; lag++) {
            let dot = 0;
            for (let i = 0; i < B; i++) {
              dot += this._prevProfile[i] * prof[(i - lag + B) % B];
            }
            corrs[lag + 1] = dot;
            if (lag >= 0 && dot > bestCorr) {
              bestCorr = dot;
              bestLag = lag;
            }
          }
          let refinedLag = bestLag;
          if (bestLag >= 0 && bestLag < maxLag) {
            const cL = corrs[bestLag];
            const cC = corrs[bestLag + 1];
            const cR = corrs[bestLag + 2];
            const d = cL - 2 * cC + cR;
            if (Math.abs(d) > 1e-6) {
              refinedLag += clamp(0.5 * (cL - cR) / d, -0.5, 0.5);
            }
          }
          const metersPerBin = L / B;
          const instWaveKmh = clamp((refinedLag * metersPerBin / sampleDt) * 3.6, 10, 30);
          if (this.jamWaveKmh < 1) this.jamWaveKmh = instWaveKmh;
          else this.jamWaveKmh = this.jamWaveKmh * 0.65 + instWaveKmh * 0.35;
        }
        this._prevProfile = prof;
      }
    }

    step(dt = this.dt, record = true) {
      const n = this.cars.length;
      const L = this.roadLength;
      const vEq = this.getEquilibriumSpeed();

      const gaps = new Float64Array(n);
      const dvs = new Float64Array(n);
      const vLeads = new Float64Array(n);
      let meanV = 0;
      let minV = Infinity;
      let maxV = -Infinity;

      for (let i = 0; i < n; i++) {
        const c = this.cars[i];
        meanV += c.v;
        if (c.v < minV) minV = c.v;
        if (c.v > maxV) maxV = c.v;
        const lead = this.cars[(i + 1) % n];
        let dx = lead.x - c.x;
        if (dx <= 0) dx += L;
        gaps[i] = Math.max(0.1, dx - this.carLen);
        dvs[i] = c.v - lead.v;
        vLeads[i] = lead.v;
      }
      meanV /= n;

      const cush = this.cushion;
      const isCushionOn = cush > 1.1;
      const humanAlpha = isCushionOn
        ? 1.32
        : Math.max(0.46, 1.85 - this.delay * 1.48);
      const humanLambda = isCushionOn
        ? 1.68
        : Math.max(0.14, 1.32 - this.delay * 1.32);
      const humanLag = isCushionOn
        ? 0.0
        : Math.max(0, (this.delay - 0.22) * 0.44);
      const effWidth = isCushionOn ? this.width * 1.42 : this.width;

      const newA = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const c = this.cars[i];
        const bufLen = c.hist.length;
        c.hist[c.histIdx] = { s: gaps[i], dv: dvs[i] };
        const stepsBack =
          c.isJamBuster || c.isAutonomous ? 0 : Math.min(bufLen - 1, Math.round(humanLag / dt));
        const p = c.hist[(c.histIdx - stepsBack + bufLen) % bufLen];
        c.histIdx = (c.histIdx + 1) % bufLen;

        if (c.brakeTimer > 0) {
          c.brakeTimer -= dt;
          newA[i] = -4.8;
          continue;
        }

        if (c.isJamBuster) {
          // Stern et al. (2018) PI-with-Saturation / FollowerStopper Jam Buster:
          // Smoothly lowers cruise pace (~75% vEq) while any car is jammed (minKmh < 40) so its
          // forward cushion absorbs the shockwave, then seamlessly ramps right up to 100% vEq!
          const minKmhNow = minV * 3.6;
          const calmRatio = clamp(minKmhNow / 40, 0, 1);
          const targetCruise = vEq * (0.75 + 0.25 * calmRatio);
          c.jbSpeed += (targetCruise - c.jbSpeed) * 0.16;

          const s = gaps[i];
          const vLead = vLeads[i];
          const U = c.jbSpeed;

          const dvNeg = Math.max(0, c.v - vLead);
          const dx1 = 4.2 + 0.28 * dvNeg * dvNeg;
          const dx2 = 11.5 + 0.45 * dvNeg * dvNeg;
          const dx3 = 22.0 + 0.55 * dvNeg * dvNeg;

          let vCmd;
          if (s <= dx1) {
            vCmd = 0;
          } else if (s <= dx2) {
            const w = (s - dx1) / Math.max(0.5, dx2 - dx1);
            vCmd = w * Math.min(vLead, U);
          } else if (s <= dx3) {
            const w = (s - dx2) / Math.max(0.5, dx3 - dx2);
            const vSafe = Math.min(vLead, U);
            vCmd = vSafe + w * (U - vSafe);
          } else {
            vCmd = U;
          }

          let acc = (vCmd - c.v) * 2.2 - 0.65 * dvs[i] * (s < dx2 ? 1 : 0.4);
          if (s > this.sMin + 5.0) acc = Math.max(-1.4, acc);
          if (s < this.sMin + 2.0 + Math.max(0, dvs[i]) * 0.5) {
            acc = Math.min(acc, -2.2 * Math.max(0, dvs[i]) - 2.8 * Math.max(0, this.sMin + 2.6 - s));
          }
          newA[i] = clamp(acc, -6.5, 2.2);
          continue;
        }

        if (c.isAutonomous) {
          const s = gaps[i];
          const dv = dvs[i];
          const vOptAI = optimalVelocity(s, this.vMax, this.sMin, this.sCrit, this.width * 1.6);
          const vGoal = 0.55 * vOptAI + 0.45 * vEq;
          let acc = 1.5 * (vGoal - c.v) - 2.2 * dv;
          if (s < this.sMin + 2.0 + Math.max(0, dv) * 0.5) {
            acc = Math.min(acc, -2.0 * Math.max(0, dv) - 2.6 * Math.max(0, this.sMin + 2.3 - s));
          }
          if (c.v > this.vMax && acc > 0) acc = 0;
          newA[i] = clamp(acc, -6.5, 2.5);
          continue;
        }

        const vOpt = optimalVelocity(Math.max(0.5, p.s), this.vMax, this.sMin, this.sCrit, effWidth);
        let acc = humanAlpha * (vOpt - c.v) - humanLambda * p.dv;
        if (!isCushionOn && acc < 0 && this.delay > 0.35) acc *= 1.15;

        if (gaps[i] < this.sMin + 1.6 + Math.max(0, dvs[i]) * 0.5) {
          acc = Math.min(acc, -1.7 * Math.max(0, dvs[i]) - 2.6 * Math.max(0, this.sMin + 2.2 - gaps[i]));
        }

        if (this.noise > 0) {
          c.noiseVal = c.noiseVal * 0.9 + (Math.random() - 0.5) * 2 * this.noise * 0.65;
          acc += c.noiseVal;
        }
        if (c.v > this.vMax && acc > 0) acc = 0;

        newA[i] = clamp(acc, -6.5, 2.6);
      }

      for (let i = 0; i < n; i++) {
        const c = this.cars[i];
        c.a = newA[i];
        const vNext = Math.max(0, c.v + c.a * dt);
        const dx = 0.5 * (c.v + vNext) * dt;
        c.v = vNext;
        c.x = (c.x + dx) % L;
      }

      for (let i = 0; i < n; i++) {
        const lead = this.cars[(i + 1) % n];
        let dx = lead.x - this.cars[i].x;
        if (dx <= 0) dx += L;
        const minDist = this.carLen + 0.9;
        if (dx < minDist) {
          this.cars[i].x = (lead.x - minDist + L) % L;
          this.cars[i].v = Math.min(this.cars[i].v, lead.v);
        }
      }

      this.time += dt;
      this._updateWaveTracker(dt);

      if (!record) return;

      this.historyTimer += dt;
      if (this.historyTimer >= 0.16) {
        this.historyTimer = 0;
        const pts = this.cars.map((c) => ({
          x: c.x,
          v: c.v,
          id: c.id,
          isTracked: c.id === this.trackedId,
          isJamBuster: c.isJamBuster,
          isAutonomous: c.isAutonomous,
        }));
        this.history.push({ t: this.time, pts });
        const cutoff = this.time - this.maxHistorySec;
        while (this.history.length > 0 && this.history[0].t < cutoff) {
          this.history.shift();
        }
      }

      this.sparkTimer += dt;
      if (this.sparkTimer >= 0.35) {
        this.sparkTimer = 0;
        const st = this.getStats();
        this.speedSeries.push({
          t: this.time,
          avgKmh: st.avgKmh,
          minKmh: st.minKmh,
          jammed: st.jammed,
          hasSolution: this.jamBusterCount > 0 || this.autonomousRatio > 0 || this.cushion > 1.08,
        });
        if (this.speedSeries.length > 150) {
          this.speedSeries.shift();
        }
      }
    }

    getStats() {
      let minV = Infinity;
      let maxV = -Infinity;
      let sumV = 0;
      let jammed = 0;
      let braking = 0;
      let trackedCar = null;
      for (const c of this.cars) {
        if (c.v < minV) minV = c.v;
        if (c.v > maxV) maxV = c.v;
        sumV += c.v;
        if (c.v < 9.72) jammed++; // < 35 km/h
        if (c.a < -0.65 || c.brakeTimer > 0) braking++;
        if (c.id === this.trackedId) trackedCar = c;
      }
      const n = this.cars.length || 1;
      const avgV = sumV / n;
      const densityPerKm = n / (this.roadLength / 1000);
      const flowPerHour = densityPerKm * (avgV * 3.6);
      const eqFlowPerHour = this.getEquilibriumFlow();
      const spreadKmh = (maxV - minV) * 3.6;

      let status = 'smooth';
      if (jammed >= 3 || minV < 5.0) status = 'jam';
      else if (jammed >= 1 || spreadKmh > 22) status = 'unstable';

      return {
        avgKmh: avgV * 3.6,
        minKmh: minV * 3.6,
        maxKmh: maxV * 3.6,
        eqKmh: this.getEquilibriumSpeed() * 3.6,
        spreadKmh,
        jammed,
        braking,
        densityPerKm,
        flowPerHour,
        eqFlowPerHour,
        flowDropPct: eqFlowPerHour > 0 ? Math.round(((flowPerHour - eqFlowPerHour) / eqFlowPerHour) * 100) : 0,
        status,
        jamAngle: this.jamAngle,
        jamWaveKmh: Math.max(0, this.jamWaveKmh),
        trackedKmh: trackedCar ? trackedCar.v * 3.6 : avgV * 3.6,
        trackedBraking: trackedCar ? trackedCar.a < -0.65 || trackedCar.brakeTimer > 0 : false,
      };
    }
  }

  global.TrafficSim = {
    StraightHighwaySim,
    DominoChainSim,
    RingRoadSim,
    optimalVelocity,
  };
})(typeof window !== 'undefined' ? window : globalThis);
