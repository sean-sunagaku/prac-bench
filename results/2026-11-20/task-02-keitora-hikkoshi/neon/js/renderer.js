(function (global) {
  'use strict';

  const THEMES = {
    morning: {
      skyTop: '#5ca9e6',
      skyBot: '#dff3ff',
      sunColor: '#fff6c4',
      sunY: 0.19,
      mtnFar: '#8fb4cf',
      mtnNear: '#6d9986',
      cloudColor: 'rgba(255,255,255,0.88)',
      soilTop: '#6c8c4a',
      soilBody: '#8a684a',
      asphalt: '#4a5058',
      asphaltEdge: '#31363c',
      headlights: false,
    },
    afternoon: {
      skyTop: '#d97a4a',
      skyBot: '#fce2b3',
      sunColor: '#ffe08a',
      sunY: 0.28,
      mtnFar: '#997a8c',
      mtnNear: '#7a6368',
      cloudColor: 'rgba(255,235,205,0.82)',
      soilTop: '#7d8546',
      soilBody: '#7c593e',
      asphalt: '#474952',
      asphaltEdge: '#2d2f36',
      headlights: false,
    },
    sunset: {
      skyTop: '#3e3561',
      skyMid: '#b5504d',
      skyBot: '#f5a962',
      sunColor: '#ffd075',
      sunY: 0.36,
      mtnFar: '#4c3e61',
      mtnNear: '#3b3347',
      cloudColor: 'rgba(255,190,145,0.55)',
      soilTop: '#525e3b',
      soilBody: '#523b2c',
      asphalt: '#393b44',
      asphaltEdge: '#23242b',
      headlights: true,
    },
  };

  class WorldRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.cam = {
        x: 0,
        y: 1.4,
        scale: 105,
        anchorX: 0.45,
        anchorY: 0.72,
        shakeX: 0,
        shakeY: 0,
      };
      this.width = 1200;
      this.height = 700;
      this.dpr = 1;
    }

    resize() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = Math.max(320, Math.floor(rect.width));
      this.height = Math.max(320, Math.floor(rect.height));
      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    worldToScreen(wx, wy) {
      return {
        x: (wx - this.cam.x) * this.cam.scale + this.width * this.cam.anchorX + this.cam.shakeX,
        y: this.height * this.cam.anchorY - (wy - this.cam.y) * this.cam.scale + this.cam.shakeY,
      };
    }

    screenToWorld(sx, sy) {
      return {
        x: (sx - this.cam.shakeX - this.width * this.cam.anchorX) / this.cam.scale + this.cam.x,
        y: (this.height * this.cam.anchorY - (sy - this.cam.shakeY)) / this.cam.scale + this.cam.y,
      };
    }

    updateCamera(world, phase, dt, shakeMag) {
      const truck = world.truck;
      const stats = world.getCargoStats();
      const tallBonus = Math.max(0, stats.maxHeightM - 1.5);

      let targetX, targetY, targetScale, targetAnchorX, targetAnchorY;

      if (phase === 'loading') {
        const minDim = Math.min(this.width, this.height);
        targetScale = Math.max(62, Math.min(104, (minDim / 6.0) - tallBonus * 9));
        targetX = truck.x - 0.14;
        targetY = truck.y + 1.02 + tallBonus * 0.28;
        targetAnchorX = 0.50;
        targetAnchorY = 0.54;
      } else {
        const speedLook = Math.max(0, truck.vx) * 0.28;
        const baseScale = Math.max(46, Math.min(72, this.width / 16.5));
        targetScale = Math.max(40, baseScale - tallBonus * 5 - Math.max(0, truck.vx) * 0.45);
        targetX = truck.x + 2.8 + speedLook;
        targetY = truck.y + 1.05 + tallBonus * 0.22;
        targetAnchorX = 0.34;
        targetAnchorY = 0.72;
      }

      const lerp = Math.min(1, dt * (phase === 'loading' ? 7 : 5.5));
      this.cam.x += (targetX - this.cam.x) * lerp;
      this.cam.y += (targetY - this.cam.y) * lerp;
      this.cam.scale += (targetScale - this.cam.scale) * lerp;
      this.cam.anchorX += (targetAnchorX - this.cam.anchorX) * lerp;
      this.cam.anchorY += (targetAnchorY - this.cam.anchorY) * lerp;

      if (shakeMag > 0.1) {
        this.cam.shakeX = (Math.random() * 2 - 1) * shakeMag;
        this.cam.shakeY = (Math.random() * 2 - 1) * shakeMag;
      } else {
        this.cam.shakeX = 0;
        this.cam.shakeY = 0;
      }
    }

    render(state) {
      const ctx = this.ctx;
      const {
        world,
        stage,
        phase,
        time,
        particles,
        popups,
        dragPreview,
        ropePreview,
        ropeHover,
        ropeMode,
        driverMood,
      } = state;
      const theme = THEMES[stage.theme] || THEMES.morning;

      ctx.save();
      this._drawSkyAndParallax(ctx, theme, time);
      this._drawBackgroundHousesAndPoles(ctx, world.terrain, stage, theme);
      this._drawRoadFeaturesBack(ctx, world.terrain, stage, time);
      this._drawDepartureAndGoalBuildings(ctx, world.terrain, stage, time);
      this._drawTerrain(ctx, world.terrain, theme);
      this._drawRoadFeaturesFront(ctx, world.terrain, stage, time);

      if (phase === 'loading') {
        this._drawLoadingGuides(ctx, world);
      }

      this._drawTruck(ctx, world.truck, theme, time, driverMood);

      for (const b of world.cargo) {
        this._drawCargoBody(ctx, b, phase, time);
      }

      this._drawRopes(ctx, world, time, ropeMode);

      if (phase === 'loading') {
        this._drawLoadingInteractive(ctx, world, dragPreview, ropePreview, ropeHover, ropeMode, time);
      }

      this._drawParticles(ctx, particles);
      this._drawPopups(ctx, popups);

      if (phase === 'driving') {
        this._drawUpcomingHazard(ctx, world.truck, stage, time);
      }

      ctx.restore();
    }

    _drawSkyAndParallax(ctx, theme, time) {
      const W = this.width;
      const H = this.height;

      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, theme.skyTop);
      if (theme.skyMid) grad.addColorStop(0.55, theme.skyMid);
      grad.addColorStop(1, theme.skyBot);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      const sunX = W * 0.78 - this.cam.x * 0.15;
      const sunY = H * theme.sunY;
      ctx.save();
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 95);
      sunGlow.addColorStop(0, theme.sunColor);
      sunGlow.addColorStop(0.45, 'rgba(255,240,190,0.35)');
      sunGlow.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 95, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = theme.sunColor;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = theme.cloudColor;
      for (let i = 0; i < 6; i++) {
        const span = W + 280;
        const rawX = i * 270 - this.cam.x * 4.5 + time * (4 + (i % 3) * 2);
        const cx = ((rawX % span) + span) % span - 140;
        const cy = H * (0.12 + (i % 3) * 0.085);
        const r = 24 + (i % 3) * 9;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.arc(cx + r * 0.9, cy - r * 0.25, r * 0.85, 0, Math.PI * 2);
        ctx.arc(cx + r * 1.7, cy + r * 0.05, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      this._drawMountainLayer(ctx, theme.mtnFar, 0.09, H * 0.62, 65, 0.0042, 1.3);
      this._drawMountainLayer(ctx, theme.mtnNear, 0.20, H * 0.72, 46, 0.0068, 3.7);
    }

    _drawMountainLayer(ctx, color, parallax, baseY, amp, freq, seed) {
      const W = this.width;
      const H = this.height;
      const offset = this.cam.x * parallax * this.cam.scale * 0.14;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W + 24; x += 24) {
        const wx = x + offset;
        const y =
          baseY -
          Math.sin(wx * freq + seed) * amp -
          Math.sin(wx * freq * 2.1 + seed * 2.4) * (amp * 0.38);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    }

    _drawBackgroundHousesAndPoles(ctx, terrain, stage, theme) {
      const leftW = this.screenToWorld(0, 0).x - 16;
      const rightW = this.screenToWorld(this.width, 0).x + 16;
      const sc = this.cam.scale;

      const houseStep = 22;
      const firstH = Math.floor(leftW / houseStep) * houseStep;
      for (let hx = firstH; hx <= rightW; hx += houseStep) {
        if (hx < 12 || hx > stage.distance - 14) continue;
        const seed = Math.abs(Math.sin(hx * 12.9898) * 43758.5453) % 1;
        const gy = terrain.heightAt(hx);
        const sp = this.worldToScreen(hx, gy);

        if (seed < 0.58) {
          const hw = (3.4 + seed * 2.1) * sc * 0.72;
          const hh = (2.6 + ((seed * 7) % 1.4)) * sc * 0.72;
          ctx.fillStyle = theme.headlights ? '#4b4557' : '#e6dfd3';
          ctx.strokeStyle = '#4a433d';
          ctx.lineWidth = 1.4;
          ctx.fillRect(sp.x - hw * 0.5, sp.y - hh, hw, hh);
          ctx.strokeRect(sp.x - hw * 0.5, sp.y - hh, hw, hh);

          ctx.beginPath();
          ctx.moveTo(sp.x - hw * 0.62, sp.y - hh + 2);
          ctx.lineTo(sp.x, sp.y - hh - hh * 0.45);
          ctx.lineTo(sp.x + hw * 0.62, sp.y - hh + 2);
          ctx.closePath();
          ctx.fillStyle = seed < 0.25 ? '#b35342' : seed < 0.42 ? '#45607a' : '#586b59';
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = theme.headlights ? '#ffe082' : '#96c2de';
          const winW = hw * 0.18;
          const winH = hh * 0.22;
          ctx.fillRect(sp.x - hw * 0.28, sp.y - hh * 0.68, winW, winH);
          ctx.fillRect(sp.x + hw * 0.10, sp.y - hh * 0.68, winW, winH);
        } else {
          const trH = (2.8 + seed * 1.4) * sc * 0.75;
          ctx.fillStyle = '#6b4d38';
          ctx.fillRect(sp.x - 3.5, sp.y - trH * 0.5, 7, trH * 0.5);
          ctx.fillStyle = theme.headlights ? '#3b573c' : '#5e9654';
          ctx.beginPath();
          ctx.arc(sp.x, sp.y - trH * 0.68, trH * 0.34, 0, Math.PI * 2);
          ctx.arc(sp.x - trH * 0.2, sp.y - trH * 0.52, trH * 0.24, 0, Math.PI * 2);
          ctx.arc(sp.x + trH * 0.22, sp.y - trH * 0.54, trH * 0.24, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const poleStep = 34;
      const polePhase = 11;
      const firstP = Math.floor((leftW - polePhase) / poleStep) * poleStep + polePhase;
      const poleTops = [];
      for (let px = firstP; px <= rightW + poleStep; px += poleStep) {
        const gy = terrain.heightAt(px);
        const bot = this.worldToScreen(px, gy);
        const top = this.worldToScreen(px, gy + 5.2);
        poleTops.push(top);

        ctx.strokeStyle = '#6c6f75';
        ctx.lineWidth = Math.max(2.5, sc * 0.08);
        ctx.beginPath();
        ctx.moveTo(bot.x, bot.y + 4);
        ctx.lineTo(top.x, top.y);
        ctx.stroke();

        ctx.lineWidth = Math.max(1.8, sc * 0.05);
        ctx.beginPath();
        ctx.moveTo(top.x - sc * 0.35, top.y + sc * 0.22);
        ctx.lineTo(top.x + sc * 0.35, top.y + sc * 0.22);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(45, 48, 56, 0.42)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < poleTops.length - 1; i++) {
        const a = poleTops[i];
        const b = poleTops[i + 1];
        const midX = (a.x + b.x) * 0.5;
        const midY = (a.y + b.y) * 0.5 + sc * 0.55;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y + sc * 0.16);
        ctx.quadraticCurveTo(midX, midY, b.x, b.y + sc * 0.16);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(a.x, a.y + sc * 0.32);
        ctx.quadraticCurveTo(midX, midY + sc * 0.22, b.x, b.y + sc * 0.32);
        ctx.stroke();
      }
    }

    _drawDepartureAndGoalBuildings(ctx, terrain, stage, time) {
      const sc = this.cam.scale;

      const startP = this.worldToScreen(-4.5, terrain.heightAt(-4.5));
      if (startP.x > -300 && startP.x < this.width + 300) {
        const bw = 4.6 * sc;
        const bh = 4.2 * sc;
        ctx.save();
        ctx.fillStyle = '#ebe3d3';
        ctx.strokeStyle = '#3d352e';
        ctx.lineWidth = 2;
        ctx.fillRect(startP.x - bw * 0.5, startP.y - bh, bw, bh);
        ctx.strokeRect(startP.x - bw * 0.5, startP.y - bh, bw, bh);

        ctx.fillStyle = '#73828f';
        ctx.fillRect(startP.x - bw * 0.52, startP.y - bh - sc * 0.25, bw * 1.04, sc * 0.28);
        ctx.strokeRect(startP.x - bw * 0.52, startP.y - bh - sc * 0.25, bw * 1.04, sc * 0.28);

        ctx.fillStyle = '#9ec7e0';
        for (let i = 0; i < 2; i++) {
          const wx = startP.x - bw * 0.36 + i * bw * 0.46;
          ctx.fillRect(wx, startP.y - bh * 0.80, bw * 0.28, bh * 0.24);
          ctx.strokeRect(wx, startP.y - bh * 0.80, bw * 0.28, bh * 0.24);
          ctx.fillRect(wx, startP.y - bh * 0.38, bw * 0.28, bh * 0.24);
          ctx.strokeRect(wx, startP.y - bh * 0.38, bw * 0.28, bh * 0.24);
        }
        ctx.fillStyle = '#fff';
        ctx.fillRect(startP.x - bw * 0.35, startP.y - bh * 0.52, bw * 0.70, sc * 0.42);
        ctx.strokeRect(startP.x - bw * 0.35, startP.y - bh * 0.52, bw * 0.70, sc * 0.42);
        ctx.fillStyle = '#36302a';
        ctx.font = `bold ${Math.max(10, Math.round(sc * 0.23))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('旧居アパート', startP.x, startP.y - bh * 0.52 + sc * 0.21);
        ctx.restore();
      }

      const gx = stage.distance;
      const gy = terrain.heightAt(gx);
      const gp = this.worldToScreen(gx, gy);
      if (gp.x > -350 && gp.x < this.width + 450) {
        ctx.save();
        const poleH = 4.0 * sc;
        ctx.fillStyle = '#e04f3d';
        ctx.fillRect(gp.x - 5, gp.y - poleH, 10, poleH);
        const wave = Math.sin(time * 5) * 4;
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#2d2520';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gp.x + 5, gp.y - poleH + 6);
        ctx.lineTo(gp.x + sc * 2.1, gp.y - poleH + 6 + wave);
        ctx.lineTo(gp.x + sc * 1.9, gp.y - poleH + sc * 0.85 + wave);
        ctx.lineTo(gp.x + 5, gp.y - poleH + sc * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#d93d2b';
        ctx.font = `bold ${Math.max(11, Math.round(sc * 0.32))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('新居 GOAL!', gp.x + sc * 1.0, gp.y - poleH + sc * 0.46 + wave * 0.5);

        const hp = this.worldToScreen(gx + 5.2, terrain.heightAt(gx + 5.2));
        const hw = 4.8 * sc;
        const hh = 3.4 * sc;
        ctx.fillStyle = stage.id === 3 ? '#d8c3a5' : '#fdf7ec';
        ctx.strokeStyle = '#332b24';
        ctx.lineWidth = 2;
        ctx.fillRect(hp.x - hw * 0.5, hp.y - hh, hw, hh);
        ctx.strokeRect(hp.x - hw * 0.5, hp.y - hh, hw, hh);

        ctx.beginPath();
        ctx.moveTo(hp.x - hw * 0.62, hp.y - hh + 2);
        ctx.lineTo(hp.x, hp.y - hh - sc * 1.6);
        ctx.lineTo(hp.x + hw * 0.62, hp.y - hh + 2);
        ctx.closePath();
        ctx.fillStyle = stage.id === 3 ? '#3a4959' : '#c94c38';
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#915730';
        ctx.fillRect(hp.x - sc * 0.55, hp.y - sc * 1.45, sc * 0.9, sc * 1.45);
        ctx.strokeRect(hp.x - sc * 0.55, hp.y - sc * 1.45, sc * 0.9, sc * 1.45);
        ctx.fillStyle = '#ffe58f';
        ctx.fillRect(hp.x + sc * 0.75, hp.y - sc * 2.1, sc * 1.1, sc * 0.95);
        ctx.strokeRect(hp.x + sc * 0.75, hp.y - sc * 2.1, sc * 1.1, sc * 0.95);
        ctx.restore();
      }
    }

    _drawRoadFeaturesBack(ctx, terrain, stage, time) {
      const sc = this.cam.scale;
      const leftW = this.screenToWorld(0, 0).x - 10;
      const rightW = this.screenToWorld(this.width, 0).x + 10;

      for (const sign of stage.signs) {
        if (sign.x < leftW || sign.x > rightW) continue;
        const gy = terrain.heightAt(sign.x);
        const sp = this.worldToScreen(sign.x, gy);
        const poleH = sc * 2.25;

        ctx.save();
        ctx.strokeStyle = '#5f6670';
        ctx.lineWidth = Math.max(2.5, sc * 0.06);
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y + 4);
        ctx.lineTo(sp.x, sp.y - poleH);
        ctx.stroke();

        const dSize = sc * 0.44;
        const dy = sp.y - poleH - dSize * 0.15;
        ctx.save();
        ctx.translate(sp.x, dy);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#f5c42f';
        ctx.strokeStyle = '#24201c';
        ctx.lineWidth = 2.2;
        ctx.fillRect(-dSize * 0.65, -dSize * 0.65, dSize * 1.3, dSize * 1.3);
        ctx.strokeRect(-dSize * 0.65, -dSize * 0.65, dSize * 1.3, dSize * 1.3);
        ctx.restore();

        ctx.fillStyle = '#24201c';
        ctx.font = `bold ${Math.max(10, Math.round(sc * 0.34))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sign.kind === 'railroad' ? '×' : '!', sp.x, dy);

        ctx.fillStyle = '#fff9e6';
        ctx.strokeStyle = '#24201c';
        ctx.lineWidth = 1.5;
        const pw = Math.max(54, sc * 1.35);
        const ph = Math.max(18, sc * 0.38);
        ctx.fillRect(sp.x - pw * 0.5, dy + dSize * 0.92, pw, ph);
        ctx.strokeRect(sp.x - pw * 0.5, dy + dSize * 0.92, pw, ph);
        ctx.fillStyle = '#24201c';
        ctx.font = `bold ${Math.max(9, Math.round(sc * 0.21))}px sans-serif`;
        ctx.fillText(sign.text, sp.x, dy + dSize * 0.92 + ph * 0.52);
        ctx.restore();
      }

      for (const f of stage.features) {
        if (f.type === 'hill' && f.bridge) {
          const x0 = f.cx - f.halfW * 0.85;
          const x1 = f.cx + f.halfW * 0.85;
          if (x1 < leftW || x0 > rightW) continue;
          ctx.save();
          ctx.strokeStyle = '#b5483a';
          ctx.lineWidth = Math.max(2.5, sc * 0.08);
          ctx.beginPath();
          for (let x = x0; x <= x1; x += 1.2) {
            const p = this.worldToScreen(x, terrain.heightAt(x) + 1.15);
            if (x === x0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
          ctx.lineWidth = Math.max(1.8, sc * 0.05);
          for (let x = x0; x <= x1; x += 2.6) {
            const bot = this.worldToScreen(x, terrain.heightAt(x));
            const top = this.worldToScreen(x, terrain.heightAt(x) + 1.15);
            ctx.beginPath();
            ctx.moveTo(bot.x, bot.y);
            ctx.lineTo(top.x, top.y);
            ctx.stroke();
          }
          ctx.restore();
        } else if (f.type === 'railroad') {
          if (f.cx + 6 < leftW || f.cx - 6 > rightW) continue;
          const px = f.cx - 2.4;
          const sp = this.worldToScreen(px, terrain.heightAt(px));
          const poleH = sc * 2.9;
          ctx.save();
          const stripes = 6;
          for (let s = 0; s < stripes; s++) {
            ctx.fillStyle = s % 2 === 0 ? '#f5c92a' : '#222';
            ctx.fillRect(sp.x - 4, sp.y - poleH + (s * poleH) / stripes, 8, poleH / stripes + 1);
          }
          ctx.strokeStyle = '#f5c92a';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(sp.x - sc * 0.42, sp.y - poleH + sc * 0.25);
          ctx.lineTo(sp.x + sc * 0.42, sp.y - poleH + sc * 0.95);
          ctx.moveTo(sp.x + sc * 0.42, sp.y - poleH + sc * 0.25);
          ctx.lineTo(sp.x - sc * 0.42, sp.y - poleH + sc * 0.95);
          ctx.stroke();

          const blink = Math.floor(time * 2.5) % 2 === 0;
          ctx.fillStyle = blink ? '#ff3b30' : '#631d19';
          ctx.beginPath();
          ctx.arc(sp.x - sc * 0.26, sp.y - poleH + sc * 1.15, Math.max(4, sc * 0.11), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = !blink ? '#ff3b30' : '#631d19';
          ctx.beginPath();
          ctx.arc(sp.x + sc * 0.26, sp.y - poleH + sc * 1.15, Math.max(4, sc * 0.11), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    _drawRoadFeaturesFront(ctx, terrain, stage) {
      const sc = this.cam.scale;
      const leftW = this.screenToWorld(0, 0).x - 8;
      const rightW = this.screenToWorld(this.width, 0).x + 8;

      for (const f of stage.features) {
        if (f.type === 'step') {
          if (f.x1 + 2 < leftW || f.x0 - 2 > rightW) continue;
          ctx.save();
          // Steel construction road plate overlay along the elevated step
          const p0 = this.worldToScreen(f.x0 - 0.15, terrain.heightAt(f.x0 - 0.15));
          const p1 = this.worldToScreen(f.x1 + 0.15, terrain.heightAt(f.x1 + 0.15));
          ctx.strokeStyle = '#7e8b99';
          ctx.lineWidth = Math.max(5, sc * 0.12);
          ctx.lineCap = 'butt';
          ctx.beginPath();
          for (let x = f.x0 - 0.15; x <= f.x1 + 0.15; x += 0.35) {
            const p = this.worldToScreen(x, terrain.heightAt(x));
            if (x === f.x0 - 0.15) ctx.moveTo(p.x, p.y + 1.5);
            else ctx.lineTo(p.x, p.y + 1.5);
          }
          ctx.stroke();

          // Yellow hazard bevel paint on entry and exit edges
          ctx.fillStyle = '#f5c42f';
          ctx.fillRect(p0.x - 4, p0.y - 2, 7, 7);
          ctx.fillRect(p1.x - 3, p1.y - 2, 7, 7);
          ctx.restore();
        } else if (f.type === 'bump') {
          if (f.cx + f.w < leftW || f.cx - f.w > rightW) continue;
          ctx.save();
          const xL = f.cx - f.w * 0.35;
          const xR = f.cx + f.w * 0.35;
          ctx.strokeStyle = '#f2c12e';
          ctx.lineWidth = Math.max(4, sc * 0.09);
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          for (let x = xL; x <= xR; x += 0.12) {
            const p = this.worldToScreen(x, terrain.heightAt(x));
            if (x === xL) ctx.moveTo(p.x, p.y + 2);
            else ctx.lineTo(p.x, p.y + 2);
          }
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        } else if (f.type === 'washboard') {
          const xEnd = f.x0 + f.count * f.spacing;
          if (xEnd + 2 < leftW || f.x0 - 2 > rightW) continue;
          ctx.save();
          for (let k = 0; k < f.count; k++) {
            const cx = f.x0 + k * f.spacing;
            const p = this.worldToScreen(cx, terrain.heightAt(cx));
            ctx.fillStyle = k % 2 === 0 ? '#f7ca2c' : '#fff8e0';
            ctx.strokeStyle = '#2b2620';
            ctx.lineWidth = 1;
            const bw = Math.max(8, f.bumpW * sc * 0.45);
            ctx.fillRect(p.x - bw * 0.5, p.y - 1, bw, 5);
            ctx.strokeRect(p.x - bw * 0.5, p.y - 1, bw, 5);
          }
          ctx.restore();
        } else if (f.type === 'dropoff') {
          if (f.x0 + 3 < leftW || f.x0 - 3 > rightW) continue;
          const p = this.worldToScreen(f.x0, terrain.heightAt(f.x0));
          ctx.save();
          ctx.fillStyle = '#f5c42f';
          ctx.fillRect(p.x - 10, p.y - 1, 14, 6);
          ctx.fillStyle = '#222';
          ctx.fillRect(p.x - 6, p.y - 1, 5, 6);
          ctx.restore();
        }

        if (f.construction) {
          const xStart = f.x0 - 1.8;
          const xEnd = (f.x1 || f.x0 + f.count * f.spacing) + 1.8;
          if (xEnd < leftW || xStart > rightW) continue;
          for (const cx of [xStart, xEnd]) {
            const sp = this.worldToScreen(cx, terrain.heightAt(cx));
            const ch = sc * 0.62;
            const cw = sc * 0.36;
            ctx.fillStyle = '#f26022';
            ctx.beginPath();
            ctx.moveTo(sp.x, sp.y - ch);
            ctx.lineTo(sp.x + cw * 0.5, sp.y);
            ctx.lineTo(sp.x - cw * 0.5, sp.y);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillRect(sp.x - cw * 0.24, sp.y - ch * 0.55, cw * 0.48, ch * 0.16);
          }
        }
        if (f.type === 'railroad') {
          if (f.cx + 4 < leftW || f.cx - 4 > rightW) continue;
          // Timber crossing planks between rails
          const pL = this.worldToScreen(f.cx - 1.25, terrain.heightAt(f.cx - 1.25));
          const pR = this.worldToScreen(f.cx + 1.25, terrain.heightAt(f.cx + 1.25));
          ctx.fillStyle = '#7c5b3e';
          ctx.fillRect(pL.x, Math.min(pL.y, pR.y) + 1, pR.x - pL.x, 7);
          for (const rx of [f.cx - 0.85, f.cx + 0.85]) {
            const rp = this.worldToScreen(rx, terrain.heightAt(rx));
            ctx.fillStyle = '#d8e1eb';
            ctx.strokeStyle = '#2c323b';
            ctx.lineWidth = 1.6;
            ctx.fillRect(rp.x - sc * 0.11, rp.y - 3, sc * 0.22, 9);
            ctx.strokeRect(rp.x - sc * 0.11, rp.y - 3, sc * 0.22, 9);
          }
        }
      }
    }

    _drawTerrain(ctx, terrain, theme) {
      const W = this.width;
      const H = this.height;
      const sc = this.cam.scale;
      const stepPx = 6;

      const pts = [];
      for (let sx = -stepPx; sx <= W + stepPx * 2; sx += stepPx) {
        const wx = this.screenToWorld(sx, 0).x;
        const wy = terrain.heightAt(wx);
        const sy = this.worldToScreen(wx, wy).y;
        pts.push({ sx, sy, wx, wy });
      }

      ctx.beginPath();
      ctx.moveTo(pts[0].sx, H + 10);
      for (let i = 0; i < pts.length; i++) {
        ctx.lineTo(pts[i].sx, pts[i].sy);
      }
      ctx.lineTo(pts[pts.length - 1].sx, H + 10);
      ctx.closePath();
      ctx.fillStyle = theme.soilBody;
      ctx.fill();

      const asphaltThick = Math.max(12, sc * 0.28);
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        if (i === 0) ctx.moveTo(pts[i].sx, pts[i].sy + asphaltThick);
        else ctx.lineTo(pts[i].sx, pts[i].sy + asphaltThick);
      }
      for (let i = pts.length - 1; i >= 0; i--) {
        ctx.lineTo(pts[i].sx, pts[i].sy + asphaltThick + Math.max(10, sc * 0.24));
      }
      ctx.closePath();
      ctx.fillStyle = theme.soilTop;
      ctx.fill();

      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        if (i === 0) ctx.moveTo(pts[i].sx, pts[i].sy);
        else ctx.lineTo(pts[i].sx, pts[i].sy);
      }
      for (let i = pts.length - 1; i >= 0; i--) {
        ctx.lineTo(pts[i].sx, pts[i].sy + asphaltThick);
      }
      ctx.closePath();
      ctx.fillStyle = theme.asphalt;
      ctx.fill();

      ctx.strokeStyle = theme.asphaltEdge;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        if (i === 0) ctx.moveTo(pts[i].sx, pts[i].sy);
        else ctx.lineTo(pts[i].sx, pts[i].sy);
      }
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 250, 230, 0.55)';
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.setLineDash([sc * 0.9, sc * 0.9]);
      ctx.lineDashOffset = this.cam.x * sc;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        if (i === 0) ctx.moveTo(pts[i].sx, pts[i].sy + asphaltThick * 0.48);
        else ctx.lineTo(pts[i].sx, pts[i].sy + asphaltThick * 0.48);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    _drawTruck(ctx, truck, theme, time, driverMood) {
      const sc = this.cam.scale;
      const tp = this.worldToScreen(truck.x, truck.y);

      const c = Math.cos(truck.angle);
      const s = Math.sin(truck.angle);
      for (const wh of truck.wheels) {
        const mx = truck.x + wh.lx * c - wh.ly * s;
        const my = truck.y + wh.lx * s + wh.ly * c;
        const pMount = this.worldToScreen(mx, my);
        const pHub = this.worldToScreen(wh.worldX, wh.worldY);

        ctx.save();
        ctx.strokeStyle = wh.comp > 0.23 ? '#d94c38' : '#3a424d';
        ctx.lineWidth = Math.max(2, sc * 0.045);
        ctx.beginPath();
        const coils = 5;
        const dx = pHub.x - pMount.x;
        const dy = pHub.y - pMount.y;
        const perpX = -dy;
        const perpY = dx;
        const plen = Math.hypot(perpX, perpY) || 1;
        const ux = (perpX / plen) * sc * 0.07;
        const uy = (perpY / plen) * sc * 0.07;
        ctx.moveTo(pMount.x, pMount.y);
        for (let k = 1; k < coils; k++) {
          const t = k / coils;
          const side = k % 2 === 0 ? 1 : -1;
          ctx.lineTo(pMount.x + dx * t + ux * side, pMount.y + dy * t + uy * side);
        }
        ctx.lineTo(pHub.x, pHub.y);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(tp.x, tp.y);
      ctx.rotate(-truck.angle);

      const m = sc;

      if (theme.headlights) {
        ctx.save();
        const beamGrad = ctx.createLinearGradient(1.55 * m, -0.22 * m, 7.2 * m, 0.2 * m);
        beamGrad.addColorStop(0, 'rgba(255, 245, 195, 0.45)');
        beamGrad.addColorStop(1, 'rgba(255, 245, 195, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(1.56 * m, -0.28 * m);
        ctx.lineTo(7.4 * m, -1.2 * m);
        ctx.lineTo(7.4 * m, 0.9 * m);
        ctx.lineTo(1.56 * m, -0.05 * m);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = '#2c3138';
      ctx.fillRect(-1.62 * m, 0.08 * m, 3.05 * m, 0.22 * m);

      ctx.fillStyle = '#555d66';
      ctx.fillRect(-1.78 * m, 0.16 * m, 0.22 * m, 0.08 * m);

      ctx.fillStyle = '#202429';
      ctx.fillRect(-1.45 * m, 0.20 * m, 0.06 * m, 0.22 * m);

      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#262b33';
      ctx.lineWidth = Math.max(1.8, m * 0.035);
      ctx.beginPath();
      ctx.moveTo(0.46 * m, 0.18 * m);
      ctx.lineTo(0.46 * m, -1.04 * m);
      ctx.lineTo(1.18 * m, -1.04 * m);
      ctx.lineTo(1.48 * m, -0.54 * m);
      ctx.lineTo(1.58 * m, -0.34 * m);
      ctx.lineTo(1.58 * m, 0.18 * m);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#a8d4eb';
      ctx.beginPath();
      ctx.moveTo(0.58 * m, -0.94 * m);
      ctx.lineTo(1.12 * m, -0.94 * m);
      ctx.lineTo(1.38 * m, -0.50 * m);
      ctx.lineTo(0.58 * m, -0.50 * m);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cute Driver inside Cab
      ctx.save();
      const drvX = 0.88 * m;
      const drvY = -0.68 * m;
      ctx.fillStyle = '#3668a8';
      ctx.beginPath();
      ctx.arc(drvX, drvY + 0.18 * m, 0.16 * m, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#fbd4b4';
      ctx.strokeStyle = '#382a20';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(drvX, drvY, 0.13 * m, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillRect(drvX - 0.13 * m, drvY - 0.08 * m, 0.26 * m, 0.05 * m);
      ctx.strokeRect(drvX - 0.13 * m, drvY - 0.08 * m, 0.26 * m, 0.05 * m);
      ctx.fillStyle = '#222';
      if (driverMood === 'panic') {
        ctx.beginPath();
        ctx.arc(drvX + 0.05 * m, drvY - 0.01 * m, 0.028 * m, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.beginPath();
        ctx.arc(drvX + 0.06 * m, drvY + 0.06 * m, 0.03 * m, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#4ec3ff';
        ctx.beginPath();
        ctx.arc(drvX - 0.06 * m, drvY - 0.03 * m, 0.025 * m, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(drvX + 0.05 * m, drvY - 0.01 * m, 0.02 * m, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(drvX + 0.04 * m, drvY + 0.04 * m, 0.035 * m, 0.1, Math.PI * 0.75);
        ctx.stroke();
      }
      ctx.strokeStyle = '#2b2d30';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(1.22 * m, -0.50 * m);
      ctx.lineTo(1.13 * m, -0.66 * m);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#e65b39';
      ctx.fillRect(0.47 * m, -0.34 * m, 1.09 * m, 0.08 * m);
      ctx.fillStyle = '#333';
      ctx.fillRect(0.60 * m, -0.43 * m, 0.12 * m, 0.04 * m);

      ctx.fillStyle = theme.headlights ? '#fff5b0' : '#f2f0d8';
      ctx.strokeStyle = '#262b33';
      ctx.lineWidth = 1.5;
      ctx.fillRect(1.48 * m, -0.28 * m, 0.11 * m, 0.16 * m);
      ctx.strokeRect(1.48 * m, -0.28 * m, 0.11 * m, 0.16 * m);
      ctx.fillStyle = '#f59f20';
      ctx.fillRect(1.49 * m, -0.11 * m, 0.09 * m, 0.07 * m);
      ctx.fillStyle = '#2c3138';
      ctx.fillRect(1.42 * m, 0.01 * m, 0.22 * m, 0.16 * m);
      ctx.fillStyle = '#f7d136';
      ctx.fillRect(1.56 * m, 0.04 * m, 0.06 * m, 0.10 * m);

      // Torii / Cab Guard Frame
      ctx.fillStyle = '#e5ebf0';
      ctx.strokeStyle = '#262b33';
      ctx.lineWidth = Math.max(1.8, m * 0.032);
      ctx.fillRect(0.37 * m, -1.16 * m, 0.09 * m, 1.18 * m);
      ctx.strokeRect(0.37 * m, -1.16 * m, 0.09 * m, 1.18 * m);
      ctx.fillStyle = '#303640';
      ctx.fillRect(0.34 * m, -1.18 * m, 0.15 * m, 0.06 * m);

      // Bed Floor & Side Skirt Panel (always visible below cargo!)
      ctx.fillStyle = '#f2f6fa';
      ctx.fillRect(-1.72 * m, 0.0, 2.16 * m, 0.18 * m);
      ctx.strokeRect(-1.72 * m, 0.0, 2.16 * m, 0.18 * m);

      ctx.fillStyle = 'rgba(232, 239, 245, 0.72)';
      ctx.fillRect(-1.68 * m, -0.16 * m, 2.05 * m, 0.16 * m);
      ctx.strokeRect(-1.68 * m, -0.16 * m, 2.05 * m, 0.16 * m);

      ctx.fillStyle = '#c94932';
      ctx.font = `bold ${Math.max(8, Math.round(m * 0.118))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('軽トラ限界便', -0.10 * m, 0.095 * m);

      // Rear Tailgate
      ctx.fillStyle = '#f2f6fa';
      ctx.fillRect(-1.78 * m, -0.40 * m, 0.10 * m, 0.42 * m);
      ctx.strokeRect(-1.78 * m, -0.40 * m, 0.10 * m, 0.42 * m);
      ctx.fillStyle = truck.brake > 0.1 ? '#ff2a1f' : '#a82b24';
      ctx.fillRect(-1.79 * m, 0.02 * m, 0.08 * m, 0.11 * m);

      ctx.fillStyle = '#5d6670';
      for (const hk of truck.hooks) {
        ctx.beginPath();
        ctx.arc(hk.lx * m, -hk.ly * m, Math.max(2.5, m * 0.04), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      for (const wh of truck.wheels) {
        const wp = this.worldToScreen(wh.worldX, wh.worldY);
        const rPx = wh.radius * sc;
        ctx.save();
        ctx.translate(wp.x, wp.y);
        ctx.rotate(-wh.spin);

        ctx.beginPath();
        ctx.arc(0, 0, rPx, 0, Math.PI * 2);
        ctx.fillStyle = '#24272c';
        ctx.fill();
        ctx.strokeStyle = '#14161a';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, rPx * 0.56, 0, Math.PI * 2);
        ctx.fillStyle = '#cfd6de';
        ctx.fill();
        ctx.strokeStyle = '#525b66';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        ctx.fillStyle = '#474f59';
        for (let k = 0; k < 4; k++) {
          const a = (k * Math.PI) / 2;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * rPx * 0.30, Math.sin(a) * rPx * 0.30, Math.max(2, rPx * 0.10), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(0, 0, rPx * 0.16, 0, Math.PI * 2);
        ctx.fillStyle = '#6c7682';
        ctx.fill();
        ctx.restore();
      }
    }

    _drawCargoBody(ctx, body, phase, time) {
      const sc = this.cam.scale;
      const p = this.worldToScreen(body.x, body.y);
      const wPx = body.def.w * sc;
      const hPx = body.def.h * sc;
      const state = global.Keitora.getDamageState(body.hp);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(-body.angle);

      if (body.dropped) {
        ctx.globalAlpha = 0.85;
      }

      global.Keitora.drawItemGraphic(ctx, body.def, wPx, hPx, state, time);

      if (body.hitFlash > 0.05) {
        ctx.fillStyle = `rgba(255, 65, 50, ${body.hitFlash * 0.42})`;
        ctx.fillRect(-wPx * 0.5, -hPx * 0.5, wPx, hPx);
      }

      ctx.restore();

      if (phase === 'loading') {
        const isCrushed = body.smoothedTopLoad > body.def.crushLimit;
        const tiltDeg = (Math.abs(global.Keitora.normalizeAngle(body.angle)) * 180) / Math.PI;
        const isTilted = body.def.uprightOnly && tiltDeg > body.def.uprightMaxDeg;
        if (isCrushed || isTilted) {
          const pulse = 0.72 + Math.sin(time * 9) * 0.28;
          const label = isCrushed ? '⚠ 潰れる!' : '⚠ 傾き危険!';
          ctx.save();
          ctx.globalAlpha = pulse;
          const by = p.y - Math.max(wPx, hPx) * 0.48 - 14;
          ctx.font = '900 11px sans-serif';
          const tw = ctx.measureText(label).width + 12;
          ctx.fillStyle = isCrushed ? '#d9261c' : '#e07b10';
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.fillRect(p.x - tw * 0.5, by - 10, tw, 19);
          ctx.strokeRect(p.x - tw * 0.5, by - 10, tw, 19);
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, p.x, by);
          ctx.restore();
        }
      } else if (!body.dropped && (body.hp < 99.5 || body.hitFlash > 0.1)) {
        const barW = Math.max(28, Math.min(54, wPx * 0.85));
        const barH = 5;
        const bx = p.x - barW * 0.5;
        const by = p.y - Math.max(wPx, hPx) * 0.55 - 10;
        const ratio = Math.max(0, body.hp / 100);

        ctx.fillStyle = 'rgba(20, 22, 26, 0.72)';
        ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
        ctx.fillStyle = state === 'intact' ? '#49c969' : state === 'damaged' ? '#f5a623' : '#e83e35';
        ctx.fillRect(bx, by, barW * ratio, barH);
      }
    }

    _drawRopes(ctx, world, time, ropeMode) {
      const localToWorld = global.Keitora.localToWorld;
      for (const rope of world.ropes) {
        if (rope.snapped) continue;
        const pA = localToWorld(rope.bodyA, rope.localA.x, rope.localA.y);
        const pB = localToWorld(rope.bodyB, rope.localB.x, rope.localB.y);
        const sA = this.worldToScreen(pA.x, pA.y);
        const sB = this.worldToScreen(pB.x, pB.y);
        const dist = Math.hypot(pB.x - pA.x, pB.y - pA.y);
        const slack = Math.max(0, rope.restLen - dist);

        const strain = Math.min(1, rope.tensionRatio || 0);
        const vib = strain > 0.55 ? Math.sin(time * 55) * strain * 3.0 : 0;
        const midX = (sA.x + sB.x) * 0.5;
        const midY = (sA.y + sB.y) * 0.5 + slack * this.cam.scale * 0.65 + vib;

        ctx.save();
        const ropeColor = strain > 0.72 ? '#ff3b2f' : strain > 0.45 ? '#ff9f1c' : '#f5cf27';
        ctx.strokeStyle = '#221e1a';
        ctx.lineWidth = ropeMode ? 7 : 5.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sA.x, sA.y);
        ctx.quadraticCurveTo(midX, midY, sB.x, sB.y);
        ctx.stroke();

        ctx.strokeStyle = ropeColor;
        ctx.lineWidth = ropeMode ? 4.2 : 3.2;
        ctx.setLineDash([7, 6]);
        ctx.beginPath();
        ctx.moveTo(sA.x, sA.y);
        ctx.quadraticCurveTo(midX, midY, sB.x, sB.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = ropeColor;
        ctx.strokeStyle = '#221e1a';
        ctx.lineWidth = 1.6;
        for (const pt of [sA, sB]) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    _drawLoadingGuides(ctx, world) {
      const localToWorld = global.Keitora.localToWorld;
      const truck = world.truck;

      const leftH = localToWorld(truck, -1.72, 2.25);
      const rightH = localToWorld(truck, 0.42, 2.25);
      const sL = this.worldToScreen(leftH.x, leftH.y);
      const sR = this.worldToScreen(rightH.x, rightH.y);

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 240, 210, 0.72)';
      ctx.lineWidth = 2.0;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(sL.x, sL.y);
      ctx.lineTo(sR.x, sR.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const label = '▲ 積載高さ目安（高いほど揺れやすい）';
      ctx.font = 'bold 11px sans-serif';
      const tw = ctx.measureText(label).width + 12;
      ctx.fillStyle = 'rgba(36, 28, 22, 0.68)';
      ctx.fillRect(sL.x, sL.y - 22, tw, 18);
      ctx.fillStyle = '#fff5d6';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, sL.x + 6, sL.y - 13);

      const backBot = localToWorld(truck, -1.68, 0.40);
      const backTop = localToWorld(truck, -1.68, 2.25);
      const sb1 = this.worldToScreen(backBot.x, backBot.y);
      const sb2 = this.worldToScreen(backTop.x, backTop.y);
      ctx.strokeStyle = 'rgba(40, 50, 65, 0.16)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(sb1.x, sb1.y);
      ctx.lineTo(sb2.x, sb2.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    _drawLoadingInteractive(ctx, world, dragPreview, ropePreview, ropeHover, ropeMode, time) {
      const localToWorld = global.Keitora.localToWorld;
      const truck = world.truck;
      const sc = this.cam.scale;

      const stats = world.getCargoStats();
      if (stats.count > 0) {
        const cgW = localToWorld(truck, stats.cgLocalX, stats.cgLocalY);
        const cgS = this.worldToScreen(cgW.x, cgW.y);
        const isRearHeavy = stats.cgLocalX < -0.95;
        const isHighCg = stats.cgLocalY > 1.25;
        const cgColor = isRearHeavy ? '#e03e32' : isHighCg ? '#e89820' : '#2e9e56';

        ctx.save();
        ctx.beginPath();
        ctx.arc(cgS.x, cgS.y, 11, 0, Math.PI * 2);
        ctx.fillStyle = cgColor;
        ctx.globalAlpha = 0.88;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('重', cgS.x, cgS.y + 0.5);
        ctx.restore();
      }

      if (ropeMode) {
        const pulse = 1 + Math.sin(time * 7) * 0.16;
        for (const hk of truck.hooks) {
          const hw = localToWorld(truck, hk.lx, hk.ly);
          const hs = this.worldToScreen(hw.x, hw.y);
          const isHovered = ropeHover && ropeHover.isTruck && ropeHover.hookId === hk.id;
          ctx.save();
          ctx.beginPath();
          ctx.arc(hs.x, hs.y, (isHovered ? 10 : 8) * pulse, 0, Math.PI * 2);
          ctx.fillStyle = isHovered ? '#fff08a' : 'rgba(245, 207, 39, 0.92)';
          ctx.fill();
          ctx.strokeStyle = isHovered ? '#e65c32' : '#221e1a';
          ctx.lineWidth = isHovered ? 2.8 : 2;
          ctx.stroke();
          ctx.restore();
        }

        if (ropeHover && ropeHover.world && ropeHover.label) {
          const hs = this.worldToScreen(ropeHover.world.x, ropeHover.world.y);
          ctx.save();
          if (!ropeHover.isTruck) {
            ctx.beginPath();
            ctx.arc(hs.x, hs.y, 7, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 240, 120, 0.9)';
            ctx.fill();
            ctx.strokeStyle = '#e65c32';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          ctx.font = 'bold 11px sans-serif';
          const tw = ctx.measureText(ropeHover.label).width + 12;
          ctx.fillStyle = 'rgba(34, 28, 22, 0.88)';
          ctx.fillRect(hs.x - tw * 0.5, hs.y - 30, tw, 20);
          ctx.fillStyle = '#fff7d6';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(ropeHover.label, hs.x, hs.y - 20);
          ctx.restore();
        }

        if (ropePreview && ropePreview.startWorld) {
          const sA = this.worldToScreen(ropePreview.startWorld.x, ropePreview.startWorld.y);
          const sB = this.worldToScreen(ropePreview.curWorld.x, ropePreview.curWorld.y);
          ctx.save();
          ctx.strokeStyle = ropePreview.valid ? '#f5cf27' : '#ff4d42';
          ctx.lineWidth = 4.5;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(sA.x, sA.y);
          ctx.lineTo(sB.x, sB.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(sA.x, sA.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#f5cf27';
          ctx.fill();
          ctx.strokeStyle = '#221e1a';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }
      }

      if (dragPreview && dragPreview.def) {
        const p = this.worldToScreen(dragPreview.wx, dragPreview.wy);
        const wPx = dragPreview.def.w * sc;
        const hPx = dragPreview.def.h * sc;

        if (dragPreview.valid && dragPreview.landingY !== undefined) {
          const landP = this.worldToScreen(dragPreview.wx, dragPreview.landingY);
          if (landP.y > p.y + 4) {
            ctx.save();
            ctx.strokeStyle = 'rgba(46, 158, 86, 0.55)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(landP.x, landP.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Subtle landing ghost outline at resting surface
            ctx.translate(landP.x, landP.y);
            ctx.rotate(-dragPreview.angle);
            ctx.strokeStyle = 'rgba(46, 158, 86, 0.52)';
            ctx.fillStyle = 'rgba(46, 158, 86, 0.12)';
            ctx.lineWidth = 2;
            ctx.fillRect(-wPx * 0.5, -hPx * 0.5, wPx, hPx);
            ctx.strokeRect(-wPx * 0.5, -hPx * 0.5, wPx, hPx);
            ctx.restore();
          }
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(-dragPreview.angle);
        ctx.globalAlpha = dragPreview.valid ? 0.90 : 0.55;
        global.Keitora.drawItemGraphic(ctx, dragPreview.def, wPx, hPx, 'intact', time);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = dragPreview.valid ? '#2ecc71' : '#ff3b30';
        ctx.lineWidth = 3;
        ctx.strokeRect(-wPx * 0.5 - 1, -hPx * 0.5 - 1, wPx + 2, hPx + 2);
        ctx.restore();

        if (!dragPreview.valid && dragPreview.reason) {
          ctx.save();
          ctx.fillStyle = 'rgba(215, 42, 35, 0.92)';
          const tw = 104;
          ctx.fillRect(p.x - tw * 0.5, p.y - Math.max(wPx, hPx) * 0.5 - 28, tw, 22);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(dragPreview.reason, p.x, p.y - Math.max(wPx, hPx) * 0.5 - 17);
          ctx.restore();
        }
      }
    }

    _drawUpcomingHazard(ctx, truck, stage, time) {
      let upcoming = null;
      let minDist = Infinity;
      for (const s of stage.signs) {
        const d = s.x - truck.x;
        if (d > 8 && d < 36 && d < minDist) {
          minDist = d;
          upcoming = s;
        }
      }
      if (!upcoming) return;

      const alpha = Math.min(1, Math.min((minDist - 8) / 5, (36 - minDist) / 6));
      const pulse = 1 + Math.sin(time * 9) * 0.04;
      const boxW = 172;
      const boxH = 44;
      const x = this.width - boxW - 18;
      const y = 102;

      ctx.save();
      ctx.globalAlpha = alpha * 0.95;
      ctx.translate(x + boxW * 0.5, y + boxH * 0.5);
      ctx.scale(pulse, pulse);

      ctx.fillStyle = 'rgba(255, 245, 206, 0.96)';
      ctx.strokeStyle = '#241e1a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-boxW * 0.5, -boxH * 0.5, boxW, boxH, 10);
      ctx.fill();
      ctx.stroke();

      // Yellow warning diamond icon on left
      ctx.save();
      ctx.translate(-boxW * 0.5 + 22, 0);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#f5c42f';
      ctx.strokeStyle = '#241e1a';
      ctx.lineWidth = 1.8;
      ctx.fillRect(-10, -10, 20, 20);
      ctx.strokeRect(-10, -10, 20, 20);
      ctx.restore();

      ctx.fillStyle = '#241e1a';
      ctx.font = '900 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(upcoming.kind === 'railroad' ? '×' : '!', -boxW * 0.5 + 22, 1);

      ctx.textAlign = 'left';
      ctx.font = '900 13px sans-serif';
      ctx.fillStyle = '#b8251a';
      ctx.fillText(upcoming.text, -boxW * 0.5 + 42, -6);

      ctx.font = '700 11px sans-serif';
      ctx.fillStyle = '#4f453d';
      ctx.fillText(`あと ${Math.round(minDist)}m 減速注意 ▶`, -boxW * 0.5 + 42, 10);

      ctx.restore();
    }

    drawCourseMinimap(miniCanvas, terrain, stage, truckX) {
      if (!miniCanvas) return;
      const ctx = miniCanvas.getContext('2d');
      const W = miniCanvas.width;
      const H = miniCanvas.height;
      ctx.clearRect(0, 0, W, H);

      const dist = stage.distance;
      const samples = 110;
      let minY = Infinity;
      let maxY = -Infinity;
      const ys = [];
      for (let i = 0; i <= samples; i++) {
        const wx = (i / samples) * dist;
        const wy = terrain.heightAt(wx);
        ys.push(wy);
        if (wy < minY) minY = wy;
        if (wy > maxY) maxY = wy;
      }
      const span = Math.max(2.0, maxY - minY);
      const padTop = 5;
      const padBot = 3;
      const usableH = H - padTop - padBot;

      const toY = (wy) => H - padBot - ((wy - minY) / span) * usableH;

      // Terrain silhouette
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let i = 0; i <= samples; i++) {
        const sx = (i / samples) * W;
        ctx.lineTo(sx, toY(ys[i]));
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = 'rgba(138, 104, 74, 0.34)';
      ctx.fill();

      ctx.strokeStyle = '#5c5045';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i <= samples; i++) {
        const sx = (i / samples) * W;
        const sy = toY(ys[i]);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Hazard dots (railroad / construction / dropoff)
      for (const f of stage.features) {
        const fx = f.cx !== undefined ? f.cx : f.x0;
        if (fx === undefined || fx < 0 || fx > dist) continue;
        const sx = (fx / dist) * W;
        const sy = toY(terrain.heightAt(fx));
        if (f.type === 'railroad') {
          ctx.fillStyle = '#e0352b';
          ctx.fillRect(sx - 2, sy - 6, 4, 6);
        } else if (f.type === 'step' || f.type === 'washboard' || f.type === 'dropoff') {
          ctx.fillStyle = '#d98c16';
          ctx.beginPath();
          ctx.arc(sx, sy - 2, 2.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Current truck position pin
      const tx = Math.max(0, Math.min(dist, truckX));
      const tsx = (tx / dist) * W;
      const tsy = toY(terrain.heightAt(tx));
      ctx.fillStyle = '#e65c32';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(tsx, tsy - 3, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    _drawParticles(ctx, particles) {
      for (const pt of particles) {
        const s = this.worldToScreen(pt.x, pt.y);
        const alpha = Math.max(0, pt.life / pt.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(s.x, s.y);
        ctx.rotate(pt.rot || 0);
        ctx.fillStyle = pt.color;
        if (pt.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, pt.size * (pt.grow ? 1.6 - alpha * 0.6 : 1), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-pt.size * 0.5, -pt.size * 0.5, pt.size, pt.size * 0.7);
        }
        ctx.restore();
      }
    }

    _drawPopups(ctx, popups) {
      for (const pop of popups) {
        const s = this.worldToScreen(pop.x, pop.y);
        const t = 1 - pop.life / pop.maxLife;
        const alpha = t < 0.7 ? 1 : Math.max(0, (1 - t) / 0.3);
        const scale = t < 0.14 ? 0.7 + (t / 0.14) * 0.45 : 1.0;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(s.x, s.y - t * 34);
        ctx.scale(scale, scale);
        ctx.font = `900 ${pop.size || 18}px "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#fff';
        ctx.strokeText(pop.text, 0, 0);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#231b16';
        ctx.strokeText(pop.text, 0, 0);
        ctx.fillStyle = pop.color || '#e63e2e';
        ctx.fillText(pop.text, 0, 0);
        ctx.restore();
      }
    }
  }

  const exportsObj = { WorldRenderer };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObj;
  } else {
    global.Keitora = Object.assign(global.Keitora || {}, exportsObj);
  }
})(typeof window !== 'undefined' ? window : globalThis);
