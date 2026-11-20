"""あおい島の地形（標高モデル → 段彩＋陰影の画像、等高線）。

標高はデータの「あおい岳 428 m（島の最高峰）」に合わせて、山頂でちょうど 428 m に正規化する。
"""
from __future__ import annotations

import io
import math
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
import contourpy

import geo

CELL = 0.004            # km / セル
X0, X1 = -3.6, 3.6
Y0, Y1 = -2.3, 2.3
PEAK_M = 428.0


def grid():
    nx = int(round((X1 - X0) / CELL))
    ny = int(round((Y1 - Y0) / CELL))
    xs = X0 + (np.arange(nx) + 0.5) * CELL
    ys = Y1 - (np.arange(ny) + 0.5) * CELL        # 行0が北
    X, Y = np.meshgrid(xs, ys)
    return X, Y


def to_ij(p):
    return ((p[..., 0] - X0) / CELL, (Y1 - p[..., 1]) / CELL)


def raster_polygon(poly_xy, shape, value=1):
    img = Image.new("L", (shape[1], shape[0]), 0)
    i, j = to_ij(np.asarray(poly_xy))
    ImageDraw.Draw(img).polygon(list(zip(i.tolist(), j.tolist())), fill=value)
    return np.asarray(img) > 0


def raster_line(line_xy, shape, width_px=1):
    img = Image.new("L", (shape[1], shape[0]), 0)
    i, j = to_ij(np.asarray(line_xy))
    ImageDraw.Draw(img).line(list(zip(i.tolist(), j.tolist())), fill=255, width=width_px)
    return np.asarray(img) > 0


def fbm(shape, rng, octaves=5, base=24, persistence=0.5):
    """値ノイズの重ね合わせ（-1..1 程度）。"""
    out = np.zeros(shape)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        n = base * (2 ** o)
        coarse = rng.standard_normal((max(2, int(shape[0] * n / shape[1])) + 3, n + 3))
        zoom = (shape[0] / (coarse.shape[0] - 3), shape[1] / (coarse.shape[1] - 3))
        up = ndimage.zoom(coarse, zoom, order=3)[: shape[0], : shape[1]]
        if up.shape != shape:
            up = np.pad(up, ((0, shape[0] - up.shape[0]), (0, shape[1] - up.shape[1])), mode="edge")
        out += amp * up
        total += amp
        amp *= persistence
    return out / total


def ridge_field(X, Y, pts, amp, width, taper=True):
    """折れ線の尾根（中心からの距離でガウス減衰、先端へ向けて低く）。"""
    line = geo.resample(np.asarray(pts, float), step=0.01)
    s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(line, axis=0), axis=1))])
    s /= s[-1]
    best_d = np.full(X.shape, np.inf)
    best_t = np.zeros(X.shape)
    for k in range(0, len(line), 3):
        d = np.hypot(X - line[k, 0], Y - line[k, 1])
        m = d < best_d
        best_d[m] = d[m]
        best_t[m] = s[k]
    f = np.exp(-(best_d / width) ** 2)
    if taper:
        f *= geo.smoothstep(0.04, 0.22, best_t) * (1 - best_t) ** 1.1
    return ndimage.gaussian_filter(amp * f, 6)


def build_dem(g):
    X, Y = grid()
    shape = X.shape
    rng = np.random.default_rng(428)
    island = raster_polygon(g["coast"], shape)
    dc = ndimage.distance_transform_edt(island) * CELL     # 海岸からの距離 km
    dc = ndimage.gaussian_filter(dc, 18) * island           # 折れ目をならす

    sx, sy = g["summit"]
    r = np.hypot((X - sx) / 1.22, (Y - sy) / 1.0)
    # 山頂は丸く、裾は長くなだらかに
    h = 470 * np.exp(-(np.sqrt(r ** 2 + 0.12 ** 2) / 1.30) ** 1.32)
    # 尾根（山頂から少し離れたところから始まり、先へ向けて低くなる）
    h += ridge_field(X, Y, [(sx, sy), (0.9, 0.35), (1.9, 0.15), (2.9, 0.0)], 42, 0.30)
    h += ridge_field(X, Y, [(sx, sy), (-1.2, 0.15), (-2.0, -0.35), (-2.55, -0.70)], 40, 0.32)
    h += ridge_field(X, Y, [(sx, sy), (-0.7, -0.6), (-1.0, -1.25)], 30, 0.22)
    h += ridge_field(X, Y, [(sx, sy), (0.7, -0.5), (1.4, -1.1)], 32, 0.24)
    h += ridge_field(X, Y, [(sx, sy), (-0.5, 1.2), (-0.7, 1.7)], 26, 0.22)
    h += ridge_field(X, Y, [(sx, sy), (0.45, 1.45), (0.7, 1.85)], 24, 0.20)
    # 風の丘（平らな頂の草原の丘）
    kx, ky = g["spots"][3]
    dk = np.hypot((X - (kx + 0.03)) / 1.1, Y - (ky - 0.04))
    h += 88 * np.exp(-(dk / 0.48) ** 3)
    # 朝日岬の高台
    h += 45 * np.exp(-(np.hypot(X - 3.02, Y - 0.0) / 0.30) ** 2)
    # 渓谷を刻む（源流で深く、河口で浅く）
    st = g["stream"]
    s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(st, axis=0), axis=1))])
    s /= s[-1]
    dv = np.full(shape, np.inf)
    tv = np.zeros(shape)
    for k in range(0, len(st), 2):
        d = np.hypot(X - st[k, 0], Y - st[k, 1])
        m = d < dv
        dv[m] = d[m]
        tv[m] = s[k]
    depth = 46 * (1 - tv) ** 0.7 + 6
    carve = depth * np.exp(-(dv / 0.15) ** 2) + 0.5 * depth * np.exp(-(dv / 0.40) ** 2)
    h -= ndimage.gaussian_filter(carve, 5)

    # 海岸の立ち上がり（岬は崖、砂浜・港・集落はなだらか）
    L = np.full(shape, 0.34)
    for c, rad, val in [((3.30, 0.0), 0.40, 0.12), ((-3.30, -0.15), 0.40, 0.12)]:
        w = np.exp(-(np.hypot(X - c[0], Y - c[1]) / rad) ** 2)
        L = L * (1 - w) + val * w
    for c, rad, val in [((-2.10, -1.62), 0.55, 0.70), ((2.30, -1.20), 0.60, 0.75), ((2.62, 1.22), 0.35, 0.60),
                        ((2.22, 1.05), 0.30, 0.55)]:
        w = np.exp(-(np.hypot(X - c[0], Y - c[1]) / rad) ** 2)
        L = L * (1 - w) + val * w
    f = geo.smoothstep(0, 1, dc / L) ** 0.9

    # 集落・温泉の周りの平地
    flat = np.zeros(shape)
    for poly in [g["aoi_village"], g["shizu_village"]]:
        flat = np.maximum(flat, raster_polygon(poly, shape).astype(float))
    flat = ndimage.gaussian_filter(flat, 25)
    h *= 1 - 0.55 * np.clip(flat * 1.4, 0, 1)

    noise = fbm(shape, rng, octaves=6, base=10, persistence=0.55)
    # 山腹の放射状の沢と尾根（中央に一つ山がある島らしい起伏）
    warp = fbm(shape, np.random.default_rng(99), octaves=3, base=6, persistence=0.5)
    theta = np.arctan2(Y - sy, (X - sx) / 1.22) + 0.75 * warp
    rr = np.hypot((X - sx) / 1.22, Y - sy)
    mod = 0.45 + 0.55 * np.clip(fbm(shape, np.random.default_rng(5), octaves=3, base=5) * 1.6 + 0.5, 0, 1)
    gully = (np.abs(np.sin(7 * theta)) - 0.62) * geo.smoothstep(0.2, 0.6, rr) * (1 - geo.smoothstep(0.9, 1.9, rr)) * mod
    h += ndimage.gaussian_filter(12 * gully, 4)
    rel = np.clip(h / PEAK_M, 0, 1)
    near_top = np.hypot(X - sx, Y - sy)
    h = f * (h + 14 * noise * (0.15 + 0.85 * rel) * geo.smoothstep(0.05, 0.5, dc) * geo.smoothstep(0.08, 0.35, near_top))
    h += 14 * np.exp(-(near_top / 0.07) ** 2)          # 山頂の小さな高まり
    # 鏡池（山頂直下の小さな窪み）
    kxp, kyp = g["kagami"]
    h -= 8 * np.exp(-(np.hypot(X - kxp, Y - kyp) / 0.05) ** 2) * f
    h = ndimage.gaussian_filter(h, 1.5)
    h = np.where(island, np.maximum(h, 0.5), -5.0)

    # 島の最高点＝あおい岳の山頂。そこでちょうど 428 m になるように正規化する
    mi, mj = np.unravel_index(np.argmax(h), h.shape)
    top_xy = (X[mi, mj], Y[mi, mj])
    assert math.dist(top_xy, (sx, sy)) < 0.12, ("最高点が山頂からずれている", top_xy)
    h = np.where(island, h * (PEAK_M / h[mi, mj]), h)
    return X, Y, h, island, dc


def elevation_at(h, p):
    i = int((Y1 - p[1]) / CELL)
    j = int((p[0] - X0) / CELL)
    return float(h[i, j])


RAMP = [  # 標高(m), RGB
    (0, (204, 228, 162)),
    (25, (194, 223, 150)),
    (70, (178, 214, 138)),
    (140, (152, 199, 120)),
    (220, (128, 182, 106)),
    (300, (112, 166, 98)),
    (360, (132, 160, 104)),
    (400, (168, 164, 122)),
    (428, (192, 178, 140)),
]


def colorize(h, island, forest_mask=None):
    hm = np.clip(h, 0, PEAK_M)
    lv = np.array([r[0] for r in RAMP], float)
    cols = np.array([r[1] for r in RAMP], float)
    rgb = np.stack([np.interp(hm, lv, cols[:, c]) for c in range(3)], axis=-1)
    if forest_mask is not None:
        green = np.array([92, 150, 88], float)
        rgb = rgb * (1 - 0.30 * forest_mask[..., None]) + green * 0.30 * forest_mask[..., None]
    return rgb


def hillshade(h, az=315, alt=40, z=2.2):
    cell_m = CELL * 1000
    dy, dx = np.gradient(h * z, cell_m)   # dy は南向き正（ESRI の式の約束どおり）
    slope = np.arctan(np.hypot(dx, dy))
    aspect = np.arctan2(dy, -dx)
    azr = math.radians(360 - az + 90)
    altr = math.radians(alt)
    hs = np.sin(altr) * np.cos(slope) + np.cos(altr) * np.sin(slope) * np.cos(azr - aspect)
    return np.clip(hs, 0, 1)


def land_image(g, h, island, dc):
    shape = h.shape
    X, Y = grid()
    # 森（山の中腹〜上部。柑橘園・草原・集落・海岸近くは除く）
    rng = np.random.default_rng(7)
    patch = fbm(shape, rng, octaves=4, base=8, persistence=0.6)
    forest = geo.smoothstep(35, 120, h + 40 * patch) * (1 - geo.smoothstep(385, 415, h))
    excl = np.zeros(shape)
    for key in ["orchard", "grassland", "aoi_village", "shizu_village"]:
        excl = np.maximum(excl, raster_polygon(g[key], shape).astype(float))
    excl = ndimage.gaussian_filter(excl, 10)
    forest *= 1 - np.clip(excl * 1.5, 0, 1)
    rgb = colorize(h, island, forest)
    hs = hillshade(h)
    flat_hs = math.sin(math.radians(40))
    shade = 1 + 0.62 * (hs - flat_hs)            # 平地は 1.0、日の当たる斜面は明るく
    rgb = rgb * shade[..., None]
    # 海岸沿いの明るい縁（波打ち際の光）
    rim = np.exp(-(dc / 0.035) ** 2) * island
    rgb = rgb * (1 - 0.10 * rim[..., None]) + np.array([246, 244, 222]) * 0.10 * rim[..., None]
    rgb = np.clip(rgb, 0, 255)
    # 海側は低地色で埋める（クリップの縁に海色がにじまないように）
    low = np.array(RAMP[0][1], float)
    rgb[~island] = low
    img = Image.fromarray(rgb.astype(np.uint8), "RGB")
    return img, forest


def contours(h, levels):
    X, Y = grid()
    gen = contourpy.contour_generator(X, Y, h, name="serial")
    out = {}
    for lv in levels:
        lines = gen.lines(lv)
        keep = []
        for ln in lines:
            if len(ln) < 12:
                continue
            ln = np.asarray(ln)
            # 軽く平滑化
            if len(ln) > 7:
                k = np.ones(5) / 5
                xs = np.convolve(np.pad(ln[:, 0], 2, mode="edge"), k, mode="valid")
                ys = np.convolve(np.pad(ln[:, 1], 2, mode="edge"), k, mode="valid")
                ln = np.column_stack([xs, ys])
            keep.append(ln[::2])
        out[lv] = keep
    return out


def build(g):
    X, Y, h, island, dc = build_dem(g)
    img, forest = land_image(g, h, island, dc)
    cont = contours(h, list(range(50, 428, 50)))
    return {"h": h, "island": island, "img": img, "forest": forest, "contours": cont,
            "extent": (X0, X1, Y0, Y1)}


def report(g, h):
    lines = []
    def e(name, p):
        lines.append(f"  {name}: 標高 約{elevation_at(h, p):.0f} m")
    e("あおい岳 山頂", g["summit"])
    e("鏡池", g["kagami"])
    for no in [3, 10, 12, 13, 7, 11, 14, 9, 8]:
        from aoi_data import SPOTS
        e(SPOTS[no - 1]["name"], g["spots"][no])
    lines.append(f"  島の最高点: {h.max():.0f} m")
    return lines


if __name__ == "__main__":
    import sys
    g = geo.build_geometry()
    t = build(g)
    print("\n".join(report(g, t["h"])))
    t["img"].save("../build/land_debug.jpg", quality=88)
    print("saved build/land_debug.jpg", t["img"].size)
