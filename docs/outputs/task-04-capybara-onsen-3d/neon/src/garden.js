import * as THREE from 'three';
import { getGroundHeight } from './environment.js';

function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Assigns planar top-down UVs to snow geometries so there are zero UV pole pinwheels.
 */
function assignPlanarUVs(geo, scale = 0.45) {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) * scale + 0.5, pos.getZ(i) * scale + 0.5);
  }
  uv.needsUpdate = true;
}

/**
 * Sculptural Japanese Black Pine (黒松) tufted foliage cloud:
 * - Multi-layered scalloped evergreen needle tufts (NO flat flying-saucer look!)
 * - Soft fluffy planar-UV snow billows nestled over the upper canopy
 */
function createSnowyPinePad({ rx = 0.85, ry = 0.34, rz = 0.78, seed = 1, pineMat, snowMat }) {
  const pad = new THREE.Group();
  const rng = seededRng(seed);

  // Rich organic cluster of smaller overlapping evergreen tufts forming a bonsai-like cloud pad
  const tufts = [
    { x: 0, y: 0.04, z: 0, sx: 0.68, sy: 0.78, sz: 0.66, snow: true },
    { x: rx * 0.46, y: -0.04, z: rz * 0.16, sx: 0.54, sy: 0.68, sz: 0.52, snow: true },
    { x: -rx * 0.46, y: -0.03, z: -rz * 0.14, sx: 0.56, sy: 0.7, sz: 0.54, snow: true },
    { x: rx * 0.16, y: -0.05, z: -rz * 0.44, sx: 0.52, sy: 0.66, sz: 0.5, snow: true },
    { x: -rx * 0.16, y: -0.04, z: rz * 0.44, sx: 0.52, sy: 0.66, sz: 0.52, snow: true },
    { x: rx * 0.36, y: -0.09, z: -rz * 0.3, sx: 0.42, sy: 0.58, sz: 0.42, snow: false },
    { x: -rx * 0.36, y: -0.08, z: rz * 0.32, sx: 0.42, sy: 0.58, sz: 0.42, snow: false },
    // Lower tufted evergreen underside puffs so looking from below shows textured foliage depth!
    { x: rx * 0.22, y: -ry * 0.34, z: rz * 0.18, sx: 0.36, sy: 0.48, sz: 0.36, snow: false },
    { x: -rx * 0.24, y: -ry * 0.32, z: -rz * 0.16, sx: 0.38, sy: 0.48, sz: 0.36, snow: false },
  ];

  for (const tf of tufts) {
    const phase = rng() * 6.28;
    const g = new THREE.SphereGeometry(1.0, 22, 14);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const ang = Math.atan2(z, x);
      const tuftBump =
        1.0 +
        0.11 * Math.sin(ang * 5.0 + phase) +
        0.07 * Math.cos(x * 6.5 - z * 5.8 + phase) +
        0.05 * Math.sin(y * 7.0 + phase);
      x *= rx * tf.sx * tuftBump;
      y *= ry * tf.sy * (y < 0 ? 0.78 : 0.88) * tuftBump;
      z *= rz * tf.sz * tuftBump;
      pos.setXYZ(i, x, y, z);
    }
    assignPlanarUVs(g, 1.35);
    g.computeVertexNormals();
    const foliage = new THREE.Mesh(g, pineMat);
    foliage.position.set(tf.x, tf.y, tf.z);
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    pad.add(foliage);

    if (tf.snow) {
      // Plush smooth snow drift resting cleanly OVER each upper pine tuft with zero green poke-through!
      const sg = new THREE.SphereGeometry(1.0, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.56);
      const sPos = sg.attributes.position;
      for (let i = 0; i < sPos.count; i++) {
        let x = sPos.getX(i);
        let y = sPos.getY(i);
        let z = sPos.getZ(i);
        const ang = Math.atan2(z, x);
        const wave = 1.0 + 0.08 * Math.sin(ang * 5.0 + phase) + 0.04 * Math.cos(x * 4.5 + z * 4.5);
        x *= rx * tf.sx * 1.12 * wave;
        y *= ry * tf.sy * 0.92 * wave;
        z *= rz * tf.sz * 1.12 * wave;
        sPos.setXYZ(i, x, y, z);
      }
      assignPlanarUVs(sg, 0.55);
      sg.computeVertexNormals();
      const snowPillow = new THREE.Mesh(sg, snowMat);
      snowPillow.position.set(tf.x, tf.y + ry * tf.sy * 0.34, tf.z);
      snowPillow.castShadow = true;
      snowPillow.receiveShadow = true;
      pad.add(snowPillow);
    }
  }

  return pad;
}

/**
 * Builds all authentic Japanese Winter Garden elements:
 * - Tightly slatted curved Bamboo Fence (建仁寺垣) with snow ridge & twine knots
 * - Yukimi-doro Snow-Viewing Stone Lantern (雪見灯籠) with clean overhang snow roof & flickering firelight
 * - Low Wooden Foot Lantern (足元行灯) near the stepping stones
 * - Gnarled Snow-Laden Japanese Black Pine (雪化粧の黒松)
 * - Swaying Snow-Dusted Bamboo Grove (雪竹)
 * - Nanten Red Winter Berry Shrubs (南天), Snow-Capped Garden Boulder & Traditional Snow Rabbit (雪うさぎ)
 */
export function createGarden(textures) {
  const group = new THREE.Group();
  group.name = 'JapaneseWinterGarden';

  const snowMat = new THREE.MeshStandardMaterial({
    color: '#f6f9ff',
    map: textures.snow.map,
    bumpMap: textures.snow.bumpMap,
    bumpScale: 0.025,
    roughness: 0.85,
    metalness: 0.01,
  });

  const stoneLanternMat = new THREE.MeshStandardMaterial({
    color: '#8f9296',
    map: textures.rock.map,
    bumpMap: textures.rock.bumpMap,
    bumpScale: 0.05,
    roughness: 0.9,
    metalness: 0.02,
  });

  const bambooDryMat = new THREE.MeshStandardMaterial({
    map: textures.bambooDry,
    roughness: 0.66,
  });

  const bambooGreenMat = new THREE.MeshStandardMaterial({
    map: textures.bambooGreen,
    roughness: 0.52,
  });

  const twineMat = new THREE.MeshStandardMaterial({
    color: '#201b18',
    roughness: 0.95,
  });

  const hinokiMat = new THREE.MeshStandardMaterial({
    map: textures.hinoki.map,
    roughness: 0.78,
  });

  const pineBarkMat = new THREE.MeshStandardMaterial({
    map: textures.pineBark,
    roughness: 0.94,
  });

  const pineNeedleMat = new THREE.MeshStandardMaterial({
    color: '#d8e8dc',
    map: textures.pineNeedle.map,
    bumpMap: textures.pineNeedle.bumpMap,
    bumpScale: 0.04,
    roughness: 0.88,
  });

  // =========================================================================
  // 1. Curved Japanese Bamboo Fence (建仁寺垣) around back semicircle
  // =========================================================================
  const fenceGroup = new THREE.Group();
  fenceGroup.name = 'BambooFence';
  group.add(fenceGroup);

  const fenceRadius = 4.25;
  const startAngle = -Math.PI * 0.84; // back-left
  const endAngle = -Math.PI * 0.14; // back-right
  const stakeCount = 74;
  const fenceHeight = 1.6;

  const railPtsTop = [];
  const railPtsMid = [];
  const railPtsBot = [];
  const snowRidgePts = [];

  for (let i = 0; i <= stakeCount; i++) {
    const t = i / stakeCount;
    const angle = THREE.MathUtils.lerp(startAngle, endAngle, t);
    const fx = Math.cos(angle) * fenceRadius;
    const fz = Math.sin(angle) * fenceRadius;
    const gy = getGroundHeight(fx, fz);

    const h = fenceHeight + Math.sin(i * 0.65) * 0.02;
    const isPost = i % 18 === 0 || i === stakeCount;
    const stakeR = isPost ? 0.072 : 0.048;
    const stake = new THREE.Mesh(
      new THREE.CylinderGeometry(stakeR, stakeR * 1.04, h, 8),
      bambooDryMat
    );
    stake.position.set(fx, gy + h * 0.48 - 0.08, fz);
    stake.castShadow = true;
    stake.receiveShadow = true;
    fenceGroup.add(stake);

    const topY = gy + h - 0.08;
    const inR = fenceRadius - 0.056;
    if (i % 3 === 0 || i === stakeCount) {
      railPtsTop.push(new THREE.Vector3(Math.cos(angle) * inR, topY - 0.12, Math.sin(angle) * inR));
      railPtsMid.push(new THREE.Vector3(Math.cos(angle) * inR, topY - 0.68, Math.sin(angle) * inR));
      railPtsBot.push(new THREE.Vector3(Math.cos(angle) * inR, topY - 1.24, Math.sin(angle) * inR));
      snowRidgePts.push(new THREE.Vector3(fx, topY + 0.04, fz));
    }

    // Black hemp twine cross-knots (男結び) at major posts
    if (isPost) {
      for (const dy of [-0.12, -0.68, -1.24]) {
        const knot = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.016, 6, 12), twineMat);
        knot.position.set(
          Math.cos(angle) * (fenceRadius - 0.02),
          topY + dy,
          Math.sin(angle) * (fenceRadius - 0.02)
        );
        knot.rotation.y = -angle;
        knot.rotation.x = 0.65;
        fenceGroup.add(knot);
      }
    }
  }

  for (const pts of [railPtsTop, railPtsMid, railPtsBot]) {
    const curve = new THREE.CatmullRomCurve3(pts);
    const rail = new THREE.Mesh(new THREE.TubeGeometry(curve, 52, 0.042, 8, false), bambooDryMat);
    rail.castShadow = true;
    rail.receiveShadow = true;
    fenceGroup.add(rail);
  }

  const capCurve = new THREE.CatmullRomCurve3(
    snowRidgePts.map((p) => p.clone().add(new THREE.Vector3(0, -0.02, 0)))
  );
  const capRail = new THREE.Mesh(new THREE.TubeGeometry(capCurve, 52, 0.062, 10, false), bambooDryMat);
  capRail.castShadow = true;
  fenceGroup.add(capRail);

  const snowCurve = new THREE.CatmullRomCurve3(
    snowRidgePts.map((p, idx) => p.clone().add(new THREE.Vector3(0, 0.032 + Math.sin(idx * 0.9) * 0.014, 0)))
  );
  const snowRibbonGeo = new THREE.TubeGeometry(snowCurve, 60, 0.07, 10, false);
  const srPos = snowRibbonGeo.attributes.position;
  const srUv = snowRibbonGeo.attributes.uv;
  for (let i = 0; i < srPos.count; i++) {
    const u = Math.min(1, Math.max(0, srUv.getX(i)));
    const c = snowCurve.getPoint(u);
    const dy = srPos.getY(i) - c.y;
    const puff = 1.0 + 0.16 * Math.sin(u * 26.0);
    srPos.setY(i, c.y + dy * 0.72 * puff + 0.02);
  }
  assignPlanarUVs(snowRibbonGeo, 0.35);
  snowRibbonGeo.computeVertexNormals();
  const snowRibbon = new THREE.Mesh(snowRibbonGeo, snowMat);
  snowRibbon.castShadow = true;
  snowRibbon.receiveShadow = true;
  fenceGroup.add(snowRibbon);

  // =========================================================================
  // 2. Yukimi-doro Snow-Viewing Stone Lantern (雪見灯籠)
  // =========================================================================
  const lanternX = -3.05;
  const lanternZ = 0.92;
  const lanternBaseY = getGroundHeight(lanternX, lanternZ);

  const lanternGroup = new THREE.Group();
  lanternGroup.name = 'YukimiDoroLantern';
  lanternGroup.position.set(lanternX, lanternBaseY - 0.04, lanternZ);
  lanternGroup.rotation.y = 0.42;
  group.add(lanternGroup);

  const slab = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.62, 0.14, 10), stoneLanternMat);
  slab.position.y = 0.07;
  slab.receiveShadow = true;
  slab.castShadow = true;
  lanternGroup.add(slab);

  // 3 graceful arched stone legs (脚)
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.3;
    const legCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * 0.38, 0.12, Math.sin(a) * 0.38),
      new THREE.Vector3(Math.cos(a) * 0.34, 0.42, Math.sin(a) * 0.34),
      new THREE.Vector3(Math.cos(a) * 0.14, 0.68, Math.sin(a) * 0.14),
    ]);
    const leg = new THREE.Mesh(new THREE.TubeGeometry(legCurve, 10, 0.088, 8, false), stoneLanternMat);
    leg.castShadow = true;
    leg.receiveShadow = true;
    lanternGroup.add(leg);
  }

  // Hexagonal middle platform (中台)
  const chudai = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.32, 0.16, 6), stoneLanternMat);
  chudai.position.y = 0.74;
  chudai.castShadow = true;
  chudai.receiveShadow = true;
  lanternGroup.add(chudai);

  // Hexagonal Fire Box (火袋)
  const fireboxY = 1.02;
  const fireboxH = 0.42;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.068, fireboxH, 0.068), stoneLanternMat);
    pillar.position.set(Math.cos(a) * 0.25, fireboxY, Math.sin(a) * 0.25);
    pillar.rotation.y = -a;
    pillar.castShadow = true;
    lanternGroup.add(pillar);
  }
  for (const fy of [fireboxY - fireboxH * 0.48, fireboxY + fireboxH * 0.48]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.05, 6), stoneLanternMat);
    ring.position.y = fy;
    lanternGroup.add(ring);
  }

  // Warm glowing paper/flame chamber inside the firebox
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: '#ffe6ad',
    emissive: new THREE.Color('#ff9d2e'),
    emissiveIntensity: 2.4,
    roughness: 0.4,
  });
  const glowCore = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, fireboxH * 0.84, 6), lanternGlowMat);
  glowCore.position.y = fireboxY;
  lanternGroup.add(glowCore);

  // Wide curved hexagonal umbrella roof (笠) + clean matching snow cap (ZERO z-fighting or rim gaps!)
  const kasaGeo = new THREE.ConeGeometry(0.76, 0.35, 6, 4);
  const kPos = kasaGeo.attributes.position;
  for (let i = 0; i < kPos.count; i++) {
    const x = kPos.getX(i);
    const y = kPos.getY(i);
    const z = kPos.getZ(i);
    const r = Math.hypot(x, z);
    if (r > 0.04) {
      const flare = Math.pow(r / 0.76, 1.8) * 0.085;
      kPos.setY(i, y + flare);
    }
  }
  kasaGeo.computeVertexNormals();
  const kasa = new THREE.Mesh(kasaGeo, stoneLanternMat);
  kasa.position.y = 1.4;
  kasa.castShadow = true;
  kasa.receiveShadow = true;
  lanternGroup.add(kasa);

  // Matching open-ended snow cap resting cleanly ON TOP of the stone kasa (zero bottom overhang bleed!)
  const kasaSnowGeo = new THREE.ConeGeometry(0.77, 0.32, 6, 6, true);
  const ksPos = kasaSnowGeo.attributes.position;
  for (let i = 0; i < ksPos.count; i++) {
    const x = ksPos.getX(i);
    const y = ksPos.getY(i);
    const z = ksPos.getZ(i);
    const r = Math.hypot(x, z);
    const t = Math.min(1, r / 0.77);
    const flare = Math.pow(t, 1.8) * 0.085;
    const thickness = 0.065 * Math.sin(t * Math.PI * 0.88) + 0.025;
    ksPos.setY(i, y + flare + thickness);
  }
  assignPlanarUVs(kasaSnowGeo, 0.6);
  kasaSnowGeo.computeVertexNormals();
  const kasaSnow = new THREE.Mesh(kasaSnowGeo, snowMat);
  kasaSnow.position.y = 1.44;
  kasaSnow.castShadow = true;
  kasaSnow.receiveShadow = true;
  lanternGroup.add(kasaSnow);

  // Lotus-bud stone finial (宝珠)
  const hoju = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), stoneLanternMat);
  hoju.scale.set(1.0, 1.35, 1.0);
  hoju.position.y = 1.72;
  hoju.castShadow = true;
  lanternGroup.add(hoju);

  const mainLanternLight = new THREE.PointLight('#ffa044', 8.2, 12.0, 1.6);
  mainLanternLight.position.set(0, fireboxY, 0);
  mainLanternLight.castShadow = true;
  mainLanternLight.shadow.mapSize.set(512, 512);
  mainLanternLight.shadow.bias = -0.002;
  lanternGroup.add(mainLanternLight);

  // =========================================================================
  // 3. Secondary Low Wooden Garden Foot Lantern (足元行灯) on front-right
  // =========================================================================
  const andonX = 3.22;
  const andonZ = 1.92;
  const andonY = getGroundHeight(andonX, andonZ);

  const andonGroup = new THREE.Group();
  andonGroup.name = 'WoodenFootLantern';
  andonGroup.position.set(andonX, andonY - 0.02, andonZ);
  andonGroup.rotation.y = -0.58;
  group.add(andonGroup);

  const andonBase = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.42), stoneLanternMat);
  andonBase.position.y = 0.07;
  andonBase.receiveShadow = true;
  andonGroup.add(andonBase);

  const andonGlowMat = new THREE.MeshStandardMaterial({
    color: '#ffedc6',
    emissive: new THREE.Color('#ffaa44'),
    emissiveIntensity: 1.95,
    roughness: 0.5,
  });
  const andonPaper = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.44, 0.28), andonGlowMat);
  andonPaper.position.y = 0.38;
  andonGroup.add(andonPaper);

  for (const sx of [-0.145, 0.145]) {
    for (const sz of [-0.145, 0.145]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.52, 0.036), hinokiMat);
      post.position.set(sx, 0.38, sz);
      post.castShadow = true;
      andonGroup.add(post);
    }
  }

  const andonRoof = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.2, 4), hinokiMat);
  andonRoof.rotation.y = Math.PI / 4;
  andonRoof.position.y = 0.72;
  andonRoof.castShadow = true;
  andonGroup.add(andonRoof);

  const andonSnowGeo = new THREE.ConeGeometry(0.37, 0.16, 4);
  assignPlanarUVs(andonSnowGeo, 1.2);
  const andonSnow = new THREE.Mesh(andonSnowGeo, snowMat);
  andonSnow.rotation.y = Math.PI / 4;
  andonSnow.position.y = 0.77;
  andonGroup.add(andonSnow);

  const footLanternLight = new THREE.PointLight('#ffa94d', 3.8, 7.6, 1.7);
  footLanternLight.position.set(0, 0.42, 0);
  andonGroup.add(footLanternLight);

  // =========================================================================
  // 4. Sculptural Snow-Laden Japanese Black Pine Tree (雪化粧の黒松)
  // =========================================================================
  const pineX = 2.98;
  const pineZ = -2.28;
  const pineBaseY = getGroundHeight(pineX, pineZ);

  const pineGroup = new THREE.Group();
  pineGroup.name = 'SnowyJapanesePine';
  pineGroup.position.set(pineX, pineBaseY - 0.12, pineZ);
  group.add(pineGroup);

  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, 0.0, 0.0),
    new THREE.Vector3(0.14, 0.82, -0.12),
    new THREE.Vector3(-0.22, 1.68, 0.18),
    new THREE.Vector3(-0.82, 2.42, 0.52),
    new THREE.Vector3(-1.38, 2.94, 0.68),
  ]);

  function makeTaperedBranch(curve, rStart, rEnd, tubularSegs = 22) {
    const geo = new THREE.TubeGeometry(curve, tubularSegs, 1.0, 10, false);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const u = Math.min(1, Math.max(0, uv.getX(i)));
      const center = curve.getPoint(u);
      const r = THREE.MathUtils.lerp(rStart, rEnd, Math.pow(u, 0.85));
      pos.setXYZ(
        i,
        center.x + (pos.getX(i) - center.x) * r,
        center.y + (pos.getY(i) - center.y) * r,
        center.z + (pos.getZ(i) - center.z) * r
      );
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, pineBarkMat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  pineGroup.add(makeTaperedBranch(trunkCurve, 0.28, 0.09, 26));

  const branchDefs = [
    // Sweeping low-mid bough reaching gracefully over the steaming bath (yukimi overhang!)
    {
      pts: [
        new THREE.Vector3(-0.26, 1.76, 0.22),
        new THREE.Vector3(-1.05, 1.94, 0.64),
        new THREE.Vector3(-1.78, 1.98, 0.88),
      ],
      r0: 0.125,
      r1: 0.044,
      pad: { pos: [-1.8, 2.1, 0.92], rx: 1.02, ry: 0.36, rz: 0.84, seed: 401 },
    },
    // Right counter-balancing bough (kept compact so it stays nicely inside viewport!)
    {
      pts: [
        new THREE.Vector3(0.0, 1.48, 0.04),
        new THREE.Vector3(0.62, 1.66, 0.22),
        new THREE.Vector3(1.02, 1.78, 0.36),
      ],
      r0: 0.115,
      r1: 0.042,
      pad: { pos: [1.05, 1.9, 0.38], rx: 0.84, ry: 0.33, rz: 0.74, seed: 402 },
    },
    // Rear-left upper bough
    {
      pts: [
        new THREE.Vector3(-0.64, 2.32, 0.42),
        new THREE.Vector3(-1.24, 2.55, -0.15),
        new THREE.Vector3(-1.58, 2.64, -0.44),
      ],
      r0: 0.095,
      r1: 0.038,
      pad: { pos: [-1.62, 2.76, -0.46], rx: 0.86, ry: 0.34, rz: 0.76, seed: 403 },
    },
    // Upper-right bough
    {
      pts: [
        new THREE.Vector3(-0.46, 2.2, 0.34),
        new THREE.Vector3(0.24, 2.54, -0.14),
        new THREE.Vector3(0.58, 2.68, -0.32),
      ],
      r0: 0.092,
      r1: 0.036,
      pad: { pos: [0.62, 2.8, -0.32], rx: 0.8, ry: 0.33, rz: 0.7, seed: 404 },
    },
  ];

  for (const b of branchDefs) {
    pineGroup.add(makeTaperedBranch(new THREE.CatmullRomCurve3(b.pts), b.r0, b.r1, 14));
    const pad = createSnowyPinePad({
      rx: b.pad.rx,
      ry: b.pad.ry,
      rz: b.pad.rz,
      seed: b.pad.seed,
      pineMat: pineNeedleMat,
      snowMat,
    });
    pad.position.set(...b.pad.pos);
    pineGroup.add(pad);
  }

  // Crown canopy pad at the apex of the pine tree
  const crownPad = createSnowyPinePad({
    rx: 1.12,
    ry: 0.44,
    rz: 0.94,
    seed: 405,
    pineMat: pineNeedleMat,
    snowMat,
  });
  crownPad.position.set(-1.35, 3.16, 0.64);
  pineGroup.add(crownPad);

  // =========================================================================
  // 5. Swaying Snow-Dusted Bamboo Grove (雪竹) behind the back-left fence
  // =========================================================================
  const bambooStalks = [];
  const bambooSpecs = [
    { x: -3.35, z: -3.22, h: 3.65, leanX: 0.4, leanZ: 0.3, r: 0.06 },
    { x: -2.92, z: -3.62, h: 4.15, leanX: 0.32, leanZ: 0.44, r: 0.065 },
    { x: -2.45, z: -3.9, h: 3.55, leanX: 0.2, leanZ: 0.35, r: 0.055 },
    { x: -2.0, z: -4.12, h: 4.2, leanX: -0.14, leanZ: 0.42, r: 0.062 },
    { x: -1.52, z: -4.25, h: 3.45, leanX: 0.26, leanZ: 0.32, r: 0.052 },
    { x: -3.72, z: -2.75, h: 3.35, leanX: 0.44, leanZ: 0.22, r: 0.054 },
    { x: -1.04, z: -4.38, h: 3.8, leanX: 0.15, leanZ: 0.3, r: 0.056 },
    { x: -2.65, z: -4.15, h: 3.95, leanX: 0.12, leanZ: 0.38, r: 0.058 },
  ];

  const bambooLeafMat = new THREE.MeshStandardMaterial({
    color: '#3f6934',
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
  const frostedLeafMat = new THREE.MeshStandardMaterial({
    color: '#e1ece5',
    roughness: 0.82,
    side: THREE.DoubleSide,
  });

  const bLeafShape = new THREE.Shape();
  bLeafShape.moveTo(0, 0);
  bLeafShape.quadraticCurveTo(0.14, 0.055, 0.34, 0);
  bLeafShape.quadraticCurveTo(0.14, -0.055, 0, 0);
  const bLeafGeo = new THREE.ShapeGeometry(bLeafShape, 5);

  bambooSpecs.forEach((sp, idx) => {
    const gy = getGroundHeight(sp.x, sp.z);
    const stalkGroup = new THREE.Group();
    stalkGroup.position.set(sp.x, gy - 0.08, sp.z);

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(sp.leanX * 0.22, sp.h * 0.38, sp.leanZ * 0.22),
      new THREE.Vector3(sp.leanX * 0.62, sp.h * 0.74, sp.leanZ * 0.62),
      new THREE.Vector3(sp.leanX, sp.h, sp.leanZ),
    ]);
    const culmGeo = new THREE.TubeGeometry(curve, 18, sp.r, 8, false);
    const culmMesh = new THREE.Mesh(culmGeo, bambooGreenMat);
    culmMesh.castShadow = true;
    stalkGroup.add(culmMesh);

    const rng = seededRng(700 + idx * 19);
    for (const frac of [0.54, 0.68, 0.82, 0.94, 0.99]) {
      const pt = curve.getPoint(frac);
      const sprayCount = 5 + Math.floor(rng() * 3);
      for (let j = 0; j < sprayCount; j++) {
        const isFrosted = rng() > 0.52;
        const leaf = new THREE.Mesh(bLeafGeo, isFrosted ? frostedLeafMat : bambooLeafMat);
        leaf.position.copy(pt);
        leaf.rotation.set(-0.35 + rng() * 0.7, rng() * Math.PI * 2, -0.25 - rng() * 0.45);
        const s = 0.78 + rng() * 0.56;
        leaf.scale.set(s, s, s);
        stalkGroup.add(leaf);
      }
    }

    group.add(stalkGroup);
    bambooStalks.push({ group: stalkGroup, phase: idx * 0.85 });
  });

  // =========================================================================
  // 6. Nanten Winter Berry Shrubs (南天) & Front-Left Snowy Garden Accent
  // =========================================================================
  const berryMat = new THREE.MeshStandardMaterial({
    color: '#cc242e',
    roughness: 0.3,
    metalness: 0.05,
  });
  const nantenLeafMat = new THREE.MeshStandardMaterial({
    color: '#2e542c',
    roughness: 0.68,
    side: THREE.DoubleSide,
  });

  function createNantenShrub(x, z, scale = 1.0, seed = 1) {
    const shrub = new THREE.Group();
    const gy = getGroundHeight(x, z);
    shrub.position.set(x, gy - 0.03, z);
    shrub.scale.setScalar(scale);
    const rng = seededRng(seed);

    for (let s = 0; s < 5; s++) {
      const a = (s / 5) * Math.PI * 2 + rng() * 0.4;
      const h = 0.46 + rng() * 0.24;
      const tip = new THREE.Vector3(Math.cos(a) * 0.22, h, Math.sin(a) * 0.22);
      const stemCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(tip.x * 0.45, h * 0.55, tip.z * 0.45),
        tip,
      ]);
      shrub.add(new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 6, 0.015, 5, false), pineBarkMat));

      for (let l = 0; l < 5; l++) {
        const leaf = new THREE.Mesh(bLeafGeo, nantenLeafMat);
        leaf.position.copy(stemCurve.getPoint(0.55 + rng() * 0.35));
        leaf.rotation.set(-0.2 + rng() * 0.5, rng() * Math.PI * 2, -0.15 - rng() * 0.3);
        leaf.scale.setScalar(0.72 + rng() * 0.3);
        shrub.add(leaf);
      }

      for (let b = 0; b < 9; b++) {
        const berry = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), berryMat);
        berry.position.set(
          tip.x + (rng() - 0.5) * 0.12,
          tip.y - rng() * 0.1,
          tip.z + (rng() - 0.5) * 0.12
        );
        berry.castShadow = true;
        shrub.add(berry);
      }
    }
    group.add(shrub);
  }

  createNantenShrub(-2.58, 2.15, 1.08, 911);
  createNantenShrub(3.52, -0.35, 0.96, 912);

  // Cozy front-left garden boulder pair + winter Sasa grass (隈笹) balancing the diorama
  const accentSpecs = [
    { x: -3.28, z: 2.68, sx: 0.56, sy: 0.34, sz: 0.44, rot: 0.65 },
    { x: -2.65, z: 3.12, sx: 0.36, sy: 0.24, sz: 0.31, rot: -0.45 },
  ];
  for (const ac of accentSpecs) {
    const gy = getGroundHeight(ac.x, ac.z);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 2), stoneLanternMat);
    rock.scale.set(ac.sx, ac.sy, ac.sz);
    rock.position.set(ac.x, gy + ac.sy * 0.22, ac.z);
    rock.rotation.y = ac.rot;
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);

    const capGeo = new THREE.SphereGeometry(1.0, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.54);
    assignPlanarUVs(capGeo, 0.65);
    const cap = new THREE.Mesh(capGeo, snowMat);
    cap.scale.set(ac.sx * 0.94, ac.sy * 0.72, ac.sz * 0.94);
    cap.position.set(ac.x, gy + ac.sy * 0.56, ac.z);
    cap.rotation.y = ac.rot;
    cap.castShadow = true;
    cap.receiveShadow = true;
    group.add(cap);
  }

  const sasaRng = seededRng(944);
  const sasaAnchorX = -2.98;
  const sasaAnchorZ = 2.94;
  const sasaY = getGroundHeight(sasaAnchorX, sasaAnchorZ);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + sasaRng() * 0.3;
    const leaf = new THREE.Mesh(bLeafGeo, i % 3 === 0 ? frostedLeafMat : nantenLeafMat);
    leaf.position.set(
      sasaAnchorX + Math.cos(a) * 0.14,
      sasaY + 0.04,
      sasaAnchorZ + Math.sin(a) * 0.14
    );
    leaf.rotation.set(-0.32 - sasaRng() * 0.3, a, -0.42 - sasaRng() * 0.35);
    const sc = 0.95 + sasaRng() * 0.58;
    leaf.scale.set(sc, sc, sc);
    group.add(leaf);
  }

  // =========================================================================
  // 7. Adorable Traditional Japanese Snow Rabbit (雪うさぎ) on the left snowbank!
  // =========================================================================
  const rabbitX = -1.94;
  const rabbitZ = 2.42;
  const rabbitY = getGroundHeight(rabbitX, rabbitZ);

  const snowRabbit = new THREE.Group();
  snowRabbit.name = 'YukiusagiSnowRabbit';
  snowRabbit.position.set(rabbitX, rabbitY + 0.1, rabbitZ);
  snowRabbit.rotation.y = 0.56;

  const rBody = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 16), snowMat);
  rBody.scale.set(1.0, 0.84, 1.24);
  rBody.castShadow = true;
  rBody.receiveShadow = true;
  snowRabbit.add(rBody);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(bLeafGeo, nantenLeafMat);
    ear.position.set(side * 0.068, 0.118, -0.025);
    ear.rotation.set(0.36, side * 0.36 + Math.PI * 0.5, 0.24);
    ear.scale.setScalar(0.68);
    snowRabbit.add(ear);

    const rEye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 10), berryMat);
    rEye.position.set(side * 0.068, 0.04, 0.182);
    snowRabbit.add(rEye);
  }
  group.add(snowRabbit);

  return {
    group,
    lights: {
      mainLanternLight,
      footLanternLight,
      lanternGlowMat,
      andonGlowMat,
    },
    lanternWorldPos: new THREE.Vector3(lanternX, lanternBaseY + fireboxY, lanternZ),
    update(time, lanternScale = 1.0) {
      const flicker1 =
        1.0 +
        Math.sin(time * 6.3) * 0.055 +
        Math.sin(time * 13.7 + 1.1) * 0.03 +
        Math.cos(time * 2.9) * 0.035;
      const flicker2 = 1.0 + Math.sin(time * 5.1 + 2.4) * 0.045 + Math.cos(time * 11.2) * 0.025;

      mainLanternLight.intensity = 8.2 * lanternScale * flicker1;
      footLanternLight.intensity = 3.8 * lanternScale * flicker2;
      lanternGlowMat.emissiveIntensity = (1.1 + 1.55 * lanternScale) * flicker1;
      andonGlowMat.emissiveIntensity = (0.95 + 1.25 * lanternScale) * flicker2;

      for (const b of bambooStalks) {
        b.group.rotation.z = Math.sin(time * 0.85 + b.phase) * 0.022;
        b.group.rotation.x = Math.cos(time * 0.65 + b.phase * 1.3) * 0.014;
      }
    },
  };
}
