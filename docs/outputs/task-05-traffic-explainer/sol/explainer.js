(() => {
  const road = document.querySelector("#road");
  const plot = document.querySelector("#plot");
  const pin = document.querySelector("#car-pin");
  const queuePin = document.querySelector("#queue-pin");
  const previewLabel = document.querySelector("#preview-label");
  const clock = document.querySelector("#elapsed");
  const brake = document.querySelector("#brake");
  const brakeLabel = document.querySelector("#brake-label");
  const playback = document.querySelector("#playback");
  const playbackLabel = document.querySelector("#playback-label");
  const scrub = document.querySelector("#scrub");
  const setup = document.querySelector("#setup");
  const guidance = document.querySelector("#guidance");
  const affected = document.querySelector("#affected");
  const comparison = document.querySelector("#comparison");
  const stepImages = document.querySelectorAll(".step-image");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const exampleCharts = new Map();

  let spacing = document.querySelector('input[name="spacing"]:checked').value;
  let configuration = Traffic.setups[spacing];
  let playing = !motion.matches;
  let offset = 0;
  let elapsed = 0;
  let run = null;
  let runChart = null;
  let recorded = false;
  let animation = 0;
  let lastTime = null;

  function setText(node, value) {
    if (node.textContent !== value) node.textContent = value;
  }

  function exampleChart() {
    if (!exampleCharts.has(spacing)) {
      const cars = Traffic.makeLine(configuration);
      const exampleRun = Traffic.simulate(configuration, cars, Traffic.brakeTarget(cars));
      exampleCharts.set(spacing, TrafficDrawing.heatmap(exampleRun));
    }
    return exampleCharts.get(spacing);
  }

  function observation(frame) {
    if (!run) {
      return spacing === "close"
        ? "枠で囲んだ車が一度だけブレーキをかけます。すぐ後ろの車のブレーキランプに注目しましょう。"
        : "枠で囲んだ車に同じブレーキをかけます。赤い跡がどこまで伸びるか見てみましょう。";
    }
    if (elapsed < 0.7) {
      return "枠で囲んだ車がブレーキをかけ、すぐ後ろの車との間が縮まります。";
    }
    if (elapsed >= Traffic.DURATION) {
      if (frame.queue) return "18秒たっても、後ろには黄色い低速の列が残りました。「広い」でも同じブレーキを試せます。";
      if (frame.affected) return "近くの後続車に減速が伝わり、少しずつ弱まりました。「狭い」ときの赤い跡と比べてみましょう。";
      return "すぐ後ろの車への小さな影響で収まりました。前の車との間に余裕があると、減速の連鎖は弱まります。";
    }
    if (frame.queue) {
      return "黄色い帯が低速の列です。前の車が抜け、次の車が後ろから加わるので、列は左へ進みます。";
    }
    if (spacing === "close" && frame.affected >= 2) {
      return "最初の車が加速を始めても、後ろでは次の車が減速します。点線を下にたどると、減速する場所が左へ移っています。";
    }
    if (elapsed > 4 && spacing !== "close") {
      return "赤い跡が薄くなり、減速の影響が小さくなっていきます。";
    }
    return "後ろを走る車は、前の車に近づくと速度を落とします。次の車の動きに注目しましょう。";
  }

  function placePin(label, position) {
    const width = road.clientWidth;
    const anchor = position / Traffic.LENGTH * width;
    const halfPin = label.offsetWidth / 2;
    const center = Math.max(halfPin + 5, Math.min(width - halfPin - 5, anchor));
    label.style.left = `${center}px`;
    label.style.setProperty("--tail-position", `${halfPin + anchor - center}px`);
  }

  function drawCars(cars, target, queue = null) {
    TrafficDrawing.road(road, cars, target, queue);
    pin.hidden = Boolean(run && elapsed >= 1.2);
    if (!pin.hidden) {
      setText(pin, run ? "ブレーキをかけた車" : "ブレーキをかける車");
      placePin(pin, cars[target].position);
    }

    queuePin.hidden = !queue;
    if (queue) {
      const tail = cars[queue.tail].position;
      const span = Traffic.wrap(cars[queue.head].position - tail);
      placePin(queuePin, Traffic.wrap(tail + span / 2));
    }
  }

  function renderControls(frame) {
    const seconds = elapsed.toFixed(1);
    const canBrake = !run || recorded;
    const end = elapsed >= Traffic.DURATION;

    setText(clock, seconds);
    setText(brakeLabel, recorded ? "もう一度ブレーキ" : "1台にブレーキ");
    brake.setAttribute("aria-disabled", String(!canBrake));
    playback.dataset.playing = String(playing);
    setText(playbackLabel, playing ? "一時停止" : end ? "もう一度見る" : "再生");
    scrub.disabled = !run;
    scrub.value = seconds;
    scrub.setAttribute("aria-valuetext", `${seconds} 秒`);
    previewLabel.hidden = Boolean(run);
    setText(guidance, observation(frame));
    setText(affected, run ? String(frame.affected) : "—");
  }

  function render(forcePlot = false) {
    if (run) {
      const frame = Traffic.frameAt(run, elapsed);
      drawCars(frame.cars, run.target, frame.queue);
      TrafficDrawing.plot(plot, runChart, elapsed, false);
      renderControls(frame);
    } else {
      const cars = Traffic.makeLine(configuration, offset);
      drawCars(cars, Traffic.brakeTarget(cars));
      if (forcePlot) {
        TrafficDrawing.plot(plot, exampleChart(), 0, true);
        renderControls();
      }
    }
  }

  function updateElapsed(seconds) {
    elapsed = Math.min(Traffic.DURATION, Math.max(0, seconds));
    if (elapsed >= Traffic.DURATION) {
      playing = false;
      if (recorded) return;
      recorded = true;
      const result = comparison.querySelector(`[data-result="${spacing}"]`);
      setText(result, `${run.frames.at(-1).affected} 台`);
      result.setAttribute("data-tried", "");
      comparison.hidden = false;
    }
  }

  function animate(now) {
    animation = 0;
    const seconds = lastTime === null ? 0 : Math.min(0.08, (now - lastTime) / 1000);
    lastTime = now;
    if (run) {
      updateElapsed(elapsed + seconds);
    } else {
      offset = Traffic.wrap(offset + seconds * configuration.speed);
    }
    render();
    if (playing) animation = requestAnimationFrame(animate);
    else lastTime = null;
  }

  function refresh() {
    render(true);
    if (!playing) {
      cancelAnimationFrame(animation);
      animation = 0;
      lastTime = null;
    } else if (!animation) {
      animation = requestAnimationFrame(animate);
    }
  }

  function resetCourse() {
    run = null;
    runChart = null;
    recorded = false;
    offset = 0;
    elapsed = 0;
    lastTime = null;
    setText(setup, `${configuration.count}台 ／ 初めの車間 約${configuration.gap.toFixed(1)} m`);
    refresh();
  }

  for (const option of document.querySelectorAll('input[name="spacing"]')) {
    option.addEventListener("change", () => {
      spacing = option.value;
      configuration = Traffic.setups[spacing];
      resetCourse();
    });
  }

  brake.addEventListener("click", () => {
    if (run && !recorded) return;
    const cars = Traffic.makeLine(configuration, run ? 0 : offset);
    run = Traffic.simulate(configuration, cars, Traffic.brakeTarget(cars));
    runChart = TrafficDrawing.heatmap(run);
    recorded = false;
    elapsed = 0;
    playing = true;
    lastTime = null;
    refresh();
    if (window.matchMedia("(max-width: 780px)").matches && road.getBoundingClientRect().bottom > innerHeight - 45) {
      brake.closest(".controls").scrollIntoView({ block: "start", behavior: motion.matches ? "auto" : "smooth" });
    }
  });

  playback.addEventListener("click", () => {
    if (elapsed >= Traffic.DURATION) elapsed = 0;
    playing = !playing;
    refresh();
  });

  document.querySelector("#reset").addEventListener("click", resetCourse);

  scrub.addEventListener("input", () => {
    if (!run) return;
    playing = false;
    updateElapsed(scrub.valueAsNumber);
    refresh();
  });

  motion.addEventListener("change", ({ matches }) => {
    if (!matches) return;
    playing = false;
    refresh();
  });

  const resize = new ResizeObserver(() => {
    for (const canvas of stepImages) TrafficDrawing.stepDiagram(canvas, Number(canvas.dataset.step));
    render(true);
  });

  for (const canvas of [road, plot, ...stepImages]) resize.observe(canvas);
  resetCourse();
})();
