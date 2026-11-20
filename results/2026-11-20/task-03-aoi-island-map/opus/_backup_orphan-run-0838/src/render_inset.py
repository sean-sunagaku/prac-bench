"""あおい港のまわり（徒歩圏）の拡大図 SVG。本図と同じ km 座標を拡大して描く。"""
from __future__ import annotations

import math
from xml.sax.saxutils import escape

import numpy as np
from shapely.geometry import LineString, Point, Polygon, box
from shapely.prepared import prep

from aoi_data import GROUPS, SPOTS
from render_map import BUSC, FONT_MARU, INK, SUB, TRAIL, cum_len, geom_d, path_d, point_at, text_w

WI, HI = 460, 470
SI = 520.0                 # px / km
MX, MY = 2.33, -1.27       # 図の中心（km）
CXI = WI / 2 - MX * SI
CYI = HI / 2 + MY * SI


def pi(p):
    return (CXI + p[0] * SI, CYI - p[1] * SI)


def pia(a):
    a = np.asarray(a, float)
    return np.column_stack([CXI + a[:, 0] * SI, CYI - a[:, 1] * SI])


def kp(pts, closed=False, tol=0.3):
    return path_d(pia(pts), closed, tol)


def gd(gm, tol=0.3):
    return geom_d(gm, tol, s=SI, cx=CXI, cy=CYI)


def label(x, y, s, fs=13.5, weight=800, fill=INK, anchor="start", halo=4):
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-family="{FONT_MARU}" font-size="{fs}" font-weight="{weight}" '
            f'fill="{fill}" text-anchor="{anchor}" stroke="#fff" stroke-width="{halo}" stroke-linejoin="round" '
            f'paint-order="stroke">{escape(s)}</text>')


def build_inset_svg(g):
    island = g["island"]
    view = box((0 - CXI) / SI, (CYI - HI) / SI, (WI - CXI) / SI, CYI / SI).buffer(0.05)
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WI} {HI}" class="aoi-inset" role="img" '
         f'aria-label="あおい港のまわりの拡大図。フェリーターミナル、周回線バスのあおい港停留所、みなと市場、'
         f'蒼玉ガラス工房（徒歩約5分）、あおい島資料館（徒歩約7分）、あおいレンタサイクル">']
    o.append('''<defs>
  <linearGradient id="in-sea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7cc9df"/><stop offset="1" stop-color="#3d97c4"/></linearGradient>
  <clipPath id="in-clip"><rect width="460" height="470" rx="0"/></clipPath>
  <g id="in-h1"><rect x="-5" y="-3.6" width="10" height="7.2" rx="1" fill="#d66a4c" stroke="#8c4733" stroke-width=".6"/><path d="M-4.6 0H4.6" stroke="#f0a38c" stroke-width=".9"/></g>
  <g id="in-h2"><rect x="-5" y="-3.6" width="10" height="7.2" rx="1" fill="#6f8eb0" stroke="#465f7a" stroke-width=".6"/><path d="M-4.6 0H4.6" stroke="#a9c1dc" stroke-width=".9"/></g>
  <g id="in-h3"><rect x="-5" y="-3.6" width="10" height="7.2" rx="1" fill="#f3efe4" stroke="#8d8577" stroke-width=".6"/><path d="M-4.6 0H4.6" stroke="#c9c1b0" stroke-width=".9"/></g>
  <g id="in-tr"><circle r="5.4" fill="#5a9752"/><circle cx="-1.6" cy="-1.8" r="2.6" fill="#80b96a"/></g>
</defs>''')
    o.append(f'<g clip-path="url(#in-clip)">')
    o.append(f'<rect width="{WI}" height="{HI}" fill="url(#in-sea)"/>')
    for d, op in [(0.02, .7), (0.045, .45), (0.075, .28)]:
        o.append(f'<path d="{gd(island.buffer(d).intersection(view))}" fill="none" stroke="#effcff" stroke-opacity="{op}" stroke-width="1.3"/>')
    land = island.intersection(view)
    o.append(f'<path d="{gd(land)}" fill="#e3eecb" stroke="#24677a" stroke-width="1.4"/>')
    vil = Polygon(g["aoi_village"]).buffer(0.02).intersection(island.buffer(-0.01))
    o.append(f'<path d="{gd(vil)}" fill="#f2ead6"/>')
    # 防波堤・岸壁
    for b in g["aoi_breakwaters"] + [g["aoi_quay"]]:
        d = kp(b, False, 0.2)
        o.append(f'<path d="{d}" fill="none" stroke="#5f7179" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>'
                 f'<path d="{d}" fill="none" stroke="#eef0ee" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>')
    # 航路
    fr = pia(g["ferry_route"])
    o.append(f'<path d="{path_d(fr)}" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="11 7" stroke-linecap="round"/>')

    road = g["road"]
    road_ls = LineString(road)
    # 木（集落の外の斜面に少し）
    rng = np.random.default_rng(5)
    trees = []
    vp = prep(Polygon(g["aoi_village"]).buffer(0.03))
    isl = prep(island.buffer(-0.03))
    pts = []
    for _ in range(3000):
        xk, yk = rng.uniform(1.88, 2.78), rng.uniform(-1.72, -0.80)
        P_ = Point(xk, yk)
        if not isl.contains(P_) or vp.contains(P_) or road_ls.distance(P_) < 0.03:
            continue
        x, y = pi((xk, yk))
        if any((x - u) ** 2 + (y - v) ** 2 < 15 ** 2 for u, v in pts):
            continue
        if rng.random() > 0.55:
            continue
        pts.append((x, y))
        trees.append(f'<use href="#in-tr" x="{x:.0f}" y="{y:.0f}"/>')
    o.append('<g>' + "".join(trees) + '</g>')

    # 家
    houses = []
    poly = Polygon(g["aoi_village"]).intersection(island.buffer(-0.02))
    pp = prep(poly)
    occ = []
    walks = [LineString(g["walk_town_11"]), LineString(g["walk_town_14"])]
    keep_clear = [(pi(g["spots"][n]), 30) for n in (8, 11, 14)] + [(pi(g["terminal"]), 30), (pi(g["cycle"]), 22)]
    for _ in range(12000):
        minx, miny, maxx, maxy = poly.bounds
        xk, yk = rng.uniform(minx, maxx), rng.uniform(miny, maxy)
        P_ = Point(xk, yk)
        if not pp.contains(P_) or road_ls.distance(P_) < 0.028 or any(w.distance(P_) < 0.02 for w in walks):
            continue
        x, y = pi((xk, yk))
        if any(math.hypot(x - a, y - b) < r for (a, b), r in keep_clear):
            continue
        if any((x - u) ** 2 + (y - v) ** 2 < 19 ** 2 for u, v in occ):
            continue
        if rng.random() > math.exp(-max(road_ls.distance(P_) - 0.04, 0) / 0.12):
            continue
        occ.append((x, y))
        q = road_ls.interpolate(road_ls.project(P_))
        q2 = road_ls.interpolate(road_ls.project(P_) + 0.01)
        ang = -math.degrees(math.atan2(q2.y - q.y, q2.x - q.x)) + rng.normal(0, 7)
        houses.append(f'<use href="#in-h{rng.choice([1, 1, 2, 3, 3])}" transform="translate({x:.1f},{y:.1f}) rotate({ang:.0f})"/>')
    o.append('<g>' + "".join(houses) + '</g>')

    # 徒歩ルート
    for key in ["walk_town_11", "walk_town_14"]:
        d = kp(g[key])
        o.append(f'<path d="{d}" fill="none" stroke="#fffaf0" stroke-width="7" stroke-linecap="round"/>'
                 f'<path d="{d}" fill="none" stroke="{TRAIL}" stroke-width="3.6" stroke-dasharray="0.1 6.4" stroke-linecap="round"/>')
    # 道路とバス路線
    rp = pia(road)
    rd = path_d(rp, True, 0.3)
    o.append(f'<path d="{rd}" fill="none" stroke="#7d6f56" stroke-width="14" stroke-linejoin="round"/>'
             f'<path d="{rd}" fill="none" stroke="#fffaf0" stroke-width="11" stroke-linejoin="round"/>'
             f'<path d="{rd}" fill="none" stroke="{BUSC}" stroke-width="5.5" stroke-linejoin="round"/>')
    rc = np.vstack([rp, rp[:1]])
    rs = cum_len(rc)
    arrows = []
    for frac_s in np.arange(40, rs[-1], 70):
        p, ang = point_at(rc, rs, frac_s)
        if -20 < p[0] < WI + 20 and -20 < p[1] < HI + 20:
            if math.hypot(p[0] - pi(g["stops"][0]["xy"])[0], p[1] - pi(g["stops"][0]["xy"])[1]) > 30:
                arrows.append(f'<path d="M-7 -6.5 L8 0 L-7 6.5 L-4 0 Z" transform="translate({p[0]:.1f},{p[1]:.1f}) rotate({ang:.1f})"/>')
    o.append(f'<g fill="{BUSC}" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round">{"".join(arrows)}</g>')

    # フェリーターミナル
    tx, ty = pi(g["terminal"])
    o.append(f'<rect x="{tx-17:.1f}" y="{ty-9:.1f}" width="34" height="18" rx="3" fill="#ffffff" stroke="{BUSC}" stroke-width="2"/>'
             f'<path d="M{tx-8:.1f} {ty+1:.1f} h16 l-2.5 4 h-11 z M{tx-5:.1f} {ty+1:.1f} v-5 h8 v5" fill="{BUSC}"/>')
    o.append(label(tx + 6, ty + 28, "フェリーターミナル", 12.5, 800, BUSC, "middle", 3.6))
    o.append(label(tx + 6, ty + 43, "蒼玉港へ フェリー・高速船", 11, 700, SUB, "middle", 3.4))
    # レンタサイクル
    cx_, cy_ = pi(g["cycle"])
    o.append(f'<circle cx="{cx_+10:.1f}" cy="{cy_+2:.1f}" r="12" fill="#ffffff" stroke="#2f8a6a" stroke-width="2"/>'
             f'<g transform="translate({cx_+10:.1f},{cy_+1.5:.1f})" fill="none" stroke="#2f8a6a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
             f'<circle cx="-5" cy="2" r="3.6"/><circle cx="5" cy="2" r="3.6"/><path d="M-5 2 L-1.6 -4 L3.6 -4 L5 2 M-1.6 -4 L0.4 2 L3.6 -4 M-2.8 -6 H-0.4"/></g>')
    o.append(label(cx_ + 27, cy_ - 2, "あおいレンタサイクル", 12.5, 800, "#23715a", "start", 3.6))
    o.append(label(cx_ + 27, cy_ + 13, "電動アシスト自転車あり", 11, 700, SUB, "start", 3.4))

    # 停留所
    st = g["stops"][0]
    sx, sy = pi(st["xy"])
    tw = text_w("あおい港", 13) + 18
    o.append(f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="8.5" fill="#ffffff" stroke="{BUSC}" stroke-width="4"/>')
    bx, by = sx - tw - 16, sy - 30
    o.append(f'<path d="M{sx:.1f} {sy:.1f} L{bx+tw-6:.1f} {by+11:.1f}" stroke="{BUSC}" stroke-width="1.6"/>'
             f'<rect x="{bx:.1f}" y="{by:.1f}" width="{tw:.1f}" height="22" rx="11" fill="{BUSC}" stroke="#fff" stroke-width="1.5"/>'
             f'<text x="{bx+tw/2:.1f}" y="{by+15.5:.1f}" font-family="{FONT_MARU}" font-size="13" font-weight="800" fill="#fff" text-anchor="middle">あおい港</text>')
    o.append(label(bx + tw / 2, by - 6, "周回線の起点・終点", 11, 800, BUSC, "middle", 3.4))

    # 徒歩時間の札
    def walk_tag(key, text, frac, dx=0, dy=0):
        P = pia(g[key])
        s_ = cum_len(P)
        p, _a = point_at(P, s_, s_[-1] * frac)
        w = text_w(text, 11.5) + 14
        x0, y0 = p[0] + dx - w / 2, p[1] + dy - 10
        return (f'<rect x="{x0:.1f}" y="{y0:.1f}" width="{w:.1f}" height="20" rx="10" fill="#fffaf0" stroke="{TRAIL}" stroke-width="1.4"/>'
                f'<text x="{p[0]+dx:.1f}" y="{y0+14:.1f}" font-family="{FONT_MARU}" font-size="11.5" font-weight="800" fill="{TRAIL}" text-anchor="middle">{escape(text)}</text>')
    o.append(walk_tag("walk_town_11", "港から徒歩約5分", 0.62, -34, 4))
    o.append(walk_tag("walk_town_14", "港から徒歩約7分", 0.55, 42, 0))

    # スポット
    conf = {8: (-19, 5, "end", "海鮮丼・島の特産品"), 11: (19, 5, "start", "ガラスの小物作り体験"),
            14: (-19, 5, "end", "雨の日の立ち寄りにも")}
    for no in (8, 11, 14):
        sp = SPOTS[no - 1]
        x, y = pi(g["spots"][no])
        col = GROUPS[sp["group"]]["color"]
        dx, dy, anc, sub = conf[no]
        o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="14" fill="{col}" stroke="#fff" stroke-width="2.8"/>'
                 f'<text x="{x:.1f}" y="{y+5.2:.1f}" font-family="{FONT_MARU}" font-size="{15 if no < 10 else 13}" font-weight="900" fill="#fff" text-anchor="middle">{no}</text>')
        o.append(label(x + dx, y + dy - 3, sp["short"], 14.5, 900, INK, anc, 4.4))
        o.append(label(x + dx, y + dy + 13, sub, 11, 700, SUB, anc, 3.4))

    # 方面の案内
    o.append(label(14, pi((1.9, -1.43))[1] + 4, "← あおい温泉入口へ", 11.5, 800, BUSC, "start", 3.6))
    o.append(label(WI - 12, 22, "朝日岬から ↓", 11.5, 800, BUSC, "end", 3.6))
    o.append(label(WI - 14, HI - 16, "蒼玉港へ ↘", 12, 800, "#ffffff", "end", 0))
    o.append(label(70, 318, "あおい集落", 13, 800, "#6b5a3a", "middle", 3.8))
    # 方位と縮尺
    o.append(f'<g transform="translate(30,40)"><path d="M0 -18 L6 6 L0 2 L-6 6 Z" fill="{INK}"/>'
             f'<text x="0" y="22" font-family="{FONT_MARU}" font-size="12" font-weight="900" fill="{INK}" text-anchor="middle">北</text></g>')
    s200 = 0.2 * SI
    o.append(f'<g transform="translate(16,{HI-26})"><rect width="{s200:.1f}" height="6" fill="#fff" stroke="{INK}" stroke-width="1.2"/>'
             f'<rect width="{s200/2:.1f}" height="6" fill="{INK}"/>'
             f'<text x="{s200+6:.1f}" y="7" font-family="{FONT_MARU}" font-size="11" font-weight="800" fill="#fff">200 m</text></g>')
    o.append('</g></svg>')
    return "\n".join(o)
