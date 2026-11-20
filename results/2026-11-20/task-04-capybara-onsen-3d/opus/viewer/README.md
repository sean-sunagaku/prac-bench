# ビューア（index.html）のビルドと撮影
- ビルド: ルートで `node viewer/build.mjs`（最新の scene.glb / metrics.json を埋め込んだ自己完結 index.html を出力。依存は /tmp/capy-work/viewer-build、無ければ自動で npm install。別ディレクトリからは `node <root>/viewer/build.mjs <root>`）
- 撮影: `node viewer/shoot.mjs [--turntable N] [--ui]` → previews/web_*.png（1280x960、コンソールの error/warning も集計）、`--turntable N` は /tmp/capy-work/tt_web/frame_###.png
