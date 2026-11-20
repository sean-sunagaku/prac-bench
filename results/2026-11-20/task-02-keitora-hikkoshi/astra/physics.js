// Geometry on the bed is expressed in cells. The route uses metres and seconds.
const Keitora = (() => {
  "use strict";
  const COLS = 6,
    ROWS = 3,
    LIMIT = 350,
    GOAL = 320;
  const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
  const cargo = [
    { id: "box", name: "段ボール", mass: 22, w: 1, h: 1, fee: 3800, strength: 7.1 },
    { id: "tv", name: "テレビ", mass: 18, w: 1, h: 1, fee: 7200, strength: 5.2 },
    { id: "fridge", name: "冷蔵庫", mass: 68, w: 1, h: 2, fee: 10400, strength: 7.7 },
    { id: "plant", name: "観葉植物", mass: 12, w: 1, h: 1, fee: 4500, strength: 5.8 },
    { id: "shelf", name: "本棚", mass: 42, w: 2, h: 2, fee: 6900, strength: 8.2 },
    { id: "dishes", name: "食器箱", mass: 24, w: 1, h: 1, fee: 5500, strength: 4.7 },
  ];
  const byId = Object.fromEntries(cargo.map((item) => [item.id, item]));
  const overlap = (ax, aw, bx, bw) => Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx));
  const weight = (load) => load.reduce((sum, p) => sum + byId[p.id].mass, 0);

  function covered(load, id) {
    const p = load.find((p) => p.id === id);
    if (!p) return false;
    const item = byId[id];
    return load.some((q) => q.row === p.row + item.h && overlap(p.col, item.w, q.col, byId[q.id].w) > 0);
  }

  function placement(load, id, column) {
    const item = byId[id];
    if (!item) return { error: "荷物リストから荷物を選んでください。" };
    if (covered(load, id)) return { error: "上に載っている荷物を先に移してください。" };
    const others = load.filter((p) => p.id !== id);
    const col = clamp(Math.floor(column), 0, COLS - item.w);
    let row = 0;
    for (const p of others) {
      const base = byId[p.id];
      if (overlap(col, item.w, p.col, base.w) > 0) row = Math.max(row, p.row + base.h);
    }
    if (row + item.h > ROWS) return { error: "高さは3段まで。空いている列を選んでください。" };
    if (weight(others) + item.mass > LIMIT) return { error: "最大積載重量を超えています。" };
    return { id, col, row };
  }

  // Top loads, unsupported overhangs and loads bearing down on fragile goods
  // each contribute to the way impulses travel through a stack.
  function loadProfile(load) {
    const mass = weight(load);
    if (!mass) return { mass: 0, score: 0, label: "—", risk: {} };
    const center = load.reduce((sum, p) => sum + (p.col + byId[p.id].w / 2) * byId[p.id].mass, 0) / mass;
    const imbalance = Math.abs(center - COLS / 2) / (COLS / 2);
    const risk = {};
    for (const p of load) {
      const item = byId[p.id];
      let support = p.row === 0 ? item.w : 0;
      let weakBase = 0,
        pressure = 0;
      for (const q of load) {
        const base = byId[q.id],
          contact = overlap(p.col, item.w, q.col, base.w);
        if (!contact || p === q) continue;
        if (q.row + base.h === p.row) {
          support += contact;
          weakBase += Math.max(0, item.mass / (base.mass * 1.6) - 1) * 0.25;
        }
        if (q.row === p.row + item.h) pressure += ((base.mass / item.mass) * 0.12 * contact) / item.w;
      }
      const rear = Math.max(0, 1.5 - (p.col + item.w / 2)) * 0.22;
      risk[p.id] =
        p.row * 0.48 +
        (1 - support / item.w) * 1.12 +
        weakBase +
        pressure +
        (item.h - 1) * 0.13 +
        imbalance * 0.26 +
        rear;
    }
    const mean = load.reduce((sum, p) => sum + risk[p.id] * byId[p.id].mass, 0) / mass;
    const peak = Math.max(...Object.values(risk));
    const score = clamp(Math.round(100 - mean * 35 - peak * 14 - imbalance * 17), 8, 99);
    return { mass, score, label: score >= 73 ? "安定" : score >= 48 ? "やや不安定" : "不安定", risk };
  }

  const segments = [
    { start: 51, width: 4.8, height: 0.28, force: 0.75, rise: 0.19, fall: 0.34, name: "道路の継ぎ目" },
    { start: 118, width: 7.2, height: 0.48, force: 1.12, rise: 0.16, fall: 0.22, name: "工事の段差" },
    { start: 192, width: 4.0, height: 0.36, force: 0.91, name: "連続段差" },
    { start: 201, width: 4.3, height: 0.39, force: 0.98, name: "連続段差" },
    { start: 268, width: 6.2, height: 0.53, force: 1.18, name: "坂の盛り上がり" },
  ];
  const AXLE_METRES = 6.9;
  function terrain(metres) {
    for (const s of segments) {
      const t = (metres - s.start) / s.width;
      if (t < 0 || t > 1) continue;
      if (s.rise) return s.height * Math.min(1, t / s.rise, (1 - t) / s.fall);
      return s.height * Math.sin(Math.PI * t) ** 1.4;
    }
    return 0;
  }

  class Drive {
    constructor(load) {
      this.load = load.map((p) => ({ ...p }));
      this.profile = loadProfile(this.load);
      this.bodies = this.load
        .map((p) => ({
          ...byId[p.id],
          x: p.col,
          z: p.row,
          vx: 0,
          vz: 0,
          tilt: 0,
          spin: 0,
          risk: this.profile.risk[p.id],
          broken: false,
          lost: false,
          grounded: true,
          lostTime: 0,
          impactFlash: 0,
        }))
        .sort((a, b) => a.z - b.z);
      this.speed = 0;
      this.distance = 0;
      this.time = 0;
      this.finishTime = null;
      this.done = false;
      this.lift = 0;
      this.pitch = 0;
      this.suspensionSpeed = 0;
      this.pitchSpeed = 0;
      this.events = [];
      this.shocks = [];
      for (const s of segments) {
        this.shocks.push({
          at: s.start + s.width * (s.rise || 0.45) - AXLE_METRES / 2,
          force: s.force,
          name: s.name,
        });
        this.shocks.push({
          at: s.start + s.width * (s.rise || 0.55) + AXLE_METRES / 2,
          force: s.force * 0.54,
          name: s.name,
        });
      }
      this.shocks.sort((a, b) => a.at - b.at);
      this.nextShock = 0;
    }
    get nextObstacle() {
      return segments.find((s) => this.distance <= s.start + s.width + AXLE_METRES / 2);
    }
    emit(type, body, label) {
      this.events.push({ type, id: body?.id, label, time: this.time });
    }
    shake(shock) {
      const impulse = Math.max(0, this.speed - 3.5) * shock.force;
      this.emit("bump", null, shock.name);
      for (const body of this.bodies) {
        if (body.lost) continue;
        const leverage = 0.65 + body.risk * 0.56 + Math.min(body.z, 3) * 0.12;
        const kick = impulse * leverage;
        body.vz += kick * 0.76;
        body.vx -= kick * (0.045 + body.risk * 0.125);
        body.spin += kick * (body.x + body.w / 2 < 3 ? -0.105 : 0.078);
        body.grounded = false;
      }
    }
    harm(body, severity) {
      if (body.lost || body.broken || severity < body.strength) return;
      body.broken = true;
      body.impactFlash = 0.65;
      this.emit("broken", body, body.name + "が破損！");
    }
    lose(body) {
      body.lost = true;
      body.grounded = false;
      body.vx = Math.min(-1.5, body.vx - this.speed * 0.65);
      body.vz = Math.max(0.8, body.vz);
      body.spin -= 1.7;
      this.emit("lost", body, body.name + "が落下！");
    }
    step(dt, input) {
      if (this.done) return;
      this.time += dt;
      const previous = this.speed;
      const drag = 0.36 + this.speed * 0.045;
      const motor = 3.65 - this.profile.mass * 0.004;
      let accel = input.brake ? -7.8 : input.gas ? motor : -drag;
      if (this.finishTime !== null) accel = -13;
      this.speed = clamp(this.speed + accel * dt, 0, 13.34 - this.profile.mass * 0.0018);
      accel = (this.speed - previous) / dt;
      this.distance = Math.min(GOAL, this.distance + (previous + this.speed) * dt * 0.5);
      while (this.nextShock < this.shocks.length && this.distance >= this.shocks[this.nextShock].at) {
        this.shake(this.shocks[this.nextShock++]);
      }
      const rear = terrain(this.distance - AXLE_METRES / 2),
        front = terrain(this.distance + AXLE_METRES / 2);
      const targetLift = (rear + front) / 2;
      const targetPitch = Math.atan2((front - rear) * 1.9, AXLE_METRES);
      this.suspensionSpeed += ((targetLift - this.lift) * 134 - this.suspensionSpeed * 15) * dt;
      this.pitchSpeed += ((targetPitch - this.pitch) * 122 - this.pitchSpeed * 14) * dt;
      this.lift += this.suspensionSpeed * dt;
      this.pitch += this.pitchSpeed * dt;
      this.integrateCargo(dt, accel);
      if (this.distance >= GOAL && this.finishTime === null) {
        this.finishTime = this.time;
        this.emit("goal", null, "ひなた団地に到着！");
      }
      if (this.finishTime !== null && this.time - this.finishTime > 1.45) this.done = true;
    }
    integrateCargo(dt, accel) {
      // Resolve lower boxes first so the tops of moving supports stay physical floors.
      this.bodies.sort((a, b) => a.z - b.z);
      for (const b of this.bodies) {
        b.impactFlash = Math.max(0, b.impactFlash - dt);
        if (b.lost) {
          b.lostTime += dt;
          b.x += b.vx * dt;
          b.z += b.vz * dt;
          b.vz -= 17 * dt;
          b.tilt += b.spin * dt;
          continue;
        }
        const ox = b.x,
          oz = b.z;
        const inertia = -accel * (0.29 + b.risk * 0.12) - Math.sin(this.pitch) * 12;
        const friction = b.grounded ? Math.max(1.9, 5.4 - b.risk * 1.15) : 0.36;
        b.vx += inertia * dt;
        b.vx = Math.sign(b.vx) * Math.max(0, Math.abs(b.vx) - friction * dt);
        b.x += b.vx * dt;
        // The cab stops low boxes at the front. The open tail has no wall.
        if (b.x + b.w > COLS && b.z < 1.85) {
          b.x = COLS - b.w;
          this.harm(b, Math.abs(b.vx) * 0.72);
          b.vx = Math.min(0, -b.vx * 0.22);
        }
        for (const q of this.bodies) {
          if (q === b || q.lost || overlap(oz + 0.04, b.h - 0.08, q.z, q.h) < 0.09) continue;
          if (ox + b.w <= q.x + 0.025 && b.x + b.w > q.x) {
            b.x = q.x - b.w;
          } else if (ox >= q.x + q.w - 0.025 && b.x < q.x + q.w) {
            b.x = q.x + q.w;
          } else continue;
          const transferred = (b.vx * b.mass) / (b.mass + q.mass);
          q.vx += transferred * 0.58;
          b.vx = transferred * 0.38;
        }
        if (b.x + b.w * 0.52 < 0 || b.x + b.w * 0.48 > COLS) {
          this.lose(b);
          continue;
        }
        b.vz -= 16.5 * dt;
        b.z += b.vz * dt;
        let floor = 0,
          supportSpeed = 0;
        for (const q of this.bodies) {
          if (q === b || q.lost) continue;
          const top = q.z + q.h;
          if (overlap(b.x, b.w, q.x, q.w) < Math.min(b.w, q.w) * 0.22) continue;
          if (top <= oz + 0.09 && top >= floor && b.z <= top) {
            floor = top;
            supportSpeed = q.vz;
          }
        }
        b.grounded = false;
        if (b.z <= floor && b.vz <= supportSpeed) {
          const impact = Math.max(0, supportSpeed - b.vz);
          this.harm(b, impact * (1 + b.risk * 0.13));
          b.z = floor;
          if (impact > 2.2) {
            b.vz = supportSpeed + Math.min(2.7, impact * 0.18);
            b.spin *= -0.3;
          } else {
            b.vz = supportSpeed;
            b.grounded = true;
          }
        }
        b.spin += (-b.tilt * (b.grounded ? 55 : 7) - b.spin * (b.grounded ? 9 : 2.2)) * dt;
        b.tilt = clamp(b.tilt + b.spin * dt, -0.38, 0.38);
      }
    }
  }

  function settle(run) {
    const lines = cargo.map((item) => {
      const b = run.bodies.find((body) => body.id === item.id);
      const status = !b ? "unloaded" : b.lost ? "lost" : b.broken ? "broken" : "intact";
      const net = status === "intact" ? item.fee : status === "broken" ? item.fee / 2 : 0;
      return { item, status, net };
    });
    const gross = lines.reduce((sum, l) => sum + (l.status === "unloaded" ? 0 : l.item.fee), 0);
    const lost = lines.reduce((sum, l) => sum + (l.status === "lost" ? l.item.fee : 0), 0);
    const broken = lines.reduce((sum, l) => sum + (l.status === "broken" ? l.item.fee - l.net : 0), 0);
    return {
      lines,
      gross,
      lost,
      broken,
      total: gross - lost - broken,
      arrived: lines.filter((l) => l.status === "intact" || l.status === "broken").length,
    };
  }
  return {
    COLS,
    ROWS,
    LIMIT,
    GOAL,
    AXLE_METRES,
    cargo,
    byId,
    clamp,
    weight,
    placement,
    covered,
    loadProfile,
    terrain,
    segments,
    Drive,
    settle,
  };
})();
if (typeof module !== "undefined" && module.exports) module.exports = Keitora;
