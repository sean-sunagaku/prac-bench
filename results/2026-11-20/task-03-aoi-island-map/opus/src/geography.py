"""あおい島の地理モデル（km 座標系：x=東、y=北、原点＝島の外接矩形の中心）。

島データの位置の記述を、座標の条件に置き換えて作る。
- 東西に長い楕円形：外接寸法 6.8km × 4.2km、面積 約19.6km²、周囲 約21km
- あおい岳（428m）は中央やや北寄り。鏡池は山頂の南（徒歩約5分）
- 朝日岬＝東端、夕凪岬＝西端、真珠浜＝南西部の海岸、静浦湾＝北東部の入り江
- せせらぎ渓谷はあおい岳の北東斜面から静浦湾へ
- 風の丘は西部、真珠浜と夕凪岬の間の高台
- 周回道路は海岸沿いを一周、バスはあおい港から時計回り
"""
from __future__ import annotations

import math

import numpy as np
from scipy import ndimage
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import nearest_points

RNG_SEED = 20261120
HALF_W, HALF_H = 3.4, 2.1  # km


# ---------------------------------------------------------------- 曲線ユーティリティ
def catmull_rom_closed(pts, samples_per_seg=24, alpha=0.5):
    """中心型 Catmull-Rom で閉曲線を補間する（行き過ぎが出にくい）。"""
    P = np.asarray(pts, dtype=float)
    n = len(P)
    out = []
    for i in range(n):
        p0, p1, p2, p3 = P[(i - 1) % n], P[i], P[(i + 1) % n], P[(i + 2) % n]
        t0 = 0.0
        t1 = t0 + np.linalg.norm(p1 - p0) ** alpha
        t2 = t1 + np.linalg.norm(p2 - p1) ** alpha
        t3 = t2 + np.linalg.norm(p3 - p2) ** alpha
        for t in np.linspace(t1, t2, samples_per_seg, endpoint=False):
            a1 = (t1 - t) / (t1 - t0) * p0 + (t - t0) / (t1 - t0) * p1
            a2 = (t2 - t) / (t2 - t1) * p1 + (t - t1) / (t2 - t1) * p2
            a3 = (t3 - t) / (t3 - t2) * p2 + (t - t2) / (t3 - t2) * p3
            b1 = (t2 - t) / (t2 - t0) * a1 + (t - t0) / (t2 - t0) * a2
            b2 = (t3 - t) / (t3 - t1) * a2 + (t - t1) / (t3 - t1) * a3
            out.append((t2 - t) / (t2 - t1) * b1 + (t - t1) / (t2 - t1) * b2)
    return np.array(out)


def catmull_rom_open(pts, samples_per_seg=20, alpha=0.5):
    P = np.asarray(pts, dtype=float)
    P = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        t0 = 0.0
        t1 = t0 + max(np.linalg.norm(p1 - p0), 1e-9) ** alpha
        t2 = t1 + max(np.linalg.norm(p2 - p1), 1e-9) ** alpha
        t3 = t2 + max(np.linalg.norm(p3 - p2), 1e-9) ** alpha
        for t in np.linspace(t1, t2, samples_per_seg, endpoint=False):
            a1 = (t1 - t) / (t1 - t0) * p0 + (t - t0) / (t1 - t0) * p1
            a2 = (t2 - t) / (t2 - t1) * p1 + (t - t1) / (t2 - t1) * p2
            a3 = (t3 - t) / (t3 - t2) * p2 + (t - t2) / (t3 - t2) * p3
            b1 = (t2 - t) / (t2 - t0) * a1 + (t - t0) / (t2 - t0) * a2
            b2 = (t3 - t) / (t3 - t1) * a2 + (t - t1) / (t3 - t1) * a3
            out.append((t2 - t) / (t2 - t1) * b1 + (t - t1) / (t2 - t1) * b2)
    out.append(P[-2])
    return np.array(out)


def resample(line, step):
    """折れ線を等間隔に打ち直す。"""
    L = np.asarray(line, dtype=float)
    seg = np.linalg.norm(np.diff(L, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    n = max(int(s[-1] / step), 2)
    t = np.linspace(0, s[-1], n + 1)
    return np.column_stack([np.interp(t, s, L[:, 0]), np.interp(t, s, L[:, 1])])


def resample_closed(ring, step):
    R = np.vstack([ring, ring[:1]])
    out = resample(R, step)
    return out[:-1]


def polyline_length(L):
    L = np.asarray(L)
    return float(np.sum(np.linalg.norm(np.diff(L, axis=0), axis=1)))


def ring_length(R):
    R = np.asarray(R)
    return polyline_length(np.vstack([R, R[:1]]))


def signed_area(R):
    x, y = np.asarray(R).T
    return 0.5 * float(np.sum(x * np.roll(y, -1) - np.roll(x, -1) * y))


def periodic_noise(n, rng, kmin, kmax, beta=1.0):
    """長さ n の周期的なゆらぎ（ランダム位相の正弦波の和）。最大値で正規化。"""
    t = np.arange(n) / n
    v = np.zeros(n)
    for k in range(kmin, kmax + 1):
        v += k ** (-beta) * np.sin(2 * np.pi * (k * t + rng.random()))
    return v / np.max(np.abs(v))


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- 海岸線
# 時計回り（地図で見て：東端→南東→南→南西→西端→北西→北→静浦湾→北東）の制御点
COAST_ANCHORS = [
    (3.40, 0.20),    # 朝日岬の先端（東端）
    (3.33, 0.08), (3.20, 0.02), (3.09, -0.06), (3.03, -0.24), (2.97, -0.42),
    (2.99, -0.62), (2.90, -0.82), (2.74, -1.03), (2.62, -1.16),
    (2.50, -1.34), (2.32, -1.42), (2.12, -1.47),   # あおい港の入り江
    (1.82, -1.56), (1.55, -1.68), (1.30, -1.70), (1.00, -1.84), (0.62, -1.90),
    (0.25, -2.04), (-0.18, -2.07),
    (-0.62, -2.10),  # 南端
    (-1.00, -2.02), (-1.30, -2.03), (-1.55, -1.94),
    (-1.84, -1.79),  # 真珠浜（東の端）
    (-2.12, -1.62), (-2.40, -1.42),
    (-2.62, -1.21),  # 真珠浜（西の端）
    (-2.74, -1.04), (-2.90, -0.86), (-2.96, -0.66), (-3.10, -0.50), (-3.20, -0.30),
    (-3.24, -0.22), (-3.34, -0.17),
    (-3.40, -0.07),  # 夕凪岬の先端（西端）
    (-3.34, 0.04), (-3.22, 0.10), (-3.10, 0.24),
    (-2.96, 0.52), (-2.80, 0.72), (-2.66, 0.97), (-2.38, 1.16), (-2.12, 1.40),
    (-1.86, 1.48), (-1.60, 1.66), (-1.28, 1.80), (-0.98, 1.95), (-0.70, 1.96),
    (-0.36, 2.07),
    (0.05, 2.10),    # 北端
    (0.42, 2.06), (0.72, 1.98), (1.00, 1.93),
    (1.20, 1.80),    # 静浦湾 西の岬
    (1.28, 1.56), (1.38, 1.32),
    (1.55, 1.13),    # 湾の奥
    (1.80, 1.05), (2.05, 1.12), (2.25, 1.30), (2.40, 1.55),
    (2.56, 1.71),    # 静浦湾 東の岬
    (2.72, 1.60), (2.84, 1.36), (2.98, 1.20), (3.04, 0.95), (3.08, 0.70),
    (3.14, 0.52), (3.21, 0.40), (3.33, 0.33),
]

# 海岸の「荒さ」（岬・崖は細かく入り組み、砂浜と港はなめらか）
ROUGH_SPOTS = [
    # (x, y, 半径km, 荒さ)
    (3.35, 0.20, 0.55, 1.0),    # 朝日岬
    (-3.30, -0.10, 0.55, 1.0),  # 夕凪岬
    (-2.98, -0.78, 0.45, 0.9),  # 風の丘の崖
    (2.58, 1.70, 0.40, 0.9),    # 静浦湾 東の岬
    (1.24, 1.80, 0.35, 0.8),    # 静浦湾 西の岬
    (-2.50, 1.15, 0.9, 0.7),    # 北西海岸
    (3.05, 0.95, 0.6, 0.7),     # 北東海岸
]
SMOOTH_SPOTS = [
    (-2.27, -1.52, 0.55),  # 真珠浜（砂浜）
    (2.28, -1.45, 0.38),   # あおい港
    (1.80, 1.10, 0.30),    # 静浦の湾奥（漁港）
]


def build_coastline():
    rng = np.random.default_rng(RNG_SEED)
    base = catmull_rom_closed(COAST_ANCHORS, samples_per_seg=40)
    base = resample_closed(base, 0.012)
    n = len(base)
    # 法線（時計回りなので右手側が外）
    d = np.roll(base, -1, axis=0) - np.roll(base, 1, axis=0)
    d /= np.linalg.norm(d, axis=1, keepdims=True)
    normal = np.column_stack([d[:, 1], -d[:, 0]])  # 右手側＝外向き（時計回り）
    rough = np.full(n, 0.45)
    for (x, y, r, a) in ROUGH_SPOTS:
        dist = np.hypot(base[:, 0] - x, base[:, 1] - y)
        rough = np.maximum(rough, a * (1 - smoothstep(0.3 * r, r, dist)))
    for (x, y, r) in SMOOTH_SPOTS:
        dist = np.hypot(base[:, 0] - x, base[:, 1] - y)
        rough = rough * (0.08 + 0.92 * smoothstep(0.45 * r, r, dist))
    mid = periodic_noise(n, rng, 18, 60, beta=0.8)       # 300m〜1km の出入り
    fine = periodic_noise(n, rng, 70, 420, beta=0.75)    # 50〜300m の細かな凹凸
    disp = rough * (0.080 * mid + 0.060 * fine)
    ring = base + normal * disp[:, None]
    # 外接寸法を 6.8 × 4.2 km に正規化
    mn, mx = ring.min(axis=0), ring.max(axis=0)
    ring = (ring - (mn + mx) / 2) / ((mx - mn) / 2) * np.array([HALF_W, HALF_H])
    return ring


# ---------------------------------------------------------------- 主要地点（km）
PEAK = (-0.20, 0.50)          # あおい岳山頂（中央やや北寄り）
POND = (-0.20, 0.27)          # 鏡池（山頂の南、徒歩約5分）
ASAHI_TIP = (3.30, 0.215)     # 朝日岬・あおい灯台（東端）
YUNAGI_TIP = (-3.31, -0.085)  # 夕凪岬（西端）
KAZE_HILL = (-2.60, -0.70)    # 風の丘（真珠浜と夕凪岬の間の高台）
BEACH_MID = (-2.26, -1.53)    # 真珠浜
BAY_CENTER = (1.92, 1.42)     # 静浦湾

# 停留所の目安位置（道路上の最寄り点に吸着させる）
STOP_HINTS = {
    "port": (2.24, -1.31),
    "onsen": (-0.15, -1.90),
    "citrus": (-1.13, -1.86),
    "beach": (-2.04, -1.47),
    "yunagi": (-3.08, -0.10),
    "shrine": (-1.70, 1.55),
    "valley": (1.43, 1.20),
    "shizuura": (2.12, 1.08),
    "asahi": (3.08, 0.26),
}

# 見どころの位置
SPOT_POS = {
    1: ASAHI_TIP,
    2: YUNAGI_TIP,
    3: (-2.60, -0.70),
    4: (-2.30, -1.55),
    5: PEAK,
    6: POND,
    7: (0.80, 0.93),     # 渓谷の遊歩道と小さな滝
    8: (2.40, -1.30),    # みなと市場（港のすぐ隣）
    9: (2.27, 1.245),    # 静浦の朝市（漁港のそば）
    10: (-1.13, -1.53),  # 柑橘園（南向き斜面）
    11: (2.00, -1.06),   # 蒼玉ガラス工房（港から徒歩約5分）
    12: (-0.15, -1.68),  # あおい温泉（入口から徒歩約3分）
    13: (-1.45, 1.30),   # あおい神社（北西麓）
    14: (2.36, -0.84),   # あおい島資料館（港から徒歩約7分）
}

# せせらぎ渓谷の流れ（北東斜面 → 静浦湾の奥）
STREAM_PTS = [(0.06, 0.80), (0.30, 0.86), (0.55, 0.90), (0.80, 0.93),
              (1.03, 1.00), (1.25, 1.08), (1.46, 1.13), (1.54, 1.15)]


def build_road(coast_poly: Polygon):
    """海岸から内側に入った位置を通る周回道路（岬の付け根は横切る）。"""
    inner = coast_poly.buffer(-0.11, join_style=1)
    # 細い出っ張り（岬）を落とす：収縮→膨張
    opened = inner.buffer(-0.14, join_style=1).buffer(0.14, join_style=1)
    if opened.geom_type != "Polygon":
        opened = max(opened.geoms, key=lambda g: g.area)
    ring = np.array(opened.exterior.coords)[:-1]
    if signed_area(ring) > 0:  # 時計回りにそろえる
        ring = ring[::-1]
    ring = resample_closed(ring, 0.05)
    # なめらかにする（周期的な移動平均）
    k = 2
    pad = np.vstack([ring[-k:], ring, ring[:k]])
    ker = np.ones(2 * k + 1) / (2 * k + 1)
    sm = np.column_stack([np.convolve(pad[:, 0], ker, "valid"), np.convolve(pad[:, 1], ker, "valid")])
    sm = resample_closed(sm, 0.02)
    # 海沿いの道らしい小さなうねり（市街地と浜はおだやかに）
    rng = np.random.default_rng(RNG_SEED + 7)
    n = len(sm)
    d = np.roll(sm, -1, axis=0) - np.roll(sm, 1, axis=0)
    d /= np.linalg.norm(d, axis=1, keepdims=True)
    normal = np.column_stack([d[:, 1], -d[:, 0]])
    w = periodic_noise(n, rng, 25, 90, beta=1.1)
    calm = np.ones(n)
    for (x, y, r) in [(2.24, -1.35, 0.7), (-2.2, -1.45, 0.6), (1.9, 1.12, 0.45), (-0.15, -1.9, 0.35)]:
        dist = np.hypot(sm[:, 0] - x, sm[:, 1] - y)
        calm *= 0.25 + 0.75 * smoothstep(0.4 * r, r, dist)
    sm = sm + normal * (0.035 * w * calm)[:, None]
    sm = resample_closed(sm, 0.02)
    return sm


def rotate_ring_to(ring, pt):
    """閉曲線の始点を pt に最も近い点に回す。"""
    i = int(np.argmin(np.hypot(ring[:, 0] - pt[0], ring[:, 1] - pt[1])))
    return np.vstack([ring[i:], ring[:i]])


def arc_position(ring, pt):
    """閉曲線（始点＝あおい港）上での pt の弧長位置。"""
    seg = np.linalg.norm(np.diff(np.vstack([ring, ring[:1]]), axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    i = int(np.argmin(np.hypot(ring[:, 0] - pt[0], ring[:, 1] - pt[1])))
    return float(s[i]), float(s[-1])


# ---------------------------------------------------------------- 標高モデル
def value_noise(shape, cell, rng, octaves=4, persistence=0.5):
    """格子点の乱数を3次補間でならしたフラクタルノイズ（-1〜1付近）。"""
    H, W = shape
    out = np.zeros(shape)
    amp, total = 1.0, 0.0
    c = cell
    for _ in range(octaves):
        gh, gw = int(H / c) + 3, int(W / c) + 3
        g = rng.standard_normal((gh, gw))
        up = ndimage.zoom(g, (H / (gh - 3), W / (gw - 3)), order=3, mode="grid-wrap")[:H, :W]
        if up.shape != shape:
            up = np.pad(up, ((0, H - up.shape[0]), (0, W - up.shape[1])), mode="edge")
        out += amp * up
        total += amp
        amp *= persistence
        c = max(c / 2, 2)
    return out / total


def dist_to_polyline(X, Y, pts):
    P = np.asarray(pts)
    best = np.full(X.shape, np.inf)
    along = np.zeros(X.shape)
    acc = 0.0
    total = polyline_length(P)
    for a, b in zip(P[:-1], P[1:]):
        ab = b - a
        L2 = float(ab @ ab)
        t = np.clip(((X - a[0]) * ab[0] + (Y - a[1]) * ab[1]) / L2, 0, 1)
        dx = X - (a[0] + t * ab[0])
        dy = Y - (a[1] + t * ab[1])
        dd = np.hypot(dx, dy)
        m = dd < best
        best = np.where(m, dd, best)
        along = np.where(m, (acc + t * math.sqrt(L2)) / total, along)
        acc += math.sqrt(L2)
    return best, along


def build_dem(coast_ring, res=0.005, margin=0.15):
    """標高モデル（m）を res km 格子で作る。島の外は -1。"""
    xs = np.arange(-HALF_W - margin, HALF_W + margin + 1e-9, res)
    ys = np.arange(HALF_H + margin, -HALF_H - margin - 1e-9, -res)  # 上が北
    X, Y = np.meshgrid(xs, ys)
    # 島マスク
    inside = points_in_ring(X, Y, coast_ring)
    # 海岸からの距離（km）。放射状の筋を避けるためぼかす
    dist = ndimage.distance_transform_edt(inside) * res
    dist = ndimage.gaussian_filter(dist, sigma=0.06 / res)
    rng = np.random.default_rng(RNG_SEED + 11)

    px, py = PEAK
    # 主峰：東西にやや長い山体
    t = np.hypot((X - px) / 1.18, (Y - py) / 1.0)
    h = 428.0 * np.exp(-(t / 1.22) ** 1.25)
    # 尾根（西：風の丘へ、東：朝日岬へ、南東：あおい集落の裏山へ、南西：柑橘園の斜面へ）
    ridges = [
        ([(px, py), (-1.2, 0.15), (-2.0, -0.35), (-2.6, -0.70)], 95, 0.30),
        ([(px, py), (0.8, 0.35), (1.8, 0.25), (2.75, 0.30)], 85, 0.30),
        ([(px, py), (0.6, -0.20), (1.4, -0.60), (2.2, -0.75)], 70, 0.28),
        ([(px, py), (-0.6, -0.40), (-1.0, -1.10)], 60, 0.30),
        ([(px, py), (-0.9, 1.05), (-1.25, 1.55)], 40, 0.22),
    ]
    for pts, amp, w in ridges:
        dd, along = dist_to_polyline(X, Y, pts)
        h += amp * np.exp(-(dd / w) ** 2) * np.sin(np.clip(along, 0, 1) * np.pi) ** 0.8
    # 風の丘：上の平らな高台
    r = np.hypot(X - KAZE_HILL[0], (Y - KAZE_HILL[1]) / 0.85)
    h += 78.0 * (1 - smoothstep(0.30, 0.62, r))
    # 朝日岬の手前の丘
    for (cx, cy, rr, aa) in [(2.70, 0.35, 0.50, 58.0), (2.62, -0.45, 0.45, 46.0), (0.9, -1.25, 0.55, 30.0)]:
        r = np.hypot(X - cx, Y - cy)
        h += aa * np.exp(-(r / rr) ** 2)
    # 中規模・小規模の起伏
    h += 16.0 * value_noise(X.shape, 0.45 / res, rng, octaves=3) * smoothstep(0.05, 0.6, dist)
    h += 2.5 * value_noise(X.shape, 0.16 / res, rng, octaves=2)
    # 放射状の谷筋（山頂から海へ向かうしわ）。本数・深さ・曲がりをばらつかせる
    ang = np.arctan2(Y - py, X - px)
    dpk = np.hypot(X - px, Y - py)
    warp = value_noise(X.shape, 0.7 / res, rng, octaves=2)
    ang_w = ang + 0.30 * warp + 0.9 * dpk * 0.25
    phase = 11 * ang_w
    gully = (0.5 + 0.5 * np.cos(phase)) ** 3
    k_amp = np.zeros(X.shape)
    for k, (a, ph) in enumerate(zip(rng.random(6), rng.random(6))):
        k_amp += a * np.cos((k + 1) * ang + 2 * np.pi * ph)
    k_amp = np.clip(0.55 + 0.45 * k_amp / 2.0, 0.1, 1.0)
    amp = 17.0 * k_amp * smoothstep(0.28, 0.75, dpk) * (1 - smoothstep(1.4, 2.6, dpk))
    h -= amp * gully
    # 尾根状のノイズ（細かな谷と尾根）
    rn = np.zeros(X.shape)
    for cell, a in [(0.34, 1.0), (0.17, 0.5), (0.085, 0.25)]:
        nz = value_noise(X.shape, cell / res, rng, octaves=1)
        nz = nz / (np.std(nz) + 1e-9)
        rn += a * np.clip(1 - np.abs(nz), -1.5, 1)
    h += 6.0 * rn * smoothstep(0.05, 0.5, dist) * smoothstep(0.10, 0.40, dpk)
    # 山頂をはっきりさせる
    h += 22.0 * np.exp(-(dpk / 0.20) ** 2)
    # せせらぎ渓谷を刻む（上流ほど浅く）
    dd, along = dist_to_polyline(X, Y, STREAM_PTS)
    depth = 55.0 * np.sin(np.clip(along * 0.95 + 0.08, 0, 1) * np.pi) ** 0.7
    h -= depth * np.exp(-(dd / 0.13) ** 2)
    # 集落と浜の後ろは低く平らに
    for (cx, cy, rr, kk) in [(2.28, -1.22, 0.60, 0.85), (2.02, 1.15, 0.38, 0.80),
                             (-2.18, -1.42, 0.40, 0.75), (-0.15, -1.80, 0.30, 0.5)]:
        r = np.hypot(X - cx, Y - cy)
        h *= 1 - kk * np.exp(-(r / rr) ** 2)
    # 鏡池の棚（小さな平坦地）
    r = np.hypot(X - POND[0], (Y - POND[1]) / 0.7)
    shelf = 0.8 * np.exp(-(r / 0.07) ** 2)
    h_pond = h[np.unravel_index(np.argmin(np.hypot(X - POND[0], Y - POND[1])), X.shape)]
    h = h * (1 - shelf) + shelf * h_pond
    # 海岸へ向かって下げる（岬と崖は急、浜はゆるやか）
    taper_d = np.full(X.shape, 0.32)
    for (cx, cy, rr, td) in [(3.30, 0.2, 0.5, 0.10), (-3.30, -0.1, 0.5, 0.10), (-2.98, -0.80, 0.45, 0.12),
                             (2.58, 1.70, 0.35, 0.12), (1.0, 1.95, 1.2, 0.20),
                             (-2.26, -1.53, 0.55, 0.55), (2.25, -1.42, 0.5, 0.45)]:
        r = np.hypot(X - cx, Y - cy)
        wgt = np.exp(-(r / rr) ** 2)
        taper_d = taper_d * (1 - wgt) + td * wgt
    h *= smoothstep(0.0, 1.0, dist / taper_d) ** 0.85
    h = np.maximum(h, 0.0)
    # 山頂が最高点で、ちょうど 428m になるようにそろえる
    ip = np.unravel_index(np.argmin(np.hypot(X - px, Y - py)), X.shape)
    near = np.hypot(X - px, Y - py) < 0.12
    peak_val = h[near].max()
    h = h * (428.0 / peak_val)
    h = np.minimum(h, 428.0)
    h[ip] = 428.0
    h[~inside] = -1.0
    return xs, ys, h, inside


# shapely の点内判定は格子だと遅いので、偶奇判定をベクトル化して使う
def points_in_ring(X, Y, ring):
    R = np.asarray(ring)
    inside = np.zeros(X.shape, dtype=bool)
    xj, yj = R[-1]
    for xi, yi in R:
        cond = ((yi > Y) != (yj > Y)) & (X < (xj - xi) * (Y - yi) / (yj - yi + 1e-15) + xi)
        inside ^= cond
        xj, yj = xi, yi
    return inside



# ---------------------------------------------------------------- 登山道・小道
def trail_south():
    """南麓（あおい温泉側）の登山口 → 鏡池 → 山頂。"""
    pts = [(-0.15, -1.62), (-0.10, -1.30), (-0.20, -1.00), (-0.08, -0.72), (-0.24, -0.45),
           (-0.10, -0.18), (-0.26, 0.05), (-0.17, 0.20), POND, (-0.24, 0.40), PEAK]
    return catmull_rom_open(pts, 16)


def trail_northwest():
    """北西麓（あおい神社側）の登山口 → 山頂。"""
    pts = [(-1.41, 1.24), (-1.25, 1.14), (-1.08, 0.98), (-0.86, 0.95), (-0.72, 0.78),
           (-0.52, 0.74), (-0.40, 0.60), PEAK]
    return catmull_rom_open(pts, 16)


def stream_line():
    return catmull_rom_open(STREAM_PTS, 16)


def build_all():
    coast = build_coastline()
    coast_poly = Polygon(coast)
    road = build_road(coast_poly)
    road = rotate_ring_to(road, STOP_HINTS["port"])
    road_ls = LineString(np.vstack([road, road[:1]]))
    stops = {}
    for sid, hint in STOP_HINTS.items():
        p = nearest_points(road_ls, Point(hint))[0]
        stops[sid] = (p.x, p.y)
    # せせらぎ渓谷入口：道路が渓流を渡る地点に置く
    cross = road_ls.intersection(LineString(stream_line()))
    if not cross.is_empty:
        pts = list(cross.geoms) if hasattr(cross, "geoms") else [cross]
        p = min(pts, key=lambda q: q.distance(Point(STOP_HINTS["valley"])))
        stops["valley"] = (p.x, p.y)
    # 真珠浜海水浴場：浜の西寄り、波打ち際から少し陸に入った砂浜の上（停留所の記号と重ならない位置）
    i = int(np.argmin(np.hypot(coast[:, 0] + 2.36, coast[:, 1] + 1.45)))
    t = coast[(i + 3) % len(coast)] - coast[i - 3]
    t = t / np.linalg.norm(t)
    inland = coast[i] - np.array([-t[1], t[0]]) * 0.045
    if not coast_poly.contains(Point(inland)):
        inland = coast[i] + np.array([-t[1], t[0]]) * 0.045
    SPOT_POS[4] = (float(inland[0]), float(inland[1]))
    return {
        "coast": coast,
        "coast_poly": coast_poly,
        "road": road,
        "stops": stops,
        "spots": dict(SPOT_POS),
        "trail_s": trail_south(),
        "trail_nw": trail_northwest(),
        "stream": stream_line(),
    }


if __name__ == "__main__":
    g = build_all()
    c = g["coast"]
    print("coast pts", len(c))
    print("bbox", c.min(axis=0), c.max(axis=0))
    print("area km2", abs(signed_area(c)))
    print("perimeter km", ring_length(c))
    print("road length km", ring_length(g["road"]))
    print("road orientation (neg=clockwise)", signed_area(g["road"]))
    for sid, p in g["stops"].items():
        print(sid, np.round(p, 3), "arc", np.round(arc_position(g["road"], p), 3))
