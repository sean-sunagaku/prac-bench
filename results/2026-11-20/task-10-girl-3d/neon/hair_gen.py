"""
hair_gen.py
Generates lush, full, cohesive wavy chestnut 3D Blender Hair Curves (`CURVES` objects):
  1. Hair_Scalp_Cap: dark matte inner scalp base covering crown seamlessly (zero bald wedge,
     cleanly behind temples & visible left ear!)
  2. Hair_Main_Volume: dense glossy chestnut S-wave hair with smooth continuous crown part
     (ZERO bald forehead triangle!), lush cohesive flowing right-side waves draping warmly
     across the front-left pink sweater (ZERO stray floating ribbons!), smooth long left-side
     strands tucked cleanly behind the visible left ear & cascading down over the left shoulder,
     and full wide layered U-hem back waves!
  3. Hair_Bangs_Wispy: iconic dark-chestnut airy see-through Korean/Japanese bangs seamlessly
     rooted into the crown & sweeping delicately across the luminous forehead!
  4. Hair_Flyaways: fine sunlit halo wisps catching bright left window light!
  5. Hair_Eyebrows: sleek, soft, naturally wide feathered warm-brown brows!
  6. Hair_Eyelashes_Upper & Hair_Eyelashes_Lower: lush curved espresso lashes along exact lid rims!
"""
import math
import bpy
import bmesh
import numpy as np
from mathutils import Vector
from mesh_sculpt import transform_head_point, head_pose_matrix


def _create_hair_curves_obj(name, curves_pts_list, curves_rad_list, mat, collection):
    counts = [len(c) for c in curves_pts_list]
    pts_flat = np.concatenate(curves_pts_list, axis=0).astype(np.float32)
    rad_flat = np.concatenate(curves_rad_list, axis=0).astype(np.float32)

    hc = bpy.data.hair_curves.new(f"{name}_Data")
    hc.add_curves(counts)
    hc.points.foreach_set("position", pts_flat.ravel())
    if "radius" not in hc.attributes:
        hc.attributes.new("radius", "FLOAT", "POINT")
    hc.attributes["radius"].data.foreach_set("value", rad_flat)
    hc.materials.append(mat)

    obj = bpy.data.objects.new(name, hc)
    collection.objects.link(obj)
    return obj


def _build_scalp_cap(body_obj, rest_pts, mat_cap, collection):
    """Matte dark-chestnut inner scalp cap sealing crown part cleanly while staying well behind temples/ears."""
    me_src = body_obj.data
    bm = bmesh.new()
    bm.from_mesh(me_src)
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()

    keep_faces = []
    for f in bm.faces:
        c_rest = np.mean([rest_pts[v.index] for v in f.verts], axis=0)
        x, y, z = c_rest
        ax = abs(x)
        is_ear = (ax > 0.050) and (1.482 < z < 1.615) and (-0.120 < y < 0.015)
        is_scalp = (
            (z > 1.636 and y > -0.098)
            or (z > 1.612 and y > -0.048)
            or (z > 1.480 and y > -0.018)
        )
        if is_scalp and not is_ear:
            keep_faces.append(f)

    keep_set = set(keep_faces)
    del_faces = [f for f in bm.faces if f not in keep_set]
    bmesh.ops.delete(bm, geom=del_faces, context="FACES")

    bm.normal_update()
    boundary_verts = {v for e in bm.edges if e.is_boundary for v in e.verts}
    for v in bm.verts:
        # Keep scalp cap strictly flush/recessed (-1.2mm boundary, +0.4mm interior) so it NEVER pokes through bangs!
        v.co += v.normal * (-0.0012 if v in boundary_verts else 0.0004)
    for f in bm.faces:
        f.smooth = True

    me_cap = bpy.data.meshes.new("Hair_Scalp_Cap_Mesh")
    bm.to_mesh(me_cap)
    bm.free()

    obj_cap = bpy.data.objects.new("Hair_Scalp_Cap", me_cap)
    obj_cap.data.materials.append(mat_cap)
    collection.objects.link(obj_cap)
    sub = obj_cap.modifiers.new("Subsurf_Cap", "SUBSURF")
    sub.levels = 2
    sub.render_levels = 2
    return obj_cap


def _push_out_of_collisions(pt_vec, bvh_body, bvh_sweater, head_inv_mat, is_bang=False, is_root=False, is_left_side=False):
    if is_root:
        return pt_vec

    p = pt_vec.copy()
    p_un = Vector((p.x, p.y + 0.012, p.z))
    pr = head_inv_mat @ p_un

    if not is_bang:
        # 1. Frontal face exclusion zone
        if 1.418 < pr.z < 1.608 and pr.y < -0.068:
            rx = 0.066 if pr.x < 0 else 0.077
            el = (pr.x / rx) ** 2 + ((pr.z - 1.515) / 0.088) ** 2
            if el < 1.0:
                if is_left_side or pr.x > 0.004:
                    pr.y = max(pr.y, -0.066 + 0.034 * (1.0 - math.sqrt(el)))
                    pr.x = max(pr.x, 0.065 * (1.0 - 0.14 * el))
                else:
                    target_x = -rx * math.sqrt(max(0.0, 1.0 - ((pr.z - 1.515) / 0.088) ** 2)) - 0.005
                    pr.x = min(pr.x, target_x)

        # 2. Visible LEFT ear (+X) protection ellipsoid
        if pr.x > 0.045 and 1.486 < pr.z < 1.584 and pr.y < -0.014:
            de = ((pr.x - 0.078) / 0.027) ** 2 + ((pr.y + 0.056) / 0.038) ** 2 + ((pr.z - 1.536) / 0.043) ** 2
            if de < 1.0:
                pr.y = max(pr.y, -0.016 + 0.014 * (1.0 - math.sqrt(de)))

        p = transform_head_point(pr)

    # 3. Exact BVH body surface push-out
    loc, nrm, _, _ = bvh_body.find_nearest(p)
    if loc is not None:
        clearance = 0.0036 if is_bang else 0.0045
        signed = (p - loc).dot(nrm)
        if signed < clearance:
            p = loc + nrm * clearance

    # 4. Exact BVH sweater push-out
    loc_s, nrm_s, _, _ = bvh_sweater.find_nearest(p)
    if loc_s is not None:
        clearance_s = 0.0052
        signed_s = (p - loc_s).dot(nrm_s)
        if signed_s < clearance_s:
            p = loc_s + nrm_s * clearance_s

    return p


def _sample_scalp_roots(body_obj, rest_pts, count, seed=1001):
    rng = np.random.default_rng(seed)
    me = body_obj.data

    tris = []
    areas = []
    for poly in me.polygons:
        vs = list(poly.vertices)
        c_r = np.mean([rest_pts[vi] for vi in vs], axis=0)
        x, y, z = c_r
        ax = abs(x)
        is_ear = (ax > 0.058) and (1.488 < z < 1.586) and (-0.100 < y < -0.002)
        is_scalp = (
            (z > 1.608 and y > -0.146)
            or (z > 1.568 and y > -0.100)
            or (z > 1.458 and y > -0.038)
            or (z > 1.530 and ax > 0.056 and y > -0.086)
        )
        if not (is_scalp and not is_ear):
            continue
        for k in range(1, len(vs) - 1):
            i0, i1, i2 = vs[0], vs[k], vs[k + 1]
            p0 = me.vertices[i0].co
            p1 = me.vertices[i1].co
            p2 = me.vertices[i2].co
            cr = (p1 - p0).cross(p2 - p0)
            a = 0.5 * cr.length
            if a > 1e-8:
                n = cr / cr.length
                # Naturally enrich crown-part & front-hairline density 2.2x so normal groomed strands seal the crown cleanly!
                part_boost = 2.2 if (z > 1.605 and abs(x + 0.014) < 0.036 and y > -0.145) else 1.0
                tris.append((p0.copy(), p1.copy(), p2.copy(), n, rest_pts[i0], rest_pts[i1], rest_pts[i2]))
                areas.append(a * part_boost)

    areas = np.array(areas, dtype=np.float64)
    probs = areas / areas.sum()
    idx = rng.choice(len(tris), size=count, p=probs)

    roots_w, norms_w, roots_r = [], [], []
    for ti in idx:
        p0, p1, p2, n, r0, r1, r2 = tris[ti]
        u = rng.random()
        v = rng.random()
        if u + v > 1.0:
            u = 1.0 - u
            v = 1.0 - v
        w = 1.0 - u - v
        roots_w.append(p0 * w + p1 * u + p2 * v)
        norms_w.append(n)
        roots_r.append(r0 * w + r1 * u + r2 * v)
    return roots_w, norms_w, np.array(roots_r, dtype=np.float64)


def _generate_main_hair_and_flyaways(body_obj, rest_pts, bvh_body, bvh_sweater, mat_main, collection, n_strands=34000, n_flyaways=1100):
    """
    Generate full, continuous, lush chestnut wavy hair:
      - Zero bald wedge at forehead/crown part: gentle smooth part-line root flow + dedicated
        soft crown-part filler strands sealing the part cleanly into a natural hairline!
      - Cohesive, full continuous wavy locks (controlled clumping + spatially coherent S-wave
        field -> lush wavy volume with ZERO stray separated cords or gaps!)
      - Iconic right-side cascade draping thickly over right shoulder & diagonally across chest!
      - Smooth long left-side hair sweeping behind visible left ear & cascading over left shoulder!
    """
    rng = np.random.default_rng(2030)
    head_mat = head_pose_matrix()
    head_rot = head_mat.to_3x3()
    head_inv = head_mat.inverted()
    head_center_w = transform_head_point((0.0, -0.055, 1.555))

    n_guides = 260
    g_roots_w, g_norms_w, g_roots_r = _sample_scalp_roots(body_obj, rest_pts, n_guides, seed=3031)

    part_x = -0.014  # subtle natural off-center part matching reference.png
    n_pts = 24
    t_param = np.linspace(0.0, 1.0, n_pts, dtype=np.float64)

    guides_pts = []
    guides_meta = []

    for gi in range(n_guides):
        rw = g_roots_w[gi]
        nw = g_norms_w[gi]
        rr = g_roots_r[gi]
        rx, ry, rz = rr

        is_back = (ry > -0.022) and (rz < 1.615)
        if is_back:
            is_right_side = rx < 0.0
        else:
            is_right_side = rx < part_x
        is_left_side = (not is_back) and (not is_right_side)

        if is_back:
            u_layer = 1.0 - 0.14 * (abs(rx) / 0.085) ** 1.4
            strand_len = rng.uniform(0.45, 0.56) * u_layer
        elif is_right_side:
            strand_len = rng.uniform(0.44, 0.56)
        else:
            # Left side continues long & lush over left shoulder onto pink knit (matching reference.png!)
            strand_len = rng.uniform(0.50, 0.60)

        # Smooth spatially coherent S-wave field -> gorgeous organic salon waves!
        wave_freq = rng.uniform(2.8, 3.6) * math.pi
        wave_phase = 5.0 * rx + 4.2 * ry + rng.uniform(-0.22, 0.22)
        wave_amp_x = rng.uniform(0.026, 0.036) if is_right_side else rng.uniform(0.018, 0.026)
        wave_amp_y = rng.uniform(0.014, 0.022)

        # Gentle natural root sweep away from crown part (tapered softly near part_x so ZERO bald V-wedge!)
        dist_part = abs(rx - part_x)
        part_soft = min(1.0, 0.42 + dist_part / 0.035)
        if is_back:
            side_push = Vector((rx * 1.55, 0.30, 0.0))
        elif is_right_side:
            side_push = Vector((-0.78 * part_soft, -0.22 if ry < -0.06 else 0.10, 0.0))
        else:
            # Left side: gentle front-hugging sweep over temple, tucking behind left ear (NO gaping hole!)
            side_push = Vector((0.76 * part_soft, 0.42 if ry > -0.09 else 0.18, 0.0))

        side_push_w = (head_rot @ side_push).normalized()
        up_w = (head_rot @ Vector((0.0, 0.0, 1.0))).normalized()

        crown_factor = max(0.0, min(1.0, (rz - 1.555) / 0.105))
        lift = (0.008 + 0.008 * crown_factor) * rng.uniform(0.88, 1.12)

        # Virtually all front/side right hair drapes cohesively across front-left pink chest
        drapes_front_right = is_right_side and (ry < 0.024) and (rng.random() < 0.90)
        # Left side: fuller cohesive flow curving smoothly behind left ear & over left shoulder (not one lonely lock!)
        drapes_front_left = is_left_side and (ry < 0.025) and (rng.random() < 0.78)

        pts = [rw.copy()]
        cur = rw.copy()
        seg_len = strand_len / (n_pts - 1)

        for k in range(1, n_pts):
            t = k / (n_pts - 1)
            early = math.exp(-t * 5.8)
            grav = Vector((0.0, 0.0, -1.0))

            if drapes_front_right:
                # Lush cohesive cascade: softly hugs right cheek, then sweeps INWARD (+X) over front-left pink sweater!
                if t < 0.24:
                    steer = Vector((-0.14, -0.18, -0.80))
                elif t < 0.64:
                    steer = Vector((0.50, -0.44, -0.70))
                else:
                    steer = Vector((0.40, -0.14, -0.86))
            elif is_left_side:
                if t < 0.28:
                    steer = Vector((0.38, 0.50, -0.56))
                elif drapes_front_left and t < 0.72:
                    steer = Vector((0.34, -0.24, -0.88))
                else:
                    steer = Vector((0.26, 0.12, -0.92))
            elif is_back:
                fan_x = rx * 2.9 + (0.064 if rx > 0 else -0.064) * (1.0 - 0.35 * t)
                steer = Vector((fan_x, 0.20 * (1.0 - t) + 0.06, -0.90))
            else:
                steer = Vector((-0.18, 0.20, -0.90))

            step_dir = (
                nw * (lift * 4.0 * early)
                + up_w * (0.24 * crown_factor * early)
                + side_push_w * (0.64 * early)
                + grav * (0.56 + 0.44 * t)
                + steer * (0.78 * (1.0 - 0.30 * early))
            )
            step_dir.normalize()
            nxt = cur + step_dir * seg_len
            nxt = _push_out_of_collisions(nxt, bvh_body, bvh_sweater, head_inv, is_bang=False, is_root=False, is_left_side=is_left_side)
            pts.append(nxt)
            cur = nxt

        # Add true cohesive 3D S-waves & gentle curling tips!
        pts_waved = [pts[0]]
        for k in range(1, n_pts):
            t = k / (n_pts - 1)
            w_env = (max(0.0, (t - 0.14) / 0.86) ** 1.05) * (1.0 - 0.08 * t)
            dx = wave_amp_x * math.sin(wave_freq * t + wave_phase) * w_env
            dy = wave_amp_y * math.cos(wave_freq * t * 1.06 + wave_phase + 0.40) * w_env
            tip_t = max(0.0, (t - 0.70) / 0.30)
            curl_x = (0.018 if drapes_front_right else (-0.010 if drapes_front_left else 0.0)) * (tip_t ** 2)
            curl_y = (0.010 if drapes_front_right else -0.006) * (tip_t ** 2)
            p_w = pts[k] + Vector((dx + curl_x, dy + curl_y, 0.0))
            p_w = _push_out_of_collisions(p_w, bvh_body, bvh_sweater, head_inv, is_bang=False, is_root=False, is_left_side=is_left_side)
            pts_waved.append(p_w)

        sm = [pts_waved[0]]
        for k in range(1, n_pts - 1):
            p_sm = pts_waved[k - 1] * 0.20 + pts_waved[k] * 0.60 + pts_waved[k + 1] * 0.20
            p_sm = _push_out_of_collisions(p_sm, bvh_body, bvh_sweater, head_inv, is_bang=False, is_root=False, is_left_side=is_left_side)
            sm.append(p_sm)
        sm.append(pts_waved[-1])
        pts_waved = sm

        guides_pts.append(np.array([p[:] for p in pts_waved], dtype=np.float64))
        guides_meta.append((rw, rr, is_right_side, is_left_side, is_back))

    # --- GENERATE DENSE, SEAMLESS, LUSH WAVY CHILD STRANDS ---
    c_roots_w, _, c_roots_r = _sample_scalp_roots(body_obj, rest_pts, n_strands, seed=3032)
    g_root_arr = np.array([g[0] for g in guides_pts], dtype=np.float64)
    g_zone_arr = np.array([2 if m[4] else (1 if m[2] else 0) for m in guides_meta], dtype=np.int32)

    # Balanced clumping (0.14..0.38): keeps waves lush & continuous WITHOUT splitting into gap-riddled ropes!
    clump_profile = 0.14 + 0.34 * np.sin(math.pi * (t_param ** 0.82))
    base_rad_curve = 0.00020 * (1.0 - 0.72 * (t_param ** 1.32))

    curves_pts = []
    curves_rad = []

    # Main full-volume wavy hair strands (crown-part boost is cleanly integrated into _sample_scalp_roots -> ZERO tangled top mat!)
    for ci in range(n_strands):
        rw = np.array(c_roots_w[ci][:], dtype=np.float64)
        rr = c_roots_r[ci]
        is_back = (rr[1] > -0.022) and (rr[2] < 1.615)
        c_zone = 2 if is_back else (1 if rr[0] < part_x else 0)
        is_left = (c_zone == 0)

        d2 = np.sum((g_root_arr - rw[None, :]) ** 2, axis=1)
        d2 = d2 + np.where(g_zone_arr != c_zone, 0.5, 0.0)
        # Spatially coherent guides allow gentle 82/18 blend with nearest neighbor -> silky gap-free waves!
        top2 = np.argpartition(d2, 2)[:2]
        g0_i, g1_i = int(top2[0]), int(top2[1])
        guide = 0.82 * guides_pts[g0_i] + 0.18 * guides_pts[g1_i]
        root_offset = rw - guide[0]

        len_scale = rng.uniform(0.76, 1.04)
        if len_scale < 0.995:
            ts = t_param * len_scale
            idx_f = ts * (n_pts - 1)
            i0 = np.clip(np.floor(idx_f).astype(np.int32), 0, n_pts - 2)
            frac = (idx_f - i0)[:, None]
            g_sub = guide[i0] * (1.0 - frac) + guide[i0 + 1] * frac
        else:
            g_sub = guide.copy()

        ph_c = rng.uniform(0.0, 2.0 * math.pi)
        amp_c = rng.uniform(0.0020, 0.0068)
        disp_dir = rng.normal(0.0, 1.0, size=3)
        disp_dir[2] *= 0.20
        disp_dir /= np.linalg.norm(disp_dir) + 1e-8

        strand = np.empty((n_pts, 3), dtype=np.float64)
        for k in range(n_pts):
            tk = t_param[k]
            off = root_offset * (1.0 - clump_profile[k] * 0.58)
            frizz = disp_dir * (amp_c * (0.15 + 0.92 * tk) * math.sin(tk * 6.5 + ph_c))
            p_k = g_sub[k] + off + frizz
            if k > 0 and (k % 2 == 1 or k == n_pts - 1):
                pv = _push_out_of_collisions(Vector(p_k.tolist()), bvh_body, bvh_sweater, head_inv, is_bang=False, is_root=False, is_left_side=is_left)
                p_k = np.array(pv[:], dtype=np.float64)
            strand[k] = p_k

        for k in range(2, n_pts - 1, 2):
            strand[k] = 0.5 * strand[k] + 0.25 * (strand[k - 1] + strand[k + 1])

        curves_pts.append(strand)
        curves_rad.append(base_rad_curve * rng.uniform(0.80, 1.18))

    obj_main = _create_hair_curves_obj("Hair_Main_Volume", curves_pts, curves_rad, mat_main, collection)

    # --- DELICATE RIM-LIT AIRY FLYAWAYS ---
    fly_pts, fly_rad = [], []
    fly_rad_base = 0.000075 * (1.0 - 0.70 * (t_param ** 1.2))
    for _ in range(n_flyaways):
        gi = rng.integers(0, len(guides_pts))
        guide = guides_pts[gi]
        out_dir = Vector(guide[3].tolist()) - head_center_w
        out_dir.z *= 0.28
        if out_dir.length < 1e-5:
            out_dir = Vector((1.0, 0.0, 0.0))
        out_dir.normalize()

        ph = rng.uniform(0.0, 2.0 * math.pi)
        halo_amp = rng.uniform(0.005, 0.016)
        frq = rng.uniform(4.8, 8.5)
        f_strand = np.empty((n_pts, 3), dtype=np.float64)
        for k in range(n_pts):
            tk = t_param[k]
            env = math.sin(math.pi * min(tk * 1.05, 1.0)) * (0.16 + 0.84 * tk)
            f_strand[k] = guide[k] + np.array([
                out_dir.x * halo_amp * env + 0.0045 * math.sin(frq * tk + ph) * env,
                out_dir.y * halo_amp * env + 0.0045 * math.cos(frq * tk + ph) * env,
                0.0025 * math.sin(frq * 0.7 * tk + ph) * env,
            ])
        fly_pts.append(f_strand)
        fly_rad.append(fly_rad_base * rng.uniform(0.70, 1.15))

    obj_fly = _create_hair_curves_obj("Hair_Flyaways", fly_pts, fly_rad, mat_main, collection)
    return obj_main, obj_fly


def _generate_wispy_bangs_and_tendrils(bvh_body, bvh_sweater, mat_bangs, collection):
    """
    Generate iconic dark-chestnut airy see-through Korean/Japanese bangs seamlessly rooted
    up into the upper crown part (ZERO bald forehead wedge!) curving delicately across her forehead!
    """
    rng = np.random.default_rng(5071)
    head_inv = head_pose_matrix().inverted()

    curves_pts, curves_rad = [], []
    n_pts = 18
    t_param = np.linspace(0.0, 1.0, n_pts, dtype=np.float64)

    # 15 crisp, delicately separated chestnut air-bang tufts rooted high up into the crown (z~1.632!)
    # so roots blend invisibly with the crown part while tips separate cleanly into airy wisps over brows!
    tuft_specs = [
        (-0.044, -0.014, 0.130, 42, 0.012),
        (-0.036, -0.006, 0.112, 36, 0.011),
        (-0.029,  0.001, 0.098, 32, 0.010),
        (-0.022,  0.007, 0.090, 28, 0.010),
        (-0.016,  0.011, 0.085, 26, 0.010),
        (-0.010,  0.014, 0.082, 24, 0.010),
        (-0.004,  0.017, 0.082, 24, 0.010),
        ( 0.002,  0.020, 0.084, 26, 0.010),
        ( 0.008,  0.023, 0.087, 28, 0.010),
        ( 0.014,  0.026, 0.092, 30, 0.010),
        ( 0.021,  0.028, 0.100, 34, 0.011),
        ( 0.028,  0.028, 0.110, 38, 0.011),
        ( 0.036,  0.024, 0.120, 40, 0.011),
    ]

    for tx_root, tx_drift, t_len, n_s, loft in tuft_specs:
        # Root smoothly right inside upper forehead hairline so bangs emerge naturally from combed crown!
        z_root_r = 1.627 - 0.45 * (tx_root ** 2)
        y_root_r = -0.123 + 0.85 * (tx_root ** 2)
        ph = rng.uniform(0.0, 2.0 * math.pi)

        for _ in range(n_s):
            rx = tx_root + rng.normal(0.0, 0.0022)
            ry = y_root_r + rng.normal(0.0, 0.0040)
            rz = z_root_r + rng.normal(0.0, 0.0024)
            root_w = transform_head_point((rx, ry, rz))
            loc, nrm, _, _ = bvh_body.find_nearest(root_w)
            if loc is not None:
                root_w = loc + nrm * 0.0006

            s_len = t_len * rng.uniform(0.86, 1.12)
            s_drift = tx_drift + rng.normal(0.0, 0.0032)
            s_loft = loft * rng.uniform(0.88, 1.15)

            pts = np.empty((n_pts, 3), dtype=np.float64)
            for k in range(n_pts):
                tk = t_param[k]
                x_r = rx + s_drift * (tk ** 1.32) + 0.0014 * math.sin(tk * 4.2 + ph) * tk
                y_arch = -s_loft * math.sin(math.pi * (tk ** 0.72)) - 0.019 * (tk ** 0.60)
                y_r = ry + y_arch + 0.010 * (tk ** 2.2) + 0.85 * (x_r ** 2 - rx ** 2)
                z_r = rz - s_len * (tk ** 1.06) + 0.004 * math.sin(math.pi * tk) * (1.0 - tk)
                pw = transform_head_point((x_r, y_r, z_r))
                if k > 0:
                    pw = _push_out_of_collisions(pw, bvh_body, bvh_sweater, head_inv, is_bang=True, is_root=False)
                pts[k] = pw[:]

            rad = (0.000135 * (1.0 - 0.76 * (t_param ** 1.18))) * rng.uniform(0.78, 1.18)
            curves_pts.append(pts)
            curves_rad.append(rad)

    # Delicate right-cheek framing wavy strands
    for _ in range(210):
        rx = -rng.uniform(0.048, 0.066)
        ry = rng.uniform(-0.114, -0.082)
        rz = rng.uniform(1.564, 1.602)
        s_len = rng.uniform(0.18, 0.30)
        ph = rng.uniform(0.0, 2.0 * math.pi)
        pts = np.empty((n_pts, 3), dtype=np.float64)
        for k in range(n_pts):
            tk = t_param[k]
            x_r = rx - (0.012 * math.sin(math.pi * tk) - 0.014 * (tk ** 1.5)) + 0.007 * math.sin(tk * 6.0 + ph) * tk
            y_r = ry - 0.016 * math.sin(math.pi * min(tk * 0.9, 1.0)) + 0.010 * (tk ** 1.8)
            z_r = rz - s_len * tk
            pw = transform_head_point((x_r, y_r, z_r))
            if k > 0:
                pw = _push_out_of_collisions(pw, bvh_body, bvh_sweater, head_inv, is_bang=True, is_root=False)
            pts[k] = pw[:]
        rad = (0.000155 * (1.0 - 0.75 * (t_param ** 1.25))) * rng.uniform(0.78, 1.15)
        curves_pts.append(pts)
        curves_rad.append(rad)

    # Whisper-fine delicate sideburn wisp softly curving just in front of visible left ear
    for _ in range(30):
        rx = rng.uniform(0.060, 0.068)
        ry = rng.uniform(-0.088, -0.072)
        rz = rng.uniform(1.545, 1.568)
        s_len = rng.uniform(0.075, 0.125)
        ph = rng.uniform(0.0, 2.0 * math.pi)
        pts = np.empty((n_pts, 3), dtype=np.float64)
        for k in range(n_pts):
            tk = t_param[k]
            x_r = rx + 0.004 * math.sin(math.pi * tk) + 0.002 * math.sin(tk * 5.0 + ph) * tk
            y_r = ry + 0.012 * (tk ** 1.2) - 0.006 * math.sin(math.pi * tk)
            z_r = rz - s_len * tk
            pw = transform_head_point((x_r, y_r, z_r))
            if k > 0:
                pw = _push_out_of_collisions(pw, bvh_body, bvh_sweater, head_inv, is_bang=True, is_root=False)
            pts[k] = pw[:]
        rad = (0.000095 * (1.0 - 0.78 * (t_param ** 1.2))) * rng.uniform(0.75, 1.15)
        curves_pts.append(pts)
        curves_rad.append(rad)

    return _create_hair_curves_obj("Hair_Bangs_Wispy", curves_pts, curves_rad, mat_bangs, collection)


def _generate_eyebrows(bvh_body, mat_brows, collection):
    """Sleek, soft, naturally wide feathered warm-brown Korean eyebrows (NO harsh gap or spiky bristles!)."""
    rng = np.random.default_rng(6064)
    head_rot = head_pose_matrix().to_3x3()
    curves_pts, curves_rad = [], []
    n_pts = 5
    t_param = np.linspace(0.0, 1.0, n_pts, dtype=np.float64)

    for side in (-1.0, +1.0):
        for _ in range(950):
            u = rng.beta(1.35, 1.45)
            # Full natural feminine brow span from inner eye corner (0.0105) past outer corner (0.0525)!
            ax = 0.0105 + u * 0.0420
            brow_center_z = 1.5624 + 0.0016 * math.sin(u * math.pi * 0.85) - 0.0024 * (max(0.0, (u - 0.65) / 0.35) ** 1.4)
            half_h = 0.0027 * (1.0 - 0.56 * (u ** 1.5)) + 0.00045
            dz = max(-half_h, min(half_h, rng.normal(0.0, half_h * 0.52)))

            probe_w = transform_head_point((side * ax, -0.155, brow_center_z + dz))
            loc, nrm, _, _ = bvh_body.find_nearest(probe_w)
            if loc is None:
                continue
            root = loc - nrm * 0.00020

            up_bias = 0.22 * (1.0 - u) - 0.14 * (dz / (half_h + 1e-6)) - 0.18 * u
            grow_w = (head_rot @ Vector((side * (0.85 + 0.15 * u), 0.0, up_bias)).normalized()).normalized()
            grow_tan = (grow_w - nrm * grow_w.dot(nrm)).normalized()

            h_len = rng.uniform(0.0040, 0.0064) * (1.0 - 0.24 * u)
            pts = np.empty((n_pts, 3), dtype=np.float64)
            for k in range(n_pts):
                tk = t_param[k]
                # Ultra-sleek velvety brow hairs hugging skin (0.18mm loft -> soft powdery Korean brow!)
                loft = 0.00018 * math.sin(math.pi * min(tk * 0.85, 1.0)) + 0.00008 * tk
                pts[k] = (root + grow_tan * (h_len * tk) + nrm * loft)[:]

            curves_pts.append(pts)
            curves_rad.append((0.000040 * (1.0 - 0.76 * t_param)) * rng.uniform(0.75, 1.10))

    return _create_hair_curves_obj("Hair_Eyebrows", curves_pts, curves_rad, mat_brows, collection)


def _generate_eyelashes(lash_curves, mat_lashes, collection):
    """Lush, clearly defined, delicately curled dark espresso eyelashes framing the large warm eyes."""
    rng = np.random.default_rng(7074)
    head_rot = head_pose_matrix().to_3x3()
    fwd_w = (head_rot @ Vector((0.0, -1.0, 0.0))).normalized()
    up_w = (head_rot @ Vector((0.0, 0.0, 1.0))).normalized()

    def build_lid(is_upper):
        curves_pts, curves_rad = [], []
        n_pts = 7
        t_param = np.linspace(0.0, 1.0, n_pts, dtype=np.float64)
        keys = ("helper-l-eyelashes-2", "helper-r-eyelashes-2") if is_upper else ("helper-l-eyelashes-1", "helper-r-eyelashes-1")
        for key in keys:
            side = +1.0 if "-l-" in key else -1.0
            poly = lash_curves.get(key)
            if poly is None or len(poly) < 4:
                continue
            if abs(poly[0][0]) > abs(poly[-1][0]):
                poly = poly[::-1]
            n_lashes = 180 if is_upper else 62
            side_w = (head_rot @ Vector((side, 0.0, 0.0))).normalized()

            for li in range(n_lashes):
                u = (li + rng.uniform(0.15, 0.85)) / n_lashes
                u_eff = 0.05 + 0.92 * u
                idx_f = u_eff * (len(poly) - 1)
                i0 = min(int(math.floor(idx_f)), len(poly) - 2)
                frac = idx_f - i0
                root = Vector((poly[i0] * (1.0 - frac) + poly[i0 + 1] * frac).tolist())
                root += up_w * rng.normal(0.0, 0.00018) + fwd_w * rng.uniform(-0.0002, 0.0003)

                if is_upper:
                    # Delicate, silky natural Asian upper lashes curving gently forward-outward (NO spider legs!)
                    len_prof = 0.50 + 0.56 * math.sin(math.pi * (u ** 0.78))
                    lash_len = 0.0058 * len_prof * rng.uniform(0.86, 1.14)
                    fan = (u - 0.35) * 0.55
                    curl_up = 0.44 + 0.20 * u
                    r_base = 0.000072
                else:
                    len_prof = 0.46 + 0.50 * math.sin(math.pi * (u ** 0.85))
                    lash_len = 0.0030 * len_prof * rng.uniform(0.80, 1.12)
                    fan = (u - 0.35) * 0.42
                    curl_up = -0.46
                    r_base = 0.000048

                pts = np.empty((n_pts, 3), dtype=np.float64)
                jitter_f = rng.normal(0.0, 0.05)
                for k in range(n_pts):
                    tk = t_param[k]
                    if is_upper:
                        d_fwd = lash_len * (tk * 0.88 - 0.22 * (tk ** 2.4))
                        d_up = lash_len * (-0.12 * tk + curl_up * (tk ** 1.85))
                    else:
                        d_fwd = lash_len * (tk * 0.85)
                        d_up = lash_len * (curl_up * (tk ** 1.35))
                    d_side = lash_len * (fan + jitter_f) * (tk ** 1.2)
                    pts[k] = (root + fwd_w * d_fwd + up_w * d_up + side_w * d_side)[:]

                curves_pts.append(pts)
                curves_rad.append((r_base * (1.0 - 0.84 * (t_param ** 1.1))) * rng.uniform(0.85, 1.15))

        name = "Hair_Eyelashes_Upper" if is_upper else "Hair_Eyelashes_Lower"
        return _create_hair_curves_obj(name, curves_pts, curves_rad, mat_lashes, collection)

    return build_lid(True), build_lid(False)


def build_all_hair(collection, body_info, sweater_info, mats, preview=False):
    body_obj = body_info["body_obj"]
    rest_pts = body_info["sculpted_rest_pts"]
    bvh_body = body_info["bvh_body"]
    bvh_sweater = sweater_info["bvh_sweater"]

    scalp_cap = _build_scalp_cap(body_obj, rest_pts, mats["hair_cap"], collection)
    n_main = 20000 if preview else 34000
    n_fly = 550 if preview else 1150
    hair_main, hair_fly = _generate_main_hair_and_flyaways(
        body_obj, rest_pts, bvh_body, bvh_sweater, mats["hair_main"], collection,
        n_strands=n_main, n_flyaways=n_fly,
    )
    hair_bangs = _generate_wispy_bangs_and_tendrils(bvh_body, bvh_sweater, mats["hair_bangs"], collection)
    hair_brows = _generate_eyebrows(bvh_body, mats["hair_brows"], collection)
    lashes_up, lashes_lo = _generate_eyelashes(body_info["lash_curves"], mats["hair_lashes"], collection)

    return {
        "scalp_cap": scalp_cap,
        "hair_main": hair_main,
        "hair_flyaways": hair_fly,
        "hair_bangs": hair_bangs,
        "hair_brows": hair_brows,
        "lashes_upper": lashes_up,
        "lashes_lower": lashes_lo,
    }
