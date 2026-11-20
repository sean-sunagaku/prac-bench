"""Knitted crew-neck sweater built around the posed body.

Torso = body surface offset by a looseness map (+ hem extension); sleeves =
loose tubes along the posed arm bones that sag under gravity; both are fused
with a voxel remesh, relaxed (Taubin), trimmed at neck / cuffs / hem, given
procedural compression and drape folds, and finished with ribbed collar,
cuffs and hem bands.  Per-face knit UVs follow the torso (cylindrical) and
the sleeves (along the arm) so the stockinette columns run like real knit.
"""
import math
import numpy as np
import bpy
import bmesh
from pb_common import (smoothstep, normalize, triangulate, vertex_normals, edges_from_faces,
                       laplacian_smooth, taubin_smooth, new_mesh_object, rng, falloff_ellip)


# ----------------------------------------------------------------------------
# small geometry helpers
# ----------------------------------------------------------------------------

def boundary_loops(faces, n_verts):
    """Closed boundary loops traced along directed boundary half-edges (robust
    to bow-tie vertices left by trimming)."""
    from collections import defaultdict
    half = set()
    for f in faces:
        m = len(f)
        for k in range(m):
            half.add((f[k], f[(k + 1) % m]))
    out = defaultdict(list)
    for a, b in half:
        if (b, a) not in half:
            out[a].append(b)
    used = set()
    loops = []
    for a0 in list(out.keys()):
        for b0 in out[a0]:
            if (a0, b0) in used:
                continue
            loop = [a0]
            used.add((a0, b0))
            cur = b0
            guard = 0
            while cur != a0 and guard < 100000:
                loop.append(cur)
                nxt = [v for v in out[cur] if (cur, v) not in used]
                if not nxt:
                    break
                used.add((cur, nxt[0]))
                cur = nxt[0]
                guard += 1
            loops.append(loop)
    return loops


def catmull(points, spacing=0.008):
    P = np.asarray(points, float)
    P = np.concatenate([P[:1] * 2 - P[1:2], P, P[-1:] * 2 - P[-2:-1]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        n = max(2, int(np.linalg.norm(p2 - p1) / spacing))
        for t in np.linspace(0, 1, n, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-2])
    return np.array(out)


def transport_frames(path, up_hint=(0, 0, 1)):
    T = np.gradient(path, axis=0)
    T = normalize(T)
    N = np.zeros_like(T)
    up = np.asarray(up_hint, float)
    n0 = up - np.dot(up, T[0]) * T[0]
    if np.linalg.norm(n0) < 1e-6:
        n0 = np.array([1.0, 0, 0]) - T[0, 0] * T[0]
    N[0] = n0 / np.linalg.norm(n0)
    for i in range(1, len(T)):
        n = N[i - 1] - np.dot(N[i - 1], T[i]) * T[i]
        N[i] = n / np.linalg.norm(n)
    B = np.cross(T, N)
    return T, N, B


def tube_mesh(path, radii, ring=40, up_hint=(0, 0, 1), ellipse=None, cap=True):
    T, N, B = transport_frames(path, up_hint)
    verts = []
    for i, p in enumerate(path):
        r = radii[i]
        ex = 1.0 if ellipse is None else ellipse[i][0]
        ey = 1.0 if ellipse is None else ellipse[i][1]
        for j in range(ring):
            a = 2 * math.pi * j / ring
            verts.append(p + r * (math.cos(a) * ex * N[i] + math.sin(a) * ey * B[i]))
    faces = []
    n = len(path)
    for i in range(n - 1):
        for j in range(ring):
            a = i * ring + j
            b = i * ring + (j + 1) % ring
            c = (i + 1) * ring + (j + 1) % ring
            d = (i + 1) * ring + j
            faces.append([a, b, c, d])
    if cap:
        c0 = len(verts)
        verts.append(path[0])
        c1 = len(verts)
        verts.append(path[-1])
        for j in range(ring):
            faces.append([c0, (j + 1) % ring, j])
            faces.append([c1, (n - 1) * ring + j, (n - 1) * ring + (j + 1) % ring])
    return np.array(verts), faces, (T, N, B)


def remesh_union(parts, voxel, name='tmp_union'):
    verts, faces, off = [], [], 0
    for V, F in parts:
        verts.append(V)
        faces += [[i + off for i in f] for f in F]
        off += len(V)
    col = bpy.context.scene.collection
    ob = new_mesh_object(name, np.concatenate(verts), faces, col, smooth=False)
    mod = ob.modifiers.new('Remesh', 'REMESH')
    mod.mode = 'VOXEL'
    mod.voxel_size = voxel
    mod.adaptivity = 0.0
    mod.use_smooth_shade = True
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev)
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get('co', co)
    fcs = [list(p.vertices) for p in me.polygons]
    bpy.data.objects.remove(ob)
    bpy.data.meshes.remove(me)
    return co.reshape(-1, 3), fcs


def compact(co, faces, keep_face):
    faces = [f for f, k in zip(faces, keep_face) if k]
    used = np.unique(np.concatenate([np.array(f) for f in faces]))
    remap = -np.ones(len(co), int)
    remap[used] = np.arange(len(used))
    return co[used], [[int(remap[i]) for i in f] for f in faces], used


def point_polyline(P, path):
    """For points P (N,3): nearest arclength s and distance to a polyline."""
    seg_a, seg_b = path[:-1], path[1:]
    d = seg_b - seg_a
    L = np.linalg.norm(d, axis=1)
    cum = np.concatenate([[0], np.cumsum(L)])
    best_s = np.zeros(len(P))
    best_d = np.full(len(P), 1e9)
    best_i = np.zeros(len(P), int)
    for i in range(len(seg_a)):
        t = np.clip(((P - seg_a[i]) @ d[i]) / max(L[i] ** 2, 1e-12), 0, 1)
        q = seg_a[i] + t[:, None] * d[i]
        dist = np.linalg.norm(P - q, axis=1)
        m = dist < best_d
        best_d[m] = dist[m]
        best_s[m] = cum[i] + t[m] * L[i]
        best_i[m] = i
    return best_s, best_d, best_i, cum


# ----------------------------------------------------------------------------
# main builder
# ----------------------------------------------------------------------------

def build_sweater(co_rest, cop, faces, Wt, X, chains, collection, params=None):
    P = dict(DEFAULT_SWEATER)
    if params:
        P.update(params)
    R = rng(11)
    tris = triangulate(faces)
    vn = vertex_normals(cop, tris)
    zr, yr, xr = co_rest[:, 2], co_rest[:, 1], co_rest[:, 0]
    arm_w = sum(Wt[k + '_' + s] for k in ('upper', 'fore', 'hand') for s in ('l', 'r'))
    hand_w = Wt['hand_l'] + Wt['hand_r']
    head_w = Wt['head'] + Wt['neck']
    torso_off = np.interp(zr, [1.05, 1.14, 1.22, 1.28, 1.33, 1.37, 1.40],
                          [0.034, 0.032, 0.026, 0.019, 0.012, 0.007, 0.004])
    torso_off = torso_off + 0.005 * smoothstep(-0.02, 0.06, yr)
    off = torso_off * (1 - arm_w) * (1 - head_w) + 0.004 * arm_w * (1 - hand_w) + 0.001 * head_w
    fat = cop + vn * off[:, None]
    fat = _drape_torso(fat, Wt, X, arm_w, head_w, P)

    # --- waist extension (sweater continues to the hips) ----------------------
    loops = boundary_loops(faces, len(cop))
    waist = min(loops, key=lambda L: cop[L, 2].mean())
    Rt = X['torso'].R
    down = -Rt[:, 2]
    loop_p = fat[waist]
    ctr = loop_p.mean(0)
    ext_v = [fat]
    ext_f = list(faces)
    nV = len(fat)
    prev = list(waist)
    n_ext = P['hem_rings']
    for k in range(1, n_ext + 1):
        t = k / n_ext
        sc = 1.0 + 0.06 * math.sin(math.pi * min(t * 1.2, 1.0)) - 0.05 * t ** 3
        ring = ctr + (loop_p - ctr) * sc + down * (P['hem_drop'] * t)
        ids = list(range(nV, nV + len(ring)))
        ext_v.append(ring)
        nV += len(ring)
        m = len(ring)
        for i in range(m):
            ext_f.append([prev[i], prev[(i + 1) % m], ids[(i + 1) % m], ids[i]])
        prev = ids
    bottom_c = ctr + down * P['hem_drop']
    ext_v.append(bottom_c[None, :])
    cid = nV
    m = len(prev)
    for i in range(m):
        ext_f.append([prev[(i + 1) % m], prev[i], cid])
    fat_all = np.concatenate(ext_v)
    hem_z_world = bottom_c

    # --- sleeves ----------------------------------------------------------------
    parts = [(fat_all, ext_f)]
    sleeve_paths = {}
    for side, sgn in (('l', 1.0), ('r', -1.0)):
        ch = chains[side]
        S, E, Wp, C = ch['S'], ch['E'], ch['W'], ch['C']
        hand_dir = normalize(ch['hand_tip'] - Wp)
        P0 = S + (C - S) * 0.42 + Rt @ np.array([0, 0.0, -0.012])
        P4 = Wp + hand_dir * P['cuff_over']
        mid_u = S + (E - S) * 0.5
        mid_f = E + (Wp - E) * 0.5
        path = catmull([P0, S, mid_u, E, mid_f, Wp, P4], spacing=0.008)
        L = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))])
        # radius profile by arclength landmarks
        Ls = point_polyline(np.array([P0, S, mid_u, E, mid_f, Wp, P4]), path)[0]
        rs = np.interp(L, Ls, P['sleeve_r'])
        ra = np.interp(L, Ls, [0.05, 0.046, 0.042, 0.036, 0.032, 0.027, 0.03])
        sag = np.interp(L, Ls, [0.0, 0.2, 0.55, 0.6, 0.6, 0.5, 0.2]) * (rs - ra)
        path_c = path + np.array([0, 0, -1.0]) * sag[:, None]
        V, F, frames = tube_mesh(path_c, rs, ring=40)
        parts.append((V, F))
        sleeve_paths[side] = dict(path=path, path_c=path_c, L=L, Ls=Ls, rs=rs, P4=P4, hand_dir=hand_dir,
                                  S=S, E=E, W=Wp)
    co, fs = remesh_union(parts, P['voxel'])
    edges = edges_from_faces(fs)
    co = taubin_smooth(co, edges, np.ones(len(co)), iterations=P['relax_iters'], lam=0.55, mu=-0.57)

    # --- trimming --------------------------------------------------------------
    Xt = X['torso']
    loc = (co - Xt.t) @ Xt.R + Xt.pivot          # back to torso rest frame
    phi = np.arctan2(loc[:, 0], -(loc[:, 1] + 0.025))
    zn = P['neck_front'] + (P['neck_back'] - P['neck_front']) * (1 - np.cos(phi)) / 2
    rxy = np.sqrt((loc[:, 0] / 1.0) ** 2 + ((loc[:, 1] + 0.02) / 0.85) ** 2)
    in_sleeve = np.zeros(len(co), bool)
    for side in ('l', 'r'):
        sp = sleeve_paths[side]
        s_, d_, i_, _ = point_polyline(co, sp['path_c'])
        in_sleeve |= (d_ < sp['rs'][i_] * 1.35) & (s_ > sp['Ls'][1] - 0.01)
    ell = np.sqrt((loc[:, 0] / P['neck_rx']) ** 2 + ((loc[:, 1] + 0.025) / P['neck_ry']) ** 2)
    neck_cut = (loc[:, 2] > zn) & (ell < 1.0)
    neck_cut |= (loc[:, 2] > 1.45) & (rxy < 0.16)
    neck_cut &= ~in_sleeve
    hem_plane_z = Xt.pivot[2] + ((hem_z_world - Xt.t) @ Xt.R)[2] + P['hem_trim']
    hem_cut = loc[:, 2] < hem_plane_z
    cuff_cut = np.zeros(len(co), bool)
    for side in ('l', 'r'):
        sp = sleeve_paths[side]
        n = sp['hand_dir']
        plane = sp['P4'] - n * P['cuff_trim_back']
        near = np.linalg.norm(co - sp['W'], axis=1) < 0.16
        cuff_cut |= near & (((co - plane) @ n) > 0)
    cutv = neck_cut | hem_cut | cuff_cut
    keep = [not np.any(cutv[f]) for f in fs]
    co, fs, used = compact(co, fs, keep)
    loc = loc[used]
    phi = phi[used]
    # drop tiny islands
    co, fs = _largest_component(co, fs)
    loc = (co - Xt.t) @ Xt.R + Xt.pivot
    phi = np.arctan2(loc[:, 0], -(loc[:, 1] + 0.025))

    # --- clean the cut edges ---------------------------------------------------
    loops = boundary_loops(fs, len(co))
    info = {'neck': None, 'hem': None, 'cuff_l': None, 'cuff_r': None}
    for lp in sorted(loops, key=len):
        c = co[lp].mean(0)
        lc = (c - Xt.t) @ Xt.R + Xt.pivot
        dl = np.linalg.norm(c - sleeve_paths['l']['W'])
        dr = np.linalg.norm(c - sleeve_paths['r']['W'])
        if len(lp) < 12:
            continue
        if min(dl, dr) < 0.09:
            info['cuff_l' if dl < dr else 'cuff_r'] = lp
        elif lc[2] > 1.30:
            info['neck'] = lp
        elif lc[2] < 1.10:
            info['hem'] = lp
    edges = edges_from_faces(fs)
    bmask = np.zeros(len(co))
    for k, lp in info.items():
        if lp is None:
            continue
        lp_arr = np.array(lp)
        if k == 'neck':
            l = loc[lp_arr]
            zt = P['neck_front'] + (P['neck_back'] - P['neck_front']) * (1 - np.cos(phi[lp_arr])) / 2
            l[:, 2] = zt - 0.001
            co[lp_arr] = (l - Xt.pivot) @ Xt.R.T + Xt.t
        elif k == 'hem':
            l = loc[lp_arr]
            l[:, 2] = hem_plane_z + 0.0005
            co[lp_arr] = (l - Xt.pivot) @ Xt.R.T + Xt.t
        elif k.startswith('cuff'):
            sp = sleeve_paths[k[-1]]
            n = sp['hand_dir']
            plane = sp['P4'] - n * P['cuff_trim_back']
            dd = (co[lp_arr] - plane) @ n
            co[lp_arr] -= np.outer(dd, n)
        bmask[lp_arr] = 1
    # smooth edge loops along themselves a little
    co = laplacian_smooth(co, edges, 1 - bmask * 0.0, iterations=2, lam=0.3)

    # --- folds -------------------------------------------------------------------
    tris2 = triangulate(fs)
    vn2 = vertex_normals(co, tris2)
    disp = np.zeros(len(co))
    region = np.zeros(len(co), int)    # 0 torso, 1 left sleeve, 2 right sleeve
    sleeve_s = np.zeros(len(co))
    sleeve_th = np.zeros(len(co))
    for si, side in ((1, 'l'), (2, 'r')):
        sp = sleeve_paths[side]
        s, d, idx, cum = point_polyline(co, sp['path_c'])
        T, N, B = transport_frames(sp['path_c'])
        rel = co - sp['path_c'][idx]
        th = np.arctan2(np.einsum('ij,ij->i', rel, B[idx]), np.einsum('ij,ij->i', rel, N[idx]))
        # sleeve membership: beyond the armhole seam (drop shoulder)
        s_seam = sp['Ls'][1] + P['seam_offset']
        rs_local = np.interp(s, sp['L'], sp['rs'])
        member = (s > s_seam) & (d < rs_local * 1.28)
        region[member] = si
        sleeve_s[member] = s[member]
        sleeve_th[member] = th[member]
        # folds: tilted ring folds (bunching), stronger at elbow & forearm
        Ls = sp['Ls']
        amp = np.interp(s, [Ls[1], Ls[2], Ls[3], Ls[4], Ls[5], Ls[6]],
                        [0.0012, 0.0022, 0.0042, 0.0040, 0.0046, 0.0015]) * P['fold_amp']
        phase_noise = np.sin(th * 1.0 + s * 9.0) * 0.35 + np.sin(th * 2.0 - s * 23.0 + 1.3) * 0.2
        t = s / P['fold_wavelength'] + 0.18 * np.cos(th - 0.6 * (si * 2 - 3)) + phase_noise
        prof = 1.0 - 2.0 * np.abs(np.sin(np.pi * t)) ** 0.7      # rounded ridges, creased valleys
        # underside (gravity) folds are deeper, top side tighter
        side_w = 0.65 + 0.35 * (-np.cos(th))
        mod = 0.6 + 0.4 * np.sin(s * 37.0 + th * 0.5) * np.sin(s * 13.0)
        dsl = amp * prof * side_w * mod
        disp = np.where(member, dsl, disp)
    # torso: gathered vertical folds above the hem band + diagonal pull from armpits
    tor = region == 0
    zl = loc[:, 2]
    hem_top = ((hem_z_world - Xt.t) @ Xt.R + Xt.pivot)[2] + P['hem_trim']
    gather = (1 - smoothstep(hem_top + 0.03, hem_top + 0.16, zl)) * P['gather_amp']
    vf = np.sin(phi * 13.0 + np.sin(phi * 3.0) * 1.5) * 0.6 + np.sin(phi * 21.0 + 2.0) * 0.4
    dt = gather * vf
    for sgn in (1.0, -1.0):
        ax = loc[:, 0] * sgn
        # diagonal folds from armpit toward sternum on the front
        u = (ax - 0.14) * 0.8 + (loc[:, 2] - 1.27) * 0.6
        w = falloff_ellip(loc, np.array([0.10 * sgn, -0.09, 1.25]), (0.08, 0.08, 0.09), 1) * smoothstep(0.0, -0.06, loc[:, 1])
        dt += w * P['pull_amp'] * np.sin(u * 2 * math.pi / 0.045)
    disp = np.where(tor, dt, disp)
    co = co + vn2 * disp[:, None]
    edges = edges_from_faces(fs)
    co = laplacian_smooth(co, edges, np.ones(len(co)), iterations=1, lam=0.35)

    ob = new_mesh_object('Sweater_Body', co, fs, collection)
    # per-face region & knit UVs
    _assign_knit_uvs(ob, co, fs, region, loc, phi, sleeve_s, sleeve_th, sleeve_paths, P)
    # store boundary info for bands
    return ob, dict(loops=info, co=co, faces=fs, sleeve_paths=sleeve_paths, loc=loc, phi=phi,
                    hem_top=hem_top, region=region)


def _largest_component(co, faces):
    n = len(co)
    parent = np.arange(n)

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    for f in faces:
        r0 = find(f[0])
        for v in f[1:]:
            r = find(v)
            if r != r0:
                parent[r] = r0
    roots = np.array([find(i) for i in range(n)])
    vals, counts = np.unique(roots, return_counts=True)
    big = vals[np.argmax(counts)]
    keep = [roots[f[0]] == big for f in faces]
    c2, f2, _ = compact(co, faces, keep)
    return c2, f2


def _assign_knit_uvs(ob, co, faces, region, loc, phi, s_sl, th_sl, sleeve_paths, P):
    me = ob.data
    uvl = me.uv_layers.new(name='KnitUV')
    sw, rh = P['stitch_w'], P['row_h']
    tile_u, tile_v = 8 * sw, 10 * rh          # one texture tile = 8 x 10 stitches
    uvs = np.zeros((sum(len(f) for f in faces), 2))
    reg_attr = np.zeros(len(faces))
    li = 0
    R_t = 0.15
    for fi, f in enumerate(faces):
        r = np.bincount(region[f], minlength=3).argmax()
        reg_attr[fi] = r
        if r == 0:
            ph = phi[f].copy()
            ref = ph[0]
            ph = ref + ((ph - ref + np.pi) % (2 * np.pi) - np.pi)
            u = ph * R_t / tile_u
            v = loc[f, 2] / tile_v
        else:
            sp = sleeve_paths['l' if r == 1 else 'r']
            th = th_sl[f].copy()
            ref = th[0]
            th = ref + ((th - ref + np.pi) % (2 * np.pi) - np.pi)
            rr = 0.052
            u = th * rr / tile_u
            v = -s_sl[f] / tile_v
        for k in range(len(f)):
            uvs[li] = (u[k], v[k])
            li += 1
    uvl.data.foreach_set('uv', uvs.astype(np.float32).ravel())
    attr = me.attributes.new('knit_region', 'FLOAT', 'FACE')
    attr.data.foreach_set('value', reg_attr.astype(np.float32))


DEFAULT_SWEATER = dict(
    voxel=0.0038, relax_iters=12, hem_rings=8, hem_drop=0.18, hem_trim=0.040,
    cuff_over=0.030, cuff_trim_back=0.040,
    sleeve_r=[0.050, 0.060, 0.058, 0.055, 0.051, 0.047, 0.045],
    neck_front=1.352, neck_back=1.392, neck_open_r=0.075, neck_rx=0.072, neck_ry=0.066,
    seam_offset=0.035, fold_amp=1.5, fold_wavelength=0.046, gather_amp=0.0028, pull_amp=0.0,
    stitch_w=0.0074, row_h=0.0060,
)


# ----------------------------------------------------------------------------
# ribbed bands (collar, cuffs, hem)
# ----------------------------------------------------------------------------

def order_loop_ring(co, loop, center, axis):
    """Return loop indices ordered by angle around axis through center."""
    a = normalize(axis)
    ref = np.array([1.0, 0, 0]) if abs(a[0]) < 0.9 else np.array([0, 1.0, 0])
    e1 = normalize(ref - np.dot(ref, a) * a)
    e2 = np.cross(a, e1)
    rel = co[loop] - center
    ang = np.arctan2(rel @ e2, rel @ e1)
    o = np.argsort(ang)
    return [loop[i] for i in o], ang[o]


def band_from_loop(name, co, loop, center, axis, profile, collection, n_out=96, rib_w=0.0050,
                   tile_cols=4, push_from=None, min_gap=0.002, smooth_loop=True):
    """Ribbed band swept around an (approx. planar) edge loop.
    profile: list of (outward, along_axis) offsets in meters relative to the loop."""
    lp, ang = order_loop_ring(co, loop, center, axis)
    pts = co[lp]
    # resample uniformly by angle
    ang_u = np.linspace(-math.pi, math.pi, n_out, endpoint=False)
    angx = np.concatenate([ang - 2 * math.pi, ang, ang + 2 * math.pi])
    ptsx = np.concatenate([pts, pts, pts])
    res = np.stack([np.interp(ang_u, angx, ptsx[:, k]) for k in range(3)], 1)
    if smooth_loop:
        for _ in range(3):
            res = 0.5 * res + 0.25 * (np.roll(res, 1, 0) + np.roll(res, -1, 0))
    a = normalize(axis)
    verts = []
    nprof = len(profile)
    for i, p in enumerate(res):
        out = p - center
        out = normalize(out - np.dot(out, a) * a)
        for (o, h) in profile:
            verts.append(p + out * o + a * h)
    verts = np.array(verts)
    faces = []
    for i in range(n_out):
        i2 = (i + 1) % n_out
        for k in range(nprof - 1):
            faces.append([i * nprof + k, i2 * nprof + k, i2 * nprof + k + 1, i * nprof + k + 1])
    if push_from is not None:
        bvh = push_from
        for vi in range(len(verts)):
            hit = bvh.find_nearest(verts[vi])
            if hit[0] is None:
                continue
            q, nrm, _, dist = hit
            nrm = np.array(nrm)
            dvec = verts[vi] - np.array(q)
            sd = np.dot(dvec, nrm)
            if sd < min_gap:
                verts[vi] = np.array(q) + nrm * min_gap
    ob = new_mesh_object(name, verts, faces, collection)
    # UVs: u around (rib columns), v along profile
    me = ob.data
    uvl = me.uv_layers.new(name='KnitUV')
    circ = np.sum(np.linalg.norm(np.diff(np.concatenate([res, res[:1]]), axis=0), axis=1))
    n_cols = max(4, int(round(circ / rib_w / tile_cols)) * tile_cols)
    prof_len = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(np.array(profile), axis=0), axis=1))])
    uvs = []
    for f in faces:
        for vi in f:
            i, k = divmod(vi, nprof)
            if f[1] // nprof == 0 and i == 0 and any(v // nprof == n_out - 1 for v in f):
                pass
            uvs.append((i, k))
    uvs = np.array(uvs, float)
    # fix wrap seam per face
    out_uv = []
    for fi, f in enumerate(faces):
        ii = np.array([vi // nprof for vi in f], float)
        kk = np.array([vi % nprof for vi in f])
        if ii.max() - ii.min() > n_out / 2:
            ii[ii < n_out / 2] += n_out
        u = ii / n_out * (n_cols / tile_cols)
        v = prof_len[kk] / (rib_w * 1.2 * 6)
        out_uv += list(zip(u, v))
    uvl.data.foreach_set('uv', np.array(out_uv, np.float32).ravel())
    return ob


def _drape_torso(fat, Wt, X, arm_w, head_w, P):
    """Fabric hangs from the widest points (bust, shoulder blades) instead of
    following the body inward: per azimuth column, the radius may only shrink
    slowly with decreasing height."""
    Xt = X['torso']
    loc = (fat - Xt.t) @ Xt.R + Xt.pivot
    cy = -0.025
    phi = np.arctan2(loc[:, 0], -(loc[:, 1] - cy))
    r = np.sqrt(loc[:, 0] ** 2 + (loc[:, 1] - cy) ** 2)
    z = loc[:, 2]
    tor = (arm_w < 0.3) & (head_w < 0.3) & (z < 1.33) & (np.abs(loc[:, 0]) < 0.20)
    nphi, nz = 72, 60
    z0, z1 = 1.02, 1.34
    pi_ = np.clip(((phi + np.pi) / (2 * np.pi) * nphi).astype(int), 0, nphi - 1)
    zi = np.clip(((z - z0) / (z1 - z0) * nz).astype(int), 0, nz - 1)
    grid = np.zeros((nphi, nz))
    m = tor
    np.maximum.at(grid, (pi_[m], zi[m]), r[m])
    # fill empty bins from neighbours
    for _ in range(3):
        empty = grid == 0
        if not empty.any():
            break
        nb = np.maximum(np.roll(grid, 1, 0), np.roll(grid, -1, 0))
        grid = np.where(empty, nb, grid)
    dz = (z1 - z0) / nz
    hang = grid.copy()
    slope = P.get('drape_slope', 0.22)
    for k in range(nz - 2, -1, -1):
        hang[:, k] = np.maximum(grid[:, k], hang[:, k + 1] - slope * dz)
    # smooth around azimuth
    for _ in range(2):
        hang = 0.5 * hang + 0.25 * (np.roll(hang, 1, 0) + np.roll(hang, -1, 0))
    target = hang[pi_, zi]
    w = tor * (1 - smoothstep(1.27, 1.33, z))
    newr = np.where(target > r, r + (target - r) * w, r)
    scale = newr / np.maximum(r, 1e-6)
    loc2 = loc.copy()
    loc2[:, 0] = loc[:, 0] * scale
    loc2[:, 1] = cy + (loc[:, 1] - cy) * scale
    return (loc2 - Xt.pivot) @ Xt.R.T + Xt.t
