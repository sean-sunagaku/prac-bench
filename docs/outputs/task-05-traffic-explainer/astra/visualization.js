"use strict";

// Centreline measured on the overhead circuit artwork. Clockwise distance is positive.
const circuit = {
  width: 1931, height: 814,
  left: 388, right: 1540, middle: 407, radius: 254,
};
const straightLength = circuit.right - circuit.left;
const turnLength = Math.PI * circuit.radius;
const circuitPixels = 2 * (straightLength + turnLength);

function roadPose(metres, inward = 0) {
  const fraction = metres / TrafficModel.length;
  let distance = (fraction - Math.floor(fraction)) * circuitPixels;
  let x, y, angle;
  if (distance < straightLength) {
    x = circuit.left + distance;
    y = circuit.middle - circuit.radius;
    angle = 0;
  } else if (distance < straightLength + turnLength) {
    angle = (distance - straightLength) / circuit.radius;
    x = circuit.right + circuit.radius * Math.sin(angle);
    y = circuit.middle - circuit.radius * Math.cos(angle);
  } else if (distance < 2 * straightLength + turnLength) {
    x = circuit.right - (distance - straightLength - turnLength);
    y = circuit.middle + circuit.radius;
    angle = Math.PI;
  } else {
    distance -= 2 * straightLength + turnLength;
    angle = Math.PI + distance / circuit.radius;
    x = circuit.left + circuit.radius * Math.sin(angle);
    y = circuit.middle - circuit.radius * Math.cos(angle);
  }
  return { x: x - inward * Math.sin(angle), y: y + inward * Math.cos(angle), angle };
}

function sizeCanvas(canvas) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const scale = Math.min(window.devicePixelRatio || 1, 3);
  const pixelsWide = Math.max(1, Math.round(width * scale));
  const pixelsHigh = Math.max(1, Math.round(height * scale));
  if (canvas.width !== pixelsWide) canvas.width = pixelsWide;
  if (canvas.height !== pixelsHigh) canvas.height = pixelsHigh;
  return { width, height };
}

class RoadView {
  constructor(canvas, pin, repaint) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.pin = pin;
    this.poses = [];
    this.sprites = {};
    const spriteFiles = {
      teal: "assets/car-teal.webp",
      coral: "assets/car-coral.webp",
      gold: "assets/car-gold.webp",
    };
    for (const [color, url] of Object.entries(spriteFiles)) {
      const sprite = new Image();
      sprite.onload = repaint;
      sprite.src = url;
      this.sprites[color] = sprite;
    }
  }

  draw(model, fraction = 1) {
    const canvas = this.canvas;
    const ctx = this.context;
    const size = sizeCanvas(canvas);
    if (!size.width || !size.height) return;
    ctx.setTransform(canvas.width / circuit.width, 0, 0, canvas.height / circuit.height, 0, 0);
    ctx.clearRect(0, 0, circuit.width, circuit.height);
    this.drawTrail(model, Math.min(size.width / circuit.width, size.height / circuit.height));
    this.drawBrakePin(model, size);
    this.poses = model.cars.map(car => roadPose(
      car.previousPosition + (car.position - car.previousPosition) * fraction
    ));

    for (let i = 0; i < model.count; i++) {
      if (i !== model.target) this.drawCar(this.poses[i], false, model.isSlow(i));
    }
    this.drawCar(this.poses[model.target], true, model.isSlow(model.target), model.braking);
  }

  drawCar(pose, selected, slow, braking = false) {
    const ctx = this.context;
    const width = 59;
    const height = width * 106 / 192;
    ctx.save();
    ctx.translate(pose.x, pose.y);
    ctx.rotate(pose.angle);
    ctx.fillStyle = "rgba(12, 25, 19, .46)";
    ctx.beginPath();
    ctx.ellipse(1, 3.8, width * 0.46, height * 0.41, 0, 0, Math.PI * 2);
    ctx.fill();
    if (selected) {
      ctx.beginPath();
      ctx.roundRect(-width / 2 - 4, -height / 2 - 3, width + 8, height + 6, 11);
      ctx.strokeStyle = "#fff3b5";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    const color = selected ? "gold" : slow ? "coral" : "teal";
    const sprite = this.sprites[color];
    if (sprite.complete && sprite.naturalWidth) {
      ctx.drawImage(sprite, -width / 2, -height / 2, width, height);
    } else {
      ctx.fillStyle = { teal: "#21a196", gold: "#e8ac21", coral: "#ef6a57" }[color];
      ctx.beginPath();
      ctx.roundRect(-width / 2, -height / 2, width, height, 9);
      ctx.fill();
    }
    if (slow || braking) {
      ctx.strokeStyle = braking ? "#ff513d" : "#fff3dd";
      ctx.lineWidth = braking ? 5 : 3;
      ctx.lineCap = "round";
      if (braking) {
        ctx.shadowColor = "#ff301a";
        ctx.shadowBlur = 4;
      }
      ctx.beginPath();
      ctx.moveTo(-width * 0.43, -height * 0.27);
      ctx.lineTo(-width * 0.43, -height * 0.11);
      ctx.moveTo(-width * 0.43, height * 0.11);
      ctx.lineTo(-width * 0.43, height * 0.27);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawBrakePin(model, size) {
    this.pin.hidden = !model.event;
    if (!model.event) return;
    const start = model.event.startPosition;
    const flag = roadPose(start, -82);
    const scaleX = size.width / circuit.width;
    const scaleY = size.height / circuit.height;
    const halfWidth = this.pin.offsetWidth / 2;
    const x = Math.max(halfWidth + 2, Math.min(size.width - halfWidth - 2, flag.x * scaleX));
    // Put side-of-road labels in the outer margin of a small map, leaving the
    // cars and the infield readings visible. The leader line still marks the origin.
    const useMargin = size.width < 380 && (flag.x < circuit.left || flag.x > circuit.right);
    let y = flag.y * scaleY;
    if (useMargin) {
      const margin = this.pin.offsetHeight / 2 + 3;
      y = flag.y < circuit.middle ? margin : size.height - margin;
    }
    this.pin.style.left = x + "px";
    this.pin.style.top = y + "px";
    const near = roadPose(start, -26);
    const far = roadPose(start, -66);
    const ctx = this.context;
    ctx.beginPath();
    ctx.moveTo(near.x, near.y);
    ctx.lineTo(far.x, far.y);
    if (useMargin) ctx.lineTo(x / scaleX, y / scaleY);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#fff4ce";
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#bd8306";
    ctx.stroke();
  }

  drawTrail(model, scale) {
    const trail = model.event?.trail;
    if (!trail?.length) return;
    const ctx = this.context;
    const inset = Math.max(48, 8 / scale);
    const radius = Math.max(6.4, 2.2 / scale);
    const outline = Math.max(2.5, 1 / scale);
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 0; i < trail.length; i++) {
      const mark = trail[i];
      const point = roadPose(mark.position, inset);
      const age = model.time - mark.time;
      ctx.globalAlpha = Math.max(0.18, 1 - age / 9);
      let delta = 0;
      if (i > 0 && (trail[i - 1].index + 1) % model.count === mark.index) {
        const prev = trail[i - 1];
        delta = TrafficModel.displacement(prev.position, mark.position);
        ctx.beginPath();
        for (let j = 0; j <= 8; j++) {
          const p = roadPose(prev.position + delta * j / 8, inset);
          if (j === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.lineWidth = Math.max(6, 2.4 / scale);
        ctx.strokeStyle = "#ffead9";
        ctx.stroke();
        ctx.lineWidth = Math.max(3.5, 1.3 / scale);
        ctx.strokeStyle = "#ba4736";
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#cb503e";
      ctx.fill();
      ctx.strokeStyle = "#fff3dd";
      ctx.lineWidth = outline;
      ctx.stroke();
      if (i === trail.length - 1 && Math.abs(delta) > 1 && age < 2.5) {
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(point.angle + (delta < 0 ? Math.PI : 0));
        ctx.beginPath();
        const tip = Math.max(18, 8 / scale);
        const halfHeight = Math.max(8.5, 4 / scale);
        ctx.moveTo(tip, 0);
        ctx.lineTo(1, -halfHeight);
        ctx.lineTo(1, halfHeight);
        ctx.closePath();
        ctx.strokeStyle = "#fff3dd";
        ctx.lineWidth = outline;
        ctx.stroke();
        ctx.fillStyle = "#ba4736";
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  carAt(clientX, clientY, touch) {
    const bounds = this.canvas.getBoundingClientRect();
    const x = clientX - bounds.left;
    const y = clientY - bounds.top;
    let best = -1;
    let minDistance = Math.max(touch ? 20 : 10, 35 * bounds.width / circuit.width);
    this.poses.forEach((pose, i) => {
      const dx = x - pose.x * bounds.width / circuit.width;
      const dy = y - pose.y * bounds.height / circuit.height;
      const distance = Math.hypot(dx, dy);
      if (distance < minDistance) {
        best = i;
        minDistance = distance;
      }
    });
    return best;
  }
}

const chartSeries = [
  { label: "注目車", color: "#b37805", dash: [] },
  { label: "1台後ろ", color: "#167865", dash: [6, 3] },
  { label: "2台後ろ", color: "#4c7097", dash: [1.4, 3] },
];

class SpeedChart {
  static duration = 20;
  static sampleEvery = 5;

  constructor(canvas, label, description) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.label = label;
    this.description = description;
    this.samples = [];
    this.inspected = null;
    this.plot = { left: 26, width: 1 };
    canvas.addEventListener("pointermove", event => {
      if (event.pointerType === "mouse") this.inspectAt(event.clientX);
    });
    canvas.addEventListener("pointerdown", event => this.inspectAt(event.clientX));
    canvas.addEventListener("pointerleave", event => {
      if (event.pointerType === "mouse") this.clearInspection();
    });
    canvas.addEventListener("blur", () => this.clearInspection());
    canvas.addEventListener("keydown", event => this.onKey(event));
  }

  restart(model, afterBrake) {
    this.startTick = model.tick;
    this.afterBrake = afterBrake;
    this.samples = [];
    this.inspected = null;
    this.capture(model);
  }

  capture(model) {
    const ticks = model.tick - this.startTick;
    if (ticks % SpeedChart.sampleEvery) return false;
    const elapsed = ticks * TrafficModel.step;
    if (this.afterBrake && elapsed > SpeedChart.duration) return false;
    const values = chartSeries.map((_, offset) => model.cars[(model.target + offset) % model.count].speed * 3.6);
    this.samples.push({ time: elapsed, values });
    this.windowStart = Math.max(0, elapsed - SpeedChart.duration);
    while (this.samples[0].time < this.windowStart - 0.001) this.samples.shift();
    if (this.inspected && this.inspected.time < this.windowStart) this.inspected = null;
    return true;
  }

  inspectAt(clientX) {
    if (!this.samples.length) return;
    const offset = clientX - this.canvas.getBoundingClientRect().left;
    const time = this.windowStart + (offset - this.plot.left) / this.plot.width * this.plot.duration;
    this.inspected = this.samples.reduce((a, b) => Math.abs(a.time - time) < Math.abs(b.time - time) ? a : b);
    this.draw();
  }

  onKey(event) {
    const current = this.inspected ? this.samples.indexOf(this.inspected) : this.samples.length - 1;
    let index;
    if (event.key === "ArrowLeft") index = current - 1;
    else if (event.key === "ArrowRight") index = current + 1;
    else if (event.key === "Home") index = 0;
    else if (event.key === "End") index = this.samples.length - 1;
    else if (event.key === "Escape") return this.clearInspection();
    else return;
    event.preventDefault();
    this.inspected = this.samples[Math.max(0, Math.min(this.samples.length - 1, index))];
    this.draw();
  }

  clearInspection() {
    if (!this.inspected) return;
    this.inspected = null;
    this.draw();
  }

  draw() {
    const { width, height } = sizeCanvas(this.canvas);
    if (!width || !height || !this.samples.length) return;
    const ctx = this.ctx;
    ctx.setTransform(this.canvas.width / width, 0, 0, this.canvas.height / height, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const left = 26, right = width - 18, top = 17, bottom = height - 18;
    const end = this.samples[this.samples.length - 1].time;
    const duration = this.afterBrake ? SpeedChart.duration : Math.min(SpeedChart.duration, Math.max(1, Math.ceil(end)));
    this.plot = { left, width: right - left, duration };
    const x = time => left + (time - this.windowStart) / duration * (right - left);
    const y = speed => bottom - speed / 60 * (bottom - top);
    ctx.font = '10px "DM Sans", sans-serif';
    ctx.textBaseline = "middle";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#637269";
    ctx.textAlign = "left";
    ctx.fillText("km/h", 1, 6);
    for (const speed of [0, 30, 60]) {
      ctx.textAlign = "right";
      ctx.fillText(String(speed), left - 7, y(speed));
      ctx.beginPath();
      ctx.setLineDash(speed ? [3, 4] : []);
      ctx.strokeStyle = speed ? "#dbe2dc" : "#c7d1ca";
      ctx.moveTo(left, y(speed) + 0.5);
      ctx.lineTo(right, y(speed) + 0.5);
      ctx.stroke();
    }
    const rolling = this.windowStart > 0;
    for (const part of [0, 0.25, 0.5, 0.75, 1]) {
      const t = duration * part;
      const px = x(this.windowStart + t);
      ctx.beginPath();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = "#e4e9e4";
      ctx.moveTo(px, top);
      ctx.lineTo(px, bottom);
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillText(String(rolling ? t - SpeedChart.duration : t) + (part === 1 ? " 秒" : ""), px, bottom + 11);
    }

    const reading = this.inspected || this.samples[this.samples.length - 1];
    if (this.inspected) {
      ctx.beginPath();
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = "#757d75";
      ctx.moveTo(x(reading.time), top);
      ctx.lineTo(x(reading.time), bottom);
      ctx.stroke();
    }
    chartSeries.forEach((series, i) => {
      ctx.beginPath();
      ctx.setLineDash(series.dash);
      ctx.strokeStyle = series.color;
      ctx.lineWidth = 2.25;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      this.samples.forEach((sample, j) => {
        if (j === 0) ctx.moveTo(x(sample.time), y(sample.values[i]));
        else ctx.lineTo(x(sample.time), y(sample.values[i]));
      });
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(x(reading.time), y(reading.values[i]), this.inspected ? 3.4 : 2.4, 0, 2 * Math.PI);
      ctx.fillStyle = series.color;
      ctx.fill();
    });
    const values = reading.values.map(Math.round);
    if (this.inspected) {
      this.label.textContent = reading.time.toFixed(1) + "秒 ｜ " + values.join(" / ") + " km/h";
    } else if (this.afterBrake) {
      this.label.textContent = end >= SpeedChart.duration ? "ブレーキ後の20秒間" : "ブレーキから " + end.toFixed(1) + " 秒";
    } else {
      this.label.textContent = rolling ? "直近20秒" : "走行開始から";
    }
    const description = reading.time.toFixed(1) + "秒、" + chartSeries.map((s, i) => s.label + " " + values[i] + " km/h").join("、");
    this.description.textContent = description + "。グラフに触れるか左右の矢印キーで時刻を選べます。";
    this.canvas.setAttribute("aria-valuemin", this.samples[0].time.toFixed(1));
    this.canvas.setAttribute("aria-valuemax", end.toFixed(1));
    this.canvas.setAttribute("aria-valuenow", reading.time.toFixed(1));
    this.canvas.setAttribute("aria-valuetext", description);
  }
}
