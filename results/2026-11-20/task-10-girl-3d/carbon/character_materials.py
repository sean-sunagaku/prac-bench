import os
import math
import numpy as np
import bpy
from character_anatomy import smoothstep, gauss3d


def hash_noise_3d(x, y, z, freq=1.0, seed=0):
    """Fast vectorized smooth 3D value noise for organic skin & yarn micro-detail."""
    px = x * freq + seed * 17.13
    py = y * freq + seed * 31.71
    pz = z * freq + seed * 47.53

    ix = np.floor(px).astype(np.int64)
    iy = np.floor(py).astype(np.int64)
    iz = np.floor(pz).astype(np.int64)

    fx = px - ix
    fy = py - iy
    fz = pz - iz
    ux = fx * fx * (3.0 - 2.0 * fx)
    uy = fy * fy * (3.0 - 2.0 * fy)
    uz = fz * fz * (3.0 - 2.0 * fz)

    def h(a, b, c):
        n = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791) ^ (seed * 2654435761)
        n = (n ^ (n >> 13)) * 1274126177
        return ((n ^ (n >> 16)) & 0xFFFFFF) / float(0xFFFFFF)

    c000 = h(ix, iy, iz)
    c100 = h(ix + 1, iy, iz)
    c010 = h(ix, iy + 1, iz)
    c110 = h(ix + 1, iy + 1, iz)
    c001 = h(ix, iy, iz + 1)
    c101 = h(ix + 1, iy, iz + 1)
    c011 = h(ix, iy + 1, iz + 1)
    c111 = h(ix + 1, iy + 1, iz + 1)

    c00 = c000 + ux * (c100 - c000)
    c10 = c010 + ux * (c110 - c010)
    c01 = c001 + ux * (c101 - c001)
    c11 = c011 + ux * (c111 - c011)

    c0 = c00 + uy * (c10 - c00)
    c1 = c01 + uy * (c11 - c01)
    return c0 + uz * (c1 - c0)


def create_and_save_image(name, rgba_float, tex_dir, is_data=False):
    """Create a Blender Image with exact colorspace set BEFORE writing pixels, save PNG, and pack."""
    h, w, _ = rgba_float.shape
    os.makedirs(tex_dir, exist_ok=True)
    filepath = os.path.abspath(os.path.join(tex_dir, f"{name}.png"))

    img = bpy.data.images.new(name=name, width=w, height=h, alpha=False, float_buffer=False)
    img.colorspace_settings.name = "Non-Color" if is_data else "sRGB"
    flat = np.clip(rgba_float, 0.0, 1.0).astype(np.float32).reshape(-1)
    img.pixels.foreach_set(flat)
    img.filepath_raw = filepath
    img.file_format = "PNG"
    img.save()
    img.pack()
    return img, filepath


def rasterize_uv_to_canonical_3d(trimmed_raw, trimmed_faces, trimmed_uvs, res=2048):
    """
    Rasterize remapped HeadBody_Mesh UVs onto a 2048x2048 grid of canonical MakeHuman
    pre-sculpt coordinates (x_raw, y_raw, z_raw) + 14px seam gutter dilation!
    Evaluating procedural anatomy in canonical raw space guarantees sub-millimeter alignment
    with MakeHuman's exact lip vermilion, mouth seam, nostrils, caruncles, and eyelids!
    """
    pos_grid = np.zeros((res, res, 3), dtype=np.float32)
    valid = np.zeros((res, res), dtype=bool)

    for fc, fuv in zip(trimmed_faces, trimmed_uvs):
        # Skip tiny packed cavity corner [0.01, 0.01] so gutter dilation doesn't touch it
        if fuv[0][0] < 0.025 and fuv[0][1] < 0.025:
            continue
        for k in range(1, len(fc) - 1):
            idxs = [fc[0], fc[k], fc[k + 1]]
            uvs = [fuv[0], fuv[k], fuv[k + 1]]
            p0, p1, p2 = trimmed_raw[idxs[0]], trimmed_raw[idxs[1]], trimmed_raw[idxs[2]]

            u0, v0 = uvs[0][0] * (res - 1), uvs[0][1] * (res - 1)
            u1, v1 = uvs[1][0] * (res - 1), uvs[1][1] * (res - 1)
            u2, v2 = uvs[2][0] * (res - 1), uvs[2][1] * (res - 1)

            min_x = max(0, int(math.floor(min(u0, u1, u2))))
            max_x = min(res - 1, int(math.ceil(max(u0, u1, u2))))
            min_y = max(0, int(math.floor(min(v0, v1, v2))))
            max_y = min(res - 1, int(math.ceil(max(v0, v1, v2))))
            if min_x > max_x or min_y > max_y:
                continue

            denom = (v1 - v2) * (u0 - u2) + (u2 - u1) * (v0 - v2)
            if abs(denom) < 1e-8:
                continue

            xs = np.arange(min_x, max_x + 1, dtype=np.float64)
            ys = np.arange(min_y, max_y + 1, dtype=np.float64)
            gx, gy = np.meshgrid(xs, ys)

            w0 = ((v1 - v2) * (gx - u2) + (u2 - u1) * (gy - v2)) / denom
            w1 = ((v2 - v0) * (gx - u2) + (u0 - u2) * (gy - v2)) / denom
            w2 = 1.0 - w0 - w1

            mask = (w0 >= -1e-4) & (w1 >= -1e-4) & (w2 >= -1e-4)
            if np.any(mask):
                interp = (
                    w0[mask, None] * p0[None, :]
                    + w1[mask, None] * p1[None, :]
                    + w2[mask, None] * p2[None, :]
                )
                pos_grid[min_y : max_y + 1, min_x : max_x + 1][mask] = interp.astype(np.float32)
                valid[min_y : max_y + 1, min_x : max_x + 1][mask] = True

    # 14px seam dilation for zero UV border artifacts
    for _ in range(14):
        if np.all(valid):
            break
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sv = np.roll(np.roll(valid, dy, axis=0), dx, axis=1)
            sp = np.roll(np.roll(pos_grid, dy, axis=0), dx, axis=1)
            fill = (~valid) & sv
            pos_grid[fill] = sp[fill]
            valid[fill] = True

    return pos_grid, valid


def generate_skin_textures_2k(anat_info, tex_dir):
    """
    Generate realistic 2048x2048 procedural Skin Albedo, Roughness, and Micro-Pore/Lip Bump maps
    aligned to exact canonical MakeHuman coordinates (where mouth seam is z=1.47975, Cupid's bow
    is z=1.4864, lower lip border is z=1.4724, upper lash line is z=1.5500, lower is z=1.5408)!
    """
    res = 2048
    pos_grid, valid = rasterize_uv_to_canonical_3d(
        anat_info["trimmed_raw"], anat_info["trimmed_faces"], anat_info["trimmed_uvs"], res=res
    )

    pts = pos_grid[valid].astype(np.float64)
    x = pts[:, 0]
    y = pts[:, 1]
    z = pts[:, 2]
    ax = np.abs(x)

    # 1. Radiant, fair warm-ivory East Asian complexion matching input/reference.png
    r = np.full(len(pts), 0.855, dtype=np.float64)
    g = np.full(len(pts), 0.708, dtype=np.float64)
    b = np.full(len(pts), 0.646, dtype=np.float64)

    n_med = hash_noise_3d(x, y, z, freq=140.0, seed=11) - 0.5
    n_fine = hash_noise_3d(x, y, z, freq=460.0, seed=29) - 0.5
    n_pore = hash_noise_3d(x, y, z, freq=1450.0, seed=73)

    r += 0.015 * n_med + 0.008 * n_fine
    g += 0.012 * n_med + 0.006 * n_fine
    b += 0.011 * n_med + 0.006 * n_fine

    # 2. Soft Rosy-Peach Malar Blush on Smiling Apple Cheeks (matching reference.png!)
    blush = (
        gauss3d(pts, [0.036, -0.138, 1.517], [0.023, 0.024, 0.019])
        + gauss3d(pts, [-0.036, -0.138, 1.517], [0.023, 0.024, 0.019])
    )
    blush = np.clip(blush, 0.0, 1.0)
    r = r * (1.0 - 0.46 * blush) + 0.875 * (0.46 * blush)
    g = g * (1.0 - 0.46 * blush) + 0.555 * (0.46 * blush)
    b = b * (1.0 - 0.46 * blush) + 0.535 * (0.46 * blush)

    # 3. Subtle Capillary Warmth on Nose Tip, Chin Pad & Ears + Soft Nostril Shadow
    nose_warm = gauss3d(pts, [0.0, -0.166, 1.509], [0.014, 0.014, 0.011])
    chin_warm = gauss3d(pts, [0.0, -0.151, 1.452], [0.018, 0.015, 0.012]) * 0.55
    ear_warm = smoothstep(0.067, 0.078, ax) * smoothstep(1.495, 1.510, z) * (1.0 - smoothstep(1.560, 1.572, z))
    cap = np.clip(0.42 * nose_warm + 0.30 * chin_warm + 0.48 * ear_warm, 0.0, 0.62)
    r = r * (1.0 - cap) + 0.865 * cap
    g = g * (1.0 - cap) + 0.580 * cap
    b = b * (1.0 - cap) + 0.550 * cap

    # Nostril cavity shadow (tucked strictly under nasal base z_raw ~ 1.502..1.507, y_raw > -0.164)
    nostril_dark = (
        (gauss3d(pts, [0.0082, -0.159, 1.5045], [0.0040, 0.0045, 0.0028])
         + gauss3d(pts, [-0.0082, -0.159, 1.5045], [0.0040, 0.0045, 0.0028]))
        * smoothstep(-0.165, -0.158, y)
    )
    nostril_dark = np.clip(nostril_dark, 0.0, 0.72)
    r *= 1.0 - 0.55 * nostril_dark
    g *= 1.0 - 0.62 * nostril_dark
    b *= 1.0 - 0.64 * nostril_dark

    # 4. Expressive Eye Definition: Warm Peach-Brown Lid Shadow, Double-Crease Accent, Caruncle & Tightline!
    lash_tight = np.zeros(len(pts), dtype=np.float64)
    caruncle_w = np.zeros(len(pts), dtype=np.float64)
    lid_shade = np.zeros(len(pts), dtype=np.float64)
    crease_line = np.zeros(len(pts), dtype=np.float64)
    waterline_pink = np.zeros(len(pts), dtype=np.float64)

    for sgn in (1.0, -1.0):
        dx = x - sgn * 0.0311
        dz = z - 1.5453
        front_eye = smoothstep(-0.128, -0.133, y)

        # Warm soft peach-taupe eyeshadow on upper lid + subtle lower outer corner warmth
        lid_shade += (
            np.exp(-0.5 * ((dz - 0.0068) / 0.0045) ** 2) * np.exp(-0.5 * (dx / 0.0135) ** 2) * 0.45
            + np.exp(-0.5 * ((dz + 0.0065) / 0.0028) ** 2) * np.exp(-0.5 * ((dx - sgn * 0.004) / 0.010) ** 2) * 0.28
        ) * front_eye

        # Delicate parallel double-eyelid crease shadow line (z_raw ~ 1.5528)
        c_arch = 1.5526 - 0.0022 * ((dx / 0.0125) ** 2)
        crease_line += (
            np.exp(-0.5 * ((z - c_arch) / 0.00085) ** 2)
            * np.exp(-0.5 * (dx / 0.0115) ** 2)
            * front_eye
            * 0.36
        )

        # Crisp dark espresso-brown upper lash tightline along canonical upper lash rim (z_raw ~ 1.5500 curving to corners!)
        t_lid = np.clip((dx * sgn + 0.0115) / 0.0240, 0.0, 1.0)
        z_upper_rim = 1.5452 + 0.00485 * np.sin(np.pi * (t_lid ** 0.92))
        lash_tight += (
            np.exp(-0.5 * ((z - z_upper_rim) / 0.00095) ** 2)
            * smoothstep(0.0195, 0.0220, ax)
            * (1.0 - smoothstep(0.0425, 0.0455, ax))
            * smoothstep(-0.133, -0.136, y)
        )

        # Moist pink lower waterline & medial tear caruncle
        z_lower_rim = 1.5446 - 0.00385 * np.sin(np.pi * (t_lid ** 0.95))
        waterline_pink += (
            np.exp(-0.5 * ((z - z_lower_rim) / 0.00085) ** 2)
            * smoothstep(0.019, 0.021, ax)
            * (1.0 - smoothstep(0.042, 0.044, ax))
            * smoothstep(-0.1398, -0.1375, -y)  # inner shelf
        ) * 0.45
        caruncle_w += gauss3d(pts, [sgn * 0.0195, -0.1375, 1.5445], [0.0028, 0.0038, 0.0024])

    lid_shade = np.clip(lid_shade, 0.0, 0.55)
    r = r * (1.0 - lid_shade) + 0.755 * lid_shade
    g = g * (1.0 - lid_shade) + 0.555 * lid_shade
    b = b * (1.0 - lid_shade) + 0.495 * lid_shade

    crease_line = np.clip(crease_line, 0.0, 0.42)
    r = r * (1.0 - crease_line) + 0.48 * crease_line
    g = g * (1.0 - crease_line) + 0.32 * crease_line
    b = b * (1.0 - crease_line) + 0.28 * crease_line

    car_tot = np.clip(caruncle_w * 0.55 + waterline_pink * 0.55, 0.0, 0.52)
    r = r * (1.0 - car_tot) + 0.80 * car_tot
    g = g * (1.0 - car_tot) + 0.50 * car_tot
    b = b * (1.0 - car_tot) + 0.48 * car_tot

    lash_tight = np.clip(lash_tight, 0.0, 0.85)
    r = r * (1.0 - lash_tight) + 0.14 * lash_tight
    g = g * (1.0 - lash_tight) + 0.09 * lash_tight
    b = b * (1.0 - lash_tight) + 0.08 * lash_tight

    # Soft natural brow-powder skin tint underneath 3D Eyebrows_Curves (prevents any sparse look!)
    for side in (-1.0, 1.0):
        u_b = np.clip((x * side - 0.0145) / 0.0365, 0.0, 1.0)
        bz_line = 1.5608 + 0.0026 * np.sin(np.pi * (u_b ** 0.82)) - 0.0015 * (u_b ** 2.2)
        b_thick = 0.0032 * (1.0 - 0.48 * (u_b ** 1.6))
        brow_sh = (
            np.exp(-0.5 * ((z - bz_line) / np.maximum(0.0015, b_thick)) ** 2)
            * smoothstep(0.0135, 0.0185, x * side)
            * (1.0 - smoothstep(0.045, 0.051, x * side))
            * smoothstep(-0.128, -0.138, y)
            * 0.42
        )
        r = r * (1.0 - brow_sh) + 0.44 * brow_sh
        g = g * (1.0 - brow_sh) + 0.33 * brow_sh
        b = b * (1.0 - brow_sh) + 0.27 * brow_sh

    # 5. Hydrated Warm Coral-Rose Smiling Lips (Aligned 100% to Canonical MakeHuman Lip Loops!)
    # Canonical mouth seam in raw_pts is z=1.47975 at center, curving gently to z=1.4783 at corners |x|=0.0250!
    # Notice: NO broken y<-0.151 cutoff because oral_bag was already separated by UV island!
    lip_u = np.clip(ax / 0.0252, 0.0, 1.25)
    seam_z = 1.4797 - 0.0012 * (np.minimum(1.0, lip_u) ** 1.6)
    cupid_curve = (
        -0.0010 * np.exp(-0.5 * (ax / 0.0026) ** 2)
        + 0.0009 * np.exp(-0.5 * ((ax - 0.0052) / 0.0034) ** 2)
    )
    upper_border = seam_z + 0.0067 * np.maximum(0.0, 1.0 - lip_u ** 1.75) + cupid_curve
    lower_border = seam_z - 0.0076 * np.maximum(0.0, 1.0 - lip_u ** 1.68)

    in_lip_x = 1.0 - smoothstep(0.0225, 0.0258, ax)
    in_lip_z = smoothstep(lower_border - 0.0012, lower_border + 0.0009, z) * (
        1.0 - smoothstep(upper_border - 0.0008, upper_border + 0.0011, z)
    )
    front_mouth = smoothstep(-0.130, -0.136, y)
    lip_mask = np.clip(in_lip_x * in_lip_z * front_mouth, 0.0, 1.0)

    # Fine vertical lip sulci & soft deeper coral-rose inner kiss-zone + delicate mouth-seam shadow!
    lip_sulci = np.sin(x * 1750.0 + 2.2 * hash_noise_3d(x, y, z, freq=340.0, seed=91)) * 0.5 + 0.5
    inner_kiss = np.exp(-0.5 * ((z - seam_z) / 0.0028) ** 2) * lip_mask
    seam_crease = np.exp(-0.5 * ((z - seam_z) / 0.00065) ** 2) * (1.0 - smoothstep(0.0235, 0.0265, ax)) * front_mouth

    # Warm rosy-coral matching input/reference.png!
    lip_r = 0.835 - 0.055 * inner_kiss - 0.016 * lip_sulci
    lip_g = 0.435 - 0.075 * inner_kiss - 0.014 * lip_sulci
    lip_b = 0.435 - 0.065 * inner_kiss - 0.012 * lip_sulci

    r = r * (1.0 - lip_mask) + lip_r * lip_mask
    g = g * (1.0 - lip_mask) + lip_g * lip_mask
    b = b * (1.0 - lip_mask) + lip_b * lip_mask

    # Soft smile-line / oral commissure shadow right along lip parting seam & corners
    seam_w = np.clip(0.45 * seam_crease, 0.0, 0.48)
    r = r * (1.0 - seam_w) + 0.42 * seam_w
    g = g * (1.0 - seam_w) + 0.17 * seam_w
    b = b * (1.0 - seam_w) + 0.18 * seam_w

    # 6. Soft Scalp Root Shadow on Crown/Occiput (starts at hairline z_raw >= 1.606 so forehead stays luminous!)
    scalp_crown = (
        smoothstep(1.606, 1.622, z) * smoothstep(0.04, -0.135, y)
        + smoothstep(-0.025, 0.015, y) * smoothstep(1.465, 1.495, z)
    )
    not_ear = 1.0 - smoothstep(0.066, 0.072, ax) * (1.0 - smoothstep(1.565, 1.575, z))
    scalp_w = np.clip(scalp_crown * not_ear, 0.0, 1.0) * 0.68
    r = r * (1.0 - scalp_w) + 0.22 * scalp_w
    g = g * (1.0 - scalp_w) + 0.14 * scalp_w
    b = b * (1.0 - scalp_w) + 0.11 * scalp_w

    # Assemble 2K Albedo (with dark oral/socket cavity corner [0..60, 0..60])
    albedo = np.zeros((res, res, 4), dtype=np.float32)
    albedo[:, :, 0] = 0.855
    albedo[:, :, 1] = 0.708
    albedo[:, :, 2] = 0.646
    albedo[:, :, 3] = 1.0
    albedo[valid, 0] = np.clip(r, 0.0, 1.0).astype(np.float32)
    albedo[valid, 1] = np.clip(g, 0.0, 1.0).astype(np.float32)
    albedo[valid, 2] = np.clip(b, 0.0, 1.0).astype(np.float32)
    cav_px = int(res * 0.028)
    albedo[:cav_px, :cav_px, :3] = (0.12, 0.06, 0.06)

    # Assemble 2K Roughness (hydrated satin lips ~0.16, dewy cheeks/nose ~0.27, matte-soft neck ~0.39)
    rough_vals = (
        0.38
        - 0.10 * np.clip(blush + nose_warm, 0.0, 1.0)
        - 0.21 * lip_mask
        - 0.26 * car_tot
        + 0.03 * (n_pore - 0.5)
    )
    rough = np.full((res, res, 4), 0.38, dtype=np.float32)
    rough[:, :, 3] = 1.0
    rough[valid, 0] = np.clip(rough_vals, 0.08, 0.55).astype(np.float32)
    rough[valid, 1] = rough[valid, 0]
    rough[valid, 2] = rough[valid, 0]

    # Assemble 2K Restrained Micro-Pore & Lip-Sulci Bump
    pore_zone = np.clip(blush * 0.85 + nose_warm * 1.15 + 0.30 * smoothstep(1.44, 1.60, z), 0.0, 1.0)
    pore_pit = (np.maximum(0.0, n_pore - 0.46) ** 1.6) * pore_zone * (1.0 - lip_mask)
    bump_vals = 0.5 - 0.26 * pore_pit + 0.20 * (lip_sulci - 0.5) * lip_mask + 0.05 * n_fine
    bump = np.full((res, res, 4), 0.5, dtype=np.float32)
    bump[:, :, 3] = 1.0
    bump[valid, 0] = np.clip(bump_vals, 0.0, 1.0).astype(np.float32)
    bump[valid, 1] = bump[valid, 0]
    bump[valid, 2] = bump[valid, 0]

    img_alb, p_alb = create_and_save_image("Skin_BaseColor_2K", albedo, tex_dir, is_data=False)
    img_rgh, p_rgh = create_and_save_image("Skin_Roughness_2K", rough, tex_dir, is_data=True)
    img_bmp, p_bmp = create_and_save_image("Skin_MicroBump_2K", bump, tex_dir, is_data=True)

    return {
        "albedo": (img_alb, p_alb),
        "roughness": (img_rgh, p_rgh),
        "bump": (img_bmp, p_bmp),
    }


def generate_iris_texture_1k(tex_dir):
    """
    Generate realistic 1024x1024 deep warm East Asian Chestnut-Brown Iris + Espresso Limbal Ring +
    Natural Upper-Lid Shadow Gradient + Warm Porcelain Sclera!
    """
    res = 1024
    coords = np.linspace(0.0, 1.0, res) - 0.5
    gx, gy = np.meshgrid(coords, coords)
    rad = np.sqrt(gx * gx + gy * gy)
    ang = np.arctan2(gy, gx)

    iris_edge = 0.280
    r_norm = rad / iris_edge

    fib1 = np.sin(ang * 72.0 + 1.6 * np.sin(rad * 45.0 + ang * 7.0)) * 0.5 + 0.5
    fib2 = np.sin(ang * 140.0 - 2.0 * np.cos(rad * 68.0 - ang * 11.0)) * 0.5 + 0.5
    crypts = np.sin(ang * 25.0 + 2.8 * np.sin(r_norm * 9.0)) * 0.5 + 0.5
    fiber_mix = 0.48 * fib1 + 0.34 * fib2 + 0.18 * crypts

    # Deep rich warm chestnut-chocolate brown (matching reference.png — soulful & natural, not bright orange!)
    collarette = np.exp(-0.5 * ((r_norm - 0.44) / 0.12) ** 2)
    lower_glow = np.clip(-gy / 0.28, -0.4, 0.8) * 0.18 + 0.88  # subtle warm light pool in lower iris arc!
    iris_r = (0.20 + 0.12 * fiber_mix + 0.09 * collarette) * lower_glow
    iris_g = (0.10 + 0.065 * fiber_mix + 0.05 * collarette) * lower_glow
    iris_b = (0.055 + 0.032 * fiber_mix + 0.02 * collarette) * lower_glow

    # Soft dark espresso limbal ring
    limbal = smoothstep(0.72, 0.92, r_norm) * (1.0 - smoothstep(0.98, 1.05, r_norm))
    iris_r *= 1.0 - 0.68 * limbal
    iris_g *= 1.0 - 0.72 * limbal
    iris_b *= 1.0 - 0.72 * limbal

    # Deep dark pupil (r_norm < 0.31)
    pupil = 1.0 - smoothstep(0.295, 0.330, r_norm)
    iris_r = iris_r * (1.0 - pupil) + 0.012 * pupil
    iris_g = iris_g * (1.0 - pupil) + 0.010 * pupil
    iris_b = iris_b * (1.0 - pupil) + 0.010 * pupil

    # Warm porcelain off-white sclera with delicate peripheral warmth
    periph = smoothstep(1.16, 1.65, r_norm)
    vein = np.maximum(0.0, np.sin(ang * 19.0 + 4.5 * np.sin(rad * 28.0)) - 0.80) * periph
    scl_r = 0.925 - 0.03 * periph + 0.06 * vein
    scl_g = 0.898 - 0.05 * periph - 0.05 * vein
    scl_b = 0.882 - 0.06 * periph - 0.05 * vein

    is_sclera = smoothstep(0.97, 1.04, r_norm)
    out = np.zeros((res, res, 4), dtype=np.float32)
    out[:, :, 0] = np.clip(iris_r * (1.0 - is_sclera) + scl_r * is_sclera, 0.0, 1.0)
    out[:, :, 1] = np.clip(iris_g * (1.0 - is_sclera) + scl_g * is_sclera, 0.0, 1.0)
    out[:, :, 2] = np.clip(iris_b * (1.0 - is_sclera) + scl_b * is_sclera, 0.0, 1.0)
    out[:, :, 3] = 1.0

    return create_and_save_image("Iris_ChestnutBrown_1K", out, tex_dir, is_data=False)


def generate_sweater_knit_textures_2k(tex_dir):
    """
    Generate realistic 2048x2048 Fine Shaker-Rib (1x1 Fisherman's Rib) Knit Yarn Albedo,
    Bump, and Roughness maps matching the soft dusty-pink sweater in input/reference.png!
    """
    res = 2048
    u = np.linspace(0.0, 1.0, res, endpoint=False)
    v = np.linspace(0.0, 1.0, res, endpoint=False)
    gu, gv = np.meshgrid(u, v)

    # 136 fine vertical shaker-rib wales around torso x 210 stitch courses (~3.2mm fine rib spacing!)
    n_wales = 136.0
    n_courses = 210.0

    su = gu * n_wales
    sv = gv * n_courses

    fu = su - np.floor(su)
    fv = sv - np.floor(sv)

    # Vertical shaker-rib column envelope (strong vertical rib wale + purl valley between ribs!)
    rib_col = np.sin(math.pi * fu) ** 0.72

    # Fine interlocking V-stitch yarn loops along each rib crown (gentle ~0.55 slope, NOT wide chevrons!)
    dist_L = np.abs(((fv - (0.70 - (0.50 - fu) * 0.65)) + 0.5) % 1.0 - 0.5)
    dist_R = np.abs(((fv - (0.70 - (fu - 0.50) * 0.65)) + 0.5) % 1.0 - 0.5)
    mask_L = 1.0 - smoothstep(0.42, 0.54, fu)
    mask_R = smoothstep(0.46, 0.58, fu)

    v_loop = np.maximum(
        np.sqrt(np.maximum(0.0, 1.0 - (dist_L / 0.42) ** 2)) * mask_L,
        np.sqrt(np.maximum(0.0, 1.0 - (dist_R / 0.42) ** 2)) * mask_R,
    )
    # Horizontal purl bar inside rib groove
    purl_bar = (np.sin(fv * 2.0 * math.pi) * 0.5 + 0.5) * (1.0 - rib_col) * 0.35

    yarn_height = rib_col * (0.42 + 0.58 * v_loop) + purl_bar

    # Fine plied yarn twist & soft wool micro-fuzz
    ply = np.sin((fu * 10.0 + fv * 6.0) * 2.0 * np.pi) * 0.05 * rib_col
    fuzz = (
        np.sin(gu * 2200.0 + 2.8 * np.sin(gv * 1900.0))
        * np.cos(gv * 2300.0 - 2.4 * np.cos(gu * 1800.0))
    ) * 0.05

    height = np.clip(0.12 + 0.78 * yarn_height + ply + fuzz, 0.0, 1.0)

    # Soft Dusty Pink / Muted Warm Rose yarn matching input/reference.png!
    ao_stitch = 0.78 + 0.22 * yarn_height
    heather = 0.97 + 0.06 * (np.sin(su * 5.7 + np.cos(sv * 4.3)) * 0.5)

    alb = np.zeros((res, res, 4), dtype=np.float32)
    alb[:, :, 0] = np.clip(0.835 * ao_stitch * heather, 0.0, 1.0)
    alb[:, :, 1] = np.clip(0.575 * ao_stitch * heather, 0.0, 1.0)
    alb[:, :, 2] = np.clip(0.585 * ao_stitch * heather, 0.0, 1.0)
    alb[:, :, 3] = 1.0

    bmp = np.zeros((res, res, 4), dtype=np.float32)
    bmp[:, :, 0] = height.astype(np.float32)
    bmp[:, :, 1] = bmp[:, :, 0]
    bmp[:, :, 2] = bmp[:, :, 0]
    bmp[:, :, 3] = 1.0

    rgh = np.zeros((res, res, 4), dtype=np.float32)
    rgh_val = np.clip(0.74 + 0.14 * (1.0 - yarn_height) + 0.04 * fuzz, 0.55, 0.94)
    rgh[:, :, 0] = rgh_val.astype(np.float32)
    rgh[:, :, 1] = rgh[:, :, 0]
    rgh[:, :, 2] = rgh[:, :, 0]
    rgh[:, :, 3] = 1.0

    img_a, p_a = create_and_save_image("Sweater_Knit_Albedo_2K", alb, tex_dir, is_data=False)
    img_b, p_b = create_and_save_image("Sweater_Knit_Bump_2K", bmp, tex_dir, is_data=True)
    img_r, p_r = create_and_save_image("Sweater_Knit_Roughness_2K", rgh, tex_dir, is_data=True)

    return {
        "albedo": (img_a, p_a),
        "bump": (img_b, p_b),
        "roughness": (img_r, p_r),
    }


def build_and_assign_materials(anat_info, sweater_info, hair_info, tex_dir):
    """Generate all packed procedural textures and build editable Blender 5.1 node shaders."""
    skin_tex = generate_skin_textures_2k(anat_info, tex_dir)
    iris_tex = generate_iris_texture_1k(tex_dir)
    knit_tex = generate_sweater_knit_textures_2k(tex_dir)

    # -------------------------------------------------------------------------
    # 1. Skin_Material (Calibrated RANDOM_WALK_SKIN SSS — crisp lips/lids + natural dermis glow!)
    # -------------------------------------------------------------------------
    skin_mat = bpy.data.materials.new(name="Skin_Material")
    nt = skin_mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.subsurface_method = "RANDOM_WALK_SKIN"
    bsdf.inputs["Subsurface Weight"].default_value = 0.34
    bsdf.inputs["Subsurface Scale"].default_value = 0.0024  # 2.4mm realistic facial scatter (preserves lip/lid crispness!)
    bsdf.inputs["Subsurface Radius"].default_value = (1.0, 0.38, 0.24)
    bsdf.inputs["Subsurface IOR"].default_value = 1.40
    bsdf.inputs["Subsurface Anisotropy"].default_value = 0.75
    bsdf.inputs["IOR"].default_value = 1.42
    bsdf.inputs["Specular IOR Level"].default_value = 0.45
    bsdf.inputs["Coat Weight"].default_value = 0.08
    bsdf.inputs["Coat Roughness"].default_value = 0.28
    bsdf.inputs["Sheen Weight"].default_value = 0.14
    bsdf.inputs["Sheen Roughness"].default_value = 0.55

    n_alb = nt.nodes.new("ShaderNodeTexImage")
    n_alb.image = skin_tex["albedo"][0]
    n_alb.location = (-520, 280)

    n_rgh = nt.nodes.new("ShaderNodeTexImage")
    n_rgh.image = skin_tex["roughness"][0]
    n_rgh.location = (-520, 0)

    n_bmp_img = nt.nodes.new("ShaderNodeTexImage")
    n_bmp_img.image = skin_tex["bump"][0]
    n_bmp_img.location = (-520, -280)

    n_bump = nt.nodes.new("ShaderNodeBump")
    n_bump.inputs["Strength"].default_value = 0.15
    n_bump.inputs["Distance"].default_value = 0.00035
    n_bump.location = (-240, -240)

    nt.links.new(n_alb.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(n_rgh.outputs["Color"], bsdf.inputs["Roughness"])
    nt.links.new(n_bmp_img.outputs["Color"], n_bump.inputs["Height"])
    nt.links.new(n_bump.outputs["Normal"], bsdf.inputs["Normal"])

    anat_info["objects"]["body"].data.materials.append(skin_mat)
    for h_obj in sweater_info["hands"]:
        h_obj.data.materials.append(skin_mat)

    # -------------------------------------------------------------------------
    # 2. Eye_IrisSclera_Material & Eye_Cornea_Material
    # -------------------------------------------------------------------------
    eye_mat = bpy.data.materials.new(name="Eye_IrisSclera_Material")
    nt_e = eye_mat.node_tree
    bsdf_e = nt_e.nodes.get("Principled BSDF")
    bsdf_e.subsurface_method = "RANDOM_WALK"
    bsdf_e.inputs["Subsurface Weight"].default_value = 0.18
    bsdf_e.inputs["Subsurface Scale"].default_value = 0.0025
    bsdf_e.inputs["Subsurface Radius"].default_value = (1.0, 0.45, 0.35)
    bsdf_e.inputs["Roughness"].default_value = 0.30
    bsdf_e.inputs["Specular IOR Level"].default_value = 0.18

    n_iris = nt_e.nodes.new("ShaderNodeTexImage")
    n_iris.image = iris_tex[0]
    n_iris.location = (-420, 200)
    nt_e.links.new(n_iris.outputs["Color"], bsdf_e.inputs["Base Color"])

    anat_info["objects"]["eyeball_L"].data.materials.append(eye_mat)
    anat_info["objects"]["eyeball_R"].data.materials.append(eye_mat)

    cornea_mat = bpy.data.materials.new(name="Eye_Cornea_Material")
    nt_c = cornea_mat.node_tree
    out_c = nt_c.nodes.get("Material Output")
    bsdf_c = nt_c.nodes.get("Principled BSDF")
    bsdf_c.inputs["Base Color"].default_value = (1.0, 1.0, 1.0, 1.0)
    bsdf_c.inputs["Roughness"].default_value = 0.005
    bsdf_c.inputs["IOR"].default_value = 1.376
    bsdf_c.inputs["Transmission Weight"].default_value = 1.0
    bsdf_c.inputs["Coat Weight"].default_value = 0.30
    bsdf_c.inputs["Coat Roughness"].default_value = 0.003

    n_trans = nt_c.nodes.new("ShaderNodeBsdfTransparent")
    n_trans.location = (-200, -150)
    n_lp = nt_c.nodes.new("ShaderNodeLightPath")
    n_lp.location = (-420, 180)
    n_mix = nt_c.nodes.new("ShaderNodeMixShader")
    n_mix.location = (120, 80)

    nt_c.links.new(n_lp.outputs["Is Shadow Ray"], n_mix.inputs["Fac"])
    nt_c.links.new(bsdf_c.outputs["BSDF"], n_mix.inputs[1])
    nt_c.links.new(n_trans.outputs["BSDF"], n_mix.inputs[2])
    nt_c.links.new(n_mix.outputs["Shader"], out_c.inputs["Surface"])

    anat_info["objects"]["cornea_L"].data.materials.append(cornea_mat)
    anat_info["objects"]["cornea_R"].data.materials.append(cornea_mat)

    tear_mat = cornea_mat.copy()
    tear_mat.name = "Eye_TearMeniscus_Material"
    anat_info["objects"]["tear"].data.materials.append(tear_mat)

    # -------------------------------------------------------------------------
    # 3. Hair_Chestnut_Material, Eyelash_Material & Eyebrow_Material
    # -------------------------------------------------------------------------
    hair_mat = bpy.data.materials.new(name="Hair_Chestnut_Material")
    nt_h = hair_mat.node_tree
    out_h = nt_h.nodes.get("Material Output")
    if nt_h.nodes.get("Principled BSDF"):
        nt_h.nodes.remove(nt_h.nodes.get("Principled BSDF"))

    hbsdf = nt_h.nodes.new("ShaderNodeBsdfHairPrincipled")
    hbsdf.model = "CHIANG"
    hbsdf.parametrization = "MELANIN"
    for sock_name, val in [
        ("Melanin", 0.79),
        ("Melanin Redness", 0.44),
        ("Tint", (0.74, 0.54, 0.40, 1.0)),
        ("Roughness", 0.17),
        ("Radial Roughness", 0.27),
        ("Coat", 0.38),
        ("IOR", 1.55),
        ("Random Color", 0.09),
        ("Random Roughness", 0.06),
    ]:
        if sock_name in hbsdf.inputs:
            hbsdf.inputs[sock_name].default_value = val
    nt_h.links.new(hbsdf.outputs["BSDF"], out_h.inputs["Surface"])

    for k in ("scalp_base", "long_waves", "wispy_bangs", "flyaways"):
        hair_info[k].data.materials.append(hair_mat)

    lash_mat = bpy.data.materials.new(name="Eyelash_Material")
    nt_l = lash_mat.node_tree
    out_l = nt_l.nodes.get("Material Output")
    if nt_l.nodes.get("Principled BSDF"):
        nt_l.nodes.remove(nt_l.nodes.get("Principled BSDF"))
    lbsdf = nt_l.nodes.new("ShaderNodeBsdfHairPrincipled")
    lbsdf.model = "CHIANG"
    lbsdf.parametrization = "MELANIN"
    lbsdf.inputs["Melanin"].default_value = 0.88
    lbsdf.inputs["Melanin Redness"].default_value = 0.35
    lbsdf.inputs["Roughness"].default_value = 0.26
    nt_l.links.new(lbsdf.outputs["BSDF"], out_l.inputs["Surface"])
    anat_info["objects"]["lashes"].data.materials.append(lash_mat)

    brow_mat = bpy.data.materials.new(name="Eyebrow_Material")
    nt_b = brow_mat.node_tree
    out_b = nt_b.nodes.get("Material Output")
    if nt_b.nodes.get("Principled BSDF"):
        nt_b.nodes.remove(nt_b.nodes.get("Principled BSDF"))
    bbsdf = nt_b.nodes.new("ShaderNodeBsdfHairPrincipled")
    bbsdf.model = "CHIANG"
    bbsdf.parametrization = "MELANIN"
    bbsdf.inputs["Melanin"].default_value = 0.62
    bbsdf.inputs["Melanin Redness"].default_value = 0.40
    if "Tint" in bbsdf.inputs:
        bbsdf.inputs["Tint"].default_value = (0.76, 0.60, 0.48, 1.0)
    bbsdf.inputs["Roughness"].default_value = 0.36
    nt_b.links.new(bbsdf.outputs["BSDF"], out_b.inputs["Surface"])
    anat_info["objects"]["brows"].data.materials.append(brow_mat)

    # -------------------------------------------------------------------------
    # 4. Sweater_PinkKnit_Material (Soft Dusty-Pink Shaker-Rib Knitwear with Fuzzy Sheen!)
    # -------------------------------------------------------------------------
    sw_mat = bpy.data.materials.new(name="Sweater_PinkKnit_Material")
    nt_s = sw_mat.node_tree
    bsdf_s = nt_s.nodes.get("Principled BSDF")
    bsdf_s.subsurface_method = "BURLEY"
    bsdf_s.inputs["Subsurface Weight"].default_value = 0.12
    bsdf_s.inputs["Subsurface Scale"].default_value = 0.004
    bsdf_s.inputs["Subsurface Radius"].default_value = (1.0, 0.58, 0.58)
    bsdf_s.inputs["Diffuse Roughness"].default_value = 0.48
    bsdf_s.inputs["Specular IOR Level"].default_value = 0.22
    bsdf_s.inputs["Sheen Weight"].default_value = 0.78
    bsdf_s.inputs["Sheen Roughness"].default_value = 0.46
    bsdf_s.inputs["Sheen Tint"].default_value = (0.98, 0.84, 0.84, 1.0)

    n_ka = nt_s.nodes.new("ShaderNodeTexImage")
    n_ka.image = knit_tex["albedo"][0]
    n_ka.location = (-560, 280)

    n_kr = nt_s.nodes.new("ShaderNodeTexImage")
    n_kr.image = knit_tex["roughness"][0]
    n_kr.location = (-560, 0)

    n_kb_img = nt_s.nodes.new("ShaderNodeTexImage")
    n_kb_img.image = knit_tex["bump"][0]
    n_kb_img.location = (-560, -280)

    n_kb = nt_s.nodes.new("ShaderNodeBump")
    n_kb.inputs["Strength"].default_value = 0.55
    n_kb.inputs["Distance"].default_value = 0.0018
    n_kb.location = (-250, -240)

    nt_s.links.new(n_ka.outputs["Color"], bsdf_s.inputs["Base Color"])
    nt_s.links.new(n_kr.outputs["Color"], bsdf_s.inputs["Roughness"])
    nt_s.links.new(n_kb_img.outputs["Color"], n_kb.inputs["Height"])
    nt_s.links.new(n_kb.outputs["Normal"], bsdf_s.inputs["Normal"])

    sweater_info["sweater_body"].data.materials.append(sw_mat)
    sweater_info["sweater_collar"].data.materials.append(sw_mat)
    for sl_obj in sweater_info["sweater_sleeves"]:
        sl_obj.data.materials.append(sw_mat)

    texture_manifest = [
        {
            "name": "Skin_BaseColor_2K",
            "resolution": [2048, 2048],
            "colorspace": "sRGB",
            "path": os.path.relpath(skin_tex["albedo"][1]),
            "description": "Procedural 2K facial & neck skin albedo rasterized from canonical MakeHuman 3D topology (warm porcelain-ivory complexion, rosy cheek blush, coral-rose smiling lips, double-eyelid shadow, upper-lash tightline, medial caruncle, soft brow shading).",
        },
        {
            "name": "Skin_Roughness_2K",
            "resolution": [2048, 2048],
            "colorspace": "Non-Color",
            "path": os.path.relpath(skin_tex["roughness"][1]),
            "description": "Procedural 2K spatially varying skin roughness (hydrated satin lips, dewy cheeks/nasal tip, moist caruncle, softer forehead/neck).",
        },
        {
            "name": "Skin_MicroBump_2K",
            "resolution": [2048, 2048],
            "colorspace": "Non-Color",
            "path": os.path.relpath(skin_tex["bump"][1]),
            "description": "Procedural 2K restrained facial micro-pore and vertical lip sulci bump heightmap.",
        },
        {
            "name": "Iris_ChestnutBrown_1K",
            "resolution": [1024, 1024],
            "colorspace": "sRGB",
            "path": os.path.relpath(iris_tex[1]),
            "description": "Procedural 1K radial deep chestnut-brown iris stroma fibers, collarette, dark pupil, espresso limbal ring, and warm porcelain sclera.",
        },
        {
            "name": "Sweater_Knit_Albedo_2K",
            "resolution": [2048, 2048],
            "colorspace": "sRGB",
            "path": os.path.relpath(knit_tex["albedo"][1]),
            "description": "Procedural 2K soft dusty-pink fine shaker-rib heather yarn albedo with stitch-valley shading.",
        },
        {
            "name": "Sweater_Knit_Bump_2K",
            "resolution": [2048, 2048],
            "colorspace": "Non-Color",
            "path": os.path.relpath(knit_tex["bump"][1]),
            "description": "Procedural 2K fine 1x1 shaker-rib knit wales, interlocking loops, yarn twist, and micro-fuzz heightmap.",
        },
        {
            "name": "Sweater_Knit_Roughness_2K",
            "resolution": [2048, 2048],
            "colorspace": "Non-Color",
            "path": os.path.relpath(knit_tex["roughness"][1]),
            "description": "Procedural 2K knit yarn fiber roughness map.",
        },
    ]

    return {
        "materials": {
            "skin": skin_mat,
            "eye": eye_mat,
            "cornea": cornea_mat,
            "hair": hair_mat,
            "lashes": lash_mat,
            "brows": brow_mat,
            "sweater": sw_mat,
        },
        "textures": texture_manifest,
    }
