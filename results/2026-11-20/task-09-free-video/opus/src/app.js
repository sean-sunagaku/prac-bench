// ─────────────────────────────────────────────────────────────
//  app.js — 起動。?capture=1 のときは書き出し用、それ以外はリアルタイム再生
// ─────────────────────────────────────────────────────────────
import { boot } from './main.js';
import { W, H, FPS, DURATION } from './timeline.js';
import { player } from './player.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('c');

async function readSource() {
  // 1ファイル版では自分自身の HTML 全体。開発中はモジュールを集めて代用する
  if (document.getElementById('src-main')) {
    // ファイルそのものを読む（file:// で開いた場合は DOM から復元）
    try { const r = await fetch(location.href.split('?')[0]); if (r.ok) return await r.text(); } catch (e) {}
    return '<!doctype html>\n' + document.documentElement.outerHTML;
  }
  const files = ['index.html', 'app.js', 'main.js', 'timeline.js', 'player.js', 'core/gl.js', 'core/glsl.js', 'core/post.js', 'core/text.js', 'core/curve.js',
    'scenes/intro.js', 'scenes/sound.js', 'scenes/infinity.js', 'scenes/life.js', 'scenes/earth.js', 'scenes/light.js', 'scenes/cosmos.js', 'scenes/finale.js', 'audio/synth.js', 'audio/song.js'];
  const parts = await Promise.all(files.map((f) => fetch(f).then((r) => (r.ok ? r.text() : '')).catch(() => '')));
  return parts.join('\n');
}

(async () => {
  const source = await readSource();
  const app = await boot(canvas, { capture: params.has('capture'), source });
  window.__app = app;
  if (params.has('capture')) {
    // 静止画プレビュー：t 秒時点を K サンプルで描いて PNG で返す
    window.__still = (t, K = 4) => {
      app.renderFrame(Math.round(t * FPS), K);
      return canvas.toDataURL('image/png');
    };
    // 本番書き出し：WebSocket で生フレームを Node へ送る
    window.__capture = async ({ from, to, K, port }) => {
      const ws = new WebSocket(`ws://localhost:${port}`);
      ws.binaryType = 'arraybuffer';
      await new Promise((r) => (ws.onopen = r));
      const bufs = [new Uint8Array(W * H * 4), new Uint8Array(W * H * 4)];
      let acked = from - 1; const waiters = [];
      ws.onmessage = () => { acked++; const w = waiters.shift(); w && w(); };
      const gl = app.gl;
      const t0 = performance.now();
      for (let f = from; f < to; f++) {
        while (f - acked > 2) await new Promise((r) => waiters.push(r));
        app.renderFrame(f, K);
        const b = bufs[f & 1];
        gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, b);
        ws.send(b);
        if ((f - from) % 120 === 0) console.log(`frame ${f}/${to}  ${((performance.now() - t0) / (f - from + 1)).toFixed(1)} ms/f`);
      }
      while (acked < to - 1) await new Promise((r) => waiters.push(r));
      ws.close();
      return (performance.now() - t0) / 1000;
    };
    window.__ready = true;
  } else {
    player(app, canvas, params);
  }
})().catch((e) => { console.error(e); window.__error = String(e && e.stack || e); });
