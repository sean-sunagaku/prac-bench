// slides.html から、フォントのサブセット・PNG・PDF・コンタクトシート・話す原稿を作る。
// 使い方（この資料のフォルダで）: node tools/build.mjs [--no-fonts] [--no-png] [--no-pdf] [--no-sheet]
//   必要なもの: Google Chrome、playwright-core（tools/ で npm i）、fonttools（pyftsubset）
//   フォントの原本（OFL 1.1）の置き場所は環境変数 FONT_SRC（既定 ~/.cache/opus-t11/fonts）
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, copyFileSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FONT_SRC = process.env.FONT_SRC || join(os.homedir(), '.cache/opus-t11/fonts');
const PYFTSUBSET = process.env.PYFTSUBSET || (existsSync('/tmp/opus-t11-venv/bin/pyftsubset') ? '/tmp/opus-t11-venv/bin/pyftsubset' : 'pyftsubset');
const FONTS = [
  'ShipporiMincho-ExtraBold',
  'ZenKakuGothicNew-Regular', 'ZenKakuGothicNew-Medium', 'ZenKakuGothicNew-Bold',
  'IBMPlexMono-Regular', 'IBMPlexMono-Medium', 'IBMPlexMono-SemiBold',
];
const args = new Set(process.argv.slice(2));
const URL_RENDER = pathToFileURL(join(ROOT, 'slides.html')).href + '?render';

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

async function load() {
  await page.goto(URL_RENDER, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await Promise.all([...document.fonts].map(f => f.load().catch(() => null)));
    await document.fonts.ready;
  });
  const bad = await page.evaluate(() => [...document.fonts].filter(f => f.status !== 'loaded').map(f => `${f.family} ${f.weight}`));
  return bad;
}

try {
  // 1) 使っている文字だけでフォントを作り直す
  if (!args.has('--no-fonts')) {
    await load();
    const text = await page.evaluate(() => {
      const parts = [document.title, document.body.innerText];
      document.querySelectorAll('[alt],[aria-label]').forEach(el => parts.push(el.getAttribute('alt') || '', el.getAttribute('aria-label') || ''));
      document.querySelectorAll('.notes').forEach(el => parts.push(el.textContent));
      // CSS の ::before / ::after で出している文字（「提案」「→」など）も含める
      document.querySelectorAll('*').forEach(el => ['::before', '::after'].forEach(ps => { const c = getComputedStyle(el, ps).content; if (c && c !== 'none' && c !== 'normal') parts.push(c.replace(/^"|"$/g, '')); }));
      return parts.join('\n');
    });
    let base = '';
    for (let c = 0x20; c < 0x7f; c++) base += String.fromCharCode(c);
    base += '「」『』（）［］【】、。・ー…–—→←↑↓「」○●◯①②③④⑤⑥⑦⑧⑨⑩％＋－＝／：；！？　〜';
    const chars = [...new Set([...base, ...text])].filter(ch => ch !== '\n' && ch !== '\r').join('');
    const tf = join(os.tmpdir(), 'opus-t11-chars.txt');
    writeFileSync(tf, chars);
    const outDir = join(ROOT, 'assets/fonts');
    mkdirSync(outDir, { recursive: true });
    for (const f of FONTS) {
      execFileSync(PYFTSUBSET, [join(FONT_SRC, f + '.ttf'), `--text-file=${tf}`, '--flavor=woff2', `--output-file=${join(outDir, f + '.woff2')}`,
        '--layout-features=*', '--no-hinting', '--desubroutinize', '--name-IDs=*', '--name-languages=*'], { stdio: 'inherit' });
    }
    for (const lic of ['OFL-shipporimincho.txt', 'OFL-zenkakugothicnew.txt', 'OFL-ibmplexmono.txt']) {
      if (existsSync(join(FONT_SRC, lic))) copyFileSync(join(FONT_SRC, lic), join(outDir, lic));
    }
    console.log(`fonts: ${chars.length} 文字でサブセットを作成`);
  }

  const bad = await load();
  if (bad.length) throw new Error('読み込めなかったフォント: ' + bad.join(', '));
  const meta = await page.evaluate(() => [...document.querySelectorAll('.slide')].map((s, i) => ({
    n: i + 1, title: s.dataset.title, notes: (s.querySelector('.notes')?.textContent || '').trim(),
  })));

  // 2) 1枚ずつ PNG
  if (!args.has('--no-png')) {
    const dir = join(ROOT, 'png');
    if (existsSync(dir)) for (const f of readdirSync(dir)) if (f.endsWith('.png')) rmSync(join(dir, f));
    mkdirSync(dir, { recursive: true });
    const els = await page.$$('.slide');
    for (let i = 0; i < els.length; i++) {
      await els[i].screenshot({ path: join(dir, `slide-${String(i + 1).padStart(2, '0')}.png`) });
    }
    console.log(`png: ${els.length} 枚`);
  }

  // 3) PDF
  if (!args.has('--no-pdf')) {
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: join(ROOT, 'slides.pdf'), width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
    await page.emulateMedia({ media: 'screen' });
    console.log('pdf: slides.pdf');
  }

  // 4) コンタクトシート（全ページの一覧画像）
  if (!args.has('--no-sheet')) {
    const cols = 4, w = 560, h = 315, gap = 36, pad = 64;
    const rows = Math.ceil(meta.length / cols);
    const W = pad * 2 + cols * w + (cols - 1) * gap;
    const cells = meta.map(m => `<figure><img src="${pathToFileURL(join(ROOT, 'png', `slide-${String(m.n).padStart(2, '0')}.png`)).href}"><figcaption><b>${String(m.n).padStart(2, '0')}</b>${m.title}</figcaption></figure>`).join('');
    const html = `<!doctype html><html lang="ja"><meta charset="utf-8"><style>
      @font-face{font-family:Z;src:url("${pathToFileURL(join(ROOT, 'assets/fonts/ZenKakuGothicNew-Medium.woff2')).href}")}
      @font-face{font-family:S;src:url("${pathToFileURL(join(ROOT, 'assets/fonts/ShipporiMincho-ExtraBold.woff2')).href}")}
      @font-face{font-family:M;src:url("${pathToFileURL(join(ROOT, 'assets/fonts/IBMPlexMono-Medium.woff2')).href}")}
      body{margin:0;background:#2B2723;width:${W}px;padding:${pad}px;box-sizing:border-box;font-family:Z,sans-serif;color:#F4EFE6}
      h1{margin:0 0 8px;font:800 44px/1.3 S,serif}p{margin:0 0 40px;font:500 22px/1.5 Z;color:#B9AE9E}
      .g{display:grid;grid-template-columns:repeat(${cols},${w}px);gap:${gap}px}
      figure{margin:0}img{width:${w}px;height:${h}px;display:block;border-radius:6px}
      figcaption{margin-top:12px;font:500 20px/1.4 Z;color:#E4DACA}figcaption b{font:500 18px/1 M;color:#E08A6C;margin-right:12px}
    </style><body><h1>Claude Opus 5.5 — 一文で頼めて、最後まで任せられる。</h1><p>能力紹介スライド　全${meta.length}枚（1920×1080）</p><div class="g">${cells}</div></body></html>`;
    const tmp = join(os.tmpdir(), 'opus-t11-sheet.html');
    writeFileSync(tmp, html);
    const p2 = await browser.newPage({ viewport: { width: W, height: 800 }, deviceScaleFactor: 1 });
    await p2.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
    await p2.evaluate(async () => { await document.fonts.ready; });
    await p2.screenshot({ path: join(ROOT, 'contact-sheet.png'), fullPage: true });
    await p2.close();
    console.log(`sheet: contact-sheet.png（${cols}列×${rows}行）`);
  }

  // 5) 話す原稿
  const md = ['# 話す原稿（スピーカーノート）', '', 'slides.html の各ページに埋め込んだ原稿を書き出したもの。', '']
    .concat(meta.flatMap(m => [`## ${String(m.n).padStart(2, '0')}. ${m.title}`, '', m.notes, '']));
  writeFileSync(join(ROOT, 'speaker-notes.md'), md.join('\n'));
  console.log('notes: speaker-notes.md');
} finally {
  await browser.close();
}
