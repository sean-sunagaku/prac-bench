/* 依頼（ステージ）とコース。
 * コースは区間の並びで書き、地形の折れ線と、看板・電柱などの飾りを同時に作る。
 */
(function (root) {
  'use strict';
  const KT = (root.KT = root.KT || {});

  // 区間の書き方
  // ['flat', 長さ] ['slope', 長さ, 高低差] ['bump', 長さ, 高さ]（スピードバンプ）
  // ['step', 高さ]（段差：マイナスで下り） ['plate', 長さ, 厚み]（工事の敷き鉄板）
  // ['pothole', 長さ, 深さ] ['gravel', 長さ, 振幅] ['rail', 本数]（踏切）
  // ['stairs', 段数, 1段の高さ, 踏み面] ['bridge', 長さ]（板の継ぎ目）
  const STAGES = [
    {
      id: 1,
      title: 'はじめての一人暮らし',
      client: '春から大学生のハルキさん',
      from: '実家（坂の上）',
      to: '駅前のワンルーム',
      memo: '荷物は少なめ。ギターだけは絶対に守ってほしいそうです。',
      request: { items: ['guitar'], tip: 5000, what: 'ギター', thanks: 'ギターが無事だったお礼', okVoice: 'ギターも無傷で、ほんとうに助かりました！', ngVoice: 'ギターだけは、守ってほしかったな……。' },
      fee: 30000,
      targetTime: 45,
      timeRate: 200,
      ropes: 2,
      theme: 'morning',
      items: ['fridge_s', 'microwave', 'tv_s', 'futon', 'kotatsu', 'danbo_m', 'danbo_m', 'danbo_s', 'guitar'],
      course: [
        ['flat', 28],
        ['bump', 0.9, 0.08],
        ['flat', 16],
        ['step', 0.08],
        ['flat', 9],
        ['step', -0.08],
        ['flat', 14],
        ['slope', 26, 2.4],
        ['flat', 10],
        ['pothole', 0.9, 0.07],
        ['flat', 8],
        ['slope', 24, -2.4],
        ['flat', 12],
        ['bump', 0.9, 0.1],
        ['flat', 12],
        ['bump', 0.9, 0.1],
        ['flat', 14],
        ['plate', 4, 0.05],
        ['flat', 14],
        ['step', 0.09],
        ['flat', 10],
        ['goal', 0],
        ['flat', 60],
      ],
      seed: 11,
    },
    {
      id: 2,
      title: 'ふたりの新生活',
      client: '新婚のミナミさん・ソウタさん',
      from: '古いアパート',
      to: '川向こうの2LDK',
      memo: '大きな家電と割れ物が多め。結婚祝いの食器は割らないでほしいそうです。踏切と工事中の道を通ります。',
      request: { items: ['danbo_ware'], tip: 8000, what: '食器の箱（2箱とも）', thanks: '結婚祝いの食器が無事だったお礼', okVoice: 'お祝いの食器も全部無事。ありがとうございます！', ngVoice: '結婚祝いの食器が……。' },
      fee: 70000,
      targetTime: 70,
      timeRate: 250,
      ropes: 3,
      theme: 'noon',
      items: ['fridge_l', 'washer', 'tv_l', 'danbo_ware', 'danbo_ware', 'mirror', 'plant', 'futon', 'futon', 'danbo_l'],
      course: [
        ['flat', 28],
        ['bump', 0.9, 0.07],
        ['flat', 14],
        ['step', 0.09],
        ['flat', 7],
        ['step', -0.09],
        ['flat', 16],
        ['rail', 2],
        ['flat', 18],
        ['slope', 30, 3.6],
        ['flat', 6],
        ['bump', 1.0, 0.08],
        ['flat', 8],
        ['slope', 28, -3.6],
        ['flat', 10],
        ['plate', 5, 0.05],
        ['flat', 3],
        ['plate', 4, 0.05],
        ['flat', 14],
        ['pothole', 1.0, 0.07],
        ['flat', 5],
        ['pothole', 0.8, 0.06],
        ['flat', 14],
        ['stairs', 3, 0.06, 2.2],
        ['flat', 10],
        ['step', -0.18],
        ['flat', 16],
        ['gravel', 18, 0.025],
        ['flat', 12],
        ['bump', 0.9, 0.07],
        ['flat', 12],
        ['goal', 0],
        ['flat', 60],
      ],
      seed: 22,
    },
    {
      id: 3,
      title: 'おばあちゃん家の実家じまい',
      client: '山あいに住むヨシエさん',
      from: '山の上の古民家',
      to: '町の娘さん宅',
      memo: '仏壇と盆栽は宝物。全部積むと350kgを少しこえます。安い物は積み残してもかまいません。',
      request: { items: ['butsudan', 'bonsai'], tip: 15000, what: '仏壇と盆栽', thanks: '仏壇と盆栽が無事だったお礼', okVoice: '仏壇も盆栽も無事で、おじいさんも喜んでますよ。', ngVoice: '仏壇と盆栽だけは、無事に運んでほしかったねえ……。' },
      fee: 120000,
      targetTime: 110,
      timeRate: 300,
      ropes: 4,
      theme: 'evening',
      items: ['tansu', 'butsudan', 'kinko', 'bonsai', 'tsubo', 'manekineko', 'clock', 'komebukuro', 'komebukuro', 'tsukemono', 'watermelon', 'watermelon', 'chabudai', 'futon', 'danbo_s'],
      course: [
        ['flat', 28],
        ['gravel', 30, 0.03],
        ['flat', 8],
        ['slope', 34, -3.0],
        ['flat', 6],
        ['bridge', 26],
        ['flat', 8],
        ['step', 0.1],
        ['flat', 10],
        ['slope', 44, 6.0],
        ['flat', 6],
        ['step', 0.08],
        ['flat', 8],
        ['step', -0.08],
        ['flat', 6],
        ['slope', 40, -6.5],
        ['flat', 10],
        ['pothole', 1.1, 0.08],
        ['flat', 6],
        ['pothole', 1.0, 0.07],
        ['flat', 12],
        ['rail', 2],
        ['flat', 14],
        ['stairs', 3, 0.07, 2.0],
        ['flat', 12],
        ['step', -0.2],
        ['flat', 14],
        ['gravel', 22, 0.035],
        ['flat', 10],
        ['plate', 5, 0.05],
        ['flat', 12],
        ['bump', 1.0, 0.08],
        ['flat', 10],
        ['bump', 1.0, 0.08],
        ['flat', 14],
        ['goal', 0],
        ['flat', 60],
      ],
      seed: 33,
    },
  ];
  KT.STAGES = STAGES;

  /**
   * コースを組み立てる。
   * 返り値: { points: [[x,y]...], startX, truckX, goalX, endX, features: [...] }
   */
  KT.buildCourse = (stage) => {
    const rnd = KT.rng(stage.seed * 1013 + 7);
    const pts = [];
    const features = [];
    let x = -40, y = 0;
    const push = (px, py) => {
      const last = pts[pts.length - 1];
      if (last && Math.abs(last[0] - px) < 1e-4 && Math.abs(last[1] - py) < 1e-4) return;
      pts.push([px, py]);
    };
    push(x - 0.01, 8); // バックしすぎても落ちないように壁を立てる
    push(x, y);
    x = 0;
    push(x, y);
    let goalX = null;

    for (const seg of stage.course) {
      const t = seg[0];
      if (t === 'flat') {
        x += seg[1];
        push(x, y);
      } else if (t === 'goal') {
        goalX = x;
        features.push({ type: 'goal', x });
      } else if (t === 'slope') {
        const len = seg[1], rise = seg[2];
        const n = Math.max(8, Math.ceil(len / 0.5));
        const x0 = x, y0 = y;
        for (let i = 1; i <= n; i++) {
          const u = i / n;
          push(x0 + len * u, y0 + rise * (1 - Math.cos(Math.PI * u)) / 2);
        }
        features.push({ type: rise > 0 ? 'slopeUp' : 'slopeDown', x: x0, len, rise });
        x += len;
        y += rise;
      } else if (t === 'bump') {
        const len = seg[1], h = seg[2];
        const n = 10;
        features.push({ type: 'bump', x, h });
        for (let i = 1; i <= n; i++) {
          const u = i / n;
          push(x + len * u, y + h * Math.sin(Math.PI * u));
        }
        x += len;
        push(x, y);
      } else if (t === 'step') {
        const h = seg[1];
        features.push({ type: h > 0 ? 'stepUp' : 'stepDown', x, h });
        push(x, y);
        x += 0.025;
        y += h;
        push(x, y);
      } else if (t === 'plate') {
        const len = seg[1], h = seg[2];
        features.push({ type: 'plate', x, len, h });
        push(x, y);
        push(x + 0.04, y + h);
        push(x + len - 0.04, y + h);
        push(x + len, y);
        x += len;
      } else if (t === 'pothole') {
        const len = seg[1], d = seg[2];
        features.push({ type: 'pothole', x, len, d });
        push(x, y);
        push(x + 0.12, y - d);
        push(x + len - 0.12, y - d);
        push(x + len, y);
        x += len;
      } else if (t === 'gravel') {
        const len = seg[1], amp = seg[2];
        features.push({ type: 'gravel', x, len });
        const n = Math.ceil(len / 0.32);
        for (let i = 1; i < n; i++) {
          push(x + (len * i) / n, y + (rnd() - 0.35) * amp * 2);
        }
        x += len;
        push(x, y);
      } else if (t === 'rail') {
        // 踏切：盛り上がった踏切板の上に、レールの頭が少し出ている
        const tracks = seg[1];
        const start = x;
        push(x, y);
        push(x + 0.6, y + 0.05);
        x += 0.6;
        const top = y + 0.05;
        for (let k = 0; k < tracks; k++) {
          x += 1.0;
          for (const rx of [0, 1.067]) {
            push(x + rx, top);
            push(x + rx + 0.005, top + 0.025);
            push(x + rx + 0.07, top + 0.025);
            push(x + rx + 0.075, top);
          }
          x += 1.067 + 0.075;
          x += 0.8;
        }
        x += 0.6;
        push(x, top);
        push(x + 0.6, y);
        x += 0.6;
        features.push({ type: 'rail', x: start, x1: x, tracks });
      } else if (t === 'stairs') {
        const n = seg[1], h = seg[2], run = seg[3];
        features.push({ type: 'stairs', x, n, h, run });
        for (let i = 0; i < n; i++) {
          push(x, y);
          x += 0.025;
          y += h;
          push(x, y);
          x += run;
          push(x, y);
        }
      } else if (t === 'bridge') {
        const len = seg[1];
        features.push({ type: 'bridge', x, len });
        const n = Math.floor(len / 1.6);
        for (let i = 0; i < n; i++) {
          const sx = x + i * 1.6 + 0.8;
          push(sx - 0.05, y);
          push(sx, y + 0.02);
          push(sx + 0.05, y);
        }
        x += len;
        push(x, y);
      }
    }
    const endX = x;
    push(x + 30, y + 6); // 終点の土手
    push(x + 30.01, y + 20);
    return {
      points: pts,
      startX: 0,
      truckX: 13,
      goalX: goalX ?? endX - 40,
      endX,
      features,
    };
  };

  /** x における地面の高さ（折れ線を二分探索） */
  KT.groundY = (course, x) => {
    const p = course.points;
    if (x <= p[0][0]) return p[0][1];
    if (x >= p[p.length - 1][0]) return p[p.length - 1][1];
    let lo = 0, hi = p.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (p[mid][0] <= x) lo = mid;
      else hi = mid;
    }
    const [x1, y1] = p[lo], [x2, y2] = p[hi];
    const u = x2 - x1 < 1e-6 ? 1 : (x - x1) / (x2 - x1);
    return y1 + (y2 - y1) * u;
  };

  /** 依頼の要約（依頼票に載せる数字） */
  KT.stageSummary = (stage) => {
    let mass = 0, value = 0;
    for (const id of stage.items) {
      mass += KT.ITEMS[id].mass;
      value += KT.ITEMS[id].value;
    }
    const course = KT.buildCourse(stage);
    const kinds = new Set();
    for (const f of course.features) {
      if (f.type === 'stepUp' || f.type === 'stepDown' || f.type === 'stairs') kinds.add('段差');
      if (f.type === 'bump') kinds.add('スピードバンプ');
      if (f.type === 'rail') kinds.add('踏切');
      if (f.type === 'slopeUp' || f.type === 'slopeDown') kinds.add('坂道');
      if (f.type === 'gravel') kinds.add('砂利道');
      if (f.type === 'pothole') kinds.add('穴ぼこ');
      if (f.type === 'plate') kinds.add('工事の鉄板');
      if (f.type === 'bridge') kinds.add('木の橋');
    }
    return {
      count: stage.items.length,
      mass,
      value,
      distance: Math.round(course.goalX - course.truckX),
      roads: Array.from(kinds),
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
