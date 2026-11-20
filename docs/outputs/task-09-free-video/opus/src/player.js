// ─────────────────────────────────────────────────────────────
//  player.js — リアルタイム再生：クリック → 音楽をその場で計算 → 再生
//  映像は音の再生時刻に合わせて、毎フレーム計算する
// ─────────────────────────────────────────────────────────────
import { renderSong } from './audio/song.js';
import { FPS, DURATION } from './timeline.js';

export function player(app, canvas, params) {
  const ui = document.createElement('div');
  ui.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;color:#f3efe8;font:300 18px "Hiragino Sans",sans-serif;background:rgba(0,0,0,.82);cursor:pointer;z-index:2;letter-spacing:.08em';
  ui.innerHTML = '<div style="font:500 44px \'Avenir Next\',sans-serif;letter-spacing:.2em">▶</div><div>クリックで再生</div><div style="font-size:13px;opacity:.6">映像も音も、このページがいま計算します（素材ファイルなし）</div>';
  document.body.appendChild(ui);
  const startAt = parseFloat(params.get('t') || '0');
  // 再生前は冒頭の1コマを描いておく
  app.renderFrame(Math.round(startAt * FPS), 1);

  ui.addEventListener('click', async () => {
    ui.innerHTML = '<div>音楽を計算しています…</div><div style="font-size:13px;opacity:.6">約50万個の音符の波形を、1サンプルずつ合成中</div>';
    await new Promise((r) => setTimeout(r, 60));
    const ac = new AudioContext({ sampleRate: 48000 });
    const song = renderSong();
    const buf = ac.createBuffer(2, song.L.length, song.sr);
    buf.copyToChannel(song.L, 0); buf.copyToChannel(song.R, 1);
    const src = ac.createBufferSource();
    src.buffer = buf; src.connect(ac.destination);
    const t0 = ac.currentTime + 0.15;
    src.start(t0, startAt);
    ui.remove();
    const loop = () => {
      const lat = (ac.outputLatency || 0) + (ac.baseLatency || 0);
      const t = Math.max(0, ac.currentTime - t0 - lat) + startAt;
      if (t < DURATION) {
        app.renderFrame(Math.floor(t * FPS), 1);
        requestAnimationFrame(loop);
      } else {
        document.body.appendChild(ui);
        ui.innerHTML = '<div style="font:500 30px \'Avenir Next\',sans-serif;letter-spacing:.2em">↻</div><div>もう一度</div>';
        ui.onclick = () => location.reload();
      }
    };
    requestAnimationFrame(loop);
  }, { once: true });
}
