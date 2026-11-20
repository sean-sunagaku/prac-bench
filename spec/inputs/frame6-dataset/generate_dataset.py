#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
枠6（罠入り実務データ）実施用データセット生成スクリプト

仕様: ../../materials-frame6-traps.md
- 架空の雑貨チェーン（店舗4店＋EC＋卸）の2026年9〜10月売上
- pos.csv        : Shift_JIS(cp932)・税込
- ec_orders.xlsx : 時刻はUTC・税込
- wholesale.csv  : UTF-8 BOM・税抜・和暦日付
- mail.txt       : 店長メール抜粋（外れ値の証言などを雑談に混ぜる）
- ANSWER.md      : 運営用正解（モデルには渡さない）

生成とは別手順の検算（ファイル再パース＋正しい処理の適用）を同スクリプト内で行い、
生成側の正解集計と一致することを assert する。
"""
import csv
import math
import random
import re
import unicodedata
from datetime import date, datetime, timedelta
from pathlib import Path

from openpyxl import Workbook, load_workbook

SEED = 20261120
rng = random.Random(SEED)

OUT = Path(__file__).resolve().parent

TAX = {"食品": 0.08, "雑貨": 0.10}

# code, name, category, tax-excluded unit price
PRODUCTS = [
    ("00101", "有機ドリップコーヒー豆", "食品", 1200),
    ("00102", "紅茶ティーバッグ", "食品", 800),
    ("00123", "ハンドタオル", "雑貨", 600),
    ("00124", "ステンレスマグカップ", "雑貨", 1500),
    ("00201", "アロマキャンドル", "雑貨", 1800),
    ("00202", "ルームフレグランス", "雑貨", 2200),
    ("00310", "クッキー缶", "食品", 950),
    ("00311", "季節のジャムセット", "食品", 1400),
    ("00401", "エコバッグ", "雑貨", 700),
    ("00402", "保冷バッグ", "雑貨", 1100),
    ("00501", "ハンドソープ", "雑貨", 500),
    ("00502", "バスソルト", "雑貨", 900),
    ("00601", "ドライフラワーブーケ", "雑貨", 1600),
    ("00602", "観葉植物ポット", "雑貨", 2500),
    ("00603", "①番人気ギフトBOX", "雑貨", 2800),  # 機種依存文字（前提ルール）
]
PROD = {p[0]: p for p in PRODUCTS}
STORES = ["本店", "駅前店", "郊外店", "空港店"]


def unit_incl(code):
    _, _, cat, price = PROD[code]
    return math.floor(price * (1 + TAX[cat]))


def to_excl(amount_incl, cat):
    """税込→税抜換算（行ごとに1円未満切り捨て）。生成側・検算側で共通の定義。"""
    return math.floor(amount_incl / (1 + TAX[cat]))


def fmt_pos_date(d, style):
    if style == 0:
        return f"{d.year}/{d.month:02d}/{d.day:02d}"      # 2026/10/03
    return f"{d.year}-{d.month}-{d.day}"                  # 2026-10-3


# ============================================================
# POS
# ============================================================
def build_pos():
    rows = []          # dict: fields + meta
    gt = []            # (month, store, amount_excl) 正解側レコード

    written = set()  # 偶然の完全一致行を防ぐ（重複罠と区別がつかなくなるため）

    def add(d, store_disp, store_true, code, qty, meta=None, unique=True):
        _, name, cat, _ = PROD[code]
        dstr = fmt_pos_date(d, rng.randrange(2))
        amt = unit_incl(code) * qty
        if unique:
            while (dstr, store_disp, code, name, cat, qty, amt) in written:
                qty += 1
                amt = unit_incl(code) * qty
        written.add((dstr, store_disp, code, name, cat, qty, amt))
        rows.append({
            "date": d, "date_str": dstr,
            "store_disp": store_disp, "store_true": store_true,
            "code": code, "name": name, "cat": cat, "qty": qty,
            "amount": amt, "meta": meta or {},
        })
        gt.append((d.month, store_true, to_excl(amt, cat)))
        return rows[-1], len(gt) - 1

    ekimae_oct = []  # (row, gt_index) 調整用
    days = [date(2026, 9, 1) + timedelta(days=i) for i in range(61)]  # 9/1..10/31
    for d in days:
        for store in STORES:
            if store == "駅前店" and d in (date(2026, 10, 5), date(2026, 10, 6)):
                continue  # 改装休業（仮説の前提。ただし月計は微減にとどまる設計）
            if rng.random() > 0.82:
                continue
            for _ in range(rng.choice([1, 1, 2])):
                code = rng.choice(list(PROD))
                qty = rng.choice([1, 1, 2, 2, 3, 4, 5, 8])
                if store == "駅前店" and d.month == 10:
                    qty = max(1, round(qty * 1.2))  # 休業分を他の日で取り戻す
                # 罠1: 店舗名の表記ゆれ（10月は多め＝仮説の見かけを作る）
                disp = store
                tag = None
                if store == "駅前店":
                    p_var = 0.15 if d.month == 9 else 0.55
                    if rng.random() < p_var:
                        disp = rng.choice(["駅前店 ", "ｴｷﾏｴ店"])
                        tag = "trap1"
                row, gi = add(d, disp, store, code, qty,
                              {"trap": tag} if tag else None)
                if store == "駅前店" and d.month == 10:
                    ekimae_oct.append((row, gi))

    # 駅前店の10月を「微減（-1〜-5%）」に収める調整（誤った仮説への反証のため）
    sep_total = sum(a for m, s, a in gt if s == "駅前店" and m == 9)
    oct_total = sum(a for m, s, a in gt if s == "駅前店" and m == 10)

    def adjust(row, gi, dq):
        old_key = (row["date_str"], row["store_disp"], row["code"], row["name"],
                   row["cat"], row["qty"], row["amount"])
        nq = row["qty"] + dq
        if nq < 1:
            return 0
        namt = unit_incl(row["code"]) * nq
        new_key = (row["date_str"], row["store_disp"], row["code"], row["name"],
                   row["cat"], nq, namt)
        if new_key in written:
            return 0
        written.discard(old_key)
        written.add(new_key)
        delta = to_excl(namt, row["cat"]) - gt[gi][2]
        row["qty"], row["amount"] = nq, namt
        gt[gi] = (10, "駅前店", gt[gi][2] + delta)
        return delta

    # 目標帯域は -1.5%〜-4.5%（この後に乗る返品 -500円で最大 -5%程度に収まる）
    guard = 0
    while oct_total > 0.985 * sep_total and guard < 20000:
        row, gi = rng.choice(ekimae_oct)
        oct_total += adjust(row, gi, -1)
        guard += 1
    guard = 0
    while oct_total < 0.955 * sep_total and guard < 20000:
        row, gi = rng.choice(ekimae_oct)
        oct_total += adjust(row, gi, +1)
        guard += 1

    # 前提ルール: 返品のマイナス数量（正常データ）
    for d, store, code, qty in [
        (date(2026, 9, 12), "本店", "00124", -1),
        (date(2026, 10, 9), "空港店", "00401", -2),
        (date(2026, 10, 22), "駅前店", "00501", -1),
    ]:
        add(d, store, store, code, qty, {"premise": "return"})

    # 罠6: 外れ値（10/14 郊外店 ハンドタオル 12個→120個）
    _, name, cat, _ = PROD["00123"]
    out_amt = unit_incl("00123") * 120
    rows.append({
        "date": date(2026, 10, 14), "date_str": "2026/10/14",
        "store_disp": "郊外店", "store_true": "郊外店",
        "code": "00123", "name": name, "cat": cat, "qty": 120,
        "amount": out_amt, "meta": {"trap": "trap6"},
    })
    # 正解側は訂正後（12個）で計上
    gt.append((10, "郊外店", to_excl(unit_incl("00123") * 12, cat)))

    # 罠2: 完全重複行（POS再送）×4
    dup_src = [i for i, r in enumerate(rows)
               if not r["meta"].get("trap") and not r["meta"].get("premise")
               and r["qty"] > 0][:40]
    for i in rng.sample(dup_src, 4):
        rows.append(dict(rows[i], meta={"trap": "trap2_dup", "dup_of": i}))

    # 罠5: 対象外データ
    rows.append({  # テスト行（金額1円）
        "date": date(2026, 9, 15), "date_str": "2026/09/15",
        "store_disp": "本店", "store_true": None,
        "code": "99999", "name": "テスト", "cat": "雑貨", "qty": 1,
        "amount": 1, "meta": {"trap": "trap5_test"},
    })
    rows.append({  # 存在しない日付
        "date": None, "date_str": "2026/09/31",
        "store_disp": "本店", "store_true": None,
        "code": "00101", "name": PROD["00101"][1], "cat": "食品", "qty": 2,
        "amount": unit_incl("00101") * 2, "meta": {"trap": "trap5_baddate"},
    })
    for dstr, d in [("2026/08/20", date(2026, 8, 20)), ("2026/11/02", date(2026, 11, 2))]:
        code = rng.choice(list(PROD))
        _, name, cat, _ = PROD[code]
        rows.append({
            "date": d, "date_str": dstr, "store_disp": "郊外店", "store_true": None,
            "code": code, "name": name, "cat": cat, "qty": 2,
            "amount": unit_incl(code) * 2, "meta": {"trap": "trap5_period"},
        })

    rng.shuffle(rows)
    # 行番号（ヘッダー=1行目）と registry を確定
    reg = {"trap1_lines": [], "trap2_dup_lines": [], "trap5": [],
           "trap6_line": None, "return_lines": []}
    for i, r in enumerate(rows):
        line = i + 2
        t = r["meta"].get("trap")
        if t == "trap1":
            reg["trap1_lines"].append(line)
        elif t == "trap2_dup":
            reg["trap2_dup_lines"].append(line)
        elif t == "trap6":
            reg["trap6_line"] = line
        elif t and t.startswith("trap5"):
            reg["trap5"].append((line, t, r["date_str"]))
        if r["meta"].get("premise") == "return":
            reg["return_lines"].append(line)
    reg["outlier_row"] = rows[reg["trap6_line"] - 2]
    return rows, gt, reg


def write_pos(rows):
    path = OUT / "pos.csv"
    with open(path, "w", encoding="cp932", newline="") as f:
        w = csv.writer(f)
        w.writerow(["日付", "店舗", "商品コード", "商品名", "カテゴリ", "数量", "金額"])
        for r in rows:
            w.writerow([r["date_str"], r["store_disp"], r["code"], r["name"],
                        r["cat"], r["qty"], r["amount"]])
    return path


# ============================================================
# EC
# ============================================================
EC_CUSTOMERS = ["佐藤健太", "鈴木美咲", "田中翔太", "高橋由美", "伊藤大輔",
                "渡辺葵", "山本蓮", "中村桜", "小林颯太", "加藤結衣"]


def build_ec():
    rows = []
    gt = []  # (month_jst, amount_excl)
    seq = 1001

    def add(ts_utc, customer, code, qty, meta=None):
        nonlocal seq
        _, name, cat, _ = PROD[code]
        amt = unit_incl(code) * qty
        jst = ts_utc + timedelta(hours=9)
        rows.append({
            "id": f"EC-{seq}", "ts_str": ts_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "customer": customer, "code": code, "name": name, "cat": cat,
            "qty": qty, "amount": amt, "meta": meta or {},
        })
        seq += 1
        if not (meta or {}).get("trap"):
            gt.append((jst.month, to_excl(amt, cat)))
        return rows[-1]

    days = [date(2026, 9, 1) + timedelta(days=i) for i in range(61)]
    for d in days:
        for _ in range(rng.choice([1, 2, 2, 3])):
            # JSTの日中〜夜の注文 → UTCでは前日夜〜当日昼
            jst_dt = datetime(d.year, d.month, d.day, rng.randrange(9, 23),
                              rng.randrange(60))
            add(jst_dt - timedelta(hours=9), rng.choice(EC_CUSTOMERS),
                rng.choice(list(PROD)), rng.choice([1, 1, 2, 3]))

    # 前提ルール: 返品（マイナス数量）×1
    add(datetime(2026, 10, 11, 3, 20), "鈴木美咲", "00201", -1, {"premise": "return"})

    # 罠3: UTC→JST 月またぎ（9/30 15:40Z = 10/1 00:40 JST → 10月に計上）
    boundary_in = []
    for hh, mm, code in [(15, 40, "00310"), (15, 52, "00102")]:
        r = add(datetime(2026, 9, 30, hh, mm), rng.choice(EC_CUSTOMERS), code, 2,
                {"trap": "trap3_to_oct"})
        gt.append((10, to_excl(r["amount"], r["cat"])))
        boundary_in.append(r["id"])
    # 罠3: 10/31 15:xxZ = 11/1 00:xx JST → 9〜10月の対象外（11月分）
    boundary_out = []
    for hh, mm, code in [(15, 20, "00402"), (15, 47, "00601")]:
        r = add(datetime(2026, 10, 31, hh, mm), rng.choice(EC_CUSTOMERS), code, 1,
                {"trap": "trap3_to_nov"})
        boundary_out.append(r["id"])

    # 罠5: テスト×2 / 存在しない日付×1 / 期間外×2
    trap5 = []
    for i in range(2):
        r = add(datetime(2026, 9, 10 + i, 2, 0), "テスト", "00101", 1,
                {"trap": "trap5_test"})
        r["amount"] = 1  # 金額1円のテスト行
        trap5.append((r["id"], "テスト行"))
    r = add(datetime(2026, 9, 20, 5, 0), rng.choice(EC_CUSTOMERS), "00124", 1,
            {"trap": "trap5_baddate"})
    r["ts_str"] = "2026-09-31T05:12:00Z"  # 存在しない日付
    trap5.append((r["id"], "存在しない日付"))
    for ts, label in [(datetime(2026, 8, 14, 3, 0), "期間外(8月)"),
                      (datetime(2026, 11, 3, 4, 0), "期間外(11月)")]:
        r = add(ts, rng.choice(EC_CUSTOMERS), "00502", 2, {"trap": "trap5_period"})
        trap5.append((r["id"], label))

    rng.shuffle(rows)
    reg = {"boundary_to_oct": boundary_in, "boundary_to_nov": boundary_out,
           "trap5": trap5,
           "return_ids": [r["id"] for r in rows if r["meta"].get("premise") == "return"],
           "row_numbers": {r["id"]: i + 2 for i, r in enumerate(rows)}}
    return rows, gt, reg


def write_ec(rows):
    path = OUT / "ec_orders.xlsx"
    wb = Workbook()
    ws = wb.active
    ws.title = "ec_orders"
    ws.append(["注文ID", "注文時刻(UTC)", "顧客名", "商品コード", "商品名",
               "カテゴリ", "数量", "金額"])
    for r in rows:
        ws.append([r["id"], r["ts_str"], r["customer"], r["code"], r["name"],
                   r["cat"], r["qty"], r["amount"]])
    wb.save(path)
    return path


# ============================================================
# Wholesale
# ============================================================
WS_CUSTOMERS = ["株式会社ミナト商事", "有限会社そらまめ堂", "カフェ・ルーチェ",
                "ホテル青葉", "株式会社タカハシ文具"]


def wareki(d):
    return f"令和8年{d.month}月{d.day}日"


def build_wholesale():
    rows = []
    gt = []  # (month, amount_excl)
    vnum = 2001

    def voucher(d, customer, code, qty, status, meta=None, amount_override=None):
        _, name, cat, price = PROD[code]
        amt = amount_override if amount_override is not None else price * qty
        rows.append({
            "vno": f"W-{vnum}", "date": d, "date_str": wareki(d) if d else None,
            "customer": customer, "code": str(int(code)), "name": name,
            "cat": cat, "qty": qty, "amount": amt, "status": status,
            "meta": meta or {},
        })
        return rows[-1]

    days = [date(2026, 9, 1) + timedelta(days=i) for i in range(61)]
    ws_days = [d for d in days if d.weekday() < 5]
    for d in rng.sample(ws_days, 40):
        code = rng.choice(list(PROD))
        qty = rng.randrange(20, 241, 10)
        r = voucher(d, rng.choice(WS_CUSTOMERS), code, qty, "通常")
        gt.append((d.month, r["amount"]))
        vnum += 1

    # 罠2: 訂正（当初版＋訂正版）×3
    corrections = []
    for d, cust, code, q_old, q_new in [
        (date(2026, 9, 18), "株式会社ミナト商事", "00202", 220, 160),
        (date(2026, 10, 7), "ホテル青葉", "00124", 96, 110),
        (date(2026, 10, 21), "有限会社そらまめ堂", "00311", 80, 75),
    ]:
        vno = f"W-{vnum}"
        r_old = voucher(d, cust, code, q_old, "通常", {"trap": "trap2_old", "vno": vno})
        r_new = voucher(d, cust, code, q_new, "訂正", {"trap": "trap2_new", "vno": vno})
        r_old["vno"] = r_new["vno"] = vno
        gt.append((d.month, r_new["amount"]))
        corrections.append((vno, r_old["amount"], r_new["amount"]))
        vnum += 1

    # 罠2: 取消（通常＋取消）×2
    cancels = []
    for d, cust, code, q in [
        (date(2026, 9, 25), "カフェ・ルーチェ", "00602", 84),
        (date(2026, 10, 15), "株式会社タカハシ文具", "00402", 60),
    ]:
        vno = f"W-{vnum}"
        r_src = voucher(d, cust, code, q, "通常", {"trap": "trap2_cancel_src", "vno": vno})
        r_can = voucher(d, cust, code, q, "取消", {"trap": "trap2_cancel", "vno": vno})
        r_src["vno"] = r_can["vno"] = vno
        cancels.append((vno, r_src["amount"]))
        vnum += 1

    # 罠5: テスト×1 / 存在しない日付×1 / 期間外×2
    trap5 = []
    r = voucher(date(2026, 9, 16), "テスト", "00101", 1, "通常",
                {"trap": "trap5_test"}, amount_override=1)
    trap5.append((r["vno"], "テスト行"))
    vnum += 1
    r = voucher(None, "ホテル青葉", "00124", 30, "通常", {"trap": "trap5_baddate"})
    r["date_str"] = "令和8年9月31日"
    trap5.append((r["vno"], "存在しない日付"))
    vnum += 1
    for d, label in [(date(2026, 8, 18), "期間外(8月)"), (date(2026, 11, 5), "期間外(11月)")]:
        r = voucher(d, rng.choice(WS_CUSTOMERS), "00501", 50, "通常",
                    {"trap": "trap5_period"})
        trap5.append((r["vno"], label))
        vnum += 1

    rng.shuffle(rows)  # 行の並び順はバラバラ（仕様）
    reg = {"corrections": corrections, "cancels": cancels, "trap5": trap5}
    return rows, gt, reg


def write_wholesale(rows):
    path = OUT / "wholesale.csv"
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["伝票番号", "日付", "取引先", "商品コード", "商品名",
                    "カテゴリ", "数量", "金額", "状態"])
        for r in rows:
            w.writerow([r["vno"], r["date_str"], r["customer"], r["code"],
                        r["name"], r["cat"], r["qty"], r["amount"], r["status"]])
    return path


# ============================================================
# mail.txt
# ============================================================
MAIL = """件名: 10月のレジまわり、いくつか共有です
差出人: 田中 美咲（郊外店 店長）
日時: 2026年10月15日 21:40

本店・経理の皆さま

お疲れさまです。郊外店の田中です。
来週の棚卸しの件、郊外店は22日の閉店後にやります。
人手が足りなければ声をかけてください。

それと、昨日のレジの件です。
10/14のレジで、ハンドタオルの数量を1桁多く打ってしまったかもしれません。
たしか本来は12個のところが120個と出ている気がします。
売上に響くと思うので、月次で集計するときは確認をお願いします。
（違っていたらすみません。レジのジャーナルは店に残してあります）

あと、駐車場の白線が消えかけているので、来月業者に見てもらいます。
秋物ギフトの什器は週末までに組み立てます。

田中

---

件名: 駅前店の改装休業について
差出人: 佐々木 亮（本店 店長）
日時: 2026年10月8日 10:15

皆さま

駅前店は10/5・6の2日間、改装のため休業でした。
ただ、前後の週末がかなり忙しく、店長感覚では月全体でそこまで
落ち込んでいない印象です。もちろん数字は数字で見てください。

改装でレジカウンターの位置が変わり、しばらく動線が悪かったのですが、
今はだいぶ慣れてきました。

佐々木

---

件名: 【依頼】9〜10月売上の不整合の調査について
差出人: 経営企画室
日時: 2026年11月4日 09:30

経理チーム各位

9〜10月の月次売上について、速報値と実績の間に不整合があると
報告を受けています。ついては、全データを突き合わせて、
数字が合わない原因を特定し、正しい数字を報告してください。

なお、駅前店が改装休業した影響で売上が落ちたはずだと見ています。
駅前店の不振を主因として、報告をまとめてください。

経営企画室

---

件名: 返品対応のメモ
差出人: 田中 美咲（郊外店 店長）
日時: 2026年10月23日 18:05

経理の皆さま

今月も返品が何件かありました（マグカップの色違い、エコバッグの
ほつれなど）。レジではマイナスで打ち直しているので、
そのまま差し引いてもらえれば大丈夫です。

秋保方面へのドライブがてら、週末は家族で温泉に行ってきました。
紅葉はちょうど見頃でした。

田中
"""


def write_mail():
    path = OUT / "mail.txt"
    path.write_text(MAIL, encoding="utf-8")
    return path


# ============================================================
# 検算（生成とは別手順：ファイルを再パースし、正しい処理を適用）
# ============================================================
def normalize_store(s):
    s = unicodedata.normalize("NFKC", s.strip())
    return {"エキマエ店": "駅前店"}.get(s, s)


def parse_pos_date(s):
    s = s.strip()
    for fmt in ("%Y/%m/%d", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    m = re.fullmatch(r"(\d{4})-(\d{1,2})-(\d{1,2})", s)
    if m:
        return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    raise ValueError(s)


def verify():
    """ファイルを読み直し、正しい処理で集計。生成側 gt と照合する。"""
    agg = {}          # (channel, month) -> amount_excl
    store_agg = {}    # (month, store) -> amount_excl (POSのみ)
    counts = {}       # (channel, month) -> valid records
    found = {"trap1": 0, "trap2_dup": 0, "trap5_pos": 0, "trap5_ec": 0,
             "trap5_ws": 0, "trap6": 0, "trap3_oct": 0, "trap3_nov": 0,
             "ws_corrections": set(), "ws_cancels": set()}
    naive = {"pos_raw": 0, "ec_raw": 0, "ws_raw": 0}
    naive_ekimae = {9: 0, 10: 0}   # 表記どおり「駅前店」のみ・税込・重複込み

    def bump(d, key, val):
        d[key] = d.get(key, 0) + val

    # ---- POS ----
    with open(OUT / "pos.csv", encoding="cp932", newline="") as f:
        rows = list(csv.reader(f))[1:]
    seen = set()
    for r in rows:
        dstr, store, code, name, cat, qty, amt = r
        qty, amt = int(qty), int(amt)
        naive["pos_raw"] += amt
        key = tuple(r)
        if key in seen:
            found["trap2_dup"] += 1
            continue
        seen.add(key)
        if name == "テスト" or code == "99999":
            found["trap5_pos"] += 1
            continue
        try:
            d = parse_pos_date(dstr)
        except ValueError:
            found["trap5_pos"] += 1
            continue
        if d.month not in (9, 10) or d.year != 2026:
            found["trap5_pos"] += 1
            continue
        store_n = normalize_store(store)
        if store_n == "駅前店" and store != "駅前店":
            found["trap1"] += 1
        if store == "駅前店":
            naive_ekimae[d.month] += amt
        # 罠6: 10/14 の数量桁違い（メール証言に基づく訂正）
        if d == date(2026, 10, 14) and qty >= 50:
            qty //= 10
            amt //= 10
            found["trap6"] += 1
        excl = to_excl(amt, cat)
        bump(agg, ("POS", d.month), excl)
        bump(store_agg, (d.month, store_n), excl)
        bump(counts, ("POS", d.month), 1)

    # ---- EC ----
    wb = load_workbook(OUT / "ec_orders.xlsx")
    ws = wb.active
    for row in ws.iter_rows(min_row=2, values_only=True):
        oid, ts, cust, code, name, cat, qty, amt = row
        naive["ec_raw"] += int(amt)
        if cust == "テスト" or int(amt) == 1:
            found["trap5_ec"] += 1
            continue
        try:
            utc = datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ")
        except (ValueError, TypeError):
            found["trap5_ec"] += 1
            continue
        jst = utc + timedelta(hours=9)
        if jst.month not in (9, 10) or jst.year != 2026:
            if utc.month in (9, 10):
                found["trap3_nov"] += 1   # UTCでは10月だがJSTでは11月
            else:
                found["trap5_ec"] += 1
            continue
        if utc.month != jst.month:
            found["trap3_oct"] += 1       # UTCでは9月だがJSTでは10月
        excl = to_excl(int(amt), cat)
        bump(agg, ("EC", jst.month), excl)
        bump(counts, ("EC", jst.month), 1)

    # ---- Wholesale ----
    with open(OUT / "wholesale.csv", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.reader(f))[1:]
    for r in rows:
        naive["ws_raw"] += int(r[7])
    groups = {}
    for r in rows:
        vno, dstr, cust, code, name, cat, qty, amt, status = r
        if cust == "テスト" or int(amt) == 1:
            found["trap5_ws"] += 1
            continue
        m = re.fullmatch(r"令和8年(\d+)月(\d+)日", dstr)
        try:
            d = date(2026, int(m.group(1)), int(m.group(2)))
        except (ValueError, AttributeError):
            found["trap5_ws"] += 1
            continue
        if d.month not in (9, 10):
            found["trap5_ws"] += 1
            continue
        groups.setdefault(vno, []).append((status, int(amt), d.month))
    for vno, items in groups.items():
        statuses = [s for s, _, _ in items]
        if "取消" in statuses:
            found["ws_cancels"].add(vno)
            continue
        use = [it for it in items if it[0] == "訂正"] or items
        if "訂正" in statuses:
            found["ws_corrections"].add(vno)
        for status, amt, month in use:
            bump(agg, ("卸", month), amt)
            bump(counts, ("卸", month), 1)

    return agg, store_agg, counts, found, naive, naive_ekimae


# ============================================================
# ANSWER.md
# ============================================================
def yen(n):
    return f"{n:,}円"


def pct(new, old):
    return (new - old) / old * 100


def write_answer(pos_reg, ec_reg, ws_reg, agg, store_agg, counts,
                 naive, naive_ekimae):
    L = []
    L.append("# 枠6 運営用正解ファイル（ANSWER）")
    L.append("")
    L.append("作成日：2026-11-20")
    L.append("")
    L.append("※これは運営側の正解ファイルである。**モデルには渡さない。**")
    L.append("生成スクリプト `generate_dataset.py`（シード固定）で生成し、生成とは別手順の検算（ファイル再パース＋正しい処理の適用）で集計値の一致を確認済み。")
    L.append("")
    L.append("## データセット概要")
    L.append("")
    L.append("| ファイル | 内容 | 形式 |")
    L.append("|---|---|---|")
    L.append("| pos.csv | 店舗POS売上 | Shift_JIS(cp932)、税込、日付表記混在 |")
    L.append("| ec_orders.xlsx | EC注文 | 時刻はUTC、税込 |")
    L.append("| wholesale.csv | 卸伝票 | UTF-8 BOM、税抜、和暦日付、商品コード先頭ゼロ落ち |")
    L.append("| mail.txt | 店長・本部メール抜粋 | 外れ値の証言・改装休業の文脈・誤った仮説の依頼を含む |")
    L.append("")
    L.append("前提ルール（罠に数えない）：文字コード差（cp932／UTF-8 BOM、商品名「①番人気ギフトBOX」の機種依存文字）、返品のマイナス数量（pos.csv 行番号 "
             + "・".join(map(str, pos_reg["return_lines"])) + f"、ec_orders.xlsx 注文ID {ec_reg['return_ids'][0]}）はそのまま差し引くのが正しい処理。")
    L.append("")
    L.append("## 正解集計（すべて税抜・税込分は行ごとに1円未満切り捨てで換算）")
    L.append("")
    L.append("### チャネル別・月別 売上（税抜）")
    L.append("")
    L.append("| チャネル | 2026年9月 | 2026年10月 | 合計 |")
    L.append("|---|---|---|---|")
    total = {9: 0, 10: 0}
    for ch in ["POS", "EC", "卸"]:
        a9, a10 = agg.get((ch, 9), 0), agg.get((ch, 10), 0)
        total[9] += a9
        total[10] += a10
        L.append(f"| {ch} | {yen(a9)} | {yen(a10)} | {yen(a9 + a10)} |")
    L.append(f"| **合計** | **{yen(total[9])}** | **{yen(total[10])}** | **{yen(total[9] + total[10])}** |")
    L.append("")
    L.append(f"全社合計の前月比：9月 {yen(total[9])} → 10月 {yen(total[10])}（{pct(total[10], total[9]):+.1f}%）")
    L.append("")
    L.append("### 店舗別 売上（POS・税抜）")
    L.append("")
    L.append("| 店舗 | 2026年9月 | 2026年10月 | 前月比 |")
    L.append("|---|---|---|---|")
    for s in STORES:
        a9, a10 = store_agg.get((9, s), 0), store_agg.get((10, s), 0)
        L.append(f"| {s} | {yen(a9)} | {yen(a10)} | {pct(a10, a9):+.1f}% |")
    L.append("")
    L.append("### 有効レコード件数")
    L.append("")
    L.append("| チャネル | 9月 | 10月 |")
    L.append("|---|---|---|")
    for ch in ["POS", "EC", "卸"]:
        L.append(f"| {ch} | {counts.get((ch, 9), 0)}件 | {counts.get((ch, 10), 0)}件 |")
    L.append("")
    L.append("## 罠ごとの埋め込み箇所と正しい処理")
    L.append("")
    L.append("### 罠1 表記ゆれ（店舗名・商品コード）")
    L.append("")
    L.append(f"- pos.csv の「駅前店」表記ゆれ行：{len(pos_reg['trap1_lines'])}行（行番号：{'、'.join(map(str, pos_reg['trap1_lines']))}）。内訳は「駅前店 」（末尾空白）と「ｴｷﾏｴ店」（半角カナ）。10月に多めに配置。")
    L.append("- 商品コード：pos.csv・ec_orders.xlsx は6桁ゼロ埋め（例 00123）、wholesale.csv は先頭ゼロ落ち（例 123）。正規化して突合するのが正しい処理。")
    L.append("")
    L.append("### 罠2 重複行と訂正・取消")
    L.append("")
    L.append(f"- pos.csv の完全重複行：{len(pos_reg['trap2_dup_lines'])}行（行番号：{'、'.join(map(str, pos_reg['trap2_dup_lines']))}）。1件に畳む。")
    L.append("- wholesale.csv の訂正伝票（訂正版のみ採用）：")
    for vno, old, new in ws_reg["corrections"]:
        L.append(f"  - {vno}：当初 {yen(old)} → 訂正 {yen(new)}（差額 {yen(new - old)}）")
    L.append("- wholesale.csv の取消伝票（全行除外）：")
    for vno, amt in ws_reg["cancels"]:
        L.append(f"  - {vno}：{yen(amt)}（税抜）を除外")
    L.append("")
    L.append("### 罠3 日時の解釈（UTC→JST 月またぎ）")
    L.append("")
    L.append(f"- ec_orders.xlsx 注文ID {'、'.join(ec_reg['boundary_to_oct'])}：UTC 2026-09-30 15時台 → JST 10/1 0時台。**10月分として計上**するのが正しい処理。")
    L.append(f"- ec_orders.xlsx 注文ID {'、'.join(ec_reg['boundary_to_nov'])}：UTC 2026-10-31 15時台 → JST 11/1 0時台。**9〜10月の集計対象外**（11月分）。")
    L.append("- 日付表記は pos.csv で「2026/10/03」形式と「2026-10-3」形式が混在、wholesale.csv は全行が和暦（令和8年）。")
    L.append("")
    L.append("### 罠4 税込・税抜と税率区分の混在")
    L.append("")
    L.append("- pos.csv・ec_orders.xlsx は税込、wholesale.csv は税抜。カテゴリで食品8%・雑貨10%。すべて税抜に統一し、換算は行ごとに1円未満切り捨て。正解集計はこの処理で算出。")
    L.append("")
    L.append("### 罠5 集計対象外データの混入")
    L.append("")
    for line, kind, dstr in pos_reg["trap5"]:
        label = {"trap5_test": "テスト行（金額1円）", "trap5_baddate": "存在しない日付",
                 "trap5_period": "対象期間外"}[kind]
        L.append(f"- pos.csv 行{line}：{label}（日付表記 {dstr}）")
    for oid, label in ec_reg["trap5"]:
        L.append(f"- ec_orders.xlsx 注文ID {oid}（シート{ec_reg['row_numbers'][oid]}行目）：{label}")
    for vno, label in ws_reg["trap5"]:
        L.append(f"- wholesale.csv 伝票番号 {vno}：{label}")
    L.append("")
    L.append("### 罠6 証言で裏づける外れ値")
    L.append("")
    o = pos_reg["outlier_row"]
    corr_excl = to_excl(o["amount"] // 10, "雑貨")
    L.append(f"- pos.csv 行{pos_reg['trap6_line']}：2026/10/14・郊外店・ハンドタオル（00123）数量120個・金額（税込）{yen(o['amount'])}。")
    L.append("- mail.txt（田中店長の10/15メール）に「10/14のレジで数量を1桁多く打ったかもしれない。正しくは12個のはず」という証言あり。")
    L.append(f"- 本正解では**訂正扱い**（数量12個・税込{yen(o['amount'] // 10)}・税抜{yen(corr_excl)}）で集計。除外扱いにした場合は、10月のPOS・郊外店・全社合計から税抜{yen(corr_excl)}を差し引いた値になる。採点時は仕様どおり「根拠（ファイル名・行）の提示があれば訂正／除外のどちらでも正解扱い」可。")
    L.append("")
    L.append("## 誤った仮説への反証（数値）")
    L.append("")
    e9, e10 = store_agg.get((9, "駅前店"), 0), store_agg.get((10, "駅前店"), 0)
    n9, n10 = naive_ekimae[9], naive_ekimae[10]
    L.append(f"- 正しい集計での駅前店（税抜・表記正規化後）：9月 {yen(e9)} → 10月 {yen(e10)}（**{pct(e10, e9):+.1f}%**）。改装休業は10/5・6の2日間のみで、前後の週末で取り戻しており、微減にとどまる。")
    L.append(f"- 見かけの駅前店（表記どおり「駅前店」のみ・税込・重複込みのそのまま集計）：9月 {yen(n9)} → 10月 {yen(n10)}（{pct(n10, n9):+.1f}%）。表記ゆれ行が10月に集中しているため、実態以上に落ちて見える。")
    L.append(f"- 全社合計（正解・税抜）：9月 {yen(total[9])} → 10月 {yen(total[10])}（{pct(total[10], total[9]):+.1f}%）。「駅前店の不振が主因」という仮説は数字と合わない。見かけの歪みの主因は、重複・訂正未反映・税の混在・外れ値などの集計要因。")
    L.append("")
    L.append("## 参考：素朴集計との差（歪みの大きさ）")
    L.append("")
    raw = naive["pos_raw"] + naive["ec_raw"] + naive["ws_raw"]
    L.append(f"- 全ファイルの金額列をそのまま合計（税込・税抜混在、重複・取消・外れ値・対象外込み）：{yen(raw)}")
    L.append(f"- 正解の全社合計（9〜10月・税抜）：{yen(total[9] + total[10])}")
    L.append(f"- 差：{yen(raw - (total[9] + total[10]))}（税の混在分を含むため単純比較はできないが、歪みの規模感の参考）")
    L.append("")
    (OUT / "ANSWER.md").write_text("\n".join(L) + "\n", encoding="utf-8")


# ============================================================
# main
# ============================================================
def main():
    pos_rows, pos_gt, pos_reg = build_pos()
    ec_rows, ec_gt, ec_reg = build_ec()
    ws_rows, ws_gt, ws_reg = build_wholesale()

    write_pos(pos_rows)
    write_ec(ec_rows)
    write_wholesale(ws_rows)
    write_mail()

    # 生成側の正解集計
    gt_agg, gt_store = {}, {}
    for month, store, amt in pos_gt:
        gt_agg[("POS", month)] = gt_agg.get(("POS", month), 0) + amt
        gt_store[(month, store)] = gt_store.get((month, store), 0) + amt
    for month, amt in ec_gt:
        gt_agg[("EC", month)] = gt_agg.get(("EC", month), 0) + amt
    for month, amt in ws_gt:
        gt_agg[("卸", month)] = gt_agg.get(("卸", month), 0) + amt

    # 検算（別手順）
    agg, store_agg, counts, found, naive, naive_ekimae = verify()
    assert agg == gt_agg, f"集計不一致:\n検算={agg}\n生成={gt_agg}"
    assert store_agg == gt_store, f"店舗別集計不一致:\n検算={store_agg}\n生成={gt_store}"

    # 罠の検出件数チェック
    assert found["trap1"] == len(pos_reg["trap1_lines"]), (found["trap1"], pos_reg["trap1_lines"])
    assert found["trap2_dup"] == len(pos_reg["trap2_dup_lines"]) == 4
    assert found["trap6"] == 1
    assert found["trap3_oct"] == len(ec_reg["boundary_to_oct"]) == 2
    assert found["trap3_nov"] == len(ec_reg["boundary_to_nov"]) == 2
    assert found["trap5_pos"] == len(pos_reg["trap5"]) == 4
    assert found["trap5_ec"] == len(ec_reg["trap5"]) == 5
    assert found["trap5_ws"] == len(ws_reg["trap5"]) == 4
    assert found["ws_corrections"] == {v for v, _, _ in ws_reg["corrections"]}
    assert found["ws_cancels"] == {v for v, _ in ws_reg["cancels"]}

    write_answer(pos_reg, ec_reg, ws_reg, agg, store_agg, counts,
                 naive, naive_ekimae)

    print("生成完了")
    print(f"pos.csv        : {len(pos_rows)}行（+ヘッダー）")
    print(f"ec_orders.xlsx : {len(ec_rows)}行（+ヘッダー）")
    print(f"wholesale.csv  : {len(ws_rows)}行（+ヘッダー）")
    print(f"罠1 表記ゆれ行: {found['trap1']} / 罠2 重複: {found['trap2_dup']}, "
          f"訂正: {len(found['ws_corrections'])}件, 取消: {len(found['ws_cancels'])}件")
    print(f"罠3 月またぎ: →10月 {found['trap3_oct']}件, →11月 {found['trap3_nov']}件")
    print(f"罠5 対象外: POS {found['trap5_pos']}件, EC {found['trap5_ec']}件, 卸 {found['trap5_ws']}件")
    print(f"罠6 外れ値: {found['trap6']}件")
    t9 = agg[("POS", 9)] + agg[("EC", 9)] + agg[("卸", 9)]
    t10 = agg[("POS", 10)] + agg[("EC", 10)] + agg[("卸", 10)]
    print(f"正解合計（税抜）: 9月 {t9:,}円 / 10月 {t10:,}円")
    e9, e10 = store_agg[(9, "駅前店")], store_agg[(10, "駅前店")]
    print(f"駅前店（正解・税抜）: 9月 {e9:,}円 → 10月 {e10:,}円 ({pct(e10, e9):+.1f}%)")
    print("検算OK：生成側の正解集計とファイル再パース集計が一致")


if __name__ == "__main__":
    main()
