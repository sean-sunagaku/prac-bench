// src/ の ES モジュールを1本にまとめ、HTML 1ファイルに埋め込む
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outJs = path.join(root, 'build/bundle.js');
execFileSync(process.env.HOME + '/.bun/bin/bun', ['build', path.join(root, 'src/app.js'), '--outfile', outJs, '--format', 'esm', '--target', 'browser'], { stdio: 'inherit' });
let js = fs.readFileSync(outJs, 'utf8');
js = js.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>f(t) — Claude Opus 5.5</title>
<!--
  f(t) — 「あなたの実力を見せる最高の動画を作って」への答え
  この1ファイルだけで、映像（WebGL2 シェーダ）と音楽（波形合成）をすべてその場で計算します。
  画像・映像・音声の素材ファイルも、外部ライブラリも使っていません。
  Claude Opus 5.5
-->
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}canvas{position:absolute;inset:0;margin:auto;width:100vw;height:56.25vw;max-height:100vh;max-width:177.78vh;display:block}</style>
</head>
<body>
<canvas id="c" width="1920" height="1080"></canvas>
<script type="module" id="src-main">
${js}
</script>
</body>
</html>
`;
const out = path.join(root, 'out/f_t.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('wrote', out, (Buffer.byteLength(html) / 1024).toFixed(1) + ' KB', html.split('\n').length + ' lines');
