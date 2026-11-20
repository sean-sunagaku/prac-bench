// うみかぜ水族館 来期リニューアル投資方針（案） 経営会議 付議資料の生成スクリプト
// 実行: NODE_PATH=$(npm root -g) node _build/build_deck.js
//
// 数値のルール
// - 使うのは支給メモの記載値（経理の業績表・正式見積・関係者の意見）と、その四則演算で出せる値だけ。
// - 算出した値は、資料の付録2に計算式を載せて検算できるようにする。
// - 推計値・見込み値（効果予測、工期、税込換算など）は入れない。

const fs = require('fs');
const path = require('path');
const PptxGenJS = require('pptxgenjs');
const JSZip = require(path.join(path.dirname(require.resolve('pptxgenjs')), '..', 'node_modules', 'jszip'));

const OUT = path.join(__dirname, '..', 'うみかぜ水族館_リニューアル投資方針_経営会議資料.pptx');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 inch
pptx.title = '来期リニューアル投資方針（案）';
pptx.subject = '経営会議 付議資料';
pptx.company = 'うみかぜ水族館';
pptx.author = 'うみかぜ水族館';

// ---------------------------------------------------------------------------
// デザインの基本設定
// ---------------------------------------------------------------------------
const W = 13.333;
const L = 0.55;
const R = 0.55;
const CW = W - L - R;
const FONT = 'Hiragino Sans';
const TOTAL = 14;
const LANG = 'ja-JP';

const C = {
  navy: '0E2A47',
  blue: '1F5F99',
  sky: 'E9F1F8',
  teal: '17806D',
  tealL: 'E2F1EC',
  red: 'C0392B',
  redL: 'FBEAE8',
  amber: 'A86400',
  amberL: 'FDF1DC',
  gray: '5F6B7A',
  grayL: 'F3F5F7',
  line: 'CFD8E2',
  text: '1F2A37',
  white: 'FFFFFF',
  barLight: '9DB9D5',
  violet: '5B4B8A',
  violetL: 'EEEAF6',
  green: '1F7A70',
  greenL: 'E3F1EF',
};

const T = pptx.ShapeType;
const NOLINE = { color: C.white, width: 0, transparency: 100 };

function box(slide, x, y, w, h, fill, lineColor) {
  slide.addShape(T.rect, {
    x, y, w, h,
    fill: { color: fill },
    line: lineColor ? { color: lineColor, width: 0.75 } : NOLINE,
  });
}

function text(slide, t, o) {
  slide.addText(t, { fontFace: FONT, color: C.text, margin: 0, lang: LANG, ...o });
}

function header(slide, section, title) {
  text(slide, section, { x: L, y: 0.28, w: 8, h: 0.3, fontSize: 10.5, bold: true, color: C.blue });
  text(slide, title, { x: L, y: 0.58, w: CW, h: 0.7, fontSize: 21, bold: true, color: C.navy, valign: 'middle' });
  slide.addShape(T.rect, { x: L, y: 1.33, w: CW, h: 0.02, fill: { color: C.navy }, line: NOLINE });
}

function footer(slide, n) {
  text(slide, 'うみかぜ水族館　2026年11月 経営会議　｜　社外秘', {
    x: L, y: 7.1, w: 7, h: 0.25, fontSize: 8.5, color: C.gray,
  });
  text(slide, `${n} / ${TOTAL}`, {
    x: W - R - 1.2, y: 7.1, w: 1.2, h: 0.25, fontSize: 8.5, color: C.gray, align: 'right',
  });
}

function footnote(slide, t, y, h) {
  text(slide, t, { x: L, y, w: CW, h, fontSize: 8.5, color: C.gray, valign: 'top', lineSpacingMultiple: 1.1 });
}

// 表のセル
const th = (t, o = {}) => ({
  text: t,
  options: { bold: true, color: C.white, fill: { color: C.navy }, align: 'center', valign: 'middle', fontSize: 11, lang: LANG, ...o },
});
const td = (t, o = {}) => ({ text: t, options: { color: C.text, valign: 'middle', fontSize: 11, lang: LANG, ...o } });
// 見出し語＋補足（2行）のセル
const td2 = (main, sub, mainColor = C.text, o = {}) => ({
  text: [
    { text: main, options: { bold: true, color: mainColor, fontSize: o.mainSize || 12, breakLine: true, lang: LANG } },
    { text: sub, options: { color: C.gray, fontSize: o.subSize || 9.5, lang: LANG } },
  ],
  options: { valign: 'middle', align: o.align || 'left', fill: o.fill, lang: LANG },
});
// 記号（○△×）＋説明のセル
const mark = (m, t, color, o = {}) => ({
  text: [
    { text: `${m}　`, options: { bold: true, color, fontSize: 15, lang: LANG } },
    { text: t, options: { color: C.text, fontSize: 10.5, lang: LANG } },
  ],
  options: { valign: 'middle', lang: LANG, ...o },
});

function table(slide, rows, o) {
  slide.addTable(rows, {
    fontFace: FONT,
    border: { type: 'solid', pt: 0.75, color: C.line },
    margin: [0.05, 0.08, 0.05, 0.08],
    autoPage: false,
    lang: LANG,
    ...o,
  });
}

// ---------------------------------------------------------------------------
// 1. 表紙
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  s.background = { color: C.navy };
  [
    [9.9, 0.7, 3.9],
    [11.7, 4.4, 2.2],
    [8.7, 4.95, 1.2],
  ].forEach(([x, y, d]) => s.addShape(T.ellipse, {
    x, y, w: d, h: d,
    fill: { color: C.white, transparency: 93 },
    line: { color: C.white, width: 0.75, transparency: 75 },
  }));
  text(s, '経営会議 付議資料', { x: 0.9, y: 0.85, w: 5, h: 0.35, fontSize: 13, color: 'BFD7EA' });
  text(s, '社外秘', {
    x: 0.9, y: 1.3, w: 0.95, h: 0.34, fontSize: 11, bold: true, color: C.white,
    align: 'center', valign: 'middle', line: { color: C.white, width: 1 },
  });
  text(s, '来期リニューアル投資方針（案）', { x: 0.9, y: 2.3, w: 10.5, h: 1.0, fontSize: 38, bold: true, color: C.white });
  text(s, '投資配分と着工時期について、ご決定のお願い', { x: 0.9, y: 3.35, w: 10.5, h: 0.55, fontSize: 19, color: 'D6E6F3' });
  s.addShape(T.rect, { x: 0.9, y: 4.25, w: 1.3, h: 0.06, fill: { color: '4FB3A9' }, line: NOLINE });
  text(s, 'うみかぜ水族館', { x: 0.9, y: 4.55, w: 6, h: 0.45, fontSize: 18, bold: true, color: C.white });
  text(s, '2026年11月', { x: 0.9, y: 5.05, w: 6, h: 0.4, fontSize: 14, color: 'D6E6F3' });
  s.addNotes('本日は、来期のリニューアル投資の配分と着工方針についてご決定をお願いします。数値はすべて経理の業績表を正としています。');
}

// ---------------------------------------------------------------------------
// 2. 本日の決議事項と推奨
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  header(s, '決議事項', '本日ご決定いただきたいこと：来期の投資配分と4月着工の方針');

  box(s, L, 1.55, CW, 0.78, C.sky);
  box(s, L, 1.55, 0.09, 0.78, C.teal);
  text(s, [
    { text: '推奨　', options: { bold: true, color: C.teal } },
    {
      text: 'ろ過設備の更新を4月着工で確定し、B案（バックヤード体験ツアーの改修＋カフェの改装）と合わせた総額1億円で承認する。A案（館内全面のプロジェクションマッピング）は、現行の内容では見送る。',
      options: { bold: true, color: C.navy },
    },
  ], { x: L + 0.28, y: 1.55, w: CW - 0.4, h: 0.78, fontSize: 13.5, valign: 'middle', lineSpacingMultiple: 1.1 });

  const rows = [
    [th('No.'), th('決議事項'), th('金額'), th('推奨')],
    [td('1', { align: 'center', bold: true }), td('大水槽のろ過設備の更新（2027年4月着工）', { fontSize: 11.5 }),
      td('6,000万円（税別）', { align: 'right' }), td2('承認', '先送り不可。最優先で着工する', C.teal)],
    [td('2', { align: 'center', bold: true }), td('バックヤード体験ツアーの改修', { fontSize: 11.5 }),
      td('1,500万円', { align: 'right' }), td2('承認', '客単価と満足度の向上をねらう', C.teal)],
    [td('3', { align: 'center', bold: true }), td('地元漁港との連携を想定したカフェの改装', { fontSize: 11.5 }),
      td('2,500万円', { align: 'right' }), td2('条件付き承認', '漁港との条件合意を着工の条件とする', C.amber)],
    [td('4', { align: 'center', bold: true }), td('館内全面のプロジェクションマッピング（PM）とデジタル万華鏡水槽', { fontSize: 11.5 }),
      td('9,500万円', { align: 'right' }), td2('見送り（現行案）', '若年層向け施策は余力の範囲で再提案', C.red)],
    [td('5', { align: 'center', bold: true }), td('3年収支計画（黒字化の数値の裏付け）', { fontSize: 11.5 }),
      td('―', { align: 'center' }), td2('次回の経営会議で審議', '各施策の効果見積を含める', C.blue)],
    [
      { text: '承認額の合計（No.1〜3）', options: { colspan: 2, bold: true, color: C.navy, fill: { color: C.sky }, align: 'right', valign: 'middle', fontSize: 11.5 } },
      td('1億円', { bold: true, color: C.navy, fill: { color: C.sky }, align: 'right', fontSize: 13 }),
      td('上限1.5億円の範囲内（残る5,000万円は留保）', { bold: true, color: C.navy, fill: { color: C.sky }, fontSize: 10 }),
    ],
  ];
  table(s, rows, { x: L, y: 2.5, w: 8.25, colW: [0.5, 3.6, 1.6, 2.55], rowH: [0.38, 0.6, 0.6, 0.6, 0.68, 0.6, 0.5] });

  const px = L + 8.25 + 0.3;
  const pw = W - R - px;
  box(s, px, 2.5, pw, 4.35, C.grayL);
  text(s, '判断の根拠', { x: px + 0.2, y: 2.62, w: pw - 0.4, h: 0.32, fontSize: 13, bold: true, color: C.navy });
  text(s, [
    { text: '① 投資上限', options: { bold: true, color: C.navy, breakLine: true } },
    { text: 'A案は1億5,500万円で、上限を500万円超える。B案は1億円で収まる', options: { breakLine: true } },
    { text: ' ', options: { fontSize: 5, breakLine: true } },
    { text: '② 動物福祉', options: { bold: true, color: C.navy, breakLine: true } },
    { text: '全面PMの強い光と音について、飼育の立場から魚のストレスと死亡リスクが指摘されている', options: { breakLine: true } },
    { text: ' ', options: { fontSize: 5, breakLine: true } },
    { text: '③ 着工時期', options: { bold: true, color: C.navy, breakLine: true } },
    { text: 'ろ過設備の更新は先送りできない。4月着工に向け、本日の決定後すぐに資金調達と発注準備に入る必要がある', options: {} },
  ], { x: px + 0.2, y: 3.02, w: pw - 0.4, h: 2.45, fontSize: 11, valign: 'top', lineSpacingMultiple: 1.1 });
  s.addShape(T.line, { x: px + 0.2, y: 5.55, w: pw - 0.4, h: 0, line: { color: C.line, width: 0.75 } });
  text(s, [
    { text: '留意点', options: { bold: true, color: C.amber, breakLine: true } },
    { text: '黒字化（年＋3,000万円）には、費用が横ばいでも売上を＋6,800万円（約15%）伸ばす必要がある。各施策の効果見積はまだ無く、次回の経営会議で確認する', options: {} },
  ], { x: px + 0.2, y: 5.65, w: pw - 0.4, h: 1.15, fontSize: 10.5, valign: 'top', lineSpacingMultiple: 1.1 });

  footer(s, 2);
  s.addNotes([
    '結論から申し上げます。推奨は、必須のろ過設備更新にB案の2施策を加えた総額1億円です。',
    'A案は投資上限を500万円超え、飼育の立場から生体へのリスクも指摘されているため、現行の内容では見送りを提案します。',
    'ただし若年層の取り込みという狙い自体は残し、生体に負荷をかけない内容で、残る5,000万円の範囲で再提案してもらいます。',
    '黒字化の数値的な裏付けは、各施策の効果見積を揃えたうえで次回の経営会議で提示します。',
    '本日は、4月着工に間に合わせるために投資配分の方針を先に決めていただきたい、という趣旨です。',
  ].join('\n'));
}

// ---------------------------------------------------------------------------
// 3. 現状
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  header(s, '現状', '入館者の減少で3年連続の営業赤字となり、赤字幅は毎年広がっている');

  const years = ['2022', '2023', '2024', '2025'];
  const visitors = [31, 27, 24, 21];
  const prices = ['2,000', '2,050', '2,080', '2,100'];
  const sales = ['62,000', '55,350', '49,920', '44,100'];
  const profit = [900, -1200, -2600, -3800];
  const profitLabel = ['＋900', '▲1,200', '▲2,600', '▲3,800'];

  const top = 1.98;
  const base = 5.05;
  const bw = 0.62;
  const gap = 0.3;

  // 入館者数
  const ax = L;
  text(s, '入館者数（万人）', { x: ax, y: 1.55, w: 4, h: 0.32, fontSize: 12, bold: true, color: C.navy });
  const k1 = (base - top) / 45;
  const x1 = ax + 0.62;
  const peakY = base - 42 * k1;
  s.addShape(T.line, { x: x1 - 0.1, y: peakY, w: 3.55, h: 0, line: { color: C.gray, width: 1, dashType: 'dash' } });
  text(s, 'ピーク時 42万人', { x: x1 + 1.85, y: peakY - 0.3, w: 1.6, h: 0.26, fontSize: 9.5, color: C.gray, align: 'right' });
  visitors.forEach((v, i) => {
    const x = x1 + i * (bw + gap);
    const h = v * k1;
    s.addShape(T.rect, { x, y: base - h, w: bw, h, fill: { color: i === 3 ? C.navy : C.barLight }, line: NOLINE });
    text(s, `${v}`, { x: x - 0.2, y: base - h - 0.3, w: bw + 0.4, h: 0.28, fontSize: 12.5, bold: true, color: C.navy, align: 'center' });
    text(s, `${years[i]}年度`, { x: x - 0.2, y: base + 0.06, w: bw + 0.4, h: 0.26, fontSize: 9.5, align: 'center' });
    text(s, `${prices[i]}円`, { x: x - 0.2, y: base + 0.4, w: bw + 0.4, h: 0.26, fontSize: 9.5, color: C.gray, align: 'center' });
  });
  s.addShape(T.line, { x: x1 - 0.1, y: base, w: 3.55, h: 0, line: { color: C.gray, width: 0.75 } });
  text(s, '客単価', { x: ax, y: base + 0.4, w: 0.6, h: 0.26, fontSize: 9.5, bold: true, color: C.gray });

  // 営業損益
  const bx = L + 4.4;
  text(s, '営業損益（万円）', { x: bx, y: 1.55, w: 4, h: 0.32, fontSize: 12, bold: true, color: C.navy });
  const k2 = (base - top) / 6000; // +1,500 〜 ▲4,500 の範囲
  const zero = top + 1500 * k2;
  const x2 = bx + 0.75;
  profit.forEach((v, i) => {
    const x = x2 + i * (bw + gap);
    const h = Math.abs(v) * k2;
    const pos = v >= 0;
    s.addShape(T.rect, { x, y: pos ? zero - h : zero, w: bw, h, fill: { color: pos ? C.teal : C.red }, line: NOLINE });
    text(s, profitLabel[i], {
      x: x - 0.3, y: pos ? zero - h - 0.29 : zero + h + 0.02, w: bw + 0.6, h: 0.27,
      fontSize: 11.5, bold: true, color: pos ? C.teal : C.red, align: 'center',
    });
    text(s, `${years[i]}年度`, { x: x - 0.2, y: base + 0.06, w: bw + 0.4, h: 0.26, fontSize: 9.5, align: 'center' });
    text(s, sales[i], { x: x - 0.25, y: base + 0.4, w: bw + 0.5, h: 0.26, fontSize: 9.5, color: C.gray, align: 'center' });
  });
  s.addShape(T.line, { x: x2 - 0.1, y: zero, w: 3.55, h: 0, line: { color: C.gray, width: 0.75 } });
  text(s, '売上高\n（万円）', { x: bx, y: base + 0.36, w: 0.75, h: 0.4, fontSize: 8.5, bold: true, color: C.gray, lineSpacingMultiple: 0.95 });

  // ポイント
  const px = L + 8.85;
  const pw = W - R - px;
  box(s, px, 1.55, pw, 4.95, C.grayL);
  text(s, 'ポイント', { x: px + 0.2, y: 1.66, w: pw - 0.4, h: 0.32, fontSize: 13, bold: true, color: C.navy });
  text(s, [
    { text: '入館者はピーク時の42万人から、昨年度は21万人へ半減', options: { bullet: { indent: 12 }, breakLine: true } },
    { text: '客単価は2,000円から2,100円へ微増したが、客数の減少を補えていない', options: { bullet: { indent: 12 }, breakLine: true } },
    { text: '売上高は3年で1億7,900万円減り、営業損益は3年連続の赤字（昨年度▲3,800万円）。これ以上の先送りはできない', options: { bullet: { indent: 12 }, breakLine: true } },
    { text: '築28年。大水槽のろ過設備は限界にあり、更新しなければ最悪の場合、展示を止めることになる', options: { bullet: { indent: 12 } } },
  ], { x: px + 0.2, y: 2.08, w: pw - 0.35, h: 4.3, fontSize: 11.5, valign: 'top', paraSpaceAfter: 9, lineSpacingMultiple: 1.1 });

  footnote(s, '出所：経理の業績表（本資料の数値はこれを正とする）。2025年度の客単価2,100円の内訳は、入館料1,800円＋物販飲食300円。売上高は各年度とも「入館者数×客単価」と一致する。', 6.68, 0.36);
  footer(s, 3);
  s.addNotes([
    '数値はすべて経理の業績表を正としています。',
    '入館者は2022年度以降毎年減り、昨年度は21万人で、ピーク時42万人の半分です。',
    '客単価は少しずつ上がっていますが客数の減少を補えず、営業損益は3年連続の赤字で、赤字幅も毎年広がっています。',
    '加えて築28年で、大水槽のろ過設備が限界に来ており、更新しなければ最悪の場合は展示を止めることになります。',
  ].join('\n'));
}

// ---------------------------------------------------------------------------
// 4. 判断の前提
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  header(s, '判断の前提', '判断の前提：経営方針で示された4つの条件を評価の基準とする');

  const cards = [
    { no: '①', label: '投資', tag: '絶対条件', color: C.red, big: '上限 1.5億円', size: 26, desc: 'メインバンクからの調達で、必須の修繕費を含む総枠。これを超えない' },
    { no: '②', label: '動物福祉', tag: '前提条件', color: C.teal, big: '守ることが前提', size: 22, desc: '動物福祉を守ったうえで、集客と客単価を伸ばす' },
    { no: '③', label: '収益', tag: '目標', color: C.blue, big: '3年以内に\n年＋3,000万円以上', size: 18, desc: '集客と客単価を伸ばし、営業黒字へ転換する現実的な計画を示す' },
    { no: '④', label: '時期', tag: '目標', color: C.blue, big: '2027年4月 着工', size: 22, desc: '4月の着工を目標に、逆算して準備を進める' },
  ];
  const gap = 0.25;
  const cw = (CW - gap * 3) / 4;
  cards.forEach((c, i) => {
    const x = L + i * (cw + gap);
    box(s, x, 1.62, cw, 3.25, C.white, C.line);
    box(s, x, 1.62, cw, 0.5, c.color);
    text(s, `${c.no} ${c.label}`, { x: x + 0.15, y: 1.62, w: cw - 1.2, h: 0.5, fontSize: 14, bold: true, color: C.white, valign: 'middle' });
    text(s, c.tag, {
      x: x + cw - 1.08, y: 1.73, w: 0.93, h: 0.28, fontSize: 9.5, bold: true, color: c.color,
      align: 'center', valign: 'middle', fill: { color: C.white },
    });
    text(s, c.big, { x: x + 0.12, y: 2.25, w: cw - 0.24, h: 1.15, fontSize: c.size, bold: true, color: C.navy, align: 'center', valign: 'middle', lineSpacingMultiple: 1.05 });
    s.addShape(T.line, { x: x + 0.3, y: 3.52, w: cw - 0.6, h: 0, line: { color: C.line, width: 0.75 } });
    text(s, c.desc, { x: x + 0.2, y: 3.65, w: cw - 0.4, h: 1.15, fontSize: 12, valign: 'top', lineSpacingMultiple: 1.15 });
  });

  box(s, L, 5.12, CW, 1.5, C.sky);
  box(s, L, 5.12, 0.09, 1.5, C.navy);
  text(s, [
    { text: '所与の事項　', options: { bold: true, color: C.navy } },
    { text: '大水槽のろ過設備の更新（正式見積6,000万円・税別）は先送りできず、来期中に必須。どの案でも最初に確保する。', options: { breakLine: true } },
    { text: '→ 上限1.5億円からろ過設備の6,000万円を除くと、ほかの投資に使えるのは最大9,000万円', options: { bold: true, color: C.navy } },
  ], { x: L + 0.3, y: 5.12, w: CW - 0.45, h: 1.5, fontSize: 13, valign: 'middle', lineSpacingMultiple: 1.4 });

  footer(s, 4);
  s.addNotes([
    '各案を比べる物差しとして、経営方針で示された4つの条件を使います。',
    'とくに投資上限1.5億円は絶対条件、動物福祉は前提条件です。黒字化と4月着工は目標です。',
    'ろ過設備の更新は先送りできないため、どの案でも最初に6,000万円を確保します。残りの投資に使えるのは最大9,000万円です。',
  ].join('\n'));
}

// ---------------------------------------------------------------------------
// 5. 黒字化に必要な水準
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  header(s, '目標水準', '黒字化には、費用が横ばいでも売上を約15%（＋6,800万円）伸ばす必要がある');

  // 左：ウォーターフォール
  text(s, '営業損益：昨年度の実績と目標の差（万円）', { x: L, y: 1.55, w: 5.4, h: 0.32, fontSize: 12, bold: true, color: C.navy });
  const top = 2.25;
  const k = 0.0004; // inch / 万円
  const zero = top + 3000 * k; // +3,000 の位置を top にそろえる
  const bw = 1.1;
  const xs = [L + 0.35, L + 2.05, L + 3.75];
  const yPlus = zero - 3000 * k;
  const yMinus = zero + 3800 * k;
  s.addShape(T.rect, { x: xs[0], y: zero, w: bw, h: 3800 * k, fill: { color: C.red }, line: NOLINE });
  s.addShape(T.rect, { x: xs[1], y: yPlus, w: bw, h: 6800 * k, fill: { color: C.blue }, line: NOLINE });
  s.addShape(T.rect, { x: xs[2], y: yPlus, w: bw, h: 3000 * k, fill: { color: C.teal }, line: NOLINE });
  s.addShape(T.line, { x: xs[0] + bw, y: yMinus, w: xs[1] - xs[0] - bw, h: 0, line: { color: C.gray, width: 0.75, dashType: 'dash' } });
  s.addShape(T.line, { x: xs[1] + bw, y: yPlus, w: xs[2] - xs[1] - bw, h: 0, line: { color: C.gray, width: 0.75, dashType: 'dash' } });
  s.addShape(T.line, { x: L + 0.15, y: zero, w: 5.1, h: 0, line: { color: C.gray, width: 0.75 } });
  text(s, '0', { x: L - 0.05, y: zero - 0.13, w: 0.2, h: 0.26, fontSize: 9, color: C.gray });
  text(s, '▲3,800', { x: xs[0] - 0.2, y: yMinus + 0.04, w: bw + 0.4, h: 0.3, fontSize: 13, bold: true, color: C.red, align: 'center' });
  text(s, '＋6,800', { x: xs[1], y: yPlus + 0.3, w: bw, h: 0.4, fontSize: 14, bold: true, color: C.white, align: 'center', valign: 'middle' });
  text(s, '＋3,000', { x: xs[2] - 0.2, y: yPlus - 0.34, w: bw + 0.4, h: 0.3, fontSize: 13, bold: true, color: C.teal, align: 'center' });
  const labY = yMinus + 0.42;
  [['昨年度の実績', '（2025年度）'], ['必要な改善幅', ''], ['目標', '（3年以内）']].forEach(([a, b], i) => {
    text(s, b ? `${a}\n${b}` : a, { x: xs[i] - 0.25, y: labY, w: bw + 0.5, h: 0.5, fontSize: 10, align: 'center', valign: 'top', lineSpacingMultiple: 1.05 });
  });

  // 右：必要水準の表
  const rx = L + 5.75;
  const rw = W - R - rx;
  box(s, rx, 1.55, rw, 0.66, C.sky);
  text(s, [
    { text: '必要な売上高（①の場合）', options: { color: C.navy, bold: true, fontSize: 11 } },
  ], { x: rx + 0.18, y: 1.55, w: 2.4, h: 0.66, valign: 'middle' });
  text(s, '5.09億円', { x: rx + 2.4, y: 1.55, w: 1.55, h: 0.66, fontSize: 20, bold: true, color: C.navy, valign: 'middle' });
  text(s, '昨年度4.41億円から\n＋6,800万円（＋15.4%）', {
    x: rx + 4.0, y: 1.55, w: rw - 4.1, h: 0.66, fontSize: 10.5, valign: 'middle', lineSpacingMultiple: 1.05,
  });
  text(s, '単独の手段で達成する場合に必要な水準', { x: rx, y: 2.3, w: rw, h: 0.3, fontSize: 12, bold: true, color: C.navy });
  const big = (main, sub) => td2(main, sub, C.navy, { mainSize: 18, subSize: 9.5, align: 'center' });
  const rows = [
    [th('達成の手段'), th('① 費用が横ばいの場合'), th('② 費用が客数に連動する場合（参考）')],
    [td('入館者数だけを増やす\n（客単価2,100円のまま）', { bold: true, fontSize: 10.5 }),
      big('約24.2万人', '＋3.2万人。2024年度（24万人）をやや上回る水準'),
      big('約29.7万人', '＋8.7万人。2022年度（31万人）に近い水準')],
    [td('客単価だけを上げる\n（入館者21万人のまま）', { bold: true, fontSize: 10.5 }),
      {
        text: [
          { text: '約2,424円', options: { bold: true, color: C.navy, fontSize: 18, breakLine: true } },
          { text: '＋324円。客数が変わらないため①②とも同じ', options: { color: C.gray, fontSize: 9.5 } },
        ],
        options: { colspan: 2, align: 'center', valign: 'middle' },
      }],
  ];
  table(s, rows, { x: rx, y: 2.65, w: rw, colW: [1.95, (rw - 1.95) / 2, (rw - 1.95) / 2], rowH: [0.4, 0.92, 0.8] });

  box(s, rx, 4.92, rw, 1.08, C.amberL);
  text(s, [
    { text: '示唆　', options: { bold: true, color: C.amber } },
    { text: '客数を戻すだけでは費用も戻りやすいため、客単価の向上と組み合わせる必要がある。B案のツアー・カフェは客単価、余力枠で再提案する若年層向け施策は客数を伸ばす狙い。それぞれの効果見積がこの水準に届くかを、次回の経営会議で確認する。', options: {} },
  ], { x: rx + 0.18, y: 4.92, w: rw - 0.3, h: 1.08, fontSize: 10.5, valign: 'middle', lineSpacingMultiple: 1.12 });

  footnote(s, [
    '① 2025年度の営業費用4億7,900万円（売上高4億4,100万円－営業損益▲3,800万円）が変わらないと仮定。',
    '② 2022→2025年度に入館者が10万人減る間に営業費用が1億3,200万円減った関係（1人あたり約1,320円）が、客数の回復時にも当てはまると仮定。',
    'いずれも、投資に伴う減価償却費の増加は含まない。物販飲食で客単価を上げる場合は原価も増えるため、必要な客単価はさらに高くなる。計算方法は付録2（p.14）。',
  ].join('\n'), 6.12, 0.9);
  footer(s, 5);
  s.addNotes([
    '黒字化の目標がどれくらい高いかを、経理の数値だけで逆算しました。',
    '費用が昨年度のまま変わらなければ、売上を6,800万円、約15%伸ばす必要があります。客数だけなら約24.2万人、客単価だけなら約2,424円です。',
    'ただし過去3年は、客数の減少とともに費用も減っています。客数が戻れば費用も戻る可能性があり、その場合、客数だけで黒字化するには約29.7万人が必要で、2022年度に近い水準です。',
    '客数と客単価の両面で計画を組む必要がある、というのがこのページの示唆です。各施策の効果見積は次回の経営会議で確認します。',
  ].join('\n'));
}

// ---------------------------------------------------------------------------
// 6. 2つの提案と論点
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  header(s, '提案と論点', '投資の重点をめぐり、集客重視と飼育の立場で意見が分かれている');

  const cw = (CW - 0.3) / 2;
  const card = (x, color, title, who, items, warn) => {
    box(s, x, 1.55, cw, 0.6, color);
    text(s, [
      { text: title, options: { bold: true, fontSize: 15, color: C.white } },
      { text: `　${who}`, options: { fontSize: 10.5, color: 'E6EAF0' } },
    ], { x: x + 0.18, y: 1.55, w: cw - 0.3, h: 0.6, valign: 'middle' });
    box(s, x, 2.15, cw, 3.0, C.white, C.line);
    let y = 2.27;
    items.forEach(([label, body, h]) => {
      text(s, label, { x: x + 0.18, y, w: 0.85, h, fontSize: 10.5, bold: true, color, valign: 'top' });
      text(s, body, { x: x + 1.05, y, w: cw - 1.2, h, fontSize: 11, valign: 'top', lineSpacingMultiple: 1.05 });
      y += h + 0.05;
    });
    box(s, x + 0.15, 4.5, cw - 0.3, 0.55, C.amberL);
    text(s, [
      { text: '留意　', options: { bold: true, color: C.amber } },
      { text: warn, options: {} },
    ], { x: x + 0.27, y: 4.5, w: cw - 0.5, h: 0.55, fontSize: 10, valign: 'middle', lineSpacingMultiple: 1.05 });
  };

  card(L, C.violet, 'A案　デジタル演出案', '集客重視の立場から', [
    ['内容', '館内全面のプロジェクションマッピング（PM）と、デジタル万華鏡水槽', 0.42],
    ['投資額', '9,500万円（初期費用。開業後の運用費は示されていない）', 0.25],
    ['狙い', '話題づくりで、若年層の来館者を倍増させる', 0.25],
    ['根拠', '若年層アンケートで「映える体験」への期待が高い（集計の数値は示されていない）', 0.42],
    ['着工', '6月からでも十分に間に合う', 0.25],
  ], '「昨年度は23万人まで戻した」「物販飲食の単価は400円台」とするが、経理の数値（21万人・300円）と一致しない（p.12）');

  card(L + cw + 0.3, C.green, 'B案　体験・飲食強化案', '飼育の立場から', [
    ['内容', 'バックヤード体験ツアーの改修と、地元漁港との連携を想定したカフェの改装', 0.42],
    ['投資額', '4,000万円（ツアー1,500万円＋カフェ2,500万円）', 0.25],
    ['狙い', '客単価と満足度を上げる', 0.25],
    ['根拠', '強い光と音の常設演出は、魚のストレスと死亡リスクが高い。全面PMには断固反対で、ろ過設備の更新を最優先とすべき', 0.72],
  ], '漁港との連携は条件面で協議中であり、まだ決まっていない');

  text(s, [
    { text: '共通の前提　', options: { bold: true, color: C.navy } },
    { text: 'ろ過設備の更新（6,000万円・税別）は先送りできず、どちらの案でも必須', options: {} },
  ], { x: L, y: 5.25, w: CW, h: 0.32, fontSize: 11.5, valign: 'middle' });

  const issues = [
    ['論点1　何を優先するか', '話題づくり（A）', 'ろ過更新・動物福祉（B）'],
    ['論点2　何を伸ばすか', '若年層の客数（A）', '客単価と満足度（B）'],
    ['論点3　いつ着工するか', '6月でも可（A）', '経営方針は4月'],
  ];
  const iw = (CW - 0.4) / 3;
  issues.forEach(([h, a, b], i) => {
    const x = L + i * (iw + 0.2);
    box(s, x, 5.65, iw, 1.2, C.grayL);
    text(s, h, { x: x + 0.15, y: 5.72, w: iw - 0.3, h: 0.32, fontSize: 11.5, bold: true, color: C.navy });
    text(s, [
      { text: a, options: { color: C.violet, bold: true } },
      { text: '　⇔　', options: { color: C.gray } },
      { text: b, options: { color: C.green, bold: true } },
    ], { x: x + 0.15, y: 6.1, w: iw - 0.3, h: 0.65, fontSize: 11, valign: 'middle', lineSpacingMultiple: 1.05 });
  });

  footer(s, 6);
  s.addNotes([
    '関係者の意見は大きく2つに分かれています。',
    'A案は、話題づくりで若年層を増やす案です。若年層アンケートで映える体験への期待が高いことを根拠にしています。',
    'ただし、A案の根拠として示された「昨年度23万人」「物販飲食400円台」は、経理の数値の21万人・300円と一致していません。',
    'B案は、生体への負荷を避けながら客単価と満足度を上げる案です。カフェの漁港連携は、条件面で協議中でまだ決まっていません。',
    'どちらの案でも、ろ過設備の更新は必須という点は共通です。',
  ].join('\n'));
}

// ---------------------------------------------------------------------------
// 7. 評価マトリクス
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  header(s, '比較評価', '4条件で比べると、A案は上限と動物福祉を満たさず、B案は効果の裏付けが課題');

  const lab = (t) => td(t, { bold: true, color: C.navy, fontSize: 10.5, fill: { color: C.grayL } });
  const verdict = (t, color, fill) => td(t, { bold: true, color, fontSize: 12, align: 'center', fill: { color: fill } });
  const rows = [
    [th('評価の観点', { align: 'left' }), th('A案　デジタル演出'), th('B案　体験・飲食強化'), th('参考　ろ過設備の更新のみ')],
    [lab('投資の内容'), td('ろ過設備＋全面PM・デジタル万華鏡水槽', { fontSize: 10.5 }), td('ろ過設備＋バックヤード体験ツアー＋カフェ改装（漁港連携は協議中）', { fontSize: 10.5 }), td('ろ過設備のみ', { fontSize: 10.5 })],
    [lab('投資額（ろ過6,000万円を含む）'), td('1億5,500万円', { bold: true, fontSize: 12.5 }), td('1億円', { bold: true, fontSize: 12.5 }), td('6,000万円', { bold: true, fontSize: 12.5 })],
    [lab('① 投資上限1.5億円（絶対条件）'), mark('×', '500万円超過', C.red), mark('○', '余力5,000万円', C.teal), mark('○', '余力9,000万円', C.teal)],
    [lab('② 動物福祉（前提条件）'), mark('×', '飼育の立場から、強い光と音による生体リスクを指摘。A案側から福祉面の検討は示されていない', C.red), mark('○', '飼育の立場からの提案', C.teal), mark('○', '新たな演出はない', C.teal)],
    [lab('③ 4月着工（目標）'), mark('×', '6月着工を想定', C.red), mark('○', '方針と矛盾しない（カフェは漁港との合意後）', C.teal), mark('○', '方針どおり', C.teal)],
    [lab('④ 集客・単価の伸長（3年で黒字化）'), mark('△', '若年層の倍増を狙うが、定量的な根拠がない', C.amber), mark('△', '客単価・満足度の向上を狙うが、効果見積がない', C.amber), mark('×', '集客・単価を伸ばす施策がない', C.red)],
    [lab('主な懸念'), td('運用費が未提示。根拠の数値が経理と一致しない', { fontSize: 10.5 }), td('漁港との条件が未合意', { fontSize: 10.5 }), td('黒字化の道筋が描けない', { fontSize: 10.5 })],
    [lab('評価'), verdict('現行案は採用できない', C.red, C.redL), verdict('推奨（効果の裏付けは次回確認）', C.teal, C.tealL), verdict('単独では不十分', C.gray, C.grayL)],
  ];
  const colW = [2.55, 3.23, 3.23, CW - 2.55 - 3.23 * 2];
  const rowH = [0.4, 0.5, 0.45, 0.52, 0.74, 0.58, 0.62, 0.5, 0.5];
  table(s, rows, { x: L, y: 1.55, w: CW, colW, rowH });
  const tableH = rowH.reduce((a, b) => a + b, 0);
  s.addShape(T.rect, {
    x: L + colW[0] + colW[1], y: 1.55, w: colW[2], h: tableH,
    fill: { color: C.white, transparency: 100 }, line: { color: C.teal, width: 2.25 },
  });

  footnote(s, '○：満たす　△：未検証・条件付き　×：満たさない。ろ過設備の6,000万円は税別の正式見積。上限とほかの施策の税区分は確認事項（p.12）。', 1.55 + tableH + 0.15, 0.3);
  footer(s, 7);
  s.addNotes([
    '4つの条件で比べた結果です。',
    'A案は投資上限と動物福祉の2つを満たさず、着工時期も方針と合いません。',
    'B案は上限・動物福祉・着工時期の3条件を満たしますが、黒字化への効果はまだ数値で示されていません。',
    'ろ過設備の更新だけでは、集客と客単価を伸ばす手立てがありません。',
    'このため、B案を推奨としつつ、効果の裏付けを次回の経営会議で確認する形を提案します。',
  ].join('\n'));
}

// ---------------------------------------------------------------------------
// 8. 投資額と上限
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  header(s, '投資額', '投資額：A案は上限を500万円超え、B案は5,000万円の余力を残せる');

  const x0 = L + 2.0;
  const k = 0.0005; // inch / 万円
  const capX = x0 + 15000 * k;
  const rowsY = [2.05, 2.95, 3.85];
  const bh = 0.55;
  const yTop = 1.75;
  const yBot = 4.62;

  // 目盛り
  [0, 5000, 10000, 15000].forEach((v) => {
    const x = x0 + v * k;
    if (v > 0 && v < 15000) s.addShape(T.line, { x, y: yTop + 0.1, w: 0, h: yBot - yTop - 0.1, line: { color: 'E3E8EE', width: 0.75 } });
    text(s, v === 0 ? '0' : v.toLocaleString(), { x: x - 0.5, y: yBot + 0.02, w: 1.0, h: 0.24, fontSize: 9, color: C.gray, align: 'center' });
  });
  text(s, '（万円）', { x: x0 + 15000 * k + 0.55, y: yBot + 0.02, w: 0.8, h: 0.24, fontSize: 9, color: C.gray });
  s.addShape(T.line, { x: x0, y: yTop + 0.1, w: 0, h: yBot - yTop - 0.1, line: { color: C.gray, width: 0.75 } });

  const seg = (y, from, amount, color, label, fontSize = 10.5) => {
    const x = x0 + from * k;
    const w = amount * k;
    s.addShape(T.rect, { x, y, w, h: bh, fill: { color }, line: { color: C.white, width: 1 } });
    text(s, label, { x, y, w, h: bh, fontSize, bold: true, color: C.white, align: 'center', valign: 'middle', lineSpacingMultiple: 0.95 });
  };
  const spare = (y, from, amount, label) => {
    s.addShape(T.rect, {
      x: x0 + from * k, y, w: amount * k, h: bh,
      fill: { color: C.white }, line: { color: C.teal, width: 1, dashType: 'dash' },
    });
    text(s, label, { x: x0 + from * k, y, w: amount * k, h: bh, fontSize: 10.5, bold: true, color: C.teal, align: 'center', valign: 'middle' });
  };

  const rowLabel = (y, a, b) => text(s, [
    { text: a, options: { bold: true, color: C.navy, fontSize: 12, breakLine: true } },
    { text: b, options: { color: C.gray, fontSize: 9.5 } },
  ], { x: L, y: y - 0.05, w: 1.9, h: bh + 0.1, align: 'right', valign: 'middle' });

  // A案
  rowLabel(rowsY[0], 'A案', 'デジタル演出');
  seg(rowsY[0], 0, 6000, C.navy, 'ろ過設備　6,000');
  seg(rowsY[0], 6000, 9500, C.violet, '全面PM＋デジタル万華鏡水槽　9,500');
  // B案
  rowLabel(rowsY[1], 'B案', '体験・飲食強化');
  seg(rowsY[1], 0, 6000, C.navy, 'ろ過設備　6,000');
  seg(rowsY[1], 6000, 1500, '4FA396', 'ツアー\n1,500', 9.5);
  seg(rowsY[1], 7500, 2500, C.green, 'カフェ\n2,500', 9.5);
  spare(rowsY[1], 10000, 5000, '余力 5,000');
  // ろ過のみ
  rowLabel(rowsY[2], '参考', 'ろ過設備の更新のみ');
  seg(rowsY[2], 0, 6000, C.navy, 'ろ過設備　6,000');
  spare(rowsY[2], 6000, 9000, '余力 9,000');

  // 上限線
  s.addShape(T.line, { x: capX, y: yTop, w: 0, h: yBot - yTop, line: { color: C.red, width: 2, dashType: 'dash' } });
  text(s, '上限 1.5億円', { x: capX - 0.8, y: yTop - 0.3, w: 1.6, h: 0.28, fontSize: 11, bold: true, color: C.red, align: 'center' });

  // 合計
  const tx = x0 + 15500 * k + 0.2;
  const tw = W - R - tx;
  const total = (y, a, b, color) => text(s, [
    { text: a, options: { bold: true, color: C.navy, fontSize: 14, breakLine: true } },
    { text: b, options: { bold: true, color, fontSize: 10.5 } },
  ], { x: tx, y: y - 0.05, w: tw, h: bh + 0.1, valign: 'middle' });
  total(rowsY[0], '1億5,500万円', '上限を500万円超過', C.red);
  total(rowsY[1], '1億円', '上限の範囲内', C.teal);
  total(rowsY[2], '6,000万円', '上限の範囲内', C.teal);

  // 注記
  box(s, L, 5.08, CW, 1.62, C.grayL);
  text(s, [
    { text: '金額の前提と確認事項', options: { bold: true, color: C.navy, breakLine: true } },
    { text: 'ろ過設備の6,000万円は正式見積（税別）。「他館では5,800万円で収まった例がある」との情報は未確認のため使わない。仮に5,800万円としても、A案は1億5,300万円で上限を超える', options: { bullet: { indent: 12 }, breakLine: true } },
    { text: '上限1.5億円が税込か税別か、ツアー・カフェ・全面PMの金額の税区分は示されていない。経理とメインバンクに確認する', options: { bullet: { indent: 12 }, breakLine: true } },
    { text: '上限は必須の修繕費込み。ろ過設備のほかに必須の修繕があれば、その分だけ余力が減る。A案の9,500万円は初期費用のみで、開業後の運用費は示されていない', options: { bullet: { indent: 12 } } },
  ], { x: L + 0.2, y: 5.16, w: CW - 0.4, h: 1.5, fontSize: 11, valign: 'top', paraSpaceAfter: 4, lineSpacingMultiple: 1.08 });

  footer(s, 8);
  s.addNotes([
    '投資額の比較です。A案は1億5,500万円で、上限1.5億円を500万円超えます。',
    '他館で5,800万円に収まった例があるという情報は未確認ですが、仮にその金額を使ってもA案は1億5,300万円で、上限を超えます。',
    'B案は1億円で、5,000万円の余力が残ります。',
    'なお、上限の税区分と、ろ過設備以外の必須修繕の有無は確認が必要です。余力はその予備としても機能します。',
  ].join('\n'));
}

// ---------------------------------------------------------------------------
// 9. 推奨案
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  header(s, '推奨案', '推奨：B案を軸に総額1億円で承認し、残る5,000万円は条件を付けて留保する');

  const cat = (t, color, fill) => td(t, { bold: true, color, fill: { color: fill }, align: 'center', fontSize: 11 });
  const dec = (t, color) => td(t, { bold: true, color, align: 'center', fontSize: 11.5 });
  const rows = [
    [th('区分'), th('施策'), th('金額'), th('判断'), th('条件・理由')],
    [cat('必須', C.navy, C.sky), td('大水槽のろ過設備の更新', { bold: true }), td('6,000万円\n（税別）', { align: 'right' }), dec('承認', C.teal),
      td('先送りできない。2027年4月の着工を最優先で進める', { fontSize: 10.5 })],
    [cat('成長', C.green, C.greenL), td('バックヤード体験ツアーの改修', { bold: true }), td('1,500万円', { align: 'right' }), dec('承認', C.teal),
      td('客単価と満足度の向上をねらう。全面PMに代わる案として、飼育の立場から提案された', { fontSize: 10.5 })],
    [cat('成長', C.green, C.greenL), td('地元漁港との連携を想定したカフェの改装', { bold: true }), td('2,500万円', { align: 'right' }), dec('条件付き承認', C.amber),
      td('漁港との条件合意を着工の条件とする。合意できない場合は、内容を見直して再度付議する', { fontSize: 10.5 })],
    [cat('留保', C.blue, 'EEF3F9'), td('未配分の枠', { bold: true }), td('5,000万円', { align: 'right' }), dec('本日は配分しない', C.blue),
      td('若年層向け施策の再提案枠とする（飼育の立場で、生体への負荷がないと確認できた内容に限る）。上限の税区分などへの予備も兼ねる', { fontSize: 10.5 })],
    [cat('見送り', C.red, C.redL), td('館内全面PM＋デジタル万華鏡水槽', { bold: true }), td('9,500万円', { align: 'right', color: C.gray }), dec('現行案は見送り', C.red),
      td('上限を超え、飼育の立場から生体へのリスクも指摘されている', { fontSize: 10.5 })],
    [
      { text: '承認額 1億円 ＋ 留保 5,000万円 ＝ 上限1.5億円の範囲内', options: { colspan: 5, bold: true, color: C.navy, fill: { color: C.sky }, align: 'center', valign: 'middle', fontSize: 12.5 } },
    ],
  ];
  const tw = 8.75;
  table(s, rows, { x: L, y: 1.55, w: tw, colW: [0.8, 2.3, 1.25, 1.45, 2.95], rowH: [0.38, 0.62, 0.72, 0.72, 0.85, 0.65, 0.45] });

  const px = L + tw + 0.3;
  const pw = W - R - px;
  box(s, px, 1.55, pw, 2.0, C.grayL);
  text(s, '推奨案で満たす条件', { x: px + 0.18, y: 1.63, w: pw - 0.3, h: 0.32, fontSize: 12.5, bold: true, color: C.navy });
  const check = (m, color, t, last) => [
    { text: `${m}　`, options: { bold: true, color } },
    { text: t, options: last ? {} : { breakLine: true } },
  ];
  text(s, [
    ...check('○', C.teal, '投資上限：1億円で上限の範囲内'),
    ...check('○', C.teal, '動物福祉：全面PMを見送る'),
    ...check('○', C.teal, '4月着工：ろ過設備を最優先'),
    ...check('△', C.amber, '3年で黒字化：次回の経営会議で数値を確認', true),
  ], { x: px + 0.18, y: 2.0, w: pw - 0.3, h: 1.5, fontSize: 11, valign: 'top', paraSpaceAfter: 6, lineSpacingMultiple: 1.05 });

  box(s, px, 3.75, pw, 2.19, C.white, C.blue);
  text(s, '次回の経営会議で確認すること', { x: px + 0.18, y: 3.83, w: pw - 0.3, h: 0.32, fontSize: 12.5, bold: true, color: C.blue });
  text(s, [
    { text: '3年収支計画（各施策の効果見積、固定費・変動費の内訳、投資後の減価償却費を含む）', options: { bullet: { indent: 12 }, breakLine: true } },
    { text: '若年層向け施策の再提案（余力5,000万円の範囲内）', options: { bullet: { indent: 12 }, breakLine: true } },
    { text: '漁港との協議の状況', options: { bullet: { indent: 12 } } },
  ], { x: px + 0.18, y: 4.2, w: pw - 0.3, h: 1.65, fontSize: 10.5, valign: 'top', paraSpaceAfter: 4, lineSpacingMultiple: 1.05 });

  footer(s, 9);
  s.addNotes([
    '推奨案の中身です。ろ過設備の更新とバックヤード体験ツアーの改修は承認、カフェは漁港との合意を条件に承認とします。',
    '残る5,000万円は本日は配分せず、若年層向け施策の再提案枠と、税区分などの予備として留保します。',
    '再提案は、飼育の立場で生体への負荷がないと確認できた内容に限ります。',
    'A案の全面PMは、上限超過と生体リスクの2点から、現行の内容では見送ります。',
  ].join('\n'));
}

// ---------------------------------------------------------------------------
// 10. スケジュールと担当
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  header(s, 'スケジュール', '4月着工から逆算し、本日の決定後すぐに資金調達と発注準備に入る');

  const lab = (t) => td(t, { bold: true, color: C.navy, fontSize: 11, fill: { color: C.grayL } });
  const own = (t) => td(t, { align: 'center', fontSize: 10.5, color: C.gray });
  const c = (t, o = {}) => td(t, { fontSize: 10.5, ...o });
  const go = (t) => td(t, { fontSize: 11, bold: true, color: C.white, fill: { color: C.teal }, align: 'center' });
  const rows = [
    [th('項目'), th('担当（案）'), th('2026年11月（本日）'), th('12月〜2027年3月（着工準備）'), th('2027年4月'), th('それ以降')],
    [lab('資金調達'), own('経理'), c('投資方針の決定'), c('メインバンクとの調達手続き。上限の税区分を確認'), c('―', { align: 'center' }), c('―', { align: 'center' })],
    [lab('ろ過設備の更新'), own('施設'), c('承認。発注準備に着手'), c('発注・契約、工程の確定。ほかの必須修繕の有無を確認'), go('着工'), c('来期中に完了')],
    [lab('バックヤード体験ツアーの改修'), own('飼育'), c('承認'), c('設計・発注'), go('着工'), c('―', { align: 'center' })],
    [lab('カフェの改装（漁港連携を想定）'), own('飼育'), c('条件付き承認'), c('漁港との条件協議。合意できれば発注、できなければ再度付議'), td('合意後に着工', { fontSize: 10.5, bold: true, color: C.amber, align: 'center', fill: { color: C.amberL } }), c('―', { align: 'center' })],
    [lab('収支計画・残る枠の使途'), own('経理・企画・飼育'), c('―', { align: 'center' }), c('3年収支計画の作成と、若年層向け施策の再提案。次回の経営会議で審議'), c('―', { align: 'center' }), c('入館者数・客単価・営業損益を定期的に確認')],
  ];
  table(s, rows, { x: L, y: 1.55, w: CW, colW: [2.3, 1.25, 1.95, 3.45, 1.45, CW - 2.3 - 1.25 - 1.95 - 3.45 - 1.45], rowH: [0.42, 0.68, 0.72, 0.6, 0.72, 0.72] });

  box(s, L, 5.65, CW, 0.95, C.amberL);
  text(s, [
    { text: '着工時期について　', options: { bold: true, color: C.amber } },
    { text: 'A案の提案では6月着工でも間に合うとしているが、経営方針（4月）より2か月遅い。ろ過設備の更新は来期中に必須で先送りできないため、4月着工を基本とする。', options: {} },
  ], { x: L + 0.2, y: 5.65, w: CW - 0.4, h: 0.95, fontSize: 11.5, valign: 'middle', lineSpacingMultiple: 1.15 });

  footnote(s, '担当は案。各工程の具体的な期日は、決定後に施設・経理で工程表として整理する。', 6.72, 0.28);
  footer(s, 10);
  s.addNotes([
    '4月着工から逆算した段取りです。',
    '本日決定いただければ、経理は資金調達の手続き、施設はろ過設備の発注準備にすぐ着手します。',
    'カフェは漁港との協議の結果次第です。合意できなければ内容を見直して再度お諮りします。',
    '3年収支計画と若年層向け施策の再提案は、次回の経営会議でご審議いただく想定です。',
  ].join('\n'));
}

// ---------------------------------------------------------------------------
// 11. リスクと対応
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  header(s, 'リスク', '主なリスクと対応：ろ過設備の更新の遅れと、施策効果の未達に備える');

  const r = (t) => td(t, { bold: true, color: C.navy, fontSize: 12.5 });
  const c = (t) => td(t, { fontSize: 12 });
  const rows = [
    [th('リスク', { align: 'left' }), th('影響', { align: 'left' }), th('対応', { align: 'left' })],
    [r('ろ過設備の更新が遅れる'), c('最悪の場合、大水槽の展示を止めることになる'), c('本日決定し、4月着工を最優先で管理する')],
    [r('漁港との条件が合意に至らない'), c('カフェの改装が計画どおりに進まない'), c('合意を着工の条件とし、合意できない場合は内容を見直して再度付議する')],
    [r('施策の効果が黒字化の水準に届かない'), c('3年以内の黒字化（年＋3,000万円）が達成できない'), c('次回の経営会議で3年収支計画を確認する。入館者数・客単価・営業損益を定期的に確認する')],
    [r('若年層の取り込みが進まない'), c('客数の回復が限られる'), c('余力5,000万円の範囲で、生体に負荷をかけない若年層向け施策を再提案する')],
    [r('上限の税区分や、ほかの必須修繕で枠が狭まる'), c('投資の総額が上限に近づく'), c('経理・メインバンク・施設で確認する。余力5,000万円を予備として確保しておく')],
  ];
  table(s, rows, { x: L, y: 1.55, w: CW, colW: [3.4, 3.95, CW - 7.35], rowH: [0.45, 0.88, 0.88, 0.95, 0.88, 0.95] });

  footer(s, 11);
  s.addNotes([
    '主なリスクは、ろ過設備の更新が遅れることと、施策の効果が黒字化の水準に届かないことです。',
    '前者は本日の決定と4月着工の最優先管理で、後者は次回の3年収支計画の確認と、指標の定期的な確認で備えます。',
  ].join('\n'));
}

// ---------------------------------------------------------------------------
// 12. 数字の食い違いと確認事項
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  header(s, 'データの確認', '数字の食い違いと確認事項：本資料は経理の業績表を正として作成している');

  const k = (t) => td(t, { bold: true, color: C.navy, fontSize: 10.5 });
  const c = (t, o = {}) => td(t, { fontSize: 10.5, ...o });
  const adopt = (t) => td(t, { fontSize: 10.5, bold: true, color: C.blue });
  const rows = [
    [th('項目', { align: 'left' }), th('資料作成時に集まった情報', { align: 'left' }), th('本資料の扱い', { align: 'left' }), th('確認すること', { align: 'left' })],
    [k('昨年度の入館者数'), c('経理の業績表は21万人。集客重視の立場からは「23万人まで戻した」との発言'), adopt('21万人（経理の数値）'), c('23万人の出所と定義')],
    [k('物販飲食の単価'), c('客単価2,100円＝入館料1,800円＋物販飲食300円。集客重視の立場からは「400円台まで伸びている」との発言'), adopt('300円（経理の客単価と整合）'), c('400円台の出所と定義（購入した人1人あたりの金額などの可能性）')],
    [k('ろ過設備の更新費'), c('正式見積は6,000万円（税別）。他館で5,800万円に収まった例があるとの情報（未確認）'), adopt('6,000万円（正式見積）'), c('―')],
    [k('年代別の来館者構成'), c('20代以下28％、ファミリー層46％、シニア30％で、合計が104％になる'), adopt('参考扱い（判断には使わない）'), c('区分の定義（重なりの有無）')],
    [k('投資額の税区分'), c('ろ過設備は税別の見積。上限1.5億円とほかの施策の税区分は示されていない'), adopt('示された金額のまま比較'), c('上限が税込か税別か')],
    [k('必須の修繕の範囲'), c('上限は必須の修繕費込み。ろ過設備のほかに必須の修繕があるかは示されていない'), adopt('ろ過設備のみを必須として計上'), c('ほかの必須の修繕の有無')],
    [k('着工時期'), c('経営方針は4月。集客重視の立場からは「6月からでも十分に間に合う」との発言'), adopt('4月（経営方針）'), c('―')],
  ];
  table(s, rows, { x: L, y: 1.55, w: CW, colW: [1.95, 5.0, 2.35, CW - 1.95 - 5.0 - 2.35], rowH: [0.4, 0.6, 0.72, 0.6, 0.6, 0.6, 0.6, 0.6] });

  footnote(s, '関係者の発言に含まれる数値のうち経理の数値と一致しないものは、出所と定義を確認できるまで判断に用いない。', 6.5, 0.3);
  footer(s, 12);
  s.addNotes([
    '資料内の数値の扱いです。関係者から集まった情報には、経理の数値と食い違うものがありました。',
    '本資料はすべて経理の業績表を正としています。確認が必要な事項は右の列のとおりで、次回の経営会議までに確認します。',
  ].join('\n'));
}

// ---------------------------------------------------------------------------
// 13. 付録1：業績表
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  header(s, '付録1', '付録1　業績の推移（経理の業績表）と営業費用');

  const num = (t, o = {}) => td(t, { align: 'right', fontSize: 12, ...o });
  const rows = [
    [th('年度'), th('入館者数'), th('平均客単価'), th('売上高'), th('営業損益'), th('営業費用（算出）')],
    [td('2022年度', { bold: true, fontSize: 12 }), num('31万人'), num('2,000円'), num('62,000万円'), num('＋900万円', { color: C.teal, bold: true }), num('61,100万円', { color: C.gray })],
    [td('2023年度', { bold: true, fontSize: 12 }), num('27万人'), num('2,050円'), num('55,350万円'), num('▲1,200万円', { color: C.red, bold: true }), num('56,550万円', { color: C.gray })],
    [td('2024年度', { bold: true, fontSize: 12 }), num('24万人'), num('2,080円'), num('49,920万円'), num('▲2,600万円', { color: C.red, bold: true }), num('52,520万円', { color: C.gray })],
    [td('2025年度（昨年度）', { bold: true, fontSize: 12 }), num('21万人'), num('2,100円'), num('44,100万円'), num('▲3,800万円', { color: C.red, bold: true }), num('47,900万円', { color: C.gray })],
  ];
  table(s, rows, { x: L, y: 1.6, w: CW, colW: [2.5, 1.85, 1.85, 2.0, 2.0, CW - 2.5 - 1.85 * 2 - 2.0 * 2], rowH: [0.45, 0.55, 0.55, 0.55, 0.55] });

  text(s, [
    { text: '営業費用は「売上高－営業損益」で算出した値（業績表には無い列）', options: { bullet: { indent: 12 }, breakLine: true } },
    { text: '売上高は、各年度とも「入館者数×平均客単価」と一致する', options: { bullet: { indent: 12 }, breakLine: true } },
    { text: '2025年度の客単価2,100円の内訳：入館料1,800円＋物販飲食300円', options: { bullet: { indent: 12 }, breakLine: true } },
    { text: 'その他：入館者のピーク時は42万人。施設は築28年', options: { bullet: { indent: 12 }, breakLine: true } },
    { text: '年代別の来館者構成（参考）：20代以下28％、ファミリー層46％、シニア30％。合計が104％のため、区分の定義を確認する', options: { bullet: { indent: 12 } } },
  ], { x: L, y: 4.6, w: CW, h: 1.95, fontSize: 11, valign: 'top', paraSpaceAfter: 5, lineSpacingMultiple: 1.05 });

  footer(s, 13);
}

// ---------------------------------------------------------------------------
// 14. 付録2：計算方法
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  header(s, '付録2', '付録2　試算の計算方法（経理の業績表と各提案の金額だけから算出）');

  const colW = (CW - 0.3) / 2;
  const panel = (x, title, lines) => {
    box(s, x, 1.55, colW, 5.25, C.grayL);
    text(s, title, { x: x + 0.2, y: 1.63, w: colW - 0.4, h: 0.34, fontSize: 13, bold: true, color: C.navy });
    text(s, lines, { x: x + 0.2, y: 2.05, w: colW - 0.4, h: 4.65, fontSize: 10.5, valign: 'top', paraSpaceAfter: 4, lineSpacingMultiple: 1.08 });
  };
  const h = (t) => ({ text: t, options: { bold: true, color: C.blue, breakLine: true } });
  const l = (t, last) => ({ text: t, options: last ? {} : { breakLine: true } });

  panel(L, '黒字化に必要な水準（p.5）', [
    h('共通'),
    l('必要な改善幅 ＝ ＋3,000 －（▲3,800）＝ 6,800万円'),
    l('昨年度の営業費用 ＝ 44,100 －（▲3,800）＝ 47,900万円'),
    h('① 費用が横ばいの場合'),
    l('必要な売上高 ＝ 47,900 ＋ 3,000 ＝ 50,900万円（昨年度比 ＋15.4％）'),
    l('入館者数だけで ＝ 50,900万円 ÷ 2,100円 ≒ 24.2万人'),
    l('客単価だけで ＝ 50,900万円 ÷ 21万人 ≒ 2,424円'),
    h('② 費用が客数に連動する場合（参考・高低点法）'),
    l('1人あたりの変動費 ＝（61,100 － 47,900）万円 ÷（31 － 21）万人 ＝ 1,320円'),
    l('客数に連動しない費用 ＝ 47,900万円 － 1,320円 × 21万人 ＝ 20,180万円'),
    l('入館者数だけで ＝（20,180 ＋ 3,000）万円 ÷（2,100 － 1,320）円 ≒ 29.7万人'),
    l('※2022年度と2025年度の2時点から機械的に求めた参考値。投資後の減価償却費の増加と、物販飲食の原価の増加は含まない', true),
  ]);

  panel(L + colW + 0.3, '投資額の比較（p.4・p.8）', [
    h('各案の総額（ろ過設備を含む）'),
    l('A案 ＝ 6,000 ＋ 9,500 ＝ 15,500万円 → 上限15,000万円を500万円超過'),
    l('B案 ＝ 6,000 ＋ 1,500 ＋ 2,500 ＝ 10,000万円 → 余力5,000万円'),
    l('ろ過設備の更新のみ ＝ 6,000万円 → 余力9,000万円'),
    h('ろ過設備以外に使える枠'),
    l('15,000 － 6,000 ＝ 9,000万円（A案の9,500万円はこれを500万円上回る）'),
    h('他館事例（未確認）を当てはめた場合'),
    l('A案 ＝ 5,800 ＋ 9,500 ＝ 15,300万円 → それでも上限を300万円超過'),
    h('金額の前提'),
    l('ろ過設備は税別の正式見積。ほかの施策と上限の税区分は確認事項のため、示された金額のまま比較している', true),
  ]);

  footer(s, 14);
}

// ノートは段落ごとに分けて書き出す（pptxgenjs は改行を1つのテキストに入れるため、後処理で段落に分割する）
async function main() {
  const buf = await pptx.write({ outputType: 'nodebuffer' });
  const zip = await JSZip.loadAsync(buf);
  const notes = Object.keys(zip.files).filter((n) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n));
  for (const n of notes) {
    const xml = await zip.file(n).async('string');
    const fixed = xml.replace(
      /<a:p><a:r><a:rPr lang="en-US" dirty="0"\/><a:t>([\s\S]*?)<\/a:t><\/a:r><a:endParaRPr lang="en-US" dirty="0"\/><\/a:p>/g,
      (m, body) => body.split(/\r?\n/)
        .map((line) => `<a:p><a:r><a:rPr lang="${LANG}" altLang="en-US" dirty="0"/><a:t>${line}</a:t></a:r></a:p>`)
        .join(''),
    );
    zip.file(n, fixed);
  }
  const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(OUT, out);
  console.log(`written: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
