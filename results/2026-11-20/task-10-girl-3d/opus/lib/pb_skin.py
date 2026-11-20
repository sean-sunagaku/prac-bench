"""Procedural skin colour painting (per-vertex) on the ORIGINAL hm08 head.

Masks are computed on the unsculpted mesh, where the measured landmark
positions are exact, and are then carried through sculpting/posing because
they are stored per vertex."""
import math
import numpy as np
from pb_common import smoothstep, gauss, falloff_ellip, srgb, triangulate, vertex_normals

SKIN_BASE = srgb(241, 206, 186)


def _lin(c):
    return np.array(srgb(*c)[:3])


def hairline_z(phi):
    """Hairline height as a function of azimuth (0 = front, +-pi = back)."""
    a = np.abs(phi)
    pts = np.array([[0.0, 1.623], [0.45, 1.612], [0.75, 1.592], [1.0, 1.574], [1.25, 1.545],
                    [1.45, 1.55], [1.75, 1.53], [2.2, 1.50], [2.7, 1.475], [math.pi, 1.465]])
    return np.interp(a, pts[:, 0], pts[:, 1])


def brow_curve(xa):
    """Brow centre-line z for |x| (original mesh), and half-height."""
    t = np.clip((xa - 0.010) / 0.047, 0, 1)
    z = 1.5752 + 0.0016 * np.sin(np.pi * np.clip(t * 0.95 + 0.02, 0, 1)) - 0.0030 * t ** 2
    hh = 0.0030 * (1 - t) + 0.0014 * t
    return z, hh, t


def paint_skin(co, faces):
    tris = triangulate(faces)
    vn = vertex_normals(co, tris)
    x, y, z = co[:, 0], co[:, 1], co[:, 2]
    xa = np.abs(x)
    n = len(co)
    col = np.tile(_lin((234, 174, 138)), (n, 1))

    def blend(mask, rgb, amt=1.0):
        nonlocal col
        m = np.clip(mask * amt, 0, 1)[:, None]
        col = col * (1 - m) + _lin(rgb)[None, :] * m

    # broad warm/cool variation
    face_front = smoothstep(-0.09, -0.13, y) * smoothstep(1.43, 1.46, z)
    neck = (1 - smoothstep(1.40, 1.45, z)) * smoothstep(1.2, 1.33, z)
    blend(neck, (232, 195, 176), 0.5)
    # cheeks blush
    blush = np.maximum(gauss(co, (0.043, -0.125, 1.508), (0.013, 0.02, 0.011)),
                       gauss(co, (-0.043, -0.125, 1.508), (0.013, 0.02, 0.011)))
    blend(blush * face_front, (236, 140, 136), 0.75)
    # nose tip / alae
    blend(gauss(co, (0.0, -0.165, 1.503), (0.011, 0.01, 0.008)), (234, 168, 156), 0.30)
    # chin & ears & forehead faint warmth
    blend(gauss(co, (0.0, -0.148, 1.442), (0.012, 0.01, 0.008)), (234, 172, 160), 0.18)
    ears = smoothstep(0.068, 0.078, xa) * smoothstep(1.49, 1.51, z) * (1 - smoothstep(1.59, 1.61, z))
    blend(ears, (236, 170, 158), 0.35)
    # eyelids: soft pink-brown, under-eye very slightly darker/warmer
    for s in (1, -1):
        E = np.array([0.0308 * s, -0.1245, 1.5452])
        upper = gauss(co, E + np.array([0.002 * s, -0.012, 0.0075]), (0.014, 0.012, 0.0045))
        blend(upper, (214, 160, 148), 0.35)
        lower = gauss(co, E + np.array([0.0, -0.015, -0.0085]), (0.013, 0.012, 0.0035))
        blend(lower, (226, 170, 156), 0.12)
        # outer corner shadow
        blend(gauss(co, E + np.array([0.014 * s, -0.008, 0.002]), (0.004, 0.008, 0.004)), (190, 130, 120), 0.25)

    # lips (vermilion) -- measured: corners x=+-0.0195, stomion z=1.4775,
    # upper border z~1.4862 (midline), lower border z~1.4665
    w_m = 0.0200
    xn = np.clip(xa / w_m, 0, 1.5)
    zm = 1.4775 + 0.0004 * xn ** 2
    ub = zm + 0.0093 * np.clip(1 - xn ** 2, 0, 1) ** 0.75 + 0.0006 * np.exp(-((xn - 0.27) / 0.12) ** 2) \
        - 0.0005 * np.exp(-(xn / 0.09) ** 2)
    lb = zm - 0.0105 * np.clip(1 - xn ** 2, 0, 1) ** 0.65
    soft = 0.0007
    upper_lip = smoothstep(zm - 0.003, zm, z) * (1 - smoothstep(ub - soft, ub + soft, z))
    lower_lip = smoothstep(lb - soft, lb + soft, z) * (1 - smoothstep(zm, zm + 0.003, z))
    lips = np.maximum(upper_lip, lower_lip) * (1 - smoothstep(0.95, 1.08, xn))
    lips *= smoothstep(-0.130, -0.142, y)
    mouth_in = (xa < 0.03) & (z > 1.452) & (z < 1.492) & (y > -0.150 + 0.010 * xn ** 2) & (vn[:, 1] > -0.2)
    lips = np.where(mouth_in, 1.0, lips)
    lip_col = (214, 96, 108)
    blend(lips, lip_col, 0.92)
    # slight darker lip line and inner mouth
    blend(mouth_in.astype(float), (150, 64, 66), 1.0)

    # nostril interiors (hm08 nostril cavities face backward/up): darker, so they read as openings
    nostril = (xa < 0.0165) & (z > 1.486) & (z < 1.507) & (y > -0.166) & (y < -0.136)
    inward = smoothstep(0.15, 0.6, vn[:, 1]) * nostril
    blend(inward, (118, 58, 54), 0.80)

    # eye sockets (conjunctiva) - pinkish red, wet
    socket = np.zeros(n)
    for s in (1, -1):
        E = np.array([0.0308 * s, -0.1245, 1.5452])
        rel = co - E
        d = np.linalg.norm(rel, axis=1)
        o = (vn * rel).sum(1) / np.maximum(d, 1e-9)
        socket = np.maximum(socket, ((d < 0.0205) & (o < 0.05)).astype(float))
        # caruncle at the medial canthus
        car = gauss(co, E + np.array([-0.0118 * s, -0.012, -0.0002]), (0.0022, 0.003, 0.0018))
        blend(car, (214, 120, 118), 0.85)
    blend(socket, (190, 96, 96), 0.9)

    # brows faint tint
    zb, hh, t = brow_curve(xa)
    brow = (1 - smoothstep(hh * 0.6, hh * 1.6, np.abs(z - zb))) * (xa > 0.008) * (xa < 0.060) \
        * smoothstep(-0.12, -0.14, y)
    brow *= 1 - smoothstep(0.85, 1.0, t) * 0.6
    blend(brow, (150, 104, 82), 0.28)

    # scalp under hair
    phi = np.arctan2(x, -(y + 0.03))
    hl = hairline_z(phi)
    scalp = smoothstep(hl - 0.002, hl + 0.006, z) * (1 - ears) * smoothstep(1.40, 1.44, z)
    blend(scalp, (92, 54, 34), 0.92)

    rgba = np.concatenate([col, np.ones((n, 1))], axis=1)
    masks = np.stack([lips, scalp, socket, np.ones(n)], axis=1)
    return rgba, masks, dict(brow=brow, scalp=scalp, lips=lips, socket=socket)
