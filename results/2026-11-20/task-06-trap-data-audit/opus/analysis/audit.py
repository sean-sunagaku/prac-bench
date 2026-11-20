"""9〜10月 売上データの不整合調査スクリプト（標準ライブラリのみ）

使い方:
    python3 -I analysis/audit.py <データのあるフォルダ> <出力フォルダ>

- 原本（pos.csv / wholesale.csv / ec_orders.xlsx）は読み取りのみで、書き換えない。
- 全レコードを1つの形にそろえ、レコードごとに「問題の種類」と「集計に入れるか」を判定する。
- 「単純集計（補正前）」と「補正後」を出し、その差を原因ごとに分解する（ブリッジ）。
"""
from __future__ import annotations

import csv
import datetime as dt
import io
import json
import os
import random
import re
import sys
import unicodedata
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from fractions import Fraction

PERIOD_START = dt.date(2026, 9, 1)
PERIOD_END = dt.date(2026, 10, 31)
MONTHS = ["2026-09", "2026-10"]
JST = dt.timezone(dt.timedelta(hours=9))
TAX_RATE = {"食品": Fraction(8, 100), "雑貨": Fraction(10, 100)}  # 軽減税率8% / 標準税率10%
STORE_ALIAS = {"エキマエ店": "駅前店"}  # NFKC 後の別名 → 正式名
CLOSURE_DAYS = {dt.date(2026, 10, 5), dt.date(2026, 10, 6)}  # 駅前店 改装休業（佐々木さんメール）

# 問題の種類（コード → 日本語名）。並び順はブリッジの表示順。
ISSUE_LABEL = {
    "TEST": "テストデータの混入",
    "OUT_OF_PERIOD": "対象期間外（8月・11月）の混入",
    "UTC_SHIFT": "ECの注文時刻がUTC（日本時間に直すと月がずれる）",
    "WS_CANCELLED": "卸：取消伝票を売上に計上",
    "WS_SUPERSEDED": "卸：訂正前の伝票を訂正後と二重計上",
    "DUPLICATE": "POS：同一明細の二重登録",
    "QTY_TYPO": "POS：数量の打ち間違い（12個→120個）",
    "INVALID_DATE": "存在しない日付（9月31日）",
    "STORE_VARIANT": "店舗名の表記ゆれ",
    "CODE_FORMAT": "商品コードの桁ゆれ（先頭0なし）",
    "WS_CORRECTION": "卸：訂正伝票（こちらを正とする）",
    "RETURN": "返品（マイナス行）",
}


# ---------------------------------------------------------------- 読み込み
def read_xlsx_rows(path: str) -> list[tuple[int, list[str]]]:
    """xlsx の1枚目のシートを (Excel行番号, セル値リスト) で返す。"""
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    tag_t = f"{{{ns['m']}}}t"

    class _SafeZip(zipfile.ZipFile):
        def read(self, name, pwd=None):  # DTD/実体宣言を含む XML は読まない（XXE・実体展開攻撃の予防）
            data = super().read(name, pwd)
            if name.endswith(".xml") and (b"<!DOCTYPE" in data or b"<!ENTITY" in data):
                raise ValueError(f"{name} に DTD/ENTITY 宣言があるため読み込みを中止")
            return data

    with _SafeZip(path) as z:
        shared: list[str] = []
        if "xl/sharedStrings.xml" in z.namelist():
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            shared = ["".join(t.text or "" for t in si.iter(tag_t)) for si in root.findall("m:si", ns)]
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        sheets = wb.find("m:sheets", ns).findall("m:sheet", ns)
        assert len(sheets) == 1, f"シートが {len(sheets)} 枚ある（想定は1枚）"
        assert sheets[0].get("state", "visible") == "visible", "非表示シートがある"
        root = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
        out = []
        for row in root.find("m:sheetData", ns).findall("m:row", ns):
            assert row.get("hidden") is None, f"非表示行 {row.get('r')} がある"
            vals = []
            for c in row.findall("m:c", ns):
                t = c.get("t", "n")
                if t == "inlineStr":
                    vals.append("".join(x.text or "" for x in c.iter(tag_t)))
                elif t == "s":
                    vals.append(shared[int(c.find("m:v", ns).text)])
                else:
                    v = c.find("m:v", ns)
                    vals.append(v.text if v is not None else "")
            out.append((int(row.get("r")), vals))
        return out


def parse_int(s: str) -> int:
    f = float(s)
    assert f == int(f), s
    return int(f)


def safe_date(y: int, m: int, d: int) -> dt.date | None:
    try:
        return dt.date(y, m, d)
    except ValueError:
        return None


def norm_code(code: str) -> str:
    return f"{int(code):05d}"


def load_pos(path: str) -> list[dict]:
    text = open(path, "rb").read().decode("cp932")  # Shift_JIS(CP932)。①などの機種依存文字を含む
    rows = list(csv.reader(io.StringIO(text)))
    assert rows[0] == ["日付", "店舗", "商品コード", "商品名", "カテゴリ", "数量", "金額"], rows[0]
    recs = []
    for i, r in enumerate(rows[1:], start=2):
        raw_date, raw_store, code, name, cat, qty, amt = r
        m = re.fullmatch(r"(\d{4})[/-](\d{1,2})[/-](\d{1,2})", raw_date)
        assert m, raw_date
        y, mo, d = map(int, m.groups())
        store_n = unicodedata.normalize("NFKC", raw_store).strip()
        store_n = STORE_ALIAS.get(store_n, store_n)
        recs.append(dict(
            source="POS", src_row=i, rec_id=f"POS-{i:03d}行", raw_line=",".join(r),
            raw_date=raw_date, date=safe_date(y, mo, d), naive_month=f"{y:04d}-{mo:02d}",
            store_raw=raw_store, store=store_n, customer="",
            code_raw=code, code=norm_code(code), name=name, category=cat,
            qty=parse_int(qty), amount=parse_int(amt), status="", tax_basis="税込",
        ))
    return recs


def load_ec(path: str) -> list[dict]:
    rows = read_xlsx_rows(path)
    assert rows[0][1] == ["注文ID", "注文時刻(UTC)", "顧客名", "商品コード", "商品名", "カテゴリ", "数量", "金額"], rows[0]
    recs = []
    for excel_row, v in rows[1:]:
        oid, ts, cust, code, name, cat, qty, amt = v
        m = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z", ts)
        assert m, ts
        y, mo, d, hh, mi, ss = map(int, m.groups())
        utc_date = safe_date(y, mo, d)
        jst_dt = None
        if utc_date:
            jst_dt = dt.datetime(y, mo, d, hh, mi, ss, tzinfo=dt.timezone.utc).astimezone(JST)
        recs.append(dict(
            source="EC", src_row=excel_row, rec_id=oid, raw_line="|".join(v),
            raw_date=ts, date=jst_dt.date() if jst_dt else None, naive_month=f"{y:04d}-{mo:02d}",
            jst_time=jst_dt.strftime("%Y-%m-%d %H:%M") if jst_dt else "",
            store_raw="EC", store="EC", customer=cust,
            code_raw=code, code=norm_code(code), name=name, category=cat,
            qty=parse_int(qty), amount=parse_int(amt), status="", tax_basis="税込",
        ))
    return recs


def load_wholesale(path: str) -> list[dict]:
    text = open(path, "rb").read().decode("utf-8-sig")
    rows = list(csv.reader(io.StringIO(text)))
    assert rows[0] == ["伝票番号", "日付", "取引先", "商品コード", "商品名", "カテゴリ", "数量", "金額", "状態"], rows[0]
    recs = []
    for i, r in enumerate(rows[1:], start=2):
        vno, raw_date, cust, code, name, cat, qty, amt, status = r
        m = re.fullmatch(r"令和(\d+)年(\d{1,2})月(\d{1,2})日", raw_date)
        assert m, raw_date
        ry, mo, d = map(int, m.groups())
        y = 2018 + ry  # 令和元年 = 2019年
        recs.append(dict(
            source="卸", src_row=i, rec_id=f"{vno}({status})", voucher=vno, raw_line=",".join(r),
            raw_date=raw_date, date=safe_date(y, mo, d), naive_month=f"{y:04d}-{mo:02d}",
            store_raw="卸売", store="卸売", customer=cust,
            code_raw=code, code=norm_code(code), name=name, category=cat,
            qty=parse_int(qty), amount=parse_int(amt), status=status, tax_basis="税抜",
        ))
    return recs


# ---------------------------------------------------------------- 判定
def classify(recs: list[dict]) -> None:
    """各レコードに issues（問題の種類）, include（集計に入れるか）, 補正後の数量・金額・計上月を付ける。"""
    for r in recs:
        r["issues"] = []
        r["include"] = True
        r["note"] = ""
        r["qty_fixed"] = r["qty"]
        r["amount_fixed"] = r["amount"]

    for r in recs:
        # 表記ゆれ（集計値には影響しないが、店舗別・商品別の集計を狂わせる）
        if r["source"] == "POS" and r["store_raw"] != r["store"]:
            r["issues"].append("STORE_VARIANT")
            r["note"] += f"店舗名『{r['store_raw']}』→『{r['store']}』に統一。"
        if r["code_raw"] != r["code"]:
            r["issues"].append("CODE_FORMAT")
        if r["qty"] < 0:
            r["issues"].append("RETURN")
            r["note"] += "返品のマイナス計上。発生月の売上から控除する（そのまま合算）。"

        # テスト
        if r["code"] == "99999" or r["name"] == "テスト" or r["customer"] == "テスト":
            r["issues"].append("TEST")
            r["include"] = False
            r["note"] += "テスト用レコード（金額1円）。売上ではないので除外。"
            continue
        # 存在しない日付
        if r["date"] is None:
            r["issues"].append("INVALID_DATE")
            r["include"] = False
            r["note"] += f"日付『{r['raw_date']}』は暦に存在しない。計上月を確定できないため保留（9月計上が有力）。"
            continue
        # EC：UTC→JST で月が変わる
        if r["source"] == "EC" and r["date"].strftime("%Y-%m") != r["naive_month"]:
            r["issues"].append("UTC_SHIFT")
            r["note"] += f"UTC {r['raw_date']} = 日本時間 {r['jst_time']}。"
        # 期間外
        if not (PERIOD_START <= r["date"] <= PERIOD_END):
            r["issues"].append("OUT_OF_PERIOD")
            r["include"] = False
            r["note"] += f"日本時間の日付 {r['date']} は対象期間（9/1〜10/31）外なので除外。"
            continue

    # 卸：伝票番号ごとに最終状態を決める
    by_voucher = defaultdict(list)
    for r in recs:
        if r["source"] == "卸":
            by_voucher[r["voucher"]].append(r)
    for vno, rs in by_voucher.items():
        statuses = {r["status"] for r in rs}
        assert statuses <= {"通常", "訂正", "取消"}, statuses
        if "取消" in statuses:
            for r in rs:
                r["issues"].append("WS_CANCELLED")
                r["include"] = False
                r["note"] += f"{vno} は取消済み（通常行と取消行が両方あり、どちらも正の金額）。売上ゼロとして両行を除外。"
        elif "訂正" in statuses:
            corr = [r for r in rs if r["status"] == "訂正"]
            assert len(corr) == 1
            for r in rs:
                if r["status"] == "訂正":
                    r["issues"].append("WS_CORRECTION")
                    r["note"] += f"{vno} の訂正後の値。これを正とする（ファイル内の行順に関係なく）。"
                else:
                    r["issues"].append("WS_SUPERSEDED")
                    r["include"] = False
                    r["note"] += f"{vno} の訂正前の値（数量{r['qty']}・{r['amount']:,}円）。訂正行と二重計上になるので除外。"

    # POS：同一明細の二重登録（正規化後のキーが完全一致する2行目以降を除外）
    seen = {}
    for r in recs:
        if r["source"] != "POS" or not r["include"]:
            continue
        key = (r["date"], r["store"], r["code"], r["qty"], r["amount"])
        if key in seen:
            first = seen[key]
            r["issues"].append("DUPLICATE")
            r["include"] = False
            same_text = "原本の行テキストも日付の書式まで完全一致" if first["raw_line"] == r["raw_line"] else "正規化後に一致"
            r["note"] += f"{first['rec_id']} と同一明細（{same_text}）。二重登録とみなし2行目を除外。"
            r["dup_of"] = first["rec_id"]
        else:
            seen[key] = r

    # POS：10/14 郊外店 ハンドタオル 120個（店長申告：本来12個）
    for r in recs:
        if (r["source"] == "POS" and r["include"] and r["date"] == dt.date(2026, 10, 14)
                and r["store"] == "郊外店" and r["code"] == "00123" and r["qty"] == 120):
            unit = r["amount"] // r["qty"]
            r["issues"].append("QTY_TYPO")
            r["qty_fixed"] = 12
            r["amount_fixed"] = 12 * unit
            r["note"] += f"数量120・{r['amount']:,}円 → 12・{12 * unit:,}円に補正（郊外店店長の申告と外れ値分析で裏づけ）。"

    # 税抜・税込の両方を持たせる（POS/EC は税込記録、卸は税抜記録）
    for r in recs:
        rate = TAX_RATE[r["category"]]
        for k_src, k_ex, k_in in (("amount", "amount_ex", "amount_in"), ("amount_fixed", "fixed_ex", "fixed_in")):
            a = Fraction(r[k_src])
            if r["tax_basis"] == "税込":
                r[k_in], r[k_ex] = a, a / (1 + rate)
            else:
                r[k_ex], r[k_in] = a, a * (1 + rate)
        r["month"] = r["date"].strftime("%Y-%m") if r["date"] else ""


# ---------------------------------------------------------------- 集計
def money(x) -> int:
    x = Fraction(x)
    assert x.denominator == 1, f"端数あり: {x}"
    return int(x)


def money_disp(x):
    """レコード単位の表示用。端数が出るのは除外済みのテスト行（1円）だけなので小数2桁で表示する。"""
    x = Fraction(x)
    return int(x) if x.denominator == 1 else round(float(x), 2)


def channel_of(r: dict) -> str:
    return {"POS": "店頭(POS)", "EC": "EC", "卸": "卸売"}[r["source"]]


def summarize(recs: list[dict]) -> dict:
    res = {}
    # 1) 単純集計（補正前）: 原本の年月文字列で月を決め、全行をそのまま合算
    naive = defaultdict(int)
    naive_all = defaultdict(int)
    for r in recs:
        naive_all[r["source"]] += r["amount"]
        if r["naive_month"] in MONTHS:
            naive[(r["naive_month"], r["source"])] += r["amount"]
    res["naive"] = {f"{m}|{s}": v for (m, s), v in sorted(naive.items())}
    res["naive_all_rows"] = dict(naive_all)

    # 2) 補正後（記録金額ベース / 税抜 / 税込）
    fixed = defaultdict(lambda: defaultdict(Fraction))
    for r in recs:
        if r["include"]:
            key = (r["month"], r["source"])
            fixed["recorded"][key] += r["amount_fixed"]
            fixed["ex"][key] += r["fixed_ex"]
            fixed["in"][key] += r["fixed_in"]
    res["fixed"] = {basis: {f"{m}|{s}": money(v) for (m, s), v in sorted(d.items())} for basis, d in fixed.items()}

    # 3) ブリッジ（原因ごとの増減）: 単純集計 → 補正後（記録金額ベース）→ 税抜統一
    bridge = defaultdict(lambda: defaultdict(int))
    for r in recs:
        nm = r["naive_month"] if r["naive_month"] in MONTHS else None
        fm = r["month"] if (r["include"] and r["month"] in MONTHS) else None
        # どの原因で動いたかを1つに決める（優先順位つき）
        if not r["include"]:
            cause = next(c for c in ("TEST", "INVALID_DATE", "OUT_OF_PERIOD", "WS_CANCELLED",
                                     "WS_SUPERSEDED", "DUPLICATE") if c in r["issues"])
            if cause == "OUT_OF_PERIOD" and "UTC_SHIFT" in r["issues"]:
                cause = "UTC_SHIFT"
            if nm:
                bridge[cause][nm] -= r["amount"]
            continue
        if "UTC_SHIFT" in r["issues"] and nm != fm:
            if nm:
                bridge["UTC_SHIFT"][nm] -= r["amount"]
            if fm:
                bridge["UTC_SHIFT"][fm] += r["amount"]
        if "QTY_TYPO" in r["issues"]:
            bridge["QTY_TYPO"][fm] += r["amount_fixed"] - r["amount"]
    res["bridge"] = {c: dict(v) for c, v in bridge.items()}
    tax = {m: -(res["fixed"]["recorded"].get(f"{m}|POS", 0) + res["fixed"]["recorded"].get(f"{m}|EC", 0)
                - res["fixed"]["ex"].get(f"{m}|POS", 0) - res["fixed"]["ex"].get(f"{m}|EC", 0)) for m in MONTHS}
    res["bridge_tax"] = tax

    # 検算: 単純集計 + ブリッジ = 補正後
    for m in MONTHS:
        n = sum(v for k, v in res["naive"].items() if k.startswith(m))
        b = sum(v.get(m, 0) for v in res["bridge"].values())
        f = sum(v for k, v in res["fixed"]["recorded"].items() if k.startswith(m))
        assert n + b == f, (m, n, b, f)
        fx = sum(v for k, v in res["fixed"]["ex"].items() if k.startswith(m))
        assert f + tax[m] == fx, (m, f, tax[m], fx)
    return res


def store_table(recs: list[dict]) -> dict:
    """店頭（POS）の店舗別・月別。補正前（原本の店舗名そのまま）と補正後。"""
    raw = defaultdict(int)
    fixed = defaultdict(Fraction)
    fixed_by_raw_name = defaultdict(Fraction)
    fixed_ex = defaultdict(Fraction)
    days = defaultdict(set)
    for r in recs:
        if r["source"] != "POS":
            continue
        if r["naive_month"] in MONTHS:
            raw[(r["naive_month"], r["store_raw"])] += r["amount"]
        if r["include"]:
            fixed_by_raw_name[(r["month"], r["store_raw"])] += r["amount_fixed"]
            fixed[(r["month"], r["store"])] += r["amount_fixed"]
            fixed_ex[(r["month"], r["store"])] += r["fixed_ex"]
            days[(r["month"], r["store"])].add(r["date"])
    return dict(
        raw={f"{m}|{s}": v for (m, s), v in sorted(raw.items())},
        fixed_by_raw_name={f"{m}|{s}": money(v) for (m, s), v in sorted(fixed_by_raw_name.items())},
        fixed={f"{m}|{s}": money(v) for (m, s), v in sorted(fixed.items())},
        fixed_ex={f"{m}|{s}": money(v) for (m, s), v in sorted(fixed_ex.items())},
        sales_days={f"{m}|{s}": len(v) for (m, s), v in sorted(days.items())},
    )


def duplicate_permutation_test(recs: list[dict], n_iter: int = 20000, seed: int = 20261120) -> dict:
    """POS の同一明細が「偶然の別取引」で何件くらい生じるかを並べ替え検定で見積もる。
    帰無仮説: 各行は独立な取引。店舗×月の中で日付だけをシャッフルし、(日付,店舗,商品,数量) の一致組数を数える。"""
    rows = [r for r in recs if r["source"] == "POS" and r["date"] and PERIOD_START <= r["date"] <= PERIOD_END
            and "TEST" not in r["issues"]]

    def count(dates):
        c = Counter((d, r["store"], r["code"], r["qty"]) for d, r in zip(dates, rows))
        return sum(v * (v - 1) // 2 for v in c.values())

    observed = count([r["date"] for r in rows])
    groups = defaultdict(list)
    for idx, r in enumerate(rows):
        groups[(r["store"], r["date"].month)].append(idx)
    rng = random.Random(seed)
    dates = [r["date"] for r in rows]
    ge = 0
    total = 0
    for _ in range(n_iter):
        perm = dates[:]
        for idxs in groups.values():
            ds = [dates[i] for i in idxs]
            rng.shuffle(ds)
            for i, d in zip(idxs, ds):
                perm[i] = d
        c = count(perm)
        total += c
        ge += c >= observed
    return dict(observed_pairs=observed, expected_pairs_by_chance=round(total / n_iter, 3),
                p_value_ge_observed=round(ge / n_iter, 5), n_iter=n_iter, seed=seed)


# ---------------------------------------------------------------- 出力
def write_csv(path: str, header: list[str], rows: list[list]) -> None:
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def main(data_dir: str, out_dir: str) -> None:
    os.makedirs(out_dir, exist_ok=True)
    pos = load_pos(os.path.join(data_dir, "pos.csv"))
    ec = load_ec(os.path.join(data_dir, "ec_orders.xlsx"))
    ws = load_wholesale(os.path.join(data_dir, "wholesale.csv"))
    recs = pos + ec + ws
    classify(recs)

    # 価格の検証：記録単価 = 本体価格 ×（1+税率）（POS/EC）、= 本体価格（卸）になっているか
    base_price = {}
    for r in ws:
        if r["qty"] > 0 and "TEST" not in r["issues"]:
            base_price.setdefault(r["code"], set()).add(Fraction(r["amount"], r["qty"]))
    price_issues = []
    for r in recs:
        if "TEST" in r["issues"] or r["qty"] == 0:
            continue
        unit = Fraction(r["amount"], r["qty"])
        bp = base_price.get(r["code"])
        assert bp and len(bp) == 1, (r["code"], bp)
        (bp,) = bp
        expect = bp * (1 + TAX_RATE[r["category"]]) if r["tax_basis"] == "税込" else bp
        if unit != expect:
            price_issues.append((r["rec_id"], r["code"], unit, expect))
    assert not price_issues, price_issues

    summ = summarize(recs)
    stores = store_table(recs)
    perm = duplicate_permutation_test(recs)

    # 数量の外れ値（POS）
    pos_qty = sorted((r["qty"] for r in pos if r["qty"] > 0 and "TEST" not in r["issues"]), reverse=True)

    # 日付書式ごとの件数・金額（POS）
    fmt = defaultdict(lambda: [0, 0])
    for r in pos:
        if r["naive_month"] in MONTHS:
            k = ("YYYY/MM/DD" if "/" in r["raw_date"] else "YYYY-M-D", r["naive_month"])
            fmt[k][0] += 1
            fmt[k][1] += r["amount"]

    # 駅前店の休業日の記録有無
    closure_rows = [r["rec_id"] for r in pos if r["store"] == "駅前店" and r["date"] in CLOSURE_DAYS]

    # ---- CSV: 全レコード（統一形式）
    cols = ["データ", "原本の行", "レコードID", "原本の日付", "計上日(日本時間)", "計上月", "店舗/チャネル(統一後)", "原本の店舗名",
            "顧客/取引先", "商品コード(5桁)", "商品名", "カテゴリ", "状態", "数量(原本)", "金額(原本)", "金額の税区分",
            "数量(補正後)", "金額(補正後・記録ベース)", "金額(補正後・税抜)", "金額(補正後・税込)", "集計に含める", "検出した問題", "判断メモ"]
    out_rows = []
    for r in recs:
        out_rows.append([
            r["source"], r["src_row"], r["rec_id"], r["raw_date"], r["date"] or "", r["month"], r["store"], r["store_raw"],
            r["customer"], r["code"], r["name"], r["category"], r["status"], r["qty"], r["amount"], r["tax_basis"],
            r["qty_fixed"], r["amount_fixed"], money_disp(r["fixed_ex"]), money_disp(r["fixed_in"]),
            "含める" if r["include"] else "除外", " / ".join(ISSUE_LABEL[i] for i in r["issues"]), r["note"],
        ])
    write_csv(os.path.join(out_dir, "records_all_flagged.csv"), cols, out_rows)

    # ---- CSV: 問題のあるレコードだけ（集計値に影響するもの）
    impact_codes = {"TEST", "OUT_OF_PERIOD", "UTC_SHIFT", "WS_CANCELLED", "WS_SUPERSEDED", "WS_CORRECTION",
                    "DUPLICATE", "QTY_TYPO", "INVALID_DATE", "RETURN", "STORE_VARIANT"}
    an_rows = []
    for r in recs:
        hit = [i for i in r["issues"] if i in impact_codes]
        if not hit:
            continue
        impact = {}
        for m in MONTHS:
            before = r["amount"] if r["naive_month"] == m else 0
            after = r["amount_fixed"] if (r["include"] and r["month"] == m) else 0
            impact[m] = after - before
        an_rows.append([
            " / ".join(ISSUE_LABEL[i] for i in hit), r["source"], r["src_row"], r["rec_id"], r["raw_date"],
            r["store_raw"] if r["source"] == "POS" else r["customer"], r["code"], r["name"], r["qty"], r["amount"],
            r["naive_month"], r["month"] if r["include"] else "（除外）", "含める" if r["include"] else "除外",
            r["qty_fixed"] if r["include"] else 0, r["amount_fixed"] if r["include"] else 0,
            impact["2026-09"], impact["2026-10"], r["note"],
        ])
    order = {v: i for i, v in enumerate(ISSUE_LABEL.values())}
    an_rows.sort(key=lambda x: (order.get(x[0].split(" / ")[0], 99), x[1], x[2]))
    write_csv(os.path.join(out_dir, "anomalies.csv"),
              ["問題の種類", "データ", "原本の行", "レコードID", "原本の日付", "店舗/顧客/取引先", "商品コード", "商品名",
               "数量(原本)", "金額(原本)", "単純集計での月", "補正後の計上月", "扱い", "数量(補正後)", "金額(補正後)",
               "9月への影響額(補正後-単純集計)", "10月への影響額(補正後-単純集計)", "判断メモ"],
              an_rows)

    # ---- CSV: 月別・チャネル別（補正前／補正後）
    ms_rows = []
    for m in MONTHS:
        for s in ("POS", "EC", "卸"):
            k = f"{m}|{s}"
            ms_rows.append([m, {"POS": "店頭(POS)", "EC": "EC", "卸": "卸売"}[s],
                            summ["naive"].get(k, 0), summ["fixed"]["recorded"].get(k, 0),
                            summ["fixed"]["ex"].get(k, 0), summ["fixed"]["in"].get(k, 0)])
    write_csv(os.path.join(out_dir, "monthly_by_channel.csv"),
              ["月", "チャネル", "単純集計(補正前・記録金額)", "補正後(記録金額: 店頭/EC=税込, 卸=税抜)", "補正後(税抜に統一)", "補正後(税込に統一)"],
              ms_rows)

    # ---- CSV: 店舗別（POS）
    st_rows = []
    store_names = sorted({k.split("|")[1] for k in stores["fixed"]}, key=["本店", "駅前店", "郊外店", "空港店"].index)
    for s in store_names:
        st_rows.append([s, stores["fixed"].get(f"2026-09|{s}", 0), stores["fixed"].get(f"2026-10|{s}", 0),
                        stores["fixed_ex"].get(f"2026-09|{s}", 0), stores["fixed_ex"].get(f"2026-10|{s}", 0),
                        stores["sales_days"].get(f"2026-09|{s}", 0), stores["sales_days"].get(f"2026-10|{s}", 0)])
    write_csv(os.path.join(out_dir, "pos_by_store.csv"),
              ["店舗", "9月(税込)", "10月(税込)", "9月(税抜)", "10月(税抜)", "9月 売上記録のある日数", "10月 売上記録のある日数"], st_rows)
    raw_rows = [[k.split("|")[0], k.split("|")[1], v] for k, v in stores["raw"].items()]
    write_csv(os.path.join(out_dir, "pos_by_store_raw_names.csv"), ["月", "原本の店舗名(そのまま)", "単純集計(税込)"], raw_rows)

    # ---- CSV: ブリッジ
    br_rows = []
    for m in MONTHS:
        n = sum(v for k, v in summ["naive"].items() if k.startswith(m))
        br_rows.append([m, "単純集計（補正前・記録金額をそのまま合算）", n])
        for c in ISSUE_LABEL:
            if c in summ["bridge"] and summ["bridge"][c].get(m, 0):
                br_rows.append([m, ISSUE_LABEL[c], summ["bridge"][c][m]])
        f = sum(v for k, v in summ["fixed"]["recorded"].items() if k.startswith(m))
        br_rows.append([m, "補正後（記録金額ベース：店頭/EC=税込、卸=税抜）", f])
        br_rows.append([m, "税区分の統一（店頭/EC の消費税分を除く）", summ["bridge_tax"][m]])
        br_rows.append([m, "補正後（税抜に統一）＝正しい売上高", f + summ["bridge_tax"][m]])
    write_csv(os.path.join(out_dir, "bridge.csv"), ["月", "項目", "金額(円)"], br_rows)

    # ---- JSON: 報告書用の数値
    detail = defaultdict(list)
    for r in recs:
        for i in r["issues"]:
            detail[i].append(dict(id=r["rec_id"], src=r["source"], row=r["src_row"], raw_date=r["raw_date"],
                                  store=r["store_raw"], customer=r["customer"], code=r["code"], name=r["name"],
                                  qty=r["qty"], amount=r["amount"], naive_month=r["naive_month"], month=r["month"],
                                  include=r["include"], qty_fixed=r["qty_fixed"], amount_fixed=r["amount_fixed"],
                                  ex=str(r["fixed_ex"]), status=r["status"], jst=r.get("jst_time", ""),
                                  dup_of=r.get("dup_of", "")))
    ec_hours_utc = Counter(int(r["raw_date"][11:13]) for r in ec)
    ec_hours_jst = Counter((int(r["raw_date"][11:13]) + 9) % 24 for r in ec)
    out = dict(
        ec_hours_utc=dict(sorted(ec_hours_utc.items())), ec_hours_jst=dict(sorted(ec_hours_jst.items())),
        row_counts={"POS": len(pos), "EC": len(ec), "卸": len(ws)},
        summary=summ, stores=stores, dup_test=perm, pos_qty_top10=pos_qty[:10],
        pos_date_formats={f"{k[0]}|{k[1]}": v for k, v in sorted(fmt.items())},
        closure_rows_ekimae=closure_rows, issues=detail,
    )
    with open(os.path.join(out_dir, "summary.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1, default=str)

    # ---- 画面表示
    print("rows:", out["row_counts"])
    for m in MONTHS:
        print(f"\n== {m}")
        for s in ("POS", "EC", "卸"):
            k = f"{m}|{s}"
            print(f"  {s:3s} naive={summ['naive'].get(k, 0):>10,} recorded={summ['fixed']['recorded'].get(k, 0):>10,}"
                  f" ex={summ['fixed']['ex'].get(k, 0):>10,} in={summ['fixed']['in'].get(k, 0):>10,}")
    print("\nbridge:")
    for row in br_rows:
        print(f"  {row[0]} {row[1]:<40s} {row[2]:>12,}")
    print("\nstores fixed (税込):", stores["fixed"])
    print("stores raw names:", stores["raw"])
    print("sales days:", stores["sales_days"])
    print("dup test:", perm)
    print("POS qty top10:", pos_qty[:10])
    print("POS date formats:", dict(out["pos_date_formats"]))
    print("駅前店 休業日の記録:", closure_rows)
    print("naive all rows by file:", summ["naive_all_rows"])


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
