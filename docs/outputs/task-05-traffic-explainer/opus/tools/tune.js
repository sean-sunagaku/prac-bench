// パラメータ調整用：node tools/tune.js '{"aMax":1.2}'
const { Sim, WaveMeter, KMH } = require('../src/engine.js');
const params = JSON.parse(process.argv[2] || '{}');
const only = process.argv[3] || 'ABCD';

function ringBrake(N, extra = {}) {
  const sim = new Sim({ ring: true, length: 1000, n: N, params: Object.assign({}, params, extra) });
  const v00 = sim.v[0];
  const meter = new WaveMeter(1000, 20);
  let firstStop = null, speeds = [];
  const tb = 5;
  let braked = false;
  while (sim.t < 300) {
    if (!braked && sim.t >= tb) { sim.brake(0, 3.0, 1.4); braked = true; }
    sim.step();
    if (firstStop == null && sim.minSpeed() < 0.4) firstStop = sim.t - tb;
    if (sim.k % 10 === 0 && sim.t > 120) {
      meter.push(sim.t, sim.jamCenter(40 / KMH));
      const w = meter.speed();
      if (w != null) speeds.push(w);
    }
  }
  const avgW = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null;
  return {
    N, v0kmh: (v00 * KMH).toFixed(0),
    firstStop: firstStop == null ? '-' : firstStop.toFixed(0),
    minV: (sim.minSpeed() * KMH).toFixed(0),
    stops: sim.stopEvents,
    std: (sim.speedStd() * KMH).toFixed(1),
    wave: avgW == null ? '-' : (avgW * KMH).toFixed(1),
    clamp: sim.clampCount, minGap: sim.minGap.toFixed(2), maxDec: sim.maxDecel.toFixed(1)
  };
}

function chain(T, tau, dip = 20, n = 12) {
  const sim = new Sim({ ring: false, n, v: 80 / KMH, params: Object.assign({}, params, { T, tau }) });
  const g = sim.s[0];
  sim.brake(n - 1, 2.0, dip / KMH / 2.0);
  while (sim.t < 90) sim.step();
  const mins = Array.from(sim.minV).reverse().map(v => (v * KMH).toFixed(0));
  return { T, tau, gap: g.toFixed(0), mins: mins.join(' '), clamp: sim.clampCount, minGap: sim.minGap.toFixed(1) };
}

function noisyRing(N, tEnd = 500, extra = {}) {
  const sim = new Sim({ ring: true, length: 1000, n: N, seed: 3, params: Object.assign({ noise: 0.25 }, params, extra) });
  let flow = 0, cnt = 0, stops0 = 0;
  while (sim.t < tEnd) {
    sim.step();
    if (sim.t > tEnd / 2) { flow += sim.meanSpeed() * N; cnt++; }
    if (Math.abs(sim.t - tEnd / 2) < 0.026) stops0 = sim.stopEvents;
  }
  return { N, flow: (flow / cnt * 3.6).toFixed(0), meanV: (flow / cnt / N * KMH).toFixed(0), stops: sim.stopEvents - stops0, clamp: sim.clampCount, minGap: sim.minGap.toFixed(2) };
}

function absorber(N, nAbs) {
  const sim = new Sim({ ring: true, length: 1000, n: N, seed: 5, params: Object.assign({ noise: 0.25 }, params) });
  sim.brake(0, 3.0, 2.0);
  while (sim.t < 150) sim.step();
  const s0 = sim.stopEvents;
  for (let j = 0; j < nAbs; j++) sim.setAbsorber(Math.floor(j * N / nAbs), true);
  const marks = [];
  for (let seg = 0; seg < 4; seg++) {
    const st = sim.stopEvents;
    const t0 = sim.t;
    let minv = Infinity, sumv = 0, c = 0;
    while (sim.t < t0 + 60) { sim.step(); minv = Math.min(minv, sim.minSpeed()); sumv += sim.meanSpeed(); c++; }
    marks.push(`${sim.stopEvents - st}停/${(minv * KMH).toFixed(0)}/${(sumv / c * KMH).toFixed(0)}`);
  }
  return { N, nAbs, before: s0, after: marks.join('  '), std: (sim.speedStd() * KMH).toFixed(1), clamp: sim.clampCount };
}

if (only.includes('A')) {
  console.log('--- A: ring single brake');
  for (const N of [18, 20, 22, 24, 26, 28, 30, 33, 36, 40]) console.log(JSON.stringify(ringBrake(N)));
}
if (only.includes('B')) {
  console.log('--- B: chain');
  for (const tau of [0.5, 1.0, 1.5]) for (const T of [1.0, 1.2, 1.5, 1.8, 2.2]) console.log(JSON.stringify(chain(T, tau)));
}
if (only.includes('C')) {
  console.log('--- C: absorber');
  for (const N of [26, 30, 34]) for (const k of [0, 1, 2]) console.log(JSON.stringify(absorber(N, k)));
}
if (only.includes('D')) {
  console.log('--- D: noisy ring');
  for (const N of [10, 15, 20, 22, 24, 26, 28, 30, 35, 40, 50, 60, 80]) console.log(JSON.stringify(noisyRing(N)));
}
