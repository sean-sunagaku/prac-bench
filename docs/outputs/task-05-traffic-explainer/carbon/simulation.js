/* ==========================================================================
   なぜ、何もない高速道路で「自然渋滞」が生まれるのか？
   Interactive Traffic Physics & Visualization Engine (Vanilla JS, Zero-Dep)
   ========================================================================== */

(function () {
  "use strict";

  const FONT_STACK =
    '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "BIZ UDPGothic", "Yu Gothic UI", sans-serif';

  /* ------------------------------------------------------------------------
     1. Color, Math & HiDPI Canvas Helpers
  ------------------------------------------------------------------------ */
  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * clamp(t, 0, 1);
  }

  function lerpRGB(c1, c2, t) {
    const u = clamp(t, 0, 1);
    const r = Math.round(c1[0] + (c2[0] - c1[0]) * u);
    const g = Math.round(c1[1] + (c2[1] - c1[1]) * u);
    const b = Math.round(c1[2] + (c2[2] - c1[2]) * u);
    return `rgb(${r},${g},${b})`;
  }

  const COL_JAM = [239, 68, 68];    // #ef4444
  const COL_SLOW = [245, 158, 11]; // #f59e0b
  const COL_FAST = [16, 185, 129]; // #10b981

  function speedToColor(kmh) {
    if (kmh <= 22) {
      return lerpRGB([220, 38, 38], COL_JAM, kmh / 22);
    }
    if (kmh <= 56) {
      return lerpRGB(COL_JAM, COL_SLOW, (kmh - 22) / 34);
    }
    return lerpRGB(COL_SLOW, COL_FAST, (kmh - 56) / 22);
  }

  function setupResponsiveCanvas(canvas, logicalW, logicalH) {
    const state = { w: logicalW, h: logicalH, scale: 1 };

    function resize() {
      const parentW = canvas.parentElement ? canvas.parentElement.clientWidth : logicalW;
      const cssW = Math.max(280, parentW);
      const cssH = Math.round(cssW * (logicalH / logicalW));
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const targetW = Math.round(cssW * dpr);
      const targetH = Math.round(cssH * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      state.scale = targetW / logicalW;
    }

    resize();
    window.addEventListener("resize", resize);
    return {
      beginFrame(ctx) {
        resize();
        ctx.setTransform(state.scale, 0, 0, state.scale, 0, 0);
        ctx.clearRect(0, 0, logicalW, logicalH);
      },
      toLogical(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        return {
          x: (clientX - rect.left) * (logicalW / rect.width),
          y: (clientY - rect.top) * (logicalH / rect.height),
        };
      },
    };
  }

  function drawRoundedRect(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  /**
   * Draw a crisp top-down miniature car centered at (cx, cy) rotated by `angle` radians.
   */
  function drawVehicle(ctx, cx, cy, angle, carLenPx, carWidPx, opts) {
    const kmh = opts.kmh || 0;
    const braking = Boolean(opts.braking);
    const isAbsorber = Boolean(opts.isAbsorber);
    const isTracked = Boolean(opts.isTracked);
    const isTrigger = Boolean(opts.isTrigger);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const hw = carLenPx / 2;
    const hh = carWidPx / 2;

    // Highlight halo for tracked or trigger cars
    if (isTracked || isTrigger) {
      ctx.save();
      ctx.fillStyle = isTracked ? "rgba(56, 189, 248, 0.28)" : "rgba(250, 204, 21, 0.30)";
      drawRoundedRect(ctx, -hw - 5, -hh - 5, carLenPx + 10, carWidPx + 10, 7);
      ctx.fill();
      ctx.strokeStyle = isTracked ? "#38bdf8" : "#facc15";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
    }

    // Forward cushion radar arcs for Jam-Absorbing / ACC cars
    if (isAbsorber && opts.cushionActive) {
      ctx.save();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.92)";
      ctx.lineWidth = 1.9;
      for (let k = 1; k <= 3; k++) {
        const dist = hw + 5 + k * 6;
        ctx.globalAlpha = 0.95 - k * 0.22;
        ctx.beginPath();
        ctx.arc(dist - 6, 0, 5 + k * 2.5, -0.55, 0.55);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Brake light glow cone behind rear bumper
    if (braking) {
      const grad = ctx.createRadialGradient(-hw - 2, 0, 1, -hw - 6, 0, carWidPx * 1.35);
      grad.addColorStop(0, "rgba(255, 45, 32, 0.85)");
      grad.addColorStop(1, "rgba(255, 45, 32, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(-hw - 3, 0, carWidPx * 1.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // Drop shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
    drawRoundedRect(ctx, -hw + 1, -hh + 2, carLenPx, carWidPx, 4);
    ctx.fill();

    // Main chassis
    ctx.fillStyle = isAbsorber ? "#0ea5e9" : speedToColor(kmh);
    drawRoundedRect(ctx, -hw, -hh, carLenPx, carWidPx, 4.2);
    ctx.fill();

    // Subtle chassis outline
    ctx.strokeStyle = isAbsorber ? "#bae6fd" : "rgba(255, 255, 255, 0.32)";
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // Windshield & cabin roof detail
    ctx.fillStyle = "rgba(15, 23, 42, 0.68)";
    drawRoundedRect(ctx, -hw * 0.42, -hh * 0.72, carLenPx * 0.56, carWidPx * 0.72, 2.5);
    ctx.fill();

    // Cabin roof panel (lighter center)
    ctx.fillStyle = isAbsorber ? "#e0f2fe" : "rgba(255, 255, 255, 0.25)";
    drawRoundedRect(ctx, -hw * 0.26, -hh * 0.62, carLenPx * 0.30, carWidPx * 0.62, 2);
    ctx.fill();

    // Front headlights
    ctx.fillStyle = "rgba(254, 249, 195, 0.9)";
    ctx.fillRect(hw - 1.8, -hh + 1.5, 1.8, 2.6);
    ctx.fillRect(hw - 1.8, hh - 4.1, 1.8, 2.6);

    // Rear brake lamps
    if (braking) {
      ctx.fillStyle = "#ff1f1f";
      ctx.fillRect(-hw - 0.8, -hh + 1.0, 2.6, 3.4);
      ctx.fillRect(-hw - 0.8, hh - 4.4, 2.6, 3.4);
    } else {
      ctx.fillStyle = "rgba(185, 28, 28, 0.65)";
      ctx.fillRect(-hw, -hh + 1.4, 1.5, 2.6);
      ctx.fillRect(-hw, hh - 4.0, 1.5, 2.6);
    }

    ctx.restore();
  }

  /**
   * Stadium oval geometry helper: converts distance `meters` in [0, totalMeters)
   * into { x, y, angle } clockwise starting at the left of the top straightaway.
   */
  function createStadiumTrack(cx, cy, straightLenPx, radiusPx, totalMeters) {
    const arcLenPx = Math.PI * radiusPx;
    const perimPx = 2 * straightLenPx + 2 * arcLenPx;

    return {
      totalMeters,
      pxPerMeter: perimPx / totalMeters,
      cx,
      cy,
      straightLenPx,
      radiusPx,
      pointAtMeters(meters, radialOffsetPx = 0) {
        const m = ((meters % totalMeters) + totalMeters) % totalMeters;
        const p = (m / totalMeters) * perimPx;
        const r = radiusPx + radialOffsetPx;
        const xLeft = cx - straightLenPx / 2;
        const xRight = cx + straightLenPx / 2;

        // 1. Top straight: left -> right
        if (p < straightLenPx) {
          return { x: xLeft + p, y: cy - r, angle: 0 };
        }
        // 2. Right semicircle: -PI/2 -> +PI/2
        if (p < straightLenPx + arcLenPx) {
          const u = (p - straightLenPx) / arcLenPx;
          const theta = -Math.PI / 2 + u * Math.PI;
          return {
            x: xRight + Math.cos(theta) * r,
            y: cy + Math.sin(theta) * r,
            angle: theta + Math.PI / 2,
          };
        }
        // 3. Bottom straight: right -> left
        if (p < 2 * straightLenPx + arcLenPx) {
          const d = p - (straightLenPx + arcLenPx);
          return { x: xRight - d, y: cy + r, angle: Math.PI };
        }
        // 4. Left semicircle: +PI/2 -> +3*PI/2
        const u = (p - (2 * straightLenPx + arcLenPx)) / arcLenPx;
        const theta = Math.PI / 2 + u * Math.PI;
        return {
          x: xLeft + Math.cos(theta) * r,
          y: cy + Math.sin(theta) * r,
          angle: theta + Math.PI / 2,
        };
      },
      drawJamArc(ctx, cars, roadWidthPx) {
        // Highlight jammed vehicles along the ring with a subtle red outer halo
        const jammed = cars.filter((c) => c.v * 3.6 <= 20);
        if (jammed.length < 2) return;
        ctx.save();
        for (const jc of jammed) {
          const pt = this.pointAtMeters(jc.x - 2.25);
          ctx.fillStyle = "rgba(239, 68, 68, 0.16)";
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, roadWidthPx * 0.62, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      },
      drawRoad(ctx, roadWidthPx, sagZone) {
        const xLeft = cx - straightLenPx / 2;
        const xRight = cx + straightLenPx / 2;

        function traceCenterline(rad) {
          ctx.beginPath();
          ctx.moveTo(xLeft, cy - rad);
          ctx.lineTo(xRight, cy - rad);
          ctx.arc(xRight, cy, rad, -Math.PI / 2, Math.PI / 2);
          ctx.lineTo(xLeft, cy + rad);
          ctx.arc(xLeft, cy, rad, Math.PI / 2, (3 * Math.PI) / 2);
          ctx.closePath();
        }

        // Outer road shoulder
        ctx.save();
        traceCenterline(radiusPx);
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = roadWidthPx + 8;
        ctx.stroke();

        // Main dark asphalt
        traceCenterline(radiusPx);
        ctx.strokeStyle = "#111827";
        ctx.lineWidth = roadWidthPx;
        ctx.stroke();

        // Subtle uphill Sag highlight band on top straightaway if enabled
        if (sagZone && sagZone.enabled) {
          const p1 = this.pointAtMeters(sagZone.startM);
          const p2 = this.pointAtMeters(sagZone.endM);
          const grad = ctx.createLinearGradient(p1.x, 0, p2.x, 0);
          grad.addColorStop(0, "rgba(245, 158, 11, 0.05)");
          grad.addColorStop(0.5, "rgba(245, 158, 11, 0.32)");
          grad.addColorStop(1, "rgba(245, 158, 11, 0.05)");
          ctx.strokeStyle = grad;
          ctx.lineWidth = roadWidthPx - 2;
          ctx.beginPath();
          ctx.moveTo(p1.x, cy - radiusPx);
          ctx.lineTo(p2.x, cy - radiusPx);
          ctx.stroke();

          // Uphill chevron markers on asphalt
          ctx.fillStyle = "rgba(251, 191, 36, 0.42)";
          for (let x = p1.x + 18; x < p2.x - 12; x += 26) {
            ctx.beginPath();
            ctx.moveTo(x + 7, cy - radiusPx);
            ctx.lineTo(x - 3, cy - radiusPx - 6);
            ctx.lineTo(x - 1, cy - radiusPx);
            ctx.lineTo(x - 3, cy - radiusPx + 6);
            ctx.closePath();
            ctx.fill();
          }
        }

        // Center dashed guide line
        traceCenterline(radiusPx);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.20)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([8, 10]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      },
    };
  }

  /* ------------------------------------------------------------------------
     2. Core Delayed-IDM + Gipps Collision-Free Car-Following Engine
  ------------------------------------------------------------------------ */
  const FIXED_DT = 0.02;

  function stepTrafficLine(cars, dt, baseParams, ringLength, envHooks) {
    const { L, vMax, s0, a, b, delta = 4, startupScale = 1.0 } = baseParams;
    const N = cars.length;
    if (N === 0) return;

    // 1. Push history for reaction-delay lookup
    for (let i = 0; i < N; i++) {
      const c = cars[i];
      const delaySteps = Math.max(1, Math.round(c.tau / dt));
      c.hist.push({ x: c.x, v: c.v });
      while (c.hist.length > delaySteps + 1) {
        c.hist.shift();
      }
    }

    const sMin = 1.65;
    const bEmerg = 8.8;
    const bEst = 7.0;

    // 2. Compute accelerations
    for (let i = 0; i < N; i++) {
      const c = cars[i];
      const hasLeader = i > 0 || ringLength !== null;
      const leadIdx = i === 0 ? N - 1 : i - 1;
      const leadOffset = i === 0 && ringLength !== null ? ringLength : 0;

      // Press-and-hold manual brake pedal or timed brake override
      if (c.manualHoldBrake) {
        c.acc = c.v > 4.2 ? -3.1 : (4.2 - c.v) * 1.5;
      } else if (c.brakeTimer > 0) {
        c.brakeTimer -= dt;
        const targetV = c.brakeTargetV !== undefined ? c.brakeTargetV : 3.5;
        c.acc = c.v > targetV ? (c.brakeStrength || -4.2) : (targetV - c.v) * 1.5;
      } else if (c.leaderOverrideAcc !== undefined && c.leaderOverrideAcc !== null) {
        c.acc = c.leaderOverrideAcc;
      } else if (!hasLeader) {
        const vMaxI = c.vMax || vMax;
        c.acc = a * (1 - Math.pow(c.v / vMaxI, delta));
      } else {
        const lead = cars[leadIdx];
        const meD = c.hist[0];
        const leadD = lead.hist[0];
        const sPerceived = Math.max(0.35, leadD.x + leadOffset - meD.x - L);
        const dvPerceived = meD.v - leadD.v;
        const vP = meD.v;

        const Ti = c.T;
        const ai = c.a || a;
        const bi = c.b || b;
        const vMaxI = c.vMax || vMax;

        // Absorbers only apply heightened dv damping when approaching a slower vehicle (dv > 0)
        // so that when traffic ahead opens up (dv < 0), they accelerate cleanly without lagging!
        const effB = c.isAbsorber && dvPerceived <= 0 ? 2.4 : bi;
        const sStar =
          s0 + Math.max(0, vP * Ti + (vP * dvPerceived) / (2 * Math.sqrt(ai * effB)));
        let acc = ai * (1 - Math.pow(vP / vMaxI, delta) - Math.pow(sStar / sPerceived, 2));

        // Optional human standstill launch inertia (models real queue-discharge capacity drop)
        if (startupScale < 1.0 && !c.isAbsorber && acc > 0 && c.v < 3.8) {
          acc *= startupScale + (1 - startupScale) * (c.v / 3.8);
        }

        // Jam-Absorbing Driving (Nishinari lookahead cushion pacing)
        // Activates ONLY while a genuine jam (< 6.5 m/s = 23 km/h) exists ahead; once dissolved, cruises freely!
        c.cushionActive = false;
        if (c.isAbsorber && ringLength !== null && N > 6) {
          let minDownV = vMaxI;
          for (let look = 1; look <= 7; look++) {
            const idxA = (i - look + N) % N;
            const wrap = i - look < 0 ? ringLength : 0;
            const dist = cars[idxA].x + wrap - c.x;
            if (dist < 230 && cars[idxA].v < minDownV) {
              minDownV = cars[idxA].v;
            }
          }
          if (minDownV < 6.5) {
            const vTarget = Math.max(9.5, minDownV + 5.2);
            if (c.v > vTarget + 0.6 && sPerceived > 15) {
              const cushionDecel = (vTarget - c.v) * 0.58;
              if (cushionDecel < acc) {
                acc = cushionDecel;
                c.cushionActive = true;
              }
            }
          }
        }

        // Environmental hooks: gentle uphill Sag & subtle human pedal fluctuation
        if (envHooks) {
          if (envHooks.sagFn && !c.isAbsorber) {
            const posMod = ringLength
              ? ((c.x % ringLength) + ringLength) % ringLength
              : c.x;
            acc += envHooks.sagFn(posMod, c);
          }
          if (envHooks.humanWander && !c.isAbsorber) {
            c.wanderPhase = (c.wanderPhase || 0) + dt * c.wanderFreq;
            acc += Math.sin(c.wanderPhase) * envHooks.humanWander;
          }
        }

        c.acc = clamp(acc, -bEmerg, ai * 1.25);
      }

      // 3. Undelayed Gipps kinematic collision-free guard on actual physical gap
      if (hasLeader) {
        const lead = cars[leadIdx];
        const sAct = lead.x + leadOffset - c.x - L;
        const stopMargin = sAct - sMin + (lead.v * lead.v) / (2 * bEst);
        const vSafe = Math.sqrt(Math.max(0, 2 * bEmerg * stopMargin));
        if (c.v + c.acc * dt > vSafe) {
          c.acc = Math.max(-11.0, (vSafe - c.v) / dt);
        }
      }
    }

    // 4. Integrate velocities & positions
    for (let i = 0; i < N; i++) {
      const c = cars[i];
      c.v = Math.max(0, c.v + c.acc * dt);
      c.x += c.v * dt;
      if (c.v < c.minV) c.minV = c.v;
    }
  }

  /* ------------------------------------------------------------------------
     3. STEP 1 SIMULATION: 8-Car Moving Camera Platoon + Gap Cushion Meter
  ------------------------------------------------------------------------ */
  function initPlatoonSim() {
    const canvas = document.getElementById("platoonCanvas");
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    const W = 960;
    const H = 270;
    const view = setupResponsiveCanvas(canvas, W, H);

    const N = 8;
    const baseParams = { L: 4.5, vMax: 31.5, s0: 2.0, a: 0.75, b: 2.9, delta: 4 };
    const vCruise = 22.22; // 80.0 km/h

    let currentT = 0.90;
    let currentTau = 0.85;
    let slowMo = false;
    let cars = [];
    let ripples = [];
    let hitBoxes = [];
    let waveActive = false;
    let waveTimer = 0;
    let camCenterX = 0;
    let camScale = 3.0;

    // Build DOM bar elements (#8 on left -> #1 on right to match visual road lineup!)
    const barsContainer = document.getElementById("platoonBars");
    const barEls = [];
    for (let idx = N - 1; idx >= 0; idx--) {
      const col = document.createElement("div");
      col.className = "car-bar-col";
      col.innerHTML = `
        <div class="car-bar-track">
          <div class="car-bar-fill" style="height:100%;background:#10b981;"></div>
        </div>
        <span class="car-bar-speed">80<small> km/h</small></span>
        <span class="car-bar-delta">順調</span>
        <span class="car-bar-label">${idx + 1}号車${idx === 0 ? "(先頭)" : ""}</span>
      `;
      barsContainer.appendChild(col);
      barEls[idx] = {
        col,
        fill: col.querySelector(".car-bar-fill"),
        speed: col.querySelector(".car-bar-speed"),
        delta: col.querySelector(".car-bar-delta"),
      };
    }

    const calloutEl = document.getElementById("platoonCallout");

    function resetPlatoon() {
      const eqFactor = Math.sqrt(1 - Math.pow(vCruise / baseParams.vMax, 4));
      const sEq = (baseParams.s0 + vCruise * currentT) / eqFactor;
      cars = [];
      for (let i = 0; i < N; i++) {
        cars.push({
          id: i + 1,
          x: -i * (sEq + baseParams.L),
          v: vCruise,
          acc: 0,
          minV: vCruise,
          T: currentT,
          tau: currentTau,
          hist: [],
          brakeTimer: 0,
          manualHoldBrake: false,
        });
      }
      const span = cars[0].x - cars[N - 1].x;
      camCenterX = (cars[0].x + cars[N - 1].x) / 2;
      camScale = clamp(750 / Math.max(180, span + 30), 1.5, 3.3);
      waveActive = false;
      waveTimer = 0;
      ripples = [];
      updateBarUI();
      calloutEl.dataset.state = "ready";
      calloutEl.innerHTML =
        '👆 上の<strong>「先頭（1号車）が一瞬だけブレーキを踏む」</strong>を押すか、<strong>「🦶 長押しペダル」</strong>で自分の好きな強さのブレーキを試してみましょう。<strong>「🐢 スロー観察」</strong>をONにすると0.85秒の反応遅れがはっきり見えます！';
    }

    function triggerCarBrake(carIdx) {
      for (let i = 0; i < N; i++) {
        cars[i].minV = cars[i].v;
      }
      const target = cars[carIdx];
      target.brakeTimer = 2.05;
      target.brakeTargetV = vCruise - 4.3; // ~64.5 km/h (just a 15.5 km/h dip!)
      target.brakeStrength = -2.55;
      waveActive = true;
      waveTimer = 0;
      ripples.push({ carIdx, r: 6, alpha: 1.0 });
    }

    function updateBarUI() {
      let stoppedCount = 0;
      for (let i = 0; i < N; i++) {
        const minKmh = Math.round(cars[i].minV * 3.6);
        const drop = Math.max(0, 80 - minKmh);
        const pct = clamp((minKmh / 85) * 100, 4, 100);
        const el = barEls[i];
        el.fill.style.height = `${pct}%`;
        el.fill.style.backgroundColor = speedToColor(minKmh);
        el.speed.innerHTML = `${minKmh}<small> km/h</small>`;
        if (minKmh <= 2) {
          el.col.classList.add("stopped-alert");
          el.delta.textContent = "完全停止!";
          stoppedCount++;
        } else {
          el.col.classList.remove("stopped-alert");
          el.delta.textContent = drop >= 2 ? `-${drop} km/h` : "順調";
        }
      }

      if (waveActive && waveTimer > 2.0) {
        const firstMin = Math.round(cars[0].minV * 3.6);
        const lastMin = Math.round(cars[N - 1].minV * 3.6);
        if (stoppedCount > 0) {
          const firstStoppedIdx = cars.findIndex((c) => Math.round(c.minV * 3.6) <= 2);
          calloutEl.dataset.state = "jammed";
          calloutEl.innerHTML = `🚨 <strong>注目！</strong> 先頭の1号車は <strong>${firstMin} km/h（-${80 - firstMin}km/h）</strong>までしか減速していないのに、反応遅れで車間が詰まり「上乗せブレーキ」が連鎖した結果、<strong>${firstStoppedIdx + 1}号車以降は完全停止（0 km/h）</strong>してしまいました！`;
        } else if (lastMin >= firstMin + 3 && firstMin < 75) {
          calloutEl.dataset.state = "absorbed";
          calloutEl.innerHTML = `✨ <strong>波がクッションで吸収されました！</strong> 1号車は <strong>${firstMin} km/h</strong> まで減速しましたが、車間や反応にゆとりがあるため後ろへ行くほど減速が和らぎ、最後尾の8号車は <strong>${lastMin} km/h</strong> のままスムーズに通過しました！`;
        } else if (lastMin < firstMin - 4) {
          calloutEl.dataset.state = "amplified";
          calloutEl.innerHTML = `⚠️ <strong>減速が後ろへ増幅中…</strong> 1号車の減速（${firstMin} km/h）が、8号車では <strong>${lastMin} km/h</strong> まで大きく膨らんでいます。さらに後ろに車が続いていたら完全停止するペースです。`;
        }
      }
    }

    // Wire UI controls
    const btnBrake = document.getElementById("btnPlatoonBrake");
    const btnHold = document.getElementById("btnPlatoonHold");
    const btnReset = document.getElementById("btnPlatoonReset");
    const btnSlow = document.getElementById("btnPlatoonSlow");
    const sliderGap = document.getElementById("sliderPlatoonGap");
    const sliderTau = document.getElementById("sliderPlatoonTau");
    const valGap = document.getElementById("valPlatoonGap");
    const valTau = document.getElementById("valPlatoonTau");
    const presetContainer = document.getElementById("platoonPresets");

    function describeGap(T) {
      const approxM = Math.round(2 + T * 22.2);
      if (T < 0.85) return `詰めすぎ（車間 約${approxM}m）`;
      if (T < 1.05) return `やや詰め気味（約${approxM}m・標準）`;
      if (T < 1.40) return `適度なゆとり（約${approxM}m）`;
      return `ゆったり（約${approxM}m・クッション大）`;
    }

    function describeTau(tau) {
      if (tau <= 0.3) return `${tau.toFixed(2)} 秒（機械・ACC並み）`;
      if (tau <= 0.65) return `${tau.toFixed(2)} 秒（素早い）`;
      if (tau <= 0.95) return `${tau.toFixed(2)} 秒（人間の平均）`;
      return `${tau.toFixed(2)} 秒（ぼんやり・遅め）`;
    }

    function applyParamsFromSliders(shouldReset) {
      currentT = parseFloat(sliderGap.value);
      currentTau = parseFloat(sliderTau.value);
      valGap.textContent = describeGap(currentT);
      valTau.textContent = describeTau(currentTau);
      for (const c of cars) {
        c.T = currentT;
        c.tau = currentTau;
      }
      if (shouldReset) resetPlatoon();
    }

    btnBrake.addEventListener("click", () => {
      triggerCarBrake(0);
      btnBrake.classList.add("is-braking");
      setTimeout(() => btnBrake.classList.remove("is-braking"), 450);
    });

    // Tactile Press-and-Hold Brake Pedal on Car #1
    function startHoldBrake(e) {
      if (e) e.preventDefault();
      if (!cars[0]) return;
      if (!cars[0].manualHoldBrake) {
        for (let i = 0; i < N; i++) cars[i].minV = cars[i].v;
        waveActive = true;
        waveTimer = 0;
        ripples.push({ carIdx: 0, r: 6, alpha: 1.0 });
      }
      cars[0].manualHoldBrake = true;
      btnHold.classList.add("is-holding");
    }

    function stopHoldBrake() {
      if (!cars[0]) return;
      cars[0].manualHoldBrake = false;
      btnHold.classList.remove("is-holding");
    }

    btnHold.addEventListener("pointerdown", startHoldBrake);
    window.addEventListener("pointerup", stopHoldBrake);
    window.addEventListener("pointercancel", stopHoldBrake);

    btnSlow.addEventListener("click", () => {
      slowMo = !slowMo;
      btnSlow.classList.toggle("active-slow", slowMo);
      btnSlow.textContent = slowMo ? "🐢 スロー観察: ON (0.4x)" : "🐢 スロー観察: OFF";
    });

    btnReset.addEventListener("click", () => resetPlatoon());

    sliderGap.addEventListener("input", () => {
      presetContainer.querySelectorAll(".preset-pill").forEach((b) => b.classList.remove("active"));
      applyParamsFromSliders(true);
    });

    sliderTau.addEventListener("input", () => {
      presetContainer.querySelectorAll(".preset-pill").forEach((b) => b.classList.remove("active"));
      applyParamsFromSliders(true);
    });

    const PRESETS = {
      default: { T: 0.90, tau: 0.85 },
      wide: { T: 1.72, tau: 0.85 },
      distracted: { T: 0.90, tau: 1.15 },
      quick: { T: 0.95, tau: 0.20 },
    };

    presetContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".preset-pill");
      if (!btn) return;
      const p = PRESETS[btn.dataset.preset];
      if (!p) return;
      presetContainer.querySelectorAll(".preset-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      sliderGap.value = p.T;
      sliderTau.value = p.tau;
      applyParamsFromSliders(true);
      setTimeout(() => triggerCarBrake(0), 320);
    });

    canvas.addEventListener("pointerdown", (e) => {
      const pt = view.toLogical(e.clientX, e.clientY);
      let best = null;
      let bestDist = 36;
      for (const hb of hitBoxes) {
        const d = Math.hypot(pt.x - hb.sx, pt.y - hb.sy);
        if (d < bestDist) {
          bestDist = d;
          best = hb;
        }
      }
      if (best) {
        triggerCarBrake(best.idx);
      }
    });

    resetPlatoon();
    applyParamsFromSliders(true);

    function updatePhysics() {
      if (cars[0].brakeTimer <= 0 && !cars[0].manualHoldBrake) {
        cars[0].leaderOverrideAcc = clamp(
          (vCruise - cars[0].v) * 0.72,
          -2.0,
          baseParams.a * 1.15
        );
      } else {
        cars[0].leaderOverrideAcc = null;
      }

      stepTrafficLine(cars, FIXED_DT, baseParams, null, null);

      if (waveActive) {
        waveTimer += FIXED_DT;
      }
    }

    function render() {
      view.beginFrame(ctx);

      const frontX = cars[0].x;
      const backX = cars[N - 1].x;
      const spanM = Math.max(150, frontX - backX);
      const targetScale = clamp(770 / (spanM + 26), 1.35, 3.25);
      const targetCenter = (frontX + backX) / 2;
      camScale = lerp(camScale, targetScale, 0.08);
      camCenterX = lerp(camCenterX, targetCenter, 0.14);

      const worldToScreenX = (wx) => W * 0.5 + (wx - camCenterX) * camScale;

      // Sky/verge top & bottom shoulders
      ctx.fillStyle = "#151e2c";
      ctx.fillRect(0, 0, W, H);

      // Top HUD pill in upper-left shoulder (cleanly clear of all car stems!)
      ctx.save();
      ctx.fillStyle = "rgba(30, 41, 59, 0.85)";
      drawRoundedRect(ctx, 14, 10, 228, 22, 6);
      ctx.fill();
      ctx.fillStyle = "rgba(226, 232, 240, 0.82)";
      ctx.font = `700 11px ${FONT_STACK}`;
      ctx.textAlign = "left";
      ctx.fillText("🎥 進行方向 ➔（時速80kmの並走カメラ）", 22, 25);
      if (slowMo) {
        ctx.fillStyle = "rgba(245, 158, 11, 0.92)";
        drawRoundedRect(ctx, W - 182, 10, 168, 22, 6);
        ctx.fill();
        ctx.fillStyle = "#1e293b";
        ctx.font = `800 11px ${FONT_STACK}`;
        ctx.textAlign = "center";
        ctx.fillText("🐢 0.4倍速スロー観察中", W - 98, 25);
      }
      ctx.restore();

      // Scrolling distance posts along verge to convey 80 km/h speed!
      const roadTop = 96;
      const roadH = 104;
      const postSpacingM = 25;
      const firstPostM = Math.floor((camCenterX - W / camScale) / postSpacingM) * postSpacingM;
      const lastPostM = Math.ceil((camCenterX + W / camScale) / postSpacingM) * postSpacingM;

      for (let m = firstPostM; m <= lastPostM; m += postSpacingM) {
        const sx = worldToScreenX(m);
        if (sx < -20 || sx > W + 20) continue;
        ctx.fillStyle = "rgba(148, 163, 184, 0.35)";
        ctx.fillRect(sx - 1.5, roadTop - 10, 3, 8);
        ctx.fillRect(sx - 1.5, roadTop + roadH + 2, 3, 8);
        if (m % 50 === 0) {
          ctx.fillStyle = "rgba(148, 163, 184, 0.55)";
          ctx.font = `600 10px ${FONT_STACK}`;
          ctx.textAlign = "center";
          ctx.fillText(`${((m % 1000) + 1000) % 1000}m`, sx, roadTop + roadH + 23);
        }
      }

      // Main highway surface
      ctx.fillStyle = "#222b3a";
      ctx.fillRect(0, roadTop, W, roadH);

      // Edge lines
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.fillRect(0, roadTop + 4, W, 2.5);
      ctx.fillRect(0, roadTop + roadH - 6.5, W, 2.5);

      // Scrolling dashed lane divider
      ctx.strokeStyle = "rgba(255, 255, 255, 0.26)";
      ctx.lineWidth = 2;
      const dashCycleM = 18;
      const startDashM = Math.floor((camCenterX - W / camScale) / dashCycleM) * dashCycleM;
      ctx.beginPath();
      for (let m = startDashM; m <= lastPostM; m += dashCycleM) {
        const x1 = worldToScreenX(m);
        const x2 = worldToScreenX(m + 8);
        ctx.moveTo(x1, roadTop + roadH * 0.36);
        ctx.lineTo(x2, roadTop + roadH * 0.36);
      }
      ctx.stroke();

      const laneY = roadTop + roadH * 0.68;
      const carLenPx = Math.max(22, baseParams.L * camScale * 1.95);
      const carWidPx = Math.max(12, carLenPx * 0.50);

      // Draw Inter-Car Gap Cushion Bars between adjacent cars!
      for (let i = 1; i < N; i++) {
        const lead = cars[i - 1];
        const fol = cars[i];
        const gapM = Math.max(0, lead.x - fol.x - baseParams.L);
        const xFront = worldToScreenX(fol.x - baseParams.L / 2) + carLenPx / 2 + 3;
        const xRear = worldToScreenX(lead.x - baseParams.L / 2) - carLenPx / 2 - 3;

        if (xRear - xFront > 14) {
          let gapColor = "rgba(16, 185, 129, 0.45)";
          let textColor = "rgba(167, 243, 208, 0.78)";
          if (gapM < 9.5) {
            gapColor = "rgba(239, 68, 68, 0.88)";
            textColor = "#fca5a5";
          } else if (gapM < 17.5) {
            gapColor = "rgba(245, 158, 11, 0.72)";
            textColor = "#fde68a";
          }

          ctx.save();
          ctx.strokeStyle = gapColor;
          ctx.lineWidth = gapM < 9.5 ? 2.6 : 1.5;
          ctx.setLineDash(gapM < 9.5 ? [] : [3, 3]);
          ctx.beginPath();
          ctx.moveTo(xFront, laneY);
          ctx.lineTo(xRear, laneY);
          ctx.stroke();
          ctx.setLineDash([]);

          if (xRear - xFront >= 26) {
            const midGx = (xFront + xRear) / 2;
            ctx.fillStyle = textColor;
            ctx.font = `700 9.5px ${FONT_STACK}`;
            ctx.textAlign = "center";
            ctx.fillText(`${Math.round(gapM)}m`, midGx, laneY - 7);
          }
          ctx.restore();
        }
      }

      hitBoxes = [];

      // Draw brake ripples
      for (let rIdx = ripples.length - 1; rIdx >= 0; rIdx--) {
        const rp = ripples[rIdx];
        const c = cars[rp.carIdx];
        const sx = worldToScreenX(c.x - baseParams.L * 0.4);
        ctx.save();
        ctx.strokeStyle = `rgba(248, 113, 113, ${rp.alpha})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(sx, laneY, rp.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        rp.r += 1.4;
        rp.alpha -= 0.024;
        if (rp.alpha <= 0) ripples.splice(rIdx, 1);
      }

      // Draw each car + speed badge + reaction-delay callout
      for (let i = N - 1; i >= 0; i--) {
        const c = cars[i];
        const sx = worldToScreenX(c.x - baseParams.L / 2);
        const kmh = Math.round(c.v * 3.6);
        const isBraking = c.acc < -0.38 || c.brakeTimer > 0 || c.manualHoldBrake || kmh <= 2;

        drawVehicle(ctx, sx, laneY, 0, carLenPx, carWidPx, {
          kmh,
          braking: isBraking,
          isTrigger: i === 0 && (c.brakeTimer > 0 || c.manualHoldBrake),
        });

        hitBoxes.push({ idx: i, sx, sy: laneY });

        // Car number below car
        ctx.fillStyle = "rgba(226, 232, 240, 0.92)";
        ctx.font = `700 11px ${FONT_STACK}`;
        ctx.textAlign = "center";
        ctx.fillText(`${c.id}号車`, sx, laneY + carWidPx / 2 + 15);

        // Live speed pill above car (staggered neatly in upper lane / verge)
        const pillY = i % 2 === 0 ? roadTop - 30 : roadTop - 54;
        const speedStr = kmh <= 1 ? "0 km/h 停止!" : `${kmh} km/h`;
        const pillW = kmh <= 1 ? 78 : 58;

        ctx.strokeStyle = "rgba(148, 163, 184, 0.34)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, laneY - carWidPx / 2 - 2);
        ctx.lineTo(sx, pillY + 18);
        ctx.stroke();

        ctx.fillStyle = kmh <= 2 ? "#dc2626" : "rgba(15, 23, 42, 0.90)";
        drawRoundedRect(ctx, sx - pillW / 2, pillY, pillW, 20, 6);
        ctx.fill();
        ctx.strokeStyle = speedToColor(kmh);
        ctx.lineWidth = 1.3;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = `800 11px ${FONT_STACK}`;
        ctx.fillText(speedStr, sx, pillY + 14);

        // Reaction-delay badge right in the passing lane when leader is braking & follower hasn't reacted yet!
        if (i > 0) {
          const lead = cars[i - 1];
          const leadBraking = lead.acc < -0.65 || lead.brakeTimer > 0 || lead.manualHoldBrake;
          if (leadBraking && c.acc > -0.25 && c.v > lead.v + 0.7) {
            const tagY = roadTop + 21;
            ctx.save();
            ctx.fillStyle = "rgba(250, 204, 21, 0.95)";
            drawRoundedRect(ctx, sx - 37, tagY - 12, 74, 17, 5);
            ctx.fill();
            ctx.fillStyle = "#1e293b";
            ctx.font = `800 10px ${FONT_STACK}`;
            ctx.fillText("⏱反応遅れ!", sx, tagY);
            ctx.restore();
          }
        }
      }

      updateBarUI();
    }

    return {
      canvas,
      updatePhysics,
      render,
      getSimSpeed: () => (slowMo ? 0.38 : 1.0),
      isPaused: () => false,
    };
  }

  /* ------------------------------------------------------------------------
     4. STEP 2 SIMULATION: 800m Straight Highway + Scrolling Space-Time Waterfall
  ------------------------------------------------------------------------ */
  function initWaveCorridorSim() {
    const canvas = document.getElementById("waveCanvas");
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    const W = 960;
    const H = 440;
    const view = setupResponsiveCanvas(canvas, W, H);

    const ROAD_LEN_M = 800;
    const MARGIN_L = 54;
    const MARGIN_R = 918;
    const PLOT_W = MARGIN_R - MARGIN_L;
    const pxPerM = PLOT_W / ROAD_LEN_M;

    const baseParams = { L: 4.5, vMax: 29.2, s0: 2.0, a: 0.84, b: 3.1, delta: 4 };
    const vIn = 22.22; // 80 km/h

    let inflowDensity = 0.88; // 0.45 .. 1.0
    let simSpeed = 1.0;
    let paused = false;
    let simTime = 0;
    let nextCarId = 1;
    let cars = [];
    let historySlices = []; // { t, pts, jamCenter }
    let sliceAccum = 0;
    let originPin = null; // { x, t, culpritId, culpritExited }
    let trackedCarId = null;
    let hitBoxes = [];

    const culpritEl = document.getElementById("waveCulpritStatus");
    const jamEl = document.getElementById("waveJamStatus");
    const thoughtEl = document.getElementById("waveThoughtStatus");

    function getSpawnGap() {
      const tSpawn = lerp(1.95, 0.88, (inflowDensity - 0.45) / 0.55);
      const eqFactor = Math.sqrt(1 - Math.pow(vIn / baseParams.vMax, 4));
      return {
        T: lerp(1.45, 0.90, (inflowDensity - 0.45) / 0.55),
        sEq: (baseParams.s0 + vIn * tSpawn) / eqFactor,
      };
    }

    function populateSmoothRoad() {
      cars = [];
      historySlices = [];
      sliceAccum = 0;
      simTime = 0;
      originPin = null;
      trackedCarId = null;
      const { T, sEq } = getSpawnGap();
      for (let x = ROAD_LEN_M + 30; x >= -10; x -= sEq + baseParams.L) {
        cars.push({
          id: nextCarId++,
          x,
          v: vIn,
          acc: 0,
          minV: vIn,
          T,
          tau: 0.82,
          hist: [],
          brakeTimer: 0,
          isTrigger: false,
          wasJammed: false,
        });
      }
    }

    function resetCorridor(withPrewarmWave) {
      populateSmoothRoad();
      if (withPrewarmWave) {
        // Pre-warm 34s of traffic history + 1 initial brake wave so the Space-Time Waterfall is immediately rich and alive!
        for (let s = 0; s < 1700; s++) {
          if (s === 380) {
            const cand = cars.find((c) => c.x >= 620 && c.x <= 690) || cars[3];
            triggerBrakeOnCar(cand);
          }
          updatePhysics();
        }
        // Spotlight an upstream car currently approaching the live backward wave
        const jammedNow = cars.filter((c) => c.v * 3.6 <= 25 && c.x > 40 && c.x < ROAD_LEN_M);
        if (jammedNow.length > 0) {
          const tailM = Math.min(...jammedNow.map((c) => c.x));
          pickUpstreamTrackedCar(Math.max(55, tailM - 120));
        }
      } else {
        // Still pre-warm 10s of clean flow so the waterfall has smooth diagonal lines rather than a black void
        for (let s = 0; s < 500; s++) {
          updatePhysics();
        }
      }
      updateReadouts();
    }

    function triggerBrakeOnCar(car) {
      if (!car) return;
      for (const c of cars) c.isTrigger = false;
      car.isTrigger = true;
      car.brakeTimer = 2.75;
      car.brakeTargetV = 3.2;
      car.brakeStrength = -4.2;
      originPin = {
        x: clamp(car.x, 40, ROAD_LEN_M - 30),
        t: simTime,
        culpritId: car.id,
        culpritExited: false,
      };
      const currentTracked = cars.find((c) => c.id === trackedCarId);
      if (!currentTracked || currentTracked.x > car.x - 40) {
        pickUpstreamTrackedCar(car.x - 185);
      }
    }

    function pickUpstreamTrackedCar(preferX) {
      let best = null;
      let bestDist = Infinity;
      const targetX = preferX !== undefined ? preferX : 110;
      for (const c of cars) {
        if (c.x >= 15 && c.x <= ROAD_LEN_M * 0.72 && !c.isTrigger) {
          const d = Math.abs(c.x - targetX);
          if (d < bestDist) {
            bestDist = d;
            best = c;
          }
        }
      }
      if (best) {
        best.wasJammed = false;
        trackedCarId = best.id;
      }
    }

    // Wire buttons & sliders
    document.getElementById("btnWaveTrigger").addEventListener("click", () => {
      const candidate =
        cars.find((c) => c.x >= 560 && c.x <= 650 && c.v * 3.6 > 55) ||
        cars.find((c) => c.x >= 440 && c.x <= 700) ||
        cars[Math.floor(cars.length * 0.3)];
      triggerBrakeOnCar(candidate);
    });

    document.getElementById("btnWaveTrack").addEventListener("click", () => {
      const jammed = cars.filter((c) => c.v * 3.6 < 25 && c.x > 40 && c.x < ROAD_LEN_M);
      const tailX = jammed.length ? Math.min(...jammed.map((c) => c.x)) : 450;
      pickUpstreamTrackedCar(Math.max(45, tailX - 145));
    });

    document.getElementById("btnWaveReset").addEventListener("click", () => {
      resetCorridor(false);
    });

    const btnSpeed = document.getElementById("btnWaveSpeed");
    btnSpeed.addEventListener("click", () => {
      simSpeed = simSpeed === 1.0 ? 2.0 : 1.0;
      btnSpeed.textContent = `⏩ 速度: ${simSpeed}x`;
    });

    const btnPause = document.getElementById("btnWavePause");
    btnPause.addEventListener("click", () => {
      paused = !paused;
      btnPause.textContent = paused ? "▶ 再生する" : "⏸ 一時停止";
    });

    const sliderInflow = document.getElementById("sliderWaveInflow");
    const valInflow = document.getElementById("valWaveInflow");
    sliderInflow.addEventListener("input", () => {
      inflowDensity = parseFloat(sliderInflow.value);
      if (inflowDensity < 0.6) valInflow.textContent = "少ない（空き気味・自然消滅）";
      else if (inflowDensity < 0.8) valInflow.textContent = "ふつう";
      else valInflow.textContent = "多い（休日の高速道路）";
      const { T } = getSpawnGap();
      for (const c of cars) c.T = T;
    });

    canvas.addEventListener("pointerdown", (e) => {
      const pt = view.toLogical(e.clientX, e.clientY);
      if (pt.y > 168) return;
      let best = null;
      let bestDist = 30;
      for (const hb of hitBoxes) {
        const d = Math.hypot(pt.x - hb.sx, pt.y - hb.sy);
        if (d < bestDist) {
          bestDist = d;
          best = hb;
        }
      }
      if (best) {
        triggerBrakeOnCar(best.car);
      }
    });

    function getDriverThought(car, jamFrontX) {
      if (!car) return "「追跡ボタンを押すと、後ろから来る1台の目線を体験できます」";
      const kmh = Math.round(car.v * 3.6);
      if (kmh <= 6) {
        car.wasJammed = true;
        return "「うわ、完全に止まった…前に事故でもあったのかな？」";
      }
      if (kmh < 35 && car.acc < -0.2) {
        car.wasJammed = true;
        return "「おっ、前でブレーキランプの連鎖だ！減速しなきゃ！」";
      }
      if (car.wasJammed && kmh >= 42) {
        if (jamFrontX === null || car.x >= jamFrontX - 15) {
          return "「あれっ！？ 先頭に事故も何もないぞ！？ なんで止まってたの！？」";
        }
        return "「やっと順番が来て動き出したぞ…」";
      }
      return `「時速${kmh}kmで順調にドライブ中〜♪」`;
    }

    function updateReadouts() {
      if (!originPin) {
        culpritEl.textContent = "まだブレーキ発生なし";
      } else {
        const culprit = cars.find((c) => c.id === originPin.culpritId);
        if (!culprit || culprit.x > ROAD_LEN_M) {
          originPin.culpritExited = true;
          culpritEl.textContent = "とっくに画面の右外へ走り去りました！";
        } else {
          const kmh = Math.round(culprit.v * 3.6);
          culpritEl.textContent =
            culprit.brakeTimer > 0
              ? `地点 ${Math.round(originPin.x)}m でブレーキ中（${kmh} km/h）`
              : `${kmh} km/h に回復して前方へ走行中（${Math.round(culprit.x)}m）`;
        }
      }

      const jammed = cars.filter((c) => c.v * 3.6 <= 25 && c.x >= 0 && c.x <= ROAD_LEN_M);
      let jamFrontX = null;
      if (jammed.length >= 2) {
        const minX = Math.round(Math.min(...jammed.map((c) => c.x)));
        const maxX = Math.round(Math.max(...jammed.map((c) => c.x)));
        jamFrontX = maxX;
        jamEl.textContent = `${minX}m〜${maxX}m付近（${jammed.length}台）← 後ろへ逆走中！`;
        jamEl.style.color = "#dc2626";
      } else {
        jamEl.textContent = "渋滞なし（スムーズな流れ）";
        jamEl.style.color = "#059669";
      }

      const tracked = cars.find((c) => c.id === trackedCarId && c.x <= ROAD_LEN_M + 10);
      thoughtEl.textContent = getDriverThought(tracked, jamFrontX);
    }

    function updatePhysics() {
      simTime += FIXED_DT;
      stepTrafficLine(cars, FIXED_DT, baseParams, null, null);

      cars = cars.filter((c) => c.x < ROAD_LEN_M + 90);

      // Continuous inflow on left edge
      const { T, sEq } = getSpawnGap();
      const last = cars[cars.length - 1];
      if (!last || last.x >= sEq + baseParams.L) {
        const spawnX = last ? Math.min(0, last.x - (sEq + baseParams.L)) : 0;
        if (spawnX >= -25) {
          const vSpawn = last ? clamp(last.v, 6, vIn) : vIn;
          cars.push({
            id: nextCarId++,
            x: spawnX,
            v: vSpawn,
            acc: 0,
            minV: vSpawn,
            T,
            tau: 0.82,
            hist: [],
            brakeTimer: 0,
            isTrigger: false,
            wasJammed: false,
          });
        }
      }

      // Record Space-Time slice every 0.18s
      sliceAccum += FIXED_DT;
      if (sliceAccum >= 0.18) {
        sliceAccum = 0;
        const pts = [];
        let jamSum = 0;
        let jamN = 0;
        for (const c of cars) {
          if (c.x >= -15 && c.x <= ROAD_LEN_M + 15) {
            const kmh = c.v * 3.6;
            pts.push({
              id: c.id,
              x: c.x,
              kmh,
              tracked: c.id === trackedCarId,
              trigger: c.isTrigger,
            });
            if (kmh <= 22 && c.x >= 0 && c.x <= ROAD_LEN_M) {
              jamSum += c.x;
              jamN++;
            }
          }
        }
        historySlices.unshift({
          t: simTime,
          pts,
          jamCenter: jamN >= 2 ? jamSum / jamN : null,
        });
        while (historySlices.length > 215) {
          historySlices.pop();
        }
      }
    }

    function render() {
      view.beginFrame(ctx);

      const mToX = (m) => MARGIN_L + m * pxPerM;

      // Top Highway (0..162), Bottom Space-Time Map (162..440)
      ctx.fillStyle = "#151c28";
      ctx.fillRect(0, 0, W, 162);
      ctx.fillStyle = "#0f1520";
      ctx.fillRect(0, 162, W, H - 162);

      // Distance grid lines shared vertically across BOTH road & space-time diagram
      ctx.font = `600 10.5px ${FONT_STACK}`;
      ctx.textAlign = "center";
      for (let m = 0; m <= ROAD_LEN_M; m += 100) {
        const gx = mToX(m);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.13)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(gx, 142);
        ctx.lineTo(gx, H - 12);
        ctx.stroke();

        ctx.fillStyle = "rgba(148, 163, 184, 0.65)";
        ctx.fillText(`${m}m`, gx, 156);
      }

      // Highway Asphalt Band
      const roadY = 76;
      const roadH = 56;
      ctx.fillStyle = "#222b3a";
      ctx.fillRect(MARGIN_L, roadY, PLOT_W, roadH);
      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      ctx.fillRect(MARGIN_L, roadY + 2, PLOT_W, 2);
      ctx.fillRect(MARGIN_L, roadY + roadH - 4, PLOT_W, 2);

      // Dashed lane line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([9, 11]);
      ctx.beginPath();
      ctx.moveTo(MARGIN_L, roadY + roadH * 0.42);
      ctx.lineTo(MARGIN_R, roadY + roadH * 0.42);
      ctx.stroke();
      ctx.setLineDash([]);

      // Direction caption
      ctx.fillStyle = "rgba(226, 232, 240, 0.58)";
      ctx.font = `700 11px ${FONT_STACK}`;
      ctx.textAlign = "left";
      ctx.fillText("車の進行方向 ➔（左から右へ時速80kmで流入）", MARGIN_L + 4, roadY - 7);

      // Draw Fixed Origin Pin if a brake has occurred
      if (originPin) {
        const px = mToX(originPin.x);
        ctx.save();
        ctx.strokeStyle = "rgba(250, 204, 21, 0.55)";
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(px, roadY - 4);
        ctx.lineTo(px, H - 14);
        ctx.stroke();
        ctx.setLineDash([]);

        const pinText = `📍 最初のブレーキ地点 (${Math.round(originPin.x)}m)`;
        ctx.font = `800 10.5px ${FONT_STACK}`;
        const pinW = ctx.measureText(pinText).width + 20;
        const pinCx = clamp(px, MARGIN_L + pinW / 2, MARGIN_R - pinW / 2);
        ctx.fillStyle = "rgba(250, 204, 21, 0.95)";
        drawRoundedRect(ctx, pinCx - pinW / 2, 8, pinW, 21, 6);
        ctx.fill();
        ctx.fillStyle = "#1e293b";
        ctx.textAlign = "center";
        ctx.fillText(pinText, pinCx, 22.5);
        ctx.restore();
      }

      // Detect & highlight Jam Zone on the highway + Tail/Front labels
      const jammedCars = cars.filter((c) => c.v * 3.6 <= 25 && c.x >= 0 && c.x <= ROAD_LEN_M);
      let jamFrontX = null;
      if (jammedCars.length >= 2) {
        const minM = Math.min(...jammedCars.map((c) => c.x));
        const maxM = Math.max(...jammedCars.map((c) => c.x));
        jamFrontX = maxM;
        const jx1 = mToX(minM) - 8;
        const jx2 = mToX(maxM) + 8;
        const jw = Math.max(24, jx2 - jx1);

        ctx.save();
        ctx.fillStyle = "rgba(239, 68, 68, 0.22)";
        drawRoundedRect(ctx, jx1, roadY - 3, jw, roadH + 6, 8);
        ctx.fill();
        ctx.strokeStyle = "rgba(248, 113, 113, 0.85)";
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Tail (inflow) and Front (discharge) micro-labels inside top lane of road
        if (jw > 55) {
          ctx.font = `700 9.5px ${FONT_STACK}`;
          ctx.fillStyle = "#fecaca";
          ctx.textAlign = "right";
          ctx.fillText("次々追いつく➔", jx1 - 4, roadY + 17);
          ctx.fillStyle = "#bbf7d0";
          ctx.textAlign = "left";
          ctx.fillText("➔1台ずつ発進", jx2 + 4, roadY + 17);
        }

        // Floating backward wave pill
        const waveText = "⬅ 渋滞の波（後ろへ移動中）";
        ctx.font = `800 11px ${FONT_STACK}`;
        const waveW = ctx.measureText(waveText).width + 20;
        const midX = clamp((jx1 + jx2) / 2, MARGIN_L + waveW / 2, MARGIN_R - waveW / 2);
        ctx.fillStyle = "#ef4444";
        drawRoundedRect(ctx, midX - waveW / 2, 34, waveW, 21, 999);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(waveText, midX, 48);
        ctx.restore();
      }

      const wfTop = 188;
      const wfBot = H - 14;
      const wfHeight = wfBot - wfTop;
      const timeWindowSec = 36;
      const pxPerSec = wfHeight / timeWindowSec;

      // Draw Cars on Highway + subtle vertical ink-drop threads to Space-Time top seam
      const carY = roadY + roadH * 0.68;
      hitBoxes = [];
      for (let i = cars.length - 1; i >= 0; i--) {
        const c = cars[i];
        if (c.x < -8 || c.x > ROAD_LEN_M + 8) continue;
        const sx = mToX(c.x - baseParams.L / 2);
        const kmh = c.v * 3.6;
        const isTracked = c.id === trackedCarId;

        if (c.x >= 0 && c.x <= ROAD_LEN_M) {
          ctx.strokeStyle = isTracked
            ? "rgba(56, 189, 248, 0.45)"
            : "rgba(148, 163, 184, 0.12)";
          ctx.lineWidth = isTracked ? 1.5 : 0.8;
          ctx.beginPath();
          ctx.moveTo(sx, roadY + roadH + 2);
          ctx.lineTo(mToX(c.x), wfTop);
          ctx.stroke();
        }

        drawVehicle(ctx, sx, carY, 0, 13.5, 7.6, {
          kmh,
          braking: c.acc < -0.38 || c.brakeTimer > 0 || kmh <= 2,
          isTracked,
          isTrigger: c.isTrigger,
        });
        hitBoxes.push({ car: c, sx, sy: carY });

        if (c.isTrigger) {
          ctx.fillStyle = "#fde047";
          ctx.font = `800 10.5px ${FONT_STACK}`;
          ctx.textAlign = "center";
          ctx.fillText("⚡きっかけの車", sx, carY - 12);
        }
      }

      // Speech bubble above Tracked Car (shifted smoothly so it never overlaps the red wave pill!)
      const tracked = cars.find((c) => c.id === trackedCarId && c.x >= 0 && c.x <= ROAD_LEN_M);
      if (tracked) {
        const msg = getDriverThought(tracked, jamFrontX);
        ctx.save();
        ctx.font = `800 10.5px ${FONT_STACK}`;
        const tw = Math.min(340, ctx.measureText(msg).width + 20);
        const tx = clamp(mToX(tracked.x), MARGIN_L + tw / 2, MARGIN_R - tw / 2);
        // Place speech bubble on the bottom verge of the road if near the red wave pill at y=34
        const bubbleY = 135;
        ctx.fillStyle = "rgba(14, 165, 233, 0.96)";
        drawRoundedRect(ctx, tx - tw / 2, bubbleY, tw, 20, 999);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(msg, tx, bubbleY + 14);
        ctx.restore();
      }

      // ------------------------------------------------------------------
      // Bottom Panel: Scrolling Space-Time Waterfall Diagram
      // ------------------------------------------------------------------
      ctx.fillStyle = "rgba(30, 41, 59, 0.94)";
      ctx.fillRect(0, 162, W, 23);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = `700 11px ${FONT_STACK}`;
      ctx.textAlign = "left";
      ctx.fillText(
        "▼ 車の軌跡マップ（上の車から下へインクが垂れるように過去の記録が流れます）",
        MARGIN_L,
        177.5
      );
      ctx.textAlign = "right";
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText("↘ 右下がり＝前へ進む車 ／ ↙ 左下がりの赤い帯＝後ろへ逆走する渋滞", MARGIN_R, 177.5);

      // Time axis ticks on left margin
      ctx.font = `600 10px ${FONT_STACK}`;
      ctx.textAlign = "right";
      for (let sec = 0; sec <= 30; sec += 10) {
        const ty = wfTop + sec * pxPerSec;
        ctx.fillStyle = "rgba(148, 163, 184, 0.65)";
        ctx.fillText(sec === 0 ? "今" : `${sec}秒前`, MARGIN_L - 8, ty + 4);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.10)";
        ctx.beginPath();
        ctx.moveTo(MARGIN_L, ty);
        ctx.lineTo(MARGIN_R, ty);
        ctx.stroke();
      }

      // Build per-car polyline segments from historySlices
      ctx.save();
      ctx.beginPath();
      ctx.rect(MARGIN_L, wfTop, PLOT_W, wfHeight);
      ctx.clip();

      for (let s = 0; s < historySlices.length - 1; s++) {
        const cur = historySlices[s];
        const prev = historySlices[s + 1];
        const y1 = wfTop + (simTime - cur.t) * pxPerSec;
        const y2 = wfTop + (simTime - prev.t) * pxPerSec;
        if (y1 > wfBot) break;

        const prevMap = new Map();
        for (let k = 0; k < prev.pts.length; k++) {
          prevMap.set(prev.pts[k].id, prev.pts[k]);
        }

        for (let k = 0; k < cur.pts.length; k++) {
          const p1 = cur.pts[k];
          const p2 = prevMap.get(p1.id);
          if (!p2) continue;

          const x1 = mToX(p1.x);
          const x2 = mToX(p2.x);
          if (Math.abs(x1 - x2) > 60) continue;

          if (p1.tracked) {
            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 3.4;
          } else if (p1.trigger) {
            ctx.strokeStyle = "#facc15";
            ctx.lineWidth = 2.6;
          } else {
            ctx.strokeStyle = speedToColor(p1.kmh);
            ctx.lineWidth = p1.kmh <= 22 ? 2.9 : 1.5;
          }

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }

      // Direct callout badge on the diagonal red shockwave inside the waterfall!
      const jamSamples = [];
      for (let s = 0; s < historySlices.length; s++) {
        const sl = historySlices[s];
        const y = wfTop + (simTime - sl.t) * pxPerSec;
        if (sl.jamCenter !== null && y >= wfTop + 28 && y <= wfBot - 24) {
          jamSamples.push({ x: mToX(sl.jamCenter), y });
        }
      }
      if (jamSamples.length >= 18) {
        const midSample = jamSamples[Math.floor(jamSamples.length * 0.45)];
        const label = "↙ 渋滞の波（後ろへ逆走）";
        ctx.font = `800 10.5px ${FONT_STACK}`;
        const lw = ctx.measureText(label).width + 16;
        const lx = clamp(midSample.x + 18, MARGIN_L + 8, MARGIN_R - lw - 8);
        const ly = midSample.y - 10;
        ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
        drawRoundedRect(ctx, lx, ly, lw, 20, 6);
        ctx.fill();
        ctx.strokeStyle = "rgba(248, 113, 113, 0.85)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = "#fca5a5";
        ctx.textAlign = "left";
        ctx.fillText(label, lx + 8, ly + 14);
      }

      ctx.restore();

      updateReadouts();
    }

    // Start with pre-warmed wave so Step 2 immediately tells the complete backward-wave visual story!
    resetCorridor(true);

    return {
      canvas,
      updatePhysics,
      render,
      getSimSpeed: () => simSpeed,
      isPaused: () => paused,
    };
  }

  /* ------------------------------------------------------------------------
     5. STEP 3 SIMULATION: Stadium Ring Road + Gentle Uphill "Sag" + Density
  ------------------------------------------------------------------------ */
  function initRingSagSim() {
    const canvas = document.getElementById("ringCanvas");
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    const W = 960;
    const H = 390;
    const view = setupResponsiveCanvas(canvas, W, H);

    // 640m highway circuit: 12 cars (~53m spacing) = rock-solid stable; 24-25 cars (~26m spacing) = spontaneous phantom jam!
    const RING_LEN_M = 640;
    const track = createStadiumTrack(W / 2, 214, 430, 120, RING_LEN_M);
    const baseParams = { L: 4.5, vMax: 23.2, s0: 2.0, a: 0.85, b: 3.1, delta: 8 };

    let carCount = 24;
    let sagEnabled = true;
    let humanWanderAmp = 0.24;
    let simSpeed = 1.5;
    let paused = false;
    let cars = [];
    let hitBoxes = [];

    // Sag uphill sits along the top straightaway: 55m .. 185m
    const SAG_START_M = 55;
    const SAG_END_M = 185;

    function sagDecelFn(posMod) {
      if (!sagEnabled) return 0;
      if (posMod >= SAG_START_M && posMod <= SAG_END_M) {
        const u = (posMod - SAG_START_M) / (SAG_END_M - SAG_START_M);
        return -0.62 * Math.sin(u * Math.PI);
      }
      return 0;
    }

    function resetUniform(addHumanFluctuation) {
      cars = [];
      const spacing = RING_LEN_M / carCount;
      const initV = clamp((spacing - baseParams.L - 2.0) / 0.90, 8, 22.4);

      for (let i = 0; i < carCount; i++) {
        const theta = (2 * Math.PI * i) / carCount;
        cars.push({
          id: i + 1,
          x: -i * spacing,
          v: initV + (addHumanFluctuation ? Math.sin(theta) * 0.4 : 0),
          acc: 0,
          minV: initV,
          T: 0.90,
          tau: 0.86,
          hist: [],
          brakeTimer: 0,
          wanderPhase: theta,
          wanderFreq: 0.42 + (i % 4) * 0.08,
        });
      }

      // On a flat track without a hill, real human drivers still have occasional subtle pedal drift (~8-9 km/h)
      if (addHumanFluctuation && !sagEnabled && cars[0]) {
        cars[0].brakeTimer = 1.55;
        cars[0].brakeTargetV = initV - 2.7;
        cars[0].brakeStrength = -1.85;
      }
    }

    // UI Elements
    const countStat = document.getElementById("ringCountStat");
    const avgStat = document.getElementById("ringAvgStat");
    const minStat = document.getElementById("ringMinStat");
    const stateBadge = document.getElementById("ringStateBadge");

    const sliderCars = document.getElementById("sliderRingCars");
    const valCars = document.getElementById("valRingCars");
    const toggleSag = document.getElementById("toggleRingSag");
    const labelSag = document.getElementById("labelRingSag");
    const presetGroup = document.getElementById("ringPresets");

    function updateCarLabel() {
      let tag = "ふつう";
      if (carCount <= 14) tag = "スイスイ";
      else if (carCount <= 19) tag = "臨界の境目";
      else if (carCount <= 25) tag = "混雑";
      else tag = "大混雑";
      valCars.textContent = `${carCount} 台（${tag}）`;
      countStat.textContent = `${carCount} 台`;
    }

    function updateSagUI() {
      toggleSag.classList.toggle("active", sagEnabled);
      toggleSag.setAttribute("aria-pressed", String(sagEnabled));
      labelSag.textContent = sagEnabled
        ? "あり（上り坂で自然に減速）"
        : "なし（完全に平坦なコース）";
    }

    sliderCars.addEventListener("input", () => {
      carCount = parseInt(sliderCars.value, 10);
      presetGroup.querySelectorAll(".preset-pill").forEach((b) => b.classList.remove("active"));
      updateCarLabel();
      resetUniform(true);
    });

    toggleSag.addEventListener("click", () => {
      sagEnabled = !sagEnabled;
      humanWanderAmp = sagEnabled ? 0.24 : 0.42;
      presetGroup.querySelectorAll(".preset-pill").forEach((b) => b.classList.remove("active"));
      updateSagUI();
      resetUniform(true);
    });

    document.getElementById("btnRingUniform").addEventListener("click", () => {
      resetUniform(false);
    });

    document.getElementById("btnRingPoke").addEventListener("click", () => {
      const target = cars[0];
      if (target) {
        target.brakeTimer = 2.0;
        target.brakeTargetV = 4.0;
        target.brakeStrength = -3.8;
      }
    });

    presetGroup.addEventListener("click", (e) => {
      const btn = e.target.closest(".preset-pill");
      if (!btn) return;
      presetGroup.querySelectorAll(".preset-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const sc = btn.dataset.scenario;
      if (sc === "sparse") {
        carCount = 12;
        sagEnabled = true;
        humanWanderAmp = 0.24;
      } else if (sc === "sagJam") {
        carCount = 24;
        sagEnabled = true;
        humanWanderAmp = 0.24;
      } else if (sc === "nagoya") {
        carCount = 25;
        sagEnabled = false;
        humanWanderAmp = 0.42;
      }
      sliderCars.value = carCount;
      updateCarLabel();
      updateSagUI();
      resetUniform(true);
    });

    const btnSpeed = document.getElementById("btnRingSpeed");
    btnSpeed.addEventListener("click", () => {
      simSpeed = simSpeed === 1.5 ? 2.5 : simSpeed === 2.5 ? 1.0 : 1.5;
      btnSpeed.textContent = `⏩ 速度: ${simSpeed}x`;
    });

    const btnPause = document.getElementById("btnRingPause");
    btnPause.addEventListener("click", () => {
      paused = !paused;
      btnPause.textContent = paused ? "▶ 再生する" : "⏸ 一時停止";
    });

    canvas.addEventListener("pointerdown", (e) => {
      const pt = view.toLogical(e.clientX, e.clientY);
      let best = null;
      let bestDist = 30;
      for (const hb of hitBoxes) {
        const d = Math.hypot(pt.x - hb.sx, pt.y - hb.sy);
        if (d < bestDist) {
          bestDist = d;
          best = hb;
        }
      }
      if (best) {
        best.car.brakeTimer = 2.0;
        best.car.brakeTargetV = 2.5;
        best.car.brakeStrength = -4.0;
      }
    });

    updateCarLabel();
    updateSagUI();
    resetUniform(true);
    // Pre-advance 20 seconds on initial load so the default Sag scenario shows a vivid jam wave right away!
    for (let s = 0; s < 1000; s++) {
      stepTrafficLine(cars, FIXED_DT, baseParams, RING_LEN_M, {
        sagFn: sagDecelFn,
        humanWander: humanWanderAmp,
      });
    }

    function updatePhysics() {
      stepTrafficLine(cars, FIXED_DT, baseParams, RING_LEN_M, {
        sagFn: sagDecelFn,
        humanWander: humanWanderAmp,
      });
    }

    function render() {
      view.beginFrame(ctx);

      ctx.fillStyle = "#161f2d";
      ctx.fillRect(0, 0, W, H);

      const pSag1 = track.pointAtMeters(SAG_START_M);
      const pSag2 = track.pointAtMeters(SAG_END_M);

      if (sagEnabled) {
        ctx.save();
        const sagLabel = "⛰️ サグ部（ゆるい上り坂：無意識に速度が落ちる場所）";
        ctx.font = `800 11px ${FONT_STACK}`;
        const minBoxW = ctx.measureText(sagLabel).width + 32;
        const rawW = pSag2.x - pSag1.x + 32;
        const boxW = Math.max(minBoxW, rawW);
        const boxX = (pSag1.x + pSag2.x) / 2 - boxW / 2;

        ctx.fillStyle = "rgba(245, 158, 11, 0.14)";
        drawRoundedRect(ctx, boxX, 8, boxW, 50, 8);
        ctx.fill();
        ctx.strokeStyle = "rgba(245, 158, 11, 0.45)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "#fde68a";
        ctx.textAlign = "center";
        ctx.fillText(sagLabel, boxX + boxW / 2, 23);

        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(boxX + 18, 43);
        ctx.quadraticCurveTo(boxX + boxW * 0.34, 52, boxX + boxW * 0.56, 46);
        ctx.lineTo(boxX + boxW - 18, 33);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = "rgba(226, 232, 240, 0.82)";
        ctx.font = `700 11.5px ${FONT_STACK}`;
        ctx.textAlign = "center";
        ctx.fillText(
          "🔄 平坦コース（坂なし）—— 人間のわずかなアクセルのゆらぎだけで渋滞が生まれるか観察しよう",
          W / 2,
          34
        );
      }

      // Draw Stadium Road + Jam Cluster Glow
      track.drawRoad(ctx, 38, {
        enabled: sagEnabled,
        startM: SAG_START_M,
        endM: SAG_END_M,
      });
      track.drawJamArc(ctx, cars, 38);

      // Center Infield Explanations & Direction Arrows
      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(226, 232, 240, 0.88)";
      ctx.font = `800 13px ${FONT_STACK}`;
      ctx.fillText("↻ 車の進行方向（時計回り）", W / 2, 198);

      const minKmhNow = Math.round(Math.min(...cars.map((c) => c.v)) * 3.6);
      const avgKmhNow = Math.round(
        (cars.reduce((s, c) => s + c.v, 0) / Math.max(1, cars.length)) * 3.6
      );

      if (minKmhNow <= 14) {
        ctx.fillStyle = "#f87171";
        ctx.font = `800 13px ${FONT_STACK}`;
        ctx.fillText("↺ 赤い渋滞の塊は「反時計回り（後ろ向き）」に逆走中！", W / 2, 224);
      } else if (minKmhNow <= 45) {
        ctx.fillStyle = "#fbbf24";
        ctx.font = `700 12.5px ${FONT_STACK}`;
        ctx.fillText("⚡ 減速のゆらぎが後ろの車へ増幅しています…", W / 2, 224);
      } else {
        ctx.fillStyle = "rgba(148, 163, 184, 0.78)";
        ctx.font = `600 12px ${FONT_STACK}`;
        ctx.fillText("どの車でもクリックしてブレーキ実験ができます", W / 2, 224);
      }
      ctx.restore();

      // Draw Vehicles
      hitBoxes = [];
      for (let i = cars.length - 1; i >= 0; i--) {
        const c = cars[i];
        const pt = track.pointAtMeters(c.x - baseParams.L / 2);
        const kmh = c.v * 3.6;
        drawVehicle(ctx, pt.x, pt.y, pt.angle, 19, 10.5, {
          kmh,
          braking: c.acc < -0.38 || c.brakeTimer > 0 || kmh <= 2,
        });
        hitBoxes.push({ car: c, sx: pt.x, sy: pt.y });
      }

      // Update live metrics strip
      avgStat.textContent = `${avgKmhNow} km/h`;
      minStat.textContent = `${minKmhNow} km/h`;
      minStat.style.color = minKmhNow <= 15 ? "#dc2626" : "#0f172a";

      if (minKmhNow <= 14) {
        stateBadge.textContent = "🔴 自然渋滞が発生・持続中！";
        stateBadge.className = "ring-state-pill state-jam";
      } else if (minKmhNow <= 48) {
        stateBadge.textContent = "🟡 減速の波が増幅しかけています";
        stateBadge.className = "ring-state-pill state-warn";
      } else {
        stateBadge.textContent = "🟢 スムーズに流れています";
        stateBadge.className = "ring-state-pill state-ok";
      }
    }

    return {
      canvas,
      updatePhysics,
      render,
      getSimSpeed: () => simSpeed,
      isPaused: () => paused,
    };
  }

  /* ------------------------------------------------------------------------
     6. STEP 4 SIMULATION: Jam-Buster Lab (Jam-Absorbing Driving / ACC)
  ------------------------------------------------------------------------ */
  function initJamBusterSim() {
    const canvas = document.getElementById("busterCanvas");
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    const W = 960;
    const H = 360;
    const view = setupResponsiveCanvas(canvas, W, H);

    const RING_LEN_M = 840;
    const N = 24;
    const track = createStadiumTrack(W / 2, 184, 440, 118, RING_LEN_M);
    const baseParams = { L: 4.5, vMax: 23.6, s0: 2.0, a: 1.25, b: 3.35, delta: 10 };

    let absorberCount = 0;
    let simSpeed = 1.5;
    let paused = false;
    let cars = [];
    let hitBoxes = [];
    let baselineAvgKmh = 46;
    let baselineFlow = 22;

    function sagDecelFn(posMod) {
      if (posMod >= 90 && posMod <= 220) {
        return -0.44 * Math.sin(((posMod - 90) / 130) * Math.PI);
      }
      return 0;
    }

    function applyAbsorberRoles() {
      for (let i = 0; i < N; i++) {
        cars[i].isAbsorber = false;
        cars[i].T = 0.92;
        cars[i].tau = 0.84;
        cars[i].a = baseParams.a;
        cars[i].b = baseParams.b;
      }
      if (absorberCount > 0) {
        for (let k = 0; k < absorberCount; k++) {
          const idx = Math.floor((k * N) / absorberCount);
          cars[idx].isAbsorber = true;
          cars[idx].T = 0.82;
          cars[idx].tau = 0.08;
          cars[idx].a = 1.85;
          cars[idx].b = 0.80;
        }
      }
    }

    function buildActiveJamState() {
      cars = [];
      const spacing = RING_LEN_M / N;
      for (let i = 0; i < N; i++) {
        cars.push({
          id: i + 1,
          x: -i * spacing,
          v: 20.5,
          acc: 0,
          minV: 20.5,
          T: 0.92,
          tau: 0.84,
          hist: [],
          brakeTimer: 0,
          isAbsorber: false,
          cushionActive: false,
          wanderPhase: i * 1.1,
          wanderFreq: 0.7,
        });
      }
      // Pre-simulate 24 seconds with a sharp initial brake so Stage 4 opens with an active stop-and-go jam!
      for (let s = 0; s < 1200; s++) {
        if (s >= 30 && s < 135) {
          cars[0].v = Math.max(0, cars[0].v - 10.5 * FIXED_DT);
        }
        stepTrafficLine(cars, FIXED_DT, baseParams, RING_LEN_M, {
          sagFn: sagDecelFn,
          humanWander: 0.18,
        });
      }
      const initAvgV = cars.reduce((s, c) => s + c.v, 0) / N;
      baselineAvgKmh = Math.round(initAvgV * 3.6);
      baselineFlow = Math.round((N / RING_LEN_M) * initAvgV * 60);
      applyAbsorberRoles();
    }

    // Wire UI
    const busterBtns = document.getElementById("busterButtons");
    const avgSpeedEl = document.getElementById("busterAvgSpeed");
    const avgBarEl = document.getElementById("busterAvgBar");
    const speedDeltaEl = document.getElementById("busterSpeedDelta");
    const stoppedEl = document.getElementById("busterStoppedCount");
    const stoppedBarEl = document.getElementById("busterStoppedBar");
    const throughputEl = document.getElementById("busterThroughput");
    const flowDeltaEl = document.getElementById("busterFlowDelta");
    const verdictEl = document.getElementById("busterVerdict");

    busterBtns.addEventListener("click", (e) => {
      const btn = e.target.closest(".buster-pill");
      if (!btn) return;
      busterBtns.querySelectorAll(".buster-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      absorberCount = parseInt(btn.dataset.count, 10);
      // If user switches back to 0 cars after dissolving the jam, recreate the jam so they can compare!
      const currentlyStopped = cars.filter((c) => c.v * 3.6 <= 5).length;
      if (absorberCount === 0 && currentlyStopped === 0) {
        buildActiveJamState();
      } else {
        applyAbsorberRoles();
      }
    });

    document.getElementById("btnBusterMakeJam").addEventListener("click", () => {
      buildActiveJamState();
    });

    const btnSpeed = document.getElementById("btnBusterSpeed");
    btnSpeed.addEventListener("click", () => {
      simSpeed = simSpeed === 1.5 ? 2.5 : simSpeed === 2.5 ? 1.0 : 1.5;
      btnSpeed.textContent = `⏩ 速度: ${simSpeed}x`;
    });

    const btnPause = document.getElementById("btnBusterPause");
    btnPause.addEventListener("click", () => {
      paused = !paused;
      btnPause.textContent = paused ? "▶ 再生する" : "⏸ 一時停止";
    });

    canvas.addEventListener("pointerdown", (e) => {
      const pt = view.toLogical(e.clientX, e.clientY);
      let best = null;
      let bestDist = 30;
      for (const hb of hitBoxes) {
        const d = Math.hypot(pt.x - hb.sx, pt.y - hb.sy);
        if (d < bestDist) {
          bestDist = d;
          best = hb;
        }
      }
      if (best) {
        best.car.brakeTimer = 2.1;
        best.car.brakeTargetV = 1.5;
        best.car.brakeStrength = -4.4;
      }
    });

    buildActiveJamState();

    function updatePhysics() {
      stepTrafficLine(cars, FIXED_DT, baseParams, RING_LEN_M, {
        sagFn: sagDecelFn,
        humanWander: 0.16,
      });
    }

    function render() {
      view.beginFrame(ctx);

      ctx.fillStyle = "#161f2d";
      ctx.fillRect(0, 0, W, H);

      track.drawRoad(ctx, 38, { enabled: true, startM: 90, endM: 220 });
      track.drawJamArc(ctx, cars, 38);

      // Top label for subtle sag
      const ps1 = track.pointAtMeters(90);
      const ps2 = track.pointAtMeters(220);
      ctx.fillStyle = "rgba(253, 230, 138, 0.85)";
      ctx.font = `700 11px ${FONT_STACK}`;
      ctx.textAlign = "center";
      ctx.fillText("⛰️ 上り坂（サグ部）", (ps1.x + ps2.x) / 2, 34);

      const avgV = cars.reduce((s, c) => s + c.v, 0) / N;
      const avgKmh = Math.round(avgV * 3.6);
      const stoppedCars = cars.filter((c) => c.v * 3.6 <= 5).length;
      const flowPerMin = Math.round((N / RING_LEN_M) * avgV * 60);

      // Center Infield Live Banner
      ctx.save();
      ctx.textAlign = "center";
      if (stoppedCars === 0 && avgKmh >= 58) {
        ctx.fillStyle = "#34d399";
        ctx.font = `800 15px ${FONT_STACK}`;
        ctx.fillText("✨ 自然渋滞が完全に解消！ 全員が止まらず速く流れています", W / 2, 178);
      } else if (absorberCount > 0) {
        ctx.fillStyle = "#38bdf8";
        ctx.font = `800 14px ${FONT_STACK}`;
        ctx.fillText(
          `🛡️ 水色の渋滞吸収カー（${absorberCount}台）が車間クッションで波を吸収中…`,
          W / 2,
          178
        );
      } else {
        ctx.fillStyle = "#f87171";
        ctx.font = `800 14px ${FONT_STACK}`;
        ctx.fillText("🔴 自然渋滞が発生中！ 下のボタンで「渋滞吸収カー」を投入してみよう", W / 2, 178);
      }
      ctx.fillStyle = "rgba(148, 163, 184, 0.82)";
      ctx.font = `600 11.5px ${FONT_STACK}`;
      ctx.fillText("水色の車＝前方の減速を見て早めにゆっくり減速し、0km/h停止の連鎖を断ち切る車", W / 2, 202);
      ctx.restore();

      // Draw Cars
      hitBoxes = [];
      for (let i = N - 1; i >= 0; i--) {
        const c = cars[i];
        const pt = track.pointAtMeters(c.x - baseParams.L / 2);
        const kmh = c.v * 3.6;

        drawVehicle(ctx, pt.x, pt.y, pt.angle, 19.5, 10.8, {
          kmh,
          braking: !c.isAbsorber && (c.acc < -0.38 || c.brakeTimer > 0 || kmh <= 2),
          isAbsorber: c.isAbsorber,
          cushionActive: c.cushionActive,
        });
        hitBoxes.push({ car: c, sx: pt.x, sy: pt.y });
      }

      // Update Scoreboard DOM + Live Delta Badges
      avgSpeedEl.textContent = String(avgKmh);
      avgBarEl.style.width = `${clamp((avgKmh / 82) * 100, 8, 100)}%`;
      avgBarEl.style.backgroundColor = speedToColor(avgKmh);

      const diffSpeed = avgKmh - baselineAvgKmh;
      if (diffSpeed >= 4) {
        speedDeltaEl.textContent = `渋滞時より +${diffSpeed} km/h UP!`;
        speedDeltaEl.className = "delta-badge is-up";
      } else if (stoppedCars >= 3) {
        speedDeltaEl.textContent = "渋滞で低下中";
        speedDeltaEl.className = "delta-badge is-jam";
      } else {
        speedDeltaEl.textContent = "回復中…";
        speedDeltaEl.className = "delta-badge";
      }

      stoppedEl.textContent = String(stoppedCars);
      stoppedBarEl.style.width = `${clamp((stoppedCars / 8) * 100, 0, 100)}%`;

      throughputEl.textContent = String(flowPerMin);
      const diffFlow = flowPerMin - baselineFlow;
      if (diffFlow >= 2) {
        flowDeltaEl.textContent = `+${diffFlow} 台/分 UP!`;
        flowDeltaEl.className = "delta-badge is-up";
      } else if (stoppedCars >= 3) {
        flowDeltaEl.textContent = "発進ロスあり";
        flowDeltaEl.className = "delta-badge is-jam";
      } else {
        flowDeltaEl.textContent = "改善中";
        flowDeltaEl.className = "delta-badge";
      }

      if (stoppedCars === 0 && avgKmh >= 58) {
        verdictEl.textContent = "停止ゼロ！ 発進遅れのロスが消え、道路全体の通過台数も平均速度も大幅アップ！";
      } else if (absorberCount >= 6) {
        verdictEl.textContent = "クッション走行がブレーキの連鎖を断ち切り、渋滞がみるみる消えています！";
      } else {
        verdictEl.textContent = "一度0km/hで止まると発進に時間がかかり、結果的に全員が遅くなってしまいます。";
      }
    }

    return {
      canvas,
      updatePhysics,
      render,
      getSimSpeed: () => simSpeed,
      isPaused: () => paused,
    };
  }

  /* ------------------------------------------------------------------------
     7. Master Animation Scheduler (Viewport-Aware 60fps Loop + Scroll Spy)
  ------------------------------------------------------------------------ */
  function bootstrap() {
    const sims = [
      initPlatoonSim(),
      initWaveCorridorSim(),
      initRingSagSim(),
      initJamBusterSim(),
    ].filter(Boolean);

    const visibilityMap = new Map();
    const simObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibilityMap.set(entry.target, entry.isIntersecting);
        }
      },
      { rootMargin: "200px 0px 200px 0px", threshold: 0.01 }
    );

    for (const sim of sims) {
      visibilityMap.set(sim.canvas, true);
      simObserver.observe(sim.canvas);
      sim.render();
    }

    // Top scroll progress & active chapter highlight
    const progressEl = document.getElementById("scrollProgress");
    const chapters = document.querySelectorAll(".chapter");
    const navLinks = document.querySelectorAll(".step-link");

    function updateScrollUI() {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docH > 0 ? clamp((window.scrollY / docH) * 100, 0, 100) : 0;
      if (progressEl) progressEl.style.width = `${pct}%`;

      let activeId = "";
      const triggerY = window.scrollY + window.innerHeight * 0.35;
      chapters.forEach((ch) => {
        if (ch.offsetTop <= triggerY) {
          activeId = `#${ch.id}`;
        }
      });
      navLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === activeId);
      });
    }

    window.addEventListener("scroll", updateScrollUI, { passive: true });
    updateScrollUI();

    let lastNow = performance.now();
    const accumulators = sims.map(() => 0);

    function tick(now) {
      const rawDt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
      lastNow = now;

      for (let i = 0; i < sims.length; i++) {
        const sim = sims[i];
        if (!visibilityMap.get(sim.canvas)) continue;

        if (!sim.isPaused()) {
          accumulators[i] += rawDt * sim.getSimSpeed();
          let substeps = 0;
          while (accumulators[i] >= FIXED_DT && substeps < 8) {
            sim.updatePhysics();
            accumulators[i] -= FIXED_DT;
            substeps++;
          }
          if (substeps === 8) accumulators[i] = 0;
        }
        sim.render();
      }

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
