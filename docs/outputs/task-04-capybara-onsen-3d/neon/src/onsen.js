import * as THREE from 'three';
import { WATER_Y, POOL_CENTER_X, POOL_CENTER_Z, POOL_RX, POOL_RZ } from './environment.js';
import { createYuzuMesh } from './capybara.js';

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Applies smooth top-down planar UVs to a snow cap mesh so there is ZERO UV pole starburst/pinching!
 */
function applyPlanarSnowUVs(geo, scale = 0.45) {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) * scale + 0.5, pos.getZ(i) * scale + 0.5);
  }
  uv.needsUpdate = true;
}

/**
 * Creates a natural volcanic Japanese onsen boulder with weathered grey-brown granite tones,
 * wet waterline darkening, subtle moss, and a plush planar-UV sculpted snow pillow resting on top!
 */
export function createOnsenRock({
  radiusX = 0.7,
  radiusY = 0.55,
  radiusZ = 0.65,
  seed = 1,
  snowCap = true,
  snowThickness = 0.15,
  textures,
  worldY = 0.1,
}) {
  const rng = seededRandom(seed);
  const rockGroup = new THREE.Group();

  const geo = new THREE.SphereGeometry(1.0, 32, 22);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  const p1 = rng() * 6.28;
  const p2 = rng() * 6.28;
  const p3 = rng() * 6.28;

  const dryStone = new THREE.Color('#7f8389');
  const wetStone = new THREE.Color('#3c434c');
  const mossTint = new THREE.Color('#5a6f52');
  const tmp = new THREE.Color();

  function rockDisp(nx, ny, nz) {
    const n1 = Math.sin(nx * 2.5 + p1) * Math.cos(ny * 2.3 + p2) * Math.sin(nz * 2.7 + p3);
    const n2 = Math.cos(nx * 4.6 - nz * 4.2 + p2) * 0.38;
    return 1.0 + n1 * 0.14 + n2 * 0.055;
  }

  for (let i = 0; i < pos.count; i++) {
    const ux = pos.getX(i);
    const uy = pos.getY(i);
    const uz = pos.getZ(i);
    const disp = rockDisp(ux, uy, uz);

    const x = ux * radiusX * disp;
    let y = uy * radiusY * disp;
    const z = uz * radiusZ * disp;

    if (y < -radiusY * 0.48) {
      y = -radiusY * 0.48 + (y + radiusY * 0.48) * 0.35;
    }
    if (y > radiusY * 0.56) {
      y = radiusY * 0.56 + (y - radiusY * 0.56) * 0.52;
    }

    pos.setXYZ(i, x, y, z);

    const approxWorldY = worldY + y;
    const wetFactor = 1.0 - THREE.MathUtils.smoothstep(approxWorldY, -0.05, 0.24);
    tmp.copy(dryStone).lerp(wetStone, wetFactor * 0.72);
    if (uy > 0.04 && disp > 1.05) {
      tmp.lerp(mossTint, 0.3);
    }
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const rockMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: textures.rock.map,
    bumpMap: textures.rock.bumpMap,
    bumpScale: 0.055,
    roughness: 0.84,
    metalness: 0.04,
  });

  const rockMesh = new THREE.Mesh(geo, rockMat);
  rockMesh.castShadow = true;
  rockMesh.receiveShadow = true;
  rockGroup.add(rockMesh);

  // Plush rounded powdery snow pillow nestled seamlessly onto the boulder crown (planar UVs = zero pole artifacts!)
  if (snowCap) {
    const capGeo = new THREE.SphereGeometry(1.0, 32, 18);
    const cPos = capGeo.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      const ux = cPos.getX(i);
      const uy = cPos.getY(i);
      const uz = cPos.getZ(i);

      const disp = rockDisp(ux, Math.max(0.28, uy), uz);
      const ang = Math.atan2(uz, ux);
      const edgeWave = 1.0 + 0.06 * Math.sin(ang * 4.0 + p1) + 0.03 * Math.cos(ang * 7.0 - p2);
      // Slight rounded overhang skirt at the snow rim so it sits like real thick winter snow
      const skirtBulge = uy < 0 ? 1.0 + Math.sin(Math.min(1, -uy) * Math.PI) * 0.04 : 1.0;
      const x = ux * radiusX * 0.88 * disp * edgeWave * skirtBulge;
      const z = uz * radiusZ * 0.88 * disp * edgeWave * skirtBulge;

      const baseCrownY = radiusY * 0.54 * disp;
      const y =
        uy >= 0
          ? baseCrownY + Math.pow(uy, 0.72) * (snowThickness + radiusY * 0.24)
          : baseCrownY + uy * (radiusY * 0.24);

      cPos.setXYZ(i, x, y, z);
    }
    applyPlanarSnowUVs(capGeo, 0.52);
    capGeo.computeVertexNormals();

    const snowCapMat = new THREE.MeshStandardMaterial({
      color: '#f6f9ff',
      map: textures.snow.map,
      bumpMap: textures.snow.bumpMap,
      bumpScale: 0.022,
      roughness: 0.85,
      metalness: 0.01,
    });
    const capMesh = new THREE.Mesh(capGeo, snowCapMat);
    capMesh.castShadow = true;
    capMesh.receiveShadow = true;
    rockGroup.add(capMesh);
  }

  return rockGroup;
}

export function createOnsen(textures) {
  const group = new THREE.Group();
  group.name = 'Onsen';

  // =========================================================================
  // 1. Natural Rock-Lined Rotenburo Rim (岩風呂の縁岩)
  // =========================================================================
  const rimRocks = [
    // Back-left terraced boulders flanking the bamboo water spout
    { a: -2.48, rx: 0.86, ry: 0.7, rz: 0.8, rOff: 0.08, y: 0.24, snow: true },
    { a: -2.02, rx: 0.84, ry: 0.6, rz: 0.74, rOff: 0.22, y: 0.22, snow: true },
    { a: -1.58, rx: 0.88, ry: 0.68, rz: 0.78, rOff: 0.08, y: 0.24, snow: true },
    { a: -1.18, rx: 0.84, ry: 0.63, rz: 0.74, rOff: 0.06, y: 0.2, snow: true },
    { a: -0.78, rx: 0.8, ry: 0.56, rz: 0.72, rOff: 0.06, y: 0.18, snow: true },
    // Back-right framing rocks
    { a: -0.4, rx: 0.74, ry: 0.5, rz: 0.68, rOff: 0.06, y: 0.14, snow: true },
    { a: -0.04, rx: 0.68, ry: 0.44, rz: 0.62, rOff: 0.04, y: 0.12, snow: true },
    // Flat poolside rock on right (holds the tiny hinoki sake/tea tray!)
    { a: 0.28, rx: 0.68, ry: 0.34, rz: 0.58, rOff: -0.05, y: 0.12, snow: false },
    // Front low rocks (low viewing height so capybara & water shimmer shine unobstructed!)
    { a: 1.24, rx: 0.66, ry: 0.32, rz: 0.55, rOff: 0.02, y: 0.06, snow: true },
    { a: 1.62, rx: 0.74, ry: 0.3, rz: 0.56, rOff: 0.04, y: 0.04, snow: true },
    { a: 2.02, rx: 0.7, ry: 0.34, rz: 0.6, rOff: 0.05, y: 0.06, snow: true },
    { a: 2.42, rx: 0.76, ry: 0.44, rz: 0.66, rOff: 0.06, y: 0.1, snow: true },
    { a: 2.82, rx: 0.8, ry: 0.5, rz: 0.72, rOff: 0.06, y: 0.14, snow: true },
    { a: -3.02, rx: 0.82, ry: 0.58, rz: 0.74, rOff: 0.08, y: 0.18, snow: true },
    { a: -2.74, rx: 0.84, ry: 0.64, rz: 0.76, rOff: 0.08, y: 0.22, snow: true },
  ];

  rimRocks.forEach((cfg, idx) => {
    const wobble =
      1.0 +
      0.075 * Math.sin(cfg.a * 2.0 + 0.6) +
      0.045 * Math.cos(cfg.a * 3.0 - 0.9) +
      0.025 * Math.sin(cfg.a * 5.0 + 0.3);
    const px = POOL_CENTER_X + Math.cos(cfg.a) * (POOL_RX * wobble + cfg.rOff);
    const pz = POOL_CENTER_Z + Math.sin(cfg.a) * (POOL_RZ * wobble + cfg.rOff);

    const rock = createOnsenRock({
      radiusX: cfg.rx,
      radiusY: cfg.ry,
      radiusZ: cfg.rz,
      seed: 100 + idx * 37,
      snowCap: cfg.snow,
      snowThickness: 0.12 + (idx % 3) * 0.02,
      textures,
      worldY: cfg.y,
    });
    rock.position.set(px, cfg.y, pz);
    rock.rotation.y = -cfg.a + (idx % 2 === 0 ? 0.35 : -0.4);
    group.add(rock);
  });

  // Back-left scenic backdrop boulders behind the bamboo spout
  const backBoulders = [
    { x: -2.8, y: 0.56, z: -1.96, rx: 0.92, ry: 0.8, rz: 0.8, seed: 801 },
    { x: -1.82, y: 0.62, z: -2.44, rx: 0.95, ry: 0.82, rz: 0.82, seed: 802 },
    { x: 2.8, y: 0.28, z: -0.9, rx: 0.7, ry: 0.46, rz: 0.64, seed: 803 },
  ];
  for (const bb of backBoulders) {
    const rock = createOnsenRock({
      radiusX: bb.rx,
      radiusY: bb.ry,
      radiusZ: bb.rz,
      seed: bb.seed,
      snowCap: true,
      snowThickness: 0.14,
      textures,
      worldY: bb.y,
    });
    rock.position.set(bb.x, bb.y, bb.z);
    group.add(rock);
  }

  // Smooth submerged bath stones dimly visible through the translucent mineral hot spring water
  const submergedStones = [
    { x: 0.0, y: -0.58, z: 0.05, rx: 0.95, ry: 0.28, rz: 0.85, seed: 901 },
    { x: 1.05, y: -0.68, z: 0.82, rx: 0.62, ry: 0.25, rz: 0.55, seed: 902 },
    { x: -1.08, y: -0.74, z: -0.52, rx: 0.65, ry: 0.24, rz: 0.58, seed: 903 },
    { x: -0.82, y: -0.76, z: 1.02, rx: 0.55, ry: 0.22, rz: 0.48, seed: 904 },
  ];
  for (const ss of submergedStones) {
    const rock = createOnsenRock({
      radiusX: ss.rx,
      radiusY: ss.ry,
      radiusZ: ss.rz,
      seed: ss.seed,
      snowCap: false,
      textures,
      worldY: ss.y,
    });
    rock.position.set(ss.x, ss.y, ss.z);
    group.add(rock);
  }

  // =========================================================================
  // 2. Custom GLSL Hot Spring Water Surface (温泉の湯面)
  // =========================================================================
  const waterGeo = new THREE.CircleGeometry(1.0, 96);
  waterGeo.rotateX(-Math.PI / 2);
  const wPos = waterGeo.attributes.position;
  for (let i = 0; i < wPos.count; i++) {
    const lx = wPos.getX(i);
    const lz = wPos.getZ(i);
    const angle = Math.atan2(lz, lx);
    const wobble =
      1.0 +
      0.075 * Math.sin(angle * 2.0 + 0.6) +
      0.045 * Math.cos(angle * 3.0 - 0.9) +
      0.025 * Math.sin(angle * 5.0 + 0.3);
    wPos.setXYZ(i, lx * POOL_RX * 1.12 * wobble, 0, lz * POOL_RZ * 1.12 * wobble);
  }
  waterGeo.computeVertexNormals();

  const splashPoint = new THREE.Vector2(-1.12, -0.76);

  const waterUniforms = {
    uTime: { value: 0 },
    uDeepColor: { value: new THREE.Color('#3b8a88') },
    uShallowColor: { value: new THREE.Color('#86d1cc') },
    uSkyReflect: { value: new THREE.Color('#4d6a94') },
    uWarmGlowPos: { value: new THREE.Vector3(-3.05, 1.35, 0.92) },
    uWarmGlowColor: { value: new THREE.Color('#ffae4a') },
    uWarmGlowStrength: { value: 0.95 },
    uSpoutSplash: { value: splashPoint },
    uCapyPos: { value: new THREE.Vector2(0.0, 0.12) },
  };

  const waterMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: waterUniforms,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform vec2 uSpoutSplash;
      uniform vec2 uCapyPos;
      varying vec3 vWorldPos;
      varying vec2 vLocalXZ;

      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float dSpout = length(wp.xz - uSpoutSplash);
        float dCapy = length(wp.xz - uCapyPos);

        float w1 = sin(dSpout * 14.0 - uTime * 4.4) * exp(-dSpout * 1.05) * 0.017;
        float w2 = sin(dCapy * 8.5 - uTime * 1.9) * exp(-dCapy * 0.72) * 0.008;
        float w3 = sin(wp.x * 2.4 + uTime * 0.9) * cos(wp.z * 2.1 - uTime * 0.75) * 0.006;

        wp.y += w1 + w2 + w3;
        vWorldPos = wp.xyz;
        vLocalXZ = position.xz;

        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uSkyReflect;
      uniform vec3 uWarmGlowPos;
      uniform vec3 uWarmGlowColor;
      uniform float uWarmGlowStrength;
      uniform vec2 uSpoutSplash;
      uniform vec2 uCapyPos;

      varying vec3 vWorldPos;
      varying vec2 vLocalXZ;

      float causticPattern(vec2 p, float t) {
        float c = 0.0;
        c += sin(p.x * 3.1 + t * 0.7 + cos(p.y * 2.7 - t * 0.55));
        c += cos(p.y * 3.8 - t * 0.65 + sin(p.x * 2.9 + t * 0.48));
        c += sin((p.x + p.y) * 2.6 + t * 0.85);
        return smoothstep(0.55, 2.35, c * 0.5 + 1.15);
      }

      void main() {
        vec2 p = vWorldPos.xz;
        float dSpout = length(p - uSpoutSplash);
        float dCapy = length(p - uCapyPos);

        float rSpout = cos(dSpout * 14.0 - uTime * 4.4) * exp(-dSpout * 1.05);
        vec2 dirSpout = normalize(p - uSpoutSplash + vec2(0.0001));
        float rCapy = cos(dCapy * 8.5 - uTime * 1.9) * exp(-dCapy * 0.72);
        vec2 dirCapy = normalize(p - uCapyPos + vec2(0.0001));

        vec2 grad =
          dirSpout * rSpout * 0.22 +
          dirCapy * rCapy * 0.09 +
          vec2(
            cos(p.x * 2.6 + uTime * 0.9) * 0.05,
            sin(p.y * 2.4 - uTime * 0.8) * 0.05
          );
        vec3 N = normalize(vec3(-grad.x, 1.0, -grad.y));
        vec3 V = normalize(cameraPosition - vWorldPos);

        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.8);

        float radial = length(vec2(vLocalXZ.x / 2.6, vLocalXZ.y / 2.1));
        float shallowMask = smoothstep(0.38, 1.0, radial);
        vec3 waterCol = mix(uDeepColor, uShallowColor, shallowMask * 0.72);

        float caust = causticPattern(p * 1.18, uTime);
        waterCol += uShallowColor * caust * 0.18;

        waterCol = mix(waterCol, uSkyReflect, clamp(fresnel * 0.56, 0.0, 0.64));

        vec3 L = normalize(uWarmGlowPos - vWorldPos);
        vec3 H = normalize(L + V);
        float distLight = length(uWarmGlowPos - vWorldPos);
        float atten = 1.0 / (1.0 + 0.09 * distLight * distLight);
        float spec = pow(max(dot(N, H), 0.0), 34.0) * 1.35 + pow(max(dot(N, H), 0.0), 6.5) * 0.28;
        waterCol += uWarmGlowColor * spec * atten * uWarmGlowStrength;

        // Soft frothy organic splash ripples & silky concentric ring hugging the capybara
        float splashFoam = exp(-dSpout * 5.8) * 0.72;
        float splashRing1 = smoothstep(0.62, 0.96, sin(dSpout * 18.0 - uTime * 5.2)) * exp(-dSpout * 2.1) * 0.42;
        float splashRing2 = smoothstep(0.7, 0.98, sin(dSpout * 11.5 - uTime * 3.8 + 1.4)) * exp(-dSpout * 1.55) * 0.22;
        float capyRipple = smoothstep(0.56, 0.96, sin(dCapy * 10.5 - uTime * 1.85)) *
                           smoothstep(1.42, 0.72, dCapy) * smoothstep(0.35, 0.65, dCapy) * 0.15;

        waterCol = mix(
          waterCol,
          vec3(0.95, 0.99, 1.0),
          clamp(splashFoam + splashRing1 + splashRing2 + capyRipple, 0.0, 0.84)
        );

        float alpha = clamp(0.78 + fresnel * 0.16 + splashFoam * 0.18 - shallowMask * 0.06, 0.72, 0.94);
        gl_FragColor = vec4(waterCol, alpha);
      }
    `,
  });

  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(POOL_CENTER_X, WATER_Y, POOL_CENTER_Z);
  waterMesh.renderOrder = 2;
  group.add(waterMesh);

  // =========================================================================
  // 3. Elevated Clearly Visible Bamboo Water Spout (筧 / 湯口) + Pouring Stream
  // =========================================================================
  const spoutGroup = new THREE.Group();
  spoutGroup.name = 'BambooWaterSpout';
  group.add(spoutGroup);

  const bambooDryMat = new THREE.MeshStandardMaterial({
    map: textures.bambooDry,
    roughness: 0.62,
    metalness: 0.02,
  });
  const bambooDarkInsideMat = new THREE.MeshStandardMaterial({
    color: '#3a2c1a',
    roughness: 0.92,
    side: THREE.DoubleSide,
  });
  const twineMat = new THREE.MeshStandardMaterial({
    color: '#221d1a',
    roughness: 0.95,
  });
  const snowAccentMat = new THREE.MeshStandardMaterial({
    color: '#f5f9ff',
    map: textures.snow.map,
    roughness: 0.85,
  });

  const pipeStart = new THREE.Vector3(-2.42, 1.38, -1.82);
  const pipeEnd = new THREE.Vector3(-1.36, 0.98, -1.0);
  const pipeDir = new THREE.Vector3().subVectors(pipeEnd, pipeStart);
  const pipeLen = pipeDir.length();
  const pipeMid = new THREE.Vector3().addVectors(pipeStart, pipeEnd).multiplyScalar(0.5);

  const spoutPipe = new THREE.Group();
  spoutPipe.position.copy(pipeMid);
  spoutPipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pipeDir.clone().normalize());

  const outerPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.115, 0.128, pipeLen, 16, 1, true),
    bambooDryMat
  );
  outerPipe.castShadow = true;
  outerPipe.receiveShadow = true;
  spoutPipe.add(outerPipe);

  const innerPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.095, 0.106, pipeLen * 0.98, 14, 1, true),
    bambooDarkInsideMat
  );
  spoutPipe.add(innerPipe);

  for (const ny of [-pipeLen * 0.26, pipeLen * 0.16]) {
    const nodeRing = new THREE.Mesh(new THREE.TorusGeometry(0.124, 0.017, 8, 18), bambooDryMat);
    nodeRing.rotation.x = Math.PI / 2;
    nodeRing.position.y = ny;
    spoutPipe.add(nodeRing);
  }
  spoutGroup.add(spoutPipe);

  // Plush snow ribbon resting along the upper back half of the bamboo spout
  const spoutSnowCurve = new THREE.CatmullRomCurve3([
    pipeStart.clone().lerp(pipeEnd, 0.14).add(new THREE.Vector3(0, 0.115, 0)),
    pipeStart.clone().lerp(pipeEnd, 0.44).add(new THREE.Vector3(0, 0.118, 0)),
    pipeStart.clone().lerp(pipeEnd, 0.72).add(new THREE.Vector3(0, 0.105, 0)),
  ]);
  const spoutSnowGeo = new THREE.TubeGeometry(spoutSnowCurve, 14, 0.062, 10, false);
  const ssPos = spoutSnowGeo.attributes.position;
  const ssUv = spoutSnowGeo.attributes.uv;
  for (let i = 0; i < ssPos.count; i++) {
    const u = Math.min(1, Math.max(0, ssUv.getX(i)));
    const c = spoutSnowCurve.getPoint(u);
    ssPos.setY(i, c.y + (ssPos.getY(i) - c.y) * 0.62);
  }
  spoutSnowGeo.computeVertexNormals();
  const spoutSnow = new THREE.Mesh(spoutSnowGeo, snowAccentMat);
  spoutSnow.castShadow = true;
  spoutGroup.add(spoutSnow);

  // Crossed lashed bamboo X-stand supporting the bamboo spout
  const standAnchor = pipeStart.clone().lerp(pipeEnd, 0.62);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.055, 1.32, 10), bambooDryMat);
    leg.position.set(standAnchor.x + side * 0.14, standAnchor.y - 0.42, standAnchor.z - side * 0.12);
    leg.rotation.z = side * 0.34;
    leg.rotation.x = -0.16;
    leg.castShadow = true;
    spoutGroup.add(leg);
  }
  const lashing = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.024, 8, 16), twineMat);
  lashing.position.copy(standAnchor);
  lashing.rotation.set(0.7, 0.5, 0.2);
  spoutGroup.add(lashing);

  // Animated parabolic pouring hot water stream
  const streamCurve = new THREE.CatmullRomCurve3([
    pipeEnd.clone().add(new THREE.Vector3(0.01, -0.02, 0.01)),
    new THREE.Vector3(-1.24, 0.72, -0.88),
    new THREE.Vector3(-1.16, 0.36, -0.8),
    new THREE.Vector3(splashPoint.x, WATER_Y - 0.04, splashPoint.y),
  ]);
  const streamGeo = new THREE.TubeGeometry(streamCurve, 26, 0.056, 10, false);
  const stPos = streamGeo.attributes.position;
  const stUv = streamGeo.attributes.uv;
  for (let i = 0; i < stPos.count; i++) {
    const u = stUv.getX(i);
    const center = streamCurve.getPoint(Math.min(1, Math.max(0, u)));
    const scale = 1.0 - u * 0.28 + Math.sin(u * Math.PI) * 0.1;
    stPos.setXYZ(
      i,
      center.x + (stPos.getX(i) - center.x) * scale,
      center.y + (stPos.getY(i) - center.y) * scale,
      center.z + (stPos.getZ(i) - center.z) * scale
    );
  }
  streamGeo.computeVertexNormals();

  const streamUniforms = { uTime: { value: 0 } };
  const streamMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: streamUniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float flow = vUv.x * 6.0 - uTime * 5.8;
        float streaks = 0.55 + 0.45 * sin(flow * 3.2 + sin(vUv.y * 18.0) * 1.4);
        float foam = smoothstep(0.55, 0.95, sin(vUv.x * 16.0 - uTime * 9.0 + vUv.y * 12.0));
        vec3 col = mix(vec3(0.7, 0.93, 0.93), vec3(0.98, 1.0, 1.0), foam * 0.65 + streaks * 0.25);
        float alpha = (0.64 + streaks * 0.24) * smoothstep(0.0, 0.07, vUv.x);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const streamMesh = new THREE.Mesh(streamGeo, streamMat);
  streamMesh.renderOrder = 3;
  spoutGroup.add(streamMesh);

  // Soft frothy textured splash foam decals (replaces harsh solid oval disc!)
  const foamPlaneGeo = new THREE.PlaneGeometry(0.68, 0.68);
  foamPlaneGeo.rotateX(-Math.PI / 2);
  const splashFoamMain = new THREE.Mesh(
    foamPlaneGeo,
    new THREE.MeshBasicMaterial({
      map: textures.splashFoam,
      color: '#f2fdff',
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    })
  );
  splashFoamMain.position.set(splashPoint.x, WATER_Y + 0.014, splashPoint.y);
  splashFoamMain.renderOrder = 3;
  spoutGroup.add(splashFoamMain);

  const splashFoamSub = new THREE.Mesh(
    foamPlaneGeo,
    new THREE.MeshBasicMaterial({
      map: textures.splashFoam,
      color: '#ffffff',
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
  );
  splashFoamSub.position.set(splashPoint.x, WATER_Y + 0.018, splashPoint.y);
  splashFoamSub.scale.setScalar(0.66);
  splashFoamSub.renderOrder = 4;
  spoutGroup.add(splashFoamSub);

  // =========================================================================
  // 4. Hinoki Wooden Bath Deck (檜の縁), Wooden Bucket (湯桶) & Tenugui Towel
  // =========================================================================
  const deckGroup = new THREE.Group();
  deckGroup.name = 'HinokiDeckAndProps';
  deckGroup.position.set(2.08, 0.22, 1.66);
  deckGroup.rotation.y = -0.62;
  group.add(deckGroup);

  const hinokiMat = new THREE.MeshStandardMaterial({
    map: textures.hinoki.map,
    bumpMap: textures.hinoki.bumpMap,
    bumpScale: 0.02,
    roughness: 0.72,
    metalness: 0.02,
  });
  const hinokiDarkMat = new THREE.MeshStandardMaterial({
    color: '#916d45',
    map: textures.hinoki.map,
    roughness: 0.82,
  });

  const slatCount = 6;
  const deckW = 1.62;
  const deckD = 1.06;
  for (let i = 0; i < slatCount; i++) {
    const zOff = -deckD * 0.5 + (i + 0.5) * (deckD / slatCount);
    const slat = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.06, deckD / slatCount - 0.024), hinokiMat);
    slat.position.set(0, 0.04, zOff);
    slat.castShadow = true;
    slat.receiveShadow = true;
    deckGroup.add(slat);
  }
  for (const bx of [-0.56, 0.0, 0.56]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, deckD * 0.94), hinokiDarkMat);
    beam.position.set(bx, -0.04, 0);
    beam.castShadow = true;
    beam.receiveShadow = true;
    deckGroup.add(beam);
  }

  const bucketGroup = new THREE.Group();
  bucketGroup.position.set(-0.32, 0.07, 0.05);
  deckGroup.add(bucketGroup);

  const bucketH = 0.28;
  const bucketOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.21, bucketH, 24, 1, true),
    hinokiMat
  );
  bucketOuter.position.y = bucketH * 0.5;
  bucketOuter.castShadow = true;
  bucketOuter.receiveShadow = true;
  bucketGroup.add(bucketOuter);

  const bucketInnerMat = hinokiDarkMat.clone();
  bucketInnerMat.side = THREE.BackSide;
  const bucketInner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.222, 0.194, bucketH * 0.98, 22, 1, true),
    bucketInnerMat
  );
  bucketInner.position.y = bucketH * 0.5;
  bucketGroup.add(bucketInner);

  const bucketRim = new THREE.Mesh(new THREE.TorusGeometry(0.231, 0.011, 8, 24), hinokiMat);
  bucketRim.rotation.x = Math.PI / 2;
  bucketRim.position.y = bucketH;
  bucketGroup.add(bucketRim);

  const bucketFloor = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.03, 20), hinokiDarkMat);
  bucketFloor.position.y = 0.04;
  bucketGroup.add(bucketFloor);

  const copperMat = new THREE.MeshStandardMaterial({
    color: '#c4834b',
    roughness: 0.34,
    metalness: 0.78,
  });
  for (const hy of [0.08, 0.21]) {
    const r = THREE.MathUtils.lerp(0.212, 0.242, hy / bucketH);
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0085, 8, 28), copperMat);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = hy;
    bucketGroup.add(hoop);
  }

  // Soft folded tenugui towel hugging the wooden bucket rim cleanly
  const towelMat = new THREE.MeshStandardMaterial({
    map: textures.tenugui,
    roughness: 0.92,
    side: THREE.DoubleSide,
  });
  const towelCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.06, 0.17, 0.09),
    new THREE.Vector3(0.14, 0.285, 0.12),
    new THREE.Vector3(0.215, 0.295, 0.135),
    new THREE.Vector3(0.248, 0.215, 0.145),
    new THREE.Vector3(0.242, 0.085, 0.148),
  ]);
  const towelGeo = new THREE.PlaneGeometry(0.19, 0.4, 10, 22);
  const tPos = towelGeo.attributes.position;
  for (let i = 0; i < tPos.count; i++) {
    const lx = tPos.getX(i);
    const ly = Math.min(1, Math.max(0, (tPos.getY(i) + 0.2) / 0.4));
    const pt = towelCurve.getPoint(ly);
    const tang = towelCurve.getTangent(ly);
    const sideDir = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
    const foldWave = Math.sin(lx * 24.0) * 0.005;
    tPos.setXYZ(i, pt.x + sideDir.x * lx, pt.y + foldWave, pt.z + sideDir.z * lx);
  }
  towelGeo.computeVertexNormals();
  const towelMesh = new THREE.Mesh(towelGeo, towelMat);
  towelMesh.castShadow = true;
  towelMesh.receiveShadow = true;
  bucketGroup.add(towelMesh);

  const deckYuzu = createYuzuMesh({ radius: 0.135, withLeaf: true, yuzuTextures: textures.yuzu });
  deckYuzu.position.set(0.28, 0.185, 0.08);
  deckYuzu.rotation.set(0.18, 1.2, -0.1);
  deckGroup.add(deckYuzu);

  // Small Hinoki tray + ceramic Tokkuri (徳利) & Ochoko (おちょこ) resting on flat right boulder
  const trayGroup = new THREE.Group();
  trayGroup.position.set(2.54, 0.42, 0.76);
  trayGroup.rotation.y = -0.35;
  group.add(trayGroup);

  const trayBase = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.032, 0.34), hinokiMat);
  trayBase.castShadow = true;
  trayBase.receiveShadow = true;
  trayGroup.add(trayBase);
  for (const rz of [-0.16, 0.16]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.048, 0.022), hinokiDarkMat);
    wall.position.set(0, 0.018, rz);
    trayGroup.add(wall);
  }
  for (const rx of [-0.22, 0.22]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.048, 0.34), hinokiDarkMat);
    wall.position.set(rx, 0.018, 0);
    trayGroup.add(wall);
  }

  const tokkuriPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.068, 0.0),
    new THREE.Vector2(0.088, 0.065),
    new THREE.Vector2(0.082, 0.145),
    new THREE.Vector2(0.034, 0.205),
    new THREE.Vector2(0.032, 0.255),
    new THREE.Vector2(0.044, 0.285),
    new THREE.Vector2(0.034, 0.285),
  ];
  const ceramicMat = new THREE.MeshStandardMaterial({
    color: '#ebe4d6',
    roughness: 0.28,
    metalness: 0.04,
  });
  const indigoAccentMat = new THREE.MeshStandardMaterial({
    color: '#324c6b',
    roughness: 0.32,
  });
  const tokkuri = new THREE.Mesh(new THREE.LatheGeometry(tokkuriPts, 20), ceramicMat);
  tokkuri.position.set(-0.08, 0.016, -0.02);
  tokkuri.castShadow = true;
  trayGroup.add(tokkuri);

  const tokkuriBand = new THREE.Mesh(new THREE.TorusGeometry(0.084, 0.006, 6, 20), indigoAccentMat);
  tokkuriBand.rotation.x = Math.PI / 2;
  tokkuriBand.position.set(-0.08, 0.115, -0.02);
  trayGroup.add(tokkuriBand);

  const ochokoPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.036, 0.0),
    new THREE.Vector2(0.056, 0.062),
    new THREE.Vector2(0.048, 0.062),
    new THREE.Vector2(0.03, 0.012),
  ];
  const ochoko = new THREE.Mesh(new THREE.LatheGeometry(ochokoPts, 16), ceramicMat);
  ochoko.position.set(0.11, 0.016, 0.04);
  ochoko.castShadow = true;
  trayGroup.add(ochoko);

  // =========================================================================
  // 5. Floating Yuzu Fruits bobbing gently in the hot spring (柚子湯)
  // =========================================================================
  const floatingYuzuConfigs = [
    { x: -1.32, z: 0.72, r: 0.165, leaf: true, phase: 0.3, speed: 1.15 },
    { x: -0.9, z: 1.36, r: 0.148, leaf: false, phase: 1.4, speed: 1.32 },
    { x: 1.3, z: 0.9, r: 0.162, leaf: true, phase: 2.5, speed: 1.08 },
    { x: 1.52, z: -0.22, r: 0.152, leaf: false, phase: 3.7, speed: 1.24 },
    { x: 0.72, z: -1.14, r: 0.158, leaf: true, phase: 4.8, speed: 1.18 },
    { x: -1.64, z: -0.08, r: 0.145, leaf: false, phase: 5.6, speed: 1.28 },
    { x: 0.25, z: 1.48, r: 0.155, leaf: true, phase: 0.9, speed: 1.12 },
  ];

  const floatingYuzus = floatingYuzuConfigs.map((cfg) => {
    const mesh = createYuzuMesh({
      radius: cfg.r,
      withLeaf: cfg.leaf,
      yuzuTextures: textures.yuzu,
    });
    mesh.position.set(cfg.x, WATER_Y - cfg.r * 0.1, cfg.z);
    mesh.rotation.y = cfg.phase * 1.7;
    group.add(mesh);
    return { mesh, ...cfg };
  });

  return {
    group,
    waterUniforms,
    splashPoint,
    update(time) {
      waterUniforms.uTime.value = time;
      streamUniforms.uTime.value = time;

      const pulse1 = 1.0 + Math.sin(time * 6.8) * 0.08 + Math.cos(time * 10.6) * 0.05;
      splashFoamMain.scale.setScalar(pulse1);
      splashFoamMain.rotation.y = time * 0.65;

      const pulse2 = 0.66 + Math.cos(time * 8.4) * 0.07;
      splashFoamSub.scale.setScalar(pulse2);
      splashFoamSub.rotation.y = -time * 0.95;

      for (const fy of floatingYuzus) {
        const bob = Math.sin(time * fy.speed + fy.phase) * 0.02;
        fy.mesh.position.y = WATER_Y - fy.r * 0.12 + bob;
        fy.mesh.position.x = fy.x + Math.sin(time * 0.35 + fy.phase) * 0.04;
        fy.mesh.position.z = fy.z + Math.cos(time * 0.29 + fy.phase) * 0.04;
        fy.mesh.rotation.x = Math.sin(time * fy.speed * 0.85 + fy.phase) * 0.11;
        fy.mesh.rotation.z = Math.cos(time * fy.speed * 0.72 + fy.phase) * 0.11;
        fy.mesh.rotation.y += 0.002 * (fy.phase > 3 ? -1 : 1);
      }
    },
  };
}
