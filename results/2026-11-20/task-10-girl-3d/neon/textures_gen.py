"""
textures_gen.py
Pure-NumPy procedural high-resolution texture generator (<=2048px) packed directly
into Blender images so character.blend reopens portably with zero external assets.
Calibrated for AgX photographic rendering & input/reference.png likeness:
  - Luminous fair warm peach-ivory skin with sculptural nose/cheek/jaw shading,
    rosy cheek & nose-tip blush, rich warm coral-rose glossy lips, crisp upper-lash
    tightline & parallel double-eyelid shading, soft powdery brow base, crisp ear
    concha depth, and softly feathered crown-part chestnut root blend!
  - Deep soulful warm chestnut-espresso radial fibrous iris with radiant amber-brown
    inner glow & dark limbal ring matching reference.png!
  - Soft fine-gauge dusty blush-pink stockinette V-stitch knit & soft 1x1 rib knit!
"""
import math
import os
import bpy
import numpy as np


def _smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0 + 1e-12), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def _value_noise_2d(h, w, scale_y, scale_x, seed=0):
    rng = np.random.default_rng(seed)
    grid = rng.random((scale_y, scale_x), dtype=np.float32)

    y = np.linspace(0.0, scale_y, h, endpoint=False, dtype=np.float32)
    x = np.linspace(0.0, scale_x, w, endpoint=False, dtype=np.float32)
    yi = np.floor(y).astype(np.int32) % scale_y
    xi = np.floor(x).astype(np.int32) % scale_x
    yi1 = (yi + 1) % scale_y
    xi1 = (xi + 1) % scale_x
    fy = y - np.floor(y)
    fx = x - np.floor(x)
    fy = fy * fy * (3.0 - 2.0 * fy)
    fx = fx * fx * (3.0 - 2.0 * fx)

    v00 = grid[yi[:, None], xi[None, :]]
    v01 = grid[yi[:, None], xi1[None, :]]
    v10 = grid[yi1[:, None], xi[None, :]]
    v11 = grid[yi1[:, None], xi1[None, :]]

    top = v00 * (1.0 - fx[None, :]) + v01 * fx[None, :]
    bot = v10 * (1.0 - fx[None, :]) + v11 * fx[None, :]
    return top * (1.0 - fy[:, None]) + bot * fy[:, None]


def _fbm_2d(h, w, base_scale=8, octaves=4, seed=42):
    out = np.zeros((h, w), dtype=np.float32)
    amp = 1.0
    norm = 0.0
    sc = base_scale
    for i in range(octaves):
        out += amp * _value_noise_2d(h, w, sc, sc, seed=seed + i * 31)
        norm += amp
        amp *= 0.5
        sc = min(sc * 2, h // 2)
    return out / norm


def _make_blender_image(name, rgba_array, colorspace="sRGB", save_dir="textures"):
    h, w, _ = rgba_array.shape
    os.makedirs(save_dir, exist_ok=True)
    if name in bpy.data.images:
        bpy.data.images.remove(bpy.data.images[name])
    img = bpy.data.images.new(name=name, width=w, height=h, alpha=True, float_buffer=False)
    # CRITICAL in Blender 5.1: set colorspace BEFORE writing pixels so buffer is not cleared!
    img.colorspace_settings.name = colorspace
    img.pixels.foreach_set(np.clip(rgba_array, 0.0, 1.0).astype(np.float32).ravel())
    img.update()
    filepath = os.path.abspath(os.path.join(save_dir, f"{name}.png"))
    img.filepath_raw = filepath
    img.file_format = "PNG"
    img.save()
    img.pack()
    return img


def _rasterize_rest_coords_to_uv(body_obj, rest_pts, size=1024):
    me = body_obj.data
    uv_layer = me.uv_layers.active.data

    pos_map = np.zeros((size, size, 3), dtype=np.float32)
    valid = np.zeros((size, size), dtype=np.bool_)

    for poly in me.polygons:
        l_idx = list(poly.loop_indices)
        uvs = [uv_layer[li].uv for li in l_idx]
        p3s = [rest_pts[me.loops[li].vertex_index] for li in l_idx]
        tris = [(0, i, i + 1) for i in range(1, len(l_idx) - 1)]
        for i0, i1, i2 in tris:
            u0, v0 = uvs[i0][0] * (size - 1), uvs[i0][1] * (size - 1)
            u1, v1 = uvs[i1][0] * (size - 1), uvs[i1][1] * (size - 1)
            u2, v2 = uvs[i2][0] * (size - 1), uvs[i2][1] * (size - 1)

            xmin = max(0, int(math.floor(min(u0, u1, u2))))
            xmax = min(size - 1, int(math.ceil(max(u0, u1, u2))))
            ymin = max(0, int(math.floor(min(v0, v1, v2))))
            ymax = min(size - 1, int(math.ceil(max(v0, v1, v2))))
            if xmin > xmax or ymin > ymax:
                continue

            denom = (v1 - v2) * (u0 - u2) + (u2 - u1) * (v0 - v2)
            if abs(denom) < 1e-8:
                continue
            inv_d = 1.0 / denom

            xs = np.arange(xmin, xmax + 1, dtype=np.float32)[None, :]
            ys = np.arange(ymin, ymax + 1, dtype=np.float32)[:, None]

            w0 = ((v1 - v2) * (xs - u2) + (u2 - u1) * (ys - v2)) * inv_d
            w1 = ((v2 - v0) * (xs - u2) + (u0 - u2) * (ys - v2)) * inv_d
            w2 = 1.0 - w0 - w1

            inside = (w0 >= -1e-4) & (w1 >= -1e-4) & (w2 >= -1e-4)
            if not np.any(inside):
                continue

            sub_pos = pos_map[ymin:ymax + 1, xmin:xmax + 1]
            sub_val = valid[ymin:ymax + 1, xmin:xmax + 1]
            p0, p1, p2 = p3s[i0], p3s[i1], p3s[i2]
            interp = (
                w0[..., None] * p0[None, None, :]
                + w1[..., None] * p1[None, None, :]
                + w2[..., None] * p2[None, None, :]
            )
            sub_pos[inside] = interp[inside]
            sub_val[inside] = True

    cur_pos = pos_map.copy()
    cur_val = valid.copy()
    for _ in range(14):
        if np.all(cur_val):
            break
        inv = ~cur_val
        acc = np.zeros_like(cur_pos)
        cnt = np.zeros((size, size), dtype=np.float32)
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (-1, 1), (1, -1)):
            sy0 = max(0, -dy)
            sy1 = size - max(0, dy)
            sx0 = max(0, -dx)
            sx1 = size - max(0, dx)
            dy0 = max(0, dy)
            dy1 = size - max(0, -dy)
            dx0 = max(0, dx)
            dx1 = size - max(0, -dx)
            m = cur_val[sy0:sy1, sx0:sx1]
            acc[dy0:dy1, dx0:dx1] += cur_pos[sy0:sy1, sx0:sx1] * m[..., None]
            cnt[dy0:dy1, dx0:dx1] += m
        fill = inv & (cnt > 0)
        cur_pos[fill] = acc[fill] / cnt[fill, None]
        cur_val[fill] = True

    return cur_pos


def generate_skin_textures(body_obj, rest_pts, size=2048):
    pos_low = _rasterize_rest_coords_to_uv(body_obj, rest_pts, size=1024)
    if size == 2048:
        pos = np.empty((2048, 2048, 3), dtype=np.float32)
        pos[0::2, 0::2] = pos_low
        pos[0::2, 1::2] = 0.5 * (pos_low + np.roll(pos_low, -1, axis=1))
        pos[1::2, 0::2] = 0.5 * (pos_low + np.roll(pos_low, -1, axis=0))
        pos[1::2, 1::2] = 0.25 * (
            pos_low + np.roll(pos_low, -1, axis=1)
            + np.roll(pos_low, -1, axis=0)
            + np.roll(np.roll(pos_low, -1, axis=0), -1, axis=1)
        )
    else:
        pos = pos_low

    X = pos[..., 0]
    Y = pos[..., 1]
    Z = pos[..., 2]
    AX = np.abs(X)

    n_macro = _fbm_2d(size, size, base_scale=12, octaves=4, seed=101)
    n_mid = _fbm_2d(size, size, base_scale=48, octaves=3, seed=202)
    n_pores = _value_noise_2d(size, size, 320, 320, seed=303) * 0.6 + _value_noise_2d(size, size, 640, 640, seed=404) * 0.4

    # Fair warm luminous peach-ivory skin (calibrated for AgX so sculptural planes stay creamy & rich, NEVER chalk white!)
    r = np.full((size, size), 0.748, dtype=np.float32)
    g = np.full((size, size), 0.578, dtype=np.float32)
    b = np.full((size, size), 0.490, dtype=np.float32)

    r += (n_macro - 0.5) * 0.026 + (n_mid - 0.5) * 0.015
    g += (n_macro - 0.5) * 0.028 + (n_mid - 0.5) * 0.016
    b += (n_macro - 0.5) * 0.028 + (n_mid - 0.5) * 0.014

    front_face = _smoothstep(-0.100, -0.128, Y)

    # Soft diffused rosy-peach cheek blush (signature warm glow in reference.png!)
    cheek_blush = np.exp(
        -0.5 * (((AX - 0.036) / 0.024) ** 2 + ((Z - 1.516) / 0.020) ** 2 + ((Y + 0.134) / 0.024) ** 2)
    ) * front_face
    r = r * (1.0 - 0.42 * cheek_blush) + 0.815 * (0.42 * cheek_blush)
    g = g * (1.0 - 0.42 * cheek_blush) + 0.450 * (0.42 * cheek_blush)
    b = b * (1.0 - 0.42 * cheek_blush) + 0.405 * (0.42 * cheek_blush)

    # Delicate natural nose-bridge & alar crease modeling (gives real 3D nose definition!)
    nose_side = np.exp(-0.5 * (((AX - 0.0112) / 0.0052) ** 2 + ((Z - 1.525) / 0.014) ** 2 + ((Y + 0.153) / 0.010) ** 2))
    r *= (1.0 - 0.10 * nose_side)
    g *= (1.0 - 0.125 * nose_side)
    b *= (1.0 - 0.135 * nose_side)

    # Subtle alar groove around nose wings & under-nose philtrum shadow
    alar_groove = np.exp(-0.5 * (((AX - 0.0155) / 0.0038) ** 2 + ((Z - 1.510) / 0.0045) ** 2 + ((Y + 0.151) / 0.008) ** 2))
    r *= (1.0 - 0.14 * alar_groove)
    g *= (1.0 - 0.18 * alar_groove)
    b *= (1.0 - 0.18 * alar_groove)

    under_lip_sh = np.exp(-0.5 * ((AX / 0.014) ** 2 + ((Z - 1.466) / 0.0055) ** 2 + ((Y + 0.150) / 0.012) ** 2))
    r *= (1.0 - 0.12 * under_lip_sh)
    g *= (1.0 - 0.15 * under_lip_sh)
    b *= (1.0 - 0.15 * under_lip_sh)

    # Subtle warm rose hint on nose tip
    nose_blush = np.exp(-0.5 * ((AX / 0.012) ** 2 + ((Z - 1.513) / 0.009) ** 2 + ((Y + 0.160) / 0.014) ** 2))
    r = r * (1.0 - 0.28 * nose_blush) + 0.805 * (0.28 * nose_blush)
    g = g * (1.0 - 0.28 * nose_blush) + 0.485 * (0.28 * nose_blush)
    b = b * (1.0 - 0.28 * nose_blush) + 0.435 * (0.28 * nose_blush)

    # Delicate warm peach-terracotta eyelid & under-eye vascular depth
    lid_tint = np.exp(-0.5 * (((AX - 0.032) / 0.0165) ** 2 + ((Z - 1.550) / 0.0095) ** 2 + ((Y + 0.140) / 0.012) ** 2)) * front_face
    r = r * (1.0 - 0.34 * lid_tint) + 0.695 * (0.34 * lid_tint)
    g = g * (1.0 - 0.34 * lid_tint) + 0.465 * (0.34 * lid_tint)
    b = b * (1.0 - 0.34 * lid_tint) + 0.405 * (0.34 * lid_tint)

    # Crisp dark espresso-brown upper lash-line tightline (aligned to sculpted upper lid margin z~1.5518!)
    up_lash_arc_z = 1.5518 - 15.5 * (AX - 0.0315) ** 2
    up_liner = np.exp(
        -0.5 * (((Z - up_lash_arc_z) / 0.0016) ** 2 + ((AX - 0.0322) / 0.0128) ** 2 + ((Y + 0.140) / 0.008) ** 2)
    ) * _smoothstep(-0.131, -0.137, Y)
    r = r * (1.0 - 0.84 * up_liner) + 0.13 * (0.84 * up_liner)
    g = g * (1.0 - 0.84 * up_liner) + 0.075 * (0.84 * up_liner)
    b = b * (1.0 - 0.84 * up_liner) + 0.060 * (0.84 * up_liner)

    # Soft outer-half lower lash-line accent (warm natural framing like reference.png!)
    lo_lash_arc_z = 1.5404 + 13.0 * (AX - 0.0320) ** 2
    lo_liner = np.exp(
        -0.5 * (((Z - lo_lash_arc_z) / 0.00145) ** 2 + ((AX - 0.0365) / 0.0095) ** 2 + ((Y + 0.140) / 0.008) ** 2)
    ) * _smoothstep(-0.131, -0.137, Y)
    r = r * (1.0 - 0.38 * lo_liner) + 0.32 * (0.38 * lo_liner)
    g = g * (1.0 - 0.38 * lo_liner) + 0.21 * (0.38 * lo_liner)
    b = b * (1.0 - 0.38 * lo_liner) + 0.18 * (0.38 * lo_liner)

    # Clean parallel double-eyelid crease shadow (futae at z~1.5548!)
    crease_z = 1.5548 - 15.5 * (AX - 0.0318) ** 2
    crease_sh = np.exp(
        -0.5 * (((Z - crease_z) / 0.00135) ** 2 + ((AX - 0.0322) / 0.0120) ** 2 + ((Y + 0.139) / 0.008) ** 2)
    ) * _smoothstep(-0.131, -0.137, Y)
    r = r * (1.0 - 0.42 * crease_sh) + 0.38 * (0.42 * crease_sh)
    g = g * (1.0 - 0.42 * crease_sh) + 0.25 * (0.42 * crease_sh)
    b = b * (1.0 - 0.42 * crease_sh) + 0.21 * (0.42 * crease_sh)

    # Soft shadow beneath youthful aegyo-sal cushion
    under_aegyo_z = 1.5338 + 11.5 * (AX - 0.0318) ** 2
    aegyo_sh = np.exp(
        -0.5 * (((Z - under_aegyo_z) / 0.0018) ** 2 + ((AX - 0.0318) / 0.0110) ** 2 + ((Y + 0.140) / 0.009) ** 2)
    ) * _smoothstep(-0.132, -0.138, Y)
    r = r * (1.0 - 0.24 * aegyo_sh) + 0.52 * (0.24 * aegyo_sh)
    g = g * (1.0 - 0.24 * aegyo_sh) + 0.36 * (0.24 * aegyo_sh)
    b = b * (1.0 - 0.24 * aegyo_sh) + 0.32 * (0.24 * aegyo_sh)

    inner_socket = _smoothstep(-0.136, -0.126, Y) * np.exp(
        -0.5 * (((AX - 0.0312) / 0.0155) ** 2 + ((Z - 1.5458) / 0.0128) ** 2)
    )
    r = r * (1.0 - 0.52 * inner_socket) + 0.44 * (0.52 * inner_socket)
    g = g * (1.0 - 0.52 * inner_socket) + 0.23 * (0.52 * inner_socket)
    b = b * (1.0 - 0.52 * inner_socket) + 0.21 * (0.52 * inner_socket)

    # Soft powdery warm-brown eyebrow base (spanning smoothly from ax=0.0105 to 0.0525 -> NO awkward wide gap!)
    u_br = np.clip((AX - 0.0105) / 0.0420, 0.0, 1.0)
    brow_z = 1.5624 + 0.0016 * np.sin(u_br * math.pi * 0.85) - 0.0024 * (np.clip((u_br - 0.65) / 0.35, 0.0, 1.0) ** 1.4)
    brow_h = 0.0028 * (1.0 - 0.52 * (u_br ** 1.5)) + 0.0007
    brow_x_fade = _smoothstep(0.0085, 0.0155, AX) * (1.0 - _smoothstep(0.0465, 0.0545, AX))
    brow_base = np.exp(-0.5 * (((Z - brow_z) / brow_h) ** 2 + ((Y + 0.145) / 0.018) ** 2)) * brow_x_fade * front_face
    r = r * (1.0 - 0.38 * brow_base) + 0.34 * (0.38 * brow_base)
    g = g * (1.0 - 0.38 * brow_base) + 0.23 * (0.38 * brow_base)
    b = b * (1.0 - 0.38 * brow_base) + 0.18 * (0.38 * brow_base)

    # LIPS: rich, warm, glossy coral-rose lips matching input/reference.png!
    lip_mid_z = 1.4822 + 0.0040 * (_smoothstep(0.006, 0.0265, AX) ** 1.35)
    cupid_m = 0.0010 * np.exp(-0.5 * ((AX - 0.0056) / 0.0038) ** 2) - 0.0006 * np.exp(-0.5 * (AX / 0.0028) ** 2)
    up_lip_h = (0.0058 + cupid_m) * (np.clip(1.0 - (AX / 0.0272) ** 2.1, 0.0, 1.0) ** 0.55)
    lo_lip_h = 0.0084 * (np.clip(1.0 - (AX / 0.0262) ** 2.0, 0.0, 1.0) ** 0.58)

    dz_lip = Z - lip_mid_z
    in_up = _smoothstep(-0.0010, 0.0009, dz_lip) * (1.0 - _smoothstep(up_lip_h * 0.62, up_lip_h * 1.18 + 0.0012, dz_lip))
    in_lo = _smoothstep(-0.0010, 0.0009, -dz_lip) * (1.0 - _smoothstep(lo_lip_h * 0.62, lo_lip_h * 1.18 + 0.0012, -dz_lip))
    lip_x_mask = (1.0 - _smoothstep(0.0230, 0.0282, AX)) * _smoothstep(-0.136, -0.147, Y)
    lip_mask = np.clip(in_up + in_lo, 0.0, 1.0) * lip_x_mask

    # Rich warm coral-rose tint (clearly pops warmly & naturally against fair skin like reference.png!)
    lip_core = np.exp(-0.5 * ((dz_lip / 0.0040) ** 2 + (AX / 0.018) ** 2)) * lip_mask
    lip_r = 0.745 - 0.045 * lip_core
    lip_g = 0.305 - 0.075 * lip_core
    lip_b = 0.295 - 0.075 * lip_core
    r = r * (1.0 - 0.88 * lip_mask) + lip_r * (0.88 * lip_mask)
    g = g * (1.0 - 0.88 * lip_mask) + lip_g * (0.88 * lip_mask)
    b = b * (1.0 - 0.88 * lip_mask) + lip_b * (0.88 * lip_mask)

    lip_seam = np.exp(-0.5 * ((dz_lip / 0.00105) ** 2)) * (1.0 - _smoothstep(0.0225, 0.0280, AX)) * _smoothstep(-0.137, -0.145, Y)
    r = r * (1.0 - 0.52 * lip_seam) + 0.32 * (0.52 * lip_seam)
    g = g * (1.0 - 0.52 * lip_seam) + 0.12 * (0.52 * lip_seam)
    b = b * (1.0 - 0.52 * lip_seam) + 0.12 * (0.52 * lip_seam)

    # Subtle nostril shadows
    nostril_w = np.exp(
        -0.5 * (((AX - 0.0066) / 0.0033) ** 2 + ((Z - 1.5065) / 0.0026) ** 2 + ((Y + 0.1545) / 0.0046) ** 2)
    )
    r = r * (1.0 - 0.72 * nostril_w) + 0.22 * (0.72 * nostril_w)
    g = g * (1.0 - 0.72 * nostril_w) + 0.12 * (0.72 * nostril_w)
    b = b * (1.0 - 0.72 * nostril_w) + 0.10 * (0.72 * nostril_w)

    # EARS: warm translucent rose outer helix + crisp realistic concha & scapha depth!
    ear_mask = _smoothstep(0.065, 0.075, AX) * _smoothstep(1.498, 1.516, Z) * (1.0 - _smoothstep(1.568, 1.582, Z))
    r = r * (1.0 - 0.28 * ear_mask) + 0.80 * (0.28 * ear_mask)
    g = g * (1.0 - 0.28 * ear_mask) + 0.49 * (0.28 * ear_mask)
    b = b * (1.0 - 0.28 * ear_mask) + 0.44 * (0.28 * ear_mask)
    ear_concha = np.exp(-0.5 * (((AX - 0.0745) / 0.0062) ** 2 + ((Y + 0.060) / 0.010) ** 2 + ((Z - 1.534) / 0.012) ** 2))
    ear_fossa = np.exp(-0.5 * (((AX - 0.0765) / 0.0055) ** 2 + ((Y + 0.056) / 0.009) ** 2 + ((Z - 1.552) / 0.008) ** 2))
    ear_occ = np.clip(ear_concha + 0.65 * ear_fossa, 0.0, 1.0)
    r *= (1.0 - 0.30 * ear_occ)
    g *= (1.0 - 0.36 * ear_occ)
    b *= (1.0 - 0.36 * ear_occ)

    # Cleanly tucked chestnut scalp-root tint (strictly behind temples & above forehead -> ZERO temple dark band!)
    scalp_mask = (
        _smoothstep(1.628, 1.644, Z) * _smoothstep(-0.125, -0.095, Y)
        + _smoothstep(-0.042, -0.012, Y) * _smoothstep(1.478, 1.505, Z) * (1.0 - ear_mask)
        + _smoothstep(1.615, 1.635, Z) * _smoothstep(-0.065, -0.035, Y)
    )
    scalp_mask = np.clip(scalp_mask, 0.0, 1.0) * (1.0 - ear_mask)
    r = r * (1.0 - 0.86 * scalp_mask) + 0.10 * (0.86 * scalp_mask)
    g = g * (1.0 - 0.86 * scalp_mask) + 0.052 * (0.86 * scalp_mask)
    b = b * (1.0 - 0.86 * scalp_mask) + 0.038 * (0.86 * scalp_mask)

    albedo_rgba = np.stack([r, g, b, np.ones_like(r)], axis=-1)
    img_albedo = _make_blender_image("Skin_Albedo", albedo_rgba, colorspace="sRGB")

    # Localized skin roughness (velvety cheeks, healthy glossy lip sheen!)
    rough = np.full((size, size), 0.45, dtype=np.float32)
    t_zone = (
        np.exp(-0.5 * ((AX / 0.014) ** 2 + ((Z - 1.518) / 0.022) ** 2 + ((Y + 0.158) / 0.020) ** 2))
        + 0.60 * np.exp(-0.5 * (((AX - 0.036) / 0.022) ** 2 + ((Z - 1.522) / 0.016) ** 2 + ((Y + 0.136) / 0.020) ** 2))
        + 0.45 * np.exp(-0.5 * ((AX / 0.030) ** 2 + ((Z - 1.585) / 0.020) ** 2 + ((Y + 0.148) / 0.020) ** 2))
    )
    t_zone = np.clip(t_zone, 0.0, 1.0)
    rough -= 0.075 * t_zone
    rough = rough * (1.0 - lip_mask) + 0.19 * lip_mask
    rough += 0.04 * (1.0 - _smoothstep(1.40, 1.44, Z))
    rough += (n_pores - 0.5) * 0.045
    rough = np.clip(rough, 0.16, 0.66)
    img_rough = _make_blender_image("Skin_Roughness", np.stack([rough, rough, rough, np.ones_like(rough)], axis=-1), colorspace="Non-Color")

    bump = 0.5 + (n_pores - 0.5) * 0.22 + (n_mid - 0.5) * 0.07
    lip_grooves = np.sin(X * 2600.0 + n_mid * 4.0) * 0.5 * lip_mask
    bump = bump * (1.0 - 0.55 * lip_mask) + (0.5 + 0.15 * lip_grooves) * (0.55 * lip_mask)
    bump = np.clip(bump, 0.0, 1.0)
    img_bump = _make_blender_image("Skin_Bump", np.stack([bump, bump, bump, np.ones_like(bump)], axis=-1), colorspace="Non-Color")

    sss = np.full((size, size), 0.72, dtype=np.float32)
    sss += 0.28 * ear_mask + 0.20 * nose_blush + 0.16 * cheek_blush + 0.14 * lip_mask
    sss -= 0.30 * scalp_mask
    sss = np.clip(sss, 0.25, 1.0)
    img_sss = _make_blender_image("Skin_SSS", np.stack([sss, sss, sss, np.ones_like(sss)], axis=-1), colorspace="Non-Color")

    return {"albedo": img_albedo, "roughness": img_rough, "bump": img_bump, "sss": img_sss}


def generate_eye_texture(size=1024):
    """Deep, soulful warm dark-chestnut East Asian iris with radiant warm-amber inner fibers & dark limbal ring."""
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    u = (xx / (size - 1)) - 0.5
    v = (yy / (size - 1)) - 0.5
    rad = np.sqrt(u * u + v * v)
    ang = np.arctan2(v, u)
    r_ir = rad / 0.25

    fibers = np.zeros_like(rad)
    rng = np.random.default_rng(777)
    for freq in (19, 37, 61, 97, 149):
        phase = rng.uniform(0, 2 * math.pi)
        amp = 1.0 / math.sqrt(freq)
        fibers += amp * np.sin(ang * freq + phase + 2.2 * np.sin(r_ir * 7.0 + phase))
    fibers = (fibers - fibers.min()) / (fibers.max() - fibers.min() + 1e-8)

    n_crypt = _fbm_2d(size, size, base_scale=16, octaves=4, seed=515)

    # Rich, soulful pupil + deep warm chestnut-chocolate iris + dark espresso limbal ring (matching reference.png!)
    pupil_m = 1.0 - _smoothstep(0.395, 0.450, r_ir)
    collarette = np.exp(-0.5 * ((r_ir - 0.56) / 0.17) ** 2)
    limbal = _smoothstep(0.74, 0.93, r_ir) * (1.0 - _smoothstep(0.99, 1.07, r_ir))

    # Calibrated deep soulful warm chestnut brown (rich warm chocolate-brown matching reference.png!)
    ir_r = 0.140 + 0.090 * collarette + 0.052 * (fibers - 0.5) + 0.020 * (n_crypt - 0.5)
    ir_g = 0.068 + 0.046 * collarette + 0.028 * (fibers - 0.5) + 0.012 * (n_crypt - 0.5)
    ir_b = 0.036 + 0.022 * collarette + 0.014 * (fibers - 0.5) + 0.007 * (n_crypt - 0.5)

    ir_r = ir_r * (1.0 - 0.78 * limbal) + 0.024 * (0.78 * limbal)
    ir_g = ir_g * (1.0 - 0.78 * limbal) + 0.013 * (0.78 * limbal)
    ir_b = ir_b * (1.0 - 0.78 * limbal) + 0.010 * (0.78 * limbal)

    ir_r *= (1.0 - pupil_m)
    ir_g *= (1.0 - pupil_m)
    ir_b *= (1.0 - pupil_m)

    sclera_m = _smoothstep(0.975, 1.060, r_ir)
    outer_pink = _smoothstep(1.22, 1.85, r_ir)
    veins = _smoothstep(0.68, 0.88, _fbm_2d(size, size, base_scale=24, octaves=3, seed=616)) * outer_pink * 0.22

    sc_r = 0.825 - 0.02 * (n_crypt - 0.5) - 0.02 * outer_pink + 0.025 * veins
    sc_g = 0.795 - 0.02 * (n_crypt - 0.5) - 0.07 * outer_pink - 0.08 * veins
    sc_b = 0.775 - 0.02 * (n_crypt - 0.5) - 0.08 * outer_pink - 0.09 * veins

    r = ir_r * (1.0 - sclera_m) + sc_r * sclera_m
    g = ir_g * (1.0 - sclera_m) + sc_g * sclera_m
    b = ir_b * (1.0 - sclera_m) + sc_b * sclera_m

    rgba = np.stack([np.clip(r, 0, 1), np.clip(g, 0, 1), np.clip(b, 0, 1), np.ones_like(r)], axis=-1)
    return _make_blender_image("Eye_Iris_Sclera", rgba, colorspace="sRGB")


def _height_to_normal(height, strength=3.0):
    dx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * 0.5 * strength
    dy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * 0.5 * strength
    nx = -dx
    ny = -dy
    nz = np.ones_like(height)
    inv_l = 1.0 / np.sqrt(nx * nx + ny * ny + nz * nz + 1e-8)
    nx = nx * inv_l * 0.5 + 0.5
    ny = ny * inv_l * 0.5 + 0.5
    nz = nz * inv_l * 0.5 + 0.5
    return np.stack([nx, ny, nz, np.ones_like(nx)], axis=-1)


def generate_knit_textures(size=1024):
    """Authentic fine-gauge dusty blush-pink stockinette V-stitch knit & soft 1x1 rib knit."""
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    u = xx / size
    v = yy / size

    cols = 24.0
    rows = 30.0
    cu = (u * cols) % 1.0
    cv = (v * rows) % 1.0

    jitter = _fbm_2d(size, size, base_scale=16, octaves=3, seed=808) - 0.5
    cu_j = (cu + 0.030 * jitter) % 1.0
    cv_j = (cv + 0.030 * jitter) % 1.0

    def leg_profile(cu_val, cv_val, side):
        cx = 0.5 + side * (0.145 + 0.140 * cv_val - 0.042 * np.sin(math.pi * cv_val))
        dx = cu_val - cx
        half_w = 0.195
        tube = np.sqrt(np.clip(1.0 - (dx / half_w) ** 2, 0.0, 1.0))
        arch = 0.58 + 0.42 * np.sin(math.pi * (0.06 + 0.88 * cv_val))
        ply_phase = (cv_val * 4.5 + side * dx * 8.0) * 2.0 * math.pi
        ply = 0.92 + 0.08 * np.sin(ply_phase)
        return tube * arch * ply

    h_left = leg_profile(cu_j, cv_j, -1.0)
    h_right = leg_profile(cu_j, cv_j, +1.0)
    h_left_prev = leg_profile(cu_j, (cv_j + 0.5) % 1.0, -1.0) * 0.45
    h_right_prev = leg_profile(cu_j, (cv_j + 0.5) % 1.0, +1.0) * 0.45
    backing = 0.28 + 0.10 * np.cos(2.0 * math.pi * cv_j) * np.cos(2.0 * math.pi * cu_j)

    knit_h = np.maximum(np.maximum(h_left, h_right), np.maximum(backing, np.maximum(h_left_prev, h_right_prev)))
    wool_grain = _value_noise_2d(size, size, 256, 256, seed=909) * 0.55 + _value_noise_2d(size, size, 512, 512, seed=910) * 0.45
    knit_h = np.clip(knit_h * 0.88 + wool_grain * 0.12, 0.0, 1.0)

    heather = _fbm_2d(size, size, base_scale=32, octaves=4, seed=911)
    heather_fine = _value_noise_2d(size, size, 256, 256, seed=912)
    ao = 0.72 + 0.28 * _smoothstep(0.20, 0.85, knit_h)

    base_r = 0.840 + (heather - 0.5) * 0.055 + (heather_fine - 0.5) * 0.045
    base_g = 0.600 + (heather - 0.5) * 0.052 + (heather_fine - 0.5) * 0.042
    base_b = 0.602 + (heather - 0.5) * 0.048 + (heather_fine - 0.5) * 0.040

    kr = np.clip(base_r * ao, 0.0, 1.0)
    kg = np.clip(base_g * (ao ** 1.15), 0.0, 1.0)
    kb = np.clip(base_b * (ao ** 1.12), 0.0, 1.0)

    img_knit_albedo = _make_blender_image("Knit_Albedo", np.stack([kr, kg, kb, np.ones_like(kr)], axis=-1), "sRGB")
    img_knit_height = _make_blender_image("Knit_Height", np.stack([knit_h, knit_h, knit_h, np.ones_like(knit_h)], axis=-1), "Non-Color")
    img_knit_normal = _make_blender_image("Knit_Normal", _height_to_normal(knit_h, strength=3.6), "Non-Color")
    k_rough = np.clip(0.86 - 0.08 * knit_h + (wool_grain - 0.5) * 0.08, 0.72, 0.96)
    img_knit_rough = _make_blender_image("Knit_Roughness", np.stack([k_rough, k_rough, k_rough, np.ones_like(k_rough)], axis=-1), "Non-Color")

    rib_cols = 24.0
    rib_rows = 22.0
    ru = (u * rib_cols) % 1.0
    rv = (v * rib_rows) % 1.0
    rib_ridge = 0.5 + 0.5 * np.cos(2.0 * math.pi * ru)
    v_sub = np.sin(math.pi * rv) * (0.85 + 0.15 * np.sin((rv * 4.0 + ru * 6.0) * 2.0 * math.pi))
    purl_bump = 0.34 + 0.14 * np.sin(2.0 * math.pi * rv)
    rib_h = rib_ridge * (0.48 + 0.52 * v_sub) + (1.0 - rib_ridge) * purl_bump
    rib_h = np.clip(rib_h * 0.88 + wool_grain * 0.12, 0.0, 1.0)

    rib_ao = 0.70 + 0.30 * _smoothstep(0.18, 0.86, rib_h)
    rr = np.clip(base_r * rib_ao, 0.0, 1.0)
    rg = np.clip(base_g * (rib_ao ** 1.15), 0.0, 1.0)
    rb = np.clip(base_b * (rib_ao ** 1.12), 0.0, 1.0)

    img_rib_albedo = _make_blender_image("Rib_Albedo", np.stack([rr, rg, rb, np.ones_like(rr)], axis=-1), "sRGB")
    img_rib_height = _make_blender_image("Rib_Height", np.stack([rib_h, rib_h, rib_h, np.ones_like(rib_h)], axis=-1), "Non-Color")
    img_rib_normal = _make_blender_image("Rib_Normal", _height_to_normal(rib_h, strength=4.2), "Non-Color")

    return {
        "knit_albedo": img_knit_albedo,
        "knit_height": img_knit_height,
        "knit_normal": img_knit_normal,
        "knit_roughness": img_knit_rough,
        "rib_albedo": img_rib_albedo,
        "rib_height": img_rib_height,
        "rib_normal": img_rib_normal,
    }
