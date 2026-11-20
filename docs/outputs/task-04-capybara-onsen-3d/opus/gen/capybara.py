"""
capybara.py — 入浴中のカピバラ（SDF スムーズ合成 → Surface Nets → 投影）

ローカル座標: +X が鼻先方向、+Y が左、+Z が上、湯船の床が z=0。
四角い大きな頭・高い位置の目・頭頂後方の小さな丸耳・鼻先上面のスリット状の鼻孔、
という「カピバラらしさ」の要点を SDF の部品で作る。目は半分閉じた“いい湯だな”顔。
"""
import math
import numpy as np
from lib import (sd_sphere, sd_ellipsoid, sd_capsule, sd_round_box, smin, smax, ssub,
                 eval_sdf_grid, surface_nets, project_to_surface, quads_to_tris,
                 rot_z, fbm3, hexc, smoothstep, mix)

# 頭のフレーム
HEAD_ORIGIN = np.array([0.165, 0.0, 0.392])
HEAD_PITCH = math.radians(5.0)           # 鼻先をわずかに下げる
_u = np.array([math.cos(HEAD_PITCH), 0.0, -math.sin(HEAD_PITCH)])
_v = np.array([0.0, 1.0, 0.0])
_w = np.array([math.sin(HEAD_PITCH), 0.0, math.cos(HEAD_PITCH)])
HEAD_R = np.stack([_u, _v, _w], axis=1)  # 列 = 頭ローカル軸

# 目（頭フレーム, 左側 v>0 を定義しミラー）
EYE_UW = (0.090, 0.034)
EYE_R = 0.0150


def frame_from(y_axis, z_axis):
    z = np.asarray(z_axis, dtype=np.float64)
    z = z / np.linalg.norm(z)
    y = np.asarray(y_axis, dtype=np.float64)
    y = y - np.dot(y, z) * z
    y = y / np.linalg.norm(y)
    x = np.cross(y, z)
    return np.stack([x, y, z], axis=1)


_al, _be = math.radians(38), math.radians(22)
EAR_R = frame_from([math.sin(_al), math.cos(_al), 0.0], [0.0, math.sin(_be), math.cos(_be)])
EAR_C = np.array([-0.004, 0.047, 0.071])

# 鼻孔：鼻づら上面の前角に、外側後方へ斜めに走るスリット
_n = np.array([0.72, 0.0, 0.69])                 # 角の面法線（頭フレーム u,w）
_t = np.array([-0.69, 0.0, 0.72])                # 面に沿って上後方
_L = 0.62 * np.array([0, 1.0, 0]) + 0.78 * _t
NOSTRIL_R = frame_from(_L, _n)                   # ローカル y=スリットの長軸, z=深さ
NOSTRIL_C = np.array([0.2385, 0.019, 0.049])

_eye_cache = {}


def to_head(P):
    return (P - HEAD_ORIGIN) @ HEAD_R


def from_head(Q):
    return Q @ HEAD_R.T + HEAD_ORIGIN


def head_sdf(Ph, with_eyes_carve=True):
    Phm = Ph.copy()
    Phm[:, 1] = np.abs(Phm[:, 1])
    d = sd_ellipsoid(Ph, (0.060, 0, 0.004), (0.092, 0.066, 0.078))                       # 頭蓋
    d = smin(d, sd_round_box(Ph, (0.176, 0, -0.006), (0.074, 0.050, 0.067), 0.040), 0.05)  # 四角く深い鼻づら
    d = smin(d, sd_ellipsoid(Ph, (0.130, 0, 0.038), (0.115, 0.045, 0.036)), 0.04)        # 平らな鼻筋
    d = smin(d, sd_ellipsoid(Phm, (0.072, 0.033, -0.030), (0.082, 0.046, 0.062)), 0.04)  # 頬（咬筋）
    d = smin(d, sd_round_box(Ph, (0.130, 0, -0.058), (0.090, 0.040, 0.026), 0.020), 0.03)  # 下あご
    # 鼻孔（スリット）
    d = ssub(d, sd_ellipsoid(Phm, NOSTRIL_C, (0.0034, 0.0115, 0.0065), R=NOSTRIL_R), 0.0035)
    # 口（人中の切れ込み＋口角）
    d = ssub(d, sd_capsule(Phm, (0.2505, 0.0, -0.010), (0.2495, 0.0, -0.040), 0.0036), 0.004)
    # まぶた（目玉の上 4 割を覆う殻）。目玉自体は別メッシュ
    if 'c' in _eye_cache:
        ec = _eye_cache['c']                 # 頭フレームでの左目中心
        lid = sd_sphere(Phm, ec, EYE_R + 0.0024)
        # 前後でやや下がる“眠そうな”まぶたライン
        cut = (Phm[:, 2] - (ec[2] + 0.18 * EYE_R)) + 0.25 * (Phm[:, 0] - ec[0]) ** 2 / EYE_R
        lid = smax(lid, -cut, 0.002)
        d = smin(d, lid, 0.004)
        # 下まぶたの小さなふくらみ
        low = smax(sd_sphere(Phm, ec, EYE_R + 0.0016), (Phm[:, 2] - (ec[2] - 0.72 * EYE_R)), 0.002)
        d = smin(d, low, 0.003)
    return d


def ear_sdf(Ph):
    Phm = Ph.copy()
    Phm[:, 1] = np.abs(Phm[:, 1])
    q = (Phm - EAR_C) @ EAR_R
    de = sd_ellipsoid(q, (0, 0, 0), (0.025, 0.0135, 0.029))
    de = ssub(de, sd_ellipsoid(q, (0.001, 0.0105, 0.004), (0.0150, 0.0058, 0.0175)), 0.004)
    return de


def body_sdf(P):
    Pm = P.copy()
    Pm[:, 1] = np.abs(Pm[:, 1])
    d = sd_capsule(P, (-0.190, 0, 0.130), (0.065, 0, 0.135), 0.130, 0.124, scale=(1, 1.13, 1))  # 樽型の胴
    d = smin(d, sd_ellipsoid(P, (-0.050, 0, 0.100), (0.215, 0.160, 0.100)), 0.06)              # 腹
    d = smin(d, sd_ellipsoid(P, (0.040, 0, 0.180), (0.105, 0.115, 0.085)), 0.05)              # 肩
    d = smin(d, sd_capsule(P, (0.060, 0, 0.175), (0.165, 0, 0.322), 0.108, 0.088, scale=(1, 0.96, 1)), 0.05)  # 首
    # 前脚（胸の下にたたんで、前足先だけ少し出す）
    d = smin(d, sd_capsule(Pm, (0.070, 0.070, 0.090), (0.140, 0.068, 0.026), 0.040, 0.028), 0.03)
    d = smin(d, sd_ellipsoid(Pm, (0.160, 0.068, 0.017), (0.040, 0.029, 0.018)), 0.02)
    # 後ろ脚（ももの張りと、たたんだ足先）
    d = smin(d, sd_ellipsoid(Pm, (-0.150, 0.098, 0.095), (0.105, 0.064, 0.085)), 0.04)
    d = smin(d, sd_ellipsoid(Pm, (-0.050, 0.118, 0.018), (0.072, 0.030, 0.018)), 0.02)
    # 床に接する腹を少し平らに（接地面を作る）
    d = smax(d, -(P[:, 2] + 0.002), 0.012)
    return d


def capy_sdf(P):
    Ph = to_head(P)
    d = smin(body_sdf(P), head_sdf(Ph), 0.05)
    d = smin(d, ear_sdf(Ph), 0.010)
    return d


def head_only_sdf(P):
    return head_sdf(to_head(P))


def _ray_surface(fn, p0, dirn, t_max=0.2, steps=400):
    """p0 から dirn 方向に進んで最初に fn<0 になる点（二分法で精密化）"""
    dirn = dirn / np.linalg.norm(dirn)
    ts = np.linspace(0, t_max, steps)
    P = p0[None, :] + ts[:, None] * dirn[None, :]
    d = fn(P)
    idx = np.argmax(d < 0)
    if d[idx] >= 0:
        return None
    a, b = ts[max(idx - 1, 0)], ts[idx]
    for _ in range(40):
        m = 0.5 * (a + b)
        if fn((p0 + m * dirn)[None, :])[0] < 0:
            b = m
        else:
            a = m
    return p0 + 0.5 * (a + b) * dirn


def compute_eye_center():
    """頭フレームで、頭の側面の表面から目玉を 4 割埋め込む位置を求める"""
    u, w = EYE_UW
    _eye_cache.clear()
    fn = lambda Q: head_sdf(Q)
    p0 = np.array([u, 0.2, w])
    hit = _ray_surface(fn, p0, np.array([0.0, -1.0, 0.0]), t_max=0.2)
    # 表面法線
    eps = 1e-4
    g = np.array([(fn((hit + e)[None])[0] - fn((hit - e)[None])[0]) / (2 * eps)
                  for e in np.eye(3) * eps])
    n = g / np.linalg.norm(g)
    c = hit - n * (0.42 * EYE_R)
    _eye_cache['c'] = c
    return c, n


def build(h=0.0034):
    eye_c_head, eye_n_head = compute_eye_center()
    lo = np.array([-0.36, -0.19, -0.03])
    hi = np.array([0.45, 0.19, 0.47])
    F, origin = eval_sdf_grid(capy_sdf, lo, hi, h)
    V, Q = surface_nets(F, origin, h)
    V = project_to_surface(capy_sdf, V, iters=2)
    T = quads_to_tris(V, Q)
    eyes = []
    for sgn in (1, -1):
        c = eye_c_head.copy()
        c[1] *= sgn
        eyes.append(from_head(c[None])[0])
    return V, T, eyes


def landmarks():
    """柚子を乗せる頭頂点・耳先・肩の高さなどをローカル座標で返す"""
    out = {}
    # 頭頂部（正中線上で一番高い点）を探索：耳より前の範囲
    best = None
    for uu in np.linspace(0.02, 0.16, 57):
        p_head = np.array([uu, 0.0, 0.3])
        p = from_head(p_head[None])[0]
        hit = _ray_surface(capy_sdf, np.array([p[0], 0.0, 0.8]), np.array([0, 0, -1.0]), t_max=0.6, steps=1200)
        if hit is not None and (best is None or hit[2] > best[2]):
            best = hit
    out['crown'] = best
    # 背中の最高点（首より後ろ）
    best = None
    for xx in np.linspace(-0.26, -0.03, 47):
        hit = _ray_surface(body_sdf, np.array([xx, 0.0, 0.8]), np.array([0, 0, -1.0]), t_max=0.8, steps=1600)
        if hit is not None and (best is None or hit[2] > best[2]):
            best = hit
    out['back_top'] = best
    return out


def colors(V_local, wl_local):
    """毛色（頂点カラー, linear）。wl_local は水面のローカル高さ"""
    P = V_local
    Ph = to_head(P)
    Phm = Ph.copy()
    Phm[:, 1] = np.abs(Phm[:, 1])
    base = hexc('#8f6040')
    dark = hexc('#6a4329')
    light = hexc('#b48a5f')
    muzzle = hexc('#5a3b27')
    nose = hexc('#2a1c14')
    inner_ear = hexc('#3b2820')
    n1 = fbm3(P * 38.0, octaves=3, seed=7)
    n2 = fbm3(P * 9.0, octaves=2, seed=11)
    col = np.tile(base, (len(P), 1))
    # 背中は濃く、腹は明るい
    up = smoothstep(0.18, 0.30, P[:, 2]) * smoothstep(0.30, 0.05, np.abs(P[:, 1]) / 1.0)
    col = mix(col, dark, 0.45 * up)
    belly = smoothstep(0.10, 0.02, P[:, 2])
    col = mix(col, light, 0.35 * belly)
    # 顔：鼻づらの先端と上面をこげ茶に
    front = smoothstep(0.16, 0.25, Ph[:, 0])
    col = mix(col, muzzle, 0.65 * front)
    # 鼻孔まわり
    dn = np.sqrt(((Phm[:, 0] - NOSTRIL_C[0]) / 0.026) ** 2 + ((Phm[:, 1] - 0.012) / 0.03) ** 2 + ((Phm[:, 2] - NOSTRIL_C[2]) / 0.024) ** 2)
    col = mix(col, nose, 0.85 * smoothstep(1.0, 0.45, dn))
    # 口元
    dm = np.sqrt(((Phm[:, 0] - 0.247) / 0.02) ** 2 + ((Phm[:, 2] + 0.04) / 0.02) ** 2) * (1 + 0 * Phm[:, 1])
    col = mix(col, nose, 0.55 * smoothstep(1.0, 0.3, dm) * smoothstep(0.045, 0.0, Phm[:, 1]))
    # 耳の内側
    q = (Phm - EAR_C) @ EAR_R
    ear_in = smoothstep(0.009, 0.002, np.abs(q[:, 1] - 0.004)) * smoothstep(0.03, 0.01, np.sqrt(q[:, 0] ** 2 + q[:, 2] ** 2))
    ear_in *= (q[:, 1] > 0)
    col = mix(col, inner_ear, 0.8 * ear_in)
    # 目のまわり（細いアイライン）
    if 'c' in _eye_cache:
        ec = _eye_cache['c']
        de = np.linalg.norm(Phm - ec, axis=1)
        col = mix(col, nose, 0.75 * smoothstep(EYE_R + 0.007, EYE_R + 0.0015, de))
    # 毛のむら
    col = col * (1.0 + 0.10 * n1[:, None] + 0.08 * n2[:, None])
    # 濡れ：水面下は濃く、水際も少し濃く
    wet = smoothstep(wl_local + 0.018, wl_local - 0.004, P[:, 2])
    col = col * (1.0 - 0.30 * wet[:, None])
    return np.clip(col, 0, 1)
