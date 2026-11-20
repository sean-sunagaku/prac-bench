#!/usr/bin/env node
/**
 * index.html（完全自己完結ビューア）をビルドする。
 *
 *   node viewer/build.mjs [ルートディレクトリ]
 *
 * - ルート（既定: このスクリプトの 1 つ上）の最新 scene.glb / metrics.json を毎回読み込み、
 *   GLB は base64、metrics は JSON、three.js 入りのビューアは IIFE バンドルとして
 *   template.html に埋め込み、ルート直下に index.html を書き出す。
 * - 依存（three / esbuild / puppeteer-core）はルートに置かず、作業ディレクトリ
 *   （既定: /tmp/capy-work/viewer-build、環境変数 CAPY_VIEWER_DEPS で変更可）から読む。
 *   無ければ自動で npm install する。
 * - scene.glb / metrics.json は読むだけで一切書き換えない。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(process.argv[2] || path.join(HERE, '..'));
const DEPS = path.resolve(process.env.CAPY_VIEWER_DEPS || '/tmp/capy-work/viewer-build');
const THREE_VERSION = '0.187.0';

function ensureDeps() {
  const need = ['three', 'esbuild', 'puppeteer-core'].filter((m) => !fs.existsSync(path.join(DEPS, 'node_modules', m, 'package.json')));
  if (!need.length) return;
  console.log(`[build] 依存を ${DEPS} にインストールします: ${need.join(', ')}`);
  fs.mkdirSync(DEPS, { recursive: true });
  if (!fs.existsSync(path.join(DEPS, 'package.json'))) {
    fs.writeFileSync(path.join(DEPS, 'package.json'), JSON.stringify({ name: 'capy-viewer-build', private: true }, null, 2));
  }
  const specs = need.map((m) => (m === 'three' ? `three@${THREE_VERSION}` : m));
  execFileSync('npm', ['install', '--no-audit', '--no-fund', ...specs], { cwd: DEPS, stdio: 'inherit' });
}

async function main() {
  const glbPath = path.join(ROOT, 'scene.glb');
  const metricsPath = path.join(ROOT, 'metrics.json');
  const templatePath = path.join(HERE, 'template.html');
  const entry = path.join(HERE, 'main.js');
  const outPath = path.join(ROOT, 'index.html');

  if (!fs.existsSync(glbPath)) throw new Error(`scene.glb が見つかりません: ${glbPath}`);
  ensureDeps();
  const req = createRequire(path.join(DEPS, 'package.json'));
  const esbuild = req('esbuild');
  const threeVersion = JSON.parse(fs.readFileSync(path.join(DEPS, 'node_modules', 'three', 'package.json'), 'utf8')).version;

  // 1) ビューアを IIFE に束ねる（three.js 込み・外部 import なし）
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    minify: true,
    write: false,
    legalComments: 'eof',
    nodePaths: [path.join(DEPS, 'node_modules')],
    absWorkingDir: DEPS,
    logLevel: 'warning',
  });
  let bundle = result.outputFiles[0].text;
  if (/<\/script/i.test(bundle)) bundle = bundle.replace(/<\/script/gi, '<\\/script');
  if (bundle.includes('<!--')) console.warn('[build] 警告: バンドルに "<!--" が含まれています');

  // 2) GLB / metrics（読むだけ）
  const glb = fs.readFileSync(glbPath);
  if (glb.readUInt32LE(0) !== 0x46546c67) throw new Error('scene.glb が glTF バイナリではありません');
  const glbStat = fs.statSync(glbPath);
  let metricsText = '{}';
  let metricsFound = false;
  if (fs.existsSync(metricsPath)) {
    try {
      metricsText = JSON.stringify(JSON.parse(fs.readFileSync(metricsPath, 'utf8')));
      metricsFound = true;
    } catch (e) {
      console.warn(`[build] 警告: metrics.json を解析できませんでした（${e.message}）。根拠表示なしでビルドします`);
    }
  } else {
    console.warn('[build] 警告: metrics.json がありません。根拠表示なしでビルドします');
  }
  const LS = String.fromCharCode(0x2028);
  const PS = String.fromCharCode(0x2029);
  const safeJSON = (s) => s.replace(/</g, '\\u003c').split(LS).join('\\u2028').split(PS).join('\\u2029');
  const buildInfo = {
    builtAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19),
    glbBytes: glb.length,
    glbModified: glbStat.mtime.toISOString(),
    three: threeVersion,
    metrics: metricsFound,
  };

  // 3) テンプレートへ 1 パスで差し込み（$ 置換パターンの誤爆を避けるため関数で置換）
  const template = fs.readFileSync(templatePath, 'utf8');
  const values = {
    METRICS_JSON: safeJSON(metricsText),
    BUILD_INFO: safeJSON(JSON.stringify(buildInfo)),
    GLB_BASE64: glb.toString('base64'),
    VIEWER_BUNDLE: bundle,
  };
  const seen = new Set();
  const html = template.replace(/\/\*__(VIEWER_BUNDLE)__\*\/|__(METRICS_JSON|BUILD_INFO|GLB_BASE64)__/g, (m, a, b) => {
    const key = a || b;
    seen.add(key);
    return values[key];
  });
  for (const k of Object.keys(values)) if (!seen.has(k)) throw new Error(`template.html にプレースホルダ ${k} がありません`);

  fs.writeFileSync(outPath, html);
  const mb = (n) => (n / 1024 / 1024).toFixed(2);
  console.log(`[build] three.js ${threeVersion} / bundle ${(bundle.length / 1024).toFixed(0)} KiB / GLB ${mb(glb.length)} MiB (${glb.length.toLocaleString()} B, 更新 ${glbStat.mtime.toLocaleString('ja-JP')})`);
  console.log(`[build] metrics.json: ${metricsFound ? 'あり' : 'なし'}`);
  console.log(`[build] → ${outPath}  ${mb(Buffer.byteLength(html))} MiB (${(Buffer.byteLength(html) / 1e6).toFixed(2)} MB)`);
}

main().catch((e) => {
  console.error('[build] 失敗:', e && e.message ? e.message : e);
  process.exit(1);
});
