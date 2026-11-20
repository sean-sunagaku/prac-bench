#!/usr/bin/env bash
# このベンチマークの他枠で opus が作った成果物から、スライド4枚目などに載せる画像を作る。
# 他モデルのフォルダは参照しない（opus/ のみ）。
# 必要なもの：ImageMagick(magick)、rsvg-convert、qlmanage（macOS）、python3、node + playwright-core（tools/ で npm i）
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"          # .../task-11-self-appeal-slides/opus
R="$(cd "$HERE/../.." && pwd)"                     # .../results/2026-11-20
OUT="$HERE/assets/portfolio"
W="${TMPDIR:-/tmp}/opus-t11-portfolio"
mkdir -p "$OUT" "$W"

thumb() { # in out [crop]
  local in="$1" out="$2" crop="${3:-}"
  if [ -n "$crop" ]; then
    magick "$in" -crop "$crop" +repage -resize 960x600^ -gravity center -extent 960x600 -quality 88 "$out"
  else
    magick "$in" -resize 960x600^ -gravity center -extent 960x600 -quality 88 "$out"
  fi
}

# 枠1 LP：自分で開き直して撮影（ファーストビュー）
node "$HERE/tools/shot.mjs" "file://$R/task-01-koku01-lp/opus/index.html" "$W/t01.png" 1440 900 4500
thumb "$W/t01.png" "$OUT/t01-lp.jpg"

# 枠2 ゲーム：走行中の画面（成果物に同梱のスクリーンショット）
thumb "$R/task-02-keitora-hikkoshi/opus/screenshots/04-driving.png" "$OUT/t02-game.jpg"

# 枠3 地図：SVG を開き直して撮影し、島とタイトルの範囲を切り出す
node "$HERE/tools/shot.mjs" "file://$R/task-03-aoi-island-map/opus/aoi-island-map.svg" "$W/t03.png" 1600 1200 2500
thumb "$W/t03.png" "$OUT/t03-map.jpg" 1330x831+0+0

# 枠4 3D：GLB を読み直して撮影した夕景（成果物に同梱）
thumb "$R/task-04-capybara-onsen-3d/opus/previews/mood_front.png" "$OUT/t04-3d.jpg" 1600x1000+0+100

# 枠5 図解：ヒーローの環状道路（成果物に同梱のスクリーンショット）
thumb "$R/task-05-traffic-explainer/opus/screenshots/d02-hero-jam.png" "$OUT/t05-sim.jpg" 1340x838+0+20

# 枠6 データ監査：報告書の図1（SVG を PNG にして余白をつける）
rsvg-convert -w 1500 "$R/task-06-trap-data-audit/opus/figures/fig1_gap_breakdown.svg" -o "$W/t06-fig1.png"
bg="$(magick "$W/t06-fig1.png" -format '%[pixel:p{2,2}]' info:)"
magick "$W/t06-fig1.png" -resize 1520x950 -background "$bg" -gravity center -extent 1600x1000 -resize 960x600 -quality 88 "$OUT/t06-audit.jpg"

# 枠7 資料：PPTX の8枚目。LibreOffice ではこの環境でヒラギノが使えず文字が消えたため、
# 複製のスライド順だけ入れ替えて QuickLook で描画した（中身は変更していない）
cp "$R/task-07-management-slides/opus/"*.pptx "$W/t07.pptx"
python3 -I "$HERE/tools/pptx_reorder.py" "$W/t07.pptx" "$W/t07_s8.pptx" 8
qlmanage -t -s 1600 -o "$W" "$W/t07_s8.pptx" >/dev/null 2>&1
magick "$W/t07_s8.pptx.png" -resize 960x600 -background white -gravity center -extent 960x600 -quality 88 "$OUT/t07-slides.jpg"   # スライドは切らずに上下へ余白

# 枠8 音楽とMV：成果物のサムネイル（MVのタイトルカット）
thumb "$R/task-08-free-music-mv/opus/thumbnail.png" "$OUT/t08-mv.jpg"

# 枠9 映像：本編の 1:20（第5章「光」）のコマ
ffmpeg -v error -y -ss 00:01:20 -i "$R/task-09-free-video/opus/out/f_t.mp4" -frames:v 1 "$W/t09.png"
thumb "$W/t09.png" "$OUT/t09-video.jpg"

ls -la "$OUT"
