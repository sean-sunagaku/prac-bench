import * as THREE from 'three';

function createRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d') };
}

/**
 * Helper to draw any shape across toroidal wrap offsets so textures tile 100% seamlessly.
 */
function drawTiled(size, x, y, margin, drawFn) {
  const oxList = [0];
  const oyList = [0];
  if (x < margin) oxList.push(size);
  if (x > size - margin) oxList.push(-size);
  if (y < margin) oyList.push(size);
  if (y > size - margin) oyList.push(-size);
  for (const ox of oxList) {
    for (const oy of oyList) {
      drawFn(x + ox, y + oy);
    }
  }
}

function finalizeTexture(canvas, { repeatX = 1, repeatY = 1, srgb = true } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (srgb) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/**
 * High-res (1024x1024) seamlessly tileable, rich warm cinnamon-taupe capybara fur albedo + bump map.
 */
export function createCapybaraFurTextures() {
  const size = 1024;
  const rng = createRng(104729);
  const { canvas: cColor, ctx: ctxC } = makeCanvas(size, size);
  const { canvas: cBump, ctx: ctxB } = makeCanvas(size, size);

  ctxC.fillStyle = '#926c4b';
  ctxC.fillRect(0, 0, size, size);

  ctxB.fillStyle = '#808080';
  ctxB.fillRect(0, 0, size, size);

  // Soft seamless undercoat color mottling
  for (let i = 0; i < 220; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 28 + rng() * 68;
    const shade = rng() > 0.48 ? 'rgba(186, 146, 102, 0.10)' : 'rgba(84, 56, 36, 0.09)';
    drawTiled(size, x, y, r, (tx, ty) => {
      const g = ctxC.createRadialGradient(tx, ty, 2, tx, ty, r);
      g.addColorStop(0, shade);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctxC.fillStyle = g;
      ctxC.beginPath();
      ctxC.arc(tx, ty, r, 0, Math.PI * 2);
      ctxC.fill();
    });
  }

  // Dense layered directional capybara bristles — batched by tone bucket for ultra-fast load (<80ms!)
  const hairBuckets = [
    { stroke: 'rgba(72, 48, 30, 0.42)', bump: 'rgba(54, 54, 54, 0.46)', lw: 1.3, segs: [] },
    { stroke: 'rgba(148, 108, 72, 0.40)', bump: 'rgba(144, 144, 144, 0.40)', lw: 1.15, segs: [] },
    { stroke: 'rgba(188, 148, 106, 0.38)', bump: 'rgba(196, 196, 196, 0.42)', lw: 1.4, segs: [] },
    { stroke: 'rgba(218, 182, 138, 0.30)', bump: 'rgba(232, 232, 232, 0.45)', lw: 1.7, segs: [] },
  ];

  const hairCount = 15000;
  for (let i = 0; i < hairCount; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const isGuard = rng() > 0.72;
    const len = isGuard ? 15 + rng() * 20 : 9 + rng() * 14;
    const angle = Math.PI * 0.5 + (rng() - 0.5) * 0.28;
    const dx = Math.cos(angle) * len;
    const dy = Math.sin(angle) * len;

    const tone = rng();
    const bIdx = tone < 0.22 ? 0 : tone < 0.65 ? 1 : tone < 0.88 ? 2 : 3;
    const segs = hairBuckets[bIdx].segs;
    drawTiled(size, x, y, len + 2, (tx, ty) => {
      segs.push(tx, ty, tx + dx, ty + dy);
    });
  }

  ctxC.lineCap = 'round';
  ctxB.lineCap = 'round';
  for (const b of hairBuckets) {
    ctxC.strokeStyle = b.stroke;
    ctxC.lineWidth = b.lw;
    ctxC.beginPath();
    for (let j = 0; j < b.segs.length; j += 4) {
      ctxC.moveTo(b.segs[j], b.segs[j + 1]);
      ctxC.lineTo(b.segs[j + 2], b.segs[j + 3]);
    }
    ctxC.stroke();

    ctxB.strokeStyle = b.bump;
    ctxB.lineWidth = b.lw;
    ctxB.beginPath();
    for (let j = 0; j < b.segs.length; j += 4) {
      ctxB.moveTo(b.segs[j], b.segs[j + 1]);
      ctxB.lineTo(b.segs[j + 2], b.segs[j + 3]);
    }
    ctxB.stroke();
  }

  return {
    map: finalizeTexture(cColor, { repeatX: 2.5, repeatY: 2.5, srgb: true }),
    bumpMap: finalizeTexture(cBump, { repeatX: 2.5, repeatY: 2.5, srgb: false }),
  };
}

/**
 * Yuzu citrus dimpled peel albedo + bump map (vibrant winter yuzu golden-yellow).
 */
export function createYuzuTextures() {
  const size = 512;
  const rng = createRng(88421);
  const { canvas: cColor, ctx: ctxC } = makeCanvas(size, size);
  const { canvas: cBump, ctx: ctxB } = makeCanvas(size, size);

  const grad = ctxC.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0.0, '#d8c426');
  grad.addColorStop(0.16, '#fbd32c');
  grad.addColorStop(0.68, '#f7c11c');
  grad.addColorStop(1.0, '#eaab14');
  ctxC.fillStyle = grad;
  ctxC.fillRect(0, 0, size, size);

  ctxB.fillStyle = '#929292';
  ctxB.fillRect(0, 0, size, size);

  for (let i = 0; i < 95; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 18 + rng() * 52;
    const col = rng() > 0.5 ? 'rgba(255, 242, 138, 0.17)' : 'rgba(220, 146, 12, 0.12)';
    drawTiled(size, x, y, r, (tx, ty) => {
      const g = ctxC.createRadialGradient(tx, ty, 2, tx, ty, r);
      g.addColorStop(0, col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctxC.fillStyle = g;
      ctxC.beginPath();
      ctxC.arc(tx, ty, r, 0, Math.PI * 2);
      ctxC.fill();
    });
  }

  // Authentic tactile yuzu oil-gland dimples
  for (let i = 0; i < 2100; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 1.6 + rng() * 3.1;

    ctxC.fillStyle = 'rgba(202, 134, 10, 0.26)';
    ctxC.beginPath();
    ctxC.arc(x, y, r, 0, Math.PI * 2);
    ctxC.fill();

    ctxC.fillStyle = 'rgba(255, 246, 166, 0.28)';
    ctxC.beginPath();
    ctxC.arc(x - r * 0.35, y - r * 0.35, r * 0.58, 0, Math.PI * 2);
    ctxC.fill();

    const bg = ctxB.createRadialGradient(x, y, 0.3, x, y, r * 1.45);
    bg.addColorStop(0, 'rgba(32, 32, 32, 0.85)');
    bg.addColorStop(0.65, 'rgba(224, 224, 224, 0.72)');
    bg.addColorStop(1, 'rgba(146, 146, 146, 0)');
    ctxB.fillStyle = bg;
    ctxB.beginPath();
    ctxB.arc(x, y, r * 1.45, 0, Math.PI * 2);
    ctxB.fill();
  }

  return {
    map: finalizeTexture(cColor, { repeatX: 1, repeatY: 1, srgb: true }),
    bumpMap: finalizeTexture(cBump, { repeatX: 1, repeatY: 1, srgb: false }),
  };
}

/**
 * Seamlessly tileable Japanese volcanic andesite rock texture with mineral grain, fissures & subtle moss.
 */
export function createRockTextures() {
  const size = 512;
  const rng = createRng(55103);
  const { canvas: cColor, ctx: ctxC } = makeCanvas(size, size);
  const { canvas: cBump, ctx: ctxB } = makeCanvas(size, size);

  ctxC.fillStyle = '#6c7076';
  ctxC.fillRect(0, 0, size, size);
  ctxB.fillStyle = '#808080';
  ctxB.fillRect(0, 0, size, size);

  // Broad mineral strata & weathered patches
  for (let i = 0; i < 420; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const rx = 10 + rng() * 44;
    const ry = 8 + rng() * 32;
    const rot = rng() * Math.PI;
    const v = Math.floor(78 + rng() * 76);
    const warm = Math.floor((rng() - 0.45) * 16);
    const col = `rgba(${v + warm}, ${v + Math.floor(warm * 0.55)}, ${v + 4}, 0.22)`;
    const bv = Math.floor(38 + rng() * 180);
    const bCol = `rgba(${bv}, ${bv}, ${bv}, 0.24)`;

    drawTiled(size, x, y, Math.max(rx, ry) + 4, (tx, ty) => {
      ctxC.fillStyle = col;
      ctxC.save();
      ctxC.translate(tx, ty);
      ctxC.rotate(rot);
      ctxC.beginPath();
      ctxC.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctxC.fill();
      ctxC.restore();

      ctxB.fillStyle = bCol;
      ctxB.beginPath();
      ctxB.arc(tx, ty, rx * 0.65, 0, Math.PI * 2);
      ctxB.fill();
    });
  }

  // Natural volcanic stone fractures & micro-cracks
  for (let i = 0; i < 36; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const len = 28 + rng() * 64;
    const ang = rng() * Math.PI * 2;
    const mx = x + Math.cos(ang) * len * 0.5 + (rng() - 0.5) * 16;
    const my = y + Math.sin(ang) * len * 0.5 + (rng() - 0.5) * 16;
    const ex = x + Math.cos(ang) * len;
    const ey = y + Math.sin(ang) * len;

    drawTiled(size, x, y, len + 12, (tx, ty) => {
      const dx = tx - x;
      const dy = ty - y;
      ctxC.strokeStyle = 'rgba(34, 38, 42, 0.26)';
      ctxC.lineWidth = 1.2 + rng() * 1.4;
      ctxC.beginPath();
      ctxC.moveTo(tx, ty);
      ctxC.quadraticCurveTo(mx + dx, my + dy, ex + dx, ey + dy);
      ctxC.stroke();

      ctxB.strokeStyle = 'rgba(26, 26, 26, 0.45)';
      ctxB.lineWidth = 1.6 + rng() * 1.5;
      ctxB.beginPath();
      ctxB.moveTo(tx, ty);
      ctxB.quadraticCurveTo(mx + dx, my + dy, ex + dx, ey + dy);
      ctxB.stroke();
    });
  }

  // Subtle lichen & mossy flecks
  for (let i = 0; i < 110; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 5 + rng() * 16;
    const col = rng() > 0.35 ? 'rgba(78, 102, 66, 0.18)' : 'rgba(156, 152, 144, 0.16)';
    drawTiled(size, x, y, r, (tx, ty) => {
      ctxC.fillStyle = col;
      ctxC.beginPath();
      ctxC.arc(tx, ty, r, 0, Math.PI * 2);
      ctxC.fill();
    });
  }

  // Fine mineral grain
  for (let i = 0; i < 4200; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const v = rng() > 0.5 ? 225 : 36;
    ctxC.fillStyle = `rgba(${v}, ${v}, ${v}, 0.08)`;
    ctxC.fillRect(x, y, 2, 2);
    ctxB.fillStyle = `rgba(${v}, ${v}, ${v}, 0.15)`;
    ctxB.fillRect(x, y, 2, 2);
  }

  return {
    map: finalizeTexture(cColor, { repeatX: 2, repeatY: 2, srgb: true }),
    bumpMap: finalizeTexture(cBump, { repeatX: 2, repeatY: 2, srgb: false }),
  };
}

export function createHinokiWoodTextures() {
  const size = 512;
  const rng = createRng(77211);
  const { canvas: cColor, ctx: ctxC } = makeCanvas(size, size);
  const { canvas: cBump, ctx: ctxB } = makeCanvas(size, size);

  ctxC.fillStyle = '#cca474';
  ctxC.fillRect(0, 0, size, size);
  ctxB.fillStyle = '#808080';
  ctxB.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 2) {
    const wave = Math.sin((y / size) * Math.PI * 6) * 8 + Math.sin((y / size) * Math.PI * 2) * 12;
    const tone = Math.floor(188 + Math.sin((y + wave) * 0.24) * 18 + (rng() - 0.5) * 10);
    ctxC.fillStyle = `rgb(${tone + 14}, ${Math.floor(tone * 0.79)}, ${Math.floor(tone * 0.53)})`;
    ctxC.fillRect(0, y, size, 2);

    const bt = Math.floor(128 + Math.sin((y + wave) * 0.24) * 30);
    ctxB.fillStyle = `rgb(${bt}, ${bt}, ${bt})`;
    ctxB.fillRect(0, y, size, 2);
  }

  for (let i = 0; i < 420; i++) {
    const y = rng() * size;
    ctxC.strokeStyle = rng() > 0.5 ? 'rgba(110, 74, 42, 0.22)' : 'rgba(236, 206, 158, 0.18)';
    ctxC.lineWidth = 0.7 + rng() * 1.2;
    ctxC.beginPath();
    ctxC.moveTo(0, y);
    ctxC.bezierCurveTo(
      size * 0.33,
      y + (rng() - 0.5) * 7,
      size * 0.66,
      y + (rng() - 0.5) * 7,
      size,
      y
    );
    ctxC.stroke();
  }

  return {
    map: finalizeTexture(cColor, { repeatX: 1, repeatY: 1, srgb: true }),
    bumpMap: finalizeTexture(cBump, { repeatX: 1, repeatY: 1, srgb: false }),
  };
}

export function createBambooTexture(variant = 'dry') {
  const w = 128;
  const h = 512;
  const rng = createRng(variant === 'dry' ? 3091 : 9031);
  const { canvas, ctx } = makeCanvas(w, h);

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  if (variant === 'green') {
    grad.addColorStop(0, '#446a38');
    grad.addColorStop(0.5, '#618c4d');
    grad.addColorStop(1, '#446a38');
  } else {
    grad.addColorStop(0, '#a28755');
    grad.addColorStop(0.5, '#c6ae76');
    grad.addColorStop(1, '#a28755');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 240; i++) {
    const x = rng() * w;
    ctx.strokeStyle =
      variant === 'green'
        ? rng() > 0.5
          ? 'rgba(38, 62, 30, 0.24)'
          : 'rgba(140, 174, 102, 0.2)'
        : rng() > 0.5
          ? 'rgba(104, 82, 46, 0.22)'
          : 'rgba(224, 204, 152, 0.2)';
    ctx.lineWidth = 0.8 + rng() * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  const nodes = [h * 0.22, h * 0.52, h * 0.82];
  for (const ny of nodes) {
    ctx.fillStyle = variant === 'green' ? 'rgba(34, 52, 26, 0.65)' : 'rgba(84, 64, 34, 0.65)';
    ctx.fillRect(0, ny - 4, w, 5);
    ctx.fillStyle = variant === 'green' ? 'rgba(168, 192, 128, 0.55)' : 'rgba(232, 214, 168, 0.55)';
    ctx.fillRect(0, ny + 1, w, 3);
  }

  return finalizeTexture(canvas, { repeatX: 1, repeatY: 1, srgb: true });
}

/**
 * 100% Seamlessly tileable powdery winter snow texture (toroidally wrapped, soft powder + crystalline micro-sparkle).
 */
export function createSnowTextures() {
  const size = 512;
  const rng = createRng(202611);
  const { canvas: cColor, ctx: ctxC } = makeCanvas(size, size);
  const { canvas: cBump, ctx: ctxB } = makeCanvas(size, size);

  ctxC.fillStyle = '#f5f8fd';
  ctxC.fillRect(0, 0, size, size);
  ctxB.fillStyle = '#808080';
  ctxB.fillRect(0, 0, size, size);

  // Soft wind-blown powdery snow billows
  for (let i = 0; i < 160; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 24 + rng() * 64;
    const isLight = rng() > 0.5;
    const cShade = isLight ? 'rgba(255, 255, 255, 0.16)' : 'rgba(216, 229, 246, 0.13)';
    const bv = isLight ? 170 : 92;
    const bShade = `rgba(${bv}, ${bv}, ${bv}, 0.16)`;

    drawTiled(size, x, y, r, (tx, ty) => {
      const g = ctxC.createRadialGradient(tx, ty, 2, tx, ty, r);
      g.addColorStop(0, cShade);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctxC.fillStyle = g;
      ctxC.beginPath();
      ctxC.arc(tx, ty, r, 0, Math.PI * 2);
      ctxC.fill();

      const bg = ctxB.createRadialGradient(tx, ty, 2, tx, ty, r);
      bg.addColorStop(0, bShade);
      bg.addColorStop(1, 'rgba(128, 128, 128, 0)');
      ctxB.fillStyle = bg;
      ctxB.beginPath();
      ctxB.arc(tx, ty, r, 0, Math.PI * 2);
      ctxB.fill();
    });
  }

  // Fine powder crystal grain
  for (let i = 0; i < 5400; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const v = rng() > 0.86 ? 255 : rng() > 0.5 ? 160 : 98;
    ctxB.fillStyle = `rgba(${v}, ${v}, ${v}, 0.24)`;
    ctxB.fillRect(x, y, 1.5, 1.5);
  }

  return {
    map: finalizeTexture(cColor, { repeatX: 2.5, repeatY: 2.5, srgb: true }),
    bumpMap: finalizeTexture(cBump, { repeatX: 4, repeatY: 4, srgb: false }),
  };
}

/**
 * Rich textured dark-evergreen Japanese Black Pine needles albedo + bump map.
 */
export function createPineNeedleTextures() {
  const size = 512;
  const rng = createRng(99231);
  const { canvas: cColor, ctx: ctxC } = makeCanvas(size, size);
  const { canvas: cBump, ctx: ctxB } = makeCanvas(size, size);

  ctxC.fillStyle = '#1f3e26';
  ctxC.fillRect(0, 0, size, size);
  ctxB.fillStyle = '#686868';
  ctxB.fillRect(0, 0, size, size);

  const needleBuckets = [
    { col: 'rgba(20, 44, 24, 0.72)', bCol: 'rgba(40,40,40,0.55)', lw: 1.8, segs: [] },
    { col: 'rgba(42, 78, 44, 0.65)', bCol: 'rgba(180,180,180,0.48)', lw: 1.7, segs: [] },
    { col: 'rgba(62, 102, 56, 0.55)', bCol: 'rgba(215,215,215,0.5)', lw: 1.6, segs: [] },
    { col: 'rgba(182, 206, 194, 0.28)', bCol: 'rgba(235,235,235,0.5)', lw: 1.5, segs: [] },
  ];

  for (let i = 0; i < 5200; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const len = 10 + rng() * 18;
    const ang = rng() * Math.PI * 2;
    const dx = Math.cos(ang) * len;
    const dy = Math.sin(ang) * len;

    const r = rng();
    const bIdx = r < 0.3 ? 0 : r < 0.75 ? 1 : r < 0.93 ? 2 : 3;
    const segs = needleBuckets[bIdx].segs;
    drawTiled(size, x, y, len + 2, (tx, ty) => {
      segs.push(tx, ty, tx + dx, ty + dy);
    });
  }

  for (const b of needleBuckets) {
    ctxC.strokeStyle = b.col;
    ctxC.lineWidth = b.lw;
    ctxC.beginPath();
    for (let j = 0; j < b.segs.length; j += 4) {
      ctxC.moveTo(b.segs[j], b.segs[j + 1]);
      ctxC.lineTo(b.segs[j + 2], b.segs[j + 3]);
    }
    ctxC.stroke();

    ctxB.strokeStyle = b.bCol;
    ctxB.lineWidth = 1.4;
    ctxB.beginPath();
    for (let j = 0; j < b.segs.length; j += 4) {
      ctxB.moveTo(b.segs[j], b.segs[j + 1]);
      ctxB.lineTo(b.segs[j + 2], b.segs[j + 3]);
    }
    ctxB.stroke();
  }

  return {
    map: finalizeTexture(cColor, { repeatX: 2, repeatY: 2, srgb: true }),
    bumpMap: finalizeTexture(cBump, { repeatX: 2, repeatY: 2, srgb: false }),
  };
}

export function createTenuguiTexture() {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);

  ctx.fillStyle = '#f6f2e8';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(205, 198, 184, 0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < size; i += 4) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
  }

  ctx.fillStyle = '#2d4b73';
  ctx.fillRect(0, 14, size, 12);
  ctx.fillRect(0, size - 26, size, 12);

  for (let y = 46; y < size - 40; y += 28) {
    for (let x = 16; x < size; x += 28) {
      const ox = (Math.floor(y / 28) % 2) * 14;
      ctx.beginPath();
      ctx.arc((x + ox) % size, y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return finalizeTexture(canvas, { repeatX: 1, repeatY: 1, srgb: true });
}

export function createSteamTexture() {
  const size = 256;
  const rng = createRng(61803);
  const { canvas, ctx } = makeCanvas(size, size);

  ctx.clearRect(0, 0, size, size);

  for (let i = 0; i < 22; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = rng() * 44;
    const cx = size * 0.5 + Math.cos(angle) * dist;
    const cy = size * 0.5 + Math.sin(angle) * dist;
    const r = 40 + rng() * 46;
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    g.addColorStop(0.5, 'rgba(246, 250, 255, 0.11)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'destination-in';
  const mask = ctx.createRadialGradient(size / 2, size / 2, size * 0.06, size / 2, size / 2, size * 0.48);
  mask.addColorStop(0, 'rgba(255, 255, 255, 1)');
  mask.addColorStop(0.62, 'rgba(255, 255, 255, 0.65)');
  mask.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Airy organic froth & bubble foam ring texture for the pouring hot water splash point.
 */
export function createSplashFoamTexture() {
  const size = 256;
  const rng = createRng(7331);
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;

  // Soft misty core
  const core = ctx.createRadialGradient(cx, cy, 4, cx, cy, size * 0.42);
  core.addColorStop(0.0, 'rgba(248, 254, 255, 0.85)');
  core.addColorStop(0.35, 'rgba(232, 249, 252, 0.48)');
  core.addColorStop(0.7, 'rgba(220, 246, 250, 0.12)');
  core.addColorStop(1.0, 'rgba(220, 246, 250, 0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  // Delicate frothy micro-bubbles clustered around the splash
  for (let i = 0; i < 64; i++) {
    const a = rng() * Math.PI * 2;
    const d = Math.pow(rng(), 0.72) * size * 0.36;
    const r = 3 + rng() * 11;
    const bx = cx + Math.cos(a) * d;
    const by = cy + Math.sin(a) * d;
    const bg = ctx.createRadialGradient(bx, by, 1, bx, by, r);
    bg.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
    bg.addColorStop(0.65, 'rgba(236, 252, 255, 0.25)');
    bg.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createSnowflakeTexture() {
  const size = 64;
  const { canvas, ctx } = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 1.5, size / 2, size / 2, size * 0.48);
  g.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  g.addColorStop(0.42, 'rgba(246, 251, 255, 0.88)');
  g.addColorStop(0.74, 'rgba(225, 238, 255, 0.26)');
  g.addColorStop(1, 'rgba(220, 235, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createPineBarkTexture() {
  const size = 256;
  const rng = createRng(41123);
  const { canvas, ctx } = makeCanvas(size, size);

  ctx.fillStyle = '#4f3f34';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 380; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const w = 3 + rng() * 9;
    const h = 14 + rng() * 38;
    const col = rng() > 0.45 ? 'rgba(38, 28, 22, 0.56)' : 'rgba(112, 92, 76, 0.44)';
    drawTiled(size, x, y, Math.max(w, h), (tx, ty) => {
      ctx.fillStyle = col;
      ctx.fillRect(tx, ty, w, h);
    });
  }

  return finalizeTexture(canvas, { repeatX: 2, repeatY: 4, srgb: true });
}
