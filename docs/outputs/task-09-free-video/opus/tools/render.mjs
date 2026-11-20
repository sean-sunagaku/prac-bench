// 使い方: node tools/render.mjs --from 0 --to 7560 --k 4 --out build/seg0.mp4 [--port 8800]
// ヘッドレス Chrome で1フレームずつ描き、生の画素を WebSocket で受け取り、ffmpeg で符号化する
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { WebSocketServer } from 'ws';
import { serve } from './server.mjs'; import { openPage } from './browser.mjs';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const a = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, arr) => (v.startsWith('--') ? [...acc, [v.slice(2), arr[i + 1]]] : acc), []));
const from = +(a.from ?? 0), to = +(a.to ?? 600), K = +(a.k ?? 4), port = +(a.port ?? 8800), crf = a.crf ?? '15';
const html = a.html ?? 'out/f_t.html';
const out = path.resolve(root, a.out ?? `build/seg_${from}_${to}.mp4`);
const W = 1920, H = 1080;

const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', '60', '-i', '-',
  '-vf', 'vflip,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-x264-params', 'keyint=120:min-keyint=60',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
let pending = Promise.resolve();
const wss = new WebSocketServer({ port: port + 1, maxPayload: 64 * 1024 * 1024 });
let got = 0; const t0 = Date.now();
wss.on('connection', (s) => {
  s.on('message', (d) => {
    // ffmpeg が受け取れるまで待ってから次を要求（逆圧）
    const ok = ff.stdin.write(d);
    got++;
    if (got % 300 === 0) { const el = (Date.now() - t0) / 1000; console.log(`[${from}-${to}] ${got}/${to - from} frames  ${(el / got * 1000).toFixed(0)} ms/f  ETA ${((to - from - got) * el / got / 60).toFixed(1)} min`); }
    if (ok) s.send('k'); else ff.stdin.once('drain', () => s.send('k'));
  });
});
const srv = await serve(root, port);
const { browser, page } = await openPage(`http://localhost:${port}/${html}?capture=1`, { log: false });
page.on('console', (m) => { const t = m.text(); if (!t.startsWith('frame')) console.log('PAGE:', t); });
const secs = await page.evaluate((o) => window.__capture(o), { from, to, K, port: port + 1 });
await browser.close(); srv.close(); wss.close();
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
console.log(`[${from}-${to}] done: ${(to - from)} frames in ${secs.toFixed(0)}s → ${out}`);
