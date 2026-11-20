// ─────────────────────────────────────────────────────────────
//  timeline.js — 映像と音楽が共有する「時間の設計図」
//  120 BPM / 4拍子 → 1小節 = 2.0 秒。すべての章は 8 小節 = 16 秒。
// ─────────────────────────────────────────────────────────────

export const BPM = 120;
export const BEAT = 60 / BPM;         // 0.5 s
export const BAR = BEAT * 4;          // 2.0 s
export const FPS = 60;
export const W = 1920, H = 1080;

export const bar = (n) => n * BAR;

export const SECTIONS = {
  intro:    { start: bar(0),  end: bar(4)  },  // 0  – 8s   プロンプト
  sound:    { start: bar(4),  end: bar(12) },  // 8  – 24s  第1章 音
  infinity: { start: bar(12), end: bar(20) },  // 24 – 40s  第2章 無限
  life:     { start: bar(20), end: bar(28) },  // 40 – 56s  第3章 生命
  earth:    { start: bar(28), end: bar(36) },  // 56 – 72s  第4章 大地
  light:    { start: bar(36), end: bar(44) },  // 72 – 88s  第5章 光
  cosmos:   { start: bar(44), end: bar(52) },  // 88 – 104s 第6章 宇宙
  finale:   { start: bar(52), end: bar(62) },  // 104 – 124s 種明かし
};
export const DURATION = bar(62) + 2.0;   // 残響のぶん少しだけ余白

// 第1章：純正律の音程（周波数比）と、その名前
export const ROOT_HZ = 146.832; // D3
export const INTERVALS = [
  { a: 1, b: 1, name: 'ユニゾン',     en: 'UNISON' },
  { a: 2, b: 1, name: 'オクターブ',   en: 'OCTAVE' },
  { a: 3, b: 2, name: '完全五度',     en: 'PERFECT FIFTH' },
  { a: 4, b: 3, name: '完全四度',     en: 'PERFECT FOURTH' },
  { a: 5, b: 4, name: '長三度',       en: 'MAJOR THIRD' },
  { a: 5, b: 3, name: '長六度',       en: 'MAJOR SIXTH' },
  { a: 6, b: 5, name: '短三度',       en: 'MINOR THIRD' },
  { a: 3, b: 2, name: '完全五度',     en: 'PERFECT FIFTH' },
];
// 位相がゆっくり回る＝オシロスコープ上で図形が回転して見える。
// 音のほうも同じ量だけ（0.25 Hz）わずかにずらしてあるので、画面の回転は音の「うなり」そのもの。
export const LISSAJOUS_DETUNE = 0.25;

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t) => Math.pow(clamp(t), 3);

// ── イントロ：プロンプト入力（人間のタイピング）と、返答（トークン単位のストリーミング）
export const PROMPT = 'あなたの実力を見せる最高の動画を作って';
export const REPLY_CHUNKS = ['了解', '。', '素材', 'は', '使わ', 'ず', '、', '映像', 'も', '音', 'も', '、', 'すべて', 'コード', 'で', '生成', 'します', '。'];
export const REPLY = REPLY_CHUNKS.join('');
function lcg(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
// 人間の打鍵：0.07〜0.16秒の揺らぎ
export const PROMPT_TIMES = (() => {
  const r = lcg(7); const out = []; let t = 0.95;
  for (let i = 0; i < [...PROMPT].length; i++) { out.push(t); t += 0.072 + r() * 0.07 + (i % 5 === 4 ? 0.05 : 0); }
  return out;
})();
// AI の返答：トークンごとにまとまって出る
export const REPLY_TIMES = (() => {
  const r = lcg(11); const out = []; let t = 3.75;
  for (let i = 0; i < REPLY_CHUNKS.length; i++) { out.push(t); t += 0.055 + r() * 0.05; }
  return out;
})();
export const DISSOLVE_START = 6.35;
