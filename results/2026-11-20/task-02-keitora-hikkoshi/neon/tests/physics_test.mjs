import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const itemsMod = require('../js/items.js');
const stagesMod = require('../js/stages.js');
const physMod = require('../js/physics.js');

const { getItemDef, getDamageState } = itemsMod;
const { getStage, createTerrain, calculateSettlement } = stagesMod;
const { PhysicsWorld, localToWorld } = physMod;

function runSteps(world, seconds, inputFn) {
  const dt = 1 / 60;
  const steps = Math.round(seconds / dt);
  const allEvents = [];
  for (let i = 0; i < steps; i++) {
    const inp = typeof inputFn === 'function' ? inputFn(i * dt) : inputFn;
    world.step(dt, inp || {});
    allEvents.push(...world.consumeEvents());
  }
  return allEvents;
}

console.log('--- Test 1: Truck static settle & suspension sag with rear load ---');
{
  const stage = getStage(1);
  const terrain = createTerrain(stage);
  const world = new PhysicsWorld(terrain);
  world.phase = 'loading';
  runSteps(world, 1.5);
  const idleY = world.truck.y;
  const idleAngle = world.truck.angle;
  assert.ok(idleY > 0.55 && idleY < 0.85, `Expected realistic truck height, got ${idleY}`);
  assert.ok(Math.abs(idleAngle) < 0.03, `Expected flat unloaded truck, got ${idleAngle}`);

  const fridge = getItemDef('fridge');
  const posRear = localToWorld(world.truck, -1.25, fridge.h * 0.5 + 0.04);
  world.addCargo(fridge, posRear.x, posRear.y, 0, 0);
  runSteps(world, 1.8);
  assert.ok(world.truck.angle > 0.02, `Rear heavy load should tilt nose up (angle>0.02), got ${world.truck.angle}`);
  assert.ok(world.truck.wheels[0].comp > world.truck.wheels[1].comp, 'Rear wheel should compress more than front wheel');
  console.log(`  PASS: idleY=${idleY.toFixed(3)}, loadedRearAngle=${(world.truck.angle * 180 / Math.PI).toFixed(2)}deg`);
}

console.log('--- Test 2: Tall 4-item vertical stack stability during loading ---');
{
  const stage = getStage(1);
  const terrain = createTerrain(stage);
  const world = new PhysicsWorld(terrain);
  world.phase = 'loading';
  runSteps(world, 0.8);

  const stackIds = ['washer', 'box_books', 'microwave', 'futon'];
  let curLocalY = 0.01;
  const bodies = [];
  for (let i = 0; i < stackIds.length; i++) {
    const def = getItemDef(stackIds[i]);
    const p = localToWorld(world.truck, -0.5, curLocalY + def.h * 0.5 + 0.02);
    const b = world.addCargo(def, p.x, p.y, 0, i);
    bodies.push(b);
    runSteps(world, 0.7);
    curLocalY += def.h;
  }
  runSteps(world, 2.0);
  for (const b of bodies) {
    assert.ok(!b.dropped, `${b.def.name} should stay on bed`);
    assert.ok(Math.abs(b.vx) < 0.15 && Math.abs(b.vy) < 0.15, `${b.def.name} should settle smoothly, v=(${b.vx},${b.vy})`);
    assert.ok(Math.abs(b.angle) < 0.18, `${b.def.name} should remain upright, ang=${b.angle}`);
  }
  console.log('  PASS: 4-tier stack settled cleanly without jitter or collapse');
}

console.log('--- Test 3: Packing order matters (Heavy fridge on top of fragile TV crushes TV!) ---');
{
  const stage = getStage(1);
  const terrain = createTerrain(stage);
  const world = new PhysicsWorld(terrain);
  world.phase = 'loading';
  runSteps(world, 0.6);

  const tvDef = getItemDef('tv');
  const fridgeDef = getItemDef('fridge');
  const pTv = localToWorld(world.truck, -0.3, tvDef.h * 0.5 + 0.02);
  const tv = world.addCargo(tvDef, pTv.x, pTv.y, 0, 0);
  runSteps(world, 0.6);

  const pFridge = localToWorld(world.truck, -0.3, tvDef.h + fridgeDef.h * 0.5 + 0.04);
  world.addCargo(fridgeDef, pFridge.x, pFridge.y, 0, 1);
  runSteps(world, 0.8);

  world.phase = 'driving';
  const ev = runSteps(world, 4.0, { throttle: 0.25 });
  assert.ok(tv.hp < 72, `Fridge on top of TV must crush TV into damaged state (hp < 72), got hp=${tv.hp}`);
  assert.ok(tv.smoothedTopLoad > tvDef.crushLimit, `Smoothed topLoad (${tv.smoothedTopLoad}) should exceed TV crushLimit (${tvDef.crushLimit})`);
  assert.ok(ev.some((e) => e.type === 'crush'), 'Should emit crush event');
  console.log(`  PASS: TV crushed under fridge -> hp=${tv.hp.toFixed(1)}, topLoad=${tv.smoothedTopLoad.toFixed(1)}`);
}

console.log('--- Test 4: Good packing + careful driving reaches Goal on Stage 1 intact! ---');
{
  const stage = getStage(1);
  const terrain = createTerrain(stage);
  const world = new PhysicsWorld(terrain);
  world.phase = 'loading';
  runSteps(world, 0.6);

  const washer = getItemDef('washer');
  const books = getItemDef('box_books');
  const futon = getItemDef('futon');
  const tv = getItemDef('tv');

  const pW = localToWorld(world.truck, 0.02, washer.h * 0.5 + 0.02);
  const bW = world.addCargo(washer, pW.x, pW.y, 0, 0);
  const pB = localToWorld(world.truck, -0.62, books.h * 0.5 + 0.02);
  world.addCargo(books, pB.x, pB.y, 0, 1);
  runSteps(world, 0.6);

  const pF = localToWorld(world.truck, -0.58, books.h + futon.h * 0.5 + 0.03);
  world.addCargo(futon, pF.x, pF.y, 0, 2);
  runSteps(world, 0.6);

  const pT = localToWorld(world.truck, -0.55, books.h + futon.h + tv.h * 0.5 + 0.03);
  const bT = world.addCargo(tv, pT.x, pT.y, 0, 3);
  runSteps(world, 0.8);

  world.addRope(world.truck, { x: 0.36, y: 1.10 }, bT, { x: 0.2, y: 0.1 }, 160);
  world.addRope(world.truck, { x: -1.66, y: 0.36 }, bT, { x: -0.2, y: 0.1 }, 160);

  world.phase = 'driving';
  let reached = false;
  for (let sec = 0; sec < 70; sec++) {
    runSteps(world, 1.0, () => ({
      throttle: world.truck.vx < 6.8 ? 0.72 : 0.1,
      brake: world.truck.vx > 8.5 ? 0.35 : 0,
    }));
    if (world.truck.x >= stage.distance) {
      reached = true;
      break;
    }
  }
  assert.ok(reached, `Truck should easily reach Stage 1 goal (${stage.distance}m), stopped at x=${world.truck.x.toFixed(1)}`);
  assert.ok(!bT.dropped && bT.hp >= 72, `Cushioned & strapped TV driven carefully should survive intact! hp=${bT.hp}, dropped=${bT.dropped}`);
  assert.ok(!bW.dropped && bW.hp >= 72, `Washer should survive intact! hp=${bW.hp}`);
  console.log(`  PASS: Reached ${world.truck.x.toFixed(1)}m; TV hp=${bT.hp.toFixed(1)}, Washer hp=${bW.hp.toFixed(1)}, Ropes intact=${world.ropes.filter(r => !r.snapped).length}/2`);
}

console.log('--- Test 5: Reckless driving with loose cargo causes drops/damage & impacts settlement ---');
{
  const stage = getStage(2);
  const terrain = createTerrain(stage);
  const world = new PhysicsWorld(terrain);
  world.phase = 'loading';
  runSteps(world, 0.6);

  const fridge = getItemDef('fridge');
  const plant = getItemDef('plant');
  const pF = localToWorld(world.truck, -1.30, fridge.h * 0.5 + 0.02);
  world.addCargo(fridge, pF.x, pF.y, 0, 0);
  runSteps(world, 0.5);
  const pP = localToWorld(world.truck, -1.30, fridge.h + plant.h * 0.5 + 0.03);
  const bP = world.addCargo(plant, pP.x, pP.y, 0, 1);
  runSteps(world, 0.6);

  world.phase = 'driving';
  runSteps(world, 15.0, { throttle: 1.0, brake: 0 });
  const hurtOrDropped = bP.dropped || bP.hp < 72;
  assert.ok(hurtOrDropped, `Unstrapped plant atop rear fridge at full throttle should fall or break! hp=${bP.hp}, dropped=${bP.dropped}`);
  console.log(`  PASS: Reckless run -> plant dropped=${bP.dropped}, hp=${bP.hp.toFixed(1)}`);
}

console.log('--- Test 6: Steep Stage 3 climbability under heavy load ---');
{
  const stage = getStage(3);
  const terrain = createTerrain(stage);
  const world = new PhysicsWorld(terrain);
  world.phase = 'loading';
  runSteps(world, 0.5);

  const f = getItemDef('fridge');
  const t = getItemDef('tansu');
  const w = getItemDef('washer');
  world.addCargo(f, localToWorld(world.truck, 0.04, f.h * 0.5 + 0.02).x, localToWorld(world.truck, 0.04, f.h * 0.5 + 0.02).y, 0, 0);
  world.addCargo(t, localToWorld(world.truck, -0.72, t.h * 0.5 + 0.02).x, localToWorld(world.truck, -0.72, t.h * 0.5 + 0.02).y, 0, 1);
  world.addCargo(w, localToWorld(world.truck, -0.1, f.h + w.h * 0.5 + 0.05).x, localToWorld(world.truck, -0.1, f.h + w.h * 0.5 + 0.05).y, 0, 2);
  runSteps(world, 0.8);

  world.phase = 'driving';
  world.truck.x = 135;
  world.truck.y = terrain.heightAt(135) + 0.8;
  for (const c of world.cargo) { c.x += 135; c.y += terrain.heightAt(135); }
  runSteps(world, 22.0, { throttle: 0.85, brake: 0 });
  assert.ok(world.truck.x > 235, `Heavily loaded Kei Truck must climb Stage 3 mountain pass past x=235, reached x=${world.truck.x.toFixed(1)}`);
  console.log(`  PASS: Climbed Stage 3 pass easily -> reached x=${world.truck.x.toFixed(1)}m`);
}

console.log('--- Test 7: Settlement calculation logic (Perfect S vs Broken/Dropped D) ---');
{
  const stage = getStage(1);
  const defs = stage.items.map(getItemDef);

  const perfectReport = defs.map((def) => ({ def, loaded: true, dropped: false, hp: 100, state: 'intact' }));
  const resS = calculateSettlement(perfectReport, {
    stage,
    reachedGoal: true,
    flipped: false,
    timeUp: false,
    remainingTime: 30,
    ropesUnused: 1,
    ropesSnapped: 0,
  });
  assert.equal(resS.rank, 'S');
  assert.equal(resS.stampText, '神業職人');
  assert.equal(resS.allDeliveredIntact, true);
  assert.ok(resS.perfectBonus > 0 && resS.finalTotal > 85000);

  const disasterReport = defs.map((def, i) => ({
    def,
    loaded: true,
    dropped: i % 2 === 0,
    hp: 0,
    state: getDamageState(0),
  }));
  const resD = calculateSettlement(disasterReport, {
    stage,
    reachedGoal: true,
    flipped: false,
    timeUp: false,
    remainingTime: 10,
    ropesUnused: 0,
    ropesSnapped: 2,
  });
  assert.equal(resD.rank, 'D');
  assert.equal(resD.stampText, '大赤字！');
  assert.ok(resD.finalTotal < 0, `All dropped/broken should yield negative net payout (赤字!), got ${resD.finalTotal}`);
  console.log(`  PASS: Perfect S=¥${resS.finalTotal.toLocaleString()}, Disaster D=¥${resD.finalTotal.toLocaleString()}`);
}

console.log('--- Test 8: Drop landing predictor & Futon cushion protection ---');
{
  const stage = getStage(1);
  const terrain = createTerrain(stage);
  const world = new PhysicsWorld(terrain);
  world.phase = 'loading';
  runSteps(world, 0.8);

  const futon = getItemDef('futon');
  const tv = getItemDef('tv');
  const bedCenter = localToWorld(world.truck, -0.5, 1.8);
  const landingEmpty = world.computeDropLandingY(bedCenter.x, bedCenter.y, world.truck.angle, futon.w, futon.h, null);
  assert.ok(landingEmpty < bedCenter.y - 0.5, `Landing Y (${landingEmpty}) should project down to bed surface`);

  const pF = localToWorld(world.truck, -0.5, futon.h * 0.5 + 0.02);
  world.addCargo(futon, pF.x, pF.y, 0, 0);
  runSteps(world, 0.6);

  const landingOnFuton = world.computeDropLandingY(bedCenter.x, bedCenter.y, world.truck.angle, tv.w, tv.h, null);
  assert.ok(landingOnFuton > landingEmpty + 0.25, `Landing on futon (${landingOnFuton}) should be higher than empty bed (${landingEmpty})`);

  // Drop TV from 0.45m onto futon in driving phase -> cushioned!
  world.phase = 'driving';
  const pT = localToWorld(world.truck, -0.5, futon.h + tv.h * 0.5 + 0.45);
  const bTv = world.addCargo(tv, pT.x, pT.y, 0, 1);
  const ev = runSteps(world, 1.0, {});
  assert.ok(bTv.hp >= 90, `Futon cushion should protect TV from 0.45m drop, got hp=${bTv.hp}`);
  assert.ok(ev.some((e) => e.type === 'cushioned'), 'Should emit cushioned event when futon saves TV');
  console.log(`  PASS: landingEmpty=${landingEmpty.toFixed(2)}, landingOnFuton=${landingOnFuton.toFixed(2)}, TV hp=${bTv.hp.toFixed(1)}`);
}

console.log('\nALL PHYSICS & SETTLEMENT TESTS PASSED!');
