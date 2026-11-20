import * as THREE from 'three';

/**
 * Reusable high-craft Yuzu citrus mesh:
 * - Oblate bumpy golden peel with natural pole dimples
 * - 5-point olive star calyx (ヘタ) + short curved woody stem
 * - Glossy curved primary citrus leaf + delicate secondary bud leaf
 */
export function createYuzuMesh({ radius = 0.19, withLeaf = true, yuzuTextures } = {}) {
  const group = new THREE.Group();
  group.name = 'Yuzu';

  const bodyGeo = new THREE.SphereGeometry(radius, 40, 28);
  const pos = bodyGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    const len = Math.hypot(x, y, z) || 1;
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;

    const poleDent = ny > 0.82 ? -0.065 * Math.pow((ny - 0.82) / 0.18, 2) : 0;
    const bottomDent = ny < -0.84 ? -0.04 * Math.pow((-ny - 0.84) / 0.16, 2) : 0;
    const organicBump =
      0.017 * Math.sin(nx * 9.0 + nz * 7.0) * Math.cos(ny * 8.0) +
      0.011 * Math.cos(nx * 14.0 - ny * 11.0 + nz * 12.0);

    const scale = 1.0 + poleDent + bottomDent + organicBump;
    x *= scale * 1.06;
    y *= scale * 0.88;
    z *= scale * 1.06;
    pos.setXYZ(i, x, y, z);
  }
  bodyGeo.computeVertexNormals();

  const peelMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: yuzuTextures.map,
    bumpMap: yuzuTextures.bumpMap,
    bumpScale: 0.022,
    roughness: 0.4,
    metalness: 0.02,
  });

  const bodyMesh = new THREE.Mesh(bodyGeo, peelMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // Dark olive-green 5-point star calyx (ヘタ)
  const calyxY = radius * 0.815;
  const calyxMat = new THREE.MeshStandardMaterial({
    color: '#3a5822',
    roughness: 0.72,
  });
  const calyxCenter = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.15, radius * 0.18, radius * 0.08, 7),
    calyxMat
  );
  calyxCenter.position.y = calyxY;
  group.add(calyxCenter);

  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    const lobe = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.085, radius * 0.24, 4), calyxMat);
    lobe.position.set(Math.cos(a) * radius * 0.13, calyxY - radius * 0.01, Math.sin(a) * radius * 0.13);
    lobe.rotation.z = -Math.PI * 0.44;
    lobe.rotation.y = -a;
    group.add(lobe);
  }

  // Short woody stem
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, calyxY + radius * 0.02, 0),
    new THREE.Vector3(radius * 0.04, calyxY + radius * 0.21, radius * 0.02),
    new THREE.Vector3(radius * 0.09, calyxY + radius * 0.33, -radius * 0.02),
  ]);
  const stemGeo = new THREE.TubeGeometry(stemCurve, 6, radius * 0.048, 6, false);
  const stemMat = new THREE.MeshStandardMaterial({ color: '#5c4727', roughness: 0.85 });
  const stemMesh = new THREE.Mesh(stemGeo, stemMat);
  stemMesh.castShadow = true;
  group.add(stemMesh);

  if (withLeaf) {
    const makeLeaf = (leafLen) => {
      const leafShape = new THREE.Shape();
      leafShape.moveTo(0, 0);
      leafShape.bezierCurveTo(leafLen * 0.26, leafLen * 0.29, leafLen * 0.68, leafLen * 0.27, leafLen, 0);
      leafShape.bezierCurveTo(leafLen * 0.68, -leafLen * 0.27, leafLen * 0.26, -leafLen * 0.29, 0, 0);

      const leafGeo = new THREE.ShapeGeometry(leafShape, 12);
      const lPos = leafGeo.attributes.position;
      for (let i = 0; i < lPos.count; i++) {
        const lx = lPos.getX(i);
        const ly = lPos.getY(i);
        const t = lx / leafLen;
        const archZ = Math.sin(t * Math.PI * 0.88) * leafLen * 0.19 - Math.abs(ly) * 0.18;
        lPos.setZ(i, archZ);
      }
      leafGeo.computeVertexNormals();
      return leafGeo;
    };

    const leafMat = new THREE.MeshStandardMaterial({
      color: '#347c2b',
      roughness: 0.32,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });

    const leafMesh = new THREE.Mesh(makeLeaf(radius * 1.24), leafMat);
    leafMesh.position.set(radius * 0.04, calyxY + radius * 0.2, 0);
    leafMesh.rotation.set(-Math.PI * 0.35, 0.45, 0.28);
    leafMesh.castShadow = true;
    group.add(leafMesh);

    const smallLeaf = new THREE.Mesh(makeLeaf(radius * 0.72), leafMat);
    smallLeaf.position.set(radius * 0.02, calyxY + radius * 0.22, -radius * 0.01);
    smallLeaf.rotation.set(-Math.PI * 0.38, 2.35, 0.22);
    smallLeaf.castShadow = true;
    group.add(smallLeaf);
  }

  return group;
}

/**
 * Evaluates a point on the sculpted Capybara head surface from a unit direction (ux, uy, uz).
 * Exposed as a pure helper so eyes, nostrils, and whiskers sit 100% FLUSH on the exact head contour!
 */
function evalCapybaraHeadPoint(ux, uy, uz) {
  const frontT = Math.max(0, uz);
  const backT = Math.max(0, -uz);

  const z = uz >= 0 ? Math.pow(frontT, 0.8) * 0.72 : -backT * 0.48;

  const boxiness = THREE.MathUtils.smoothstep(z, -0.1, 0.42);
  const rxAbs = Math.abs(ux);
  const ryAbs = Math.abs(uy);
  const xyLen = Math.hypot(ux, uy) || 1;
  const sqNorm = Math.pow(Math.pow(rxAbs, 3.8) + Math.pow(ryAbs, 3.8), 1 / 3.8) || 1;
  const sqFactor = 1.0 + boxiness * (xyLen / sqNorm - 1.0) * 0.7;

  const widthProfile =
    0.375 -
    0.105 * THREE.MathUtils.smoothstep(z, -0.02, 0.64) +
    0.024 * Math.exp(-Math.pow((z + 0.12) / 0.24, 2));
  const tipRound = 1.0 - 0.1 * THREE.MathUtils.smoothstep(z, 0.58, 0.72);

  const x = ux * sqFactor * widthProfile * tipRound;

  const topHeight =
    0.34 -
    0.085 * THREE.MathUtils.smoothstep(z, 0.02, 0.66) -
    0.024 * Math.pow(backT, 1.5);
  const botDepth =
    0.305 -
    0.078 * THREE.MathUtils.smoothstep(z, 0.14, 0.66) +
    0.026 * Math.exp(-Math.pow((z + 0.08) / 0.24, 2));

  let y = uy >= 0 ? uy * sqFactor * topHeight : uy * sqFactor * botDepth;

  // Smooth flat top bridge for classic capybara profile & stable Yuzu cradle
  if (uy > 0.4 && z > -0.25 && z < 0.6) {
    const flatBlend = THREE.MathUtils.smoothstep(uy, 0.4, 0.88) * (1.0 - Math.abs(ux) * 0.52);
    const targetTop = 0.326 - 0.075 * THREE.MathUtils.smoothstep(z, 0.0, 0.64);
    y = THREE.MathUtils.lerp(y, targetTop, flatBlend * 0.62);
  }

  // Subtle soft nestle dimple directly under the Yuzu on top of the head
  const yuzuDist = Math.hypot(x, z + 0.02);
  if (uy > 0.62 && yuzuDist < 0.21) {
    y -= (1.0 - yuzuDist / 0.21) * 0.015;
  }

  // Blunt vertical front plane of the capybara snout
  let zFinal = z;
  if (zFinal > 0.61) {
    zFinal = 0.61 + (zFinal - 0.61) * 0.42;
  }

  return new THREE.Vector3(x, y, zFinal);
}

/**
 * Iconic sculpted Capybara head with zero UV pinching on the face/snout
 * (vertical cylindrical-spherical mapping puts poles cleanly under the Yuzu & under the chin!).
 */
function buildCapybaraHeadGeometry() {
  const geo = new THREE.SphereGeometry(1.0, 64, 48);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const colors = new Float32Array(pos.count * 3);

  const baseCol = new THREE.Color('#ffffff');
  const snoutDark = new THREE.Color('#6a513e');
  const muzzleFront = new THREE.Color('#473324');
  const cheekWarm = new THREE.Color('#ffeedc');
  const crownShadow = new THREE.Color('#8a7059');
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const ux = pos.getX(i);
    const uy = pos.getY(i);
    const uz = pos.getZ(i);

    const p = evalCapybaraHeadPoint(ux, uy, uz);
    pos.setXYZ(i, p.x, p.y, p.z);

    // Clean vertical UVs: zero swirl/pinching on the blunt snout, cheeks, or eyes!
    const az = Math.atan2(ux, uz);
    uv.setXY(i, az / (Math.PI * 2) + 0.5, 0.5 - uy * 0.48);

    const yuzuDist = Math.hypot(p.x, p.z + 0.02);
    tmp.copy(baseCol);
    const muzzleShade = THREE.MathUtils.smoothstep(p.z, 0.28, 0.64);
    tmp.lerp(snoutDark, muzzleShade * 0.48);

    const frontFaceMask =
      THREE.MathUtils.smoothstep(p.z, 0.55, 0.655) *
      (1.0 - THREE.MathUtils.smoothstep(Math.abs(p.x), 0.14, 0.24));
    tmp.lerp(muzzleFront, frontFaceMask * 0.62);

    if (uy < -0.06 && Math.abs(ux) > 0.25 && p.z < 0.35) {
      tmp.lerp(cheekWarm, 0.26);
    }
    if (uy > 0.62 && yuzuDist < 0.21) {
      const ao = Math.pow(1.0 - yuzuDist / 0.21, 1.3) * 0.56;
      tmp.lerp(crownShadow, ao);
    }

    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  uv.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Seamless unified plump barrel torso + thick capybara shoulders & neck!
 */
function buildCapybaraUnifiedBodyGeometry() {
  const geo = new THREE.SphereGeometry(1.0, 56, 40);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const colors = new Float32Array(pos.count * 3);

  const dryCol = new THREE.Color('#ffffff');
  const wetCol = new THREE.Color('#6f5642');
  const warmBack = new THREE.Color('#fff2e4');
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const ux = pos.getX(i);
    const uy = pos.getY(i);
    const uz = pos.getZ(i);

    const z = uz >= 0 ? uz * 0.92 : uz * 1.1;
    const forwardT = THREE.MathUtils.smoothstep(-0.35, 0.88, z);

    const widthProfile =
      0.64 +
      0.065 * Math.sin(uz * 1.4 - 0.45) -
      0.23 * Math.pow(forwardT, 1.3);
    const heightProfile = 0.53 - 0.12 * Math.pow(forwardT, 1.35);

    // Smooth continuous rise from rounded back up into sturdy capybara neck & shoulders
    const spineLift = 0.39 * Math.pow(forwardT, 1.2) - 0.04 * uz * uz;

    let y = uy * heightProfile + spineLift;
    if (uy > 0.38 && z < 0.25) {
      y -= Math.pow(uy - 0.38, 2) * 0.12 * (1.0 - forwardT * 0.75);
    }

    const x = ux * widthProfile;
    pos.setXYZ(i, x, y, z);

    // Smooth planar/cylindrical back UVs so fur flows neatly along the plump back
    uv.setXY(i, x * 0.65 + 0.5, z * 0.62 + 0.5);

    const approxWorldY = -0.06 + y;
    const wetMix = 1.0 - THREE.MathUtils.smoothstep(approxWorldY, -0.03, 0.18);
    tmp.copy(dryCol).lerp(wetCol, wetMix * 0.44);
    if (uy > 0.4 && wetMix < 0.25) {
      tmp.lerp(warmBack, 0.14);
    }
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  uv.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Helper to snap a surface-hugging 3D curve onto the exact sculpted head contour with a tiny outward offset.
 */
function buildHeadSurfaceCurve(dirSamples, outwardOffset = 0.005) {
  const pts = dirSamples.map(([ux, uy, uz]) => {
    const dir = new THREE.Vector3(ux, uy, uz).normalize();
    const p = evalCapybaraHeadPoint(dir.x, dir.y, dir.z);
    // Nudge slightly along outward radial direction so tube kisses the fur cleanly without sinking or floating!
    return p.addScaledVector(dir, outwardOffset);
  });
  return new THREE.CatmullRomCurve3(pts);
}

/**
 * Creates the Hero Capybara relaxing blissfully in the snowy open-air hot spring with a Yuzu on its head!
 */
export function createCapybara(textures) {
  const root = new THREE.Group();
  root.name = 'Capybara';
  root.position.set(0.0, -0.07, 0.12);
  root.rotation.y = 0.36;

  const furVertexMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    vertexColors: true,
    map: textures.fur.map,
    bumpMap: textures.fur.bumpMap,
    bumpScale: 0.022,
    roughness: 0.91,
    metalness: 0.01,
  });

  const furMatchingMat = new THREE.MeshStandardMaterial({
    color: '#efe3d6',
    map: textures.fur.map,
    bumpMap: textures.fur.bumpMap,
    bumpScale: 0.02,
    roughness: 0.91,
    metalness: 0.01,
  });

  const earOuterMat = new THREE.MeshStandardMaterial({
    color: '#5a3d27',
    map: textures.fur.map,
    bumpMap: textures.fur.bumpMap,
    bumpScale: 0.014,
    roughness: 0.88,
  });

  const innerEarMat = new THREE.MeshStandardMaterial({
    color: '#8f675b',
    roughness: 0.85,
  });

  const darkDetailMat = new THREE.MeshStandardMaterial({
    color: '#1f130c',
    roughness: 0.44,
    metalness: 0.04,
  });

  const lidCreaseMat = new THREE.MeshStandardMaterial({
    color: '#6d4d35',
    map: textures.fur.map,
    roughness: 0.9,
  });

  const pawMat = new THREE.MeshStandardMaterial({
    color: '#674a34',
    map: textures.fur.map,
    roughness: 0.88,
  });

  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // 1. Seamless Unified Plump Barrel Torso + Sturdy Neck/Shoulders
  const torsoMesh = new THREE.Mesh(buildCapybaraUnifiedBodyGeometry(), furVertexMat);
  torsoMesh.position.set(0, 0.0, -0.18);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  bodyPivot.add(torsoMesh);

  // 2. Cute stubby forearms & paws tucked comfortably just beneath the warm water surface
  for (const side of [-1, 1]) {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.28, -0.09, 0.42);
    legGroup.rotation.set(0.62, side * -0.16, side * 0.06);

    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.24, 8, 16), furMatchingMat);
    arm.castShadow = true;
    arm.receiveShadow = true;
    legGroup.add(arm);

    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), pawMat);
    paw.scale.set(0.92, 0.62, 1.24);
    paw.position.set(0, -0.18, 0.05);
    legGroup.add(paw);

    bodyPivot.add(legGroup);
  }

  // 3. Sculpted Boxy Capybara Head sitting seamlessly atop the thick neck/shoulders
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.49, 0.47);
  headGroup.rotation.x = 0.04;
  bodyPivot.add(headGroup);

  const headMesh = new THREE.Mesh(buildCapybaraHeadGeometry(), furVertexMat);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headGroup.add(headMesh);

  // 4. High-set small rounded cupped Capybara ears
  const ears = [];
  for (const side of [-1, 1]) {
    const earPivot = new THREE.Group();
    earPivot.position.set(side * 0.242, 0.245, -0.22);
    earPivot.rotation.set(-0.22, side * 0.48, side * -0.3);

    const outerEarGeo = new THREE.SphereGeometry(0.104, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.82);
    outerEarGeo.scale(0.84, 1.04, 0.56);
    const outerEar = new THREE.Mesh(outerEarGeo, earOuterMat);
    outerEar.position.set(0, 0.036, 0);
    outerEar.castShadow = true;
    earPivot.add(outerEar);

    const innerEar = new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 10), innerEarMat);
    innerEar.scale.set(0.76, 0.9, 0.34);
    innerEar.position.set(0, 0.032, 0.034);
    earPivot.add(innerEar);

    headGroup.add(earPivot);
    ears.push({ pivot: earPivot, side, baseRotZ: side * -0.3 });
  }

  // 5. Signature Flush Blissful Zen Capybara Eyes (うっとり細目)
  // Compact, softly tapered serene eye-slit hugging the exact head contour (with rounded tips!)
  const eyePairs = [];
  for (const side of [-1, 1]) {
    const slitCurve = buildHeadSurfaceCurve(
      [
        [side * 0.84, 0.395, 0.21],
        [side * 0.815, 0.418, 0.31],
        [side * 0.78, 0.412, 0.39],
        [side * 0.745, 0.382, 0.46],
      ],
      0.003
    );
    const eyeGeo = new THREE.TubeGeometry(slitCurve, 18, 0.0135, 10, false);
    // Gently taper tube radius toward both ends so the closed zen eye has soft organic tips
    const ePos = eyeGeo.attributes.position;
    const eUv = eyeGeo.attributes.uv;
    for (let i = 0; i < ePos.count; i++) {
      const u = Math.min(1, Math.max(0, eUv.getX(i)));
      const center = slitCurve.getPoint(u);
      const taper = Math.pow(Math.sin(u * Math.PI), 0.45);
      ePos.setXYZ(
        i,
        center.x + (ePos.getX(i) - center.x) * taper,
        center.y + (ePos.getY(i) - center.y) * taper,
        center.z + (ePos.getZ(i) - center.z) * taper
      );
    }
    eyeGeo.computeVertexNormals();
    const eyeSlit = new THREE.Mesh(eyeGeo, darkDetailMat);
    headGroup.add(eyeSlit);

    // Very subtle soft-toned fur shadow right under the outer eye corner (not a harsh second dark bar)
    const underCurve = buildHeadSurfaceCurve(
      [
        [side * 0.835, 0.345, 0.24],
        [side * 0.805, 0.352, 0.33],
        [side * 0.765, 0.34, 0.42],
      ],
      0.001
    );
    const underLid = new THREE.Mesh(
      new THREE.TubeGeometry(underCurve, 10, 0.004, 6, false),
      lidCreaseMat
    );
    headGroup.add(underLid);

    eyePairs.push({ eyeSlit });
  }

  // 6. Small Neat Recessed Capybara Nostrils (flush on blunt front plane, subtle & natural!)
  for (const side of [-1, 1]) {
    const nDir = new THREE.Vector3(side * 0.29, 0.12, 0.95).normalize();
    const nPos = evalCapybaraHeadPoint(nDir.x, nDir.y, nDir.z).addScaledVector(nDir, 0.002);
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 10), darkDetailMat);
    nostril.scale.set(1.3, 0.62, 0.4);
    nostril.position.copy(nPos);
    nostril.rotation.set(0.08, side * 0.32, side * -0.28);
    headGroup.add(nostril);
  }

  // Subtle vertical philtrum & gentle curved cleft lip resting flush against the blunt front muzzle
  const philtrumCurve = buildHeadSurfaceCurve(
    [
      [0, 0.03, 1.0],
      [0, -0.22, 0.98],
    ],
    0.003
  );
  headGroup.add(new THREE.Mesh(new THREE.TubeGeometry(philtrumCurve, 6, 0.0075, 6, false), darkDetailMat));

  const smileCurve = buildHeadSurfaceCurve(
    [
      [-0.4, -0.27, 0.87],
      [-0.2, -0.32, 0.93],
      [0.0, -0.22, 0.98],
      [0.2, -0.32, 0.93],
      [0.4, -0.27, 0.87],
    ],
    0.003
  );
  headGroup.add(new THREE.Mesh(new THREE.TubeGeometry(smileCurve, 20, 0.0075, 6, false), darkDetailMat));

  // Delicate dark capybara whiskers on both sides of the boxy muzzle
  const whiskerMat = new THREE.MeshBasicMaterial({ color: '#2b1e16' });
  for (const side of [-1, 1]) {
    const offsets = [
      { y: -0.004, z: 0.54, len: 0.14, droop: -0.016 },
      { y: -0.036, z: 0.52, len: 0.165, droop: -0.026 },
      { y: -0.068, z: 0.49, len: 0.145, droop: -0.034 },
    ];
    for (const w of offsets) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.222, w.y, w.z),
        new THREE.Vector3(side * (0.222 + w.len * 0.55), w.y + w.droop * 0.35, w.z - 0.02),
        new THREE.Vector3(side * (0.222 + w.len), w.y + w.droop, w.z - 0.06),
      ]);
      headGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 6, 0.0026, 4, false), whiskerMat));
    }
  }

  // 7. THE HERO YUZU perched snugly right in the crown dimple of the capybara's head!
  const yuzuPivot = new THREE.Group();
  yuzuPivot.position.set(0.0, 0.456, -0.02);
  yuzuPivot.rotation.set(0.04, 0.24, -0.03);
  const heroYuzu = createYuzuMesh({
    radius: 0.195,
    withLeaf: true,
    yuzuTextures: textures.yuzu,
  });
  yuzuPivot.add(heroYuzu);
  headGroup.add(yuzuPivot);

  return {
    group: root,
    worldPos: root.position,
    update(time) {
      const breath = Math.sin(time * 1.15);
      const slowSway = Math.sin(time * 0.52);

      bodyPivot.position.y = breath * 0.02;
      bodyPivot.rotation.z = slowSway * 0.014;
      bodyPivot.rotation.x = Math.sin(time * 0.85) * 0.009;

      headGroup.rotation.x = 0.04 + Math.sin(time * 1.15 - 0.45) * 0.022;
      headGroup.rotation.y = Math.sin(time * 0.42) * 0.038;

      yuzuPivot.rotation.z = -0.03 - slowSway * 0.015;
      yuzuPivot.rotation.x = 0.04 - Math.sin(time * 1.15 - 0.8) * 0.01;

      const blinkCycle = time % 7.2;
      const squeeze =
        blinkCycle > 6.3 && blinkCycle < 6.95
          ? Math.sin(((blinkCycle - 6.3) / 0.65) * Math.PI) * 0.18
          : 0;
      for (const ep of eyePairs) {
        ep.eyeSlit.scale.y = 1.0 - squeeze;
      }

      const twitchCycle = time % 9.5;
      const twitch =
        twitchCycle > 8.6 && twitchCycle < 9.0
          ? Math.sin(((twitchCycle - 8.6) / 0.4) * Math.PI * 2) * 0.13
          : 0;
      for (const ear of ears) {
        ear.pivot.rotation.z =
          ear.baseRotZ + (ear.side > 0 ? twitch : twitch * 0.35) + Math.sin(time * 0.7) * 0.02;
      }
    },
  };
}
