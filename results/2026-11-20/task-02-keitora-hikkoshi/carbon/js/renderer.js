(function (root) {
  'use strict';

  const THEMES = {
    spring_town: {
      skyTop: '#5eb5f7',
      skyMid: '#a8dcff',
      skyBot: '#f6fbff',
      sunColor: '#fff6cc',
      mountainFar: '#8fb8de',
      mountainNear: '#6d9dc5',
      grassTop: '#6ab04c',
      earth: '#7c583c',
      asphalt: '#404752',
      treeColor: '#f7b2c4', // Cherry blossoms!
      treeAlt: '#589e47'
    },
    sunset_suburb: {
      skyTop: '#3d4e81',
      skyMid: '#e57c52',
      skyBot: '#fbdca8',
      sunColor: '#ffd166',
      mountainFar: '#6c648b',
      mountainNear: '#4f4a6e',
      grassTop: '#789440',
      earth: '#6b4932',
      asphalt: '#3a3f4a',
      treeColor: '#567d38',
      treeAlt: '#d97b29'
    },
    mountain_pass: {
      skyTop: '#29274c',
      skyMid: '#b5525c',
      skyBot: '#f6bd78',
      sunColor: '#ff9f43',
      mountainFar: '#4c3f63',
      mountainNear: '#362d4a',
      grassTop: '#4f7745',
      earth: '#5c4130',
      asphalt: '#363b45',
      treeColor: '#2f5d44',
      treeAlt: '#c95b3c'
    }
  };

  /**
   * Standalone procedural illustration of any cargo item centered at (0,0) in pixel space
   * Note: Y-down canvas local coordinates (width pxW, height pxH)
   */
  function drawCargoArtwork(ctx, spec, pxW, pxH, hpRatio, options) {
    const hw = pxW / 2;
    const hh = pxH / 2;
    const opts = options || {};

    ctx.save();

    if (spec.shape === 'l_sofa') {
      const sh = (spec.seatHeight / spec.height) * pxH;
      const bw = (spec.backWidth / spec.width) * pxW;

      ctx.fillStyle = spec.color;
      ctx.strokeStyle = '#5c2415';
      ctx.lineWidth = 2;

      // Seat block (bottom in world = +y in screen!)
      roundRect(ctx, -hw, hh - sh, pxW, sh, 6);
      ctx.fill();
      ctx.stroke();

      // Backrest block (left -x, rising upward -y in screen!)
      roundRect(ctx, -hw, -hh, bw, pxH - sh + 5, 6);
      ctx.fill();
      ctx.stroke();

      // Plush seat cushion highlight
      ctx.fillStyle = '#e08265';
      roundRect(ctx, -hw + bw - 2, hh - sh + 3, pxW - bw - 3, sh * 0.45, 4);
      ctx.fill();

      // Stitch buttons
      ctx.fillStyle = spec.accent;
      ctx.beginPath();
      ctx.arc(-hw + bw * 0.5, -hh + (pxH - sh) * 0.45, 3, 0, Math.PI * 2);
      ctx.fill();

      // Wooden feet
      ctx.fillStyle = '#4a2c18';
      ctx.fillRect(-hw + 5, hh - 4, 7, 4);
      ctx.fillRect(hw - 12, hh - 4, 7, 4);
    } else if (spec.shape === 'plant') {
      const potTopY = hh - pxH * 0.42;
      const potBotW = pxW * 0.56;
      const potTopW = pxW * 0.74;

      // Lush Monstera leaves above pot
      const leafColors = ['#246b43', '#2e8b57', '#43aa6b', '#27794b'];
      const leafAngles = [-0.55, -0.2, 0.22, 0.58, 0.0];
      leafAngles.forEach((la, i) => {
        ctx.save();
        ctx.translate(0, potTopY + 3);
        ctx.rotate(la);
        ctx.strokeStyle = '#1f5c39';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -pxH * 0.46);
        ctx.stroke();

        ctx.fillStyle = leafColors[i % leafColors.length];
        ctx.beginPath();
        ctx.ellipse(0, -pxH * 0.36, pxW * 0.21, pxH * 0.19, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      // Terracotta pot
      ctx.fillStyle = spec.accent;
      ctx.strokeStyle = '#73381b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-potTopW / 2, potTopY);
      ctx.lineTo(potTopW / 2, potTopY);
      ctx.lineTo(potBotW / 2, hh);
      ctx.lineTo(-potBotW / 2, hh);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Pot rim
      ctx.fillStyle = '#d47c50';
      roundRect(ctx, -potTopW / 2 - 2, potTopY - 4, potTopW + 4, 7, 2);
      ctx.fill();
      ctx.stroke();
    } else if (spec.shape === 'vase') {
      // Heirloom antique porcelain vase
      ctx.fillStyle = spec.color;
      ctx.strokeStyle = '#1b2b44';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.52, -hh);
      ctx.lineTo(hw * 0.52, -hh);
      ctx.quadraticCurveTo(hw * 0.35, -hh * 0.62, hw * 0.94, -hh * 0.1);
      ctx.quadraticCurveTo(hw * 1.0, hh * 0.45, hw * 0.58, hh);
      ctx.lineTo(-hw * 0.58, hh);
      ctx.quadraticCurveTo(-hw * 1.0, hh * 0.45, -hw * 0.94, -hh * 0.1);
      ctx.quadraticCurveTo(-hw * 0.35, -hh * 0.62, -hw * 0.52, -hh);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gold decorative bands & medallion
      ctx.strokeStyle = spec.accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.5, -hh + 4);
      ctx.lineTo(hw * 0.5, -hh + 4);
      ctx.moveTo(-hw * 0.85, 0);
      ctx.lineTo(hw * 0.85, 0);
      ctx.stroke();

      ctx.fillStyle = spec.accent;
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(pxW, pxH) * 0.16, 0, Math.PI * 2);
      ctx.fill();

      // Gloss highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-hw * 0.25, -hh * 0.05, pxH * 0.22, Math.PI * 0.8, Math.PI * 1.3);
      ctx.stroke();
    } else if (spec.id === 'fridge') {
      roundRect(ctx, -hw, -hh, pxW, pxH, 5);
      ctx.fillStyle = spec.color;
      ctx.fill();
      ctx.strokeStyle = '#526773';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Freezer / fridge divider line
      const splitY = -hh + pxH * 0.36;
      ctx.beginPath();
      ctx.moveTo(-hw + 2, splitY);
      ctx.lineTo(hw - 2, splitY);
      ctx.stroke();

      // Handles
      ctx.fillStyle = '#7b929e';
      roundRect(ctx, hw - 9, splitY - 18, 4, 14, 2);
      ctx.fill();
      roundRect(ctx, hw - 9, splitY + 6, 4, 22, 2);
      ctx.fill();

      // Magnet note
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(-hw + 8, -hh + 10, 8, 6);
    } else if (spec.id === 'washer') {
      roundRect(ctx, -hw, -hh, pxW, pxH, 5);
      ctx.fillStyle = spec.color;
      ctx.fill();
      ctx.strokeStyle = '#4e5d6c';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Top control panel
      ctx.fillStyle = '#dde3ea';
      ctx.fillRect(-hw + 2, -hh + 2, pxW - 4, pxH * 0.2);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(hw - 16, -hh + 5, 10, 5);

      // Drum window
      const r = Math.min(pxW, pxH) * 0.29;
      ctx.beginPath();
      ctx.arc(0, pxH * 0.08, r, 0, Math.PI * 2);
      ctx.fillStyle = '#3a506b';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, pxH * 0.08, r * 0.74, 0, Math.PI * 2);
      ctx.fillStyle = '#7ec8e3';
      ctx.fill();
    } else if (spec.id === 'tv') {
      // Outer bezel
      roundRect(ctx, -hw, -hh, pxW, pxH, 4);
      ctx.fillStyle = '#1e242b';
      ctx.fill();
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Screen panel
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-hw + 4, -hh + 4, pxW - 8, pxH - 8);

      // Glossy reflection stripe
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath();
      ctx.moveTo(-hw + 8, -hh + 4);
      ctx.lineTo(-hw + 24, -hh + 4);
      ctx.lineTo(-hw + 8, hh - 4);
      ctx.closePath();
      ctx.fill();

      // Protective styrofoam corner pads!
      ctx.fillStyle = '#f8fafc';
      const pad = 7;
      ctx.fillRect(-hw - 1, -hh - 1, pad, pad);
      ctx.fillRect(hw - pad + 1, -hh - 1, pad, pad);
      ctx.fillRect(-hw - 1, hh - pad + 1, pad, pad);
      ctx.fillRect(hw - pad + 1, hh - pad + 1, pad, pad);

      // Fragile TV label
      if (pxW > 42) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-16, -6, 32, 12);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('液晶注意', 0, 0);
      }
    } else if (spec.id === 'futon') {
      roundRect(ctx, -hw, -hh, pxW, pxH, Math.min(12, hh * 0.75));
      ctx.fillStyle = spec.color;
      ctx.fill();
      ctx.strokeStyle = '#26547c';
      ctx.lineWidth = 2;
      ctx.stroke();

      // White tie straps around futon bag
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(-pxW * 0.24, -hh + 1, 5, pxH - 2);
      ctx.fillRect(pxW * 0.24 - 5, -hh + 1, 5, pxH - 2);

      // Soft quilted wave
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-hw + 8, 0);
      ctx.lineTo(hw - 8, 0);
      ctx.stroke();
    } else if (spec.id === 'chest') {
      roundRect(ctx, -hw, -hh, pxW, pxH, 3);
      ctx.fillStyle = spec.color;
      ctx.fill();
      ctx.strokeStyle = spec.accent;
      ctx.lineWidth = 2;
      ctx.stroke();

      // 3 drawers with brass handles
      const dh = (pxH - 8) / 3;
      for (let i = 0; i < 3; i++) {
        const dy = -hh + 4 + i * dh;
        ctx.strokeStyle = spec.accent;
        ctx.strokeRect(-hw + 4, dy + 1, pxW - 8, dh - 2);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(-10, dy + dh * 0.42, 6, 3);
        ctx.fillRect(4, dy + dh * 0.42, 6, 3);
      }
    } else if (spec.id === 'microwave') {
      roundRect(ctx, -hw, -hh, pxW, pxH, 4);
      ctx.fillStyle = spec.color;
      ctx.fill();
      ctx.strokeStyle = '#7f5539';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Crimson retro stripe & dark oven window
      ctx.fillStyle = '#1f2937';
      roundRect(ctx, -hw + 4, -hh + 4, pxW * 0.64, pxH - 8, 3);
      ctx.fill();

      ctx.fillStyle = spec.accent;
      ctx.fillRect(hw - pxW * 0.26, -hh + 4, pxW * 0.20, 6);
      ctx.beginPath();
      ctx.arc(hw - pxW * 0.16, 3, 3.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Cardboard boxes (box_l / box_fragile)
      roundRect(ctx, -hw, -hh, pxW, pxH, 3);
      ctx.fillStyle = spec.color;
      ctx.fill();
      ctx.strokeStyle = '#7c5329';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Top packing tape
      ctx.fillStyle = '#e5c07b';
      ctx.fillRect(-hw + 2, -hh + 1, pxW - 4, 5);
      ctx.fillRect(-4, -hh + 1, 8, pxH * 0.34);

      if (spec.id === 'box_fragile') {
        // Red fragile sticker
        ctx.fillStyle = '#dc2626';
        roundRect(ctx, -hw * 0.72, -3, pxW * 0.72, 12, 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ワレモノ', 0, 3);
      } else {
        ctx.strokeStyle = '#9a6b3b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-hw * 0.55, -2, pxW * 0.55, 10);
      }
    }

    // Damage cracks / scuffs when HP drops!
    if (hpRatio < 0.92 && !opts.cleanIcon) {
      const sev = 1 - hpRatio;
      ctx.strokeStyle = spec.id === 'tv' ? '#7dd3fc' : 'rgba(30, 15, 10, 0.78)';
      ctx.lineWidth = 1.6 + sev * 1.2;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.4, -hh * 0.35);
      ctx.lineTo(-hw * 0.05, 0);
      ctx.lineTo(-hw * 0.25, hh * 0.3);
      if (sev > 0.32) {
        ctx.moveTo(hw * 0.35, -hh * 0.25);
        ctx.lineTo(0, 0);
        ctx.lineTo(hw * 0.28, hh * 0.38);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  class WorldRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.logicalWidth = 1280;
      this.logicalHeight = 720;
      this.ppm = 78; // Pixels per meter
      this.camX = 2.2;
      this.camY = 1.25;
      this.targetCamX = 2.2;
      this.targetCamY = 1.25;
      this.shakeTime = 0;
      this.shakeMag = 0;
      this.particles = [];
      this.popups = [];
      this.driverMood = 'normal'; // normal | effort | panic | happy
      this.driverMoodTimer = 0;
    }

    resize() {
      const dpr = Math.min(2, root.devicePixelRatio || 1);
      const rect = this.canvas.getBoundingClientRect();
      const w = Math.max(640, Math.round(rect.width || 1280));
      const h = Math.max(360, Math.round(rect.height || 720));
      if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
        this.canvas.width = Math.round(w * dpr);
        this.canvas.height = Math.round(h * dpr);
      }
      this.logicalWidth = w;
      this.logicalHeight = h;
      this.dpr = dpr;
      // Scale PPM smoothly with viewport height so framing matches everywhere
      this.ppm = Math.max(54, Math.min(96, (h / 720) * 82));
    }

    worldToScreen(wx, wy) {
      const cx = this.logicalWidth * (this.mode === 'LOADING' ? 0.47 : 0.34);
      const cy = this.logicalHeight * (this.mode === 'LOADING' ? 0.60 : 0.64);
      return {
        x: cx + (wx - this.camX) * this.ppm,
        y: cy - (wy - this.camY) * this.ppm
      };
    }

    screenToWorld(sx, sy) {
      const cx = this.logicalWidth * (this.mode === 'LOADING' ? 0.47 : 0.34);
      const cy = this.logicalHeight * (this.mode === 'LOADING' ? 0.60 : 0.64);
      return {
        x: this.camX + (sx - cx) / this.ppm,
        y: this.camY - (sy - cy) / this.ppm
      };
    }

    triggerShake(mag, duration) {
      this.shakeMag = Math.max(this.shakeMag, mag || 6);
      this.shakeTime = Math.max(this.shakeTime, duration || 0.25);
    }

    setDriverMood(mood, duration) {
      this.driverMood = mood;
      this.driverMoodTimer = duration || 1.2;
    }

    addPopup(worldX, worldY, text, color, scale) {
      this.popups.push({
        wx: worldX,
        wy: worldY,
        vy: 1.1,
        text,
        color: color || '#ffffff',
        scale: scale || 1.0,
        life: 1.35,
        maxLife: 1.35
      });
    }

    spawnBurst(worldX, worldY, color, count) {
      const n = count || 10;
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 1.2 + Math.random() * 3.8;
        this.particles.push({
          wx: worldX,
          wy: worldY,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd + 1.5,
          r: 2.5 + Math.random() * 3.5,
          color: color || '#fde047',
          life: 0.55 + Math.random() * 0.35,
          maxLife: 0.85,
          gravity: 7.5
        });
      }
    }

    spawnExhaust(worldX, worldY) {
      this.particles.push({
        wx: worldX,
        wy: worldY,
        vx: -1.4 - Math.random() * 1.1,
        vy: 0.4 + Math.random() * 0.6,
        r: 4 + Math.random() * 4,
        color: 'rgba(226, 232, 240, 0.55)',
        life: 0.45,
        maxLife: 0.45,
        gravity: -1.2
      });
    }

    updateEffects(dt, sim, mode) {
      this.mode = mode;

      if (this.driverMoodTimer > 0) {
        this.driverMoodTimer -= dt;
        if (this.driverMoodTimer <= 0 && mode !== 'GOAL') {
          this.driverMood = 'normal';
        }
      }

      if (sim && sim.truck) {
        const tpos = sim.truck.chassis.getPosition();
        const tvel = sim.truck.chassis.getLinearVelocity();

        if (mode === 'LOADING') {
          this.ppm = Math.max(66, Math.min(112, (this.logicalHeight / 720) * 98));
          this.targetCamX = tpos.x - 0.15;
          this.targetCamY = tpos.y + 0.68;
        } else {
          this.ppm = Math.max(52, Math.min(88, (this.logicalHeight / 720) * 74));
          const lookAhead = Math.max(0, Math.min(3.4, tvel.x * 0.32));
          this.targetCamX = tpos.x + 1.4 + lookAhead;
          this.targetCamY = tpos.y + 0.75;
        }

        const lerp = Math.min(1, dt * 7.5);
        this.camX += (this.targetCamX - this.camX) * lerp;
        this.camY += (this.targetCamY - this.camY) * lerp;

        // Spawn gentle exhaust puffs when accelerating
        if (mode === 'DRIVING' && sim.controls.throttle > 0.2 && Math.random() < 0.35) {
          const tailPipe = sim.truck.chassis.getWorldPoint(sim.pl.Vec2(-1.25, -0.14));
          this.spawnExhaust(tailPipe.x, tailPipe.y);
        }
      }

      if (this.shakeTime > 0) {
        this.shakeTime = Math.max(0, this.shakeTime - dt);
      } else {
        this.shakeMag = 0;
      }

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        p.vy -= p.gravity * dt;
        p.wx += p.vx * dt;
        p.wy += p.vy * dt;
      }

      for (let i = this.popups.length - 1; i >= 0; i--) {
        const pop = this.popups[i];
        pop.life -= dt;
        if (pop.life <= 0) {
          this.popups.splice(i, 1);
          continue;
        }
        pop.wy += pop.vy * dt;
        pop.vy *= 0.96;
      }
    }

    render(sim, uiState) {
      this.resize();
      const ctx = this.ctx;
      const w = this.logicalWidth;
      const h = this.logicalHeight;
      const stage = sim.stage;
      const theme = THEMES[stage.theme] || THEMES.spring_town;

      ctx.save();
      ctx.scale(this.dpr, this.dpr);

      // Screen shake
      if (this.shakeTime > 0 && this.shakeMag > 0) {
        const sx = (Math.random() * 2 - 1) * this.shakeMag * (this.shakeTime / 0.3);
        const sy = (Math.random() * 2 - 1) * this.shakeMag * (this.shakeTime / 0.3);
        ctx.translate(sx, sy);
      }

      // 1. Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, theme.skyTop);
      skyGrad.addColorStop(0.58, theme.skyMid);
      skyGrad.addColorStop(1, theme.skyBot);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(-20, -20, w + 40, h + 40);

      // Sun
      ctx.fillStyle = theme.sunColor;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(w * 0.78, h * 0.18, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // 2. Parallax Mountains & Mt. Fuji
      this._drawParallaxBackdrop(ctx, w, h, theme);

      // 3. Roadside Background Props (Utility poles, Start Depot, Signs, Goal House!)
      this._drawWorldScenery(ctx, sim, theme);

      // 4. Terrain & Road Cross-Section
      this._drawTerrain(ctx, sim, theme);

      // 5. Loading Zone Frame & Guides (in LOADING phase)
      if (this.mode === 'LOADING') {
        this._drawLoadingGuide(ctx, sim, uiState);
      }

      // 6. Kei-Truck (Underbody + Wheels + Suspension Springs + Cab + Driver!)
      this._drawTruckUnderbodyAndCab(ctx, sim);

      // 7. Cargo Items on Truck & Ground
      this._drawCargoItems(ctx, sim, uiState);

      // 8. Truck Foreground Rim (Bed side panel strip, Tailgate & Torii frame accents, Rope Hooks)
      this._drawTruckForegroundAccents(ctx, sim, uiState);

      // 9. Tie-Down Ropes (荷締めロープ)
      this._drawRopes(ctx, sim, uiState);

      // 10. Drag Ghost Preview (when player is dragging cargo in LOADING)
      if (this.mode === 'LOADING' && uiState && uiState.dragGhost) {
        this._drawDragGhost(ctx, uiState.dragGhost);
      }

      // 11. Center-of-Gravity Reticle (in LOADING)
      if (this.mode === 'LOADING') {
        this._drawCogIndicator(ctx, sim);
      }

      // 12. Particles & Floating Popups
      this._drawParticlesAndPopups(ctx);

      ctx.restore();
    }

    _drawParallaxBackdrop(ctx, w, h, theme) {
      // Soft clouds
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      const cloudShift = (this.camX * 8) % (w + 300);
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 290 - cloudShift + w * 2) % (w + 280)) - 120;
        const cy = 65 + (i % 3) * 38;
        ctx.beginPath();
        ctx.arc(cx, cy, 26, 0, Math.PI * 2);
        ctx.arc(cx + 24, cy - 6, 32, 0, Math.PI * 2);
        ctx.arc(cx + 52, cy + 2, 24, 0, Math.PI * 2);
        ctx.fill();
      }

      // Distant Mt. Fuji silhouette
      const fujiX = w * 0.66 - this.camX * 2.2;
      const fujiBaseY = h * 0.68;
      ctx.fillStyle = theme.mountainFar;
      ctx.beginPath();
      ctx.moveTo(fujiX - 240, fujiBaseY);
      ctx.quadraticCurveTo(fujiX - 65, fujiBaseY - 45, fujiX - 26, fujiBaseY - 155);
      ctx.lineTo(fujiX + 26, fujiBaseY - 155);
      ctx.quadraticCurveTo(fujiX + 65, fujiBaseY - 45, fujiX + 240, fujiBaseY);
      ctx.closePath();
      ctx.fill();

      // Snow cap on Fuji
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.beginPath();
      ctx.moveTo(fujiX - 26, fujiBaseY - 155);
      ctx.lineTo(fujiX + 26, fujiBaseY - 155);
      ctx.lineTo(fujiX + 48, fujiBaseY - 112);
      ctx.lineTo(fujiX + 16, fujiBaseY - 122);
      ctx.lineTo(fujiX, fujiBaseY - 108);
      ctx.lineTo(fujiX - 18, fujiBaseY - 122);
      ctx.lineTo(fujiX - 48, fujiBaseY - 112);
      ctx.closePath();
      ctx.fill();

      // Rolling near hills
      ctx.fillStyle = theme.mountainNear;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let sx = 0; sx <= w + 60; sx += 60) {
        const wx = sx + this.camX * 14;
        const hy = h * 0.66 - Math.sin(wx * 0.0045) * 34 - Math.cos(wx * 0.011) * 18;
        ctx.lineTo(sx, hy);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }

    _drawWorldScenery(ctx, sim, theme) {
      const stage = sim.stage;
      const minWX = this.screenToWorld(-120, 0).x;
      const maxWX = this.screenToWorld(this.logicalWidth + 120, 0).x;

      // Utility poles & overhead wires every 20m
      const firstPole = Math.floor(minWX / 20) * 20;
      let prevTop = null;
      for (let px = firstPole; px <= maxWX + 20; px += 20) {
        if (px < -6) continue;
        const gy = sim.getTerrainYAt(px);
        const base = this.worldToScreen(px, gy);
        const top = this.worldToScreen(px, gy + 4.2);

        // Concrete pole
        ctx.fillStyle = '#7b838c';
        ctx.fillRect(base.x - 3.5, top.y, 7, base.y - top.y);
        ctx.fillStyle = '#5c646d';
        ctx.fillRect(base.x - 14, top.y + 12, 28, 4);

        if (prevTop) {
          ctx.strokeStyle = 'rgba(30, 41, 59, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(prevTop.x, prevTop.y + 13);
          ctx.quadraticCurveTo((prevTop.x + top.x) / 2, Math.max(prevTop.y, top.y) + 34, top.x, top.y + 13);
          ctx.stroke();
        }
        prevTop = top;

        // Trees & vending machines between poles
        const treeX = px + 9;
        if (treeX > 6 && treeX < stage.goalX - 5) {
          const tgy = sim.getTerrainYAt(treeX);
          const tb = this.worldToScreen(treeX, tgy);
          ctx.fillStyle = '#6d4c3d';
          ctx.fillRect(tb.x - 4, tb.y - 44, 8, 44);
          ctx.fillStyle = px % 40 === 0 ? theme.treeColor : theme.treeAlt;
          ctx.beginPath();
          ctx.arc(tb.x, tb.y - 54, 22, 0, Math.PI * 2);
          ctx.arc(tb.x - 15, tb.y - 44, 16, 0, Math.PI * 2);
          ctx.arc(tb.x + 15, tb.y - 44, 16, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Start Moving Depot Building at x = -4.2m
      if (minWX < 5) {
        const dgy = sim.getTerrainYAt(-3.5);
        const dp = this.worldToScreen(-4.8, dgy);
        const scale = this.ppm / 78;
        ctx.save();
        ctx.translate(dp.x, dp.y);
        ctx.scale(scale, scale);

        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#1e3a5f';
        ctx.lineWidth = 3;
        ctx.fillRect(-95, -155, 190, 155);
        ctx.strokeRect(-95, -155, 190, 155);

        // Awning header
        ctx.fillStyle = '#183153';
        ctx.fillRect(-102, -168, 204, 34);
        ctx.fillStyle = '#ffd12e';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🚚 限界引越センター', 0, -146);

        // Rolling shutter door
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-62, -102, 124, 102);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        for (let sy = -94; sy < 0; sy += 12) {
          ctx.beginPath();
          ctx.moveTo(-62, sy);
          ctx.lineTo(62, sy);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Road Warning Signs
      for (const sign of stage.signs) {
        if (sign.x < minWX - 5 || sign.x > maxWX + 5) continue;
        const gy = sim.getTerrainYAt(sign.x);
        const sp = this.worldToScreen(sign.x, gy);
        const sc = this.ppm / 78;

        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.scale(sc, sc);

        // Sign post
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.fillRect(-3, -108, 6, 108);

        // Yellow diamond warning board
        ctx.save();
        ctx.translate(0, -124);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 3;
        roundRect(ctx, -23, -23, 46, 46, 4);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#111827';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(sign.label, 0, -121);

        // Sub-plate
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.8;
        roundRect(ctx, -38, -94, 76, 19, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#dc2626';
        ctx.font = 'bold 9.5px sans-serif';
        ctx.fillText(sign.sub, 0, -81);

        ctx.restore();
      }

      // Railroad crossing gate & bridge railings
      for (const seg of stage.segments) {
        if (seg.xEnd < minWX - 8 || seg.xStart > maxWX + 8) continue;
        if (seg.type === 'railroad') {
          const mid = (seg.xStart + seg.xEnd) * 0.5;
          const gy = sim.getTerrainYAt(mid);
          const rp = this.worldToScreen(mid - 1.5, gy);
          const sc = this.ppm / 78;
          ctx.save();
          ctx.translate(rp.x, rp.y);
          ctx.scale(sc, sc);
          // Yellow/black striped pole
          for (let y = 0; y < 120; y += 15) {
            ctx.fillStyle = (y / 15) % 2 === 0 ? '#facc15' : '#111827';
            ctx.fillRect(-4, -y - 15, 8, 15);
          }
          // Crossbuck X
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(-18, -135);
          ctx.lineTo(18, -105);
          ctx.moveTo(18, -135);
          ctx.lineTo(-18, -105);
          ctx.stroke();
          // Blinking warning lamps
          const blink = Math.floor(sim.time * 4) % 2 === 0;
          ctx.fillStyle = blink ? '#ef4444' : '#450a0a';
          ctx.beginPath();
          ctx.arc(-12, -92, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = !blink ? '#ef4444' : '#450a0a';
          ctx.beginPath();
          ctx.arc(12, -92, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (seg.type === 'bridge') {
          ctx.strokeStyle = stage.id === 3 ? '#c83e2b' : '#8d5b3c';
          ctx.lineWidth = 4;
          ctx.beginPath();
          for (let i = 0; i <= 12; i++) {
            const wx = seg.xStart + ((seg.xEnd - seg.xStart) * i) / 12;
            const wy = sim.getTerrainYAt(wx) + 0.65;
            const p = this.worldToScreen(wx, wy);
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);

            const pBot = this.worldToScreen(wx, wy - 0.65);
            ctx.fillStyle = stage.id === 3 ? '#a62c1c' : '#6f452b';
            ctx.fillRect(p.x - 2.5, p.y, 5, pBot.y - p.y);
          }
          ctx.stroke();
        }
      }

      // GOAL Arch & New House at stage.goalX!
      if (maxWX > stage.goalX - 10) {
        const ggy = sim.getTerrainYAt(stage.goalX + 3.5);
        const houseP = this.worldToScreen(stage.goalX + 4.8, ggy);
        const gateP = this.worldToScreen(stage.goalX, sim.getTerrainYAt(stage.goalX));
        const sc = this.ppm / 78;

        // Client's New Residence
        ctx.save();
        ctx.translate(houseP.x, houseP.y);
        ctx.scale(sc, sc);

        ctx.fillStyle = stage.id === 3 ? '#f3ead8' : '#fffbeb';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        ctx.fillRect(-10, -155, 195, 155);
        ctx.strokeRect(-10, -155, 195, 155);

        // Roof
        ctx.fillStyle = stage.id === 3 ? '#2d3748' : '#dc2626';
        ctx.beginPath();
        ctx.moveTo(-26, -155);
        ctx.lineTo(88, -215);
        ctx.lineTo(202, -155);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Entrance & windows
        ctx.fillStyle = '#7c4a2d';
        ctx.fillRect(22, -78, 44, 78);
        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(96, -125, 62, 46);
        ctx.strokeRect(96, -125, 62, 46);
        ctx.restore();

        // Checkered GOAL Arch Banner right at goalX
        ctx.save();
        ctx.translate(gateP.x, gateP.y);
        ctx.scale(sc, sc);
        ctx.fillStyle = '#e11d48';
        ctx.fillRect(-5, -210, 10, 210);
        roundRect(ctx, -68, -238, 136, 40, 8);
        ctx.fillStyle = '#183153';
        ctx.fill();
        ctx.strokeStyle = '#ffd12e';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#ffd12e';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏁 GOAL 新居到着', 0, -213);
        ctx.restore();
      }
    }

    _drawTerrain(ctx, sim, theme) {
      const pts = sim.stage.terrain;
      const w = this.logicalWidth;
      const h = this.logicalHeight;
      const minWX = this.screenToWorld(-60, 0).x;
      const maxWX = this.screenToWorld(w + 60, 0).x;

      let firstIdx = 0;
      while (firstIdx < pts.length - 1 && pts[firstIdx + 1].x < minWX - 4) {
        firstIdx++;
      }
      let lastIdx = pts.length - 1;
      while (lastIdx > firstIdx && pts[lastIdx - 1].x > maxWX + 4) {
        lastIdx--;
      }
      const visible = pts.slice(firstIdx, lastIdx + 1);
      if (visible.length < 2) return;

      // Deep earth fill
      ctx.beginPath();
      const firstS = this.worldToScreen(visible[0].x, visible[0].y);
      ctx.moveTo(firstS.x, h + 40);
      ctx.lineTo(firstS.x, firstS.y);
      for (let i = 1; i < visible.length; i++) {
        const sp = this.worldToScreen(visible[i].x, visible[i].y);
        ctx.lineTo(sp.x, sp.y);
      }
      const lastS = this.worldToScreen(visible[visible.length - 1].x, visible[visible.length - 1].y);
      ctx.lineTo(lastS.x, h + 40);
      ctx.closePath();
      ctx.fillStyle = theme.earth;
      ctx.fill();

      // Grass shoulder band
      ctx.beginPath();
      for (let i = 0; i < visible.length; i++) {
        const sp = this.worldToScreen(visible[i].x, visible[i].y);
        if (i === 0) ctx.moveTo(sp.x, sp.y + 10);
        else ctx.lineTo(sp.x, sp.y + 10);
      }
      ctx.strokeStyle = theme.grassTop;
      ctx.lineWidth = 14;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Asphalt surface stroke
      ctx.beginPath();
      for (let i = 0; i < visible.length; i++) {
        const sp = this.worldToScreen(visible[i].x, visible[i].y);
        if (i === 0) ctx.moveTo(sp.x, sp.y + 3);
        else ctx.lineTo(sp.x, sp.y + 3);
      }
      ctx.strokeStyle = theme.asphalt;
      ctx.lineWidth = 12;
      ctx.stroke();

      // Crisp road top edge & specialized obstacle highlights
      for (let i = 0; i < visible.length - 1; i++) {
        const p0 = visible[i];
        const p1 = visible[i + 1];
        const s0 = this.worldToScreen(p0.x, p0.y);
        const s1 = this.worldToScreen(p1.x, p1.y);
        const surf = p1.surface || p0.surface || 'asphalt';

        ctx.beginPath();
        ctx.moveTo(s0.x, s0.y);
        ctx.lineTo(s1.x, s1.y);
        if (surf === 'bump') {
          ctx.strokeStyle = i % 2 === 0 ? '#facc15' : '#1f2937';
          ctx.lineWidth = 5;
        } else if (surf === 'steel') {
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = 5;
        } else if (surf === 'wood') {
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 5;
        } else if (surf === 'cobble') {
          ctx.strokeStyle = '#9ca3af';
          ctx.lineWidth = 4.5;
        } else {
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 2.5;
        }
        ctx.stroke();
      }
    }

    _drawLoadingGuide(ctx, sim, uiState) {
      const chassis = sim.truck.chassis;
      const pl = sim.pl;
      const spec = root.GamePhysics.TRUCK_SPEC;

      const corners = [
        chassis.getWorldPoint(pl.Vec2(spec.bedInnerMinX, spec.bedTopY)),
        chassis.getWorldPoint(pl.Vec2(spec.bedInnerMaxX, spec.bedTopY)),
        chassis.getWorldPoint(pl.Vec2(spec.bedInnerMaxX, 2.05)),
        chassis.getWorldPoint(pl.Vec2(spec.bedInnerMinX, 2.05))
      ].map((w) => this.worldToScreen(w.x, w.y));

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      ctx.lineTo(corners[1].x, corners[1].y);
      ctx.lineTo(corners[2].x, corners[2].y);
      ctx.lineTo(corners[3].x, corners[3].y);
      ctx.closePath();

      ctx.fillStyle = uiState && uiState.ropeMode ? 'rgba(250, 204, 21, 0.08)' : 'rgba(56, 189, 248, 0.07)';
      ctx.fill();
      ctx.setLineDash([7, 6]);
      ctx.strokeStyle = uiState && uiState.ropeMode ? 'rgba(250, 204, 21, 0.75)' : 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      // Helpful subtle label at top of loading zone
      ctx.fillStyle = 'rgba(24, 49, 83, 0.82)';
      const topMidX = (corners[2].x + corners[3].x) / 2;
      const topMidY = (corners[2].y + corners[3].y) / 2 - 14;
      roundRect(ctx, topMidX - 88, topMidY - 11, 176, 22, 11);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        uiState && uiState.ropeMode ? '🪢 黄色いフックを2つクリック！' : '📦 この枠内にドラッグして積載',
        topMidX,
        topMidY
      );
      ctx.restore();
    }

    _drawTruckUnderbodyAndCab(ctx, sim) {
      const chassis = sim.truck.chassis;
      const pos = chassis.getPosition();
      const ang = chassis.getAngle();
      const sp = this.worldToScreen(pos.x, pos.y);
      const ppm = this.ppm;
      const pl = sim.pl;
      const TSPEC = root.GamePhysics.TRUCK_SPEC;

      // 1. Draw visible suspension coil springs between axle mounts and wheels!
      const drawSpring = (mountLX, wheelBody) => {
        const mWorld = chassis.getWorldPoint(pl.Vec2(mountLX, -0.05));
        const wWorld = wheelBody.getPosition();
        const ms = this.worldToScreen(mWorld.x, mWorld.y);
        const ws = this.worldToScreen(wWorld.x, wWorld.y);

        ctx.save();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(ms.x, ms.y);
        ctx.lineTo(ws.x, ws.y);
        ctx.stroke();

        // Zig-zag coil spring
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const coils = 5;
        for (let i = 0; i <= coils; i++) {
          const t = i / coils;
          const bx = ms.x + (ws.x - ms.x) * t;
          const by = ms.y + (ws.y - ms.y) * t;
          const off = i === 0 || i === coils ? 0 : (i % 2 === 0 ? -6 : 6);
          if (i === 0) ctx.moveTo(bx, by);
          else ctx.lineTo(bx + off, by);
        }
        ctx.stroke();
        ctx.restore();
      };

      drawSpring(TSPEC.rearWheelX, sim.truck.rearWheel);
      drawSpring(TSPEC.frontWheelX, sim.truck.frontWheel);

      // 2. Draw Truck Chassis & Cab in local chassis space
      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(-ang); // Y-up world angle -> Y-down canvas rotation

      // Dark steel underframe rail
      ctx.fillStyle = '#1e293b';
      roundRect(ctx, -1.36 * ppm, -0.02 * ppm, 3.08 * ppm, 0.18 * ppm, 4);
      ctx.fill();

      // Rear mudflap & taillight housing
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-1.38 * ppm, 0.04 * ppm, 0.08 * ppm, 0.24 * ppm);

      // Brake / Reverse taillight
      const braking = sim.controls.brake > 0 || sim.controls.handbrake || sim.phase === 'GOAL';
      const reversing = sim.controls.brake > 0 && chassis.getLinearVelocity().x < -0.1;
      ctx.fillStyle = reversing ? '#f8fafc' : braking ? '#ff2a2a' : '#991b1b';
      if (braking) {
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
      }
      ctx.fillRect(-1.41 * ppm, 0.03 * ppm, 0.05 * ppm, 0.10 * ppm);
      ctx.shadowBlur = 0;

      // Bed floor & corrugated inner bed wall hint
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      roundRect(ctx, -1.42 * ppm, -0.08 * ppm, 2.32 * ppm, 0.16 * ppm, 3);
      ctx.fill();
      ctx.stroke();

      // Torii cab guard frame (鳥居)
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#334155';
      ctx.fillRect(0.80 * ppm, -1.48 * ppm, 0.09 * ppm, 1.42 * ppm);
      ctx.strokeRect(0.80 * ppm, -1.48 * ppm, 0.09 * ppm, 1.42 * ppm);

      // Front Cab Silhouette (White Japanese Kei-Truck!)
      ctx.beginPath();
      ctx.moveTo(0.88 * ppm, 0.08 * ppm);
      ctx.lineTo(1.80 * ppm, 0.06 * ppm);
      ctx.lineTo(1.85 * ppm, -0.66 * ppm);
      ctx.lineTo(1.54 * ppm, -1.40 * ppm);
      ctx.lineTo(0.88 * ppm, -1.42 * ppm);
      ctx.closePath();
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Navy Moving Company Livery Stripe on Cab Door
      ctx.fillStyle = '#183153';
      ctx.beginPath();
      ctx.moveTo(0.90 * ppm, -0.44 * ppm);
      ctx.lineTo(1.82 * ppm, -0.44 * ppm);
      ctx.lineTo(1.81 * ppm, -0.22 * ppm);
      ctx.lineTo(0.90 * ppm, -0.22 * ppm);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffd12e';
      ctx.font = `bold ${Math.max(9, Math.round(0.13 * ppm))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('限界引越', 1.34 * ppm, -0.33 * ppm);

      // Cab Side Window
      ctx.beginPath();
      ctx.moveTo(0.98 * ppm, -0.66 * ppm);
      ctx.lineTo(1.74 * ppm, -0.66 * ppm);
      ctx.lineTo(1.49 * ppm, -1.30 * ppm);
      ctx.lineTo(0.98 * ppm, -1.30 * ppm);
      ctx.closePath();
      ctx.fillStyle = '#bae6fd';
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Driver Character inside Cab Window ("源さん" with twisted hachimaki headband!)
      this._drawDriverInCab(ctx, ppm);

      // Front Bumper & Round Kei Headlight
      ctx.fillStyle = '#334155';
      roundRect(ctx, 1.74 * ppm, -0.10 * ppm, 0.13 * ppm, 0.18 * ppm, 4);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(1.82 * ppm, -0.52 * ppm, 0.08 * ppm, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Yellow Kei License Plate!
      ctx.fillStyle = '#facc15';
      ctx.fillRect(1.80 * ppm, -0.25 * ppm, 0.06 * ppm, 0.12 * ppm);

      ctx.restore();

      // 3. Draw Rotating Wheels
      this._drawWheel(ctx, sim.truck.rearWheel, TSPEC.wheelRadius);
      this._drawWheel(ctx, sim.truck.frontWheel, TSPEC.wheelRadius);
    }

    _drawDriverInCab(ctx, ppm) {
      ctx.save();
      ctx.translate(1.28 * ppm, -0.92 * ppm);
      const r = 0.17 * ppm;

      // Navy uniform shoulders
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.arc(0, r * 1.45, r * 1.15, Math.PI, 0);
      ctx.fill();

      // Face
      ctx.fillStyle = '#fed7aa';
      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // White twisted headband (ねじり鉢巻)!
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.2;
      roundRect(ctx, -r * 1.05, -r * 0.78, r * 2.1, r * 0.42, 3);
      ctx.fill();
      ctx.stroke();

      // Expression based on driverMood
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.6;
      if (this.driverMood === 'panic') {
        // Wide O eyes & open mouth!
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(r * 0.35, -r * 0.05, r * 0.24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.arc(r * 0.40, -r * 0.05, r * 0.09, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.ellipse(r * 0.35, r * 0.45, r * 0.22, r * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();

        // Sweat drop
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(-r * 0.55, -r * 0.1, r * 0.18, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.driverMood === 'happy') {
        // Happy curved eye ^ ^
        ctx.beginPath();
        ctx.arc(r * 0.35, -r * 0.05, r * 0.2, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(r * 0.32, r * 0.32, r * 0.24, 0, Math.PI);
        ctx.stroke();
      } else {
        // Focused determined driver eye & grin
        ctx.beginPath();
        ctx.arc(r * 0.38, -r * 0.06, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(r * 0.15, r * 0.38);
        ctx.lineTo(r * 0.55, r * 0.32);
        ctx.stroke();
      }

      // Steering wheel hands
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(r * 1.45, r * 0.55);
      ctx.lineTo(r * 1.05, r * 1.35);
      ctx.stroke();

      ctx.restore();
    }

    _drawWheel(ctx, wheelBody, radius) {
      const wp = wheelBody.getPosition();
      const ang = wheelBody.getAngle();
      const sp = this.worldToScreen(wp.x, wp.y);
      const r = radius * this.ppm;

      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(-ang);

      // Tire rubber
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = '#1f2937';
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Tire tread notches
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (r * 0.78), Math.sin(a) * (r * 0.78));
        ctx.lineTo(Math.cos(a) * (r * 0.98), Math.sin(a) * (r * 0.98));
        ctx.stroke();
      }

      // Silver steel rim (鉄チンホイール)
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2);
      ctx.fillStyle = '#cbd5e1';
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 4 lug nuts so rotation is clearly visible!
      ctx.fillStyle = '#334155';
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (r * 0.30), Math.sin(a) * (r * 0.30), r * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = '#475569';
      ctx.fill();

      ctx.restore();
    }

    _drawCargoItems(ctx, sim, uiState) {
      const ppm = this.ppm;

      for (const item of sim.cargoItems) {
        if (!item.body || item.isDragging) continue;

        const wp = item.body.getPosition();
        const ang = item.body.getAngle();
        const sp = this.worldToScreen(wp.x, wp.y);
        const pxW = item.spec.width * ppm;
        const pxH = item.spec.height * ppm;
        const hpRatio = Math.max(0, item.hp / item.maxHp);

        ctx.save();
        if (item.dropped) {
          ctx.globalAlpha = 0.52;
        }
        ctx.translate(sp.x, sp.y);
        ctx.rotate(-ang);

        // Hover / selection highlight during LOADING
        const isHovered = uiState && uiState.hoveredCargoId === item.id;
        if (isHovered && this.mode === 'LOADING') {
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 16;
        }

        drawCargoArtwork(ctx, item.spec, pxW, pxH, hpRatio);
        ctx.shadowBlur = 0;

        // Warning glow if overloaded or tilted badly!
        if (!item.dropped && (item.overloaded || item.tiltedBadly)) {
          const pulse = 0.5 + 0.5 * Math.sin(sim.time * 10);
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.45 + 0.45 * pulse})`;
          ctx.lineWidth = 3.5;
          roundRect(ctx, -pxW / 2 - 3, -pxH / 2 - 3, pxW + 6, pxH + 6, 6);
          ctx.stroke();
        }

        ctx.restore();

        // Upright screen-space status badges (HP bar / Overload / Cushion shield)
        if (!item.dropped) {
          const topScreenY = sp.y - Math.max(pxW, pxH) * 0.48 - 10;

          if (this.mode === 'LOADING') {
            if (item.overloaded) {
              this._drawPillBadge(ctx, sp.x, topScreenY, '⚠ 重みで潰れ注意', '#dc2626', '#ffffff');
            } else if (item.tiltedBadly) {
              this._drawPillBadge(ctx, sp.x, topScreenY, '⚠ 天地無用！立てて', '#d97706', '#ffffff');
            } else if (item.spec.category === 'fragile' && (item._activeCushionBonus || 0) >= 0.25) {
              this._drawPillBadge(ctx, sp.x, topScreenY, '🛡 クッション保護OK', '#0284c7', '#ffffff');
            }
          } else if (hpRatio < 0.96) {
            // Compact HP bar above damaged items during driving
            const bw = 38;
            const bh = 6;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
            roundRect(ctx, sp.x - bw / 2 - 1, topScreenY - 4, bw + 2, bh + 2, 3);
            ctx.fill();
            ctx.fillStyle = hpRatio > 0.65 ? '#facc15' : hpRatio > 0.25 ? '#f97316' : '#ef4444';
            roundRect(ctx, sp.x - bw / 2, topScreenY - 3, bw * hpRatio, bh, 2);
            ctx.fill();
          }
        }
      }
    }

    _drawPillBadge(ctx, x, y, text, bg, fg) {
      ctx.save();
      ctx.font = 'bold 10.5px sans-serif';
      const tw = ctx.measureText(text).width + 12;
      ctx.fillStyle = bg;
      roundRect(ctx, x - tw / 2, y - 9, tw, 18, 9);
      ctx.fill();
      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    _drawTruckForegroundAccents(ctx, sim, uiState) {
      const chassis = sim.truck.chassis;
      const pos = chassis.getPosition();
      const ang = chassis.getAngle();
      const sp = this.worldToScreen(pos.x, pos.y);
      const ppm = this.ppm;
      const TSPEC = root.GamePhysics.TRUCK_SPEC;

      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(-ang);

      // Rear Tailgate (後部あおり) drawn crisply in foreground so bed pocket reads clearly!
      const tgw = TSPEC.tailgateHalfW * 2 * ppm;
      const tgh = TSPEC.tailgateHalfH * 2 * ppm;
      const tgx = (TSPEC.tailgateX - TSPEC.tailgateHalfW) * ppm;
      const tgy = -(0.32 + TSPEC.tailgateHalfH) * ppm;

      ctx.fillStyle = '#f1f5f9';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.2;
      roundRect(ctx, tgx, tgy, tgw, tgh, 3);
      ctx.fill();
      ctx.stroke();

      // Subtle low side-rail trim along bed floor
      ctx.fillStyle = 'rgba(241, 245, 249, 0.88)';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.6;
      ctx.fillRect(-1.38 * ppm, -0.14 * ppm, 2.22 * ppm, 0.08 * ppm);
      ctx.strokeRect(-1.38 * ppm, -0.14 * ppm, 2.22 * ppm, 0.08 * ppm);

      // Latch handle on tailgate
      ctx.fillStyle = '#64748b';
      ctx.fillRect(tgx - 2, tgy + 6, tgw + 4, 5);

      ctx.restore();

      // Rope Anchor Hooks (highlighted when in LOADING / Rope Mode!)
      if (this.mode === 'LOADING') {
        const ropeMode = uiState && uiState.ropeMode;
        const selectedHook = uiState ? uiState.selectedHookId : null;

        for (const h of TSPEC.hooks) {
          const wp = sim.getHookWorldPoint(h.id);
          const hp = this.worldToScreen(wp.x, wp.y);
          const isSel = selectedHook === h.id;
          const r = ropeMode ? (isSel ? 11 : 9) : 5.5;

          ctx.save();
          if (ropeMode) {
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 12;
          }
          ctx.beginPath();
          ctx.arc(hp.x, hp.y, r, 0, Math.PI * 2);
          ctx.fillStyle = isSel ? '#ef4444' : ropeMode ? '#facc15' : '#eab308';
          ctx.fill();
          ctx.strokeStyle = '#111827';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.shadowBlur = 0;

          if (ropeMode) {
            ctx.fillStyle = '#111827';
            ctx.font = 'bold 9.5px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(h.name, hp.x, hp.y - 14);
          }
          ctx.restore();
        }
      }
    }

    _drawRopes(ctx, sim, uiState) {
      for (const rope of sim.ropes) {
        if (rope.snapped || !rope.points || rope.points.length < 2) continue;

        const screenPts = rope.points.map((p) => this.worldToScreen(p.x, p.y));
        const ratio = Math.min(1, rope.tension / rope.maxTension);

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Dark outer cord
        ctx.beginPath();
        screenPts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 6.5;
        ctx.stroke();

        // Striped yellow/orange/red tension core
        ctx.beginPath();
        screenPts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = ratio > 0.72 ? '#ef4444' : ratio > 0.38 ? '#fb923c' : '#facc15';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Preview rubber band line if first hook selected in Rope Mode
      if (this.mode === 'LOADING' && uiState && uiState.ropeMode && uiState.selectedHookId !== null && uiState.pointerWorld) {
        const wA = sim.getHookWorldPoint(uiState.selectedHookId);
        const sA = this.worldToScreen(wA.x, wA.y);
        const sB = this.worldToScreen(uiState.pointerWorld.x, uiState.pointerWorld.y);
        ctx.save();
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(sA.x, sA.y);
        ctx.lineTo(sB.x, sB.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    _drawDragGhost(ctx, ghost) {
      const sp = this.worldToScreen(ghost.wx, ghost.wy);
      const pxW = ghost.spec.width * this.ppm;
      const pxH = ghost.spec.height * this.ppm;

      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(-ghost.angle);
      ctx.globalAlpha = 0.85;

      drawCargoArtwork(ctx, ghost.spec, pxW, pxH, 1.0, { cleanIcon: true });

      ctx.strokeStyle = ghost.valid ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 3.5;
      roundRect(ctx, -pxW / 2 - 4, -pxH / 2 - 4, pxW + 8, pxH + 8, 6);
      ctx.stroke();
      ctx.restore();

      if (!ghost.valid) {
        const msg = ghost.reason === 'out_of_zone' ? '荷台の枠内へ入れてください' : '他の荷物・車体と重なっています';
        this._drawPillBadge(ctx, sp.x, sp.y - Math.max(pxW, pxH) / 2 - 16, msg, '#dc2626', '#ffffff');
      }
    }

    _drawCogIndicator(ctx, sim) {
      const m = sim.computePackingMetrics();
      if (m.cargoMass <= 0) return;

      const sp = this.worldToScreen(m.cogWorld.x, m.cogWorld.y);
      const col = m.status === 'good' ? '#22c55e' : m.status === 'warn' ? '#f59e0b' : '#ef4444';

      ctx.save();
      ctx.translate(sp.x, sp.y);

      // Outer target ring
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.8;
      ctx.stroke();

      // Crosshair
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(16, 0);
      ctx.moveTo(0, -16);
      ctx.lineTo(0, 16);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    _drawParticlesAndPopups(ctx) {
      for (const p of this.particles) {
        const sp = this.worldToScreen(p.wx, p.wy);
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      for (const pop of this.popups) {
        const sp = this.worldToScreen(pop.wx, pop.wy);
        const alpha = Math.min(1, (pop.life / pop.maxLife) * 1.4);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `900 ${Math.round(16 * pop.scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#0f172a';
        ctx.strokeText(pop.text, sp.x, sp.y);
        ctx.fillStyle = pop.color;
        ctx.fillText(pop.text, sp.x, sp.y);
        ctx.restore();
      }
    }
  }

  /**
   * Renders a crisp cargo thumbnail onto a small <canvas> element for UI cards
   */
  function renderCargoThumbnail(canvas, typeId) {
    const spec = root.GameData.CARGO_TYPES[typeId];
    if (!spec || !canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const maxDim = Math.max(spec.width, spec.height);
    const scale = (Math.min(w, h) * 0.76) / maxDim;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    drawCargoArtwork(ctx, spec, spec.width * scale, spec.height * scale, 1.0, { cleanIcon: true });
    ctx.restore();
  }

  root.GameRenderer = {
    WorldRenderer,
    drawCargoArtwork,
    renderCargoThumbnail
  };
})(typeof window !== 'undefined' ? window : globalThis);
