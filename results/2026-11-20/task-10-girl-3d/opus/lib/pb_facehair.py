"""Eyelashes and eyebrows as real curve strands (generated in the head rest
frame, then transformed rigidly with the head)."""
import math
import numpy as np
from pb_common import smoothstep, normalize, triangulate, vertex_normals, rng
from pb_hair import sample_roots, Collider


def ordered_rim(co, rim_ids, eye_c):
    rel = co[rim_ids] - eye_c
    ang = np.arctan2(rel[:, 2], rel[:, 0])
    o = np.argsort(ang)
    return np.array(rim_ids)[o], ang[o]


def _resample_closed(P, n):
    P2 = np.concatenate([P, P[:1]])
    seg = np.linalg.norm(np.diff(P2, axis=0), axis=1)
    cum = np.concatenate([[0], np.cumsum(seg)])
    t = np.linspace(0, cum[-1], n, endpoint=False)
    return np.stack([np.interp(t, cum, P2[:, k]) for k in range(3)], 1)


def eyelashes(co, rings_out, eye_c, side, n_upper=140, n_lower=60, seed=0):
    """Return (upper_pts, lower_pts) arrays (N,M,3) in the rest frame."""
    R = rng(seed + (0 if side > 0 else 100))
    rim = np.where(rings_out == 0)[0]
    ids, ang = ordered_rim(co, rim, eye_c)
    P = co[ids]
    rel = P - eye_c
    u = rel[:, 0] * side
    um, ul = u.min(), u.max()
    centre_v = np.median(rel[:, 2])
    res = []
    for upper, n in ((True, n_upper), (False, n_lower)):
        sel = (rel[:, 2] >= centre_v) if upper else (rel[:, 2] < centre_v)
        Q = P[sel]
        uq = rel[sel, 0] * side
        o = np.argsort(uq)
        Q, uq = Q[o], uq[o]
        # parametrise by arclength along the lid margin
        seg = np.linalg.norm(np.diff(Q, axis=0), axis=1)
        cum = np.concatenate([[0], np.cumsum(seg)])
        t = np.sort(R.random(n)) * cum[-1] * 0.94 + cum[-1] * 0.04
        roots = np.stack([np.interp(t, cum, Q[:, k]) for k in range(3)], 1)
        tn = t / cum[-1]                         # 0 medial -> 1 lateral
        M = 7
        pts = np.zeros((n, M, 3))
        for i in range(n):
            if upper:
                L = 0.0058 + 0.0042 * math.sin(math.pi * min(1.0, tn[i] * 0.85 + 0.12)) + 0.0006 * R.normal()
                L *= 0.65 + 0.35 * smoothstep(0.0, 0.25, tn[i])
                a0, a1 = math.radians(-22), math.radians(55 + 10 * R.random())
            else:
                L = 0.0022 + 0.0024 * math.sin(math.pi * min(1.0, tn[i] * 0.9 + 0.05)) + 0.0003 * R.normal()
                a0, a1 = math.radians(-35), math.radians(-60)
            splay = (tn[i] - 0.35) * (0.9 if upper else 0.6) + R.normal(0, 0.08)
            fwd = np.array([0.0, -1.0, 0.0])
            up = np.array([0.0, 0.0, 1.0])
            lat = np.array([side * 1.0, 0.0, 0.0])
            ss = np.linspace(0, 1, M)
            # integrate a curling direction
            p = roots[i].copy()
            pts[i, 0] = p
            for k in range(1, M):
                a = a0 + (a1 - a0) * (ss[k] ** 0.9)
                d = math.cos(a) * fwd + math.sin(a) * up
                d = normalize(d + lat * splay * 0.6)
                p = p + d * (L / (M - 1))
                pts[i, k] = p
        res.append(pts)
    return res[0], res[1]


def eyebrows(co, faces, brow_mask, side_sign_x, n=520, seed=0, brow_fn=None):
    """Brow hairs lying close to the skin, flowing medial-up -> lateral."""
    R = rng(seed)
    mask = brow_mask * (np.sign(co[:, 0]) == side_sign_x)
    roots, nrm = sample_roots(co, faces, mask, n, seed=seed + 3, dens_pow=1.0)
    col = Collider(co, faces)
    xa = np.abs(roots[:, 0])
    t = np.clip((xa - 0.010) / 0.047, 0, 1)
    zc, hh, _ = brow_fn(xa)
    vrel = np.clip((roots[:, 2] - zc) / np.maximum(hh, 1e-4), -1.5, 1.5)
    M = 5
    pts = np.zeros((n, M, 3))
    for i in range(n):
        nn = nrm[i]
        lat = np.array([side_sign_x, 0.0, 0.0])
        up = np.array([0.0, 0.0, 1.0])
        # medial head hairs point up, body/tail hairs point lateral, converging to centre line
        w_up = 1 - smoothstep(0.05, 0.28, t[i])
        d = up * (w_up * 1.0 + (1 - w_up) * (-0.35 * vrel[i] + 0.12)) + lat * (0.25 * w_up + (1 - w_up) * 1.0)
        d += R.normal(0, 0.12, 3)
        d = d - (d @ nn) * nn
        d = normalize(d)
        L = (0.0050 + 0.0030 * math.sin(math.pi * min(1.0, t[i] * 0.9 + 0.1))) * (0.85 + 0.3 * R.random())
        p = roots[i].copy()
        pts[i, 0] = p
        for k in range(1, M):
            lift = math.radians(18 * (1 - k / (M - 1)) + 2)
            dd = normalize(d * math.cos(lift) + nn * math.sin(lift))
            p = p + dd * (L / (M - 1))
            pts[i, k] = p
    flat = pts[:, 1:].reshape(-1, 3)
    flat, _ = col.push(flat, 0.00025)
    pts[:, 1:] = flat.reshape(n, M - 1, 3)
    return pts
