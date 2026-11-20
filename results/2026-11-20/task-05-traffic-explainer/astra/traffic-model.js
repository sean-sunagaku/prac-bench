"use strict";

// Distances are metres, speeds are metres per second, and time is in seconds.
class TrafficModel {
  static length = 420;
  static step = 0.04;
  static carLength = 4.5;
  static stoppedGap = 2;
  static headway = 0.88;
  static freeSpeed = 60 / 3.6;
  static reactionSteps = 15;
  static brakeDuration = 2.4;
  static slowRatio = 0.85;

  static displacement(from, to) {
    const difference = to - from;
    return difference - Math.round(difference / TrafficModel.length) * TrafficModel.length;
  }

  constructor(count, target = 0, startPosition = TrafficModel.length * 0.17) {
    this.count = count;
    this.target = target;
    this.startPosition = startPosition;
    this.tick = 0;
    this.event = null;
    this.initialSpeed = this.desiredSpeed(TrafficModel.length / count);
    this.cars = Array.from({ length: count }, (_, i) => ({
      position: startPosition - i * TrafficModel.length / count,
      speed: this.initialSpeed,
      previousPosition: startPosition - i * TrafficModel.length / count,
    }));
    this.nextSpeeds = new Float64Array(count);
    this.history = Array.from({ length: TrafficModel.reactionSteps + 1 }, () => ({
      spacing: new Float64Array(count).fill(TrafficModel.length / count),
      speed: new Float64Array(count).fill(this.initialSpeed),
    }));
  }

  get time() {
    return this.tick * TrafficModel.step;
  }

  get averageSpeed() {
    return this.cars.reduce((total, car) => total + car.speed, 0) / this.count;
  }

  get braking() {
    return this.event !== null && this.time - this.event.start < TrafficModel.brakeDuration - 1e-8;
  }

  desiredSpeed(spacing) {
    const available = spacing - TrafficModel.carLength - TrafficModel.stoppedGap;
    return Math.max(0, Math.min(TrafficModel.freeSpeed, available / TrafficModel.headway));
  }

  spacing(i) {
    const leader = this.cars[(i + this.count - 1) % this.count];
    return leader.position - this.cars[i].position + (i === 0 ? TrafficModel.length : 0);
  }

  brake() {
    this.event = {
      start: this.time,
      origin: this.target,
      startPosition: this.cars[this.target].position,
      onsets: [],
      trail: [],
      lastSlow: this.time,
    };
  }

  isSlow(index) {
    return this.cars[index].speed <= this.initialSpeed * TrafficModel.slowRatio;
  }

  advance() {
    const dt = TrafficModel.step;
    if (!this.event) {
      // Equal gaps and equal speeds are an exact steady solution. Evaluating it
      // directly keeps rounding noise from becoming an unintended brake pulse.
      this.tick++;
      const origin = this.startPosition + this.time * this.initialSpeed;
      for (let i = 0; i < this.count; i++) {
        const car = this.cars[i];
        car.previousPosition = car.position;
        car.position = origin - i * TrafficModel.length / this.count;
      }
      return;
    }
    const slots = this.history.length;
    const observed = this.history[(this.tick + slots - TrafficModel.reactionSteps) % slots];
    const braking = this.braking;

    // Decide from the same past snapshot for every driver, then move everyone together.
    for (let i = 0; i < this.count; i++) {
      const leader = (i + this.count - 1) % this.count;
      const car = this.cars[i];
      const followingRange = TrafficModel.carLength + TrafficModel.stoppedGap
        + TrafficModel.freeSpeed * TrafficModel.headway;
      const attention = Math.max(0, Math.min(1, 1 - (observed.spacing[i] - followingRange) / 8));
      let acceleration = (this.desiredSpeed(observed.spacing[i]) - car.speed) / 0.9
        + 0.62 * attention * (observed.speed[leader] - observed.speed[i]);
      if (braking && i === this.event.origin) acceleration = -3.2;
      acceleration = Math.max(-6.5, Math.min(2.6, acceleration));
      const speed = Math.max(0, Math.min(TrafficModel.freeSpeed, car.speed + acceleration * dt));
      // At a very short gap, even an emergency stop of the leader must leave room.
      const room = Math.max(0, this.spacing(i) - TrafficModel.carLength - TrafficModel.stoppedGap);
      this.nextSpeeds[i] = Math.min(speed, room / dt);
    }

    this.tick++;
    const snapshot = this.history[this.tick % slots];
    for (let i = 0; i < this.count; i++) {
      const car = this.cars[i];
      car.previousPosition = car.position;
      car.speed = this.nextSpeeds[i];
      car.position += car.speed * dt;
      snapshot.speed[i] = car.speed;
    }
    for (let i = 0; i < this.count; i++) snapshot.spacing[i] = this.spacing(i);
    this.recordOnsets();
  }

  recordOnsets() {
    // Record where successive followers first cross the visible slowing threshold.
    // The positions used to draw the wave come from the cars, never a scripted animation.
    const event = this.event;
    while (event.onsets.length < this.count) {
      const i = (event.origin + event.onsets.length) % this.count;
      if (!this.isSlow(i)) break;
      event.onsets.push({ index: i, time: this.time, position: this.cars[i].position });
    }
    const slots = this.history.length;
    const previous = this.history[(this.tick + slots - 1) % slots];
    const threshold = this.initialSpeed * TrafficModel.slowRatio;
    for (let i = 0; i < this.count; i++) {
      if (!this.isSlow(i)) continue;
      event.lastSlow = this.time;
      if (previous.speed[i] > threshold) {
        event.trail.push({ index: i, time: this.time, position: this.cars[i].position });
      }
    }
    while (event.trail.length && this.time - event.trail[0].time > 8) event.trail.shift();
  }
}
