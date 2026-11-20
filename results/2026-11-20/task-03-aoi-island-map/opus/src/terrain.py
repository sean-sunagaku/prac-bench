"""標高モデルから、地図の陸地の絵（段彩＋陰影のラスター）と等高線（ベクター）を作る。"""
from __future__ import annotations

import base64
import io

import numpy as np
from contourpy import contour_generator
from PIL import Image
from scipy import ndimage
from shapely.geometry import LineString

import geography as G

# 標高 → 色（やわらかい緑から、山頂付近の明るい土色へ）
RAMP = [
    (0, (220, 234, 190)),
    (12, (206, 228, 172)),
    (50, (183, 216, 148)),
    (110, (156, 202, 126)),
    (180, (134, 188, 110)),
    (250, (130, 176, 104)),
    (310, (152, 174, 112)),
    (360, (182, 180, 130)),
    (400, (208, 194, 152)),
    (428, (230, 214, 180)),
]


def color_ramp(h):
    hs = np.array([r[0] for r in RAMP], dtype=float)
    cs = np.array([r[1] for r in RAMP], dtype=float)
    out = np.zeros(h.shape + (3,))
    for i in range(3):
        out[..., i] = np.interp(h, hs, cs[:, i])
    return out


def hillshade(h, res_m, az_deg, alt_deg, z=3.0):
    gy, gx = np.gradient(h * z, res_m)  # 行方向＝南向き（y は北が上の配列）
    # 配列の行は北→南なので、北向きの勾配は -gy
    dzdx, dzdy = gx, -gy
    slope = np.arctan(np.hypot(dzdx, dzdy))
    aspect = np.arctan2(-dzdy, -dzdx)  # 下り方向
    az = np.radians(90 - az_deg)       # 数学座標系（東=0、反時計回り）
    alt = np.radians(alt_deg)
    # 光源方向ベクトル（azの方向から照らす）
    sh = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
    return np.clip(sh, 0, 1)


def build_terrain(geo, px_per_km=320, margin=0.15):
    res = 1.0 / px_per_km
    xs, ys, h, inside = G.build_dem(geo["coast"], res=res, margin=margin)
    res_m = res * 1000
    hsrc = ndimage.gaussian_filter(np.maximum(h, 0), 0.012 / res)
    hs_main = hillshade(hsrc, res_m, 315, 42)
    hs_w = hillshade(hsrc, res_m, 270, 50)
    hs_n = hillshade(hsrc, res_m, 350, 55)
    shade = 0.62 * hs_main + 0.22 * hs_w + 0.16 * hs_n
    flat = np.sin(np.radians(42)) * 0.62 + np.sin(np.radians(50)) * 0.22 + np.sin(np.radians(55)) * 0.16
    rel = shade / flat  # 平地 = 1.0
    col = color_ramp(np.maximum(h, 0))
    X, Y = np.meshgrid(xs, ys)
    # 風の丘の草原（明るい黄緑）
    r = np.hypot(X - G.KAZE_HILL[0], (Y - G.KAZE_HILL[1]) / 0.85)
    meadow = (1 - G.smoothstep(0.22, 0.60, r))[..., None]
    col = col * (1 - 0.65 * meadow) + np.array([214, 230, 160]) * 0.65 * meadow
    # 南向き斜面の柑橘園（やや黄みを帯びた緑）
    r = np.hypot((X + 1.13) / 1.5, (Y + 1.50) / 0.9)
    orchard = (1 - G.smoothstep(0.12, 0.30, r))[..., None]
    col = col * (1 - 0.35 * orchard) + np.array([206, 222, 150]) * 0.35 * orchard
    # 集落のまわりは少し明るく
    for (cx, cy, rr) in [(2.25, -1.18, 0.42), (2.08, 1.17, 0.28)]:
        r = np.hypot(X - cx, Y - cy)
        town = (1 - G.smoothstep(0.3 * rr, rr, r))[..., None]
        col = col * (1 - 0.45 * town) + np.array([232, 230, 210]) * 0.45 * town
    # 陰影を掛ける（暗部は青みを帯びた影、明部はわずかに暖色）
    rel3 = rel[..., None]
    shadow_tint = np.array([70, 92, 110], dtype=float)
    k = np.clip(1 - rel3, 0, 1) * 0.80
    col = col * (1 - k) + shadow_tint * k * 0.50 + col * k * 0.50
    hi = np.clip(rel3 - 1, 0, 0.6)
    col = col + (np.array([255, 250, 232]) - col) * hi * 0.55
    # ごく弱い紙のテクスチャ
    rng = np.random.default_rng(5)
    grain = ndimage.gaussian_filter(rng.standard_normal(h.shape), 0.8)
    col = col + grain[..., None] * 2.2
    # 島の外は海色（クリップで隠れるので何色でもよいが、縁のにじみを防ぐため陸色を外に延ばす）
    if (~inside).any():
        idx = ndimage.distance_transform_edt(~inside, return_distances=False, return_indices=True)
        col = col[idx[0], idx[1]]
    img = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8), "RGB")
    extent = (xs[0], xs[-1], ys[-1], ys[0])  # xmin, xmax, ymin, ymax（km）
    return {"image": img, "extent": extent, "xs": xs, "ys": ys, "h": h, "inside": inside, "res": res}


def contour_lines(terrain, levels=(50, 100, 150, 200, 250, 300, 350, 400), step=2, simplify=0.004):
    xs, ys, h = terrain["xs"][::step], terrain["ys"][::step], terrain["h"][::step, ::step]
    hh = ndimage.gaussian_filter(np.where(h < 0, -20, h), 1.0)
    gen = contour_generator(x=xs, y=ys, z=hh)
    out = {}
    for lv in levels:
        lines = []
        for seg in gen.lines(lv):
            if len(seg) < 6:
                continue
            ls = LineString(seg).simplify(simplify)
            if ls.length < 0.08:
                continue
            lines.append(np.array(ls.coords))
        out[lv] = lines
    return out


def image_data_uri(img, quality=86):
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=quality, optimize=True, progressive=True, subsampling=0)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def elevation_at(terrain, x, y):
    xs, ys, h = terrain["xs"], terrain["ys"], terrain["h"]
    j = int(round((x - xs[0]) / (xs[1] - xs[0])))
    i = int(round((y - ys[0]) / (ys[1] - ys[0])))
    return float(h[i, j])


if __name__ == "__main__":
    import sys
    geo = G.build_all()
    t = build_terrain(geo, px_per_km=200)
    t["image"].save(sys.argv[1] if len(sys.argv) > 1 else "/tmp/terrain.jpg", quality=90)
    h = t["h"]
    i, j = np.unravel_index(np.argmax(h), h.shape)
    print("max", h.max(), "at", t["xs"][j], t["ys"][i])
    for name, p in [("pond", G.POND), ("shrine", G.SPOT_POS[13]), ("onsen", G.SPOT_POS[12]),
                    ("kaze", G.KAZE_HILL), ("citrus", G.SPOT_POS[10]), ("waterfall", G.SPOT_POS[7])]:
        print(name, round(elevation_at(t, *p), 1))
