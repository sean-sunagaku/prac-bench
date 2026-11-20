"""audit.py とは別の書き方で、補正後の月別合計を独立に計算し直す検算用スクリプト。
使い方: python3 -I analysis/crosscheck.py <データのあるフォルダ>"""
import csv, io, sys, os, re, zipfile, datetime as dt
from collections import defaultdict
import xml.etree.ElementTree as ET

d = sys.argv[1]
tot = defaultdict(int)     # (月, チャネル) -> 記録金額
tot_ex = defaultdict(int)  # (月, チャネル) -> 税抜(×1000 で整数のまま持つ)
def add(month, ch, amount, cat, basis):
    tot[(month, ch)] += amount
    num = amount * 1000
    if basis == "in":
        num = num * 100 // (108 if cat == "食品" else 110)
    tot_ex[(month, ch)] += num

# POS
seen = set()
for line in open(os.path.join(d, "pos.csv"), "rb").read().decode("cp932").splitlines()[1:]:
    date, store, code, name, cat, qty, amt = line.split(",")
    y, m, dd = map(int, re.split(r"[/-]", date))
    try:
        day = dt.date(y, m, dd)
    except ValueError:
        continue                      # 9/31 は保留
    if code == "99999" or not (dt.date(2026, 9, 1) <= day <= dt.date(2026, 10, 31)):
        continue
    key = (day, store.strip().replace("ｴｷﾏｴ店", "駅前店"), int(code), int(qty), int(amt))
    if key in seen:
        continue                      # 同一明細の2行目
    seen.add(key)
    amount = int(amt)
    if day == dt.date(2026, 10, 14) and int(code) == 123 and int(qty) == 120:
        amount = 12 * 660
    add(day.strftime("%Y-%m"), "POS", amount, cat, "in")

# EC（共有文字列なし・インライン文字列のシート）
z = zipfile.ZipFile(os.path.join(d, "ec_orders.xlsx"))
ns = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
rows = []
for row in ET.fromstring(z.read("xl/worksheets/sheet1.xml")).iter(ns + "row"):
    vals = []
    for c in row.iter(ns + "c"):
        t = c.find(ns + "is")
        vals.append("".join(x.text for x in t.iter(ns + "t")) if t is not None else c.find(ns + "v").text)
    rows.append(vals)
for oid, ts, cust, code, name, cat, qty, amt in rows[1:]:
    if cust == "テスト":
        continue
    try:
        utc = dt.datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=dt.timezone.utc)
    except ValueError:
        continue                      # 9/31 は保留
    jst = utc.astimezone(dt.timezone(dt.timedelta(hours=9))).date()
    if dt.date(2026, 9, 1) <= jst <= dt.date(2026, 10, 31):
        add(jst.strftime("%Y-%m"), "EC", int(float(amt)), cat, "in")

# 卸
vouchers = defaultdict(dict)
for r in csv.DictReader(io.StringIO(open(os.path.join(d, "wholesale.csv"), encoding="utf-8-sig").read())):
    vouchers[r["伝票番号"]][r["状態"]] = r
for vno, by_status in vouchers.items():
    if "取消" in by_status:
        continue
    r = by_status.get("訂正") or by_status["通常"]
    if r["取引先"] == "テスト":
        continue
    ry, m, dd = map(int, re.findall(r"\d+", r["日付"]))
    try:
        day = dt.date(2018 + ry, m, dd)
    except ValueError:
        continue
    if dt.date(2026, 9, 1) <= day <= dt.date(2026, 10, 31):
        add(day.strftime("%Y-%m"), "卸", int(r["金額"]), r["カテゴリ"], "ex")

for m in ("2026-09", "2026-10"):
    rec = sum(v for (mm, _), v in tot.items() if mm == m)
    ex = sum(v for (mm, _), v in tot_ex.items() if mm == m)
    print(m, {ch: tot[(m, ch)] for ch in ("POS", "EC", "卸")}, "記録金額計", rec, "税抜計", ex / 1000)
