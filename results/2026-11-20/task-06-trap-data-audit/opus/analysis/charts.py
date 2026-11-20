"""報告書用の図（SVG）を output/summary.json から作る。標準ライブラリのみ。

使い方: python3 -I analysis/charts.py <summary.json> <出力フォルダ>
配色は dataviz スキルの既定パレット（カテゴリ1〜3）を使い、validate_palette.js で明暗とも検証済み。
"""
import json
import os
import sys
from html import escape

FONT = 'system-ui, -apple-system, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", sans-serif'
STYLE = """
<style>
  .viz text { font-family: %s; }
  .bg { fill: #fcfcfb; }
  .t1 { fill: #0b0b0b; font-size: 16px; font-weight: 600; }
  .t2 { fill: #52514e; font-size: 12.5px; }
  .lab { fill: #0b0b0b; font-size: 13px; }
  .sub { fill: #898781; font-size: 11px; }
  .val { fill: #0b0b0b; font-size: 12.5px; font-variant-numeric: tabular-nums; }
  .in  { fill: #ffffff; font-size: 11.5px; font-variant-numeric: tabular-nums; }
  .note { fill: #52514e; font-size: 11.5px; }
  .base { stroke: #c3c2b7; stroke-width: 1; }
  .grid { stroke: #e1e0d9; stroke-width: 1; }
  .s1 { fill: #2a78d6; } .s2 { fill: #eb6834; } .s3 { fill: #1baf7a; } .gray { fill: #b9b7ae; }
  .hit:hover { opacity: .85; }
  @media (prefers-color-scheme: dark) {
    .bg { fill: #1a1a19; }
    .t1, .lab, .val { fill: #f0efec; }
    .t2, .note { fill: #c3c2b7; }
    .base { stroke: #383835; } .grid { stroke: #2c2c2a; }
    .s1 { fill: #3987e5; } .s2 { fill: #d95926; } .s3 { fill: #199e70; } .gray { fill: #5d5c57; }
  }
</style>
""" % FONT


def text_width(s: str, px: float) -> float:
    """おおよその描画幅（全角=1em、半角=0.58em）。ラベルが収まるかの判定用。"""
    return sum(px if ord(ch) > 0x2E80 else px * 0.58 for ch in s)


def hbar(x: float, y: float, w: float, h: float, round_end: bool, r: float = 4) -> str:
    """左端（基線側）は角、右端（データ側）だけ角丸の横棒。"""
    if w <= 0:
        return ""
    if not round_end:
        return f"M{x:.1f},{y:.1f} h{w:.1f} v{h:.1f} h{-w:.1f} Z"
    r = min(r, w, h / 2)
    return (f"M{x:.1f},{y:.1f} h{w - r:.1f} a{r},{r} 0 0 1 {r},{r} v{h - 2 * r:.1f} "
            f"a{r},{r} 0 0 1 {-r},{r} h{-(w - r):.1f} Z")


def pct_txt(v: float) -> str:
    """符号つき百分率。マイナスは全角幅のマイナス記号（U+2212）で表示する。"""
    return f"{v:+.1f}%".replace("-", "\u2212")


def yen(v: int) -> str:
    return f"{v:,}円"


def fig_gap(s: dict) -> str:
    b = s["summary"]["bridge"]
    two = lambda c: -sum(b.get(c, {}).values())
    naive = sum(s["summary"]["naive"].values())
    fixed = sum(s["summary"]["fixed"]["recorded"].values())
    fixed_ex = sum(s["summary"]["fixed"]["ex"].values())
    tax = -sum(s["summary"]["bridge_tax"].values())
    rows = [
        ("卸：訂正前と訂正後の伝票を二重計上", "W-2041・W-2042・W-2043", two("WS_SUPERSEDED"), "s1"),
        ("卸：取消済みの伝票を計上", "W-2044・W-2045（通常行と取消行の両方）", two("WS_CANCELLED"), "s1"),
        ("POS：数量の打ち間違い", "郊外店 10/14 ハンドタオル 12個→120個", two("QTY_TYPO"), "s1"),
        ("存在しない日付（9月31日）", "POS・EC・卸の各1件。計上を保留", two("INVALID_DATE"), "s1"),
        ("POS：同じ明細の二重登録", "9/1〜9/9 の4件", two("DUPLICATE"), "s1"),
        ("EC：UTCのまま月を判定", "日本時間で11/1になる2件が10月に混入", two("UTC_SHIFT"), "s1"),
        ("テストデータ", "金額1円 × 4件", two("TEST"), "s1"),
    ]
    assert sum(r[2] for r in rows) == naive - fixed
    W, left, bar_x, bar_w_max, row_h, bh = 820, 24, 330, 360, 46, 16
    top = 96
    vmax = max(r[2] for r in rows)
    H = top + row_h * (len(rows) + 1) + 70
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" class="viz" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" '
           f'aria-label="単純集計と補正後の差の内訳">{STYLE}<rect class="bg" width="{W}" height="{H}"/>']
    out.append(f'<text class="t1" x="{left}" y="32">単純集計が正しい値より多くなった理由（9〜10月の2か月計）</text>')
    out.append(f'<text class="t2" x="{left}" y="54">単純集計 {yen(naive)} − 誤り {yen(naive - fixed)} = 補正後 {yen(fixed)}'
               f'（記録金額ベース）</text>')
    out.append(f'<text class="t2" x="{left}" y="73">さらに税抜にそろえると {yen(fixed_ex)}（下の灰色の棒）</text>')
    out.append(f'<line class="base" x1="{bar_x}" x2="{bar_x}" y1="{top - 6}" y2="{top + row_h * len(rows) - 10}"/>')
    for i, (lab, sub, v, cls) in enumerate(rows):
        y = top + i * row_h
        w = bar_w_max * v / vmax
        out.append(f'<g class="hit"><title>{escape(lab)}：{yen(v)}（{escape(sub)}）</title>'
                   f'<rect x="{left}" y="{y - 4}" width="{W - left * 2}" height="{row_h - 6}" fill="transparent"/>'
                   f'<text class="lab" x="{left}" y="{y + 11}">{escape(lab)}</text>'
                   f'<text class="sub" x="{left}" y="{y + 27}">{escape(sub)}</text>'
                   f'<path class="{cls}" d="{hbar(bar_x, y, w, bh, True)}"/>'
                   f'<text class="val" x="{bar_x + w + 8:.1f}" y="{y + 12.5}">{yen(v)}</text></g>')
    y = top + len(rows) * row_h + 14
    out.append(f'<line class="grid" x1="{left}" x2="{W - left}" y1="{y - 12}" y2="{y - 12}"/>')
    w = bar_w_max * tax / vmax
    out.append(f'<g class="hit"><title>税区分の統一：{yen(tax)}</title>'
               f'<text class="lab" x="{left}" y="{y + 11}">参考：税区分の統一（誤りではない）</text>'
               f'<text class="sub" x="{left}" y="{y + 27}">店頭・ECは税込、卸は税抜で記録 → 店頭・ECの消費税分を除く</text>'
               f'<line class="base" x1="{bar_x}" x2="{bar_x}" y1="{y - 4}" y2="{y + 22}"/>'
               f'<path class="gray" d="{hbar(bar_x, y, w, bh, True)}"/>'
               f'<text class="val" x="{bar_x + w + 8:.1f}" y="{y + 12.5}">{yen(tax)}</text></g>')
    out.append(f'<text class="note" x="{left}" y="{H - 18}">棒はすべて「単純集計から差し引いた額」。月をまたいで移るだけの分（EC 9/30深夜の2件 3,780円）は2か月計では相殺。</text>')
    out.append("</svg>")
    return "\n".join(out)


def fig_ekimae(s: dict) -> str:
    st = s["stores"]["fixed_by_raw_name"]
    names = [("駅前店", "「駅前店」（正しい表記）", "s1"), ("駅前店 ", "「駅前店 」（末尾に半角スペース）", "s2"),
             ("ｴｷﾏｴ店", "「ｴｷﾏｴ店」（半角カナ）", "s3")]
    months = [("2026-09", "9月"), ("2026-10", "10月")]
    totals = {m: sum(st.get(f"{m}|{n}", 0) for n, _, _ in names) for m, _ in months}
    assert totals["2026-09"] == s["stores"]["fixed"]["2026-09|駅前店"]
    assert totals["2026-10"] == s["stores"]["fixed"]["2026-10|駅前店"]
    exact = {m: st.get(f"{m}|駅前店", 0) for m, _ in months}
    W, left, bar_x, bar_w_max, bh = 820, 24, 80, 520, 24
    vmax = max(totals.values())
    H = 300
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" class="viz" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" '
           f'aria-label="駅前店の月別売上と店舗名の表記ゆれ">{STYLE}<rect class="bg" width="{W}" height="{H}"/>']
    out.append(f'<text class="t1" x="{left}" y="32">駅前店の売上（店頭POS・税込・補正後）：10月の約半分が別表記で記録されていた</text>')
    chg_exact = (exact["2026-10"] - exact["2026-09"]) / exact["2026-09"] * 100
    chg_all = (totals["2026-10"] - totals["2026-09"]) / totals["2026-09"] * 100
    out.append(f'<text class="t2" x="{left}" y="54">「駅前店」と完全に一致する行だけ数えると10月は9月の約半分'
               f'（{pct_txt(chg_exact)}）。表記をそろえて数えると {pct_txt(chg_all)}。</text>')
    # 凡例
    lx = left
    for _, lab, cls in names:
        out.append(f'<rect class="{cls}" x="{lx}" y="70" width="12" height="12" rx="2"/>'
                   f'<text class="t2" x="{lx + 18}" y="80.5">{escape(lab)}</text>')
        lx += 18 + text_width(lab, 12.5) + 26
    top = 118
    gap = 2
    for i, (m, mlab) in enumerate(months):
        y = top + i * 70
        out.append(f'<text class="lab" x="{left}" y="{y + 17}">{mlab}</text>')
        x = bar_x
        segs = [(n, lab, cls, st.get(f"{m}|{n}", 0)) for n, lab, cls in names]
        for j, (n, lab, cls, v) in enumerate(segs):
            w = bar_w_max * v / vmax
            last = j == len(segs) - 1
            draw_w = w - (0 if last else gap)
            share = v / totals[m] * 100
            out.append(f'<g class="hit"><title>{mlab} {escape(lab)}：{yen(v)}（{share:.1f}%）</title>'
                       f'<path class="{cls}" d="{hbar(x, y, draw_w, bh, last)}"/>')
            label = f"{v:,}"
            if text_width(label, 11.5) + 14 <= draw_w:
                out.append(f'<text class="in" x="{x + 7:.1f}" y="{y + 16}">{label}</text>')
            out.append("</g>")
            x += w
        out.append(f'<text class="val" x="{x + 10:.1f}" y="{y + 17}">計 {yen(totals[m])}</text>')
        out.append(f'<text class="sub" x="{bar_x}" y="{y + bh + 16}">「駅前店 」と「ｴｷﾏｴ店」の合計 '
                   f'{yen(totals[m] - exact[m])}（{(totals[m] - exact[m]) / totals[m] * 100:.0f}%）</text>')
    out.append(f'<line class="base" x1="{bar_x}" x2="{bar_x}" y1="{top - 8}" y2="{top + 70 + bh + 4}"/>')
    out.append(f'<text class="note" x="{left}" y="{H - 34}">9月は二重登録2件（4,400円）を除いた値。10/5・10/6は改装休業で売上記録なし。</text>')
    fx = s["stores"]["fixed"]
    pct = lambda n: (fx[f"2026-10|{n}"] - fx[f"2026-09|{n}"]) / fx[f"2026-09|{n}"] * 100
    others = "、".join(f"{n} {pct_txt(pct(n))}" for n in ("本店", "郊外店", "空港店"))
    out.append(f'<text class="note" x="{left}" y="{H - 16}">比較：同じ期間の他店は {others}。'
               f'駅前店の {pct_txt(pct("駅前店"))} は特に悪い数字ではない。</text>')
    out.append("</svg>")
    return "\n".join(out)


def main(summary_path: str, out_dir: str) -> None:
    os.makedirs(out_dir, exist_ok=True)
    s = json.load(open(summary_path, encoding="utf-8"))
    for name, svg in (("fig1_gap_breakdown.svg", fig_gap(s)), ("fig2_ekimae_store_names.svg", fig_ekimae(s))):
        with open(os.path.join(out_dir, name), "w", encoding="utf-8") as f:
            f.write(svg)
        print("wrote", name)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
