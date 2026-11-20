/* KOKU-01 本体の描画ヘルパー
 * .puck 要素に 24灯の LED を差し込み、点灯量・回転・仕上げ色を操作する。
 * persp（斜め上から）表示では側面の溝（36本）を SVG で描く。
 */
(function () {
  'use strict';
  var KOKU = (window.KOKU = window.KOKU || {});
  var LED_COUNT = 24;
  var STEPS_PER_TURN = 36;

  function Puck(root) {
    this.root = root;
    this.leds = [];
    this.levels = [];
    var host = root.querySelector('.puck__leds');
    for (var i = 0; i < LED_COUNT; i++) {
      var el = document.createElement('i');
      el.className = 'led';
      el.style.setProperty('--i', String(i));
      host.appendChild(el);
      this.leds.push(el);
      this.levels.push(0);
    }
    this.rot = 0;
    this.knurl = root.querySelector('.puck__knurl');
    if (this.knurl) {
      this.k = parseFloat(root.getAttribute('data-k')) || 0.5;
      this.hsr = parseFloat(root.getAttribute('data-hsr')) || 0.2887;
      root.style.setProperty('--k', String(this.k));
      root.style.setProperty('--hs', 'calc(var(--d) * ' + this.hsr + ')');
      this.drawKnurl(0);
    }
  }

  /* levels: 長さ24の 0〜1 */
  Puck.prototype.setLevels = function (levels) {
    for (var i = 0; i < LED_COUNT; i++) {
      var v = Math.max(0, Math.min(1, levels[i] || 0));
      if (Math.abs(v - this.levels[i]) > 0.002) {
        this.levels[i] = v;
        this.leds[i].style.setProperty('--b', v.toFixed(3));
      }
    }
  };

  /* n 灯を満点で点け、n 番目を frac の明るさに */
  Puck.levelsFor = function (n, frac) {
    var out = [];
    for (var i = 0; i < LED_COUNT; i++) out.push(i < n ? 1 : (i === n ? (frac || 0) : 0));
    return out;
  };
  Puck.prototype.setLit = function (n, frac) { this.setLevels(Puck.levelsFor(n, frac)); };

  /* 回転リング：1クリック = 10° */
  Puck.prototype.setRotation = function (steps) {
    this.rot = steps;
    var deg = steps * (360 / STEPS_PER_TURN);
    this.root.style.setProperty('--rot', deg + 'deg');
    if (this.knurl) this.drawKnurl(deg);
  };

  Puck.prototype.setFinish = function (name) { this.root.setAttribute('data-finish', name); };
  Puck.prototype.setLight = function (deg) { this.root.style.setProperty('--light', deg.toFixed(1) + 'deg'); };
  Puck.prototype.press = function (on) { this.root.classList.toggle('is-pressed', !!on); };
  Puck.prototype.bump = function () {
    var r = this.root;
    r.classList.remove('is-bump');
    void r.offsetWidth;
    r.classList.add('is-bump');
    clearTimeout(this._bumpT);
    this._bumpT = setTimeout(function () { r.classList.remove('is-bump'); }, 360);
  };

  /* 側面の溝（36本）と足もとの境目を描く */
  Puck.prototype.drawKnurl = function (rotDeg) {
    var k = this.k, hsr = this.hsr;
    var W = 1000, R = W / 2, ry = R * k, side = W * hsr, H = W * (k + hsr);
    var svg = '';
    for (var i = 0; i < STEPS_PER_TURN; i++) {
      var th = (rotDeg + i * 10 + 5) * Math.PI / 180;
      var c = Math.cos(th);
      if (c < 0.05) continue;
      var x = R + R * Math.sin(th);
      var y1 = ry + ry * c + 2;
      var y2 = ry + ry * c + side * 0.8;
      svg += '<line x1="' + x.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x.toFixed(1) + '" y2="' + y2.toFixed(1) +
        '" stroke="rgba(0,0,0,' + (0.22 * Math.pow(c, 0.7)).toFixed(3) + ')" stroke-width="1"/>';
      svg += '<line x1="' + (x + 3.2).toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + (x + 3.2).toFixed(1) + '" y2="' + y2.toFixed(1) +
        '" stroke="rgba(255,255,255,' + (0.22 * c).toFixed(3) + ')" stroke-width="1"/>';
    }
    var d1 = '', d2 = '';
    for (var j = 0; j <= 48; j++) {
      var ph = -Math.PI / 2 + Math.PI * j / 48;
      var px = R + R * Math.sin(ph);
      var py = ry + ry * Math.cos(ph) + side * 0.86;
      d1 += (j ? 'L' : 'M') + px.toFixed(1) + ' ' + py.toFixed(1);
      d2 += (j ? 'L' : 'M') + px.toFixed(1) + ' ' + (py + 5).toFixed(1);
    }
    svg += '<path d="' + d1 + '" stroke="rgba(0,0,0,.34)" stroke-width="1"/>';
    svg += '<path d="' + d2 + '" stroke="rgba(255,255,255,.22)" stroke-width="1"/>';
    this.knurl.setAttribute('viewBox', '0 0 ' + W + ' ' + H.toFixed(1));
    this.knurl.innerHTML = svg;
  };

  KOKU.Puck = Puck;
  KOKU.LED_COUNT = LED_COUNT;
})();
