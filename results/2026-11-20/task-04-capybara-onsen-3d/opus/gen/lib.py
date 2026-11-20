"""
lib.py — 箱庭「カピバラの雪見露天風呂」生成用の共通ユーティリティ

すべて手続き的（プロシージャル）に形状を作るための道具箱。
外部アセット・外部テクスチャは一切使わない。

- 色: sRGB → linear 変換
- ノイズ: numpy で書いたハッシュ型 value noise / fBm
- SDF: 球・楕円体・カプセル・角丸箱・スムーズ合成（有機形状＝カピバラ用）
- Surface Nets: SDF グリッドから四角形メッシュを抽出（numpy ベクトル化）
- 形状: icosphere / lathe（回転体）/ tube（パス押し出し）/ 角柱 など
- Blender: マテリアル（glTF 互換の Principled BSDF のみ）、メッシュオブジェクト生成
座標系は Blender 内部の Z-up（-Y が正面）。glTF 書き出し時に Y-up / +Z 正面へ変換される。
"""
import math
import numpy as np

try:
    import bpy
    import bmesh
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree
except ImportError:  # SDF/ノイズ部分だけを単体テストする場合
    bpy = None

# ----------------------------------------------------------------------------
# 色
# ----------------------------------------------------------------------------

def srgb_to_lin(c):
    c = np.asarray(c, dtype=np.float64)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def hexc(h):
    """'#rrggbb' -> linear RGB (np.array 3)"""
    h = h.lstrip('#')
    return srgb_to_lin([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)])


def mix(a, b, t):
    t = np.asarray(t, dtype=np.float64)
    if t.ndim == 1:
        t = t[:, None]
    return np.asarray(a) * (1 - t) + np.asarray(b) * t


def smoothstep(e0, e1, x):
    t = np.clip((np.asarray(x, dtype=np.float64) - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


# ----------------------------------------------------------------------------
# ノイズ（ハッシュ value noise）
# ----------------------------------------------------------------------------

def _hash3(ix, iy, iz, seed):
    h = (ix * 374761393 + iy * 668265263 + iz * 1274126177 + seed * 1442695041) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    h = h ^ (h >> 16)
    return (h & 0xFFFFFF) / float(0xFFFFFF)


def vnoise3(p, seed=0):
    """3D value noise, 出力 [-1, 1]"""
    p = np.asarray(p, dtype=np.float64)
    pi = np.floor(p).astype(np.int64)
    pf = p - pi
    w = pf * pf * (3.0 - 2.0 * pf)
    res = np.zeros(p.shape[:-1])
    for dx in (0, 1):
        wx = w[..., 0] if dx else 1.0 - w[..., 0]
        for dy in (0, 1):
            wy = w[..., 1] if dy else 1.0 - w[..., 1]
            for dz in (0, 1):
                wz = w[..., 2] if dz else 1.0 - w[..., 2]
                h = _hash3(pi[..., 0] + dx, pi[..., 1] + dy, pi[..., 2] + dz, seed)
                res += h * wx * wy * wz
    return res * 2.0 - 1.0


def fbm3(p, octaves=4, lac=2.03, gain=0.5, seed=0):
    p = np.asarray(p, dtype=np.float64)
    amp, tot, norm = 1.0, 0.0, 0.0
    for o in range(octaves):
        tot = tot + amp * vnoise3(p, seed + o * 31)
        norm += amp
        amp *= gain
        p = p * lac
    return tot / norm


def rng(seed):
    return np.random.default_rng(seed)


# ----------------------------------------------------------------------------
# 回転
# ----------------------------------------------------------------------------

def rot_x(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]], dtype=np.float64)


def rot_y(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]], dtype=np.float64)


def rot_z(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]], dtype=np.float64)


def xform(V, R=None, t=None, s=None):
    """V(N,3) を スケール→回転→平行移動。R は列ベクトル規約の 3x3。"""
    V = np.asarray(V, dtype=np.float64)
    if s is not None:
        V = V * np.asarray(s, dtype=np.float64)
    if R is not None:
        V = V @ np.asarray(R).T
    if t is not None:
        V = V + np.asarray(t, dtype=np.float64)
    return V


# ----------------------------------------------------------------------------
# SDF（有機形状用）
# ----------------------------------------------------------------------------

def _len(v):
    return np.sqrt(np.sum(v * v, axis=-1))


def smin(a, b, k):
    if k <= 0:
        return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b * (1 - h) + a * h - k * h * (1 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def ssub(a, b, k):
    """a から b を滑らかに引く"""
    return smax(a, -b, k)


def _local(p, c, R):
    q = p - np.asarray(c, dtype=np.float64)
    if R is not None:
        q = q @ np.asarray(R)  # R の列 = ローカル軸（親座標）→ ローカル座標
    return q


def sd_sphere(p, c, r):
    return _len(p - np.asarray(c, dtype=np.float64)) - r


def sd_ellipsoid(p, c, r, R=None):
    q = _local(p, c, R)
    r = np.asarray(r, dtype=np.float64)
    k0 = _len(q / r)
    k1 = _len(q / (r * r))
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)


def sd_capsule(p, a, b, ra, rb=None, scale=None):
    """テーパー付きカプセル。scale=(sx,sy,sz) で断面を楕円化（近似）"""
    if rb is None:
        rb = ra
    a = np.asarray(a, dtype=np.float64)
    b = np.asarray(b, dtype=np.float64)
    if scale is not None:
        sc = np.asarray(scale, dtype=np.float64)
        p = p / sc
        a = a / sc
        b = b / sc
        m = sc.min()
    else:
        m = 1.0
    pa = p - a
    ba = b - a
    h = np.clip((pa @ ba) / (ba @ ba), 0.0, 1.0)
    d = _len(pa - h[:, None] * ba) - (ra + (rb - ra) * h)
    return d * m


def sd_round_box(p, c, half, rad, R=None):
    q = _local(p, c, R)
    d = np.abs(q) - (np.asarray(half, dtype=np.float64) - rad)
    return _len(np.maximum(d, 0.0)) + np.minimum(np.max(d, axis=-1), 0.0) - rad


def eval_sdf_grid(fn, lo, hi, h, chunk=400_000):
    lo = np.asarray(lo, dtype=np.float64)
    hi = np.asarray(hi, dtype=np.float64)
    n = np.ceil((hi - lo) / h).astype(int) + 1
    xs = lo[0] + np.arange(n[0]) * h
    ys = lo[1] + np.arange(n[1]) * h
    zs = lo[2] + np.arange(n[2]) * h
    X, Y, Z = np.meshgrid(xs, ys, zs, indexing='ij')
    P = np.stack([X.ravel(), Y.ravel(), Z.ravel()], axis=1)
    out = np.empty(len(P))
    for i in range(0, len(P), chunk):
        out[i:i + chunk] = fn(P[i:i + chunk])
    return out.reshape(n), lo


def surface_nets(F, origin, h):
    """naive surface nets。内側 F<0。外向き法線の四角形を返す。"""
    nx, ny, nz = F.shape
    inside = F < 0
    corners = [(i, j, k) for i in (0, 1) for j in (0, 1) for k in (0, 1)]
    cvals = [F[i:nx - 1 + i, j:ny - 1 + j, k:nz - 1 + k] for (i, j, k) in corners]
    any_in = np.zeros(cvals[0].shape, dtype=bool)
    all_in = np.ones(cvals[0].shape, dtype=bool)
    for cv in cvals:
        any_in |= cv < 0
        all_in &= cv < 0
    active = any_in & ~all_in
    idx = np.argwhere(active)
    vals = np.stack([cv[active] for cv in cvals], axis=1)
    coff = np.array(corners, dtype=np.float64)
    edges = [(0, 1), (2, 3), (4, 5), (6, 7), (0, 2), (1, 3), (4, 6), (5, 7), (0, 4), (1, 5), (2, 6), (3, 7)]
    acc = np.zeros((len(idx), 3))
    cnt = np.zeros(len(idx))
    for a, b in edges:
        fa, fb = vals[:, a], vals[:, b]
        m = (fa < 0) != (fb < 0)
        den = np.where(m, fa - fb, 1.0)
        t = np.where(m, fa / den, 0.0)
        pt = coff[a] + t[:, None] * (coff[b] - coff[a])
        acc[m] += pt[m]
        cnt[m] += 1
    verts = np.asarray(origin) + (idx + acc / cnt[:, None]) * h
    vid = -np.ones(active.shape, dtype=np.int64)
    vid[active] = np.arange(len(idx))
    quads = []
    # x 方向の辺
    s0 = inside[:-1, 1:-1, 1:-1]
    s1 = inside[1:, 1:-1, 1:-1]
    m = s0 != s1
    I, J, K = np.nonzero(m)
    J = J + 1
    K = K + 1
    q = np.stack([vid[I, J - 1, K - 1], vid[I, J, K - 1], vid[I, J, K], vid[I, J - 1, K]], axis=1)
    fl = ~s0[m]
    q[fl] = q[fl][:, ::-1]
    quads.append(q)
    # y 方向の辺
    s0 = inside[1:-1, :-1, 1:-1]
    s1 = inside[1:-1, 1:, 1:-1]
    m = s0 != s1
    I, J, K = np.nonzero(m)
    I = I + 1
    K = K + 1
    q = np.stack([vid[I - 1, J, K - 1], vid[I - 1, J, K], vid[I, J, K], vid[I, J, K - 1]], axis=1)
    fl = ~s0[m]
    q[fl] = q[fl][:, ::-1]
    quads.append(q)
    # z 方向の辺
    s0 = inside[1:-1, 1:-1, :-1]
    s1 = inside[1:-1, 1:-1, 1:]
    m = s0 != s1
    I, J, K = np.nonzero(m)
    I = I + 1
    J = J + 1
    q = np.stack([vid[I - 1, J - 1, K], vid[I, J - 1, K], vid[I, J, K], vid[I - 1, J, K]], axis=1)
    fl = ~s0[m]
    q[fl] = q[fl][:, ::-1]
    quads.append(q)
    return verts, np.concatenate(quads, axis=0)


def sdf_gradient(fn, P, eps=5e-4):
    g = np.zeros_like(P)
    for i in range(3):
        d = np.zeros(3)
        d[i] = eps
        g[:, i] = (fn(P + d) - fn(P - d)) / (2 * eps)
    return g


def project_to_surface(fn, P, iters=3):
    P = P.copy()
    for _ in range(iters):
        d = fn(P)
        g = sdf_gradient(fn, P)
        gl2 = np.maximum(np.sum(g * g, axis=1), 1e-12)
        P -= (d / gl2)[:, None] * g
    return P


def quads_to_tris(V, Q):
    """短い対角線で分割"""
    d02 = np.sum((V[Q[:, 0]] - V[Q[:, 2]]) ** 2, axis=1)
    d13 = np.sum((V[Q[:, 1]] - V[Q[:, 3]]) ** 2, axis=1)
    use02 = d02 <= d13
    t1 = np.where(use02[:, None], Q[:, [0, 1, 2]], Q[:, [0, 1, 3]])
    t2 = np.where(use02[:, None], Q[:, [0, 2, 3]], Q[:, [1, 2, 3]])
    return np.concatenate([t1, t2], axis=0)


# ----------------------------------------------------------------------------
# メッシュ形状（numpy の V(N,3), F(M,3 or 4) を返す）
# ----------------------------------------------------------------------------

def vertex_normals(V, F):
    F = np.asarray(F)
    if F.shape[1] == 4:
        F = quads_to_tris(V, F)
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    N = np.zeros_like(V)
    for k in range(3):
        np.add.at(N, F[:, k], fn)
    l = np.linalg.norm(N, axis=1, keepdims=True)
    return N / np.maximum(l, 1e-12)


def icosphere(subdiv=2):
    """単位 icosphere（numpy 実装）"""
    t = (1.0 + 5 ** 0.5) / 2.0
    V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
         [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]
    F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6],
         [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10],
         [8, 6, 7], [9, 8, 1]]
    V = [np.array(v, dtype=np.float64) / np.linalg.norm(v) for v in V]
    for _ in range(subdiv):
        cache = {}
        newF = []

        def mid(a, b):
            key = (min(a, b), max(a, b))
            if key not in cache:
                m = V[a] + V[b]
                V.append(m / np.linalg.norm(m))
                cache[key] = len(V) - 1
            return cache[key]

        for a, b, c in F:
            ab, bc, ca = mid(a, b), mid(b, c), mid(c, a)
            newF += [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]
        F = newF
    return np.array(V), np.array(F, dtype=np.int64)


def uv_sphere(seg=16, rings=10):
    V = [[0, 0, -1]]
    for i in range(1, rings):
        th = math.pi * i / rings - math.pi / 2
        for j in range(seg):
            ph = 2 * math.pi * j / seg
            V.append([math.cos(th) * math.cos(ph), math.cos(th) * math.sin(ph), math.sin(th)])
    V.append([0, 0, 1])
    F = []
    top = len(V) - 1
    for j in range(seg):
        F.append([0, 1 + (j + 1) % seg, 1 + j])
    for i in range(rings - 2):
        for j in range(seg):
            a = 1 + i * seg + j
            b = 1 + i * seg + (j + 1) % seg
            c = 1 + (i + 1) * seg + (j + 1) % seg
            d = 1 + (i + 1) * seg + j
            F.append([a, b, c, d])
    base = 1 + (rings - 2) * seg
    for j in range(seg):
        F.append([base + j, base + (j + 1) % seg, top])
    return np.array(V, dtype=np.float64), F


def lathe(profile, seg=24, phase=0.0):
    """回転体。profile=[(r,z),...] を (r,z) 平面で反時計回り（外側を上へ）に与えると外向き法線。
    r=0 の点は 1 頂点に縮退させる。"""
    V = []
    ring_idx = []
    for (r, z) in profile:
        if r <= 1e-9:
            ring_idx.append([len(V)] * seg)
            V.append([0.0, 0.0, z])
        else:
            ids = []
            for j in range(seg):
                a = phase + 2 * math.pi * j / seg
                ids.append(len(V))
                V.append([r * math.cos(a), r * math.sin(a), z])
            ring_idx.append(ids)
    F = []
    for k in range(len(profile) - 1):
        A, B = ring_idx[k], ring_idx[k + 1]
        for j in range(seg):
            j1 = (j + 1) % seg
            f = [A[j], A[j1], B[j1], B[j]]
            # 縮退除去
            u = []
            for v in f:
                if v not in u:
                    u.append(v)
            if len(u) >= 3:
                F.append(u)
    return np.array(V, dtype=np.float64), F


def tube(path, radii, seg=12, cap0=True, cap1=True, scale_b=1.0, up=None):
    """パスに沿った円管。radii はスカラーか各点の配列。scale_b で断面を楕円に。"""
    path = np.asarray(path, dtype=np.float64)
    n = len(path)
    radii = np.broadcast_to(np.asarray(radii, dtype=np.float64), (n,)).copy()
    T = np.gradient(path, axis=0)
    T /= np.linalg.norm(T, axis=1, keepdims=True)
    if up is None:
        a = np.array([0, 0, 1.0]) if abs(T[0][2]) < 0.9 else np.array([1.0, 0, 0])
    else:
        a = np.asarray(up, dtype=np.float64)
    N0 = np.cross(a, T[0])
    N0 = np.cross(T[0], N0)
    N0 /= np.linalg.norm(N0)
    Ns = [N0]
    for i in range(1, n):
        Nn = Ns[-1] - np.dot(Ns[-1], T[i]) * T[i]
        Nn /= np.linalg.norm(Nn)
        Ns.append(Nn)
    N = np.array(Ns)
    B = np.cross(T, N)
    ang = np.linspace(0, 2 * np.pi, seg, endpoint=False)
    V = (path[:, None, :] + radii[:, None, None] *
         (np.cos(ang)[None, :, None] * N[:, None, :] + scale_b * np.sin(ang)[None, :, None] * B[:, None, :]))
    V = V.reshape(-1, 3)
    F = []
    for i in range(n - 1):
        for j in range(seg):
            a0 = i * seg + j
            a1 = i * seg + (j + 1) % seg
            b0 = (i + 1) * seg + j
            b1 = (i + 1) * seg + (j + 1) % seg
            F.append([a0, a1, b1, b0])
    V = list(V)
    if cap0:
        c = len(V)
        V.append(path[0])
        for j in range(seg):
            F.append([c, (j + 1) % seg, j])
    if cap1:
        c = len(V)
        V.append(path[-1])
        base = (n - 1) * seg
        for j in range(seg):
            F.append([c, base + j, base + (j + 1) % seg])
    return np.array(V), F


def box(center, half):
    c = np.asarray(center, dtype=np.float64)
    h = np.asarray(half, dtype=np.float64)
    V = np.array([[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
                  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], dtype=np.float64) * h + c
    F = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]
    return V, F


def prism(poly, z0, z1):
    """2D 多角形（反時計回り）を z0..z1 に押し出す"""
    poly = np.asarray(poly, dtype=np.float64)
    n = len(poly)
    V = np.concatenate([np.c_[poly, np.full(n, z0)], np.c_[poly, np.full(n, z1)]])
    F = [list(range(n - 1, -1, -1)), list(range(n, 2 * n))]
    for i in range(n):
        j = (i + 1) % n
        F.append([i, j, n + j, n + i])
    return V, F


def merge_meshes(parts):
    """[(V,F), ...] を 1 つに結合"""
    Vs, Fs, off = [], [], 0
    for V, F in parts:
        V = np.asarray(V, dtype=np.float64)
        Vs.append(V)
        for f in F:
            Fs.append([int(i) + off for i in f])
        off += len(V)
    return np.concatenate(Vs, axis=0), Fs


def tri_count(F):
    return sum(len(f) - 2 for f in F)


# ----------------------------------------------------------------------------
# Blender 側
# ----------------------------------------------------------------------------

REGISTRY = {}   # name -> dict(obj=..., group=...)


def clear_scene():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras, bpy.data.images):
        for d in list(coll):
            coll.remove(d)


def get_collection(name, parent=None):
    if name in bpy.data.collections:
        return bpy.data.collections[name]
    c = bpy.data.collections.new(name)
    (parent or bpy.context.scene.collection).children.link(c)
    return c


def make_material(name, base=(0.8, 0.8, 0.8), rough=0.6, metal=0.0, vcol=False, vcol_alpha=False, alpha=1.0,
                  emission=None, emission_strength=1.0, sheen=0.0, sheen_tint=(1, 1, 1), sheen_rough=0.5,
                  ior=1.5, double_sided=False, coat=0.0, coat_rough=0.1, spec=0.5):
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    bsdf = None
    for n in nt.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            bsdf = n
    if bsdf is None:
        bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
        out = [n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'][0]
        nt.links.new(bsdf.outputs[0], out.inputs[0])
    base = list(base)[:3]
    bsdf.inputs['Base Color'].default_value = (*base, 1.0)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['IOR'].default_value = ior
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = spec
    if vcol:
        vc = nt.nodes.new('ShaderNodeVertexColor')
        vc.layer_name = 'Col'
        nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
        if vcol_alpha:
            nt.links.new(vc.outputs['Alpha'], bsdf.inputs['Alpha'])
    if alpha < 1.0:
        bsdf.inputs['Alpha'].default_value = alpha
    if emission is not None:
        bsdf.inputs['Emission Color'].default_value = (*list(emission)[:3], 1.0)
        bsdf.inputs['Emission Strength'].default_value = emission_strength
    if sheen > 0:
        bsdf.inputs['Sheen Weight'].default_value = sheen
        bsdf.inputs['Sheen Tint'].default_value = (*sheen_tint, 1.0)
        bsdf.inputs['Sheen Roughness'].default_value = sheen_rough
    if coat > 0:
        bsdf.inputs['Coat Weight'].default_value = coat
        bsdf.inputs['Coat Roughness'].default_value = coat_rough
    m.use_backface_culling = not double_sided
    if alpha < 1.0 or vcol_alpha:
        try:
            m.surface_render_method = 'BLENDED'
        except Exception:
            pass
        try:
            m.use_transparency_overlap = True
        except Exception:
            pass
    m.diffuse_color = (*base, 1.0)
    return m


def new_object(name, V, F, mat=None, colors=None, smooth=True, sharp_angle=None, coll=None, group=None,
               mats=None, face_mat=None, merge_dist=None):
    V = np.asarray(V, dtype=np.float64)
    if isinstance(F, np.ndarray):
        F = F.tolist()
    me = bpy.data.meshes.new(name)
    me.from_pydata(V.tolist(), [], F)
    me.update()
    if colors is not None:
        cols = np.asarray(colors, dtype=np.float32)
        if cols.ndim == 1:
            cols = np.tile(cols, (len(V), 1))
        if cols.shape[1] == 3:
            cols = np.concatenate([cols, np.ones((len(cols), 1), np.float32)], axis=1)
        attr = me.color_attributes.new(name='Col', type='FLOAT_COLOR', domain='POINT')
        attr.data.foreach_set('color', cols.ravel())
        try:
            me.color_attributes.active_color = attr
            me.color_attributes.render_color_index = me.color_attributes.find('Col')
        except Exception:
            pass
    if mats:
        for mm in mats:
            me.materials.append(mm)
        if face_mat is not None:
            me.polygons.foreach_set('material_index', np.asarray(face_mat, dtype=np.int32))
    elif mat is not None:
        me.materials.append(mat)
    n = len(me.polygons)
    me.polygons.foreach_set('use_smooth', [bool(smooth)] * n)
    if smooth and sharp_angle is not None:
        try:
            me.set_sharp_from_angle(angle=math.radians(sharp_angle))
        except Exception:
            pass
    me.update()
    obj = bpy.data.objects.new(name, me)
    (coll or bpy.context.scene.collection).objects.link(obj)
    if merge_dist is not None:
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=merge_dist)
        bm.to_mesh(me)
        bm.free()
        me.update()
    REGISTRY[name] = dict(obj=obj, group=group or name)
    return obj


def recalc_normals(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def decimate(obj, ratio):
    mod = obj.modifiers.new('dec', 'DECIMATE')
    mod.ratio = ratio
    mod.use_collapse_triangulate = True
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev)
    old = obj.data
    obj.modifiers.clear()
    obj.data = me
    bpy.data.meshes.remove(old)
    return obj


def mesh_arrays(obj, world=True):
    me = obj.data
    V = np.zeros(len(me.vertices) * 3)
    me.vertices.foreach_get('co', V)
    V = V.reshape(-1, 3)
    if world:
        M = np.array(obj.matrix_world)
        V = V @ M[:3, :3].T + M[:3, 3]
    me.calc_loop_triangles()
    T = np.zeros(len(me.loop_triangles) * 3, dtype=np.int64)
    me.loop_triangles.foreach_get('vertices', T)
    return V, T.reshape(-1, 3)


def set_vertex_colors(obj, cols):
    me = obj.data
    cols = np.asarray(cols, dtype=np.float32)
    if cols.shape[1] == 3:
        cols = np.concatenate([cols, np.ones((len(cols), 1), np.float32)], axis=1)
    if 'Col' in me.color_attributes:
        me.color_attributes.remove(me.color_attributes['Col'])
    attr = me.color_attributes.new(name='Col', type='FLOAT_COLOR', domain='POINT')
    attr.data.foreach_set('color', cols.ravel())
    try:
        me.color_attributes.active_color = attr
        me.color_attributes.render_color_index = me.color_attributes.find('Col')
    except Exception:
        pass


def bvh_from_arrays(V, F):
    F = [list(map(int, f)) for f in F]
    return BVHTree.FromPolygons([tuple(v) for v in np.asarray(V).tolist()], F)


def ray_down(bvh, x, y, z0=3.0):
    hit = bvh.ray_cast(Vector((x, y, z0)), Vector((0, 0, -1)))
    if hit[0] is None:
        return None
    return hit[0].z
