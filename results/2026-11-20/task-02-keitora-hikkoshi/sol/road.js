const KeiRoad = (() => {
  const { items, itemById, course, roadHeight, pixelsPerMetre, vehicle, bedSlots } = KeiPhysics;
  const width = 1000;
  const height = 545;
  const zoom = 1.33;
  const scale = pixelsPerMetre * zoom;
  const cameraX = 292;
  const projectedY = y => 421 + (y - 427) * zoom;
  const sprites = {};
  const ready = Promise.all(['route', 'truck', 'pavement', 'cone', 'flag', 'rail', ...items.map(item => item.id)].map(id => {
    const sprite = new Image();
    sprites[id] = sprite;
    return new Promise(resolve => {
      sprite.onload = resolve;
      sprite.onerror = resolve;
      sprite.src = 'assets/' + id + '.webp';
    });
  }));

  function frame(canvas, logicalHeight) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const h = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(w / width, 0, 0, h / logicalHeight, 0, 0);
    ctx.clearRect(0, 0, width, logicalHeight);
    return ctx;
  }

  function spriteReady(sprite) {
    return sprite.complete && sprite.naturalWidth > 0;
  }

  function drawSprite(ctx, sprite, x, y, w, h) {
    if (spriteReady(sprite)) ctx.drawImage(sprite, x, y, w, h);
  }

  function placeSprite(ctx, id, x, y, maxWidth, maxHeight) {
    const sprite = sprites[id];
    if (!spriteReady(sprite)) return;
    const factor = Math.min(maxWidth / sprite.naturalWidth, maxHeight / sprite.naturalHeight);
    const w = sprite.naturalWidth * factor;
    const h = sprite.naturalHeight * factor;
    ctx.drawImage(sprite, x - w / 2, y - h, w, h);
  }

  function drawCargo(ctx, cargo, x, y, angle) {
    const item = itemById[cargo.id];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    placeSprite(ctx, item.id, 0, 0, 46 * item.size, (vehicle.stackRise + 3) * item.size);
    ctx.restore();
  }

  function supportHeight(cargo) {
    const sprite = sprites[cargo.id];
    if (!spriteReady(sprite)) return vehicle.stackRise;
    return Math.min(46 * sprite.naturalHeight / sprite.naturalWidth, vehicle.stackRise + 3) * itemById[cargo.id].size;
  }

  function drawTruck(ctx, cargo, x, y, angle, size, parked = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);
    ctx.rotate(angle);
    for (const box of cargo) {
      if (!box || box.lost) continue;
      const support = box.row ? cargo.find(other => other && !other.lost && other.row === 0 && other.col === box.col) : null;
      const rise = support ? supportHeight(support) : box.row * vehicle.stackRise;
      drawCargo(ctx, box, bedSlots[box.col] + (parked ? 0 : box.x),
        vehicle.deck + 1 - rise - (parked ? 0 : Math.max(box.lift, support?.lift ?? 0)), parked ? 0 : box.tilt);
    }
    drawSprite(ctx, sprites.truck, -vehicle.width * vehicle.pivot, -vehicle.height, vehicle.width, vehicle.height);
    ctx.restore();
  }

  function shadow(ctx, x, y, radius, height) {
    const light = ctx.createRadialGradient(x, y, 1, x, y, radius);
    light.addColorStop(0, '#151f1ab0');
    light.addColorStop(0.55, '#20251a78');
    light.addColorStop(1, '#20251a00');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, height / radius);
    ctx.translate(-x, -y);
    ctx.fillStyle = light;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  function roadside(ctx, toX, toY, position) {
    const left = position - cameraX / scale - 12;
    const right = position + (width - cameraX) / scale + 12;
    for (const hazard of course.hazards) {
      if (hazard.at > right || hazard.at + hazard.width < left) continue;
      for (const point of [hazard.at - 2.0, hazard.at + hazard.width + 2.1]) {
        placeSprite(ctx, 'cone', toX(point), toY(point) + 2, 28, 38);
      }
      if (hazard.kind === 'work' || hazard.kind === 'ridge') {
        const point = hazard.at + hazard.width * 0.6;
        placeSprite(ctx, 'rail', toX(point), toY(point) - 1, 110, 52);
      }
    }
    if (course.length < right) {
      const finish = course.length + 0.4;
      const x = toX(finish);
      const y = toY(finish);
      placeSprite(ctx, 'flag', x, y + 1, 62, 97);
      ctx.fillStyle = '#253e2d';
      ctx.beginPath();
      ctx.roundRect(x - 53, y - 132, 106, 27, 4);
      ctx.fill();
      ctx.fillStyle = '#fff5db';
      ctx.textAlign = 'center';
      ctx.font = '750 16px "Hiragino Sans", sans-serif';
      ctx.fillText('お届け先', x, y - 113);
    }
  }

  function line(ctx, toWorld, toY, offset, color, weight) {
    ctx.beginPath();
    for (let x = 0; x <= width; x += 4) {
      const y = toY(toWorld(x)) + offset;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = weight;
    ctx.stroke();
  }

  function paintPavement(ctx, toWorld, toY, position) {
    ctx.beginPath();
    for (let x = 0; x <= width; x += 4) {
      const y = toY(toWorld(x));
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let x = width; x >= 0; x -= 4) ctx.lineTo(x, toY(toWorld(x)) + 85);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#79766a';
    ctx.fillRect(0, 0, width, height);
    const tileWidth = 680;
    const tileHeight = 65;
    const dx = -((position * scale) % tileWidth);
    for (let x = dx; x < width; x += tileWidth) {
      for (let y = 345; y < height; y += tileHeight) {
        drawSprite(ctx, sprites.pavement, x, y, tileWidth + 1, tileHeight + 1);
      }
    }
    ctx.restore();

    line(ctx, toWorld, toY, 1, '#ede2b5', 3);
    line(ctx, toWorld, toY, 82, '#554b2f99', 5);
    const start = Math.floor(toWorld(0) / 15) * 15;
    const end = toWorld(width);
    for (let along = start; along <= end; along += 15) {
      if (course.hazards.some(hazard => along + 5 > hazard.at && along < hazard.at + hazard.width)) continue;
      ctx.beginPath();
      for (let offset = 0; offset <= 5; offset += 1) {
        const x = (along + offset - position) * scale + cameraX;
        const y = toY(along + offset) + 42;
        if (offset === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#f1e7c589';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    for (const hazard of course.hazards) {
      if (hazard.kind === 'gravel') continue;
      const endAt = hazard.at + hazard.width;
      for (let p = hazard.at + 0.8; p < endAt; p += 1.7) {
        const x = (p - position) * scale + cameraX;
        if (x < -12 || x > width + 12) continue;
        const y = toY(p);
        ctx.beginPath();
        ctx.moveTo(x - 2, y + 4);
        ctx.lineTo(x + 8, y + 4);
        ctx.lineTo(x + 2, y + 19);
        ctx.lineTo(x - 8, y + 19);
        ctx.closePath();
        ctx.fillStyle = '#e9bf69b9';
        ctx.fill();
      }
    }
  }

  function foreground(ctx, toWorld, toY, position) {
    const start = Math.floor(toWorld(0) / 2.5) * 2.5;
    for (let p = start; p < toWorld(width) + 1; p += 2.5) {
      const x = (p - position) * scale + cameraX;
      const y = toY(p) + 100;
      const variation = 0.5 + Math.sin(p * 18.67) * 0.5;
      ctx.strokeStyle = variation < .45 ? '#626236' : '#8b7e46';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x - 4, y - 12, x - 11, y - 17 - 19 * variation);
      ctx.moveTo(x + 6, y + 1);
      ctx.quadraticCurveTo(x + 8, y - 9, x + 15, y - 17 - 15 * variation);
      ctx.stroke();
    }
  }

  function draw(canvas, run) {
    const ctx = frame(canvas, height);
    const toX = world => cameraX + (world - run.position) * scale;
    const toWorld = px => run.position + (px - cameraX) / scale;
    const toY = world => projectedY(roadHeight(world));
    ctx.fillStyle = '#d8d9b2';
    ctx.fillRect(0, 0, width, height);
    drawSprite(ctx, sprites.route, -(run.position / course.length) * 430, -31, 1430, 627);
    roadside(ctx, toX, toY, run.position);
    paintPavement(ctx, toWorld, toY, run.position);
    foreground(ctx, toWorld, toY, run.position);

    for (const cargo of run.fallen) {
      ctx.save();
      const x = toX(cargo.position);
      shadow(ctx, x, toY(cargo.position) + 3, 29, 5);
      ctx.translate(x, projectedY(cargo.y));
      ctx.scale(zoom, zoom);
      drawCargo(ctx, cargo, 0, 0, cargo.angle);
      ctx.restore();
    }
    shadow(ctx, cameraX, toY(run.position) + 7, 139, 13);
    drawTruck(ctx, run.slots, cameraX, projectedY(run.body.y), run.body.angle, zoom);
  }

  function drawArrival(canvas, run) {
    const ctx = frame(canvas, 350);
    shadow(ctx, 460, 329, 238, 17);
    drawTruck(ctx, run.slots, 460, 323, 0, 1.95, true);
  }

  return { draw, drawArrival, ready };
})();
