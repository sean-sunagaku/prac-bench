# 実施結果の格納ルール

ベンチマークを実施したら、この `results/` の下に結果を格納していく。

## ディレクトリ構成

- 実施日ごとに `results/YYYY-MM-DD/` を新しく作る（例：`results/2026-11-25/`）
- その下に、タスクごとのディレクトリを作る（スラッグは下表）
- その下に、モデルごとのディレクトリ（`neon` / `carbon` / `astra` / `sol` / `opus`）を作り、そのモデルの出力一式を入れる
- 日付ディレクトリの直下に、その日の比較・採点メモを `comparison.md` として置く

```text
results/
  2026-11-25/
    comparison.md
    task-01-koku01-lp/
      neon/
      carbon/
      astra/
      sol/
      opus/
    task-02-keitora-hikkoshi/
      neon/
      ...
```

## 各モデルディレクトリに入れるもの

- 成果物そのもの（ファイル一式）
- 実行メモ `RUN.md`：所要時間、使用したツール・環境、つまずいた点、自己申告の工夫など、比較時に参照する情報

## タスクのスラッグ

| スラッグ | タスク |
|---|---|
| task-01-koku01-lp | 架空ガジェット「KOKU-01」の製品LP＋触れるデモ |
| task-02-keitora-hikkoshi | 「軽トラ限界引っ越し」2D物理ゲーム |
| task-03-aoi-island-map | 『あおい島』観光マップ単一SVG |
| task-04-capybara-onsen-3d | 3D造形「カピバラの雪見露天風呂」 |
| task-05-traffic-explainer | 自然渋滞インタラクティブ図解 |
| task-06-trap-data-audit | 罠入り実務データの真因特定と修正報告 |
| task-07-management-slides | 経営判断スライド6枚固定 |
| task-08-free-music-mv | 自由制作「あなたの中での最強の音楽とMVを作って」 |
| task-09-free-video | 自由制作「あなたの実力を見せる最高の動画を作って」 |
| task-10-girl-3d | 女の子の3D（AI Girl 3D Benchmark方式） |
| task-11-self-appeal-slides | 自分の能力をアピールするスライド資料 |
