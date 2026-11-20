import math
import numpy as np
from mathutils import Euler
from character_anatomy import create_mesh_object, smoothstep


def eval_catmull_rom(ctrl_pts, t_vals):
    """Evaluate smooth 3D Catmull-Rom spline and tangent vectors at t_vals in [0, 1]."""
    pts = np.asarray(ctrl_pts, dtype=np.float64)
    n_seg = len(pts) - 1
    p_ext = np.vstack([2.0 * pts[0] - pts[1], pts, 2.0 * pts[-1] - pts[-2]])

    out_p = np.zeros((len(t_vals), 3), dtype=np.float64)
    out_t = np.zeros((len(t_vals), 3), dtype=np.float64)

    for idx, t in enumerate(t_vals):
        s = min(float(n_seg) - 1e-7, max(0.0, float(t) * n_seg))
        i = int(math.floor(s))
        u = s - i
        p0, p1, p2, p3 = p_ext[i], p_ext[i + 1], p_ext[i + 2], p_ext[i + 3]

        u2 = u * u
        u3 = u2 * u
        pos = 0.5 * (
            (2.0 * p1)
            + (-p0 + p2) * u
            + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * u2
            + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * u3
        )
        deriv = 0.5 * (
            (-p0 + p2)
            + 2.0 * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * u
            + 3.0 * (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * u2
        )
        nrm = np.linalg.norm(deriv)
        out_p[idx] = pos
        out_t[idx] = deriv / max(1e-8, nrm)

    return out_p, out_t


def parallel_transport_frames(tangents, init_up=np.array([0.0, 0.0, 1.0])):
    """Compute twist-free orthonormal frames (n1, n2) along a 3D spline."""
    n = len(tangents)
    n1 = np.zeros((n, 3), dtype=np.float64)
    n2 = np.zeros((n, 3), dtype=np.float64)

    t0 = tangents[0]
    v = init_up - np.dot(init_up, t0) * t0
    if np.linalg.norm(v) < 1e-5:
        v = np.array([1.0, 0.0, 0.0]) - t0[0] * t0
    n1[0] = v / np.linalg.norm(v)
    n2[0] = np.cross(t0, n1[0])

    for i in range(1, n):
        ti_prev = tangents[i - 1]
        ti = tangents[i]
        axis = np.cross(ti_prev, ti)
        sin_a = np.linalg.norm(axis)
        cos_a = float(np.clip(np.dot(ti_prev, ti), -1.0, 1.0))
        if sin_a < 1e-7:
            n1[i] = n1[i - 1]
        else:
            k = axis / sin_a
            ang = math.atan2(sin_a, cos_a)
            vp = n1[i - 1]
            n1[i] = vp * math.cos(ang) + np.cross(k, vp) * math.sin(ang) + k * np.dot(k, vp) * (1.0 - math.cos(ang))
            n1[i] /= np.linalg.norm(n1[i])
        n2[i] = np.cross(ti, n1[i])

    return n1, n2


def sample_neck_collar_point(idx_u, neck_profile, extra_rad=0.0, z_shift=0.0):
    """
    Exact crew-neck ring point anchored directly to the measured posed neck profile of HeadBody_Mesh!
    Guarantees zero clavicle/neck poke-through and zero gap around 360 degrees.
    """
    cx, cy = neck_profile["center_xy"]
    phi = float(neck_profile["phis"][idx_u])
    r_skin = float(neck_profile["radii"][idx_u])
    z_skin = float(neck_profile["z_vals"][idx_u])

    # Add +2.5mm base clearance outside posed neck skin + requested radial offset
    r_tot = r_skin + 0.0025 + extra_rad
    px = cx + r_tot * math.cos(phi)
    py = cy + r_tot * math.sin(phi)
    pz = z_skin + z_shift

    # Cozy right-shoulder (-X) shrug lift matching reference.png
    if math.cos(phi) < 0.0:
        shrug = (-math.cos(phi)) ** 1.3 * max(0.0, extra_rad / 0.03)
        pz += 0.010 * shrug
        py -= 0.004 * shrug

    return np.array([px, py, pz], dtype=np.float64)


def build_sweater_torso_and_collar(neck_profile, collection):
    """
    Build genuine 3D Dusty Pink Shaker-Rib Crew-Neck Sweater Body + Plush 1x1 Ribbed Collar +
    Natural Feminine Waist Taper & Ribbed Hem (Z down to 0.91m).
    """
    n_u = len(neck_profile["phis"])  # 96 circumferential samples
    n_v = 76

    verts = []
    faces = []
    uvs_face = []

    phis = neck_profile["phis"]

    for iv in range(n_v):
        v = iv / (n_v - 1)

        for iu, phi in enumerate(phis):
            cos_p = math.cos(phi)
            sin_p = math.sin(phi)  # -1 = front (-Y), +1 = back (+Y)

            # Exact collar outer seam anchor at v=0!
            collar_seam = sample_neck_collar_point(iu, neck_profile, extra_rad=0.029, z_shift=-0.010)

            # Torso height from dropped-shoulder level (~1.350) down to hip/waist hem (~0.915)
            z_torso = 1.352 - 0.436 * (v ** 1.02)
            sh_lift = (0.024 if cos_p < 0 else -0.003) * (abs(cos_p) ** 1.25) * max(0.0, 1.0 - v * 1.75)
            z_torso += sh_lift

            # Natural feminine upper-body silhouette:
            # Soft dropped shoulders (~0.184m) -> gentle bust fullness -> tapered feminine waist (~0.136m) -> ribbed hem (~0.132m)
            shoulder_flare = math.exp(-0.5 * ((v - 0.14) / 0.11) ** 2)
            waist_taper = math.exp(-0.5 * ((v - 0.68) / 0.22) ** 2)
            rx_torso = 0.152 + 0.034 * shoulder_flare - 0.016 * waist_taper
            if v > 0.87:
                cinch = (v - 0.87) / 0.13
                rx_torso *= 1.0 - 0.12 * (cinch ** 1.35)

            # Front (-Y) bust & knit drape vs Back (+Y) scapula/lumbar curve
            bust_level = math.exp(-0.5 * ((v - 0.31) / 0.14) ** 2)
            front_depth = 0.106 + 0.030 * bust_level - 0.010 * waist_taper
            bust_dual = 1.0 + 0.055 * bust_level * (math.sin(2.0 * abs(cos_p) * 1.25) ** 2) * max(0.0, -sin_p)
            front_depth *= bust_dual

            back_depth = 0.090 + 0.014 * math.exp(-0.5 * ((v - 0.24) / 0.16) ** 2) - 0.012 * waist_taper

            if v > 0.87:
                cinch = (v - 0.87) / 0.13
                front_depth *= 1.0 - 0.16 * (cinch ** 1.35)
                back_depth *= 1.0 - 0.16 * (cinch ** 1.35)

            abs_c = abs(cos_p) ** 0.88
            abs_s = abs(sin_p) ** 0.92
            tx = math.copysign(rx_torso * abs_c, cos_p)
            ty_center = -0.028 - 0.014 * v
            ty = ty_center + (back_depth * abs_s if sin_p >= 0.0 else -front_depth * abs_s)

            w_collar = 1.0 - float(smoothstep(0.0, 0.19, np.array([v]))[0])
            px = collar_seam[0] * w_collar + tx * (1.0 - w_collar)
            py = collar_seam[1] * w_collar + ty * (1.0 - w_collar)
            pz = collar_seam[2] * w_collar + z_torso * (1.0 - w_collar)

            # Realistic 3D garment drape folds radiating from forward-extended arms
            if sin_p < 0.15 and 0.07 < v < 0.62:
                diag_phase = 19.0 * (v - 0.20 * abs(cos_p)) + (1.1 if cos_p < 0 else -0.8)
                fold_env = float(smoothstep(0.07, 0.18, np.array([v]))[0]) * (
                    1.0 - float(smoothstep(0.45, 0.62, np.array([v]))[0])
                )
                armpit_prox = float(smoothstep(0.32, 0.86, np.array([abs(cos_p)]))[0]) * max(0.0, -sin_p + 0.2)
                py -= 0.0038 * fold_env * armpit_prox * math.sin(diag_phase)

            # Soft blouson gather above ribbed waistband hem
            if 0.72 < v < 0.88:
                blouse = math.sin(math.pi * (v - 0.72) / 0.16)
                gather = 0.0028 * blouse * (0.6 + 0.4 * math.sin(11.0 * phi + 0.6))
                px += cos_p * gather
                py += sin_p * gather

            # Fine physical 3D knit rib relief
            if v <= 0.87:
                wale_wave = math.cos(96.0 * phi)
                rib_amp = 0.00045 * float(smoothstep(0.02, 0.08, np.array([v]))[0])
            else:
                wale_wave = math.cos(72.0 * phi)
                rib_amp = 0.00105 * (1.0 - float(smoothstep(0.96, 1.0, np.array([v]))[0]))

            px += cos_p * rib_amp * wale_wave
            py += sin_p * rib_amp * wale_wave

            # Solid closed underside roll at v -> 1.0
            if v > 0.95:
                t_close = (v - 0.95) / 0.05
                px *= 1.0 - 0.45 * t_close
                py = ty_center + (py - ty_center) * (1.0 - 0.45 * t_close)
                pz += 0.012 * t_close

            verts.append([px, py, pz])

    for iv in range(n_v - 1):
        v0 = iv / (n_v - 1)
        v1 = (iv + 1) / (n_v - 1)
        for iu in range(n_u):
            iun = (iu + 1) % n_u
            u0 = iu / n_u
            u1 = (iu + 1) / n_u
            faces.append([iv * n_u + iu, (iv + 1) * n_u + iu, (iv + 1) * n_u + iun, iv * n_u + iun])
            uvs_face.append([[u0, 1.0 - v0], [u0, 1.0 - v1], [u1, 1.0 - v1], [u1, 1.0 - v0]])

    bottom_ring = (n_v - 1) * n_u
    c_bot = np.mean([verts[bottom_ring + iu] for iu in range(n_u)], axis=0)
    c_idx = len(verts)
    verts.append(c_bot.tolist())
    for iu in range(n_u):
        iun = (iu + 1) % n_u
        faces.append([bottom_ring + iu, c_idx, bottom_ring + iun])
        uvs_face.append([[0.5, 0.0], [0.5, 0.0], [0.5, 0.0]])

    body_sweater_obj = create_mesh_object(
        "Sweater_Body", verts, faces, collection, uvs_per_face=uvs_face, subdiv_levels=1
    )

    # --- Plush 3D 1x1 Ribbed Crew-Neck Collar Band ---
    c_verts = []
    c_faces = []
    c_uvs = []
    n_cv = 18

    for icv in range(n_cv):
        tv = icv / (n_cv - 1)
        for iu, phi in enumerate(phis):
            if tv < 0.22:
                u_in = tv / 0.22
                # Inner edge tucks -7.5mm inside onto neck skin so zero gap ever shows from side/back!
                extra_r = -0.0075 + 0.0085 * math.sin(u_in * math.pi * 0.5)
                z_off = 0.000 + 0.013 * math.sin(u_in * math.pi * 0.5)
                loft_n = 0.0032 * math.sin(u_in * math.pi * 0.5)
            elif tv <= 0.88:
                u_band = (tv - 0.22) / 0.66
                extra_r = 0.001 + 0.028 * u_band
                z_off = 0.014 * (1.0 - u_band) - 0.010 * u_band
                loft_n = 0.0055 * math.sin(math.pi * (u_band ** 0.82)) + 0.0022 * (1.0 - u_band)
            else:
                u_tuck = (tv - 0.88) / 0.12
                extra_r = 0.029 + 0.003 * u_tuck
                z_off = -0.010 - 0.005 * u_tuck
                loft_n = -0.0028 * u_tuck

            base_pt = sample_neck_collar_point(iu, neck_profile, extra_rad=extra_r, z_shift=z_off)
            rib_flute = 0.00105 * math.cos(68.0 * phi) * math.sin(math.pi * min(1.0, tv / 0.92))
            n_out = np.array([math.cos(phi) * 0.62, math.sin(phi) * 0.62, 0.78])
            n_out /= np.linalg.norm(n_out)

            pt = base_pt + n_out * (loft_n + rib_flute)
            c_verts.append(pt.tolist())

    for icv in range(n_cv - 1):
        v0 = icv / (n_cv - 1)
        v1 = (icv + 1) / (n_cv - 1)
        for iu in range(n_u):
            iun = (iu + 1) % n_u
            u0 = (iu / n_u) * 0.65
            u1 = ((iu + 1) / n_u) * 0.65
            c_faces.append([icv * n_u + iu, (icv + 1) * n_u + iu, (icv + 1) * n_u + iun, icv * n_u + iun])
            c_uvs.append([[u0, v0 * 0.18], [u0, v1 * 0.18], [u1, v1 * 0.18], [u1, v0 * 0.18]])

    collar_obj = create_mesh_object(
        "Sweater_Collar", c_verts, c_faces, collection, uvs_per_face=c_uvs, subdiv_levels=1
    )
    return body_sweater_obj, collar_obj


def build_posed_makehuman_hand(name, side, topo, landmarks, cuff_center, fwd, up_h, inward_dir, collection):
    """
    Extract the genuine CC0 MakeHuman anatomical hand topology from input/base.obj,
    curl fingers smoothly around input/environment.json's finger joint landmarks into a
    graceful feminine selfie-holding gesture, slim to delicate proportions, and align
    wrist cleanly inside the knitted sweater cuff!
    """
    b_verts = topo["base_verts_all"]
    b_faces = topo["base_body_faces"]

    # Left hand in MakeHuman has x > +0.395, Right hand has x < -0.395
    sgn = 1.0 if side > 0 else -1.0
    prefix = "l" if side > 0 else "r"

    kept_f = []
    used_v = set()
    for fv, _ in b_faces:
        if all(b_verts[vi, 0] * sgn > 0.398 and b_verts[vi, 2] > 0.90 for vi in fv):
            kept_f.append(fv)
            used_v.update(fv)

    old_sorted = sorted(used_v)
    remap = {oi: ni for ni, oi in enumerate(old_sorted)}
    pts = b_verts[old_sorted].copy()

    # Open wrist boundary ring (for closing clean interior cap hidden inside cuff)
    from collections import Counter
    ecount = Counter()
    local_faces = [[remap[vi] for vi in fv] for fv in kept_f]
    for fc in local_faces:
        for k in range(len(fc)):
            a, b = fc[k], fc[(k + 1) % len(fc)]
            ecount[(min(a, b), max(a, b))] += 1
    wrist_verts = sorted(set(v for (a, b), c in ecount.items() if c == 1 for v in (a, b)))

    # Smooth finger curling in MakeHuman rest hand space!
    # In rest hand space: wrist `joint-{l,r}-hand` is at (~±0.431, -0.176, 1.062),
    # fingers point forward-outward-downward (~±0.25X, -0.78Y, -0.56Z), palm faces inward-downward!
    wrist_rest = np.array(landmarks[f"joint-{prefix}-hand"], dtype=np.float64)

    # Estimate palm normal (inward-downward) from finger-2-1 to finger-5-1 cross wrist-to-middle
    f2_mcp = np.array(landmarks[f"joint-{prefix}-finger-2-1"])
    f5_mcp = np.array(landmarks[f"joint-{prefix}-finger-5-1"])
    f3_mcp = np.array(landmarks[f"joint-{prefix}-finger-3-1"])

    hand_fwd_rest = f3_mcp - wrist_rest
    hand_fwd_rest /= np.linalg.norm(hand_fwd_rest)
    across_knuckles = (f2_mcp - f5_mcp)  # thumb-side (+index) minus pinky-side
    across_knuckles /= np.linalg.norm(across_knuckles)
    # For Left hand (+X), index->pinky x fwd points out of back of hand; curl around `across_knuckles` toward palm!
    palm_in_rest = np.cross(hand_fwd_rest, across_knuckles) * (-sgn)
    palm_in_rest /= np.linalg.norm(palm_in_rest)

    # Gently adduct fingers 2, 4, 5 toward middle finger 3 (closing wide rest-pose spread!) + soft feminine curl!
    for f_idx, curl_deg, adduct_deg in ((2, 34.0, -7.5), (3, 38.0, 0.0), (4, 42.0, 6.5), (5, 46.0, 11.5)):
        j1 = np.array(landmarks[f"joint-{prefix}-finger-{f_idx}-1"])
        j2 = np.array(landmarks[f"joint-{prefix}-finger-{f_idx}-2"])
        j3 = np.array(landmarks[f"joint-{prefix}-finger-{f_idx}-3"])
        j4 = np.array(landmarks[f"joint-{prefix}-finger-{f_idx}-4"])

        f_dir = j4 - j1
        f_len = np.linalg.norm(f_dir)
        f_unit = f_dir / max(1e-8, f_len)
        bend_axis = np.cross(f_unit, palm_in_rest)
        bend_axis /= max(1e-8, np.linalg.norm(bend_axis))

        # Adduction around palm_in_rest at MCP knuckle j1 brings fingers gracefully together!
        if abs(adduct_deg) > 0.1:
            rel1 = pts - j1
            p1_d = rel1 @ f_unit
            perp1 = np.linalg.norm(rel1 - p1_d[:, None] * f_unit[None, :], axis=1)
            w_add = smoothstep(-0.003, 0.012, p1_d) * (1.0 - smoothstep(0.011, 0.018, perp1))
            add_rad = math.radians(adduct_deg * sgn)
            for vi in np.where(w_add > 1e-3)[0]:
                a = add_rad * float(w_add[vi])
                rv = pts[vi] - j1
                pts[vi] = (
                    j1
                    + rv * math.cos(a)
                    + np.cross(palm_in_rest, rv) * math.sin(a)
                    + palm_in_rest * np.dot(palm_in_rest, rv) * (1.0 - math.cos(a))
                )

        # Isolate vertices belonging to this finger BEFORE curling, then apply chained forward-kinematics curl!
        rel_base = pts - j1
        p_base = rel_base @ f_unit
        perp_base = np.linalg.norm(rel_base - p_base[:, None] * f_unit[None, :], axis=1)
        finger_mask = (p_base > -0.004) & (perp_base < 0.0145)
        f_vidxs = np.where(finger_mask)[0]

        pivots = [j1.copy(), j2.copy(), j3.copy()]
        for p_idx, ang_d in enumerate((curl_deg * 0.45, curl_deg * 0.72, curl_deg * 0.45)):
            piv = pivots[p_idx]
            cur_dir = (pivots[min(2, p_idx + 1)] - pivots[max(0, p_idx - 1)]) if p_idx < 2 else (pts[f_vidxs].mean(axis=0) - piv)
            cur_dir /= max(1e-8, np.linalg.norm(cur_dir))
            ang_rad = math.radians(ang_d)
            k = bend_axis
            for vi in f_vidxs:
                d_along = np.dot(pts[vi] - piv, cur_dir)
                w = float(smoothstep(-0.003, 0.008, np.array([d_along]))[0])
                if w > 1e-3:
                    a = ang_rad * w
                    rv = pts[vi] - piv
                    pts[vi] = piv + rv * math.cos(a) + np.cross(k, rv) * math.sin(a) + k * np.dot(k, rv) * (1.0 - math.cos(a))
            # Update downstream joint pivots with exact forward kinematics!
            for nxt_i in range(p_idx + 1, 3):
                rv = pivots[nxt_i] - piv
                pivots[nxt_i] = (
                    piv
                    + rv * math.cos(ang_rad)
                    + np.cross(k, rv) * math.sin(ang_rad)
                    + k * np.dot(k, rv) * (1.0 - math.cos(ang_rad))
                )

    # Gently bring thumb (`finger-1-1..3`) slightly inward for relaxed natural posture
    t1 = np.array(landmarks[f"joint-{prefix}-finger-1-1"])
    t4 = np.array(landmarks[f"joint-{prefix}-finger-1-4"])
    t_unit = (t4 - t1) / np.linalg.norm(t4 - t1)
    rel_t = pts - t1
    proj_t = rel_t @ t_unit
    perp_t = np.linalg.norm(rel_t - proj_t[:, None] * t_unit[None, :], axis=1)
    wt = smoothstep(-0.005, 0.012, proj_t) * (1.0 - smoothstep(0.015, 0.024, perp_t))
    t_axis = np.cross(t_unit, palm_in_rest)
    t_axis /= max(1e-8, np.linalg.norm(t_axis))
    for vi in np.where(wt > 1e-3)[0]:
        a = math.radians(18.0) * float(wt[vi])
        rv = pts[vi] - t1
        pts[vi] = t1 + rv * math.cos(a) + np.cross(t_axis, rv) * math.sin(a) + t_axis * np.dot(t_axis, rv) * (1.0 - math.cos(a))

    # Transform posed rest hand into sleek feminine proportions (0.84 scale) aligned with cuff frame!
    # Local hand frame at wrist_rest: e1 = hand_fwd_rest, e2 = across_knuckles (thumb/up), e3 = palm_in_rest
    e1 = hand_fwd_rest
    e2 = across_knuckles - np.dot(across_knuckles, e1) * e1
    e2 /= np.linalg.norm(e2)
    e3 = np.cross(e1, e2)  # note orientation: check sign vs palm_in_rest so handedness stays +1 det!
    R_src = np.column_stack([e1, e2, e3])

    # Target frame at cuff: e1 -> fwd, e2 -> up_h (thumb upward!), e3 -> ±inward_dir (preserving det=+1!)
    t_e1 = fwd / np.linalg.norm(fwd)
    t_e2 = up_h - np.dot(up_h, t_e1) * t_e1
    t_e2 /= np.linalg.norm(t_e2)
    t_e3 = np.cross(t_e1, t_e2)
    # Ensure palm faces inward (`inward_dir`) for BOTH left and right hands without mirroring normals!
    if np.dot(e3, palm_in_rest) * np.dot(t_e3, inward_dir) < 0:
        # Rotate slightly around fwd if needed, or flip e2 & e3 together (det remains +1!)
        t_e2 = -t_e2
        t_e3 = -t_e3
        # Re-align thumb upward by keeping e2 upward and flipping source e2, e3!
        t_e2 = -t_e2
        t_e3 = -t_e3
        R_src = np.column_stack([e1, e2, -e3])  # wait: keep det(R_dst @ R_src.T) == +1!

    # Clean exact SO(3) rotation mapping:
    # e1 -> fwd, palm_in_rest -> inward_dir, thumb_up -> up_h!
    src_x = hand_fwd_rest
    src_y = across_knuckles - np.dot(across_knuckles, src_x) * src_x
    src_y /= np.linalg.norm(src_y)
    src_z = np.cross(src_x, src_y)  # right-handed! For L (+X), src_z points outward (-palm_in); for R (-X), src_z points inward (+palm_in)

    dst_x = fwd / np.linalg.norm(fwd)
    # Natural ~28-deg forearm pronation so palms angle gracefully inward-downward (not stiff karate-chop!)
    pronated_up = up_h * 0.88 + (-inward_dir) * 0.47
    dst_y = pronated_up - np.dot(pronated_up, dst_x) * dst_x
    dst_y /= np.linalg.norm(dst_y)
    desired_z = -inward_dir if side > 0 else inward_dir
    dst_z = np.cross(dst_x, dst_y)
    if np.dot(dst_z, desired_z) < 0:
        dst_y = np.cross(desired_z, dst_x)
        dst_y /= np.linalg.norm(dst_y)
        dst_z = np.cross(dst_x, dst_y)

    R_map = np.column_stack([dst_x, dst_y, dst_z]) @ np.column_stack([src_x, src_y, src_z]).T

    local_coords = (pts - wrist_rest) * 0.82
    # Tuck wrist 2.2cm inside the cozy ribbed sweater cuff so fingers & graceful palm emerge naturally!
    hand_origin = cuff_center - dst_x * 0.022 + inward_dir * 0.005
    world_pts = hand_origin + local_coords @ R_map.T
    verts_list = world_pts.tolist()

    # Assign clean fair-warm porcelain skin UVs (mapped into pure unshaded skin region (0.18, 0.50) of Skin_BaseColor_2K!)
    uvs_per_face = [[[0.18, 0.50] for _ in fc] for fc in local_faces]

    return create_mesh_object(name, verts_list, local_faces, collection, uvs_per_face=uvs_per_face, subdiv_levels=1)


def build_sweater_sleeves_and_hands(topo, landmarks, collection):
    """
    Build realistic 3D forward-reaching Dusty Pink Knitted Sleeves along a natural human
    bent-elbow selfie posture (shoulders -> downward-angled elbows -> gently raised forearms),
    paired with posed MakeHuman feminine hands tucked inside cozy ribbed cuffs!
    """
    sleeve_objs = []
    hand_objs = []

    arm_configs = [
        {
            "name": "R",
            "side": -1.0,
            "ctrl_pts": [
                [-0.112, -0.028, 1.334],  # shoulder root tucked inside torso
                [-0.174, -0.055, 1.328],  # cozy raised dropped-shoulder seam
                [-0.228, -0.175, 1.250],  # upper arm sloping naturally downward & forward
                [-0.252, -0.305, 1.202],  # soft natural elbow bend
                [-0.238, -0.415, 1.232],  # forearm angling forward & gently upward toward camera bottom-left
                [-0.208, -0.502, 1.264],  # plush ribbed cuff (outside beauty frame; natural in diagnostics!)
            ],
        },
        {
            "name": "L",
            "side": 1.0,
            "ctrl_pts": [
                [0.112, -0.022, 1.306],   # shoulder root tucked inside torso
                [0.176, -0.048, 1.296],   # relaxed dropped-shoulder seam
                [0.232, -0.168, 1.216],   # upper arm sloping naturally downward & forward
                [0.254, -0.298, 1.168],   # soft natural elbow bend
                [0.240, -0.408, 1.198],   # forearm angling forward & gently upward toward camera bottom-right
                [0.210, -0.492, 1.232],   # plush ribbed cuff
            ],
        },
    ]

    n_su = 56
    n_sv = 68
    t_vals = np.linspace(0.0, 1.0, n_sv)

    for cfg in arm_configs:
        side = cfg["side"]
        s_name = cfg["name"]
        centers, tangents = eval_catmull_rom(cfg["ctrl_pts"], t_vals)
        n1_arr, n2_arr = parallel_transport_frames(tangents, init_up=np.array([0.0, 0.0, 1.0]))

        s_verts = []
        s_faces = []
        s_uvs = []

        for iv, tv in enumerate(t_vals):
            c = centers[iv]
            n1 = n1_arr[iv]
            n2 = n2_arr[iv]

            # Sleek, natural cozy sleeve silhouette (not over-inflated balloon!):
            base_r = 0.058 - 0.011 * tv + 0.007 * math.sin(math.pi * min(1.0, tv * 1.15))

            # Crisp dropped-shoulder seam groove & welt at tv ~ 0.14
            base_r += -0.0032 * math.exp(-0.5 * ((tv - 0.135) / 0.016) ** 2)
            base_r += 0.0018 * math.exp(-0.5 * ((tv - 0.158) / 0.018) ** 2)

            if 0.75 < tv <= 0.96:
                if tv <= 0.85:
                    base_r += 0.0042 * math.sin(math.pi * (tv - 0.75) / 0.10)
                else:
                    cuff_t = (tv - 0.85) / 0.11
                    base_r = 0.046 * (1.0 - 0.22 * (cuff_t ** 1.2))
            elif tv > 0.96:
                roll_t = (tv - 0.96) / 0.04
                base_r = 0.0359 * (1.0 - 0.35 * roll_t)

            for iu in range(n_su):
                ang = 2.0 * math.pi * iu / n_su
                ca = math.cos(ang)
                sa = math.sin(ang)

                rx = base_r * (1.05 if ca < 0 else 0.96)
                ry = base_r * 0.95

                # Natural accordion/elbow knit folds along bent sleeve (matching reference.png!)
                fold_disp = 0.0
                if 0.16 < tv < 0.86:
                    bend_zone = math.exp(-0.5 * ((tv - 0.54) / 0.24) ** 2)
                    inner_bias = 0.50 + 0.50 * max(0.0, ca * 0.75 - side * sa * 0.45)
                    fold_disp = (
                        0.0036 * bend_zone * inner_bias * math.sin(38.0 * tv + 1.6 * math.sin(ang + side * 0.5))
                        + 0.0018 * math.sin(22.0 * tv - 2.0 * ang) * float(smoothstep(0.20, 0.35, np.array([tv]))[0])
                    )

                if tv <= 0.85:
                    wale = 0.00045 * math.cos(52.0 * ang) * float(smoothstep(0.04, 0.12, np.array([tv]))[0])
                else:
                    wale = 0.00095 * math.cos(40.0 * ang) * (1.0 - float(smoothstep(0.95, 1.0, np.array([tv]))[0]))

                r1 = rx + fold_disp + wale
                r2 = ry + fold_disp + wale
                tang_back = -0.012 * ((tv - 0.96) / 0.04) if tv > 0.96 else 0.0
                sag_z = -0.006 * math.sin(math.pi * min(1.0, tv / 0.88)) * max(0.0, -ca)

                pt = c + n1 * (r1 * ca) + n2 * (r2 * sa) + tangents[iv] * tang_back + np.array([0.0, 0.0, sag_z])
                s_verts.append(pt.tolist())

        for iv in range(n_sv - 1):
            v0 = iv / (n_sv - 1)
            v1 = (iv + 1) / (n_sv - 1)
            for iu in range(n_su):
                iun = (iu + 1) % n_su
                u0 = (iu / n_su) * 0.48
                u1 = ((iu + 1) / n_su) * 0.48
                s_faces.append([iv * n_su + iu, (iv + 1) * n_su + iu, (iv + 1) * n_su + iun, iv * n_su + iun])
                s_uvs.append([[u0, 1.0 - v0], [u0, 1.0 - v1], [u1, 1.0 - v1], [u1, 1.0 - v0]])

        end_ring = (n_sv - 1) * n_su
        c_end = np.mean([s_verts[end_ring + iu] for iu in range(n_su)], axis=0) - tangents[-1] * 0.015
        end_idx = len(s_verts)
        s_verts.append(c_end.tolist())
        for iu in range(n_su):
            iun = (iu + 1) % n_su
            s_faces.append([end_ring + iu, end_idx, end_ring + iun])
            s_uvs.append([[0.24, 0.0], [0.24, 0.0], [0.24, 0.0]])

        sl_obj = create_mesh_object(
            f"Sweater_Sleeve_{s_name}", s_verts, s_faces, collection, uvs_per_face=s_uvs, subdiv_levels=1
        )
        sleeve_objs.append(sl_obj)

        cuff_center = centers[-3]
        fwd = tangents[-3]
        up_h = n1_arr[-3]
        inward_dir = -side * n2_arr[-3]

        hand_obj = build_posed_makehuman_hand(
            f"Hand_{s_name}", side, topo, landmarks, cuff_center, fwd, up_h, inward_dir, collection
        )
        hand_objs.append(hand_obj)

    return sleeve_objs, hand_objs


def build_complete_sweater(anat_info, collection):
    """Build sweater body, exact-fit ribbed crew-neck collar, natural bent sleeves, and MakeHuman hands."""
    body_obj, collar_obj = build_sweater_torso_and_collar(anat_info["neck_profile"], collection)
    sleeve_objs, hand_objs = build_sweater_sleeves_and_hands(
        anat_info["topo"], anat_info["landmarks"], collection
    )
    return {
        "sweater_body": body_obj,
        "sweater_collar": collar_obj,
        "sweater_sleeves": sleeve_objs,
        "hands": hand_objs,
    }
