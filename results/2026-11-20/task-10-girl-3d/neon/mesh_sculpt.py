"""
mesh_sculpt.py
Loads the CC0 MakeHuman hm08 upper-body.obj, transfers exact 1:1 anatomical UVs
from base.obj, sculpts the youthful feminine portrait likeness matching input/reference.png
(soft heart-oval face, fuller cheeks, gently rounded petite chin, large expressive warm
almond eyes with parallel double eyelids and soft aegyo-sal, delicate petite nose, sweet
closed-mouth smile, crisp sculpted ears, slender neck), poses head/neck smoothly, and
builds properly right-handed (det=+1) 4-layer photorealistic eyes.
"""
import math
import bpy
import bmesh
import numpy as np
from mathutils import Vector, Matrix, Euler
from mathutils.bvhtree import BVHTree


# Gentle natural head tilt matching input/reference.png
# Coordinate system: meters, Z-up, front=-Y, character's left=+X (viewer's right)
HEAD_PIVOT = np.array([0.0, -0.024, 1.414], dtype=np.float64)
HEAD_ROLL_DEG = -18.5
HEAD_YAW_DEG = -5.5
HEAD_PITCH_DEG = 2.2


def smoothstep(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0 + 1e-12), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def gauss3(pts, center, radii):
    """Anisotropic 3D Gaussian falloff weight."""
    d = (pts - np.asarray(center, dtype=np.float64)) / np.asarray(radii, dtype=np.float64)
    return np.exp(-0.5 * np.sum(d * d, axis=1))


def gauss3_sym(pts, center_pos_x, radii):
    """Symmetric 3D Gaussian falloff applied identically on +X and -X."""
    p = pts.copy()
    p[:, 0] = np.abs(p[:, 0])
    return gauss3(p, center_pos_x, radii)


def _load_base_uv_and_eyelashes(base_obj_path="input/base.obj"):
    """Read exact UVs for body faces (y>=2.8) and helper eyelash reference positions."""
    verts_b = []
    uvs_b = []
    faces_vti = []
    lash_groups = {
        "helper-l-eyelashes-1": set(),
        "helper-l-eyelashes-2": set(),
        "helper-r-eyelashes-1": set(),
        "helper-r-eyelashes-2": set(),
    }
    cur_g = None
    with open(base_obj_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("v "):
                verts_b.append(list(map(float, line.split()[1:4])))
            elif line.startswith("vt "):
                uvs_b.append(list(map(float, line.split()[1:3])))
            elif line.startswith("g "):
                cur_g = line.strip()[2:]
            elif line.startswith("f "):
                toks = line.split()[1:]
                vi = [int(t.split("/")[0]) - 1 for t in toks]
                if cur_g == "body":
                    if all(verts_b[i][1] >= 2.8 for i in vi):
                        vti = [int(t.split("/")[1]) - 1 for t in toks]
                        faces_vti.append(vti)
                elif cur_g in lash_groups:
                    lash_groups[cur_g].update(vi)

    def xform(i):
        sx, sy, sz = verts_b[i]
        return np.array([sx * 0.1, -sz * 0.1, (sy + 8.168) * 0.1], dtype=np.float64)

    lash_pts = {k: np.array([xform(i) for i in v], dtype=np.float64) for k, v in lash_groups.items()}
    return uvs_b, faces_vti, lash_pts


def _sculpt_rest_face_and_body(pts):
    """
    Apply continuous anatomical deformations in rest pose (Z-up, front=-Y)
    to sculpt MakeHuman hm08 into the attractive, youthful feminine likeness
    of input/reference.png.
    """
    p = pts.copy()
    x = p[:, 0]
    y = p[:, 1]
    z = p[:, 2]
    ax = np.abs(x)
    sx = np.sign(x)

    # ------------------------------------------------------------------
    # 1. YOUTHFUL SHORT-OVAL / SOFT HEART CRANIOFACIAL PROPORTIONS
    # ------------------------------------------------------------------
    # Gentle vertical compactness for youthful sweet proportions
    lower_face_comp = smoothstep(1.540, 1.445, z) * smoothstep(-0.075, -0.115, y)
    p[:, 2] += 0.0055 * lower_face_comp

    crown_w = smoothstep(1.590, 1.658, z)
    p[:, 2] -= 0.0038 * crown_w

    temple_w = gauss3_sym(p, [0.062, -0.090, 1.564], [0.025, 0.048, 0.040])
    p[:, 0] -= sx * 0.0020 * temple_w

    # Soft, youthful rounded cheeks (matches reference.png's attractive fullness!)
    cheek_full_w = gauss3_sym(p, [0.045, -0.128, 1.512], [0.026, 0.028, 0.024])
    p[:, 0] += sx * 0.0030 * cheek_full_w
    p[:, 1] -= 0.0032 * cheek_full_w
    p[:, 2] += 0.0018 * cheek_full_w

    lower_cheek_soft = gauss3_sym(p, [0.040, -0.124, 1.482], [0.022, 0.026, 0.022])
    p[:, 0] += sx * 0.0016 * lower_cheek_soft
    p[:, 1] -= 0.0018 * lower_cheek_soft

    # Graceful tapered back jaw angle while keeping lower cheek & chin softly rounded
    jaw_back_w = gauss3_sym(p, [0.056, -0.088, 1.470], [0.022, 0.034, 0.028])
    p[:, 0] -= sx * 0.0046 * jaw_back_w
    p[:, 2] += 0.0028 * jaw_back_w

    chin_w = gauss3(p, [0.0, -0.145, 1.440], [0.022, 0.026, 0.018])
    p[:, 2] += 0.0024 * chin_w
    p[:, 1] += 0.0015 * chin_w
    chin_round_w = gauss3(p, [0.0, -0.148, 1.449], [0.015, 0.016, 0.011])
    p[:, 1] -= 0.0014 * chin_round_w

    forehead_w = gauss3(p, [0.0, -0.148, 1.592], [0.048, 0.028, 0.030])
    p[:, 1] -= 0.0024 * forehead_w

    glabella_w = gauss3(p, [0.0, -0.153, 1.564], [0.028, 0.018, 0.014])
    p[:, 1] += 0.0016 * glabella_w

    # ------------------------------------------------------------------
    # 2. PETITE DELICATE NOSE (gentle bridge, cute softly rounded tip, clean nostrils)
    # ------------------------------------------------------------------
    radix_w = gauss3(p, [0.0, -0.153, 1.538], [0.013, 0.015, 0.014])
    p[:, 1] += 0.0020 * radix_w
    p[:, 0] *= (1.0 - 0.14 * radix_w)

    bridge_w = gauss3(p, [0.0, -0.159, 1.524], [0.013, 0.015, 0.015])
    p[:, 0] *= (1.0 - 0.16 * bridge_w)
    p[:, 1] += 0.0016 * bridge_w

    tip_w = gauss3(p, [0.0, -0.167, 1.509], [0.013, 0.015, 0.012])
    p[:, 1] += 0.0040 * tip_w
    p[:, 2] += 0.0026 * tip_w
    p[:, 0] *= (1.0 - 0.10 * tip_w)

    alae_w = gauss3_sym(p, [0.0155, -0.153, 1.509], [0.010, 0.013, 0.010])
    p[:, 0] -= sx * 0.0030 * alae_w
    p[:, 2] += 0.0018 * alae_w
    p[:, 1] += 0.0014 * alae_w

    base_nose_w = gauss3(p, [0.0, -0.156, 1.501], [0.013, 0.012, 0.007])
    p[:, 2] += 0.0018 * base_nose_w

    # ------------------------------------------------------------------
    # 3. LARGE, WARM, EXPRESSIVE ALMOND EYES & DOUBLE EYELIDS (matching reference.png!)
    #    MakeHuman raw lids: lower z=1.5408, upper z=1.5500 -> ~9.2mm opening.
    #    Open upper lid smoothly (+1.65mm) & soften lower curve (-0.25mm) for bright,
    #    warm, expressive ~11mm almond eyes where large brown iris fills the aperture cleanly!
    # ------------------------------------------------------------------
    front_eye_mask = smoothstep(-0.129, -0.136, y)

    up_lid_center = gauss3_sym(p, [0.0310, -0.1405, 1.5502], [0.0100, 0.0095, 0.0040]) * front_eye_mask
    up_lid_outer = gauss3_sym(p, [0.0418, -0.1380, 1.5488], [0.0068, 0.0095, 0.0040]) * front_eye_mask
    p[:, 2] += 0.00125 * up_lid_center + 0.00105 * up_lid_outer
    p[:, 1] -= 0.0007 * up_lid_center

    # Soft relaxed lower lid curve (gently kisses bottom of large iris -> zero white sclera underneath!)
    lo_lid_center = gauss3_sym(p, [0.0315, -0.1400, 1.5406], [0.0105, 0.0095, 0.0038]) * front_eye_mask
    p[:, 2] -= 0.00010 * lo_lid_center
    p[:, 1] -= 0.0004 * lo_lid_center

    # Gracefully widen almond eye corners horizontally
    lat_canthus = gauss3_sym(p, [0.0460, -0.1345, 1.5458], [0.0055, 0.0090, 0.0044]) * front_eye_mask
    p[:, 2] += 0.0008 * lat_canthus
    p[:, 0] += sx * 0.0020 * lat_canthus

    med_canthus = gauss3_sym(p, [0.0185, -0.1400, 1.5442], [0.0045, 0.0080, 0.0036]) * front_eye_mask
    p[:, 2] -= 0.0004 * med_canthus
    p[:, 0] -= sx * 0.0008 * med_canthus

    # Crisp parallel double-eyelid crease (futae) ~3mm above lifted upper lid margin (z~1.5548)
    crease_arc_z = 1.5548 - 15.5 * (ax - 0.0318) ** 2
    d_crease_z = (p[:, 2] - crease_arc_z) / 0.0015
    d_crease_x = (ax - 0.0322) / 0.0125
    d_crease_y = (p[:, 1] - (-0.1405)) / 0.009
    crease_w = np.exp(-0.5 * (d_crease_z ** 2 + d_crease_x ** 2 + d_crease_y ** 2)) * front_eye_mask
    p[:, 1] += 0.0023 * crease_w

    # Soft upper-lid fold cushion right above crease
    hood_arc_z = 1.5578 - 13.0 * (ax - 0.0325) ** 2
    hood_w = np.exp(
        -0.5 * (((p[:, 2] - hood_arc_z) / 0.0026) ** 2 + ((ax - 0.0328) / 0.014) ** 2 + ((p[:, 1] + 0.141) / 0.010) ** 2)
    ) * front_eye_mask
    p[:, 1] -= 0.0014 * hood_w

    # Youthful soft lower-lid aegyo-sal roll
    aegyo_arc_z = 1.5364 + 11.5 * (ax - 0.0318) ** 2
    aegyo_w = np.exp(
        -0.5 * (((p[:, 2] - aegyo_arc_z) / 0.0023) ** 2 + ((ax - 0.0318) / 0.0115) ** 2 + ((p[:, 1] + 0.1405) / 0.010) ** 2)
    ) * front_eye_mask
    p[:, 1] -= 0.0020 * aegyo_w
    p[:, 2] += 0.0006 * aegyo_w

    # ------------------------------------------------------------------
    # 4. SWEET, NATURAL CLOSED-MOUTH SMILE & SOFT PILLOWY LIPS
    # ------------------------------------------------------------------
    front_mouth_mask = smoothstep(-0.132, -0.144, p[:, 1])

    up_close = gauss3(p, [0.0, -0.156, 1.4844], [0.023, 0.014, 0.0032]) * front_mouth_mask
    lo_close = gauss3(p, [0.0, -0.154, 1.4797], [0.023, 0.014, 0.0032]) * front_mouth_mask
    p[:, 2] -= 0.0012 * up_close
    p[:, 2] += 0.0014 * lo_close

    cupid_mid = gauss3(p, [0.0, -0.159, 1.4894], [0.0035, 0.009, 0.0028]) * front_mouth_mask
    cupid_peaks = gauss3_sym(p, [0.0056, -0.159, 1.4900], [0.0040, 0.009, 0.0028]) * front_mouth_mask
    p[:, 2] -= 0.0006 * cupid_mid
    p[:, 2] += 0.0007 * cupid_peaks
    p[:, 1] -= 0.0006 * cupid_peaks

    up_tubercle = gauss3(p, [0.0, -0.159, 1.4840], [0.0058, 0.009, 0.0028]) * front_mouth_mask
    p[:, 1] -= 0.0010 * up_tubercle
    p[:, 2] -= 0.0003 * up_tubercle

    lo_full = gauss3(p, [0.0, -0.156, 1.4767], [0.0138, 0.012, 0.0052]) * front_mouth_mask
    p[:, 1] -= 0.0022 * lo_full
    p[:, 2] -= 0.0009 * lo_full

    corner_w = gauss3_sym(p, [0.0258, -0.145, 1.4822], [0.0148, 0.018, 0.0115]) * front_mouth_mask
    p[:, 2] += 0.0038 * corner_w
    p[:, 1] += 0.0038 * corner_w
    p[:, 0] += sx * 0.0026 * corner_w

    mid_smile_w = gauss3_sym(p, [0.0155, -0.152, 1.4820], [0.0105, 0.015, 0.0085]) * front_mouth_mask
    p[:, 2] += 0.0016 * mid_smile_w
    p[:, 1] += 0.0012 * mid_smile_w

    dimple_w = gauss3_sym(p, [0.0308, -0.140, 1.4842], [0.0065, 0.011, 0.0075]) * front_mouth_mask
    p[:, 1] += 0.0014 * dimple_w

    # ------------------------------------------------------------------
    # 5. EARS (Crisp sculpted helix & concha recess!)
    # ------------------------------------------------------------------
    ear_w = gauss3_sym(p, [0.080, -0.055, 1.536], [0.016, 0.030, 0.034])
    p[:, 0] -= sx * 0.0010 * ear_w
    p[:, 2] -= 0.0008 * ear_w
    # Accentuate ear concha bowl gently so visible left ear catches realistic shadow depth!
    concha_w = gauss3_sym(p, [0.0745, -0.060, 1.534], [0.006, 0.009, 0.010])
    p[:, 0] -= sx * 0.0022 * concha_w

    # ------------------------------------------------------------------
    # 6. SLENDER FEMININE NECK & COLLARBONE TRANSITION
    # ------------------------------------------------------------------
    neck_w = smoothstep(1.335, 1.375, z) * (1.0 - smoothstep(1.425, 1.460, z))
    neck_cyl = neck_w * np.exp(-0.5 * (ax / 0.068) ** 2)
    p[:, 0] *= (1.0 - 0.12 * neck_cyl)
    front_neck = neck_cyl * smoothstep(-0.02, -0.065, y)
    p[:, 1] += 0.0038 * front_neck

    t_scm = np.clip((z - 1.350) / (1.430 - 1.350), 0.0, 1.0)
    scm_x = 0.015 + 0.030 * t_scm
    scm_y = -0.072 + 0.028 * t_scm
    scm_d2 = ((x - scm_x) / 0.018) ** 2 + ((y - scm_y) / 0.016) ** 2
    scm_w = np.exp(-0.5 * scm_d2) * smoothstep(1.345, 1.370, z) * (1.0 - smoothstep(1.415, 1.440, z))
    p[:, 1] -= 0.0008 * scm_w
    p[:, 0] += 0.0004 * scm_w

    # ------------------------------------------------------------------
    # 7. EXACT EYEBALL FIT & CONFORMING INNER EYELID SOCKET
    # ------------------------------------------------------------------
    eye_center_l = np.array([0.0310, -0.1260, 1.5458], dtype=np.float64)
    eye_radius = 0.01430

    for side in (+1.0, -1.0):
        ec = np.array([side * eye_center_l[0], eye_center_l[1], eye_center_l[2]], dtype=np.float64)
        dv = p - ec
        dist = np.linalg.norm(dv, axis=1)
        near = (dist < eye_radius + 0.00050) & (dist > 1e-6) & (p[:, 1] < ec[1] + 0.005)
        if np.any(near):
            target_r = eye_radius + 0.00050
            p[near] = ec + dv[near] * (target_r / dist[near, None])

    # ------------------------------------------------------------------
    # 8. TAPER BASE BODY BELOW COLLAR LINE INSIDE SWEATER ENVELOPE
    # ------------------------------------------------------------------
    below_collar = 1.0 - smoothstep(1.318, 1.362, z)
    spine_y = -0.032
    p[:, 0] = p[:, 0] * (1.0 - 0.65 * below_collar)
    p[:, 1] = spine_y + (p[:, 1] - spine_y) * (1.0 - 0.58 * below_collar)

    return p, eye_center_l, eye_radius


def head_pose_matrix():
    """Return 4x4 transformation matrix (in world space) for the head tilt pose."""
    rot = Euler(
        (
            math.radians(HEAD_PITCH_DEG),
            math.radians(HEAD_ROLL_DEG),
            math.radians(HEAD_YAW_DEG),
        ),
        "XYZ",
    ).to_matrix().to_4x4()
    pivot = Vector(HEAD_PIVOT.tolist())
    return Matrix.Translation(pivot) @ rot @ Matrix.Translation(-pivot)


def _apply_smooth_head_pose(pts):
    """Smoothly apply head tilt/yaw/pitch above the neck base (Z=1.350..1.452)."""
    p = pts.copy()
    z = p[:, 2]
    w = smoothstep(1.350, 1.452, z)

    ax = np.radians(HEAD_PITCH_DEG) * w
    ay = np.radians(HEAD_ROLL_DEG) * w
    az = np.radians(HEAD_YAW_DEG) * w

    cx, sx = np.cos(ax), np.sin(ax)
    cy, sy = np.cos(ay), np.sin(ay)
    cz, sz = np.cos(az), np.sin(az)

    rel = p - HEAD_PIVOT[None, :]
    x0, y0, z0 = rel[:, 0], rel[:, 1], rel[:, 2]

    x1 = x0
    y1 = cx * y0 - sx * z0
    z1 = sx * y0 + cx * z0

    x2 = cy * x1 + sy * z1
    y2 = y1
    z2 = -sy * x1 + cy * z1

    x3 = cz * x2 - sz * y2
    y3 = sz * x2 + cz * y2
    z3 = z2

    p_out = np.stack([x3, y3, z3], axis=1) + HEAD_PIVOT[None, :]
    p_out[:, 1] -= 0.012 * w
    return p_out


def transform_head_point(pt):
    """Transform a point rigidly attached to the head (Z >= 1.452) into posed space."""
    v = head_pose_matrix() @ Vector(pt)
    return Vector((v.x, v.y - 0.012, v.z))


def _extract_eyelash_curves(rest_pts, posed_pts, lash_pts_raw):
    """Find ordered eyelid rim vertices matching exact sculpted upper & lower lash margins."""
    curves = {}
    for key, raw in lash_pts_raw.items():
        side = +1.0 if "-l-" in key else -1.0
        is_upper = key.endswith("-2")
        xs = np.linspace(0.0180, 0.0465, 20) * side
        pts_ordered = []
        for x_target in xs:
            dx = np.abs(rest_pts[:, 0] - x_target)
            if is_upper:
                mask = (dx < 0.0028) & (rest_pts[:, 1] < -0.133) & (rest_pts[:, 2] > 1.5458) & (rest_pts[:, 2] < 1.557)
            else:
                mask = (dx < 0.0028) & (rest_pts[:, 1] < -0.133) & (rest_pts[:, 2] > 1.5355) & (rest_pts[:, 2] < 1.5450)
            cand = np.where(mask)[0]
            if len(cand) == 0:
                continue
            sub_rest = rest_pts[cand]
            y_min = sub_rest[:, 1].min()
            front_c = cand[sub_rest[:, 1] < y_min + 0.0032]
            if is_upper:
                best = front_c[np.argmin(rest_pts[front_c, 2])]
            else:
                best = front_c[np.argmax(rest_pts[front_c, 2])]
            pts_ordered.append(posed_pts[best].copy())
        curves[key] = np.array(pts_ordered, dtype=np.float64)
    return curves


def _create_realistic_eye(side_name, eye_center_rest, eye_radius, gaze_target_world, mat_iris, mat_cornea, mat_meniscus, mat_caruncle, collection):
    """Create properly right-handed (det=+1) 4-part photorealistic human eye with large warm iris."""
    side = +1.0 if side_name == "L" else -1.0
    ec_rest = np.array([side * eye_center_rest[0], eye_center_rest[1], eye_center_rest[2]], dtype=np.float64)
    ec_world = transform_head_point(ec_rest)

    aim_dir = (Vector(gaze_target_world) - ec_world).normalized()
    head_rot = head_pose_matrix().to_3x3()
    head_up = (head_rot @ Vector((0, 0, 1))).normalized()

    y_axis = -aim_dir
    x_axis = y_axis.cross(head_up).normalized()
    z_axis = x_axis.cross(y_axis).normalized()
    rot_mat = Matrix((
        (x_axis.x, y_axis.x, z_axis.x, 0.0),
        (x_axis.y, y_axis.y, z_axis.y, 0.0),
        (x_axis.z, y_axis.z, z_axis.z, 0.0),
        (0.0, 0.0, 0.0, 1.0),
    ))
    eye_xform = Matrix.Translation(ec_world) @ rot_mat

    # --- 1. INNER EYEBALL (Sclera + generously large soulful warm-brown iris matching reference.png!) ---
    n_rings = 48
    n_segs = 64
    bm = bmesh.new()
    # Expressive youthful iris (~7.4mm radius -> fills almond aperture warmly, upper lid kisses top edge!)
    iris_theta_max = 0.545
    verts_grid = []
    for ir in range(n_rings + 1):
        t = ir / n_rings
        if t < 0.45:
            theta = (t / 0.45) * (iris_theta_max * 1.15)
        else:
            theta = iris_theta_max * 1.15 + ((t - 0.45) / 0.55) * (math.pi - iris_theta_max * 1.15)
        ring = []
        for iseg in range(n_segs):
            phi = 2.0 * math.pi * iseg / n_segs
            r = eye_radius
            y_local = -r * math.cos(theta)
            rho = r * math.sin(theta)
            if theta < iris_theta_max:
                edge_y = -r * math.cos(iris_theta_max)
                u_ir = theta / iris_theta_max
                y_local = edge_y + 0.00032 * (1.0 - u_ir * u_ir)
            x_local = rho * math.cos(phi)
            z_local = rho * math.sin(phi)
            v = bm.verts.new((x_local, y_local, z_local))
            ring.append((v, theta, phi))
        verts_grid.append(ring)

    bm.verts.ensure_lookup_table()
    uv_layer = bm.loops.layers.uv.new("UVMap")
    for ir in range(n_rings):
        for iseg in range(n_segs):
            inext = (iseg + 1) % n_segs
            v00, th00, ph00 = verts_grid[ir][iseg]
            v01, th01, ph01 = verts_grid[ir][inext]
            v11, th11, ph11 = verts_grid[ir + 1][inext]
            v10, th10, ph10 = verts_grid[ir + 1][iseg]
            try:
                f = bm.faces.new((v00, v10, v11, v01))
                f.smooth = True
                for loop, (_, th, ph) in zip(f.loops, ((v00, th00, ph00), (v10, th10, ph10), (v11, th11, ph11), (v01, th01, ph01))):
                    rad_uv = min(0.25 * (th / iris_theta_max), 0.495)
                    loop[uv_layer].uv = (0.5 + rad_uv * math.cos(ph), 0.5 + rad_uv * math.sin(ph))
            except ValueError:
                pass

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me_inner = bpy.data.meshes.new(f"Eye_{side_name}_Inner_Mesh")
    bm.to_mesh(me_inner)
    bm.free()
    obj_inner = bpy.data.objects.new(f"Eye_{side_name}_Inner", me_inner)
    obj_inner.matrix_world = eye_xform
    obj_inner.data.materials.append(mat_iris)
    collection.objects.link(obj_inner)

    # --- 2. CORNEA & TEAR FILM OUTER SHELL ---
    bm_c = bmesh.new()
    verts_c = []
    for ir in range(36 + 1):
        theta = math.pi * ir / 36.0
        ring = []
        bulge = 0.00110 * math.exp(-0.5 * (theta / (iris_theta_max * 0.72)) ** 2)
        r_c = eye_radius + 0.00022 + bulge
        for iseg in range(48):
            phi = 2.0 * math.pi * iseg / 48.0
            x_l = r_c * math.sin(theta) * math.cos(phi)
            y_l = -r_c * math.cos(theta)
            z_l = r_c * math.sin(theta) * math.sin(phi)
            ring.append(bm_c.verts.new((x_l, y_l, z_l)))
        verts_c.append(ring)
    for ir in range(36):
        for iseg in range(48):
            inext = (iseg + 1) % 48
            try:
                f = bm_c.faces.new((verts_c[ir][iseg], verts_c[ir + 1][iseg], verts_c[ir + 1][inext], verts_c[ir][inext]))
                f.smooth = True
            except ValueError:
                pass
    bmesh.ops.recalc_face_normals(bm_c, faces=bm_c.faces)
    me_cornea = bpy.data.meshes.new(f"Eye_{side_name}_Cornea_Mesh")
    bm_c.to_mesh(me_cornea)
    bm_c.free()
    obj_cornea = bpy.data.objects.new(f"Eye_{side_name}_Cornea", me_cornea)
    obj_cornea.matrix_world = eye_xform
    obj_cornea.data.materials.append(mat_cornea)
    obj_cornea.visible_shadow = False
    collection.objects.link(obj_cornea)

    # --- 3. LACRIMAL TEAR MENISCUS ---
    bm_m = bmesh.new()
    n_u, n_v = 20, 8
    men_rings = []
    for iu in range(n_u):
        t = iu / (n_u - 1)
        ang_x = math.radians(-26.0 + 52.0 * t) * side
        ang_z = math.radians(-20.0 + 6.5 * (2 * t - 1) ** 2)
        r_m = eye_radius + 0.00036
        cx = r_m * math.sin(ang_x) * math.cos(ang_z)
        cy = -r_m * math.cos(ang_x) * math.cos(ang_z)
        cz = r_m * math.sin(ang_z)
        tube_r = 0.00028 * math.sin(math.pi * (0.12 + 0.76 * t))
        ring = []
        for iv in range(n_v):
            a = 2.0 * math.pi * iv / n_v
            ring.append(bm_m.verts.new((cx, cy + tube_r * math.cos(a), cz + tube_r * math.sin(a))))
        men_rings.append(ring)
    for iu in range(n_u - 1):
        for iv in range(n_v):
            ivn = (iv + 1) % n_v
            f = bm_m.faces.new((men_rings[iu][iv], men_rings[iu + 1][iv], men_rings[iu + 1][ivn], men_rings[iu][ivn]))
            f.smooth = True
    bmesh.ops.recalc_face_normals(bm_m, faces=bm_m.faces)
    me_men = bpy.data.meshes.new(f"Eye_{side_name}_Meniscus_Mesh")
    bm_m.to_mesh(me_men)
    bm_m.free()
    obj_men = bpy.data.objects.new(f"Eye_{side_name}_Meniscus", me_men)
    obj_men.matrix_world = eye_xform
    obj_men.data.materials.append(mat_meniscus)
    obj_men.visible_shadow = False
    collection.objects.link(obj_men)

    # --- 4. CARUNCLE ---
    car_rest = np.array([side * 0.0188, -0.1384, 1.5436], dtype=np.float64)
    car_world = transform_head_point(car_rest)
    bm_car = bmesh.new()
    bmesh.ops.create_uvsphere(bm_car, u_segments=12, v_segments=8, radius=0.0018)
    for v in bm_car.verts:
        v.co.x *= 1.10
        v.co.y *= 0.72
        v.co.z *= 0.80
    for f in bm_car.faces:
        f.smooth = True
    me_car = bpy.data.meshes.new(f"Eye_{side_name}_Caruncle_Mesh")
    bm_car.to_mesh(me_car)
    bm_car.free()
    obj_car = bpy.data.objects.new(f"Eye_{side_name}_Caruncle", me_car)
    obj_car.location = car_world
    obj_car.data.materials.append(mat_caruncle)
    collection.objects.link(obj_car)

    return obj_inner, obj_cornea, obj_men, obj_car


def build_character_head_and_eyes(collection, gaze_target_world, mat_skin, mat_iris, mat_cornea, mat_meniscus, mat_caruncle):
    """Builds sculpted, UV-mapped, posed character head/neck and multi-layer realistic eyes."""
    uvs_b, faces_vti, lash_pts_raw = _load_base_uv_and_eyelashes("input/base.obj")

    bpy.ops.wm.obj_import(filepath="input/upper-body.obj", forward_axis="Y", up_axis="Z")
    body_obj = bpy.context.selected_objects[0]
    body_obj.name = "Character_Body"
    me = body_obj.data
    me.name = "Character_Body_Mesh"

    for col in list(body_obj.users_collection):
        col.objects.unlink(body_obj)
    collection.objects.link(body_obj)

    uv_layer = me.uv_layers.new(name="UVMap")
    for fi, poly in enumerate(me.polygons):
        vti = faces_vti[fi]
        for li, loop_idx in enumerate(poly.loop_indices):
            uv_layer.data[loop_idx].uv = uvs_b[vti[li]]

    raw_pts = np.array([v.co[:] for v in me.vertices], dtype=np.float64)
    sculpted_rest_pts, eye_center_l, eye_radius = _sculpt_rest_face_and_body(raw_pts)
    posed_pts = _apply_smooth_head_pose(sculpted_rest_pts)

    me.vertices.foreach_set("co", posed_pts.astype(np.float32).ravel())
    me.update()

    bm_trim = bmesh.new()
    bm_trim.from_mesh(me)
    bm_trim.verts.ensure_lookup_table()
    bm_trim.faces.ensure_lookup_table()
    rest_x_l = bm_trim.verts.layers.float.new("rest_x")
    rest_y_l = bm_trim.verts.layers.float.new("rest_y")
    rest_z_l = bm_trim.verts.layers.float.new("rest_z")
    for v in bm_trim.verts:
        rc = sculpted_rest_pts[v.index]
        v[rest_x_l] = float(rc[0])
        v[rest_y_l] = float(rc[1])
        v[rest_z_l] = float(rc[2])

    del_faces = []
    for f in bm_trim.faces:
        c_rest = np.mean([[v[rest_x_l], v[rest_y_l], v[rest_z_l]] for v in f.verts], axis=0)
        if c_rest[2] < 1.300 or (c_rest[2] < 1.415 and abs(c_rest[0]) > 0.072):
            del_faces.append(f)
    bmesh.ops.delete(bm_trim, geom=del_faces, context="FACES")
    bm_trim.verts.ensure_lookup_table()
    sculpted_rest_trimmed = np.array([[v[rest_x_l], v[rest_y_l], v[rest_z_l]] for v in bm_trim.verts], dtype=np.float64)
    bm_trim.to_mesh(me)
    bm_trim.free()
    me.update()

    posed_pts_trimmed = np.array([v.co[:] for v in me.vertices], dtype=np.float64)
    sculpted_rest_pts = sculpted_rest_trimmed
    posed_pts = posed_pts_trimmed

    for poly in me.polygons:
        poly.use_smooth = True

    me.materials.append(mat_skin)
    subsurf = body_obj.modifiers.new(name="Subsurf_Skin", type="SUBSURF")
    subsurf.levels = 2
    subsurf.render_levels = 2
    subsurf.uv_smooth = "PRESERVE_BOUNDARIES"

    lash_curves = _extract_eyelash_curves(sculpted_rest_pts, posed_pts, lash_pts_raw)

    eyes_l = _create_realistic_eye("L", eye_center_l, eye_radius, gaze_target_world, mat_iris, mat_cornea, mat_meniscus, mat_caruncle, collection)
    eyes_r = _create_realistic_eye("R", eye_center_l, eye_radius, gaze_target_world, mat_iris, mat_cornea, mat_meniscus, mat_caruncle, collection)

    bm_bvh = bmesh.new()
    bm_bvh.from_mesh(me)
    bm_bvh.verts.ensure_lookup_table()
    bm_bvh.faces.ensure_lookup_table()
    bvh_body = BVHTree.FromBMesh(bm_bvh)
    bm_bvh.free()

    return {
        "body_obj": body_obj,
        "eyes_l": eyes_l,
        "eyes_r": eyes_r,
        "raw_pts": raw_pts,
        "sculpted_rest_pts": sculpted_rest_pts,
        "posed_pts": posed_pts,
        "eye_center_l_rest": eye_center_l,
        "eye_radius": eye_radius,
        "lash_curves": lash_curves,
        "bvh_body": bvh_body,
    }
