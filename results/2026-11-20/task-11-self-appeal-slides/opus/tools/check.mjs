// slides.html の見た目の問題を自動で探す。結果は checks/check-log.jsonl に1行ずつ追記し、checks/latest.json に上書きする。
// 使い方（この資料のフォルダで）: node tools/check.mjs [--label メモ]
// 調べること
//   overflow-slide : 要素がスライド（1920×1080）の外にはみ出している
//   overflow-box   : 枠（overflow が visible 以外の要素）の中身が切れている
//   overlap        : 別々の要素の文字どうしが重なっている
//   small-text     : 20px 未満の文字
//   widow          : 2行以上の段落で、最後の行が1〜2文字だけ（泣き別れ）
//   contrast       : 文字と背景のコントラスト比が WCAG の基準未満（大きな文字は 3:1、それ以外は 4.5:1）
//   image          : 画像が読み込めていない
//   font           : フォントが読み込めていない
import { chromium } from 'playwright-core';
import { mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const argv = process.argv.slice(2);
const label = argv.includes('--label') ? argv[argv.indexOf('--label') + 1] : '';

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(ROOT, 'slides.html')).href + '?render', { waitUntil: 'load' });
await page.evaluate(async () => { await Promise.all([...document.fonts].map(f => f.load().catch(() => null))); await document.fonts.ready; });

const issues = await page.evaluate(() => {
  const out = [];
  const slides = [...document.querySelectorAll('.slide')];
  const snippet = (s) => (s || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const isHidden = (el) => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return true; } return false; };
  const skip = (el) => !!el.closest('.notes,[data-deco]');

  // フォント
  [...document.fonts].forEach(f => { if (f.status !== 'loaded') out.push({ slide: 0, rule: 'font', detail: `${f.family} ${f.weight}: ${f.status}` }); });

  // 色の計算
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const bgOf = (el) => {
    const stack = [];
    for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } }
    let res = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) res = over(stack[i], res);
    return res;
  };

  slides.forEach((slide, si) => {
    const n = si + 1;
    const sr = slide.getBoundingClientRect();
    const all = [...slide.querySelectorAll('*')].filter(el => !skip(el) && !isHidden(el));

    // スライド外へのはみ出し
    all.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.left < sr.left - 1 || r.top < sr.top - 1 || r.right > sr.right + 1 || r.bottom > sr.bottom + 1) {
        if (el.closest('.receipt-wrap') && el !== el.closest('.receipt-wrap')) return; // 回転した明細の中身は外枠で判定
        out.push({ slide: n, rule: 'overflow-slide', detail: `${el.tagName.toLowerCase()}.${el.className} 「${snippet(el.textContent)}」 (${Math.round(r.left - sr.left)},${Math.round(r.top - sr.top)})-(${Math.round(r.right - sr.left)},${Math.round(r.bottom - sr.top)})` });
      }
    });

    // 枠の中での切れ
    all.forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.overflow === 'visible' && cs.overflowX === 'visible' && cs.overflowY === 'visible') return;
      if (el.classList.contains('slide') || el.classList.contains('ph')) return; // スライド本体と写真の枠（object-fit）は除外
      if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) {
        out.push({ slide: n, rule: 'overflow-box', detail: `${el.tagName.toLowerCase()}.${el.className} 「${snippet(el.textContent)}」 scroll ${el.scrollWidth}x${el.scrollHeight} > ${el.clientWidth}x${el.clientHeight}` });
      }
    });
    // フレーム（.frame）の中身が下にあふれていないか：子要素の下端がフレームの下端を超えたら
    slide.querySelectorAll('.frame').forEach(fr => {
      const fb = fr.getBoundingClientRect().bottom;
      [...fr.querySelectorAll('*')].filter(el => !skip(el) && !isHidden(el)).forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.bottom > fb + 1) out.push({ slide: n, rule: 'overflow-box', detail: `.frame の下端を ${Math.round(r.bottom - fb)}px 超過: ${el.tagName.toLowerCase()}.${el.className} 「${snippet(el.textContent)}」` });
      });
    });

    slide.querySelectorAll('.body').forEach(bd => {
      const bb = bd.getBoundingClientRect().bottom;
      [...bd.querySelectorAll('*')].filter(el => !skip(el) && !isHidden(el) && !el.closest('[data-rot]')).forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.bottom > bb + 1) out.push({ slide: n, rule: 'overflow-box', detail: `本文エリア(.body)の下端を ${Math.round(r.bottom - bb)}px 超過: ${el.tagName.toLowerCase()}.${el.className} 「${snippet(el.textContent)}」` });
      });
    });

    // 文字のかたまり（テキストノード）ごとの行の矩形
    const textNodes = [];
    const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      if (!t.textContent.trim()) continue;
      const el = t.parentElement;
      if (skip(el) || isHidden(el)) continue;
      textNodes.push(t);
    }
    const rects = [];
    textNodes.forEach(t => {
      const rg = document.createRange(); rg.selectNodeContents(t);
      [...rg.getClientRects()].forEach(r => { if (r.width > 0.5 && r.height > 0.5) rects.push({ r, el: t.parentElement, t }); });
    });
    // 重なり（同じ回転要素 data-rot の内側どうしは、回転で外接矩形が膨らむので除外）
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      if (a.t === b.t) continue;
      const ra = a.el.closest('[data-rot]'), rb = b.el.closest('[data-rot]');
      if (ra && ra === rb) continue;
      if (a.el.contains(b.el) || b.el.contains(a.el)) {
        // 親子関係でも、別のテキストノード同士が重なるのは問題
      }
      const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      // 行ボックスは字面より少し大きいので、高さの 35% 以上・幅 4px 以上の重なりだけを数える
      if (w > 4 && h > Math.min(a.r.height, b.r.height) * 0.35) {
        out.push({ slide: n, rule: 'overlap', detail: `「${snippet(a.t.textContent)}」 と 「${snippet(b.t.textContent)}」` });
      }
    }

    // 小さな文字・コントラスト
    const seen = new Set();
    textNodes.forEach(t => {
      const el = t.parentElement; if (seen.has(el)) return; seen.add(el);
      const cs = getComputedStyle(el);
      const fs = parseFloat(cs.fontSize);
      if (fs < 20) out.push({ slide: n, rule: 'small-text', detail: `${fs}px 「${snippet(t.textContent)}」` });
      const fg = parse(cs.color); if (!fg) return;
      const bg = bgOf(el);
      const fgc = fg.a < 1 ? over(fg, bg) : fg;
      const L1 = lum(fgc), L2 = lum(bg);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const weight = parseInt(cs.fontWeight, 10) || 400;
      const large = fs >= 24 * 4 / 3 || (fs >= 18.66 && weight >= 700);
      const need = large ? 3 : 4.5;
      if (ratio < need) out.push({ slide: n, rule: 'contrast', detail: `${ratio.toFixed(2)} < ${need} 「${snippet(t.textContent)}」` });
    });

    // 泣き別れ（段落の最後の行が1〜2文字）
    const blocks = new Set();
    textNodes.forEach(t => {
      let el = t.parentElement;
      while (el && el !== slide && ['inline', 'contents'].includes(getComputedStyle(el).display)) el = el.parentElement;
      if (el && el !== slide) blocks.add(el);
    });
    blocks.forEach(block => {
      if (block.closest('[data-rot]')) return;
      const chars = [];
      const w2 = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      for (let t = w2.nextNode(); t; t = w2.nextNode()) {
        // 入れ子のブロックの中身は、そのブロック側で数える
        let p = t.parentElement, nested = false;
        while (p && p !== block) { if (!['inline', 'contents'].includes(getComputedStyle(p).display)) { nested = true; break; } p = p.parentElement; }
        if (nested || skip(t.parentElement)) continue;
        const s = t.textContent;
        for (let k = 0; k < s.length; k++) {
          if (/\s/.test(s[k])) continue;
          const rg = document.createRange(); rg.setStart(t, k); rg.setEnd(t, k + 1);
          const r = rg.getBoundingClientRect();
          if (r.width > 0) chars.push({ ch: s[k], top: Math.round(r.top + r.height / 2) });
        }
      }
      if (chars.length < 4) return;
      const lines = [];
      chars.forEach(c => { const L = lines.find(l => Math.abs(l.top - c.top) < 6); if (L) L.n++, L.s += c.ch; else lines.push({ top: c.top, n: 1, s: c.ch }); });
      lines.sort((a, b) => a.top - b.top);
      if (lines.length >= 2) {
        const last = lines[lines.length - 1];
        if (last.n <= 2) out.push({ slide: n, rule: 'widow', detail: `最後の行が「${last.s}」だけ: 「${snippet(block.textContent)}」` });
      }
    });

    // 画像
    slide.querySelectorAll('img').forEach(img => { if (!img.complete || !img.naturalWidth) out.push({ slide: n, rule: 'image', detail: img.getAttribute('src') }); });
  });
  return out;
});

await browser.close();

// 同じ問題は1回だけ数える
const uniq = [];
const keys = new Set();
for (const i of issues) { const k = `${i.slide}|${i.rule}|${i.detail}`; if (!keys.has(k)) { keys.add(k); uniq.push(i); } }

const byRule = {};
uniq.forEach(i => { byRule[i.rule] = (byRule[i.rule] || 0) + 1; });
const rec = { time: new Date().toISOString(), label, total: uniq.length, byRule, issues: uniq };
mkdirSync(join(ROOT, 'checks'), { recursive: true });
appendFileSync(join(ROOT, 'checks/check-log.jsonl'), JSON.stringify(rec) + '\n');
writeFileSync(join(ROOT, 'checks/latest.json'), JSON.stringify(rec, null, 2) + '\n');

console.log(`検査結果: ${uniq.length} 件`, JSON.stringify(byRule));
uniq.forEach(i => console.log(`  p.${String(i.slide).padStart(2, '0')} [${i.rule}] ${i.detail}`));
process.exitCode = uniq.length ? 1 : 0;
