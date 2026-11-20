# RUN — task-01-koku01-lp / astra

- 実施日: 2026-11-20（11:52:20–12:04:00 JST）
- 実装時間: 11分40秒
- 終了状態: 自然終了
- 試行回数: 2回（本記録は最終試行）
- トークン使用量: 入力 6,256,895（うちキャッシュ 6,078,976） / 出力 61,837
- コスト推定: $5.78（API単価前提による換算。単価の前提は ../comparison.md 参照。実際の課金形態とは異なる）
- 成果物ファイル数: 12（ランナー生成物・node_modules・支給 input を除く）

## 主な成果物
- assets/fonts/OFL-Barlow-Condensed.txt
- assets/fonts/barlow-condensed-bold.ttf
- assets/fonts/barlow-condensed-extrabold.ttf
- assets/koku-brass.webp
- assets/koku-dial.webp
- assets/koku-hero.webp
- assets/koku-silver.webp
- index.html
- koku01-product-facts.md
- reservation.js
- styles.css
- timer.js

## 検証結果
検証Pass。Date.now()+125ms tick の実カウントダウン、data-price 属性の合算、disabled 選択肢の自動切替。5件で最も軽量な構成。

## 備考
試行2回。1回目はプロンプトが未送信のまま残るハーネスの不具合で無効となり、記録は修正後の再実行分。
