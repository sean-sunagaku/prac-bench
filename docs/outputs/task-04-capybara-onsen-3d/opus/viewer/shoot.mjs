#!/usr/bin/env node
/**
 * index.html を Chrome headless（puppeteer-core + システムの Google Chrome）で開いて撮影する。
 *
 *   node viewer/shoot.mjs [--root DIR] [--turntable N] [--gl auto|metal|swiftshader] [--only name,name]
 *
 *   previews/web_studio_{front,diag,right,back,top}.png, previews/web_mood_{front,capy}.png（1280x960）
 *   --turntable N : /tmp/capy-work/tt_web/frame_###.png に studio モードで N 枚（方位角 0→360）
 *
 * ページのコンソール警告・エラー、pageerror、読み込み失敗はすべてログに出し、最後に件数をまとめる。
 * 各画像は WebGL の描画バッファから平均輝度・標準偏差・前景率を測って、真っ黒/真っ白/空っぽを検出する。
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, def = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def;
};
const ROOT = path.resolve(opt('root', path.join(HERE, '..')));
const DEPS = path.resolve(process.env.CAPY_VIEWER_DEPS || '/tmp/capy-work/viewer-build');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TURNTABLE = Math.max(0, parseInt(opt('turntable', '0'), 10) || 0);
const TT_DIR = opt('tt-dir', '/tmp/capy-work/tt_web');
const GL = opt('gl', 'auto');
const ONLY = opt('only') ? new Set(opt('only').split(',')) : null;
const UI_SHOTS = args.includes('--ui'); // UI 付きの確認用（web_ui_*.png）も撮る
const W = 1280;
const H = 960;

const SHOTS = [
  ['web_studio_front', { mode: 'studio', view: 'front' }],
  ['web_studio_diag', { mode: 'studio', view: 'diag' }],
  ['web_studio_right', { mode: 'studio', view: 'right' }],
  ['web_studio_back', { mode: 'studio', view: 'back' }],
  ['web_studio_top', { mode: 'studio', view: 'top' }],
  ['web_mood_front', { mode: 'mood', view: 'front' }],
  ['web_mood_capy', { mode: 'mood', view: 'capy' }],
];

const FLAGS = {
  metal: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl'],
  swiftshader: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl'],
};
const COMMON_FLAGS = [
  '--hide-scrollbars', '--mute-audio', '--no-first-run', '--no-default-browser-check',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows', '--disable-extensions',
  `--window-size=${W},${H}`,
];

const req = createRequire(path.join(DEPS, 'package.json'));
let puppeteer;
try {
  puppeteer = req('puppeteer-core');
} catch (e) {
  console.error(`[shoot] puppeteer-core が見つかりません（${DEPS}）。先に node viewer/build.mjs を実行してください`);
  process.exit(1);
}

const issues = { error: [], warning: [], driver: [] };
// 検査用の readPixels が原因で SwiftShader 等が出すドライバの性能通知（ビューア由来ではない）
const DRIVER_NOTICE = /GL Driver Message .*GPU stall due to ReadPixels/;
function attachLogging(page, tag) {
  page.on('console', (m) => {
    const t = m.type();
    const text = m.text();
    if (DRIVER_NOTICE.test(text)) {
      issues.driver.push(`${tag}: ${text}`);
      return;
    }
    if (t === 'error') issues.error.push(`${tag}: ${text}`);
    else if (t === 'warn' || t === 'warning') issues.warning.push(`${tag}: ${text}`);
    if (t === 'error' || t === 'warn' || t === 'warning') console.log(`  [page ${t}] ${text}`);
  });
  page.on('pageerror', (e) => {
    issues.error.push(`${tag}: pageerror ${e.message}`);
    console.log(`  [pageerror] ${e.message}`);
  });
  page.on('requestfailed', (r) => {
    issues.error.push(`${tag}: requestfailed ${r.url().slice(0, 120)}`);
    console.log(`  [requestfailed] ${r.url().slice(0, 120)} ${r.failure() && r.failure().errorText}`);
  });
}

const htmlURL = pathToFileURL(path.join(ROOT, 'index.html')).href;
const urlFor = (p) => `${htmlURL}?${new URLSearchParams({ ui: '0', rotate: '0', time: '18', seed: '7', ...p })}`;

async function openViewer(browser, params, tag) {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  attachLogging(page, tag);
  const t0 = Date.now();
  await page.goto(urlFor(params), { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__ready === true || typeof window.__error === "string"', { timeout: 240000, polling: 100 });
  const err = await page.evaluate(() => window.__error || null);
  if (err) throw new Error(`ビューアがエラーを報告: ${err}`);
  return { page, ms: Date.now() - t0 };
}

async function launch(kind) {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [...FLAGS[kind], ...COMMON_FLAGS],
    defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
    protocolTimeout: 600000,
  });
}

/** WebGL が実際に動くフラグセットを選ぶ（auto: metal → swiftshader） */
async function pickBrowser() {
  const order = GL === 'auto' ? ['metal', 'swiftshader'] : [GL];
  for (const kind of order) {
    let browser;
    try {
      browser = await launch(kind);
      const { page, ms } = await openViewer(browser, { mode: 'studio', view: 'front' }, `probe:${kind}`);
      const info = await page.evaluate(() => window.__viewer.info());
      const st = await page.evaluate(() => window.__viewer.stats());
      await page.close();
      if (st.std < 1 || st.coverage < 0.01) throw new Error(`描画が空です（${JSON.stringify(st)}）`);
      console.log(`[shoot] WebGL OK: ${kind} / ${info.gl || '(renderer 不明)'} / 初回読み込み ${ms} ms`);
      return { browser, kind, info };
    } catch (e) {
      console.log(`[shoot] ${kind} では WebGL を使えませんでした: ${e.message}`);
      if (browser) await browser.close().catch(() => {});
    }
  }
  throw new Error('WebGL が動く Chrome の起動フラグが見つかりませんでした');
}

/** UI 付きの確認用スクリーンショット（デスクトップ・チェック項目クリック・スマホ幅） */
async function shootUI(browser, outDir) {
  const desktop = { width: 1440, height: 900, deviceScaleFactor: 1 };
  const mobile = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  const cases = [
    { name: 'web_ui_desktop', vp: desktop, params: { mode: 'mood' } },
    // 情報パネルを開き、③をクリックしてカメラ移動＋ハイライト中を撮る
    { name: 'web_ui_check3', vp: desktop, params: { mode: 'studio' }, clicks: ['#info summary', '[data-check="3"]'], wait: 1250 },
    { name: 'web_ui_mobile', vp: mobile, params: { mode: 'mood' } },
    { name: 'web_ui_mobile_checks', vp: mobile, params: { mode: 'studio' }, clicks: ['#checks summary'], wait: 400 },
  ];
  for (const c of cases) {
    const page = await browser.newPage();
    await page.setViewport(c.vp);
    attachLogging(page, c.name);
    const q = new URLSearchParams({ rotate: '0', time: '18', seed: '7', ...c.params });
    await page.goto(`${htmlURL}?${q}`, { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction('window.__ready === true || typeof window.__error === "string"', { timeout: 240000, polling: 100 });
    if (c.clicks) {
      for (const sel of c.clicks) await page.click(sel);
      await new Promise((r) => setTimeout(r, c.wait || 1200));
    } else {
      await new Promise((r) => setTimeout(r, 300));
    }
    const file = path.join(outDir, `${c.name}.png`);
    await page.screenshot({ path: file, type: 'png' });
    console.log(`[shoot] ${path.relative(ROOT, file)}  (UI 確認用 ${c.vp.width}x${c.vp.height}@${c.vp.deviceScaleFactor}x)`);
    await page.close();
  }
}

function judge(st) {
  const bad = [];
  if (st.mean < 6) bad.push('真っ黒に近い');
  if (st.mean > 250) bad.push('真っ白に近い');
  if (st.std < 4) bad.push('ほぼ単色');
  if (st.coverage < 0.05) bad.push('モデルがほとんど写っていない');
  return bad;
}

async function main() {
  if (!fs.existsSync(path.join(ROOT, 'index.html'))) throw new Error(`index.html がありません: ${ROOT}（先に node viewer/build.mjs）`);
  const outDir = path.join(ROOT, 'previews');
  fs.mkdirSync(outDir, { recursive: true });
  const { browser, kind, info } = await pickBrowser();
  console.log(`[shoot] GLB 実測: 三角形 ${info.triangles.toLocaleString()} / メッシュ ${info.meshes} / ノード ${info.nodes} / 外接箱 ${info.bbox.size.map((v) => v.toFixed(3)).join(' × ')} m`);
  if (info.missing && info.missing.length) console.log(`[shoot] 見つからないノード: ${info.missing.join(', ')}`);
  const problems = [];
  try {
    for (const [name, params] of SHOTS) {
      if (ONLY && !ONLY.has(name)) continue;
      const { page, ms } = await openViewer(browser, params, name);
      const st = await page.evaluate(() => window.__viewer.stats());
      const file = path.join(outDir, `${name}.png`);
      await page.screenshot({ path: file, type: 'png', clip: { x: 0, y: 0, width: W, height: H } });
      const bad = judge(st);
      if (bad.length) problems.push(`${name}: ${bad.join(', ')}`);
      console.log(`[shoot] ${path.relative(ROOT, file)}  ${ms} ms  mean=${st.mean} std=${st.std} 前景率=${(st.coverage * 100).toFixed(1)}%${bad.length ? '  ⚠ ' + bad.join(', ') : ''}`);
      await page.close();
    }

    if (UI_SHOTS) await shootUI(browser, outDir);

    if (TURNTABLE > 0) {
      fs.mkdirSync(TT_DIR, { recursive: true });
      for (const f of fs.readdirSync(TT_DIR)) if (/^frame_\d+\.png$/.test(f)) fs.unlinkSync(path.join(TT_DIR, f));
      const { page } = await openViewer(browser, { mode: 'studio', view: 'front' }, 'turntable');
      const t0 = Date.now();
      for (let i = 0; i < TURNTABLE; i++) {
        const az = (360 * i) / TURNTABLE;
        await page.evaluate((a) => window.__viewer.setAngle(a), az);
        await page.screenshot({ path: path.join(TT_DIR, `frame_${String(i).padStart(3, '0')}.png`), type: 'png', clip: { x: 0, y: 0, width: W, height: H } });
      }
      console.log(`[shoot] ターンテーブル ${TURNTABLE} 枚 → ${TT_DIR}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`[shoot] WebGL: ${kind} / コンソール error ${issues.error.length} 件・warning ${issues.warning.length} 件${issues.driver.length ? `（別枠: 検査用 readPixels に対するドライバ通知 ${issues.driver.length} 件）` : ''}`);
  for (const s of issues.error) console.log(`  error: ${s}`);
  for (const s of issues.warning) console.log(`  warning: ${s}`);
  if (problems.length) {
    console.log('[shoot] 画像チェックで問題あり:');
    for (const p of problems) console.log('  ' + p);
    process.exitCode = 2;
  }
  if (issues.error.length) process.exitCode = 3;
}

main().catch((e) => {
  console.error('[shoot] 失敗:', e && e.message ? e.message : e);
  process.exit(1);
});
