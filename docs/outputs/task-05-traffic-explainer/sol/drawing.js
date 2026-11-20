const TrafficDrawing = (() => {
  const plotInk = "#e2dacf";
  const mono = 'ui-monospace, "SFMono-Regular", Consolas, monospace';
  const sans = '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';

  function fit(canvas) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const scale = Math.min(2, window.devicePixelRatio || 1);
    const pixelWidth = Math.round(width * scale);
    const pixelHeight = Math.round(height * scale);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height };
  }

  function box(ctx, x, y, width, height, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
  }

  function drawCar(ctx, x, y, length, brake = 0, marked = false) {
    const scale = length / 44;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, Math.max(scale, 0.47));

    box(ctx, -21, -8, 44, 19, 6, "#10111165");
    box(ctx, -15, -10, 7, 20, 1.5, "#161919");
    box(ctx, 9, -10, 7, 20, 1.5, "#161919");
    box(ctx, 6, -10.2, 4, 20.4, 1.4, brake > 0.12 ? "#bd5a45" : "#9b9b90");

    const body = ctx.createLinearGradient(0, -10, 0, 10);
    body.addColorStop(0, brake > 0.12 ? "#ffbba8" : "#f5f2e8");
    body.addColorStop(0.45, brake > 0.12 ? "#cc6854" : "#cecbc1");
    body.addColorStop(1, brake > 0.12 ? "#a83c2c" : "#959890");
    box(ctx, -22, -9, 44, 18, 5.5, body);
    ctx.strokeStyle = "#272a28";
    ctx.lineWidth = 0.85;
    ctx.stroke();

    box(ctx, -13, -7.2, 27, 14.4, 3.8, "#262d2d");
    box(ctx, -10.4, -5.6, 17, 11.2, 1.7, brake > 0.12 ? "#cf6d59" : "#c3c1b7");
    ctx.fillStyle = "#59615c";
    ctx.beginPath();
    ctx.moveTo(7.5, -5.8);
    ctx.lineTo(12.6, -4.6);
    ctx.lineTo(12.6, 4.6);
    ctx.lineTo(7.5, 5.8);
    ctx.closePath();
    ctx.fill();
    box(ctx, 19.7, -6, 1.35, 3.1, 0.5, "#fff7cb");
    box(ctx, 19.7, 3, 1.35, 3.1, 0.5, "#fff7cb");

    if (brake > 0.12) {
      ctx.shadowColor = "#ff5727";
      ctx.shadowBlur = 8;
    }
    const red = brake > 0.12 ? "#ff9272" : "#ac4b3b";
    box(ctx, -21.5, -6.4, 2.6, 3.6, 0.8, red);
    box(ctx, -21.5, 2.8, 2.6, 3.6, 0.8, red);
    ctx.shadowBlur = 0;

    if (marked) {
      ctx.strokeStyle = "#ff9d86";
      ctx.lineWidth = Math.max(1.35, 1.3 / scale);
      ctx.beginPath();
      ctx.roundRect(-25.5, -12.8, 51, 25.6, 7);
      ctx.stroke();
    }
    ctx.restore();
  }

  function brakeStrength(acceleration) {
    return Math.max(0, Math.min(1, (-acceleration - 0.13) / 2.7));
  }

  function road(canvas, cars, target, queue) {
    const { ctx, width, height } = fit(canvas);
    if (!width || !height) return;

    const pavement = ctx.createLinearGradient(0, 0, 0, height);
    pavement.addColorStop(0, "#282927");
    pavement.addColorStop(0.48, "#393b38");
    pavement.addColorStop(1, "#292a28");
    ctx.fillStyle = pavement;
    ctx.fillRect(0, 0, width, height);
    const length = (Traffic.VEHICLE_LENGTH + 2.5) / Traffic.LENGTH * width;
    if (queue) {
      const tail = cars[queue.tail].position;
      const span = Traffic.wrap(cars[queue.head].position - tail);
      const start = tail / Traffic.LENGTH * width - length * 0.71;
      const bandWidth = span / Traffic.LENGTH * width + length * 1.42;
      for (const shift of [-width, 0, width]) {
        const x = start + shift;
        box(ctx, x, 10, bandWidth, height - 20, 5, "#dca15841");
        ctx.strokeStyle = "#f6ce8e";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x, height - 18);
        ctx.lineTo(x, height - 12);
        ctx.lineTo(x + bandWidth, height - 12);
        ctx.lineTo(x + bandWidth, height - 18);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = "#ede7dba8";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([16, 10]);
    ctx.lineDashOffset = 4;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(width, 5);
    ctx.moveTo(0, height - 5);
    ctx.lineTo(width, height - 5);
    ctx.stroke();
    ctx.setLineDash([]);

    cars.forEach((car, index) => {
      const x = car.position / Traffic.LENGTH * width;
      const braking = brakeStrength(car.acceleration);
      const marked = index === target;
      drawCar(ctx, x, height / 2, length, braking, marked);
      if (x < length * 0.6) drawCar(ctx, x + width, height / 2, length, braking, marked);
      if (width - x < length * 0.6) drawCar(ctx, x - width, height / 2, length, braking, marked);
    });
  }

  function brakeOnsets(run) {
    const points = [];
    const count = run.frames[0].cars.length;
    let lastTick = 0;
    for (let follower = 0; follower < count; follower++) {
      const index = (run.target + count - follower) % count;
      const tick = run.frames.findIndex(({ cars }) => cars[index].acceleration <= -0.45);
      if (tick <= lastTick) break;
      points.push({ tick, position: run.frames[tick].cars[index].position });
      lastTick = tick;
    }
    return points;
  }

  function heatmap(run) {
    const layer = document.createElement("canvas");
    layer.width = 960;
    layer.height = 450;
    const ctx = layer.getContext("2d");
    const stride = 3;
    const total = run.frames.length - 1;
    const rowHeight = stride * layer.height / total;

    // Each mark is a sampled position and deceleration, in model coordinates.
    for (let tick = 1; tick <= total; tick += stride) {
      const y = (tick - 1) / total * layer.height;
      for (const car of run.frames[tick].cars) {
        const strength = brakeStrength(car.acceleration);
        if (strength === 0) continue;
        const x = car.position / Traffic.LENGTH * layer.width;
        const alpha = 0.18 + 0.8 * Math.pow(strength, 0.55);
        ctx.fillStyle = `rgba(249, 104, 77, ${alpha * 0.26})`;
        ctx.fillRect(x - 12, y, 24, rowHeight + 0.15);
        ctx.fillStyle = `rgba(247, 112, 83, ${alpha * 0.52})`;
        ctx.fillRect(x - 7, y, 14, rowHeight + 0.15);
        ctx.fillStyle = `rgba(255, 166, 134, ${alpha})`;
        ctx.fillRect(x - 3.8, y, 7.6, rowHeight + 0.15);
      }
    }
    return { layer, onsets: brakeOnsets(run) };
  }

  function plot(canvas, chart, elapsed, example) {
    const { ctx, width, height } = fit(canvas);
    if (!width || !height) return;

    const left = width > 390 ? 47 : 35;
    const right = width - 12;
    const top = 12;
    const bottom = height - 35;
    const plotWidth = right - left;
    const plotHeight = bottom - top;
    const progress = Math.max(0, elapsed / Traffic.DURATION);

    ctx.fillStyle = "#1c1e1d";
    ctx.fillRect(left, top, plotWidth, plotHeight);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#eee0d024";
    ctx.fillStyle = plotInk;
    ctx.font = `11px ${mono}`;

    for (let distance = 0; distance <= Traffic.LENGTH; distance += 40) {
      const x = left + distance / Traffic.LENGTH * plotWidth;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom + 3);
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillText(distance, x, bottom + 14);
    }

    for (let time = 0; time <= Traffic.DURATION; time += 3) {
      const y = top + time / Traffic.DURATION * plotHeight;
      ctx.beginPath();
      ctx.moveTo(left - 3, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillText(time, left - 7, y + 4);
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, plotWidth, plotHeight * (example ? 1 : progress));
    ctx.clip();
    ctx.globalAlpha = example ? 0.78 : 1;
    ctx.drawImage(chart.layer, left, top, plotWidth, plotHeight);

    ctx.strokeStyle = "#ffd1b6";
    ctx.fillStyle = "#ffd1b6";
    ctx.lineWidth = 1.3;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    const visibleOnsets = example ? chart.onsets : chart.onsets.filter(({ tick }) => tick * Traffic.STEP <= elapsed);
    visibleOnsets.forEach(({ tick, position }, i) => {
      const x = left + position / Traffic.LENGTH * plotWidth;
      const y = top + tick * Traffic.STEP / Traffic.DURATION * plotHeight;
      const wrapsEdge = i > 0 && Math.abs(position - visibleOnsets[i - 1].position) > Traffic.LENGTH / 2;
      if (i === 0 || wrapsEdge) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    for (const { tick, position } of visibleOnsets) {
      const x = left + position / Traffic.LENGTH * plotWidth;
      const y = top + tick * Traffic.STEP / Traffic.DURATION * plotHeight;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = "#e1d6c66e";
    ctx.strokeRect(left, top, plotWidth, plotHeight);

    if (!example && progress > 0 && progress < 1) {
      const y = top + progress * plotHeight;
      ctx.strokeStyle = "#e9dfca7a";
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }

    ctx.font = `11px ${sans}`;
    ctx.textAlign = "center";
    ctx.fillText("コース上の位置 (m)", left + plotWidth / 2, height - 5);
    ctx.save();
    ctx.translate(10, top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("時間 (秒)", 0, 0);
    ctx.restore();
  }

  function stepDiagram(canvas, stage) {
    const { ctx, width, height } = fit(canvas);
    const phases = [
      [0.14, 0.44, 0.74],
      [0.27, 0.57, 0.78],
      [0.40, 0.61, 0.90],
    ];
    const positions = phases[stage];
    const active = 2 - stage;
    const y = height * 0.60;
    const size = Math.min(68, width * 0.18);

    ctx.strokeStyle = "#aaa196";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 8.5);
    ctx.lineTo(width - 4, height - 8.5);
    ctx.lineTo(width - 9.5, height - 13.5);
    ctx.moveTo(width - 4, height - 8.5);
    ctx.lineTo(width - 9.5, height - 3.5);
    ctx.stroke();

    ctx.setLineDash([3, 3.5]);
    ctx.strokeStyle = "#857e70";
    ctx.beginPath();
    ctx.moveTo(positions[0] * width, y);
    ctx.lineTo(positions[2] * width, y);
    ctx.stroke();
    ctx.setLineDash([]);

    positions.forEach((x, i) => drawCar(ctx, x * width, y, size, i === active ? 1 : 0));

    const markerX = positions[active] * width;
    const markerY = y - size * 0.25;
    ctx.strokeStyle = "#ad3923";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(markerX, markerY - 2.5);
    ctx.lineTo(markerX, markerY - 11);
    ctx.moveTo(markerX - 5.5, markerY - 1);
    ctx.lineTo(markerX - 10, markerY - 8);
    ctx.moveTo(markerX + 5.5, markerY - 1);
    ctx.lineTo(markerX + 10, markerY - 8);
    ctx.stroke();
  }

  return { road, heatmap, plot, stepDiagram };
})();
