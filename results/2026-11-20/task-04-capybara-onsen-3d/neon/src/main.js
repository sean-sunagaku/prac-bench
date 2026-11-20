import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import {
  createCapybaraFurTextures,
  createYuzuTextures,
  createRockTextures,
  createHinokiWoodTextures,
  createBambooTexture,
  createSnowTextures,
  createPineNeedleTextures,
  createTenuguiTexture,
  createSteamTexture,
  createSplashFoamTexture,
  createSnowflakeTexture,
  createPineBarkTexture,
} from './textures.js';
import { createDioramaIsland, createWinterSky } from './environment.js';
import { createOnsen } from './onsen.js';
import { createCapybara } from './capybara.js';
import { createGarden } from './garden.js';
import { createAtmosphere } from './atmosphere.js';
import { setupUI } from './ui.js';

// =========================================================================
// 1. Renderer, Scene, Camera, OrbitControls
// =========================================================================
const container = document.getElementById('canvas-container');

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2('#1c2840', 0.012);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 160);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.maxPolarAngle = Math.PI * 0.54;
controls.minPolarAngle = 0.18;
controls.minDistance = 1.8;
controls.maxDistance = 24.0;
controls.autoRotate = false;
controls.autoRotateSpeed = 0.48;

// Camera Presets — balanced postcard framing showcasing the whole sculpted floating miniature island!
const CAMERA_PRESETS = {
  diorama: {
    pos: new THREE.Vector3(6.55, 4.2, 9.85),
    target: new THREE.Vector3(0.62, 0.56, -0.32),
  },
  closeup: {
    pos: new THREE.Vector3(1.52, 1.02, 2.2),
    target: new THREE.Vector3(0.06, 0.45, 0.36),
  },
  low: {
    pos: new THREE.Vector3(-2.35, 1.48, 4.35),
    target: new THREE.Vector3(0.18, 0.62, -0.15),
  },
  top: {
    pos: new THREE.Vector3(0.5, 10.1, 5.8),
    target: new THREE.Vector3(0.0, 0.18, 0.02),
  },
};

camera.position.copy(CAMERA_PRESETS.diorama.pos);
controls.target.copy(CAMERA_PRESETS.diorama.target);
controls.update();

let camAnim = null;
controls.addEventListener('start', () => {
  camAnim = null;
});

function transitionCamera(presetName, instant = false) {
  const preset = CAMERA_PRESETS[presetName];
  if (!preset) return;
  if (instant) {
    camAnim = null;
    camera.position.copy(preset.pos);
    controls.target.copy(preset.target);
    controls.update();
    return;
  }
  camAnim = {
    startPos: camera.position.clone(),
    startTarget: controls.target.clone(),
    endPos: preset.pos.clone(),
    endTarget: preset.target.clone(),
    t: 0,
    duration: 0.95,
  };
}

// =========================================================================
// 2. Procedural Textures & Diorama World Assembly
// =========================================================================
const textures = {
  fur: createCapybaraFurTextures(),
  yuzu: createYuzuTextures(),
  rock: createRockTextures(),
  hinoki: createHinokiWoodTextures(),
  bambooDry: createBambooTexture('dry'),
  bambooGreen: createBambooTexture('green'),
  snow: createSnowTextures(),
  pineNeedle: createPineNeedleTextures(),
  tenugui: createTenuguiTexture(),
  steam: createSteamTexture(),
  splashFoam: createSplashFoamTexture(),
  snowflake: createSnowflakeTexture(),
  pineBark: createPineBarkTexture(),
};

const sky = createWinterSky();
scene.add(sky.mesh);

const island = createDioramaIsland(textures);
scene.add(island);

const onsen = createOnsen(textures);
scene.add(onsen.group);

const capybara = createCapybara(textures);
scene.add(capybara.group);

const garden = createGarden(textures);
scene.add(garden.group);

onsen.waterUniforms.uWarmGlowPos.value.copy(garden.lanternWorldPos);

const atmosphere = createAtmosphere(textures, onsen.splashPoint);
scene.add(atmosphere.group);

// =========================================================================
// 3. Lighting & Curated Winter Moods (夕暮れ / 雪晴れ / 月夜)
// =========================================================================
const hemiLight = new THREE.HemisphereLight('#8fb6e8', '#42495a', 1.0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight('#d7e6ff', 1.45);
dirLight.position.set(7.5, 9.2, 6.0);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 1.0;
dirLight.shadow.camera.far = 28.0;
const shadowBound = 8.0;
dirLight.shadow.camera.left = -shadowBound;
dirLight.shadow.camera.right = shadowBound;
dirLight.shadow.camera.top = shadowBound;
dirLight.shadow.camera.bottom = -shadowBound;
dirLight.shadow.bias = -0.0005;
dirLight.shadow.normalBias = 0.02;
scene.add(dirLight);

// Soft warm front-side fill illuminating the capybara's gentle face & fur (placed in front, never under the yuzu!)
const capyFaceFill = new THREE.PointLight('#ffe0bc', 0.72, 4.8, 1.8);
capyFaceFill.position.set(1.1, 0.92, 1.85);
scene.add(capyFaceFill);

// Soft cool rim/back light to separate the snow-laden pine & capybara silhouette cleanly
const rimLight = new THREE.DirectionalLight('#9cc2ff', 0.65);
rimLight.position.set(-7.0, 5.5, -7.5);
scene.add(rimLight);

const MOODS = {
  twilight: {
    skyZenith: '#131f3a',
    skyMid: '#314772',
    skyHorizon: '#8a7284',
    skyGround: '#1a2336',
    stars: 0.55,
    moon: 0.34,
    fogColor: '#25324e',
    fogDensity: 0.012,
    hemiSky: '#9ec0ec',
    hemiGround: '#4a4350',
    hemiIntensity: 1.08,
    dirColor: '#dce6ff',
    dirIntensity: 1.28,
    dirPos: [7.5, 8.8, 6.5],
    rimColor: '#98c2ff',
    rimIntensity: 0.66,
    lanternScale: 1.08,
    exposure: 1.12,
    waterDeep: '#338486',
    waterShallow: '#7ecac5',
    waterSkyReflect: '#4d6a94',
    waterGlowStrength: 1.05,
    steamTint: '#faf2e8',
    faceFillIntensity: 0.72,
  },
  morning: {
    skyZenith: '#4c88c9',
    skyMid: '#8ec0e8',
    skyHorizon: '#e9eff6',
    skyGround: '#c4d4e6',
    stars: 0.0,
    moon: 0.0,
    fogColor: '#c9dced',
    fogDensity: 0.0085,
    hemiSky: '#dcedff',
    hemiGround: '#8798ac',
    hemiIntensity: 1.38,
    dirColor: '#fff4df',
    dirIntensity: 2.35,
    dirPos: [8.5, 10.5, 6.8],
    rimColor: '#bde0ff',
    rimIntensity: 0.55,
    lanternScale: 0.24,
    exposure: 1.06,
    waterDeep: '#3b9a9c',
    waterShallow: '#98ded9',
    waterSkyReflect: '#9cc7e8',
    waterGlowStrength: 0.22,
    steamTint: '#ffffff',
    faceFillIntensity: 0.45,
  },
  night: {
    skyZenith: '#070d1d',
    skyMid: '#11203d',
    skyHorizon: '#233659',
    skyGround: '#0a101d',
    stars: 1.0,
    moon: 0.95,
    fogColor: '#101a30',
    fogDensity: 0.014,
    hemiSky: '#5d7db3',
    hemiGround: '#242a38',
    hemiIntensity: 0.72,
    dirColor: '#a8c6ff',
    dirIntensity: 0.88,
    dirPos: [-6.5, 9.5, -6.5],
    rimColor: '#7ea9f0',
    rimIntensity: 0.72,
    lanternScale: 1.48,
    exposure: 1.18,
    waterDeep: '#225e66',
    waterShallow: '#58a8a8',
    waterSkyReflect: '#284068',
    waterGlowStrength: 1.45,
    steamTint: '#f4eadc',
    faceFillIntensity: 0.92,
  },
};

let currentLanternScale = MOODS.twilight.lanternScale;

function applyMood(moodName) {
  const m = MOODS[moodName];
  if (!m) return;

  sky.uniforms.uZenithColor.value.set(m.skyZenith);
  sky.uniforms.uMidColor.value.set(m.skyMid);
  sky.uniforms.uHorizonColor.value.set(m.skyHorizon);
  sky.uniforms.uGroundColor.value.set(m.skyGround);
  sky.uniforms.uStarIntensity.value = m.stars;
  sky.uniforms.uMoonIntensity.value = m.moon;

  scene.fog.color.set(m.fogColor);
  scene.fog.density = m.fogDensity;

  hemiLight.color.set(m.hemiSky);
  hemiLight.groundColor.set(m.hemiGround);
  hemiLight.intensity = m.hemiIntensity;

  dirLight.color.set(m.dirColor);
  dirLight.intensity = m.dirIntensity;
  dirLight.position.set(...m.dirPos);

  rimLight.color.set(m.rimColor);
  rimLight.intensity = m.rimIntensity;

  currentLanternScale = m.lanternScale;
  renderer.toneMappingExposure = m.exposure;

  onsen.waterUniforms.uDeepColor.value.set(m.waterDeep);
  onsen.waterUniforms.uShallowColor.value.set(m.waterShallow);
  onsen.waterUniforms.uSkyReflect.value.set(m.waterSkyReflect);
  onsen.waterUniforms.uWarmGlowStrength.value = m.waterGlowStrength;

  capyFaceFill.intensity = m.faceFillIntensity;
  atmosphere.setSteamTint(m.steamTint);
}

applyMood('twilight');

// =========================================================================
// 4. UI Binding
// =========================================================================
const ui = setupUI({
  onCameraPreset: (name) => transitionCamera(name, false),
  onMoodPreset: (mood) => applyMood(mood),
  onToggleSnow: (on) => atmosphere.setSnowEnabled(on),
  onToggleSteam: (on) => atmosphere.setSteamEnabled(on),
  onToggleRotate: (on) => {
    controls.autoRotate = on;
  },
});

// =========================================================================
// 5. Animation Loop & Resize Handling
// =========================================================================
let lastTimeMs = performance.now();
let elapsed = 0;

function tick(dt) {
  elapsed += dt;

  if (camAnim) {
    camAnim.t = Math.min(1, camAnim.t + dt / camAnim.duration);
    const e = 1 - Math.pow(1 - camAnim.t, 3);
    camera.position.lerpVectors(camAnim.startPos, camAnim.endPos, e);
    controls.target.lerpVectors(camAnim.startTarget, camAnim.endTarget, e);
    if (camAnim.t >= 1) {
      camAnim = null;
    }
  }

  controls.update();
  sky.update(elapsed);
  onsen.update(elapsed);
  capybara.update(elapsed);
  garden.update(elapsed, currentLanternScale);
  atmosphere.update(elapsed, dt);

  renderer.render(scene, camera);
}

function animate(nowMs) {
  requestAnimationFrame(animate);
  const dt = Math.min(Math.max((nowMs - lastTimeMs) / 1000, 0), 0.05);
  lastTimeMs = nowMs;
  tick(dt);
}

requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.__ONSEN_DEBUG__ = {
  setCamera(name) {
    transitionCamera(name, true);
    ui.setActiveCamButton(name);
    tick(0.016);
  },
  setCustomCamera(pos, target) {
    camAnim = null;
    camera.position.set(...pos);
    controls.target.set(...target);
    controls.update();
    tick(0.016);
  },
  setMood(name) {
    applyMood(name);
    ui.setActiveMoodButton(name);
    tick(0.016);
  },
  setHudVisible(v) {
    ui.setHudVisible(v);
  },
  advance(seconds) {
    const steps = Math.max(1, Math.ceil(seconds / 0.033));
    for (let i = 0; i < steps; i++) {
      tick(seconds / steps);
    }
  },
  getStats() {
    return {
      triangles: renderer.info.render.triangles,
      calls: renderer.info.render.calls,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
    };
  },
};
