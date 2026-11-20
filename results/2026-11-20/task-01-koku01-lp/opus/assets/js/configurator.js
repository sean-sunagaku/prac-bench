/* 体験デモ②：購入シミュレーター
 * プラン × カラー × オプションで価格が変わる。
 * 在庫切れ（完売）の組み合わせは input を disabled にして選べないようにする。
 */
(function () {
  'use strict';
  var KOKU = window.KOKU || {};
  var form = document.getElementById('config');
  if (!form) return;

  /* ---------- 価格（支給資料どおり・税込） ---------- */
  var PRICE = {
    plan: { early: 14800, regular: 18500 },   // 先行予約早割 / 一般予定価格
    color: { silver: 0, black: 0, brass: 3000 },
    mat: 2400
  };
  var NAME = {
    plan: { early: '先行予約早割', regular: '一般予約' },
    color: { silver: 'アルマイトシルバー', black: 'マットブラック', brass: '真鍮リミテッド' },
    mat: '専用フェルトデスクマット'
  };

  /* ---------- 在庫（シミュレーション用の設定） ----------
   * in: 在庫あり / low: 残りわずか / out: 完売（選べない）
   * 早割枠はカラーごとに数量限定、という想定。 */
  var STOCK = {
    early:   { silver: 'in', black: 'out', brass: 'low' },
    regular: { silver: 'in', black: 'in',  brass: 'low' }
  };
  var MAT_STOCK = 'in';

  var state = { plan: 'early', color: 'silver', mat: false };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var planInputs = Array.prototype.slice.call(form.querySelectorAll('input[name="plan"]'));
  var colorInputs = Array.prototype.slice.call(form.querySelectorAll('input[name="color"]'));
  var matInput = form.querySelector('input[name="mat"]');
  var linesEl = document.getElementById('summary-lines');
  var totalEl = document.getElementById('total');
  var totalSr = document.getElementById('total-sr');
  var saveEl = document.getElementById('summary-save');
  var messageEls = {};
  Array.prototype.forEach.call(form.querySelectorAll('[data-msg]'), function (el) { messageEls[el.getAttribute('data-msg')] = el; });
  var userTouched = false;
  var stickyEl = document.getElementById('sticky-total');
  var stickyNum = document.getElementById('sticky-total-num');
  var previewName = document.getElementById('preview-name');
  var previewMatLabel = document.getElementById('preview-mat-label');
  var previewMat = document.getElementById('preview-mat');
  var previewEl = document.getElementById('preview-puck');
  var dialog = document.getElementById('reserve-dialog');

  var preview = null;
  if (previewEl && KOKU.Puck) {
    preview = new KOKU.Puck(previewEl);
    preview.setLit(5, 0);
    preview.setRotation(5);
    preview.leds[4].classList.add('is-breathe');
  }

  function yen(n) { return '¥' + n.toLocaleString('ja-JP'); }
  function plus(n) { return '+' + yen(n); }
  function stockOf(plan, color) { return STOCK[plan][color]; }
  function isAvailable(plan, color) { return stockOf(plan, color) !== 'out'; }
  function total() { return PRICE.plan[state.plan] + PRICE.color[state.color] + (state.mat ? PRICE.mat : 0); }
  function stockElOf(input) { return document.getElementById(input.getAttribute('aria-describedby')); }

  function colorStockText(status, plan) {
    if (status === 'out') return plan === 'early' ? '早割枠 完売' : '完売';
    if (status === 'low') return '残りわずか';
    return '';
  }
  function planStockText(status, plan) {
    if (status === 'out') return plan === 'early' ? 'このカラーは早割枠が完売' : 'このカラーは完売';
    if (status === 'low') return plan === 'early' ? '早割枠 残りわずか' : '残りわずか';
    return '';
  }
  function setOption(input, status, text, checked) {
    var opt = input.closest('.opt');
    var out = status === 'out';
    input.disabled = out;
    input.checked = checked;
    opt.classList.toggle('is-soldout', out);
    var s = stockElOf(input);
    if (s) { s.textContent = text; s.setAttribute('data-stock', status); }
  }

  /* どの選択肢が選べないかは、もう一方のグループの選択で決まる */
  function render(announceTotal) {
    planInputs.forEach(function (input) {
      var p = input.value, status = stockOf(p, state.color);
      setOption(input, status, planStockText(status, p), p === state.plan);
    });
    colorInputs.forEach(function (input) {
      var c = input.value, status = stockOf(state.plan, c);
      setOption(input, status, colorStockText(status, state.plan), c === state.color);
    });
    setOption(matInput, MAT_STOCK, MAT_STOCK === 'out' ? '完売' : '', state.mat);

    var lines = summaryLines();
    linesEl.innerHTML = '';
    lines.forEach(function (l) {
      var dt = document.createElement('dt'); dt.textContent = l[0];
      var dd = document.createElement('dd'); dd.textContent = l[1];
      linesEl.appendChild(dt); linesEl.appendChild(dd);
    });

    var save = '';
    var diff = PRICE.plan.regular - PRICE.plan.early;
    if (state.plan === 'early') save = '一般予定価格より ' + yen(diff) + ' お得です';
    else if (isAvailable('early', state.color)) save = '先行予約早割にすると ' + yen(diff) + ' 安くなります';
    else save = NAME.color[state.color] + 'の早割枠は完売しています';
    saveEl.textContent = save;

    if (preview) preview.setFinish(state.color);
    previewName.textContent = NAME.color[state.color];
    previewMatLabel.hidden = !state.mat;
    if (previewMat) previewMat.classList.toggle('is-on', state.mat);

    tweenTo(total());
    if (announceTotal) {
      clearTimeout(render._t);
      render._t = setTimeout(function () { totalSr.textContent = '合計 ' + yen(total()) + '（税込）'; }, 450);
    }
  }

  function summaryLines() {
    var delta = PRICE.color[state.color];
    var lines = [
      ['本体（' + NAME.plan[state.plan] + '）', yen(PRICE.plan[state.plan])],
      ['カラー：' + NAME.color[state.color], delta ? plus(delta) : '基本価格']
    ];
    if (state.mat) lines.push([NAME.mat, plus(PRICE.mat)]);
    return lines;
  }

  /* ---------- 合計の数字をなめらかに動かす ---------- */
  var shown = total(), tweenRaf = 0;
  function paint() { totalEl.textContent = yen(shown); if (stickyNum) stickyNum.textContent = yen(shown); }
  function tweenTo(target) {
    cancelAnimationFrame(tweenRaf);
    if (reduceMotion || shown === target) { shown = target; paint(); return; }
    var from = shown, t0 = performance.now(), dur = 420;
    function step(t) {
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      shown = Math.round(from + (target - from) * e);
      if (p >= 1) shown = target;
      paint();
      if (p < 1) tweenRaf = requestAnimationFrame(step);
    }
    tweenRaf = requestAnimationFrame(step);
  }

  /* ---------- 案内メッセージ（押したグループのすぐ下に出す） ---------- */
  function clearMessages() {
    for (var k in messageEls) if (Object.prototype.hasOwnProperty.call(messageEls, k)) messageEls[k].textContent = '';
  }
  function showMessage(group, text, reveal) {
    clearMessages();
    var el = messageEls[group];
    if (!el) return;
    el.textContent = text;
    if (reveal && el.scrollIntoView) {
      // スマホでは画面下の合計バーに隠れないよう、CSS の scroll-margin で余白をとる
      el.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }

  /* ---------- 入力 ---------- */
  form.addEventListener('change', function (e) {
    var t = e.target;
    userTouched = true;
    if (t.name === 'plan' && isAvailable(t.value, state.color)) state.plan = t.value;
    else if (t.name === 'color' && isAvailable(state.plan, t.value)) state.color = t.value;
    else if (t.name === 'mat') state.mat = t.checked;
    clearMessages();
    render(true);
  });

  /* ヒーローで本体の色を選んだら、まだ触っていなければこちらにも反映する */
  document.addEventListener('koku:finish', function (e) {
    var f = e.detail && e.detail.finish;
    if (userTouched || !Object.prototype.hasOwnProperty.call(PRICE.color, f)) return;
    if (isAvailable(state.plan, f)) {
      state.color = f;
      clearMessages();
      render(false);
    } else {
      showMessage('color', NAME.color[f] + 'は早割枠が完売しています。プランを「一般予約」にすると選べます。', false);
    }
  });

  /* 完売の選択肢を押したときは、理由と選び方を伝える */
  function reasonFor(input) {
    if (input.name === 'color') {
      return NAME.color[input.value] + 'は早割枠が完売しました。プランを「一般予約」にすると選べます。';
    }
    if (input.name === 'plan') {
      return NAME.color[state.color] + 'は早割枠が完売しました。早割で予約するには、ほかのカラーを選んでください。';
    }
    return 'この選択肢は完売しました。';
  }
  form.querySelectorAll('.opt').forEach(function (opt) {
    opt.addEventListener('click', function (e) {
      var input = opt.querySelector('input');
      if (!input || !input.disabled) return;
      e.preventDefault();
      opt.classList.remove('is-shake');
      void opt.offsetWidth;
      opt.classList.add('is-shake');
      showMessage(input.name === 'plan' ? 'plan' : 'color', reasonFor(input), true);
    });
  });

  /* ---------- 予約内容の確認 ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var dl = document.getElementById('dialog-lines');
    dl.innerHTML = '';
    summaryLines().forEach(function (l) {
      var dt = document.createElement('dt'); dt.textContent = l[0];
      var dd = document.createElement('dd'); dd.textContent = l[1];
      dl.appendChild(dt); dl.appendChild(dd);
    });
    document.getElementById('dialog-total').textContent = yen(total());
    if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
    else if (dialog) dialog.setAttribute('open', '');
  });
  if (dialog) {
    // 文字の選択などで中から外へドラッグしたときは閉じない
    var downOnBackdrop = false;
    dialog.addEventListener('pointerdown', function (e) { downOnBackdrop = e.target === dialog; });
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog && downOnBackdrop) dialog.close();
      downOnBackdrop = false;
    });
  }

  /* ---------- スマホ：合計を画面下に出す ---------- */
  if (stickyEl && 'IntersectionObserver' in window) {
    var inSection = false, summaryVisible = false;
    var update = function () { stickyEl.classList.toggle('is-visible', inSection && !summaryVisible); };
    new IntersectionObserver(function (en) { inSection = en[0].isIntersecting; update(); }, { rootMargin: '-30% 0px -10% 0px' })
      .observe(document.getElementById('reserve'));
    new IntersectionObserver(function (en) { summaryVisible = en[0].isIntersecting; update(); }, { threshold: 0.2 })
      .observe(document.getElementById('summary'));
  }

  render(false);

  KOKU.config = {
    state: state,
    total: total,
    STOCK: STOCK,
    PRICE: PRICE
  };
})();
