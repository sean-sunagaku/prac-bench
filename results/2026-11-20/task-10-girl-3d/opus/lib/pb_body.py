"""Body loading, facial sculpting and eyelid fitting.

The common MakeHuman hm08 (CC0) upper-body mesh is cut just below the elbows,
so the forearms and hands are taken from the supplied base.obj (same CC0
asset, identical vertex positions after the documented transformation).
All sculpting below is procedural (numpy deformations driven by landmarks).
"""
import math
import numpy as np
from pb_common import (smoothstep, falloff_ellip, gauss, normalize, triangulate,
                       vertex_normals, edges_from_faces, laplacian_smooth,
                       taubin_smooth)

EYE_L = np.array([0.0308, -0.1245, 1.5452])
EYE_R = np.array([-0.0308, -0.1245, 1.5452])


# ----------------------------------------------------------------------------
# loading
# ----------------------------------------------------------------------------

def load_obj_groups(path):
    V, VT, faces, fuv, fgrp = [], [], [], [], []
    cur = None
    with open(path) as fh:
        for line in fh:
            if line.startswith('v '):
                V.append([float(t) for t in line.split()[1:4]])
            elif line.startswith('vt '):
                VT.append([float(t) for t in line.split()[1:3]])
            elif line.startswith('g '):
                cur = line.split()[1]
            elif line.startswith('f '):
                vi, ti = [], []
                for p in line.split()[1:]:
                    s = p.split('/')
                    vi.append(int(s[0]) - 1)
                    ti.append(int(s[1]) - 1 if len(s) > 1 and s[1] else -1)
                faces.append(vi)
                fuv.append(ti)
                fgrp.append(cur)
    return np.array(V), np.array(VT) if VT else None, faces, fuv, fgrp


def source_to_meters(Vs):
    return np.stack([Vs[:, 0] * 0.1, -Vs[:, 2] * 0.1, (Vs[:, 1] + 8.168) * 0.1], axis=1)


def load_upper_body_with_arms(base_path, upper_path):
    """Returns co (N,3), faces (list), per-loop uvs (L,2), and info dict."""
    Vs, VT, faces, fuv, fgrp = load_obj_groups(base_path)
    Vm = source_to_meters(Vs)
    keep = []
    n_crop = 0
    for fi, (f, g) in enumerate(zip(faces, fgrp)):
        if g != 'body':
            continue
        sy = Vs[f, 1]
        if np.all(sy >= 2.8):
            keep.append(fi)
            n_crop += 1
            continue
        P = Vm[f]
        if np.all(np.abs(P[:, 0]) > 0.24) and np.all(P[:, 2] > 0.85):
            keep.append(fi)          # forearm + hand faces
    used = sorted(set(i for fi in keep for i in faces[fi]))
    remap = -np.ones(len(Vm), dtype=np.int64)
    remap[used] = np.arange(len(used))
    co = Vm[used].copy()
    newfaces = [[int(remap[i]) for i in faces[fi]] for fi in keep]
    uvs = []
    for fi in keep:
        for t in fuv[fi]:
            uvs.append(VT[t] if t >= 0 else (0.0, 0.0))
    uvs = np.array(uvs)
    # sanity check against the common cropped mesh
    up = []
    with open(upper_path) as fh:
        for line in fh:
            if line.startswith('v '):
                up.append([float(t) for t in line.split()[1:4]])
    up = np.array(up)
    info = {
        'upper_body_vertices': int(len(up)),
        'upper_body_faces_in_crop': int(n_crop),
        'combined_vertices': int(len(co)),
        'combined_faces': int(len(newfaces)),
    }
    # verify each upper-body vertex exists in our combined set
    from mathutils.kdtree import KDTree
    kd = KDTree(len(co))
    for i, p in enumerate(co):
        kd.insert(p, i)
    kd.balance()
    md = 0.0
    for p in up[::7]:
        _, _, d = kd.find(p)
        md = max(md, d)
    info['max_distance_upper_body_to_combined'] = float(md)
    return co, newfaces, uvs, info


# ----------------------------------------------------------------------------
# eye rim detection
# ----------------------------------------------------------------------------

def find_eye_regions(co, faces, eye_c):
    """Classify socket (inner cup) vertices and the eyelid rim loop."""
    tris = triangulate(faces)
    vn = vertex_normals(co, tris)
    rel = co - eye_c
    d = np.linalg.norm(rel, axis=1)
    o = (vn * rel).sum(1) / np.maximum(d, 1e-9)
    near = d < 0.025
    inner = near & (o < 0.0)
    edges = edges_from_faces(faces)
    a, b = edges[:, 0], edges[:, 1]
    rim = np.zeros(len(co), bool)
    m1 = inner[a] & ~inner[b] & near[b]
    m2 = inner[b] & ~inner[a] & near[a]
    rim[b[m1]] = True
    rim[a[m2]] = True
    return inner, rim, d


# ----------------------------------------------------------------------------
# facial sculpt
# ----------------------------------------------------------------------------

def _mirror_pts(c):
    c = np.asarray(c, dtype=np.float64)
    return [c, c * np.array([-1, 1, 1])]


def move(co, center, radii, delta, mirror=True, power=2):
    centers = _mirror_pts(center) if mirror else [np.asarray(center)]
    for k, c in enumerate(centers):
        w = falloff_ellip(co, c, radii, power)
        dl = np.array(delta, dtype=np.float64)
        if k == 1:
            dl[0] = -dl[0]
        co += w[:, None] * dl
    return co


def scale_about(co, center, radii, factors, pivot=None, mirror=True, power=2):
    centers = _mirror_pts(center) if mirror else [np.asarray(center)]
    pivots = None
    if pivot is not None:
        pivots = _mirror_pts(pivot) if mirror else [np.asarray(pivot)]
    for k, c in enumerate(centers):
        w = falloff_ellip(co, c, radii, power)
        pv = pivots[k] if pivots is not None else c
        f = np.asarray(factors, dtype=np.float64)
        co += w[:, None] * ((co - pv) * (f - 1.0))
    return co


def inflate(co, normals, center, radii, amount, mirror=True, power=2):
    centers = _mirror_pts(center) if mirror else [np.asarray(center)]
    for c in centers:
        w = falloff_ellip(co, c, radii, power)
        co += normals * (w * amount)[:, None]
    return co


def sculpt_face(co, faces, params=None):
    """Feminine, youthful facial proportions with a soft closed-mouth smile.

    All coordinates are in the rest pose (meters, Z-up, face toward -Y)."""
    P = dict(DEFAULT_SCULPT)
    if params:
        P.update(params)
    co = co.copy()
    tris = triangulate(faces)
    edges = edges_from_faces(faces)
    orig = co.copy()
    x, y, z = co[:, 0], co[:, 1], co[:, 2]

    # --- lower face: V-line taper + slight shortening ---------------------------
    neckfade = smoothstep(1.395, 1.43, z)
    fz = smoothstep(1.515, 1.44, z)
    fy = smoothstep(0.0, -0.07, y)
    protect = 1.0 - falloff_ellip(co, (0.0, -0.150, 1.4775), (0.034, 0.035, 0.016), 1)
    co[:, 0] = x * (1 - P['vline'] * fz * fy * neckfade * protect)
    wz = np.where(z > 1.44, smoothstep(1.49, 1.44, z), 1.0) * smoothstep(-0.05, -0.095, y) * smoothstep(1.395, 1.425, z)
    co[:, 2] = z + P['lower_short'] * wz

    # --- chin & jaw ---------------------------------------------------------
    co = move(co, (0.0, -0.142, 1.446), (0.022, 0.030, 0.020), (0.0, -P['chin_fwd'], 0.0004), mirror=False)
    co = scale_about(co, (0.0, -0.140, 1.443), (0.028, 0.030, 0.020), (P['chin_narrow'], 1.0, 1.0),
                     pivot=(0.0, -0.14, 1.443), mirror=False)
    co = scale_about(co, (0.052, -0.055, 1.465), (0.030, 0.050, 0.035), (P['jaw_narrow'], 1.0, 1.0),
                     pivot=(0.0, -0.055, 1.465))
    co = move(co, (0.0, -0.100, 1.424), (0.045, 0.040, 0.016), (0.0, P['submental_back'], P['submental_up']), mirror=False)

    # --- nose ------------------------------------------------------------------
    co = scale_about(co, (0.0, -0.150, 1.498), (0.024, 0.018, 0.013), (P['nose_width'], 1.0, 1.0),
                     pivot=(0.0, -0.150, 1.498), mirror=False)
    co = move(co, (0.0, -0.155, 1.500), (0.024, 0.020, 0.016), (0.0, 0.0, P['nose_up']), mirror=False)
    co = move(co, (0.0, -0.168, 1.507), (0.012, 0.012, 0.011), (0.0, P['tip_back'], P['tip_up']), mirror=False)
    co = scale_about(co, (0.0, -0.160, 1.505), (0.014, 0.014, 0.012), (0.88, 0.95, 0.92),
                     pivot=(0.0, -0.162, 1.505), mirror=False)
    co = scale_about(co, (0.0, -0.152, 1.535), (0.014, 0.016, 0.026), (P['bridge_width'], 1.0, 1.0),
                     pivot=(0.0, -0.152, 1.535), mirror=False)
    co = move(co, (0.0, -0.155, 1.530), (0.010, 0.012, 0.020), (0.0, P['bridge_back'], 0.0), mirror=False)

    # --- shorter midface: raise mouth region ------------------------------------
    co = move(co, (0.0, -0.150, 1.476), (0.040, 0.040, 0.020), (0.0, 0.0, P['mouth_up']), mirror=False, power=1)

    # --- lips & smile ------------------------------------------------------------
    # stomion (mouth line) ~ z 1.4775, corners ~ x +-0.0195 (before shortening)
    co = move(co, (0.0, -0.160, 1.4835), (0.019, 0.012, 0.0060), (0.0, -P['upper_lip_fwd'], P['upper_lip_up']), mirror=False)
    co = move(co, (0.0, -0.156, 1.4715), (0.018, 0.012, 0.0072), (0.0, -P['lower_lip_fwd'], -P['lower_lip_down']), mirror=False)
    co = scale_about(co, (0.0, -0.150, 1.4775), (0.032, 0.025, 0.016), (P['mouth_width'], 1.0, 1.0),
                     pivot=(0.0, -0.150, 1.4775), mirror=False)
    co = move(co, (0.0200, -0.149, 1.4778), (0.009, 0.012, 0.009), (0.0, P['corner_back'], P['corner_up']))
    co = move(co, (0.0210, -0.147, 1.4772), (0.0045, 0.008, 0.004), (0.0, 0.0004, P['corner_up'] * 0.45))
    # upper-lip eversion: show more vermilion, define the border
    co = move(co, (0.0, -0.160, 1.4865), (0.016, 0.010, 0.0030), (0.0, -P['ul_evert'], P['ul_evert'] * 0.6), mirror=False)
    # close the lip seam (lips pressed gently together)
    seam = falloff_ellip(co, (0.0, -0.152, 1.4775), (0.021, 0.012, 0.0028), 1)
    zm = 1.4775 + 0.0010 * (np.abs(co[:, 0]) / 0.02) ** 2
    co[:, 2] = co[:, 2] + (zm - co[:, 2]) * seam * 0.55
    co = move(co, (0.0260, -0.142, 1.4840), (0.012, 0.012, 0.012), (0.0, -0.0003, P['corner_up'] * 0.5))

    # --- cheeks --------------------------------------------------------------
    vn = vertex_normals(co, tris)
    co = inflate(co, vn, (0.039, -0.130, 1.507), (0.024, 0.026, 0.020), P['cheek_full'])
    co = move(co, (0.039, -0.130, 1.507), (0.024, 0.026, 0.020), (0.0, 0.0, P['cheek_up']))
    co = inflate(co, vn, (0.048, -0.100, 1.482), (0.018, 0.030, 0.020), P['buccal_full'])
    # slightly wider, softer mid-face (rounder youthful face)
    co = scale_about(co, (0.0, -0.10, 1.515), (0.11, 0.08, 0.05), (P['cheekbone_wide'], 1.0, 1.0),
                     pivot=(0.0, -0.10, 1.515), mirror=False, power=1)

    # --- brow / forehead ---------------------------------------------------------
    co = move(co, (0.028, -0.148, 1.574), (0.022, 0.016, 0.012), (0.0, P['brow_back'], 0.0))
    co = move(co, (0.0, -0.130, 1.635), (0.070, 0.045, 0.035), (0.0, P['forehead_back'], 0.0), mirror=False)

    # --- neck slimming --------------------------------------------------------
    nw = smoothstep(1.33, 1.37, co[:, 2]) * (1 - smoothstep(1.43, 1.46, co[:, 2]))
    nw *= 1 - smoothstep(0.06, 0.08, np.abs(co[:, 0]))
    cy = -0.018
    co[:, 0] *= 1 - (1 - P['neck_slim']) * nw
    co[:, 1] = cy + (co[:, 1] - cy) * (1 - (1 - P['neck_slim']) * 0.6 * nw)

    # --- relaxation of the face region (removes small kinks) --------------------
    face_mask = falloff_ellip(co, (0.0, -0.13, 1.50), (0.075, 0.07, 0.10), 1)
    disp = np.linalg.norm(co - orig, axis=1)
    smask = face_mask * smoothstep(0.0002, 0.0015, disp) * P['relax']
    co = taubin_smooth(co, edges, smask, iterations=2)
    return co


DEFAULT_SCULPT = dict(
    vline=0.085, lower_short=0.0095, mouth_up=0.0024, cheekbone_wide=1.05,
    chin_fwd=0.0024, chin_narrow=0.97, jaw_narrow=0.90, submental_back=0.0020, submental_up=0.0030,
    nose_width=0.84, nose_up=0.0010, tip_back=0.0012, tip_up=0.0010, bridge_width=0.78, bridge_back=0.0006,
    upper_lip_fwd=0.0022, upper_lip_up=0.0004, lower_lip_fwd=0.0024, lower_lip_down=0.0005,
    mouth_width=1.05, corner_back=0.0013, corner_up=0.0038, ul_evert=0.0010,
    cheek_full=0.0032, cheek_up=0.0024, buccal_full=0.0012,
    brow_back=0.0010, forehead_back=0.0020, neck_slim=0.88, relax=0.6,
)


# ----------------------------------------------------------------------------
# eyelid fit to eyeballs
# ----------------------------------------------------------------------------

def fit_eyelids(co, faces, eye_centers, surf_radius_fn, margin=0.00035, band=0.0045, gaze=None):
    """Pull the eyelid rim (and a soft band around it) onto the eyeball so the
    lids wrap the eye with no visible gap.  Vertices are moved along the depth
    axis (keeping their frontal outline) except at the canthi where the rim lies
    beyond the eyeball silhouette, where they are moved radially."""
    co = co.copy()
    from mathutils.kdtree import KDTree
    for k, E in enumerate(eye_centers):
        inner, rim, d = find_eye_regions(co, faces, E)
        rel = co - E
        dist = np.linalg.norm(rel, axis=1)
        dirs = rel / np.maximum(dist, 1e-9)[:, None]
        g = None if gaze is None else gaze[k]
        target = surf_radius_fn(dirs, g) + margin
        rp = co[rim]
        kd = KDTree(len(rp))
        for i, p in enumerate(rp):
            kd.insert(p, i)
        kd.balance()
        near = np.where(dist < 0.03)[0]
        dr = np.full(len(co), 1.0)
        for i in near:
            _, _, dd = kd.find(co[i])
            dr[i] = dd
        w = 1.0 - smoothstep(0.0, band, dr)
        w[inner] = 0.0
        w[rim] = 1.0
        front = smoothstep(0.003, -0.004, rel[:, 1])
        w *= front
        uv2 = rel[:, 0] ** 2 + rel[:, 2] ** 2
        # iterate: target radius depends on direction which changes with depth
        newp = co.copy()
        for _ in range(3):
            r2 = target ** 2
            inside = uv2 < r2 * 0.92
            ydepth = -np.sqrt(np.maximum(r2 - uv2, 0.0))
            cand = co.copy()
            cand[:, 1] = E[1] + ydepth
            radial = E + dirs * target[:, None]
            cand = np.where(inside[:, None], cand, radial)
            newp = co + (cand - co) * w[:, None]
            rel2 = newp - E
            dirs2 = rel2 / np.maximum(np.linalg.norm(rel2, axis=1), 1e-9)[:, None]
            target = surf_radius_fn(dirs2, g) + margin
        co = newp
        # socket vertices poking through the visible eyeball: push them back in
        rel = co - E
        dist = np.linalg.norm(rel, axis=1)
        dirs = rel / np.maximum(dist, 1e-9)[:, None]
        pen = inner & (rel[:, 1] < -0.002)
        if np.any(pen):
            tgt_in = surf_radius_fn(dirs[pen], g) - 0.0008
            nd = np.minimum(dist[pen], tgt_in)
            co[pen] = E + dirs[pen] * nd[:, None]
    return co


# ----------------------------------------------------------------------------
# parametric eyelid reconstruction
# ----------------------------------------------------------------------------

def eye_rings(co, faces, eye_c, n_out=9, n_in=12):
    """Topological rings around the eye opening on the ORIGINAL mesh."""
    inner, rim, _ = find_eye_regions(co, faces, eye_c)
    edges = edges_from_faces(faces)
    nb = [[] for _ in range(len(co))]
    for a, b in edges:
        nb[a].append(b)
        nb[b].append(a)
    out = -np.ones(len(co), int)
    front = list(np.where(rim)[0])
    out[front] = 0
    for k in range(1, n_out):
        nxt = []
        for i in front:
            for j in nb[i]:
                if out[j] < 0 and not inner[j]:
                    out[j] = k
                    nxt.append(j)
        front = nxt
    inn = -np.ones(len(co), int)
    front = list(np.where(rim)[0])
    for k in range(1, n_in + 1):
        nxt = []
        for i in front:
            for j in nb[i]:
                if inn[j] < 0 and inner[j] and out[j] < 0:
                    inn[j] = k
                    nxt.append(j)
        front = nxt
    inn[inner & (inn < 0)] = n_in
    return out, inn


def opening_curve(P, side_shift=(0.0, 0.0, 0.0), n=720):
    """Closed almond curve (u lateral, v up) relative to eye centre.
    Returns array (n,2) going upper lid medial->lateral then lower lateral->medial."""
    um, vm = P['eye_um'], P['eye_vm']
    ul, vl = P['eye_ul'], P['eye_vl']
    du, dvu, dvl = side_shift
    s = np.linspace(0, 1, n // 2)
    base_v = vm + (vl - vm) * s
    up = base_v + P['eye_Au'] * np.sin(np.pi * s ** P['eye_ku']) ** P['eye_pu'] + dvu * np.sin(np.pi * s)
    lo = base_v - P['eye_Al'] * np.sin(np.pi * s ** P['eye_kl']) ** P['eye_pl'] + dvl * np.sin(np.pi * s)
    u = um + (ul - um) * s + du * np.sin(np.pi * s)
    upper = np.stack([u, up], 1)
    lower = np.stack([u, lo], 1)[::-1]
    return np.concatenate([upper, lower[1:-1]], 0)


def _polar_interp(curve, center):
    rel = curve - center
    ang = np.arctan2(rel[:, 1], rel[:, 0])
    rad = np.linalg.norm(rel, axis=1)
    o = np.argsort(ang)
    ang, rad = ang[o], rad[o]
    ang = np.concatenate([ang - 2 * np.pi, ang, ang + 2 * np.pi])
    rad = np.concatenate([rad, rad, rad])
    return lambda th: np.interp(th, ang, rad)


def rebuild_eyelids(co, co_orig, faces, rings, eye_orig, eye_new, side, surf_fn, gaze=None, params=None):
    """Re-place the vertices of the eyelid rings so that the lids form a clean
    almond opening whose margins rest on the eyeball (with lid thickness),
    a double-eyelid crease and a soft under-eye roll."""
    P = dict(DEFAULT_EYELID)
    if params:
        P.update(params)
    out, inn = rings
    co = co.copy()
    g = np.array([0.0, -1.0, 0.0]) if gaze is None else np.asarray(gaze, float) / np.linalg.norm(gaze)
    pitch = math.asin(np.clip(g[2], -1, 1))
    from pb_eyes import R_EYE
    dvu = P['lid_follow_up'] * R_EYE * math.sin(pitch)
    dvl = P['lid_follow_low'] * R_EYE * math.sin(pitch)
    curve = opening_curve(P, (0.0, dvu, dvl))
    # 2D frontal coords (u lateral, v up)
    def to2d(p, c):
        return np.stack([(p[:, 0] - c[0]) * side, p[:, 2] - c[2]], 1)
    sel_out = np.where((out >= 0) & (out <= 8))[0]
    rim_ids = np.where(out == 0)[0]
    p_orig_rim = to2d(co_orig[rim_ids], eye_orig)
    C0 = p_orig_rim.mean(0)
    rho0 = _polar_interp(p_orig_rim, C0)
    Cn = curve.mean(0)
    rhon = _polar_interp(curve, Cn)
    beta = np.array(P['beta'])
    beta_d = np.array(P['beta_depth'])
    t_up = np.array(P['thick_up'])
    t_lo = np.array(P['thick_low'])

    def eye_depth(q2, thick):
        """y coordinate on (eye surface + thick) for 2D offsets q2 rel. to new centre."""
        r2 = (q2 ** 2).sum(1)
        y = np.full(len(q2), eye_new[1])
        dirs = np.stack([q2[:, 0] * side, np.zeros(len(q2)), q2[:, 1]], 1)
        for _ in range(3):
            d3 = dirs.copy()
            d3[:, 1] = y - eye_new[1]
            d3 /= np.maximum(np.linalg.norm(d3, axis=1), 1e-9)[:, None]
            R = surf_fn(d3, g) + thick
            inside = r2 < R ** 2
            y = np.where(inside, eye_new[1] - np.sqrt(np.maximum(R ** 2 - r2, 0)),
                         eye_new[1] + (np.sqrt(r2) - R) * 0.55)
        return y

    # ---- outer rings ----
    p2 = to2d(co_orig[sel_out], eye_orig)
    rel0 = p2 - C0
    th = np.arctan2(rel0[:, 1], rel0[:, 0])
    rho = np.linalg.norm(rel0, axis=1)
    k = out[sel_out]
    delta = np.maximum(rho - rho0(th), 0.0)
    upper = rel0[:, 1] > 0
    off = np.where(upper, P['margin_up'], P['margin_low'])
    gam = np.where(upper, P['spacing_up'], P['spacing_low'])
    dirn = np.stack([np.cos(th), np.sin(th)], 1)
    pnew = Cn + dirn * (rhon(th) + off + delta * gam)[:, None]
    # current (sculpted) 2D position of the vertex, to blend toward for outer rings
    pcur = to2d(co[sel_out], eye_orig)
    b = beta[k]
    pfin = pnew * (1 - b[:, None]) + pcur * b[:, None]
    thick = np.where(upper, t_up[k], t_lo[k])
    q2 = pfin - (eye_new[[0, 2]] - eye_orig[[0, 2]]) * np.array([side, 1])
    yw = eye_depth(q2, thick)
    bd = beta_d[k]
    ynew = yw * (1 - bd) + co[sel_out, 1] * bd
    co[sel_out, 0] = eye_orig[0] + pfin[:, 0] * side
    co[sel_out, 2] = eye_orig[2] + pfin[:, 1]
    co[sel_out, 1] = ynew

    # crease (upper lid) and under-eye roll (lower lid), along ring index
    crease = np.zeros(len(sel_out))
    roll = np.zeros(len(sel_out))
    # lateral taper so crease fades at the canthi
    uu = pfin[:, 0]
    taper = smoothstep(P['eye_um'] + 0.002, P['eye_um'] + 0.008, uu) * (1 - smoothstep(P['eye_ul'] - 0.004, P['eye_ul'] + 0.003, uu))
    for kk, amt in P['crease_profile'].items():
        crease += (k == kk) * upper * amt
    for kk, amt in P['roll_profile'].items():
        roll += (k == kk) * (~upper) * amt
    ctr = eye_new.copy()
    d3 = co[sel_out] - ctr
    d3 /= np.linalg.norm(d3, axis=1)[:, None]
    co[sel_out] += d3 * ((crease + roll) * taper)[:, None]

    # ---- inner rings ----
    sel_in = np.where(inn >= 1)[0]
    p2 = to2d(co_orig[sel_in], eye_orig)
    rel0 = p2 - C0
    th = np.arctan2(rel0[:, 1], rel0[:, 0])
    ki = inn[sel_in]
    dirn = np.stack([np.cos(th), np.sin(th)], 1)
    extra = np.where(ki == 1, 0.0, 0.0012 * np.minimum(ki - 1, 3))
    pin = Cn + dirn * (rhon(th) + extra)[:, None]
    q2 = pin - (eye_new[[0, 2]] - eye_orig[[0, 2]]) * np.array([side, 1])
    y1 = eye_depth(q2, np.full(len(q2), P['contact']))
    new3 = np.stack([eye_orig[0] + pin[:, 0] * side, y1, eye_orig[2] + pin[:, 1]], 1)
    deep = ki >= 2
    if np.any(deep):
        dd = new3[deep] - eye_new
        dd /= np.linalg.norm(dd, axis=1)[:, None]
        rr = np.where(ki[deep] == 2, R_EYE * 0.93, R_EYE * 0.74)
        new3[deep] = eye_new + dd * rr[:, None]
    co[sel_in] = new3
    return co


DEFAULT_EYELID = dict(
    eye_um=-0.0145, eye_vm=-0.0007, eye_ul=0.0158, eye_vl=0.0012,
    eye_Au=0.0049, eye_ku=0.88, eye_pu=0.80,
    eye_Al=0.0037, eye_kl=1.12, eye_pl=0.90,
    lid_follow_up=0.40, lid_follow_low=0.25,
    margin_up=0.0009, margin_low=0.0008,
    spacing_up=1.0, spacing_low=0.95,
    beta=[0.0, 0.0, 0.08, 0.22, 0.42, 0.62, 0.80, 0.92, 1.0],
    beta_depth=[0.0, 0.03, 0.12, 0.28, 0.48, 0.68, 0.84, 0.94, 1.0],
    thick_up=[0.0008, 0.0012, 0.0016, 0.0020, 0.0024, 0.0028, 0.0032, 0.0036, 0.004],
    thick_low=[0.0007, 0.0010, 0.0013, 0.0016, 0.0020, 0.0024, 0.0028, 0.0032, 0.0036],
    crease_profile={2: 0.0002, 3: 0.0002, 4: -0.0009, 5: 0.0003, 6: 0.0002},
    roll_profile={1: 0.00025, 2: 0.0003, 3: 0.00015, 4: 0.0},
    contact=0.00005,
)
