#!/usr/bin/env node
/* ブラウザなしで物理まわりを検証するスクリプト。
 *   node tools/sim-test.js [stage=1] [vcap=8] [load=auto|rope|smart|click|clickrope|none] [mode=cap|full|careful|pro]
 *   click は「荷札を上から順にクリックした」積み方（ゲーム内の自動配置と同じ）
 * 例: node tools/sim-test.js 2 10 auto
 */
'use strict';
const path = require('path');
globalThis.planck = require(path.join(__dirname, '../vendor/planck.min.js'));
for (const f of ['core', 'gfx', 'items', 'truck', 'course', 'sim']) require(path.join(__dirname, '../js', f + '.js'));
const KT = globalThis.KT;
// 環境変数でパラメータを上書きして比較できるようにする
for (const [k, v] of Object.entries(process.env)) {
  if (k.startsWith('SPEC_')) KT.TRUCK_SPEC[k.slice(5)] = +v;
  if (k.startsWith('CONST_')) KT.CONST[k.slice(6)] = +v;
}

/**
 * 人が考えて積むときに近い「ちょっと賢い」自動積み（検証専用）
 * - 重くて丈夫な物 → 布団 → ワレモノ（高い順）→ 残り の順に置く
 * - 置こうとしている物より弱い物の上には置かない（潰れ防止）
 * - ワレモノは布団の上を優先し、ルール違反の向きは使わない
 */
function smartLoad(sim) {
  const S = KT.TRUCK_SPEC;
  const pl = planck;
  const frag = (it) => it.def.tags.includes('fragile');
  const cush = (it) => it.def.tags.includes('cushion');
  const items = sim.items.filter((it) => it.state === 'tray');
  const order = [
    ...items.filter((it) => !frag(it) && !cush(it)).sort((a, b) => b.def.mass - a.def.mass),
    ...items.filter(cush),
    ...items.filter(frag).sort((a, b) => b.def.value - a.def.value),
  ];
  const below = (it, x, y, ang) => {
    // 置いた位置のすぐ下にある荷物を集める
    const xf = new pl.Transform(pl.Vec2(x, y), ang);
    const aabb = new pl.AABB();
    let first = true;
    for (let f = it.body.getFixtureList(); f; f = f.getNext()) {
      const tmp = new pl.AABB();
      f.getShape().computeAABB(tmp, xf, 0);
      if (first) { aabb.set(tmp); first = false; } else aabb.combine(aabb, tmp);
    }
    const probe = new pl.AABB(pl.Vec2(aabb.lowerBound.x + 0.03, aabb.lowerBound.y - 0.06), pl.Vec2(aabb.upperBound.x - 0.03, aabb.lowerBound.y + 0.02));
    const found = new Set();
    sim.world.queryAABB(probe, (fx) => { const ud = fx.getUserData(); if (ud && ud.kind === 'item' && ud.inst !== it) found.add(ud.inst); return true; });
    return [...found];
  };
  for (const it of order) {
    let best = null;
    const rule = it.def.tags.includes('noTilt') || it.def.tags.includes('tenchi');
    for (const ang of rule ? [0] : [0, Math.PI / 2]) {
      const w0 = ang ? it.def.h : it.def.w;
      const h0 = ang ? it.def.w : it.def.h;
      for (let lx = S.bedX0 + 0.06; lx <= S.bedX1 - 0.04; lx += 0.04) {
        const w = sim.truck.toWorld(lx, S.bedTop + 0.05);
        const pos = sim.findPlacement(it, w.x, w.y, ang + sim.truck.angle);
        if (!pos) continue;
        const lp = sim.truck.toLocal(pl.Vec2(pos.x, pos.y));
        if (lp.x - w0 / 2 < S.bedX0 - 0.02 || lp.x + w0 / 2 > S.bedX1 + 0.03) continue;
        const under = below(it, pos.x, pos.y, ang + sim.truck.angle);
        let penalty = 0;
        for (const u of under) if (u.def.crush < it.def.mass * 9.8 * 2.2 + (u.load || 0)) penalty += 5;
        let bonus = 0;
        if (frag(it) && under.some(cush)) bonus += 0.6;
        const top = lp.y + h0 / 2;
        const score = top + lp.y * 0.4 - lp.x * 0.03 + penalty - bonus + (ang ? 0.05 : 0);
        if (!best || score < best.score) best = { score, x: pos.x, y: pos.y, ang: ang + sim.truck.angle };
      }
    }
    if (best && best.score < 4) {
      sim.placeItem(it, best.x, best.y + 0.004, best.ang);
      for (let i = 0; i < 70; i++) sim.fixedStep(KT.CONST.DT);
    }
  }
}

function run(stageId, vcap, load, mode, verbose) {
  const stage = KT.STAGES[stageId - 1];
  const sim = new KT.Sim(stage);
  // 静止状態を少し流す（SEED でわずかにずらして、結果のばらつきを見られるようにする）
  const seed = +(process.env.SEED || 0);
  for (let i = 0; i < 120 + seed * 7; i++) sim.fixedStep(KT.CONST.DT);
  const restY = sim.truck.chassis.getPosition().y;
  // SKIP=id,id で指定した荷物は積まない（積み残す）
  const skip = (process.env.SKIP || '').split(',').filter(Boolean);
  for (const id of skip) {
    const it = sim.items.find((i) => i.id === id && i.state === 'tray');
    if (it) it.state = 'skip';
  }
  if (load === 'auto' || load === 'rope') sim.autoLoad({ angles: [0] });
  if (load === 'smart') smartLoad(sim);
  if (load === 'click' || load === 'clickrope') sim.clickLoad();
  for (const it of sim.items) if (it.state === 'skip') it.state = 'tray';
  if (load === 'rope' || load === 'smart' || load === 'clickrope') {
    for (let i = 0; i < 90; i++) sim.fixedStep(KT.CONST.DT);
    // 上のほうにある荷物から、近いフックへロープを掛ける
    const tops = sim.placedItems().map((it) => {
      const lp = sim.truck.toLocal(it.body.getPosition());
      return { it, top: lp.y + it.def.h / 2 };
    }).sort((a, b) => b.top - a.top);
    for (const { it } of tops) {
      if (sim.ropesLeft <= 0) break;
      const local = { x: 0, y: it.def.h * 0.35 };
      const wp = it.body.getWorldPoint(planck.Vec2(local.x, local.y));
      let best = 0, bd = 1e9;
      KT.TRUCK_HOOKS.forEach((h, i) => {
        const hp = sim.truck.hookWorld(i);
        const d = Math.hypot(hp.x - wp.x, hp.y - wp.y);
        if (d < bd) { bd = d; best = i; }
      });
      sim.addRope(it, local, best);
    }
  }
  for (let i = 0; i < 240; i++) sim.fixedStep(KT.CONST.DT);
  const placed = sim.placedItems().length;
  const loadedY = sim.truck.chassis.getPosition().y;
  // 積み込み中に壊れていないか
  sim.startDrive();
  const DT = KT.CONST.DT;
  let t = 0;
  let maxTilt = 0;
  let rescues = 0;
  const course = sim.course;
  const log = [];
  while (sim.phase !== 'done' && t < 400) {
    const v = sim.truck.forwardSpeed();
    const x = sim.truck.pos.x;
    let cap = vcap;
    if (mode === 'pro') {
      for (const f of course.features) {
        if (!['stepUp', 'stepDown', 'bump', 'rail', 'plate', 'pothole', 'stairs', 'gravel', 'bridge'].includes(f.type)) continue;
        const d = f.x - (x + 1.2);
        const end = f.x + (f.len || (f.x1 ? f.x1 - f.x : 0) || (f.n ? f.n * f.run : 0)) + 2.5;
        const slow = Math.abs(f.h || 0) >= 0.12 ? 1.4 : 3.6; // 大きな段差（看板が「大きな段差」になるもの）は這うように
        if (d < 22 && x - 1.2 < end) cap = Math.min(cap, slow + Math.max(0, d) * 0.28);
      }
    }
    if (mode === 'careful') {
      // 段差の手前だけ減速する
      for (const f of course.features) {
        if (['stepUp', 'stepDown', 'bump', 'rail', 'plate', 'pothole', 'stairs'].includes(f.type) && f.x - x < 9 && f.x - x > -3) cap = Math.min(cap, 3.2);
      }
    }
    if (mode === 'pro') {
      sim.input.throttle = v < cap - 0.4;
      sim.input.brake = v > cap + 0.5;
    } else {
      sim.input.throttle = mode === 'full' ? true : v < cap - 0.3;
      sim.input.brake = mode !== 'full' && v > cap + 1.2;
    }
    sim.fixedStep(DT);
    t += DT;
    maxTilt = Math.max(maxTilt, Math.abs(KT.normAngle(sim.truck.angle)));
    if ((sim.flipped || sim.stuck) && rescues < 5) {
      log.push(`  ! ${sim.flipped ? 'flipped' : 'stuck'} at x=${x.toFixed(1)} t=${t.toFixed(1)}`);
      sim.rescue();
      rescues++;
    }
    for (const e of sim.events) {
      if (verbose && ['break', 'fall', 'snap'].includes(e.type)) log.push(`  ${e.type} ${e.inst ? e.inst.def.name : ''} @x=${x.toFixed(1)} t=${t.toFixed(1)}`);
    }
    sim.events.length = 0;
  }
  const res = sim.evaluate();
  return { sim, res, t, maxTilt, placed, restY, loadedY, log };
}

const args = process.argv.slice(2);
const stageId = +(args[0] || 1);
const vcap = +(args[1] || 8);
const load = args[2] || 'auto';
const mode = args[3] || 'cap';
const { sim, res, t, maxTilt, placed, restY, loadedY, log } = run(stageId, vcap, load, mode, true);
console.log(`stage ${stageId} vcap=${vcap} load=${load} mode=${mode}`);
console.log(`  placed ${placed}/${sim.items.length}  loadMass=${sim.loadMass}kg  chassisY rest=${restY.toFixed(3)} loaded=${loadedY.toFixed(3)}`);
console.log(`  time=${res.time.toFixed(1)}s (target ${sim.stage.targetTime}) simT=${t.toFixed(1)} maxSpeed=${(sim.maxSpeed * 3.6).toFixed(0)}km/h maxTilt=${(maxTilt * 57.3).toFixed(0)}° rescues=${res.rescues} phase=${sim.phase}`);
log.forEach((l) => console.log(l));
for (const it of sim.items) {
  console.log(`  - ${it.def.name.padEnd(10, '　')} ${it.state.padEnd(7)} hp=${it.hp.toFixed(0).padStart(3)} imp=${it.dmgImpact.toFixed(0)} crush=${it.dmgCrush.toFixed(0)} tilt=${it.tiltTime.toFixed(1)} up=${it.upsideTime.toFixed(1)}`);
}
console.log(`  counts ${JSON.stringify(res.counts)}`);
console.log(`  profit ${res.profit} rank ${res.rank}`);
res.costs.forEach((c) => console.log(`    -${c.yen} ${c.label}`));
res.income.forEach((c) => console.log(`    +${c.yen} ${c.label}`));
