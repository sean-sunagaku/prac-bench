(function (global) {
  'use strict';

  /**
   * Cargo item catalog for 「軽トラ限界引っ越し」
   * Dimensions are in meters (physics world units).
   */
  const ITEM_DEFS = {
    fridge: {
      id: 'fridge',
      name: '冷蔵庫',
      w: 0.62,
      h: 1.16,
      massKg: 65,
      physMass: 5.4,
      value: 14000,
      friction: 0.48,
      restitution: 0.04,
      impactThreshold: 3.0,
      fragility: 11,
      crushLimit: 999,
      uprightOnly: false,
      cushion: 1.0,
      tags: ['重い', '土台向き'],
      desc: 'どっしり重い大黒柱。前寄りの一番下に積むと安定！',
      color: '#dce7ef',
    },
    washer: {
      id: 'washer',
      name: '洗濯機',
      w: 0.60,
      h: 0.82,
      massKg: 52,
      physMass: 4.6,
      value: 11000,
      friction: 0.56,
      restitution: 0.04,
      impactThreshold: 3.1,
      fragility: 10,
      crushLimit: 999,
      uprightOnly: false,
      cushion: 1.0,
      tags: ['重い', '頑丈'],
      desc: '四角くて頑丈。他の荷物を支える土台に最適。',
      color: '#edf2f7',
    },
    tansu: {
      id: 'tansu',
      name: '桐タンス',
      w: 0.86,
      h: 0.94,
      massKg: 58,
      physMass: 5.0,
      value: 15000,
      friction: 0.62,
      restitution: 0.03,
      impactThreshold: 2.7,
      fragility: 13,
      crushLimit: 999,
      uprightOnly: false,
      cushion: 1.0,
      tags: ['超重い', '高報酬'],
      desc: '立派な和ダンス。重心が偏りやすいので位置選びがカギ。',
      color: '#b87a46',
    },
    bookshelf: {
      id: 'bookshelf',
      name: '本棚',
      w: 0.74,
      h: 1.02,
      massKg: 34,
      physMass: 3.3,
      value: 7500,
      friction: 0.60,
      restitution: 0.04,
      impactThreshold: 2.6,
      fragility: 14,
      crushLimit: 180,
      uprightOnly: false,
      cushion: 1.0,
      tags: ['背が高い'],
      desc: '立てると倒れやすい。横倒しにして積むのもアリ！',
      color: '#c9935b',
    },
    kotatsu: {
      id: 'kotatsu',
      name: 'こたつ机',
      w: 0.90,
      h: 0.36,
      massKg: 22,
      physMass: 2.5,
      value: 8000,
      friction: 0.66,
      restitution: 0.05,
      impactThreshold: 3.0,
      fragility: 12,
      crushLimit: 240,
      uprightOnly: false,
      cushion: 0.88,
      tags: ['広い天板', '頑丈'],
      desc: '幅広で上に荷物を乗せやすい便利な中段プレート。',
      color: '#b46238',
    },
    box_books: {
      id: 'box_books',
      name: '段ボール(本)',
      w: 0.50,
      h: 0.36,
      massKg: 26,
      physMass: 2.8,
      value: 4500,
      friction: 0.78,
      restitution: 0.03,
      impactThreshold: 3.5,
      fragility: 8,
      crushLimit: 260,
      uprightOnly: false,
      cushion: 0.92,
      tags: ['滑りにくい', '土台向き'],
      desc: 'ぎっしり詰まった漫画と参考書。摩擦が高くズレにくい！',
      color: '#cfa16d',
    },
    box_dishes: {
      id: 'box_dishes',
      name: '段ボール(食器)',
      w: 0.48,
      h: 0.36,
      massKg: 15,
      physMass: 1.9,
      value: 9500,
      friction: 0.72,
      restitution: 0.03,
      impactThreshold: 1.55,
      fragility: 30,
      crushLimit: 56,
      uprightOnly: false,
      cushion: 1.0,
      fragileSound: 'glass',
      tags: ['ワレモノ', '圧力注意'],
      desc: 'お皿ぎっしり。強い衝撃や重い荷物の下敷きは厳禁！',
      color: '#d9ae7a',
    },
    box_mikan: {
      id: 'box_mikan',
      name: 'みかん箱(雑貨)',
      w: 0.46,
      h: 0.32,
      massKg: 12,
      physMass: 1.6,
      value: 4000,
      friction: 0.74,
      restitution: 0.04,
      impactThreshold: 2.8,
      fragility: 12,
      crushLimit: 110,
      uprightOnly: false,
      cushion: 0.90,
      tags: ['すき間埋め'],
      desc: '引っ越しの定番。空いたスペースのすき間埋めにぴったり。',
      color: '#deb072',
    },
    futon: {
      id: 'futon',
      name: '布団袋',
      w: 0.82,
      h: 0.38,
      massKg: 9,
      physMass: 1.35,
      value: 5500,
      friction: 0.92,
      restitution: 0.02,
      impactThreshold: 5.5,
      fragility: 4,
      crushLimit: 999,
      uprightOnly: false,
      cushion: 0.42,
      tags: ['クッション', '超グリップ'],
      desc: 'ふかふか衝撃吸収！ワレモノの下や横に挟むと大活躍。',
      color: '#4e85b8',
    },
    microwave: {
      id: 'microwave',
      name: '電子レンジ',
      w: 0.52,
      h: 0.34,
      massKg: 16,
      physMass: 2.0,
      value: 7000,
      friction: 0.52,
      restitution: 0.05,
      impactThreshold: 2.05,
      fragility: 22,
      crushLimit: 105,
      uprightOnly: false,
      cushion: 1.0,
      fragileSound: 'glass',
      tags: ['やや繊細'],
      desc: 'ガラス扉がちょっと繊細。上に重すぎる物は避けよう。',
      color: '#f3f5f8',
    },
    tv: {
      id: 'tv',
      name: '薄型テレビ',
      w: 0.92,
      h: 0.56,
      massKg: 14,
      physMass: 1.8,
      value: 18000,
      friction: 0.50,
      restitution: 0.04,
      impactThreshold: 1.40,
      fragility: 34,
      crushLimit: 44,
      uprightOnly: false,
      cushion: 1.0,
      fragileSound: 'glass',
      tags: ['超ワレモノ', '高報酬'],
      desc: '高価な4Kテレビ。衝撃にも重みにも超弱い！丁寧な扱いを。',
      color: '#252b36',
    },
    pc_monitor: {
      id: 'pc_monitor',
      name: 'PC一式',
      w: 0.62,
      h: 0.46,
      massKg: 18,
      physMass: 2.1,
      value: 16500,
      friction: 0.56,
      restitution: 0.04,
      impactThreshold: 1.55,
      fragility: 30,
      crushLimit: 52,
      uprightOnly: false,
      cushion: 1.0,
      fragileSound: 'glass',
      tags: ['精密機器', '高報酬'],
      desc: '大切な仕事＆ゲーム用PC。落とすと弁償額が痛い！',
      color: '#2c3244',
    },
    guitar: {
      id: 'guitar',
      name: 'ギターケース',
      w: 0.98,
      h: 0.30,
      massKg: 7,
      physMass: 1.25,
      value: 12000,
      friction: 0.58,
      restitution: 0.05,
      impactThreshold: 1.75,
      fragility: 26,
      crushLimit: 50,
      uprightOnly: false,
      cushion: 1.0,
      tags: ['細長い', '高報酬'],
      desc: '愛用のアコギ入り。軽くて長いのでロープで押さえると安心。',
      color: '#533528',
    },
    plant: {
      id: 'plant',
      name: '観葉植物',
      w: 0.42,
      h: 0.74,
      massKg: 11,
      physMass: 1.55,
      value: 8500,
      friction: 0.65,
      restitution: 0.04,
      impactThreshold: 1.85,
      fragility: 24,
      crushLimit: 48,
      uprightOnly: true,
      uprightMaxDeg: 52,
      tiltDps: 26,
      cushion: 1.0,
      fragileSound: 'ceramic',
      tags: ['転倒厳禁', 'ワレモノ'],
      desc: '大きく傾くと土がこぼれる！荷物の間に挟むかロープで固定。',
      color: '#5ca352',
    },
    fishbowl: {
      id: 'fishbowl',
      name: '金魚鉢セット',
      w: 0.46,
      h: 0.46,
      massKg: 10,
      physMass: 1.45,
      value: 17000,
      friction: 0.62,
      restitution: 0.03,
      impactThreshold: 1.25,
      fragility: 38,
      crushLimit: 36,
      uprightOnly: true,
      uprightMaxDeg: 42,
      tiltDps: 36,
      cushion: 1.0,
      fragileSound: 'water',
      tags: ['超ワレモノ', '転倒厳禁', '超高報酬'],
      desc: '水満タンの金魚鉢！傾きも衝撃も厳禁だが運べば超高額報酬。',
      color: '#6ec9e8',
    },
  };

  function getItemDef(id) {
    return ITEM_DEFS[id] || null;
  }

  function getDamageState(hp) {
    if (hp >= 72) return 'intact';
    if (hp >= 25) return 'damaged';
    return 'broken';
  }

  function drawItemGraphic(ctx, def, wPx, hPx, state, animTime) {
    const hw = wPx * 0.5;
    const hh = hPx * 0.5;
    const t = animTime || 0;

    ctx.save();
    const outline = state === 'broken' ? '#5c2620' : '#2c241d';
    const lw = Math.max(1.6, Math.min(2.8, Math.min(wPx, hPx) * 0.045));

    function roundRect(x, y, w, h, r) {
      const rr = Math.min(r, w * 0.45, h * 0.45);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    }

    switch (def.id) {
      case 'fridge': {
        roundRect(-hw, -hh, wPx, hPx, 5);
        const grad = ctx.createLinearGradient(-hw, -hh, hw, hh);
        grad.addColorStop(0, '#eef5fa');
        grad.addColorStop(1, '#c3d5e2');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = lw;
        ctx.stroke();

        const splitY = hh * 0.18;
        ctx.beginPath();
        ctx.moveTo(-hw + 2, splitY);
        ctx.lineTo(hw - 2, splitY);
        ctx.strokeStyle = '#6f8799';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        ctx.fillStyle = '#7b92a3';
        roundRect(hw - wPx * 0.22, -hh + hPx * 0.18, wPx * 0.09, hPx * 0.30, 2);
        ctx.fill();
        roundRect(hw - wPx * 0.22, splitY + hPx * 0.08, wPx * 0.09, hPx * 0.20, 2);
        ctx.fill();

        ctx.fillStyle = '#e75a4d';
        ctx.beginPath();
        ctx.arc(-hw + wPx * 0.28, -hh + hPx * 0.22, Math.max(2.5, wPx * 0.07), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f2b830';
        ctx.fillRect(-hw + wPx * 0.22, -hh + hPx * 0.34, wPx * 0.24, hPx * 0.09);
        break;
      }

      case 'washer': {
        roundRect(-hw, -hh, wPx, hPx, 4);
        ctx.fillStyle = '#f2f6fa';
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = lw;
        ctx.stroke();

        ctx.fillStyle = '#cfdbe6';
        ctx.fillRect(-hw + 2, -hh + 2, wPx - 4, hPx * 0.20);
        ctx.beginPath();
        ctx.moveTo(-hw + 2, -hh + hPx * 0.20);
        ctx.lineTo(hw - 2, -hh + hPx * 0.20);
        ctx.strokeStyle = '#7e93a6';
        ctx.lineWidth = 1.3;
        ctx.stroke();

        ctx.fillStyle = '#4e91d4';
        ctx.beginPath();
        ctx.arc(hw - wPx * 0.22, -hh + hPx * 0.11, Math.max(2.2, wPx * 0.07), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e0644e';
        ctx.fillRect(-hw + wPx * 0.14, -hh + hPx * 0.08, wPx * 0.20, hPx * 0.06);

        const drumR = Math.min(wPx, hPx) * 0.29;
        ctx.beginPath();
        ctx.arc(0, hPx * 0.10, drumR, 0, Math.PI * 2);
        ctx.fillStyle = '#53687e';
        ctx.fill();
        ctx.strokeStyle = '#9db0c2';
        ctx.lineWidth = Math.max(2, wPx * 0.06);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, hPx * 0.10, drumR * 0.72, 0, Math.PI * 2);
        ctx.fillStyle = '#89b7d6';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-drumR * 0.18, hPx * 0.10 - drumR * 0.18, drumR * 0.3, Math.PI, Math.PI * 1.65);
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      }

      case 'tansu': {
        roundRect(-hw, -hh, wPx, hPx, 3);
        ctx.fillStyle = '#ba7d48';
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = lw;
        ctx.stroke();

        const rows = 4;
        const pad = 4;
        const rowH = (hPx - pad * 2) / rows;
        for (let i = 0; i < rows; i++) {
          const y = -hh + pad + i * rowH;
          ctx.fillStyle = i % 2 === 0 ? '#c88b55' : '#b2743f';
          ctx.fillRect(-hw + pad, y + 1.5, wPx - pad * 2, rowH - 3);
          ctx.strokeStyle = '#6c4220';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(-hw + pad, y + 1.5, wPx - pad * 2, rowH - 3);
          ctx.fillStyle = '#2d2926';
          ctx.fillRect(-wPx * 0.24, y + rowH * 0.42, wPx * 0.14, 3);
          ctx.fillRect(wPx * 0.10, y + rowH * 0.42, wPx * 0.14, 3);
        }
        ctx.fillStyle = '#332e2a';
        const bs = Math.max(4, wPx * 0.08);
        ctx.fillRect(-hw + 1, -hh + 1, bs, bs);
        ctx.fillRect(hw - bs - 1, -hh + 1, bs, bs);
        ctx.fillRect(-hw + 1, hh - bs - 1, bs, bs);
        ctx.fillRect(hw - bs - 1, hh - bs - 1, bs, bs);
        break;
      }

      case 'bookshelf': {
        roundRect(-hw, -hh, wPx, hPx, 2);
        ctx.fillStyle = '#b9834c';
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = lw;
        ctx.stroke();

        const shelves = 3;
        const margin = Math.max(4, wPx * 0.08);
        const innerW = wPx - margin * 2;
        const innerH = hPx - margin * 2;
        const sh = innerH / shelves;
        const bookColors = ['#d9534f', '#3b7ea1', '#e8b948', '#5aa162', '#8e62a8', '#e57e40'];

        for (let r = 0; r < shelves; r++) {
          const sy = -hh + margin + r * sh;
          ctx.fillStyle = '#6e4726';
          ctx.fillRect(-hw + margin, sy + 2, innerW, sh - 4);
          let bx = -hw + margin + 2;
          let idx = r * 4;
          while (bx < hw - margin - 6) {
            const bw = Math.max(4, innerW * (0.11 + ((idx * 17) % 7) * 0.012));
            if (bx + bw > hw - margin - 2) break;
            const bh = (sh - 6) * (0.68 + ((idx * 13) % 5) * 0.07);
            ctx.fillStyle = bookColors[idx % bookColors.length];
            ctx.fillRect(bx, sy + sh - 2 - bh, bw - 1, bh);
            bx += bw;
            idx++;
          }
        }
        break;
      }

      case 'kotatsu': {
        ctx.fillStyle = '#c84b3e';
        roundRect(-hw + 3, -hh + hPx * 0.25, wPx - 6, hPx * 0.72, 4);
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = lw;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(248, 224, 174, 0.55)';
        ctx.lineWidth = 1.5;
        for (let x = -hw + wPx * 0.18; x < hw - 6; x += wPx * 0.18) {
          ctx.beginPath();
          ctx.moveTo(x, -hh + hPx * 0.30);
          ctx.lineTo(x, hh - 2);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(-hw + 5, hh * 0.35);
        ctx.lineTo(hw - 5, hh * 0.35);
        ctx.stroke();

        roundRect(-hw, -hh, wPx, hPx * 0.36, 3);
        ctx.fillStyle = '#9c5a2d';
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = lw;
        ctx.stroke();
        break;
      }

      case 'box_books':
      case 'box_dishes':
      case 'box_mikan': {
        roundRect(-hw, -hh, wPx, hPx, 2);
        ctx.fillStyle = def.color;
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = lw;
        ctx.stroke();

        ctx.fillStyle = 'rgba(235, 222, 192, 0.85)';
        ctx.fillRect(-hw + 2, -hh + 1, wPx - 4, Math.max(4, hPx * 0.16));
        ctx.fillRect(-wPx * 0.08, -hh + 1, wPx * 0.16, hPx * 0.52);

        if (def.id === 'box_books') {
          ctx.fillStyle = '#3b2d21';
          ctx.font = `bold ${Math.max(9, Math.round(hPx * 0.42))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('本', 0, hPx * 0.12);
        } else if (def.id === 'box_dishes') {
          ctx.fillStyle = '#d93829';
          roundRect(-wPx * 0.36, -hPx * 0.12, wPx * 0.72, hPx * 0.48, 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${Math.max(8, Math.round(hPx * 0.28))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('ワレモノ', 0, hPx * 0.12);
        } else {
          ctx.fillStyle = '#eb7b1e';
          ctx.beginPath();
          ctx.arc(-wPx * 0.16, hPx * 0.12, Math.max(4, hPx * 0.22), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#4e9141';
          ctx.fillRect(-wPx * 0.18, -hPx * 0.14, 4, 4);
          ctx.fillStyle = '#8b3e14';
          ctx.font = `bold ${Math.max(8, Math.round(hPx * 0.26))}px sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText('みかん', 0, hPx * 0.12);
        }
        break;
      }

      case 'futon': {
        roundRect(-hw, -hh, wPx, hPx, Math.min(12, hPx * 0.42));
        ctx.fillStyle = '#538bc0';
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = lw;
        ctx.stroke();

        ctx.fillStyle = '#6da4d6';
        roundRect(-hw + 4, -hh + 4, wPx - 8, hPx * 0.38, 6);
        ctx.fill();

        ctx.fillStyle = '#f4efe4';
        ctx.fillRect(-wPx * 0.26, -hh + 1, wPx * 0.08, hPx - 2);
        ctx.fillRect(wPx * 0.18, -hh + 1, wPx * 0.08, hPx - 2);

        ctx.strokeStyle = '#2c4d6e';
        ctx.setLineDash([3, 2]);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-hw + 6, 0);
        ctx.lineTo(hw - 6, 0);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }

      case 'microwave': {
        roundRect(-hw, -hh, wPx, hPx, 4);
        ctx.fillStyle = '#f2f4f7';
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = lw;
        ctx.stroke();

        roundRect(-hw + wPx * 0.08, -hh + hPx * 0.14, wPx * 0.60, hPx * 0.70, 3);
        ctx.fillStyle = state === 'broken' ? '#403435' : '#2d3745';
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(-hw + wPx * 0.12, -hh + hPx * 0.20, wPx * 0.16, hPx * 0.56);

        ctx.fillStyle = '#6e7c8a';
        ctx.beginPath();
        ctx.arc(hw - wPx * 0.16, -hh + hPx * 0.34, Math.max(2.5, hPx * 0.11), 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hw - wPx * 0.16, hh - hPx * 0.30, Math.max(2.5, hPx * 0.11), 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'tv': {
        ctx.fillStyle = '#39414f';
        ctx.fillRect(-wPx * 0.24, hh - hPx * 0.12, wPx * 0.48, hPx * 0.12);
        ctx.fillRect(-wPx * 0.07, hh - hPx * 0.22, wPx * 0.14, hPx * 0.12);

        roundRect(-hw, -hh, wPx, hPx * 0.84, 3);
        ctx.fillStyle = '#232830';
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = lw;
        ctx.stroke();

        const pad = Math.max(3, wPx * 0.05);
        ctx.fillStyle = state === 'broken' ? '#1e2126' : '#31445c';
        ctx.fillRect(-hw + pad, -hh + pad, wPx - pad * 2, hPx * 0.84 - pad * 2);

        if (state !== 'broken') {
          ctx.fillStyle = 'rgba(170, 215, 255, 0.16)';
          ctx.beginPath();
          ctx.moveTo(-hw + pad + 4, -hh + pad);
          ctx.lineTo(-hw + pad + wPx * 0.32, -hh + pad);
          ctx.lineTo(-hw + pad + wPx * 0.12, -hh + hPx * 0.84 - pad);
          ctx.lineTo(-hw + pad, -hh + hPx * 0.84 - pad);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = '#ff4d6d';
          ctx.fillRect(-wPx * 0.15, -hh + pad, 3, hPx * 0.72);
          ctx.fillStyle = '#39e5ff';
          ctx.fillRect(-wPx * 0.10, -hh + pad, 2, hPx * 0.72);
        }
        ctx.fillStyle = state === 'broken' ? '#555' : '#43e072';
        ctx.beginPath();
        ctx.arc(hw - pad - 3, -hh + hPx * 0.84 - 3, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'pc_monitor': {
        roundRect(-hw, -hh, wPx, hPx, 3);
        ctx.fillStyle = '#293040';
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = lw;
        ctx.stroke();

        ctx.fillStyle = '#181d29';
        ctx.fillRect(-hw + wPx * 0.08, -hh + hPx * 0.12, wPx * 0.56, hPx * 0.76);
        if (state !== 'broken') {
          const glow = ctx.createLinearGradient(-hw, -hh, hw, hh);
          glow.addColorStop(0, '#4be8ff');
          glow.addColorStop(0.5, '#a864ff');
          glow.addColorStop(1, '#ff5992');
          ctx.strokeStyle = glow;
          ctx.lineWidth = 2;
          ctx.strokeRect(-hw + wPx * 0.12, -hh + hPx * 0.18, wPx * 0.48, hPx * 0.64);
          ctx.fillStyle = glow;
          ctx.fillRect(hw - wPx * 0.18, -hh + hPx * 0.14, wPx * 0.07, hPx * 0.72);
        }
        break;
      }

      case 'guitar': {
        roundRect(-hw, -hh + 1, wPx, hPx - 2, Math.min(10, hPx * 0.42));
        ctx.fillStyle = '#5c3b29';
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = lw;
        ctx.stroke();

        ctx.strokeStyle = '#332016';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-hw + 4, 0);
        ctx.lineTo(hw - 4, 0);
        ctx.stroke();

        ctx.fillStyle = '#e6be4c';
        ctx.fillRect(-wPx * 0.30, -3, 6, 6);
        ctx.fillRect(0, -3, 7, 6);
        ctx.fillRect(wPx * 0.28, -3, 6, 6);

        ctx.fillStyle = '#f26b4e';
        ctx.beginPath();
        ctx.arc(-wPx * 0.14, -hPx * 0.22, Math.max(2.5, hPx * 0.16), 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'plant': {
        const potTop = hh - hPx * 0.44;
        ctx.beginPath();
        ctx.moveTo(-wPx * 0.36, potTop);
        ctx.lineTo(wPx * 0.36, potTop);
        ctx.lineTo(wPx * 0.26, hh);
        ctx.lineTo(-wPx * 0.26, hh);
        ctx.closePath();
        ctx.fillStyle = state === 'broken' ? '#9e5038' : '#c96b43';
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = lw;
        ctx.stroke();

        roundRect(-wPx * 0.40, potTop - hPx * 0.08, wPx * 0.80, hPx * 0.10, 2);
        ctx.fillStyle = '#d87b52';
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#3a6e35';
        ctx.lineWidth = Math.max(1.8, wPx * 0.07);
        ctx.beginPath();
        ctx.moveTo(0, potTop - hPx * 0.06);
        ctx.lineTo(0, -hh + hPx * 0.22);
        ctx.stroke();

        const leafColor = state === 'broken' ? '#7a8a4b' : '#4ca146';
        const leaves = [
          { x: -wPx * 0.22, y: -hh + hPx * 0.36, rx: wPx * 0.22, ry: hPx * 0.11, rot: -0.45 },
          { x: wPx * 0.22, y: -hh + hPx * 0.34, rx: wPx * 0.22, ry: hPx * 0.11, rot: 0.45 },
          { x: -wPx * 0.16, y: -hh + hPx * 0.18, rx: wPx * 0.20, ry: hPx * 0.10, rot: -0.75 },
          { x: wPx * 0.18, y: -hh + hPx * 0.17, rx: wPx * 0.20, ry: hPx * 0.10, rot: 0.72 },
          { x: 0, y: -hh + hPx * 0.10, rx: wPx * 0.15, ry: hPx * 0.11, rot: 0 },
        ];
        for (const lf of leaves) {
          ctx.save();
          ctx.translate(lf.x, lf.y);
          ctx.rotate(lf.rot + (state === 'broken' ? 0.5 : 0));
          ctx.beginPath();
          ctx.ellipse(0, 0, lf.rx, lf.ry, 0, 0, Math.PI * 2);
          ctx.fillStyle = leafColor;
          ctx.fill();
          ctx.strokeStyle = '#254a22';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.restore();
        }
        break;
      }

      case 'fishbowl': {
        ctx.fillStyle = '#754929';
        roundRect(-hw + 2, hh - hPx * 0.16, wPx - 4, hPx * 0.16, 2);
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = lw;
        ctx.stroke();

        roundRect(-hw + 3, -hh + 2, wPx - 6, hPx * 0.84, 5);
        ctx.fillStyle = 'rgba(206, 241, 255, 0.55)';
        ctx.fill();
        ctx.strokeStyle = state === 'broken' ? '#6e342d' : '#3a7a99';
        ctx.lineWidth = lw;
        ctx.stroke();

        const waterRatio = state === 'intact' ? 0.62 : state === 'damaged' ? 0.34 : 0.08;
        const waterH = (hPx * 0.80) * waterRatio;
        const waterTop = hh - hPx * 0.16 - waterH;
        ctx.fillStyle = 'rgba(72, 185, 232, 0.65)';
        ctx.fillRect(-hw + 5, waterTop, wPx - 10, waterH - 1);

        ctx.strokeStyle = '#389957';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-wPx * 0.22, hh - hPx * 0.18);
        ctx.quadraticCurveTo(-wPx * 0.28, waterTop + waterH * 0.4, -wPx * 0.18, waterTop + 4);
        ctx.stroke();

        const fx = Math.sin(t * 2.5) * wPx * 0.12;
        const fy = waterTop + waterH * 0.45 + Math.cos(t * 3.1) * 2;
        ctx.fillStyle = '#ff6d29';
        ctx.beginPath();
        ctx.ellipse(fx, fy, Math.max(3.5, wPx * 0.12), Math.max(2.2, hPx * 0.08), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(fx - wPx * 0.10, fy);
        ctx.lineTo(fx - wPx * 0.20, fy - 4);
        ctx.lineTo(fx - wPx * 0.20, fy + 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(fx + wPx * 0.05, fy - 1, 1.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      default: {
        roundRect(-hw, -hh, wPx, hPx, 3);
        ctx.fillStyle = def.color || '#ccc';
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = lw;
        ctx.stroke();
      }
    }

    if (state === 'damaged' || state === 'broken') {
      ctx.strokeStyle = state === 'broken' ? '#1c0f0e' : '#3d2a23';
      ctx.lineWidth = state === 'broken' ? 2.0 : 1.3;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.55, -hh * 0.45);
      ctx.lineTo(-hw * 0.12, -hh * 0.05);
      ctx.lineTo(-hw * 0.30, hh * 0.30);
      ctx.moveTo(-hw * 0.12, -hh * 0.05);
      ctx.lineTo(hw * 0.35, -hh * 0.18);
      if (state === 'broken') {
        ctx.moveTo(hw * 0.45, hh * 0.45);
        ctx.lineTo(hw * 0.05, hh * 0.05);
        ctx.lineTo(hw * 0.32, -hh * 0.42);
        ctx.moveTo(-hw * 0.48, hh * 0.35);
        ctx.lineTo(hw * 0.15, hh * 0.20);
      }
      ctx.stroke();

      if (state === 'broken') {
        ctx.fillStyle = 'rgba(70, 20, 15, 0.22)';
        ctx.fillRect(-hw, -hh, wPx, hPx);
      }
    }

    ctx.restore();
  }

  const exportsObj = {
    ITEM_DEFS,
    getItemDef,
    getDamageState,
    drawItemGraphic,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObj;
  } else {
    global.Keitora = Object.assign(global.Keitora || {}, exportsObj);
  }
})(typeof window !== 'undefined' ? window : globalThis);
