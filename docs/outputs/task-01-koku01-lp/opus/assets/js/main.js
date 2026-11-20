/* ページ全体：ヒーローの起動演出、ヘッダー、寸法図、環境音の試聴 */
(function () {
  'use strict';
  var KOKU = window.KOKU || {};
  var Sound = KOKU.Sound;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------- ヒーロー：電源が入るように一周灯り、5クリック回して25分にする ---------- */
  var heroEl = document.getElementById('hero-puck');
  if (heroEl && KOKU.Puck) {
    var hero = new KOKU.Puck(heroEl);
    var finalSteps = 5;
    var settle = function () {
      hero.setRotation(finalSteps);
      hero.setLit(finalSteps, 0);
      hero.leds[finalSteps - 1].classList.add('is-breathe');
    };
    if (reduceMotion) {
      settle();
    } else {
      var t0 = 0, lastRot = -1;
      var intro = function (t) {
        if (!t0) t0 = t;
        var e = t - t0 - 300, levels = [], i;
        if (e < 0) {
          for (i = 0; i < 24; i++) levels.push(0);
        } else if (e < 1000) {
          // 時計回りに一周点灯
          for (i = 0; i < 24; i++) levels.push(Math.max(0, Math.min(1, (e - i * 34) / 120)));
        } else if (e < 1400) {
          var f = 1 - (e - 1000) / 400;
          for (i = 0; i < 24; i++) levels.push(f);
        } else {
          // カチ、カチ、と5回回して灯りを足す
          var k = Math.min(finalSteps, Math.floor((e - 1400) / 170) + 1);
          if (k !== lastRot) { hero.setRotation(k); lastRot = k; }
          for (i = 0; i < 24; i++) levels.push(i < k ? 1 : 0);
          if (k >= finalSteps && e > 1400 + finalSteps * 170) {
            hero.setLevels(levels);
            settle();
            return;
          }
        }
        hero.setLevels(levels);
        requestAnimationFrame(intro);
      };
      requestAnimationFrame(intro);
    }

    // 本体の色を切り替えて見る
    var FINISH_NAME = { silver: 'アルマイトシルバー', black: 'マットブラック', brass: '真鍮リミテッド（+¥3,000）' };
    var finishName = document.getElementById('hero-finish-name');
    var finishDots = Array.prototype.slice.call(document.querySelectorAll('.finish-dot'));
    finishDots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        var f = dot.getAttribute('data-finish');
        hero.setFinish(f);
        // 体験デモの本体も、選んだ色にそろえる
        var demoPuck = document.getElementById('demo-puck');
        if (demoPuck) demoPuck.setAttribute('data-finish', f);
        finishDots.forEach(function (o) { o.setAttribute('aria-pressed', o === dot ? 'true' : 'false'); });
        if (finishName) finishName.textContent = FINISH_NAME[f];
        var ev;
        try { ev = new CustomEvent('koku:finish', { detail: { finish: f } }); }
        catch (err) { ev = document.createEvent('CustomEvent'); ev.initCustomEvent('koku:finish', false, false, { finish: f }); }
        document.dispatchEvent(ev);
      });
    });

    // 金属の照り返しを、ポインターの位置に合わせて少しだけ動かす
    var lightRaf = 0, lightX = 0.5;
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      lightX = e.clientX / window.innerWidth;
      if (lightRaf) return;
      lightRaf = requestAnimationFrame(function () {
        lightRaf = 0;
        if (window.scrollY > window.innerHeight) return;
        hero.setLight(196 + lightX * 44);
      });
    }, { passive: true });
  }

  /* ---------- ヘッダー：スクロール量を24灯で示す ---------- */
  var header = document.getElementById('site-header');
  var ring = document.querySelector('[data-progress-ring]');
  var dots = [];
  if (ring) {
    for (var i = 0; i < 24; i++) {
      var d = document.createElement('i');
      d.style.setProperty('--i', String(i));
      ring.appendChild(d);
      dots.push(d);
    }
  }
  var darkZones = [document.getElementById('demo'), document.querySelector('.site-footer')].filter(Boolean);
  var lastLit = -1, scrollRaf = 0;
  function onScroll() {
    scrollRaf = 0;
    var y = window.scrollY || window.pageYOffset;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var lit = max > 0 ? Math.round((y / max) * 24) : 0;
    if (lit !== lastLit) {
      lastLit = lit;
      dots.forEach(function (dot, idx) { dot.classList.toggle('is-on', idx < lit); });
    }
    if (header) {
      var mid = header.offsetHeight / 2;
      var dark = darkZones.some(function (el) {
        var r = el.getBoundingClientRect();
        return r.top <= mid && r.bottom >= mid;
      });
      header.classList.toggle('is-dark', dark);
      header.classList.toggle('is-scrolled', y > 8 && !dark);
    }
  }
  window.addEventListener('scroll', function () { if (!scrollRaf) scrollRaf = requestAnimationFrame(onScroll); }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- 寸法図 ---------- */
  function el(name, attrs) {
    var n = document.createElementNS(SVGNS, name);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    return n;
  }
  var cx = 230, cy = 215, R = 160;
  var ticks = document.getElementById('dw-ticks');
  if (ticks) {
    for (var t = 0; t < 36; t++) {
      var a = t * 10 * Math.PI / 180;
      ticks.appendChild(el('line', {
        x1: (cx + 143 * Math.sin(a)).toFixed(2), y1: (cy - 143 * Math.cos(a)).toFixed(2),
        x2: (cx + 156 * Math.sin(a)).toFixed(2), y2: (cy - 156 * Math.cos(a)).toFixed(2)
      }));
    }
  }
  var leds = document.getElementById('dw-leds');
  if (leds) {
    for (var l = 0; l < 24; l++) {
      var b = l * 15 * Math.PI / 180;
      var c = el('circle', { cx: (cx + 118.4 * Math.sin(b)).toFixed(2), cy: (cy - 118.4 * Math.cos(b)).toFixed(2), r: 3.4 });
      if (l < 5) c.setAttribute('class', 'is-lit');
      leds.appendChild(c);
    }
  }
  var knurl = document.getElementById('dw-knurl');
  if (knurl) {
    for (var g = 0; g < 36; g++) {
      var th = (g * 10 + 5) * Math.PI / 180;
      if (Math.cos(th) <= 0.02) continue;
      var x = (cx + R * Math.sin(th)).toFixed(2);
      knurl.appendChild(el('line', { x1: x, y1: 447, x2: x, y2: 526 }));
    }
  }

  /* ---------- 30日のドット ---------- */
  var days = document.querySelector('.trait__days');
  if (days) for (var n = 0; n < 30; n++) days.appendChild(document.createElement('i'));

  /* ---------- 環境音の試聴ボタン ---------- */
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-preview]'));
  var chipNote = document.getElementById('chip-note');
  function resetChips() { chips.forEach(function (ch) { ch.setAttribute('aria-pressed', 'false'); }); }
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      if (!Sound) return;
      if (chip.getAttribute('aria-pressed') === 'true') {
        Sound.stopPreview();
        resetChips();
        return;
      }
      var ok = Sound.preview(chip.getAttribute('data-preview'), 8, function () {
        chip.setAttribute('aria-pressed', 'false');
      });
      resetChips();
      if (ok) {
        chip.setAttribute('aria-pressed', 'true');
        if (chipNote) chipNote.textContent = '';
      } else if (chipNote) {
        chipNote.textContent = Sound._active
          ? '体験デモのタイマーが動いている間は、そちらの環境音が優先されます。'
          : 'このブラウザでは音を再生できませんでした。';
      }
    });
  });
})();
