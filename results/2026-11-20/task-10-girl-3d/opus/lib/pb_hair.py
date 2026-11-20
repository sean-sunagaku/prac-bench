"""Procedural long wavy hair with wispy bangs, generated as real curve strands.

Strands are grown from roots sampled on the (posed) scalp: they follow a
parting-based flow field over the head at a layer offset that grows with the
distance travelled (so crown hair lies on top), bend under gravity, collide
with head / ear / sweater, are routed in front of or behind the shoulders,
then receive clumping, loose S-waves, frizz and flyaways.
"""
import math
import numpy as np
from mathutils.bvhtree import BVHTree
from pb_common import smoothstep, normalize, triangulate, rng


def sample_roots(co, faces, mask, n, seed=1, dens_pow=2.0):
    """Area-weighted random points on faces where the per-vertex mask > 0."""
    R = rng(seed)
    tris = triangulate(faces)
    m = mask[tris].mean(1)
    sel = m > 0.15
    tris = tris[sel]
    m = m[sel]
    a, b, c = co[tris[:, 0]], co[tris[:, 1]], co[tris[:, 2]]
    area = 0.5 * np.linalg.norm(np.cross(b - a, c - a), axis=1)
    w = area * np.clip(m, 0, 1) ** dens_pow
    w /= w.sum()
    idx = R.choice(len(tris), size=n, p=w)
    u = R.random(n)
    v = R.random(n)
    flip = u + v > 1
    u[flip], v[flip] = 1 - u[flip], 1 - v[flip]
    pa, pb, pc = a[idx], b[idx], c[idx]
    P = pa + (pb - pa) * u[:, None] + (pc - pa) * v[:, None]
    N = normalize(np.cross(pb - pa, pc - pa))
    return P, N


class Collider:
    def __init__(self, co, faces):
        self.bvh = BVHTree.FromPolygons([tuple(v) for v in co], [tuple(f) for f in faces], all_triangles=False)

    def push(self, P, offset, active=None, attract=None, attract_dist=0.03):
        """Push points out to at least `offset` above the surface (signed by
        normal).  Where `attract` is set, points further away are pulled back
        onto the offset surface (combed hair lying on the head)."""
        P = P.copy()
        hit = np.zeros(len(P), bool)
        ids = range(len(P)) if active is None else np.where(active)[0]
        for i in ids:
            q, nrm, _, dist = self.bvh.find_nearest(P[i], 0.08)
            if q is None:
                continue
            q = np.array(q)
            nrm = np.array(nrm)
            d = P[i] - q
            sd = d @ nrm
            off = offset[i] if np.ndim(offset) else offset
            if sd < off or (attract is not None and attract[i] and sd > off and dist < attract_dist):
                P[i] = q + nrm * off
                hit[i] = True
        return P, hit


def _to_local(Xh, P):
    return (P - Xh.t) @ Xh.R + Xh.pivot


def _dir_to_world(Xh, D):
    return D @ Xh.R.T


def grow_strands(roots, normals, flow_w, lengths, npts, layer, colliders, gravity, stiff,
                 bias_fn=None, lift=0.3, scalp_gain=0.09, max_layer=0.014, gfn=None, guard_fn=None):
    """March all strands together. colliders: list of (Collider, base_offset, use_layer)."""
    N = len(roots)
    pts = np.zeros((N, npts, 3))
    pts[:, 0] = roots
    d = normalize(flow_w + normals * lift)
    ds = lengths / (npts - 1)
    travel = np.zeros(N)
    g = np.array([0.0, 0.0, -1.0])
    p = roots.copy()
    for i in range(1, npts):
        s = i / (npts - 1)
        # gravity bending: weaker near root (stiffness)
        gk = gravity * (0.35 + 0.65 * smoothstep(0.0, 0.35, s))
        gv = g[None, :] if gfn is None else gfn(p, s)
        d = normalize(d + gv * (gk * ds)[:, None] * (1.0 / np.maximum(stiff, 1e-3))[:, None])
        if bias_fn is not None:
            b = bias_fn(p, s)
            d = normalize(d + b * ds[:, None])
        pn = p + d * ds[:, None]
        travel += ds
        for entry in colliders:
            col, base, use_layer = entry[:3]
            att = entry[3](pn, s) if len(entry) > 3 and entry[3] is not None else None
            off = base + (np.minimum(layer + scalp_gain * travel, max_layer) if use_layer else layer * 0.5)
            pn, hit = col.push(pn, off, attract=att)
        if guard_fn is not None:
            pn = guard_fn(pn)
        dn = pn - p
        d = normalize(dn)
        p = pn
        pts[:, i] = p
    return pts


def resample_uniform(pts, lengths):
    """Re-space each polyline to equal segment lengths with the target length."""
    N, M, _ = pts.shape
    seg = np.linalg.norm(np.diff(pts, axis=1), axis=2)
    cum = np.concatenate([np.zeros((N, 1)), np.cumsum(seg, 1)], 1)
    out = np.zeros_like(pts)
    for k in range(N):
        t = np.linspace(0, cum[k, -1], M)
        for c in range(3):
            out[k, :, c] = np.interp(t, cum[k], pts[k, :, c])
    return out


def strand_frames(pts):
    T = normalize(np.gradient(pts, axis=1))
    up = np.array([0.0, 0.0, 1.0])
    side = np.cross(T, up[None, None, :])
    bad = np.linalg.norm(side, axis=2) < 1e-3
    side[bad] = np.array([1.0, 0, 0])
    side = normalize(side)
    depth = normalize(np.cross(T, side))
    return T, side, depth


def clump(pts, roots, n_clumps, strength, seed=2, shape=0.9, exclude=None):
    """Pull strands toward clump-centre strands progressively toward the tips."""
    R = rng(seed)
    N, M, _ = pts.shape
    centers = R.choice(N, size=min(n_clumps, N), replace=False)
    from mathutils.kdtree import KDTree
    kd = KDTree(len(centers))
    for j, ci in enumerate(centers):
        kd.insert(roots[ci], j)
    kd.balance()
    owner = np.array([kd.find(r)[1] for r in roots])
    cpath = pts[centers]
    s = np.linspace(0, 1, M)
    prof = smoothstep(0.05, 1.0, s) ** shape
    st = strength[:, None, None] if np.ndim(strength) else strength
    target = cpath[owner]
    # keep a small per-strand offset so clumps do not collapse to a line
    jitter = R.normal(0, 0.0012, (N, 1, 3)) * (1 - prof[None, :, None])
    out = pts + (target - pts) * (prof[None, :, None] * st) + jitter * 0.0
    return out, owner, centers


def add_waves(pts, owner, amp, wavelength, start, seed=3, phase_scale=1.0):
    R = rng(seed)
    N, M, _ = pts.shape
    T, side, depth = strand_frames(pts)
    seg = np.linalg.norm(np.diff(pts, axis=1), axis=2)
    arc = np.concatenate([np.zeros((N, 1)), np.cumsum(seg, 1)], 1)
    L = arc[:, -1:]
    s = arc / np.maximum(L, 1e-6)
    n_own = owner.max() + 1
    ph = R.random(n_own) * 2 * np.pi
    wl = wavelength * (0.85 + 0.3 * R.random(n_own))
    a_cl = 0.75 + 0.5 * R.random(n_own)
    phase = ph[owner][:, None] + arc * (2 * np.pi / wl[owner][:, None]) + R.normal(0, 0.15, (N, 1)) * phase_scale
    A = amp * a_cl[owner][:, None] * smoothstep(start, start + 0.3, s)
    off = (np.cos(phase) * A)[..., None] * side + (np.sin(phase) * A * 0.55)[..., None] * depth
    return pts + off


def add_frizz(pts, amp, seed=4, flyaway_frac=0.03, flyaway_amp=0.012):
    R = rng(seed)
    N, M, _ = pts.shape
    s = np.linspace(0, 1, M)
    n1 = R.normal(0, 1, (N, M, 3))
    # smooth noise along strand
    for _ in range(3):
        n1[:, 1:-1] = 0.5 * n1[:, 1:-1] + 0.25 * (n1[:, :-2] + n1[:, 2:])
    out = pts + n1 * (amp * smoothstep(0.2, 1.0, s))[None, :, None]
    fly = R.random(N) < flyaway_frac
    if fly.any():
        k = fly.sum()
        dirn = R.normal(0, 1, (k, 3))
        dirn[:, 2] *= 0.25
        dirn = normalize(dirn)
        prof = smoothstep(0.45, 1.0, s) ** 1.5
        out[fly] += dirn[:, None, :] * (prof[None, :, None] * flyaway_amp * (0.5 + R.random((k, 1, 1))))
    return out


def smooth_strands(pts, iters=2, keep_root=2):
    p = pts.copy()
    for _ in range(iters):
        p[:, keep_root:-1] = 0.5 * p[:, keep_root:-1] + 0.25 * (p[:, keep_root - 1:-2] + p[:, keep_root + 1:])
    return p


# ----------------------------------------------------------------------------
# the hairstyle: centre-ish parting, see-through bangs, face-framing layers,
# long loose waves; right side falls in front of the shoulder, left side is
# tucked behind the ear and falls down the back.
# ----------------------------------------------------------------------------

DEFAULT_STYLE = dict(
    n_pool=21000, part_x=0.004,
    main_pts=32, bang_pts=14, side_pts=26,
    main_gravity=16.0, bang_gravity=14.0, side_gravity=14.0,
    main_clumps=700, bang_clumps=46, side_clumps=55,
    wave_amp=0.028, wave_len=0.095, wave_start=0.15,
    frizz=0.0007, flyaway_frac=0.035, flyaway_amp=0.016,
    r_root=0.000046, r_tip=0.000014, bang_r=0.000040,
    len_scale=1.0,
)


def _part_points(px):
    return np.array([[px, -0.125, 1.618], [px, -0.085, 1.645], [px, -0.04, 1.662], [px * 0.5, 0.0, 1.668],
                     [0.0, 0.035, 1.656]])


def _nearest_on_polyline(Q, poly):
    best = np.full(len(Q), 1e9)
    bp = np.zeros_like(Q)
    for a, b in zip(poly[:-1], poly[1:]):
        d = b - a
        t = np.clip(((Q - a) @ d) / (d @ d), 0, 1)
        p = a + t[:, None] * d
        dist = np.linalg.norm(Q - p, axis=1)
        m = dist < best
        best[m] = dist[m]
        bp[m] = p[m]
    return bp, best


def build_hairstyle(body_co, body_faces, scalp_mask, Xh, sweater_meshes, hairline_fn, params=None, log=print):
    P = dict(DEFAULT_STYLE)
    if params:
        P.update(params)
    R = rng(7)
    head_col = Collider(body_co, body_faces)
    sw_co = np.concatenate([m[0] for m in sweater_meshes])
    sw_f, off = [], 0
    for c, f in sweater_meshes:
        sw_f += [[i + off for i in ff] for ff in f]
        off += len(c)
    sw_col = Collider(sw_co, sw_f)

    roots, nrm = sample_roots(body_co, body_faces, scalp_mask, P['n_pool'], seed=5)
    q = _to_local(Xh, roots)
    qn = nrm @ Xh.R
    phi = np.arctan2(q[:, 0], -(q[:, 1] + 0.03))
    dz = q[:, 2] - hairline_fn(phi)
    px = P['part_x']
    bang = (np.abs(q[:, 0] - px) < 0.046) & (q[:, 1] < -0.072) & (dz < 0.036) & (q[:, 2] > 1.58)
    keep_b = R.random(len(q)) < 0.85
    drop_b = bang & ~keep_b
    bang &= keep_b
    side = (~bang) & (~drop_b) & (np.abs(phi) > 0.45) & (np.abs(phi) < 1.35) & (dz < 0.036) & (q[:, 1] < -0.03)
    # her left side is tucked behind the ear: only a few wisps stay in front
    side &= ~((q[:, 0] > px) & (R.random(len(q)) < 0.8))
    main = ~(bang | side | drop_b)
    groups = {}
    head_down = Xh.R @ np.array([0.0, 0.0, -1.0])

    def make_gfn(w_head_near, z_lo=1.40, z_hi=1.56):
        def gfn(p, s_):
            w = w_head_near * smoothstep(z_lo, z_hi, p[:, 2])
            g = w[:, None] * head_down[None, :] + (1 - w)[:, None] * np.array([0.0, 0.0, -1.0])[None, :]
            return normalize(g)
        return gfn

    FG_C = np.array([0.0, -0.120, 1.505])
    FG_R = np.array([0.064, 0.095, 0.088])

    def attract_upper(zcut):
        def f(p, s_):
            ql = _to_local(Xh, p)
            return (ql[:, 2] > zcut) & (s_ < 0.6)
        return f

    def attract_all(p, s_):
        return np.ones(len(p), bool)

    def face_guard(pn):
        """Keep the face clear: anything in front of the face (eyes..chin) is
        moved sideways out of an elliptical 'curtain' profile x_max(z)."""
        ql = _to_local(Xh, pn)
        zc = (ql[:, 2] - 1.500) / 0.088
        xmax = 0.066 * np.sqrt(np.clip(1.0 - zc ** 2, 0.0, 1.0)) + 0.004
        m = (ql[:, 1] < -0.072) & (np.abs(ql[:, 0]) < xmax) & (ql[:, 2] < 1.583) & (ql[:, 2] > 1.415)
        if m.any():
            sx = np.sign(ql[m, 0] + 1e-6)
            ql[m, 0] = sx * xmax[m] * 1.02
            pn = pn.copy()
            pn[m] = (ql[m] - Xh.pivot) @ Xh.R.T + Xh.t
        return pn

    # ---------------- main ----------------
    def flow_main(qq, qnn):
        c, _ = _nearest_on_polyline(qq, _part_points(px))
        f = qq - c
        f[:, 2] -= 0.02
        front_root = smoothstep(-0.06, -0.11, qq[:, 1])
        f[:, 1] += 0.05 * front_root          # sweep temple hair back, away from the face
        f = f - (f * qnn).sum(1, keepdims=True) * qnn
        return normalize(f)

    def make_bias(front_mask, tuck_mask):
        def bias(p, s):
            b = np.zeros_like(p)
            ql = _to_local(Xh, p)
            # tuck behind the left ear
            ear = (ql[:, 0] > 0.040) & (ql[:, 1] > -0.105) & (ql[:, 1] < 0.010) & (ql[:, 2] > 1.46) & (ql[:, 2] < 1.63)
            m = ear & tuck_mask
            if m.any():
                b[m] += _dir_to_world(Xh, np.tile([0.3, 5.0, -2.0], (m.sum(), 1)))
            # shoulder routing (world)
            k = 7.0 * smoothstep(1.50, 1.40, p[:, 2])
            b[:, 1] += np.where(front_mask, -k * 0.55, k * 0.6)
            # front strands fall over the chest, inside the raised arm
            med = front_mask & (p[:, 2] < 1.46)
            b[med, 0] += -np.sign(p[med, 0]) * 6.0 * smoothstep(1.46, 1.36, p[med, 2]) * smoothstep(0.085, 0.15, np.abs(p[med, 0]))
            # front strands of the right side: drift slightly outward/forward
            return b
        return bias

    idx = np.where(main)[0]
    rq = q[idx]
    flow_l = flow_main(rq, qn[idx])
    flow_w = _dir_to_world(Xh, flow_l)
    Lm = np.clip((rq[:, 2] - 1.12) * 1.28, 0.32, 0.62) * (0.94 + 0.12 * R.random(len(idx))) * P['len_scale']
    right = rq[:, 0] < -0.006
    front = right & (rq[:, 1] < 0.010)
    front |= (~right) & (rq[:, 1] < -0.055) & (R.random(len(idx)) < 0.30)
    tuck = (~right) & (rq[:, 1] < 0.02)
    layer = 0.0008 + 0.0024 * R.random(len(idx))
    log(f'hair: main {len(idx)} strands (front {front.sum()}, tuck {tuck.sum()})')
    pts = grow_strands(roots[idx], nrm[idx], flow_w, Lm, P['main_pts'], layer,
                       [(head_col, 0.0012, True, attract_upper(1.565)), (sw_col, 0.003, False)],
                       P['main_gravity'], np.ones(len(idx)), bias_fn=make_bias(front, tuck), lift=0.25,
                       scalp_gain=0.10, max_layer=0.020, gfn=make_gfn(0.45), guard_fn=face_guard)
    groups['main'] = dict(pts=pts, roots=roots[idx], L=Lm, front=front)

    # ---------------- face framing ----------------
    idx = np.where(side)[0]
    rq = q[idx]
    sgn = np.sign(rq[:, 0] - px)
    fl = np.stack([sgn * 0.35, 0.05 * np.ones(len(idx)), -1.0 * np.ones(len(idx))], 1)
    fl = normalize(fl - (fl * qn[idx]).sum(1, keepdims=True) * qn[idx])
    Ls = (0.24 + 0.14 * R.random(len(idx))) * P['len_scale']
    layer = 0.0015 + 0.002 * R.random(len(idx))
    fr = np.ones(len(idx), bool) & (sgn < 0)
    fr |= (sgn > 0) & (R.random(len(idx)) < 0.5)
    log(f'hair: face-framing {len(idx)} strands')
    pts = grow_strands(roots[idx], nrm[idx], _dir_to_world(Xh, fl), Ls, P['side_pts'], layer,
                       [(head_col, 0.0018, True), (sw_col, 0.003, False)],
                       P['side_gravity'], np.ones(len(idx)), bias_fn=make_bias(fr, np.zeros(len(idx), bool)), lift=0.3,
                       scalp_gain=0.06, max_layer=0.010, gfn=make_gfn(0.7, 1.35, 1.5), guard_fn=face_guard)
    groups['side'] = dict(pts=pts, roots=roots[idx], L=Ls, front=fr)

    # ---------------- bangs ----------------
    centre_gap = bang & (np.abs(q[:, 0] - px) < 0.012) & (R.random(len(q)) < 0.55)
    bang &= ~centre_gap
    idx = np.where(bang)[0]
    rq = q[idx]
    xs = rq[:, 0] - px
    fl = np.stack([np.sign(xs) * np.minimum(np.abs(xs) / 0.02, 1.0) * 0.42, -0.35 * np.ones(len(idx)), -1.0 * np.ones(len(idx))], 1)
    fl = normalize(fl - (fl * qn[idx]).sum(1, keepdims=True) * qn[idx])
    # length so that tips reach the brows (longer at the sides, a soft U)
    # tips end near the brows (z_local ~1.582); longer toward the sides (soft U)
    drop = rq[:, 2] - (1.584 - 0.006 * np.minimum(np.abs(xs) / 0.04, 1.0) ** 2)
    Lb = (drop * 1.30 + 0.022 + 0.006 * R.random(len(idx)) + 0.020 * np.minimum(np.abs(xs) / 0.04, 1.0) ** 2) * P['len_scale']
    Lb = np.clip(Lb, 0.035, 0.10)
    layer = 0.0012 + 0.0018 * R.random(len(idx))
    log(f'hair: bangs {len(idx)} strands')
    pts = grow_strands(roots[idx], nrm[idx], _dir_to_world(Xh, fl), Lb, P['bang_pts'], layer,
                       [(head_col, 0.0018, True, attract_all)], P['bang_gravity'], np.ones(len(idx)) * 0.8, lift=0.12,
                       scalp_gain=0.05, max_layer=0.005, gfn=make_gfn(0.85, 1.3, 1.45))
    groups['bangs'] = dict(pts=pts, roots=roots[idx], L=Lb, front=np.ones(len(idx), bool))

    # ---------------- styling passes ----------------
    out = {}
    for name, g in groups.items():
        pts = resample_uniform(g['pts'], g['L'])
        n = len(pts)
        if name == 'main':
            st = 0.55 + 0.30 * R.random(n)
            pts = smooth_strands(pts, 2)
            pts, owner, _ = clump(pts, g['roots'], P['main_clumps'], st, seed=11, shape=0.8)
            pts = add_waves(pts, owner, P['wave_amp'], P['wave_len'], P['wave_start'], seed=12)
            pts = add_frizz(pts, P['frizz'], seed=13, flyaway_frac=P['flyaway_frac'], flyaway_amp=P['flyaway_amp'])
        elif name == 'side':
            st = 0.5 + 0.3 * R.random(n)
            pts = smooth_strands(pts, 2)
            pts, owner, _ = clump(pts, g['roots'], P['side_clumps'], st, seed=21, shape=0.8)
            pts = add_waves(pts, owner, P['wave_amp'] * 0.8, P['wave_len'] * 0.9, 0.35, seed=22)
            pts = add_frizz(pts, P['frizz'] * 0.8, seed=23, flyaway_frac=0.04, flyaway_amp=0.008)
        else:
            st = 0.78 + 0.18 * R.random(n)
            pts, owner, _ = clump(pts, g['roots'], P['bang_clumps'], st, seed=31, shape=0.45)
            pts = add_waves(pts, owner, 0.0018, 0.05, 0.4, seed=32)
            pts = add_frizz(pts, 0.0003, seed=33, flyaway_frac=0.03, flyaway_amp=0.004)
        pts = smooth_strands(pts, 1)
        # final collision passes (keep roots fixed)
        M = pts.shape[1]
        flat = pts[:, 1:].reshape(-1, 3)
        for _ in range(2):
            flat, _ = head_col.push(flat, 0.0012)
            if name != 'bangs':
                act = flat[:, 2] < 1.52
                flat, _ = sw_col.push(flat, 0.0025, active=act)
                flat = face_guard(flat)
        pts[:, 1:] = flat.reshape(-1, M - 1, 3)
        pts = smooth_strands(pts, 1)
        out[name] = dict(pts=pts, owner=owner)
    return out


def make_curves_object(name, pts, r_root, r_tip, collection, taper_start=0.75, seed=0):
    import bpy
    R = rng(seed)
    N, M, _ = pts.shape
    cv = bpy.data.hair_curves.new(name)
    cv.add_curves([M] * N)
    cv.position_data.foreach_set('vector', pts.astype(np.float32).ravel())
    s = np.linspace(0, 1, M)
    prof = 1.0 - smoothstep(taper_start, 1.0, s) * (1 - r_tip / r_root)
    prof *= 1.0 - 0.25 * (1 - smoothstep(0.0, 0.05, s))      # thinner right at the root
    rr = (r_root * (0.85 + 0.3 * R.random((N, 1)))) * prof[None, :]
    if 'radius' in cv.attributes:
        rad = cv.attributes['radius']
    else:
        rad = cv.attributes.new('radius', 'FLOAT', 'POINT')
    rad.data.foreach_set('value', rr.astype(np.float32).ravel())
    ob = bpy.data.objects.new(name, cv)
    collection.objects.link(ob)
    return ob
