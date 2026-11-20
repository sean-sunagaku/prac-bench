"""
build_scene.py — 箱庭「カピバラの雪見露天風呂」を手続き的に生成し scene.glb に書き出す

実行:
  blender -b --factory-startup -P gen/build_scene.py -- <出力ディレクトリ>

Blender 内部は Z-up（-Y が正面）。glTF 書き出しで Y-up・+Z 正面に変換される。
台座底面の中心が原点、全体は 2.0m 立方以内。
"""
import sys, os, time, math, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import numpy as np
import bpy
from mathutils import Vector
import lib
from lib import (hexc, mix, smoothstep, fbm3, vnoise3, rng, rot_z, rot_x, rot_y, xform, icosphere, uv_sphere,
                 lathe, tube, box, prism, merge_meshes, vertex_normals, new_object, make_material)
import capybara as cp

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.path.dirname(HERE)
T0 = time.time()

# ----------------------------------------------------------------------------
# 寸法（m）
# ----------------------------------------------------------------------------
HALF = 0.90            # 土台ブロックの半幅
CORNER_R = 0.14        # 角の丸み
BOARD_HALF = 0.935     # 木の飾り台の半幅
Z_BOARD = 0.05         # 飾り台の上面
Z_SOIL = 0.340         # 土の上面（縁）
SNOW_T = 0.036         # 積雪の厚み
Z_W = 0.350            # 湯面
TUB_C = np.array([-0.04, -0.03])
TUB_A, TUB_B = 0.55, 0.42
CAPY_XY = np.array([0.02, -0.01])
CAPY_DIR = np.array([-0.5, -0.8660254])   # 顔の向き：正面から 30° 左
LANTERN_XY = np.array([0.50, 0.40])
SLAB_XY = np.array([-0.60, -0.42])        # 湯桶を置く平石
FENCE_Y = 0.80
FENCE_X = 0.80
FENCE_H = 0.62

metrics = {}


def log(*a):
    print(f'[{time.time() - T0:6.2f}s]', *a, flush=True)


# ----------------------------------------------------------------------------
# 湯船の輪郭と地面の高さ
# ----------------------------------------------------------------------------

def tub_delta(th):
    return 0.06 * np.sin(2 * th + 0.7) + 0.04 * np.sin(3 * th + 2.1) + 0.022 * np.sin(5 * th + 0.3)


def tub_point(th, rho=1.0):
    d = 1.0 + tub_delta(th)
    return np.stack([TUB_C[0] + TUB_A * np.cos(th) * d * rho, TUB_C[1] + TUB_B * np.sin(th) * d * rho], axis=-1)


def tub_e(x, y):
    """湯船輪郭からの符号付き距離のおおよそ（m, 内側が負）"""
    nx = (x - TUB_C[0]) / TUB_A
    ny = (y - TUB_C[1]) / TUB_B
    th = np.arctan2(ny, nx)
    rho = np.sqrt(nx * nx + ny * ny) / (1.0 + tub_delta(th))
    reff = np.sqrt((TUB_A * np.cos(th)) ** 2 + (TUB_B * np.sin(th)) ** 2) * (1.0 + tub_delta(th))
    return (rho - 1.0) * reff


def dist_to_fence(x, y):
    d_back = np.where((x > -FENCE_X - 0.05) & (x < FENCE_X + 0.05), np.abs(y - FENCE_Y), 9.0)
    d_left = np.where((y > -0.22) & (y < FENCE_Y + 0.05), np.abs(x + FENCE_X), 9.0)
    d_right = np.where((y > 0.28) & (y < FENCE_Y + 0.05), np.abs(x - FENCE_X), 9.0)
    return np.minimum(np.minimum(d_back, d_left), d_right)


STEP_STONES = [((0.22, -0.80), 0.085, 0.3), ((0.12, -0.665), 0.075, 1.4), ((0.035, -0.555), 0.068, 2.2)]
SNOW_MOUNDS = []   # (x, y, r, h) — 岩の周りの吹き溜まり（岩配置後に追加）


def ground_height(x, y):
    """雪面の高さ（湯船の外側）"""
    x = np.asarray(x, dtype=np.float64)
    y = np.asarray(y, dtype=np.float64)
    P = np.stack([x * 2.2, y * 2.2, np.zeros_like(x) + 3.1], axis=-1)
    h = Z_SOIL + SNOW_T + 0.015 * fbm3(P * 0.8, 3, seed=5) + 0.005 * fbm3(P * 3.5, 2, seed=9)
    h = h + 0.050 * smoothstep(0.30, 0.0, dist_to_fence(x, y))      # 竹垣際の吹き溜まり
    h = h + 0.018 * smoothstep(-0.3, 0.8, y)                         # 奥をわずかに高く
    for (mx, my, mr, mh) in SNOW_MOUNDS:
        r2 = ((x - mx) ** 2 + (y - my) ** 2) / (mr * mr)
        h = h + mh * np.exp(-r2 * 2.2)
    # 飛び石の周りは踏み固められて少し低い
    for (sx, sy), sr, _ in STEP_STONES:
        r2 = ((x - sx) ** 2 + (y - sy) ** 2) / ((sr * 1.6) ** 2)
        h = h - 0.010 * np.exp(-r2 * 2.0)
    return h


Z_FLOOR = None   # カピバラの寸法から決める


def terrain_height(x, y):
    g = ground_height(x, y)
    e = tub_e(x, y)
    w = smoothstep(-0.13, 0.0, e)
    pit = Z_FLOOR + (g - Z_FLOOR) * (w ** 1.6)
    return np.where(e < 0.0, pit, g)


def rounded_square_map(x, y, L, r):
    inner = L - r
    cx = np.clip(x, -inner, inner)
    cy = np.clip(y, -inner, inner)
    ux = (x - cx) / r
    uy = (y - cy) / r
    mx = ux * np.sqrt(np.clip(1 - uy * uy / 2, 0, 1))
    my = uy * np.sqrt(np.clip(1 - ux * ux / 2, 0, 1))
    return cx + r * mx, cy + r * my


def perimeter_loop(L, r, n_side=40, n_corner=10):
    """角丸正方形の周回（反時計回り）と外向き法線"""
    pts = []
    inner = L - r
    corners = [(inner, -inner, -90), (inner, inner, 0), (-inner, inner, 90), (-inner, -inner, 180)]
    for k, (cx, cy, a0) in enumerate(corners):
        # 辺
        prev = corners[k - 1]
        p_start = np.array([prev[0], prev[1]]) + r * np.array([math.cos(math.radians(prev[2] + 90)), math.sin(math.radians(prev[2] + 90))])
        p_end = np.array([cx, cy]) + r * np.array([math.cos(math.radians(a0)), math.sin(math.radians(a0))])
        for t in np.linspace(0, 1, n_side, endpoint=False):
            pts.append(p_start * (1 - t) + p_end * t)
        for t in np.linspace(0, 1, n_corner, endpoint=False):
            a = math.radians(a0 + 90 * t)
            pts.append(np.array([cx + r * math.cos(a), cy + r * math.sin(a)]))
    P = np.array(pts)
    T = np.roll(P, -1, axis=0) - np.roll(P, 1, axis=0)
    T /= np.linalg.norm(T, axis=1, keepdims=True)
    N = np.stack([T[:, 1], -T[:, 0]], axis=1)
    return P, N


def laplacian_smooth(V, F, iters=3, lam=0.5, mask=None):
    F = np.asarray([f[:3] for f in F] if not isinstance(F, np.ndarray) else F[:, :3])
    nV = len(V)
    for _ in range(iters):
        acc = np.zeros_like(V)
        cnt = np.zeros(nV)
        for a, b in ((0, 1), (1, 2), (2, 0)):
            np.add.at(acc, F[:, a], V[F[:, b]])
            np.add.at(cnt, F[:, a], 1)
            np.add.at(acc, F[:, b], V[F[:, a]])
            np.add.at(cnt, F[:, b], 1)
        avg = acc / np.maximum(cnt, 1)[:, None]
        delta = (avg - V) * lam
        if mask is not None:
            delta *= mask[:, None]
        V = V + delta
    return V


def tris(F):
    out = []
    for f in F:
        for i in range(1, len(f) - 1):
            out.append([f[0], f[i], f[i + 1]])
    return np.array(out, dtype=np.int64)


# ----------------------------------------------------------------------------
# マテリアル（glTF 互換の Principled BSDF のみ）
# ----------------------------------------------------------------------------
M = {}


def build_materials():
    M['snow'] = make_material('Snow', rough=0.88, vcol=True, sheen=0.25, sheen_tint=(0.85, 0.9, 1.0), sheen_rough=0.6, spec=0.35)
    M['tubstone'] = make_material('TubStone_Wet', rough=0.5, vcol=True, coat=0.45, coat_rough=0.12)
    M['soil'] = make_material('Soil_CrossSection', rough=0.92, vcol=True)
    M['board'] = make_material('WalnutBoard', rough=0.38, vcol=True, coat=0.6, coat_rough=0.2)
    M['rock_dry'] = make_material('Rock_Dry', rough=0.86, vcol=True)
    M['rock_wet'] = make_material('Rock_Wet', rough=0.62, vcol=True, coat=0.35, coat_rough=0.22)
    M['water'] = make_material('OnsenWater', base=hexc('#2f7a72'), rough=0.03, alpha=0.33, ior=1.333, spec=0.6)
    M['foam'] = make_material('WaterFoam', base=(0.95, 0.97, 0.97), rough=0.3, alpha=0.45)
    M['ripple'] = make_material('WaterRipple', base=(0.9, 0.97, 0.97), rough=0.1, alpha=0.22)
    M['stream'] = make_material('SpoutStream', base=hexc('#d8f1ef'), rough=0.03, alpha=0.55, ior=1.333)
    M['steam'] = make_material('Steam', base=(1, 1, 1), rough=1.0, vcol=True, vcol_alpha=True, double_sided=True,
                               emission=(1, 1, 1), emission_strength=0.18)
    M['fur'] = make_material('CapybaraFur', rough=0.74, vcol=True, sheen=0.3, sheen_tint=(0.95, 0.75, 0.55), sheen_rough=0.45)
    M['fur_wet'] = make_material('CapybaraFur_Wet', rough=0.55, vcol=True)
    M['eye'] = make_material('CapybaraEye', base=hexc('#0b0807'), rough=0.08, coat=1.0, coat_rough=0.03)
    M['yuzu'] = make_material('Yuzu_Peel', rough=0.42, vcol=True, coat=0.35, coat_rough=0.25)
    M['leaf'] = make_material('Leaf_Glossy', rough=0.38, vcol=True, double_sided=True, coat=0.3)
    M['stem'] = make_material('Stem', base=hexc('#5b4a2a'), rough=0.7)
    M['bamboo_green'] = make_material('Bamboo_Green', rough=0.32, vcol=True, coat=0.4, coat_rough=0.15)
    M['bamboo_dry'] = make_material('Bamboo_Dry', rough=0.6, vcol=True)
    M['rope'] = make_material('PalmRope_Black', base=hexc('#1b1512'), rough=0.9)
    M['post'] = make_material('Wood_Post', rough=0.75, vcol=True)
    M['hinoki'] = make_material('Hinoki_Bucket', rough=0.55, vcol=True)
    M['copper'] = make_material('Copper_Hoop', base=hexc('#c07a4a'), rough=0.32, metal=1.0)
    M['granite'] = make_material('Lantern_Granite', rough=0.85, vcol=True)
    M['glow'] = make_material('Lantern_Firebox_Glow', base=hexc('#ffb05e'), rough=0.6,
                              emission=hexc('#ff7e22'), emission_strength=3.2)
    M['berry'] = make_material('Nandina_Berry', base=hexc('#c8141e'), rough=0.2, coat=0.6)
    M['mark'] = make_material('OnsenMark_Vermilion', base=hexc('#c8322a'), rough=0.5)
    M['cloth'] = make_material('Tenugui_Cloth', rough=0.92, vcol=True, sheen=0.5, sheen_tint=(1, 1, 1), double_sided=True)


# ----------------------------------------------------------------------------
# 台座：木の飾り台 + 土の断面 + 雪面（湯船の掘り込み込み）
# ----------------------------------------------------------------------------

def build_base():
    # --- 飾り台
    P, Nrm = perimeter_loop(BOARD_HALF, CORNER_R + 0.03, 44, 12)
    rows = [(Z_BOARD, -0.010), (Z_BOARD - 0.012, 0.0), (0.004, 0.0), (0.0, -0.004)]
    V, F = [], []
    n = len(P)
    for z, off in rows:
        for k in range(n):
            q = P[k] + Nrm[k] * off
            V.append([q[0], q[1], z])
    for r in range(len(rows) - 1):
        for k in range(n):
            k1 = (k + 1) % n
            F.append([r * n + k, (r + 1) * n + k, (r + 1) * n + k1, r * n + k1])
    ct = len(V)
    V.append([0, 0, Z_BOARD])
    for k in range(n):
        F.append([ct, k, (k + 1) % n])
    cb = len(V)
    V.append([0, 0, 0.0])
    base_b = (len(rows) - 1) * n
    for k in range(n):
        F.append([cb, base_b + (k + 1) % n, base_b + k])
    V = np.array(V)
    grain = 0.82 + 0.18 * np.sin(V[:, 1] * 140 + 6 * fbm3(V * np.array([1.5, 6, 6]), 3, seed=3))
    col = np.outer(grain, hexc('#3d2416')) * (1 + 0.08 * fbm3(V * 30, 2, seed=4))[:, None]
    new_object('Base_WalnutBoard', V, F, mat=M['board'], colors=col, smooth=True, sharp_angle=40, group='base')

    # --- 雪面 + 湯船（高さ場）
    N = 80
    u = np.linspace(-HALF, HALF, N + 1)
    U, W = np.meshgrid(u, u, indexing='ij')
    X, Y = rounded_square_map(U, W, HALF, CORNER_R)
    Z = terrain_height(X, Y)
    V = np.stack([X.ravel(), Y.ravel(), Z.ravel()], axis=1)
    idx = np.arange((N + 1) * (N + 1)).reshape(N + 1, N + 1)
    Q = np.stack([idx[:-1, :-1].ravel(), idx[1:, :-1].ravel(), idx[1:, 1:].ravel(), idx[:-1, 1:].ravel()], axis=1)
    e = tub_e(V[:, 0], V[:, 1])
    cent = V[Q].mean(axis=1)
    e_face = tub_e(cent[:, 0], cent[:, 1])
    face_mat = (e_face < -0.004).astype(np.int32)   # 0=雪, 1=湯船の石
    # 色
    nz = fbm3(V * np.array([7, 7, 7]), 3, seed=21)
    snow_c = mix(hexc('#f4f7fb'), hexc('#d9e3f2'), np.clip(0.5 - 0.5 * nz + 0.4 * smoothstep(0.02, -0.02, Z.ravel() - ground_height(V[:, 0], V[:, 1]) + 0.0), 0, 1) * 0.55)
    pebble = fbm3(V * 55, 2, seed=8)
    stone_c = mix(hexc('#4a4744'), hexc('#3d6662'), smoothstep(-0.01, -0.10, e))
    stone_c = mix(stone_c, hexc('#2f5753'), smoothstep(-0.10, -0.25, e))
    stone_c = stone_c * (1 + 0.22 * pebble)[:, None]
    col = np.where((e < -0.004)[:, None], stone_c, snow_c)
    tri_F = lib.quads_to_tris(V, Q)
    tri_mat = np.concatenate([face_mat, face_mat])
    # quads_to_tris は [t1 群, t2 群] の順に返すので face_mat を 2 回並べる
    new_object('Ground_SnowAndTub', V, tri_F, mats=[M['snow'], M['tubstone']], face_mat=tri_mat, colors=col, smooth=True,
               group='base')
    metrics['ground_tris'] = int(len(tri_F))

    # --- 側面（雪の断面 + 土の地層）。境界に 2 行を重ねて色の帯をくっきりさせる
    bidx = list(idx[:, 0]) + list(idx[-1, 1:]) + list(idx[-2::-1, -1]) + list(idx[0, -2:0:-1])
    bidx = bidx[::2]
    B = V[bidx]
    nb = len(B)
    T = np.roll(B[:, :2], -1, axis=0) - np.roll(B[:, :2], 1, axis=0)
    T /= np.linalg.norm(T, axis=1, keepdims=True)
    Nb = np.stack([T[:, 1], -T[:, 0]], axis=1)
    snow_rows = [(0.0, 0.0), (0.006, 0.006), (0.016, 0.009), (0.027, 0.008), (SNOW_T - 0.001, 0.003)]
    layer_hex = ['#3b2a1f', '#5a3d27', '#7d7468', '#8f5e38', '#4a3324']
    bounds = [Z_SOIL - 0.035, Z_SOIL - 0.125, Z_SOIL - 0.165, Z_SOIL - 0.230]
    WV, WC, ROWK = [], [], []
    for k in range(nb):
        top = B[k, 2]
        for dz, off in snow_rows:
            q = B[k, :2] + Nb[k] * off
            WV.append([q[0], q[1], top - dz])
            WC.append(hexc('#eef3fa') * (0.97 + 0.03 * math.sin(k * 0.7)))
        soil_rows = [(top - SNOW_T - 0.002, layer_hex[0])]
        for bi, bz in enumerate(bounds):
            wob = 0.009 * float(fbm3(np.array([B[k, 0] * 4.5, B[k, 1] * 4.5, bi * 3.7]), 2, seed=50 + bi))
            soil_rows.append((bz + wob + 0.0012, layer_hex[bi]))
            soil_rows.append((bz + wob - 0.0012, layer_hex[bi + 1]))
        soil_rows.append((Z_BOARD + 0.0005, layer_hex[-1]))
        for z, hx in soil_rows:
            jitter = 0.003 * float(vnoise3(np.array([B[k, 0] * 22, B[k, 1] * 22, z * 30]), seed=31))
            q = B[k, :2] + Nb[k] * (jitter - 0.001)
            WV.append([q[0], q[1], z])
            WC.append(hexc(hx) * (0.92 + 0.10 * float(vnoise3(np.array([B[k, 0] * 40, B[k, 1] * 40, z * 60]), seed=33))))
    nrows = len(snow_rows) + len(bounds) * 2 + 2
    WV = np.array(WV)
    cols = np.array(WC)
    WF, fm = [], []
    for k in range(nb):
        k1 = (k + 1) % nb
        for r_ in range(nrows - 1):
            WF.append([k * nrows + r_, k * nrows + r_ + 1, k1 * nrows + r_ + 1, k1 * nrows + r_])
            fm.append(0 if r_ < len(snow_rows) - 1 else 1)
    new_object('Base_SoilCrossSection', WV, WF, mats=[M['snow'], M['soil']], face_mat=fm, colors=np.clip(cols, 0, 1),
               smooth=True, group='base')
    # 断面に埋まった小石
    rr = rng(321)
    PV, PF, PC = [], [], []
    off_ = 0
    for i in range(16):
        k = int(rr.integers(0, nb))
        z = rr.uniform(Z_BOARD + 0.03, Z_SOIL - 0.05)
        rad = rr.uniform(0.009, 0.02)
        Vp, Fp = icosphere(1)
        Vp = Vp * np.array([rad * rr.uniform(1.0, 1.6), rad, rad * rr.uniform(0.7, 1.0)])
        Vp = xform(Vp, rot_z(rr.uniform(0, 6.28)), (B[k, 0] + Nb[k, 0] * rad * 0.15, B[k, 1] + Nb[k, 1] * rad * 0.15, z))
        PV.append(Vp)
        PF += [[a + off_ for a in f] for f in Fp]
        off_ += len(Vp)
        PC.append(np.tile(hexc(['#8b8780', '#6f6a63', '#a29d94'][i % 3]), (len(Vp), 1)))
    new_object('Base_SoilPebbles', np.vstack(PV), PF, mat=M['rock_dry'], colors=np.vstack(PC), smooth=False, group='base')


# ----------------------------------------------------------------------------
# 岩
# ----------------------------------------------------------------------------
ROCKS = []   # dict(V,F,center,kind)


def rock_mesh(seed, radii, subdiv=2, flat_top=False, chisel=7):
    V, F = icosphere(subdiv)
    n = V.copy()
    r = rng(seed)
    off = r.uniform(-50, 50, 3)
    disp = 1 + 0.20 * fbm3(n * 1.25 + off, 3, seed=seed) + 0.06 * fbm3(n * 3.6 + off, 2, seed=seed + 1)
    V = n * disp[:, None]
    for k in range(chisel):
        pn = r.normal(size=3)
        pn[2] *= 0.6
        pn /= np.linalg.norm(pn)
        c = r.uniform(0.66, 0.86)
        over = V @ pn - c
        V -= np.maximum(over, 0)[:, None] * pn[None, :] * 0.85
    if flat_top:
        over = V[:, 2] - 0.45
        V[:, 2] -= np.maximum(over, 0) * 0.92
    V = V * np.asarray(radii)
    cav = disp
    return V, F, cav


def rock_colors(V, cav, seed, base_hex, wet_z=None):
    base = hexc(base_hex)
    n1 = fbm3(V * 18 + seed, 3, seed=seed)
    n2 = fbm3(V * 60 + seed, 2, seed=seed + 3)
    col = np.tile(base, (len(V), 1)) * (1 + 0.22 * n1 + 0.10 * n2)[:, None]
    col = col * (0.80 + 0.35 * smoothstep(0.85, 1.12, cav))[:, None]   # くぼみは暗く
    lich = smoothstep(0.35, 0.7, fbm3(V * 9 + 7, 2, seed=seed + 5))
    col = mix(col, col * np.array([0.92, 1.0, 0.85]), 0.5 * lich)
    if wet_z is not None:
        wet = smoothstep(wet_z + 0.06, wet_z - 0.005, V[:, 2])
        col = col * (1 - 0.35 * wet)[:, None]
    return np.clip(col, 0, 1)


def snow_cap(V, F, Nv, thickness, seed, mask=None, threshold=0.42, smooth_iters=7):
    """上向き面に雪を盛るメッシュ（下向き側は内側へ沈めて隠す）"""
    nz = Nv[:, 2] + 0.10 * fbm3(V * 6, 2, seed=seed)
    w = smoothstep(threshold - 0.18, threshold + 0.32, nz)
    if mask is not None:
        w = w * mask
    lump = 0.70 + 0.30 * fbm3(V * 7, 2, seed=seed + 1)
    up = np.array([0, 0, 1.0])
    dirv = Nv * 0.45 + up * 0.55
    Vs = V + dirv * (thickness * lump * w ** 0.7)[:, None] - Nv * (0.004 * (1 - w))[:, None]
    Ft = tris(F) if not isinstance(F, np.ndarray) or F.shape[1] != 3 else F
    keep = w[Ft].max(axis=1) > 0.03
    Ft = Ft[keep]
    Vs = laplacian_smooth(Vs, Ft, iters=smooth_iters, lam=0.5, mask=np.clip(w * 1.6, 0, 1))
    used = np.unique(Ft)
    remap = -np.ones(len(Vs), dtype=np.int64)
    remap[used] = np.arange(len(used))
    return Vs[used], remap[Ft], w[used]


def snow_colors(V, seed=0):
    n = fbm3(V * 20, 2, seed=seed)
    return np.clip(mix(hexc('#f6f9fd'), hexc('#dfe8f5'), 0.35 + 0.35 * n), 0, 1)


def place_rock(name, seed, radii, center, yaw, kind, subdiv=2, flat_top=False, snow=True, snow_mask_fn=None,
               base_hex='#5d5a55', snow_th=0.028, dec_ratio=None):
    V, F, cav = rock_mesh(seed, radii, subdiv, flat_top)
    V = xform(V, rot_z(yaw), center)
    wet = kind == 'rim'
    col = rock_colors(V, cav, seed, base_hex, wet_z=Z_W if wet else None)
    obj = new_object(name, V, F, mat=M['rock_wet'] if wet else M['rock_dry'], colors=col, smooth=True, group='rocks')
    ROCKS.append(dict(V=V, F=F, center=np.asarray(center), kind=kind, name=name, radii=radii))
    if snow:
        Nv = vertex_normals(V, F)
        mask = None if snow_mask_fn is None else snow_mask_fn(V, Nv)
        Vs, Fs, w = snow_cap(V, F, Nv, snow_th, seed + 100, mask=mask)
        if len(Fs) > 0:
            so = new_object(name + '_Snow', Vs, Fs, mat=M['snow'], colors=snow_colors(Vs, seed), smooth=True, group='snow')
            if len(Fs) > 160:
                lib.decimate(so, 0.5)
                Vd, Td = lib.mesh_arrays(so)
                lib.set_vertex_colors(so, snow_colors(Vd, seed))
    if dec_ratio:
        lib.decimate(obj, dec_ratio)
        Vd, Td = lib.mesh_arrays(obj)
        # 減らした後の頂点で色を付け直す（くぼみ値は最近傍で近似）
        lib.set_vertex_colors(obj, _recolor(V, col, Vd))
    return obj


def _recolor(V_src, C_src, V_dst):
    """減面後の頂点に、元の頂点色を最近傍で写す"""
    from mathutils.kdtree import KDTree
    kd = KDTree(len(V_src))
    for i, v in enumerate(V_src):
        kd.insert(v, i)
    kd.balance()
    out = np.zeros((len(V_dst), 3))
    for i, v in enumerate(V_dst):
        _, j, _ = kd.find(v)
        out[i] = C_src[j]
    return out


def build_rocks():
    r = rng(7)
    # 湯船の縁石：雪面からの出っ張りで高さを決める（手前は低く、奥は高く大きく）
    n_rim = 17
    ths = np.linspace(-math.pi, math.pi, n_rim, endpoint=False) + r.uniform(-0.08, 0.08, n_rim) + 0.11
    for i, th in enumerate(ths):
        back = 0.5 + 0.5 * math.sin(th)            # 0=手前, 1=奥
        p = tub_point(np.array(th))
        nrm = np.array([math.cos(th) / TUB_A, math.sin(th) / TUB_B])
        nrm /= np.linalg.norm(nrm)
        size = 0.092 + 0.072 * back + r.uniform(-0.01, 0.02)
        c_xy = p + nrm * size * 0.32
        gz = float(ground_height(np.array(c_xy[0]), np.array(c_xy[1])))
        z_top = max(Z_W + 0.03, gz) + 0.034 + 0.125 * back ** 1.3 + r.uniform(0, 0.015)
        z_bot = Z_W - 0.11
        rz = (z_top - z_bot) / 2
        c = np.array([c_xy[0], c_xy[1], z_top - rz * 0.97])
        radii = (size * r.uniform(1.0, 1.25), size * r.uniform(0.78, 0.95), rz)
        yaw = math.atan2(nrm[1], nrm[0]) + math.pi / 2 + r.uniform(-0.3, 0.3)
        cdir = nrm.copy()

        def mask_fn(V, Nv, cdir=cdir, c=c, size=size):
            # 湯に面した内側は温泉の熱で雪が溶けている
            rel = (V[:, :2] - c[:2]) @ cdir
            return smoothstep(-0.35, 0.35, rel / max(size, 1e-3))

        big = back > 0.55
        place_rock(f'Rock_Rim_{i:02d}', 1000 + i, radii, c, yaw, 'rim', subdiv=3 if big else 2,
                   snow_mask_fn=mask_fn, base_hex=['#5b5853', '#55524e', '#625d55', '#4f4d4b'][i % 4],
                   snow_th=0.016 + 0.022 * back, dec_ratio=0.5 if big else None)
        SNOW_MOUNDS.append((c[0] + nrm[0] * size * 0.9, c[1] + nrm[1] * size * 0.9, size * 1.1, 0.010 + 0.012 * back))
    # 隙間を埋める小石（奥側と側面のみ）
    for i in range(n_rim):
        th = (ths[i] + ths[(i + 1) % n_rim] + (2 * math.pi if i == n_rim - 1 else 0)) / 2
        back = 0.5 + 0.5 * math.sin(th)
        if back < 0.18:
            continue
        p = tub_point(np.array(th), 1.0)
        nrm = np.array([math.cos(th) / TUB_A, math.sin(th) / TUB_B])
        nrm /= np.linalg.norm(nrm)
        size = 0.055 + 0.03 * back + r.uniform(0, 0.015)
        c_xy = p + nrm * 0.06
        gz = float(ground_height(np.array(c_xy[0]), np.array(c_xy[1])))
        z_top = max(Z_W + 0.02, gz) + 0.015 + 0.04 * back
        rz = (z_top - (Z_W - 0.08)) / 2
        c = np.array([c_xy[0], c_xy[1], z_top - rz])
        place_rock(f'Rock_RimSmall_{i:02d}', 2000 + i, (size * 1.15, size * 0.9, rz), c, r.uniform(0, 6.28), 'rim',
                   subdiv=2, snow=back > 0.3, base_hex='#57544f', snow_th=0.014,
                   snow_mask_fn=lambda V, Nv, nrm=nrm, c=c: smoothstep(-0.3, 0.4, ((V[:, :2] - c[:2]) @ nrm) / 0.05))
    # 湯口石（左奥の大岩）と背景の岩
    big = [
        ('Rock_Spout_Big', 3001, (0.20, 0.17, 0.17), (-0.47, 0.40), 0.4),
        ('Rock_Back_Right', 3002, (0.16, 0.13, 0.13), (0.22, 0.47), 1.9),
        ('Rock_Left_Mid', 3003, (0.13, 0.11, 0.10), (-0.66, 0.05), 0.9),
        ('Rock_Front_Right', 3004, (0.11, 0.09, 0.075), (0.58, -0.30), 2.6),
    ]
    for name, seed, radii, (x, y), yaw in big:
        gz = float(ground_height(np.array(x), np.array(y)))
        c = np.array([x, y, gz + radii[2] * 0.35])
        place_rock(name, seed, radii, c, yaw, 'dry', subdiv=3, snow_th=0.034, base_hex='#605c56', dec_ratio=0.55)
        SNOW_MOUNDS.append((x, y, radii[0] * 1.2, 0.022))
    # 湯桶を置く平石（雪面から 2.5cm ほど出す）
    gz = float(ground_height(np.array(SLAB_XY[0]), np.array(SLAB_XY[1])))
    V, F, cav = rock_mesh(4001, (0.15, 0.115, 0.05), 3, flat_top=True, chisel=4)
    V = xform(V, rot_z(0.5), (0, 0, 0))
    V = V + np.array([SLAB_XY[0], SLAB_XY[1], gz + 0.026 - V[:, 2].max()])
    c = np.array([SLAB_XY[0], SLAB_XY[1], gz])
    o = new_object('Rock_FlatSlab', V, F, mat=M['rock_dry'], colors=rock_colors(V, cav, 4001, '#6a655e'), group='rocks')
    ROCKS.append(dict(V=V, F=F, center=c, kind='slab', name='Rock_FlatSlab', radii=(0.15, 0.115, 0.05)))
    SNOW_MOUNDS.append((SLAB_XY[0], SLAB_XY[1], 0.16, -0.004))
    # 飛び石（雪面から 1.4cm ほど出す）
    for i, ((x, y), sr, yaw) in enumerate(STEP_STONES):
        gz = float(ground_height(np.array(x), np.array(y)))
        V, F, cav = rock_mesh(5001 + i, (sr * 1.2, sr, 0.03), 2, flat_top=True, chisel=3)
        V = xform(V, rot_z(yaw), (0, 0, 0))
        V = V + np.array([x, y, gz + 0.014 - V[:, 2].max()])
        new_object(f'Rock_SteppingStone_{i}', V, F, mat=M['rock_dry'], colors=rock_colors(V, cav, 5001 + i, '#77716a'),
                   group='rocks')
        ROCKS.append(dict(V=V, F=F, center=np.array([x, y, gz]), kind='step', name=f'Rock_SteppingStone_{i}', radii=(sr, sr, 0.03)))


# ----------------------------------------------------------------------------
# カピバラ + 柚子
# ----------------------------------------------------------------------------
CAPY = {}


def capy_to_world(P):
    yaw = math.atan2(CAPY_DIR[1], CAPY_DIR[0])
    return xform(P, rot_z(yaw), CAPY['T'])


def world_to_capy(P):
    yaw = math.atan2(CAPY_DIR[1], CAPY_DIR[0])
    return (np.asarray(P) - CAPY['T']) @ rot_z(yaw)


def prepare_capybara():
    global Z_FLOOR
    lm = cp.landmarks()
    wl_local = lm['back_top'][2] + 0.008          # 背中が湯面のすぐ下 → 肩まで浸かる
    CAPY['lm'] = lm
    CAPY['wl_local'] = wl_local
    CAPY['T'] = np.array([CAPY_XY[0], CAPY_XY[1], Z_W - wl_local])
    Z_FLOOR = Z_W - wl_local
    log('capybara waterline(local)', wl_local, 'floor z', Z_FLOOR)


def build_capybara():
    V, T, eyes = cp.build(h=0.0034)
    Vw = capy_to_world(V)
    obj = new_object('Capybara', Vw, T, mat=M['fur'], smooth=True, group='capybara')
    lib.decimate(obj, 16000 / len(T))
    Vd, Td = lib.mesh_arrays(obj)
    Vl = world_to_capy(Vd)
    lib.set_vertex_colors(obj, cp.colors(Vl, CAPY['wl_local']))
    obj.data.materials.append(M['fur_wet'])
    cz = Vl[Td].mean(axis=1)[:, 2]
    fmi = (cz < CAPY['wl_local'] - 0.003).astype(np.int32)
    obj.data.polygons.foreach_set('material_index', fmi)
    obj.data.update()
    metrics['capybara_tris'] = int(len(Td))
    for i, c in enumerate(eyes):
        Vs, Fs = uv_sphere(18, 12)
        new_object(f'Capybara_Eye_{"L" if i == 0 else "R"}', capy_to_world(Vs * cp.EYE_R + c), Fs, mat=M['eye'],
                   group='capybara')
    CAPY['V_local'] = Vl
    # --- 浸かり具合の計測
    lm = CAPY['lm']
    wl = CAPY['wl_local']
    crown = lm['crown']
    eye_z = eyes[0][2]
    metrics['immersion'] = dict(
        water_surface_z=Z_W,
        back_top_below_water_mm=round((wl - lm['back_top'][2]) * 1000, 1),
        eye_above_water_mm=round((eye_z - wl) * 1000, 1),
        crown_above_water_mm=round((crown[2] - wl) * 1000, 1),
        chin_above_water_mm=None,
        submerged_vertex_ratio=round(float(np.mean(Vl[:, 2] < wl)), 3),
        floor_contact_gap_mm=round(float(Vl[:, 2].min()) * 1000, 1),
    )
    # 顎の高さ（頭フレームの下あご付近の最下点）
    Ph = cp.to_head(Vl)
    sel = (Ph[:, 0] > 0.08) & (Ph[:, 0] < 0.25) & (np.abs(Ph[:, 1]) < 0.05)
    if sel.any():
        metrics['immersion']['chin_above_water_mm'] = round((float(Vl[sel, 2].min()) - wl) * 1000, 1)


def build_yuzu():
    lm = CAPY['lm']
    crown_l = lm['crown']
    V, F = icosphere(3)
    n = V.copy()
    pole = np.abs(n[:, 2])
    r = 1 + 0.008 * fbm3(n * 9, 2, seed=76) + 0.012 * fbm3(n * 34, 1, seed=77) - 0.05 * np.exp(-(1 - n[:, 2]) / 0.035) - 0.03 * np.exp(-(1 + n[:, 2]) / 0.05)
    V = n * r[:, None] * np.array([0.046, 0.046, 0.0395])
    tilt = rot_x(math.radians(9)) @ rot_y(math.radians(-6))
    V = V @ tilt.T
    zmin = V[:, 2].min()
    embed = 0.0025
    center_l = crown_l + np.array([0, 0, -zmin - embed])
    Vl = V + center_l
    # 色：黄色、へた付近は黄緑、ところどころ橙
    dimple = fbm3(n * 34, 1, seed=77)
    col = mix(hexc('#f8cf22'), hexc('#f0b414'), 0.45 * smoothstep(0.1, 0.6, fbm3(n * 3, 2, seed=78)))
    col = mix(col, hexc('#c9c83a'), 0.6 * smoothstep(0.82, 0.98, n[:, 2]))
    col = col * (1 - 0.10 * smoothstep(0.0, -0.6, dimple))[:, None]
    yobj = new_object('Yuzu', capy_to_world(Vl), F, mat=M['yuzu'], colors=np.clip(col, 0, 1), group='yuzu')
    # 接地の検証（カピバラの SDF で柚子の頂点をサンプル）
    d = cp.capy_sdf(Vl)
    metrics['yuzu_contact'] = dict(
        min_sdf_mm=round(float(d.min()) * 1000, 2),
        contact_vertices_within_1mm=int(np.sum(d < 0.001)),
        penetration_mm=round(max(0.0, -float(d.min())) * 1000, 2),
        gap_mm=round(max(0.0, float(d.min())) * 1000, 2),
        yuzu_diameter_mm=round(float(np.ptp(Vl[:, 0])) * 1000, 1),
    )
    # へた・軸・葉
    top_l = center_l + tilt @ np.array([0, 0, 0.0395 * 0.95])
    up_l = tilt @ np.array([0, 0, 1.0])
    star = []
    for k in range(10):
        a = k * math.pi / 5
        rr = 0.011 if k % 2 == 0 else 0.0045
        star.append([rr * math.cos(a), rr * math.sin(a)])
    Vc, Fc = prism(np.array(star), -0.0012, 0.0016)
    Vc = Vc @ tilt.T + top_l
    new_object('Yuzu_Calyx', capy_to_world(Vc), Fc, mat=M['leaf'], colors=np.tile(hexc('#3f5a1c'), (len(Vc), 1)),
               smooth=False, group='yuzu')
    stem_path = np.array([top_l + up_l * t for t in np.linspace(0, 0.013, 4)]) + np.array([[0, 0, 0], [0.0005, 0, 0], [0.0015, 0, 0], [0.003, 0, 0]])
    Vs, Fs = tube(stem_path, np.array([0.0026, 0.0024, 0.0022, 0.002]), seg=8)
    new_object('Yuzu_Stem', capy_to_world(Vs), Fs, mat=M['stem'], group='yuzu')
    # 葉（柑橘の葉：先のとがった楕円、中央脈で少し折れる）
    L, Wd = 0.062, 0.030
    nu, nv = 14, 6
    LV = []
    for i in range(nu + 1):
        s = i / nu
        half = Wd / 2 * math.sin(math.pi * s ** 0.85) ** 0.9
        for j in range(nv + 1):
            t = j / nv * 2 - 1
            x = s * L
            y = t * half
            z = 0.004 * abs(t) + 0.010 * s * s     # 中央脈の折れ + 反り
            LV.append([x, y, z])
    LV = np.array(LV)
    LF = []
    for i in range(nu):
        for j in range(nv):
            a = i * (nv + 1) + j
            LF.append([a, a + nv + 1, a + nv + 2, a + 1])
    # 葉の向き：へたから柚子の上をカピバラの後ろ斜め上へ
    Rl = rot_z(math.radians(140)) @ rot_y(math.radians(-12))
    LVw = LV @ Rl.T + stem_path[-1] + np.array([0, 0, 0.0008])
    lc = mix(hexc('#1f4d14'), hexc('#3d7a22'), smoothstep(0, 1, LV[:, 0] / L) * 0.4 + 0.3 * (np.abs(LV[:, 1]) < 0.002))
    new_object('Yuzu_Leaf', capy_to_world(LVw), LF, mat=M['leaf'], colors=lc, group='yuzu')
    d_leaf = cp.capy_sdf(LVw)
    metrics['yuzu_contact']['leaf_min_clearance_mm'] = round(float(d_leaf.min()) * 1000, 1)
    CAPY['yuzu_center_world'] = capy_to_world(center_l[None])[0]


# ----------------------------------------------------------------------------
# お湯：水面・波紋・カピバラまわりの水際
# ----------------------------------------------------------------------------

def waterline_contour(n_ang=84):
    """カピバラの湯面での断面輪郭（ローカル座標）"""
    wl = CAPY['wl_local']
    xs = np.arange(-0.40, 0.50, 0.002)
    ys = np.arange(-0.22, 0.22, 0.002)
    X, Y = np.meshgrid(xs, ys, indexing='ij')
    P = np.stack([X.ravel(), Y.ravel(), np.full(X.size, wl)], axis=1)
    inside = cp.capy_sdf(P) < 0
    if not inside.any():
        return None
    c = P[inside, :2].mean(axis=0)
    pts = []
    for a in np.linspace(0, 2 * math.pi, n_ang, endpoint=False):
        d = np.array([math.cos(a), math.sin(a)])
        ts = np.linspace(0, 0.35, 700)
        Q = np.stack([c[0] + d[0] * ts, c[1] + d[1] * ts, np.full_like(ts, wl)], axis=1)
        ins = cp.capy_sdf(Q) < 0
        k = np.nonzero(ins)[0]
        t_edge = ts[k[-1]] if len(k) else 0.0
        pts.append(t_edge)
    rad = np.array(pts)
    k = 5
    rad_s = np.array([np.mean(np.take(rad, range(i - k, i + k + 1), mode='wrap')) for i in range(len(rad))])
    rad_s = np.maximum(rad_s, rad)          # 体にめり込まないよう外側を優先
    angs = np.linspace(0, 2 * math.pi, n_ang, endpoint=False)
    loop = np.stack([c[0] + np.cos(angs) * rad_s, c[1] + np.sin(angs) * rad_s], axis=1)
    return loop, c


def ring_mesh(loop2d, z, width, height, offset_fn=None):
    """2D 閉曲線に沿った平たい輪（扁平チューブ）"""
    P = np.c_[loop2d, np.full(len(loop2d), z)]
    P = np.vstack([P, P[:1]])
    V, F = tube(P, height, seg=4, cap0=False, cap1=False, scale_b=width / height, up=(0, 0, 1))
    return V, F


def offset_loop(loop, center, dist):
    d = loop - center
    l = np.linalg.norm(d, axis=1, keepdims=True)
    return loop + d / np.maximum(l, 1e-6) * dist


def build_water():
    # 水面
    n_ang, rings = 96, 7
    V = [[TUB_C[0], TUB_C[1], Z_W]]
    ths = np.linspace(-math.pi, math.pi, n_ang, endpoint=False)
    rhos = np.linspace(0.1, 1.15, rings)
    for rho in rhos:
        p = tub_point(ths, rho)
        for q in p:
            V.append([q[0], q[1], Z_W])
    F = []
    for j in range(n_ang):
        F.append([0, 1 + j, 1 + (j + 1) % n_ang])
    for i in range(rings - 1):
        for j in range(n_ang):
            a = 1 + i * n_ang + j
            b = 1 + i * n_ang + (j + 1) % n_ang
            F.append([a, a + n_ang, b + n_ang, b])
    new_object('Onsen_WaterSurface', np.array(V), F, mat=M['water'], smooth=True, group='water')
    # カピバラまわりの水際と波紋
    res = waterline_contour()
    if res is not None:
        loop_l, c_l = res
        for k, (dist, w, h, mat) in enumerate([(0.004, 0.0055, 0.0022, 'foam'), (0.032, 0.0035, 0.0012, 'ripple'),
                                                (0.068, 0.003, 0.001, 'ripple')]):
            lp = offset_loop(loop_l, c_l, dist)
            lp3 = capy_to_world(np.c_[lp, np.full(len(lp), CAPY['wl_local'])])
            Vr, Fr = ring_mesh(lp3[:, :2], Z_W + 0.0006, w, h)
            new_object(f'Water_CapybaraRing_{k}', Vr, Fr, mat=M[mat], group='water')
        metrics['waterline_loop_perimeter_m'] = round(float(np.sum(np.linalg.norm(np.diff(np.vstack([loop_l, loop_l[:1]]), axis=0), axis=1))), 3)


# ----------------------------------------------------------------------------
# 竹の湯口と湯の流れ
# ----------------------------------------------------------------------------

def bamboo_pipe(p0, p1, r, wall, nodes, cut_tan, seg=16):
    p0 = np.asarray(p0, dtype=np.float64)
    p1 = np.asarray(p1, dtype=np.float64)
    t = p1 - p0
    L = np.linalg.norm(t)
    t /= L
    up = np.array([0, 0, 1.0])
    Nn = up - np.dot(up, t) * t
    Nn /= np.linalg.norm(Nn)
    Bn = np.cross(t, Nn)
    ss = sorted(set(list(np.linspace(0, L + r * cut_tan, 14)) + [n + d for n in nodes for d in (-0.006, 0.0, 0.006)]))
    ss = [s for s in ss if 0 <= s <= L + r * cut_tan]
    ang = np.linspace(0, 2 * math.pi, seg, endpoint=False)
    s_end = L + cut_tan * r * np.cos(ang)        # 上側が長く、下側が短い斜め切り
    outer, inner, cols_o = [], [], []
    for s in ss:
        bump = 1.0 + sum(0.07 * math.exp(-((s - n) / 0.004) ** 2) for n in nodes)
        ro = r * bump
        for j, a in enumerate(ang):
            sj = min(s, s_end[j])
            outer.append(p0 + t * sj + ro * (math.cos(a) * Nn + math.sin(a) * Bn))
            si = min(s, s_end[j] - 0.0005)
            inner.append(p0 + t * si + (r - wall) * (math.cos(a) * Nn + math.sin(a) * Bn))
            node_c = sum(math.exp(-((s - n) / 0.006) ** 2) for n in nodes)
            cols_o.append(hexc('#5c7d2b') * (1 - min(1.0, node_c) * 0.25) + hexc('#b5ad5a') * min(1.0, node_c) * 0.25)
    ns = len(ss)
    V = np.array(outer + inner)
    off = ns * seg
    F = []
    for i in range(ns - 1):
        for j in range(seg):
            j1 = (j + 1) % seg
            a0, a1, b0, b1 = i * seg + j, i * seg + j1, (i + 1) * seg + j, (i + 1) * seg + j1
            F.append([a0, a1, b1, b0])
            F.append([off + a0, off + b0, off + b1, off + a1])
    # 切り口（外周と内周をつなぐ）
    last = (ns - 1) * seg
    for j in range(seg):
        j1 = (j + 1) % seg
        F.append([last + j, last + j1, off + last + j1, off + last + j])
    # 根元のふた
    c0 = len(V)
    V = np.vstack([V, p0])
    for j in range(seg):
        F.append([c0, (j + 1) % seg, j])
    col = np.vstack([np.array(cols_o), np.tile(hexc('#2b3315'), (ns * seg, 1)), hexc('#5c7d2b')[None]])
    # 切り口の白っぽい断面色
    col[last:last + seg] = hexc('#d9cf9a')
    col[off + last: off + last + seg] = hexc('#cfc28a')
    # 湯が出る点（切り口の最下点）
    mouth = p0 + t * (L - cut_tan * r) - Nn * r * 0.75
    return V, F, np.clip(col, 0, 1), mouth, t


def build_spout():
    p0 = np.array([-0.505, 0.445, Z_W + 0.275])
    p1 = np.array([-0.285, 0.205, Z_W + 0.158])
    nodes = [0.115, 0.235]
    V, F, col, mouth, tdir = bamboo_pipe(p0, p1, 0.031, 0.0045, nodes, cut_tan=1.0)
    new_object('Bamboo_Spout', V, F, mat=M['bamboo_green'], colors=col, smooth=True, sharp_angle=50, group='spout')
    # 竹筒を岩に固定する黒い縄（2 巻き）
    for k, s_ in enumerate((0.075, 0.095)):
        c = p0 + tdir * s_
        up = np.array([0, 0, 1.0]) - np.dot([0, 0, 1.0], tdir) * tdir
        up /= np.linalg.norm(up)
        sd = np.cross(tdir, up)
        ring = np.array([c + 0.0335 * (math.cos(a_) * up + math.sin(a_) * sd) for a_ in np.linspace(0, 2 * math.pi, 17)])
        Vt, Ft = tube(ring, 0.0035, seg=6, cap0=False, cap1=False)
        new_object(f'Bamboo_Spout_Rope_{k}', Vt, Ft, mat=M['rope'], group='spout')
    # 湯の流れ（放物線）
    v0 = tdir * 0.55
    g = np.array([0, 0, -9.8])
    pts = []
    tt = 0.0
    p = mouth.copy()
    while p[2] > Z_W - 0.01 and tt < 1.0:
        pts.append(p.copy())
        tt += 0.008
        p = mouth + v0 * tt + 0.5 * g * tt * tt
    pts.append(p)
    pts = np.array(pts)
    radii = np.linspace(0.0105, 0.0075, len(pts))
    Vs, Fs = tube(pts, radii, seg=10, scale_b=0.75)
    new_object('Spout_HotWaterStream', Vs, Fs, mat=M['stream'], group='spout')
    land = pts[-1]
    for k, (rr, w, mat) in enumerate([(0.022, 0.006, 'foam'), (0.05, 0.0035, 'ripple'), (0.085, 0.003, 'ripple'), (0.125, 0.0025, 'ripple')]):
        a = np.linspace(0, 2 * math.pi, 36, endpoint=False)
        loop = np.stack([land[0] + rr * np.cos(a) * 1.15, land[1] + rr * np.sin(a)], axis=1)
        Vr, Fr = ring_mesh(loop, Z_W + 0.0006, w, w * 0.4)
        new_object(f'Spout_Ripple_{k}', Vr, Fr, mat=M[mat], group='water')
    # 着水点の泡
    Vb, Fb = icosphere(2)
    Vb = Vb * np.array([0.03, 0.026, 0.008]) + np.array([land[0], land[1], Z_W + 0.001])
    new_object('Spout_Foam', Vb, Fb, mat=M['foam'], group='water')
    metrics['spout'] = dict(mouth=np.round(mouth, 3).tolist(), landing=np.round(land, 3).tolist(),
                            exposed_length_m=round(float(np.linalg.norm(p1 - p0)) - 0.08, 3))


# ----------------------------------------------------------------------------
# 木の湯桶
# ----------------------------------------------------------------------------

def build_bucket():
    slab = [R for R in ROCKS if R['kind'] == 'slab'][0]
    bvh = lib.bvh_from_arrays(slab['V'], slab['F'])
    cx, cy = SLAB_XY + np.array([0.01, 0.0])
    R0 = 0.080
    hs = []
    for a in np.linspace(0, 2 * math.pi, 12, endpoint=False):
        z = lib.ray_down(bvh, cx + R0 * 0.95 * math.cos(a), cy + R0 * 0.95 * math.sin(a))
        hs.append(z)
    zc = lib.ray_down(bvh, cx, cy)
    support = max(hs + [zc])
    z0 = support - 0.0015
    prof = [(0.0, 0.0), (0.077, 0.0), (0.080, 0.004), (0.086, 0.090), (0.0845, 0.094), (0.079, 0.0935),
            (0.075, 0.016), (0.0, 0.016)]
    V, F = lathe(prof, seg=72)
    V = V + np.array([cx, cy, z0])
    ang = (np.arctan2(V[:, 1] - cy, V[:, 0] - cx) + 2 * math.pi) % (2 * math.pi)
    stave = np.floor(ang / (2 * math.pi / 18)).astype(int)
    frac = (ang / (2 * math.pi / 18)) % 1.0
    tone = 0.9 + 0.12 * np.sin(stave * 2.3) + 0.04 * fbm3(V * 80, 2, seed=12)
    col = np.outer(tone, hexc('#d9b07a'))
    col = col * (1 - 0.35 * (np.minimum(frac, 1 - frac) < 0.06))[:, None]
    inner = np.hypot(V[:, 0] - cx, V[:, 1] - cy) < 0.0765
    col[inner & (V[:, 2] > z0 + 0.012)] *= 0.82
    new_object('Wooden_Bucket_Yuoke', V, F, mat=M['hinoki'], colors=np.clip(col, 0, 1), smooth=True, sharp_angle=60,
               group='bucket', merge_dist=1e-5)
    for zz in (0.020, 0.072):
        rr = 0.080 + (0.086 - 0.080) * zz / 0.09
        bp = [(rr - 0.0005, zz - 0.006), (rr + 0.0028, zz - 0.006), (rr + 0.0032, zz), (rr + 0.0028, zz + 0.006), (rr - 0.0005, zz + 0.006)]
        Vh, Fh = lathe(bp, seg=72)
        new_object(f'Wooden_Bucket_Hoop_{0 if zz < 0.05 else 1}', Vh + np.array([cx, cy, z0]), Fh, mat=M['copper'],
                   smooth=True, group='bucket')
    # 桶の中に少しお湯
    Vw, Fw = lathe([(0.0, 0.055), (0.0758, 0.055)], seg=48)
    Fw = [f[::-1] for f in Fw]
    Fw = [f[::-1] for f in Fw]
    new_object('Wooden_Bucket_Water', Vw + np.array([cx, cy, z0]), Fw, mat=M['water'], group='bucket')
    metrics['bucket'] = dict(support_top_z=round(support, 4), bucket_bottom_z=round(z0, 4),
                             embed_mm=round((support - z0) * 1000, 2),
                             support_height_range_mm=round((max(hs) - min(hs)) * 1000, 2))



# ----------------------------------------------------------------------------
# 手ぬぐい（縁石の上にたたんで置く）
# ----------------------------------------------------------------------------

def build_towel():
    rims = [R_ for R_ in ROCKS if R_['name'].startswith('Rock_Rim_')]

    def ang(R_):
        c = R_['center']
        return math.atan2((c[1] - TUB_C[1]) / TUB_B, (c[0] - TUB_C[0]) / TUB_A)

    target = -0.30
    R0 = min(rims, key=lambda R_: abs(math.atan2(math.sin(ang(R_) - target), math.cos(ang(R_) - target))))
    parts = [(R0['V'], R0['F'])]
    so = bpy.data.objects.get(R0['name'] + '_Snow')
    if so is not None:
        parts.append(lib.mesh_arrays(so))
    Vb, Fb = merge_meshes(parts)
    bvh = lib.bvh_from_arrays(Vb, Fb)
    c = R0['center']
    best = None
    for dx in np.linspace(-0.07, 0.07, 15):
        for dy in np.linspace(-0.07, 0.07, 15):
            z = lib.ray_down(bvh, c[0] + dx, c[1] + dy)
            if z is not None and (best is None or z > best[2]):
                best = (c[0] + dx, c[1] + dy, z)
    th = ang(R0)
    tg = np.array([-TUB_A * math.sin(th), TUB_B * math.cos(th)])
    tg /= np.linalg.norm(tg)
    nr = np.array([tg[1], -tg[0]])
    Lx, Ly, nu, nv = 0.112, 0.052, 16, 8
    center = np.array(best[:2]) + nr * 0.004
    Z = np.zeros((nu + 1, nv + 1))
    P2 = np.zeros((nu + 1, nv + 1, 2))
    for i in range(nu + 1):
        for j in range(nv + 1):
            q = center + tg * (i / nu - 0.5) * Lx + nr * (j / nv - 0.5) * Ly
            P2[i, j] = q
            z = lib.ray_down(bvh, q[0], q[1])
            Z[i, j] = np.nan if z is None else z
    valid = ~np.isnan(Z)
    if not valid.all():
        Z[~valid] = np.nanmin(Z) - 0.012
    # 布のなだらかさ：岩の細かい凹凸は拾わず、上側包絡をなめらかに
    from_max = Z.copy()
    for _ in range(3):
        Zp = np.pad(from_max, 1, mode='edge')
        from_max = np.maximum(from_max, (Zp[:-2, 1:-1] + Zp[2:, 1:-1] + Zp[1:-1, :-2] + Zp[1:-1, 2:]) / 4)
    Ztop = from_max + 0.0075
    Zbot = from_max + 0.0004
    V = []
    for layer in (Ztop, Zbot):
        for i in range(nu + 1):
            for j in range(nv + 1):
                V.append([P2[i, j, 0], P2[i, j, 1], layer[i, j]])
    V = np.array(V)
    n1 = (nu + 1) * (nv + 1)
    F = []
    for i in range(nu):
        for j in range(nv):
            a = i * (nv + 1) + j
            F.append([a, a + nv + 1, a + nv + 2, a + 1])
            F.append([n1 + a, n1 + a + 1, n1 + a + nv + 2, n1 + a + nv + 1])
    ring = [i * (nv + 1) for i in range(nu + 1)] + [nu * (nv + 1) + j for j in range(1, nv + 1)] + \
           [i * (nv + 1) + nv for i in range(nu - 1, -1, -1)] + [j for j in range(nv - 1, 0, -1)]
    for k in range(len(ring)):
        a, b = ring[k], ring[(k + 1) % len(ring)]
        F.append([a, b, n1 + b, n1 + a])
    o = new_object('Tenugui_Towel', V, F, mat=M['cloth'], smooth=True, group='extras')
    lib.recalc_normals(o)
    # 白地に藍の縞（両端）
    Vd, Td = lib.mesh_arrays(o)
    u = ((Vd[:, :2] - center) @ tg) / Lx + 0.5
    stripe = ((u < 0.06) | ((u > 0.10) & (u < 0.13)) | (u > 0.94) | ((u > 0.87) & (u < 0.90)))
    col = np.where(stripe[:, None], hexc('#2a4a8a'), hexc('#eef0f2'))
    col = col * (1 + 0.04 * fbm3(Vd * 300, 1, seed=3))[:, None]
    lib.set_vertex_colors(o, np.clip(col, 0, 1))
    metrics['towel'] = dict(on_rock=R0['name'], embed_mm=0.4, max_hang_mm=round(float(Z.max() - Z.min()) * 1000, 1))

# ----------------------------------------------------------------------------
# 竹垣（建仁寺垣）
# ----------------------------------------------------------------------------

def build_fence():
    runs = [
        ('Back', np.array([-FENCE_X, FENCE_Y]), np.array([FENCE_X, FENCE_Y]), np.array([0, -1.0])),
        ('Left', np.array([-FENCE_X, -0.20]), np.array([-FENCE_X, FENCE_Y]), np.array([1.0, 0])),
        ('Right', np.array([FENCE_X, FENCE_Y]), np.array([FENCE_X, 0.30]), np.array([-1.0, 0])),
    ]
    z0 = Z_SOIL - 0.015
    H = FENCE_H
    r = rng(99)
    allS, allR, allT, allP, allSnow = [], [], [], [], []
    tri_total = 0
    for name, a, b, inward in runs:
        d = b - a
        L = np.linalg.norm(d)
        t = d / L
        nrm = inward
        # 立子（割竹）
        sw = 0.029
        n_sl = int(L / sw)
        SV, SF, SC = [], [], []
        for i in range(n_sl):
            s = (i + 0.5) * L / n_sl
            c = a + t * s
            th = 0.009
            hh = H + r.uniform(-0.004, 0.004)
            rows = 5
            base_idx = len(SV)
            tone = r.uniform(0.86, 1.08)
            hue = r.uniform(0, 1)
            node_off = r.uniform(0, 0.2)
            for k in range(rows + 1):
                z = z0 + hh * k / rows
                for (ds, dn) in ((-0.5, -0.5), (0.5, -0.5), (0.5, 0.5), (-0.5, 0.5)):
                    q = c + t * ds * sw * 0.96 + nrm * dn * th * (1.0 if dn > 0 else 1.0)
                    SV.append([q[0], q[1], z])
                    node = math.exp(-((((z - z0) + node_off) % 0.21 - 0.105) / 0.006) ** 2)
                    base_c = hexc('#c9ad74') * (1 - hue * 0.5) + hexc('#a99a5c') * (hue * 0.5)
                    SC.append(base_c * tone * (1 - 0.28 * node))
            for k in range(rows):
                for f in range(4):
                    f1 = (f + 1) % 4
                    a0 = base_idx + k * 4 + f
                    a1 = base_idx + k * 4 + f1
                    SF.append([a0, a1, a1 + 4, a0 + 4])
            top = base_idx + rows * 4
            SF.append([top, top + 1, top + 2, top + 3])
            SF.append([base_idx + 3, base_idx + 2, base_idx + 1, base_idx])
        o = new_object(f'BambooFence_{name}_Slats', np.array(SV), SF, mat=M['bamboo_dry'], colors=np.array(SC),
                       smooth=False, group='fence')
        lib.recalc_normals(o)
        tri_total += lib.tri_count(SF)
        # 押縁（横の割竹）と縄の結び目（表裏）
        RV, RF = [], []
        TV, TF = [], []
        for side in (1, -1):
            for hz in (0.10, 0.27, 0.44, 0.585):
                z = z0 + hz * H / 0.62
                off = nrm * side * 0.0135
                path = np.array([a + t * s + off for s in np.linspace(-0.01, L + 0.01, 24)])
                path = np.c_[path, np.full(len(path), z)]
                Vr, Fr = tube(path[::2], 0.0105, seg=6, scale_b=0.55)
                RV.append((Vr, Fr))
                # 結び目
                n_tie = max(2, int(L / 0.19)) if side == 1 else 0
                for k in range(n_tie):
                    s = (k + 0.5) * L / n_tie
                    cpos = np.r_[a + t * s + nrm * side * 0.0215, z]
                    for sg in (1, -1):
                        dvec = np.r_[t * 0.012 * sg, 0.014]
                        pth = np.array([cpos - dvec, cpos, cpos + dvec])
                        Vt, Ft = tube(pth, 0.0028, seg=4, cap0=False, cap1=False)
                        TV.append((Vt, Ft))
                if side == 1 and hz < 0.5:
                    # 押縁の上にうっすら雪
                    sp = np.array([a + t * s + nrm * 0.0135 for s in np.linspace(0.02, L - 0.02, 22)])
                    zz = z + 0.0075 + 0.0015 * fbm3(np.c_[sp * 30, np.zeros(len(sp))], 1, seed=int(hz * 100))
                    sp3 = np.c_[sp, zz]
                    rad = 0.0055 + 0.002 * fbm3(np.c_[sp * 18, np.ones(len(sp))], 2, seed=int(hz * 100) + 1)
                    rad[:2] *= 0.5
                    rad[-2:] *= 0.5
                    Vsn, Fsn = tube(sp3, rad, seg=6, scale_b=1.25)
                    allSnow.append((Vsn, Fsn))
        Vr, Fr = merge_meshes(RV)
        col = np.tile(hexc('#b89a5e'), (len(Vr), 1)) * (1 + 0.08 * fbm3(Vr * 40, 2, seed=5))[:, None]
        new_object(f'BambooFence_{name}_Rails', Vr, Fr, mat=M['bamboo_dry'], colors=np.clip(col, 0, 1), smooth=True, group='fence')
        tri_total += lib.tri_count(Fr)
        Vt, Ft = merge_meshes(TV)
        new_object(f'BambooFence_{name}_RopeTies', Vt, Ft, mat=M['rope'], smooth=True, group='fence')
        tri_total += lib.tri_count(Ft)
        # 玉縁（笠木の丸竹）
        ztop = z0 + H + 0.010
        path = np.array([np.r_[a + t * s, ztop] for s in np.linspace(-0.012, L + 0.012, 18)])
        Vc, Fc = tube(path, 0.019, seg=8)
        colc = np.tile(hexc('#a88f55'), (len(Vc), 1)) * (1 + 0.1 * fbm3(Vc * 25, 2, seed=6))[:, None]
        new_object(f'BambooFence_{name}_TopCap', Vc, Fc, mat=M['bamboo_dry'], colors=np.clip(colc, 0, 1), group='fence')
        tri_total += lib.tri_count(Fc)
        # 笠木の上の積雪
        ss = np.linspace(-0.02, L + 0.02, max(12, int(L * 20)))
        sp = np.array([np.r_[a + t * s, 0] for s in ss])
        nz = fbm3(np.c_[sp[:, :2] * 9, np.full(len(sp), 2.0 + len(name))], 3, seed=11 + len(name))
        sp[:, 2] = ztop + 0.017 + 0.007 * nz
        rad = 0.026 + 0.008 * nz
        rad[:2] = [0.012, 0.02]
        rad[-2:] = [0.02, 0.012]
        Vs, Fs = tube(sp, rad, seg=9, scale_b=1.25)
        Vs[:, 2] = np.maximum(Vs[:, 2], ztop - 0.004)
        allSnow.append((Vs, Fs))
        # 親柱
        n_post = max(2, int(round(L / 0.55)) + 1)
        for k in range(n_post):
            s = L * k / (n_post - 1)
            cxy = a + t * s - nrm * 0.0
            path = np.array([np.r_[cxy, z0 - 0.05], np.r_[cxy, z0 + H + 0.045]])
            path = np.array([path[0] + (path[1] - path[0]) * u for u in np.linspace(0, 1, 6)])
            Vp, Fp = tube(path, 0.026, seg=8)
            colp = np.tile(hexc('#5a4330'), (len(Vp), 1)) * (1 + 0.15 * fbm3(Vp * np.array([60, 60, 8]), 2, seed=k))[:, None]
            allP.append((Vp, Fp, colp))
            # 柱頭の雪
            Vsc, Fsc = icosphere(1)
            Vsc = Vsc * np.array([0.032, 0.032, 0.02]) + np.r_[cxy, z0 + H + 0.05]
            allSnow.append((Vsc, Fsc))
    Vp = np.vstack([p[0] for p in allP])
    Fp = []
    off = 0
    for p in allP:
        Fp += [[i + off for i in f] for f in p[1]]
        off += len(p[0])
    new_object('BambooFence_Posts', Vp, Fp, mat=M['post'], colors=np.clip(np.vstack([p[2] for p in allP]), 0, 1), group='fence')
    tri_total += lib.tri_count(Fp)
    Vs, Fs = merge_meshes(allSnow)
    new_object('BambooFence_Snow', Vs, Fs, mat=M['snow'], colors=snow_colors(Vs, 3), group='snow')
    metrics['fence_tris'] = int(tri_total)


# ----------------------------------------------------------------------------
# 石灯籠（雪見灯籠）
# ----------------------------------------------------------------------------

def hexagon(rad, phase=0.0):
    return np.array([[rad * math.cos(phase + k * math.pi / 3), rad * math.sin(phase + k * math.pi / 3)] for k in range(6)])


def hex_radius(phi, R, phase=0.0):
    a = ((phi - phase) % (math.pi / 3)) - math.pi / 6
    return R * math.cos(math.pi / 6) / np.cos(a)


def polar_hex_grid(R, n_rings, per_side, phase, zfun, rho0=0.0):
    """六角形の上を覆う極座標格子。zfun(rho, phi) -> z"""
    n_ang = 6 * per_side
    phis = np.linspace(0, 2 * math.pi, n_ang, endpoint=False) + phase
    V, F = [], []
    rhos = np.linspace(rho0, 1.0, n_rings + 1)
    start = 0
    if rho0 == 0.0:
        V.append([0, 0, zfun(0.0, 0.0)])
        rhos = rhos[1:]
        start = 1
    for rho in rhos:
        for ph in phis:
            rr = hex_radius(ph, R, phase) * rho
            V.append([rr * math.cos(ph), rr * math.sin(ph), zfun(rho, ph)])
    nr = len(rhos)
    if start == 1:
        for j in range(n_ang):
            F.append([0, 1 + j, 1 + (j + 1) % n_ang])
    for i in range(nr - 1):
        for j in range(n_ang):
            a = start + i * n_ang + j
            b = start + i * n_ang + (j + 1) % n_ang
            F.append([a, a + n_ang, b + n_ang, b])
    return np.array(V), F, n_ang, nr, start


def granite_colors(V, seed=0):
    n1 = fbm3(V * 120, 2, seed=seed)
    n2 = fbm3(V * 14, 2, seed=seed + 1)
    col = np.tile(hexc('#9a978f'), (len(V), 1)) * (1 + 0.10 * n2)[:, None]
    speck = smoothstep(0.35, 0.6, n1)
    col = mix(col, hexc('#4f4c48'), 0.55 * speck)
    speck2 = smoothstep(-0.45, -0.7, n1)
    col = mix(col, hexc('#d6d3cc'), 0.5 * speck2)
    return np.clip(col, 0, 1)


def build_lantern():
    cx, cy = LANTERN_XY
    phase = math.radians(15)
    # 脚の接地点の雪面高さ
    leg_ang = [math.radians(a) for a in (-90 + 15, 30 + 15, 150 + 15)]
    feet_xy = [np.array([cx + 0.150 * math.cos(a), cy + 0.150 * math.sin(a)]) for a in leg_ang]
    gzs = [float(ground_height(np.array(f[0]), np.array(f[1]))) for f in feet_xy]
    z_foot = min(gzs) - 0.030
    z_ct = z_foot + 0.175          # 中台の下面
    parts = []
    # 脚（3 本、外に反った曲線）
    for a, f in zip(leg_ang, feet_xy):
        dvec = np.array([math.cos(a), math.sin(a)])
        P0 = np.r_[np.array([cx, cy]) + dvec * 0.070, z_ct + 0.005]
        P1 = np.r_[np.array([cx, cy]) + dvec * 0.165, z_ct - 0.030]
        P2 = np.r_[f, z_foot]
        path = np.array([(1 - s) ** 2 * P0 + 2 * (1 - s) * s * P1 + s * s * P2 for s in np.linspace(0, 1, 10)])
        radii = np.linspace(0.024, 0.019, 10)
        radii[-1] = 0.024
        Vl_, Fl_ = tube(path, radii, seg=8, scale_b=0.8)
        parts.append((Vl_, Fl_))
    # 中台（六角の厚板）
    V, F = prism(hexagon(0.118, phase), z_ct, z_ct + 0.038)
    parts.append((V + np.array([cx, cy, 0]), F))
    V, F = prism(hexagon(0.100, phase), z_ct + 0.038, z_ct + 0.048)
    parts.append((V + np.array([cx, cy, 0]), F))
    # 火袋の石枠：角柱 6 本 + 上下の枠
    z_fb0 = z_ct + 0.048
    z_fb1 = z_fb0 + 0.105
    for k in range(6):
        ang = phase + k * math.pi / 3
        c = np.array([cx + 0.077 * math.cos(ang), cy + 0.077 * math.sin(ang)])
        Vb, Fb = box((0, 0, 0), (0.014, 0.014, (z_fb1 - z_fb0) / 2))
        Vb = xform(Vb, rot_z(ang), np.r_[c, (z_fb0 + z_fb1) / 2])
        parts.append((Vb, Fb))
    V, F = prism(hexagon(0.094, phase), z_fb0, z_fb0 + 0.014)
    parts.append((V + np.array([cx, cy, 0]), F))
    V, F = prism(hexagon(0.094, phase), z_fb1 - 0.014, z_fb1)
    parts.append((V + np.array([cx, cy, 0]), F))
    # 笠（六角、反りのある屋根）
    z_r0 = z_fb1
    R_roof = 0.235

    def corner(ph):
        return ((1 + math.cos(6 * (ph - phase))) / 2) ** 3

    def roof_top(rho, ph):
        return z_r0 + 0.020 + 0.080 * (1 - rho) ** 1.7 + 0.024 * rho ** 4 * corner(ph)

    def roof_bot(rho, ph):
        return z_r0 + 0.014 * rho ** 3 * corner(ph)

    Vt, Ft, n_ang, nr, st = polar_hex_grid(R_roof, 8, 5, phase, roof_top)
    Vb, Fb, _, _, _ = polar_hex_grid(R_roof, 8, 5, phase, roof_bot)
    Fb = [f[::-1] for f in Fb]
    nVt = len(Vt)
    Vroof = np.vstack([Vt, Vb])
    Froof = Ft + [[i + nVt for i in f] for f in Fb]
    ot = st + (nr - 1) * n_ang
    for j in range(n_ang):
        j1 = (j + 1) % n_ang
        Froof.append([ot + j1, ot + j, nVt + ot + j, nVt + ot + j1])
    parts.append((Vroof + np.array([cx, cy, 0]), Froof))
    # 蕨手（角の先の小さな巻き）
    for k in range(6):
        ang = phase + k * math.pi / 3
        rr = hex_radius(ang, R_roof, phase)
        c = np.array([cx + rr * 0.985 * math.cos(ang), cy + rr * 0.985 * math.sin(ang), roof_top(1.0, ang) + 0.003])
        Vk, Fk = icosphere(1)
        Vk = Vk * np.array([0.014, 0.014, 0.012]) + c
        parts.append((Vk, Fk))
    # 宝珠
    z_top = roof_top(0.0, 0.0)
    prof = [(0.0, 0.0), (0.040, 0.0), (0.040, 0.012), (0.026, 0.020), (0.020, 0.030), (0.030, 0.042), (0.034, 0.055),
            (0.028, 0.072), (0.014, 0.086), (0.0, 0.098)]
    Vh, Fh = lathe(prof, seg=16)
    parts.append((Vh + np.array([cx, cy, z_top - 0.006]), Fh))
    Vs_, Fs_ = merge_meshes(parts)
    obj = new_object('StoneLantern_Yukimi', Vs_, Fs_, mat=M['granite'], colors=granite_colors(Vs_, 5), smooth=True,
                     sharp_angle=35, group='lantern', merge_dist=1e-6)
    # 火袋の発光（障子紙の内箱）
    V, F = prism(hexagon(0.071, phase + math.pi / 6), z_fb0 + 0.010, z_fb1 - 0.010)
    new_object('StoneLantern_Firebox_Glow', V + np.array([cx, cy, 0]), F, mat=M['glow'], smooth=False, group='lantern')
    # 笠の上の積雪（ふっくらした雪の座布団）
    def snow_top(rho, ph):
        th = 0.030 * max(0.0, 1 - rho ** 6) ** 0.5 + 0.003
        return roof_top(min(rho, 1.0), ph) + th + 0.004 * float(vnoise3(np.array([rho * 4, ph * 2, 1.0]), seed=4))

    def snow_bot(rho, ph):
        return roof_top(min(rho, 1.0), ph) - 0.006

    Vt, Ft, n_ang, nr, st = polar_hex_grid(R_roof * 0.985, 10, 6, phase, snow_top)
    Vb, Fb, _, _, _ = polar_hex_grid(R_roof * 0.985, 10, 6, phase, snow_bot)
    Fb = [f[::-1] for f in Fb]
    nVt = len(Vt)
    Vsn = np.vstack([Vt, Vb])
    Fsn = Ft + [[i + nVt for i in f] for f in Fb]
    ot = st + (nr - 1) * n_ang
    for j in range(n_ang):
        j1 = (j + 1) % n_ang
        Fsn.append([ot + j1, ot + j, nVt + ot + j, nVt + ot + j1])
    # 縁は少し垂れ下がる
    edge = np.zeros(len(Vsn), dtype=bool)
    edge[ot:ot + n_ang] = True
    edge[nVt + ot:nVt + ot + n_ang] = True
    Vsn[edge, 2] -= 0.002
    Vsn = Vsn + np.array([cx, cy, 0])
    new_object('StoneLantern_RoofSnow', Vsn, Fsn, mat=M['snow'], colors=snow_colors(Vsn, 8), smooth=True, group='snow')
    # 宝珠の上の雪と中台の雪
    Vc, Fc = icosphere(2)
    Vc = Vc * np.array([0.022, 0.022, 0.012]) + np.array([cx, cy, z_top - 0.006 + 0.094])
    new_object('StoneLantern_FinialSnow', Vc, Fc, mat=M['snow'], colors=snow_colors(Vc, 9), group='snow')
    Vt, Ft, n_ang, nr, st = polar_hex_grid(0.124, 4, 3, phase, lambda rho, ph: z_ct + 0.038 + 0.010 * max(0, 1 - rho ** 6) ** 0.5 + 0.002, rho0=0.80)
    Vb, Fb, _, _, _ = polar_hex_grid(0.124, 4, 3, phase, lambda rho, ph: z_ct + 0.030, rho0=0.80)
    # 中台の雪：外周の帯（火袋の外側）。内周はつながず箱状に閉じる
    nVt = len(Vt)
    Vm = np.vstack([Vt, Vb])
    Fm = Ft + [[i + nVt for i in f[::-1]] for f in Fb]
    for j in range(n_ang):
        j1 = (j + 1) % n_ang
        o_ = (nr - 1) * n_ang
        Fm.append([o_ + j1, o_ + j, nVt + o_ + j, nVt + o_ + j1])
        Fm.append([j, j1, nVt + j1, nVt + j])
    new_object('StoneLantern_PlatformSnow', Vm + np.array([cx, cy, 0]), Fm, mat=M['snow'], colors=snow_colors(Vm, 10), group='snow')
    metrics['lantern'] = dict(foot_z=round(z_foot, 4), snow_surface_at_feet=[round(g, 4) for g in gzs],
                              feet_embed_mm=[round((g - z_foot) * 1000, 1) for g in gzs],
                              top_z=round(z_top + 0.098, 3), firebox_z=[round(z_fb0, 3), round(z_fb1, 3)])
    LANTERN_INFO['glow_center'] = [cx, cy, (z_fb0 + z_fb1) / 2]
    SNOW_MOUNDS.append((cx, cy, 0.20, 0.0))


LANTERN_INFO = {}


# ----------------------------------------------------------------------------
# 添景：雪うさぎ・南天・湯気
# ----------------------------------------------------------------------------

def build_extras():
    # --- 雪うさぎ
    x, y = 0.50, -0.60
    S_RB = 1.3
    gz = float(ground_height(np.array(x), np.array(y)))
    V, F = icosphere(3)
    V = V * np.array([0.062, 0.042, 0.040]) * S_RB
    V[:, 2] = np.where(V[:, 2] < 0, V[:, 2] * 0.3, V[:, 2])
    V[:, 0] += 0.010 * S_RB * (V[:, 2] / (0.04 * S_RB)) ** 2 * np.sign(V[:, 0])
    yaw = math.radians(-120)
    V = xform(V, rot_z(yaw), (x, y, gz - 0.006))
    new_object('SnowRabbit_Body', V, F, mat=M['snow'], colors=snow_colors(V, 12), group='extras')
    fwd = np.array([math.cos(yaw), math.sin(yaw), 0])
    side = np.array([-fwd[1], fwd[0], 0])
    for sg in (1, -1):
        e = np.array([x, y, gz - 0.006]) + (fwd * 0.040 + side * sg * 0.022 + np.array([0, 0, 0.022])) * S_RB
        Vb, Fb = icosphere(1)
        new_object(f'SnowRabbit_EyeBerry_{0 if sg > 0 else 1}', Vb * 0.0068 * S_RB + e, Fb, mat=M['berry'], group='extras')
        # 耳（ゆずり葉風の葉）
        L, Wd = 0.062 * S_RB, 0.020 * S_RB
        LV, LF = leaf_mesh(L, Wd, 8, 3)
        Rl = rot_z(yaw + math.pi + sg * 0.25) @ rot_y(math.radians(-62))
        base = np.array([x, y, gz - 0.006]) + (fwd * 0.012 + side * sg * 0.013 + np.array([0, 0, 0.030])) * S_RB
        LVw = LV @ Rl.T + base
        new_object(f'SnowRabbit_LeafEar_{0 if sg > 0 else 1}', LVw, LF, mat=M['leaf'],
                   colors=mix(hexc('#1d4a16'), hexc('#3e7d26'), smoothstep(0, 1, LV[:, 0] / L) * 0.5), group='extras')
    # --- 南天（赤い実）
    nx, ny = 0.745, 0.035
    r = rng(5)
    stems, berries, leaves = [], [], []
    for k in range(4):
        bx = nx + r.uniform(-0.04, 0.04)
        by = ny + r.uniform(-0.03, 0.03)
        gz = float(ground_height(np.array(bx), np.array(by)))
        h = r.uniform(0.24, 0.36)
        lean = r.normal(size=2) * 0.03
        path = np.array([[bx + lean[0] * s * s, by + lean[1] * s * s, gz - 0.02 + (h + 0.02) * s] for s in np.linspace(0, 1, 8)])
        Vs, Fs = tube(path, np.linspace(0.0055, 0.0035, 8), seg=6)
        stems.append((Vs, Fs))
        top = path[-1]
        # 葉（放射状の小葉）
        for j in range(7):
            ang = j * 2 * math.pi / 7 + r.uniform(-0.2, 0.2)
            LV, LF = leaf_mesh(0.05, 0.016, 6, 2)
            Rl = rot_z(ang) @ rot_y(math.radians(r.uniform(-35, 5)))
            leaves.append((LV @ Rl.T + top + np.array([0, 0, r.uniform(-0.03, 0.0)]), LF,
                           mix(hexc('#2e4d1a'), hexc('#8a2a1a'), np.full(len(LV), r.uniform(0.1, 0.55)))))
        # 実の房
        if k < 3:
            cc = top + np.array([r.uniform(-0.03, 0.03), r.uniform(-0.03, 0.03), -0.045])
            for m in range(10):
                p = cc + r.normal(size=3) * np.array([0.017, 0.017, 0.013])
                Vb, Fb = uv_sphere(8, 5)
                berries.append((Vb * r.uniform(0.0062, 0.0078) + p, Fb))
    Vs, Fs = merge_meshes(stems)
    new_object('Nandina_Stems', Vs, Fs, mat=M['stem'], group='extras')
    Vb, Fb = merge_meshes(berries)
    new_object('Nandina_Berries', Vb, Fb, mat=M['berry'], group='extras')
    LVs = np.vstack([l[0] for l in leaves])
    LFs = []
    off = 0
    for l in leaves:
        LFs += [[i + off for i in f] for f in l[1]]
        off += len(l[0])
    new_object('Nandina_Leaves', LVs, LFs, mat=M['leaf'], colors=np.vstack([l[2] for l in leaves]), group='extras')
    # --- 湯気（3 枚を 60° ずつ交差させたリボン。頂点アルファで縁と上端が柔らかく消える）
    wisps = [(-0.30, 0.10, 0.30, 0.0), (0.26, 0.16, 0.34, 1.3), (-0.05, 0.26, 0.28, 2.1), (0.30, -0.16, 0.22, 3.4),
             (-0.40, -0.12, 0.24, 4.2), (0.08, 0.02, 0.26, 5.1)]
    SV, SF, SC = [], [], []
    for (wx, wy, wh, ph) in wisps:
        for cross in (0, math.pi / 3, 2 * math.pi / 3):
            nu, nv = 6, 12
            base = len(SV)
            for i in range(nv + 1):
                v = i / nv
                width = 0.035 + 0.13 * math.sin(math.pi * min(1.0, v * 0.85)) ** 0.8
                sway = np.array([0.05 * math.sin(v * 4.2 + ph) + 0.02 * math.sin(v * 9.0 + ph * 2.3),
                                 0.045 * math.cos(v * 3.6 + ph * 1.7) + 0.015 * math.cos(v * 8.0 + ph)]) * v
                ang = cross + ph + v * 1.6
                dvec = np.array([math.cos(ang), math.sin(ang)])
                for j in range(nu + 1):
                    u = j / nu
                    q = np.array([wx, wy]) + sway + dvec * (u - 0.5) * width
                    SV.append([q[0], q[1], Z_W + 0.008 + wh * v])
                    a = 0.085 * math.sin(math.pi * u) ** 2.0 * float(smoothstep(0.0, 0.25, v)) * (1 - float(smoothstep(0.40, 1.0, v)))
                    SC.append([1.0, 1.0, 1.0, a])
            for i in range(nv):
                for j in range(nu):
                    a0 = base + i * (nu + 1) + j
                    SF.append([a0, a0 + 1, a0 + nu + 2, a0 + nu + 1])
    new_object('Onsen_Steam', np.array(SV), SF, mat=M['steam'], colors=np.array(SC), smooth=True, group='steam')



def build_sign():
    """温泉マーク（♨）の立て札：小さな板屋根つき。マークは管状の線で立体的に描く"""
    x, y = -0.775, -0.785
    gz = float(ground_height(np.array(x), np.array(y)))
    parts_wood, parts_mark, parts_snow = [], [], []
    # 柱
    Vp, Fp = box((x, y + 0.012, gz + 0.12), (0.017, 0.017, 0.17))
    parts_wood.append((Vp, Fp))
    # 板（正面 = -Y）
    bw, bh, bt = 0.095, 0.068, 0.009
    bz = gz + 0.235
    Vb, Fb = box((x, y - 0.012, bz), (bw, bt, bh))
    parts_wood.append((Vb, Fb))
    # 小さな切妻屋根
    for sg in (1, -1):
        Vr, Fr = box((0, 0, 0), (bw + 0.022, 0.032, 0.006))
        Rr = rot_x(sg * math.radians(28))
        Vr = xform(Vr, Rr, (x, y - 0.006 + sg * 0.027, bz + bh + 0.026))
        parts_wood.append((Vr, Fr))
    # ♨ マーク（湯船の弧 + 3 本の湯気）
    fz = y - 0.012 - bt - 0.0012
    cz = bz - 0.018
    arc = [np.array([x + 0.040 * math.cos(a), fz, cz + 0.022 * math.sin(a)]) for a in np.linspace(math.radians(195), math.radians(345), 14)]
    Va, Fa = tube(np.array(arc), 0.0042, seg=6)
    parts_mark.append((Va, Fa))
    for k, dx in enumerate((-0.024, 0.0, 0.024)):
        pts = [np.array([x + dx + 0.0065 * math.sin(t * 2 * math.pi * 1.1 + k), fz, cz - 0.004 + 0.012 + 0.058 * t]) for t in np.linspace(0, 1, 12)]
        Vw, Fw = tube(np.array(pts), np.linspace(0.0040, 0.0028, 12), seg=6)
        parts_mark.append((Vw, Fw))
    Vw_, Fw_ = merge_meshes(parts_wood)
    colw = np.tile(hexc('#a07a4c'), (len(Vw_), 1)) * (1 + 0.10 * fbm3(Vw_ * np.array([30, 30, 160]), 2, seed=61))[:, None]
    new_object('OnsenSign_Wood', Vw_, Fw_, mat=M['post'], colors=np.clip(colw, 0, 1), smooth=False, group='extras')
    Vm, Fm = merge_meshes(parts_mark)
    new_object('OnsenSign_Mark', Vm, Fm, mat=M['mark'], group='extras')
    # 屋根の雪
    Vs, Fs = icosphere(2)
    Vs = Vs * np.array([bw + 0.018, 0.034, 0.014])
    Vs[:, 2] = np.maximum(Vs[:, 2], -0.004)
    Vs = Vs + np.array([x, y - 0.006, bz + bh + 0.046])
    new_object('OnsenSign_RoofSnow', Vs, Fs, mat=M['snow'], colors=snow_colors(Vs, 62), group='snow')
    SNOW_MOUNDS.append((x, y, 0.06, 0.012))
    metrics['sign'] = dict(post_embed_mm=round((gz - (gz + 0.12 - 0.17)) * 1000, 1))

def leaf_mesh(L, Wd, nu=10, nv=4):
    LV = []
    for i in range(nu + 1):
        s = i / nu
        half = Wd / 2 * math.sin(math.pi * s ** 0.8) ** 0.9
        for j in range(nv + 1):
            t = j / nv * 2 - 1
            LV.append([s * L, t * half, 0.003 * abs(t) + 0.006 * s * s])
    LV = np.array(LV)
    LF = []
    for i in range(nu):
        for j in range(nv):
            a = i * (nv + 1) + j
            LF.append([a, a + nv + 1, a + nv + 2, a + 1])
    return LV, LF



# ----------------------------------------------------------------------------
# 環境遮蔽（AO）を頂点カラーに焼き込む
#   影を描かないビューア（共通スタジオ等）でも、岩の根元や竹垣の足元の接地感が出るように
# ----------------------------------------------------------------------------
AO_SKIP_OCCLUDER = ('Onsen_WaterSurface', 'Water_', 'Spout_Ripple', 'Spout_Foam', 'Spout_HotWaterStream',
                    'Onsen_Steam', 'Wooden_Bucket_Water')
AO_TARGET_GROUPS = ('base', 'rocks', 'snow', 'fence', 'lantern', 'bucket', 'extras')


def _hemisphere_dirs(k, seed=0):
    r = rng(seed)
    u1 = r.random(k)
    u2 = r.random(k)
    rr = np.sqrt(u1)
    th = 2 * math.pi * u2
    return np.stack([rr * np.cos(th), rr * np.sin(th), np.sqrt(1 - u1)], axis=1)   # 余弦分布


def bake_ao(n_rays=14, max_d=0.22):
    occ_parts = []
    for name, info in lib.REGISTRY.items():
        if any(name.startswith(sk) for sk in AO_SKIP_OCCLUDER):
            continue
        o = info['obj']
        V, T = lib.mesh_arrays(o)
        occ_parts.append((V, T))
    Vall, Fall = merge_meshes(occ_parts)
    bvh = lib.bvh_from_arrays(Vall, Fall)
    H = _hemisphere_dirs(n_rays, 11)
    stats = {}
    for name, info in lib.REGISTRY.items():
        if info['group'] not in AO_TARGET_GROUPS or name.startswith('Base_SoilCrossSection') or name.startswith('Base_WalnutBoard'):
            continue
        o = info['obj']
        me = o.data
        if 'Col' not in me.color_attributes:
            continue
        nV = len(me.vertices)
        co = np.zeros(nV * 3)
        me.vertices.foreach_get('co', co)
        co = co.reshape(-1, 3)
        nr = np.zeros(nV * 3)
        me.vertices.foreach_get('normal', nr)
        nr = nr.reshape(-1, 3)
        attr = me.color_attributes['Col']
        if attr.domain != 'POINT' or len(attr.data) != nV:
            continue
        col = np.zeros(nV * 4, dtype=np.float32)
        attr.data.foreach_get('color', col)
        col = col.reshape(-1, 4)
        occ = np.zeros(nV)
        for i in range(nV):
            n = nr[i]
            a = np.array([0, 0, 1.0]) if abs(n[2]) < 0.95 else np.array([1.0, 0, 0])
            t1 = np.cross(n, a)
            t1 /= np.linalg.norm(t1) + 1e-12
            t2 = np.cross(n, t1)
            org = Vector(co[i] + n * 0.0025)
            acc = 0.0
            for d in H:
                w = d[0] * t1 + d[1] * t2 + d[2] * n
                hit = bvh.ray_cast(org, Vector(w), max_d)
                if hit[0] is not None:
                    acc += 1.0 - hit[3] / max_d
            occ[i] = acc / n_rays
        is_snow = name.endswith('_Snow') or info['group'] == 'snow' or name.startswith('Ground_') or name.startswith('SnowRabbit_Body')
        tint = np.array([0.62, 0.56, 0.42]) if is_snow else np.array([0.62, 0.62, 0.62])
        f = 1.0 - np.clip(occ, 0, 1)[:, None] * tint[None, :]
        col[:, :3] = col[:, :3] * f
        attr.data.foreach_set('color', col.ravel())
        stats[info['group']] = round(float(np.mean(occ)), 3)
    metrics['ao_mean_occlusion_by_group'] = stats

# ----------------------------------------------------------------------------
# 書き出しと検証
# ----------------------------------------------------------------------------

PER_OBJ = {}


def scene_stats():
    tri = 0
    lo = np.array([1e9] * 3)
    hi = -lo
    per_group = {}
    for name, info in lib.REGISTRY.items():
        o = info['obj']
        if o.name not in bpy.data.objects:
            continue
        V, T = lib.mesh_arrays(o)
        tri += len(T)
        per_group[info['group']] = per_group.get(info['group'], 0) + len(T)
        PER_OBJ[name] = len(T)
        lo = np.minimum(lo, V.min(axis=0))
        hi = np.maximum(hi, V.max(axis=0))
    return tri, lo, hi, per_group


def export(path):
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', export_yup=True, export_apply=True, export_materials='EXPORT',
        export_vertex_color='MATERIAL', export_all_vertex_colors=False, export_lights=False, export_cameras=False,
        export_extras=False, export_animations=False, export_texcoords=False, export_normals=True,
        export_copyright='Procedural — generated by build_scene.py (Blender headless)')


def main():
    lib.clear_scene()
    build_materials()
    prepare_capybara()
    build_rocks()        # 岩を先に置く（吹き溜まりを地形に反映するため）
    build_base()
    build_capybara()
    build_yuzu()
    build_water()
    build_spout()
    build_bucket()
    build_towel()
    build_fence()
    build_lantern()
    build_extras()
    build_sign()
    bake_ao()
    log('AO baked')
    tri, lo, hi, per_group = scene_stats()
    # Blender(Z-up) → glTF(Y-up) の外接箱
    gl_lo = [lo[0], lo[2], -hi[1]]
    gl_hi = [hi[0], hi[2], -lo[1]]
    metrics['triangles_total'] = int(tri)
    metrics['triangles_by_group'] = per_group
    metrics['bbox_gltf_yup'] = dict(min=[round(v, 4) for v in gl_lo], max=[round(v, 4) for v in gl_hi],
                                    size=[round(gl_hi[i] - gl_lo[i], 4) for i in range(3)])
    metrics['objects'] = len(lib.REGISTRY)
    metrics['top_objects_by_tris'] = dict(sorted(PER_OBJ.items(), key=lambda kv: -kv[1])[:12])
    metrics['lantern_glow_center_gltf'] = [LANTERN_INFO['glow_center'][0], LANTERN_INFO['glow_center'][2], -LANTERN_INFO['glow_center'][1]]
    out_glb = os.path.join(OUT, 'scene.glb')
    export(out_glb)
    metrics['file_size_bytes'] = os.path.getsize(out_glb)
    with open(os.path.join(OUT, 'metrics.json'), 'w') as f:
        json.dump(metrics, f, ensure_ascii=False, indent=2)
    log('triangles', tri, 'bbox', metrics['bbox_gltf_yup'])
    log(json.dumps(metrics, ensure_ascii=False))
    if '--blend' in sys.argv:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join('/tmp/capy-work', 'scene_debug.blend'))


main()
