# 2026年9月〜10月 月次売上データ不整合に関する監査報告書

## 1. エグゼクティブ・サマリー（結論）

支給された全4ファイル（[mail.txt](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/mail.txt)、[pos.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv)、[wholesale.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv)、[ec_orders.xlsx](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/ec_orders.xlsx)）を全件突合・監査した結果、速報値と実績値の不整合を引き起こしていた**全10種の原因**を特定し、正しい月次売上高を確定しました。

### 結論1：2026年9月・10月の確定売上高（全社・チャネル別）

店舗POS（[pos.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv)）とEC（[ec_orders.xlsx](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/ec_orders.xlsx)）は**税込金額**（食品：軽減税率8%、雑貨：標準税率10%）、卸売（[wholesale.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv)）は**税抜金額**で記録されていました。会計上の原則である**税抜基準**と、総額管理用の**税込基準**の双方に統一した確定実績は以下の通りです。

#### 【税抜基準（会計・損益計算上の純売上高）】
| チャネル | 2026年9月（税抜） | 2026年10月（税抜） | 前月比（増減額 / 率） | 9〜10月累計（税抜） |
| :--- | ---: | ---: | ---: | ---: |
| **店舗POS**（4店舗計） | 625,500円 | 648,250円 | +22,750円（+3.6%） | 1,273,750円 |
| **卸売**（5社計） | 4,405,000円 | 4,915,500円 | +510,500円（+11.6%） | 9,320,500円 |
| **EC**（JST基準） | 138,600円 | 142,400円 | +3,800円（+2.7%） | 281,000円 |
| **全社合計（税抜）** | **5,169,100円** | **5,706,150円** | **+537,050円（+10.4%）** | **10,875,250円** |

#### 【税込基準（消費税額込み総額）】
| チャネル | 2026年9月（税込） | 2026年10月（税込） | 前月比（増減額 / 率） | 9〜10月累計（税込） |
| :--- | ---: | ---: | ---: | ---: |
| **店舗POS**（4店舗計） | 684,450円 | 710,674円 | +26,224円（+3.8%） | 1,395,124円 |
| **卸売**（税込換算） | 4,825,460円 | 5,380,400円 | +554,940円（+11.5%） | 10,205,860円 |
| **EC**（JST基準） | 151,690円 | 156,056円 | +4,366円（+2.9%） | 307,746円 |
| **全社合計（税込）** | **5,661,600円** | **6,247,130円** | **+585,530円（+10.3%）** | **11,908,730円** |
| （うち消費税額 計） | （492,500円） | （540,980円） | （+48,480円） | （1,033,480円） |

> **要点**：未クレンジングの単純集計では卸売・ECが10月に減収したように見え、また店舗別でも駅前店が半減したように見えていましたが、正しくは**POS・卸売・ECの全3チャネルすべてが10月に増収**しており、全社売上は前月比 **+10.4%（税抜 +537,050円 / 税込 +585,530円）の堅調な成長**を達成しています。
> ※仮にクレンジング後であっても税区分を統一せず（POS税込＋卸売税抜＋EC税込のまま）単純合算すると、9月は `5,241,140円`、10月は `5,782,230円` となり、正しい税抜・税込いずれの数値とも一致しません。

---

### 結論2：経営企画室の仮説（「駅前店の改装休業による不振が主因」）の検証結果

経営企画室からの依頼メール（[mail.txt](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/mail.txt#L51-L52)）にある**「駅前店が改装休業した影響で売上が落ちたはずであり、駅前店の不振が主因」という仮説は、データ証拠により明確に棄却されます（誤りです）。**

1. **「駅前店急落」と誤認された真の原因（表記ゆれによる集計漏れ）**：
   - [pos.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv) において、駅前店の店舗名は `'駅前店'` のほかに、末尾半角スペース付きの `'駅前店 '`（計10件）および半角カタカナの `'ｴｷﾏｴ店'`（計9件）の**3種類の表記ゆれ**が存在します。
   - 特に10月5日・6日の改装休業（レジカウンター移設）以降、表記ゆれが急増しており、10月の駅前店データ全29件のうち**過半数の15件・税込 98,232円（10月売上の50.7%）**が `'駅前店 '`（8件・64,042円）および `'ｴｷﾏｴ店'`（7件・34,190円）として記録されていました（9月は表記ゆれ4件・24,490円のみ）。
   - このため、`店舗 = "駅前店"` の完全一致で単純集計すると、9月 **182,000円**（重複込み）→ 10月 **95,522円**（**前月比 -47.5% / -86,478円の半減**）という誤った速報値が出力されます。
2. **実際の駅前店の業績**：
   - 表記ゆれ統合・9月重複除外後の正しい駅前店売上は、**9月：税込 202,090円（税抜 184,400円）→ 10月：税込 193,754円（税抜 176,750円）** であり、2日間の休業（10/5・6）にもかかわらず減少幅は **税込 -8,336円（-4.1%）** にとどまります。
   - 駅前店は9月・10月ともに**全4店舗中トップの売上**を維持しており、1営業日あたり売上は9月 `6,736円/日`（30営業日）→ 10月 `6,681円/日`（29営業日）とほぼ同水準、土日平均売上は9月 `7,495円/日` → 10月 `9,997円/日`（**+33.4%増**）と大幅に伸びています。これは本店・佐々木店長の報告（[mail.txt](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/mail.txt#L30-L32)「前後の週末がかなり忙しく、月全体でそこまで落ち込んでいない印象」）と完全に一致します。
   - なお、4店舗の中で10月に最も売上が減少したのは駅前店ではなく**本店**（税込 189,786円 → 167,654円、**-22,132円 / -11.7%**）です。

---

## 2. 不整合・集計誤差を生じさせた全原因と根拠（全10要因＋返品検証）

全ファイルを突合して特定した不整合要因は以下の10項目です。

### 要因①：【全チャネル横断】税区分（税込 vs 税抜）の相違と複数税率（8%・10%）
- **事実と証拠**：全15商品の単価（`金額 ÷ 数量`）を3ファイル間で突合した結果、テストデータを除く全レコードで以下の関係が1円の誤差もなく成立しています。
  - **食品カテゴリ（全4品目）**：`POS単価 = EC単価 = 卸売単価 × 1.08`（軽減税率8%税込）
    - 例：`00101` 有機ドリップコーヒー豆：POS/EC `1,296円` ＝ 卸売 `1,200円 × 1.08`
  - **雑貨カテゴリ（全11品目）**：`POS単価 = EC単価 = 卸売単価 × 1.10`（標準税率10%税込）
    - 例：`00603` ①番人気ギフトBOX：POS/EC `3,080円` ＝ 卸売 `2,800円 × 1.10`
- **影響**：卸売の単価差は掛け率（値引き）ではなく**税抜記録**によるものです（掛け率であれば食品のみ `1/1.08`、雑貨のみ `1/1.10` に完全一致することはありません）。したがって全社合算時には必ず税抜または税込への基準統一が必要です（卸売の消費税相当額は9月 **420,460円**、10月 **464,900円**）。また、卸売を税込換算する際に一律10%を掛けると食品4品目（軽減税率8%）で過大計算となるため、品目別の税率適用が必須です。

### 要因②：【全チャネル横断】対象期間外（8月・11月）データの混入（計8件 ※EC月跨ぎ含む）
9〜10月の調査対象データの中に、8月および11月の取引が混入しています。
- **店舗POS（2件・除外）**：
  - [pos.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L127) 127行目：`2026/08/20,郊外店,00311,季節のジャムセット,食品,2,3024`（8月分：税込 3,024円 / 税抜 2,800円）
  - [pos.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L239) 239行目：`2026/11/02,郊外店,00310,クッキー缶,食品,2,2052`（11月分：税込 2,052円 / 税抜 1,900円）
- **卸売（2件・除外）**：
  - [wholesale.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv#L22) 22行目：`W-2048,令和8年8月18日,株式会社ミナト商事,501,ハンドソープ,雑貨,50,25000,通常`（8月分：税抜 25,000円 / 税込 27,500円）
  - [wholesale.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv#L46) 46行目：`W-2049,令和8年11月5日,有限会社そらまめ堂,501,ハンドソープ,雑貨,50,25000,通常`（11月分：税抜 25,000円 / 税込 27,500円）
- **EC（UTC表記上も期間外の2件＋JST換算で11月となる2件＝計4件除外）**：
  - [ec_orders.xlsx](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/ec_orders.xlsx) 83行目：`EC-1140` `2026-08-14T03:00:00Z` 鈴木美咲 バスソルト 2個（8月分：税込 1,980円 / 税抜 1,800円）
  - [ec_orders.xlsx](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/ec_orders.xlsx) 69行目：`EC-1141` `2026-11-03T04:00:00Z` 田中翔太 バスソルト 2個（11月分：税込 1,980円 / 税抜 1,800円）
  - 同 93行目 `EC-1135`・7行目 `EC-1136`：UTCでは `10-31T15:20Z` / `15:47Z` だが、JSTでは **11月1日 0時台** のため10月売上から除外（詳細は要因⑩参照）。

### 要因③：【全チャネル横断】存在しない架空日付（`9月31日`）データの混入（計3件）
9月は30日までしか存在しないにもかかわらず、3ファイルすべてに `9月31日` の不正レコードが1件ずつ混入しています。
- **店舗POS**：[pos.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L276) 276行目 `2026/09/31,本店,00101,有機ドリップコーヒー豆,食品,2,2592`（税込 2,592円 / 税抜 2,400円）
- **卸売**：[wholesale.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv#L13) 13行目 `W-2047,令和8年9月31日,ホテル青葉,124,ステンレスマグカップ,雑貨,30,45000,通常`（税抜 45,000円 / 税込 49,500円）
- **EC**：[ec_orders.xlsx](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/ec_orders.xlsx) 30行目 `EC-1139` `2026-09-31T05:12:00Z` 加藤結衣 ステンレスマグカップ 1個 `1650`（税込 1,650円 / 税抜 1,500円）
- **除外根拠**：ECでは正規注文が `EC-1001`（9/1）〜 `EC-1065`（9/30）および `EC-1066`（10/1）〜 `EC-1131`（10/31）と時系列順に採番されている一方、`EC-1139` はテストデータ（`EC-1137`, `1138`）と期間外データ（`EC-1140`, `1141`）の末尾連番ブロックに存在します。卸売の `W-2047` も同様に `W-2046`（テスト）と `W-2048〜2049`（期間外）に挟まれた末尾番号であり、実在取引の日付誤記ではなく無効レコードと判断されるため全件除外します（なお実務手続き上はシステムログ・原憑を確認し、万一実在取引であった場合の金額影響は上記金額となります）。

### 要因④：【全チャネル横断】テストデータの混入（計4件）
単価1円で登録されたシステム検証用テストデータが9月分に計4件混入しています（すべて除外）。
- **店舗POS**：[pos.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L206) 206行目 `2026/09/15,本店,99999,テスト,雑貨,1,1`（1円）
- **卸売**：[wholesale.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv#L12) 12行目 `W-2046,令和8年9月16日,テスト,101,有機ドリップコーヒー豆,食品,1,1,通常`（1円）
- **EC**：[ec_orders.xlsx](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/ec_orders.xlsx) 101行目 `EC-1137`（`2026-09-10T02:00:00Z`, 顧客名 `テスト`, 1円）および 29行目 `EC-1138`（`2026-09-11T02:00:00Z`, 顧客名 `テスト`, 1円）

### 要因⑤：【店舗POS】店舗名の表記ゆれ（改装後のレジ表記変化：計19件）
[pos.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv) の駅前店に3通りの文字列が存在します（他3店舗には表記ゆれなし）。
- `'駅前店'`（正規表記）：48件（9月：34件［うち重複2件］、10月：14件）
- `'駅前店 '`（末尾に半角スペース）：**10件**
  - 9月（2件・税込 13,200円）：[96行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L96)、[200行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L200)
  - 10月（8件・税込 64,042円）：[10行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L10)、[34行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L34)、[45行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L45)、[79行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L79)、[120行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L120)、[152行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L152)、[204行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L204)、[252行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L252)
- `'ｴｷﾏｴ店'`（半角カタカナ）：**9件**
  - 9月（2件・税込 11,290円）：[69行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L69)、[124行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L124)
  - 10月（7件・税込 34,190円）：[6行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L6)、[26行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L26)、[62行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L62)、[71行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L71)、[145行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L145)、[182行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L182)、[196行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L196)

### 要因⑥：【全チャネル横断】日付書式・文字コード・商品コード桁数の不統一
単純な数式・文字列抽出やマスタ結合を狂わせるフォーマット差異が複数存在します。
1. **POSの日付書式混在**：スラッシュ区切りゼロ埋め `YYYY/MM/DD`（140件）と、ハイフン区切りゼロ埋めなし `YYYY-M-D` 系（`YYYY-M-DD` 54件、`YYYY-MM-DD` 42件、`YYYY-M-D` 24件、`YYYY-MM-D` 19件＝計139件）が混在。たとえば `LEFT(日付, 7)` で `"2026/09"` や `"2026-09"` を抽出すると、9月のハイフン表記（`2026-9-12` 等、先頭7文字が `"2026-9-"` になる78件・税込 356,614円）が丸ごと脱落して9月POS売上が `338,321円`（本来の約半分）になります。
2. **卸売の和暦表記**：[wholesale.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv) のみ `令和8年9月7日` の和暦表記（令和8年＝2026年）。
3. **商品コードのゼロ埋め有無**：POS・ECは5桁ゼロ埋め（`'00101'`〜`'00603'`）、卸売は先頭ゼロなしの3桁（`'101'`〜`'603'`）。文字列のままキー結合すると全件不一致となります。
4. **文字コードと機種依存文字**：[pos.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv) のみ **CP932（Windows-31J）** エンコーディングで、かつCP932拡張文字の `①`（`①番人気ギフトBOX`）と半角カナ（`ｴｷﾏｴ店`）を含みます（[wholesale.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv) は UTF-8 BOM付き、[mail.txt](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/mail.txt) は UTF-8 BOMなし）。

### 要因⑦：【店舗POS】完全一致重複データの混入（4件除外）と別会計ペアの識別
[pos.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv) の9月上旬データに、日付表記（スラッシュ／ハイフンの別を含む）から金額まで全7列が1文字違わず一致する**完全重複レコードが4組（重複分4件：税込 7,892円 / 税抜 7,200円）**存在します。
- [49行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L49) と [242行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L242)：`2026/09/01,郊外店,00123,ハンドタオル,雑貨,3,1980`（税込 1,980円 / 税抜 1,800円）
- [98行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L98) と [125行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L125)：`2026-9-2,駅前店,00402,保冷バッグ,雑貨,2,2420`（税込 2,420円 / 税抜 2,200円）
- [90行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L90) と [185行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L185)：`2026/09/04,駅前店,00201,アロマキャンドル,雑貨,1,1980`（税込 1,980円 / 税抜 1,800円）
- [16行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L16) と [25行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L25)：`2026/09/09,本店,00311,季節のジャムセット,食品,1,1512`（税込 1,512円 / 税抜 1,400円）
- **監査上の峻別（非重複4組の保護）**：一方、同日・同店舗・同商品であっても数量・金額が異なる4組（9/30空港店 `00101` の [122行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L122) 数量8と [227行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L227) 数量9、10/8郊外店 `00201` の [74行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L74) と [114行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L114)、10/11空港店 `00202` の [271行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L271) と [277行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L277)、10/26本店 `00202` の [157行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L157) と [261行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L261)）は、`pos.csv` が1日複数行の会計単位明細であることから正当な別取引であり、重複削除してはなりません。

### 要因⑧：【店舗POS】レジ数量の1桁誤入力（郊外店 10/14 ハンドタオル）
- **事実と証拠**：郊外店・田中店長の報告メール（[mail.txt](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/mail.txt#L12-L15)「10/14のレジで、ハンドタオルの数量を1桁多く打ってしまったかもしれません。たしか本来は12個のところが120個と出ている気がします」）に対し、[pos.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L37) 37行目に `2026/10/14,郊外店,00123,ハンドタオル,雑貨,120,79200` が存在します。
- 全POSデータ280行のうち他の279行の数量はすべて `-2〜11` 個の範囲内（郊外店の他76行はすべて `1〜8` 個）であり、120個は統計的にも明白な異常値です。
- **修正内容**：数量 `120` → **`12`**、金額（税込）`79,200円` → **`7,920円`**（税抜 `72,000円` → **`7,200円`**）へ訂正します（減額調整：**税込 -71,280円 / 税抜 -64,800円**。※最終的な監査証跡として店舗保管のレジジャーナル原本との照合を実施してください）。

### 要因⑨：【卸売】伝票の「取消」「訂正」履歴の併記と行順逆転（5伝票・10行）
[wholesale.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv) では、取消や訂正が発生した伝票について元の `通常` 行が削除されず、同一伝票番号のまま**プラス金額**で `取消` 行や `訂正` 行が併記されています。
1. **取消伝票（2伝票：元伝票・取消行ともに売上0円とすべきもの）**
   - `W-2044`（9月25日 カフェ・ルーチェ 観葉植物ポット 84個）：[8行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv#L8) `通常 210,000円` ＋ [48行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv#L48) `取消 210,000円`。単純合算すると **420,000円（2倍過大）**、`状態="通常"` で絞っても **210,000円過大** となります（正しくは **0円**）。
   - `W-2045`（10月15日 タカハシ文具 保冷バッグ 60個）：[5行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv#L5) `通常 66,000円` ＋ [33行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv#L33) `取消 66,000円`。単純合算で **132,000円過大**、`通常` のみ抽出でも **66,000円過大** となります（正しくは **0円**）。
2. **訂正伝票（3伝票：`通常` 行を除外し、`訂正` 行の数値のみを採用すべきもの）**
   - `W-2041`（9月18日 ミナト商事 ルームフレグランス）：[23行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv#L23) `通常 220個 484,000円` → [49行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv#L49) **`訂正 160個 352,000円`**（単純合算比 -484,000円、`通常` 採用比 -132,000円）。
   - `W-2042`（10月7日 ホテル青葉 ステンレスマグカップ）：[6行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv#L6) `通常 96個 144,000円` → [11行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv#L11) **`訂正 110個 165,000円`**（単純合算比 -144,000円、`通常` 採用比 +21,000円）。
   - `W-2043`（10月21日 そらまめ堂 季節のジャムセット）：[17行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv#L17) **`訂正 75個 105,000円`** ← [54行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv#L54) `通常 80個 112,000円`（**※CSV上の行順が `訂正` が先・`通常` が後と逆転しているため、行順末尾を採用する処理では誤って `112,000円` が残ります**。必ず `状態="訂正"` の `105,000円` を採用します）。

### 要因⑩：【EC】タイムゾーン（UTC記録 vs JST月次締め）による月跨ぎズレ（4件）
[ec_orders.xlsx](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/ec_orders.xlsx) のB列は `注文時刻(UTC)` です（通常注文 `EC-1001〜1131` の時刻分布がすべて UTC 00:00〜13:59＝日本時間 09:00〜22:59 に収まっていることからも全件UTC記録であることが裏付けられます）。日本標準時（JST = UTC+9時間）で月次帰属を判定すると、月末15:00Z以降（JST翌日00:00以降）の4件で帰属月が移動します。
- **9月（UTC）→ 10月（JST）へ振り替える2件（計 税込 3,780円 / 税抜 3,500円）**：
  - 12行目 `EC-1133`：UTC `2026-09-30T15:40:00Z` → **JST `2026-10-01 00:40:00`**（山本蓮 クッキー缶 2個 税込 2,052円 / 税抜 1,900円）
  - 96行目 `EC-1134`：UTC `2026-09-30T15:52:00Z` → **JST `2026-10-01 00:52:00`**（渡辺葵 紅茶ティーバッグ 2個 税込 1,728円 / 税抜 1,600円）
- **10月（UTC）→ 11月（JST：調査対象期間外）として除外する2件（計 税込 2,970円 / 税抜 2,700円）**：
  - 93行目 `EC-1135`：UTC `2026-10-31T15:20:00Z` → **JST `2026-11-01 00:20:00`**（田中翔太 保冷バッグ 1個 税込 1,210円 / 税抜 1,100円）
  - 7行目 `EC-1136`：UTC `2026-10-31T15:47:00Z` → **JST `2026-11-01 00:47:00`**（小林颯太 ドライフラワーブーケ 1個 税込 1,760円 / 税抜 1,600円）

### 【確認事項】マイナス計上（返品レコード：計4件）の妥当性検証
データ内のマイナス数量・金額レコード（計4件）は、入力エラーではなく**正当な返品控除**であるため、除外せずそのままマイナス合算するのが正しい処理です。
- **店舗POS（3件）**：
  - 9月（1件）：[pos.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L199) 199行目 `2026/09/12,本店,00124,ステンレスマグカップ,雑貨,-1,-1650`（税込 -1,650円 / 税抜 -1,500円）
  - 10月（2件）：[pos.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L139) 139行目 `2026-10-9,空港店,00401,エコバッグ,雑貨,-2,-1540`、[126行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L126) `2026/10/22,駅前店,00501,ハンドソープ,雑貨,-1,-550`（計 税込 -2,090円 / 税抜 -1,900円）
  - 根拠：[mail.txt](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/mail.txt#L64-L66)（10/23 田中店長メモ）にて「レジではマイナスで打ち直しているので、そのまま差し引いてもらえれば大丈夫です」と運用方法が明記されており、例示された品目（マグカップ・エコバッグ等）もPOSのマイナス行と合致します（※なお差出人は郊外店・田中店長ですが、10/1〜10/23の郊外店POSにはマグカップのプラス・マイナス取引自体が存在せず、マイナス行は本店・空港店・駅前店に記録されています。プラス誤記の形跡もないため、全店共通のレジ返品運用の共有と解釈でき、記録通り上記3件を控除します）。
- **EC（1件）**：
  - [ec_orders.xlsx](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/ec_orders.xlsx) 41行目 `EC-1132` `2026-10-11T03:20:00Z` 鈴木美咲 `00201` アロマキャンドル `-1個` `-1980`（税込 -1,980円 / 税抜 -1,800円）。同一顧客「鈴木美咲」は9月15日（141行目 `EC-1030`）に同商品アロマキャンドルを2個（3,960円）購入しており、購入履歴と整合する正当な返品処理です。

---

## 3. 連絡メール4通の主張・仮説に対する監査判定まとめ

| メール（[mail.txt](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/mail.txt)） | 主張・仮説の内容 | 監査判定 | 裏付け証拠・データ事実 |
| :--- | :--- | :---: | :--- |
| **① 10/15 田中店長（郊外店）**<br>[1〜20行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/mail.txt#L1-L20) | 10/14のハンドタオル数量を12個→120個と1桁多く打ったかもしれない | **事実（要修正）** | [pos.csv 37行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L37) に `120個 / 79,200円` を確認。他全行の数量分布（最大11個）からも明白な誤入力。`12個 / 7,920円`（税込 -71,280円）に修正。 |
| **② 10/8 佐々木店長（本店）**<br>[24〜37行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/mail.txt#L24-L37) | 駅前店は10/5・6改装休業だが前後の週末が忙しく月全体で大きく落ちていない印象 | **事実と一致** | 10/5・6の駅前店売上は0件。表記ゆれ統合後の月次売上は前月比 -4.1%（税込 202,090円→193,754円）と軽微で全店1位を維持。週末平均は +33.4%増。 |
| **③ 11/4 経営企画室**<br>[41〜54行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/mail.txt#L41-L54) | 駅前店の改装休業による売上不振が不整合・落ち込みの主因である | **誤り（棄却）** | 改装後の店舗名表記ゆれ（`'駅前店 '` 8件・`'ｴｷﾏｴ店'` 7件＝計 98,232円）の集計漏れによる見かけ上の急落（-47.5%）を不振と誤認したもの。全社売上も実際は +10.4%の増収。 |
| **④ 10/23 田中店長（郊外店）**<br>[58〜71行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/mail.txt#L58-L71) | 返品はレジでマイナス打ち直しのため、そのまま差し引けばよい | **運用妥当** | POS 3件（本店・空港店・駅前店）およびEC 1件のマイナス計上は正当な返品控除としてそのまま合算（郊外店自体には該当期間のマイナス行・10/23以前のマグカップ取引なし）。 |

---

## 4. 未調整値（単純集計）から確定実績値への差異調整表（ブリッジ表）

### 4-1. 店舗POS（[pos.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv)：全280行、記録基準＝税込）
- ファイル全280行 単純合計（税込）：**1,481,965円**
  - 対象期間外除外（8/20 [127行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L127)：-3,024円、11/2 [239行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L239)：-2,052円）後の9月・10月単純合計は以下の通りです。

| 調整項目 | 2026年9月（税込） | 2026年9月（税抜） | 2026年10月（税込） | 2026年10月（税抜） | 根拠・該当行 |
| :--- | ---: | ---: | ---: | ---: | :--- |
| **月別単純抽出合計**（※日付書式正規化後） | **694,935円** | **635,101円** | **781,954円** | **713,050円** | 9月:151行 / 10月:127行（※もし `LEFT(日付,7)` 抽出だと9月は338,321円に半減） |
| ① テストデータの除外 | -1円 | -1円 | 0円 | 0円 | [206行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L206) `99999 テスト` |
| ② 架空日付（`2026/09/31`）の除外 | -2,592円 | -2,400円 | 0円 | 0円 | [276行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L276) 本店 コーヒー豆2個 |
| ③ 完全一致重複（4件）の除外 | -7,892円 | -7,200円 | 0円 | 0円 | [25](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L25), [125](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L125), [185](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L185), [242行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L242) |
| ④ 数量1桁誤入力の訂正（120個→12個） | 0円 | 0円 | -71,280円 | -64,800円 | [37行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/pos.csv#L37) 10/14郊外店ハンドタオル |
| **確定実績（POS合計）** | **684,450円** | **625,500円** | **710,674円** | **648,250円** | 有効明細：9月145行 / 10月127行（消費税：9月 58,950円 / 10月 62,424円） |

---

### 4-2. 卸売（[wholesale.csv](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv)：全54行、記録基準＝税抜）
- ファイル全54行 単純合計（税抜）：**10,707,501円**
  - 対象期間外除外（8/18 `W-2048` [22行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv#L22)：-25,000円、11/5 `W-2049` [46行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv#L46)：-25,000円）後の月別ブリッジは以下の通りです。

| 調整項目 | 2026年9月（税抜） | 2026年9月（税込換算） | 2026年10月（税抜） | 2026年10月（税込換算） | 根拠・該当伝票 |
| :--- | ---: | ---: | ---: | ---: | :--- |
| **月別全行 単純合計** | **5,354,001円** | **5,869,361円** | **5,303,500円** | **5,804,960円** | 9月:25行 / 10月:27行（※`通常`行のみ合計だと9月 4,792,001円 / 10月 4,967,500円） |
| ① 取消伝票の除外（`通常`行＋`取消`行の両方） | -420,000円 | -462,000円 | -132,000円 | -145,200円 | 9月:`W-2044`（210,000×2行）、10月:`W-2045`（66,000×2行） |
| ② 訂正伝票における訂正前（`通常`行）の除外 | -484,000円 | -532,400円 | -256,000円 | -279,360円 | 9月:`W-2041`（通常484,000除外・訂正352,000採用）、10月:`W-2042`（通常144,000除外・訂正165,000採用）・`W-2043`（通常112,000除外・訂正105,000採用） |
| ③ 架空日付（`令和8年9月31日`）の除外 | -45,000円 | -49,500円 | 0円 | 0円 | [13行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv#L13) `W-2047` ホテル青葉 |
| ④ テストデータの除外 | -1円 | -1円 | 0円 | 0円 | [12行目](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/wholesale.csv#L12) `W-2046` テスト |
| **確定実績（卸売合計）** | **4,405,000円** | **4,825,460円** | **4,915,500円** | **5,380,400円** | 有効伝票：9月20件 / 10月23件（消費税相当：9月 420,460円 / 10月 464,900円） |

---

### 4-3. EC（[ec_orders.xlsx](file:///Users/babashunsuke/AiWorkspace/ai-verification/prac-bench/results/2026-11-20/task-06-trap-data-audit/carbon/ec_orders.xlsx)：全141行、記録基準＝税込・UTC）
- ファイル全141行 単純合計（税込）：**316,328円**
  - UTC日付上も期間外の2件（8/14 `EC-1140` 83行目：-1,980円、11/3 `EC-1141` 69行目：-1,980円）を除いた月別ブリッジは以下の通りです。

| 調整項目 | 2026年9月（税込） | 2026年9月（税抜） | 2026年10月（税込） | 2026年10月（税抜） | 根拠・該当注文ID |
| :--- | ---: | ---: | ---: | ---: | :--- |
| **UTC日付基準 月別単純合計** | **157,122円** | **143,602円** | **155,246円** | **141,600円** | UTC 9月:70行 / UTC 10月:69行 |
| ① テストデータの除外（2件） | -2円 | -2円 | 0円 | 0円 | `EC-1137`（101行目）、`EC-1138`（29行目） |
| ② 架空日付（`2026-09-31`）の除外 | -1,650円 | -1,500円 | 0円 | 0円 | `EC-1139`（30行目）マグカップ1個 |
| ③ UTC→JST変換：9/30深夜 → 10/1へ振替 | -3,780円 | -3,500円 | +3,780円 | +3,500円 | `EC-1133`（2,052円）、`EC-1134`（1,728円） |
| ④ UTC→JST変換：10/31深夜 → 11/1（期間外）除外 | 0円 | 0円 | -2,970円 | -2,700円 | `EC-1135`（1,210円）、`EC-1136`（1,760円） |
| **確定実績（EC合計・JST基準）** | **151,690円** | **138,600円** | **156,056円** | **142,400円** | 有効注文：9月65件 / 10月69件［返品1件含む］（消費税：9月 13,090円 / 10月 13,656円） |

---

## 5. 詳細実績内訳表

### 5-1. 店舗POS：店舗別売上実績（表記ゆれ統合・クレンジング後 vs 表記未統合の比較）

| 店舗名 | 9月 税抜 | 9月 税込 | 10月 税抜 | 10月 税込 | 前月差（税込 / 率） | （参考）店舗名未正規化時の10月税込 |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| **駅前店**（※3表記統合） | 184,400円 | 202,090円 | 176,750円 | 193,754円 | -8,336円（-4.1%） | 95,522円（98,232円脱落） |
| **郊外店** | 132,300円 | 144,884円 | 165,750円 | 181,656円 | +36,772円（+25.4%） | 181,656円（※誤入力未修正時は252,936円） |
| **本店** | 173,600円 | 189,786円 | 153,100円 | 167,654円 | -22,132円（-11.7%） | 167,654円 |
| **空港店** | 135,200円 | 147,690円 | 152,650円 | 167,610円 | +19,920円（+13.5%） | 167,610円 |
| **店舗POS 合計** | **625,500円** | **684,450円** | **648,250円** | **710,674円** | **+26,224円（+3.8%）** | — |

### 5-2. 全社：カテゴリ・税率別内訳（食品＝軽減税率8%、雑貨＝標準税率10%）

| 月 | チャネル | 食品・税抜（8%対象） | 食品・消費税（8%） | 食品・税込 | 雑貨・税抜（10%対象） | 雑貨・消費税（10%） | 雑貨・税込 | 合計（税抜） | 合計（税込） |
| :---: | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **9月** | 店舗POS | 180,000円 | 14,400円 | 194,400円 | 445,500円 | 44,550円 | 490,050円 | 625,500円 | 684,450円 |
| **9月** | 卸売 | 1,002,000円 | 80,160円 | 1,082,160円 | 3,403,000円 | 340,300円 | 3,743,300円 | 4,405,000円 | 4,825,460円 |
| **9月** | EC | 38,500円 | 3,080円 | 41,580円 | 100,100円 | 10,010円 | 110,110円 | 138,600円 | 151,690円 |
| **9月** | **全社計** | **1,220,500円** | **97,640円** | **1,318,140円** | **3,948,600円** | **394,860円** | **4,343,460円** | **5,169,100円** | **5,661,600円** |
| **10月** | 店舗POS | 120,050円 | 9,604円 | 129,654円 | 528,200円 | 52,820円 | 581,020円 | 648,250円 | 710,674円 |
| **10月** | 卸売 | 1,332,500円 | 106,600円 | 1,439,100円 | 3,583,000円 | 358,300円 | 3,941,300円 | 4,915,500円 | 5,380,400円 |
| **10月** | EC | 29,200円 | 2,336円 | 31,536円 | 113,200円 | 11,320円 | 124,520円 | 142,400円 | 156,056円 |
| **10月** | **全社計** | **1,481,750円** | **118,540円** | **1,600,290円** | **4,224,400円** | **422,440円** | **4,646,840円** | **5,706,150円** | **6,247,130円** |

### 5-3. 卸売：取引先別実績（クレンジング後）

| 取引先名 | 9月（税抜） | 9月（税込換算） | 10月（税抜） | 10月（税込換算） | 前月差（税抜） |
| :--- | ---: | ---: | ---: | ---: | ---: |
| 株式会社ミナト商事 | 2,176,000円 | 2,387,160円 | 1,104,000円 | 1,208,880円 | -1,072,000円 |
| ホテル青葉 | 971,000円 | 1,063,060円 | 1,513,000円 | 1,660,500円 | +542,000円 |
| 株式会社タカハシ文具 | 911,000円 | 998,500円 | 477,000円 | 524,700円 | -434,000円 |
| カフェ・ルーチェ | 347,000円 | 376,740円 | 1,280,000円 | 1,398,080円 | +933,000円 |
| 有限会社そらまめ堂 | 0円 | 0円 | 541,500円 | 588,240円 | +541,500円 |
| **卸売 合計** | **4,405,000円** | **4,825,460円** | **4,915,500円** | **5,380,400円** | **+510,500円** |

### 5-4. 全社：商品別売上実績（3チャネル統合・単価マスタ）

| 商品コード | 商品名 | 区分（税率） | 税抜単価 | 税込単価 | 9月数量 | 9月税抜 | 9月税込 | 10月数量 | 10月税抜 | 10月税込 |
| :---: | :--- | :---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `00101` | 有機ドリップコーヒー豆 | 食品（8%） | 1,200円 | 1,296円 | 553 | 663,600円 | 716,688円 | 423 | 507,600円 | 548,208円 |
| `00102` | 紅茶ティーバッグ | 食品（8%） | 800円 | 864円 | 165 | 132,000円 | 142,560円 | 238 | 190,400円 | 205,632円 |
| `00123` | ハンドタオル | 雑貨（10%） | 600円 | 660円 | 31 | 18,600円 | 20,460円 | 109 | 65,400円 | 71,940円 |
| `00124` | ステンレスマグカップ | 雑貨（10%） | 1,500円 | 1,650円 | 255 | 382,500円 | 420,750円 | 210 | 315,000円 | 346,500円 |
| `00201` | アロマキャンドル | 雑貨（10%） | 1,800円 | 1,980円 | 120 | 216,000円 | 237,600円 | 387 | 696,600円 | 766,260円 |
| `00202` | ルームフレグランス | 雑貨（10%） | 2,200円 | 2,420円 | 211 | 464,200円 | 510,620円 | 20 | 44,000円 | 48,400円 |
| `00310` | クッキー缶 | 食品（8%） | 950円 | 1,026円 | 42 | 39,900円 | 43,092円 | 321 | 304,950円 | 329,346円 |
| `00311` | 季節のジャムセット | 食品（8%） | 1,400円 | 1,512円 | 275 | 385,000円 | 415,800円 | 342 | 478,800円 | 517,104円 |
| `00401` | エコバッグ | 雑貨（10%） | 700円 | 770円 | 143 | 100,100円 | 110,110円 | 110 | 77,000円 | 84,700円 |
| `00402` | 保冷バッグ | 雑貨（10%） | 1,100円 | 1,210円 | 229 | 251,900円 | 277,090円 | 47 | 51,700円 | 56,870円 |
| `00501` | ハンドソープ | 雑貨（10%） | 500円 | 550円 | 87 | 43,500円 | 47,850円 | 204 | 102,000円 | 112,200円 |
| `00502` | バスソルト | 雑貨（10%） | 900円 | 990円 | 210 | 189,000円 | 207,900円 | 275 | 247,500円 | 272,250円 |
| `00601` | ドライフラワーブーケ | 雑貨（10%） | 1,600円 | 1,760円 | 248 | 396,800円 | 436,480円 | 409 | 654,400円 | 719,840円 |
| `00602` | 観葉植物ポット | 雑貨（10%） | 2,500円 | 2,750円 | 256 | 640,000円 | 704,000円 | 468 | 1,170,000円 | 1,287,000円 |
| `00603` | ①番人気ギフトBOX | 雑貨（10%） | 2,800円 | 3,080円 | 445 | 1,246,000円 | 1,370,600円 | 286 | 800,800円 | 880,880円 |
| **合計** | **全15品目** | — | — | — | **3,270** | **5,169,100円** | **5,661,600円** | **3,849** | **5,706,150円** | **6,247,130円** |

---

## 6. 再発防止に向けた改善提言

1. **POSレジのマスタ統一と入力バリデーション**：駅前店のレジ端末設定（店舗マスタ）を `'駅前店'` に統一し、日付出力形式（ISO形式 `YYYY-MM-DD`）・文字コード（UTF-8）・商品コード（5桁ゼロ埋め）およびトランザクションID付与を標準化すること。また、1会計あたりの数量上限アラート（例：50個以上で警告表示）と実在日付チェック（`9/31` 等の拒否）を導入すること。
2. **卸売・ECの月次集計ETLルールの自動化**：
   - 卸売データは伝票番号単位で最新状態を集約するロジック（`取消` 伝票は元伝票ごと除外、`訂正` 伝票は `状態="訂正"` の行のみ採用）および税率マスタ（食品8%・雑貨10%）に基づく税抜／税込併記をシステム化すること。
   - ECデータは抽出または集計時に必ず **UTCからJST（+9時間）へ変換した上で月次締め** を行い、本番環境からテストアカウント・テスト商品（`テスト` / `99999`）を分離・除外すること。
