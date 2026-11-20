const Traffic = (() => {
  const LENGTH = 160;
  const VEHICLE_LENGTH = 4.8;
  const MIN_GAP = 1.2;
  const TOP_SPEED = 12;
  const STEP = 0.02;
  const DURATION = 18;
  const REACTION_STEPS = 14;
  const BRAKE_STEPS = 34;
  const BRAKE_ACCELERATION = -4.5;
  const OBSERVED_DROP = 4 / 3.6;

  // At a large gap, drivers approach their cruising speed. At small gaps,
  // the speed they aim for changes much more sharply with the gap.
  function preferredSpeed(gap) {
    const midpoint = 6.8;
    const slopeWidth = 4.2;
    const zeroOffset = Math.tanh(midpoint / slopeWidth);
    return TOP_SPEED * (Math.tanh((Math.max(0, gap) - midpoint) / slopeWidth) + zeroOffset) / (1 + zeroOffset);
  }

  function setup(count) {
    const gap = LENGTH / count - VEHICLE_LENGTH;
    return { count, gap, speed: preferredSpeed(gap) };
  }

  const setups = {
    wide: setup(7),
    medium: setup(10),
    close: setup(13),
  };

  function wrap(position) {
    return (position % LENGTH + LENGTH) % LENGTH;
  }

  function gapTo(car, leader) {
    return wrap(leader.position - car.position) - VEHICLE_LENGTH;
  }

  function makeLine(configuration, offset = 0) {
    return Array.from({ length: configuration.count }, (_, i) => ({
      position: wrap(0.73 * LENGTH + offset + i * LENGTH / configuration.count),
      speed: configuration.speed,
      acceleration: 0,
    }));
  }

  function brakeTarget(cars) {
    const targetPosition = 0.73 * LENGTH;
    return cars.reduce((nearest, car, index) => {
      const closer = Math.abs(car.position - targetPosition) < Math.abs(cars[nearest].position - targetPosition);
      return closer ? index : nearest;
    }, 0);
  }

  function advanceCar(car, leader, delayedCar, delayedLeader, forcedBrake) {
    const gap = gapTo(car, leader);
    const availableGap = Math.max(0, gap - MIN_GAP);
    const closingSpeed = Math.max(0, car.speed - leader.speed);
    const desiredSpeed = preferredSpeed(gapTo(delayedCar, delayedLeader));
    const relativeSpeed = delayedLeader.speed - car.speed;
    const safetyDeceleration = 1.4 * closingSpeed ** 2 / (2 * Math.max(0.25, availableGap));
    const acceleration = forcedBrake
      ? BRAKE_ACCELERATION
      : Math.max(-7, Math.min(1.9, 0.94 * (desiredSpeed - car.speed) + 0.33 * relativeSpeed - safetyDeceleration));

    // The gap cap prevents overlap even if the car ahead stops on this step.
    const speed = Math.max(0, Math.min(TOP_SPEED, car.speed + acceleration * STEP, availableGap / STEP));
    return {
      position: wrap(car.position + speed * STEP),
      speed,
      acceleration: (speed - car.speed) / STEP,
    };
  }

  function findQueue(cars, slowSpeed, startingGap) {
    const count = cars.length;
    const joinsLeader = cars.map((car, index) => {
      const leader = cars[(index + 1) % count];
      return car.speed < slowSpeed && leader.speed < slowSpeed && gapTo(car, leader) < startingGap;
    });

    // Start after a break so a group can cross the course seam.
    const breakIndex = joinsLeader.indexOf(false);
    let longest = null;
    let tail = 0;
    let links = 0;
    for (let step = 1; step < count; step++) {
      const index = (breakIndex + step) % count;
      if (!joinsLeader[index]) {
        links = 0;
        continue;
      }
      if (links === 0) tail = index;
      links++;
      if (links > (longest?.links ?? 0)) longest = { tail, head: (index + 1) % count, links };
    }
    return longest;
  }

  function simulate(configuration, originalCars, target) {
    const affected = new Set();
    const frames = [{ cars: originalCars, affected: 0, queue: null }];
    const count = configuration.count;
    const slowSpeed = configuration.speed * 0.55;
    for (let tick = 0; tick < DURATION / STEP; tick++) {
      const { cars } = frames[tick];
      const delayed = frames[Math.max(0, tick - REACTION_STEPS)].cars;
      const next = cars.map((car, index) => {
        const leader = (index + 1) % count;
        const updated = advanceCar(car, cars[leader], delayed[index], delayed[leader], index === target && tick < BRAKE_STEPS);
        if (index !== target && configuration.speed - updated.speed >= OBSERVED_DROP) affected.add(index);
        return updated;
      });
      const queue = findQueue(next, slowSpeed, configuration.gap);
      frames.push({ cars: next, affected: affected.size, queue });
    }
    return { frames, target };
  }

  function frameAt(run, elapsed) {
    const tick = elapsed / STEP;
    const index = Math.min(run.frames.length - 1, Math.floor(tick + 1e-8));
    const before = run.frames[index];
    const after = run.frames[index + 1];
    if (!after || tick <= index) return before;

    const cars = before.cars.map((car, i) => ({
      ...car,
      position: wrap(car.position + wrap(after.cars[i].position - car.position) * (tick - index)),
    }));
    return { ...before, cars };
  }

  return { LENGTH, VEHICLE_LENGTH, STEP, DURATION, setups, wrap, makeLine, brakeTarget, simulate, frameAt };
})();
