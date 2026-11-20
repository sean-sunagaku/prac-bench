import * as THREE from 'three';

export const WATER_Y = 0.0;
export const POOL_CENTER_X = 0.0;
export const POOL_CENTER_Z = 0.2;
export const POOL_RX = 2.6;
export const POOL_RZ = 2.1;

/**
 * Compact, organic hakoniwa (箱庭) miniature island footprint:
 * slightly tighter in front so the cozy hot spring fills the composition richly
 * without excessive empty foreground snow.
 */
export function getIslandRadius(theta) {
  const frontTrim = Math.max(0, Math.sin(theta)) * 0.55;
  return (
    5.65 -
    frontTrim +
    0.28 * Math.sin(theta * 3.0 + 0.4) +
    0.18 * Math.cos(theta * 5.0 - 0.8) +
    0.12 * Math.sin(theta * 2.0 - 1.2)
  );
}

export function getPoolMetric(x, z) {
  const dx = x - POOL_CENTER_X;
  const dz = z - POOL_CENTER_Z;
  const angle = Math.atan2(dz, dx);
  const wobble =
    1.0 +
    0.075 * Math.sin(angle * 2.0 + 0.6) +
    0.045 * Math.cos(angle * 3.0 - 0.9) +
    0.025 * Math.sin(angle * 5.0 + 0.3);
  const nx = dx / (POOL_RX * wobble);
  const nz = dz / (POOL_RZ * wobble);
  return Math.sqrt(nx * nx + nz * nz);
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function getGroundHeight(x, z) {
  const pm = getPoolMetric(x, z);
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);
  const maxR = getIslandRadius(theta);
  const edgeRatio = r / maxR;

  const backSlope = smoothstep(2.4, -4.8, z) * 0.54;
  const sideMound =
    0.15 * Math.sin(x * 0.66 + 0.5) * Math.cos(z * 0.58 - 0.3) +
    0.09 * Math.cos((x - z) * 0.52) +
    0.06 * Math.sin(x * 1.3 + z * 0.98);

  const deckDist = Math.hypot((x - 2.08) / 1.45, (z - 1.78) / 1.18);
  const deckFlatten = (1.0 - smoothstep(0.55, 1.32, deckDist)) * -0.14;
  const rimRoll = smoothstep(0.84, 1.02, edgeRatio) * -0.24;
  const outerSnowY = 0.34 + backSlope + sideMound + deckFlatten + rimRoll;

  if (pm < 1.22) {
    const t = smoothstep(0.76, 1.18, pm);
    const floorY = -0.96 + 0.14 * Math.exp(-((x * x + (z - 0.05) * (z - 0.05)) / 2.2));
    return floorY * (1 - t) + outerSnowY * t;
  }

  return outerSnowY;
}

export function createDioramaIsland(textures) {
  const group = new THREE.Group();
  group.name = 'DioramaIsland';

  const rings = 56;
  const segs = 116;
  const positions = [];
  const uvs = [];
  const colors = [];
  const indices = [];

  const snowBright = new THREE.Color('#f6f9ff');
  const snowShadow = new THREE.Color('#dce8f7');
  const wetRimRock = new THREE.Color('#464c52');
  const deepBasinRock = new THREE.Color('#27373e');
  const tmpColor = new THREE.Color();

  const centerY = getGroundHeight(0, 0);
  positions.push(0, centerY, 0);
  uvs.push(0.5, 0.5);
  colors.push(deepBasinRock.r, deepBasinRock.g, deepBasinRock.b);

  for (let ri = 1; ri <= rings; ri++) {
    const frac = ri / rings;
    const radialT = Math.pow(frac, 0.92);
    for (let si = 0; si <= segs; si++) {
      const theta = (si / segs) * Math.PI * 2;
      const maxR = getIslandRadius(theta);
      const r = radialT * maxR;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      const y = getGroundHeight(x, z);

      positions.push(x, y, z);
      uvs.push(x * 0.15 + 0.5, z * 0.15 + 0.5);

      const pm = getPoolMetric(x, z);
      if (pm < 0.88) {
        const depthMix = smoothstep(-1.0, -0.25, y);
        tmpColor.copy(deepBasinRock).lerp(wetRimRock, depthMix * 0.65);
      } else if (pm < 1.12) {
        const rimMix = smoothstep(0.88, 1.12, pm);
        tmpColor.copy(wetRimRock).lerp(snowShadow, rimMix);
      } else {
        const snowMix = smoothstep(0.22, 0.72, y);
        tmpColor.copy(snowShadow).lerp(snowBright, 0.45 + snowMix * 0.55);
      }
      colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
    }
  }

  const stride = segs + 1;
  for (let si = 0; si < segs; si++) {
    indices.push(0, 1 + si + 1, 1 + si);
  }
  for (let ri = 1; ri < rings; ri++) {
    const rowStart = 1 + (ri - 1) * stride;
    const nextRowStart = 1 + ri * stride;
    for (let si = 0; si < segs; si++) {
      const a = rowStart + si;
      const b = rowStart + si + 1;
      const c = nextRowStart + si;
      const d = nextRowStart + si + 1;
      indices.push(a, d, c);
      indices.push(a, b, d);
    }
  }

  const terrainGeo = new THREE.BufferGeometry();
  terrainGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  terrainGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrainGeo.setIndex(indices);
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: textures.snow.map,
    bumpMap: textures.snow.bumpMap,
    bumpScale: 0.032,
    roughness: 0.85,
    metalness: 0.02,
  });

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  group.add(terrainMesh);

  // Sculpted stratified hakoniwa cliff skirt: crisp overhanging snow crust -> warm winter soil -> craggy volcanic stone
  const skirtSegs = segs;
  const skirtLayers = [
    { dy: 0.02, rScale: 1.01, color: new THREE.Color('#f2f7ff') },
    { dy: -0.17, rScale: 1.018, color: new THREE.Color('#d2e0f0') },
    { dy: -0.34, rScale: 0.968, color: new THREE.Color('#695443') },
    { dy: -0.78, rScale: 0.92, color: new THREE.Color('#544e4a') },
    { dy: -1.35, rScale: 0.78, color: new THREE.Color('#3f4046') },
    { dy: -1.86, rScale: 0.56, color: new THREE.Color('#2d3037') },
  ];

  const sPos = [];
  const sUv = [];
  const sCol = [];
  const sIdx = [];

  for (let li = 0; li < skirtLayers.length; li++) {
    const layer = skirtLayers[li];
    for (let si = 0; si <= skirtSegs; si++) {
      const theta = (si / skirtSegs) * Math.PI * 2;
      const maxR = getIslandRadius(theta);
      const topX = Math.cos(theta) * maxR;
      const topZ = Math.sin(theta) * maxR;
      const topY = getGroundHeight(topX, topZ);

      const crag =
        li >= 2
          ? (0.13 * Math.sin(theta * 11.0 + li * 1.7) +
              0.08 * Math.cos(theta * 19.0 - li * 2.1)) *
            (li === skirtLayers.length - 1 ? 0.5 : 1.0)
          : 0.03 * Math.sin(theta * 9.0);

      const r = maxR * layer.rScale + crag;
      const y = li <= 1 ? topY + layer.dy : Math.min(topY + layer.dy, -0.12 + layer.dy * 0.85);

      sPos.push(Math.cos(theta) * r, y, Math.sin(theta) * r);
      sUv.push((si / skirtSegs) * 8.0, li / (skirtLayers.length - 1));

      const shadeJitter = 1.0 + 0.07 * Math.sin(theta * 13.0 + li * 3.0);
      sCol.push(
        Math.min(1, layer.color.r * shadeJitter),
        Math.min(1, layer.color.g * shadeJitter),
        Math.min(1, layer.color.b * shadeJitter)
      );
    }
  }

  const sStride = skirtSegs + 1;
  for (let li = 0; li < skirtLayers.length - 1; li++) {
    const rowA = li * sStride;
    const rowB = (li + 1) * sStride;
    for (let si = 0; si < skirtSegs; si++) {
      const a = rowA + si;
      const b = rowA + si + 1;
      const c = rowB + si;
      const d = rowB + si + 1;
      sIdx.push(a, c, d);
      sIdx.push(a, d, b);
    }
  }

  const bottomCenterIndex = sPos.length / 3;
  sPos.push(0, -2.06, 0);
  sUv.push(0.5, 1.0);
  sCol.push(0.14, 0.16, 0.2);
  const lastRow = (skirtLayers.length - 1) * sStride;
  for (let si = 0; si < skirtSegs; si++) {
    sIdx.push(lastRow + si, bottomCenterIndex, lastRow + si + 1);
  }

  const skirtGeo = new THREE.BufferGeometry();
  skirtGeo.setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3));
  skirtGeo.setAttribute('uv', new THREE.Float32BufferAttribute(sUv, 2));
  skirtGeo.setAttribute('color', new THREE.Float32BufferAttribute(sCol, 3));
  skirtGeo.setIndex(sIdx);
  skirtGeo.computeVertexNormals();

  const skirtMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: textures.rock.map,
    bumpMap: textures.rock.bumpMap,
    bumpScale: 0.07,
    roughness: 0.9,
    metalness: 0.04,
  });

  const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
  skirtMesh.receiveShadow = true;
  skirtMesh.castShadow = true;
  group.add(skirtMesh);

  // Natural flat garden stepping stones (飛び石) leading to the wooden bath deck
  const stonePositions = [
    { x: 4.18, z: 2.98, rx: 0.42, rz: 0.32, rot: 0.42 },
    { x: 3.55, z: 2.58, rx: 0.37, rz: 0.3, rot: -0.28 },
    { x: 2.92, z: 2.24, rx: 0.4, rz: 0.32, rot: 0.62 },
  ];

  const stepStoneMat = new THREE.MeshStandardMaterial({
    color: '#73787f',
    map: textures.rock.map,
    bumpMap: textures.rock.bumpMap,
    bumpScale: 0.045,
    roughness: 0.86,
  });

  for (const st of stonePositions) {
    const geo = new THREE.CylinderGeometry(st.rx * 0.88, st.rx * 1.04, 0.18, 20);
    const sp = geo.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      const px = sp.getX(i);
      const pz = sp.getZ(i);
      const a = Math.atan2(pz, px);
      const rj = 1.0 + 0.08 * Math.sin(a * 3.0 + st.rot) + 0.05 * Math.cos(a * 5.0);
      sp.setX(i, px * rj);
      sp.setZ(i, pz * rj * (st.rz / st.rx));
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, stepStoneMat);
    const gy = getGroundHeight(st.x, st.z);
    mesh.position.set(st.x, gy - 0.025, st.z);
    mesh.rotation.y = st.rot;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    group.add(mesh);
  }

  return group;
}

export function createWinterSky() {
  const skyGeo = new THREE.SphereGeometry(68, 40, 28);
  const uniforms = {
    uZenithColor: { value: new THREE.Color('#131e36') },
    uMidColor: { value: new THREE.Color('#2c3f63') },
    uHorizonColor: { value: new THREE.Color('#7a6b7e') },
    uGroundColor: { value: new THREE.Color('#182133') },
    uStarIntensity: { value: 0.45 },
    uMoonIntensity: { value: 0.35 },
    uMoonDir: { value: new THREE.Vector3(-0.46, 0.42, -0.78).normalize() },
    uTime: { value: 0.0 },
  };

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenithColor;
      uniform vec3 uMidColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uGroundColor;
      uniform float uStarIntensity;
      uniform float uMoonIntensity;
      uniform vec3 uMoonDir;
      uniform float uTime;
      varying vec3 vWorldDir;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      vec2 hash22(vec2 p) {
        float n = hash21(p);
        return vec2(n, hash21(p + n * 19.7));
      }

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = dir.y;

        vec3 col;
        if (h >= 0.0) {
          float t1 = smoothstep(0.0, 0.28, h);
          float t2 = smoothstep(0.2, 0.85, h);
          col = mix(uHorizonColor, uMidColor, t1);
          col = mix(col, uZenithColor, t2);
        } else {
          float tb = smoothstep(0.0, -0.35, h);
          col = mix(uHorizonColor * 0.72, uGroundColor, tb);
        }

        // Soft distant snowy mountain ridges along the winter horizon
        float az = atan(dir.z, dir.x);
        float ridgeFar = 0.042 + 0.036 * sin(az * 3.0 + 0.7) + 0.019 * sin(az * 7.0 - 1.2) + 0.011 * cos(az * 13.0);
        float ridgeNear = 0.018 + 0.022 * cos(az * 4.0 - 0.5) + 0.012 * sin(az * 9.0 + 1.4);
        float aboveGround = smoothstep(-0.14, 0.005, h);

        float farMask = (1.0 - smoothstep(ridgeFar - 0.008, ridgeFar + 0.014, h)) * aboveGround;
        vec3 farCol = mix(uMidColor * 0.62, uHorizonColor * 0.76, 0.4);
        col = mix(col, farCol, farMask * 0.45);

        float nearMask = (1.0 - smoothstep(ridgeNear - 0.006, ridgeNear + 0.012, h)) * aboveGround;
        vec3 nearCol = mix(uMidColor * 0.45, uHorizonColor * 0.52, 0.25);
        col = mix(col, nearCol, nearMask * 0.52);

        // Crisp circular twinkling winter stars (zero blocky square cells!)
        if (h > 0.06 && uStarIntensity > 0.01) {
          vec2 starUv = vec2(az / 6.2831853 + 0.5, asin(clamp(h, -1.0, 1.0)) / 1.5707963);
          vec2 grid = starUv * vec2(115.0, 52.0);
          vec2 cell = floor(grid);
          vec2 gv = fract(grid) - 0.5;
          float rnd = hash21(cell);
          if (rnd > 0.87) {
            vec2 off = (hash22(cell + 7.1) - 0.5) * 0.62;
            // Aspect-correct by cos(elevation) so stars stay perfectly circular at high latitudes
            float cosLat = max(0.25, sqrt(max(0.0, 1.0 - h * h)));
            vec2 delta = (gv - off) * vec2(cosLat * 2.2, 1.0);
            float d = length(delta);
            float radius = mix(0.045, 0.11, fract(rnd * 37.3));
            float dotStar = smoothstep(radius, radius * 0.15, d);
            float twinkle = 0.65 + 0.35 * sin(uTime * 1.9 + rnd * 95.0);
            float starAlpha = smoothstep(0.06, 0.28, h) * uStarIntensity * twinkle * dotStar;
            vec3 starTint = mix(vec3(0.84, 0.92, 1.0), vec3(1.0, 0.94, 0.84), fract(rnd * 13.7));
            col += starTint * starAlpha * 0.95;
          }
        }

        // Soft winter moon + glowing lunar halo
        if (uMoonIntensity > 0.01) {
          float mDot = dot(dir, normalize(uMoonDir));
          float halo = pow(max(mDot, 0.0), 16.0) * 0.26 + pow(max(mDot, 0.0), 110.0) * 0.45;
          float disc = smoothstep(0.9974, 0.9986, mDot);
          col += vec3(0.94, 0.96, 1.0) * (halo + disc * 0.95) * uMoonIntensity;
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(skyGeo, skyMat);
  mesh.name = 'WinterSkyDome';

  return {
    mesh,
    uniforms,
    update(time) {
      uniforms.uTime.value = time;
    },
  };
}
