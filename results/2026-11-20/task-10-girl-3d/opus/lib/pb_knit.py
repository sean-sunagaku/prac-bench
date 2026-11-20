"""Procedural knit textures generated with numpy (stockinette + rib), packed
into the .blend.  Height maps drive bump; colour maps add yarn variation and
stitch-gap occlusion."""
import math
import numpy as np
import bpy


def _value_noise(shape, cells, rng):
    """Tileable smooth value noise."""
    h, w = shape
    g = rng.random((cells + 1, cells + 1))
    g[-1, :] = g[0, :]
    g[:, -1] = g[:, 0]
    y = np.linspace(0, cells, h, endpoint=False)
    x = np.linspace(0, cells, w, endpoint=False)
    yi, xi = np.floor(y).astype(int), np.floor(x).astype(int)
    fy, fx = y - yi, x - xi
    fy = fy * fy * (3 - 2 * fy)
    fx = fx * fx * (3 - 2 * fx)
    a = g[yi][:, xi]
    b = g[yi][:, xi + 1]
    c = g[yi + 1][:, xi]
    d = g[yi + 1][:, xi + 1]
    top = a + (b - a) * fx[None, :]
    bot = c + (d - c) * fx[None, :]
    return top + (bot - top) * fy[:, None]


def _stamp_leg(H, size, lx, ly, ang, a, b, twist_freq=9.0, twist_phase=0.0, s=1, twist_amt=0.18):
    """Max-composite one elliptical yarn leg into H (tileable, local window)."""
    R = int(math.ceil(max(a, b))) + 2
    xs = np.arange(int(lx) - R, int(lx) + R + 1)
    ys = np.arange(int(ly) - R, int(ly) + R + 1)
    X, Y = np.meshgrid(xs.astype(np.float64), ys.astype(np.float64))
    dx, dy = X - lx, Y - ly
    u = dx * math.cos(ang) + dy * math.sin(ang)
    v = -dx * math.sin(ang) + dy * math.cos(ang)
    r2 = (u / a) ** 2 + (v / b) ** 2
    bump = np.sqrt(np.clip(1 - r2, 0, 1))
    tw = 0.5 + 0.5 * np.sin((v / b) * twist_freq + (u / a) * 2.5 * s + twist_phase)
    hh = bump * (1 - twist_amt + twist_amt * tw)
    iy = ys % size
    ix = xs % size
    sub = H[np.ix_(iy, ix)]
    H[np.ix_(iy, ix)] = np.maximum(sub, hh)


def stockinette(size=1024, cols=8, rows=10, seed=3):
    """Height map of stockinette stitches (columns of V's)."""
    rng = np.random.default_rng(seed)
    H = np.zeros((size, size))
    cw = size / cols
    ch = size / rows
    for r in range(rows):
        for c in range(cols):
            cx = (c + 0.5) * cw + rng.normal(0, cw * 0.012)
            cy = (r + 0.5) * ch + rng.normal(0, ch * 0.012)
            for s in (-1, 1):
                _stamp_leg(H, size, cx + s * cw * 0.215, cy - ch * 0.02, math.radians(24) * s,
                           cw * 0.235 * (1 + rng.normal(0, 0.03)), ch * 0.66, 9.0, rng.random() * 6.28, s)
    fuzz = _value_noise((size, size), 128, rng) * 0.6 + _value_noise((size, size), 256, rng) * 0.4
    Hn = H * 0.9 + fuzz * 0.10
    return np.clip(Hn, 0, 1), H


def rib(size=512, cols=4, rows=6, seed=5):
    """2x2-ish rib: raised knit columns separated by recessed purl valleys."""
    rng = np.random.default_rng(seed)
    cw = size / cols
    ch = size / rows
    H = np.zeros((size, size))
    for r in range(rows):
        for c in range(cols):
            cx = (c + 0.5) * cw
            cy = (r + 0.5) * ch
            for s in (-1, 1):
                _stamp_leg(H, size, cx + s * cw * 0.14, cy, math.radians(20) * s, cw * 0.17, ch * 0.62,
                           8.0, rng.random() * 6.28, s)
    xx = np.arange(size)[None, :].astype(np.float64)
    colprof = 0.5 + 0.5 * np.cos((xx / cw) * 2 * math.pi)
    Hn = H * (0.55 + 0.45 * colprof) + _value_noise((size, size), 96, rng) * 0.08
    return np.clip(Hn, 0, 1)


def to_image(name, arr, colorspace='Non-Color'):
    h, w = arr.shape[:2]
    img = bpy.data.images.get(name)
    if img is not None:
        bpy.data.images.remove(img)
    img = bpy.data.images.new(name, w, h, alpha=False, float_buffer=False)
    img.colorspace_settings.name = colorspace      # must precede pixel upload
    if arr.ndim == 2:
        rgba = np.stack([arr, arr, arr, np.ones_like(arr)], -1)
    else:
        rgba = np.concatenate([arr, np.ones(arr.shape[:2] + (1,))], -1)
    img.pixels.foreach_set(rgba[::-1].astype(np.float32).ravel())
    img.update()
    img.pack()
    return img


def make_knit_images():
    h, h_raw = stockinette()
    r = rib()
    return to_image('KnitStockinette_Height', h), to_image('KnitRib_Height', r)
