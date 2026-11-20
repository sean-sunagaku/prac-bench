// シミュレーションが本文の説明どおりに動くかを確かめる自動チェック：node tools/check.js
const { Sim, WaveXCorr, KMH, mulberry32 } = require('../src/engine.js');
let fails = 0;
function ok(cond, label, detail) {
  console.log(`${cond ? 'OK  ' : 'NG  '} ${label}${detail ? '  — ' + detail : ''}`);
  if (!cond) fails++;
}
const ring = (n, params, seed) => new Sim({ ring: true, length: 1000, n, params, seed });

// 1) きっかけがなければ、等間隔の流れは崩れない
{
  const s = ring(30);
  while (s.t < 1200) s.step();
  ok(s.speedStd() < 1e-9 && s.stopEvents === 0, 'ブレーキを踏ませなければ20分たっても等間隔のまま', `速さのばらつき ${s.speedStd().toExponential(1)} m/s`);
}

// 2) 1回のブレーキ（1.4秒・約15km/h減速）で渋滞になるかどうかの分かれ目
const firstStop = {};
for (const n of [20, 22, 24, 26, 28, 30, 34]) {
  const s = ring(n);
  s.brake(0, 3.0, 1.4);
  let f = null;
  while (s.t < 300) { s.step(); if (f == null && s.minSpeed() < 0.4) f = s.t; }
  firstStop[n] = f;
}
console.log('     1kmあたりの台数ごとの「最初に止まる車が出るまで」:', Object.entries(firstStop).map(([n, f]) => `${n}台:${f == null ? 'なし' : f.toFixed(0) + '秒'}`).join(' '));
ok([20, 22, 24].every((n) => firstStop[n] == null), '24台/km以下では、1回のブレーキで止まる車は出ない（5分間）');
ok([26, 28, 30, 34].every((n) => firstStop[n] != null && firstStop[n] < 120), '26台/km以上では、1回のブレーキで2分以内に止まる車が出る');

// 3) ヒーロー（30台）：短いタップ（1.2秒のブレーキ）でも1分以内に止まる車が出る
{
  const s = ring(30);
  const v0 = s.v[21];
  let vmin = v0;
  s.brake(21, 3.0, 1.2);
  let f = null;
  while (s.t < 90) { s.step(); if (s.t < 4) vmin = Math.min(vmin, s.v[21]); if (f == null && s.minSpeed() < 0.4) f = s.t; }
  ok(f != null && f < 60, 'ヒーロー：1.2秒のブレーキ（−' + Math.round((v0 - vmin) * KMH) + 'km/h）で1分以内に止まる車が出る', f == null ? 'なし' : `${f.toFixed(0)}秒後`);
}

// 4) 渋滞の波は後ろへ時速15〜24kmで進む（相互相関で測定、中央値）
for (const n of [28, 30, 34]) {
  const s = ring(n);
  const m = new WaveXCorr(s);
  s.brake(0, 3.0, 1.4);
  const est = [];
  while (s.t < 400) { s.step(); m.update(); if (s.t > 150 && s.k % 100 === 0) { const v = m.speed(); if (v != null) est.push(-v * KMH); } }
  est.sort((a, b) => a - b);
  const med = est[Math.floor(est.length / 2)];
  ok(med >= 15 && med <= 25, `${n}台/km：渋滞の波は後ろへ時速${med.toFixed(1)}kmで進む（観測の目安は時速15〜20km前後）`);
}

// 5) 車列（時速80km、先頭が20km/h減速）
function chain(gap, tau) {
  const V = 80 / KMH;
  const tmp = new Sim({ ring: false, n: 2, v: V });
  const r = Math.sqrt(1 - Math.pow(V / tmp.p.v0, tmp.p.delta));
  const T = (gap * r - tmp.p.s0) / V;
  const s = new Sim({ ring: false, n: 12, v: V, params: { T, tau } });
  s.brake(11, 2.0, 20 / KMH / 2.0);
  while (s.t < 100) s.step();
  const mins = Array.from(s.minV).reverse().map((v) => v * KMH); // [0] = 先頭
  return { mins, stopAt: mins.findIndex((m) => m < 1) + 1, clamp: s.clampCount, minGap: s.minGap };
}
{
  const c = chain(25, 1.1);
  console.log('     車列（反応1.1秒・車間25m）の各車の最低速度:', c.mins.map((m) => m.toFixed(0)).join(' '));
  ok(c.stopAt > 0 && c.stopAt <= 12, `反応1.1秒・車間25mでは、${c.stopAt}台目で止まる`);
  const c40 = chain(40, 1.1);
  ok(c40.stopAt === 0 && 80 - c40.mins[11] < 20, `車間40mなら波は育たない（12台目の最低速度 ${c40.mins[11].toFixed(0)}km/h）`);
  const c35 = chain(35, 1.1);
  ok(80 - c35.mins[11] > 20, `車間35mでは、まだ波は大きくなる（12台目 ${c35.mins[11].toFixed(0)}km/h）`);
  const t7 = chain(25, 0.7);
  ok(t7.stopAt === 0, `車間25mでも反応0.7秒なら止まる車は出ない（12台目 ${t7.mins[11].toFixed(0)}km/h）`);
}

// 6) ゆらぎを入れたとき、自然に渋滞が生まれる台数（10分間）
{
  const res = {};
  for (const n of [18, 20, 22, 26, 28, 30]) {
    let stops = 0;
    for (const seed of [3, 4, 5]) {
      const s = ring(n, { noise: 0.15 }, seed);
      while (s.t < 600) s.step();
      stops += s.stopEvents;
    }
    res[n] = stops;
  }
  console.log('     ゆらぎあり・10分間で止まった車（3回分の合計）:', Object.entries(res).map(([n, v]) => `${n}台:${v}`).join(' '));
  ok(res[18] === 0 && res[20] === 0 && res[22] === 0, 'ゆらぎがあっても、22台/km以下では渋滞は生まれない');
  ok(res[26] > 0 && res[28] > 0 && res[30] > 0, 'ゆらぎがあると、26台/km以上では誰もブレーキを踏ませなくても渋滞が生まれる');
}

// 7) ゆとり運転（26台/km、ゆらぎ ふつう）：12回試して、3〜6分後に止まる車がゼロになった回数
{
  const out = {};
  for (const k of [0, 1, 2, 3]) {
    let clear = 0, stopsSum = 0, vSum = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const s = ring(26, { noise: 0.15 }, 5);
      s.brake(0, 3.0, 2.0);
      while (s.t < 150) s.step();
      s.rng = mulberry32(seed * 7919 + 13);
      while (s.t < 150 + (seed * 17) % 60) s.step();
      for (let j = 0; j < k; j++) s.setAbsorber((Math.floor((j * 26) / k) + 3) % 26, true);
      const t0 = s.t;
      while (s.t < t0 + 180) s.step();
      const st = s.stopEvents;
      let vs = 0, c = 0;
      while (s.t < t0 + 360) { s.step(); vs += s.meanSpeed(); c++; }
      if (s.stopEvents === st) clear++;
      stopsSum += s.stopEvents - st;
      vSum += (vs / c) * KMH;
      if (s.clampCount) fails++;
    }
    out[k] = { clear, stops: stopsSum / 12, v: vSum / 12 };
  }
  console.log('     ゆとり運転の台数ごと（3〜6分後）:', Object.entries(out).map(([k, o]) => `${k}台: 渋滞が消えた ${o.clear}/12回, 止まった車 平均${o.stops.toFixed(0)}台, 平均時速${o.v.toFixed(0)}km`).join(' | '));
  ok(out[1].stops < out[0].stops * 0.75, 'ゆとり運転1台でも、止まる車は減る');
  ok(out[2].clear >= 8 && out[3].clear >= 9, 'ゆとり運転2〜3台で、ほとんどの場合渋滞の波が消える');
  ok(out[2].v > out[0].v + 4, `ゆとり運転2台で平均の速さが上がる（${out[0].v.toFixed(0)} → ${out[2].v.toFixed(0)}km/h）`);
}

// 8) 図2のシナリオ：15台前のブレーキで「あなた」が止まり、やがて抜ける
{
  const s = ring(30);
  const v0 = s.v[0];
  s.brake(15, 3.0, 1.5);
  let stopped = false, exited = null, slowed = false;
  while (s.t < 150) {
    s.step();
    if (s.v[0] < v0 * 0.85) slowed = true;
    if (s.v[0] < 0.4) stopped = true;
    if (slowed && exited == null && s.v[0] > v0 * 0.9 && s.t > 20) exited = s.t;
  }
  ok(stopped && exited != null, '図2：15台前のブレーキで「あなた」は一度止まり、その後渋滞を抜ける', exited ? `${exited.toFixed(0)}秒後に抜けた` : '');
}

// 9) 重なり・永久停止がないこと（極端な設定も含む）
{
  let clamps = 0, minGap = Infinity, longest = 0;
  const cases = [];
  for (const n of [10, 20, 30, 40, 50]) for (const tau of [0.3, 1.1, 2.0]) for (const noise of [0, 0.15, 0.3]) cases.push({ n, tau, noise });
  for (const c of cases) {
    const s = ring(c.n, { tau: c.tau, noise: c.noise }, 9);
    s.brake(0, 3.0, 3.0);
    const since = new Float64Array(c.n).fill(-1);
    while (s.t < 400) {
      s.step();
      for (let i = 0; i < c.n; i++) {
        if (s.v[i] < 0.05) { if (since[i] < 0) since[i] = s.t; else longest = Math.max(longest, s.t - since[i]); }
        else since[i] = -1;
      }
    }
    clamps += s.clampCount;
    minGap = Math.min(minGap, s.minGap);
  }
  for (const gap of [15, 25, 60]) for (const tau of [0.3, 1.1, 2.0]) { const c = chain(gap, tau); clamps += c.clamp; minGap = Math.min(minGap, c.minGap); }
  ok(clamps === 0, '車どうしが重なりそうになって安全装置が働いたことは一度もない（全' + (cases.length + 9) + '通り）', `最小の車間 ${minGap.toFixed(2)}m`);
  ok(longest < 30, '止まった車は必ず動き出す（いちばん長い停止 ' + longest.toFixed(1) + '秒）');
}

console.log(fails ? `\n${fails} 件の NG があります` : '\nすべて OK');
process.exit(fails ? 1 : 0);
