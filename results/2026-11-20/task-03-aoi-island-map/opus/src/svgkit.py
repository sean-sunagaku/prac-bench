"""SVG を組み立てるための小さな道具（文字・図形・当たり判定・アイコン）。"""
from __future__ import annotations

import math
from xml.sax.saxutils import escape

import fonts as F

FAMILY = {
    "body": ("AoiRounded", 500),
    "bold": ("AoiRounded", 700),
    "heavy": ("AoiRounded", 800),
    "title": ("AoiTitle", 800),
    "feature": ("AoiFeature", 700),
    "latin": ("AoiLatin", 600),
}
FALLBACK = {
    "AoiRounded": "'AoiRounded','Hiragino Maru Gothic ProN','M PLUS Rounded 1c','BIZ UDPGothic','Meiryo',sans-serif",
    "AoiTitle": "'AoiTitle','Hiragino Mincho ProN','Yu Mincho',serif",
    "AoiFeature": "'AoiFeature','Hiragino Mincho ProN','Yu Mincho',serif",
    "AoiLatin": "'AoiLatin','Cormorant Garamond','Georgia',serif",
}


def esc(s):
    return escape(str(s), {'"': "&quot;"})


def f1(v):
    s = f"{v:.1f}"
    return s[:-2] if s.endswith(".0") else s


def pts_d(points, closed=False):
    it = iter(points)
    x, y = next(it)
    out = [f"M{f1(x)} {f1(y)}"]
    for x, y in it:
        out.append(f"L{f1(x)} {f1(y)}")
    if closed:
        out.append("Z")
    return "".join(out)


def smooth_d(points, closed=False, tension=1.0):
    """Catmull-Rom を3次ベジェにした滑らかなパス。"""
    P = list(points)
    n = len(P)
    if n < 3:
        return pts_d(P, closed)
    out = [f"M{f1(P[0][0])} {f1(P[0][1])}"]
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p0 = P[(i - 1) % n] if (closed or i > 0) else P[i]
        p1 = P[i]
        p2 = P[(i + 1) % n]
        p3 = P[(i + 2) % n] if (closed or i + 2 < n) else P[(i + 1) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6 * tension, p1[1] + (p2[1] - p0[1]) / 6 * tension)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6 * tension, p2[1] - (p3[1] - p1[1]) / 6 * tension)
        out.append(f"C{f1(c1[0])} {f1(c1[1])} {f1(c2[0])} {f1(c2[1])} {f1(p2[0])} {f1(p2[1])}")
    if closed:
        out.append("Z")
    return "".join(out)


class Boxes:
    """ラベル・記号の外接矩形を記録して、重なりを判定する。"""

    def __init__(self):
        self.items = []  # (x0,y0,x1,y1,tag)

    def add(self, box, tag=""):
        self.items.append((*box, tag))

    def hits(self, box, pad=0.0, ignore=()):
        x0, y0, x1, y1 = box
        out = []
        for (a0, b0, a1, b1, tag) in self.items:
            if tag in ignore:
                continue
            if x0 - pad < a1 and x1 + pad > a0 and y0 - pad < b1 and y1 + pad > b0:
                out.append(tag)
        return out

    def overlaps(self, kinds=("label", "marker", "stop")):
        """記録したもの同士の重なりを列挙（検証用）。"""
        res = []
        it = [i for i in self.items if i[4].split(":")[0] in kinds]
        for i in range(len(it)):
            for j in range(i + 1, len(it)):
                a, b = it[i], it[j]
                if a[0] < b[2] and a[2] > b[0] and a[1] < b[3] and a[3] > b[1]:
                    res.append((a[4], b[4]))
        return res


def text_box(x, y, s, key, size, anchor="start", ls=0.0):
    w = F.text_width(key, s, size, ls)
    if anchor == "middle":
        x0 = x - w / 2
    elif anchor == "end":
        x0 = x - w
    else:
        x0 = x
    return (x0, y - size * 0.86, x0 + w, y + size * 0.20)


def text(x, y, s, key="body", size=20, fill="#222", anchor="start", halo=None, halo_w=0.0,
         ls=0.0, opacity=None, extra="", cls=""):
    F.register(key, s)
    fam, wt = FAMILY[key]
    attrs = [f'x="{f1(x)}"', f'y="{f1(y)}"', f'font-size="{f1(size)}"', f'class="t-{key}{(" " + cls) if cls else ""}"']
    if fill:
        attrs.append(f'fill="{fill}"')
    if anchor != "start":
        attrs.append(f'text-anchor="{anchor}"')
    if ls:
        attrs.append(f'letter-spacing="{f1(ls * size)}"')
    if halo:
        attrs.append(f'stroke="{halo}" stroke-width="{f1(halo_w)}" stroke-linejoin="round" paint-order="stroke"')
    if opacity is not None:
        attrs.append(f'opacity="{opacity}"')
    if extra:
        attrs.append(extra)
    return f"<text {' '.join(attrs)}>{esc(s)}</text>"


def tspan_text(x, y, runs, size=20, anchor="start", extra=""):
    """runs: [(文字列, key, fill)] を1行に並べる。"""
    parts = []
    for s, key, fill in runs:
        F.register(key, s)
        parts.append(f'<tspan class="t-{key}" fill="{fill}">{esc(s)}</tspan>')
    a = f' text-anchor="{anchor}"' if anchor != "start" else ""
    return f'<text x="{f1(x)}" y="{f1(y)}" font-size="{f1(size)}"{a} {extra}>{"".join(parts)}</text>'


def runs_width(runs, size):
    return sum(F.text_width(key, s, size) for s, key, _ in runs)


NO_START = set("、。，．・：；？！ー）」』】〕’”ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ〜…‐-%）分")
NO_END = set("（「『【〔‘“")


def _wrap_chars(s, key, size, width):
    """1文字ずつ詰める折り返し（行頭禁則つき）。"""
    lines, cur = [], ""
    for ch in s:
        if F.text_width(key, cur + ch, size) <= width or not cur:
            cur += ch
            continue
        if ch in NO_START and len(cur) > 1:
            k = len(cur) - 1
            while k > 1 and cur[k] in NO_START:
                k -= 1
            lines.append(cur[:k])
            cur = cur[k:] + ch
            continue
        if cur and cur[-1] in NO_END:
            lines.append(cur[:-1])
            cur = cur[-1] + ch
            continue
        lines.append(cur)
        cur = ch
    if cur:
        lines.append(cur)
    return lines


def _split_keep(s, mark):
    parts = [x + mark for x in s.split(mark) if x]
    if parts and not s.endswith(mark):
        parts[-1] = parts[-1][: -len(mark)]
    return parts


def wrap(s, key, size, width):
    """日本語の折り返し。まず文（。）単位で詰め、長い文は読点（、）で区切って詰め、
    それでも長い部分だけ1文字ずつ折り返す。最後の行が2文字以下にならないよう調整する。"""
    if F.text_width(key, s, size) <= width:
        return [s]
    lines, cur = [], ""

    def fits(t):
        return F.text_width(key, t, size) <= width

    for se in _split_keep(s, "。"):
        if fits(cur + se):
            cur += se
            continue
        if fits(se):
            if cur:
                lines.append(cur)
            cur = se
            continue
        for cl in _split_keep(se, "、"):
            if fits(cur + cl):
                cur += cl
            elif fits(cl):
                if cur:
                    lines.append(cur)
                cur = cl
            else:
                parts = _wrap_chars(cur + cl, key, size, width)
                lines.extend(parts[:-1])
                cur = parts[-1]
    if cur:
        lines.append(cur)
    if len(lines) >= 2 and len(lines[-1]) <= 2:
        prev, last = lines[-2], lines[-1]
        while len(last) < 4 and len(prev) > 4:
            prev, last = prev[:-1], prev[-1] + last
        lines[-2], lines[-1] = prev, last
    return lines


def rrect(x, y, w, h, r, fill="#fff", stroke=None, sw=0, extra=""):
    s = f'<rect x="{f1(x)}" y="{f1(y)}" width="{f1(w)}" height="{f1(h)}" rx="{f1(r)}" fill="{fill}"'
    if stroke:
        s += f' stroke="{stroke}" stroke-width="{f1(sw)}"'
    if extra:
        s += " " + extra
    return s + "/>"


def circle(x, y, r, fill="#fff", stroke=None, sw=0, extra=""):
    s = f'<circle cx="{f1(x)}" cy="{f1(y)}" r="{f1(r)}" fill="{fill}"'
    if stroke:
        s += f' stroke="{stroke}" stroke-width="{f1(sw)}"'
    if extra:
        s += " " + extra
    return s + "/>"


# ---------------------------------------------------------------- アイコン（24×24）
# 塗りは currentColor。線は class="ic-l"（stroke=currentColor）で描く。
ICONS = {
    "lighthouse": '<path d="M9.2 21.5h5.6l-1.1-11.6h-3.4z"/><path d="M10 9.9h4V6.6h-4z"/><path d="M9.3 6.6 12 3.6l2.7 3z"/>'
                  '<path class="ic-l" d="M15.6 7.2l4.6-1.6M15.6 9.2l4.6 1.4M8.4 7.2 3.8 5.6M8.4 9.2l-4.6 1.4"/>'
                  '<path class="ic-x" d="M9.8 14.3h4.4v2.2H9.8z"/>',
    "sunset": '<path d="M5 15.5a7 7 0 0 1 14 0z"/><path class="ic-l" d="M2 18h20M5.5 21h13M12 4.2v2.6M4.7 7.4l1.9 1.8M19.3 7.4l-1.9 1.8"/>',
    "sunrise": '<circle cx="12" cy="12.5" r="4.6"/><path class="ic-l" d="M12 3.5v2.4M12 19.1v2.4M3 12.5h2.4M18.6 12.5H21M5.6 6.1l1.7 1.7M16.7 17.2l1.7 1.7M18.4 6.1l-1.7 1.7M7.3 17.2l-1.7 1.7"/>',
    "view": '<path d="M5.5 8.5h4.6v7.2H5.5zM13.9 8.5h4.6v7.2h-4.6z"/><circle cx="7.8" cy="16.2" r="3.6"/><circle cx="16.2" cy="16.2" r="3.6"/>'
            '<path d="M10.1 10h3.8v3.2h-3.8z"/><path d="M6.2 6.2h3.2v2.3H6.2zM14.6 6.2h3.2v2.3h-3.2z"/>',
    "beach": '<path d="M2.8 11.6C4.6 5.4 13 3.4 18.4 8.4c1 .9 1.8 2 2.3 3.2z"/><path class="ic-l" d="M11.6 7.6l3.2 11.2"/>'
             '<path class="ic-l" d="M2 20.6c2.2-1.6 4.4-1.6 6.6 0s4.4 1.6 6.6 0 4.4-1.6 6.8 0"/>',
    "mountain": '<path d="M1.8 20.5 8.6 8.2l3.6 6 2.6-3.6 7.4 9.9z"/><path class="ic-l" d="M8.6 8.4V2.8"/><path d="M8.6 2.8l4.4 1.6-4.4 1.7z"/>',
    "pond": '<path d="M3.5 11.2 9 5l3.6 4 2.8-2.8 5.1 5z"/><ellipse cx="12" cy="16.2" rx="9.2" ry="4.3"/>'
            '<path class="ic-x2" d="M7 15.4h6M10.5 17.6h6"/>',
    "waterfall": '<path d="M3.5 3.5h17v3.2h-17z"/><path class="ic-l" d="M8.5 7.2v9.6M12 7.2v11M15.5 7.2v9.6"/>'
                 '<path class="ic-l" d="M3 20.6c2.4-1.8 4.6-1.8 6 0 1.6-1.8 4.4-1.8 6 0 1.4-1.8 3.6-1.8 6 0"/>',
    "market": '<path d="M3 8.6 5.2 3.4h13.6L21 8.6c-.6 1.6-2.4 1.6-3 0-.6 1.6-2.4 1.6-3 0-.6 1.6-2.4 1.6-3 0-.6 1.6-2.4 1.6-3 0-.6 1.6-2.4 1.6-3 0-.6 1.6-2.4 1.6-3 0z"/>'
              '<path d="M4.6 11.4h14.8v9.8H4.6z"/><path class="ic-x" d="M8 14.6c1.6-2 4.8-2 6.4 0-1.6 2-4.8 2-6.4 0zM14.4 14.6l2.2-1.6v3.2z"/>',
    "fish": '<path d="M2.6 12c3.6-6.2 11.2-6.6 15.2 0-4 6.6-11.6 6.2-15.2 0z"/><path d="M17.4 12l4.4-4.2v8.4z"/>'
            '<circle class="ic-x" cx="7.2" cy="10.8" r="1.2"/>',
    "citrus": '<circle cx="12" cy="13.8" r="7.6"/><path d="M12.2 6.4c.6-3 4-4.6 7.4-3.6-.8 3.2-4.2 4.8-7.4 3.6z"/>'
              '<circle class="ic-x" cx="9.4" cy="11.6" r="1.1"/>',
    "glass": '<path d="M9 2.8h6v2.4c0 2 3.4 3.6 3.4 8 0 5-3 8.2-6.4 8.2S5.6 18.2 5.6 13.2c0-4.4 3.4-6 3.4-8z"/>'
             '<path class="ic-x2" d="M9.2 11.6c-.6 1.4-.8 3.4-.2 5"/>',
    "onsen": '<path class="ic-l" d="M3.4 13.2c0 5.4 3.8 8 8.6 8s8.6-2.6 8.6-8"/><path class="ic-l" d="M7.4 11.6c-1.8-1.8 1.8-3.4 0-5.4-.9-1-.6-2.4.2-3.2M12 11.6c-1.8-1.8 1.8-3.4 0-5.4-.9-1-.6-2.4.2-3.2M16.6 11.6c-1.8-1.8 1.8-3.4 0-5.4-.9-1-.6-2.4.2-3.2"/>',
    "torii": '<path d="M1.8 4.4c6.8 1.6 13.6 1.6 20.4 0v2.8c-6.8 1.6-13.6 1.6-20.4 0z"/><path d="M4.4 9.8h15.2v2H4.4z"/>'
             '<path d="M6.2 7.4h2.2v14.2H6.2zM15.6 7.4h2.2v14.2h-2.2z"/><path d="M11.1 7.8h1.8v2.2h-1.8z"/>',
    "museum": '<path d="M2.8 8 12 2.8 21.2 8z"/><path d="M3.6 8.6h16.8v1.6H3.6z"/>'
              '<path d="M5 11h2v6.8H5zM9.3 11h2v6.8h-2zM12.7 11h2v6.8h-2zM17 11h2v6.8h-2z"/><path d="M2.8 18.6h18.4v2.6H2.8z"/>',
    "bus": '<path d="M6 2.8h12a2.4 2.4 0 0 1 2.4 2.4v13.2H3.6V5.2A2.4 2.4 0 0 1 6 2.8z"/>'
           '<path class="ic-x" d="M5.8 5.4h12.4v6H5.8z"/><circle class="ic-x" cx="7.6" cy="15.2" r="1.3"/><circle class="ic-x" cx="16.4" cy="15.2" r="1.3"/>'
           '<path d="M5 18.4h3v2.8H5zM16 18.4h3v2.8h-3z"/>',
    "ferry": '<path d="M1.8 14.6h20.4l-3 5.4H4.8z"/><path d="M5.6 10h11.6v4H5.6z"/><path d="M8 6.6h6.4V10H8z"/><path d="M15 7h2.2v3H15z"/>'
             '<path class="ic-l" d="M1.6 22.4c2.4-1.2 4.4-1.2 6.8 0s4.4 1.2 6.8 0 4.4-1.2 7 0"/>',
    "jet": '<path d="M1.6 15.2h17.6c1.6 0 2.8-1 3.2-2.4H6.4L3 15.2z"/><path d="M7 12.8l2.4-4h7.4l2 4z"/>'
           '<path class="ic-l" d="M1.6 19.2c2.4-1.2 4.4-1.2 6.8 0s4.4 1.2 6.8 0 4.4-1.2 7 0"/>',
    "bicycle": '<circle class="ic-l" cx="6" cy="16" r="4"/><circle class="ic-l" cx="18" cy="16" r="4"/>'
               '<path class="ic-l" d="M6 16l4.2-7.2h6.2L18 16M10.2 8.8l2.6 7.2H6M8.6 6.6h3.4M15.2 6.4l1.4 2.4"/>',
    "donburi": '<path d="M2.8 11.2h18.4c0 5-4 8.4-9.2 8.4s-9.2-3.4-9.2-8.4z"/><path d="M8.6 19.6h6.8v1.8H8.6z"/>'
               '<path d="M4.6 10.6c.6-2.6 3.4-3 4.6-1 .8-2.6 4.2-2.8 5.2-.4 1.2-2 3.8-1.4 4.6 1.4z"/><path class="ic-l" d="M13 2.4l5.6 6.4M16.2 2.2l4 5.4"/>',
    "hijiki": '<path class="ic-l" d="M6.6 21.4C4.4 16.2 9 13.4 6.8 8.2 6 6.2 6.8 4.4 8 3.4M12 21.4c-2.2-5.6 2.4-8.6.2-14.4M17.4 21.4c-2.2-5.2 2.4-8 .2-13.2-.8-2 0-3.8 1.2-4.8"/>',
    "walk": '<circle cx="13.6" cy="3.8" r="2.2"/><path class="ic-l" d="M12.6 7.4 10.4 13.6 7.4 20.8M10.4 13.6l3.4 3.2 1 4.6M11.6 9.2 8.2 12M12.6 8.4l3.8 3.4"/>',
    "clock": '<circle class="ic-l" cx="12" cy="12" r="8.6"/><path class="ic-l" d="M12 6.8V12l3.6 2.4"/>',
    "umbrella": '<path d="M2.6 11.8C3.6 6.4 7.6 3.6 12 3.6s8.4 2.8 9.4 8.2z"/><path class="ic-l" d="M12 11.8v6.8c0 1.6 2.6 1.6 2.6 0"/>',
    "camera": '<path d="M3 7.6h4l1.6-2.4h6.8L17 7.6h4v12H3z"/><circle class="ic-x" cx="12" cy="13.4" r="3.6"/>',
}


def icon(name, x, y, size, color, extra=""):
    """左上 (x, y)、一辺 size の位置にアイコンを置く。"""
    k = size / 24
    return (f'<g class="ic" transform="translate({f1(x)} {f1(y)}) scale({k:.4f})" color="{color}" {extra}>'
            f'{ICONS[name]}</g>')


def arrow_head(x, y, ang, size, fill, stroke=None, sw=0):
    """(x, y) を先端とし ang（ラジアン）方向を向く三角。"""
    a = ang
    p1 = (x, y)
    p2 = (x - size * math.cos(a) + size * 0.62 * math.sin(a), y - size * math.sin(a) - size * 0.62 * math.cos(a))
    p3 = (x - size * math.cos(a) - size * 0.62 * math.sin(a), y - size * math.sin(a) + size * 0.62 * math.cos(a))
    s = f'<path d="{pts_d([p1, p2, p3], True)}" fill="{fill}"'
    if stroke:
        s += f' stroke="{stroke}" stroke-width="{f1(sw)}" stroke-linejoin="round"'
    return s + "/>"
