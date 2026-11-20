(function (global) {
  'use strict';

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function smoothstep(t) {
    const c = clamp(t, 0, 1);
    return c * c * (3 - 2 * c);
  }

  function cosineBell(x, cx, halfW, height) {
    const d = Math.abs(x - cx);
    if (d >= halfW) return 0;
    return height * 0.5 * (1 + Math.cos((Math.PI * d) / halfW));
  }

  function createTerrain(stage) {
    const features = stage.features || [];

    function heightAt(x) {
      if (x <= 10) return 0;
      let y = 0;
      for (let i = 0; i < features.length; i++) {
        const f = features[i];
        switch (f.type) {
          case 'hill': {
            y += cosineBell(x, f.cx, f.halfW, f.h);
            break;
          }
          case 'ramp': {
            if (x > f.x0) {
              const t = (x - f.x0) / (f.x1 - f.x0);
              y += f.dy * smoothstep(t);
            }
            break;
          }
          case 'bump': {
            y += cosineBell(x, f.cx, f.w * 0.5, f.h);
            break;
          }
          case 'step': {
            const bevel = f.bevel || 0.42;
            if (x > f.x0 - bevel && x < f.x1 + bevel) {
              let up = 1;
              if (x < f.x0) up = smoothstep((x - (f.x0 - bevel)) / bevel);
              else if (x > f.x1) up = 1 - smoothstep((x - f.x1) / bevel);
              y += f.h * up;
            }
            break;
          }
          case 'dropoff': {
            const bevel = f.bevel || 0.50;
            if (x > f.x0) {
              y -= f.drop * smoothstep((x - f.x0) / bevel);
            }
            break;
          }
          case 'washboard': {
            if (x >= f.x0 - f.spacing && x <= f.x0 + f.count * f.spacing + f.spacing) {
              for (let k = 0; k < f.count; k++) {
                const cx = f.x0 + k * f.spacing;
                y += cosineBell(x, cx, f.bumpW * 0.5, f.h);
              }
            }
            break;
          }
          case 'railroad': {
            y += cosineBell(x, f.cx, 5.2, f.crown || 0.24);
            y += cosineBell(x, f.cx - 0.85, 0.42, f.railH || 0.14);
            y += cosineBell(x, f.cx + 0.85, 0.42, f.railH || 0.14);
            break;
          }
          case 'wave': {
            if (x > f.x0 && x < f.x1) {
              const u = (x - f.x0) / (f.x1 - f.x0);
              const env = Math.sin(Math.PI * u);
              y += f.amp * env * env * Math.sin(f.cycles * Math.PI * 2 * u);
            }
            break;
          }
        }
      }
      return y;
    }

    function slopeAt(x) {
      const eps = 0.06;
      return (heightAt(x + eps) - heightAt(x - eps)) / (2 * eps);
    }

    function normalAt(x) {
      const s = slopeAt(x);
      const invLen = 1 / Math.hypot(s, 1);
      return { x: -s * invLen, y: invLen };
    }

    function tangentAt(x) {
      const s = slopeAt(x);
      const invLen = 1 / Math.hypot(1, s);
      return { x: invLen, y: s * invLen };
    }

    return {
      heightAt,
      slopeAt,
      normalAt,
      tangentAt,
      features,
      signs: stage.signs || [],
      goalX: stage.distance,
    };
  }

  const STAGES = [
    {
      id: 1,
      code: 'STAGE 1',
      title: 'となりの町へ',
      subtitle: '学生ワンルーム引っ越し',
      difficulty: 1,
      difficultyLabel: '★☆☆ 入門',
      distance: 360,
      timeLimit: 75,
      ropes: 2,
      baseFee: 6000,
      perfectBonus: 12000,
      speedBonusPerSec: 150,
      theme: 'morning',
      hazardSummary: '段差・鉄板・踏切・減速帯',
      tip: '重い洗濯機や本の段ボールは下＆前（鳥居側）に！布団袋はワレモノのクッションになります。',
      items: [
        'washer',
        'box_books',
        'box_books',
        'kotatsu',
        'microwave',
        'futon',
        'tv',
        'plant',
      ],
      features: [
        { type: 'bump', cx: 58, w: 1.5, h: 0.16, label: 'マンホール段差' },
        { type: 'hill', cx: 112, halfW: 24, h: 2.0 },
        { type: 'step', x0: 154, x1: 166, h: 0.19, bevel: 0.48, label: '鉄板段差' },
        { type: 'railroad', cx: 212, crown: 0.28, railH: 0.15 },
        { type: 'washboard', x0: 266, count: 3, spacing: 5.5, bumpW: 1.5, h: 0.16 },
        { type: 'hill', cx: 312, halfW: 16, h: 1.25 },
      ],
      signs: [
        { x: 40, kind: 'bump', text: '段差あり' },
        { x: 138, kind: 'bump', text: '鉄板段差' },
        { x: 190, kind: 'railroad', text: '踏切あり' },
        { x: 248, kind: 'rough', text: '減速帯' },
      ],
    },
    {
      id: 2,
      code: 'STAGE 2',
      title: '坂の上の新居へ',
      subtitle: '二人暮らし大荷物便',
      difficulty: 2,
      difficultyLabel: '★★☆ 中級',
      distance: 480,
      timeLimit: 95,
      ropes: 3,
      baseFee: 8000,
      perfectBonus: 18000,
      speedBonusPerSec: 180,
      theme: 'afternoon',
      hazardSummary: 'かまぼこ橋・工事段差・踏切・急登坂',
      tip: '荷台いっぱいの大荷物！背の高い冷蔵庫や本棚はロープで荷台フックに縛ると安定します。',
      items: [
        'fridge',
        'washer',
        'bookshelf',
        'box_books',
        'box_dishes',
        'box_mikan',
        'microwave',
        'futon',
        'tv',
        'guitar',
        'plant',
      ],
      features: [
        { type: 'step', x0: 56, x1: 68, h: 0.22, bevel: 0.44 },
        { type: 'hill', cx: 118, halfW: 21, h: 3.1, bridge: true },
        { type: 'washboard', x0: 178, count: 4, spacing: 3.8, bumpW: 1.4, h: 0.18, construction: true },
        { type: 'step', x0: 204, x1: 218, h: 0.22, bevel: 0.40, construction: true },
        { type: 'railroad', cx: 264, crown: 0.34, railH: 0.17 },
        { type: 'ramp', x0: 300, x1: 375, dy: 6.4 },
        { type: 'bump', cx: 336, w: 1.5, h: 0.19 },
        { type: 'dropoff', x0: 404, drop: 0.30, bevel: 0.55 },
        { type: 'bump', cx: 432, w: 1.6, h: 0.20 },
      ],
      signs: [
        { x: 40, kind: 'bump', text: '段差注意' },
        { x: 86, kind: 'hill', text: 'かまぼこ橋' },
        { x: 160, kind: 'construction', text: '工事中' },
        { x: 242, kind: 'railroad', text: '踏切注意' },
        { x: 286, kind: 'slope', text: '急登坂！' },
        { x: 388, kind: 'bump', text: '段差落下' },
      ],
    },
    {
      id: 3,
      code: 'STAGE 3',
      title: '峠の古民家へ',
      subtitle: '軽トラ限界フル積載',
      difficulty: 3,
      difficultyLabel: '★★★ 限界',
      distance: 620,
      timeLimit: 115,
      ropes: 3,
      baseFee: 10000,
      perfectBonus: 28000,
      speedBonusPerSec: 220,
      theme: 'sunset',
      hazardSummary: '踏切×2・峠の急坂＆波状路・急降下・太鼓橋',
      tip: '総重量350kg超えの限界便！全部積んで一攫千金を狙うか、危険な金魚鉢を諦めるかも戦略。',
      items: [
        'fridge',
        'tansu',
        'washer',
        'bookshelf',
        'kotatsu',
        'box_books',
        'box_dishes',
        'box_mikan',
        'microwave',
        'futon',
        'tv',
        'pc_monitor',
        'guitar',
        'fishbowl',
      ],
      features: [
        { type: 'washboard', x0: 54, count: 3, spacing: 4.5, bumpW: 1.45, h: 0.20 },
        { type: 'railroad', cx: 108, crown: 0.36, railH: 0.18 },
        { type: 'ramp', x0: 142, x1: 230, dy: 8.2 },
        { type: 'wave', x0: 155, x1: 225, amp: 0.52, cycles: 3 },
        { type: 'bump', cx: 256, w: 1.5, h: 0.22 },
        { type: 'step', x0: 284, x1: 300, h: 0.26, bevel: 0.42, construction: true },
        { type: 'washboard', x0: 312, count: 5, spacing: 3.4, bumpW: 1.35, h: 0.19, construction: true },
        { type: 'ramp', x0: 356, x1: 424, dy: -5.6 },
        { type: 'hill', cx: 454, halfW: 19, h: 3.2, bridge: true },
        { type: 'dropoff', x0: 500, drop: 0.34, bevel: 0.48 },
        { type: 'railroad', cx: 534, crown: 0.34, railH: 0.18 },
        { type: 'washboard', x0: 562, count: 3, spacing: 4.0, bumpW: 1.4, h: 0.20 },
      ],
      signs: [
        { x: 38, kind: 'rough', text: '連続段差' },
        { x: 88, kind: 'railroad', text: '踏切あり' },
        { x: 130, kind: 'slope', text: '峠の急坂' },
        { x: 268, kind: 'construction', text: '舗装工事中' },
        { x: 344, kind: 'slope', text: '急降下注意' },
        { x: 426, kind: 'hill', text: '太鼓橋' },
        { x: 514, kind: 'railroad', text: '最後の踏切' },
      ],
    },
  ];

  function getStage(id) {
    return STAGES.find((s) => s.id === id) || STAGES[0];
  }

  function calculateSettlement(itemsReport, runMeta) {
    const stage = runMeta.stage;
    const rows = [];
    let deliveryEarnings = 0;
    let penaltyTotal = 0;
    let intactCount = 0;
    let damagedCount = 0;
    let brokenCount = 0;
    let droppedCount = 0;
    let unloadedCount = 0;
    let maxPossibleItemValue = 0;

    for (const item of itemsReport) {
      const def = item.def;
      maxPossibleItemValue += def.value;

      let status = 'unloaded';
      let statusLabel = '未積載';
      let earn = 0;
      let penalty = 0;

      if (!item.loaded) {
        status = 'unloaded';
        statusLabel = '未積載';
        unloadedCount++;
      } else if (item.dropped) {
        status = 'dropped';
        statusLabel = '走行中落下';
        penalty = Math.round((def.value * 0.45) / 100) * 100;
        droppedCount++;
      } else if (!runMeta.reachedGoal) {
        if (item.state === 'broken') {
          status = 'broken';
          statusLabel = '大破';
          penalty = Math.round((def.value * 0.40) / 100) * 100;
          brokenCount++;
        } else if (item.state === 'damaged') {
          status = 'damaged';
          statusLabel = '軽破損(未達)';
          penalty = Math.round((def.value * 0.15) / 100) * 100;
          damagedCount++;
        } else {
          status = 'undelivered';
          statusLabel = '未到着';
        }
      } else {
        if (item.state === 'intact') {
          status = 'intact';
          statusLabel = '無傷お届け';
          earn = def.value;
          intactCount++;
        } else if (item.state === 'damaged') {
          status = 'damaged';
          statusLabel = 'キズ・軽破損';
          earn = Math.round((def.value * 0.48) / 100) * 100;
          damagedCount++;
        } else {
          status = 'broken';
          statusLabel = '大破';
          earn = 0;
          penalty = Math.round((def.value * 0.40) / 100) * 100;
          brokenCount++;
        }
      }

      deliveryEarnings += earn;
      penaltyTotal += penalty;
      rows.push({
        def,
        status,
        statusLabel,
        hp: Math.round(item.hp),
        earn,
        penalty,
        net: earn - penalty,
      });
    }

    const baseFee = runMeta.reachedGoal ? stage.baseFee : 0;
    const allDeliveredIntact =
      runMeta.reachedGoal &&
      itemsReport.length > 0 &&
      intactCount === itemsReport.length;
    const perfectBonus = allDeliveredIntact ? stage.perfectBonus : 0;
    const speedBonus =
      runMeta.reachedGoal && runMeta.remainingTime > 0
        ? Math.round((runMeta.remainingTime * stage.speedBonusPerSec) / 100) * 100
        : 0;
    const ropeBonus =
      runMeta.reachedGoal && runMeta.ropesUnused > 0
        ? runMeta.ropesUnused * 1000
        : 0;
    const rescuePenalty = runMeta.flipped ? 12000 : 0;

    const grossTotal = baseFee + deliveryEarnings + perfectBonus + speedBonus + ropeBonus;
    const totalDeductions = penaltyTotal + rescuePenalty;
    const finalTotal = grossTotal - totalDeductions;

    const maxBenchmark = maxPossibleItemValue + stage.baseFee + stage.perfectBonus;
    const ratio = maxBenchmark > 0 ? finalTotal / maxBenchmark : 0;

    let rank = 'D';
    let rankTitle = '限界突破・大赤字';
    let stampText = '大赤字！';
    if (!runMeta.reachedGoal) {
      rank = 'D';
      rankTitle = runMeta.flipped ? '軽トラ横転リタイア' : '納期オーバー未達';
      stampText = runMeta.flipped ? '横転事故' : '時間切れ';
    } else if (allDeliveredIntact || (ratio >= 0.88 && brokenCount === 0 && droppedCount === 0)) {
      rank = 'S';
      rankTitle = '神業軽トラ職人';
      stampText = '神業職人';
    } else if (ratio >= 0.66 && droppedCount === 0) {
      rank = 'A';
      rankTitle = 'ベテラン引っ越し屋';
      stampText = '熟練の技';
    } else if (ratio >= 0.42 && finalTotal > 0) {
      rank = 'B';
      rankTitle = 'なんとか引っ越し完了';
      stampText = '無事完納';
    } else if (finalTotal > 0) {
      rank = 'C';
      rankTitle = 'ギリギリ赤字回避';
      stampText = '赤字回避';
    } else {
      rank = 'D';
      rankTitle = '弁償まみれの大赤字';
      stampText = '大赤字！';
    }

    const comment = pickCustomerComment(rows, runMeta, {
      rank,
      intactCount,
      damagedCount,
      brokenCount,
      droppedCount,
      unloadedCount,
      finalTotal,
      totalItems: itemsReport.length,
    });

    return {
      rows,
      baseFee,
      deliveryEarnings,
      perfectBonus,
      speedBonus,
      ropeBonus,
      penaltyTotal,
      rescuePenalty,
      grossTotal,
      totalDeductions,
      finalTotal,
      intactCount,
      damagedCount,
      brokenCount,
      droppedCount,
      unloadedCount,
      allDeliveredIntact,
      rank,
      rankTitle,
      stampText,
      comment,
    };
  }

  function pickCustomerComment(rows, runMeta, stats) {
    if (runMeta.flipped) {
      return '「軽トラごとひっくり返ってるじゃないですか！！レッカー呼んでおきました…」';
    }
    if (runMeta.timeUp && !runMeta.reachedGoal) {
      return '「鍵の引き渡し時間に間に合いませんでした…もう一度積み直して出直しましょう！」';
    }
    if (stats.intactCount === stats.totalItems) {
      return '「軽トラ1台で全部無傷！？まさに神業の積み込みですね！またお願いします！」';
    }
    const fish = rows.find((r) => r.def.id === 'fishbowl');
    if (fish && (fish.status === 'broken' || fish.status === 'dropped')) {
      return '「あっ！！金魚鉢が…！！うちの金魚どこ行きました！？」';
    }
    const tv = rows.find((r) => r.def.id === 'tv');
    if (tv && tv.status === 'dropped') {
      return '「4Kテレビを道端に落としてきたんですか！？今すぐ拾いに行ってください！」';
    }
    if (tv && tv.status === 'broken') {
      return '「テレビの液晶がバキバキなんですが…！もう少しそっと運んでほしかったです…」';
    }
    const fridge = rows.find((r) => r.def.id === 'fridge');
    if (fridge && fridge.status === 'dropped') {
      return '「冷蔵庫を道路に落としていく引っ越し屋さんは初めて見ました…」';
    }
    const plant = rows.find((r) => r.def.id === 'plant');
    if (plant && (plant.status === 'broken' || plant.status === 'dropped')) {
      return '「観葉植物の鉢が割れて荷台が土まみれですよ…！」';
    }
    if (stats.finalTotal < 0) {
      return '「これ、引っ越し代より弁償代のほうが高いですよね…？大赤字ですね…」';
    }
    if (stats.unloadedCount >= Math.ceil(stats.totalItems * 0.45)) {
      return '「あれっ、半分近く前の家に置いてきちゃったんですか？もう1往復ですね…」';
    }
    if (stats.droppedCount >= 2) {
      return `「道中に荷物を${stats.droppedCount}個も落としてきましたね！？後ろ見ながら運転してください！」`;
    }
    if (stats.rank === 'A') {
      return '「お見事！ちょっとした揺れはありましたが、さすが軽トラの達人ですね！」';
    }
    if (stats.rank === 'B') {
      return '「なんとか新居に着きましたね！次はロープや積み方を工夫して満額を目指しましょう！」';
    }
    return '「荷台がだいぶ修羅場でしたね…重い物を下に積むと安定するらしいですよ！」';
  }

  const exportsObj = {
    STAGES,
    getStage,
    createTerrain,
    calculateSettlement,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObj;
  } else {
    global.Keitora = Object.assign(global.Keitora || {}, exportsObj);
  }
})(typeof window !== 'undefined' ? window : globalThis);
