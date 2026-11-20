/* 軽トラ限界引っ越し — 共通ユーティリティ
 * ブラウザ（window.KT）と Node の検証スクリプト（globalThis.KT）の両方で動くように書いている。
 */
(function (root) {
  'use strict';
  const KT = (root.KT = root.KT || {});

  KT.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  KT.lerp = (a, b, t) => a + (b - a) * t;
  KT.smoothstep = (a, b, x) => {
    const t = KT.clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  KT.easeOutBack = (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  KT.easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  /** 角度を -π..π に正規化 */
  KT.normAngle = (a) => {
    a = (a + Math.PI) % (Math.PI * 2);
    if (a < 0) a += Math.PI * 2;
    return a - Math.PI;
  };

  /** 金額表示。マイナスは全角マイナスで */
  KT.yen = (n) => {
    const v = Math.round(n);
    return (v < 0 ? '−' : '') + '¥' + Math.abs(v).toLocaleString('ja-JP');
  };
  KT.round100 = (n) => Math.round(n / 100) * 100;

  /** 秒 → 0:42.3 */
  KT.fmtTime = (sec) => {
    if (!isFinite(sec)) return '--:--';
    const m = Math.floor(sec / 60);
    const s = sec - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
  };

  /** 決定的な乱数（コースや背景を毎回同じにするため） */
  KT.rng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /** 衝突カテゴリ */
  KT.CAT = { GROUND: 0x0001, TRUCK: 0x0002, WHEEL: 0x0004, ITEM: 0x0008 };

  /** ゲーム全体の定数 */
  KT.CONST = {
    DT: 1 / 120, // 物理の固定ステップ
    VEL_ITERS: 10,
    POS_ITERS: 6,
    MAX_LOAD: 350, // 軽トラの最大積載量 (kg)
    OVERLOAD_FINE: 20000, // 過積載の反則金
    RESCUE_FEE: 10000, // ロードサービス
    LEFTOVER_BASE: 3000, // 積み残し 1点あたりの手配料
    LEFTOVER_RATE: 0.3, // + 荷物の弁償額 × この率
    ROPE_STRENGTH: 3600, // ロープが切れる張力 (N)
  };

  KT.TAGS = {
    fragile: { label: 'ワレモノ', cls: 'fragile', help: '衝撃に弱い。布団の上や間に置くと守れる' },
    tenchi: { label: '天地無用', cls: 'tenchi', help: '上下さかさまで届けると減額' },
    noTilt: { label: '横倒し厳禁', cls: 'notilt', help: '45°以上傾けたまま運ぶと減額' },
    rolls: { label: '転がる', cls: 'rolls', help: '丸いので転がる。ロープか壁ぎわで止める' },
    cushion: { label: 'クッション', cls: 'cushion', help: '触れている荷物への衝撃をやわらげる' },
    heavy: { label: '重い', cls: 'heavy', help: '下にある荷物を押しつぶすことがある' },
  };
})(typeof window !== 'undefined' ? window : globalThis);
