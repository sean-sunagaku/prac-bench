"""あおい島 観光マップの SVG を組み立てる。

座標は geo.py（km）→ ここで px に変換する。北が上、1 km = 160 px。
"""
from __future__ import annotations

import base64
import io
import math
from xml.sax.saxutils import escape

import numpy as np
from shapely.geometry import LineString, Point, Polygon, box
from shapely.ops import unary_union
from shapely.prepared import prep

import geo
from aoi_data import ACCESS, BUS, GROUPS, ROAD, SPOTS, STOPS

S = 160.0
W, H = 1600, 1050
CX, CY = 830.0, 512.0

INK = "#183447"
SUB = "#46606b"
BUSC = "#1f4f9e"
TRAIL = "#8a4a1f"
COURSE = "#e2457a"

FONT_MARU = "AoiMaru,'Zen Maru Gothic','Hiragino Maru Gothic ProN','Hiragino Sans','Yu Gothic',sans-serif"
FONT_MIN = "AoiMincho,'Shippori Mincho B1','Hiragino Mincho ProN','Yu Mincho',serif"

# ------------------------------------------------------------------ 座標・パス


def px(p, s=S, cx=CX, cy=CY):
    return (cx + float(p[0]) * s, cy - float(p[1]) * s)


def pxa(a, s=S, cx=CX, cy=CY):
    a = np.asarray(a, float)
    return np.column_stack([cx + a[:, 0] * s, cy - a[:, 1] * s])


def path_d(P, closed=False, tol=0.35):
    P = np.asarray(P, float)
    if tol and len(P) > 4:
        gm = LineString(np.vstack([P, P[:1]])) if closed else LineString(P)
        gm = gm.simplify(tol, preserve_topology=False)
        P = np.asarray(gm.coords)
        if closed:
            P = P[:-1]
    return "M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in P) + ("Z" if closed else "")


def km_path(pts, closed=False, tol=0.35, **kw):
    return path_d(pxa(pts, **kw), closed, tol)


def geom_d(gm, tol=0.35, **kw):
    if gm.is_empty:
        return ""
    polys = [gm] if gm.geom_type == "Polygon" else [p for p in getattr(gm, "geoms", []) if p.geom_type == "Polygon"]
    out = []
    for p in polys:
        out.append(km_path(np.asarray(p.exterior.coords)[:-1], True, tol, **kw))
        for hole in p.interiors:
            out.append(km_path(np.asarray(hole.coords)[:-1], True, tol, **kw))
    return "".join(out)


def text_w(s, fs):
    w = 0.0
    for ch in s:
        o = ord(ch)
        if ch == " ":
            w += 0.3 * fs
        elif o < 0x2000:
            w += 0.58 * fs
        else:
            w += 1.0 * fs
    return w


def cum_len(P):
    return np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])


def point_at(P, s_cum, s):
    i = int(np.clip(np.searchsorted(s_cum, s) - 1, 0, len(P) - 2))
    t = (s - s_cum[i]) / max(s_cum[i + 1] - s_cum[i], 1e-9)
    p = P[i] + t * (P[i + 1] - P[i])
    d = P[i + 1] - P[i]
    ang = math.degrees(math.atan2(d[1], d[0]))
    return p, ang

# ------------------------------------------------------------------ ラベル管理


class Labels:
    def __init__(self):
        self.boxes = []      # (x0, y0, x1, y1, name)
        self.svg = []

    def add_box(self, x0, y0, x1, y1, name):
        self.boxes.append((x0, y0, x1, y1, name))

    def text(self, x, y, s, fs, weight=700, fill=INK, anchor="start", halo=4.2, font="maru", cls="",
             spacing=0, name=None, halo_color="#fff", opacity=None, extra=""):
        w = text_w(s, fs) + spacing * max(len(s) - 1, 0)
        x0 = x if anchor == "start" else (x - w / 2 if anchor == "middle" else x - w)
        self.add_box(x0 - 1, y - 0.9 * fs, x0 + w + 1, y + 0.25 * fs, name or s)
        fam = FONT_MARU if font == "maru" else FONT_MIN
        st = f' stroke="{halo_color}" stroke-width="{halo}" stroke-linejoin="round" paint-order="stroke"' if halo else ""
        ls = f' letter-spacing="{spacing}"' if spacing else ""
        op = f' opacity="{opacity}"' if opacity is not None else ""
        c = f' class="{cls}"' if cls else ""
        return (f'<text x="{x:.1f}" y="{y:.1f}" font-family="{fam}" font-size="{fs}" font-weight="{weight}" '
                f'fill="{fill}" text-anchor="{anchor}"{ls}{st}{op}{c}{extra}>{escape(s)}</text>')

    def overlaps(self):
        res = []
        B = self.boxes
        for i in range(len(B)):
            for j in range(i + 1, len(B)):
                a, b = B[i], B[j]
                if a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]:
                    res.append((a[4], b[4]))
        return res

# ------------------------------------------------------------------ 配置設定（px のオフセット）

# スポットのラベル: (dx, dy, anchor, 補足)
SPOT_LABEL = {
    1: (18, -3, "start", "島で一番早く朝日が見られる"),
    2: (-18, -3, "end", "夕日が海に沈む名所"),
    3: (17, 2, "start", "真珠浜と夕凪岬を一望"),
    4: (-14, 34, "middle", "島で唯一の海水浴場"),
    5: (18, -6, "start", None),
    6: (-17, 5, "end", None),
    7: (0, -37, "middle", "遊歩道と小さな滝"),
    8: (-17, 13, "end", "海鮮丼・島の特産品"),
    9: (14, -12, "start", "朝市 7:00〜9:00ごろ"),
    10: (0, -37, "middle", "収穫体験は秋〜冬"),
    11: (-17, 5, "end", "青いガラスの小物作り"),
    12: (17, 4, "start", "日帰り入浴"),
    13: (17, 4, "start", "参道の石段と大木"),
    14: (17, 4, "start", "島の漁業と暮らし"),
}
# スポット記号の表示位置の微調整（km 座標の点からの px ずれ。0 なら実位置）
SPOT_NUDGE = {6: (-21, 3)}

# 停留所の名前札: (dx, dy, anchor) 札の中心 or 端
STOP_LABEL = {
    "minato": (16, -14, "start"),
    "onsen": (0, 26, "middle"),
    "kankitsu": (0, 26, "middle"),
    "shinju": (14, -16, "start"),
    "yunagi": (14, 12, "start"),
    "jinja": (0, -22, "middle"),
    "keikoku": (0, 25, "middle"),
    "shizuura": (14, 18, "start"),
    "asahi": (-14, 16, "end"),
}

# ------------------------------------------------------------------ 記号（defs）


def defs_block(terrain_href, land_box):
    x0, y0, w, h = land_box
    return f'''
<defs>
  <radialGradient id="seaGrad" gradientUnits="userSpaceOnUse" cx="{CX}" cy="{CY}" r="980">
    <stop offset="0" stop-color="#4fb0d2"/>
    <stop offset="0.45" stop-color="#2f8fbf"/>
    <stop offset="1" stop-color="#17598c"/>
  </radialGradient>
  <radialGradient id="sunriseGlow" gradientUnits="userSpaceOnUse" cx="{W+40}" cy="{CY-10}" r="560">
    <stop offset="0" stop-color="#ffd27a" stop-opacity=".62"/>
    <stop offset=".45" stop-color="#ffc98a" stop-opacity=".22"/>
    <stop offset="1" stop-color="#ffc98a" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="sunsetGlow" gradientUnits="userSpaceOnUse" cx="-60" cy="{CY+40}" r="640">
    <stop offset="0" stop-color="#f7a1a6" stop-opacity=".62"/>
    <stop offset=".5" stop-color="#c6a0e0" stop-opacity=".24"/>
    <stop offset="1" stop-color="#c6a0e0" stop-opacity="0"/>
  </radialGradient>
  <filter id="blur6" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
  <filter id="blur3" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="mshadow" x="-50%" y="-50%" width="200%" height="200%">
    <feDropShadow dx="0" dy="1.6" stdDeviation="1.6" flood-color="#0b2533" flood-opacity=".38"/>
  </filter>
  <filter id="tshadow" x="-10%" y="-10%" width="120%" height="120%">
    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0b2a44" flood-opacity=".35"/>
  </filter>
  <clipPath id="islandClip"><path d="{{ISLAND_D}}"/></clipPath>
  <g id="tr1"><ellipse cx="1.3" cy="2.6" rx="4.8" ry="2.5" fill="#24502c" opacity=".22"/><circle r="4.5" fill="#5a9752"/><circle cx="-1.4" cy="-1.5" r="2.3" fill="#80b96a"/></g>
  <g id="tr2"><ellipse cx="1.2" cy="2.4" rx="4.3" ry="2.3" fill="#24502c" opacity=".22"/><circle r="4.0" fill="#4c8a4c"/><circle cx="-1.2" cy="-1.3" r="2.0" fill="#6fae62"/></g>
  <g id="tr3"><ellipse cx="1.2" cy="2.6" rx="4.4" ry="2.3" fill="#24502c" opacity=".2"/><path d="M0 -5.6 L4.2 2.8 L-4.2 2.8 Z" fill="#477f4a"/><path d="M0 -5.6 L-4.2 2.8 L-1 2.8 Z" fill="#68a35e"/></g>
  <g id="ot"><circle r="3.0" fill="#58964a"/><circle cx="-1" cy="-.9" r="1" fill="#f6a01f"/><circle cx="1.2" cy=".5" r="1" fill="#f38a12"/><circle cx="-.2" cy="1.4" r=".75" fill="#f9b13a"/></g>
  <g id="hs1"><rect x="-3.2" y="-2.3" width="6.4" height="4.6" rx=".6" fill="#d66a4c" stroke="#8c4733" stroke-width=".5"/><path d="M-3 0H3" stroke="#f0a38c" stroke-width=".7"/></g>
  <g id="hs2"><rect x="-3.2" y="-2.3" width="6.4" height="4.6" rx=".6" fill="#6f8eb0" stroke="#465f7a" stroke-width=".5"/><path d="M-3 0H3" stroke="#a9c1dc" stroke-width=".7"/></g>
  <g id="hs3"><rect x="-3.2" y="-2.3" width="6.4" height="4.6" rx=".6" fill="#f3efe4" stroke="#8d8577" stroke-width=".5"/><path d="M-3 0H3" stroke="#c9c1b0" stroke-width=".7"/></g>
  <g id="gt"><path d="M-2.2 1.2 L-1.2 -1.6 M0 1.2 L0 -2.2 M2.2 1.2 L1.2 -1.6" stroke="#7ea548" stroke-width=".9" stroke-linecap="round" fill="none"/></g>
  <g id="wv"><path d="M-7 0 q3.5 -3.4 7 0 t7 0" stroke="#e8fbff" stroke-width="1.2" fill="none" stroke-linecap="round"/></g>
  <g id="gull"><path d="M-6 0 q3 -3.6 6 0 q3 -3.6 6 0" stroke="#ffffff" stroke-width="1.4" fill="none" stroke-linecap="round"/></g>
  <g id="lighthouse">
    <path d="M-16 -20 L-3 -18.6 L-3 -16.6 L-16 -15 Z" fill="#fff3b8" opacity=".7"/>
    <path d="M16 -20 L3 -18.6 L3 -16.6 L16 -15 Z" fill="#fff3b8" opacity=".7"/>
    <path d="M-3.6 0 L-2.4 -15 L2.4 -15 L3.6 0 Z" fill="#ffffff" stroke="#2c4a5c" stroke-width=".9"/>
    <path d="M-3.1 -6 L3.1 -6" stroke="#2c4a5c" stroke-width=".7"/>
    <rect x="-3.2" y="-16" width="6.4" height="1.6" fill="#2c4a5c"/>
    <rect x="-2.2" y="-19.6" width="4.4" height="3.6" fill="#ffe083" stroke="#2c4a5c" stroke-width=".8"/>
    <path d="M-3 -19.6 L3 -19.6 L0 -23 Z" fill="#2c4a5c"/>
  </g>
  <g id="torii">
    <path d="M-10 -14.2 Q0 -16.4 10 -14.2 L10 -11.8 Q0 -13.8 -10 -11.8 Z" fill="#d43d2c"/>
    <rect x="-7.6" y="-9.6" width="15.2" height="1.9" fill="#d43d2c"/>
    <rect x="-6.4" y="-12.4" width="2.3" height="12.4" fill="#d43d2c"/>
    <rect x="4.1" y="-12.4" width="2.3" height="12.4" fill="#d43d2c"/>
  </g>
  <g id="onsen" fill="none" stroke="#d9483b" stroke-linecap="round">
    <path d="M-6.5 -1 A6.5 3.6 0 1 0 6.5 -1" stroke-width="2"/>
    <path d="M-3.2 -3.6 q-1.6 -2 0 -4 q1.6 -2 0 -4 M0 -3.6 q-1.6 -2 0 -4 q1.6 -2 0 -4 M3.2 -3.6 q-1.6 -2 0 -4 q1.6 -2 0 -4" stroke-width="1.6"/>
  </g>
  <g id="fall">
    <path d="M-5 -6 L5 -6 L4 -3 L-4 -3 Z" fill="#7d8b78"/>
    <path d="M-2.4 -3 V5 M0 -3 V6 M2.4 -3 V5" stroke="#e6f6ff" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M-2.4 -3 V5 M0 -3 V6 M2.4 -3 V5" stroke="#5fb4e6" stroke-width=".6" stroke-linecap="round"/>
    <ellipse cx="0" cy="6.5" rx="5" ry="1.6" fill="#bfe6fb"/>
  </g>
  <g id="parasol">
    <path d="M0 -7 L0 4" stroke="#6b5a48" stroke-width="1"/>
    <path d="M-7 -6 A7 5.5 0 0 1 7 -6 Z" fill="#ff7b5c"/>
    <path d="M-2.4 -10.9 A7 5.5 0 0 1 2.4 -10.9 L0 -6 Z" fill="#ffffff"/>
    <path d="M-7 -6 L-4.6 -9.8 L-2.4 -6 Z M7 -6 L4.6 -9.8 L2.4 -6 Z" fill="#ffffff" opacity=".9"/>
  </g>
  <g id="ferry">
    <path d="M-22 -1 L18 -1 L24 -7 L-23 -7 Z" fill="#ffffff" stroke="#173a5c" stroke-width="1"/>
    <path d="M-21 -3.4 L20.6 -3.4" stroke="#1f4f9e" stroke-width="1.6"/>
    <rect x="-12" y="-13" width="20" height="6" rx="1" fill="#ffffff" stroke="#173a5c" stroke-width="1"/>
    <path d="M-9 -10 H5" stroke="#7fb6d8" stroke-width="1.6" stroke-dasharray="2 1.2"/>
    <rect x="-6" y="-17.5" width="4" height="4.5" fill="#e2564a" stroke="#173a5c" stroke-width=".8"/>
  </g>
  <g id="jet">
    <path d="M-17 -1 L12 -1 Q19 -3 20 -6 L-16 -6 Z" fill="#ffffff" stroke="#173a5c" stroke-width="1"/>
    <path d="M-8 -6 L-6 -10 L9 -10 L13 -6 Z" fill="#cfe8f6" stroke="#173a5c" stroke-width=".9"/>
    <path d="M-15 -3.4 L16 -3.4" stroke="#e2564a" stroke-width="1.3"/>
  </g>
  <g id="fishboat">
    <path d="M-7 0 L6 0 L8.5 -3.2 L-7.5 -3.2 Z" fill="#ffffff" stroke="#173a5c" stroke-width=".8"/>
    <rect x="-3.6" y="-6.6" width="4.4" height="3.4" fill="#e9eef2" stroke="#173a5c" stroke-width=".7"/>
    <path d="M3 -3.2 L3 -9" stroke="#173a5c" stroke-width=".8"/>
  </g>
  <g id="sunup">
    <path d="M-9 0 A9 9 0 0 1 9 0 Z" fill="#ffb53d"/>
    <g stroke="#ffb53d" stroke-width="2" stroke-linecap="round">
      <path d="M0 -12 V-15.5 M8.5 -8.5 L11 -11 M-8.5 -8.5 L-11 -11 M12 -3 H15.5 M-12 -3 H-15.5"/>
    </g>
    <path d="M-15 0 H15" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>
  </g>
  <g id="sundown">
    <path d="M-9 0 A9 9 0 0 1 9 0 Z" fill="#ff7a5a"/>
    <path d="M-15 0 H15 M-10 3.4 H10 M-6 6.8 H6" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>
  </g>
  <g id="busg">
    <rect x="-6" y="-6.5" width="12" height="11.5" rx="2.4" fill="currentColor"/>
    <rect x="-4.4" y="-4.8" width="8.8" height="4.4" rx="1" fill="#ffffff"/>
    <circle cx="-3.4" cy="2.4" r="1" fill="#ffffff"/><circle cx="3.4" cy="2.4" r="1" fill="#ffffff"/>
    <rect x="-5" y="5" width="2.4" height="1.8" rx=".6" fill="currentColor"/><rect x="2.6" y="5" width="2.4" height="1.8" rx=".6" fill="currentColor"/>
  </g>
  <g id="bike" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="-5" cy="2" r="3.6"/><circle cx="5" cy="2" r="3.6"/>
    <path d="M-5 2 L-1.6 -4 L3.6 -4 L5 2 M-1.6 -4 L0.4 2 L3.6 -4 M-2.8 -6 H-0.4 M3 -6.4 L4.6 -6.4"/>
  </g>
  <g id="shipg">
    <path d="M-7 0 L7 0 L5 4 L-5 4 Z" fill="currentColor"/>
    <path d="M-4 0 V-4 H3 V0" fill="currentColor"/><path d="M-1 -4 V-7 H1.5 V-4" fill="currentColor"/>
  </g>
</defs>'''


# ------------------------------------------------------------------ 本体


def build_map_svg(g, t, web=True):
    island = g["island"]
    L = Labels()
    out = []
    coast_px = pxa(g["coast"])
    island_d = path_d(coast_px, True, tol=0.3)

    # 地形画像（JPEG）
    X0, X1, Y0, Y1 = t["extent"]
    lx, ly = px((X0, Y1))
    lw, lh = (X1 - X0) * S, (Y1 - Y0) * S
    buf = io.BytesIO()
    t["img"].save(buf, format="JPEG", quality=88, optimize=True, progressive=True)
    terrain_href = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")

    out.append(f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
               f'viewBox="0 0 {W} {H}" width="{W}" height="{H}" class="aoi-map" role="img" '
               f'aria-labelledby="mapTitle mapDesc">')
    out.append('<title id="mapTitle">あおい島 観光マップ</title>')
    out.append('<desc id="mapDesc">あおい島の地形、観光スポット14か所、周回線バス（あおい港から時計回り）の停留所9か所、'
               '登山道、本土の蒼玉港への航路を示した地図。北が上。</desc>')
    out.append(defs_block(terrain_href, (lx, ly, lw, lh)).replace("{ISLAND_D}", island_d))

    # ---------------- 海
    out.append(f'<rect width="{W}" height="{H}" fill="url(#seaGrad)"/>')
    out.append(f'<rect width="{W}" height="{H}" fill="url(#sunriseGlow)"/>')
    out.append(f'<rect width="{W}" height="{H}" fill="url(#sunsetGlow)"/>')

    # 浅瀬
    sh1 = island.buffer(0.34, resolution=24)
    sh2 = island.buffer(0.15, resolution=24)
    out.append(f'<path d="{geom_d(sh1, 0.6)}" fill="#5fc0d0" opacity=".55" filter="url(#blur6)"/>')
    out.append(f'<path d="{geom_d(sh2, 0.5)}" fill="#a6e4dc" opacity=".75" filter="url(#blur3)"/>')
    # 海岸に寄せる波紋
    rip = []
    for d, op, wd in [(0.05, .75, 1.3), (0.10, .52, 1.1), (0.17, .36, 1.0), (0.26, .24, .9), (0.38, .14, .8)]:
        ring = island.buffer(d, resolution=24)
        rip.append(f'<path d="{geom_d(ring, 0.6)}" fill="none" stroke="#f2fdff" stroke-opacity="{op}" stroke-width="{wd}"/>')
    out.append('<g class="ripples">' + "".join(rip) + '</g>')

    # ---------------- 航路（本土 蒼玉港 方面）
    fr = pxa(g["ferry_route"])
    fr_d = path_d(fr, False, 0.4)
    out.append(f'<path d="{fr_d}" fill="none" stroke="#123e66" stroke-opacity=".25" stroke-width="6"/>')
    out.append(f'<path d="{fr_d}" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-dasharray="10 7" stroke-linecap="round"/>')
    frs = cum_len(fr)
    # 矢印（両方向の航路なので両端に）
    p_end, a_end = point_at(fr, frs, frs[-1] - 26)
    out.append(f'<path d="M0 -7 L14 0 L0 7 Z" fill="#ffffff" transform="translate({p_end[0]:.1f},{p_end[1]:.1f}) rotate({a_end:.1f})"/>')
    # 船
    pf, af = point_at(fr, frs, frs[-1] * 0.42)
    out.append(f'<use href="#ferry" transform="translate({pf[0]:.1f},{pf[1]:.1f}) rotate({af:.1f})"/>')
    pj, aj = point_at(fr, frs, frs[-1] * 0.74)
    out.append(f'<use href="#jet" transform="translate({pj[0]+12:.1f},{pj[1]-16:.1f}) rotate({aj:.1f})"/>')

    # ---------------- 外洋の波・カモメ
    rng = np.random.default_rng(11)
    keep_out = [island.buffer(0.55)]
    sea_marks = []
    reserved_px = [(0, 0, 250, 500), (16, 800, 330, 1040), (1325, 760, 1595, 905), (1450, 30, 1590, 170),
                   (1180, 880, 1600, 1050)]
    ko = prep(unary_union(keep_out))
    tries = 0
    pts_waves = []
    while len(pts_waves) < 46 and tries < 4000:
        tries += 1
        x, y = rng.uniform(20, W - 20), rng.uniform(20, H - 20)
        kx, ky = (x - CX) / S, (CY - y) / S
        if ko.contains(Point(kx, ky)):
            continue
        if any(a <= x <= c and b <= y <= d for a, b, c, d in reserved_px):
            continue
        if any((x - u) ** 2 + (y - v) ** 2 < 95 ** 2 for u, v in pts_waves):
            continue
        pts_waves.append((x, y))
    for x, y in pts_waves:
        sc = rng.uniform(0.75, 1.15)
        sea_marks.append(f'<use href="#wv" transform="translate({x:.0f},{y:.0f}) scale({sc:.2f})" opacity="{rng.uniform(.35,.6):.2f}"/>')
    out.append('<g class="waves">' + "".join(sea_marks) + '</g>')
    for (x, y, s) in [(1430, 610, 1.0), (1452, 598, .8), (230, 690, .9), (700, 120, .85), (722, 132, .7)]:
        out.append(f'<use href="#gull" transform="translate({x},{y}) scale({s})" opacity=".9"/>')

    # ---------------- 陸
    out.append(f'<image href="{terrain_href}" x="{lx:.1f}" y="{ly:.1f}" width="{lw:.1f}" height="{lh:.1f}" '
               f'preserveAspectRatio="none" clip-path="url(#islandClip)"/>')

    # 等高線
    cont = []
    for lv, lines in t["contours"].items():
        idx = lv % 100 == 0
        for ln in lines:
            cont.append(f'<path d="{km_path(ln, False, 0.5)}" stroke-width="{0.9 if idx else 0.55}" '
                        f'stroke-opacity="{0.34 if idx else 0.2}"/>')
    out.append(f'<g class="contours" fill="none" stroke="#3f5f2e" clip-path="url(#islandClip)">{"".join(cont)}</g>')

    # 土地利用: 草原（風の丘）
    grass = Polygon(g["grassland"]).buffer(0.03).intersection(island.buffer(-0.04))
    out.append(f'<path d="{geom_d(grass)}" fill="#e3eda7" opacity=".78" filter="url(#blur3)"/>')
    # 柑橘園
    orchard = Polygon(g["orchard"]).intersection(island.buffer(-0.05))
    out.append(f'<path d="{geom_d(orchard)}" fill="#d9e7a0" opacity=".7" filter="url(#blur3)"/>')
    # 集落
    for key in ["aoi_village", "shizu_village"]:
        vil = Polygon(g[key]).buffer(0.02).intersection(island.buffer(-0.02))
        out.append(f'<path d="{geom_d(vil)}" fill="#efe8d6" opacity=".55" filter="url(#blur3)"/>')
    # 砂浜（真珠浜）
    out.append(f'<path d="{geom_d(g["beach"])}" fill="#fbf3dc" opacity=".95"/>')

    # 川・池
    stp = pxa(g["stream"])
    n = len(stp)
    up, low = stp[: int(n * 0.45)], stp[int(n * 0.42):]
    out.append(f'<path d="{path_d(stp)}" fill="none" stroke="#ffffff" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/>')
    out.append(f'<path d="{path_d(up)}" fill="none" stroke="#3d9ad6" stroke-width="1.8" stroke-linecap="round"/>')
    out.append(f'<path d="{path_d(low)}" fill="none" stroke="#3d9ad6" stroke-width="2.6" stroke-linecap="round"/>')
    kx, ky = px(g["kagami"])
    out.append(f'<ellipse cx="{kx+1:.1f}" cy="{ky:.1f}" rx="7.6" ry="5" fill="#62bce8" stroke="#2c7fb5" stroke-width="1"/>'
               f'<ellipse cx="{kx-2:.1f}" cy="{ky-1.4:.1f}" rx="2.4" ry="1" fill="#ffffff" opacity=".8"/>')

    # ---------------- 港（防波堤・岸壁）
    port = []
    for b in g["aoi_breakwaters"] + g["shizu_breakwater"] + [g["aoi_quay"]]:
        d = km_path(b, False, 0.2)
        port.append(f'<path d="{d}" fill="none" stroke="#5f7179" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
                    f'<path d="{d}" fill="none" stroke="#eef0ee" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>')
    out.append('<g class="port">' + "".join(port) + '</g>')
    # 海岸線
    out.append(f'<path d="{island_d}" fill="none" stroke="#24677a" stroke-width="1.15" stroke-opacity=".85"/>')
    # 真珠浜の白い波打ち際
    a, b = g["beach_ab"]
    ext = island.exterior
    sa, sb = ext.project(Point(a)), ext.project(Point(b))
    lo, hi = sorted([sa, sb])
    seg = [ext.interpolate(s) for s in np.linspace(lo, hi, 160)]
    seg_px = pxa([(p.x, p.y) for p in seg])
    out.append(f'<path d="{path_d(seg_px, False, 0.3)}" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-dasharray="7 3" stroke-linecap="round" opacity=".95" transform="translate(0,2.2)"/>')

    spot_xy = {}
    for no, p in g["spots"].items():
        x, y = px(p)
        dx, dy = SPOT_NUDGE.get(no, (0, 0))
        spot_xy[no] = (x + dx, y + dy)
    road = pxa(g["road"])
    road_d = path_d(road, True, 0.25)
    if web:
        out.append(course_paths(g, road_d))

    # ---------------- 道・登山道
    def trail(key, kind):
        d = km_path(g[key], False, 0.3)
        if kind == "hike":
            return (f'<path d="{d}" fill="none" stroke="#fffaf0" stroke-opacity=".85" stroke-width="5.2" stroke-linecap="round"/>'
                    f'<path d="{d}" fill="none" stroke="{TRAIL}" stroke-width="2.3" stroke-dasharray="6.5 3.8" stroke-linecap="round"/>')
        return (f'<path d="{d}" fill="none" stroke="#fffaf0" stroke-opacity=".8" stroke-width="4.6" stroke-linecap="round"/>'
                f'<path d="{d}" fill="none" stroke="{TRAIL}" stroke-width="2.7" stroke-dasharray="0.1 4.6" stroke-linecap="round"/>')
    out.append('<g class="layer-trails">' + trail("trail_s", "hike") + trail("trail_nw", "hike") +
               "".join(trail(k, "walk") for k in ["walk_kaze", "walk_yunagi", "walk_asahi", "walk_onsen",
                                                   "walk_jinja", "walk_keikoku", "walk_town_11", "walk_town_14"]) + '</g>')

    # ---------------- 周回道路とバス路線
    out.append(f'<g class="layer-road"><path d="{road_d}" fill="none" stroke="#7d6f56" stroke-width="10" stroke-linejoin="round"/>'
               f'<path d="{road_d}" fill="none" stroke="#fffaf0" stroke-width="7.6" stroke-linejoin="round"/></g>')
    # バス路線（時計回り）＋向きの矢印
    arrows = []
    rc = np.vstack([road, road[:1]])
    rs = cum_len(rc)
    stop_s_px = [rs[min(s["i"], len(rs) - 1)] for s in g["stops"]]
    step = 92.0
    s = 46.0
    while s < rs[-1] - 20:
        if all(abs(s - q) > 30 and abs(s - q - rs[-1]) > 30 and abs(s - q + rs[-1]) > 30 for q in stop_s_px):
            p, ang = point_at(rc, rs, s)
            arrows.append(f'<path d="M-5.5 -5.2 L6.5 0 L-5.5 5.2 L-3 0 Z" transform="translate({p[0]:.1f},{p[1]:.1f}) rotate({ang:.1f})"/>')
        s += step
    out.append(f'<g class="layer-bus"><path d="{road_d}" fill="none" stroke="{BUSC}" stroke-width="4.2" stroke-linejoin="round"/>'
               f'<g fill="{BUSC}" stroke="#ffffff" stroke-width="1.3" stroke-linejoin="round">{"".join(arrows)}</g></g>')

    # 道路名（北海岸沿い、道路の内陸側に沿わせる）
    sj = next(st for st in g["stops"] if st["id"] == "jinja")["s"]
    road_km = g["road"]
    s_km = g["road_s"]
    m = (s_km > sj + 0.55) & (s_km < sj + 3.1)
    seg_km = road_km[m]
    nrm = geo.normals(seg_km, closed=False)
    seg_km = seg_km + nrm * 0.085   # 右手（内陸）側へ
    seg_km = geo.resample(seg_km, 0.01)
    k = np.ones(25) / 25
    sm = np.column_stack([np.convolve(np.pad(seg_km[:, i], 12, mode="edge"), k, mode="valid") for i in range(2)])
    road_name_path = sm

    # ---------------- ラベル・記号の配置計算（木の除外に使う）
    stop_xy = {st["id"]: px(st["xy"]) for st in g["stops"]}

    # ---------------- 地物の絵（灯台・鳥居・温泉・滝・パラソル・漁船）
    pics = []
    lhx, lhy = px(g["lighthouse"])
    pics.append(f'<use href="#lighthouse" transform="translate({lhx+12:.1f},{lhy-7:.1f}) scale(1.3)"/>')
    tx, ty = spot_xy[13]
    pics.append(f'<use href="#torii" transform="translate({tx-2:.1f},{ty-15:.1f}) scale(1.05)"/>')
    ox, oy = spot_xy[12]
    pics.append(f'<use href="#onsen" transform="translate({ox-24:.1f},{oy+4:.1f}) scale(1.05)"/>')
    wx, wy = spot_xy[7]
    pics.append(f'<use href="#fall" transform="translate({wx+20:.1f},{wy+3:.1f}) scale(1.15)"/>')
    for (bx, by) in [(-2.05, -1.585), (-1.92, -1.64), (-2.42, -1.475)]:
        x, y = px((bx, by))
        pics.append(f'<use href="#parasol" transform="translate({x:.1f},{y:.1f}) scale(.95)"/>')
    for (fx, fy, rot) in [(2.42, 1.30, -60), (2.45, 1.44, -75), (2.06, 1.62, 15), (3.55, 0.85, 20), (1.20, 2.30, -10)]:
        x, y = px((fx, fy))
        pics.append(f'<use href="#fishboat" transform="translate({x:.1f},{y:.1f}) rotate({rot})"/>')
    # 朝日・夕日の記号
    sx1, sy1 = px((3.66, 0.24))
    pics.append(f'<use href="#sunup" transform="translate({sx1:.1f},{sy1:.1f}) scale(1.25)"/>')
    sx2, sy2 = px((-3.68, 0.10))
    pics.append(f'<use href="#sundown" transform="translate({sx2:.1f},{sy2:.1f}) scale(1.25)"/>')

    # ---------------- ラベル（先に箱を登録して、木を避けさせる）
    labels_svg = []
    # 地名（地形・集落）
    def place(x, y, s, **kw):
        labels_svg.append(L.text(x, y, s, **kw))
    sx_, sy_ = px(g["summit"])
    # 静浦湾
    bx, by = px((2.20, 1.38))
    place(bx, by, "静浦湾", fs=17, weight=800, fill="#ffffff", anchor="middle", font="min", spacing=5,
          halo=3.2, halo_color="#2a7aa6", name="静浦湾")
    vx, vy = px((1.98, -0.92))
    place(vx, vy, "あおい集落", fs=12.5, weight=700, fill="#6b5a3a", anchor="middle", spacing=3, halo=3.4)
    v2x, v2y = px((2.90, 0.87))
    place(v2x, v2y, "静浦集落", fs=12, weight=700, fill="#6b5a3a", anchor="middle", spacing=2, halo=3.2)
    gx, gy = px((-2.42, -0.40))
    place(gx, gy, "風の丘", fs=15, weight=800, fill="#5e7f2c", anchor="middle", font="min", spacing=4, halo=3.4)
    hx, hy = px((2.58, 1.62))
    place(hx - 4, hy - 8, "静浦漁港", fs=11.5, weight=700, fill="#ffffff", anchor="end", halo=3, halo_color="#2a7aa6")

    # 停留所の名前札（白抜きの紺の札）
    stop_svg = []
    for st in g["stops"]:
        x, y = stop_xy[st["id"]]
        dx, dy, anc = STOP_LABEL[st["id"]]
        name = st["name"]
        fs = 12.5
        tw = text_w(name, fs) + 16
        badge = st["id"] == "minato"
        bw = tw + (40 if badge else 0)
        cxl = x + dx
        if anc == "start":
            x0 = cxl
        elif anc == "middle":
            x0 = cxl - bw / 2
        else:
            x0 = cxl - bw
        y0 = y + dy - 10.5
        L.add_box(x0, y0, x0 + bw, y0 + 21, f"stop:{name}")
        lead = ""
        # 札が円から離れているときは細い引き出し線
        ccx = min(max(x, x0), x0 + bw)
        ccy = min(max(y, y0), y0 + 21)
        if math.hypot(ccx - x, ccy - y) > 11:
            lead = f'<path d="M{x:.1f} {y:.1f} L{ccx:.1f} {ccy:.1f}" stroke="{BUSC}" stroke-width="1.4"/>'
        extra = ""
        if badge:
            extra = (f'<rect x="{x0+tw-1:.1f}" y="{y0+2.5:.1f}" width="38" height="16" rx="8" fill="#ffffff"/>'
                     f'<text x="{x0+tw+18:.1f}" y="{y0+14.6:.1f}" font-family="{FONT_MARU}" font-size="10.5" font-weight="900" '
                     f'fill="{BUSC}" text-anchor="middle">起点</text>')
        stop_svg.append(
            f'<g class="stop" id="stop-{st["id"]}" data-stop="{st["id"]}" data-no="{st["no"]}">'
            f'{lead}<circle cx="{x:.1f}" cy="{y:.1f}" r="8.8" fill="#ffffff" stroke="{BUSC}" stroke-width="3.2"/>'
            f'<text x="{x:.1f}" y="{y+3.7:.1f}" font-family="{FONT_MARU}" font-size="10.5" font-weight="900" fill="{BUSC}" text-anchor="middle">{st["no"]}</text>'
            f'<rect x="{x0:.1f}" y="{y0:.1f}" width="{bw:.1f}" height="21" rx="10.5" fill="{BUSC}" stroke="#ffffff" stroke-width="1.4"/>'
            f'<text x="{x0+tw/2:.1f}" y="{y0+15:.1f}" font-family="{FONT_MARU}" font-size="{fs}" font-weight="700" '
            f'fill="#ffffff" text-anchor="middle">{escape(name)}</text>{extra}</g>')

    # スポット
    spot_svg = []
    for sp in SPOTS:
        no = sp["no"]
        x, y = spot_xy[no]
        col = GROUPS[sp["group"]]["color"]
        dx, dy, anc, sub = SPOT_LABEL[no]
        name = sp["short"]
        if no == 5:
            # あおい岳は山名を明朝で大きく
            t1 = L.text(x + dx, y + dy, "あおい岳", fs=22, weight=800, fill="#5a3d22", font="min", spacing=2, halo=4.2,
                        name="あおい岳")
            t2 = L.text(x + dx + 2, y + dy + 17, "標高428m・島の最高峰", fs=11.5, weight=700, fill="#6b4a2b", halo=3.4,
                        name="あおい岳sub")
            texts = t1 + t2
        else:
            fs = 15.5
            texts = L.text(x + dx, y + dy, name, fs=fs, weight=800, fill=INK, anchor=anc, halo=4.4, name=name)
            if sub:
                texts += L.text(x + dx, y + dy + 15.5, sub, fs=11.5, weight=700, fill=SUB, anchor=anc, halo=3.6,
                                name=name + "sub")
        L.add_box(x - 13, y - 13, x + 13, y + 13, f"marker:{no}")
        nfs = 14 if no < 10 else 12.5
        aria = f'{no} {sp["name"]}（{GROUPS[sp["group"]]["label"]}）'
        in_courses = " ".join(cid for cid, c in COURSES.items() if no in c["spots"])
        spot_svg.append(
            f'<g class="spot" id="spot-{no}" data-no="{no}" data-group="{sp["group"]}" data-courses="{in_courses}" tabindex="0" role="button" '
            f'aria-label="{escape(aria)}">'
            f'<circle class="hit" cx="{x:.1f}" cy="{y:.1f}" r="21" fill="transparent"/>'
            f'<circle class="pin" cx="{x:.1f}" cy="{y:.1f}" r="12.6" fill="{col}" stroke="#ffffff" stroke-width="2.6" filter="url(#mshadow)"/>'
            f'<text x="{x:.1f}" y="{y+nfs*0.36:.1f}" font-family="{FONT_MARU}" font-size="{nfs}" font-weight="900" '
            f'fill="#ffffff" text-anchor="middle">{no}</text>'
            f'<g class="spot-label">{texts}</g></g>')

    # ---------------- 木・家・草・柑橘の木（ラベルや道を避けて置く）
    road_ls = LineString(g["road"])
    lines_km = [g[k] for k in ["trail_s", "trail_nw", "walk_kaze", "walk_yunagi", "walk_asahi", "walk_onsen",
                               "walk_jinja", "walk_keikoku", "walk_town_11", "walk_town_14", "stream"]]
    excl_km = [road_ls.buffer(0.06)] + [LineString(l).buffer(0.035) for l in lines_km]
    excl_km.append(island.exterior.buffer(0.07))
    for key in ["aoi_village", "shizu_village", "orchard", "grassland"]:
        excl_km.append(Polygon(g[key]).buffer(0.02))
    excl_km.append(Point(g["kagami"]).buffer(0.05))
    excl_km.append(LineString(road_name_path).buffer(0.06))
    excl_km.append(g["beach"].buffer(0.03))
    for (x0, y0, x1, y1, _n) in L.boxes:
        excl_km.append(box((x0 - 3 - CX) / S, (CY - y1 - 3) / S, (x1 + 3 - CX) / S, (CY - y0 + 3) / S))
    for (x, y) in list(stop_xy.values()):
        excl_km.append(Point((x - CX) / S, (CY - y) / S).buffer(0.05))
    pic_spots = [(lhx + 13, lhy - 14, 18), (tx - 2, ty - 22, 14), (ox - 24, oy - 2, 12), (wx + 20, wy + 3, 10)]
    for (x, y, r) in pic_spots:
        excl_km.append(Point((x - CX) / S, (CY - y) / S).buffer(r / S))
    excl = prep(unary_union(excl_km))
    isl_in = prep(island.buffer(-0.05))

    forest = t["forest"]
    fx0, fx1, fy0, fy1 = t["extent"]
    cell = (fx1 - fx0) / forest.shape[1]

    def forest_at(xk, yk):
        j = int((xk - fx0) / cell)
        i = int((fy1 - yk) / cell)
        if 0 <= i < forest.shape[0] and 0 <= j < forest.shape[1]:
            return float(forest[i, j]), float(t["h"][i, j])
        return 0.0, 0.0

    rng = np.random.default_rng(2026)
    trees = []
    occupied = {}
    minr = 11.5
    from terrain import fbm as _fbm
    clump = _fbm(forest.shape, np.random.default_rng(31), octaves=4, base=9, persistence=0.55)
    clump = np.clip(0.5 + 1.5 * clump, 0, 1)

    def free(x, y, r):
        gx_, gy_ = int(x // 12), int(y // 12)
        for ii in range(gx_ - 1, gx_ + 2):
            for jj in range(gy_ - 1, gy_ + 2):
                for (u, v) in occupied.get((ii, jj), []):
                    if (x - u) ** 2 + (y - v) ** 2 < r * r:
                        return False
        return True

    for _ in range(26000):
        xk, yk = rng.uniform(-3.4, 3.4), rng.uniform(-2.1, 2.1)
        fval, hval = forest_at(xk, yk)
        jj = int((xk - fx0) / cell)
        ii = int((fy1 - yk) / cell)
        cl = clump[min(max(ii, 0), clump.shape[0] - 1), min(max(jj, 0), clump.shape[1] - 1)]
        if fval < 0.15 or rng.random() > fval ** 1.4 * (0.12 + 0.88 * cl) * 0.8:
            continue
        if math.dist((xk, yk), tuple(g["summit"])) < 0.22:
            continue
        P_ = Point(xk, yk)
        if not isl_in.contains(P_) or excl.contains(P_):
            continue
        x, y = px((xk, yk))
        if not free(x, y, minr):
            continue
        occupied.setdefault((int(x // 12), int(y // 12)), []).append((x, y))
        kind = "tr3" if (hval > 250 and rng.random() < 0.55) else ("tr1" if rng.random() < 0.6 else "tr2")
        sc = rng.uniform(0.85, 1.15)
        trees.append((y, f'<use href="#{kind}" x="{x:.0f}" y="{y:.0f}"' + (f' transform="scale(1)"' if False else "") + '/>'))
    trees.sort()
    out.append('<g class="trees">' + "".join(tv for _, tv in trees) + '</g>')

    # 柑橘園の木（列植え）
    orch = prep(Polygon(g["orchard"]).buffer(-0.025))
    ot = []
    for yy in np.arange(-1.75, -1.15, 0.05):
        for xx in np.arange(-1.45, -0.5, 0.056):
            xk = xx + (0.026 if int(round(yy / 0.05)) % 2 else 0) + rng.normal(0, 0.004)
            Pk = Point(xk, yy)
            if orch.contains(Pk) and not excl_label_hit(L.boxes, *px((xk, yy)), 6) and \
                    road_ls.distance(Pk) > 0.05:
                x, y = px((xk, yy))
                ot.append(f'<use href="#ot" x="{x:.1f}" y="{y:.1f}"/>')
    out.append('<g class="orchard">' + "".join(ot) + '</g>')

    # 草原の草
    gr = prep(Polygon(g["grassland"]).buffer(-0.03))
    gts = []
    for _ in range(900):
        xk, yk = rng.uniform(-3.0, -2.15), rng.uniform(-1.15, -0.3)
        Pk = Point(xk, yk)
        if gr.contains(Pk) and road_ls.distance(Pk) > 0.05 and LineString(g["walk_kaze"]).distance(Pk) > 0.03:
            x, y = px((xk, yk))
            if not excl_label_hit(L.boxes, x, y, 4):
                gts.append(f'<use href="#gt" x="{x:.0f}" y="{y:.0f}"/>')
        if len(gts) > 70:
            break
    out.append('<g class="grass">' + "".join(gts) + '</g>')

    # 家並み
    houses = []
    for key, n_target in [("aoi_village", 120), ("shizu_village", 46)]:
        poly = Polygon(g[key])
        pp = prep(poly.intersection(island.buffer(-0.035)))
        occ = []
        tries = 0
        while len(occ) < n_target and tries < 9000:
            tries += 1
            minx, miny, maxx, maxy = poly.bounds
            xk, yk = rng.uniform(minx, maxx), rng.uniform(miny, maxy)
            Pk = Point(xk, yk)
            if not pp.contains(Pk):
                continue
            dr = road_ls.distance(Pk)
            if dr < 0.042:
                continue
            x, y = px((xk, yk))
            if excl_label_hit(L.boxes, x, y, 5):
                continue
            if any((x - u) ** 2 + (y - v) ** 2 < 8.6 ** 2 for u, v in occ):
                continue
            if any(LineString(g[k]).distance(Pk) < 0.025 for k in ["walk_town_11", "walk_town_14"]):
                continue
            # 道路に近いほど家が建ちやすい
            if rng.random() > math.exp(-max(dr - 0.05, 0) / 0.18):
                continue
            occ.append((x, y))
            # 最寄りの道路の向きにそろえる
            q = road_ls.interpolate(road_ls.project(Pk))
            q2 = road_ls.interpolate(road_ls.project(Pk) + 0.01)
            ang = -math.degrees(math.atan2(q2.y - q.y, q2.x - q.x)) + rng.normal(0, 8)
            kind = rng.choice(["hs1", "hs1", "hs2", "hs3", "hs3"])
            houses.append(f'<use href="#{kind}" transform="translate({x:.1f},{y:.1f}) rotate({ang:.0f})"/>')
    out.append('<g class="houses">' + "".join(houses) + '</g>')

    out.append('<g class="pictures">' + "".join(pics) + '</g>')
    # フェリーターミナル・レンタサイクル
    tmx, tmy = px(g["terminal"])
    out.append(f'<g class="terminal"><rect x="{tmx-9:.1f}" y="{tmy-6:.1f}" width="18" height="12" rx="2.5" fill="#ffffff" stroke="{BUSC}" stroke-width="1.6"/>'
               f'<use href="#shipg" transform="translate({tmx:.1f},{tmy-0.5:.1f}) scale(.8)" style="color:{BUSC}"/></g>')
    cyx, cyy = px(g["cycle"])
    out.append(f'<g class="cycle"><circle cx="{cyx+8:.1f}" cy="{cyy+3:.1f}" r="8.6" fill="#ffffff" stroke="#2f8a6a" stroke-width="1.6"/>'
               f'<use href="#bike" transform="translate({cyx+8:.1f},{cyy+2.6:.1f}) scale(.72)" style="color:#2f8a6a"/></g>')


    # ---------------- 地名ラベル → 停留所 → スポット（上ほど手前）
    out.append(f'<path id="roadNamePath" d="{km_path(road_name_path, False, 0.4)}" fill="none"/>')
    out.append(f'<text font-family="{FONT_MARU}" font-size="12.5" font-weight="700" fill="#6b5a3a" letter-spacing="2.2" '
               f'stroke="#fffaf0" stroke-width="3.4" stroke-linejoin="round" paint-order="stroke">'
               f'<textPath href="#roadNamePath" startOffset="50%" text-anchor="middle">あおい島周回線（あおいライン）</textPath></text>')
    out.append('<g class="place-labels">' + "".join(labels_svg) + '</g>')
    out.append('<g class="layer-stops">' + "".join(stop_svg) + '</g>')
    out.append('<g class="layer-spots">' + "".join(spot_svg) + '</g>')
    if web:
        out.append(course_steps(spot_xy))

    # ---------------- 図の部品：タイトル・方位・凡例・縮尺・航路の案内
    out.append(furniture(g, L))
    out.append('</svg>')
    return "\n".join(out), L


def excl_label_hit(boxes, x, y, r):
    for (x0, y0, x1, y1, _n) in boxes:
        if x0 - r <= x <= x1 + r and y0 - r <= y <= y1 + r:
            return True
    return False

# ------------------------------------------------------------------ コース


COURSES = {
    "A": {"spots": [8, 11, 14], "walk": ["walk_town_11", "walk_town_14"], "bus": False},
    "B": {"spots": [4, 3, 2], "walk": ["walk_kaze", "walk_yunagi"], "bus": True},
    "C": {"spots": [6, 5, 12], "walk": ["walk_onsen", "trail_s"], "bus": True},
    "D": {"spots": [10, 4, 3, 2, 13, 7, 1, 8], "walk": ["walk_kaze", "walk_yunagi", "walk_jinja", "walk_keikoku",
                                                        "walk_asahi"], "bus": True},
}


def course_paths(g, road_d):
    parts = ['<g class="courses">']
    for cid, c in COURSES.items():
        segs = []
        if c["bus"]:
            segs.append(f'<path d="{road_d}" class="course-road"/>')
        for k in c["walk"]:
            segs.append(f'<path d="{km_path(g[k], False, 0.3)}" class="course-walk"/>')
        if cid == "A":
            segs.append(f'<path d="{km_path([g["terminal"], (2.27, -1.55), (2.19, -1.53)], False, 0.3)}" class="course-walk"/>')
            segs.append(f'<path d="{km_path([(2.19, -1.53), (2.17, -1.40), (2.12, -1.27), g["spots"][11]], False, 0.3)}" class="course-walk"/>')
            segs.append(f'<path d="{km_path([g["spots"][11], (2.24, -1.06), (2.36, -0.98), g["spots"][14]], False, 0.3)}" class="course-walk"/>')
        parts.append(f'<g class="course cp-{cid}" data-course="{cid}">{"".join(segs)}</g>')
    parts.append('</g>')
    return "".join(parts)


def course_steps(spot_xy):
    parts = ['<g class="course-steps">']
    for cid, c in COURSES.items():
        badges = []
        for i, no in enumerate(c["spots"], 1):
            x, y = spot_xy[no]
            _dx, _dy, anc, _s = SPOT_LABEL[no]
            # ラベルと反対側に番号札を付ける
            ox, oy = (15, -15) if anc == "end" else ((-15, 15) if (anc == "middle" and _dy < 0) else (-15, -15))
            bx, by = x + ox, y + oy
            badges.append(f'<circle cx="{bx:.1f}" cy="{by:.1f}" r="9.5" fill="{COURSE}" stroke="#ffffff" stroke-width="2"/>'
                          f'<text x="{bx:.1f}" y="{by+3.8:.1f}" font-family="{FONT_MARU}" font-size="11" font-weight="900" '
                          f'fill="#ffffff" text-anchor="middle">{i}</text>')
        parts.append(f'<g class="course cs-{cid}" data-course="{cid}">{"".join(badges)}</g>')
    parts.append('</g>')
    return "".join(parts)


# ------------------------------------------------------------------ 図の部品


def furniture(g, L):
    o = ['<g class="furniture">']
    # タイトル（縦書き）
    o.append(f'<g class="map-title" filter="url(#tshadow)">'
             f'<text x="178" y="64" font-family="{FONT_MIN}" font-size="92" font-weight="800" fill="#ffffff" '
             f'letter-spacing="10" style="writing-mode:vertical-rl;text-orientation:upright">あおい島</text>'
             f'<text x="104" y="72" font-family="{FONT_MARU}" font-size="25" font-weight="900" fill="#ffffff" '
             f'letter-spacing="9" style="writing-mode:vertical-rl;text-orientation:upright">観光マップ</text>'
             f'<text x="62" y="74" font-family="{FONT_MARU}" font-size="16" font-weight="700" fill="#ffffff" fill-opacity=".95" '
             f'letter-spacing="4" style="writing-mode:vertical-rl;text-orientation:upright">東の岬で朝日を、西の岬で夕日を。</text>'
             f'</g>')
    L.add_box(40, 50, 230, 470, "title")

    # 方位記号
    cx, cy = 1528, 104
    o.append(f'<g class="compass" transform="translate({cx},{cy})">'
             f'<circle r="40" fill="#0f3d63" fill-opacity=".18" stroke="#ffffff" stroke-opacity=".75" stroke-width="1.4"/>'
             f'<circle r="31" fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width="1" stroke-dasharray="2 3"/>'
             f'<path d="M0 -34 L7 0 L0 6 L-7 0 Z" fill="#ffffff"/>'
             f'<path d="M0 -34 L7 0 L0 6 Z" fill="#dce9f2"/>'
             f'<path d="M0 34 L7 0 L0 -6 L-7 0 Z" fill="#0f3d63" fill-opacity=".55" stroke="#ffffff" stroke-width=".8"/>'
             f'<path d="M-30 0 L0 -5 L30 0 L0 5 Z" fill="#ffffff" fill-opacity=".55"/>'
             f'<text x="0" y="-46" font-family="{FONT_MARU}" font-size="17" font-weight="900" fill="#ffffff" text-anchor="middle">北</text>'
             f'</g>')
    L.add_box(cx - 42, cy - 64, cx + 42, cy + 42, "compass")

    # 凡例
    lx, ly, lw, lh = 22, 768, 352, 266
    o.append(f'<g class="legend" transform="translate({lx},{ly})">'
             f'<rect width="{lw}" height="{lh}" rx="14" fill="#ffffff" fill-opacity=".94" stroke="#cfe0e4"/>')
    yy = 26
    o.append(f'<text x="16" y="{yy}" font-family="{FONT_MARU}" font-size="14" font-weight="900" fill="{INK}">凡例</text>')
    yy += 24
    for key in ["nature", "food", "culture"]:
        gp = GROUPS[key]
        o.append(f'<circle cx="26" cy="{yy-4.5}" r="8" fill="{gp["color"]}" stroke="#fff" stroke-width="1.8"/>'
                 f'<text x="42" y="{yy}" font-family="{FONT_MARU}" font-size="12.5" font-weight="700" fill="{INK}">見どころ：{gp["label"]}</text>')
        yy += 22
    # バス路線
    o.append(f'<path d="M14 {yy-5} H54" stroke="#7d6f56" stroke-width="10"/><path d="M14 {yy-5} H54" stroke="#fffaf0" stroke-width="7.6"/>'
             f'<path d="M14 {yy-5} H54" stroke="{BUSC}" stroke-width="4.2"/>'
             f'<path d="M-5.5 -5.2 L6.5 0 L-5.5 5.2 L-3 0 Z" transform="translate(36,{yy-5})" fill="{BUSC}" stroke="#fff" stroke-width="1.3"/>'
             f'<text x="64" y="{yy}" font-family="{FONT_MARU}" font-size="12.5" font-weight="700" fill="{INK}">周回道路と周回線バス（時計回り）</text>')
    yy += 24
    o.append(f'<circle cx="24" cy="{yy-5}" r="8.4" fill="#fff" stroke="{BUSC}" stroke-width="3"/>'
             f'<text x="24" y="{yy-1.4}" font-family="{FONT_MARU}" font-size="10" font-weight="900" fill="{BUSC}" text-anchor="middle">1</text>'
             f'<rect x="36" y="{yy-14.5}" width="44" height="19" rx="9.5" fill="{BUSC}"/>'
             f'<text x="58" y="{yy-0.8}" font-family="{FONT_MARU}" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">停留所</text>'
             f'<text x="88" y="{yy}" font-family="{FONT_MARU}" font-size="12.5" font-weight="700" fill="{INK}">バス停（数字はあおい港からの順）</text>')
    yy += 22
    o.append(f'<path d="M14 {yy-5} H54" stroke="{TRAIL}" stroke-width="2.3" stroke-dasharray="6.5 3.8"/>'
             f'<text x="64" y="{yy}" font-family="{FONT_MARU}" font-size="12.5" font-weight="700" fill="{INK}">登山道（あおい岳）</text>')
    yy += 22
    o.append(f'<path d="M14 {yy-5} H54" stroke="{TRAIL}" stroke-width="2.7" stroke-dasharray="0.1 4.6" stroke-linecap="round"/>'
             f'<text x="64" y="{yy}" font-family="{FONT_MARU}" font-size="12.5" font-weight="700" fill="{INK}">徒歩の道・遊歩道</text>')
    yy += 22
    o.append(f'<rect x="12" y="{yy-12}" width="44" height="14" rx="3" fill="#2f8fbf"/>'
             f'<path d="M15 {yy-5} H53" stroke="#fff" stroke-width="2.2" stroke-dasharray="7 5"/>'
             f'<text x="64" y="{yy}" font-family="{FONT_MARU}" font-size="12.5" font-weight="700" fill="{INK}">フェリー・高速船の航路</text>')
    yy += 24
    # 縮尺
    o.append(f'<g transform="translate(16,{yy})">'
             f'<rect x="0" y="0" width="{S:.0f}" height="7" fill="{INK}"/><rect x="{S:.0f}" y="0" width="{S:.0f}" height="7" fill="#ffffff" stroke="{INK}" stroke-width="1.2"/>'
             f'<rect x="0" y="0" width="{2*S:.0f}" height="7" fill="none" stroke="{INK}" stroke-width="1.2"/>'
             f'<text x="0" y="22" font-family="{FONT_MARU}" font-size="11.5" font-weight="700" fill="{INK}" text-anchor="middle">0</text>'
             f'<text x="{S:.0f}" y="22" font-family="{FONT_MARU}" font-size="11.5" font-weight="700" fill="{INK}" text-anchor="middle">1</text>'
             f'<text x="{2*S:.0f}" y="22" font-family="{FONT_MARU}" font-size="11.5" font-weight="700" fill="{INK}" text-anchor="middle">2 km</text>'
             f'</g>')
    o.append('</g>')
    L.add_box(lx, ly, lx + lw, ly + lh, "legend")

    # 航路の案内
    fx, fy, fw, fh = 1334, 772, 252, 128
    fr = ACCESS
    o.append(f'<g class="ferry-box" transform="translate({fx},{fy})">'
             f'<rect width="{fw}" height="{fh}" rx="14" fill="#ffffff" fill-opacity=".95" stroke="#cfe0e4"/>'
             f'<use href="#shipg" transform="translate(22,24) scale(1.2)" style="color:{BUSC}"/>'
             f'<text x="38" y="28" font-family="{FONT_MARU}" font-size="14" font-weight="900" fill="{INK}">本土の蒼玉港へ</text>'
             f'<text x="16" y="54" font-family="{FONT_MARU}" font-size="12.5" font-weight="800" fill="{BUSC}">フェリー</text>'
             f'<text x="76" y="54" font-family="{FONT_MARU}" font-size="12.5" font-weight="700" fill="{INK}">約55分・1日5往復（車両も可）</text>'
             f'<text x="16" y="76" font-family="{FONT_MARU}" font-size="12.5" font-weight="800" fill="{BUSC}">高速船</text>'
             f'<text x="76" y="76" font-family="{FONT_MARU}" font-size="12.5" font-weight="700" fill="{INK}">約35分・1日3往復（旅客のみ）</text>'
             f'<text x="16" y="100" font-family="{FONT_MARU}" font-size="11.5" font-weight="700" fill="{SUB}">始発 本土発7:10／最終 島発18:20</text>'
             f'<text x="16" y="117" font-family="{FONT_MARU}" font-size="11" font-weight="500" fill="{SUB}">（季節により変動。航路の向きは模式です）</text>'
             f'</g>')
    L.add_box(fx, fy, fx + fw, fy + fh, "ferrybox")

    # 周回線バスの案内（港の沖）
    bx, by = 960, 872
    o.append(f'<g class="bus-note" transform="translate({bx},{by})">'
             f'<rect width="228" height="56" rx="12" fill="{BUSC}" fill-opacity=".94" stroke="#ffffff" stroke-width="1.4"/>'
             f'<use href="#busg" transform="translate(20,28) scale(1.15)" style="color:#ffffff"/>'
             f'<text x="38" y="23" font-family="{FONT_MARU}" font-size="13" font-weight="900" fill="#ffffff">周回線バス（あおい港発着）</text>'
             f'<text x="38" y="43" font-family="{FONT_MARU}" font-size="12" font-weight="700" fill="#dfeaff">時計回りに一周 約70分・1日6便</text>'
             f'</g>')
    L.add_box(bx, by, bx + 228, by + 56, "busnote")
    o.append('</g>')
    return "".join(o)
