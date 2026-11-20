const KeiPhysics = (() => {
  const items = [
    { id: 'fridge', name: '冷蔵庫', weight: 80, fee: 2800, fragility: 0.42, size: 1 },
    { id: 'dresser', name: 'タンス', weight: 60, fee: 2200, fragility: 0.30, size: 0.93 },
    { id: 'tv', name: 'テレビ', weight: 30, fee: 2400, fragility: 1.10, size: 0.90, fragile: true },
    { id: 'box', name: '引っ越し箱', weight: 10, fee: 900, fragility: 0.48, size: 0.84 },
    { id: 'dishes', name: '食器の箱', weight: 15, fee: 1800, fragility: 1.29, size: 0.80, fragile: true },
    { id: 'plant', name: '観葉植物', weight: 8, fee: 1100, fragility: 0.85, size: 0.98 },
  ];
  const itemById = Object.fromEntries(items.map(item => [item.id, item]));
  const course = {
    length: 450,
    hazards: [
      { at: 45, width: 9, height: 16, speed: 32, force: 0.80, name: '集落の段差', kind: 'hump' },
      { at: 104, width: 11, height: -18, speed: 29, force: 0.91, name: '砂利のくぼみ', kind: 'gravel' },
      { at: 167, width: 12, height: 26, speed: 26, force: 1.04, name: '工事区間の段差', kind: 'work' },
      { at: 235, width: 16, height: -22, speed: 28, force: 1.00, name: '荒れた舗装', kind: 'gravel' },
      { at: 306, width: 16, height: 36, speed: 25, force: 1.08, name: '急な盛り上がり', kind: 'ridge' },
      { at: 385, width: 10, height: 23, speed: 28, force: 0.95, name: '住宅前の段差', kind: 'hump' },
    ],
  };
  const payout = { base: 5000, maxBonus: 2000 };
  const columnCount = 3;
  const emptyLoad = () => Array(items.length).fill(null);
  const clamp = (value, low, high) => Math.max(low, Math.min(value, high));

  function moveCargo(load, id, destination) {
    if (!Object.hasOwn(itemById, id) || !Number.isInteger(destination) || destination < -1 || destination >= load.length) return null;
    const source = load.indexOf(id);
    if (source === destination) return load;
    const next = load.slice();
    const displaced = next[destination];
    if (displaced && source < 0) return null;
    if (source >= 0) next[source] = displaced || null;
    if (destination >= 0) next[destination] = id;

    for (let column = 0; column < columnCount; column += 1) {
      const above = column + columnCount;
      if (next[column] || !next[above]) continue;
      if (destination === above) return null;
      next[column] = next[above];
      next[above] = null;
    }
    return next;
  }

  function measureLoad(load) {
    let weight = 0;
    let upperWeight = 0;
    let horizontalMoment = 0;
    let count = 0;
    load.forEach((id, slot) => {
      if (!id) return;
      const mass = itemById[id].weight;
      count += 1;
      weight += mass;
      horizontalMoment += mass * (slot % columnCount - 1);
      if (slot >= columnCount) upperWeight += mass;
    });
    const bias = weight ? horizontalMoment / weight : 0;
    return { weight, bias, count, upperShare: weight ? upperWeight / weight : 0, front: Math.round(50 + bias * 37) };
  }

  // World distances use metres. Road heights and the bed simulation use canvas pixels.
  const pixelsPerMetre = 12.5;
  const vehicle = { width: 248, height: 101, pivot: 0.504, rearWheel: -70, frontWheel: 70, deck: -50, stackRise: 39 };
  const bedSlots = [-91, -42, 7];

  function roadHeight(position) {
    let height = 427 + 10 * Math.sin(position / 31) - 8 * Math.sin(position / 16) + 5 * Math.sin(position / 9);
    for (const hazard of course.hazards) {
      const part = (position - hazard.at) / hazard.width;
      if (part <= 0 || part >= 1) continue;
      const shape = Math.sin(Math.PI * part) ** 2;
      const surface = hazard.kind === 'gravel' ? 0.61 + 0.39 * Math.sin(3 * Math.PI * part) ** 2 : 1;
      height -= hazard.height * shape * surface;
    }
    return height;
  }

  function wheelPose(position) {
    const rear = roadHeight(position + vehicle.rearWheel / pixelsPerMetre);
    const front = roadHeight(position + vehicle.frontWheel / pixelsPerMetre);
    return { y: (rear + front) / 2, angle: Math.atan2(front - rear, vehicle.frontWheel - vehicle.rearWheel) };
  }

  function start(load) {
    const slots = load.map((id, index) => id && ({
      id, col: index % columnCount, row: index >= columnCount ? 1 : 0,
      condition: 100, lost: false, x: 0, lift: 0, vx: 0, vy: 0, tilt: 0,
    }));
    const impulses = course.hazards.flatMap(hazard => {
      const contact = hazard.at + hazard.width * 0.32;
      return [
        { position: contact - vehicle.frontWheel / pixelsPerMetre, hazard, rear: false },
        { position: contact - vehicle.rearWheel / pixelsPerMetre, hazard, rear: true },
      ];
    });
    return {
      slots, impulses, nextImpulse: 0, metrics: measureLoad(load),
      position: 0, speed: 0, time: 0, started: false, finished: false,
      body: { ...wheelPose(0), velocity: 0, angularVelocity: 0 },
      fallen: [], events: [],
    };
  }

  function damage(run, cargo, points) {
    const before = cargo.condition;
    cargo.condition = clamp(before - points, 0, 100);
    if (before === 100 && cargo.condition < 100) run.events.push({ type: 'damaged', id: cargo.id });
  }

  function hitBump(run, { hazard, rear }) {
    const speedRatio = run.speed * 3.6 / hazard.speed;
    const intensity = speedRatio ** 2 * hazard.force * (rear ? 0.63 : 1);
    const balance = 1 + Math.abs(run.metrics.bias) * 0.40 + run.metrics.upperShare * 0.44;
    const direction = Math.sign(hazard.height) * (rear ? 0.72 : -1);
    run.body.velocity -= Math.min(150, intensity * 37);
    run.body.angularVelocity += direction * Math.min(1.2, intensity * 0.28);

    for (const cargo of run.slots) {
      if (!cargo || cargo.lost) continue;
      const item = itemById[cargo.id];
      const stacked = cargo.row > 0;
      const edge = cargo.col - 1;
      const restraint = stacked ? 1.33 + item.weight / 245 : 0.82 - item.weight / 850;
      const force = intensity * balance * restraint * (edge === 0 ? 0.84 : 1.10);
      const kick = Math.max(0, force - 0.43);
      const damagePoints = Math.round(Math.max(0, force - 1.67) * item.fragility * 16);
      damage(run, cargo, damagePoints);
      cargo.vy += Math.min(225, kick * (stacked ? 36 : 22));
      cargo.vx += kick * (direction * (stacked ? 32 : 21) + edge * 8);
    }
  }

  function loseCargo(run, cargo) {
    cargo.lost = true;
    run.events.push({ type: 'lost', id: cargo.id });
    const localX = bedSlots[cargo.col] + cargo.x;
    const localY = vehicle.deck - cargo.row * vehicle.stackRise - cargo.lift;
    const { angle, y, velocity } = run.body;
    run.fallen.push({
      id: cargo.id, angle: angle + cargo.tilt, spin: cargo.vx * 0.045,
      position: run.position + (localX * Math.cos(angle) - localY * Math.sin(angle)) / pixelsPerMetre,
      y: y + localX * Math.sin(angle) + localY * Math.cos(angle),
      speed: run.speed + cargo.vx / pixelsPerMetre, vy: velocity - cargo.vy,
    });
  }

  function updateCargo(run, cargo, acceleration, dt) {
    const item = itemById[cargo.id];
    const flying = cargo.lift > 0 || cargo.vy > 0;
    const spring = flying ? 0.55 : 15 + item.weight / 8;
    const drag = flying ? 0.9 : 5.0 + item.weight / 32;
    cargo.vx += (-acceleration * (cargo.row ? 2 : 1.1) + Math.sin(run.body.angle) * 67 - cargo.x * spring) * dt;
    cargo.vx *= Math.exp(-drag * dt);
    cargo.x += cargo.vx * dt;
    if (flying) {
      cargo.vy -= 310 * dt;
      cargo.lift += cargo.vy * dt;
      if (cargo.lift <= 0) {
        const landingDamage = Math.round(Math.max(0, -cargo.vy - 76) * item.fragility * 0.14);
        damage(run, cargo, landingDamage);
        cargo.lift = 0;
        cargo.vy = 0;
      }
    }
    cargo.tilt = clamp(cargo.vx * 0.003, -0.60, 0.60);
    const localX = bedSlots[cargo.col] + cargo.x;
    const lip = cargo.row === 0 && cargo.lift < 17 ? 13 : 0;
    if (localX < -125 - lip || localX > 31 + lip) loseCargo(run, cargo);
  }

  function updateFallen(run, dt) {
    for (const cargo of run.fallen) {
      cargo.position += cargo.speed * dt;
      cargo.y += cargo.vy * dt;
      cargo.vy += 365 * dt;
      cargo.angle += cargo.spin * dt;
      const ground = roadHeight(cargo.position);
      if (cargo.y < ground) continue;
      cargo.y = ground;
      cargo.vy = cargo.vy > 36 ? -cargo.vy * 0.31 : 0;
      cargo.speed *= Math.exp(-4 * dt);
      cargo.spin *= Math.exp(-5 * dt);
    }
    run.fallen = run.fallen.filter(cargo => cargo.position > run.position - 36);
  }

  function step(run, input, dt) {
    if (run.finished) return;
    if (!run.started && !input.throttle) return;
    run.started = true;
    run.time += dt;
    const maximum = 65 / 3.6;
    const acceleration = input.brake ? -9.8 - run.speed * 0.055 : input.throttle
      ? (5.05 - run.metrics.weight * 0.0027) * (1 - 0.63 * (run.speed / maximum))
      : -0.59 - run.speed * 0.018;
    run.speed = clamp(run.speed + acceleration * dt, 0, maximum);
    run.position = Math.min(course.length, run.position + run.speed * dt);
    while (run.nextImpulse < run.impulses.length && run.position >= run.impulses[run.nextImpulse].position) {
      hitBump(run, run.impulses[run.nextImpulse]);
      run.nextImpulse += 1;
    }
    const target = wheelPose(run.position);
    const body = run.body;
    body.velocity += ((target.y - body.y) * 157 - body.velocity * 19) * dt;
    body.y += body.velocity * dt;
    body.angularVelocity += ((target.angle - body.angle) * 105 - body.angularVelocity * 15) * dt;
    body.angle += body.angularVelocity * dt;

    const fallenBefore = run.fallen.length;
    for (const cargo of run.slots) {
      if (!cargo || cargo.lost) continue;
      updateCargo(run, cargo, run.speed > 0 ? acceleration : 0, dt);
    }
    for (let col = 0; col < columnCount; col += 1) {
      const top = run.slots[col + columnCount];
      if (!top || top.lost || top.row === 0 || !run.slots[col]?.lost) continue;
      top.row = 0;
      top.lift += vehicle.stackRise;
    }
    if (run.fallen.length !== fallenBefore) {
      const remaining = emptyLoad();
      for (const cargo of run.slots) {
        if (cargo && !cargo.lost) remaining[cargo.col + cargo.row * columnCount] = cargo.id;
      }
      run.metrics = measureLoad(remaining);
    }
    updateFallen(run, dt);
    run.finished = run.position >= course.length;
  }

  function itemStatus(cargo) {
    if (!cargo) return 'unloaded';
    if (cargo.lost) return 'lost';
    return cargo.condition < 100 ? 'damaged' : 'intact';
  }

  function settle(run) {
    const rows = items.map(item => {
      const cargo = run.slots.find(slot => slot?.id === item.id);
      const status = itemStatus(cargo);
      const fee = cargo && !cargo.lost ? Math.round(item.fee * cargo.condition / 100) : 0;
      return { item, status, condition: cargo?.condition ?? null, fee, deduction: item.fee - fee };
    });
    const fees = items.reduce((total, item) => total + item.fee, 0);
    const deducted = Object.fromEntries(['unloaded', 'lost', 'damaged'].map(status => [status, rows.reduce(
      (total, row) => total + (row.status === status ? row.deduction : 0), 0,
    )]));
    const bonus = clamp(Math.floor((72 - run.time) * 0.8) * 50, 0, payout.maxBonus);
    const total = payout.base + fees - deducted.unloaded - deducted.lost - deducted.damaged + bonus;
    return { rows, fees, deducted, bonus, total, base: payout.base };
  }

  return { items, itemById, course, emptyLoad, moveCargo, measureLoad, pixelsPerMetre, vehicle, bedSlots,
    start, step, settle, itemStatus, roadHeight };
})();

if (typeof module === 'object' && module.exports) module.exports = KeiPhysics;
