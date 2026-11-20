// 使い方: node tools/still.mjs [--k 4] [--html src/index.html] t1 t2 ...
import fs from 'node:fs'; import path from 'node:path';
import { serve } from './server.mjs'; import { openPage } from './browser.mjs';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
let K = 4, html = 'src/index.html', outDir = path.join(root, 'build/stills'), times = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--k') K = +args[++i]; else if (args[i] === '--html') html = args[++i]; else if (args[i] === '--out') outDir = path.resolve(args[++i]); else times.push(+args[i]);
}
fs.mkdirSync(outDir, { recursive: true });
const srv = await serve(root, 8790);
const { browser, page } = await openPage(`http://localhost:8790/${html}?capture=1`);
for (const t of times) {
  const t0 = Date.now();
  const url = await page.evaluate((t, K) => window.__still(t, K), t, K);
  const f = path.join(outDir, `t${t.toFixed(2).padStart(6, '0')}.png`);
  fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
  console.log(f, (Date.now() - t0) + 'ms');
}
await browser.close(); srv.close();
