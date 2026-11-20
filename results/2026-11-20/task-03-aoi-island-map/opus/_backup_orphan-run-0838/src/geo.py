"""あおい島の地図ジオメトリ（単位: km、x=東、y=北、原点=島の中心）。

島データ（aoi_data.py）の「位置」の記述を、座標に落としたもの。
validate() で、データの記述（東西6.8km・南北4.2km、時計回りの停留所順、
鏡池が山頂の南、など）と食い違っていないかを機械的に確かめる。
"""
from __future__ import annotations

import math
import numpy as np
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import nearest_points

from aoi_data import ISLAND, STOPS, SPOTS

# ---------------------------------------------------------------- 曲線ユーティリティ

def catmull_rom(points, closed=False, step=0.01, alpha=0.5):
    """centripetal Catmull-Rom スプラインを、おおよそ step(km) 間隔でサンプリング。"""
    P = np.asarray(points, dtype=float)
    n = len(P)
    if closed:
        segs = [(P[(i - 1) % n], P[i], P[(i + 1) % n], P[(i + 2) % n]) for i in range(n)]
    else:
        ext = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]])
        segs = [(ext[i], ext[i + 1], ext[i + 2], ext[i + 3]) for i in range(n - 1)]
    out = []
    for p0, p1, p2, p3 in segs:
        def tj(ti, a, b):
            return ti + max(np.linalg.norm(b - a), 1e-9) ** alpha
        t0 = 0.0
        t1 = tj(t0, p0, p1)
        t2 = tj(t1, p1, p2)
        t3 = tj(t2, p2, p3)
        m = max(2, int(math.ceil(np.linalg.norm(p2 - p1) / step)))
        t = np.linspace(t1, t2, m, endpoint=False)[:, None]
        a1 = (t1 - t) / (t1 - t0) * p0 + (t - t0) / (t1 - t0) * p1
        a2 = (t2 - t) / (t2 - t1) * p1 + (t - t1) / (t2 - t1) * p2
        a3 = (t3 - t) / (t3 - t2) * p2 + (t - t2) / (t3 - t2) * p3
        b1 = (t2 - t) / (t2 - t0) * a1 + (t - t0) / (t2 - t0) * a2
        b2 = (t3 - t) / (t3 - t1) * a2 + (t - t1) / (t3 - t1) * a3
        c = (t2 - t) / (t2 - t1) * b1 + (t - t1) / (t2 - t1) * b2
        out.append(c)
    if not closed:
        out.append(P[-1][None, :])
    return np.vstack(out)


def resample(line, step=0.01, closed=False):
    """折れ線を等間隔（step km）に再サンプリング。"""
    L = np.asarray(line, dtype=float)
    if closed:
        L = np.vstack([L, L[:1]])
    seg = np.linalg.norm(np.diff(L, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    total = s[-1]
    n = max(2, int(round(total / step)))
    ts = np.linspace(0, total, n, endpoint=not closed)
    x = np.interp(ts, s, L[:, 0])
    y = np.interp(ts, s, L[:, 1])
    return np.column_stack([x, y])


def polyline_length(line, closed=False):
    L = np.asarray(line)
    if closed:
        L = np.vstack([L, L[:1]])
    return float(np.sum(np.linalg.norm(np.diff(L, axis=0), axis=1)))


def signed_area(poly):
    x, y = poly[:, 0], poly[:, 1]
    return 0.5 * float(np.sum(x * np.roll(y, -1) - np.roll(x, -1) * y))


def normals(line, closed=True):
    L = np.asarray(line)
    if closed:
        d = np.roll(L, -1, axis=0) - np.roll(L, 1, axis=0)
    else:
        d = np.gradient(L, axis=0)
    d /= np.linalg.norm(d, axis=1, keepdims=True) + 1e-12
    return np.column_stack([d[:, 1], -d[:, 0]])  # 右手側法線


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)

# ---------------------------------------------------------------- 海岸線

# 時計回り（東端 → 南 → 西 → 北 → 東）の制御点
COAST_CTRL = [
    (3.40, 0.02),    # 朝日岬の先端（東端）
    (3.34, -0.10),
    (3.18, -0.17),
    (3.02, -0.22),   # 岬の南の付け根
    (2.95, -0.36),
    (2.98, -0.55),
    (2.90, -0.74),
    (2.80, -0.86),
    (2.84, -1.02),
    (2.73, -1.20),
    (2.63, -1.33),
    (2.53, -1.45),   # あおい港（東側の岸壁）
    (2.34, -1.52),
    (2.16, -1.57),   # あおい港（西側）
    (1.98, -1.66),
    (1.78, -1.80),
    (1.55, -1.82),
    (1.30, -1.93),
    (1.05, -1.98),
    (0.80, -1.96),
    (0.55, -2.04),
    (0.25, -2.08),
    (0.05, -2.10),   # 南端
    (-0.15, -2.06),
    (-0.40, -1.97),
    (-0.65, -2.00),
    (-0.95, -2.03),
    (-1.20, -1.98),
    (-1.42, -1.90),
    (-1.62, -1.80),  # 真珠浜（東端）
    (-1.90, -1.66),
    (-2.18, -1.57),
    (-2.42, -1.48),
    (-2.60, -1.42),  # 真珠浜（西端）
    (-2.78, -1.34),
    (-2.88, -1.14),
    (-2.96, -0.92),
    (-2.98, -0.72),
    (-3.04, -0.52),
    (-3.14, -0.36),  # 夕凪岬の南の付け根
    (-3.30, -0.28),
    (-3.40, -0.16),  # 夕凪岬の先端（西端）
    (-3.34, -0.02),
    (-3.18, 0.05),
    (-3.06, 0.16),   # 夕凪岬の北の付け根
    (-3.02, 0.38),
    (-2.92, 0.62),
    (-2.86, 0.82),
    (-2.70, 0.96),
    (-2.58, 1.14),
    (-2.38, 1.30),
    (-2.20, 1.34),
    (-2.02, 1.50),
    (-1.80, 1.66),
    (-1.55, 1.72),
    (-1.30, 1.82),
    (-1.05, 1.92),
    (-0.80, 1.93),
    (-0.55, 2.02),
    (-0.25, 2.06),
    (0.05, 2.10),    # 北端
    (0.30, 2.04),
    (0.55, 1.94),
    (0.80, 1.96),
    (1.10, 1.92),
    (1.36, 1.87),
    (1.58, 1.88),
    (1.78, 1.84),    # 静浦湾の西の岬
    (1.86, 1.70),
    (1.88, 1.52),
    (1.94, 1.34),
    (2.06, 1.18),
    (2.22, 1.09),    # 静浦湾の奥（せせらぎ渓谷の河口）
    (2.40, 1.11),
    (2.52, 1.22),
    (2.60, 1.38),    # 静浦漁港
    (2.68, 1.56),
    (2.80, 1.64),    # 静浦湾の東の岬
    (2.94, 1.52),
    (3.04, 1.30),
    (3.08, 1.08),
    (3.14, 0.86),
    (3.12, 0.66),
    (3.20, 0.46),
    (3.28, 0.26),
    (3.30, 0.14),
]

BEACH_A = (-1.62, -1.80)   # 真珠浜の砂浜区間（東端・西端）
BEACH_B = (-2.60, -1.42)
HARBOR_C = (2.34, -1.52)   # あおい港
SHIZU_PORT_C = (2.58, 1.36)  # 静浦漁港


def _coast_ruggedness(P):
    """岩場は強く、砂浜・港は滑らかに（0〜1.5）。"""
    w = np.ones(len(P))
    beach = LineString([BEACH_A, (-1.90, -1.66), (-2.18, -1.57), (-2.42, -1.48), BEACH_B])
    d_beach = np.array([beach.distance(Point(p)) for p in P])
    w *= smoothstep(0.05, 0.30, d_beach)
    d_h = np.hypot(P[:, 0] - HARBOR_C[0], P[:, 1] - HARBOR_C[1])
    w *= smoothstep(0.18, 0.45, d_h)
    d_s = np.hypot(P[:, 0] - SHIZU_PORT_C[0], P[:, 1] - SHIZU_PORT_C[1])
    w *= smoothstep(0.08, 0.30, d_s)
    # 岬はより荒々しく
    for cx, cy in [(3.35, 0.0), (-3.35, -0.12)]:
        d = np.hypot(P[:, 0] - cx, P[:, 1] - cy)
        w *= 1 + 0.6 * (1 - smoothstep(0.1, 0.6, d))
    return w


def build_coast(bias=0.085, amps=None):
    base = catmull_rom(COAST_CTRL, closed=True, step=0.004)
    base = resample(base, step=0.005, closed=True)
    n = len(base)
    s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(base, axis=0), axis=1))])
    rng = np.random.default_rng(20261120)
    disp = np.zeros(n)
    # 多重周波数のゆらぎ（入り江と小さな岬）。正の値＝内陸側へ。
    amps = amps or [(1.6, 0.030), (0.85, 0.036), (0.42, 0.030), (0.21, 0.018), (0.10, 0.009)]
    for lam, amp in amps:
        k = 2 * math.pi / lam
        ph = rng.uniform(0, 2 * math.pi)
        ph2 = rng.uniform(0, 2 * math.pi)
        disp += amp * (0.65 * np.sin(k * s + ph) + 0.35 * np.sin(1.73 * k * s + ph2))
    w = _coast_ruggedness(base)
    # 東西南北の端（朝日岬・夕凪岬・北端・南端）は動かさない＝寸法を保つ
    ext_idx = [int(np.argmax(base[:, 0])), int(np.argmin(base[:, 0])),
               int(np.argmax(base[:, 1])), int(np.argmin(base[:, 1]))]
    d_ext = np.min([np.hypot(*(base - base[i]).T) for i in ext_idx], axis=0)
    keep = smoothstep(0.06, 0.45, d_ext)
    disp = (disp + bias) * w * keep
    nrm = normals(base, closed=True)   # 時計回りなので右手法線＝内陸向き
    coast = base + nrm * disp[:, None]
    # 外接矩形をデータの寸法（東西6.8 km・南北4.2 km）に正確に合わせる
    minx, miny = coast.min(axis=0)
    maxx, maxy = coast.max(axis=0)
    sx = ISLAND["width_km"] / (maxx - minx)
    sy = ISLAND["height_km"] / (maxy - miny)
    cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
    coast = np.column_stack([(coast[:, 0] - cx) * sx, (coast[:, 1] - cy) * sy])
    return coast, (cx, cy, sx, sy)


def circular_smooth(P, window):
    """閉曲線の移動平均（window 点）。"""
    k = np.ones(window) / window
    pad = window
    ext = np.vstack([P[-pad:], P, P[:pad]])
    xs = np.convolve(ext[:, 0], k, mode="same")[pad:-pad]
    ys = np.convolve(ext[:, 1], k, mode="same")[pad:-pad]
    return np.column_stack([xs, ys])


# 道路が岬の先までは回り込まず、付け根を通るようにする除外円（中心, 半径 km）
ROAD_CUTS = [((3.40, 0.02), 0.30), ((-3.40, -0.16), 0.30)]
ROAD_OFFSET = 0.085   # 海岸から道路までの距離（km）


# 道路を蛇行させない区間（集落・港・砂浜の裏・停留所の前後）
ROAD_CALM = [((2.25, -1.30), 0.80), ((2.62, 1.22), 0.45), ((-2.10, -1.62), 0.60), ((2.20, 0.95), 0.35)]


def _wind(ring, island):
    """岩場の海岸沿いだけ、山裾をなぞるようにゆるく蛇行させる。"""
    n = len(ring)
    s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(ring, axis=0), axis=1))])
    w = np.ones(n)
    for c, r in ROAD_CALM:
        d = np.hypot(ring[:, 0] - c[0], ring[:, 1] - c[1])
        w *= smoothstep(r * 0.6, r, d)
    for sid, p in STOP_APPROX.items():
        d = np.hypot(ring[:, 0] - p[0], ring[:, 1] - p[1])
        w *= smoothstep(0.05, 0.22, d)
    disp = 0.054 * np.sin(2 * math.pi * s / 0.52 + 0.7) + 0.028 * np.sin(2 * math.pi * s / 0.29 + 2.1)
    nrm = normals(ring, closed=True)   # 時計回り → 右手法線は内陸向き
    out = ring + nrm * (disp * w)[:, None]
    # 海岸に近づきすぎた点は内陸側へ押し戻す
    ext = island.exterior
    for i in range(0, n):
        p = Point(out[i])
        dist = ext.distance(p)
        if dist < 0.055:
            out[i] = out[i] + nrm[i] * (0.055 - dist)
    return resample(out, step=0.005, closed=True)


def build_road(island, T):
    from shapely.geometry import MultiPolygon
    inner = island.buffer(-ROAD_OFFSET, join_style=1, resolution=24)
    for (c, r) in ROAD_CUTS:
        inner = inner.difference(Point(T(c)).buffer(r, resolution=48))
    if isinstance(inner, MultiPolygon):
        inner = max(inner.geoms, key=lambda p: p.area)
    ring = np.asarray(inner.exterior.coords)[:-1]
    ring = resample(ring, step=0.005, closed=True)
    ring = circular_smooth(ring, 17)   # 約85 mの移動平均で細かな凹凸をならす
    ring = circular_smooth(ring, 9)
    ring = resample(ring, step=0.005, closed=True)
    if signed_area(ring) > 0:          # 時計回りにそろえる
        ring = ring[::-1]
    ring = _wind(ring, island)
    ring = resample(circular_smooth(ring, 13), step=0.005, closed=True)   # 急な折れをならす
    start = T(STOP_APPROX["minato"])
    i0 = int(np.argmin(np.hypot(ring[:, 0] - start[0], ring[:, 1] - start[1])))
    return np.roll(ring, -i0, axis=0)

# ---------------------------------------------------------------- 周回道路（あおいライン）

# あおい港を起点に時計回り
ROAD_CTRL = [
    (2.30, -1.37),   # あおい港（起点）
    (2.08, -1.45),
    (1.80, -1.61),
    (1.40, -1.76),
    (0.90, -1.85),
    (0.40, -1.89),
    (-0.10, -1.92),
    (-0.55, -1.90),
    (-0.95, -1.86),
    (-1.30, -1.80),
    (-1.62, -1.69),
    (-1.95, -1.56),
    (-2.25, -1.43),
    (-2.52, -1.26),
    (-2.72, -1.04),
    (-2.84, -0.74),
    (-2.94, -0.45),
    (-3.06, -0.17),  # 夕凪岬
    (-2.98, 0.12),
    (-2.88, 0.46),
    (-2.72, 0.80),
    (-2.48, 1.10),
    (-2.16, 1.36),
    (-1.82, 1.57),
    (-1.40, 1.74),
    (-0.95, 1.86),
    (-0.45, 1.93),
    (0.05, 1.95),
    (0.58, 1.91),
    (1.05, 1.83),
    (1.40, 1.71),
    (1.60, 1.52),
    (1.75, 1.27),
    (1.95, 1.06),
    (2.22, 0.98),    # せせらぎ渓谷入口
    (2.48, 1.04),
    (2.68, 1.19),    # 静浦
    (2.88, 1.18),
    (3.02, 0.96),
    (3.08, 0.62),
    (3.10, 0.30),
    (3.10, 0.05),    # 朝日岬
    (2.92, -0.26),
    (2.84, -0.58),
    (2.74, -0.86),
    (2.60, -1.08),
    (2.44, -1.26),
]

STOP_APPROX = {
    "minato": (2.30, -1.37),
    "onsen": (0.30, -1.89),
    "kankitsu": (-0.95, -1.86),
    "shinju": (-1.95, -1.56),
    "yunagi": (-3.06, -0.17),
    "jinja": (-1.62, 1.66),
    "keikoku": (2.21, 0.95),
    "shizuura": (2.68, 1.19),
    "asahi": (3.10, 0.05),
}

# ---------------------------------------------------------------- 地点

SUMMIT = (-0.20, 0.55)
KAGAMI_IKE = (-0.17, 0.33)

SPOT_POS = {
    1: (3.31, 0.02),     # 朝日岬・あおい灯台
    2: (-3.30, -0.15),   # 夕凪岬
    3: (-2.57, -0.71),   # 風の丘展望台
    4: (-2.28, -1.50),   # 真珠浜海水浴場
    5: SUMMIT,           # あおい岳（山頂）
    6: KAGAMI_IKE,       # 鏡池
    7: (1.24, 1.03),     # せせらぎ渓谷（小さな滝）
    8: (2.19, -1.53),    # みなと市場
    9: (2.665, 1.38),    # 静浦の朝市と漁師町
    10: (-1.00, -1.50),  # あおい柑橘園
    11: (2.11, -1.15),   # 蒼玉ガラス工房
    12: (0.25, -1.68),   # あおい温泉
    13: (-1.45, 1.45),   # あおい神社
    14: (2.47, -0.96),   # あおい島資料館
}

FERRY_TERMINAL = (2.37, -1.50)
CYCLE_POS = (2.45, -1.43)
TRAILHEAD_S = (0.17, -1.58)    # 温泉側登山口
TRAILHEAD_NW = (-1.34, 1.36)   # 神社側登山口
WATERFALL = SPOT_POS[7]
LIGHTHOUSE = (3.33, 0.02)

TRAIL_S = [TRAILHEAD_S, (0.05, -1.33), (0.14, -1.02), (-0.02, -0.74), (0.07, -0.47),
           (-0.09, -0.20), (-0.03, 0.04), (-0.14, 0.20), KAGAMI_IKE, (-0.21, 0.45), SUMMIT]
TRAIL_NW = [TRAILHEAD_NW, (-1.13, 1.23), (-0.99, 1.07), (-0.79, 0.99), (-0.62, 0.83),
            (-0.46, 0.77), (-0.31, 0.63), SUMMIT]
WALK_KAZE = [STOP_APPROX["yunagi"], (-2.98, -0.27), (-2.90, -0.35), (-2.80, -0.40),
             (-2.73, -0.50), (-2.66, -0.58), (-2.61, -0.66), SPOT_POS[3]]
WALK_YUNAGI = [STOP_APPROX["yunagi"], (-3.17, -0.15), SPOT_POS[2]]
WALK_ASAHI = [STOP_APPROX["asahi"], (3.21, 0.05), LIGHTHOUSE]
WALK_ONSEN = [STOP_APPROX["onsen"], (0.28, -1.79), SPOT_POS[12]]
WALK_JINJA = [STOP_APPROX["jinja"], (-1.55, 1.56), SPOT_POS[13]]
STREAM = [(0.32, 0.92), (0.55, 1.00), (0.82, 0.97), (1.05, 1.04), WATERFALL, (1.48, 1.05),
          (1.68, 0.99), (1.86, 0.93), (2.02, 0.88), (2.15, 0.89), (2.21, 0.97), (2.23, 1.06), (2.23, 1.14)]
WALK_KEIKOKU = [STOP_APPROX["keikoku"], (2.14, 0.86), (2.00, 0.85), (1.85, 0.90), (1.68, 0.96),
                (1.48, 1.01), (1.33, 0.99), WATERFALL]
# あおい集落の中の歩き道（港 → 工房 / 港 → 資料館）
WALK_TOWN_11 = [FERRY_TERMINAL, (2.28, -1.36), (2.20, -1.27), SPOT_POS[11]]
WALK_TOWN_14 = [FERRY_TERMINAL, (2.36, -1.33), (2.42, -1.20), (2.45, -1.08), SPOT_POS[14]]

# 土地利用（名前はデータにあるものだけ）
AOI_VILLAGE = [(1.90, -1.53), (1.96, -1.25), (2.06, -1.04), (2.30, -0.86), (2.62, -0.83),
               (2.76, -1.06), (2.64, -1.30), (2.50, -1.44), (2.20, -1.53)]
SHIZU_VILLAGE = [(2.46, 1.08), (2.66, 1.06), (2.88, 1.18), (2.90, 1.38), (2.78, 1.52),
                 (2.66, 1.46), (2.58, 1.27)]
ORCHARD = [(-1.42, -1.70), (-1.40, -1.33), (-1.12, -1.20), (-0.70, -1.22), (-0.56, -1.40),
           (-0.60, -1.66), (-0.90, -1.73)]
GRASSLAND = [(-2.95, -0.62), (-2.84, -0.36), (-2.55, -0.32), (-2.26, -0.48), (-2.20, -0.86),
             (-2.40, -1.10), (-2.74, -1.04)]

AOI_BREAKWATERS = [
    [(2.57, -1.40), (2.58, -1.56), (2.50, -1.66), (2.40, -1.69)],
    [(2.06, -1.66), (2.14, -1.71), (2.24, -1.72)],
]
AOI_QUAY = [(2.47, -1.50), (2.22, -1.56)]
SHIZU_BREAKWATER = [[(2.70, 1.58), (2.62, 1.55), (2.53, 1.50)]]

# 本土（蒼玉港）方面への航路（向きはデータに無いので、港の開いている南東へ図示）
FERRY_ROUTE = [(2.36, -1.58), (2.46, -1.80), (2.75, -2.15), (3.30, -2.60), (4.05, -3.05), (4.85, -3.30)]


def build_geometry():
    coast, (cx, cy, sx, sy) = build_coast()

    def T(p):
        p = np.asarray(p, dtype=float)
        return np.column_stack([(p[..., 0] - cx) * sx, (p[..., 1] - cy) * sy]) if p.ndim == 2 \
            else np.array([(p[0] - cx) * sx, (p[1] - cy) * sy])

    island = Polygon(coast)
    road = build_road(island, T)

    stops = []
    s_road = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(road, axis=0), axis=1))])
    for st in STOPS:
        approx = T(STOP_APPROX[st["id"]])
        d = np.hypot(road[:, 0] - approx[0], road[:, 1] - approx[1])
        i = int(np.argmin(d))
        stops.append({**st, "xy": road[i], "s": float(s_road[i]), "i": i})

    def open_curve(pts, step=0.004):
        return resample(catmull_rom(T(pts), closed=False, step=step), step=step)

    # 歩き道は停留所の「スナップ後」の位置から始める
    stop_xy = {s["id"]: s["xy"] for s in stops}

    def walk_from(stop_id, pts):
        P = T(pts)
        P[0] = stop_xy[stop_id]
        return resample(catmull_rom(P, closed=False, step=0.004), step=0.004)

    g = {
        "transform": (cx, cy, sx, sy),
        "coast": coast,
        "road": road,
        "road_s": s_road,
        "stops": stops,
        "spots": {k: T(v) for k, v in SPOT_POS.items()},
        "summit": T(SUMMIT),
        "kagami": T(KAGAMI_IKE),
        "terminal": T(FERRY_TERMINAL),
        "cycle": T(CYCLE_POS),
        "trailhead_s": T(TRAILHEAD_S),
        "trailhead_nw": T(TRAILHEAD_NW),
        "lighthouse": T(LIGHTHOUSE),
        "waterfall": T(WATERFALL),
        "trail_s": open_curve(TRAIL_S),
        "trail_nw": open_curve(TRAIL_NW),
        "walk_kaze": walk_from("yunagi", WALK_KAZE),
        "walk_yunagi": walk_from("yunagi", WALK_YUNAGI),
        "walk_asahi": walk_from("asahi", WALK_ASAHI),
        "walk_onsen": walk_from("onsen", WALK_ONSEN),
        "walk_jinja": walk_from("jinja", WALK_JINJA),
        "walk_keikoku": walk_from("keikoku", WALK_KEIKOKU),
        "walk_town_11": open_curve(WALK_TOWN_11),
        "walk_town_14": open_curve(WALK_TOWN_14),
        "stream": open_curve(STREAM),
        "aoi_village": T(AOI_VILLAGE),
        "shizu_village": T(SHIZU_VILLAGE),
        "orchard": T(ORCHARD),
        "grassland": T(GRASSLAND),
        "aoi_breakwaters": [T(b) for b in AOI_BREAKWATERS],
        "aoi_quay": T(AOI_QUAY),
        "shizu_breakwater": [T(b) for b in SHIZU_BREAKWATER],
        "ferry_route": open_curve(FERRY_ROUTE, step=0.01),
        "beach_ab": (T(BEACH_A), T(BEACH_B)),
    }
    g["island"] = island
    # 砂浜（真珠浜）: 海岸線のうち砂浜区間に沿った細い帯
    beach_line = LineString(T([BEACH_A, (-1.90, -1.66), (-2.18, -1.57), (-2.42, -1.48), BEACH_B]))
    g["beach"] = island.intersection(beach_line.buffer(0.075, cap_style=1)).intersection(
        island.exterior.buffer(0.07))
    return g

# ---------------------------------------------------------------- 検証


def compass_dir(dx, dy):
    ang = math.degrees(math.atan2(dy, dx))  # 0=東, 90=北
    names = ["東", "北東", "北", "北西", "西", "南西", "南", "南東"]
    return names[int(((ang + 22.5) % 360) // 45)]


def island_region(p):
    """島のどの部分か（東西に長い楕円を円に正規化してから8方位）。"""
    return compass_dir(p[0] / (ISLAND["width_km"] / 2), p[1] / (ISLAND["height_km"] / 2))


def _unused(dx, dy):
    ang = math.degrees(math.atan2(dy, dx))
    names = ["東", "北東", "北", "北西", "西", "南西", "南", "南東"]
    return names[int(((ang + 22.5) % 360) // 45)]


def validate(g, verbose=True):
    """島データの記述と、作った座標が一致しているかを確かめる。失敗は AssertionError。"""
    out = []
    fails = []

    def check(cond, info=""):
        if not cond:
            fails.append(info)
            out.append(f"    ↑ NG {info}")
    island = g["island"]
    coast = g["coast"]
    minx, miny = coast.min(axis=0)
    maxx, maxy = coast.max(axis=0)
    w, h = maxx - minx, maxy - miny
    out.append(f"島の外接寸法: 東西 {w:.2f} km / 南北 {h:.2f} km（データ: 約6.8 km / 約4.2 km）")
    check(abs(w - 6.8) < 0.01 and abs(h - 4.2) < 0.01, "abs(w - 6.8) < 0.01 and abs(h - 4.2) < 0.01")
    area = island.area
    out.append(f"島の面積: {area:.1f} km²（データ: 約19.6 km²）")
    check(abs(area - 19.6) < 0.8, area)
    per = polyline_length(coast, closed=True)
    out.append(f"海岸線の長さ: {per:.1f} km（データ: 周囲約21 km）")
    check(19.5 < per < 22.5, per)
    road = g["road"]
    rl = polyline_length(road, closed=True)
    out.append(f"周回道路の長さ: {rl:.1f} km（データ: 全長約21 km）")
    check(18.5 < rl < 22.5, rl)
    # 道路が島の内側を、海岸から離れすぎず近すぎず通っているか
    dists = np.array([island.exterior.distance(Point(p)) for p in road[::10]])
    inside = all(island.contains(Point(p)) for p in road[::10])
    out.append(f"道路は全区間が島内: {inside}／海岸からの距離 {dists.min()*1000:.0f}〜{dists.max()*1000:.0f} m")
    check(inside and dists.min() > 0.04 and dists.max() < 0.5, "inside and dists.min() > 0.04 and dists.max() < 0.5")
    # 時計回り（北が上の地図で、符号付き面積が負）
    sa = signed_area(road)
    out.append(f"道路の向き: {'時計回り' if sa < 0 else '反時計回り'}（データ: 時計回り）")
    check(sa < 0, "sa < 0")
    # 停留所が データの順に並ぶか
    ss = [s["s"] for s in g["stops"]]
    out.append("停留所（あおい港からの道のり）: " + " → ".join(f"{s['name']} {s['s']:.1f}km" for s in g["stops"]))
    check(all(a < b for a, b in zip(ss, ss[1:])), ss)
    # 停留所の方位（島の中心から）
    expect_stop = {"minato": ["南東"], "onsen": ["南"], "kankitsu": ["南", "南西"], "shinju": ["南西"],
                   "yunagi": ["西"], "jinja": ["北西"], "keikoku": ["北東"], "shizuura": ["北東"], "asahi": ["東"]}
    for s in g["stops"]:
        d = island_region(s["xy"])
        ok = d in expect_stop[s["id"]]
        out.append(f"  停留所 {s['name']}: 島の{d}部 {'OK' if ok else 'NG'}")
        check(ok, (s["name"], d))
    # スポット
    sp = g["spots"]
    for k, p in sp.items():
        check(island.contains(Point(p)), k)
    summit = g["summit"]
    out.append(f"あおい岳: 中心から ({summit[0]:+.2f}, {summit[1]:+.2f}) km → 中央やや北寄り")
    check(abs(summit[0]) < 0.6 and 0.2 < summit[1] < 1.0, "abs(summit[0]) < 0.6 and 0.2 < summit[1] < 1.0")
    k = g["kagami"]
    kd = math.dist(k, summit)
    out.append(f"鏡池: 山頂の{compass_dir(k[0]-summit[0], k[1]-summit[1])}へ {kd*1000:.0f} m（データ: 山頂から南へ徒歩約5分）")
    check(compass_dir(k[0] - summit[0], k[1] - summit[1]) == "南" and 0.12 < kd < 0.35)
    # 端の岬
    check(sp[1][0] > 3.2 and sp[2][0] < -3.2, "sp[1][0] > 3.2 and sp[2][0] < -3.2")
    out.append(f"朝日岬: x={sp[1][0]:+.2f} km（東端）／夕凪岬: x={sp[2][0]:+.2f} km（西端）")
    # 方位チェック（スポット）
    expect = {4: ["南西"], 9: ["北東"], 10: ["南", "南西"], 11: ["南東"], 12: ["南"], 13: ["北西"],
              14: ["南東"], 8: ["南東"], 3: ["西", "南西"], 7: ["北東", "北"]}
    for no, dirs in expect.items():
        d = island_region(sp[no])
        out.append(f"  スポット{no:>2} {SPOTS[no-1]['name']}: 島の{d}部 {'OK' if d in dirs else 'NG'}")
        check(d in dirs, (no, d))
    # 山との位置関係
    for no, want in [(12, "南"), (13, "北西")]:
        d = compass_dir(sp[no][0] - summit[0], sp[no][1] - summit[1])
        out.append(f"  {SPOTS[no-1]['name']}: あおい岳の{d}側（データ: {want}麓）")
        check(d == want, (no, d))
    # 風の丘: 真珠浜と夕凪岬の間
    kz = sp[3]
    out.append(f"  風の丘展望台→真珠浜 {math.dist(kz, sp[4]):.2f} km／→夕凪岬 {math.dist(kz, sp[2]):.2f} km")
    # 歩く時間（80 m/分 目安、山道・坂道はやや遅い）
    def walk_len(key):
        return polyline_length(g[key])
    checks = [("walk_kaze", "夕凪岬バス停→風の丘展望台", 10, 0.55, 0.9),
              ("walk_onsen", "あおい温泉入口→あおい温泉", 3, 0.15, 0.32),
              ("walk_town_11", "あおい港→蒼玉ガラス工房", 5, 0.28, 0.45),
              ("walk_town_14", "あおい港→あおい島資料館", 7, 0.42, 0.6)]
    for key, label, minutes, lo, hi in checks:
        L = walk_len(key)
        out.append(f"  {label}: 道のり {L*1000:.0f} m（データ: 徒歩約{minutes}分）")
        check(lo <= L <= hi, (label, L))
    # せせらぎ渓谷: 山頂の北東斜面から静浦湾へ
    st = g["stream"]
    src_dir = compass_dir(st[0][0] - summit[0], st[0][1] - summit[1])
    mouth_in_sea = not island.buffer(-0.005).contains(Point(st[-1]))
    out.append(f"  渓谷の源流: 山頂の{src_dir}／河口が静浦湾に達する: {mouth_in_sea}")
    check(src_dir == "北東" and mouth_in_sea, "src_dir == '北東' and mouth_in_sea")
    # 停留所の最寄り判定：各スポットの最寄り停留所がデータと一致するか（直線距離）
    for s in SPOTS:
        if not s["stop"] or "|" in s["stop"]:
            continue
        p = sp[s["no"]]
        near = min(g["stops"], key=lambda t: math.dist(t["xy"], p))
        ok = near["id"] == s["stop"]
        out.append(f"  最寄り停留所 {s['name']}: {near['name']} {'OK' if ok else 'NG'}")
        check(ok, (s["name"], near["name"]))
    if verbose:
        print("\n".join(out))
    if fails:
        raise AssertionError(f"{len(fails)} 件の不一致: {fails}")
    return out


if __name__ == "__main__":
    g = build_geometry()
    validate(g)
