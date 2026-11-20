"""1枚で完結する観光マップ SVG（上＝地図、下＝ガイド欄）。

ガイド欄の文字組みも SVG の <text> だけで行う（foreignObject は使わない）。
"""
from __future__ import annotations

from xml.sax.saxutils import escape

from aoi_data import ACCESS, CYCLE, DATA_DATE, FOODS, GROUPS, SPOTS, STOPS
from render_map import BUSC, COURSE, FONT_MARU, FONT_MIN, INK, SUB, H as MAP_H, W as MAP_W

SHEET_H = MAP_H + 792
Y0 = MAP_H
MIST = "#f1f7f6"
SEA_DEEP = "#0f3a5c"

KINSOKU = set("、。，．・：；？！ー）」』】〕ぁぃぅぇぉっゃゅょァィゥェォッャュョ〜→／")


def cw(ch, fs):
    if ch == " ":
        return 0.3 * fs
    if ord(ch) < 0x2000:
        return 0.58 * fs
    return fs


def tokens(text):
    """改行してよい単位に分ける（数字・英字・時刻の並びは切らない）。"""
    import re
    return re.findall(r"[（「『【〈《]*(?:[0-9A-Za-z:.,〜%]+|.)", text)   # 開き括弧は次の字と離さない


def wrap(runs, max_w, fs):
    """runs: [(文字列, 属性dict)] → 行ごとの runs。

    属性 g が同じ runs は、1行に収まる限り途中で改行しない（コースの1ステップなど）。
    属性 atomic のある run も途中で改行しない。日本語の行頭禁則も守る。
    """
    gw = {}
    for text, at in runs:
        if at.get("g") is not None:
            gw[at["g"]] = gw.get(at["g"], 0) + sum(cw(ch, at.get("fs", fs)) for ch in text)
    lines = [[]]
    w = 0.0
    cur_g = None

    def put(tok, at):
        if lines[-1] and lines[-1][-1][1] is at:
            lines[-1][-1][0] += tok
        else:
            lines[-1].append([tok, at])

    for text, at in runs:
        f = at.get("fs", fs)
        g = at.get("g")
        if g is not None and g != cur_g:
            cur_g = g
            if lines[-1] and w + gw[g] > max_w and gw[g] <= max_w:
                lines.append([])
                w = 0.0
        toks = [text] if at.get("atomic") else tokens(text)
        for tok in toks:
            tw = sum(cw(ch, f) for ch in tok)
            breakable = g is None or gw[g] > max_w
            if breakable and lines[-1] and w + tw > max_w and tok[0] not in KINSOKU:
                lines.append([])
                w = 0.0
                if tok == " ":
                    continue
            put(tok, at)
            w += tw
    return lines


def text_lines(x, y, runs, max_w, fs, lh, fill=INK, weight=700, family=FONT_MARU):
    """折り返した複数行を出力。戻り値: (svg, 使った高さ)"""
    lines = wrap(runs, max_w, fs)
    out = []
    for i, ln in enumerate(lines):
        spans = []
        for s, at in ln:
            attrs = ""
            if "fill" in at:
                attrs += f' fill="{at["fill"]}"'
            if "weight" in at:
                attrs += f' font-weight="{at["weight"]}"'
            if "fs" in at:
                attrs += f' font-size="{at["fs"]}"'
            spans.append(f"<tspan{attrs}>{escape(s)}</tspan>")
        out.append(f'<text x="{x:.1f}" y="{y + i * lh:.1f}" font-family="{family}" font-size="{fs}" '
                   f'font-weight="{weight}" fill="{fill}">{"".join(spans)}</text>')
    return "".join(out), len(lines) * lh


def T(x, y, s, fs=13, weight=700, fill=INK, anchor="start", family=FONT_MARU, spacing=0):
    ls = f' letter-spacing="{spacing}"' if spacing else ""
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-family="{family}" font-size="{fs}" font-weight="{weight}" '
            f'fill="{fill}" text-anchor="{anchor}"{ls}>{escape(s)}</text>')


def badge(x, y, no, r=10.5, fs=11.5):
    col = GROUPS[SPOTS[no - 1]["group"]]["color"]
    return (f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{col}" stroke="#fff" stroke-width="1.6"/>'
            f'<text x="{x:.1f}" y="{y + fs * 0.36:.1f}" font-family="{FONT_MARU}" font-size="{fs}" font-weight="900" '
            f'fill="#fff" text-anchor="middle">{no}</text>')


def heading(x, y, title, sub=None):
    s = T(x, y, title, 25, 800, SEA_DEEP, family=FONT_MIN, spacing=1)
    if sub:
        w = sum(cw(ch, 25) for ch in title) + 14 + len(title)
        s += T(x + w, y - 2, sub, 12.5, 700, SUB)
    return s


# ------------------------------------------------------------------ 周回線のループ図

LOOP = {  # 停留所の位置（上＝北海岸、右＝東端、下＝南海岸、左＝西端）
    "jinja": (150, "top"), "keikoku": (282, "top"), "shizuura": (392, "top"),
    "asahi": (None, "right"),
    "minato": (402, "bottom"), "onsen": (318, "bottom"), "kankitsu": (228, "bottom"), "shinju": (146, "bottom"),
    "yunagi": (None, "left"),
}
NEAR = {"minato": [8, 11, 14], "onsen": [12, 5, 6], "kankitsu": [10], "shinju": [4], "yunagi": [2, 3],
        "jinja": [13, 5], "keikoku": [7], "shizuura": [9], "asahi": [1]}


def loop_diagram(ox, oy):
    """ox, oy: 図の左上。幅 480 × 高さ 300 程度。"""
    o = []
    rx0, ry0, rx1, ry1 = ox + 104, oy + 64, ox + 436, oy + 202
    o.append(f'<rect x="{rx0}" y="{ry0}" width="{rx1 - rx0}" height="{ry1 - ry0}" rx="42" fill="none" stroke="{BUSC}" stroke-width="8"/>')
    # 向きの矢印（白い三角）
    def arrow(x, y, ang):
        return f'<path d="M-5 -5 L6 0 L-5 5 Z" fill="#fff" transform="translate({x:.1f},{y:.1f}) rotate({ang})"/>'
    for x in (ox + 216, ox + 337):
        o.append(arrow(x, ry0, 0))
    for x in (ox + 360, ox + 273, ox + 187):
        o.append(arrow(x, ry1, 180))
    o.append(arrow(rx1, oy + 104, 90))
    o.append(arrow(rx1, oy + 162, 90))
    o.append(arrow(rx0, oy + 162, -90))
    o.append(arrow(rx0, oy + 104, -90))
    cx, cy = (rx0 + rx1) / 2, (ry0 + ry1) / 2
    o.append(T(cx, cy - 8, "周回線", 21, 800, SEA_DEEP, "middle", FONT_MIN))
    o.append(T(cx, cy + 14, "あおい港から時計回り", 12, 800, SUB, "middle"))
    o.append(T(cx, cy + 31, "一周 約70分・1日6便", 12, 800, SUB, "middle"))
    for st in STOPS:
        pos, side = LOOP[st["id"]]
        if side == "top":
            x, y = ox + pos, ry0
        elif side == "bottom":
            x, y = ox + pos, ry1
        elif side == "left":
            x, y = rx0, cy
        else:
            x, y = rx1, cy
        start = st["no"] == 1
        o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="12" fill="{BUSC if start else "#fff"}" stroke="{BUSC}" stroke-width="4"/>'
                 f'<text x="{x:.1f}" y="{y + 4.3:.1f}" font-family="{FONT_MARU}" font-size="12" font-weight="900" '
                 f'fill="{"#fff" if start else BUSC}" text-anchor="middle">{st["no"]}</text>')
        nears = NEAR[st["id"]]
        name = st["name"]
        if side == "top":
            o.append(T(x, y - 22, name, 12.5, 900, BUSC, "middle"))
            bx0 = x - (len(nears) - 1) * 12
            for i, no in enumerate(nears):
                o.append(badge(bx0 + i * 24, y - 50, no, 10, 10.5))
        elif side == "bottom":
            o.append(T(x, y + 32, name, 12.5, 900, BUSC, "middle"))
            if start:
                o.append(f'<rect x="{x - 25:.1f}" y="{y + 38:.1f}" width="50" height="16" rx="8" fill="{BUSC}"/>'
                         + T(x, y + 50, "起点・終点", 9.5, 900, "#fff", "middle"))
            bx0 = x - (len(nears) - 1) * 12
            by = y + (70 if start else 52)
            for i, no in enumerate(nears):
                o.append(badge(bx0 + i * 24, by, no, 10, 10.5))
        elif side == "left":
            o.append(T(x - 20, y - 4, name, 12.5, 900, BUSC, "end"))
            for i, no in enumerate(nears):
                o.append(badge(x - 30 - (len(nears) - 1 - i) * 24, y + 18, no, 10, 10.5))
        else:
            o.append(T(x + 20, y - 4, name, 12.5, 900, BUSC, "start"))
            for i, no in enumerate(nears):
                o.append(badge(x + 30 + i * 24, y + 18, no, 10, 10.5))
    return "".join(o)


# ------------------------------------------------------------------ 本体


def spot_access(sp):
    no = sp["no"]
    if no == 5:
        return "バス停「あおい温泉入口」か「あおい神社前」／登り約90分・下り約70分"
    if no == 6:
        return "山頂から南へ徒歩約5分／滞在15分"
    st = next(s["name"] for s in STOPS if s["id"] == sp["stop"])
    w = (sp["walk"] or "").replace("あおい港から", "")
    s = f"バス停「{st}」" + (f"から{w}" if w else "") + f"／滞在{sp['stay']}"
    return s


FLOWS = {
    "A": [("s", 8, "40分"), ("m", "徒歩約5分"), ("s", 11, "60分"), ("m", "集落を歩いて"), ("s", 14, "30分"), ("m", "徒歩約7分で港へ")],
    "B": [("m", "バスで「真珠浜」へ"), ("s", 4, "1〜2時間"), ("m", "次の便で「夕凪岬」へ・徒歩約10分"), ("s", 3, "20分"),
          ("s", 2, "30分"), ("m", "バスで北・東海岸を回って港へ")],
    "C": [("m", "バスで「あおい温泉入口」へ・登り約90分"), ("s", 6, "15分"), ("s", 5, "山頂"), ("m", "下り約70分"),
          ("s", 12, "60分"), ("m", "バスで島を一周して港へ")],
    "D": [("m", "レンタサイクルで時計回り"), ("s", 10, "40分"), ("s", 4, "1時間"), ("s", 3, "20分"), ("s", 2, "30分"),
          ("s", 13, "30分"), ("s", 7, "40分"), ("s", 1, "30分"), ("s", 8, "40分")],
}
CIRC = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭"


def build_sheet_svg(map_svg, courses):
    inner = map_svg.replace('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ',
                            f'<svg x="0" y="0" ', 1)
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {MAP_W} {SHEET_H}" '
         f'width="{MAP_W}" height="{SHEET_H}" role="img" aria-labelledby="sheetTitle">'
         f'<title id="sheetTitle">あおい島 観光マップ（地図とガイド）</title>'
         '<defs><!--@STYLE@--></defs>']
    o.append(inner)
    # ガイド欄の地
    o.append(f'<rect x="0" y="{Y0}" width="{MAP_W}" height="{SHEET_H - Y0}" fill="{MIST}"/>')
    o.append(f'<path d="M0 {Y0} H{MAP_W} V{Y0 + 6} H0 Z" fill="{SEA_DEEP}"/>')

    # ---- 列1：周回線と交通
    x1 = 36
    o.append(heading(x1, Y0 + 52, "周回線バスの停留所", "数字はあおい港からの順"))
    o.append(f'<rect x="{x1 - 6}" y="{Y0 + 68}" width="492" height="314" rx="16" fill="#fff"/>')
    o.append(loop_diagram(x1 - 6, Y0 + 76))
    o.append(T(x1 + 6, Y0 + 372, "時計回りの一方向。港へ戻るときもそのまま乗り続けて一周します。", 11.5, 700, SUB))
    y = Y0 + 418
    o.append(heading(x1, y, "島への行き方・島内の移動"))
    y += 28
    items = [
        ("船", f"蒼玉港 ⇔ あおい港。フェリー約{ACCESS['ferry']['minutes']}分・1日{ACCESS['ferry']['round_trips']}往復（車両の積載可）、"
               f"高速船約{ACCESS['jetfoil']['minutes']}分・1日{ACCESS['jetfoil']['round_trips']}往復（旅客のみ）。"
               f"始発は本土発7:10、最終は島発18:20（季節により変動）。"),
        ("バス", "あおい島バス「周回線」。あおい港を起点に周回道路を時計回りに一周。一周約70分、1日6便。"),
        ("自転車", f"{CYCLE['name']}（{CYCLE['place']}）。{CYCLE['ebike']}。一周約21kmは寄り道なしで約2.5〜3時間。"),
        ("道路", "あおい島周回線（あおいライン）。あおい港を起点に海岸沿いを一周する全長約21km。"),
    ]
    for k, v in items:
        o.append(f'<rect x="{x1}" y="{y - 13}" width="46" height="19" rx="9.5" fill="{BUSC}"/>' + T(x1 + 23, y + 1.5, k, 11, 900, "#fff", "middle"))
        svg, hh = text_lines(x1 + 56, y, [(v, {})], 420, 12.5, 19, INK, 700)
        o.append(svg)
        y += hh + 9

    # ---- 列2：見どころ
    x2 = 560
    o.append(heading(x2, Y0 + 52, "見どころ 14か所", "番号は地図と同じ"))
    colw = 266
    ys = [Y0 + 88, Y0 + 88]
    split = 7
    for sp in SPOTS:
        c = 0 if sp["no"] <= split else 1
        bx = x2 + c * (colw + 18)
        yy = ys[c]
        gcol = GROUPS[sp["group"]]["color"]
        o.append(badge(bx + 11, yy - 5, sp["no"], 11, 12))
        o.append(T(bx + 28, yy, sp["name"], 14.5, 900, INK))
        nw = sum(cw(ch, 14.5) for ch in sp["name"])
        o.append(T(bx + 32 + nw, yy - 0.5, sp["cat"], 10.5, 800, gcol))
        yy += 19
        runs = [(sp["desc"], {})]
        svg, hh = text_lines(bx + 28, yy, runs, colw - 30, 12, 17, INK, 500)
        o.append(svg)
        yy += hh
        parts = spot_access(sp).split("／")
        if sp["best"]:
            parts.append(f"おすすめ {sp['best']}")
        runs = [(p + ("／" if i < len(parts) - 1 else ""), {"atomic": True}) for i, p in enumerate(parts)]
        svg, hh = text_lines(bx + 28, yy, runs, colw - 30, 11, 15.5, SUB, 700)
        o.append(svg)
        yy += hh + 10
        ys[c] = yy

    # ---- 列3：モデルコース・時間・名物
    x3 = 1146
    w3 = 420
    o.append(heading(x3, Y0 + 52, "モデルコース", "待ち時間は含みません"))
    y = Y0 + 84
    for c in courses:
        o.append(f'<rect x="{x3}" y="{y - 14}" width="21" height="21" rx="6" fill="{COURSE}"/>' + T(x3 + 10.5, y + 2, c["id"], 12.5, 900, "#fff", "middle"))
        o.append(T(x3 + 29, y + 2, c["title"], 15, 800, INK, family=FONT_MIN))
        tw = sum(cw(ch, 15) for ch in c["title"])
        o.append(T(x3 + 37 + tw, y + 1, c["how"], 11, 800, SUB))
        y += 21
        runs = []
        for i, st_ in enumerate(FLOWS[c["id"]]):
            g = f"{c['id']}{i}"
            if st_[0] == "s":
                col = GROUPS[SPOTS[st_[1] - 1]["group"]]["color"]
                runs.append((CIRC[st_[1] - 1], {"fill": col, "weight": 900, "g": g}))
                runs.append((SPOTS[st_[1] - 1]["short"], {"weight": 800, "g": g}))
                runs.append((" " + st_[2], {"fill": SUB, "fs": 11, "g": g}))
            else:
                runs.append((st_[1], {"fill": SUB, "g": g}))
            if i < len(FLOWS[c["id"]]) - 1:
                runs.append((" →", {"fill": SUB, "g": g}))
                runs.append((" ", {"fill": SUB}))
        svg, hh = text_lines(x3, y, runs, w3, 12, 18, INK, 700)
        o.append(svg)
        y += hh + 12
    y += 8
    o.append(heading(x3, y, "時間に気をつけたいこと"))
    y += 26
    tips = [("#f5a623", "早朝が見頃：朝日岬（島で一番早い朝日）、静浦の朝市（7:00〜9:00ごろ）"),
            ("#ef6a50", "夕方が見頃：夕凪岬（夕日が海に沈む）"),
            ("#1f4f9e", "帰りの船は最終が島発18:20目安。コースは帰りの時刻から逆算を"),
            ("#7d9aa3", "バスなら半日で2〜3か所、1日で4〜6か所。登山は約3時間")]
    for col, s in tips:
        o.append(f'<rect x="{x3}" y="{y - 12}" width="4" height="16" fill="{col}"/>')
        svg, hh = text_lines(x3 + 12, y, [(s, {})], w3 - 12, 12, 17, INK, 700)
        o.append(svg)
        y += hh + 4
    y += 16
    o.append(heading(x3, y, "島の味とおみやげ"))
    y += 26
    fy0 = y
    for i, f in enumerate(FOODS):
        cx_ = x3 + (i % 2) * 214
        cy_ = fy0 + (i // 2) * 74
        o.append(T(cx_, cy_, f["name"], 13.5, 900, INK))
        svg, hh = text_lines(cx_, cy_ + 17, [(f["desc"], {})], 200, 11, 15, SUB, 700)
        o.append(svg)
        o.append(T(cx_, cy_ + 17 + hh, "▸ " + f["where"], 10.5, 800, BUSC))

    # ---- 下の帯
    fy = SHEET_H - 16
    o.append(f'<rect x="0" y="{SHEET_H - 38}" width="{MAP_W}" height="38" fill="{SEA_DEEP}"/>')
    o.append(T(36, fy, "あおい島 観光マップ", 14, 800, "#fff", family=FONT_MIN))
    o.append(T(200, fy - 1, f"地名・施設名はすべて架空です（島データ {DATA_DATE} 版）。船・バスの時刻は季節により変わります。航路の向きは模式的に描いています。",
               11.5, 700, "#cfe6ef"))
    o.append('</svg>')
    return "".join(o)
