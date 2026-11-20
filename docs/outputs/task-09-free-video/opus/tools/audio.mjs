// 音楽を Node で計算して WAV に書き出す（映像と同じコードを使う）
import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { renderSong } = await import(path.join(root, 'src/audio/song.js'));
const t0 = Date.now();
const { L, R, sr } = renderSong((p) => process.stdout.write(`\r${(p * 100).toFixed(0)}%  ${((Date.now() - t0) / 1000).toFixed(1)}s`));
console.log(`\nrendered ${(L.length / sr).toFixed(2)}s in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
// 32bit float WAV
const n = L.length, data = Buffer.alloc(n * 8);
let peak = 0;
for (let i = 0; i < n; i++) { data.writeFloatLE(L[i], i * 8); data.writeFloatLE(R[i], i * 8 + 4); peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
const h = Buffer.alloc(44);
h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16);
h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34);
h.write('data', 36); h.writeUInt32LE(data.length, 40);
const out = process.argv[2] || path.join(root, 'build/audio.wav');
fs.writeFileSync(out, Buffer.concat([h, data]));
console.log('peak', peak.toFixed(3), '→', out);
