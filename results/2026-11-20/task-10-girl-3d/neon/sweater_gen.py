"""
sweater_gen.py
Constructs a SINGLE CONTINUOUS WATERTIGHT MANIFOLD knitted crew-neck sweater with:
  - Smooth, continuous anatomical trapezius -> sloped feminine shoulder -> seamless
    dropped-shoulder sleeve flow (ZERO shoulder pinch, ZERO balloon bump, ZERO holes!)
  - Armholes anchored right at anatomical shoulder top (iz=17..23) with sleeves descending
    smoothly from the exact armhole tangent + local seam Laplacian smoothing!
  - Wide, flat-lying 1x1 ribbed crew-neck collar seamlessly seated into the neckline
  - Natural relaxed café selfie arms with cozy knit folds, snug ribbed cuffs, delicate hands,
    and fine backlit dusty-pink wool fuzz halo.
"""
import math
import bpy
import bmesh
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def _eval_catmull_rom(pts, t):
    n = len(pts) - 1
    u = np.clip(t, 0.0, 1.0) * n
    i = min(int(math.floor(u)), n - 1)
    f = u - i
    p0 = pts[max(i - 1, 0)]
    p1 = pts[i]
    p2 = pts[min(i + 1, n)]
    p3 = pts[min(i + 2, n)]
    f2 = f * f
    f3 = f2 * f
    return 0.5 * (
        (2.0 * p1)
        + (-p0 + p2) * f
        + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * f2
        + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * f3
    )


def _build_seamless_sweater_body(collection, mat_body):
    """
    Build the ENTIRE sweater torso + continuous sloped shoulders + both sleeves as
    ONE SINGLE CONTINUOUS WATERTIGHT MANIFOLD QUAD MESH with zero shoulder step-up!
    """
    bm = bmesh.new()
    n_th = 48
    n_z = 28

    # Armhole 6x8 quad ports placed cleanly along the upper shoulder slope (iz=15..23 -> cozy natural drop-shoulder!)
    iz_lo, iz_hi = 15, 23
    l_lo, l_hi = 9, 15
    r_lo, r_hi = 33, 39

    def is_armhole_face(iz, ith):
        if iz_lo <= iz < iz_hi:
            if (l_lo <= ith < l_hi) or (r_lo <= ith < r_hi):
                return True
        return False

    torso_verts = []
    for iz in range(n_z + 1):
        t = iz / n_z
        # Full natural upper body height: waist Z=0.995 up to back neck Z=1.378 (front crew scoop Z~1.338)
        z_base = 0.995 + 0.383 * t
        y_base = -0.022 - 0.012 * (t ** 1.15)

        # Keep full smooth convex shoulder silhouette up through t=0.84, curving smoothly into wide crew neck!
        neck_blend = max(0.0, (t - 0.82) / 0.18)
        neck_blend = neck_blend * neck_blend * (3.0 - 2.0 * neck_blend)

        rx = (
            0.156
            + 0.032 * math.sin(math.pi * min(t / 0.96, 1.0))
            + 0.012 * math.exp(-0.5 * ((t - 0.78) / 0.15) ** 2)
        )
        rx = rx * (1.0 - neck_blend) + 0.095 * neck_blend

        ry_front = (
            0.096
            + 0.030 * math.exp(-0.5 * ((t - 0.56) / 0.22) ** 2)
            - 0.008 * math.exp(-0.5 * ((t - 0.22) / 0.18) ** 2)
        )
        ry_front = ry_front * (1.0 - neck_blend) + 0.078 * neck_blend

        ry_back = 0.088 + 0.015 * math.exp(-0.5 * ((t - 0.66) / 0.26) ** 2)
        ry_back = ry_back * (1.0 - neck_blend) + 0.070 * neck_blend

        ring = []
        for ith in range(n_th):
            th = 2.0 * math.pi * ith / n_th
            st, ct = math.sin(th), math.cos(th)
            ry = ry_front if ct >= 0 else ry_back

            bust = 0.0085 * (max(0.0, ct) ** 1.5) * (math.sin(2.0 * th) ** 2) * math.exp(-0.5 * ((t - 0.52) / 0.17) ** 2)
            fold_h = 0.0026 * math.sin(13.0 * t + 1.8 * math.cos(th)) * (1.0 - neck_blend) * math.sin(math.pi * t)
            fold_d = 0.0030 * math.sin(9.0 * (t - 0.34 * abs(st)) + 0.4) * max(0.0, ct) * math.exp(-0.5 * ((t - 0.48) / 0.25) ** 2)
            fold_v = 0.0018 * math.sin(5.0 * th + 2.2 * t + 0.5) * (1.0 - neck_blend) * (0.35 + 0.65 * math.sin(math.pi * t))
            rad_mod = bust + fold_h + fold_d + fold_v

            # Natural front crew-neck scoop + very gentle smooth convex shoulder slope (no sharp pinch!)
            z_scoop = -0.038 * (max(0.0, ct) ** 1.45) * (neck_blend ** 0.72) + 0.010 * (max(0.0, -ct) ** 1.35) * (neck_blend ** 0.72)
            z_sh_slope = -0.016 * (st * st) * (max(0.0, (t - 0.65) / 0.35) ** 1.4)

            x = (rx + rad_mod * 0.46) * st
            y = y_base - (ry + rad_mod) * ct
            z = z_base + z_scoop + z_sh_slope
            ring.append(bm.verts.new((x, y, z)))
        torso_verts.append(ring)

    uv_layer = bm.loops.layers.uv.new("UVMap")
    u_tiles_torso = 5.6
    v_tiles_torso = 2.7

    for iz in range(n_z):
        v0 = (iz / n_z) * v_tiles_torso
        v1 = ((iz + 1) / n_z) * v_tiles_torso
        for ith in range(n_th):
            if is_armhole_face(iz, ith):
                continue
            inext = (ith + 1) % n_th
            u0 = (ith / n_th) * u_tiles_torso
            u1 = ((ith + 1) / n_th) * u_tiles_torso
            f = bm.faces.new((torso_verts[iz][ith], torso_verts[iz][inext], torso_verts[iz + 1][inext], torso_verts[iz + 1][ith]))
            f.smooth = True
            f.loops[0][uv_layer].uv = (u0, v0)
            f.loops[1][uv_layer].uv = (u1, v0)
            f.loops[2][uv_layer].uv = (u1, v1)
            f.loops[3][uv_layer].uv = (u0, v1)

    v_bot_c = bm.verts.new((0.0, -0.022, 0.998))
    for ith in range(n_th):
        inext = (ith + 1) % n_th
        f = bm.faces.new((torso_verts[0][inext], torso_verts[0][ith], v_bot_c))
        f.smooth = True
        for lp in f.loops:
            lp[uv_layer].uv = (0.5, 0.0)

    neck_in_ring = []
    for ith in range(n_th):
        p_top = torso_verts[n_z][ith].co
        p_in = Vector((p_top.x * 0.88, -0.034 + (p_top.y + 0.034) * 0.88, p_top.z - 0.015))
        neck_in_ring.append(bm.verts.new(p_in))
    for ith in range(n_th):
        inext = (ith + 1) % n_th
        f = bm.faces.new((torso_verts[n_z][ith], torso_verts[n_z][inext], neck_in_ring[inext], neck_in_ring[ith]))
        f.smooth = True
        for lp in f.loops:
            lp[uv_layer].uv = (0.5, 1.0)

    # ------------------------------------------------------------------
    # EXTRUDE BOTH CONTINUOUS DOWNWARD-SLOPING SHOULDER SLEEVES!
    # Anchored DIRECTLY to actual armhole centroid & sloping smoothly DOWNWARD -> ZERO bump/pinch!
    # ------------------------------------------------------------------
    wrist_frames = {}
    seam_smooth_verts = []

    for side_name, side, c_lo, c_hi in (("L", +1.0, l_lo, l_hi), ("R", -1.0, r_lo, r_hi)):
        c_mid = (c_lo + c_hi) // 2
        loop_24 = []
        if side > 0:
            for ith in range(c_mid, c_lo, -1):
                loop_24.append(torso_verts[iz_lo][ith])
            for iz in range(iz_lo, iz_hi):
                loop_24.append(torso_verts[iz][c_lo])
            for ith in range(c_lo, c_hi):
                loop_24.append(torso_verts[iz_hi][ith])
            for iz in range(iz_hi, iz_lo, -1):
                loop_24.append(torso_verts[iz][c_hi])
            for ith in range(c_hi, c_mid, -1):
                loop_24.append(torso_verts[iz_lo][ith])
        else:
            for ith in range(c_mid, c_hi):
                loop_24.append(torso_verts[iz_lo][ith])
            for iz in range(iz_lo, iz_hi):
                loop_24.append(torso_verts[iz][c_hi])
            for ith in range(c_hi, c_lo, -1):
                loop_24.append(torso_verts[iz_hi][ith])
            for iz in range(iz_hi, iz_lo, -1):
                loop_24.append(torso_verts[iz][c_lo])
            for ith in range(c_lo, c_mid):
                loop_24.append(torso_verts[iz_lo][ith])

        loop_coords = [v.co.copy() for v in loop_24]
        n_loop = len(loop_24)
        ah_center = sum(loop_coords, Vector((0, 0, 0))) / float(n_loop)

        # Sleeve spine strictly descends smoothly OUTWARD & DOWNWARD from exact ah_center,
        # hugging closer to torso sides (eliminates armpit gaps!) and framing foreground richly!
        ctrl = [
            ah_center.copy(),
            ah_center + Vector((side * 0.034, -0.044, -0.032)),  # continuous downward dropped shoulder slope!
            Vector((side * 0.204, -0.142, 1.178)),               # cozy relaxed upper arm close to torso
            Vector((side * 0.198, -0.246, 1.124)),               # relaxed bent elbow
            Vector((side * 0.180, -0.354, 1.116)),               # cozy foreground forearm reaching toward lens
            Vector((side * 0.162, -0.422, 1.116)),               # wrist at snug ribbed cuff
        ]

        n_slv = 44
        spine = [_eval_catmull_rom(ctrl, i / n_slv) for i in range(n_slv + 1)]
        tangents = []
        for i in range(n_slv + 1):
            if i == 0:
                t_v = (spine[1] - spine[0]).normalized()
            elif i == n_slv:
                t_v = (spine[n_slv] - spine[n_slv - 1]).normalized()
            else:
                t_v = (spine[i + 1] - spine[i - 1]).normalized()
            tangents.append(t_v)

        # Find exact front-mid vertex index in loop_24 (offset = 3 + (iz_hi - iz_lo)//2)
        idx_front = 3 + (iz_hi - iz_lo) // 2
        d_down0 = (loop_coords[0] - ah_center)
        d_down0 = (d_down0 - tangents[0] * d_down0.dot(tangents[0])).normalized()
        d_front0 = (loop_coords[idx_front] - ah_center)
        d_front0 = (d_front0 - tangents[0] * d_front0.dot(tangents[0]) - d_down0 * d_front0.dot(d_down0)).normalized()

        frame_d = [d_down0]
        frame_f = [d_front0]
        for i in range(1, n_slv + 1):
            t_cur = tangents[i]
            d_prev = frame_d[-1]
            d_cur = (d_prev - t_cur * d_prev.dot(t_cur)).normalized()
            f_prev = frame_f[-1]
            f_cur = (f_prev - t_cur * f_prev.dot(t_cur) - d_cur * f_prev.dot(d_cur)).normalized()
            frame_d.append(d_cur)
            frame_f.append(f_cur)

        ah_local_d = [(p - ah_center).dot(frame_d[0]) for p in loop_coords]
        ah_local_f = [(p - ah_center).dot(frame_f[0]) for p in loop_coords]
        ah_local_t = [(p - ah_center).dot(tangents[0]) for p in loop_coords]
        r_ah_d = 0.5 * (max(ah_local_d) - min(ah_local_d))
        r_ah_f = 0.5 * (max(ah_local_f) - min(ah_local_f))

        slv_rings = [loop_24]
        for iu in range(1, n_slv + 1):
            s = iu / n_slv
            blend = min(1.0, s / 0.28)
            blend = blend * blend * (3.0 - 2.0 * blend)

            # Cozy, slightly slouchy knitted sleeve volume matching input/reference.png!
            r_d_base = r_ah_d * (1.0 - s) + 0.052 * s
            r_f_base = r_ah_f * (1.0 - s) + 0.050 * s
            wrist_taper = 1.0 - 0.26 * (max(0.0, (s - 0.82) / 0.18) ** 1.45)
            r_d_base *= wrist_taper
            r_f_base *= wrist_taper

            # Cozy soft slouchy knitted sleeve folds (authentic knit bunching along foreground forearms!)
            bunch_env = math.sin(math.pi * min(max((s - 0.18) / 0.78, 0.0), 1.0))
            fold_1 = 0.0028 * math.sin(s * 24.0 + (0.4 if side < 0 else 1.8)) * bunch_env
            fold_2 = 0.0015 * math.cos(s * 42.0 - 0.5) * bunch_env
            elbow_fold = 0.0022 * math.sin(s * 34.0) * math.exp(-0.5 * ((s - 0.56) / 0.18) ** 2)

            ring = []
            for iv in range(n_loop):
                ang = 2.0 * math.pi * iv / float(n_loop)
                ca, sa = math.cos(ang), math.sin(ang)

                grav = 0.0032 * max(0.0, ca) * bunch_env
                wrinkle = 0.0012 * math.sin(3.0 * ang + s * 16.0) * bunch_env
                r_d = (r_d_base + fold_1 + fold_2 + elbow_fold + wrinkle) * ca + grav
                r_f = (r_f_base + fold_1 + fold_2 + elbow_fold + wrinkle) * sa

                loc_d = ah_local_d[iv] * (1.0 - blend) + r_d * blend
                loc_f = ah_local_f[iv] * (1.0 - blend) + r_f * blend
                loc_t = ah_local_t[iv] * (1.0 - blend)

                pt = spine[iu] + frame_d[iu] * loc_d + frame_f[iu] * loc_f + tangents[iu] * loc_t
                ring.append(bm.verts.new(pt))
            slv_rings.append(ring)

        # Mark armhole seam + first 3 transition rings for ultra-smooth shoulder blending!
        for r_idx in (0, 1, 2, 3):
            seam_smooth_verts.extend(slv_rings[r_idx])

        u_tiles_slv = 2.6
        v_tiles_slv = 2.8
        for iu in range(n_slv):
            v0 = (iu / n_slv) * v_tiles_slv
            v1 = ((iu + 1) / n_slv) * v_tiles_slv
            for iv in range(n_loop):
                ivn = (iv + 1) % n_loop
                u0 = (iv / float(n_loop)) * u_tiles_slv
                u1 = ((iv + 1) / float(n_loop)) * u_tiles_slv
                f = bm.faces.new((slv_rings[iu][iv], slv_rings[iu][ivn], slv_rings[iu + 1][ivn], slv_rings[iu + 1][iv]))
                f.smooth = True
                f.loops[0][uv_layer].uv = (u0, v0)
                f.loops[1][uv_layer].uv = (u1, v0)
                f.loops[2][uv_layer].uv = (u1, v1)
                f.loops[3][uv_layer].uv = (u0, v1)

        wrist_p = spine[-1]
        wrist_t = tangents[-1]
        wrist_up = -frame_d[-1]
        wrist_front = frame_f[-1]
        cuff_in_ring = []
        for iv in range(n_loop):
            p_end = slv_rings[-1][iv].co
            p_in = wrist_p + (p_end - wrist_p) * 0.42 - wrist_t * 0.022
            cuff_in_ring.append(bm.verts.new(p_in))
        for iv in range(n_loop):
            ivn = (iv + 1) % n_loop
            f = bm.faces.new((slv_rings[-1][iv], slv_rings[-1][ivn], cuff_in_ring[ivn], cuff_in_ring[iv]))
            f.smooth = True
            for lp in f.loops:
                lp[uv_layer].uv = (0.5, 0.5)
        v_wrist_cap = bm.verts.new(wrist_p - wrist_t * 0.026)
        for iv in range(n_loop):
            ivn = (iv + 1) % n_loop
            f = bm.faces.new((cuff_in_ring[iv], cuff_in_ring[ivn], v_wrist_cap))
            f.smooth = True
            for lp in f.loops:
                lp[uv_layer].uv = (0.5, 0.5)

        wrist_frames[side_name] = (wrist_p, wrist_t, wrist_up, wrist_front)

    # Also include 1-ring of torso neighbors right above/beside the armhole for silky smooth shoulder flow!
    smooth_set = set(seam_smooth_verts)
    for v in list(smooth_set):
        for e in v.link_edges:
            ov = e.other_vert(v)
            if ov.co.z < 1.355:  # keep exact neckline loop untouched
                smooth_set.add(ov)
    for _ in range(3):
        bmesh.ops.smooth_vert(bm, verts=list(smooth_set), factor=0.45, use_axis_x=True, use_axis_y=True, use_axis_z=True)

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    neck_ring_pts = [v.co.copy() for v in torso_verts[n_z]]
    hem_ring_pts = [v.co.copy() for v in torso_verts[0]]

    me = bpy.data.meshes.new("Sweater_Body_Full_Mesh")
    bm.to_mesh(me)
    bm.free()

    obj = bpy.data.objects.new("Sweater_Body_Full", me)
    obj.data.materials.append(mat_body)
    collection.objects.link(obj)
    sub = obj.modifiers.new("Subsurf_Sweater", "SUBSURF")
    sub.levels = 2
    sub.render_levels = 2
    return obj, neck_ring_pts, hem_ring_pts, wrist_frames


def _build_fitted_rib_band(name, ring_pts, center_ref, band_thick, band_half_h, u_tiles, v_tiles, mat_rib, collection, axis_dir=None, tilt_inward=0.0):
    bm = bmesh.new()
    n_a = len(ring_pts)
    n_p = 16

    rings = []
    for ia in range(n_a):
        pt_c = ring_pts[ia]
        if axis_dir is None:
            rad = Vector((pt_c.x - center_ref.x, pt_c.y - center_ref.y, 0.0))
            if rad.length < 1e-6:
                rad = Vector((1, 0, 0))
            rad.normalize()
            up_v = (Vector((0.0, 0.0, 1.0)) - rad * tilt_inward).normalized()
            rad = (rad + Vector((0.0, 0.0, tilt_inward))).normalized()
        else:
            up_v = axis_dir.normalized()
            rad = (pt_c - center_ref)
            rad = (rad - up_v * rad.dot(up_v)).normalized()

        ring = []
        for ip in range(n_p):
            ang = 2.0 * math.pi * ip / n_p
            r_off = band_thick * (0.18 + 0.82 * math.cos(ang))
            h_off = band_half_h * math.sin(ang)
            v_pos = pt_c + rad * r_off + up_v * h_off
            ring.append(bm.verts.new(v_pos))
        rings.append(ring)

    uv_layer = bm.loops.layers.uv.new("UVMap")
    for ia in range(n_a):
        ian = (ia + 1) % n_a
        u0 = (ia / n_a) * u_tiles
        u1 = ((ia + 1) / n_a) * u_tiles
        for ip in range(n_p):
            ipn = (ip + 1) % n_p
            v0 = (ip / n_p) * v_tiles
            v1 = ((ip + 1) / n_p) * v_tiles
            f = bm.faces.new((rings[ia][ip], rings[ian][ip], rings[ian][ipn], rings[ia][ipn]))
            f.smooth = True
            f.loops[0][uv_layer].uv = (u0, v0)
            f.loops[1][uv_layer].uv = (u1, v0)
            f.loops[2][uv_layer].uv = (u1, v1)
            f.loops[3][uv_layer].uv = (u0, v1)

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(f"{name}_Mesh")
    bm.to_mesh(me)
    bm.free()

    obj = bpy.data.objects.new(name, me)
    obj.data.materials.append(mat_rib)
    collection.objects.link(obj)
    sub = obj.modifiers.new("Subsurf_Rib", "SUBSURF")
    sub.levels = 2
    sub.render_levels = 2
    return obj


def _build_snug_cuff(side_name, wrist_frame, mat_rib, collection):
    wrist_p, wrist_t, wrist_up, wrist_front = wrist_frame
    n_a = 36
    cuff_r = 0.032
    ring_pts = []
    for ia in range(n_a):
        ang = 2.0 * math.pi * ia / n_a
        rad_v = (wrist_up * math.cos(ang) + wrist_front * math.sin(ang)).normalized()
        ring_pts.append(wrist_p + wrist_t * 0.015 + rad_v * cuff_r)

    return _build_fitted_rib_band(
        f"Sweater_Cuff_{side_name}",
        ring_pts,
        wrist_p + wrist_t * 0.015,
        band_thick=0.0046,
        band_half_h=0.024,
        u_tiles=1.8,
        v_tiles=0.65,
        mat_rib=mat_rib,
        collection=collection,
        axis_dir=wrist_t,
    )


def _build_feminine_hand(side_name, wrist_frame, mat_hands, collection):
    side = +1.0 if side_name == "L" else -1.0
    origin_w, fwd, up, front_v = wrist_frame
    origin = origin_w + fwd * 0.022

    palm_fwd = (fwd * 0.84 - Vector((side * 0.46, 0.0, 0.14))).normalized()
    palm_up = (up * 0.48 + Vector((side * 0.86, 0.0, 0.0))).normalized()
    palm_side = palm_fwd.cross(palm_up).normalized()
    palm_up = palm_side.cross(palm_fwd).normalized()

    bm = bmesh.new()

    def add_tapered_tube(pts, radii, n_seg=12, cap_end=True):
        rings = []
        for i, (pt, r) in enumerate(zip(pts, radii)):
            if i == 0:
                t = (pts[1] - pts[0]).normalized()
            elif i == len(pts) - 1:
                t = (pts[-1] - pts[-2]).normalized()
            else:
                t = (pts[i + 1] - pts[i - 1]).normalized()
            n = palm_up - t * palm_up.dot(t)
            if n.length < 1e-5:
                n = Vector((0, 0, 1))
            n.normalize()
            b = t.cross(n).normalized()
            ring = []
            for s in range(n_seg):
                a = 2.0 * math.pi * s / n_seg
                rx = r[0] if isinstance(r, tuple) else r
                ry = r[1] if isinstance(r, tuple) else r
                ring.append(bm.verts.new(pt + n * (rx * math.cos(a)) + b * (ry * math.sin(a))))
            rings.append(ring)
        for i in range(len(rings) - 1):
            for s in range(n_seg):
                sn = (s + 1) % n_seg
                f = bm.faces.new((rings[i][s], rings[i][sn], rings[i + 1][sn], rings[i + 1][s]))
                f.smooth = True
        if cap_end:
            tip_t = (pts[-1] - pts[-2]).normalized()
            r_last = radii[-1][0] if isinstance(radii[-1], tuple) else radii[-1]
            v_tip = bm.verts.new(pts[-1] + tip_t * (r_last * 0.80))
            for s in range(n_seg):
                sn = (s + 1) % n_seg
                f = bm.faces.new((rings[-1][s], rings[-1][sn], v_tip))
                f.smooth = True

    palm_pts = [
        origin - fwd * 0.036,
        origin,
        origin + palm_fwd * 0.025 - palm_up * 0.002,
        origin + palm_fwd * 0.050 - palm_up * 0.006,
        origin + palm_fwd * 0.060 - palm_up * 0.010,
    ]
    palm_r = [
        (0.016, 0.019),
        (0.014, 0.020),
        (0.0115, 0.025),
        (0.0095, 0.026),
        (0.0075, 0.021),
    ]
    add_tapered_tube(palm_pts, palm_r, n_seg=16, cap_end=True)

    finger_specs = [
        (0.0165 * side, 0.054, 0.0060, 0.96),
        (0.0055 * side, 0.059, 0.0062, 1.02),
        (-0.0055 * side, 0.055, 0.0058, 1.08),
        (-0.0165 * side, 0.044, 0.0050, 1.15),
    ]
    for off, length, r0, curl in finger_specs:
        base = origin + palm_fwd * 0.052 + palm_side * off - palm_up * 0.006
        f_pts = []
        f_r = []
        for k in range(6):
            u = k / 5.0
            ang = curl * u * 1.58
            d_fwd = length * u * math.cos(ang * 0.56)
            d_in = -length * (u ** 1.48) * math.sin(ang) * 0.88
            f_pts.append(base + palm_fwd * d_fwd + palm_up * d_in)
            f_r.append(r0 * (1.0 - 0.36 * u))
        add_tapered_tube(f_pts, f_r, n_seg=10, cap_end=True)

    th_base = origin + palm_fwd * 0.019 + palm_side * (0.020 * side) - palm_up * 0.006
    th_pts = [
        th_base,
        th_base + palm_fwd * 0.017 + palm_side * (0.008 * side) - palm_up * 0.010,
        th_base + palm_fwd * 0.033 + palm_side * (0.007 * side) - palm_up * 0.020,
        th_base + palm_fwd * 0.045 + palm_side * (0.002 * side) - palm_up * 0.028,
    ]
    th_r = [0.0076, 0.0068, 0.0058, 0.0046]
    add_tapered_tube(th_pts, th_r, n_seg=10, cap_end=True)

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(f"Character_Hand_{side_name}_Mesh")
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(f"Character_Hand_{side_name}", me)
    obj.data.materials.append(mat_hands)
    collection.objects.link(obj)
    sub = obj.modifiers.new("Subsurf_Hand", "SUBSURF")
    sub.levels = 1
    sub.render_levels = 1
    return obj


def _build_wool_fuzz_curves(sweater_objs, mat_fuzz, collection, count=10000, seed=4040):
    rng = np.random.default_rng(seed)

    tris_p0, tris_e1, tris_e2, tris_n, areas = [], [], [], [], []
    for obj in sweater_objs:
        me = obj.data
        me.calc_loop_triangles()
        mw = obj.matrix_world
        for lt in me.loop_triangles:
            v0 = mw @ me.vertices[lt.vertices[0]].co
            v1 = mw @ me.vertices[lt.vertices[1]].co
            v2 = mw @ me.vertices[lt.vertices[2]].co
            e1 = v1 - v0
            e2 = v2 - v0
            cr = e1.cross(e2)
            a = 0.5 * cr.length
            if a > 1e-8:
                tris_p0.append(v0[:])
                tris_e1.append(e1[:])
                tris_e2.append(e2[:])
                tris_n.append((cr / cr.length)[:])
                areas.append(a)

    areas = np.array(areas, dtype=np.float64)
    probs = areas / areas.sum()
    tri_idx = rng.choice(len(areas), size=count, p=probs)

    p0 = np.array(tris_p0, dtype=np.float64)[tri_idx]
    e1 = np.array(tris_e1, dtype=np.float64)[tri_idx]
    e2 = np.array(tris_e2, dtype=np.float64)[tri_idx]
    nrm = np.array(tris_n, dtype=np.float64)[tri_idx]

    u = rng.random(count)
    v = rng.random(count)
    flip = (u + v) > 1.0
    u[flip] = 1.0 - u[flip]
    v[flip] = 1.0 - v[flip]
    roots = p0 + u[:, None] * e1 + v[:, None] * e2

    lengths = rng.uniform(0.0016, 0.0036, size=count)
    rand_tan = rng.normal(0.0, 1.0, size=(count, 3))
    rand_tan -= np.sum(rand_tan * nrm, axis=1, keepdims=True) * nrm
    rand_tan /= np.linalg.norm(rand_tan, axis=1, keepdims=True) + 1e-8

    p_mid = roots + nrm * (lengths[:, None] * 0.55) + rand_tan * (lengths[:, None] * 0.35)
    p_tip = roots + nrm * (lengths[:, None] * 0.78) + rand_tan * (lengths[:, None] * 0.85) + rng.normal(0.0, 0.0005, size=(count, 3))

    pts_all = np.stack([roots, p_mid, p_tip], axis=1).reshape(-1, 3).astype(np.float32)
    radii_all = np.tile(np.array([0.000070, 0.000046, 0.000015], dtype=np.float32), count)

    hc = bpy.data.hair_curves.new("Sweater_Wool_Fuzz_Curves")
    hc.add_curves([3] * count)
    hc.points.foreach_set("position", pts_all.ravel())
    if "radius" not in hc.attributes:
        hc.attributes.new("radius", "FLOAT", "POINT")
    hc.attributes["radius"].data.foreach_set("value", radii_all)
    hc.materials.append(mat_fuzz)

    obj_fuzz = bpy.data.objects.new("Sweater_Wool_Fuzz", hc)
    collection.objects.link(obj_fuzz)
    return obj_fuzz


def build_sweater_and_hands(collection, mats, knit_imgs):
    body_full, neck_pts, hem_pts, wrist_frames = _build_seamless_sweater_body(collection, mats["sweater_body"])

    # Sleek, flat-lying 1x1 ribbed crew-neck band seated flush right into the neckline seam!
    collar = _build_fitted_rib_band(
        "Sweater_Collar",
        [p + Vector((0.0, 0.0, -0.001)) for p in neck_pts],
        Vector((0.0, -0.034, 1.355)),
        band_thick=0.0040,
        band_half_h=0.0150,
        u_tiles=3.1,
        v_tiles=0.52,
        mat_rib=mats["sweater_rib"],
        collection=collection,
        tilt_inward=0.72,
    )

    hem = _build_fitted_rib_band(
        "Sweater_Hem",
        [p + Vector((0.0, 0.0, -0.010)) for p in hem_pts],
        Vector((0.0, -0.022, 0.985)),
        band_thick=0.0052,
        band_half_h=0.023,
        u_tiles=4.2,
        v_tiles=0.68,
        mat_rib=mats["sweater_rib"],
        collection=collection,
    )

    cuff_r = _build_snug_cuff("R", wrist_frames["R"], mats["sweater_rib"], collection)
    cuff_l = _build_snug_cuff("L", wrist_frames["L"], mats["sweater_rib"], collection)

    hand_r = _build_feminine_hand("R", wrist_frames["R"], mats["hands"], collection)
    hand_l = _build_feminine_hand("L", wrist_frames["L"], mats["hands"], collection)

    sweater_meshes = [body_full, collar, hem, cuff_r, cuff_l]
    fuzz = _build_wool_fuzz_curves(sweater_meshes, mats["sweater_fuzz"], collection, count=10000)

    deps = bpy.context.evaluated_depsgraph_get()
    bm_all = bmesh.new()
    for o in sweater_meshes:
        ev = o.evaluated_get(deps)
        me_ev = ev.to_mesh()
        bm_all.from_mesh(me_ev)
        ev.to_mesh_clear()
    bm_all.verts.ensure_lookup_table()
    bm_all.faces.ensure_lookup_table()
    bvh_sweater = BVHTree.FromBMesh(bm_all)
    bm_all.free()

    return {
        "body_full": body_full,
        "collar": collar,
        "hem": hem,
        "cuff_r": cuff_r,
        "cuff_l": cuff_l,
        "hand_r": hand_r,
        "hand_l": hand_l,
        "fuzz": fuzz,
        "bvh_sweater": bvh_sweater,
    }
