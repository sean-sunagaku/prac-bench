"use strict";

(() => {
  const byId = id => document.getElementById(id);
  const countInput = byId("density");
  const targetInput = byId("target");
  const timeInput = byId("experiment-time");
  const brakeButton = byId("brake");
  const pauseButton = byId("toggle-run");
  const roadCanvas = byId("road-canvas");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const guide = byId("mechanism");
  const guideLink = byId("guide-link");
  let model = new TrafficModel(Number(countInput.value));
  let paused = reduceMotion.matches;
  let rate = 1;
  let accumulator = 0;
  let lastFrame = null;
  let animation = null;
  let lastAnnouncement = "";

  const chart = new SpeedChart(byId("speed-chart"), byId("recording-label"), byId("chart-description"));
  const road = new RoadView(roadCanvas, byId("brake-pin"), () => road.draw(model, 1));
  timeInput.max = String(SpeedChart.duration);

  function setText(node, text) {
    if (node.textContent !== text) node.textContent = text;
  }

  function carName(index) {
    return String(index + 1).padStart(2, "0") + "号車";
  }

  function announce(message) {
    setText(byId("announcer"), message);
  }

  function updateSelector() {
    if (targetInput.options.length !== model.count) {
      const choices = document.createDocumentFragment();
      for (let i = 0; i < model.count; i++) choices.append(new Option(carName(i), String(i)));
      targetInput.replaceChildren(choices);
    }
    targetInput.value = String(model.target);
    countInput.value = String(model.count);
    countInput.setAttribute("aria-valuetext", model.count + "台");
    const progress = (model.count - Number(countInput.min)) / (Number(countInput.max) - Number(countInput.min));
    countInput.style.setProperty("--fill", (100 * progress).toFixed(2) + "%");
    setText(byId("car-count"), String(model.count));
    const startingGap = TrafficModel.length / model.count - TrafficModel.carLength;
    setText(byId("start-gap"), String(Number(startingGap.toFixed(1))));
  }

  function observation() {
    const event = model.event;
    if (!event) {
      return {
        phase: "ready",
        title: "黄色い車のすぐ後ろに注目。",
        body: "いまは3台とも同じ速さです。黄色い車にブレーキをかけると、1台後ろ、2台後ろの速度はいつ下がるでしょう？",
      };
    }
    const reached = Math.max(0, event.onsets.length - 1);
    if (model.time - event.lastSlow > 1.6 && model.time - event.start > TrafficModel.brakeDuration) {
      return {
        phase: "recovered",
        title: reached ? "大きな減速は" + reached + "台後ろで収まりました。" : "大きく減速したのは注目車だけでした。",
        body: "出発時より15％以上遅い車が消えました。車間に余裕があると、後ろの車に届くにつれて速度の変化が小さくなります。台数を増やして比べてみよう。",
      };
    }
    if (reached === 0) {
      return {
        phase: "brake",
        title: carName(event.origin) + "がブレーキをかけました。",
        body: "すぐ後ろの車は、元の速さで少し進みます。前の車との距離が縮まる様子を見てみよう。",
      };
    }
    if (reached === 1) {
      return {
        phase: "first",
        title: "1台後ろの車も減速を始めました。",
        body: "前の車に近づいたことに気づき、時間差で速度を落としました。次は、そのすぐ後ろの車に注目してみよう。",
      };
    }
    if (reached === model.count - 1) {
      return {
        phase: "lap",
        title: "一周分の車に減速が届きました。",
        body: "混雑の先頭から車が抜けても、列の後ろから別の車が入ります。赤い車が入れ替わりながら、混雑する場所が動きます。",
      };
    }
    const shift = TrafficModel.displacement(event.onsets.at(-2).position, event.onsets.at(-1).position);
    return {
      phase: "wave",
      title: "減速が" + reached + "台後ろまで伝わりました。",
      body: shift < -0.5
        ? "黄色い車は前へ進み、後ろから来た別の車が赤くなります。道路の内側の点をたどると、減速した場所が反時計回りに移るのがわかります。"
        : "グラフの谷が、後ろの車ほど遅れて現れます。3台の谷の深さを比べると、減速がどのくらい伝わったか読み取れます。",
    };
  }

  function updateTimeline() {
    const event = model.event;
    byId("time-controls").hidden = !event;
    if (!event) return;
    const elapsed = model.time - event.start;
    const inWindow = elapsed <= SpeedChart.duration + 1e-8;
    timeInput.hidden = !inWindow;
    byId("revisit").hidden = inWindow;
    byId("time-caption").hidden = !inWindow;
    byId("time-prefix").hidden = inWindow;
    byId("time-limit").hidden = !inWindow;
    setText(byId("time-value"), elapsed.toFixed(1));
    if (inWindow) {
      timeInput.value = String(elapsed);
      timeInput.style.setProperty("--fill", 100 * elapsed / SpeedChart.duration + "%");
      timeInput.setAttribute("aria-valuetext", elapsed.toFixed(1) + " 秒");
    }
  }

  function refreshReadings() {
    setText(byId("average-speed"), String(Math.round(model.averageSpeed * 3.6)));
    const reached = Math.max(0, (model.event?.onsets.length || 0) - 1);
    setText(byId("followers-reached"), String(reached));
    byId("reach-meter").hidden = reached === 0;
    byId("infield").classList.toggle("has-wave", reached > 0);
    updateTimeline();
    setText(byId("target-help"), model.event ? "車を選び直すと、等間隔に戻ります。" : "道路の車をタップして選べます。");
    const duringBrake = model.braking;
    const brakeLabel = duringBrake ? "ブレーキ中…" : model.event ? "もう一度試す" : paused ? "ブレーキして再生" : "1台にブレーキ";
    setText(brakeButton.querySelector("span"), brakeLabel);
    brakeButton.querySelector("use").setAttribute("href", model.event && !duringBrake ? "#icon-reset" : "#icon-brake");
    brakeButton.disabled = Boolean(duringBrake);
    brakeButton.classList.toggle("is-braking", Boolean(duringBrake));
    brakeButton.title = model.event && !duringBrake ? "等間隔に戻して同じブレーキをもう一度試す" : carName(model.target) + "に2.4秒間ブレーキをかける";
    if (duringBrake) {
      brakeButton.style.setProperty("--pulse-progress", 100 * (model.time - model.event.start) / TrafficModel.brakeDuration + "%");
    }
    const note = observation();
    setText(byId("note-title"), note.title);
    setText(byId("note-body"), note.body);
    byId("trail-key").hidden = !model.event?.onsets.length;
    const trail = model.event?.trail;
    const upstream = trail?.length > 1
      && model.time - trail.at(-1).time < 2.5
      && (trail.at(-2).index + 1) % model.count === trail.at(-1).index
      && TrafficModel.displacement(trail.at(-2).position, trail.at(-1).position) < -0.5;
    byId("wave-direction").hidden = !upstream;
    if (model.event && note.phase !== lastAnnouncement) {
      announce(note.title);
      lastAnnouncement = note.phase;
    }
    const slowCount = model.cars.reduce((n, _, i) => n + Number(model.isSlow(i)), 0);
    const verb = paused ? "一時停止中" : "時計回りに走行中";
    roadCanvas.setAttribute("aria-label", model.count + "台が" + verb + "。注目車は" + carName(model.target) + "。開始時から15％以上減速した車は" + slowCount + "台。");
  }

  function updateTransport() {
    const status = byId("run-status");
    status.classList.toggle("is-paused", paused);
    setText(status.querySelector("span"), paused ? "一時停止中" : "走行中");
    pauseButton.querySelector("use").setAttribute("href", paused ? "#icon-play" : "#icon-pause");
    setText(pauseButton.querySelector("span"), paused ? "再生する" : "一時停止");
    refreshReadings();
  }

  function scheduleFrame() {
    if (!paused && !document.hidden && animation === null) animation = requestAnimationFrame(frame);
  }

  function stopClock() {
    if (animation !== null) cancelAnimationFrame(animation);
    animation = null;
    lastFrame = null;
  }

  function frame(timestamp) {
    animation = null;
    if (paused || document.hidden) return;
    if (lastFrame !== null) accumulator += Math.min((timestamp - lastFrame) / 1000, 0.25) * rate;
    lastFrame = timestamp;
    let chartChanged = false;
    let refresh = false;
    while (accumulator >= TrafficModel.step) {
      model.advance();
      accumulator -= TrafficModel.step;
      if (chart.capture(model)) chartChanged = true;
      if (model.tick % SpeedChart.sampleEvery === 0) refresh = true;
    }
    road.draw(model, accumulator / TrafficModel.step);
    if (chartChanged) chart.draw();
    if (refresh || chartChanged) refreshReadings();
    scheduleFrame();
  }

  function setPaused(value) {
    paused = value;
    stopClock();
    accumulator = 0;
    for (const car of model.cars) car.previousPosition = car.position;
    road.draw(model);
    updateTransport();
    scheduleFrame();
  }

  function uniformTrafficAt(count, target, targetPosition) {
    const startPosition = targetPosition + target * TrafficModel.length / count;
    return new TrafficModel(count, target, startPosition);
  }

  function restart(count, target, targetPosition = TrafficModel.length * 0.17) {
    stopClock();
    accumulator = 0;
    model = uniformTrafficAt(count, target, targetPosition);
    lastAnnouncement = "";
    updateSelector();
    chart.restart(model, false);
    chart.draw();
    road.draw(model);
    updateTransport();
    scheduleFrame();
  }

  function startBrake() {
    if (model.event) restart(model.count, model.target, model.event.startPosition);
    model.brake();
    chart.restart(model, true);
    chart.draw();
    setPaused(false);
  }

  function seekBrakeTime(seconds) {
    if (!model.event) return;
    // Every pulse begins in uniform traffic. Replaying that initial state keeps
    // the delayed driver observations, plotted speeds and road positions in sync.
    const position = model.event.startPosition;
    model = uniformTrafficAt(model.count, model.target, position);
    model.brake();
    chart.restart(model, true);
    const endTick = Math.round(Math.max(0, Math.min(SpeedChart.duration, seconds)) / TrafficModel.step);
    while (model.tick < endTick) {
      model.advance();
      chart.capture(model);
    }
    chart.draw();
    setPaused(true);
  }

  function selectCar(index) {
    if (index < 0 || index >= model.count || index === model.target) return;
    restart(model.count, index, model.cars[index].position);
    announce(carName(index) + "を選びました。この車にブレーキをかけられます。");
  }

  pauseButton.addEventListener("click", () => setPaused(!paused));
  brakeButton.addEventListener("click", startBrake);
  timeInput.addEventListener("pointerdown", () => { if (!paused) setPaused(true); });
  timeInput.addEventListener("input", () => seekBrakeTime(Number(timeInput.value)));
  byId("revisit").addEventListener("click", () => {
    seekBrakeTime(0);
    timeInput.focus({ preventScroll: true });
  });
  byId("reset").addEventListener("click", () => {
    restart(model.count, model.target);
    announce(model.count + "台を等間隔に戻しました。");
  });
  countInput.addEventListener("input", () => {
    const count = Number(countInput.value);
    restart(count, Math.min(model.target, count - 1));
  });
  countInput.addEventListener("change", () => announce(model.count + "台が等間隔で出発します。"));
  targetInput.addEventListener("change", () => selectCar(Number(targetInput.value)));
  document.querySelectorAll('input[name="playback"]').forEach(input => {
    input.addEventListener("change", () => { if (input.checked) rate = Number(input.value); });
  });
  roadCanvas.addEventListener("pointermove", event => {
    if (event.pointerType !== "mouse") return;
    const i = road.carAt(event.clientX, event.clientY, false);
    roadCanvas.style.cursor = i >= 0 ? "pointer" : "default";
    roadCanvas.title = i >= 0 ? carName(i) + "を選ぶ" : "";
  });
  roadCanvas.addEventListener("click", event => {
    selectCar(road.carAt(event.clientX, event.clientY, event.pointerType === "touch"));
  });
  document.querySelectorAll(".preset").forEach(button => {
    button.addEventListener("click", () => {
      const count = Number(button.dataset.count);
      restart(count, Math.min(model.target, count - 1));
      byId("experiment").scrollIntoView({ behavior: "instant", block: "start" });
      pauseButton.focus({ preventScroll: true });
      startBrake();
    });
  });
  guideLink.addEventListener("click", () => { guide.open = true; });
  function updateNavigation() {
    const reading = guide.open && guide.getBoundingClientRect().top < window.innerHeight * 0.65;
    const simulationLink = document.querySelector('nav a[href="#experiment"]');
    const current = reading ? guideLink : simulationLink;
    const other = reading ? simulationLink : guideLink;
    if (current.getAttribute("aria-current") !== "location") current.setAttribute("aria-current", "location");
    other.removeAttribute("aria-current");
  }
  if (location.hash === "#mechanism") guide.open = true;
  window.addEventListener("hashchange", () => { if (location.hash === "#mechanism") guide.open = true; });
  guide.addEventListener("toggle", updateNavigation);
  window.addEventListener("scroll", updateNavigation, { passive: true });
  reduceMotion.addEventListener("change", event => { if (event.matches) setPaused(true); });
  document.addEventListener("visibilitychange", () => {
    stopClock();
    scheduleFrame();
  });
  const resize = new ResizeObserver(() => {
    road.draw(model, 1);
    chart.draw();
  });
  resize.observe(byId("scene"));
  resize.observe(byId("speed-chart"));
  document.fonts.ready.then(() => chart.draw());
  updateNavigation();
  restart(model.count, model.target);
})();
