"use strict";

class KeitoraScene {
  static W = 960;
  static H = 510;
  static loadingTruck = { x: 231, ground: 474, width: 600 };
  static drivingTruck = { x: 125, ground: 445, width: 456 };

  constructor(canvas, bed) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    const scale = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = KeitoraScene.W * scale;
    canvas.height = KeitoraScene.H * scale;
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    this.images = {};
    this.ready = false;
    const g = this.geometry(KeitoraScene.loadingTruck);
    Object.assign(bed.style, {
      left: (g.left / KeitoraScene.W) * 100 + "%",
      top: ((g.deck - g.cellH * Keitora.ROWS) / KeitoraScene.H) * 100 + "%",
      width: ((g.cellW * Keitora.COLS) / KeitoraScene.W) * 100 + "%",
      height: ((g.cellH * Keitora.ROWS) / KeitoraScene.H) * 100 + "%",
    });
  }
  async preload() {
    const names = [
      "yard",
      "road",
      "truck",
      "hump-sign",
      "finish-flag",
      ...Keitora.cargo.map((c) => c.id),
    ];
    await Promise.all(
      names.map(
        (name) =>
          new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
              this.images[name] = image;
              resolve();
            };
            image.onerror = () => reject(new Error("画像を読み込めませんでした。 " + name));
            image.src = "assets/" + name + (name === "yard" || name === "road" ? ".webp" : ".png");
          }),
      ),
    );
    this.ready = true;
  }
  geometry(truck) {
    const scale = truck.width / 640,
      cellW = (427 * scale) / Keitora.COLS;
    return {
      left: truck.x + 7 * scale,
      deck: truck.ground - (253 - 134) * scale,
      cellW,
      cellH: cellW * 0.79,
      scale,
    };
  }
  truck(truck, rotation = 0) {
    const ctx = this.ctx,
      img = this.images.truck;
    const scale = truck.width / 640,
      top = truck.ground - 253 * scale;
    ctx.drawImage(img, truck.x, top, truck.width, 253 * scale);
    if (!rotation) return;
    for (const cx of [164, 512]) {
      const r = 22,
        x = truck.x + cx * scale,
        y = top + 213 * scale;
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.arc(0, 0, r * scale, 0, 2 * Math.PI);
      ctx.clip();
      ctx.rotate(rotation);
      ctx.drawImage(
        img,
        cx - r,
        213 - r,
        r * 2,
        r * 2,
        -r * scale,
        -r * scale,
        r * scale * 2,
        r * scale * 2,
      );
      ctx.restore();
    }
  }
  shadow(truck, lift = 0) {
    const ctx = this.ctx,
      w = truck.width,
      x = truck.x;
    const y = truck.ground + 2;
    ctx.save();
    ctx.globalAlpha = Math.max(0.12, 0.27 - lift * 0.16);
    ctx.fillStyle = "#292e46";
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x + 0.08 * w, y - 7);
    ctx.lineTo(x + 0.86 * w, y - 8);
    ctx.lineTo(x + w + 6, y - 2);
    ctx.lineTo(x + w - 14, y + 4);
    ctx.lineTo(x + 9, y + 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  drawCargo(id, x, z, geometry, options = {}) {
    const ctx = this.ctx,
      item = Keitora.byId[id];
    const w = geometry.cellW * item.w,
      h = geometry.cellH * item.h;
    const left = geometry.left + geometry.cellW * x;
    const base = geometry.deck - geometry.cellH * z;
    ctx.save();
    ctx.translate(left + w / 2, base - h / 2);
    ctx.rotate(options.tilt || 0);
    ctx.globalAlpha = options.alpha ?? 1;
    ctx.drawImage(this.images[id], -w / 2 + 1, -h / 2, w - 2, h);
    if (options.broken) {
      ctx.strokeStyle = "#59382e";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-w * 0.1, -h * 0.36);
      ctx.lineTo(w * 0.03, -h * 0.15);
      ctx.lineTo(-w * 0.07, -h * 0.05);
      ctx.lineTo(w * 0.09, h * 0.21);
      ctx.stroke();
      ctx.fillStyle = "#aa4b2d";
      ctx.fillRect(w / 2 - 15, -h / 2 + 2, 13, 13);
      ctx.fillStyle = "#fff4d5";
      ctx.fillRect(w / 2 - 10, -h / 2 + 4, 3, 6);
      ctx.fillRect(w / 2 - 10, -h / 2 + 11, 3, 2);
    }
    if (options.selected || options.preview || options.flash > 0) {
      ctx.lineWidth = options.preview ? 3 : 2;
      ctx.strokeStyle = options.flash > 0 ? "#ffad74" : "#ffba52";
      if (options.selected) ctx.setLineDash([5, 4]);
      ctx.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
    }
    ctx.restore();
  }
  drawLoading(load, selected, hover, placed, time) {
    if (!this.ready) return;
    const ctx = this.ctx,
      truck = KeitoraScene.loadingTruck;
    const g = this.geometry(truck),
      top = g.deck - g.cellH * Keitora.ROWS,
      width = g.cellW * Keitora.COLS;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.images.yard, 0, 0, KeitoraScene.W, KeitoraScene.H);
    this.shadow(truck);
    ctx.fillStyle = "rgba(20, 100, 105, .74)";
    ctx.fillRect(g.left, top, width, g.deck - top);
    ctx.save();
    ctx.strokeStyle = "rgba(255,252,225,.94)";
    ctx.lineWidth = 2.35;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    for (let i = 1; i < Keitora.COLS; i++) {
      const x = g.left + g.cellW * i;
      ctx.moveTo(x, top);
      ctx.lineTo(x, g.deck);
    }
    for (let i = 1; i < Keitora.ROWS; i++) {
      const y = g.deck - g.cellH * i;
      ctx.moveTo(g.left, y);
      ctx.lineTo(g.left + width, y);
    }
    ctx.stroke();
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = "#fff8dc";
    ctx.setLineDash([9, 5]);
    ctx.strokeRect(g.left + 1, top + 1, width - 2, g.deck - top - 1);
    ctx.restore();
    const preview = hover === null ? null : Keitora.placement(load, selected, hover);
    if (preview?.error) {
      const item = Keitora.byId[selected];
      if (item) {
        const col = Keitora.clamp(hover, 0, Keitora.COLS - item.w);
        ctx.fillStyle = "rgba(227,88,58,.33)";
        ctx.fillRect(g.left + col * g.cellW, top, item.w * g.cellW, g.cellH * Keitora.ROWS);
      }
    }
    for (const p of load) {
      let bounce = 0;
      if (placed && placed.id === p.id) {
        const t = (time - placed.at) / 260;
        if (t >= 0 && t < 1) bounce = 0.24 * (1 - t) * Math.abs(Math.cos(t * Math.PI * 1.7));
      }
      this.drawCargo(p.id, p.col, p.row + bounce, g, { selected: p.id === selected });
    }
    if (preview && !preview.error) {
      const current = load.find((p) => p.id === selected);
      if (!current || current.col !== preview.col || current.row !== preview.row)
        this.drawCargo(selected, preview.col, preview.row, g, { alpha: 0.62, preview: true });
    }
    this.truck(truck);
  }
  sceneryBand(img, shift, sy, sh, dy, dh) {
    const ctx = this.ctx,
      w = KeitoraScene.W;
    const first = Math.floor(shift / w),
      offset = shift - first * w;
    for (let j = 0; j < 2; j++) {
      const x = j * w - offset,
        flipped = (first + j) % 2 !== 0;
      ctx.save();
      ctx.translate(flipped ? x + w : x, 0);
      ctx.scale(flipped ? -1 : 1, 1);
      ctx.drawImage(img, 0, sy, img.width, sh, -0.4, dy, w + 0.8, dh);
      ctx.restore();
    }
  }
  drawRun(run) {
    if (!this.ready) return;
    const ctx = this.ctx,
      w = KeitoraScene.W,
      h = KeitoraScene.H;
    const truck = KeitoraScene.drivingTruck,
      g = this.geometry(truck),
      road = this.images.road;
    const pixelsPerM = (348 * g.scale) / Keitora.AXLE_METRES;
    const vertical = pixelsPerM * 1.9,
      anchor = truck.x + 338 * g.scale;
    const worldX = (m) => anchor + (m - run.distance) * pixelsPerM;
    const worldY = (x) =>
      truck.ground - Keitora.terrain(run.distance + (x - anchor) / pixelsPerM) * vertical;
    ctx.imageSmoothingEnabled = false;
    this.sceneryBand(road, run.distance * 5.2, 0, road.height, 0, h);
    for (const s of Keitora.segments) {
      const x = worldX(s.start - 3.5);
      if (x < -85 || x > w + 60) continue;
      ctx.drawImage(this.images["hump-sign"], x - 21, truck.ground - 143, 47, 104);
    }
    const goalX = worldX(Keitora.GOAL);
    if (goalX < w + 75) ctx.drawImage(this.images["finish-flag"], goalX, truck.ground - 178, 105, 151);
    // The textured, raised road follows the same sampled height as both axles.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-4, worldY(0));
    for (let x = 0; x <= w + 4; x += 3) ctx.lineTo(x, worldY(x));
    ctx.lineTo(w + 4, h);
    ctx.lineTo(-4, h);
    ctx.closePath();
    ctx.clip();
    const sy = Math.floor(road.height * 0.825);
    this.sceneryBand(
      road,
      run.distance * pixelsPerM,
      sy,
      road.height - sy,
      truck.ground - 46,
      h - truck.ground + 47,
    );
    ctx.restore();
    const surfaceLine = (color, width, offset) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.moveTo(0, worldY(0) + offset);
      for (let x = 3; x <= w; x += 3) ctx.lineTo(x, worldY(x) + offset);
      ctx.stroke();
    };
    surfaceLine("#aa9779", 4, 2);
    surfaceLine("#f4dfae", 2, 0);
    // The metal edge makes the abrupt repair slabs visible against the pavement.
    for (const s of Keitora.segments) {
      if (!s.rise) continue;
      const start = worldX(s.start),
        end = worldX(s.start + s.width);
      if (end < 0 || start > w) continue;
      for (let x = Math.max(start, 0); x < Math.min(end, w); x += 4) {
        const y = worldY(x);
        ctx.fillStyle = "#716f60";
        ctx.fillRect(x, y, 4.1, 5);
        ctx.fillStyle = Math.floor((x - start) / 12) % 2 ? "#ccac69" : "#f4da95";
        ctx.fillRect(x, y, 4.1, 1.6);
      }
    }
    this.shadow(truck, run.lift);
    if (run.speed > 1.8) {
      ctx.save();
      const n = run.distance * 2;
      for (let i = 0; i < 4; i++) {
        const t = (n * 0.18 + i / 4) % 1;
        ctx.fillStyle = i % 2 ? "#e9d1a0" : "#d9c49d";
        ctx.globalAlpha = (1 - t) * 0.58;
        const size = Math.round(3 + 7 * t);
        ctx.fillRect(truck.x + 83 - 104 * t, truck.ground - 4 - 15 * t, size, size * 0.65);
      }
      ctx.restore();
    }
    ctx.save();
    ctx.translate(anchor, truck.ground - run.lift * vertical);
    ctx.rotate(-run.pitch);
    ctx.translate(-anchor, -truck.ground);
    for (const b of run.bodies) {
      if (b.lost && b.lostTime > 1.5) continue;
      this.drawCargo(b.id, b.x, b.z, g, {
        tilt: b.tilt,
        broken: b.broken,
        flash: b.impactFlash,
        alpha: b.lost ? Math.max(0, 1.5 - b.lostTime) : 1,
      });
    }
    this.truck(truck, run.distance * 2.7);
    ctx.restore();
  }
}
