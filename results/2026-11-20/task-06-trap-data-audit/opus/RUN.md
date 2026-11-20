# RUN — task-06-trap-data-audit / opus

- 実施日: 2026-11-20（12:24:09–12:49:33 JST）
- 実装時間: 25分24秒
- 終了状態: 自然終了
- トークン使用量: 入力 214 / キャッシュ作成 619,251 / キャッシュ読込 16,980,014 / 出力 387,138
- コスト推定: $66.12（API単価前提による換算。単価の前提は ../comparison.md 参照。実際の課金形態とは異なる）
- 成果物ファイル数: 19（ランナー生成物・node_modules・支給 input を除く）

## 主な成果物
- RUN.md
- analysis/audit.py
- analysis/charts.py
- analysis/crosscheck.py
- analysis/xlsx_dump.py
- ec_orders.xlsx
- figures/fig1_gap_breakdown.svg
- figures/fig2_ekimae_store_names.svg
- mail.txt
- output/anomalies.csv
- output/bridge.csv
- output/monthly_by_channel.csv
- output/pos_by_store.csv
- output/pos_by_store_raw_names.csv
- output/records_all_flagged.csv

## 検証結果
報告ファイル report.md（税込併記、分析コードと図表付き）。税抜合計は共通値（丸め差 +79/+82円）。仮説はデータで支持されないと反証。罠6種すべて検出。
