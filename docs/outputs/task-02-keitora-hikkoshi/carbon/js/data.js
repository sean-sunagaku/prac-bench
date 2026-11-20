(function (root) {
  'use strict';

  /**
   * Cargo Catalog for 「軽トラ限界引っ越し」
   * Units: meters (width, height), kg (mass), JPY (fee, liability)
   */
  const CARGO_TYPES = {
    box_l: {
      id: 'box_l',
      name: '衣類・本ダンボール',
      shortName: 'ダンボール(大)',
      category: 'standard',
      shape: 'box',
      width: 0.54,
      height: 0.42,
      mass: 18,
      fee: 3500,
      liability: 4500,
      maxHp: 100,
      safeShock: 2.7,
      damageScale: 14,
      crushLimitKg: 58,
      friction: 0.76,
      restitution: 0.06,
      cushion: 0.25,
      thisSideUp: false,
      soundType: 'box',
      badges: ['定番', '頑丈め'],
      hint: '底面が広く安定。中段の土台にぴったり。',
      color: '#d59f63',
      accent: '#b57c40'
    },

    box_fragile: {
      id: 'box_fragile',
      name: '食器ダンボール',
      shortName: '食器箱(ワレモノ)',
      category: 'fragile',
      shape: 'box',
      width: 0.46,
      height: 0.36,
      mass: 11,
      fee: 5500,
      liability: 13000,
      maxHp: 100,
      safeShock: 1.72,
      damageScale: 24,
      crushLimitKg: 22,
      friction: 0.72,
      restitution: 0.08,
      cushion: 0.1,
      thisSideUp: false,
      soundType: 'ceramic',
      badges: ['ワレモノ', '上積み厳禁'],
      hint: '重い荷物を上に乗せると潰れる！布団の上や上段へ。',
      color: '#efe6d5',
      accent: '#d93829'
    },

    futon: {
      id: 'futon',
      name: 'ふとん袋',
      shortName: 'ふとん袋',
      category: 'cushion',
      shape: 'box',
      width: 0.84,
      height: 0.34,
      mass: 8,
      fee: 3000,
      liability: 3000,
      maxHp: 220,
      safeShock: 6.0,
      damageScale: 4,
      crushLimitKg: 95,
      friction: 0.88,
      restitution: 0.02,
      cushion: 0.65,
      thisSideUp: false,
      soundType: 'soft',
      badges: ['衝撃吸収◎', '軽量'],
      hint: '最強のクッション材！テレビや食器・壺の下に敷くと衝撃を大幅カット！',
      color: '#4b8bbe',
      accent: '#f4f7fa'
    },

    fridge: {
      id: 'fridge',
      name: '2ドア冷蔵庫',
      shortName: '冷蔵庫',
      category: 'heavy',
      shape: 'box',
      width: 0.58,
      height: 1.16,
      mass: 48,
      fee: 12000,
      liability: 28000,
      maxHp: 120,
      safeShock: 3.1,
      damageScale: 13,
      crushLimitKg: 120,
      friction: 0.74,
      restitution: 0.05,
      cushion: 0.0,
      thisSideUp: false,
      soundType: 'metal',
      badges: ['重量48kg', '高重心注意'],
      hint: '超ヘビー級。鳥居（前壁）に寄せるか寝かせて積むと重心が劇的に安定！',
      color: '#dce7eb',
      accent: '#6f8792'
    },

    washer: {
      id: 'washer',
      name: 'ドラム式洗濯機',
      shortName: '洗濯機',
      category: 'heavy',
      shape: 'box',
      width: 0.62,
      height: 0.74,
      mass: 54,
      fee: 13500,
      liability: 32000,
      maxHp: 125,
      safeShock: 3.2,
      damageScale: 13,
      crushLimitKg: 130,
      friction: 0.78,
      restitution: 0.04,
      cushion: 0.0,
      thisSideUp: false,
      soundType: 'metal',
      badges: ['最重量54kg', '土台向き'],
      hint: '最も重い家電！必ず荷台の床（タイヤ付近）に置いて重心を下げよう。',
      color: '#f0efe9',
      accent: '#3a506b'
    },

    tv: {
      id: 'tv',
      name: '大型液晶テレビ',
      shortName: '液晶テレビ',
      category: 'fragile',
      shape: 'box',
      width: 0.90,
      height: 0.52,
      mass: 13,
      fee: 11500,
      liability: 38000,
      maxHp: 100,
      safeShock: 1.62,
      damageScale: 26,
      crushLimitKg: 18,
      friction: 0.72,
      restitution: 0.06,
      cushion: 0.0,
      thisSideUp: false,
      soundType: 'glass',
      badges: ['超ワレモノ', '高額弁償'],
      hint: '衝撃に弱い高級家電！ふとん袋の上や周囲を囲んでガッチリ保護しよう。',
      color: '#262b33',
      accent: '#38bdf8'
    },

    plant: {
      id: 'plant',
      name: '観葉植物(モンステラ)',
      shortName: '観葉植物',
      category: 'delicate',
      shape: 'plant',
      width: 0.46,
      height: 0.72,
      mass: 11,
      fee: 6000,
      liability: 9500,
      maxHp: 100,
      safeShock: 1.92,
      damageScale: 20,
      crushLimitKg: 12,
      friction: 0.78,
      restitution: 0.04,
      cushion: 0.05,
      thisSideUp: true,
      soundType: 'ceramic',
      badges: ['天地無用↑', '横倒し厳禁'],
      hint: '大きく傾いたり逆さまになると土がこぼれてダメージ！隙間に真っ直ぐ立てよう。',
      color: '#2e8b57',
      accent: '#c26d43'
    },

    sofa_l: {
      id: 'sofa_l',
      name: '一人掛けL字ソファ',
      shortName: 'L字ソファ',
      category: 'cushion',
      shape: 'l_sofa',
      width: 0.70,
      height: 0.70,
      seatHeight: 0.32,
      backWidth: 0.24,
      mass: 22,
      fee: 7500,
      liability: 14000,
      maxHp: 130,
      safeShock: 3.4,
      damageScale: 10,
      crushLimitKg: 55,
      friction: 0.84,
      restitution: 0.04,
      cushion: 0.45,
      thisSideUp: false,
      soundType: 'soft',
      badges: ['L字くぼみ', '衝撃吸収○'],
      hint: '座面のくぼみにワレモノや壺を乗せると、背もたれがストッパー＆クッションになる！',
      color: '#cf6a4c',
      accent: '#9c432b'
    },

    chest: {
      id: 'chest',
      name: '木製タンス',
      shortName: '木製タンス',
      category: 'standard',
      shape: 'box',
      width: 0.72,
      height: 0.64,
      mass: 32,
      fee: 8500,
      liability: 16000,
      maxHp: 115,
      safeShock: 2.9,
      damageScale: 13,
      crushLimitKg: 85,
      friction: 0.74,
      restitution: 0.05,
      cushion: 0.08,
      thisSideUp: false,
      soundType: 'wood',
      badges: ['中重量32kg', '平天板'],
      hint: '天板がフラットで頑丈。下段に置けば頼れる2段目の床になる。',
      color: '#9c6639',
      accent: '#694121'
    },

    microwave: {
      id: 'microwave',
      name: 'レトロ電子レンジ',
      shortName: '電子レンジ',
      category: 'fragile',
      shape: 'box',
      width: 0.48,
      height: 0.34,
      mass: 15,
      fee: 5500,
      liability: 12000,
      maxHp: 100,
      safeShock: 1.9,
      damageScale: 19,
      crushLimitKg: 35,
      friction: 0.74,
      restitution: 0.05,
      cushion: 0.0,
      thisSideUp: false,
      soundType: 'metal',
      badges: ['精密家電', 'コンパクト'],
      hint: '小ぶりだが意外とずっしり。隙間埋めやタンスの上に好相性。',
      color: '#f2e8cf',
      accent: '#bc4749'
    },

    vase: {
      id: 'vase',
      name: '骨董の壺（家宝）',
      shortName: '骨董の壺',
      category: 'fragile',
      shape: 'vase',
      width: 0.34,
      height: 0.46,
      mass: 9,
      fee: 18000,
      liability: 50000,
      maxHp: 100,
      safeShock: 1.56,
      damageScale: 30,
      crushLimitKg: 10,
      friction: 0.76,
      restitution: 0.05,
      cushion: 0.0,
      thisSideUp: true,
      soundType: 'ceramic',
      badges: ['家宝！超高額', '超ワレモノ', '天地無用↑'],
      hint: '割ったら弁償5万円！L字ソファやふとん袋で守り、絶対に落とすな！',
      color: '#3d5a80',
      accent: '#e9c46a'
    }
  };

  function buildCourseTerrain(spec) {
    const pts = [];
    pts.push({ x: -12, y: 3.5 });
    pts.push({ x: -8.5, y: 0.0 });
    pts.push({ x: 0, y: 0.0 });

    for (const seg of spec.segments) {
      const last = pts[pts.length - 1];
      if (seg.xStart > last.x + 0.05) {
        pts.push({ x: seg.xStart, y: last.y });
      }
      const baseY = pts[pts.length - 1].y;

      if (seg.type === 'bump') {
        const steps = 12;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const x = seg.xStart + (seg.xEnd - seg.xStart) * t;
          const h = seg.height * Math.sin(Math.PI * t);
          pts.push({ x, y: baseY + h, surface: 'bump' });
        }
      } else if (seg.type === 'double_bump') {
        const steps = 22;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const x = seg.xStart + (seg.xEnd - seg.xStart) * t;
          const h = seg.height * Math.pow(Math.sin(2 * Math.PI * t), 2);
          pts.push({ x, y: baseY + h, surface: 'bump' });
        }
      } else if (seg.type === 'plate_dip') {
        const len = seg.xEnd - seg.xStart;
        pts.push({ x: seg.xStart + 0.42, y: baseY + seg.stepUp, surface: 'steel' });
        pts.push({ x: seg.xStart + len * 0.38, y: baseY + seg.stepUp, surface: 'steel' });
        pts.push({ x: seg.xStart + len * 0.50, y: baseY - seg.dip, surface: 'dirt' });
        pts.push({ x: seg.xStart + len * 0.68, y: baseY - seg.dip, surface: 'dirt' });
        pts.push({ x: seg.xStart + len * 0.78, y: baseY + seg.stepUp * 0.85, surface: 'steel' });
        pts.push({ x: seg.xEnd - 0.42, y: baseY + seg.stepUp * 0.85, surface: 'steel' });
        pts.push({ x: seg.xEnd, y: baseY });
      } else if (seg.type === 'hill') {
        const steps = 20;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const ease = 0.5 - 0.5 * Math.cos(Math.PI * t);
          const x = seg.xStart + (seg.xEnd - seg.xStart) * t;
          pts.push({ x, y: baseY + seg.deltaY * ease });
        }
      } else if (seg.type === 'bridge') {
        const steps = 18;
        pts.push({ x: seg.xStart + 0.35, y: baseY + 0.06, surface: 'wood' });
        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          const x = seg.xStart + (seg.xEnd - seg.xStart) * t;
          const arch = seg.archHeight * Math.sin(Math.PI * t);
          pts.push({ x, y: baseY + arch, surface: 'wood' });
        }
        pts.push({ x: seg.xEnd - 0.35, y: baseY + 0.06, surface: 'wood' });
        pts.push({ x: seg.xEnd, y: baseY });
      } else if (seg.type === 'railroad') {
        const mid = (seg.xStart + seg.xEnd) * 0.5;
        pts.push({ x: mid - 2.6, y: baseY + 0.14, surface: 'asphalt' });
        pts.push({ x: mid - 1.1, y: baseY + 0.14, surface: 'wood' });
        pts.push({ x: mid - 0.85, y: baseY + 0.22, surface: 'steel' });
        pts.push({ x: mid - 0.60, y: baseY + 0.12, surface: 'wood' });
        pts.push({ x: mid + 0.60, y: baseY + 0.12, surface: 'wood' });
        pts.push({ x: mid + 0.85, y: baseY + 0.22, surface: 'steel' });
        pts.push({ x: mid + 1.1, y: baseY + 0.14, surface: 'wood' });
        pts.push({ x: mid + 2.6, y: baseY, surface: 'asphalt' });
      } else if (seg.type === 'cobble') {
        const len = seg.xEnd - seg.xStart;
        const count = Math.max(6, Math.floor(len / 0.85));
        for (let i = 1; i <= count; i++) {
          const x = seg.xStart + (len * i) / count;
          const wave = (i % 2 === 1 ? 1 : -0.5) * seg.amp * (i === count ? 0 : 1);
          pts.push({ x, y: baseY + wave, surface: 'cobble' });
        }
        pts.push({ x: seg.xEnd + 0.4, y: baseY });
      } else if (seg.type === 'steps') {
        const count = seg.count || 3;
        const stepLen = (seg.xEnd - seg.xStart) / count;
        let curY = baseY;
        for (let i = 0; i < count; i++) {
          const sx = seg.xStart + i * stepLen;
          curY += seg.stepRise;
          pts.push({ x: sx + 0.42, y: curY, surface: 'cobble' });
          pts.push({ x: sx + stepLen, y: curY, surface: 'cobble' });
        }
      }
    }

    const endLast = pts[pts.length - 1];
    pts.push({ x: spec.goalX + 28, y: endLast.y });
    pts.push({ x: spec.goalX + 34, y: endLast.y + 4.0 });
    return pts;
  }

  const STAGES = [
    {
      id: 1,
      code: 'STAGE 01',
      name: '新生活！下町ワンルーム引越',
      client: '春野さん（大学生・初めての一人暮らし）',
      difficulty: '★☆☆ 初級',
      theme: 'spring_town',
      description: '商店街のかまぼこ段差と工事鉄板を抜けて、川向こうの新居アパートへ！「重い家電は下・ワレモノは布団の上」の基本を掴もう。',
      goalX: 125,
      targetTimeSec: 28,
      ropeAllowance: 2,
      baseFee: 15000,
      allLoadedBonus: 8000,
      perfectBonus: 6000,
      cargoManifest: [
        'fridge',
        'box_l',
        'box_l',
        'futon',
        'box_fragile',
        'plant'
      ],
      signs: [
        { x: 18, label: '段差あり', sub: '徐行 15km/h' },
        { x: 38, label: '上り坂 10%', sub: '荷崩れ注意' },
        { x: 71, label: '道路工事中', sub: '鉄板・くぼみ' },
        { x: 94, label: '太鼓橋', sub: '飛び出し注意' },
        { x: 116, label: '新居すぐ先', sub: 'GOAL' }
      ],
      segments: [
        { type: 'bump', xStart: 23, xEnd: 25.8, height: 0.165, label: 'かまぼこ段差' },
        { type: 'hill', xStart: 42, xEnd: 58, deltaY: 2.2, label: '商店街坂' },
        { type: 'hill', xStart: 61, xEnd: 71, deltaY: -1.3 },
        { type: 'plate_dip', xStart: 76, xEnd: 90, stepUp: 0.105, dip: 0.125, label: '工事鉄板' },
        { type: 'bridge', xStart: 98, xEnd: 113, archHeight: 0.78, label: 'さくら橋' }
      ]
    },

    {
      id: 2,
      code: 'STAGE 02',
      name: '坂道タウンのファミリー引越',
      client: '橘ファミリー（高台の一戸建てへ移転）',
      difficulty: '★★☆ 中級',
      theme: 'sunset_suburb',
      description: '踏切のガタガタ段差と名物・夕日ヶ丘の急坂が待ち受ける！L字ソファやふとん袋で大型液晶テレビを守り抜こう。',
      goalX: 155,
      targetTimeSec: 36,
      ropeAllowance: 2,
      baseFee: 22000,
      allLoadedBonus: 12000,
      perfectBonus: 10000,
      cargoManifest: [
        'washer',
        'chest',
        'sofa_l',
        'tv',
        'futon',
        'box_fragile',
        'box_l',
        'microwave'
      ],
      signs: [
        { x: 15, label: '踏切注意', sub: '一時減速！' },
        { x: 36, label: '急勾配 14%', sub: '後ろ重心注意' },
        { x: 78, label: '連続ハンプ', sub: '跳ね返り注意' },
        { x: 102, label: '急な下り坂', sub: 'ブレーキ慎重に' },
        { x: 145, label: '高台の新居', sub: 'GOAL' }
      ],
      segments: [
        { type: 'railroad', xStart: 20, xEnd: 27, label: '電鉄踏切' },
        { type: 'hill', xStart: 40, xEnd: 74, deltaY: 3.6, label: '夕日ヶ丘の急坂' },
        { type: 'double_bump', xStart: 83, xEnd: 95, height: 0.145, label: '連続減速帯' },
        { type: 'hill', xStart: 106, xEnd: 126, deltaY: -2.4, label: '下り坂' },
        { type: 'bridge', xStart: 130, xEnd: 144, archHeight: 0.68, label: '木造橋' }
      ]
    },

    {
      id: 3,
      code: 'STAGE 03',
      name: '限界突破！峠の豪邸大引越',
      client: '鬼瓦会長（山頂の日本家屋・家宝あり！）',
      difficulty: '★★★ 限界級',
      theme: 'mountain_pass',
      description: '荷物10個に弁償5万円の「骨董の壺」！石畳の悪路・段差・鬼の二段峠を越える、まさに軽トラ限界引っ越しの集大成！',
      goalX: 180,
      targetTimeSec: 46,
      ropeAllowance: 2,
      baseFee: 30000,
      allLoadedBonus: 18000,
      perfectBonus: 15000,
      cargoManifest: [
        'fridge',
        'washer',
        'sofa_l',
        'tv',
        'vase',
        'plant',
        'futon',
        'futon',
        'box_fragile',
        'box_l'
      ],
      signs: [
        { x: 15, label: '石畳の悪路', sub: '微振動注意' },
        { x: 46, label: '段差ステップ', sub: 'ゆっくり進入' },
        { x: 75, label: '鬼門・峠坂', sub: '最大勾配16%' },
        { x: 122, label: '峠のくぼみ橋', sub: '最後まで油断禁物' },
        { x: 170, label: '鬼瓦邸 正門', sub: 'GOAL' }
      ],
      segments: [
        { type: 'cobble', xStart: 20, xEnd: 37, amp: 0.052, label: '旧街道の石畳' },
        { type: 'steps', xStart: 50, xEnd: 65, count: 3, stepRise: 0.092, label: '石段坂' },
        { type: 'hill', xStart: 79, xEnd: 117, deltaY: 4.5, label: '峠の急登' },
        { type: 'plate_dip', xStart: 126, xEnd: 142, stepUp: 0.095, dip: 0.11, label: '山道工事跡' },
        { type: 'bridge', xStart: 148, xEnd: 165, archHeight: 0.78, label: '朱塗り太鼓橋' }
      ]
    }
  ];

  for (const st of STAGES) {
    st.terrain = buildCourseTerrain(st);
  }

  const API = {
    CARGO_TYPES,
    STAGES,
    buildCourseTerrain
  };

  root.GameData = API;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }
})(typeof window !== 'undefined' ? window : globalThis);
