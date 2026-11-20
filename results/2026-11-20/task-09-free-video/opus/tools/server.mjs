// 静的ファイルサーバ（ES モジュールを読み込むために必要）
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript', '.json': 'application/json', '.wav': 'audio/wav', '.png': 'image/png' };
export function serve(root, port) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      const f = path.join(root, u);
      if (!f.startsWith(root)) { res.statusCode = 403; return res.end(); }
      fs.readFile(f, (e, d) => {
        if (e) { res.statusCode = 404; return res.end(); }
        res.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store');
        res.end(d);
      });
    }).listen(port, () => resolve(srv));
  });
}
