(() => {
  const physics = KeiPhysics;
  const get = id => document.getElementById(id);
  const assets = id => 'assets/' + id + '.webp';
  const screens = { load: get('load-screen'), drive: get('drive-screen'), result: get('result-screen') };
  const headings = { load: get('load-heading'), drive: get('drive-heading'), result: get('result-heading') };
  const help = get('help-dialog');
  const pause = get('pause-dialog');
  const road = get('road');
  const arrival = get('arrival-truck');
  const depart = get('depart');
  const reset = get('reset-load');
  const unload = get('unload-item');
  const message = get('load-message');
  const driveMessage = get('drive-message');
  const manifest = new Map();
  const delivery = new Map();
  const bed = [];
  const keyboard = new Map();
  const pointers = new Map();
  const pedals = { throttle: get('throttle'), brake: get('brake') };
  const state = {
    phase: 'load', placement: physics.emptyLoad(), selected: null, dragged: null, run: null,
    frame: null, lastFrame: null, accumulator: 0, lastHud: 0, finishAt: null,
  };

  const statusNames = { intact: '無傷', damaged: '破損', lost: '落下', unloaded: '未積載' };
  const statusIcons = { intact: '✓', damaged: '!', lost: '×', unloaded: '–' };
  const labels = ['後ろ', '中央', '前'];
  const moneyFormat = new Intl.NumberFormat('ja-JP');
  const money = amount => '¥' + moneyFormat.format(amount);
  const timeLabel = seconds => Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
  let messageTimer;
  let recentEvents = [];
  let eventAt = 0;

  for (const item of physics.items) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'manifest-item';
    card.draggable = true;
    card.innerHTML = `
      <span class="item-picture"><img src="${assets(item.id)}" alt="" draggable="false"></span>
      <span class="item-copy">
        <span class="item-title">${item.name}</span>
        <span class="item-meta">${item.weight} kg ${item.fragile ? '<span class="fragile">割れ物</span>' : ''}</span>
      </span>
      <span class="item-check" aria-hidden="true">✓</span>`;
    card.addEventListener('click', event => {
      choose(item.id);
      if (event.detail === 0 && state.selected) bed.find(slot => slot.dataset.placement === 'true')?.focus();
    });
    card.addEventListener('dragstart', event => startDrag(event, item.id));
    card.addEventListener('dragend', endDrag);
    get('manifest-items').append(card);
    manifest.set(item.id, card);

    const row = document.createElement('li');
    row.innerHTML = `<img src="${assets(item.id)}" alt=""><span class="delivery-name">${item.name}</span><span></span>`;
    get('delivery-items').append(row);
    delivery.set(item.id, row.lastElementChild);
  }

  for (const index of [3, 4, 5, 0, 1, 2]) {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'bed-slot';
    slot.dataset.tier = index >= 3 ? 'upper' : 'lower';
    slot.addEventListener('click', () => {
      const id = state.placement[index];
      if (state.selected && state.selected !== id) place(state.selected, index);
      else if (id) choose(id);
      else announceLoad('先に積み込む荷物を選んでください。');
    });
    slot.addEventListener('dragstart', event => startDrag(event, state.placement[index]));
    slot.addEventListener('dragend', endDrag);
    slot.addEventListener('dragover', event => {
      if (!state.dragged) return;
      event.preventDefault();
      const valid = slot.dataset.placement === 'true';
      event.dataTransfer.dropEffect = valid ? 'move' : 'none';
      slot.dataset.dragging = String(valid);
      slot.dataset.invalid = String(!valid);
    });
    slot.addEventListener('dragleave', () => clearDragStyle(slot));
    slot.addEventListener('drop', event => {
      if (!state.dragged) return;
      event.preventDefault();
      place(state.dragged, index);
      endDrag();
    });
    bed[index] = slot;
    get('bed-grid').append(slot);
  }

  function announceLoad(text) {
    clearTimeout(messageTimer);
    message.textContent = text;
    message.hidden = !text;
    if (text) messageTimer = setTimeout(() => { message.hidden = true; }, 2600);
  }

  function choose(id) {
    state.selected = state.selected === id ? null : id;
    announceLoad('');
    renderLoad();
  }

  function place(id, index) {
    const next = physics.moveCargo(state.placement, id, index);
    if (!next) {
      const reason = state.placement[index] ? '空いているマスを選んでください。' : '上段に積むには、先に下段に荷物を置いてください。';
      announceLoad(reason);
      return;
    }
    state.placement = next;
    state.selected = null;
    announceLoad('');
    renderLoad();
  }

  function startDrag(event, id) {
    if (!id) {
      event.preventDefault();
      return;
    }
    state.dragged = id;
    state.selected = id;
    event.dataTransfer.setData('text/plain', id);
    event.dataTransfer.effectAllowed = 'move';
    renderLoad();
  }

  function clearDragStyle(slot) {
    delete slot.dataset.dragging;
    delete slot.dataset.invalid;
  }

  function endDrag() {
    state.dragged = null;
    for (const slot of bed) clearDragStyle(slot);
  }

  function renderLoad() {
    const metrics = physics.measureLoad(state.placement);
    for (const item of physics.items) {
      const card = manifest.get(item.id);
      const isLoaded = state.placement.includes(item.id);
      card.dataset.loaded = isLoaded;
      card.setAttribute('aria-pressed', state.selected === item.id);
      card.setAttribute('aria-label', item.name + ' ' + item.weight + ' kg' +
        (item.fragile ? ' 割れ物' : '') + (isLoaded ? ' 積載済み' : ''));
    }

    bed.forEach((slot, index) => {
      const id = state.placement[index];
      const column = index % 3;
      const top = index >= 3;
      slot.draggable = Boolean(id);
      slot.dataset.supported = !top || Boolean(state.placement[column]);
      if (state.selected) {
        slot.dataset.placement = Boolean(state.selected !== id && physics.moveCargo(state.placement, state.selected, index));
      } else {
        delete slot.dataset.placement;
      }
      slot.setAttribute('aria-pressed', Boolean(id && state.selected === id));
      slot.setAttribute('aria-label', (top ? '上段' : '下段') + ' ' + labels[column] + ' ' +
        (id ? physics.itemById[id].name : '空き'));
      const support = top && physics.itemById[state.placement[column]];
      if (support) slot.style.setProperty('--stack-sink', (106 - support.size * 94) + '%');
      if ((id || '') === slot.dataset.item) return;
      if (id) {
        const picture = document.createElement('img');
        picture.alt = '';
        picture.draggable = false;
        picture.src = assets(id);
        slot.style.setProperty('--cargo-height', (physics.itemById[id].size * 94) + '%');
        slot.replaceChildren(picture);
      } else {
        slot.replaceChildren();
      }
      slot.dataset.item = id || '';
    });

    get('loaded-count').textContent = metrics.count + ' / ' + physics.items.length;
    get('load-weight').textContent = metrics.weight;
    get('weight-meter').value = metrics.weight;
    get('rear-load').textContent = metrics.count ? (100 - metrics.front) + ' %' : '—';
    get('front-load').textContent = metrics.count ? metrics.front + ' %' : '—';
    get('balance-pointer').style.setProperty('--balance', metrics.front + '%');
    get('balance-advice').textContent = metrics.upperShare > 0.43 ? '上段が重く、段差で大きく揺れます。'
      : metrics.bias > 0.24 ? '前寄り。後ろにも重さを分けましょう。'
        : metrics.bias < -0.24 ? '後ろ寄り。前にも重さを分けましょう。'
          : metrics.count > 1 ? '前後のバランスは良好です。' : '重い荷物は下段の中央に。';
    const countLeft = physics.items.length - metrics.count;
    get('loading-note').textContent = !metrics.count ? '1個以上積むと出発できます。'
      : countLeft ? '積み残し ' + countLeft + ' 個は精算で減額。' : '全ての荷物を積み込みました。';
    depart.disabled = !metrics.count;
    reset.disabled = !metrics.count;
    unload.hidden = !state.selected || !state.placement.includes(state.selected);
  }

  reset.addEventListener('click', () => {
    state.placement = physics.emptyLoad();
    state.selected = null;
    renderLoad();
    announceLoad('荷物をすべて下ろしました。');
    manifest.get(physics.items[0].id).focus({ preventScroll: true });
  });
  unload.addEventListener('click', () => {
    const id = state.selected;
    place(id, -1);
    manifest.get(id)?.focus({ preventScroll: true });
  });

  function show(phase) {
    state.phase = phase;
    document.body.dataset.phase = phase;
    for (const [name, screen] of Object.entries(screens)) screen.hidden = name !== phase;
    let afterCurrent = false;
    for (const stage of document.querySelectorAll('[data-stage]')) {
      const current = stage.dataset.stage === phase;
      if (current) {
        stage.setAttribute('aria-current', 'step');
        afterCurrent = true;
      } else {
        stage.removeAttribute('aria-current');
      }
      stage.classList.toggle('is-complete', !afterCurrent);
    }
    window.scrollTo(0, 0);
    headings[phase].focus({ preventScroll: true });
  }

  function begin() {
    if (!state.placement.some(Boolean)) return;
    state.run = physics.start(state.placement);
    state.accumulator = 0;
    state.lastFrame = null;
    state.lastHud = 0;
    state.finishAt = null;
    recentEvents = [];
    eventAt = 0;
    clearPedals();
    show('drive');
    renderHud();
    KeiRoad.draw(road, state.run);
    state.frame = requestAnimationFrame(advance);
  }

  function returnToLoad() {
    if (state.frame !== null) cancelAnimationFrame(state.frame);
    state.frame = null;
    if (pause.open) pause.close();
    clearPedals();
    state.run = null;
    state.selected = null;
    announceLoad('');
    renderLoad();
    show('load');
  }

  depart.addEventListener('click', begin);
  get('retry').addEventListener('click', returnToLoad);
  get('return-load').addEventListener('click', returnToLoad);

  function statusMarkup(status, condition) {
    const percent = status === 'damaged' ? `<span class="condition">${condition}%</span>` : '';
    return `<span class="status-label is-${status}"><span class="status-icon" aria-hidden="true">${statusIcons[status]}</span>${statusNames[status]}${percent}</span>`;
  }

  const speed = get('speed');
  const needle = get('speed-needle');
  const hazardDisplay = get('hazard-display');
  const hazardName = get('hazard-name');
  const hazardDistance = get('hazard-distance');
  const hazardAdvice = get('hazard-advice');
  const tripDistance = get('trip-distance');
  const tripTime = get('drive-time');
  const tripMeter = get('trip-meter');
  const countLabels = { intact: get('intact-count'), damaged: get('damaged-count'), lost: get('lost-count') };

  function renderHud() {
    const run = state.run;
    const kmh = Math.round(run.speed * 3.6);
    speed.textContent = kmh;
    needle.style.setProperty('--speed', (-78 + kmh * (156 / 65)) + 'deg');
    tripDistance.textContent = Math.floor(run.position) + ' m';
    tripTime.textContent = timeLabel(run.time);
    tripMeter.value = run.position;

    const next = physics.course.hazards.find(hazard => run.position < hazard.at + hazard.width + 5.6);
    const distance = (next?.at ?? physics.course.length) - run.position - (next ? 5.6 : 0);
    hazardName.textContent = next?.name ?? 'お届け先';
    hazardDistance.textContent = distance > 0 ? Math.ceil(distance) + ' m' : next ? '通過中' : '到着';
    hazardAdvice.textContent = next ? '目安 ' + next.speed + ' km/h' : 'ゴールまであと少し';
    hazardDisplay.dataset.close = Boolean(next && distance < 23);
    hazardDisplay.dataset.fast = Boolean(next && distance < 23 && kmh > next.speed + 2);
    if (run.finished) showDriveMessage('お届け先に着きました！', 'arrived');
    else updateDriveMessage(run.time);
    renderCargo();
  }

  function renderCargo() {
    const counts = { intact: 0, damaged: 0, lost: 0, unloaded: 0 };
    for (const item of physics.items) {
      const cargo = state.run.slots.find(slot => slot?.id === item.id);
      const status = physics.itemStatus(cargo);
      counts[status] += 1;
      const row = delivery.get(item.id);
      const markup = statusMarkup(status, cargo?.condition);
      if (row.dataset.markup !== markup) {
        row.innerHTML = markup;
        row.dataset.markup = markup;
      }
    }
    for (const status of Object.keys(countLabels)) countLabels[status].textContent = counts[status];
  }

  function showDriveMessage(text, kind = '') {
    if (driveMessage.textContent !== text) driveMessage.textContent = text;
    driveMessage.dataset.kind = kind;
    driveMessage.hidden = !text;
  }

  function updateDriveMessage(time) {
    if (time < eventAt + 2.5 && recentEvents.length) {
      const kind = recentEvents.some(event => event.type === 'lost') ? 'lost' : 'damaged';
      const ids = [...new Set(recentEvents.filter(event => event.type === kind).map(event => event.id))];
      const names = ids.map(id => physics.itemById[id].name).join('・');
      showDriveMessage(names + (kind === 'lost' ? ' が落下！' : ' が破損！'), kind);
    } else {
      recentEvents = [];
      showDriveMessage(state.run.started ? '' : 'アクセルを長押しして発進');
    }
  }

  function input() {
    const pressed = [...keyboard.values(), ...pointers.values()];
    return { throttle: pressed.includes('throttle'), brake: pressed.includes('brake') };
  }

  function renderPedals() {
    const buttons = input();
    for (const [action, pedal] of Object.entries(pedals)) pedal.dataset.pressed = buttons[action];
  }

  function clearPedals() {
    keyboard.clear();
    pointers.clear();
    renderPedals();
  }

  function togglePause() {
    if (state.phase !== 'drive' || help.open || state.run.finished) return;
    clearPedals();
    state.lastFrame = null;
    if (pause.open) pause.close();
    else pause.showModal();
  }

  get('pause-button').addEventListener('click', togglePause);
  get('resume').addEventListener('click', togglePause);
  get('help-button').addEventListener('click', () => {
    clearPedals();
    state.lastFrame = null;
    help.showModal();
  });

  const actionKeys = {
    ArrowRight: 'throttle', KeyD: 'throttle',
    ArrowLeft: 'brake', KeyA: 'brake',
  };
  document.addEventListener('keydown', event => {
    if (state.phase !== 'drive' || help.open || pause.open || state.run.finished) return;
    if (event.code === 'Escape' || event.code === 'KeyP') {
      event.preventDefault();
      if (!event.repeat) togglePause();
      return;
    }
    const action = actionKeys[event.code] ||
      (event.code === 'Space' || event.code === 'Enter' ? document.activeElement?.dataset.pedal : null);
    if (!action) return;
    event.preventDefault();
    keyboard.set(event.code, action);
    renderPedals();
  });
  document.addEventListener('keyup', event => {
    if (!keyboard.delete(event.code)) return;
    event.preventDefault();
    renderPedals();
  });

  for (const [action, pedal] of Object.entries(pedals)) {
    pedal.addEventListener('pointerdown', event => {
      if (event.button !== 0 || state.phase !== 'drive' || state.run.finished) return;
      event.preventDefault();
      pedal.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, action);
      renderPedals();
    });
    const release = event => {
      if (pointers.delete(event.pointerId)) renderPedals();
    };
    pedal.addEventListener('pointerup', release);
    pedal.addEventListener('pointercancel', release);
    pedal.addEventListener('lostpointercapture', release);
    pedal.addEventListener('contextmenu', event => event.preventDefault());
  }

  window.addEventListener('blur', clearPedals);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.phase === 'drive' && state.run.started && !pause.open) togglePause();
  });

  function advance(now) {
    const run = state.run;
    if (state.phase !== 'drive') return;
    const previous = state.lastFrame;
    state.lastFrame = now;
    if (help.open || pause.open) {
      state.lastFrame = null;
      state.frame = requestAnimationFrame(advance);
      return;
    }
    state.accumulator += previous === null ? 0 : Math.min(0.10, (now - previous) / 1000);
    const controls = input();
    const stepTime = 1 / 120;
    while (state.accumulator >= stepTime && !run.finished) {
      physics.step(run, controls, stepTime);
      state.accumulator -= stepTime;
    }

    if (run.events.length) {
      recentEvents.push(...run.events.splice(0));
      eventAt = run.time;
      renderCargo();
      updateDriveMessage(run.time);
    }
    if (!run.finished || state.finishAt === null) KeiRoad.draw(road, run);
    if (now >= state.lastHud + 75) {
      state.lastHud = now;
      renderHud();
    }
    if (run.finished) {
      if (state.finishAt === null) {
        state.finishAt = now + 625;
        renderHud();
        clearPedals();
      } else if (now >= state.finishAt) {
        state.frame = null;
        showResult(run);
        return;
      }
    }
    state.frame = requestAnimationFrame(advance);
  }

  function showResult(run) {
    const bill = physics.settle(run);
    const counts = { intact: 0, damaged: 0, lost: 0, unloaded: 0 };
    get('receipt-items').replaceChildren(...bill.rows.map(({ item, status, condition, fee }) => {
      counts[status] += 1;
      const row = document.createElement('tr');
      row.innerHTML = `<td><span><img src="${assets(item.id)}" alt="">${item.name}</span></td><td>${statusMarkup(status, condition)}</td><td>${money(fee)}</td>`;
      return row;
    }));
    headings.result.textContent = counts.intact + counts.damaged > 0 ? '配達完了！' : 'ゴール到着！';
    get('arrival-summary').textContent = '無傷 ' + counts.intact + ' 個 · 破損 ' + counts.damaged + ' 個 · 落下 ' + counts.lost + ' 個';
    get('base-fee').textContent = money(bill.base);
    get('cargo-fee').textContent = money(bill.fees);
    get('total-fee').textContent = money(bill.total);
    const timeBonus = get('time-bonus');
    timeBonus.textContent = (bill.bonus ? '+' : '') + money(bill.bonus);
    timeBonus.classList.toggle('is-bonus', bill.bonus > 0);
    for (const [id, amount] of [['damage-fee', bill.deducted.damaged], ['lost-fee', bill.deducted.lost],
      ['unloaded-fee', bill.deducted.unloaded]]) {
      const fee = get(id);
      fee.textContent = (amount ? '−' : '') + money(amount);
      fee.classList.toggle('is-deduction', amount > 0);
    }
    get('result-time').textContent = '走行時間 ' + timeLabel(run.time);
    show('result');
    KeiRoad.drawArrival(arrival, run);
  }

  function redraw() {
    if (state.phase === 'drive') KeiRoad.draw(road, state.run);
    if (state.phase === 'result') KeiRoad.drawArrival(arrival, state.run);
  }
  const observer = new ResizeObserver(redraw);
  observer.observe(road);
  observer.observe(arrival);
  KeiRoad.ready.then(redraw);

  renderLoad();
})();
