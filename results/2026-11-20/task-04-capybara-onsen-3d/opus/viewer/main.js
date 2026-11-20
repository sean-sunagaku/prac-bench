/*
 * カピバラの雪見露天風呂 — 単一ファイル 3D ビューア
 * build.mjs が esbuild で IIFE に束ね、template.html に GLB(base64) / metrics.json と一緒に埋め込む。
 * 外部リソース・ネットワーク・ES module の外部 import は一切使わない。
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

/* ------------------------------------------------------------------ *
 * 調整用の定数
 * ------------------------------------------------------------------ */

const MOOD = {
  exposure: 1.3,
  // 画面上→下（濃紺 → 群青 → 地平のわずかな薄紫）
  bg: [[0.0, '#050817'], [0.45, '#0e1840'], [0.8, '#213066'], [1.0, '#3a3a6c']],
  hemi: { sky: '#8ea4e6', ground: '#3a2e2c', intensity: 1.3 },
  moon: { color: '#cbd8ff', intensity: 1.15, dir: [-0.5, 0.78, 0.42], shadowRadius: 4 },
  lantern: { color: '#ff9a45', intensity: 0.45, distance: 1.6 },
  envIntensity: 0.38, // 夕空グラデーションを PMREM 化した弱い環境反射（お湯・濡れ岩用）
  bloom: { strength: 1.3, radius: 0.62, threshold: 1.0 },
  snow: { count: 560, size: 0.012, color: [0.86, 0.9, 1.0], opacity: 0.9, yMin: 0.0, yMax: 2.2, half: 1.0 },
  steam: { count: 64, life: 6.4, rise: 0.42, size0: 0.12, size1: 0.44, opacity: 0.095, color: [0.84, 0.88, 0.96] },
};

const STUDIO = {
  exposure: 1.0,
  bg: '#e3e3e1',
  envIntensity: 1.0,
  grid: { size: 2, divisions: 20, center: '#7d7d7d', line: '#b4b4b4' },
};

const ORBIT_EL = 30; // 正面/右/背面/左/斜め の共通仰角
const VIEWS = {
  front: { az: 0, el: ORBIT_EL },
  right: { az: 90, el: ORBIT_EL },
  back: { az: 180, el: ORBIT_EL },
  left: { az: -90, el: ORBIT_EL },
  diag: { az: 45, el: ORBIT_EL },
  top: { az: 0, el: 90 },
  capy: { special: true },
};
const VIEW_ORDER = ['front', 'right', 'back', 'left', 'diag', 'top', 'capy'];
const VIEW_LABEL = { front: '正面', right: '右', back: '背面', left: '左', diag: '斜め', top: '真上', capy: '寄り' };
const VIEW_TITLE = {
  front: '正面（+Z 側・仰角30°）', right: '右（+X 側）', back: '背面（−Z 側）', left: '左（−X 側）',
  diag: '斜め45°（右前）', top: '真上', capy: 'カピバラ寄り',
};

const HL_COLOR = new THREE.Color(1.0, 0.42, 0.2); // ハイライト（朱寄りの暖色）

/* ------------------------------------------------------------------ *
 * 小物
 * ------------------------------------------------------------------ */

const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const $ = (sel) => document.querySelector(sel);

function readParams() {
  const q = new URLSearchParams(location.search);
  const num = (k) => {
    if (!q.has(k)) return null;
    const v = parseFloat(q.get(k));
    return Number.isFinite(v) ? v : null;
  };
  const mode = q.get('mode') === 'studio' ? 'studio' : 'mood';
  const view = VIEWS[q.get('view')] ? q.get('view') : null;
  const ui = q.get('ui') !== '0';
  const angle = num('angle');
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let rotate;
  if (q.has('rotate')) rotate = q.get('rotate') !== '0';
  else rotate = ui && !view && angle === null && !reduced;
  const seedRaw = q.get('seed');
  const seed = seedRaw !== null && /^\d+$/.test(seedRaw) ? Number(seedRaw) >>> 0 : 20261120;
  return {
    mode, view, ui, rotate, angle, seed, reduced,
    elev: num('elev') ?? ORBIT_EL,
    time: num('time'),
    tm: q.get('tm'),
    bloom: q.get('bloom') !== '0',
    env: q.get('env') !== '0',
    exposure: num('exposure'),
    dpr: num('dpr'),
  };
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dirFromAzEl(az, el) {
  const a = az * DEG;
  const e = el * DEG;
  return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
}

function decodeBase64(b64) {
  if (typeof Uint8Array.fromBase64 === 'function') return Uint8Array.fromBase64(b64);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function readJSON(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  try {
    return JSON.parse(el.textContent || 'null');
  } catch (e) {
    return null;
  }
}

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o !== null && typeof o === 'object' ? o[k] : undefined), obj);
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
function fmtNum(v, d = 1) {
  if (!isNum(v)) return null;
  const s = Math.abs(v).toFixed(d);
  return (v < 0 && Number(s) !== 0 ? '−' : '') + s;
}
function fmtRange(arr, d = 1) {
  if (!Array.isArray(arr) || !arr.length || !arr.every(isNum)) return null;
  const mn = Math.min(...arr);
  const mx = Math.max(...arr);
  return mn === mx ? fmtNum(mn, d) : `${fmtNum(mn, d)}–${fmtNum(mx, d)}`;
}
const fmtInt = (v) => (isNum(v) ? Math.round(v).toLocaleString('ja-JP') : null);

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function nextFrames(n = 2) {
  return new Promise((resolve) => {
    const step = () => (--n <= 0 ? resolve() : requestAnimationFrame(step));
    requestAnimationFrame(step);
  });
}

/* ------------------------------------------------------------------ *
 * テクスチャ（canvas で生成。外部画像は使わない）
 * ------------------------------------------------------------------ */

function makeGradientTexture(stops) {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 512;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, c.height);
  for (const [p, col] of stops) gr.addColorStop(p, col);
  g.fillStyle = gr;
  g.fillRect(0, 0, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

function makeSnowSprite() {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0.0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  gr.addColorStop(0.7, 'rgba(255,255,255,0.25)');
  gr.addColorStop(1.0, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeSteamSprite(rng) {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    const r = 26 + rng() * 22;
    const x = s / 2 + (rng() - 0.5) * 36;
    const y = s / 2 + (rng() - 0.5) * 36;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.4)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);
  }
  // 縁を必ず 0 に落とす
  g.globalCompositeOperation = 'destination-in';
  const m = g.createRadialGradient(s / 2, s / 2, s * 0.12, s / 2, s / 2, s / 2);
  m.addColorStop(0, 'rgba(0,0,0,1)');
  m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m;
  g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 夕空のグラデーション球を PMREM 化した、ごく弱い環境マップ（情景モード用） */
function makeDuskEnvironment(renderer) {
  const s = new THREE.Scene();
  const geo = new THREE.SphereGeometry(10, 48, 24);
  const pos = geo.attributes.position;
  const top = new THREE.Color('#0a1438');
  const hor = new THREE.Color('#3b4a82');
  const gnd = new THREE.Color('#161626');
  const col = new THREE.Color();
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 10;
    if (y >= 0) col.copy(hor).lerp(top, Math.pow(y, 0.55));
    else col.copy(hor).lerp(gnd, Math.min(1, -y * 4));
    col.toArray(colors, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  // 月のにじみ（濡れた岩・湯面の小さなハイライト用）
  const moonDir = new THREE.Vector3(...MOOD.moon.dir).normalize();
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 16, 8),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.4, 2.8) }),
  );
  moon.position.copy(moonDir).multiplyScalar(8.5);
  s.add(moon);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(s, 0.035);
  pmrem.dispose();
  geo.dispose();
  return rt.texture;
}

function makeStudioEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const rt = pmrem.fromScene(room, 0.04);
  pmrem.dispose();
  room.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose();
      o.material.dispose();
    }
  });
  return rt.texture;
}

/* ------------------------------------------------------------------ *
 * 雪（Points + 丸いソフトスプライト。位置はシェーダ内で時間から決定論的に計算）
 * ------------------------------------------------------------------ */

function buildSnow(rng, center) {
  const cfg = MOOD.snow;
  const n = cfg.count;
  const pos = new Float32Array(n * 3);
  const rnd = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3 + 0] = center.x + (rng() * 2 - 1) * cfg.half;
    pos[i * 3 + 1] = rng(); // 落下位相
    pos[i * 3 + 2] = center.z + (rng() * 2 - 1) * cfg.half;
    rnd[i * 3 + 0] = rng(); // 速度
    rnd[i * 3 + 1] = rng(); // 大きさ
    rnd[i * 3 + 2] = rng(); // 揺れの位相
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 800 },
      uMaxPx: { value: 18 },
      uSize: { value: cfg.size },
      uY: { value: new THREE.Vector2(cfg.yMin, cfg.yMax) },
      uColor: { value: new THREE.Color(...cfg.color) },
      uOpacity: { value: cfg.opacity },
      uMap: { value: makeSnowSprite() },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uScale;
      uniform float uSize;
      uniform float uMaxPx;
      uniform vec2 uY;
      attribute vec3 aRand;
      varying float vAlpha;
      void main() {
        float h = uY.y - uY.x;
        float speed = mix(0.06, 0.13, aRand.x);
        float y = uY.y - mod(position.y * h + uTime * speed, h);
        float ph = aRand.z * 6.2831853;
        vec3 p = vec3(
          position.x + sin(uTime * 0.71 + ph) * 0.035 + sin(uTime * 0.23 + ph * 1.7) * 0.02,
          y,
          position.z + cos(uTime * 0.53 + ph * 1.3) * 0.035);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = uSize * mix(0.55, 1.35, aRand.y);
        gl_PointSize = clamp(size * uScale / max(0.05, -mv.z), 1.0, uMaxPx);
        vAlpha = smoothstep(uY.y, uY.y - 0.35, y) * smoothstep(uY.x, uY.x + 0.06, y)
               * smoothstep(0.15, 0.7, -mv.z); // カメラ直前の大きなボケ粒は消す
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAlpha;
      void main() {
        float a = texture2D(uMap, gl_PointCoord).a * vAlpha * uOpacity;
        if (a < 0.004) discard;
        gl_FragColor = vec4(uColor, a);
      }`,
    transparent: true,
    depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.name = '__fx_snow';
  pts.frustumCulled = false;
  pts.renderOrder = 3;
  return pts;
}

/* ------------------------------------------------------------------ *
 * 湯気（ビルボード四角形。通常の透明合成で白く淡く）
 * ------------------------------------------------------------------ */

function sampleWaterPoints(rng, waterMesh, exclude, count, fallbackBox) {
  const out = [];
  const v = new THREE.Vector3();
  if (waterMesh && waterMesh.isMesh && waterMesh.geometry && waterMesh.geometry.attributes.position) {
    try {
      const sampler = new MeshSurfaceSampler(waterMesh).setRandomGenerator(rng).build();
      waterMesh.updateWorldMatrix(true, false);
      let tries = 0;
      while (out.length < count && tries < count * 40) {
        tries++;
        sampler.sample(v);
        v.applyMatrix4(waterMesh.matrixWorld);
        if (exclude && tries < count * 30 && exclude(v)) continue;
        out.push(v.clone());
      }
    } catch (e) {
      out.length = 0;
    }
  }
  if (!out.length && fallbackBox && !fallbackBox.isEmpty()) {
    for (let i = 0; i < count; i++) {
      out.push(new THREE.Vector3(
        lerp(fallbackBox.min.x, fallbackBox.max.x, rng()),
        fallbackBox.max.y,
        lerp(fallbackBox.min.z, fallbackBox.max.z, rng()),
      ));
    }
  }
  return out;
}

function buildSteam(rng, spawn) {
  const cfg = MOOD.steam;
  const n = spawn.length;
  const pos = new Float32Array(n * 4 * 3);
  const corner = new Float32Array(n * 4 * 2);
  const seed = new Float32Array(n * 4 * 4);
  const index = [];
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let i = 0; i < n; i++) {
    const s = [rng(), rng(), rng(), rng()];
    for (let k = 0; k < 4; k++) {
      const vi = i * 4 + k;
      pos.set([spawn[i].x, spawn[i].y + 0.006, spawn[i].z], vi * 3);
      corner.set(corners[k], vi * 2);
      seed.set(s, vi * 4);
    }
    const b = i * 4;
    index.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aCorner', new THREE.BufferAttribute(corner, 2));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  geo.setIndex(index);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLife: { value: cfg.life },
      uRise: { value: cfg.rise },
      uSize: { value: new THREE.Vector2(cfg.size0, cfg.size1) },
      uColor: { value: new THREE.Color(...cfg.color) },
      uOpacity: { value: cfg.opacity },
      uMap: { value: makeSteamSprite(rng) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uLife;
      uniform float uRise;
      uniform vec2 uSize;
      attribute vec2 aCorner;
      attribute vec4 aSeed;
      varying vec2 vUv;
      varying float vAlpha;
      void main() {
        float life = uLife * (0.75 + 0.5 * aSeed.x);
        float p = fract(uTime / life + aSeed.y);
        vec3 c = position;
        c.y += p * uRise * (0.75 + 0.5 * aSeed.z);
        float ph = aSeed.w * 6.2831853;
        c.x += sin(p * 3.1 + ph) * 0.035 * p + 0.025 * p;
        c.z += cos(p * 2.3 + ph * 1.7) * 0.035 * p;
        float size = mix(uSize.x, uSize.y, sqrt(p)) * (0.7 + 0.6 * aSeed.w);
        float ang = aSeed.z * 6.2831853 + p * (aSeed.x - 0.5) * 2.4;
        vec2 cr = vec2(cos(ang) * aCorner.x - sin(ang) * aCorner.y,
                       sin(ang) * aCorner.x + cos(ang) * aCorner.y);
        vec4 mv = modelViewMatrix * vec4(c, 1.0);
        mv.xy += cr * size * 0.5;
        gl_Position = projectionMatrix * mv;
        vUv = aCorner * 0.5 + 0.5;
        vAlpha = smoothstep(0.0, 0.18, p) * (1.0 - smoothstep(0.42, 1.0, p));
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying float vAlpha;
      void main() {
        float a = texture2D(uMap, vUv).a * vAlpha * uOpacity;
        if (a < 0.002) discard;
        gl_FragColor = vec4(uColor, a);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = '__fx_steam';
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  return mesh;
}

/* ------------------------------------------------------------------ *
 * 火袋だけをにじませるブルーム
 *   - 発光源（GLOW_LAYER に載せた強い emissive のメッシュ）だけを、他の物体を黒い遮蔽物として描いた
 *     バッファに描き、そこに高しきい値の UnrealBloomPass をかけて「にじみ」だけを本画に加算する。
 *   - 点光源が湯面や濡れ岩に作る鋭いスペキュラはにじませない。
 * ------------------------------------------------------------------ */

const GLOW_LAYER = 5;

class SelectiveBloomPass extends Pass {
  constructor(scene, camera, bloomPass, hidden) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.bloom = bloomPass;
    this.hidden = hidden; // 発光源バッファでは隠すもの（雪・湯気など）
    this.enabledBloom = true;
    this.glowRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    this.black = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.mix = new THREE.ShaderMaterial({
      uniforms: { tBase: { value: null }, tBloom: { value: null }, uOn: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D tBase; uniform sampler2D tBloom; uniform float uOn; varying vec2 vUv;'
        + 'void main() { vec4 b = texture2D(tBase, vUv); gl_FragColor = vec4(b.rgb + uOn * texture2D(tBloom, vUv).rgb, b.a); }',
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.mix);
    this._clear = new THREE.Color();
  }
  setSize(w, h) {
    this.glowRT.setSize(w, h);
    this.bloom.setSize(w, h);
  }
  renderGlowSource(renderer) {
    const { scene, camera } = this;
    const bg = scene.background;
    renderer.getClearColor(this._clear);
    const clearAlpha = renderer.getClearAlpha();
    const autoClear = renderer.autoClear;
    const restore = [];
    for (const o of this.hidden) if (o && o.visible) { o.visible = false; restore.push(o); }
    scene.background = null;
    renderer.setClearColor(0x000000, 1);
    renderer.setRenderTarget(this.glowRT);
    renderer.clear();
    renderer.autoClear = false;
    scene.overrideMaterial = this.black; // すべてを黒い遮蔽物として（深度も書く）
    renderer.render(scene, camera);
    scene.overrideMaterial = null;
    const mask = camera.layers.mask;
    camera.layers.set(GLOW_LAYER); // 発光源だけを本来のマテリアルで
    renderer.render(scene, camera);
    camera.layers.mask = mask;
    renderer.autoClear = autoClear;
    scene.background = bg;
    renderer.setClearColor(this._clear, clearAlpha);
    for (const o of restore) o.visible = true;
  }
  render(renderer, writeBuffer, readBuffer) {
    if (this.enabledBloom) {
      this.renderGlowSource(renderer);
      this.bloom.render(renderer, null, this.glowRT, 0, false);
      this.mix.uniforms.tBloom.value = this.bloom.renderTargetsHorizontal[0].texture; // にじみ成分のみ
    }
    this.mix.uniforms.uOn.value = this.enabledBloom ? 1 : 0;
    this.mix.uniforms.tBase.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
  dispose() {
    this.glowRT.dispose();
    this.black.dispose();
    this.mix.dispose();
    this.quad.dispose();
  }
}

/* ------------------------------------------------------------------ *
 * 本体
 * ------------------------------------------------------------------ */

const P = readParams();

function showError(msg) {
  const el = $('#error');
  if (el) {
    el.hidden = false;
    el.querySelector('.msg').textContent = msg;
  }
  const ld = $('#loading');
  if (ld) ld.hidden = true;
  window.__error = msg;
  console.error('[viewer] ' + msg);
}

async function main() {
  document.body.classList.toggle('noui', !P.ui);
  document.body.classList.add('mode-' + P.mode);
  const metrics = readJSON('metrics-data') || {};
  const buildInfo = readJSON('build-info') || {};

  /* ---------- renderer ---------- */
  const canvas = $('#scene-canvas');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    throw new Error('WebGL を初期化できませんでした（' + ((e && e.message) || e) + '）');
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // r187: PCF + shadow.radius でソフトシャドウ
  renderer.shadowMap.autoUpdate = false; // 静的シーンなので必要時だけ更新

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 60);
  camera.position.set(0, 2, 4);

  const composer = new EffectComposer(
    renderer,
    new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }),
  );
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), MOOD.bloom.strength, MOOD.bloom.radius, MOOD.bloom.threshold);
  const fxHidden = []; // 発光源バッファで隠すもの（後で雪・湯気を入れる）
  const selectiveBloom = new SelectiveBloomPass(scene, camera, bloomPass, fxHidden);
  composer.addPass(selectiveBloom);
  composer.addPass(new OutputPass());

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.screenSpacePanning = true;
  controls.minDistance = 0.22;
  controls.maxDistance = 8;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = 86 * DEG; // 地面の下に回り込まない
  controls.autoRotateSpeed = 1.2; // 約50秒で一周
  controls.target.set(0, 0.4, 0);

  /* ---------- GLB ---------- */
  const b64El = document.getElementById('glb-data');
  const b64 = b64El ? b64El.textContent.trim() : '';
  if (!b64 || b64.startsWith('__')) throw new Error('GLB データが埋め込まれていません（viewer/build.mjs でビルドしてください）');
  const u8 = decodeBase64(b64);
  const glbBuffer = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  let gltf;
  try {
    gltf = await new GLTFLoader().parseAsync(glbBuffer, '');
  } catch (e) {
    throw new Error('GLB の読み込みに失敗しました（' + ((e && e.message) || e) + '）');
  }
  const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
  if (!root) throw new Error('GLB にシーンが含まれていません');
  root.updateMatrixWorld(true);

  // ノード名 → Object3D（存在しないノードは null）
  const byName = new Map();
  root.traverse((o) => {
    const n = o.userData && o.userData.name;
    if (n && !byName.has(n)) byName.set(n, o);
    if (o.name && !byName.has(o.name)) byName.set(o.name, o);
  });
  const find = (name) => byName.get(name) || null;
  const findAll = (re) => {
    const set = new Set();
    for (const [k, o] of byName) if (re.test(k)) set.add(o);
    return [...set];
  };

  // 実測値
  let triangles = 0;
  let meshCount = 0;
  const materials = new Set();
  root.traverse((o) => {
    if (!o.isMesh) return;
    meshCount++;
    const g = o.geometry;
    const count = g.index ? g.index.count : g.attributes.position ? g.attributes.position.count : 0;
    triangles += Math.floor(count / 3);
    for (const m of [].concat(o.material)) materials.add(m);
  });
  const gjson = (gltf.parser && gltf.parser.json) || {};
  const gltfNodes = Array.isArray(gjson.nodes) ? gjson.nodes.length : null;
  const gltfMeshes = Array.isArray(gjson.meshes) ? gjson.meshes.length : null;
  const bbox = new THREE.Box3().setFromObject(root);
  const bsize = bbox.getSize(new THREE.Vector3());
  const bcenter = bbox.getCenter(new THREE.Vector3());

  // 影：不透明は cast/receive、透明は影を落とさない
  const lumOf = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  let glowLumMax = 0;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = [].concat(o.material);
    const transparent = mats.some((m) => m.transparent || m.opacity < 1);
    o.castShadow = !transparent;
    o.receiveShadow = !mats.some((m) => m.name === 'Steam');
    // 強い emissive（火袋など）はブルームの発光源レイヤーにも載せる
    const eLum = Math.max(0, ...mats.map((m) => (m.emissive ? lumOf(m.emissive) * (isNum(m.emissiveIntensity) ? m.emissiveIntensity : 1) : 0)));
    const named = /glow|firebox/i.test(`${(o.userData && o.userData.name) || o.name} ${mats.map((m) => m.name).join(' ')}`);
    if (eLum >= 0.6 || (named && eLum > 0.05)) {
      o.layers.enable(GLOW_LAYER);
      glowLumMax = Math.max(glowLumMax, eLum);
    }
  });
  // 発光源バッファには発光体しか無いので、しきい値は発光体の輝度に対して高めに置く（発光が弱い GLB でも消えないように）
  if (glowLumMax > 0) bloomPass.threshold = Math.min(MOOD.bloom.threshold, 0.7 * glowLumMax);
  scene.add(root);

  /* ---------- 注目ノード ---------- */
  const staticSteam = find('Onsen_Steam');
  const water = find('Onsen_WaterSurface');
  const capy = find('Capybara');
  const firebox = find('StoneLantern_Firebox_Glow');

  const worldBox = (objs) => {
    const b = new THREE.Box3();
    for (const o of [].concat(objs)) if (o) b.expandByObject(o);
    return b;
  };
  const waterBox = water ? worldBox(water) : new THREE.Box3();
  const waterY = !waterBox.isEmpty()
    ? waterBox.max.y
    : isNum(getPath(metrics, 'immersion.water_surface_z')) ? metrics.immersion.water_surface_z : null;

  // フレーミング用の点群（頂点を間引いてワールド座標に）
  function collectPoints(objs, maxPoints = 4000, filter = null) {
    const meshes = [];
    let total = 0;
    for (const o of [].concat(objs)) {
      if (!o) continue;
      o.traverse((m) => {
        if (m.isMesh && m.geometry && m.geometry.attributes.position && m !== staticSteam) {
          meshes.push(m);
          total += m.geometry.attributes.position.count;
        }
      });
    }
    const step = Math.max(1, Math.floor(total / maxPoints));
    const pts = [];
    const v = new THREE.Vector3();
    for (const m of meshes) {
      const pa = m.geometry.attributes.position;
      m.updateWorldMatrix(true, false);
      for (let i = 0; i < pa.count; i += step) {
        v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld);
        if (filter && !filter(v)) continue;
        pts.push(v.clone());
      }
    }
    return pts;
  }
  const pointsBox = (pts) => new THREE.Box3().setFromPoints(pts);

  const allPoints = collectPoints([root], 6000);
  const sceneTarget = new THREE.Vector3(bcenter.x, clamp(0.4, bbox.min.y, bbox.max.y), bcenter.z);

  /* ---------- フレーミング ---------- */
  const fitCam = new THREE.PerspectiveCamera();
  const tmpV = new THREE.Vector3();
  function fitDistance(points, target, az, el, margin = 0.06) {
    if (!points.length) return 3;
    fitCam.fov = camera.fov;
    fitCam.aspect = camera.aspect;
    fitCam.near = 0.005;
    fitCam.far = 100;
    fitCam.updateProjectionMatrix();
    const dir = dirFromAzEl(az, Math.min(el, 89.9));
    const lim = 1 - margin;
    const fits = (d) => {
      fitCam.position.copy(target).addScaledVector(dir, d);
      fitCam.lookAt(target);
      fitCam.updateMatrixWorld(true);
      for (const p of points) {
        tmpV.copy(p).applyMatrix4(fitCam.matrixWorldInverse);
        if (tmpV.z > -0.01) return false;
        tmpV.applyMatrix4(fitCam.projectionMatrix);
        if (Math.abs(tmpV.x) > lim || Math.abs(tmpV.y) > lim) return false;
      }
      return true;
    };
    let lo = 0.05;
    let hi = 40;
    for (let i = 0; i < 36; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
    return hi;
  }
  // ターンテーブル用：どの方位でも同じ距離（スケールを揃える）
  const orbitDistCache = new Map();
  function orbitDistance(el) {
    const key = `${el.toFixed(2)}|${camera.aspect.toFixed(4)}`;
    if (!orbitDistCache.has(key)) {
      let d = 0;
      for (let a = 0; a < 360; a += 10) d = Math.max(d, fitDistance(allPoints, sceneTarget, a, el, 0.05));
      orbitDistCache.set(key, d);
    }
    return orbitDistCache.get(key);
  }

  // カピバラの顔の向き（両目の位置から推定）
  let capyFaceAz = 0;
  const eyeL = find('Capybara_Eye_L');
  const eyeR = find('Capybara_Eye_R');
  if (capy && eyeL && eyeR) {
    const cl = worldBox(eyeL).getCenter(new THREE.Vector3());
    const cr = worldBox(eyeR).getCenter(new THREE.Vector3());
    const mid = cl.clone().add(cr).multiplyScalar(0.5);
    const body = worldBox(capy).getCenter(new THREE.Vector3());
    const lr = cr.clone().sub(cl);
    const f = new THREE.Vector3(-lr.z, 0, lr.x).normalize();
    if (f.dot(mid.clone().sub(body).setY(0)) < 0) f.negate();
    capyFaceAz = Math.atan2(f.x, f.z) / DEG;
  }
  const aboveWater = (v) => waterY === null || v.y >= waterY - 0.02;
  const capyFocus = [
    ...(capy ? collectPoints([capy], 3000, aboveWater) : []),
    ...collectPoints([find('Yuzu'), find('Yuzu_Leaf'), find('Yuzu_Stem'), eyeL, eyeR], 1200),
  ];

  function posePlain(target, az, el, dist) {
    return { target: target.clone(), az, el, dist };
  }
  function viewPose(name) {
    if (name === 'capy') {
      if (!capyFocus.length) return viewPose('front');
      const b = pointsBox(capyFocus);
      const t = b.getCenter(new THREE.Vector3());
      const az = capyFaceAz + 55;
      const el = 18;
      return posePlain(t, az, el, Math.max(0.45, fitDistance(capyFocus, t, az, el, 0.24)));
    }
    const v = VIEWS[name] || VIEWS.front;
    if (v.el >= 89) return posePlain(sceneTarget, v.az, 90, fitDistance(allPoints, sceneTarget, v.az, 89.9, 0.05));
    return posePlain(sceneTarget, v.az, v.el, orbitDistance(v.el));
  }
  function anglePose(az, el = ORBIT_EL) {
    return posePlain(sceneTarget, az, el, orbitDistance(el));
  }

  /* ---------- カメラ移動 ---------- */
  const S = {
    mode: null,
    tween: null,
    highlight: null,
    needsRender: true,
    activeView: null,
    activeCheck: null,
  };
  const sph = new THREE.Spherical();
  function setPose(p) {
    S.tween = null;
    controls.target.copy(p.target);
    sph.set(p.dist, (90 - Math.min(p.el, 89.99)) * DEG, p.az * DEG);
    camera.position.setFromSpherical(sph).add(p.target);
    camera.lookAt(p.target);
    const damp = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = damp;
    S.needsRender = true;
  }
  function flyTo(p, dur = P.reduced ? 0.35 : 1.1) {
    // 慣性を消してから補間
    const damp = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = damp;
    const from = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    const to = new THREE.Spherical(p.dist, (90 - Math.min(p.el, 89.99)) * DEG, p.az * DEG);
    let dTheta = to.theta - from.theta;
    dTheta = ((((dTheta + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
    S.tween = {
      t0: performance.now(), dur: dur * 1000,
      fromT: controls.target.clone(), toT: p.target.clone(),
      from, to, dTheta,
    };
  }
  function stepTween(now) {
    const tw = S.tween;
    const k = clamp((now - tw.t0) / tw.dur, 0, 1);
    const e = easeInOutCubic(k);
    const t = tw.fromT.clone().lerp(tw.toT, e);
    const r = Math.exp(lerp(Math.log(tw.from.radius), Math.log(tw.to.radius), e));
    sph.set(r, lerp(tw.from.phi, tw.to.phi, e), tw.from.theta + tw.dTheta * e);
    sph.makeSafe();
    camera.position.setFromSpherical(sph).add(t);
    controls.target.copy(t);
    camera.lookAt(t);
    if (k >= 1) S.tween = null;
    return true;
  }
  controls.addEventListener('start', () => {
    S.tween = null;
    setActiveView(null);
    setActiveCheck(null);
  });

  // パン範囲を箱庭の周辺に制限
  const panBox = bbox.clone().expandByScalar(0.35);
  controls.addEventListener('change', () => {
    const t = controls.target;
    const c = panBox.clampPoint(t, tmpV);
    if (!c.equals(t)) {
      const d = c.clone().sub(t);
      t.add(d);
      camera.position.add(d);
    }
    S.needsRender = true;
  });

  /* ---------- ハイライト（emissive を短くパルス。終わったら元のマテリアルに戻す） ---------- */
  function endHighlight() {
    const h = S.highlight;
    if (!h) return;
    for (const en of h.entries) {
      en.mesh.material = en.orig;
      for (const c of en.clones) c.dispose();
    }
    S.highlight = null;
    S.needsRender = true;
  }
  function startHighlight(objs, delayMs = 0) {
    endHighlight();
    const entries = [];
    const seen = new Set();
    for (const o of objs) {
      if (!o) continue;
      o.traverse((m) => {
        if (!m.isMesh || seen.has(m)) return;
        seen.add(m);
        const orig = m.material;
        const arr = [].concat(orig);
        const clones = arr.map((mt) => mt.clone());
        const base = clones.map((c) => ({
          e: c.emissive ? c.emissive.clone() : null,
          i: isNum(c.emissiveIntensity) ? c.emissiveIntensity : 1,
        }));
        m.material = Array.isArray(orig) ? clones : clones[0];
        entries.push({ mesh: m, orig, clones, base });
      });
    }
    if (entries.length) S.highlight = { entries, t0: performance.now() + delayMs, dur: 2000 };
  }
  function stepHighlight(now) {
    const h = S.highlight;
    const p = (now - h.t0) / h.dur;
    if (p >= 1) {
      endHighlight();
      return;
    }
    const pulse = p < 0 ? 0 : Math.pow(Math.sin(Math.PI * 2 * p), 2) * (1 - 0.35 * p);
    const s = (S.mode === 'mood' ? 0.42 : 0.6) * pulse;
    for (const en of h.entries) {
      en.clones.forEach((c, k) => {
        const b = en.base[k];
        if (!c.emissive || !b.e) return;
        c.emissive.setRGB(b.e.r * b.i + HL_COLOR.r * s, b.e.g * b.i + HL_COLOR.g * s, b.e.b * b.i + HL_COLOR.b * s);
        c.emissiveIntensity = 1;
      });
    }
  }

  /* ---------- モード別の演出 ---------- */
  const rng = mulberry32(P.seed);
  const studioEnv = makeStudioEnvironment(renderer);
  const duskEnv = P.env ? makeDuskEnvironment(renderer) : null;
  const moodBg = makeGradientTexture(MOOD.bg);
  const studioBg = new THREE.Color(STUDIO.bg);

  const moodGroup = new THREE.Group();
  moodGroup.name = '__mood';
  const studioGroup = new THREE.Group();
  studioGroup.name = '__studio';
  scene.add(moodGroup, studioGroup);

  const hemi = new THREE.HemisphereLight(MOOD.hemi.sky, MOOD.hemi.ground, MOOD.hemi.intensity);
  moodGroup.add(hemi);

  const moon = new THREE.DirectionalLight(MOOD.moon.color, MOOD.moon.intensity);
  const moonDir = new THREE.Vector3(...MOOD.moon.dir).normalize();
  moon.position.copy(sceneTarget).addScaledVector(moonDir, 4);
  moon.target.position.copy(sceneTarget);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  const sr = Math.max(bsize.x, bsize.y, bsize.z) * 0.72;
  Object.assign(moon.shadow.camera, { left: -sr, right: sr, top: sr, bottom: -sr, near: 0.5, far: 8 });
  moon.shadow.camera.updateProjectionMatrix();
  moon.shadow.bias = -0.0004;
  moon.shadow.normalBias = 0.012;
  moon.shadow.radius = MOOD.moon.shadowRadius;
  moodGroup.add(moon, moon.target);

  // 灯籠の火袋に暖色の点光源
  let lanternPos = null;
  if (firebox) lanternPos = worldBox(firebox).getCenter(new THREE.Vector3());
  else if (Array.isArray(metrics.lantern_glow_center_gltf) && metrics.lantern_glow_center_gltf.every(isNum)) {
    lanternPos = new THREE.Vector3(...metrics.lantern_glow_center_gltf);
  }
  if (lanternPos) {
    const pl = new THREE.PointLight(MOOD.lantern.color, MOOD.lantern.intensity, MOOD.lantern.distance, 2);
    pl.position.copy(lanternPos);
    pl.castShadow = false;
    pl.name = '__lantern_light';
    moodGroup.add(pl);
  }

  // 雪と湯気
  const snow = buildSnow(rng, new THREE.Vector3(bcenter.x, 0, bcenter.z));
  moodGroup.add(snow);
  let steam = null;
  {
    const capyBox = capy ? worldBox(capy) : null;
    const excl = capyBox ? (v) => v.x > capyBox.min.x - 0.02 && v.x < capyBox.max.x + 0.02 && v.z > capyBox.min.z - 0.02 && v.z < capyBox.max.z + 0.02 : null;
    const spawn = sampleWaterPoints(rng, water && water.isMesh ? water : null, excl, MOOD.steam.count, waterBox);
    if (spawn.length) {
      steam = buildSteam(rng, spawn);
      moodGroup.add(steam);
    }
  }
  fxHidden.push(snow, steam, staticSteam, studioGroup);
  function setEffectsTime(t) {
    snow.material.uniforms.uTime.value = t;
    if (steam) steam.material.uniforms.uTime.value = t;
  }

  // スタジオ：2m 四方・10cm 目盛りのグリッド
  const grid = new THREE.GridHelper(STUDIO.grid.size, STUDIO.grid.divisions, STUDIO.grid.center, STUDIO.grid.line);
  grid.position.y = 0.0008;
  studioGroup.add(grid);

  const TM = { aces: THREE.ACESFilmicToneMapping, agx: THREE.AgXToneMapping, neutral: THREE.NeutralToneMapping };

  function applyMode(mode) {
    mode = mode === 'studio' ? 'studio' : 'mood';
    S.mode = mode;
    const mood = mode === 'mood';
    moodGroup.visible = mood;
    studioGroup.visible = !mood;
    if (staticSteam) staticSteam.visible = !mood;
    scene.background = mood ? moodBg : studioBg;
    scene.environment = mood ? duskEnv : studioEnv;
    scene.environmentIntensity = mood ? MOOD.envIntensity : STUDIO.envIntensity;
    renderer.toneMapping = TM[P.tm] ?? THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = P.exposure ?? (mood ? MOOD.exposure : STUDIO.exposure);
    renderer.shadowMap.needsUpdate = true;
    document.body.classList.toggle('mode-mood', mood);
    document.body.classList.toggle('mode-studio', !mood);
    for (const b of document.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    S.needsRender = true;
  }

  /* ---------- 描画ループ ---------- */
  function resize() {
    const w = Math.max(1, canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, canvas.clientHeight || window.innerHeight);
    const pr = Math.min(window.devicePixelRatio || 1, P.dpr ?? 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    snow.material.uniforms.uScale.value = (h * pr) / (2 * Math.tan((camera.fov * DEG) / 2));
    snow.material.uniforms.uMaxPx.value = 18 * pr;
    S.needsRender = true;
  }
  selectiveBloom.enabledBloom = P.bloom;
  function render() {
    if (S.mode === 'mood') composer.render();
    else renderer.render(scene, camera);
  }

  const tStart = performance.now();
  let last = tStart;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    let changed = false;
    if (S.tween) changed = stepTween(now) || changed;
    if (controls.update(dt)) changed = true;
    if (S.highlight) {
      stepHighlight(now);
      changed = true;
    }
    if (S.mode === 'mood') {
      setEffectsTime(P.time ?? (now - tStart) / 1000 + 24);
      if (P.time === null) changed = true;
    }
    if (changed || S.needsRender) {
      S.needsRender = false;
      render();
    }
  }

  /* ---------- UI ---------- */
  function setActiveView(name) {
    S.activeView = name;
    for (const b of document.querySelectorAll('[data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === name));
  }
  function setActiveCheck(id) {
    S.activeCheck = id;
    for (const b of document.querySelectorAll('[data-check]')) b.classList.toggle('is-active', b.dataset.check === String(id));
  }
  function setRotate(on) {
    controls.autoRotate = !!on;
    if (on) {
      setActiveView(null);
      setActiveCheck(null);
    }
    const b = $('#rotate-btn');
    if (b) b.setAttribute('aria-pressed', String(!!on));
  }

  // チェック項目
  const water0 = water && [].concat(water.material)[0];
  const glowMat = firebox && [].concat(firebox.material)[0];
  const snowCaps = findAll(/_Snow$/).length + findAll(/RoofSnow$|FinialSnow$|PlatformSnow$/).length;
  const fenceSides = findAll(/^BambooFence_.*_Slats$/).length;
  const ev = (label, value, src) => (value === null || value === undefined ? null : { label, value, src });
  const CHECKS = [
    {
      id: 1, title: 'ジオラマ台座（雪の地面と岩場）',
      frame: [find('Ground_SnowAndTub'), find('Base_SoilCrossSection')],
      glow: [find('Ground_SnowAndTub'), find('Base_SoilCrossSection')],
      view: { az: 32, el: 19, margin: 0.06 },
      evidence: [
        ev('外寸', (() => { const s = getPath(metrics, 'bbox_gltf_yup.size'); return Array.isArray(s) && s.length === 3 && s.every(isNum) ? `${s.map((v) => v.toFixed(2)).join('×')} m` : null; })(), 'metrics.json: bbox_gltf_yup.size'),
        ev('岩', (() => { const n = findAll(/^Rock_/).filter((o) => !/_Snow$/.test(o.userData.name || o.name)).length; return n ? `${n} 個` : null; })(), 'GLB 実測: Rock_* ノード数'),
      ],
    },
    {
      id: 2, title: '石組みの露天風呂と半透明のお湯',
      frame: [water, ...findAll(/^Rock_Rim/)],
      glow: [water, ...findAll(/^Rock_Rim(Small)?_\d+$/)],
      view: { az: 6, el: 50, margin: 0.08 },
      evidence: [
        ev('湯面', isNum(getPath(metrics, 'immersion.water_surface_z')) ? `${fmtNum(metrics.immersion.water_surface_z, 2)} m` : null, 'metrics.json: immersion.water_surface_z'),
        ev('お湯 α', water0 && water0.transparent ? fmtNum(water0.opacity, 2) : null, 'GLB 実測: OnsenWater の不透明度'),
      ],
    },
    {
      id: 3, title: '肩まで浸かるカピバラと頭の上の柚子',
      frame: null, // capy 専用フレーミング
      glow: [capy, find('Yuzu'), find('Yuzu_Calyx'), find('Yuzu_Stem'), find('Yuzu_Leaf')],
      view: { capy: true },
      evidence: [
        ev('柚子の接地', isNum(getPath(metrics, 'yuzu_contact.min_sdf_mm')) ? `SDF ${fmtNum(metrics.yuzu_contact.min_sdf_mm, 2)} mm` : null, 'metrics.json: yuzu_contact.min_sdf_mm'),
        ev('背中', isNum(getPath(metrics, 'immersion.back_top_below_water_mm')) ? `湯面下 ${fmtNum(metrics.immersion.back_top_below_water_mm)} mm` : null, 'metrics.json: immersion.back_top_below_water_mm'),
        ev('目', isNum(getPath(metrics, 'immersion.eye_above_water_mm')) ? `湯面上 ${fmtNum(metrics.immersion.eye_above_water_mm)} mm` : null, 'metrics.json: immersion.eye_above_water_mm'),
      ],
    },
    {
      id: 4, title: '竹の湯口と木の湯桶',
      frame: [find('Bamboo_Spout'), find('Wooden_Bucket_Yuoke')],
      glow: [find('Bamboo_Spout'), ...findAll(/^Bamboo_SpoutStand/), find('Spout_HotWaterStream'), ...findAll(/^Wooden_Bucket_/)],
      view: { az: -16, el: 38, margin: 0.14 },
      evidence: [
        ev('桶の接地', isNum(getPath(metrics, 'bucket.embed_mm')) ? `埋入 ${fmtNum(metrics.bucket.embed_mm)} mm` : null, 'metrics.json: bucket.embed_mm'),
        ev('湯口の脚', Array.isArray(metrics.spout_stand) ? (() => { const r = fmtRange(metrics.spout_stand.map((s) => s && s.embed_mm)); return r ? `埋入 ${r} mm` : null; })() : null, 'metrics.json: spout_stand[].embed_mm'),
        ev('湯口の突き出し', isNum(getPath(metrics, 'spout.exposed_length_m')) ? `${fmtNum(metrics.spout.exposed_length_m * 1000, 0)} mm` : null, 'metrics.json: spout.exposed_length_m'),
      ],
    },
    {
      id: 5, title: '背面〜側面の竹垣と積雪',
      frame: [...findAll(/^BambooFence_.*_Slats$/), find('BambooFence_Snow')],
      glow: [...findAll(/^BambooFence_.*_Slats$/), find('BambooFence_Snow')],
      view: { az: 24, el: 24, margin: 0.06 },
      evidence: [
        ev('竹垣', fenceSides ? `${fenceSides} 面` : null, 'GLB 実測: BambooFence_*_Slats'),
        ev('積雪', snowCaps ? `${snowCaps} 箇所` : null, 'GLB 実測: *_Snow ノード数'),
        ev('竹垣', isNum(metrics.fence_tris) ? `${fmtInt(metrics.fence_tris)} 三角形` : null, 'metrics.json: fence_tris'),
      ],
    },
    {
      id: 6, title: '火袋が暖色に光る石灯籠',
      frame: [find('StoneLantern_Yukimi'), firebox],
      glow: [find('StoneLantern_Yukimi'), firebox],
      view: { az: -6, el: 16, margin: 0.16 },
      evidence: [
        ev('脚の埋入', (() => { const r = fmtRange(getPath(metrics, 'lantern.feet_embed_mm')); return r ? `${r} mm` : null; })(), 'metrics.json: lantern.feet_embed_mm'),
        ev('発光強度', glowMat && glowMat.emissive && glowMat.emissive.getHex() !== 0 ? `×${fmtNum(glowMat.emissiveIntensity, 1)}` : null, 'GLB 実測: Lantern_Firebox_Glow の emissive strength'),
      ],
    },
  ];
  const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

  function checkPose(item) {
    if (item.view.capy) return viewPose('capy');
    const objs = (item.frame || []).filter(Boolean);
    if (!objs.length) return null;
    const pts = collectPoints(objs, 3000);
    if (!pts.length) return null;
    const t = pointsBox(pts).getCenter(new THREE.Vector3());
    const { az, el, margin } = item.view;
    return posePlain(t, az, el, Math.max(0.5, fitDistance(pts, t, az, el, margin)));
  }
  function focusCheck(item, { instant = false, highlight = true } = {}) {
    const pose = checkPose(item);
    if (!pose) return false;
    setRotate(false);
    setActiveView(null);
    setActiveCheck(item.id);
    if (instant) setPose(pose);
    else flyTo(pose);
    if (highlight) startHighlight(item.glow.filter(Boolean), instant ? 0 : P.reduced ? 200 : 650);
    return true;
  }

  function buildUI() {
    // 視点ボタン
    const views = $('#view-buttons');
    if (views) {
      views.innerHTML = VIEW_ORDER.map((k) => `<button type="button" data-view="${k}" title="${escapeHTML(VIEW_TITLE[k])}" aria-pressed="false">${VIEW_LABEL[k]}</button>`).join('');
      views.addEventListener('click', (e) => {
        const b = e.target.closest('[data-view]');
        if (!b) return;
        setRotate(false);
        setActiveCheck(null);
        setActiveView(b.dataset.view);
        flyTo(viewPose(b.dataset.view));
      });
    }
    const rot = $('#rotate-btn');
    if (rot) rot.addEventListener('click', () => setRotate(!controls.autoRotate));
    for (const b of document.querySelectorAll('[data-mode]')) {
      b.addEventListener('click', () => {
        applyMode(b.dataset.mode);
        try {
          const u = new URL(location.href);
          u.searchParams.set('mode', S.mode);
          history.replaceState(null, '', u);
        } catch (e) { /* file:// などで失敗しても無視 */ }
      });
    }

    // チェック項目
    const list = $('#check-list');
    if (list) {
      list.innerHTML = CHECKS.map((it) => {
        const available = it.view.capy ? capyFocus.length > 0 : (it.frame || []).some(Boolean);
        const evs = it.evidence.filter(Boolean);
        const evHTML = evs.length
          ? `<span class="ev">${evs.map((e) => `<span class="ev-i" title="${escapeHTML(e.src)}">${escapeHTML(e.label)} <b>${escapeHTML(e.value)}</b></span>`).join('')}</span>`
          : '';
        return `<li><button type="button" class="check" data-check="${it.id}" ${available ? '' : 'disabled'}>
          <span class="num" aria-hidden="true">${CIRCLED[it.id - 1] || it.id}</span>
          <span class="body"><span class="ttl">${escapeHTML(it.title)}${available ? '' : '<em class="na">（未検出）</em>'}</span>${evHTML}</span>
        </button></li>`;
      }).join('');
      list.addEventListener('click', (e) => {
        const b = e.target.closest('[data-check]');
        if (!b || b.disabled) return;
        const it = CHECKS.find((c) => String(c.id) === b.dataset.check);
        if (it) focusCheck(it);
        // スマホ幅では結果が見えるようにパネルを畳む
        const det = $('#checks');
        if (det && window.matchMedia('(max-width: 720px)').matches) det.open = false;
      });
    }
    const checks = $('#checks');
    if (checks && window.matchMedia('(max-width: 720px)').matches) checks.open = false;

    // 情報
    const info = $('#info-list');
    if (info) {
      const glbBytes = isNum(buildInfo.glbBytes) ? buildInfo.glbBytes : u8.byteLength;
      const rows = [
        ['三角形', fmtInt(triangles)],
        ['メッシュ', `${fmtInt(meshCount)}${gltfNodes !== null ? `<small>（ノード ${fmtInt(gltfNodes)}）</small>` : ''}`],
        ['マテリアル', fmtInt(materials.size)],
        ['外接箱', `<span class="nw">${bsize.x.toFixed(3)} × ${bsize.y.toFixed(3)} × ${bsize.z.toFixed(3)} m</span><small>幅 × 高さ × 奥行</small>`],
        ['GLB', `${(glbBytes / 1e6).toFixed(2)} MB`],
      ];
      info.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    }
    const built = $('#build-stamp');
    if (built && buildInfo.builtAt) built.textContent = `three.js r${THREE.REVISION} ・ build ${String(buildInfo.builtAt).replace('T', ' ').slice(0, 16)}`;

    // キーボード
    window.addEventListener('keydown', (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'r') setRotate(!controls.autoRotate);
      else if (k === 'm') applyMode(S.mode === 'mood' ? 'studio' : 'mood');
      else if (/^[1-7]$/.test(k)) {
        const name = VIEW_ORDER[Number(k) - 1];
        setRotate(false);
        setActiveView(name);
        flyTo(viewPose(name));
      }
    });
  }

  /* ---------- 起動 ---------- */
  applyMode(P.mode);
  resize();
  window.addEventListener('resize', () => {
    orbitDistCache.clear();
    resize();
  });
  buildUI();

  let initialView = P.view || 'front';
  if (P.angle !== null) {
    setPose(anglePose(P.angle, P.elev));
    initialView = null;
  } else {
    setPose(viewPose(initialView));
  }
  setActiveView(P.angle === null ? initialView : null);
  setRotate(P.rotate);
  setEffectsTime(P.time ?? 24);

  render();
  requestAnimationFrame(loop);
  await nextFrames(2);

  // 自動撮影・検証用 API
  function imageStats() {
    render();
    const gl = renderer.getContext();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let n = 0;
    let sum = 0;
    let sum2 = 0;
    let fg = 0;
    for (let y = 0; y < h; y += 3) {
      const r0 = y * w * 4;
      const br = px[r0];
      const bgc = px[r0 + 1];
      const bb = px[r0 + 2];
      for (let x = 0; x < w; x += 3) {
        const i = r0 + x * 4;
        const l = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
        sum += l;
        sum2 += l * l;
        n++;
        if (Math.abs(px[i] - br) + Math.abs(px[i + 1] - bgc) + Math.abs(px[i + 2] - bb) > 24) fg++;
      }
    }
    const mean = sum / n;
    return { w, h, mean: +mean.toFixed(2), std: +Math.sqrt(Math.max(0, sum2 / n - mean * mean)).toFixed(2), coverage: +(fg / n).toFixed(4) };
  }
  let glRenderer = '';
  if (navigator.webdriver) {
    try {
      const gl = renderer.getContext();
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      glRenderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    } catch (e) { /* noop */ }
  }
  window.__viewer = {
    setAngle: async (az, el = ORBIT_EL) => { setRotate(false); setPose(anglePose(az, el)); await nextFrames(2); return true; },
    setView: async (name) => { setRotate(false); setPose(viewPose(name)); setActiveView(name); await nextFrames(2); return true; },
    setMode: async (m) => { applyMode(m); await nextFrames(2); return S.mode; },
    focusCheck: async (id, opts = {}) => {
      const it = CHECKS.find((c) => c.id === Number(id));
      const ok = it ? focusCheck(it, opts) : false;
      await nextFrames(2);
      return ok;
    },
    setTime: async (t) => { P.time = t; setEffectsTime(t); S.needsRender = true; await nextFrames(2); return true; },
    stats: () => imageStats(),
    info: () => ({
      triangles, meshes: meshCount, materials: materials.size, nodes: gltfNodes, gltfMeshes,
      bloomThreshold: +bloomPass.threshold.toFixed(3), glowLumMax: +glowLumMax.toFixed(3),
      bbox: { min: bbox.min.toArray(), max: bbox.max.toArray(), size: bsize.toArray() },
      mode: S.mode, gl: glRenderer, three: THREE.REVISION, capyFaceAz: +capyFaceAz.toFixed(1),
      lantern: lanternPos ? lanternPos.toArray().map((v) => +v.toFixed(3)) : null,
      steamSprites: steam ? steam.geometry.attributes.aCorner.count / 4 : 0,
      missing: ['Capybara', 'Yuzu', 'Onsen_WaterSurface', 'Onsen_Steam', 'Bamboo_Spout', 'Wooden_Bucket_Yuoke', 'StoneLantern_Yukimi', 'StoneLantern_Firebox_Glow', 'Ground_SnowAndTub', 'Base_SoilCrossSection', 'BambooFence_Snow'].filter((n) => !find(n)),
    }),
  };
  const ld = $('#loading');
  if (ld) ld.hidden = true;
  window.__ready = true;
}

main().catch((e) => showError((e && e.message) || String(e)));
