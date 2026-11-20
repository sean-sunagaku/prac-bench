/* ==========================================================================
   app.js — High-DPI Canvas renderers, direct car interaction & live narration
   ========================================================================== */
(function () {
  'use strict';

  const { StraightHighwaySim, DominoChainSim, RingRoadSim } = window.TrafficSim;

  /* ------------------------------------------------------------------------
     Shared Color & Drawing Helpers
     ------------------------------------------------------------------------ */
  function speedToColor(kmh) {
    if (kmh >= 54) return '#10b981'; // Emerald (smooth)
    if (kmh >= 34) return '#f59e0b'; // Amber (slowing)
    return '#ef4444'; // Crimson (jammed)
  }

  function speedToTraceColor(kmh) {
    if (kmh >= 54) return 'rgba(16, 185, 129, 0.72)';
    if (kmh >= 34) return 'rgba(245, 158, 11, 0.85)';
    return 'rgba(239, 68, 68, 0.96)';
  }

  /**
   * Sizes the canvas strictly from its parent container width so narrow mobile
   * viewports NEVER get locked into horizontal overflow.
   */
  function setupCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!canvas.dataset.logicalH) {
      const attrH = parseInt(canvas.getAttribute('height'), 10) || 200;
      canvas.dataset.logicalH = String(attrH);
      canvas.style.height = `${attrH}px`;
    }
    const parentW = canvas.parentElement ? canvas.parentElement.clientWidth : canvas.getBoundingClientRect().width;
    const cssW = Math.max(240, Math.floor(parentW || 320));
    const cssH = parseInt(canvas.dataset.logicalH, 10);
    const targetW = Math.round(cssW * dpr);
    const targetH = Math.round(cssH * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: cssW, h: cssH };
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /**
   * Draws a stylized top-down vehicle centered at (0, 0), pointing right (+X).
   */
  function drawCarSprite(ctx, opts) {
    const {
      len = 16,
      wid = 8.5,
      bodyColor = '#10b981',
      braking = false,
      isHighlight = false,
      highlightColor = '#3b82f6',
      isJamBuster = false,
      isAutonomous = false,
      isHovered = false,
    } = opts;

    const hw = len / 2;
    const hh = wid / 2;

    // Optional forward buffer/radar visual for special cars
    if (isJamBuster) {
      ctx.save();
      const grad = ctx.createLinearGradient(hw, 0, hw + 28, 0);
      grad.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
      grad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(hw, -hh * 0.85);
      ctx.lineTo(hw + 28, -hh * 1.6);
      ctx.lineTo(hw + 28, hh * 1.6);
      ctx.lineTo(hw, hh * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (isAutonomous) {
      ctx.save();
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.6)';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(hw + 1, 0, 8, -0.5, 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(hw + 1, 0, 13, -0.45, 0.45);
      ctx.stroke();
      ctx.restore();
    }

    // Brake light glow halo behind rear bumper
    if (braking) {
      ctx.save();
      const g = ctx.createRadialGradient(-hw - 1, 0, 1, -hw - 1, 0, wid * 1.6);
      g.addColorStop(0, 'rgba(255, 59, 48, 0.9)');
      g.addColorStop(0.45, 'rgba(255, 59, 48, 0.38)');
      g.addColorStop(1, 'rgba(255, 59, 48, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(-hw - 1, 0, wid * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Subtle ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    roundRectPath(ctx, -hw + 0.8, -hh + 1.2, len, wid, 3.2);
    ctx.fill();

    // Car chassis
    ctx.fillStyle = bodyColor;
    roundRectPath(ctx, -hw, -hh, len, wid, 3.2);
    ctx.fill();

    // Crisp rim for highlighted or hovered cars
    if (isHovered || isHighlight || isJamBuster) {
      ctx.strokeStyle = isHovered ? '#ffffff' : isJamBuster ? '#a5f3fc' : '#ffffff';
      ctx.lineWidth = isHovered ? 2.0 : 1.5;
      roundRectPath(ctx, -hw - 0.5, -hh - 0.5, len + 1, wid + 1, 3.6);
      ctx.stroke();
    }

    // Windshield & rear glass
    ctx.fillStyle = 'rgba(15, 23, 42, 0.52)';
    roundRectPath(ctx, hw * 0.05, -hh + 1.5, len * 0.27, wid - 3, 1.4);
    ctx.fill();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    roundRectPath(ctx, -hw * 0.65, -hh + 1.7, len * 0.16, wid - 3.4, 1.0);
    ctx.fill();

    // Tiny warm headlights
    ctx.fillStyle = 'rgba(254, 249, 195, 0.88)';
    ctx.fillRect(hw - 1.3, -hh + 1.2, 1.3, 1.8);
    ctx.fillRect(hw - 1.3, hh - 3.0, 1.3, 1.8);

    // Bright crimson tail / brake lights
    if (braking) {
      ctx.fillStyle = '#ff2d20';
      ctx.fillRect(-hw - 0.6, -hh + 0.7, 2.4, 2.5);
      ctx.fillRect(-hw - 0.6, hh - 3.2, 2.4, 2.5);
    } else {
      ctx.fillStyle = 'rgba(220, 38, 38, 0.45)';
      ctx.fillRect(-hw, -hh + 1.1, 1.2, 1.8);
      ctx.fillRect(-hw, hh - 2.9, 1.2, 1.8);
    }

    // Highlight outer ring if requested
    if (isHighlight && highlightColor) {
      ctx.strokeStyle = highlightColor;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(hw, hh) + 4.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawPillLabel(ctx, text, x, y, bg, fg = '#ffffff', logicalW = null) {
    ctx.save();
    ctx.font = '700 10.5px "Hiragino Kaku Gothic ProN", "Hiragino Sans", sans-serif';
    const tw = ctx.measureText(text).width;
    const padX = 8;
    const boxW = tw + padX * 2;
    const boxH = 19;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const maxW = logicalW || ctx.canvas.width / dpr;
    const bx = Math.max(6, Math.min(maxW - boxW - 6, x - boxW / 2));
    const by = y - boxH / 2;
    ctx.fillStyle = bg;
    roundRectPath(ctx, bx, by, boxW, boxH, 999);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + boxW / 2, by + boxH / 2 + 0.5);
    ctx.restore();
    return { left: bx, right: bx + boxW };
  }

  /* ------------------------------------------------------------------------
     Scroll Progress Bar & Active Nav Highlighter
     ------------------------------------------------------------------------ */
  const progressFill = document.getElementById('readingProgress');
  const navLinks = Array.from(document.querySelectorAll('.chapter-nav__link'));
  const sections = ['top', 'ch1', 'ch2', 'ch3', 'ch4']
    .map((id) => ({ id, el: document.getElementById(id) }))
    .filter((s) => s.el);

  function updateScrollUI() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const pct = Math.min(100, Math.max(0, (scrollTop / docH) * 100));
    if (progressFill) progressFill.style.width = `${pct.toFixed(1)}%`;

    let currentId = 'top';
    for (const s of sections) {
      const top = s.el.getBoundingClientRect().top;
      if (top <= 140) currentId = s.id;
    }
    for (const link of navLinks) {
      link.classList.toggle('is-active', link.dataset.nav === currentId);
    }
  }
  window.addEventListener('scroll', updateScrollUI, { passive: true });
  updateScrollUI();

  /* ------------------------------------------------------------------------
     Visibility Tracker (Pause off-screen canvases for buttery 60fps)
     ------------------------------------------------------------------------ */
  const visibleMap = new Map();
  let dominoHasAutoStarted = false;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        visibleMap.set(e.target.id, e.isIntersecting);
        if (e.target.id === 'ch1' && e.isIntersecting && !dominoHasAutoStarted) {
          dominoHasAutoStarted = true;
          dominoPaused = false;
          dominoPauseBtn.textContent = '一時停止';
          dominoSim.startTest();
        }
      }
    },
    { rootMargin: '180px 0px' }
  );
  ['top', 'ch1', 'ch2', 'ch3', 'ch4'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      visibleMap.set(id, id === 'top');
      observer.observe(el);
    }
  });

  /* ========================================================================
     STAGE 0: HERO — Straight Highway + Synchronized Space-Time Trace
     ======================================================================== */
  const heroRoadCanvas = document.getElementById('heroRoadCanvas');
  const heroTraceCanvas = document.getElementById('heroTraceCanvas');
  const heroStatusBadge = document.getElementById('heroStatusBadge');
  const heroAvgSpeedEl = document.getElementById('heroAvgSpeed');
  const heroMinSpeedEl = document.getElementById('heroMinSpeed');
  const heroNarrationEl = document.getElementById('heroNarration');
  const heroBrakeBtn = document.getElementById('heroBrakeBtn');
  const heroResetBtn = document.getElementById('heroResetBtn');
  const heroSpeedBtns = Array.from(document.querySelectorAll('[data-hero-speed]'));

  const heroSim = new StraightHighwaySim({
    roadLength: 920,
    inflowDensity: 0.85,
    delay: 0.88,
    noise: 0.015,
    prewarmHistory: true,
  });
  let heroHasUserInteracted = false;
  let heroHoveredCarId = null;
  let heroRipples = [];
  let heroSpeedFactor = 1; // 1 | 0.4 | 0

  function heroXToPx(x, w) {
    const padL = w < 440 ? 42 : 46;
    const padR = 14;
    return padL + (x / heroSim.roadLength) * (w - padL - padR);
  }

  function setHeroSpeed(mult) {
    heroSpeedFactor = mult;
    heroSpeedBtns.forEach((b) =>
      b.classList.toggle('is-active', Math.abs(parseFloat(b.dataset.heroSpeed) - mult) < 0.05)
    );
  }
  heroSpeedBtns.forEach((btn) => {
    btn.addEventListener('click', () => setHeroSpeed(parseFloat(btn.dataset.heroSpeed)));
  });

  function triggerHeroBrake(carIdx = null) {
    heroHasUserInteracted = true;
    if (heroSpeedFactor === 0) setHeroSpeed(1);
    const target = heroSim.triggerBrake(carIdx, 1.6);
    if (target) {
      heroRipples.push({ x: target.x, born: performance.now() });
    }
  }

  heroBrakeBtn.addEventListener('click', () => triggerHeroBrake(null));
  heroResetBtn.addEventListener('click', () => {
    heroSim.reset();
    heroRipples = [];
    heroHasUserInteracted = false;
    setHeroSpeed(1);
    renderHero(performance.now());
  });

  function findHeroCarAt(clientX, clientY) {
    const rect = heroRoadCanvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const roadY = 62;
    if (Math.abs(my - roadY) > 40) return -1;
    let bestIdx = -1;
    let bestDist = 28;
    for (let i = 0; i < heroSim.cars.length; i++) {
      const cx = heroXToPx(heroSim.cars[i].x, rect.width);
      const d = Math.abs(cx - mx);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  heroRoadCanvas.addEventListener('mousemove', (e) => {
    const idx = findHeroCarAt(e.clientX, e.clientY);
    heroHoveredCarId = idx >= 0 ? heroSim.cars[idx].id : null;
  });
  heroRoadCanvas.addEventListener('mouseleave', () => {
    heroHoveredCarId = null;
  });
  heroRoadCanvas.addEventListener('click', (e) => {
    const idx = findHeroCarAt(e.clientX, e.clientY);
    triggerHeroBrake(idx >= 0 ? idx : null);
  });

  function renderHero(now) {
    const st = heroSim.getStats();
    const triggerCar = heroSim.cars.find((c) => c.id === heroSim.triggerCarId) || null;
    const triggerGoneDist =
      !triggerCar && heroSim.triggerVirtualX !== null && heroSim.triggerVirtualX > heroSim.roadLength
        ? Math.round((heroSim.triggerVirtualX - heroSim.roadLength) / 10) * 10
        : 0;

    // 1. Road Canvas
    {
      const { ctx, w, h } = setupCanvas(heroRoadCanvas);
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = '#2d333e';
      ctx.fillRect(0, 0, w, h);

      const roadTop = 30;
      const roadH = 66;
      const roadY = roadTop + roadH / 2;

      ctx.fillStyle = '#20252d';
      ctx.fillRect(0, roadTop, w, roadH);

      // Guardrail / edge lines
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.fillRect(0, roadTop + 3, w, 2);
      ctx.fillRect(0, roadTop + roadH - 5, w, 2);

      // Dashed centerline
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([12, 16]);
      ctx.beginPath();
      ctx.moveTo(0, roadY);
      ctx.lineTo(w, roadY);
      ctx.stroke();
      ctx.restore();

      // Distance scale ticks (1:1 aligned with Space-Time chart below!)
      ctx.font = '600 10px ui-monospace, Menlo, monospace';
      ctx.fillStyle = 'rgba(226, 232, 240, 0.6)';
      ctx.textAlign = 'center';
      const stepM = w < 460 ? 300 : 200;
      for (let m = 0; m <= 900; m += stepM) {
        const px = heroXToPx(m, w);
        ctx.fillRect(px, roadTop + roadH + 2, 1, 5);
        ctx.fillText(`${m}m`, px, h - 8);
      }

      // Direction hint on asphalt
      ctx.font = '700 10px "Hiragino Kaku Gothic ProN", sans-serif';
      ctx.fillStyle = 'rgba(226, 232, 240, 0.34)';
      ctx.textAlign = 'left';
      ctx.fillText('進行方向 ▶ ▶ ▶', w < 440 ? 38 : 48, roadTop + 17);

      // Expanding click ripples
      heroRipples = heroRipples.filter((r) => now - r.born < 950);
      for (const r of heroRipples) {
        const p = (now - r.born) / 950;
        const rx = heroXToPx(r.x, w);
        ctx.save();
        ctx.strokeStyle = `rgba(239, 68, 68, ${(1 - p) * 0.9})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(rx, roadY, 10 + p * 34, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Find invite target before first click
      let inviteCar = null;
      if (!heroHasUserInteracted) {
        let bestD = Infinity;
        for (const c of heroSim.cars) {
          const d = Math.abs(c.x - heroSim.roadLength * 0.72);
          if (d < bestD) {
            bestD = d;
            inviteCar = c;
          }
        }
      }

      // Draw Cars
      const carLen = w < 460 ? 12 : 16;
      const carWid = w < 460 ? 7.4 : 8.8;
      let triggerPx = null;
      for (const c of heroSim.cars) {
        if (c.x < -15 || c.x > heroSim.roadLength + 15) continue;
        const px = heroXToPx(c.x, w);
        const kmh = c.v * 3.6;
        const braking = c.a < -0.65 || c.brakeTimer > 0;
        const bodyColor = c.isTrigger ? '#3b82f6' : speedToColor(kmh);
        if (c.isTrigger) triggerPx = px;

        ctx.save();
        ctx.translate(px, roadY);
        drawCarSprite(ctx, {
          len: carLen,
          wid: carWid,
          bodyColor,
          braking,
          isHighlight: c.isTrigger,
          highlightColor: 'rgba(96, 165, 250, 0.9)',
          isHovered: c.id === heroHoveredCarId,
        });
        ctx.restore();
      }

      // Invite pointer badge before first click
      if (inviteCar) {
        const ix = heroXToPx(inviteCar.x, w);
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.006);
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.45 + pulse * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ix, roadY, 12 + pulse * 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        drawPillLabel(ctx, '👆 クリックでブレーキ', ix, 15, '#dc2626', '#ffffff', w);
      }

      // Floating trigger tag (on-road OR off-screen right edge!)
      let topLabelBox = null;
      if (triggerPx !== null) {
        topLabelBox = drawPillLabel(ctx, 'きっかけの車 →', triggerPx, 15, '#2563eb', '#ffffff', w);
      } else if (triggerGoneDist >= 20 && (st.jammed >= 2 || heroSim.jamWaveX !== null)) {
        const offText =
          w < 480
            ? `きっかけ車 +${triggerGoneDist}m先 →`
            : `青い車（きっかけ）はもう +${triggerGoneDist}m 先へ →`;
        topLabelBox = drawPillLabel(ctx, offText, w - 110, 15, '#2563eb', '#ffffff', w);
      }

      // Floating crimson jam wave indicator
      if (heroSim.jamWaveX !== null) {
        const jx = heroXToPx(heroSim.jamWaveX, w);
        const jamLabel = w < 460 ? '◀ 渋滞の波（後ろへ）' : '◀ 渋滞の波が後ろへ伝わる';
        const overlapsTop = topLabelBox && jx + 80 > topLabelBox.left && jx - 80 < topLabelBox.right;
        const labelY = overlapsTop ? h - 14 : 15;
        drawPillLabel(ctx, jamLabel, jx, labelY, '#dc2626', '#ffffff', w);
      }
    }

    // 2. Synchronized Space-Time Trace Canvas (X aligned 1:1 with road above!)
    {
      const { ctx, w, h } = setupCanvas(heroTraceCanvas);
      ctx.fillStyle = '#faf8f4';
      ctx.fillRect(0, 0, w, h);

      const padL = w < 440 ? 42 : 46;
      const padT = 16;
      const padB = 14;
      const plotH = h - padT - padB;
      const maxSec = heroSim.maxHistorySec;
      const tNow = heroSim.time;

      // Vertical distance gridlines aligned to road ticks above
      ctx.strokeStyle = '#e7e2d8';
      ctx.lineWidth = 1;
      const stepM = w < 460 ? 300 : 200;
      for (let m = 0; m <= 900; m += stepM) {
        const px = heroXToPx(m, w);
        ctx.beginPath();
        ctx.moveTo(px, padT);
        ctx.lineTo(px, h - padB);
        ctx.stroke();
      }

      // Horizontal time gridlines
      ctx.font = '600 9.5px "Hiragino Kaku Gothic ProN", sans-serif';
      ctx.fillStyle = '#7c8492';
      ctx.textAlign = 'right';
      for (const secAgo of [0, 15, 30]) {
        const py = padT + (secAgo / maxSec) * plotH;
        ctx.strokeStyle = secAgo === 0 ? '#cfc7b8' : '#ede8df';
        ctx.beginPath();
        ctx.moveTo(padL - 2, py);
        ctx.lineTo(w - 12, py);
        ctx.stroke();
        ctx.fillText(secAgo === 0 ? '今' : `${secAgo}秒前`, padL - 5, py + 3);
      }

      // Draw connected trajectories by car ID
      const hist = heroSim.history;
      if (hist.length >= 2) {
        for (let k = 1; k < hist.length; k++) {
          const prevFrame = hist[k - 1];
          const currFrame = hist[k];
          const agePrev = tNow - prevFrame.t;
          const ageCurr = tNow - currFrame.t;
          if (agePrev > maxSec || ageCurr < 0) continue;

          const y1 = padT + (agePrev / maxSec) * plotH;
          const y2 = padT + (ageCurr / maxSec) * plotH;

          const prevMap = new Map();
          for (const p of prevFrame.pts) prevMap.set(p.id, p);

          for (const p of currFrame.pts) {
            const p0 = prevMap.get(p.id);
            if (!p0) continue;
            const x1 = heroXToPx(p0.x, w);
            const x2 = heroXToPx(p.x, w);
            const kmh = p.v * 3.6;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            if (p.isTrigger) {
              ctx.strokeStyle = '#2563eb';
              ctx.lineWidth = 3.1;
            } else if (kmh < 34) {
              ctx.strokeStyle = 'rgba(220, 38, 38, 0.96)';
              ctx.lineWidth = 3.2;
            } else {
              ctx.strokeStyle = speedToTraceColor(kmh);
              ctx.lineWidth = 1.4;
            }
            ctx.stroke();
          }
        }
      }
    }

    // 3. Telemetry & Live Plain-Japanese Narration
    heroAvgSpeedEl.textContent = Math.round(st.avgKmh);
    heroMinSpeedEl.textContent = Math.round(st.minKmh);

    if (st.jammed >= 3 || st.minKmh < 20) {
      heroStatusBadge.textContent = '自然渋滞の波が後ろへ伝播中！';
      heroStatusBadge.className = 'stage-badge stage-badge--jam';
    } else if (st.braking >= 2 || st.minKmh < 46) {
      heroStatusBadge.textContent = 'ブレーキが連鎖し始めました…';
      heroStatusBadge.className = 'stage-badge stage-badge--warn';
    } else {
      heroStatusBadge.textContent = '順調に流れています';
      heroStatusBadge.className = 'stage-badge';
    }

    const sinceBrake = heroSim.time - heroSim.lastBrakeTime;
    if (!heroHasUserInteracted) {
      heroNarrationEl.innerHTML =
        '今は時速69kmほどでスムーズに流れています。道路上の<strong>どれか1台をクリック</strong>するか赤いボタンを押して、一瞬だけブレーキを踏ませてみてください。';
    } else if (sinceBrake < 2.2) {
      heroNarrationEl.innerHTML =
        '<strong>青い車（きっかけの車）</strong>がほんの1.5秒だけブレーキを踏みました。後ろの車のブレーキランプと下の軌跡に注目してください…！';
    } else if (st.jammed >= 2 && !triggerCar) {
      heroNarrationEl.innerHTML =
        `<strong>きっかけの青い車はもう画面外（+${triggerGoneDist}m先）へ走り去った</strong>のに、赤い渋滞の塊だけが後ろ（左側）へ伸び続けています！これが「先頭には何もない渋滞」の正体です。`;
    } else if (st.jammed >= 2) {
      heroNarrationEl.innerHTML =
        '青い車はもう加速して逃げ切ったのに、<strong>後ろの車ほど強くブレーキを踏み、赤い渋滞の波が左（後ろ）へ伝わっています！</strong> 下の軌跡でも赤い帯が左斜め上（↖）に伸びています。';
    } else if (sinceBrake < 10) {
      heroNarrationEl.innerHTML =
        'ブレーキランプの連鎖が始まりました。後ろへ伝わるほど減速が大きくなっていきます…（「スロー」でじっくり観察できます）';
    } else {
      heroNarrationEl.innerHTML =
        '渋滞の波が左端へ流れ去りました。もう一度好きな車をクリックして、何度でも試せます。';
    }
  }

  /* ========================================================================
     STAGE 1: CHAPTER 1 — 8-Car Domino Chain Experiment
     ======================================================================== */
  const dominoRoadCanvas = document.getElementById('dominoRoadCanvas');
  const dominoChartCanvas = document.getElementById('dominoChartCanvas');
  const dominoDelaySlider = document.getElementById('dominoDelaySlider');
  const dominoDelayVal = document.getElementById('dominoDelayVal');
  const dominoPresetHuman = document.getElementById('dominoPresetHuman');
  const dominoPresetFast = document.getElementById('dominoPresetFast');
  const dominoReplayBtn = document.getElementById('dominoReplayBtn');
  const dominoPauseBtn = document.getElementById('dominoPauseBtn');
  const dominoTimeReadout = document.getElementById('dominoTimeReadout');
  const dominoNarrationEl = document.getElementById('dominoNarration');

  const dominoSim = new DominoChainSim({ delay: 0.85 });
  let dominoPaused = false;

  function setDominoDelay(val, autoRun = true) {
    const d = parseFloat(val);
    dominoSim.delay = d;
    dominoDelaySlider.value = d.toFixed(2);
    dominoDelayVal.textContent = `${d.toFixed(2)} 秒`;
    dominoPresetHuman.classList.toggle('is-active', Math.abs(d - 0.85) < 0.03);
    dominoPresetFast.classList.toggle('is-active', Math.abs(d - 0.15) < 0.03);
    if (autoRun) {
      dominoPaused = false;
      dominoPauseBtn.textContent = '一時停止';
      dominoSim.startTest();
    }
  }

  dominoPresetHuman.addEventListener('click', () => setDominoDelay(0.85, true));
  dominoPresetFast.addEventListener('click', () => setDominoDelay(0.15, true));
  dominoDelaySlider.addEventListener('input', (e) => setDominoDelay(e.target.value, false));
  dominoDelaySlider.addEventListener('change', (e) => setDominoDelay(e.target.value, true));
  dominoReplayBtn.addEventListener('click', () => {
    dominoPaused = false;
    dominoPauseBtn.textContent = '一時停止';
    dominoSim.startTest();
  });
  dominoPauseBtn.addEventListener('click', () => {
    if (!dominoSim.running && dominoSim.completed) {
      dominoPaused = false;
      dominoPauseBtn.textContent = '一時停止';
      dominoSim.startTest();
      return;
    }
    dominoPaused = !dominoPaused;
    dominoPauseBtn.textContent = dominoPaused ? '▶ 再開' : '一時停止';
  });

  function renderDomino() {
    const cars = dominoSim.cars;
    dominoTimeReadout.textContent = `${Math.min(dominoSim.duration, dominoSim.time).toFixed(1)} / ${dominoSim.duration.toFixed(1)} 秒`;

    // 1. Platoon Moving-Camera Road Canvas (Anti-collision labels!)
    {
      const { ctx, w, h } = setupCanvas(dominoRoadCanvas);
      ctx.fillStyle = '#2d333e';
      ctx.fillRect(0, 0, w, h);

      const roadTop = 30;
      const roadH = 66;
      const roadY = roadTop + roadH / 2;

      ctx.fillStyle = '#20252d';
      ctx.fillRect(0, roadTop, w, roadH);
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.fillRect(0, roadTop + 3, w, 2);
      ctx.fillRect(0, roadTop + roadH - 5, w, 2);

      // Smooth playback progress bar along very top of road canvas
      const prog = Math.min(1, dominoSim.time / dominoSim.duration);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(0, 0, w, 3);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(0, 0, w * prog, 3);

      // Moving camera centered on platoon midpoint
      const xMin = cars[cars.length - 1].x;
      const xMax = cars[0].x;
      const span = Math.max(195, xMax - xMin + 44);
      const center = (xMin + xMax) * 0.5;
      const padX = w < 440 ? 22 : 36;
      const pxPerM = (w - padX * 2) / span;
      const mapX = (x) => w / 2 + (x - center) * pxPerM;

      // Moving road dashes
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1.6;
      const dashSpacing = 24;
      const firstMark = Math.floor((center - span / 2) / dashSpacing) * dashSpacing;
      for (let m = firstMark; m < center + span / 2 + dashSpacing; m += dashSpacing) {
        const px = mapX(m);
        ctx.beginPath();
        ctx.moveTo(px, roadY);
        ctx.lineTo(px + 9 * pxPerM, roadY);
        ctx.stroke();
      }
      ctx.restore();

      // Gap cushion ribbons
      const carLen = w < 460 ? 15 : 20;
      const carWid = w < 460 ? 8.5 : 10.5;
      for (let i = 1; i < cars.length; i++) {
        const lead = cars[i - 1];
        const rear = cars[i];
        const gap = Math.max(0, lead.x - rear.x - dominoSim.carLen);
        const x1 = mapX(rear.x) + carLen / 2 + 2;
        const x2 = mapX(lead.x) - carLen / 2 - 2;
        if (x2 > x1 + 1) {
          let col = 'rgba(16, 185, 129, 0.28)';
          if (gap < 8) col = 'rgba(239, 68, 68, 0.6)';
          else if (gap < 15) col = 'rgba(245, 158, 11, 0.44)';
          ctx.fillStyle = col;
          ctx.fillRect(x1, roadY - 4, x2 - x1, 8);
        }
      }

      // Draw each car + anti-overlap labels
      const pxs = cars.map((c) => mapX(c.x));
      let lastTopLabelX = Infinity;
      let lastBotLabelX = Infinity;
      const minLabelGap = w < 480 ? 30 : 38;

      for (let i = 0; i < cars.length; i++) {
        const c = cars[i];
        const px = pxs[i];
        const kmh = c.v * 3.6;
        const bodyColor = i === 0 ? '#3b82f6' : speedToColor(kmh);

        ctx.save();
        ctx.translate(px, roadY);
        drawCarSprite(ctx, {
          len: carLen,
          wid: carWid,
          bodyColor,
          braking: c.braking,
          isHighlight: i === 0,
          highlightColor: 'rgba(96, 165, 250, 0.85)',
        });
        ctx.restore();

        // Yellow reaction-delay pie gauge while noticing lead car's brake
        if (i > 0 && c.reactProgress > 0 && c.reactProgress < 0.99 && dominoSim.delay >= 0.35) {
          ctx.save();
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(px, roadY - 17, 5.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c.reactProgress);
          ctx.stroke();
          ctx.restore();
        }

        // Bottom car number label (cars go right-to-left: i=0 is rightmost)
        const showBot = i === 0 || i === cars.length - 1 || lastBotLabelX - px >= (w < 480 ? 22 : 28);
        if (showBot) {
          ctx.font = '700 10px "Hiragino Kaku Gothic ProN", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = i === 0 ? '#93c5fd' : '#e2e8f0';
          const tag = i === 0 ? (w < 460 ? '1(先頭)' : '1台目(先頭)') : `${i + 1}`;
          ctx.fillText(tag, px, h - 10);
          lastBotLabelX = px;
        }

        // Top live speed readout — skip crowded intermediate overlaps so text is ALWAYS crisp!
        const showTop = i === 0 || lastTopLabelX - px >= minLabelGap;
        if (showTop) {
          ctx.font = '700 10px ui-monospace, Menlo, monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = kmh < 25 ? '#fca5a5' : '#cbd5e1';
          ctx.fillText(`${Math.round(kmh)}km/h`, px, 18);
          lastTopLabelX = px;
        }
      }
    }

    // 2. Minimum Speed Amplification Bar Chart
    {
      const { ctx, w, h } = setupCanvas(dominoChartCanvas);
      ctx.fillStyle = '#faf8f4';
      ctx.fillRect(0, 0, w, h);

      const padL = w < 440 ? 36 : 48;
      const padR = 14;
      const padT = 26;
      const padB = 34;
      const plotW = w - padL - padR;
      const plotH = h - padT - padB;
      const maxKmh = 90;
      const yOf = (kmh) => padT + (1 - kmh / maxKmh) * plotH;

      // Grid lines
      ctx.font = '600 10px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'right';
      for (const v of [0, 20, 40, 60, 80]) {
        const y = yOf(v);
        ctx.strokeStyle = v === 80 ? '#cbd5e1' : '#ece7de';
        ctx.lineWidth = v === 80 ? 1.4 : 1;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(w - padR, y);
        ctx.stroke();
        ctx.fillStyle = '#64748b';
        ctx.fillText(`${v}`, padL - 6, y + 3.5);
      }

      // Reference dashed line at lead car's gentle slow-down (~58 km/h)
      const leadMinKmh = cars[0].minV * 3.6;
      if (leadMinKmh < 75) {
        const ly = yOf(leadMinKmh);
        ctx.save();
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.55)';
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(padL, ly);
        ctx.lineTo(w - padR, ly);
        ctx.stroke();
        ctx.restore();
        ctx.font = '700 10px "Hiragino Kaku Gothic ProN", sans-serif';
        ctx.fillStyle = '#2563eb';
        ctx.textAlign = 'right';
        ctx.fillText(`先頭の最低速度 (${Math.round(leadMinKmh)}km/h)`, w - padR - 2, ly - 5);
      }

      const colW = plotW / cars.length;
      const barW = Math.min(44, Math.max(18, colW * 0.56));

      for (let i = 0; i < cars.length; i++) {
        const c = cars[i];
        const minKmh = c.minV * 3.6;
        const currKmh = c.v * 3.6;
        const cx = padL + (i + 0.5) * colW;

        // Track up to 80 km/h
        ctx.fillStyle = '#efeae0';
        roundRectPath(ctx, cx - barW / 2, yOf(80), barW, yOf(0) - yOf(80), 6);
        ctx.fill();

        // Filled bar = lowest speed reached
        const barH = Math.max(4, yOf(0) - yOf(minKmh));
        ctx.fillStyle = i === 0 ? '#3b82f6' : speedToColor(minKmh);
        roundRectPath(ctx, cx - barW / 2, yOf(0) - barH, barW, barH, 6);
        ctx.fill();

        // Live current speed dot
        ctx.fillStyle = '#1a1d24';
        ctx.beginPath();
        ctx.arc(cx, yOf(currKmh), 3.4, 0, Math.PI * 2);
        ctx.fill();

        // Crisp non-overlapping value label
        ctx.textAlign = 'center';
        if (minKmh < 2) {
          ctx.font = '800 10.5px "Hiragino Kaku Gothic ProN", sans-serif';
          ctx.fillStyle = '#dc2626';
          ctx.fillText('停止', cx, yOf(0) - 21);
          ctx.font = '800 10.5px ui-monospace, Menlo, monospace';
          ctx.fillText('0', cx, yOf(0) - 9);
        } else {
          ctx.font = '800 11px ui-monospace, Menlo, monospace';
          ctx.fillStyle = '#1e293b';
          ctx.fillText(`${Math.round(minKmh)}`, cx, Math.min(yOf(minKmh) - 7, yOf(0) - 10));
        }

        // X-axis car label
        ctx.font = '700 10.5px "Hiragino Kaku Gothic ProN", sans-serif';
        ctx.fillStyle = i === 0 ? '#2563eb' : '#475569';
        ctx.fillText(w < 440 ? `${i + 1}台` : i === 0 ? '1台目' : `${i + 1}台目`, cx, h - 12);
      }

      ctx.font = '600 10px "Hiragino Kaku Gothic ProN", sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'left';
      ctx.fillText('km/h', 6, 15);
    }

    // Dynamic plain-Japanese narration synchronized with live state
    const lastMin = Math.round(cars[cars.length - 1].minV * 3.6);
    const stoppedCount = cars.filter((c) => c.minV * 3.6 < 4).length;
    if (dominoSim.time < 0.5) {
      dominoNarrationEl.innerHTML =
        `全8台が時速80kmで走行中。まもなく先頭（1台目）だけが<strong>時速58kmまで軽く減速</strong>します（反応遅れ：<strong>${dominoSim.delay.toFixed(2)}秒</strong>）。`;
    } else if (dominoSim.delay <= 0.25) {
      dominoNarrationEl.innerHTML =
        `反応遅れが <strong>${dominoSim.delay.toFixed(2)}秒</strong> しかないと、後ろの車ほど減速が小さくなり、8台目の最低速度は <strong>${lastMin} km/h</strong>！ブレーキの波はきれいに吸収されて消えます。`;
    } else if (stoppedCount > 0) {
      dominoNarrationEl.innerHTML =
        `先頭は時速58kmまで軽く落としただけなのに、<strong>${dominoSim.delay.toFixed(2)}秒ずつの反応遅れ</strong>が連鎖して後ろほど強く減速し、<strong>${stoppedCount}台が完全停止（0 km/h）</strong>してしまいました！`;
    } else {
      dominoNarrationEl.innerHTML =
        `反応遅れ <strong>${dominoSim.delay.toFixed(2)}秒</strong> で連鎖中…現在の8台目最低速度は <strong>${lastMin} km/h</strong> です。プリセットで「ほぼ遅れなし（0.15秒）」と比べると違いが一目瞭然です。`;
    }
  }

  /* ========================================================================
     STAGE 2: CHAPTER 2 — Ring Road + Space-Time Diagram (Critical Density)
     ======================================================================== */
  const ringRoadCanvas = document.getElementById('ringRoadCanvas');
  const ringSpaceTimeCanvas = document.getElementById('ringSpaceTimeCanvas');
  const ringStatusBadge = document.getElementById('ringStatusBadge');
  const ringAvgSpeedEl = document.getElementById('ringAvgSpeed');
  const ringJamCountEl = document.getElementById('ringJamCount');
  const ringTotalCountEl = document.getElementById('ringTotalCount');
  const ringFlowRateEl = document.getElementById('ringFlowRate');
  const ringFlowDeltaEl = document.getElementById('ringFlowDelta');
  const ringWaveSpeedEl = document.getElementById('ringWaveSpeed');
  const ringDriverPovEl = document.getElementById('ringDriverPov');
  const ringTrackedSpeedEl = document.getElementById('ringTrackedSpeed');
  const ringTrackedStateEl = document.getElementById('ringTrackedState');
  const ringCountSlider = document.getElementById('ringCountSlider');
  const ringCountVal = document.getElementById('ringCountVal');
  const ringDensityTag = document.getElementById('ringDensityTag');
  const ringBrakeBtn = document.getElementById('ringBrakeBtn');
  const ringResetBtn = document.getElementById('ringResetBtn');
  const ringNarrationEl = document.getElementById('ringNarration');
  const ringPresetBtns = Array.from(document.querySelectorAll('[data-ring-preset]'));

  const ringSim = new RingRoadSim({ numCars: 22, delay: 0.69, noise: 0.03 });
  // Pre-warm a full-width 38s trajectory history so the Space-Time diagram fills edge-to-edge immediately!
  ringSim.seedActiveJam(38);
  let ringHoveredIdx = -1;
  let ringRipples = [];

  function updateRingDensityUI(n) {
    ringCountSlider.value = String(n);
    ringCountVal.textContent = `${n} 台`;
    ringTotalCountEl.textContent = String(n);
    ringPresetBtns.forEach((b) => b.classList.toggle('is-active', parseInt(b.dataset.ringPreset, 10) === n));
    if (n <= 17) {
      ringDensityTag.textContent = 'すいている（安定・渋滞しにくい）';
      ringDensityTag.className = 'density-tag density-tag--safe';
    } else if (n === 18) {
      ringDensityTag.textContent = '臨界点ギリギリ（要注意）';
      ringDensityTag.className = 'density-tag density-tag--warn';
    } else {
      ringDensityTag.textContent = '臨界点超え（自然渋滞が起きる！）';
      ringDensityTag.className = 'density-tag';
    }
  }
  updateRingDensityUI(22);

  function setRingCarCount(n, triggerInitialBrake = true) {
    ringSim.noise = n >= 27 ? 0.34 : 0.03;
    ringSim.setNumCars(n, false);
    ringSim.prewarmSmooth(10);
    updateRingDensityUI(n);
    if (triggerInitialBrake && n < 27) {
      ringSim.triggerBrake(0, 1.55);
    }
  }

  ringPresetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const n = parseInt(btn.dataset.ringPreset, 10);
      setRingCarCount(n, true);
    });
  });
  ringCountSlider.addEventListener('input', (e) => {
    const n = parseInt(e.target.value, 10);
    setRingCarCount(n, false);
  });
  ringBrakeBtn.addEventListener('click', () => {
    const idx = Math.floor(Math.random() * ringSim.cars.length);
    const car = ringSim.triggerBrake(idx, 1.55);
    if (car) ringRipples.push({ ang: (car.x / ringSim.roadLength) * Math.PI * 2, born: performance.now() });
  });
  ringResetBtn.addEventListener('click', () => {
    ringSim.reset();
    ringSim.prewarmSmooth(10);
    ringRipples = [];
  });

  function getRingGeometry(w, h) {
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.365;
    const roadW = Math.max(24, Math.min(35, r * 0.29));
    return { cx, cy, r, roadW };
  }

  function findRingCarAt(canvas, sim, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const { cx, cy, r } = getRingGeometry(rect.width, rect.height);
    let bestIdx = -1;
    let bestD = 26;
    for (let i = 0; i < sim.cars.length; i++) {
      const ang = (sim.cars[i].x / sim.roadLength) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(ang) * r;
      const py = cy + Math.sin(ang) * r;
      const d = Math.hypot(mx - px, my - py);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  ringRoadCanvas.addEventListener('mousemove', (e) => {
    ringHoveredIdx = findRingCarAt(ringRoadCanvas, ringSim, e.clientX, e.clientY);
  });
  ringRoadCanvas.addEventListener('mouseleave', () => {
    ringHoveredIdx = -1;
  });
  ringRoadCanvas.addEventListener('click', (e) => {
    const idx = findRingCarAt(ringRoadCanvas, ringSim, e.clientX, e.clientY);
    const chosen = idx >= 0 ? idx : 0;
    const car = ringSim.triggerBrake(chosen, 1.55);
    if (car) ringRipples.push({ ang: (car.x / ringSim.roadLength) * Math.PI * 2, born: performance.now() });
  });

  /** Shared high-craft circular ring road renderer (used by Ch.2 and Ch.4) */
  function renderRingRoad(canvas, sim, opts = {}) {
    const { now, hoveredIdx = -1, ripples = [], showTracked = true, showWaveBanner = true } = opts;
    const { ctx, w, h } = setupCanvas(canvas);
    ctx.fillStyle = '#f2efe8';
    ctx.fillRect(0, 0, w, h);

    const { cx, cy, r, roadW } = getRingGeometry(w, h);
    const st = sim.getStats();

    ctx.save();
    // Outer soft shadow
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(26, 29, 36, 0.14)';
    ctx.lineWidth = roadW + 10;
    ctx.stroke();

    // Road shoulders
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#383f4d';
    ctx.lineWidth = roadW + 5;
    ctx.stroke();

    // Matte asphalt ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#20252d';
    ctx.lineWidth = roadW;
    ctx.stroke();

    // White edge lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, r + roadW / 2 - 2.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r - roadW / 2 + 2.5, 0, Math.PI * 2);
    ctx.stroke();

    // Dashed centerline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.3;
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4 subtle clockwise directional chevrons
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.25)';
    ctx.lineWidth = 1.8;
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(3, 0);
      ctx.lineTo(-4, 4);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // Sweeping outer crimson counter-clockwise arrow when jam wave is active
    if (st.jamAngle !== null && st.jammed >= 2) {
      const jamDrawAng = st.jamAngle - Math.PI / 2;
      const outerR = r + roadW / 2 + 12;
      const arcStart = jamDrawAng + 0.42;
      const arcEnd = jamDrawAng - 0.48;
      ctx.save();
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.88)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, arcStart, arcEnd, true);
      ctx.stroke();

      const ax = cx + Math.cos(arcEnd) * outerR;
      const ay = cy + Math.sin(arcEnd) * outerR;
      const tang = arcEnd - Math.PI / 2;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(ax + Math.cos(tang) * 5, ay + Math.sin(tang) * 5);
      ctx.lineTo(ax + Math.cos(tang + 2.4) * 7, ay + Math.sin(tang + 2.4) * 7);
      ctx.lineTo(ax + Math.cos(tang - 2.4) * 7, ay + Math.sin(tang - 2.4) * 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Brake click ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      const p = (now - rp.born) / 900;
      if (p >= 1) {
        ripples.splice(i, 1);
        continue;
      }
      const a = rp.ang - Math.PI / 2;
      ctx.save();
      ctx.strokeStyle = `rgba(239, 68, 68, ${(1 - p) * 0.9})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 8 + p * 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Draw Cars clockwise
    for (let i = 0; i < sim.cars.length; i++) {
      const c = sim.cars[i];
      const ang = (c.x / sim.roadLength) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(ang) * r;
      const py = cy + Math.sin(ang) * r;
      const kmh = c.v * 3.6;
      const braking = c.a < -0.65 || c.brakeTimer > 0;
      const isTracked = showTracked && c.id === sim.trackedId && !c.isJamBuster && !c.isAutonomous;

      let bodyColor = speedToColor(kmh);
      if (c.isJamBuster) bodyColor = '#06b6d4';
      else if (c.isAutonomous) bodyColor = '#6366f1';
      else if (isTracked) bodyColor = '#3b82f6';

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang + Math.PI / 2);
      drawCarSprite(ctx, {
        len: 15.5,
        wid: 8.6,
        bodyColor,
        braking,
        isHighlight: isTracked,
        highlightColor: 'rgba(59, 130, 246, 0.9)',
        isJamBuster: c.isJamBuster,
        isAutonomous: c.isAutonomous,
        isHovered: i === hoveredIdx,
      });
      ctx.restore();
    }

    // Center Hub Info
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1a1d24';
    ctx.font = '800 13px "Hiragino Kaku Gothic ProN", sans-serif';
    ctx.fillText(`全 ${sim.cars.length} 台`, cx, cy - 16);
    ctx.font = '600 11px "Hiragino Kaku Gothic ProN", sans-serif';
    ctx.fillStyle = '#5a606a';
    ctx.fillText('車は時計回り ↻', cx, cy + 2);

    if (showWaveBanner && st.jamAngle !== null && st.jammed >= 2) {
      drawPillLabel(ctx, '↺ 渋滞の波は逆回り！', cx, cy + 25, '#dc2626', '#ffffff', w);
    } else {
      ctx.fillStyle = '#0f766e';
      ctx.font = '700 11px "Hiragino Kaku Gothic ProN", sans-serif';
      ctx.fillText('スムーズに周回中', cx, cy + 24);
    }
    ctx.restore();
  }

  function renderRingSpaceTime() {
    const { ctx, w, h } = setupCanvas(ringSpaceTimeCanvas);
    ctx.fillStyle = '#faf8f4';
    ctx.fillRect(0, 0, w, h);

    const padL = 42;
    const padR = 14;
    const padT = 16;
    const padB = 28;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const maxSec = ringSim.maxHistorySec;
    const tNow = ringSim.time;
    const tStart = tNow - maxSec;
    const xOf = (t) => padL + ((t - tStart) / maxSec) * plotW;
    const yOf = (pos) => padT + (1 - pos / ringSim.roadLength) * plotH;

    // Subtle grid
    ctx.strokeStyle = '#ebe6dc';
    ctx.lineWidth = 1;
    for (let k = 0; k <= 4; k++) {
      const y = padT + (k / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
    }
    for (let k = 0; k <= 4; k++) {
      const x = padL + (k / 4) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, h - padB);
      ctx.stroke();
    }

    // Plot trajectories
    const hist = ringSim.history;
    if (hist.length >= 2) {
      for (let k = 1; k < hist.length; k++) {
        const f0 = hist[k - 1];
        const f1 = hist[k];
        if (f1.t < tStart) continue;
        const x0 = xOf(f0.t);
        const x1 = xOf(f1.t);

        const prevMap = new Map();
        for (const p of f0.pts) prevMap.set(p.id, p);

        for (const p of f1.pts) {
          const p0 = prevMap.get(p.id);
          if (!p0) continue;
          if (Math.abs(p.x - p0.x) > ringSim.roadLength * 0.45) continue;

          const y0 = yOf(p0.x);
          const y1 = yOf(p.x);
          const kmh = p.v * 3.6;

          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          if (p.isTracked) {
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 2.9;
          } else if (kmh < 32) {
            ctx.strokeStyle = 'rgba(220, 38, 38, 0.95)';
            ctx.lineWidth = 3.0;
          } else {
            ctx.strokeStyle = speedToTraceColor(kmh);
            ctx.lineWidth = 1.25;
          }
          ctx.stroke();
        }
      }
    }

    ctx.strokeStyle = '#d6cfc2';
    ctx.lineWidth = 1;
    ctx.strokeRect(padL, padT, plotW, plotH);

    // Axis Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '600 10px "Hiragino Kaku Gothic ProN", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('時間の流れ →', padL + plotW / 2, h - 8);

    ctx.save();
    ctx.translate(14, padT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('車の進む方向（1周 520m）→', 0, 0);
    ctx.restore();
  }

  function updateRingTelemetry() {
    const st = ringSim.getStats();
    ringAvgSpeedEl.textContent = Math.round(st.avgKmh);
    ringJamCountEl.textContent = String(st.jammed);
    ringFlowRateEl.textContent = Math.round(st.flowPerHour).toLocaleString();

    if (st.flowDropPct <= -8 && st.status === 'jam') {
      ringFlowDeltaEl.textContent = `${st.flowDropPct}% 効率低下`;
      ringFlowDeltaEl.classList.remove('is-hidden');
    } else {
      ringFlowDeltaEl.classList.add('is-hidden');
    }

    ringWaveSpeedEl.textContent =
      st.jamAngle !== null && st.jammed >= 2
        ? `逆向き ${Math.round(Math.max(12, st.jamWaveKmh))} km/h`
        : '発生なし';

    // Tracked blue car POV readout
    const tk = Math.round(st.trackedKmh);
    ringTrackedSpeedEl.textContent = `${tk} km/h`;
    const isTkJam = tk < 32;
    ringDriverPovEl.classList.toggle('is-jammed', isTkJam);
    if (tk < 8) ringTrackedStateEl.textContent = '渋滞でほぼ停止！';
    else if (isTkJam) ringTrackedStateEl.textContent = st.trackedBraking ? '急ブレーキ！' : '渋滞に捕まった';
    else if (tk < 52) ringTrackedStateEl.textContent = '加速・減速中';
    else ringTrackedStateEl.textContent = 'スムーズに快走中';

    if (st.status === 'jam') {
      ringStatusBadge.textContent = '自然渋滞が発生中！';
      ringStatusBadge.className = 'stage-badge stage-badge--jam';
    } else if (st.status === 'unstable') {
      ringStatusBadge.textContent = '波が広がっています…';
      ringStatusBadge.className = 'stage-badge stage-badge--warn';
    } else {
      ringStatusBadge.textContent = 'スムーズに流れています';
      ringStatusBadge.className = 'stage-badge';
    }

    if (ringSim.numCars <= 17) {
      ringNarrationEl.innerHTML =
        `現在は <strong>${ringSim.numCars}台（臨界点未満）</strong> です。車間距離にゆとりがあるため、「1台にブレーキ」を押しても波がすぐ吸収されて消えてしまいます。`;
    } else if (st.status === 'jam') {
      ringNarrationEl.innerHTML =
        `<strong>自然渋滞が定着しました！</strong> 右の時空図を見てください。青い追跡車（↗）は前へ進みながら、逆向きに落ちてくる赤い渋滞の帯（↘）に何度も捕まっています。`;
    } else if (ringSim.numCars >= 27) {
      ringNarrationEl.innerHTML =
        `<strong>${ringSim.numCars}台（過密状態）</strong> では、誰もわざとブレーキを踏まなくても、人間特有のわずかな速度のブレだけで自然に渋滞が芽生えます…`;
    } else {
      ringNarrationEl.innerHTML =
        `<strong>${ringSim.numCars}台（臨界点超え）</strong> で走っています。「1台にブレーキ」を押すか車をクリックすると、わずかな減速が増幅されて止まらない渋滞になります。`;
    }
  }

  /* ========================================================================
     STAGE 3: CHAPTER 3 — Sag (Invisible Uphill) & Live Pacemaker Lights
     ======================================================================== */
  const sagCanvas = document.getElementById('sagCanvas');
  const sagStatusBadge = document.getElementById('sagStatusBadge');
  const sagAvgSpeedEl = document.getElementById('sagAvgSpeed');
  const sagJamCountEl = document.getElementById('sagJamCount');
  const sagFlowRateEl = document.getElementById('sagFlowRate');
  const sagDensitySlider = document.getElementById('sagDensitySlider');
  const sagDensityVal = document.getElementById('sagDensityVal');
  const sagResetBtn = document.getElementById('sagResetBtn');
  const sagNarrationEl = document.getElementById('sagNarration');
  const sagModeBtns = Array.from(document.querySelectorAll('[data-sag-mode]'));

  let sagMode = 'sag'; // 'flat' | 'sag' | 'pacemaker'
  const sagSim = new StraightHighwaySim({
    roadLength: 920,
    inflowDensity: 0.72,
    delay: 0.78,
    sagEnabled: true,
    pacemakerEnabled: false,
    noise: 0.02,
  });
  // Pre-warm 34 seconds so the uphill bottleneck jam is immediately visible!
  for (let k = 0; k < 680; k++) sagSim.step();

  function setSagMode(mode) {
    const prevMode = sagMode;
    sagMode = mode;
    sagModeBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.sagMode === mode));
    sagSim.sagEnabled = mode !== 'flat';
    sagSim.pacemakerEnabled = mode === 'pacemaker';
    // When switching to pacemaker from an active sag jam, transition LIVE so the reader watches LEDs melt the jam!
    if (prevMode === 'sag' && mode === 'pacemaker') {
      // Keep live cars!
    } else if (prevMode === 'pacemaker' && mode === 'sag') {
      // Keep live cars so the reader watches the jam form again as soon as lights turn off!
    } else {
      sagSim.reset();
      if (mode === 'sag') {
        for (let k = 0; k < 640; k++) sagSim.step();
      }
    }
    renderSag(performance.now());
  }
  sagModeBtns.forEach((btn) => {
    btn.addEventListener('click', () => setSagMode(btn.dataset.sagMode));
  });
  sagDensitySlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    sagSim.inflowDensity = val;
    if (val < 0.56) sagDensityVal.textContent = '少ない（余裕あり）';
    else if (val < 0.68) sagDensityVal.textContent = '中くらい';
    else if (val < 0.80) sagDensityVal.textContent = 'やや多い（臨界付近）';
    else sagDensityVal.textContent = '多い（混雑）';
  });
  sagResetBtn.addEventListener('click', () => {
    sagSim.reset();
    renderSag(performance.now());
  });

  function renderSag(now) {
    const { ctx, w, h } = setupCanvas(sagCanvas);
    ctx.clearRect(0, 0, w, h);

    const padL = 18;
    const padR = 18;
    const xToPx = (x) => padL + (x / sagSim.roadLength) * (w - padL - padR);

    const topH = 124;
    const roadTop = 152;
    const roadH = 74;
    const roadY = roadTop + roadH / 2;

    // --- TOP BAND: Elevation Profile (Side View) ---
    const skyGrad = ctx.createLinearGradient(0, 0, 0, topH);
    skyGrad.addColorStop(0, '#f8f6f0');
    skyGrad.addColorStop(1, '#ede8dc');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, topH);

    const elevToY = (elev) => topH - 22 - elev * 7.2;

    if (sagSim.sagEnabled) {
      const sx1 = xToPx(sagSim.sagStart);
      const sx2 = xToPx(sagSim.sagEnd);
      const zoneColor = sagSim.pacemakerEnabled
        ? 'rgba(13, 148, 136, 0.12)'
        : 'rgba(217, 119, 6, 0.14)';
      ctx.fillStyle = zoneColor;
      ctx.fillRect(sx1, 0, sx2 - sx1, h);

      ctx.save();
      ctx.strokeStyle = sagSim.pacemakerEnabled
        ? 'rgba(13, 148, 136, 0.45)'
        : 'rgba(217, 119, 6, 0.45)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx1, 12);
      ctx.lineTo(sx1, h - 12);
      ctx.moveTo(sx2, 12);
      ctx.lineTo(sx2, h - 12);
      ctx.stroke();
      ctx.restore();
    }

    // Terrain fill
    ctx.beginPath();
    ctx.moveTo(0, topH);
    for (let px = 0; px <= w; px += 6) {
      const m = ((px - padL) / (w - padL - padR)) * sagSim.roadLength;
      const clampedM = Math.max(0, Math.min(sagSim.roadLength, m));
      ctx.lineTo(px, elevToY(sagSim.getElevation(clampedM)));
    }
    ctx.lineTo(w, topH);
    ctx.closePath();
    ctx.fillStyle = '#ddd6c7';
    ctx.fill();

    // Charcoal road contour
    ctx.beginPath();
    for (let px = 0; px <= w; px += 6) {
      const m = ((px - padL) / (w - padL - padR)) * sagSim.roadLength;
      const clampedM = Math.max(0, Math.min(sagSim.roadLength, m));
      const py = elevToY(sagSim.getElevation(clampedM));
      if (px === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Mini car dots riding the terrain
    for (const c of sagSim.cars) {
      if (c.x < 0 || c.x > sagSim.roadLength) continue;
      const px = xToPx(c.x);
      const py = elevToY(sagSim.getElevation(c.x)) - 5;
      ctx.fillStyle = speedToColor(c.v * 3.6);
      ctx.beginPath();
      ctx.arc(px, py, 3.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Responsive Elevation Annotations
    ctx.font = '700 10.5px "Hiragino Kaku Gothic ProN", sans-serif';
    if (sagSim.sagEnabled) {
      const dipX = xToPx(sagSim.sagStart - 10);
      const midUpX = xToPx((sagSim.sagStart + sagSim.sagEnd) / 2);
      ctx.textAlign = 'center';
      if (w >= 460) {
        ctx.fillStyle = '#64748b';
        ctx.fillText('ゆるやかな下り', xToPx(sagSim.sagStart - 125), 34);
      }
      ctx.fillStyle = '#b45309';
      ctx.fillText('▼ サグ部（谷底）', dipX, topH - 6);
      const upPill = sagSim.pacemakerEnabled
        ? w < 440
          ? '✨ 光で速度維持！'
          : '✨ ペースメーカーライトで速度維持！'
        : w < 440
          ? '気づきにくい上り (+3%)'
          : '気づきにくい上り坂 (+3%)';
      drawPillLabel(ctx, upPill, midUpX, 17, sagSim.pacemakerEnabled ? '#0f766e' : '#b45309', '#ffffff', w);
    } else {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f766e';
      ctx.fillText('平坦な高速道路（勾配 0%）', w / 2, 26);
    }

    // Divider bar
    ctx.fillStyle = '#e2dcd0';
    ctx.fillRect(0, topH, w, roadTop - topH);
    ctx.font = '700 10px "Hiragino Kaku Gothic ProN", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText(
      w < 440 ? '真上から見た車の流れ（上図と位置連動）' : '真上から見た車の流れ（上の断面図と左右の位置が一致）',
      12,
      topH + 17
    );

    // --- BOTTOM BAND: Top-Down Highway ---
    ctx.fillStyle = '#2d333e';
    ctx.fillRect(0, roadTop - 5, w, h - (roadTop - 5));
    ctx.fillStyle = '#20252d';
    ctx.fillRect(0, roadTop, w, roadH);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.fillRect(0, roadTop + 3, w, 2);
    ctx.fillRect(0, roadTop + roadH - 5, w, 2);

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([12, 16]);
    ctx.beginPath();
    ctx.moveTo(0, roadY);
    ctx.lineTo(w, roadY);
    ctx.stroke();
    ctx.restore();

    // Animated Pacemaker LED lights gliding forward along the roadside wall!
    if (sagSim.sagEnabled && sagSim.pacemakerEnabled) {
      const sx1 = xToPx(Math.max(40, sagSim.sagStart - 360));
      const sx2 = xToPx(sagSim.sagEnd + 40);
      const phase = (now * 0.14) % 26;
      ctx.save();
      for (let lx = sx1 + phase; lx < sx2; lx += 26) {
        ctx.fillStyle = '#2dd4bf';
        ctx.shadowColor = '#2dd4bf';
        ctx.shadowBlur = 7;
        ctx.fillRect(lx, roadTop - 3, 10, 3.5);
        ctx.fillRect(lx, roadTop + roadH - 0.5, 10, 3.5);
      }
      ctx.restore();
    }

    // Draw Cars
    const carLen = w < 460 ? 12 : 16;
    const carWid = w < 460 ? 7.5 : 8.8;
    for (const c of sagSim.cars) {
      if (c.x < -15 || c.x > sagSim.roadLength + 15) continue;
      const px = xToPx(c.x);
      const kmh = c.v * 3.6;
      const braking = c.a < -0.65 || c.brakeTimer > 0;
      ctx.save();
      ctx.translate(px, roadY);
      drawCarSprite(ctx, {
        len: carLen,
        wid: carWid,
        bodyColor: speedToColor(kmh),
        braking,
      });
      ctx.restore();
    }

    // Bottom callouts (auto-spaced so they never collide on mobile)
    const st = sagSim.getStats();
    if (sagSim.sagEnabled && !sagSim.pacemakerEnabled && st.jammed >= 3) {
      const jx = xToPx(Math.min(sagSim.sagStart - 80, st.jamWaveX || sagSim.sagStart - 140));
      drawPillLabel(ctx, w < 440 ? '◀ 坂の手前で渋滞' : '◀ 坂の手前に渋滞が伸びる', jx, h - 15, '#dc2626', '#ffffff', w);
      drawPillLabel(ctx, w < 440 ? '先はガラガラ →' : '坂の先はガラガラ →', xToPx(sagSim.sagEnd + 65), h - 15, '#0f766e', '#ffffff', w);
    } else if (sagSim.sagEnabled && sagSim.pacemakerEnabled) {
      drawPillLabel(
        ctx,
        st.jammed >= 2 ? '✨ 光の誘導で渋滞を解消中…' : '✨ 光の誘導で減速を防ぎスムーズ通過！',
        xToPx((sagSim.sagStart + sagSim.sagEnd) / 2),
        h - 15,
        '#0f766e',
        '#ffffff',
        w
      );
    }

    // KPIs, status badge & narration
    sagAvgSpeedEl.textContent = Math.round(st.avgKmh);
    sagJamCountEl.textContent = String(st.jammed);
    sagFlowRateEl.textContent = Math.round(st.flowPerHour).toLocaleString();

    if (st.jammed >= 3) {
      sagStatusBadge.textContent = sagSim.pacemakerEnabled
        ? `ペースメーカーで解消中（残${st.jammed}台）`
        : `サグ部手前で自然渋滞（${st.jammed}台低速）`;
      sagStatusBadge.className = sagSim.pacemakerEnabled
        ? 'stage-badge stage-badge--warn'
        : 'stage-badge stage-badge--jam';
    } else if (st.minKmh < 44) {
      sagStatusBadge.textContent = '上り坂で減速気味';
      sagStatusBadge.className = 'stage-badge stage-badge--warn';
    } else {
      sagStatusBadge.textContent = 'スムーズに通過中';
      sagStatusBadge.className = 'stage-badge';
    }

    if (sagMode === 'flat') {
      sagNarrationEl.innerHTML =
        '<strong>平坦な道路</strong>では無意識な速度低下が起きないため、同じ交通量でもスムーズに流れ続けます。';
    } else if (sagMode === 'pacemaker') {
      sagNarrationEl.innerHTML =
        st.jammed >= 2
          ? '<strong>ペースメーカーライト（速度回復誘導LED）</strong>が点灯しました！流れる光に沿って速度回復が促され、手前の赤い渋滞がみるみる消えていきます…'
          : '<strong>ペースメーカーライト</strong>が進行方向へ流れることでドライバーが上り坂に気づき、速度低下と自然渋滞が劇的に抑えられています！';
    } else if (st.jammed >= 3) {
      sagNarrationEl.innerHTML =
        '<strong>サグ部（見えない上り坂）</strong>で前の車が無意識に減速したのをきっかけに、手前（左側）に赤い渋滞が伸びています。一方、坂を登りきった先（右側）は快適に流れているのが分かります。';
    } else {
      sagNarrationEl.innerHTML =
        'サグ部に差し掛かると車が無意識に減速します。交通量スライダーを「やや多い」以上にすると、そこから渋滞の波が後ろへ伸び始めます。';
    }
  }

  /* ========================================================================
     STAGE 4: CHAPTER 4 — Solutions Lab (Jam Buster, Cushion, Autonomous)
     ======================================================================== */
  const labRingCanvas = document.getElementById('labRingCanvas');
  const labChartCanvas = document.getElementById('labChartCanvas');
  const labStatusBadge = document.getElementById('labStatusBadge');
  const labAvgSpeedEl = document.getElementById('labAvgSpeed');
  const labSpeedDeltaEl = document.getElementById('labSpeedDelta');
  const labMinSpeedEl = document.getElementById('labMinSpeed');
  const labJamCountEl = document.getElementById('labJamCount');
  const labFlowRateEl = document.getElementById('labFlowRate');
  const labFlowDeltaEl = document.getElementById('labFlowDelta');
  const labNarrationEl = document.getElementById('labNarration');
  const labReseedBtn = document.getElementById('labReseedBtn');
  const labAutoSlider = document.getElementById('labAutoSlider');
  const labAutoVal = document.getElementById('labAutoVal');

  const solCardBuster = document.getElementById('solCardBuster');
  const solCardCushion = document.getElementById('solCardCushion');
  const solCardAuto = document.getElementById('solCardAuto');
  const jbBtns = Array.from(document.querySelectorAll('[data-jb]'));
  const cushionBtns = Array.from(document.querySelectorAll('[data-cushion]'));

  // Calibrated delay=0.60: persists in 0 km/h phantom jam indefinitely with NO solution,
  // yet dissolves cleanly with EVEN 1 Jam Buster (5%), 2 Jam Busters (9%), Cushion ON, or 30%+ ACC!
  const labSim = new RingRoadSim({ numCars: 22, delay: 0.60, noise: 0.02 });
  labSim.seedActiveJam(16);
  let labBaselineAvg = labSim.getStats().avgKmh;
  let labBaselineFlow = labSim.getStats().flowPerHour;
  let labHoveredIdx = -1;
  let labRipples = [];
  let labEventMarkers = [];

  function stampLabEvent(label) {
    labEventMarkers.push({ t: labSim.time, label });
    if (labEventMarkers.length > 5) labEventMarkers.shift();
  }

  function updateLabControlStyles() {
    jbBtns.forEach((b) => b.classList.toggle('is-active', parseInt(b.dataset.jb, 10) === labSim.jamBusterCount));
    cushionBtns.forEach((b) =>
      b.classList.toggle('is-active', Math.abs(parseFloat(b.dataset.cushion) - labSim.cushion) < 0.05)
    );
    solCardBuster.classList.toggle('is-active', labSim.jamBusterCount > 0);
    solCardCushion.classList.toggle('is-active--emerald', labSim.cushion > 1.1);
    solCardCushion.classList.toggle('is-active', labSim.cushion > 1.1);
    solCardAuto.classList.toggle('is-active--indigo', labSim.autonomousRatio > 0);
    solCardAuto.classList.toggle('is-active', labSim.autonomousRatio > 0);
  }

  jbBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const count = parseInt(btn.dataset.jb, 10);
      labSim.jamBusterCount = count;
      labSim.applyRoles();
      updateLabControlStyles();
      if (count > 0) stampLabEvent(`吸収車 ${count}台ON`);
    });
  });

  cushionBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = parseFloat(btn.dataset.cushion);
      labSim.cushion = val;
      updateLabControlStyles();
      if (val > 1.1) stampLabEvent('ゆとり運転ON');
    });
  });

  labAutoSlider.addEventListener('input', (e) => {
    const pct = parseInt(e.target.value, 10);
    labAutoVal.textContent = `${pct}%`;
    labSim.autonomousRatio = pct / 100;
    labSim.applyRoles();
    updateLabControlStyles();
  });
  labAutoSlider.addEventListener('change', (e) => {
    const pct = parseInt(e.target.value, 10);
    if (pct > 0) stampLabEvent(`自動運転 ${pct}%`);
  });

  labReseedBtn.addEventListener('click', () => {
    labSim.jamBusterCount = 0;
    labSim.cushion = 1.0;
    labSim.autonomousRatio = 0;
    labAutoSlider.value = '0';
    labAutoVal.textContent = '0%';
    labEventMarkers = [];
    labSim.seedActiveJam(10);
    labBaselineAvg = labSim.getStats().avgKmh;
    labBaselineFlow = labSim.getStats().flowPerHour;
    updateLabControlStyles();
  });

  labRingCanvas.addEventListener('mousemove', (e) => {
    labHoveredIdx = findRingCarAt(labRingCanvas, labSim, e.clientX, e.clientY);
  });
  labRingCanvas.addEventListener('mouseleave', () => {
    labHoveredIdx = -1;
  });
  labRingCanvas.addEventListener('click', (e) => {
    const idx = findRingCarAt(labRingCanvas, labSim, e.clientX, e.clientY);
    if (idx >= 0) {
      const car = labSim.triggerBrake(idx, 1.45);
      if (car) labRipples.push({ ang: (car.x / labSim.roadLength) * Math.PI * 2, born: performance.now() });
    }
  });

  function renderLabChart() {
    const { ctx, w, h } = setupCanvas(labChartCanvas);
    ctx.fillStyle = '#faf8f4';
    ctx.fillRect(0, 0, w, h);

    const padL = 40;
    const padR = 14;
    const padT = 22;
    const padB = 28;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const maxKmh = 72;
    const yOf = (kmh) => padT + (1 - Math.min(maxKmh, Math.max(0, kmh)) / maxKmh) * plotH;

    // Smooth-flow target zone (46..64 km/h)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.09)';
    ctx.fillRect(padL, yOf(64), plotW, yOf(46) - yOf(64));

    // Jam zone shading (0..30 km/h)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.05)';
    ctx.fillRect(padL, yOf(30), plotW, yOf(0) - yOf(30));

    // Horizontal grid lines
    ctx.font = '600 10px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'right';
    for (const v of [0, 20, 40, 60]) {
      const y = yOf(v);
      ctx.strokeStyle = v === 0 ? '#cbd5e1' : '#ebe6dc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.fillText(`${v}`, padL - 6, y + 3.5);
    }

    const series = labSim.speedSeries;
    if (series.length >= 2) {
      const tMin = series[0].t;
      const tMax = Math.max(tMin + 24, series[series.length - 1].t);
      const xOf = (t) => padL + ((t - tMin) / (tMax - tMin)) * plotW;

      // Event vertical pins
      for (const m of labEventMarkers) {
        if (m.t < tMin || m.t > tMax) continue;
        const mx = xOf(m.t);
        ctx.save();
        ctx.strokeStyle = 'rgba(8, 145, 178, 0.6)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(mx, padT);
        ctx.lineTo(mx, h - padB);
        ctx.stroke();
        ctx.restore();
        drawPillLabel(ctx, m.label, mx, padT + 12, '#0891b2', '#ffffff', w);
      }

      // 1. Minimum speed curve (dashed crimson)
      ctx.save();
      ctx.beginPath();
      series.forEach((pt, idx) => {
        const x = xOf(pt.t);
        const y = yOf(pt.minKmh);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.0;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.restore();

      // 2. Average speed curve (solid bold line)
      ctx.save();
      ctx.beginPath();
      series.forEach((pt, idx) => {
        const x = xOf(pt.t);
        const y = yOf(pt.avgKmh);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      const last = series[series.length - 1];
      ctx.strokeStyle = last.jammed === 0 ? '#0d9488' : '#1e293b';
      ctx.lineWidth = 2.8;
      ctx.stroke();

      const lx = xOf(last.t);
      ctx.fillStyle = last.jammed === 0 ? '#0d9488' : '#1e293b';
      ctx.beginPath();
      ctx.arc(lx, yOf(last.avgKmh), 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(lx, yOf(last.minKmh), 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.strokeStyle = '#d6cfc2';
    ctx.lineWidth = 1;
    ctx.strokeRect(padL, padT, plotW, plotH);

    // Subtle zone tags inside plot right margin
    ctx.font = '700 9.5px "Hiragino Kaku Gothic ProN", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(15, 118, 110, 0.72)';
    ctx.fillText('快適ゾーン', w - padR - 5, yOf(56));
    ctx.fillStyle = 'rgba(185, 28, 28, 0.65)';
    ctx.fillText('渋滞ゾーン', w - padR - 5, yOf(12));

    ctx.fillStyle = '#64748b';
    ctx.font = '600 10px "Hiragino Kaku Gothic ProN", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('経過時間 →', padL + plotW / 2, h - 8);
    ctx.textAlign = 'left';
    ctx.fillText('km/h', 5, 14);
  }

  function updateLabTelemetry() {
    const st = labSim.getStats();
    labAvgSpeedEl.textContent = Math.round(st.avgKmh);
    labMinSpeedEl.textContent = Math.round(st.minKmh);
    labJamCountEl.textContent = String(st.jammed);
    labFlowRateEl.textContent = Math.round(st.flowPerHour).toLocaleString();

    const anySolution = labSim.jamBusterCount > 0 || labSim.cushion > 1.1 || labSim.autonomousRatio > 0;
    const gainPct = labBaselineAvg > 1 ? Math.round(((st.avgKmh - labBaselineAvg) / labBaselineAvg) * 100) : 0;
    if (anySolution && gainPct >= 6 && st.jammed <= 2) {
      labSpeedDeltaEl.textContent = `+${gainPct}%`;
      labFlowDeltaEl.textContent = `+${gainPct}%`;
      labSpeedDeltaEl.classList.remove('is-hidden');
      labFlowDeltaEl.classList.remove('is-hidden');
    } else {
      labSpeedDeltaEl.classList.add('is-hidden');
      labFlowDeltaEl.classList.add('is-hidden');
    }

    if (st.jammed === 0 && st.minKmh >= 36) {
      labStatusBadge.textContent = '🎉 自然渋滞が完全に消滅！';
      labStatusBadge.className = 'stage-badge';
    } else if (st.jammed <= 4 && st.minKmh >= 16) {
      labStatusBadge.textContent = '渋滞が溶け始めています…';
      labStatusBadge.className = 'stage-badge stage-badge--warn';
    } else {
      labStatusBadge.textContent = '自然渋滞が発生中';
      labStatusBadge.className = 'stage-badge stage-badge--jam';
    }

    if (!anySolution) {
      labNarrationEl.innerHTML =
        '現在は全員が人間の通常運転で、赤い渋滞の塊がぐるぐる回っています。上の<strong>作戦①〜③</strong>のいずれかをオンにして、グラフと道路の変化を観察してみてください！';
    } else if (st.jammed === 0 && st.minKmh >= 36) {
      labNarrationEl.innerHTML =
        `<strong>見事、自然渋滞が消えました！</strong> もっとも遅い車でも時速 <strong>${Math.round(st.minKmh)} km/h</strong> でスムーズに流れています。道路を広げなくても「波を吸収するクッション」だけで渋滞は消せるのです。`;
    } else if (labSim.jamBusterCount >= 2) {
      labNarrationEl.innerHTML =
        '<strong>水色の渋滞吸収車（2台・全体の9%）</strong>が、前の渋滞に突っ込まずクッション車間を保って走っています。数秒で赤い波を丸ごと飲み込んでいきます…';
    } else if (labSim.jamBusterCount === 1) {
      labNarrationEl.innerHTML =
        '<strong>たった1台（全体の5%）の渋滞吸収車</strong>が前方にクッションを作り、赤い渋滞の塊を少しずつ飲み込んでいます。グラフの赤い破線（最低時速）が上がってくるのを見てください！';
    } else if (labSim.autonomousRatio >= 0.3) {
      labNarrationEl.innerHTML =
        `反応遅れのない<strong>自動運転・ACC車（紫・${Math.round(labSim.autonomousRatio * 100)}%）</strong>が各所で波を減衰させ、全体の最低速度がぐんぐん回復しています！`;
    } else {
      labNarrationEl.innerHTML =
        '対策をオンにしました！右のグラフの赤い破線（もっとも遅い車の時速）が0km/hから浮上してくる様子に注目してください。';
    }
  }

  /* ========================================================================
     Main Animation Loop + Crisp Resize Handler
     ======================================================================== */
  let lastFrameTime = performance.now();
  const accum = { hero: 0, domino: 0, ring: 0, sag: 0, lab: 0 };

  function stepFixed(sim, key, dtReal, speedMult) {
    if (speedMult <= 0) return;
    accum[key] += Math.min(dtReal, 0.08) * speedMult;
    const h = sim.dt || 0.05;
    let steps = 0;
    while (accum[key] >= h && steps < 10) {
      sim.step(h);
      accum[key] -= h;
      steps++;
    }
  }

  function renderAll(now) {
    renderHero(now);
    renderDomino();
    renderRingRoad(ringRoadCanvas, ringSim, {
      now,
      hoveredIdx: ringHoveredIdx,
      ripples: ringRipples,
      showTracked: true,
      showWaveBanner: true,
    });
    renderRingSpaceTime();
    updateRingTelemetry();
    renderSag(now);
    renderRingRoad(labRingCanvas, labSim, {
      now,
      hoveredIdx: labHoveredIdx,
      ripples: labRipples,
      showTracked: false,
      showWaveBanner: true,
    });
    renderLabChart();
    updateLabTelemetry();
  }

  function tick(now) {
    const dtReal = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    if (visibleMap.get('top')) {
      stepFixed(heroSim, 'hero', dtReal, 1.85 * heroSpeedFactor);
      renderHero(now);
    }

    if (visibleMap.get('ch1')) {
      if (!dominoPaused) {
        stepFixed(dominoSim, 'domino', dtReal, 1.45);
      }
      renderDomino();
    }

    if (visibleMap.get('ch2')) {
      stepFixed(ringSim, 'ring', dtReal, 2.35);
      renderRingRoad(ringRoadCanvas, ringSim, {
        now,
        hoveredIdx: ringHoveredIdx,
        ripples: ringRipples,
        showTracked: true,
        showWaveBanner: true,
      });
      renderRingSpaceTime();
      updateRingTelemetry();
    }

    if (visibleMap.get('ch3')) {
      stepFixed(sagSim, 'sag', dtReal, 1.9);
      renderSag(now);
    }

    if (visibleMap.get('ch4')) {
      stepFixed(labSim, 'lab', dtReal, 2.75);
      renderRingRoad(labRingCanvas, labSim, {
        now,
        hoveredIdx: labHoveredIdx,
        ripples: labRipples,
        showTracked: false,
        showWaveBanner: true,
      });
      renderLabChart();
      updateLabTelemetry();
    }

    requestAnimationFrame(tick);
  }

  let resizeRaf = null;
  window.addEventListener('resize', () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => renderAll(performance.now()));
  });

  renderAll(performance.now());
  requestAnimationFrame(tick);
})();
