const fs = require('fs');
const path = require('path');
const PptxGenJS = require('pptxgenjs');

const ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'assets');
const OUT_PPTX = path.join(ROOT, 'antigravity_capabilities.pptx');

function getPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(`Not a valid PNG: ${filePath}`);
  }
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

function fitContain(imgPath, boxX, boxY, boxW, boxH) {
  const { width, height } = getPngDimensions(imgPath);
  const imgRatio = width / height;
  const boxRatio = boxW / boxH;
  let w, h;
  if (imgRatio > boxRatio) {
    w = boxW;
    h = boxW / imgRatio;
  } else {
    h = boxH;
    w = boxH * imgRatio;
  }
  return {
    x: boxX + (boxW - w) / 2,
    y: boxY + (boxH - h) / 2,
    w,
    h,
  };
}

// Design Tokens — Architectural Light & Deep Obsidian Contrast
const C = {
  DARK_BG: '070C18',
  DARK_SURFACE: '111A2E',
  DARK_SURFACE_2: '17233D',
  DARK_BORDER: '233354',
  LIGHT_BG: 'F8FAFC',
  WHITE: 'FFFFFF',
  SOFT: 'F1F5F9',
  BORDER: 'DCE4EE',
  INK: '0F172A',
  BODY: '334155',
  MUTED: '64748B',
  FAINT: '94A3B8',
  DARK_BODY: 'CBD5E1',
  DARK_MUTED: '94A3B8',

  COBALT: '2563EB',
  COBALT_SOFT: 'EFF6FF',
  COBALT_TINT: 'DBEAFE',
  CYAN: '06B6D4',
  CYAN_BRIGHT: '38BDF8',
  INDIGO: '4F46E5',
  INDIGO_SOFT: 'EEF2FF',
  TEAL: '0D9488',
  TEAL_SOFT: 'F0FDFA',
  CORAL: 'EA580C',
  CORAL_SOFT: 'FFF7ED',
  AMBER: 'D97706',
  AMBER_BRIGHT: 'F59E0B',
  AMBER_SOFT: 'FFFBEB',
};

const FONT_JA = 'Hiragino Kaku Gothic ProN';
const FONT_EN = 'Avenir Next';

const W = 13.333;
const H = 7.5;
const MX = 0.65;
const CW = W - MX * 2; // 12.033

function addHeader(slide, { kicker, title, subtitle, dark = false }) {
  slide.background = { color: dark ? C.DARK_BG : C.LIGHT_BG };

  if (dark) {
    slide.addShape('rect', { x: 0, y: 0, w: 8.5, h: 0.05, fill: { color: C.COBALT }, line: { type: 'none' } });
    slide.addShape('rect', { x: 8.5, y: 0, w: W - 8.5, h: 0.05, fill: { color: C.CYAN }, line: { type: 'none' } });
  }

  slide.addShape('rect', {
    x: MX,
    y: 0.45,
    w: 0.24,
    h: 0.04,
    fill: { color: dark ? C.CYAN_BRIGHT : C.COBALT },
    line: { type: 'none' },
  });
  slide.addText(kicker, {
    x: MX + 0.34,
    y: 0.34,
    w: 6.5,
    h: 0.26,
    fontFace: FONT_EN,
    fontSize: 10,
    bold: true,
    color: dark ? C.CYAN_BRIGHT : C.COBALT,
    charSpacing: 1.8,
    margin: 0,
    valign: 'middle',
  });

  slide.addText(title, {
    x: MX,
    y: 0.66,
    w: CW,
    h: 0.56,
    fontFace: FONT_JA,
    fontSize: 23,
    bold: true,
    color: dark ? C.WHITE : C.INK,
    margin: 0,
    valign: 'middle',
  });

  if (subtitle) {
    slide.addText(subtitle, {
      x: MX,
      y: 1.24,
      w: CW,
      h: 0.38,
      fontFace: FONT_JA,
      fontSize: 11.5,
      color: dark ? C.DARK_MUTED : C.MUTED,
      margin: 0,
      valign: 'top',
    });
  }
}

function addFooter(slide, slideNum, total, dark = false) {
  slide.addShape('line', {
    x: MX,
    y: 7.0,
    w: CW,
    h: 0,
    line: { color: dark ? C.DARK_BORDER : C.BORDER, width: 0.75 },
  });

  slide.addText('ANTIGRAVITY  —  AGENTIC AI CAPABILITY OVERVIEW', {
    x: MX,
    y: 7.06,
    w: 7.5,
    h: 0.28,
    fontFace: FONT_EN,
    fontSize: 8.5,
    bold: true,
    charSpacing: 1.2,
    color: dark ? '64748B' : C.FAINT,
    margin: 0,
    valign: 'middle',
  });

  slide.addText(`${String(slideNum).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, {
    x: W - MX - 1.5,
    y: 7.06,
    w: 1.5,
    h: 0.28,
    fontFace: FONT_EN,
    fontSize: 9,
    bold: true,
    color: dark ? C.DARK_MUTED : C.MUTED,
    align: 'right',
    margin: 0,
    valign: 'middle',
  });
}

function addPill(slide, text, x, y, w, h, { bg, fg, border, fontSize = 9, fontFace = FONT_JA, bold = true }) {
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h,
    rectRadius: 0.45,
    fill: { color: bg },
    line: border ? { color: border, width: 0.85 } : { type: 'none' },
  });
  slide.addText(text, {
    x,
    y,
    w,
    h,
    fontFace,
    fontSize,
    bold,
    color: fg,
    align: 'center',
    valign: 'middle',
    margin: 0,
  });
}

function buildDeck() {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Antigravity';
  pptx.company = 'Google DeepMind';
  pptx.title = 'Antigravity — 次世代エージェンティック AI 能力紹介資料';
  pptx.subject = 'Antigravity Capabilities Overview';
  pptx.lang = 'ja-JP';

  const TOTAL = 10;
  const heroImg = fs.existsSync(path.join(ASSETS_DIR, 'hero_prism_feathered.png'))
    ? path.join(ASSETS_DIR, 'hero_prism_feathered.png')
    : path.join(ASSETS_DIR, 'hero_prism.png');
  const multimodalImg = path.join(ASSETS_DIR, 'multimodal_prism.png');

  // =========================================================================
  // SLIDE 1: COVER — DARK HERO SPLIT
  // =========================================================================
  {
    const s = pptx.addSlide();
    s.background = { color: C.DARK_BG };

    s.addShape('rect', { x: 0, y: 0, w: 8.5, h: 0.06, fill: { color: C.COBALT }, line: { type: 'none' } });
    s.addShape('rect', { x: 8.5, y: 0, w: W - 8.5, h: 0.06, fill: { color: C.CYAN }, line: { type: 'none' } });

    if (fs.existsSync(heroImg)) {
      const box = fitContain(heroImg, 7.55, 0.55, 5.25, 6.10);
      s.addImage({ path: heroImg, x: box.x, y: box.y, w: box.w, h: box.h });
    }

    s.addShape('rect', { x: 0.65, y: 0.85, w: 0.05, h: 5.45, fill: { color: C.DARK_BORDER }, line: { type: 'none' } });
    s.addShape('rect', { x: 0.65, y: 0.85, w: 0.05, h: 1.35, fill: { color: C.CYAN_BRIGHT }, line: { type: 'none' } });

    addPill(s, 'GOOGLE DEEPMIND  •  AGENTIC AI', 0.98, 0.92, 3.35, 0.34, {
      bg: C.DARK_SURFACE,
      fg: C.CYAN_BRIGHT,
      border: C.DARK_BORDER,
      fontFace: FONT_EN,
      fontSize: 9,
      bold: true,
    });

    s.addText('Antigravity', {
      x: 0.95,
      y: 1.52,
      w: 6.4,
      h: 1.05,
      fontFace: FONT_EN,
      fontSize: 54,
      bold: true,
      color: C.WHITE,
      margin: 0,
      valign: 'middle',
    });

    s.addShape('rect', { x: 0.98, y: 2.66, w: 1.25, h: 0.06, fill: { color: C.COBALT }, line: { type: 'none' } });
    s.addShape('rect', { x: 2.28, y: 2.66, w: 0.38, h: 0.06, fill: { color: C.CYAN }, line: { type: 'none' } });

    s.addText('思考から実装・検証までを自律完遂する、\n次世代エージェンティック AI パートナー', {
      x: 0.98,
      y: 2.95,
      w: 6.45,
      h: 1.05,
      fontFace: FONT_JA,
      fontSize: 21,
      bold: true,
      color: 'F1F5F9',
      lineSpacingMultiple: 1.32,
      margin: 0,
    });

    s.addText(
      'コード開発・マルチエージェント並列協調・マルチモーダル認識・リサーチ分析を統合し、アイデアを「検証済みの成果物」へと最速で昇華させます。',
      {
        x: 0.98,
        y: 4.18,
        w: 6.25,
        h: 0.85,
        fontFace: FONT_JA,
        fontSize: 12,
        color: C.DARK_MUTED,
        lineSpacingMultiple: 1.45,
        margin: 0,
      }
    );

    const chips = [
      { k: 'AUTONOMOUS', v: '実装〜テストを自律完遂', accent: C.COBALT },
      { k: 'ORCHESTRATION', v: 'Swarm・Workflow 並列', accent: C.CYAN },
      { k: 'SELF-VERIFIED', v: '視覚・実行結果の自己検証', accent: C.AMBER_BRIGHT },
    ];
    chips.forEach((ch, idx) => {
      const cx = 0.98 + idx * 2.15;
      s.addShape('roundRect', {
        x: cx,
        y: 5.34,
        w: 2.02,
        h: 0.92,
        rectRadius: 0.08,
        fill: { color: C.DARK_SURFACE },
        line: { color: C.DARK_BORDER, width: 0.8 },
      });
      s.addShape('rect', { x: cx + 0.14, y: 5.48, w: 0.36, h: 0.04, fill: { color: ch.accent }, line: { type: 'none' } });
      s.addText(ch.k, {
        x: cx + 0.14,
        y: 5.56,
        w: 1.76,
        h: 0.22,
        fontFace: FONT_EN,
        fontSize: 8,
        bold: true,
        color: C.DARK_MUTED,
        charSpacing: 0.8,
        margin: 0,
      });
      s.addText(ch.v, {
        x: cx + 0.14,
        y: 5.82,
        w: 1.78,
        h: 0.34,
        fontFace: FONT_JA,
        fontSize: 9.5,
        bold: true,
        color: C.WHITE,
        margin: 0,
      });
    });

    s.addShape('line', { x: 0.98, y: 6.72, w: 11.7, h: 0, line: { color: C.DARK_BORDER, width: 0.75 } });
    s.addText('CAPABILITY OVERVIEW DECK  •  2026', {
      x: 0.98,
      y: 6.82,
      w: 6.0,
      h: 0.3,
      fontFace: FONT_EN,
      fontSize: 9,
      bold: true,
      charSpacing: 1.4,
      color: '64748B',
      margin: 0,
    });
    s.addText('Designed & Built Autonomously by Antigravity', {
      x: 7.5,
      y: 6.82,
      w: 5.18,
      h: 0.3,
      fontFace: FONT_EN,
      fontSize: 9,
      color: '64748B',
      align: 'right',
      margin: 0,
    });

    s.addNotes(
      '本日は、Google DeepMind チームによって設計された次世代エージェンティック AI「Antigravity」の能力をご紹介します。単なる対話型AIではなく、計画・実装・検証までを自律的に完遂するパートナーとしての実力を、具体的な仕組みと実例でお伝えします。'
    );
  }

  // =========================================================================
  // SLIDE 2: EXECUTIVE SUMMARY — PARADIGM SHIFT + 3 PILLARS
  // =========================================================================
  {
    const s = pptx.addSlide();
    addHeader(s, {
      kicker: '01 / PARADIGM SHIFT',
      title: '「答えるAI」から「現場でやり切るパートナー」へ',
      subtitle: 'テキストの助言で終わらず、ワークスペースを直接理解・操作し、検証済みの成果物まで到達します。',
    });

    const compY = 1.78;
    const compH = 1.32;

    s.addShape('roundRect', {
      x: MX,
      y: compY,
      w: 5.45,
      h: compH,
      rectRadius: 0.08,
      fill: { color: C.SOFT },
      line: { color: C.BORDER, width: 1 },
    });
    addPill(s, '従来のチャット型 AI', MX + 0.24, compY + 0.18, 1.85, 0.3, { bg: 'E2E8F0', fg: C.BODY, fontSize: 9 });
    s.addText('コード断片や手順を「提案」して終了', {
      x: MX + 0.24,
      y: compY + 0.56,
      w: 5.0,
      h: 0.3,
      fontFace: FONT_JA,
      fontSize: 13,
      bold: true,
      color: C.BODY,
      margin: 0,
    });
    s.addText('ファイル反映・実行・エラー解消・動作確認は人間が都度コピペして往復', {
      x: MX + 0.24,
      y: compY + 0.89,
      w: 5.0,
      h: 0.30,
      fontFace: FONT_JA,
      fontSize: 9.8,
      color: C.MUTED,
      margin: 0,
    });

    s.addShape('ellipse', { x: MX + 5.66, y: compY + 0.40, w: 0.52, h: 0.52, fill: { color: C.COBALT }, line: { type: 'none' } });
    s.addText('→', {
      x: MX + 5.66,
      y: compY + 0.39,
      w: 0.52,
      h: 0.52,
      fontFace: FONT_EN,
      fontSize: 18,
      bold: true,
      color: C.WHITE,
      align: 'center',
      valign: 'middle',
      margin: 0,
    });

    const rightX = MX + 6.38;
    const rightW = CW - 6.38;
    s.addShape('roundRect', {
      x: rightX,
      y: compY,
      w: rightW,
      h: compH,
      rectRadius: 0.08,
      fill: { color: C.INK },
      line: { color: C.COBALT, width: 1.2 },
    });
    s.addShape('rect', { x: rightX, y: compY + 0.16, w: 0.07, h: compH - 0.32, fill: { color: C.CYAN_BRIGHT }, line: { type: 'none' } });
    addPill(s, 'Antigravity（自律型エージェント）', rightX + 0.26, compY + 0.18, 2.55, 0.3, { bg: C.COBALT, fg: C.WHITE, fontSize: 9 });
    s.addText('環境を把握し、実装から検証まで一気通貫で完遂', {
      x: rightX + 0.26,
      y: compY + 0.56,
      w: rightW - 0.45,
      h: 0.3,
      fontFace: FONT_JA,
      fontSize: 13.5,
      bold: true,
      color: C.WHITE,
      margin: 0,
    });
    s.addText('複数ファイルの並列編集・実行・エラー修復・目視検証まで自律遂行', {
      x: rightX + 0.26,
      y: compY + 0.89,
      w: rightW - 0.45,
      h: 0.30,
      fontFace: FONT_JA,
      fontSize: 9.8,
      color: C.DARK_BODY,
      margin: 0,
    });

    const pillars = [
      {
        num: '01',
        en: 'AUTONOMOUS\nEXECUTION',
        title: '自律完遂のエンジニアリング',
        accent: C.COBALT,
        points: [
          '読解・設計・編集・コマンド実行を単一ループで自走',
          'テストやビルドの失敗を検知し、原因を特定して自動修復',
          '独立タスクを並列バッチ実行し、無駄な往復を排除',
        ],
      },
      {
        num: '02',
        en: 'PARALLEL\nORCHESTRATION',
        title: '知能の並列スケール',
        accent: C.INDIGO,
        points: [
          '調査や画像制作を専門サブエージェントへ非同期に委譲',
          'Swarm により複数ワーカーが独立ブランチで同時開発',
          'Python ワークフローで大規模ファイルの並列監査を実行',
        ],
      },
      {
        num: '03',
        en: 'VERIFIED &\nTRUSTWORTHY',
        title: '視覚検証と透明な信頼性',
        accent: C.TEAL,
        points: [
          '画像・PDF・動画の読解に加え、成果物を画像化して検査',
          '実行ログ・該当ファイル・行番号リンクに基づく誠実報告',
          'セキュリティ境界を厳守し、曖昧な仕様は的確に確認',
        ],
      },
    ];

    const pY = 3.38;
    const pH = 3.34;
    const gap = 0.28;
    const pW = (CW - gap * 2) / 3;

    pillars.forEach((p, i) => {
      const px = MX + i * (pW + gap);
      s.addShape('roundRect', {
        x: px,
        y: pY,
        w: pW,
        h: pH,
        rectRadius: 0.08,
        fill: { color: C.WHITE },
        line: { color: C.BORDER, width: 1.0 },
      });
      s.addShape('rect', { x: px, y: pY, w: pW, h: 0.08, fill: { color: p.accent }, line: { type: 'none' } });

      s.addText(p.num, {
        x: px + 0.24,
        y: pY + 0.22,
        w: 0.88,
        h: 0.62,
        fontFace: FONT_EN,
        fontSize: 34,
        bold: true,
        color: p.accent,
        margin: 0,
        valign: 'middle',
      });
      s.addText(p.en, {
        x: px + 1.12,
        y: pY + 0.28,
        w: pW - 1.32,
        h: 0.48,
        fontFace: FONT_EN,
        fontSize: 8.5,
        bold: true,
        charSpacing: 0.9,
        color: C.MUTED,
        lineSpacingMultiple: 1.25,
        margin: 0,
        valign: 'middle',
      });

      s.addText(p.title, {
        x: px + 0.24,
        y: pY + 0.94,
        w: pW - 0.48,
        h: 0.36,
        fontFace: FONT_JA,
        fontSize: 14.5,
        bold: true,
        color: C.INK,
        margin: 0,
      });

      s.addShape('line', { x: px + 0.24, y: pY + 1.36, w: pW - 0.48, h: 0, line: { color: C.BORDER, width: 0.85 } });

      p.points.forEach((pt, idx) => {
        const by = pY + 1.52 + idx * 0.56;
        s.addShape('ellipse', { x: px + 0.26, y: by + 0.09, w: 0.08, h: 0.08, fill: { color: p.accent }, line: { type: 'none' } });
        s.addText(pt, {
          x: px + 0.44,
          y: by,
          w: pW - 0.66,
          h: 0.48,
          fontFace: FONT_JA,
          fontSize: 10.3,
          color: C.BODY,
          lineSpacingMultiple: 1.28,
          margin: 0,
          valign: 'top',
        });
      });
    });

    addFooter(s, 2, TOTAL);
    s.addNotes(
      'Antigravityの最大の特長は「答えて終わり」ではない点です。従来型AIでは人間がコードの反映やデバッグを担う必要がありましたが、Antigravityは自律実行・並列スケール・自己検証の3つの柱で成果物の完成まで責任を持ちます。'
    );
  }

  // =========================================================================
  // SLIDE 3: CAPABILITY MAP — 6 CORE CAPABILITIES (2x3 BENTO MATRIX)
  // =========================================================================
  {
    const s = pptx.addSlide();
    addHeader(s, {
      kicker: '02 / CAPABILITY MAP',
      title: '開発・協調・制作・自動化を横断する 6つのコア能力',
      subtitle: '目的や難易度に応じて最適なツール群と推論戦略を組み合わせ、エンドツーエンドで課題を解決します。',
    });

    const cards = [
      {
        num: '01',
        title: 'フルサイクル開発',
        desc: 'コード読解・設計・複数ファイル並列編集・コマンド実行・自動デバッグを一気通貫で遂行。',
        tags: ['並列編集', 'コマンド実行', '自動デバッグ'],
        accent: C.COBALT,
        soft: C.COBALT_SOFT,
      },
      {
        num: '02',
        title: 'マルチエージェント協調',
        desc: '専門サブエージェント委譲、Swarm 並列チーム開発、Python ワークフローによる大規模処理を実現。',
        tags: ['Subagents', 'Swarm', 'Workflows'],
        accent: C.INDIGO,
        soft: C.INDIGO_SOFT,
      },
      {
        num: '03',
        title: 'マルチモーダル理解＆制作',
        desc: '画像・PDF・音声・動画を直接解析。画像生成・スライド・図解・UI制作と視覚検証を統合。',
        tags: ['画像/PDF/動画', '画像生成', '視覚検査'],
        accent: C.CORAL,
        soft: C.CORAL_SOFT,
      },
      {
        num: '04',
        title: '深層リサーチ＆分析',
        desc: '大規模コードベースの横断探索、Web 検索、データ分析スクリプト、Artifacts 作成を実行。',
        tags: ['Web検索', 'データ分析', 'Artifacts'],
        accent: C.TEAL,
        soft: C.TEAL_SOFT,
      },
      {
        num: '05',
        title: '非同期タスク＆定期自動化',
        desc: '長時間処理のバックグラウンド管理、通知による自動復帰、タイマー・Cron 定期運用に対応。',
        tags: ['バックグラウンド', 'Cron定期実行', '通知復帰'],
        accent: C.AMBER,
        soft: C.AMBER_SOFT,
      },
      {
        num: '06',
        title: '拡張性＆安全ガバナンス',
        desc: 'Skills・Rules・MCP 連携でチーム固有の業務に最適化。アクセス制御と安全境界を厳守し透明に協働。',
        tags: ['Skills / MCP', '権限厳守', '合意形成'],
        accent: C.INK,
        soft: C.SOFT,
      },
    ];

    const colGap = 0.28;
    const rowGap = 0.26;
    const cardW = (CW - colGap * 2) / 3;
    const cardH = 2.34;

    cards.forEach((c, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = MX + col * (cardW + colGap);
      const y = 1.82 + row * (cardH + rowGap);

      s.addShape('roundRect', {
        x,
        y,
        w: cardW,
        h: cardH,
        rectRadius: 0.08,
        fill: { color: C.WHITE },
        line: { color: C.BORDER, width: 1.0 },
      });

      s.addShape('rect', { x, y: y + 0.16, w: 0.07, h: cardH - 0.32, fill: { color: c.accent }, line: { type: 'none' } });

      s.addShape('roundRect', { x: x + 0.24, y: y + 0.22, w: 0.44, h: 0.34, rectRadius: 0.06, fill: { color: c.soft }, line: { type: 'none' } });
      s.addText(c.num, {
        x: x + 0.24,
        y: y + 0.22,
        w: 0.44,
        h: 0.34,
        fontFace: FONT_EN,
        fontSize: 11,
        bold: true,
        color: c.accent,
        align: 'center',
        valign: 'middle',
        margin: 0,
      });

      s.addText(c.title, {
        x: x + 0.78,
        y: y + 0.20,
        w: cardW - 0.96,
        h: 0.38,
        fontFace: FONT_JA,
        fontSize: 14,
        bold: true,
        color: C.INK,
        margin: 0,
        valign: 'middle',
      });

      s.addText(c.desc, {
        x: x + 0.24,
        y: y + 0.72,
        w: cardW - 0.44,
        h: 0.98,
        fontFace: FONT_JA,
        fontSize: 10.5,
        color: C.BODY,
        lineSpacingMultiple: 1.4,
        margin: 0,
        valign: 'top',
      });

      let tx = x + 0.24;
      c.tags.forEach((tag) => {
        const tw = Math.min(Math.max(0.86, tag.length * 0.125 + 0.26), 1.18);
        addPill(s, tag, tx, y + cardH - 0.46, tw, 0.28, { bg: c.soft, fg: c.accent, fontSize: 8.5, bold: true });
        tx += tw + 0.08;
      });
    });

    addFooter(s, 3, TOTAL);
    s.addNotes(
      '全体像として6つのコア能力を備えています。ソフトウェア開発だけでなく、複数エージェントによる並列推進、マルチモーダル制作、最新リサーチ、定期自動化、そしてチーム向けカスタム拡張までを1つの統合基盤で扱えます。'
    );
  }

  // =========================================================================
  // SLIDE 4: DEEP DIVE 1 — AUTONOMOUS ENGINEERING LOOP
  // =========================================================================
  {
    const s = pptx.addSlide();
    addHeader(s, {
      kicker: '03 / AUTONOMOUS ENGINEERING',
      title: '探索・実装・検証・自己修復を高速回転させる開発ループ',
      subtitle: '独立した調査・編集を並列バッチ実行し、コマンド検証とエラー修復を自律ループで回し切ります。',
    });

    const loopY = 1.80;
    const loopH = 2.24;
    s.addShape('roundRect', {
      x: MX,
      y: loopY,
      w: CW,
      h: loopH,
      rectRadius: 0.1,
      fill: { color: C.WHITE },
      line: { color: C.BORDER, width: 1.0 },
    });

    const steps = [
      { n: '01', title: '要件・環境把握', sub: '構成・依存・制約を\n一括スキャン', color: C.COBALT },
      { n: '02', title: '設計・並列読込', sub: '関連ファイルを同時に\n読み込み全体像を把握', color: C.INDIGO },
      { n: '03', title: '一括実装・編集', sub: '整合性を保ちながら\n複数ファイルを同時更新', color: C.COBALT },
      { n: '04', title: '自動ビルド＆検証', sub: 'テスト・Lint・差分を\nチェーンコマンドで確認', color: C.TEAL },
      { n: '05', title: '検証済み納品', sub: '根拠ファイルリンク付き\nで簡潔・誠実に報告', color: C.INK },
    ];

    const stW = 2.08;
    const stGap = 0.28;
    const startX = MX + 0.26;

    steps.forEach((st, i) => {
      const sx = startX + i * (stW + stGap);
      const sy = loopY + 0.24;

      s.addShape('roundRect', {
        x: sx,
        y: sy,
        w: stW,
        h: 1.30,
        rectRadius: 0.08,
        fill: { color: i === 4 ? C.INK : C.LIGHT_BG },
        line: { color: i === 4 ? C.INK : C.BORDER, width: 0.9 },
      });

      s.addShape('roundRect', { x: sx + 0.14, y: sy + 0.14, w: 0.42, h: 0.28, rectRadius: 0.05, fill: { color: i === 4 ? C.CYAN : st.color }, line: { type: 'none' } });
      s.addText(st.n, {
        x: sx + 0.14,
        y: sy + 0.14,
        w: 0.42,
        h: 0.28,
        fontFace: FONT_EN,
        fontSize: 9.5,
        bold: true,
        color: C.WHITE,
        align: 'center',
        valign: 'middle',
        margin: 0,
      });

      s.addText(st.title, {
        x: sx + 0.14,
        y: sy + 0.48,
        w: stW - 0.28,
        h: 0.28,
        fontFace: FONT_JA,
        fontSize: 11.5,
        bold: true,
        color: i === 4 ? C.WHITE : C.INK,
        margin: 0,
      });

      s.addText(st.sub, {
        x: sx + 0.14,
        y: sy + 0.78,
        w: stW - 0.28,
        h: 0.44,
        fontFace: FONT_JA,
        fontSize: 9.2,
        color: i === 4 ? C.DARK_BODY : C.MUTED,
        lineSpacingMultiple: 1.25,
        margin: 0,
      });

      if (i < steps.length - 1) {
        s.addText('›', {
          x: sx + stW + 0.02,
          y: sy + 0.42,
          w: stGap - 0.04,
          h: 0.42,
          fontFace: FONT_EN,
          fontSize: 22,
          bold: true,
          color: C.COBALT,
          align: 'center',
          valign: 'middle',
          margin: 0,
        });
      }
    });

    // Full-width single-line feedback bar
    const fbX = startX;
    const fbW = CW - 0.52;
    s.addShape('roundRect', {
      x: fbX,
      y: loopY + 1.66,
      w: fbW,
      h: 0.40,
      rectRadius: 0.06,
      fill: { color: C.COBALT_SOFT },
      line: { color: C.COBALT_TINT, width: 0.9 },
    });
    s.addText('↺  自律エラー修復ループ：Step 04 でテスト・ビルド失敗を検知すると、全エラー要因を特定し Step 03 へ自動復帰して一括修正・再検証', {
      x: fbX + 0.16,
      y: loopY + 1.66,
      w: fbW - 0.32,
      h: 0.40,
      fontFace: FONT_JA,
      fontSize: 9.8,
      bold: true,
      color: C.COBALT,
      align: 'center',
      valign: 'middle',
      margin: 0,
    });

    const botY = 4.28;
    const botH = 2.46;
    const halfW = (CW - 0.28) / 2;

    s.addShape('roundRect', {
      x: MX,
      y: botY,
      w: halfW,
      h: botH,
      rectRadius: 0.08,
      fill: { color: C.WHITE },
      line: { color: C.BORDER, width: 1.0 },
    });
    s.addShape('rect', { x: MX, y: botY, w: halfW, h: 0.07, fill: { color: C.COBALT }, line: { type: 'none' } });
    s.addText('スピードと精度を両立する実装スタイル', {
      x: MX + 0.26,
      y: botY + 0.22,
      w: halfW - 0.52,
      h: 0.34,
      fontFace: FONT_JA,
      fontSize: 14,
      bold: true,
      color: C.INK,
      margin: 0,
    });

    const principles = [
      { h: '並列バッチ処理', b: '独立した検索・ファイル読込・編集を1ターン内で同時実行し待ち時間を圧縮' },
      { h: '一括コマンド検証', b: 'ビルド・単体テスト・差分確認を連結実行し、手戻りのない確認を実現' },
      { h: '最小差分・高保守性', b: '既存アーキテクチャと規約を尊重し、保守性の高い安全なコードを実装' },
    ];
    principles.forEach((pr, idx) => {
      const py = botY + 0.70 + idx * 0.56;
      s.addShape('roundRect', { x: MX + 0.26, y: py + 0.04, w: 1.48, h: 0.32, rectRadius: 0.05, fill: { color: C.COBALT_SOFT }, line: { type: 'none' } });
      s.addText(pr.h, {
        x: MX + 0.26,
        y: py + 0.04,
        w: 1.48,
        h: 0.32,
        fontFace: FONT_JA,
        fontSize: 9.5,
        bold: true,
        color: C.COBALT,
        align: 'center',
        valign: 'middle',
        margin: 0,
      });
      s.addText(pr.b, {
        x: MX + 1.88,
        y: py,
        w: halfW - 2.10,
        h: 0.46,
        fontFace: FONT_JA,
        fontSize: 10,
        color: C.BODY,
        lineSpacingMultiple: 1.25,
        margin: 0,
        valign: 'middle',
      });
    });

    const rx = MX + halfW + 0.28;
    s.addShape('roundRect', {
      x: rx,
      y: botY,
      w: halfW,
      h: botH,
      rectRadius: 0.08,
      fill: { color: C.INK },
      line: { color: C.DARK_BORDER, width: 1 },
    });
    s.addShape('rect', { x: rx, y: botY, w: halfW, h: 0.07, fill: { color: C.CYAN }, line: { type: 'none' } });
    s.addText('実戦での主要エンジニアリング対応領域', {
      x: rx + 0.26,
      y: botY + 0.22,
      w: halfW - 0.52,
      h: 0.34,
      fontFace: FONT_JA,
      fontSize: 14,
      bold: true,
      color: C.WHITE,
      margin: 0,
    });

    const domains = [
      { t: 'Web / App フルスタック開発', d: 'UI・API・DB・状態管理まで一貫構築' },
      { t: '難解バグの根本原因調査', d: 'ログ解析・再現テスト・ピンポイント修正' },
      { t: '大規模リファクタリング', d: '依存の全件追跡と安全・段階的な置換' },
      { t: '自動化スクリプト・開発基盤', d: 'CLI・データ変換・検証基盤を整備' },
    ];
    domains.forEach((dm, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const dx = rx + 0.26 + col * 2.74;
      const dy = botY + 0.70 + row * 0.84;
      s.addShape('roundRect', {
        x: dx,
        y: dy,
        w: 2.58,
        h: 0.72,
        rectRadius: 0.06,
        fill: { color: C.DARK_SURFACE },
        line: { color: C.DARK_BORDER, width: 0.75 },
      });
      s.addText(dm.t, {
        x: dx + 0.14,
        y: dy + 0.12,
        w: 2.30,
        h: 0.24,
        fontFace: FONT_JA,
        fontSize: 10,
        bold: true,
        color: C.CYAN_BRIGHT,
        margin: 0,
      });
      s.addText(dm.d, {
        x: dx + 0.14,
        y: dy + 0.40,
        w: 2.30,
        h: 0.24,
        fontFace: FONT_JA,
        fontSize: 8.8,
        color: C.DARK_BODY,
        margin: 0,
      });
    });

    addFooter(s, 4, TOTAL);
    s.addNotes(
      'ソフトウェア開発では、要件把握から並列読込、一括実装、ビルド＆テスト検証までを自動で回します。エラーが出ても途中で投げ出さず、ログを読んで全エラーを修正してから再検証する自己修復ループが強みです。'
    );
  }

  // =========================================================================
  // SLIDE 5: DEEP DIVE 2 — MULTI-AGENT ORCHESTRATION (3-TIER SCALE)
  // =========================================================================
  {
    const s = pptx.addSlide();
    addHeader(s, {
      kicker: '04 / MULTI-AGENT ORCHESTRATION',
      title: '課題の規模に応じて知能を並列スケールする 3層アーキテクチャ',
      subtitle: '単一エージェントの限界を超え、専門委譲・自律チーム開発・コード制御ワークフローを使い分けます。',
    });

    const tiers = [
      {
        tier: 'TIER 01',
        name: 'Subagents',
        jp: '専門タスクの非同期委譲',
        accent: C.COBALT,
        soft: C.COBALT_SOFT,
        desc: '独立したコンテキストで専門エージェントを起動。メイン対話を整理された状態に保ちつつ並列処理。',
        bullets: [
          'research：大規模調査・仕様読解に特化',
          'image-generator：専用ビジュアル素材生成',
          'カスタム定義：独自ロールをその場で構築',
        ],
        best: '最適な用途：広範な調査・クリエイティブ制作',
        diagram: 'subagent',
      },
      {
        tier: 'TIER 02',
        name: 'Swarm',
        jp: '自律チームによる並列開発',
        accent: C.INDIGO,
        soft: C.INDIGO_SOFT,
        desc: '共有メッセージボード上で複数ワーカーが自律連携。独立ワークスペースで競合ゼロの同時開発。',
        bullets: [
          'share / branch による安全な分離作業空間',
          '実装・テスト・レビューの役割分担＆相互確認',
          '進捗に応じた動的メンバー追加と結果統合',
        ],
        best: '最適な用途：大規模機能開発・多役割プロジェクト',
        diagram: 'swarm',
      },
      {
        tier: 'TIER 03',
        name: 'Python Workflows',
        jp: 'コード制御の大規模並列処理',
        accent: C.TEAL,
        soft: C.TEAL_SOFT,
        desc: 'Python スクリプト (run_workflow) で多数のエージェントとツールを構造化オーケストレーション。',
        bullets: [
          'parallel：数十ファイル・複数観点へ一斉展開',
          'pipeline：前段結果を次段へ自動連携',
          '自動フィルタリング・クロスチェック・最終集計',
        ],
        best: '最適な用途：全社コード監査・多角的バッチ分析',
        diagram: 'workflow',
      },
    ];

    const colGap = 0.28;
    const colW = (CW - colGap * 2) / 3;
    const topY = 1.82;
    const cardH = 4.18;

    tiers.forEach((t, i) => {
      const x = MX + i * (colW + colGap);

      s.addShape('roundRect', {
        x,
        y: topY,
        w: colW,
        h: cardH,
        rectRadius: 0.08,
        fill: { color: C.WHITE },
        line: { color: C.BORDER, width: 1.0 },
      });
      s.addShape('rect', { x, y: topY, w: colW, h: 0.08, fill: { color: t.accent }, line: { type: 'none' } });

      addPill(s, t.tier, x + 0.22, topY + 0.22, 0.84, 0.26, { bg: t.soft, fg: t.accent, fontFace: FONT_EN, fontSize: 8.5 });
      s.addText(t.name, {
        x: x + 1.14,
        y: topY + 0.18,
        w: colW - 1.32,
        h: 0.34,
        fontFace: FONT_EN,
        fontSize: 15,
        bold: true,
        color: C.INK,
        margin: 0,
        valign: 'middle',
      });
      s.addText(t.jp, {
        x: x + 0.22,
        y: topY + 0.56,
        w: colW - 0.44,
        h: 0.26,
        fontFace: FONT_JA,
        fontSize: 11,
        bold: true,
        color: t.accent,
        margin: 0,
      });

      const dX = x + 0.22;
      const dY = topY + 0.90;
      const dW = colW - 0.44;
      const dH = 1.02;
      s.addShape('roundRect', {
        x: dX,
        y: dY,
        w: dW,
        h: dH,
        rectRadius: 0.06,
        fill: { color: t.soft },
        line: { color: C.BORDER, width: 0.6 },
      });

      if (t.diagram === 'subagent') {
        const centerX = dX + dW / 2;
        addPill(s, 'Main Agent', centerX - 0.62, dY + 0.12, 1.24, 0.26, { bg: t.accent, fg: C.WHITE, fontFace: FONT_EN, fontSize: 8.5 });
        const subs = ['Research', 'Image Gen', 'Custom'];
        const firstCenterX = dX + 0.14 + 0.48;
        const lastCenterX = dX + 0.14 + 2 * 1.08 + 0.48;
        const busY = dY + 0.50;
        // Crisp orthogonal elbow bus connectors
        s.addShape('line', { x: centerX, y: dY + 0.38, w: 0, h: busY - (dY + 0.38), line: { color: t.accent, width: 1.25 } });
        s.addShape('line', { x: firstCenterX, y: busY, w: lastCenterX - firstCenterX, h: 0, line: { color: t.accent, width: 1.25 } });
        subs.forEach((lbl, si) => {
          const sx = dX + 0.14 + si * 1.08;
          s.addShape('line', { x: sx + 0.48, y: busY, w: 0, h: 0.12, line: { color: t.accent, width: 1.25 } });
          addPill(s, lbl, sx, dY + 0.62, 0.96, 0.26, { bg: C.WHITE, fg: C.INK, border: t.accent, fontFace: FONT_EN, fontSize: 8 });
        });
      } else if (t.diagram === 'swarm') {
        addPill(s, 'Shared Message Board', dX + 0.42, dY + 0.12, dW - 0.84, 0.26, { bg: t.accent, fg: C.WHITE, fontFace: FONT_EN, fontSize: 8.5 });
        const peers = ['Dev A (share)', 'Dev B (share)', 'Verifier'];
        peers.forEach((lbl, pi) => {
          const px = dX + 0.10 + pi * 1.09;
          s.addShape('line', { x: px + 0.50, y: dY + 0.38, w: 0, h: 0.24, line: { color: t.accent, width: 1.25 } });
          addPill(s, lbl, px, dY + 0.62, 1.01, 0.26, { bg: C.WHITE, fg: C.INK, border: t.accent, fontFace: FONT_EN, fontSize: 7.5 });
        });
      } else {
        addPill(s, 'Python', dX + 0.12, dY + 0.38, 0.72, 0.28, { bg: t.accent, fg: C.WHITE, fontFace: FONT_EN, fontSize: 8 });
        const wLabels = ['Worker #1..N', 'Pipeline Stage', 'Cross-Check'];
        [0.14, 0.41, 0.68].forEach((off, wi) => {
          s.addShape('roundRect', { x: dX + 1.18, y: dY + off, w: 0.96, h: 0.20, rectRadius: 0.05, fill: { color: C.WHITE }, line: { color: t.accent, width: 0.9 } });
          s.addText(wLabels[wi], {
            x: dX + 1.18,
            y: dY + off,
            w: 0.96,
            h: 0.20,
            fontFace: FONT_EN,
            fontSize: 7.2,
            bold: true,
            color: C.INK,
            align: 'center',
            valign: 'middle',
            margin: 0,
          });
        });
        addPill(s, 'Aggregate', dX + 2.42, dY + 0.38, 0.84, 0.28, { bg: C.INK, fg: C.WHITE, fontFace: FONT_EN, fontSize: 8 });
        s.addText('→', { x: dX + 0.84, y: dY + 0.36, w: 0.34, h: 0.3, fontFace: FONT_EN, fontSize: 13, bold: true, color: t.accent, align: 'center', valign: 'middle', margin: 0 });
        s.addText('→', { x: dX + 2.14, y: dY + 0.36, w: 0.28, h: 0.3, fontFace: FONT_EN, fontSize: 13, bold: true, color: t.accent, align: 'center', valign: 'middle', margin: 0 });
      }

      s.addText(t.desc, {
        x: x + 0.22,
        y: topY + 2.04,
        w: colW - 0.44,
        h: 0.64,
        fontFace: FONT_JA,
        fontSize: 9.8,
        color: C.BODY,
        lineSpacingMultiple: 1.32,
        margin: 0,
      });

      t.bullets.forEach((b, bi) => {
        const by = topY + 2.74 + bi * 0.32;
        s.addText(`▸  ${b}`, { x: x + 0.22, y: by, w: colW - 0.44, h: 0.28, fontFace: FONT_JA, fontSize: 9.2, color: C.INK, margin: 0 });
      });

      s.addShape('roundRect', { x: x + 0.18, y: topY + cardH - 0.44, w: colW - 0.36, h: 0.32, rectRadius: 0.05, fill: { color: t.soft }, line: { type: 'none' } });
      s.addText(t.best, {
        x: x + 0.26,
        y: topY + cardH - 0.44,
        w: colW - 0.52,
        h: 0.32,
        fontFace: FONT_JA,
        fontSize: 8.8,
        bold: true,
        color: t.accent,
        valign: 'middle',
        margin: 0,
      });
    });

    s.addShape('roundRect', { x: MX, y: 6.18, w: CW, h: 0.60, rectRadius: 0.08, fill: { color: C.INK }, line: { type: 'none' } });
    addPill(s, 'REACTIVE ARCHITECTURE', MX + 0.20, 6.33, 1.98, 0.30, { bg: C.COBALT, fg: C.WHITE, fontFace: FONT_EN, fontSize: 8.5 });
    s.addText('イベント駆動の自動復帰設計：完了通知で即座に再開するためポーリング待機ゼロ。複数並列ジョブを最短レイテンシで統合します。', {
      x: MX + 2.34,
      y: 6.18,
      w: CW - 2.54,
      h: 0.60,
      fontFace: FONT_JA,
      fontSize: 10.5,
      color: C.WHITE,
      valign: 'middle',
      margin: 0,
    });

    addFooter(s, 5, TOTAL);
    s.addNotes(
      '複雑な案件でも1人で抱え込まず、3つの階層で並列スケールできます。軽い委譲はSubagents、チーム並行開発はSwarm、数十件規模の機械的なファンアウトや監査にはPython Workflowsを使い分けます。'
    );
  }

  // =========================================================================
  // SLIDE 6: DEEP DIVE 3 — MULTIMODAL PERCEPTION & CREATIVE SYNTHESIS
  // =========================================================================
  {
    const s = pptx.addSlide();
    addHeader(s, {
      kicker: '05 / MULTIMODAL & CREATIVE SYNTHESIS',
      title: 'あらゆるメディアを「読む力」と、ビジュアルを「創り検証する力」',
      subtitle: 'テキストの枠を超え、画像・PDF・動画・音声の直接理解から、資料・UI・挿絵の一貫制作まで対応します。',
    });

    const leftW = 5.75;
    const rightX = MX + leftW + 0.32;
    const rightW = CW - leftW - 0.32;

    s.addShape('roundRect', { x: MX, y: 1.82, w: leftW, h: 2.34, rectRadius: 0.08, fill: { color: C.WHITE }, line: { color: C.BORDER, width: 1.0 } });
    s.addShape('rect', { x: MX, y: 1.82, w: 0.08, h: 2.34, fill: { color: C.TEAL }, line: { type: 'none' } });
    addPill(s, 'INPUT  —  DIRECT PERCEPTION', MX + 0.26, 1.98, 2.35, 0.28, { bg: C.TEAL_SOFT, fg: C.TEAL, fontFace: FONT_EN, fontSize: 8.5 });
    s.addText('画像・文書・動画・音声を直接理解', {
      x: MX + 0.26,
      y: 2.32,
      w: leftW - 0.46,
      h: 0.34,
      fontFace: FONT_JA,
      fontSize: 14,
      bold: true,
      color: C.INK,
      margin: 0,
    });

    const inputs = [
      ['画像・UI画面', 'スクリーンショットから余白崩れ・配色・情報設計を即座に診断'],
      ['PDF・設計書', '図表を含む長文仕様書や論文を直接読み込み構造化'],
      ['音声・動画', '操作録画やデモ動画・音声ファイルから事実と課題を抽出'],
    ];
    inputs.forEach(([k, v], i) => {
      const iy = 2.74 + i * 0.44;
      s.addText(`●  ${k}`, { x: MX + 0.26, y: iy, w: 1.45, h: 0.36, fontFace: FONT_JA, fontSize: 10, bold: true, color: C.TEAL, margin: 0, valign: 'top' });
      s.addText(v, { x: MX + 1.72, y: iy, w: leftW - 1.92, h: 0.40, fontFace: FONT_JA, fontSize: 9.8, color: C.BODY, lineSpacingMultiple: 1.2, margin: 0, valign: 'top' });
    });

    s.addShape('roundRect', { x: MX, y: 4.38, w: leftW, h: 2.40, rectRadius: 0.08, fill: { color: C.WHITE }, line: { color: C.BORDER, width: 1.0 } });
    s.addShape('rect', { x: MX, y: 4.38, w: 0.08, h: 2.40, fill: { color: C.CORAL }, line: { type: 'none' } });
    addPill(s, 'OUTPUT  —  VISUAL CREATION & QA', MX + 0.26, 4.54, 2.55, 0.28, { bg: C.CORAL_SOFT, fg: C.CORAL, fontFace: FONT_EN, fontSize: 8.5 });
    s.addText('コード × ビジュアルの統合制作と自己検査', {
      x: MX + 0.26,
      y: 4.88,
      w: leftW - 0.46,
      h: 0.34,
      fontFace: FONT_JA,
      fontSize: 14,
      bold: true,
      color: C.INK,
      margin: 0,
    });

    const outputs = [
      ['専用画像生成', 'image-generator 連携で資料・UI用の専用画像を制作'],
      ['多彩な表現媒体', 'PPTX・HTML・Mermaid図・Artifacts を一貫生成'],
      ['視覚的自己検証', '成果物を画像化して自ら目視し、崩れを徹底修正'],
    ];
    outputs.forEach(([k, v], i) => {
      const oy = 5.32 + i * 0.44;
      s.addText(`●  ${k}`, { x: MX + 0.26, y: oy, w: 1.50, h: 0.36, fontFace: FONT_JA, fontSize: 10, bold: true, color: C.CORAL, margin: 0, valign: 'top' });
      s.addText(v, { x: MX + 1.78, y: oy, w: leftW - 1.98, h: 0.40, fontFace: FONT_JA, fontSize: 9.8, color: C.BODY, lineSpacingMultiple: 1.2, margin: 0, valign: 'top' });
    });

    s.addShape('roundRect', { x: rightX, y: 1.82, w: rightW, h: 4.96, rectRadius: 0.1, fill: { color: C.WHITE }, line: { color: C.BORDER, width: 1.0 } });
    s.addShape('roundRect', { x: rightX + 0.18, y: 2.00, w: rightW - 0.36, h: 3.16, rectRadius: 0.08, fill: { color: 'EFF4F6' }, line: { color: C.BORDER, width: 0.6 } });

    if (fs.existsSync(multimodalImg)) {
      const box = fitContain(multimodalImg, rightX + 0.22, 2.04, rightW - 0.44, 3.08);
      s.addImage({ path: multimodalImg, x: box.x, y: box.y, w: box.w, h: box.h });
    }

    addPill(s, 'LIVE VISUAL ARTIFACT', rightX + 0.24, 5.32, 1.82, 0.26, { bg: C.COBALT_SOFT, fg: C.COBALT, fontFace: FONT_EN, fontSize: 8 });
    s.addText('デザイン設計・画像生成・レイアウト統合を一貫実行', {
      x: rightX + 0.24,
      y: 5.64,
      w: rightW - 0.48,
      h: 0.34,
      fontFace: FONT_JA,
      fontSize: 12.5,
      bold: true,
      color: C.INK,
      margin: 0,
    });
    s.addText(
      '上の3Dアートワークも、本資料のカラー設計に合わせてブリーフを作成し、サブエージェントで生成・最適比率で自動配置しています。',
      {
        x: rightX + 0.24,
        y: 6.00,
        w: rightW - 0.48,
        h: 0.64,
        fontFace: FONT_JA,
        fontSize: 9.8,
        color: C.MUTED,
        lineSpacingMultiple: 1.35,
        margin: 0,
      }
    );

    addFooter(s, 6, TOTAL);
    s.addNotes(
      'マルチモーダル能力は「読む」だけでなく「創って自ら見る」点に価値があります。スライドやWeb UIを作ったあとに画像化して自分の目でレイアウト崩れをチェックし修正できるため、完成度が格段に高まります。'
    );
  }

  // =========================================================================
  // SLIDE 7: DEEP DIVE 4 — RESEARCH & EXTENSIBILITY STACK (60/40 SPLIT)
  // =========================================================================
  {
    const s = pptx.addSlide();
    addHeader(s, {
      kicker: '06 / RESEARCH & EXTENSIBILITY',
      title: '根拠ある意思決定支援と、現場に合わせて進化する拡張基盤',
      subtitle: 'コード・Web・データを横断した高速リサーチに加え、チーム固有の知見や外部ツールと自在に連携します。',
    });

    const leftW = 6.72;
    const rightX = MX + leftW + 0.34;
    const rightW = CW - leftW - 0.34;

    s.addShape('roundRect', { x: MX, y: 1.82, w: leftW, h: 4.94, rectRadius: 0.1, fill: { color: C.WHITE }, line: { color: C.BORDER, width: 1.0 } });
    s.addText('リサーチから意思決定ドキュメントまで一気通貫', {
      x: MX + 0.30,
      y: 2.04,
      w: leftW - 0.60,
      h: 0.38,
      fontFace: FONT_JA,
      fontSize: 15,
      bold: true,
      color: C.INK,
      margin: 0,
    });
    s.addShape('line', { x: MX + 0.30, y: 2.48, w: leftW - 0.60, h: 0, line: { color: C.BORDER, width: 0.85 } });

    const researchItems = [
      {
        num: '01',
        color: C.COBALT,
        soft: C.COBALT_SOFT,
        title: '既存コード × 最新 Web 情報の統合調査',
        desc: 'リポジトリ内の実装詳細を正確に読み解きつつ、Web 検索で最新ライブラリ仕様や設計ベストプラクティスを即時キャッチアップ。',
      },
      {
        num: '02',
        color: C.TEAL,
        soft: C.TEAL_SOFT,
        title: 'スクリプト駆動の実データ分析＆構造化レポート',
        desc: 'Python / Node 等で検証スクリプトを実行し一次データを集計。Mermaid 図解や表を組み込んだ見やすい Artifacts レポートを出力。',
      },
      {
        num: '03',
        color: C.INDIGO,
        soft: C.INDIGO_SOFT,
        title: 'ファイル・行番号リンク付きの追跡可能な根拠提示',
        desc: 'すべての発見事項・変更箇所にクリック可能な参照リンクを明記。レビュー担当者が数秒で裏取りできる高い透明性を担保。',
      },
    ];

    researchItems.forEach((it, idx) => {
      const iy = 2.70 + idx * 1.32;
      s.addShape('roundRect', { x: MX + 0.30, y: iy, w: 0.54, h: 0.54, rectRadius: 0.08, fill: { color: it.soft }, line: { type: 'none' } });
      s.addText(it.num, { x: MX + 0.30, y: iy, w: 0.54, h: 0.54, fontFace: FONT_EN, fontSize: 13, bold: true, color: it.color, align: 'center', valign: 'middle', margin: 0 });
      s.addText(it.title, { x: MX + 1.02, y: iy - 0.02, w: leftW - 1.32, h: 0.32, fontFace: FONT_JA, fontSize: 12.5, bold: true, color: C.INK, margin: 0 });
      s.addText(it.desc, { x: MX + 1.02, y: iy + 0.34, w: leftW - 1.32, h: 0.78, fontFace: FONT_JA, fontSize: 10.2, color: C.BODY, lineSpacingMultiple: 1.35, margin: 0 });
    });

    s.addShape('roundRect', { x: rightX, y: 1.82, w: rightW, h: 4.94, rectRadius: 0.1, fill: { color: C.INK }, line: { color: C.DARK_BORDER, width: 1 } });
    addPill(s, 'EXTENSIBILITY ARCHITECTURE', rightX + 0.28, 2.04, 2.38, 0.28, { bg: C.DARK_SURFACE_2, fg: C.CYAN_BRIGHT, border: C.DARK_BORDER, fontFace: FONT_EN, fontSize: 8 });
    s.addText('組織・個人に最適化する 3つの拡張層', {
      x: rightX + 0.28,
      y: 2.38,
      w: rightW - 0.56,
      h: 0.36,
      fontFace: FONT_JA,
      fontSize: 14,
      bold: true,
      color: C.WHITE,
      margin: 0,
    });

    const layers = [
      {
        tag: 'LAYER 01',
        name: 'Skills & Rules',
        color: C.COBALT,
        desc: '業務ノウハウ・手順書・デザイン規約をスキルとして定義。タスク内容に応じて自動ロードし再現性を確保。',
      },
      {
        tag: 'LAYER 02',
        name: 'MCP Servers & Hooks',
        color: C.CYAN,
        desc: '外部サービス・社内ツール・イベントフックを安全に統合し、開発ワークフロー全体へ能力を拡張。',
      },
      {
        tag: 'LAYER 03',
        name: 'Schedule & Daemons',
        color: C.AMBER_BRIGHT,
        desc: 'Cron 定期実行・ワンショットタイマー・常駐プロセス管理により、監視や定期レポートを自律運用。',
      },
    ];

    layers.forEach((ly, idx) => {
      const lyY = 2.90 + idx * 1.24;
      s.addShape('roundRect', { x: rightX + 0.28, y: lyY, w: rightW - 0.56, h: 1.06, rectRadius: 0.08, fill: { color: C.DARK_SURFACE }, line: { color: C.DARK_BORDER, width: 0.8 } });
      s.addShape('rect', { x: rightX + 0.28, y: lyY + 0.14, w: 0.07, h: 0.78, fill: { color: ly.color }, line: { type: 'none' } });
      s.addText(ly.tag, { x: rightX + 0.48, y: lyY + 0.12, w: 0.9, h: 0.24, fontFace: FONT_EN, fontSize: 8, bold: true, color: ly.color, margin: 0 });
      s.addText(ly.name, { x: rightX + 1.36, y: lyY + 0.10, w: rightW - 1.76, h: 0.26, fontFace: FONT_EN, fontSize: 12, bold: true, color: C.WHITE, margin: 0 });
      s.addText(ly.desc, { x: rightX + 0.48, y: lyY + 0.40, w: rightW - 0.90, h: 0.58, fontFace: FONT_JA, fontSize: 9.2, color: C.DARK_BODY, lineSpacingMultiple: 1.3, margin: 0 });
    });

    addFooter(s, 7, TOTAL);
    s.addNotes(
      'リサーチと意思決定支援では、ファイル・行番号付きの根拠を必ず残すため検証が容易です。また右側の拡張スタックにより、SkillsやMCP・スケジュール実行を組み合わせてチーム専属のエージェントへ育てられます。'
    );
  }

  // =========================================================================
  // SLIDE 8: REAL-WORLD USE CASES — EXECUTIVE SCENARIO MATRIX
  // =========================================================================
  {
    const s = pptx.addSlide();
    addHeader(s, {
      kicker: '07 / REAL-WORLD SCENARIOS',
      title: '構想から運用まで — 実務シーン別の具体的な活用シナリオ',
      subtitle: '単なる部分補助にとどまらず、開発・調査・資料化・監査のボトルネックそのものを解消します。',
    });

    const tableY = 1.84;
    const col1W = 2.65;
    const col2W = 5.48;
    const col3W = CW - col1W - col2W;

    s.addShape('roundRect', { x: MX, y: tableY, w: CW, h: 0.48, rectRadius: 0.06, fill: { color: C.INK }, line: { type: 'none' } });
    const headers = [
      { t: '活用シーン', x: MX + 0.22, w: col1W - 0.22 },
      { t: 'Antigravity の自律ワークフロー', x: MX + col1W + 0.16, w: col2W - 0.24 },
      { t: '現場にもたらす価値', x: MX + col1W + col2W + 0.16, w: col3W - 0.28 },
    ];
    headers.forEach((hd) => {
      s.addText(hd.t, { x: hd.x, y: tableY, w: hd.w, h: 0.48, fontFace: FONT_JA, fontSize: 10.5, bold: true, color: C.WHITE, valign: 'middle', margin: 0 });
    });

    const rows = [
      {
        num: '01',
        scene: '新規プロダクト試作\n(0 → 1 開発)',
        accent: C.COBALT,
        soft: C.COBALT_SOFT,
        flow: '要件整理 → アーキテクチャ設計 → UI・API実装 → 必要画像の生成 → ローカル起動と画面・動作確認を一気通貫で実施',
        value: 'アイデアを最短時間で「触って検証できるプロトタイプ」に変換し意思決定を加速',
      },
      {
        num: '02',
        scene: '大規模コード調査\n& 安全な改修',
        accent: C.INDIGO,
        soft: C.INDIGO_SOFT,
        flow: '依存関係・影響範囲を並列探索 → 設計意図を把握 → 複数ファイルを整合性を保って同時修正 → ビルド＆回帰テストで検証',
        value: '属人化した既存コードの調査負荷を大幅に削減し、デグレを防ぎながら改修を推進',
      },
      {
        num: '03',
        scene: 'リサーチ・データ分析\n& 提案資料制作',
        accent: C.TEAL,
        soft: C.TEAL_SOFT,
        flow: 'Web最新情報・社内資料を収集 → Python等で集計・検証 → ストーリー設計 → PPTX / HTML 資料生成と全ページ視覚検査',
        value: '調査から経営・顧客向けの完成スライドまでワンストップで高品質に出力',
      },
      {
        num: '04',
        scene: '品質監査・レビュー\n& 定常タスク自動化',
        accent: C.CORAL,
        soft: C.CORAL_SOFT,
        flow: 'Python Workflow や Swarm で全モジュールを多角的に並列レビュー → 改善PR案作成 → Cron による定期チェックを自動化',
        value: '見落としやすい品質チェックを仕組み化し、チームの生産性と健全性を継続維持',
      },
    ];

    rows.forEach((r, idx) => {
      const ry = tableY + 0.62 + idx * 1.10;
      const rh = 0.98;

      s.addShape('roundRect', { x: MX, y: ry, w: CW, h: rh, rectRadius: 0.08, fill: { color: C.WHITE }, line: { color: C.BORDER, width: 1.0 } });
      s.addShape('rect', { x: MX, y: ry + 0.12, w: 0.08, h: rh - 0.24, fill: { color: r.accent }, line: { type: 'none' } });

      s.addShape('roundRect', { x: MX + 0.22, y: ry + 0.28, w: 0.42, h: 0.42, rectRadius: 0.06, fill: { color: r.soft }, line: { type: 'none' } });
      s.addText(r.num, { x: MX + 0.22, y: ry + 0.28, w: 0.42, h: 0.42, fontFace: FONT_EN, fontSize: 11, bold: true, color: r.accent, align: 'center', valign: 'middle', margin: 0 });
      s.addText(r.scene, {
        x: MX + 0.76,
        y: ry + 0.14,
        w: col1W - 0.86,
        h: 0.70,
        fontFace: FONT_JA,
        fontSize: 11.5,
        bold: true,
        color: C.INK,
        lineSpacingMultiple: 1.25,
        valign: 'middle',
        margin: 0,
      });

      s.addShape('line', { x: MX + col1W, y: ry + 0.16, w: 0, h: rh - 0.32, line: { color: C.BORDER, width: 0.75 } });
      s.addShape('line', { x: MX + col1W + col2W, y: ry + 0.16, w: 0, h: rh - 0.32, line: { color: C.BORDER, width: 0.75 } });

      s.addText(r.flow, {
        x: MX + col1W + 0.18,
        y: ry + 0.10,
        w: col2W - 0.36,
        h: rh - 0.20,
        fontFace: FONT_JA,
        fontSize: 10,
        color: C.BODY,
        lineSpacingMultiple: 1.32,
        valign: 'middle',
        margin: 0,
      });

      s.addShape('roundRect', { x: MX + col1W + col2W + 0.16, y: ry + 0.14, w: col3W - 0.30, h: rh - 0.28, rectRadius: 0.06, fill: { color: r.soft }, line: { type: 'none' } });
      s.addText(r.value, {
        x: MX + col1W + col2W + 0.28,
        y: ry + 0.16,
        w: col3W - 0.54,
        h: rh - 0.32,
        fontFace: FONT_JA,
        fontSize: 9.7,
        bold: true,
        color: C.INK,
        lineSpacingMultiple: 1.32,
        valign: 'middle',
        margin: 0,
      });
    });

    addFooter(s, 8, TOTAL);
    s.addNotes(
      '実務での代表的な4つのシナリオをまとめました。ゼロイチの試作から大規模レガシーコード改修、提案資料作成、継続的な品質監査まで、いずれも「調査→実行→検証」をまとめて任せられるのがポイントです。'
    );
  }

  // =========================================================================
  // SLIDE 9: LIVE META-PROOF (DARK SHOWCASE) — THIS DECK ITSELF IS THE PROOF
  // =========================================================================
  {
    const s = pptx.addSlide();
    addHeader(s, {
      kicker: '08 / PROOF BY EXECUTION',
      title: '語るだけでなく、今この資料そのもので実証する',
      subtitle: '「能力をアピールするスライドを作って」という一文から、以下の 5 工程をすべて自律実行して本資料を生成・検証しました。',
      dark: true,
    });

    const pipeSteps = [
      {
        step: 'STEP 01',
        title: '環境を自律調査',
        color: C.CYAN_BRIGHT,
        desc: 'OS・日本語フォント・pptxgenjs・Chrome・Keynote 等の利用可能ツールを自動検出し最適な制作環境を確立。',
      },
      {
        step: 'STEP 02',
        title: '構成＆デザイン設計',
        color: C.COBALT,
        desc: '全10枚のストーリー・配色トークン・毎スライド異なる視覚レイアウトをグリッド単位で設計。',
      },
      {
        step: 'STEP 03',
        title: '専用ビジュアル生成',
        color: '818CF8',
        desc: 'image-generator サブエージェントを 2 体並列起動し、本資料専用の 3D 挿絵を同時制作・最適化。',
      },
      {
        step: 'STEP 04',
        title: '複数媒体を同時構築',
        color: 'FB923C',
        desc: 'ネイティブ編集可能な .pptx とブラウザ完結のインタラクティブ .html をコードから精密生成。',
      },
      {
        step: 'STEP 05',
        title: '全スライド視覚検証',
        color: '2DD4BF',
        desc: 'PDF→PNG 変換した全10枚を自ら画像として目視検査し、影崩れや図解ライン・余白を徹底修正。',
      },
    ];

    const pGap = 0.20;
    const pW = (CW - pGap * 4) / 5;
    const pY = 1.98;
    const pH = 3.16;

    pipeSteps.forEach((ps, i) => {
      const px = MX + i * (pW + pGap);

      s.addShape('roundRect', { x: px, y: pY, w: pW, h: pH, rectRadius: 0.08, fill: { color: C.DARK_SURFACE }, line: { color: C.DARK_BORDER, width: 1 } });
      s.addShape('rect', { x: px, y: pY, w: pW, h: 0.08, fill: { color: ps.color }, line: { type: 'none' } });

      s.addText(ps.step, {
        x: px + 0.18,
        y: pY + 0.24,
        w: pW - 0.36,
        h: 0.26,
        fontFace: FONT_EN,
        fontSize: 9.5,
        bold: true,
        charSpacing: 1.2,
        color: ps.color,
        margin: 0,
      });

      s.addText(ps.title, {
        x: px + 0.18,
        y: pY + 0.56,
        w: pW - 0.36,
        h: 0.52,
        fontFace: FONT_JA,
        fontSize: 13.5,
        bold: true,
        color: C.WHITE,
        lineSpacingMultiple: 1.2,
        margin: 0,
      });

      s.addShape('line', { x: px + 0.18, y: pY + 1.16, w: pW - 0.36, h: 0, line: { color: C.DARK_BORDER, width: 0.75 } });

      s.addText(ps.desc, {
        x: px + 0.18,
        y: pY + 1.32,
        w: pW - 0.36,
        h: 1.66,
        fontFace: FONT_JA,
        fontSize: 9.8,
        color: C.DARK_BODY,
        lineSpacingMultiple: 1.42,
        margin: 0,
        valign: 'top',
      });

      if (i < pipeSteps.length - 1) {
        s.addText('›', {
          x: px + pW,
          y: pY + 1.35,
          w: pGap,
          h: 0.4,
          fontFace: FONT_EN,
          fontSize: 18,
          bold: true,
          color: C.CYAN_BRIGHT,
          align: 'center',
          valign: 'middle',
          margin: 0,
        });
      }
    });

    const dY = 5.44;
    const dH = 1.24;
    s.addShape('roundRect', { x: MX, y: dY, w: CW, h: dH, rectRadius: 0.1, fill: { color: C.DARK_SURFACE_2 }, line: { color: C.COBALT, width: 1.1 } });
    s.addShape('rect', { x: MX, y: dY + 0.18, w: 0.08, h: dH - 0.36, fill: { color: C.CYAN_BRIGHT }, line: { type: 'none' } });

    s.addText('DELIVERABLES GENERATED IN THIS SESSION', {
      x: MX + 0.28,
      y: dY + 0.16,
      w: 5.5,
      h: 0.24,
      fontFace: FONT_EN,
      fontSize: 8.5,
      bold: true,
      charSpacing: 1.4,
      color: C.CYAN_BRIGHT,
      margin: 0,
    });

    const files = [
      { f: 'antigravity_capabilities.pptx', note: 'ネイティブ編集可能・全ページ発表者ノート付き', col: C.COBALT },
      { f: 'antigravity_capabilities.pdf', note: '配布・レビュー用の高精細 PDF エクスポート', col: '2DD4BF' },
      { f: 'antigravity_capabilities.html', note: 'キーボード操作・一覧・ノート切替対応 Web 版', col: 'FB923C' },
    ];
    files.forEach((fl, idx) => {
      const fx = MX + 0.28 + idx * 3.88;
      s.addShape('roundRect', { x: fx, y: dY + 0.46, w: 3.70, h: 0.64, rectRadius: 0.06, fill: { color: C.DARK_BG }, line: { color: C.DARK_BORDER, width: 0.8 } });
      s.addShape('ellipse', { x: fx + 0.16, y: dY + 0.62, w: 0.10, h: 0.10, fill: { color: fl.col }, line: { type: 'none' } });
      s.addText(fl.f, { x: fx + 0.34, y: dY + 0.52, w: 3.24, h: 0.26, fontFace: FONT_EN, fontSize: 10, bold: true, color: C.WHITE, margin: 0 });
      s.addText(fl.note, { x: fx + 0.34, y: dY + 0.80, w: 3.24, h: 0.24, fontFace: FONT_JA, fontSize: 8.5, color: C.DARK_MUTED, margin: 0 });
    });

    addFooter(s, 9, TOTAL, true);
    s.addNotes(
      '能力を言葉で語るだけでなく、このスライド資料自体が実証結果です。環境調査・構成設計・画像サブエージェント並列生成・PPTXとHTMLのコード構築・全ページ目視検証までをすべて単一セッションで自律実行しました。'
    );
  }

  // =========================================================================
  // SLIDE 10: TRUST, COLLABORATION & CLOSING (DARK FINALE)
  // =========================================================================
  {
    const s = pptx.addSlide();
    s.background = { color: C.DARK_BG };
    s.addShape('rect', { x: 0, y: 0, w: 8.5, h: 0.06, fill: { color: C.COBALT }, line: { type: 'none' } });
    s.addShape('rect', { x: 8.5, y: 0, w: W - 8.5, h: 0.06, fill: { color: C.CYAN }, line: { type: 'none' } });

    s.addShape('rect', { x: MX, y: 0.62, w: 0.24, h: 0.04, fill: { color: C.CYAN_BRIGHT }, line: { type: 'none' } });
    s.addText('09 / TRUST & COLLABORATION', {
      x: MX + 0.34,
      y: 0.50,
      w: 5.0,
      h: 0.26,
      fontFace: FONT_EN,
      fontSize: 10,
      bold: true,
      charSpacing: 1.8,
      color: C.CYAN_BRIGHT,
      margin: 0,
      valign: 'middle',
    });

    s.addText('安心して任せられる、\n透明で誠実な協働スタイル', {
      x: MX,
      y: 0.88,
      w: 6.1,
      h: 1.04,
      fontFace: FONT_JA,
      fontSize: 26,
      bold: true,
      color: C.WHITE,
      lineSpacingMultiple: 1.25,
      margin: 0,
    });

    const commitments = [
      {
        title: '安全性と境界の厳守',
        accent: C.COBALT,
        desc: '権限チェック・アクセス制御・セキュリティ境界を一切迂回せず、正規かつ安全な手順のみで作業を遂行します。',
      },
      {
        title: '推測せず、的確な対話で合意形成',
        accent: C.CYAN_BRIGHT,
        desc: '重要な仕様分岐や設計判断は勝手に決めつけず、論点を整理した選択肢で素早く確認してから前へ進めます。',
      },
      {
        title: '検証済みの一次情報に基づく誠実な報告',
        accent: '2DD4BF',
        desc: '過度な誇張や未確認の推測を避け、実際の実行結果・テスト結果・参照ファイルリンクを明示して共有します。',
      },
    ];

    commitments.forEach((cm, idx) => {
      const cy = 2.26 + idx * 1.46;
      s.addShape('roundRect', { x: MX, y: cy, w: 6.08, h: 1.28, rectRadius: 0.08, fill: { color: C.DARK_SURFACE }, line: { color: C.DARK_BORDER, width: 0.9 } });
      s.addShape('rect', { x: MX, y: cy + 0.16, w: 0.08, h: 0.96, fill: { color: cm.accent }, line: { type: 'none' } });
      s.addText(cm.title, { x: MX + 0.28, y: cy + 0.18, w: 5.56, h: 0.34, fontFace: FONT_JA, fontSize: 13.5, bold: true, color: C.WHITE, margin: 0 });
      s.addText(cm.desc, { x: MX + 0.28, y: cy + 0.56, w: 5.56, h: 0.58, fontFace: FONT_JA, fontSize: 10.2, color: C.DARK_BODY, lineSpacingMultiple: 1.35, margin: 0 });
    });

    const ctaX = 7.12;
    const ctaY = 0.72;
    const ctaW = W - MX - ctaX;
    const ctaH = 5.96;

    s.addShape('roundRect', { x: ctaX, y: ctaY, w: ctaW, h: ctaH, rectRadius: 0.12, fill: { color: C.DARK_SURFACE_2 }, line: { color: C.COBALT, width: 1.2 } });
    s.addShape('rect', { x: ctaX + 0.36, y: ctaY + 0.42, w: 0.85, h: 0.06, fill: { color: C.CYAN_BRIGHT }, line: { type: 'none' } });

    s.addText('次のプロジェクトを、\n一緒に形にしましょう。', {
      x: ctaX + 0.36,
      y: ctaY + 0.66,
      w: ctaW - 0.72,
      h: 0.96,
      fontFace: FONT_JA,
      fontSize: 22,
      bold: true,
      color: C.WHITE,
      lineSpacingMultiple: 1.3,
      margin: 0,
    });

    s.addText('曖昧な構想段階でも、複雑な既存システムでも。\nまずは解決したい課題をそのまま伝えてください。', {
      x: ctaX + 0.36,
      y: ctaY + 1.72,
      w: ctaW - 0.72,
      h: 0.62,
      fontFace: FONT_JA,
      fontSize: 10.8,
      color: C.DARK_MUTED,
      lineSpacingMultiple: 1.4,
      margin: 0,
    });

    s.addText('TRY ASKING', {
      x: ctaX + 0.36,
      y: ctaY + 2.50,
      w: 3.0,
      h: 0.24,
      fontFace: FONT_EN,
      fontSize: 8.5,
      bold: true,
      charSpacing: 1.4,
      color: C.CYAN_BRIGHT,
      margin: 0,
    });

    const prompts = [
      '「既存リポジトリを調査してボトルネックと改善案をまとめて」',
      '「このアイデアから動く Web アプリを設計・実装・検証して」',
      '「最新データを調べて提案スライドと分析レポートを作って」',
    ];
    prompts.forEach((pr, idx) => {
      const py = ctaY + 2.82 + idx * 0.64;
      s.addShape('roundRect', { x: ctaX + 0.36, y: py, w: ctaW - 0.72, h: 0.52, rectRadius: 0.07, fill: { color: C.DARK_BG }, line: { color: C.DARK_BORDER, width: 0.85 } });
      s.addText(pr, { x: ctaX + 0.52, y: py, w: ctaW - 1.04, h: 0.52, fontFace: FONT_JA, fontSize: 9.8, color: 'E2E8F0', valign: 'middle', margin: 0 });
    });

    s.addShape('line', { x: ctaX + 0.36, y: ctaY + 4.86, w: ctaW - 0.72, h: 0, line: { color: C.DARK_BORDER, width: 0.75 } });
    s.addText('POWER WORKFLOW SHORTCUTS', {
      x: ctaX + 0.36,
      y: ctaY + 4.98,
      w: 4.0,
      h: 0.24,
      fontFace: FONT_EN,
      fontSize: 8,
      bold: true,
      charSpacing: 1.2,
      color: C.DARK_MUTED,
      margin: 0,
    });

    const cmds = [
      { c: '/plan', l: '設計立案' },
      { c: '/teamwork', l: '並列開発' },
      { c: '/boost', l: '深層検証' },
      { c: '/schedule', l: '定期実行' },
    ];
    cmds.forEach((cm, idx) => {
      const cx = ctaX + 0.36 + idx * 1.22;
      addPill(s, `${cm.c}`, cx, ctaY + 5.26, 1.12, 0.30, { bg: C.COBALT, fg: C.WHITE, fontFace: FONT_EN, fontSize: 8.8 });
      s.addText(cm.l, { x: cx, y: ctaY + 5.58, w: 1.12, h: 0.22, fontFace: FONT_JA, fontSize: 8, color: C.DARK_MUTED, align: 'center', margin: 0 });
    });

    addFooter(s, 10, TOTAL, true);
    s.addNotes(
      '最後に、Antigravityが最も大切にしているのは「安心して任せられる透明な協働」です。セキュリティ境界の厳守・的確な合意形成・一次情報に基づく報告をお約束します。ぜひ次のプロジェクトからご一緒させてください。'
    );
  }

  return pptx.writeFile({ fileName: OUT_PPTX }).then(() => {
    console.log(`Generated PPTX: ${OUT_PPTX}`);
  });
}

buildDeck().catch((err) => {
  console.error(err);
  process.exit(1);
});
