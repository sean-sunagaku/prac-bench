"""あおい島 観光マップ（単一 SVG）を組み立てる。"""
from __future__ import annotations

import math

import numpy as np
from shapely.geometry import LineString, Point, Polygon, box as sbox

import fonts as F
import geography as G
import svgkit as K
import terrain as T
from island_data import ACCESS, BUS, BUS_STOPS, CATEGORIES, CYCLE, FOODS, ISLAND, ROAD, SPOTS
from svgkit import circle, f1, icon, pts_d, rrect, smooth_d, text

W, H = 2400, 1800
S = 200.0                 # px / km
MX0, MY0 = 842.0, 720.0   # 島の中心（km 原点）の位置
MAP_W = 1708              # 左の地図面の幅

ROUTE = "#1B5FBF"
ROUTE_DARK = "#123F80"
INK = "#22303A"
MUTED = "#5B6770"
PAPER = "#FFFCF5"
TRAIL = "#8A5A2E"
WATER = "#3D9AD8"
SEA_DEEP = "#1E4F7C"

SPOT_BY_NO = {s["no"]: s for s in SPOTS}
STOP_BY_ID = {s["id"]: s for s in BUS_STOPS}


def mx(x):
    return MX0 + S * x


def my(y):
    return MY0 - S * y


def mp(p):
    return (mx(p[0]), my(p[1]))


def poly_paths(geom, fn=mp, simplify=None):
    """shapely の (Multi)Polygon を SVG の path d に。"""
    if geom.is_empty:
        return ""
    gs = geom.geoms if hasattr(geom, "geoms") else [geom]
    ds = []
    for g in gs:
        if simplify:
            g = g.simplify(simplify)
        ds.append(pts_d([fn(p) for p in list(g.exterior.coords)[:-1]], True))
        for hole in g.interiors:
            ds.append(pts_d([fn(p) for p in list(hole.coords)[:-1]], True))
    return "".join(ds)


class Doc:
    def __init__(self):
        self.defs = []
        self.body = []
        self.boxes = K.Boxes()

    def add(self, *s):
        self.body.extend(s)


# ====================================================================== 地図：海
def draw_sea(doc, geo):
    d = doc
    cx, cy = mx(0), my(0)
    d.defs.append(
        f'<radialGradient id="seaG" gradientUnits="userSpaceOnUse" cx="{f1(cx)}" cy="{f1(cy)}" r="1250" '
        f'gradientTransform="translate({f1(cx)} {f1(cy)}) scale(1 0.74) translate({f1(-cx)} {f1(-cy)})">'
        '<stop offset="0" stop-color="#A8DDE8"/><stop offset="0.34" stop-color="#7CC1DA"/>'
        '<stop offset="0.62" stop-color="#4C93C0"/><stop offset="0.86" stop-color="#2F6E9F"/>'
        f'<stop offset="1" stop-color="{SEA_DEEP}"/></radialGradient>')
    d.defs.append('<radialGradient id="glowSunrise"><stop offset="0" stop-color="#FFE3A3" stop-opacity=".85"/>'
                  '<stop offset=".45" stop-color="#FFD089" stop-opacity=".38"/><stop offset="1" stop-color="#FFC676" stop-opacity="0"/></radialGradient>')
    d.defs.append('<radialGradient id="glowSunset"><stop offset="0" stop-color="#FFB59A" stop-opacity=".85"/>'
                  '<stop offset=".45" stop-color="#FF9E8C" stop-opacity=".36"/><stop offset="1" stop-color="#F98A8A" stop-opacity="0"/></radialGradient>')
    d.defs.append('<filter id="blur4" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter>')
    d.defs.append('<filter id="blur9" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>')
    d.defs.append('<filter id="blur16" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="16"/></filter>')
    d.defs.append(f'<clipPath id="mapArea"><rect x="0" y="0" width="{MAP_W}" height="{H}"/></clipPath>')
    d.add('<g clip-path="url(#mapArea)">')
    d.add(f'<rect x="0" y="0" width="{MAP_W}" height="{H}" fill="url(#seaG)"/>')
    # 朝日と夕日の光
    d.add(circle(mx(3.95), my(0.22), 520, "url(#glowSunrise)"))
    d.add(circle(mx(-3.95), my(-0.08), 520, "url(#glowSunset)"))
    # 等深線ふうの輪
    poly = geo["coast_poly"]
    for dist, op, wdt in [(0.32, 0.30, 1.6), (0.70, 0.22, 1.4), (1.18, 0.15, 1.3), (1.80, 0.10, 1.2), (2.6, 0.07, 1.2)]:
        ring = poly.buffer(dist, join_style=1).simplify(0.02)
        pts = [mp(p) for p in list(ring.exterior.coords)[:-1]]
        d.add(f'<path d="{smooth_d(pts, True)}" fill="none" stroke="#FFFFFF" stroke-opacity="{op}" stroke-width="{wdt}"/>')
    # 波の印
    rng = np.random.default_rng(3)
    no_go = [sbox(0, 0, 760, 300), sbox(1180, 0, MAP_W, 300), sbox(0, 1190, MAP_W, H), sbox(1350, 990, MAP_W, 1190)]
    waves = []
    for _ in range(900):
        X = rng.uniform(30, MAP_W - 40)
        Y = rng.uniform(30, 1180)
        x_km, y_km = (X - MX0) / S, (MY0 - Y) / S
        if poly.distance(Point(x_km, y_km)) < 0.42:
            continue
        if any(z.contains(Point(X, Y)) for z in no_go):
            continue
        if any(abs(X - a) < 90 and abs(Y - b) < 55 for a, b in waves):
            continue
        waves.append((X, Y))
        if len(waves) > 46:
            break
    for X, Y in waves:
        d.add(f'<path d="M{f1(X)} {f1(Y)}q7 -6 14 0t14 0" fill="none" stroke="#FFFFFF" stroke-opacity=".42" '
              f'stroke-width="2.2" stroke-linecap="round"/>')
    # 浅瀬（海岸のまわり）と真珠浜の遠浅
    shallow = poly.buffer(0.17, join_style=1)
    d.add(f'<path d="{poly_paths(shallow, simplify=0.01)}" fill="#C4ECEE" opacity=".95" filter="url(#blur9)"/>')
    lagoon = Point(G.BEACH_MID).buffer(0.62).intersection(poly.buffer(0.42, join_style=1))
    d.add(f'<path d="{poly_paths(lagoon, simplify=0.01)}" fill="#B9F1E6" opacity=".95" filter="url(#blur16)"/>')
    # 島の影（少し浮いて見えるように）
    coast_d = pts_d([mp(p) for p in geo["coast"]], True)
    d.add(f'<path d="{coast_d}" transform="translate(6 10)" fill="#0F3A5E" opacity=".30" filter="url(#blur9)"/>')
    # 波打ち際の白
    d.add(f'<path d="{coast_d}" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-opacity=".8" stroke-linejoin="round"/>')
    d.add("</g>")
    return coast_d


# ====================================================================== 地図：陸
def beach_arc(coast):
    """真珠浜の海岸線（東端〜西端）の点列。"""
    a = int(np.argmin(np.hypot(coast[:, 0] + 1.84, coast[:, 1] + 1.79)))
    b = int(np.argmin(np.hypot(coast[:, 0] + 2.64, coast[:, 1] + 1.20)))
    if a <= b:
        arc = coast[a:b + 1]
    else:
        arc = np.vstack([coast[a:], coast[:b + 1]])
    return arc


def draw_land(doc, geo, ter, contours, coast_d):
    d = doc
    d.defs.append(f'<clipPath id="islandClip"><path d="{coast_d}"/></clipPath>')
    x0, x1, y0, y1 = ter["extent"]
    r = ter["res"]
    uri = T.image_data_uri(ter["image"], quality=84)
    d.add('<g clip-path="url(#islandClip)">')
    d.add(f'<image href="{uri}" xlink:href="{uri}" x="{f1(mx(x0 - r / 2))}" y="{f1(my(y1 + r / 2))}" width="{f1(S * (x1 - x0 + r))}" '
          f'height="{f1(S * (y1 - y0 + r))}" preserveAspectRatio="none"/>')
    # 等高線
    for lv, lines in contours.items():
        major = lv % 100 == 0
        for L in lines:
            pts = [mp(p) for p in L]
            d.add(f'<path d="{pts_d(pts)}" fill="none" stroke="#3F5F36" stroke-opacity="{0.30 if major else 0.17}" '
                  f'stroke-width="{1.15 if major else 0.75}"/>')
    # 真珠浜の白砂
    arc = beach_arc(geo["coast"])
    d.add(f'<path d="{pts_d([mp(p) for p in arc])}" fill="none" stroke="#F6EBCB" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>')
    d.add(f'<path d="{pts_d([mp(p) for p in arc])}" fill="none" stroke="#FFF8E6" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>')
    d.add("</g>")
    # 海岸線
    d.add(f'<path d="{coast_d}" fill="none" stroke="#3E6F6A" stroke-width="1.3" stroke-opacity=".8" stroke-linejoin="round"/>')


def draw_landcover(doc, geo, ter):
    """柑橘園・草原・集落・林などの描き込み（名前のない飾り）。"""
    d = doc
    poly = geo["coast_poly"]
    road = LineString(np.vstack([geo["road"], geo["road"][:1]]))
    rng = np.random.default_rng(42)
    out = []
    # 柑橘園：南向き斜面の木の列
    cx, cy = -1.13, -1.50
    for row in range(-3, 4):
        for col in range(-8, 9):
            x = cx + col * 0.040 + (row % 2) * 0.020
            y = cy + row * 0.040
            if ((x - cx) / 0.34) ** 2 + ((y - cy) / 0.15) ** 2 > 1:
                continue
            if math.hypot(x - G.SPOT_POS[10][0], y - G.SPOT_POS[10][1]) < 0.075:
                continue
            X, Y = mp((x + rng.normal(0, 0.003), y + rng.normal(0, 0.003)))
            out.append(circle(X, Y + 1.2, 3.6, "#3F7F3A", extra='opacity=".35"'))
            out.append(circle(X, Y, 3.5, "#5E9E47"))
            out.append(circle(X + 0.9, Y - 0.6, 1.35, "#F7A23A"))
    # 風の丘の草（点々と）
    for _ in range(90):
        a = rng.uniform(0, 2 * math.pi)
        rr = math.sqrt(rng.uniform(0, 1)) * 0.36
        x = G.KAZE_HILL[0] + rr * math.cos(a)
        y = G.KAZE_HILL[1] + rr * math.sin(a) * 0.85
        if math.hypot(x - G.SPOT_POS[3][0], y - G.SPOT_POS[3][1]) < 0.08:
            continue
        X, Y = mp((x, y))
        out.append(f'<path d="M{f1(X - 3)} {f1(Y)}l3 -5.5l3 5.5" fill="none" stroke="#7FA94A" stroke-width="1.4" '
                   f'stroke-linecap="round" stroke-linejoin="round" opacity=".75"/>')
    # 林（山の斜面に小さな木）
    hgrid = ter["h"]
    xs, ys = ter["xs"], ter["ys"]
    trees = []
    avoid_lines = [LineString(geo["trail_s"]), LineString(geo["trail_nw"]), LineString(geo["stream"])]
    for _ in range(9000):
        x = rng.uniform(-3.3, 3.3)
        y = rng.uniform(-2.0, 2.0)
        j = int((x - xs[0]) / (xs[1] - xs[0]))
        i = int((y - ys[0]) / (ys[1] - ys[0]))
        hv = hgrid[i, j]
        if hv < 55 or hv > 395:
            continue
        p = Point(x, y)
        if road.distance(p) < 0.07 or any(L.distance(p) < 0.045 for L in avoid_lines):
            continue
        if math.hypot(x - G.KAZE_HILL[0], (y - G.KAZE_HILL[1]) / 0.85) < 0.52:
            continue
        if ((x + 1.13) / 0.42) ** 2 + ((y + 1.50) / 0.22) ** 2 < 1:
            continue
        if any(math.hypot(x - a, y - b) < 0.11 for a, b in trees[-400:]):
            continue
        if any(math.hypot(x - sp[0], y - sp[1]) < 0.12 for sp in G.SPOT_POS.values()):
            continue
        trees.append((x, y))
        if len(trees) > 520:
            break
    for x, y in trees:
        X, Y = mp((x, y))
        s = rng.uniform(0.85, 1.15)
        out.append(f'<path d="M{f1(X)} {f1(Y - 7 * s)}l{f1(4.6 * s)} {f1(8.4 * s)}h{f1(-9.2 * s)}z" fill="#4E8A43" opacity=".55"/>')
    # 集落（家並み）
    def houses(cx, cy, rad, n, seed, avoid=()):
        rr = np.random.default_rng(seed)
        pts = []
        for _ in range(4000):
            a = rr.uniform(0, 2 * math.pi)
            q = rr.uniform(0, 1) ** 0.75 * rad
            x, y = cx + q * math.cos(a), cy + q * math.sin(a)
            p = Point(x, y)
            if not poly.buffer(-0.035).contains(p):
                continue
            if road.distance(p) < 0.030:
                continue
            if any(math.hypot(x - ax, y - ay) < ar for ax, ay, ar in avoid):
                continue
            if any(math.hypot(x - a2, y - b2) < 0.030 for a2, b2 in pts):
                continue
            pts.append((x, y))
            if len(pts) >= n:
                break
        res = []
        for x, y in pts:
            X, Y = mp((x, y))
            roof = ["#C9603F", "#4F6C93", "#7A5A48", "#C9603F", "#6F7F8C"][int(rr.integers(0, 5))]
            ang = rr.uniform(-25, 25)
            res.append(f'<g transform="translate({f1(X)} {f1(Y)}) rotate({ang:.0f})">'
                       f'<rect x="-4" y="-3" width="8" height="6" fill="#F6EEDF" stroke="#8C7B67" stroke-width=".6"/>'
                       f'<rect x="-4.6" y="-3.6" width="9.2" height="3" fill="{roof}"/></g>')
        return res
    port_avoid = [(G.SPOT_POS[8][0], G.SPOT_POS[8][1], 0.07), (G.SPOT_POS[11][0], G.SPOT_POS[11][1], 0.07),
                  (G.SPOT_POS[14][0], G.SPOT_POS[14][1], 0.07), (geo["stops"]["port"][0], geo["stops"]["port"][1], 0.06)]
    out += houses(2.22, -1.12, 0.46, 60, 7, port_avoid)
    shz_avoid = [(G.SPOT_POS[9][0], G.SPOT_POS[9][1], 0.06), (geo["stops"]["shizuura"][0], geo["stops"]["shizuura"][1], 0.05),
                 (geo["stops"]["valley"][0], geo["stops"]["valley"][1], 0.05)]
    out += houses(2.10, 1.17, 0.27, 26, 9, shz_avoid)
    d.add('<g clip-path="url(#islandClip)">', *out, "</g>")


def draw_water_features(doc, geo):
    d = doc
    stream = LineString(geo["stream"]).intersection(geo["coast_poly"].buffer(-0.012))
    if stream.geom_type == "MultiLineString":
        stream = max(stream.geoms, key=lambda g: g.length)
    st = [mp(p) for p in stream.coords]
    d.add(f'<path d="{smooth_d(st)}" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-opacity=".7" stroke-linecap="round"/>')
    # 上流は細く、下流は太く
    n = len(st)
    for k, (a, b, w) in enumerate([(0, n // 3, 2.4), (n // 3 - 1, 2 * n // 3, 3.4), (2 * n // 3 - 1, n, 4.4)]):
        d.add(f'<path d="{smooth_d(st[a:b])}" fill="none" stroke="{WATER}" stroke-width="{w}" stroke-linecap="round"/>')
    # 小さな滝（遊歩道の奥）
    fx, fy = mp((0.66, 0.90))
    d.add(f'<g transform="translate({f1(fx)} {f1(fy)})"><path d="M-6 -6h12" stroke="#6B5B4B" stroke-width="2.4" stroke-linecap="round"/>'
          f'<path d="M-3 -5v9M0 -5v11M3 -5v9" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>'
          f'<path d="M-3 -5v9M0 -5v11M3 -5v9" stroke="{WATER}" stroke-width=".9" stroke-linecap="round"/></g>')
    # 鏡池
    px, py = mp(G.POND)
    d.add(f'<ellipse cx="{f1(px)}" cy="{f1(py)}" rx="12" ry="7" fill="#7FD0F0" stroke="#FFFFFF" stroke-width="2.2"/>')
    d.add(f'<path d="M{f1(px - 5)} {f1(py - 1)}h7M{f1(px - 2)} {f1(py + 2)}h6" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round"/>')


# ====================================================================== 地図：道
WALKS = {}


def walking_paths(geo):
    st = geo["stops"]
    sp = G.SPOT_POS
    paths = {
        "kaze": G.catmull_rom_open([st["yunagi"], (-2.98, -0.30), (-2.84, -0.47), (-2.72, -0.60), sp[3]], 14),
        "yunagi_tip": G.catmull_rom_open([st["yunagi"], (-3.17, -0.07), sp[2]], 10),
        "asahi_tip": G.catmull_rom_open([st["asahi"], (3.18, 0.25), sp[1]], 10),
        "onsen": G.catmull_rom_open([st["onsen"], (-0.14, -1.79), sp[12]], 10),
        "valley": G.catmull_rom_open([st["valley"], (1.20, 1.04), (1.00, 0.97), (0.84, 0.94), (0.66, 0.90)], 12),
        "shrine": G.catmull_rom_open([st["shrine"], (-1.60, 1.43), sp[13]], 8),
        "glass": G.catmull_rom_open([st["port"], (2.19, -1.17), (2.09, -1.10), sp[11]], 10),
        "museum": G.catmull_rom_open([st["port"], (2.27, -1.10), (2.33, -0.96), sp[14]], 10),
    }
    WALKS.update(paths)
    return paths


def draw_routes(doc, geo):
    d = doc
    # 登山道
    for key in ("trail_s", "trail_nw"):
        pts = [mp(p) for p in geo[key]]
        dd = smooth_d(pts)
        d.add(f'<path d="{dd}" fill="none" stroke="#FFFDF5" stroke-width="6.5" stroke-opacity=".75" stroke-linecap="round"/>')
        d.add(f'<path d="{dd}" fill="none" stroke="{TRAIL}" stroke-width="3" stroke-dasharray="9 5.5" stroke-linecap="round"/>')
    # 徒歩の道
    for key, L in walking_paths(geo).items():
        pts = [mp(p) for p in L]
        dd = smooth_d(pts)
        d.add(f'<path d="{dd}" fill="none" stroke="#FFFDF5" stroke-width="5.5" stroke-opacity=".8" stroke-linecap="round"/>')
        d.add(f'<path d="{dd}" fill="none" stroke="#6E5A45" stroke-width="2.6" stroke-dasharray="0.1 5.4" stroke-linecap="round"/>')
    # 港の防波堤・静浦漁港の堤防
    for line in ([(2.05, -1.515), (2.10, -1.66), (2.27, -1.72)], [(2.53, -1.36), (2.57, -1.53), (2.45, -1.65)],
                 [(2.17, 1.17), (2.06, 1.31), (1.98, 1.35)]):
        pts = [mp(p) for p in line]
        d.add(f'<path d="{pts_d(pts)}" fill="none" stroke="#FFFFFF" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/>')
        d.add(f'<path d="{pts_d(pts)}" fill="none" stroke="#8D98A3" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>')
    # 周回道路（白い道）とバス周回線（青）
    road = [mp(p) for p in geo["road"]]
    rd = smooth_d(road, True)
    d.add(f'<path d="{rd}" fill="none" stroke="#6F7A84" stroke-width="12" stroke-linejoin="round" stroke-opacity=".55"/>')
    d.add(f'<path d="{rd}" fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linejoin="round"/>')
    d.add(f'<path id="busLine" d="{rd}" fill="none" stroke="{ROUTE}" stroke-width="4.2" stroke-linejoin="round"/>')
    # 進行方向の矢印（あおい港から時計回り）
    ring = np.vstack([geo["road"], geo["road"][:1]])
    seg = np.linalg.norm(np.diff(ring, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    total = s[-1]
    stop_s = [G.arc_position(geo["road"], p)[0] for p in geo["stops"].values()]
    pos = 0.55
    arrows = []
    while pos < total - 0.3:
        if min(min(abs(pos - q), total - abs(pos - q)) for q in stop_s) > 0.32:
            i = int(np.searchsorted(s, pos))
            p0, p1 = ring[max(i - 3, 0)], ring[min(i + 3, len(ring) - 1)]
            X, Y = mp(((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2))
            ang = math.atan2(-(p1[1] - p0[1]), p1[0] - p0[0])
            arrows.append((X, Y, ang))
            pos += 0.95
        else:
            pos += 0.12
    for X, Y, ang in arrows:
        tipx, tipy = X + 8 * math.cos(ang), Y + 8 * math.sin(ang)
        d.add(K.arrow_head(tipx, tipy, ang, 14, ROUTE, "#FFFFFF", 2.4))
    return arrows


def draw_ferry(doc, geo):
    d = doc
    pts = [mp((2.36, -1.70)), (mx(2.40) + 10, my(-1.98)), (1388, 1078)]
    dd = f"M{f1(pts[0][0])} {f1(pts[0][1])}Q{f1(pts[1][0])} {f1(pts[1][1])} {f1(pts[2][0])} {f1(pts[2][1])}"
    d.add(f'<path d="{dd}" fill="none" stroke="{SEA_DEEP}" stroke-opacity=".35" stroke-width="6" stroke-linecap="round"/>')
    d.add(f'<path d="{dd}" fill="none" stroke="#FFFFFF" stroke-width="3.2" stroke-dasharray="11 7" stroke-linecap="round"/>')
    # 船
    bx, by = 1318, 1050
    d.add(f'<g transform="translate({bx} {by}) rotate(28)">'
          f'<path d="M-24 2h48l-7 10h-34z" fill="#FFFFFF" stroke="{SEA_DEEP}" stroke-width="1.6" stroke-linejoin="round"/>'
          f'<path d="M-15 -8h24v10h-24z" fill="#FFFFFF" stroke="{SEA_DEEP}" stroke-width="1.6"/>'
          f'<path d="M-10 -15h12v7h-12z" fill="#FFFFFF" stroke="{SEA_DEEP}" stroke-width="1.6"/>'
          f'<path d="M4 -14h5v6h-5z" fill="#E8772E"/>'
          f'<path d="M-12 -4h4M-5 -4h4M2 -4h4" stroke="{SEA_DEEP}" stroke-width="2"/></g>')
    doc.boxes.add((bx - 30, by - 25, bx + 30, by + 22), "deco:ferry")


# ====================================================================== 地図：記号とラベル
def spot_marker(doc, no, X, Y, r=16.5):
    sp = SPOT_BY_NO[no]
    col = CATEGORIES[sp["cat"]]["color"]
    doc.add(f'<g filter="url(#drop)">{circle(X, Y, r, col, "#FFFFFF", 3.2)}</g>')
    doc.add(text(X, Y + 7, str(no), "heavy", 19 if no < 10 else 17, "#FFFFFF", "middle"))
    doc.boxes.add((X - r - 2, Y - r - 2, X + r + 2, Y + r + 2), f"marker:{no}")


def stop_marker(doc, sid, X, Y, size=24):
    st = STOP_BY_ID[sid]
    h = size / 2
    doc.add(rrect(X - h, Y - h, size, size, 6, "#FFFFFF", ROUTE, 3.2))
    doc.add(text(X, Y + 5.6, str(st["no"]), "heavy", 15.5, ROUTE, "middle"))
    doc.boxes.add((X - h - 2, Y - h - 2, X + h + 2, Y + h + 2), f"stop:{sid}")


def place_label(doc, anchor, r, lines, prefs, tag, bounds=(8, 8, MAP_W - 8, 1190), pad=3, force=None, own=()):
    """lines: [(文字列, key, size, fill)]。prefs の順に置き場所を試し、重ならない最初の位置に置く。"""
    X, Y = anchor
    widths = [F.text_width(k, s, sz) for s, k, sz, _ in lines]
    w = max(widths)
    hts = [sz * 1.18 for _, _, sz, _ in lines]
    h = sum(hts)
    gap = r + 6
    cand = {
        "E": (X + gap, Y - h / 2, "start"),
        "W": (X - gap - w, Y - h / 2, "end"),
        "N": (X - w / 2, Y - gap - h, "middle"),
        "S": (X - w / 2, Y + gap, "middle"),
        "NE": (X + gap * 0.72, Y - gap * 0.72 - h, "start"),
        "NW": (X - gap * 0.72 - w, Y - gap * 0.72 - h, "end"),
        "SE": (X + gap * 0.72, Y + gap * 0.72, "start"),
        "SW": (X - gap * 0.72 - w, Y + gap * 0.72, "end"),
    }
    chosen = None
    order = [force] if force else prefs + [p for p in cand if p not in prefs]
    for key in order:
        if isinstance(key, tuple):  # 任意オフセット (dx, dy, anchor)
            dx, dy, anc = key
            x0 = X + dx - (w if anc == "end" else w / 2 if anc == "middle" else 0)
            c = (x0, Y + dy, anc)
        else:
            c = cand[key]
        x0, y0, anc = c
        bx = (x0 - 2, y0, x0 + w + 2, y0 + h)
        if bx[0] < bounds[0] or bx[1] < bounds[1] or bx[2] > bounds[2] or bx[3] > bounds[3]:
            if not force:
                continue
        if not force and doc.boxes.hits(bx, pad=pad, ignore=own):
            continue
        chosen = (x0, y0, anc, bx)
        break
    if chosen is None:
        c = cand[prefs[0]] if not isinstance(prefs[0], tuple) else None
        x0, y0, anc = c if c else (X + gap, Y - h / 2, "start")
        chosen = (x0, y0, anc, (x0 - 2, y0, x0 + w + 2, y0 + h))
        print("  !! label collision:", tag, doc.boxes.hits(chosen[3], pad=0))
    x0, y0, anc, bx = chosen
    yy = y0
    for (s, k, sz, fill), wd, ht in zip(lines, widths, hts):
        yy += ht
        if anc == "start":
            tx = x0
        elif anc == "end":
            tx = x0 + w
        else:
            tx = x0 + w / 2
        doc.add(text(tx, yy - sz * 0.24, s, k, sz, fill, anc, "#FFFFFF", max(4.5, sz * 0.26)))
    doc.boxes.add(bx, f"label:{tag}")
    return bx


def draw_markers_and_labels(doc, geo):
    d = doc
    st = geo["stops"]
    # 先に記号を全部置いて、当たり判定に登録する
    for sid, p in st.items():
        stop_marker(d, sid, *mp(p))
    spot_px = {no: mp(p) for no, p in G.SPOT_POS.items()}
    # 鏡池は池そのものが見えるよう、記号を少し右に出して引き出し線で結ぶ
    pxp, pyp = spot_px[6]
    spot_px[6] = (pxp + 38, pyp + 8)
    d.add(f'<path d="M{f1(pxp + 10)} {f1(pyp + 2)}L{f1(spot_px[6][0] - 16)} {f1(spot_px[6][1])}" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>'
          f'<path d="M{f1(pxp + 10)} {f1(pyp + 2)}L{f1(spot_px[6][0] - 16)} {f1(spot_px[6][1])}" stroke="#1F8A5B" stroke-width="1.8" stroke-linecap="round"/>')
    d.boxes.add((pxp - 13, pyp - 9, pxp + 13, pyp + 9), "deco:pond")
    for no, (X, Y) in spot_px.items():
        spot_marker(d, no, X, Y)
    # 山頂の記号と山名
    px, py = mp(G.PEAK)
    # 見どころのラベル
    INK2 = "#1F2A33"
    sub = "#7A4E1E"
    LBL = 23.5
    SUB = 16.5
    specs = [
        (1, [("朝日岬・あおい灯台", "heavy", LBL, INK2), ("早朝がおすすめ", "bold", SUB, "#B5651D")], [(0, -88, "middle"), "N", "NW"]),
        (2, [("夕凪岬", "heavy", LBL, INK2), ("夕方がおすすめ", "bold", SUB, "#C2416B")], [(-4, 26, "middle"), "S", "N"]),
        (3, [("風の丘展望台", "heavy", LBL, INK2)], ["E", "SE", "NE"]),
        (4, [("真珠浜海水浴場", "heavy", LBL, INK2)], [(-30, 40, "middle"), "SW", "S"]),
        (5, [("あおい岳", "feature", 34, "#3B2E1E"), ("標高428m・島の最高峰", "bold", SUB, sub)], ["W", "NW", "N"]),
        (6, [("鏡池", "heavy", LBL - 1, INK2), ("山頂から南へ徒歩約5分", "bold", SUB - 1, sub)], ["E", "SE", "NE"]),
        (7, [("せせらぎ渓谷", "heavy", LBL, INK2), ("遊歩道と小さな滝", "bold", SUB, sub)], ["S", "SW", "SE"]),
        (8, [("みなと市場", "heavy", LBL - 1, INK2)], ["E", "SE"]),
        (9, [("静浦の朝市と漁師町", "heavy", LBL, INK2), ("朝市 7:00〜9:00ごろ", "bold", SUB, "#B5651D")], ["E", "SE", "NE"]),
        (10, [("あおい柑橘園", "heavy", LBL, INK2), ("みかん収穫体験は秋〜冬", "bold", SUB, sub)], ["N", "NE", "NW"]),
        (11, [("蒼玉ガラス工房", "heavy", LBL - 1, INK2)], ["W", "NW", "N"]),
        (12, [("あおい温泉", "heavy", LBL, INK2)], ["E", "NE", "SE"]),
        (13, [("あおい神社", "heavy", LBL, INK2)], ["SW", "W", "S"]),
        (14, [("あおい島資料館", "heavy", LBL - 1, INK2)], ["E", "NE", "N"]),
    ]
    for no, lines, prefs in specs:
        place_label(d, spot_px[no], 17, lines, prefs, f"spot{no}", own=(f"marker:{no}",))
    # 停留所のラベル（青）
    STL = 18.5
    stop_specs = {
        "port": [("あおい港", "heavy", STL + 1, ROUTE_DARK), ("周回線の起点・終点", "bold", 14.5, ROUTE)],
        "onsen": [("あおい温泉入口", "bold", STL, ROUTE_DARK)],
        "citrus": [("柑橘園前", "bold", STL, ROUTE_DARK)],
        "beach": [("真珠浜", "bold", STL, ROUTE_DARK)],
        "yunagi": [("夕凪岬", "bold", STL, ROUTE_DARK)],
        "shrine": [("あおい神社前", "bold", STL, ROUTE_DARK)],
        "valley": [("せせらぎ渓谷入口", "bold", STL, ROUTE_DARK)],
        "shizuura": [("静浦", "bold", STL, ROUTE_DARK)],
        "asahi": [("朝日岬", "bold", STL, ROUTE_DARK)],
    }
    stop_prefs = {
        "port": ["S", "SE", "SW"], "onsen": ["S", "SE"], "citrus": ["S", "SW"], "beach": ["SW", "W", "S"],
        "yunagi": ["NW", "N", "W"], "shrine": ["N", "NW", "NE"], "valley": ["NW", "N", "W"],
        "shizuura": ["S", "SE", "SW"], "asahi": ["NE", "N", "E"],
    }
    for sid, lines in stop_specs.items():
        place_label(d, mp(st[sid]), 13, lines, stop_prefs[sid], f"stop-{sid}", own=(f"stop:{sid}",))


def draw_area_labels(doc, geo):
    d = doc
    labels = [
        ("静浦湾", (1.90, 1.60), 28, "#1D5F8F", 0.32, "feature"),
        ("風の丘", (-2.40, -0.42), 27, "#4E6B22", 0.30, "feature"),
        ("あおい集落", (2.02, -0.70), 21, "#6B4E31", 0.18, "feature"),
        ("静浦集落", (2.50, 0.80), 18, "#6B4E31", 0.12, "feature"),
    ]
    for s, p, sz, col, ls, key in labels:
        X, Y = mp(p)
        d.add(text(X, Y, s, key, sz, col, "middle", "#FFFFFF" if key != "feature" or col != "#1D5F8F" else "#E9F7FB",
                   sz * 0.22, ls=ls, opacity=None))
        d.boxes.add(K.text_box(X, Y, s, key, sz, "middle", ls), f"label:area-{s}")
    # 静浦漁港（堤防のそば・水面）
    X, Y = mp((1.93, 1.42))
    d.add(text(X, Y, "静浦漁港", "bold", 14.5, "#1D5F8F", "middle", "#E9F7FB", 3.5))
    d.boxes.add(K.text_box(X, Y, "静浦漁港", "bold", 14.5, "middle"), "label:area-静浦漁港")
    # 漁船（飾り）
    for (bxk, byk, rot, sc_) in [(2.05, 2.02, -12, 1.0), (1.55, 2.25, 8, 0.85), (-1.2, -2.55, 0, 0.9)]:
        X, Y = mp((bxk, byk))
        d.add(f'<g transform="translate({f1(X)} {f1(Y)}) rotate({rot}) scale({sc_})" opacity=".92">'
              f'<path d="M-15 0h30l-5 7h-20z" fill="#FFFFFF" stroke="{SEA_DEEP}" stroke-width="1.4" stroke-linejoin="round"/>'
              f'<path d="M-4 -9h9v9h-9z" fill="#FFFFFF" stroke="{SEA_DEEP}" stroke-width="1.4"/>'
              f'<path d="M-11 0V-13" stroke="{SEA_DEEP}" stroke-width="1.4"/>'
              f'<path d="M-24 11q6 -4 12 0t12 0t12 0t12 0" fill="none" stroke="#FFFFFF" stroke-width="1.6" opacity=".8"/></g>')
    # 道路の名前（道に沿わせる）
    # 北海岸の一部に textPath で「あおいライン」
    road = geo["road"]
    i0 = int(np.argmin(np.hypot(road[:, 0] + 0.95, road[:, 1] - 1.92)))
    i1 = int(np.argmin(np.hypot(road[:, 0] - 0.35, road[:, 1] - 1.97)))
    seg = road[i0:i1 + 1] if i0 < i1 else road[i1:i0 + 1][::-1]
    off = []
    for k in range(len(seg)):
        a = seg[max(k - 2, 0)]
        b = seg[min(k + 2, len(seg) - 1)]
        t = np.array(b) - np.array(a)
        t = t / (np.linalg.norm(t) + 1e-9)
        nrm = np.array([-t[1], t[0]])  # 左手側（道の北側＝海側）
        q = np.array(seg[k]) + nrm * 0.062
        off.append(mp(q))
    d.defs.append(f'<path id="roadName" d="{smooth_d(off[::3])}"/>')
    lbl = "周回道路あおいライン（約21km）"
    F.register("bold", lbl)
    d.add(f'<text font-size="15" class="t-bold" fill="#1D3C5E" stroke="#FFFFFF" stroke-width="3.5" paint-order="stroke" '
          f'letter-spacing="1"><textPath href="#roadName" xlink:href="#roadName" startOffset="50%" text-anchor="middle">{K.esc(lbl)}</textPath></text>')


def draw_notes(doc, geo):
    """徒歩時間・登山道の所要時間などの小さな注記。"""
    d = doc
    NOTE = 15.5
    col = "#5A4632"
    notes = [
        ("徒歩約10分", (-2.80, -0.40), "end", (-8, 0)),
        ("徒歩約3分", (-0.16, -1.80), "end", (-14, 12)),
        ("登り約90分・下り約70分", (-0.11, -0.85), "start", (14, 0)),
        ("登山口（南麓）", (-0.15, -1.55), "start", (14, 2)),
        ("登山口（北西麓）", (-1.41, 1.24), "start", (12, 2)),
        ("遊歩道", (1.08, 0.99), "middle", (0, 22)),
    ]
    for s, p, anc, (dx, dy) in notes:
        X, Y = mp(p)
        X += dx
        Y += dy
        bx = K.text_box(X, Y, s, "bold", NOTE, anc)
        hits = d.boxes.hits(bx, pad=1)
        if hits:
            print("  !! note collision:", s, hits)
        d.add(text(X, Y, s, "bold", NOTE, col, anc, "#FFFDF4", 4))
        d.boxes.add(bx, f"label:note-{s}")


def draw_decor(doc):
    """朝日・夕日のしるし、方位記号、縮尺。"""
    d = doc
    # 朝日（東の海）
    sx, sy = mx(3.62), my(0.62)
    rays = "".join(f'<path d="M{f1(sx + 26 * math.cos(a))} {f1(sy + 26 * math.sin(a))}L{f1(sx + 36 * math.cos(a))} {f1(sy + 36 * math.sin(a))}" '
                   f'stroke="#F6B23E" stroke-width="3.2" stroke-linecap="round"/>' for a in np.linspace(0, 2 * math.pi, 13)[:-1])
    d.add(f'<g opacity=".95">{rays}{circle(sx, sy, 18, "#FFC94D", "#FFFFFF", 2.5)}</g>')
    d.add(text(sx, sy + 60, "島でいちばん", "heavy", 15.5, "#9A5A08", "middle", "#FFF6DA", 4.5))
    d.add(text(sx, sy + 80, "早い朝日", "heavy", 15.5, "#9A5A08", "middle", "#FFF6DA", 4.5))
    d.boxes.add((sx - 50, sy - 40, sx + 50, sy + 86), "deco:sunrise")
    # 夕日（西の海）
    ux, uy = mx(-3.68), my(-0.50)
    d.add(f'<path d="M{f1(ux - 22)} {f1(uy)}a22 22 0 0 1 44 0z" fill="#FF8A5B" stroke="#FFFFFF" stroke-width="2.5"/>')
    for k in range(3):
        d.add(f'<path d="M{f1(ux - 30 + k * 6)} {f1(uy + 7 + k * 6)}h{f1(60 - k * 12)}" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>')
    for a in np.linspace(math.pi * 1.1, math.pi * 1.9, 5):
        d.add(f'<path d="M{f1(ux + 29 * math.cos(a))} {f1(uy + 29 * math.sin(a))}L{f1(ux + 38 * math.cos(a))} {f1(uy + 38 * math.sin(a))}" '
              f'stroke="#FF8A5B" stroke-width="3" stroke-linecap="round"/>')
    d.add(text(ux, uy + 46, "海に沈む", "heavy", 15.5, "#A6371B", "middle", "#FFF0E8", 4.5))
    d.add(text(ux, uy + 66, "夕日", "heavy", 15.5, "#A6371B", "middle", "#FFF0E8", 4.5))
    d.boxes.add((ux - 44, uy - 40, ux + 44, uy + 72), "deco:sunset")


def draw_compass_scale(doc, x, y):
    d = doc
    d.add(f'<g transform="translate({x} {y})">'
          f'<circle r="30" fill="#FFFFFF" fill-opacity=".92" stroke="{SEA_DEEP}" stroke-width="1.5"/>'
          f'<path d="M0 -24L7.5 4H-7.5z" fill="#C2416B"/><path d="M0 24L7.5 -4H-7.5z" fill="#9AA7B1"/>'
          f'<circle r="3.2" fill="#FFFFFF" stroke="{SEA_DEEP}" stroke-width="1.2"/></g>')
    d.add(text(x, y - 37, "N", "latin", 25, "#FFFFFF", "middle", SEA_DEEP, 3))
    sx0, sy0 = x + 58, y + 6
    d.add(rrect(sx0 - 12, sy0 - 40, S + 52, 62, 10, "#FFFFFF", None, 0, 'fill-opacity=".9"'))
    for k in range(2):
        d.add(f'<rect x="{f1(sx0 + k * S / 2)}" y="{f1(sy0 - 6)}" width="{f1(S / 2)}" height="7" '
              f'fill="{SEA_DEEP if k % 2 == 0 else "#FFFFFF"}" stroke="{SEA_DEEP}" stroke-width="1.2"/>')
    for k, lab in enumerate(["0", "500m", "1km"]):
        d.add(text(sx0 + k * S / 2, sy0 - 13, lab, "bold", 13.5, SEA_DEEP, "middle"))
    d.add(text(sx0 + S / 2, sy0 + 16, "島は東西約6.8km・南北約4.2km", "bold", 12, MUTED, "middle"))
    d.boxes.add((x - 34, y - 62, sx0 + S + 42, sy0 + 24), "deco:scale")


# ====================================================================== パネル
def card(doc, x, y, w, h, fill=PAPER, r=18, shadow=True):
    if shadow:
        doc.add(rrect(x + 3, y + 6, w, h, r, "#0B2E4A", None, 0, 'opacity=".22" filter="url(#blur9)"'))
    doc.add(rrect(x, y, w, h, r, fill))


def heading(doc, x, y, s, size=30, color=INK, sub=None, sub_color=MUTED):
    doc.add(text(x, y, s, "title", size, color))
    if sub:
        wd = F.text_width("title", s, size)
        doc.add(text(x + wd + 14, y - 2, sub, "bold", size * 0.5, sub_color))


def draw_title(doc):
    d = doc
    x, y = 46, 54
    d.add(text(x + 4, y + 18, "AOI ISLAND  —  Sightseeing Map", "latin", 30, "#E9F6FF", ls=0.04))
    d.add(text(x, y + 132, "あおい島", "title", 112, "#FFFFFF", extra='filter="url(#titleShadow)"'))
    tw = F.text_width("title", "あおい島", 112)
    d.add(text(x + tw + 18, y + 130, "観光マップ", "title", 50, "#FFF4D6"))
    d.add(text(x + 4, y + 182, "朝日の岬から、夕凪の岬へ。ぐるり一周、青い島めぐり。", "bold", 24, "#FFFFFF"))
    facts = f"{ISLAND['prefecture']}の離島｜面積 {ISLAND['area']}｜周囲 {ISLAND['perimeter']}｜人口 {ISLAND['population']}"
    d.add(text(x + 4, y + 220, facts, "bold", 17, "#D8EEFA"))
    d.defs.append('<filter id="titleShadow" x="-10%" y="-10%" width="120%" height="140%">'
                  '<feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#0B2E4A" flood-opacity=".45"/></filter>')
    d.boxes.add((x, y - 10, x + 760, y + 232), "panel:title")


def draw_legend(doc, x, y, w, h):
    d = doc
    card(d, x, y, w, h, fill="#FFFFFF", r=16)
    d.add(text(x + 20, y + 34, "地図の見かた", "title", 22, INK))
    col1 = x + 20
    col2 = x + 296
    yy = y + 68
    lh = 32
    LS = 15.5
    # 見どころ
    for i, (k, c) in enumerate(CATEGORIES.items()):
        cy = yy + i * lh
        d.add(circle(col1 + 12, cy - 6, 11, c["color"], "#FFFFFF", 2.2))
        d.add(text(col1 + 12, cy - 1.4, str([1, 8, 12][i]), "heavy", 12, "#FFFFFF", "middle"))
        d.add(text(col1 + 32, cy, f"見どころ（{c['label']}）", "bold", LS, INK))
    cy = yy + 3 * lh
    d.add(rrect(col1 + 2, cy - 16, 20, 20, 5, "#FFFFFF", ROUTE, 2.6))
    d.add(text(col1 + 12, cy - 1.2, "1", "heavy", 12.5, ROUTE, "middle"))
    d.add(text(col1 + 32, cy, "主なバス停（港からの順番）", "bold", LS, INK))
    # 右列
    cy = yy
    d.add(f'<path d="M{col2} {cy - 6}h46" stroke="#6F7A84" stroke-opacity=".55" stroke-width="12"/>'
          f'<path d="M{col2} {cy - 6}h46" stroke="#FFFFFF" stroke-width="9"/>'
          f'<path d="M{col2} {cy - 6}h46" stroke="{ROUTE}" stroke-width="4.2"/>')
    d.add(K.arrow_head(col2 + 32, cy - 6, 0, 12, ROUTE, "#FFFFFF", 2))
    d.add(text(col2 + 56, cy, "周回道路・バス（時計回り）", "bold", LS, INK))
    cy += lh
    d.add(f'<path d="M{col2} {cy - 6}h46" stroke="{TRAIL}" stroke-width="3" stroke-dasharray="9 5.5"/>')
    d.add(text(col2 + 56, cy, "登山道", "bold", LS, INK))
    cy += lh
    d.add(f'<path d="M{col2} {cy - 6}h46" stroke="#6E5A45" stroke-width="2.6" stroke-dasharray="0.1 5.4" stroke-linecap="round"/>')
    d.add(text(col2 + 56, cy, "徒歩の道・遊歩道", "bold", LS, INK))
    cy += lh
    d.add(rrect(col2 - 4, cy - 17, 54, 22, 6, "#5E9FC8"))
    d.add(f'<path d="M{col2} {cy - 6}h46" stroke="{SEA_DEEP}" stroke-opacity=".35" stroke-width="6"/>'
          f'<path d="M{col2} {cy - 6}h46" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="10 6"/>')
    d.add(text(col2 + 56, cy, "航路（向きは模式）", "bold", LS, INK))
    d.boxes.add((x, y, x + w, y + h), "panel:legend")


def draw_access_card(doc, x, y, w, h):
    d = doc
    card(d, x, y, w, h, fill="#FFFFFF", r=16)
    d.add(icon("ferry", x + 16, y + 13, 30, SEA_DEEP))
    d.add(text(x + 54, y + 37, "本土・蒼玉港へ", "title", 22, INK))
    rows = [("フェリー", ACCESS["ferry"]["time"], ACCESS["ferry"]["runs"], ACCESS["ferry"]["note"]),
            ("高速船", ACCESS["jet"]["time"], ACCESS["jet"]["runs"], ACCESS["jet"]["note"])]
    yy = y + 70
    for name, tm, runs, note in rows:
        d.add(rrect(x + 16, yy - 18, 72, 24, 12, "#E6F0F8"))
        d.add(text(x + 52, yy - 1, name, "heavy", 14, SEA_DEEP, "middle"))
        d.add(text(x + 98, yy, tm, "heavy", 18, INK))
        d.add(text(x + 98 + F.text_width("heavy", tm, 18) + 8, yy, f"{runs}・{note}", "bold", 14.5, MUTED))
        yy += 31
    d.add(text(x + 18, yy + 3, f"始発 {ACCESS['first']}　最終 {ACCESS['last']}", "heavy", 16, "#B23A48"))
    d.add(text(x + 18, yy + 25, f"※運航時刻は目安（{ACCESS['season']}）", "bold", 13, MUTED))
    d.boxes.add((x, y, x + w, y + h), "panel:access")


# ---------------------------------------------------------------- 周回線の路線図
def draw_bus_diagram(doc, geo, x, y, w, h):
    """周回線の路線図。角丸ループを島に見立て、各停留所を島での方角に合わせて置く。"""
    d = doc
    card(d, x, y, w, h)
    d.add(icon("bus", x + 22, y + 20, 32, ROUTE))
    heading(d, x + 64, y + 48, "周回線 路線図", 28)
    d.add(text(x + w - 22, y + 46, f"{BUS['line']}", "bold", 14.5, MUTED, "end"))
    r = 84
    xl, xr = x + 192, x + w - 192
    cy = y + 238
    yt, yb = cy - r, cy + r
    L = xr - xl
    P = 2 * L + 2 * math.pi * r

    def at(s_):
        """弧長 s（あおい港側の下辺右端から時計回り）→ (x, y, 進行方向)。"""
        s_ = s_ % P
        if s_ < L:
            return xr - s_, yb, math.pi
        s_ -= L
        if s_ < math.pi * r:
            ph = math.pi / 2 + s_ / r
            return xl + r * math.cos(ph), cy + r * math.sin(ph), ph + math.pi / 2
        s_ -= math.pi * r
        if s_ < L:
            return xl + s_, yt, 0.0
        s_ -= L
        ph = -math.pi / 2 + s_ / r
        return xr + r * math.cos(ph), cy + r * math.sin(ph), ph + math.pi / 2

    def s_curve(left, deg):
        """半円上の角度（画面座標、0°=右、90°=下）→ 弧長。"""
        if left:
            return L + math.radians(deg - 90) * r
        dd = deg if deg >= 270 else deg + 360
        return 2 * L + math.pi * r + math.radians(dd - 270) * r

    loop = f"M{f1(xr)} {f1(yb)}H{f1(xl)}A{r} {r} 0 0 1 {f1(xl)} {f1(yt)}H{f1(xr)}A{r} {r} 0 0 1 {f1(xr)} {f1(yb)}Z"
    d.add(f'<path d="{loop}" fill="#EEF5FB" stroke="#DCE7F3" stroke-width="20"/>')
    d.add(f'<path d="{loop}" fill="none" stroke="{ROUTE}" stroke-width="7"/>')
    d.add(text(xl + L / 2, yb - 15, "南の海岸", "bold", 13, "#7C98B5", "middle"))
    d.add(text(xl + L / 2, yt + 27, "北の海岸", "bold", 13, "#7C98B5", "middle"))
    stop_s = {
        "port": s_curve(False, 52), "onsen": 0.30 * L, "citrus": 0.74 * L, "beach": s_curve(True, 128),
        "yunagi": s_curve(True, 180), "shrine": s_curve(True, 232), "valley": L + math.pi * r + 0.66 * L,
        "shizuura": s_curve(False, 298), "asahi": s_curve(False, 0),
    }
    # 矢印（停留所を避けて等間隔に）
    ss = 18.0
    while ss < P:
        if min(min(abs(ss - v), P - abs(ss - v)) for v in stop_s.values()) > 34:
            X, Y, ang = at(ss)
            d.add(K.arrow_head(X + 6 * math.cos(ang), Y + 6 * math.sin(ang), ang, 11, "#FFFFFF"))
            ss += 78
        else:
            ss += 6
    near_spots = {"port": [8, 11, 14], "onsen": [12, 5], "citrus": [10], "beach": [4], "yunagi": [2, 3],
                  "shrine": [13, 5], "valley": [7], "shizuura": [9], "asahi": [1]}
    NS = 17.5
    for st in BUS_STOPS:
        X, Y, ang = at(stop_s[st["id"]])
        big = st["id"] == "port"
        sz = 34 if big else 30
        d.add(rrect(X - sz / 2, Y - sz / 2, sz, sz, 8, ROUTE if big else "#FFFFFF", ROUTE, 3.4))
        d.add(text(X, Y + 6.5, str(st["no"]), "heavy", 18, "#FFFFFF" if big else ROUTE, "middle"))
        name = st["name"]
        spots = near_spots[st["id"]]
        nw = F.text_width("heavy", name, NS)
        bw = 23 * len(spots)
        nx, ny = math.sin(ang), -math.cos(ang)   # 外向きの法線（時計回りの左手）
        dist = sz / 2 + 12
        lx, ly = X + nx * dist, Y + ny * dist
        if abs(nx) > 0.9:          # 真横
            anc = "end" if nx < 0 else "start"
            tx, ty = lx + (-4 if nx < 0 else 4), Y + 6
            bcx = tx - nw / 2 if nx < 0 else tx + nw / 2
            bpos = [(bcx - bw / 2 + 11.5 + k * 23, ty + 24) for k in range(len(spots))]
        elif abs(ny) > 0.9:        # 真上・真下
            anc = "middle"
            tx = X
            ty = (ly + 17) if ny > 0 else (ly - 4)
            by_ = ty + 22 if ny > 0 else ty - 28
            bpos = [(X - bw / 2 + 11.5 + k * 23, by_) for k in range(len(spots))]
        else:                      # 斜め
            anc = "end" if nx < 0 else "start"
            tx = lx + (-2 if nx < 0 else 2)
            ty = (ly + 16) if ny > 0 else (ly - 4)
            bcx = tx - nw / 2 if nx < 0 else tx + nw / 2
            by_ = ty + 22 if ny > 0 else ty - 28
            bpos = [(bcx - bw / 2 + 11.5 + k * 23, by_) for k in range(len(spots))]
        d.add(text(tx, ty, name, "heavy", NS, ROUTE_DARK, anc))
        for (bxc, byc), no in zip(bpos, spots):
            c = CATEGORIES[SPOT_BY_NO[no]["cat"]]["color"]
            d.add(circle(bxc, byc, 10.5, c, "#FFFFFF", 1.8))
            d.add(text(bxc, byc + 4.6, str(no), "heavy", 12.5 if no < 10 else 11, "#FFFFFF", "middle"))
        if big:
            d.add(rrect(X - 130, Y - 32, 92, 24, 12, "#FFFFFF", ROUTE, 1.6))
            d.add(text(X - 84, Y - 15, "起点・終点", "heavy", 13.5, ROUTE, "middle"))
    d.add(text(xl + L / 2, cy - 4, "時計回りのみ", "title", 25, ROUTE_DARK, "middle"))
    d.add(text(xl + L / 2, cy + 25, f"{BUS['runs']}・{BUS['loop']}", "heavy", 17, INK, "middle"))
    yy = y + h - 112
    d.add(f'<path d="M{x + 24} {yy - 30}H{x + w - 24}" stroke="#E4DCCB" stroke-width="1.5"/>')
    tips = [
        ("clock", "#B23A48", "便数が少ないので、降りる前に次の便の時刻を確認しよう。"),
        ("bus", ROUTE, "丸数字は、その停留所が最寄りの見どころ（地図・ガイドと同じ番号）。"),
        ("bicycle", "#1F8A5B", f"{CYCLE['name']}：フェリーターミナル横・{CYCLE['ebike']}"),
    ]
    for ic, col, s_ in tips:
        d.add(icon(ic, x + 24, yy - 17, 21, col))
        d.add(text(x + 52, yy, s_, "bold", 15, INK))
        yy += 27
    d.add(text(x + 52, yy - 4, f"{CYCLE['loop']}。自転車なら逆回りも自由。", "bold", 13.5, MUTED))
    d.boxes.add((x, y, x + w, y + h), "panel:bus")


# ---------------------------------------------------------------- あおい港まわりの拡大図
def draw_port_inset(doc, geo, ter, x, y, w, h):
    d = doc
    card(d, x, y, w, h)
    d.add(icon("walk", x + 20, y + 20, 30, "#6E5A45"))
    heading(d, x + 58, y + 48, "あおい港まわり", 26)
    d.add(text(x + w - 20, y + 46, "拡大図", "bold", 15, MUTED, "end"))
    # 表示範囲（km）
    kx0, kx1, ky0, ky1 = 1.80, 2.70, -1.80, -0.72
    ix, iy, iw, ih = x + 16, y + 66, w - 32, h - 82
    sc = min(iw / (kx1 - kx0), ih / (ky1 - ky0))
    ox = ix + (iw - sc * (kx1 - kx0)) / 2
    oy = iy + (ih - sc * (ky1 - ky0)) / 2

    def q(p):
        return (ox + (p[0] - kx0) * sc, oy + (ky1 - p[1]) * sc)

    d.defs.append(f'<clipPath id="insetClip"><rect x="{f1(ix)}" y="{f1(iy)}" width="{f1(iw)}" height="{f1(ih)}" rx="12"/></clipPath>')
    d.add('<g clip-path="url(#insetClip)">')
    d.add(rrect(ix, iy, iw, ih, 12, "#8FCBE0"))
    coast = geo["coast_poly"]
    shallow = coast.buffer(0.05, join_style=1)
    d.add(f'<path d="{poly_paths(shallow, q, 0.003)}" fill="#C4ECEE"/>')
    cd = poly_paths(coast, q, 0.002)
    d.defs.append(f'<clipPath id="insetLand"><path d="{cd}"/></clipPath>')
    x0, x1, y0, y1 = ter["extent"]
    r = ter["res"]
    d.add(f'<g clip-path="url(#insetLand)"><use href="#landImage" xlink:href="#landImage" transform="translate({f1(ox - kx0 * sc)} {f1(oy + ky1 * sc)}) scale({sc / S:.5f}) translate({f1(-MX0)} {f1(-MY0)})"/></g>')
    d.add(f'<path d="{cd}" fill="none" stroke="#FFFFFF" stroke-width="3"/>')
    d.add(f'<path d="{cd}" fill="none" stroke="#3E6F6A" stroke-width="1.2"/>')
    # 防波堤
    for line in ([(2.05, -1.515), (2.10, -1.66), (2.27, -1.72)], [(2.53, -1.36), (2.57, -1.53), (2.45, -1.65)]):
        pts = [q(p) for p in line]
        d.add(f'<path d="{pts_d(pts)}" fill="none" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>')
        d.add(f'<path d="{pts_d(pts)}" fill="none" stroke="#8D98A3" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>')
    # 集落の通り
    for line in ([(2.22, -1.27), (2.19, -1.17), (2.09, -1.10), (2.00, -1.06), (1.88, -1.01)],
                 [(2.22, -1.27), (2.27, -1.10), (2.33, -0.96), (2.36, -0.84)],
                 [(2.19, -1.17), (2.27, -1.10)], [(2.00, -1.06), (2.08, -0.92), (2.33, -0.96)]):
        pts = [q(p) for p in line]
        d.add(f'<path d="{smooth_d(pts)}" fill="none" stroke="#F3EEE2" stroke-width="7" stroke-linecap="round"/>')
    # 家
    rng = np.random.default_rng(12)
    road = LineString(np.vstack([geo["road"], geo["road"][:1]]))
    placed = []
    for _ in range(3000):
        xk, yk = rng.uniform(kx0, kx1), rng.uniform(ky0, ky1)
        if math.hypot(xk - 2.24, (yk + 1.12) * 1.1) > 0.50:
            continue
        p = Point(xk, yk)
        if not coast.buffer(-0.03).contains(p) or road.distance(p) < 0.035:
            continue
        if any(math.hypot(xk - a, yk - b) < 0.055 for a, b in placed):
            continue
        if any(math.hypot(xk - G.SPOT_POS[n][0], yk - G.SPOT_POS[n][1]) < 0.09 for n in (8, 11, 14)):
            continue
        if math.hypot(xk - 2.24, yk + 1.31) < 0.08 or math.hypot(xk - 2.25, yk + 1.42) < 0.07:
            continue
        placed.append((xk, yk))
        if len(placed) > 44:
            break
    for xk, yk in placed:
        X, Y = q((xk, yk))
        roof = ["#B86A50", "#6A7F99", "#8A7262", "#7E8A93"][int(rng.integers(0, 4))]
        ang = rng.uniform(-20, 20)
        d.add(f'<g transform="translate({f1(X)} {f1(Y)}) rotate({ang:.0f})" opacity=".85"><rect x="-6" y="-4.5" width="12" height="9" fill="#F6EEDF" stroke="#9C8B77" stroke-width=".7"/>'
              f'<rect x="-6.6" y="-5.1" width="13.2" height="4" fill="{roof}"/></g>')
    # 周回道路とバス
    rd = smooth_d([q(p) for p in geo["road"]], True)
    d.add(f'<path d="{rd}" fill="none" stroke="#6F7A84" stroke-opacity=".55" stroke-width="17"/>')
    d.add(f'<path d="{rd}" fill="none" stroke="#FFFFFF" stroke-width="13"/>')
    d.add(f'<path d="{rd}" fill="none" stroke="{ROUTE}" stroke-width="5.5"/>')
    # 進行方向（港から西へ出て、東から戻る）
    for pa, pb in [((1.90, -1.60), (1.82, -1.63)), ((2.66, -1.02), (2.60, -1.12))]:
        A, B = q(pa), q(pb)
        ang = math.atan2(B[1] - A[1], B[0] - A[0])
        rp = road.interpolate(road.project(Point(pa)))
        X, Y = q((rp.x, rp.y))
        d.add(K.arrow_head(X, Y, ang, 14, ROUTE, "#FFFFFF", 2.4))
    # 徒歩の道
    for key, tlabel, tpos in (("glass", "徒歩約5分", (2.08, -1.17)), ("museum", "徒歩約7分", (2.43, -1.06))):
        pts = [q(p) for p in WALKS[key]]
        dd = smooth_d(pts)
        d.add(f'<path d="{dd}" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round"/>')
        d.add(f'<path d="{dd}" fill="none" stroke="#6E5A45" stroke-width="3.4" stroke-dasharray="0.1 7" stroke-linecap="round"/>')
        X, Y = q(tpos)
        d.add(text(X, Y, tlabel, "heavy", 15, "#5A4632", "middle", "#FFFFFF", 4.5))
    # 航路
    A = q((2.36, -1.70))
    d.add(f'<path d="M{f1(A[0])} {f1(A[1])}l40 40" stroke="#FFFFFF" stroke-width="3.2" stroke-dasharray="10 6" stroke-linecap="round"/>')
    d.add(text(A[0] - 8, A[1] + 32, "本土・蒼玉港へ", "heavy", 14.5, SEA_DEEP, "end", "#FFFFFF", 4))
    # 施設
    term = q((2.29, -1.43))
    d.add(rrect(term[0] - 20, term[1] - 11, 40, 20, 4, "#FFFFFF", SEA_DEEP, 2))
    d.add(icon("ferry", term[0] - 9, term[1] - 9, 18, SEA_DEEP))
    cyc = q((2.15, -1.44))
    d.add(circle(cyc[0], cyc[1], 13, "#FFFFFF", "#1F8A5B", 2.4))
    d.add(icon("bicycle", cyc[0] - 9, cyc[1] - 9, 18, "#1F8A5B"))
    stx, sty = q(geo["stops"]["port"])
    d.add(rrect(stx - 15, sty - 15, 30, 30, 7, "#FFFFFF", ROUTE, 3.4))
    d.add(text(stx, sty + 6.5, "1", "heavy", 18, ROUTE, "middle"))
    for no in (8, 11, 14):
        X, Y = q(G.SPOT_POS[no])
        c = CATEGORIES[SPOT_BY_NO[no]["cat"]]["color"]
        d.add(circle(X, Y, 15, c, "#FFFFFF", 3))
        d.add(text(X, Y + 6, str(no), "heavy", 16, "#FFFFFF", "middle"))
    # ラベル
    lab = [
        (q((2.36, -0.84)), "あおい島資料館", "end", (-22, 6)),
        (q(G.SPOT_POS[11]), "蒼玉ガラス工房", "middle", (0, -24)),
        (q((2.40, -1.30)), "みなと市場", "start", (20, 6)),
        (term, "フェリーターミナル", "start", (24, 6)),
        (cyc, "あおいレンタサイクル", "middle", (-10, 34)),
        ((stx, sty), "バス停 あおい港", "end", (-22, -2)),
        ((stx, sty), "（周回線の起点）", "end", (-22, 18)),
    ]
    for (X, Y), s, anc, (dx, dy) in lab:
        d.add(text(X + dx, Y + dy, s, "heavy", 15.5, INK if "バス" not in s else ROUTE_DARK, anc, "#FFFFFF", 4.5))
    d.add("</g>")
    d.add(rrect(ix, iy, iw, ih, 12, "none", "#D9CFBC", 1.5))
    d.boxes.add((x, y, x + w, y + h), "panel:inset")


# ---------------------------------------------------------------- モデルコース
COURSES = [
    {
        "tag": "半日", "tag_color": "#E8772E", "title": "西の浜辺と、夕凪岬の夕日", "mode": "bus", "time": "約4時間",
        "steps": [("あおい港", None, "🚌"), ("真珠浜海水浴場", 4, "1〜2時間"), ("風の丘展望台", 3, "20分"), ("夕凪岬", 2, "30分"),
                  ("あおい港", None, "北回りで戻る")],
        "moves": ["bus", "buswalk", "walk", "bus"],
        "note": "午後に出発して夕日で締める。帰りは最終便（島発18:20）に間に合うバスで。",
    },
    {
        "tag": "1日", "tag_color": "#1F8A5B", "title": "あおい岳を越えて、温泉へ", "mode": "bus", "time": "約8時間",
        "steps": [("あおい港", None, ""), ("あおい神社", 13, "30分"), ("あおい岳 山頂", 5, "登り約90分"), ("鏡池", 6, "15分"),
                  ("あおい温泉", 12, "下り約70分＋60分"), ("あおい港", None, "")],
        "moves": ["bus", "walk", "walk", "walk", "bus"],
        "note": "北西麓から登って南麓へ下る縦走。温泉入口から港へは、時計回りでほぼ一周のバス旅。",
    },
    {
        "tag": "1日", "tag_color": "#1F8A5B", "title": "電動アシスト自転車で島ぐるり", "mode": "bicycle", "time": "約7〜8時間",
        "steps": [("あおい港", None, ""), ("柑橘園", 10, "40分"), ("真珠浜", 4, "1時間"), ("風の丘", 3, "20分"), ("夕凪岬", 2, "30分"),
                  ("神社", 13, "30分"), ("渓谷", 7, "40分"), ("朝日岬", 1, "30分"), ("あおい港", None, "")],
        "moves": ["bike"] * 8,
        "note": "走るだけなら一周約2.5〜3時間。寄り道の時間を足して1日で。",
    },
    {
        "tag": "港まち", "tag_color": "#C2416B", "title": "着いてすぐ・帰る前に、港から歩いて", "mode": "walk", "time": "約2.5時間",
        "steps": [("みなと市場", 8, "40分"), ("蒼玉ガラス工房", 11, "60分"), ("あおい島資料館", 14, "30分")],
        "moves": ["walk", "walk"],
        "note": "工房は港から徒歩約5分、資料館は約7分。資料館は雨の日の立ち寄り先にも。",
    },
]


def draw_courses(doc, x, y, w, h):
    d = doc
    card(d, x, y, w, h)
    d.add(icon("camera", x + 22, y + 20, 30, "#C2416B"))
    heading(d, x + 62, y + 48, "モデルコース", 28)
    d.add(text(x + w - 22, y + 46, "滞在時間はデータの目安", "bold", 13.5, MUTED, "end"))
    yy = y + 74
    for c in COURSES:
        # 見出し行
        tw = F.text_width("heavy", c["tag"], 15) + 20
        d.add(rrect(x + 22, yy, tw, 26, 13, c["tag_color"]))
        d.add(text(x + 22 + tw / 2, yy + 18.5, c["tag"], "heavy", 15, "#FFFFFF", "middle"))
        d.add(text(x + 32 + tw, yy + 20, c["title"], "heavy", 18.5, INK))
        d.add(icon({"bus": "bus", "bicycle": "bicycle", "walk": "walk"}[c["mode"]], x + w - 132, yy + 2, 22, MUTED))
        d.add(text(x + w - 22, yy + 20, c["time"], "heavy", 16, MUTED, "end"))
        yy += 37
        # 行程（番号の丸を矢印でつなぐ）
        cx = x + 26
        row_y = yy + 10
        max_x = x + w - 24
        for k, (name, no, dur) in enumerate(c["steps"]):
            label = name
            lw = F.text_width("bold", label, 14.5)
            item_w = (24 if no else 0) + lw + 8
            if cx + item_w > max_x:
                cx = x + 26
                row_y += 27
            if no:
                col = CATEGORIES[SPOT_BY_NO[no]["cat"]]["color"]
                d.add(circle(cx + 10, row_y - 5, 10.5, col, "#FFFFFF", 1.6))
                d.add(text(cx + 10, row_y - 0.5, str(no), "heavy", 12 if no < 10 else 10.5, "#FFFFFF", "middle"))
                cx += 24
            d.add(text(cx, row_y, label, "bold", 14.5, INK if no else ROUTE_DARK))
            cx += lw + 4
            if k < len(c["steps"]) - 1:
                mv = c["moves"][k]
                ics = {"bus": [("bus", ROUTE)], "walk": [("walk", "#8A5A2E")], "bike": [("bicycle", "#1F8A5B")],
                       "buswalk": [("bus", ROUTE), ("walk", "#8A5A2E")]}[mv]
                need = 17 * len(ics) + 12
                if cx + need > max_x:
                    cx = x + 26
                    row_y += 27
                cx += 3
                for ic, col in ics:
                    d.add(icon(ic, cx, row_y - 14.5, 17, col))
                    cx += 17
                cx += 6
        yy = row_y + 22
        for ln in K.wrap(c["note"], "body", 13.5, w - 52):
            d.add(text(x + 26, yy, ln, "body", 13.5, MUTED))
            yy += 18
        yy += 7
    d.boxes.add((x, y, x + w, y + h), "panel:courses")


# ---------------------------------------------------------------- 見どころガイド（右の列）
def draw_guide(doc, x, y, w, h):
    d = doc
    d.add(rrect(x, y, w, h, 0, PAPER))
    d.add(text(x + 34, y + 70, "見どころガイド", "title", 38, INK))
    d.add(text(x + 34 + F.text_width("title", "見どころガイド", 38) + 16, y + 68, "14 SPOTS", "latin", 26, "#9A8B73"))
    yy = y + 100
    DESC = 15.5
    NAME = 21.5
    for cat_key, cat in CATEGORIES.items():
        d.add(rrect(x + 26, yy, w - 52, 32, 16, cat["light"]))
        d.add(circle(x + 44, yy + 16, 6, cat["color"]))
        d.add(text(x + 58, yy + 22.5, cat["label"], "heavy", 17, cat["color"]))
        yy += 44
        for sp in [s for s in SPOTS if s["cat"] == cat_key]:
            bx = x + 50
            d.add(circle(bx, yy + 14, 17, cat["color"], "#FFFFFF", 2.5))
            d.add(text(bx, yy + 21, str(sp["no"]), "heavy", 17 if sp["no"] < 10 else 15, "#FFFFFF", "middle"))
            d.add(icon(sp["icon"], bx - 13, yy + 36, 26, cat["color"]))
            tx = x + 82
            d.add(text(tx, yy + 20, sp["name"], "heavy", NAME, INK))
            nw = F.text_width("heavy", sp["name"], NAME)
            if sp["best"]:
                tag = f"{sp['best']}がおすすめ"
                tw = F.text_width("heavy", tag, 13) + 16
                d.add(rrect(tx + nw + 10, yy + 4, tw, 21, 10.5, cat["light"]))
                d.add(text(tx + nw + 10 + tw / 2, yy + 19, tag, "heavy", 13, cat["color"], "middle"))
            lines = K.wrap(sp["desc"], "body", DESC, w - 82 - 30)
            ly = yy + 44
            for ln in lines:
                d.add(text(tx, ly, ln, "body", DESC, "#3A444B"))
                ly += 22
            # 最寄りバス停・滞在
            stop = sp["stop"]
            walk = sp["walk"]
            if sp["no"] == 6:
                meta = [("bus", "あおい岳の山頂から南へ徒歩約5分（登山とセットで）"), ("clock", f"滞在{sp['stay']}")]
            elif sp["no"] == 5:
                meta = [("bus", "あおい温泉入口／あおい神社前"), ("clock", sp["stay"])]
            else:
                stxt = stop + (f"から{walk}" if walk and walk.startswith("徒歩") else "（すぐ隣）" if walk == "すぐ隣" else "")
                meta = [("bus", stxt), ("clock", f"滞在{sp['stay']}")]
            mx_ = tx
            for ic, s in meta:
                col = ROUTE if ic == "bus" else "#8A6A3A"
                d.add(icon(ic, mx_, ly - 13, 16, col))
                d.add(text(mx_ + 19, ly, s, "bold", 14, col))
                mx_ += 19 + F.text_width("bold", s, 14) + 16
            yy = ly + 16
        yy += 4
    return yy


def draw_foods(doc, x, y, w):
    d = doc
    d.add(text(x + 34, y + 36, "島の味・おみやげ", "title", 28, INK))
    yy = y + 56
    cw = (w - 68 - 14) / 2
    for i, fd in enumerate(FOODS):
        cx = x + 34 + (i % 2) * (cw + 14)
        cy = yy + (i // 2) * 104
        d.add(rrect(cx, cy, cw, 94, 14, "#FFFFFF", "#EADFCB", 1.4))
        d.add(circle(cx + 32, cy + 43, 22, "#FDEEE2" if fd["icon"] != "glass" else "#E3EEF9"))
        d.add(icon(fd["icon"], cx + 18, cy + 29, 28, "#E8772E" if fd["icon"] not in ("glass", "hijiki") else ("#1B5FBF" if fd["icon"] == "glass" else "#2F5E3A")))
        d.add(text(cx + 64, cy + 27, fd["name"], "heavy", 17.5, INK))
        lines = K.wrap(fd["desc"], "body", 13.5, cw - 74)
        ly = cy + 47
        for ln in lines[:2]:
            d.add(text(cx + 64, ly, ln, "body", 13.5, "#4A535A"))
            ly += 18
        d.add(text(cx + 64, cy + 84, fd["where"], "bold", 13, "#B5651D"))
    return yy + 2 * 104


# ====================================================================== 組み立て
def build(out_path):
    geo = G.build_all()
    ter = T.build_terrain(geo, px_per_km=320)
    contours = T.contour_lines(ter)
    doc = Doc()
    doc.defs.append('<filter id="drop" x="-40%" y="-40%" width="180%" height="180%">'
                    '<feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0B2E4A" flood-opacity=".35"/></filter>')
    # 地図面
    coast_d = draw_sea(doc, geo)
    doc.add('<g clip-path="url(#mapArea)">')
    draw_land(doc, geo, ter, contours, coast_d)
    draw_landcover(doc, geo, ter)
    draw_water_features(doc, geo)
    draw_routes(doc, geo)
    draw_ferry(doc, geo)
    draw_decor(doc)
    doc.add("</g>")
    # 先にパネル類の場所を登録（ラベルがかぶらないように）
    draw_title(doc)
    draw_legend(doc, 1124, 26, 566, 194)
    draw_access_card(doc, 1342, 1020, 352, 160)
    draw_compass_scale(doc, 70, 1140)
    draw_markers_and_labels(doc, geo)
    draw_area_labels(doc, geo)
    draw_notes(doc, geo)
    # 下段のカード
    by = 1214
    bh = H - by - 28
    draw_bus_diagram(doc, geo, 24, by, 668, bh)
    draw_port_inset(doc, geo, ter, 706, by, 420, bh)
    draw_courses(doc, 1140, by, MAP_W - 1140 - 18, bh)
    # 右の列（左端にやわらかい影を落として地図面と分ける）
    doc.add(f'<rect x="{MAP_W - 14}" y="0" width="14" height="{H}" fill="url(#colShadow)"/>')
    doc.defs.append('<linearGradient id="colShadow" x1="0" x2="1"><stop offset="0" stop-color="#0B2E4A" stop-opacity="0"/>'
                    '<stop offset="1" stop-color="#0B2E4A" stop-opacity=".28"/></linearGradient>')
    gx = MAP_W
    gy_end = draw_guide(doc, gx, 0, W - MAP_W, H)
    draw_foods(doc, gx, gy_end - 6, W - MAP_W)
    # 地図の画像を再利用できるように defs に入れ直す
    # （draw_land で埋め込んだ image に id を付け、拡大図で use する）
    body = "\n".join(doc.body)
    body = body.replace('<image href="data:image/jpeg', '<image id="landImage" href="data:image/jpeg', 1)
    style = f"""
{F.font_face_css()}
.t-body{{font-family:{K.FALLBACK['AoiRounded']};font-weight:500}}
.t-bold{{font-family:{K.FALLBACK['AoiRounded']};font-weight:700}}
.t-heavy{{font-family:{K.FALLBACK['AoiRounded']};font-weight:800}}
.t-title{{font-family:{K.FALLBACK['AoiTitle']};font-weight:800}}
.t-feature{{font-family:{K.FALLBACK['AoiFeature']};font-weight:700}}
.t-latin{{font-family:{K.FALLBACK['AoiLatin']};font-weight:600;font-style:italic}}
.ic{{fill:currentColor;stroke:none}}
.ic .ic-l{{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}}
.ic .ic-x{{fill:#FFFFFF}}
.ic .ic-x2{{fill:none;stroke:#FFFFFF;stroke-width:1.6;stroke-linecap:round}}
"""
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
           f'viewBox="0 0 {W} {H}" lang="ja" style="background-color:#1B3550">\n'
           f'<title>あおい島 観光マップ</title>\n'
           f'<desc>架空の離島「あおい島」の観光マップ。見どころ14か所、周回線バス（あおい港から時計回り）、登山道、航路、モデルコース。</desc>\n'
           f'<style>{style}</style>\n<defs>\n' + "\n".join(doc.defs) + "\n</defs>\n" + body + "\n</svg>\n")
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(svg)
    return {"geo": geo, "ter": ter, "boxes": doc.boxes}


if __name__ == "__main__":
    import sys
    res = build(sys.argv[1] if len(sys.argv) > 1 else "/tmp/aoi2-scratch/map.svg")
    print("fonts", F.used_summary())
    ov = [(a, b) for a, b in res["boxes"].overlaps()
          if not (a.split(":")[1] in b.replace("label:spot", "").replace("label:stop-", "") and
                  (b.startswith("label:spot") or b.startswith("label:stop-")) and a.split(":")[0] in ("marker", "stop")
                  and (b == f"label:spot{a.split(':')[1]}" or b == f"label:stop-{a.split(':')[1]}"))]
    print("overlaps", len(ov))
    for a, b in ov:
        print("  ", a, "x", b)
