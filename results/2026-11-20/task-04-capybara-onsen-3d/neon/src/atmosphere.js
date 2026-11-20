import * as THREE from 'three';
import { WATER_Y, POOL_CENTER_X, POOL_CENTER_Z } from './environment.js';

function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Dynamic winter onsen atmosphere:
 * - Lush curling rising hot spring steam wisps (湯気) across water & spout
 * - Crisp distance-clamped gently falling winter snow (降雪) — never giant blurry blobs near lens!
 * - Fine shimmering splash droplets around the bamboo water spout
 */
export function createAtmosphere(textures, splashPoint) {
  const group = new THREE.Group();
  group.name = 'OnsenAtmosphere';
  const rng = seededRng(20261120);

  // =========================================================================
  // 1. Rising Hot Spring Steam Wisps (湯気)
  // =========================================================================
  const steamGroup = new THREE.Group();
  steamGroup.name = 'HotSpringSteam';
  group.add(steamGroup);

  const steamParticles = [];
  const steamCount = 58;

  for (let i = 0; i < steamCount; i++) {
    const mat = new THREE.SpriteMaterial({
      map: textures.steam,
      color: new THREE.Color('#f7f2eb'),
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.renderOrder = 6;
    steamGroup.add(sprite);

    // ~30% concentrated near hot bamboo spout, rest rising warmly across the bath
    // while keeping a clean sightseeing corridor right in front of the capybara's face!
    const nearSpout = i < 18;
    let baseX;
    let baseZ;
    if (nearSpout) {
      baseX = splashPoint.x + (rng() - 0.5) * 1.15;
      baseZ = splashPoint.y + (rng() - 0.5) * 1.05;
    } else {
      const ang = rng() * Math.PI * 2;
      const rad = 0.62 + rng() * 1.52;
      baseX = POOL_CENTER_X + Math.cos(ang) * rad * 1.04;
      baseZ = POOL_CENTER_Z + Math.sin(ang) * rad * 0.84;
      if (Math.hypot(baseX - 0.16, baseZ - 0.58) < 0.72) {
        baseZ -= 0.78;
      }
    }

    steamParticles.push({
      sprite,
      mat,
      baseX,
      baseZ,
      phase: rng(),
      lifeSpeed: 0.105 + rng() * 0.07,
      maxHeight: nearSpout ? 2.6 + rng() * 1.3 : 2.15 + rng() * 1.45,
      baseScale: nearSpout ? 0.78 + rng() * 0.48 : 0.92 + rng() * 0.6,
      peakOpacity: nearSpout ? 0.36 + rng() * 0.13 : 0.27 + rng() * 0.11,
      driftX: 0.24 + rng() * 0.32,
      driftZ: -0.08 + (rng() - 0.5) * 0.26,
      swayAmp: 0.13 + rng() * 0.14,
      swayFreq: 0.68 + rng() * 0.58,
      rotStart: rng() * Math.PI * 2,
      rotSpeed: (rng() - 0.5) * 0.34,
    });
  }

  // =========================================================================
  // 2. Gently Falling Winter Snow (降る雪) — Distance-Clamped & Soft Near-Lens Fade!
  // =========================================================================
  const snowGroup = new THREE.Group();
  snowGroup.name = 'FallingSnow';
  group.add(snowGroup);

  const snowCount = 960;
  const snowPositions = new Float32Array(snowCount * 3);
  const snowSizes = new Float32Array(snowCount);
  const snowMeta = [];

  for (let i = 0; i < snowCount; i++) {
    const r = Math.sqrt(rng()) * 9.8;
    const ang = rng() * Math.PI * 2;
    const x = Math.cos(ang) * r;
    const y = rng() * 10.5 - 0.5;
    const z = Math.sin(ang) * r;

    snowPositions[i * 3] = x;
    snowPositions[i * 3 + 1] = y;
    snowPositions[i * 3 + 2] = z;
    snowSizes[i] = 0.7 + rng() * 0.85;

    snowMeta.push({
      baseX: x,
      baseZ: z,
      y,
      speed: 0.48 + rng() * 0.58,
      swayAmp: 0.22 + rng() * 0.34,
      swayFreq: 0.48 + rng() * 0.82,
      phase: rng() * Math.PI * 2,
    });
  }

  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
  snowGeo.setAttribute('aSize', new THREE.BufferAttribute(snowSizes, 1));

  const snowUniforms = {
    uMap: { value: textures.snowflake },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    uOpacity: { value: 0.88 },
  };

  const snowMat = new THREE.ShaderMaterial({
    uniforms: snowUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    vertexShader: /* glsl */ `
      attribute float aSize;
      uniform float uPixelRatio;
      varying float vAlpha;

      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        float dist = max(0.5, -mvPos.z);
        // Clamp screen-space size so snowflakes stay delicate and never balloon in front of camera!
        float ptSize = (58.0 * aSize * uPixelRatio) / dist;
        gl_PointSize = clamp(ptSize, 2.0 * uPixelRatio, 10.5 * uPixelRatio);
        // Smoothly fade flakes that drift right in front of the camera lens
        vAlpha = smoothstep(1.4, 3.2, dist) * smoothstep(26.0, 14.0, dist);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uOpacity;
      varying float vAlpha;

      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        float a = tex.a * uOpacity * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(tex.rgb, a);
      }
    `,
  });

  const snowPoints = new THREE.Points(snowGeo, snowMat);
  snowPoints.renderOrder = 8;
  snowGroup.add(snowPoints);

  // =========================================================================
  // 3. Delicate Water Splash Droplets near Bamboo Spout
  // =========================================================================
  const dropCount = 28;
  const dropPositions = new Float32Array(dropCount * 3);
  const dropMeta = [];
  for (let i = 0; i < dropCount; i++) {
    const a = rng() * Math.PI * 2;
    const spd = 0.2 + rng() * 0.36;
    dropMeta.push({
      vx: Math.cos(a) * spd,
      vz: Math.sin(a) * spd,
      vy: 0.7 + rng() * 0.52,
      phase: rng(),
      rate: 1.55 + rng() * 0.75,
    });
  }
  const dropGeo = new THREE.BufferGeometry();
  dropGeo.setAttribute('position', new THREE.BufferAttribute(dropPositions, 3));
  const dropMat = new THREE.PointsMaterial({
    color: '#ecfbff',
    map: textures.snowflake,
    size: 0.072,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
  });
  const splashDrops = new THREE.Points(dropGeo, dropMat);
  splashDrops.renderOrder = 5;
  group.add(splashDrops);

  let snowEnabled = true;
  let steamEnabled = true;
  const steamTint = new THREE.Color('#f7f1e8');

  return {
    group,
    setSnowEnabled(val) {
      snowEnabled = val;
      snowGroup.visible = val;
    },
    setSteamEnabled(val) {
      steamEnabled = val;
      steamGroup.visible = val;
    },
    setSteamTint(hexOrColor) {
      steamTint.set(hexOrColor);
    },
    update(time, delta) {
      if (steamEnabled) {
        for (const p of steamParticles) {
          const life = (p.phase + time * p.lifeSpeed) % 1.0;
          const y = WATER_Y + 0.14 + life * p.maxHeight;
          const x =
            p.baseX + p.driftX * life + Math.sin(time * p.swayFreq + p.phase * 12.0) * p.swayAmp * life;
          const z =
            p.baseZ + p.driftZ * life + Math.cos(time * p.swayFreq * 0.85 + p.phase * 9.0) * p.swayAmp * life;

          p.sprite.position.set(x, y, z);

          const fadeIn = THREE.MathUtils.smoothstep(life, 0.0, 0.22);
          const fadeOut = 1.0 - THREE.MathUtils.smoothstep(life, 0.5, 1.0);
          p.mat.opacity = fadeIn * fadeOut * p.peakOpacity;
          p.mat.color.copy(steamTint);
          p.mat.rotation = p.rotStart + time * p.rotSpeed;

          const scale = p.baseScale * (0.58 + life * 1.48);
          p.sprite.scale.set(scale, scale * 1.08, 1);
        }
      }

      if (snowEnabled) {
        const posAttr = snowGeo.attributes.position;
        const arr = posAttr.array;
        const dt = Math.min(delta, 0.05);
        for (let i = 0; i < snowCount; i++) {
          const m = snowMeta[i];
          m.y -= m.speed * dt;
          if (m.y < -0.45) {
            m.y = 9.8 + (i % 7) * 0.12;
          }
          arr[i * 3] =
            m.baseX + Math.sin(time * m.swayFreq + m.phase) * m.swayAmp + Math.sin(time * 0.22) * 0.28;
          arr[i * 3 + 1] = m.y;
          arr[i * 3 + 2] = m.baseZ + Math.cos(time * m.swayFreq * 0.85 + m.phase) * m.swayAmp;
        }
        posAttr.needsUpdate = true;
      }

      const dAttr = dropGeo.attributes.position;
      const dArr = dAttr.array;
      for (let i = 0; i < dropCount; i++) {
        const d = dropMeta[i];
        const t = (d.phase + time * d.rate) % 1.0;
        const y = WATER_Y + 0.02 + d.vy * t - 1.35 * t * t;
        dArr[i * 3] = splashPoint.x + d.vx * t;
        dArr[i * 3 + 1] = Math.max(WATER_Y - 0.05, y);
        dArr[i * 3 + 2] = splashPoint.y + d.vz * t;
      }
      dAttr.needsUpdate = true;
    },
  };
}
