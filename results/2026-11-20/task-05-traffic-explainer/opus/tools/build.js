// src/ の部品と engine.js を 1 枚の index.html にまとめる：node tools/build.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(root, 'src', f), 'utf8');
const { Sim, KMH } = require('../src/engine.js');

// 第4章のグラフ用：ゆらぎのある環状道路で、台数ごとに「1時間に流れる台数」を測る（10分走らせ、後半5分の平均）
function flowData() {
  const out = [];
  for (let k = 10; k <= 50; k += 2) {
    const sim = new Sim({ ring: true, length: 1000, n: k, seed: 3, params: { noise: 0.15 } });
    let sum = 0, cnt = 0, stops0 = 0;
    while (sim.t < 600) {
      sim.step();
      if (sim.t >= 300) {
        if (cnt === 0) stops0 = sim.stopEvents;
        sum += sim.meanSpeed();
        cnt++;
      }
    }
    const v = (sum / cnt) * KMH;
    out.push({ k, q: Math.round(k * v), v: Math.round(v * 10) / 10, stops: sim.stopEvents - stops0 });
    if (sim.clampCount) throw new Error('clamp in flowData k=' + k);
  }
  return out;
}

const data = flowData();
const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>渋滞を抜けたら、何もなかった。──触ってわかる自然渋滞のしくみ</title>
<meta name="description" content="事故も工事もない高速道路で、なぜ突然渋滞が生まれるのか。1台のブレーキから始まる渋滞の波を、自分の手で起こして確かめるインタラクティブ図解。">
<meta name="theme-color" content="#0c6a4b">
<style>
${src('style.css')}
</style>
</head>
<body>
${src('page.html')}
<script>
window.FLOW_DATA = ${JSON.stringify(data)};
</script>
<script>
${src('engine.js')}
</script>
<script>
${src('app.js')}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('index.html', (html.length / 1024).toFixed(1) + 'KB');
console.log('flow data:', data.map((d) => `${d.k}:${d.q}${d.stops ? '*' : ''}`).join(' '));
